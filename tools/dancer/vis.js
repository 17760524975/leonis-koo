/* 舞者关卡反解 · 第 3 步：拟合可视化（掩码 vs 模板轮廓）
 * ------------------------------------------------------------------
 * 每块板输出一张小图：底色 = 参考图里该色块的真实像素，白线 = 拟合出的标准板轮廓。
 * 白线与色块边缘的偏差一眼可见，比看数字可靠。
 * 10 个图案拼成一张大图，方便整体核对。
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { readPng, writePng } = require('./pngio.js');
const SEG = require('./seg.js');
const FIT = require('./fit.js');

const CELL_W = 190, CELL_H = 250, PAD = 3;

function drawSeg(buf, W, H, x0, y0, x1, y1, rgb) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
  for (let i = 0; i <= n; i++) {
    const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n);
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const d = (y * W + x) * 3;
    buf[d] = rgb[0]; buf[d + 1] = rgb[1]; buf[d + 2] = rgb[2];
  }
}

function main() {
  const img = readPng(process.argv[2] || 'tools/dancer/ref.png');
  const idx = SEG.colorIndex(img);
  const figs = SEG.figures(idx, img.w, img.h);
  const list = Object.values(figs);
  let px = 0; list.forEach(f => { px += f.n; });
  const s = Math.sqrt(px / (10 * 16));

  const W = CELL_W * 5, H = CELL_H * 2;
  const canvas = Buffer.alloc(W * H * 3, 255);
  const report = [];

  for (let g = 0; g < 10; g++) {
    const sub = list.filter(f => f.fig === g).sort((a, b) => b.n - a.n).slice(0, 7);
    sub.sort((a, b) => a.cyp - b.cyp);
    /* 图案整体 bbox，居中放进格子 */
    let gx0 = 1e9, gy0 = 1e9, gx1 = -1e9, gy1 = -1e9;
    sub.forEach(f => { gx0 = Math.min(gx0, f.x0); gy0 = Math.min(gy0, f.y0); gx1 = Math.max(gx1, f.x1); gy1 = Math.max(gy1, f.y1); });
    const ox = (g % 5) * CELL_W + (CELL_W - (gx1 - gx0)) / 2 - gx0;
    const oy = Math.floor(g / 5) * CELL_H + (CELL_H - (gy1 - gy0)) / 2 - gy0;

    sub.forEach(f => {
      const r = FIT.fitPiece(f, s);
      report.push({ fig: g + 1, color: SEG.HUES[f.color].name, colorKey: SEG.HUES[f.color].key, shape: r.key, angular: r.ang, flip: r.fl, iou: r.iou });
      /* 掩码上色 */
      const hue = SEG.HUES[f.color];
      const base = hue.key === 'red' ? [228, 6, 19]
        : hue.key === 'orange' ? [243, 146, 2]
          : hue.key === 'yellow' ? [254, 237, 3]
            : hue.key === 'lime' ? [155, 254, 2]
              : hue.key === 'green' ? [66, 252, 67]
                : hue.key === 'cyan' ? [43, 212, 250]
                  : hue.key === 'purple' ? [99, 52, 252] : [244, 78, 244];
      for (let y = 0; y < f.bh; y++) {
        for (let x = 0; x < f.bw; x++) {
          if (!f.mask[y * f.bw + x]) continue;
          const gxp = Math.round(f.bx + x + ox), gyp = Math.round(f.by + y + oy);
          if (gxp < 0 || gyp < 0 || gxp >= W || gyp >= H) continue;
          const d = (gyp * W + gxp) * 3;
          canvas[d] = base[0]; canvas[d + 1] = base[1]; canvas[d + 2] = base[2];
        }
      }
      /* 模板轮廓（白） */
      const T = r.T.map(p => [p[0] + r.bx + ox, p[1] + r.by + oy]);
      for (let i = 0; i < T.length; i++) {
        const a = T[i], b = T[(i + 1) % T.length];
        drawSeg(canvas, W, H, a[0], a[1], b[0], b[1], [255, 255, 255]);
      }
    });
  }
  const OUT = path.join(__dirname, 'out');
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, 'fit_check.png');
  writePng(file, W, H, canvas);
  console.log('写出', file);
  const low = report.filter(r => r.iou < 0.8);
  console.log('低分块（IoU < 0.8）：', low.length);
  low.forEach(r => console.log('  图案' + r.fig, r.color, r.shape, r.ang, r.flip ? 'F' : '-', r.iou.toFixed(3)));
  const avg = report.reduce((a, r) => a + r.iou, 0) / report.length;
  console.log('平均 IoU', avg.toFixed(4), ' 最差', Math.min(...report.map(r => r.iou)).toFixed(3));
}

main();
