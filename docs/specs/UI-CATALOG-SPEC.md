# UI Catalog Specification

Status: Implemented in `site/` (see `site/README.md`) · Target: GitHub Pages (`https://uhbyxer.github.io/dev-digest-marketplace/`)

## 1. Goal

A static web catalog for this marketplace. Users search everything in the
repository (plugins, skills, agents, commands, hooks, MCP servers) with
free-text queries such as "I need a skill for code review" and get matching
artifacts as cards. Beyond search, the site helps users choose, install, trust
and track plugins.

## 2. Constraints and decisions

| Topic | Decision |
| :- | :- |
| Hosting | GitHub Pages, public repo, no backend |
| Language | English only (UI and search) |
| Stack | React + Vite + TypeScript |
| Routing | Hash routing (`/#/...`); Pages has no SPA fallback |
| Base path | `/dev-digest-marketplace/` (Vite `base`) |
| Data source | The repo itself, indexed at build time |
| Runtime network | Only the GitHub REST API, unauthenticated, optional (see 7.3) |
| User state | `localStorage` only, never required for core flows |

Non-goals (v1): accounts, ratings/comments, telemetry, semantic/embedding
search, server-side anything.

## 3. Scope

**Core**: indexer, search with cards and filters, artifact detail page,
copy-to-clipboard install commands, deploy pipeline.

**Medium-complexity features** (in scope):

1. What's new / changelog (7.1)
2. Compare plugins (7.2)
3. Popularity counters from GitHub (7.3)
4. Security and permissions transparency (7.4)
5. Contributor scaffolding tool (7.5)

Out of scope for now (low-complexity ideas, candidates for later): bundles/cart,
favorites, PWA/offline, `llms.txt`/RSS.

## 4. Build-time indexer

A script `site/scripts/build-catalog.ts` (TypeScript, run with `tsx`) walks the repo and
writes `site/public/catalog.json`. It runs in CI and locally via
`npm run catalog` (`catalog:offline` skips the GitHub call). It fails the build on malformed frontmatter or JSON.
Hooks are indexed one artifact per hook entry, named `<event>-<matcher>`; MCP env values are never indexed.

### 4.1 Inputs

- `.claude-plugin/marketplace.json`: marketplace name, owner, plugin list,
  `category`, `source`.
- `plugins/<name>/.claude-plugin/plugin.json`: description, author, `version`,
  keywords if present.
- `plugins/<name>/skills/*/SKILL.md`: YAML frontmatter (`name`, `description`,
  `allowed-tools` if present) plus Markdown body.
- `plugins/<name>/agents/*.md`, `commands/*.md`: frontmatter plus body.
- `plugins/<name>/hooks/hooks.json`, `.mcp.json`: parsed into hook/MCP entries.
- Git data (`git log`, `git tag`): last-modified date per artifact; release tags
  in the `<plugin>--v<version>` format (see `docs/RELEASES.md`).
- `plugins/<name>/CHANGELOG.md` if present; otherwise commit subjects touching
  the plugin directory, grouped by release tag.

### 4.2 Output schema (`catalog.json`)

```ts
interface Catalog {
  generatedAt: string;               // ISO 8601
  commit: string;                    // short SHA
  popularity: { stars: number | null; fetchedAt: string | null }; // see 7.3
  marketplace: { name: string; owner: string; repo: string }; // repo: "Uhbyxer/dev-digest-marketplace"
  plugins: Plugin[];
  artifacts: Artifact[];             // flat list, one search document each
}

interface Plugin {
  id: string;                        // plugin name
  description: string;
  version: string | null;
  author: string | null;
  category: string | null;
  keywords: string[];
  path: string;                      // repo-relative
  artifactCounts: Record<ArtifactType, number>;
  addedAt: string | null;           // first commit touching the plugin
  isNew: boolean;                    // added within the last 30 days
  activity90d: number;               // commits touching the plugin in the last 90 days
  releases: Release[];               // newest first
  permissions: Permissions;          // see 7.4
  installCommands: string[];
}

type ArtifactType = 'skill' | 'agent' | 'command' | 'hook' | 'mcp';

interface Artifact {
  id: string;                        // "<plugin>/<type>/<name>"
  type: ArtifactType;
  name: string;
  plugin: string;
  description: string;
  keywords: string[];                // frontmatter + derived tags
  body: string;                      // plain text, Markdown stripped, capped at 20 KB
  bodyMarkdown: string;              // raw, for the detail page
  path: string;
  lastModified: string;
  tools: string[];                   // allowed-tools / declared tools
  risk: 'low' | 'medium' | 'high';   // see 7.4
}

interface Release { version: string; tag: string; date: string; notes: string[] }
```

### 4.3 Rules

- Output is deterministic (sorted keys and lists) so diffs are reviewable.
- Missing optional fields are `null` or `[]`, never omitted.
- Target size: `catalog.json` under 1 MB gzipped. If exceeded, move `body` into
  per-plugin shard files loaded on demand.

## 5. Search

Library: MiniSearch (client-side), index built in the browser from
`catalog.json` on load (target < 200 ms for 1,000 artifacts).

- **Fields and boosts**: `name` x5, `keywords` x3, `description` x2, `plugin` x1.5,
  `body` x1.
- **Matching**: prefix and fuzzy (edit distance 0.2), OR across terms with a
  score bonus for AND matches.
- **Natural-language queries**: lowercase, strip English stop words and filler
  phrases ("I need", "a skill for", "something to", "how do I"), then apply the
  synonym map. The detected artifact type words ("skill", "agent", "command",
  "hook") are lifted into a type filter suggestion rather than searched as terms.
- **Synonyms**: `src/search/synonyms.json`, bidirectional groups, e.g.
  `["review","code review","pr review"]`, `["test","testing","unit test"]`,
  `["docs","documentation","readme"]`. Contributors extend it by PR.
- **Empty query**: show all artifacts, sorted by recently modified.
- **No results**: show "No matches" with the stripped terms, nearest suggestions
  (lowest-edit-distance names), and a link to the contributor tool (7.5).
- **Highlighting**: matched terms highlighted in name and description.
- Search is debounced at 120 ms and never blocks typing.

## 6. UI

### 6.1 Routes

| Route | View |
| :- | :- |
| `#/` | Search home: search box, filters, card grid |
| `#/plugin/:name` | Plugin page: overview, artifacts, install, permissions, changelog |
| `#/artifact/:plugin/:type/:name` | Artifact detail: rendered Markdown, metadata, source link |
| `#/whats-new` | Changelog feed (7.1) |
| `#/compare?a=:p1&b=:p2&c=:p3` | Comparison (7.2) |
| `#/contribute` | Scaffolding tool (7.5) |

Search state lives in the URL: `#/?q=review&type=skill&plugin=x&sort=relevance`.
All views are shareable by URL.

### 6.2 Card

Shows: type badge, name, description (3 lines, clamped), owner plugin, version,
up to 3 keywords, permission risk badge (7.4), stars if available (7.3), and
actions **Copy install** and **Compare** (adds the owning plugin to the
comparison tray). Whole card links to the detail page.

### 6.3 Filters and sorting

Type (multi-select with counts), plugin, category, keyword. Sort: relevance
(default when a query exists), recently updated, name. Counts update live.

### 6.4 Install commands

Per plugin, with one-click copy:

```
/plugin marketplace add Uhbyxer/dev-digest-marketplace
/plugin install <plugin>@dev-digest-marketplace
```

### 6.5 Non-functional

- Responsive down to 360 px; light and dark themes via `prefers-color-scheme`.
- Accessibility: WCAG 2.1 AA, full keyboard use, `/` focuses search, visible
  focus, ARIA live region announcing result counts.
- Performance: Lighthouse performance >= 90, initial JS < 200 KB gzipped
  (Markdown renderer lazy-loaded on detail pages).
- Markdown from the repo is sanitized (DOMPurify) before rendering; no raw HTML
  or scripts from content are executed.

## 7. Features

### 7.1 What's new / changelog

- Feed of releases across all plugins, newest first, built from `Plugin.releases`
  (tags + `CHANGELOG.md` or commit subjects).
- Filter by plugin; badge for "new plugin" and "new artifact" (first appearance
  within the last 30 days, from git history).
- Per-plugin changelog tab on the plugin page.
- Acceptance: a release made via `scripts/release.sh` appears on the site after
  the next deploy with correct version, date and notes.

### 7.2 Compare plugins

- Select 2-3 plugins from cards, plugin pages, or the URL.
- Side-by-side table: description, version, author, category, artifact counts by
  type, list of skills/agents/commands, tools/permissions, last release date,
  stars. Differences between columns are highlighted; a toggle hides identical
  rows.
- Comparison tray persists across routes in the session; selection is encoded in
  the URL for sharing.
- Acceptance: with 3 plugins selected the page remains usable at 360 px
  (horizontal scroll inside the table only).

### 7.3 Popularity counters (GitHub API)

- Source: `GET https://api.github.com/repos/Uhbyxer/dev-digest-marketplace`
  (stars, last push) and `/releases` / tags. Unauthenticated, rate limit 60/h per
  IP.
- Also fetched at build time by the indexer (using `GITHUB_TOKEN` in CI) and
  stored in `catalog.json` under `popularity`, so the site shows data with no runtime call. The
  runtime call is an optional refresh, cached in `localStorage` for 1 hour.
- Per-plugin numbers are limited to what git provides without a backend: release
  count, last release date, commit count in the plugin directory over the last
  90 days ("activity"). Repo-level stars are shown in the header.
- Failure (rate limit, offline) degrades silently to build-time values; the UI
  never shows an error for this.

### 7.4 Security and permissions transparency

The indexer derives, per plugin and artifact, what it can do:

- Tools requested (`allowed-tools`, agent `tools`).
- Hooks: events and commands they run (shown verbatim).
- MCP servers: command or URL, and transport.
- Scripts shipped in the plugin (executable files).

A risk badge is computed by simple, documented rules:

| Level | Rule |
| :- | :- |
| Low | Only prompts (skills/commands/agents) with read-only tools or none |
| Medium | Requests write/edit tools or `Bash` |
| High | Includes hooks, MCP servers, or shipped executable scripts |

The plugin page lists each capability with the source file link. A note links to
`docs/SECURITY.md`. The badge is informational, not a security guarantee, and
the UI says so.

### 7.5 Contributor scaffolding tool

A form at `#/contribute`, running entirely in the browser:

- Inputs: plugin name (kebab-case), description, author, artifact type(s), per
  artifact name and description, optional tools.
- Output: file tree preview and generated `plugin.json`, `SKILL.md` /
  agent / command stubs, and the `marketplace.json` entry to add, each with a
  copy button, plus a ZIP download of the scaffold.
- Live validation mirroring `scripts/validate.sh` and
  `docs/PLUGIN-GUIDELINES.md` rules (naming, required frontmatter, no `version`
  in `marketplace.json`).
- Links to `CONTRIBUTING.md` and a prefilled "new PR" instruction. No data leaves
  the browser.

## 8. Repository layout

```
site/
  index.html
  vite.config.ts          # base: '/dev-digest-marketplace/'
  src/
    main.tsx, App.tsx, routes/
    components/           # Card, Filters, CompareTray, RiskBadge, ...
    search/               # engine.ts, queryParser.ts, synonyms.json
    lib/                  # catalog loader, clipboard, github
  public/catalog.json     # generated, git-ignored
  scripts/build-catalog.ts  # indexer, with unit tests and a fixture tree
  e2e/                      # Playwright smoke tests
docs/specs/UI-CATALOG-SPEC.md
.github/workflows/pages.yml
```

## 9. CI/CD

- `pages.yml`: on push to `main` that touches `site/`, `plugins/` or `.claude-plugin/` (and on
  manual dispatch): checkout with full history (`fetch-depth: 0`, required for tags and git dates),
  `npm ci`, unit tests, `npm run build` (indexer, typecheck, Vite), Playwright smoke tests, a clean
  rebuild, upload `site/dist` with `actions/upload-pages-artifact`, deploy with `actions/deploy-pages`.
  `scripts/validate.sh` is not repeated here; `validate.yml` already runs it on every push and PR.
- On pull requests: build and run all tests, no deploy.
- Rebuild is also triggered by release tags (`*--v*`) so the changelog updates.
- Repo setting required: Pages source set to "GitHub Actions".

## 10. Testing

- **Indexer**: unit tests with fixture plugins (valid, malformed frontmatter,
  missing optional files, hooks/MCP present).
- **Search**: table-driven tests of query parsing (stop words, synonyms, type
  detection) and ranking for a fixed fixture catalog (e.g. "I need a skill for
  code review" returns review skills first).
- **Components**: Vitest + Testing Library for cards, filters, compare table,
  risk badge rules.
- **E2E**: Playwright smoke tests: search to card to detail, URL state restore,
  copy install, compare 2 plugins, scaffold form validation.
- **Quality gates**: type check, lint, Lighthouse CI budgets (6.5).

## 11. Milestones

1. **M1 Core**: indexer, search, cards, filters, detail page, copy install, Pages
   deploy.
2. **M2 Trust and info**: security badges (7.4), popularity (7.3), what's new
   (7.1).
3. **M3 Decision and contribution**: compare (7.2), scaffolding tool (7.5).

## 12. Open questions

- Should search also index non-plugin docs (`docs/*.md`, `CONTRIBUTING.md`)? Proposed:
  yes, as a `doc` type in a later iteration.
- Custom domain, or keep the default `github.io` URL?
- Who owns the synonym map and how are new plugins' keywords reviewed
  (CODEOWNERS entry for `site/src/search/`)?
