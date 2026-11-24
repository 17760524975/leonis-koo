/* v0.44 专项验收：26 个字母的七巧板关卡
 * 用法：node tools/verify_v044.js
 *
 * 用户这一版的需求原文：
 *   「这个就是使用七巧板能够拼接出来的 26 个字母的图案，不是插画，你不用校验是否能拼的出来，
 *     肯定能拼出来，你直接按照每个拼图的轮廓做成关卡就行。」
 *
 * 做法（数据侧口径）：
 *   · 每块板的板型与朝向从参考图的色块实测（面积定档 2/2/1/1/1/0.5/0.5 a²，朝向往 45° 倍数上靠）
 *   · 按实测质心摆放后做松弛把板间白缝收掉（近的拉近、重叠的推开）
 *   · outline 取 7 块板的并集 → 关卡必然可解（能铺满 outline 的解就是这 7 块板）
 *
 * 断言口径：
 *   A. 36 关 = 几何 10 + 字母 26；字母关 id 连续 11..36，name 依次 A..Z；
 *   B. 每关 7 块、id 齐 T1,T2,T3,S,T4,T5,P，angle 是 45° 整数倍；
 *   C. 每关 |outline 面积| − Σ|孔面积| = 147456（16u²·96²），误差 < 0.1%；
 *   D. outline 是简单多边形（≥4 顶点、顶点不重复、面积非零），且落在棋盘点阵内；
 *   E. 有字怀的字母才有孔（A/B/D/O/P/Q/R），B 两个孔；其余 0 孔；
 *   F. splitLines ≥ 3、hintTier=1，章节 4 页且章名与关数自洽；
 *   G. 三端一致 + 主包 < 4MB。
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
require(path.join(ROOT, 'js', 'levels.js'));
const G = require(path.join(ROOT, 'js', 'geom.js'));

const S7 = globalThis.TANGRAM_SETS.tangram7;
const ORDER = S7.dataset.pieceOrder;
const U = S7.dataset.unitScale;
const EXPECT_AREA = 16 * U * U;

let total = 0, fail = 0;
function check(label, ok, detail) {
  total++;
  if (!ok) fail++;
  console.log(`  [${ok ? 'OK' : 'XX'}] ${label}${detail ? '  ' + detail : ''}`);
}

console.log('==== A. 关卡构成 ====');
const geo = S7.levels.filter(l => l.chapter === 1);
const alp = S7.levels.filter(l => l.chapter === 2);
const LET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
check('总 36 关 = 几何 10 + 字母 26', S7.levels.length === 36 && geo.length === 10 && alp.length === 26,
  `总 ${S7.levels.length} / 几何 ${geo.length} / 字母 ${alp.length}`);
check('字母关 id 连续 11..36', alp.every((l, i) => l.id === 11 + i),
  alp.map(l => l.id).join(','));
check('字母关 name 依次 A..Z', alp.map(l => l.name).join('') === LET, alp.map(l => l.name).join(''));
check('关卡 id 全局 1..36 不重不漏',
  S7.levels.every((l, i) => l.id === i + 1), '');
check('章节 4 页、章名与关数自洽',
  S7.chapPer === 10 && S7.chapNames.length === 4 && S7.chapNames[1] === '字母·A–J' &&
  S7.chapNames[2] === '字母·K–T' && S7.chapNames[3] === '字母·U–Z',
  S7.chapNames.join(' / '));
check('结算文案报 36 关', /36/.test(S7.completeSub || ''), S7.completeSub);

console.log('\n==== B. 每关 7 块板 ====');
{
  let ok7 = true, okId = true, okAng = true, bad = [];
  for (const lv of alp) {
    if (lv.solution.length !== 7) { ok7 = false; bad.push(lv.name + ':块数' + lv.solution.length); }
    for (const id of ORDER) if (!lv.solution.some(s => s.id === id)) { okId = false; bad.push(lv.name + ':缺' + id); }
    for (const s of lv.solution) {
      if (!(s.angle % 45 === 0) || s.angle < 0 || s.angle >= 360) { okAng = false; bad.push(lv.name + ':角' + s.angle); }
    }
  }
  check('26 关都是 7 块板', ok7, bad.slice(0, 4).join(' '));
  check('T1,T2,T3,S,T4,T5,P 每关齐备', okId, '');
  check('angle 均为 0~359 的 45° 倍数', okAng, '');
}

console.log('\n==== C. 面积闭合（轮廓 = 7 块板总面积）====');
{
  let worst = 0, worstCh = '';
  for (const lv of S7.levels) {
    const holeA = (lv.holes || []).reduce((s, h) => s + Math.abs(G.area(h)), 0);
    const outA = Math.abs(G.area(lv.outline)) - holeA;
    const err = Math.abs(outA - EXPECT_AREA) / EXPECT_AREA * 100;
    if (err > worst) { worst = err; worstCh = lv.name; }
  }
  check('36 关轮廓净面积 = 147456（误差 < 0.1%）', worst < 0.1,
    `最大偏差 ${worst.toFixed(4)}%（${worstCh}）`);
}

console.log('\n==== D. 轮廓几何合法性 ====');
{
  let okLen = true, okDup = true, okBox = true, badLen = [], badBox = [];
  for (const lv of alp) {
    if (lv.outline.length < 4 || lv.outline.length > 60) { okLen = false; badLen.push(lv.name + ':' + lv.outline.length); }
    const seen = new Set();
    for (const v of lv.outline) {
      const k = v[0] + ',' + v[1];
      if (seen.has(k)) { okDup = false; }
      seen.add(k);
    }
    for (const v of lv.outline) {
      if (v[0] < 60 || v[0] > 940 || v[1] < 60 || v[1] > 900) { okBox = false; badBox.push(lv.name); break; }
    }
  }
  check('轮廓顶点数 4~60', okLen, badLen.slice(0, 5).join(' '));
  check('轮廓无重复顶点', okDup, '');
  check('轮廓落在棋盘内（60..940 / 60..900）', okBox, [...new Set(badBox)].join(','));
}

console.log('\n==== E. 字怀（内孔）分布 ====');
{
  const HOLEY = 'ABDOPQR';
  let ok = true, detail = [];
  for (const lv of alp) {
    const n = (lv.holes || []).length;
    const want = lv.name === 'B' ? 2 : (HOLEY.includes(lv.name) ? 1 : 0);
    if (n !== want) { ok = false; detail.push(lv.name + ':' + n + '≠' + want); }
  }
  check('只有 A/B/D/O/P/Q/R 带孔，B 两个', ok, detail.slice(0, 5).join(' '));
  const A = alp.find(l => l.name === 'A');
  check('A 的字怀是方孔（4 顶点内环）', A.holes && A.holes.length === 1 && A.holes[0].length === 4,
    A.holes ? JSON.stringify(A.holes[0].map(v => v.map(x => Math.round(x)))) : 'none');
}

console.log('\n==== F. 提示数据 ====');
{
  let okS = true, okT = true, minS = 1e9;
  for (const lv of alp) {
    if (!Array.isArray(lv.splitLines) || lv.splitLines.length < 3) okS = false;
    if (lv.hintTier !== 1) okT = false;
    minS = Math.min(minS, (lv.splitLines || []).length);
  }
  check('26 关 splitLines ≥ 3', okS, '最少 ' + minS + ' 条');
  check('26 关 hintTier = 1', okT, '');
  // 分割线中点必须落在轮廓内或贴着轮廓边
  let okIn = true;
  for (const lv of alp) {
    for (const s of lv.splitLines) {
      const m = [(s[0][0] + s[1][0]) / 2, (s[0][1] + s[1][1]) / 2];
      const inside = G.pointInPoly(m, lv.outline) ||
        Math.min(...lv.outline.map((v, i) => G.distPtSeg(m, v, lv.outline[(i + 1) % lv.outline.length]))) < 2;
      if (!inside) { okIn = false; }
    }
  }
  check('分割线中点全在轮廓内', okIn, '');
}

console.log('\n==== G. 三端一致 / 包体 ====');
{
  function h(p) { return crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex').slice(0, 8); }
  const a = h(path.join(ROOT, 'js', 'levels.js'));
  const b = h(path.join(ROOT, 'miniprogram', 'js', 'levels.js'));
  const c = h(path.join(ROOT, 'preview', 'js', 'levels.js'));
  check('levels.js 三端一致', a === b && b === c, a);
  function dirSize(d) {
    let t = 0;
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, f.name);
      t += f.isDirectory() ? dirSize(p) : fs.statSync(p).size;
    }
    return t;
  }
  const mb = dirSize(path.join(ROOT, 'miniprogram')) / 1048576;
  check('主包 < 4MB', mb < 4, mb.toFixed(2) + 'MB');
}

console.log(`\n${total - fail}/${total} 项通过${fail ? '，' + fail + ' 项失败' : ''}`);
process.exit(fail ? 1 : 0);
