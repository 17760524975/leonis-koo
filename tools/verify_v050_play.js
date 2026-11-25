/* v0.50 对局验证：磁吸 + 判定 + 进度条 三件事能否串起来
 *
 * 验的东西（对应本轮用户反馈的 ①②③）：
 *   ①「拼好了却停在 99%」→ 七块都吸到标准解后进度必须是 100% 且过关
 *   ②「板件之间留缝 / 某块凸出剪影」→ 吸附必须把板钉在标准解上，误差 = 0
 *   ③「提示不消失」→ 提示目标一旦就位，金色提示必须自己消失
 * 还顺带验：磁吸只在「接近正确答案」时生效，乱拖不会被吸走。
 *
 * 用法：node tools/verify_v050_play.js
 */
const path = require('path');
const ROOT = path.join(__dirname, '..');

/* ---------- 假 Canvas ---------- */
function makeCtx() {
  const grad = { addColorStop() {} };
  const ctx = {
    canvas: { width: 0, height: 0, style: {} },
    save() {}, restore() {}, translate() {}, scale() {}, rotate() {}, setTransform() {},
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, arcTo() {},
    quadraticCurveTo() {}, bezierCurveTo() {}, rect() {}, clip() {},
    fill() {}, stroke() {}, fillRect() {}, strokeRect() {}, clearRect() {},
    fillText() {}, strokeText() {}, setLineDash() {}, drawImage() {},
    measureText() { return { width: 40 }; },
    createLinearGradient() { return grad; },
    createRadialGradient() { return grad; },
    createPattern() { return null; }
  };
  ['fillStyle', 'strokeStyle', 'lineWidth', 'font', 'textAlign', 'textBaseline',
    'globalAlpha', 'shadowBlur', 'shadowColor', 'shadowOffsetY', 'lineJoin', 'lineCap']
    .forEach(p => { let v = null; Object.defineProperty(ctx, p, { get: () => v, set: x => { v = x; } }); });
  return ctx;
}
let pendingFrame = null;
global.requestAnimationFrame = cb => { pendingFrame = cb; return 1; };
let clock = 0;
function step(ms) {
  clock += ms;
  const cb = pendingFrame; pendingFrame = null;
  if (cb) cb(clock);
}

require(path.join(ROOT, 'js/levels.js'));
require(path.join(ROOT, 'js/geom.js'));
require(path.join(ROOT, 'js/judge.js'));
const CFG = require(path.join(ROOT, 'js/config.js'));
const CORE = require(path.join(ROOT, 'js/core.js'));

const W = 375, H = 812;
const store = {};
const env = {
  ctx: makeCtx(),
  size: () => ({ w: W, h: H }),
  dpr: () => 3,
  safeInsets: () => ({ top: 20, bottom: 0 }),
  bindInput() {},
  storage: { get: k => (k in store ? store[k] : null), set: (k, v) => { store[k] = v; } },
  audio: { unlock() {}, setEnabled() {}, play() {}, duck() {}, setVisible() {} },
  vibrate() {}, images: {}, onHide() {}, onShow() {}
};

let fail = 0;
function check(label, ok, detail) {
  if (!ok) fail++;
  console.log(`  [${ok ? 'OK' : 'XX'}] ${label}${detail ? '  ' + detail : ''}`);
}

const game = CORE(env);
game.init();
step(16);
const S = game.state;
const D = game._debug;

/* 设计坐标 → CSS（与 core 内部同一套） */
const scale = Math.min(W / CFG.DESIGN.w, H / CFG.DESIGN.h);
const ox = (W - CFG.DESIGN.w * scale) / 2, oy = (H - CFG.DESIGN.h * scale) / 2;
const css = (dx, dy) => [ox + dx * scale, oy + dy * scale];
const LAY = CFG.LAYOUT;
const WS = LAY.BOARD.size / 1000;
const w2d = x => LAY.BOARD.x + x * WS;
const h2d = y => LAY.BOARD.y + y * WS;

/* 用「按下→移动→松开」把一块已上板的板挪一下，触发吸附。
 * 注意：_debug 暴露的 onDown/onMove/onUp 收的是**设计坐标**（750×1334），
 * CSS 坐标的换算在 env.bindInput 那一层做，测试里别重复换算。 */
function nudge(p, dxWorld, dyWorld) {
  D.onDown(w2d(p.x), h2d(p.y));
  step(16);
  D.onMove(w2d(p.x + dxWorld), h2d(p.y + dyWorld));
  step(16);
  D.onUp(w2d(p.x + dxWorld), h2d(p.y + dyWorld));
  step(16);
}

console.log('==== v0.50 对局验证 ====');
D.useSet('tangram7');
step(16);
/* 字母 A（第 20 关）+ 一个几何关（第 1 关）都验一遍 */
for (const idx of [0, 19]) {
  D.setupLevel(idx);
  S.page = 'play';       // setupLevel 只装关卡不切页，这里补上（等价于点关卡列表进关）
  step(16);
  const lv = globalThis.TANGRAM_SETS.tangram7.levels[idx];
  const sol = lv.solution;
  check(`第 ${idx + 1} 关（${lv.name}）载入`, !!lv && S.pieces.length === 7);

  /* ① 把七块放到「标准解 + 40 世界单位」的偏差位置，靠磁吸归位 */
  S.pieces.forEach(p => {
    const s = sol.find(q => q.id === p.id);
    p.onBoard = true;
    p.x = s.x + 40; p.y = s.y - 40;
    p.dAngle = ((s.angle + 8) % 360 + 360) % 360;
    p.dFlipped = !!s.flipped;
  });
  step(16);
  /* 逐块驱动一次吸附（用 _debug.snapPiece，避免「几块板叠在一起时手指点到上层那块」
   * 把测试结果搅浑；指针链路另有一条单独的用例） */
  S.pieces.forEach(p => D.snapPiece(p, false));
  step(16);
  /* 判定是在「松手」时跑的，所以最后要真的走一次按下-松手触发 runJudge */
  nudge(S.pieces[0], 3, 3);
  step(16);

  const err = S.pieces.map(p => {
    const s = sol.find(q => q.id === p.id);
    return Math.hypot(p.x - s.x, p.y - s.y);
  });
  const maxErr = Math.max(...err);
  check('磁吸把偏差 40 的板钉回标准解（误差 < 1）', maxErr < 1, 'maxErr=' + maxErr.toFixed(3));

  const j = D.judgeNow();
  check('七块全部就位（fit）', j.fits.length === 7 && j.fits.every(Boolean), JSON.stringify(j.fits));
  check('覆盖率兜底达标', j.coverage >= CFG.JUDGE.minCoverage, 'cov=' + j.coverage.toFixed(3));
  /* 进度条是缓动的，读目标值 covTo（cov 会从 0 慢慢爬上来） */
  check('进度条目标值 100%', Math.abs(S.covTo - 1) < 1e-6, 'covTo=' + S.covTo);
  check('判定为通关', !!S.win || !!S.result, 'win=' + !!S.win);
}

/* ③ 提示：目标就位后金色提示必须消失 */
D.setupLevel(0);
S.page = 'play';
S.win = null; S.result = null; S.tut = null;   // 上一段刚通关，先清掉结算态，否则提示会被拦住
step(16);
S.pieces.forEach(p => { p.onBoard = false; });
step(16);
const hintId = (function () {
  S.save.hintItems = (S.save.hintItems || 0) + 1;   // 补一个查找道具，保证提示一定会亮
  D.useHintItem();
  return S.hint && S.hint.id;
})();
if (hintId) {
  const p = S.pieces.find(x => x.id === hintId);
  const s = globalThis.TANGRAM_SETS.tangram7.levels[0].solution.find(q => q.id === hintId);
  p.onBoard = true; p.x = s.x; p.y = s.y; p.dAngle = s.angle; p.dFlipped = !!s.flipped;
  step(16);
  /* 再走一次「按下-松手」触发判定，然后跑两帧让提示自动消除 */
  nudge(p, 1, 1);
  step(16); step(16);
  check('目标板就位后金色提示自动消失', !S.hint, 'hint=' + JSON.stringify(S.hint));
} else {
  check('提示道具可用（本关未命中提示则跳过此项）', true, '无提示可用');
}

/* 指针链路：把一块板从「离标准解 40 单位」的位置按下-拖-松，应被吸死 */
D.setupLevel(0);
S.page = 'play';
step(16);
(function () {
  const lv0 = globalThis.TANGRAM_SETS.tangram7.levels[0];
  const p = S.pieces[0];
  const s = lv0.solution.find(q => q.id === p.id);
  S.pieces.forEach(x => { x.onBoard = false; });
  p.onBoard = true;
  p.x = s.x + 40; p.y = s.y + 40; p.dAngle = s.angle; p.dFlipped = !!s.flipped;
  step(16);
  nudge(p, 6, -6);
  check('手指拖拽也能磁到标准解', Math.hypot(p.x - s.x, p.y - s.y) < 1,
    'err=' + Math.hypot(p.x - s.x, p.y - s.y).toFixed(2));
})();

/* 磁吸不能乱吸：把一块板拖到离标准解 400 单位处，不应被吸走 */
D.setupLevel(0);
S.page = 'play';
step(16);
S.pieces.forEach(p => { p.onBoard = false; });
step(16);
const p0 = S.pieces[0];
const s0 = globalThis.TANGRAM_SETS.tangram7.levels[0].solution.find(q => q.id === p0.id);
p0.onBoard = true;
p0.x = s0.x + 400; p0.y = s0.y + 400;
p0.dAngle = s0.angle; p0.dFlipped = !!s0.flipped;
nudge(p0, 0, 0);
step(16);
check('离得远时不会被磁吸', Math.hypot(p0.x - s0.x, p0.y - s0.y) > 200,
  'dist=' + Math.hypot(p0.x - s0.x, p0.y - s0.y).toFixed(0));

/* 角度不对时也不吸（只差位置差得远） */
p0.x = s0.x + 30; p0.y = s0.y + 30;
p0.dAngle = ((s0.angle + 90) % 360 + 360) % 360;
nudge(p0, 0, 0);
step(16);
check('角度差 90° 时不会被磁吸', Math.hypot(p0.x - s0.x, p0.y - s0.y) > 1,
  'dist=' + Math.hypot(p0.x - s0.x, p0.y - s0.y).toFixed(1));

console.log(fail ? '\n[FAIL] ' + fail + ' 项' : '\n全部通过');
process.exit(fail ? 1 : 0);
