/* 把 out/shapes.json 里所有轮廓拼成一张 BMP 总览图，便于肉眼挑选关卡剪影 */
const fs = require('fs');
const S = JSON.parse(fs.readFileSync(__dirname + '/out/shapes2.json', 'utf8'));

function inPoly(pt, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[1] > pt[1]) !== (b[1] > pt[1]) && pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}
function bbox(poly) {
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  for (const v of poly) { a = Math.min(a, v[0]); b = Math.min(b, v[1]); c = Math.max(c, v[0]); d = Math.max(d, v[1]); }
  return [a, b, c, d];
}

const FONT = {
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'],
  '7': ['111', '001', '001', '001', '001'],
  '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '001']
};

const COLS = 13, CELL = 132, GAP = 6;
const ROWS = Math.ceil(S.length / COLS);
const W = COLS * (CELL + GAP) + GAP;
const H = ROWS * (CELL + GAP) + GAP;
const buf = Buffer.alloc(W * H * 3, 255);   // 白底

function px(x, y, r, g, b) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = ((H - 1 - y) * W + x) * 3;      // BMP 自下而上
  buf[i] = b; buf[i + 1] = g; buf[i + 2] = r;
}

for (let k = 0; k < S.length; k++) {
  const col = k % COLS, row = (k / COLS) | 0;
  const ox = GAP + col * (CELL + GAP), oy = GAP + row * (CELL + GAP);
  // 边框
  for (let x = 0; x < CELL; x++) { px(ox + x, oy, 210, 210, 210); px(ox + x, oy + CELL - 1, 210, 210, 210); }
  for (let y = 0; y < CELL; y++) { px(ox, oy + y, 210, 210, 210); px(ox + CELL - 1, oy + y, 210, 210, 210); }

  const poly = S[k].outline;
  const bb = bbox(poly);
  const w = bb[2] - bb[0], h = bb[3] - bb[1];
  const pad = 14;
  const sc = Math.min((CELL - pad * 2) / w, (CELL - pad * 2) / h);
  const offX = ox + (CELL - w * sc) / 2, offY = oy + (CELL - h * sc) / 2 + 6;
  for (let y = 0; y < CELL; y++) {
    for (let x = 0; x < CELL; x++) {
      const wx = bb[0] + (x - (offX - ox)) / sc;
      const wy = bb[1] + (y - (offY - oy)) / sc;
      if (inPoly([wx, wy], poly)) px(ox + x, oy + y, 40, 60, 90);
    }
  }
  // 序号（3×5 字体放大 2 倍）
  const label = String(k);
  for (let ci = 0; ci < label.length; ci++) {
    const glyph = FONT[label[ci]];
    for (let gy = 0; gy < 5; gy++) for (let gx = 0; gx < 3; gx++) {
      if (glyph[gy][gx] !== '1') continue;
      for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) {
        px(ox + 4 + ci * 8 + gx * 2 + sx, oy + 4 + gy * 2 + sy, 230, 70, 40);
      }
    }
  }
}

const header = Buffer.alloc(54);
header.write('BM', 0);
header.writeUInt32LE(54 + buf.length, 2);
header.writeUInt32LE(54, 10);
header.writeUInt32LE(40, 14);
header.writeInt32LE(W, 18);
header.writeInt32LE(H, 22);
header.writeUInt16LE(1, 26);
header.writeUInt16LE(24, 28);
header.writeUInt32LE(buf.length, 34);
header.writeInt32LE(2835, 38);
header.writeInt32LE(2835, 42);

fs.writeFileSync(__dirname + '/out/overview2.bmp', Buffer.concat([header, buf]));
console.log(`总览图 ${W}×${H}，${S.length} 个轮廓，网格 ${COLS} 列 × ${ROWS} 行`);
console.log('索引 = 行×' + COLS + ' + 列');
