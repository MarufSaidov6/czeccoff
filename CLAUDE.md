# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# czeccoff
RSVP-ридер «по одному слову в одной точке». Один файл, без сборки.
- `index.html` — всё приложение (vanilla JS/CSS, ~117 КБ, без зависимостей). Деплой: статика GitHub Pages (`.nojekyll`). Live: https://marufsaidov6.github.io/czeccoff/
- Бэкенд: Supabase (`scores`,`visits`) — anon-auth (JWT→auth.uid()) + RLS. Только общий лидерборд турнира; чтение и прогресс — офлайн.

## Архитектура
Всё в `<script>` внутри `index.html`, разбито комментами-секциями `/* ==== … ==== */`. Где что искать:
- **Чтение текста**: Нормализация → Токенизация → ORP → Тайминг → Движок (цикл показа слов). ORP-якорь считается по реальной ширине букв через canvas `measureText` (не индексный). FB2 — через DOMParser, автодетект кодировки (вкл. windows-1251).
- **Хранение**: тексты книг → IndexedDB (в localStorage не влезают); настройки/прогресс/серия дней → localStorage. Сервера для этого нет.
- **Экраны**: Home, Reader, След сессии (экран завершения), Турнир, Онбординг (воронка первого запуска).
- **Турнир/лидерборд**: секции «Турнир» + «Анонимная личность (Supabase Anonymous Auth)». `best-wins` через `shouldSubmit`.

## Тесты
- Юнит: `npm test` (= `node tests/run.js` + `node tests/poetry.js`). run.js — боевые функции из `index.html`; poetry.js — метрическая сетка из `lab/poetry-modes.html`.
- ⚠️ Юнит-раннеры **вырезают функции из HTML регекспом + `eval`** (`grab()`). Переименуешь чистую функцию или сменишь форму закрывающей `}` — тест падает с `FATAL: не извлечь`. Меняешь сигнатуру — правь и регексп в раннере.
- E2E: `export PATH="$HOME/.nvm/versions/node/v22.22.0/bin:$PATH"; npx playwright test` (npm-шим сломан → nvm v22; Supabase замокан). Один файл/тест: `npx playwright test tests-e2e/reader.spec.js` или `-g "паттерн"`. Сервит реальный апп `python3 -m http.server` (тот же код, что на проде).
- RLS: `tests/rls-check.sh` (ручной GWT по живой БД, нужен `SB_KEY`).

## Инварианты
- Чистые модули + юнит-тесты: deriveStreak, resolveObVariant, isExpired, shouldSubmit. Меняешь логику — правь тест.
- Онбординг: resolveObVariant дефолт = v2 (A/B выкл; `?ob=v1` — старый).

## Гигиена
- НЕ публиковать: `.claude/`, `.superpowers/`, личные книги (`/my-books/`). Планы сессий → `.claude/<id>/`, отработанное → `.claude/archive/`.
- Коммиты: 2–5 слов, от меня, без ссылок на claude.
