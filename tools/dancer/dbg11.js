/* 诊断：snapLines 迭代几次能把「板与板之间的缝」真正收掉
 * 指标：d=0 的并集面积（越接近 16 越说明拼合严密）、总位移、最大位移
 * 用法：node tools/dancer/dbg11.js
 */
'use strict';
const SL = require('./snapLines.js');
const OF = require('./offset.js');
const U2 = require('./union2.js');
const PREP = require('./prep.js');

const P = PREP.load();
const PLANS = [
  { it: 1, tol: 0.08 },
  { it: 2, tol: 0.08 },
  { it: 3, tol: 0.08 },
  { it: 2, tol: 0.05 },
  { it: 4, tol: 0.04 },
  { it: 3, tol: 0.03 }
];

for (const pl of PLANS) {
  let totA = 0, totP = 0, maxMv = 0;
  const rows = [];
  for (let g = 0; g < 10; g++) {
    const { polys } = P.fig(g);
    let q = polys.map(p => p.map(v => v.slice()));
    const o0 = q.map(p => p.map(v => v.slice()));
    for (let k = 0; k < pl.it; k++) q = SL.snapLines(q, pl.tol).polys;
    let mv = 0;
    q.forEach((p, i) => { mv = Math.max(mv, Math.hypot(p[0][0] - o0[i][0][0], p[0][1] - o0[i][0][1])); });
    maxMv = Math.max(maxMv, mv);
    const a = U2.unionOutline(q.map(Q => OF.inflate(Q, 0.001)), 0.02).reduce((s2, r) => s2 + U2.areaOf(r), 0);
    totA += a; totP += U2.areaOf(q[0]) * 0 + 16;
    rows.push('图案' + (g + 1) + ' ' + a.toFixed(2));
  }
  console.log('迭代 ' + pl.it + ' 次 tol=' + pl.tol, '| d≈0 并集面积合计 ' + totA.toFixed(2) + '（16×10=160）',
    '最大位移 ' + maxMv.toFixed(3));
  console.log('   ' + rows.join('  '));
}
