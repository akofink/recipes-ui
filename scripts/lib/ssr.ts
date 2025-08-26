import fs from "fs";
import path from "path";
import React, { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { Routes, Route } from "react-router-dom";
import { Recipes as RecipesLayout } from "../../src/layouts/recipes";
import { Recipe as RecipeView } from "../../src/layouts/recipe";
import type { Recipe } from "./types";

import { STATIC_DIR } from "./io";

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
  <link href=\"https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css\" rel=\"stylesheet\">
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

  // Index
  const indexTree: ReactElement = React.createElement(
    StaticRouterCT,
    { location: "/" },
    React.createElement(
      RoutesCT,
      null,
      React.createElement(RouteCT, {
        path: "/",
        element: React.createElement(RecipesLayout, null),
      }),
    ),
  );
  let indexBody = jsx(indexTree);
  indexBody = rewriteLocalLinksToStatic(indexBody);
  const indexShell = baseShell("Recipes", indexBody);
  await fs.promises.mkdir(STATIC_DIR, { recursive: true });
  await fs.promises.writeFile(
    path.join(STATIC_DIR, "index.html"),
    indexShell,
    "utf8",
  );

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
          element: React.createElement(RecipeView, null),
        }),
      ),
    );
    let body = jsx(recipeTree);
    body = rewriteLocalLinksToStatic(body);
    const shell = baseShell(`${r.name} – Recipes`, body);
    const dir = path.join(STATIC_DIR, r.name);
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(path.join(dir, "index.html"), shell, "utf8");
  }
}
