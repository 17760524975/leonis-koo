/* 剪影 → 0.5 格点吸附（双轴尺度 + 偏移，带硬约束过滤）
 *
 * 为什么能这么做：四巧板四块的顶点都是 0.5 的整数倍。45° 朝向会把顶点带到
 * 0.5·R45·Z² 上，而 0.5Z² 与 0.5·R45·Z² 只共享原点（√2 无理），两者不可能
 * 共享一条边 —— 所以任何合法剪影的顶点都在 0.5 格点上，拼法只用 0/90/180/270。
 *
 * 照片是手持拍摄，畸变不是纯尺度而是各向异性的（f4：x 偏 1.3%、y 偏 4%），
 * 所以按 x / y 各拟合一个尺度。硬约束：吸附后面积必须正好 6.000、所有边方向
 * 必须是 45° 的倍数、必须仍是简单多边形 —— 用这三个条件筛掉错解。
 *
 * 用法：node tools/figs4/snap.js
 */
const fs = require('fs');
const path = require('path');

const HERE = __dirname, OUT = path.join(HERE, 'out');
const POLY = JSON.parse(fs.readFileSync(path.join(OUT, 'poly.json'), 'utf8'));

function shoelace(p) {
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s / 2;
}
function phase(ts, step, nSamp) {
  let bo = 0, bv = Infinity;
  for (let k = 0; k < nSamp; k++) {
    const o = (k / nSamp) * step;
    let v = 0;
    for (const t of ts) { const q = Math.round((t - o) / step) * step + o; v += (t - q) ** 2; }
    if (v < bv) { bv = v; bo = o; }
  }
  // 局部细化
  const h = step / nSamp;
  for (let k = -4; k <= 4; k++) {
    const o = bo + k * h / 4;
    let v = 0;
    for (const t of ts) { const q = Math.round((t - o) / step) * step + o; v += (t - q) ** 2; }
    if (v < bv) { bv = v; bo = o; }
  }
  return { o: bo, v: bv };
}
function cleanSnap(pts) {
  const d = [];
  for (const v of pts) {
    const l = d[d.length - 1];
    if (!l || Math.abs(l[0] - v[0]) > 1e-9 || Math.abs(l[1] - v[1]) > 1e-9) d.push(v);
  }
  while (d.length > 2) {
    const a = d[0], b = d[d.length - 1];
    if (Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9) d.pop(); else break;
  }
  const out = [];
  for (let i = 0; i < d.length; i++) {
    const p0 = d[(i - 1 + d.length) % d.length], p1 = d[i], p2 = d[(i + 1) % d.length];
    const cr = (p1[0] - p0[0]) * (p2[1] - p1[1]) - (p1[1] - p0[1]) * (p2[0] - p1[0]);
    if (Math.abs(cr) > 1e-9) out.push(p1);
  }
  return out;
}
function edgesOk(poly) {
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const dx = Math.abs(b[0] - a[0]), dy = Math.abs(b[1] - a[1]);
    if (!(Math.abs(dx) < 1e-9 || Math.abs(dy) < 1e-9 || Math.abs(dx - dy) < 1e-9)) return false;
  }
  return true;
}
function isSimple(poly) {
  const n = poly.length;
  const seg = (i) => [poly[i], poly[(i + 1) % n]];
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const hit = (a, b, c, d) => {
    const d1 = cross(c, d, a), d2 = cross(c, d, b), d3 = cross(a, b, c), d4 = cross(a, b, d);
    return ((d1 > 1e-9 && d2 < -1e-9) || (d1 < -1e-9 && d2 > 1e-9)) &&
           ((d3 > 1e-9 && d4 < -1e-9) || (d3 < -1e-9 && d4 > 1e-9));
  };
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    if (j === i || (j + 1) % n === i || (i + 1) % n === j) continue;
    if (hit(seg(i)[0], seg(i)[1], seg(j)[0], seg(j)[1])) return false;
  }
  return true;
}

function snapPoly(poly) {
  const xs = poly.map(v => v[0]), ys = poly.map(v => v[1]);
  const sols = [], relax = [];
  for (let ax = 0; ax <= 60; ax++) {
    const sx = 0.94 + ax * 0.002;
    const px = phase(xs.map(v => v / sx), 0.5, 120);
    for (let ay = 0; ay <= 60; ay++) {
      const sy = 0.94 + ay * 0.002;
      const py = phase(ys.map(v => v / sy), 0.5, 120);
      const snapped = poly.map(v => [
        Math.round((v[0] / sx - px.o) / 0.5) * 0.5,
        Math.round((v[1] / sy - py.o) / 0.5) * 0.5
      ]);
      const cl = cleanSnap(snapped);
      const rms0 = Math.sqrt((px.v + py.v) / (xs.length + ys.length));
      const ar0 = Math.abs(shoelace(cl));
      if (edgesOk(cl) && isSimple(cl)) {
        relax.push({ poly: cl, sx, sy, ox: px.o, oy: py.o, rms: rms0, area: ar0 });
      }
      if (cl.length !== poly.length) continue;              // 顶点数必须保持
      if (!edgesOk(cl) || !isSimple(cl)) continue;
      const ar = ar0;
      if (Math.abs(ar - 6) > 1e-6) continue;                // 面积必须正好 6
      sols.push({ poly: cl, sx, sy, ox: px.o, oy: py.o,
        rms: Math.sqrt((px.v + py.v) / (xs.length + ys.length)),
        dev: Math.abs(sx - 1) + Math.abs(sy - 1) });
    }
  }
  sols.sort((a, b) => (a.rms + a.dev * 3) - (b.rms + b.dev * 3));
  relax.sort((a, b) => (a.rms + a.dev * 3) - (b.rms + b.dev * 3));
  return { sols, relax };
}

function rotPts(p, deg) {
  const t = deg * Math.PI / 180, co = Math.cos(t), si = Math.sin(t);
  return p.map(v => [v[0] * co - v[1] * si, v[0] * si + v[1] * co]);
}

const res = {};
for (const tag of Object.keys(POLY).sort()) {
  /* 参考图里的图案可能整体相对纸面转了 45°（此时边方向仍是 45° 倍数，
   * 看不出来）。旋转坐标系后顶点才落到 0.5 格点上，所以 4 个预旋转都要试。 */
  let bestAll = null;
  for (const pre of [0, 45, -45, 90, 135, -90, 180, -135]) {
    const rp = rotPts(POLY[tag].poly, pre);
    const R = snapPoly(rp);
    const S = R.sols;
    if (!S.length) {
      // 严格解没有 → 退而求其次，记录松弛最优（面积不保证 6）
      const rb = R.relax[0];
      if (rb) {
        const score = rb.rms + rb.dev * 3 + 10;   // 大惩罚，只在没有严格解时才用
        if (!bestAll || score < bestAll.score) {
          bestAll = { score, poly: rotPts(rb.poly, -pre), grid: rb.poly, pre,
            sx: rb.sx, sy: rb.sy, rms: rb.rms, nSol: 0, nv: rb.poly.length,
            area: rb.area, relaxed: true };
        }
      }
      continue;
    }
    const b = S[0];
    const score = b.rms + b.dev * 3;
    if (!bestAll || score < bestAll.score) {
      const back = rotPts(b.poly, -pre);          // 还原到照片朝向
      bestAll = { score, poly: back, grid: b.poly, pre, sx: b.sx, sy: b.sy,
        rms: b.rms, nSol: S.length, nv: b.poly.length, area: 6, relaxed: false };
    }
  }
  if (!bestAll) { console.log(tag, '✗ 无可行吸附'); res[tag] = { poly: null, polyGrid: null }; continue; }
  const b = bestAll;
  res[tag] = { poly: b.poly, polyGrid: b.grid, pre: b.pre, sx: +b.sx.toFixed(3), sy: +b.sy.toFixed(3),
    rms: +b.rms.toFixed(4), nv: b.nv, nSol: b.nSol, area: +(b.area || 6).toFixed(3), relaxed: !!b.relaxed };
  console.log(tag, '预旋转', (b.pre > 0 ? '+' : '') + b.pre + '°', '| 格点朝向顶点', b.nv,
    '| 尺度', b.sx.toFixed(3), b.sy.toFixed(3), '| 残差', b.rms.toFixed(3),
    b.relaxed ? ('| ⚠ 仅松弛解 面积 ' + b.area.toFixed(3)) : ('| 严格解 ' + b.nSol + ' 个'));
  console.log('    格点系:', b.grid.map(v => '(' + v[0] + ',' + v[1] + ')').join(' '));
  if (b.pre !== 0) console.log('    照片系:', b.poly.map(v => '(' + v[0].toFixed(3) + ',' + v[1].toFixed(3) + ')').join(' '));
}
fs.writeFileSync(path.join(OUT, 'snapped.json'), JSON.stringify(res, null, 1));
console.log('\n→ tools/figs4/out/snapped.json');
