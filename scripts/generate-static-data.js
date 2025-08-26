#!/usr/bin/env node
/*
  Generate static recipe data at build time by fetching from the recipes-md repo.
  - Produces src/generated/recipes.json with entries: { name, filename, imageName, imageNames, markdown, html }
  - Writes src/generated/meta.json with source commit SHAs used to generate the data
  - Skips generation if current local meta matches latest upstream SHAs (recipes/ and images/ paths)
  - Renders static HTML pages under src/generated/static via SSR using app layouts
*/

// Allow importing TS helpers from this JS entrypoint
try {
  require("ts-node").register({
    transpileOnly: true,
    compilerOptions: { module: "CommonJS" },
  });
} catch {}

const { run } = require("./lib/generate.ts");

run().catch((err) => {
  console.error("[generate-static-data] Error:", err);
  process.exit(1);
});
