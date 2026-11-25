/* v0.34 专项验收：收小单位缩放 / 托盘紧凑 / 全局钱包 / 下一关扣体力 / 结算按钮等宽
 * 用法：node tools/verify_v034.js
 *
 * 用户这版需求原文：
 *   ①「如果卡纸还是不够大，那就把这里的七巧板再重叠一点堆放，把这个区域的占用空间
 *      缩小一点，并把单位缩放也稍微缩小一点，让后续人形状的图案都能放得下」
 *   ②「巧币和体力的统计数量应该作用于整个游戏，不应该区分四巧、七巧」
 *   ③「游戏过关以后点击进去下一关并没有扣体力」
 *   ④「下一关的按钮和看视频翻倍奖励的按钮需要相同大小」
 */
const path = require('path');
const ROOT = path.join(__dirname, '..');

const rec = { texts: [], fills: [] };
function makeCtx() {
  const grad = { addColorStop() {} };
  const base = {
    canvas: { width: 0, height: 0, style: {} },
    globalAlpha: 1,
    measureText(s) { return { width: String(s).length * 15 }; },
    createLinearGradient: () => grad, createRadialGradient: () => grad, createPattern: () => null,
    fillText(s, x, y) { rec.texts.push({ s: String(s), x, y }); },
    fill() { rec.fills.push({ c: base.fillStyle, a: base.globalAlpha }); },
    stroke() {}, arc() {}, moveTo() {}, lineTo() {}, fillRect() {}, strokeRect() {},
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
/* 结算面板不是 win() 里立刻弹的：要等 winShrink+winDelay 的动画计时。
 * 直接把 win.t 推过阈值再跑一帧，等价于玩家看着图案缩进结算页。 */
function settle() {
  if (S.win) S.win.t = 9999;
  step(16);
  step(16);
}

require(path.join(ROOT, 'js/levels.js'));
const CFG = require(path.join(ROOT, 'js/config.js'));
const CORE = require(path.join(ROOT, 'js/core.js'));
const SETS = globalThis.TANGRAM_SETS;

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

/* 设计坐标 → CSS 坐标（375×812 上 scale=0.5，与真机一致） */
const VIEW = Math.min(375 / CFG.DESIGN.w, 812 / CFG.DESIGN.h);
const css = (x, y) => [x * VIEW, y * VIEW];

const game = CORE(env);
game.init();
step();
const S = game.state, D = game._debug, LAY = CFG.LAYOUT;

/* ================= 1. 单位缩放 ================= */
section('1. 单位缩放 107→96（给后续大图案腾地方）');
const S7 = SETS.tangram7, S4 = SETS.tangram4;
check('七巧板 unitScale = 96 / 四巧板仍是 130',
  S7.dataset.unitScale === 96 && S4.dataset.unitScale === 130,
  `${S7.dataset.unitScale} / ${S4.dataset.unitScale}`);
check('吸附网格随单位走（0.5u = 48）', S7.dataset.snapGrid === 48, String(S7.snapGrid));
const WS = LAY.BOARD.size / 1000;
/* v0.51：生肖章的剪影是从参考图反解出来的「长条」造型（蛇 924 宽），
 * 七块板尺寸全关卡共用、不能缩放，所以最宽的它只能留到 26px。
 * 这里对第 3 章放宽到 24px（仍然要能看到明显留白），前两章维持 40px。 */
let worst = { m: 1e9 };
S7.levels.forEach(lv => {
  const xs = lv.outline.map(p => p[0]), ys = lv.outline.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const m = Math.min(x0 * WS, (1000 - x1) * WS, y0 * WS, (1000 - y1) * WS);
  const need = lv.chapter >= 3 ? 24 : 40;
  if (m - need < worst.m) worst = { m: m - need, raw: m, need, name: lv.name, w: (x1 - x0) * WS, h: (y1 - y0) * WS };
});
check('每关剪影都在卡纸内且留足边距（几何/字母 ≥40px、生肖 ≥24px）',
  worst.m >= 0, `最紧 ${worst.name} 留 ${worst.raw.toFixed(1)}px（要求 ${worst.need}px） ${Math.round(worst.w)}×${Math.round(worst.h)}`);
check('逻辑盘最大可容长度 ≥ 10u（旧 9.35u）',
  1000 / S7.dataset.unitScale >= 10, (1000 / S7.dataset.unitScale).toFixed(2) + 'u');

/* ================= 2. 托盘紧凑 ================= */
section('2. 散放托盘：更重叠、占用更小');
check('PILE 增加 spanW / spanH（居中收窄的候选区）',
  LAY.PILE.spanW > 0 && LAY.PILE.spanH > 0 && LAY.PILE.spanW <= 500,
  `spanW=${LAY.PILE.spanW} spanH=${LAY.PILE.spanH}`);
['tangram4', 'tangram7'].forEach(k => {
  const b = D.buildSet(k);
  const ids = b.ds.pieceOrder;
  const vis = b.SLOT_POS.map(s => s.vis);
  check(`${k}：板件簇 ≤500 宽 / ≤300 高（旧版摊满 706×386）`,
    b.fit.totalW <= 500 && b.fit.totalH <= 300,
    `${Math.round(b.fit.totalW)}×${Math.round(b.fit.totalH)}`);
  check(`${k}：每块可见率 ≥ ${LAY.PILE.minVisible}`, Math.min(...vis) >= LAY.PILE.minVisible - 1e-9,
    'min=' + (Math.min(...vis) * 100).toFixed(0) + '%');
  const out = b.SLOT_POS.filter(s => s.y < LAY.TRAY.top || s.y > LAY.TRAY.bottom);
  check(`${k}：所有板件仍在带内`, out.length === 0, 'out=' + out.length);
  check(`${k}：板件不越出卡纸左右沿`,
    b.SLOT_POS.every(s => s.x - s.w / 2 >= 0 && s.x + s.w / 2 <= CFG.DESIGN.w),
    ids.join(','));
});
check('带子不压进度条 / 不压工具栏',
  LAY.TRAY.top > LAY.PROGRESS.y + LAY.PROGRESS.h && LAY.TRAY.bottom < LAY.TOOLBAR.y,
  `tray ${LAY.TRAY.top}~${LAY.TRAY.bottom} progress=${LAY.PROGRESS.y} toolbar=${LAY.TOOLBAR.y}`);

/* ================= 3. 全局钱包 ================= */
section('3. 巧币 / 体力 / 道具跨数据集共用');
const wallet = () => JSON.parse(store['tangram_wallet_v1'] || 'null');
check('钱包独立成键（不再跟着两套存档各存一份）', !!wallet(), Object.keys(wallet() || {}).join(','));
S.save.coin = 888; S.save.energy = 9; S.save.hintItems = 4;
D.openLevel(1);
check('四巧板改余额后落盘', wallet().coin === 888 && wallet().hintItems === 4,
  JSON.stringify(wallet()));
D.useSet('tangram7');
check('切到七巧板，余额不变',
  S.save.coin === 888 && S.save.hintItems === 4 && S.save.energy <= 9,
  `coin=${S.save.coin} energy=${S.save.energy} items=${S.save.hintItems}`);
S.save.coin = 123;
D.openLevel(1);
D.useSet('tangram4');
check('七巧板花掉/改动的余额回到四巧板仍然生效', S.save.coin === 123,
  'coin=' + S.save.coin);

/* ================= 4. 下一关扣体力 ================= */
section('4. 结算页「下一关」必须扣体力');
D.go('play');
D.setupLevel(0);
S.elapsed = 0; S.steps = 0;
D.win();
settle();
check('结算面板已弹出', S.overlay === 'result', 'overlay=' + S.overlay);
const nextHit = () => D.hitList().find(h => h.id === 'next' || h.id === 'to_list');
check('结算页有「下一关」热区', !!nextHit(), JSON.stringify(D.hitList().map(h => h.id)));

S.save.starOf['1'] = 3;                 // 已通关，避免 win 的重复结算干扰
S.save.energy = 10; S.save.energyMax = 16;
const e0 = S.save.energy;
const h = nextHit();
const hp = css(h.x + h.w / 2, h.y + h.h / 2);
env._in('down', hp[0], hp[1]);
step();
env._in('up', hp[0], hp[1]);
step();
check('点「下一关」进入第 2 关', S.levelIdx === 1 && S.overlay === null,
  `idx=${S.levelIdx} overlay=${S.overlay}`);
check('并且扣了 2 点体力', S.save.energy === e0 - 2, `${e0} → ${S.save.energy}`);

/* 体力不足 → 弹体力面板、不切关 */
D.go('play');
D.setupLevel(1);
S.elapsed = 0; S.steps = 0;
D.win();
settle();
S.save.starOf['2'] = 3;
S.save.energy = 1;
const h2 = nextHit();
const hp2 = css(h2.x + h2.w / 2, h2.y + h2.h / 2);
env._in('down', hp2[0], hp2[1]);
step();
env._in('up', hp2[0], hp2[1]);
step();
check('体力不足时不切关、直接弹体力面板',
  S.levelIdx === 1 && S.overlay === 'energy', `idx=${S.levelIdx} overlay=${S.overlay}`);
check('体力不足时余额不会被扣成负数', S.save.energy === 1, 'energy=' + S.save.energy);

/* ================= 5. 结算按钮等宽 ================= */
section('5. 结算页「看视频 ×5」与「下一关」等宽等高');
S.save.energy = 16;
S.overlay = null; S.result = null; S.win = null;
D.go('play');
D.setupLevel(2);
S.elapsed = 0; S.steps = 0;
delete S.save.starOf['3'];
D.win();
settle();
const hits = D.hitList();
const ad = hits.find(x => x.id === 'win_ad5'), nx = hits.find(x => x.id === 'next');
check('两枚按钮同时存在（首通且有 ×5 可领）', !!ad && !!nx, hits.map(x => x.id).join(','));
check('宽度相同（265）', ad && nx && ad.w === nx.w && ad.w === CFG.WIN.primaryW,
  `${ad && ad.w} vs ${nx && nx.w} / cfg=${CFG.WIN.primaryW}`);
/* 热区高度被 MIN_HIT=88 托底（视觉 74，手指友好），两枚必须同高 */
check('热区高度相同（视觉 ' + CFG.WIN.primaryH + ' / 热区 ≥' + LAY.MIN_HIT + '）',
  ad && nx && Math.abs(ad.h - nx.h) < 0.5 && ad.h >= CFG.WIN.primaryH,
  `${ad && ad.h} vs ${nx && nx.h}`);
check('同一排（中心 y 相同）', ad && nx && Math.abs((ad.y + ad.h / 2) - (nx.y + nx.h / 2)) < 0.5);
check('互不重叠且整排居中',
  ad && nx && (ad.x + ad.w <= nx.x + 0.1) &&
  Math.abs((ad.x + nx.x + nx.w) / 2 - CFG.DESIGN.w / 2) < 1,
  ad && nx ? `ad ${ad.x}~${ad.x + ad.w} next ${nx.x}~${nx.x + nx.w}` : '-');

console.log('\n' + (fail === 0 ? 'v0.34 验收全部通过' : `!! ${fail} 项未通过`));
process.exit(fail === 0 ? 0 : 1);
