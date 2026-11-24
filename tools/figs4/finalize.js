/* 从求解结果生成最终 6 个图形（统一的「格点系 → 照片系」口径）
 *
 * 踩过的坑：fitTri 的 ring 已经变换到照片系，导出时若再变换一次就会二次平移 ——
 * 轮廓与板件错位、判定覆盖率只有 0.38。所以这里不再信任任何中间产物，
 * **轮廓一律由 4 块板的并集在格点系里重算**（三角网格边界追踪），再整体旋到照片系。
 *
 * 用法：node tools/figs4/finalize.js
 */
const fs = require('fs');
const path = require('path');
const T = require('./tri.js');

const HERE = __dirname, OUT = path.join(HERE, 'out');
const WARP = JSON.parse(fs.readFileSync(path.join(OUT, 'warp.json'), 'utf8'));
const FIT = JSON.parse(fs.readFileSync(path.join(OUT, 'fitTri.json'), 'utf8'));

const rotPts = (p, deg) => {
  const t = deg * Math.PI / 180, co = Math.cos(t), si = Math.sin(t);
  return p.map(v => [v[0] * co - v[1] * si, v[0] * si + v[1] * co]);
};
const r4 = v => Math.round(v * 4) / 4;
const POLY = JSON.parse(fs.readFileSync(path.join(OUT, 'poly.json'), 'utf8'));

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

/* 去掉「半格偏移」：fitTri 输出的是 格点+偏移 的坐标，平移量是 (ox,oy)，
 * 回到格点系后要先把这层整体平移减掉，顶点才落在 0.5 格点上。
 * 平移不影响形状（导出时会重新居中），但三角网格要求严格落在格点上。 */
function deOffset(pieces) {
  const all = [];
  for (const p of pieces) for (const v of p.poly) all.push(v);
  const med = (arr) => {
    const a = arr.slice().sort((x, y) => x - y);
    return a[Math.floor(a.length / 2)];
  };
  const ox = med(all.map(v => v[0] - Math.round(v[0] * 2) / 2));
  const oy = med(all.map(v => v[1] - Math.round(v[1] * 2) / 2));
  return pieces.map(p => ({ id: p.id, poly: p.poly.map(v => [v[0] - ox, v[1] - oy]) }));
}

function unionInLattice(pieces) {
  const tris = [];
  for (const pc of pieces) {
    const pl = pc.poly.map(v => [Math.round(v[0] * 4), Math.round(v[1] * 4)]);
    const t = T.polyTris(pl);
    tris.push(...t);
  }
  const set = [...new Set(tris)];
  if (set.length !== 96) throw new Error('并集三角形 ' + set.length + ' ≠ 96');
  return T.simplify(T.trisOutline(set)).map(v => [v[0] / 4, v[1] / 4]);
}

const out = {};
for (const tag of ['f1', 'f2', 'f3', 'f4', 'f5', 'f6']) {
  let piecesL, pre, src;
  if (WARP[tag] && WARP[tag].ok) {
    // warp 输出的 pieces 已经是格点系
    piecesL = WARP[tag].pieces;
    pre = WARP[tag].pre;
    src = 'exact';
  } else {
    // fitTri 输出的是照片系，先转回格点系
    const f = FIT[tag];
    pre = f.pre;
    piecesL = deOffset(f.pieces.map(p => ({ id: p.id, poly: rotPts(p.poly, -pre) })));
    src = 'approx(' + f.hd + ')';
  }
  // 校验：回到格点系后顶点必须落在 0.5 格点上（容差 1e-6）
  for (const pc of piecesL) {
    for (const v of pc.poly) {
      if (Math.abs(v[0] * 4 - Math.round(v[0] * 4)) > 1e-6 ||
          Math.abs(v[1] * 4 - Math.round(v[1] * 4)) > 1e-6) {
        throw new Error(tag + ' ' + pc.id + ' 顶点不在格点上: ' + v);
      }
    }
  }
  const ringL = unionInLattice(piecesL);
  /* 朝向不靠约定猜：把并集在 8 个 45° 朝向上各转一次，取与照片「顶点到边界距离」最小者。
   * warp.js 与 fitTri.js 的旋转正负号约定本来相反，这样处理一劳永逸。 */
  const raw = POLY[tag].poly;
  let bestK = 0, bestHd = Infinity, hds = [];
  for (let k = 0; k < 8; k++) {
    const ring = ringL.map(v => rotPts([v], k * 45)[0]);
    const hd = shapeDist(ring, raw);
    hds.push(hd.toFixed(3));
    if (hd < bestHd) { bestHd = hd; bestK = k; }
  }
  const outline = ringL.map(v => rotPts([v], bestK * 45)[0]);
  const pieces = piecesL.map(p => ({ id: p.id, poly: p.poly.map(v => rotPts([v], bestK * 45)[0]) }));
  out[tag] = { src, rot: bestK * 45, hd: +bestHd.toFixed(4), outline, pieces };
  console.log(tag, src, '| 取朝向', bestK * 45 + '°', '| 形距', bestHd.toFixed(3),
    '| 8 向', hds.join(' '), '| 顶点', outline.length);
}
fs.writeFileSync(path.join(OUT, 'final.json'), JSON.stringify(out, null, 1));
console.log('\n→ tools/figs4/out/final.json');
