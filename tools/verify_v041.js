/* v0.41 专项验收：邀请有礼「累计人数 + 8 档阶梯」+ 星级补差价数值修正
 * 用法：node tools/verify_v041.js
 *
 * 用户这一版的需求原文：
 *   「邀请这里需要去掉每日一次的限制，改为可以累计邀请的好友计数，但是邀请的好友
 *     需要满足完成游戏任意四关才会被计数。设置邀请好友人数阶梯奖励，邀请1人获得
 *     30巧币+1个查找道具，邀请2人20体力+霓虹板件，邀请3人水晶板件+泡泡漂浮背景，
 *     邀请4人1查找道具+10体力，邀请5人马卡龙板件+10体力，邀请6人1查找道具+50巧币，
 *     邀请7人1查找道具+花瓣飘落，邀请8人荧光板件+1查找道具」
 *   「另外需要调整的是你上一轮修改把巧币进帐数量搞错了我纠正一下：
 *     1星玩到2星1巧币。2星玩到3星2巧币。1星玩到3星3巧币。」
 *
 * 断言口径：
 *   A. 星级：starReward = [2,3,5]（累计总额，v0.43 回正），逐级差价 1 / 2，跨级 3，每关封顶 5；
 *   B. 邀请：不再限每日一次、分享当场不发奖、每次分享压一张「待确认邀请」；
 *   C. 判定：待确认的邀请必须满足「好友完成 4 关」才计入（本地按 verifySec 模拟，
 *      宿主 env.invite.confirmed 优先）；
 *   D. 阶梯：8 档人数/奖励逐项对照用户清单，自动发放且每档只发一次；
 *   E. 体力奖励允许溢出上限；板件 / 背景走全局解锁表；
 *   F. 面板：8 行阶梯、「已领取 / 还差 N 人」状态、累计人数展示；
 *   G. 红点：有「已完成但没去看」的邀请时亮，结算后灭；
 *   H. 三端一致 + 主包 < 4MB。
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');

const rec = { texts: [] };
function makeCtx() {
  const grad = { addColorStop() {} };
  const base = {
    canvas: { width: 0, height: 0, style: {} },
    globalAlpha: 1,
    measureText(s) { return { width: String(s).length * 15 }; },
    createLinearGradient: () => grad, createRadialGradient: () => grad, createPattern: () => null,
    fillText(s, x, y) { rec.texts.push({ s: String(s), x, y, fill: String(base.fillStyle) }); },
    fill() {}, fillRect() {}, stroke() {}, arc() {}, moveTo() {}, lineTo() {}, strokeRect() {},
    setLineDash() {}, save() {}, restore() {}, beginPath() {}, closePath() {}, arcTo() {},
    bezierCurveTo() {}, quadraticCurveTo() {}, rect() {}, translate() {},
    rotate() {}, scale() {}, clip() {}, drawImage() {}, setTransform() {},
    clearRect() {}, ellipse() {}
  };
  return new Proxy(base, { get(t, k) { return k in t ? t[k] : () => {}; }, set(t, k, v) { t[k] = v; return true; } });
}

let pendingFrame = null;
let clock = 0;
global.requestAnimationFrame = cb => { pendingFrame = cb; return 1; };
function step(ms) { clock += (ms || 16); const cb = pendingFrame; pendingFrame = null; if (cb) cb(clock); }

require(path.join(ROOT, 'js/levels.js'));
require(path.join(ROOT, 'js/geom.js'));
require(path.join(ROOT, 'js/judge.js'));
const CFG = require(path.join(ROOT, 'js/config.js'));
const CORE = require(path.join(ROOT, 'js/core.js'));

let fail = 0, total = 0;
function check(label, ok, detail) {
  total++;
  if (!ok) fail++;
  console.log(`  [${ok ? 'OK' : 'XX'}] ${label}${detail ? '  ' + detail : ''}`);
}
function section(t) { console.log('\n== ' + t + ' =='); }

const store = {};
const env = {
  ctx: makeCtx(), tutorial: false,
  size: () => ({ w: 375, h: 812 }), dpr: () => 3,
  safeInsets: () => ({ top: 20, bottom: 0 }),
  bindInput(fn) { env._in = fn; },
  storage: { get: k => (k in store ? store[k] : null), set: (k, v) => { store[k] = v; } },
  audio: { unlock() {}, setEnabled() {}, play() {}, duck() {}, setVisible() {}, setScene() {},
    setSfxStyle() {} },
  vibrate() {}, images: {}, onHide() {}, onShow() {}, share() {}
};

const game = CORE(env);
game.init();
step();
const S = game.state, D = game._debug;
const V = CFG.INVITE, E = CFG.ECON;

/* ================= 1. 星级数值（v0.43 回正到 2/3/5） ================= */
section('1. 星级累计总额：1★2 / 2★3 / 3★5');
check('starReward = [2,3,5]（累计总额）',
  JSON.stringify(E.starReward) === '[2,3,5]', JSON.stringify(E.starReward));
check('逐级差价 1★→2★ = 1', E.starReward[1] - E.starReward[0] === 1,
  String(E.starReward[1] - E.starReward[0]));
check('逐级差价 2★→3★ = 2', E.starReward[2] - E.starReward[1] === 2,
  String(E.starReward[2] - E.starReward[1]));
check('跨级 1★→3★ = 3（= 1+2）', E.starReward[2] - E.starReward[0] === 3,
  String(E.starReward[2] - E.starReward[0]));

function setLv(idx, stars, paid) {
  const k = String(idx + 1);
  if (stars > 0) {
    S.save.starOf[k] = stars;
    S.save.starPaid[k] = (typeof paid === 'number') ? paid : E.starReward[stars - 1];
  } else { delete S.save.starOf[k]; delete S.save.starPaid[k]; }
}
function playWin(idx, stars) {
  const L = D.LEVELS[idx];
  D.setupLevel(idx);
  S.hintUsed = false;
  if (stars === 3) { S.elapsed = 0; S.steps = 0; }
  else if (stars === 2) { S.elapsed = L.parTime * 1.2; S.steps = 999; }
  else { S.elapsed = L.parTime * 6; S.steps = 999; }
  const c0 = S.save.coin;
  D.win();
  return S.save.coin - c0;
}

setLv(0, 1, 2);
let g = playWin(0, 2);
check('1★ → 2★ 补 +1 巧币', g === 1, '+' + g);
g = playWin(0, 3);
check('2★ → 3★ 补 +2 巧币', g === 2, '+' + g);
g = playWin(0, 3);
check('已 3★ 重打 → +0', g === 0, '+' + g);

setLv(0, 1, 2);
g = playWin(0, 3);
check('1★ 直接打回 3★ 补 +3 巧币', g === 3, '+' + g);
check('每关封顶 5', S.save.starPaid['1'] === 5, String(S.save.starPaid['1']));

setLv(0, 0);
g = playWin(0, 3);
check('首通 3★ 就是 5（2 + 3 的累计总额）', g === 5, '+' + g);

/* ================= 2. 邀请配置 ================= */
section('2. 邀请配置：8 档与用户清单逐项对齐');
const WANT = [
  { n: 1, coin: 30, hint: 1 },
  { n: 2, energy: 20, pstyle: 'neon' },
  { n: 3, pstyle: 'crystal', bgfx: 'bubbles' },
  { n: 4, hint: 1, energy: 10 },
  { n: 5, pstyle: 'pastel', energy: 10 },
  { n: 6, hint: 1, coin: 50 },
  { n: 7, hint: 1, bgfx: 'petals' },
  { n: 8, pstyle: 'glow', hint: 1 }
];
check('共 8 档', V.tiers.length === 8, String(V.tiers.length));
check('好友需完成 4 关才计数', V.needCleared === 4, String(V.needCleared));
check('旧的每日 +20 巧币 / +1 道具配置已下线',
  E.inviteCoin === undefined && E.inviteHint === undefined,
  E.inviteCoin + '/' + E.inviteHint);
WANT.forEach(function (w) {
  const t = V.tiers[w.n - 1] || {};
  const same = t.n === w.n && t.coin === w.coin && t.energy === w.energy &&
    t.hint === w.hint && t.pstyle === w.pstyle && t.bgfx === w.bgfx;
  check(`第 ${w.n} 档：${t.label || '缺失'}`, same, JSON.stringify(t));
});

/* ================= 3. 分享不再限每日一次 ================= */
section('3. 分享：不当场发奖、不限次数');
S.save.inviteCount = 0; S.save.invitePend = []; S.save.inviteGot = [];
S.save.coin = 100; S.save.hintItems = 0;
S.inviteCd = 0;
D.doInviteShare();
check('分享后只多一张待确认邀请',
  S.save.invitePend.length === 1 && S.save.coin === 100 && S.save.hintItems === 0,
  `pend=${S.save.invitePend.length} coin=${S.save.coin} items=${S.save.hintItems}`);
check('toast 说明「完成 4 关后计入」', S.toast && /完成 4 关/.test(S.toast.text),
  S.toast && S.toast.text);
S.inviteCd = 0;
D.doInviteShare();
S.inviteCd = 0;
D.doInviteShare();
check('同一天连发 3 次都收下（不再有每日 1 次）', S.save.invitePend.length === 3,
  'pend=' + S.save.invitePend.length);
S.inviteCd = Date.now() + 1000;
D.doInviteShare();
check('冷却期内连点不再加券', S.save.invitePend.length === 3, 'pend=' + S.save.invitePend.length);
S.inviteCd = 0;

/* ================= 4. 「完成 4 关」的判定 ================= */
section('4. 判定：好友完成 4 关才计数');
S.save.invitePend = [Date.now()];          // 刚发出，未到时间
let r = D.inviteVerify();
check('刚发出的邀请不计数', r.added === 0 && S.save.inviteCount === 0,
  `added=${r.added} count=${S.save.inviteCount}`);
S.save.invitePend = [Date.now() - (V.verifySec + 1) * 1000];   // 已过等待期
r = D.inviteVerify();
check('等待期满 → 计入 1 人', r.added === 1 && S.save.inviteCount === 1,
  `added=${r.added} count=${S.save.inviteCount}`);
check('待确认队列清空', S.save.invitePend.length === 0, 'pend=' + S.save.invitePend.length);

/* 宿主钩子优先：即使时间没到，只要宿主说完成了也计数 */
env.invite = { confirmed: function () { return true; } };
S.save.invitePend = [Date.now()];
r = D.inviteVerify();
check('宿主 env.invite.confirmed 优先于本地计时', r.added === 1 && S.save.inviteCount === 2,
  `added=${r.added} count=${S.save.inviteCount}`);
delete env.invite;
S.inviteCd = 0;

/* ================= 5. 8 档阶梯逐档发放 ================= */
section('5. 阶梯奖励：逐档对照清单');
S.save.inviteCount = 0; S.save.inviteGot = []; S.save.invitePend = [];
S.save.coin = 100; S.save.hintItems = 0;
S.save.energy = 16; S.save.energyMax = 16;          // 满体力，验证 20 点能溢出
delete store[D.shopKey];

const coinBase = S.save.coin, hintBase = S.save.hintItems, energyBase = S.save.energy;
let coinAcc = 0, hintAcc = 0, energyAcc = 0;
WANT.forEach(function (w, i) {
  S.save.invitePend = [Date.now() - (V.verifySec + 1) * 1000];
  const rr = D.inviteVerify();
  coinAcc += (w.coin || 0); hintAcc += (w.hint || 0); energyAcc += (w.energy || 0);
  const okCoin = S.save.coin === coinBase + coinAcc;
  const okHint = S.save.hintItems === hintBase + hintAcc;
  const okEnergy = S.save.energy === energyBase + energyAcc;
  const okStyle = !w.pstyle || D.ownsItem('pstyle', w.pstyle);
  const okBg = !w.bgfx || D.ownsItem('bgfx', w.bgfx);
  check(`邀请 ${w.n} 人 → ${V.tiers[w.n - 1].label}`,
    rr.added === 1 && rr.tiers.length === 1 && okCoin && okHint && okEnergy && okStyle && okBg,
    `coin=${S.save.coin} energy=${S.save.energy} items=${S.save.hintItems}`);
});
check('8 档发完，人数 = 8', S.save.inviteCount === 8, String(S.save.inviteCount));
check('巧币累计 +80（30 + 50）', S.save.coin === coinBase + 80, '+' + (S.save.coin - coinBase));
check('查找道具累计 +5', S.save.hintItems === hintBase + 5, '+' + (S.save.hintItems - hintBase));
check('体力累计 +40 且溢出上限（16 → 56）', S.save.energy === 56, String(S.save.energy));

/* 再确认一次不会重复发 */
const coinAfter = S.save.coin;
S.save.invitePend = [Date.now() - (V.verifySec + 1) * 1000];
r = D.inviteVerify();
check('第 9 位不发奖励（已满 8 档）', r.tiers.length === 0 && S.save.coin === coinAfter,
  'tiers=' + r.tiers.length + ' coin=' + S.save.coin);
check('人数继续累计（只计数不发奖）', S.save.inviteCount === 9, String(S.save.inviteCount));

/* ================= 6. 真实入口链路 ================= */
section('6. 点主页入口：先结算再开面板');
S.page = 'home'; S.overlay = null; S.fade = 1; S.pageT = 9999;
S.save.inviteCount = 0; S.save.inviteGot = []; S.save.coin = 100; S.save.hintItems = 0;
S.save.invitePend = [Date.now() - (V.verifySec + 1) * 1000];
step(16);                       // 先渲染一帧主页，把入口热区生成出来
D.fireBtn('entry_invite');
check('打开面板即结算：人数 +1、第 1 档到账',
  S.overlay === 'invite' && S.save.inviteCount === 1 && S.save.coin === 130 &&
  S.save.hintItems === 1,
  `overlay=${S.overlay} count=${S.save.inviteCount} coin=${S.save.coin} items=${S.save.hintItems}`);
check('结算后的邀请不再挂在待确认队列', S.save.invitePend.length === 0,
  'pend=' + S.save.invitePend.length);

/* ================= 7. 面板渲染 ================= */
section('7. 面板：奖励图标化 + 进度条 + 8 行阶梯');
S.save.inviteCount = 3; S.save.inviteGot = [1, 2, 3]; S.save.invitePend = [];
S.page = 'home'; S.overlay = 'invite'; S.fade = 1; S.pageT = 9999;
S.inviteScroll = 0;
rec.texts.length = 0;
step(16);
const tx = rec.texts.map(t => t.s);
check('顶部显示累计人数与总进度',
  tx.some(s => /已邀请 3 人 · 已完成 3\/8 档/.test(s)),
  tx.filter(s => /已邀请/.test(s)).join('|'));
check('行标写「累计邀请 N 人进入游戏」',
  [1, 2, 3].every(n => tx.indexOf('累计邀请 ' + n + ' 人进入游戏') >= 0),
  tx.filter(s => /累计邀请/.test(s)).join('|'));
/* v0.42 核心：奖励一律图标 + ×数量，不再出现文字描述 */
check('奖励文案全部换成图标（label 一个都不出现）',
  V.tiers.every(t => tx.every(s => s.indexOf(t.label) < 0)),
  V.tiers.filter(t => tx.some(s => s.indexOf(t.label) >= 0)).map(t => t.label).join('|'));
check('图标下方写 ×数量（30 / 1 都有）',
  tx.indexOf('×30') >= 0 && tx.indexOf('×1') >= 0,
  tx.filter(s => /^×/.test(s)).join('|'));
check('进度条写「已/需」（1/1 与 3/4）',
  tx.indexOf('1/1') >= 0 && tx.indexOf('3/4') >= 0,
  tx.filter(s => /^\d+\/\d+$/.test(s)).join('|'));
check('已领的三档写「已领取」', tx.filter(s => s === '已领取').length === 3,
  String(tx.filter(s => s === '已领取').length));
check('未达标的行给「邀请」按钮', tx.filter(s => s === '邀请').length >= 3,
  String(tx.filter(s => s === '邀请').length));

/* v0.42：一屏放不下 → 必须能滑；滑到底第 8 档才出现 */
check('内容比视口高，需要滑动', S.inviteScrollMax > 0, String(S.inviteScrollMax));
check('未滑动时第 8 档不在视野', tx.indexOf('累计邀请 8 人进入游戏') < 0,
  tx.filter(s => /累计邀请 8/.test(s)).join('|'));
D.setInviteScroll(99999);
rec.texts.length = 0;
step(16);
const tx2 = rec.texts.map(t => t.s);
check('滑到底后第 8 档出现', tx2.indexOf('累计邀请 8 人进入游戏') >= 0,
  tx2.filter(s => /累计邀请/.test(s)).join('|'));
check('滑到底后第 1 档滚出视野', tx2.indexOf('累计邀请 1 人进入游戏') < 0,
  tx2.filter(s => /累计邀请/.test(s)).join('|'));
check('滚动量夹在最大值上（不会拉飞）', S.inviteScroll === S.inviteScrollMax,
  S.inviteScroll + '/' + S.inviteScrollMax);

/* ================= 8. 红点 ================= */
section('8. 主页红点：有新完成的邀请才亮');
S.overlay = null; S.page = 'home';
S.save.invitePend = [Date.now()];
check('刚发出、好友还没打完 → 不亮', D.inviteHasNews() === false, String(D.inviteHasNews()));
S.save.invitePend = [Date.now() - (V.verifySec + 1) * 1000];
check('好友已完成 4 关 → 亮红点', D.inviteHasNews() === true, String(D.inviteHasNews()));
D.inviteVerify();
check('打开面板结算后红点灭', D.inviteHasNews() === false, String(D.inviteHasNews()));

/* ================= 9. 三端一致 / 包体 ================= */
section('9. 三端同步与包体积');
const md5 = p => crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex');
['config.js', 'core.js'].forEach(function (f) {
  const a1 = md5(path.join(ROOT, 'js', f));
  const p1 = md5(path.join(ROOT, 'preview/js', f));
  const m1 = md5(path.join(ROOT, 'miniprogram/js', f));
  check(`${f} 三端逐字节一致`, a1 === p1 && a1 === m1,
    a1.slice(0, 8) + '/' + p1.slice(0, 8) + '/' + m1.slice(0, 8));
});
function dirSize(d) {
  let t = 0;
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    t += f.isDirectory() ? dirSize(p) : fs.statSync(p).size;
  }
  return t;
}
const mb = dirSize(path.join(ROOT, 'miniprogram')) / 1048576;
check('主包 < 4MB', mb < 4, mb.toFixed(2) + 'MB');

console.log(`\n${total - fail}/${total} 项通过${fail ? '，' + fail + ' 项失败' : ''}`);
process.exit(fail ? 1 : 0);
