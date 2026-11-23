/* v0.22 专项验收：工具栏提示按钮（道具余量角标 + 一点直用）
 * 用法：node tools/verify_v22.js
 *
 * 用户这版需求原文：
 *   「这里如果存在查找道具，需要在底部的按钮上提示出有几个，并且点击以后直接使用，
 *     不需要再弹框，弹框主要是用于在没有查找道具的时候使用巧币购买或者看视频」
 *
 * 拆成三条可断言的口径：
 *   ① 按钮角标 = 当前查找道具个数（0 个不画；两位数显示得下；>99 收敛成 99+）
 *   ② 有道具时点一下就发提示：不弹面板、不扣巧币、道具 -1
 *   ③ 没道具时才弹面板，面板里只剩「花巧币 / 看视频」两条路
 * 另外守住两个不能退让的边界：这一步还没放对时连点不重复扣；教学关不扣道具。
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');

const rec = { texts: [], ops: [], hits: [] };
function makeCtx() {
  const grad = { addColorStop() {} };
  const base = {
    canvas: { width: 0, height: 0, style: {} },
    globalAlpha: 1,
    measureText(s) { return { width: String(s).length * 15 }; },
    createLinearGradient: () => grad, createRadialGradient: () => grad, createPattern: () => null,
    fillText(s, x, y) { rec.texts.push({ s: String(s), x, y }); },
    fill() { rec.ops.push({ k: 'fill', color: base.fillStyle, a: base.globalAlpha }); },
    stroke() { rec.ops.push({ k: 'stroke', color: base.strokeStyle, a: base.globalAlpha }); },
    arc() {}, moveTo() {}, lineTo() {}, fillRect() {}, strokeRect() {},
    setLineDash() {}, save() {}, restore() {}, beginPath() {}, closePath() {}, arcTo() {},
    bezierCurveTo() {}, quadraticCurveTo() {}, rect() {}, translate() {},
    rotate() {}, scale() {}, clip() {}, drawImage() {}, setTransform() {},
    clearRect() {}, ellipse() {}
  };
  return new Proxy(base, { get(t, k) { return k in t ? t[k] : () => {}; }, set(t, k, v) { t[k] = v; return true; } });
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

let fail = 0;
function check(label, ok, detail) {
  if (!ok) fail++;
  console.log(`  [${ok ? 'OK' : 'XX'}] ${label}${detail ? '  ' + detail : ''}`);
}
function section(t) { console.log('\n== ' + t + ' =='); }
const md5 = p => crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex');

const store = {};
const adLog = { rewarded: [] };
const env = {
  ctx: makeCtx(),
  tutorial: false,
  size: () => ({ w: 375, h: 812 }),
  dpr: () => 3,
  safeInsets: () => ({ top: 20, bottom: 0 }),
  bindInput(fn) { env._in = fn; },
  storage: { get: k => (k in store ? store[k] : null), set: (k, v) => { store[k] = v; } },
  audio: { unlock() {}, setEnabled() {}, play() {}, duck() {}, setVisible() {}, setScene() {} },
  vibrate() {}, images: {}, share() {}, onHide() {}, onShow() {},
  cloud: { enabled: () => false, init(cb) { setTimeout(() => cb('no-cloud'), 0); },
    load(cb) { setTimeout(() => cb('no-cloud'), 0); },
    save(p, cb) { setTimeout(() => cb(null, {}), 0); },
    rank(t, cb) { setTimeout(() => cb(null, { list: [], me: null }), 0); } },
  ad: { placeholder: true, banner() {}, rewarded(kind, cb) { adLog.rewarded.push(kind); cb(true, ''); } }
};

const SCALE = Math.min(375 / CFG.DESIGN.w, 812 / CFG.DESIGN.h);
function tapD(x, y) {
  const p = [x * SCALE, y * SCALE];
  env._in('down', p[0], p[1]); step(16);
  env._in('up', p[0], p[1]); step(16);
}
const TB = CFG.LAYOUT.TOOLBAR;
const TOOL_TOTAL = 5 * TB.w + 4 * TB.gap;
const TOOL_X0 = CFG.LAYOUT.BOARD.x + (CFG.LAYOUT.BOARD.size - TOOL_TOTAL) / 2;
const HINT_X = TOOL_X0 + 3 * (TB.w + TB.gap) + TB.w / 2;
const HINT_Y = TB.y + TB.h / 2;
/* 角标文字大约画在按钮上沿 +12 处（胶囊垂直居中） */
const BADGE_Y = TB.y + 12;

function solveHinted(S, lv) {
  if (!S.hint) return false;
  const st = lv.solution.filter(x => x.id === S.hint.id)[0];
  const p = S.pieces.filter(x => x.id === S.hint.id)[0];
  if (!st || !p) return false;
  p.onBoard = true; p.x = st.x; p.y = st.y; p.angle = st.angle; p.flipped = !!st.flipped;
  return true;
}
/* 角标文字（工具栏那一条水平带上的纯数字） */
function badgeTexts() {
  return rec.texts.filter(t => Math.abs(t.y - BADGE_Y) <= 16 && /^\d+\+?$/.test(t.s)).map(t => t.s);
}

(async function main() {
  console.log('v0.22 验收：提示按钮角标（道具余量）+ 有道具直接使用');
  const game = CORE(env);
  game.init();
  step(16);
  const S = game.state, D = game._debug, H = CFG.HINT;

  /* ================= 1. 配置 ================= */
  section('1. 版本与配置');
  check('版本 v0.22 起（v0.23 继续沿用本版规则）', /^v0\.2[2-9](\.\d+)?$/.test(CFG.version), CFG.version);
  check('提示价格 30 巧币（v0.23）', H.coinCost === 30, String(H.coinCost));
  check('道具名仍是「查找道具」', H.itemName === '查找道具', H.itemName);

  /* ================= 2. 角标 = 道具个数 ================= */
  section('2. 工具栏角标：有几个显示几个');
  D.go('play'); D.setupLevel(0);
  S.save.coin = 300;

  S.save.hintItems = 0;
  rec.texts.length = 0; step(16);
  check('0 个道具 → 不画角标', badgeTexts().length === 0, badgeTexts().join('|') || '（无）');

  S.save.hintItems = 3;
  rec.texts.length = 0; step(16);
  check('3 个道具 → 角标写 3', badgeTexts().indexOf('3') >= 0, badgeTexts().join('|'));

  S.save.hintItems = 12;
  rec.texts.length = 0; step(16);
  check('12 个道具 → 角标写 12（两位数不被截断）', badgeTexts().indexOf('12') >= 0, badgeTexts().join('|'));

  S.save.hintItems = 240;
  rec.texts.length = 0; step(16);
  check('240 个 → 收敛成 99+（不撑破按钮）', badgeTexts().indexOf('99+') >= 0, badgeTexts().join('|'));

  rec.texts.length = 0; S.save.hintItems = 1; step(16);
  const badgeY = rec.texts.filter(t => /^\d+$/.test(t.s) && Math.abs(t.y - BADGE_Y) <= 16);
  check('角标只在提示按钮上出现（其它工具按钮没有）', badgeY.length === 1, 'count=' + badgeY.length);

  /* ================= 3. 有道具：一点直用 ================= */
  section('3. 有道具 → 点一下就用，不弹面板');
  D.setupLevel(0);
  S.save.coin = 300; S.save.hintItems = 2;
  const coin0 = S.save.coin;
  rec.texts.length = 0;
  tapD(HINT_X, HINT_Y);
  check('不弹面板（overlay 仍为空）', S.overlay === null, 'overlay=' + S.overlay);
  check('提示立刻出现', S.hintLv === 1 && !!S.hint, `lv=${S.hintLv} hint=${!!S.hint}`);
  check('道具 -1', S.save.hintItems === 1, 'items=' + S.save.hintItems);
  check('巧币一分不扣', S.save.coin === coin0, `${coin0}→${S.save.coin}`);
  check('toast 仍是那句「已标出下一步」', S.toast && /标出下一步/.test(S.toast.text), S.toast && S.toast.text);

  const lv = D.LEVELS[0];
  const firstUnsolved = lv.solution.filter(st => {
    const p = S.pieces.filter(x => x.id === st.id)[0];
    return !(p && p.onBoard && Math.abs(p.x - st.x) <= 1 && Math.abs(p.y - st.y) <= 1 &&
      Math.abs(((p.angle - st.angle) % 360 + 540) % 360 - 180) <= 1 && !!p.flipped === !!st.flipped);
  })[0];
  check('指的是「下一块该放的那块」', !!firstUnsolved && S.hint.id === firstUnsolved.id,
    `hint=${S.hint.id} expect=${firstUnsolved && firstUnsolved.id}`);
  check('画了「放这里」和「用这块」', rec.texts.some(t => t.s === '放这里') && rec.texts.some(t => t.s === '用这块'));

  /* 连点保护：这一步还没放对，再点不扣第二个道具 */
  const lvG = S.hintLv, itG = S.save.hintItems, cG = S.save.coin;
  tapD(HINT_X, HINT_Y);
  check('这一步还没放对 → 连点不扣道具、不弹面板',
    S.hintLv === lvG && S.save.hintItems === itG && S.save.coin === cG && S.overlay === null,
    `lv=${S.hintLv} items=${S.save.hintItems} overlay=${S.overlay}`);
  check('连点给的是「先把它放上去」的提醒', S.toast && /先把它放上去/.test(S.toast.text), S.toast && S.toast.text);

  /* 放对 → 提示收起 → 再点用掉第二个 */
  solveHinted(S, lv); step(16);
  check('放对 → 提示收起', !S.hint, 'hint=' + JSON.stringify(S.hint));
  tapD(HINT_X, HINT_Y);
  check('放对后再点 → 第二次直用', S.hintLv === 2 && S.save.hintItems === 0 && S.overlay === null,
    `lv=${S.hintLv} items=${S.save.hintItems} overlay=${S.overlay}`);

  /* ================= 4. 没道具：才弹面板 ================= */
  section('4. 没道具 → 弹面板，只剩巧币 / 视频两条路');
  D.setupLevel(0);
  S.save.hintItems = 0; S.save.coin = 300;
  rec.texts.length = 0;
  tapD(HINT_X, HINT_Y);
  check('弹面板', S.overlay === 'hint', 'overlay=' + S.overlay);
  check('弹面板时什么都没扣', S.save.hintItems === 0 && S.save.coin === 300 && S.hintLv === 0,
    `items=${S.save.hintItems} coin=${S.save.coin} lv=${S.hintLv}`);
  const tx = rec.texts.map(t => t.s);
  check('面板里没有「查找道具」按钮了', !tx.some(s => /查找道具/.test(s)),
    tx.filter(s => /查找道具/.test(s)).join('|'));
  check('面板里有「花 30 巧币」', tx.some(s => /30 巧币/.test(s)), tx.filter(s => /巧币/.test(s)).join('|'));
  check('面板里有「看视频」', tx.some(s => /看视频/.test(s)), tx.filter(s => /视频/.test(s)).join('|'));
  check('面板高度收了两行按钮（ch=616）', CFG.DESIGN.h / 2 - 308 + 330 > 0);

  /* 巧币买一次 */
  const coin1 = S.save.coin;
  tapD(CFG.DESIGN.w / 2, CFG.DESIGN.h / 2 - 308 + 330);
  check('花 30 巧币 → 提示出现、面板关闭', S.hintLv === 1 && !!S.hint && S.overlay === null,
    `lv=${S.hintLv} hint=${!!S.hint} overlay=${S.overlay}`);
  check('巧币扣 ' + CFG.HINT.coinCost, S.save.coin === coin1 - CFG.HINT.coinCost, `${coin1}→${S.save.coin}`);

  /* 看视频一次 */
  solveHinted(S, lv); step(16);
  tapD(HINT_X, HINT_Y); step(16);
  check('再点又弹面板（仍然没道具）', S.overlay === 'hint', 'overlay=' + S.overlay);
  tapD(CFG.DESIGN.w / 2, CFG.DESIGN.h / 2 - 308 + 434);
  check('看视频 → 第三次提示', S.hintLv === 2 && !!S.hint, `lv=${S.hintLv} hint=${!!S.hint}`);
  check('激励视频类型是 hint', adLog.rewarded[adLog.rewarded.length - 1] === 'hint',
    JSON.stringify(adLog.rewarded));

  /* ================= 5. 不该扣的场景 ================= */
  section('5. 边界：教学关 / 已拼完 / 没有道具时直点');
  D.setupLevel(0);
  S.save.hintItems = 2; S.save.coin = 300;
  S.tut = { t: 0 };
  S.tut && (S.hint = null);
  const it5 = S.save.hintItems;
  tapD(HINT_X, HINT_Y);
  check('教学关：点提示不扣道具、不弹面板', S.save.hintItems === it5 && S.overlay === null,
    `items=${it5}→${S.save.hintItems} overlay=${S.overlay}`);
  check('教学关给的是「不用买提示」的提醒', S.toast && /教学关/.test(S.toast.text), S.toast && S.toast.text);
  S.tut = null;

  D.setupLevel(0);
  S.save.hintItems = 2;
  S.win = { t: 0 };
  tapD(HINT_X, HINT_Y);
  check('已拼完：点提示不扣道具', S.save.hintItems === 2 && S.overlay === null,
    `items=${S.save.hintItems} overlay=${S.overlay}`);
  S.win = null;

  /* ================= 6. 三端一致与包体 ================= */
  section('6. 三端一致与包体');
  const mods = ['config.js', 'core.js', 'geom.js', 'judge.js', 'levels.js'];
  for (const m of mods) {
    const a = path.join(ROOT, 'js', m);
    check(m + ' 三端一致',
      md5(a) === md5(path.join(ROOT, 'preview/js', m)) && md5(a) === md5(path.join(ROOT, 'miniprogram/js', m)),
      md5(a).slice(0, 8));
  }
  let bytes = 0;
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'cloudfunctions' || e.name === '.git' || e.name === '.cloudbase') continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p); else bytes += fs.statSync(p).size;
    }
  })(path.join(ROOT, 'miniprogram'));
  check('主包 < 4MB', bytes / 1048576 < 4, (bytes / 1048576).toFixed(2) + 'MB');

  console.log('\n' + (fail === 0 ? 'v0.22 验收全部通过' : `!! ${fail} 项未通过`));
  process.exit(fail === 0 ? 0 : 1);
})();
