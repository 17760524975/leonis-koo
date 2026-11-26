/* 诊断：每个图案需要多小的外扩量 d 才能让并集收成一个环，以及该 d 下
 * 环的面积偏差、最短边、最短边对应的「台阶」有多高
 * 用法：node tools/dancer/dbg12.js
 */
'use strict';
const SL = require('./snapLines.js');
const OF = require('./offset.js');
const U2 = require('./union2.js');
const PREP = require('./prep.js');

const P = PREP.load();
const DS = [0.004, 0.008, 0.012, 0.016, 0.02, 0.026, 0.032, 0.04, 0.05];

for (let g = 0; g < 10; g++) {
  const { polys } = P.fig(g);
  let q = polys.map(p => p.map(v => v.slice()));
  for (let k = 0; k < 3; k++) q = SL.snapLines(q, 0.03).polys;
  const out = [];
  for (const d of DS) {
    const rr = U2.unionOutline(q.map(Q => OF.inflate(Q, d)), 0.02);
    let minE = 0, area = 0;
    if (rr.length === 1) {
      const O = rr[0];
      area = U2.areaOf(O);
      minE = 1e9;
      for (let i = 0; i < O.length; i++) {
        const a = O[i], b = O[(i + 1) % O.length];
        minE = Math.min(minE, Math.hypot(b[0] - a[0], b[1] - a[1]));
      }
    }
    out.push(d + ':' + rr.length + (rr.length === 1 ? '/' + ((area - 16) / 16 * 100).toFixed(1) + '%/min' + (minE * 96).toFixed(1) : ''));
  }
  console.log('图案' + String(g + 1).padStart(2), out.join('  '));
}
