/* 把 letters_exact.json 的 26 个字母渲染成缩略图（配色与参考图一致，便于直接对照） */
const fs = require('fs');
const path = require('path');
const L = require('../zodiac/lib.js');

const EX = JSON.parse(fs.readFileSync(path.join(__dirname, 'letters_exact.json'), 'utf8'));
/* 与参考图同色：蓝/粉=大三角、绿=正方形、紫=平行四边形、淡黄=中三角、深黄/深红=小三角 */
const COL = {
  T1: '#2ad4fa', T2: '#f44df5', S: '#9afd03', P: '#6634fb',
  T3: '#fded04', T5: '#f49305', T4: '#e50615'
};

const CELL = 230, PAD = 14;
const cols = 7, rows = 4;
const W = cols * CELL, H = rows * CELL;
const parts = [];
EX.forEach((lv, k) => {
  const gx = (k % cols) * CELL, gy = Math.floor(k / cols) * CELL;
  const polys = lv.pieces.map(p => L.LOCAL[p.id].map(v => {
    const r = L.rot(v, p.ang, p.f);
    return [r[0] * 96 + p.x, r[1] * 96 + p.y];
  }));
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const P of polys) for (const v of P) {
    if (v[0] < x0) x0 = v[0]; if (v[0] > x1) x1 = v[0];
    if (v[1] < y0) y0 = v[1]; if (v[1] > y1) y1 = v[1];
  }
  const sc = Math.min((CELL - PAD * 2) / (x1 - x0), (CELL - PAD * 2 - 16) / (y1 - y0));
  const ox = gx + (CELL - (x1 - x0) * sc) / 2, oy = gy + 20 + (CELL - 20 - (y1 - y0) * sc) / 2;
  const tp = v => [ox + (v[0] - x0) * sc, oy + (v[1] - y0) * sc];
  lv.pieces.forEach((p, i) => {
    const d = polys[i].map(tp).map((v, j) => (j ? 'L' : 'M') + v.map(n => n.toFixed(1)).join(',')).join(' ') + ' Z';
    parts.push(`<path d="${d}" fill="${COL[p.id]}" stroke="#fff" stroke-width="1"/>`);
  });
  parts.push(`<text x="${gx + 14}" y="${gy + 18}" font-size="14" fill="#555" font-family="system-ui,sans-serif">${lv.name}</text>`);
});
const html = `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;background:#fff}svg{display:block}</style>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="#fff"/>
${parts.join('\n')}
</svg>`;
fs.writeFileSync(path.join(__dirname, 'preview.html'), html);
console.log('写出 preview.html');
