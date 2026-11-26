/* v0.64 校验：舞者十关（id 58–67）
 * 用法：node tools/verify_v064.js
 *
 * 断言的重点是「避开历史瑕疵」的那几条：
 *   A. 结构合法：七块齐全、块与块不压叠（解里有压叠 = 这关不可解）
 *   B. 每块都完整落在剪影里（用游戏同一套 pieceInside，容差 3）
 *   C. 剪影本身干净：单一闭环、不自交、无零长边、无「近共线却错位」的台阶点
 *   D. 章节 / 待办文案同步（第 4 章「舞者」、全部 67 关）
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const ctx = { console };
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'levels.js'), 'utf8') + ';globalThis.__SETS=TANGRAM_SETS;', ctx);
const SETS = ctx.__SETS;
const G = require(path.join(ROOT, 'js', 'geom.js'));
const S = SETS.tangram7;
const L = S.levels;
const DS = S.dataset;

let pass = 0, fail = 0;
const bad = [];
function ok(name, cond, extra) {
  if (cond) { pass++; return true; }
  fail++; bad.push(name + (extra ? '  ' + extra : ''));
  return false;
}

/* ---------- 0. 基础 ---------- */
ok('关卡总数 67', L.length === 67, '实际 ' + L.length);
let idsOk = true;
L.forEach((lv, i) => { if (lv.id !== i + 1) idsOk = false; });
ok('id 连续 1..67', idsOk);
ok('unitScale = 96', DS.unitScale === 96, String(DS.unitScale));

/* ---------- 1. 章节表 ---------- */
const chap = (S.chapters || []).find(c => c.from === 58);
ok('存在「舞者」章节', !!chap);
ok('舞者章节 count = 10', chap && chap.count === 10, chap && String(chap.count));
ok('舞者章节在最后', S.chapters[S.chapters.length - 1] === chap);
ok('chapNames 末项为舞者·十姿', S.chapNames[S.chapNames.length - 1] === '舞者·十姿', S.chapNames.join('/'));
ok('chapTitles 末项为舞者', S.chapTitles[S.chapTitles.length - 1] === '舞者', S.chapTitles.join('/'));
ok('completeSub = 全部 67 关已通关', S.completeSub === '全部 67 关已通关', S.completeSub);

/* ---------- 2. 每关 ---------- */
const NAMES = ['回眸', '展臂', '托盘', '跃起', '垂手', '横踢', '探海', '抬腿', '跳跃', '旋身'];
const LOCAL = {};
Object.keys(DS.pieces).forEach(k => { LOCAL[k] = G.makeLocal(DS.pieces[k].base.map(v => [v[0] * DS.unitScale, v[1] * DS.unitScale])); });
const piecePoly = st => G.toWorld(LOCAL[st.id], st);

for (let k = 0; k < 10; k++) {
  const lv = L[57 + k];
  const tag = 'L' + (58 + k) + lv.name;
  ok(tag + ' chapter=4', lv.chapter === 4, String(lv.chapter));
  ok(tag + ' 名称正确', lv.name === NAMES[k], lv.name);
  ok(tag + ' tip 带「舞者·十姿」', /^舞者·十姿 · /.test(lv.tip || ''), lv.tip);
  ok(tag + ' 七块', lv.solution.length === 7, String(lv.solution.length));
  ok(tag + ' 板块齐全', lv.solution.map(s => s.id).sort().join(',') === 'P,S,T1,T2,T3,T4,T5');
  ok(tag + ' 角度合法', lv.solution.every(s => s.angle % 45 === 0 && s.angle >= 0 && s.angle < 360),
    lv.solution.map(s => s.angle).join(','));

  const polys = lv.solution.map(piecePoly);

  /* A. 压叠 */
  let maxOv = 0;
  for (let i = 0; i < 7; i++) {
    for (let j = i + 1; j < 7; j++) {
      maxOv = Math.max(maxOv, G.convexOverlapArea(polys[i], polys[j]));
    }
  }
  /* 最小板面积 = 1u² = 96² = 9216 世界单位²；阈值取 0.5%（46） */
  ok(tag + ' 无压叠', maxOv <= 46, maxOv.toFixed(1) + ' u²');

  /* B. 整块落在剪影里（游戏容差 3） */
  const outside = polys.filter(P => !G.pieceInside(P, lv.outline, lv.holes || [], 3));
  ok(tag + ' 七块全在剪影内', outside.length === 0, outside.length + ' 块越界');

  /* C. 剪影干净 */
  const O = lv.outline;
  ok(tag + ' 轮廓 ≥ 9 点', O.length >= 9, String(O.length));
  let dup = 0, shortE = 0, step = 0;
  for (let i = 0; i < O.length; i++) {
    const a = O[i], b = O[(i + 1) % O.length], c = O[(i + 2) % O.length];
    const L1 = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L1 < 6) shortE++;
    const t1 = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const t2 = Math.atan2(c[1] - b[1], c[0] - b[0]);
    const d = Math.abs(((t2 - t1 + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * 180 / Math.PI;
    if (d < 2) step++;                                  /* 近共线却还留一个点 = 台阶 */
    for (let j = i + 1; j < O.length; j++) {
      if (Math.hypot(O[j][0] - a[0], O[j][1] - a[1]) < 0.5) dup++;
    }
  }
  ok(tag + ' 无重复点', dup === 0, String(dup));
  ok(tag + ' 无 <6 单位的碎边', shortE === 0, String(shortE));
  ok(tag + ' 无台阶点（近共线拐点）', step === 0, String(step));

  /* 自交 */
  function segCross(a, b, c, d) {
    const f = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
    const d1 = f(c, d, a), d2 = f(c, d, b), d3 = f(a, b, c), d4 = f(a, b, d);
    return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
  }
  let cross = 0;
  for (let i = 0; i < O.length; i++) {
    for (let j = i + 2; j < O.length; j++) {
      if (i === 0 && j === O.length - 1) continue;
      if (segCross(O[i], O[(i + 1) % O.length], O[j], O[(j + 1) % O.length])) cross++;
    }
  }
  ok(tag + ' 轮廓不自交', cross === 0, String(cross));

  /* 面积 */
  const sumA = polys.reduce((a, p) => a + G.area(p), 0);
  const outA = G.area(O) - (lv.holes || []).reduce((a, h) => a + G.area(h), 0);
  ok(tag + ' 轮廓面积 ≈ 板面积之和', Math.abs(outA - sumA) / sumA < 0.2,
    ((outA - sumA) / sumA * 100).toFixed(1) + '%');

  /* 位置：在棋盘竖条内（允许 0..1000 归一化坐标系） */
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  O.forEach(v => { x0 = Math.min(x0, v[0]); y0 = Math.min(y0, v[1]); x1 = Math.max(x1, v[0]); y1 = Math.max(y1, v[1]); });
  ok(tag + ' 落在 0..1000 内', x0 >= 0 && y0 >= 0 && x1 <= 1000 && y1 <= 1000,
    [x0, y0, x1, y1].map(v => v.toFixed(0)).join(','));
  ok(tag + ' 尺寸合理', (x1 - x0) >= 380 && (y1 - y0) >= 380, (x1 - x0).toFixed(0) + '×' + (y1 - y0).toFixed(0));

  /* 共用边（提示档位 2） */
  const sl = lv.splitLines || [];
  ok(tag + ' splitLines 合法', sl.every(s => Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1]) >= 8),
    String(sl.length) + ' 条');
  ok(tag + ' hintTier/parTime 就位', lv.hintTier === 1 && lv.parTime > 0 && lv.parSteps > 0);
}

/* ---------- 3. 老关卡未被破坏 ---------- */
let oldOk = true;
for (let k = 0; k < 57; k++) {
  const lv = L[k];
  if (lv.solution.length !== 7) oldOk = false;
  if (lv.outline.length < 3) oldOk = false;
}
ok('原 57 关结构未改动', oldOk);

console.log('');
if (fail) {
  console.log('未通过：');
  bad.forEach(b => console.log('  ✗ ' + b));
}
console.log((fail ? 'FAIL' : 'PASS') + '  ' + pass + ' 项通过 / ' + fail + ' 项未通过');
process.exit(fail ? 1 : 0);
