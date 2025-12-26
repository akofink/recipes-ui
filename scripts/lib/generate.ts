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
import { markdownToHtml, withHtmlFromMarkdown } from "./markdown";
// Lazy import to avoid circular dependency issues
import type { GenerationMeta, GhCompare, GhCompareFile, Recipe } from "./types";

const INITIAL_BASE_SHA = "c9928c5c993d30c8c77b17966505c05a2242df6c";

type ChangedRecipeEntry = {
  filename: string;
  status?: GhCompareFile["status"];
  previous?: string;
};

type DiffResult = {
  changedRecipeFiles: Set<ChangedRecipeEntry>;
  changedImageRecipeNames: Set<string>;
};

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
      const { writeStatic } = await import("./ssr");
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
 * Parse compare results into changed recipe files and changed image recipe names.
 */
export async function diffChanges(
  baseRecipesSha: string,
  baseImagesSha: string,
  recipesSha: string,
  imagesSha: string,
): Promise<DiffResult> {
  const [recipesCmp, imagesCmp]: [GhCompare | null, GhCompare | null] =
    await Promise.all([
      compareCommits(baseRecipesSha, recipesSha),
      compareCommits(baseImagesSha, imagesSha),
    ]);

  const changedRecipeFiles: Set<ChangedRecipeEntry> = new Set(
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

  return { changedRecipeFiles, changedImageRecipeNames };
}

/**
 * Apply recipe file additions/modifications/removals to the working map.
 */
export async function applyRecipeFileChanges(
  map: Map<string, Recipe>,
  changedRecipeFiles: Set<ChangedRecipeEntry>,
): Promise<void> {
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
      html: markdown ? await markdownToHtml(markdown) : "",
    });
  }
}

/**
 * Refresh image lists for recipes whose images may have changed.
 */
export async function refreshImpactedImages(
  map: Map<string, Recipe>,
  changedImageRecipeNames: Set<string>,
  changedRecipeFiles: Set<ChangedRecipeEntry>,
): Promise<void> {
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
}

/**
 * Compose the incremental update from diff + apply + refresh.
 * Returns new Recipe[] or null when no relevant changes.
 */
export async function incrementalUpdate(
  localRecipes: Recipe[],
  baseRecipesSha: string,
  baseImagesSha: string,
  recipesSha: string,
  imagesSha: string,
): Promise<Recipe[] | null> {
  const { changedRecipeFiles, changedImageRecipeNames } = await diffChanges(
    baseRecipesSha,
    baseImagesSha,
    recipesSha,
    imagesSha,
  );

  if (changedRecipeFiles.size === 0 && changedImageRecipeNames.size === 0) {
    return null;
  }

  const map = new Map<string, Recipe>(
    localRecipes.map((r) => [r.filename, { ...r }]),
  );
  await applyRecipeFileChanges(map, changedRecipeFiles);
  await refreshImpactedImages(map, changedImageRecipeNames, changedRecipeFiles);

  const out: Recipe[] = [];
  for (const r of Array.from(map.values())) {
    out.push({ ...r });
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

/**
 * Main orchestration: decide whether to skip or update, then write recipes.json,
 * meta.json, and static HTML.
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
      const { writeStatic } = await import("./ssr");
      await writeStatic(await withHtmlFromMarkdown(localRecipes || []));
    } catch (e: unknown) {
      console.warn(
        "[generate-static-data] Writing static pages from local data failed:",
        e instanceof Error ? e.message : String(e),
      );
    }
    return;
  }

  if (!recipesSha || !imagesSha) {
    throw new Error(
      "[generate-static-data] Unable to resolve upstream SHAs for generation.",
    );
  }

  const useLocalBase =
    !!localMeta &&
    localMeta.schemaVersion === SCHEMA_VERSION &&
    localMeta.source?.branch === BRANCH &&
    !!localMeta.source?.recipesSha &&
    !!localMeta.source?.imagesSha;
  const baseRecipesSha = useLocalBase
    ? (localMeta.source?.recipesSha as string)
    : INITIAL_BASE_SHA;
  const baseImagesSha = useLocalBase
    ? (localMeta.source?.imagesSha as string)
    : INITIAL_BASE_SHA;
  const seedRecipes = Array.isArray(localRecipes) ? localRecipes : [];

  console.log("[generate-static-data] Attempting update using compare API...");
  try {
    const updated = await incrementalUpdate(
      seedRecipes,
      baseRecipesSha,
      baseImagesSha,
      recipesSha,
      imagesSha,
    );
    if (updated) {
      await writeRecipes(updated);
      const { writeStatic } = await import("./ssr");
      await writeStatic(updated);
      await writeMetaNow(recipesSha, imagesSha, updated.length);
      console.log(
        `[generate-static-data] Update complete. Wrote ${OUT_FILE} and ${META_FILE}`,
      );
      return;
    }
    console.log(
      "[generate-static-data] No relevant changes detected via compare. Skipping.",
    );
    if (outFileExists) {
      await writeMetaNow(recipesSha, imagesSha, seedRecipes.length);
    }
    return;
  } catch (e: unknown) {
    if (process.env.CI) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`[generate-static-data] Update failed in CI: ${msg}`);
    }
    throw e;
  }
}
