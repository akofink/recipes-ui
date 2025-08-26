import fs from "fs";
import path from "path";
import type { Recipe, GenerationMeta } from "./types";

export const OUT_DIR = path.resolve(__dirname, "..", "..", "src", "generated");
export const OUT_FILE = path.join(OUT_DIR, "recipes.json");
export const META_FILE = path.join(OUT_DIR, "meta.json");
export const STATIC_DIR = path.join(OUT_DIR, "static");

export function fileExists(p: string): boolean {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export function readLocalMeta(): GenerationMeta | null {
  try {
    const raw = fs.readFileSync(META_FILE, "utf8");
    return JSON.parse(raw) as GenerationMeta;
  } catch {
    return null;
  }
}

export function readLocalRecipes(): Recipe[] | null {
  try {
    const raw = fs.readFileSync(OUT_FILE, "utf8");
    return JSON.parse(raw) as Recipe[];
  } catch {
    return null;
  }
}

export async function writeRecipes(recipes: Recipe[]): Promise<void> {
  await fs.promises.mkdir(OUT_DIR, { recursive: true });
  await fs.promises.writeFile(
    OUT_FILE,
    JSON.stringify(recipes, null, 2),
    "utf8",
  );
}

export async function writeMeta(meta: GenerationMeta): Promise<void> {
  await fs.promises.mkdir(OUT_DIR, { recursive: true });
  await fs.promises.writeFile(META_FILE, JSON.stringify(meta, null, 2), "utf8");
}
