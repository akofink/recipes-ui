# Recipes React UI

Live site: https://recipes.akofink.com

A React + TypeScript single-page app built with Vite and deployed to GitHub Pages. Recipe content is sourced from the public repository https://github.com/akofink/recipes-md.

## Prerequisites

- Node.js LTS. This repo includes an `.nvmrc`; if you use `nvm`, run `nvm use`.
- pnpm, pinned in `package.json` through the `packageManager` field. Commit dependency changes through `pnpm-lock.yaml`.
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
    pnpm install
   ```
4. Generate data and start the development server
   - First, generate the recipe data:
     ```bash
       pnpm run generate
     ```
   - Then start the development server (with HMR):
     ```bash
     pnpm run start
     ```
     By default the app serves on http://localhost:3000. You can override the host/port via environment variables when starting:
   ```bash
    PORT=4000 HOST=127.0.0.1 pnpm run start
   ```

## Scripts

- `pnpm run start` – Run the Vite dev server with HMR
- `pnpm run watch` – Rebuild on file changes (without dev server)
- `pnpm run generate` – Generate static data from recipes-md repository (creates `src/generated/recipes.json` and `src/generated/meta.json`)
- `pnpm run build` – Create a production build in `dist/` (automatically runs generation first)
- `pnpm run clean` – Remove generated files and build output (`src/generated/` and `dist/`)
- `pnpm run check` – Run typecheck, lint, and format check (used in CI)
- `pnpm test` – Run the Jest test suite once
- `pnpm run audit` – Audit production dependencies
- `pnpm run deploy` – Manually publish `dist/` to the `gh-pages` branch (the automated deployment does not use this script)

## Building for production

```bash
pnpm run build
```

The `pnpm run build` command automatically generates static data from the recipes-md repository and then creates an optimized production build. The static assets will be emitted to `dist/`. Serve that folder with any static file server. Pre-rendered static pages are under `dist/static/`.

**Note:** You don't need to run `pnpm run generate` manually before building - the build process handles this automatically.

## Deployment

This repo uses GitHub Actions to build and deploy automatically:

- **Build workflow**: `.github/workflows/build.yml` - Runs on pull requests to validate builds
- **Deploy workflow**: `.github/workflows/deploy.yml` - Runs on pushes to `main` and deploys to GitHub Pages
- The deploy workflow runs `pnpm run build`, uploads `dist/` as a Pages artifact with `actions/upload-pages-artifact`, and deploys that artifact with `actions/deploy-pages`

The deployment process includes:

1. Build validation (typecheck, lint, format check) and tests
2. Production build with static data generation
3. Upload `dist/` to GitHub Pages artifact storage
4. Deploy the artifact to the `github-pages` environment

You can also deploy locally (requires push access):

```bash
pnpm run build
pnpm run deploy
```

## Configuration and environment

- Routing uses `react-router-dom` v7. Vite serves the SPA fallback for local deep links. In production, GitHub Pages serves `404.html`, which redirects an unknown path into a query-string route that `index.html` restores before React Router starts.
- `vite.config.mts` reads `HOST` and `PORT` from the environment if set.
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
   pnpm exec eslint src --ext .ts,.tsx
   pnpm exec prettier --check .
   pnpm exec prettier --write .
  ```

## Common warnings

- Browserslist: caniuse-lite is outdated – this is informational. Update the local DB:
  ```bash
   pnpm dlx update-browserslist-db@latest
  ```
- Sass deprecations from Bootstrap – warnings about abs(), percentage units, or unitless values come from Bootstrap’s SCSS. They don’t break the build. They’ll be resolved in future Bootstrap releases. You can ignore them during development.

## Troubleshooting

- Port already in use: set a different `PORT` when starting, e.g. `PORT=4001 pnpm run start`.
- Blank page on refresh in production: confirm the Pages deployment includes both `dist/404.html` and the route-restoration script in `dist/index.html`.

---

Questions or issues? Please open an issue or a pull request.
