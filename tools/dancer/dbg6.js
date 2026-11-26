/* 诊断：对齐后每块板与最近邻的距离（找出孤立板） */
'use strict';
const path = require('path');
const { readPng } = require('./pngio.js');
const SEG = require('./seg.js');
const FIT = require('./fit.js');
const SL = require('./snapLines.js');

function nearSeg(P, c, d) {
  const sx = d[0] - c[0], sy = d[1] - c[1];
  const L = sx * sx + sy * sy || 1;
  let t = ((P[0] - c[0]) * sx + (P[1] - c[1]) * sy) / L;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(P[0] - (c[0] + sx * t), P[1] - (c[1] + sy * t));
}
function polyNear(A, B) {
  let m = 1e9;
  for (let i = 0; i < A.length; i++) {
    const a = A[i], b = A[(i + 1) % A.length];
    for (let j = 0; j < B.length; j++) {
      const c = B[j], d = B[(j + 1) % B.length];
      m = Math.min(m, nearSeg(a, c, d), nearSeg(b, c, d), nearSeg(c, a, b), nearSeg(d, a, b));
    }
  }
  return m;
}

const img = readPng(path.join(__dirname, 'ref.png'));
const idx = SEG.colorIndex(img);
const list = Object.values(SEG.figures(idx, img.w, img.h));
let px = 0; list.forEach(f => { px += f.n; });
const s = Math.sqrt(px / (10 * 16));

for (const g of (process.argv[2] ? process.argv[2].split(',').map(Number) : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9])) {
  const sub = list.filter(f => f.fig === g).sort((a, b) => b.n - a.n).slice(0, 7);
  let gx0 = 1e9, gy0 = 1e9;
  sub.forEach(f => { gx0 = Math.min(gx0, f.bx); gy0 = Math.min(gy0, f.by); });
  const fits = sub.map(f => { const r = FIT.fitPiece(f, s); return { k: r.key, ang: r.ang, fl: r.fl, c: SEG.HUES[f.color].name }; });
  let polys = sub.map(f => {
    const r = FIT.fitPiece(f, s);
    return FIT.LOCAL[r.key].map(v => { const q = FIT.rot(v, r.ang, r.fl); return [(q[0] * s + r.bx + r.cx - gx0) / s, (q[1] * s + r.by + r.cy - gy0) / s]; });
  });
  polys = SL.snapLines(polys, 0.1).polys;
  console.log('=== 图案' + (g + 1));
  polys.forEach((P, i) => console.log('  ', i, fits[i].c, fits[i].k, fits[i].ang, fits[i].fl ? 'F' : '-', P.map(v => v.map(x => x.toFixed(2)).join(',')).join(' | ')));
  for (let i = 0; i < 7; i++) {
    let bd = 1e9, bj = -1;
    for (let j = 0; j < 7; j++) {
      if (i === j) continue;
      const m = polyNear(polys[i], polys[j]);
      if (m < bd) { bd = m; bj = j; }
    }
    console.log('    块' + i + '(' + fits[i].c + ') 最近 块' + bj + '(' + fits[bj].c + ') 距 ' + bd.toFixed(3));
  }
}
