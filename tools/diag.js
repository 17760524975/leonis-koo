/* 诊断：统计枚举结果被过滤的原因 */
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/enumerate.js', 'utf8');
// 复用 enumerate.js 里的函数：把它包一层导出
const sandbox = `
module.exports = { search, unionOutline, simplify, area, bbox, canonical, inPoly, samplePoints, centroidOf, DEFS };
`;
const patched = src.replace(/\/\* ---- 跑 ---- \*\/[\s\S]*$/, '') + sandbox;
fs.writeFileSync(__dirname + '/_tmp_env.js', patched);
const E = require('./_tmp_env.js');

const raw = E.search();
console.log('摆法总数', raw.length);
const stat = { loop0: 0, loop2: 0, simp: 0, area: 0, ok: 0 };
const badArea = [];
for (const conf of raw) {
  const loops = E.unionOutline(conf.map(p => p.poly));
  if (loops.length === 0) { stat.loop0++; continue; }
  if (loops.length > 1) { stat.loop2++; badArea.push({ conf, n: loops.length, areas: loops.map(l => E.area(l)) }); continue; }
  const outline = E.simplify(loops[0]);
  if (outline.length < 3) { stat.simp++; continue; }
  const a = E.area(outline);
  if (Math.abs(a - 6.0625) > 2e-3) { stat.area++; badArea.push({ conf, n: 1, areas: [a], outline }); continue; }
  stat.ok++;
}
console.log(stat);

console.log('\n--- 前 6 个异常样本 ---');
for (const b of badArea.slice(0, 6)) {
  console.log(`\nloops=${b.n} areas=${b.areas.map(x => x.toFixed(3)).join(',')}  板: ${b.conf.map(p => p.id + (p.flip ? '-' : '+') + Math.round(p.angle)).join(' ')}`);
  for (const p of b.conf) console.log(`   ${p.id}${p.flip ? '-' : '+'}${Math.round(p.angle)} ` + p.poly.map(v => `(${v[0].toFixed(3)},${v[1].toFixed(3)})`).join(' '));
}
