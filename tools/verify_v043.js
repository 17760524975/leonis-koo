/* v0.43 专项验收：星级奖励口径回正（1★2 / 2★3 / 3★5，每关封顶 5）
 *               + 结算页去掉「补差」与「本关视频 x/3」
 * 用法：node tools/verify_v043.js
 *
 * 用户这一版的需求原文：
 *   「巧币进帐很有问题啊，我本来关卡设定通关 1 星获得 2 巧币，2 星获取 3 巧币，
 *     3 星获得 5 巧币，也就是我没关卡在不使用看视频翻倍的情况最多只能得到 5 巧币，
 *     所以我在继续玩没有满星的关卡时也只能在完成对应的星级情况下加上得到的差价，
 *     但是也不能超过 5。这里的提示去掉补差的说法和本关视频 3/3 的字样。」
 *
 * 断言口径：
 *   A. 配置：starReward = [2,3,5]（累计总额），每关封顶 5；不再有 21/22/24 的错值；
 *   B. 首通 1★/2★/3★ 分别进账 2 / 3 / 5；
 *   C. 升星补差价 1★→2★ +1、2★→3★ +2、1★→3★ +3，账记到该星级总额；
 *   D. 同星重打 / 已 3★ 重打 → 0；连打 8 局累计也只到 5（不会超过 5）；
 *   E. 结算文案：不含「补差」/「本关视频」；首通写「首通奖励 +N 巧币」，
 *      升星写「升到 ★★ · +N 巧币」，翻倍后写「已翻 5 倍」；
 *   F. 老存档：无 starPaid 的按 2/3/5 记账；v0.41/42 留下的 21/22/24 脏账夹到新总额；
 *   G. 三端一致 + 主包 < 4MB。
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
const adLog = { rewarded: [] };
const env = {
  ctx: makeCtx(), tutorial: false,
  size: () => ({ w: 375, h: 812 }), dpr: () => 3,
  safeInsets: () => ({ top: 20, bottom: 0 }),
  bindInput(fn) { env._in = fn; },
  storage: { get: k => (k in store ? store[k] : null), set: (k, v) => { store[k] = v; } },
  audio: { unlock() {}, setEnabled() {}, play() {}, duck() {}, setVisible() {}, setScene() {},
    setSfxStyle() {} },
  vibrate() {}, images: {}, onHide() {}, onShow() {}, share() {},
  ad: { placeholder: true, banner() {},
    rewarded(kind, cb) { adLog.rewarded.push(kind); cb(true, ''); } }
};

const game = CORE(env);
game.init();
step();
const S = game.state, D = game._debug;
const E = CFG.ECON, SR = E.starReward;

function setLv(idx, stars, paid) {
  const k = String(idx + 1);
  if (stars > 0) {
    S.save.starOf[k] = stars;
    S.save.starPaid[k] = (typeof paid === 'number') ? paid : SR[stars - 1];
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
function resultTexts() {
  S.overlay = 'result'; S.resT = 2000; S.starShown = 3;
  rec.texts.length = 0;
  step(16);
  return rec.texts.map(t => t.s);
}

/* ================= 1. 配置 ================= */
section('1. 配置：1★2 / 2★3 / 3★5，每关封顶 5');
check('starReward = [2,3,5]（累计总额）', JSON.stringify(SR) === '[2,3,5]', JSON.stringify(SR));
check('1★ 首通额 = 2', SR[0] === 2, String(SR[0]));
check('2★ 累计总额 = 3（1★→2★ 差价 1）', SR[1] === 3 && SR[1] - SR[0] === 1,
  SR[1] + ' / +' + (SR[1] - SR[0]));
check('3★ 累计总额 = 5（2★→3★ 差价 2）', SR[2] === 5 && SR[2] - SR[1] === 2,
  SR[2] + ' / +' + (SR[2] - SR[1]));
check('跨级 1★→3★ = 3（= 1+2）', SR[2] - SR[0] === 3, String(SR[2] - SR[0]));
check('每关上限就是 3★ 总额 5（不存在 21/22/24 的错值）', SR[2] === 5, String(SR[2]));
/* v0.59：用户要求「看视频奖励翻十倍」—— 倍率 5 → 10 */
check('结算翻倍为 ×10（v0.59）', E.coinWinAdMul === 10, String(E.coinWinAdMul));

/* ================= 2. 首通 ================= */
section('2. 首通：按累计总额全额发放');
[[1, 2], [2, 3], [3, 5]].forEach(function (c) {
  setLv(0, 0);
  S.save.streak = 0; S.save.streakSeen = [];
  const gained = playWin(0, c[0]);
  check(`${c[0]}★ 首通 → +${c[1]} 巧币`, gained === c[1] && S.result.gain === c[1],
    `+${gained} gain=${S.result.gain}`);
  check(`${c[0]}★ 首通后已发账 = ${c[1]}`, S.save.starPaid['1'] === c[1], String(S.save.starPaid['1']));
});

/* ================= 3. 升星补差价 ================= */
section('3. 升星：只补差价，累计不超过 5');
setLv(0, 1, 2);
let g = playWin(0, 2);
check('1★ → 2★ 补 +1 巧币', g === 1 && S.result.gain === 1, `+${g}`);
check('账记到 2★ 总额 3', S.save.starPaid['1'] === 3, String(S.save.starPaid['1']));

g = playWin(0, 3);
check('2★ → 3★ 补 +2 巧币', g === 2, `+${g}`);
check('账记到 3★ 总额 5', S.save.starPaid['1'] === 5, String(S.save.starPaid['1']));

g = playWin(0, 3);
check('已 3★ 再打 3★ → +0', g === 0, `+${g}`);
g = playWin(0, 1);
check('已 3★ 打出 1★ → +0（星不降、钱不发）', g === 0 && S.save.starOf['1'] === 3,
  `+${g} best=${S.save.starOf['1']}`);

setLv(0, 1, 2);
g = playWin(0, 3);
check('1★ 直接打回 3★ → +3（跨级 = 1+2）', g === 3, `+${g}`);
check('跨级后账 = 5，没有多给', S.save.starPaid['1'] === 5, String(S.save.starPaid['1']));

/* ================= 4. 同一关总产出封顶 5 ================= */
section('4. 同一关总产出封顶：连打也超不过 5');
setLv(0, 0);
S.save.streak = 0; S.save.streakSeen = [];   // 排除连胜奖（每关额外给币）的干扰
let sum = 0;
for (let i = 0; i < 8; i++) sum += playWin(0, i % 2 === 0 ? 3 : 1);
check('首通 + 连打 7 次，累计正好 5', sum === 5, '累计 +' + sum);
check('存档已发账 = 5', S.save.starPaid['1'] === 5, String(S.save.starPaid['1']));

/* ================= 5. 结算文案 ================= */
section('5. 结算页：不再出现「补差」与「本关视频 x/3」');
setLv(0, 0);
S.save.streak = 0; S.save.streakSeen = [];
playWin(0, 1);
let tx = resultTexts();
check('首通 1★ 文案 =「首通奖励 +2 巧币」',
  tx.some(s => s === '首通奖励 +2 巧币'), tx.filter(s => /首通|巧币/.test(s)).join('|'));
check('文案里没有「补差」', !tx.some(s => /补差/.test(s)), tx.filter(s => /补差/.test(s)).join('|'));
check('文案里没有「本关视频」', !tx.some(s => /本关视频/.test(s)),
  tx.filter(s => /视频/.test(s)).join('|'));

setLv(0, 1, 2);
playWin(0, 2);
tx = resultTexts();
check('升星文案 =「升到 ★★ · +1 巧币」', tx.some(s => s === '升到 ★★ · +1 巧币'),
  tx.filter(s => /升到/.test(s)).join('|'));
check('升星文案也没有「补差」/「本关视频」',
  !tx.some(s => /补差|本关视频/.test(s)), tx.filter(s => /补差|视频/.test(s)).join('|'));
/* v0.59：按钮文案改成「10倍奖励」（图标 + 倍率），不再写「看视频」三个字 */
check('有进账时仍有「' + E.coinWinAdMul + '倍奖励」入口',
  tx.indexOf(E.coinWinAdMul + '倍奖励') >= 0, tx.filter(s => /倍奖励/.test(s)).join('|'));

/* 翻倍后：只保留「已翻 5 倍」，同样不写「本关视频」 */
setLv(0, 1, 2);
playWin(0, 2);
D.fireBtn('win_ad5');
tx = resultTexts();
check('翻倍后文案 =「升到 ★★ · +' + E.coinWinAdMul + ' 巧币 · 已翻 ' + E.coinWinAdMul + ' 倍」',
  tx.some(s => s === '升到 ★★ · +' + E.coinWinAdMul + ' 巧币 · 已翻 ' + E.coinWinAdMul + ' 倍'),
  tx.filter(s => /已翻/.test(s)).join('|'));
check('翻倍后也没有「本关视频」', !tx.some(s => /本关视频/.test(s)),
  tx.filter(s => /视频/.test(s)).join('|'));

/* 无提升时仍是那句「已通过」 */
setLv(0, 3, 5);
playWin(0, 3);
tx = resultTexts();
check('已 3★ 重打 → 「已通过 · 星级未提升，无奖励」',
  tx.some(s => s.indexOf('已通过 · 星级未提升') >= 0), tx.filter(s => /已通过/.test(s)).join('|'));

/* ================= 6. 老存档 ================= */
section('6. 老存档：旧账对齐新总额，脏账被夹住');
const rawKey = D.saveKey;
function bootWith(mut) {
  const raw = JSON.parse(store[rawKey]);
  mut(raw);
  store[rawKey] = JSON.stringify(raw);
  const gm = CORE(env);
  gm.init();
  step(16);
  return gm;
}
/* ① v0.39 及以前：只有 starOf，没有 starPaid */
let gm = bootWith(function (o) {
  delete o.starPaid;
  o.starOf = { '1': 1 };
});
check('无 starPaid 的老档 → 按旧口径记 2', gm.state.save.starPaid['1'] === 2,
  String(gm.state.save.starPaid['1']));
gm._debug.setupLevel(0);
gm.state.elapsed = gm._debug.LEVELS[0].parTime * 1.2;
gm.state.steps = 999;
const c2 = gm.state.save.coin;
gm._debug.win();
check('老档 1★ → 2★ 补 +1（3 - 2）', gm.state.save.coin - c2 === 1, `+${gm.state.save.coin - c2}`);

/* ② v0.41/42 的错值账（21/22/24）会被夹到新总额，不会继续超发 */
gm = bootWith(function (o) {
  o.starOf = { '1': 2 };
  o.starPaid = { '1': 22 };
});
check('错值账 22 被夹到 2★ 总额 3', gm.state.save.starPaid['1'] === 3,
  String(gm.state.save.starPaid['1']));
gm._debug.setupLevel(0);
gm.state.elapsed = 0; gm.state.steps = 0;
const c3 = gm.state.save.coin;
gm._debug.win();
check('夹账后 2★ → 3★ 只补 +2', gm.state.save.coin - c3 === 2, `+${gm.state.save.coin - c3}`);
check('夹账后账 = 5，没有突破封顶', gm.state.save.starPaid['1'] === 5,
  String(gm.state.save.starPaid['1']));

/* ================= 7. 三端一致 ================= */
section('7. 三端同步与包体积');
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
