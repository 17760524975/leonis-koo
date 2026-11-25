/* 把拟合结果直接叠在参考图上，像素坐标对齐，用来目视检查「拟合对不对」。
 * 用法：node tools/glyph/overlay.js [字母] [缩放]
 */
const fs = require('fs');
const path = require('path');
const L = require('../zodiac/lib.js');

const EX = JSON.parse(fs.readFileSync(path.join(__dirname, 'letters_fit.json'), 'utf8'));
const ONLY = process.argv[2] || '';
const S = +(process.argv[3] || 8);

const parts = [];
const COL = { T1: '#2ad4fa', T2: '#f44df5', S: '#9afd03', P: '#6634fb', T3: '#fded04', T5: '#f49305', T4: '#e50615' };
const use = EX.filter(lv => !ONLY || lv.name === ONLY);

/* 画面只框住选中的字母（前后各留 14px），省得截一张 3200×2464 的大图 */
let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
use.forEach(lv => lv.pieces.forEach(p => {
  L.LOCAL[p.id].forEach(v => {
    const r = L.rot(v, p.ang, p.f);
    const x = r[0] * lv.u + p.cx, y = r[1] * lv.u + p.cy;
    bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x);
    by0 = Math.min(by0, y); by1 = Math.max(by1, y);
  });
}));
const PAD = 14;
bx0 = Math.floor(bx0 - PAD); by0 = Math.floor(by0 - PAD);
bx1 = Math.ceil(bx1 + PAD); by1 = Math.ceil(by1 + PAD);
const CW = (bx1 - bx0) * S, CH = (by1 - by0) * S;

use.forEach(lv => {
  lv.pieces.forEach(p => {
    const pts = L.LOCAL[p.id].map(v => {
      const r = L.rot(v, p.ang, p.f);
      return [(r[0] * lv.u + p.cx) * S, (r[1] * lv.u + p.cy) * S];
    });
    const d = pts.map((v, i) => (i ? 'L' : 'M') + (v[0] - bx0 * S).toFixed(1) + ',' + (v[1] - by0 * S).toFixed(1)).join(' ') + ' Z';
    parts.push(`<path d="${d}" fill="${COL[p.id]}" fill-opacity="0.55" stroke="#111" stroke-width="0.8"/>`);
  });
});

const html = `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;background:#fff;overflow:hidden}
#w{position:relative;width:${CW}px;height:${CH}px;overflow:hidden}
#w img{position:absolute;left:${-bx0 * S}px;top:${-by0 * S}px;width:${800 * S}px;height:${616 * S}px;image-rendering:pixelated}
#w svg{position:absolute;left:0;top:0}
</style>
<div id="w"><img src="ref.png"><svg width="${CW}" height="${CH}" viewBox="0 0 ${CW} ${CH}">${parts.join('')}</svg></div>`;
fs.writeFileSync(path.join(__dirname, 'overlay.html'), html);
console.log('写出 overlay.html');
