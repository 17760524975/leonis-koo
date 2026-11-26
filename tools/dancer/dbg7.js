/* 诊断：某图案在给定外扩量下，哪块板判不过「整块落在剪影里」，原因是顶点在外还是边相交 */
'use strict';
const path = require('path');
const { readPng } = require('./pngio.js');
const SEG = require('./seg.js');
const FIT = require('./fit.js');
const SL = require('./snapLines.js');
const OF = require('./offset.js');
const U2 = require('./union2.js');
const G = require(path.join(__dirname, '..', '..', 'js', 'geom.js'));

const img = readPng(path.join(__dirname, 'ref.png'));
const idx = SEG.colorIndex(img);
const list = Object.values(SEG.figures(idx, img.w, img.h));
let px = 0; list.forEach(f => { px += f.n; });
const s = Math.sqrt(px / (10 * 16));

const g = +process.argv[2] || 0;
const d = process.argv[3] ? +process.argv[3] : 0.03;
const sub = list.filter(f => f.fig === g).sort((a, b) => b.n - a.n).slice(0, 7);
let gx0 = 1e9, gy0 = 1e9;
sub.forEach(f => { gx0 = Math.min(gx0, f.bx); gy0 = Math.min(gy0, f.by); });
const fits = sub.map(f => { const r = FIT.fitPiece(f, s); return { k: r.key, ang: r.ang, fl: r.fl, c: SEG.HUES[f.color].name }; });
let polys = sub.map(f => {
  const r = FIT.fitPiece(f, s);
  return FIT.LOCAL[r.key].map(v => { const q = FIT.rot(v, r.ang, r.fl); return [(q[0] * s + r.bx + r.cx - gx0) / s, (q[1] * s + r.by + r.cy - gy0) / s]; });
});
polys = SL.snapLines(polys, 0.1).polys;
const rings = U2.unionOutline(polys.map(P => OF.inflate(P, d)), 0.02);
const O = rings[0];

function segX(a, b, c, e) {
  const f = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const d1 = f(c, e, a), d2 = f(c, e, b), d3 = f(a, b, c), d4 = f(a, b, e);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
}
console.log('图案' + (g + 1), 'd=' + d, 'ring pts', O.length);
polys.forEach((P, i) => {
  const vs = P.map(v => G.pointOnPoly(v, O, 3 / 96));
  let cross = 0;
  for (let a = 0; a < P.length; a++) {
    for (let b = 0; b < O.length; b++) {
      if (segX(P[a], P[(a + 1) % P.length], O[b], O[(b + 1) % O.length])) cross++;
    }
  }
  console.log('  ', i, fits[i].c, fits[i].k, 'inside', G.pieceInside(P, O, [], 3 / 96),
    '顶点在外', vs.filter(x => !x).length + '/' + vs.length, '边相交', cross);
});
