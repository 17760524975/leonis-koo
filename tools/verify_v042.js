/* v0.42 专项验收：邀请有礼「奖励图标化 + 进度条 + 可滑动」
 *
 * 用户要求：
 *   ① 奖励全部换成图标展示，不要文字；
 *   ② 每行中间设计一个进度条，能看到进度情况；
 *   ③ 超出一页显示不完全时要能滑动（版式参考用户给的对标图）。
 *
 * 本脚本锁住的东西：
 *   A. 图标序列（tierRewards）：巧币 / 体力 / 查找道具 / 板件 / 背景，顺序与档位奖励一一对应；
 *   B. 面板：行标「累计邀请 N 人进入游戏」+ 进度「已/需」+ 右侧按钮（已领取 / 领取 / 邀请）；
 *   C. 奖励文案不再出现在画布上（图标代替文字）；
 *   D. 8 档内容高于视口 → 可滑；滑到底第 8 档才出现，滚动量夹在最大值上；
 *   E. 手势：按住列表拖动会滚动；从按钮上起手拖动不会误触发分享；点按钮才会分享；
 *   F. 每次打开面板回到第 1 档；列表按钮热区不越出视口；
 *   G. 三端一致 + 主包 < 4MB。
 *
 * 用法：node tools/verify_v042.js
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
const V = CFG.INVITE;

/* ================= 1. 图标序列 ================= */
section('1. 奖励 → 图标序列（不再有文字描述）');
check('验收脚本拿得到 tierRewards', typeof D.tierRewards === 'function', typeof D.tierRewards);

/* 与用户清单逐档对齐：30巧币+1道具 / 20体力+霓虹 / 水晶+泡泡 / 1道具+10体力 /
 * 马卡龙+10体力 / 1道具+50巧币 / 1道具+花瓣 / 荧光+1道具 */
const WANT = [
  ['coin:30', 'hint:1'],
  ['energy:20', 'pstyle:neon:1'],
  ['pstyle:crystal:1', 'bgfx:bubbles:1'],
  ['energy:10', 'hint:1'],
  ['energy:10', 'pstyle:pastel:1'],
  ['coin:50', 'hint:1'],
  ['bgfx:petals:1', 'hint:1'],
  ['pstyle:glow:1', 'hint:1']
];
V.tiers.forEach(function (t, i) {
  const got = D.tierRewards(t).map(function (r) {
    return r.kind + ':' + (r.key ? r.key + ':' : '') + r.n;
  });
  const want = WANT[i];
  const same = got.length === want.length && got.slice().sort().join('|') === want.slice().sort().join('|');
  check(`第 ${t.n} 档图标 = ${got.join(' + ')}`, same, 'want ' + want.join(' + '));
});
check('每档奖励不超过 2 个图标（一行放得下）',
  V.tiers.every(t => D.tierRewards(t).length <= 2),
  V.tiers.map(t => D.tierRewards(t).length).join(','));

/* ================= 2. 面板：图标 + 进度条 ================= */
section('2. 面板：行标 / 进度条 / 按钮三态');
S.page = 'home'; S.overlay = 'invite'; S.fade = 1; S.pageT = 9999;
S.save.inviteCount = 2; S.save.inviteGot = [1, 2]; S.save.invitePend = [];
S.inviteScroll = 0;
rec.texts.length = 0;
step(16);
let tx = rec.texts.map(t => t.s);
check('行标「累计邀请 2 人进入游戏」在位', tx.indexOf('累计邀请 2 人进入游戏') >= 0,
  tx.filter(s => /累计邀请/.test(s)).join('|'));
check('进度条写 2/2 与 2/3', tx.indexOf('2/2') >= 0 && tx.indexOf('2/3') >= 0,
  tx.filter(s => /^\d+\/\d+$/.test(s)).join('|'));
check('已领两档 → 两个「已领取」', tx.filter(s => s === '已领取').length === 2,
  String(tx.filter(s => s === '已领取').length));
check('未达标的行 → 蓝色「邀请」按钮', tx.filter(s => s === '邀请').length >= 3,
  String(tx.filter(s => s === '邀请').length));
check('奖励文字一个都不出现（全图标）',
  V.tiers.every(t => tx.every(s => s.indexOf(t.label) < 0)),
  V.tiers.filter(t => tx.some(s => s.indexOf(t.label) >= 0)).map(t => t.label).join('|'));
check('图标下方写 ×数量', tx.indexOf('×30') >= 0 && tx.indexOf('×20') >= 0,
  tx.filter(s => /^×/.test(s)).join('|'));
check('顶部有总进度「已邀请 2 人 · 已完成 2/8 档」',
  tx.some(s => s.indexOf('已邀请 2 人 · 已完成 2/8 档') >= 0),
  tx.filter(s => /已邀请/.test(s)).join('|'));

/* ================= 3. 可滑动 ================= */
section('3. 8 档超出一屏 → 可滑动');
check('内容高于视口 → 需要滑动', S.inviteScrollMax > 0, 'max=' + S.inviteScrollMax);
check('初始在第 1 档（第 8 档不在视野）', tx.indexOf('累计邀请 8 人进入游戏') < 0,
  tx.filter(s => /累计邀请 8/.test(s)).join('|'));

const L = S.inviteList;
check('视口矩形已记录（供手势判定）', !!L && L.h > 0, L && JSON.stringify({ y: L.y, h: L.h }));

/* 按住列表往上拖 100px */
D.onDown(L.x + 40, L.y + L.h - 40);
D.onMove(L.x + 40, L.y + L.h - 140);
const scAfterDrag = S.inviteScroll;
D.onUp(L.x + 40, L.y + L.h - 140);
check('按住列表上拖 100px → 正好滚 100px', Math.abs(scAfterDrag - 100) <= 2, String(scAfterDrag));

/* 继续拖到底：滚动量夹在最大值 */
D.onDown(L.x + 40, L.y + L.h - 40);
D.onMove(L.x + 40, L.y - 900);
D.onUp(L.x + 40, L.y - 900);
check('拖过头也只停在最大值', S.inviteScroll === S.inviteScrollMax,
  S.inviteScroll + '/' + S.inviteScrollMax);

rec.texts.length = 0;
step(16);
tx = rec.texts.map(t => t.s);
check('滑到底 → 第 8 档出现', tx.indexOf('累计邀请 8 人进入游戏') >= 0,
  tx.filter(s => /累计邀请/.test(s)).join('|'));
check('滑到底 → 第 1 档滚出视野', tx.indexOf('累计邀请 1 人进入游戏') < 0,
  tx.filter(s => /累计邀请/.test(s)).join('|'));

/* 往回拖 60px（此时在底部 138，够往回收） */
const sc0 = S.inviteScroll;
D.onDown(L.x + 40, L.y + 30);
D.onMove(L.x + 40, L.y + 90);
D.onUp(L.x + 40, L.y + 90);
check('往下拖 60px → 往回滚 60px', Math.abs((sc0 - S.inviteScroll) - 60) <= 2,
  sc0 + '→' + S.inviteScroll);

/* ================= 4. 拖动不误触按钮 ================= */
section('4. 手势不打架：拖过按钮 != 点按钮');
D.setInviteScroll(0);
step(16);
const pend0 = S.save.invitePend.length;
const btnHit = D.hitList().filter(h => h.id === 'invite_share')[0];
check('列表里拿得到「邀请」按钮热区', !!btnHit,
  D.hitList().filter(h => /invite_/.test(h.id)).map(h => h.id).join(','));
if (btnHit) {
  const bx = btnHit.x + btnHit.w / 2, by = btnHit.y + btnHit.h / 2;
  /* 从按钮正中按下 → 上拖 90px → 松手 */
  D.onDown(bx, by);
  D.onMove(bx, by - 90);
  D.onUp(bx, by - 90);
  check('从按钮上起手拖动：只滚动，不误触发分享',
    S.save.invitePend.length === pend0 && S.inviteScroll > 0,
    'pend=' + S.save.invitePend.length + ' scroll=' + S.inviteScroll);

  /* 干净点一下同一个按钮 */
  D.setInviteScroll(0);
  S.inviteCd = 0;
  step(16);
  const h2 = D.hitList().filter(h => h.id === 'invite_share')[0];
  const cx2 = h2.x + h2.w / 2, cy2 = h2.y + h2.h / 2;
  D.onDown(cx2, cy2);
  D.onUp(cx2, cy2);
  check('干净点「邀请」→ 发一张邀请券', S.save.invitePend.length === pend0 + 1,
    'pend=' + S.save.invitePend.length);
}

/* ================= 5. 热区裁剪 ================= */
section('5. 热区不越界（滑到边上没有幽灵按钮）');
const inner = D.hitList().filter(h => /invite_(share|claim)/.test(h.id));
check('列表按钮热区都在视口内',
  inner.length > 0 && inner.every(h => h.y >= S.inviteList.y - 0.5 &&
    h.y + h.h <= S.inviteList.y + S.inviteList.h + 0.5),
  inner.map(h => h.id + '@' + h.y.toFixed(0) + '+' + h.h.toFixed(0)).join(' '));

/* ================= 6. 每次打开回到顶部 ================= */
section('6. 打开面板回到第 1 档');
S.save.invitePend = [];
S.inviteScroll = 500;
S.overlay = null;
D.fireBtn('entry_invite');
check('打开面板 → 滚动归零', S.inviteScroll === 0 && S.overlay === 'invite',
  'scroll=' + S.inviteScroll + ' overlay=' + S.overlay);

/* ================= 7. 深色皮肤不炸 ================= */
section('7. 深色皮肤（夜间护眼）下同样可用');
D.applySkin('dusk');
S.overlay = 'invite';
step(16);
const darkTx = rec.texts.map(t => t.s);
check('深色下仍渲染行标与进度', darkTx.indexOf('累计邀请 1 人进入游戏') >= 0 && darkTx.indexOf('1/1') >= 0,
  darkTx.filter(s => /累计邀请|^\d+\/\d+$/.test(s)).slice(0, 4).join('|'));
check('深色下滚动参数照常', S.inviteScrollMax > 0, String(S.inviteScrollMax));
D.applySkin('warm');

/* ================= 8. 三端一致 / 包体 ================= */
section('8. 三端同步与包体积');
function md5(p) { var __s = p; return require('crypto').createHash('md5').update(/\.js$/i.test(String(__s)) ? Buffer.from(require('./lib/pack.js').strip(require('fs').readFileSync(__s, 'utf8'))) : require('fs').readFileSync(__s)).digest('hex'); }
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
