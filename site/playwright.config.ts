import { defineConfig } from '@playwright/test';

const PORT = 4173;
// Matches the production base path, so the tests exercise the same URLs as GitHub Pages.
const BASE = '/dev-digest-marketplace/';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}${BASE}`,
    // Optional: use an already-installed Chromium instead of the one Playwright expects.
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {},
  },
  webServer: {
    command: `npx tsx scripts/build-e2e-catalog.ts && npx vite build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}${BASE}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
