/* 摸清「七巧板格点」到底是什么：把某关所有板件顶点转成 0°/45° 两个坐标架，
 * 打印去重后的 x / y 值，看它们是不是某个 spacing 的整数倍
 * 用法：node tools/lattice_probe.js [关序号=1] */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
require(path.join(ROOT, 'js', 'geom.js'));
require(path.join(ROOT, 'js', 'levels.js'));
const G = globalThis.TANGRAM_GEOM;
const S = globalThis.TANGRAM_SETS.tangram7;
const UNIT = S.dataset.unitScale || 96;
const LOCAL = {};
Object.keys(S.dataset.pieces).forEach(id => {
  LOCAL[id] = G.makeLocal(S.dataset.pieces[id].base).map(v => [v[0] * UNIT, v[1] * UNIT]);
});
const idx = (+(process.argv[2] || 1)) - 1;
const lv = S.levels[idx];
const pts = [];
lv.solution.forEach(st => G.toWorld(LOCAL[st.id], st).forEach(v => pts.push(v)));

function uniq(arr, tol) {
  const out = [];
  arr.slice().sort((a, b) => a - b).forEach(v => {
    if (!out.length || Math.abs(v - out[out.length - 1]) > tol) out.push(v);
  });
  return out;
}
function report(name, P) {
  const xs = uniq(P.map(p => p[0]), 0.5), ys = uniq(P.map(p => p[1]), 0.5);
  const x0 = xs[0], y0 = ys[0];
  const rx = uniq(xs.map(v => +(v - x0).toFixed(3)), 0.5);
  const ry = uniq(ys.map(v => +(v - y0).toFixed(3)), 0.5);
  console.log('\n---', name, '| 唯一 x:', rx.length, '唯一 y:', ry.length);
  console.log('  x 差值:', rx.map(v => v.toFixed(1)).join(' '));
  console.log('  y 差值:', ry.map(v => v.toFixed(1)).join(' '));
  const diffs = [];
  for (let i = 1; i < rx.length; i++) diffs.push(rx[i] - rx[i - 1]);
  for (let i = 1; i < ry.length; i++) diffs.push(ry[i] - ry[i - 1]);
  console.log('  相邻间距最小值:', Math.min(...diffs).toFixed(3), '| u =', UNIT);
}
report('0°（原坐标架）', pts);
const a = -Math.PI / 4, c = Math.cos(a), s = Math.sin(a);
report('-45°（旋转后）', pts.map(([x, y]) => [x * c - y * s, x * s + y * c]));
console.log('\n关卡:', lv.name, '| 板件顶点数', pts.length);
