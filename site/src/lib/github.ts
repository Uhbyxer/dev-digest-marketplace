import { readStorage, writeStorage } from './storage';

const TTL = 60 * 60 * 1000;

/** Unauthenticated GitHub API call (60 req/h per IP), cached for an hour. Never throws. */
export async function fetchStars(repo: string): Promise<number | null> {
  const key = `stars:${repo}`;
  try {
    const hit = JSON.parse(readStorage(key) ?? 'null') as { at: number; stars: number } | null;
    if (hit && Date.now() - hit.at < TTL) return hit.stars;
    const res = await fetch(`https://api.github.com/repos/${repo}`, { headers: { Accept: 'application/vnd.github+json' } });
    if (!res.ok) return null;
    const json = (await res.json()) as { stargazers_count?: number };
    if (typeof json.stargazers_count !== 'number') return null;
    writeStorage(key, JSON.stringify({ at: Date.now(), stars: json.stargazers_count }));
    return json.stargazers_count;
  } catch {
    return null;
  }
}
