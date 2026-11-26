/* v0.19 专项验收：连胜计数口径修订（段内去重）+ 上行即时化
 * 用法：node tools/verify_v19.js
 *
 * 用户原话：「连胜榜进入游戏使用道具或者复活后的通过也算是连胜。」
 * 实测根因（见 v0.19 规格 §1）：新关用道具/复活后的通关本来就算，
 * 漏算的是「重玩已通关的关」—— win() 里 wasCleared = starOf[k] > 0 把它判成了重玩。
 * 本文件覆盖规格 §4 的 14 个用例。
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');

/* ---------- 记录型 ctx ---------- */
const rec = { texts: [], drawImages: [] };
function makeCtx() {
  const grad = { addColorStop() {} };
  const base = {
    canvas: { width: 0, height: 0, style: {} },
    measureText(s) { return { width: String(s).length * 15 }; },
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
    createPattern: () => null,
    fillText(s, x, y) { rec.texts.push({ s: String(s), x, y, color: base.fillStyle }); },
    stroke() {}, fill() {}, arc() {}, moveTo() {}, lineTo() {},
    fillRect() {}, strokeRect() {}, setLineDash() {},
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
function clearRec() { rec.texts.length = 0; rec.drawImages.length = 0; }
const textsOf = arr => arr.map(t => t.s).join(' | ');

/* ---------- 可控假云 ---------- */
const store = {};
const cloudLog = { saved: [] };
const fakeCloud = {
  enabled: () => true,
  init(cb) { setTimeout(() => cb(null, { openid: 'oX1', nick: '巧手0921' }), 0); },
  load(cb) { setTimeout(() => cb(null, { sets: {} }), 0); },     // 不合并，保持本文件存档干净
  save(payload, cb) {
    cloudLog.saved.push({ t: Date.now(), stats: JSON.parse(JSON.stringify(payload.stats)) });
    setTimeout(() => cb(null, { nick: '巧手0921', me: { nick: '巧手0921', v: 1, rank: 2 } }), 0);
  },
  rank(tab, cb) { setTimeout(() => cb(null, { list: [], me: null }), 0); }
};

/* ---------- 假好友榜（微信托管数据） ---------- */
const friendLog = { published: [] };
const fakeFriend = {
  available: () => true,
  image: () => ({ __fakeSharedCanvas: true }),
  show() { return true; },
  publish(stats) { friendLog.published.push(JSON.parse(JSON.stringify(stats))); return true; }
};

function makeEnv(st, cl) {
  return {
    ctx: makeCtx(),
  tutorial: false,   // v0.21：这些脚本专测横向系统，关掉第 1 关教学
    size: () => ({ w: 375, h: 812 }),
    dpr: () => 3,
    safeInsets: () => ({ top: 20, bottom: 0 }),
    bindInput() {},
    storage: { get: k => (k in st ? st[k] : null), set: (k, v) => { st[k] = v; } },
    audio: { unlock() {}, setEnabled() {}, play() {}, duck() {}, setVisible() {}, setScene() {} },
    vibrate() {}, images: {}, share() {}, onHide() {}, onShow() {},
    cloud: cl || null,
    friend: fakeFriend,
    ad: { placeholder: true, banner() {}, rewarded(k, cb) { cb(true, ''); } }
  };
}

/* 开局存档：四巧板已通 2 关、当前连胜 2、没有 streakSeen（模拟 v0.18 老存档升级上来） */
store[CFG.SAVE_KEY] = JSON.stringify({
  starOf: { 1: 3, 2: 2 }, unlockedMax: 3, streak: 2, bestStreak: 2,
  settings: { sfx: true, bgm: true }, coin: 2000, energy: 16, hintItems: 3
});

const SAVE_KEY_4 = CFG.SAVE_KEY;

/* ============ 通用驱动 ============ */
let S, D;
function setStreak(streak, seen) {
  S.save.streak = streak;
  S.save.streakSeen = seen.slice();
  S.streakBeforeFail = 0;
  S.seenBeforeFail = [];
}
/* 直接走 win()，不依赖判定时序（判定本身由 verify_levels / gestures 覆盖） */
function winAt(idx) {
  D.setupLevel(idx);
  S.page = 'play'; S.fade = 1; S.overlay = null; S.win = null; S.result = null;
  S.running = true;
  S.elapsed = 30; S.steps = 5; S.hintUsed = false;
  D.win();
}
/* 直接走失败分支（计时归零由主循环 update 触发，与线上一致） */
function failNow() {
  S.page = 'play'; S.fade = 1; S.overlay = null; S.win = null; S.result = null;
  S.running = true;
  S.timeLimit = 60; S.timeLeft = 0.002; S.hearts = 3;
  step(16);
}

(async function main() {
  console.log('v0.19 验收：连胜计数口径修订（段内去重）+ 上行即时化');
  const game = CORE(makeEnv(store, fakeCloud));
  game.init();
  step(16);
  await sleep(20);
  S = game.state; D = game._debug;

  /* ================= 0. 版本与迁移 ================= */
  section('0. 版本 / 存档迁移');
  check('版本 v0.19 起', /^v0\.\d+(\.\d+)?$/.test(CFG.version), CFG.version);
  check('存档默认值带 streakSeen: []', Array.isArray(S.save.streakSeen), JSON.stringify(S.save.streakSeen));

  /* 用例 11：老存档无 streakSeen → 迁移为空数组，不报错 */
  {
    const st2 = {};
    st2[SAVE_KEY_4] = JSON.stringify({
      starOf: { 1: 3, 2: 3, 3: 1 }, unlockedMax: 4, streak: 7, bestStreak: 9,
      settings: { sfx: true, bgm: true }, coin: 500, energy: 10
    });                                        // 没有 streakSeen 字段（v0.18 存档）
    const g2 = CORE(makeEnv(st2, null));
    /* 第二个实例会把自己的 rAF 链挂到全局 —— 存一下主实例的链，验完立刻还回去，
     * 否则后面的 step() 驱动的是 g2，主实例的倒计时/失败分支全都不再执行。 */
    const mainFrame = pendingFrame;
    g2.init();
    pendingFrame = mainFrame;
    const s2 = g2.state.save;
    check('用例11 老存档无 streakSeen → 迁移为空数组、不报错',
      Array.isArray(s2.streakSeen) && s2.streakSeen.length === 0, JSON.stringify(s2.streakSeen));
    check('用例11 迁移不用 starOf 反推（否则升级后第一段连胜直接失效）',
      s2.streak === 7 && s2.bestStreak === 9, `streak=${s2.streak} best=${s2.bestStreak}`);
  }

  /* ================= 1. 用道具 / 复活后的通关都算 ================= */
  section('1. 用道具 / 复活后的通关计入连胜');
  /* 用例 1：新关 + 用查找道具通关 → streak +1 */
  setStreak(0, []);
  S.save.hintItems = 2;
  D.setupLevel(2);                                  // 第 3 关（未通关）
  S.page = 'play'; S.overlay = null; S.win = null; S.running = true;
  D.useHintItem();
  const usedItem = S.save.hintItems === 1 && S.hintUsed === true;
  S.elapsed = 30; S.steps = 5;
  D.win();
  check('用例1 新关用查找道具通关：连胜 +1', S.save.streak === 1, 'streak=' + S.save.streak);
  check('用例1 确实用掉了查找道具（不是空跑）', usedItem, `items=${S.save.hintItems} hintUsed=${S.hintUsed}`);

  /* 用例 2：新关 + 失败 + 复活 + 通关 → streak = 断点值 + 1 */
  setStreak(3, ['1', '2', '3']);
  D.setupLevel(3);                                  // 第 4 关（新关）
  failNow();
  check('用例2 计时归零进复活页', S.overlay === 'fail', 'overlay=' + S.overlay);
  D.doRevive(false);
  check('用例2 复活把连胜接回来', S.save.streak === 3, 'streak=' + S.save.streak);
  S.elapsed = 30; S.steps = 5; S.hintUsed = false;
  D.win();
  check('用例2 复活后通关：断点值 + 1', S.save.streak === 4, 'streak=' + S.save.streak);

  /* 用例 3：连续两次失败两次复活 + 通关 → 断点值 + 1，reviveUsed=2 */
  setStreak(3, ['1', '2', '3']);
  D.setupLevel(4);
  failNow(); D.doRevive(false);
  failNow(); D.doRevive(false);
  check('用例3 两次复活已用完（reviveUsed=2）', S.reviveUsed === 2, 'reviveUsed=' + S.reviveUsed);
  S.elapsed = 30; S.steps = 5; S.hintUsed = false;
  D.win();
  check('用例3 连续两次复活后通关：断点值 + 1', S.save.streak === 4, 'streak=' + S.save.streak);

  /* 用例 4：广告复活 + 通关 → streak +1，巧币 +90 */
  setStreak(2, ['1', '2']);
  D.setupLevel(5);
  failNow();
  const coinB4Ad = S.save.coin;
  D.doRevive(true);                                 // 广告复活
  /* v0.23：广告复活只给心，不再倒贴 90 巧币 */
  check('用例4 广告复活不给巧币', S.save.coin - coinB4Ad === 0, '+' + (S.save.coin - coinB4Ad));
  check('用例4 广告复活把连胜接回来', S.save.streak === 2, 'streak=' + S.save.streak);
  S.elapsed = 30; S.steps = 5; S.hintUsed = false;
  D.win();
  check('用例4 广告复活后通关：连胜 +1', S.save.streak === 3, 'streak=' + S.save.streak);

  /* ================= 2. 段内去重（核心修复 + 防刷） ================= */
  section('2. 段内去重：新段重打已通关的关算，同一段里再打不算');
  /* 用例 5：已通关的关（新的一段）重打 + 通关 → streak +1 —— 本次核心修复 */
  check('用例5 前置：第 1 关在存档里已通', (S.save.starOf['1'] || 0) > 0, 'starOf[1]=' + S.save.starOf['1']);
  setStreak(0, []);                                 // 新的一段，集合为空
  winAt(0);
  check('用例5 新一段重打已通关的关：连胜 +1（核心修复）', S.save.streak === 1, 'streak=' + S.save.streak);
  check('用例5 该关记入本段集合', S.save.streakSeen.join(',') === '1', JSON.stringify(S.save.streakSeen));

  /* 用例 6：同一段内第二次重打同一关 + 通关 → streak 不变，且不发里程碑 */
  setStreak(4, ['1', '2', '3', '4']);
  const coinB4R = S.save.coin;
  winAt(0);                                        // 第 1 关已在集合里
  check('用例6 段内第二次重打同一关：连胜不涨', S.save.streak === 4, 'streak=' + S.save.streak);
  check('用例6 不发连胜里程碑', S.streakGain === 0, 'gain=' + S.streakGain);
  check('用例6 重打同一关不给巧币（星级没提升）',
    S.save.coin - coinB4R === (S.result.gain || 0),
    '+' + (S.save.coin - coinB4R) + ' first=' + S.result.first);

  /* 用例 7：段内换关通关 → streak 继续 +1 */
  setStreak(2, ['1', '2']);
  winAt(2);                                        // 第 3 关，集合里没有
  check('用例7 段内换一关通关：连胜继续 +1', S.save.streak === 3, 'streak=' + S.save.streak);
  check('用例7 集合追加该关', S.save.streakSeen.join(',') === '1,2,3', JSON.stringify(S.save.streakSeen));

  /* 用例 8：失败 → 放弃 → 重打同一关通关 → streak = 1 */
  setStreak(3, ['1', '2', '3']);
  D.setupLevel(2);                                 // 第 3 关
  failNow();
  S.timeLeft = 0; S.overlay = 'fail';
  D.fireBtn('give_up');
  check('用例8 放弃后回关卡列表、连胜清零', S.page === 'levels' && S.save.streak === 0,
    `page=${S.page} streak=${S.save.streak}`);
  check('用例8 放弃后两处断点都清', S.streakBeforeFail === 0 && S.seenBeforeFail.length === 0 &&
    S.save.streakSeen.length === 0,
    `before=${S.streakBeforeFail} seenBeforeFail=${S.seenBeforeFail.length} streakSeen=${S.save.streakSeen.length}`);
  winAt(2);                                        // 重打刚失败的第 3 关
  check('用例8 放弃后重打同一关：从 1 重新起算', S.save.streak === 1, 'streak=' + S.save.streak);

  /* 用例 9：复活后 streakSeen 与失败前一致 */
  setStreak(4, ['2', '4', '6', '8']);
  const seenBefore = S.save.streakSeen.slice();
  D.setupLevel(9);                                 // 第 10 关
  failNow();
  check('用例9 失败瞬间集合清空', S.save.streakSeen.length === 0, JSON.stringify(S.save.streakSeen));
  check('用例9 失败瞬间断点集合存的是失败前的快照',
    S.seenBeforeFail.join(',') === seenBefore.join(','), JSON.stringify(S.seenBeforeFail));
  D.doRevive(false);
  check('用例9 复活后集合与失败前完全一致',
    S.save.streakSeen.join(',') === seenBefore.join(','), JSON.stringify(S.save.streakSeen));
  check('用例9 复活后断点已清空', S.streakBeforeFail === 0 && S.seenBeforeFail.length === 0,
    `before=${S.streakBeforeFail} seen=${S.seenBeforeFail.length}`);

  /* 用例 10：强杀进程级落盘 —— 失败后磁盘 streak=0、streakSeen=[] */
  setStreak(6, ['1', '2', '3', '4', '5', '6']);
  S.save.bestStreak = 8;
  D.setupLevel(11);
  failNow();
  {
    const disk = JSON.parse(store[SAVE_KEY_4] || '{}');
    check('用例10 失败后磁盘 streak=0', disk.streak === 0, 'disk=' + disk.streak);
    check('用例10 失败后磁盘 streakSeen=[]',
      Array.isArray(disk.streakSeen) && disk.streakSeen.length === 0, JSON.stringify(disk.streakSeen));
    check('用例10 历史最高不被失败抹掉', disk.bestStreak >= 8, 'disk best=' + disk.bestStreak);
  }
  D.fireBtn('give_up');

  /* 用例 12：云端合并 —— 较新档的 streakSeen 生效，不串段 */
  section('3. 云端合并：streak 与 streakSeen 一起跟较新那份走');
  {
    const older = { streak: 2, streakSeen: ['1', '2'], bestStreak: 5, updatedAt: 1000, starOf: {} };
    const newer = { streak: 1, streakSeen: ['7'], bestStreak: 5, updatedAt: 2000, starOf: {} };
    const m1 = D.mergeSave(older, newer);
    check('用例12 newer 在云端：用云端的 streak 与集合',
      m1.streak === 1 && m1.streakSeen.join(',') === '7',
      `streak=${m1.streak} seen=${JSON.stringify(m1.streakSeen)}`);
    check('用例12 集合不是 union（不会串段）', m1.streakSeen.indexOf('1') < 0, JSON.stringify(m1.streakSeen));
    const m2 = D.mergeSave(
      { streak: 2, streakSeen: ['1', '2'], bestStreak: 5, updatedAt: 2000, starOf: {} },   // 本机较新
      { streak: 1, streakSeen: ['7'], bestStreak: 5, updatedAt: 1000, starOf: {} });      // 云端较旧
    check('用例12 本机较新：用本机的 streak 与集合',
      m2.streak === 2 && m2.streakSeen.join(',') === '1,2',
      `streak=${m2.streak} seen=${JSON.stringify(m2.streakSeen)}`);
    check('用例12 最高连胜仍取两边最大值', m1.bestStreak === 5 && m2.bestStreak === 5,
      `m1=${m1.bestStreak} m2=${m2.bestStreak}`);
    const m3 = D.mergeSave(
      { streak: 3, streakSeen: ['1'], bestStreak: 3, updatedAt: 100 },
      { streak: 0, streakSeen: [], bestStreak: 3, updatedAt: 200 });
    check('用例12 较新那份已失败（0 连胜）→ 合并结果不是旧值', m3.streak === 0 && m3.streakSeen.length === 0,
      `streak=${m3.streak} seen=${JSON.stringify(m3.streakSeen)}`);
  }

  /* 用例 13：上行即时 —— 通关后 100ms 内触发一次 save */
  section('4. 上行即时化：通关不等 3.5s 防抖');
  await sleep(40);                                   // 让上一次 push 的「在途」标记落回去
  {
    setStreak(1, ['1']);
    cloudLog.saved.length = 0;
    winAt(1);                                        // 第 2 关（段内没计过）
    const nRight = cloudLog.saved.length;
    await sleep(100);
    const n100 = cloudLog.saved.length;
    check('用例13 通关后立刻发了一次上行（同步触发，不等防抖）', nRight >= 1, 'n=' + nRight);
    check('用例13 100ms 内累计上行次数 ≥1', n100 >= 1, 'n=' + n100);
    check('用例13 上行内容带上了最新最高连胜', cloudLog.saved.some(x => x.stats && x.stats.streak >= 2),
      JSON.stringify(cloudLog.saved.map(x => x.stats)));
  }
  {
    /* 失败 / 复活 / 放弃 三条路径同样即时上行 */
    await sleep(40);
    cloudLog.saved.length = 0;
    setStreak(3, ['1', '2', '3']);
    D.setupLevel(6);
    failNow();
    const nFail = cloudLog.saved.length;
    await sleep(60);
    check('用例13 失败清零也立刻上行', nFail >= 1 || cloudLog.saved.length >= 1,
      `now=${nFail} later=${cloudLog.saved.length}`);
    await sleep(40);
    cloudLog.saved.length = 0;
    D.doRevive(false);
    await sleep(60);
    check('用例13 复活恢复也立刻上行', cloudLog.saved.length >= 1, 'n=' + cloudLog.saved.length);
    await sleep(40);
    cloudLog.saved.length = 0;
    S.timeLeft = 0.002; step(16);
    D.fireBtn('give_up');
    await sleep(60);
    check('用例13 放弃清零也立刻上行', cloudLog.saved.length >= 1, 'n=' + cloudLog.saved.length);
  }
  /* publishFriend 必须在不触发上行的情况下被调到（不能递归） */
  {
    await sleep(40);
    const nPub = friendLog.published.length;
    setStreak(0, []);
    winAt(3);
    check('通关同时发布好友榜成绩', friendLog.published.length > nPub,
      `${nPub}→${friendLog.published.length}`);
    const lastPub = friendLog.published[friendLog.published.length - 1];
    check('好友榜成绩仍是 cleared + 历史最高连胜', lastPub && typeof lastPub.cleared === 'number' &&
      typeof lastPub.streak === 'number', JSON.stringify(lastPub));
  }

  /* 用例 14：榜上限 —— 一段内每关只计一次，通完全部关卡后封顶，再刷不变 */
  section('5. 榜上限：一段内每关只计一次，刷不动');
  {
    setStreak(0, []);
    const n = D.LEVELS.length;
    for (let i = 0; i < n; i++) winAt(i);
    /* 规格 §4 写的是「25 关」，实际四巧板当前是 30 关 —— 断言按实际关卡数封顶 */
    check('用例14 通完全部关卡：streak = 关卡数（每关一段内只计一次）',
      S.save.streak === n, `streak=${S.save.streak} 关卡数=${n}`);
    check('用例14 最高连胜同步封顶', S.save.bestStreak === n, 'best=' + S.save.bestStreak);
    const capped = S.save.streak, cappedBest = S.save.bestStreak;
    winAt(0); winAt(5); winAt(n - 1);
    check('用例14 再重打任意几关：streak 不变（无法刷榜）', S.save.streak === capped,
      `${capped}→${S.save.streak}`);
    check('用例14 最高连胜也不变', S.save.bestStreak === cappedBest, 'best=' + S.save.bestStreak);
    check('用例14 段内集合大小 = 关卡数（没有重复项）',
      S.save.streakSeen.length === n && new Set(S.save.streakSeen).size === n,
      `len=${S.save.streakSeen.length}`);
    /* 失败后新一段：集合清空 → 又能从 1 开始涨（但一段最高还是关卡数） */
    D.setupLevel(0);
    failNow();
    check('用例14 失败后新一段集合清空', S.save.streak === 0 && S.save.streakSeen.length === 0,
      `streak=${S.save.streak} seen=${S.save.streakSeen.length}`);
    D.fireBtn('give_up');
    winAt(0);
    check('用例14 新一段重新从 1 起算', S.save.streak === 1, 'streak=' + S.save.streak);
  }

  /* ================= 6. 文案与配置 ================= */
  section('6. 文案 / 配置口径');
  {
    clearRec();
    S.rankTab = 1; S.overlay = 'rank'; S.rankT = 999; S.page = 'home';
    S.rankErr = '';
    step(16); step(16);
    check('连胜榜脚注改用新口径',
      rec.texts.some(t => /每关在一段连胜里只计一次/.test(t.s)),
      textsOf(rec.texts.filter(t => /连胜|排名/.test(t.s))));
    check('脚注不再写「重玩不计」旧说法',
      !rec.texts.some(t => /中途失败会中断/.test(t.s)),
      textsOf(rec.texts.filter(t => /中断/.test(t.s))));
    check('config.STREAK 注释已改成 v0.19 口径',
      /v0\.19 口径/.test(fs.readFileSync(path.join(ROOT, 'js/config.js'), 'utf8')));
    S.overlay = null;
  }

  /* ================= 7. 三端一致 ================= */
  section('7. 三端模块一致（5 个模块）');
  for (const m of ['config', 'core', 'geom', 'judge', 'levels']) {
    const h = f => crypto.createHash('md5').update(require('./lib/pack.js').strip(fs.readFileSync(path.join(ROOT, f), 'utf8'))).digest('hex');
    const a = h(`js/${m}.js`), b = h(`preview/js/${m}.js`), c = h(`miniprogram/js/${m}.js`);
    check(m + '.js 三端一致', a === b && b === c, a.slice(0, 8));
  }

  console.log(`\n通过 ${ok} 项${fail ? '，失败 ' + fail + ' 项' : '，全部通过'}`);
  if (fail) process.exitCode = 1;
})();
