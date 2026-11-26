/* 舞者关卡体检：把 dancers_exact.json 的每块板投影回参考图，算「还原度」
 * ------------------------------------------------------------------
 * 面积差 / 压叠只证明「结构合法」，证明不了「姿势像原图」。
 * 这里把每块板按 json 的参数画回像素坐标，与它自己的颜色掩码求 IoU：
 *   IoU ≥ 0.80 → 位置与朝向都对
 *   0.6~0.8   → 可能有 1 块的朝向被吸附带偏
 *   < 0.6     → 明显偏离，需要人工看
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { readPng } = require('./pngio.js');
const SEG = require('./seg.js');
const FIT = require('./fit.js');
const SNAP = require('./snap.js');

const img = readPng(process.argv[2] || path.join(__dirname, 'ref.png'));
const idx = SEG.colorIndex(img);
const figs = SEG.figures(idx, img.w, img.h);
const list = Object.values(figs);
let px = 0; list.forEach(f => { px += f.n; });
const s = Math.sqrt(px / (10 * 16));
const J = JSON.parse(fs.readFileSync(path.join(__dirname, 'dancers_exact.json'), 'utf8'));

let worst = 1, worstAt = '';
const rows = [];
for (let g = 0; g < 10; g++) {
  const sub = list.filter(f => f.fig === g).sort((a, b) => b.n - a.n).slice(0, 7);
  let gx0 = 1e9, gy0 = 1e9;
  sub.forEach(f => { gx0 = Math.min(gx0, f.bx); gy0 = Math.min(gy0, f.by); });
  /* 整体对齐：不同锚方案会让整幅图平移，逐块用绝对坐标比没有意义。
   * 用「解的 bbox 中心」对齐「7 个掩码的 bbox 中心」，只比形状。 */
  const allB = J[g].pieces.map(p => {
    const bx = p.x / 96, by = p.y / 96;
    const base = FIT.LOCAL[p.id].map(v => SNAP.rot(v, p.angle, p.flipped));
    return base.map(v => [v[0] + bx, v[1] + by]);
  });
  let sx0 = 1e9, sy0 = 1e9, sx1 = -1e9, sy1 = -1e9;
  allB.forEach(pl => pl.forEach(v => { sx0 = Math.min(sx0, v[0]); sy0 = Math.min(sy0, v[1]); sx1 = Math.max(sx1, v[0]); sy1 = Math.max(sy1, v[1]); }));
  let mx0 = 1e9, my0 = 1e9, mx1 = -1e9, my1 = -1e9;
  sub.forEach(f => { mx0 = Math.min(mx0, f.x0); my0 = Math.min(my0, f.y0); mx1 = Math.max(mx1, f.x1); my1 = Math.max(my1, f.y1); });
  const dx = ((mx0 + mx1) / 2 - gx0) / s - (sx0 + sx1) / 2;
  const dy = ((my0 + my1) / 2 - gy0) / s - (sy0 + sy1) / 2;

  /* 每块掩码的中心（u 单位） */
  const cand = sub.map(f => ({
    mask: f,
    cx: ((f.bx + 2) + (f.bw - 5) / 2 - gx0) / s,
    cy: ((f.by + 2) + (f.bh - 5) / 2 - gy0) / s
  }));
  const line = [];
  for (const p of J[g].pieces) {
    const bx = p.x / 96 + dx, by = p.y / 96 + dy;
    const base = FIT.LOCAL[p.id].map(v => SNAP.rot(v, p.angle, p.flipped));
    const pts = base.map(v => [v[0] + bx, v[1] + by]);
    /* 掩码不按质心匹配（三角形质心 ≠ bbox 中心），直接取 IoU 最高的那个 ——
     * 这样数字反映「这块板在整幅图里最像哪块色块」，配错也会暴露出来 */
    let best = null;
    for (const c of cand) {
      const iou = SNAP.iouMask(pts, c.mask, s, gx0, gy0);
      if (!best || iou > best.iou) best = { iou, c };
    }
    line.push(p.id + ':' + best.iou.toFixed(2));
    if (best.iou < worst) { worst = best.iou; worstAt = (g + 1) + '-' + p.id; }
    rows.push({ fig: g + 1, id: p.id, iou: best.iou });
  }
  console.log(('图案 ' + (g + 1)).padEnd(6), line.join('  '));
}
const avg = rows.reduce((a, r) => a + r.iou, 0) / rows.length;
console.log('平均 IoU', avg.toFixed(3), ' 最低', worst.toFixed(3), '@图案', worstAt);
const bad = rows.filter(r => r.iou < 0.75);
console.log('低于 0.75 的块：', bad.length ? bad.map(r => r.fig + '-' + r.id + '(' + r.iou.toFixed(2) + ')').join(' ') : '无');
