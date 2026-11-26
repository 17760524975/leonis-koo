/* 凸多边形外扩（沿法向等距偏移各条边，再求相邻边交点）
 * 用途：七巧板图案里有板只在「一个角」上相接，并集会裂成几块。把每块板外扩一点点
 * （0.05 单位 ≈ 5 世界单位，约图幅的 0.8%），角接触就变成真共边，并集自然是一个环。
 * 板都是凸的、边都落在 4 个方向上，所以偏移后求交点即可，不会自交。
 */
'use strict';

function signed(p) {
  let s = 0;
  for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; }
  return s / 2;
}
function inflate(P, d) {
  const Q = signed(P) < 0 ? P.slice().reverse() : P;
  const n = Q.length;
  const line = [];
  for (let i = 0; i < n; i++) {
    const a = Q[i], b = Q[(i + 1) % n];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const L = Math.hypot(dx, dy) || 1;
    const nx = dy / L, ny = -dx / L;              // CCW 的外法向
    line.push({ n: [nx, ny], o: nx * a[0] + ny * a[1] + d });
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    const A = line[(i - 1 + n) % n], B = line[i];
    const det = A.n[0] * B.n[1] - A.n[1] * B.n[0];
    if (Math.abs(det) < 1e-12) { out.push(Q[i].slice()); continue; }
    const x = (A.o * B.n[1] - B.o * A.n[1]) / det;
    const y = (A.n[0] * B.o - B.n[0] * A.o) / det;
    out.push([x, y]);
  }
  return out;
}
module.exports = { inflate };
