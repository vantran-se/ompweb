#!/usr/bin/env node
"use strict";
// Dependency-free CommonJS: copied outside the active release before replacement.
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");
const os = require("node:os");
const http = require("node:http");

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function atomicWrite(file, value) {
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(value), { encoding: "utf8", mode: 0o600, flag: "wx" });
  fs.renameSync(temporary, file);
}

function parseServiceEnvironment(file) {
  const environment = {};
  let contents;
  try {
    contents = fs.readFileSync(file, "utf8");
  } catch {
    return environment;
  }
  for (const line of contents.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const match = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line);
    if (!match) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    environment[match[1]] = value;
  }
  return environment;
}

function run(command, args, options = {}) {
  const result = cp.spawnSync(command, args, {
    encoding: "utf8",
    windowsHide: true,
    timeout: options.timeout ?? 120_000,
    env: options.env ?? process.env,
  });
  if (result.error || result.status !== 0) {
    const detail = String(result.stderr || result.stdout || result.error?.message || "command failed").trim().slice(0, 500);
    throw new Error(`${command} failed: ${detail}`);
  }
}

function processAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function stopPids(pids) {
  for (const pid of pids) {
    if (!processAlive(pid)) continue;
    try { process.kill(pid, "SIGTERM"); } catch {}
  }
  for (let count = 0; count < 50 && pids.some(processAlive); count += 1) await sleep(100);
  for (const pid of pids) {
    if (!processAlive(pid)) continue;
    try { process.kill(pid, "SIGKILL"); } catch {}
  }
}

function detectService(home) {
  const systemd = path.join(process.env.XDG_CONFIG_HOME || path.join(home, ".config"), "systemd", "user", "ompweb.service");
  const launchAgents = path.join(home, "Library", "LaunchAgents");
  const primaryLabel = "com.vantran-se.ompweb";
  const legacyLabel = "com.kahme247.ompweb";
  if (process.platform === "linux" && fs.existsSync(systemd)) return { type: "systemd" };
  for (const label of [primaryLabel, legacyLabel]) {
    const file = path.join(launchAgents, `${label}.plist`);
    if (process.platform === "darwin" && fs.existsSync(file)) return { type: "launchd", file, label };
  }
  return { type: "plain" };
}

function controlService(service, action) {
  if (service.type === "systemd") {
    run("systemctl", ["--user", action, "ompweb.service"], { timeout: 30_000 });
  } else if (service.type === "launchd") {
    const uid = typeof process.getuid === "function" ? process.getuid() : 501;
    if (action === "stop") run("launchctl", ["bootout", `gui/${uid}/${service.label}`], { timeout: 30_000 });
    else run("launchctl", ["bootstrap", `gui/${uid}`, service.file], { timeout: 30_000 });
  }
}

function startPlain(launcherPath, environment) {
  const child = cp.spawn(process.execPath, [launcherPath], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
    env: environment,
  });
  child.unref();
}

async function healthCheck(hostname, port, timeout = 90_000) {
  const safeHostname = hostname === "0.0.0.0" || hostname === "::" ? "127.0.0.1" : hostname;
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const healthy = await new Promise((resolve) => {
      const request = http.get({ hostname: safeHostname, port, path: "/api/app-update", timeout: 2_000 }, (response) => {
        response.resume();
        resolve(response.statusCode >= 200 && response.statusCode < 500);
      });
      request.on("timeout", () => request.destroy());
      request.on("error", () => resolve(false));
    });
    if (healthy) return;
    await sleep(500);
  }
  throw new Error("Updated service did not become healthy");
}

function validatePinnedRelease(descriptor, target) {
  const release = descriptor?.release;
  if (!release || release.version !== target || release.tag !== `v${target}`) throw new Error("Prepared release version does not match target");
  if (!release.archive || typeof release.archive.url !== "string" || release.archive.name !== `ompweb-v${target}.tar.gz`) {
    throw new Error("Prepared release archive is invalid");
  }
  if (!/^[a-f0-9]{64}$/.test(release.archiveSha256 || "")) throw new Error("Prepared release digest is invalid");
  let assetUrl;
  try { assetUrl = new URL(release.archive.url); } catch { throw new Error("Prepared release URL is unsafe"); }
  const allowedHosts = { "github.com": true, "api.github.com": true, "objects.githubusercontent.com": true, "githubusercontent.com": true };
  if (assetUrl.protocol !== "https:" || allowedHosts[assetUrl.hostname.toLowerCase()] !== true || assetUrl.username || assetUrl.password) {
    throw new Error("Prepared release URL is unsafe");
  }
  if (!descriptor.installerPath || !descriptor.installRoot) throw new Error("Release installer metadata is incomplete");
  return release;
}

async function runWorker(options) {
  const statusFile = path.join(options.root, "status.json");
  const updateStatus = (patch) => atomicWrite(statusFile, { ...(readJson(statusFile) || {}), ...patch });
  // Library callers (including tests) are isolated by default. Only the CLI
  // entrypoint below opts into inspecting and controlling the user's service.
  const home = options.home || options.root;
  const serviceEnvironmentFile = path.join(home, ".omp", "agent", "web-service.env");
  const persistedEnvironment = parseServiceEnvironment(serviceEnvironmentFile);
  const environment = { ...process.env, ...persistedEnvironment, OMPWEB_INSTALL_ROOT: options.descriptor?.installRoot || process.env.OMPWEB_INSTALL_ROOT };
  const hostname = persistedEnvironment.OMP_WEB_HOSTNAME || options.descriptor?.hostname || "127.0.0.1";
  const port = Number(persistedEnvironment.PORT || persistedEnvironment.OMP_WEB_PORT || options.descriptor?.port || 30178);
  const service = options.service || { type: "plain" };
  const launcherPath = options.kind === "app"
    ? path.join(options.descriptor.installRoot, "current", "bin", "omp-web.js")
    : options.descriptor.launcherPath;
  let stopped = false;

  try {
    updateStatus({ state: "running", stage: "stopping", workerPid: process.pid });
    if (service.type === "plain") await stopPids([options.launcherPid, options.serverPid]);
    else controlService(service, "stop");
    stopped = true;

    updateStatus({ stage: "installing" });
    if (options.kind === "omp") {
      run(process.env.OMP_WEB_OMP_BIN || "omp", ["update"], { timeout: 5 * 60_000, env: environment });
    } else {
      const release = validatePinnedRelease(options.descriptor, options.target);
      run(process.execPath, [
        options.descriptor.installerPath,
        "--version", release.version,
        "--asset-url", release.archive.url,
        "--sha256", release.archiveSha256,
        "--install-root", options.descriptor.installRoot,
      ], { timeout: 15 * 60_000, env: environment });
    }

    updateStatus({ stage: "restarting" });
    if (service.type === "plain") startPlain(launcherPath, environment);
    else controlService(service, "start");
    await healthCheck(hostname, port);
    updateStatus({ state: "succeeded", stage: "finalizing", finishedAt: new Date().toISOString(), cleanupReady: true });
  } catch (error) {
    let message = error instanceof Error ? error.message : String(error);
    if (options.kind === "app" && stopped) {
      try {
        run(process.execPath, [options.descriptor.installerPath, "--rollback", "--install-root", options.descriptor.installRoot], {
          timeout: 5 * 60_000,
          env: environment,
        });
        if (service.type === "plain") startPlain(launcherPath, environment);
        else controlService(service, "start");
        await healthCheck(hostname, port, 30_000);
      } catch (rollbackError) {
        message += `; rollback failed: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`;
      }
    }
    updateStatus({ state: "failed", error: message.slice(0, 800), finishedAt: new Date().toISOString(), cleanupReady: true });
    throw error;
  }
}

if (require.main === module) {
  let descriptor;
  try {
    descriptor = JSON.parse(argument("--descriptor") || "null");
  } catch {
    descriptor = null;
  }
  const home = os.homedir();
  const options = {
    attemptId: argument("--attempt"),
    root: argument("--root"),
    packageDir: argument("--package-dir"),
    target: argument("--target"),
    launcherPid: Number(argument("--launcher-pid")),
    serverPid: Number(argument("--server-pid")),
    kind: argument("--kind") || "app",
    descriptor,
    home,
    service: detectService(home),
  };
  runWorker(options).catch(() => { process.exitCode = 1; });
}

module.exports = { healthCheck, parseServiceEnvironment, runWorker, validatePinnedRelease };
