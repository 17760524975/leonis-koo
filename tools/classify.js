/* 对 184 个轮廓算形状描述符，按目标剪影分类打分
 * 用法：node classify.js
 */
const fs = require('fs');
const S = JSON.parse(fs.readFileSync(__dirname + '/out/shapes.json', 'utf8'));

function area(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) { const q = poly[(i + 1) % poly.length]; a += poly[i][0] * q[1] - q[0] * poly[i][1]; }
  return Math.abs(a) / 2;
}
function bbox(poly) {
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  for (const v of poly) { a = Math.min(a, v[0]); b = Math.min(b, v[1]); c = Math.max(c, v[0]); d = Math.max(d, v[1]); }
  return [a, b, c, d];
}
function inPoly(pt, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[1] > pt[1]) !== (b[1] > pt[1]) && pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}
// 顺时针/逆时针（返回有符号面积>0 为逆时针）
function signedArea(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) { const q = poly[(i + 1) % poly.length]; a += poly[i][0] * q[1] - q[0] * poly[i][1]; }
  return a / 2;
}
function angles(poly) {
  const n = poly.length, out = [];
  const s = signedArea(poly) > 0 ? 1 : -1;
  for (let i = 0; i < n; i++) {
    const a = poly[(i - 1 + n) % n], b = poly[i], c = poly[(i + 1) % n];
    const v1 = [a[0] - b[0], a[1] - b[1]], v2 = [c[0] - b[0], c[1] - b[1]];
    let ang = Math.atan2(v1[0] * v2[1] - v1[1] * v2[0], v1[0] * v2[0] + v1[1] * v2[1]);
    let deg = ang * 180 / Math.PI;
    if (s > 0) deg = -deg;          // 统一成内角
    if (deg < 0) deg += 360;
    out.push(Math.round(deg));
  }
  return out;
}
function convexCount(poly) {
  const ang = angles(poly);
  return ang.filter(a => a > 185).length;   // 凹顶点
}
function axisEdgeRatio(poly) {
  const n = poly.length;
  let k = 0;
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n];
    if (Math.abs(a[0] - b[0]) < 1e-6 || Math.abs(a[1] - b[1]) < 1e-6) k++;
  }
  return k / n;
}
// 上下左右四边轮廓的"宽度剖面"，用来判断房子/船这种有腰线的形状
function widthProfile(poly, steps = 10) {
  const bb = bbox(poly);
  const out = [];
  for (let i = 0; i < steps; i++) {
    const y = bb[1] + (bb[3] - bb[1]) * (i + 0.5) / steps;
    let lo = Infinity, hi = -Infinity;
    for (let x = bb[0]; x <= bb[2]; x += (bb[2] - bb[0]) / 400) {
      if (inPoly([x, y], poly)) { lo = Math.min(lo, x); hi = Math.max(hi, x); }
    }
    out.push(hi > lo ? (hi - lo) / (bb[2] - bb[0]) : 0);
  }
  return out;
}

const rows = S.map(s => {
  const poly = s.outline;
  const bb = bbox(poly);
  const w = bb[2] - bb[0], h = bb[3] - bb[1];
  const a = area(poly);
  return {
    idx: s.idx,
    n: poly.length,
    w: +w.toFixed(2), h: +h.toFixed(2),
    fill: +(a / (w * h)).toFixed(3),
    concave: convexCount(poly),
    axis: +axisEdgeRatio(poly).toFixed(2),
    angles: angles(poly).join(','),
    profile: widthProfile(poly).map(v => v.toFixed(2)).join(' '),
    conf: s.conf.map(p => p.id + (p.flip ? '-' : '+') + Math.round(p.angle)).join(' ')
  };
});

fs.writeFileSync(__dirname + '/out/table.json', JSON.stringify(rows, null, 1));

console.log('idx  n  w×h          fill 凹 轴边 角度');
for (const r of rows) {
  console.log(`${String(r.idx).padStart(3)}  ${r.n}  ${r.w}×${r.h}`.padEnd(24) +
    `${r.fill.toFixed(2)} ${r.concave}  ${r.axis.toFixed(2)}  ${r.angles}`);
}

// ---- 目标剪影筛选 ----
const pick = (label, fn) => {
  const c = rows.filter(fn);
  console.log(`\n### ${label}: ${c.length} 个 -> ${c.slice(0, 12).map(r => '#' + r.idx).join(' ')}`);
  return c;
};
console.log('\n======== 候选筛选 ========');
pick('矩形(4顶点全直角)', r => r.n === 4 && r.concave === 0 && r.axis === 1 && r.fill > 0.9);
pick('梯形(4顶点,2直角边)', r => r.n === 4 && r.concave === 0 && r.axis >= 0.5 && r.axis < 1);
pick('L形(6顶点,1凹,轴对齐)', r => r.n === 6 && r.concave === 1 && r.axis > 0.8);
pick('房子(5-7顶点,1-2凹?)', r => r.n >= 5 && r.n <= 7 && r.fill > 0.8);
pick('4顶点fill高', r => r.n === 4 && r.fill > 0.85);
