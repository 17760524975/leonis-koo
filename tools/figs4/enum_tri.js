/* 枚举四巧板所有「可拼轮廓」（0.5 格点、允许 T 型接缝）
 *
 * 用 tri.js 的三角网格：摆一块板 = 取一组三角形。
 *   1. A 固定在各朝向的规范位置起步；
 *   2. 依次放 D / C / B，每块必须与已有并集共享至少一条网格边（禁止只碰点）；
 *   3. 四块放完 → 取三角形并集的外边界，去共线，规范化后去重。
 * 输出所有相异轮廓，供与参考图做刚体 IoU 匹配。
 *
 * 用法：node tools/figs4/enum_tri.js
 */
const fs = require('fs');
const path = require('path');
const T = require('./tri.js');

const { polyTris, trisOutline, simplify, shoelace, VAR, AREA_TRI } = T;

const STEP = 2;                 // 平移步长（0.25u 单位）= 0.5u
const LIM = 30;                 // 坐标上限（0.25u）→ 7.5u 见方
const LO = -10;

/* 三角形邻居表（跨网格边相邻） */
function neighbors(gx, gy, d) {
  const N = (X, Y, dd) => T.tkey(X, Y, dd);
  if (d === 0) return [N(gx, gy + 1, 2), N(gx, gy, 1), N(gx, gy, 3)];
  if (d === 1) return [N(gx + 1, gy, 3), N(gx, gy, 2), N(gx, gy, 0)];
  if (d === 2) return [N(gx, gy - 1, 0), N(gx, gy, 3), N(gx, gy, 1)];
  return [N(gx - 1, gy, 1), N(gx, gy, 2), N(gx, gy, 0)];
}

function normPoly(p) {
  const x0 = Math.min(...p.map(v => v[0])), y0 = Math.min(...p.map(v => v[1]));
  return p.map(v => [v[0] - x0, v[1] - y0]);
}
function canon(p) {
  const n = normPoly(p);
  return n.map(v => v[0] + ',' + v[1]).sort().join(';');
}
function isSimpleRing(ring) {
  const n = ring.length;
  if (n < 3) return false;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const inter = (a, b, c, d) => {
    const d1 = cross(c, d, a), d2 = cross(c, d, b), d3 = cross(a, b, c), d4 = cross(a, b, d);
    return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
  };
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    if ((j + 1) % n === i || (i + 1) % n === j) continue;
    if (inter(ring[i], ring[(i + 1) % n], ring[j], ring[(j + 1) % n])) return false;
  }
  return true;
}

/* 预生成每块板每个朝向的所有平移（三角形列表） */
function genPlacements(id) {
  const out = [];
  for (const v of VAR[id]) {
    const w = Math.max(...v.map(p => p[0])), h = Math.max(...v.map(p => p[1]));
    for (let ty = LO; ty + h <= LIM; ty += STEP) {
      for (let tx = LO; tx + w <= LIM; tx += STEP) {
        const poly = v.map(p => [p[0] + tx, p[1] + ty]);
        const tris = polyTris(poly);
        if (tris.length !== AREA_TRI[id]) continue;
        const bx0 = Math.min(...poly.map(p => p[0])), bx1 = Math.max(...poly.map(p => p[0]));
        const by0 = Math.min(...poly.map(p => p[1])), by1 = Math.max(...poly.map(p => p[1]));
        out.push({ id, poly, tris, bx0, bx1, by0, by1 });
      }
    }
  }
  // 去几何重复
  const seen = new Set(), uniq = [];
  for (const c of out) {
    const k = c.id + '|' + c.poly.map(v => v[0] + ',' + v[1]).sort().join(';');
    if (seen.has(k)) continue;
    seen.add(k); uniq.push(c);
  }
  return uniq;
}

const PL = {};
for (const id of ['A', 'D', 'C', 'B']) PL[id] = genPlacements(id);
/* A 只保留「bbox 左下角 = 原点」的规范摆放：整体平移不改变形状，
 * 不这么做会有 2000+ 个等价起点，搜索量爆炸。 */
PL['A'] = PL['A'].filter(p => p.bx0 === 0 && p.by0 === 0);
console.log('候选摆放数', Object.fromEntries(Object.entries(PL).map(([k, v]) => [k, v.length])));

/* 与并集共享网格边 */
function touches(placement, used) {
  for (const t of placement.tris) {
    const [gx, gy, d] = T.tkSplit(t);
    for (const nb of neighbors(gx, gy, d)) if (used.has(nb)) return true;
  }
  return false;
}

const ORDER = ['D', 'C', 'B'];
const shapes = new Map();       // canon → { outline, pieces }
let nodes = 0;

function record(acc) {
  const tris = [];
  for (const c of acc) tris.push(...c.tris);
  if (tris.length !== 96) return;
  const ring = simplify(trisOutline(tris));
  if (ring.length < 3 || !isSimpleRing(ring)) return;
  const ar = Math.abs(shoelace(ring)) / 16;
  if (Math.abs(ar - 6) > 1e-9) return;
  const k = canon(ring);
  if (!shapes.has(k)) shapes.set(k, { outline: normPoly(ring), pieces: acc.map(c => ({ id: c.id, poly: normPoly(c.poly) })) });
}

/* union bbox 用于快速排除「离得太远」的摆放 */
function dfs(depth, acc, used, bb) {
  if (depth === ORDER.length) { nodes++; record(acc); return; }
  const id = ORDER[depth];
  for (const p of PL[id]) {
    // bbox 相交 + 容差 2（0.5u），否则不可能贴边
    if (p.bx0 > bb[1] + 2 || p.bx1 < bb[0] - 2 || p.by0 > bb[3] + 2 || p.by1 < bb[2] - 2) continue;
    let clash = false;
    for (const t of p.tris) if (used.has(t)) { clash = true; break; }
    if (clash) continue;
    if (!touches(p, used)) continue;
    for (const t of p.tris) used.add(t);
    acc.push(p);
    const nb = [Math.min(bb[0], p.bx0), Math.max(bb[1], p.bx1), Math.min(bb[2], p.by0), Math.max(bb[3], p.by1)];
    dfs(depth + 1, acc, used, nb);
    acc.pop();
    for (const t of p.tris) used.delete(t);
  }
}

const t0 = Date.now();
for (const a of PL['A']) {
  const used = new Set(a.tris);
  dfs(0, [a], used, [a.bx0, a.bx1, a.by0, a.by1]);
}
const ms = Date.now() - t0;
console.log('四块组合', nodes, '| 相异轮廓', shapes.size, '| 用时', ms + 'ms');

const arr = [...shapes.values()].map((s, i) => ({
  idx: i,
  outline: s.outline.map(v => [v[0] / 4, v[1] / 4]),
  pieces: s.pieces.map(p => ({ id: p.id, poly: p.poly.map(v => [v[0] / 4, v[1] / 4]) }))
}));
fs.writeFileSync(path.join(__dirname, 'out', 'shapes4.json'), JSON.stringify(arr));
console.log('→ tools/figs4/out/shapes4.json');
