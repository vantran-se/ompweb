import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);
const {
  LABEL,
  LEGACY_LABEL,
  buildPlist,
  readPlistEnvironment,
  resolveLauncher,
} = require("./omp-web-launchd.js");

test("launchd uses the fork label and a stable current launcher", () => {
  assert.equal(LABEL, "com.vantran-se.ompweb");
  assert.equal(LEGACY_LABEL, "com.kahme247.ompweb");
  const root = mkdtempSync(path.join(tmpdir(), "ompweb-launchd-release-"));
  try {
    const launcher = path.join(root, "current", "bin", "omp-web.js");
    mkdirSync(path.dirname(launcher), { recursive: true });
    writeFileSync(launcher, "#!/usr/bin/env node\n", { mode: 0o755 });
    assert.equal(resolveLauncher({ OMPWEB_INSTALL_ROOT: root }), launcher);

    const plist = buildPlist({
      launcher,
      nodeBin: "/usr/local/bin/node",
      home: "/Users/test",
      logDir: "/Users/test/Library/Logs/ompweb",
      env: { PORT: "30177", OMP_WEB_PASSWORD: "a<&b" },
    });
    assert.match(plist, /<string>com\.vantran-se\.ompweb<\/string>/);
    assert.match(plist, /<string>\/usr\/local\/bin\/node<\/string>\s*<string>.*\/current\/bin\/omp-web\.js<\/string>/);
    assert.doesNotMatch(plist, /npx|npm/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("legacy plist environment survives identity migration", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "ompweb-launchd-legacy-"));
  try {
    const plistPath = path.join(dir, "legacy.plist");
    writeFileSync(plistPath, buildPlist({
      launcher: "/old/bin/omp-web.js",
      nodeBin: "/usr/bin/node",
      home: "/Users/test",
      logDir: "/tmp",
      label: LEGACY_LABEL,
      env: {
        PORT: "40123",
        OMP_WEB_HOSTNAME: "0.0.0.0",
        OMP_WEB_PASSWORD: "secret<&value",
        PI_CODING_AGENT_DIR: "/custom/agent",
      },
    }));
    assert.deepEqual(readPlistEnvironment(plistPath), {
      PORT: "40123",
      OMP_WEB_HOSTNAME: "0.0.0.0",
      OMP_WEB_PASSWORD: "secret<&value",
      PI_CODING_AGENT_DIR: "/custom/agent",
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
