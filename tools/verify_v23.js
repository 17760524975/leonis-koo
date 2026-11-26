/* v0.23 专项验收：经济再平衡（方案 C，不含"巧币买体力"）
 * 用法：node tools/verify_v23.js
 *
 * 用户这版需求原文：
 *   「按照方案C做结构性调整，让整个系统巧币获取和使用都合理，但暂时不出通过巧币购买体力的方案。
 *     1、看广告复活不给巧币。
 *     2、通关奖励首通才会有奖励（一星给2巧币，二星给3巧币，3星给5巧币）然后也可在通关页面
 *        点击看视频得到翻5倍奖励，只作用当前通关奖励，下一关要翻倍需要再次观看视频，
 *        重复通关不消耗体力也不给巧币奖励。
 *     3、看广告复活每关不设上限，可以多次看视频复活，取消最多两次。
 *     4、初始发放改为50巧币。」
 *
 * 拆成可断言的口径：
 *   ① 广告复活：巧币不变（旧版 +90），且不再有每关 2 次上限
 *   ② 首通奖励：v0.23 时 1★=2 / 2★=3 / 3★=5；v0.40 起改为
 *      累计总额 21/32/53 + 「升星补差价」（本脚本的金额断言已同步到 v0.40）
 *   ③ 结算页 ×5：只作用于当次（adUsed 一次即锁），再点不再给
 *   ④ 初始 50 巧币；连带把提示 40→30、巧币复活 100→80
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
function md5(p) { var __s = p; return require('crypto').createHash('md5').update(/\.js$/i.test(String(__s)) ? Buffer.from(require('./lib/pack.js').strip(require('fs').readFileSync(__s, 'utf8'))) : require('fs').readFileSync(__s)).digest('hex'); }

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

/* 渲染一帧结算页并抓文字 */
function resultTexts(S, D) {
  S.overlay = 'result'; S.resT = 2000; S.starShown = 3;
  rec.texts.length = 0;
  step(16);
  return rec.texts.map(t => t.s);
}

(async function main() {
  console.log('v0.23 验收：经济再平衡（首通奖励 / ×5 / 复活不限次 / 初始 50）');
  const game = CORE(env);
  game.init();
  step(16);
  const S = game.state, D = game._debug, E = CFG.ECON, H = CFG.HINT;

  /* ================= 1. 配置 ================= */
  section('1. 版本与数值配置');
  check('版本 v0.23 起（v0.24 继续沿用本版规则）', /^v0\.\d+(\.\d+)?$/.test(CFG.version), CFG.version);
  check('初始巧币 50（旧版 120）', E.coinInit === 50, String(E.coinInit));
  /* v0.40：奖励从「单次 2/3/5」改为「累计总额」；v0.41 又把逐级差价改成 1 / 2。
   * 具体数字由 verify_v041 断言，这里只保证「总额制」这套结构还在。 */
  check('星级奖励改成累计总额表（3 档、递增）',
    Array.isArray(E.starReward) && E.starReward.length === 3 &&
    E.starReward[0] < E.starReward[1] && E.starReward[1] < E.starReward[2],
    JSON.stringify(E.starReward));
  /* v0.59：用户要求「通关后看视频奖励翻十倍」—— 倍率 5 → 10，按钮文案改「10倍奖励」 */
  check('结算页倍率 = 10（v0.59：5 → 10）', E.coinWinAdMul === 10, String(E.coinWinAdMul));
  check('巧币复活 80（旧版 100）', E.coinRevive === 80, String(E.coinRevive));
  check('提示 30（旧版 40）', H.coinCost === 30, String(H.coinCost));
  check('复活次数上限字段已移除', E.reviveMaxPerLevel === undefined, String(E.reviveMaxPerLevel));
  check('旧的 coinClear / coinClear3Star 已下线',
    E.coinClear === undefined && E.coinClear3Star === undefined,
    E.coinClear + '/' + E.coinClear3Star);
  check('「体力出口」没有顺手加进来（E.energyBuy 不存在）', E.energyBuy === undefined,
    String(E.energyBuy));

  /* ================= 2. 首通奖励按星级 ================= */
  section('2. 首通奖励：1★21 / 2★32 / 3★53（v0.40 总额制）');
  D.go('play');
  const L0 = D.LEVELS[0];
  const cases = [
    { stars: 3, elapsed: 0, steps: 0 },
    { stars: 2, elapsed: L0.parTime * 1.2, steps: 999 },
    { stars: 1, elapsed: L0.parTime * 6, steps: 999 }
  ];
  for (const c of cases) {
    delete S.save.starOf['1'];
    S.save.streak = 0; S.save.streakSeen = [];
    D.setupLevel(0);
    const c0 = S.save.coin;
    S.elapsed = c.elapsed; S.steps = c.steps; S.hintUsed = false;
    D.win();
    const want = E.starReward[c.stars - 1];
    check(`${c.stars}★ 首通 → +${want} 巧币`,
      S.result.stars === c.stars && S.result.first === true && S.save.coin - c0 === want,
      `stars=${S.result.stars} first=${S.result.first} +${S.save.coin - c0}`);
  }

  /* ================= 3. 重复通关 ================= */
  section('3. 重复通关：0 奖励、first=false');
  /* v0.40：星级与「已发金额」要一起置满 —— 只改 starOf 会被判成「升星补差」，
   * 那正是新逻辑该做的事，但这里要测的是「重复通关 0 奖励」 */
  S.save.starOf['1'] = 3;
  S.save.starPaid['1'] = E.starReward[2];
  S.save.streak = 0; S.save.streakSeen = [];
  D.setupLevel(0);
  const cRep = S.save.coin;
  S.elapsed = 0; S.steps = 0;
  D.win();
  check('已 3★ 的关再通关 → +0 巧币（总额已领满）', S.save.coin - cRep === 0 && S.result.gain === 0,
    `+${S.save.coin - cRep} gain=${S.result.gain}`);
  check('结果里标记为非首通', S.result.first === false, String(S.result.first));

  /* ================= 4. 结算页 ×5 ================= */
  section('4. 结算页「看视频 ×5」只作用于当次');
  delete S.save.starOf['1'];
  S.save.streak = 0; S.save.streakSeen = [];
  D.setupLevel(0);
  const cWin = S.save.coin;
  S.elapsed = 0; S.steps = 0;
  D.win();
  const gain0 = S.result.gain, cAfterWin = S.save.coin;
  check('首通落账 +' + gain0 + ' 巧币', cAfterWin - cWin === gain0, `+${cAfterWin - cWin}`);

  let tx = resultTexts(S, D);
  /* v0.35：奖励条后面接了「· 本关视频 N/3」，用前缀匹配，别再锁死整句 */
  check('结算页显示「首通奖励 +' + gain0 + ' 巧币」',
    tx.some(s => s.indexOf('首通奖励 +' + gain0 + ' 巧币') >= 0), tx.filter(s => /首通/.test(s)).join('|'));
  check('结算页出现「' + E.coinWinAdMul + '倍奖励」按钮（图标 + 文案）',
    tx.indexOf(E.coinWinAdMul + '倍奖励') >= 0, tx.filter(s => /倍奖励/.test(s)).join('|'));
  check('翻倍前没有「已领」标', !tx.some(s => /已领/.test(s)), tx.filter(s => /已领/.test(s)).join('|'));

  const cBeforeAd = S.save.coin;
  D.fireBtn('win_ad5');
  check('广告回调 kind=coin5', adLog.rewarded.indexOf('coin5') >= 0, adLog.rewarded.join(','));
  check('×' + E.coinWinAdMul + ' → 补发 ' + (E.coinWinAdMul - 1) + ' 倍差额（+' + (gain0 * (E.coinWinAdMul - 1)) + '）',
    S.save.coin - cBeforeAd === gain0 * (E.coinWinAdMul - 1),
    `+${S.save.coin - cBeforeAd}`);
  check('总到账 = 首通 ×' + E.coinWinAdMul, S.save.coin - cWin === gain0 * E.coinWinAdMul,
    `+${S.save.coin - cWin} / want ${gain0 * E.coinWinAdMul}`);
  check('result.adUsed 被锁住', S.result.adUsed === true, String(S.result.adUsed));

  tx = resultTexts(S, D);
  check('翻倍后文案变成「首通奖励 +' + (gain0 * E.coinWinAdMul) + ' 巧币」',
    tx.some(s => s.indexOf('首通奖励 +' + gain0 * E.coinWinAdMul + ' 巧币') >= 0),
    tx.filter(s => /首通/.test(s)).join('|'));
  check('翻倍后按钮消失、文案改「已翻 ' + E.coinWinAdMul + ' 倍」',
    tx.indexOf(E.coinWinAdMul + '倍奖励') < 0 && tx.some(s => new RegExp('已翻 ' + E.coinWinAdMul + ' 倍').test(s)),
    tx.filter(s => /已翻|看视频/.test(s)).join('|'));

  const cAgain = S.save.coin;
  D.fireBtn('win_ad5');
  check('再点同一关的 ×5 不再发奖', S.save.coin === cAgain, `+${S.save.coin - cAgain}`);

  /* 下一关是新的 result，需要重新点 —— 用「换关后 adUsed 归零」验证 */
  D.setupLevel(1);
  S.elapsed = 0; S.steps = 0;
  D.win();
  check('下一关的 ×5 是独立的一次（adUsed 重新为 false）',
    S.result.first === true && S.result.adUsed === false, 'adUsed=' + S.result.adUsed);

  /* ================= 5. 重复通关的结算文案 ================= */
  section('5. 重复通关不给「看视频」入口');
  S.save.starOf['2'] = 3;
  D.setupLevel(1);
  S.elapsed = 0; S.steps = 0;
  D.win();
  tx = resultTexts(S, D);
  /* v0.40：文案改成「已通过 · 星级未提升，无奖励」（升星补差也有进账，不能一律说无奖励） */
  check('文案写「已通过 · 星级未提升，无奖励」',
    tx.some(s => s.indexOf('已通过 · 星级未提升') >= 0), tx.filter(s => /已通过/.test(s)).join('|'));
  check('重复通关没有「看视频」按钮', tx.indexOf(E.coinWinAdMul + '倍奖励') < 0,
    tx.filter(s => /看视频/.test(s)).join('|'));

  /* ================= 6. 广告复活：不给币、不限次 ================= */
  section('6. 广告复活：不给巧币、不设次数上限');
  D.setupLevel(0);
  S.page = 'play'; S.overlay = null; S.win = null;
  S.save.coin = 300;
  S.save.streak = 0; S.save.streakSeen = [];
  const cAd = S.save.coin;
  S.timeLeft = 0.004; step(20);
  check('时间归零 → 失败弹窗', S.overlay === 'fail', 'overlay=' + S.overlay);
  D.doRevive(true);
  check('广告复活：巧币一分不给（旧版 +90）', S.save.coin === cAd, `${cAd}→${S.save.coin}`);
  check('广告复活：时间补回、弹窗关闭', S.timeLeft > 0 && S.overlay === null,
    'left=' + S.timeLeft.toFixed(1));

  for (let i = 0; i < 6; i++) {
    S.timeLeft = 0.004; step(20);
    D.doRevive(true);
  }
  check('连看 7 次广告复活都成功（旧版第 3 次就被拦）',
    S.reviveUsed === 7 && S.overlay === null && S.running === true,
    'used=' + S.reviveUsed + ' overlay=' + S.overlay);
  check('巧币复活价 80 生效',
    (() => {
      S.timeLeft = 0.004; step(20);
      const c1 = S.save.coin;
      D.doRevive(false);
      return c1 - S.save.coin === 80;
    })(), 'coin=' + S.save.coin);

  /* ================= 7. 重复通关不扣体力 ================= */
  section('7. 体力：重复通关不收门票');
  S.save.unlockedMax = 30;
  S.save.energy = 10; S.save.energyMax = 16; S.save.energyTs = Date.now();
  S.page = 'levels'; S.overlay = null; S.win = null;
  S.save.starOf['1'] = 3;
  D.fireBtn('lvl_1');
  check('已通关的关重玩 → 体力不变', S.save.energy === 10, 'energy=' + S.save.energy);

  S.page = 'levels'; S.overlay = null;
  delete S.save.starOf['3'];
  S.save.energy = 10; S.save.energyTs = Date.now();
  D.fireBtn('lvl_3');
  check('没通关的关进入 → 扣 2 点', S.save.energy === 8, 'energy=' + S.save.energy);

  /* ================= 8. 三端一致 + 主包 ================= */
  section('8. 三端一致性与包体积');
  let same = true, bad = [];
  for (const m of ['config', 'core', 'geom', 'judge', 'levels']) {
    const a = md5(path.join(ROOT, 'js', m + '.js'));
    const b = md5(path.join(ROOT, 'preview/js', m + '.js'));
    const c = md5(path.join(ROOT, 'miniprogram/js', m + '.js'));
    if (a !== b || a !== c) { same = false; bad.push(m); }
  }
  check('五个模块三端 md5 一致', same, bad.join(',') || 'all same');

  let bytes = 0;
  (function walk(dir) {
    for (const f of fs.readdirSync(dir)) {
      if (f === '.git' || f === 'node_modules') continue;
      const p = path.join(dir, f);
      const st = fs.statSync(p);
      if (st.isDirectory()) walk(p); else bytes += st.size;
    }
  })(path.join(ROOT, 'miniprogram'));
  check('主包 < 4MB', bytes < 4 * 1024 * 1024, (bytes / 1048576).toFixed(2) + 'MB');

  console.log(fail ? `\n!! ${fail} 项未通过` : '\nv0.23 经济再平衡验收全部通过');
  process.exit(fail ? 1 : 0);
})();
