/* 舞者关卡反解 · 主流程
 * ------------------------------------------------------------------
 * 输入：tools/dancer/ref.png（10 个舞者图案，2 行 5 列）
 * 输出：tools/dancer/dancers_exact.json
 *
 * 流程：HSV 分割 → 每块板对 5 种形状各自求最优拟合 → 全局指派（7 块 × 5 形状，
 *       必须恰好 2 大 / 1 中 / 1 方 / 2 小 / 1 平）→ 几何吸附 → 精确并集轮廓
 *
 * 为什么要有「全局指派」这一步：
 *   单块取 IoU 最大的形状会出错。比如某个舞者的紫色板其实是平行四边形，但因为
 *   它有一半被相邻的粉色/蓝色压住，只剩个三角形露在外面，单块最优会判成中三角，
 *   于是整幅出现「两个中三角、没有平行四边形」的非法组合。把「形状数量必须对」
 *   作为硬约束，用全枚举（1260 种）求总 IoU 最大，就能把这类块纠正回来。
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { readPng } = require('./pngio.js');
const SEG = require('./seg.js');
const FIT = require('./fit.js');
const SNAP = require('./snap.js');
const ASM = require('./assemble.js');
const UNION = require(path.join(__dirname, '..', 'zodiac', 'union.js'));
require(path.join(__dirname, '..', '..', 'js', 'geom.js'));
const G = globalThis.TANGRAM_GEOM;

const IMG = process.argv[2] || path.join(__dirname, 'ref.png');
const U = 96;   // 世界单位 / base 单位（与 dataset.unitScale 一致）

/* 10 个舞者的名字与提示语（按姿势起的名字） */
const NAMES = [
  { name: '回眸', tip: '侧身回首 · 单臂上举' },
  { name: '展臂', tip: '双臂张开 · 抬头仰望' },
  { name: '托盘', tip: '双手托举 · 小步前倾' },
  { name: '跃起', tip: '收腿腾空 · 一臂上扬' },
  { name: '垂手', tip: '单腿站立 · 手臂下压' },
  { name: '横踢', tip: '一腿横出 · 上身侧倾' },
  { name: '探海', tip: '俯身探海 · 长腿后伸' },
  { name: '抬腿', tip: '高抬前腿 · 上身直立' },
  { name: '跳跃', tip: '凌空跃起 · 双腿张开' },
  { name: '旋身', tip: '单足旋转 · 裙摆飞扬' }
];

const SHAPES = ['T1', 'T3', 'S', 'T4', 'P'];

/* 从 n 个里取 k 个的全部组合（下标数组） */
function comb(n, k) {
  const out = [], cur = [];
  (function rec(start) {
    if (cur.length === k) { out.push(cur.slice()); return; }
    for (let i = start; i < n; i++) { cur.push(i); rec(i + 1); cur.pop(); }
  })(0);
  return out;
}
const C2 = comb(7, 2);

/* 全局指派：7 块 × 5 形状，形状计数固定（2 大 / 1 中 / 1 方 / 2 小 / 1 平），总 IoU 最大 */
function allocate(aoi) {
  let best = null;
  for (const big of C2) {
    const rest1 = [0, 1, 2, 3, 4, 5, 6].filter(i => big.indexOf(i) < 0);
    for (const mid of rest1) {
      const rest2 = rest1.filter(i => i !== mid);
      for (const sq of rest2) {
        const rest3 = rest2.filter(i => i !== sq);
        for (let a = 0; a < rest3.length; a++) {
          for (let b = a + 1; b < rest3.length; b++) {
            const sm = [rest3[a], rest3[b]];
            const pl = rest3.filter(i => i !== sm[0] && i !== sm[1]);
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

function main() {
  const img = readPng(IMG);
  const idx = SEG.colorIndex(img);
  const figs = SEG.figures(idx, img.w, img.h);
  const list = Object.values(figs);
  let px = 0; list.forEach(f => { px += f.n; });
  const s = Math.sqrt(px / (10 * 16));      // 单位 → 像素
  console.log('1 单位 ≈', s.toFixed(3), 'px');

  const out = [];
  for (let g = 0; g < 10; g++) {
    const sub = list.filter(f => f.fig === g).sort((a, b) => b.n - a.n).slice(0, 7);
    if (sub.length !== 7) throw new Error('图案 ' + (g + 1) + ' 只找到 ' + sub.length + ' 块');

    let gx0 = 1e9, gy0 = 1e9;
    sub.forEach(f => { gx0 = Math.min(gx0, f.bx); gy0 = Math.min(gy0, f.by); });

    const raw = sub.map(f => {
      const r = FIT.fitPiece(f, s);
      return { n: f.n, color: SEG.HUES[f.color].key, per: r.per, bx: r.bx, by: r.by, mask: f };
    });
    const aoi = raw.map(r => {
      const o = {};
      SHAPES.forEach(k => { o[k] = r.per[k].iou; });
      return o;
    });
    const alloc = allocate(aoi);
    if (!alloc) throw new Error('图案 ' + (g + 1) + ' 形状指派失败');

    const fits = raw.map((r, i) => {
      const shape = alloc.asg[i];
      const c = r.per[shape];
      return {
        key: shape,
        ang: c.ang, fl: c.fl, iou: c.iou, n: r.n, color: r.color,
        cx: (r.bx + c.cx - gx0) / s,
        cy: (r.by + c.cy - gy0) / s,
        mask: r.mask
      };
    });

    /* 板 id：两块大三角 → T1/T2，两块小三角 → T4/T5 */
    const big = fits.filter(f => f.key === 'T1').sort((a, b) => b.n - a.n);
    const small = fits.filter(f => f.key === 'T4').sort((a, b) => b.n - a.n);
    if (big.length !== 2 || small.length !== 2) {
      throw new Error('图案 ' + (g + 1) + ' 大/小三角数量不对：大 ' + big.length + ' 小 ' + small.length);
    }
    const idOf = new Map();
    idOf.set(big[0], 'T1'); idOf.set(big[1], 'T2');
    idOf.set(small[0], 'T4'); idOf.set(small[1], 'T5');
    fits.forEach(f => { if (!idOf.has(f)) idOf.set(f, f.key); });

    /* 精确贴边装配（束搜索）：只允许「共线 + 顶点精确对齐」的位置，
     * 关节处必然共用顶点，轮廓不会出现错开的台阶。 */
    const res = ASM.assemble(fits, FIT.LOCAL, { s: s, ox: gx0, oy: gy0, beam: 36, R: 0.95, minFlush: 0.18 });
    /* 装配后重新算「每块板与它自己的颜色掩码」的 IoU —— 这才是「姿势还原度」，
     * 拟合阶段那个 0.88 只是单块模板分，不能代表最终形状 */
    res.forEach(p => { p.finalIoU = SNAP.iouMask(p.pts, p.src.mask, s, gx0, gy0); });
    const pieces = res.map(p => ({
      id: idOf.get(p.src) || p.key,
      x: r3(p.x), y: r3(p.y),
      angle: p.ang, flipped: p.fl,
      _pts: p.pts
    }));

    const ids = pieces.map(p => p.id).sort().join(',');
    if (ids !== 'P,S,T1,T2,T3,T4,T5') throw new Error('图案 ' + (g + 1) + ' 板件不全: ' + ids);

    /* 精确并集轮廓 */
    const polys = pieces.map(p => p._pts);
    const sp = UNION.splitLoops(UNION.unionPolys(polys, 0.01), polys);
    const outline = sp.outer.map(v => [r3(v[0]), r3(v[1])]);
    const holes = (sp.holes || []).map(h => h.map(v => [r3(v[0]), r3(v[1])]));

    const sumA = polys.reduce((a, p) => a + Math.abs(areaOf(p)), 0);
    const outA = Math.abs(areaOf(sp.outer)) - (sp.holes || []).reduce((a, h) => a + Math.abs(areaOf(h)), 0);
    let maxOv = 0;
    for (let i = 0; i < polys.length; i++) {
      for (let j = i + 1; j < polys.length; j++) {
        const ov = G.convexOverlapArea(polys[i], polys[j]);
        if (ov > maxOv) maxOv = ov;
      }
    }
    /* 验收线：顶点被两块以上板精确共用的比例。
     * 几何章 67~90%（干净），生肖章 5~15%（有台阶的那批）。目标 ≥ 70%。 */
    const vs = sharedStat(polys);
    const bb = bbox(outline);
    out.push({
      name: NAMES[g].name,
      tip: NAMES[g].tip,
      pieces: pieces.map(p => ({
        id: p.id,
        x: Math.round(p.x * U * 100) / 100, y: Math.round(p.y * U * 100) / 100,
        angle: p.angle, flipped: p.flipped
      })),
      outline: outline.map(v => [Math.round(v[0] * U * 100) / 100, Math.round(v[1] * U * 100) / 100]),
      holes: holes.map(h => h.map(v => [Math.round(v[0] * U * 100) / 100, Math.round(v[1] * U * 100) / 100])),
      meta: { gx0: r3(gx0), gy0: r3(gy0), scale: r3(s) },
      quality: {
        pieces: pieces.length,
        areaPieces: r3(sumA), areaOutline: r3(outA),
        areaErrPct: r3((outA - sumA) / sumA * 100),
        maxOverlap: r3(maxOv),
        width: r3(bb.w * U), height: r3(bb.h * U),
        vClusters: vs.total, vShared: vs.shared, vRatioPct: r3(vs.shared / vs.total * 100),
        minIoU: r3(Math.min.apply(null, fits.map(f => f.iou))),
        avgIoU: r3(fits.reduce((a, f) => a + f.iou, 0) / 7)
      }
    });
    console.log(('图案 ' + (g + 1) + ' ' + NAMES[g].name).padEnd(11),
      '宽高 ' + bb.w.toFixed(1) + '×' + bb.h.toFixed(1),
      '点 ' + String(outline.length).padStart(2),
      '面积差 ' + ((outA - sumA) / sumA * 100).toFixed(3) + '%',
      '压叠 ' + maxOv.toFixed(4),
      '共用顶点 ' + vs.shared + '/' + vs.total + '(' + (vs.shared / vs.total * 100).toFixed(0) + '%)',
      '还原IoU 均 ' + (res.reduce((a, p) => a + p.finalIoU, 0) / 7).toFixed(3),
      '最差 ' + Math.min.apply(null, res.map(p => p.finalIoU)).toFixed(3));
  }

  const file = path.join(__dirname, 'dancers_exact.json');
  fs.writeFileSync(file, JSON.stringify(out, null, 1));
  console.log('写出', file);
}

const r3 = v => Math.round(v * 1000) / 1000;
function areaOf(p) {
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s / 2;
}
/* 顶点共用统计：把所有板的顶点聚类（0.06u 容差），统计有多少个顶点被 ≥2 块板共用。
 * 这是「有没有缝 / 台阶」的硬指标 —— 真解里相邻板必然精确共用顶点。 */
function sharedStat(polys) {
  const all = [];
  polys.forEach((p, i) => p.forEach(v => all.push({ v, i })));
  const cl = [];
  for (const a of all) {
    let c = cl.find(c => Math.hypot(c.v[0] - a.v[0], c.v[1] - a.v[1]) < 0.06);
    if (!c) { c = { v: a.v, ps: new Set() }; cl.push(c); }
    c.ps.add(a.i);
  }
  return { total: cl.length, shared: cl.filter(c => c.ps.size > 1).length };
}

function bbox(pts) {  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  pts.forEach(v => { x0 = Math.min(x0, v[0]); y0 = Math.min(y0, v[1]); x1 = Math.max(x1, v[0]); y1 = Math.max(y1, v[1]); });
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}

main();
