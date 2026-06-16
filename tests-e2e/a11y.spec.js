const { test, expect } = require('@playwright/test');
const { skipOnboarding, openPasted } = require('./helpers');

test.describe('L3 — a11y (закрепление фиксов)', () => {
  test('A11Y-2: тач-цели топбара ← ⚙ ⟲ ≥ 44×44', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/');
    await openPasted(page, 'Текст для топбара. Второе предложение.');
    for (const id of ['#backBtn', '#setBtn', '#restartBtn']) {
      const box = await page.locator(id).boundingBox();
      expect(box.width, id + ' width').toBeGreaterThanOrEqual(44);
      expect(box.height, id + ' height').toBeGreaterThanOrEqual(44);
    }
  });

  test('A11Y-1: prefers-reduced-motion обнуляет переходы', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await skipOnboarding(page);
    await page.goto('/');
    await openPasted(page, 'Проверка движения. Второе.');
    const dur = await page.locator('.topbar').first().evaluate(el => getComputedStyle(el).transitionDuration);
    const secs = Math.max(...dur.split(',').map(s => parseFloat(s)));
    expect(secs).toBeLessThan(0.05);
  });
});
