/* 调试：检查某个候选摆法的实际覆盖 vs 轮廓面积 */
const fs = require('fs');
const S = JSON.parse(fs.readFileSync(__dirname + '/out/shapes.json', 'utf8'));

function inPoly(pt, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[1] > pt[1]) !== (b[1] > pt[1]) &&
        pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}
function area(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) { const q = poly[(i + 1) % poly.length]; a += poly[i][0] * q[1] - q[0] * poly[i][1]; }
  return Math.abs(a) / 2;
}
function bbox(ps) {
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  for (const p of ps) for (const v of p) { a = Math.min(a, v[0]); b = Math.min(b, v[1]); c = Math.max(c, v[0]); d = Math.max(d, v[1]); }
  return [a, b, c, d];
}

for (const idx of [0, 1, 2, 5]) {
  const s = S[idx];
  const polys = s.conf.map(p => p.poly);
  const bb = bbox(polys.concat([s.outline]));
  const G = 0.01;
  let cov = 0, over = 0, inOutline = 0, total = 0;
  const rows = [];
  for (let y = bb[1]; y < bb[3]; y += G) {
    let row = '';
    for (let x = bb[0]; x < bb[2]; x += G) {
      const pt = [x + G / 2, y + G / 2];
      let n = 0;
      for (const p of polys) if (inPoly(pt, p)) n++;
      if (n >= 1) cov += G * G;
      if (n > 1) over += G * G;
      if (inPoly(pt, s.outline)) inOutline += G * G;
      total++;
      row += n > 1 ? 'X' : (n === 1 ? '#' : (inPoly(pt, s.outline) ? 'o' : '.'));
    }
    if (rows.length < 40) rows.push(row);
  }
  console.log(`\n===== #${idx} 轮廓面积=${area(s.outline).toFixed(3)} 摆法实际覆盖=${cov.toFixed(3)} 重叠=${over.toFixed(3)} 轮廓内=${inOutline.toFixed(3)}`);
  console.log('  板顶点:');
  for (const p of s.conf) console.log(`    ${p.id}${p.flip ? '-' : '+'}${p.angle}  ` + p.poly.map(v => `(${v[0].toFixed(2)},${v[1].toFixed(2)})`).join(' '));
  console.log('  轮廓: ' + s.outline.map(v => `(${v[0].toFixed(2)},${v[1].toFixed(2)})`).join(' '));
  for (const r of rows) console.log('  ' + r);
}
