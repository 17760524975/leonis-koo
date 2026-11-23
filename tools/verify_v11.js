/* v0.11 专项验收：提示可见性修复 + 真人 BGM 换曲规则 + 云环境
 * 用法：node tools/verify_v11.js
 *
 * 覆盖用户这次提的三件事：
 *   1) 已经拖了几块上棋盘后，按提示"看不见怎么拼" —— 根因是提示层画在板件之下；
 *   2) 音乐换成 audio/ 里的 5 首 mp3：主页 1 首 + 关卡 4 首，每 5 关换一首；
 *   3) 云开发环境与权限（环境 ID / 资源体积 / 包体）。
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');

/* ---------- 记录型 ctx：按绘制顺序记录每次 fill / stroke / text ---------- */
const rec = { ops: [], texts: [] };
let seq = 0;
function makeCtx() {
  const grad = { addColorStop() {} };
  const base = {
    canvas: { width: 0, height: 0, style: {} },
    globalAlpha: 1,
    measureText(s) { return { width: String(s).length * 15 }; },
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
    createPattern: () => null,
    fillText(s, x, y) {
      rec.texts.push({ s: String(s), x, y, color: base.fillStyle, alpha: base.globalAlpha, seq: ++seq });
    },
    stroke() { rec.ops.push({ k: 'stroke', color: base.strokeStyle, w: base.lineWidth, a: base.globalAlpha, seq: ++seq }); },
    fill() { rec.ops.push({ k: 'fill', color: base.fillStyle, a: base.globalAlpha, seq: ++seq }); },
    fillRect(x, y, w, h) { rec.ops.push({ k: 'fill', color: base.fillStyle, a: base.globalAlpha, seq: ++seq }); },
    arc() {}, moveTo() {}, lineTo() {},
    setLineDash(d) { base._dash = d; },
    save() { this._st = { a: base.globalAlpha }; },
    restore() { if (this._st) base.globalAlpha = this._st.a; },
    beginPath() {}, closePath() {}, arcTo() {},
    bezierCurveTo() {}, quadraticCurveTo() {}, rect() {}, translate() {},
    rotate() {}, scale() {}, clip() {}, drawImage() {}, setTransform() {},
    clearRect() {}, strokeRect() {}, ellipse() {}
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

const store = {};
const sceneLog = [];
const env = {
  ctx: makeCtx(),
  tutorial: false,   // v0.21：这些脚本专测横向系统，关掉第 1 关教学
  size: () => ({ w: 375, h: 812 }),
  dpr: () => 3,
  safeInsets: () => ({ top: 20, bottom: 0 }),
  bindInput(fn) { env._in = fn; },
  storage: { get: k => (k in store ? store[k] : null), set: (k, v) => { store[k] = v; } },
  audio: { unlock() {}, setEnabled() {}, play() {}, duck() {}, setVisible() {}, setScene(k) { sceneLog.push(k); } },
  vibrate() {}, images: {},
  share() {}, onHide() {}, onShow() {},
  cloud: {
    enabled: () => false, init(cb) { setTimeout(() => cb('no-cloud'), 0); },
    load(cb) { setTimeout(() => cb('no-cloud'), 0); },
    save(p, cb) { setTimeout(() => cb(null, {}), 0); },
    rank(t, cb) { setTimeout(() => cb(null, { list: [], me: null }), 0); }
  },
  ad: { placeholder: true, banner() {}, rewarded(kind, cb) { cb(true, ''); } }
};

let game, S, D, WS;
const SCALE = Math.min(375 / CFG.DESIGN.w, 812 / CFG.DESIGN.h);
const css = (x, y) => [x * SCALE, y * SCALE];
function tapD(x, y) {
  const p = css(x, y);
  env._in('down', p[0], p[1]); step(16);
  env._in('up', p[0], p[1]); step(16);
}
const TB = CFG.LAYOUT.TOOLBAR;
const TOOL_X0 = CFG.LAYOUT.BOARD.x + (CFG.LAYOUT.BOARD.size - (5 * TB.w + 4 * TB.gap)) / 2;
const HINT_X = TOOL_X0 + 3 * (TB.w + TB.gap) + TB.w / 2;
const HINT_Y = TB.y + TB.h / 2;

/* 把前 n 块按标准解放上板；rest=misplaced 时把第 n+1 块放歪 */
function playAt(idx) {
  D.setupLevel(idx);
  S.page = 'play'; S.fade = 1; S.pageT = 9999;
  S.overlay = null; S.win = null; S.result = null;
}
function placePieces(n) {
  const lv = D.LEVELS[S.levelIdx];
  for (let i = 0; i < n && i < S.pieces.length; i++) {
    const p = S.pieces[i];
    const st = lv.solution.filter(x => x.id === p.id)[0];
    if (!st) continue;
    p.onBoard = true; p.x = st.x; p.y = st.y;
    p.angle = st.angle; p.dAngle = st.angle;
    p.flipped = st.flipped; p.dFlipped = st.flipped;
  }
}
function misplacePiece(i) {
  const p = S.pieces[i];
  p.onBoard = true;
  p.x = 380; p.y = 300; p.angle = 45; p.dAngle = 45;
  p.flipped = false; p.dFlipped = false;
}
/* v0.16：提示取消免费档 —— 统一走「发 1 个查找道具 → 开面板 → 用道具」，
 * 这样本文件继续只验「选块/绘制层级」，付费路径交给 verify_v10 / verify_v16。 */
function hintByItem() {
  S.save.hintItems = (S.save.hintItems || 0) + 1;
  D.fireBtn('hint');
  D.fireBtn('hint_item');
}
function md5(p) { return crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex'); }
function walkSize(dir) {
  /* 微信主包 = miniprogram 根 - cloudfunctionRoot；云函数的 node_modules
   * 既不进包体也不该入库（部署时云端安装依赖），这里一并跳过。
   * v0.16：再跳过 .git —— 目录里曾出现一个误 init 的内嵌仓库（2.6MB），
   * 它不是包体内容，不该把「主包 < 4MB」的断言顶爆。 */
  const SKIP = ['cloudfunctions', 'node_modules', '.cloudbase', '.git'];
  let total = 0;
  for (const f of fs.readdirSync(dir)) {
    if (SKIP.indexOf(f) >= 0) continue;
    const p = path.join(dir, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) total += walkSize(p); else total += st.size;
  }
  return total;
}

game = CORE(env);
game.init();
S = game.state;
D = game._debug;
WS = CFG.LAYOUT.BOARD.size / 1000;

console.log('v0.11 验收：提示可见性 + 真人 BGM + 云环境');
section('1. 版本与云环境');
/* v0.14.1 起允许补丁位（v0.14.1），所以正则放开 .N */
check('版本号 v0.11+', /^v0\.(1[1-9]|[2-9]\d)(\.\d+)?$/.test(CFG.version), CFG.version);
check('云环境 ID 已填', CFG.CLOUD.envId === 'cloud1-d4g6rm6duad5ba0aa', CFG.CLOUD.envId);

section('2. BGM 换曲规则：每 5 关一首，按文件名数字顺序');
const cases = [[0, 'lv1'], [4, 'lv1'], [5, 'lv2'], [9, 'lv2'], [10, 'lv3'], [14, 'lv3'], [15, 'lv4'], [19, 'lv4'], [20, 'lv1'], [29, 'lv2']];
for (const [idx, want] of cases) {
  sceneLog.length = 0;
  D.setupLevel(idx);
  D.go('play');
  check(`第 ${idx + 1} 关 → ${want}`, sceneLog[sceneLog.length - 1] === want, 'scenes=' + sceneLog.join(','));
}
sceneLog.length = 0; D.go('home');
check('主页固定播 home', sceneLog[sceneLog.length - 1] === 'home', sceneLog.join(','));

/* 通关不换曲：win 里已经删掉 setScene('win')，源码与运行双保险 */
const coreSrc = fs.readFileSync(path.join(ROOT, 'js/core.js'), 'utf8');
check('通关不再切 win 场景', !/setScene\(['"]win['"]\)/.test(coreSrc));
check('换曲只发生在进关/回主页', (coreSrc.match(/setScene\(/g) || []).length <= 4,
  'setScene 调用 ' + (coreSrc.match(/setScene\(/g) || []).length + ' 处');

section('3. mp3 资源与包体');
const assets = ['preview/assets/audio', 'miniprogram/assets/audio'];
for (const dir of assets) {
  const d = path.join(ROOT, dir);
  /* v0.12：主页换成合成和弦，assets 里只留 4 首关卡曲 */
  const want = ['bgm_lv1.mp3', 'bgm_lv2.mp3', 'bgm_lv3.mp3', 'bgm_lv4.mp3'];
  check(`${dir} 四首关卡曲齐`, want.every(f => fs.existsSync(path.join(d, f))), want.join(','));
  check(`${dir} 已删旧 bgm_main / bgm_home`,
    !fs.existsSync(path.join(d, 'bgm_main.mp3')) && !fs.existsSync(path.join(d, 'bgm_home.mp3')));
  const sizes = want.map(f => fs.existsSync(path.join(d, f)) ? fs.statSync(path.join(d, f)).size : 0);
  check(`${dir} 单曲 < 700KB`, sizes.every(s => s > 0 && s <= 700 * 1024), sizes.map(s => Math.round(s / 1024) + 'KB').join(' / '));
  const sum = sizes.reduce((a, b) => a + b, 0);
  check(`${dir} 关卡 BGM 合计 < 2.5MB`, sum < 2.5 * 1024 * 1024, (sum / 1024 / 1024).toFixed(2) + 'MB');
}
const pkg = walkSize(path.join(ROOT, 'miniprogram'));
check('小游戏主包 < 4MB（微信硬限制）', pkg < 4 * 1024 * 1024, (pkg / 1024 / 1024).toFixed(2) + 'MB');
check('配置里的关卡曲名与文件一致',
  CFG.AUDIO.bgm.lv.every(f => fs.existsSync(path.join(ROOT, 'miniprogram/assets/audio', f))));
check('主页不再引用任何音频文件', CFG.AUDIO.bgm.home === '', "'" + CFG.AUDIO.bgm.home + "'");

section('4. 提示选块：先挑没上板的，再挑上板没放对的');
playAt(0);
placePieces(2);
S.hintLv = 0; S.hint = null;
hintByItem();
check('有未上板的块时指向它', !!(S.hint && S.hint.id) && !S.pieces.filter(p => p.id === S.hint.id)[0].onBoard,
  'hint=' + (S.hint && S.hint.id));

playAt(0);
placePieces(S.pieces.length - 1);
misplacePiece(S.pieces.length - 1);          // 全部上板，最后一块放歪
S.hintLv = 0; S.hint = null;
hintByItem();
check('全部上板时指向"放歪的那块"', !!(S.hint && S.hint.id) && S.hint.id === S.pieces[S.pieces.length - 1].id,
  'hint=' + (S.hint && S.hint.id) + ' 期望=' + S.pieces[S.pieces.length - 1].id);
check('放歪时档位仍然前进', S.hintLv === 1, 'hintLv=' + S.hintLv);

playAt(0);
placePieces(S.pieces.length);
S.hintLv = 0; S.hint = null;
hintByItem();
check('全部放对时不乱指（返回 null + 提示）', !S.hint, 'hint=' + JSON.stringify(S.hint));
check('全部放对时不吞查找道具（先验后扣）', S.save.hintItems === 1, 'items=' + S.save.hintItems);

section('5. 提示画在已上板件之上（本次核心修复）');
playAt(0);
placePieces(2);
S.hint = { id: (function () {
  const un = S.pieces.filter(p => !p.onBoard);
  return un.length ? un[0].id : S.pieces[0].id;
})(), tier: 2, until: Date.now() + 1e6 };
rec.ops.length = 0; rec.texts.length = 0;
step(16);
const gold = '#FFB93D'.toLowerCase();
const boardFills = rec.ops.filter(o => o.k === 'fill' && S.pieces.some(p =>
  p.onBoard && (D.dataset.pieces[p.id].color || '').toLowerCase() === String(o.color).toLowerCase()));
const hintStrokes = rec.ops.filter(o => o.k === 'stroke' && String(o.color).toLowerCase() === gold);
const lastBoard = boardFills.length ? Math.max(...boardFills.map(o => o.seq)) : 0;
const firstHint = hintStrokes.length ? Math.min(...hintStrokes.map(o => o.seq)) : 1e9;
check('已上板件确实画出来了', boardFills.length > 0, 'fills=' + boardFills.length);
check('金色提示描边画在板件之后（不会被压住）', hintStrokes.length > 0 && firstHint > lastBoard,
  `board.seq<=${lastBoard} hint.seq>=${firstHint}`);
check('落点有「放这里」小牌', rec.texts.some(t => t.s === '放这里'), rec.texts.map(t => t.s).join('|').slice(0, 60));

/* 放歪的场景：棋盘上圈出那块 + 「移到这」+ 箭头 */
playAt(0);
placePieces(S.pieces.length - 1);
misplacePiece(S.pieces.length - 1);
S.hint = { id: S.pieces[S.pieces.length - 1].id, t: 0 };   // v0.20：无 tier / until
rec.ops.length = 0; rec.texts.length = 0;
step(16);
const golds = rec.ops.filter(o => o.k === 'stroke' && String(o.color).toLowerCase() === gold);
check('放歪的块被金色虚线圈出', golds.length >= 1, 'gold strokes=' + golds.length);
check('有「移到此处」小牌', rec.texts.some(t => t.s === '移到此处'), rec.texts.map(t => t.s).join('|').slice(0, 60));
check('托盘里没有可标的块时不画「用这块」', !rec.texts.some(t => t.s === '用这块'));

section('6. 第三档「全图淡显」已删除（v0.20 单档口径）');
playAt(0);
placePieces(2);
const trayP = S.pieces.filter(p => !p.onBoard)[0];   // 指一块还在托盘里的
S.hint = { id: trayP.id, t: 0 };
rec.ops.length = 0; rec.texts.length = 0;
step(16);
const colors = S.pieces.map(p => (D.dataset.pieces[p.id].color || '').toLowerCase());
/* 旧版第三档会把没放对的块按板件色淡显（alpha 0.29~0.34）；
 * 现在只有单档提示，不应该再出现任何"板件色淡显"的填充 */
const ghost = rec.ops.filter(o => o.k === 'fill' && colors.indexOf(String(o.color).toLowerCase()) >= 0 && o.a > 0.1 && o.a < 0.45);
check('不再有整幅标准解淡显', ghost.length === 0, 'ghost=' + ghost.length);
check('提示仍会标出「放这里」与「用这块」',
  rec.texts.some(t => t.s === '放这里') && rec.texts.some(t => t.s === '用这块'),
  rec.texts.map(t => t.s).filter(x => /这里|这块|此处/.test(x)).join('|'));

section('7. 源码约束');
for (const f of ['preview/js/game.js', 'miniprogram/game.js']) {
  const t = fs.readFileSync(path.join(ROOT, f), 'utf8');
  check(`${f} 用循环播 mp3`, /\.loop\s*=\s*true/.test(t));
  check(`${f} 切曲不靠淡变（同步生效）`, !/bgmFadeTo/.test(t));
  check(`${f} 关卡曲预载`, /preloadBgm/.test(t));
  check(`${f} 无合成 BGM 残留`, !/BGM_DEF|bgmStartSeq/.test(t));
}
check('提示绘制在板件循环之后', coreSrc.indexOf('drawBoardPiece(p);') < coreSrc.indexOf('drawHintGuide(lv)'),
  'idx board=' + coreSrc.indexOf('drawBoardPiece(p);') + ' hint=' + coreSrc.indexOf('drawHintGuide(lv)'));

section('8. 三端模块 md5 一致');
for (const f of ['config', 'core', 'judge', 'geom', 'levels']) {
  const a = md5(path.join(ROOT, 'js', f + '.js'));
  check(`${f}.js 三端一致`,
    a === md5(path.join(ROOT, 'preview/js', f + '.js')) && a === md5(path.join(ROOT, 'miniprogram/js', f + '.js')), a.slice(0, 8));
}

console.log('\n' + (fail === 0 ? 'v0.11 全部通过' : `!! ${fail} 项未通过`));
process.exit(fail === 0 ? 0 : 1);
