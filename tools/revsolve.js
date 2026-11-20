/* 目标式反解（临时工具，本轮一次）：把 T 当已知，解出 D = T − (A∪B∪C)
 * 用法：node tools/revsolve.js
 *
 * 思路：不猜 D。对每个面积恰好 6.0 的干净 T，枚举 A/B/C 在 T 内的合法落位
 *      （顶点锚定 + 沿边 0.5 步滑移，含镜像），把剩下的区域当 D 候选，
 *      再按主理人给的 7 条条件筛。
 * 关键：最后一块不枚举，用「剩余区域是否与它全等」直接判，省两个数量级。
 */
const E = require('./enumerate.js');
const { inPoly, distPtPolyEdge, area, bbox, r4, rotFlip, boundaryOf, simplify, unionOutline } = E;

/* 用 enumerate 的并集算法独立重建，确认四块拼起来正好是 T（不接受 diffRegion 的结论） */
function verifyTiling(qs, T) {
  const U = unionOutline(qs);
  if (U.length !== 1) return null;
  const u = simplify(U[0]);
  if (Math.abs(areaS(u) - areaS(T)) > 1e-4) return null;
  const key = p => p.map(v => (+v[0].toFixed(3)) + ',' + (+v[1].toFixed(3))).sort().join('|');
  if (u.length !== T.length) return null;
  if (key(u) !== key(T)) return null;
  return u;
}

const DEFS = {
  A: [[3, 0], [0, 0], [1, 1], [3, 1]],
  B: [[0, 1], [0, 0], [1, 1]],
  C: [[0, 0], [1.5, 0], [0.5, 1], [0, 1]]
};
const EPS = 1e-6;

/* ---------- 基础工具 ---------- */
const norm1 = v => Math.round(v * 1e6) / 1e6;
function normPoly(p) {
  let mnx = Infinity, mny = Infinity;
  for (const v of p) { mnx = Math.min(mnx, v[0]); mny = Math.min(mny, v[1]); }
  return p.map(v => [norm1(v[0] - mnx), norm1(v[1] - mny)]);
}
function sig(p) {
  // 平移不变签名：只用于「同一形状的不同朝向」去重
  const n = normPoly(p);
  return n.map(v => v[0].toFixed(4) + ',' + v[1].toFixed(4)).join(';');
}
function sigAbs(p) {
  // 绝对坐标签名：落位去重必须用这个（否则所有平移会被误判成同一个）
  return p.map(v => v[0].toFixed(4) + ',' + v[1].toFixed(4)).join(';');
}
function orientSet(poly) {
  const out = [], seen = new Set();
  for (let k = 0; k < 8; k++) for (const fl of [false, true]) {
    const p = poly.map(v => {
      const q = rotFlip(v, k * 45, fl);
      return [r4(q[0]), r4(q[1])];
    });
    // 去掉共线点
    const s = simplify(normPoly(p));
    if (s.length < 3) continue;
    const key = sig(s);
    if (!seen.has(key)) { seen.add(key); out.push(normPoly(s)); }
  }
  return out;
}
const P_ORI = { A: orientSet(DEFS.A), B: orientSet(DEFS.B), C: orientSet(DEFS.C) };

function sh(p) { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return a / 2; }
const areaS = p => Math.abs(sh(p));
function refCount(p) {
  const o = Math.sign(sh(p)); let r = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[(i - 1 + p.length) % p.length], b = p[i], c = p[(i + 1) % p.length];
    const cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (Math.sign(cr) !== o) r++;
  }
  return r;
}

/* 多边形是否落在区域里（顶点 + 边中点 + 质心都在区域内或边界上） */
function insideRegion(piece, region) {
  const pts = piece.slice();
  for (let i = 0; i < piece.length; i++) {
    const a = piece[i], b = piece[(i + 1) % piece.length];
    pts.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
    pts.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
    pts.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
  }
  let cx = 0, cy = 0;
  for (const v of piece) { cx += v[0]; cy += v[1]; }
  pts.push([cx / piece.length, cy / piece.length]);
  for (const q of pts) {
    if (distPtPolyEdge(q, region) < 1e-6) continue;   // 在边界上，允许
    if (!inPoly(q, region)) return false;
  }
  return true;
}

/* 区域差 R − P，返回环列表（已去共线点） */
function diffRegion(R, P) {
  const segs = [];
  for (let i = 0; i < R.length; i++) segs.push([R[i], R[(i + 1) % R.length]]);
  for (let i = 0; i < P.length; i++) segs.push([P[i], P[(i + 1) % P.length]]);
  const inside = pt => {
    if (distPtPolyEdge(pt, P) < 1e-9) return false;
    return inPoly(pt, R) && !inPoly(pt, P);
  };
  const loops = boundaryOf(segs, inside);
  return loops.map(l => simplify(l)).filter(l => l.length >= 3);
}

/* 枚举 piece 在 region 内、且贴住 region 边界的全部落位 */
function placements(oris, region, step) {
  const out = [];
  const seen = new Set();
  const nv = region.length;
  for (const o of oris) {
    const m = o.length;
    // (1) 顶点锚定：piece 顶点 i ↔ region 顶点 j
    for (let i = 0; i < m; i++) for (let j = 0; j < nv; j++) {
      const t = [region[j][0] - o[i][0], region[j][1] - o[i][1]];
      tryAdd(o, t);
    }
    // (2) 沿 region 边滑移：piece 边 i 与 region 边 j 共线且同向
    for (let j = 0; j < nv; j++) {
      const a = region[j], b = region[(j + 1) % nv];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 1e-9) continue;
      const dx = (b[0] - a[0]) / len, dy = (b[1] - a[1]) / len;
      for (let i = 0; i < m; i++) {
        const p0 = o[i], p1 = o[(i + 1) % m];
        const ev = [p1[0] - p0[0], p1[1] - p0[1]];
        const el = Math.hypot(ev[0], ev[1]);
        if (Math.abs(ev[0] * dy - ev[1] * dx) > 1e-6) continue;   // 不平行
        if (el > len + 1e-9) continue;
        for (let s = 0; s + el <= len + 1e-9; s += step) {
          tryAdd(o, [a[0] + dx * s - p0[0], a[1] + dy * s - p0[1]]);
        }
      }
    }
  }
  function tryAdd(o, t) {
    const p = o.map(v => [r4(v[0] + t[0]), r4(v[1] + t[1])]);
    const key = sigAbs(p);
    if (seen.has(key)) return;
    seen.add(key);
    if (!insideRegion(p, region)) return;
    out.push(p);
  }
  return out;
}

/* 两块多边形是否全等（边长多重集 + 内角多重集 + 面积） */
function edgeSet(p) {
  const a = [];
  for (let i = 0; i < p.length; i++) {
    const b = p[(i + 1) % p.length];
    a.push(Math.hypot(b[0] - p[i][0], b[1] - p[i][1]));
  }
  return a.sort((x, y) => x - y).map(v => v.toFixed(4));
}
function angleSet(p) {
  const a = [];
  const o = Math.sign(sh(p));
  for (let i = 0; i < p.length; i++) {
    const pr = p[(i - 1 + p.length) % p.length], b = p[i], nx = p[(i + 1) % p.length];
    const u = [b[0] - pr[0], b[1] - pr[1]], v = [nx[0] - b[0], nx[1] - b[1]];
    let ang = Math.atan2(u[0] * v[1] - u[1] * v[0], u[0] * v[0] + u[1] * v[1]) * 180 / Math.PI;
    // 内角：逆时针多边形内角 = 180 − 转角
    let inner = 180 - ang;
    if (inner < 0) inner += 360;
    a.push(Math.round(inner * 100) / 100);
  }
  return a.sort((x, y) => x - y).map(v => v.toFixed(2));
}
function congruent(p, q) {
  if (p.length !== q.length) return false;
  if (Math.abs(areaS(p) - areaS(q)) > 1e-4) return false;
  const ep = edgeSet(p), eq = edgeSet(q);
  const ap = angleSet(p), aq = angleSet(q);
  for (let i = 0; i < ep.length; i++) if (ep[i] !== eq[i]) return false;
  for (let i = 0; i < ap.length; i++) if (ap[i] !== aq[i]) return false;
  return true;
}

/* ---------- D 候选的 7 条筛选 ---------- */
const LEN_ABC = {};
for (const id of ['A', 'B', 'C']) {
  const p = DEFS[id];
  for (let i = 0; i < p.length; i++) {
    const b = p[(i + 1) % p.length];
    const k = Math.hypot(b[0] - p[i][0], b[1] - p[i][1]).toFixed(4);
    LEN_ABC[k] = (LEN_ABC[k] || 0) + 1;
  }
}
function checkD(D) {
  const why = [];
  if (D.length < 5 || D.length > 7) why.push('顶点数 ' + D.length);
  if (refCount(D) !== 1) why.push('凹角数 ' + refCount(D));
  // 边：轴对齐或 45°/135°，长度可配对
  const lens = {};
  for (let i = 0; i < D.length; i++) {
    const a = D[i], b = D[(i + 1) % D.length];
    const dx = Math.abs(b[0] - a[0]), dy = Math.abs(b[1] - a[1]);
    const L = Math.hypot(dx, dy);
    const axis = dx < 1e-6 || dy < 1e-6;
    const diag = Math.abs(dx - dy) < 1e-6;
    if (!axis && !diag) { why.push('边不是 45° 格点'); break; }
    if (diag && Math.abs(L - Math.SQRT2) > 1e-4) { why.push('斜边长度 ' + L.toFixed(4)); break; }
    const k = L.toFixed(4);
    lens[k] = (lens[k] || 0) + 1;
  }
  let pairable = true;
  for (const k in lens) {
    const have = lens[k], abc = LEN_ABC[k] || 0;
    if (have > abc) pairable = false;
  }
  if (!pairable) why.push('有边在 A/B/C 里配不上');
  const bb = bbox([D]);
  const w = bb[2] - bb[0], h = bb[3] - bb[1];
  if (w > 3.5 + 1e-6 || h > 3.0 + 1e-6) why.push(`bbox ${w.toFixed(2)}x${h.toFixed(2)}`);
  if (Math.abs(areaS(D) - 2.0) > 1e-6) why.push('面积 ' + areaS(D).toFixed(4));
  // 简单性：非相邻边不相交
  for (let i = 0; i < D.length; i++) for (let j = i + 2; j < D.length; j++) {
    if ((i === 0 && j === D.length - 1)) continue;
    if (segCross(D[i], D[(i + 1) % D.length], D[j], D[(j + 1) % D.length])) why.push('自相交');
  }
  return why;
}
function segCross(p1, p2, p3, p4) {
  const d = (p2[0] - p1[0]) * (p4[1] - p3[1]) - (p2[1] - p1[1]) * (p4[0] - p3[0]);
  if (Math.abs(d) < 1e-12) return false;
  const t = ((p3[0] - p1[0]) * (p4[1] - p3[1]) - (p3[1] - p1[1]) * (p4[0] - p3[0])) / d;
  const u = ((p3[0] - p1[0]) * (p2[1] - p1[1]) - (p3[1] - p1[1]) * (p2[0] - p1[0])) / d;
  return t > 1e-6 && t < 1 - 1e-6 && u > 1e-6 && u < 1 - 1e-6;
}

/* ---------- 枚举干净 T（面积 6.0） ---------- */
function tPoly(W, hb, ws, hs) {
  const c = W / 2;
  return [[0, hb + hs], [W, hb + hs], [W, hb], [c + ws / 2, hb], [c + ws / 2, 0], [c - ws / 2, 0], [c - ws / 2, hb], [0, hb]]
    .map(v => [r4(v[0]), r4(v[1])]);
}
const Ts = [];
for (let W = 2; W <= 6 + 1e-9; W += 0.25)
  for (let hb = 0.5; hb <= 2 + 1e-9; hb += 0.25)
    for (let ws = 0.5; ws <= 3 + 1e-9; ws += 0.25) {
      if (W - ws < 0.5 - 1e-9) continue;
      if (Math.abs((W - ws) / 2 - Math.round((W - ws) * 2) / 4) > 1e-9) continue;
      const hs = (6 - W * hb) / ws;
      if (hs < 0.5 - 1e-9) continue;
      if (Math.abs(hs * 4 - Math.round(hs * 4)) > 1e-9) continue;
      if (hb + hs > 6.8) continue;
      const t = tPoly(W, hb, ws, hs);
      if (Math.abs(areaS(t) - 6.0) > 1e-6) continue;
      Ts.push({ W, hb, ws, hs, poly: t });
    }
console.log(`干净 T 候选 ${Ts.length} 个`);

/* ---------- 反解 ---------- */
const PAIRS = [['A', 'B', 'C'], ['A', 'C', 'B']];
const hits = [];
const hitKey = new Map();
const nearMiss = [];
let n1 = 0, n2 = 0, n3 = 0;
const t0 = Date.now();
const T_LIMIT = 240000;   // 每个 T 的毫秒预算

for (const T of Ts) {
  const tT = Date.now();
  const R0 = T.poly;
  let done = false;
  for (const [p1, p2, p3] of PAIRS) {
    const L1 = placements(P_ORI[p1], R0, 0.5);
    n1 += L1.length;
    for (const q1 of L1) {
      if (Date.now() - tT > T_LIMIT) { done = true; break; }
      const R1s = diffRegion(R0, q1);
      if (R1s.length !== 1) continue;
      const R1 = R1s[0];
      if (R1.length > 12) continue;
      const L2 = placements(P_ORI[p2], R1, 0.5);
      n2 += L2.length;
      for (const q2 of L2) {
        const R2s = diffRegion(R1, q2);
        if (R2s.length !== 1) continue;
        const R2 = R2s[0];
        if (R2.length > 10) continue;          // D 最多 7 顶点，C 最多 4 → 10 已足够
        if (Math.abs(areaS(R2) - 3.0) > 1e-6) continue;
        const L3 = placements(P_ORI[p3], R2, 0.5);
        n3 += L3.length;
        for (const q3 of L3) {
          const R3s = diffRegion(R2, q3);
          if (R3s.length !== 1) continue;
          const D = R3s[0];
          if (D.length < 5 || D.length > 7) continue;
          const why = checkD(D);
          if (why.length === 0) {
            if (!verifyTiling([q1, q2, q3, D], T.poly)) continue;   // 重建不通过直接丢
            const dkey = sig(D) + '|' + D.length;
            if (!hitKey.has(T.W + 'x' + T.hb + '+' + T.ws + 'x' + T.hs)) hitKey.set(T.W + 'x' + T.hb + '+' + T.ws + 'x' + T.hs, new Set());
            const set = hitKey.get(T.W + 'x' + T.hb + '+' + T.ws + 'x' + T.hs);
            if (!set.has(dkey)) {
              set.add(dkey);
              hits.push({ T, order: [p1, p2, p3], q1, q2, q3, D });
            }
          } else if (D.length >= 4 && nearMiss.length < 10) {
            nearMiss.push({ T, why, D, n: D.length, ref: refCount(D), a: areaS(D) });
          }
        }
      }
    }
    if (done) break;
  }
  const k = T.W + 'x' + T.hb + '+' + T.ws + 'x' + T.hs;
  const got = hitKey.has(k) ? hitKey.get(k).size : 0;
  console.log(`T ${k} 完成 ${((Date.now() - tT) / 1000).toFixed(1)}s n1=${n1} n2=${n2} n3=${n3}${done ? ' [超时截断]' : ''}${got ? '  ★D种数 ' + got : ''}`);
}

console.log(`\n用时 ${((Date.now() - t0) / 1000).toFixed(1)}s  n1=${n1} n2=${n2} n3=${n3}`);
console.log(`==== 命中 ${hits.length} 组（不同 T × 不同 D）====`);
for (const h of hits) {
  const bb = bbox([h.D]);
  console.log(`T W=${h.T.W} hb=${h.T.hb} ws=${h.T.ws} hs=${h.T.hs} | D 顶点${h.D.length} 凹角${refCount(h.D)} 面积${areaS(h.D).toFixed(3)} bbox ${(bb[2]-bb[0]).toFixed(2)}x${(bb[3]-bb[1]).toFixed(2)}`);
  console.log(`   T = ${JSON.stringify(h.T.poly.map(v => [+v[0].toFixed(2), +v[1].toFixed(2)]))}`);
  console.log(`   D = ${JSON.stringify(h.D.map(v => [+v[0].toFixed(2), +v[1].toFixed(2)]))}`);
  for (const [id, q] of [[h.order[0], h.q1], [h.order[1], h.q2], [h.order[2], h.q3]])
    console.log(`   ${id} = ${JSON.stringify(q.map(v => [+v[0].toFixed(2), +v[1].toFixed(2)]))}`);
}
