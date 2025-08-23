#!/usr/bin/env node
/*
  Generate static recipe data at build time by fetching from the recipes-md repo.
  Produces src/generated/recipes.json with fields: name, filename, imageName (optional), markdown.
*/
const fs = require('fs');
const path = require('path');

const GH_API = 'https://api.github.com';
const OWNER = 'akofink';
const REPO = 'recipes-md';
const BRANCH = 'main';
const RAW_BASE = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}`;
const CONTENTS_BASE = `${GH_API}/repos/${OWNER}/${REPO}/contents`;

const OUT_DIR = path.resolve(__dirname, '..', 'src', 'generated');
const OUT_FILE = path.join(OUT_DIR, 'recipes.json');

function authHeaders() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || process.env.RECIPES_GITHUB_TOKEN;
  return token ? { Authorization: `token ${token}` } : {};
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { ...authHeaders(), 'User-Agent': 'recipes-ui-build-script' } });
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText} - ${text}`);
  }
  return res.json();
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { ...authHeaders(), 'User-Agent': 'recipes-ui-build-script' } });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText} - ${text}`);
  }
  return res.text();
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
  const items = await fetchJson(url);
  if (!Array.isArray(items)) return [];
  return items
    .filter((it) => it && typeof it.name === 'string')
    .map((it) => it.name)
    .sort();
}

async function fetchMarkdown(filename) {
  const url = `${RAW_BASE}/recipes/${encodeURIComponent(filename)}`;
  return fetchText(url);
}

async function main() {
  console.log('[generate-static-data] Fetching recipe list...');
  const recipes = await listRecipes();
  console.log(`[generate-static-data] Found ${recipes.length} recipes`);

  const out = [];
  for (const { name, filename } of recipes) {
    console.log(`[generate-static-data] Fetching ${filename}...`);
    const [images, markdown] = await Promise.all([
      listImagesFor(name).catch(() => []),
      fetchMarkdown(filename),
    ]);
    out.push({ name, filename, imageName: images[0] || null, markdown });
  }

  await fs.promises.mkdir(OUT_DIR, { recursive: true });
  await fs.promises.writeFile(OUT_FILE, JSON.stringify(out, null, 2), 'utf8');
  console.log(`[generate-static-data] Wrote ${OUT_FILE}`);
}

main().catch((err) => {
  console.error('[generate-static-data] Error:', err);
  process.exit(1);
});
