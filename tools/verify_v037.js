/* v0.37 专项验收：返回键下移 / 糖果可爱风 / 胶囊占位左上角
 * 用法：node tools/verify_v037.js
 *
 * 用户这版需求原文：
 *   「返回按钮往下挪方便单手操作，然后也把按钮的ui风格调整为可爱风的图标，
 *     返回按钮挪下来以后可以把胶囊放过去。」
 *
 * 断言口径（A~E 对应派发单）：
 *   1. back_levels 热区中心 y ≥ 1000 且中心 x === 70；
 *   2. 热区与两套数据集的 SLOT_POS 板件 bbox、与工具栏热区都不相交；
 *   3. 用 hitList 的中心转 CSS 坐标，模拟 down/up 后 state.page === 'levels'；
 *   4. HUD_MIN.left === 32 且 left + maxW < 255；
 *   5. 返回按钮带糖果 tone（采集渐变 / 厚边 / 墨色 + 源码内联断言）；
 *   6. js/ 与 preview/js/、miniprogram/js/ 的 core.js / config.js 逐字节一致。
 */
const path = require('path');
const fs = require('fs');
const ROOT = path.join(__dirname, '..');

const rec = { texts: [], fills: [], strokes: [], stops: [], rects: [] };
function makeCtx() {
  /* 糖果按钮的底色走渐变（addColorStop 收颜色）、厚边走 fillRect、图标墨色走 stroke */
  const grad = { addColorStop(o, c) { rec.stops.push(String(c).toUpperCase()); } };
  const base = {
    canvas: { width: 0, height: 0, style: {} },
    globalAlpha: 1,
    measureText(s) { return { width: String(s).length * 15 }; },
    createLinearGradient: () => grad, createRadialGradient: () => grad, createPattern: () => null,
    fillText(s, x, y) { rec.texts.push({ s: String(s), x, y }); },
    fill() { rec.fills.push(String(base.fillStyle).toUpperCase()); },
    fillRect() { rec.rects.push(String(base.fillStyle).toUpperCase()); },
    stroke() { rec.strokes.push(String(base.strokeStyle).toUpperCase()); },
    arc() {}, moveTo() {}, lineTo() {}, strokeRect() {},
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
const CFG = require(path.join(ROOT, 'js/config.js'));
const CORE = require(path.join(ROOT, 'js/core.js'));

let fail = 0;
let total = 0;
function check(label, ok, detail) {
  total++;
  if (!ok) fail++;
  console.log(`  [${ok ? 'OK' : 'XX'}] ${label}${detail ? '  ' + detail : ''}`);
}
function section(t) { console.log('\n== ' + t + ' =='); }

const store = {};
const env = {
  ctx: makeCtx(), tutorial: false,
  size: () => ({ w: 375, h: 812 }), dpr: () => 3,
  safeInsets: () => ({ top: 20, bottom: 0 }),
  bindInput(fn) { env._in = fn; },
  storage: { get: k => (k in store ? store[k] : null), set: (k, v) => { store[k] = v; } },
  audio: { unlock() {}, setEnabled() {}, play() {}, duck() {}, setVisible() {}, setScene() {} },
  vibrate() {}, images: {}, onHide() {}, onShow() {}, share() {}
};

/* 设计坐标 → CSS 坐标（375×812 上 scale=0.5、ox/oy=0，与 verify_v034 同口径） */
const VIEW = Math.min(375 / CFG.DESIGN.w, 812 / CFG.DESIGN.h);
const css = (x, y) => [x * VIEW, y * VIEW];

const game = CORE(env);
game.init();
step();
const S = game.state, D = game._debug, LAY = CFG.LAYOUT;

/* 画一帧真实的对局页，拿到本帧注册的全部热区 + 糖果配色采集 */
D.go('play');
D.setupLevel(0);
rec.stops.length = 0; rec.rects.length = 0; rec.strokes.length = 0;
step(16);
const hits = D.hitList();
const back = hits.find(h => h.id === 'back_levels');

/* ================= 1. 返回键确实下移了 ================= */
section('1. 返回键下移：中心 y ≥ 1000 / 中心 x === 70');
check('对局页仍注册 back_levels 热区', !!back,
  back ? `x ${back.x}~${back.x + back.w} y ${back.y}~${back.y + back.h}` : 'missing');
const bcx = back ? back.x + back.w / 2 : NaN;
const bcy = back ? back.y + back.h / 2 : NaN;
check('热区中心 x === 70（左沿 32 与胶囊对齐）', bcx === 70, `cx=${bcx}`);
check('热区中心 y ≥ 1000（不再贴在 safeTop+40 ≈ 128）', bcy >= 1000, `cy=${bcy}`);
check('热区中心 y === 1130（与设计坐标一致）', bcy === 1130, `cy=${bcy}`);
check('热区按 MIN_HIT=88 托底、仍以中心对称',
  !!back && back.w === LAY.MIN_HIT && back.h === LAY.MIN_HIT && LAY.MIN_HIT === 88,
  back ? `${back.w}×${back.h}` : '-');
check('返回键左沿 32、右沿 108，未越设计宽度',
  !!back && back.x === 26 && back.x + back.w === 114 && back.x >= 0,
  back ? `${back.x}~${back.x + back.w}` : '-');

/* ================= 2. 不挡拖拽 / 不压工具栏 ================= */
section('2. 与板件簇、工具栏都不相交');
/* 两个矩形仅贴边不算相交（用 <=），真重叠才算 */
function overlap(a, b) {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}
['tangram4', 'tangram7'].forEach(k => {
  const set = D.buildSet(k);
  const bad = set.SLOT_POS.filter(s => overlap(back,
    { x: s.x - s.w / 2, y: s.y - s.h / 2, w: s.w, h: s.h }));
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  set.SLOT_POS.forEach(s => {
    x0 = Math.min(x0, s.x - s.w / 2); x1 = Math.max(x1, s.x + s.w / 2);
    y0 = Math.min(y0, s.y - s.h / 2); y1 = Math.max(y1, s.y + s.h / 2);
  });
  check(`${k}：热区与 ${set.SLOT_POS.length} 块板件 bbox 逐块不相交`,
    bad.length === 0, `簇 x ${Math.round(x0)}~${Math.round(x1)} y ${Math.round(y0)}~${Math.round(y1)}`);
});
const toolIds = ['rot_ccw', 'rot_cw', 'flip', 'hint', 'restart'];
const toolHits = hits.filter(h => toolIds.indexOf(h.id) >= 0);
check('五个工具热区齐全', toolHits.length === 5, toolHits.map(h => h.id).join(','));
check('返回键热区与全部工具栏热区不重叠',
  toolHits.length === 5 && toolHits.every(t => !overlap(back, t)),
  toolHits.length ? `toolbar y ${toolHits[0].y}~${toolHits[0].y + toolHits[0].h}` : '-');
check('返回键整体在工具栏上方（不压 1372）',
  !!back && back.y + back.h < LAY.TOOLBAR.y, `back.bottom=${back && back.y + back.h} < ${LAY.TOOLBAR.y}`);
check('返回键落在卡纸底(1018)之下的托盘带内（1034~1348）',
  !!back && back.y >= LAY.TRAY.top && back.y + back.h <= LAY.TRAY.bottom,
  `back ${back && back.y}~${back && back.y + back.h} / tray ${LAY.TRAY.top}~${LAY.TRAY.bottom}`);

/* ================= 3. 点击仍有效 ================= */
section('3. 下移后点击 back_levels 仍能回关卡列表');
check('点击前确实在对局页', S.page === 'play', `page=${S.page}`);
const p = css(bcx, bcy);
env._in('down', p[0], p[1]);
step();
env._in('up', p[0], p[1]);
step();
check('模拟 down/up 后 state.page === levels', S.page === 'levels', `page=${S.page}`);
check('CSS 坐标换算正确（设计 70,1130 → 35,565）',
  Math.abs(p[0] - 35) < 1e-9 && Math.abs(p[1] - 565) < 1e-9, `css=(${p[0]}, ${p[1]})`);

/* ================= 4. 胶囊占位左上角 ================= */
section('4. 胶囊挪到原返回键位置');
const M = LAY.HUD_MIN;
const CAP_L = CFG.DESIGN.w / 2 - 240 / 2;          // 倒计时胶囊左沿
check('倒计时胶囊左沿就是 255', CAP_L === 255, `capL=${CAP_L}`);
check('CFG.LAYOUT.HUD_MIN.left === 32', M.left === 32, `left=${M.left}`);
check('left + maxW < 255（不压倒计时）', M.left + M.maxW < CAP_L,
  `${M.left} + ${M.maxW} = ${M.left + M.maxW} < ${CAP_L}`);
check('胶囊右沿与倒计时净空 ≥ 8', CAP_L - (M.left + M.maxW) >= 8,
  `净空=${CAP_L - (M.left + M.maxW)}`);
check('胶囊左沿与返回键旧左沿 32 对齐（占住腾出的左上角）', M.left === 32, `left=${M.left}`);
check('v0.37 的核心成果保持：left=32 且右锚定关闭（其余字段 v0.46 已放大，见 verify_v046）',
  M.left === 32 && M.rightAnchor === false,
  `left=${M.left} rightAnchor=${M.rightAnchor} | 现 pillH=${M.pillH} rowGap=${M.rowGap} maxW=${M.maxW} topPad=${M.topPad}`);

/* ================= 5. 糖果可爱风 ================= */
section('5. 返回按钮糖果底 + 圆润「←」图标');
const TONE = { bg1: '#FFF3E6', bg2: '#FFE2C7', edge: '#FFC79E', ink: '#E07B3A' };
check('渲染帧采集到糖果渐变 bg1 / bg2',
  rec.stops.indexOf(TONE.bg1) >= 0 && rec.stops.indexOf(TONE.bg2) >= 0,
  `${TONE.bg1}=${rec.stops.indexOf(TONE.bg1) >= 0} ${TONE.bg2}=${rec.stops.indexOf(TONE.bg2) >= 0}`);
check('渲染帧采集到厚底边 edge 色（fillRect）', rec.rects.indexOf(TONE.edge) >= 0,
  `edge=${TONE.edge}`);
check('渲染帧采集到图标墨色 ink（stroke）', rec.strokes.indexOf(TONE.ink) >= 0,
  `ink=${TONE.ink}`);
const coreSrc = fs.readFileSync(path.join(ROOT, 'js/core.js'), 'utf8');
check('bb 内联 tone（不引用 TOOL_TONE，避开 var 提升）',
  /tone:\s*\{\s*bg1:\s*'#FFF3E6',\s*bg2:\s*'#FFE2C7',\s*edge:\s*'#FFC79E',\s*ink:\s*'#E07B3A'\s*\}/.test(coreSrc),
  'inline tone');
check('bb 传入 iconScale: 0.92', /iconScale:\s*0\.92/.test(coreSrc), 'iconScale=0.92');
const backBranch = /name === 'back'\) \{([\s\S]*?)\} else if \(name === 'rotL'/.exec(coreSrc);
check('back 图标改成粗描边圆头圆角带短尾巴的「←」',
  !!backBranch && /lineWidth = 5\.2/.test(backBranch[1]) &&
  /lineCap = 'round'/.test(backBranch[1]) && /lineJoin = 'round'/.test(backBranch[1]) &&
  /moveTo\(6\.5, -12\)/.test(backBranch[1]) && /moveTo\(-6\.5, 0\); ctx\.lineTo\(9, 0\)/.test(backBranch[1]),
  backBranch ? 'branch matched' : 'branch missing');
check('其它图标分支未被改动（rotL/rotR/flip/restart 仍在）',
  /name === 'rotL' \|\| name === 'rotR'/.test(coreSrc) &&
  /\} else if \(name === 'flip'\)/.test(coreSrc) &&
  /\} else if \(name === 'restart'\)/.test(coreSrc), 'other branches intact');

/* ================= 6. 三端同步 ================= */
section('6. js/ → preview/js/ 与 miniprogram/js/ 逐字节一致');
const pairs = [
  ['js/core.js', 'preview/js/core.js'],
  ['js/core.js', 'miniprogram/js/core.js'],
  ['js/config.js', 'preview/js/config.js'],
  ['js/config.js', 'miniprogram/js/config.js']
];
pairs.forEach(pr => {
  const a = path.join(ROOT, pr[0]), b = path.join(ROOT, pr[1]);
  const ok = fs.existsSync(b) && fs.readFileSync(a).equals(fs.readFileSync(b));
  check(`${pr[0]} ≡ ${pr[1]}（逐字节）`, ok,
    fs.existsSync(b) ? `${fs.statSync(b).size} bytes` : 'missing');
});

console.log('\n' + (fail === 0
  ? `v0.37 验收全部通过（${total} 项）`
  : `!! ${fail} / ${total} 项未通过`));
process.exit(fail === 0 ? 0 : 1);
