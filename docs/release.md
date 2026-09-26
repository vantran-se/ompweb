# Release Checklist

ompweb is distributed only through [GitHub Releases](https://github.com/vantran-se/ompweb/releases). npm is not a release channel; `@vantran-se/ompweb` is metadata identity only.

Each `vX.Y.Z` release publishes:

- `ompweb-vX.Y.Z.tar.gz`
- `SHA256SUMS`
- `install.sh`
- `install.ps1`
- `install-release.mjs`

## Prepare

1. Update `package.json` and `CHANGELOG.md` to the same stable semantic version.
2. Use Node.js 26.9.0 and npm 12.1.0.
3. Verify from a clean checkout:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm audit --omit=dev --audit-level=high
```

4. Smoke-test the generated artifact and installer in isolated `HOME`, `XDG_DATA_HOME`, and `XDG_BIN_HOME` directories. Confirm install, repeated install, rollback, and uninstall.
5. Confirm no test controls the developer's live user service. Tests calling `runWorker()` must use its isolated library defaults or inject a fake service.

## Publish

Push the reviewed commit, then create and push the matching tag:

```bash
git tag -s vX.Y.Z -m "ompweb vX.Y.Z"
git push origin main
git push origin vX.Y.Z
```

`.github/workflows/publish.yml` verifies the tag/version match, installs dependencies, runs typecheck/lint/tests, builds the production app, creates checksummed assets, and publishes the GitHub Release. It does not publish to npm and requires no package-registry secret.

## Verify

```bash
gh run list --repo vantran-se/ompweb --workflow publish.yml --limit 1
gh release view vX.Y.Z --repo vantran-se/ompweb
curl -fsSL https://github.com/vantran-se/ompweb/releases/download/vX.Y.Z/SHA256SUMS
```

Check that every listed asset exists and matches `SHA256SUMS`. Then install into an isolated location using the public entrypoint:

```bash
curl -fsSL https://github.com/vantran-se/ompweb/releases/latest/download/install.sh | sh
```

Verify the installed version, web health endpoint, service restart, rollback, and preservation of `~/.omp/agent/web-service.env` and sessions.

If verification fails, delete the broken GitHub Release and tag, fix the source, increment the version, and publish a new tag. Never replace an existing release asset in place; prepared in-app updates pin the asset URL and SHA-256 digest.
