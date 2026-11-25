/* v0.53 验收：字母 26 关（按参考图重做）+ 新判定口径（整块落位，不看覆盖率）
 *
 * 背景：v0.52 的字母章是早期手摆的，和用户提供的参考图（知乎 @老顽童 字母七巧板）
 * 对不上。本轮用和生肖同一套反解链路重做 26 关：
 *   逐色掩膜 IoU 拟合 → 整体去旋转 → 最小二乘/松弛贴合 → 栅格描边出剪影。
 * 同时把通关判定从「覆盖率 ≥ 某阈值」改成「七块都整块落在剪影内且互不压叠」——
 * 用户两次截图都卡在 98~99%，就是因为 45° 接缝上栅格统计永远差最后一格。
 *
 * 验的东西：
 *   1. 章节表（字母 from 20 / count 26 / 名字 A–Z）
 *   2. 每关七块齐全、面积 16u²、零压叠、整块在剪影内
 *   3. 剪影面积只比板面积大 0~0.6%（栅格描边 1 格的量级）
 *   4. 不出棋盘（留边 ≥24 单位）
 *   5. 运行时：七块就位 → 通关；六块 → 不通关；有一块偏 8 单位 → 不通关
 *   6. 进度条是「已拼 N/7」，7/7 与通关同帧
 *   7. 源码级：通关判定不再引用 minCoverage（否则又会卡在 99%）
 * 用法：node tools/verify_v053.js
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

/* ---------- 假 Canvas + 帧驱动（与 verify_v050_play.js 同款） ---------- */
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

const G = globalThis.TANGRAM_GEOM;
const J = globalThis.TANGRAM_JUDGE;
const S7 = globalThis.TANGRAM_SETS.tangram7;
const UNIT = S7.dataset.unitScale;
const LOCAL = {};
Object.keys(S7.dataset.pieces).forEach(id => {
  LOCAL[id] = G.makeLocal(S7.dataset.pieces[id].base).map(v => [v[0] * UNIT, v[1] * UNIT]);
});

let bad = 0;
function check(label, ok, detail) {
  if (!ok) bad++;
  console.log('  [' + (ok ? 'OK' : 'XX') + '] ' + label + (detail ? '  ' + detail : ''));
}

/* ---------- 1. 章节表 ---------- */
console.log('==== 1. 章节表 ====');
const CH = S7.chapters || [];
const letters = S7.levels.filter(l => l.chapter === 2);
check('字母章 from=20 count=26', CH[1] && CH[1].from === 20 && CH[1].count === 26,
  CH[1] ? 'from=' + CH[1].from + ' count=' + CH[1].count : '缺章节');
check('名字 A–Z 顺序正确', letters.map(l => l.name).join('') === 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  letters.map(l => l.name).join(''));

/* ---------- 2..4 逐关几何 ---------- */
console.log('\n==== 2. 26 关几何 ====');
const worst = { ov: 0, grow: 0, shrink: 1, edge: 1e9, cov: 1, split: 99 };
letters.forEach(lv => {
  const probs = [];
  const sol = lv.solution || [];
  if (!lv.tip || !/字母/.test(lv.tip)) probs.push('tip 缺失');
  if (!lv.hintTier || !lv.parTime || !lv.parSteps) probs.push('par/hintTier 缺失');

  const ids = sol.map(s => s.id).sort().join(',');
  if (ids !== 'P,S,T1,T2,T3,T4,T5') probs.push('板块不是七块: ' + ids);
  if ((lv.splitLines || []).length < 3) probs.push('splitLines 过少 ' + (lv.splitLines || []).length);

  const polys = sol.map(st => G.toWorld(LOCAL[st.id], st));
  const sumA = polys.reduce((a, p) => a + G.area(p), 0);
  if (Math.abs(sumA - 16 * UNIT * UNIT) / (16 * UNIT * UNIT) > 1e-6)
    probs.push('面积和 ' + (sumA / (UNIT * UNIT)).toFixed(3) + 'u²');

  let ovMax = 0;
  for (let i = 0; i < polys.length; i++) {
    for (let j = i + 1; j < polys.length; j++) {
      const ov = G.convexOverlapArea(polys[i], polys[j]) / Math.min(G.area(polys[i]), G.area(polys[j]));
      if (ov > ovMax) ovMax = ov;
    }
  }
  worst.ov = Math.max(worst.ov, ovMax);
  if (ovMax > 0.01) probs.push('压叠 ' + (ovMax * 100).toFixed(2) + '%');

  let outCnt = 0;
  polys.forEach(p => { if (!G.pieceInside(p, lv.outline, lv.holes || [], CFG.JUDGE.fitTol)) outCnt++; });
  if (outCnt) probs.push(outCnt + ' 块越界');

  const holeA = (lv.holes || []).reduce((a, h) => a + Math.abs(G.area(h)), 0);
  const outA = Math.abs(G.area(lv.outline)) - holeA;
  const grow = (outA - sumA) / sumA;
  worst.grow = Math.max(worst.grow, grow);
  worst.shrink = Math.min(worst.shrink, grow);
  if (grow > 0.006) probs.push('外扩 ' + (grow * 100).toFixed(2) + '%');
  if (grow < -0.002) probs.push('剪影缩水 ' + (grow * 100).toFixed(2) + '%');

  const bb = G.bbox([lv.outline]);
  const edge = Math.min(bb[0], bb[1], 1000 - bb[2], 1000 - bb[3]);
  worst.edge = Math.min(worst.edge, edge);
  if (edge < 24) probs.push('留边 ' + edge.toFixed(1));

  /* 运行时判定（栅格）只做参考，不再参与通关 */
  const judge = new J.Judge();
  judge.setTarget(lv.outline, lv.holes && lv.holes.length ? lv.holes : undefined);
  const r = judge.judge(sol.map(st => [G.toWorld(LOCAL[st.id], st), S7.dataset.pieceOrder.indexOf(st.id)]));
  worst.cov = Math.min(worst.cov, r.coverage);

  /* 反例：平移 40 单位必须判「不在剪影里」或「压叠」 */
  const moved = G.toWorld(LOCAL[sol[0].id], { x: sol[0].x + 40, y: sol[0].y, angle: sol[0].angle, flipped: sol[0].flipped });
  const stillIn = G.pieceInside(moved, lv.outline, lv.holes || [], CFG.JUDGE.fitTol);
  const hitOther = polys.slice(1).some(p => G.convexOverlapArea(moved, p) > G.area(moved) * 0.02);
  if (stillIn && !hitOther) probs.push('反例失效（偏 40 仍判对）');

  if (probs.length) { bad++; console.log('  [FAIL] ' + lv.name + ' → ' + probs.join(' / ')); }
  else console.log('  [OK] ' + lv.name + '  轮廓' + lv.outline.length + '点/孔' + (lv.holes || []).length +
    '  外扩' + (grow * 100).toFixed(2) + '%  留边' + edge.toFixed(0) + '  coverage ' + r.coverage.toFixed(3));
});

console.log('\n==== 3. 汇总 ====');
check('最差压叠 ≤ 1%（判定阈值 2%）', worst.ov <= 0.01, (worst.ov * 100).toFixed(3) + '%');
check('剪影外扩 0~0.6%', worst.grow <= 0.006, (worst.grow * 100).toFixed(3) + '%');
check('剪影不缩水', worst.shrink >= -0.002, (worst.shrink * 100).toFixed(3) + '%');
check('留边 ≥24 单位', worst.edge >= 24, worst.edge.toFixed(1) + ' 单位');
check('栅格覆盖率 ≥99%（仅参考）', worst.cov >= 0.99, worst.cov.toFixed(4));

/* ---------- 5/6. 运行时：新判定口径 ---------- */
console.log('\n==== 4. 运行时判定 ====');
const store = {};
const env = {
  ctx: makeCtx(),
  size: () => ({ w: 375, h: 812 }),
  dpr: () => 3,
  safeInsets: () => ({ top: 20, bottom: 0 }),
  bindInput() {},
  storage: { get: k => (k in store ? store[k] : null), set: (k, v) => { store[k] = v; } },
  audio: { unlock() {}, setEnabled() {}, play() {}, duck() {}, setVisible() {} },
  vibrate() {}, images: {}, onHide() {}, onShow() {}
};
const game = CORE(env);
game.init();
step(16);
const S = game.state, D = game._debug;
D.useSet('tangram7');
step(16);

function placeAll(idx, skipId, shiftId, dx, dy) {
  D.setupLevel(idx);
  S.page = 'play';
  S.win = null; S.result = null;
  step(16);
  const lv = S7.levels[idx];
  S.pieces.forEach(p => {
    const st = lv.solution.find(q => q.id === p.id);
    if (skipId && p.id === skipId) { p.onBoard = false; return; }
    p.onBoard = true;
    p.x = st.x + (p.id === shiftId ? dx : 0);
    p.y = st.y + (p.id === shiftId ? dy : 0);
    p.angle = st.angle; p.dAngle = st.angle;
    p.flipped = !!st.flipped; p.dFlipped = !!st.flipped;
  });
  step(16);
  D.runJudge(false);
  step(16);
}

/* 字母 A（第 20 关）—— 标准解必须通关，且进度 7/7 */
placeAll(19);
check('A 标准解 → 通关', !!S.win, 'win=' + !!S.win);
check('A 进度 7/7', S.fitN === 7 && Math.abs(S.covTo - 1) < 1e-6, 'fitN=' + S.fitN + ' covTo=' + S.covTo);

/* 只放六块 —— 不能通关 */
placeAll(19, 'T4');
check('A 只放六块 → 不通关', !S.win, 'win=' + !!S.win + ' fitN=' + S.fitN);

/* 七块都在，但其中一块偏 8 单位（仍可能在剪影内，但会压到邻块） */
placeAll(19, null, 'T1', 8, 8);
check('A 有一块偏 8 单位 → 不通关', !S.win, 'win=' + !!S.win + ' fitN=' + S.fitN);

/* 字母 S（第 38 关）再来一遍，确认不是单关巧合 */
placeAll(37);
check('S 标准解 → 通关', !!S.win, 'win=' + !!S.win);
check('S 进度 7/7', S.fitN === 7, 'fitN=' + S.fitN);

/* ---------- 4.6 落位反馈（红/绿）与拖动手感 ---------- */
console.log('\n==== 4.6 落位反馈与拖动 ====');
{
  /* ① 压到别的板 → 必须判 overlap（红色），不能再显示绿色 */
  placeAll(3);
  var pP = S.pieces.filter(p => p.id === 'P')[0];
  pP.x -= 18; pP.y -= 18;
  step(16);
  D.runJudge(false);
  check('压到邻板 → issue=overlap 且 fit=false', pP.issue === 'overlap' && !pP.fit,
    'issue=' + pP.issue + ' fit=' + pP.fit);
  /* 被 P 压到的那块会一起变红（两块都放不下），但原因必须都是 overlap */
  var others = S.pieces.filter(p => p.id !== 'P');
  var notFit = others.filter(p => !p.fit);
  check('受牵连的板原因是 overlap（不是越界）', notFit.every(p => p.issue === 'overlap'),
    notFit.map(p => p.id + ':' + p.issue).join(',') || '无');

  /* ② 拖动是软吸附：手指在离标准解 40 单位处，松手前不该已经贴死（跟手），
   *    松手后才精确落位（硬吸附）。 */
  placeAll(3);
  /* placeAll 摆的是标准解，会直接判通关；这里要测拖动，先把通关态清掉 */
  S.win = null; S.overlay = null; S.result = null; S.winFx = null;
  var lv3 = S7.levels[3];
  var tp = S.pieces.filter(p => p.id === 'T1')[0];
  var st = lv3.solution.filter(q => q.id === 'T1')[0];
  S.pieces.forEach(p => { p.onBoard = false; });
  tp.onBoard = true;
  tp.x = st.x + 40; tp.y = st.y + 40;
  tp.angle = st.angle; tp.dAngle = st.angle;
  tp.flipped = !!st.flipped; tp.dFlipped = !!st.flipped;
  step(16);
  D.onDown(D.w2d(tp.x), D.h2d(tp.y));
  step(16);
  D.onMove(D.w2d(tp.x + 6), D.h2d(tp.y - 6));
  step(16);
  var midD = Math.hypot(tp.x - st.x, tp.y - st.y);
  check('拖动中跟手（不瞬间贴死）', midD > 20, '离标准解 ' + midD.toFixed(1));
  D.onUp(D.w2d(tp.x + 6), D.h2d(tp.y - 6));
  step(16);
  var endD = Math.hypot(tp.x - st.x, tp.y - st.y);
  check('松手后精确落位', endD < 1, '误差 ' + endD.toFixed(2));

  /* ③ 通关特效对象确实被创建，且不会残留到下一关 */
  placeAll(3);
  check('通关后 winFx 已创建', !!S.winFx, 'parts=' + (S.winFx ? S.winFx.parts.length : 0));
  D.setupLevel(0);
  step(16);
  check('换关后 winFx 已清空', !S.winFx);
}

/* ---------- 6.5 剪影质量：不能有内部狭缝 / 自交 / 台阶 ---------- */
console.log('\n==== 4.5 剪影质量 ====');
{
  /* I / S / X 三关用户点名过「中间有缝隙」，这里直接锁死：不许有内孔 */
  ['I', 'S', 'X'].forEach(nm => {
    const lv = letters.find(l => l.name === nm);
    check(nm + ' 剪影无内孔（中间不再有狭缝）', (lv.holes || []).length === 0, '孔=' + (lv.holes || []).length);
  });
  /* 简单多边形：自交的轮廓会让栅格填充整片乱掉 */
  const simple = loop => {
    const n = loop.length;
    const cr = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
    const hit = (a, b, c, d) => {
      const d1 = cr(a, b, c), d2 = cr(a, b, d), d3 = cr(c, d, a), d4 = cr(c, d, b);
      return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
    };
    for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      if (hit(loop[i], loop[(i + 1) % n], loop[j], loop[(j + 1) % n])) return false;
    }
    return true;
  };
  const badLoop = letters.filter(l => !simple(l.outline)).map(l => l.name);
  check('26 关剪影都是简单多边形（无自交）', badLoop.length === 0, badLoop.join(',') || '无');
  /* v0.56：不许存在「10~20 单位的窄通道」。C 的 T1/T3 曾差 11.2、S 的 T1/T5 差 12.1，
   * 这种缝两端敞开，闭运算/背景重建都填不了，剪影会顺着它描成一条线。
   * 断言：任意两块板的间距要么贴住（<2），要么离得很远（>20）。 */
  const gapBad = [];
  const segD = (p, a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
    let t = L2 > 0 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2 : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t);
  };
  const polyDist = (A, B) => {
    let m = Infinity;
    for (let i = 0; i < A.length; i++) for (let j = 0; j < B.length; j++) {
      m = Math.min(m, segD(A[i], B[j], B[(j + 1) % B.length]));
      m = Math.min(m, segD(B[j], A[i], A[(i + 1) % A.length]));
    }
    return m;
  };
  letters.forEach(lv => {
    const P = lv.solution.map(x => G.toWorld(LOCAL[x.id], x));
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
      const d = polyDist(P[i], P[j]);
      if (d > 2 && d < 20) gapBad.push(lv.name + ':' + lv.solution[i].id + '-' + lv.solution[j].id + '=' + d.toFixed(0));
    }
  });
  check('没有 2~20 单位的窄通道（会描成一条线）', gapBad.length === 0, gapBad.slice(0, 6).join(' ') || '无');

  /* 顶点数：台阶多了点数会暴涨；干净的多边形 6~30 点 */
  const maxPts = Math.max.apply(null, letters.map(l => l.outline.length));
  const minPts = Math.min.apply(null, letters.map(l => l.outline.length));
  check('剪影点数 6~40（台阶/锯齿会顶到 50+）', minPts >= 6 && maxPts <= 40, minPts + '~' + maxPts);
}

/* ---------- 7. 源码级：通关判定不得再引用覆盖率 ---------- */
console.log('\n==== 5. 判定口径（源码） ====');
const core = fs.readFileSync(path.join(ROOT, 'js', 'core.js'), 'utf8');
check('通关条件只由 allPlaced && allFit 决定', /if \(allPlaced && allFit\)/.test(core));
check('通关条件不再引用 minCoverage', !/minCoverage/.test(core));
check('进度条显示「已拼 N/总块数」', /state\.fitN \|\| 0\) \+ '\/' \+ DS\.pieceOrder\.length/.test(core));

console.log('\n' + (bad ? '[FAIL] ' + bad + ' 处问题' : '[OK] 字母 26 关 + 新判定验收通过'));
process.exit(bad ? 1 : 0);
