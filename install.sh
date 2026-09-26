#!/bin/sh
set -eu

# Bootstrap trust boundary: this script itself is trusted because the user chose the
# HTTPS github.com release endpoint. It never executes the downloaded Node installer
# until that asset matches SHA256SUMS fetched independently from the same release.
BASE_URL=${OMPWEB_RELEASE_BASE_URL:-https://github.com/vantran-se/ompweb/releases/latest/download}
case "$BASE_URL" in
  https://github.com/vantran-se/ompweb/releases/*/download|https://github.com/vantran-se/ompweb/releases/*/download/) ;;
  http://127.0.0.1:*|http://localhost:*) [ "${OMPWEB_ALLOW_INSECURE_LOCALHOST:-}" = 1 ] || { echo "Refusing untrusted release URL" >&2; exit 1; } ;;
  *) echo "Refusing untrusted release URL" >&2; exit 1 ;;
esac
command -v node >/dev/null 2>&1 || { echo "Node.js 22.19 or newer is required" >&2; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "curl is required" >&2; exit 1; }
TMP=${TMPDIR:-/tmp}/ompweb-install.$$
umask 077
mkdir "$TMP" || exit 1
trap 'rm -rf "$TMP"' EXIT HUP INT TERM
curl -fL --proto '=https' --tlsv1.2 --max-redirs 5 --connect-timeout 15 --max-time 60 --max-filesize 1048576 "$BASE_URL/SHA256SUMS" -o "$TMP/SHA256SUMS"
curl -fL --proto '=https' --tlsv1.2 --max-redirs 5 --connect-timeout 15 --max-time 60 --max-filesize 1048576 "$BASE_URL/install-release.mjs" -o "$TMP/install-release.mjs"
MATCH_COUNT=$(grep -Ec '^[0-9a-fA-F]{64}  install-release\.mjs$' "$TMP/SHA256SUMS" || true)
[ "$MATCH_COUNT" -eq 1 ] || { echo "Missing or duplicate installer checksum" >&2; exit 1; }
EXPECTED=$(sed -n 's/^\([0-9a-fA-F]\{64\}\)  install-release\.mjs$/\1/p' "$TMP/SHA256SUMS")
if command -v sha256sum >/dev/null 2>&1; then ACTUAL=$(sha256sum "$TMP/install-release.mjs" | cut -d ' ' -f 1)
elif command -v shasum >/dev/null 2>&1; then ACTUAL=$(shasum -a 256 "$TMP/install-release.mjs" | cut -d ' ' -f 1)
else echo "sha256sum or shasum is required" >&2; exit 1
fi
[ "$ACTUAL" = "$EXPECTED" ] || { echo "Installer checksum mismatch" >&2; exit 1; }
exec node "$TMP/install-release.mjs" "$@"
