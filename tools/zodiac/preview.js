/* 把 zodiac_exact.json 的 12 个图形渲染成「关卡缩略图」样式，用于目视确认造型是否可辨认。
 * 用法：node tools/zodiac/preview.js  → preview.html
 */
const fs = require('fs');
const path = require('path');
const L = require('./lib.js');

const EX = JSON.parse(fs.readFileSync(path.join(__dirname, 'zodiac_exact.json'), 'utf8'));
const COL = { T1: '#e94b3c', T2: '#f2c14e', S: '#e08b3c', T3: '#4caf50', P: '#3aa6c9', T4: '#c04ec0', T5: '#7b52ab' };

const CELL = 300, PAD = 16;
const cols = 4, rows = 3;
const W = cols * CELL, H = rows * CELL;
const parts = [];
EX.forEach((lv, k) => {
  const gx = (k % cols) * CELL, gy = Math.floor(k / cols) * CELL;
  /* 图形世界坐标 bbox（世界 1000 棋盘内） */
  const polys = lv.pieces.map(p => L.LOCAL[p.id].map(v => {
    const r = L.rot(v, p.ang, p.f);
    return [r[0] * 96 + p.x, r[1] * 96 + p.y];
  }));
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const P of polys) for (const v of P) {
    if (v[0] < x0) x0 = v[0]; if (v[0] > x1) x1 = v[0];
    if (v[1] < y0) y0 = v[1]; if (v[1] > y1) y1 = v[1];
  }
  const sc = Math.min((CELL - PAD * 2) / (x1 - x0), (CELL - PAD * 2 - 18) / (y1 - y0));
  const ox = gx + (CELL - (x1 - x0) * sc) / 2, oy = gy + 18 + (CELL - 18 - (y1 - y0) * sc) / 2;
  const tp = v => [ox + (v[0] - x0) * sc, oy + (v[1] - y0) * sc];
  lv.pieces.forEach((p, i) => {
    const d = polys[i].map(tp).map((v, j) => (j ? 'L' : 'M') + v.map(n => n.toFixed(1)).join(',')).join(' ') + ' Z';
    parts.push(`<path d="${d}" fill="${COL[p.id]}" stroke="#fff" stroke-width="1.2"/>`);
  });
  parts.push(`<text x="${gx + CELL / 2}" y="${gy + 16}" font-size="15" text-anchor="middle" fill="#333" font-family="system-ui,sans-serif">${lv.name}</text>`);
});
const html = `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;background:#fff}svg{display:block}</style>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="#fff"/>
${parts.join('\n')}
</svg>`;
fs.writeFileSync(path.join(__dirname, 'preview.html'), html);
console.log('写出 preview.html');
