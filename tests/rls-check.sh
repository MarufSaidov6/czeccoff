#!/usr/bin/env bash
# Ручная проверка RLS Supabase (GWT) — прогнать ОДИН раз после применения миграции.
# Использует только анон-ключ + анон-JWT (signInAnonymously). Тела в snake_case.
# Пишет одну тест-строку scores (name=rls_test). DELETE запрещён политикой — убрать через SQL-консоль (см. конец).
set -u

SB_URL="https://tqmgcuovufwrsxrblzvo.supabase.co"
SB_KEY="${SB_KEY:-PASTE_ANON_KEY}"   # экспортни SB_KEY=... (анон-ключ из index.html) или впиши сюда
DAY="$(date +%F)"
ZERO="00000000-0000-0000-0000-000000000000"
KEY=(-H "apikey: ${SB_KEY}" -H "Content-Type: application/json")
code(){ curl -s -o /dev/null -w "%{http_code}" "$@"; }

echo "== 1) GIVEN анон-ключ без user-JWT · WHEN insert score · THEN запрет =="
C=$(code -X POST "${KEY[@]}" -H "Authorization: Bearer ${SB_KEY}" \
  -d '{"uid":"'"$ZERO"'","name":"rls_test","day":"'"$DAY"'","base":10,"eff_wpm":300,"comp":2}' \
  "${SB_URL}/rest/v1/scores")
echo "   → HTTP ${C}  (ожидание: 401/403)"

echo "== 2) GIVEN анон-JWT · WHEN signInAnonymously =="
SESS=$(curl -s -X POST "${KEY[@]}" -d '{}' "${SB_URL}/auth/v1/signup")
JWT=$(printf '%s' "$SESS" | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')
MYUID=$(printf '%s' "$SESS" | sed -n 's/.*"id":"\([0-9a-f-]\{36\}\)".*/\1/p')
echo "   uid=${MYUID:-<нет — включён ли Anonymous sign-in?>} jwt=${JWT:0:14}…"

echo "== 3) WHEN insert score со своим uid+JWT · THEN 201 =="
C=$(code -X POST "${KEY[@]}" -H "Authorization: Bearer ${JWT}" -H "Prefer: resolution=merge-duplicates" \
  -d '{"uid":"'"$MYUID"'","name":"rls_test","day":"'"$DAY"'","base":10,"eff_wpm":300,"comp":2}' \
  "${SB_URL}/rest/v1/scores?on_conflict=uid,day")
echo "   → HTTP ${C}  (ожидание: 201)"

echo "== 4) WHEN update чужой строки (uid=000…) своим JWT · THEN 0 строк (RLS) =="
R=$(curl -s -X PATCH "${KEY[@]}" -H "Authorization: Bearer ${JWT}" -H "Prefer: return=representation" \
  -d '{"base":0}' "${SB_URL}/rest/v1/scores?uid=eq.${ZERO}&day=eq.${DAY}")
echo "   → ${R}  (ожидание: [] — не дало изменить чужое)"

echo "== 5) WHEN delete свою строку · THEN запрет (нет DELETE-политики) =="
C=$(code -X DELETE "${KEY[@]}" -H "Authorization: Bearer ${JWT}" "${SB_URL}/rest/v1/scores?uid=eq.${MYUID}&day=eq.${DAY}")
echo "   → HTTP ${C}  (ожидание: 401/403; строку не удалить)"

echo "== 6) WHEN read visits анон · THEN запрет/пусто =="
R=$(curl -s "${KEY[@]}" "${SB_URL}/rest/v1/visits?select=*&limit=1")
echo "   → ${R}  (ожидание: [] или ошибка — SELECT-политики нет)"

echo
echo "Прибрать тест-строку (DELETE запрещён политикой) — в SQL-консоли Supabase:"
echo "  delete from public.scores where name = 'rls_test';"
