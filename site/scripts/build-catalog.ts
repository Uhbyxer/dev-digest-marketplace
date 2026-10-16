/**
 * Build-time indexer. Walks the marketplace repository and writes public/catalog.json.
 *
 *   tsx scripts/build-catalog.ts [--root <repo>] [--out <file>] [--no-network]
 *
 * Fails (non-zero exit) on malformed frontmatter or JSON so a broken plugin never ships to the site.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import type { Artifact, ArtifactType, Capability, Catalog, Plugin, Release, Risk } from '../src/types';

const BODY_CAP = 20_000;
const NEW_DAYS = 30;
const DEFAULT_REPO = 'Uhbyxer/dev-digest-marketplace';

// ---------- small helpers ----------

function git(root: string, args: string[]): string {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

function readJson(path: string): any {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    throw new Error(`Invalid JSON in ${path}: ${(e as Error).message}`);
  }
}

export function splitFrontmatter(text: string, path: string): { data: Record<string, any>; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!m) return { data: {}, body: text };
  try {
    const data = parseYaml(m[1]);
    return { data: data && typeof data === 'object' ? (data as Record<string, any>) : {}, body: m[2] };
  } catch (e) {
    throw new Error(`Invalid frontmatter in ${path}: ${(e as Error).message}`);
  }
}

/** Split "Bash(git diff:*), Read" on commas that are not inside parentheses. */
export function splitTools(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value !== 'string') return [];
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of value) {
    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === ',' && depth === 0) {
      out.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  out.push(cur.trim());
  return out.filter(Boolean);
}

export function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```\w*/g, ''))
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/[*_~>]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, BODY_CAP);
}

const kebab = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const uniq = <T>(xs: T[]) => [...new Set(xs)];

export function compareSemver(a: string, b: string): number {
  const pa = a.split(/[.-]/).map((x) => parseInt(x, 10) || 0);
  const pb = b.split(/[.-]/).map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  return 0;
}

// ---------- risk rules (documented in docs/specs/UI-CATALOG-SPEC.md §7.4) ----------

const WRITE_TOOL = /^(Write|Edit|MultiEdit|NotebookEdit|Bash)/;

export function artifactRisk(type: ArtifactType, tools: string[]): Risk {
  if (type === 'hook' || type === 'mcp') return 'high';
  return tools.some((t) => WRITE_TOOL.test(t)) ? 'medium' : 'low';
}

export function pluginRisk(risks: Risk[], hasScripts: boolean): Risk {
  if (hasScripts || risks.includes('high')) return 'high';
  return risks.includes('medium') ? 'medium' : 'low';
}

// ---------- plugin scanning ----------

function listFiles(dir: string, ext?: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => !ext || f.endsWith(ext))
    .sort()
    .map((f) => join(dir, f));
}

function listDirs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => statSync(join(dir, f)).isDirectory())
    .sort()
    .map((f) => join(dir, f));
}

function findExecutables(dir: string, root: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir).sort()) {
    if (name === '.git' || name === 'node_modules') continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) findExecutables(p, root, acc);
    else if (st.mode & 0o111) acc.push(relative(root, p));
  }
  return acc;
}

interface Ctx {
  root: string;
  now: Date;
}

function lastModified(ctx: Ctx, file: string): string {
  const iso = git(ctx.root, ['log', '-1', '--format=%cI', '--', file]);
  return iso || statSync(file).mtime.toISOString();
}

function isRecent(ctx: Ctx, iso: string | null): boolean {
  if (!iso) return false;
  return ctx.now.getTime() - new Date(iso).getTime() < NEW_DAYS * 86_400_000;
}

function buildArtifact(
  ctx: Ctx,
  pluginId: string,
  pluginKeywords: string[],
  a: { type: ArtifactType; name: string; description: string; fmKeywords?: string[]; tools: string[]; markdown: string; file: string; addedAt?: string | null },
): Artifact {
  const keywords = uniq(
    [...(a.fmKeywords ?? []), ...pluginKeywords, ...a.name.split('-')]
      .map((k) => String(k).trim().toLowerCase())
      .filter((k) => k.length > 1),
  );
  return {
    id: `${pluginId}/${a.type}/${a.name}`,
    type: a.type,
    name: a.name,
    plugin: pluginId,
    description: a.description,
    keywords,
    body: stripMarkdown(a.markdown),
    bodyMarkdown: a.markdown.trim(),
    path: relative(ctx.root, a.file),
    lastModified: lastModified(ctx, a.file),
    tools: a.tools,
    risk: artifactRisk(a.type, a.tools),
  };
}

function scanMarkdownArtifact(ctx: Ctx, pluginId: string, kw: string[], type: ArtifactType, file: string, fallbackName: string): Artifact {
  const { data, body } = splitFrontmatter(readFileSync(file, 'utf8'), relative(ctx.root, file));
  const fm = (data.keywords ?? data.tags) as unknown;
  return buildArtifact(ctx, pluginId, kw, {
    type,
    name: String(data.name ?? fallbackName),
    description: String(data.description ?? '').trim(),
    fmKeywords: Array.isArray(fm) ? fm.map(String) : typeof fm === 'string' ? fm.split(',') : [],
    tools: splitTools(data['allowed-tools'] ?? data.tools),
    markdown: body,
    file,
  });
}

function scanHooks(ctx: Ctx, pluginId: string, kw: string[], file: string): Artifact[] {
  const data = readJson(file);
  const hooks = data.hooks ?? data;
  const seen = new Map<string, number>();
  const out: Artifact[] = [];
  for (const [event, groups] of Object.entries<any>(hooks)) {
    if (!Array.isArray(groups)) continue;
    for (const group of groups) {
      const matcher: string = group.matcher ?? '';
      for (const h of group.hooks ?? []) {
        const command = h.command ?? h.prompt ?? h.url ?? JSON.stringify(h);
        const base = kebab(`${event}-${matcher || 'all'}`);
        const n = (seen.get(base) ?? 0) + 1;
        seen.set(base, n);
        out.push(
          buildArtifact(ctx, pluginId, kw, {
            type: 'hook',
            name: n > 1 ? `${base}-${n}` : base,
            description: `Runs on ${event}${matcher ? ` for ${matcher}` : ''}.`,
            tools: [],
            markdown: `Event: ${event}${matcher ? ` (${matcher})` : ''}\nCommand: ${command}`,
            file,
          }),
        );
      }
    }
  }
  return out;
}

function scanMcp(ctx: Ctx, pluginId: string, kw: string[], file: string, data: any): Artifact[] {
  const servers = data.mcpServers ?? data;
  const out: Artifact[] = [];
  for (const [name, cfg] of Object.entries<any>(servers)) {
    if (!cfg || typeof cfg !== 'object') continue;
    const transport = cfg.type ?? (cfg.url ? 'http' : 'stdio');
    // Never index env values: they may hold secrets.
    const target = cfg.url ? `URL: ${cfg.url}` : `Command: ${[cfg.command, ...(cfg.args ?? [])].filter(Boolean).join(' ')}`;
    out.push(
      buildArtifact(ctx, pluginId, kw, {
        type: 'mcp',
        name,
        description: `MCP server (${transport}).`,
        tools: [],
        markdown: `Transport: ${transport}\n${target}`,
        file,
      }),
    );
  }
  return out;
}

// ---------- releases ----------

export function parseChangelog(text: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  let cur: string[] | null = null;
  for (const line of text.split(/\r?\n/)) {
    const h = /^##\s+\[?v?(\d+\.\d+\.\d+[^\]\s]*)\]?/.exec(line);
    if (h) {
      cur = [];
      map.set(h[1], cur);
      continue;
    }
    const b = /^\s*[-*]\s+(.*\S)/.exec(line);
    if (b && cur) cur.push(b[1]);
  }
  return map;
}

function scanReleases(ctx: Ctx, pluginId: string, dir: string): Release[] {
  const raw = git(ctx.root, ['tag', '--list', `${pluginId}--v*`, '--format=%(refname:short)|%(creatordate:short)']);
  if (!raw) return [];
  const tags = raw
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      const [tag, date] = l.split('|');
      return { tag, version: tag.slice(`${pluginId}--v`.length), date };
    })
    .sort((a, b) => compareSemver(a.version, b.version));
  const changelogPath = join(dir, 'CHANGELOG.md');
  const changelog = existsSync(changelogPath) ? parseChangelog(readFileSync(changelogPath, 'utf8')) : new Map<string, string[]>();
  const rel = relative(ctx.root, dir);
  return tags
    .map((t, i) => {
      let notes = changelog.get(t.version) ?? [];
      if (!notes.length) {
        const range = i === 0 ? t.tag : `${tags[i - 1].tag}..${t.tag}`;
        notes = git(ctx.root, ['log', '--format=%s', range, '--', rel])
          .split('\n')
          .filter((s) => s && !/^release\(/.test(s));
      }
      return { version: t.version, tag: t.tag, date: t.date, notes: notes.slice(0, 8) };
    })
    .reverse();
}

// ---------- repo slug / popularity ----------

export function repoSlug(root: string): string {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;
  const url = git(root, ['remote', 'get-url', 'origin']);
  const m = /github\.com[:/]([^/]+\/[^/.]+?)(?:\.git)?$/.exec(url);
  return m ? m[1] : DEFAULT_REPO;
}

async function fetchStars(repo: string): Promise<number | null> {
  try {
    const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'User-Agent': 'dev-digest-catalog' };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const res = await fetch(`https://api.github.com/repos/${repo}`, { headers, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const json = (await res.json()) as { stargazers_count?: number };
    return typeof json.stargazers_count === 'number' ? json.stargazers_count : null;
  } catch {
    return null;
  }
}

// ---------- main build ----------

export function buildCatalog(opts: { root: string; now?: Date; repo?: string }): Catalog {
  const root = resolve(opts.root);
  const ctx: Ctx = { root, now: opts.now ?? new Date() };
  const marketplace = readJson(join(root, '.claude-plugin', 'marketplace.json'));
  const mpName: string = marketplace.name;
  const repo = opts.repo ?? repoSlug(root);

  const plugins: Plugin[] = [];
  const artifacts: Artifact[] = [];

  for (const entry of marketplace.plugins ?? []) {
    if (typeof entry.source !== 'string') {
      console.warn(`skip ${entry.name}: non-local source is not indexed`);
      continue;
    }
    const dir = resolve(root, entry.source);
    if (!existsSync(dir)) throw new Error(`Plugin ${entry.name}: source ${entry.source} does not exist`);
    const manifestPath = join(dir, '.claude-plugin', 'plugin.json');
    const manifest = existsSync(manifestPath) ? readJson(manifestPath) : {};
    const id: string = entry.name;
    const keywords: string[] = uniq([...(manifest.keywords ?? []), ...(entry.keywords ?? [])].map(String));

    const mine: Artifact[] = [];
    for (const d of listDirs(join(dir, 'skills'))) {
      const f = join(d, 'SKILL.md');
      if (existsSync(f)) mine.push(scanMarkdownArtifact(ctx, id, keywords, 'skill', f, d.split('/').pop()!));
    }
    for (const f of listFiles(join(dir, 'agents'), '.md')) mine.push(scanMarkdownArtifact(ctx, id, keywords, 'agent', f, f.split('/').pop()!.replace(/\.md$/, '')));
    for (const f of listFiles(join(dir, 'commands'), '.md')) mine.push(scanMarkdownArtifact(ctx, id, keywords, 'command', f, f.split('/').pop()!.replace(/\.md$/, '')));
    const hooksFile = join(dir, 'hooks', 'hooks.json');
    if (existsSync(hooksFile)) mine.push(...scanHooks(ctx, id, keywords, hooksFile));
    const mcpFile = join(dir, '.mcp.json');
    if (existsSync(mcpFile)) mine.push(...scanMcp(ctx, id, keywords, mcpFile, readJson(mcpFile)));
    else if (manifest.mcpServers && typeof manifest.mcpServers === 'object') mine.push(...scanMcp(ctx, id, keywords, manifestPath, manifest));

    // Capabilities (what the plugin can do), for the Permissions tab.
    const capabilities: Capability[] = [];
    for (const a of mine) {
      if (a.tools.length) capabilities.push({ kind: `Tools · ${a.type} ${a.name}`, text: a.tools.join(', '), src: a.path });
      if (a.type === 'hook') capabilities.push({ kind: 'Hook', text: a.bodyMarkdown, src: a.path });
      if (a.type === 'mcp') capabilities.push({ kind: 'MCP server', text: a.bodyMarkdown, src: a.path });
    }
    const scripts = findExecutables(dir, root);
    for (const s of scripts) capabilities.push({ kind: 'Script', text: 'Executable file shipped with the plugin', src: s });

    const rel = relative(root, dir);
    const addedAt = git(root, ['log', '--diff-filter=A', '--format=%cI', '--', rel]).split('\n').filter(Boolean).pop() ?? null;
    const since = new Date(ctx.now.getTime() - 90 * 86_400_000).toISOString();
    const activity = parseInt(git(root, ['rev-list', '--count', `--since=${since}`, 'HEAD', '--', rel]) || '0', 10);

    const counts: Record<ArtifactType, number> = { skill: 0, agent: 0, command: 0, hook: 0, mcp: 0 };
    for (const a of mine) counts[a.type]++;

    plugins.push({
      id,
      description: String(manifest.description ?? entry.description ?? ''),
      version: manifest.version ?? entry.version ?? null,
      author: manifest.author?.name ?? marketplace.owner?.name ?? null,
      category: entry.category ?? null,
      keywords,
      path: rel,
      addedAt,
      isNew: isRecent(ctx, addedAt),
      activity90d: activity,
      artifactCounts: counts,
      releases: scanReleases(ctx, id, dir),
      permissions: { risk: pluginRisk(mine.map((a) => a.risk), scripts.length > 0), capabilities },
      installCommands: [`/plugin marketplace add ${repo}`, `/plugin install ${id}@${mpName}`],
    });
    artifacts.push(...mine);
  }

  plugins.sort((a, b) => a.id.localeCompare(b.id));
  artifacts.sort((a, b) => a.id.localeCompare(b.id));

  return {
    generatedAt: ctx.now.toISOString(),
    commit: git(root, ['rev-parse', '--short', 'HEAD']) || 'unknown',
    marketplace: { name: mpName, owner: marketplace.owner?.name ?? '', repo },
    popularity: { stars: null, fetchedAt: null },
    plugins,
    artifacts,
  };
}

// ---------- CLI ----------

async function main() {
  const args = process.argv.slice(2);
  const arg = (name: string) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const here = dirname(fileURLToPath(import.meta.url));
  const root = resolve(arg('--root') ?? join(here, '..', '..'));
  const out = resolve(arg('--out') ?? join(here, '..', 'public', 'catalog.json'));

  const catalog = buildCatalog({ root });
  if (!args.includes('--no-network')) {
    const stars = await fetchStars(catalog.marketplace.repo);
    if (stars !== null) catalog.popularity = { stars, fetchedAt: new Date().toISOString() };
  }
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(catalog));
  console.log(`catalog: ${catalog.plugins.length} plugins, ${catalog.artifacts.length} artifacts -> ${relative(process.cwd(), out)}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e.message ?? e);
    process.exit(1);
  });
}
