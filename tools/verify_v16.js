/* v0.16 专项验收：主页任务入口下线 + 提示取消免费档（查找道具 / 巧币 / 视频）
 * 用法：node tools/verify_v16.js
 *
 * 覆盖用户这次提的两点：
 *   1) 主页「任务」窗口整块去掉，不再有每日任务；
 *   2) 进关不再直接送一次查找 —— 每档都要付：优先用「查找道具」，
 *      道具来自在线奖励（40/60 分钟）与邀请有礼，也可以用巧币直接买一次。
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');

/* ---------- 记录型 ctx：只关心文字（主页标签 / 面板文案） ---------- */
const rec = { texts: [] };
function makeCtx() {
  const grad = { addColorStop() {} };
  const base = {
    canvas: { width: 0, height: 0, style: {} },
    globalAlpha: 1,
    measureText(s) { return { width: String(s).length * 15 }; },
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
    createPattern: () => null,
    fillText(s, x, y) { rec.texts.push({ s: String(s), x, y, color: base.fillStyle }); },
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

/* ---------- 假环境（广告同步回调成功，邀请/提示都能走完） ---------- */
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
const TB = CFG.LAYOUT.TOOLBAR;
const TOOL_TOTAL = 5 * TB.w + 4 * TB.gap;
const TOOL_X0 = CFG.LAYOUT.BOARD.x + (CFG.LAYOUT.BOARD.size - TOOL_TOTAL) / 2;
const HINT_X = TOOL_X0 + 3 * (TB.w + TB.gap) + TB.w / 2;
const HINT_Y = TB.y + TB.h / 2;

/* 提示面板按钮（与 core.js renderHint 的版式常数保持一致） */
/* v0.22：面板分两种高度 —— 有道具 720（三行）、没道具 616（两行）。
 * 巧币 / 视频两个按钮的实际位置按「没道具」那版算：top+330 / top+434。 */
const SHEET_TOP = CFG.DESIGN.h / 2 - 308;
const BTN_COIN = { x: CFG.DESIGN.w / 2, y: SHEET_TOP + 330 };
const BTN_AD = { x: CFG.DESIGN.w / 2, y: SHEET_TOP + 434 };

function md5(p) { var __s = p; return require('crypto').createHash('md5').update(/\.js$/i.test(String(__s)) ? Buffer.from(require('./lib/pack.js').strip(require('fs').readFileSync(__s, 'utf8'))) : require('fs').readFileSync(__s)).digest('hex'); }

function grab(fn) {
  rec.texts.length = 0;
  fn();
  return rec.texts.map(t => t.s).join('|');
}

/* 把场上所有块按标准解摆好（用于验证「扣费前先验」） */
function placeAllSolved(game) {
  const S = game.state;
  const lv = game._debug.LEVELS[S.levelIdx];
  S.pieces.forEach(function (p) {
    const st = lv.solution.filter(function (x) { return x.id === p.id; })[0];
    if (!st) return;
    p.onBoard = true; p.x = st.x; p.y = st.y;
    p.angle = st.angle; p.dAngle = st.angle;
    p.flipped = st.flipped; p.dFlipped = st.flipped;
  });
}

(async function main() {
  console.log('v0.16 验收：任务下线 + 查找道具');
  let game = CORE(env);
  game.init();
  step(16);
  let S = game.state;
  let D = game._debug;

  /* ================= 1. 配置 / 版本 ================= */
  section('1. 配置与三端同步');
  check('版本号 v0.16 起（含后续补丁版）', /^v0\.\d+(\.\d+)?$/.test(CFG.version), CFG.version);
  check('提示单档（v0.20）、巧币 30（v0.23）、道具名「查找道具」',
    CFG.HINT.maxTier === undefined && CFG.HINT.coinCost === 30 && CFG.HINT.itemName === '查找道具',
    `maxTier=${CFG.HINT.maxTier} coin=${CFG.HINT.coinCost} item=${CFG.HINT.itemName}`);
  check('已删除 freePerLevel（每关不再白送）', CFG.HINT.freePerLevel === undefined,
    'freePerLevel=' + CFG.HINT.freePerLevel);
  /* v0.41：邀请改成「累计人数 + 8 档阶梯」，旧的 inviteCoin / inviteHint 已下线 */
  check('邀请有礼：改为 8 档阶梯（旧的每日 +20 巧币已下线）',
    CFG.ECON.inviteCoin === undefined && CFG.INVITE.tiers.length === 8 &&
    CFG.INVITE.tiers[0].coin === 30 && CFG.INVITE.needCleared === 4,
    `tiers=${CFG.INVITE.tiers && CFG.INVITE.tiers.length} need=${CFG.INVITE.needCleared}`);
  check('任务奖励配置字段已移除',
    CFG.ECON.taskCoin === undefined && CFG.ECON.taskCoin3 === undefined &&
    CFG.ECON.taskEnergy === undefined && CFG.ECON.taskPlays === undefined);
  [['js/core.js', 'preview/js/core.js'], ['js/core.js', 'miniprogram/js/core.js'],
   ['js/config.js', 'preview/js/config.js'], ['js/config.js', 'miniprogram/js/config.js']]
    .forEach(function (pair) {
      check('三端一致 ' + pair[1], md5(path.join(ROOT, pair[0])) === md5(path.join(ROOT, pair[1])));
    });

  /* ================= 2. 主页去掉任务 ================= */
  section('2. 主页：任务窗口下线，其余入口不动');
  D.go('home');
  const homeTx = grab(function () { step(16); });
  check('主页不再出现「任务」', !/\|任务\|/.test('|' + homeTx + '|'), homeTx.slice(0, 240));
  ['皮肤', '邀请有礼', '排行榜', '在线奖励', '设置'].forEach(function (label) {
    check('主页仍有「' + label + '」入口', homeTx.indexOf(label) >= 0);
  });
  const coreSrc = fs.readFileSync(path.join(ROOT, 'js/core.js'), 'utf8');
  check('源码里没有 entry_task 热区', coreSrc.indexOf('entry_task') < 0);
  check('v0.28 添加桌面入口已下线', homeTx.indexOf('添加桌面') < 0 && !/homeEntry\('entry_desktop'/.test(coreSrc));
  check('源码里没有 task_t1/t2/t3 领取按钮', coreSrc.indexOf('task_t1') < 0);
  check('源码里没有 renderTasks / claimTask / taskList',
    coreSrc.indexOf('renderTasks') < 0 && coreSrc.indexOf('claimTask') < 0 &&
    coreSrc.indexOf('function taskList') < 0);

  /* ================= 3. 老存档兼容 ================= */
  section('3. 老存档带着任务字段也能正常加载');
  store['tangram_save_v1'] = JSON.stringify({
    playerId: 'local', starOf: { '1': 3 }, unlockedMax: 3,
    coin: 77, energy: 9, energyMax: 16, energyTs: Date.now(),
    tasksDay: '2026-11-20', tasksClaimed: { t1: true }, taskPlays: 5,
    hintItems: 4, settings: { sfx: true, bgm: true }, updatedAt: Date.now()
  });
  /* v0.34：模拟一台只留着老存档、还没写过全局钱包的新设备 */
  delete store['tangram_wallet_v1'];
  const g2 = CORE(env);
  g2.init();
  step(16);
  /* 注意：init() 会重新 bindInput，之后所有 tap 都打到最新实例上，
   * 所以这里把 game/S/D 切到 g2，别再用 g1 的状态断言。 */
  game = g2; S = g2.state; D = g2._debug;
  const S2 = g2.state;
  check('老存档星星/进度/巧币不丢',
    S2.save.starOf['1'] === 3 && S2.save.unlockedMax === 3 && S2.save.coin === 77);
  check('老存档的查找道具保留', S2.save.hintItems === 4, 'items=' + S2.save.hintItems);
  check('任务字段被丢弃（不再进内存存档）',
    S2.save.tasksDay === undefined && S2.save.tasksClaimed === undefined &&
    S2.save.taskPlays === undefined);

  /* ================= 4. 提示：不再送免费档 ================= */
  section('4. 进关点提示：只弹面板，不白送');
  D.setupLevel(0);
  D.go('play');
  S.save.hintItems = 0;
  S.save.coin = 120;
  rec.texts.length = 0;
  step(16);                           // 先渲染一帧，把对局页工具栏热区建出来
  tapD(HINT_X, HINT_Y);
  const panelTx = rec.texts.map(t => t.s).join('|');
  check('点提示 → 打开面板（hintLv 仍为 0，没有发提示）',
    S.overlay === 'hint' && S.hintLv === 0 && !S.hint,
    `overlay=${S.overlay} lv=${S.hintLv} hint=${!!S.hint}`);
  /* v0.22：道具这条路挪到工具栏（一点直用），面板只留巧币 / 视频 */
  /* v0.59：巧币 / 看视频改成图标，文案变成「30 · 买 1 次」「免费一次」 */
  check('没道具时面板只剩巧币 / 视频两条路',
    /30 · 买 1 次/.test(panelTx) && /免费一次/.test(panelTx), panelTx.slice(0, 260));
  check('没道具时面板不画道具按钮', !/查找道具/.test(panelTx), panelTx.slice(0, 200));
  /* v0.20：来源那行小字已删（需求：截图中这里的提示删除掉） */
  check('面板不再写道具来源（v0.20 删除）',
    !/在线奖励 40\/60 分钟/.test(panelTx) && !/邀请有礼/.test(panelTx));

  /* v0.20：提示还亮着时不能重复买（防误购），先把刚才指的那块放对 */
  function solveHintedPiece() {
    if (!S.hint) return;
    const lvS = D.LEVELS[0];
    const stS = lvS.solution.filter(x => x.id === S.hint.id)[0];
    const pS = S.pieces.filter(x => x.id === S.hint.id)[0];
    if (stS && pS) {
      pS.onBoard = true; pS.x = stS.x; pS.y = stS.y;
      pS.angle = stS.angle; pS.flipped = !!stS.flipped;
    }
    S.overlay = null;
    step(16);
  }

  const item0 = S.save.hintItems;
  D.useHintItem();
  check('没道具时直接调用不送提示、不出现负库存',
    S.hintLv === 0 && S.save.hintItems === item0 && S.toast && /不足/.test(S.toast.text),
    `lv=${S.hintLv} items=${S.save.hintItems}`);

  /* ================= 5. 三条付费路径 ================= */
  section('5. 三条付费路径：道具 / 巧币 / 视频');
  S.save.hintItems = 1;
  S.overlay = null;
  step(16);
  const coinBefore = S.save.coin;
  tapD(HINT_X, HINT_Y);
  check('用查找道具（工具栏一点直用）→ 发出提示（单档）',
    S.hintLv === 1 && !!S.hint && S.overlay === null,
    `lv=${S.hintLv} hint=${!!S.hint} overlay=${S.overlay}`);
  check('道具 -1、巧币不动',
    S.save.hintItems === 0 && S.save.coin === coinBefore,
    `items=${S.save.hintItems} coin=${coinBefore}→${S.save.coin}`);

  solveHintedPiece();
  S.overlay = 'hint';
  step(16);
  const coin1 = S.save.coin;
  tapD(BTN_COIN.x, BTN_COIN.y);
  check('花 ' + CFG.HINT.coinCost + ' 巧币 → 再发一次提示（不限次数）',
    S.hintLv === 2 && !!S.hint && S.overlay === null,
    `lv=${S.hintLv} hint=${!!S.hint}`);
  check('巧币扣 ' + CFG.HINT.coinCost, S.save.coin === coin1 - CFG.HINT.coinCost, `${coin1}→${S.save.coin}`);

  solveHintedPiece();
  S.overlay = 'hint';
  step(16);
  const coin2 = S.save.coin;
  tapD(BTN_AD.x, BTN_AD.y);
  check('看视频 → 第三次提示', S.hintLv === 3 && !!S.hint,
    `lv=${S.hintLv} hint=${!!S.hint}`);
  check('看视频不扣巧币也不扣道具',
    S.save.coin === coin2 && S.save.hintItems === 0,
    `coin=${coin2}→${S.save.coin} items=${S.save.hintItems}`);

  section('6. 扣费前先验：板已全放对时不吞道具');
  D.setupLevel(0);
  S.save.hintItems = 1;
  placeAllSolved(game);
  S.overlay = 'hint';
  step(16);
  D.fireBtn('hint_item');
  check('没有可指的块 → 不发提示、道具不被吞',
    !S.hint && S.hintLv === 0 && S.save.hintItems === 1,
    `hint=${!!S.hint} lv=${S.hintLv} items=${S.save.hintItems}`);
  check('给出「这一关已经拼好啦」的说明', S.toast && /拼好/.test(S.toast.text),
    S.toast && S.toast.text);

  /* ================= 7. 道具来源：邀请有礼 + 在线奖励 ================= */
  section('7. 查找道具来源');
  store['tangram_save_v1'] = JSON.stringify({
    playerId: 'local', starOf: {}, unlockedMax: 5, bestTime: {}, hintUsed: {},
    coin: 100, energy: 10, energyMax: 16, energyTs: Date.now(),
    hintItems: 0, inviteDay: '', inviteCount: 0,
    settings: { sfx: true, bgm: true }, updatedAt: Date.now()
  });
  const g3 = CORE(env);
  g3.init();
  step(16);
  game = g3; S = g3.state; D = g3._debug;
  const S3 = g3.state;
  const D3 = g3._debug;
  D3.go('home');
  /* v0.41：分享只「发出邀请」，不当场发奖；也不再有每日一次的限制 */
  const coinI = S3.save.coin, hintI = S3.save.hintItems;
  S3.inviteCd = 0;
  D3.fireBtn('invite_share');
  check('分享只发邀请券，不当场发巧币 / 道具',
    S3.save.coin === coinI && S3.save.hintItems === hintI && (S3.save.invitePend || []).length === 1,
    `coin=${coinI}→${S3.save.coin} items=${S3.save.hintItems} pend=${(S3.save.invitePend || []).length}`);
  check('邀请 toast 写清「完成 4 关才计入」',
    S3.toast && /完成 4 关/.test(S3.toast.text), S3.toast && S3.toast.text);
  S3.inviteCd = 0;
  D3.fireBtn('invite_share');
  check('不限每日一次：可以继续发出邀请',
    (S3.save.invitePend || []).length === 2, 'pend=' + (S3.save.invitePend || []).length);

  /* 在线奖励 40 分钟档给 1 个、60 分钟档再给 1 个（基线取当前道具数） */
  var td = new Date();
  S3.save.onlineDay = td.getFullYear() + '-' + (td.getMonth() + 1) + '-' + td.getDate();
  S3.save.onlineSec = 2400;
  S3.save.onlineGot = {};
  const baseItems = S3.save.hintItems;
  D3.onlineClaim('o5');
  check('在线 40 分钟档：+1 查找道具', S3.save.hintItems === baseItems + 1, 'items=' + S3.save.hintItems);
  S3.save.onlineSec = 3600;
  D3.onlineClaim('o6');
  check('在线 60 分钟档：再 +1 查找道具', S3.save.hintItems === baseItems + 2, 'items=' + S3.save.hintItems);

  /* ================= 8. 文案一致 / 包体 ================= */
  section('8. 文案、源码约束与包体');
  check('源码里不再有「提示卡」旧称', coreSrc.indexOf('提示卡') < 0);
  check('提示面板用 HINT.itemName，而不是写死「道具」', /H\.itemName|C\.HINT\.itemName/.test(coreSrc));
  check('core 里没有 wx.*', !/\bwx\./.test(coreSrc.replace(/\/\*[\s\S]*?\*\//g, '')));
  function walkSize(dir) {
    const SKIP = ['cloudfunctions', 'node_modules', '.cloudbase', '.git'];
    let total = 0;
    for (const f of fs.readdirSync(dir)) {
      if (SKIP.indexOf(f) >= 0) continue;
      const p = path.join(dir, f);
      const st = fs.statSync(p);
      if (st.isDirectory()) total += walkSize(p); else total += st.size;
    }
    return total;
  }
  const pkg = walkSize(path.join(ROOT, 'miniprogram'));
  check('小游戏主包 < 4MB（微信硬限制）', pkg < 4 * 1024 * 1024,
    (pkg / 1024 / 1024).toFixed(2) + 'MB');

  console.log('\n' + (fail === 0 ? 'v0.16 全部通过' : `!! ${fail} 项未通过`));
  process.exit(fail === 0 ? 0 : 1);
})();
