import fs from "fs";
import { renderHtml } from "./markdown";
import { STATIC_DIR } from "./io";
import { listRecipes, listImagesFor, fetchMarkdown } from "./github";
import type { Recipe } from "./types";

export async function fullGeneration(): Promise<Recipe[]> {
  console.log("[generate-static-data] Fetching recipe list (full)...");
  const recipes = await listRecipes();
  console.log(`[generate-static-data] Found ${recipes.length} recipes`);

  const out: Recipe[] = [];
  await fs.promises.mkdir(STATIC_DIR, { recursive: true });
  for (const { name, filename } of recipes) {
    console.log(`[generate-static-data] Fetching ${filename}...`);
    let images: string[] = [];
    try {
      images = await listImagesFor(name);
    } catch (e) {
      if (process.env.CI) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(
          `[generate-static-data] Failed to list images for ${name} in CI: ${msg}`,
        );
      }
      console.warn(
        `[generate-static-data] Warning: failed to list images for ${name}:`,
        e instanceof Error ? e.message : String(e),
      );
    }
    const markdown = await fetchMarkdown(filename);
    const html = await renderHtml(markdown);
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
