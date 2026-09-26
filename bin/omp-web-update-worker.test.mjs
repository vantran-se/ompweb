import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const { parseServiceEnvironment, runWorker, validatePinnedRelease } = require("./omp-web-update-worker.js");

function descriptor(overrides = {}) {
  return {
    installerPath: "/private/attempt/install-release.mjs",
    installRoot: "/home/user/.local/share/ompweb",
    release: {
      version: "1.2.3",
      tag: "v1.2.3",
      archive: {
        name: "ompweb-v1.2.3.tar.gz",
        url: "https://github.com/vantran-se/ompweb/releases/download/v1.2.3/ompweb-v1.2.3.tar.gz",
      },
      archiveSha256: "a".repeat(64),
    },
    ...overrides,
  };
}

test("prepared descriptor pins version, asset URL, and digest", () => {
  const release = validatePinnedRelease(descriptor(), "1.2.3");
  assert.equal(release.version, "1.2.3");
  assert.equal(release.archiveSha256, "a".repeat(64));
  assert.throws(() => validatePinnedRelease(descriptor(), "1.2.4"), /does not match/);
  assert.throws(() => validatePinnedRelease(descriptor({
    release: { ...descriptor().release, archiveSha256: "b" },
  }), "1.2.3"), /digest/);
  assert.throws(() => validatePinnedRelease(descriptor({
    release: {
      ...descriptor().release,
      archive: { ...descriptor().release.archive, url: "https://evil.example/ompweb.tar.gz" },
    },
  }), "1.2.3"), /unsafe/);
});

test("worker rejects a changed prepared asset before installation", () => {
  const changed = descriptor({
    release: {
      ...descriptor().release,
      archive: {
        ...descriptor().release.archive,
        name: "ompweb-v1.2.4.tar.gz",
      },
    },
  });
  assert.throws(() => validatePinnedRelease(changed, "1.2.3"), /archive/);
});

test("failed installation rolls back, restarts, and records terminal status", async () => {
  const root = mkdtempSync(join(tmpdir(), "ompweb-worker-test-"));
  const installRoot = join(root, "install");
  const currentBin = join(installRoot, "current", "bin");
  mkdirSync(currentBin, { recursive: true });
  const rollbackLog = join(root, "rollback.log");
  const installer = join(root, "installer.mjs");
  writeFileSync(installer, `
import { appendFileSync } from "node:fs";
if (process.argv.includes("--rollback")) appendFileSync(${JSON.stringify(rollbackLog)}, "rollback\\n");
else process.exitCode = 1;
`);
  const port = 39000 + Math.floor(Math.random() * 1000);
  const launcher = join(currentBin, "omp-web.js");
  writeFileSync(launcher, `
const http = require("node:http");
const server = http.createServer((_request, response) => { response.statusCode = 200; response.end("ok"); });
server.listen(${port}, "127.0.0.1");
setTimeout(() => server.close(), 1500);
`);
  writeFileSync(join(root, "status.json"), JSON.stringify({ attemptId: "attempt", state: "prepared" }));
  const pinned = descriptor({ installRoot, installerPath: installer, launcherPath: launcher, hostname: "127.0.0.1", port });
  try {
    await assert.rejects(() => runWorker({ root, target: "1.2.3", kind: "app", descriptor: pinned, launcherPid: 0, serverPid: 0 }), /failed/);
    assert.equal(readFileSync(rollbackLog, "utf8"), "rollback\n");
    const status = JSON.parse(readFileSync(join(root, "status.json"), "utf8"));
    assert.equal(status.state, "failed");
    assert.equal(status.cleanupReady, true);
    assert.match(status.error, /failed/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("service environment parser preserves persisted update runtime values", () => {
  assert.deepEqual(parseServiceEnvironment(new URL("./missing-service-env", import.meta.url)), {});
});
