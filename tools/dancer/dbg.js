/* 单图案装配调试：邻接图 + 每块板的位移 / IoU */
'use strict';
const { readPng } = require('./pngio.js');
const SEG = require('./seg.js');
const FIT = require('./fit.js');
const ASM = require('./assemble.js');

const img = readPng(__dirname + '/ref.png');
const idx = SEG.colorIndex(img);
const list = Object.values(SEG.figures(idx, img.w, img.h));
let px = 0; list.forEach(f => { px += f.n; });
const s = Math.sqrt(px / (10 * 16));
const g = +process.argv[2] || 0;
const sub = list.filter(f => f.fig === g).sort((a, b) => b.n - a.n).slice(0, 7);
let gx0 = 1e9, gy0 = 1e9;
sub.forEach(f => { gx0 = Math.min(gx0, f.bx); gy0 = Math.min(gy0, f.by); });
const fits = sub.map(f => {
  const r = FIT.fitPiece(f, s);
  return {
    key: r.key, ang: r.ang, fl: r.fl, iou: r.iou, n: f.n, color: SEG.HUES[f.color].name,
    cx: (r.bx + r.cx - gx0) / s, cy: (r.by + r.cy - gy0) / s, mask: f
  };
});
const ADJ = ASM.buildAdj(fits, 3);
console.log('邻接：');
fits.forEach((a, i) => console.log('  ', i, a.key, a.color, '->', fits.map((b, j) => (ADJ[i][j] ? j : null)).filter(v => v !== null).join(',')));
const res = ASM.assemble(fits, FIT.LOCAL, { s: s, ox: gx0, oy: gy0, beam: 24, R: 4.0, minFlush: 0.25 });
console.log('候选统计', JSON.stringify(ASM.stats));
console.log('结果：');
res.forEach(p => {
  const f = fits.find(x => x === p.src);
  console.log('  ', p.key, ('ang' + p.ang).padEnd(6), p.fl ? 'F' : '-',
    '拟合', f.cx.toFixed(2) + ',' + f.cy.toFixed(2),
    '→', p.x.toFixed(2) + ',' + p.y.toFixed(2),
    '位移', Math.hypot(p.x - f.cx, p.y - f.cy).toFixed(2),
    'inside', p.q.inside.toFixed(3), 'cover', p.q.cov.toFixed(3), 'flush', p.q.ov.toFixed(2));
});
