const { test, expect } = require('@playwright/test');
const { freshVisit, skipOnboarding, mockSupabase } = require('./helpers');

test.describe('L1 — онбординг (воронка)', () => {
  test('первый визит → онбординг + гейтинг CTA на шаге «зачем»', async ({ page }) => {
    await mockSupabase(page);
    await freshVisit(page);
    await page.goto('/?ob=v1'); // сценарий про v1-воронку
    await expect(page.locator('#onboard')).toHaveClass(/open/);
    await expect(page.locator('#obc')).toHaveText('Поехали');

    await page.click('#obc'); // → how
    await expect(page.locator('#obc')).toHaveText('Понятно');
    await page.click('#obc'); // → why
    // CTA «Дальше» disabled пока не выбран мотив
    await expect(page.locator('#obc')).toBeDisabled();
    await page.locator('.ob-pick').first().click();
    await expect(page.locator('#obc')).toBeEnabled();
  });

  test('?onboarding=1 форсит онбординг даже после прохождения', async ({ page }) => {
    await mockSupabase(page);
    await skipOnboarding(page); // czk_onboarded=1
    await page.goto('/?onboarding=1');
    await expect(page.locator('#onboard')).toHaveClass(/open/);
  });
});
