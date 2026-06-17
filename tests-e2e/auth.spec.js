const { test, expect } = require('@playwright/test');
const { skipOnboarding, mockSupabase } = require('./helpers');

test.describe('Анон-auth: запись scores с личностью', () => {
  test('сабмит результата несёт Bearer-JWT (не анон-ключ) + uid в теле + on_conflict', async ({ page }) => {
    await mockSupabase(page);
    await skipOnboarding(page);
    await page.addInitScript(() => localStorage.setItem('czk_me', 'TEST-auth')); // имя есть → без prompt
    let scorePost = null;
    page.on('request', r => { if (r.method() === 'POST' && /\/rest\/v1\/scores/.test(r.url())) scorePost = r; });

    await page.goto('/');
    await page.click('#czkCard');
    await expect(page.locator('#tournament')).toBeVisible();
    await page.click('#czkRead');
    await page.waitForFunction(() => typeof state !== 'undefined' && (state.tokens || []).length > 0 && state.tournament);
    await page.evaluate(() => { state.idx = state.tokens.length - 1; finish(); });
    await expect(page.locator('#quiz')).toBeVisible();
    const names = await page.locator('#quizBody [type=radio]').evaluateAll(els => [...new Set(els.map(e => e.name))]);
    for (const n of names) await page.locator(`input[name="${n}"][value="0"]`).check();
    await page.click('#quizSubmit');
    await expect(page.locator('#leaderboard')).toBeVisible();

    expect(scorePost, 'был POST в scores').toBeTruthy();
    expect(scorePost.headers()['authorization']).toBe('Bearer mock-jwt'); // JWT, не анон-ключ
    expect(scorePost.url()).toContain('on_conflict=uid,day');
    const body = JSON.parse(scorePost.postData() || '{}');
    expect(body.uid).toBe('mock-uid');
    expect(body.name).toBe('TEST-auth');
  });
});
