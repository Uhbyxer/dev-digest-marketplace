// localStorage can throw (private mode, blocked site data); every access is guarded.
export function readStorage(key: string, area: 'local' | 'session' = 'local'): string | null {
  try {
    return (area === 'local' ? window.localStorage : window.sessionStorage).getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string, area: 'local' | 'session' = 'local') {
  try {
    (area === 'local' ? window.localStorage : window.sessionStorage).setItem(key, value);
  } catch {
    /* ignore */
  }
}
