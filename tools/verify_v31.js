/* v0.31 专项验收：全面屏留白 / 视觉设置全局化 / 2 分钟倒计时 / 体力 10 倍 / 音效素材
 * 用法：node tools/verify_v31.js
 *
 * 这一版改的都是"看得见、但单测容易漏"的东西：
 *   ① 细长屏（vivo X200s 1260×2800）上下留白 —— 用尺寸模拟验算，不靠肉眼；
 *   ② 皮肤/背景/板件/音效风格是否真的跨数据集共享（以前的锅是两套存档各存一份）；
 *   ③ 每关统一时限，且旧存档的超长快照要被夹住；（v0.59 起 120 → 150 秒）
 *   ④ 免费体力只剩"看视频"，一次 +20；
 *   ⑤ 新音效素材存在、两包一致、采样率/时长合理。
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

function makeCtx() {
  const grad = { addColorStop() {} };
  return new Proxy({}, {
    get(t, k) {
      if (k === 'measureText') return () => ({ width: 40 });
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad;
      if (k === 'createPattern') return () => null;
      if (k === 'canvas') return { width: 0, height: 0, style: {} };
      return () => {};
    },
    set() { return true; }
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

const store = {};
/* 默认按用户的机器来：1260×2800 逻辑像素（2.222:1） */
const screen = { w: 1260, h: 2800 };
const env = {
  ctx: makeCtx(),
  tutorial: false,
  size: () => ({ w: screen.w, h: screen.h }),
  dpr: () => 1,
  safeInsets: () => ({ top: 40, bottom: 30 }),
  bindInput(fn) { this._in = fn; },
  storage: { get: k => (k in store ? store[k] : null), set: (k, v) => { store[k] = v; } },
  audio: {
    unlock() {}, setEnabled() {}, play() {}, duck() {},
    setVisible() {}, setScene() {}, setSfxStyle() {}
  },
  vibrate() {}, images: {},
  onHide() {}, onShow() {}
};

let fail = 0;
function check(label, ok, detail) {
  if (!ok) fail++;
  console.log(`  [${ok ? 'OK' : 'XX'}] ${label}${detail ? '  ' + detail : ''}`);
}

const game = CORE(env);
game.init();
const S = game.state;
const D = game._debug;

/* ================= 1. 全面屏：不再上下留白 ================= */
console.log('==== 1. 细长屏（1260×2800）布局 ====');
const scale = Math.min(screen.w / CFG.DESIGN.w, screen.h / CFG.DESIGN.h);
const dh = D.designH();
check('可用设计高度撑到 1666.7（旧版固定在 1624）',
  Math.abs(dh - screen.h / scale) < 0.01 && dh > CFG.DESIGN.h,
  `dh=${dh.toFixed(1)} 设计=${CFG.DESIGN.h} 比例=${(screen.h / screen.w).toFixed(3)}`);
/* 旧版 view.oy = (h - 1624*scale)/2 → 每边 21.3 设计 px 的米色带 */
const oldBand = (screen.h - CFG.DESIGN.h * scale) / 2 / scale;
check('上下不再留边（旧版每边 ' + oldBand.toFixed(1) + ' 设计 px）',
  dh * scale >= screen.h - 0.5, `画布高 ${(dh * scale).toFixed(1)} / 屏高 ${screen.h}`);

S.page = 'home'; S.fade = 1; S.pageT = 9999; step(16);
const L = D.homeLayout();
const starBottomPct = 1 - (L.starY + 12) / dh;
check('星数行离底边 < 8%（旧版底部留白约 16%）',
  starBottomPct < 0.08 && starBottomPct > 0.01, (starBottomPct * 100).toFixed(1) + '%');
/* v0.38：用户要求「开始游戏按钮放到关卡下面」，顺序改为
 * 四巧板 → 七巧板 → 开始 → 星数；入口卡片同时缩小到 408×100。 */
check('v0.38 竖向顺序：四巧板 → 七巧板 → 开始 → 星数',
  L.set4Y < L.set7Y && L.set7Y < L.startY && L.startY < L.starY &&
  Math.abs((L.set7Y - L.set4Y) - (CFG.LAYOUT.HOME.setGap || 118)) < 0.01 &&
  Math.abs((L.startY - L.set7Y) - (CFG.LAYOUT.HOME.startGap || 126)) < 0.01,
  `${L.set4Y.toFixed(0)}/${L.set7Y.toFixed(0)}/${L.startY.toFixed(0)}/${L.starY.toFixed(0)}`);
check('v0.38 入口卡片缩小到 408×100',
  CFG.LAYOUT.HOME.setW === 408 && CFG.LAYOUT.HOME.setH === 100,
  `${CFG.LAYOUT.HOME.setW}×${CFG.LAYOUT.HOME.setH}`);
const hitsHome = D.hitList();
const need = ['start', 'set_t4', 'set_t7', 'entry_skin', 'settings', 'hud_energy'];
check('主页热区齐全（布局下移后没把按钮挪出屏幕）',
  need.every(id => hitsHome.some(h => h.id === id)) &&
  hitsHome.every(h => h.y + h.h / 2 <= dh && h.y - h.h / 2 >= 0),
  need.filter(id => !hitsHome.some(h => h.id === id)).join(',') || 'all ok');

/* 换成设计稿比例，布局也要能回落 */
screen.w = 750; screen.h = 1624; game.resize(); step(16);
const L2 = D.homeLayout();
check('设计稿比例（750×1624）下也贴底，不出现两套不同版式',
  Math.abs(D.designH() - 1624) < 0.01 && L2.starY > 1400, `starY=${L2.starY.toFixed(0)}`);
screen.w = 1260; screen.h = 2800; game.resize(); step(16);

/* ================= 2. 视觉设置全局化 ================= */
console.log('\n==== 2. 皮肤类设置作用于整个游戏 ====');
check('默认背景是「几何轻舞」', S.save.bgFx === 'geometric', S.save.bgFx);
check('全局视觉键已写入', !!store.tangram_visual_v1, String(store.tangram_visual_v1).slice(0, 80));

D.applySkin('mint');
D.applyBgFx('stars');
D.applyPieceStyle('wood');
D.applySfxStyle('bell');
const before = { skin: S.save.skin, bgFx: S.save.bgFx, pieceStyle: S.save.pieceStyle, sfxStyle: S.save.sfxStyle };
check('当前数据集内四项生效',
  before.skin === 'mint' && before.bgFx === 'stars' &&
  before.pieceStyle === 'wood' && before.sfxStyle === 'bell', JSON.stringify(before));

D.useSet('tangram7'); step(16);
check('切到七巧板后四项保持一致（旧版会退回默认）',
  S.save.skin === 'mint' && S.save.bgFx === 'stars' &&
  S.save.pieceStyle === 'wood' && S.save.sfxStyle === 'bell',
  `${S.save.skin}/${S.save.bgFx}/${S.save.pieceStyle}/${S.save.sfxStyle}`);
check('七巧板用的是自己的存档（进度/体力仍分开）',
  D.saveKey === 'tangram7_save_v1', D.saveKey);

D.applyBgFx('geometric');      // 先关掉深色特效，单独验证深色皮肤自己的调色板
D.applySkin('dusk'); D.useSet('tangram4'); step(16);
check('在七巧板里换肤，切回四巧板同样生效',
  S.save.skin === 'dusk', S.save.skin);
check('夜间护眼是深色皮肤（深底 + 浅字，深色字段整套齐）',
  game._debug.COLORS.bg === CFG.SKINS.dusk.bg &&
  game._debug.COLORS.board === CFG.SKINS.dusk.board &&
  game._debug.COLORS.targetEdge === CFG.SKINS.dusk.targetEdge,
  `${game._debug.COLORS.bg} / ${game._debug.COLORS.board}`);
check('深色背景自动叠暗色调色板（星夜）',
  (function () {
    D.applyBgFx('stars');
    return game._debug.COLORS.text === CFG.DARK_PAL.text;
  })(), game._debug.COLORS.text);
D.applyBgFx('geometric');
D.applySkin('warm'); D.applyPieceStyle('classic'); D.applySfxStyle('wood');

/* ================= 3. 每关统一时限 ================= */
/* v0.59：用户要求倒计时 2 分钟 → 2 分 30 秒，这里改成读配置而不是写死 120，
 * 以后调时限只改 TIMER.fixedSec，别再动断言。 */
const FIXED = CFG.TIMER.fixedSec;
console.log('\n==== 3. 倒计时统一 ' + FIXED + ' 秒 ====');
check('TIMER.fixedSec = 150（v0.59）', FIXED === 150, String(FIXED));
let allSame = true, seen = {};
['tangram4', 'tangram7'].forEach(k => {
  D.useSet(k); step(16);
  D.LEVELS.forEach(lv => {
    const t = D.timeLimitOf(lv);
    seen[k + ':' + lv.id] = t;
    if (t !== FIXED) allSame = false;
  });
});
check('两套数据集全部关卡都是 ' + FIXED + ' 秒', allSame,
  Object.keys(seen).length + ' 关，取值 ' + Array.from(new Set(Object.values(seen))).join('/'));

/* 旧存档快照：tl=600 / left=599，进入时必须被夹到当前时限 */
D.useSet('tangram4'); step(16);
D.openLevel(1, { resume: { lv: 1, tl: 600, left: 599, el: 20, st: 3, rv: 0, pc: [], at: Date.now() } });
step(16);
check('旧快照的 600 秒被夹到 ' + FIXED + '，剩余时间不会白拿',
  S.timeLimit === FIXED && S.timeLeft <= FIXED,
  `limit=${S.timeLimit} left=${(S.timeLeft || 0).toFixed(1)}`);
S.page = 'home'; S.overlay = null; S.resume = null;

/* ================= 4. 体力：只剩看视频，一次 +20 ================= */
console.log('\n==== 4. 免费体力面板 ====');
/* v0.35：用户要求「看视频获取体力改为 5 倍」—— 10 → 5（单次 2×5 = 10 点） */
check('看视频倍率 = 5', CFG.ECON.freeEnergyAdMul === 5, String(CFG.ECON.freeEnergyAdMul));
S.save.energy = 0; S.save.freeEnergyDay = ''; S.save.freeEnergyUsed = 0;
S.overlay = 'energy'; step(16);
const hitsE = D.hitList().map(h => h.id);
check('面板只剩「看视频」一个入口（分享已下线）',
  hitsE.indexOf('free_ad') >= 0 && hitsE.indexOf('free_share') < 0, hitsE.join(','));
D.grantFreeEnergy(true);
check('一次 +20 体力（上限 16 也能拿到，不吞奖励）',
  S.save.energy === CFG.ECON.freeEnergyShare * CFG.ECON.freeEnergyAdMul,
  'energy=' + S.save.energy + '/' + S.save.energyMax);
check('每日次数计数 +1', S.save.freeEnergyUsed === 1, 'used=' + S.save.freeEnergyUsed);
S.overlay = null;
S.save.energy = CFG.ECON.energyMax;

/* ================= 5. 音效素材 ================= */
console.log('\n==== 5. 音效素材（v0.31 重制） ====');
const md5 = f => require('crypto').createHash('md5').update(fs.readFileSync(f)).digest('hex');
function wavInfo(f) {
  const b = fs.readFileSync(f);
  if (b.toString('ascii', 0, 4) !== 'RIFF') return null;
  const ch = b.readUInt16LE(22), sr = b.readUInt32LE(24), bits = b.readUInt16LE(34);
  const dataLen = b.readUInt32LE(40);
  return { ch, sr, bits, dur: dataLen / (sr * ch * (bits / 8)) };
}
for (const n of ['sfx_tap', 'sfx_pick', 'sfx_snap', 'sfx_fail']) {
  const a = path.join(ROOT, 'preview/assets/audio', n + '.wav');
  const b = path.join(ROOT, 'miniprogram/assets/audio', n + '.wav');
  const ia = wavInfo(a);
  check(n + '.wav 两包一致 / 44.1kHz / 短促',
    fs.existsSync(a) && fs.existsSync(b) && md5(a) === md5(b) &&
    ia && ia.sr === 44100 && ia.dur < 0.35,
    ia ? `${ia.sr}Hz ${ia.bits}bit ${ia.dur.toFixed(3)}s` : '缺失');
}
const winA = path.join(ROOT, 'preview/assets/audio/sfx_win.mp3');
const winB = path.join(ROOT, 'miniprogram/assets/audio/sfx_win.mp3');
check('sfx_win.mp3 两包一致且体积可控（< 40KB）',
  fs.existsSync(winA) && fs.existsSync(winB) && md5(winA) === md5(winB) &&
  fs.statSync(winA).size < 40 * 1024,
  fs.existsSync(winA) ? fs.statSync(winA).size + ' B' : '缺失');

/* ================= 6. 三端一致 ================= */
console.log('\n==== 6. 三端一致 ====');
for (const m of ['config.js', 'core.js', 'geom.js', 'judge.js', 'levels.js']) {
  const a = path.join(ROOT, 'js', m);
  const b = path.join(ROOT, 'preview/js', m);
  const c = path.join(ROOT, 'miniprogram/js', m);
  check(m + ' 三端一致', md5(a) === md5(b) && md5(a) === md5(c));
}

console.log('\n' + (fail === 0 ? 'v0.31 验收全部通过' : `!! ${fail} 项未通过`));
process.exit(fail ? 1 : 0);
