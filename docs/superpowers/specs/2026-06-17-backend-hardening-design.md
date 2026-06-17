# Дизайн: Бэкенд-hardening (RLS + dedup + личность)

Дата: 2026-06-17 · Проект: czeccoff «Чехов» · Уровень угрозы: **полу-серьёзный** (коллеги сейчас → скоро публично; нужен реальный анти-спуфинг без фрикции).
Закрывает #1 блокер Gate A из критериев готовности.

## Проблема

Лидерборд (`scores`) и воронка (`visits`) сейчас пишутся анонимным ключом без RLS-гарантий: любой может перезаписать чужой результат, наплодить дубли, выдать себя за другого (имя в localStorage). Это блокер выхода на людей.

## Решение (Подход 1): Supabase Anonymous Auth + RLS на `auth.uid()` + upsert `(uid, day)`

Каждый посетитель лениво получает **анонимный JWT** (zero-friction, без email) → стабильный `auth.uid()`. RLS привязывает запись `scores` к `auth.uid()`; имя — лишь дисплей-ярлык. Дедуп через `UNIQUE(uid, day)` + upsert (best-wins). `visits` остаются анонимными (только запись).

## 1. Личность и поток
- На загрузке — НИЧЕГО (ленивость). Перед первой записью очков → `ensureAuth()`:
  - нет сессии → `POST /auth/v1/signup` (анон) → `{access_token, refresh_token, uid, expires_at}` в `localStorage.czk_session`;
  - токен истёк → `POST /auth/v1/token?grant_type=refresh_token` (тот же `uid`).
  - стабильность uid: храним refresh_token и обновляем, НЕ делаем повторный signup.
- `uid` неподделываем (из подписанного JWT). `name` — ярлык, правится свободно, очки привязаны к uid.
- Кросс-устройство (fast-follow, Gate B): magic-link привязывает анон→email.
- Деградация: `ensureAuth()` упал → тост, сабмит недоступен; чтение/«След»/просмотр лидерборда работают.
- Предусловие (выполнено вручную): Anonymous sign-ins включены; миграция применена.

## 2. Схема и RLS (применено)
- `scores`: +`uid uuid`; `UNIQUE(uid,day) where uid is not null` (partial — легаси null уживается); CHECK base 0..10, eff_wpm 0..2000 (`not valid`). RLS: SELECT public; INSERT/UPDATE `to authenticated` где `auth.uid()=uid`; **нет DELETE-политики**.
- `visits`: RLS — INSERT `with check(true)`; нет SELECT (аналитика приватна).
- Легаси-строки (`uid null`): показываются, но не редактируются.

## 3. Клиент
- Лёгкий auth-шим на fetch (без возврата SDK): `ensureAuth()` (~30 строк).
- `scores` запись → `Authorization: Bearer <access_token>` + `POST /rest/v1/scores?on_conflict=uid,day` + `Prefer: resolution=merge-duplicates,return=minimal`, тело с `uid`.
- `scores` чтение + `visits` запись → остаются на анон-`SB_KEY`.
- **best-wins**: перед upsert — SELECT моей строки за сегодня; пишем только если новый результат лучше (по base, тай-брейк eff_wpm).

## 4. Дедуп и чтение лидерборда
- Запись: upsert `(uid,day)` best-wins → ≤1 строка/uid/день.
- Чтение (`openLeaderboard`): без изменений в математике очков; клиентская группировка «лучшее по имени» для дисплея остаётся (легаси). Полный uid-дисплей — Gate B.

## 5. Тестирование
- **Юнит (`tests/run.js`, чистое):** `isExpired(expires_at, now)`; билдер строки upsert (поля + on_conflict); `shouldSubmit(new, prev)` (best-wins-компаратор).
- **E2E (Playwright, мок Supabase auth+REST):** мок `/auth/v1/signup` → фейк-сессия; турнир-флоу: `ensureAuth` вызван, POST scores несёт `Authorization: Bearer` (не анон-ключ) + `on_conflict=uid,day` + `uid`; лидерборд показывает игрока; прод не трогается.
- **Проверка RLS (`tests/rls-check.sh`, ручной прогон по живой БД, GWT, snake_case):** анон без JWT → insert score → 401/403; свой JWT → insert own → 201; update чужой → 0 строк; delete → запрет; read visits анон → запрет. Прогоняется один раз после миграции (агент не пишет в прод-БД).

## Вне скоупа (fast-follow / Gate B)
- magic-link (кросс-устройство), серверный RPC (Подход 3), rate-limit/anti-bot, right-to-erasure (нет DELETE-политики → нужен RPC/админ), uid-дисплей в лидерборде.

## Совместимость / откат
- v1/v2 онбординг, чтение, «След», воронка — не затрагиваются.
- Откат: вернуть `scores` запись на анон-ключ (убрать ensureAuth из пути submit). RLS на БД остаётся (не мешает чтению).
