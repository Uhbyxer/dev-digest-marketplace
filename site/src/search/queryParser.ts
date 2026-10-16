import synonymGroups from './synonyms.json';
import { ARTIFACT_TYPES, type ArtifactType } from '../types';

const STOP = new Set(
  'i a an the for to of in on with and or need want something some how do can me my that is it find looking help show give'.split(' '),
);
const FILLER = ['i need', 'i want', 'something to', 'how do i', 'looking for', 'show me', 'find me'];
// "a skill for ...": the type word is lifted into a filter hint instead of being searched.
const TYPED_FILLER = /(?:^|\s)(?:a|an|the|some)\s+(skill|agent|command|hook|mcp)s?\s+(?:for|to|that)(?=\s)/;

export interface ParsedQuery {
  /** Words the user actually typed, after stripping filler and stop words. */
  words: string[];
  /** words plus synonym expansions. */
  terms: string[];
  /** Artifact type named in the query ("a skill for ..."), offered as a filter. */
  hint: ArtifactType | null;
}

export function parseQuery(q: string): ParsedQuery {
  let s = ' ' + q.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ') + ' ';
  let hint: ArtifactType | null = null;
  const typed = TYPED_FILLER.exec(s);
  if (typed) {
    hint = typed[1] as ArtifactType;
    s = s.replace(TYPED_FILLER, ' ');
  }
  for (const f of FILLER) s = s.split(' ' + f + ' ').join(' ');
  let words = s.split(/\s+/).filter(Boolean);
  const all = words.length;
  words = words.filter((w) => {
    const singular = w.replace(/s$/, '') as ArtifactType;
    if (all > 1 && ARTIFACT_TYPES.includes(singular)) {
      hint = singular;
      return false;
    }
    return !STOP.has(w);
  });
  if (!words.length) hint = null;
  const terms = new Set(words);
  for (const w of words)
    for (const group of synonymGroups)
      if (group.some((x) => x === w || x.split(' ').includes(w))) for (const x of group) for (const y of x.split(' ')) terms.add(y);
  return { words, terms: [...terms], hint };
}
