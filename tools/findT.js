/* T 字型检测：把每个轮廓栅格化后与理想 T 模板做 IoU，找出最像 T 的形状
 * 用法：node tools/findT.js
 */
const fs = require('fs');
const path = require('path');
const S = JSON.parse(fs.readFileSync(path.join(__dirname, 'out/shapes.json'), 'utf8'));

const N = 64;
function raster(poly) {
  const bb = [Infinity, Infinity, -Infinity, -Infinity];
  for (const v of poly) { bb[0] = Math.min(bb[0], v[0]); bb[1] = Math.min(bb[1], v[1]); bb[2] = Math.max(bb[2], v[0]); bb[3] = Math.max(bb[3], v[1]); }
  const w = bb[2] - bb[0], h = bb[3] - bb[1];
  const sc = (N - 2) / Math.max(w, h);
  const ox = (N - w * sc) / 2, oy = (N - h * sc) / 2;
  const P = poly.map(v => [ox + (v[0] - bb[0]) * sc, oy + (v[1] - bb[1]) * sc]);
  const m = new Uint8Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const px = x + 0.5, py = y + 0.5;
    let c = false;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
      const a = P[i], b = P[j];
      if ((a[1] > py) !== (b[1] > py) && px < (b[0] - a[0]) * (py - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
    }
    m[y * N + x] = c ? 1 : 0;
  }
  return { m, bb, w, h, sc, ox, oy };
}

/* 理想 T（朝向 0=上横杠+下竖杠, 1=下横杠+上竖杠, 2/3=左右） */
function tMask(orient, hbRatio, wsRatio) {
  const m = new Uint8Array(N * N);
  const W = N - 2, H = N - 2, off = 1;
  const hb = Math.max(2, Math.round(H * hbRatio));      // 横杠高
  const ws = Math.max(2, Math.round(W * wsRatio));      // 竖杠宽
  const x0 = off + Math.round((W - ws) / 2);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let inside = false;
    const xr = x - off, yr = y - off;
    if (xr < 0 || yr < 0 || xr >= W || yr >= H) { m[y * N + x] = 0; continue; }
    if (orient === 0) inside = (yr < hb) || (xr >= x0 - off && xr < x0 - off + ws && yr >= hb);
    if (orient === 1) inside = (yr >= H - hb) || (xr >= x0 - off && xr < x0 - off + ws && yr < H - hb);
    if (orient === 2) inside = (xr < hb) || (yr >= x0 - off && yr < x0 - off + ws && xr >= hb);
    if (orient === 3) inside = (xr >= W - hb) || (yr >= x0 - off && yr < x0 - off + ws && xr < W - hb);
    m[y * N + x] = inside ? 1 : 0;
  }
  return m;
}

function iou(a, b) {
  let inter = 0, uni = 0;
  for (let i = 0; i < a.length; i++) { if (a[i] & b[i]) inter++; if (a[i] | b[i]) uni++; }
  return uni ? inter / uni : 0;
}

const templates = [];
for (let o = 0; o < 4; o++)
  for (let hb = 0.10; hb <= 0.45; hb += 0.05)
    for (let ws = 0.15; ws <= 0.75; ws += 0.05)
      templates.push({ o, hb, ws, m: tMask(o, hb, ws) });

const scored = S.map(s => {
  const r = raster(s.outline);
  let best = 0, bp = null;
  for (const t of templates) {
    const v = iou(r.m, t.m);
    if (v > best) { best = v; bp = t; }
  }
  return { idx: s.idx, iou: best, o: bp.o, hb: +bp.hb.toFixed(2), ws: +bp.ws.toFixed(2), w: r.w, h: r.h, shape: s };
}).sort((a, b) => b.iou - a.iou);

const brief = scored.map(function (x) {
  return { idx: x.idx, iou: +x.iou.toFixed(4), o: x.o, hb: x.hb, ws: x.ws, w: +x.w.toFixed(2), h: +x.h.toFixed(2) };
});
fs.writeFileSync(path.join(__dirname, 'out', 'tscore.json'), JSON.stringify(brief), 'utf8');

console.log('T 相似度前 15：');
for (const x of scored.slice(0, 15)) {
  console.log(`  idx ${String(x.idx).padStart(3)}  IoU ${x.iou.toFixed(3)}  朝向 ${x.o}  横杠高 ${x.hb}  竖杠宽 ${x.ws}  bbox ${x.w.toFixed(2)}x${x.h.toFixed(2)}`);
}
console.log('以 0.85 为门槛的 T 候选数：', scored.filter(x => x.iou >= 0.85).length);
