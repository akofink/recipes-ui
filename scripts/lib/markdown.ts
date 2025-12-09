/**
 * Markdown utilities for converting recipe markdown to HTML.
 */
import type { Recipe } from "./types";

/**
 * Convert a Markdown string into HTML. Uses a dynamic import of `marked`
 * to avoid ESM/CJS interop issues when running under ts-node.
 */
export async function markdownToHtml(md: string): Promise<string> {
  // Use eval to prevent webpack/ts-node from statically analyzing the import
  const importMarked = new Function('return import("marked")');
  const mod = (await importMarked()) as unknown as {
    marked?: { parse: (s: string) => string | Promise<string> };
    parse?: (s: string) => string | Promise<string>;
  };
  const parser = mod.marked?.parse ?? mod.parse;
  return (parser ? await parser(md) : md) as string;
}

/**
 * Return a new array of recipes where each recipe has its `html` field populated
 * from its `markdown` field when missing. Original objects are not mutated.
 */
export async function withHtmlFromMarkdown(
  recipes: Recipe[] | null | undefined,
): Promise<Recipe[]> {
  const list = recipes || [];
  const out: Recipe[] = [];
  for (const r of list) {
    let html = r.html || "";
    if (!html && r.markdown) {
      html = await markdownToHtml(r.markdown);
    }
    out.push({ ...r, html });
  }
  return out;
}
