/* 舞者关卡反解 · 第 1 步：颜色分割 + 连通域
 * ------------------------------------------------------------------
 * 输入：tools/dancer/ref.png（由 webp2png.js 从用户给的参考图转来）
 * 输出：控制台列出每个色块的颜色、面积、包围盒，供人工核对板型
 *
 * 参考图调色板（用户给定，共 7 种颜色对应 7 块板）：
 *   红 / 淡黄 → 大三角（T1、T2）
 *   深黄(橙) → 正方形 S
 *   粉 / 紫   → 小三角（T4、T5）
 *   绿        → 中三角 T3
 *   蓝(青)    → 平行四边形 P
 * 同一图案内 7 块板颜色互不相同，所以「同色 + 连通」即可唯一确定一块板。
 */
'use strict';
const { readPng } = require('./pngio.js');

/* 关键色（取自原图直方图峰值），匹配时用最近色距离，阈值 60 */
const PALETTE = [
  { key: 'yellow', name: '淡黄', rgb: [254, 237, 3] },
  { key: 'red',    name: '红',   rgb: [228, 6, 19] },
  { key: 'cyan',   name: '蓝',   rgb: [43, 212, 250] },
  { key: 'orange', name: '深黄', rgb: [243, 146, 2] },
  { key: 'pink',   name: '粉',   rgb: [244, 78, 244] },
  { key: 'green',  name: '绿',   rgb: [66, 252, 67] },
  { key: 'purple', name: '紫',   rgb: [99, 52, 252] },
  { key: 'lime',   name: '黄绿', rgb: [155, 254, 2] }
];

function nearestColor(r, g, b) {
  let best = null, bd = 1e9;
  for (const p of PALETTE) {
    const d = (r - p.rgb[0]) ** 2 + (g - p.rgb[1]) ** 2 + (b - p.rgb[2]) ** 2;
    if (d < bd) { bd = d; best = p; }
  }
  return bd <= 3600 ? best : null;   // 距离 60 以内才算
}

/* 颜色索引图：-1 = 背景/水印/描边 */
function colorIndex(img) {
  const idx = new Int8Array(img.w * img.h).fill(-1);
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      const d = (y * img.w + x) * 3;
      const r = img.data[d], g = img.data[d + 1], b = img.data[d + 2];
      if (r > 235 && g > 235 && b > 235) continue;          // 白底
      if (Math.abs(r - g) < 14 && Math.abs(g - b) < 14) continue;  // 灰（水印/描边）
      const p = nearestColor(r, g, b);
      if (p) idx[y * img.w + x] = PALETTE.indexOf(p);
    }
  }
  return idx;
}

/* 同色 4 连通域 */
function components(idx, w, h, minArea) {
  const seen = new Uint8Array(w * h);
  const out = [];
  const stack = [];
  for (let s = 0; s < w * h; s++) {
    if (seen[s] || idx[s] < 0) continue;
    const c = idx[s];
    let n = 0, sx = 0, sy = 0;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    const pts = [];
    stack.length = 0; stack.push(s); seen[s] = 1;
    while (stack.length) {
      const p = stack.pop();
      const x = p % w, y = (p - x) / w;
      n++; sx += x; sy += y; pts.push(p);
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
      const nb = [p - 1, p + 1, p - w, p + w];
      for (let k = 0; k < 4; k++) {
        const q = nb[k];
        if (q < 0 || q >= w * h) continue;
        if (k === 0 && x === 0) continue;
        if (k === 1 && x === w - 1) continue;
        if (seen[q] || idx[q] !== c) continue;
        seen[q] = 1; stack.push(q);
      }
    }
    if (n < (minArea || 40)) continue;
    out.push({ color: c, n, cx: sx / n, cy: sy / n, x0, y0, x1, y1, pts });
  }
  return out;
}

module.exports = { PALETTE, colorIndex, components, nearestColor };

if (require.main === module) {
  const img = readPng(process.argv[2] || 'tools/dancer/ref.png');
  const idx = colorIndex(img);
  const cs = components(idx, img.w, img.h, 40);
  cs.sort((a, b) => (a.cy - b.cy) || (a.cx - b.cx));
  console.log('色块数', cs.length);
  cs.forEach(c => {
    const p = PALETTE[c.color];
    console.log(String(c.n).padStart(6), p.key.padEnd(7), 'bbox', c.x0, c.y0, c.x1, c.y1,
      'size', (c.x1 - c.x0 + 1) + 'x' + (c.y1 - c.y0 + 1), 'c', c.cx.toFixed(1), c.cy.toFixed(1));
  });
}
