const { test, expect } = require('@playwright/test');
const { freshVisit, mockSupabase } = require('./helpers');

test.describe('Онбординг v2 (?ob=v2)', () => {
  test('welcome-аха → реальное чтение → «След»; без жаргона и геймификации на welcome', async ({ page }) => {
    await mockSupabase(page);
    await freshVisit(page);
    await page.goto('/?ob=v2');

    // экран 1: что это (по одному слову), CTA «Прочитать первое», без жаргона/обещания-цифры/серии
    await expect(page.locator('#onboard')).toHaveClass(/open/);
    await expect(page.locator('#obBody')).toContainText('Глаза не бегают по строке');
    await expect(page.locator('#obc')).toHaveText('Прочитать первое');
    await expect(page.locator('#obBody')).not.toContainText('калибров');
    await expect(page.locator('#obBody')).not.toContainText('вдвое'); // фейк-обещание скорости убрано
    await expect(page.locator('#obBody')).not.toContainText('серия');

    // «Читать» → настоящий ридер, онбординг закрыт
    await page.click('#obc');
    await expect(page.locator('#reader')).toBeVisible();
    await expect(page.locator('#onboard')).not.toHaveClass(/open/);
    await page.waitForFunction(() => typeof state !== 'undefined' && state.tokens.length > 0, null, { timeout: 8000 });

    // прочитать до конца → «След»; на ПЕРВОМ проходе один CTA, турнир скрыт (геймификация — со 2-го захода)
    await page.evaluate(() => { state.idx = state.tokens.length - 1; finish(); });
    await expect(page.locator('#finish')).toHaveClass(/open/);
    await expect(page.locator('#finRestart')).toBeVisible();           // «Ещё отрывок — ровнее»
    await expect(page.locator('#sledTourn')).toBeHidden();             // турнир не на первом «Следе»
  });

  test('?ob=v1 даёт старый онбординг (CTA «Поехали»)', async ({ page }) => {
    await mockSupabase(page);
    await freshVisit(page);
    await page.goto('/?ob=v1');
    await expect(page.locator('#obc')).toHaveText('Поехали');
  });
});
