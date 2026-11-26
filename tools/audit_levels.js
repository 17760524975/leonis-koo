/* 全量体检：每个关卡（七巧板数据集）
 *  - 标准解七块两两重叠面积（>1 px² 就报）
 *  - 每块是否 pieceInside(outline)
 *  - 轮廓面积 vs 板件面积和
 * 用法：node tools/audit_levels.js [chapter]
 */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');
require(path.join(ROOT, 'js/config.js'));
const G = require(path.join(ROOT, 'js/geom.js'));
require(path.join(ROOT, 'js/levels.js'));

const DS = globalThis.TANGRAM_SETS.tangram7;
const UNIT = DS.dataset.unitScale;
const LOCAL = {};
for (const id in DS.dataset.pieces) LOCAL[id] = G.makeLocal(DS.dataset.pieces[id].base).map(v => [v[0] * UNIT, v[1] * UNIT]);

const ch = process.argv[2] ? +process.argv[2] : 3;
let bad = 0;
for (const lv of DS.levels) {
  if (ch && lv.chapter !== ch) continue;
  const polys = lv.solution.map(s => ({ id: s.id, poly: G.toWorld(LOCAL[s.id], s) }));
  let ov = 0, ovPair = [];
  for (let i = 0; i < polys.length; i++)
    for (let j = i + 1; j < polys.length; j++) {
      const a = G.convexOverlapArea(polys[i].poly, polys[j].poly);
      if (a > 1) { ov += a; ovPair.push(polys[i].id + 'x' + polys[j].id + '=' + a.toFixed(0)); }
    }
  const notIn = polys.filter(p => !G.pieceInside(p.poly, lv.outline, lv.holes || [], 0.75)).map(p => p.id);
  const sum = polys.reduce((s, p) => s + G.area(p.poly), 0);
  const oa = G.area(lv.outline);
  const err = oa - sum;
  const flag = (ov > 1 || notIn.length || Math.abs(err) > 1200);
  if (flag) bad++;
  console.log(`${flag ? 'XX' : 'ok'} ${String(lv.id).padStart(3)} ${lv.name.padEnd(3)} 重叠=${ov.toFixed(0).padStart(6)} ${ovPair.join(',')}  越界=${notIn.join(',') || '-'}  面积差=${err.toFixed(0)}`);
}
console.log('\n问题关数', bad);
