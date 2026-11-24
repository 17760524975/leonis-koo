/* 参考图 → 26 个七巧板字母的严格解（a 格）
 *
 * 【坐标系】参考图里的字母是「正立」的：竖笔水平笔都是横平竖直，所以板的直角边落在
 * 0/90°，斜边落在 45°。取 a = 小三角的直角边长（也是正方形边长、平行四边形的短边），
 * 此时 5 种板的顶点全是整数：
 *     大三角 T1: (0,0)(2,0)(0,2)      面积 2
 *     中三角 T3: (0,0)(2,0)(1,1)      面积 1
 *     正方形 S : (0,0)(1,0)(1,1)(0,1) 面积 1
 *     小三角 T4: (0,0)(1,0)(0,1)      面积 0.5
 *     平行四边形 P: (0,0)(1,0)(2,1)(1,1) 面积 1
 *   面积合计 8a²（= 16u²，u = a/√2 是游戏里的 unitScale 单位）。
 *   这样「顶点必须落在整数格」就把 u/a、平移、朝向全部锁死了。
 *
 * 【形状识别】凸包是像素台阶，用顶点配对会选错角点；改成把候选板型栅格…不，用
 * 解析 IoU（凸-凸裁剪，无数值误差）比「候选形状 vs 凸包」，面积档由像素面积比定。
 *
 * 【到游戏坐标】游戏里 u = 96px，世界顶点 = R(θ)·F·base + (x,y)，θ 是 45 的倍数。
 *   a = u√2 ⇒ 游戏像素 = a 单位 × 96√2。θ 由「a 格形状 ↔ 模板旋转」反查。
 *
 * 用法：node tools/letters7/solve.js
 * 产出：tools/letters7/solved.json
 */
'use strict';
const fs = require('fs');
const path = require('path');
const HERE = __dirname;

/* a 格模板：id / 面积 / 基型 */
const SHAPE = {
  L: { area: 2, base: [[0, 0], [2, 0], [0, 2]] },          // 大三角
  M: { area: 1, base: [[0, 0], [2, 0], [1, 1]] },          // 中三角
  Q: { area: 1, base: [[0, 0], [1, 0], [1, 1], [0, 1]] },  // 正方形
  S: { area: 0.5, base: [[0, 0], [1, 0], [0, 1]] },        // 小三角
  R: { area: 1, base: [[0, 0], [1, 0], [2, 1], [1, 1]] }   // 平行四边形
};
const GAME_ID = { L: 'T1', M: 'T3', Q: 'S', S: 'T4', R: 'P' };
/* 游戏里每种板的基型（u 单位），见 js/levels.js DATA7.pieces */
const GAME_BASE = {
  T1: [[0, 0], [4, 0], [2, 2]],
  T2: [[0, 0], [4, 0], [2, 2]],
  T3: [[0, 0], [2, 0], [0, 2]],
  S: [[1, 0], [2, 1], [1, 2], [0, 1]],
  T4: [[0, 0], [2, 0], [1, 1]],
  T5: [[0, 0], [2, 0], [1, 1]],
  P: [[1, 0], [3, 0], [2, 1], [0, 1]]
};
const UNIT = 96;                 // js/levels.js DATA7.unitScale
const A_GAME = UNIT * Math.SQRT2; // a 在游戏像素里的大小 ≈ 135.76

/* ---------------- 几何 ---------------- */
function sArea(p) {
  let a = 0;
  for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; }
  return a / 2;
}
const absArea = p => Math.abs(sArea(p));
const ccw = p => (sArea(p) < 0 ? p.slice().reverse() : p.slice());
function centroid(poly) {
  const P = ccw(poly);
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < P.length; i++) {
    const q = P[(i + 1) % P.length], cr = P[i][0] * q[1] - q[0] * P[i][1];
    a += cr; cx += (P[i][0] + q[0]) * cr; cy += (P[i][1] + q[1]) * cr;
  }
  a /= 2;
  return [cx / (6 * a), cy / (6 * a)];
}
function rot(p, deg) {
  const a = deg * Math.PI / 180, c = Math.round(Math.cos(a) * 1e9) / 1e9, s = Math.round(Math.sin(a) * 1e9) / 1e9;
  return p.map(v => [v[0] * c - v[1] * s, v[0] * s + v[1] * c]);
}
function bbox(p) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const v of p) { x0 = Math.min(x0, v[0]); x1 = Math.max(x1, v[0]); y0 = Math.min(y0, v[1]); y1 = Math.max(y1, v[1]); }
  return [x0, y0, x1, y1];
}
function clipConvex(a, b) {
  let out = ccw(a).slice();
  const B = ccw(b);
  for (let i = 0; i < B.length && out.length; i++) {
    const p1 = B[i], p2 = B[(i + 1) % B.length];
    const side = v => (p2[0] - p1[0]) * (v[1] - p1[1]) - (p2[1] - p1[1]) * (v[0] - p1[0]);
    const inp = out; out = [];
    for (let j = 0; j < inp.length; j++) {
      const cur = inp[j], nxt = inp[(j + 1) % inp.length];
      const sc = side(cur), sn = side(nxt);
      if (sc >= -1e-12) out.push(cur);
      if ((sc > 1e-12 && sn < -1e-12) || (sc < -1e-12 && sn > 1e-12)) {
        const t = sc / (sc - sn);
        out.push([cur[0] + (nxt[0] - cur[0]) * t, cur[1] + (nxt[1] - cur[1]) * t]);
      }
    }
  }
  return out;
}
function iou(A, B) {
  const c = clipConvex(A, B);
  const inter = c.length >= 3 ? absArea(c) : 0;
  const uni = absArea(A) + absArea(B) - inter;
  return uni > 0 ? inter / uni : 0;
}

/* 形状识别（面积档内选板型 + 4 个直角朝向 + 手性） */
function classify(hull, areaClass) {
  const cH = centroid(hull), aH = absArea(hull);
  let best = null;
  for (const key in SHAPE) {
    const t = SHAPE[key];
    if (Math.abs(t.area - areaClass) > 1e-6) continue;
    const flips = key === 'R' ? [false, true] : [false];
    for (const flip of flips) {
      for (let k = 0; k < 4; k++) {
        const base = flip ? t.base.map(v => [-v[0], v[1]]) : t.base;
        const sh = rot(base, k * 90);
        const cS = centroid(sh);
        const sc = Math.sqrt(aH / t.area);
        const placed = sh.map(v => [cH[0] + (v[0] - cS[0]) * sc, cH[1] + (v[1] - cS[1]) * sc]);
        const q = iou(placed, hull);
        if (!best || q > best.iou) best = { key, k, flip, sc, iou: q, cH, cS, shape: ccw(sh) };
      }
    }
  }
  return best;
}

/* 边抵消求并集外轮廓（顶点全在整数格上，所以是精确的） */
function key2(a, b) {
  const A = a[0] + ',' + a[1], B = b[0] + ',' + b[1];
  return A < B ? A + '|' + B : B + '|' + A;
}
function ringsOf(polys) {
  // 先把所有顶点收集起来，用于把边切段（一块的边可能跨过另一块的顶点）
  const verts = [];
  for (const p of polys) for (const v of p) verts.push(v);
  const raw = [];
  for (const poly of polys) {
    const n = poly.length;
    for (let i = 0; i < n; i++) {
      const a = poly[i], b = poly[(i + 1) % n];
      const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
      const ts = [0, 1];
      for (const v of verts) {
        if ((v[0] === a[0] && v[1] === a[1]) || (v[0] === b[0] && v[1] === b[1])) continue;
        const cr = (b[0] - a[0]) * (v[1] - a[1]) - (b[1] - a[1]) * (v[0] - a[0]);
        if (Math.abs(cr) > 1e-9) continue;
        const t = ((v[0] - a[0]) * dx + (v[1] - a[1]) * dy) / L2;
        if (t > 1e-9 && t < 1 - 1e-9) ts.push(t);
      }
      ts.sort((m, n2) => m - n2);
      for (let k = 0; k + 1 < ts.length; k++) {
        raw.push([[+(a[0] + dx * ts[k]).toFixed(6), +(a[1] + dy * ts[k]).toFixed(6)],
          [+(a[0] + dx * ts[k + 1]).toFixed(6), +(a[1] + dy * ts[k + 1]).toFixed(6)]]);
      }
    }
  }
  const cnt = {};
  for (const e of raw) { const k = key2(e[0], e[1]); cnt[k] = (cnt[k] || 0) + 1; }
  const boundary = raw.filter(e => cnt[key2(e[0], e[1])] === 1);
  const outMap = {};
  const vk = v => v[0] + ',' + v[1];
  for (const e of boundary) (outMap[vk(e[0])] = outMap[vk(e[0])] || []).push(e);
  const used = new Set(), loops = [];
  for (const e0 of boundary) {
    if (used.has(key2(e0[0], e0[1]))) continue;
    const loop = [];
    let cur = e0, ok = false;
    for (let guard = 0; guard <= boundary.length + 4; guard++) {
      loop.push(cur[0]);
      used.add(key2(cur[0], cur[1]));
      const outs = (outMap[vk(cur[1])] || []).filter(x => !used.has(key2(x[0], x[1])));
      if (!outs.length) { ok = vk(cur[1]) === vk(loop[0]); break; }
      cur = outs[0];
      if (vk(cur[1]) === vk(loop[0])) { used.add(key2(cur[0], cur[1])); ok = true; break; }
    }
    if (ok && loop.length >= 3) loops.push(loop);
  }
  // 去共线点
  return loops.map(loop => {
    const out = [];
    for (let i = 0; i < loop.length; i++) {
      const a = loop[(i - 1 + loop.length) % loop.length], b = loop[i], c = loop[(i + 1) % loop.length];
      const cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
      if (Math.abs(cr) > 1e-9) out.push(b);
    }
    return out.length >= 3 ? out : loop;
  });
}

/* ---------------- 主流程 ---------------- */
const data = JSON.parse(fs.readFileSync(path.join(HERE, 'pieces.json'), 'utf8'));
const out = [];
let bad = 0;

for (const rec of data) {
  const ps = rec.pieces.slice().sort((a, b) => b.n - a.n).slice(0, 7);
  const totPx = ps.reduce((a, x) => a + x.n, 0);
  const a0 = Math.sqrt(totPx / 8);                 // a 的粗估（像素）
  const areaClass = ps.map(p => {
    const r = p.n / (a0 * a0);
    return [0.5, 1, 2].reduce((x, y) => (Math.abs(y - r) < Math.abs(x - r) ? y : x));
  });
  const fits = ps.map((p, i) => classify(ccw(p.hull), areaClass[i]));
  const okCls = areaClass.slice().sort().join(',') === '0.5,0.5,1,1,1,2,2';
  const cntKey = {};
  fits.forEach(f => { cntKey[f.key] = (cntKey[f.key] || 0) + 1; });
  const okIds = cntKey.L === 2 && cntKey.S === 2 && cntKey.M === 1 && cntKey.Q === 1 && cntKey.R === 1;

  /* a 与格点相位：顶点 / a 应全是整数 */
  const vertsAt = a => fits.map(f => f.shape.map(v => [
    f.cH[0] + (v[0] - f.cS[0]) * a, f.cH[1] + (v[1] - f.cS[1]) * a]));
  const wrap1 = x => x - Math.round(x);
  const phaseOf = vals => {
    let sx = 0, sy = 0;
    for (const v of vals) { const t = v * 2 * Math.PI; sx += Math.cos(t); sy += Math.sin(t); }
    const t = Math.atan2(sy, sx) / (2 * Math.PI);
    return t - Math.round(t);
  };
  const resAt = a => {
    const V = vertsAt(a).flat();
    const px = phaseOf(V.map(v => v[0] / a)), py = phaseOf(V.map(v => v[1] / a));
    let s = 0;
    for (const v of V) s += Math.max(Math.abs(wrap1(v[0] / a - px)), Math.abs(wrap1(v[1] / a - py)));
    return { res: s / V.length, px, py };
  };
  let bestA = null;
  for (let a = a0 * 0.96; a <= a0 * 1.05; a += a0 * 0.0002) {
    const r = resAt(a);
    if (!bestA || r.res < bestA.res) bestA = { a, ...r };
  }

  /* 吸附 → 反查模板摆放 */
  const keyOf = q => ccw(q).map(v => Math.round(v[0] * 1e5) + ',' + Math.round(v[1] * 1e5)).sort().join(';');
  const solved = [];
  let okExact = true, maxRes = 0;
  for (const [i, f] of fits.entries()) {
    const rawV = vertsAt(bestA.a)[i].map(v => [v[0] / bestA.a, v[1] / bestA.a]);
    const V = rawV.map(v => [Math.round(v[0] - bestA.px) + bestA.px, Math.round(v[1] - bestA.py) + bestA.py]);
    maxRes = Math.max(maxRes, ...rawV.map((v, k) => Math.hypot(v[0] - V[k][0], v[1] - V[k][1])));
    let hit = null;
    for (const key in SHAPE) {
      if (Math.abs(SHAPE[key].area - SHAPE[f.key].area) > 1e-9) continue;
      const flips = key === 'R' ? [false, true] : [false];
      for (const flip of flips) {
        const base = flip ? SHAPE[key].base.map(v => [-v[0], v[1]]) : SHAPE[key].base;
        for (let k = 0; k < 4; k++) {
          const sh = rot(base, k * 90).map(v => [+v[0].toFixed(6), +v[1].toFixed(6)]);
          if (sh.length !== V.length) continue;
          for (let off = 0; off < sh.length && !hit; off++) {
            const tx = Math.round(V[0][0] - sh[off][0]), ty = Math.round(V[0][1] - sh[off][1]);
            const got = sh.map(v => [v[0] + tx, v[1] + ty]);
            if (keyOf(got) === keyOf(V)) hit = { key, k, flip, verts: ccw(got), t: [tx, ty] };
          }
        }
      }
    }
    if (!hit) { okExact = false; solved.push(null); continue; }
    solved.push({ key: hit.key, k: hit.k, flip: hit.flip, verts: hit.verts });
  }

  /* 组装：外轮廓（含内孔）+ 校验 */
  let rings = [], overlap = 0;
  if (okExact) {
    const polys = solved.map(s => s.verts);
    rings = ringsOf(polys);
    const sumA = polys.reduce((s, p) => s + absArea(p), 0);
    // 两两重叠（凸-凸裁剪，精确）
    for (let i = 0; i < polys.length; i++) for (let j = i + 1; j < polys.length; j++) {
      const c = clipConvex(polys[i], polys[j]);
      if (c.length >= 3) overlap += absArea(c);
    }
    if (Math.abs(sumA - 8) > 1e-6 || Math.abs(overlap) > 1e-9) okExact = false;
  }
  const outer = rings.filter(r => absArea(r) > 0);
  const tag = (okCls && okIds && okExact) ? 'OK' : '✗';
  if (tag === '✗') bad++;
  console.log(rec.ch, tag,
    'a=' + bestA.a.toFixed(3),
    '面积档', okCls ? 'OK' : '✗' + areaClass.slice().sort().join(','),
    '板型', okIds ? 'OK' : '✗' + JSON.stringify(cntKey),
    '严格', okExact ? 'OK' : '✗',
    '残差', maxRes.toFixed(3),
    '环', rings.length, '最小IoU', Math.min(...fits.map(f => f.iou)).toFixed(3));
  out.push({ ch: rec.ch, a: bestA.a, cls: areaClass, solved, rings, okCls, okIds, okExact,
    minIou: Math.min(...fits.map(f => f.iou)), a0 });
}

fs.writeFileSync(path.join(HERE, 'solved.json'), JSON.stringify(out, null, 1));
console.log('\n失败', bad, '/', out.length, '→ solved.json');
