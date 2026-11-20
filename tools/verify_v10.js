/* v0.10 专项验收：提示机制统一（三档阶梯）+ 广告入口 + 云环境 ID
 * 用法：node tools/verify_v10.js
 *
 * 覆盖用户这次提的两件事：
 *   1) 提醒/提示按钮到底怎么用 —— 现在统一成「每关 3 档、第 1 档免费、第 2/3 档
 *      看激励视频或花巧币」，且四巧/七巧同一套，不再有"按一次就灰"和"按一次更难"；
 *   2) 云开发环境 ID 已填进配置并同步三端。
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');

/* ---------- 记录型 ctx（记住 fillStyle + globalAlpha，用来抓档3 的淡显） ---------- */
const rec = { texts: [], fills: [], rects: [] };
function makeCtx() {
  const grad = { addColorStop() {} };
  const base = {
    canvas: { width: 0, height: 0, style: {} },
    globalAlpha: 1,
    measureText(s) { return { width: String(s).length * 15 }; },
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
    createPattern: () => null,
    fillText(s, x, y) { rec.texts.push({ s: String(s), x, y, color: base.fillStyle, alpha: base.globalAlpha }); },
    stroke() {},
    fill() { rec.fills.push({ color: base.fillStyle, alpha: base.globalAlpha }); },
    arc() {}, moveTo() {}, lineTo() {},
    fillRect(x, y, w, h) { rec.rects.push({ x, y, w, h, color: base.fillStyle }); },
    setLineDash() {},
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

/* ---------- 假环境（广告可控成功/失败） ---------- */
const store = {};
const adLog = { banner: [], rewarded: [], fail: false };
const env = {
  ctx: makeCtx(),
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
    banner(show, rect) { adLog.banner.push({ show, rect }); },
    rewarded(kind, cb) {
      adLog.rewarded.push(kind);
      if (adLog.fail) cb(false, '广告拉取失败，稍后再试');
      else cb(true, '');
    }
  }
};

const SCALE = Math.min(375 / CFG.DESIGN.w, 812 / CFG.DESIGN.h);
const css = (x, y) => [x * SCALE, y * SCALE];
function tapD(x, y) {
  const p = css(x, y);
  env._in('down', p[0], p[1]); step(16);
  env._in('up', p[0], p[1]); step(16);
}

/* 工具栏第 4 个按钮（hint）的设计坐标中心 */
const TOOLBAR = CFG.LAYOUT.TOOLBAR;
const TOOL_N = 5;
const TOOL_TOTAL = TOOL_N * TOOLBAR.w + (TOOL_N - 1) * TOOLBAR.gap;
const TOOL_X0 = CFG.LAYOUT.BOARD.x + (CFG.LAYOUT.BOARD.size - TOOL_TOTAL) / 2;
const HINT_X = TOOL_X0 + 3 * (TOOLBAR.w + TOOLBAR.gap) + TOOLBAR.w / 2;
const HINT_Y = TOOLBAR.y + TOOLBAR.h / 2;

/* 提示面板按钮（renderHint 的版式常数，与 core.js 保持一致） */
const SHEET = { ch: 800, cy: CFG.DESIGN.h / 2 };
const SHEET_TOP = SHEET.cy - SHEET.ch / 2;
const BTN_AD = { x: CFG.DESIGN.w / 2, y: SHEET_TOP + 470 };
const BTN_COIN = { x: CFG.DESIGN.w / 2, y: SHEET_TOP + 590 };

function md5(p) { return crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex'); }

(async function main() {
  console.log('v0.10 验收：统一提示机制 + 广告入口 + 云环境');
  const game = CORE(env);
  game.init();
  step(16);
  const S = game.state;
  const H = CFG.HINT;

  /* ---------- 1. 配置 ---------- */
  section('1. 配置与三端同步');
  check('版本号 ≥ v0.10', /^v0\.(1\d|[1-9])/.test(CFG.version), CFG.version);
  check('云开发环境 ID 已填', CFG.CLOUD.envId === 'cloud1-d4g6rm6duad5ba0aa', CFG.CLOUD.envId);
  check('云开发开关打开', CFG.CLOUD.enabled === true);
  const pairs = [['js/core.js', 'preview/js/core.js'], ['js/core.js', 'miniprogram/js/core.js'],
    ['js/config.js', 'preview/js/config.js'], ['js/config.js', 'miniprogram/js/config.js']];
  pairs.forEach(([a, b]) => check('三端一致 ' + b, md5(path.join(ROOT, a)) === md5(path.join(ROOT, b))));
  check('提示 3 档、免费 1 次、巧币 40',
    H.maxTier === 3 && H.freePerLevel === 1 && H.coinCost === 40,
    `maxTier=${H.maxTier} free=${H.freePerLevel} coin=${H.coinCost}`);
  check('ECON.coinHint 与 HINT.coinCost 同价', CFG.ECON.coinHint === H.coinCost,
    `econ=${CFG.ECON.coinHint} hint=${H.coinCost}`);

  /* ---------- 2. 第 1 档免费 ---------- */
  section('2. 第 1 档：免费直接给「指位置」');
  game._debug.go('play');
  game._debug.setupLevel(0);
  S.save.coin = 120;
  rec.texts.length = 0;
  step(16);
  const lv0 = game._debug.LEVELS[0];
  const sol0 = lv0.solution[0];
  check('本局初始 hintLv=0、未用提示', S.hintLv === 0 && S.hintUsed === false, `lv=${S.hintLv}`);
  tapD(HINT_X, HINT_Y);
  check('按一次提示 → 直接拿到第 1 档（不弹面板）',
    S.hintLv === 1 && S.hint && S.hint.tier === 1 && S.overlay === null,
    `hintLv=${S.hintLv} tier=${S.hint && S.hint.tier} overlay=${S.overlay}`);
  check('第 1 档指向「下一块该放的位置」', !!S.hint && S.hint.id === sol0.id, 'id=' + (S.hint && S.hint.id));
  check('第 1 档不标托盘（那是第 2 档的事）', !rec.texts.some(t => t.s === '用这块'));
  check('toast 告知档位与本关星级上限',
    !!S.toast && /提示 1\/3/.test(S.toast.text), S.toast && S.toast.text);
  check('提示写入本局标记 hintUsed', S.hintUsed === true);
  check('存档记录「本关用过提示」（历史标记）', S.save.hintUsed['1'] === true);

  /* ---------- 3. 第 2 档：弹面板，广告入口 ---------- */
  section('3. 第 2 档：先弹面板，看广告或花巧币');
  rec.texts.length = 0;
  tapD(HINT_X, HINT_Y);
  check('再按提示 → 打开提示面板（不偷加档）', S.overlay === 'hint' && S.hintLv === 1,
    `overlay=${S.overlay} hintLv=${S.hintLv}`);
  const panelTexts = rec.texts.map(t => t.s);
  check('面板写清下一档是什么', panelTexts.some(s => s === '第 2 档 · 指板件'), panelTexts.slice(0, 12).join('|'));
  check('面板给出两个入口：看视频 / 巧币',
    panelTexts.some(s => /看视频/.test(s)) && panelTexts.some(s => /40 巧币/.test(s)));
  check('面板说明星级规则', panelTexts.some(s => /最高 ★★/.test(s)));
  check('没配广告位时按钮照样可点（走模拟播放）', panelTexts.some(s => /看视频/.test(s)));

  const coinBefore = S.save.coin;
  tapD(BTN_AD.x, BTN_AD.y);
  check('点「看视频」→ 激励视频类型传 hint', adLog.rewarded[adLog.rewarded.length - 1] === 'hint',
    JSON.stringify(adLog.rewarded));
  check('看完广告 → 第 2 档生效、面板关闭',
    S.hintLv === 2 && S.hint.tier === 2 && S.overlay === null,
    `hintLv=${S.hintLv} tier=${S.hint && S.hint.tier} overlay=${S.overlay}`);
  check('看广告不扣巧币', S.save.coin === coinBefore, `${coinBefore}→${S.save.coin}`);
  rec.texts.length = 0;
  step(16);
  check('第 2 档标出托盘里那块（「用这块」）', rec.texts.some(t => t.s === '用这块'));

  /* ---------- 4. 第 3 档：巧币入口 ---------- */
  section('4. 第 3 档：巧币买「看全图」');
  tapD(HINT_X, HINT_Y);
  check('第 3 档同样先进面板', S.overlay === 'hint' && S.hintLv === 2);
  rec.texts.length = 0;
  step(16);
  check('面板显示第 3 档名称', rec.texts.some(t => t.s === '第 3 档 · 看全图'));
  const coin3 = S.save.coin;
  tapD(BTN_COIN.x, BTN_COIN.y);
  check('花 40 巧币 → 第 3 档生效', S.hintLv === 3 && S.hint.tier === 3 && S.overlay === null,
    `hintLv=${S.hintLv} tier=${S.hint && S.hint.tier}`);
  check('扣费准确（40）', S.save.coin === coin3 - 40, `${coin3}→${S.save.coin}`);

  /* 档3 会整幅淡显标准解：抓 alpha 0.2~0.5 的板件色填充 */
  rec.fills.length = 0;
  rec.texts.length = 0;
  S.hint.until = Date.now() + 99999;
  step(16);
  const palette = Object.keys(game._debug.dataset.pieces).map(k => game._debug.dataset.pieces[k].color);
  const ghosts = palette.filter(c => rec.fills.some(f => f.color === c && f.alpha > 0.2 && f.alpha < 0.5));
  check('第 3 档把整幅标准解淡显（全部板件色都出现）', ghosts.length === palette.length,
    ghosts.length + '/' + palette.length);
  check('第 3 档不再单独指某一块（全图与「用这块」不并存）',
    !rec.texts.some(t => t.s === '用这块'));

  /* ---------- 5. 用完 3 档 ---------- */
  section('5. 用满 3 档后的边界');
  rec.texts.length = 0;
  tapD(HINT_X, HINT_Y);
  check('第 4 次按 → 不弹面板、只提示已用完',
    S.overlay === null && S.hintLv === 3 && S.toast && /已经用完/.test(S.toast.text),
    `${S.overlay} lv=${S.hintLv} toast=${S.toast && S.toast.text}`);
  check('广告没有被偷偷拉起', adLog.rewarded.length === 1, 'calls=' + adLog.rewarded.length);

  /* 巧币不足 + 广告失败 */
  S.save.coin = 0;
  game._debug.setupLevel(0);
  tapD(HINT_X, HINT_Y);               // 免费第 1 档
  tapD(HINT_X, HINT_Y);               // 弹面板
  check('新一局档位重置（每关独立）', S.hintLv === 1 && S.overlay === 'hint',
    `lv=${S.hintLv} overlay=${S.overlay}`);
  S.hintLv = 1; S.overlay = 'hint';   // 回到第 2 档待付费状态
  tapD(BTN_COIN.x, BTN_COIN.y);
  check('巧币不足 → 不发提示', S.hintLv === 1 && S.toast && /巧币不足/.test(S.toast.text),
    `lv=${S.hintLv} toast=${S.toast && S.toast.text}`);
  check('巧币不足 → 引导去看视频', S.toast && /看视频/.test(S.toast.text));
  adLog.fail = true;
  tapD(BTN_AD.x, BTN_AD.y);
  check('广告失败 → 不发提示、面板留着（不吞次数）',
    S.hintLv === 1 && S.overlay === 'hint', `lv=${S.hintLv} overlay=${S.overlay}`);
  adLog.fail = false;

  /* ---------- 6. 每关独立 / 星级 ---------- */
  section('6. 星级只封顶本局（旧版永久封顶是缺陷）');
  game._debug.setupLevel(0);
  check('重开关卡：档位归零', S.hintLv === 0 && S.hintPaid === 0);
  check('重开关卡：hintUsed 不继承存档（可再冲三星）', S.hintUsed === false);
  S.elapsed = 0; S.steps = 0; S.hintUsed = false;
  game._debug.win();
  check('未用提示 → ★★★', S.result && S.result.stars === 3, JSON.stringify(S.result));
  game._debug.setupLevel(0);
  S.elapsed = 0; S.steps = 0; S.hintUsed = true;
  game._debug.win();
  check('用了提示 → 封顶 ★★', S.result && S.result.stars === 2, JSON.stringify(S.result));

  /* ---------- 7. 源码约束 ---------- */
  section('7. 源码约束（避免回退到旧分裂行为）');
  const src = fs.readFileSync(path.join(ROOT, 'js/core.js'), 'utf8');
  check('不再有「提示降档」逻辑', src.indexOf('提示降为档') < 0);
  check('提示按钮角标取剩余档位', /badge: Math\.max\(0, C\.HINT\.maxTier - state\.hintLv\)/.test(src));
  check('提示按钮只在 3 档用满后置灰', /disabled: state\.hintLv >= C\.HINT\.maxTier/.test(src));
  check('广告只在面板里由玩家点击触发', /case 'hint_ad': adStart\('hint'\)/.test(src));
  check('四巧/七巧共用同一套提示（无 hasTiers 分支）', !/hasTiers \? state\.hintTier/.test(src));

  console.log('\n' + (fail === 0 ? 'v0.10 全部通过' : `!! ${fail} 项未通过`));
  process.exit(fail === 0 ? 0 : 1);
})();
