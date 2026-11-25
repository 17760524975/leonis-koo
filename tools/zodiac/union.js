/* 精确并集轮廓：半边配对消隐
 * ---------------------------------------------------------------
 * 采样法（在边中点两侧取点判内外）在「板与板严格贴边」时会不稳：采样距离太大会
 * 跨过真实缝隙、太小又跨不到邻板，导致边界段被误判成内部共用边，并集塌成几个点。
 *
 * 这里换成组合做法，不做任何采样：
 *   1) 所有板件按逆时针定向（内部在左边）
 *   2) 每条边在「其它板的顶点」处打断（T 形接头）
 *   3) 端点按 tol 网格聚类成节点
 *   4) 同一对节点上若同时存在 a→b 与 b→a，说明是内部共用边 → 两条都消掉
 *   5) 剩下的边串成环 → 外轮廓 + 内孔
 * 七巧板铺砌的边要么完全重合、要么完全分离，所以这个判定是精确的。
 */
const G = require('../../js/geom.js');

const area2 = p => {
  let s = 0;
  for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; }
  return Math.abs(s) / 2;
};
const signed = p => {
  let s = 0;
  for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; }
  return s / 2;
};
const ccw = p => signed(p) < 0 ? p.slice().reverse() : p;

function unionPolys(polys, tolIn) {
  const tol = tolIn == null ? 0.6 : tolIn;
  const PS = polys.map(ccw);

  /* 顶点聚类 */
  const cell = tol * 2;
  const grid = new Map();
  const nodes = [];
  const nodeOf = pt => {
    const gx = Math.floor(pt[0] / cell), gy = Math.floor(pt[1] / cell);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      const arr = grid.get((gx + dx) + ',' + (gy + dy));
      if (!arr) continue;
      for (const ni of arr) if (Math.hypot(nodes[ni][0] - pt[0], nodes[ni][1] - pt[1]) <= tol) return ni;
    }
    const id = nodes.length;
    nodes.push([pt[0], pt[1]]);
    const k = gx + ',' + gy;
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(id);
    return id;
  };

  /* 所有顶点（供打断用） */
  const allV = [];
  PS.forEach(p => p.forEach(v => allV.push(v)));

  /* 打断后的有向边 */
  const edges = [];
  PS.forEach(p => {
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const L = Math.hypot(dx, dy);
      if (L < 1e-6) continue;
      const ts = [0, 1];
      for (const v of allV) {
        const t = ((v[0] - a[0]) * dx + (v[1] - a[1]) * dy) / (L * L);
        if (t <= 1e-6 || t >= 1 - 1e-6) continue;
        const qx = a[0] + dx * t, qy = a[1] + dy * t;
        if (Math.hypot(v[0] - qx, v[1] - qy) > tol) continue;
        ts.push(t);
      }
      ts.sort((x, y) => x - y);
      for (let k = 0; k + 1 < ts.length; k++) {
        if (ts[k + 1] - ts[k] < 1e-9) continue;
        const p0 = [a[0] + dx * ts[k], a[1] + dy * ts[k]];
        const p1 = [a[0] + dx * ts[k + 1], a[1] + dy * ts[k + 1]];
        if (Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) < tol * 0.8) continue;
        edges.push([nodeOf(p0), nodeOf(p1)]);
      }
    }
  });

  /* 同节点对反消 */
  const map = new Map();
  for (const [a, b] of edges) {
    if (a === b) continue;
    const lo = Math.min(a, b), hi = Math.max(a, b);
    const k = lo + '_' + hi;
    let rec = map.get(k);
    if (!rec) { rec = { lo, hi, dir: 0 }; map.set(k, rec); }
    rec.dir += (a === lo ? 1 : -1);
  }
  const kept = [];
  for (const rec of map.values()) {
    if (rec.dir === 0) continue;                    // 内部共用边，消掉
    /* |dir|>1 说明有重叠边（板件压叠），按方向保留一条 */
    kept.push(rec.dir > 0 ? [rec.lo, rec.hi] : [rec.hi, rec.lo]);
  }

  /* 串环 */
  const out = {};
  kept.forEach(([a, b], i) => { (out[a] = out[a] || []).push({ i, to: b }); });
  const used = new Array(kept.length).fill(false);
  const loops = [];
  for (let s = 0; s < kept.length; s++) {
    if (used[s]) continue;
    const start = kept[s][0];
    const loop = [];
    let cur = kept[s][0], ei = s, guard = 0;
    while (guard++ < kept.length + 2) {
      used[ei] = true;
      const [a, b] = kept[ei];
      loop.push(nodes[cur]);
      const nxt = (a === cur) ? b : a;
      if (nxt === start) break;
      const cands = (out[nxt] || []).filter(o => !used[o.i]);
      if (!cands.length) break;
      /* 取「最右转」保持贴同一侧前进 */
      const d0 = [nodes[nxt][0] - nodes[cur][0], nodes[nxt][1] - nodes[cur][1]];
      let best = cands[0], bestT = Infinity;
      for (const c of cands) {
        const d1 = [nodes[c.to][0] - nodes[nxt][0], nodes[c.to][1] - nodes[nxt][1]];
        const cr = d0[0] * d1[1] - d0[1] * d1[0];
        const dt = d0[0] * d1[0] + d0[1] * d1[1];
        const turn = Math.atan2(cr, dt);
        if (turn < bestT) { bestT = turn; best = c; }
      }
      cur = nxt; ei = best.i;
    }
    if (loop.length >= 3) loops.push(loop);
  }

  /* 去共线点 */
  const simp = loops.map(loop => {
    const o = [];
    for (let i = 0; i < loop.length; i++) {
      const a = loop[(i - 1 + loop.length) % loop.length];
      const b = loop[i], c = loop[(i + 1) % loop.length];
      const cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
      const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const l2 = Math.hypot(c[0] - b[0], c[1] - b[1]) || 1;
      if (Math.abs(cr) / (l1 * l2) > 1e-6) o.push(b);
    }
    return o.length >= 3 ? o : loop;
  });
  simp.sort((a, b) => area2(b) - area2(a));
  return simp;
}

function splitLoops(loops, polys) {
  const outer = loops[0];
  const oa = area2(outer);
  const holes = loops.slice(1).filter(h => {
    if (area2(h) < oa * 0.004) return false;       // 退化小环（只是顶点相碰处的碎屑）
    let deep = 0;
    for (const v of h) if (G.pointInPoly(v, outer)) deep++;
    return deep >= h.length / 2;
  });
  const sumA = polys.reduce((a, p) => a + area2(p), 0);
  const outA = area2(outer) - holes.reduce((a, h) => a + area2(h), 0);
  return { outer, holes, sumA, outA, err: (sumA - outA) / sumA };
}

module.exports = { unionPolys, splitLoops, area2 };

/* ---------- 栅格并集 → 外轮廓（最稳妥的一条路） ----------
 * 板件精确铺砌时，解析法求并集会在「顶点相碰」处产生零宽尖刺，导致轮廓自交。
 * 这里改成栅格化：0.5 世界单位的格子填并集 → 膨胀 2 格（≈1 单位，保证严格包含）
 * → Moore 邻域描外边界 → Douglas-Peucker 简化。
 * 误差 ≤ 1.5 世界单位（板件尺度 100~400），对判定的 3.0 容差足够安全。
 */
function rasterOutline(polys, res, dilateCells, dpTol, closeCells) {
  res = res || 0.5;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of polys) for (const v of p) {
    if (v[0] < x0) x0 = v[0]; if (v[0] > x1) x1 = v[0];
    if (v[1] < y0) y0 = v[1]; if (v[1] > y1) y1 = v[1];
  }
  const pad = 4 * res + (dilateCells || 2) * res;
  x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
  const w = Math.ceil((x1 - x0) / res), h = Math.ceil((y1 - y0) / res);
  const g = new Uint8Array(w * h);

  for (const poly of polys) {
    const xs = poly.map(v => v[0]), ys = poly.map(v => v[1]);
    const bx0 = Math.max(0, Math.floor((Math.min(...xs) - x0) / res));
    const bx1 = Math.min(w - 1, Math.ceil((Math.max(...xs) - x0) / res));
    const by0 = Math.max(0, Math.floor((Math.min(...ys) - y0) / res));
    const by1 = Math.min(h - 1, Math.ceil((Math.max(...ys) - y0) / res));
    for (let gy = by0; gy <= by1; gy++) {
      const cy = y0 + (gy + 0.5) * res;
      for (let gx = bx0; gx <= bx1; gx++) {
        const cx = x0 + (gx + 0.5) * res;
        if (inPoly([cx, cy], poly)) g[gy * w + gx] = 1;
      }
    }
  }
  function inPoly(pt, poly) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if (((a[1] > pt[1]) !== (b[1] > pt[1])) && (pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0])) c = !c;
    }
    return c;
  }
  /* 膨胀 */
  const K = dilateCells == null ? 2 : dilateCells;
  if (K > 0) {
    const d = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!g[y * w + x]) continue;
      for (let dy = -K; dy <= K; dy++) for (let dx = -K; dx <= K; dx++) {
        if (dx * dx + dy * dy > K * K + 1) continue;
        const a = x + dx, b = y + dy;
        if (a >= 0 && a < w && b >= 0 && b < h) d[b * w + a] = 1;
      }
    }
    g.set(d);
  }
  /* 形态学闭运算（先膨胀 C 格再腐蚀 C 格）：把「板与板之间那条细缝」和
   * 「两条该共线的边错开半个像素」形成的细长凹口填掉，外轮廓尺寸不变。
   * 这一步只改剪影，不动板件 —— 板件尺寸是全关卡共用一套托盘的，动不得。 */
  const C = closeCells | 0;
  if (C > 0) {
    const mask = [];
    for (let dy = -C; dy <= C; dy++) for (let dx = -C; dx <= C; dx++) {
      if (dx * dx + dy * dy <= C * C + 1) mask.push([dx, dy]);
    }
    const dil = new Uint8Array(w * h), ero = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!g[y * w + x]) continue;
      for (const [dx, dy] of mask) {
        const a = x + dx, b = y + dy;
        if (a >= 0 && a < w && b >= 0 && b < h) dil[b * w + a] = 1;
      }
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let keep = 1;
      for (const [dx, dy] of mask) {
        const a = x + dx, b = y + dy;
        if (a < 0 || a >= w || b < 0 || b >= h || !dil[b * w + a]) { keep = 0; break; }
      }
      if (keep) ero[y * w + x] = 1;
    }
    g.set(ero);
  }

  /* 边界边串环：把「填充格 ↔ 空格」之间的格边按「内部在左」定向，再按
   * 「最大正转角」串成环。对角相接处会自然分成两个环，不会串到一起。 */
  const key = (i, j) => i * (h + 2) + j;
  const out = new Map();                       // 起点 key → [终点 i, 终点 j, ...]
  const addE = (ax, ay, bx, by) => {
    const k = key(ax, ay);
    if (!out.has(k)) out.set(k, []);
    out.get(k).push([bx, by]);
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!g[y * w + x]) continue;
    const up = y > 0 && g[(y - 1) * w + x];
    const dn = y < h - 1 && g[(y + 1) * w + x];
    const lf = x > 0 && g[y * w + x - 1];
    const rt = x < w - 1 && g[y * w + x + 1];
    if (!up) addE(x, y, x + 1, y);
    if (!rt) addE(x + 1, y, x + 1, y + 1);
    if (!dn) addE(x + 1, y + 1, x, y + 1);
    if (!lf) addE(x, y + 1, x, y);
  }
  const loops = [];
  const guardMax = w * h * 4;
  const used = new Set();                      // 'ax,ay,bx,by'
  for (const [k, ends] of out) {
    for (const e of ends) {
      const ax = Math.floor(k / (h + 2)), ay = k % (h + 2);
      const ek = ax + ',' + ay + ',' + e[0] + ',' + e[1];
      if (used.has(ek)) continue;
      /* 沿环走 */
      const ring = [];
      let cx = ax, cy = ay, nx = e[0], ny = e[1];
      used.add(ek);
      ring.push([cx, cy]);
      let steps = 0;
      while (steps++ < guardMax) {
        const din = [nx - cx, ny - cy];
        cx = nx; cy = ny;
        ring.push([cx, cy]);
        if (cx === ax && cy === ay) break;
        const cands = out.get(key(cx, cy));
        if (!cands || !cands.length) break;
        let best = null, bestTurn = -Infinity;
        for (const c of cands) {
          const ck = cx + ',' + cy + ',' + c[0] + ',' + c[1];
          if (used.has(ck)) continue;
          const dout = [c[0] - cx, c[1] - cy];
          const turn = din[0] * dout[1] - din[1] * dout[0];   // 叉积 >0 = 左转
          const score = turn;                                  // 取最左转，内侧始终在左
          if (score > bestTurn) { bestTurn = score; best = { c, ck }; }
        }
        if (!best) break;
        used.add(best.ck);
        nx = best.c[0]; ny = best.c[1];
      }
      if (ring.length > 2) loops.push(ring);
    }
  }
  if (!loops.length) return [];
  /* 只取外轮廓（面积最大的那个环） */
  const pxLoop = loops.map(r => r.map(([x, y]) => [x0 + x * res, y0 + y * res]));
  let loop = pxLoop[0], bestA = -1;
  for (const l of pxLoop) { const a = area2(l); if (a > bestA) { bestA = a; loop = l; } }
  /* 去掉闭合重复点 */
  const dedup = [];
  for (const v of loop) {
    const last = dedup[dedup.length - 1];
    if (!last || Math.hypot(v[0] - last[0], v[1] - last[1]) > 1e-9) dedup.push(v);
  }
  if (dedup.length > 1) {
    const f = dedup[0], l = dedup[dedup.length - 1];
    if (Math.hypot(f[0] - l[0], f[1] - l[1]) < 1e-9) dedup.pop();
  }
  loop = dedup;

  /* Douglas-Peucker */
  const dp = (arr, tol) => {
    if (arr.length < 3) return arr;
    const a = arr[0], b = arr[arr.length - 1];
    let mi = 0, md = -1;
    const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
    for (let i = 1; i < arr.length - 1; i++) {
      let t = L2 > 0 ? ((arr[i][0] - a[0]) * dx + (arr[i][1] - a[1]) * dy) / L2 : 0;
      t = Math.max(0, Math.min(1, t));
      const d = Math.hypot(arr[i][0] - (a[0] + dx * t), arr[i][1] - (a[1] + dy * t));
      if (d > md) { md = d; mi = i; }
    }
    if (md <= tol) return [a, b];
    const l = dp(arr.slice(0, mi + 1), tol), r = dp(arr.slice(mi), tol);
    return l.slice(0, -1).concat(r);
  };
  /* 闭合处理：从最远点切成两段再简化 */
  let far = 0, fd = -1;
  for (let i = 0; i < loop.length; i++) {
    const d = Math.hypot(loop[i][0] - loop[0][0], loop[i][1] - loop[0][1]);
    if (d > fd) { fd = d; far = i; }
  }
  const A = loop.slice(0, far + 1), B = loop.slice(far).concat([loop[0]]);
  const s1 = dp(A, dpTol == null ? 1.2 : dpTol), s2 = dp(B, dpTol == null ? 1.2 : dpTol);
  loop = s1.slice(0, -1).concat(s2.slice(0, -1));
  return loop;
}

module.exports.rasterOutline = rasterOutline;

/* 栅格并集面积：解析并集在「单点相碰（捏合）」处会得到自交环，
 * shoelace 会把重叠部分相减 → 面积失真。栅格统计不受影响，用它判定覆盖率。 */
function rasterArea(polys, res) {
  res = res || 0.5;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of polys) for (const v of p) {
    if (v[0] < x0) x0 = v[0]; if (v[0] > x1) x1 = v[0];
    if (v[1] < y0) y0 = v[1]; if (v[1] > y1) y1 = v[1];
  }
  x0 -= 2; y0 -= 2; x1 += 2; y1 += 2;
  const w = Math.ceil((x1 - x0) / res), h = Math.ceil((y1 - y0) / res);
  const g = new Uint8Array(w * h);
  const inPoly = (pt, poly) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if (((a[1] > pt[1]) !== (b[1] > pt[1])) && (pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0])) c = !c;
    }
    return c;
  };
  for (const poly of polys) {
    const xs = poly.map(v => v[0]), ys = poly.map(v => v[1]);
    const bx0 = Math.max(0, Math.floor((Math.min(...xs) - x0) / res));
    const bx1 = Math.min(w - 1, Math.ceil((Math.max(...xs) - x0) / res));
    const by0 = Math.max(0, Math.floor((Math.min(...ys) - y0) / res));
    const by1 = Math.min(h - 1, Math.ceil((Math.max(...ys) - y0) / res));
    for (let gy = by0; gy <= by1; gy++) {
      const cy = y0 + (gy + 0.5) * res;
      for (let gx = bx0; gx <= bx1; gx++) {
        if (inPoly([x0 + (gx + 0.5) * res, cy], poly)) g[gy * w + gx] = 1;
      }
    }
  }
  let n = 0;
  for (let i = 0; i < g.length; i++) n += g[i];
  return n * res * res;
}
module.exports.rasterArea = rasterArea;
