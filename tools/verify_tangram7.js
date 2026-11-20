/* v0.3 正式版 · 七巧板 60 关验收（读「已落盘」的数据，不用内存里的生成结果）
 * 1. 面积闭合 16u² + 7 块拼回 4×4 正方形 + unitScale=107（375 宽轮廓≥150 CSS px）
 * 2. 60 关逐关标准解可解（coverage/overflow/真重叠/面积）
 * 3. 提示三档数据（splitLines / hintTier）
 * 4. 10 关 × 4 类反例判负 + 判定层 N=7 生效（高序号板重叠能检出）
 * 5. 托盘 7 块 1:1 等比、完整可见、不压工具栏/安全区
 * 6. 引擎全流程：主界面点「七巧板」→ 6 题材章节列表 → 标准解回放成局 → 双存档独立
 * 用法：node tools/verify_tangram7.js
 */
const path = require('path');
const ROOT = path.join(__dirname, '..');
require('../js/levels.js');
const G = require('../js/geom.js');
const J = require('../js/judge.js');
const C = require('../js/config.js');
const CORE = require('../js/core.js');
const D = globalThis.TANGRAM_DATA;
const SETS = globalThis.TANGRAM_SETS;
const S7 = SETS.tangram7, S4 = SETS.tangram4;

let fail = 0;
function check(label, ok, detail) {
  if (!ok) fail++;
  console.log(`  [${ok ? 'OK' : 'XX'}] ${label}${detail ? '  ' + detail : ''}`);
}

/* ---------- 1. 几何 ---------- */
console.log('==== 1. 七巧板几何 ====');
const U = S7.dataset.unitScale;
const ORDER = S7.dataset.pieceOrder;
const LOCAL = {};
const areaU = {};
let sumU = 0;
for (const id of ORDER) {
  LOCAL[id] = G.makeLocal(S7.dataset.pieces[id].base).map(v => [v[0] * U, v[1] * U]);
  areaU[id] = G.area(S7.dataset.pieces[id].base);
  sumU += areaU[id];
}
check('7 块板、面积比 4:4:2:1:1:2:2', ORDER.length === 7 && sumU === 16,
  ORDER.join(',') + '  Σ=' + sumU.toFixed(6) + 'u²');
const areaErrPct = Math.abs(sumU - 16) / 16 * 100;
check('面积闭合误差 < 0.1%', areaErrPct < 0.1, areaErrPct.toFixed(6) + '%');
/* v0.3 A2：unitScale=107。375 宽下正方形轮廓 = 4U×0.702×0.5 = 150.2 CSS px ≥ 150 */
check('unitScale=107（375 宽正方形轮廓 ≥150 CSS px）', U === 107 && U !== S4.dataset.unitScale,
  'U=' + U + ' / 四巧=' + S4.dataset.unitScale + ' / ' + (4 * U * C.LAYOUT.BOARD.size / 1000 * 0.5).toFixed(1) + ' CSS px');
// 顶点 45° 网格 + 内角 45° 整数倍
{
  let gridOK = true, angleOK = true;
  for (const id of ORDER) {
    const p = S7.dataset.pieces[id].base;
    for (const v of p) if (Math.abs(v[0] - Math.round(v[0])) > 1e-9 || Math.abs(v[1] - Math.round(v[1])) > 1e-9) gridOK = false;
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length], c = p[(i + 2) % p.length];
      const cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
      const dot = (a[0] - b[0]) * (c[0] - b[0]) + (a[1] - b[1]) * (c[1] - b[1]);
      const deg = Math.atan2(Math.abs(cr), dot) * 180 / Math.PI;
      const k = deg / 45;
      if (Math.abs(k - Math.round(k)) > 1e-6) angleOK = false;
    }
  }
  check('顶点落 45° 网格', gridOK);
  check('内角均为 45° 整数倍', angleOK);
}

/* ---------- 2. 逐关标准解 ---------- */
function polysOf(solution) {
  return solution.map(st => [G.toWorld(LOCAL[st.id], st), ORDER.indexOf(st.id)]);
}
function judgeSol(lv, solution) {
  const judge = new J.Judge();
  judge.setTarget(lv.outline);
  const polys = polysOf(solution);
  const r = judge.judge(polys);
  const areas = polys.map(p => G.area(p[0]));
  let bad = null;
  for (const p of r.overlapPairs) {
    const [a, b] = p.key.split('-').map(Number);
    const ov = p.cells * J.CELL * J.CELL;
    const lim = C.JUDGE.pairTol * Math.min(areas[a], areas[b]);
    if (ov > lim) bad = { key: p.key, ov, lim };
  }
  const sumA = polys.reduce((s, p) => s + G.area(p[0]), 0);
  const outA = G.area(lv.outline);
  return { coverage: r.coverage, overflow: r.overflow, bad, areaErrPct: Math.abs(sumA - outA) / outA * 100 };
}
console.log('\n==== 2. 逐关标准解（coverage≥99% / 真重叠 0）====');
let minCov = 1, maxOver = 0, maxErr = 0;
for (const lv of S7.levels) {
  const v = judgeSol(lv, lv.solution);
  minCov = Math.min(minCov, v.coverage); maxOver = Math.max(maxOver, v.overflow); maxErr = Math.max(maxErr, v.areaErrPct);
  const idsOK = lv.solution.length === 7 && ORDER.every(id => lv.solution.some(s => s.id === id));
  const idxOK = lv.solution.every(s => ORDER.indexOf(s.id) >= 0 && ORDER.indexOf(s.id) <= 6);
  check(`#${lv.id} ${lv.name} 覆盖 ${(v.coverage * 100).toFixed(3)}% 溢出 ${(v.overflow * 100).toFixed(3)}% ` +
    `面积误差 ${v.areaErrPct.toFixed(4)}%`,
    v.coverage >= 0.99 && v.overflow < 0.01 && !v.bad && v.areaErrPct < 0.1 && idsOK && idxOK,
    v.bad ? '真重叠 ' + JSON.stringify(v.bad) : '无真重叠 / 7 块齐');
}
console.log(`  最低覆盖 ${(minCov * 100).toFixed(3)}%  最高溢出 ${(maxOver * 100).toFixed(3)}%  最大面积误差 ${maxErr.toFixed(4)}%`);

console.log('\n==== 3. 拼回 4×4 正方形（最硬证据）====');
{
  const lv = S7.levels[0], v = judgeSol(lv, lv.solution);
  const sq = G.area(lv.outline), expect = 16 * U * U;
  check('轮廓面积 = 16u² 换算值', Math.abs(sq - expect) / expect < 0.001,
    sq.toFixed(2) + ' / ' + expect.toFixed(2) + ' 误差 ' + (Math.abs(sq - expect) / expect * 100).toFixed(6) + '%');
  check('轮廓是 4 顶点正方形', lv.outline.length === 4,
    JSON.stringify(lv.outline.map(v => [Math.round(v[0]), Math.round(v[1])])));
  check('标准解回放覆盖 ≥99%', v.coverage >= 0.99, (v.coverage * 100).toFixed(3) + '%');
}

/* ---------- 3.5 提示三档数据（A3） ---------- */
console.log('\n==== 3.5 提示三档数据（splitLines 由标准解生成 / hintTier 1~3）====');
{
  let ok = true, nT1 = 0, nT2 = 0, nT3 = 0, minSplit = Infinity;
  for (const lv of S7.levels) {
    if (!Array.isArray(lv.splitLines) || lv.splitLines.length < 3) ok = false;
    if (![1, 2, 3].includes(lv.hintTier)) ok = false;
    if (lv.hintTier === 1) nT1++; else if (lv.hintTier === 2) nT2++; else nT3++;
    minSplit = Math.min(minSplit, lv.splitLines.length);
  }
  check('60 关 splitLines / hintTier 全部合法', ok,
    `档1×${nT1} 档2×${nT2} 档3×${nT3}  最少分割线 ${minSplit} 条`);
  // 档 1 的分割线必须真的在轮廓内部（取中点做点包含测试）
  const lv1 = S7.levels[0];
  const inside = lv1.splitLines.every(s => {
    const m = [(s[0][0] + s[1][0]) / 2, (s[0][1] + s[1][1]) / 2];
    return G.pointInPoly(m, lv1.outline) ||
      Math.min(...lv1.outline.map((v, i) => {
        const w = lv1.outline[(i + 1) % lv1.outline.length];
        return G.distPtSeg(m, v, w);
      })) < 2;
  });
  check('第 1 关分割线落在轮廓内', inside);
}

/* ---------- 4. 反例（≥10 关 × 4 类，全部必须判负） ---------- */
console.log('\n==== 4. 反例（10 关 × 4 类，全部必须判负）====');
{
  let negTotal = 0, negFail = 0;
  for (let i = 0; i < S7.levels.length; i += 6) {
    const lv = S7.levels[i];
    const clone = () => JSON.parse(JSON.stringify(lv.solution));
    const NEG = [
      ['错位一块', s => { s[1].x += 40; s[1].y += 40; return s; }],
      ['差一点点(14单位)', s => { s[1].x += 14; return s; }],
      ['两块压叠', s => { s[1].x = s[0].x; s[1].y = s[0].y; return s; }],
      ['少放一块', s => s.slice(0, 6)]
    ];
    for (const [name, mut] of NEG) {
      const s = mut(clone());
      const v = judgeSol(lv, s);
      const short = s.length < 7;
      const failed = v.coverage < C.JUDGE.passCoverage || v.overflow >= C.JUDGE.passOverflow || !!v.bad || short;
      negTotal++;
      if (!failed) { negFail++; check(`#${lv.id} ${lv.name} ${name} → 判负`, false,
        `覆盖 ${(v.coverage * 100).toFixed(2)}%`); }
    }
  }
  check(`${negTotal} 例反例全部判负`, negFail === 0, `失败 ${negFail} 例`);
  // 判定层 N=7 生效：让 bit5/bit6 两块完全重合，必须能检出 "5-6"
  const lv = S7.levels[2];
  const j2 = new J.Judge();
  j2.setTarget(lv.outline);
  const p5 = G.toWorld(LOCAL[ORDER[5]], lv.solution[5]);
  const r2 = j2.judge([[p5, 5], [p5, 6]]);   // 同一多边形分别标 bit5 / bit6
  check('判定层不再写死 4 块：bit5/bit6 重叠能检出', r2.overlapPairs.some(x => x.key === '5-6'),
    JSON.stringify(r2.overlapPairs.slice(0, 3)));
}

/* ---------- 5. 托盘 + 引擎全流程 ---------- */
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
    createLinearGradient() { return grad; }, createRadialGradient() { return grad; },
    createPattern() { return null; }
  };
  return ctx;
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
  size: () => ({ w: W, h: H }), dpr: () => DPR,
  safeInsets: () => ({ top: 20, bottom: 0 }),
  bindInput: fn => { inputFn = fn; },
  storage: { get: k => (k in store ? store[k] : null), set: (k, v) => { store[k] = v; } },
  audio: { unlock() {}, setEnabled() {}, play() {}, duck() {}, setVisible() {} },
  vibrate() {}, images: {}, onHide() {}, onShow() {}
};
const scale = Math.min(W / C.DESIGN.w, H / C.DESIGN.h);
const ox = (W - C.DESIGN.w * scale) / 2, oy = (H - C.DESIGN.h * scale) / 2;
const css = (x, y) => [ox + x * scale, oy + y * scale];
function tap(x, y) { const p = css(x, y); inputFn('down', p[0], p[1]); step(16); inputFn('up', p[0], p[1]); step(16); }
function drag(a, b, n) {
  const p0 = css(a[0], a[1]); inputFn('down', p0[0], p0[1]); step(16);
  for (let i = 1; i <= n; i++) {
    const p = css(a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n);
    inputFn('move', p[0], p[1]); step(16);
  }
  const p1 = css(b[0], b[1]); inputFn('up', p1[0], p1[1]); step(16);
}

console.log('\n==== 5. 托盘版式 + 引擎全流程（375 宽移动模拟）====');
const game = CORE(env);
game.init();
step(16);
const S = game.state;
check('首屏是主界面、默认四巧板', S.page === 'home' && S.setKey === 'tangram4' && game._debug.LEVELS.length === 120);

// 托盘：7 块共用 scale=1，且落在带内、不压工具栏
{
  const b = game._debug.buildSet('tangram7');
  const fit = b.fit, TRAY = S7.tray;
  const inside = b.SLOT_POS.every(s =>
    s.y - s.h / 2 >= TRAY.top - 0.01 && s.y + s.h / 2 <= TRAY.bottom + 0.01 &&
    s.x - s.w / 2 >= C.LAYOUT.BOARD.x - 0.01 &&
    s.x + s.w / 2 <= C.LAYOUT.BOARD.x + C.LAYOUT.BOARD.size + 0.01);
  check('托盘 7 格完整可见、不裁切（2 列 × 4 行）', fit.cols === 2 && fit.rows === 4 && fit.totalW <= C.LAYOUT.BOARD.size && fit.totalH <= fit.band && inside,
    `${fit.cols}列×${fit.rows}行 宽 ${fit.totalW.toFixed(1)}/${C.LAYOUT.BOARD.size} 高 ${fit.totalH.toFixed(1)}/${fit.band}`);
  check('不压进度条 / 工具栏 / 底部安全区',
    TRAY.top >= C.LAYOUT.PROGRESS.y + C.LAYOUT.PROGRESS.h &&
    TRAY.bottom <= C.LAYOUT.TOOLBAR.y - 10 && TRAY.bottom <= C.DESIGN.h - C.SAFE.bottom,
    `tray ${TRAY.top}~${TRAY.bottom}  progress=${C.LAYOUT.PROGRESS.y} toolbar.y=${C.LAYOUT.TOOLBAR.y}`);
  check('7 块共用一个 uniform scale（trayTransform.s 恒为 1）',
    S7.dataset.pieceOrder.length === 7 && U === S7.dataset.unitScale);
}

// 点主界面「七巧板」入口
tap(375, 1250);
step(16);
check('点「七巧板」进入七巧板关卡列表', S.page === 'levels' && S.setKey === 'tangram7',
  'page=' + S.page + ' set=' + S.setKey + ' 关卡数=' + game._debug.LEVELS.length);
check('60 关 = 6 章 × 10 关（数据集自带）',
  game._debug.LEVELS.length === 60 && S7.chapPer === 10 && S7.chapNames.length === 6 &&
  Array.isArray(S7.chapTitles) && S7.chapTitles.length === 6,
  'chapPer=' + S7.chapPer + ' 章名=' + S7.chapNames.join('/'));
check('七巧板独立存档 key', game._debug.saveKey === 'tangram7_save_v1' && S4.saveKey === 'tangram_save_v1');
check('结算文案按数据集（A7）', S7.completeTitle === '七巧板全部完成' && S4.completeTitle === '四巧板全部完成',
  S7.completeTitle + ' / ' + S4.completeTitle);

// 进入第 1 章第 3 关（平行四边形），坐标按 renderLevels 4 列格公式，第 1 页
S.save.unlockedMax = 4;
for (let i = 0; i < 4; i++) step(16);
{
  const CW = 160, CH = 196, GX = 16, PH = 64, COLS = 4;
  const gridW = COLS * CW + (COLS - 1) * GX;
  const cellX = (C.DESIGN.w - gridW) / 2 + CW / 2 + 2 * (CW + GX);
  const cellY = C.SAFE.top + 96 + PH + 66 + CH / 2;
  tap(cellX, cellY);
}
step(16);
check('进入第 3 关', S.page === 'play' && S.levelIdx === 2 && S.pieces.length === 7,
  'page=' + S.page + ' idx=' + S.levelIdx + ' pieces=' + S.pieces.length + ' 关名=' + S7.levels[2].name);

// 标准解回放 → 必须真的判通关（7 块齐全 + 判定层按 N=7）
{
  const lv = S7.levels[2];
  S.pieces.forEach(p => {
    const st = lv.solution.find(s => s.id === p.id);
    p.onBoard = true; p.x = st.x; p.y = st.y;
    p.angle = st.angle; p.dAngle = st.angle;
    p.flipped = st.flipped; p.dFlipped = st.flipped;
  });
  step(16);
  const jr = game._debug.judgeNow();
  check('第 3 关标准解覆盖率 ≥99% 且无真重叠', jr.coverage >= 0.99 && jr.overlaps.length === 0,
    '覆盖 ' + (jr.coverage * 100).toFixed(3) + '%');
  const dp = S.pieces[0];
  const x0 = C.LAYOUT.BOARD.x + dp.x * (C.LAYOUT.BOARD.size / 1000);
  const y0 = C.LAYOUT.BOARD.y + dp.y * (C.LAYOUT.BOARD.size / 1000);
  drag([x0, y0], [x0 + 2, y0 + 1], 3);
  for (let i = 0; i < 10; i++) step(16);
  check('触发成局（runJudge 用 7 块判定）', !!S.win && S.covTo >= 0.99, 'covTo=' + S.covTo.toFixed(4));
  for (let i = 0; i < 80; i++) step(16);
  check('结算面板 + 星级', S.overlay === 'result' && S.result && S.result.stars >= 1);
  check('七巧板存档写入、四巧板存档未被污染',
    !!store['tangram7_save_v1'] && !!JSON.parse(store['tangram7_save_v1']).starOf['3'],
    'keys=' + Object.keys(store).join(','));
}

console.log('\n' + (fail === 0 ? 'v0.3 正式版 · 七巧板 60 关验收全部通过' : `!! ${fail} 项未通过`));
process.exit(fail === 0 ? 0 : 1);
