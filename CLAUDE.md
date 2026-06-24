# CLAUDE.md — czeccoff
RSVP-ридер «по одному слову в одной точке». Один файл, без сборки.
- `index.html` — всё приложение (vanilla JS/CSS). Деплой: статика GitHub Pages (`.nojekyll`). Live: https://marufsaidov6.github.io/czeccoff/
- Бэкенд: Supabase (`scores`,`visits`) — anon-auth (JWT→auth.uid()) + RLS.
## Тесты
- Юнит: `node tests/run.js`
- E2E: `export PATH="$HOME/.nvm/versions/node/v22.22.0/bin:$PATH"; npx playwright test` (npm-шим сломан, Supabase замокан)
- RLS: `tests/rls-check.sh` (ручной GWT по живой БД, нужен `SB_KEY`)
## Инварианты
- Чистые модули + юнит-тесты: deriveStreak, resolveObVariant, isExpired, shouldSubmit. Меняешь логику — правь тест.
- Онбординг: resolveObVariant дефолт = v2 (A/B выкл; `?ob=v1` — старый).
## Гигиена
- НЕ публиковать: `.claude/`, `.superpowers/`, личные книги. Планы сессий → `.claude/<id>/`, отработанное → `.claude/archive/`.
- Коммиты: 2–5 слов, от меня, без ссылок на claude.
