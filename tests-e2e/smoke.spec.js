const { test, expect } = require('@playwright/test');
const { skipOnboarding } = require('./helpers');

test.describe('L0 — дым', () => {
  test('грузится без ошибок консоли, заголовок и главный экран на месте', async ({ page }) => {
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push(String(e)));
    await skipOnboarding(page);
    await page.goto('/');
    await expect(page).toHaveTitle(/Чехов/);
    await expect(page.locator('#home')).toBeVisible();
    // фильтруем заведомо внешние (esm.sh/supabase сеть в офлайне) — следим за app-ошибками
    const appErrors = errors.filter(e => !/esm\.sh|supabase|Failed to fetch|net::/.test(e));
    expect(appErrors, appErrors.join('\n')).toHaveLength(0);
  });
});
