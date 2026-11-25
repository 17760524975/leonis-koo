/* 把像素级拟合结果「精确化」成关卡坐标
 * ---------------------------------------------------------------
 * 拟合出来的是 ±1px 的近似位置，直接写进关卡会出现几世界单位的压叠/缝。
 * 这里用「顶点与顶点重合」枚举把每块板的平移吸附到精确关系上：
 *   · 每块板角度/翻转已确定，只有平移未知
 *   · 候选平移 = 本块某顶点 ↔ 已放板某顶点
 *   · 校验：不与已放板重叠、与测得的近似位置偏差小（顶点最大偏差 < 4px）
 *
 * 输出 tools/zodiac/zodiac_exact.json（世界坐标，u=96，图形中心在 500,500）
 *       tools/zodiac/zodiac_check.html（参考图 + 重建多边形，目视校验）
 */
const fs = require('fs');
const path = require('path');
const L = require('./lib.js');
const G = L.G;
const RL = require('../repair_letters.js');

const U = L.U;                     // 96
const RAW = JSON.parse(fs.readFileSync(path.join(__dirname, 'zodiac_fit.json'), 'utf8'));

function polyOf(p, u, ox, oy) {    // 拟合坐标（px）→ 多边形
  return L.LOCAL[p.id].map(v => {
    const r = L.rot(v, p.ang, p.f);
    return [r[0] * u + p.cx - ox, r[1] * u + p.cy - oy];
  });
}
function polyAt(id, ang, f, t, u) {
  return L.LOCAL[id].map(v => {
    const r = L.rot(v, ang, f);
    return [r[0] * u + t[0], r[1] * u + t[1]];
  });
}
const maxDev = (A, B) => {
  let m = 0;
  for (const a of A) for (const b of B) m = Math.max(m, 0);
  for (let i = 0; i < A.length; i++) {
    let d = Infinity;
    for (let j = 0; j < B.length; j++) d = Math.min(d, Math.hypot(A[i][0] - B[j][0], A[i][1] - B[j][1]));
    m = Math.max(m, d);
  }
  return m;
};

const out = [];
let bad = 0;

RAW.forEach(fig => {
  const name = fig.name;
  /* 以图形包围盒中心为原点 */
  const cx = fig.pieces.reduce((s, p) => s + p.cx, 0) / 7;
  const cy = fig.pieces.reduce((s, p) => s + p.cy, 0) / 7;
  const items = fig.pieces.map(p => ({
    id: p.id, ang: p.ang, f: p.f,
    mt: [p.cx - cx, p.cy - cy],                       // 测得的平移（px）
    mpts: polyOf(p, fig.u, cx, cy)                     // 测得多边形（px）
  }));
  /* 面积大的先放，定位最稳 */
  const WU = { T1: 4, T2: 4, T3: 2, S: 2, P: 2, T4: 1, T5: 1 };
  const order = items.slice().sort((a, b) => WU[b.id] - WU[a.id]);

  const done = [];
  const anchored = { ...order[0], t: order[0].mt.slice(), pts: polyAt(order[0].id, order[0].ang, order[0].f, order[0].mt, fig.u) };
  done.push(anchored);

  for (let k = 1; k < order.length; k++) {
    const it = order[k];
    const base = L.LOCAL[it.id].map(v => L.rot(v, it.ang, it.f));
    let best = null;
    for (const ref of done) {
      for (const rv of ref.pts) {
        for (let vi = 0; vi < base.length; vi++) {
          const t = [rv[0] - base[vi][0] * fig.u, rv[1] - base[vi][1] * fig.u];
          const pts = base.map(v => [v[0] * fig.u + t[0], v[1] * fig.u + t[1]]);
          let ov = 0;
          for (const q of done) { ov = G.convexOverlapArea(pts, q.pts); if (ov > 2) break; }
          if (ov > 2) continue;
          const dev = maxDev(pts, it.mpts);
          if (dev > 4) continue;
          const d = Math.hypot(t[0] - it.mt[0], t[1] - it.mt[1]);
          if (!best || d < best.d) best = { d, t, pts, dev };
        }
      }
    }
    if (!best) { console.log('  ! ' + name + ' ' + it.id + ' 找不到精确吸附'); bad++; continue; }
    done.push({ id: it.id, ang: it.ang, f: it.f, t: best.t, pts: best.pts });
  }

  /* 校验 */
  let maxOv = 0;
  for (let i = 0; i < done.length; i++) for (let j = i + 1; j < done.length; j++)
    maxOv = Math.max(maxOv, G.convexOverlapArea(done[i].pts, done[j].pts));
  const sumA = done.reduce((s, p) => s + WU[p.id], 0);
  /* 转到世界坐标（u=96，中心 500,500） */
  const sc = U / fig.u;
  const pieces = done.map(p => ({
    id: p.id, ang: p.ang, f: p.f,
    x: p.t[0] * sc + 500, y: p.t[1] * sc + 500, pts: p.pts
  }));
  const polys = pieces.map(p => p.pts.map(v => [v[0] * sc + 500, v[1] * sc + 500]));
  const loops = RL.unionLoops(polys);
  const info = loops && loops.length ? RL.splitLoops(loops, polys) : null;
  const inside = info ? polys.every(pp => G.pieceInside(pp, info.outer, info.holes, 3.0)) : false;
  const areaErr = info ? Math.abs(info.err) : NaN;

  console.log('OK ' + name.padEnd(2) + ' 面积' + sumA + 'u² (应16) 压叠' + (maxOv / (fig.u * fig.u)).toFixed(4) + 'u²' +
    ' 轮廓' + (info ? info.outer.length + '点/孔' + info.holes.length : '失败') +
    ' 面积差' + (isNaN(areaErr) ? '-' : (areaErr * 100).toFixed(2) + '%') +
    (inside ? '' : '  <== 有板越界'));
  if (!inside || !isFinite(areaErr) || Math.abs(areaErr) > 0.02) bad++;

  out.push({
    name, pieces: pieces.map(p => ({ id: p.id, ang: p.ang, f: p.f, x: +p.x.toFixed(2), y: +p.y.toFixed(2) })),
    outline: info ? info.outer.map(v => [+v[0].toFixed(2), +v[1].toFixed(2)]) : null,
    holes: info ? info.holes.map(h => h.map(v => [+v[0].toFixed(2), +v[1].toFixed(2)])) : []
  });
});

fs.writeFileSync(path.join(__dirname, 'zodiac_exact.json'), JSON.stringify(out, null, 1));
console.log('\n完成 ' + out.length + '/12，异常 ' + bad);
