/* 生肖关卡几何最终化
 * ---------------------------------------------------------------
 * 输入 tools/zodiac/zodiac_fit.json（已去旋转的近似位置）
 * 目标：7 块板严格共边、零重叠、剪影＝其并集
 *
 * 步骤：
 *   1) 全局最小二乘：把「顶点重合」「顶点落在邻板边上」作为线性约束解 14 个平移量
 *      （IRLS 降权，抗离群约束）
 *   2) 局部松弛：坐标下降，消掉残留压叠、把该贴的边贴紧
 *   3) 多策略择优：{仅最小二乘 / 最小二乘+松弛 / 仅松弛} 各跑一遍，取最好的一组
 *   4) 轮廓外扩 1.2 世界单位：保证 pieceInside 不会因为并集的亚单位抖动而误判
 *
 * 输出 tools/zodiac/zodiac_exact.json（世界坐标，u=96，图形中心 500,500）
 */
const fs = require('fs');
const path = require('path');
const L = require('./lib.js');
const G = L.G;
const UN = require('./union.js');

const U = L.U;
const RAW = JSON.parse(fs.readFileSync(path.join(__dirname, 'zodiac_fit.json'), 'utf8'));

function solveLS(A, b) {
  const n = b.length;
  const M = A.map((row, i) => row.concat([b[i]]));
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) continue;
    [M[c], M[p]] = [M[p], M[c]];
    const d = M[c][c];
    for (let k = c; k <= n; k++) M[c][k] /= d;
    for (let r = 0; r < n; r++) {
      if (r === c || Math.abs(M[r][c]) < 1e-15) continue;
      const f = M[r][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map(r => r[n]);
}

function segD(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
  let t = L2 > 0 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + dx * t), p[1] - (a[1] + dy * t));
}
function polyDist(A, B) {
  let m = Infinity;
  for (let i = 0; i < A.length; i++) for (let j = 0; j < B.length; j++) {
    m = Math.min(m, segD(A[i], B[j], B[(j + 1) % B.length]));
    m = Math.min(m, segD(B[j], A[i], A[(i + 1) % A.length]));
  }
  return m;
}

/* ---------- 最小二乘 ---------- */
function lsSolve(ps, t0) {
  const n = ps.length;
  let t = t0.map(q => q.slice());
  let prevRes = [];
  for (let it = 0; it < 6; it++) {
    const rows = [], rhs = [], wts = [];
    const addRow = (c, v, w) => { rows.push(c); rhs.push(v); wts.push(w); };
    const TOL = [2.0, 1.2, 0.7, 0.45, 0.3, 0.3][it];
    const wAnchor = it === 0 ? 0.03 : 0.004;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        for (let k = 0; k < ps[i].P.length; k++) {
          const vx = t[i][0] + ps[i].P[k][0], vy = t[i][1] + ps[i].P[k][1];
          for (let l = 0; l < ps[j].P.length; l++) {
            if (Math.hypot(vx - (t[j][0] + ps[j].P[l][0]), vy - (t[j][1] + ps[j].P[l][1])) > TOL) continue;
            const c1 = new Array(2 * n).fill(0);
            c1[2 * i] = 1; c1[2 * j] = -1;
            addRow(c1, ps[j].P[l][0] - ps[i].P[k][0], 1.2);
            const c2 = new Array(2 * n).fill(0);
            c2[2 * i + 1] = 1; c2[2 * j + 1] = -1;
            addRow(c2, ps[j].P[l][1] - ps[i].P[k][1], 1.2);
          }
          for (const E of ps[j].edges) {
            const ax = t[j][0] + E.A[0], ay = t[j][1] + E.A[1];
            const d = (vx - ax) * E.nx + (vy - ay) * E.ny;
            if (Math.abs(d) > TOL) continue;
            const pr = (vx - ax) * E.ux + (vy - ay) * E.uy;
            if (pr < -1.5 || pr > E.len + 1.5) continue;
            const c = new Array(2 * n).fill(0);
            c[2 * i] = E.nx; c[2 * i + 1] = E.ny;
            c[2 * j] = -E.nx; c[2 * j + 1] = -E.ny;
            addRow(c, -(E.nx * (ps[i].P[k][0] - E.A[0]) + E.ny * (ps[i].P[k][1] - E.A[1])), 0.65);
          }
        }
      }
    }
    for (let i = 0; i < n; i++) {
      const c = new Array(2 * n).fill(0); c[2 * i] = 1; addRow(c, t0[i][0], wAnchor);
      const c2 = new Array(2 * n).fill(0); c2[2 * i + 1] = 1; addRow(c2, t0[i][1], wAnchor);
    }
    if (prevRes.length === rows.length) {
      for (let k = 0; k < wts.length; k++) {
        const r = prevRes[k];
        wts[k] *= 1 / (1 + (r / 0.15) * (r / 0.15));
      }
    }
    const NN = 2 * n;
    const A = Array.from({ length: NN }, () => new Array(NN).fill(0));
    const bv = new Array(NN).fill(0);
    for (let r = 0; r < rows.length; r++) {
      const w = wts[r], row = rows[r];
      for (let a = 0; a < NN; a++) {
        if (!row[a]) continue;
        bv[a] += w * row[a] * rhs[r];
        for (let c = 0; c < NN; c++) if (row[c]) A[a][c] += w * row[a] * row[c];
      }
    }
    const sol = solveLS(A, bv);
    prevRes = rows.map((row, k) => Math.abs(row.reduce((s, v, j) => s + v * sol[j], 0) - rhs[k]));
    t = [];
    for (let i = 0; i < n; i++) t.push([sol[2 * i], sol[2 * i + 1]]);
  }
  return t;
}

/* ---------- 局部松弛 ---------- */
function relax(ps, u, t, ref, steps) {
  const mk = () => ps.map((p, i) => L.LOCAL[p.id].map(v => { const r = L.rot(v, p.ang, p.f); return [r[0] * u + t[i][0], r[1] * u + t[i][1]]; }));
  let P = mk();
  const energy = () => {
    let e = 0;
    for (let i = 0; i < P.length; i++) {
      for (let j = i + 1; j < P.length; j++) {
        const ov = G.convexOverlapArea(P[i], P[j]);
        if (ov > 1e-9) e += ov * 400;
        const dd = polyDist(P[i], P[j]);
        if (dd < 4) e += dd * dd * 2.5;
      }
      e += 0.004 * ((t[i][0] - ref[i][0]) ** 2 + (t[i][1] - ref[i][1]) ** 2);
    }
    return e;
  };
  let E = energy();
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7071, 0.7071], [-0.7071, 0.7071], [0.7071, -0.7071], [-0.7071, -0.7071]];
  for (const step of steps) {
    for (let round = 0; round < 30; round++) {
      let moved = false;
      for (let k = 0; k < ps.length; k++) {
        let bestE = E, bx = 0, by = 0;
        for (const [dx, dy] of dirs) {
          t[k][0] += dx * step; t[k][1] += dy * step;
          P = mk();
          const e = energy();
          if (e < bestE - 1e-9) { bestE = e; bx = dx * step; by = dy * step; }
          t[k][0] -= dx * step; t[k][1] -= dy * step;
        }
        P = mk();
        if (bx || by) { t[k][0] += bx; t[k][1] += by; P = mk(); E = bestE; moved = true; }
      }
      if (!moved) break;
    }
  }
  return t;
}

/* ---------- 把离群板件贴回去 ---------- */
function closestPair(A, B) {
  let best = null;
  for (let i = 0; i < A.length; i++) for (let j = 0; j < B.length; j++) {
    const a = A[i], b0 = B[j], b1 = B[(j + 1) % B.length];
    const dx = b1[0] - b0[0], dy = b1[1] - b0[1], L2 = dx * dx + dy * dy;
    let tt = L2 > 0 ? ((a[0] - b0[0]) * dx + (a[1] - b0[1]) * dy) / L2 : 0;
    tt = Math.max(0, Math.min(1, tt));
    const q = [b0[0] + dx * tt, b0[1] + dy * tt];
    const d = Math.hypot(a[0] - q[0], a[1] - q[1]);
    if (!best || d < best.d) best = { d, pa: a, pb: q };
  }
  return best;
}
function connect(ps, u, t) {
  const polys = () => ps.map((p, i) => p.P.map(v => [v[0] + t[i][0], v[1] + t[i][1]]));
  const order = ps.map((p, i) => i).sort((a, b) => Math.abs(L.polyArea(ps[b].P)) - Math.abs(L.polyArea(ps[a].P)));
  const joined = [order[0]];
  for (let k = 1; k < order.length; k++) {
    const i = order[k];
    for (let pass = 0; pass < 8; pass++) {
      const P = polys();
      let best = null;
      for (const j of joined) {
        const c = closestPair(P[i], P[j]);
        if (!best || c.d < best.d) best = c;
      }
      if (!best || best.d < 0.08) break;
      t[i][0] += best.pb[0] - best.pa[0];
      t[i][1] += best.pb[1] - best.pa[1];
    }
    joined.push(i);
  }
  return t;
}

/* ---------- 轮廓外扩 ---------- */
/* 每条边的外法向用「哪一侧在板件之外」实测决定 —— 不依赖环的绕向，
 * 因为顶点相碰处的轮廓环可能自交，用 signed area 判绕向会翻车。 */
function offsetLoop(loop, d) {
  const n = loop.length;
  if (!n) return loop;
  const normals = [];
  for (let i = 0; i < n; i++) {
    const a = loop[i], b = loop[(i + 1) % n];
    const dx = b[0] - a[0], dy = b[1] - a[1], Lh = Math.hypot(dx, dy) || 1;
    let nx = dy / Lh, ny = -dx / Lh;
    /* 用「这一点是否在原多边形内部」决定朝外 */
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    if (G.pointInPoly([mx + nx * 2, my + ny * 2], loop) && !G.pointInPoly([mx - nx * 2, my - ny * 2], loop)) {
      nx = -nx; ny = -ny;                          // 反了
    }
    normals.push([nx, ny]);
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    const b = loop[i];
    const n1 = normals[(i - 1 + n) % n], n2 = normals[i];
    const a = loop[(i - 1 + n) % n], c = loop[(i + 1) % n];
    const d1 = [b[0] - a[0], b[1] - a[1]], d2 = [c[0] - b[0], c[1] - b[1]];
    const p1 = [a[0] + n1[0] * d, a[1] + n1[1] * d];
    const p2 = [b[0] + n2[0] * d, b[1] + n2[1] * d];
    const den = d1[0] * d2[1] - d1[1] * d2[0];
    if (Math.abs(den) < 1e-9) { out.push(p2); continue; }
    const tt = ((p2[0] - p1[0]) * d2[1] - (p2[1] - p1[1]) * d2[0]) / den;
    out.push([p1[0] + d1[0] * tt, p1[1] + d1[1] * tt]);
  }
  return out;
}

/* ---------- 单图尝试 ---------- */
function attempt(fig, mode) {
  const n = fig.pieces.length;
  const cx = fig.pieces.reduce((s, p) => s + p.cx, 0) / n;
  const cy = fig.pieces.reduce((s, p) => s + p.cy, 0) / n;
  const u = fig.u;
  const ps = fig.pieces.map(p => {
    const P = L.LOCAL[p.id].map(v => { const r = L.rot(v, p.ang, p.f); return [r[0] * u, r[1] * u]; });
    return { id: p.id, ang: p.ang, f: p.f, P, t: [p.cx - cx, p.cy - cy] };
  });
  ps.forEach(p => {
    p.edges = p.P.map((a, k) => {
      const b = p.P[(k + 1) % p.P.length];
      const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
      return { A: a, B: b, len, nx: -dy / len, ny: dx / len, ux: dx / len, uy: dy / len };
    });
  });
  const t0 = ps.map(p => p.t.slice());
  let t;
  if (mode === 'ls') {
    t = lsSolve(ps, t0);
  } else if (mode === 'lsrelax') {
    t = lsSolve(ps, t0);
    t = relax(ps, u, t, t0, [0.6, 0.3, 0.15, 0.07, 0.035, 0.017]);
  } else if (mode === 'connect') {
    t = connect(ps, u, t0.map(q => q.slice()));
    t = relax(ps, u, t, t0, [0.5, 0.25, 0.12, 0.06, 0.03, 0.015]);
  } else if (mode === 'lscrel') {
    /* LS 之后总会有个别板件被「挤」离群，先强制贴回主群，再局部松弛 */
    t = lsSolve(ps, t0);
    t = connect(ps, u, t);
    t = relax(ps, u, t, t0, [0.4, 0.2, 0.1, 0.05, 0.025, 0.012]);
  } else if (mode === 'crelrel') {
    t = connect(ps, u, t0.map(q => q.slice()));
    t = relax(ps, u, t, t0, [0.6, 0.3, 0.15, 0.07, 0.035, 0.017]);
    t = connect(ps, u, t);
    t = relax(ps, u, t, t0, [0.3, 0.15, 0.07, 0.035, 0.017]);
  } else {
    t = relax(ps, u, t0.map(q => q.slice()), t0, [1.0, 0.5, 0.25, 0.12, 0.06, 0.03]);
  }

  const polysPx = ps.map((p, i) => p.P.map(v => [v[0] + t[i][0], v[1] + t[i][1]]));
  let maxOv = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) maxOv = Math.max(maxOv, G.convexOverlapArea(polysPx[i], polysPx[j]));

  const sc = U / u;
  const wp = polysPx.map(pp => pp.map(v => [v[0] * sc, v[1] * sc]));
  /* 输出统一到世界坐标（图形中心 500,500） */
  const sh = arr => arr.map(v => [v[0] + 500, v[1] + 500]);
  const wpW = wp.map(sh);

  /* 覆盖率：用栅格并集面积判定。解析并集（unionPolys）在「单点相碰」处会给出
   * 自交环，shoelace 面积会把重叠部分相减 → 面积虚低，因此只能拿来做孔洞判断。 */
  const sumA = wp.reduce((a, p) => a + Math.abs(L.polyArea(p)), 0);
  const uA = UN.rasterArea(wpW, 0.5);
  const err = Math.max(0, (sumA - uA) / sumA);

  /* 剪影：栅格化并集 → 边界串环 → DP 简化。
   * 解析并集在「顶点相碰」处会产生零宽尖刺 → 轮廓自交 → pointInPoly/segCross 失真，
   * 所以改用栅格轮廓。膨胀 1 格是必需的：膨胀 0 格时「顶点相碰」的接触点在 4 邻域上
   * 不连通，环会断成几段（实测 12/12 全断）。res 0.25 + 膨胀 1 格 + DP 0.3 是实测最优：
   * 12/12 严格包含，面积外扩 −0.03%~0.73%（≈0.2 世界单位的一圈，肉眼不可见）。 */
  const outer0 = UN.rasterOutline(wpW, 0.25, 1, 0.3);
  if (!outer0 || outer0.length < 3) return { err: 1, maxOv: 1, t, inside: false, cx, cy, u };
  const loops = UN.unionPolys(wp, 0.6);
  let holes = loops.length > 1 ? UN.splitLoops(loops, wp).holes.map(sh) : [];

  /* 摆到棋盘正中：反解出来的图形只有「相对位置」是对的，绝对位置随质心走，
   * 有的会长出棋盘（蛇/龙/猪）。这里按剪影 bbox 平移到中心，并保证四边留白 ≥ M。
   * 只平移不缩放 —— 七块板的尺寸是全关卡共用一套托盘，缩放就对不上了。 */
  const bboxOf = arr => {
    let a = 1e9, b = 1e9, c = -1e9, d = -1e9;
    for (const v of arr) { if (v[0] < a) a = v[0]; if (v[0] > c) c = v[0]; if (v[1] < b) b = v[1]; if (v[1] > d) d = v[1]; }
    return [a, b, c, d];
  };
  const M = 40;
  const ob = bboxOf(outer0);
  /* 边距自适应：参考图里的龙/蛇本来就是「一张长条」，993 宽的图形放不进 40 边距，
   * 这时按剩余空间均分（最紧的龙左右各 3.5 单位），但绝不越出棋盘。 */
  const span = Math.max(ob[2] - ob[0], ob[3] - ob[1]);
  const mg = span <= 940 ? M : Math.max(2, (1000 - span) / 2);
  let tx = 500 - (ob[0] + ob[2]) / 2, ty = 500 - (ob[1] + ob[3]) / 2;
  if (ob[0] + tx < mg) tx = mg - ob[0];
  if (ob[2] + tx > 1000 - mg) tx = 1000 - mg - ob[2];
  if (ob[1] + ty < mg) ty = mg - ob[1];
  if (ob[3] + ty > 1000 - mg) ty = 1000 - mg - ob[3];
  const mv = arr => arr.map(v => [v[0] + tx, v[1] + ty]);
  const outer = mv(outer0);
  holes = holes.map(mv);
  const wpS = wpW.map(mv);

  if (process.env.DBGNAME && process.env.DBGNAME === fig.name) {
    console.log('  [DBG] 栅格剪影 ' + outer.length + ' 点:');
    console.log('   ' + outer.map(v => v.map(n => +n.toFixed(1)).join(',')).join('  '));
  }
  const inside = wpS.every(pp => G.pieceInside(pp, outer, holes, 3.0));
  return { err, maxOv: maxOv / (u * u), t, inside, cx, cy, u, outer, holes, nloops: loops.length, tx, ty, w: ob[2] - ob[0], h: ob[3] - ob[1] };
}

const out = [];
let bad = 0;
RAW.forEach(fig => {
  let best = null;
  for (const mode of ['ls', 'lsrelax', 'lscrel', 'connect', 'crelrel', 'relax']) {
    const r = attempt(fig, mode);
    const score = r.err * 10 + (r.inside ? 0 : 1) + r.maxOv * 5;
    if (process.env.DBGALL && process.env.DBGALL === fig.name)
      console.log('   [' + mode.padEnd(8) + '] err=' + (r.err * 100).toFixed(2) + '% ov=' + r.maxOv.toFixed(4) +
        ' inside=' + r.inside + ' loops=' + (r.nloops == null ? '?' : r.nloops) + ' score=' + score.toFixed(3));
    if (!best || score < best.score) best = { ...r, mode, score };
  }
  const sc = U / best.u;
  const tx = best.tx || 0, ty = best.ty || 0;
  const pieces = best.t.map((tt, i) => ({
    id: fig.pieces[i].id, ang: fig.pieces[i].ang, f: fig.pieces[i].f,
    x: +(tt[0] * sc + 500 + tx).toFixed(2), y: +(tt[1] * sc + 500 + ty).toFixed(2)
  }));
  const ok = best.inside && best.err < 0.01 && best.maxOv < 0.02;
  if (!ok) bad++;
  console.log((ok ? 'OK ' : 'XX ') + fig.name.padEnd(2) + ' [' + best.mode + '] 面积差' + (best.err * 100).toFixed(2) +
    '% 压叠' + best.maxOv.toFixed(4) + 'u² 轮廓' + best.outer.length + '点/孔' + best.holes.length +
    ' 尺寸' + (best.w || 0).toFixed(0) + '×' + (best.h || 0).toFixed(0) + ' 平移' + tx.toFixed(0) + ',' + ty.toFixed(0) +
    (best.inside ? '' : '  越界'));
  out.push({
    name: fig.name, uPx: fig.u, cxPx: best.cx, cyPx: best.cy, shift: [+tx.toFixed(2), +ty.toFixed(2)],
    pieces,
    outline: best.outer.map(v => [+v[0].toFixed(2), +v[1].toFixed(2)]),
    holes: best.holes.map(h => h.map(v => [+v[0].toFixed(2), +v[1].toFixed(2)]))
  });
});

fs.writeFileSync(path.join(__dirname, 'zodiac_exact.json'), JSON.stringify(out, null, 1));
console.log('\n完成 ' + out.length + '/12，异常 ' + bad);
