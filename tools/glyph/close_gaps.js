/* 把「板与板之间 10~20 单位、两端敞开的通道」合上
 * ---------------------------------------------------------------
 * 拟合出来的摆位有残余误差，个别板之间会留下一条又长又窄的缝（C 的 T1/T3 差 11.2、
 * S 的 T1/T5 差 12.1）。这种缝两端敞开，闭运算填不了、背景重建也填不了
 * （它们是同一个连通分量），剪影顺着它描进去就成了一条「线」。
 *
 * 做法：对每一对间隙在 (0.3, 3.5) 单位（u）内的板，把**较小的一块**沿最短连线
 *       平移 90% 的间隙。移动后如果压到了别的板，就撤销这一次移动。
 * 只动 1u 以内，造型看不出变化，但缝会真正消失 —— 后面描边自然就没有通道了。
 *
 * 输入/输出：tools/glyph/letters_fit.json（直接改 cx/cy）
 */
const fs = require('fs');
const path = require('path');
const L = require('../zodiac/lib.js');

const FILE = path.join(__dirname, 'letters_fit.json');
const FIG = JSON.parse(fs.readFileSync(FILE, 'utf8'));

function segD(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
  let t = L2 > 0 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t);
}
function closest(A, B) {
  let best = null;
  for (let i = 0; i < A.length; i++) for (let j = 0; j < B.length; j++) {
    const a = A[i], b0 = B[j], b1 = B[(j + 1) % B.length];
    const dx = b1[0] - b0[0], dy = b1[1] - b0[1], L2 = dx * dx + dy * dy;
    let t = L2 > 0 ? ((a[0] - b0[0]) * dx + (a[1] - b0[1]) * dy) / L2 : 0;
    t = Math.max(0, Math.min(1, t));
    const q = [b0[0] + dx * t, b0[1] + dy * t];
    const d = Math.hypot(a[0] - q[0], a[1] - q[1]);
    if (!best || d < best.d) best = { d, pa: a, pb: q };
  }
  return best;
}
/* 真·凸多边形交集面积（包围盒太糙，U 关就是被它放过了一次 0.14u² 的压叠） */
const overlapArea = (A, B) => L.G.convexOverlapArea(A, B);

const MIN = 0.3, MAX = 3.0, KEEP = 0.9;
/* 每块板的总位移上限（px）：0.25u ≈ 24 世界单位。
 * 不加这个上限时，「多轮 + 双向」会把同一块板一路推着跑，造型就变样了。 */
const CAP = 0.25 * 16;

FIG.forEach(fig => {
  const u = fig.u;
  const poly = () => fig.pieces.map(p => L.LOCAL[p.id].map(v => {
    const r = L.rot(v, p.ang, p.f);
    return [r[0] * u + p.cx, r[1] * u + p.cy];
  }));
  const movedBy = fig.pieces.map(() => 0);
  let moved = 0;
  for (let i = 0; i < fig.pieces.length; i++) {
    for (let j = i + 1; j < fig.pieces.length; j++) {
      const P = poly();
      const c = closest(P[i], P[j]);
      if (!c || c.d < MIN || c.d > MAX) continue;
      /* 只动较小的一块（面积小的），而且两边都得还有位移额度 */
      const areaI = Math.abs(L.polyArea(P[i])), areaJ = Math.abs(L.polyArea(P[j]));
      const k = areaI <= areaJ ? i : j;
      const other = k === i ? j : i;
      if (movedBy[k] >= CAP) continue;
      const dx = (c.pb[0] - c.pa[0]) * KEEP * (k === i ? 1 : -1);
      const dy = (c.pb[1] - c.pa[1]) * KEEP * (k === i ? 1 : -1);
      const len = Math.hypot(dx, dy);
      if (!len) continue;
      const scale = Math.min(1, (CAP - movedBy[k]) / len);
      const oldX = fig.pieces[k].cx, oldY = fig.pieces[k].cy;
      fig.pieces[k].cx += dx * scale;
      fig.pieces[k].cy += dy * scale;
      /* 校验：不能因此压到任何别的板（真交集面积，>1 单位² 就算压叠） */
      const Q = poly();
      let bad = false;
      for (let m = 0; m < Q.length; m++) {
        if (m === k) continue;
        if (L.G.convexOverlapArea(Q[k], Q[m]) > 1) { bad = true; break; }
      }
      if (bad) { fig.pieces[k].cx = oldX; fig.pieces[k].cy = oldY; }
      else { movedBy[k] += len * scale; moved++; }
    }
  }
  if (moved) console.log(fig.name.padEnd(2), '合缝', moved, '次');
});

fs.writeFileSync(FILE, JSON.stringify(FIG, null, 1));
console.log('\n已写回 letters_fit.json');
