/* 以参考剪影为约束的「带容差精确摆放」搜索（v2）
 *
 * 之前的 DFS 有 bug：强制「每块必须贴住已放块」，一旦板件邻接图与固定放置顺序
 * 不匹配就会漏掉正确摆法（f2 的已知精确解就是这样漏掉的）。现在改成：
 *   ① 把参考剪影在候选格点系里栅格化成三角形集合 T（不要求剪影本身可精确铺满）；
 *   ② 生成每块板「≥85% 落在 T 内」的候选摆放（这个集合通常只有几十个）；
 *   ③ 对候选集做穷举：四块互不重叠，最大化 |并集 ∩ T|；
 *   ④ 并集的外边界就是关卡轮廓（精确可拼），再用「顶点到边界」距离挑最像照片的。
 *
 * 用法：node tools/figs4/fitTri.js
 */
const fs = require('fs');
const path = require('path');
const T = require('./tri.js');
const { polyTris, trisOutline, simplify, shoelace, VAR, AREA_TRI } = T;

const HERE = __dirname, OUT = path.join(HERE, 'out');
const POLY = JSON.parse(fs.readFileSync(path.join(OUT, 'poly.json'), 'utf8'));
const STEP = 2;                                   // 0.5u（0.25u 整数单位）

const r4 = v => Math.round(v * 4) / 4;
function dSeg(p, a, b) {
  const vx = b[0] - a[0], vy = b[1] - a[1];
  const L2 = vx * vx + vy * vy || 1;
  let t = ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / L2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * vx), p[1] - (a[1] + t * vy));
}
function distToBoundary(p, poly) {
  let d = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const e = dSeg(p, poly[i], poly[(i + 1) % poly.length]);
    if (e < d) d = e;
  }
  return d;
}
function centroidOf(p) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < p.length; i++) {
    const q = p[i], r = p[(i + 1) % p.length];
    const cr = q[0] * r[1] - r[0] * q[1];
    a += cr; cx += (q[0] + r[0]) * cr; cy += (q[1] + r[1]) * cr;
  }
  a /= 2;
  return [cx / (6 * a), cy / (6 * a)];
}
function shapeDist(A, B) {
  const ca = centroidOf(A), cb = centroidOf(B);
  const sh = (p, c, o) => p.map(v => [v[0] - c[0] + o[0], v[1] - c[1] + o[1]]);
  const a2 = sh(A, ca, cb);
  let d = 0;
  for (const v of a2) d = Math.max(d, distToBoundary(v, B));
  for (const v of B) d = Math.max(d, distToBoundary(v, a2));
  return d;
}
function rotPts(p, deg) {
  const t = deg * Math.PI / 180, co = Math.cos(t), si = Math.sin(t);
  return p.map(v => [v[0] * co - v[1] * si, v[0] * si + v[1] * co]);
}
function phase(vals) {
  let bo = 0, bv = Infinity;
  for (let k = 0; k < 200; k++) {
    const o = (k / 200) * 0.5;
    let v = 0;
    for (const t of vals) { const q = Math.round((t - o) / 0.5) * 0.5 + o; v += (t - q) ** 2; }
    if (v < bv) { bv = v; bo = o; }
  }
  return bo;
}

const TMPL = {};
for (const id of ['A', 'D', 'C', 'B']) {
  TMPL[id] = VAR[id].map(v => ({ id, v, w: Math.max(...v.map(p => p[0])), h: Math.max(...v.map(p => p[1])) }));
}

/* 在格点系（targetLocal 已被对齐到 0.5Z²）里求解 */
function solveLocal(targetLocal, keepFrac) {
  const need = new Set(polyTris(targetLocal.map(v => [Math.round(v[0] * 4), Math.round(v[1] * 4)])));
  const nT = need.size;
  if (nT < 78 || nT > 118) return null;

  const xs = targetLocal.map(v => v[0]), ys = targetLocal.map(v => v[1]);
  const bx0 = Math.floor(Math.min(...xs) * 2) * 2, bx1 = Math.ceil(Math.max(...xs) * 2) * 2;
  const by0 = Math.floor(Math.min(...ys) * 2) * 2, by1 = Math.ceil(Math.max(...ys) * 2) * 2;

  const cand = {};
  for (const id of ['A', 'D', 'C', 'B']) {
    const list = [], seen = new Set();
    for (const t of TMPL[id]) {
      for (let ty = by0; ty + t.h <= by1; ty += STEP) {
        for (let tx = bx0; tx + t.w <= bx1; tx += STEP) {
          const poly = t.v.map(p => [p[0] + tx, p[1] + ty]);
          const tris = polyTris(poly);
          if (tris.length !== AREA_TRI[id]) continue;
          let hit = 0;
          for (const k of tris) if (need.has(k)) hit++;
          if (hit < tris.length * keepFrac) continue;
          const kk = poly.map(p => p[0] + ',' + p[1]).sort().join(';');
          if (seen.has(kk)) continue;
          seen.add(kk);
          list.push({ id, poly, tris, hit });
        }
      }
    }
    if (!list.length) return null;
    list.sort((a, b) => b.hit - a.hit);
    cand[id] = list;
  }

  /* 穷举：四块互不重叠，最大化并集∩T。
   * 注意必须遍历「放置顺序的全排列」——固定顺序会漏掉板件邻接图不匹配的正确摆法
   * （f2 的已知精确解就是这么漏掉的）。 */
  let bestSet = null, bestHit = -1;
  const IDS = ['A', 'D', 'C', 'B'];
  const PERMS = [];
  (function perm(cur, rest) {
    if (!rest.length) { PERMS.push(cur); return; }
    for (let i = 0; i < rest.length; i++) perm(cur.concat(rest[i]), rest.filter((_, j) => j !== i));
  })([], IDS);

  for (const pm of PERMS) {
    const SEQ = pm.map(id => cand[id]);
    const used = new Set();
    const acc = [];
    (function rec(i, inter) {
      if (i === 4) {
        if (used.size !== 96) return;
        if (inter > bestHit) { bestHit = inter; bestSet = acc.map(c => c); }
        return;
      }
      for (const c of SEQ[i]) {
        let clash = false;
        for (const t of c.tris) if (used.has(t)) { clash = true; break; }
        if (clash) continue;
        for (const t of c.tris) used.add(t);
        acc.push(c);
        rec(i + 1, inter + c.hit);
        acc.pop();
        for (const t of c.tris) used.delete(t);
      }
    })(0, 0);
  }
  if (!bestSet) return null;
  const tris = [];
  for (const c of bestSet) tris.push(...c.tris);
  const ring = simplify(trisOutline(tris));
  if (ring.length < 3) return null;
  return { hit: bestHit, nT, ring: ring.map(v => [v[0] / 4, v[1] / 4]),
    pieces: bestSet.map(c => ({ id: c.id, poly: c.poly.map(v => [v[0] / 4, v[1] / 4]) })),
    cand: Object.fromEntries(Object.entries(cand).map(([k, v]) => [k, v.length])) };
}

const ARGV = process.argv.slice(2);
const ONLY = ARGV.filter(a => /^f\d$/.test(a));
const GRID = (() => { const g = ARGV.find(a => a.startsWith('--grid=')); return g ? +g.split('=')[1] : 5; })();
const STEPG = 0.5 / GRID;

const REPORT = {};
for (const tag of Object.keys(POLY).sort()) {
  if (ONLY.length && ONLY.indexOf(tag) < 0) continue;
  const raw = POLY[tag].poly;
  const t0 = Date.now();
  let best = null, tries = 0, okN = 0;
  const pool = new Map();          // 形状去重池：canon → 最优候选
  for (const pre of [0, 45, -45, 90, 135, -90, 180, -135]) {
    const loc = rotPts(raw, -pre);
    const px = phase(loc.map(v => v[0])), py = phase(loc.map(v => v[1]));
    for (let i = 0; i < GRID; i++) {
      for (let j = 0; j < GRID; j++) {
        const ox = px + (i - (GRID - 1) / 2) * STEPG, oy = py + (j - (GRID - 1) / 2) * STEPG;
        const tgt = loc.map(v => [v[0] - ox, v[1] - oy]);
        const r = solveLocal(tgt, 0.9);
        tries++;
        if (!r) continue;
        okN++;
        const back = (p) => rotPts(p.map(v => [v[0] + ox, v[1] + oy]), pre);
        const ring = back(r.ring);
        const hd = shapeDist(ring, raw);
        const ck = ring.map(v => Math.round(v[0] * 2) / 2 + ',' + Math.round(v[1] * 2) / 2)
          .sort().join(';');
        const prev = pool.get(ck);
        if (!prev || hd < prev.hd) pool.set(ck, { hd, hit: r.hit, nT: r.nT, pre, ox, oy, ring, pieces: r.pieces });
        if (!best || hd < best.hd - 1e-9 ||
            (Math.abs(hd - best.hd) < 1e-9 && r.hit > best.hit)) {
          best = { hd, hit: r.hit, nT: r.nT, pre, ox, oy, ring, pieces: r.pieces, cand: r.cand };
        }
      }
    }
  }
  if (!best) { console.log(tag, '✗ 未找到'); REPORT[tag] = { ok: false }; continue; }
  const back = (p) => rotPts(p.map(v => [v[0] + best.ox, v[1] + best.oy]), best.pre);
  const outline = back(best.ring);
  const pieces = best.pieces.map(p => ({ id: p.id, poly: back(p.poly) }));
  console.log(tag, '形距', best.hd.toFixed(3) + 'u', '| 覆盖', best.hit + '/' + best.nT,
    '| 预旋转', best.pre, '| 候选', JSON.stringify(best.cand),
    '| 试', tries, '成解', okN, '|', (Date.now() - t0) + 'ms');
  console.log('    轮廓', outline.map(v => '(' + r4(v[0]) + ',' + r4(v[1]) + ')').join(' '));
  const top = [...pool.values()].sort((a, b) => a.hd - b.hd).slice(0, 10).map(o => ({
    hd: +o.hd.toFixed(4),
    outline: back(o.ring),
    pieces: o.pieces.map(p => ({ id: p.id, poly: back(p.poly) }))
  }));
  REPORT[tag] = { ok: true, hd: +best.hd.toFixed(4), cover: best.hit + '/' + best.nT,
    pre: best.pre, outline, pieces, top, nShape: pool.size };
  console.log('   形状池', pool.size, '| 前 5 形距', top.map(o => o.hd).join(' '));
}
fs.writeFileSync(path.join(OUT, 'fitTri.json'), JSON.stringify(REPORT, null, 1));
console.log('\n→ tools/figs4/out/fitTri.json');
