// Writes a catalog built from the throwaway fixture tree, so e2e tests have several plugins to work with.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCatalog } from './build-catalog';
import { makeFixture } from './fixture';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'catalog.json');
mkdirSync(dirname(out), { recursive: true });
const catalog = buildCatalog({ root: makeFixture(), repo: 'me/fx' });
catalog.popularity = { stars: 7, fetchedAt: null };
writeFileSync(out, JSON.stringify(catalog));
console.log(`e2e catalog: ${catalog.plugins.length} plugins, ${catalog.artifacts.length} artifacts`);
