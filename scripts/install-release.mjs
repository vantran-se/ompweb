#!/usr/bin/env node
import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { chmod, mkdir, mkdtemp, open, readFile, readdir, realpath, rename, rm, stat, symlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable, Transform } from "node:stream";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const REPOSITORY = "vantran-se/ompweb";
const MAX_API_BYTES = 2 * 1024 * 1024;
const MAX_CHECKSUM_BYTES = 1024 * 1024;
const MAX_ASSET_BYTES = 1024 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 30_000;
const ALLOWED_HOSTS = new Set([
  "github.com",
  "api.github.com",
  "objects.githubusercontent.com",
  "githubusercontent.com",
]);

export function normalizeVersion(value) {
  const version = String(value).replace(/^v/, "");
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) throw new Error(`Invalid release version: ${value}`);
  return version;
}

export function parseChecksums(text) {
  const result = new Map();
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const match = /^([a-fA-F0-9]{64})  ([^/\\\s][^/\\]*)$/.exec(line);
    if (!match) throw new Error("Malformed SHA256SUMS");
    if (result.has(match[2])) throw new Error(`Duplicate checksum entry: ${match[2]}`);
    result.set(match[2], match[1].toLowerCase());
  }
  if (!result.size) throw new Error("SHA256SUMS is empty");
  return result;
}

function safeArchivePath(name, expectedRoot) {
  if (!name || name.includes("\0") || name.includes("\\") || name.startsWith("/") || /^[A-Za-z]:/.test(name)) return false;
  const parts = name.replace(/\/$/, "").split("/");
  return parts[0] === expectedRoot && parts.every((part) => part && part !== "." && part !== "..");
}

function tarString(block, start, length) {
  return block.subarray(start, start + length).toString("utf8").replace(/\0.*$/, "");
}
function tarNumber(block, start, length) {
  const value = tarString(block, start, length).trim();
  if (!/^[0-7]*$/.test(value)) throw new Error("Invalid tar numeric field");
  return value ? Number.parseInt(value, 8) : 0;
}

export function inspectTarGz(buffer, expectedRoot) {
  let tar;
  try { tar = gunzipSync(buffer, { maxOutputLength: MAX_ASSET_BYTES }); } catch { throw new Error("Invalid or oversized gzip archive"); }
  const entries = [];
  let offset = 0;
  let pendingPax = null;
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const stored = tarNumber(header, 148, 8);
    let sum = 0;
    for (let i = 0; i < 512; i++) sum += i >= 148 && i < 156 ? 32 : header[i];
    if (stored !== sum) throw new Error("Invalid tar header checksum");
    let name = tarString(header, 0, 100);
    const prefix = tarString(header, 345, 155);
    if (prefix) name = `${prefix}/${name}`;
    const size = tarNumber(header, 124, 12);
    const type = String.fromCharCode(header[156] || 48);
    const dataStart = offset + 512;
    const next = dataStart + Math.ceil(size / 512) * 512;
    if (next > tar.length) throw new Error("Truncated tar archive");
    if (type === "x") {
      const pax = tar.subarray(dataStart, dataStart + size).toString("utf8");
      pendingPax = {};
      let at = 0;
      while (at < pax.length) {
        const space = pax.indexOf(" ", at);
        if (space < 0) throw new Error("Malformed pax header");
        const length = Number(pax.slice(at, space));
        const record = pax.slice(space + 1, at + length - 1);
        if (!Number.isSafeInteger(length) || length <= 0 || at + length > pax.length) throw new Error("Malformed pax header");
        const equals = record.indexOf("=");
        if (equals > 0) pendingPax[record.slice(0, equals)] = record.slice(equals + 1);
        at += length;
      }
    } else {
      if (pendingPax?.path) name = pendingPax.path;
      pendingPax = null;
      if (!safeArchivePath(name, expectedRoot)) throw new Error(`Unsafe archive path: ${name}`);
      if (type !== "0" && type !== "\0" && type !== "5") throw new Error(`Unsupported archive entry type for ${name}`);
      entries.push({ name: name.replace(/\/$/, ""), size, type, dataStart, mode: tarNumber(header, 100, 8) });
    }
    offset = next;
  }
  if (!entries.length || !entries.some((entry) => entry.name === expectedRoot && entry.type === "5")) throw new Error("Archive root directory is missing");
  return { tar, entries };
}

export async function extractTarGz(archivePath, destination, expectedRoot) {
  const compressed = await readFile(archivePath);
  if (compressed.length > MAX_ASSET_BYTES) throw new Error("Archive exceeds size limit");
  const { tar, entries } = inspectTarGz(compressed, expectedRoot);
  await mkdir(destination, { recursive: true, mode: 0o700 });
  for (const entry of entries) {
    const output = join(destination, ...entry.name.split("/"));
    const rel = relative(destination, output);
    if (rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error(`Unsafe archive path: ${entry.name}`);
    if (entry.type === "5") await mkdir(output, { recursive: true, mode: entry.mode & 0o777 });
    else {
      await mkdir(dirname(output), { recursive: true, mode: 0o700 });
      const handle = await open(output, "wx", entry.mode & 0o777);
      try { await handle.writeFile(tar.subarray(entry.dataStart, entry.dataStart + entry.size)); } finally { await handle.close(); }
    }
  }
  return join(destination, expectedRoot);
}

function assertAllowedUrl(value, allowInsecureLocalhost = false) {
  const url = new URL(value);
  const local = allowInsecureLocalhost && url.protocol === "http:" && (url.hostname === "127.0.0.1" || url.hostname === "localhost");
  if (!local && (url.protocol !== "https:" || !ALLOWED_HOSTS.has(url.hostname))) throw new Error(`Refusing untrusted download URL: ${url.origin}`);
  return url;
}

async function fetchBounded(url, { maxBytes, fetchImpl = fetch, allowInsecureLocalhost = false, outputPath } = {}) {
  let current = assertAllowedUrl(url, allowInsecureLocalhost);
  for (let redirects = 0; redirects <= 5; redirects++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const response = await fetchImpl(current, { redirect: "manual", signal: controller.signal, headers: { "User-Agent": "ompweb-installer", Accept: "application/vnd.github+json" } });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      clearTimeout(timer);
      if (redirects === 5) throw new Error("Too many download redirects");
      const location = response.headers.get("location");
      if (!location) throw new Error("Redirect missing Location header");
      current = assertAllowedUrl(new URL(location, current), allowInsecureLocalhost);
      continue;
    }
    if (!response.ok || !response.body) { clearTimeout(timer); throw new Error(`Download failed (${response.status}) for ${current}`); }
    const declared = Number(response.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > maxBytes) { clearTimeout(timer); throw new Error("Download exceeds size limit"); }
    let received = 0;
    const limiter = new Transform({ transform(chunk, _encoding, callback) { received += chunk.length; callback(received > maxBytes ? new Error("Download exceeds size limit") : null, chunk); } });
    if (outputPath) {
      try { await pipeline(Readable.fromWeb(response.body), limiter, createWriteStream(outputPath, { flags: "wx", mode: 0o600 })); } finally { clearTimeout(timer); }
      return outputPath;
    }
    const chunks = [];
    limiter.on("data", (chunk) => chunks.push(chunk));
    try { await pipeline(Readable.fromWeb(response.body), limiter); } finally { clearTimeout(timer); }
    return Buffer.concat(chunks).toString("utf8");
  }
  throw new Error("Download failed");
}
async function run(command, args, cwd, spawnImpl = spawn) {
  await new Promise((resolvePromise, reject) => {
    const child = spawnImpl(command, args, { cwd, stdio: "inherit", shell: false });
    child.once("error", reject);
    child.once("exit", (code, signal) => code === 0 ? resolvePromise() : reject(new Error(`${command} failed (${signal ?? code})`)));
  });
}

async function replaceCurrent(installRoot, targetName) {
  const current = join(installRoot, "current");
  const temporary = join(installRoot, `.current-${process.pid}-${Date.now()}`);
  const target = join("releases", targetName);
  await rm(temporary, { recursive: true, force: true });
  await symlink(target, temporary, process.platform === "win32" ? "junction" : "dir");
  if (process.platform !== "win32") {
    await rename(temporary, current);
    return;
  }
  const backup = join(installRoot, `.current-backup-${process.pid}`);
  await rm(backup, { recursive: true, force: true });
  try { await rename(current, backup); } catch (error) { if (error.code !== "ENOENT") throw error; }
  try { await rename(temporary, current); await rm(backup, { recursive: true, force: true }); }
  catch (error) { try { await rename(backup, current); } catch {} throw error; }
}

async function writeWrappers(installRoot, binDir) {
  await mkdir(binDir, { recursive: true, mode: 0o755 });
  const shell = `#!/bin/sh\nexport OMPWEB_INSTALL_ROOT=${JSON.stringify(installRoot)}\nexec node ${JSON.stringify(join(installRoot, "current", "bin", "omp-web.js"))} "$@"\n`;
  const shPath = join(binDir, "ompweb");
  await writeFile(shPath, shell, { mode: 0o755 });
  await chmod(shPath, 0o755);
  const cmd = `@echo off\r\nset "OMPWEB_INSTALL_ROOT=${installRoot}"\r\nnode "${join(installRoot, "current", "bin", "omp-web.js")}" %*\r\n`;
  await writeFile(join(binDir, "ompweb.cmd"), cmd);
}

export async function rollback({ installRoot = defaultInstallRoot() } = {}) {
  const releases = join(installRoot, "releases");
  const currentPath = join(installRoot, "current");
  let active;
  try { active = basename(await realpath(currentPath)); } catch { throw new Error("No active ompweb release"); }
  const candidates = await Promise.all((await readdir(releases, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && /^v\d+\.\d+\.\d+/.test(entry.name) && entry.name !== active)
    .map(async (entry) => ({ name: entry.name, modified: (await stat(join(releases, entry.name))).mtimeMs })));
  candidates.sort((a, b) => b.modified - a.modified);
  if (!candidates.length) throw new Error("No previous release available for rollback");
  await replaceCurrent(installRoot, candidates[0].name);
  return candidates[0].name.slice(1);
}

export function defaultInstallRoot(env = process.env) {
  return env.OMPWEB_INSTALL_ROOT || join(env.XDG_DATA_HOME || join(env.HOME || env.USERPROFILE || homedir(), ".local", "share"), "ompweb");
}
export function defaultBinDir(env = process.env) {
  return env.XDG_BIN_HOME || join(env.HOME || env.USERPROFILE || homedir(), ".local", "bin");
}

export async function uninstall({ installRoot = defaultInstallRoot(), binDir = defaultBinDir() } = {}) {
  await rm(resolve(installRoot), { recursive: true, force: true });
  await rm(join(resolve(binDir), "ompweb"), { force: true });
  await rm(join(resolve(binDir), "ompweb.cmd"), { force: true });
}

export async function installRelease(options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const allowInsecureLocalhost = options.allowInsecureLocalhost ?? false;
  let version = options.version;
  let assetBaseUrl = options.assetBaseUrl;
  if (!version) {
    const api = options.apiUrl || `https://api.github.com/repos/${REPOSITORY}/releases/latest`;
    const metadata = JSON.parse(await fetchBounded(api, { maxBytes: MAX_API_BYTES, fetchImpl, allowInsecureLocalhost }));
    version = normalizeVersion(metadata.tag_name);
    if (!assetBaseUrl) assetBaseUrl = `https://github.com/${REPOSITORY}/releases/download/v${version}`;
  } else version = normalizeVersion(version);
  assetBaseUrl ||= `https://github.com/${REPOSITORY}/releases/download/v${version}`;
  const directAssetUrl = options.assetUrl;
  const checksumAssetUrl = options.checksumUrl || (directAssetUrl ? new URL("SHA256SUMS", directAssetUrl).href : `${assetBaseUrl}/SHA256SUMS`);
  const assetName = `ompweb-v${version}.tar.gz`;
  const installRoot = resolve(options.installRoot || defaultInstallRoot());
  const binDir = resolve(options.binDir || defaultBinDir());
  const releaseDir = join(installRoot, "releases", `v${version}`);
  await mkdir(join(installRoot, "releases"), { recursive: true, mode: 0o700 });
  const work = await mkdtemp(join(installRoot, ".install-"));
  try {
    const checksumsText = await fetchBounded(checksumAssetUrl, { maxBytes: MAX_CHECKSUM_BYTES, fetchImpl, allowInsecureLocalhost });
    const listed = parseChecksums(checksumsText).get(assetName);
    const expected = options.expectedSha256 ? String(options.expectedSha256).toLowerCase() : listed;
    if (options.expectedSha256 && !/^[a-f0-9]{64}$/.test(expected)) throw new Error("Invalid expected SHA-256");
    if (!expected) throw new Error(`SHA256SUMS has no entry for ${assetName}`);
    if (listed && listed !== expected) throw new Error(`Provided checksum disagrees with SHA256SUMS for ${assetName}`);
    const archive = join(work, assetName);
    await fetchBounded(directAssetUrl || `${assetBaseUrl}/${assetName}`, { maxBytes: MAX_ASSET_BYTES, fetchImpl, allowInsecureLocalhost, outputPath: archive });
    const actual = createHash("sha256").update(await readFile(archive)).digest("hex");
    if (actual !== expected) throw new Error(`Checksum mismatch for ${assetName}`);
    const extracted = await extractTarGz(archive, work, `ompweb-v${version}`);
    await run(options.npmCommand || (process.platform === "win32" ? "npm.cmd" : "npm"), ["ci", "--omit=dev"], extracted, options.spawnImpl);
    const staged = join(installRoot, `.release-v${version}-${process.pid}`);
    await rm(staged, { recursive: true, force: true });
    await rename(extracted, staged);
    try { await rename(staged, releaseDir); } catch (error) {
      if (error.code !== "EEXIST" && error.code !== "ENOTEMPTY") throw error;
      await rm(staged, { recursive: true, force: true });
    }
    await replaceCurrent(installRoot, `v${version}`);
    await writeWrappers(installRoot, binDir);
    return { version, releaseDir, executable: join(binDir, process.platform === "win32" ? "ompweb.cmd" : "ompweb") };
  } finally { await rm(work, { recursive: true, force: true }); }
}

async function main() {
  const args = process.argv.slice(2);
  const valueAfter = (name) => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; };
  if (args.includes("--rollback")) {
    const version = await rollback({ installRoot: valueAfter("--install-root") });
    console.log(`Rolled back ompweb to v${version}`);
    return;
  }
  if (args.includes("--uninstall")) {
    await uninstall({ installRoot: valueAfter("--install-root"), binDir: valueAfter("--bin-dir") });
    console.log("Uninstalled ompweb (configuration in ~/.omp/agent was preserved)");
    return;
  }
  const result = await installRelease({ version: valueAfter("--version"), assetUrl: valueAfter("--asset-url"), checksumUrl: valueAfter("--checksum-url"), expectedSha256: valueAfter("--sha256"), installRoot: valueAfter("--install-root"), binDir: valueAfter("--bin-dir") });
  console.log(`Installed ompweb v${result.version}. Run ${result.executable}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => { console.error(`ompweb installer: ${error.message}`); process.exitCode = 1; });
