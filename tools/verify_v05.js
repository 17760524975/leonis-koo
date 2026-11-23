/* v0.5 专项验收（纯 Node 无头，375×812 移动模拟）
 * 覆盖：倒计时/生命值/失败、广告+巧币复活、体力消耗与恢复、免费体力、
 *       巧币通关奖励与连胜、每日任务、在线奖励、皮肤切换、老存档兼容、BGM 场景切换。
 * 用法：node tools/verify_v05.js
 */
const path = require('path');
require('../js/levels.js');
const C = require('../js/config.js');
const CORE = require('../js/core.js');

let fail = 0;
function check(label, ok, detail) {
  if (!ok) fail++;
  console.log(`  [${ok ? 'OK' : 'XX'}] ${label}${detail ? '  ' + detail : ''}`);
}

/* ---------- Canvas / rAF mock ---------- */
function makeCtx() {
  const grad = { addColorStop() {} };
  return {
    set fillStyle(v) {}, get fillStyle() { return ''; },
    canvas: { width: 0, height: 0, style: {} },
    save() {}, restore() {}, translate() {}, scale() {}, rotate() {}, setTransform() {},
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, arcTo() {},
    ellipse() {}, quadraticCurveTo() {}, bezierCurveTo() {}, rect() {}, clip() {},
    fill() {}, stroke() {}, fillRect() {}, strokeRect() {}, clearRect() {},
    fillText() {}, strokeText() {}, setLineDash() {}, drawImage() {},
    measureText() { return { width: 40 }; },
    createLinearGradient() { return grad; }, createRadialGradient() { return grad; },
    createPattern() { return null; }
  };
}
let pendingFrame = null;
global.requestAnimationFrame = cb => { pendingFrame = cb; return 1; };
let clock = 0;
function step(ms) { clock += ms; const cb = pendingFrame; pendingFrame = null; if (cb) cb(clock); }

const store = {};
let sceneLog = [];
const W = 375, H = 812, DPR = 3;
let inputFn = null;
function makeEnv() {
  return {
    ctx: makeCtx(),
  tutorial: false,   // v0.21：这些脚本专测横向系统，关掉第 1 关教学
    size: () => ({ w: W, h: H }), dpr: () => DPR,
    safeInsets: () => ({ top: 20, bottom: 0 }),
    bindInput: fn => { inputFn = fn; },
    storage: { get: k => (k in store ? store[k] : null), set: (k, v) => { store[k] = v; } },
    audio: { unlock() {}, setEnabled() {}, play() {}, duck() {}, setVisible() {}, setScene(k) { sceneLog.push(k); } },
    vibrate() {}, images: {}, onHide() {}, onShow() {}, share() {}
  };
}
const scale = Math.min(W / C.DESIGN.w, H / C.DESIGN.h);
const ox = (W - C.DESIGN.w * scale) / 2, oy = (H - C.DESIGN.h * scale) / 2;
const WS = C.LAYOUT.BOARD.size / 1000;
function d2css(dx, dy) { return [ox + dx * scale, oy + dy * scale]; }
function dragD(a, b, n) {
  const p0 = d2css(a[0], a[1]); inputFn('down', p0[0], p0[1]); step(16);
  for (let i = 1; i <= n; i++) {
    const p = d2css(a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n);
    inputFn('move', p[0], p[1]); step(16);
  }
  const p1 = d2css(b[0], b[1]); inputFn('up', p1[0], p1[1]); step(16);
}

const game = CORE(makeEnv());
game.init();
step(16);
const S = game.state;
const D = game._debug;
const LEVELS = D.LEVELS;

function dayKey() {
  const d = new Date();
  return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}

console.log('==== 0. 初始存档（新玩家） ====');
check('初始巧币 = ' + C.ECON.coinInit, S.save.coin === C.ECON.coinInit, 'coin=' + S.save.coin);
check('初始体力 = ' + C.ECON.energyInit + ' / 上限 ' + C.ECON.energyMax,
  S.save.energy === C.ECON.energyInit && S.save.energyMax === C.ECON.energyMax);
check('初始在主界面', S.page === 'home');
check('默认皮肤 warm', S.save.skin === 'warm' && D.COLORS.bg === C.SKINS.warm.bg);

console.log('\n==== 1. 进关：扣体力 + 倒计时初始化 ====');
const e0 = S.save.energy;
D.fireBtn('start');
check('进关扣 ' + C.ECON.energyCostLevel + ' 点体力', S.save.energy === e0 - C.ECON.energyCostLevel,
  e0 + '→' + S.save.energy);
check('进入对局页', S.page === 'play');
const limit = S.timeLimit;
check('倒计时 = 关卡时限且落在 [90,240]',
  limit >= C.TIMER.minSec && limit <= C.TIMER.maxSec && S.timeLeft === limit,
  'limit=' + limit + 's left=' + S.timeLeft.toFixed(1));
check('初始 3 心', S.hearts === C.TIMER.hearts);
/* v0.16：每日任务下线，进关不再累加 taskPlays */
check('进关不再写 taskPlays（任务已下线）', S.save.taskPlays === undefined,
  'plays=' + S.save.taskPlays);

console.log('\n==== 2. 倒计时递减 → 生命值 ====');
const t0 = S.timeLeft;
for (let i = 0; i < 10; i++) step(16);      // 160ms
check('时间递减', S.timeLeft < t0 && S.timeLeft > t0 - 1,
  t0.toFixed(2) + '→' + S.timeLeft.toFixed(2));
const h3 = D.heartsOf(limit * 0.9, limit), h2 = D.heartsOf(limit * 0.5, limit),
  h1 = D.heartsOf(limit * 0.1, limit), h0 = D.heartsOf(0, limit);
check('生命值映射 3/2/1/0', h3 === 3 && h2 === 2 && h1 === 1 && h0 === 0,
  [h3, h2, h1, h0].join('/'));

console.log('\n==== 3. 时间归零 → 失败 + 广告复活 ====');
S.timeLeft = 0.004;
step(20);
check('归零触发失败弹窗', S.overlay === 'fail', 'overlay=' + S.overlay);
const coinBefore = S.save.coin, usedBefore = S.reviveUsed;
D.doRevive(true);                            // 看广告复活
check('广告复活：补 1/3 时间', S.timeLeft > 0 && Math.abs(S.timeLeft - limit / 3) < 1,
  'left=' + S.timeLeft.toFixed(1));
/* v0.23：看广告复活不再给巧币（旧版 +90，比付费复活还划算，
 * 最优策略变成"故意失败看广告"，与"别失败"的设计意图相反） */
check('广告复活：巧币不变', S.save.coin === coinBefore, coinBefore + '→' + S.save.coin);
check('复活后关闭弹窗并继续', S.overlay === null && S.running === true);
check('复活次数 +1', S.reviveUsed === usedBefore + 1);

console.log('\n==== 4. 巧币复活 + 不设次数上限 ====');
S.timeLeft = 0.004; step(20);
S.save.coin = 400;                           // v0.23：初始只有 50，不够一次 80
const cb2 = S.save.coin;
D.doRevive(false);                           // 花 80 巧币
check('巧币复活：-' + C.ECON.coinRevive + ' 巧币',
  S.save.coin === cb2 - C.ECON.coinRevive, cb2 + '→' + S.save.coin);
check('复活次数累加到 2', S.reviveUsed === 2, 'used=' + S.reviveUsed);
/* v0.23：取消每关 2 次上限 —— 想连着复活就一直复活得下去 */
for (let ri = 0; ri < 3; ri++) {
  S.timeLeft = 0.004; step(20);
  D.doRevive(true);
}
check('第 3~5 次复活仍然成功（不再有"次数已用完"）',
  S.reviveUsed === 5 && S.overlay === null && S.running === true,
  'used=' + S.reviveUsed + ' overlay=' + S.overlay);
check('复活上限字段已从配置移除', C.ECON.reviveMaxPerLevel === undefined,
  String(C.ECON.reviveMaxPerLevel));

console.log('\n==== 5. 体力不足 → 免费体力弹窗 ====');
S.overlay = null; S.page = 'home';
S.save.energy = 0;
D.fireBtn('start');
check('体力 0 时拦截进关并弹「免费体力」', S.overlay === 'energy' && S.page === 'home',
  'overlay=' + S.overlay);

console.log('\n==== 6. 体力按时间戳恢复 ====');
S.save.energy = 0;
S.save.energyTs = Date.now() - (C.ECON.energyRecoverSec * 2 + 5) * 1000;  // 2 个周期
D.syncEnergy(true);
check('离线 2 个周期恢复 +2 点', S.save.energy === 2, 'energy=' + S.save.energy);
S.save.energy = S.save.energyMax;
S.save.energyTs = Date.now() - C.ECON.energyRecoverSec * 10 * 1000;
D.syncEnergy(true);
check('满体力不溢出（封顶 ' + C.ECON.energyMax + '）', S.save.energy === C.ECON.energyMax);

console.log('\n==== 7. 免费体力（分享 / 广告 4 倍） ====');
S.save.energy = 0; S.save.freeEnergyDay = ''; S.save.freeEnergyUsed = 0;
D.grantFreeEnergy(true);                     // 广告：+2×4
check('看广告 +8 体力', S.save.energy === C.ECON.freeEnergyShare * C.ECON.freeEnergyAdMul,
  'energy=' + S.save.energy);
check('每日次数计数 +1', S.save.freeEnergyUsed === 1);
for (let i = 0; i < 5; i++) D.grantFreeEnergy(false);
check('每日 3 次上限（超出不再发）', S.save.freeEnergyUsed === C.ECON.freeEnergyPerDay,
  'used=' + S.save.freeEnergyUsed);

console.log('\n==== 8. 通关奖励巧币 + 连胜 + BGM 换曲 ====');
sceneLog = [];
const coinW = S.save.coin, streakW = S.save.streak || 0, bgmW = S.save.bgmIdx || 0;
(function winOnce() {
  D.setupLevel(0);
  S.page = 'play'; S.fade = 1; S.pageT = 9999;
  S.overlay = null; S.win = null; S.result = null;
  const lv = LEVELS[0];
  S.pieces.forEach(p => {
    const st = lv.solution.find(s => s.id === p.id);
    p.onBoard = true; p.x = st.x; p.y = st.y;
    p.angle = st.angle; p.dAngle = st.angle;
    p.flipped = st.flipped; p.dFlipped = st.flipped;
  });
  S.steps = 0; S.elapsed = 0;
  step(16);
  const dp = S.pieces[0];
  const x0 = C.LAYOUT.BOARD.x + dp.x * WS;
  const y0 = C.LAYOUT.BOARD.y + dp.y * WS;
  dragD([x0, y0], [x0 + 2, y0 + 1], 3);
  for (let i = 0; i < 12; i++) step(16);
})();
check('通关后有结算结果', !!S.result, S.result ? ('stars=' + S.result.stars) : 'null');
const gained = S.save.coin - coinW;
/* v0.23：首通按星级 2/3/5，重复通关 0 */
const wantGain = S.result.first ? C.ECON.coinFirst[S.result.stars - 1] : 0;
check('通关奖励巧币（首通按星级 ' + C.ECON.coinFirst.join('/') + '，重复 0）',
  gained === wantGain, '+' + gained + ' first=' + S.result.first + ' stars=' + S.result.stars);
check('连胜 +1', S.save.streak === streakW + 1, streakW + '→' + S.save.streak);
/* v0.11 变更：BGM 改为真人 mp3，按「关卡序号 / 每 5 关」取曲。
 * 一关之内不换曲、结算页也不换——所以这里断言"通关没有触发任何切曲"。
 * 换曲只发生在进入下一关（verify_v11 覆盖映射规则）。 */
check('通关不切曲（一关一首，结算页沿用）', S.save.bgmIdx === bgmW && sceneLog.indexOf('win') < 0,
  'bgmIdx=' + S.save.bgmIdx + ' scenes=' + sceneLog.join(','));

console.log('\n==== 9. 每日任务（v0.16 已下线，完整用例见 verify_v16） ====');
/* 用户 v0.16 要求：主页「任务」入口整块去掉。
 * 这里只留最小回归：存档不再带任务字段、调试接口不再暴露任务函数。 */
check('存档默认值不再含 tasksDay / tasksClaimed / taskPlays',
  S.save.tasksDay === undefined && S.save.tasksClaimed === undefined && S.save.taskPlays === undefined);
check('调试接口不再暴露 claimTask / taskList',
  D.claimTask === undefined && D.taskList === undefined);
check('配置里任务奖励字段已移除',
  C.ECON.taskCoin === undefined && C.ECON.taskCoin3 === undefined && C.ECON.taskPlays === undefined);

console.log('\n==== 10. 在线奖励（v0.15 起改为 6 档累计，完整用例见 verify_v15） ====');
/* 旧的「每 3 分钟领 10 巧币」已被按累计时长解锁的 6 档取代。
 * 这里只保留最小回归：字段存在 + 第一档能领 + 不能重复领。 */
check('存档有在线累计字段（onlineDay / onlineSec / onlineGot）',
  typeof S.save.onlineDay === 'string' && typeof S.save.onlineSec === 'number' &&
  !!S.save.onlineGot && typeof S.save.onlineGot === 'object');
check('旧的 onlineTs 字段已移除', S.save.onlineTs === undefined);
S.save.onlineSec = 70;
S.save.onlineGot = {};
const cOn = S.save.coin;
check('到点可领（1 分钟档）', D.onlineClaim('o1') === true);
check('领取 +5 巧币', S.save.coin === cOn + 5, cOn + '→' + S.save.coin);
check('重复领取无效', D.onlineClaim('o1') === false && S.save.coin === cOn + 5);

console.log('\n==== 11. 皮肤切换 ====');
D.applySkin('mint');
check('切薄荷：配色即时生效 + 存档', D.COLORS.bg === C.SKINS.mint.bg && S.save.skin === 'mint',
  'bg=' + D.COLORS.bg);
D.applySkin('night');
check('切夜空：配色即时生效', D.COLORS.bg === C.SKINS.night.bg && S.save.skin === 'night');
D.applySkin('warm');
check('切回暖木', D.COLORS.bg === C.SKINS.warm.bg && S.save.skin === 'warm');

console.log('\n==== 12. 老存档兼容（v0.4 存档无经济字段） ====');
store['tangram_save_v1'] = JSON.stringify({
  playerId: 'local', starOf: { '1': 3, '2': 2 }, unlockedMax: 3,
  bestTime: {}, hintUsed: {}, settings: { sfx: true, bgm: true }
});
const g2 = CORE(makeEnv());
g2.init();
const S2 = g2.state;
check('老存档：星星/进度不丢', S2.save.starOf['1'] === 3 && S2.save.unlockedMax === 3);
check('老存档：补发初始巧币', S2.save.coin === C.ECON.coinInit, 'coin=' + S2.save.coin);
check('老存档：补满体力', S2.save.energy === C.ECON.energyInit && S2.save.energyMax === C.ECON.energyMax);
check('老存档：皮肤默认暖木', S2.save.skin === 'warm');

console.log('\n' + (fail === 0 ? 'v0.5 经济/生命值验收全部通过' : `!! ${fail} 项未通过`));
process.exit(fail === 0 ? 0 : 1);
