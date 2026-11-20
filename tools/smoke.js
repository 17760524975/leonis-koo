/* 无头冒烟测试：用假 Canvas 2D 跑完整流程，抓运行时错误与状态机问题
 * 不依赖浏览器 / 微信开发者工具。用法：node tools/smoke.js
 */
const path = require('path');
const ROOT = path.join(__dirname, '..');

/* ---------- 假 Canvas 2D ---------- */
function makeCtx() {
  const calls = {};
  const grad = { addColorStop() {} };
  const ctx = {
    canvas: { width: 0, height: 0, style: {} },
    _calls: calls,
    save() {}, restore() {}, translate() {}, scale() {}, rotate() {}, setTransform() {},
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, arcTo() {},
    quadraticCurveTo() {}, bezierCurveTo() {}, rect() {}, clip() {},
    fill() {}, stroke() {}, fillRect() {}, strokeRect() {}, clearRect() {},
    fillText() {}, strokeText() {}, setLineDash() {}, drawImage() {},
    measureText() { return { width: 40 }; },
    createLinearGradient() { return grad; },
    createRadialGradient() { return grad; },
    createPattern() { return null; }
  };
  // 记录关键属性赋值，便于断言（不校验绘制内容）
  const props = ['fillStyle', 'strokeStyle', 'lineWidth', 'font', 'textAlign', 'textBaseline',
    'globalAlpha', 'shadowBlur', 'shadowColor', 'shadowOffsetY', 'lineJoin', 'lineCap'];
  for (const p of props) {
    let v = null;
    Object.defineProperty(ctx, p, {
      get() { return v; },
      set(x) { v = x; calls[p] = (calls[p] || 0) + 1; }
    });
  }
  return ctx;
}

/* ---------- 假的 rAF：手动驱动帧 ---------- */
let pendingFrame = null;
global.requestAnimationFrame = function (cb) { pendingFrame = cb; return 1; };
let clock = 0;
function step(ms) {
  clock += ms;
  const cb = pendingFrame;
  pendingFrame = null;
  if (cb) cb(clock);
}

/* ---------- 加载模块 ---------- */
require(path.join(ROOT, 'js/levels.js'));
require(path.join(ROOT, 'js/geom.js'));
require(path.join(ROOT, 'js/judge.js'));
const CFG = require(path.join(ROOT, 'js/config.js'));
const CORE = require(path.join(ROOT, 'js/core.js'));
const DATA = globalThis.TANGRAM_DATA;

/* ---------- 假 env ---------- */
const store = {};
let audioLog = [];
let duckLog = [];
let visibleLog = [];
const ctx = makeCtx();
const W = 375, H = 812, DPR = 3;
let inputFn = null;
let hideCb = null, showCb = null;

const env = {
  ctx,
  size: () => ({ w: W, h: H }),
  dpr: () => DPR,
  safeInsets: () => ({ top: 20, bottom: 0 }),
  bindInput: fn => { inputFn = fn; },
  storage: { get: k => (k in store ? store[k] : null), set: (k, v) => { store[k] = v; } },
  audio: {
    unlock() {}, setEnabled() {},
    play(n) { audioLog.push(n); },
    duck(v) { duckLog.push(v); },
    setVisible(v) { visibleLog.push(v); }
  },
  vibrate() {},
  images: {},
  onHide: cb => { hideCb = cb; },
  onShow: cb => { showCb = cb; }
};

/* ---------- 坐标系换算（与 core 内部一致） ---------- */
const scale = Math.min(W / CFG.DESIGN.w, H / CFG.DESIGN.h);
const ox = (W - CFG.DESIGN.w * scale) / 2;
const oy = (H - CFG.DESIGN.h * scale) / 2;
const css = (dx, dy) => [ox + dx * scale, oy + dy * scale];
function tap(dx, dy) {
  const p = css(dx, dy);
  inputFn('down', p[0], p[1]);
  step(16);
  inputFn('up', p[0], p[1]);
  step(16);
}
function drag(fromD, toD, steps) {
  const a = css(fromD[0], fromD[1]);
  inputFn('down', a[0], a[1]);
  step(16);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = fromD[0] + (toD[0] - fromD[0]) * t;
    const y = fromD[1] + (toD[1] - fromD[1]) * t;
    const p = css(x, y);
    inputFn('move', p[0], p[1]);
    step(16);
  }
  const b = css(toD[0], toD[1]);
  inputFn('up', b[0], b[1]);
  step(16);
}

/* ---------- 断言 ---------- */
let fail = 0;
function check(label, ok, detail) {
  if (!ok) fail++;
  console.log(`  [${ok ? 'OK' : 'XX'}] ${label}${detail ? '  ' + detail : ''}`);
}

/* ---------- 跑 ---------- */
console.log('==== 无头冒烟测试 ====');
let game;
try {
  game = CORE(env);
  game.init();
} catch (e) {
  console.log('  [XX] 初始化抛错: ' + e.message + '\n' + e.stack);
  process.exit(1);
}
check('初始化完成', !!game);
step(16);

const S = game.state;
check('首屏是主界面', S.page === 'home', 'page=' + S.page);

// 主界面渲染若干帧（覆盖动画分支）
for (let i = 0; i < 30; i++) step(16);

// 点「开始」
tap(375, 1010);
step(16);
check('点开始进入对局页', S.page === 'play', 'page=' + S.page);
check('四块板都在托盘', S.pieces.filter(p => !p.onBoard).length === 4);

// 渲染几帧
for (let i = 0; i < 20; i++) step(16);

// 点一块板（托盘）→ 应被选中且退回托盘
// 托盘槽位由板件实测 bbox 算出，坐标从 _debug.slots 取，不硬编码
const SLOTS = game._debug.slots;
tap(SLOTS[0].x, SLOTS[0].y);
step(16);
check('点托盘板只选中不置板', S.pieces.every(p => !p.onBoard) && S.selId === 'A', 'sel=' + S.selId);

// 旋转：连点 8 次应回到原角度
const pA = S.pieces.find(p => p.id === 'A');
const a0 = pA.angle;
for (let i = 0; i < 8; i++) { tap(239, 1470); for (let k = 0; k < 10; k++) step(16); }
check('旋转 8 次回到原角度', Math.abs(((pA.angle - a0) % 360 + 360) % 360) < 0.001, `angle=${pA.angle}`);
check('旋转动画期间只累计 8 步', S.steps === 8, 'steps=' + S.steps);

// 翻转 D
tap(SLOTS[3].x, SLOTS[3].y); step(16);
const pD = S.pieces.find(p => p.id === 'D');
tap(375, 1470);
for (let k = 0; k < 16; k++) step(16);

// 连点 8 次（间隔 32ms，动画没播完就点下一次）：逻辑角精确回位，视觉不得反向/多转一圈
const aBefore2 = pD.angle;
for (let i = 0; i < 8; i++) { tap(239, 1470); step(16); step(16); }
for (let k = 0; k < 40; k++) step(16);
check('连点 8 次逻辑角精确回位', Math.abs(((pD.angle - aBefore2) % 360 + 360) % 360) < 1e-6, 'angle=' + pD.angle);
const devVis = ((pD.dAngle - pD.angle) % 360 + 540) % 360 - 180;
check('连点后视觉角与逻辑角一致（没多转一圈）', Math.abs(devVis) < 2, 'dev=' + devVis.toFixed(2));

check('翻转 D 生效', pD.flipped === true && pD.dFlipped === true, 'flipped=' + pD.flipped);

// 吸附路径：B 先放在轮廓顶点旁 40 单位处，再拖到「轮廓顶点 - B 顶点偏移」
// → 顶点吸附命中，落点误差应 < 0.5，且 sfx_snap 与吸附同帧
const GEO = globalThis.TANGRAM_GEOM;
const US = DATA.dataset.unitScale;
const kD = CFG.LAYOUT.BOARD.size / 1000;
const lv0 = DATA.levels[0];
const oV = lv0.outline[3];
const locB = DATA.dataset.pieces.B.base;
const cB = GEO.centroid(locB);
const vOff = [(locB[1][0] - cB[0]) * US, (locB[1][1] - cB[1]) * US];
const tX = oV[0] - vOff[0], tY = oV[1] - vOff[1];
const pB = S.pieces.find(p => p.id === 'B');
pB.onBoard = true; pB.x = tX + 40; pB.y = tY + 40;
pB.angle = 0; pB.dAngle = 0; pB.flipped = false; pB.dFlipped = false;
step(16);
const snapBefore = audioLog.filter(n => n === 'sfx_snap').length;
drag([CFG.LAYOUT.BOARD.x + pB.x * kD, CFG.LAYOUT.BOARD.y + pB.y * kD],
  [CFG.LAYOUT.BOARD.x + tX * kD, CFG.LAYOUT.BOARD.y + tY * kD], 6);
for (let k = 0; k < 6; k++) step(16);
check('顶点吸附命中并播 sfx_snap', audioLog.filter(n => n === 'sfx_snap').length > snapBefore && pB.onBoard,
  'snap=' + audioLog.filter(n => n === 'sfx_snap').length + ' onBoard=' + pB.onBoard);
check('吸附后落点对齐轮廓顶点', Math.abs(pB.x + vOff[0] - oV[0]) < 0.5 && Math.abs(pB.y + vOff[1] - oV[1]) < 0.5,
  'x=' + pB.x.toFixed(2) + ' y=' + pB.y.toFixed(2));
// 放回托盘，继续后面的流程
pB.onBoard = false; pB.x = 0; pB.y = 0;

// 把四块直接摆成标准解，然后拖一下触发判定
const lv = DATA.levels[0];
S.pieces.forEach(p => {
  const st = lv.solution.find(s => s.id === p.id);
  p.onBoard = true;
  p.x = st.x; p.y = st.y;
  p.angle = st.angle; p.dAngle = st.angle;
  p.flipped = st.flipped; p.dFlipped = st.flipped;
});
step(16);
// 拖某块 1 个像素再放回（触发 runJudge）
const dp = S.pieces[0];
const dx0 = CFG.LAYOUT.BOARD.x + dp.x * (CFG.LAYOUT.BOARD.size / 1000);
const dy0 = CFG.LAYOUT.BOARD.y + dp.y * (CFG.LAYOUT.BOARD.size / 1000);
drag([dx0, dy0], [dx0 + 2, dy0 + 1], 3);
for (let k = 0; k < 10; k++) step(16);
check('覆盖率判为通关', S.covTo > 0.99, 'covTo=' + S.covTo.toFixed(4));
check('触发成局', !!S.win);

// 等结算面板
for (let k = 0; k < 80; k++) step(16);
check('弹出结算面板', S.overlay === 'result', 'overlay=' + S.overlay);
check('结算时 BGM 压低', duckLog.length > 0 && duckLog[duckLog.length - 1] === true, 'duck=' + JSON.stringify(duckLog));
check('星级已计算', S.result && S.result.stars >= 1, JSON.stringify(S.result));
check('存档有星级', !!S.save.starOf['1'], JSON.stringify(S.save.starOf));

// 下一关（v0.8 结算面板改版：主按钮位置从 config.WIN 读，别再写死）
tap(375, CFG.WIN.primaryY);
step(16);
check('进入第 2 关', S.levelIdx === 1 && S.page === 'play', 'idx=' + S.levelIdx);

// 提示
tap(511, 1470);
for (let k = 0; k < 10; k++) step(16);
check('提示高亮生效', !!S.hint, 'hint=' + (S.hint && S.hint.id));
check('提示只能一次', S.hintUsed === true);

// 重来
tap(647, 1470);
for (let k = 0; k < 10; k++) step(16);
check('重来清空棋盘', S.pieces.every(p => !p.onBoard));

// 返回关卡列表
tap(70, CFG.SAFE.top + 28);
for (let k = 0; k < 10; k++) step(16);
check('回到关卡列表', S.page === 'levels', 'page=' + S.page);

// 关卡列表点第 2 关
// v0.2 关卡页改成分章分页：4 列 × 5 行，格 160×196，间距 16/16，
// 顶部是标题 + 章节胶囊（64 高）+ 章名行（66）。坐标按同一套式子算，别再硬编码。
{
  const CW = 160, CH = 196, GX = 16, PH = 64, COLS = 4;
  const gridW = COLS * CW + (COLS - 1) * GX;
  const cellX = (CFG.DESIGN.w - gridW) / 2 + CW / 2 + 1 * (CW + GX);
  const cellY = CFG.SAFE.top + 96 + PH + 66 + CH / 2;
  tap(cellX, cellY);
}
for (let k = 0; k < 10; k++) step(16);
check('关卡列表可进第 2 关', S.page === 'play' && S.levelIdx === 1, 'page=' + S.page + ' idx=' + S.levelIdx);

// 设置面板
tap(70, CFG.SAFE.top + 28);
for (let k = 0; k < 6; k++) step(16);
check('回到关卡列表', S.page === 'levels');
tap(70, CFG.SAFE.top + 38);       // 关卡列表的返回箭头
for (let k = 0; k < 6; k++) step(16);
check('回到主界面', S.page === 'home', 'page=' + S.page);
// v0.7：设置已从右上角挪到右列底部（与「任务」同排），坐标读配置
const HH = CFG.LAYOUT.HOME;
tap(CFG.DESIGN.w - HH.entryX, HH.entryY0 + HH.entryGap * 3);
for (let k = 0; k < 6; k++) step(16);
check('打开设置面板', S.overlay === 'settings', 'overlay=' + S.overlay);
tap(480 + 54, CFG.DESIGN.h / 2 - 120);
for (let k = 0; k < 6; k++) step(16);
check('音效开关可切换', S.settingsFx === false, 'sfx=' + S.settingsFx);
check('设置已写入存档', S.save.settings.sfx === false && !!store[CFG.SAVE_KEY]);
tap(375, CFG.DESIGN.h / 2 + 230);
for (let k = 0; k < 6; k++) step(16);
check('关闭设置', S.overlay === null);

// 切后台/回来
if (hideCb) hideCb();
if (showCb) showCb();
for (let k = 0; k < 10; k++) step(16);
check('切后台回来不崩', true);

// 长时间跑帧（覆盖所有动画分支）
for (let k = 0; k < 600; k++) step(16);
check('连续 600 帧无异常', true);

// 存档落盘 + 重进（新实例应读到星级）
check('存档键名正确', !!store['tangram_save_v1'], Object.keys(store).join(','));
const saved = JSON.parse(store['tangram_save_v1']);
check('存档结构符合策划 5.8', 'starOf' in saved && 'unlockedMax' in saved && 'bestTime' in saved &&
  'settings' in saved && 'hintUsed' in saved && 'playerId' in saved, JSON.stringify(saved).slice(0, 160));

// 音频调用记录
check('有音效调用', audioLog.length > 0, audioLog.slice(0, 8).join(','));

console.log('\n绘制属性赋值统计:', JSON.stringify(ctx._calls));
console.log(fail === 0 ? '\n全部通过' : `\n!! ${fail} 项未通过`);
process.exit(fail === 0 ? 0 : 1);
