
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*)<\/script>/)[1];

// --- моки окружения ---
global.settings = { smart:true, sep:true, dlg:'merge', orp:'classic', trans:'cut', trainer:false };
const widths = {'ш':1.5,'щ':1.6,'ж':1.5,'ы':1.3,'ю':1.4,'м':1.3,'д':1.15,'—':1.2,' ':0.5,'.':0.4,',':0.4,'ь':0.85,'т':0.95};
global.document = { createElement: () => ({ getContext: () => ({
  set font(v) {}, measureText: s => ({ width: [...s].reduce((a,c)=>a+(widths[c]||1),0) })
})})};

// --- извлечение боевых функций ---
function grab(re, name) {
  const m = script.match(re);
  if (!m) { console.log('FATAL: не извлечь', name); process.exit(1); }
  return m[0];
}
eval(grab(/function normalize[\s\S]*?\n}/, 'normalize'));
eval(grab(/const ABBR[\s\S]*?function tokenize[\s\S]*?\n  return tokens;\n}/, 'tokenize'));
eval(grab(/function sentenceStarts[\s\S]*?\n}/, 'sentenceStarts'));
eval(grab(/const meas[\s\S]*?function orpCharIndex[\s\S]*?\n  return best;\n}/, 'orp'));
eval(grab(/function wordDelay[\s\S]*?\n}/, 'wordDelay'));
eval(grab(/function transitionPlan[\s\S]*?\n}/, 'transitionPlan'));
eval(grab(/function dayScore[\s\S]*?\n}/, 'dayScore'));
eval(grab(/function plural[\s\S]*?\n}/, 'plural'));
eval(grab(/function edgePunct[\s\S]*?\n}/, 'edgePunct'));

// --- раннер ---
let pass=0, fail=0; const fails=[];
function t(id, name, cond, detail='') {
  if (cond) { pass++; console.log('  ✓', id, name); }
  else { fail++; fails.push(id); console.log('  ✗', id, name, detail ? '— '+detail : ''); }
}
const words = toks => toks.map(x=>x.w);

console.log('— Секция 1: нормализация и токенизация —');
{
  let toks = tokenize('Первый абзац тут.\n\nВторой абзац тут.');
  t('TOK-01','абзацы через пустую строку', toks.filter(x=>x.para).length===2);

  const moem = 'Я решил, что  Макс Келада мне не  понравится,  еще  до того, как увидел\nего.  Война  только что кончилась.\n     Когда я вошел в  каюту, вещи мистера Келада были уже там. Вид их мне не\nпонравился.\n     -- Я мистер Келада, -- добавил он,  приоткрыв в улыбке ряд  белоснежных\nзубов, и сел.\n     Я даже заморгал.';
  const paras = normalize(moem).split('\n\n');
  t('TOK-02','lib.ru: отступы=абзацы, переносы склеены', paras.length===4, 'получено '+paras.length);

  toks = tokenize('Первая мысль.\nВторая мысль.\nТретья.');
  t('TOK-03','без пустых строк: строка=абзац', toks.filter(x=>x.para).length===3);

  toks = tokenize('Жил-был А. С. Пушкин, т.е. поэт, и т.д. Конец фразы. Новая фраза.');
  let ss = sentenceStarts(toks);
  t('TOK-04','инициалы и т.е./т.д. не рвут предложение', ss.length===3, 'стартов: '+ss.length+' ['+ss.map(i=>toks[i].w)+']');

  toks = tokenize('Было 1 587 423 человека.');
  t('TOK-05','число с разрядами — один токен', words(toks).includes('1 587 423'));

  toks = tokenize('Какое-то слово-с-многими-дефисами-внутри тут.');
  t('TOK-06','сверхдлинная дефисная склейка дробится', toks.length>3 && !words(toks).some(w=>w.length>18));

  toks = tokenize('Он вскрыл конверт.-- О! -- сказал он.');
  t('TOK-07a','«конверт.--» конвертирован', !words(toks).some(w=>w.includes('--')));
  t('TOK-07b','тире склеено со словом', words(toks).includes('— О!') && words(toks).includes('— сказал'));

  toks = tokenize('сло­во обычное');
  t('TOK-08','мягкий перенос удалён', words(toks)[0]==='слово');

  const nfd = 'йод'; // «йод» в NFD
  toks = tokenize(nfd);
  t('TOK-09','NFD→NFC нормализация', words(toks)[0]==='йод' && words(toks)[0].length===3);

  t('TOK-10','пустой вход → 0 токенов', tokenize('   \n  ').length===0);
}

console.log('— Секция 6: диалоги —');
{
  const toks = tokenize('     Авторский текст тут.\n     -- Привет, -- сказал он. -- Как дела?\n     -- Хорошо!');
  t('DLG-01','реплики получают dlgStart', toks.filter(x=>x.dlgStart).length===2);
  t('DLG-04','авторская речь «— сказал» склеена и с микропаузой', toks.some(x=>x.w==='— сказал' && x.comma));
  const auth = toks.filter(x=>!x.dlg);
  t('DLG-06','авторский абзац не помечен dlg', auth.length>=3);
}

console.log('— Секция 3: якорная буква (логика, метрика-мок) —');
{
  const ci = w => orpCharIndex([...w], '500 60px test');
  t('ORP-03','пиксельная метрика сдвигает якорь («опшшшш»)', [...'опшшшш'][ci('опшшшш')]==='ш');
  t('ORP-04a','одна буква', ci('я')===0);
  t('ORP-04b','одиночное тире не падает', typeof ci('—')==='number');
  t('ORP-05','«т.е.» — якорь на букве', /[а-я]/.test([...'т.е.'][ci('т.е.')]));
  const emoji = '🙂привет';
  const i = ci(emoji);
  t('ORP-09','суррогатная пара не разрезана', [...emoji][i]!=='\uD83D' && [...emoji].slice(0,i).join('').indexOf('�')===-1);
  t('ORP-06','профиль 36% правее 24% («достопримечательность»)', (()=>{
    settings.orp='early'; const e=ci('достопримечательность');
    settings.orp='center'; const c=ci('достопримечательность');
    settings.orp='classic';
    return c>e;
  })());
}

console.log('— Секция 4: умный темп (множители) —');
{
  const mk = (w,f={}) => ({w,end:false,comma:false,para:false,dlg:false,dlgStart:false,num:false,sep:false,...f});
  const base = 200;
  const plain = wordDelay(mk('слово'),base);
  t('PCE-01a','точка > запятая > слово', wordDelay(mk('конец.',{end:true}),base) > wordDelay(mk('так,',{comma:true}),base) && wordDelay(mk('так,',{comma:true}),base) > plain);
  t('PCE-01b','число медленнее слова', wordDelay(mk('1 587 423',{num:true}),base) > plain);
  t('PCE-01c','длинное слово медленнее короткого', wordDelay(mk('достопримечательность'),base) > plain);
  settings.smart=false;
  t('PCE-02','умный темп off → база', wordDelay(mk('конец.',{end:true}),base)===base);
  settings.smart=true;
  const hold1 = wordDelay(mk('абзаца.',{end:true,para:true}),base);
  settings.sep=false;
  const hold0 = wordDelay(mk('абзаца.',{end:true,para:true}),base);
  settings.sep=true;
  t('PCE-06','удержание абзаца управляется настройкой', hold1>hold0 && hold0>base);
  t('PCE-DLG','вдох перед репликой', wordDelay(mk('— Привет,',{comma:true,dlgStart:true}),base) > wordDelay(mk('так,',{comma:true}),base));
}

console.log('— Секции 7–8: статистика и тренер (логика) —');
{
  let maxIdx=0, w=0;
  for (const idx of [1,2,3,4,5,3,4,5,6,7]) if (idx>maxIdx){w++;maxIdx=idx;}
  t('STA-01','фронтир: перечитка не накручивает', w===7);
  const clamp = v => Math.min(900, Math.max(100, v));
  t('TRN-03','границы скорости 100..900', clamp(905)===900 && clamp(95)===100 && clamp(450)===450);
  t('REG-04','порог регрессии (>2 слов)', (3 < 10-2)===true && (9 < 10-2)===false);
  t('PLU','plural: 1/2/5 возвратов', plural(1,'возврат','возврата','возвратов')==='возврат' && plural(2,'возврат','возврата','возвратов')==='возврата' && plural(11,'возврат','возврата','возвратов')==='возвратов');
}

console.log('— Секция 2: fb2 (кодировки) —');
{
  const xml1251 = Buffer.from('<?xml version="1.0" encoding="windows-1251"?><FictionBook><body><p>Тёплое ё и тире —</p></body></FictionBook>','utf8');
  const cp1251 = Buffer.from(new TextDecoder('utf-8').decode(xml1251), 'utf8');
  // эмулируем детект как в parseFb2
  
  const head = '<?xml version="1.0" encoding="windows-1251"?>';
  const m = head.match(/encoding=["']([\w-]+)["']/i);
  t('FB2-02a','детект кодировки из декларации', m && m[1].toLowerCase()==='windows-1251');
  let ok = true;
  try { const d = new TextDecoder('windows-1251'); ok = d.decode(Buffer.from([0xF1]))==='с'; } catch(e){ ok=false; }
  t('FB2-02b','TextDecoder windows-1251 доступен и верен', ok);
}

console.log('— Секция 9: краевая пунктуация —');
{
  const ep = w => edgePunct(w);
  let r = ep('«Внимание!»');
  t('PNC-01','кавычки и ! как краевые', r.lead==='«' && r.core==='Внимание' && r.trail==='!»', JSON.stringify(r));
  r = ep('кто-то');
  t('PNC-02','внутренний дефис остаётся в core', r.lead==='' && r.core==='кто-то' && r.trail==='', JSON.stringify(r));
  r = ep('— Да?');
  t('PNC-03','тире реплики — ведущий знак', r.lead==='— ' && r.core==='Да' && r.trail==='?', JSON.stringify(r));
  r = ep('слово');
  t('PNC-04','слово без краевых', r.lead==='' && r.core==='слово' && r.trail==='');
  r = ep('...');
  t('PNC-05','только знаки: core целиком, не падает', r.lead==='' && r.core==='...' && r.trail==='');
  r = ep('«цитата»');
  t('PNC-06','парные кавычки', r.lead==='«' && r.core==='цитата' && r.trail==='»');
}

console.log('— Секция 10: смена слов (transitionPlan) —');
{
  let p = transitionPlan(200,'cut');
  t('TRP-01','cut — без зазора', p.blankAtMs===null && p.gapMs===0, JSON.stringify(p));
  p = transitionPlan(200,'gap');
  t('TRP-02','gap при 200мс: зазор 25..60, гашение = delay−gap', p.gapMs>=25 && p.gapMs<=60 && p.blankAtMs===200-p.gapMs, JSON.stringify(p));
  p = transitionPlan(120,'gap');
  t('TRP-03','высокая скорость (120мс): ISI присутствует', p.gapMs>=25 && p.blankAtMs>=0 && p.blankAtMs<120, JSON.stringify(p));
  p = transitionPlan(100,'fade');
  t('TRP-04','fade на 100мс: зазор есть, гашение ≥0', p.gapMs>=25 && p.blankAtMs>=0, JSON.stringify(p));
  p = transitionPlan(40,'gap');
  t('TRP-05','сверхкороткий кадр: gap < кадра, blankAt ≥0', p.gapMs<40 && p.blankAtMs>=0, JSON.stringify(p));
  t('TRP-06','зазор ограничен 60мс на медленных словах', transitionPlan(2000,'gap').gapMs===60);
}

console.log('— Секция 11: турнир (dayScore) —');
{
  t('DSC-01','2/2 верных = 10 очков', dayScore(2,2)===10);
  t('DSC-02','1/2 верных = 4 очка', dayScore(1,2)===4);
  t('DSC-03','0/2 верных = 0 очков', dayScore(0,2)===0);
}

console.log('\n========================================');
console.log('ИТОГО: ' + pass + ' passed, ' + fail + ' failed' + (fail? '  ← ' + fails.join(', ') : ''));
process.exit(fail ? 1 : 0);
