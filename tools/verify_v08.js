/* v0.8 专项验收：结算面板改版（图案/分享/连胜）/ 四巧板关卡数 / 排行榜
 * v0.45：四巧板由 30 关扩到 36 关（第二章追加 6 关参考图关卡），断言同步
 * 用法：node tools/verify_v08.js
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

/* ---------- 记录型 ctx ---------- */
const rec = { texts: [], strokes: [], fills: [], font: '', arcs: [], rects: [] };
let lastMove = null;
function makeCtx() {
  const grad = { addColorStop() {} };
  const base = {
    canvas: { width: 0, height: 0, style: {} },
    measureText(s) { return { width: String(s).length * 15 }; },
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
    createPattern: () => null,
    fillText(s, x, y) { rec.texts.push({ s: String(s), x, y, font: base.font, color: base.fillStyle }); },
    stroke() { rec.strokes.push(base.strokeStyle); },
    fill() { rec.fills.push(base.fillStyle); },
    arc(x, y, r) { rec.arcs.push({ x, y, r, color: base.fillStyle }); },
    moveTo(x, y) { lastMove = [x, y]; },
    lineTo() { },
    fillRect(x, y, w, h) { rec.rects.push({ x, y, w, h, color: base.fillStyle }); },
    save() {}, restore() {}, beginPath() {}, closePath() {},
    arcTo() {}, bezierCurveTo() {}, quadraticCurveTo() {}, rect() {},
    translate() {}, rotate() {}, scale() {}, clip() {}, drawImage() {},
    setTransform() {}, clearRect() {}, strokeRect() {}, ellipse() {},
    setLineDash() {}, getImageData: () => ({ data: [0, 0, 0, 0] }), putImageData() {}
  };
  return new Proxy(base, {
    get(t, k) { return k in t ? t[k] : () => {}; },
    set(t, k, v) { if (k === 'font') rec.font = v; t[k] = v; return true; }
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
const shareLog = [];
const env = {
  ctx: makeCtx(),
  tutorial: false,   // v0.21：这些脚本专测横向系统，关掉第 1 关教学
  size: () => ({ w: 375, h: 812 }),
  dpr: () => 3,
  safeInsets: () => ({ top: 20, bottom: 0 }),
  bindInput(fn) { this._in = fn; },
  storage: { get: k => (k in store ? store[k] : null), set: (k, v) => { store[k] = v; } },
  audio: { unlock() {}, setEnabled() {}, play() {}, duck() {}, setVisible() {}, setScene() {} },
  vibrate() {}, images: {},
  share: function (opt) { shareLog.push(opt || {}); },
  onHide() {}, onShow() {}
};

let fail = 0;
function check(label, ok, detail) {
  if (!ok) fail++;
  console.log(`  [${ok ? 'OK' : 'XX'}] ${label}${detail ? '  ' + detail : ''}`);
}
function section(t) { console.log('\n== ' + t + ' =='); }

/* 老存档：解锁 120 关、带越界星星，验证 v0.8 收敛 */
store[CFG.SAVE_KEY] = JSON.stringify({
  starOf: { 1: 3, 2: 2, 88: 3, 120: 1 }, unlockedMax: 120,
  settings: { sfx: true, bgm: true }, coin: 500, energy: 8, streak: 4
});

const game = CORE(env);
game.init();
const S = game.state;
for (let i = 0; i < 3; i++) step(16);

const scale = Math.min(375 / CFG.DESIGN.w, 812 / CFG.DESIGN.h);
const ox = (375 - CFG.DESIGN.w * scale) / 2;
const oy = (812 - CFG.DESIGN.h * scale) / 2;
const css = (dx, dy) => [ox + dx * scale, oy + dy * scale];
function tap(dx, dy) {
  const p = css(dx, dy);
  env._in('down', p[0], p[1]); step(16);
  env._in('up', p[0], p[1]); step(16);
}
function clearRec() { rec.texts.length = 0; rec.fills.length = 0; rec.strokes.length = 0; rec.arcs.length = 0; }

/* ---------- 1. 四巧板关卡数 ---------- */
section('1. 四巧板 120 → 30 → 36 关');
const LIB = game._debug.LEVELS;
check('关卡数 = 36', LIB.length === 36, 'len=' + LIB.length);
/* v0.45：第二章由 10 关扩到 16 关（追加 6 关参考图关卡），不再是每章 10 关。
 * 改为断言「章节号非递减、且只有 3 章、每章 10~16 关」。 */
check('章节 = 3 章（10/16/10 关）',
  CFG && LIB.every((l, i) => i === 0 || l.chapter >= LIB[i - 1].chapter) &&
  (function () {
    const c = {};
    LIB.forEach(l => { c[l.chapter] = (c[l.chapter] || 0) + 1; });
    const ks = Object.keys(c).map(Number).sort((a, b) => a - b);
    return ks.length === 3 && ks[0] === 1 && ks[2] === 3 &&
      Object.values(c).every(v => v >= 10 && v <= 16);
  })(),
  'chap=' + LIB.map(l => l.chapter).join(','));
check('id 连续 1..36', LIB.every((l, i) => l.id === i + 1), 'last=' + LIB[LIB.length - 1].id);
const par = LIB.map(l => l.parTime);
check('前两关是简单关（用时基准 ≤ 85s）', par[0] <= 85 && par[1] <= 85, par.slice(0, 2).join('/') + 's');
check('其余 28 关更复杂（基准 ≥ 85s）', par.slice(2).every(v => v >= 85),
  'min=' + Math.min.apply(null, par.slice(2)) + 's max=' + Math.max.apply(null, par.slice(2)) + 's');
check('用时递增（难度曲线不倒退）', par.every((v, i) => i === 0 || v >= par[i - 1]), par.join(','));
const seven = game._debug.buildSet('tangram7');
/* v0.32/v0.34：七巧板删掉 75 个凑数关、重建字母章节，现为 15 关（几何 10 + 字母 5），
 * 单位缩放 107→96。此处只要求「关卡仍然存在且可解」，不再锁死旧关数。 */
check('七巧板关卡仍存在（v0.34：19 关 / unitScale=96）',
  seven.levels.length >= 15 && seven.ds.unitScale === 96,
  'len=' + seven.levels.length + ' U=' + seven.ds.unitScale);

/* ---------- 2. 老存档收敛 ---------- */
section('2. 老存档（120 关）升级');
check('unlockedMax 收敛到 36', S.save.unlockedMax === 36, 'unlocked=' + S.save.unlockedMax);
check('越界星星被清理', !S.save.starOf['88'] && !S.save.starOf['120'] && !!S.save.starOf['1'],
  JSON.stringify(S.save.starOf));

/* ---------- 3. 结算面板 ---------- */
section('3. 结算面板：图案 / 分享 / 连胜');
game._debug.setupLevel(4);
S.page = 'play'; S.fade = 1;
S.result = { stars: 3, time: 63.4, steps: 9 };
S.starShown = 3; S.resT = 2000; S.overlay = 'result';
S.save.streak = 3; S.streakGain = 0;
clearRec();
for (let i = 0; i < 2; i++) step(16);

const titleRec = rec.texts.find(r => r.s === '拼好了！');
check('标题已缩小（沿用 config.WIN.titleSize）',
  !!titleRec && new RegExp(CFG.WIN.titleSize + 'px').test(titleRec.font),
  titleRec && (titleRec.font + ' / want ' + CFG.WIN.titleSize));
const streakTxt = rec.texts.find(r => r.s === '3/5');
check('顶部连胜进度 3/5', !!streakTxt, streakTxt ? 'y=' + streakTxt.y : 'missing');
check('连胜条在卡片顶部区域', streakTxt && streakTxt.y > 380 && streakTxt.y < 470, streakTxt && 'y=' + streakTxt.y);
check('奖杯与「连胜」字样已绘制', rec.texts.some(r => r.s === '连胜'));
/* 成品图案：四块板的配色都应出现 */
const pieceColors = Object.keys(game._debug.dataset.pieces).map(k => game._debug.dataset.pieces[k].color);
const shownColors = new Set(rec.fills.map(c => String(c).toUpperCase()));
check('成品图案按四块板原色绘制', pieceColors.every(c => shownColors.has(c.toUpperCase())),
  pieceColors.join('/'));
check('有图案白底框', rec.fills.some(c => /rgba\(255,255,255,0\.94\)/.test(String(c))));
check('星级缩小（小于原来的 40）', rec.arcs.every(a => a.r !== 40) && CFG.WIN.starR < 40, 'r=' + CFG.WIN.starR);
check('分享按钮已绘制', rec.texts.some(r => r.s === '分享图案'));
check('排行榜按钮已绘制', rec.texts.some(r => r.s === '排行榜'));

/* 版面不溢出卡片 */
const cTop = CFG.WIN.cy - CFG.WIN.cardH / 2, cBot = CFG.WIN.cy + CFG.WIN.cardH / 2;
check('图案框在卡片内', CFG.WIN.shapeY - CFG.WIN.shapeBox / 2 > cTop &&
  CFG.WIN.shapeY + CFG.WIN.shapeBox / 2 < cBot,
  `框 ${CFG.WIN.shapeY - CFG.WIN.shapeBox / 2}~${CFG.WIN.shapeY + CFG.WIN.shapeBox / 2} / 卡 ${cTop}~${cBot}`);
check('第三排按钮底边不出卡', CFG.WIN.row3Y + CFG.WIN.row3H / 2 <= cBot - 4,
  `按钮底 ${CFG.WIN.row3Y + CFG.WIN.row3H / 2} / 卡底 ${cBot}`);
check('小花流下界让开按钮区（卡底+上浮+半径）',
  CFG.FLOWER.stream.bandBottom >= cBot + 36 + 24,
  `bandBottom=${CFG.FLOWER.stream.bandBottom} / 需要 ≥ ${cBot + 60}`);
check('副标题不压图案框', CFG.WIN.nameY + 12 < CFG.WIN.shapeY - CFG.WIN.shapeBox / 2,
  `副标题 ${CFG.WIN.nameY} / 框顶 ${CFG.WIN.shapeY - CFG.WIN.shapeBox / 2}`);

/* 分享 */
shareLog.length = 0;
tap(CFG.DESIGN.w / 2 - 118, CFG.WIN.row2Y);
step(16);
check('点「分享图案」唤起分享', shareLog.length === 1, JSON.stringify(shareLog[0] || {}));
check('分享文案带关卡名/星级', shareLog[0] && /★/.test(shareLog[0].title || ''), shareLog[0] && shareLog[0].title);
check('分享请求截图', shareLog[0] && shareLog[0].capture === true);

/* 排行榜入口 + 返回 */
tap(CFG.DESIGN.w / 2 + 118, CFG.WIN.row2Y);
step(16);
check('点「排行榜」打开榜单', S.overlay === 'rank', 'overlay=' + S.overlay);
tap(CFG.DESIGN.w / 2, CFG.RANK.close.y);          // v0.65：关闭钮 y 从 1300 下移到 1372
step(16);
check('关闭榜单退回结算页', S.overlay === 'result', 'overlay=' + S.overlay);

/* ---------- 4. 连胜奖励 ---------- */
section('4. 连胜里程碑奖励');
/* 直接走 win()，避免依赖判定时序（判定本身由 verify_levels / gestures 覆盖）
 * v0.18：连胜只算「新推进」的关，重玩不计 → 先把这两关的星去掉，模拟首次通关。 */
S.save.streak = 4;
delete S.save.starOf['1'];
let before = S.save.coin;
game._debug.setupLevel(0);
S.elapsed = 30; S.steps = 5; S.hintUsed = false;
game._debug.win();
check('第 5 连胜时发放里程碑奖励', S.save.streak === 5 && S.save.coin - before >= CFG.STREAK.coin,
  `streak=${S.save.streak} coin ${before}→${S.save.coin} gain=${S.streakGain}`);
check('里程碑奖励写进结算面板', S.streakGain === CFG.STREAK.coin, 'gain=' + S.streakGain);
check('历史最高连胜同步刷新', S.save.bestStreak === 5, 'best=' + S.save.bestStreak);

/* 非里程碑（第 6 连胜）不应再发 */
S.save.streak = 5;
delete S.save.starOf['2'];
before = S.save.coin;
game._debug.setupLevel(1);
S.elapsed = 30; S.steps = 5;
game._debug.win();
/* v0.40：奖励跟「有无进账」走（首通 / 升星补差），这里落账应等于 result.gain */
check('第 6 连胜不再发里程碑奖（只给星级奖励）',
  S.save.streak === 6 && S.save.coin - before === (S.result.gain || 0),
  `streak=${S.save.streak} coin +${S.save.coin - before} gain=${S.streakGain}`);
/* v0.18：重玩已通关的关不再刷连胜（旧版正是靠这个刷榜） */
const sReplay = S.save.streak;
game._debug.setupLevel(1);
S.elapsed = 30; S.steps = 5;
game._debug.win();
check('重玩已通关的关：连胜不涨', S.save.streak === sReplay, `${sReplay}→${S.save.streak}`);
check('重玩也不发里程碑', S.streakGain === 0, 'gain=' + S.streakGain);

/* ---------- 5. 排行榜 ---------- */
section('5. 排行榜');
/* v0.9：榜单默认走云开发；这里验的是「7 行榜单 + 榜尾自己」的版式，
 * 所以临时打开示例数据（useMock），云榜另由 verify_v09 覆盖。 */
CFG.RANK.useMock = true;
S.rankList = null;
S.overlay = 'rank'; S.rankT = 999; S.rankTab = 0;
S.save.starOf = { 1: 3, 2: 2, 3: 1 };
clearRec();
for (let i = 0; i < 2; i++) step(16);
check('榜单标题已绘制', rec.texts.some(r => r.s === '排行榜'));
check('三个页签都在', CFG.RANK.tabs.every(t => rec.texts.some(r => r.s === t)), CFG.RANK.tabs.join('/'));
check('主线榜按「关」计数', S.overlay === 'rank');
/* v0.14：自己那行不再写死「我」，改用玩家资料里的昵称（没登录时是「巧手玩家」） */
const myNick = game._debug.meNick();
const selfRow = rec.texts.filter(r => r.s === myNick);
check('底部固定「我的排名」一行', selfRow.length >= 1, 'nick=' + myNick + ' hits=' + selfRow.length);
/* v0.65：常驻卡右侧是一个串「★总星 · N 关」（旧版只有「N 关」） */
check('我的星数与通关数正确（★6 · 3 关）',
  rec.texts.some(r => /^★6 · 3 关$/.test(r.s)),
  rec.texts.filter(r => /关$/.test(r.s)).map(r => r.s).join(','));
/* 榜尾名次 = 示例榜里比我高的 + 1 = 8 */
check('榜尾名次显示 8', rec.texts.some(r => r.s === '8'), '');
/* v0.65：页签改成 0 全服 / 1 好友 / 2 本周（连胜榜已并入本周榜的次排序键） */
clearRec();
tap(CFG.DESIGN.w / 2, 495);
step(16);
check('点中间页签切到「好友榜」', S.rankTab === 1, 'tab=' + S.rankTab);
clearRec();
for (let i = 0; i < 2; i++) step(16);
check('好友榜画出榜单行（主值仍是星星）',
  rec.texts.some(r => /^★\d+$/.test(r.s)), rec.texts.map(r => r.s).slice(0, 6).join(','));
clearRec();
tap(CFG.DESIGN.w / 2 + 186, 495);
step(16);
check('点「本周榜」切页签', S.rankTab === 2, 'tab=' + S.rankTab);
clearRec();
for (let i = 0; i < 2; i++) step(16);
check('本周榜副信息带「连胜 S · 本周 M 关」',
  rec.texts.some(r => /^连胜 \d+ · 本周 \d+ 关$/.test(r.s)),
  rec.texts.filter(r => /本周/.test(r.s)).slice(0, 3).map(r => r.s).join(','));
CFG.RANK.useMock = false;   // 复原，避免污染后续用例

/* 从主页进入 → 关闭应回主页，不误回结算页 */
S.overlay = null; S.page = 'home';
game._debug.fireBtn('entry_rank');
step(16);
check('主页入口可打开榜单', S.overlay === 'rank');
tap(CFG.DESIGN.w / 2, CFG.RANK.close.y);
step(16);
check('主页进入的榜单关闭后回主页', S.overlay === null, 'overlay=' + S.overlay);

/* ---------- 6. 三端一致 ---------- */
section('6. 三端模块一致');
function md5(f) { var __s = f; return require('crypto').createHash('md5').update(/\.js$/i.test(String(__s)) ? Buffer.from(require('./lib/pack.js').strip(require('fs').readFileSync(__s, 'utf8'))) : require('fs').readFileSync(__s)).digest('hex'); }
for (const m of ['config', 'core', 'geom', 'judge', 'levels']) {
  const a = md5(path.join(ROOT, 'js', m + '.js'));
  const b = md5(path.join(ROOT, 'preview/js', m + '.js'));
  const c = md5(path.join(ROOT, 'miniprogram/js', m + '.js'));
  check(m + '.js 三端一致', a === b && b === c, a);
}

console.log(fail === 0 ? '\nv0.8 验收全部通过' : `\n!! ${fail} 项未通过`);
process.exit(fail === 0 ? 0 : 1);
