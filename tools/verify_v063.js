/* v0.63 验收：字母 Y 竖干错位 + 生肖龙尾巴中三角偏上
 * ---------------------------------------------------------------
 * 两条用户反馈都表现为「本来该是一条直线的边上多了个台阶」，所以这里不靠看图，
 * 而是用「切片」直接验证直线性：在竖干高度上横着切、在背线上竖着切，
 * 看交点是否始终落在同一条线（±0.2）上。
 *
 * 验的东西：
 *   A. 字母 Y（第 44 关）
 *     1. 七块齐全、面积 16u²
 *     2. T2/T3 的右竖边 == P 的右竖边（平移只差 12.76，现在必须完全共线）
 *     3. 竖干高度上横切：交点恒为 2 个，右侧交点 x 恒定（旧版在 y=614 处跳 12.76）
 *     4. 竖干左边缘同样恒定
 *     5. 七块都在剪影内、互不压叠、面积守恒
 *     6. 剪影是简单多边形
 *   B. 生肖龙（第 50 关）
 *     7. T3 顶边 == T2 顶边（旧版高 16.735）
 *     8. 背线上竖切：最高点 y 恒定（旧版在 x≈700 处跳 16.7 并留一个小勾）
 *     9. 宽度 ≤ 950（不再贴卡纸边）、左右留白差 ≤ 2
 *    10. 七块在剪影内、压叠 < 0.5%、面积守恒、简单多边形
 *   C. 源码级
 *    11. Y 的剪影不再含旧的错位点 (555.25,602.25)
 *    12. 龙的剪影不再含旧的台阶点 (704.41,440.22)/(688.41,424.22)
 *   D. 两关都能被判定接受（标准解 → coverage/overlap 达标）
 *
 * 用法：node tools/verify_v063.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

require(path.join(ROOT, 'js/levels.js'));
require(path.join(ROOT, 'js/geom.js'));
require(path.join(ROOT, 'js/judge.js'));

const G = globalThis.TANGRAM_GEOM;
const J = globalThis.TANGRAM_JUDGE;
const S7 = globalThis.TANGRAM_SETS.tangram7;
const UNIT = S7.dataset.unitScale;
const LOCAL = {};
Object.keys(S7.dataset.pieces).forEach(id => {
  LOCAL[id] = G.makeLocal(S7.dataset.pieces[id].base).map(v => [v[0] * UNIT, v[1] * UNIT]);
});
const lvOf = id => S7.levels.find(l => l.id === id);
const polyOf = st => G.toWorld(LOCAL[st.id], st);

let bad = 0;
function check(label, ok, detail) {
  if (!ok) bad++;
  console.log('  [' + (ok ? 'OK' : 'XX') + '] ' + label + (detail ? '  ' + detail : ''));
}
const r2 = n => Math.round(n * 100) / 100;
const area = pl => {
  let a = 0;
  for (let i = 0; i < pl.length; i++) {
    const p = pl[i], q = pl[(i + 1) % pl.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return Math.abs(a) / 2;
};
/* 水平线 y=c 与多边形的交点 x（忽略水平边） */
function cutX(poly, c) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    if ((a[1] > c) === (b[1] > c)) continue;
    out.push(a[0] + (b[0] - a[0]) * (c - a[1]) / (b[1] - a[1]));
  }
  return out.sort((p, q) => p - q);
}
/* 竖直线 x=c 与多边形的交点 y */
function cutY(poly, c) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    if ((a[0] > c) === (b[0] > c)) continue;
    out.push(a[1] + (b[1] - a[1]) * (c - a[0]) / (b[0] - a[0]));
  }
  return out.sort((p, q) => p - q);
}
function simple(poly) {
  const s = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  for (let i = 0; i < poly.length; i++) {
    for (let j = i + 2; j < poly.length; j++) {
      if (i === 0 && j === poly.length - 1) continue;
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const c = poly[j], d = poly[(j + 1) % poly.length];
      if (s(a, b, c) !== s(a, b, d) && s(c, d, a) !== s(c, d, b)) return false;
    }
  }
  return true;
}
function overlapTotal(polys) {
  let ov = 0;
  for (let i = 0; i < polys.length; i++) {
    for (let j = i + 1; j < polys.length; j++) ov += G.convexOverlapArea(polys[i], polys[j]);
  }
  return ov;
}
const AR = UNIT * UNIT;       // 1u² = 96×96 世界单位

/* ===================== A. 字母 Y ===================== */
console.log('\n== A. 字母 Y（第 44 关）==');
{
  const lv = lvOf(44);
  const sol = lv.solution, polys = sol.map(polyOf);
  const sumA = polys.reduce((a, p) => a + area(p), 0);
  check('七块齐全', polys.length === 7, polys.length + ' 块');
  check('面积和 = 16u²', Math.abs(sumA - 16 * AR) < 1, (sumA / AR).toFixed(3) + 'u²');

  const byId = {};
  sol.forEach((s, i) => { byId[s.id] = polys[i]; });
  const P = byId.P, T2 = byId.T2, T3 = byId.T3;
  const px = Math.max(...P.map(v => v[0]));
  const t2x = Math.max(...T2.map(v => v[0]));
  const t3x = Math.max(...T3.map(v => v[0]));
  check('T2/T3 右竖边 == P 右竖边', Math.abs(t2x - px) < 0.05 && Math.abs(t3x - px) < 0.05,
    'P ' + r2(px) + ' / T2 ' + r2(t2x) + ' / T3 ' + r2(t3x));

  /* 竖干高度上横切：左右各一条竖线，位置恒定 */
  const rs = [], ls = [];
  for (let y = 520; y <= 790; y += 10) {
    const xs = cutX(lv.outline, y);
    rs.push(xs.length === 2 ? xs[1] : NaN);
    ls.push(xs.length === 2 ? xs[0] : NaN);
  }
  const span = a => Math.max(...a) - Math.min(...a);
  check('竖干横切恒为两个交点', rs.every(v => !isNaN(v)), rs.filter(v => isNaN(v)).length + ' 处异常');
  check('竖干右边缘在 520~790 恒定', span(rs) < 0.25, 'x ' + r2(Math.min(...rs)) + '~' + r2(Math.max(...rs)) + '（极差 ' + r2(span(rs)) + '）');
  check('竖干左边缘在 520~790 恒定', span(ls) < 0.25, 'x ' + r2(Math.min(...ls)) + '~' + r2(Math.max(...ls)) + '（极差 ' + r2(span(ls)) + '）');
  check('竖干宽度 = 2u（=192）', Math.abs((rs[0] - ls[0]) - 2 * UNIT) < 0.4, r2(rs[0] - ls[0]));

  const outside = sol.filter(s => !G.pieceInside(polyOf(s), lv.outline, lv.holes, 1.0)).map(s => s.id);
  check('七块都在剪影内', outside.length === 0, outside.join(',') || '无越界');
  const ov = overlapTotal(polys);
  check('互不压叠 < 0.5%', ov / sumA < 0.005, (ov / sumA * 100).toFixed(3) + '%');
  check('面积守恒（剪影 − 板 < 0.35%）', (area(lv.outline) - sumA) / sumA < 0.0035,
    ((area(lv.outline) - sumA) / sumA * 100).toFixed(3) + '%');
  check('剪影是简单多边形', simple(lv.outline), lv.outline.length + ' 点');
}

/* ===================== B. 生肖龙 ===================== */
console.log('\n== B. 生肖 龙（第 50 关）==');
{
  const lv = lvOf(50);
  const sol = lv.solution, polys = sol.map(polyOf);
  const sumA = polys.reduce((a, p) => a + area(p), 0);
  const byId = {};
  sol.forEach((s, i) => { byId[s.id] = polys[i]; });
  const minY = pl => Math.min(...pl.map(v => v[1]));
  const maxY = pl => Math.max(...pl.map(v => v[1]));

  check('七块齐全', polys.length === 7, polys.length + ' 块');
  check('面积和 = 16u²', Math.abs(sumA - 16 * AR) < 1, (sumA / AR).toFixed(3) + 'u²');
  check('T3 顶边 == T2 顶边（背线不再错开）',
    Math.abs(minY(byId.T3) - minY(byId.T2)) < 0.05,
    'T2 ' + r2(minY(byId.T2)) + ' / T3 ' + r2(minY(byId.T3)));

  /* 背线上竖切：最高点恒定 */
  const tops = [];
  for (let x = 470; x <= 800; x += 10) {
    const ys = cutY(lv.outline, x);
    tops.push(ys.length ? ys[0] : NaN);
  }
  const tSpan = Math.max(...tops) - Math.min(...tops);
  check('背线在 x470~800 恒定（无台阶、无小勾）', tops.every(v => !isNaN(v)) && tSpan < 0.25,
    'y ' + r2(Math.min(...tops)) + '~' + r2(Math.max(...tops)) + '（极差 ' + r2(tSpan) + '）');

  const x0 = Math.min(...lv.outline.map(v => v[0]));
  const x1 = Math.max(...lv.outline.map(v => v[0]));
  check('宽度 ≤ 950（不贴卡纸边）', x1 - x0 <= 950, r2(x1 - x0) + ' 单位');
  check('左右留白差 ≤ 2', Math.abs(x0 - (1000 - x1)) <= 2, '左 ' + r2(x0) + ' / 右 ' + r2(1000 - x1));

  const outside = sol.filter(s => !G.pieceInside(polyOf(s), lv.outline, lv.holes, 1.0)).map(s => s.id);
  check('七块都在剪影内', outside.length === 0, outside.join(',') || '无越界');
  const ov = overlapTotal(polys);
  check('互不压叠 < 0.5%', ov / sumA < 0.005, (ov / sumA * 100).toFixed(3) + '%');
  check('面积守恒（剪影 − 板 < 0.1%）', Math.abs(area(lv.outline) - sumA) / sumA < 0.001,
    ((area(lv.outline) - sumA) / sumA * 100).toFixed(3) + '%');
  check('剪影是简单多边形', simple(lv.outline), lv.outline.length + ' 点');
}

/* ===================== C. 源码级：旧错位点不再出现 ===================== */
console.log('\n== C. 源码级 ==');
{
  const y = lvOf(44), dr = lvOf(50);
  const has = (lv, x, yv) => lv.outline.some(v => Math.abs(v[0] - x) < 0.06 && Math.abs(v[1] - yv) < 0.06);
  check('Y 剪影不含旧错位点 (555.25,602.25)', !has(y, 555.25, 602.25));
  check('Y 剪影不含旧台阶点 (363,409.38)', !has(y, 363, 409.38));
  check('龙剪影不含旧台阶点 (704.41,440.22)', !has(dr, 704.41, 440.22));
  check('龙剪影不含旧小勾 (688.41,424.22)', !has(dr, 688.41, 424.22));
}

/* ===================== D. 判定接受度 ===================== */
console.log('\n== D. 判定接受度（标准解 → 覆盖率/压叠）==');
{
  for (const id of [44, 50]) {
    const lv = lvOf(id);
    const jd = new J.Judge();
    jd.setTarget(lv.outline, lv.holes);
    const r = jd.judge(lv.solution.map((s, i) => [polyOf(s), i]));
    check('第 ' + id + ' 关 ' + lv.name + ' 标准解通过判定',
      r.coverage >= 0.99 && r.overlapPairs.length === 0,
      '覆盖率 ' + (r.coverage * 100).toFixed(2) + '% 溢出 ' + (r.overflow * 100).toFixed(2) +
      '% 压叠对 ' + (r.overlapPairs.length || '无'));
  }
}

console.log('\n' + (bad ? 'v0.63 验收有 ' + bad + ' 项失败' : 'v0.63 验收全部通过'));
process.exit(bad ? 1 : 0);
