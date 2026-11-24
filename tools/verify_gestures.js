/* v0.3 正式版 · V4/V5/V6 + v0.3.1 A3 + v0.4 A1~A3 交互实测（375 宽移动模拟，纯 Node 无头）
 * 覆盖：
 *   V5 边吸附：平行偏移吸附生效 / 顶点优先级不被破坏
 *   V6 环形手势：环形区起点旋转、板内起点拖拽
 *   V4 提示：面板付费入口（v0.20 起单档常驻、不再封顶星级）
 *   A3(0.3.1) 旋转手柄：点手柄转45° / 拖手柄绕圈
 *   v0.4 A1 双击翻转回归：同板件两次短 tap（<300ms、位移<10px）→ 翻转；
 *                        单击 / 超时 / 换板件 / 拖动 均不翻转；底部按钮翻转仍有效
 *   v0.4 A2 长按翻转彻底移除：按住 500ms+ 不翻转、无 longPress 状态
 *   v0.4 A3 底部按钮 tip 汉字删除（core.js 已无 sub 绘制，此处只验按钮功能）
 * 用法：node tools/verify_gestures.js
 */
const path = require('path');
const ROOT = path.join(__dirname, '..');
require('../js/levels.js');
const G = require('../js/geom.js');
const J = require('../js/judge.js');
const C = require('../js/config.js');
const CFG = C;   // v0.9：读版式常量用（工具栏 y 不再写死）
const CORE = require('../js/core.js');
const S7 = globalThis.TANGRAM_SETS.tangram7;

let fail = 0;
function check(label, ok, detail) {
  if (!ok) fail++;
  console.log(`  [${ok ? 'OK' : 'XX'}] ${label}${detail ? '  ' + detail : ''}`);
}

/* ---------- Canvas / rAF / 输入 mock（与 verify_tangram7.js 同构） ---------- */
const fillLog = [];   // B2 高亮验收：记录每帧 fillStyle 赋值
function makeCtx() {
  const grad = { addColorStop() {} };
  return {
    set fillStyle(v) { fillLog.push(v); },
    get fillStyle() { return ''; },
    canvas: { width: 0, height: 0, style: {} },
    save() {}, restore() {}, translate() {}, scale() {}, rotate() {}, setTransform() {},
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, arcTo() {},
    quadraticCurveTo() {}, bezierCurveTo() {}, rect() {}, clip() {},
    fill() {}, stroke() {}, fillRect() {}, strokeRect() {}, clearRect() {},
    fillText() {}, strokeText() {}, setLineDash() {}, drawImage() {},
    measureText() { return { width: 40 }; },
    createLinearGradient() { return grad; }, createRadialGradient() { return grad; },
    createPattern() { return null; }
  };
}
let pendingFrame = null;
global.requestAnimationFrame = cb => { pendingFrame = cb; return 1; };
let clock = 0;
function step(ms) { clock += ms; const cb = pendingFrame; pendingFrame = null; if (cb) cb(clock); }

const store = {};
const W = 375, H = 812, DPR = 3;
let inputFn = null;
const env = {
  ctx: makeCtx(),
  tutorial: false,   // v0.21：这些脚本专测横向系统，关掉第 1 关教学
  size: () => ({ w: W, h: H }), dpr: () => DPR,
  safeInsets: () => ({ top: 20, bottom: 0 }),
  bindInput: fn => { inputFn = fn; },
  storage: { get: k => (k in store ? store[k] : null), set: (k, v) => { store[k] = v; } },
  audio: { unlock() {}, setEnabled() {}, play() {}, duck() {}, setVisible() {} },
  vibrate() {}, images: {}, onHide() {}, onShow() {}
};
const scale = Math.min(W / C.DESIGN.w, H / C.DESIGN.h);
const ox = (W - C.DESIGN.w * scale) / 2, oy = (H - C.DESIGN.h * scale) / 2;
const WS = C.LAYOUT.BOARD.size / 1000;
function d2css(dx, dy) { return [ox + dx * scale, oy + dy * scale]; }
function w2d(wx, wy) { return [C.LAYOUT.BOARD.x + wx * WS, C.LAYOUT.BOARD.y + wy * WS]; }
function h2d(wy) { return C.LAYOUT.BOARD.y + wy * WS; }
function d2w(dx) { return (dx - C.LAYOUT.BOARD.x) / WS; }
function d2wy(dy) { return (dy - C.LAYOUT.BOARD.y) / WS; }
function w2css(wx, wy) { const d = w2d(wx, wy); return d2css(d[0], d[1]); }
function downW(wx, wy) { const p = w2css(wx, wy); inputFn('down', p[0], p[1]); step(16); }
function moveW(wx, wy) { const p = w2css(wx, wy); inputFn('move', p[0], p[1]); step(16); }
function upW(wx, wy) { const p = w2css(wx, wy); inputFn('up', p[0], p[1]); step(16); }
function tapD(dx, dy) {
  const p = d2css(dx, dy);
  inputFn('down', p[0], p[1]); step(16);
  inputFn('up', p[0], p[1]); step(16);
}
function dragD(a, b, n) {
  const p0 = d2css(a[0], a[1]); inputFn('down', p0[0], p0[1]); step(16);
  for (let i = 1; i <= n; i++) {
    const p = d2css(a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n);
    inputFn('move', p[0], p[1]); step(16);
  }
  const p1 = d2css(b[0], b[1]); inputFn('up', p1[0], p1[1]); step(16);
}

const game = CORE(env);
game.init();
step(16);
game._debug.useSet('tangram7');
step(16);
const S = game.state;
const LEVELS = game._debug.LEVELS;
const LOCAL = game._debug.buildSet('tangram7').LOCAL;
const U = S7.dataset.unitScale;

function reset(idx) {
  S.save.hintUsed = {};
  game._debug.setupLevel(idx);
  S.page = 'play'; S.fade = 1; S.pageT = 9999;
  S.overlay = null; S.win = null; S.result = null;
  S.hintUsed = false; S.hintTier = LEVELS[idx].hintTier || 2;
  S.drag = null; S.lastTap = null; S.lastSnap = null; S.lastEdge = null;
  S.activePointer = false; S.press = null;
  step(16);
}
function put(id, x, y) {
  const p = S.pieces.find(q => q.id === id);
  p.onBoard = true; p.x = x; p.y = y;
  p.angle = 0; p.dAngle = 0; p.flipped = false; p.dFlipped = false;
  p.rot = null; p.flip = null;
  return p;
}
function radii(p) {
  const poly = G.toWorld(LOCAL[p.id], { x: p.x, y: p.y, angle: p.dAngle, flipped: p.dFlipped });
  let inr = Infinity, circ = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const d = G.distPtSeg([p.x, p.y], a, b);
    if (d < inr) inr = d;
    const dv = Math.hypot(a[0] - p.x, a[1] - p.y);
    if (dv > circ) circ = dv;
  }
  return { inr: inr, circ: circ };
}

console.log('==== 0. 环境 ====');
check('375×812 移动模拟，scale=' + scale + '，unitScale=' + U,
  scale === 0.5 && U === 96 && LEVELS.length >= 15);   // v0.34：U=96、七巧板 18 关（几何10+字母8）
check('第 1 关轮廓为正方形（边吸附构造基准）', LEVELS[0].outline.length === 4,
  JSON.stringify(LEVELS[0].outline));

/* ---------- V5 边吸附 ---------- */
console.log('\n==== V5 边吸附（A4 第三层：顶点 > 边 > 网格）====');
{
  // 第 1 关轮廓左边 x=286（竖直边 y 286..714）。取 T3（有竖直边），
  // 让它的竖直边与轮廓左边平行、法线偏移 20 世界单位，且所有顶点离轮廓角点 > vertex 阈值。
  const L = LOCAL['T3'];
  let vx = Infinity;
  for (let i = 0; i < L.length; i++) {
    const a = L[i], b = L[(i + 1) % L.length];
    if (Math.abs(a[0] - b[0]) < 1e-6 && a[0] < vx) vx = a[0];   // 最左竖直边的局部 x
  }
  const outline = LEVELS[0].outline;
  const leftX = Math.min.apply(null, outline.map(v => v[0]));
  const GAP = 20, CY = 500;
  const px = leftX + GAP - vx;
  reset(0);
  const p = put('T3', px, CY);
  S.lastSnap = null; S.lastEdge = null;
  const c = w2css(px, CY);
  inputFn('down', c[0], c[1]); step(16);
  check('V5 用例1：板内起点 → drag 模式', !!S.drag && S.drag.mode === 'drag');
  inputFn('move', c[0], c[1]); step(16);   // 原地 move，触发 snapPiece(p,true)
  const dx = p.x - px;
  check('V5 用例1：平行偏移 20 世界单位被沿法线贴靠（顶点未命中）',
    S.lastEdge !== null && S.lastSnap === null && dx < -12 && dx > -28,
    'p.x ' + px.toFixed(1) + '→' + p.x.toFixed(1) + ' Δ=' + dx.toFixed(1) +
    ' lastEdge=' + JSON.stringify(S.lastEdge));
  inputFn('up', c[0], c[1]); step(16);
}
{
  // 顶点优先级：把 T3 的左下顶点放到距轮廓角点约 14 世界单位（< vertex=60），
  // 故意预置 lastEdge，验证顶点命中分支会清空它并跳过边吸附。
  const L = LOCAL['T3'];
  const vx = Math.min.apply(null, L.map(v => v[0]));
  const vy = Math.min.apply(null, L.map(v => v[1]));
  const outline = LEVELS[0].outline;
  const leftX = Math.min.apply(null, outline.map(v => v[0]));
  const topY = Math.min.apply(null, outline.map(v => v[1]));
  const px = leftX + 10 - vx, py = topY + 10 - vy;
  reset(0);
  const p = put('T3', px, py);
  S.lastSnap = null; S.lastEdge = { tkey: 'stale', mi: 0 };
  const c = w2css(px, py);
  inputFn('down', c[0], c[1]); step(16);
  inputFn('move', c[0], c[1]); step(16);
  check('V5 用例2：顶点命中时跳过边吸附（lastEdge 被清空）',
    S.lastSnap !== null && S.lastEdge === null,
    'lastSnap=' + JSON.stringify(S.lastSnap) + ' lastEdge=' + JSON.stringify(S.lastEdge) +
    ' 顶点距=' + Math.hypot(10, 10).toFixed(1));
  inputFn('up', c[0], c[1]); step(16);
}

/* ---------- V6 环形手势 + v0.4 双击翻转回归 ---------- */
console.log('\n==== V6 环形手势旋转 / 板内拖拽 / 双击翻转（A5 / v0.4 A1~A2）====');
{
  // 用例3：环形区起点旋转
  reset(0);
  const p = put('T1', 500, 500);
  const rr = radii(p);
  const ringInner = Math.max(rr.inr, rr.circ * 0.55);
  const poly = G.toWorld(LOCAL['T1'], { x: p.x, y: p.y, angle: 0, flipped: false });
  let fv = poly[0], fd = -1;
  for (const v of poly) {
    const d = Math.hypot(v[0] - p.x, v[1] - p.y);
    if (d > fd) { fd = d; fv = v; }
  }
  const ux = (fv[0] - p.x) / fd, uy = (fv[1] - p.y) / fd;
  const a0 = Math.atan2(uy, ux);
  const r = rr.circ * 0.85;
  check('V6 用例3：环形区内界 > 内切圆，抓取点落在环形区且在板内',
    ringInner > rr.inr * 0.99 && r > ringInner,
    'inr=' + rr.inr.toFixed(1) + ' circ=' + rr.circ.toFixed(1) +
    ' ringInner=' + ringInner.toFixed(1) + ' r=' + r.toFixed(1));
  downW(p.x + r * ux, p.y + r * uy);
  check('V6 用例3：环形区起点 → rotate 模式', !!S.drag && S.drag.mode === 'rotate');
  for (let i = 1; i <= 4; i++) {
    const a = a0 + (60 * Math.PI / 180) * i / 4;
    moveW(p.x + r * Math.cos(a), p.y + r * Math.sin(a));
  }
  check('V6 用例3：15° 实时跟随（dAngle 为 15 的倍数且已转动）',
    Math.abs(p.dAngle - Math.round(p.dAngle / C.GESTURE.ringStep) * C.GESTURE.ringStep) < 0.01 &&
    Math.abs(p.dAngle) >= C.GESTURE.ringStep,
    'dAngle=' + p.dAngle.toFixed(1) + '°');
  check('V6 用例3：旋转中暂停吸附（lastSnap/lastEdge 保持为空）',
    S.lastSnap === null && S.lastEdge === null);
  upW(p.x + r * Math.cos(a0 + Math.PI / 3), p.y + r * Math.sin(a0 + Math.PI / 3));
  check('V6 用例3：松手吸附最近 45°',
    p.angle % C.GESTURE.ringSnap === 0 && p.angle !== 0, 'angle=' + p.angle + '°');
}
{
  // 用例4：板内起点仍是拖拽
  reset(0);
  const p = put('T1', 500, 500);
  downW(500, 500);
  check('V6 用例4：板内起点（质心）→ drag 模式', !!S.drag && S.drag.mode === 'drag');
  moveW(560, 500);
  check('V6 用例4：只移动不旋转',
    !!S.drag && S.drag.mode === 'drag' && p.dAngle === 0 && p.x > 520,
    'p.x=' + p.x.toFixed(1) + ' dAngle=' + p.dAngle + '°');
  upW(560, 500);
}
{
  // 用例5（v0.4 A1）：双击翻转——同板件两次连续短 tap，间隔 <300ms
  reset(0);
  const p = put('P', 500, 500);
  const was = p.flipped;
  const d = w2d(500, 500);
  tapD(d[0], d[1]);   // 第 1 次短 tap：只选中 + 记录 lastTap
  check('V6 用例5a：第 1 次短 tap 只选中、写 lastTap、不翻转',
    S.selId === p.id && p.flip === null && p.flipped === was &&
    !!S.lastTap && S.lastTap.id === p.id,
    'sel=' + S.selId + ' lastTap=' + JSON.stringify(S.lastTap));
  tapD(d[0], d[1]);   // 第 2 次短 tap：命中同板件 → 触发翻转
  check('V6 用例5b：第 2 次短 tap 触发 flip 动画',
    p.flip !== null || p.flipped !== was,
    'flip=' + JSON.stringify(p.flip) + ' flipped ' + was + '→' + p.flipped);
  check('V6 用例5c：配对已消费（lastTap 清空，防三连击连翻）', S.lastTap === null);
  for (let i = 0; i < 14; i++) step(16);   // 让 180ms flip 动画走完
  check('V6 用例5d：翻转动画完成，flipped 状态生效',
    p.flipped !== was && p.flip === null, 'flipped=' + p.flipped);
}
{
  // 用例6（v0.4 A1/A2）：拖动隔离 + 长按彻底移除
  reset(0);
  const p = put('P', 500, 500);
  const was = p.flipped;
  const d = w2d(500, 500);
  tapD(d[0], d[1]);                        // 先短 tap 一次，写入 lastTap
  check('V6 用例6a：第 1 次 tap 记录 lastTap', !!S.lastTap && S.lastTap.id === p.id);
  downW(500, 500); moveW(560, 500); upW(560, 500);   // 中间插入一次拖动
  check('V6 用例6b：拖动清空 lastTap、且拖动本身不翻转',
    S.lastTap === null && p.flip === null && p.flipped === was,
    'lastTap=' + JSON.stringify(S.lastTap));
  tapD(w2d(560, 500)[0], w2d(560, 500)[1]);   // 拖动后再短 tap 一次（无配对）
  check('V6 用例6c：拖动后单击不翻转（配对未被污染）',
    p.flip === null && p.flipped === was);
  // A2：按住 500ms+ 不松手，绝不翻转、无 longPress 状态、drag 仍在（可正常拖）
  reset(0);
  const q = put('P', 500, 500);
  const wasQ = q.flipped;
  downW(500, 500);
  check('V6 用例6d：down 后无 longPress 状态（长按已移除）',
    S.longPress === undefined && !!S.drag && S.drag.mode === 'drag');
  for (let i = 0; i < 34; i++) step(16);   // 544ms ≫ 原 400ms
  check('V6 用例6e：按住 500ms+ 不翻转，且 drag 未被取消（不误伤拖动）',
    q.flip === null && q.flipped === wasQ && !!S.drag && S.drag.mode === 'drag',
    'flipped=' + q.flipped + ' drag=' + (S.drag && S.drag.mode));
  upW(500, 500);
}

/* ---------- v0.3.2 B1 手柄在角上 + v0.3.1 A3 双击翻转 ---------- */
console.log('\n==== v0.3.2 B1 新手柄位置 / 质心拖拽 / 命中优先 ====');
{
  // 用例7：选中后按质心 = 拖拽；按新手柄 = 单击转 45°
  reset(0);
  const p = put('P', 500, 500);
  tapD(w2d(500,500)[0], w2d(500,500)[1]);          // 先点质心选中（走拖拽 tap 分支）
  check('B1 用例7a：先点质心选中，selId=板件', S.selId === p.id);
  const x0 = p.x, a0 = p.angle;
  downW(500, 500);
  check('B1 用例7b：已选中后再按质心 → drag（不再误触发旋转）',
    !!S.drag && S.drag.mode === 'drag' && !S.drag.fromHandle, JSON.stringify(S.drag));
  moveW(560, 500);
  check('B1 用例7c：质心拖拽只移动不旋转',
    p.x > x0 + 40 && p.angle === a0 && p.dAngle === 0,
    'x ' + x0.toFixed(1) + '→' + p.x.toFixed(1) + ' angle=' + p.angle + ' dAngle=' + p.dAngle);
  upW(560, 500);
  // 手柄圆心取实现同一算法（随旋转/翻转走），与质心必须拉开距离
  const hp = game._debug.handleAt(p);
  const cen = [w2d(p.x)[0], h2d(p.y)];
  const gap = Math.hypot(hp[0] - cen[0], hp[1] - cen[1]);
  check('B1 用例7d：手柄圆心在板件角上，热区内缘不压质心',
    gap > C.GESTURE.handleRadius, 'gap=' + gap.toFixed(1) + 'px ≥ 热区半径 ' + C.GESTURE.handleRadius);
  S.lastTap = null;
  const pd = d2css(hp[0], hp[1]);
  inputFn('down', pd[0], pd[1]); step(16);
  check('B1 用例7e：新手柄按下 → fromHandle rotate 模式',
    !!S.drag && S.drag.mode === 'rotate' && S.drag.fromHandle === true, JSON.stringify(S.drag));
  inputFn('up', pd[0], pd[1]); step(16);
  check('B1 用例7f：单击手柄转 45°（逻辑角 angle=45）',
    p.angle === 45 && !!p.rot, 'angle=' + p.angle + '° rot=' + JSON.stringify(p.rot));
  for (let i = 0; i < 10; i++) step(16);
  check('B1 用例7g：rot 动画走完 dAngle 收敛到 45',
    Math.abs(p.dAngle - 45) < 0.01 && p.rot === null, 'dAngle=' + p.dAngle.toFixed(2));
}
{
  // 用例8：拖新手柄绕圈 → 15° 实时跟随 + 松手吸附最近 45°
  reset(0);
  const p = put('P', 500, 500);
  tapD(w2d(500,500)[0], w2d(500,500)[1]);          // 选中
  S.lastTap = null;
  const hp = game._debug.handleAt(p);
  const hpd = d2css(hp[0], hp[1]);
  const hwx = d2w(hp[0]), hwy = d2wy(hp[1]);
  const a0 = Math.atan2(hwy - p.y, hwx - p.x);      // 与 handlePlayDown.lastA 同源
  inputFn('down', hpd[0], hpd[1]); step(16);
  check('B1 用例8a：角上手柄按下 → fromHandle rotate',
    !!S.drag && S.drag.fromHandle === true && S.drag.mode === 'rotate');
  const r = 120; // 绕质心半径（世界单位），保证位移 > 10 设计 px 被判为拖动
  for (let i = 1; i <= 6; i++) {
    const a = a0 + (70 * Math.PI / 180) * i / 6;
    moveW(p.x + r * Math.cos(a), p.y + r * Math.sin(a));
  }
  check('B1 用例8b：拖手柄 15° 实时跟随且已转动',
    Math.abs(p.dAngle - Math.round(p.dAngle / C.GESTURE.ringStep) * C.GESTURE.ringStep) < 0.01 &&
    Math.abs(p.dAngle) >= C.GESTURE.ringStep, 'dAngle=' + p.dAngle.toFixed(1) + '°');
  const ae = a0 + 70 * Math.PI / 180;
  upW(p.x + r * Math.cos(ae), p.y + r * Math.sin(ae));
  check('B1 用例8c：松手吸附最近 45°',
    p.angle % C.GESTURE.ringSnap === 0 && p.angle !== 0, 'angle=' + p.angle + '°');
}
{
  // 用例8d：手柄命中优先——手柄压在邻板上、邻板质心更近，仍应选中板件的手柄
  reset(0);
  const p = put('P', 500, 500);
  tapD(w2d(500,500)[0], w2d(500,500)[1]); S.lastTap = null;
  const hp = game._debug.handleAt(p);
  const hw = [d2w(hp[0]), d2wy(hp[1])];
  const nb = put('T1', hw[0] + 20, hw[1] + 20);
  const poly = G.toWorld(LOCAL['T1'], { x: nb.x, y: nb.y, angle: 0, flipped: false });
  const dP = Math.hypot(hw[0] - p.x, hw[1] - p.y);
  const dN = Math.hypot(hw[0] - nb.x, hw[1] - nb.y);
  check('B1 用例8d 前置：手柄点落在邻板内且邻板质心更近',
    G.pointInPoly(hw, poly) && dN < dP,
    'dP=' + dP.toFixed(1) + ' dN=' + dN.toFixed(1) + ' inPoly=' + G.pointInPoly(hw, poly));
  const pd = d2css(hp[0], hp[1]);
  inputFn('down', pd[0], pd[1]); step(16);
  check('B1 用例8e：手柄命中优先于最近板件 best（压在邻板上也点中）',
    !!S.drag && S.drag.id === p.id && S.drag.fromHandle === true,
    'drag=' + JSON.stringify(S.drag));
  inputFn('up', pd[0], pd[1]); step(16);
}
{
  // 用例8f：底部翻转按钮仍正常（v0.4 两条翻转入口之一：双击板件本体 / 本按钮）
  reset(0);
  const p = put('P', 500, 500);
  tapD(w2d(500,500)[0], w2d(500,500)[1]); S.lastTap = null;
  const was = p.flipped;
  tapD(375, CFG.LAYOUT.TOOLBAR.y + CFG.LAYOUT.TOOLBAR.h / 2);   // flip 按钮：第 3 个工具，y 读配置（v0.9 下移）
  check('B1 用例8f：底部翻转按钮仍正常',
    !!p.flip || p.flipped !== was, 'flip=' + JSON.stringify(p.flip) + ' flipped=' + p.flipped);
}
{
  // 用例8g：手柄锚点随板件旋转/翻转一起走（不是写死的屏幕方向）
  reset(0);
  const p = put('P', 500, 500);
  const h0 = game._debug.handleAt(p);
  const w0 = [d2w(h0[0]), d2wy(h0[1])];
  p.angle = 90; p.dAngle = 90;
  const h90 = game._debug.handleAt(p);
  const w90 = [d2w(h90[0]), d2wy(h90[1])];
  const dx = w0[0] - p.x, dy = w0[1] - p.y;
  const ex = p.x - dy, ey = p.y + dx;   // 90° 旋转后的预期世界坐标
  check('B1 用例8g：板件转 90° 手柄同步绕质心转 90°',
    Math.hypot(w90[0] - ex, w90[1] - ey) < 1e-6,
    'expect=(' + ex.toFixed(1) + ',' + ey.toFixed(1) + ') got=(' + w90[0].toFixed(1) + ',' + w90[1].toFixed(1) + ')');
  p.dFlipped = true;
  const hf = game._debug.handleAt(p);
  const wf = [d2w(hf[0]), d2wy(hf[1])];
  // 变换顺序 R(90)·F：先局部镜像再旋转，故本例是 y 镜像（不是屏幕 x 镜像）
  check('B1 用例8h：翻转后手柄同步镜像到另一侧',
    Math.hypot(wf[0] - ex, wf[1] - (2 * p.y - ey)) < 1e-6,
    'expect=(' + ex.toFixed(1) + ',' + (2 * p.y - ey).toFixed(1) + ') got=(' + wf[0].toFixed(1) + ',' + wf[1].toFixed(1) + ')');
}
{
  // 用例9（v0.4 A1）：双击边界——单击 / 间隔>300ms / 换板件 都不翻转
  reset(0);
  const p = put('P', 500, 500);
  const was = p.flipped;
  const d = w2d(500, 500);
  tapD(d[0], d[1]);                         // 只点一次
  check('v0.4 用例9a：单击一次不翻转（仅记录 lastTap）',
    p.flip === null && p.flipped === was && !!S.lastTap);
  S.lastTap.t -= 400;                      // 把第 1 次 tap 时间戳往前拨，模拟 >300ms
  tapD(d[0], d[1]);
  check('v0.4 用例9b：间隔 >300ms 不翻转（超时配对作废）',
    p.flip === null && p.flipped === was, 'flipped=' + p.flipped);
  // 换板件：P 上 tap 一次，再 tap 另一块 T1，都不应翻转
  reset(0);
  const a = put('P', 500, 500);
  const b = put('T1', 300, 300);
  const wa = a.flipped, wb = b.flipped;
  const da = w2d(500, 500), db = w2d(300, 300);
  tapD(da[0], da[1]);
  tapD(db[0], db[1]);
  check('v0.4 用例9c：换板件的两次 tap 不成双击，两块都不翻转',
    a.flip === null && b.flip === null && a.flipped === wa && b.flipped === wb,
    'lastTap=' + JSON.stringify(S.lastTap));
}
{
  // 用例10（v0.4 A1/A2）：静置无隐式翻转 + setupLevel 清空 lastTap
  reset(0);
  const p = put('P', 500, 500);
  const was = p.flipped;
  tapD(w2d(500,500)[0], w2d(500,500)[1]);   // 留下一个 lastTap
  const stepsBefore = S.steps;
  for (let i = 0; i < 30; i++) step(16);    // 静置 480ms，无按住、无隐式计时
  check('v0.4 用例10a：静置不触发翻转、无新增步数（长按已移除）',
    p.flip === null && p.flipped === was && S.steps === stepsBefore,
    'steps=' + S.steps + '(before=' + stepsBefore + ')');
  game._debug.setupLevel(1);
  check('v0.4 用例10b：setupLevel 清空 lastTap（跨关不残留配对）', S.lastTap === null);
}
{
  // 用例11（v0.4）：托盘板件短 tap 不参与双击配对（从托盘拿起是拖拽）
  reset(0);
  const p = S.pieces.find(q => !q.onBoard);
  const sp = game._debug.slots[p.slot];
  tapD(sp.x, sp.y);
  check('v0.4 用例11：托盘板件短 tap 仅选中、不写 lastTap（未被双击误伤）',
    S.selId === p.id && p.flip === null && p.angle === 0 && S.lastTap === null,
    'sel=' + S.selId + ' lastTap=' + JSON.stringify(S.lastTap));
}

/* ---------- v0.3.2 B2 选中高亮增强 ---------- */
console.log('\n==== v0.3.2 B2 选中高亮（含拖动中 / 托盘 / 成局隐藏）====');
{
  const HL = 'rgba(255,185,61,0.15)';
  reset(0);
  const p = put('P', 500, 500);
  S.selId = p.id;
  fillLog.length = 0; step(16);
  check('B2 用例1：已上板选中态绘制半透明金色填充罩', fillLog.indexOf(HL) >= 0);
  downW(500, 500); moveW(560, 500);
  check('B2 用例2：拖动中仍为 drag 模式', !!S.drag && S.drag.mode === 'drag');
  fillLog.length = 0; step(16);
  check('B2 用例3：拖动中保持选中高亮（无 !state.drag 条件）', fillLog.indexOf(HL) >= 0);
  upW(560, 500);
  // 托盘选中态
  reset(0);
  const t = S.pieces.find(q => !q.onBoard);
  S.selId = t.id;
  fillLog.length = 0; step(16);
  check('B2 用例4：托盘选中态同步增强（填充+描边）', fillLog.indexOf(HL) >= 0);
  // 成局后隐藏
  S.win = { t: 0 };
  fillLog.length = 0; step(16);
  check('B2 用例5：成局动画中高亮隐藏', fillLog.indexOf(HL) < 0);
  S.win = null;
}

/* ---------- V4 提示（v0.20：单档常驻）+ 星级 ---------- */
console.log('\n==== V4 提示：面板 → 查找道具/广告/巧币（v0.20 单档）====');
{
  const HX = 511, HY = CFG.LAYOUT.TOOLBAR.y + CFG.LAYOUT.TOOLBAR.h / 2;
  reset(0);
  S.save.hintItems = 1;
  tapD(HX, HY);
  /* v0.22：有道具时工具栏一点就用掉，不弹面板（面板只留给没道具的情形） */
  check('V4 有查找道具 → 点一下直接发提示（不再白送第 1 档）',
    S.overlay === null && S.hintLv === 1 && !!S.hint,
    `hintLv=${S.hintLv} hint=${!!S.hint} overlay=${S.overlay}`);
  check('V4 提示是单档（没有 tier 字段）且写入 hintUsed',
    S.hint.tier === undefined && S.hintUsed === true,
    `tier=${S.hint.tier} used=${S.hintUsed}`);
  check('V4 工具栏不再有档位角标（v0.20 取消次数上限）',
    CFG.HINT.maxTier === undefined);
  check('V4 道具扣 1 个', S.save.hintItems === 0, 'items=' + S.save.hintItems);
  check('V4 hint_used 已写入本数据集存档（只作历史标记）',
    !!S.save.hintUsed['1'] ||
    !!(JSON.parse(store['tangram7_save_v1'] || '{}').hintUsed || {})['1'] === true,
    'keys=' + Object.keys(store).join(','));
  S.overlay = null;
}
{
  function winWith(hintUsed) {
    reset(2);
    S.hintUsed = hintUsed;
    const lv = LEVELS[2];
    S.pieces.forEach(p => {
      const st = lv.solution.find(s => s.id === p.id);
      p.onBoard = true; p.x = st.x; p.y = st.y;
      p.angle = st.angle; p.dAngle = st.angle;
      p.flipped = st.flipped; p.dFlipped = st.flipped;
    });
    S.steps = 0; S.elapsed = 0;
    step(16);
    const dp = S.pieces[0];
    const x0 = C.LAYOUT.BOARD.x + dp.x * WS;
    const y0 = C.LAYOUT.BOARD.y + dp.y * WS;
    dragD([x0, y0], [x0 + 2, y0 + 1], 3);
    for (let i = 0; i < 10; i++) step(16);
    return S.result;
  }
  const rNo = winWith(false);
  const rYes = winWith(true);
  check('A3 星级：未用提示可达 ★★★', rNo && rNo.stars === 3, JSON.stringify(rNo));
  /* v0.20：取消「用提示封顶 ★★」——文案删了规则必须一起删 */
  check('A3 星级：用提示也能 ★★★（封顶已取消）', rYes && rYes.stars === 3, JSON.stringify(rYes));
}

console.log('\n' + (fail === 0 ? 'V4/V5/V6 交互实测全部通过' : `!! ${fail} 项未通过`));
process.exit(fail === 0 ? 0 : 1);
