import { test, expect } from '@playwright/test';

test('boots game shell and shows adventure canvas', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#adventure-canvas')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('#bottom-nav .nav-btn').first()).toBeVisible();
});

test('settings panel opens from hud button', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#adventure-canvas')).toBeVisible({ timeout: 30_000 });
  await page.locator('#hud-settings-btn').click();
  await expect(page.locator('#panel-content').getByText('설정').first()).toBeVisible({ timeout: 10_000 });
});

test('panel scrolls vertically', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('#panel-content')).toBeVisible({ timeout: 30_000 });
  const panel = page.locator('#panel-content');
  const before = await panel.evaluate(el => el.scrollTop);
  await panel.evaluate(el => { el.scrollTop += 120; });
  const after = await panel.evaluate(el => el.scrollTop);
  expect(after).toBeGreaterThan(before);
});
