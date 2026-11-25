/* v0.52 提示系统验收：同形状的板互换后，提示不能指向「已经被占满的位置」
 *
 * 用户反馈的场景：
 *   七巧板里 T1/T2（大三角）、T4/T5（小三角）形状完全一样，
 *   玩家拿 T2 那块去填了 T1 的位置 —— 几何上完全正确、判定也认是拼对了。
 *   这时候点"查找道具"，旧实现按 id 找「哪块还没上板」，看到 T1 还在托盘，
 *   就把提示指到 T1 的槽位 —— 可那个位置已经被 T2 那块占满了，
 *   提示等于让玩家「把同样的板再放一遍」。
 *
 * 修法：提示按「槽位是否已被某块板几何重合地占住」来选，而不是按 id。
 *
 * 用法：node tools/verify_v052.js
 */
const path = require('path');
const ROOT = path.join(__dirname, '..');

/* ---------- 假 Canvas（与 verify_v050_play 同一套） ---------- */
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

console.log('==== v0.52 提示系统验收 ====');

/* 把一块板直接钉到某个标准解槽位上（绕过拖动，等价于「玩家已经摆好」） */
function plant(p, st) {
  p.onBoard = true;
  p.x = st.x; p.y = st.y;
  p.angle = st.angle; p.dAngle = st.angle;
  p.flipped = !!st.flipped; p.dFlipped = !!st.flipped;
  p.z = (S.zSeq = (S.zSeq || 0) + 1);
}

D.useSet('tangram7');
step(16);

/* 用第 46 关（鼠）作为测试台：7 块、无内孔、T1/T2 都是大三角 */
const IDX = 45;
const SET = globalThis.TANGRAM_SETS.tangram7;
const lv = SET.levels[IDX];

D.setupLevel(IDX);
S.page = 'play';
step(16);

console.log(`  关卡：第 ${IDX + 1} 关「${lv.name}」  solution 顺序 ${lv.solution.map(s => s.id).join(',')}`);

const sol = lv.solution;
const slotOf = id => sol.find(s => s.id === id);

/* ---------- 用例 1：全部摆好 → 没得提示 ---------- */
S.pieces.forEach(p => plant(p, slotOf(p.id)));
step(16);
check('七块都摆好时，提示返回 null（"已经拼好啦"）', D.pickHint() === null, 'hint=' + D.pickHint());

/* ---------- 用例 2：T2 那块占了 T1 的位置，T1 回托盘 ----------
 * 这是用户截图里的情形：几何上完全正确（T1/T2 同形），但按 id 看 T1 还没上板。
 * 旧实现会把提示指回 T1 的槽位 —— 那个位置其实已经满了。
 */
const sT1 = slotOf('T1'), sT2 = slotOf('T2');
const pT1 = S.pieces.find(p => p.id === 'T1');
const pT2 = S.pieces.find(p => p.id === 'T2');
plant(pT2, sT1);            // T2 那块顶到 T1 的槽
pT1.onBoard = false;        // T1 那块回托盘
step(16);

check('T2 占了 T1 的槽位 → slotCovered(T1 槽) = true', D.slotCovered(sT1) === true);
check('T1 那块还在托盘', !pT1.onBoard);

const h2 = D.pickHint();
check('提示不再指回已被占满的 T1 槽位', h2 !== 'T1', 'hint=' + h2);
check('提示落在唯一还空着的槽位（T2 的槽）', h2 === 'T2', 'hint=' + h2);

/* ---------- 用例 3：T5 占了 T4 的位置（小三角互换），T4 在托盘 ---------- */
S.pieces.forEach(p => plant(p, slotOf(p.id)));
const sT4 = slotOf('T4'), sT5 = slotOf('T5');
const pT4 = S.pieces.find(p => p.id === 'T4');
const pT5 = S.pieces.find(p => p.id === 'T5');
plant(pT5, sT4);
pT4.onBoard = false;
step(16);
const h3 = D.pickHint();
check('小三角互换后提示也不指回 T4 的槽位', h3 !== 'T4', 'hint=' + h3);
check('小三角互换后提示落在 T5 的槽位', h3 === 'T5', 'hint=' + h3);

/* ---------- 用例 4：槽位空着、对应那块在托盘 → 正常提示它 ---------- */
S.pieces.forEach(p => plant(p, slotOf(p.id)));
const sS = slotOf('S');
const pS = S.pieces.find(p => p.id === 'S');
pS.onBoard = false;
step(16);
const h4 = D.pickHint();
check('空槽 + 托盘有对应块 → 提示那块', h4 === 'S', 'hint=' + h4);

/* ---------- 用例 5：槽位空着、那块上板但摆歪了 → 提示它去补位 ---------- */
S.pieces.forEach(p => plant(p, slotOf(p.id)));
pS.onBoard = true;
pS.x = sS.x + 120; pS.y = sS.y + 120;   // 挪到剪影外
step(16);
const h5 = D.pickHint();
check('槽位空着 + 那块摆歪 → 提示它', h5 === 'S', 'hint=' + h5);

/* ---------- 用例 6：提示的"消失条件"是槽位被填上，不是那块板落位 ---------- */
S.pieces.forEach(p => plant(p, slotOf(p.id)));
plant(pT2, sT1); pT1.onBoard = false;
step(16);
D.useHint();                      // 买一次提示：应指向 T2 的槽
step(16);
const hintId = S.hint && S.hint.id;
check('买到的提示指向 T2 的槽', hintId === 'T2', 'hint=' + hintId);
/* 提示的目标槽（T2 的槽）还是空的 → 提示必须还在 */
step(16);
check('目标槽还空着 → 提示保持显示', !!S.hint);
/* 把 T1 那块从托盘放到 T2 的槽上（它也是大三角，几何完全吻合）*/
plant(pT1, sT2);
step(16);
check('目标槽被填上 → 提示自动消失', !S.hint, S.hint ? 'hint=' + S.hint.id : '');

console.log('');
if (fail) { console.log(`[FAIL] ${fail} 项未通过`); process.exit(1); }
console.log('[OK] 提示系统（同形状互换）验收通过');
