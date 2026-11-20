/* 极简 PNG 读取（验收用：采样像素/找色块边界），零依赖。
 * 只支持 8bit RGB/RGBA、非隔行（Chromium 截图就是这种）。
 */
const fs = require('fs');
const zlib = require('zlib');

function readPng(file) {
  const b = fs.readFileSync(file);
  let off = 8;
  let w = 0, h = 0, bpp = 0;
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
      if (!bpp) throw new Error('unsupported colorType ' + colorType);
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * bpp;
  const out = Buffer.alloc(w * h * 3);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const ft = raw[y * (stride + 1)];
    const line = Buffer.from(raw.slice(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? line[x - bpp] : 0;
      const up = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      let v = line[x];
      if (ft === 1) v += a;
      else if (ft === 2) v += up;
      else if (ft === 3) v += (a + up) >> 1;
      else if (ft === 4) {
        const p = a + up - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? up : c);
      }
      line[x] = v & 0xff;
    }
    for (let x = 0; x < w; x++) {
      const s = x * bpp, d = (y * w + x) * 3;
      out[d] = line[s]; out[d + 1] = line[s + 1]; out[d + 2] = line[s + 2];
    }
    prev = line;
  }
  return { w, h, px: out };
}

function at(img, x, y) {
  const i = (y * img.w + x) * 3;
  return [img.px[i], img.px[i + 1], img.px[i + 2]];
}

module.exports = { readPng, at };

if (require.main === module) {
  const img = readPng(require('path').resolve(process.argv[2]));
  console.log('尺寸', img.w + 'x' + img.h);
  const ys = [0, Math.floor(img.h * 0.05), Math.floor(img.h * 0.3), Math.floor(img.h * 0.5), Math.floor(img.h * 0.9), img.h - 1];
  for (const y of ys) {
    const row = [];
    for (const fx of [0.02, 0.1, 0.25, 0.5, 0.75, 0.9, 0.98]) {
      row.push(Math.round(fx * img.w) + ':' + at(img, Math.round(fx * img.w), y).join(','));
    }
    console.log('y=' + y, row.join('  '));
  }
}
