/** @jest-environment node */

import fs from "fs";
import path from "path";
import type { Recipe } from "../scripts/lib/types";

jest.mock("../scripts/lib/io", () => ({
  STATIC_DIR: `${process.env.TMPDIR || "/tmp"}/recipes-ui-ssr-${process.pid}`,
}));

import { writeStatic } from "../scripts/lib/ssr";

const mockStaticDir = `${process.env.TMPDIR || "/tmp"}/recipes-ui-ssr-${process.pid}`;

function recipe(name: string): Recipe {
  return {
    name,
    filename: `${name}.md`,
    imageName: null,
    imageNames: [],
    markdown: `# ${name}`,
    html: `<h1>${name}</h1>`,
  };
}

afterEach(async () => {
  await fs.promises.rm(mockStaticDir, { recursive: true, force: true });
  await fs.promises.rm(`${mockStaticDir}.tmp`, {
    recursive: true,
    force: true,
  });
});

test("replaces static output so deleted and renamed recipes do not remain", async () => {
  await writeStatic([recipe("old-name")]);
  await writeStatic([recipe("new-name")]);

  await expect(
    fs.promises.access(path.join(mockStaticDir, "old-name", "index.html")),
  ).rejects.toThrow();
  await expect(
    fs.promises.readFile(
      path.join(mockStaticDir, "new-name", "index.html"),
      "utf8",
    ),
  ).resolves.toContain("new-name");
});

test("keeps existing output when rendering fails", async () => {
  await writeStatic([recipe("existing")]);
  const invalidRecipe = recipe("invalid");
  invalidRecipe.name = Symbol("invalid") as unknown as string;

  await expect(writeStatic([invalidRecipe])).rejects.toThrow();
  await expect(
    fs.promises.access(path.join(mockStaticDir, "existing", "index.html")),
  ).resolves.toBeUndefined();
});
