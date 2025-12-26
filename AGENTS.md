## Recipes UI agent notes

- This app is a React + TypeScript SPA built with Webpack and deployed to GitHub Pages.
- Recipe content comes from https://github.com/akofink/recipes-md.
- All recipe data is generated at build time. The generator fetches markdown and metadata from recipes-md, writes `src/generated/recipes.json`, and pre-renders HTML into `src/generated/static/` (copied to `dist/static/`).
- `src/generated/meta.json` stores upstream commit SHAs used for incremental builds; it determines what the next generate considers "changed."
- If `meta.json` is missing or invalid, generation compares against the initial recipes-md commit so the diff captures the full repo history.
- The `/static` site is a no-JavaScript fallback meant to degrade gracefully; it should not depend on client-side fetching.
- When making changes in this repo, always commit work incrementally as you go.
- Runtime pages should not call GitHub or any external API for recipe content. The intent is an encapsulated site that reads only local static assets (with exceptions like analytics).
- Incremental generation compares upstream SHAs for `recipes/` and `images/` and skips regeneration when unchanged.

## Key commands

- `yarn generate` to build recipe data (writes `src/generated/recipes.json`).
- `yarn build` runs `yarn generate` and emits production assets to `dist/`.
- `yarn start` runs webpack-dev-server at http://localhost:3000.

## Configuration and routing

- `webpack.config.ts` reads `HOST` and `PORT` for dev server configuration.
- Routing uses `react-router-dom` v6; dev server uses `historyApiFallback` for deep links.
