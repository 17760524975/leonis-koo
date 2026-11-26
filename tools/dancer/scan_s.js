/* 扫描「1 单位 = 多少像素」，用所有板的平均 IoU 找最优 —— s 差 2%，4 单位的板就差 0.08，
 * 足以让整幅图出现「差一点点」的缝。 */
'use strict';
const SEG = require('./seg.js');
const FIT = require('./fit.js');
const { readPng } = require('./pngio.js');

const img = readPng(process.argv[2] || require('path').join(__dirname, 'ref.png'));
const idx = SEG.colorIndex(img);
const figs = SEG.figures(idx, img.w, img.h);
const list = Object.values(figs);
let px = 0; list.forEach(f => { px += f.n; });
const s0 = Math.sqrt(px / 160);
console.log('面积法 s =', s0.toFixed(3));

const blocks = [];
for (let g = 0; g < 10; g++) {
  list.filter(f => f.fig === g).sort((a, b) => b.n - a.n).slice(0, 7).forEach(f => blocks.push(f));
}
console.log('待拟合块', blocks.length);

let best = null;
for (let s = s0 - 1.2; s <= s0 + 1.2; s += 0.05) {
  let sum = 0, mn = 1;
  for (const f of blocks) {
    const r = FIT.fitPiece(f, s);
    sum += r.iou;
    if (r.iou < mn) mn = r.iou;
  }
  const avg = sum / blocks.length;
  if (!best || avg > best.avg) best = { s, avg, mn };
  if (Math.abs(s - Math.round(s * 10) / 10) < 1e-6) {
    console.log('s=' + s.toFixed(2), 'avgIoU', avg.toFixed(4), 'min', mn.toFixed(3));
  }
}
console.log('最佳 s =', best.s.toFixed(3), 'avgIoU', best.avg.toFixed(4), 'min', best.mn.toFixed(3));
