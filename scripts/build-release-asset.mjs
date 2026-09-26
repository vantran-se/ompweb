#!/usr/bin/env node
import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { chmod, lstat, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";
import { fileURLToPath } from "node:url";

const REQUIRED = [".next", "bin", "lib", "public", "scripts", "next.config.ts", "package.json", "package-lock.json", "LICENSE", "README.md"];
const EXCLUDED = new Set([".next/cache", ".next/dev", ".next/diagnostics", ".next/trace", ".next/trace-build", ".next/types", "scripts/build-release-asset.test.mjs", "scripts/install-release.test.mjs"]);

function octal(value, width) { return `${value.toString(8).padStart(width - 1, "0")}\0`; }
function writeField(header, offset, length, value) { Buffer.from(value).copy(header, offset, 0, length); }
function headerFor(name, size, mode, type) {
  const header = Buffer.alloc(512);
  let pathName = name;
  let prefix = "";
  if (Buffer.byteLength(pathName) > 100) {
    const split = pathName.lastIndexOf("/", 155);
    if (split < 1 || Buffer.byteLength(pathName.slice(split + 1)) > 100 || Buffer.byteLength(pathName.slice(0, split)) > 155) throw new Error(`Archive path too long: ${name}`);
    prefix = pathName.slice(0, split); pathName = pathName.slice(split + 1);
  }
  writeField(header, 0, 100, pathName);
  writeField(header, 100, 8, octal(mode, 8));
  writeField(header, 108, 8, octal(0, 8));
  writeField(header, 116, 8, octal(0, 8));
  writeField(header, 124, 12, octal(size, 12));
  writeField(header, 136, 12, octal(0, 12));
  header.fill(32, 148, 156);
  header[156] = type.charCodeAt(0);
  writeField(header, 257, 8, "ustar\0\x30\x30");
  writeField(header, 345, 155, prefix);
  let checksum = 0; for (const byte of header) checksum += byte;
  writeField(header, 148, 8, `${checksum.toString(8).padStart(6, "0")}\0 `);
  return header;
}

async function entriesUnder(projectRoot, relativePath, result) {
  const normalized = relativePath.split(sep).join("/");
  if (EXCLUDED.has(normalized)) return;
  const absolute = join(projectRoot, relativePath);
  const info = await lstat(absolute);
  if (info.isSymbolicLink()) throw new Error(`Release input may not contain symlinks: ${relativePath}`);
  if (info.isDirectory()) {
    result.push({ path: relativePath, directory: true, mode: 0o755 });
    const children = await readdir(absolute);
    children.sort((a, b) => Buffer.from(a).compare(Buffer.from(b)));
    for (const child of children) await entriesUnder(projectRoot, join(relativePath, child), result);
  } else if (info.isFile()) {
    result.push({ path: relativePath, directory: false, mode: info.mode & 0o111 ? 0o755 : 0o644, size: info.size });
  } else throw new Error(`Unsupported release input: ${relativePath}`);
}

export async function buildReleaseAsset({ projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), ".."), outputDir = join(projectRoot, "dist"), version } = {}) {
  const pkg = JSON.parse(await readFile(join(projectRoot, "package.json"), "utf8"));
  version ||= pkg.version;
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) throw new Error(`Invalid release version: ${version}`);
  const rootName = `ompweb-v${version}`;
  const entries = [];
  for (const item of REQUIRED) {
    try { await stat(join(projectRoot, item)); } catch { throw new Error(`Required release input is missing: ${item}`); }
    await entriesUnder(projectRoot, item, entries);
  }
  entries.sort((a, b) => Buffer.from(a.path).compare(Buffer.from(b.path)));
  await mkdir(outputDir, { recursive: true });
  const assetName = `${rootName}.tar.gz`;
  const assetPath = join(outputDir, assetName);
  const gzip = createGzip({ level: 9, mtime: 0 });
  const output = createWriteStream(assetPath, { mode: 0o644 });
  const writing = pipeline(gzip, output);
  gzip.write(headerFor(`${rootName}/`, 0, 0o755, "5"));
  for (const entry of entries) {
    const archivePath = `${rootName}/${entry.path.split(sep).join("/")}${entry.directory ? "/" : ""}`;
    gzip.write(headerFor(archivePath, entry.directory ? 0 : entry.size, entry.mode, entry.directory ? "5" : "0"));
    if (!entry.directory) {
      const data = await readFile(join(projectRoot, entry.path));
      gzip.write(data);
      const padding = (512 - data.length % 512) % 512;
      if (padding) gzip.write(Buffer.alloc(padding));
    }
  }
  gzip.end(Buffer.alloc(1024));
  await writing;
  const digest = createHash("sha256").update(await readFile(assetPath)).digest("hex");
  const checksumsPath = join(outputDir, "SHA256SUMS");
  await writeFile(checksumsPath, `${digest}  ${assetName}\n`, { mode: 0o644 });
  return { assetPath, checksumsPath, digest, assetName };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) buildReleaseAsset({ version: process.argv[2] }).then(({ assetPath }) => console.log(assetPath)).catch((error) => { console.error(error.message); process.exitCode = 1; });
