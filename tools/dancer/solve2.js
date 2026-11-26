/* 舞者关卡反解 · 主流程（v2）
 * ==================================================================
 * 输入：tools/dancer/ref.png（10 个舞者图案，2 行 5 列）
 * 输出：tools/dancer/dancers_exact.json
 *
 * 流程：HSV 分割 → 每块板对 5 种形状各求最优拟合 → 全局形状指派
 *       → 连通性修补（把浮空的板挪到贴住）+ 顶点抖动焊接 → 精确并集轮廓
 *
 * 走过的弯路（别再重复）
 * ----------------------
 * 一开始想「把拟合位置吸附到精确贴边」，结果把板搬动了 1.4 单位，姿势全歪。
 * 实测发现：拟合位置本身就已经贴到 0.01~0.03 单位 —— 板是「角接触 / T 形接头」，
 * 顶点本来就不重合，所以「共用顶点数」这个指标对这类图案不适用。真正该做的是
 * **不搬位置**，只把 0.1 单位以内的抖动焊掉（交给并集的节点聚类容差），
 * 再修掉浮空的板。这样轮廓上的偏差 < 0.1 单位（9.6 世界单位都不到），肉眼无台阶。
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { readPng } = require('./pngio.js');
const SEG = require('./seg.js');
const FIT = require('./fit.js');
const UNION = require(path.join(__dirname, '..', 'zodiac', 'union.js'));
require(path.join(__dirname, '..', '..', 'js', 'geom.js'));
const G = globalThis.TANGRAM_GEOM;

const IMG = process.argv[2] || path.join(__dirname, 'ref.png');
const U = 96;                       // 世界单位 / base 单位（= dataset.unitScale）

const NAMES = [
  { name: '回眸', tip: '侧身回首 · 单臂上举' },
  { name: '展臂', tip: '双臂张开 · 抬头仰望' },
  { name: '托盘', tip: '双手托举 · 小步前倾' },
  { name: '跃起', tip: '收腿腾空 · 一臂上扬' },
  { name: '垂手', tip: '单腿站立 · 手臂下压' },
  { name: '横踢', tip: '一腿横出 · 上身侧倾' },
  { name: '探海', tip: '俯身探海 · 长腿后伸' },
  { name: '抬腿', tip: '高抬前腿 · 上身直立' },
  { name: '跳跃', tip: '凌空跃起 · 双腿张开' },
  { name: '旋身', tip: '单足旋转 · 裙摆飞扬' }
];
const SHAPES = ['T1', 'T3', 'S', 'T4', 'P'];

function comb(n, k) {
  const out = [], cur = [];
  (function rec(st) {
    if (cur.length === k) { out.push(cur.slice()); return; }
    for (let i = st; i < n; i++) { cur.push(i); rec(i + 1); cur.pop(); }
  })(0);
  return out;
}
const C2 = comb(7, 2);

/* 全局指派：7 块 x 5 形状，形状计数固定（2 大 / 1 中 / 1 方 / 2 小 / 1 平），总 IoU 最大 */
function allocate(aoi) {
  let best = null;
  for (const big of C2) {
    const r1 = [0, 1, 2, 3, 4, 5, 6].filter(i => big.indexOf(i) < 0);
    for (const mid of r1) {
      const r2 = r1.filter(i => i !== mid);
      for (const sq of r2) {
        const r3 = r2.filter(i => i !== sq);
        for (let a = 0; a < r3.length; a++) {
          for (let b = a + 1; b < r3.length; b++) {
            const sm = [r3[a], r3[b]];
            const pl = r3.filter(i => i !== sm[0] && i !== sm[1]);
            if (pl.length !== 1) continue;
            const sum = aoi[big[0]].T1 + aoi[big[1]].T1 + aoi[mid].T3
              + aoi[sq].S + aoi[sm[0]].T4 + aoi[sm[1]].T4 + aoi[pl[0]].P;
            if (!best || sum > best.sum) {
              const asg = [];
              big.forEach(i => { asg[i] = 'T1'; });
              asg[mid] = 'T3'; asg[sq] = 'S';
              asg[sm[0]] = 'T4'; asg[sm[1]] = 'T4';
              asg[pl[0]] = 'P';
              best = { sum, asg };
            }
          }
        }
      }
    }
  }
  return best;
}

const areaOf = p => {
  let a = 0;
  for (let i = 0; i < p.length; i++) { const q = p[i], r = p[(i + 1) % p.length]; a += q[0] * r[1] - r[0] * q[1]; }
  return Math.abs(a) / 2;
};
const r3 = v => Math.round(v * 1000) / 1000;

function inPoly(px, py, P) {
  let inside = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const xi = P[i][0], yi = P[i][1], xj = P[j][0], yj = P[j][1];
    if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/* 线段最近点对：返回 {d, p, q}（p 在 ab 上，q 在 cd 上） */
function segNear(a, b, c, d) {
  const rx = b[0] - a[0], ry = b[1] - a[1], sx = d[0] - c[0], sy = d[1] - c[1];
  const L1 = rx * rx + ry * ry, L2 = sx * sx + sy * sy;
  if (L1 < 1e-12 && L2 < 1e-12) return { d: Math.hypot(a[0] - c[0], a[1] - c[1]), p: a, q: c };
  if (L1 < 1e-12) { const r = segNear2(a, a, c, d); return { d: r.d, p: r.p, q: r.q }; }
  if (L2 < 1e-12) { const r = segNear2(c, c, a, b); return { d: r.d, p: r.q, q: r.p }; }
  const den = rx * sy - ry * sx;
  let t = 0, u = 0;
  if (Math.abs(den) > 1e-12) {
    t = ((c[0] - a[0]) * sy - (c[1] - a[1]) * sx) / den;
    u = ((c[0] - a[0]) * ry - (c[1] - a[1]) * rx) / den;
    t = Math.max(0, Math.min(1, t));
    u = Math.max(0, Math.min(1, u));
  } else {
    /* 平行：拿两端比一比 */
    const cands = [
      [0, 0], [0, 1], [1, 0], [1, 1]
    ].map(([ti, ui]) => {
      const P = [a[0] + rx * ti, a[1] + ry * ti];
      const Q = [c[0] + sx * ui, c[1] + sy * ui];
      return { d: Math.hypot(P[0] - Q[0], P[1] - Q[1]), p: P, q: Q };
    });
    return cands.reduce((x, y) => (y.d < x.d ? y : x));
  }
  const P = [a[0] + rx * t, a[1] + ry * t];
  const Q = [c[0] + sx * u, c[1] + sy * u];
  return { d: Math.hypot(P[0] - Q[0], P[1] - Q[1]), p: P, q: Q };
}
/* 退化情形（ab 长度 0）用点-线段 */
function segNear2(pt, _pt, c, d) {
  const sx = d[0] - c[0], sy = d[1] - c[1];
  const L2 = sx * sx + sy * sy || 1;
  let u = ((pt[0] - c[0]) * sx + (pt[1] - c[1]) * sy) / L2;
  u = Math.max(0, Math.min(1, u));
  const Q = [c[0] + sx * u, c[1] + sy * u];
  return { d: Math.hypot(pt[0] - Q[0], pt[1] - Q[1]), p: pt, q: Q };
}
function polyNear(A, B) {
  let best = { d: 1e9 };
  for (let i = 0; i < A.length; i++) {
    const a = A[i], b = A[(i + 1) % A.length];
    for (let j = 0; j < B.length; j++) {
      const c = B[j], d = B[(j + 1) % B.length];
      const r = segNear(a, b, c, d);
      if (r.d < best.d) best = r;
    }
  }
  return best;
}


/* 两块板之间「共用边」的总长度：并集能把它们合成一个环，靠的就是这类共边。
 * 只在角上碰到（共边长 0）时，并集会分成两个环 —— 关卡轮廓只有一个环，所以必须避免。 */
function sharedLen(A, B, tol) {
  let sum = 0;
  for (let i = 0; i < A.length; i++) {
    const a0 = A[i], a1 = A[(i + 1) % A.length];
    const dx = a1[0] - a0[0], dy = a1[1] - a0[1];
    const L = Math.hypot(dx, dy);
    if (L < 1e-9) continue;
    const ux = dx / L, uy = dy / L;
    for (let j = 0; j < B.length; j++) {
      const b0 = B[j], b1 = B[(j + 1) % B.length];
      const ex = b1[0] - b0[0], ey = b1[1] - b0[1];
      const L2 = Math.hypot(ex, ey);
      if (L2 < 1e-9) continue;
      if (Math.abs(ux * (ey / L2) - uy * (ex / L2)) > 1e-6) continue;      // 不平行
      const d0 = Math.abs((b0[0] - a0[0]) * uy - (b0[1] - a0[1]) * ux);      // 垂直距离
      const d1 = Math.abs((b1[0] - a0[0]) * uy - (b1[1] - a0[1]) * ux);
      if (d0 > tol || d1 > tol) continue;
      const p0 = (b0[0] - a0[0]) * ux + (b0[1] - a0[1]) * uy;
      const p1 = (b1[0] - a0[0]) * ux + (b1[1] - a0[1]) * uy;
      const lo = Math.max(0, Math.min(p0, p1)), hi = Math.min(L, Math.max(p0, p1));
      if (hi > lo) sum += hi - lo;
    }
  }
  return sum;
}
/* 只靠一个角挂着的板：朝最近的邻板挪一点点，让它出现一小段共边 */
function knitEdge(polys, tol) {
  const moved = polys.map(() => 0);
  for (let round = 0; round < 6; round++) {
    let bad = -1;
    for (let i = 0; i < polys.length; i++) {
      let tot = 0;
      for (let j = 0; j < polys.length; j++) if (j !== i) tot += sharedLen(polys[i], polys[j], tol);
      if (tot < 0.04) { bad = i; break; }
    }
    if (bad < 0) break;
    if (moved[bad] > 0.32) break;
    /* 找最近邻，朝它挪 gap+0.02 */
    let best = null;
    for (let j = 0; j < polys.length; j++) {
      if (j === bad) continue;
      const g = polyNear(polys[bad], polys[j]);
      if (!best || g.d < best.d) best = { d: g.d, p: g.p, q: g.q, j };
    }
    if (!best) break;
    const dx = best.q[0] - best.p[0], dy = best.q[1] - best.p[1];
    const L = Math.hypot(dx, dy) || 0;
    const k = Math.min(0.06, (L + 0.06) / (L || 1));
    const shift = L > 1e-9 ? [dx / L * (L + 0.06), dy / L * (L + 0.06)] : [0.06, 0];
    polys[bad] = polys[bad].map(v => [v[0] + shift[0], v[1] + shift[1]]);
    moved[bad] += Math.hypot(shift[0], shift[1]);
  }
  return { polys, moved };
}


/* ---------- 落位微调（坐标下降） ----------
 * 参考图里有几块板只在**一个角**上相接（甚至差 0.02 没接上），这种图案并集必然裂成
 * 几块，而关卡轮廓只允许一个环。给每块板找一个「多出一点共边、姿势又没变」的位置：
 *   目标 = 与其它板的共边总长 + 2.5 x 自身颜色覆盖率 - 1.2 x 位移
 * 只在 ±r 的小窗口里搜（默认 0.36 单位），所以姿势不会被带歪。
 */
function ownCover(pts, mask, s, gx0, gy0) {
  let c = 0, n = 0;
  for (let y = 0; y < mask.bh; y += 3) {
    for (let x = 0; x < mask.bw; x += 3) {
      if (!mask.mask[y * mask.bw + x]) continue;
      n++;
      const u = (mask.bx + x + 0.5 - gx0) / s, v = (mask.by + y + 0.5 - gy0) / s;
      if (inPoly(u, v, pts)) c++;
    }
  }
  return n ? c / n : 0;
}
function settle(polys, masks, s, gx0, gy0, opt) {
  const tol = opt.tol || 0.12, R = opt.r || 0.36, step = opt.step || 0.04;
  const rounds = opt.rounds || 4;
  let cur = polys.map(p => p.map(v => v.slice()));
  const total = P => {
    let t = 0;
    for (let j = 0; j < cur.length; j++) if (cur[j] !== P) t += sharedLen(P, cur[j], tol);
    return t;
  };
  for (let r = 0; r < rounds; r++) {
    let moved = 0;
    for (let i = 0; i < cur.length; i++) {
      const others = cur.filter((_, j) => j !== i);
      let best = null;
      for (let dx = -R; dx <= R + 1e-9; dx += step) {
        for (let dy = -R; dy <= R + 1e-9; dy += step) {
          const d = Math.hypot(dx, dy);
          if (d > R) continue;
          const P = cur[i].map(v => [v[0] + dx, v[1] + dy]);
          let sl = 0;
          for (const Q of others) sl += sharedLen(P, Q, tol);
          const cov = ownCover(P, masks[i], s, gx0, gy0);
          const sc = sl + cov * 2.5 - d * 1.2;
          if (!best || sc > best.sc) best = { sc, P, d };
        }
      }
      if (best && best.d > 1e-6) { cur[i] = best.P; moved++; }
    }
    if (!moved) break;
  }
  return { polys: cur };
}

/* 连通性修补：浮空的板平移去贴住主簇（位移上限 maxMove 单位） */
function knit(polys, maxMove) {
  const moves = polys.map(() => [0, 0]);
  for (let round = 0; round < 3; round++) {
    const cur = polys.map((P, i) => P.map(v => [v[0] + moves[i][0], v[1] + moves[i][1]]));
    /* 连通分量 */
    const par = cur.map((_, i) => i);
    const find = i => (par[i] === i ? i : (par[i] = find(par[i])));
    const gaps = [];
    for (let i = 0; i < cur.length; i++) {
      for (let j = i + 1; j < cur.length; j++) {
        const g = polyNear(cur[i], cur[j]);
        gaps.push([i, j, g]);
        if (g.d < 0.08) par[find(i)] = find(j);
      }
    }
    const groups = new Map();
    cur.forEach((_, i) => {
      const r = find(i);
      if (!groups.has(r)) groups.set(r, []);
      groups.get(r).push(i);
    });
    if (groups.size === 1) break;
    /* 主簇 = 成员最多的 */
    let main = null;
    for (const [, g] of groups) if (!main || g.length > main.length) main = g;
    const mainSet = new Set(main);
    let fixed = 0;
    for (const [r, g] of groups) {
      if (g.some(i => mainSet.has(i))) continue;
      /* 找跨簇最近的一对 */
      let best = null;
      for (const i of g) {
        for (const j of main) {
          const gg = polyNear(cur[i], cur[j]);
          if (!best || gg.d < best.g.d) best = { i, j, g: gg };
        }
      }
      if (!best || best.g.d > maxMove) continue;
      const dx = best.g.q[0] - best.g.p[0], dy = best.g.q[1] - best.g.p[1];
      const L = Math.hypot(dx, dy) || 1;
      const shift = [(dx / L) * (L + 0.005), (dy / L) * (L + 0.005)];
      g.forEach(i => { moves[i][0] += shift[0]; moves[i][1] += shift[1]; });
      fixed++;
    }
    if (!fixed) break;
  }
  return polys.map((P, i) => P.map(v => [v[0] + moves[i][0], v[1] + moves[i][1]]));
}

/* 轮廓清理：去掉过短边、合并近共线点 */
function cleanRing(pts, minLen, tolDeg) {
  let R = pts.slice();
  let changed = true;
  while (changed && R.length > 4) {
    changed = false;
    for (let i = 0; i < R.length; i++) {
      const a = R[(i - 1 + R.length) % R.length], b = R[i], c = R[(i + 1) % R.length];
      const L1 = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const L2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
      const t1 = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const t2 = Math.atan2(c[1] - b[1], c[0] - b[0]);
      let d = Math.abs(((t2 - t1 + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * 180 / Math.PI;
      if (L1 < minLen || L2 < minLen || d < tolDeg) {
        R.splice(i, 1);
        changed = true;
        break;
      }
    }
  }
  return R;
}

function main() {
  const img = readPng(IMG);
  const idx = SEG.colorIndex(img);
  const list = Object.values(SEG.figures(idx, img.w, img.h));
  let px = 0; list.forEach(f => { px += f.n; });
  const s = Math.sqrt(px / (10 * 16));
  console.log('1 单位 ≈', s.toFixed(3), 'px');

  const out = [];
  for (let g = 0; g < 10; g++) {
    const sub = list.filter(f => f.fig === g).sort((a, b) => b.n - a.n).slice(0, 7);
    if (sub.length !== 7) throw new Error('图案 ' + (g + 1) + ' 只找到 ' + sub.length + ' 块');

    let gx0 = 1e9, gy0 = 1e9;
    sub.forEach(f => { gx0 = Math.min(gx0, f.bx); gy0 = Math.min(gy0, f.by); });

    const raw = sub.map(f => {
      const r = FIT.fitPiece(f, s);
      return { n: f.n, color: SEG.HUES[f.color].key, per: r.per, bx: r.bx, by: r.by, mask: f };
    });
    const aoi = raw.map(r => { const o = {}; SHAPES.forEach(k => { o[k] = r.per[k].iou; }); return o; });
    const alloc = allocate(aoi);
    if (!alloc) throw new Error('图案 ' + (g + 1) + ' 形状指派失败');

    const fits = raw.map((r, i) => {
      const shape = alloc.asg[i];
      const c = r.per[shape];
      return {
        key: shape, ang: c.ang, fl: c.fl, iou: c.iou, n: r.n, color: r.color,
        cx: (r.bx + c.cx - gx0) / s,
        cy: (r.by + c.cy - gy0) / s,
        mask: r.mask
      };
    });

    /* 板 id：两块大三角 → T1/T2，两块小三角 → T4/T5 */
    const big = fits.filter(f => f.key === 'T1').sort((a, b) => b.n - a.n);
    const small = fits.filter(f => f.key === 'T4').sort((a, b) => b.n - a.n);
    if (big.length !== 2 || small.length !== 2) {
      throw new Error('图案 ' + (g + 1) + ' 大/小三角数量不对：大 ' + big.length + ' 小 ' + small.length);
    }
    const idOf = new Map();
    idOf.set(big[0], 'T1'); idOf.set(big[1], 'T2');
    idOf.set(small[0], 'T4'); idOf.set(small[1], 'T5');
    fits.forEach(f => { if (!idOf.has(f)) idOf.set(f, f.key); });

    /* 板多边形（base 单位）。位置一律不动 —— 拟合已经准到 0.03 单位 */
    let polys = fits.map(f => FIT.LOCAL[f.key].map(v => {
      const q = FIT.rot(v, f.ang, f.fl);
      return [q[0] + f.cx, q[1] + f.cy];
    }));

    /* 连通性修补：浮空的板挪过去贴住（位移通常 < 0.1 单位） */
    const TOL = 0.12;
    const before = polys.map(p => p[0].slice());
    const stl = settle(polys, fits.map(f => f.mask), s, gx0, gy0, { tol: TOL, r: 0.36, step: 0.04, rounds: 4 });
    polys = stl.polys;
    let maxMove = 0;
    polys.forEach((p, i) => {
      maxMove = Math.max(maxMove, Math.hypot(p[0][0] - before[i][0], p[0][1] - before[i][1]));
    });

    /* 精确并集轮廓（tol 0.12 = 把 0.12 单位以内的顶点抖动焊掉） */
    const loops = UNION.unionPolys(polys, TOL);
    const sp = UNION.splitLoops(loops, polys);
    const sumA = polys.reduce((a, p) => a + areaOf(p), 0);
    const outA = areaOf(sp.outer) - (sp.holes || []).reduce((a, h) => a + areaOf(h), 0);

    let maxOv = 0;
    for (let i = 0; i < polys.length; i++) {
      for (let j = i + 1; j < polys.length; j++) {
        const ov = G.convexOverlapArea(polys[i], polys[j]);
        if (ov > maxOv) maxOv = ov;
      }
    }

    const outline = cleanRing(sp.outer.map(v => [r3(v[0]), r3(v[1])]), 0.16, 1.2);
    const holes = (sp.holes || []).map(h => cleanRing(h.map(v => [r3(v[0]), r3(v[1])]), 0.16, 1.2));

    const pieces = fits.map((f, i) => {
      const c = G.centroid(polys[i]);
      return {
        id: idOf.get(f),
        x: Math.round(c[0] * U * 100) / 100,
        y: Math.round(c[1] * U * 100) / 100,
        angle: f.ang, flipped: f.fl
      };
    });

    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    outline.forEach(v => { x0 = Math.min(x0, v[0]); y0 = Math.min(y0, v[1]); x1 = Math.max(x1, v[0]); y1 = Math.max(y1, v[1]); });

    const avgIoU = fits.reduce((a, f) => a + f.iou, 0) / 7;
    out.push({
      name: NAMES[g].name, tip: NAMES[g].tip,
      pieces, outline, holes,
      meta: { gx0: r3(gx0), gy0: r3(gy0), scale: r3(s) },
      quality: {
        areaErrPct: r3((outA - sumA) / sumA * 100),
        maxOverlap: r3(maxOv),
        loops: loops.length,
        points: outline.length,
        width: r3((x1 - x0) * U), height: r3((y1 - y0) * U),
        knitMove: r3(maxMove * U),
        avgIoU: r3(avgIoU),
        minIoU: r3(Math.min.apply(null, fits.map(f => f.iou)))
      }
    });

    console.log(('图案 ' + (g + 1) + ' ' + NAMES[g].name).padEnd(11),
      '宽高 ' + (x1 - x0).toFixed(1) + '×' + (y1 - y0).toFixed(1),
      '点 ' + String(outline.length).padStart(2),
      '环 ' + loops.length,
      '面积差 ' + ((outA - sumA) / sumA * 100).toFixed(2) + '%',
      '压叠 ' + maxOv.toFixed(3),
      '修补位移 ' + maxMove.toFixed(3) + 'u',
      'IoU 均 ' + avgIoU.toFixed(3) + ' 最差 ' + Math.min.apply(null, fits.map(f => f.iou)).toFixed(3));
  }

  const file = path.join(__dirname, 'dancers_exact.json');
  fs.writeFileSync(file, JSON.stringify(out, null, 1));
  console.log('写出', file);
}

main();
