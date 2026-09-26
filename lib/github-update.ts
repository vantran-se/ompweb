import packageJson from "../package.json";
import { isUpdateDisabled } from "./update-policy";

const RELEASE_API_URL = "https://api.github.com/repos/vantran-se/ompweb/releases/latest";
const INSTALL_URL = "https://github.com/vantran-se/ompweb/releases/latest/download/install.sh";
const CHECK_TTL_MS = 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8_000;
const MAX_RELEASE_BYTES = 256 * 1024;
const MAX_CHECKSUM_BYTES = 64 * 1024;
const SAFE_DOWNLOAD_HOSTS: Record<string, true> = {
  "github.com": true,
  "api.github.com": true,
  "objects.githubusercontent.com": true,
  "githubusercontent.com": true,
};

export interface GitHubReleaseAsset {
  name: string;
  url: string;
  size: number;
}

export interface GitHubReleaseDescriptor {
  version: string;
  tag: string;
  archive: GitHubReleaseAsset;
  archiveSha256: string;
  checksums: GitHubReleaseAsset;
}

export interface GitHubUpdateStatus {
  currentVersion: string;
  availableVersion: string | null;
  latestVersion: string | null;
  updateAvailable: boolean;
  updateCommand: string;
  command: string;
  manager: "github";
  updatesDisabled?: boolean;
  release?: GitHubReleaseDescriptor;
}

type FetchLike = typeof fetch;
let cached: { checkedAt: number; status: GitHubUpdateStatus } | null = null;

export function parseStableSemver(value: string): string | null {
  const match = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(value);
  return match ? `${match[1]}.${match[2]}.${match[3]}` : null;
}

export function isNewerVersion(availableVersion: string, currentVersion: string): boolean {
  const available = parseStableSemver(availableVersion);
  const current = parseStableSemver(currentVersion);
  if (!available || !current) return false;
  const availableParts = available.split(".").map(Number);
  const currentParts = current.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (availableParts[index] !== currentParts[index]) return availableParts[index] > currentParts[index];
  }
  return false;
}

export function isSafeGitHubDownloadUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && SAFE_DOWNLOAD_HOSTS[url.hostname.toLowerCase()] === true && !url.username && !url.password;
  } catch {
    return false;
  }
}

async function boundedText(response: Response, maximum: number): Promise<string> {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maximum) throw new Error("Response is too large");
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maximum) throw new Error("Response is too large");
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

async function safeFetch(url: string, maximum: number, fetcher: FetchLike): Promise<string> {
  let next = url;
  for (let redirects = 0; redirects <= 5; redirects += 1) {
    if (!isSafeGitHubDownloadUrl(next)) throw new Error("Unsafe GitHub URL");
    const response = await fetcher(next, {
      cache: "no-store",
      redirect: "manual",
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "vantran-se/ompweb",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Malformed redirect");
      next = new URL(location, next).toString();
      continue;
    }
    if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
    return boundedText(response, maximum);
  }
  throw new Error("Too many redirects");
}

function releaseAsset(value: unknown): GitHubReleaseAsset | null {
  if (!value || typeof value !== "object") return null;
  const asset = value as Record<string, unknown>;
  if (typeof asset.name !== "string" || typeof asset.browser_download_url !== "string") return null;
  if (!Number.isSafeInteger(asset.size) || (asset.size as number) < 0) return null;
  if (!isSafeGitHubDownloadUrl(asset.browser_download_url)) return null;
  return { name: asset.name, url: asset.browser_download_url, size: asset.size as number };
}

export function parseChecksumFile(text: string, archiveName: string): string | null {
  let digest: string | null = null;
  for (const line of text.split(/\r?\n/)) {
    const match = /^([a-fA-F0-9]{64})[ \t]+(?:\*)?([^\r\n]+)$/.exec(line);
    if (!match || match[2] !== archiveName) continue;
    if (digest) return null;
    digest = match[1].toLowerCase();
  }
  return digest;
}

export async function fetchLatestGitHubRelease(fetcher: FetchLike = fetch): Promise<GitHubReleaseDescriptor> {
  const raw = await safeFetch(RELEASE_API_URL, MAX_RELEASE_BYTES, fetcher);
  const value = JSON.parse(raw) as unknown;
  if (!value || typeof value !== "object") throw new Error("Malformed GitHub release");
  const release = value as Record<string, unknown>;
  if (release.draft !== false || release.prerelease !== false || typeof release.tag_name !== "string") {
    throw new Error("Release is not stable");
  }
  const version = parseStableSemver(release.tag_name);
  if (!version || release.tag_name !== `v${version}` || !Array.isArray(release.assets)) {
    throw new Error("Malformed release tag or assets");
  }
  const archiveName = `ompweb-v${version}.tar.gz`;
  const parsedAssets = release.assets.map(releaseAsset);
  if (parsedAssets.some((asset) => asset === null)) throw new Error("Malformed release asset");
  const assets = parsedAssets as GitHubReleaseAsset[];
  const archives = assets.filter((asset) => asset.name === archiveName);
  const sums = assets.filter((asset) => asset.name === "SHA256SUMS");
  if (archives.length !== 1 || sums.length !== 1) throw new Error("Required release assets are missing or duplicated");
  const checksumText = await safeFetch(sums[0].url, MAX_CHECKSUM_BYTES, fetcher);
  const archiveSha256 = parseChecksumFile(checksumText, archiveName);
  if (!archiveSha256) throw new Error("Archive checksum is missing or malformed");
  return { version, tag: release.tag_name, archive: archives[0], archiveSha256, checksums: sums[0] };
}

export async function checkGitHubUpdate(force = false, fetcher: FetchLike = fetch): Promise<GitHubUpdateStatus> {
  const currentVersion = packageJson.version;
  const command = `curl -fsSL ${INSTALL_URL} | sh`;
  const base = { currentVersion, updateCommand: command, command, manager: "github" as const };
  if (isUpdateDisabled()) {
    return { ...base, availableVersion: null, latestVersion: null, updateAvailable: false, updatesDisabled: true };
  }
  if (!force && fetcher === fetch && cached && Date.now() - cached.checkedAt < CHECK_TTL_MS) return cached.status;
  try {
    const release = await fetchLatestGitHubRelease(fetcher);
    const status: GitHubUpdateStatus = {
      ...base,
      availableVersion: release.version,
      latestVersion: release.version,
      updateAvailable: isNewerVersion(release.version, currentVersion),
      release,
    };
    if (fetcher === fetch) cached = { checkedAt: Date.now(), status };
    return status;
  } catch {
    const status: GitHubUpdateStatus = { ...base, availableVersion: null, latestVersion: null, updateAvailable: false };
    if (fetcher === fetch) cached = { checkedAt: Date.now(), status };
    return status;
  }
}
