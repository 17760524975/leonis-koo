/* 诊断：第 1 关教学到底什么时候出现（v0.25 规则）
 * 用法：node tools/diag_tut.js
 *
 * 走真实点击路径（主页 → 四巧板入口 → 关卡列表第 1 格），不直接 setupLevel，
 * 分别试四种存档状态：
 *   A. 全新存档（没通关过）            → 应该教
 *   B. 第 1 关已通关（starOf['1']=3）  → 应该不教
 *   C. 教学进行到一半就退出（未通关）  → 应该还教
 *   D. 重置进度之后                    → 应该教
 * 对比 state.tut 与屏幕上是否出现指令，判断是"规则不显示"还是"渲染坏了"。
 *
 * v0.25 的关键变化：判据不再是存档里的一次性标记 tutDone，而是
 * 「第 1 关这一关通没通关」。没通关就一直教，通关过一次就安静。
 */
const path = require('path');
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
    fill() {}, stroke() {}, arc() {}, moveTo() {}, lineTo() {}, fillRect() {}, strokeRect() {},
    setLineDash() {}, save() {}, restore() {}, beginPath() {}, closePath() {}, arcTo() {},
    bezierCurveTo() {}, quadraticCurveTo() {}, rect() {}, translate() {},
    rotate() {}, scale() {}, clip() {}, drawImage() {}, setTransform() {},
    clearRect() {}, ellipse() {}
  };
  return new Proxy(base, { get(t, k) { return k in t ? t[k] : () => {}; }, set(t, k, v) { t[k] = v; return true; } });
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

function boot() {
  const store = {};
  const env = {
    ctx: makeCtx(),
    size: () => ({ w: 375, h: 812 }),
    dpr: () => 3,
    safeInsets: () => ({ top: 20, bottom: 0 }),
    bindInput(fn) { env._in = fn; },
    storage: { get: k => (k in store ? store[k] : null), set: (k, v) => { store[k] = v; } },
    audio: { unlock() {}, setEnabled() {}, play() {}, duck() {}, setVisible() {}, setScene() {} },
    vibrate() {}, images: {}, share() {}, onHide() {}, onShow() {},
    cloud: { enabled: () => false, init(cb) { setTimeout(() => cb('no-cloud'), 0); },
      load(cb) { setTimeout(() => cb('no-cloud'), 0); },
      save(p, cb) { setTimeout(() => cb(null, {}), 0); },
      rank(t, cb) { setTimeout(() => cb(null, { list: [], me: null }), 0); } },
    ad: { placeholder: true, banner() {}, rewarded(k, cb) { cb(true, ''); } }
  };
  const game = CORE(env);
  game.init();
  step(16);
  return { game, store, env };
}

/* 关卡列表第 1 格（与 smoke.js 同一套式子） */
function cell1() {
  const CW = 160, CH = 196, GX = 16, COLS = 4, PH = 64;
  const gridW = COLS * CW + (COLS - 1) * GX;
  return [(CFG.DESIGN.w - gridW) / 2 + CW / 2, CFG.SAFE.top + 96 + PH + 66 + CH / 2];
}
/* 设计坐标 → css 坐标（env.size 375×812，设计稿 750×1624，即 /2） */
function press(env, dx, dy) {
  env._in('down', dx / 2, dy / 2);
  step(16);
  env._in('up', dx / 2, dy / 2);
  step(16);
}

function enterLevel1(game, env) {
  const D = game._debug, S = game.state;
  D.fireBtn('set_t4');
  for (let k = 0; k < 8; k++) step(16);
  const [cx, cy] = cell1();
  press(env, cx, cy);
  for (let k = 0; k < 8; k++) step(16);
  return { page: S.page, idx: S.levelIdx, tut: !!S.tut, star1: S.save.starOf['1'] || 0 };
}

function screenTexts(game, env) {
  rec.texts.length = 0;
  step(16);
  return rec.texts.map(t => t.s);
}

function report(tag, note, r, tx) {
  console.log(tag + ' —— ' + note);
  console.log('   进关结果 =', JSON.stringify(r));
  console.log('   屏幕含教学指令 =', tx.some(t => /拖进来|虚影/.test(t)) ? 'YES' : 'NO',
    '|', tx.filter(t => /拖进来|虚影|跳过/.test(t)).join(' / '));
  console.log('');
}

console.log('第 1 关教学诊断（版本 ' + CFG.version + '，规则：未通关就一直教）\n');

/* ---------- A. 全新存档 ---------- */
{
  const { game, env } = boot();
  const r = enterLevel1(game, env);
  const tx = screenTexts(game, env);
  report('A. 全新存档', '第 1 关没通关 → 应该教', r, tx);
}

/* ---------- B. 第 1 关已通关 ---------- */
{
  const { game, env } = boot();
  game.state.save.starOf['1'] = 3;
  const r = enterLevel1(game, env);
  const tx = screenTexts(game, env);
  report('B. 第 1 关已通关（3 星）', '通关过一次 → 应该不教', r, tx);
}

/* ---------- C. 中途退出后重进 ---------- */
{
  const { game, env } = boot();
  const S = game.state;
  enterLevel1(game, env);
  const first = !!S.tut;
  game._debug.fireBtn('back_levels');
  for (let k = 0; k < 8; k++) step(16);
  const r = enterLevel1(game, env);
  console.log('C. 教学进行到一半退出再重进 —— 未通关 → 应该还教');
  console.log('   第一次进关 tut =', first, '| 存档里 tutDone =', JSON.stringify(S.save.tutDone),
    '（v0.25 起不再写这个字段）');
  console.log('   重进 tut =', r.tut);
  console.log('');
}

/* ---------- D. 设置页「重置进度」之后 ---------- */
{
  const { game, env } = boot();
  const S = game.state;
  S.save.starOf['1'] = 3;              // 先假装通关过
  game._debug.fireBtn('reset_progress');
  for (let k = 0; k < 8; k++) step(16);
  const r = enterLevel1(game, env);
  report('D. 重置进度后', '星级被清空 → 教学应该自己回来', r, screenTexts(game, env));
}

/* ---------- E. 设置页热区（v0.25：教学入口已删，只剩「重置进度」）---------- */
{
  const { game } = boot();
  const S = game.state;
  S.page = 'home'; S.fade = 1; S.overlay = 'settings';
  step(16);
  const hs = game._debug.hitList();
  console.log('E. 设置页热区');
  hs.forEach(h => console.log('   ', h.id,
    '中心', Math.round(h.x + h.w / 2) + ',' + Math.round(h.y + h.h / 2),
    '尺寸', Math.round(h.w) + '×' + Math.round(h.h)));
  console.log('   是否还有 replay_tut =', hs.some(h => h.id === 'replay_tut') ? 'YES（不该有）' : 'no');
  console.log('');
}

/* ---------- F. 真点「关闭」---------- */
{
  const { game, env } = boot();
  const S = game.state;
  S.page = 'home'; S.fade = 1; S.overlay = 'settings';
  step(16);
  const h = game._debug.hitList().find(x => x.id === 'close_settings');
  const y = h.y + h.h / 2;
  env._in('down', 375 / 2, y / 2);
  step(16);
  console.log('F. 点「关闭」');
  console.log('   down 后 state.press =', S.press);
  env._in('up', 375 / 2, y / 2);
  step(16);
  console.log('   up 后 overlay =', S.overlay);
  console.log('');
}
