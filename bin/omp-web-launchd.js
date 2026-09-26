#!/usr/bin/env node
"use strict";

// Install ompweb as a macOS launchd user agent (starts at login, restarts on crash).
// Usage: ompweb-launchd [install|uninstall|status]

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { spawnSync } = require("node:child_process");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("node:fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const os = require("node:os");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("node:path");

const LABEL = "com.vantran-se.ompweb";
const LEGACY_LABEL = "com.kahme247.ompweb";
const HOME = os.homedir();
const PLIST_DIR = path.join(HOME, "Library", "LaunchAgents");
const PLIST = path.join(PLIST_DIR, `${LABEL}.plist`);
const LEGACY_PLIST = path.join(PLIST_DIR, `${LEGACY_LABEL}.plist`);
const LOG_DIR = path.join(HOME, "Library", "Logs", "ompweb");
const DOMAIN = `gui/${process.getuid?.() ?? 0}`;

function fail(message) {
  throw new Error(message);
}

function isExecutableFile(candidate) {
  try {
    fs.accessSync(candidate, fs.constants.X_OK);
    return fs.statSync(candidate).isFile();
  } catch {
    return false;
  }
}

function which(name, env = process.env) {
  for (const dir of (env.PATH ?? "").split(path.delimiter)) {
    if (dir && isExecutableFile(path.join(dir, name))) return path.join(dir, name);
  }
  return null;
}

function xmlEscape(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function xmlUnescape(value) {
  return value.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

function readPlistEnvironment(plistPath) {
  try {
    const source = fs.readFileSync(plistPath, "utf8");
    const match = /<key>EnvironmentVariables<\/key>\s*<dict>([\s\S]*?)<\/dict>/.exec(source);
    if (!match) return {};
    const env = {};
    const entries = /<key>([\s\S]*?)<\/key>\s*<string>([\s\S]*?)<\/string>/g;
    for (const entry of match[1].matchAll(entries)) env[xmlUnescape(entry[1])] = xmlUnescape(entry[2]);
    return env;
  } catch {
    return {};
  }
}

function resolveLauncher(env = process.env) {
  if (env.OMP_WEB_LAUNCHD_BIN) {
    if (!fs.existsSync(env.OMP_WEB_LAUNCHD_BIN)) fail(`OMP_WEB_LAUNCHD_BIN=${env.OMP_WEB_LAUNCHD_BIN} does not exist`);
    return env.OMP_WEB_LAUNCHD_BIN;
  }
  if (env.OMPWEB_INSTALL_ROOT) {
    const launcher = path.join(env.OMPWEB_INSTALL_ROOT, "current", "bin", "omp-web.js");
    if (!fs.existsSync(launcher)) fail(`release launcher not found: ${launcher}`);
    return launcher;
  }
  const sourceLauncher = path.join(__dirname, "omp-web.js");
  if (fs.existsSync(sourceLauncher)) return sourceLauncher;
  fail("ompweb launcher not found; set OMP_WEB_LAUNCHD_BIN");
}

function buildPlist({ launcher, nodeBin = process.execPath, env, home = HOME, label = LABEL, logDir = LOG_DIR }) {
  const envXml = Object.entries(env)
    .map(([key, value]) => `    <key>${xmlEscape(key)}</key><string>${xmlEscape(value)}</string>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${label}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${xmlEscape(nodeBin)}</string>
    <string>${xmlEscape(launcher)}</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
${envXml}
  </dict>
  <key>WorkingDirectory</key><string>${xmlEscape(home)}</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>${xmlEscape(path.join(logDir, "ompweb.log"))}</string>
  <key>StandardErrorPath</key><string>${xmlEscape(path.join(logDir, "ompweb.err.log"))}</string>
</dict>
</plist>
`;
}

function launchctl(args, { ignoreFailure = false } = {}) {
  const result = spawnSync("launchctl", args, { encoding: "utf8" });
  if (result.error) {
    if (ignoreFailure) return { ok: false, stdout: "", stderr: result.error.message };
    fail(`launchctl not runnable: ${result.error.message}`);
  }
  if (result.status !== 0 && !ignoreFailure) fail(`launchctl ${args.join(" ")} failed: ${(result.stderr ?? "").trim()}`);
  return { ok: result.status === 0, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

function install() {
  const launcher = resolveLauncher();
  const ompBin = process.env.OMP_WEB_OMP_BIN ?? which("omp");
  if (process.env.OMP_WEB_OMP_BIN && !isExecutableFile(process.env.OMP_WEB_OMP_BIN)) {
    fail(`OMP_WEB_OMP_BIN=${process.env.OMP_WEB_OMP_BIN} is not executable`);
  } else if (!ompBin) {
    console.warn("warning: omp binary not found; live-agent features will be unavailable (set OMP_WEB_OMP_BIN)");
  }

  // The currently installed plist is the durable service configuration. Read
  // both identities so label migration cannot lose a password or custom path.
  const savedEnv = { ...readPlistEnvironment(LEGACY_PLIST), ...readPlistEnvironment(PLIST) };
  const port = process.env.PORT ?? savedEnv.PORT ?? "30177";
  const hostname = process.env.OMP_WEB_HOSTNAME ?? savedEnv.OMP_WEB_HOSTNAME ?? "127.0.0.1";
  const agentDir = (process.env.PI_CODING_AGENT_DIR ?? savedEnv.PI_CODING_AGENT_DIR)?.replace(/^~(?=\/|$)/, HOME);
  const svcPath = [
    ...(ompBin ? [path.dirname(ompBin)] : []),
    path.dirname(process.execPath),
    path.dirname(launcher),
    "/usr/local/bin", "/usr/bin", "/bin", "/usr/sbin", "/sbin",
  ].filter((dir, index, all) => all.indexOf(dir) === index).join(path.delimiter);
  const env = {
    ...savedEnv,
    PATH: svcPath,
    PORT: port,
    OMP_WEB_HOSTNAME: hostname,
    OMP_WEB_NO_OPEN: process.env.OMP_WEB_NO_OPEN ?? savedEnv.OMP_WEB_NO_OPEN ?? "1",
    ...(process.env.OMP_WEB_DISABLE_AUTOUPDATE ? { OMP_WEB_DISABLE_AUTOUPDATE: process.env.OMP_WEB_DISABLE_AUTOUPDATE } : {}),
    ...(process.env.OMP_WEB_PASSWORD ? { OMP_WEB_PASSWORD: process.env.OMP_WEB_PASSWORD } : {}),
    ...(ompBin ? { OMP_WEB_OMP_BIN: ompBin } : {}),
    ...(agentDir ? { PI_CODING_AGENT_DIR: agentDir } : {}),
    ...(process.env.OMPWEB_INSTALL_ROOT ? { OMPWEB_INSTALL_ROOT: process.env.OMPWEB_INSTALL_ROOT } : {}),
  };

  fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.mkdirSync(PLIST_DIR, { recursive: true });
  fs.writeFileSync(PLIST, buildPlist({ launcher, env }), { mode: 0o600 });
  fs.chmodSync(PLIST, 0o600);

  launchctl(["bootout", `${DOMAIN}/${LABEL}`], { ignoreFailure: true });
  launchctl(["bootout", `${DOMAIN}/${LEGACY_LABEL}`], { ignoreFailure: true });
  launchctl(["bootstrap", DOMAIN, PLIST]);
  // Remove the legacy definition only after the replacement is loaded.
  fs.rmSync(LEGACY_PLIST, { force: true });

  console.log(`installed: ${PLIST}`);
  console.log(`launcher:  ${launcher}`);
  console.log(`url:       http://${hostname}:${port}`);
  console.log(`logs:      ${path.join(LOG_DIR, "ompweb.log")}`);
  if (env.OMP_WEB_PASSWORD) console.log("note:      password is stored in plain text in the plist (mode 600)");
}

function uninstall() {
  for (const label of [LABEL, LEGACY_LABEL]) launchctl(["bootout", `${DOMAIN}/${label}`], { ignoreFailure: true });
  fs.rmSync(PLIST, { force: true });
  fs.rmSync(LEGACY_PLIST, { force: true });
  console.log(`uninstalled: ${LABEL}`);
}

function status() {
  for (const label of [LABEL, LEGACY_LABEL]) {
    const result = launchctl(["print", `${DOMAIN}/${label}`], { ignoreFailure: true });
    if (result.ok) {
      const lines = result.stdout.split("\n").filter((line) => /\b(state|pid|last exit)\b/.test(line));
      console.log(lines.join("\n") || result.stdout.trim());
      return { label };
    }
  }
  console.log(`not loaded: ${LABEL}`);
  return null;
}

function runCli(argv = process.argv.slice(2)) {
  if (process.platform !== "darwin") fail("launchd services are macOS-only");
  const command = argv[0] ?? "install";
  if (command === "install") install();
  else if (command === "uninstall") uninstall();
  else if (command === "status") {
    if (!status()) return { exitCode: 1 };
  } else return { exitCode: 2 };
  return { exitCode: 0 };
}

if (require.main === module) {
  try {
    const { exitCode } = runCli();
    if (exitCode) process.exit(exitCode);
  } catch (error) {
    console.error(`error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

module.exports = {
  LABEL,
  LEGACY_LABEL,
  buildPlist,
  readPlistEnvironment,
  resolveLauncher,
  runCli,
  xmlEscape,
};
