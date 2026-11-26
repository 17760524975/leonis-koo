/* 把反解出来的板「对齐到共同的边线族」
 * ==================================================================
 * 像素反解的误差是 0.01~0.05 单位：本该重合的两条边，一条在 x=2.85，另一条在 x=2.87。
 * 这 0.02 会让并集算法裂环、生成台阶 —— 但把整块板挪过去又会跑偏姿势。
 *
 * 观察到一件很硬的事实：七巧板的边只有 4 个方向（0° / 45° / 90° / 135°）。
 * 于是「正确的解」里，每条边都落在某个方向族的某条直线上，两条本该重合的边落在**同一条**。
 * 所以：
 *   1) 每条边算出「法向偏移」 o = n·a；
 *   2) 按方向族把 o 聚类（容差 tol），组内取均值 = 这条直线族应有的偏移；
 *   3) 每块板只允许平移 δ，让它的边尽量落在这些直线上 —— 这是 2x2 最小二乘，闭式解。
 *
 * 一块板位移通常 ≤0.05 单位（≈5 世界单位），姿势不动，但边已经严丝合缝。
 */
'use strict';

const D2R = Math.PI / 180;

function snapLines(polys, tol) {
  tol = tol == null ? 0.08 : tol;

  /* ---- 1) 收集边 ---- */
  const edges = [];
  const fams = [[], [], [], []];
  polys.forEach((P, pi) => {
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const L = Math.hypot(dx, dy);
      if (L < 1e-9) continue;
      let fi = Math.round(Math.atan2(dy, dx) / (45 * D2R));
      fi = ((fi % 4) + 4) % 4;                       // 边方向无正负，归到 0..3
      const th = (fi * 45 + 90) * D2R;               // 法线方向
      const n = [Math.cos(th), Math.sin(th)];
      const o = n[0] * a[0] + n[1] * a[1];
      edges.push({ pi, fi, n, o });
      fams[fi].push(o);
    }
  });

  /* ---- 2) 每个方向族把偏移聚类 ---- */
  const centers = fams.map(arr => {
    const v = arr.slice().sort((x, y) => x - y);
    const out = [];
    let i = 0;
    while (i < v.length) {
      let j = i, s = 0, c = 0;
      while (j < v.length && v[j] - v[i] <= tol) { s += v[j]; c++; j++; }
      out.push(s / c);
      i = j;
    }
    return out;
  });
  const nearest = (fi, o) => {
    let best = null, bd = Infinity;
    for (const c of centers[fi]) {
      const d = Math.abs(c - o);
      if (d < bd) { bd = d; best = c; }
    }
    return best == null ? o : best;
  };

  /* ---- 3) 每块板 2x2 最小二乘 ---- */
  const moves = polys.map(() => [0, 0]);
  const res = polys.map(() => 0);
  for (let pi = 0; pi < polys.length; pi++) {
    const rows = [];
    for (const e of edges) {
      if (e.pi !== pi) continue;
      rows.push({ n: e.n, r: nearest(e.fi, e.o) - e.o });
    }
    if (!rows.length) continue;
    /* A^T A δ = A^T r，加一点向 0 的正则，防病态 */
    let a11 = 0, a12 = 0, a22 = 0, b1 = 0, b2 = 0;
    for (const { n, r } of rows) {
      a11 += n[0] * n[0]; a12 += n[0] * n[1]; a22 += n[1] * n[1];
      b1 += n[0] * r; b2 += n[1] * r;
    }
    a11 += 1e-3; a22 += 1e-3;
    const det = a11 * a22 - a12 * a12;
    if (Math.abs(det) < 1e-12) continue;
    const dx = (b1 * a22 - b2 * a12) / det;
    const dy = (a11 * b2 - a12 * b1) / det;
    moves[pi] = [dx, dy];
    let s2 = 0;
    for (const { n, r } of rows) {
      const e2 = n[0] * dx + n[1] * dy - r;
      s2 += e2 * e2;
    }
    res[pi] = Math.sqrt(s2 / rows.length);
  }

  return {
    polys: polys.map((P, i) => P.map(v => [v[0] + moves[i][0], v[1] + moves[i][1]])),
    moves, res
  };
}

module.exports = { snapLines };
