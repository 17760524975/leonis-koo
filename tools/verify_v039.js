/* v0.39 专项验收：付费皮肤（巧币买断）+ 在线奖励图标化
 * 用法：node tools/verify_v039.js
 *
 * 用户这版需求原文（截图红框标注）：
 *   1. 板件第 2 行起 6 套「需要使用巧币购买，单个 100」：
 *      霓虹 / 马卡龙 / 水晶 / 金属 / 玉石 / 荧光（第一行经典 / 糖果 / 原木仍免费）；
 *   2. 背景 3 套「需要使用 150 巧币购买」：星夜流萤 / 花瓣飘落 / 初雪纷飞；
 *   3. 在线奖励里的「体力 / 巧币 / 查找道具」汉字改成游戏内对应的图标。
 *
 * 断言口径：
 *   A. 配置价格：付费背景 3 套 ×150、付费板件 6 套 ×100，其余项无 price；
 *   B. 初始一律未解锁；点已锁项不进应用、只进确认页（overlay='buy'），且不扣币；
 *   C. 巧币足够 → 扣款 / 记入全局解锁表 / 立即应用 / 回到面板；再点不再收费；
 *   D. 巧币不足 → 不扣、不解锁、留在确认页，并给出差额提示；
 *   E. 老存档里正在用的付费项自动视为已购（更新完不能被锁在门外）；
 *   F. 面板渲染：锁定项出价签（100 / 150），免费项不出；
 *   G. 在线奖励：奖励行不再出现「体力 / 巧币 / 查找道具」字样，改为 +数字；
 *   H. 三端 core.js / config.js 逐字节一致。
 */
const path = require('path');
const fs = require('fs');
const ROOT = path.join(__dirname, '..');

/* ---------- 画布桩：记录文字，供「汉字 vs 图标」的断言 ---------- */
const rec = { texts: [] };
function makeCtx() {
  const grad = { addColorStop() {} };
  const base = {
    canvas: { width: 0, height: 0, style: {} },
    globalAlpha: 1,
    measureText(s) { return { width: String(s).length * 15 }; },
    createLinearGradient: () => grad, createRadialGradient: () => grad, createPattern: () => null,
    fillText(s, x, y) { rec.texts.push({ s: String(s), x, y, fill: String(base.fillStyle) }); },
    fill() {}, fillRect() {}, stroke() {}, arc() {}, moveTo() {}, lineTo() {}, strokeRect() {},
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
  ctx: makeCtx(), tutorial: false,
  size: () => ({ w: 375, h: 812 }), dpr: () => 3,
  safeInsets: () => ({ top: 20, bottom: 0 }),
  bindInput(fn) { env._in = fn; },
  storage: { get: k => (k in store ? store[k] : null), set: (k, v) => { store[k] = v; } },
  audio: { unlock() {}, setEnabled() {}, play() {}, duck() {}, setVisible() {}, setScene() {},
    setSfxStyle() {} },
  vibrate() {}, images: {}, onHide() {}, onShow() {}, share() {}
};

const game = CORE(env);
game.init();
step();
const S = game.state, D = game._debug;

/* ================= 1. 价格表 ================= */
section('1. 配置：谁收费、收多少');
const paidBg = Object.keys(CFG.BG_FX).filter(k => CFG.BG_FX[k].price);
const paidPs = Object.keys(CFG.PIECE_STYLES).filter(k => CFG.PIECE_STYLES[k].price);
/* v0.40：用户追加「泡泡漂浮 + 萤火之森 各 100 巧币」→ 付费背景 5 套（3×150 + 2×100） */
check('付费背景 5 套（v0.40 加入泡泡 / 萤火）',
  paidBg.length === 5 && paidBg.join(',') === 'stars,bubbles,petals,snow,firefly', paidBg.join(','));
check('背景单价：星夜/花瓣/初雪 150，泡泡/萤火 100',
  CFG.BG_FX.stars.price === 150 && CFG.BG_FX.petals.price === 150 && CFG.BG_FX.snow.price === 150 &&
  CFG.BG_FX.bubbles.price === 100 && CFG.BG_FX.firefly.price === 100,
  paidBg.map(k => CFG.BG_FX[k].name + '=' + CFG.BG_FX[k].price).join(' '));
check('付费板件 6 套', paidPs.length === 6 &&
  paidPs.join(',') === 'neon,pastel,crystal,metal,jade,glow', paidPs.join(','));
check('板件单价 100', paidPs.every(k => CFG.PIECE_STYLES[k].price === 100),
  paidPs.map(k => CFG.PIECE_STYLES[k].name + '=' + CFG.PIECE_STYLES[k].price).join(' '));
const freePs = Object.keys(CFG.PIECE_STYLES).filter(k => !CFG.PIECE_STYLES[k].price);
check('第一行三套仍免费', freePs.join(',') === 'classic,candy,wood', freePs.join(','));
check('默认背景（几何轻舞）免费', !CFG.BG_FX.geometric.price, String(CFG.BG_FX.geometric.price));

/* ================= 2. 初始锁定状态 ================= */
section('2. 锁定判定：没买过就是锁着的');
delete store[D.shopKey];
check('初始未拥有霓虹', !D.ownsItem('pstyle', 'neon'));
check('霓虹 = 锁定 / 经典 = 未锁',
  D.itemLocked('pstyle', 'neon') === true && D.itemLocked('pstyle', 'classic') === false);
check('星夜流萤锁定、单价 150',
  D.itemLocked('bgfx', 'stars') === true && D.itemPrice('bgfx', 'stars') === 150,
  String(D.itemPrice('bgfx', 'stars')));

/* ================= 3. 点锁定项：只进确认页，不扣钱 ================= */
section('3. 点已锁项 → 确认页');
S.save.coin = 200;
S.page = 'home'; S.overlay = 'skin'; S.skinTab = 2;
const coin0 = S.save.coin;
D.pickSkinItem('pstyle', 'neon');
check('进了确认页', S.overlay === 'buy', String(S.overlay));
check('待购项记对了', !!S.buyItem && S.buyItem.key === 'neon' && S.buyItem.price === 100,
  S.buyItem ? `${S.buyItem.kind}:${S.buyItem.key} ${S.buyItem.price}` : 'null');
check('没扣巧币', S.save.coin === coin0, String(S.save.coin));
check('没偷偷切换板件', S.save.pieceStyle !== 'neon', S.save.pieceStyle);

/* ================= 4. 确认购买 ================= */
section('4. 立即解锁：扣款 / 记录 / 应用');
D.buySkinItem();
check('扣了 100 巧币', S.save.coin === coin0 - 100, `${coin0} → ${S.save.coin}`);
check('已记入解锁表（全局键）', D.ownsItem('pstyle', 'neon'),
  String(store[D.shopKey] || ''));
check('已应用到板件', S.save.pieceStyle === 'neon', S.save.pieceStyle);
check('回到皮肤面板', S.overlay === 'skin', String(S.overlay));
check('待购项已清空', S.buyItem === null);

section('5. 买过的项再点 = 直接应用（不再收费）');
S.skinTab = 2;
D.pickSkinItem('pstyle', 'classic');
const coin1 = S.save.coin;
D.pickSkinItem('pstyle', 'neon');
check('已购项点击直接应用', S.save.pieceStyle === 'neon' && S.overlay === 'skin', S.save.pieceStyle);
check('不再扣钱', S.save.coin === coin1, String(S.save.coin));

/* ================= 6. 巧币不足 ================= */
section('6. 巧币不足：不扣、不解锁、留在确认页');
S.save.coin = 50;
delete store[D.shopKey];
D.pickSkinItem('bgfx', 'stars');
check('进确认页', S.overlay === 'buy' && S.buyItem.key === 'stars');
D.buySkinItem();
check('没扣币', S.save.coin === 50, String(S.save.coin));
check('没解锁', !D.ownsItem('bgfx', 'stars'));
check('仍停在确认页', S.overlay === 'buy', String(S.overlay));
check('提示里带差额 100', !!S.toast && /还需\s*100/.test(S.toast.text), S.toast ? S.toast.text : 'no toast');

/* ================= 7. 老存档播种 ================= */
section('7. 老存档：正在用的付费项自动视为已购');
delete store[D.shopKey];
S.save.pieceStyle = 'jade';
D.seedShop(S.save);
check('正在用的玉石自动解锁', D.ownsItem('pstyle', 'jade'));
check('没在用的水晶仍是锁的', !D.ownsItem('pstyle', 'crystal'));

/* ================= 8. 面板价签 ================= */
section('8. 皮肤面板：锁定项出价签');
S.overlay = 'skin'; S.skinTab = 2; S.page = 'home'; S.fade = 1;
delete store[D.shopKey];
rec.texts.length = 0;
step(16);
const priceTags = rec.texts.filter(t => t.s === '100');
check('板件页 6 个 100 价签', priceTags.length === 6, String(priceTags.length));
/* 价签在卡片右上角（名称上方 122px），不能压住名称/描述：
 * 每个价签往下 100~140px 必须能找到该卡的名称文字 */
const names = rec.texts.filter(t => Object.keys(CFG.PIECE_STYLES).some(k => CFG.PIECE_STYLES[k].name === t.s));
check('价签都在卡片上半部（不压名称/描述）',
  priceTags.every(t => names.some(n => n.y - t.y > 100 && n.y - t.y < 140)),
  priceTags.map(t => t.y.toFixed(0)).join(',') + ' / names ' + names.map(n => n.y.toFixed(0)).join(','));
S.skinTab = 1;
rec.texts.length = 0;
step(16);
const bgTags = rec.texts.filter(t => t.s === '150');
check('背景页 3 个 150 价签', bgTags.length === 3, String(bgTags.length));

/* ================= 9. 在线奖励：图标化 ================= */
section('9. 在线奖励：汉字换图标');
S.overlay = 'online';
S.toast = null;              // 上一节的「巧币不足」气泡会跟着画出来，先清掉
rec.texts.length = 0;
step(16);
const onlineTexts = rec.texts.map(t => t.s);
const badWords = onlineTexts.filter(s => s.indexOf('体力') >= 0 || s.indexOf('巧币') >= 0 ||
  s.indexOf('查找道具') >= 0);
check('奖励行不再出现「体力 / 巧币 / 查找道具」', badWords.length === 0, badWords.join(' | ') || 'clean');
check('奖励数量仍以 +数字 呈现',
  onlineTexts.filter(s => /^\+\d+$/.test(s)).length >= 6,
  onlineTexts.filter(s => /^\+\d+$/.test(s)).join(','));
check('底部道具余量行改成「×N」口径',
  onlineTexts.some(s => s.indexOf('×') === 0) &&
  !onlineTexts.some(s => s.indexOf('查找道具 ×') === 0),
  (onlineTexts.find(s => s.indexOf('×') === 0) || ''));

/* ================= 10. 三端一致 ================= */
section('10. 三端逐字节一致');
['core.js', 'config.js'].forEach(f => {
  const sem = p => require('./lib/pack.js').strip(fs.readFileSync(p, 'utf8'));
  const a = sem(path.join(ROOT, 'js', f));
  ['preview', 'miniprogram'].forEach(pkg => {
    const b = sem(path.join(ROOT, pkg, 'js', f));
    check(`${pkg}/js/${f} ≡ js/${f}（语义）`, a === b, a.length + ' bytes');
  });
});

console.log('\n' + (fail === 0 ? `v0.39 验收全部通过（${total} 项）` : `!! ${fail}/${total} 项未通过`));
process.exit(fail === 0 ? 0 : 1);
