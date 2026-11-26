/* 凸多边形并集轮廓（专治七巧板）
 * ==================================================================
 * 为什么不直接用 tools/zodiac/union.js：那版用「节点聚类 + a→b / b→a 抵消」，
 * 对严格贴边的理想数据没问题，但我们是**从像素反解**出来的，板与板之间还有
 * 0.01~0.05 的误差、局部还有 0.05 量级的压叠。那版在这种输入上会裂成 2~3 个环，
 * 甚至算出比板面积之和还大的外环（环自交）。
 *
 * 这一版把每一步都摊开，方便单独验证：
 *   1) 每条边在「其它板的顶点」和「与其它边的交点」处打断
 *   2) 丢掉严格落在别的板内部的子段（压叠那部分）
 *   3) 端点按 tol 网格聚类（贴边误差在这里被抹平）
 *   4) 方向相反的重复段互相抵消（= 内部共用边）
 *   5) 串环：每个节点挑「左转最小」的未用边，保证沿外边界逆时针走
 */
'use strict';

const EPS = 1e-9;

function signed(p) {
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s / 2;
}
const ccw = p => (signed(p) < 0 ? p.slice().reverse() : p);
const areaOf = p => Math.abs(signed(p));

function inPoly(px, py, P) {
  let inside = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const xi = P[i][0], yi = P[i][1], xj = P[j][0], yj = P[j][1];
    if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function distToPoly(px, py, P) {
  let m = Infinity;
  for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const L2 = dx * dx + dy * dy || 1;
    let t = ((px - a[0]) * dx + (py - a[1]) * dy) / L2;
    t = Math.max(0, Math.min(1, t));
    m = Math.min(m, Math.hypot(px - (a[0] + dx * t), py - (a[1] + dy * t)));
  }
  return m;
}
/* 线段 ab 与 cd 的交点参数 t（在 ab 上）；无交点返回 null */
function segT(a, b, c, d) {
  const rx = b[0] - a[0], ry = b[1] - a[1], sx = d[0] - c[0], sy = d[1] - c[1];
  const den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-12) return null;
  const t = ((c[0] - a[0]) * sy - (c[1] - a[1]) * sx) / den;
  const u = ((c[0] - a[0]) * ry - (c[1] - a[1]) * rx) / den;
  if (u < -1e-9 || u > 1 + 1e-9) return null;
  return t;
}

function unionOutline(polys, tol) {
  tol = tol == null ? 0.12 : tol;
  const n = polys.length;
  const PS = polys.map(ccw);

  /* ---- 1) 打断 ---- */
  let segs = [];
  for (let i = 0; i < n; i++) {
    const P = PS[i];
    for (let k = 0; k < P.length; k++) {
      const a = P[k], b = P[(k + 1) % P.length];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (L < 1e-9) continue;
      const ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
      const ts = [0, 1];
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        for (const v of PS[j]) {
          const p = (v[0] - a[0]) * ux + (v[1] - a[1]) * uy;
          const dd = Math.abs(-(v[0] - a[0]) * uy + (v[1] - a[1]) * ux);
          if (dd <= tol && p > 1e-6 && p < L - 1e-6) ts.push(p / L);
        }
        for (let m = 0; m < PS[j].length; m++) {
          const t = segT(a, b, PS[j][m], PS[j][(m + 1) % PS[j].length]);
          if (t != null && t > 1e-6 && t < 1 - 1e-6) ts.push(t);
        }
      }
      ts.sort((x, y) => x - y);
      for (let q = 0; q + 1 < ts.length; q++) {
        if (ts[q + 1] - ts[q] < 1e-7) continue;
        segs.push({
          a: [a[0] + (b[0] - a[0]) * ts[q], a[1] + (b[1] - a[1]) * ts[q]],
          b: [a[0] + (b[0] - a[0]) * ts[q + 1], a[1] + (b[1] - a[1]) * ts[q + 1]],
          pi: i
        });
      }
    }
  }

  /* ---- 2) 丢掉严格落在别的板内部的子段 ---- */
  segs = segs.filter(s => {
    const mx = (s.a[0] + s.b[0]) / 2, my = (s.a[1] + s.b[1]) / 2;
    for (let j = 0; j < n; j++) {
      if (j === s.pi) continue;
      if (!inPoly(mx, my, PS[j])) continue;
      if (distToPoly(mx, my, PS[j]) > tol * 0.35) return false;
    }
    return true;
  });

  /* ---- 3) 端点聚类 ---- */
  const cell = tol * 2;
  const grid = new Map();
  const nodes = [];
  const nodeOf = pt => {
    const gx = Math.floor(pt[0] / cell), gy = Math.floor(pt[1] / cell);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const arr = grid.get((gx + dx) + ',' + (gy + dy));
        if (!arr) continue;
        for (const id of arr) {
          const q = nodes[id];
          if (Math.hypot(q[0] - pt[0], q[1] - pt[1]) <= tol) return id;
        }
      }
    }
    const id = nodes.length;
    nodes.push([pt[0], pt[1]]);
    const k = gx + ',' + gy;
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(id);
    return id;
  };

  /* ---- 4) 抵消反向重复段 ---- */
  const seen = new Map();
  for (const s of segs) {
    s.u = nodeOf(s.a);
    s.v = nodeOf(s.b);
    if (s.u === s.v) s.dead = true;
  }
  for (const s of segs) {
    if (s.dead) continue;
    const key = Math.min(s.u, s.v) + '#' + Math.max(s.u, s.v);
    if (!seen.has(key)) { seen.set(key, s); continue; }
    const prev = seen.get(key);
    if (prev.u === s.v && prev.v === s.u) {      // 反向 -> 内部共用边，两条都删
      prev.dead = true; s.dead = true; seen.delete(key);
    } else {
      seen.set(key, s);                          // 同向重复：留一条
    }
  }
  const live = segs.filter(s => !s.dead);

  /* ---- 5) 串环 ---- */
  const out = new Map();          // node -> [{to, ang, used}]
  for (const s of live) {
    const ang = Math.atan2(nodes[s.v][1] - nodes[s.u][1], nodes[s.v][0] - nodes[s.u][0]);
    if (!out.has(s.u)) out.set(s.u, []);
    out.get(s.u).push({ to: s.v, ang, used: false });
  }
  out.forEach(arr => arr.sort((x, y) => x.ang - y.ang));

  const rings = [];
  for (const [start, arr] of out) {
    for (const e0 of arr) {
      if (e0.used) continue;
      const ring = [start];
      let cur = start, e = e0;
      let guard = 0;
      while (e && !e.used && guard++ < 10000) {
        e.used = true;
        cur = e.to;
        if (cur === start) break;
        ring.push(cur);
        const nxt = out.get(cur) || [];
        /* 从左转最小的那条走（逆时针绕外边界） */
        const inAng = Math.atan2(nodes[cur][1] - nodes[ring[ring.length - 2]][1],
          nodes[cur][0] - nodes[ring[ring.length - 2]][0]);
        let pick = null, bestTurn = 1e9;
        for (const cand of nxt) {
          if (cand.used) continue;
          let turn = cand.ang - inAng;
          while (turn <= -Math.PI) turn += Math.PI * 2;
          while (turn > Math.PI) turn -= Math.PI * 2;
          if (turn < -1e-9) turn += Math.PI * 2;   // 不许往回走
          if (turn < bestTurn) { bestTurn = turn; pick = cand; }
        }
        e = pick;
      }
      if (ring.length >= 3) rings.push(ring.map(id => nodes[id].slice()));
    }
  }

  rings.sort((a, b) => areaOf(b) - areaOf(a));
  return rings;
}

function splitLoops(rings, polys) {
  const outer = rings[0] || [];
  const holes = rings.slice(1);
  const sumA = polys.reduce((a, p) => a + areaOf(p), 0);
  const outA = rings.reduce((a, r, i) => a + (i === 0 ? areaOf(r) : -areaOf(r)), 0);
  return { outer, holes, sumA, outA };
}

module.exports = { unionOutline, splitLoops, inPoly, areaOf };
