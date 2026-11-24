/* 仿射配准匹配：摄影带来的轻微透视/仿射畸变会毁掉「精确格点匹配」，
 * 因此改用「顶点对应 + 最小二乘仿射」把已知可拼轮廓配到提取多边形上，看残差。
 * 残差 < ~0.03u 即认为「照片画的就是这个形状」。
 *
 * 用法：node tools/figs4/affine.js
 */
const fs = require('fs');
const path = require('path');

const HERE = __dirname, OUT = path.join(HERE, 'out');
const POLY = JSON.parse(fs.readFileSync(path.join(OUT, 'poly.json'), 'utf8'));
const SHAPES = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'out', 'shapes.json'), 'utf8'));

function shoelace(p) {
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s / 2;
}
function centroidOf(p) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < p.length; i++) {
    const q = p[i], r = p[(i + 1) % p.length];
    const cr = q[0] * r[1] - r[0] * q[1];
    a += cr; cx += (q[0] + r[0]) * cr; cy += (q[1] + r[1]) * cr;
  }
  a /= 2;
  return [cx / (6 * a), cy / (6 * a)];
}

/* 解 A x = b（n×n，高斯消元 + 部分主元） */
function solveLin(A, b) {
  const n = b.length;
  const M = A.map((r, i) => r.concat([b[i]]));
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      if (!f) continue;
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((r, i) => r[n] / r[i]);
}

/* 把 src 仿射拟合到 dst（顶点已一一对应），返回残差与线性部分 */
function fitAffine(src, dst) {
  // x' = a x + b y + c ; y' = d x + e y + f
  const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const bx = [0, 0, 0], by = [0, 0, 0];
  for (let i = 0; i < src.length; i++) {
    const s = [src[i][0], src[i][1], 1], d = dst[i];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) A[r][c] += s[r] * s[c];
      bx[r] += s[r] * d[0]; by[r] += s[r] * d[1];
    }
  }
  const px = solveLin(A, bx), py = solveLin(A, by);
  if (!px || !py) return null;
  let ss = 0;
  for (let i = 0; i < src.length; i++) {
    const x = px[0] * src[i][0] + px[1] * src[i][1] + px[2];
    const y = py[0] * src[i][0] + py[1] * src[i][1] + py[2];
    ss += (x - dst[i][0]) ** 2 + (y - dst[i][1]) ** 2;
  }
  // 线性部分奇异值（衡量畸变强度）
  const a = px[0], b = px[1], c = py[0], d = py[1];
  const E = (a + d) / 2, F = (a - d) / 2, G = (c + b) / 2, H = (c - b) / 2;
  const s1 = Math.hypot(E, H) + Math.hypot(F, G), s2 = Math.abs(Math.hypot(E, H) - Math.hypot(F, G));
  return { rms: Math.sqrt(ss / src.length), s1, s2, ratio: s2 / (s1 || 1) };
}

const targets = Object.keys(POLY).sort();
const lib = SHAPES.map((s, i) => ({ idx: i, outline: s.outline, nsol: s.nsol }));

const res = {};
for (const tag of targets) {
  const T = POLY[tag].poly;
  const n = T.length;
  const cands = [];
  for (const L of lib) {
    const P = L.outline, m = P.length;
    if (m !== n) continue;                 // 顶点数必须一致
    let best = null;
    for (let rev = 0; rev < 2; rev++) {    // 两种绕向
      const Q = rev ? P.slice().reverse() : P;
      for (let off = 0; off < m; off++) {
        const R = Q.slice(off).concat(Q.slice(0, off));
        const f = fitAffine(R.clone ? R : R, T);
        if (!f) continue;
        if (!best || f.rms < best.rms) best = { ...f, off, rev };
      }
    }
    if (best) cands.push({ idx: L.idx, v: m, ...best });
  }
  cands.sort((a, b) => a.rms - b.rms);
  res[tag] = cands.slice(0, 6);
  console.log('\n' + tag + '（顶点 ' + n + '）');
  for (const c of cands.slice(0, 6)) {
    console.log('  #' + String(c.idx).padEnd(4), 'rms=' + c.rms.toFixed(4) + 'u',
      's=' + c.s1.toFixed(3) + '/' + c.s2.toFixed(3), '轴比=' + c.ratio.toFixed(3),
      '偏转=' + (c.off * 360 / c.v).toFixed(0) + '°' + (c.rev ? ' 反' : ''));
  }
  if (!cands.length) console.log('  （无同顶点数候选）');
}
fs.writeFileSync(path.join(OUT, 'affine.json'), JSON.stringify(res, null, 1));
console.log('\n→ tools/figs4/out/affine.json');
