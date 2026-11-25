/* 量每关「板与板之间本该贴合却留了缝」的真实间距
 * 对每一对板件算最小顶点-边距离；把 0 < d < 40（世界单位）视为「本该 0 却留了缝」
 * 用法：node tools/gap_audit.js [git]
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
require(path.join(ROOT, 'js', 'geom.js'));
require(path.join(ROOT, 'js', 'levels.js'));
const G = globalThis.TANGRAM_GEOM;
let SETS = globalThis.TANGRAM_SETS;
if (process.argv[2] === 'git') {
  const box = {};
  new Function('window', 'globalThis', 'console', fs.readFileSync(path.join(ROOT, 'tools', 'out', '_levels_githead.js'), 'utf8'))(box, box, console);
  SETS = box.TANGRAM_SETS;
}
const S = SETS.tangram7;
const UNIT = S.dataset.unitScale || 96;
const LOCAL = {};
Object.keys(S.dataset.pieces).forEach(id => {
  LOCAL[id] = G.makeLocal(S.dataset.pieces[id].base).map(v => [v[0] * UNIT, v[1] * UNIT]);
});

function segDist(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
  let t = L2 > 0 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2 : 0;
  t = Math.max(0, Math.min(1, t));
  const qx = a[0] + dx * t, qy = a[1] + dy * t;
  return Math.hypot(p[0] - qx, p[1] - qy);
}
function polyDist(A, B) {           // 两组多边形的最近距离（顶点到对边）
  let m = Infinity;
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < B.length; j++) {
      m = Math.min(m, segDist(A[i], B[j], B[(j + 1) % B.length]));
      m = Math.min(m, segDist(B[j], A[i], A[(i + 1) % A.length]));
    }
  }
  return m;
}

const LIMIT = +(process.argv[3] || 40);
const rows = [];
S.levels.forEach(lv => {
  const P = lv.solution.map(st => ({ id: st.id, poly: G.toWorld(LOCAL[st.id], st) }));
  let worstPair = '', worstGap = 0, nGap = 0;
  for (let i = 0; i < P.length; i++) {
    for (let j = i + 1; j < P.length; j++) {
      const d = polyDist(P[i].poly, P[j].poly);
      if (d > 0.02 && d < LIMIT) { nGap++; if (d > worstGap) { worstGap = d; worstPair = P[i].id + '↔' + P[j].id; } }
    }
  }
  rows.push({ name: lv.name, id: lv.id, worstGap, worstPair, nGap });
});
rows.sort((a, b) => b.worstGap - a.worstGap);
console.log('阈值：0 < 缝 < ' + LIMIT + ' 世界单位记为「本该贴合却留缝」\n');
rows.forEach(r => console.log('  ' + String(r.name).padEnd(6), '#' + String(r.id).padEnd(3),
  ('maxGap=' + r.worstGap.toFixed(2)).padStart(14), ('n=' + r.nGap).padStart(4), r.worstPair));
const ls = rows.filter(r => /^[A-Z]$/.test(r.name));
console.log('\n字母 26 关：有缝对数合计', ls.reduce((s, r) => s + r.nGap, 0), '| 最大缝', Math.max(...ls.map(r => r.worstGap)).toFixed(2));
