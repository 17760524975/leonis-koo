'use strict';
const path = require('path');
const { readPng } = require('./pngio.js');
const SEG = require('./seg.js');
const FIT = require('./fit.js');
const U2 = require('./union2.js');
const img = readPng(path.join(__dirname, 'ref.png'));
const idx = SEG.colorIndex(img);
const list = Object.values(SEG.figures(idx, img.w, img.h));
let px = 0; list.forEach(f => { px += f.n; });
const s = Math.sqrt(px / (10 * 16));
const A = p => U2.areaOf(p);
for (let g = 0; g < 10; g++) {
  const sub = list.filter(f => f.fig === g).sort((a, b) => b.n - a.n).slice(0, 7);
  let gx0 = 1e9, gy0 = 1e9;
  sub.forEach(f => { gx0 = Math.min(gx0, f.bx); gy0 = Math.min(gy0, f.by); });
  const polys = sub.map(f => {
    const r = FIT.fitPiece(f, s);
    return FIT.LOCAL[r.key].map(v => { const q = FIT.rot(v, r.ang, r.fl); return [(q[0] * s + r.bx + r.cx - gx0) / s, (q[1] * s + r.by + r.cy - gy0) / s]; });
  });
  const sumA = polys.reduce((a, p) => a + A(p), 0);
  const row = [];
  for (const tol of [0.06, 0.1, 0.15]) {
    const rings = U2.unionOutline(polys, tol);
    const outA = rings.reduce((a, r, i) => a + (i === 0 ? A(r) : -A(r)), 0);
    row.push('tol' + tol + ':rings' + rings.length + '/' + ((outA - sumA) / sumA * 100).toFixed(2) + '%');
  }
  console.log('图案' + (g + 1), row.join('  '));
}
