/* 参考图 → 严格七巧板解
 *
 * 前提（已实测）：参考图本来就是七巧板拼的，7 块面积严格是 4:4:2:2:2:1:1、总 16u²。
 * 板与板之间只有一道白缝，所以每块量出来的凸包 = 真形状「向内等距偏移 r」。
 * 5 种板都是轴对称/中心对称图形 ⇒ 向内等距偏移**不改变质心**，只有尺寸小一圈。
 *
 * 步骤：
 *   1) 凸包 RDP 简化成真实角点（3/4 个顶点）；
 *   2) 面积比定「面积档」1/2/4（共 2 大 + 3 中 + 2 小），档内再挑板型 + 朝向 + 手性；
 *      这一步只比形状（允许自由缩放），所以不受偏移影响；
 *   3) 用「顶点必须落在间距 u 的整数格上」反解 u 与格点相位 φ
 *      —— 真解顶点全在 u 格上，u 错 2% 残差就明显变大，是最有力的约束；
 *   4) 每个顶点吸到最近格点，再用吸附后的顶点反查「哪个板型的哪种摆放」→ 严格解；
 *   5) 校验：面积 16u²、两两不重叠。
 *
 * 用法：node tools/letters7/snap.js [--dbg A]
 * 产出：tools/letters7/solved.json
 */
'use strict';
const fs = require('fs');
const path = require('path');
const HERE = __dirname;
const DBG = (process.argv.includes('--dbg') ? process.argv[process.argv.indexOf('--dbg') + 1] : null);

const TPL = {
  T1: [[0, 0], [4, 0], [2, 2]],             // 大三角 area 4
  T3: [[0, 0], [2, 0], [0, 2]],             // 中三角 area 2
  S: [[1, 0], [2, 1], [1, 2], [0, 1]],      // 正方形 area 2
  T4: [[0, 0], [2, 0], [1, 1]],             // 小三角 area 1
  P: [[1, 0], [3, 0], [2, 1], [0, 1]]       // 平行四边形 area 2
};
const AREA = { T1: 4, T3: 2, S: 2, T4: 1, P: 2 };

/* ---------------- 几何 ---------------- */
function sArea(p) {
  let a = 0;
  for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; }
  return a / 2;
}
const absArea = p => Math.abs(sArea(p));
const ccw = p => (sArea(p) < 0 ? p.slice().reverse() : p.slice());
function centroid(poly) {
  const P = ccw(poly);
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < P.length; i++) {
    const q = P[(i + 1) % P.length], cr = P[i][0] * q[1] - q[0] * P[i][1];
    a += cr; cx += (P[i][0] + q[0]) * cr; cy += (P[i][1] + q[1]) * cr;
  }
  a /= 2;
  return [cx / (6 * a), cy / (6 * a)];
}
function rot(p, k, flip) {
  const c = [1, 0, -1, 0][k], s = [0, 1, 0, -1][k], fx = flip ? -1 : 1;
  return ccw(p.map(v => [c * (v[0] * fx) - s * v[1], s * (v[0] * fx) + c * v[1]]));
}
function bbox(p) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const v of p) { x0 = Math.min(x0, v[0]); x1 = Math.max(x1, v[0]); y0 = Math.min(y0, v[1]); y1 = Math.max(y1, v[1]); }
  return [x0, y0, x1, y1];
}
function segDist(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
  let t = l2 > 0 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t);
}
function polyDist(A, B) {
  let d = Infinity;
  for (const v of A) for (let i = 0; i < B.length; i++) d = Math.min(d, segDist(v, B[i], B[(i + 1) % B.length]));
  for (const v of B) for (let i = 0; i < A.length; i++) d = Math.min(d, segDist(v, A[i], A[(i + 1) % A.length]));
  return d;
}
function inside(pt, poly) {
  let ins = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if (((yi > pt[1]) !== (yj > pt[1])) && (pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi)) ins = !ins;
  }
  return ins;
}
function overlapArea(polys) {
  // 只算两两（七巧板里任意三块不会共点），栅格采样 0.5px
  const all = polys.flat();
  const bb = bbox(all);
  const S = 2;
  const pad = 2;
  const W = Math.ceil((bb[2] - bb[0] + 2 * pad) * S), Hh = Math.ceil((bb[3] - bb[1] + 2 * pad) * S);
  const cnt = new Uint8Array(W * Hh);
  for (const poly of polys) {
    const pb = bbox(poly);
    const i0 = Math.max(0, Math.floor((pb[0] - bb[0] + pad) * S)), i1 = Math.min(W - 1, Math.ceil((pb[2] - bb[0] + pad) * S));
    const j0 = Math.max(0, Math.floor((pb[1] - bb[1] + pad) * S)), j1 = Math.min(Hh - 1, Math.ceil((pb[3] - bb[1] + pad) * S));
    for (let j = j0; j <= j1; j++) {
      const y = bb[1] - pad + (j + 0.5) / S;
      for (let i = i0; i <= i1; i++) {
        const x = bb[0] - pad + (i + 0.5) / S;
        if (inside([x, y], poly)) cnt[j * W + i]++;
      }
    }
  }
  let ov = 0;
  for (let k = 0; k < cnt.length; k++) if (cnt[k] >= 2) ov += cnt[k] - 1;
  return ov / (S * S);
}

/* 闭合 RDP */
function rdp(pts, tol) {
  if (pts.length < 3) return pts;
  const a = pts[0], b = pts[pts.length - 1];
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
  let idx = -1, best = -1;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i];
    const d = L < 1e-9 ? Math.hypot(p[0] - a[0], p[1] - a[1])
      : Math.abs((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) / L;
    if (d > best) { best = d; idx = i; }
  }
  if (best <= tol) return [a, b];
  const l = rdp(pts.slice(0, idx + 1), tol), r = rdp(pts.slice(idx), tol);
  return l.slice(0, -1).concat(r);
}
function simplifyClosed(poly, tol) {
  let fi = 1, fd = -1;
  for (let i = 1; i < poly.length; i++) {
    const d = Math.hypot(poly[i][0] - poly[0][0], poly[i][1] - poly[0][1]);
    if (d > fd) { fd = d; fi = i; }
  }
  const r1 = rdp(poly.slice(0, fi + 1), tol);
  const r2 = rdp(poly.slice(fi).concat([poly[0]]), tol);
  const out = r1.slice(0, -1).concat(r2.slice(0, -1));
  return out.length >= 3 ? out : poly;
}
function reduceVerts(poly, maxN) {
  let P = ccw(poly);
  while (P.length > maxN) {
    let bi = 0, bd = 1e18;
    for (let i = 0; i < P.length; i++) {
      const a = P[(i - 1 + P.length) % P.length], b = P[i], c = P[(i + 1) % P.length];
      const d = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / 2;
      if (d < bd) { bd = d; bi = i; }
    }
    P = P.slice(0, bi).concat(P.slice(bi + 1));
  }
  return P;
}

/* 形状拟合（缩放自由，用道格拉斯式顶点配对，穷举循环移位） */
function fitShape(hull, area, nV) {
  const H = ccw(hull);
  if (H.length !== nV) return null;
  const cH = centroid(H), aH = absArea(H);
  let best = null;
  for (const id in TPL) {
    if (AREA[id] !== area) continue;
    for (const flip of (id === 'P' ? [false, true] : [false])) {
      for (let k = 0; k < 4; k++) {
        const sh = rot(TPL[id], k, flip);
        if (sh.length !== nV) continue;
        const cS = centroid(sh), aS = absArea(sh);
        const s = Math.sqrt(aH / aS);
        for (let off = 0; off < nV; off++) {          // ← 循环移位：顶点起点未知
          let err = 0;
          for (let i = 0; i < nV; i++) {
            const j = (i + off) % nV;
            err += Math.hypot(cH[0] + (sh[j][0] - cS[0]) * s - H[i][0],
              cH[1] + (sh[j][1] - cS[1]) * s - H[i][1]);
          }
          err /= nV;
          if (!best || err < best.err) best = { id, k, flip, s, err, cH, cS, shape: sh, off };
        }
      }
    }
  }
  return best;
}

/* ---------------- 主流程 ---------------- */
const data = JSON.parse(fs.readFileSync(path.join(HERE, 'pieces.json'), 'utf8'));
const out = [];

for (const rec of data) {
  const ps = rec.pieces.slice().sort((a, b) => b.n - a.n).slice(0, 7);
  const totPx = ps.reduce((a, x) => a + x.n, 0);
  const u0 = Math.sqrt(totPx / 16);
  const raw = ps.map(p => simplifyClosed(p.hull, u0 * 0.16));

  /* 面积档：n/u0² 就近归到 1/2/4 */
  const cls = ps.map(p => {
    const r = p.n / (u0 * u0);
    return [1, 2, 4].reduce((a, b) => (Math.abs(b - r) < Math.abs(a - r) ? b : a));
  });
  const okCls = cls.slice().sort().join(',') === '1,1,2,2,2,4,4';

  /* 顶点数：面积档 1/4 一定是三角(3)；档 2 可能是 3 或 4 */
  const hulls = raw.map((h, i) => {
    if (cls[i] === 1 || cls[i] === 4) return reduceVerts(h, 3);
    return h.length > 4 ? reduceVerts(h, 4) : h;
  });
  const fits = hulls.map((h, i) => fitShape(h, cls[i], h.length));
  if (fits.some(f => !f)) {
    console.log(rec.ch, '✗ 拟合失败', cls.join(','), hulls.map(h => h.length).join(','));
    continue;
  }

  /* u 与格点相位：扫 u 让「所有顶点到最近格点的残差」最小 */
  const shapesAt = u => fits.map(f => f.shape.map(v => [
    f.cH[0] + (v[0] - f.cS[0]) * u, f.cH[1] + (v[1] - f.cS[1]) * u]));
  const wrap1 = x => x - Math.round(x);
  const phaseOf = (vals) => {
    let sx = 0, sy = 0;
    for (const v of vals) { const a = v * 2 * Math.PI; sx += Math.cos(a); sy += Math.sin(a); }
    let a = Math.atan2(sy, sx) / (2 * Math.PI);
    return a - Math.round(a);
  };
  const resAt = u => {
    const V = shapesAt(u).flat();
    const px = phaseOf(V.map(v => v[0] / u)), py = phaseOf(V.map(v => v[1] / u));
    let s = 0;
    for (const v of V) s += Math.max(Math.abs(wrap1(v[0] / u - px)), Math.abs(wrap1(v[1] / u - py)));
    return { res: s / V.length, px, py, V };
  };
  let bestU = null;
  for (let u = u0 * 0.90; u <= u0 * 1.12; u += u0 * 0.0004) {
    const r = resAt(u);
    if (!bestU || r.res < bestU.res) bestU = { u, ...r };
  }
  // 抛物线细调
  {
    const d = u0 * 0.0004, a = resAt(bestU.u - d).res, b = bestU.res, c = resAt(bestU.u + d).res;
    const den = a - 2 * b + c;
    const shift = Math.abs(den) > 1e-12 ? 0.5 * (a - c) / den : 0;
    const u2 = bestU.u + shift * d;
    bestU = { u: u2, ...resAt(u2) };
  }
  const u = bestU.u;

  if (DBG && rec.ch === DBG) {
    for (const [i, f] of fits.entries()) {
      console.log('  块', i, f.id, 'k=' + f.k * 90, f.flip ? 'F' : '', 's=' + f.s.toFixed(3),
        'err=' + f.err.toFixed(2), 'cH=' + f.cH.map(v => v.toFixed(1)).join(','));
    }
    console.log('  u0=' + u0.toFixed(3), 'u=' + u.toFixed(3), '残差=' + bestU.res.toFixed(3));
  }

  /* 吸附到格点 → 反查板型摆放 */
  let okExact = true;
  const solved = [];
  for (const [i, f] of fits.entries()) {
    const V = shapesAt(u)[i].map(v => [
      Math.round(v[0] / u - bestU.px) + bestU.px,
      Math.round(v[1] / u - bestU.py) + bestU.py]);
    let hit = null;
    for (const id in TPL) {
      if (AREA[id] !== AREA[f.id]) continue;
      for (const flip of (id === 'P' ? [false, true] : [false])) {
        for (let k = 0; k < 4; k++) {
          const sh = rot(TPL[id], k, flip);
          if (sh.length !== V.length) continue;
          // 用「最像的那个顶点」定平移
          for (let off = 0; off < sh.length && !hit; off++) {
            const tx = Math.round(V[0][0] - sh[off][0]), ty = Math.round(V[0][1] - sh[off][1]);
            const got = sh.map(v => [v[0] + tx, v[1] + ty]);
            const key = q => q.map(v => v[0] + ',' + v[1]).sort().join(';');
            if (key(got) === key(V)) hit = { id, k, flip, verts: got };
          }
        }
      }
    }
    if (!hit) { okExact = false; solved.push(null); continue; }
    const cS = centroid(hit.verts);
    solved.push({ tpl: hit.id, k: hit.k, flip: hit.flip, cx: cS[0], cy: cS[1],
      verts: hit.verts.map(v => [v[0], v[1]]) });
  }

  console.log(rec.ch, 'u=' + u.toFixed(3),
    '面积档', okCls ? 'OK' : '✗' + cls.join(','),
    '严格', okExact ? 'OK' : '✗',
    '残差', bestU.res.toFixed(3) + 'u',
    '板型', fits.map(f => f.id + '@' + f.k * 90 + (f.flip ? 'F' : '')).join(' '));
  out.push({ ch: rec.ch, u, box: rec.box, phase: [bestU.px, bestU.py], solved, okCls, okExact });
}

fs.writeFileSync(path.join(HERE, 'solved.json'), JSON.stringify(out, null, 1));
console.log('\n写入 solved.json');
