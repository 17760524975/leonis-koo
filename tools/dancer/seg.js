/* 舞者关卡反解 · 第 1 步：HSV 颜色分割 + 连通域 + 按图案聚合
 * ------------------------------------------------------------------
 * 参考图是 800×458 的 webp（已由 webp2png.js 转成 png）。
 * 直接比 RGB 不稳：webp 压缩与抗锯齿会让同一块板的像素色相不变、亮度/饱和度漂移，
 * 尤其是被深色描边包住的小三角。所以按 HSV 色相分类。
 *
 * 用户给定的配色（7 色 ↔ 7 板）：
 *   淡黄 / 红 → 大三角 T1、T2
 *   深黄(橙)  → 正方形 S
 *   粉 / 紫   → 小三角 T4、T5
 *   绿        → 中三角 T3
 *   蓝(青)    → 平行四边形 P
 *
 * 同一图案内 7 块板颜色互不相同 →「图案 + 颜色」唯一确定一块板，
 * 所以同一图案同色的多个连通域要合并（抗锯齿会把小三角切成两三片）。
 */
'use strict';
const { readPng } = require('./pngio.js');

const HUES = [
  { key: 'red',    name: '红',   h0: 345, h1: 15,  big: true },
  { key: 'orange', name: '深黄', h0: 22,  h1: 45 },
  { key: 'yellow', name: '淡黄', h0: 45,  h1: 70,  big: true },
  { key: 'lime',   name: '黄绿', h0: 70,  h1: 100 },
  { key: 'green',  name: '绿',   h0: 100, h1: 145 },
  { key: 'cyan',   name: '蓝',   h0: 175, h1: 215 },
  { key: 'purple', name: '紫',   h0: 235, h1: 288 },
  { key: 'pink',   name: '粉',   h0: 288, h1: 345 }
];
const IDX = {};
HUES.forEach((p, i) => { IDX[p.key] = i; });

function hsv(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === r) h = 60 * (((g - b) / d) % 6);
    else if (mx === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  return [h, mx ? d / mx : 0, mx / 255];
}

function colorIndex(img) {
  const idx = new Int8Array(img.w * img.h).fill(-1);
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      const d = (y * img.w + x) * 3;
      const r = img.data[d], g = img.data[d + 1], b = img.data[d + 2];
      const [h, s, v] = hsv(r, g, b);
      if (v > 0.93 && s < 0.16) continue;          // 白底
      if (s < 0.30 || v < 0.18) continue;          // 灰（水印/描边/阴影）
      for (let i = 0; i < HUES.length; i++) {
        const p = HUES[i];
        const inH = p.h0 < p.h1 ? (h >= p.h0 && h < p.h1) : (h >= p.h0 || h < p.h1);
        if (inH) { idx[y * img.w + x] = i; break; }
      }
    }
  }
  return idx;
}

/* 同色 4 连通域；minArea 只用来去掉零星噪点 */
function components(idx, w, h, minArea) {
  const seen = new Uint8Array(w * h);
  const out = [];
  const stack = [];
  for (let s = 0; s < w * h; s++) {
    if (seen[s] || idx[s] < 0) continue;
    const c = idx[s];
    let n = 0, sx = 0, sy = 0, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
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
    if (n < (minArea || 12)) continue;
    out.push({ color: c, n, cx: sx / n, cy: sy / n, x0, y0, x1, y1, pts });
  }
  return out;
}

/* 10 个图案：按位置分 2 行 5 列 */
const COLS = [0, 195, 345, 490, 625, 800];
const ROWS = [0, 220, 458];
function groupOf(cx, cy) {
  let col = 0, row = 0;
  for (let i = 0; i < 5; i++) if (cx >= COLS[i] && cx < COLS[i + 1]) col = i;
  for (let i = 0; i < 2; i++) if (cy >= ROWS[i] && cy < ROWS[i + 1]) row = i;
  return row * 5 + col;
}

/* 把连通域按「图案 + 颜色」合并成一面掩码
 * 注意：抗锯齿会在「红/紫」这类相邻色之间夹出 1px 的过渡色，被 HSV 判成本图案的
 * 第三种颜色（典型是红紫之间夹出「粉」）。这类碎片贴着别的板的边，离主体很远，
 * 所以要按「与主连通域的间距」筛：只合并贴着主体的碎片，远的直接丢。 */
const NEAR = 4;   // px

function bboxGap(a, b) {
  const dx = Math.max(0, Math.max(a.x0 - b.x1, b.x0 - a.x1));
  const dy = Math.max(0, Math.max(a.y0 - b.y1, b.y0 - a.y1));
  return Math.hypot(dx, dy);
}

function figures(idx, w, h) {
  const comps = components(idx, w, h, 12);
  const figs = {};
  comps.forEach(c => {
    const g = groupOf(c.cx, c.cy);
    const k = g + ':' + c.color;
    if (!figs[k]) figs[k] = { fig: g, color: c.color, n: 0, pts: [], parts: 0, comps: [] };
    figs[k].comps.push(c);
  });
  Object.keys(figs).forEach(k => {
    const f = figs[k];
    f.comps.sort((a, b) => b.n - a.n);
    const main = f.comps[0];
    const keep = [main];
    for (let i = 1; i < f.comps.length; i++) {
      const c = f.comps[i];
      /* 与任一已保留块贴近，或本身就是主体的碎片（大到不像过渡色）才保留 */
      const near = keep.some(m => bboxGap(m, c) <= NEAR);
      if (near || c.n >= 0.25 * main.n) keep.push(c);
    }
    f.kept = keep.length;
    f.dropped = f.comps.length - keep.length;
    f.n = 0; f.pts = [];
    f.x0 = 1e9; f.y0 = 1e9; f.x1 = -1e9; f.y1 = -1e9;
    keep.forEach(c => {
      f.parts++; f.n += c.n;
      for (const p of c.pts) f.pts.push(p);
      f.x0 = Math.min(f.x0, c.x0); f.y0 = Math.min(f.y0, c.y0);
      f.x1 = Math.max(f.x1, c.x1); f.y1 = Math.max(f.y1, c.y1);
    });
  });
  /* 掩码：布尔数组（局部 bbox 外扩 2px），给模板拟合用 */
  Object.keys(figs).forEach(k => {
    const f = figs[k];
    f.bx = f.x0 - 2; f.by = f.y0 - 2;
    f.bw = f.x1 - f.x0 + 5; f.bh = f.y1 - f.y0 + 5;
    f.mask = new Uint8Array(f.bw * f.bh);
    f.sx = 0; f.sy = 0;
    for (const p of f.pts) {
      const x = p % w, y = (p - x) / w;
      f.mask[(y - f.by) * f.bw + (x - f.bx)] = 1;
      f.sx += x; f.sy += y;
    }
    f.cxp = f.sx / f.n; f.cyp = f.sy / f.n;
  });
  return figs;
}

module.exports = { HUES, IDX, colorIndex, components, figures, hsv };

if (require.main === module) {
  const img = readPng(process.argv[2] || 'tools/dancer/ref.png');
  const idx = colorIndex(img);
  const comps = components(idx, img.w, img.h, 12);
  const figs = figures(idx, img.w, img.h);
  console.log('连通域', comps.length, ' / 图案×颜色', Object.keys(figs).length);
  let total = 0;
  comps.forEach(c => { total += c.n; });
  console.log('着色像素合计', total, '→ 1 格 ≈', Math.sqrt(total / 160).toFixed(2), 'px');
  for (let g = 0; g < 10; g++) {
    const list = Object.values(figs).filter(f => f.fig === g).sort((a, b) => b.n - a.n);
    console.log('--- 图案 ' + (g + 1) + ' : ' + list.length + ' 块');
    list.forEach(f => console.log('   ' + HUES[f.color].name.padEnd(3),
      'n=' + String(f.n).padStart(4),
      'parts=' + f.parts,
      'bbox ' + f.x0 + ',' + f.y0 + ' ' + (f.x1 - f.x0 + 1) + 'x' + (f.y1 - f.y0 + 1),
      'c=' + f.cxp.toFixed(1) + ',' + f.cyp.toFixed(1),
      '格²=' + (f.n / 214).toFixed(2)));
  }
}
