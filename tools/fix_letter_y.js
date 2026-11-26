/* v0.63 修复：字母 Y 竖干下半截向右错位 12.7 单位（用户圈出的红框）
 * ---------------------------------------------------------------
 * 现象：竖干右边缘在 y=614 处突然向内缩 12.7，形成一道台阶 + 一个小勾
 *       （对局页与关卡缩略图都能看到，缩略图上就是红框里那条竖线）。
 *
 * 根因：竖干是「平行四边形 P（上半）+ 中三角 T3 / 大三角 T2（下半）」拼的。
 *   P 的右竖边在 x=567.92（与右侧大三角 T1 的左腰完全共线，这是对的）；
 *   T2/T3 的右竖边却在 x=555.16 —— 下半截整体缩进 12.76。
 *   T2 的尖角 (555.16,601.29) 恰好落在 P 的右下边上，只差 12.76/12.75 没顶到角。
 *
 * 修法：把 T2 / T3 沿 45° 方向平移 (+12.76, +12.75)，让 T2 的尖角正好顶到
 *       P 的右下角 (567.92,614.04)。平移沿 45° 进行，所以：
 *         · T2 的斜边与 P 的右下边依然共线（不产生楔形缝）
 *         · T2 的左上顶点依然落在 T4 的斜边上（左臂下沿不断开）
 *         · 竖干右边缘 = x567.92 一条直线（478.28 → 806.04）
 *         · 竖干左边缘 = x375.92 一条直线（422.04 → 806.04）
 *       代价：竖干整体右移/下移 12.7，X 方向由 363 变 375.9、底部由 793.3 变 806.0，
 *       宽度不变（192 = 4u）。
 *
 * 幂等：已经顶到角上就直接跳过。剪影按新的精确并集重写（去掉 0.5 的小勾）。
 * 用法：node tools/fix_letter_y.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const FILE = path.join(ROOT, 'tools/glyph/letters_exact.json');
const ZL = require('./zodiac/lib.js');
const U = 96;

const EX = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const y = EX.find(f => f.name === 'Y');
if (!y) throw new Error('letters_exact.json 里找不到 Y');

const LOCAL = {};
Object.keys(ZL.LOCAL).forEach(id => { LOCAL[id] = ZL.LOCAL[id].map(v => [v[0] * U, v[1] * U]); });
const piece = id => y.pieces.find(p => p.id === id);
function polyOf(p) {
  return LOCAL[p.id].map(v => {
    const r = ZL.rot(v, p.ang, p.f);
    return [r[0] + p.x, r[1] + p.y];
  });
}
const r3 = n => Math.round(n * 1000) / 1000;

const t2 = piece('T2'), t3 = piece('T3'), P = piece('P');
const p2 = polyOf(t2), p3 = polyOf(t3), pP = polyOf(P);
/* P 的右下角 = x 最大的那个顶点（P 的右竖边两端 x 相同） */
const pRight = pP.reduce((a, b) => (b[0] > a[0] || (b[0] === a[0] && b[1] > a[1]) ? b : a));
/* T2 的尖角 = x 最大的那个顶点 */
const t2Tip = p2.reduce((a, b) => (b[0] > a[0] ? b : a));
const dx = r3(pRight[0] - t2Tip[0]);
const dy = r3(pRight[1] - t2Tip[1]);
console.log('P 右下角', pRight.map(r3).join(','), ' T2 尖角', t2Tip.map(r3).join(','), ' 需平移', dx, dy);

if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05) {
  console.log('已经对齐，跳过');
  process.exit(0);
}

t2.x = +(t2.x + dx).toFixed(2); t2.y = +(t2.y + dy).toFixed(2);
t3.x = +(t3.x + dx).toFixed(2); t3.y = +(t3.y + dy).toFixed(2);

const n2 = polyOf(t2), n3 = polyOf(t3);
const stemR = Math.max(...n2.map(v => v[0]), ...n3.map(v => v[0]));
const stemL = Math.min(...n2.map(v => v[0]), ...n3.map(v => v[0]));
const stemB = Math.max(...n2.map(v => v[1]), ...n3.map(v => v[1]));
console.log('新竖干 左', r3(stemL), '右', r3(stemR), '底', r3(stemB), '宽', r3(stemR - stemL));

/* ---------- 剪影：只改「竖干」这一段，其余点一个字节都不动 ----------
 * 0..8 保持原样（含 V 谷底那 0.5 的小折，肉眼不可见，不动它以免碰到别的关）；
 * 9..15 原本是「右边缘→台阶→底边→左边缘」，换成三条干净直线。 */
const OUT = [
  [160.5, 206.63], [432.25, 206.63], [432.25, 342.38],
  [567.25, 477.38], [567.75, 477.25], [567.75, 206.63],
  [839.5, 206.63], [839.5, 207], [568, 478.38],
  /* ↓ 竖干：右边缘一条竖线到底 */
  [568, r3(stemB + 0.1)],
  /* ↓ 底边 */
  [r3(stemL - 0.1), r3(stemB + 0.1)],
  /* ↓ 左边缘向上，到 T4 的斜边（y = x + 46.13）为止 */
  [r3(stemL - 0.1), r3(stemL - 0.1 + 46.13)],
  /* ↓ 沿 T4 斜边上到左臂左上角 */
  [160.5, 207]
];

/* ---------- 自检：7 块都在剪影内、剪影是简单多边形、面积差极小 ---------- */
function segInt(a, b, c, d) {
  const s = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  const o = (p, q, r) => s(p, q, r) * s(p, q, r);
  return s(a, b, c) !== s(a, b, d) && s(c, d, a) !== s(c, d, b);
}
let cross = 0;
for (let i = 0; i < OUT.length; i++) {
  for (let j = i + 2; j < OUT.length; j++) {
    if (i === 0 && j === OUT.length - 1) continue;
    if (segInt(OUT[i], OUT[(i + 1) % OUT.length], OUT[j], OUT[(j + 1) % OUT.length])) cross++;
  }
}
function areaOf(pl) {
  let a = 0;
  for (let i = 0; i < pl.length; i++) {
    const p = pl[i], q = pl[(i + 1) % pl.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return Math.abs(a) / 2;
}
/* 点在多边形内（射线法） */
function inside(pt, pl) {
  let c = false;
  for (let i = 0, j = pl.length - 1; i < pl.length; j = i++) {
    const a = pl[i], b = pl[j];
    if ((a[1] > pt[1]) !== (b[1] > pt[1]) &&
        pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}
/* 顶点到剪影边界的最小距离（负＝在外） */
function distEdge(pt, pl) {
  let m = 1e9;
  for (let i = 0; i < pl.length; i++) {
    const a = pl[i], b = pl[(i + 1) % pl.length];
    const dx2 = b[0] - a[0], dy2 = b[1] - a[1];
    const L2 = dx2 * dx2 + dy2 * dy2;
    let t = L2 > 0 ? ((pt[0] - a[0]) * dx2 + (pt[1] - a[1]) * dy2) / L2 : 0;
    t = Math.max(0, Math.min(1, t));
    m = Math.min(m, Math.hypot(pt[0] - a[0] - dx2 * t, pt[1] - a[1] - dy2 * t));
  }
  return m;
}
let worst = 0, worstId = '';
for (const p of y.pieces) {
  for (const v of polyOf(p)) {
    if (!inside(v, OUT)) { const d = distEdge(v, OUT); if (d > 0.2) { worst = Math.max(worst, d); worstId = p.id; } }
  }
}
const sumA = y.pieces.reduce((a, p) => a + areaOf(polyOf(p)), 0);
const outA = areaOf(OUT);
const oldA = areaOf(y.outline);
/* 剪影比板件并集大一点是刻意的（描边外扩 0.1~0.3，v0.54 起就如此）：
 * 26 关的「面积外扩」历史区间是 0.15%~0.31%，这里只要不比旧值更松就算过。 */
const band = (outA - sumA) / sumA * 100;
const oldBand = (oldA - sumA) / sumA * 100;
console.log('自检：自交', cross, ' 越界顶点', worstId || '无', worst.toFixed(3),
  ' 面积外扩 新', band.toFixed(3) + '%', '旧', oldBand.toFixed(3) + '%');
if (cross || worst > 0.05 || band < 0 || band > 0.35 || band > oldBand + 0.01) {
  console.log('自检没过，不写文件');
  process.exit(1);
}

y.outline = OUT;
fs.writeFileSync(FILE, JSON.stringify(EX, null, 1));
console.log('已写回', FILE);
console.log('剪影', JSON.stringify(OUT));
