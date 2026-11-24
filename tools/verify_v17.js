/* v0.17 专项验收：对局页顶栏常驻「巧币 / 体力」余量胶囊
 * 用法：node tools/verify_v17.js
 *
 * 用户这次的要求只有一句：顶部巧币和体力的胶囊区域要进游戏后也展示，
 * 因为局内买提示 / 巧币复活都要花钱，得随时能看余量。
 * 所以本脚本盯四件事：
 *   1) 对局页确实画出了两个数字，且位置在倒计时胶囊右侧、不越界；
 *   2) 数值一变（扣巧币、改体力）下一帧就跟着变，不是进关时拍一次快照；
 *   3) 复活 / 结算弹层仍能看到余额（遮罩不能把它压没）；
 *   4) 宽度自适应：位数变长时降字号，绝不压到倒计时胶囊上。
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');

/* ---------- 记录型 ctx：既要文字内容，也要字号（验证降字号兜底） ---------- */
const rec = { texts: [] };
let curFont = '16px x';

function makeCtx() {
  const grad = { addColorStop() {} };
  const base = {
    canvas: { width: 0, height: 0, style: {} },
    globalAlpha: 1,
    get font() { return curFont; },
    set font(v) { curFont = String(v); },
    measureText(s) { return { width: String(s).length * 15 }; },
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
    createPattern: () => null,
    fillText(s, x, y) {
      const m = /(\d+(?:\.\d+)?)px/.exec(curFont);
      rec.texts.push({
        s: String(s), x, y,
        size: m ? +m[1] : 0,
        color: base.fillStyle,
        align: base.textAlign
      });
    },
    stroke() {}, fill() {}, fillRect() {},
    arc() {}, moveTo() {}, lineTo() {}, setLineDash() {},
    save() {}, restore() {}, beginPath() {}, closePath() {}, arcTo() {},
    bezierCurveTo() {}, quadraticCurveTo() {}, rect() {}, translate() {},
    rotate() {}, scale() {}, clip() {}, drawImage() {}, setTransform() {},
    clearRect() {}, strokeRect() {}, ellipse() {}
  };
  return new Proxy(base, {
    get(t, k) { return k in t ? t[k] : () => {}; },
    set(t, k, v) { t[k] = v; return true; }
  });
}

let pendingFrame = null;
global.requestAnimationFrame = cb => { pendingFrame = cb; return 1; };
let clock = 0;
function step(ms) {
  clock += ms;
  const cb = pendingFrame;
  pendingFrame = null;
  if (cb) cb(clock);
}

require(path.join(ROOT, 'js/levels.js'));
require(path.join(ROOT, 'js/geom.js'));
require(path.join(ROOT, 'js/judge.js'));
const CFG = require(path.join(ROOT, 'js/config.js'));
const CORE = require(path.join(ROOT, 'js/core.js'));

let fail = 0;
function check(label, ok, detail) {
  if (!ok) fail++;
  console.log(`  [${ok ? 'OK' : 'XX'}] ${label}${detail ? '  ' + detail : ''}`);
}
function section(t) { console.log('\n== ' + t + ' =='); }

const store = {};
const adLog = { rewarded: [] };
const env = {
  ctx: makeCtx(),
  tutorial: false,   // v0.21：这些脚本专测横向系统，关掉第 1 关教学
  size: () => ({ w: 375, h: 812 }),
  dpr: () => 3,
  safeInsets: () => ({ top: 20, bottom: 0 }),
  bindInput(fn) { env._in = fn; },
  storage: { get: k => (k in store ? store[k] : null), set: (k, v) => { store[k] = v; } },
  audio: { unlock() {}, setEnabled() {}, play() {}, duck() {}, setVisible() {}, setScene() {} },
  vibrate() {}, images: {},
  share() {}, onHide() {}, onShow() {},
  cloud: {
    enabled: () => false, init(cb) { setTimeout(() => cb('no-cloud'), 0); },
    load(cb) { setTimeout(() => cb('no-cloud'), 0); },
    save(p, cb) { setTimeout(() => cb(null, {}), 0); },
    rank(t, cb) { setTimeout(() => cb(null, { list: [], me: null }), 0); }
  },
  ad: {
    placeholder: true,
    banner() {},
    rewarded(kind, cb) { adLog.rewarded.push(kind); cb(true, ''); }
  }
};

const SCALE = Math.min(375 / CFG.DESIGN.w, 812 / CFG.DESIGN.h);
const css = (x, y) => [x * SCALE, y * SCALE];
function tapD(x, y) {
  const p = css(x, y);
  env._in('down', p[0], p[1]); step(16);
  env._in('up', p[0], p[1]); step(16);
}

/* 对局页顶栏几何（与 core.js renderPlay 保持一致；v09 用正则锁住了 capW=240 这个常量，
 * 所以这里抄它不会漂） */
const CAP_W = 240;
const CAP_CX = CFG.DESIGN.w / 2;
const CAP_L = CAP_CX - CAP_W / 2;
const CAP_R = CAP_CX + CAP_W / 2;
const BACK_R = 108;                               // 返回按钮右沿（按钮 32..108）
/* 真机微信原生胶囊（「···」+「○」）在 375 屏约 x 278~368 CSS → 设计 556~736。
 * 它是系统层 UI，盖在画布之上：画在那儿的 HUD 会被压掉一半。 */
const WX_MENU_L = 556;
const VIEW_SAFE_TOP = Math.max(CFG.SAFE.top, 20 / SCALE);
const M = CFG.LAYOUT.HUD_MIN;
/* v0.29.1：HUD 回到左上角（返回按钮右沿 108 之后），并整体上移 topShift。 */
const BY = VIEW_SAFE_TOP + 40 - (M.topShift || 0); // 顶栏中线（含上移量）
const HUD_L = M.left;
const HUD_R = HUD_L + M.maxW;

const TB = CFG.LAYOUT.TOOLBAR;
const TOOL_TOTAL = 5 * TB.w + 4 * TB.gap;
const TOOL_X0 = CFG.LAYOUT.BOARD.x + (CFG.LAYOUT.BOARD.size - TOOL_TOTAL) / 2;
const HINT_X = TOOL_X0 + 3 * (TB.w + TB.gap) + TB.w / 2;
const HINT_Y = TB.y + TB.h / 2;

function grab(fn) {
  rec.texts.length = 0;
  fn();
  return rec.texts.slice();
}
function textsOf(arr) { return arr.map(t => t.s).join('|'); }
/* 在 HUD 的横向范围内找某段文字（coin 数 / 体力 16/16） */
function hudTexts(arr) {
  return arr.filter(t => t.x >= HUD_L - 4 && t.x <= HUD_R + 4);
}
function md5(p) { return crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex'); }

(async function main() {
  console.log('v0.17 验收：对局页常驻巧币 / 体力胶囊');
  const game = CORE(env);
  game.init();
  step(16);
  const S = game.state;
  const D = game._debug;

  /* ================= 1. 配置与几何 ================= */
  section('1. 配置与几何净空');
  check('版本号 v0.17 起（含后续补丁版）', /^v0\.\d+(\.\d+)?$/.test(CFG.version), CFG.version);
  check('HUD_MIN 存在且关键值符合设计',
    !!M && M.pillH === 36 && M.rowGap === 44 && M.maxW === 127 && M.left === 120
      && M.topShift === 8 && M.rightAnchor === false,
    M ? `left=${M.left} pillH=${M.pillH} rowGap=${M.rowGap} maxW=${M.maxW} topShift=${M.topShift}` : 'missing');
  const hudTop = BY - (M.rowGap + M.pillH) / 2;
  const hudBot = BY + (M.rowGap + M.pillH) / 2;
  /* v0.33 广告位删除后，卡纸顶就是硬边界（BOARD.y=184），口径不变 */
  check('两枚胶囊竖排：略贴安全区上沿、下不撞卡纸',
    hudTop >= VIEW_SAFE_TOP - (M.topShift || 0) && hudBot < CFG.LAYOUT.BOARD.y,
    `${hudTop} ≥ ${VIEW_SAFE_TOP - (M.topShift || 0)} 且 ${hudBot} < ${CFG.LAYOUT.BOARD.y}`);
  check('HUD 在返回按钮右侧、不越设计宽度',
    HUD_L >= BACK_R + 8 && HUD_R <= CFG.DESIGN.w, `left=${HUD_L} right=${HUD_R}`);
  check('最宽情况下仍与倒计时胶囊留出 ≥8 净空',
    CAP_L - HUD_R >= 8, `hudRight=${HUD_R} capLeft=${CAP_L} 净空=${CAP_L - HUD_R}`);
  check('v0.29.1 用户更正：HUD 已回到左上角并上移 8px',
    M.rightAnchor === false && M.left === 120 && M.topShift === 8,
    `left=${M.left} topShift=${M.topShift}`);

  /* ================= 2. 对局页：数字真的画出来了 ================= */
  section('2. 对局页画出两枚余量胶囊');
  S.save.coin = 128; S.save.energy = 9; S.save.energyMax = 16;
  D.setupLevel(0); D.go('play');
  let tx = grab(() => step(16));
  let hud = hudTexts(tx);
  check('对局页出现巧币数字 128', hud.some(t => t.s === '128'),
    textsOf(hud));
  check('对局页出现体力 9/16（主数字 + 分母分两段画）',
    hud.some(t => t.s === '9') && hud.some(t => t.s === '/16'),
    textsOf(hud));
  check('倒计时仍在、没被挤出屏幕', tx.some(t => /^\d\d:\d\d$/.test(t.s)),
    textsOf(tx.filter(t => /^\d\d:\d\d$/.test(t.s))));
  const coinT = hud.filter(t => t.s === '128')[0];
  check('巧币数字位于顶栏左侧（返回按钮与倒计时之间）',
    !!coinT && coinT.x > BACK_R && coinT.x < CAP_L,
    coinT ? `x=${coinT.x.toFixed(0)} ∈ (${BACK_R}, ${CAP_L})` : 'not found');
  check('数字不越出胶囊右沿',
    !!coinT && coinT.x + 40 <= HUD_R, coinT ? `x=${coinT.x.toFixed(0)} ≤ ${HUD_R}` : '');
  /* v0.17：关号让位到卡纸内（顶栏塞不下四组元素），但仍必须看得见 */
  const headT = tx.filter(t => /^第 \d+ 关/.test(t.s))[0];
  check('关号仍在且已挪进卡纸内左上角（不再占顶栏）',
    !!headT && headT.y > CFG.LAYOUT.BOARD.y && headT.x < CFG.DESIGN.w / 2,
    headT ? `"${headT.s}" x=${headT.x.toFixed(0)} y=${headT.y.toFixed(0)}` : 'not found');
  check('体力分母用更小字号（主次分明）',
    (function () {
      const m = hud.filter(t => t.s === '9')[0], sub = hud.filter(t => t.s === '/16')[0];
      return !!m && !!sub && sub.size < m.size && sub.size >= 12;
    })(),
    (function () {
      const m = hud.filter(t => t.s === '9')[0], sub = hud.filter(t => t.s === '/16')[0];
      return `main=${m && m.size} sub=${sub && sub.size}`;
    })());

  /* ================= 3. 数值实时跟随（不是进关快照） ================= */
  section('3. 余量实时跟随');
  S.save.coin = 206; S.save.hintItems = 0;
  tx = grab(() => step(16));
  check('改存档后下一帧就变成 206', hudTexts(tx).some(t => t.s === '206'), textsOf(hudTexts(tx)));
  /* 真链路：点提示 → 面板 → 花 30 巧币买一档 → 顶栏要立刻变 176（v0.23：40→30） */
  D.fireBtn('hint');
  check('点提示先弹面板', S.overlay === 'hint', 'overlay=' + S.overlay);
  D.fireBtn('hint_coin');
  check('花 30 巧币后余额 176', S.save.coin === 176, 'coin=' + S.save.coin);
  tx = grab(() => step(16));
  check('买完提示，顶栏余额同步成 176（不必退回主页才看到）',
    hudTexts(tx).some(t => t.s === '176'), textsOf(hudTexts(tx)));
  check('176 出现在面板关闭之后的对局页', S.overlay === null || S.overlay === 'hint',
    'overlay=' + S.overlay);
  S.save.energy = 2;
  tx = grab(() => step(16));
  check('体力变成 2/16 时同步显示', hudTexts(tx).some(t => t.s === '2') &&
    hudTexts(tx).some(t => t.s === '/16'), textsOf(hudTexts(tx)));

  /* ================= 4. 位数兜底 ================= */
  section('4. 位数兜底：万/亿折算，绝不顶到倒计时');
  S.save.coin = 1280;
  tx = grab(() => step(16));
  check('4 位数原样显示 1280', hudTexts(tx).some(t => t.s === '1280'), textsOf(hudTexts(tx)));
  S.save.coin = 12345;
  tx = grab(() => step(16));
  check('5 位起折算成「1.2万」（不再是一串数字）',
    hudTexts(tx).some(t => t.s === '1.2万'), textsOf(hudTexts(tx)));
  S.save.coin = 999999999;
  tx = grab(() => step(16));
  hud = hudTexts(tx);
  const bigT = hud.filter(t => t.s === '10亿')[0];
  check('9 位折算成「10亿」', !!bigT, textsOf(hud));
  check('折算后仍在胶囊内，右沿不越界',
    !!bigT && bigT.x + 40 <= HUD_R, bigT ? `x=${bigT.x.toFixed(0)} ≤ ${HUD_R}` : '');
  check('折算后不必降字号（24 就放得下）',
    !!bigT && bigT.size === M.fontSize, bigT ? 'size=' + bigT.size : '');
  S.save.coin = 128;

  /* ================= 5. 不挂热区 ================= */
  section('5. HUD 不抢点击');
  S.overlay = null;
  const p0 = S.page, ov0 = S.overlay;
  tapD(HUD_L + 50, BY);                    // 直接点在最上面那枚胶囊中间
  check('点 HUD 不翻页、不弹面板（纯展示）',
    S.page === p0 && S.overlay === ov0, `page=${S.page} overlay=${S.overlay}`);
  check('点 HUD 不改巧币', S.save.coin === 128, 'coin=' + S.save.coin);

  /* ================= 6. 弹层里也看得见 ================= */
  section('6. 复活 / 结算弹层保留余额');
  S.save.coin = 210;
  S.overlay = 'fail'; S.failT = 0; S.timeLeft = 0; S.hearts = 0;
  tx = grab(() => step(16));
  check('复活弹层上仍画出巧币 210', hudTexts(tx).some(t => t.s === '210'), textsOf(hudTexts(tx)));
  check('复活弹层上仍画出体力', hudTexts(tx).some(t => t.s === '/16'), textsOf(hudTexts(tx)));
  check('复活按钮的报价（100）与余额并存，玩家能自己判断够不够',
    tx.some(t => /花 \d+ 巧币复活/.test(t.s)) && hudTexts(tx).some(t => t.s === '210'),
    textsOf(tx.filter(t => /巧币复活/.test(t.s))));

  S.overlay = 'result'; S.resT = 999; S.win = null;
  S.result = { stars: 3, coin: 20, energy: 0 };
  S.starShown = 3; S.streakGain = 0;
  tx = grab(() => step(16));
  check('结算弹层上仍画出巧币余额', hudTexts(tx).some(t => t.s === '210'), textsOf(hudTexts(tx)));
  S.overlay = null; S.resT = 0; S.result = null;

  /* ================= 7. 主页没被改坏 ================= */
  section('7. 主页 HUD 不受影响');
  D.go('home');
  tx = grab(() => step(16));
  const homeE = tx.filter(t => /^\d+\/16$/.test(t.s))[0];
  check('主页左上角仍是原来的整条「N/16」单行文字（不是拆成两段）',
    !!homeE && homeE.x < CFG.DESIGN.w / 2, homeE ? `"${homeE.s}" x=${homeE.x.toFixed(0)}` : textsOf(tx).slice(0, 80));
  check('主页该显示当前体力 2/16', !!homeE && homeE.s === '2/16', homeE && homeE.s);

  /* ================= 8. 三端同步 ================= */
  section('8. 三端同步（src → preview / miniprogram）');
  const pairs = [
    ['js/config.js', 'preview/js/config.js'],
    ['js/config.js', 'miniprogram/js/config.js'],
    ['js/core.js', 'preview/js/core.js'],
    ['js/core.js', 'miniprogram/js/core.js']
  ];
  pairs.forEach(function (p) {
    const a = path.join(ROOT, p[0]), b = path.join(ROOT, p[1]);
    check(p[0] + ' ≡ ' + p[1], fs.existsSync(b) && md5(a) === md5(b),
      fs.existsSync(b) ? md5(b).slice(0, 8) : 'missing');
  });

  console.log('\n' + (fail === 0 ? 'v0.17 全部通过' : `!! ${fail} 项未通过`));
  process.exit(fail === 0 ? 0 : 1);
})();
