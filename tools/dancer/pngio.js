/* 极简 PNG 读写（零依赖）：只支持 8bit RGB / RGBA，非交错。
 * 与 tools/zoom_png.js 同一套实现，抽出来给舞者反解脚本共用。
 */
'use strict';
const fs = require('fs');
const zlib = require('zlib');

function readPng(file) {
  const b = fs.readFileSync(file);
  let off = 8, w = 0, h = 0, bpp = 0;
  const idat = [];
  while (off < b.length) {
    const len = b.readUInt32BE(off);
    const type = b.toString('ascii', off + 4, off + 8);
    const data = b.slice(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      const depth = data[8], colorType = data[9];
      if (depth !== 8) throw new Error('only 8bit');
      bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
      if (!bpp) throw new Error('bad colorType ' + colorType);
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * bpp;
  const out = Buffer.alloc(w * h * 3);
  const cur = Buffer.alloc(stride), prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const ft = raw[y * (stride + 1)];
    raw.copy(cur, 0, y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0, bb = prev[x], c = x >= bpp ? prev[x - bpp] : 0;
      let v = cur[x];
      if (ft === 1) v += a;
      else if (ft === 2) v += bb;
      else if (ft === 3) v += (a + bb) >> 1;
      else if (ft === 4) {
        const p = a + bb - c, pa = Math.abs(p - a), pb = Math.abs(p - bb), pc = Math.abs(p - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? bb : c);
      }
      cur[x] = v & 255;
    }
    for (let x = 0; x < w; x++) {
      const s = x * bpp, d = (y * w + x) * 3;
      out[d] = cur[s]; out[d + 1] = cur[s + 1]; out[d + 2] = cur[s + 2];
    }
    cur.copy(prev);
  }
  return { w, h, data: out };
}

let _T = null;
function crc32(buf) {
  if (!_T) {
    _T = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      _T[n] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = _T[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return c ^ -1;
}

function writePng(file, w, h, rgb) {
  const stride = w * 3;
  const raw = Buffer.alloc(h * (stride + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0;
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  const chunks = [];
  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td) >>> 0, 0);
    return Buffer.concat([len, td, c]);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  chunks.push(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  chunks.push(chunk('IHDR', ihdr));
  chunks.push(chunk('IDAT', idat));
  chunks.push(chunk('IEND', Buffer.alloc(0)));
  fs.writeFileSync(file, Buffer.concat(chunks));
}

module.exports = { readPng, writePng };
