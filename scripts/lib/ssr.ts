import fs from "fs";
import path from "path";
import React, { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Route, Routes, StaticRouter } from "react-router-dom";
import { Recipes as RecipesLayout } from "../../src/layouts/recipes";
import { Recipe as RecipeView } from "../../src/layouts/recipe";
import type { RecipeData } from "../../src/types";
import type { Recipe } from "./types";

import { STATIC_DIR } from "./io";

const BOOTSTRAP_CSS = require.resolve("bootstrap/dist/css/bootstrap.min.css");

function toRecipeData(recipe: Recipe): RecipeData {
  return {
    name: recipe.name,
    filename: recipe.filename,
    imageName: recipe.imageName,
    imageNames: recipe.imageNames,
    markdown: recipe.markdown ?? "",
    html: recipe.html ?? "",
  };
}

function rewriteLocalLinksToStatic(html: string): string {
  // Rewrite app-relative links to point to /static/ paths for static hosting
  return html.replace(
    /href=\"\/(?!static\/)([^\"\/][^\"#?]*)\"/g,
    'href=\"/static/$1/\"',
  );
}

function baseShell(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang=\"en\">
<head>
  <meta charset=\"utf-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
  <title>${title}</title>
  <link href=\"/static/bootstrap.min.css\" rel=\"stylesheet\">
  <style>
    body { height: 100%; }
    .clean-link { text-decoration: none; color: inherit; }
    .logo-link { text-decoration: none; color: inherit; padding: 0 1rem; }
    .app-container-div { height: 100%; border-style: double; border-color: cornsilk; border-top-width: .5rem; padding: 1rem 10% 5rem; }
    .recipe-card-img { height: 150px; object-fit: cover; }
    .recipe-card { overflow: hidden; margin: .5rem 0; }
    .recipe-card-body { height: 50px; }
    .recipe-card-title { display: block; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0; }
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

function jsx(element: ReactElement): string {
  return renderToStaticMarkup(element);
}

export async function writeStatic(recipes: Recipe[]): Promise<void> {
  const StaticRouterCT = StaticRouter as unknown as React.ComponentType<
    Record<string, unknown>
  >;
  const RoutesCT = Routes as unknown as React.ComponentType<
    Record<string, unknown>
  >;
  const RouteCT = Route as unknown as React.ComponentType<
    Record<string, unknown>
  >;

  const pages = new Map<string, string>();

  // Index
  const indexTree: ReactElement = React.createElement(
    StaticRouterCT,
    { location: "/" },
    React.createElement(
      RoutesCT,
      null,
      React.createElement(RouteCT, {
        path: "/",
        element: React.createElement(RecipesLayout, {
          initialRecipes: recipes.map(toRecipeData),
          initialPageSize: recipes.length,
        }),
      }),
    ),
  );
  let indexBody = jsx(indexTree);
  indexBody = rewriteLocalLinksToStatic(indexBody);
  const indexShell = baseShell("Recipes", indexBody);
  pages.set("index.html", indexShell);

  // Per-recipe pages
  for (const r of recipes) {
    const location = `/${r.name}`;
    const recipeTree: ReactElement = React.createElement(
      StaticRouterCT,
      { location },
      React.createElement(
        RoutesCT,
        null,
        React.createElement(RouteCT, {
          path: "/:fileBasename",
          element: React.createElement(RecipeView, {
            initialRecipe: toRecipeData(r),
          }),
        }),
      ),
    );
    let body = jsx(recipeTree);
    body = rewriteLocalLinksToStatic(body);
    const shell = baseShell(`${r.name} – Recipes`, body);
    pages.set(path.join(r.name, "index.html"), shell);
  }

  const stagingDir = `${STATIC_DIR}.tmp`;
  await fs.promises.rm(stagingDir, { recursive: true, force: true });
  try {
    await fs.promises.mkdir(stagingDir, { recursive: true });
    await fs.promises.copyFile(
      BOOTSTRAP_CSS,
      path.join(stagingDir, "bootstrap.min.css"),
    );
    for (const [relativePath, contents] of Array.from(pages.entries())) {
      const outputPath = path.join(stagingDir, relativePath);
      await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.promises.writeFile(outputPath, contents, "utf8");
    }
    await fs.promises.rm(STATIC_DIR, { recursive: true, force: true });
    await fs.promises.rename(stagingDir, STATIC_DIR);
  } catch (error) {
    await fs.promises.rm(stagingDir, { recursive: true, force: true });
    throw error;
  }
}
