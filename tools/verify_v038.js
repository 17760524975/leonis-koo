/* v0.38 专项验收：夜间护眼配色 / 皮肤页签文字居中 / 开始按钮下移 + 关卡卡片缩小
 * 用法：node tools/verify_v038.js
 *
 * 用户这版需求原文：
 *   1.「皮肤面板分类文字需要向下居中，现在比较靠下了，看上去不均匀」；
 *   2.「落日和海岸两个配色去掉，改成一个深色调的配色，主要用于夜晚护眼模式使用」；
 *   3.「把开始游戏的按钮放到关卡的下面去，同时把关卡的按钮缩小一点点」。
 *
 * 断言口径：
 *   A. 配色表只剩 4 套，sunset / ocean 已下线，dusk（夜间护眼）是 dark 皮肤且字段完整；
 *   B. 切到 dusk 后用 DARK_PAL 打底 + 皮肤覆盖：bg / card / board / targetEdge 全部生效；
 *   C. 从 dusk 切回暖木，只出现在深色板里的字段（board / targetEdge / mask）能回到浅色，
 *      不会残留上一套深色（v0.38 的基准色重建）；
 *   D. 老存档 skin='sunset' 静默回落 warm，面板不会「一个都不高亮」；
 *   E. 皮肤面板 4 个页签文字与胶囊中线偏差 ≤ 3px（文案垂直居中）；
 *   F. 主页竖向顺序 四巧板 → 七巧板 → 开始 → 星数，间距 118 / 126，热区 y 同步；
 *   G. 入口卡片 408×100（比 v0.37 的 440×112 缩小一档），热区仍 ≥ MIN_HIT；
 *   H. 深色皮肤下卡纸文字走浅墨（inkOnCard），教学提示条改深底；
 *   I. 三端 core.js / config.js 逐字节一致。
 */
const path = require('path');
const fs = require('fs');
const ROOT = path.join(__dirname, '..');

/* ---------- 画布桩：记录文字 / 填充色，方便断言「深底浅字」 ---------- */
const rec = { texts: [], fills: [] };
function makeCtx() {
  const grad = { addColorStop() {} };
  const base = {
    canvas: { width: 0, height: 0, style: {} },
    globalAlpha: 1,
    measureText(s) { return { width: String(s).length * 15 }; },
    createLinearGradient: () => grad, createRadialGradient: () => grad, createPattern: () => null,
    fillText(s, x, y) { rec.texts.push({ s: String(s), x, y, fill: String(base.fillStyle) }); },
    fill() { rec.fills.push(String(base.fillStyle)); },
    fillRect() {}, stroke() {}, arc() {}, moveTo() {}, lineTo() {}, strokeRect() {},
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
const env = {
  ctx: makeCtx(), tutorial: true,     // 教学开着，才能验证卡纸上的提示条改深底
  size: () => ({ w: 375, h: 812 }), dpr: () => 3,
  safeInsets: () => ({ top: 20, bottom: 0 }),
  bindInput(fn) { env._in = fn; },
  storage: { get: k => (k in store ? store[k] : null), set: (k, v) => { store[k] = v; } },
  audio: { unlock() {}, setEnabled() {}, play() {}, duck() {}, setVisible() {}, setScene() {} },
  vibrate() {}, images: {}, onHide() {}, onShow() {}, share() {}
};

const game = CORE(env);
game.init();
step();
const S = game.state, D = game._debug, LAY = CFG.LAYOUT;

/* 亮度判定：'#RRGGBB' / 'rgba(r,g,b,a)' → 0..255 加权亮度 */
function luma(c) {
  const s = String(c || '');
  let r = 0, g = 0, b = 0;
  const hex = s.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const v = parseInt(hex[1], 16);
    r = (v >> 16) & 255; g = (v >> 8) & 255; b = v & 255;
  } else {
    const m = s.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/i);
    if (!m) return null;
    r = +m[1]; g = +m[2]; b = +m[3];
  }
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/* ================= 1. 配色表 ================= */
section('1. 配色表：落日 / 海岸下线，新增夜间护眼');
const skins = Object.keys(CFG.SKINS);
check('配色共 4 套', skins.length === 4, skins.join(','));
check('sunset / ocean 已下线', !CFG.SKINS.sunset && !CFG.SKINS.ocean);
check('dusk 是深色皮肤（dark: true）', !!CFG.SKINS.dusk && CFG.SKINS.dusk.dark === true,
  CFG.SKINS.dusk ? CFG.SKINS.dusk.name : 'missing');
check('夜间护眼深底 + 浅字', luma(CFG.SKINS.dusk.bg) < 70 && luma(CFG.SKINS.dusk.text) > 190,
  `bg=${CFG.SKINS.dusk.bg}(${luma(CFG.SKINS.dusk.bg)}) text=${CFG.SKINS.dusk.text}(${luma(CFG.SKINS.dusk.text)})`);
/* 深色皮肤必须把「只在深色板里出现」的字段也补齐，否则会残留浅色 */
const need = ['board', 'cardEdge', 'disabledBg', 'disabledIcon', 'targetFill', 'targetEdge',
  'targetSilhouette', 'splitLine', 'track', 'starOff', 'slotBg', 'mask', 'snapRing', 'shadow', 'shadowPiece'];
const missing = need.filter(k => CFG.SKINS.dusk[k] === undefined);
check('深色皮肤补齐全部深色字段', missing.length === 0, missing.join(',') || 'all present');

/* ================= 2. 换肤生效 / 撤回不残留 ================= */
section('2. 换肤：深色生效、切回浅色不残留');
D.applyBgFx('geometric');
D.applySkin('dusk'); step(16);
const COL = D.COLORS;
check('切到夜间护眼：bg 用皮肤自己的深色（不是深色特效板）', COL.bg === CFG.SKINS.dusk.bg, COL.bg);
check('卡纸 / 盘面 / 目标轮廓全部变深色',
  COL.card === CFG.SKINS.dusk.card && COL.board === CFG.SKINS.dusk.board &&
  COL.targetEdge === CFG.SKINS.dusk.targetEdge,
  `${COL.card} / ${COL.board} / ${COL.targetEdge}`);
check('深色皮肤标记已置位', S.darkSkin === true && S.darkFx === false, `darkSkin=${S.darkSkin} darkFx=${S.darkFx}`);

D.applySkin('warm'); step(16);
/* board / targetEdge 只出现在深色板里，浅色皮肤并不覆盖它们 ——
 * 旧实现直接改 COL 不复位，切回浅色会残留深色。这里按亮度断言「已经变回浅色」。 */
check('切回暖木：深色字段整体复位（board / targetEdge 回到浅色）',
  (luma(COL.board) || 0) > 200 && (luma(COL.targetEdge) || 0) > 120 && (luma(COL.card) || 0) > 200,
  `board=${COL.board}(${luma(COL.board)}) targetEdge=${COL.targetEdge}(${luma(COL.targetEdge)})`);
check('浅色皮肤 darkSkin 标记复位', !S.darkSkin, String(S.darkSkin));

/* ================= 3. 老存档兼容 ================= */
section('3. 老存档：skin=sunset 静默回落');
S.save.skin = 'sunset';
D.applyBgFx('geometric');            // 这一步会重刷调色板
check('未知皮肤回落 warm', S.save.skin === 'warm' && COL.bg === CFG.SKINS.warm.bg, S.save.skin);

/* ================= 4. 皮肤面板页签文字居中 ================= */
section('4. 皮肤面板：页签文字垂直居中');
S.overlay = 'skin'; S.skinTab = 0;
rec.texts.length = 0;
step(16);
const hit0 = D.hitList().find(h => h.id === 'skin_tab_0');
const tabTxt = rec.texts.find(t => t.s === '配色');
check('采集到页签文字与热区', !!hit0 && !!tabTxt,
  hit0 ? `hitY=${hit0.y}` : 'no hit');
/* addHit 存的是左上角（且高度被 MIN_HIT 抬到 88），中线 = y + h/2 */
const ctr = h => h.y + h.h / 2;
if (hit0 && tabTxt) {
  const dy = tabTxt.y - ctr(hit0);
  check('「配色」文字与胶囊中线偏差 ≤ 3px', Math.abs(dy) <= 3, `dy=${dy.toFixed(1)}`);
}
const offs = ['背景', '板件', '音效'].map((label, i) => {
  const t2 = rec.texts.find(t => t.s === label);
  const h2 = D.hitList().find(h => h.id === 'skin_tab_' + (i + 1));
  return (t2 && h2) ? (t2.y - ctr(h2)) : 999;
});
check('其余三个页签同样居中', offs.every(v => Math.abs(v) <= 3), offs.map(v => v.toFixed(1)).join(','));

/* ================= 5. 主页竖向顺序 / 卡片尺寸 ================= */
section('5. 主页：开始按钮挪到关卡下方 + 卡片缩小');
S.overlay = null; S.page = 'home'; S.pageT = 9999;
const L = D.homeLayout();
check('顺序 四巧板 → 七巧板 → 开始 → 星数',
  L.set4Y < L.set7Y && L.set7Y < L.startY && L.startY < L.starY,
  `${L.set4Y.toFixed(0)} / ${L.set7Y.toFixed(0)} / ${L.startY.toFixed(0)} / ${L.starY.toFixed(0)}`);
check('间距：入口 118、开始 126',
  Math.abs((L.set7Y - L.set4Y) - 118) < 0.01 && Math.abs((L.startY - L.set7Y) - 126) < 0.01,
  `${(L.set7Y - L.set4Y).toFixed(0)} / ${(L.startY - L.set7Y).toFixed(0)}`);
check('入口卡片缩到 408×100', LAY.HOME.setW === 408 && LAY.HOME.setH === 100,
  `${LAY.HOME.setW}×${LAY.HOME.setH}`);
check('卡片仍高于最小热区', LAY.HOME.setH >= LAY.MIN_HIT, `${LAY.HOME.setH} ≥ ${LAY.MIN_HIT}`);

step(16);
const hits = D.hitList();
const hitOf = id => hits.find(h => h.id === id);
check('主页三个热区都在', !!hitOf('start') && !!hitOf('set_t4') && !!hitOf('set_t7'));
const ctrOf = id => { const h = hitOf(id); return h.y + h.h / 2; };
check('热区中心 y 与布局一致（开始在最下）',
  Math.abs(ctrOf('start') - L.startY) < 0.01 &&
  Math.abs(ctrOf('set_t4') - L.set4Y) < 0.01 &&
  Math.abs(ctrOf('set_t7') - L.set7Y) < 0.01,
  `${ctrOf('set_t4').toFixed(0)} / ${ctrOf('set_t7').toFixed(0)} / ${ctrOf('start').toFixed(0)}`);
check('卡片热区宽高 = 408×100',
  hitOf('set_t4').w === 408 && hitOf('set_t4').h === 100,
  `${hitOf('set_t4').w}×${hitOf('set_t4').h}`);

/* ================= 6. 深色皮肤下的卡纸文字 ================= */
section('6. 夜间护眼：卡纸文字改浅墨');
D.applySkin('dusk');
S.overlay = null;
D.setupLevel(0);            // 用正常开局，才能拿到教学提示条（state.tut）
S.page = 'play'; S.fade = 1;
rec.texts.length = 0;
step(16);
const tipTexts = rec.texts.filter(t => t.s.indexOf('拖进来') >= 0 || t.s.indexOf('跳过教学') >= 0 ||
  t.s.indexOf('第 1 关') === 0);
check('采集到卡纸上的文字', tipTexts.length >= 2, tipTexts.map(t => t.s).join(' | ').slice(0, 60));
check('卡纸文字全部是浅墨（亮度 > 120）', tipTexts.length >= 2 && tipTexts.every(t => (luma(t.fill) || 0) > 120),
  tipTexts.map(t => t.fill).join(' / '));

/* ================= 7. 三端一致 ================= */
section('7. 三端逐字节一致');
['core.js', 'config.js'].forEach(f => {
  const sem = p => require('./lib/pack.js').strip(fs.readFileSync(p, 'utf8'));
  const a = sem(path.join(ROOT, 'js', f));
  ['preview', 'miniprogram'].forEach(pkg => {
    const b = sem(path.join(ROOT, pkg, 'js', f));
    check(`${pkg}/js/${f} ≡ js/${f}（语义）`, a === b, a.length + ' bytes');
  });
});

console.log('\n' + (fail === 0 ? `v0.38 验收全部通过（${total} 项）` : `!! ${fail}/${total} 项未通过`));
process.exit(fail === 0 ? 0 : 1);
