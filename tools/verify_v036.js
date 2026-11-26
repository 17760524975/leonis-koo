/* v0.36 专项验收：在线奖励全局化（四巧 / 七巧共用一份在线时长与领取记录）
 * 用法：node tools/verify_v036.js
 *
 * 用户这版需求原文：
 *   「在线奖励这里也不应该区分四巧和七巧，统一只有一个在线时长统计一天只能领取一次。」
 * 口径（已与用户确认）：保留 1/5/10/20/40/60 分钟 6 档，每档每天各领一次；
 *   但「今天累计多少秒、哪些档已领」全游戏只有一份，切换玩法不能重开一轮。
 *
 * 覆盖：
 *   1) 首次升级：两份老存档合并播种（时长取大、已领取并集，防升级后重复领）；
 *   2) 四巧 → 七巧：计时不重置、已领不丢、重复领被拒；
 *   3) 七巧 → 四巧：反向同样，且切换前未落盘的秒数不丢；
 *   4) 跨天清零：内存与全局键一起滚到新的一天；
 *   5) 云合并：合并结果以全局键为准，不被云端那份覆盖；
 *   6) UI 文案 / 6 档仍在 / 源码四处接线 / 三端一致。
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const rec = { texts: [] };
function makeCtx() {
  const grad = { addColorStop() {} };
  const base = {
    canvas: { width: 0, height: 0, style: {} },
    globalAlpha: 1,
    font: '16px sans-serif',
    measureText(s) { return { width: String(s).length * 15 }; },
    createLinearGradient: () => grad, createRadialGradient: () => grad, createPattern: () => null,
    fillText(s) { rec.texts.push({ s: String(s) }); },
    fill() {}, stroke() {}, fillRect() {}, strokeRect() {}, drawImage() {},
    arc() {}, moveTo() {}, lineTo() {}, bezierCurveTo() {}, quadraticCurveTo() {},
    rect() {}, translate() {}, rotate() {}, scale() {}, clip() {}, setTransform() {},
    setLineDash() {}, save() {}, restore() {}, beginPath() {}, closePath() {},
    arcTo() {}, clearRect() {}, ellipse() {}
  };
  return new Proxy(base, {
    get(t, k) { return k in t ? t[k] : () => {}; },
    set(t, k, v) { t[k] = v; return true; }
  });
}
let pendingFrame = null, clock = 0;
global.requestAnimationFrame = cb => { pendingFrame = cb; return 1; };
function step(ms) { clock += ms || 16; const cb = pendingFrame; pendingFrame = null; if (cb) cb(clock); }

require(path.join(ROOT, 'js/levels.js'));
const CFG = require(path.join(ROOT, 'js/config.js'));
const CORE = require(path.join(ROOT, 'js/core.js'));

let fail = 0;
function check(label, ok, detail) {
  if (!ok) fail++;
  console.log(`  [${ok ? 'OK' : 'XX'}] ${label}${detail ? '  ' + detail : ''}`);
}
function section(t) { console.log('\n== ' + t + ' =='); }
function today() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
function online(store) { return JSON.parse(store['tangram_online_v1'] || 'null'); }
function freeze(S) { S.onlineMark = 0; S.onlineSaveT = 0; }

function mkEnv(store) {
  return {
    ctx: makeCtx(), tutorial: false,
    size: () => ({ w: 375, h: 812 }), dpr: () => 3,
    safeInsets: () => ({ top: 20, bottom: 0 }),
    bindInput() {},
    storage: { get: k => (k in store ? store[k] : null), set: (k, v) => { store[k] = v; } },
    audio: { unlock() {}, setEnabled() {}, play() {}, duck() {}, setVisible() {}, setScene() {} },
    vibrate() {}, images: {}, share() {}, onHide() {}, onShow() {},
    cloud: {
      enabled: () => false,
      init(cb) { setTimeout(() => cb({ msg: 'no-cloud' }), 0); },
      load(cb) { setTimeout(() => cb({ msg: 'no-cloud' }), 0); },
      save(p, cb) { setTimeout(() => cb(null, {}), 0); },
      rank(t, cb) { setTimeout(() => cb(null, { list: [], me: null }), 0); }
    },
    ad: { rewarded(k, cb) { cb(true, ''); } }
  };
}
function boot(store, doStep) {
  const g = CORE(mkEnv(store));
  g.init();
  if (doStep) step(16);
  return { g, S: g.state, D: g._debug, store };
}

console.log('v0.36 验收：在线奖励全局化（统一一份在线时长 / 一天只能领一次）');

/* ================= 1. 首次升级播种 ================= */
section('1. 首次升级：两份老存档合并成一份全局状态');
const sA = {};
sA['tangram_save_v1'] = JSON.stringify({
  onlineDay: today(), onlineSec: 120, onlineGot: { o1: true },
  coin: 50, energy: 10, updatedAt: 1
});
sA['tangram7_save_v1'] = JSON.stringify({
  onlineDay: today(), onlineSec: 700, onlineGot: { o2: true },
  coin: 50, energy: 10, updatedAt: 2
});
const A = boot(sA, false);
const oA = online(sA);
check('全局键 tangram_online_v1 已建立', !!oA, JSON.stringify(oA));
check('时长取两份里较大的 700 秒（不亏待玩家）',
  !!oA && oA.onlineSec >= 700 && oA.onlineSec < 705, oA ? 'sec=' + oA.onlineSec : '-');
check('已领档位取并集 o1+o2（升级后不能把领过的档再领一遍）',
  !!oA && oA.onlineGot.o1 === true && oA.onlineGot.o2 === true,
  oA ? JSON.stringify(oA.onlineGot) : '-');
check('日期是今天', !!oA && oA.onlineDay === today(), oA ? oA.onlineDay : '-');
check('内存里的存档与全局键一致',
  Math.floor(A.S.save.onlineSec) >= 700 && A.S.save.onlineGot.o1 === true && A.S.save.onlineGot.o2 === true,
  'sec=' + A.S.save.onlineSec);

/* 昨天那份不迁：另起一份只有昨日记录的老存档 */
const sA2 = {};
sA2['tangram_save_v1'] = JSON.stringify({
  onlineDay: '2000-1-1', onlineSec: 9999, onlineGot: { o1: true, o6: true },
  coin: 50, energy: 10, updatedAt: 1
});
const A2 = boot(sA2, false);
const oA2 = online(sA2);
check('昨天的老记录不迁（今天从 0 开始、无可领旧档）',
  oA2.onlineDay === today() && oA2.onlineSec < 5 && Object.keys(oA2.onlineGot).length === 0,
  JSON.stringify(oA2));

/* ================= 2. 四巧 → 七巧 ================= */
section('2. 四巧 → 七巧：一份计时、一份领取记录');
const sB = {};
const B = boot(sB, true);
const S = B.S, D = B.D;
freeze(S);
check('默认在四巧板', D.setKey === 'tangram4', D.setKey);
check('奖励仍是 6 档（档位与门槛不变）', CFG.ONLINE.tiers.length === 6,
  CFG.ONLINE.tiers.map(t => t.at).join(','));
S.save.onlineDay = today();
S.save.onlineSec = 700;
S.save.onlineGot = {};
D.writeOnline(S.save);
check('全局键记录 700 秒', online(sB).onlineSec === 700, 'sec=' + online(sB).onlineSec);
const coin0 = S.save.coin;
check('四巧板领 1 分钟档 o1 成功', D.onlineClaim('o1') === true);
check('奖励照发：巧币 +5', S.save.coin === coin0 + 5, `${coin0} → ${S.save.coin}`);
check('全局键已记 o1', online(sB).onlineGot.o1 === true, JSON.stringify(online(sB).onlineGot));
D.useSet('tangram7');
freeze(S);
check('已切到七巧板', D.setKey === 'tangram7', D.setKey);
check('今日在线仍是 700 秒（不从 0 重来）', Math.floor(D.onlineSecNow()) >= 700,
  'sec=' + D.onlineSecNow());
check('o1 在七巧板仍是已领', D.onlineTierList()[0].got === true, JSON.stringify(D.onlineTierList()[0]));
const coin1 = S.save.coin;
check('切玩法后再领 o1 被拒（一天只能领一次）', D.onlineClaim('o1') === false);
check('被拒时不发奖', S.save.coin === coin1, 'coin=' + S.save.coin);
check('钱包余额跨玩法仍一致（v0.34 回归）', S.save.coin === coin0 + 5, 'coin=' + S.save.coin);

/* ================= 3. 七巧 → 四巧 + 切换前结算 ================= */
section('3. 七巧 → 四巧：反向同样，且切换前未落盘的秒数不丢');
check('七巧板可领 5 分钟档 o2', D.onlineClaim('o2') === true);
D.useSet('tangram4');
freeze(S);
check('o2 在四巧板也是已领', D.onlineTierList()[1].got === true, JSON.stringify(D.onlineTierList()[1]));
check('四巧板重复领 o2 被拒', D.onlineClaim('o2') === false);
const gB = online(sB);
check('全局键只有一份记录（o1 + o2）',
  gB.onlineGot.o1 === true && gB.onlineGot.o2 === true && Object.keys(gB.onlineGot).length === 2,
  JSON.stringify(gB.onlineGot));
check('两套存档里的在线镜像一致',
  JSON.parse(sB['tangram_save_v1']).onlineGot.o2 === true &&
  JSON.parse(sB['tangram7_save_v1']).onlineGot.o2 === true,
  'save4=' + JSON.stringify(JSON.parse(sB['tangram_save_v1']).onlineGot) +
  ' save7=' + JSON.stringify(JSON.parse(sB['tangram7_save_v1']).onlineGot));

/* 起表 30 秒、只结算不落盘，然后切玩法：useSet 必须先把这段写进全局键 */
S.onlineMark = Date.now() - 30000;
const before = D.onlineSecNow();
D.useSet('tangram7');
const after = D.onlineSecNow();
check('切换前未落盘的 30 秒不会丢', after >= before - 1, `${before} → ${after}`);
check('全局键也跟上了这段时长', online(sB).onlineSec >= before - 1, 'sec=' + online(sB).onlineSec);

/* ================= 4. 跨天清零 ================= */
section('4. 跨天清零：内存与全局键一起滚到新的一天');
freeze(S);
const gC = online(sB);
gC.onlineDay = '2000-1-1';
sB['tangram_online_v1'] = JSON.stringify(gC);
D.applyOnlineTo(S.save);
check('灌入的是昨天的日期', S.save.onlineDay === '2000-1-1', S.save.onlineDay);
D.onlineSync();
check('累计归零', Math.floor(S.save.onlineSec) === 0, 'sec=' + S.save.onlineSec);
check('已领记录清空', Object.keys(S.save.onlineGot).length === 0, JSON.stringify(S.save.onlineGot));
check('日期滚到今天', S.save.onlineDay === today(), S.save.onlineDay);
D.writeOnline(S.save);
const gD = online(sB);
check('全局键同步清零',
  gD.onlineDay === today() && gD.onlineSec === 0 && Object.keys(gD.onlineGot).length === 0,
  JSON.stringify(gD));
D.useSet('tangram4');
check('切回四巧板后仍是清零状态（不会从另一套存档复活旧记录）',
  Math.floor(D.onlineSecNow()) === 0 && Object.keys(S.save.onlineGot).length === 0,
  'sec=' + D.onlineSecNow());

/* ================= 5. 云合并 ================= */
section('5. 云合并不覆盖全局在线状态');
D.writeOnline({ onlineDay: today(), onlineSec: 65, onlineGot: { o1: true } });
const local = { onlineDay: today(), onlineSec: 0, onlineGot: {}, starOf: {}, updatedAt: 1 };
const remote = {
  onlineDay: today(), onlineSec: 3600,
  onlineGot: { o1: true, o2: true, o3: true, o4: true, o5: true, o6: true },
  starOf: {}, updatedAt: 2
};
const m = D.mergeSave(local, remote);
check('合并后时长 = 全局键的 65，不是云端的 3600', m.onlineSec === 65, 'sec=' + m.onlineSec);
check('合并后已领 = 全局键的 o1，不是云端的 6 档',
  Object.keys(m.onlineGot).length === 1 && m.onlineGot.o1 === true,
  JSON.stringify(m.onlineGot));
check('合并后日期仍是今天', m.onlineDay === today(), m.onlineDay);

/* ================= 5b. 云端上行 ================= */
section('5b. 云端上行只带一份在线统计');
const payload = D.collectCloud();
const pKeys = Object.keys(payload.sets);
check('上行包含两套存档', pKeys.length === 2, pKeys.join(','));
check('两份存档的在线镜像在上行前已对齐（云端不再存分叉值）',
  pKeys.length === 2 &&
  payload.sets[pKeys[0]].onlineSec === payload.sets[pKeys[1]].onlineSec &&
  JSON.stringify(payload.sets[pKeys[0]].onlineGot) === JSON.stringify(payload.sets[pKeys[1]].onlineGot) &&
  payload.sets[pKeys[0]].onlineDay === payload.sets[pKeys[1]].onlineDay,
  pKeys.map(k => `${k}: ${payload.sets[k].onlineSec}s ${JSON.stringify(payload.sets[k].onlineGot)}`).join(' | '));

/* ================= 6. UI / 源码 / 三端一致 ================= */
section('6. UI 文案 / 6 档 / 源码接线 / 三端一致');
S.overlay = 'online';
rec.texts.length = 0;
step(16);
check('在线奖励页标注「四巧 / 七巧共用」',
  rec.texts.some(t => t.s.indexOf('四巧 / 七巧共用') >= 0),
  rec.texts.map(t => t.s).filter(s => s.indexOf('累计') >= 0).join(' | '));
check('页面仍有 6 枚档位按钮',
  D.hitList().filter(h => /^online_o\d$/.test(h.id)).length === 6,
  D.hitList().map(h => h.id).join(','));

const coreSrc = fs.readFileSync(path.join(ROOT, 'js/core.js'), 'utf8');
check('core 定义了 ONLINE_KEY = tangram_online_v1',
  /var ONLINE_KEY = 'tangram_online_v1'/.test(coreSrc));
check('四处接线：loadSave / writeLocal / mergeSave / useSet 都接了全局在线状态',
  /applyOnlineTo\(s\);[\s\S]{0,80}return s;/.test(coreSrc) &&
  /writeWallet\(state\.save\);[\s\S]{0,120}writeOnline\(state\.save\)/.test(coreSrc) &&
  /applyOnlineTo\(out\);/.test(coreSrc) &&
  /if \(state\.save\) \{ onlineSync\(\); writeLocal\(true\); \}/.test(coreSrc));
const cfgSrc = fs.readFileSync(path.join(ROOT, 'js/config.js'), 'utf8');
check('配置注释标明 v0.36 全局化口径', /v0\.36 全局化[\s\S]{0,200}tangram_online_v1/.test(cfgSrc));
['preview/js/core.js', 'miniprogram/js/core.js', 'preview/js/config.js', 'miniprogram/js/config.js'].forEach(f => {
  const base = f.indexOf('config.js') >= 0 ? 'js/config.js' : 'js/core.js';
  /* v0.62：preview/miniprogram 写的是打包产物（去注释/缩进），比语义而不是字节 */
  const sem = p => require('./lib/pack.js').strip(fs.readFileSync(path.join(ROOT, p), 'utf8'));
  check('语义一致：' + f, sem(f) === sem(base));
});

console.log('\n' + (fail === 0 ? 'v0.36 验收全部通过' : `!! ${fail} 项未通过`));
process.exit(fail === 0 ? 0 : 1);
