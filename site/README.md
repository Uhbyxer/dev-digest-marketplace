# Catalog site

Static search UI for the marketplace, published to GitHub Pages at
<https://uhbyxer.github.io/dev-digest-marketplace/>. It lives in `site/` so it stays separate from the
marketplace itself (`plugins/`, `.claude-plugin/`). Spec: [`docs/specs/UI-CATALOG-SPEC.md`](../docs/specs/UI-CATALOG-SPEC.md).

Stack: React 18 + Vite + TypeScript, MiniSearch for client-side search, hash routing (Pages has no SPA fallback).

## How it works

1. `scripts/build-catalog.ts` walks the repo (`marketplace.json`, `plugin.json`, skills, agents, commands,
   hooks, MCP, git tags/dates) and writes `public/catalog.json`. It fails on malformed frontmatter or JSON.
2. The app loads `catalog.json` and builds the search index in the browser. No backend.
3. `.github/workflows/pages.yml` builds and deploys on every push to `main` that touches the site or plugins.

## Develop

```bash
cd site
npm ci
npm run dev          # indexes the repo (offline), starts Vite at http://localhost:5173/dev-digest-marketplace/
npm test             # indexer, search, scaffold unit tests
npm run e2e          # Playwright smoke tests against a fixture catalog (npx playwright install chromium first)
npm run build        # catalog + typecheck + production build into dist/
npm run preview      # serve dist/ at http://localhost:4173/dev-digest-marketplace/
```

`npm run dev` and `npm run build` re-run the indexer, so new plugins show up without extra steps.

## Hosting on GitHub Pages

- One-time: repository **Settings → Pages → Build and deployment → Source: GitHub Actions**.
- The site is served from `/<repo>/`, so Vite's `base` is `/dev-digest-marketplace/`. For a fork or a custom
  domain set `SITE_BASE` (for example `SITE_BASE=/ npm run build`).
- Routes use `#/...` so deep links work without server rewrites.

## Layout

```
scripts/build-catalog.ts   indexer (+ tests, fixture)
src/search/                query parser, synonyms.json, MiniSearch engine
src/routes/                Home, Plugin, Artifact, WhatsNew, Compare, Contribute
src/lib/                   router, app state, scaffold generator, zip writer, GitHub star refresh
e2e/                       Playwright smoke tests
```

To teach search a new synonym group, add it to `src/search/synonyms.json`.
