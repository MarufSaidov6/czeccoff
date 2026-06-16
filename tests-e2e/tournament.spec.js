const { test, expect } = require('@playwright/test');
const { skipOnboarding, mockSupabase } = require('./helpers');

test.describe('L1+L2 — турнир + Supabase (мок)', () => {
  test('читаю отрывок → квиз → верные ответы → лидерборд (без записи в прод)', async ({ page }) => {
    await mockSupabase(page); // ничего не уходит в реальный Supabase
    await skipOnboarding(page);
    await page.addInitScript(() => localStorage.setItem('czk_me', 'TEST-pw-player'));
    await page.goto('/');

    // вход в турнир
    await page.click('#czkCard');
    await expect(page.locator('#tournament')).toBeVisible();
    await page.click('#czkRead');

    // ждём загрузку отрывка, прыгаем к концу, форсим финиш → квиз
    await page.waitForFunction(() => typeof state !== 'undefined' && (state.tokens || []).length > 0 && state.tournament);
    await page.evaluate(() => { state.idx = state.tokens.length - 1; finish(); });
    await expect(page.locator('#quiz')).toBeVisible();

    // все правильные ответы в манифесте = вариант 0 (для любого дня)
    const qs = await page.locator('#quizBody [type=radio]').evaluateAll(els => {
      const names = [...new Set(els.map(e => e.name))]; return names;
    });
    for (const name of qs) await page.locator(`input[name="${name}"][value="0"]`).check();
    await page.click('#quizSubmit');

    // лидерборд с нашим игроком (база 10 за оба верных)
    await expect(page.locator('#leaderboard')).toBeVisible();
    await expect(page.locator('#lbHead')).toContainText('очки');
    await expect(page.locator('#lbList')).toContainText('TEST-pw-player');
  });
});
