/* v0.63 修复：生肖·龙（第 50 关）尾巴的中三角比背线高出 16.7，剪影顶边多一道台阶
 * ---------------------------------------------------------------
 * 现象（用户截图）：尾巴上缘（中三角 T3 的顶边）比身体上缘（大三角 T2 的顶边）高出
 * 16.7 单位，两条水平线在 x≈705 处错开，中间还留了一个 16×16 的小勾 —— 缩略图上看
 * 就是「中三角的位置偏上」。
 *
 * 根因：v0.52 为了让整条龙塞进 1000 宽的卡纸，把「绿中三角 T3 + 粉小三角 T4」沿
 * 红色大三角 T1 的 45° 右腰往上滑了 72 单位（见 docs/v0.52）。上滑本身是对的
 * （贴着腰滑不会开缝），但滑过头了：T3 的顶边从「低于背线 55」变成「高于背线 16.7」，
 * 于是背线断成两截，还多出一个小勾。
 *
 * 修法：沿同一条 45° 腰往下滑回 16.735，正好让
 *        T3 顶边 == T2 顶边（y=440.51）
 *   · 沿腰平移 ⇒ T3 的斜边仍与 T1 的右腰共线，不开缝、不压叠
 *   · T4 跟着一起平移（它坐在 T3 的顶边上），并把 0.04 的历史缝一并对齐
 *   ⇒ 整条背线从橙色正方形一路直通到尾鳍根部，台阶与小勾都消失
 *   ⇒ 宽度 927 → 943.8（仍有 28 单位留白，不贴卡纸边）
 *   没有滑到「参考图的原始位置」（再往下 52 会让龙宽到 993，v0.52 的老问题）。
 *
 * 顺带：整体左移居中；剪影用「顶点精确并集」重写（不再走栅格描边，所以不再有 0.5 小折）。
 *
 * 幂等：T3 顶边已经与 T2 顶边齐平就直接跳过。
 * 用法：node tools/fix_dragon_tail.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const FILE = path.join(ROOT, 'js/levels.js');
const ID = 50;

const g = {};
(new Function('window', fs.readFileSync(path.join(ROOT, 'js/levels.js'), 'utf8')))(g);
require(path.join(ROOT, 'js/geom.js'));
const G = globalThis.TANGRAM_GEOM;
const DS = g.TANGRAM_SETS.tangram7;
const UNIT = DS.dataset.unitScale;
const lv = DS.levels.find(l => l.id === ID);

const LOCAL = {};
for (const id in DS.dataset.pieces) {
  LOCAL[id] = G.makeLocal(DS.dataset.pieces[id].base).map(v => [v[0] * UNIT, v[1] * UNIT]);
}
const r2 = n => Math.round(n * 100) / 100;
const r3 = n => Math.round(n * 1000) / 1000;

/* 当前标准解 → 七块多边形 */
const sol0 = {};
lv.solution.forEach(s => { sol0[s.id] = s; });
function polyOf(st) { return G.toWorld(LOCAL[st.id], st); }
const cur = {};
lv.solution.forEach(s => { cur[s.id] = polyOf(s); });

const minY = pl => Math.min(...pl.map(v => v[1]));
const maxY = pl => Math.max(...pl.map(v => v[1]));

const t2Top = minY(cur.T2), t3Top = minY(cur.T3), t4Bot = maxY(cur.T4);
const d = r3(t2Top - t3Top);
console.log('T2 顶边', t2Top.toFixed(3), ' T3 顶边', t3Top.toFixed(3), ' T4 底边', t4Bot.toFixed(3));
console.log('需沿 45° 腰下滑', d, ' 单位');

if (Math.abs(d) < 0.05) {
  console.log('已经齐平，跳过');
  process.exit(0);
}

/* ---------- 1. 平移：T3 沿 45° 腰下滑 d；T4 跟着走，并把 0.04 的缝对齐 ---------- */
const sol = lv.solution.map(s => {
  if (s.id === 'T3') return { ...s, x: r2(s.x + d), y: r2(s.y + d) };
  if (s.id === 'T4') return { ...s, x: r2(s.x + d), y: r2(s.y + (t3Top - t4Bot) + d) };
  return { ...s };
});
const moved = {};
sol.forEach(s => { moved[s.id] = polyOf(s); });

/* ---------- 2. 整体左移，让左右留白相等（和 fix_pieces 的 M 口径一致） ---------- */
let x0 = 1e9, x1 = -1e9;
sol.forEach(s => moved[s.id].forEach(v => { x0 = Math.min(x0, v[0]); x1 = Math.max(x1, v[0]); }));
const GLOBALX = r2(500 - (x0 + x1) / 2);
console.log('bbox x', x0.toFixed(1), '..', x1.toFixed(1), ' 居中平移', GLOBALX);
const solF = sol.map(s => ({ ...s, x: r2(s.x + GLOBALX) }));
const fin = {};
solF.forEach(s => { fin[s.id] = polyOf(s); });

/* ---------- 3. 剪影：顶点精确并集（不描边、不外扩） ---------- */
function ext(pl, cmp) { return pl.reduce((a, b) => (cmp(b, a) ? b : a)); }
const t1 = fin.T1, t2 = fin.T2, t3 = fin.T3, t4 = fin.T4, S = fin.S, P = fin.P, t5 = fin.T5;

const t2TopY = minY(t2), sBotY = maxY(S), sLeftX = Math.min(...S.map(v => v[0]));
const sRightX = Math.max(...S.map(v => v[0])), sTopY = minY(S);
const t2LeftX = Math.min(...t2.map(v => v[0]));
const pt = (a, b) => [r2(a), r2(b)];

const finApex = ext(t4, (b, a) => b[1] < a[1]);          // 尾鳍顶尖
const finHyp = ext(t4, (b, a) => b[0] > a[0]);           // 尾鳍斜边落点
const t3Right = ext(t3, (b, a) => b[0] > a[0]);
const t3Apex = ext(t3, (b, a) => b[1] > a[1]);
const t1Right = ext(t1, (b, a) => b[0] > a[0]);
const t1Left = ext(t1, (b, a) => b[0] < a[0]);
const t2Apex = ext(t2, (b, a) => b[1] > a[1]);
const t5Left = ext(t5, (b, a) => b[0] < a[0]);
const t5Top = ext(t5, (b, a) => b[1] < a[1]);
const pMinX = Math.min(...P.map(v => v[0]));
const pTopRight = ext(P, (b, a) => b[0] > a[0]);
const pBotLeft = ext(P.filter(v => Math.abs(v[0] - pMinX) < 0.5), (b, a) => b[1] > a[1]);

const outline = [
  pt(finApex[0], finApex[1]),        // 1  尾鳍顶
  pt(finHyp[0], finHyp[1]),          // 2  尾鳍斜边落点（在背线上）
  pt(t3Right[0], t3Right[1]),        // 3  中三角最右点（背线再往东一点）
  pt(t3Apex[0], t3Apex[1]),          // 4  中三角尖（尾巴下方的 V 谷）
  pt(t1Right[0], t1Right[1]),        // 5  红大三角右下角
  pt(t1Left[0], t1Left[1]),          // 6  红大三角左下角
  pt(t2Apex[0], t2Apex[1]),          // 7  后腿
  pt(t2LeftX, sBotY),                // 8  后腿内侧竖边上端
  pt(sLeftX, sBotY),                 // 9  正方形左下
  pt(pBotLeft[0], pBotLeft[1]),      // 10 平行四边形左下
  pt(t5Left[0], t5Left[1]),          // 11 紫三角左尖（头）
  pt(t5Top[0], t5Top[1]),            // 12 紫三角上顶点
  pt(pTopRight[0], pTopRight[1]),    // 13 平行四边形右上
  pt(sRightX, sTopY),                // 14 正方形右上
  pt(t2LeftX, t2TopY),               // 15 背线抬 1.8（正方形 442.34 → 大三角 440.51）
  pt(finApex[0], t2TopY)             // 16 背线一路到尾鳍根部
];

/* ---------- 4. 自检 ---------- */
let ov = 0;
for (let i = 0; i < solF.length; i++) {
  for (let j = i + 1; j < solF.length; j++) {
    ov += G.convexOverlapArea(fin[solF[i].id], fin[solF[j].id]);
  }
}
const sumA = solF.reduce((a, s) => a + G.area(fin[s.id]), 0);
const outA = G.area(outline);
const outside = solF.filter(s => !G.pieceInside(fin[s.id], outline, [], 0.75)).map(s => s.id);
/* 自交检测 */
function segInt(a, b, c, d) {
  const s = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return s(a, b, c) !== s(a, b, d) && s(c, d, a) !== s(c, d, b);
}
let cross = 0;
for (let i = 0; i < outline.length; i++) {
  for (let j = i + 2; j < outline.length; j++) {
    if (i === 0 && j === outline.length - 1) continue;
    if (segInt(outline[i], outline[(i + 1) % outline.length],
               outline[j], outline[(j + 1) % outline.length])) cross++;
  }
}
console.log('自检：重叠合计', ov.toFixed(1), '（', (ov / sumA * 100).toFixed(3), '% ）',
  ' 面积 板', sumA.toFixed(1), '剪影', outA.toFixed(1), '差', (outA - sumA).toFixed(1),
  ' 越界块', outside.length ? outside.join(',') : '无', ' 自交', cross);
if (cross || outside.length || ov > 40 || Math.abs(outA - sumA) > 40) {
  console.log('自检没过，不写文件');
  process.exit(1);
}

/* ---------- 5. 内部贴合线（只影响提示档位标记） ---------- */
function splitLinesOf(polys) {
  const out = [], seen = {};
  const key = (a, b) => [a, b].map(v => v.map(n => Math.round(n * 2) / 2).join(',')).sort().join('|');
  for (let i = 0; i < polys.length; i++) {
    for (let j = i + 1; j < polys.length; j++) {
      const A = polys[i], B = polys[j];
      for (let ia = 0; ia < A.length; ia++) {
        const a0 = A[ia], a1 = A[(ia + 1) % A.length];
        const dx = a1[0] - a0[0], dy = a1[1] - a0[1], L2 = dx * dx + dy * dy;
        if (L2 < 1) continue;
        const L = Math.sqrt(L2);
        for (let ib = 0; ib < B.length; ib++) {
          const b0 = B[ib], b1 = B[(ib + 1) % B.length];
          const db0 = Math.abs(((b0[0] - a0[0]) * dy - (b0[1] - a0[1]) * dx) / L);
          const db1 = Math.abs(((b1[0] - a0[0]) * dy - (b1[1] - a0[1]) * dx) / L);
          if (db0 > 0.6 || db1 > 0.6) continue;
          const t0 = ((b0[0] - a0[0]) * dx + (b0[1] - a0[1]) * dy) / L2;
          const t1 = ((b1[0] - a0[0]) * dx + (b1[1] - a0[1]) * dy) / L2;
          const lo = Math.max(0, Math.min(t0, t1)), hi = Math.min(1, Math.max(t0, t1));
          if ((hi - lo) * L < 8) continue;
          const p0 = [a0[0] + dx * lo, a0[1] + dy * lo];
          const p1 = [a0[0] + dx * hi, a0[1] + dy * hi];
          const k = key(p0, p1);
          if (seen[k]) continue;
          seen[k] = 1;
          out.push([[r2(p0[0]), r2(p0[1])], [r2(p1[0]), r2(p1[1])]]);
        }
      }
    }
  }
  return out;
}
const splitLines = splitLinesOf(solF.map(s => fin[s.id]));

/* ---------- 6. 写回 js/levels.js ---------- */
let src = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n');
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

function replaceArr(text, k, value) {
  const kk = text.indexOf('"' + k + '":[');
  if (kk < 0) throw new Error('字段没找到 ' + k);
  let i = text.indexOf('[', kk), d2 = 0, j = i, inS = false, es = false;
  for (; j < text.length; j++) {
    const c = text[j];
    if (inS) { if (es) es = false; else if (c === '\\') es = true; else if (c === '"') inS = false; continue; }
    if (c === '"') { inS = true; continue; }
    if (c === '[') d2++;
    else if (c === ']') { d2--; if (d2 === 0) break; }
  }
  return text.slice(0, i) + JSON.stringify(value) + text.slice(j + 1);
}
obj = replaceArr(obj, 'outline', outline);
obj = replaceArr(obj, 'solution', solF);
obj = replaceArr(obj, 'splitLines', splitLines);
src = src.slice(0, at) + obj + src.slice(end);
fs.writeFileSync(FILE, src);
console.log('已写入 js/levels.js');
console.log('outline', JSON.stringify(outline));
