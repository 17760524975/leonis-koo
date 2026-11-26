/* v0.18 专项验收：连胜口径 / 榜单页签缓存 / 好友榜（开放数据域）
 * 用法：node tools/verify_v18.js
 *
 * 这版修的是用户报的三件事：
 *   ① 连胜榜统计不对（重玩刷连胜、失败不落盘、云端 max 合并把清零的连胜复活）
 *   ② 切好友榜再切回主线榜 → 直接「加载失败」（好友把云榜缓存覆盖成空）
 *   ③ 好友榜没做（现在走开放数据域 + 微信托管数据）
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const crypto = require('crypto');

/* ---------- 记录型 ctx ---------- */
const rec = { texts: [], fills: [], drawImages: [], arcs: [] };
function makeCtx() {
  const grad = { addColorStop() {} };
  const base = {
    canvas: { width: 0, height: 0, style: {} },
    measureText(s) { return { width: String(s).length * 15 }; },
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
    createPattern: () => null,
    fillText(s, x, y) { rec.texts.push({ s: String(s), x, y, color: base.fillStyle, font: base.font }); },
    stroke() {}, fill() { rec.fills.push(base.fillStyle); },
    arc(x, y, r) { rec.arcs.push({ x, y, r }); },
    moveTo() {}, lineTo() {},
    fillRect() {}, strokeRect() {},
    setLineDash() {},
    save() {}, restore() {}, beginPath() {}, closePath() {}, arcTo() {},
    bezierCurveTo() {}, quadraticCurveTo() {}, rect() {}, translate() {},
    rotate() {}, scale() {}, clip() {},
    drawImage(img, x, y, w, h) { rec.drawImages.push({ img, x, y, w, h }); },
    setTransform() {}, clearRect() {}, ellipse() {}
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
const sleep = ms => new Promise(r => setTimeout(r, ms));

require(path.join(ROOT, 'js/levels.js'));
require(path.join(ROOT, 'js/geom.js'));
require(path.join(ROOT, 'js/judge.js'));
const CFG = require(path.join(ROOT, 'js/config.js'));
const CORE = require(path.join(ROOT, 'js/core.js'));

let fail = 0, ok = 0;
function check(label, okFlag, detail) {
  if (!okFlag) fail++; else ok++;
  console.log(`  [${okFlag ? 'OK' : 'XX'}] ${label}${detail ? '  ' + detail : ''}`);
}
function section(t) { console.log('\n== ' + t + ' =='); }
const textsOf = arr => arr.map(t => t.s).join(' | ');

/* ---------- 可控假云 ---------- */
const store = {};
const cloudLog = { rankCalls: [], saved: [] };
const cloudCtl = {
  failTabs: {},          // {0:true} 该页签返回失败
  hold: {},              // {0:[{tab,cb}]} 先扣住回调，用来造乱序
  lists: {
    /* v0.65：tab 0 全服（stars）/ tab 2 本周（weekStars）；tab 1 是好友榜，不走云函数 */
    0: { list: [{ nick: '巧手0001', v: 26, v2: 9, me: false }, { nick: '巧手0921', v: 12, v2: 4, me: true }],
      me: { nick: '巧手0921', v: 12, v2: 4, rank: 2 },
      nextResetAt: Date.now() + 2 * 86400000, weekKey: '2026-W48' },
    2: { list: [{ nick: '连击王阿哲', v: 9, v2: 5, v3: 3, me: false }, { nick: '巧手0921', v: 3, v2: 2, v3: 1, me: true }],
      me: { nick: '巧手0921', v: 3, v2: 2, v3: 1, rank: 2 },
      nextResetAt: Date.now() + 2 * 86400000, weekKey: '2026-W48' }
  }
};
function answer(tab, cb) {
  if (cloudCtl.failTabs[tab]) { cb({ msg: '网络超时' }); return; }
  cb(null, JSON.parse(JSON.stringify(cloudCtl.lists[tab])));
}
function release(tab) {
  const q = (cloudCtl.hold[tab] || []).splice(0);
  q.forEach(x => answer(x.tab, x.cb));
}

const fakeCloud = {
  enabled: () => true,
  init(cb) { setTimeout(() => cb(null, { openid: 'oX1', nick: '巧手0921' }), 0); },
  load(cb) { setTimeout(() => cb(null, { sets: {} }), 0); },   // 不合并，保持本文件的存档干净
  save(payload, cb) {
    cloudLog.saved.push(JSON.parse(JSON.stringify(payload)));
    setTimeout(() => cb(null, { nick: '巧手0921', me: { nick: '巧手0921', v: payload.stats.stars, rank: 2 } }), 0);
  },
  rank(tab, cb) {
    cloudLog.rankCalls.push(tab);
    if (cloudCtl.hold[tab]) { (cloudCtl.hold[tab] = cloudCtl.hold[tab] || []).push({ tab, cb }); return; }
    setTimeout(() => answer(tab, cb), 0);
  }
};

/* ---------- 假好友榜（开放数据域） ---------- */
const friendLog = { shows: [], published: [], available: true };
const fakeFriend = {
  available: () => friendLog.available,
  image: () => ({ __fakeSharedCanvas: true }),
  show(opt) { friendLog.shows.push(JSON.parse(JSON.stringify(opt))); return true; },
  publish(stats) { friendLog.published.push(JSON.parse(JSON.stringify(stats))); return true; }
};

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
  cloud: fakeCloud,
  friend: fakeFriend,
  ad: {
    placeholder: true, banner() {},
    rewarded(kind, cb) { cb(true, ''); }
  }
};

function clearRec() { rec.texts.length = 0; rec.fills.length = 0; rec.drawImages.length = 0; }

/* 开局存档：四巧板已通 2 关、当前连胜 2 */
store[CFG.SAVE_KEY] = JSON.stringify({
  starOf: { 1: 3, 2: 2 }, unlockedMax: 3, streak: 2,
  settings: { sfx: true, bgm: true }, coin: 900, energy: 16
});

(async function main() {
  console.log('v0.18 验收：连胜口径 + 榜单页签缓存 + 好友榜');
  const game = CORE(env);
  game.init();
  step(16);
  await sleep(12);
  const S = game.state, D = game._debug;

  /* ================= 1. 连胜口径 ================= */
  section('1. 连胜：段内去重，失败当场中断');
  check('版本 v0.19 起', /^v0\.\d+(\.\d+)?$/.test(CFG.version), CFG.version);
  check('老存档没有 bestStreak 时用当前连胜兜底', S.save.bestStreak === 2, 'best=' + S.save.bestStreak);
  /* v0.19：老存档没有 streakSeen → 迁移成空数组（不能拿 starOf 反推） */
  check('老存档没有 streakSeen → 迁移为空数组', Array.isArray(S.save.streakSeen) && S.save.streakSeen.length === 0,
    JSON.stringify(S.save.streakSeen));

  /* v0.19：新的一段里重打已通关的关也计入（这正是用户报的「没算」）。
   * 旧版按 wasCleared 判定，这里会被当成重玩而不涨。 */
  S.save.streak = 2; S.save.bestStreak = 2; S.save.streakSeen = [];
  D.setupLevel(0);
  S.elapsed = 30; S.steps = 5; S.hintUsed = false;
  const coinReplay = S.save.coin;
  D.win();
  check('已通关的关在新的一段里重打：连胜 +1（v0.19 核心修复）', S.save.streak === 3, 'streak=' + S.save.streak);
  /* v0.23 的口径是「重打一律 0 巧币」。v0.40 改成「升星补差价」：
   * 这一局把第 1 关从旧星级提到 3★，拿的是 53 - 已发额 的差额，
   * 所以这里断言的重点变成「落账 = result.gain、且不算首通」，
   * 而不是金额必须是 0（金额为 0 的用例见 verify_v040 的「同星级重打」）。 */
  check('重打按「升星补差」结算，不再重复算首通',
    S.streakGain === 0 && S.save.coin - coinReplay === (S.result.gain || 0) && S.result.first === false,
    `+${S.save.coin - coinReplay} gain=${S.result.gain} first=${S.result.first}`);

  /* 同一段里再打同一关：集合里已有 → 不计（防刷） */
  D.setupLevel(0);
  S.elapsed = 30; S.steps = 5; S.hintUsed = false;
  D.win();
  check('同一段内第二次重打同一关：连胜不涨', S.save.streak === 3, 'streak=' + S.save.streak);

  /* 段内换关通关：+1 并刷新最高 */
  D.setupLevel(2);
  S.elapsed = 30; S.steps = 5; S.hintUsed = false;
  D.win();
  check('段内换一关通关：连胜 +1', S.save.streak === 4, 'streak=' + S.save.streak);
  check('历史最高同步刷新', S.save.bestStreak === 4, 'best=' + S.save.bestStreak);

  /* 计时归零：失败立即清零并落盘 */
  S.page = 'play'; S.fade = 1; S.overlay = null; S.win = null; S.running = true;
  S.timeLimit = 60; S.timeLeft = 0.002; S.heart = 3;
  step(16);
  check('计时归零 → 进复活页', S.overlay === 'fail', 'overlay=' + S.overlay);
  check('失败瞬间当前连胜清零', S.save.streak === 0, 'streak=' + S.save.streak);
  check('失败瞬间本段已计关集合清空', S.save.streakSeen.length === 0, JSON.stringify(S.save.streakSeen));
  const persisted = JSON.parse(store[CFG.SAVE_KEY] || '{}');
  check('清零当场落盘（强杀进程也不会留下旧连胜）', persisted.streak === 0, 'disk=' + persisted.streak);
  check('断点集合也落盘为空', Array.isArray(persisted.streakSeen) && persisted.streakSeen.length === 0,
    JSON.stringify(persisted.streakSeen));
  check('历史最高不被失败抹掉', S.save.bestStreak === 4, 'best=' + S.save.bestStreak);

  clearRec();
  S.rankT = 999;
  /* v0.49：失败页先播进场动画（红闪 → 心碎 → 卡片落位），文案在卡片落位后
   * 才淡入。这里等动画走完再取帧，验的是玩家最终看到的那一版文案。 */
  S.failT = 1300;
  step(16);
  check('复活页仍显示断点前的连胜数', rec.texts.some(t => t.s === '已经连胜 4 关了'),
    textsOf(rec.texts.filter(t => /连胜|挑战结束/.test(t.s))));

  /* 复活：把连胜接回来（数值 + 本段集合一起） */
  D.doRevive(false);
  check('复活后连胜恢复', S.save.streak === 4, 'streak=' + S.save.streak);
  check('复活后本段集合恢复', S.save.streakSeen.join(',') === '1,3', JSON.stringify(S.save.streakSeen));
  check('复活后回到对局', S.overlay === null && S.running === true);

  /* 再次失败 + 放弃 */
  S.timeLeft = 0.002; step(16);
  check('第二次失败同样清零', S.overlay === 'fail' && S.save.streak === 0, `overlay=${S.overlay} streak=${S.save.streak}`);
  D.fireBtn('give_up');
  check('忍痛放弃 → 回关卡列表、连胜为 0', S.overlay === null && S.page === 'levels' && S.save.streak === 0,
    `page=${S.page} streak=${S.save.streak}`);
  check('放弃后不留断点值', S.streakBeforeFail === 0, 'before=' + S.streakBeforeFail);
  check('放弃后不留断点集合', S.seenBeforeFail.length === 0 && S.save.streakSeen.length === 0,
    `seenBeforeFail=${S.seenBeforeFail.length} streakSeen=${S.save.streakSeen.length}`);

  /* ================= 2. 合并与上行 ================= */
  section('2. 云端合并：当前连胜跟新档，最高连胜取最大');
  const localOld = { streak: 0, bestStreak: 3, updatedAt: 2000, starOf: {}, coin: 100 };
  const cloudNew = { streak: 9, bestStreak: 9, updatedAt: 1000, starOf: {}, coin: 500 };
  const merged = D.mergeSave(localOld, cloudNew);
  check('设备上已失败（0 连胜），云端旧值 9 不会把连胜复活', merged.streak === 0, 'merged=' + merged.streak);
  check('历史最高取两边最大值', merged.bestStreak === 9, 'best=' + merged.bestStreak);

  const newerFail = { streak: 0, bestStreak: 3, updatedAt: 3000, starOf: {}, coin: 100 };
  const olderOk = { streak: 5, bestStreak: 7, updatedAt: 1000, starOf: {}, coin: 500 };
  const m2 = D.mergeSave(olderOk, newerFail);
  check('较新的失败记录赢（当前连胜 0）', m2.streak === 0, 'merged=' + m2.streak);
  check('最高连胜仍是 7', m2.bestStreak === 7, 'best=' + m2.bestStreak);

  /* 上行：取两个数据集里最高的历史连胜 */
  store['tangram7_save_v1'] = JSON.stringify({ starOf: { 1: 3, 2: 3 }, bestStreak: 7, streak: 0 });
  S.save.bestStreak = 3; S.save.streak = 0;
  const col = D.collectCloud();
  check('上行 stats.streak = 两套数据集的最高连胜', col.stats.streak === 7, 'streak=' + col.stats.streak);
  /* 此时四巧板已通 3 关（1/2/3）、七巧板另存 2 关 → 5 */
  check('上行 cleared 仍按已通关数汇总', col.stats.cleared === 5, 'cleared=' + col.stats.cleared);

  /* 好友榜数据源（微信托管数据）也是同一口径 */
  const fs1 = D.friendStats();
  check('好友榜成绩：cleared 汇总 + 最高连胜', fs1.cleared === 5 && fs1.streak === 7,
    `cleared=${fs1.cleared} streak=${fs1.streak}`);

  /* ================= 3. 页签缓存 ================= */
  section('3. 榜单页签：切走再切回不再「加载失败」');
  friendLog.available = true;
  S.rankTab = 0; S.rankCache = {}; S.rankList = null;
  cloudLog.rankCalls.length = 0;
  D.openRank(null);
  await sleep(8);
  check('打开榜单 → 拉主线榜', cloudLog.rankCalls.join(',') === '0', JSON.stringify(cloudLog.rankCalls));
  clearRec(); S.rankT = 999; step(16);
  check('全服榜两行都画出来', rec.texts.some(t => t.s === '巧手0001') && rec.texts.some(t => t.s === '★26'),
    textsOf(rec.texts.filter(t => /巧手|★/.test(t.s))));
  const cached0 = S.rankCache[0];
  check('主线榜结果进缓存', !!cached0 && cached0.list.length === 2, 'n=' + (cached0 && cached0.list.length));

  /* v0.65：好友榜是 tab 1（0 全服 / 1 好友 / 2 本周） */
  D.selectRankTab(1);
  check('切好友榜：不动全服榜缓存与当前列表', S.rankList === cached0 && S.rankCache[0] === cached0,
    'listSame=' + (S.rankList === cached0));
  check('切好友榜：向开放数据域要内容', friendLog.shows.length === 1, 'shows=' + friendLog.shows.length);

  clearRec(); S.rankT = 999; step(16);
  check('好友榜把 sharedCanvas 贴进榜单区',
    rec.drawImages.length === 1 && rec.drawImages[0].x === CFG.RANK.list.x &&
    /* v0.65：画布高度从 588 收到 532，贴图起点是「首行中心 - 行高/2」 */
    rec.drawImages[0].y === CFG.RANK.list.top - CFG.RANK.list.rowH / 2 &&
    rec.drawImages[0].w === CFG.RANK.list.w,
    JSON.stringify(rec.drawImages.map(d => [d.x, d.y, d.w, d.h])));
  check('好友榜带自己的资料（好友列表里没有自己）',
    friendLog.shows[0].me && friendLog.shows[0].me.nick === D.meNick(),
    JSON.stringify(friendLog.shows[0].me));
  check('开放数据域画布尺寸按设计宽高', friendLog.shows[0].w === CFG.RANK.list.w && friendLog.shows[0].h === CFG.RANK.list.h,
    `${friendLog.shows[0].w}×${friendLog.shows[0].h}`);

  /* 切回主线：立即可用（不等网络） */
  cloudLog.rankCalls.length = 0;
  D.selectRankTab(0);
  check('切回主线：先把缓存摆上（rankList 有数据）', S.rankList === cached0, 'has=' + !!S.rankList);
  check('切回主线：后台再刷新一次', cloudLog.rankCalls.join(',') === '0', JSON.stringify(cloudLog.rankCalls));
  clearRec(); S.rankT = 999; step(16);
  check('切回主线：不显示「加载失败」', !rec.texts.some(t => /加载失败/.test(t.s)),
    textsOf(rec.texts.filter(t => /加载|失败/.test(t.s))));
  check('切回主线：列表照常显示', rec.texts.some(t => t.s === '巧手0001'));
  await sleep(8);

  /* 请求失败但有缓存 → 只降级成脚注 */
  section('4. 网络抖动：有缓存就不算失败');
  cloudCtl.failTabs[0] = true;
  D.selectRankTab(0);
  await sleep(8);
  clearRec(); S.rankT = 999; step(16);
  check('失败但仍有缓存：列表继续显示', rec.texts.some(t => t.s === '巧手0001'));
  check('失败但仍有缓存：不弹「榜单加载失败」', !rec.texts.some(t => /榜单加载失败/.test(t.s)));
  check('失败但仍有缓存：脚注说明是上次的榜', rec.texts.some(t => /上次的榜单/.test(t.s)),
    textsOf(rec.texts.filter(t => /网络|上次/.test(t.s))));
  delete cloudCtl.failTabs[0];

  /* 无缓存 + 失败 → 失败页 + 重试 */
  S.rankCache[2] = null;
  cloudCtl.failTabs[2] = true;
  D.selectRankTab(2);
  await sleep(8);
  clearRec(); S.rankT = 999; step(16);
  check('没有缓存又失败：显示「榜单加载失败」', rec.texts.some(t => /榜单加载失败/.test(t.s)));
  check('给出具体原因', rec.texts.some(t => /网络超时/.test(t.s)));
  check('给「重新加载」按钮', rec.texts.some(t => /重新加载/.test(t.s)));
  cloudLog.rankCalls.length = 0;
  delete cloudCtl.failTabs[2];
  D.fireBtn('rank_retry');
  await sleep(8);
  check('点重试会重新请求当前页签', cloudLog.rankCalls.join(',') === '2', JSON.stringify(cloudLog.rankCalls));
  clearRec(); S.rankT = 999; step(16);
  check('重试成功后画出本周榜', rec.texts.some(t => t.s === '连击王阿哲') && rec.texts.some(t => t.s === '★9'),
    textsOf(rec.texts.filter(t => /连击|★/.test(t.s))));

  /* 乱序响应：切走以后旧页签的回调不许改界面 */
  section('5. 乱序响应：旧页签的迟到结果只进缓存');
  S.rankCache = {};
  cloudCtl.hold[0] = [];
  D.selectRankTab(0);                    // 扣住 tab0
  D.selectRankTab(1);                    // tab1 立即返回
  await sleep(8);
  const list1 = S.rankList;
  release(0);
  await sleep(8);
  check('迟到的 tab0 不覆盖当前 tab1 的数据', S.rankList === list1 && S.rankListTab === 1,
    `tab=${S.rankListTab} same=${S.rankList === list1}`);
  check('迟到的 tab0 结果仍进缓存（下次切回去直接有）', !!S.rankCache[0] && S.rankCache[0].list.length === 2,
    'n=' + (S.rankCache[0] && S.rankCache[0].list.length));
  delete cloudCtl.hold[0];

  /* ================= 6. 好友榜降级 ================= */
  section('6. 好友榜：没有开放数据域时如实说明');
  friendLog.available = false;
  S.rankTab = 1; S.rankT = 999;
  clearRec(); step(16);
  check('降级文案（不是空白页）', rec.texts.some(t => /好友榜要在微信小游戏里看/.test(t.s)),
    textsOf(rec.texts.filter(t => /好友/.test(t.s))));
  check('不误用全服数据冒充好友', !rec.texts.some(t => t.s === '巧手0001'));
  friendLog.available = true;

  /* ================= 7. 好友数据写入 ================= */
  section('7. 好友榜数据源：通关写微信托管数据');
  friendLog.published.length = 0;
  S.save.bestStreak = 3; S.save.streak = 2;
  D.setupLevel(4);                       // 新关
  S.elapsed = 10; S.steps = 4; S.hintUsed = false;
  D.win();
  check('通关后发布一次好友榜数据', friendLog.published.length >= 1, 'n=' + friendLog.published.length);
  const pub = friendLog.published[friendLog.published.length - 1];
  check('发布内容带通关数 / 星数 / 最高连胜',
    pub && typeof pub.cleared === 'number' && typeof pub.streak === 'number' &&
    typeof pub.stars === 'number' && typeof pub.weekStars === 'number',
    JSON.stringify(pub));

  /* ================= 8. 工程约定 ================= */
  section('8. 开放数据域工程约定');
  const gj = JSON.parse(fs.readFileSync(path.join(ROOT, 'miniprogram/game.json'), 'utf8'));
  check('game.json 声明了 openDataContext', gj.openDataContext === 'openDataContext', JSON.stringify(gj));
  const odc = path.join(ROOT, 'miniprogram/openDataContext/index.js');
  check('开放数据域入口存在', fs.existsSync(odc));
  const odcSrc = fs.readFileSync(odc, 'utf8');
  check('用 wx.getFriendCloudStorage 读好友', /getFriendCloudStorage/.test(odcSrc));
  check('用 wx.getSharedCanvas 输出画布', /getSharedCanvas/.test(odcSrc));
  check('KV key 与主域一致（v0.65 升到 tangram_v2，旧键只读兼容）',
    /KEY = 'tangram_v2'/.test(odcSrc) && /KEY_OLD = 'tangram'/.test(odcSrc) &&
    /KV = 'tangram_v2'/.test(fs.readFileSync(path.join(ROOT, 'miniprogram/js/friendrank.js'), 'utf8')));
  const lMatch = odcSrc.match(/var L = \{ w: (\d+), h: (\d+), rowH: (\d+), step: (\d+), rows: (\d+)/);
  check('开放数据域的版式常数与 config.RANK.list 一致',
    !!lMatch && +lMatch[1] === CFG.RANK.list.w && +lMatch[2] === CFG.RANK.list.h &&
    +lMatch[3] === CFG.RANK.list.rowH && +lMatch[4] === CFG.RANK.list.step && +lMatch[5] === CFG.RANK.list.rows,
    lMatch ? lMatch.slice(1).join(',') : 'missing');
  const gameSrc = fs.readFileSync(path.join(ROOT, 'miniprogram/game.js'), 'utf8');
  check('小程序端把 friend 适配层接进 env', /friend: friendLib\.createFriend\(\)/.test(gameSrc));

  /* ================= 9. 三端一致 ================= */
  section('9. 三端模块一致');
  for (const m of ['config', 'core']) {
    const __mp = f => fs.existsSync(f) ? require('./lib/pack.js').strip(fs.readFileSync(f, 'utf8')) : '';
    const a = crypto.createHash('md5').update(__mp(path.join(ROOT, `js/${m}.js`))).digest('hex');
    const b = crypto.createHash('md5').update(__mp(path.join(ROOT, `preview/js/${m}.js`))).digest('hex');
    const c = crypto.createHash('md5').update(__mp(path.join(ROOT, `miniprogram/js/${m}.js`))).digest('hex');
    check(m + '.js 三端一致', a === b && b === c, a.slice(0, 8));
  }

  /* ================= 10. 开放数据域渲染 ================= */
  section('10. 开放数据域：好友榜列表画得对不对');
  const vm = require('vm');
  const odcPath2 = path.join(ROOT, 'miniprogram/openDataContext/index.js');
  const odcCode = fs.readFileSync(odcPath2, 'utf8');

  function runOdc(friends, me, failIt) {
    const r = { texts: [], fills: [], imgs: 0, strokes: [], posts: [] };
    const c2 = {
      canvas: null, font: '', fillStyle: '', strokeStyle: '', lineWidth: 1,
      textAlign: 'left', textBaseline: 'top',
      measureText(s) { return { width: String(s).length * 12 }; },
      setTransform() {}, clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {},
      arcTo() {}, closePath() {}, arc() {}, save() {}, restore() {}, clip() {},
      fill() { r.fills.push(this.fillStyle); },
      stroke() { r.strokes.push(this.strokeStyle); },
      drawImage() {},
      fillText(s, x, y) {
        r.texts.push({ s: String(s), x, y, color: this.fillStyle, size: this.font, align: this.textAlign });
      }
    };
    const sc = { width: 0, height: 0, getContext: () => c2 };
    c2.canvas = sc;
    let onMsg = null;
    const wx = {
      getSharedCanvas: () => sc,
      onMessage(cb) { onMsg = cb; },
      getFriendCloudStorage(o) {
        if (failIt) { o.fail({ errMsg: 'getFriendCloudStorage:fail' }); return; }
        o.success({ data: friends });
      },
      createImage() { r.imgs++; return { set src(v) {}, onload: null, onerror: null }; },
      /* v0.65：开放数据域画完把名次回传主域 */
      postMessage(m) { r.posts.push(m); }
    };
    const box = { wx, console, Math, JSON, String, Number, Array, Object };
    box.globalThis = box;
    vm.createContext(box);
    vm.runInContext(odcCode, box);
    onMsg({ type: 'show', w: 566, h: 532, k: 2, me });
    r.canvas = sc;
    return r;
  }

  /* v0.65：KV 升到 v2（带 stars），排序主键改成星数 */
  const mkFriend = (n, stars, av) => ({
    nickname: n, avatarUrl: av ? 'https://thirdwx.qlogo.cn/' + n : '',
    KVDataList: [{ key: 'tangram_v2', value: JSON.stringify({
      v: 2, stars: stars, cleared: Math.round(stars / 3), weekStars: 0, streak: 0
    }) }]
  });
  const f8 = [mkFriend('泡泡', 120, 1), mkFriend('刘晓飞二大爷', 96, 1), mkFriend('尼西26G', 74, 1),
    mkFriend('小满', 52, 1), mkFriend('wayne wong', 41, 1), mkFriend('木木不吃鱼', 28, 1),
    mkFriend('阿树', 19, 1), mkFriend('吊车尾', 3, 0)];
  /* 我 15 星 → 排第 8，正好在 7 行之外 */
  const od = runOdc(f8, { nick: '古月三金', avatar: '', cleared: 5, stars: 15, streak: 0 });

  check('离屏画布按 设计宽高 × k 开（566×532×2）', od.canvas.width === 1132 && od.canvas.height === 1064,
    od.canvas.width + '×' + od.canvas.height);
  const names = od.texts.filter(t => t.align === 'left' && !/关$/.test(t.s)).map(t => t.s);
  check('好友按星数从高到低排', names[0] === '泡泡' && names[1] === '刘晓飞二大爷',
    names.join('|'));
  check('最多 7 行，自己不在前 7 时不顶掉第 7 名',
    od.texts.some(t => t.s === '阿树') && !od.texts.some(t => t.s === '古月三金'),
    names.join('|'));
  check('主值带星号单位（★N）',
    od.texts.some(t => t.s === '★120') && od.texts.some(t => t.s === '★19'),
    od.texts.filter(t => /★/.test(t.s)).map(t => t.s).join('|'));
  check('副信息是「通关 M 关」',
    od.texts.some(t => t.s === '通关 40 关'),
    od.texts.filter(t => /^通关/.test(t.s)).map(t => t.s).join('|'));
  check('有头像的好友会去加载图片（共 7 张）', od.imgs === 7, 'imgs=' + od.imgs);
  check('画完把名次回传主域（我第 8 / 共 9 人）',
    od.posts.length === 1 && od.posts[0].type === 'friendRank' &&
    od.posts[0].myRank === 8 && od.posts[0].total === 9 && od.posts[0].myStars === 15,
    JSON.stringify(od.posts[0] || null));

  const odErr = runOdc([], null, true);
  check('好友数据读失败：给可读文案而不是白屏',
    odErr.texts.some(t => /暂时读不到好友数据/.test(t.s)), textsOf(odErr.texts));
  const odEmpty = runOdc([], { nick: '古月三金', avatar: '', cleared: 0, stars: 0, streak: 0 });
  check('没有好友：提示邀请好友', odEmpty.texts.some(t => /还没有好友上榜/.test(t.s)), textsOf(odEmpty.texts));

  /* ================= 11. 主域桥（friendrank.js）================= */
  section('11. friendrank.js：开放数据域桥的真实行为');
  const posted = [], kv = [];
  const fakeCanvas = { width: 0, height: 0 };
  global.wx = {
    getOpenDataContext() { return { canvas: fakeCanvas, postMessage(m) { posted.push(m); } }; },
    setUserCloudStorage(o) { kv.push({ list: o.KVDataList, t: Date.now() }); }
  };
  const FR = require(path.join(ROOT, 'miniprogram/js/friendrank.js')).createFriend();
  check('检测到开放数据域', FR.available() === true);
  check('image() 就是 sharedCanvas', FR.image() === fakeCanvas);
  FR.show({ w: 566, h: 588, k: 9, me: { nick: '古月三金', cleared: 12 } });
  check('postMessage 带上尺寸（k 夹在 1..3）',
    posted.length === 1 && posted[0].type === 'show' && posted[0].w === 566 &&
    posted[0].h === 588 && posted[0].k === 3,
    JSON.stringify(posted[0]));
  check('把自己的资料带过去', posted[0].me && posted[0].me.nick === '古月三金');

  FR.publish({ cleared: 12, streak: 3 });
  FR.publish({ cleared: 12, streak: 3 });        // 同值不重复写
  await sleep(1350);
  check('合并写：两次同值只落一次', kv.length === 1, 'n=' + kv.length);
  check('写入的 key 是 tangram_v2（v0.65）', kv[0].list[0].key === 'tangram_v2', JSON.stringify(kv[0].list[0].key));
  const kvVal = JSON.parse(kv[0].list[0].value);
  /* v0.65：好友榜也按星数排，所以 KV 里必须同时带 stars / weekStars */
  check('写入内容包含通关数 / 星数 / 最高连胜',
    kvVal.cleared === 12 && kvVal.streak === 3 && kvVal.stars === 0 && kvVal.weekStars === 0,
    JSON.stringify(kvVal));

  FR.publish({ cleared: 13, streak: 3 });
  await sleep(1350);
  check('值变了会再写一次', kv.length === 2, 'n=' + kv.length);
  check('新值已更新', JSON.parse(kv[1].list[0].value).cleared === 13);

  delete global.wx;
  const FR2 = require(path.join(ROOT, 'miniprogram/js/friendrank.js')).createFriend();
  check('没有 wx 时不抛异常、直接降级', FR2.available() === false && FR2.publish({ cleared: 1 }) === false);

  console.log(`\n通过 ${ok} 项${fail ? '，失败 ' + fail + ' 项' : '，全部通过'}`);
  if (fail) process.exitCode = 1;
})();
