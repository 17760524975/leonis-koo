/* 选剪影参数：把 (膨胀格数, DP 容差) 各试一遍，看
 *   · 12 关 pieceInside 是否全过（tol 3.0）
 *   · 轮廓面积与 7 块板面积和的相对差（verify_v050 用 0.2% 口径）
 *   · 轮廓面积是否 ≥ 板面积（剪影不能比板小）
 * 用法：node tools/zodiac/tune_outline.js
 */
const fs = require('fs');
const path = require('path');
require('../../js/geom.js');
const G = globalThis.TANGRAM_GEOM;
const L = require('./lib.js');
const UN = require('./union.js');

const EX = JSON.parse(fs.readFileSync(path.join(__dirname, 'zodiac_exact.json'), 'utf8'));
const CASES = [];
for (const d of [0, 1, 2]) for (const dp of [0.5, 0.8, 1.2]) CASES.push([d, dp]);

CASES.forEach(([d, dp]) => {
  let okIn = 0, maxRel = 0, minRel = 9, worstIns = [];
  EX.forEach(lv => {
    const polys = lv.pieces.map(p => L.LOCAL[p.id].map(v => {
      const r = L.rot(v, p.ang, p.f);
      return [r[0] * 96 + p.x, r[1] * 96 + p.y];
    }));
    const o = UN.rasterOutline(polys, 0.5, d, dp);
    const sumA = polys.reduce((a, p) => a + Math.abs(L.polyArea(p)), 0);
    const holeA = (lv.holes || []).reduce((a, h) => a + Math.abs(L.polyArea(h)), 0);
    const outA = Math.abs(L.polyArea(o)) - holeA;
    const rel = (outA - sumA) / sumA;
    if (rel > maxRel) maxRel = rel;
    if (rel < minRel) minRel = rel;
    const ins = polys.every(p => G.pieceInside(p, o, lv.holes || [], 3.0));
    if (ins) okIn++; else worstIns.push(lv.name);
  });
  console.log('膨胀' + d + '格 DP' + dp + ' → inside ' + okIn + '/12  面积差 ' +
    (minRel * 100).toFixed(3) + '% ~ ' + (maxRel * 100).toFixed(3) + '%' +
    (worstIns.length ? '  越界: ' + worstIns.join(',') : ''));
});
