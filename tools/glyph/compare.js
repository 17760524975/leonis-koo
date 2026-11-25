/* 参考图 vs 反解结果 逐字对照（上：参考图裁片；下：我们的七巧板）
 * 用法：node tools/glyph/compare.js [起始字母] [个数]
 */
const fs = require('fs');
const path = require('path');
const L = require('../zodiac/lib.js');
const SEG = require('./seg.js');

const EX = JSON.parse(fs.readFileSync(path.join(__dirname, 'letters_exact.json'), 'utf8'));
const src = SEG.load(path.join(__dirname, 'ref.png'));
const letters = SEG.segment(src);
const FROM = process.argv[2] || 'A';
const N = +(process.argv[3] || 26);

const i0 = letters.findIndex(l => l.name === FROM);
const use = letters.slice(i0, i0 + N).map(g => ({ g, lv: EX.find(e => e.name === g.name) }));

const COLS = Math.min(7, use.length);
const CW = 300, IMG = 160, CH = IMG * 2 + 46;
const ROWS = Math.ceil(use.length / COLS);
const COL = { T1: '#2ad4fa', T2: '#f44df5', S: '#9afd03', P: '#6634fb', T3: '#fded04', T5: '#f49305', T4: '#e50615' };

const cells = use.map(({ g, lv }, k) => {
  const gx = (k % COLS) * CW, gy = Math.floor(k / COLS) * CH;
  /* ① 参考图裁片 */
  const bw = g.x1 - g.x0 + 1, bh = g.y1 - g.y0 + 1;
  const sc = IMG / Math.max(bw, bh);
  const ref = `<div style="position:absolute;left:${gx + (CW - bw * sc) / 2}px;top:${gy + 26}px;width:${bw * sc}px;height:${bh * sc}px;overflow:hidden">
    <img src="ref.png" style="position:absolute;left:${-g.x0 * sc}px;top:${-g.y0 * sc}px;width:${800 * sc}px;height:${616 * sc}px;image-rendering:pixelated"></div>`;

  /* ② 我们的重建 */
  const polys = lv.pieces.map(p => L.LOCAL[p.id].map(v => {
    const r = L.rot(v, p.ang, p.f);
    return [r[0] * 96 + p.x, r[1] * 96 + p.y];
  }));
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const P of polys) for (const v of P) {
    x0 = Math.min(x0, v[0]); x1 = Math.max(x1, v[0]);
    y0 = Math.min(y0, v[1]); y1 = Math.max(y1, v[1]);
  }
  const s2 = IMG / Math.max(x1 - x0, y1 - y0);
  const ox = gx + (CW - (x1 - x0) * s2) / 2, oy = gy + 26 + IMG + 12;
  const tp = v => [ox - gx + (v[0] - x0) * s2, oy - gy + (v[1] - y0) * s2];
  const d = pts => pts.map((v, i) => (i ? 'L' : 'M') + tp(v).map(n => n.toFixed(1)).join(',')).join(' ') + ' Z';
  const paths = polys.map((P, i) => `<path d="${d(P)}" fill="${COL[lv.pieces[i].id]}" stroke="#fff" stroke-width="0.6"/>`).join('');
  const ours = `<svg style="position:absolute;left:${gx}px;top:${gy}px" width="${CW}" height="${CH}" viewBox="0 0 ${CW} ${CH}">${paths}</svg>`;

  return ref + ours + `<div style="position:absolute;left:${gx + 8}px;top:${gy + 4}px;font:15px system-ui;color:#444">${g.name}</div>`;
});

const W = COLS * CW, H = ROWS * CH;
const html = `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;background:#fff}#w{position:relative;width:${W}px;height:${H}px}</style>
<div id="w">${cells.join('\n')}</div>`;
fs.writeFileSync(path.join(__dirname, 'compare.html'), html);
console.log('compare.html', W + 'x' + H, use.length + ' 个');
