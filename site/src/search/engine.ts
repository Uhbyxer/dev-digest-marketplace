import MiniSearch from 'minisearch';
import type { Artifact } from '../types';
import type { ParsedQuery } from './queryParser';

export interface SearchHit {
  artifact: Artifact;
  score: number;
}

const FIELDS = ['name', 'keywords', 'description', 'plugin', 'body'];
const BOOST = { name: 5, keywords: 3, description: 2, plugin: 1.5, body: 1 };

export interface Engine {
  mini: MiniSearch<Artifact>;
  byId: Map<string, Artifact>;
}

export function buildEngine(artifacts: Artifact[]): Engine {
  const mini = new MiniSearch<Artifact>({
    fields: FIELDS,
    idField: 'id',
    extractField: (doc, field) => {
      const v = (doc as unknown as Record<string, unknown>)[field];
      return Array.isArray(v) ? v.join(' ') : (v as string);
    },
    searchOptions: { boost: BOOST, prefix: true, fuzzy: (term) => (term.length > 4 ? 0.2 : false) },
  });
  mini.addAll(artifacts);
  return { mini, byId: new Map(artifacts.map((a) => [a.id, a])) };
}

/**
 * OR-match over the typed words, with a bonus when a document matches all of them.
 * Synonym-only terms contribute at a reduced weight so literal matches rank first.
 */
export function search(engine: Engine, parsed: ParsedQuery): SearchHit[] {
  if (!parsed.terms.length) return [];
  const scores = new Map<string, number>();
  const add = (id: string, s: number) => scores.set(id, (scores.get(id) ?? 0) + s);

  for (const r of engine.mini.search(parsed.words.join(' '), { combineWith: 'OR' })) add(r.id, r.score);
  const synonymOnly = parsed.terms.filter((t) => !parsed.words.includes(t));
  if (synonymOnly.length) for (const r of engine.mini.search(synonymOnly.join(' '), { combineWith: 'OR' })) add(r.id, r.score * 0.5);

  if (parsed.words.length > 1) {
    for (const r of engine.mini.search(parsed.words.join(' '), { combineWith: 'AND' })) add(r.id, r.score * 0.5);
  }
  return [...scores]
    .map(([id, score]) => ({ artifact: engine.byId.get(id)!, score }))
    .sort((a, b) => b.score - a.score || a.artifact.name.localeCompare(b.artifact.name));
}

export function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

/** Nearest artifact names for the "no results" screen. */
export function suggest(artifacts: Artifact[], words: string[], limit = 3): string[] {
  if (!words.length) return [];
  const scored = artifacts.map((a) => {
    const parts = a.name.split('-');
    const d = Math.min(...words.flatMap((w) => [levenshtein(w, a.name), ...parts.map((p) => levenshtein(w, p))]));
    return { name: a.name, d };
  });
  return [...new Set(scored.filter((s) => s.d <= 3).sort((a, b) => a.d - b.d).map((s) => s.name))].slice(0, limit);
}

/** Split text into highlighted / plain segments for the given words. */
export function highlight(text: string, words: string[]): { t: string; hit: boolean }[] {
  if (!words.length) return [{ t: text, hit: false }];
  const re = new RegExp('(' + words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'ig');
  // With one capture group, split() puts the matches at odd indices.
  return text
    .split(re)
    .map((t, i) => ({ t, hit: i % 2 === 1 }))
    .filter((p) => p.t);
}
