/* 舞者关卡构建：用 12 生肖那套「贴边装配」把拟合结果变成精确解
 * ------------------------------------------------------------------
 * 拟合只用来回答「这块板大概在哪、朝哪」，至于**精确落位**交给 tools/zodiac/lib.js
 * 的 Asm.autoPlace —— 它枚举 8 个 45° 角 × 2 种翻面，找出「贴着已放板、不压叠、
 * 贴合长度够长、质心最靠近目标点」的那个位置。这样得到的每块板都精确共边，
 * 不可能留缝或出台阶（十二生肖就是这么建的，57 关跑下来没出过结构瑕疵）。
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { readPng } = require('./pngio.js');
const SEG = require('./seg.js');
const FIT = require('./fit.js');
const L = require(path.join(__dirname, '..', 'zodiac', 'lib.js'));
const UNION = require(path.join(__dirname, '..', 'zodiac', 'union.js'));

const IMG = process.argv[2] || path.join(__dirname, 'ref.png');
const U = 96;

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
const C2 = (() => {
  const o = [];
  for (let i = 0; i < 7; i++) for (let j = i + 1; j < 7; j++) o.push([i, j]);
  return o;
})();
function allocate(aoi) {
  let best = null;
  for (const big of C2) {
    const r1 = [0, 1, 2, 3, 4, 5, 6].filter(i => big.indexOf(i) < 0);
    for (const mid of r1) {
      const r2 = r1.filter(i => i !== mid);
      for (const sq of r2) {
        const r3 = r2.filter(i => i !== sq);
        for (let a = 0; a < r3.length; a++) for (let b = a + 1; b < r3.length; b++) {
          const sm = [r3[a], r3[b]];
          const pl = r3.filter(i => i !== sm[0] && i !== sm[1]);
          if (pl.length !== 1) continue;
          const sum = aoi[big[0]].T1 + aoi[big[1]].T1 + aoi[mid].T3 + aoi[sq].S
            + aoi[sm[0]].T4 + aoi[sm[1]].T4 + aoi[pl[0]].P;
          if (!best || sum > best.sum) {
            const asg = [];
            big.forEach(i => { asg[i] = 'T1'; });
            asg[mid] = 'T3'; asg[sq] = 'S'; asg[sm[0]] = 'T4'; asg[sm[1]] = 'T4'; asg[pl[0]] = 'P';
            best = { sum, asg };
          }
        }
      }
    }
  }
  return best;
}

/* 面积降序的装配顺序：大三角先摆，小三角最后贴 */
const ORDER = ['T1', 'T2', 'T3', 'S', 'P', 'T4', 'T5'];
const KEY2ID = { T1: 'T1', T3: 'T3', S: 'S', T4: 'T4', P: 'P' };

function areaOf(p) {
  let s = 0;
  for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; }
  return Math.abs(s) / 2;
}
function bbox(pts) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  pts.forEach(v => { x0 = Math.min(x0, v[0]); y0 = Math.min(y0, v[1]); x1 = Math.max(x1, v[0]); y1 = Math.max(y1, v[1]); });
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}

function main() {
  const img = readPng(IMG);
  const idx = SEG.colorIndex(img);
  const figs = SEG.figures(idx, img.w, img.h);
  const list = Object.values(figs);
  let px = 0; list.forEach(f => { px += f.n; });
  const s = Math.sqrt(px / (10 * 16));
  console.log('1 单位 ≈', s.toFixed(3), 'px');

  const out = [];
  for (let g = 0; g < 10; g++) {
    const sub = list.filter(f => f.fig === g).sort((a, b) => b.n - a.n).slice(0, 7);
    let gx0 = 1e9, gy0 = 1e9;
    sub.forEach(f => { gx0 = Math.min(gx0, f.bx); gy0 = Math.min(gy0, f.by); });

    const raw = sub.map(f => {
      const r = FIT.fitPiece(f, s);
      return { n: f.n, per: r.per, bx: r.bx, by: r.by };
    });
    const aoi = raw.map(r => {
      const o = {};
      SHAPES.forEach(k => { o[k] = r.per[k].iou; });
      return o;
    });
    const alloc = allocate(aoi);
    const blocks = raw.map((r, i) => {
      const shape = alloc.asg[i];
      const c = r.per[shape];
      return {
        shape, n: r.n,
        cx: (r.bx + c.cx - gx0) / s,
        cy: (r.by + c.cy - gy0) / s,
        ang: c.ang, fl: c.fl
      };
    });
    /* 大三角两块 → T1/T2，小三角两块 → T4/T5 */
    const bigs = blocks.filter(b => b.shape === 'T1').sort((a, b) => b.n - a.n);
    const smalls = blocks.filter(b => b.shape === 'T4').sort((a, b) => b.n - a.n);
    bigs[0].id = 'T1'; bigs[1].id = 'T2';
    smalls[0].id = 'T4'; smalls[1].id = 'T5';
    blocks.forEach(b => { if (!b.id) b.id = b.shape; });

    /* --- 用 Asm 精确装配 --- */
    const asm = new L.Asm();
    /* 第一块：取面积最大的（T1），角度/翻面沿用拟合，质心吸附到 1/4 u */
    const first = blocks.filter(b => b.id === 'T1')[0];
    asm.place('T1', Math.round(first.cx * 4) / 4, Math.round(first.cy * 4) / 4, first.ang, first.fl);
    const used = new Set(['T1']);
    let fail = [];
    for (const id of ORDER) {
      if (used.has(id)) continue;
      const b = blocks.find(x => x.id === id);
      let ok = false;
      for (const m of [0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0]) {
        try { asm.autoPlace(id, b.cx, b.cy, m); ok = true; break; } catch (e) { /* 放宽再试 */ }
      }
      if (!ok) fail.push(id);
      used.add(id);
    }
    if (fail.length) throw new Error('图案 ' + (g + 1) + ' 放不下：' + fail.join(','));

    const lack = asm.connected();
    if (lack.length) console.warn('  ! 图案 ' + (g + 1) + ' 未接触的板：' + lack.join(','));

    /* --- 输出（u → 世界单位） --- */
    const items = asm.items.map(it => ({
      id: it.id, a: it.a, f: it.f, pts: it.pts, t: [it.x, it.y]
    }));
    const polys = items.map(it => it.pts);
    const loops = UNION.unionPolys(polys, 0.01);
    const sp = UNION.splitLoops(loops, polys);
    const bb = bbox(asm.all());
    const sumA = polys.reduce((a, p) => a + areaOf(p), 0);
    const outA = Math.abs(areaOf(sp.outer));

    out.push({
      name: NAMES[g].name,
      tip: NAMES[g].tip,
      pieces: items.map(it => ({
        id: it.id,
        x: Math.round(it.t[0] * U * 100) / 100,
        y: Math.round(it.t[1] * U * 100) / 100,
        angle: it.a, flipped: it.f
      })),
      outline: sp.outer.map(v => [Math.round(v[0] * U * 100) / 100, Math.round(v[1] * U * 100) / 100]),
      holes: (sp.holes || []).map(h => h.map(v => [Math.round(v[0] * U * 100) / 100, Math.round(v[1] * U * 100) / 100])),
      quality: {
        areaPieces: +sumA.toFixed(3), areaOutline: +outA.toFixed(3),
        areaErrPct: +((outA - sumA) / sumA * 100).toFixed(3),
        width: Math.round(bb.w * U * 100) / 100, height: Math.round(bb.h * U * 100) / 100,
        outlinePts: sp.outer.length,
        avgIoU: +(blocks.reduce((a, b) => a + (b.shape ? 0 : 0), 0)).toFixed(3)
      }
    });
    console.log(('图案 ' + (g + 1) + ' ' + NAMES[g].name).padEnd(11),
      '宽高 ' + (bb.w * U).toFixed(0) + '×' + (bb.h * U).toFixed(0),
      '点 ' + String(sp.outer.length).padStart(2),
      '面积差 ' + ((outA - sumA) / sumA * 100).toFixed(3) + '%',
      '接触 ' + (lack.length ? '缺 ' + lack.join(',') : 'OK'));
  }

  const file = path.join(__dirname, 'dancers_exact.json');
  fs.writeFileSync(file, JSON.stringify(out, null, 1));
  console.log('写出', file);
}

main();
