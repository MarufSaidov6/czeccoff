const { test, expect } = require('@playwright/test');
const { skipOnboarding, openPasted } = require('./helpers');

const TXT = 'Первое предложение тут. Второе короткое. Третье предложение длиннее. Четвёртое. Пятое, с запятой. Шестое здесь. Седьмое предложение. Восьмое. Девятое про чтение. Десятое финальное предложение текста.';

test.describe('След — экран завершения сессии', () => {
  test('чтение → finish → след рисуется, ровность 38..98, коллекция растёт + дельта', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/');
    await openPasted(page, TXT);

    await page.click('#playBtn');
    await page.waitForFunction(() => typeof state !== 'undefined' && state.paceSamples.length >= 6, null, { timeout: 8000 });
    await page.evaluate(() => finish());

    await expect(page.locator('#finish')).toBeVisible();
    await expect(page.locator('#sledSvg path.ln')).toHaveCount(1);

    const t1 = await page.evaluate(() => JSON.parse(localStorage.getItem('fr_traces') || '[]'));
    expect(t1.length).toBe(1);
    expect(t1[0].smoothness).toBeGreaterThanOrEqual(38);
    expect(t1[0].smoothness).toBeLessThanOrEqual(98);

    // «Ещё отрывок — ровнее» → свежая честная попытка (метрики обнулены)
    await page.click('#finRestart');
    expect(await page.evaluate(() => state.paceSamples.length)).toBe(0);
    await page.click('#playBtn');
    await page.waitForFunction(() => typeof state !== 'undefined' && state.paceSamples.length >= 6, null, { timeout: 8000 });
    await page.evaluate(() => finish());

    const t2 = await page.evaluate(() => JSON.parse(localStorage.getItem('fr_traces') || '[]'));
    expect(t2.length).toBe(2);
    await expect(page.locator('#sledDelta')).toContainText('среднему');
  });

  test('возвраты → красные точки на следе + инсайт про возвраты', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/');
    await openPasted(page, TXT);

    await page.click('#playBtn');
    await page.waitForFunction(() => typeof state !== 'undefined' && state.idx >= 8, null, { timeout: 8000 });
    // большой откат назад = осознанный возврат (recordRegression); прямой вызов — без гонок с фокус-режимом
    await page.evaluate(() => { pause(); goTo(0, false); finish(); });

    await expect(page.locator('#sledSvg circle.reg')).not.toHaveCount(0);
    await expect(page.locator('#sledInsightT')).not.toHaveText('Ни одного возврата');
  });
});
