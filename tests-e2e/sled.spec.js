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

  test('стили следа: волна (заливка+линия) и сейсмо (бары без линии)', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/');
    await openPasted(page, TXT);
    await page.click('#playBtn');
    await page.waitForFunction(() => typeof state !== 'undefined' && state.paceSamples.length >= 6, null, { timeout: 8000 });
    await page.evaluate(() => { settings.sledStyle = 'wave'; finish(); });
    await expect(page.locator('#sledSvg .wavefill')).toHaveCount(1);
    await expect(page.locator('#sledSvg path.ln')).toHaveCount(1);

    await page.click('#finRestart');
    await page.click('#playBtn');
    await page.waitForFunction(() => typeof state !== 'undefined' && state.paceSamples.length >= 6, null, { timeout: 8000 });
    await page.evaluate(() => { settings.sledStyle = 'seismo'; finish(); });
    await expect(page.locator('#sledSvg line.bar')).not.toHaveCount(0);
    await expect(page.locator('#sledSvg path.ln')).toHaveCount(0);
  });

  test('шаринг следа собирает PNG (canvas → blob)', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/');
    await openPasted(page, TXT);
    await page.click('#playBtn');
    await page.waitForFunction(() => typeof state !== 'undefined' && state.paceSamples.length >= 6, null, { timeout: 8000 });
    await page.evaluate(() => finish());
    const size = await page.evaluate(() => new Promise(res => {
      const real = HTMLCanvasElement.prototype.toBlob;
      HTMLCanvasElement.prototype.toBlob = function (cb, t) { return real.call(this, b => { HTMLCanvasElement.prototype.toBlob = real; res(b ? b.size : 0); cb(b); }, t); };
      shareSled();
      setTimeout(() => res(-1), 3000);
    }));
    expect(size).toBeGreaterThan(1000);
  });

  test('серия (День N) показывается на «Следе» при данных дня', async ({ page }) => {
    await skipOnboarding(page);
    await page.addInitScript(() => { const k = new Date().toISOString().slice(0, 10); localStorage.setItem('fr_days', JSON.stringify({ [k]: { w: 50, ms: 120000 } })); });
    await page.goto('/');
    await openPasted(page, TXT);
    await page.click('#playBtn');
    await page.waitForFunction(() => typeof state !== 'undefined' && state.paceSamples.length >= 4, null, { timeout: 8000 });
    await page.evaluate(() => finish());
    await expect(page.locator('#sledStreak')).toContainText('День');
  });
});
