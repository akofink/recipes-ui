# Recipes React UI

Live site: https://recipes.akofink.com

A React + TypeScript single-page app built with Webpack and deployed to GitHub Pages. Recipe content is sourced from the public repository https://github.com/akofink/recipes-md.

## Prerequisites

- Node.js LTS. This repo includes an `.nvmrc`; if you use `nvm`, run `nvm use`.
- npm, bundled with Node.js. npm is the only supported package manager; commit dependency changes through `package-lock.json`.
- Git

## Getting started (local development)

1. Clone and enter the repo
   ```bash
   git clone https://github.com/akofink/recipes-ui.git
   cd recipes-ui
   ```
2. Use the recommended Node version (optional, if you use nvm)
   ```bash
   nvm use
   # or install if needed
   nvm install
   ```
3. Install dependencies
   ```bash
   npm install
   ```
4. Generate data and start the development server
   - First, generate the recipe data:
     ```bash
      npm run generate
     ```
   - Then start the development server (with HMR):
     ```bash
      npm run start
     ```
     By default the app serves on http://localhost:3000. You can override the host/port via environment variables when starting:
   ```bash
    PORT=4000 HOST=127.0.0.1 npm run start
   ```

## Scripts

- `npm run start` – Run webpack-dev-server with hot reload
- `npm run watch` – Rebuild on file changes (without dev server)
- `npm run generate` – Generate static data from recipes-md repository (creates `src/generated/recipes.json` and `src/generated/meta.json`)
- `npm run build` – Create a production build in `dist/` (automatically runs generation first)
- `npm run clean` – Remove generated files and build output (`src/generated/` and `dist/`)
- `npm run check` – Run typecheck, lint, and format check (used in CI)
- `npm test` – Run the Jest test suite once
- `npm run audit` – Audit production dependencies
- `npm run deploy` – Manually publish `dist/` to the `gh-pages` branch (the automated deployment does not use this script)

## Building for production

```bash
npm run build
```

The `npm run build` command automatically generates static data from the recipes-md repository and then creates an optimized production build. The static assets will be emitted to `dist/`. Serve that folder with any static file server. Pre-rendered static pages are under `dist/static/`.

**Note:** You don't need to run `npm run generate` manually before building - the build process handles this automatically.

## Deployment

This repo uses GitHub Actions to build and deploy automatically:

- **Build workflow**: `.github/workflows/build.yml` - Runs on pull requests to validate builds
- **Deploy workflow**: `.github/workflows/deploy.yml` - Runs on pushes to `main` and deploys to GitHub Pages
- The deploy workflow runs `npm run build`, uploads `dist/` as a Pages artifact with `actions/upload-pages-artifact`, and deploys that artifact with `actions/deploy-pages`

The deployment process includes:

1. Build validation (typecheck, lint, format check) and tests
2. Production build with static data generation
3. Upload `dist/` to GitHub Pages artifact storage
4. Deploy the artifact to the `github-pages` environment

You can also deploy locally (requires push access):

```bash
npm run build
npm run deploy
```

## Configuration and environment

- Routing uses `react-router-dom` v7. The development server uses `historyApiFallback` for local deep links. In production, GitHub Pages serves `404.html`, which redirects an unknown path into a query-string route that `public/index.html` restores before React Router starts.
- `webpack.config.ts` reads `HOST` and `PORT` from the environment if set.
- Static data generation and prerender: At build time, a script fetches recipe metadata and markdown from the recipes-md repo and writes `src/generated/recipes.json` plus `src/generated/meta.json` (tracked upstream SHAs used for incremental builds). When `meta.json` is missing or invalid, generation uses the initial recipes-md commit as the base for the compare API so the diff covers the full repo history. Then, the script uses React SSR (react-dom/server + StaticRouter) to prerender the real app UI to static HTML under `src/generated/static/` (copied to `dist/static/`). The `/static` site is explicitly for no-JavaScript browsers to degrade gracefully, while the SPA continues to work normally.
  - Optional token: To avoid rate limits during generation, set `GITHUB_TOKEN` (or `GH_TOKEN` / `RECIPES_GITHUB_TOKEN`) in your environment.
  - Incremental: The generator checks latest upstream commit SHAs for `recipes/` and `images/` paths and skips regeneration when unchanged (but still refreshes prerendered HTML from local data).

## Project structure

```
src/
  components/        # Reusable UI building blocks
  layouts/           # Route-level screens (recipes list, recipe detail, error)
  services/          # Data fetching and business logic
  util/              # Helper utilities
  index.tsx          # App entry; sets up router
  App.tsx            # Root component
  routes.tsx         # Route definitions
```

## Linting and formatting

- ESLint and Prettier are configured. Example commands:
  ```bash
  npx eslint src --ext .ts,.tsx
  npx prettier --check .
  npx prettier --write .
  ```

## Common warnings

- Browserslist: caniuse-lite is outdated – this is informational. Update the local DB:
  ```bash
  npx update-browserslist-db@latest
  ```
- Sass deprecations from Bootstrap – warnings about abs(), percentage units, or unitless values come from Bootstrap’s SCSS. They don’t break the build. They’ll be resolved in future Bootstrap releases. You can ignore them during development.

## Troubleshooting

- Port already in use: set a different `PORT` when starting, e.g. `PORT=4001 npm run start`.
- Blank page on refresh in production: confirm the Pages deployment includes both `dist/404.html` and the route-restoration script in `dist/index.html`.

---

Questions or issues? Please open an issue or a pull request.
