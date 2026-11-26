/* 叠加核对：把反解出的板轮廓画回参考图，一眼看出「哪块歪了」
 * 白线 = 解，底图 = 原图。线贴合色块边缘就说明这块位置与朝向都对。
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { readPng, writePng } = require('./pngio.js');
const SEG = require('./seg.js');
const FIT = require('./fit.js');
const SNAP = require('./snap.js');

const img = readPng(path.join(__dirname, 'ref.png'));
const idx = SEG.colorIndex(img);
const figs = SEG.figures(idx, img.w, img.h);
const list = Object.values(figs);
let px = 0; list.forEach(f => { px += f.n; });
const s = Math.sqrt(px / (10 * 16));
const J = JSON.parse(fs.readFileSync(path.join(__dirname, 'dancers_exact.json'), 'utf8'));

/* 每个图案的原点 */
const origins = [];
for (let g = 0; g < 10; g++) {
  const sub = list.filter(f => f.fig === g).sort((a, b) => b.n - a.n).slice(0, 7);
  let gx0 = 1e9, gy0 = 1e9;
  sub.forEach(f => { gx0 = Math.min(gx0, f.bx); gy0 = Math.min(gy0, f.by); });
  origins.push({ gx0, gy0 });
}

const out = Buffer.from(img.data);
const W = img.w, H = img.h;
function drawSeg(x0, y0, x1, y1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
  for (let i = 0; i <= n; i++) {
    const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      const d = (yy * W + xx) * 3;
      out[d] = 20; out[d + 1] = 20; out[d + 2] = 20;
    }
  }
}

J.forEach((lv, g) => {
  const o = origins[g];
  lv.pieces.forEach(p => {
    const base = FIT.LOCAL[p.id].map(v => SNAP.rot(v, p.angle, p.flipped));
    const pts = base.map(v => [v[0] + p.x / 96, v[1] + p.y / 96]);
    const px2 = pts.map(v => [v[0] * s + o.gx0, v[1] * s + o.gy0]);
    for (let i = 0; i < px2.length; i++) {
      const a = px2[i], b = px2[(i + 1) % px2.length];
      drawSeg(a[0], a[1], b[0], b[1]);
    }
  });
});

fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
const file = path.join(__dirname, 'out', 'overlay.png');
writePng(file, W, H, out);
console.log('写出', file);
