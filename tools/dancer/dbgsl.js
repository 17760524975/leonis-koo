'use strict';
const path = require('path');
const { readPng } = require('./pngio.js');
const SEG = require('./seg.js');
const FIT = require('./fit.js');
const SL = require('./snapLines.js');
const U2 = require('./union2.js');
const U1 = require(path.join(__dirname, '..', 'zodiac', 'union.js'));
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
  let polys = sub.map(f => {
    const r = FIT.fitPiece(f, s);
    return FIT.LOCAL[r.key].map(v => { const q = FIT.rot(v, r.ang, r.fl); return [(q[0] * s + r.bx + r.cx - gx0) / s, (q[1] * s + r.by + r.cy - gy0) / s]; });
  });
  const sn = SL.snapLines(polys, 0.1);
  polys = sn.polys;
  const sumA = polys.reduce((a, p) => a + A(p), 0);
  const mx = Math.max.apply(null, sn.moves.map(m => Math.hypot(m[0], m[1])));
  const r2 = U2.unionOutline(polys, 0.08);
  const a2 = r2.reduce((a, r, i) => a + (i === 0 ? A(r) : -A(r)), 0);
  const r1 = U1.unionPolys(polys, 0.08);
  const a1 = Math.abs(A(r1[0])) - r1.slice(1).reduce((a, r) => a + Math.abs(A(r)), 0);
  console.log('图案' + (g + 1), '位移max', mx.toFixed(3), '残差', Math.max.apply(null, sn.res).toFixed(4),
    '| union2 rings', r2.length, ((a2 - sumA) / sumA * 100).toFixed(2) + '%',
    '| zodiac rings', r1.length, ((a1 - sumA) / sumA * 100).toFixed(2) + '%');
}
