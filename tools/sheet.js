/* 轮廓联排图（验收用）：把 shapes.json 里所有轮廓画成一张带序号的 PNG 网格
 * 零依赖：自绘多边形填充 + zlib 写 PNG。用法：node tools/sheet.js [每页列数]
 */
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const S = JSON.parse(fs.readFileSync(path.join(__dirname, 'out/shapes.json'), 'utf8'));

/* ---------- 极简 5x7 数字字体（序号用，避免依赖字体库） ---------- */
const DIGIT = {
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000']
};

function surface(W, H) {
  const buf = Buffer.alloc(W * H * 3, 255);
  return {
    W, H, buf,
    px(x, y, c) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const i = (y * W + x) * 3;
      buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2];
    },
    /* 扫描线多边形填充（非零/奇偶规则） */
    fill(poly, c) {
      let minY = Infinity, maxY = -Infinity;
      for (const v of poly) { if (v[1] < minY) minY = v[1]; if (v[1] > maxY) maxY = v[1]; }
      for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
        const yc = y + 0.5, xs = [];
        for (let i = 0; i < poly.length; i++) {
          const a = poly[i], b = poly[(i + 1) % poly.length];
          if ((a[1] > yc) !== (b[1] > yc)) xs.push(a[0] + (yc - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
        }
        xs.sort((p, q) => p - q);
        for (let k = 0; k + 1 < xs.length; k += 2) {
          for (let x = Math.floor(xs[k]); x <= Math.ceil(xs[k + 1]); x++) this.px(x, y, c);
        }
      }
    },
    text(str, x, y, c, sc) {
      sc = sc || 1;
      let cx = x;
      for (const ch of String(str)) {
        const g = DIGIT[ch];
        if (g) for (let r = 0; r < 7; r++) for (let q = 0; q < 5; q++)
          if (g[r][q] === '1') for (let dy = 0; dy < sc; dy++) for (let dx = 0; dx < sc; dx++)
            this.px(cx + q * sc + dx, y + r * sc + dy, c);
        cx += 6 * sc;
      }
    }
  };
}

function writePNG(file, s, scale) {
  const W = s.W, H = s.H;
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 3 + 1)] = 0;
    s.buf.copy(raw, y * (W * 3 + 1) + 1, y * W * 3, (y + 1) * W * 3);
  }
  const idat = zlib.deflateSync(raw, { level: 6 });
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const t = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.concat([t, data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(crcBuf) >>> 0, 0);
    return Buffer.concat([len, t, data, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  fs.writeFileSync(file, Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))
  ]));
}

let TBL = null;
function crc32(buf) {
  if (!TBL) {
    TBL = new Int32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; TBL[n] = c; }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = TBL[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ 0xffffffff;
}

/* ---------- 排版 ---------- */
const COLS = +(process.argv[2] || 16);
const CELL = 96, PAD = 8, LABEL_H = 16;
const pageSize = +(process.argv[3] || 184);

function drawPage(list, from) {
  const rows = Math.ceil(list.length / COLS);
  const W = COLS * CELL, H = rows * (CELL + LABEL_H);
  const s = surface(W, H);
  list.forEach((sh, k) => {
    const col = k % COLS, row = Math.floor(k / COLS);
    const ox = col * CELL, oy = row * (CELL + LABEL_H);
    // 单元格边框
    for (let x = 0; x < CELL; x++) { s.px(ox + x, oy, [225, 229, 236]); s.px(ox + x, oy + CELL - 1, [225, 229, 236]); }
    for (let y = 0; y < CELL; y++) { s.px(ox, oy + y, [225, 229, 236]); s.px(ox + CELL - 1, oy + y, [225, 229, 236]); }
    const bb = sh.bbox, bw = bb[2] - bb[0], bh = bb[3] - bb[1];
    const sc = Math.min((CELL - PAD * 2) / bw, (CELL - PAD * 2 - 4) / bh);
    const dx = ox + (CELL - bw * sc) / 2, dy = oy + (CELL - 4 - bh * sc) / 2;
    const poly = sh.outline.map(v => [dx + (v[0] - bb[0]) * sc, dy + (v[1] - bb[1]) * sc]);
    s.fill(poly, [92, 132, 92]);
    // 序号
    s.text(String(sh.idx), ox + 4, oy + CELL + 3, [40, 40, 40], 1);
  });
  return s;
}

const all = S;
for (let p = 0; p * pageSize < all.length; p++) {
  const slice = all.slice(p * pageSize, (p + 1) * pageSize);
  const s = drawPage(slice, p * pageSize);
  const f = path.join(__dirname, 'out', `sheet_${p + 1}.png`);
  writePNG(f, s);
  console.log('wrote', f, s.W + 'x' + s.H, slice.length, 'shapes');
}
