import { useEffect, useState } from 'react';
import type { Catalog } from '../types';
import { fetchStars } from './github';

let cached: Promise<Catalog> | null = null;

export function loadCatalog(): Promise<Catalog> {
  cached ??= fetch(`${import.meta.env.BASE_URL}catalog.json`).then((r) => {
    if (!r.ok) throw new Error(`catalog.json: HTTP ${r.status}`);
    return r.json() as Promise<Catalog>;
  });
  return cached;
}

export type CatalogState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; catalog: Catalog };

export function useCatalog(): CatalogState {
  const [state, setState] = useState<CatalogState>({ status: 'loading' });
  useEffect(() => {
    let alive = true;
    loadCatalog().then(
      (catalog) => {
        if (!alive) return;
        setState({ status: 'ready', catalog });
        // Optional refresh of the repo star count; build-time value stays if this fails.
        fetchStars(catalog.marketplace.repo).then((stars) => {
          if (alive && stars !== null) setState({ status: 'ready', catalog: { ...catalog, popularity: { stars, fetchedAt: new Date().toISOString() } } });
        });
      },
      (e: Error) => alive && setState({ status: 'error', message: e.message }),
    );
    return () => {
      alive = false;
    };
  }, []);
  return state;
}
