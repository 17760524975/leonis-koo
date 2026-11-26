/* v0.65 专项验收：排行榜重做（全服榜 / 好友榜 / 本周榜）
 * 用法：node tools/verify_rank_v65.js
 *
 * 口径唯一来源 docs/v0.63-排行榜重设计规格.md，本脚本按它的 §7 逐条落测：
 *   · 计分（总星数只升不降 / 本周星数按本次星级、同关同日取最高）
 *   · 排序与名次（星数优先、复合次键、复合名次 count）
 *   · 周切换与倒计时（UTC+8 ISO 周、下周一 00:00 重置）
 *   · 三页签不串数据 / 周榜缓存按 weekKey 分桶
 *   · 「我的名次」常驻卡三种状态
 *   · 好友榜 KV v2 兼容 + 名次回传
 *   · 防刷上限、uid 跟关卡走（插队不影响周星归属）
 * 云函数是独立进程（require wx-server-sdk），这里用「抽纯函数 + 源码断言」验它的
 * 口径：weekKeyOf / nextResetAt 是真跑（正则抽出后在 vm 里执行），排序与夹取
 * 断言源码特征 —— 比在测试里重写一遍逻辑更有意义。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');

/* ---------- 记录型 ctx ---------- */
const rec = { texts: [], fills: [], drawImages: [] };
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
    arc() {}, moveTo() {}, lineTo() {}, fillRect() {}, strokeRect() {},
    setLineDash() {}, save() {}, restore() {}, beginPath() {}, closePath() {},
    arcTo() {}, bezierCurveTo() {}, quadraticCurveTo() {}, rect() {}, translate() {},
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
const textsOf = a => a.map(t => t.s).join(' | ');

/* ---------- 假云 / 假好友 ---------- */
const store = {};
const cloudLog = { ranks: [], saves: [] };
const fakeCloud = {
  enabled: () => true,
  init(cb) { setTimeout(() => cb(null, { openid: 'o1', nick: '巧手0921', avatar: '', src: 'auto', auth: false }), 0); },
  load(cb) { setTimeout(() => cb(null, { sets: {} }), 0); },
  save(p, cb) {
    cloudLog.saves.push(JSON.parse(JSON.stringify(p)));
    setTimeout(() => cb(null, { nick: '巧手0921', me: { nick: '巧手0921', v: p.stats.stars, rank: 2 } }), 0);
  },
  rank(tab, cb) {
    cloudLog.ranks.push(tab);
    setTimeout(() => cb(null, {
      list: [], me: { nick: '巧手0921', v: 0, rank: 1 }, nextResetAt: 0, weekKey: ''
    }), 0);
  }
};
const friendLog = { shows: [], published: [], rankCbs: [] };
const fakeFriend = {
  available: () => true,
  image: () => ({ __fakeSharedCanvas: true }),
  show(o) { friendLog.shows.push(o); return true; },
  publish(s) { friendLog.published.push(s); return true; },
  onRank(cb) { friendLog.rankCbs.push(cb); }
};

const env = {
  ctx: makeCtx(), tutorial: false,
  size: () => ({ w: 375, h: 812 }), dpr: () => 3,
  safeInsets: () => ({ top: 20, bottom: 0 }),
  bindInput(fn) { env._in = fn; },
  storage: { get: k => (k in store ? store[k] : null), set: (k, v) => { store[k] = v; } },
  audio: { unlock() {}, setEnabled() {}, play() {}, duck() {}, setVisible() {}, setScene() {} },
  vibrate() {}, images: {}, share() {}, onHide() {}, onShow() {},
  cloud: fakeCloud, friend: fakeFriend,
  ad: { placeholder: true, banner() {}, rewarded(k, cb) { cb(true, ''); } }
};
function clearRec() { rec.texts.length = 0; rec.fills.length = 0; rec.drawImages.length = 0; }

store[CFG.SAVE_KEY] = JSON.stringify({
  starOf: {}, starPaid: {}, unlockedMax: 1, streak: 0,
  settings: { sfx: false, bgm: false }, coin: 900, energy: 16
});

/* ---------- 云函数里的纯函数：抽出来真跑 ---------- */
const CFN = fs.readFileSync(path.join(ROOT, 'miniprogram/cloudfunctions/player/index.js'), 'utf8');
function pullFn(src, name) {
  const i = src.indexOf('function ' + name + '(');
  if (i < 0) return '';
  let d = 0, started = false;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') { d++; started = true; }
    else if (src[j] === '}') { d--; if (started && d === 0) return src.slice(i, j + 1); }
  }
  return '';
}
const TZSRC = 'const TZ = 8 * 3600 * 1000;\n';
const sandbox = { Date, Math, String, Number, JSON };
vm.createContext(sandbox);
vm.runInContext(TZSRC + pullFn(CFN, 'weekKeyOf') + '\n' + pullFn(CFN, 'nextResetAt') +
  '\n' + pullFn(CFN, 'dayKeyCN') +
  '\nthis.__wk = weekKeyOf; this.__reset = nextResetAt; this.__day = dayKeyCN;', sandbox);
const weekKeyOf = sandbox.__wk, nextResetAt = sandbox.__reset, dayKeyCN = sandbox.__day;

(async function main() {
  console.log('v0.65 验收：排行榜重做（全服 / 好友 / 本周）');
  const game = CORE(env);
  game.init();
  step(16);
  await sleep(12);
  const S = game.state, D = game._debug;
  const lvIdx = i => D.LEVELS[i];

  /* 干净存档 */
  function resetSave() {
    S.save.starOf = {}; S.save.starPaid = {}; S.save.bestTime = {};
    S.save.weekSeen = {}; S.save.weekQ = []; S.save.weekWeek = '';
    S.save.streak = 0; S.save.bestStreak = 0; S.save.streakSeen = [];
    S.save.unlockedMax = D.LEVELS.length;
  }
  /* 通关一关：fast=3★ / mid=2★ / slow=1★
   * 注意 slow 必须超过 twoStarTimeFactor（1.6）才能掉到 1★：
   * 早先写的是 parTime + 30，parTime ≥ 50 时 1.6 倍还没到头，会被判成 2★。 */
  function playWin(idx, mode) {
    D.setupLevel(idx);
    const lv = lvIdx(idx);
    S.hintUsed = false;
    S.steps = 1;
    if (mode === 'fast') S.elapsed = Math.max(1, lv.parTime * 0.5);
    else if (mode === 'mid') S.elapsed = Math.max(1, lv.parTime * 0.9);
    else S.elapsed = lv.parTime * 2 + 30;
    D.win();
  }
  const wk = () => D.weekStats();

  /* ================= 1. 计分口径 ================= */
  section('1. 计分：总星数只升不降，本周星数按本次星级');
  resetSave();
  playWin(0, 'fast');
  check('首次 3★ 通关 → stars +3 / cleared +1 / 本周 +3',
    D.myStats().stars === 3 && D.myStats().cleared === 1 && wk().stars === 3,
    `stars=${D.myStats().stars} cleared=${D.myStats().cleared} week=${wk().stars}`);
  check('产生一条周星事件（uid / rev / day 齐全）',
    (S.save.weekQ || []).length === 1 && !!S.save.weekQ[0].uid &&
    S.save.weekQ[0].rev >= 1 && /^\d{4}-\d{2}-\d{2}$/.test(S.save.weekQ[0].day),
    JSON.stringify(S.save.weekQ[0] || null));

  resetSave();
  playWin(1, 'slow');                       // 1★
  check('首次 1★ → stars +1 / 本周 +1', D.myStats().stars === 1 && wk().stars === 1,
    `stars=${D.myStats().stars} week=${wk().stars}`);
  playWin(1, 'fast');                       // 同一天升到 3★
  check('重玩 1★→3★：stars 只补 +2（总 3）', D.myStats().stars === 3, 'stars=' + D.myStats().stars);
  check('重玩 1★→3★：本周按本次星级取 3（不是 1+3）', wk().stars === 3, 'week=' + wk().stars);

  playWin(1, 'mid');                        // 同一天退到 2★
  check('重玩 3★→2★（同一天）：stars 不变', D.myStats().stars === 3, 'stars=' + D.myStats().stars);
  check('重玩 3★→2★（同一天）：本周只计当天最高，仍 3', wk().stars === 3, 'week=' + wk().stars);

  /* ② 同关不同天可以累加：客户端账本按 dayKey 分桶求和，dayKey 变了就是新的一天。
   *    往账本里塞一个「不属于今天」的桶来模拟昨天（把整个 weekSeen 清空不叫换一天，
   *    那是"本周还没打过"，历史会一起丢）。单独起一段干净的账，期望值才好读。 */
  resetSave();
  wk();                                     // 先让账本对齐本周（否则下面的塞桶会被重置清掉）
  var lv2 = lvIdx(2);
  var u2 = (lv2 && (lv2.uid || String(lv2.id || ''))) || '';
  S.save.weekSeen.__prev_day__ = {};
  S.save.weekSeen.__prev_day__[u2] = 3;     // 昨天这关记过 3★
  playWin(2, 'mid');                        // 今天只打到 2★
  check('隔天重玩 2★：stars 只按本次 2 星记', D.myStats().stars === 2, 'stars=' + D.myStats().stars);
  check('隔天重玩 2★：本周累到 5（昨天 3 + 今天 2）', wk().stars === 5, 'week=' + wk().stars);
  const qBefore = (S.save.weekQ || []).length;
  playWin(2, 'fast');                       // 今天升到 3★
  check('同一天再升到 3★：本周补到 6（不是 5+3）',
    wk().stars === 6 && (S.save.weekQ || []).length === qBefore + 1,
    `week=${wk().stars} q=${(S.save.weekQ || []).length}`);

  /* ================= 2. 排序 / 名次 ================= */
  section('2. 排序键与复合名次（云函数口径）');
  check('全服榜主键 stars、次键 cleared',
    /0: \{ v: 'stars', v2: 'cleared'/.test(CFN));
  check('本周榜主键 weekStars、次键 streak、三键 weekCleared',
    /2: \{ v: 'weekStars', v2: 'streak', v3: 'weekCleared' \}/.test(CFN));
  check('名次用复合 count（主值更高 + 主值相等且次值更高）',
    /where\(\{ \[field\]: _\.gt\(mv\) \}\)\.count\(\)/.test(CFN) &&
    /\[field\]: _\.eq\(mv\), \[f2\]: _\.gt\(m2\)/.test(CFN));
  check('同分早到者靠前（updatedAt 升序兜底）',
    /a\.updatedAt \| 0\) - \(b\.updatedAt \| 0\)/.test(CFN));
  check('好友榜 tab 1 只回 note（不查库）',
    /if \(tab === 1\)[\s\S]{0,160}note: 'friend'/.test(CFN));

  /* ================= 3. 周切换 / 重置时间 ================= */
  section('3. 周切换与倒计时');
  const t0 = Date.UTC(2026, 10, 26, 4, 0, 0);          // 2026-11-26 12:00 北京时间（周四）
  check('weekKey 是 UTC+8 的 ISO 周', weekKeyOf(t0) === '2026-W48', weekKeyOf(t0));
  const ra = nextResetAt(t0);
  const rd = new Date(ra + 8 * 3600 * 1000);
  check('nextResetAt = 北京时间下周一 00:00',
    rd.getUTCDay() === 1 && rd.getUTCHours() === 0 && rd.getUTCMinutes() === 0,
    new Date(ra).toISOString());
  check('跨周时 weekKey 会变（周日 → 周一）',
    weekKeyOf(Date.UTC(2026, 10, 29, 15, 59)) !== weekKeyOf(Date.UTC(2026, 10, 29, 16, 1)),
    weekKeyOf(Date.UTC(2026, 10, 29, 15, 59)) + ' → ' + weekKeyOf(Date.UTC(2026, 10, 29, 16, 1)));

  S.save.weekWeek = '2000-W01'; S.save.weekSeen = { '2000-01-03': { x: 3 } };
  check('周切换后本地周账本归零', wk().stars === 0, 'week=' + wk().stars);

  const cd = D.rankCountdown;
  const now = Date.now();
  const cdBase = now;   // 单取一次基准：cd() 内部自己取 Date.now()，跨分钟边界才不会抖
  check('倒计时四档：≥1天', cd(now + 2 * 86400000 + 13 * 3600000 + 60000) === '距重置 2天 13小时',
    cd(now + 2 * 86400000 + 13 * 3600000 + 60000));
  check('倒计时四档：<1天', cd(cdBase + 13 * 3600000 + 42 * 60000 + 90000) === '距重置 13小时 43分',
    cd(cdBase + 13 * 3600000 + 42 * 60000 + 90000));
  check('倒计时四档：<1小时', /^距重置 42分 \d+秒$/.test(cd(now + 42 * 60000 + 18000)),
    cd(now + 42 * 60000 + 18000));
  check('倒计时四档：<1分钟 → 即将重置', cd(now + 30000) === '即将重置', cd(now + 30000));

  /* ================= 4. 三页签 / 缓存分桶 ================= */
  section('4. 三页签不串数据，周榜缓存带 weekKey');
  check('页签文案 = 全服 / 好友 / 本周', CFG.RANK.tabs.join('/') === '全服榜/好友榜/本周榜', CFG.RANK.tabs.join('/'));
  check('三榜单位都是星星', CFG.RANK.unit.join('') === '★★★', CFG.RANK.unit.join(''));
  S.rankMeta.weekKey = '2026-W48';
  check('本周榜缓存键带 weekKey', D.rankCacheKey(2) === '2:2026-W48', D.rankCacheKey(2));
  S.rankMeta.weekKey = '2026-W49';
  check('跨周后缓存键自动换桶（旧桶不再命中）', D.rankCacheKey(2) === '2:2026-W49', D.rankCacheKey(2));
  check('全服榜缓存键与周无关', D.rankCacheKey(0) === '0' && D.rankCacheKey(1) === '1');

  /* 好友榜不吃云榜缓存：把云榜塞满，切到好友榜也不该显示它 */
  S.rankCache = {};
  S.rankList = { list: [{ nick: '云端人', v: 99, v2: 33, me: false }], me: null };
  D.selectRankTab(1);
  clearRec(); step(16);
  check('好友榜不读云榜数据（不串页签）', !rec.texts.some(t => t.s === '云端人'),
    textsOf(rec.texts.filter(t => /云端/.test(t.s))));
  check('切好友榜会向开放数据域要内容', friendLog.shows.length >= 1, 'shows=' + friendLog.shows.length);
  D.selectRankTab(0);
  await sleep(8);

  /* ================= 5. 我的名次常驻卡 ================= */
  section('5.「我的名次」常驻卡三种状态');
  CFG.RANK.useMock = true;
  S.overlay = 'rank'; S.rankTab = 0; S.rankT = 999; S.rankErr = '';
  clearRec(); step(16);
  check('非前 7：给出「再得 X 星进入前 7」',
    rec.texts.some(t => /^再得 \d+ 星进入前 7$/.test(t.s)),
    textsOf(rec.texts.filter(t => /再得|已在榜上/.test(t.s))));
  const nums = rec.texts.filter(t => /^★\d+ · \d+ 关$/.test(t.s)).map(t => t.s);
  check('常驻卡右侧是「★星数 · 通关数 关」', nums.length >= 1, nums.join(','));

  /* 前 7：把自己塞进 mock 首位 */
  const keepMock = CFG.RANK.mock[0];
  CFG.RANK.mock[0] = [{ n: '巧手0921', v: 999, v2: 99, me: true }].concat(keepMock.slice(1));
  S.rankMeta.weekKey = '2026-W48';
  clearRec(); step(16);
  check('在前 7：显示「已在榜上 · 第 N 名」',
    rec.texts.some(t => /^已在榜上 · 第 1 名$/.test(t.s)),
    textsOf(rec.texts.filter(t => /已在榜上|再得/.test(t.s))));
  CFG.RANK.mock[0] = keepMock;

  /* 空榜 */
  const keepAll = JSON.parse(JSON.stringify(CFG.RANK.mock));
  CFG.RANK.mock[0] = [];
  S.rankList = null;
  clearRec(); step(16);
  check('空榜：提示「通关一关即可上榜」',
    rec.texts.some(t => t.s === '还没有人上榜') &&
    rec.texts.some(t => /通关一关即可上榜/.test(t.s)),
    textsOf(rec.texts.filter(t => /上榜|还没有/.test(t.s))));
  CFG.RANK.mock = keepAll;
  CFG.RANK.useMock = false;
  S.overlay = null;

  /* ================= 6. 好友榜 KV / 名次回传 ================= */
  section('6. 好友榜：KV v2 + 名次回传');
  const frSrc = fs.readFileSync(path.join(ROOT, 'miniprogram/js/friendrank.js'), 'utf8');
  const odcSrc = fs.readFileSync(path.join(ROOT, 'miniprogram/openDataContext/index.js'), 'utf8');
  check('主域发布 v2 键并带 stars / weekStars',
    /KV = 'tangram_v2'/.test(frSrc) && /stars: Math\.max/.test(frSrc) && /weekStars: Math\.max/.test(frSrc));
  check('开放数据域 v2 优先、旧键兜底',
    /KEY = 'tangram_v2'/.test(odcSrc) && /KEY_OLD = 'tangram'/.test(odcSrc) &&
    /keyList: \[KEY, KEY_OLD\]/.test(odcSrc));
  check('只画 7 行、不顶掉第 7 名', !/list\.push\(rows\[i\]\)/.test(odcSrc) && /rows\.slice\(0, L\.rows\)/.test(odcSrc));
  check('画完回传名次（friendRank）', /postMessage\(\{[\s\S]{0,120}type: 'friendRank'/.test(odcSrc));
  check('主域注册了名次回传回调', friendLog.rankCbs.length >= 1, 'cbs=' + friendLog.rankCbs.length);
  /* 名次回传只在好友榜开着时落地：切走以后迟到的响应丢弃，避免串到别的页签 */
  S.rankTab = 1;
  D.applyFriendRankInfo({ myRank: 5, myStars: 42, total: 9 });
  check('回传后记进 state（供常驻卡用）',
    S.friendRankInfo && S.friendRankInfo.myRank === 5, JSON.stringify(S.friendRankInfo));
  D.selectRankTab(0);
  D.applyFriendRankInfo({ myRank: 9, myStars: 1, total: 9 });
  check('切走后迟到的回传被丢弃', S.friendRankInfo.myRank === 5, JSON.stringify(S.friendRankInfo));

  /* ================= 7. 防刷 ================= */
  section('7. 防刷上限');
  check('stars ≤ 300 / cleared ≤ 120', /MAX_STARS = 300/.test(CFN) && /MAX_CLEARED = 120/.test(CFN));
  check('周星单条只收 1~3 星', /if \(stars < 1 \|\| stars > 3\) return \{ delta: 0/.test(CFN));
  check('单日周星增量 ≤ 60', /WEEK_DAY_MAX = 60/.test(CFN) && /dayGain > WEEK_DAY_MAX/.test(CFN));
  check('只认当天事件（补刷历史不收）', /day !== dayKeyCN\(Date\.now\(\)\)/.test(CFN));
  check('去重键 openid+uid+rev+day（同键二次上报幂等）',
    /const _id = openid \+ '\|' \+ uid \+ '\|' \+ rev \+ '\|' \+ day/.test(CFN) &&
    /if \(stars <= prev\) return \{ delta: 0, fresh: false \}/.test(CFN));

  /* ================= 8. uid 跟关卡走 ================= */
  section('8. 周星归属跟「关卡」不跟「关号」');
  resetSave();
  const lv1 = lvIdx(3);
  const oldUid = lv1.uid;
  lv1.uid = 't7-injected';                  // 模拟插队后新关拿到独立 uid
  playWin(3, 'fast');
  check('事件 uid 取关卡自带的 uid', (S.save.weekQ[0] || {}).uid === 't7-injected',
    JSON.stringify((S.save.weekQ[0] || {}).uid));
  check('存档仍按关号记星（插队由 lvSig 名字迁移兜底，老玩家不掉星）',
    S.save.starOf[String(4)] === 3 && !!S.save.lvSig, 'k4=' + S.save.starOf['4']);
  if (oldUid === undefined) delete lv1.uid; else lv1.uid = oldUid;

  check('版本号 = v0.65', CFG.version === 'v0.65', CFG.version);

  /* ================= 9. 三端一致 ================= */
  section('9. 三端模块一致');
  const strip = f => require('./lib/pack.js').strip(fs.readFileSync(f, 'utf8'));
  for (const m of ['config', 'core']) {
    const a = crypto.createHash('md5').update(strip(path.join(ROOT, `js/${m}.js`))).digest('hex');
    const b = crypto.createHash('md5').update(strip(path.join(ROOT, `preview/js/${m}.js`))).digest('hex');
    const c = crypto.createHash('md5').update(strip(path.join(ROOT, `miniprogram/js/${m}.js`))).digest('hex');
    check(m + '.js 三端一致', a === b && b === c, a.slice(0, 8));
  }
  check('开放数据域版式常数与 config.RANK.list 一致',
    (() => {
      const m = odcSrc.match(/var L = \{ w: (\d+), h: (\d+), rowH: (\d+), step: (\d+), rows: (\d+)/);
      const L = CFG.RANK.list;
      return !!m && +m[1] === L.w && +m[2] === L.h && +m[3] === L.rowH && +m[4] === L.step && +m[5] === L.rows;
    })());

  console.log(`\n${fail ? '!! ' + fail + ' 项未通过' : 'v0.65 验收全部通过'}（通过 ${ok} 项，失败 ${fail} 项）`);
  process.exit(fail ? 1 : 0);
})();
