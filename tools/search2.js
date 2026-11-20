/* 四巧板拼法搜索（第二版）：允许「滑动贴合」(T 形接缝)，随机化搜索 + 去重
 * 输出：out/shapes2.json + out/overview2.bmp
 */
const fs = require('fs');
const path = require('path');

const DEFS = {
  A: [[3, 0], [0, 0], [1, 1], [3, 1]],
  B: [[0, 1], [0, 0], [1, 1]],
  C: [[0, 0], [1.5, 0], [0.5, 1], [0, 1]],
  D: [[3, 1], [0, 1], [1, 0], [2.5, 0], [2.25, 0.25]]
};
const SUM_AREA = 2.5 + 0.5 + 1.0 + 2.0625;

/* ---------- 几何 ---------- */
const r4 = v => Math.round(v * 1e4) / 1e4;
function rotFlip(p, deg, flip) {
  const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  const x = flip ? -p[0] : p[0], y = p[1];
  return [x * c - y * s, x * s + y * c];
}
function area(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) { const q = poly[(i + 1) % poly.length]; a += poly[i][0] * q[1] - q[0] * poly[i][1]; }
  return Math.abs(a) / 2;
}
function centroidOf(poly) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    const cr = p[0] * q[1] - q[0] * p[1];
    a += cr; cx += (p[0] + q[0]) * cr; cy += (p[1] + q[1]) * cr;
  }
  a *= 0.5;
  return [cx / (6 * a), cy / (6 * a)];
}
function inPoly(pt, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[1] > pt[1]) !== (b[1] > pt[1]) && pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}
function distPtSeg(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  if (l2 < 1e-12) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}
function distPtPolyEdge(p, poly) {
  let m = Infinity;
  for (let i = 0; i < poly.length; i++) m = Math.min(m, distPtSeg(p, poly[i], poly[(i + 1) % poly.length]));
  return m;
}
function strictlyInside(p, poly) { return inPoly(p, poly) && distPtPolyEdge(p, poly) > 1e-6; }
function samplePoints(poly) {
  const pts = [], n = poly.length;
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n];
    pts.push(a);
    for (const t of [0.25, 0.5, 0.75]) pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  pts.push(centroidOf(poly));
  return pts;
}
function segProperCross(p1, p2, p3, p4) {
  const d1x = p2[0] - p1[0], d1y = p2[1] - p1[1];
  const d2x = p4[0] - p3[0], d2y = p4[1] - p3[1];
  const den = d1x * d2y - d1y * d2x;
  if (Math.abs(den) < 1e-12) return false;
  const ex = p3[0] - p1[0], ey = p3[1] - p1[1];
  const t = (ex * d2y - ey * d2x) / den;
  const u = (ex * d1y - ey * d1x) / den;
  return t > 1e-6 && t < 1 - 1e-6 && u > 1e-6 && u < 1 - 1e-6;
}
function hasOverlap(p1, p2) {
  for (const v of samplePoints(p1)) if (strictlyInside(v, p2)) return true;
  for (const v of samplePoints(p2)) if (strictlyInside(v, p1)) return true;
  for (let i = 0; i < p1.length; i++) {
    const a = p1[i], b = p1[(i + 1) % p1.length];
    for (let j = 0; j < p2.length; j++) if (segProperCross(a, b, p2[j], p2[(j + 1) % p2.length])) return true;
  }
  return false;
}
function bbox(polys) {
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  for (const p of polys) for (const v of p) { a = Math.min(a, v[0]); b = Math.min(b, v[1]); c = Math.max(c, v[0]); d = Math.max(d, v[1]); }
  return [a, b, c, d];
}

/* ---------- 并集轮廓 ---------- */
function unionOutline(polys) {
  const segs = [];
  for (const p of polys) for (let i = 0; i < p.length; i++) segs.push([p[i], p[(i + 1) % p.length]]);
  const parts = [];
  for (let i = 0; i < segs.length; i++) {
    const [a, b] = segs[i];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy;
    const ts = [0, 1];
    for (let j = 0; j < segs.length; j++) {
      if (i === j) continue;
      const [c, d] = segs[j];
      const ex = d[0] - c[0], ey = d[1] - c[1];
      const den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-12) {
        const cr = ((c[0] - a[0]) * dy - (c[1] - a[1]) * dx) / Math.sqrt(len2);
        if (Math.abs(cr) > 1e-6) continue;
        for (const q of [c, d]) {
          const t = ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / len2;
          if (t > 1e-9 && t < 1 - 1e-9) ts.push(t);
        }
        continue;
      }
      const t = ((c[0] - a[0]) * ey - (c[1] - a[1]) * ex) / den;
      const u = ((c[0] - a[0]) * dy - (c[1] - a[1]) * dx) / den;
      if (t > 1e-9 && t < 1 - 1e-9 && u > -1e-9 && u < 1 + 1e-9) ts.push(t);
    }
    ts.sort((x, y) => x - y);
    for (let k = 0; k < ts.length - 1; k++) {
      const t0 = ts[k], t1 = ts[k + 1];
      if (t1 - t0 < 1e-7) continue;
      parts.push([[a[0] + dx * t0, a[1] + dy * t0], [a[0] + dx * t1, a[1] + dy * t1]]);
    }
  }
  const insideUnion = pt => polys.some(p => inPoly(pt, p) && distPtPolyEdge(pt, p) > 1e-9);
  const keep = [], seenK = new Set(), uniq = [];
  for (const [m0, m1] of parts) {
    const dx = m1[0] - m0[0], dy = m1[1] - m0[1];
    const L = Math.hypot(dx, dy);
    if (L < 1e-9) continue;
    const nx = -dy / L * 2e-3, ny = dx / L * 2e-3;
    const mx = (m0[0] + m1[0]) / 2, my = (m0[1] + m1[1]) / 2;
    const pos = insideUnion([mx + nx, my + ny]);
    const neg = insideUnion([mx - nx, my - ny]);
    if (pos === neg) continue;
    const seg = pos ? [m0, m1] : [m1, m0];
    const k1 = r4(seg[0][0]) + ',' + r4(seg[0][1]) + '|' + r4(seg[1][0]) + ',' + r4(seg[1][1]);
    if (seenK.has(k1)) continue;
    seenK.add(k1); uniq.push(seg);
  }
  const key = v => r4(v[0] * 100) + ',' + r4(v[1] * 100);
  const byStart = new Map();
  uniq.forEach((s, i) => { const k = key(s[0]); if (!byStart.has(k)) byStart.set(k, []); byStart.get(k).push(i); });
  const used = new Array(uniq.length).fill(false);
  const loops = [];
  for (let i = 0; i < uniq.length; i++) {
    if (used[i]) continue;
    const loop = []; let cur = i, guard = 0;
    while (cur !== -1 && !used[cur] && guard++ < 800) {
      used[cur] = true; loop.push(uniq[cur][0]);
      const cands = byStart.get(key(uniq[cur][1])) || [];
      cur = cands.find(c => !used[c]); if (cur === undefined) cur = -1;
    }
    if (loop.length >= 3) loops.push(loop);
  }
  return loops;
}
function simplify(poly, tol = 1e-3) {
  const out = [], n = poly.length;
  for (let i = 0; i < n; i++) {
    const a = poly[(i - 1 + n) % n], b = poly[i], c = poly[(i + 1) % n];
    const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
    if (Math.abs(cross) / len > tol) out.push(b);
  }
  return out.length >= 3 ? out : poly;
}
function canonical(poly) {
  const vars = [];
  for (let k = 0; k < 4; k++) for (const flip of [false, true]) {
    let p = poly.map(v => rotFlip(v, k * 90, flip));
    let mnx = Infinity, mny = Infinity;
    for (const v of p) { mnx = Math.min(mnx, v[0]); mny = Math.min(mny, v[1]); }
    p = p.map(v => [r4(v[0] - mnx), r4(v[1] - mny)]);
    let best = null;
    for (let s = 0; s < p.length; s++) {
      const seq = [];
      for (let i = 0; i < p.length; i++) seq.push(p[(s + i) % p.length]);
      const str = seq.map(v => v[0].toFixed(4) + ',' + v[1].toFixed(4)).join(';');
      if (!best || str < best.str) best = { str, seq };
    }
    vars.push(best);
  }
  vars.sort((a, b) => a.str < b.str ? -1 : 1);
  return vars[0];
}

/* ---------- 滑动贴合候选 ---------- */
const SLIDE_STEP = 0.25;
function placements(id, placed) {
  const base = DEFS[id];
  const out = [];
  const seen = new Set();
  for (let k = 0; k < 8; k++) {
    for (const flip of [false, true]) {
      const tp = base.map(v => rotFlip(v, k * 45, flip));
      for (let i = 0; i < tp.length; i++) {
        const a = tp[i], b = tp[(i + 1) % tp.length];
        const len1 = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (len1 < 1e-9) continue;
        const u1 = [(b[0] - a[0]) / len1, (b[1] - a[1]) / len1];
        for (const pl of placed) {
          for (let j = 0; j < pl.poly.length; j++) {
            const c = pl.poly[j], d = pl.poly[(j + 1) % pl.poly.length];
            const len2 = Math.hypot(d[0] - c[0], d[1] - c[1]);
            if (len2 < 1e-9) continue;
            const u2 = [(d[0] - c[0]) / len2, (d[1] - c[1]) / len2];
            // 平行（同向或反向）
            const par = u1[0] * u2[1] - u1[1] * u2[0];
            if (Math.abs(par) > 1e-6) continue;
            // 法向偏移：把 a 移到 c,d 所在直线上
            const nx = -u2[1], ny = u2[0];
            const off = (c[0] - a[0]) * nx + (c[1] - a[1]) * ny;
            const bx = a[0] + nx * off, by = a[1] + ny * off;
            // 沿 u2 滑动，使 [s0, s0+len1] 与 [0, len2] 有交叠
            const s0 = (bx - c[0]) * u2[0] + (by - c[1]) * u2[1];
            const lo = Math.max(-s0, -len2 + 1e-9);          // 需 s0+t > 0
            const hi = Math.min(len2 - s0, len1);            // 需 s0+t+len1 < len2+...
            const tt0 = Math.max(lo, 0), tt1 = Math.min(hi, len2 - s0 + len1);
            // t 范围：使两段重叠
            const tmin = -(s0 + len1) + 1e-6;   // 右端对齐 c
            const tmax = len2 - s0 - 1e-6;      // 左端对齐 d
            if (tmax - tmin < 0.2) continue;    // 重叠太短，跳过
            const steps = Math.floor((tmax - tmin) / SLIDE_STEP);
            for (let s = 0; s <= steps; s++) {
              const t = tmin + s * SLIDE_STEP;
              const poly = tp.map(p => [r4(p[0] + nx * off + u2[0] * t), r4(p[1] + ny * off + u2[1] * t)]);
              const key = poly.map(v => v[0] + ',' + v[1]).join(';');
              if (seen.has(key)) continue;
              seen.add(key);
              if (placed.some(p => hasOverlap(poly, p.poly))) continue;
              out.push({ id, angle: k * 45, flip, poly });
            }
          }
        }
      }
    }
  }
  return out;
}

/* ---------- 随机搜索 ---------- */
const T_SECONDS = +(process.argv[2] || 60);
const results = new Map();
const t0 = Date.now();
let tries = 0, ok = 0;

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}

while (Date.now() - t0 < T_SECONDS * 1000) {
  tries++;
  const placed = [{ id: 'A', angle: 0, flip: false, poly: DEFS.A.map(v => [r4(v[0]), r4(v[1])]) }];
  let fail = false;
  for (const id of shuffle(['B', 'C', 'D'])) {
    const cands = placements(id, placed);
    // 只保留紧凑的：包围盒填充分数
    const good = cands.filter(c => {
      const bb = bbox(placed.map(p => p.poly).concat([c.poly]));
      const w = bb[2] - bb[0], h = bb[3] - bb[1];
      return w < 4.6 && h < 4.6 && SUM_AREA / (w * h) > 0.52;
    });
    if (!good.length) { fail = true; break; }
    placed.push(good[Math.floor(Math.random() * good.length)]);
  }
  if (fail) continue;
  const loops = unionOutline(placed.map(p => p.poly));
  if (loops.length !== 1) continue;
  const outline = simplify(loops[0]);
  if (outline.length < 3) continue;
  if (Math.abs(area(outline) - SUM_AREA) > 2e-3) continue;
  ok++;
  const can = canonical(outline);
  if (!results.has(can.str)) results.set(can.str, { outline: can.seq, conf: placed });
}

console.log(`尝试 ${tries} 次，成功 ${ok} 次，唯一边形 ${results.size} 个，用时 ${((Date.now() - t0) / 1000).toFixed(1)}s`);

const list = [...results.values()];
const score = (o) => {
  const bb = bbox([o]); const w = bb[2] - bb[0], h = bb[3] - bb[1];
  const fill = area(o) / (w * h);
  let axis = 0;
  for (let i = 0; i < o.length; i++) {
    const a = o[i], b = o[(i + 1) % o.length];
    if (Math.abs(a[0] - b[0]) < 1e-3 || Math.abs(a[1] - b[1]) < 1e-3) axis++;
  }
  return (o.length - 3) * 1.5 + (1 - fill) * 14 - axis * 0.7 + Math.max(0, Math.max(w, h) - 3) * 1.2;
};
list.sort((a, b) => score(a.outline) - score(b.outline));

const outDir = path.join(__dirname, 'out');
fs.writeFileSync(path.join(outDir, 'shapes2.json'), JSON.stringify(list.map((s, i) => ({
  idx: i, score: +score(s.outline).toFixed(2), area: +area(s.outline).toFixed(4),
  bbox: bbox([s.outline]).map(v => +v.toFixed(3)),
  outline: s.outline.map(v => [+v[0].toFixed(4), +v[1].toFixed(4)]),
  conf: s.conf.map(p => ({ id: p.id, angle: +(p.angle % 360).toFixed(2), flip: !!p.flip, poly: p.poly.map(v => [+v[0].toFixed(4), +v[1].toFixed(4)]) }))
}), null, 1)));
console.log('已写 out/shapes2.json');
