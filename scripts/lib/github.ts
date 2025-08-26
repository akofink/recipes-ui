import {
  authHeaders,
  BRANCH,
  COMMITS_BASE,
  COMPARE_BASE,
  CONTENTS_BASE,
  RAW_BASE,
  MAX_WAIT_MS,
} from "./config";
import type { GhCommit, GhCompare, GhContentItem } from "./types";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function robustFetch(
  url: string,
  init: RequestInit = {},
  attempt = 1,
): Promise<Response> {
  const res = await fetch(url, {
    headers: {
      ...authHeaders(),
      "User-Agent": "recipes-ui-build-script",
      ...(init.headers || {}),
    },
    ...init,
  });
  if (res.status === 403 || res.status === 429) {
    const retryAfter = Number.parseInt(
      res.headers.get("retry-after") || "0",
      10,
    );
    const remaining = res.headers.get("x-ratelimit-remaining");
    const reset = Number.parseInt(
      res.headers.get("x-ratelimit-reset") || "0",
      10,
    );
    const now = Date.now();
    const resetMs = reset ? Math.max(0, reset * 1000 - now) : 0;
    const waitMs = Math.max(retryAfter ? retryAfter * 1000 : 0, resetMs, 1000);
    if (
      (retryAfter || remaining === "0" || reset) &&
      Number.isFinite(MAX_WAIT_MS) &&
      waitMs > MAX_WAIT_MS
    ) {
      throw new Error(
        `Rate limited. Need to wait ~${Math.ceil(waitMs / 1000)}s; exceeds cap ${Math.ceil(MAX_WAIT_MS / 1000)}s.`,
      );
    }
    if (retryAfter || remaining === "0" || reset) {
      if (process.env.CI) {
        throw new Error(
          `Rate limited in CI (HTTP ${res.status}). Set GITHUB_TOKEN or increase GENERATE_MAX_WAIT_MS.`,
        );
      }
      console.warn(
        `[generate-static-data] Rate limited (HTTP ${res.status}). Waiting ~${Math.ceil(waitMs / 1000)}s before retry...`,
      );
      await sleep(waitMs);
      return robustFetch(url, init, attempt + 1);
    }
  }
  if (!res.ok && res.status >= 500 && attempt < 3) {
    const backoff = attempt * 1000;
    console.warn(
      `[generate-static-data] Server error ${res.status}. Retrying in ${backoff}ms...`,
    );
    await sleep(backoff);
    return robustFetch(url, init, attempt + 1);
  }
  return res;
}

export async function fetchJson<T>(url: string): Promise<T | null> {
  const res = await robustFetch(url);
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to fetch ${url}: ${res.status} ${res.statusText} - ${text}`,
    );
  }
  return res.json() as Promise<T>;
}

export async function fetchText(url: string): Promise<string> {
  const res = await robustFetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to fetch ${url}: ${res.status} ${res.statusText} - ${text}`,
    );
  }
  return res.text();
}

export async function latestCommitShaForPath(
  p: string,
): Promise<string | null> {
  const url = `${COMMITS_BASE}?sha=${encodeURIComponent(BRANCH)}&path=${encodeURIComponent(p)}&per_page=1`;
  const items: GhCommit[] | null = await fetchJson<GhCommit[]>(url);
  if (!Array.isArray(items) || items.length === 0) return null;
  return items[0]?.sha || null;
}

export async function branchHeadSha(): Promise<string | null> {
  const url = `${COMMITS_BASE}/${encodeURIComponent(BRANCH)}`;
  const item: GhCommit | null = await fetchJson<GhCommit>(url);
  return item?.sha || null;
}

export async function compareCommits(
  base: string,
  head: string,
): Promise<GhCompare | null> {
  const url = `${COMPARE_BASE}/${encodeURIComponent(base)}...${encodeURIComponent(head)}`;
  return fetchJson<GhCompare>(url);
}

export async function listRecipes(): Promise<
  Array<{ filename: string; name: string }>
> {
  const url = `${CONTENTS_BASE}/recipes`;
  const items: GhContentItem[] | null = await fetchJson<GhContentItem[]>(url);
  if (!Array.isArray(items)) return [];
  return items
    .filter(
      (it) => it && typeof it.name === "string" && it.name.endsWith(".md"),
    )
    .map((it) => ({
      filename: it.name as string,
      name: (it.name as string).replace(/\.md$/, ""),
    }));
}

export async function listImagesFor(name: string): Promise<string[]> {
  const url = `${CONTENTS_BASE}/images/${encodeURIComponent(name)}`;
  const items: GhContentItem[] | null = await fetchJson<GhContentItem[]>(url);
  if (items === null) return [];
  if (!Array.isArray(items)) {
    throw new Error(
      `Unexpected response listing images for ${name}: ${JSON.stringify(items)}`,
    );
  }
  return items
    .filter((it) => it && typeof it.name === "string")
    .map((it) => it.name as string)
    .sort();
}

export async function fetchMarkdown(filename: string): Promise<string> {
  const url = `${RAW_BASE}/recipes/${encodeURIComponent(filename)}`;
  return fetchText(url);
}
