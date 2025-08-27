/**
 * Incremental update utilities: parse GitHub compare results and update local recipe data.
 */
import type { GenerationMeta, GhCompare, GhCompareFile, Recipe } from "./types";
import { compareCommits, listImagesFor, fetchMarkdown } from "./github";

export type ChangedRecipeEntry = {
  filename: string;
  status?: GhCompareFile["status"];
  previous?: string;
};

export type DiffResult = {
  changedRecipeFiles: Set<ChangedRecipeEntry>;
  changedImageRecipeNames: Set<string>;
};

/**
 * Parse compare results into changed recipe files and changed image recipe names.
 */
export async function diffChanges(
  localMeta: GenerationMeta,
  recipesSha: string,
  imagesSha: string,
): Promise<DiffResult> {
  const [recipesCmp, imagesCmp]: [GhCompare | null, GhCompare | null] =
    await Promise.all([
      localMeta.source?.recipesSha
        ? compareCommits(localMeta.source.recipesSha, recipesSha)
        : Promise.resolve(null),
      localMeta.source?.imagesSha
        ? compareCommits(localMeta.source.imagesSha, imagesSha)
        : Promise.resolve(null),
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
  localMeta: GenerationMeta,
  recipesSha: string,
  imagesSha: string,
): Promise<Recipe[] | null> {
  const { changedRecipeFiles, changedImageRecipeNames } = await diffChanges(
    localMeta,
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
