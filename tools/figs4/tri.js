/* 四巧板「三角网格精确覆盖」求解器
 *
 * 关键事实（本脚本的前提，已被图片数据验证）：
 *   四块板的顶点都在 0.5 格点上；45° 朝向会把顶点带到 0.5·R45·Z²，
 *   而 0.5Z² 与 0.5·R45·Z² 只共享原点（√2 无理），两块不同奇偶性的板
 *   最多只能共点、拼不出连续区域。所以任何合法剪影都是 0.5 格点多边形，
 *   拼法只用 0/90/180/270 四个角度。
 *
 * 网格：把每个 0.5×0.5 方格用两条对角线切成 4 个三角形。
 *   板的边界只会落在方格边或对角线上，因此每个三角形一定「整块在内/在外」，
 *   于是摆板 = 取一组三角形的集合，重叠判定与精确覆盖都变成整数集合运算，
 *   且天然支持 T 型接缝（长边被两块短边分段贴合）。
 *   总面积 6u² 对应 6 / (0.5²/4) = 96 个三角形。
 *
 * 坐标：内部一律用 1/4 u 的整数（即 0.25u 为单位），输出时 /4 得到 u。
 *
 * 用法：node tools/figs4/tri.js
 */
const fs = require('fs');
const path = require('path');

const HERE = __dirname, OUT = path.join(HERE, 'out');

/* ---------------- 板件几何（0.25u 整数） ---------------- */
const BASE = {
  A: [[12, 0], [0, 0], [4, 4], [12, 4]],
  B: [[0, 4], [0, 0], [4, 4]],
  C: [[0, 0], [6, 0], [2, 4], [0, 4]],
  D: [[2, 0], [2, 4], [0, 4], [4, 8], [10, 8]]
};
const AREA_TRI = { A: 40, B: 8, C: 16, D: 32 };     // 三角形个数

function rot90(p) { return p.map(v => [-v[1], v[0]]); }
function flipX(p) { return p.map(v => [-v[0], v[1]]); }
function norm(p) {
  const x0 = Math.min(...p.map(v => v[0])), y0 = Math.min(...p.map(v => v[1]));
  return p.map(v => [v[0] - x0, v[1] - y0]);
}
function key(p) {
  return p.map(v => v[0] + ',' + v[1]).sort().join(';');
}
/* 一块板的所有相异朝向（4 旋转 × 镜像，去几何重复） */
function variants(id) {
  const out = [], seen = new Set();
  let cur = norm(BASE[id]);
  for (let f = 0; f < 2; f++) {
    let r = cur;
    for (let k = 0; k < 4; k++) {
      const n = norm(r), kk = key(n);
      if (!seen.has(kk)) { seen.add(kk); out.push(n); }
      r = rot90(r);
    }
    cur = flipX(cur);
  }
  return out;
}
const VAR = {};
for (const id of Object.keys(BASE)) VAR[id] = variants(id);

/* ---------------- 三角形网格 ---------------- */
const OFF = 64;                                     // 索引偏移，容许负坐标
const DIRS = ['N', 'E', 'S', 'W'];
/* 方格 (gx,gy) 里 dir 三角形的重心（0.25u 单位，浮点） */
function triCentroid(gx, gy, d) {
  const X = 2 * gx, Y = 2 * gy;
  if (d === 0) return [X + 1, Y + 5 / 3];           // N
  if (d === 1) return [X + 5 / 3, Y + 1];           // E
  if (d === 2) return [X + 1, Y + 1 / 3];           // S
  return [X + 1 / 3, Y + 1];                        // W
}
function inPoly(pt, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[1] > pt[1]) !== (b[1] > pt[1])) {
      const x = a[0] + (pt[1] - a[1]) / (b[1] - a[1]) * (b[0] - a[0]);
      if (pt[0] < x) c = !c;
    }
  }
  return c;
}
function tkey(gx, gy, d) { return ((gy + OFF) * 512 + (gx + OFF)) * 4 + d; }
function tkSplit(k) {
  const d = k % 4, r = (k - d) / 4;
  return [r % 512 - OFF, Math.floor(r / 512) - OFF, d];
}
/* 多边形覆盖的三角形集合（poly 为 0.25u 整数坐标） */
function polyTris(poly) {
  const xs = poly.map(v => v[0]), ys = poly.map(v => v[1]);
  const gx0 = Math.floor(Math.min(...xs) / 2), gx1 = Math.floor(Math.max(...xs) / 2);
  const gy0 = Math.floor(Math.min(...ys) / 2), gy1 = Math.floor(Math.max(...ys) / 2);
  const out = [];
  for (let gy = gy0; gy <= gy1; gy++) {
    for (let gx = gx0; gx <= gx1; gx++) {
      for (let d = 0; d < 4; d++) {
        if (inPoly(triCentroid(gx, gy, d), poly)) out.push(tkey(gx, gy, d));
      }
    }
  }
  return out;
}
/* 三角形集合 → 边界折线（返回 0.25u 整数顶点环） */
const VKEY = (x, y) => (x + OFF) * 512 + (y + OFF);
function trisOutline(tris) {
  const set = new Set(tris);
  const edgeCount = new Map();
  const EK = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
  const vtx = k => {
    const [gx, gy, d] = tkSplit(k);
    const X = 2 * gx, Y = 2 * gy;
    if (d === 0) return [[X, Y + 2], [X + 2, Y + 2], [X + 1, Y + 1]];
    if (d === 1) return [[X + 2, Y], [X + 2, Y + 2], [X + 1, Y + 1]];
    if (d === 2) return [[X, Y], [X + 2, Y], [X + 1, Y + 1]];
    return [[X, Y], [X, Y + 2], [X + 1, Y + 1]];
  };
  for (const k of tris) {
    const v = vtx(k);
    for (let i = 0; i < 3; i++) {
      const a = VKEY(v[i][0], v[i][1]), b = VKEY(v[(i + 1) % 3][0], v[(i + 1) % 3][1]);
      const e = EK(a, b);
      edgeCount.set(e, (edgeCount.get(e) || 0) + 1);
    }
  }
  // 只出现一次的边 = 边界
  const adj = new Map();
  for (const [e, c] of edgeCount) {
    if (c !== 1) continue;
    const [a, b] = e.split('|').map(Number);
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a).push(b); adj.get(b).push(a);
  }
  const vert = k => [Math.floor(k / 512) - OFF, (k % 512) - OFF];
  // 沿边界走一圈（每个顶点在简单环上度数为 2）
  const start = adj.keys().next().value;
  const ring = [start];
  let prev = -1, cur = start;
  for (let guard = 0; guard < 100000; guard++) {
    const nb = adj.get(cur).filter(v => v !== prev);
    if (!nb.length) break;
    const nxt = nb[0];
    if (nxt === start) break;
    ring.push(nxt); prev = cur; cur = nxt;
  }
  return ring.map(vert);
}
/* 去共线点 */
function simplify(ring) {
  const out = [];
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const p0 = ring[(i - 1 + n) % n], p1 = ring[i], p2 = ring[(i + 1) % n];
    const cr = (p1[0] - p0[0]) * (p2[1] - p1[1]) - (p1[1] - p0[1]) * (p2[0] - p1[0]);
    if (cr !== 0) out.push(p1);
  }
  return out;
}
function shoelace(p) {
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s / 2;
}

/* ---------------- 精确覆盖 ---------------- */
/* target: 0.25u 整数多边形；返回所有 4 块拼法 */
function exactCover(target, opts = {}) {
  const need = polyTris(target);
  const needSet = new Set(need);
  if (need.length !== 96) return { ok: false, why: '目标覆盖三角形数 ' + need.length + ' ≠ 96', sols: [] };

  // 候选：每个朝向 × 平移（平移必须是 0.5u=2 的倍数），且完全落在目标内
  const xs = target.map(v => v[0]), ys = target.map(v => v[1]);
  const bx0 = Math.min(...xs), bx1 = Math.max(...xs);
  const by0 = Math.min(...ys), by1 = Math.max(...ys);
  const cand = {};
  for (const id of ['A', 'D', 'C', 'B']) {           // 大的先放，剪枝更狠
    const list = [];
    for (const v of VAR[id]) {
      const vx = Math.max(...v.map(p => p[0])), vy = Math.max(...v.map(p => p[1]));
      for (let ty = by0; ty + vy <= by1; ty += 2) {
        for (let tx = bx0; tx + vx <= bx1; tx += 2) {
          const pl = v.map(p => [p[0] + tx, p[1] + ty]);
          const tr = polyTris(pl);
          if (tr.length !== AREA_TRI[id]) continue;
          let ok = true;
          for (const t of tr) if (!needSet.has(t)) { ok = false; break; }
          if (!ok) continue;
          list.push({ id, poly: pl, tris: tr, tx, ty });
        }
      }
    }
    // 去重（同一形状同一位置可能由镜像+旋转重复得到）
    const seen = new Set(), uniq = [];
    for (const c of list) {
      const k = c.id + '|' + key(c.poly);
      if (seen.has(k)) continue;
      seen.add(k); uniq.push(c);
    }
    cand[id] = uniq;
  }
  const order = ['A', 'D', 'C', 'B'];
  const sols = [];
  const used = new Set();
  const maxSols = opts.maxSols || 40;
  function dfs(depth, acc) {
    if (sols.length >= maxSols) return;
    if (depth === order.length) {
      if (used.size === 96) sols.push(acc.slice());
      return;
    }
    const id = order[depth];
    for (const c of cand[id]) {
      let clash = false;
      for (const t of c.tris) if (used.has(t)) { clash = true; break; }
      if (clash) continue;
      // 面积剪枝：剩下的板必须能盖住剩余三角形
      let room = 0;
      for (const t of need) if (!used.has(t)) room++;
      let needArea = c.tris.length;
      for (let d2 = depth + 1; d2 < order.length; d2++) needArea += AREA_TRI[order[d2]];
      if (needArea > room) continue;
      for (const t of c.tris) used.add(t);
      acc.push(c);
      dfs(depth + 1, acc);
      acc.pop();
      for (const t of c.tris) used.delete(t);
      if (sols.length >= maxSols) return;
    }
  }
  dfs(0, []);
  return { ok: sols.length > 0, triCount: need.length, sols, cand: Object.fromEntries(Object.entries(cand).map(([k, v]) => [k, v.length])) };
}

/* ---------------- 主流程 ---------------- */
if (require.main === module) {
  const snapped = JSON.parse(fs.readFileSync(path.join(OUT, 'snapped.json'), 'utf8'));
  const res = {};
  for (const tag of Object.keys(snapped).sort()) {
    const s = snapped[tag];
    if (!s.polyGrid) { console.log(tag, '✗ 没有可信的格点剪影'); res[tag] = { ok: false }; continue; }
    const target = s.polyGrid.map(v => [Math.round(v[0] * 4), Math.round(v[1] * 4)]);
    const t0 = Date.now();
    const r = exactCover(target);
    const ms = Date.now() - t0;
    if (!r.ok) {
      console.log(tag, '✗', r.why || '无解', '| 候选', JSON.stringify(r.cand || {}), '|', ms + 'ms');
      res[tag] = { ok: false, cand: r.cand, why: r.why };
      continue;
    }
    const sol = r.sols[0];
    const tris = [];
    for (const c of sol) tris.push(...c.tris);
    const ring = simplify(trisOutline(tris));
    const ar = Math.abs(shoelace(ring)) / 16;        // 0.25² 单位 → u²
    console.log(tag, '✓ 解数', r.sols.length, '| 并集顶点', ring.length, '| 面积', ar.toFixed(4),
      '| 候选', JSON.stringify(r.cand), '|', ms + 'ms');
    console.log('    拼法', sol.map(c => c.id + '(' + c.tx / 4 + ',' + c.ty / 4 + ')').join(' '));
    console.log('    轮廓', ring.map(v => '(' + v[0] / 4 + ',' + v[1] / 4 + ')').join(' '));
    res[tag] = {
      ok: true, nSol: r.sols.length,
      outlineU: ring.map(v => [v[0] / 4, v[1] / 4]),
      pieces: sol.map(c => ({ id: c.id, polyU: c.poly.map(v => [v[0] / 4, v[1] / 4]) }))
    };
  }
  fs.writeFileSync(path.join(OUT, 'tri.json'), JSON.stringify(res, null, 1));
  console.log('\n→ tools/figs4/out/tri.json');
}

module.exports = { polyTris, trisOutline, simplify, shoelace, exactCover, VAR, BASE, AREA_TRI, tkey, tkSplit };
