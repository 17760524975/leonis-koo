/* 把「未吸附的拟合结果」画回参考图 —— 判断拟合本身准不准 */
'use strict';
const { readPng, writePng } = require('./pngio.js');
const SEG = require('./seg.js');
const FIT = require('./fit.js');

const img = readPng(__dirname + '/ref.png');
const idx = SEG.colorIndex(img);
const list = Object.values(SEG.figures(idx, img.w, img.h));
let px = 0; list.forEach(f => { px += f.n; });
const s = Math.sqrt(px / (10 * 16));
const out = Buffer.from(img.data), W = img.w, H = img.h;
function dot(x, y, c) {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const xx = Math.round(x) + dx, yy = Math.round(y) + dy;
    if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
    const d = (yy * W + xx) * 3;
    out[d] = c[0]; out[d + 1] = c[1]; out[d + 2] = c[2];
  }
}
for (let g = 0; g < 10; g++) {
  const sub = list.filter(f => f.fig === g).sort((a, b) => b.n - a.n).slice(0, 7);
  sub.forEach(f => {
    const r = FIT.fitPiece(f, s);
    const P = FIT.LOCAL[r.key].map(v => {
      const q = FIT.rot(v, r.ang, r.fl);
      return [q[0] * s + r.bx + r.cx, q[1] * s + r.by + r.cy];
    });
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length];
      const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) || 1;
      for (let k = 0; k <= n; k++) dot(a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n, [0, 0, 0]);
    }
  });
}
writePng(__dirname + '/out/fit_only.png', W, H, out);
console.log('ok');
