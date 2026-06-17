const { test, expect } = require('@playwright/test');
const { freshVisit, mockSupabase } = require('./helpers');

test.describe('Онбординг v2 (?ob=v2)', () => {
  test('welcome-аха → реальное чтение → «След»; без жаргона и геймификации на welcome', async ({ page }) => {
    await mockSupabase(page);
    await freshVisit(page);
    await page.goto('/?ob=v2');

    // экран 1: выгода + «Читать», без «калибровки» и серии
    await expect(page.locator('#onboard')).toHaveClass(/open/);
    await expect(page.locator('#obBody')).toContainText('Читай вдвое быстрее');
    await expect(page.locator('#obc')).toHaveText('Читать');
    await expect(page.locator('#obBody')).not.toContainText('калибров');
    await expect(page.locator('#obBody')).not.toContainText('серия');

    // «Читать» → настоящий ридер, онбординг закрыт
    await page.click('#obc');
    await expect(page.locator('#reader')).toBeVisible();
    await expect(page.locator('#onboard')).not.toHaveClass(/open/);
    await page.waitForFunction(() => typeof state !== 'undefined' && state.tokens.length > 0, null, { timeout: 8000 });

    // прочитать до конца → «След» с выбором пути «В турнир»
    await page.evaluate(() => { state.idx = state.tokens.length - 1; finish(); });
    await expect(page.locator('#finish')).toHaveClass(/open/);
    await expect(page.locator('#sledTourn')).toBeVisible();
  });

  test('?ob=v1 даёт старый онбординг (CTA «Поехали»)', async ({ page }) => {
    await mockSupabase(page);
    await freshVisit(page);
    await page.goto('/?ob=v1');
    await expect(page.locator('#obc')).toHaveText('Поехали');
  });
});
