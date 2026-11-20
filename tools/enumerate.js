/* 四巧板拼法穷举器（解析几何，非栅格）
 * 目标：枚举「四块板边对边贴合」的全部合法摆法，求出并集轮廓，
 *       去重后输出候选轮廓，供人工/程序挑选关卡剪影。
 *
 * 用法：node enumerate.js
 * 输出：out/shapes.json（去重后的轮廓）+ 控制台 ASCII 预览
 *
 * 本文件同时可作为模块被其它工具 require（tools/_designD.js 等用它做几何布尔运算），
 * 因此把「搜索」与「主流程」拆开：require 时不会自动跑枚举。
 */
const fs = require('fs');
const path = require('path');

/* ---- 四块板基准多边形（单位 u，未平移到质心） ---- */
const DEFS = {
  A: [[3, 0], [0, 0], [1, 1], [3, 1]],
  B: [[0, 1], [0, 0], [1, 1]],
  C: [[0, 0], [1.5, 0], [0.5, 1], [0, 1]],
  /* v0.3 经典四巧板 D（尖角凹五边形）——5 顶点、1 个凹角（225°，在 [0.5,1]），
   * 边长 1 / 0.5 / √2 / 1.5 / 2√2，面积 2.0 u²。
   * 与 A/B/C 配套能拼出「横杠 3×1 + 竖梁 1×3」的标准 T（见 tools/tile_ref_t.js）。
   * 注意 2√2 那条长斜边没有等长配对，须由两条 √2 边各盖一半（T 型接缝），
   * 因此枚举器（整边贴合）生成的剪影都会带这条斜边；标准 T 由 build_levels.js 硬指定。 */
  D: [[0.5, 0], [0.5, 1], [0, 1], [1, 2], [2.5, 2]]
};
/* v0.1 旧 D（凹口两条斜边 0.3536/1.0607 在整套板里无等长边可配对 → 纯直角剪影不可能），
 * 仅留作对照，勿再使用。 */
const DEFS_V01 = {
  A: [[3, 0], [0, 0], [1, 1], [3, 1]],
  B: [[0, 1], [0, 0], [1, 1]],
  C: [[0, 0], [1.5, 0], [0.5, 1], [0, 1]],
  D: [[3, 1], [0, 1], [1, 0], [2.5, 0], [2.25, 0.25]]
};
const NAMES = { A: '大梯形', B: '小三角', C: '小梯形', D: '燕尾块' };
const IDS = ['A', 'B', 'C', 'D'];
const TOL = 2e-2;      // 边长匹配容差(u)
const EPS = 1e-7;

/* ---- 基础几何 ---- */
function shoelace(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}
const area = poly => Math.abs(shoelace(poly));

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
    if ((a[1] > pt[1]) !== (b[1] > pt[1]) &&
        pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}

function distPtSeg(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  if (l2 < EPS) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}
function distPtPolyEdge(p, poly) {
  let m = Infinity;
  for (let i = 0; i < poly.length; i++) {
    m = Math.min(m, distPtSeg(p, poly[i], poly[(i + 1) % poly.length]));
  }
  return m;
}
function strictlyInside(p, poly) {
  return inPoly(p, poly) && distPtPolyEdge(p, poly) > 1e-6;
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

/* 采样点：顶点 + 边中点 + 边内分点 + 质心
 * （只测顶点会漏掉「一块整块楔进另一块、顶点全落在边界上」的情况） */
function samplePoints(poly) {
  const pts = [];
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n];
    pts.push(a);
    for (const t of [0.25, 0.5, 0.75]) {
      pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  pts.push(centroidOf(poly));
  return pts;
}

/* 两多边形是否有正面积重叠（贴边/共点不算） */
function hasOverlap(p1, p2) {
  for (const v of samplePoints(p1)) if (strictlyInside(v, p2)) return true;
  for (const v of samplePoints(p2)) if (strictlyInside(v, p1)) return true;
  for (let i = 0; i < p1.length; i++) {
    const a = p1[i], b = p1[(i + 1) % p1.length];
    for (let j = 0; j < p2.length; j++) {
      const c = p2[j], d = p2[(j + 1) % p2.length];
      if (segProperCross(a, b, c, d)) return true;
    }
  }
  return false;
}

/* ---- 变换 ---- */
function rotFlip(p, deg, flip) {
  const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  const x = flip ? -p[0] : p[0], y = p[1];
  return [x * c - y * s, x * s + y * c];
}

const r4 = v => Math.round(v * 1e4) / 1e4;
function polyKey(poly) {
  // 顶点集无关顺序的键
  const s = poly.map(v => r4(v[0]) + ',' + r4(v[1])).sort().join(';');
  return s;
}
function dedupePolys(list) {
  const seen = new Set(), out = [];
  for (const p of list) {
    const k = polyKey(p);
    if (seen.has(k)) continue;
    seen.add(k); out.push(p);
  }
  return out;
}

/* ---- 放置候选：与已放置簇的某条边整边贴合 ---- */
function candidates(pieceId, placed, defs) {
  const base = (defs || DEFS)[pieceId];
  const out = [];
  for (let k = 0; k < 8; k++) {
    for (const flip of [false, true]) {
      const tp = base.map(v => rotFlip(v, k * 45, flip));
      for (let i = 0; i < tp.length; i++) {
        const a = tp[i], b = tp[(i + 1) % tp.length];
        const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]);
        for (const pl of placed) {
          for (let j = 0; j < pl.poly.length; j++) {
            const c = pl.poly[j], d = pl.poly[(j + 1) % pl.poly.length];
            const l2 = Math.hypot(d[0] - c[0], d[1] - c[1]);
            /* 整边对整边贴合（v0.3 定稿）。
             * 曾试过放开「短边贴长边的一段」（T 型接缝）来枚举干净正交剪影：
             * 经典 D 有一条 2√2 长斜边，必须由两条 √2 边各盖一半才拼得出标准 T。
             * 但放开后每层候选翻倍、深度 4 的搜索膨胀到不可跑（实测），且 D 固定最后放置时
             * 长边也没有后续板能盖住。因此枚举器保持整边贴合，
             * 标准 T 由 build_levels.js 的 TSPEC 硬指定并单独过 judge 校验。 */
            if (Math.abs(l1 - l2) > TOL) continue;
            for (const [A, B] of [[c, d], [d, c]]) {
              const ang = Math.atan2(B[1] - A[1], B[0] - A[0]) - Math.atan2(b[1] - a[1], b[0] - a[0]);
              const ca = Math.cos(ang), sa = Math.sin(ang);
              const poly = tp.map(p => {
                const x = p[0] - a[0], y = p[1] - a[1];
                return [r4(A[0] + x * ca - y * sa), r4(A[1] + x * sa + y * ca)];
              });
              out.push({
                id: pieceId,
                angle: ((k * 45 + ang * 180 / Math.PI) % 360 + 360) % 360,
                flip, poly
              });
            }
          }
        }
      }
    }
  }
  return out;
}

/* ---- 把一堆线段按交点切碎 ---- */
function splitSegs(segs) {
  const parts = [];
  for (let i = 0; i < segs.length; i++) {
    const [a, b] = segs[i];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy;
    if (len2 < 1e-14) continue;
    const ts = [0, 1];
    for (let j = 0; j < segs.length; j++) {
      if (i === j) continue;
      const [c, d] = segs[j];
      const ex = d[0] - c[0], ey = d[1] - c[1];
      const den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-12) {
        // 平行：若是共线，把落在本段内部的对方端点投影进来
        const cr = ((c[0] - a[0]) * dy - (c[1] - a[1]) * dx) / Math.sqrt(len2);
        if (Math.abs(cr) > 1e-6) continue;
        for (const q of [c, d]) {
          const t = ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / len2;
          if (t > 1e-9 && t < 1 - 1e-9) ts.push(t);
        }
        continue;
      }
      // 交点必须同时落在两条线段上（之前漏了 u 的判断，会把远处延长线当交点）
      const t = ((c[0] - a[0]) * ey - (c[1] - a[1]) * ex) / den;
      const u = ((c[0] - a[0]) * dy - (c[1] - a[1]) * dx) / den;
      if (t > 1e-9 && t < 1 - 1e-9 && u > -1e-9 && u < 1 + 1e-9) ts.push(t);
    }
    ts.sort((x, y) => x - y);
    for (let k = 0; k < ts.length - 1; k++) {
      const t0 = ts[k], t1 = ts[k + 1];
      if (t1 - t0 < 1e-7) continue;
      const m0 = [a[0] + dx * t0, a[1] + dy * t0];
      const m1 = [a[0] + dx * t1, a[1] + dy * t1];
      if (Math.hypot(m1[0] - m0[0], m1[1] - m0[1]) < 1e-7) continue;
      parts.push([m0, m1]);
    }
  }
  return parts;
}

/* ---- 通用区域边界：给一组线段 + 「点是否在区域内」判据，串出区域外轮廓环 ----
 * unionOutline(polys) 是它的特例（区域 = 多边形的并集）。
 * 「区域 = T 减去若干块」也能算（tools/_designD.js 用它反解剩下的那块板）。 */
function boundaryOf(segs, insideFn) {
  const parts = splitSegs(segs);

  // 判内外：沿法线两侧各取一点，恰有一侧在区域内 → 边界
  const keep = [];
  for (const [m0, m1] of parts) {
    const dx = m1[0] - m0[0], dy = m1[1] - m0[1];
    const L = Math.hypot(dx, dy);
    const nx = -dy / L * 2e-3, ny = dx / L * 2e-3;
    const mx = (m0[0] + m1[0]) / 2, my = (m0[1] + m1[1]) / 2;
    const pos = insideFn([mx + nx, my + ny]);   // 左法线侧是否在区域内
    const neg = insideFn([mx - nx, my - ny]);
    // 只保留恰有一侧在内的段，并统一成「内部在左侧」(逆时针) 方向，
    // 否则串环时会因为方向不一致而走断
    if (pos !== neg) keep.push(pos ? [m0, m1] : [m1, m0]);
  }

  // 去重（共线段多次出现）
  const uniq = [];
  const seenK = new Set();
  for (const s of keep) {
    const a = s[0], b = s[1];
    const k1 = r4(a[0]) + ',' + r4(a[1]) + '|' + r4(b[0]) + ',' + r4(b[1]);
    const k2 = r4(b[0]) + ',' + r4(b[1]) + '|' + r4(a[0]) + ',' + r4(a[1]);
    if (seenK.has(k1) || seenK.has(k2)) continue;
    seenK.add(k1); uniq.push(s);
  }

  // 串环
  const key = v => r4(v[0] * 100) + ',' + r4(v[1] * 100);
  const byStart = new Map();
  uniq.forEach((s, i) => {
    const k = key(s[0]);
    if (!byStart.has(k)) byStart.set(k, []);
    byStart.get(k).push(i);
  });
  const used = new Array(uniq.length).fill(false);
  const loops = [];
  for (let i = 0; i < uniq.length; i++) {
    if (used[i]) continue;
    const loop = [];
    let cur = i;
    let guard = 0;
    while (cur !== -1 && !used[cur] && guard++ < 500) {
      used[cur] = true;
      loop.push(uniq[cur][0]);
      const endK = key(uniq[cur][1]);
      const cands = byStart.get(endK) || [];
      let next = -1;
      for (const c of cands) if (!used[c]) { next = c; break; }
      cur = next;
    }
    if (loop.length >= 3) loops.push(loop);
  }
  return loops;
}

/* ---- 并集轮廓：把内部共边消掉，串成外轮廓环 ---- */
function unionOutline(polys) {
  const segs = [];
  for (const p of polys) for (let i = 0; i < p.length; i++) segs.push([p[i], p[(i + 1) % p.length]]);
  const insideUnion = pt => polys.some(p => inPoly(pt, p) && distPtPolyEdge(pt, p) > 1e-9);
  return boundaryOf(segs, insideUnion);
}

/* ---- 轮廓规整：去掉共线点，统一方向 ---- */
function simplify(poly, tol = 1e-3) {
  const out = [];
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const a = poly[(i - 1 + n) % n], b = poly[i], c = poly[(i + 1) % n];
    const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
    if (Math.abs(cross) / len > tol) out.push(b);
  }
  return out.length >= 3 ? out : poly;
}

/* ---- 轮廓规范化（平移 + 8 向对称取最小），用于全局去重 ---- */
function canonical(poly) {
  const variants = [];
  for (let k = 0; k < 4; k++) {
    for (const flip of [false, true]) {
      let p = poly.map(v => rotFlip(v, k * 90, flip));
      let minx = Infinity, miny = Infinity;
      for (const v of p) { minx = Math.min(minx, v[0]); miny = Math.min(miny, v[1]); }
      p = p.map(v => [r4(v[0] - minx), r4(v[1] - miny)]);
      // 统一起点：取字典序最小的顶点开头
      let best = null;
      for (let s = 0; s < p.length; s++) {
        const seq = [];
        for (let i = 0; i < p.length; i++) seq.push(p[(s + i) % p.length]);
        const str = seq.map(v => v[0].toFixed(4) + ',' + v[1].toFixed(4)).join(';');
        if (!best || str < best.str) best = { str, seq };
      }
      variants.push(best);
    }
  }
  variants.sort((a, b) => a.str < b.str ? -1 : 1);
  return variants[0];
}

/* ---- 主搜索 ----
 * seeds：起手直接放在基准位置的板。元素可以是板 id（不旋转不镜像），
 *        也可以是 { id, angle, flip }（把起手板摆成指定朝向）。
 * order：其余板要尝试的顺序
 * 说明：只固定「起手板」的朝向，其余板穷举 8 向。
 *       单一 A 朝向会漏掉「A 必须以 45°/镜像参与」的拼法，所以支持给多组 seeds 分别跑。
 */
function search(defs, seeds, order) {
  defs = defs || DEFS;
  seeds = seeds || ['A'];
  const startIds = seeds.map(s => (typeof s === 'string' ? s : s.id));
  order = order || IDS.filter(id => startIds.indexOf(id) < 0);
  const results = [];
  const start = seeds.map(s => {
    const id = typeof s === 'string' ? s : s.id;
    const angle = typeof s === 'string' ? 0 : (s.angle || 0);
    const flip = typeof s === 'string' ? false : !!s.flip;
    return {
      id, angle, flip,
      poly: defs[id].map(v => rotFlip(v, angle, flip)).map(v => [r4(v[0]), r4(v[1])])
    };
  });

  function rec(placed, remaining) {
    if (remaining.length === 0) {
      results.push(placed.map(p => ({ id: p.id, angle: p.angle, flip: p.flip, poly: p.poly })));
      return;
    }
    for (let ri = 0; ri < remaining.length; ri++) {
      const id = remaining[ri];
      const rest = remaining.slice(0, ri).concat(remaining.slice(ri + 1));
      const cands = candidates(id, placed, defs);
      const seen = new Set();
      for (const c of cands) {
        if (placed.some(p => hasOverlap(c.poly, p.poly))) continue;
        const k = polyKey(c.poly);
        if (seen.has(k)) continue;
        seen.add(k);
        rec(placed.concat([c]), rest);
      }
    }
  }
  rec(start, order);
  return results;
}

/* ---- ASCII 预览 ---- */
function bbox(poly) {
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  for (const v of poly) { a = Math.min(a, v[0]); b = Math.min(b, v[1]); c = Math.max(c, v[0]); d = Math.max(d, v[1]); }
  return [a, b, c, d];
}
function art(poly, width = 64) {
  const bb = bbox(poly);
  const w = bb[2] - bb[0], h = bb[3] - bb[1];
  const rows = Math.max(3, Math.round(width * h / w / 2.1));
  const cw = w / width, ch = h / rows;
  const lines = [];
  for (let ry = 0; ry < rows; ry++) {
    let line = '';
    for (let rx = 0; rx < width; rx++) {
      const p = [bb[0] + (rx + 0.5) * cw, bb[1] + (ry + 0.5) * ch];
      line += inPoly(p, poly) ? '#' : '.';
    }
    lines.push(line);
  }
  return lines;
}

/* ---- 形状打分：越小越"规整" ---- */
function score(poly) {
  const n = poly.length;
  const bb = bbox(poly);
  const w = bb[2] - bb[0], h = bb[3] - bb[1];
  const fill = area(poly) / (w * h);
  // 直角边占比
  let axis = 0;
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n];
    if (Math.abs(a[0] - b[0]) < 1e-3 || Math.abs(a[1] - b[1]) < 1e-3) axis++;
  }
  return (n - 3) * 2 + (1 - fill) * 12 - axis * 0.6;
}

/* ---- 近重复轮廓合并：64×64 栅格 IoU ≥ IOU_DUP 视为同一轮廓 ----
 * 精确 canonical 串只能去掉「完全一致」的轮廓；点阵/归一化微小差异会漏出近重复。
 * 这里按 bbox 归一化到 64×64，格心采样得到位掩码（每行 64 bit → 2×uint32），
 * 用 XOR + popcount 算 IoU。先按 area/宽高比预筛，避免 O(n²) 全量比对。 */
const IOU_DUP = 0.985;
const RASTER_N = 64;
function rasterMask(poly) {
  let mnx = Infinity, mny = Infinity, mxx = -Infinity, mxy = -Infinity;
  for (const v of poly) {
    if (v[0] < mnx) mnx = v[0]; if (v[0] > mxx) mxx = v[0];
    if (v[1] < mny) mny = v[1]; if (v[1] > mxy) mxy = v[1];
  }
  const w = (mxx - mnx) || 1, h = (mxy - mny) || 1;
  const N = RASTER_N;
  const mask = new Uint32Array(N * 2);
  let count = 0;
  for (let gy = 0; gy < N; gy++) {
    const py = mny + (gy + 0.5) * h / N;
    for (let gx = 0; gx < N; gx++) {
      const px = mnx + (gx + 0.5) * w / N;
      if (inPoly([px, py], poly)) {
        mask[(gy * N + gx) >> 5] |= (1 << ((gy * N + gx) & 31));
        count++;
      }
    }
  }
  return { mask, count };
}
function popcnt32(x) {
  x = x - ((x >> 1) & 0x55555555);
  x = (x & 0x33333333) + ((x >> 2) & 0x33333333);
  return (((x + (x >> 4)) & 0x0f0f0f0f) * 0x01010101) >> 24;
}
function maskIoU(a, b) {
  let inter = 0;
  for (let i = 0; i < a.mask.length; i++) inter += popcnt32(a.mask[i] & b.mask[i]);
  const uni = a.count + b.count - inter;
  return uni > 0 ? inter / uni : 0;
}

/* ---- 主流程：枚举 → 并集 → 去重 → 写 out/shapes.json ---- */
function main() {
  const SUM_AREA = IDS.reduce((s, id) => s + area(DEFS[id]), 0);
  const t0 = Date.now();
  /* 起手板固定为 A，但 A 是否镜像必须两种都跑：
   * 镜像无法用旋转等价掉，只跑 A 的正向会漏掉「A 必须翻面」的全部拼法。 */
  const raw = search(DEFS, ['A'], ['B', 'C', 'D'])
    .concat(search(DEFS, [{ id: 'A', angle: 0, flip: true }], ['B', 'C', 'D']));
  console.log(`枚举完成：${raw.length} 种摆法，${Date.now() - t0}ms`);

  // 面积校验
  let bad = 0;
  for (const conf of raw) {
    const s = conf.reduce((acc, p) => acc + area(p.poly), 0);
    if (Math.abs(s - SUM_AREA) > 1e-3) bad++;
  }
  console.log(`面积异常的摆法：${bad}  (板件总面积 ${SUM_AREA.toFixed(4)} u²)`);

  // 求并集轮廓并去重
  const shapes = new Map();
  let skipped = 0;
  for (const conf of raw) {
    const loops = unionOutline(conf.map(p => p.poly));
    if (loops.length !== 1) { skipped++; continue; }        // 只接受单连通轮廓（无孔洞）
    const rawo = simplify(loops[0]);
    if (rawo.length < 3) { skipped++; continue; }
    // 无重叠 + 单连通 ⇒ 面积必须守恒；不守恒说明塌陷/有缝
    if (Math.abs(area(rawo) - SUM_AREA) > 2e-3) { skipped++; continue; }
    const can = canonical(rawo);
    // 轮廓与板件必须同一坐标系：只做平移（左上角归零），不做旋转/镜像
    const bb = bbox(rawo);
    const dx = bb[0], dy = bb[1];
    const tr = v => [r4(v[0] - dx), r4(v[1] - dy)];
    if (shapes.has(can.str)) {
      // 同一轮廓的另一种摆法 → 记录，用于"多解不误杀"验证
      const e = shapes.get(can.str);
      e.nsol = (e.nsol || 1) + 1;          // 同一轮廓的摆法总数 → 难度分用（解越多越简单）
      if (conf.some(p => p.flip)) e.nFlip = (e.nFlip || 0) + 1;   // 含翻面的解数
      if (e.alts.length < 3) {
        const sig = conf.map(p => p.id + p.angle + (p.flip ? 1 : 0)).sort().join('');
        if (!e.altSigs.has(sig)) {
          e.altSigs.add(sig);
          e.alts.push(conf.map(p => ({ id: p.id, angle: p.angle, flip: p.flip, poly: p.poly.map(tr) })));
        }
      }
      continue;
    }
    shapes.set(can.str, {
      outline: rawo.map(tr),
      conf: conf.map(p => ({ id: p.id, angle: p.angle, flip: p.flip, poly: p.poly.map(tr) })),
      nsol: 1, nFlip: conf.some(p => p.flip) ? 1 : 0,
      alts: [], altSigs: new Set()
    });
  }
  console.log(`被过滤（有洞/有缝/面积不守恒）：${skipped}`);
  const exact = [...shapes.values()];
  console.log(`精确去重后：${exact.length} 个`);

  // 近重复合并（64×64 IoU ≥ 0.985 视为同一个，只留第一个）
  const kept = [];
  const info = exact.map(s => {
    const bb = bbox(s.outline);
    const w = bb[2] - bb[0], h = bb[3] - bb[1];
    return { s, a: area(s.outline), ar: w / h, r: rasterMask(s.outline) };
  });
  let merged = 0;
  for (let i = 0; i < info.length; i++) {
    const A = info[i];
    let dupOf = -1;
    for (let j = 0; j < kept.length; j++) {
      const B = kept[j];
      if (Math.abs(A.a - B.a) / Math.max(A.a, B.a) > 0.02) continue;
      if (Math.abs(Math.log(A.ar / B.ar)) > 0.06) continue;
      if (maskIoU(A.r, B.r) >= IOU_DUP) { dupOf = j; break; }
    }
    if (dupOf < 0) kept.push(A);
    else {
      merged++;
      // 把被合并者的替代摆法补进保留者（用于"多解不误杀"验证）
      const tgt = kept[dupOf].s;
      tgt.nsol = (tgt.nsol || 1) + (A.s.nsol || 1);
      tgt.nFlip = (tgt.nFlip || 0) + (A.s.nFlip || 0);
      for (const alt of (A.s.alts || [])) {
        if (tgt.alts.length < 3) tgt.alts.push(alt);
      }
      for (const alt of (A.s.conf ? [A.s.conf] : [])) {
        const sig = alt.map(p => p.id + p.angle + (p.flip ? 1 : 0)).sort().join('');
        if (tgt.alts.length < 3 && !tgt.altSigs.has(sig)) { tgt.altSigs.add(sig); tgt.alts.push(alt); }
      }
    }
  }
  console.log(`近重复合并（IoU≥${IOU_DUP}）掉：${merged} 个`);
  const list = kept.map(k => k.s);
  list.sort((a, b) => score(a.outline) - score(b.outline));
  console.log(`去重后唯一轮廓：${list.length} 个\n`);

  const outDir = path.join(__dirname, 'out');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'shapes.json'), JSON.stringify(
    list.map((s, i) => ({
      idx: i,
      score: +score(s.outline).toFixed(2),
      nsol: s.nsol || 1,
      nFlip: s.nFlip || 0,
      area: +area(s.outline).toFixed(4),
      bbox: bbox(s.outline).map(v => +v.toFixed(3)),
      outline: s.outline.map(v => [+v[0].toFixed(4), +v[1].toFixed(4)]),
      conf: s.conf.map(p => ({
        id: p.id,
        angle: +(p.angle % 360).toFixed(2),
        flip: !!p.flip,
        poly: p.poly.map(v => [+v[0].toFixed(4), +v[1].toFixed(4)])
      })),
      alts: (s.alts || []).map(conf => conf.map(p => ({
        id: p.id,
        angle: +(p.angle % 360).toFixed(2),
        flip: !!p.flip,
        poly: p.poly.map(v => [+v[0].toFixed(4), +v[1].toFixed(4)])
      })))
    })), null, 1));
  console.log('已写 out/shapes.json');

  // 打印前 40 个
  const SHOW = Math.min(40, list.length);
  for (let i = 0; i < SHOW; i++) {
    const s = list[i];
    const bb = bbox(s.outline);
    console.log(`\n===== #${i}  score=${score(s.outline).toFixed(2)}  顶点=${s.outline.length}  ` +
      `${(bb[2] - bb[0]).toFixed(2)}×${(bb[3] - bb[1]).toFixed(2)}u  area=${area(s.outline).toFixed(3)}` +
      `  板: ${s.conf.map(p => p.id + (p.flip ? '-' : '+') + Math.round(p.angle)).join(' ')}`);
    console.log('  顶点: ' + s.outline.map(v => `(${v[0].toFixed(2)},${v[1].toFixed(2)})`).join(' '));
    for (const l of art(s.outline, 56)) console.log('  ' + l);
  }
}

if (require.main === module) main();

module.exports = {
  DEFS, DEFS_V01, NAMES, IDS,
  area, centroidOf, inPoly, distPtSeg, distPtPolyEdge, strictlyInside,
  hasOverlap, rotFlip, r4, candidates, splitSegs, boundaryOf, unionOutline,
  simplify, canonical, search, bbox, art, score, main
};
