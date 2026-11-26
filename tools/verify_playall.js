/* 运行时回归：把每关按标准解七块摆好，检查是否能判通关
 * 用法：node tools/verify_playall.js [chapter]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

function makeCtx() {
  const grad = { addColorStop() {} };
  const ctx = {
    canvas: { width: 0, height: 0, style: {} },
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
  ['fillStyle', 'strokeStyle', 'lineWidth', 'font', 'textAlign', 'textBaseline',
    'globalAlpha', 'shadowBlur', 'shadowColor', 'shadowOffsetY', 'lineJoin', 'lineCap']
    .forEach(p => { let v = null; Object.defineProperty(ctx, p, { get: () => v, set: x => { v = x; } }); });
  return ctx;
}
let pendingFrame = null;
global.requestAnimationFrame = cb => { pendingFrame = cb; return 1; };
let clock = 0;
function step(ms) {
  clock += ms;
  const cb = pendingFrame; pendingFrame = null;
  if (cb) cb(clock);
}

require(path.join(ROOT, 'js/levels.js'));
require(path.join(ROOT, 'js/geom.js'));
require(path.join(ROOT, 'js/judge.js'));
const CFG = require(path.join(ROOT, 'js/config.js'));
const CORE = require(path.join(ROOT, 'js/core.js'));

const S7 = globalThis.TANGRAM_SETS.tangram7;
const store = {};
const env = {
  ctx: makeCtx(),
  size: () => ({ w: 375, h: 812 }),
  dpr: () => 3,
  safeInsets: () => ({ top: 20, bottom: 0 }),
  bindInput() {},
  storage: { get: k => (k in store ? store[k] : null), set: (k, v) => { store[k] = v; } },
  audio: { unlock() {}, setEnabled() {}, play() {}, duck() {}, setVisible() {} },
  vibrate() {}, images: {}, onHide() {}, onShow() {}
};
const game = CORE(env);
game.init();
step(16);
const S = game.state, D = game._debug;
D.useSet('tangram7');
step(16);

const ch = process.argv[2] ? +process.argv[2] : 0;
let bad = 0;
S7.levels.forEach((lv, idx) => {
  if (ch && lv.chapter !== ch) return;
  D.setupLevel(idx);
  S.page = 'play'; S.win = null; S.result = null;
  step(16);
  S.pieces.forEach(p => {
    const st = lv.solution.find(q => q.id === p.id);
    p.onBoard = true;
    p.x = st.x; p.y = st.y;
    p.angle = st.angle; p.dAngle = st.angle;
    p.flipped = !!st.flipped; p.dFlipped = !!st.flipped;
  });
  step(16);
  D.runJudge(false);
  step(16);
  const issues = S.pieces.filter(p => !p.fit).map(p => p.id + ':' + p.issue);
  if (!S.win) bad++;
  console.log(`  [${S.win ? 'OK' : 'XX'}] ${String(lv.id).padStart(3)} ${lv.name.padEnd(3)} win=${!!S.win} fitN=${S.fitN} ${issues.join(' ')}`);
});
console.log('\n未通关关数', bad);
