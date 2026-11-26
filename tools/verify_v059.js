/* v0.59 验收：蛇关几何修复 + 时限 2:30 + 结算 ×10 图标化 + 提示面板图标化
 *
 * 四条用户反馈，一条对应一组断言：
 *   ① 「蛇始终拼不成功」—— 不是玩家手抖：标准解里 T3 与 T1 压叠 93 单位²
 *      （T3 面积 18432 的 0.5%，超过 pairOverlapTol 0.4%），
 *      所以玩家把 T3 摆到它**自己的槽位**也会被判红，永远停在 6/7。
 *      断言：七块零压叠、剪影面积 = 板面积（零缝、零外扩）、标准解必通关。
 *   ② 倒计时 2 分钟 → 2 分 30 秒。断言：fixedSec = 150、两套数据集每关都 150、
 *      HUD 显示 02:30。
 *   ③ 结算页看视频翻 10 倍，且「看视频」三个汉字换成可爱图标 + 「10倍奖励」。
 *      断言：coinWinAdMul = 10、到账 = gain×10、按钮文案 =「10倍奖励」、
 *      结算页不再出现「看视频」、源码里按钮挂了 icon:'video'。
 *   ④ 提示面板「花 30 巧币 / 看视频」都改成图标；删掉「（含复活与 ×5）」。
 *      断言：面板文案 =「30 · 买 1 次」「免费一次」、底部只剩「本关还可看 N/N 次」。
 * 另外顺带验证本轮修出的凹多边形交叠面积（四巧板「燕尾块」D 之前算不出 100%，
 * 导致摆对了提示还在指它）。
 * 用法：node tools/verify_v059.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');

const rec = { texts: [] };
function makeCtx() {
  const grad = { addColorStop() {} };
  const base = {
    canvas: { width: 0, height: 0, style: {} },
    globalAlpha: 1,
    measureText(s) { return { width: String(s).length * 15 }; },
    createLinearGradient: () => grad, createRadialGradient: () => grad, createPattern: () => null,
    fillText(s, x, y) { rec.texts.push({ s: String(s), x, y }); },
    arc() {}, moveTo() {}, lineTo() {}, fillRect() {}, strokeRect() {},
    setLineDash() {}, save() {}, restore() {}, beginPath() {}, closePath() {}, arcTo() {},
    bezierCurveTo() {}, quadraticCurveTo() {}, rect() {}, translate() {},
    rotate() {}, scale() {}, clip() {}, drawImage() {}, setTransform() {},
    clearRect() {}, ellipse() {}, stroke() {}, fill() {}
  };
  return new Proxy(base, {
    get(t, k) { return k in t ? t[k] : () => {}; },
    set(t, k, v) { t[k] = v; return true; }
  });
}

let pendingFrame = null;
global.requestAnimationFrame = cb => { pendingFrame = cb; return 1; };
let clock = 0;
function step(ms) { clock += ms; const cb = pendingFrame; pendingFrame = null; if (cb) cb(clock); }

require(path.join(ROOT, 'js/levels.js'));
require(path.join(ROOT, 'js/geom.js'));
require(path.join(ROOT, 'js/judge.js'));
const CFG = require(path.join(ROOT, 'js/config.js'));
const CORE = require(path.join(ROOT, 'js/core.js'));

const G = globalThis.TANGRAM_GEOM;
const S7 = globalThis.TANGRAM_SETS.tangram7;
const S4 = globalThis.TANGRAM_SETS.tangram4;
const UNIT = S7.dataset.unitScale;
const LOCAL = {};
Object.keys(S7.dataset.pieces).forEach(id => {
  LOCAL[id] = G.makeLocal(S7.dataset.pieces[id].base).map(v => [v[0] * UNIT, v[1] * UNIT]);
});

let fail = 0;
function check(label, ok, detail) {
  if (!ok) fail++;
  console.log(`  [${ok ? 'OK' : 'XX'}] ${label}${detail ? '  ' + detail : ''}`);
}
function section(t) { console.log('\n== ' + t + ' =='); }
function md5(p) { var __s = p; return require('crypto').createHash('md5').update(/\.js$/i.test(String(__s)) ? Buffer.from(require('./lib/pack.js').strip(require('fs').readFileSync(__s, 'utf8'))) : require('fs').readFileSync(__s)).digest('hex'); }

const store = {};
const adLog = { rewarded: [] };
const env = {
  ctx: makeCtx(),
  tutorial: false,
  size: () => ({ w: 375, h: 812 }),
  dpr: () => 3,
  safeInsets: () => ({ top: 20, bottom: 0 }),
  bindInput() {},
  storage: { get: k => (k in store ? store[k] : null), set: (k, v) => { store[k] = v; } },
  audio: { unlock() {}, setEnabled() {}, play() {}, duck() {}, setVisible() {}, setScene() {} },
  vibrate() {}, images: {}, share() {}, onHide() {}, onShow() {},
  cloud: { enabled: () => false, init(cb) { setTimeout(() => cb('no-cloud'), 0); },
    load(cb) { setTimeout(() => cb('no-cloud'), 0); },
    save(p, cb) { setTimeout(() => cb(null, {}), 0); },
    rank(t, cb) { setTimeout(() => cb(null, { list: [], me: null }), 0); } },
  ad: { placeholder: true, banner() {}, rewarded(kind, cb) { adLog.rewarded.push(kind); cb(true, ''); } }
};

const game = CORE(env);
game.init();
step(16);
const S = game.state, D = game._debug;
D.useSet('tangram7');
step(16);

/* ================= 1. 蛇：几何必须精确铺满 ================= */
section('1. 蛇（第 51 关）标准解：零压叠 + 零缝');
const snake = S7.levels.find(l => l.name === '蛇');
check('找到蛇关', !!snake, snake ? 'id=' + snake.id : '-');
const snPolys = snake.solution.map(st => ({ id: st.id, poly: G.toWorld(LOCAL[st.id], st) }));
const snSum = snPolys.reduce((a, p) => a + G.area(p.poly), 0);
check('七块面积和 = 16u²', Math.abs(snSum - 16 * UNIT * UNIT) < 1,
  (snSum / (UNIT * UNIT)).toFixed(4) + 'u²');
let snOv = 0, snPair = '';
for (let i = 0; i < snPolys.length; i++) {
  for (let j = i + 1; j < snPolys.length; j++) {
    const ov = G.overlapArea(snPolys[i].poly, snPolys[j].poly);
    if (ov > snOv) { snOv = ov; snPair = snPolys[i].id + '×' + snPolys[j].id; }
  }
}
check('任意两块零压叠（<1 单位²）', snOv < 1, snOv.toFixed(3) + ' 单位² ' + snPair);
const snOutA = G.area(snake.outline);
check('剪影面积 − 板面积 ≤ 2 单位²（既无外扩也无缝）',
  Math.abs(snOutA - snSum) <= 2, (snOutA - snSum).toFixed(2));
const snBad = snPolys.filter(p => !G.pieceInside(p.poly, snake.outline, snake.holes || [], 0.75)).map(p => p.id);
check('七块都完整落在剪影内', snBad.length === 0, snBad.join(',') || '全部 OK');

/* ================= 2. 运行时：57 关标准解都要能通关 ================= */
section('2. 运行时判定：每一关摆出标准解都能过');
let notWin = [], worstIssue = '';
S7.levels.forEach((lv, idx) => {
  D.setupLevel(idx);
  S.page = 'play'; S.win = null; S.result = null;
  step(16);
  S.pieces.forEach(p => {
    const st = lv.solution.find(q => q.id === p.id);
    if (!st) return;
    p.onBoard = true; p.x = st.x; p.y = st.y;
    p.angle = st.angle; p.dAngle = st.angle;
    p.flipped = !!st.flipped; p.dFlipped = !!st.flipped;
  });
  step(16);
  D.runJudge(false);
  step(16);
  if (!S.win) {
    notWin.push(lv.name + '(' + S.pieces.filter(p => !p.fit).map(p => p.id + ':' + p.issue).join(',') + ')');
    if (!worstIssue) worstIssue = lv.name;
  }
});
check('57 关全部可通关（含蛇）', notWin.length === 0, notWin.join(' ') || '57/57');

/* ================= 3. 倒计时 2 分 30 秒 ================= */
section('3. 倒计时 120 → 150 秒');
check('TIMER.fixedSec = 150', CFG.TIMER.fixedSec === 150, String(CFG.TIMER.fixedSec));
let secOk = true, secSeen = {};
['tangram4', 'tangram7'].forEach(k => {
  D.useSet(k); step(16);
  D.LEVELS.forEach(lv => { const t = D.timeLimitOf(lv); secSeen[k + ':' + lv.id] = t; if (t !== 150) secOk = false; });
});
check('两套数据集每关都是 150 秒', secOk,
  Object.keys(secSeen).length + ' 关，取值 ' + Array.from(new Set(Object.values(secSeen))).join('/'));
D.useSet('tangram7'); step(16);
D.setupLevel(0); S.page = 'play'; S.win = null; step(16);
rec.texts.length = 0;
step(16);
check('对局 HUD 显示 02:30', rec.texts.some(t => t.s === '02:30'),
  rec.texts.filter(t => /^\d\d:\d\d$/.test(t.s)).map(t => t.s).join(','));
check('三颗心按 50 秒一档（150/3）', Math.abs(CFG.TIMER.fixedSec / CFG.TIMER.hearts - 50) < 1e-9,
  String(CFG.TIMER.fixedSec / CFG.TIMER.hearts));

/* ================= 4. 结算页：翻 10 倍 + 图标 ================= */
section('4. 结算页看视频 = 10 倍奖励（图标 + 文案）');
check('ECON.coinWinAdMul = 10', CFG.ECON.coinWinAdMul === 10, String(CFG.ECON.coinWinAdMul));
const coreSrc = fs.readFileSync(path.join(ROOT, 'js/core.js'), 'utf8');
check('结算按钮挂了 icon：\'video\' + iconInline', /id: 'win_ad5'[\s\S]{0,220}icon: 'video', iconInline: true/.test(coreSrc),
  /id: 'win_ad5'[\s\S]{0,220}icon: 'video'/.test(coreSrc) ? '有 icon' : '没找到');
check('按钮文案是「N倍奖励」（不再写「看视频」）', /label: canAd \? \(mul \+ '倍奖励'\)/.test(coreSrc),
  /倍奖励/.test(coreSrc) ? '有「倍奖励」' : '-');
check('源码里有可爱风 video 图标的绘制分支', coreSrc.indexOf("name === 'video'") > 0);

/* 首通 → 结算页文字 → 点 ×10 → 到账 */
delete S.save.starOf[String(S7.levels[0].id)];
S.save.streak = 0; S.save.streakSeen = [];
S.save.coin = 0;
D.setupLevel(0);
S.page = 'play'; S.elapsed = 0; S.steps = 0;
D.win();
step(16);
const gain0 = S.result.gain;
const cAfterWin = S.save.coin;
check('首通落账 +' + gain0, cAfterWin === gain0, '+' + cAfterWin);

S.overlay = 'result'; S.resT = 2000; S.starShown = 3;
rec.texts.length = 0;
step(16);
let tx = rec.texts.map(t => t.s);
check('结算页出现「10倍奖励」按钮', tx.indexOf('10倍奖励') >= 0, tx.filter(s => /倍奖励|看视频/.test(s)).join('|'));
check('结算页不再出现「看视频」字样', !tx.some(s => /看视频/.test(s)),
  tx.filter(s => /看视频/.test(s)).join('|'));

const cBefore = S.save.coin;
D.fireBtn('win_ad5');
step(16);
check('到账 = 首通 × 10（补发 9 倍）', S.save.coin - cBefore === gain0 * 9,
  '+' + (S.save.coin - cBefore) + ' / 期望 +' + (gain0 * 9));
rec.texts.length = 0;
step(16);
tx = rec.texts.map(t => t.s);
check('翻倍后文案写「已翻 10 倍」', tx.some(s => /已翻 10 倍/.test(s)),
  tx.filter(s => /已翻/.test(s)).join('|'));
/* 翻倍后 adUsed 锁住，×N 入口整块消失（「本关已看完」只在额度用完时出现） */
check('翻倍后 ×10 入口消失', tx.indexOf('10倍奖励') < 0,
  tx.filter(s => /倍奖励/.test(s)).join('|') || '已消失');

/* ================= 5. 提示面板：图标化 + 删括号 ================= */
section('5. 提示面板：巧币 / 视频都改成图标');
D.setupLevel(1);
S.page = 'play'; S.overlay = null; S.win = null;
S.save.hintItems = 0;
S.save.coin = 300;
step(16);
rec.texts.length = 0;
D.fireBtn('hint');
step(16);
const ptx = rec.texts.map(t => t.s);
check('面板打开', S.overlay === 'hint', 'overlay=' + S.overlay);
check('巧币按钮文案 =「30 · 买 1 次」（金币图标 + 数字）',
  ptx.some(s => s === (CFG.HINT.coinCost + ' · 买 1 次')), ptx.filter(s => /买 1 次|巧币/.test(s)).join('|'));
check('视频按钮文案 =「免费一次」（视频图标 + 文案）',
  ptx.some(s => s === '免费一次'), ptx.filter(s => /免费|看视频/.test(s)).join('|'));
check('面板里不再有「花 N 巧币」/「看视频」汉字',
  !ptx.some(s => /花 \d+ 巧币|看视频/.test(s)), ptx.filter(s => /花 |看视频/.test(s)).join('|'));
check('底部小字只留「本关还可看 N/N 次」，括号内容已删',
  ptx.some(s => /^本关还可看 \d+\/\d+ 次$/.test(s)) && !ptx.some(s => /含复活/.test(s)),
  ptx.filter(s => /本关还可看/.test(s)).join('|'));
check('源码：两个按钮都走 iconInline', /id: 'hint_coin'[\s\S]{0,400}iconInline: true/.test(coreSrc) &&
  /id: 'hint_ad'[\s\S]{0,400}iconInline: true/.test(coreSrc));

/* ================= 6. 顺带修的凹多边形交叠面积 ================= */
section('6. 凹多边形（四巧板燕尾块 D）也能算出 100% 覆盖');
D.useSet('defaultSet'); step(16);
D.setupLevel(0); S.page = 'play'; S.overlay = null; step(16);
const lv4 = D.LEVELS[0];
S.pieces.forEach(p => {
  const st = lv4.solution.find(q => q.id === p.id);
  if (!st) return;
  p.onBoard = true; p.x = st.x; p.y = st.y;
  p.angle = st.angle; p.dAngle = st.angle; p.flipped = !!st.flipped; p.dFlipped = !!st.flipped;
});
step(16);
const covAll = lv4.solution.every(st => D.slotCovered(st));
check('四巧板第 1 关全摆对后每个槽位都算「已占」', covAll,
  lv4.solution.map(st => st.id + '=' + D.slotCovered(st)).join(' '));
check('全摆对后提示选块返回 null（不再乱指）', D.pickHint() === null, String(D.pickHint()));

/* ================= 7. 三端同步 ================= */
section('7. 三端模块一致');
['config.js', 'geom.js', 'levels.js', 'core.js'].forEach(f => {
  const a = md5(path.join(ROOT, 'js', f));
  const b = md5(path.join(ROOT, 'preview/js', f));
  const c = md5(path.join(ROOT, 'miniprogram/js', f));
  check(f + ' 三端一致', a === b && b === c, a.slice(0, 8) + '/' + b.slice(0, 8) + '/' + c.slice(0, 8));
});

console.log('\n' + (fail ? '!! ' + fail + ' 项未通过' : 'v0.59 验收全部通过'));
process.exit(fail ? 1 : 0);
