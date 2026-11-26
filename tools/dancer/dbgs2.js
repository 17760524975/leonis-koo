'use strict';
const path = require('path');
const { readPng } = require('./pngio.js');
const SEG = require('./seg.js');
const FIT = require('./fit.js');
const SL = require('./snapLines.js');
const SOLVE = require('fs').readFileSync(path.join(__dirname, 'solve2.js'), 'utf8');
const U1 = require(path.join(__dirname, '..', 'zodiac', 'union.js'));
const A = p => { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[i], r = p[(i + 1) % p.length]; a += q[0] * r[1] - r[0] * q[1]; } return Math.abs(a) / 2; };
const G = require(path.join(__dirname, '..', '..', 'js', 'geom.js'));

/* 复用 solve2 里的 sharedLen / settle：直接从源码里 eval 出来 */
function pick(name) {
  const i = SOLVE.indexOf('function ' + name);
  let d = 0, j = SOLVE.indexOf('{', i), k = j;
  for (; k < SOLVE.length; k++) { if (SOLVE[k] === '{') d++; else if (SOLVE[k] === '}') { d--; if (!d) break; } }
  return SOLVE.slice(i, k + 1);
}
const ctx = new Function('inPoly', 'polyNear', 'segNear', 'segNear2',
  pick('sharedLen') + '\n' + pick('ownCover') + '\n' + pick('settle') + '\nreturn {settle, sharedLen};')(
  (px, py, P) => { let s = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const xi = P[i][0], yi = P[i][1], xj = P[j][0], yj = P[j][1]; if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) s = !s; } return s; },
  () => ({ d: 1 }), () => ({ d: 1 }), () => ({ d: 1 })
);

const img = readPng(path.join(__dirname, 'ref.png'));
const idx = SEG.colorIndex(img);
const list = Object.values(SEG.figures(idx, img.w, img.h));
let px = 0; list.forEach(f => { px += f.n; });
const s = Math.sqrt(px / (10 * 16));

for (const g of [1, 5, 8]) {
  const sub = list.filter(f => f.fig === g).sort((a, b) => b.n - a.n).slice(0, 7);
  let gx0 = 1e9, gy0 = 1e9;
  sub.forEach(f => { gx0 = Math.min(gx0, f.bx); gy0 = Math.min(gy0, f.by); });
  let polys = sub.map(f => {
    const r = FIT.fitPiece(f, s);
    return FIT.LOCAL[r.key].map(v => { const q = FIT.rot(v, r.ang, r.fl); return [(q[0] * s + r.bx + r.cx - gx0) / s, (q[1] * s + r.by + r.cy - gy0) / s]; });
  });
  polys = SL.snapLines(polys, 0.1).polys;
  const sumA = polys.reduce((a, p) => a + A(p), 0);
  const stl = ctx.settle(polys, sub.map(f => f.mask), s, gx0, gy0, { tol: 0.1, r: 0.34, step: 0.04, rounds: 3 });
  const re = SL.snapLines(stl.polys, 0.1).polys;
  const r1 = U1.unionPolys(re, 0.08);
  const a1 = Math.abs(A(r1[0])) - r1.slice(1).reduce((a, r) => a + Math.abs(A(r)), 0);
  console.log('图案' + (g + 1), 'rings', r1.length, ((a1 - sumA) / sumA * 100).toFixed(2) + '%');
}
