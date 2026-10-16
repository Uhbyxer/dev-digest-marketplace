import { describe, expect, it } from 'vitest';
import { parseQuery } from '../search/queryParser';
import { buildEngine, highlight, search, suggest } from '../search/engine';
import { buildCatalog } from '../../scripts/build-catalog';
import { makeFixture } from '../../scripts/fixture';

describe('parseQuery', () => {
  it('strips filler and stop words', () => {
    expect(parseQuery('I need a skill for code review').words).toEqual(['code', 'review']);
    expect(parseQuery('looking for something to test').words).toEqual(['test']);
  });
  it('lifts the artifact type into a hint', () => {
    expect(parseQuery('agents for security').hint).toBe('agent');
    expect(parseQuery('I need a skill for code review').hint).toBe('skill');
    expect(parseQuery('an agent that audits').hint).toBe('agent');
    expect(parseQuery('a skill for').hint).toBeNull();
    expect(parseQuery('security').hint).toBeNull();
    // a lone type word is searched literally
    expect(parseQuery('skills').words).toEqual(['skills']);
  });
  it('expands synonyms without changing the typed words', () => {
    const p = parseQuery('docs');
    expect(p.words).toEqual(['docs']);
    expect(p.terms).toEqual(expect.arrayContaining(['documentation', 'readme']));
  });
  it('handles empty and stop-word-only input', () => {
    expect(parseQuery('').terms).toEqual([]);
    expect(parseQuery('I need a').terms).toEqual([]);
  });
});

describe('search', () => {
  const catalog = buildCatalog({ root: makeFixture(), repo: 'me/fx' });
  const engine = buildEngine(catalog.artifacts);
  const ids = (q: string) => search(engine, parseQuery(q)).map((h) => h.artifact.id);

  it('ranks review skills first for a natural-language query', () => {
    const r = ids('I need a skill for code review');
    expect(r.slice(0, 3).sort()).toEqual(['review-kit/agent/security-reviewer', 'review-kit/command/review-pr', 'review-kit/skill/pr-review']);
    expect(r.every((id) => id.startsWith('review-kit/'))).toBe(true);
  });
  it('matches prefixes and fuzzy typos', () => {
    expect(ids('securit')).toContain('review-kit/agent/security-reviewer');
    expect(ids('secrity')).toContain('review-kit/agent/security-reviewer');
  });
  it('searches the body text', () => {
    expect(ids('diff')).toContain('review-kit/skill/pr-review');
  });
  it('returns nothing for gibberish', () => {
    expect(ids('zzzqqq')).toEqual([]);
  });
  it('suggests near names', () => {
    expect(suggest(catalog.artifacts, ['pr-reviw'])).toContain('pr-review');
  });
});

describe('highlight', () => {
  it('marks matches case-insensitively', () => {
    expect(highlight('Code Review', ['review'])).toEqual([{ t: 'Code ', hit: false }, { t: 'Review', hit: true }]);
    expect(highlight('abc', [])).toEqual([{ t: 'abc', hit: false }]);
    expect(highlight('a.b', ['.'])).toEqual([{ t: 'a', hit: false }, { t: '.', hit: true }, { t: 'b', hit: false }]);
  });
});
