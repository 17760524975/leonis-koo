/* 四巧板「给定剪影 → 求 4 块摆法」求解器（精确覆盖版）
 *
 * 用法：node tools/figs4/solve.js [f1|f2|...|all]
 *   读  tools/figs4/out/poly.json（extract.py 提取的剪影，u 单位）
 *   写  tools/figs4/out/solved.json（每图案：4 块摆法 + outline）
 *
 * ── 关键性质 ───────────────────────────────────────────────
 * 四巧板四块的顶点坐标（u）都是 0.5 的整数倍；90° 旋转/镜像后仍然如此。
 * 而 45° 旋转会把顶点带到 1/√2 的格点上，与 0.5 格点不相容 ——
 * 所以「剪影顶点全在 0.5 格点上」的图案，其拼法只可能用到 0°/90°/180°/270°。
 * 这条性质把搜索空间压到可穷举：×2 变整数后，位置也是整数平移。
 *
 * ── 流程 ──────────────────────────────────────────────────
 *  1. 剪影：去重/去共线 → 估整体倾斜 → 每边吸附到 45° 倍数 → 重建顶点；
 *  2. 格点吸附：每边取最近的两三个 0.5 格点值，DFS 求「闭合 且 面积恰为 6」的组合；
 *     多组解都留着，按改动量排序（照片有透视畸变，个别边会落在两个格点值正中）；
 *  3. 对每组候选做精确覆盖：枚举每块的所有 90° 朝向 × 平移（要求整块落在剪影内），
 *     再 DFS 取「四块不重叠且铺满」，得出并列的拼法；
 *  4. outline = 四块并集（= 吸附后的剪影），solution 反解出 id/angle/flipped。
 */
const fs = require('fs');
const path = require('path');
const E = require('../enumerate.js');

const {
  DEFS, area, centroidOf, inPoly, distPtPolyEdge, hasOverlap,
  unionOutline, simplify, bbox,
} = E;

const HERE = __dirname;
const OUT = path.join(HERE, 'out');
const IDS = ['A', 'B', 'C', 'D'];
const TOTAL = IDS.reduce((s, id) => s + area(DEFS[id]), 0);   // 6.0
const TARGET_AREA = 6.0;
const MODE = process.argv[2] || 'all';

/* ---------------- 基础 ---------------- */
const norm = v => { const L = Math.hypot(v[0], v[1]) || 1; return [v[0] / L, v[1] / L]; };
function rotPt(p, a) { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; }
const shoelace = p => { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };

/* 顶点去重 + 去共线 */
function cleanPoly(p, dupTol = 0.02, colTol = 0.03) {
  const out = [];
  for (const v of p) {
    if (!out.length || Math.hypot(v[0] - out[out.length - 1][0], v[1] - out[out.length - 1][1]) > dupTol) out.push(v);
  }
  if (out.length > 2 && Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) <= dupTol) out.pop();
  let q = out, changed = true;
  while (changed && q.length > 3) {
    changed = false;
    const n = q.length;
    for (let i = 0; i < n; i++) {
      const a = q[(i - 1 + n) % n], b = q[i], c = q[(i + 1) % n];
      const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      const L = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
      if (Math.abs(cross) / L < colTol) { q.splice(i, 1); changed = true; break; }
    }
  }
  return q;
}

/* 估整体倾斜（度）：各边方向相对 45° 倍数的加权均值 */
function estimateSkew(p) {
  const ws = [], vs = [];
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L < 0.12) continue;
    let d = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI) % 45;
    if (d > 22.5) d -= 45;
    if (d < -22.5) d += 45;
    ws.push(L); vs.push(d);
  }
  const sw = ws.reduce((s, v) => s + v, 0) || 1;
  return ws.reduce((s, w, i) => s + w * vs[i], 0) / sw;
}

/* 重建：每边保持中点、方向吸附 45° 倍数，相邻边求交得顶点 */
function rectify(p) {
  const n = p.length, lines = [];
  for (let i = 0; i < n; i++) {
    const a = p[i], b = p[(i + 1) % n];
    let d = Math.atan2(b[1] - a[1], b[0] - a[0]);
    d = Math.round(d / (Math.PI / 4)) * (Math.PI / 4);
    lines.push({ m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], d });
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    const L1 = lines[(i - 1 + n) % n], L2 = lines[i];
    const d1 = [Math.cos(L1.d), Math.sin(L1.d)], d2 = [Math.cos(L2.d), Math.sin(L2.d)];
    const den = d1[0] * d2[1] - d1[1] * d2[0];
    if (Math.abs(den) < 1e-9) { out.push([p[i][0], p[i][1]]); continue; }
    const ex = L2.m[0] - L1.m[0], ey = L2.m[1] - L1.m[1];
    const t = (ex * d2[1] - ey * d2[0]) / den;
    out.push([L1.m[0] + d1[0] * t, L1.m[1] + d1[1] * t]);
  }
  return out;
}

function rectifyFull(p) {
  const skew = estimateSkew(p);
  const rad = skew * Math.PI / 180;
  const rp = p.map(v => rotPt(v, -rad));
  const q = rectify(rp);
  return { poly: q.map(v => rotPt(v, rad)), skew };
}

function normalizeArea(p) {
  const a = Math.abs(shoelace(p));
  const s = Math.sqrt(TARGET_AREA / a);
  const bb = bbox(p);
  const cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2;
  return p.map(v => [(v[0] - cx) * s + cx, (v[1] - cy) * s + cy]);
}

/* ---------------- 格点吸附（约束搜索，返回多组候选） ---------------- */
function snapCandidates(p, unit = 0.5, maxOut = 400) {
  const n = p.length;
  const hs = 1 / unit;
  const edges = [];
  for (let i = 0; i < n; i++) {
    const a = p[i], b = p[(i + 1) % n];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const k = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
    const diag = (Math.abs(k) % 2 === 1);
    const cands = [];
    if (diag) {
      const m = (Math.abs(dx) + Math.abs(dy)) / 2 * hs;
      const base = Math.round(m);
      for (let d = -3; d <= 3; d++) {
        const c = base + d;
        if (c <= 0) continue;
        cands.push([Math.sign(dx || 1) * c, Math.sign(dy || 1) * c, Math.abs(c - m)]);
      }
    } else {
      const ex = dx * hs, ey = dy * hs;
      const horiz = (Math.abs(k) % 4 === 0);
      const bx = Math.round(ex), by = Math.round(ey);
      const rg = v => { const a2 = []; for (let d = -3; d <= 3; d++) a2.push(v + d); return a2; };
      const XS = horiz ? rg(bx) : [0];
      const YS = horiz ? [0] : rg(by);
      for (const cx of XS) for (const cy of YS) {
        const e = Math.abs(cx - ex) + Math.abs(cy - ey);
        cands.push([cx, cy, e]);
      }
    }
    if (!cands.length) return { ok: false, reason: `第 ${i} 边没有候选` };
    cands.sort((u, v) => u[2] - v[2]);
    edges.push(cands);
  }

  const WANT = Math.round(TARGET_AREA * 8);       // |Σ| = 面积/0.125
  const sols = [];
  const cur = [];
  let nodes = 0;
  const MAXN = 900000;
  const maxStep = edges.map(e => Math.max(...e.map(c => Math.abs(c[0]) + Math.abs(c[1]))));

  function dfs(i, X, Y, S, cost) {
    if (nodes++ > MAXN) return;
    if (i === n) {
      if (X === 0 && Y === 0 && Math.abs(S) === WANT) sols.push({ cost, deltas: cur.slice() });
      return;
    }
    const rest = maxStep.slice(i).reduce((s, v) => s + v, 0);
    if (Math.abs(X) > rest || Math.abs(Y) > rest) return;
    for (const [dx, dy, e] of edges[i]) {
      if (cost + e > 9.5) continue;
      cur.push([dx, dy]);
      dfs(i + 1, X + dx, Y + dy, S + X * dy - dx * Y, cost + e);
      cur.pop();
    }
  }
  dfs(0, 0, 0, 0, 0);
  if (!sols.length) return { ok: false, reason: '无满足「闭合 + 面积=6」的格点组合' };
  sols.sort((a, b) => a.cost - b.cost);

  const out = [];
  const seen = new Set();
  for (const s of sols) {
    const pts = [[0, 0]];
    for (const d of s.deltas) {
      const last = pts[pts.length - 1];
      pts.push([last[0] + d[0] * unit, last[1] + d[1] * unit]);
    }
    pts.pop();
    const dx0 = p[0][0] - pts[0][0], dy0 = p[0][1] - pts[0][1];
    let poly = cleanPoly(pts.map(v => [Math.round((v[0] + dx0) * 2) / 2, Math.round((v[1] + dy0) * 2) / 2]), 0.02, 0.05);
    if (Math.abs(area(poly)) < 1) continue;
    if (shoelace(poly) < 0) poly = poly.slice().reverse();
    if (!isSimple(poly)) continue;
    const key = poly.map(v => `${Math.round(v[0] * 2)},${Math.round(v[1] * 2)}`).sort().join(';');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ poly, cost: s.cost });
    if (out.length >= maxOut) break;
  }
  return out.length ? { ok: true, cands: out } : { ok: false, reason: '候选都不简单（自交）' };
}

/* 多边形是否简单（无自交、无零面积） */
function isSimple(poly) {
  const n = poly.length;
  if (n < 3) return false;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const segInt = (a, b, c, d) => {
    const d1 = cross(c, d, a), d2 = cross(c, d, b), d3 = cross(a, b, c), d4 = cross(a, b, d);
    return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
  };
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (i === j) continue;
      if ((j + 1) % n === i || (i + 1) % n === j) continue;
      if (segInt(poly[i], poly[(i + 1) % n], poly[j], poly[(j + 1) % n])) return false;
    }
  }
  return true;
}

/* ---------------- 精确覆盖 ---------------- */
/* 板件在 90° 步进下的全部朝向（×2 变整数，去重） */
function pieceVariants() {
  const out = {};
  for (const id of IDS) {
    const list = [];
    const seen = new Set();
    for (let k = 0; k < 4; k++) {
      for (const flip of [false, true]) {
        let poly = DEFS[id].map(v => {
          let x = flip ? -v[0] : v[0], y = v[1];
          if (flip) { /* 镜像后再转 */ }
          return [x, y];
        });
        const a = k * Math.PI / 2;
        poly = poly.map(v => rotPt(v, a));
        // 平移到 bbox 原点，×2 取整
        const bb = bbox(poly);
        const q = poly.map(v => [Math.round((v[0] - bb[0]) * 2), Math.round((v[1] - bb[1]) * 2)]);
        if (shoelace(q) < 0) q.reverse();
        const key = q.map(v => v[0] + ',' + v[1]).sort().join(';');
        if (seen.has(key)) continue;
        seen.add(key);
        list.push({ id, angle: k * 90, flip, poly: q, w: Math.round((bb[2] - bb[0]) * 2), h: Math.round((bb[3] - bb[1]) * 2) });
      }
    }
    out[id] = list;
  }
  return out;
}

/* 整数坐标下：piece 是否完全落在 target 内（顶点在内 + 无边正穿越） */
function insideExact(piece, target) {
  for (const v of piece) {
    const p = [v[0] / 2, v[1] / 2];
    if (!inPoly(p, target) && distPtPolyEdge(p, target) > 1e-7) return false;
  }
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  for (let i = 0; i < piece.length; i++) {
    const a = [piece[i][0] / 2, piece[i][1] / 2], b = [piece[(i + 1) % piece.length][0] / 2, piece[(i + 1) % piece.length][1] / 2];
    for (let j = 0; j < target.length; j++) {
      const c = target[j], d = target[(j + 1) % target.length];
      const d1 = cr(c, d, a), d2 = cr(c, d, b), d3 = cr(a, b, c), d4 = cr(a, b, d);
      const eps = 1e-9;
      if (((d1 > eps && d2 < -eps) || (d1 < -eps && d2 > eps)) &&
          ((d3 > eps && d4 < -eps) || (d3 < -eps && d4 > eps))) return false;
    }
  }
  return true;
}

/* 剪影栅格点（0.5 半格的 6×6 内部采样），用于覆盖剪枝 */
function samplePoints(target) {
  const bb = bbox(target);
  const x0 = Math.floor(bb[0] * 2), x1 = Math.ceil(bb[2] * 2);
  const y0 = Math.floor(bb[1] * 2), y1 = Math.ceil(bb[3] * 2);
  const pts = [];
  const N = 6, EPS = 0.0131;      // 略微错开，避免正好落在 45° 边上
  for (let gy = y0; gy < y1; gy++) {
    for (let gx = x0; gx < x1; gx++) {
      for (let sy = 0; sy < N; sy++) {
        for (let sx = 0; sx < N; sx++) {
          const x = (gx + (sx + 0.5) / N) / 2;
          const y = (gy + (sy + 0.5 + EPS) / N) / 2;
          if (inPoly([x, y], target)) pts.push([x, y]);
        }
      }
    }
  }
  return pts;
}

/* ---------------- 精确覆盖 / 最大覆盖 ---------------- */
function exactTile(targetIn, opts = {}) {
  const padHalf = opts.padHalf || 0;              // 允许板件越出剪影的半格数
  const needFull = opts.needFull !== false;       // true=要求铺满；false=取覆盖最高
  const maxPerPiece = opts.maxPerPiece || 260;
  const target = targetIn.map(v => [Math.round(v[0] * 2) / 2, Math.round(v[1] * 2) / 2]);
  const pts = samplePoints(target);
  if (!pts.length) return null;
  const NW = Math.ceil(pts.length / 32);
  const cell = (bbox(target)[2] - bbox(target)[0]) * (bbox(target)[3] - bbox(target)[1]) / pts.length; // 近似每点面积
  const variants = pieceVariants();
  const maskOf = poly => {
    const m = new Uint32Array(NW);
    for (let i = 0; i < pts.length; i++) if (inPoly(pts[i], poly)) m[i >> 5] |= (1 << (i & 31));
    return m;
  };
  const popcnt = m => { let c = 0; for (let w = 0; w < NW; w++) { let x = m[w]; while (x) { c++; x &= x - 1; } } return c; };

  const bp = bbox(target);
  const TX0 = Math.floor(bp[0] * 2) - padHalf, TX1 = Math.ceil(bp[2] * 2) + padHalf;
  const TY0 = Math.floor(bp[1] * 2) - padHalf, TY1 = Math.ceil(bp[3] * 2) + padHalf;
  const places = {};
  for (const id of IDS) {
    let list = [];
    for (const v of variants[id]) {
      for (let tx = TX0; tx <= TX1 - v.w; tx++) {
        for (let ty = TY0; ty <= TY1 - v.h; ty++) {
          const piece = v.poly.map(q => [q[0] + tx, q[1] + ty]);
          if (!insideExact(piece, target)) {
            if (padHalf === 0) continue;
            // 松弛：允许越界，但要求大部分在剪影内
            const poly0 = piece.map(q => [q[0] / 2, q[1] / 2]);
            const m0 = maskOf(poly0);
            if (popcnt(m0) < 0.55 * pts.length * area(poly0) / TARGET_AREA) continue;
            list.push({ id, angle: v.angle, flip: v.flip, poly: poly0, mask: m0, n: popcnt(m0) });
            continue;
          }
          const poly = piece.map(q => [q[0] / 2, q[1] / 2]);
          const m = maskOf(poly);
          list.push({ id, angle: v.angle, flip: v.flip, poly, mask: m, n: popcnt(m) });
        }
      }
    }
    // 每个板只留覆盖点数最多的若干放置（松弛模式下会很多）
    if (list.length > maxPerPiece) {
      list.sort((a, b) => b.n - a.n);
      list = list.slice(0, maxPerPiece);
    }
    places[id] = list;
    if (!list.length) return null;
  }

  const cover = Array.from({ length: pts.length }, () => []);
  for (const id of IDS) {
    places[id].forEach((pl, idx) => {
      for (let w = 0; w < NW; w++) {
        let m = pl.mask[w];
        while (m) {
          const b = 31 - Math.clz32(m & -m);
          const p = (w << 5) + b;
          if (p < pts.length) cover[p].push({ id, idx });
          m &= m - 1;
        }
      }
    });
  }

  const covered = new Uint32Array(NW);
  const used = {};
  const chosen = [];
  let found = null, bestCnt = -1, bestSet = null;
  let nodes = 0;
  const total = pts.length;
  const cnt = () => { let c = 0; for (let w = 0; w < NW; w++) { let m = covered[w]; while (m) { c++; m &= m - 1; } } return c; };

  function dfs(depth) {
    if (nodes++ > (opts.nodeCap || 400000)) return;
    if (depth === 4) {
      const c = cnt();
      if (c > bestCnt) { bestCnt = c; bestSet = chosen.slice(); }
      if (c >= total * (opts.fullFrac || 0.985)) { found = chosen.slice(); }
      return;
    }
    if (found) return;
    if (!needFull) {
      // 上界：当前覆盖 + 剩余板的总面积（按点数折算）
      let rem = 0;
      for (const id of IDS) if (!used[id]) rem += area(DEFS[id]) / cell;
      if (cnt() + rem <= bestCnt + 1e-6) return;
    }
    let p = -1;
    for (let w = 0; w < NW && p < 0; w++) {
      const free = ~covered[w];
      if (free) { const b = 31 - Math.clz32(free & -free); const q = (w << 5) + b; if (q < total) p = q; }
    }
    if (p < 0) {
      if (depth < 4) { const c = cnt(); if (c > bestCnt) { bestCnt = c; bestSet = chosen.slice(); } }
      else { const c = cnt(); if (c > bestCnt) { bestCnt = c; bestSet = chosen.slice(); } if (c >= total * (opts.fullFrac || 0.985)) found = chosen.slice(); }
      return;
    }
    for (const c of cover[p]) {
      if (used[c.id]) continue;
      const pl = places[c.id][c.idx];
      let ok = true;
      for (let w = 0; w < NW; w++) if (covered[w] & pl.mask[w]) { ok = false; break; }
      if (!ok) continue;
      if (chosen.some(x => hasOverlap(pl.poly, x.poly))) continue;
      used[c.id] = true;
      for (let w = 0; w < NW; w++) covered[w] |= pl.mask[w];
      chosen.push(pl);
      dfs(depth + 1);
      chosen.pop();
      for (let w = 0; w < NW; w++) covered[w] &= ~pl.mask[w];
      used[c.id] = false;
      if (found) return;
    }
  }
  dfs(0);
  const res = found || bestSet;
  return res ? { pieces: res, pts: total, covered: bestCnt } : null;
}

/* ---------------- 反解 id/angle/flip ---------------- */
function solveState(id, poly, flipHint) {
  const c = centroidOf(poly);
  const c0 = centroidOf(DEFS[id]);
  const loc = DEFS[id].map(v => [v[0] - c0[0], v[1] - c0[1]]);
  let best = null;
  for (let k = 0; k < 4; k++) {
    for (const flip of [false, true]) {
      const a = k * Math.PI / 2;
      let err = 0;
      const got = loc.map(p => {
        const x = flip ? -p[0] : p[0], y = p[1];
        return [x * Math.cos(a) - y * Math.sin(a) + c[0], x * Math.sin(a) + y * Math.cos(a) + c[1]];
      });
      for (const g of got) {
        let m = Infinity;
        for (const w of poly) m = Math.min(m, Math.hypot(g[0] - w[0], g[1] - w[1]));
        err = Math.max(err, m);
      }
      if (!best || err < best.err) best = { angle: k * 90, flip, err, x: c[0], y: c[1] };
    }
  }
  return best;
}

/* ---------------- 主流程 ---------------- */
function main() {
  const raw = JSON.parse(fs.readFileSync(path.join(OUT, 'poly.json'), 'utf8'));
  const outJson = {};
  for (const tag of Object.keys(raw)) {
    if (MODE !== 'all' && tag !== MODE) continue;
    let p = cleanPoly(raw[tag].poly.map(v => [v[0], v[1]]), 0.03, 0.04);
    const rc = rectifyFull(p);
    const tgt0 = normalizeArea(rc.poly);
    console.log(`\n[${tag}] 提取顶点=${p.length} 倾斜=${rc.skew.toFixed(2)}°`);

    // 两版起点：直线拟合版 + 纯 DP 角点版（照片噪声下两者各有胜负）
    const sources = [{ name: '拟合', poly: tgt0 }];
    if (raw[tag].raw) {
      const p2 = cleanPoly(raw[tag].raw.map(v => [v[0], v[1]]), 0.03, 0.04);
      const rc2 = rectifyFull(p2);
      sources.push({ name: '角点', poly: normalizeArea(rc2.poly) });
    }
    let sn = { ok: false, reason: '' };
    const merged = [];
    for (const src of sources) {
      const s1 = snapCandidates(src.poly, 0.5, 400);
      if (!s1.ok) { console.log(`  ${src.name}：${s1.reason}`); continue; }
      console.log(`  ${src.name}：格点候选 ${s1.cands.length} 组，代价 ${s1.cands[0].cost.toFixed(2)} 起`);
      for (const c of s1.cands) merged.push(c);
    }
    if (!merged.length) { console.log('  !! 格点吸附失败'); continue; }
    merged.sort((a, b) => a.cost - b.cost);
    const seenPoly = new Set();
    sn = { ok: true, cands: [] };
    for (const c of merged) {
      const k = c.poly.map(v => `${Math.round(v[0] * 2)},${Math.round(v[1] * 2)}`).sort().join(';');
      if (seenPoly.has(k)) continue;
      seenPoly.add(k);
      sn.cands.push(c);
      if (sn.cands.length >= 500) break;
    }

    let done = null;
    const tried = [];
    for (const cand of sn.cands) {
      const t0 = Date.now();
      const res = exactTile(cand.poly, { padHalf: 0, needFull: true, nodeCap: 250000 });
      if (!res || res.covered < res.pts) { tried.push(cand.cost.toFixed(2)); continue; }
      const ua = res.pieces.reduce((s, x) => s + area(x.poly), 0);
      console.log(`   · 代价${cand.cost.toFixed(2)} 顶点${cand.poly.length} → 精确铺满（${Date.now() - t0}ms）面积 ${ua.toFixed(6)}`);
      done = { cand, res, exact: true };
      break;
    }
    if (!done) {
      // 退一步：允许板件略微越界，取覆盖最高的一组
      let bestR = null;
      for (const cand of sn.cands.slice(0, 8)) {
        const res = exactTile(cand.poly, { padHalf: 1, needFull: false, nodeCap: 200000, maxPerPiece: 200 });
        if (!res) { console.log(`     · 松弛 代价${cand.cost.toFixed(2)} 无放置`); continue; }
        const rate = res.covered / res.pts;
        console.log(`     · 松弛 代价${cand.cost.toFixed(2)} 覆盖率 ${(rate * 100).toFixed(2)}%`);
        if (!bestR || rate > bestR.rate) bestR = { cand, res, rate };
        if (rate >= 1) break;
      }
      if (bestR && bestR.rate > 0.93) {
        console.log(`   · 近似最佳：代价${bestR.cand.cost.toFixed(2)} 覆盖率 ${(bestR.rate * 100).toFixed(2)}%`);
        done = { cand: bestR.cand, res: bestR.res, exact: false };
      }
    }
    if (!done) {
      console.log(`  !! 试了 ${tried.length} 组格点候选都拼不出来（代价 ${tried.slice(0, 12).join(',')}…）`);
      continue;
    }

    const pieces = done.res.pieces;
    const union = unionOutline(pieces.map(x => x.poly));
    if (union.length !== 1) { console.log('  !! 并集不是单环'); continue; }
    const uo = simplify(union[0], 0.004);
    const ua = Math.abs(area(uo));
    console.log(`  并集顶点=${uo.length} 面积=${ua.toFixed(6)} 误差=${(Math.abs(ua - 6) / 6 * 100).toFixed(5)}%`);

    const sol = pieces.map(x => {
      const st = solveState(x.id, x.poly, x.flip);
      return { id: x.id, x: +st.x.toFixed(4), y: +st.y.toFixed(4), angle: st.angle, flipped: st.flip, err: st.err };
    });
    console.log('  反解：' + sol.map(s => `${s.id}@${s.angle}${s.flipped ? 'F' : ''}(err=${s.err.toExponential(1)})`).join(' '));

    outJson[tag] = {
      outline: uo.map(v => [+v[0].toFixed(5), +v[1].toFixed(5)]),
      solution: sol.map(({ id, x, y, angle, flipped }) => ({ id, x, y, angle, flipped })),
      snapCost: +done.cand.cost.toFixed(3),
      areaErr: +(Math.abs(ua - 6) / 6).toFixed(8),
      skew: +rc.skew.toFixed(3),
    };
  }
  fs.writeFileSync(path.join(OUT, 'solved.json'), JSON.stringify(outJson, null, 1));
  console.log('\n已写 out/solved.json');
}

if (require.main === module) main();
module.exports = { exactTile, fitTile, solveFine, solveVertex, variantsAll, pieceVariants, snapCandidates, rectifyFull, cleanPoly, normalizeArea, solveState, isSimple };

/* ---------------- 拟合式求解（贪心 + 局部搜索） ----------------
 * 不要求剪影本身可精确铺满，而是直接在 0.5 格点上摆 4 块，
 * 让「并集 ∩ 剪影 − 3×越界」最大，最后用并集作为关卡轮廓（必然可解）。
 */
function fitTile(targetIn, opts = {}) {
  const target = targetIn.map(v => [Math.round(v[0] * 2) / 2, Math.round(v[1] * 2) / 2]);
  const bb = bbox(target);
  const PAD = 1.0;
  const x0 = bb[0] - PAD, y0 = bb[1] - PAD, x1 = bb[2] + PAD, y1 = bb[3] + PAD;
  const N = 6;
  const all = [];
  const gx0 = Math.floor(x0 * 2), gx1 = Math.ceil(x1 * 2);
  const gy0 = Math.floor(y0 * 2), gy1 = Math.ceil(y1 * 2);
  for (let gy = gy0; gy < gy1; gy++) {
    for (let gx = gx0; gx < gx1; gx++) {
      for (let sy = 0; sy < N; sy++) for (let sx = 0; sx < N; sx++) {
        const x = (gx + (sx + 0.5) / N) / 2, y = (gy + (sy + 0.5 + 0.0131) / N) / 2;
        all.push({ p: [x, y], in: inPoly([x, y], target) });
      }
    }
  }
  const NW = Math.ceil(all.length / 32);
  const inMask = new Uint32Array(NW);
  for (let i = 0; i < all.length; i++) if (all[i].in) inMask[i >> 5] |= (1 << (i & 31));

  const variants = pieceVariants();
  const TX0 = gx0, TX1 = gx1, TY0 = gy0, TY1 = gy1;
  const cands = {};
  for (const id of IDS) {
    const list = [];
    for (const v of variants[id]) {
      for (let tx = TX0; tx <= TX1 - v.w; tx++) {
        for (let ty = TY0; ty <= TY1 - v.h; ty++) {
          const piece = v.poly.map(q => [q[0] + tx, q[1] + ty]);
          const poly = piece.map(q => [q[0] / 2, q[1] / 2]);
          const m = new Uint32Array(NW);
          let hin = 0, hout = 0;
          for (let i = 0; i < all.length; i++) {
            if (inPoly(all[i].p, poly)) {
              m[i >> 5] |= (1 << (i & 31));
              if (all[i].in) hin++; else hout++;
            }
          }
          if (hin < 4) continue;
          if (hout > 0.42 * all.length * 0.06) continue;      // 越界点过多直接丢
          list.push({ id, angle: v.angle, flip: v.flip, poly, m, hin, hout, score: hin - 3 * hout });
        }
      }
    }
    cands[id] = list;
    if (!list.length) return null;
  }

  const NWd = NW;
  const totalIn = all.filter(a => a.in).length;
  const inter = (a, b) => { let c = 0; for (let w = 0; w < NWd; w++) { let x = a[w] & b[w]; while (x) { c++; x &= x - 1; } } return c; };

  const evalSet = set => {
    const u = new Uint32Array(NWd);
    for (const s of set) for (let w = 0; w < NWd; w++) u[w] |= s.m[w];
    let hin = 0, hout = 0;
    for (let w = 0; w < NWd; w++) {
      hin += inter(u.subarray(w, w + 1), inMask.subarray(w, w + 1));
      let x = u[w] & ~inMask[w];
      while (x) { hout++; x &= x - 1; }
    }
    return { hin, hout, obj: hin - 3 * hout };
  };

  let best = null;
  const orders = [['A', 'D', 'C', 'B'], ['D', 'A', 'C', 'B'], ['B', 'C', 'A', 'D'], ['A', 'B', 'C', 'D'], ['D', 'C', 'A', 'B'], ['C', 'A', 'D', 'B']];
  for (const order of orders) {
    const chosen = [];
    const used = new Uint32Array(NWd);
    for (const id of order) {
      let bestPl = null, bestGain = -1e9;
      for (const pl of cands[id]) {
        let ov = 0;
        for (let w = 0; w < NWd; w++) if (used[w] & pl.m[w]) { ov = 1; break; }
        if (ov) {
          // 允许极小重叠？不允许（关卡要求零重叠）
          continue;
        }
        const gain = pl.score;
        if (gain > bestGain) { bestGain = gain; bestPl = pl; }
      }
      if (!bestPl) { best = null; break; }
      chosen.push(bestPl);
      for (let w = 0; w < NWd; w++) used[w] |= bestPl.m[w];
    }
    if (chosen.length !== 4) continue;
    // 局部搜索：逐块重摆，直到不再改善
    let cur = evalSet(chosen);
    for (let iter = 0; iter < 12; iter++) {
      let improved = false;
      for (let k = 0; k < 4; k++) {
        const id = chosen[k].id;
        const base = chosen.slice();
        for (const pl of cands[id]) {
          let ov = false;
          for (let j = 0; j < 4; j++) {
            if (j === k) continue;
            for (let w = 0; w < NWd; w++) if (chosen[j].m[w] & pl.m[w]) { ov = true; break; }
            if (ov) break;
          }
          if (ov) continue;
          base[k] = pl;
          const ev = evalSet(base);
          if (ev.obj > cur.obj) { chosen[k] = pl; cur = ev; improved = true; }
        }
        base[k] = chosen[k];
      }
      if (!improved) break;
    }
    // 精确不重叠检查
    let bad = false;
    for (let i = 0; i < 4 && !bad; i++) for (let j = i + 1; j < 4; j++) if (hasOverlap(chosen[i].poly, chosen[j].poly)) { bad = true; break; }
    if (bad) continue;
    const iou = cur.hin / (totalIn + cur.hout);
    if (!best || iou > best.iou) best = { pieces: chosen.slice(), iou, hin: cur.hin, hout: cur.hout, totalIn };
  }
  return best;
}

/* ---------------- 细网格覆盖（允许 45° 朝向） ----------------
 * 有些图案的板件必须斜着放（45°），此时剪影顶点落在 1/√2 格点上，0.5 格点吸附会失真。
 * 这里不再吸附：直接在「方向已校正」的剪影上，用 45° 步进的朝向 + 细网格平移，
 * 在容差 tol 内找 4 块互不重叠且铺满的摆法。
 */
function variantsAll() {
  const out = {};
  for (const id of IDS) {
    const c0 = centroidOf(DEFS[id]);
    const list = [];
    const seen = new Set();
    for (let k = 0; k < 8; k++) {
      for (const flip of [false, true]) {
        const a = k * Math.PI / 4;
        const poly = DEFS[id].map(v => {
          const x = flip ? -(v[0] - c0[0]) : (v[0] - c0[0]);
          const y = v[1] - c0[1];
          return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
        });
        if (shoelace(poly) < 0) poly.reverse();
        const key = poly.map(v => Math.round(v[0] * 1e4) + ',' + Math.round(v[1] * 1e4)).sort().join(';');
        if (seen.has(key)) continue;
        seen.add(key);
        list.push({ id, angle: k * 45, flip, poly });
      }
    }
    out[id] = list;
  }
  return out;
}

function insideTolPoly(piece, target, tol) {
  const eps = 1e-9;
  for (const v of piece) {
    if (!inPoly(v, target) && distPtPolyEdge(v, target) > tol) return false;
  }
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  for (let i = 0; i < piece.length; i++) {
    const a = piece[i], b = piece[(i + 1) % piece.length];
    for (let j = 0; j < target.length; j++) {
      const c = target[j], d = target[(j + 1) % target.length];
      const d1 = cr(c, d, a), d2 = cr(c, d, b), d3 = cr(a, b, c), d4 = cr(a, b, d);
      if (((d1 > eps && d2 < -eps) || (d1 < -eps && d2 > eps)) &&
          ((d3 > eps && d4 < -eps) || (d3 < -eps && d4 > eps))) return false;
    }
  }
  return true;
}

function solveFine(target, opts = {}) {
  const tol = opts.tol || 0.06;
  const grid = opts.grid || 0.25;
  const pts = samplePoints(target);
  const NW = Math.ceil(pts.length / 32);
  const V = variantsAll();
  const bp = bbox(target);
  const maskOf = poly => {
    const m = new Uint32Array(NW);
    let n = 0;
    for (let i = 0; i < pts.length; i++) if (inPoly(pts[i], poly)) { m[i >> 5] |= (1 << (i & 31)); n++; }
    return { m, n };
  };
  const places = {};
  for (const id of IDS) {
    const list = [];
    for (const v of V[id]) {
      const vb = bbox(v.poly);
      for (let tx = bp[0] - 0.5; tx <= bp[2] + 0.5 - (vb[2] - vb[0]); tx += grid) {
        for (let ty = bp[1] - 0.5; ty <= bp[3] + 0.5 - (vb[3] - vb[1]); ty += grid) {
          const piece = v.poly.map(q => [q[0] + tx, q[1] + ty]);
          if (!insideTolPoly(piece, target, tol)) continue;
          const { m, n } = maskOf(piece);
          if (n < 3) continue;
          list.push({ id, angle: v.angle, flip: v.flip, poly: piece, mask: m, n });
        }
      }
    }
    // 去重（同一朝向同一位置）
    const seen = new Set();
    places[id] = list.filter(pl => {
      const k = pl.angle + (pl.flip ? 'F' : '') + '|' + pl.poly.map(q => Math.round(q[0] * 20) + ',' + Math.round(q[1] * 20)).sort().join(';');
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    if (!places[id].length) return null;
  }
  const cover = Array.from({ length: pts.length }, () => []);
  for (const id of IDS) places[id].forEach((pl, idx) => {
    for (let w = 0; w < NW; w++) {
      let m = pl.mask[w];
      while (m) {
        const b = 31 - Math.clz32(m & -m);
        const p = (w << 5) + b;
        if (p < pts.length) cover[p].push({ id, idx });
        m &= m - 1;
      }
    }
  });
  const covered = new Uint32Array(NW);
  const used = {}; const chosen = [];
  let found = null, nodes = 0;
  const total = pts.length;
  const cnt = () => { let c = 0; for (let w = 0; w < NW; w++) { let m = covered[w]; while (m) { c++; m &= m - 1; } } return c; };
  function dfs(depth) {
    if (found || nodes++ > (opts.nodeCap || 300000)) return;
    if (depth === 4) { if (cnt() >= total * (opts.fullFrac || 0.99)) found = chosen.slice(); return; }
    let p = -1;
    for (let w = 0; w < NW && p < 0; w++) {
      const free = ~covered[w];
      if (free) { const b = 31 - Math.clz32(free & -free); const q = (w << 5) + b; if (q < total) p = q; }
    }
    if (p < 0) { if (depth < 4) return; found = chosen.slice(); return; }
    for (const c of cover[p]) {
      if (used[c.id]) continue;
      const pl = places[c.id][c.idx];
      let ok = true;
      for (let w = 0; w < NW; w++) if (covered[w] & pl.mask[w]) { ok = false; break; }
      if (!ok) continue;
      if (chosen.some(x => hasOverlap(pl.poly, x.poly))) continue;
      used[c.id] = true;
      for (let w = 0; w < NW; w++) covered[w] |= pl.mask[w];
      chosen.push(pl);
      dfs(depth + 1);
      chosen.pop();
      for (let w = 0; w < NW; w++) covered[w] &= ~pl.mask[w];
      used[c.id] = false;
      if (found) return;
    }
  }
  dfs(0);
  return found ? { pieces: found, places: IDS.reduce((s, id) => s + places[id].length, 0) } : null;
}

/* ---------------- 顶点锚定搜索（连续坐标，允许 45°） ----------------
 * 剪影的每个角点必定是某一块的顶点（凸角处不可能由两块拼出）。
 * 于是按「第一个还没被覆盖的剪影角点」做锚，穷举「哪一块、哪个朝向、哪个顶点」放到那里，
 * 再校验：整块落在剪影内（容差 tol）、与已放的四块不重叠。
 * 面积用栅格点估计来剪枝（剩余面积必须与「还能放几块」相符）。
 */
function solveVertex(targetIn, opts = {}) {
  const tol = opts.tol || 0.05;
  const target = targetIn;
  const pts = samplePoints(target);
  const NW = Math.ceil(pts.length / 32);
  const cell = Math.abs(area(target)) / pts.length;
  const V = variantsAll();
  const total = 6.0;

  // 剪影角点（按 y 再 x 排序，靠上的优先当锚）
  const verts = target.map((v, i) => ({ p: v, i })).sort((a, b) => (a.p[1] - b.p[1]) || (a.p[0] - b.p[0]));

  const covBits = new Uint32Array(NW);
  const countCov = () => { let c = 0; for (let w = 0; w < NW; w++) { let m = covBits[w]; while (m) { c++; m &= m - 1; } } return c; };

  let nodes = 0, found = null;
  const chosen = [];
  const placedPolys = [];

  function markPoly(poly, add) {
    for (let i = 0; i < pts.length; i++) {
      if (inPoly(pts[i], poly)) {
        if (add) covBits[i >> 5] |= (1 << (i & 31));
      }
    }
  }

  function rec(remaining, accArea) {
    if (found || nodes++ > (opts.nodeCap || 200000)) return;
    if (remaining.length === 0) {
      if (Math.abs(accArea - total) < 1e-6) found = chosen.slice();
      return;
    }
    // 选第一个未覆盖的剪影角点
    let anchor = null;
    for (const v of verts) {
      if (!inPoly(v.p, target)) continue;
      let covered = false;
      for (const pp of placedPolys) {
        if (inPoly(v.p, pp) || distPtPolyEdge(v.p, pp) < 1e-6) { covered = true; break; }
      }
      if (!covered) { anchor = v; break; }
    }
    if (!anchor) {
      // 角点都盖住了：若面积也对得上就算成功
      if (Math.abs(accArea - total) < 1e-6) found = chosen.slice();
      return;
    }
    // 面积剪枝：未覆盖面积应≈剩余块面积
    const coveredArea = countCov() * cell;
    const remArea = total - accArea;
    const uncovered = Math.abs(area(target)) - coveredArea;
    if (Math.abs(uncovered - remArea) > (opts.areaTol || 0.45)) return;

    for (const id of remaining) {
      const rest = remaining.filter(x => x !== id);
      for (const v of V[id]) {
        for (let vi = 0; vi < v.poly.length; vi++) {
          const tx = anchor.p[0] - v.poly[vi][0];
          const ty = anchor.p[1] - v.poly[vi][1];
          const poly = v.poly.map(q => [q[0] + tx, q[1] + ty]);
          if (!insideTolPoly(poly, target, tol)) continue;
          let clash = false;
          for (const pp of placedPolys) if (hasOverlap(poly, pp)) { clash = true; break; }
          if (clash) continue;
          placedPolys.push(poly);
          chosen.push({ id, angle: v.angle, flip: v.flip, poly });
          const add = [];
          for (let i = 0; i < pts.length; i++) if (inPoly(pts[i], poly) && !(covBits[i >> 5] & (1 << (i & 31)))) add.push(i);
          for (const i of add) covBits[i >> 5] |= (1 << (i & 31));
          rec(rest, accArea + area(poly));
          for (const i of add) covBits[i >> 5] &= ~(1 << (i & 31));
          chosen.pop();
          placedPolys.pop();
          if (found) return;
        }
      }
    }
  }
  rec(IDS.slice(), 0);
  return found ? { pieces: found } : null;
}
