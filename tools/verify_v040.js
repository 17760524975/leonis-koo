/* v0.40 专项验收：星级奖励「升星补差价」+ 泡泡 / 萤火背景上架
 * 用法：node tools/verify_v040.js
 *
 * 用户这一版的需求原文：
 *   「这样已经通过的关卡再次玩，如果星级从 1 星玩到了 2 星或 3 星，需要再次给玩家
 *     补齐差价并且也可以看视频翻 5 倍。比如当前通关 1 星已得到 21 巧币，1 星玩到
 *     2 星给 11 巧币，1 星玩到 3 星给 31 巧币，2 星玩到 3 星给 21 巧币，看视频对获得
 *     的巧币数量进行翻 5 倍。」
 *   「另外泡泡漂浮和萤火之森的背景加上 100 巧币进行购买。」
 *
 * 断言口径：
 *   A. 配置：starReward = [21,32,53]（累计总额，不是单次增量），旧 coinFirst 已下线；
 *      背景泡泡 / 萤火各 100 巧币；
 *   B. 首通 1★/2★/3★ 分别进账 21 / 32 / 53；
 *   C. 升星补差：1★→2★ +11、2★→3★ +21、1★→3★ +32（逐级和 = 跨级，不多不少）；
 *   D. 同星级重打 / 已满 3★ 重打 → 0，每关总额恒定封顶 53；
 *   E. 补差也能看视频 ×5，且加成**不写进**已发账（之后再升星仍按基础额补差）；
 *   F. 老存档（无 starPaid）按旧口径 2/3/5 记账，升星时把历史差额补上；
 *   G. 关卡列表：已通关未满 3 星的卡片出现「↑差额」角标，满 3 星不出现；
 *   H. 云合并 starPaid 取 max（两设备各升一次星不会重复发）；
 *   I. 三端 core.js / config.js 逐字节一致。
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');

/* ---------- 画布桩：记录文字，供角标 / 结算文案断言 ---------- */
const rec = { texts: [] };
function makeCtx() {
  const grad = { addColorStop() {} };
  const base = {
    canvas: { width: 0, height: 0, style: {} },
    globalAlpha: 1,
    measureText(s) { return { width: String(s).length * 15 }; },
    createLinearGradient: () => grad, createRadialGradient: () => grad, createPattern: () => null,
    fillText(s, x, y) { rec.texts.push({ s: String(s), x, y, fill: String(base.fillStyle) }); },
    fill() {}, fillRect() {}, stroke() {}, arc() {}, moveTo() {}, lineTo() {}, strokeRect() {},
    setLineDash() {}, save() {}, restore() {}, beginPath() {}, closePath() {}, arcTo() {},
    bezierCurveTo() {}, quadraticCurveTo() {}, rect() {}, translate() {},
    rotate() {}, scale() {}, clip() {}, drawImage() {}, setTransform() {},
    clearRect() {}, ellipse() {}
  };
  return new Proxy(base, { get(t, k) { return k in t ? t[k] : () => {}; }, set(t, k, v) { t[k] = v; return true; } });
}

let pendingFrame = null;
let clock = 0;
global.requestAnimationFrame = cb => { pendingFrame = cb; return 1; };
function step(ms) { clock += (ms || 16); const cb = pendingFrame; pendingFrame = null; if (cb) cb(clock); }

require(path.join(ROOT, 'js/levels.js'));
require(path.join(ROOT, 'js/geom.js'));
require(path.join(ROOT, 'js/judge.js'));
const CFG = require(path.join(ROOT, 'js/config.js'));
const CORE = require(path.join(ROOT, 'js/core.js'));

let fail = 0, total = 0;
function check(label, ok, detail) {
  total++;
  if (!ok) fail++;
  console.log(`  [${ok ? 'OK' : 'XX'}] ${label}${detail ? '  ' + detail : ''}`);
}
function section(t) { console.log('\n== ' + t + ' =='); }

const store = {};
const adLog = { rewarded: [] };
const env = {
  ctx: makeCtx(), tutorial: false,
  size: () => ({ w: 375, h: 812 }), dpr: () => 3,
  safeInsets: () => ({ top: 20, bottom: 0 }),
  bindInput(fn) { env._in = fn; },
  storage: { get: k => (k in store ? store[k] : null), set: (k, v) => { store[k] = v; } },
  audio: { unlock() {}, setEnabled() {}, play() {}, duck() {}, setVisible() {}, setScene() {},
    setSfxStyle() {} },
  vibrate() {}, images: {}, onHide() {}, onShow() {}, share() {},
  ad: { placeholder: true, banner() {},
    rewarded(kind, cb) { adLog.rewarded.push(kind); cb(true, ''); } }
};

const game = CORE(env);
game.init();
step();
const S = game.state, D = game._debug;
const E = CFG.ECON, SR = E.starReward;

/* 把某一关的「星级 + 已发额」摆成指定状态；stars=0 表示没通关 */
function setLv(idx, stars, paid) {
  const k = String(idx + 1);
  if (stars > 0) {
    S.save.starOf[k] = stars;
    S.save.starPaid[k] = (typeof paid === 'number') ? paid : SR[stars - 1];
  } else {
    delete S.save.starOf[k];
    delete S.save.starPaid[k];
  }
}
/* 打一局并返回本局进账（按目标星级摆好用时/步数） */
function playWin(idx, stars) {
  const L = D.LEVELS[idx];
  D.setupLevel(idx);
  S.hintUsed = false;
  if (stars === 3) { S.elapsed = 0; S.steps = 0; }
  else if (stars === 2) { S.elapsed = L.parTime * 1.2; S.steps = 999; }
  else { S.elapsed = L.parTime * 6; S.steps = 999; }
  const c0 = S.save.coin;
  D.win();
  return S.save.coin - c0;
}

/* ================= 1. 配置 ================= */
section('1. 配置：奖励总额表 / 旧字段下线 / 背景上架');
/* v0.41 起具体数值由 verify_v041 负责，本脚本只验「总额制」这套机制，
 * 数值一律从 config 的 starReward 推导 —— 以后再调数字不用改这里。 */
check('星级总额表 3 档且严格递增',
  SR.length === 3 && SR[0] > 0 && SR[0] < SR[1] && SR[1] < SR[2], JSON.stringify(SR));
const STEP1 = SR[1] - SR[0], STEP2 = SR[2] - SR[1], STEP13 = SR[2] - SR[0];
check('逐级差价为正（升星有回报）', STEP1 > 0 && STEP2 > 0, STEP1 + '/' + STEP2);
check('跨级 = 两段逐级之和（不会比逐级少）', STEP13 === STEP1 + STEP2,
  STEP13 + ' vs ' + (STEP1 + STEP2));
check('旧字段 coinFirst 已下线', E.coinFirst === undefined, String(E.coinFirst));
check('结算翻倍仍为 ×5', E.coinWinAdMul === 5, String(E.coinWinAdMul));
check('泡泡漂浮 100 巧币', CFG.BG_FX.bubbles.price === 100, String(CFG.BG_FX.bubbles.price));
check('萤火之森 100 巧币', CFG.BG_FX.firefly.price === 100, String(CFG.BG_FX.firefly.price));
check('付费背景共 5 套（3×150 + 2×100）',
  Object.keys(CFG.BG_FX).filter(k => CFG.BG_FX[k].price).length === 5,
  Object.keys(CFG.BG_FX).filter(k => CFG.BG_FX[k].price).join(','));

/* ================= 2. 首通 ================= */
section('2. 首通：按 starReward 全额发放');
[[1, SR[0]], [2, SR[1]], [3, SR[2]]].forEach(function (c) {
  setLv(0, 0);
  S.save.streak = 0; S.save.streakSeen = [];
  const gained = playWin(0, c[0]);
  check(`${c[0]}★ 首通 → +${c[1]} 巧币`,
    gained === c[1] && S.result.first === true && S.result.gain === c[1],
    `+${gained} gain=${S.result.gain} first=${S.result.first}`);
});

/* ================= 3. 升星补差 ================= */
section('3. 升星补差：只补差额，不重发');
setLv(0, 1, SR[0]);
let g = playWin(0, 2);
check('1★ → 2★ 补 +' + STEP1, g === STEP1 && S.result.gain === STEP1 && !S.result.first,
  `+${g} first=${S.result.first}`);
check('账记到 2★ 总额', S.save.starPaid['1'] === SR[1], String(S.save.starPaid['1']));

g = playWin(0, 3);
check('2★ → 3★ 补 +' + STEP2, g === STEP2 && S.result.gain === STEP2, `+${g}`);
check('账记到 3★ 总额', S.save.starPaid['1'] === SR[2], String(S.save.starPaid['1']));

g = playWin(0, 3);
check('已 3★ 再打 3★ → +0', g === 0 && S.result.gain === 0, `+${g}`);

g = playWin(0, 1);
check('已 3★ 打出 1★ → 也 +0（不回退星也不发钱）',
  g === 0 && S.save.starOf['1'] === 3, `+${g} best=${S.save.starOf['1']}`);

setLv(0, 1, SR[0]);
g = playWin(0, 3);
check('1★ 直接打回 3★ → 补 +' + STEP13 + '（跨级）', g === STEP13, `+${g}`);

setLv(0, 2, SR[1]);
g = playWin(0, 3);
check('2★ → 3★ 补 +' + STEP2 + '（另一条路径）', g === STEP2, `+${g}`);

/* ================= 4. 同星级重打 ================= */
section('4. 同星级重打：一分不发');
setLv(0, 2, SR[1]);
g = playWin(0, 2);
check('2★ 重打 2★ → +0', g === 0 && S.result.gain === 0, `+${g}`);
setLv(0, 1, SR[0]);
g = playWin(0, 1);
check('1★ 重打 1★ → +0', g === 0, `+${g}`);

/* ================= 5. 看视频 ×5 ================= */
section('5. 升星补差也能 ×5，且加成不进「已发账」');
setLv(0, 1, SR[0]);
g = playWin(0, 2);
const beforeAd = S.save.coin;
D.fireBtn('win_ad5');
const mul = CFG.ECON.coinWinAdMul;
check('升星后能点 ×5（补差 ' + STEP1 + ' → +' + (STEP1 * (mul - 1)) + '）',
  S.save.coin - beforeAd === STEP1 * (mul - 1),
  `+${S.save.coin - beforeAd} kinds=${adLog.rewarded.join(',')}`);
check('翻倍后账仍是 2★ 总额（加成不写进 starPaid）', S.save.starPaid['1'] === SR[1],
  String(S.save.starPaid['1']));
g = playWin(0, 3);
check('翻过倍再升 3★ 仍按基础额补 +' + STEP2 + '（不被加成冲掉）', g === STEP2, `+${g}`);

/* ================= 6. 总额封顶 ================= */
section('6. 每关总额恒定封顶（刷不出更多）');
setLv(0, 0);
let sum = 0;
for (let i = 0; i < 8; i++) sum += playWin(0, i % 2 === 0 ? 3 : 1);
check('首通 + 连打 7 次，累计只到 3★ 总额', sum === SR[2], '累计 +' + sum);
check('存档里的已发账 = 3★ 总额', S.save.starPaid['1'] === SR[2], String(S.save.starPaid['1']));

/* ================= 7. 关卡列表角标 ================= */
section('7. 关卡列表：未满 3 星标出可补差额');
D.go('levels');
S.overlay = null; S.fade = 1; S.pageT = 9999;   /* 页面本身就是 levels，别再改回 home */
check('已切到关卡页', S.page === 'levels', S.page);
setLv(0, 1, SR[0]);
rec.texts.length = 0;
step(16);
check('1★ 卡片出现「↑' + STEP1 + '」角标', rec.texts.some(t => t.s === '↑' + STEP1),
  rec.texts.filter(t => /↑/.test(t.s)).map(t => t.s).join(','));
setLv(0, 2, SR[1]);
rec.texts.length = 0;
step(16);
check('2★ 卡片出现「↑' + STEP2 + '」角标', rec.texts.some(t => t.s === '↑' + STEP2),
  rec.texts.filter(t => /↑/.test(t.s)).map(t => t.s).join(','));
setLv(0, 3);
rec.texts.length = 0;
step(16);
check('3★ 卡片不再出现角标', !rec.texts.some(t => /↑/.test(t.s)),
  rec.texts.filter(t => /↑/.test(t.s)).map(t => t.s).join(','));

/* ================= 8. 老存档迁移 ================= */
section('8. 老存档：按旧口径记账，升星补历史差额');
const rawKey = D.saveKey;
const oldSave = JSON.parse(store[rawKey]);
delete oldSave.starPaid;              // 模拟 v0.39 及以前的存档
oldSave.starOf = { '1': 1 };          // 老玩家：第 1 关 1★（当时只拿了 2 巧币）
oldSave.coin = 100;
store[rawKey] = JSON.stringify(oldSave);
const game2 = CORE(env);
game2.init();
step(16);
const S2 = game2.state, D2 = game2._debug;
check('迁移后 starPaid[1] = 2（旧口径金额）', S2.save.starPaid['1'] === 2, String(S2.save.starPaid['1']));
D2.setupLevel(0);
S2.elapsed = D2.LEVELS[0].parTime * 1.2; S2.steps = 999;
const c2 = S2.save.coin;
D2.win();
check('老档 1★ → 2★ 补 +' + (SR[1] - 2) + '（2★ 总额 - 旧口径 2）',
  S2.save.coin - c2 === SR[1] - 2, `+${S2.save.coin - c2}`);
check('迁移后升星照常记账到 2★ 总额', S2.save.starPaid['1'] === SR[1], String(S2.save.starPaid['1']));

/* ================= 9. 云合并 ================= */
section('9. 云合并：starPaid 取 max');
const a = { updatedAt: 1, starOf: { '1': 2 }, starPaid: { '1': SR[1] }, coin: 10 };
const b = { updatedAt: 2, starOf: { '1': 1 }, starPaid: { '1': SR[0] }, coin: 5 };
const m = D.mergeSave(a, b);
check('两设备各升一次星 → 已发账取较大值', m.starPaid['1'] === SR[1], JSON.stringify(m.starPaid));
check('星级取 max 3 仍是 2★ 的那份（不凭空涨星）', m.starOf['1'] === 2, JSON.stringify(m.starOf));

/* ================= 10. 三端一致 ================= */
section('10. 三端同步与包体积');
const md5 = p => crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex');
['config.js', 'core.js'].forEach(function (f) {
  const a1 = md5(path.join(ROOT, 'js', f));
  const p1 = md5(path.join(ROOT, 'preview/js', f));
  const m1 = md5(path.join(ROOT, 'miniprogram/js', f));
  check(`${f} 三端逐字节一致`, a1 === p1 && a1 === m1, a1.slice(0, 8) + '/' + p1.slice(0, 8) + '/' + m1.slice(0, 8));
});
function dirSize(d) {
  let t = 0;
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    t += f.isDirectory() ? dirSize(p) : fs.statSync(p).size;
  }
  return t;
}
const mb = dirSize(path.join(ROOT, 'miniprogram')) / 1048576;
check('主包 < 4MB', mb < 4, mb.toFixed(2) + 'MB');

console.log(`\n${total - fail}/${total} 项通过${fail ? '，' + fail + ' 项失败' : ''}`);
process.exit(fail ? 1 : 0);
