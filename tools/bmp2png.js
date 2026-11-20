/* 把 tools/out/*.bmp 转成 PNG（仅供人工验收看图，不进交付包）
 * 用 zlib 手写最小 PNG 编码，零依赖。用法：node tools/bmp2png.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, 'out');

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

function readBmp(buf) {
  const dataOff = buf.readUInt32LE(10);
  const w = buf.readInt32LE(18);
  const hRaw = buf.readInt32LE(22);
  const bpp = buf.readUInt16LE(28);
  const h = Math.abs(hRaw);
  const bottomUp = hRaw > 0;
  const rowSize = Math.floor((bpp * w + 31) / 32) * 4;
  const rgb = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) {
    const srcY = bottomUp ? h - 1 - y : y;
    const row = dataOff + srcY * rowSize;
    for (let x = 0; x < w; x++) {
      const p = row + x * (bpp / 8);
      const o = (y * w + x) * 3;
      if (bpp === 24) { rgb[o] = buf[p + 2]; rgb[o + 1] = buf[p + 1]; rgb[o + 2] = buf[p]; }
      else { rgb[o] = buf[p]; rgb[o + 1] = buf[p]; rgb[o + 2] = buf[p]; }
    }
  }
  return { w, h, rgb };
}

function writePng(file, img) {
  const { w, h, rgb } = img;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
  fs.writeFileSync(file, png);
  return png.length;
}

for (const f of fs.readdirSync(OUT)) {
  if (!f.endsWith('.bmp')) continue;
  const img = readBmp(fs.readFileSync(path.join(OUT, f)));
  const n = writePng(path.join(OUT, f.replace(/\.bmp$/, '.png')), img);
  console.log('写出', f.replace(/\.bmp$/, '.png'), (n / 1024).toFixed(0) + 'KB');
}
