/* 用游戏自己的判定器验收字母关卡（含半格平移搜索）
 * 用法：node tools/alpha/verify.js
 */
const fs = require('fs');
const path = require('path');
const J = require('../../js/judge.js');
const G = require('../../js/geom.js');
const C = require('../../js/config.js');
const PAIR_TOL = (C.CONFIG && C.CONFIG.JUDGE ? C.CONFIG.JUDGE : C.JUDGE).pairTol;

const sols = JSON.parse(fs.readFileSync(path.join(__dirname, 'out/solutions.json'), 'utf8'));
const ORDER = ['T1', 'T2', 'T3', 'S', 'T4', 'T5', 'P'];

function mapAll(rings, pieces, offx, offy) {
  let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
  rings.forEach(r => r.forEach(p => {
    minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]);
    miny = Math.min(miny, p[1]); maxy = Math.max(maxy, p[1]);
  }));
  const s = 760 / Math.max(maxx - minx, maxy - miny);
  const ox = (1000 - (maxx - minx) * s) / 2 - minx * s + offx;
  const oy = (1000 - (maxy - miny) * s) / 2 - miny * s + offy;
  const m = p => [p[0] * s + ox, p[1] * s + oy];
  return { rings: rings.map(r => r.map(m)), pieces: pieces.map(p => p.pts.map(m)) };
}

function check(L, offx, offy) {
  const { rings, pieces } = mapAll(L.outline, L.pieces, offx, offy);
  const judge = new J.Judge();
  judge.setTarget(rings[0], rings.slice(1));
  const polys = pieces.map((poly, i) => [poly, ORDER.indexOf(L.pieces[i].shape)]);
  const r = judge.judge(polys);
  const areas = polys.map(a => G.area(a[0]));
  const bad = r.overlapPairs.filter(pp => {
    const k = pp.key.split('-').map(Number);
    const ia = polys.findIndex(x => x[1] === k[0]);
    const ib = polys.findIndex(x => x[1] === k[1]);
    return pp.cells * J.CELL * J.CELL > PAIR_TOL * Math.min(areas[ia], areas[ib]);
  });
  return { cov: r.coverage, ovf: r.overflow, bad: bad.length, raw: r.overlapPairs.length };
}

let pass = 0, total = 0;
const rows = [];
for (const name of Object.keys(sols).sort()) {
  const L = sols[name];
  let best = null;
  for (const ox of [0, 1, 2, 3]) for (const oy of [0, 1, 2, 3]) {
    const v = check(L, ox, oy);
    const okv = v.cov >= 0.99 && v.ovf <= 0.01 && v.bad === 0;
    const score = (okv ? 0 : 1000) + v.bad * 10 + (1 - v.cov) * 100 - v.raw;
    if (!best || score < best.score) best = Object.assign({ score, offx: ox, offy: oy, ok: okv }, v);
  }
  total++; if (best.ok) pass++;
  rows.push({ name, off: [best.offx, best.offy], cov: best.cov, ovf: best.ovf, pairs: best.bad, ok: best.ok });
  console.log(`${name}  off=(${best.offx},${best.offy})  coverage=${best.cov.toFixed(4)}  overflow=${best.ovf.toFixed(4)}  真重叠=${best.bad}/${best.raw}  ${best.ok ? 'PASS' : 'FAIL'}`);
}
console.log(`\n合计 ${pass}/${total} 关通过判定`);
fs.writeFileSync(path.join(__dirname, 'out/verify.json'), JSON.stringify(rows, null, 1));
