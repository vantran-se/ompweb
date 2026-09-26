const RELEASES_API_URL = "https://api.github.com/repos/vantran-se/ompweb/releases/tags/";
const FETCH_TIMEOUT_MS = 5_000;
const MAX_RESPONSE_BYTES = 256 * 1024;
export const MAX_BODY_BYTES = 64 * 1024;
const SAFE_HOSTS: Record<string, true> = { "api.github.com": true, "github.com": true };

export interface GitHubReleaseNotes {
  version: string;
  body: string;
  htmlUrl: string;
}

/** Only allow github.com release URLs so the dialog never links off-site. */
export function isSafeReleaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname.toLowerCase() === "github.com" && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}

async function readBoundedJson(response: Response): Promise<Record<string, unknown> | null> {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) return null;
  if (!response.body) return null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_RESPONSE_BYTES) return null;
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
  try {
    const parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

async function fetchRelease(url: string): Promise<Record<string, unknown> | null> {
  let next = url;
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const parsed = new URL(next);
    if (parsed.protocol !== "https:" || SAFE_HOSTS[parsed.hostname.toLowerCase()] !== true || parsed.username || parsed.password) return null;
    let response: Response;
    try {
      response = await fetch(next, {
        cache: "no-store",
        redirect: "manual",
        headers: { Accept: "application/vnd.github+json", "User-Agent": "vantran-se/ompweb", "X-GitHub-Api-Version": "2022-11-28" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch {
      return null;
    }
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) return null;
      next = new URL(location, next).toString();
      continue;
    }
    if (!response.ok) return null;
    return readBoundedJson(response);
  }
  return null;
}

export async function getGitHubReleaseNotes(version: string): Promise<GitHubReleaseNotes | null> {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) return null;
  const tag = `v${version}`;
  const release = await fetchRelease(`${RELEASES_API_URL}${encodeURIComponent(tag)}`);
  if (!release || release.tag_name !== tag || release.draft !== false || release.prerelease !== false) return null;
  if (typeof release.body !== "string" || release.body.length === 0) return null;
  if (release.body.length > MAX_BODY_BYTES || Buffer.byteLength(release.body, "utf8") > MAX_BODY_BYTES) return null;
  if (typeof release.html_url !== "string" || !isSafeReleaseUrl(release.html_url)) return null;
  return { version, body: release.body, htmlUrl: release.html_url };
}
