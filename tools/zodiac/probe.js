const path = require('path');
const { decodePNG, px } = require('./png.js');
const img = decodePNG(path.join(__dirname, 'ref.png'));
const W = img.w, H = img.h;
console.log('img', W, 'x', H, 'ch', img.ch);

/* 前景：非近白 */
const fg = new Uint8Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const [r, g, b] = px(img, x, y);
  fg[y * W + x] = (r > 238 && g > 238 && b > 238) ? 0 : 1;
}
/* 连通域（4 邻）→ 12 图形 */
function cc(mask) {
  const seen = new Uint8Array(W * H), out = [];
  for (let i = 0; i < W * H; i++) {
    if (seen[i] || !mask[i]) continue;
    const st = [i]; seen[i] = 1; let n = 0, sx = 0, sy = 0, x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
    while (st.length) {
      const k = st.pop(); n++; const x = k % W, y = (k / W) | 0;
      sx += x; sy += y; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      const nb = [k - 1, k + 1, k - W, k + W];
      if (x === 0) nb[0] = -1; if (x === W - 1) nb[1] = -1;
      for (const j of nb) { if (j >= 0 && j < W * H && !seen[j] && mask[j]) { seen[j] = 1; st.push(j); } }
    }
    if (n > 300) out.push({ n, cx: sx / n, cy: sy / n, x0, x1, y0, y1 });
  }
  return out;
}
let blobs = cc(fg);
console.log('前景连通域', blobs.length);
blobs.sort((a, b) => (Math.round(a.cy / 60) - Math.round(b.cy / 60)) || (a.cx - b.cx));
blobs.forEach((b, i) => console.log(String(i).padStart(2), 'px', String(b.n).padStart(5),
  'c', b.cx.toFixed(0) + ',' + b.cy.toFixed(0), 'box', (b.x1 - b.x0) + 'x' + (b.y1 - b.y0)));
