/* 逐关「标准解回放」验收：把 solution 直接写进引擎，跑 judgeNow()，看是否成局。
 * 这比离线判定更严格：走的是真实 piecePoly / 吸附后的坐标 / 成局逻辑。
 * 用法：node tools/alpha/check_play.js
 */
const path = require('path');
const ROOT = path.join(__dirname, '../..');
global.requestAnimationFrame = cb => { pendingFrame = cb; return 1; };
require(path.join(ROOT, 'js/levels.js'));
const C = require(path.join(ROOT, 'js/config.js'));
const CORE = require(path.join(ROOT, 'js/core.js'));

function makeCtx() {
  const grad = { addColorStop() {} };
  return {
    canvas: { width: 0, height: 0, style: {} },
    save() {}, restore() {}, translate() {}, scale() {}, rotate() {}, setTransform() {},
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, arcTo() {},
    quadraticCurveTo() {}, bezierCurveTo() {}, rect() {}, clip() {},
    fill() {}, stroke() {}, fillRect() {}, strokeRect() {}, clearRect() {},
    fillText() {}, strokeText() {}, setLineDash() {}, drawImage() {},
    measureText() { return { width: 40 }; },
    createLinearGradient() { return grad; }, createRadialGradient() { return grad; },
    createPattern() { return null; }
  };
}
let pendingFrame = null;
let clock = 0;
function step(ms) { clock += ms; const cb = pendingFrame; pendingFrame = null; if (cb) cb(clock); }

const store = {};
const env = {
  ctx: makeCtx(), tutorial: false,
  size: () => ({ w: 375, h: 812 }), dpr: () => 3,
  safeInsets: () => ({ top: 20, bottom: 0 }),
  bindInput: () => {}, storage: { get: k => (k in store ? store[k] : null), set: (k, v) => { store[k] = v; } },
  audio: { unlock() {}, setEnabled() {}, play() {}, duck() {}, setVisible() {} },
  vibrate() {}, images: {}, onHide() {}, onShow() {}
};

const game = CORE(env);
game.init();
step(16);
step(16);
const D = game._debug;
D.useSet('tangram7');
const lv = D.LEVELS;
let fail = 0;
for (let i = 0; i < lv.length; i++) {
  D.setupLevel(i, { keepTimer: true });
  const S = game.state;
  const sol = lv[i].solution;
  for (const st of sol) {
    const p = S.pieces.find(x => x.id === st.id);
    if (!p) { console.log('  !! 找不到板 ' + st.id); fail++; continue; }
    p.x = st.x; p.y = st.y; p.angle = st.angle; p.flipped = !!st.flipped;
    p.onBoard = true; p.rot = null; p.flip = null;
    p.dAngle = st.angle; p.dFlipped = !!st.flipped;   // piecePoly 读的是 dAngle/dFlipped
  }
  const r = D.judgeNow();
  const ok = r.coverage >= C.JUDGE.passCoverage && r.overflow < C.JUDGE.passOverflow &&
    r.overlaps.length === 0;
  if (!ok) fail++;
  console.log(String(i + 1).padStart(2) + '  ' + lv[i].name.padEnd(4, '　') +
    (ok ? '  达标 PASS' : '  未达标 FAIL') +
    '  coverage=' + r.coverage.toFixed(4) + ' overflow=' + r.overflow.toFixed(4) +
    ' 重叠=' + r.overlaps.length);
}
console.log('\n' + (fail ? '有 ' + fail + ' 关未成局' : '全部 ' + lv.length + ' 关标准解可成局'));
process.exit(fail ? 1 : 0);
