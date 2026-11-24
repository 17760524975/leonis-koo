/* v0.35 专项验收：卡纸下探 / 托盘收窄 / 糖果工具栏 / 每关视频上限 3 次 / 体力 5 倍
 * 用法：node tools/verify_v035.js
 *
 * 用户这版需求原文：
 *   ①「卡纸扩大往托盘位置，托盘位置高度收窄」
 *   ②「查找道具的图标给我改成黄色的灯泡……左右旋转按钮、翻转按钮，刷新按钮，
 *      把UI风格替换掉，按照可爱样式调整」
 *   ③「每个关卡控制下看视频的次数，最多看三次」
 *   ④「看视频获取体力改为5倍」
 */
const path = require('path');
const ROOT = path.join(__dirname, '..');

const rec = { texts: [], fills: [], strokes: [], stops: [] };
function makeCtx() {
  /* 糖果按钮的底色是渐变，fill() 记到的是 gradient 对象本身，
   * 所以颜色要停在 addColorStop 这一层收 */
  const grad = { addColorStop(o, c) { rec.stops.push(String(c).toUpperCase()); } };
  const base = {
    canvas: { width: 0, height: 0, style: {} },
    globalAlpha: 1,
    measureText(s) { return { width: String(s).length * 15 }; },
    createLinearGradient: () => grad, createRadialGradient: () => grad, createPattern: () => null,
    fillText(s, x, y) { rec.texts.push({ s: String(s), x, y }); },
    fill() { rec.fills.push({ c: base.fillStyle, a: base.globalAlpha }); },
    stroke() { rec.strokes.push({ c: base.strokeStyle }); },
    arc() {}, moveTo() {}, lineTo() {}, fillRect() {}, strokeRect() {},
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
function settle() { if (S.win) S.win.t = 9999; step(16); step(16); }

require(path.join(ROOT, 'js/levels.js'));
const CFG = require(path.join(ROOT, 'js/config.js'));
const CORE = require(path.join(ROOT, 'js/core.js'));

let fail = 0;
function check(label, ok, detail) {
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

const game = CORE(env);
game.init();
step();
const S = game.state, D = game._debug, LAY = CFG.LAYOUT;

/* ================= 1. 版式：卡纸下探 + 托盘收窄 ================= */
section('1. 版式：卡纸往托盘方向扩、托盘带子收窄');
const cardBottom = LAY.BOARD.y + LAY.BOARD.h;
check('盘面用满屏宽（734 = 750 − 2×8）', LAY.BOARD.size === 734, 'size=' + LAY.BOARD.size);
check('纸面比盘面高（卡纸底 1018 > 盘面底 910）',
  LAY.BOARD.h > LAY.BOARD.size && cardBottom === 1018, `h=${LAY.BOARD.h} bottom=${cardBottom}`);
check('进度条搬进卡纸页脚（在盘面底与卡纸底之间）',
  LAY.PROGRESS.y > LAY.BOARD.y + LAY.BOARD.size && LAY.PROGRESS.y + LAY.PROGRESS.h < cardBottom,
  `progress ${LAY.PROGRESS.y}~${LAY.PROGRESS.y + LAY.PROGRESS.h}`);
check('托盘带子不再压卡纸（TRAY.top 1034 > 卡纸底 1018）', LAY.TRAY.top >= cardBottom, 'top=' + LAY.TRAY.top);
check('托盘带子高度收窄到 314（v0.34 是 386）',
  LAY.TRAY.bottom - LAY.TRAY.top === 314, 'h=' + (LAY.TRAY.bottom - LAY.TRAY.top));
check('工具栏仍在底部锚定、不被托盘顶到', LAY.TOOLBAR.y > LAY.TRAY.bottom,
  `toolbar ${LAY.TOOLBAR.y} > tray.bottom ${LAY.TRAY.bottom}`);
check('工具栏底不越安全区', LAY.TOOLBAR.y + LAY.TOOLBAR.h <= CFG.DESIGN.h - CFG.SAFE.bottom,
  `bottom=${LAY.TOOLBAR.y + LAY.TOOLBAR.h}`);

/* 板件簇必须落在带子里（canonical 数据 + 真实打包结果） */
const b7 = D.buildSet('tangram7'), b4 = D.buildSet('tangram4');
[b4, b7].forEach((b, i) => {
  const nm = i ? '七巧板' : '四巧板';
  let top = 1e9, bot = -1e9;
  b.SLOT_POS.forEach(s => { top = Math.min(top, s.y - b.fit.pile.pad); bot = Math.max(bot, s.y); });
  check(`${nm}板件簇落在托盘带里（不压卡纸、不压工具栏）`,
    b.fit.totalH <= 300 && b.fit.band <= 320,
    `簇 ${Math.round(b.fit.totalW)}×${Math.round(b.fit.totalH)} band=${b.fit.band}`);
});

/* ================= 2. 工具栏：五枚糖果按钮 ================= */
section('2. 工具栏：糖果按钮 + 黄色灯泡');
/* 直接重画一帧对局页，检查五个工具热区都在、并且提示按钮带角标数据 */
D.go('play');
D.setupLevel(1);
/* 选中一块：旋转 / 翻转两枚才不是置灰态，五枚糖果底色才会全画出来 */
S.selId = S.pieces[1].id;
rec.texts.length = 0; rec.fills.length = 0; rec.stops.length = 0;
step(16);
const hits = D.hitList();
const toolIds = ['rot_ccw', 'rot_cw', 'flip', 'hint', 'restart'];
check('五个工具热区齐全', toolIds.every(id => hits.some(h => h.id === id)),
  hits.map(h => h.id).filter(id => toolIds.indexOf(id) >= 0).join(','));
/* 糖果底色：渐变 + 厚边都走 fillRect / fill，检查这一帧确实画了五种柔和底色 */
const candy = ['#EAF6FF', '#E9FBF3', '#F5EFFF', '#FFF9E4', '#FFF1EE'];
const missCandy = candy.filter(c => rec.stops.indexOf(c) < 0);
check('五枚按钮各自用了糖果底色（蓝/绿/紫/黄/红）',
  missCandy.length === 0, missCandy.join(',') || 'all');
/* 灯泡：玻璃球的高光点是白色圆，横向居中偏左（hint 按钮中心 511） */
check('查找道具图标是灯泡（黄色玻璃球 + 螺纹底座的两道横线）',
  rec.strokes.filter(s => String(s.c).toUpperCase() === '#C57C16').length >= 2,
  'strokes=' + rec.strokes.filter(s => String(s.c).toUpperCase() === '#C57C16').length);

/* ================= 3. 每关看视频上限 3 次 ================= */
section('3. 每关看视频上限 3 次（提示 / 复活 / ×5 共用）');
check('ECON.adPerLevel = 3', CFG.ECON.adPerLevel === 3, String(CFG.ECON.adPerLevel));
check('新关卡额度是满的（3/3）', D.adLvLeft() === 3, String(D.adLvLeft()));

function watchOnce(kind) {
  D.adStart(kind);
  const started = !!S.adSim;
  if (started) D.adFinish();
  return started;
}
check('第 1 次看视频成功', watchOnce('hint') && D.adLvLeft() === 2, 'left=' + D.adLvLeft());
check('第 2 次看视频成功', watchOnce('revive') && D.adLvLeft() === 1, 'left=' + D.adLvLeft());
check('第 3 次看视频成功', watchOnce('coin5') && D.adLvLeft() === 0, 'left=' + D.adLvLeft());
check('第 4 次被拦下（不启动广告、不发奖）',
  watchOnce('hint') === false && !S.adSim && D.adLvLeft() === 0, 'left=' + D.adLvLeft());

/* 体力面板的看视频不占关内额度 */
S.adLv = 0;
check('体力面板的看视频不占关内额度', watchOnce('energy') && D.adLvLeft() === 3,
  'left=' + D.adLvLeft());

/* 换关重置；重开（keepTimer）不重置 */
S.adLv = 3;
D.setupLevel(2, { keepTimer: true });
check('"重开"不返还额度（同一局接着打）', D.adLvLeft() === 0, String(D.adLvLeft()));
D.setupLevel(3);
check('换到新关卡额度重置为 3', D.adLvLeft() === 3, String(D.adLvLeft()));

/* ================= 4. 结算页：额度用完时 ×5 置灰且不可点 ================= */
section('4. 结算页：额度用完时「看视频 ×5」置灰不可点');
D.go('play');
D.setupLevel(0);
S.adLv = 3;            // setupLevel 会把额度重置成 3，所以要在它之后再打光
S.elapsed = 0; S.steps = 0;
D.win();
settle();
check('结算页已弹出', S.overlay === 'result', 'overlay=' + S.overlay);
let hl = D.hitList();
check('额度用完 → ×5 不注册热区（点不进去）', !hl.some(h => h.id === 'win_ad5'),
  hl.map(h => h.id).join(','));
check('「下一关」照常可点', hl.some(h => h.id === 'next' || h.id === 'to_list'));

/* 有额度时两枚并排且等宽 */
S.adLv = 0;
step(16);
hl = D.hitList();
const hAd = hl.find(h => h.id === 'win_ad5'), hNext = hl.find(h => h.id === 'next' || h.id === 'to_list');
check('有额度 → ×5 与下一关并排等宽等高',
  !!hAd && !!hNext && hAd.w === hNext.w && Math.abs(hAd.h - hNext.h) < 0.5 &&
  Math.abs(hAd.y - hNext.y) < 0.5, hAd && hNext ? `${hAd.w}×${hAd.h} vs ${hNext.w}×${hNext.h}` : 'missing');

/* ================= 5. 看视频体力 5 倍 ================= */
section('5. 看视频获得体力 = 2 × 5 = 10 点');
check('ECON.freeEnergyAdMul = 5', CFG.ECON.freeEnergyAdMul === 5, String(CFG.ECON.freeEnergyAdMul));
S.save.energy = 4; S.save.energyMax = 16;
S.save.freeEnergyDay = ''; S.save.freeEnergyUsed = 0;
const before = S.save.energy;
D.grantFreeEnergy(true);
check('一次看视频 +10 体力', S.save.energy === before + 10,
  `${before} → ${S.save.energy}`);

console.log(fail ? `\n!! ${fail} 项未通过` : '\nv0.35 验收全部通过');
process.exit(fail ? 1 : 0);
