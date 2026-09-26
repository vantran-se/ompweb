import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import { createServer } from "node:http";
import { chmod, lstat, mkdir, mkdtemp, readFile, readlink, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { buildReleaseAsset } from "./build-release-asset.mjs";
import { inspectTarGz, installRelease, parseChecksums, rollback, uninstall } from "./install-release.mjs";

async function fixtureProject(base, version, marker) {
  const root = join(base, `project-${version}`);
  for (const dir of [".next", "bin", "lib", "public", "scripts"]) await mkdir(join(root, dir), { recursive: true });
  await writeFile(join(root, ".next", "BUILD_ID"), marker);
  await writeFile(join(root, "bin", "omp-web.js"), "#!/usr/bin/env node\n");
  await chmod(join(root, "bin", "omp-web.js"), 0o755);
  for (const file of ["lib/runtime.js", "public/index.txt", "scripts/install-release.mjs", "next.config.ts", "package-lock.json", "LICENSE", "README.md"]) await writeFile(join(root, file), file === "package-lock.json" ? "{}" : marker);
  await writeFile(join(root, "package.json"), JSON.stringify({ name: "@vantran-se/ompweb", version }));
  return root;
}

async function serverFor(files) {
  const server = createServer(async (request, response) => {
    const name = request.url.slice(1);
    if (!files.has(name)) { response.writeHead(404).end(); return; }
    const body = files.get(name);
    response.setHeader("content-length", body.length);
    response.end(body);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}

function successfulSpawn() {
  const child = new EventEmitter();
  queueMicrotask(() => child.emit("exit", 0, null));
  return child;
}

test("checksum parser rejects traversal-like names and malformed records", () => {
  assert.throws(() => parseChecksums(`${"a".repeat(64)}  ../asset\n`), /Malformed/);
  assert.throws(() => parseChecksums(`${"a".repeat(64)} *asset\n`), /Malformed/);
});

test("archive validator rejects traversal and symlink entries", async () => {
  const base = await mkdtemp(join(tmpdir(), "ompweb-tar-security-"));
  try {
    const root = await fixtureProject(base, "1.2.3", "safe");
    const dist = join(base, "dist");
    const built = await buildReleaseAsset({ projectRoot: root, outputDir: dist, version: "1.2.3" });
    const valid = await readFile(built.assetPath);
    assert.ok(inspectTarGz(valid, "ompweb-v1.2.3").entries.length > 5);
    const corrupted = Buffer.from(valid);
    corrupted[20] ^= 1;
    assert.throws(() => inspectTarGz(corrupted, "ompweb-v1.2.3"), /Invalid|Unsafe|checksum|gzip/i);
  } finally { await rm(base, { recursive: true, force: true }); }
});

test("artifact builder rejects symlinks", async () => {
  const base = await mkdtemp(join(tmpdir(), "ompweb-build-symlink-"));
  try {
    const root = await fixtureProject(base, "1.2.3", "safe");
    await symlink("BUILD_ID", join(root, ".next", "linked"));
    await assert.rejects(() => buildReleaseAsset({ projectRoot: root, outputDir: join(base, "dist") }), /symlinks/);
  } finally { await rm(base, { recursive: true, force: true }); }
});

test("local release install verifies, activates atomically, reruns, rolls back, and uninstalls", async () => {
  const base = await mkdtemp(join(tmpdir(), "ompweb-install-test-"));
  let server, serverBase;
  try {
    const files = new Map();
    for (const [version, marker] of [["1.2.3", "first"], ["1.2.4", "second"]]) {
      const project = await fixtureProject(base, version, marker);
      const output = join(base, `dist-${version}`);
      const built = await buildReleaseAsset({ projectRoot: project, outputDir: output, version });
      const asset = await readFile(built.assetPath);
      files.set(`v${version}/${built.assetName}`, asset);
      files.set(`v${version}/SHA256SUMS`, Buffer.from(`${createHash("sha256").update(asset).digest("hex")}  ${built.assetName}\n`));
    }
    ({ server, base: serverBase } = await serverFor(files));
    const installRoot = join(base, "installed");
    const binDir = join(base, "bin");
    for (const version of ["1.2.3", "1.2.4", "1.2.4"]) await installRelease({ version, assetBaseUrl: `${serverBase}/v${version}`, installRoot, binDir, allowInsecureLocalhost: true, spawnImpl: successfulSpawn });
    assert.equal(await readFile(join(installRoot, "current", ".next", "BUILD_ID"), "utf8"), "second");
    assert.equal((await readlink(join(installRoot, "current"))).replaceAll("\\", "/"), "releases/v1.2.4");
    await rollback({ installRoot });
    assert.equal(await readFile(join(installRoot, "current", ".next", "BUILD_ID"), "utf8"), "first");
    await uninstall({ installRoot, binDir });
    await assert.rejects(() => lstat(installRoot), { code: "ENOENT" });
  } finally { if (server) await new Promise((resolve) => server.close(resolve)); await rm(base, { recursive: true, force: true }); }
});
