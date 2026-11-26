/* 舞者关卡反解 · 第 2 步：模板拟合（板型 / 角度 / 翻面 / 位置）
 * ------------------------------------------------------------------
 * 板件尺寸在全局是固定的（dataset.unitScale），所以不需要「从像素里量出大小」，
 * 只需要在「5 种板型 × 8 个 45° 角 × 2 种翻面」里挑与掩码最吻合的那个。
 * 这样做的好处：拟合结果天然落在标准七巧板的解空间里，不会出现「差 2° 的歪板」。
 *
 * 坐标约定：一律用 dataset base 的「单位」（大三角底边 = 4、正方形边 = √2 那一套）。
 * 输出：基准点 + 单位制坐标，供下一步吸附到半格网格。
 */
'use strict';
const path = require('path');
const { readPng } = require('./pngio.js');
const SEG = require('./seg.js');

require(path.join(__dirname, '..', '..', 'js', 'geom.js'));
const G = globalThis.TANGRAM_GEOM;

const SHAPES = [
  { key: 'T1', name: '大三角A', base: [[0, 0], [4, 0], [2, 2]], units: 4 },
  { key: 'T2', name: '大三角B', base: [[0, 0], [4, 0], [2, 2]], units: 4 },
  { key: 'T3', name: '中三角', base: [[0, 0], [2, 0], [0, 2]], units: 2 },
  { key: 'S', name: '正方形', base: [[1, 0], [2, 1], [1, 2], [0, 1]], units: 2 },
  { key: 'T4', name: '小三角A', base: [[0, 0], [2, 0], [1, 1]], units: 1 },
  { key: 'T5', name: '小三角B', base: [[0, 0], [2, 0], [1, 1]], units: 1 },
  { key: 'P', name: '平行四边形', base: [[1, 0], [3, 0], [2, 1], [0, 1]], units: 2 }
];
/* 去重：T1/T2、T4/T5 同形，拟合时只跑 5 个形状，最后再分配具体 id */
const UNIQ = ['T1', 'T3', 'S', 'T4', 'P'];

const LOCAL = {};
SHAPES.forEach(s => { LOCAL[s.key] = G.makeLocal(s.base); });   // 质心在原点，单位制

const DEG = Math.PI / 180;
function rot(v, a, f) {
  const r = a * DEG, ca = Math.cos(r), sa = Math.sin(r);
  const x = v[0] * (f ? -1 : 1), y = v[1];
  return [x * ca - y * sa, x * sa + y * ca];
}
function inPoly(px, py, P) {
  let inside = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const xi = P[i][0], yi = P[i][1], xj = P[j][0], yj = P[j][1];
    if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/* 对一块掩码做全模板搜索 */
function fitPiece(f, s, opts) {
  const pad = (opts && opts.pad) || 3;
  const bx = f.bx - pad, by = f.by - pad;
  const bw = f.bw + pad * 2, bh = f.bh + pad * 2;
  /* 掩码取到扩展后的框里 */
  const M = new Uint8Array(bw * bh);
  let A = 0;
  for (let y = 0; y < f.bh; y++) {
    for (let x = 0; x < f.bw; x++) {
      if (!f.mask[y * f.bw + x]) continue;
      M[(y + pad) * bw + (x + pad)] = 1; A++;
    }
  }
  const cx = f.cxp - bx, cy = f.cyp - by;   // 质心（局部像素坐标）

  let best = null;
  const per = {};   // 形状 → { iou, ang, fl, T, cx, cy }（每种形状各自最优）
  for (const key of UNIQ) {
    const L = LOCAL[key];
    for (let ai = 0; ai < 8; ai++) {
      const ang = ai * 45;
      for (const fl of [false, true]) {
        /* 模板 → 局部像素坐标（质心对齐） */
        const T = L.map(v => { const r = rot(v, ang, fl); return [r[0] * s + cx, r[1] * s + cy]; });
        /* 只看模板 bbox 内采样，避免整框遍历 */
        let tx0 = 1e9, ty0 = 1e9, tx1 = -1e9, ty1 = -1e9;
        T.forEach(p => { tx0 = Math.min(tx0, p[0]); ty0 = Math.min(ty0, p[1]); tx1 = Math.max(tx1, p[0]); ty1 = Math.max(ty1, p[1]); });
        const x0 = Math.max(0, Math.floor(Math.min(tx0, cx) - 1));
        const y0 = Math.max(0, Math.floor(Math.min(ty0, cy) - 1));
        const x1 = Math.min(bw - 1, Math.ceil(Math.max(tx1, cx) + 1));
        const y1 = Math.min(bh - 1, Math.ceil(Math.max(ty1, cy) + 1));
        let I = 0, B = 0;
        for (let y = y0; y <= y1; y++) {
          for (let x = x0; x <= x1; x++) {
            const it = inPoly(x + 0.5, y + 0.5, T);
            const im = M[y * bw + x];
            if (it && im) I++;
            else if (it) B++;
          }
        }
        /* 掩码里但模板没盖到的部分：整框统计（clip 到 bw×bh） */
        let CO = 0;
        for (let y = 0; y < bh; y++) {
          for (let x = 0; x < bw; x++) {
            if (!M[y * bw + x]) continue;
            if (x >= x0 && x <= x1 && y >= y0 && y <= y1) continue;
            CO++;   // 落在模板 bbox 外，必然不在模板内
          }
        }
        const inter = I;
        const iou = inter / (A + B + CO);
        if (!best || iou > best.iou) best = { key, ang, fl, iou, T, cx, cy };
        if (!per[key] || iou > per[key].iou) per[key] = { key, ang, fl, iou, T, cx, cy };
      }
    }
  }
  return { ...best, per, A, bx, by };
}

module.exports = { SHAPES, UNIQ, LOCAL, fitPiece, rot, inPoly };

if (require.main === module) {
  const img = readPng(process.argv[2] || 'tools/dancer/ref.png');
  const idx = SEG.colorIndex(img);
  const figs = SEG.figures(idx, img.w, img.h);
  const list = Object.values(figs);
  let px = 0;
  list.forEach(f => { px += f.n; });
  const s = Math.sqrt(px / (10 * 16));      // 单位 → 像素
  console.log('1 单位 ≈', s.toFixed(3), 'px');
  for (let g = 0; g < 10; g++) {
    /* 每个舞者固定 7 块板：只取面积最大的 7 个色块，把「红紫之间夹出的过渡色」之类碎屑滤掉 */
    const sub = list.filter(f => f.fig === g).sort((a, b) => b.n - a.n).slice(0, 7);
    console.log('=== 图案 ' + (g + 1));
    sub.forEach(f => {
      const r = fitPiece(f, s);
      console.log('  ' + SEG.HUES[f.color].name.padEnd(3),
        r.key.padEnd(3), 'angle', String(r.ang).padStart(3), r.fl ? 'F' : '-',
        'IoU', r.iou.toFixed(3), 'n', f.n);
    });
  }
}
