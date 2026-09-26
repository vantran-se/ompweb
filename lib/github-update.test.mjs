import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const {
  fetchLatestGitHubRelease,
  isNewerVersion,
  isSafeGitHubDownloadUrl,
  parseChecksumFile,
  parseStableSemver,
} = jiti("./github-update.ts");
const { isSafeReleaseUrl } = jiti("./github-release-notes.ts");

function response(body, init = {}) {
  return new Response(body, { status: 200, ...init });
}

function release(version = "1.2.3") {
  return {
    tag_name: `v${version}`,
    draft: false,
    prerelease: false,
    assets: [
      { name: `ompweb-v${version}.tar.gz`, browser_download_url: `https://github.com/vantran-se/ompweb/releases/download/v${version}/ompweb-v${version}.tar.gz`, size: 123 },
      { name: "SHA256SUMS", browser_download_url: `https://github.com/vantran-se/ompweb/releases/download/v${version}/SHA256SUMS`, size: 100 },
    ],
  };
}

test("strict stable semver comparison rejects ambiguous tags and prereleases", () => {
  assert.equal(parseStableSemver("v1.2.3"), "1.2.3");
  for (const invalid of ["1.2", "v01.2.3", "v1.2.3-beta.1", "1.2.3+build", "latest"]) {
    assert.equal(parseStableSemver(invalid), null);
  }
  assert.equal(isNewerVersion("2.0.0", "1.99.99"), true);
  assert.equal(isNewerVersion("1.2.3", "1.2.3"), false);
  assert.equal(isNewerVersion("1.2.2", "1.2.3"), false);
});

test("release downloads reject credentials, HTTP, and non-GitHub hosts", () => {
  assert.equal(isSafeGitHubDownloadUrl("https://objects.githubusercontent.com/object"), true);
  assert.equal(isSafeGitHubDownloadUrl("https://github.com.evil.example/payload"), false);
  assert.equal(isSafeGitHubDownloadUrl("http://github.com/payload"), false);
  assert.equal(isSafeGitHubDownloadUrl("https://user:pass@github.com/payload"), false);
});

test("release notes links stay on HTTPS GitHub", () => {
  assert.equal(isSafeReleaseUrl("https://github.com/vantran-se/ompweb/releases/tag/v1.2.3"), true);
  assert.equal(isSafeReleaseUrl("http://github.com/vantran-se/ompweb/releases/tag/v1.2.3"), false);
  assert.equal(isSafeReleaseUrl("https://github.com.evil.example/release"), false);
  assert.equal(isSafeReleaseUrl("https://user@github.com/release"), false);
});

test("latest release requires exact assets and pins the archive checksum", async () => {
  const digest = "a".repeat(64);
  const calls = [];
  const descriptor = await fetchLatestGitHubRelease(async (url) => {
    calls.push(url);
    if (url.endsWith("/releases/latest")) return response(JSON.stringify(release()));
    return response(`${digest}  ompweb-v1.2.3.tar.gz\n`);
  });
  assert.equal(descriptor.version, "1.2.3");
  assert.equal(descriptor.archiveSha256, digest);
  assert.equal(descriptor.archive.url, release().assets[0].browser_download_url);
  assert.equal(calls.length, 2);
});

test("missing assets, checksum mismatches, and malicious redirects fail closed", async () => {
  const missing = release();
  missing.assets.pop();
  await assert.rejects(() => fetchLatestGitHubRelease(async () => response(JSON.stringify(missing))), /assets/);

  let request = 0;
  await assert.rejects(() => fetchLatestGitHubRelease(async () => {
    request += 1;
    return request === 1 ? response(JSON.stringify(release())) : response(`${"b".repeat(64)}  another.tar.gz\n`);
  }), /checksum/);

  await assert.rejects(() => fetchLatestGitHubRelease(async () => response(null, {
    status: 302,
    headers: { location: "https://evil.example/release.json" },
  })), /Unsafe GitHub URL/);
});

test("checksum parser rejects duplicate entries for the pinned archive", () => {
  const digest = "c".repeat(64);
  assert.equal(parseChecksumFile(`${digest}  archive.tar.gz\n${digest}  archive.tar.gz\n`, "archive.tar.gz"), null);
});
