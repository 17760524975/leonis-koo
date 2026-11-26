/* 诊断：snapLines 的聚类容差 tol 取多少最合适
 * 关心三件事：位移多大（姿势会不会被拽歪）、d 很小时并集面积是否接近 16、
 * 边界上还有多少「碎边」（台阶）
 * 用法：node tools/dancer/dbg9.js [tol]
 */
'use strict';
const path = require('path');
const SL = require('./snapLines.js');
const OF = require('./offset.js');
const U2 = require('./union2.js');
const PREP = require('./prep.js');

const TOLS = process.argv[2] ? [parseFloat(process.argv[2])] : [0.02, 0.03, 0.04, 0.05, 0.08, 0.1, 0.15];
const P = PREP.load();

for (const tol of TOLS) {
  console.log('===== snapLines tol = ' + tol);
  let worstMove = 0;
  for (let g = 0; g < 10; g++) {
    const { polys } = P.fig(g);
    const sn = SL.snapLines(polys.map(p => p.map(v => v.slice())), tol);
    const mv = (sn.moves || []).map(m => Math.hypot(m[0], m[1]));
    const mx = mv.length ? Math.max.apply(null, mv) : 0;
    worstMove = Math.max(worstMove, mx);
    const pp = sn.polys.map(Q => OF.inflate(Q, 0.01));
    const rr = U2.unionOutline(pp, 0.02);
    let short = 0;
    if (rr.length === 1) {
      const O = rr[0];
      for (let i = 0; i < O.length; i++) {
        const a = O[i], b = O[(i + 1) % O.length];
        const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (L > 1e-6 && L < 0.0625) short++;
      }
    }
    const ar = rr.reduce((a, r) => a + U2.areaOf(r), 0);
    console.log('  图案' + String(g + 1).padStart(2), '最大位移 ' + mx.toFixed(3),
      '环 ' + rr.length, 'd=0.01 面积 ' + ar.toFixed(3) + '（差 ' + ((ar - 16) / 16 * 100).toFixed(2) + '%）',
      '碎边 ' + short);
  }
  console.log('  全图最大位移', worstMove.toFixed(3));
}
