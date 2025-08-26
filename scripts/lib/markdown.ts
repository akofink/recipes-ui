import type { Recipe } from "./types";

// Dynamically import marked to avoid ESM/CJS interop issues
export async function renderHtml(md: string): Promise<string> {
  const mod = (await import("marked")) as unknown as {
    marked?: { parse: (s: string) => string | Promise<string> };
    parse?: (s: string) => string | Promise<string>;
  };
  const parser = mod.marked?.parse ?? mod.parse;
  return (parser ? await parser(md) : md) as string;
}

export async function ensureHtml(
  recipes: Recipe[] | null | undefined,
): Promise<Recipe[]> {
  const list = recipes || [];
  const out: Recipe[] = [];
  for (const r of list) {
    let html = r.html || "";
    if (!html && r.markdown) {
      html = await renderHtml(r.markdown);
    }
    out.push({ ...r, html });
  }
  return out;
}
