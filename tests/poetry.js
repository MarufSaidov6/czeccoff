// self-check метрической сетки лабы (lab/poetry-modes.html)
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'lab', 'poetry-modes.html'), 'utf8');
const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
function grab(re, name) { const m = script.match(re); if (!m) { console.log('FATAL: не извлечь', name); process.exit(1); } return m[0]; }
const $ = () => null; // meterSel недоступен в node — lineBeats берёт meter аргументом
eval(grab(/const VOW[\s\S]*?function syllables[\s\S]*?\n}/, 'syllables'));
eval(grab(/function isIctus[\s\S]*?\n}/, 'isIctus'));
eval(grab(/function toks\(line\)[\s\S]*?\n  return out;\n}/, 'toks'));
eval(grab(/function lineBeats[\s\S]*?\n}/, 'lineBeats'));

let pass = 0, fail = 0;
function t(id, cond, detail = '') { if (cond) { pass++; console.log('  ✓', id); } else { fail++; console.log('  ✗', id, detail ? '— ' + detail : ''); } }
const beats = (l, m) => lineBeats(l, m).map(x => x.strong);

console.log('— Метрическая сетка —');
t('SYL-1', syllables('фонарь') === 2, 'got ' + syllables('фонарь'));
t('SYL-2', syllables('аптека') === 3, 'got ' + syllables('аптека'));
t('SYL-3', syllables('Ночь,') === 1, 'пунктуация не считается: ' + syllables('Ночь,'));
t('SYL-4', syllables('одинокий') === 4, 'got ' + syllables('одинокий'));

// Блок «Ночь, улица, фонарь, аптека» — ямб (грид-икты на чётных слогах 2,4,6,8).
// слоги: Ночь(1) | у-ли-ца(2,3,4) | фо-нарь(5,6) | ап-те-ка(7,8,9)
// → Ночь нет икта (weak); улица содержит 2,4; фонарь — 6; аптека — 8 (все strong)
t('GRID-iamb', JSON.stringify(beats('Ночь, улица, фонарь, аптека,', 'iamb')) === JSON.stringify([false, true, true, true]),
  JSON.stringify(beats('Ночь, улица, фонарь, аптека,', 'iamb')));
// хорей переворачивает сетку (икты на нечётных) → первое слово становится сильным
t('GRID-trochee', beats('Ночь, улица, фонарь, аптека,', 'trochee')[0] === true,
  JSON.stringify(beats('Ночь, улица, фонарь, аптека,', 'trochee')));
// «ровно» — без сетки, всё weak
t('GRID-flat', beats('Ночь, улица, фонарь, аптека,', 'flat').every(s => s === false), 'flat должен быть весь weak');

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
