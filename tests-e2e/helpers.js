// Общие хелперы для E2E.
const { expect } = require('@playwright/test');

// Пропустить онбординг: ставим флаги ДО загрузки.
async function skipOnboarding(page) {
  await page.addInitScript(() => {
    localStorage.setItem('czk_onboarded', '1');
    localStorage.setItem('fr_last', JSON.stringify({ title: 'x', total: 1, idx: 0 }));
    localStorage.setItem('czk_vid', 'TEST-pw');
  });
}

// Чистый первый визит.
async function freshVisit(page) {
  await page.addInitScript(() => {
    localStorage.clear();
    try { indexedDB.deleteDatabase('flashreader'); } catch (e) {}
    localStorage.setItem('czk_vid', 'TEST-pw');
  });
}

// Заглушка Supabase REST (stateful): ничего не пишем в прод, но POST score
// попадает в последующий GET — лидерборд ведёт себя как настоящий.
async function mockSupabase(page, seed = []) {
  const store = [...seed];
  await page.route('**/*supabase.co/**', route => {
    const req = route.request();
    const url = req.url(), method = req.method();
    if (method === 'OPTIONS') return route.fulfill({ status: 200, headers: cors(), body: '' });
    if (url.includes('/auth/v1/')) { // анон-вход / refresh → фейк-сессия
      return route.fulfill({ status: 200, headers: cors(), body: JSON.stringify({ access_token: 'mock-jwt', refresh_token: 'mock-ref', expires_in: 3600, user: { id: 'mock-uid' } }) });
    }
    if (url.includes('/visits')) return route.fulfill({ status: 201, headers: cors(), body: '[]' });
    if (url.includes('/scores')) {
      if (method === 'POST') {
        try { const b = JSON.parse(req.postData() || '[]'); (Array.isArray(b) ? b : [b]).forEach(r => store.push(r)); } catch (e) {}
        return route.fulfill({ status: 201, headers: cors(), body: '[]' });
      }
      if (url.includes('uid=eq.')) return route.fulfill({ status: 200, headers: cors(), body: '[]' }); // best-wins: своя строка за сегодня отсутствует
      return route.fulfill({ status: 200, headers: cors(), body: JSON.stringify(store) }); // GET лидерборд
    }
    return route.fulfill({ status: 200, headers: cors(), body: '[]' });
  });
}
const cors = () => ({ 'access-control-allow-origin': '*', 'content-type': 'application/json' });

// Открыть документ из вставки и дождаться ридера.
async function openPasted(page, text) {
  await page.fill('#pasteArea', text);
  await page.click('#readPasted');
  await expect(page.locator('#reader')).toBeVisible();
}

module.exports = { skipOnboarding, freshVisit, mockSupabase, openPasted };
