#!/usr/bin/env node
/*
  Generate static recipe data at build time by fetching from the recipes-md repo.
  - Produces src/generated/recipes.json with entries: { name, filename, imageName, markdown }
  - Writes src/generated/meta.json with source commit SHAs used to generate the data
  - Skips generation if current local meta matches latest upstream SHAs (recipes/ and images/ paths)
*/
const fs = require('fs');
const path = require('path');

const GH_API = 'https://api.github.com';
const OWNER = 'akofink';
const REPO = 'recipes-md';
const BRANCH = 'main';
const RAW_BASE = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}`;
const CONTENTS_BASE = `${GH_API}/repos/${OWNER}/${REPO}/contents`;
const COMMITS_BASE = `${GH_API}/repos/${OWNER}/${REPO}/commits`;
const COMPARE_BASE = `${GH_API}/repos/${OWNER}/${REPO}/compare`;

const OUT_DIR = path.resolve(__dirname, '..', 'src', 'generated');
const OUT_FILE = path.join(OUT_DIR, 'recipes.json');
const META_FILE = path.join(OUT_DIR, 'meta.json');
const SCHEMA_VERSION = 2;

function authHeaders() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || process.env.RECIPES_GITHUB_TOKEN;
  return token ? { Authorization: `token ${token}` } : {};
}

const MAX_WAIT_MS = Number.parseInt(process.env.GENERATE_MAX_WAIT_MS || '120000', 10);

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function robustFetch(url, init = {}, attempt = 1) {
  const res = await fetch(url, { headers: { ...authHeaders(), 'User-Agent': 'recipes-ui-build-script', ...(init.headers || {}) }, ...init });
  if ((res.status === 403 || res.status === 429)) {
    const retryAfter = Number.parseInt(res.headers.get('retry-after') || '0', 10);
    const remaining = res.headers.get('x-ratelimit-remaining');
    const reset = Number.parseInt(res.headers.get('x-ratelimit-reset') || '0', 10); // epoch seconds
    const now = Date.now();
    const resetMs = reset ? Math.max(0, reset * 1000 - now) : 0;
    const waitMs = Math.max(retryAfter ? retryAfter * 1000 : 0, resetMs, 1000);
    if ((retryAfter || remaining === '0' || reset) && Number.isFinite(MAX_WAIT_MS) && waitMs > MAX_WAIT_MS) {
      const msg = `Rate limited. Need to wait ~${Math.ceil(waitMs / 1000)}s; exceeds cap ${Math.ceil(MAX_WAIT_MS / 1000)}s. Set GITHUB_TOKEN or increase GENERATE_MAX_WAIT_MS.`;
      throw new Error(msg);
    }
    if (retryAfter || remaining === '0' || reset) {
      console.warn(`[generate-static-data] Rate limited (HTTP ${res.status}). Waiting ~${Math.ceil(waitMs / 1000)}s before retry...`);
      await sleep(waitMs);
      return robustFetch(url, init, attempt + 1);
    }
  }
  if (!res.ok && res.status >= 500 && attempt < 3) {
    const backoff = attempt * 1000;
    console.warn(`[generate-static-data] Server error ${res.status}. Retrying in ${backoff}ms...`);
    await sleep(backoff);
    return robustFetch(url, init, attempt + 1);
  }
  return res;
}

async function fetchJson(url) {
  const res = await robustFetch(url);
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText} - ${text}`);
  }
  return res.json();
}

async function fetchText(url) {
  const res = await robustFetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText} - ${text}`);
  }
  return res.text();
}

async function latestCommitShaForPath(p) {
  const url = `${COMMITS_BASE}?sha=${encodeURIComponent(BRANCH)}&path=${encodeURIComponent(p)}&per_page=1`;
  const items = await fetchJson(url);
  if (!Array.isArray(items) || items.length === 0) return null;
  return items[0]?.sha || null;
}

async function branchHeadSha() {
  const url = `${COMMITS_BASE}/${encodeURIComponent(BRANCH)}`;
  const item = await fetchJson(url);
  return item?.sha || null;
}

async function compareCommits(base, head) {
  const url = `${COMPARE_BASE}/${encodeURIComponent(base)}...${encodeURIComponent(head)}`;
  return fetchJson(url);
}

function readLocalMeta() {
  try {
    const raw = fs.readFileSync(META_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function readLocalRecipes() {
  try {
    const raw = fs.readFileSync(OUT_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function fileExists(p) {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function listRecipes() {
  const url = `${CONTENTS_BASE}/recipes`;
  const items = await fetchJson(url);
  if (!Array.isArray(items)) return [];
  return items
    .filter((it) => it && typeof it.name === 'string' && it.name.endsWith('.md'))
    .map((it) => ({ filename: it.name, name: it.name.replace(/\.md$/, '') }));
}

async function listImagesFor(name) {
  const url = `${CONTENTS_BASE}/images/${encodeURIComponent(name)}`;
  console.log(`[generate-static-data] Listing images for ${name} ...`);
  const items = await fetchJson(url);
  // 404 means no images dir for this recipe
  if (items === null) {
    console.log(`[generate-static-data] No images directory for ${name}`);
    return [];
  }
  if (!Array.isArray(items)) {
    throw new Error(`Unexpected response listing images for ${name}: ${JSON.stringify(items)}`);
  }
  const names = items
    .filter((it) => it && typeof it.name === 'string')
    .map((it) => it.name)
    .sort();
  console.log(`[generate-static-data] Found ${names.length} image(s) for ${name}`);
  return names;
}

async function fetchMarkdown(filename) {
  const url = `${RAW_BASE}/recipes/${encodeURIComponent(filename)}`;
  return fetchText(url);
}

async function main() {
  // Determine if generation is needed by comparing upstream SHAs with local meta
  console.log('[generate-static-data] Checking upstream SHAs...');
  let [recipesSha, imagesSha] = await Promise.all([
    latestCommitShaForPath('recipes'),
    latestCommitShaForPath('images'),
  ]);
  // Fallback: use branch head if path queries returned null
  if (!recipesSha || !imagesSha) {
    const head = await branchHeadSha();
    recipesSha = recipesSha || head;
    imagesSha = imagesSha || head;
  }
  const localMeta = readLocalMeta();
  const outFileExists = fileExists(OUT_FILE);
  const localRecipes = readLocalRecipes();
  if (
    outFileExists &&
    localMeta &&
    localMeta.source &&
    localMeta.schemaVersion === SCHEMA_VERSION &&
    localMeta.source.branch === BRANCH &&
    localMeta.source.recipesSha === recipesSha &&
    localMeta.source.imagesSha === imagesSha
  ) {
    console.log('[generate-static-data] Up to date. Skipping generation.');
    return;
  }

  if (outFileExists && localRecipes && localRecipes.length && localMeta && localMeta.schemaVersion === SCHEMA_VERSION) {
    console.log('[generate-static-data] Attempting incremental update using compare API...');
    try {
      const [recipesCmp, imagesCmp] = await Promise.all([
        localMeta.source?.recipesSha ? compareCommits(localMeta.source.recipesSha, recipesSha) : null,
        localMeta.source?.imagesSha ? compareCommits(localMeta.source.imagesSha, imagesSha) : null,
      ]);

      const changedRecipeFiles = new Set(
        (recipesCmp?.files || [])
          .filter(f => f.filename && f.filename.startsWith('recipes/') && f.filename.endsWith('.md'))
          .map(f => ({ filename: f.filename.replace(/^recipes\//, ''), status: f.status, previous: f.previous_filename?.replace(/^recipes\//, '') }))
      );
      const changedImageRecipeNames = new Set(
        (imagesCmp?.files || [])
          .filter(f => f.filename && f.filename.startsWith('images/'))
          .map(f => f.filename.split('/')[1])
          .filter(Boolean)
      );

      if ((changedRecipeFiles.size > 0) || (changedImageRecipeNames.size > 0)) {
        console.log(`[generate-static-data] Changed recipes: ${changedRecipeFiles.size}, recipes with image changes: ${changedImageRecipeNames.size}`);
        // Build a map from existing
        const map = new Map();
        for (const r of localRecipes) {
          map.set(r.filename, r);
        }

        // Apply recipe file changes
        for (const entry of changedRecipeFiles) {
          const { filename, status, previous } = entry;
          const name = filename.replace(/\.md$/, '');
          if (status === 'removed') {
            map.delete(filename);
            continue;
          }
          if (status === 'renamed' && previous && previous !== filename) {
            // Remove old and proceed to add new
            map.delete(previous);
          }
          const markdown = await fetchMarkdown(filename);
          let images = [];
          try {
            images = await listImagesFor(name);
          } catch {}
          map.set(filename, {
            name,
            filename,
            imageName: images[0] || null,
            imageNames: images,
            markdown,
          });
        }

        // Refresh images for impacted recipes (including ones changed above)
        const toRefreshImages = new Set([...changedImageRecipeNames, ...[...changedRecipeFiles].map(e => e.filename.replace(/\.md$/, ''))]);
        for (const rname of toRefreshImages) {
          const filename = `${rname}.md`;
          const existing = map.get(filename);
          if (!existing) continue; // skip if recipe not present
          try {
            const images = await listImagesFor(rname);
            existing.imageNames = images;
            existing.imageName = images[0] || null;
            map.set(filename, existing);
          } catch {}
        }

        const out = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
        await fs.promises.mkdir(OUT_DIR, { recursive: true });
        await fs.promises.writeFile(OUT_FILE, JSON.stringify(out, null, 2), 'utf8');
        const meta = {
          schemaVersion: SCHEMA_VERSION,
          source: { owner: OWNER, repo: REPO, branch: BRANCH, recipesSha, imagesSha },
          generatedAt: new Date().toISOString(),
          count: out.length,
        };
        await fs.promises.writeFile(META_FILE, JSON.stringify(meta, null, 2), 'utf8');
        console.log(`[generate-static-data] Incremental update complete. Wrote ${OUT_FILE} and ${META_FILE}`);
        return;
      } else {
        console.log('[generate-static-data] No relevant changes detected via compare. Skipping.');
        await fs.promises.mkdir(OUT_DIR, { recursive: true });
        await fs.promises.writeFile(META_FILE, JSON.stringify({
          schemaVersion: SCHEMA_VERSION,
          source: { owner: OWNER, repo: REPO, branch: BRANCH, recipesSha, imagesSha },
          generatedAt: new Date().toISOString(),
          count: localRecipes.length,
        }, null, 2), 'utf8');
        return;
      }
    } catch (e) {
      console.warn('[generate-static-data] Incremental update failed; falling back to full generation:', e?.message || e);
    }
  }

  console.log('[generate-static-data] Fetching recipe list (full)...');
  const recipes = await listRecipes();
  console.log(`[generate-static-data] Found ${recipes.length} recipes`);

  const out = [];
  for (const { name, filename } of recipes) {
    console.log(`[generate-static-data] Fetching ${filename}...`);
    let images = [];
    try {
      images = await listImagesFor(name);
    } catch (e) {
      console.warn(`[generate-static-data] Warning: failed to list images for ${name}:`, e?.message || e);
      // Continue without images; markdown will still be fetched
    }
    const markdown = await fetchMarkdown(filename);
    out.push({ name, filename, imageName: images[0] || null, imageNames: images, markdown });
  }

  await fs.promises.mkdir(OUT_DIR, { recursive: true });
  await fs.promises.writeFile(OUT_FILE, JSON.stringify(out, null, 2), 'utf8');
  const meta = {
    schemaVersion: SCHEMA_VERSION,
    source: { owner: OWNER, repo: REPO, branch: BRANCH, recipesSha, imagesSha },
    generatedAt: new Date().toISOString(),
    count: out.length,
  };
  await fs.promises.writeFile(META_FILE, JSON.stringify(meta, null, 2), 'utf8');
  console.log(`[generate-static-data] Wrote ${OUT_FILE} and ${META_FILE}`);
}

main().catch((err) => {
  console.error('[generate-static-data] Error:', err);
  process.exit(1);
});
