/* 七巧板「四分之一三角形」离散化 + 精确覆盖求解器（零依赖 JS 版）
 *
 * 为什么这样离散：板的顶点都在整数格、边只有 0/45/90/135°，把每个单位方格用
 * 两条对角线切成 N/E/S/W 四个小三角形后，板的边界恰好落在这些小三角形的边上，
 * 于是「占了多少个小三角形」就精确等于面积 ×4，不存在采样误差。
 * 7 块板总面积 16u² ⇒ 恰好 64 个小三角形。
 *
 * 提供：
 *   makeGrid(w, h)                     → 网格（w×h 个单位格，4w·4h 个小三角形）
 *   trisOfPoly(poly, grid)             → 多边形覆盖的小三角形索引数组
 *   placementsOf(id, grid)             → 该板所有「落在网格内」的摆放（含 mask）
 *   exactCover(target, grid, opts)     → 精确覆盖求解，返回每块板的摆放
 *   ringsOf(polys)                     → 并集的外轮廓环 + 内孔环
 */
'use strict';

const BASE = {
  T1: [[0, 0], [4, 0], [2, 2]],
  T2: [[0, 0], [4, 0], [2, 2]],
  T3: [[0, 0], [2, 0], [0, 2]],
  S: [[1, 0], [2, 1], [1, 2], [0, 1]],
  T4: [[0, 0], [2, 0], [1, 1]],
  T5: [[0, 0], [2, 0], [1, 1]],
  P: [[1, 0], [3, 0], [2, 1], [0, 1]]
};
const ORDER = ['T1', 'T2', 'T3', 'S', 'P', 'T4', 'T5'];
const AREA = { T1: 4, T2: 4, T3: 2, S: 2, T4: 1, T5: 1, P: 2 };

const TRI = [[0.5, 5 / 6], [5 / 6, 0.5], [0.5, 1 / 6], [1 / 6, 0.5]];

function shoelace(p) {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const q = p[(i + 1) % p.length];
    a += p[i][0] * q[1] - q[0] * p[i][1];
  }
  return a / 2;
}
function ccw(p) { return shoelace(p) > 0 ? p.slice() : p.slice().reverse(); }
function orient(base, k, flip) {
  const c = [1, 0, -1, 0][k], s = [0, 1, 0, -1][k], fx = flip ? -1 : 1;
  return ccw(base.map(v => [c * (v[0] * fx) - s * v[1], s * (v[0] * fx) + c * v[1]]));
}
function inPoly(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if (((yi > pt[1]) !== (yj > pt[1])) &&
      (pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

function makeGrid(ox, oy, nx, ny) {
  const g = { ox, oy, nx, ny, n: nx * ny * 4 };
  return g;
}
function triIndex(g, i, j, q) { return ((j * g.nx + i) * 4) + q; }
function triCenter(g, idx) {
  const cell = idx >> 2, q = idx & 3, i = cell % g.nx, j = (cell / g.nx) | 0;
  return [g.ox + i + TRI[q][0], g.oy + j + TRI[q][1]];
}
function trisOfPoly(poly, g) {
  const out = [];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const v of poly) {
    if (v[0] < x0) x0 = v[0]; if (v[0] > x1) x1 = v[0];
    if (v[1] < y0) y0 = v[1]; if (v[1] > y1) y1 = v[1];
  }
  const i0 = Math.max(0, Math.floor(x0 - g.ox)), i1 = Math.min(g.nx - 1, Math.ceil(x1 - g.ox));
  const j0 = Math.max(0, Math.floor(y0 - g.oy)), j1 = Math.min(g.ny - 1, Math.ceil(y1 - g.oy));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    for (let q = 0; q < 4; q++) {
      const c = [g.ox + i + TRI[q][0], g.oy + j + TRI[q][1]];
      if (inPoly(c, poly)) out.push(triIndex(g, i, j, q));
    }
  }
  return out;
}
function maskOf(idxs) {
  let m = 0n;
  for (const k of idxs) m |= (1n << BigInt(k));
  return m;
}

/* 该板的所有摆放（90° 旋转 + 平行四边形镜像），要求完全落在网格内 */
function placementsOf(id, g, cache) {
  const key = id + ':' + g.ox + ',' + g.oy + ',' + g.nx + ',' + g.ny;
  if (cache && cache[key]) return cache[key];
  const out = [];
  const flips = id === 'P' ? [false, true] : [false];
  const seen = new Set();
  for (const f of flips) for (let k = 0; k < 4; k++) {
    const shape = orient(BASE[id], k, f);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const v of shape) {
      if (v[0] < x0) x0 = v[0]; if (v[0] > x1) x1 = v[0];
      if (v[1] < y0) y0 = v[1]; if (v[1] > y1) y1 = v[1];
    }
    for (let ty = Math.ceil(g.oy - y0); ty <= Math.floor(g.oy + g.ny - y1); ty++) {
      for (let tx = Math.ceil(g.ox - x0); tx <= Math.floor(g.ox + g.nx - x1); tx++) {
        const poly = shape.map(v => [v[0] + tx, v[1] + ty]);
        const idxs = trisOfPoly(poly, g);
        if (idxs.length !== AREA[id] * 4) continue;     // 贴边/出界会丢格
        const m = maskOf(idxs);
        const sk = m.toString();
        if (seen.has(sk)) continue;
        seen.add(sk);
        out.push({ id, poly, mask: m, cells: idxs });
      }
    }
  }
  if (cache) cache[key] = out;
  return out;
}

/* 精确覆盖：7 块板恰好铺满 target（BigInt 位集）
 * opts.byId = { T1:[placements], ... } 可预先过滤（只保留与 target 有交的） */
function exactCover(target, g, opts) {
  opts = opts || {};
  const cache = opts.cache;
  const byId = {};
  for (const id of ORDER) {
    let ps = opts.byId && opts.byId[id];
    if (!ps) {
      ps = placementsOf(id, g, cache).filter(p => (p.mask & ~target) === 0n);
    }
    byId[id] = ps;
  }
  const total = popcount(target);
  if (total !== 64) return null;
  const order = ORDER.slice().sort((a, b) => byId[a].length - byId[b].length);
  const used = new Set();
  const sol = [];

  function popcount(x) {
    let n = 0;
    while (x) { x &= x - 1n; n++; }
    return n;
  }
  function lowestBit(x) {
    return x & -x;
  }
  function rec(covered) {
    if (covered === target) return true;
    if (sol.length >= 7) return false;
    const rest = target & ~covered;
    // 选一个覆盖方式最少的空格（最少剩余值启发）
    let bestCell = -1, bestCount = 1e9, bestPl = null;
    let tmp = rest;
    let guard = 0;
    while (tmp && guard++ < 200) {
      const b = lowestBit(tmp);
      const idx = b.toString(2).length - 1;
      let cnt = 0, cand = null;
      for (const id of order) {
        if (used.has(id)) continue;
        for (const p of byId[id]) {
          if ((p.mask & b) && (p.mask & ~(target & ~covered)) === 0n) { cnt++; cand = p; if (cnt > 1) break; }
        }
        if (cnt > 1) break;
      }
      if (cnt < bestCount) { bestCount = cnt; bestCell = idx; bestPl = cand; }
      if (cnt === 0) return false;
      tmp &= tmp - 1n;
    }
    if (bestCell < 0) return false;
    const b = 1n << BigInt(bestCell);
    const left = target & ~covered;
    for (const id of order) {
      if (used.has(id)) continue;
      for (const p of byId[id]) {
        if (!(p.mask & b)) continue;
        if ((p.mask & ~left) !== 0n) continue;
        used.add(id);
        sol.push(p);
        if (rec(covered | p.mask)) return true;
        sol.pop();
        used.delete(id);
      }
    }
    return false;
  }
  return rec(0n) ? sol.slice() : null;
}

/* 并集 → 边界环（外轮廓 + 内孔） */
function r6(v) { return Math.round(v * 1e6) / 1e6; }
function key2(a, b) {
  const A = r6(a[0]) + ',' + r6(a[1]), B = r6(b[0]) + ',' + r6(b[1]);
  return A < B ? A + '|' + B : B + '|' + A;
}
function onSeg(p, a, b) {
  const cr = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
  if (Math.abs(cr) > 1e-7) return false;
  return ((p[0] - a[0]) * (p[0] - b[0]) + (p[1] - a[1]) * (p[1] - b[1])) <= 1e-7;
}
function splitRaw(polys) {
  const verts = [];
  for (const p of polys) for (const v of p) verts.push(v);
  const raw = [];
  for (const poly of polys) {
    const n = poly.length;
    for (let i = 0; i < n; i++) {
      const a = poly[i], b = poly[(i + 1) % n];
      const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
      const ts = [0, 1];
      for (const v of verts) {
        if ((v[0] === a[0] && v[1] === a[1]) || (v[0] === b[0] && v[1] === b[1])) continue;
        if (!onSeg(v, a, b)) continue;
        const t = ((v[0] - a[0]) * dx + (v[1] - a[1]) * dy) / l2;
        if (t > 1e-9 && t < 1 - 1e-9) ts.push(t);
      }
      ts.sort((x, y) => x - y);
      for (let k = 0; k + 1 < ts.length; k++) {
        if (ts[k + 1] - ts[k] < 1e-9) continue;
        raw.push([[a[0] + dx * ts[k], a[1] + dy * ts[k]],
          [a[0] + dx * ts[k + 1], a[1] + dy * ts[k + 1]]]);
      }
    }
  }
  return raw;
}
function ringsOf(polys) {
  const raw = splitRaw(polys);
  const counts = {};
  for (const e of raw) { const k = key2(e[0], e[1]); counts[k] = (counts[k] || 0) + 1; }
  const boundary = raw.filter(e => counts[key2(e[0], e[1])] === 1);
  const internal = raw.filter(e => counts[key2(e[0], e[1])] >= 2);
  const vk = v => r6(v[0]) + ',' + r6(v[1]);
  const outMap = {};
  for (const e of boundary) (outMap[vk(e[0])] = outMap[vk(e[0])] || []).push(e);
  const used = new Set();
  const loops = [];
  for (const e0 of boundary) {
    if (used.has(key2(e0[0], e0[1]))) continue;
    const loop = [];
    let cur = e0;
    for (let guard = 0; guard <= boundary.length + 4; guard++) {
      loop.push(cur[0]);
      used.add(key2(cur[0], cur[1]));
      const outs = (outMap[vk(cur[1])] || []).filter(x => !used.has(key2(x[0], x[1])));
      if (!outs.length) break;
      const nxt = outs[0];
      if (vk(nxt[1]) === vk(loop[0])) { loop.push(nxt[0]); used.add(key2(nxt[0], nxt[1])); break; }
      cur = nxt;
    }
    if (loop.length >= 3) loops.push(loop);
  }
  const simp = loops.map(loop => {
    const out = [];
    for (let i = 0; i < loop.length; i++) {
      const a = loop[(i - 1 + loop.length) % loop.length], b = loop[i], c = loop[(i + 1) % loop.length];
      const cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
      if (Math.abs(cr) > 1e-7) out.push(b);
    }
    return out.length >= 3 ? out : loop;
  });
  return { loops: simp, internal };
}

module.exports = {
  BASE, ORDER, AREA, TRI,
  makeGrid, triIndex, triCenter, trisOfPoly, maskOf, placementsOf, exactCover,
  ringsOf, shoelace, ccw, orient, inPoly, splitRaw
};
