/**
 * Markdown utilities for converting recipe markdown to HTML.
 */
import sanitizeHtml from "sanitize-html";
import type { Recipe } from "./types";

/**
 * Whitelist for generated recipe HTML. Covers everything `marked` emits for
 * markdown plus the disabled checkbox `input` used by markdown task lists.
 * `marked` passes raw HTML through, so this build-time sanitize step is what
 * keeps recipe HTML safe before it reaches recipes.json and the static pages.
 */
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "input"]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    img: ["src", "srcset", "alt", "title", "width", "height", "loading"],
    input: ["type", "checked", "disabled"],
  },
};

const sanitizeRecipeHtml = (html: string): string =>
  sanitizeHtml(html, SANITIZE_OPTIONS);

/**
 * Convert a Markdown string into HTML. Uses a dynamic import of `marked`
 * to avoid ESM/CJS interop issues when running under ts-node, then sanitizes
 * the output with sanitize-html.
 */
export async function markdownToHtml(md: string): Promise<string> {
  // Use eval to prevent webpack/ts-node from statically analyzing the import
  const importMarked = new Function('return import("marked")');
  const mod = (await importMarked()) as unknown as {
    marked?: { parse: (s: string) => string | Promise<string> };
    parse?: (s: string) => string | Promise<string>;
  };
  const parser = mod.marked?.parse ?? mod.parse;
  const html = (parser ? await parser(md) : md) as string;
  return sanitizeRecipeHtml(html);
}

/**
 * Return the sanitized version of already-generated recipe HTML. Exported
 * separately from `markdownToHtml` so the security-critical sanitizer can be
 * unit-tested without the dynamic `marked` import, which jest's CJS
 * environment cannot execute.
 */
export { sanitizeRecipeHtml };

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
