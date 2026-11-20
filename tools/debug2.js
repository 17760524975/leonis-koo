/* 精确诊断单个别配置的并集计算过程 */
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/enumerate.js', 'utf8');
const patched = src.replace(/\/\* ---- 跑 ---- \*\/[\s\S]*$/, '') +
  '\nmodule.exports={unionOutline,simplify,area,inPoly,distPtPolyEdge};';
fs.writeFileSync(__dirname + '/_tmp_env.js', patched);
const E = require('./_tmp_env.js');

const polys = [
  [[3.0, 0.0], [0.0, 0.0], [1.0, 1.0], [3.0, 1.0]],          // A
  [[3.0, 1.0], [3.0, 0.0], [4.0, 1.0]],                       // B
  [[0.0, 1.5], [0.0, 0.0], [1.0, 1.0], [1.0, 1.5]],           // C
  [[3.0, 0.0], [0.0, 0.0], [1.0, -1.0], [2.5, -1.0], [2.25, -0.75]] // D
];

// 复刻内部流程并打印
function r4(v) { return Math.round(v * 1e4) / 1e4; }
const segs = [];
for (const p of polys) for (let i = 0; i < p.length; i++) segs.push([p[i], p[(i + 1) % p.length]]);
const parts = [];
for (let i = 0; i < segs.length; i++) {
  const [a, b] = segs[i];
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  const ts = [0, 1];
  for (let j = 0; j < segs.length; j++) {
    if (i === j) continue;
    const [c, d] = segs[j];
    const ex = d[0] - c[0], ey = d[1] - c[1];
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-12) {
      const cr = ((c[0] - a[0]) * dy - (c[1] - a[1]) * dx) / Math.sqrt(len2);
      if (Math.abs(cr) > 1e-6) continue;
      for (const q of [c, d]) {
        const t = ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / len2;
        if (t > 1e-9 && t < 1 - 1e-9) ts.push(t);
      }
      continue;
    }
    const t = ((c[0] - a[0]) * ey - (c[1] - a[1]) * ex) / den;
    const u = ((c[0] - a[0]) * dy - (c[1] - a[1]) * dx) / den;
    if (t > 1e-9 && t < 1 - 1e-9 && u > -1e-9 && u < 1 + 1e-9) ts.push(t);
  }
  ts.sort((x, y) => x - y);
  for (let k = 0; k < ts.length - 1; k++) {
    const t0 = ts[k], t1 = ts[k + 1];
    if (t1 - t0 < 1e-7) continue;
    parts.push([[a[0] + dx * t0, a[1] + dy * t0], [a[0] + dx * t1, a[1] + dy * t1]]);
  }
}
const insideUnion = pt => polys.some(p => E.inPoly(pt, p) && E.distPtPolyEdge(pt, p) > 1e-9);
console.log('切出的段数', parts.length);
for (const [m0, m1] of parts) {
  const dx = m1[0] - m0[0], dy = m1[1] - m0[1];
  const L = Math.hypot(dx, dy);
  const nx = -dy / L * 2e-3, ny = dx / L * 2e-3;
  const mx = (m0[0] + m1[0]) / 2, my = (m0[1] + m1[1]) / 2;
  const pos = insideUnion([mx + nx, my + ny]);
  const neg = insideUnion([mx - nx, my - ny]);
  const keep = pos !== neg;
  console.log(`  ${keep ? 'KEEP' : 'drop'}  (${m0[0].toFixed(2)},${m0[1].toFixed(2)})→(${m1[0].toFixed(2)},${m1[1].toFixed(2)})  pos=${pos} neg=${neg}`);
}
const loops = E.unionOutline(polys);
console.log('\nloops=', loops.length, 'areas=', loops.map(l => E.area(l).toFixed(3)));
for (const l of loops) console.log('  ' + l.map(v => `(${v[0].toFixed(2)},${v[1].toFixed(2)})`).join(' '));
