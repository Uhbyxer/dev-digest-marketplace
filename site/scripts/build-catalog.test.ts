import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { artifactRisk, buildCatalog, parseChangelog, pluginRisk, splitFrontmatter, splitTools, stripMarkdown } from './build-catalog';
import { makeFixture } from './fixture';

describe('helpers', () => {
  it('splits tools on top-level commas only', () => {
    expect(splitTools('Read, Bash(git diff:*), Write')).toEqual(['Read', 'Bash(git diff:*)', 'Write']);
    expect(splitTools(['A', 'B'])).toEqual(['A', 'B']);
    expect(splitTools(undefined)).toEqual([]);
  });
  it('parses frontmatter and rejects malformed YAML', () => {
    expect(splitFrontmatter('---\nname: x\n---\nbody', 'f').data.name).toBe('x');
    expect(() => splitFrontmatter('---\nname: [oops\n---\nbody', 'f.md')).toThrow(/f\.md/);
  });
  it('strips markdown for search', () => {
    expect(stripMarkdown('# Hi\n\nSee [docs](http://x) and `code`.')).toBe('Hi See docs and code.');
  });
  it('parses changelog sections', () => {
    const m = parseChangelog('## [1.1.0] - 2026-01-01\n- Added x\n- Fixed y\n\n## 1.0.0\n* First');
    expect(m.get('1.1.0')).toEqual(['Added x', 'Fixed y']);
    expect(m.get('1.0.0')).toEqual(['First']);
  });
});

describe('risk rules', () => {
  it('rates artifacts', () => {
    expect(artifactRisk('skill', ['Read'])).toBe('low');
    expect(artifactRisk('skill', [])).toBe('low');
    expect(artifactRisk('skill', ['Bash(git diff:*)'])).toBe('medium');
    expect(artifactRisk('agent', ['Edit'])).toBe('medium');
    expect(artifactRisk('hook', [])).toBe('high');
    expect(artifactRisk('mcp', [])).toBe('high');
  });
  it('rates plugins, scripts force high', () => {
    expect(pluginRisk(['low'], false)).toBe('low');
    expect(pluginRisk(['low', 'medium'], false)).toBe('medium');
    expect(pluginRisk(['low'], true)).toBe('high');
  });
});

describe('buildCatalog', () => {
  const c = buildCatalog({ root: makeFixture(), now: new Date('2026-10-16T00:00:00Z'), repo: 'me/fx' });
  const art = (id: string) => c.artifacts.find((a) => a.id === id)!;

  it('indexes every artifact type, sorted', () => {
    expect(c.artifacts.map((a) => a.id)).toEqual([
      'ops-kit/hook/posttooluse-edit-write',
      'ops-kit/hook/posttooluse-edit-write-2',
      'ops-kit/mcp/pg',
      'review-kit/agent/security-reviewer',
      'review-kit/command/review-pr',
      'review-kit/skill/pr-review',
    ]);
  });
  it('reads frontmatter, tools and derived keywords', () => {
    const a = art('review-kit/skill/pr-review');
    expect(a.tools).toEqual(['Read', 'Grep']);
    expect(a.keywords).toEqual(expect.arrayContaining(['review', 'pr']));
    expect(a.body).toContain('Walk the diff file by file. See docs.');
    expect(art('review-kit/agent/security-reviewer').description).toBe('Audits a diff: injection, secrets');
    expect(art('review-kit/command/review-pr').name).toBe('review-pr');
  });
  it('never indexes MCP env values', () => {
    expect(JSON.stringify(art('ops-kit/mcp/pg'))).not.toContain('secret');
    expect(art('ops-kit/mcp/pg').bodyMarkdown).toBe('Transport: stdio\nCommand: npx -y pg-ro');
  });
  it('computes plugin risk, capabilities and install commands', () => {
    const ops = c.plugins.find((p) => p.id === 'ops-kit')!;
    const rk = c.plugins.find((p) => p.id === 'review-kit')!;
    expect(ops.permissions.risk).toBe('high');
    expect(ops.permissions.capabilities.some((x) => x.kind === 'Script' && x.src.endsWith('run.sh'))).toBe(true);
    expect(rk.permissions.risk).toBe('medium');
    expect(rk.version).toBe('1.2.0');
    expect(rk.artifactCounts).toMatchObject({ skill: 1, agent: 1, command: 1, hook: 0 });
    expect(rk.installCommands).toEqual(['/plugin marketplace add me/fx', '/plugin install review-kit@fx']);
  });
  it('is deterministic apart from timestamps', () => {
    const again = buildCatalog({ root: makeFixture(), now: new Date('2026-10-16T00:00:00Z'), repo: 'me/fx' });
    const strip = (x: typeof c) => JSON.stringify({ ...x, commit: '' }).replace(/"lastModified":"[^"]*"/g, '');
    expect(strip(again)).toBe(strip(c));
  });
  it('fails on malformed JSON', () => {
    const root = makeFixture();
    writeFileSync(join(root, 'plugins/ops-kit/.mcp.json'), '{nope');
    expect(() => buildCatalog({ root, repo: 'me/fx' })).toThrow(/\.mcp\.json/);
  });
});
