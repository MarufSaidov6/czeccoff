const { test, expect } = require('@playwright/test');
const { skipOnboarding, openPasted } = require('./helpers');

const TXT = 'Первое предложение тут. Второе, с запятой; и число 1 587 423. Третье предложение целиком! Конец.';

test.describe('L1 — ридер (ядро)', () => {
  test.beforeEach(async ({ page }) => { await skipOnboarding(page); await page.goto('/'); });

  test('вставка → чтение → пауза → контекст → навигация → финиш', async ({ page }) => {
    await openPasted(page, TXT);
    await expect(page.locator('#docTitle')).toHaveText(/Вставленный текст/);

    // play двигает idx
    await page.click('#playBtn');
    await page.waitForTimeout(2500);
    const idxMid = await page.evaluate(() => state.idx);
    expect(idxMid).toBeGreaterThan(0);

    // якорь красный
    const color = await page.locator('#wordRow .orp').evaluate(el => getComputedStyle(el).color);
    expect(color).toBe('rgb(255, 90, 78)');

    // пауза тапом по сцене (в фокус-режиме контролы/topbar тают — #playBtn скрыт)
    await page.locator('#stage').click();
    await expect(page.locator('#context')).toBeVisible();
    await expect(page.locator('#pausedLabel')).toBeVisible();
    expect(await page.evaluate(() => state.playing)).toBe(false);

    // навигация по предложениям
    await page.evaluate(() => { state.idx = 0; });
    await page.click('#nextSent');
    const afterNext = await page.evaluate(() => state.idx);
    expect(afterNext).toBeGreaterThan(0);
    await page.click('#prevSent');
    expect(await page.evaluate(() => state.idx)).toBeLessThanOrEqual(afterNext);

    // финиш со статистикой
    await page.evaluate(() => finish());
    await expect(page.locator('#finish')).toBeVisible();
    await expect(page.locator('#finS')).not.toHaveText('');
  });

  test('пустая вставка → не падает, остаёмся на главной', async ({ page }) => {
    page.on('dialog', d => d.accept()); // ловим alert('Вставь текст')
    await page.fill('#pasteArea', '   ');
    await page.click('#readPasted');
    await expect(page.locator('#home')).toBeVisible();
    await expect(page.locator('#reader')).toBeHidden();
  });
});
