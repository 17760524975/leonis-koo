/* 焊接效果体检：10 个图案的共用顶点率 / 面积差 / 压叠 */
'use strict';
const path = require('path');
const { readPng } = require('./pngio.js');
const SEG = require('./seg.js');
const FIT = require('./fit.js');
const WELD = require('./weld.js');
const UNION = require(path.join(__dirname, '..', 'zodiac', 'union.js'));

const { writePng } = require('./pngio.js');
const img = readPng(path.join(__dirname, 'ref.png'));
const idx = SEG.colorIndex(img);
const list = Object.values(SEG.figures(idx, img.w, img.h));
let px = 0; list.forEach(f => { px += f.n; });
const s = Math.sqrt(px / (10 * 16));
const SHAPES = ['T1', 'T3', 'S', 'T4', 'P'];
function comb(n, k) { const o = [], c = []; (function r(st) { if (c.length === k) { o.push(c.slice()); return; } for (let i = st; i < n; i++) { c.push(i); r(i + 1); c.pop(); } })(0); return o; }
const C2 = comb(7, 2);
function allocate(aoi) {
  let best = null;
  for (const big of C2) {
    const r1 = [0, 1, 2, 3, 4, 5, 6].filter(i => big.indexOf(i) < 0);
    for (const mid of r1) {
      const r2 = r1.filter(i => i !== mid);
      for (const sq of r2) {
        const r3 = r2.filter(i => i !== sq);
        for (let a = 0; a < r3.length; a++) for (let b = a + 1; b < r3.length; b++) {
          const sm = [r3[a], r3[b]], pl = r3.filter(i => i !== sm[0] && i !== sm[1]);
          if (pl.length !== 1) continue;
          const sum = aoi[big[0]].T1 + aoi[big[1]].T1 + aoi[mid].T3 + aoi[sq].S + aoi[sm[0]].T4 + aoi[sm[1]].T4 + aoi[pl[0]].P;
          if (!best || sum > best.sum) {
            const asg = []; big.forEach(i => { asg[i] = 'T1'; });
            asg[mid] = 'T3'; asg[sq] = 'S'; asg[sm[0]] = 'T4'; asg[sm[1]] = 'T4'; asg[pl[0]] = 'P';
            best = { sum, asg };
          }
        }
      }
    }
  }
  return best;
}
const areaOf = p => { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[i], r = p[(i + 1) % p.length]; a += q[0] * r[1] - r[0] * q[1]; } return Math.abs(a) / 2; };
const r2 = v => Math.round(v * 100) / 100;

const out = [];
for (let g = 0; g < 10; g++) {
  const sub = list.filter(f => f.fig === g).sort((a, b) => b.n - a.n).slice(0, 7);
  let gx0 = 1e9, gy0 = 1e9;
  sub.forEach(f => { gx0 = Math.min(gx0, f.bx); gy0 = Math.min(gy0, f.by); });
  const raw = sub.map(f => { const r = FIT.fitPiece(f, s); return { per: r.per, bx: r.bx, by: r.by, mask: f }; });
  const aoi = raw.map(r => { const o = {}; SHAPES.forEach(k => { o[k] = r.per[k].iou; }); return o; });
  const alloc = allocate(aoi);
  const fits = raw.map((r, i) => {
    const c = r.per[alloc.asg[i]];
    return { key: alloc.asg[i], ang: c.ang, fl: c.fl, cx: (r.bx + c.cx - gx0) / s, cy: (r.by + c.cy - gy0) / s, mask: r.mask };
  });
  const res = fits.map(f => ({
    key: f.key, ang: f.ang, fl: f.fl, src: f, x: f.cx, y: f.cy,
    pts: FIT.LOCAL[f.key].map(v => { const q = FIT.rot(v, f.ang, f.fl); return [q[0] + f.cx, q[1] + f.cy]; })
  }));
  const polys = res.map(p => p.pts);
  const st = WELD.sharedStat(polys);
  const sp = UNION.splitLoops(UNION.unionPolys(polys, 0.12), polys);
  const sumA = polys.reduce((a, p) => a + areaOf(p), 0);
  const outA = areaOf(sp.outer) - (sp.holes || []).reduce((a, h) => a + areaOf(h), 0);
  let maxOv = 0;
  for (let i = 0; i < polys.length; i++) for (let j = i + 1; j < polys.length; j++) {
    const ov = globalThis.TANGRAM_GEOM.convexOverlapArea(polys[i], polys[j]);
    if (ov > maxOv) maxOv = ov;
  }
  console.log(('图案 ' + (g + 1)).padEnd(6),
    '共用', (st.shared + '/' + st.total).padEnd(7), ((st.shared / st.total * 100).toFixed(0) + '%').padEnd(5),
    '面积差', ((outA - sumA) / sumA * 100).toFixed(2) + '%', '压叠', maxOv.toFixed(3), '点', sp.outer.length);
  res.forEach(r => {
    r.pts.forEach((p, i) => {
      const q = res[(i + 1) % r.pts.length];
    });
  });
  /* 画回参考图 */
  if (g === 0) globalThis.__IMG = Buffer.from(img.data).fill(0) && null;
  out.push(res);
}

/* 叠加核对图（黑线 = 原始拟合位置，不搬动） */
const px2 = (v, base) => [v[0] * s + base.gx0, v[1] * s + base.gy0];
const over = Buffer.from(img.data);
function line(a, b) {
  const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) || 1;
  for (let k = 0; k <= n; k++) {
    const x = Math.round(a[0] + (b[0] - a[0]) * k / n), y = Math.round(a[1] + (b[1] - a[1]) * k / n);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= img.w || yy >= img.h) continue;
      const d = (yy * img.w + xx) * 3;
      over[d] = 0; over[d + 1] = 0; over[d + 2] = 0;
    }
  }
}
out.forEach((res, g) => {
  const sub = list.filter(f => f.fig === g).sort((a, b) => b.n - a.n).slice(0, 7);
  let gx0 = 1e9, gy0 = 1e9;
  sub.forEach(f => { gx0 = Math.min(gx0, f.bx); gy0 = Math.min(gy0, f.by); });
  res.forEach(r => {
    const P = r.pts.map(v => px2(v, { gx0, gy0 }));
    for (let i = 0; i < P.length; i++) line(P[i], P[(i + 1) % P.length]);
  });
});
writePng(path.join(__dirname, 'out/overlay_raw.png'), img.w, img.h, over);
console.log('写出 out/overlay_raw.png');
module.exports = out;
