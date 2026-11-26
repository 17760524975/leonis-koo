/* v0.59 修复：生肖·蛇（第 51 关）标准解里 T3 与 T1 压叠 93 单位²（0.5%），
 * 超过 JUDGE.pairOverlapTol(0.4%) → 玩家把 T3 摆到它自己的槽位也判「红色重叠」，
 * 永远卡在 6/7。根因是反解拟合把整块「T3 的斜边终点」压在「T1 底边起点」右侧
 * 19.26 单位，两块共抢了一个约 19×10 的小三角。
 *
 * 修法（不改造型、不改板件）：把 T1 / T2 / P 整体右移 19.25~19.26，
 * 让 T3 斜边终点 == T1 底边起点、T1 底边终点 == P 右上角、T2 底边两端 == T3 竖边/P 左上角，
 * 于是七块**精确共边、零压叠**；剪影按新的精确并集重写（去掉栅格描边留下的 0.5 缝隙），
 * 最后整体左移 7.5 让左右留白回到 28 单位。
 *
 * 幂等：重复运行结果不变。
 * 用法：node tools/fix_snake.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const FILE = path.join(ROOT, 'js/levels.js');
const ID = 51;

require(path.join(ROOT, 'js/config.js'));
const G = require(path.join(ROOT, 'js/geom.js'));
require(path.join(ROOT, 'js/levels.js'));
const DS = globalThis.TANGRAM_SETS.tangram7;
const UNIT = DS.dataset.unitScale;
const lv = DS.levels.find(l => l.id === ID);

const LOCAL = {};
for (const id in DS.dataset.pieces) LOCAL[id] = G.makeLocal(DS.dataset.pieces[id].base).map(v => [v[0] * UNIT, v[1] * UNIT]);

/* 1) 已修过就不用再来 */
const probe = G.toWorld(LOCAL.T3, lv.solution.find(s => s.id === 'T3'));
const t3end = probe.reduce((a, b) => (b[0] > a[0] ? b : a));
const t1base = G.toWorld(LOCAL.T1, lv.solution.find(s => s.id === 'T1'));
const t1left = t1base.reduce((a, b) => (b[0] < a[0] ? b : a));
if (Math.abs(t3end[0] - t1left[0]) < 0.05 && Math.abs(t3end[1] - t1left[1]) < 0.05) {
  console.log('已经是修好的坐标，跳过');
  process.exit(0);
}

/* 2) 平移量：让 T3 斜边终点与 T1 底边起点重合 */
const DX_T1 = t3end[0] - t1left[0];                       // ≈ +19.25
const Psh = 19.26;                                        // P 用整数底（672/864/960），单独对齐
const DX = { T1: DX_T1, T2: DX_T1, P: Psh, S: 0, T3: 0, T4: 0, T5: 0 };
/* 3) 整体左移，让左右留白相等（右端 979.26 离板边只剩 20.7，太贴边） */
const RIGHT = 960 + Psh;
const GLOBAL = Math.round((1000 - (RIGHT + 35.73)) / 2 * 100) / 100;   // ≈ -7.5

const solution = lv.solution.map(s => {
  const dx = (DX[s.id] || 0) + GLOBAL;
  return { id: s.id, x: Math.round((s.x + dx) * 100) / 100, y: s.y, angle: s.angle, flipped: s.flipped };
});
/* 顺序保持原样（绘制层次用不到，但保持稳定便于 diff） */

/* 4) 精确并集轮廓（顶点全部来自板件真实顶点） */
const outline = [
  [35.73, 308], [307.26, 308],          // 头部方块顶边
  [t3end[0], 500],                      // T3 斜边落点（谷底）
  [691.26, 308],                        // T1 顶点
  [883.26, 500],                        // T1 底边终点 = P 右上角
  [979.26, 596], [787.26, 596],         // P 尾端
  [691.26, 500],                        // P 左上角 = T2 底边终点
  [499.26, 692],                        // T2 顶点
  [307.26, 500],                        // T2 底边起点 = T3 竖边落点
  [307.26, 443.76], [35.73, 443.76]     // 头部方块底边
].map(v => [Math.round((v[0] + GLOBAL) * 100) / 100, Math.round(v[1] * 100) / 100]);

/* 5) 内部贴合线（只影响难度档位标记，与实际分割一致即可） */
function sh(pts) { return pts.map(v => [Math.round((v[0] + GLOBAL) * 100) / 100, Math.round(v[1] * 100) / 100]); }
const splitLines = [
  sh([[499.26, 500], [683.76, 500]]),   // T1 底边 / T2 底边
  sh([[683.76, 500], [875.76, 500]]),   // T1 底边 / P 顶边
  sh([[299.76, 500], [491.76, 500]]),   // T3 底边 / T2 底边
  sh([[299.76, 308], [299.76, 443.76]]),// T3 竖边 / 方块右边
  sh([[163.99, 443.76], [163.99, 308]]),// 方块内部竖线
  sh([[28.23, 443.76], [163.99, 308.01]])// T4 与 T5 的斜边
];

/* 6) 自检：零压叠 + 全部在剪影内 + 面积守恒 */
const polys = solution.map(s => ({ id: s.id, poly: G.toWorld(LOCAL[s.id], s) }));
let ov = 0;
for (let i = 0; i < polys.length; i++)
  for (let j = i + 1; j < polys.length; j++) ov += G.convexOverlapArea(polys[i].poly, polys[j].poly);
const sum = polys.reduce((a, p) => a + G.area(p.poly), 0);
const oa = G.area(outline);
const outside = polys.filter(p => !G.pieceInside(p.poly, outline, [], 0.75)).map(p => p.id);
console.log('重叠合计', ov.toFixed(3), ' 面积和', sum.toFixed(1), ' 轮廓', oa.toFixed(1), ' 差', (oa - sum).toFixed(3));
console.log('越界块', outside.length ? outside.join(',') : '无');
if (ov > 3 || outside.length || Math.abs(oa - sum) > 5) {
  console.log('自检没过，不写文件');
  process.exit(1);
}

/* 7) 写回 js/levels.js（按花括号配对定位这一关的对象） */
let src = fs.readFileSync(FILE, 'utf8');
const at = src.indexOf('{"id":' + ID + ',');
if (at < 0) throw new Error('找不到第 ' + ID + ' 关');
let depth = 0, end = -1, inStr = false, esc = false;
for (let i = at; i < src.length; i++) {
  const c = src[i];
  if (inStr) {
    if (esc) esc = false;
    else if (c === '\\') esc = true;
    else if (c === '"') inStr = false;
    continue;
  }
  if (c === '"') { inStr = true; continue; }
  if (c === '{' || c === '[') depth++;
  else if (c === '}' || c === ']') { depth--; if (depth === 0) { end = i + 1; break; } }
}
if (end < 0) throw new Error('对象没闭合');
let obj = src.slice(at, end);

function replaceArr(text, key, value) {
  const k = text.indexOf('"' + key + '":[');
  if (k < 0) throw new Error('字段没找到 ' + key);
  let i = text.indexOf('[', k), d = 0, j = i, inS = false, es = false;
  for (; j < text.length; j++) {
    const c = text[j];
    if (inS) { if (es) es = false; else if (c === '\\') es = true; else if (c === '"') inS = false; continue; }
    if (c === '"') { inS = true; continue; }
    if (c === '[') d++;
    else if (c === ']') { d--; if (d === 0) break; }
  }
  return text.slice(0, i) + JSON.stringify(value) + text.slice(j + 1);
}

obj = replaceArr(obj, 'outline', outline);
obj = replaceArr(obj, 'solution', solution);
obj = replaceArr(obj, 'splitLines', splitLines);
src = src.slice(0, at) + obj + src.slice(end);
fs.writeFileSync(FILE, src);
console.log('已写入 js/levels.js');
console.log('solution', JSON.stringify(solution));
console.log('outline', JSON.stringify(outline));
