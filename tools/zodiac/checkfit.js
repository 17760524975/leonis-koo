/* 验收：把 zodiac_exact.json 的 7 块板栅格化，与参考图该图形的「彩色像素掩膜」求 IoU。
 * 同时搜索一个全局旋转 θ，看整体是否被转歪了（θ≠0 说明去旋转没生效）。
 * 用法：node tools/zodiac/checkfit.js
 */
const fs = require('fs');
const path = require('path');
const L = require('./lib.js');
const PNG = require('./png.js');

const img = PNG.decodePNG(path.join(__dirname, 'ref.png'));
const EX = JSON.parse(fs.readFileSync(path.join(__dirname, 'zodiac_exact.json'), 'utf8'));
const fit = JSON.parse(fs.readFileSync(path.join(__dirname, 'zodiac_fit.json'), 'utf8'));

const W = img.w, H = img.h;
const px = (x, y) => {
  const i = (y * W + x) * img.ch;
  return [img.data[i], img.data[i + 1], img.data[i + 2]];
};
/* 彩色像素：饱和度足够，且不是近白 */
function isColor(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  if (mx - mn < 45) return false;           // 灰/白
  if (mn > 235) return false;               // 近白
  return true;
}
const REF = new Uint8Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const [r, g, b] = px(x, y);
  if (isColor(r, g, b)) REF[y * W + x] = 1;
}

const inPoly = (pt, poly) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if (((a[1] > pt[1]) !== (b[1] > pt[1])) && (pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0])) c = !c;
  }
  return c;
};

EX.forEach(lv => {
  const f = fit.find(q => q.name === lv.name);
  const sc = lv.uPx / 96;
  const toPx = v => [(v[0] - 500) * sc + lv.cxPx, (v[1] - 500) * sc + lv.cyPx];
  const polys = lv.pieces.map(p => L.LOCAL[p.id].map(v => {
    const r = L.rot(v, p.ang, p.f);
    return toPx([r[0] * 96 + p.x, r[1] * 96 + p.y]);
  }));
  const cx = lv.cxPx, cy = lv.cyPx;

  const iouAt = th => {
    const a = th * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    const P = polys.map(P0 => P0.map(v => {
      const dx = v[0] - cx, dy = v[1] - cy;
      return [cx + dx * ca - dy * sa, cy + dx * sa + dy * ca];
    }));
    /* 只在图形附近统计 */
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const P0 of P) for (const v of P0) {
      if (v[0] < x0) x0 = v[0]; if (v[0] > x1) x1 = v[0];
      if (v[1] < y0) y0 = v[1]; if (v[1] > y1) y1 = v[1];
    }
    x0 = Math.max(0, Math.floor(x0 - 2)); y0 = Math.max(0, Math.floor(y0 - 2));
    x1 = Math.min(W - 1, Math.ceil(x1 + 2)); y1 = Math.min(H - 1, Math.ceil(y1 + 2));
    let inter = 0, uni = 0, our = 0, ref = 0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const o = P.some(P0 => inPoly([x + 0.5, y + 0.5], P0)) ? 1 : 0;
      const r = REF[y * W + x];
      our += o; ref += r; if (o && r) inter++; if (o || r) uni++;
    }
    return { iou: uni ? inter / uni : 0, our, ref };
  };

  let best = { th: 0, iou: -1 };
  for (let th = -30; th <= 30; th += 1) {
    const r = iouAt(th);
    if (r.iou > best.iou) best = { th, iou: r.iou };
  }
  /* 细搜 */
  let b2 = best;
  for (let th = best.th - 1; th <= best.th + 1; th += 0.25) {
    const r = iouAt(th);
    if (r.iou > b2.iou) b2 = { th, iou: r.iou };
  }
  const base = iouAt(0);
  console.log(lv.name.padEnd(2) + ' 直出IoU=' + base.iou.toFixed(3) +
    '  最佳θ=' + b2.th.toFixed(2) + '° IoU=' + b2.iou.toFixed(3) +
    '  (拟合δ=' + (f ? f.delta.toFixed(2) : '?') + '° 我们面积' + base.our + ' 参考面积' + base.ref + ')');
});
