/* 把重建出来的多边形叠到参考图上，用于目视校验
 * 用法：node tools/zodiac/render_overlay.js
 *
 * 叠法：我们的 7 块板统一填成半透明深灰（不描边）。
 *   · 参考图彩色区域被灰盖住 = 覆盖正确
 *   · 还剩彩色（亮）= 我们缺了一块
 *   · 灰色溢到白底上（灰斑）= 我们多出来一块
 * 这样一眼就能看出错位，不会被「颜色恰好相近」骗过去。
 */
const fs = require('fs');
const path = require('path');
const L = require('./lib.js');

const data = fs.readFileSync(path.join(__dirname, 'ref.png')).toString('base64');
const EX = JSON.parse(fs.readFileSync(path.join(__dirname, 'zodiac_exact.json'), 'utf8'));

const Z = 2, W = 800, H = 533;
const parts = [];

/* 传环境变量 FIG=猴 可只看单图并放大 4 倍 */
const only = process.env.FIG || '';
const zoom = +(process.env.ZOOM || 1);

EX.forEach(lv => {
  if (only && lv.name !== only) return;
  const sc = lv.uPx / 96;
  const toPx = v => [((v[0] - 500) * sc + lv.cxPx) * Z, ((v[1] - 500) * sc + lv.cyPx) * Z];
  lv.pieces.forEach(p => {
    const pts = L.LOCAL[p.id].map(v => {
      const r = L.rot(v, p.ang, p.f);
      return [r[0] * 96 + p.x, r[1] * 96 + p.y];
    }).map(toPx);
    const d = pts.map((v, i) => (i ? 'L' : 'M') + v.map(n => n.toFixed(1)).join(',')).join(' ') + ' Z';
    parts.push(`<path d="${d}" fill="#222" fill-opacity="0.55" stroke="#222" stroke-width="0.8" stroke-opacity="0.55"/>`);
  });
  /* 剪影轮廓再用红色细线画一遍，方便看外沿是否贴合 */
  const od = lv.outline.map(v => toPx(v)).map((v, i) => (i ? 'L' : 'M') + v.map(n => n.toFixed(1)).join(',')).join(' ') + ' Z';
  parts.push(`<path d="${od}" fill="none" stroke="#ff0066" stroke-width="1.2" stroke-opacity="0.9"/>`);
});

let vb = [0, 0, W * Z, H * Z];
if (only) {
  const lv = EX.find(l => l.name === only);
  const cx = lv.cxPx * Z, cy = lv.cyPx * Z;
  const half = 90 * Z / (zoom / 4) * 4;
  const rx = 150 * Z, ry = 120 * Z;
  vb = [cx - rx, cy - ry, rx * 2, ry * 2];
}
const html = `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;background:#fff}svg{display:block}</style>
<svg width="${only ? 1200 : W * Z}" height="${only ? 960 : H * Z}" viewBox="${vb.join(' ')}">
<image href="data:image/png;base64,${data}" x="0" y="0" width="${W * Z}" height="${H * Z}"/>
${parts.join('\n')}
</svg>`;
fs.writeFileSync(path.join(__dirname, only ? 'overlay1.html' : 'overlay.html'), html);
console.log('写出 ' + (only ? 'overlay1.html' : 'overlay.html') + '（' + parts.length + ' 个多边形）');
