/* 仿射畸变校正：书页是被手持拍摄的，剪影本来可能是严格 0.5 格点多边形，
 * 但被相机投影轻微拉伸/剪切后就不在格点上了。
 *
 * 这里在 6 参数（2×2 线性部分 + 平移）上做搜索，目标是
 *   Σ_i dist(v'_i, 0.5 格点)² + w·‖E‖² ,  E = A − I
 * 后一项防止 A 退化（把图形压扁成任意格点集）。收敛后再吸附、验面积、做精确覆盖。
 *
 * 用法：node tools/figs4/warp.js
 */
const fs = require('fs');
const path = require('path');
const T = require('./tri.js');

const HERE = __dirname, OUT = path.join(HERE, 'out');
const POLY = JSON.parse(fs.readFileSync(path.join(OUT, 'poly.json'), 'utf8'));
const W = 30;                       // 畸变惩罚权重

function dist2Grid(x, y) {
  const dx = x - Math.round(x / 0.5) * 0.5;
  const dy = y - Math.round(y / 0.5) * 0.5;
  return dx * dx + dy * dy;
}
function cost(poly, p) {
  const [a, b, c, d, tx, ty] = p;
  let s = 0, mx = 0;
  for (const v of poly) {
    const x = a * v[0] + b * v[1] + tx, y = c * v[0] + d * v[1] + ty;
    const dd = dist2Grid(x, y);
    s += dd;
    if (dd > mx) mx = dd;
  }
  const e = (a - 1) ** 2 + b * b + c * c + (d - 1) ** 2;
  return s + W * e;
}
function maxResid(poly, p) {
  const [a, b, c, d, tx, ty] = p;
  let mx = 0;
  for (const v of poly) {
    const x = a * v[0] + b * v[1] + tx, y = c * v[0] + d * v[1] + ty;
    mx = Math.max(mx, Math.sqrt(dist2Grid(x, y)));
  }
  return mx;
}
function apply(poly, p) {
  const [a, b, c, d, tx, ty] = p;
  return poly.map(v => [a * v[0] + b * v[1] + tx, c * v[0] + d * v[1] + ty]);
}
function phaseOf(vals) {
  let bo = 0, bv = Infinity;
  for (let k = 0; k < 200; k++) {
    const o = (k / 200) * 0.5;
    let v = 0;
    for (const t of vals) { const q = Math.round((t - o) / 0.5) * 0.5 + o; v += (t - q) ** 2; }
    if (v < bv) { bv = v; bo = o; }
  }
  return bo;
}
function shoelace(p) {
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const A = p[i], B = p[(i + 1) % p.length];
    s += A[0] * B[1] - B[0] * A[1];
  }
  return s / 2;
}
function cleanPts(pts) {
  const d = [];
  for (const v of pts) {
    const l = d[d.length - 1];
    if (!l || Math.abs(l[0] - v[0]) > 1e-9 || Math.abs(l[1] - v[1]) > 1e-9) d.push(v);
  }
  while (d.length > 2) {
    const a = d[0], b = d[d.length - 1];
    if (Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9) d.pop(); else break;
  }
  const o = [];
  for (let i = 0; i < d.length; i++) {
    const p0 = d[(i - 1 + d.length) % d.length], p1 = d[i], p2 = d[(i + 1) % d.length];
    const cr = (p1[0] - p0[0]) * (p2[1] - p1[1]) - (p1[1] - p0[1]) * (p2[0] - p1[0]);
    if (Math.abs(cr) > 1e-9) o.push(p1);
  }
  return o;
}
function edgesOk(p) {
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    const dx = Math.abs(b[0] - a[0]), dy = Math.abs(b[1] - a[1]);
    if (!(dx < 1e-9 || dy < 1e-9 || Math.abs(dx - dy) < 1e-9)) return false;
  }
  return true;
}

function optimize(poly) {
  const px = phaseOf(poly.map(v => v[0])), py = phaseOf(poly.map(v => v[1]));
  let best = { p: [1, 0, 0, 1, px, py], c: Infinity };
  const evalAt = p => cost(poly, p);
  // 1) 随机采样
  let seed = 12345;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let k = 0; k < 30000; k++) {
    const p = [1 + (rnd() - 0.5) * 0.16, (rnd() - 0.5) * 0.16,
               (rnd() - 0.5) * 0.16, 1 + (rnd() - 0.5) * 0.16,
               px + (rnd() - 0.5) * 0.1, py + (rnd() - 0.5) * 0.1];
    const c = evalAt(p);
    if (c < best.c) best = { p, c };
  }
  // 2) 坐标下降细化
  let step = 0.02;
  for (let it = 0; it < 400 && step > 1e-5; it++) {
    let improved = false;
    for (let i = 0; i < 6; i++) {
      for (const s of [step, -step]) {
        const q = best.p.slice();
        q[i] += s;
        const c = evalAt(q);
        if (c < best.c - 1e-12) { best = { p: q, c }; improved = true; }
      }
    }
    if (!improved) step *= 0.5;
  }
  return best;
}

const REPORT = {};
for (const tag of Object.keys(POLY).sort()) {
  const raw = POLY[tag].poly;
  let sol = null;
  for (const pre of [0, 45, -45, 90, 135, -90, 180, -135]) {
    const t = pre * Math.PI / 180, co = Math.cos(t), si = Math.sin(t);
    const loc = raw.map(v => [v[0] * co - v[1] * si, v[0] * si + v[1] * co]);
    const b = optimize(loc);
    const r = maxResid(loc, b.p);
    if (sol && r >= sol.r) continue;
    const warped = apply(loc, b.p);
    const snap = cleanPts(warped.map(v => [Math.round(v[0] / 0.5) * 0.5, Math.round(v[1] / 0.5) * 0.5]));
    if (snap.length !== raw.length || !edgesOk(snap)) continue;
    const ar = Math.abs(shoelace(snap));
    if (Math.abs(ar - 6) > 1e-9) { sol = { pre, r, why: '面积 ' + ar.toFixed(3), ok: false }; continue; }
    const tgt = snap.map(v => [Math.round(v[0] * 4), Math.round(v[1] * 4)]);
    const ec = T.exactCover(tgt, { maxSols: 4 });
    sol = { pre, r, snap, ok: ec.ok, nSol: ec.sols ? ec.sols.length : 0, sols: ec.sols, b: b.p };
  }
  if (!sol) { console.log(tag, '✗ 无解'); REPORT[tag] = { ok: false }; continue; }
  console.log(tag, '畸变校正后最大残差', sol.r.toFixed(4) + 'u', '| 预旋转', sol.pre,
    sol.ok ? ('✓ 可精确铺满，解数 ' + sol.nSol) : ('✗ ' + (sol.why || '吸附后不可铺满')));
  if (sol.ok) {
    const s = sol.sols[0];
    const tris = [];
    for (const c of s) tris.push(...c.tris);
    const ring = T.simplify(T.trisOutline(tris));
    console.log('    格点轮廓', sol.snap.map(v => '(' + v[0] + ',' + v[1] + ')').join(' '));
    console.log('    并集轮廓', ring.map(v => '(' + v[0] / 4 + ',' + v[1] / 4 + ')').join(' '));
    REPORT[tag] = { ok: true, resid: +sol.r.toFixed(4), pre: sol.pre,
      outlineGrid: ring.map(v => [v[0] / 4, v[1] / 4]),
      pieces: s.map(c => ({ id: c.id, poly: c.poly.map(v => [v[0] / 4, v[1] / 4]) })) };
  } else {
    REPORT[tag] = { ok: false, resid: +sol.r.toFixed(4) };
  }
}
fs.writeFileSync(path.join(OUT, 'warp.json'), JSON.stringify(REPORT, null, 1));
console.log('\n→ tools/figs4/out/warp.json');
