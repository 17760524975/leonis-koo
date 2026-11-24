/* 试形状：给定一个整数顶点多边形（面积必须正好 16），跑精确覆盖，报告可解性。
 * 用法：
 *   node tools/letters7/tryshape.js T "[0,0 3,0 3,4 4,4 4,6 0,6]"
 *   node tools/letters7/tryshape.js --file tools/letters7/shapes.json
 * 输出：每块板的 (id, 多边形) 与 7 块并集的轮廓环数。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const Q = require('./qsolve.js');

function parsePoly(s) {
  return s.trim().split(/[\s;]+/).filter(Boolean).map(p => p.split(',').map(Number));
}
function solve(poly, tag, verbose) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const v of poly) {
    x0 = Math.min(x0, v[0]); x1 = Math.max(x1, v[0]);
    y0 = Math.min(y0, v[1]); y1 = Math.max(y1, v[1]);
  }
  const g = Q.makeGrid(Math.floor(x0) - 1, Math.floor(y0) - 1,
    Math.ceil(x1 - x0) + 3, Math.ceil(y1 - y0) + 3);
  const idxs = Q.trisOfPoly(poly, g);
  const area = Math.abs(Q.shoelace(poly));
  const ok = idxs.length === 64;
  if (!ok) console.log(`  ${tag}: 面积 ${area.toFixed(2)} 格 ${idxs.length}/64 —— 面积不等于 16，先改形状`);
  const sol = ok ? Q.exactCover(Q.maskOf(idxs), g, {}) : null;
  if (ok) console.log(`  ${tag}: 面积 ${area.toFixed(2)}  格 ${idxs.length}  ${sol ? '可解 ✓' : '无解 ✗'}`);
  if (sol && verbose) {
    for (const p of sol) console.log('    ' + p.id + ' ' + p.poly.map(v => v.join(',')).join(' '));
  }
  return sol;
}

const args = process.argv.slice(2);
if (args[0] === '--file') {
  const shapes = JSON.parse(fs.readFileSync(args[1], 'utf8'));
  for (const k in shapes) {
    const s = shapes[k];
    const poly = Array.isArray(s) ? s : s.poly;
    const sol = solve(poly, k, true);
    if (sol) {
      const info = Q.ringsOf(sol.map(p => p.poly));
      console.log('    环 ' + info.loops.length + '，外框 ' + info.loops.slice()
        .sort((a, b) => Math.abs(Q.shoelace(b)) - Math.abs(Q.shoelace(a)))[0].length + ' 顶点');
    }
  }
} else {
  solve(parsePoly(args[1]), args[0] || 'shape', true);
}
