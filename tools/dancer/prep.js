/* 反解公共前置：HSV 分割 → 每块板 5 种形状各自最优拟合 → 全局形状指派 → 摆到世界坐标
 * 用法：const PREP = require('./prep.js'); const P = PREP.load(); const r = P.fig(5);
 *   r.fits  7 项 { key, ang, fl, iou, color, cx, cy, mask, n }
 *   r.polys 拟合位置的多边形（base 单位，质心已在世界坐标）
 *   r.s / r.gx0 / r.gy0  比例与像素原点
 */
'use strict';
const path = require('path');
const { readPng } = require('./pngio.js');
const SEG = require('./seg.js');
const FIT = require('./fit.js');

const SHAPES = ['T1', 'T3', 'S', 'T4', 'P'];

function comb(n, k) {
  const out = [], cur = [];
  (function rec(st) {
    if (cur.length === k) { out.push(cur.slice()); return; }
    for (let i = st; i < n; i++) { cur.push(i); rec(i + 1); cur.pop(); }
  })(0);
  return out;
}
const C2 = comb(7, 2);

/* 全局形状指派：硬约束「2 大 / 1 中 / 1 方 / 2 小 / 1 平」，全枚举取总 IoU 最大。
 * 不能各块独立选最优形状 —— 会出现 3 块大三角之类的非法组合。 */
function allocate(aoi) {
  let best = null;
  for (const big of C2) {
    const r1 = [0, 1, 2, 3, 4, 5, 6].filter(i => big.indexOf(i) < 0);
    for (const mid of r1) {
      const r2 = r1.filter(i => i !== mid);
      for (const sq of r2) {
        const r3 = r2.filter(i => i !== sq);
        for (let a = 0; a < r3.length; a++) {
          for (let b = a + 1; b < r3.length; b++) {
            const sm = [r3[a], r3[b]];
            const pl = r3.filter(i => i !== sm[0] && i !== sm[1]);
            if (pl.length !== 1) continue;
            const sum = aoi[big[0]].T1 + aoi[big[1]].T1 + aoi[mid].T3
              + aoi[sq].S + aoi[sm[0]].T4 + aoi[sm[1]].T4 + aoi[pl[0]].P;
            if (!best || sum > best.sum) {
              const asg = [];
              big.forEach(i => { asg[i] = 'T1'; });
              asg[mid] = 'T3'; asg[sq] = 'S';
              asg[sm[0]] = 'T4'; asg[sm[1]] = 'T4';
              asg[pl[0]] = 'P';
              best = { sum, asg };
            }
          }
        }
      }
    }
  }
  return best;
}

function load(imgPath) {
  const img = readPng(imgPath || path.join(__dirname, 'ref.png'));
  const idx = SEG.colorIndex(img);
  const list = Object.values(SEG.figures(idx, img.w, img.h));
  let px = 0; list.forEach(f => { px += f.n; });
  const s = Math.sqrt(px / (10 * 16));      // 1 base 单位 ≈ s 像素

  function fig(g) {
    const sub = list.filter(f => f.fig === g).sort((a, b) => b.n - a.n).slice(0, 7);
    if (sub.length !== 7) throw new Error('图案 ' + (g + 1) + ' 只找到 ' + sub.length + ' 块');
    let gx0 = 1e9, gy0 = 1e9;
    sub.forEach(f => { gx0 = Math.min(gx0, f.bx); gy0 = Math.min(gy0, f.by); });

    const raw = sub.map(f => {
      const r = FIT.fitPiece(f, s);
      return { n: f.n, color: SEG.HUES[f.color].key, per: r.per, bx: r.bx, by: r.by, mask: f };
    });
    const aoi = raw.map(r => { const o = {}; SHAPES.forEach(k => { o[k] = r.per[k].iou; }); return o; });
    const alloc = allocate(aoi);
    if (!alloc) throw new Error('图案 ' + (g + 1) + ' 形状指派失败');

    const fits = raw.map((r, i) => {
      const shape = alloc.asg[i], c = r.per[shape];
      return {
        key: shape, ang: c.ang, fl: c.fl, iou: c.iou, n: r.n, color: r.color,
        cx: (r.bx + c.cx - gx0) / s, cy: (r.by + c.cy - gy0) / s,
        mask: r.mask
      };
    });

    /* 大小三角要能区分（同一形状两块，id 用 T1/T2、T4/T5 分开） */
    const big = fits.filter(f => f.key === 'T1').sort((a, b) => b.n - a.n);
    const small = fits.filter(f => f.key === 'T4').sort((a, b) => b.n - a.n);
    if (big.length !== 2 || small.length !== 2) {
      throw new Error('图案 ' + (g + 1) + ' 大/小三角数量不对：大 ' + big.length + ' 小 ' + small.length);
    }
    const idOf = new Map();
    idOf.set(big[0], 'T1'); idOf.set(big[1], 'T2');
    idOf.set(small[0], 'T4'); idOf.set(small[1], 'T5');
    fits.forEach(f => { if (!idOf.has(f)) idOf.set(f, f.key); });

    const polys = fits.map(f => FIT.LOCAL[f.key].map(v => {
      const q = FIT.rot(v, f.ang, f.fl);
      return [q[0] + f.cx, q[1] + f.cy];
    }));
    return { fits, polys, idOf, s, gx0, gy0 };
  }

  return { fig, s, list };
}

module.exports = { load, allocate, SHAPES, comb };
