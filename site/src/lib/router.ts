import { useMemo, useSyncExternalStore } from 'react';

// Hash routing: GitHub Pages has no SPA fallback, so every route lives after "#".
export interface Route {
  parts: string[];
  params: URLSearchParams;
}

const EVENT = 'routechange';

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener('hashchange', cb);
    window.removeEventListener(EVENT, cb);
  };
}

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  const parts = path
    .split('/')
    .filter(Boolean)
    .map((p) => {
      try {
        return decodeURIComponent(p);
      } catch {
        return p;
      }
    });
  return { parts, params: new URLSearchParams(query) };
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash, () => '');
  return useMemo(() => parseHash(hash), [hash]);
}

export function buildHash(parts: string[], params?: Record<string, string | undefined>): string {
  const path = '#/' + parts.map(encodeURIComponent).join('/');
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) if (v) qs.set(k, v);
  const s = qs.toString();
  return s ? `${path}?${s}` : path;
}

/** Update the hash without adding a history entry (used for search-as-you-type). */
export function replaceHash(hash: string) {
  if (window.location.hash === hash) return;
  window.history.replaceState(null, '', hash);
  window.dispatchEvent(new Event(EVENT));
}

export const href = {
  home: (params?: Record<string, string | undefined>) => buildHash([], params),
  plugin: (id: string) => buildHash(['plugin', id]),
  artifact: (plugin: string, type: string, name: string) => buildHash(['artifact', plugin, type, name]),
  compare: (ids: string[]) => buildHash(['compare'], { a: ids[0], b: ids[1], c: ids[2] }),
  whatsNew: () => buildHash(['whats-new']),
  contribute: () => buildHash(['contribute']),
};
