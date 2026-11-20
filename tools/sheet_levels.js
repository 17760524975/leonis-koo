/* 关卡轮廓联排图：直接读 js/levels.js，把轮廓画成带关号的 PNG 网格
 * 用途：校对「关名是否名副其实」——必须看图，不能凭 ds 分数猜
 * 用法：node tools/sheet_levels.js [每行格数] [只画有名字的(1)/全部(0)]
 */
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

require(path.join(__dirname, '..', 'js', 'levels.js'));
const L = globalThis.TANGRAM_DATA.levels;

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
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100']
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
function writePNG(file, s) {
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
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])) >>> 0, 0);
    return Buffer.concat([len, t, data, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  fs.writeFileSync(file, Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))
  ]));
}

const COLS = +(process.argv[2] || 12);
const ONLY_NAMED = process.argv[3] === '1';
const CELL = +(process.argv[4] || 130);
const PAD = 8, LABEL = 16;

// 第三个参数可以是 "1"=只看有名字的、"0"=全部，或逗号分隔的关号，如 "6,8,13,21,48"
const SEL = process.argv[3] || '0';
let list;
if (SEL === '1') list = L.filter(l => l.name);
else if (SEL === '0') list = L;
else { const ids = SEL.split(',').map(Number); list = ids.map(i => L[i - 1]).filter(Boolean); }
const rows = Math.ceil(list.length / COLS);
const W = COLS * CELL, H = rows * (CELL + LABEL);
const s = surface(W, H);

list.forEach((lv, k) => {
  const col = k % COLS, row = Math.floor(k / COLS);
  const ox = col * CELL, oy = row * (CELL + LABEL);
  for (let x = 0; x < CELL; x++) { s.px(ox + x, oy, [225, 229, 236]); s.px(ox + x, oy + CELL - 1, [225, 229, 236]); }
  for (let y = 0; y < CELL; y++) { s.px(ox, oy + y, [225, 229, 236]); s.px(ox + CELL - 1, oy + y, [225, 229, 236]); }
  const xs = lv.outline.map(v => v[0]), ys = lv.outline.map(v => v[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const bw = x1 - x0, bh = y1 - y0;
  const sc = Math.min((CELL - PAD * 2) / bw, (CELL - PAD * 2 - 4) / bh);
  const dx = ox + (CELL - bw * sc) / 2, dy = oy + (CELL - 4 - bh * sc) / 2;
  s.fill(lv.outline.map(v => [dx + (v[0] - x0) * sc, dy + (v[1] - y0) * sc]), [92, 132, 92]);
  s.text(String(lv.id), ox + 4, oy + CELL + 3, [40, 40, 40], 1);
});

const out = path.join(__dirname, 'out', ONLY_NAMED ? 'levels_named.png' : 'levels_all.png');
writePNG(out, s);
console.log('wrote', out, W + 'x' + H, list.length, 'levels');
if (ONLY_NAMED) list.forEach(l => console.log('  ' + l.id + '  ' + l.name));
