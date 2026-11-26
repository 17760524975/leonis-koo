/* 诊断：union2 求出来的环，面积对不对
 * 用栅格（步长 0.005 单位）独立算一遍「7 块板的并集」面积，和环的鞋带面积对比。
 * 环面积偏大 = 环在凹处「抄近路」架了桥（视觉上就是空档处多一条筋）。
 * 用法：node tools/dancer/dbg10.js [d]
 */
'use strict';
const SL = require('./snapLines.js');
const OF = require('./offset.js');
const U2 = require('./union2.js');
const G = require('../..' + '/js/geom.js');
const PREP = require('./prep.js');

const D = process.argv[2] ? parseFloat(process.argv[2]) : 0.01;
const STEP = 0.005;
const P = PREP.load();

function rasterArea(polys) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  polys.forEach(P2 => P2.forEach(v => {
    x0 = Math.min(x0, v[0]); y0 = Math.min(y0, v[1]);
    x1 = Math.max(x1, v[0]); y1 = Math.max(y1, v[1]);
  }));
  let n = 0;
  for (let y = y0; y < y1; y += STEP) {
    for (let x = x0; x < x1; x += STEP) {
      for (let i = 0; i < polys.length; i++) {
        if (U2.inPoly(x, y, polys[i])) { n++; break; }
      }
    }
  }
  return n * STEP * STEP;
}

for (let g = 0; g < 10; g++) {
  const { polys } = P.fig(g);
  const sn = SL.snapLines(polys.map(p => p.map(v => v.slice())), 0.08);
  const pp = sn.polys.map(Q => OF.inflate(Q, D));
  const rr = U2.unionOutline(pp, 0.02);
  const ringA = rr.reduce((a, r) => a + U2.areaOf(r), 0);
  const rasA = rasterArea(pp);
  const bad = [];
  rr.forEach((O, k) => {
    for (let i = 0; i < O.length; i++) {
      const a = O[i], b = O[(i + 1) % O.length];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
      const off = Math.abs(((ang % 45) + 45) % 45);
      if (Math.min(off, 45 - off) > 1.5 && L > 0.05) bad.push(k + '#' + i + ':L' + L.toFixed(2) + '@' + ang.toFixed(0));
    }
  });
  console.log('图案' + String(g + 1).padStart(2), 'd=' + D,
    '环 ' + rr.length,
    '环面积 ' + ringA.toFixed(3),
    '栅格面积 ' + rasA.toFixed(3),
    '环多算 ' + ((ringA - rasA) / rasA * 100).toFixed(2) + '%',
    '| 非45边', bad.length ? bad.join(' ') : '无');
}
