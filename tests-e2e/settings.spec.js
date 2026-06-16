const { test, expect } = require('@playwright/test');
const { skipOnboarding, openPasted } = require('./helpers');

test.describe('L1 — настройки + персист', () => {
  test('смена настроек переживает перезагрузку (fr_set)', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/');
    await openPasted(page, 'Текст настроек. Второе предложение.');

    await page.click('#setBtn');
    await expect(page.locator('#settings')).toBeVisible();
    await page.selectOption('#fontSel', 'serif');
    await page.selectOption('#orpSel', 'early');
    await page.locator('#sizeRange').fill('120'); // fill шлёт input — слайдер слушает его
    // #smartChk — кастомный чекбокс (input визуально скрыт): меняем через событие напрямую
    await page.evaluate(() => { const c = document.getElementById('smartChk'); c.checked = false; c.dispatchEvent(new Event('change', { bubbles: true })); });
    await page.click('#setClose');

    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('fr_set')));
    expect(saved).toMatchObject({ font: 'serif', orp: 'early', size: 120, smart: false });

    await page.reload();
    const after = await page.evaluate(() => JSON.parse(localStorage.getItem('fr_set')));
    expect(after).toMatchObject({ font: 'serif', orp: 'early', size: 120, smart: false });
    const wsize = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--wsize').trim());
    expect(wsize).toBe('1.2');
  });
});
