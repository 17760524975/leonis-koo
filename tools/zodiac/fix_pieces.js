/* 手工修正 zodiac_exact.json 里个别板件的位置 */
const fs = require('fs');
const path = require('path');
const L = require('./lib.js');
const UN = require('./union.js');
require('../../js/geom.js');
const G = globalThis.TANGRAM_GEOM;

const U = 96;
const FILE = path.join(__dirname, 'zodiac_exact.json');
const EX = JSON.parse(fs.readFileSync(FILE, 'utf8'));

function polyOf(p) {
  return L.LOCAL[p.id].map(v => {
    const r = L.rot(v, p.ang, p.f);
    return [r[0] * U + p.x, r[1] * U + p.y];
  });
}
function bbox(polys) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  polys.forEach(P => P.forEach(v => {
    x0 = Math.min(x0, v[0]); x1 = Math.max(x1, v[0]);
    y0 = Math.min(y0, v[1]); y1 = Math.max(y1, v[1]);
  }));
  return [x0, y0, x1, y1];
}

/* ---------- 1. 龙的紫三角：贴到蓝色平行四边形的左侧 ---------- */
{
  const lv = EX.find(l => l.name === '龙');
  /* 先修一个历史遗留：平行四边形与橙色正方形在 x 上重叠了 6 个单位
   * （784u² ≈ 正方形面积的 4.25%）。旧版 convexOverlapArea 对翻面的板
   * 恒返回 0，所以一直没被发现；修好绕向后就露出来了。
   * 4.25% 已经超过 pieceFit 的 2% 重叠阈值 —— 玩家按标准解摆好也判不出
   * 「放好了」，这一关会变成死活过不去。把平行四边形（连同紫三角）左移 6。 */
  const pp = lv.pieces.find(p => p.id === 'P');
  pp.x = +(pp.x - 6).toFixed(2);
  console.log('  P 左移 6（消除与正方形的 4.25% 重叠）');

  const t5 = lv.pieces.find(p => p.id === 'T5');
  const P = polyOf(lv.pieces.find(p => p.id === 'P'));
  /* P 的左侧垂直边 = 顶点里 x 最小的那两个点 */
  const left = P.filter(v => Math.abs(v[0] - Math.min(...P.map(q => q[0]))) < 0.6)
    .sort((a, b) => a[1] - b[1]);
  const A = left[0], B = left[1];
  console.log('P 左边', A.map(n => n.toFixed(2)).join(','), '->', B.map(n => n.toFixed(2)).join(','),
    '长', Math.hypot(B[0] - A[0], B[1] - A[1]).toFixed(2));

  /* T5 的直角在 local(0,64)，两条腰分别指向上(B)和向左(C)。
   * ang=315 / f=true 时 local(0,64) -> (45.25,45.25)；
   * 让直角落在 B(左下)，腰向上贴 B->A。 */
  const ANG = 315, FLIP = true;
  const ca = Math.cos(ANG * Math.PI / 180), sa = Math.sin(ANG * Math.PI / 180);
  const rt = (v) => [v[0] * ca - v[1] * sa, v[0] * sa + v[1] * ca];
  /* L.LOCAL 是 u 单位（未乘 96），polyOf 才乘 U，所以这里也要乘 */
  const local = L.LOCAL['T5'].map(v => [v[0] * U, v[1] * U]);
  const rightAngle = local[2];                       // (0, 64)
  const r0 = rt([FLIP ? -rightAngle[0] : rightAngle[0], rightAngle[1]]);
  const origin = [B[0] - r0[0], B[1] - r0[1]];
  t5.ang = ANG; t5.f = FLIP;
  t5.x = +origin[0].toFixed(2);
  t5.y = +origin[1].toFixed(2);
  console.log('  T5 ->', JSON.stringify(t5));

  const chk = polyOf(t5).map(v => v.map(n => +n.toFixed(2)));
  console.log('  校验 T5 顶点', JSON.stringify(chk), '（应与 P 左下/左上重合）');
  const dA = Math.hypot(chk[2][0] - B[0], chk[2][1] - B[1]);
  const dB = Math.hypot(chk[0][0] - A[0], chk[0][1] - A[1]);
  console.log('  与 P 左下偏差', dA.toFixed(2), ' 与 P 左上偏差', dB.toFixed(2));
}

/* ---------- 2. 猴：中三角向右上挪 8.7/-8.6，合上中间那道缝 ---------- */
{
  const lv = EX.find(l => l.name === '猴');
  const t3 = lv.pieces.find(p => p.id === 'T3');
  /* 原顶点 (494.8,252.0) 在 S 的右下边上，而 T2 的左上顶点是 (503.5,243.4)；
   * 两者之间就是用户圈出的那条竖缝。把 T3 顶到 T2 的左上角即可。 */
  t3.x = +(t3.x + 8.7).toFixed(2);
  t3.y = +(t3.y - 8.6).toFixed(2);
  console.log('  猴 T3 ->', JSON.stringify(t3));
}

/* ---------- 2b. 龙：尾巴（绿中三角 + 粉小三角）沿红色大三角的右腰上移 ----------
 * 紫三角挪到平行四边形左侧后，整条龙变成 993 宽，超出卡纸（截图里左右两端被裁）。
 * 绿中三角原本贴在红大三角右腰的「下半段」，沿这条 45° 腰往上滑 52 单位，
 * 它的左腰就正好覆盖红三角右腰的「上半段」——仍是整条边贴合，只是整条龙收短 52。 */
{
  const lv = EX.find(l => l.name === '龙');
  const SL = 72;
  for (const id of ['T3', 'T4']) {
    const p = lv.pieces.find(q => q.id === id);
    p.x = +(p.x - SL).toFixed(2);
    p.y = +(p.y - SL).toFixed(2);
  }
  console.log('  龙 T3/T4 沿红三角右腰上移', SL, '单位');
}

/* ---------- 3. 逐图形重算 bbox、居中、重算剪影 ---------- */
const sleep = () => {};
EX.forEach(lv => {
  const polys = lv.pieces.map(polyOf);
  const bb = bbox(polys);
  const spanX = bb[2] - bb[0], spanY = bb[3] - bb[1];
  const span = Math.max(spanX, spanY);
  const M = span <= 940 ? 40 : Math.max(2, (1000 - span) / 2);
  let tx = 500 - (bb[0] + bb[2]) / 2;
  let ty = 500 - (bb[1] + bb[3]) / 2;
  if (bb[0] + tx < M) tx = M - bb[0];
  if (bb[2] + tx > 1000 - M) tx = 1000 - M - bb[2];
  if (bb[1] + ty < M) ty = M - bb[1];
  if (bb[3] + ty > 1000 - M) ty = 1000 - M - bb[3];

  lv.pieces = lv.pieces.map(p => ({ ...p, x: +(p.x + tx).toFixed(2), y: +(p.y + ty).toFixed(2) }));
  const wp = lv.pieces.map(polyOf);
  const ob = bbox(wp);

  const outer = UN.rasterOutline(wp, 0.25, 1, 0.3);
  lv.outline = outer.map(v => [+v[0].toFixed(2), +v[1].toFixed(2)]);
  lv.holes = [];

  const sumA = wp.reduce((a, P) => a + Math.abs(L.polyArea(P)), 0);
  const outA = Math.abs(L.polyArea(lv.outline));
  const inside = wp.every(P => G.pieceInside(P, lv.outline, lv.holes, 3.0));
  /* 板间最近距离（找缝） */
  function segD(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
    let t = L2 > 0 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2 : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t);
  }
  function pd(A, B) {
    let m = 1e9;
    for (const p of A) for (let i = 0; i < B.length; i++) m = Math.min(m, segD(p, B[i], B[(i + 1) % B.length]));
    for (const p of B) for (let i = 0; i < A.length; i++) m = Math.min(m, segD(p, A[i], A[(i + 1) % A.length]));
    return m;
  }
  let worstGap = 0, worstPair = '';
  for (let i = 0; i < wp.length; i++) for (let j = i + 1; j < wp.length; j++) {
    const d = pd(wp[i], wp[j]);
    if (d > worstGap) { /* 只统计真正相邻的（<40），远处的对不算缝 */
      if (d < 40) { worstGap = d; worstPair = lv.pieces[i].id + '-' + lv.pieces[j].id; }
    }
  }
  console.log(
    (inside ? 'OK ' : 'XX ') + lv.name.padEnd(2),
    'bbox', ob.map(n => n.toFixed(0)).join(','), '宽' + (ob[2] - ob[0]).toFixed(0) + ' 高' + (ob[3] - ob[1]).toFixed(0),
    '| 剪影', lv.outline.length + '点', '面积外扩', ((outA - sumA) / sumA * 100).toFixed(2) + '%',
    '| 最大相邻缝', worstGap.toFixed(2), worstPair, '| inside', inside
  );
});

fs.writeFileSync(FILE, JSON.stringify(EX, null, 1));
console.log('\n已写回', FILE);
