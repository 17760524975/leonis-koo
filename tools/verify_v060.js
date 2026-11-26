/* v0.60 验收：提示面板两钮同尺寸 + 三星门槛收紧
 *
 * 两条用户反馈：
 *   ① 「30 巧币买一次」与「看视频免费一次」两枚按钮大小不统一 ——
 *      旧值巧币 440×84 / 视频 480×92，叠在一起巧币小一圈，像次要入口。
 *      断言：三行按钮（道具/巧币/视频）都是 480×92，同字号；渲染后两枚按钮
 *      的实际外框宽高完全相等、水平中心重合、纵向间距 104。
 *   ② 「三星难度调高一点，星级要作为排行榜指标」——
 *      旧口径三星 = 用时 ≤ parTime + 步数 ≤ parSteps，配上 150 秒时限几乎等于
 *      「拼完就给三星」。现在三星用时门槛再乘 threeStarTimeFactor(0.8)。
 *      断言：配置值、四档边界（0.79 / 0.85 / 1.7 倍 parTime、步数超一档）、
 *      全 93 关的三星窗口都落在时限的 75% 以内且不短于 55 秒。
 * 用法：node tools/verify_v060.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');

/* ---------- 假 canvas：除了记文案，还要记每条闭合路径的外框 ---------- */
const rec = { texts: [], paths: [] };
function makeCtx() {
  const grad = { addColorStop() {} };
  const base = {
    canvas: { width: 0, height: 0, style: {} },
    globalAlpha: 1,
    font: '', fillStyle: '', strokeStyle: '',
    measureText(s) { return { width: String(s).length * 15 }; },
    createLinearGradient: () => grad, createRadialGradient: () => grad, createPattern: () => null,
    beginPath() { this._bb = null; },
    moveTo(x, y) { this._pt(x, y); },
    lineTo(x, y) { this._pt(x, y); },
    arcTo(x1, y1, x2, y2) { this._pt(x2, y2); },
    _pt(x, y) {
      if (!this._bb) this._bb = { x0: x, y0: y, x1: x, y1: y };
      const b = this._bb;
      if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x;
      if (y < b.y0) b.y0 = y; if (y > b.y1) b.y1 = y;
    },
    closePath() {
      if (this._bb) {
        rec.paths.push({
          x: this._bb.x0, y: this._bb.y0,
          w: this._bb.x1 - this._bb.x0, h: this._bb.y1 - this._bb.y0,
          fill: this.fillStyle
        });
        this._bb = null;
      }
    },
    fillText(s, x, y) { rec.texts.push({ s: String(s), x, y, font: String(this.font || '') }); },
    arc() {}, fillRect() {}, strokeRect() {}, setLineDash() {}, save() {}, restore() {},
    bezierCurveTo() {}, quadraticCurveTo() {}, rect() {}, translate() {}, rotate() {},
    scale() {}, clip() {}, drawImage() {}, setTransform() {}, clearRect() {}, ellipse() {},
    stroke() {}, fill() {}
  };
  return new Proxy(base, {
    get(t, k) { return k in t ? t[k] : () => {}; },
    set(t, k, v) { t[k] = v; return true; }
  });
}

let pendingFrame = null;
global.requestAnimationFrame = cb => { pendingFrame = cb; return 1; };
let clock = 0;
function step(ms) { clock += ms; const cb = pendingFrame; pendingFrame = null; if (cb) cb(clock); }

require(path.join(ROOT, 'js/levels.js'));
require(path.join(ROOT, 'js/geom.js'));
require(path.join(ROOT, 'js/judge.js'));
const CFG = require(path.join(ROOT, 'js/config.js'));
const CORE = require(path.join(ROOT, 'js/core.js'));
const S4 = globalThis.TANGRAM_SETS.tangram4;
const S7 = globalThis.TANGRAM_SETS.tangram7;

let fail = 0;
function check(label, ok, detail) {
  if (!ok) fail++;
  console.log(`  [${ok ? 'OK' : 'XX'}] ${label}${detail ? '  ' + detail : ''}`);
}
function section(t) { console.log('\n== ' + t + ' =='); }
const md5 = p => crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex');
const near = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 0.5 : tol);

const store = {};
const env = {
  ctx: makeCtx(),
  tutorial: false,
  size: () => ({ w: 375, h: 812 }),
  dpr: () => 3,
  safeInsets: () => ({ top: 20, bottom: 0 }),
  bindInput() {},
  storage: { get: k => (k in store ? store[k] : null), set: (k, v) => { store[k] = v; } },
  audio: { unlock() {}, setEnabled() {}, play() {}, duck() {}, setVisible() {}, setScene() {} },
  vibrate() {}, images: {}, share() {}, onHide() {}, onShow() {},
  cloud: { enabled: () => false, init(cb) { setTimeout(() => cb('no-cloud'), 0); },
    load(cb) { setTimeout(() => cb('no-cloud'), 0); },
    save(p, cb) { setTimeout(() => cb(null, {}), 0); },
    rank(t, cb) { setTimeout(() => cb(null, { list: [], me: null }), 0); } },
  ad: { placeholder: true, banner() {}, rewarded(kind, cb) { cb(true, ''); } }
};

const game = CORE(env);
game.init();
step(16);
const S = game.state, D = game._debug;
D.useSet('tangram7');
step(16);

/* ================= 1. 三星门槛配置 ================= */
section('1. 三星门槛：parTime × 0.8，二星不动');
const F3 = CFG.STAR.threeStarTimeFactor;
check('STAR.threeStarTimeFactor = 0.8', F3 === 0.8, String(F3));
check('二星门槛保持 1.6（只动三星）', CFG.STAR.twoStarTimeFactor === 1.6,
  String(CFG.STAR.twoStarTimeFactor));

/* 全 93 关：三星窗口必须「明显紧于时限」，也不能短到不可能 */
const LIMIT = CFG.TIMER.fixedSec;
let t3Min = 1e9, t3Max = 0, worst = '', tooTight = '', tooLoose = '';
['tangram4', 'tangram7'].forEach(k => {
  (k === 'tangram4' ? S4 : S7).levels.forEach(lv => {
    const t3 = lv.parTime * F3;
    if (t3 < t3Min) { t3Min = t3; worst = k + ':' + lv.id; }
    if (t3 > t3Max) t3Max = t3;
    if (t3 < 55) tooTight += k + ':' + lv.id + ' ';
    if (t3 > LIMIT * 0.75) tooLoose += k + ':' + lv.id + ' ';
  });
});
const total = S4.levels.length + S7.levels.length;
check('全 ' + total + ' 关的三星窗口 ≤ 时限 75%（' + LIMIT + 's → ≤ ' + (LIMIT * 0.75) + 's）',
  tooLoose === '', tooLoose || '最大 ' + t3Max.toFixed(1) + 's');
check('最短的三星窗口仍 ≥ 55 秒（不会短到不可能）', tooTight === '',
  tooTight || '最短 ' + t3Min.toFixed(1) + 's（' + worst + '）');
check('相对旧口径（parTime）整档收紧 20%', near(F3, 0.8, 1e-9), '0.8×');

/* ================= 2. 运行时星级四档边界 ================= */
section('2. 运行时判定：3★ / 2★ / 1★ 的边界确实动了');
/* 抽三关：首个几何关、蛇（最宽的生肖关）、最后一张字母关 */
const picks = [0, S7.levels.findIndex(l => l.name === '蛇'), S7.levels.length - 1];
const cases = [
  { name: '用时 79% par + 步数刚好', f: 0.79, ds: 0, want: 3 },
  { name: '用时 95% par + 步数刚好（旧口径本可三星）', f: 0.95, ds: 0, want: 2 },
  { name: '用时 50% par 但步数超一档', f: 0.5, ds: 1, want: 2 },
  { name: '用时 170% par（超二星线）', f: 1.7, ds: 0, want: 1 }
];
D.useSet('tangram7'); step(16);
picks.forEach(idx => {
  const lv = S7.levels[idx];
  cases.forEach(c => {
    delete S.save.starOf[String(idx + 1)];
    S.save.coin = 0;
    D.setupLevel(idx);
    S.page = 'play'; S.win = null; S.result = null;
    S.elapsed = lv.parTime * c.f;
    S.steps = lv.parSteps + c.ds;
    D.win();
    const got = S.result ? S.result.stars : -1;
    check('L' + (idx + 1) + '「' + lv.name + '」' + c.name + ' → ' + c.want + '★',
      got === c.want, '实际 ' + got + '★');
  });
});

/* ================= 3. 提示面板：两枚按钮同尺寸 ================= */
section('3. 提示面板：巧币 / 视频按钮尺寸统一为 480×92');
const coreSrc = fs.readFileSync(path.join(ROOT, 'js/core.js'), 'utf8');
const blk = re => { const m = coreSrc.match(re); return m ? m[0] : ''; };
const coinBlk = blk(/var bCoin = \{[\s\S]{0,420}?\};/);
const adBlk = blk(/var bAd = \{[\s\S]{0,420}?\};/);
const itemBlk = blk(/var bItem = \{[\s\S]{0,320}?\};/);
check('巧币按钮 w480 × h92', /w: 480, h: 92/.test(coinBlk), coinBlk.replace(/\s+/g, ' ').slice(0, 90));
check('视频按钮 w480 × h92', /w: 480, h: 92/.test(adBlk), adBlk.replace(/\s+/g, ' ').slice(0, 90));
check('道具按钮也同尺寸（有道具时那一行不跳）', /w: 480, h: 92/.test(itemBlk),
  itemBlk.replace(/\s+/g, ' ').slice(0, 80));
check('巧币按钮字号 28（与视频按钮常态一致）', /size: 28/.test(coinBlk),
  (coinBlk.match(/size: [^,]+/) || [''])[0]);

D.setupLevel(1);
S.page = 'play'; S.overlay = null; S.win = null; S.result = null;
S.save.hintItems = 0;
S.save.coin = 300;
step(16);
rec.texts.length = 0; rec.paths.length = 0;
D.fireBtn('hint');
step(16);
check('提示面板已打开', S.overlay === 'hint', 'overlay=' + S.overlay);

/* 两枚按钮的外框：宽 480 / 高 92 的闭合路径（drawButton 会画两次：填充 + 裁剪，
 * 同一个外框会重复入列，按四元组去重） */
const boxes = [];
rec.paths.forEach(p => {
  if (near(p.w, 480, 1) && near(p.h, 92, 1)) {
    const key = [Math.round(p.x), Math.round(p.y), Math.round(p.w), Math.round(p.h)].join(':');
    if (!boxes.some(b => b.key === key)) boxes.push({ key, x: p.x, y: p.y, w: p.w, h: p.h });
  }
});
check('渲染出两枚 480×92 的按钮外框', boxes.length >= 2, '找到 ' + boxes.length + ' 个');
if (boxes.length >= 2) {
  const b1 = boxes[0], b2 = boxes[1];
  check('两枚按钮外框宽高完全相等',
    near(b1.w, b2.w, 0.01) && near(b1.h, b2.h, 0.01),
    b1.w.toFixed(1) + '×' + b1.h.toFixed(1) + ' vs ' + b2.w.toFixed(1) + '×' + b2.h.toFixed(1));
  check('两枚按钮水平中心重合', near(b1.x + b1.w / 2, b2.x + b2.w / 2, 0.01),
    (b1.x + b1.w / 2).toFixed(1) + ' vs ' + (b2.x + b2.w / 2).toFixed(1));
  check('两枚按钮纵向间距 104（居中叠放，不挤不散）',
    near(Math.abs(b2.y - b1.y), 104, 0.5), Math.abs(b2.y - b1.y).toFixed(1) + 'px');
}
const coinTx = rec.texts.find(t => t.s === (CFG.HINT.coinCost + ' · 买 1 次'));
const adTx = rec.texts.find(t => t.s === '免费一次');
check('两枚按钮的字号一致（28）', !!coinTx && !!adTx &&
  /28px/.test(coinTx.font) && /28px/.test(adTx.font),
  (coinTx ? coinTx.font : '-') + ' / ' + (adTx ? adTx.font : '-'));
check('两枚按钮文案仍在（图标 + 数字 / 图标 + 免费一次）', !!coinTx && !!adTx,
  [coinTx && coinTx.s, adTx && adTx.s].join('|'));

/* ================= 4. 三端模块一致 ================= */
section('4. 三端模块一致');
['config.js', 'geom.js', 'levels.js', 'core.js'].forEach(f => {
  const a = md5(path.join(ROOT, 'js', f));
  const b = md5(path.join(ROOT, 'preview/js', f));
  const c = md5(path.join(ROOT, 'miniprogram/js', f));
  check(f + ' 三端一致', a === b && b === c, a.slice(0, 8) + '/' + b.slice(0, 8) + '/' + c.slice(0, 8));
});

console.log('\n' + (fail ? '!! ' + fail + ' 项未通过' : 'v0.60 验收全部通过'));
process.exit(fail ? 1 : 0);
