/* 诊断：并集本身是否可信 —— 对每个图案、每个外扩量 d，报告
 *   环数 / 各环面积 / 非 45° 边（>0.05 单位）/ 短边 / 自交
 * 用法：node tools/dancer/dbg8.js [图案号 1..10]
 */
'use strict';
const path = require('path');
const { readPng } = require('./pngio.js');
const SEG = require('./seg.js');
const FIT = require('./fit.js');
const SL = require('./snapLines.js');
const OF = require('./offset.js');
const U2 = require('./union2.js');
require(path.join(__dirname, '..', '..', 'js', 'geom.js'));
const G = globalThis.TANGAM_GEOM || globalThis.TANGRAM_GEOM;

const ONLY = process.argv[2] ? +process.argv[2] - 1 : -1;
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

const img = readPng(path.join(__dirname, 'ref.png'));
const idx = SEG.colorIndex(img);
const list = Object.values(SEG.figures(idx, img.w, img.h));
let px = 0; list.forEach(f => { px += f.n; });
const s = Math.sqrt(px / (10 * 16));

function prep(g) {
  const sub = list.filter(f => f.fig === g).sort((a, b) => b.n - a.n).slice(0, 7);
  let gx0 = 1e9, gy0 = 1e9;
  sub.forEach(f => { gx0 = Math.min(gx0, f.bx); gy0 = Math.min(gy0, f.by); });
  const raw = sub.map(f => {
    const r = FIT.fitPiece(f, s);
    return { n: f.n, color: SEG.HUES[f.color].key, per: r.per, bx: r.bx, by: r.by };
  });
  const aoi = raw.map(r => { const o = {}; SHAPES.forEach(k => { o[k] = r.per[k].iou; }); return o; });
  const alloc = allocate(aoi);
  const fits = raw.map((r, i) => {
    const shape = alloc.asg[i], c = r.per[shape];
    return {
      key: shape, ang: c.ang, fl: c.fl, iou: c.iou, color: r.color,
      cx: (r.bx + c.cx - gx0) / s, cy: (r.by + c.cy - gy0) / s
    };
  });
  const polys = fits.map(f => FIT.LOCAL[f.key].map(v => {
    const q = FIT.rot(v, f.ang, f.fl);
    return [q[0] + f.cx, q[1] + f.cy];
  }));
  return { fits, polys: SL.snapLines(polys, 0.1).polys };
}

function rep(g) {
  const { fits, polys } = prep(g);
  const sumA = polys.reduce((a, p) => a + U2.areaOf(p), 0);
  console.log('=== 图案' + (g + 1) + '  板面积和 ' + sumA.toFixed(3) + '（应为 16）');
  for (const d of [0, 0.01, 0.02, 0.03]) {
    const pp = polys.map(P => OF.inflate(P, d));
    const rr = U2.unionOutline(pp, 0.02);
    const areas = rr.map(r => U2.areaOf(r));
    const tot = areas.reduce((a, b) => a + b, 0);
    console.log('  d=' + d.toFixed(2), '环', rr.length, '面积', areas.map(a => a.toFixed(3)).join(' '),
      '合计', tot.toFixed(3), '差 ' + ((tot - sumA) / sumA * 100).toFixed(2) + '%');
    if (rr.length === 1) {
      const O = rr[0];
      const bad = [], short = [];
      for (let i = 0; i < O.length; i++) {
        const a = O[i], b = O[(i + 1) % O.length];
        const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
        const off = Math.abs(((ang % 45) + 45) % 45);
        const dev = Math.min(off, 45 - off);
        if (dev > 1.5 && L > 0.05) bad.push(i + ':L' + L.toFixed(2) + '@' + ang.toFixed(0));
        if (L > 0 && L < 0.05) short.push(L.toFixed(3));
      }
      console.log('     非45边', bad.length ? bad.join(' ') : '无', '| 碎边', short.length);
    }
  }
}

if (ONLY >= 0) rep(ONLY);
else for (let g = 0; g < 10; g++) rep(g);
