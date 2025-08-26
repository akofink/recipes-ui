#!/usr/bin/env node
/*
  Generate static recipe data at build time by fetching from the recipes-md repo.
  - Produces src/generated/recipes.json with entries: { name, filename, imageName, imageNames, markdown, html }
  - Writes src/generated/meta.json with source commit SHAs used to generate the data
  - Skips generation if current local meta matches latest upstream SHAs (recipes/ and images/ paths)
  - Renders static HTML pages under src/generated/static via SSR using app layouts
*/

// Enable loading of .ts/.tsx helper modules from this JS entrypoint
try {
  require("ts-node").register({
    transpileOnly: true,
    compilerOptions: { module: "CommonJS" },
  });
} catch {}

const fs = require("fs");

// TS modules
const { OWNER, REPO, BRANCH, SCHEMA_VERSION } = require("./lib/config.ts");
const {
  OUT_DIR,
  OUT_FILE,
  META_FILE,
  STATIC_DIR,
  fileExists,
  readLocalMeta,
  readLocalRecipes,
  writeRecipes,
  writeMeta,
} = require("./lib/io.ts");
const {
  latestCommitShaForPath,
  branchHeadSha,
  compareCommits,
  listRecipes,
  listImagesFor,
  fetchMarkdown,
} = require("./lib/github.ts");
const { writeStatic } = require("./lib/ssr.ts");

function ensureHtml(recipes) {
  const { marked } = require("marked");
  return (recipes || []).map((r) => ({
    ...r,
    html: r.html || (r.markdown ? marked.parse(r.markdown) : ""),
  }));
}

async function getUpstreamShas() {
  let recipesSha = null;
  let imagesSha = null;
  try {
    [recipesSha, imagesSha] = await Promise.all([
      latestCommitShaForPath("recipes"),
      latestCommitShaForPath("images"),
    ]);
  } catch (e) {
    if (process.env.CI) {
      throw new Error(
        `[generate-static-data] Unable to query upstream SHAs in CI: ${e?.message || e}`,
      );
    }
    // Fallback to local-only SSR if possible
    console.warn(
      "[generate-static-data] Unable to query upstream SHAs; attempting offline/static generation from local data:",
      e?.message || e,
    );
    const local = readLocalRecipes();
    if (fileExists(OUT_FILE) && Array.isArray(local) && local.length) {
      await writeStatic(ensureHtml(local));
      console.log(
        "[generate-static-data] Wrote static pages from local recipes.json and exiting.",
      );
      return { recipesSha: null, imagesSha: null, offlineDone: true };
    }
    throw e;
  }
  if (!recipesSha || !imagesSha) {
    const head = await branchHeadSha();
    recipesSha = recipesSha || head;
    imagesSha = imagesSha || head;
  }
  return { recipesSha, imagesSha, offlineDone: false };
}

function isUpToDate(localMeta, recipesSha, imagesSha) {
  return (
    !!localMeta &&
    !!localMeta.source &&
    localMeta.schemaVersion === SCHEMA_VERSION &&
    localMeta.source.branch === BRANCH &&
    localMeta.source.recipesSha === recipesSha &&
    localMeta.source.imagesSha === imagesSha
  );
}

async function writeMetaNow(recipesSha, imagesSha, count) {
  const meta = {
    schemaVersion: SCHEMA_VERSION,
    source: { owner: OWNER, repo: REPO, branch: BRANCH, recipesSha, imagesSha },
    generatedAt: new Date().toISOString(),
    count,
  };
  await writeMeta(meta);
}

async function incrementalUpdate(
  localRecipes,
  localMeta,
  recipesSha,
  imagesSha,
) {
  const [recipesCmp, imagesCmp] = await Promise.all([
    localMeta.source?.recipesSha
      ? compareCommits(localMeta.source.recipesSha, recipesSha)
      : null,
    localMeta.source?.imagesSha
      ? compareCommits(localMeta.source.imagesSha, imagesSha)
      : null,
  ]);

  const changedRecipeFiles = new Set(
    (recipesCmp?.files || [])
      .filter(
        (f) =>
          f.filename &&
          f.filename.startsWith("recipes/") &&
          f.filename.endsWith(".md"),
      )
      .map((f) => ({
        filename: f.filename.replace(/^recipes\//, ""),
        status: f.status,
        previous: f.previous_filename?.replace(/^recipes\//, ""),
      })),
  );
  const changedImageRecipeNames = new Set(
    (imagesCmp?.files || [])
      .filter((f) => f.filename && f.filename.startsWith("images/"))
      .map((f) => f.filename.split("/")[1])
      .filter(Boolean),
  );

  if (changedRecipeFiles.size === 0 && changedImageRecipeNames.size === 0) {
    return null; // nothing to do
  }

  // Build map of existing entries
  const map = new Map(localRecipes.map((r) => [r.filename, { ...r }]));

  // Apply recipe file changes
  for (const entry of changedRecipeFiles) {
    const { filename, status, previous } = entry;
    const name = filename.replace(/\.md$/, "");
    if (status === "removed") {
      map.delete(filename);
      continue;
    }
    if (status === "renamed" && previous && previous !== filename) {
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
  const toRefreshImages = new Set([
    ...changedImageRecipeNames,
    ...[...changedRecipeFiles].map((e) => e.filename.replace(/\.md$/, "")),
  ]);
  for (const rname of toRefreshImages) {
    const filename = `${rname}.md`;
    const existing = map.get(filename);
    if (!existing) continue;
    try {
      const images = await listImagesFor(rname);
      existing.imageNames = images;
      existing.imageName = images[0] || null;
      map.set(filename, existing);
    } catch {}
  }

  const { marked } = require("marked");
  const out = Array.from(map.values())
    .map((r) => ({ ...r, html: r.markdown ? marked.parse(r.markdown) : "" }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return out;
}

async function fullGeneration() {
  console.log("[generate-static-data] Fetching recipe list (full)...");
  const recipes = await listRecipes();
  console.log(`[generate-static-data] Found ${recipes.length} recipes`);

  const { marked } = require("marked");
  const out = [];
  await fs.promises.mkdir(STATIC_DIR, { recursive: true });
  for (const { name, filename } of recipes) {
    console.log(`[generate-static-data] Fetching ${filename}...`);
    let images = [];
    try {
      images = await listImagesFor(name);
    } catch (e) {
      if (process.env.CI) {
        throw new Error(
          `[generate-static-data] Failed to list images for ${name} in CI: ${e?.message || e}`,
        );
      }
      console.warn(
        `[generate-static-data] Warning: failed to list images for ${name}:`,
        e?.message || e,
      );
    }
    const markdown = await fetchMarkdown(filename);
    const html = marked.parse(markdown);
    out.push({
      name,
      filename,
      imageName: images[0] || null,
      imageNames: images,
      markdown,
      html,
    });
  }
  return out;
}

async function main() {
  const { recipesSha, imagesSha, offlineDone } = await getUpstreamShas();
  if (offlineDone) return;

  const localMeta = readLocalMeta();
  const outFileExists = fileExists(OUT_FILE);
  const localRecipes = readLocalRecipes();

  if (outFileExists && isUpToDate(localMeta, recipesSha, imagesSha)) {
    console.log("[generate-static-data] Up to date. Skipping generation.");
    try {
      await writeStatic(ensureHtml(localRecipes || []));
    } catch (e) {
      console.warn(
        "[generate-static-data] Writing static pages from local data failed:",
        e?.message || e,
      );
    }
    return;
  }

  if (
    outFileExists &&
    localRecipes &&
    localRecipes.length &&
    localMeta &&
    localMeta.schemaVersion === SCHEMA_VERSION
  ) {
    console.log(
      "[generate-static-data] Attempting incremental update using compare API...",
    );
    try {
      const updated = await incrementalUpdate(
        localRecipes,
        localMeta,
        recipesSha,
        imagesSha,
      );
      if (updated) {
        await writeRecipes(updated);
        await writeStatic(updated);
        await writeMetaNow(recipesSha, imagesSha, updated.length);
        console.log(
          `[generate-static-data] Incremental update complete. Wrote ${OUT_FILE} and ${META_FILE}`,
        );
        return;
      } else {
        console.log(
          "[generate-static-data] No relevant changes detected via compare. Skipping.",
        );
        await writeMetaNow(recipesSha, imagesSha, localRecipes.length);
        return;
      }
    } catch (e) {
      if (process.env.CI) {
        throw new Error(
          `[generate-static-data] Incremental update failed in CI: ${e?.message || e}`,
        );
      }
      console.warn(
        "[generate-static-data] Incremental update failed; falling back to full generation:",
        e?.message || e,
      );
    }
  }

  // Full generation
  const out = await fullGeneration();
  await writeRecipes(out);
  await writeMetaNow(recipesSha, imagesSha, out.length);
  await writeStatic(out);
  console.log(`[generate-static-data] Wrote ${OUT_FILE} and ${META_FILE}`);
}

main().catch((err) => {
  console.error("[generate-static-data] Error:", err);
  process.exit(1);
});
