/* 单个字母的「板件 + 剪影」大图：用来目视检查有没有白缝/溢边。
 * 用法：node tools/glyph/one.js W [scale]
 */
const fs = require('fs');
const path = require('path');
const L = require('../zodiac/lib.js');

const EX = JSON.parse(fs.readFileSync(path.join(__dirname, 'letters_exact.json'), 'utf8'));
const NAME = process.argv[2] || 'A';
const S = +(process.argv[3] || 1.6);
const COL = { T1: '#2ad4fa', T2: '#f44df5', S: '#9afd03', P: '#6634fb', T3: '#fded04', T5: '#f49305', T4: '#e50615' };
const lv = EX.find(x => x.name === NAME);

const polys = lv.pieces.map(p => L.LOCAL[p.id].map(v => {
  const r = L.rot(v, p.ang, p.f);
  return [r[0] * 96 + p.x, r[1] * 96 + p.y];
}));
let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
for (const P of polys) for (const v of P) {
  x0 = Math.min(x0, v[0]); x1 = Math.max(x1, v[0]);
  y0 = Math.min(y0, v[1]); y1 = Math.max(y1, v[1]);
}
const PAD = 12;
x0 -= PAD; y0 -= PAD; x1 += PAD; y1 += PAD;
const W = (x1 - x0) * S, H = (y1 - y0) * S;
const tx = v => [(v[0] - x0) * S, (v[1] - y0) * S];
const d = pts => pts.map((v, i) => (i ? 'L' : 'M') + tx(v).map(n => n.toFixed(1)).join(',')).join(' ') + ' Z';

const parts = [];
polys.forEach((P, i) => parts.push(`<path d="${d(P)}" fill="${COL[lv.pieces[i].id]}" stroke="#fff" stroke-width="0.5"/>`));
parts.push(`<path d="${d(lv.outline)}" fill="none" stroke="#111" stroke-width="1.4"/>`);
(lv.holes || []).forEach(h => parts.push(`<path d="${d(h)}" fill="none" stroke="#111" stroke-width="1.4"/>`));

const html = `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;background:#fff}#w{position:relative;width:${W}px;height:${H}px}</style>
<div id="w"><svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join('')}</svg></div>`;
fs.writeFileSync(path.join(__dirname, 'one.html'), html);
console.log('one.html', Math.round(W) + 'x' + Math.round(H), '轮廓', lv.outline.length, '孔', lv.holes.length);
