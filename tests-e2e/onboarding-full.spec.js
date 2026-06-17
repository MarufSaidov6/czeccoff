const { test, expect } = require('@playwright/test');
const { freshVisit, skipOnboarding, mockSupabase } = require('./helpers');

test.describe('L1 — онбординг: полная воронка + геймификация', () => {
  test('замер→честный результат→победа(День N)→цель(цепочка)→лончпад→первый текст', async ({ page }) => {
    await mockSupabase(page);
    await freshVisit(page);
    await page.goto('/?ob=v1'); // этот сценарий проверяет v1-воронку (7 шагов)
    await expect(page.locator('#onboard')).toHaveClass(/open/);

    await page.click('#obc');                       // welcome → how
    await page.click('#obc');                       // how → why
    await page.locator('.ob-pick').first().click();
    await page.click('#obc');                       // why → test
    await page.click('#obc');                       // «Начать чтение»

    // дельта 1: честный замер на экране теста + «перемерить»
    await expect(page.locator('#obRetry')).toBeVisible({ timeout: 12000 });
    await expect(page.locator('#obBody')).toContainText('честный замер');
    await page.click('#obc');                       // «Дальше →» → result

    // дельта 2: «День N» на победе
    await expect(page.locator('#obBody')).toContainText('Засчитано как День');
    await expect(page.locator('#obBody .ob-ring')).toBeVisible();
    await page.fill('#obn', 'QA-pw');
    await page.click('#obc');                        // «Хочу читать так же» → goal

    // дельта 3: цепочка из 7 точек
    await expect(page.locator('#obBody .ob-dots i')).toHaveCount(7);
    await page.click('#obc');                        // «Поставить цель» → launch

    // дельта 4: финал-лончпад с тремя путями
    await expect(page.locator('#obStart')).toBeVisible();
    await expect(page.locator('#obBody')).toContainText('Смерть чиновника');
    await expect(page.locator('#obTourn')).toBeVisible();
    await expect(page.locator('#obOwn')).toBeVisible();

    // «Читать ▶» открывает первый текст и завершает онбординг
    await page.click('#obStart');
    await expect(page.locator('#reader')).toBeVisible();
    await expect(page.locator('#docTitle')).toHaveText(/Смерть чиновника/);
    expect(await page.evaluate(() => localStorage.getItem('czk_onboarded'))).toBe('1');
  });

  test('система серий: deriveStreak из fr_days показывается на главной', async ({ page }) => {
    await skipOnboarding(page);
    await page.addInitScript(() => {
      const iso = d => d.toISOString().slice(0, 10);
      const t = new Date(), y = new Date(); y.setDate(y.getDate() - 1);
      const days = {}; days[iso(t)] = { w: 100, ms: 90000 }; days[iso(y)] = { w: 80, ms: 60000 };
      localStorage.setItem('fr_days', JSON.stringify(days));
    });
    await page.goto('/');
    await expect(page.locator('#todayLine')).toContainText('Серия');
    expect(await page.evaluate(() => deriveStreak())).toBe(2);
  });
});
