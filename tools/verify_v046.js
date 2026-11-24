/* v0.46 专项验收：iPhone 17 顶部胶囊 / 倒计时被卡纸压住 + 胶囊放大
 * 用法：node tools/verify_v046.js
 *
 * 用户反馈原文：
 *   「iphone17页面兼容性有问题，顶部胶囊区域还有倒计时都被卡纸盖住了一部分，
 *     需要整体上移，然后胶囊可以放大一点现在有点小」
 *
 * 根因（不是"位置偏低"，而是"卡纸顶写死、顶部栈跟着 safeTop 走"）：
 *   · 顶部栈锚在 view.safeTop；卡纸顶是常量 BOARD.y=176。
 *   · iPhone 17 = 402×874、safeArea.top=62 CSS px，
 *     scale = min(402/750, 874/1624) = 0.536 → safeTop = max(88, 62/0.536) = 115.7 设计 px。
 *   · 于是第二枚胶囊底 = safeTop + 72 = 187.7、倒计时底 = safeTop + 68 = 183.7，
 *     都越过了 176；而卡纸是在 playHud() **之后**画的，直接盖在上面。
 *   · 安全区以上是状态栏，不能再往上让 → 唯一解是让卡纸顶按安全区自适应下移。
 *
 * 修法：
 *   · HUD_MIN 整体放大一档（pillH 36→42、rowGap 44→50、fontSize 24→27、
 *     maxW 127→146、图标 0.78/0.70→0.90/0.82），上移量 topShift(8) 换成 topPad(2)
 *     —— 语义从"往上顶进状态栏"改成"正向贴着安全区"。
 *   · BOARD.y 176→216（h 842→802，**底边仍钉在 1018**），
 *     运行时再按 nudge = max(0, safeTop + 栈高 + gapToCard − 216) 下移，上限 90。
 *   · 卡纸 y 只是坐标原点，盘面 size 与 WS 不变 → 拼图区一点没缩小，纸只是变矮。
 *
 * 断言：
 *   A. 配置数值与几何自洽（胶囊不压倒计时、图标不越出胶囊、文字避开图标）；
 *   B. 5 种机型尺寸下 resize：nudge 公式成立、胶囊底/倒计时底都在卡纸顶之上、
 *      卡纸底恒为 1018（进度条/托盘/工具栏一个都没动）；
 *   C. 真跑一帧对局页：三个数字的 baseline 都在卡纸顶之上，关号仍在卡纸内；
 *   D. 胶囊确实放大了一档（与 v0.45 的旧值逐项对比）；
 *   E. 三端一致。
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');

const rec = { texts: [] };
/* 需要跟一点 CTM：倒计时数字是先 translate 到胶囊中心再 fillText(0,0) 画的，
 * 只记原始参数会得到 (0,0)。这里维护一个「缩放+平移」子集（足够本项目用）：
 *   setTransform(a,b,c,d,e,f) → 重置；translate / scale → 累加；save / restore → 栈。
 * 记录时再除回基准缩放，统一换算到**设计像素**，才能直接和 BOARD.y 比。 */
function makeCtx() {
  let sx = 1, sy = 1, tx = 0, ty = 0;
  const stack = [];
  const base = {
    canvas: { width: 0, height: 0, style: {} },
    globalAlpha: 1,
    measureText(s) { return { width: String(s).length * 15 }; },
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    createPattern: () => null,
    fillText(s, x, y) {
      rec.texts.push({ s: String(s), x: (tx + x * sx) / sx, y: (ty + y * sy) / sy });
    },
    setTransform(a, b, c, d, e, f) { sx = a; sy = d; tx = e || 0; ty = f || 0; },
    translate(dx, dy) { tx += dx * sx; ty += dy * sy; },
    scale(a, b) { sx *= a; sy *= (b === undefined ? a : b); },
    save() { stack.push([sx, sy, tx, ty]); },
    restore() { const v = stack.pop(); if (v) { sx = v[0]; sy = v[1]; tx = v[2]; ty = v[3]; } },
    fill() {}, fillRect() {}, stroke() {}, strokeRect() {}, drawImage() {},
    arc() {}, arcTo() {}, moveTo() {}, lineTo() {}, rect() {}, ellipse() {},
    setLineDash() {}, beginPath() {}, closePath() {},
    bezierCurveTo() {}, quadraticCurveTo() {}, rotate() {}, clip() {}, clearRect() {}
  };
  return new Proxy(base, { get(t, k) { return k in t ? t[k] : () => {}; }, set(t, k, v) { t[k] = v; return true; } });
}

let pendingFrame = null, clock = 0;
global.requestAnimationFrame = cb => { pendingFrame = cb; return 1; };
function step(ms) { clock += (ms || 16); const cb = pendingFrame; pendingFrame = null; if (cb) cb(clock); }

require(path.join(ROOT, 'js/levels.js'));
const CFG = require(path.join(ROOT, 'js/config.js'));
const CORE = require(path.join(ROOT, 'js/core.js'));
const LAY = CFG.LAYOUT, M = LAY.HUD_MIN;
/* 设计基准值必须在 init（会跑 resize）之前抓 —— 之后 LAY.BOARD.y 会被按安全区改写 */
const BASE = { y: LAY.BOARD.y, h: LAY.BOARD.h };

let fail = 0, total = 0;
function check(label, ok, detail) {
  total++;
  if (!ok) fail++;
  console.log(`  [${ok ? 'OK' : 'XX'}] ${label}${detail ? '  ' + detail : ''}`);
}
function section(t) { console.log('\n' + t); }

/* 可变的设备参数：改完调 resize() 就能重新走一遍安全区计算 */
let VW = 750, VH = 1624, VST = 0, VSB = 0;   // 先按设计基准 init，section B 再逐机型 resize
const store = {};
const env = {
  ctx: makeCtx(), tutorial: false,
  size: () => ({ w: VW, h: VH }), dpr: () => 3,
  safeInsets: () => ({ top: VST, bottom: VSB }),
  bindInput() {}, storage: { get: k => (k in store ? store[k] : null), set: (k, v) => { store[k] = v; } },
  audio: { unlock() {}, setEnabled() {}, play() {}, duck() {}, setVisible() {}, setScene() {} },
  vibrate() {}, images: {}, onHide() {}, onShow() {}, share() {}
};

/* 与 core.js 的 hudAnchorY / hudStackH 同口径（core 没把这两个函数导出） */
const stackH = () => (M.topPad || 0) + M.rowGap + M.pillH;
const anchorY = () => Math.max(CFG.SAFE.top, VST / Math.min(VW / CFG.DESIGN.w, VH / CFG.DESIGN.h))
  + (M.topPad || 0) + M.pillH / 2 + M.rowGap / 2;
const safeTopOf = () => Math.max(CFG.SAFE.top, VST / Math.min(VW / CFG.DESIGN.w, VH / CFG.DESIGN.h));

const game = CORE(env);
game.init();
step(16);
const D = game._debug, S = game.state;

/* ================= A. 配置 ================= */
section('A. 配置：胶囊放大一档 + 卡纸顶回落到 216');
check('版本 ≥ v0.46', /^v0\.(4[6-9]|[5-9]\d)/.test(CFG.version), CFG.version);
check('胶囊高 36 → 42', M.pillH === 42, 'pillH=' + M.pillH);
check('两行中心距 44 → 50（两枚之间 8px 缝）', M.rowGap === 50 && M.rowGap - M.pillH === 8,
  `rowGap=${M.rowGap} 缝=${M.rowGap - M.pillH}`);
check('字号 24 → 27 / 分母 17 → 19', M.fontSize === 27 && M.subFontSize === 19,
  `fontSize=${M.fontSize} sub=${M.subFontSize}`);
check('宽度上限 127 → 146（32+146=178 < 倒计时左沿 255）',
  M.maxW === 146 && M.left + M.maxW < CFG.DESIGN.w / 2 - 240 / 2,
  `${M.left}+${M.maxW}=${M.left + M.maxW} < 255，净空 ${255 - M.left - M.maxW}`);
check('图标 0.78/0.70 → 0.90/0.82（直径 ≈ 胶囊高的 0.7）',
  M.coinScale === 0.90 && M.energyScale === 0.82 &&
  Math.abs(33 * M.coinScale / M.pillH - 0.71) < 0.03,
  `coin=${M.coinScale} energy=${M.energyScale} 直径比=${(33 * M.coinScale / M.pillH).toFixed(2)}`);
check('上移量改成 topPad=2（正向贴安全区），topShift 归零',
  M.topPad === 2 && M.topShift === 0, `topPad=${M.topPad} topShift=${M.topShift}`);
check('图标不越出胶囊左沿', M.iconInset - 15.5 * M.coinScale - M.border > 0,
  `左沿余量=${(M.iconInset - 15.5 * M.coinScale - M.border).toFixed(1)}`);
check('文字起点避开图标右沿', M.padL > M.iconInset + 15.5 * M.coinScale,
  `${M.padL} > ${(M.iconInset + 15.5 * M.coinScale).toFixed(1)}`);
check('卡纸顶 176 → 216、h → 802、底边仍是 1018（设计基准下 nudge=0）',
  BASE.y === 216 && BASE.h === 802 && (LAY.BOARD.bottom || 0) === 1018 &&
  LAY.BOARD.y === BASE.y && LAY.BOARD.y + LAY.BOARD.h === 1018,
  `y=${LAY.BOARD.y} h=${LAY.BOARD.h} bottom=${LAY.BOARD.y + LAY.BOARD.h}`);
check('盘面 size 不变（拼图区没被缩小）', LAY.BOARD.size === 734, 'size=' + LAY.BOARD.size);
check('进度条 / 托盘 / 工具栏一个都没动',
  LAY.PROGRESS.y === 954 && LAY.TRAY.top === 1034 && LAY.TRAY.bottom === 1348 &&
  LAY.TOOLBAR.y === 1372,
  `progress=${LAY.PROGRESS.y} tray=${LAY.TRAY.top}~${LAY.TRAY.bottom} toolbar=${LAY.TOOLBAR.y}`);
check('卡纸底仍在托盘带之上（纸没有压到托盘）', LAY.BOARD.y + LAY.BOARD.h <= LAY.TRAY.top,
  `${LAY.BOARD.y + LAY.BOARD.h} ≤ ${LAY.TRAY.top}`);

/* ================= B. 多机型安全区自适应 ================= */
section('B. 5 种机型：卡纸顶按 safeTop 自适应下移，底边钉死');
const DEVS = [
  { n: 'iPhone 17  402×874 @62', w: 402, h: 874, t: 62 },
  { n: 'iPhone 15  393×852 @59', w: 393, h: 852, t: 59 },
  { n: 'iPhone 13  390×844 @47', w: 390, h: 844, t: 47 },
  { n: 'iPhone SE  375×667 @20', w: 375, h: 667, t: 20 },
  { n: '设计基准   750×1624 @0', w: 750, h: 1624, t: 0 }
];
const rows = [];
for (const d of DEVS) {
  VW = d.w; VH = d.h; VST = d.t;
  game.resize();
  step(16);
  const st = safeTopOf();
  const nudge = Math.max(0, st + stackH() + M.gapToCard - BASE.y);
  const pillBot = st + (M.topPad || 0) + M.rowGap + M.pillH;
  const capBot = anchorY() + 56 / 2;
  const ok = Math.abs(LAY.BOARD.y - (216 + nudge)) < 0.01 &&
    Math.abs(LAY.BOARD.y + LAY.BOARD.h - 1018) < 0.01 &&
    pillBot < LAY.BOARD.y && capBot < LAY.BOARD.y;
  if (!ok) fail++;
  total++;
  rows.push({ d, st, nudge, y: LAY.BOARD.y, h: LAY.BOARD.h, pillBot, capBot });
  console.log(`  [${ok ? 'OK' : 'XX'}] ${d.n}  safeTop=${st.toFixed(1)} nudge=${nudge.toFixed(1)} ` +
    `卡纸顶=${LAY.BOARD.y.toFixed(1)} 胶囊底=${pillBot.toFixed(1)} 倒计时底=${capBot.toFixed(1)} ` +
    `净空=${(LAY.BOARD.y - pillBot).toFixed(1)}`);
}
check('每条机型都满足「胶囊底 < 卡纸顶」且留白 ≥ gapToCard−0.5',
  rows.every(r => r.y - r.pillBot >= (M.gapToCard || 0) - 0.5),
  rows.map(r => (r.y - r.pillBot).toFixed(1)).join(' / '));
check('每条机型卡纸底都恒为 1018（进度条/托盘不被推动）',
  rows.every(r => Math.abs(r.y + r.h - 1018) < 0.01),
  rows.map(r => (r.y + r.h).toFixed(0)).join(' / '));
check('旧版（v0.45）在 iPhone 17 上确实会重叠 —— 反证修复有效',
  rows[0].st + 72 > 176 && rows[0].st > 88,
  `旧口径：胶囊底 ${(rows[0].st + 72).toFixed(1)} > 卡纸顶 176，越界 ${(rows[0].st + 72 - 176).toFixed(1)}px`);

/* ================= C. 真跑一帧对局页 ================= */
section('C. 对局页实拍：三个数字都在卡纸顶之上');
VW = 402; VH = 874; VST = 62;    // 回到 iPhone 17
game.resize();
S.save.coin = 1645; S.save.energy = 81; S.save.energyMax = 16;
D.setupLevel(30); D.go('play');
rec.texts.length = 0;
step(16);
const coinT = rec.texts.filter(t => t.s === '1645')[0];
const enT = rec.texts.filter(t => t.s === '81')[0];
const timeT = rec.texts.filter(t => /^\d\d:\d\d$/.test(t.s))[0];
const headT = rec.texts.filter(t => /^第 \d+ 关/.test(t.s))[0];
check('巧币数字画在卡纸顶之上', !!coinT && coinT.y < LAY.BOARD.y,
  coinT ? `y=${coinT.y.toFixed(1)} < ${LAY.BOARD.y.toFixed(1)}` : 'not found');
check('体力数字画在卡纸顶之上', !!enT && enT.y < LAY.BOARD.y,
  enT ? `y=${enT.y.toFixed(1)} < ${LAY.BOARD.y.toFixed(1)}` : 'not found');
check('倒计时数字画在卡纸顶之上', !!timeT && timeT.y < LAY.BOARD.y,
  timeT ? `y=${timeT.y.toFixed(1)} < ${LAY.BOARD.y.toFixed(1)}` : 'not found');
check('关号仍在卡纸内部（跟着卡纸一起下移）', !!headT && headT.y > LAY.BOARD.y,
  headT ? `y=${headT.y.toFixed(1)} > ${LAY.BOARD.y.toFixed(1)}` : 'not found');
check('三个数字两两不互相压（胶囊在左、倒计时在中）',
  !!coinT && !!timeT && coinT.x < CFG.DESIGN.w / 2 && timeT.x > CFG.DESIGN.w / 2,
  coinT && timeT ? `coin.x=${coinT.x.toFixed(0)} timer.x=${timeT.x.toFixed(0)}` : '');

/* ================= D. 三端一致 ================= */
section('D. 三端代码一致');
const md5 = p => crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex');
const h0 = md5(path.join(ROOT, 'js/core.js'));
const h0c = md5(path.join(ROOT, 'js/config.js'));
check('preview/js 与主包一致',
  md5(path.join(ROOT, 'preview/js/core.js')) === h0 &&
  md5(path.join(ROOT, 'preview/js/config.js')) === h0c, h0.slice(0, 12));
check('miniprogram/js 与主包一致',
  md5(path.join(ROOT, 'miniprogram/js/core.js')) === h0 &&
  md5(path.join(ROOT, 'miniprogram/js/config.js')) === h0c, h0.slice(0, 12));

console.log(fail ? `\n!! ${fail}/${total} 项失败` : `\n✓ 全部通过（${total} 项）`);
process.exit(fail ? 1 : 0);
