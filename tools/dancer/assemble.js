/* 舞者关卡反解 · 第 3 步：精确贴边装配（束搜索）
 * ==================================================================
 * 为什么必须自己做这一步
 * ----------------------
 * 「从像素拟合位置」永远差那么一点点。照抄进关卡，轮廓上就是一条条「本该笔直却错开
 * 几格」的台阶 —— v0.52 龙尾、v0.63 Y 竖干两次返工，根因都是这个。
 *
 * 量化指标（拿现有 57 关对照过，可以当验收线）：
 *   几何章（求解器枚举生成）：10~12 个顶点簇里 8~9 个被两块以上板精确共用（67~90%）
 *   生肖章（图像反解生成）：20 个簇里只剩 1~3 个共用（5~15%）—— 就是有瑕疵的那批
 * 目标：做到 70% 以上。
 *
 * 做法
 * ----
 * 角度与翻面沿用拟合值（8 个 45° 角 x 2 翻面里选过，可信），只解平移，且平移只允许落在
 * 「与已落位板的某条边共线、并把某个顶点精确对齐到已落位顶点」的位置上。于是新板坐标 =
 * 已落位板顶点 + 整数个边长向量，两块板共用边端点完全重合，缝和台阶一次性消失。
 *
 * 两个关键工程点（都是踩过坑才加的）
 * --------------------------------
 * (1) 打分不能用「与自身颜色掩码的 IoU」：板是**叠着画**的，被压在下面的块只剩一个碎片，
 *     拿碎片当目标会把板往里缩。改用「板面积有多少落在整幅剪影内（inside）」+
 *     「自身颜色碎片有多少被这块板盖住（cover）」两项。剪影可靠，颜色碎片只用来定位。
 * (2) 落位顺序必须跟着「颜色块在图上是否贴着」走（BFS），不能按面积排。按面积排会让误差
 *     沿链条一路漂走。
 */
'use strict';
const path = require('path');
require(path.join(__dirname, '..', '..', 'js', 'geom.js'));
const G = globalThis.TANGRAM_GEOM;

const DEG = Math.PI / 180;
function rot(v, a, f) {
  const r = a * DEG, ca = Math.cos(r), sa = Math.sin(r);
  const x = v[0] * (f ? -1 : 1), y = v[1];
  return [x * ca - y * sa, x * sa + y * ca];
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, s) => [a[0] * s, a[1] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const len = a => Math.hypot(a[0], a[1]);
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];

function areaOf(p) {
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(s) / 2;
}
function inPoly(px, py, P) {
  let inside = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const xi = P[i][0], yi = P[i][1], xj = P[j][0], yj = P[j][1];
    if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function clash(pts, others) {
  for (const Q of others) if (G.convexOverlapArea(pts, Q) > 1e-3) return true;
  return false;
}

/* ---------- 整幅剪影（所有颜色块的并集） ---------- */
function buildSil(fits, pad) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  fits.forEach(f => {
    x0 = Math.min(x0, f.mask.bx); y0 = Math.min(y0, f.mask.by);
    x1 = Math.max(x1, f.mask.bx + f.mask.bw); y1 = Math.max(y1, f.mask.by + f.mask.bh);
  });
  pad = pad || 4;
  const ox = x0 - pad, oy = y0 - pad, W = x1 - x0 + pad * 2, H = y1 - y0 + pad * 2;
  const raw = new Uint8Array(W * H);
  fits.forEach(f => {
    for (let y = 0; y < f.mask.bh; y++) {
      for (let x = 0; x < f.mask.bw; x++) {
        if (f.mask.mask[y * f.mask.bw + x]) raw[(y + f.mask.by - oy) * W + (x + f.mask.bx - ox)] = 1;
      }
    }
  });
  return { raw, W, H, ox, oy };
}

/* 板的落位质量：inside（落在剪影内的板面积比例）x 6 + cover（自身颜色被盖住比例）x 4 */
function makeScorer(sil, s, stride, fox, foy) {
  const raw = sil.raw, W = sil.W, H = sil.H;
  /* 板坐标 -> 剪影栅格下标：先回到图片像素（p*s + fox），再减去栅格原点 */
  const ox = fox - sil.ox, oy = foy - sil.oy;
  const dil = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!raw[y * W + x]) continue;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < W && yy < H) dil[yy * W + xx] = 1;
        }
      }
    }
  }
  return function score(pts, own) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    pts.forEach(p => { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); });
    x0 = Math.floor(x0 * s + ox); y0 = Math.floor(y0 * s + oy);
    x1 = Math.ceil(x1 * s + ox); y1 = Math.ceil(y1 * s + oy);
    let inN = 0, allN = 0;
    for (let y = y0; y < y1; y += stride) {
      for (let x = x0; x < x1; x += stride) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        if (!inPoly((x - ox + 0.5) / s, (y - oy + 0.5) / s, pts)) continue;
        allN++;
        if (dil[y * W + x]) inN++;
      }
    }
    const inside = allN ? inN / allN : 0;
    let cov = 0;
    if (own && own.length) {
      let c = 0;
      for (const q of own) if (inPoly(q[0], q[1], pts)) c++;
      cov = c / own.length;
    }
    return { inside, cov, sc: inside * 6 + cov * 4 };
  };
}

/* 颜色块采样（图片像素 -> base 单位） */
function ownSamples(mask, s, ox, oy, stride) {
  const out = [];
  for (let y = 0; y < mask.bh; y += stride) {
    for (let x = 0; x < mask.bw; x += stride) {
      if (mask.mask[y * mask.bw + x]) out.push([(mask.bx + x + 0.5 - ox) / s, (mask.by + y + 0.5 - oy) / s]);
    }
  }
  return out;
}

/* ---------- 颜色块相邻图 ---------- */
function buildAdj(fits, tol) {
  const sets = fits.map(f => {
    const st = new Set();
    for (let y = 0; y < f.mask.bh; y++) {
      for (let x = 0; x < f.mask.bw; x++) {
        if (f.mask.mask[y * f.mask.bw + x]) st.add((y + f.mask.by) * 4096 + (x + f.mask.bx));
      }
    }
    return st;
  });
  const n = fits.length, A = [];
  for (let i = 0; i < n; i++) A.push(new Array(n).fill(false));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      let hit = false;
      for (const k of sets[i]) {
        const y = Math.floor(k / 4096), x = k % 4096;
        for (let dy = -tol; dy <= tol && !hit; dy++) {
          for (let dx = -tol; dx <= tol; dx++) {
            if (sets[j].has((y + dy) * 4096 + (x + dx))) { hit = true; break; }
          }
        }
        if (hit) break;
      }
      A[i][j] = A[j][i] = hit;
    }
  }
  return A;
}

/* ---------- 候选：与已落位板共线 + 顶点精确对齐 ---------- */
function candidates(me, polys, R) {
  const V = [];
  polys.forEach(P => P.forEach(v => V.push(v)));
  const Pb = me.base;
  const uW = Pb.map(v => add(v, me.t0));
  const out = [], seen = new Set();
  for (const P of polys) {
    for (let pi = 0; pi < P.length; pi++) {
      const a = P[pi], b = P[(pi + 1) % P.length];
      const dAB = sub(b, a), LAB = len(dAB);
      if (LAB < 1e-9) continue;
      const uAB = mul(dAB, 1 / LAB), nrm = [-uAB[1], uAB[0]];
      for (let qi = 0; qi < Pb.length; qi++) {
        const u = uW[qi], v = uW[(qi + 1) % Pb.length];
        const dUV = sub(v, u), LUV = len(dUV);
        if (LUV < 1e-9) continue;
        if (Math.abs(cross(uAB, mul(dUV, 1 / LUV))) > 1e-6) continue;
        const flat = mul(nrm, -dot(sub(u, a), nrm));
        for (const qq of V) {
          const pu = add(u, flat);
          const d = add(flat, mul(uAB, dot(sub(qq, pu), uAB)));
          if (len(d) > R) continue;
          const key = Math.round(d[0] * 1e4) + ',' + Math.round(d[1] * 1e4);
          if (seen.has(key)) continue;
          seen.add(key);
          out.push({ d, LAB, a, b, uAB });
        }
      }
    }
  }
  return out;
}

function flushLen(pts, a, b, uAB, LAB) {
  let lo = 1e9, hi = -1e9;
  for (const p of pts) {
    const q = dot(sub(p, a), uAB) / LAB;
    if (q < lo) lo = q;
    if (q > hi) hi = q;
  }
  return Math.max(0, Math.min(1, hi) - Math.max(0, lo)) * LAB;
}

/* ---------- 装配 ----------
 * 坑：从「最大块」起步、按 BFS 一块一块接，第一步就可能接不上 —— 前两块经常只在一个
 * 角上相邻（没有平行共线的边），于是第一块被扔回拟合位，后面全跟着错。
 * 改法：
 *   1) 先枚举所有「两块能精确贴边」的组合，挑一对打分最高的当种子；
 *   2) 之后每步从还没落位的块里挑「怎么接打分最高」的那块接上去；
 *   3) 最后把没能贴上的块并回主簇（整体平移对齐）。
 */
function assemble(fits, LOCAL, opt) {
  const s = opt.s, ox = opt.ox, oy = opt.oy;
  const R = opt.R || 1.6;
  const minFlush = opt.minFlush || 0.3;
  const sil = buildSil(fits);
  const scoreFn = makeScorer(sil, s, opt.stride || 2, ox, oy);
  const items = fits.map((f, i) => {
    const base = LOCAL[f.key].map(v => rot(v, f.ang, f.fl));
    return {
      idx: i, key: f.key, ang: f.ang, fl: f.fl, mask: f.mask, src: f, base,
      t0: [f.cx, f.cy], A: areaOf(base),
      own: ownSamples(f.mask, s, ox, oy, 3)
    };
  });
  const ADJ = buildAdj(fits, opt.tol || 3);

  /* 每块在自己的拟合位上的基础分 */
  items.forEach(it => {
    const pts = it.base.map(v => add(v, it.t0));
    it.pts = pts;
    it.q = scoreFn(pts, it.own);
    it.base_sc = it.q.sc - 3 * 0;   /* 位移为 0 */
  });

  const state = {
    placed: [],            // item
    ts: [],                // 各自位移（base 单位）
    polys: [],
    score: 0,
    log: []
  };

  /* ---- 1) 种子：枚举所有两块组合 ---- */
  let seed = null;
  for (let i = 0; i < items.length; i++) {
    for (let j = 0; j < items.length; j++) {
      if (i === j) continue;
      const me = items[j], host = items[i];
      const cs = candidates(me, [host.pts], R);
      for (const c of cs) {
        const pts = me.base.map(v => add(v, add(me.t0, c.d)));
        if (clash(pts, [host.pts])) continue;
        const ov = flushLen(pts, c.a, c.b, c.uAB, c.LAB);
        if (ov < minFlush) continue;
        const q = scoreFn(pts, me.own);
        if (q.inside < 0.985) continue;
        const total = host.base_sc + q.sc + ov * 1.0 - 2 * len(c.d);
        if (!seed || total > seed.total) seed = { total, i, j, d: c.d, pts, q, ov, moved: len(c.d) };
      }
    }
  }
  if (!seed) return null;

  state.placed = [items[seed.i], items[seed.j]];
  state.ts = [[0, 0], seed.d];
  state.polys = [items[seed.i].pts, seed.pts];
  state.score = seed.total;
  state.log = [
    { key: items[seed.i].key, moved: 0, ov: 0, inside: items[seed.i].q.inside, cov: items[seed.i].q.cov },
    { key: items[seed.j].key, moved: seed.moved, ov: seed.ov, inside: seed.q.inside, cov: seed.q.cov }
  ];

  /* ---- 2) 逐步接入：每次挑「怎么接分最高」的那块 ---- */
  const left = items.filter(it => it !== items[seed.i] && it !== items[seed.j]);
  const stats = [];
  while (left.length) {
    let best = null;
    for (let li = 0; li < left.length; li++) {
      const me = left[li];
      const cs = candidates(me, state.polys, R);
      let b2 = null, nClash = 0, nFew = 0, minMoved = 9;
      for (const c of cs) {
        const mv = len(c.d);
        if (mv < minMoved) minMoved = mv;
        const pts = me.base.map(v => add(v, add(me.t0, c.d)));
        if (clash(pts, state.polys)) { nClash++; continue; }
        const ov = flushLen(pts, c.a, c.b, c.uAB, c.LAB);
        if (ov < minFlush) { nFew++; continue; }
        const q = scoreFn(pts, me.own);
        if (q.inside < 0.985) continue;
        const total = q.sc + ov * 1.0 - 2 * mv;
        if (!b2 || total > b2.total) b2 = { total, d: c.d, pts, q, ov, moved: mv };
      }
      stats.push({ key: me.key, cand: cs.length, clash: nClash, few: nFew, minMoved: +minMoved.toFixed(2), hit: !!b2 });
      if (b2 && (!best || b2.total > best.total)) best = { me, li, ...b2 };
    }
    if (!best) break;                     // 剩下的都接不上，留到最后处理
    state.placed.push(best.me);
    state.ts.push(best.d);
    state.polys.push(best.pts);
    state.score += best.total;
    state.log.push({ key: best.me.key, moved: best.moved, ov: best.ov, inside: best.q.inside, cov: best.q.cov });
    left.splice(best.li, 1);
  }
  module.exports.stats = stats;

  /* ---- 3) 兜底：接不上的块整体平移到「既在剪影内、又尽量贴着已有板」的位置 ---- */
  for (const me of left) {
    let b3 = null;
    const base = me.base.map(v => add(v, me.t0));
    for (let gx = -12; gx <= 12; gx++) {
      for (let gy = -12; gy <= 12; gy++) {
        const d = [gx * 0.1, gy * 0.1];
        if (Math.hypot(d[0], d[1]) > 1.6) continue;
        const pts = me.base.map(v => add(v, add(me.t0, d)));
        if (clash(pts, state.polys)) continue;
        const q = scoreFn(pts, me.own);
        if (q.inside < 0.985) continue;
        const total = q.sc - 2 * Math.hypot(d[0], d[1]);
        if (!b3 || total > b3.total) b3 = { total, d, pts, q };
      }
    }
    const d = b3 ? b3.d : [0, 0];
    const pts = me.base.map(v => add(v, add(me.t0, d)));
    const q = b3 ? b3.q : me.q;
    state.placed.push(me);
    state.ts.push(d);
    state.polys.push(pts);
    state.score += b3 ? b3.total : me.base_sc;
    state.log.push({ key: me.key, moved: Math.hypot(d[0], d[1]), ov: 0, inside: q.inside, cov: q.cov });
    me.loose = true;
  }

  return state.placed.map((it, i) => ({
    key: it.key, ang: it.ang, fl: it.fl,
    x: it.t0[0] + state.ts[i][0], y: it.t0[1] + state.ts[i][1],
    pts: state.polys[i], src: it.src, q: state.log[i],
    loose: !!it.loose, score: state.score
  }));
}

module.exports.assemble = assemble;
module.exports.buildAdj = buildAdj;
module.exports.buildSil = buildSil;
module.exports.rot = rot;
module.exports.areaOf = areaOf;
module.exports.inPoly = inPoly;
