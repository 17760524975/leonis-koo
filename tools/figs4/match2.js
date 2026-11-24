/* 重写版形状匹配：先自检（用已精确解出的 f4 反标噪声基线），再扫 394 个已知轮廓。
 * 关键点：栅格化用扫描线填充，质心 + 面积归一后对比，16 个朝向（45° 步进 × 镜像）。
 * 用法：node tools/figs4/match2.js
 */
const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const OUT = path.join(HERE, 'out');
const POLY = JSON.parse(fs.readFileSync(path.join(OUT, 'poly.json'), 'utf8'));
const SHAPES = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'out', 'shapes.json'), 'utf8'));
const SOLVED = fs.existsSync(path.join(OUT, 'solved.json'))
  ? JSON.parse(fs.readFileSync(path.join(OUT, 'solved.json'), 'utf8')) : {};

const CELL = 0.04;
const PAD = 0.6;

/* ---------- 基础几何 ---------- */
function shoelace(p) {
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s / 2;
}
function centroid(p) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < p.length; i++) {
    const q = p[i], r = p[(i + 1) % p.length];
    const cr = q[0] * r[1] - r[0] * q[1];
    a += cr; cx += (q[0] + r[0]) * cr; cy += (q[1] + r[1]) * cr;
  }
  a /= 2;
  return [cx / (6 * a), cy / (6 * a)];
}
/* 面积归一到 6、质心归零 */
function normalize(p) {
  const a = Math.abs(shoelace(p));
  const s = Math.sqrt(6 / a);
  const c = centroid(p);
  return p.map(v => [(v[0] - c[0]) * s, (v[1] - c[1]) * s]);
}
function rot(p, k) {                    // 顺时针 k×45°
  const t = k * Math.PI / 4, co = Math.cos(t), si = Math.sin(t);
  return p.map(v => [v[0] * co - v[1] * si, v[0] * si + v[1] * co]);
}
function mirror(p) { return p.map(v => [-v[0], v[1]]); }

/* ---------- 扫描线栅格化 ---------- */
function makeGrid(polys) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of polys) for (const v of p) {
    if (v[0] < x0) x0 = v[0]; if (v[0] > x1) x1 = v[0];
    if (v[1] < y0) y0 = v[1]; if (v[1] > y1) y1 = v[1];
  }
  x0 -= PAD; y0 -= PAD; x1 += PAD; y1 += PAD;
  const n = Math.max(32, Math.ceil(Math.max(x1 - x0, y1 - y0) / CELL));
  return { x0, y0, n, cell: CELL };
}
function raster(poly, g) {
  const { x0, y0, n, cell } = g;
  const out = new Uint8Array(n * n);
  const m = poly.length;
  for (let gy = 0; gy < n; gy++) {
    const y = y0 + (gy + 0.5) * cell;
    const xs = [];
    for (let i = 0; i < m; i++) {
      const a = poly[i], b = poly[(i + 1) % m];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
        xs.push(a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
      }
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      let i0 = Math.ceil((xs[k] - x0) / cell - 0.5);
      let i1 = Math.floor((xs[k + 1] - x0) / cell - 0.5);
      if (i0 < 0) i0 = 0; if (i1 > n - 1) i1 = n - 1;
      for (let gx = i0; gx <= i1; gx++) out[gy * n + gx] = 1;
    }
  }
  return out;
}
function iou(a, b) {
  let in_ = 0, un = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] && b[i]) in_++;
    if (a[i] || b[i]) un++;
  }
  return un ? in_ / un : 0;
}

/* ---------- 匹配 ---------- */
const targets = Object.keys(POLY).sort();
const lib = SHAPES.map(s => normalize(s.outline));

const report = {};
for (const tag of targets) {
  const t = normalize(POLY[tag].poly);
  const cands = [];
  // 自身已解轮廓（标定噪声基线）
  let base = null;
  if (SOLVED[tag]) {
    const so = normalize(SOLVED[tag].outline);
    const g = makeGrid([t, so]);
    base = iou(raster(t, g), raster(so, g));
  }
  // 与 394 库比对
  const gAll = makeGrid([t, ...lib]);
  const rt = raster(t, gAll);
  let best = [];
  for (let i = 0; i < lib.length; i++) {
    let bs = 0, bk = 0;
    for (let k = 0; k < 8; k++) {
      const s1 = iou(rt, raster(rot(lib[i], k), gAll));
      if (s1 > bs) { bs = s1; bk = k; }
      const s2 = iou(rt, raster(rot(mirror(lib[i]), k), gAll));
      if (s2 > bs) { bs = s2; bk = k; }
    }
    best.push({ idx: i, iou: +bs.toFixed(4), k: bk });
  }
  best.sort((a, b) => b.iou - a.iou);
  report[tag] = {
    baseSelf: base === null ? null : +base.toFixed(4),
    top: best.slice(0, 8),
    src: POLY[tag].poly.length
  };
  console.log(tag, '自身已解基线=' + (base === null ? '-' : base.toFixed(4)),
    '| 库内最佳', best.slice(0, 4).map(b => '#' + b.idx + ':' + b.iou + '@' + (b.k * 45) + '°').join(' '));
}
fs.writeFileSync(path.join(OUT, 'match2.json'), JSON.stringify(report, null, 1));
console.log('\n→ tools/figs4/out/match2.json');
