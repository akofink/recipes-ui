import { OWNER, REPO, BRANCH, SCHEMA_VERSION } from "./config";
import {
  OUT_FILE,
  META_FILE,
  fileExists,
  readLocalMeta,
  readLocalRecipes,
  writeRecipes,
  writeMeta,
} from "./io";
import {
  latestCommitShaForPath,
  branchHeadSha,
  compareCommits,
  listImagesFor,
  fetchMarkdown,
} from "./github";
import { fullGeneration } from "./build"; // full generation lives in build.ts
import { markdownToHtml, withHtmlFromMarkdown } from "./markdown";
import { writeStatic } from "./ssr";
import type { GenerationMeta, GhCompare, GhCompareFile, Recipe } from "./types";

/**
 * Query upstream commit SHAs for the recipes/ and images/ paths (or branch head).
 * Falls back to using local recipes.json to build static HTML if offline.
 */
export async function getUpstreamShas(): Promise<{
  recipesSha: string | null;
  imagesSha: string | null;
  offlineDone: boolean;
}> {
  let recipesSha: string | null = null;
  let imagesSha: string | null = null;
  try {
    [recipesSha, imagesSha] = await Promise.all([
      latestCommitShaForPath("recipes"),
      latestCommitShaForPath("images"),
    ]);
  } catch (e: unknown) {
    if (process.env.CI) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(
        `[generate-static-data] Unable to query upstream SHAs in CI: ${msg}`,
      );
    }
    console.warn(
      "[generate-static-data] Unable to query upstream SHAs; attempting offline/static generation from local data:",
      e instanceof Error ? e.message : String(e),
    );
    const local = readLocalRecipes();
    if (fileExists(OUT_FILE) && Array.isArray(local) && local.length) {
      await writeStatic(await withHtmlFromMarkdown(local));
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

/**
 * Check whether the local meta already reflects the current upstream SHAs.
 */
export function isUpToDate(
  localMeta: GenerationMeta | null,
  recipesSha: string | null,
  imagesSha: string | null,
): boolean {
  return (
    !!localMeta &&
    !!localMeta.source &&
    localMeta.schemaVersion === SCHEMA_VERSION &&
    localMeta.source.branch === BRANCH &&
    localMeta.source.recipesSha === recipesSha &&
    localMeta.source.imagesSha === imagesSha
  );
}

/**
 * Write the meta.json file with the inputs used for generation.
 */
export async function writeMetaNow(
  recipesSha: string | null,
  imagesSha: string | null,
  count: number,
): Promise<void> {
  const meta: GenerationMeta = {
    schemaVersion: SCHEMA_VERSION,
    source: { owner: OWNER, repo: REPO, branch: BRANCH, recipesSha, imagesSha },
    generatedAt: new Date().toISOString(),
    count,
  };
  await writeMeta(meta);
}

/**
 * Apply upstream changes to a local Recipe[] using GitHub compare results.
 * Returns a new, sorted Recipe[] or null if no changes affect recipes/images.
 */
export async function incrementalUpdate(
  localRecipes: Recipe[],
  localMeta: GenerationMeta,
  recipesSha: string,
  imagesSha: string,
): Promise<Recipe[] | null> {
  const [recipesCmp, imagesCmp]: [GhCompare | null, GhCompare | null] =
    await Promise.all([
      localMeta.source?.recipesSha
        ? compareCommits(localMeta.source.recipesSha, recipesSha)
        : Promise.resolve(null),
      localMeta.source?.imagesSha
        ? compareCommits(localMeta.source.imagesSha, imagesSha)
        : Promise.resolve(null),
    ]);

  const changedRecipeFiles: Set<{
    filename: string;
    status?: GhCompareFile["status"];
    previous?: string;
  }> = new Set(
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
  const changedImageRecipeNames: Set<string> = new Set(
    (imagesCmp?.files || [])
      .filter((f) => f.filename && f.filename.startsWith("images/"))
      .map((f) => f.filename.split("/")[1])
      .filter((x): x is string => Boolean(x)),
  );

  if (changedRecipeFiles.size === 0 && changedImageRecipeNames.size === 0) {
    return null; // nothing to do
  }

  // Build map of existing entries
  const map = new Map<string, Recipe>(
    localRecipes.map((r) => [r.filename, { ...r }]),
  );

  // Apply recipe file changes
  for (const entry of Array.from(changedRecipeFiles)) {
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
    let images: string[] = [];
    try {
      images = await listImagesFor(name);
    } catch {
      // ignore image listing errors for incremental update
    }
    map.set(filename, {
      name,
      filename,
      imageName: images[0] || null,
      imageNames: images,
      markdown,
    });
  }

  // Refresh images for impacted recipes (including ones changed above)
  const toRefreshImages = new Set<string>();
  changedImageRecipeNames.forEach((n) => toRefreshImages.add(n));
  Array.from(changedRecipeFiles).forEach((e) =>
    toRefreshImages.add(e.filename.replace(/\.md$/, "")),
  );
  for (const rname of Array.from(toRefreshImages)) {
    const filename = `${rname}.md`;
    const existing = map.get(filename);
    if (!existing) continue;
    try {
      const images = await listImagesFor(rname);
      existing.imageNames = images;
      existing.imageName = images[0] || null;
      map.set(filename, existing);
    } catch {
      // ignore image listing errors for incremental update
    }
  }

  const out: Recipe[] = [];
  for (const r of Array.from(map.values())) {
    out.push({
      ...r,
      html: r.markdown ? await markdownToHtml(r.markdown) : "",
    });
  }
  out.sort((a, b) => a.name.localeCompare(b.name));

  return out;
}

/**
 * Main orchestration: decide whether to skip, do incremental update, or full generation,
 * then write recipes.json, meta.json, and static HTML.
 */
export async function run(): Promise<void> {
  const { recipesSha, imagesSha, offlineDone } = await getUpstreamShas();
  if (offlineDone) return;

  const localMeta = readLocalMeta();
  const outFileExists = fileExists(OUT_FILE);
  const localRecipes = readLocalRecipes();

  if (outFileExists && isUpToDate(localMeta, recipesSha, imagesSha)) {
    console.log("[generate-static-data] Up to date. Skipping generation.");
    try {
      await writeStatic(await withHtmlFromMarkdown(localRecipes || []));
    } catch (e: unknown) {
      console.warn(
        "[generate-static-data] Writing static pages from local data failed:",
        e instanceof Error ? e.message : String(e),
      );
    }
    return;
  }

  if (
    outFileExists &&
    Array.isArray(localRecipes) &&
    localRecipes.length > 0 &&
    localMeta &&
    localMeta.schemaVersion === SCHEMA_VERSION &&
    recipesSha &&
    imagesSha
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
    } catch (e: unknown) {
      if (process.env.CI) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(
          `[generate-static-data] Incremental update failed in CI: ${msg}`,
        );
      }
      console.warn(
        "[generate-static-data] Incremental update failed; falling back to full generation:",
        e instanceof Error ? e.message : String(e),
      );
    }
  }

  // Full generation
  const out = await fullGeneration(); // from scripts/lib/build
  await writeRecipes(out);
  await writeMetaNow(recipesSha, imagesSha, out.length);
  await writeStatic(out);
  console.log(`[generate-static-data] Wrote ${OUT_FILE} and ${META_FILE}`);
}
