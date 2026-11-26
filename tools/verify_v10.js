/* 提示机制验收（原 v0.10 三档阶梯 → v0.20 单档常驻）
 * 用法：node tools/verify_v10.js
 *
 * v0.20 变更（用户需求）：
 *   1) 不再分「指位置 / 指板件 / 看全图」三档，只有一种提示：
 *      同时告诉你「下一块是哪块」和「放到哪里」；
 *   2) 提示不再 3.5 秒后自动消失 —— 一直亮着，直到那一块被放对；
 *   3) 面板上「道具来源 / 巧币余量 / 用提示本关最高 ★★」两行小字删除；
 *   4) 不再限制每关提示次数（每次都付费，想一步步来也行）；
 *   5) 连带取消「用提示封顶 ★★」——规则和文案必须一致，不能文案删了规则还留着。
 * 本文件原来的三档断言按新口径重写，产品逻辑没有为了过测试让步。
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');

/* ---------- 记录型 ctx（记住 fillStyle + globalAlpha，用来抓提示填充） ---------- */
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

/* 提示面板按钮（renderHint 的版式常数，与 core.js 保持一致）
 * v0.20：面板从 900 高缩到 760（删掉两行小字与三档圆点），三个按钮整体上移。 */
/* v0.22：面板只在「没有查找道具」时出现，只有两行按钮（ch=616）：
 * 花巧币 在 top+330、看视频 在 top+434。有道具时点工具栏直接给提示，不进面板。 */
const SHEET = { ch: 616, cy: CFG.DESIGN.h / 2 };
const SHEET_TOP = SHEET.cy - SHEET.ch / 2;
const BTN_COIN = { x: CFG.DESIGN.w / 2, y: SHEET_TOP + 330 };
const BTN_AD = { x: CFG.DESIGN.w / 2, y: SHEET_TOP + 434 };

function md5(p) { var __s = p; return require('crypto').createHash('md5').update(/\.js$/i.test(String(__s)) ? Buffer.from(require('./lib/pack.js').strip(require('fs').readFileSync(__s, 'utf8'))) : require('fs').readFileSync(__s)).digest('hex'); }

(async function main() {
  console.log('提示机制验收（v0.20 单档常驻口径）+ 广告入口 + 云环境');
  const game = CORE(env);
  game.init();
  step(16);
  const S = game.state;
  const H = CFG.HINT;

  /* ---------- 1. 配置 ---------- */
  section('1. 配置与三端同步');
  check('版本号 ≥ v0.10', /^v0\.(1\d|2\d|[1-9])/.test(CFG.version), CFG.version);
  check('云开发环境 ID 已填', CFG.CLOUD.envId === 'cloud1-d4g6rm6duad5ba0aa', CFG.CLOUD.envId);
  check('云开发开关打开', CFG.CLOUD.enabled === true);
  const pairs = [['js/core.js', 'preview/js/core.js'], ['js/core.js', 'miniprogram/js/core.js'],
    ['js/config.js', 'preview/js/config.js'], ['js/config.js', 'miniprogram/js/config.js']];
  pairs.forEach(([a, b]) => check('三端一致 ' + b, md5(path.join(ROOT, a)) === md5(path.join(ROOT, b))));
  check('提示已收成单档（无 maxTier / 无档位文案表）',
    H.maxTier === undefined && H.names === undefined && H.descs === undefined,
    `maxTier=${H.maxTier} names=${H.names}`);
  check('提示价格取 config（v0.23 为 30）、道具名仍是「查找道具」',
    H.coinCost === 30 && H.itemName === '查找道具', `coin=${H.coinCost} item=${H.itemName}`);
  check('三个小牌文案集中在 HINT.labels', !!H.labels && H.labels.place === '放这里' &&
    H.labels.move === '移到此处' && H.labels.use === '用这块', JSON.stringify(H.labels));
  check('v0.16 起取消「每关免费 1 次」', H.freePerLevel === undefined, 'freePerLevel=' + H.freePerLevel);
  check('ECON.coinHint 与 HINT.coinCost 同价', CFG.ECON.coinHint === H.coinCost,
    `econ=${CFG.ECON.coinHint} hint=${H.coinCost}`);

  /* ---------- 2. 单档提示：先弹面板，用查找道具付 ---------- */
  section('2. 单档提示：不再白送，先弹面板再用查找道具');
  game._debug.go('play');
  game._debug.setupLevel(0);
  S.save.coin = 120;
  S.save.hintItems = 1;
  rec.texts.length = 0;
  step(16);
  const lv0 = game._debug.LEVELS[0];
  const sol0 = lv0.solution[0];
  check('本局初始 hintLv=0、未用提示', S.hintLv === 0 && S.hintUsed === false, `lv=${S.hintLv}`);
  const coinB0 = S.save.coin;
  tapD(HINT_X, HINT_Y);
  /* v0.22：手里有道具就点一下用完，不再弹面板点第二下（用户要求） */
  check('有道具 → 点一下直接给提示，不弹面板',
    S.overlay === null && S.hintLv === 1 && !!S.hint,
    `hintLv=${S.hintLv} overlay=${S.overlay} hint=${!!S.hint}`);
  check('道具 -1', S.save.hintItems === 0, 'items=' + S.save.hintItems);
  check('不扣巧币', S.save.coin === coinB0, `${coinB0}→${S.save.coin}`);
  check('提示指向「下一块该放的位置」', !!S.hint && S.hint.id === sol0.id, 'id=' + (S.hint && S.hint.id));
  check('同一屏同时标出「放这里」（落点）', rec.texts.some(t => t.s === '放这里'),
    rec.texts.map(t => t.s).filter(s2 => /这里|这块|此处/.test(s2)).join('|'));
  check('同一屏同时标出「用这块」（哪一块）', rec.texts.some(t => t.s === '用这块'));
  check('toast 说明这一步做什么', !!S.toast && /下一步/.test(S.toast.text), S.toast && S.toast.text);
  check('提示写入本局标记 hintUsed', S.hintUsed === true);
  check('存档记录「本关用过提示」（历史标记）', S.save.hintUsed['1'] === true);

  /* ---------- 3. 常驻：不自己消失，放对才收起 ---------- */
  section('3. 提示常驻：不会自己消失，放对才收起');
  const hid = S.hint.id;
  check('hint 上没有 until 倒计时字段', S.hint.until === undefined, 'until=' + S.hint.until);
  for (let i = 0; i < 20; i++) step(500);        // 快进 10 秒
  check('快进 10 秒后提示仍在（旧版 3.5 秒就消失了）',
    !!S.hint && S.hint.id === hid, 'hint=' + (S.hint && S.hint.id));

  const solHid = lv0.solution.filter(x => x.id === hid)[0];
  const pzHid = S.pieces.filter(p => p.id === hid)[0];
  pzHid.onBoard = true;
  pzHid.x = solHid.x; pzHid.y = solHid.y;
  pzHid.angle = solHid.angle; pzHid.flipped = !!solHid.flipped;
  step(16);
  check('那一块放对之后提示自动收起', !S.hint, 'hint=' + JSON.stringify(S.hint));

  /* ---------- 4. 不限次数：广告 / 巧币都能再买下一步 ---------- */
  section('4. 不限次数：广告 / 巧币都能再买下一步');
  rec.texts.length = 0;
  tapD(HINT_X, HINT_Y);
  check('道具用光后按提示 → 打开面板（没有「已经用完」）',
    S.overlay === 'hint' && !S.toast || (S.toast && !/用完/.test(S.toast.text)),
    `overlay=${S.overlay} toast=${S.toast && S.toast.text}`);
  const panelTexts = rec.texts.map(t => t.s);
  check('面板只有一句话：帮你看下一步', panelTexts.indexOf('帮你看下一步') >= 0,
    panelTexts.slice(0, 16).join('|'));
  check('面板不再出现「第 N 档」', !panelTexts.some(s2 => /第 \d 档/.test(s2)),
    panelTexts.filter(s2 => /档/.test(s2)).join('|'));
  check('面板不再写道具来源 / 星级封顶（v0.20 删除的两行小字）',
    !panelTexts.some(s2 => /来源|在线奖励|邀请有礼|最高 ★★/.test(s2)),
    panelTexts.filter(s2 => /来源|奖励|★★/.test(s2)).join('|'));
  check('没道具时面板不画道具按钮（v0.22 改到工具栏直用）',
    !panelTexts.some(s2 => /查找道具/.test(s2)), panelTexts.filter(s2 => /查找道具/.test(s2)).join('|'));
  /* v0.59：「花 30 巧币 / 看视频」改成图标，文案变成「30 · 买 1 次」「免费一次」 */
  check('同时给出巧币 / 看视频两条路',
    panelTexts.some(s2 => new RegExp('^' + H.coinCost + ' · ').test(s2)) &&
    panelTexts.some(s2 => /免费一次/.test(s2)), panelTexts.slice(-4).join('|'));
  S.toast = null;
  tapD(BTN_AD.x, BTN_AD.y);
  check('看广告 → 给下一步提示、面板关闭',
    S.hintLv === 2 && !!S.hint && S.overlay === null,
    `hintLv=${S.hintLv} hint=${!!S.hint} overlay=${S.overlay}`);
  check('激励视频类型传 hint', adLog.rewarded[adLog.rewarded.length - 1] === 'hint',
    JSON.stringify(adLog.rewarded));

  /* v0.20：上一条提示还亮着时再买，不扣费、只提醒先放上去 */
  const coinGuard = S.save.coin;
  const lvGuard = S.hintLv;
  tapD(HINT_X, HINT_Y);
  tapD(BTN_COIN.x, BTN_COIN.y);
  check('提示还亮着 → 再买不扣费，只提醒先放上去',
    S.hintLv === lvGuard && S.save.coin === coinGuard && S.toast && /标出来了/.test(S.toast.text),
    `lv=${S.hintLv} coin=${coinGuard}→${S.save.coin} toast=${S.toast && S.toast.text}`);

  /* 把这块放对，提示收起后就能买下一步 */
  const solAd = lv0.solution.filter(x => x.id === S.hint.id)[0];
  const pzAd = S.pieces.filter(p => p.id === S.hint.id)[0];
  pzAd.onBoard = true; pzAd.x = solAd.x; pzAd.y = solAd.y;
  pzAd.angle = solAd.angle; pzAd.flipped = !!solAd.flipped;
  S.overlay = null; step(16);
  const coinB1 = S.save.coin;
  tapD(HINT_X, HINT_Y);
  tapD(BTN_COIN.x, BTN_COIN.y);
  check('放对后再花 ' + H.coinCost + ' 巧币 → 第三次提示（不限次数）',
    S.hintLv === 3 && !!S.hint, `hintLv=${S.hintLv} hint=${!!S.hint}`);
  check('扣费准确（' + H.coinCost + '）', S.save.coin === coinB1 - H.coinCost, `${coinB1}→${S.save.coin}`);

  /* ---------- 5. 边界：巧币不足 / 广告失败 ---------- */
  section('5. 边界：巧币不足 / 广告失败');
  S.save.coin = 0;
  S.save.hintItems = 0;
  game._debug.setupLevel(0);
  check('新一局计数归零', S.hintLv === 0 && S.hintPaid === 0, `lv=${S.hintLv} paid=${S.hintPaid}`);
  tapD(HINT_X, HINT_Y);
  check('面板照常打开（没有档位概念）', S.overlay === 'hint', 'overlay=' + S.overlay);
  rec.texts.length = 0;
  step(16);
  check('没道具时面板不画道具按钮（只剩巧币 / 视频）',
    !rec.texts.some(t => /查找道具/.test(t.s)));
  S.toast = null;
  const coinZero = S.save.coin;
  game._debug.fireBtn('hint_coin');       // 兜底：绕过 UI 也不能白给
  check('绕过 UI 也守住：巧币不足不发提示',
    S.hintLv === 0 && S.toast && /巧币不足/.test(S.toast.text),
    `lv=${S.hintLv} coin=${coinZero}→${S.save.coin} toast=${S.toast && S.toast.text}`);
  check('巧币不足 → 引导去看视频', S.toast && /看视频/.test(S.toast.text));
  adLog.fail = true;
  S.toast = null;
  tapD(BTN_AD.x, BTN_AD.y);
  check('广告失败 → 不发提示、面板留着（不吞费用）',
    S.hintLv === 0 && S.overlay === 'hint', `lv=${S.hintLv} overlay=${S.overlay}`);
  adLog.fail = false;

  /* ---------- 6. 星级：不再因用提示封顶 ---------- */
  section('6. 星级不再因用提示封顶（v0.20 连带变更）');
  game._debug.setupLevel(0);
  check('重开关卡：hintUsed 不继承存档', S.hintUsed === false);
  S.elapsed = 0; S.steps = 0; S.hintUsed = false;
  game._debug.win();
  check('未用提示 → ★★★', S.result && S.result.stars === 3, JSON.stringify(S.result));
  game._debug.setupLevel(0);
  S.elapsed = 0; S.steps = 0; S.hintUsed = true;
  game._debug.win();
  check('用过提示也照样 ★★★（封顶已取消）',
    S.result && S.result.stars === 3, JSON.stringify(S.result));

  /* ---------- 7. 源码约束 ---------- */
  section('7. 源码约束（避免回退到旧的分档/定时消失）');
  const src = fs.readFileSync(path.join(ROOT, 'js/core.js'), 'utf8');
  check('提示按钮不再有档位角标', !/badge: Math\.max\(0, C\.HINT\.maxTier/.test(src));
  check('提示不再按档位置灰', !/disabled: state\.hintLv >= C\.HINT\.maxTier/.test(src));
  /* v0.21：ghostAlpha 只剩教学关在用（TUTORIAL.ghostAlpha），提示配置里必须没有 */
  check('提示里没有第三档「全图淡显」残留', CFG.HINT.ghostAlpha === undefined);
  check('hint 不再带 until / tier 字段', !/state\.hint = \{ id: pid, tier/.test(src));
  check('updater 里不再按 until 清提示', !/nowMs\(\) > state\.hint\.until/.test(src));
  check('广告只在面板里由玩家点击触发', /case 'hint_ad': adStart\('hint'\)/.test(src));
  check('四巧/七巧共用同一套提示（无 hasTiers 分支）', !/hasTiers \? state\.hintTier/.test(src));

  console.log('\n' + (fail === 0 ? '提示机制验收全部通过' : `!! ${fail} 项未通过`));
  process.exit(fail === 0 ? 0 : 1);
})();
