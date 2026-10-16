import { expect, test } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
});

test('natural-language search shows cards and keeps state in the URL', async ({ page }) => {
  await page.goto('./');
  await page.getByLabel('Search').fill('I need a skill for code review');
  await expect(page.locator('.card')).toHaveCount(3);
  await expect(page.locator('.status')).toContainText('searching for code review');
  await expect(page).toHaveURL(/#\/\?q=I\+need\+a\+skill\+for\+code\+review/);
  await page.getByRole('button', { name: 'filter to skills' }).click();
  await expect(page.locator('.card')).toHaveCount(1);
  // reload restores state
  await page.reload();
  await expect(page.getByLabel('Search')).toHaveValue('I need a skill for code review');
  await expect(page.locator('.card')).toHaveCount(1);
});

test('no results shows suggestions', async ({ page }) => {
  await page.goto('./#/?q=pgg');
  await expect(page.getByText('Did you mean')).toBeVisible();
  await page.goto('./#/?q=zzzqqq');
  await expect(page.getByText('No matches')).toBeVisible();
});

test('card to detail and copy install', async ({ page }) => {
  await page.goto('./#/?q=pr-review');
  await page.locator('.card', { hasText: 'pr-review' }).getByRole('button', { name: 'Copy install' }).click();
  await expect(page.getByRole('status')).toContainText('Copied');
  await page.locator('.card-link', { hasText: 'pr-review' }).first().click();
  await expect(page).toHaveURL(/#\/artifact\/review-kit\/skill\/pr-review/);
  await expect(page.getByRole('heading', { name: 'pr-review' })).toBeVisible();
  await expect(page.locator('.md')).toContainText('Walk the diff');
});

test('plugin page: permissions and changelog tabs', async ({ page }) => {
  await page.goto('./#/plugin/ops-kit');
  await expect(page.getByText('high risk').first()).toBeVisible();
  await page.getByRole('tab', { name: 'Permissions' }).click();
  await expect(page.getByText('Executable file shipped with the plugin')).toBeVisible();
  await expect(page.getByText('secret')).toHaveCount(0);
  await page.getByRole('tab', { name: 'Changelog' }).click();
  await expect(page.getByText('No releases yet')).toBeVisible();
});

test('compare two plugins via the tray and share the URL', async ({ page }) => {
  await page.goto('./#/plugin/review-kit');
  await page.getByRole('button', { name: 'Compare' }).click();
  await page.goto('./#/plugin/ops-kit');
  await page.getByRole('button', { name: 'Compare' }).click();
  await page.getByRole('link', { name: 'Compare 2' }).click();
  await expect(page).toHaveURL(/#\/compare\?a=review-kit&b=ops-kit/);
  await expect(page.getByRole('columnheader', { name: /review-kit/ })).toBeVisible();
  const rows = page.locator('.trow');
  const before = await rows.count();
  await page.getByLabel('Hide identical rows').check();
  expect(await rows.count()).toBeLessThan(before);
  await expect(page.locator('.trow.diff').first()).toBeVisible();
});

test('contribute: validation and scaffold output', async ({ page }) => {
  await page.goto('./#/contribute');
  await expect(page.getByRole('button', { name: 'Download ZIP' })).toBeEnabled();
  await page.getByLabel('Plugin name').fill('Bad_Name');
  await expect(page.getByText('✕').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download ZIP' })).toBeDisabled();
  await page.getByLabel('Plugin name').fill('good-name');
  await expect(page.locator('pre').filter({ hasText: '"name": "good-name"' }).first()).toBeVisible();
});

test('theme toggle persists', async ({ page }) => {
  await page.goto('./');
  const before = await page.evaluate(() => document.documentElement.dataset.theme);
  await page.getByRole('button', { name: 'Toggle theme' }).click();
  const after = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(after).not.toBe(before);
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(after);
});

test('mobile width has no horizontal page scroll', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  for (const hash of ['#/', '#/plugin/ops-kit', '#/artifact/review-kit/skill/pr-review', '#/whats-new', '#/contribute', '#/compare?a=review-kit&b=ops-kit']) {
    await page.goto('./' + hash);
    await page.waitForSelector('main');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, hash).toBeLessThanOrEqual(0);
  }
});
