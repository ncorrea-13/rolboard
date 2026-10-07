const LATEST_RELEASE =
  "https://api.github.com/repos/ncorrea-13/rolboard/releases/latest";
const CACHE_KEY = "updateCheck";
const DAY = 24 * 60 * 60 * 1000;

export interface Release {
  tag: string;
  url: string;
}

function parts(version: string) {
  return version
    .replace(/^v/, "")
    .split("-")[0]
    .split(".")
    .map((n) => Number(n) || 0);
}

function isNewer(tag: string, current: string) {
  const a = parts(tag);
  const b = parts(current);
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
  }
  return false;
}

function readCache(): Release | null | undefined {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null");
    if (cached && Date.now() - cached.at < DAY) return cached.release;
  } catch {
    return undefined;
  }
  return undefined;
}

function writeCache(release: Release | null) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ at: Date.now(), release }),
    );
    return true;
  } catch {
    return false;
  }
}

export async function newerRelease(): Promise<Release | null> {
  const current = import.meta.env.VITE_APP_VERSION as string | undefined;
  if (!current) return null;
  let release = readCache();
  if (release === undefined) {
    const res = await fetch(LATEST_RELEASE).catch(() => null);
    if (!res?.ok) return null;
    const data = await res.json().catch(() => ({}));
    release =
      typeof data.tag_name === "string" &&
      typeof data.html_url === "string" &&
      data.html_url.startsWith("https://github.com/")
        ? { tag: data.tag_name, url: data.html_url }
        : null;
    writeCache(release);
  }
  return release && isNewer(release.tag, current) ? release : null;
}
