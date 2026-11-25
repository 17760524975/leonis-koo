/* v0.50 · 字母关（tangram7 第 11–36 关）几何修复
 *
 * 问题（用户截图）：字母图案的 7 块板之间有白色细缝，个别板还错位突出到字母外，
 * 导致「拼到 98~99% 就上不去」以及缩略图看起来像坏掉的字。
 *
 * 根因：这 26 关的 solution 是从参考图量出来的（tools/letters7/build_letters.py），
 * 角度已经精确到 45° 倍数，但 x/y 是浮点拟合值 —— 每块离真正的「格点」差 0~24 个世界单位。
 * 板边一旦差几个单位，两条本该重合的边就变成了「平行但错开」的缝。
 *
 * 做法（不猜形状，只把已有摆位「缝合」到严格贴合）：
 *   1) 把相距 < 36 的顶点聚成「接头」，一个接头上的所有板顶点必须落到同一点；
 *   2) 以「每块板平移量最小」为目标解最小二乘（加正则项把整体钉在原位，字母不会变形）；
 *   3) 用缝合后的 7 块板求并集（边打断 → 只出现一次的边 → 串成环），
 *      外环当轮廓、内环当内孔 —— 轮廓与板件从此严丝合缝；
 *   4) 逐关验证：每块板都判「完整落在轮廓内」、并集面积 == 7 块面积之和。
 *
 * 用法：node tools/repair_letters.js          # 只报告
 *      node tools/repair_letters.js --write   # 写回 js/levels.js
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
require(path.join(ROOT, 'js/levels.js'));
const G = require(path.join(ROOT, 'js/geom.js'));
const J = require(path.join(ROOT, 'js/judge.js'));

const DATA = globalThis.TANGRAM_DATA;
const SET = DATA.sets.tangram7;
const DS = SET.dataset;
const U = DS.unitScale;
const LOCAL = {};
for (const id in DS.pieces) {
  LOCAL[id] = G.makeLocal(DS.pieces[id].base).map(v => [v[0] * U, v[1] * U]);
}
const ORDER = SET.levels[0].solution.map(s => s.id);

const ONLY = (process.argv.find(a => /^--only=/.test(a)) || '').replace('--only=', '');
const WRITE = process.argv.indexOf('--write') >= 0;

/* ---------- 小工具 ---------- */
const r2 = v => Math.round(v * 100) / 100;
const r4 = v => Math.round(v * 1e4) / 1e4;
/* v0.50：轮廓/标准解统一写 3 位小数。
 * 写 2 位时 300 单位长的边会被「掰」出 0.2 单位的斜率误差，
 * 于是轮廓边和板边不再严格共线，core 的 pieceInside 会把这条边判成「穿越」，
 * 玩家拼对了也过不了关（G/O/S 三关实测卡在这）。 */
const r3 = v => Math.round(v * 1000) / 1000;
function polyOf(st) { return G.toWorld(LOCAL[st.id], st); }
function area2(poly) { return G.area(poly); }

/* 高斯消元解 A x = b（A 为 n×n，就地消元） */
function solve(A, b) {
  const n = b.length;
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let k = i + 1; k < n; k++) if (Math.abs(A[k][i]) > Math.abs(A[p][i])) p = k;
    if (Math.abs(A[p][i]) < 1e-12) continue;
    if (p !== i) { const t = A[p]; A[p] = A[i]; A[i] = t; const t2 = b[p]; b[p] = b[i]; b[i] = t2; }
    for (let k = i + 1; k < n; k++) {
      const f = A[k][i] / A[i][i];
      if (!f) continue;
      for (let c = i; c < n; c++) A[k][c] -= f * A[i][c];
      b[k] -= f * b[i];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = b[i];
    for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c];
    x[i] = Math.abs(A[i][i]) < 1e-12 ? 0 : s / A[i][i];
  }
  return x;
}

/* ---------- 1. 缝合：顶点聚类 + 最小二乘平移 ---------- */
/* 缝合：把 7 块板当成一张「弹簧网」，只做平移，把每对相邻板的缝压到 0。
 *  - 边接触：两条近乎平行、彼此有重叠、法向距离 < 60 的边 → 沿法线互相靠近；
 *  - 顶点接触：每个顶点找另一块板上最近的顶点，< 45 就互相吸引（防止板沿边滑开）。
 * 两类力都按 0.5 分摊到两块板上，迭代到收敛。
 * 相比一次性最小二乘，这个做法不会为了满足某个接头把某块板整体拽走（N 关就踩过这个坑）。 */
function stitch(sol) {
  var n = sol.length;
  var pos = sol.map(function (s) { return [s.x, s.y]; });
  function polysAt() {
    return sol.map(function (s, i) {
      return G.toWorld(LOCAL[s.id], { x: pos[i][0], y: pos[i][1], angle: s.angle, flipped: s.flipped });
    });
  }
  function edges(p) {
    var out = [];
    for (var i = 0; i < p.length; i++) {
      var a = p[i], b = p[(i + 1) % p.length];
      var dx = b[0] - a[0], dy = b[1] - a[1];
      var L = Math.hypot(dx, dy);
      if (L < 1e-6) continue;
      out.push({ a: a, b: b, ux: dx / L, uy: dy / L, L: L });
    }
    return out;
  }
  var iters = 3000;
  for (var it = 0; it < iters; it++) {
    var polys = polysAt();
    var ex = polys.map(edges);
    var fx = new Array(n).fill(0), fy = new Array(n).fill(0), cnt = new Array(n).fill(0);
    for (var i = 0; i < n; i++) {
      for (var j = i + 1; j < n; j++) {
        var Ei = ex[i], Ej = ex[j];
        /* ---- 边接触 ---- */
        for (var p1 = 0; p1 < Ei.length; p1++) {
          var e1 = Ei[p1];
          var best = null;
          for (var p2 = 0; p2 < Ej.length; p2++) {
            var e2 = Ej[p2];
            var cr = e1.ux * e2.uy - e1.uy * e2.ux;
            if (Math.abs(cr) > 0.02) continue;                 // 不平行
            var nx = -e1.uy, ny = e1.ux;
            var mx = (e1.a[0] + e1.b[0]) / 2, my = (e1.a[1] + e1.b[1]) / 2;
            var gap = (mx - e2.a[0]) * nx + (my - e2.a[1]) * ny;
            if (Math.abs(gap) > 60) continue;
            /* 两条边沿 e1 方向的重叠长度 */
            var t0 = (e2.a[0] - e1.a[0]) * e1.ux + (e2.a[1] - e1.a[1]) * e1.uy;
            var t1 = (e2.b[0] - e1.a[0]) * e1.ux + (e2.b[1] - e1.a[1]) * e1.uy;
            var lo = Math.min(t0, t1), hi = Math.max(t0, t1);
            var ov = Math.min(hi, e1.L) - Math.max(lo, 0);
            if (ov < 10) continue;
            if (!best || Math.abs(gap) < Math.abs(best.gap)) best = { gap: gap, nx: nx, ny: ny };
          }
          if (best) {
            var g = best.gap * 0.5;
            fx[i] -= best.nx * g; fy[i] -= best.ny * g; cnt[i]++;
            fx[j] += best.nx * g; fy[j] += best.ny * g; cnt[j]++;
          }
        }
        /* ---- 顶点接触（只取每对里最近的一对，避免过度约束） ---- */
        /* 顶点吸引只在「两个顶点几乎已经重合」时生效（< 9）。
         * 阈值放大到半个板宽会出事：T 形接头处没有对应顶点，
         * 硬拉会把本来已经贴好的板拽歪（A/N/I 就因此从 0 误差被拉出 4000 的误差）。 */
        var vi = polys[i], vj = polys[j];
        for (var q1 = 0; q1 < vi.length; q1++) {
          var bd = 9, bx = 0, by = 0;
          for (var q2 = 0; q2 < vj.length; q2++) {
            var d = Math.hypot(vj[q2][0] - vi[q1][0], vj[q2][1] - vi[q1][1]);
            if (d < bd) { bd = d; bx = vj[q2][0] - vi[q1][0]; by = vj[q2][1] - vi[q1][1]; }
          }
          if (bd < 9) {
            fx[i] += bx * 0.30; fy[i] += by * 0.30; cnt[i]++;
            fx[j] -= bx * 0.30; fy[j] -= by * 0.30; cnt[j]++;
          }
        }
      }
    }
    var moved = 0;
    for (var k = 0; k < n; k++) {
      if (!cnt[k]) continue;
      var sx = fx[k] / cnt[k], sy = fy[k] / cnt[k];
      pos[k][0] += sx; pos[k][1] += sy;
      moved += Math.abs(sx) + Math.abs(sy);
    }
    if (it > 40 && moved < 1e-4) break;
  }
  var relaxed = sol.map(function (s, i) {
    return { id: s.id, angle: s.angle, flipped: s.flipped, x: pos[i][0], y: pos[i][1] };
  });
  return lsqSnap(relaxed, 5);
}

/* 精修：把「几乎重合」的顶点簇当作硬约束，解最小二乘平移，
 * 让共享顶点严格落到同一点（这一步之后并集才算得准）。
 * 注意必须在松弛之后用 —— 直接对原始数据做，接头聚类会连错，把板拽开。 */
function lsqSnap(sol, JOIN) {
  var n = sol.length;
  var polys = sol.map(polyOf);
  var verts = [];
  for (var i = 0; i < n; i++) for (var k = 0; k < polys[i].length; k++) verts.push({ i: i, k: k, p: polys[i][k] });
  var parent = verts.map(function (_, i) { return i; });
  function find(i) { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; }
  for (var a = 0; a < verts.length; a++) {
    for (var b = a + 1; b < verts.length; b++) {
      if (verts[a].i === verts[b].i) continue;
      if (Math.hypot(verts[a].p[0] - verts[b].p[0], verts[a].p[1] - verts[b].p[1]) < JOIN) {
        var ra = find(a), rb = find(b);
        if (ra !== rb) parent[ra] = rb;
      }
    }
  }
  var groups = {};
  for (var q = 0; q < verts.length; q++) { var r = find(q); (groups[r] = groups[r] || []).push(verts[q]); }
  var joints = [];
  for (var key in groups) {
    var g = groups[key], set = {};
    for (var t = 0; t < g.length; t++) set[g[t].i] = 1;
    if (Object.keys(set).length < 2) continue;
    joints.push(g);
  }
  var nT = n * 2, N = nT + joints.length * 2;
  if (!N) return sol;
  var A = [], bb = [];
  function row() { var r = new Array(N).fill(0); A.push(r); bb.push(0); return r; }
  var LAM = 0.02;
  for (var i2 = 0; i2 < n; i2++) {
    var r1 = row(); r1[i2 * 2] = LAM;
    var r2v = row(); r2v[i2 * 2 + 1] = LAM;
  }
  for (var j = 0; j < joints.length; j++) {
    for (var m = 0; m < joints[j].length; m++) {
      var v = joints[j][m];
      var rx = row(); rx[v.i * 2] = 1; rx[nT + j * 2] = -1; bb[bb.length - 1] = -v.p[0];
      var ry = row(); ry[v.i * 2 + 1] = 1; ry[nT + j * 2 + 1] = -1; bb[bb.length - 1] = -v.p[1];
    }
  }
  var M = [], rhs = new Array(N).fill(0);
  for (var i3 = 0; i3 < N; i3++) M.push(new Array(N).fill(0));
  for (var r3 = 0; r3 < A.length; r3++) {
    var ar = A[r3];
    for (var c1 = 0; c1 < N; c1++) {
      if (!ar[c1]) continue;
      rhs[c1] += ar[c1] * bb[r3];
      for (var c2 = 0; c2 < N; c2++) if (ar[c2]) M[c1][c2] += ar[c1] * ar[c2];
    }
  }
  var x = solve(M, rhs);
  return sol.map(function (s, i) {
    return { id: s.id, angle: s.angle, flipped: s.flipped, x: s.x + x[i * 2], y: s.y + x[i * 2 + 1] };
  });
}

/* 收敛质量：所有边接触里最大的法向缝隙 */
function maxGap(sol) {
  var polys = sol.map(polyOf), worst = 0;
  for (var i = 0; i < polys.length; i++) {
    for (var j = i + 1; j < polys.length; j++) {
      var A = polys[i], B = polys[j];
      for (var p1 = 0; p1 < A.length; p1++) {
        var a = A[p1], b = A[(p1 + 1) % A.length];
        var dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
        if (L < 1e-6) continue;
        var ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
        for (var p2 = 0; p2 < B.length; p2++) {
          var c = B[p2], d = B[(p2 + 1) % B.length];
          var ex = d[0] - c[0], ey = d[1] - c[1], L2 = Math.hypot(ex, ey);
          if (L2 < 1e-6) continue;
          if (Math.abs(ux * ey / L2 - uy * ex / L2) > 0.02) continue;
          var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
          var gap = Math.abs((mx - c[0]) * nx + (my - c[1]) * ny);
          var t0 = (c[0] - a[0]) * ux + (c[1] - a[1]) * uy;
          var t1 = (d[0] - a[0]) * ux + (d[1] - a[1]) * uy;
          var ov = Math.min(Math.max(t0, t1), L) - Math.max(Math.min(t0, t1), 0);
          if (ov > 10 && gap > worst) worst = gap;
        }
      }
    }
  }
  return worst;
}

/* 把每块板沿质心方向外扩 d 个单位（图形不变，只放大一点点）。
 * 目的：把「两块板只在一个顶点相碰」的捏点变成微小重叠 ——
 * 捏点会让并集边界在那一处有 4 条边，串环时容易跳线（G/H/K 就栽在这）。
 * 外扩 1 单位 = 0.5 设计像素，肉眼看不到，但轮廓会稳定地在板件外侧 1 单位处闭合。 */
function inflate(polys, d) {
  return polys.map(p => {
    const c = G.centroid(p);
    let R = 0;
    for (const v of p) R = Math.max(R, Math.hypot(v[0] - c[0], v[1] - c[1]));
    const k = 1 + d / (R || 1);
    return p.map(v => [c[0] + (v[0] - c[0]) * k, c[1] + (v[1] - c[1]) * k]);
  });
}

/* ---------- 2. 并集：边打断 → 只出现一次的边 → 串环 ---------- */
function onSeg(p, a, b, eps) {
  const cr = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (Math.abs(cr) / (l || 1) > (eps || 1e-4)) return false;
  const dot = (p[0] - a[0]) * (p[0] - b[0]) + (p[1] - a[1]) * (p[1] - b[1]);
  return dot <= 1e-6;
}
function keyOf(p) { return r4(p[0]) + ',' + r4(p[1]); }
function inUnion(pt, polys) {
  for (const p of polys) if (G.pointInPoly(pt, p)) return true;
  return false;
}
/* 求 7 块板的并集边界。
 * 不靠「端点精确相等」配对（缝合后仍有 1e-3 级残差），
 * 而是把每条边在中点两侧各取一个 ε 点，一侧在并集内、一侧在外 → 这条就是轮廓。
 * 这样 T 形接头、轻微重叠都不影响。 */
function unionLoops(polys) {
  const verts = [];
  for (const p of polys) for (const v of p) verts.push(v);
  const EPS = 0.9;
  const cand = [];
  for (const poly of polys) {
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const l2 = dx * dx + dy * dy;
      if (l2 < 1e-9) continue;
      const ts = [0, 1];
      for (const v of verts) {
        if (!onSeg(v, a, b, 1.2)) continue;
        const t = ((v[0] - a[0]) * dx + (v[1] - a[1]) * dy) / l2;
        if (t > 1e-6 && t < 1 - 1e-6) ts.push(t);
      }
      ts.sort((x, y) => x - y);
      for (let k = 0; k + 1 < ts.length; k++) {
        if (ts[k + 1] - ts[k] < 1e-6) continue;
        const p0 = [a[0] + dx * ts[k], a[1] + dy * ts[k]];
        const p1 = [a[0] + dx * ts[k + 1], a[1] + dy * ts[k + 1]];
        const mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
        const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
        if (L < 0.3) continue;
        const nx = -(p1[1] - p0[1]) / L, ny = (p1[0] - p0[0]) / L;
        /* 采样距离要随段长收缩：短段（两块板只在一个顶点相碰处会出现 1~2 单位的段）
         * 用固定的 0.9 会跨过整段、采到相邻板里，导致边界段被判成「内部边」而丢失，
         * G/H/K 的串环就是这么断的。 */
        const e = Math.max(0.05, Math.min(EPS, L * 0.2));
        const inL = inUnion([mx + nx * e, my + ny * e], polys);
        const inR = inUnion([mx - nx * e, my - ny * e], polys);
        if (inL === inR) continue;                  // 内部共用边
        /* 统一成「并集在左侧」的方向，方便串环 */
        cand.push(inL ? [p0, p1] : [p1, p0]);
      }
    }
  }
  /* 串环：端点聚类 → 每个簇进出一次；在分叉处优先「顺着走」（转角最小） */
  const TOL = 2.2;
  const ends = [];
  for (const c of cand) { ends.push(c[0], c[1]); }
  const par = ends.map((_, i) => i);
  const find = i => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
  for (let a = 0; a < ends.length; a++) {
    for (let b = a + 1; b < ends.length; b++) {
      if (Math.hypot(ends[a][0] - ends[b][0], ends[a][1] - ends[b][1]) <= TOL) {
        const ra = find(a), rb = find(b);
        if (ra !== rb) par[ra] = rb;
      }
    }
  }
  const nodeOf = [];
  const nodePos = {};
  for (let i = 0; i < ends.length; i++) {
    const r = find(i);
    if (nodePos[r] === undefined) { nodePos[r] = ends[i]; nodeOf[i] = r; }
    else nodeOf[i] = r;
  }
  const edgeOf = {};                      // node -> [{e, other}]
  cand.forEach((c, e) => {
    const a = nodeOf[e * 2], b = nodeOf[e * 2 + 1];
    if (a === b) return;
    (edgeOf[a] = edgeOf[a] || []).push({ e, other: b });
    (edgeOf[b] = edgeOf[b] || []).push({ e, other: a });
  });
  const usedE = new Array(cand.length).fill(false);
  const loops = [];
  const dirAt = (e, from) => {              // 从 from 端出发的方向
    const c = cand[e];
    return nodeOf[e * 2] === from
      ? [c[1][0] - c[0][0], c[1][1] - c[0][1]]
      : [c[0][0] - c[1][0], c[0][1] - c[1][1]];
  };
  for (let s = 0; s < cand.length; s++) {
    if (usedE[s]) continue;
    const start = nodeOf[s * 2];
    let cur = start, e = s;
    const loop = [];
    let guard = 0;
    while (guard++ < cand.length + 2) {
      usedE[e] = true;
      const c = cand[e];
      const forward = nodeOf[e * 2] === cur;
      loop.push(forward ? c[0] : c[1]);
      const nxt = forward ? nodeOf[e * 2 + 1] : nodeOf[e * 2];
      if (nxt === start) break;
      const outs = (edgeOf[nxt] || []).filter(o => !usedE[o.e]);
      if (!outs.length) break;
      /* 分叉点（两块板只在一个顶点相碰）的走向：始终选「最靠右」的那条。
       * 边界段统一按「并集在左手边」定向，取最右转弯就能贴着同一个区域走完，
       * 不会从 Q 的内孔「跳」到外轮廓上（旧版按「顺直」选会跳）。 */
      const d0 = forward
        ? [c[1][0] - c[0][0], c[1][1] - c[0][1]]
        : [c[0][0] - c[1][0], c[0][1] - c[1][1]];
      let best = outs[0], bestT = Infinity;
      for (const o of outs) {
        const d1 = dirAt(o.e, nxt);
        const cr = d0[0] * d1[1] - d0[1] * d1[0];
        const dt = d0[0] * d1[0] + d0[1] * d1[1];
        const turn = Math.atan2(cr, dt);          // >0 左转，<0 右转
        if (turn < bestT) { bestT = turn; best = o; }
      }
      cur = nxt;
      e = best.e;
    }
    if (loop.length >= 3) loops.push(loop);
  }
  /* 去共线点 */
  const simp = loops.map(loop => {
    const out = [];
    for (let i = 0; i < loop.length; i++) {
      const a = loop[(i - 1 + loop.length) % loop.length];
      const b = loop[i], c = loop[(i + 1) % loop.length];
      const cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
      const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]), l2b = Math.hypot(c[0] - b[0], c[1] - b[1]);
      if (Math.abs(cr) / ((l1 * l2b) || 1) > 1e-4) out.push(b);
    }
    return out.length >= 3 ? out : loop;
  });
  simp.sort((a, b) => area2(b) - area2(a));
  return simp;
}

/* ---------- 2b. 兜底并集：栅格 marching squares ----------
 * 少数关卡的三块板会「只在一个顶点相碰」（分叉点），精确串环容易在那里跳线。
 * 这里退一步：在 2 单位栅格上判内外，再用 marching squares 取等值线 ——
 * 拓扑永远正确，精度 ±1 单位（0.5 设计像素，肉眼不可见），最后用 Douglas-Peucker 抽稀。 */
function rasterUnion(polys, STEP) {
  const all = [];
  for (const p of polys) for (const v of p) all.push(v);
  const box = G.bbox([all]);
  STEP = STEP || 2;
  const x0 = Math.floor((box[0] - 4) / STEP) * STEP;
  const y0 = Math.floor((box[1] - 4) / STEP) * STEP;
  const W = Math.ceil((box[2] + 4 - x0) / STEP) + 1;
  const H = Math.ceil((box[3] + 4 - y0) / STEP) + 1;
  const g = new Uint8Array(W * H);
  for (let j = 0; j < H; j++) {
    const y = y0 + (j + 0.5) * STEP;
    for (let i = 0; i < W; i++) {
      const x = x0 + (i + 0.5) * STEP;
      let inn = 0;
      for (const p of polys) if (G.pointInPoly([x, y], p)) { inn = 1; break; }
      g[j * W + i] = inn;
    }
  }
  const segs = [];
  const P = (i, j) => [x0 + (i + 0.5) * STEP, y0 + (j + 0.5) * STEP];
  for (let j = 0; j < H - 1; j++) {
    for (let i = 0; i < W - 1; i++) {
      /* 四角：a=左上 b=右上 c=右下 d=左下 */
      const a = g[j * W + i], b = g[j * W + i + 1];
      const c = g[(j + 1) * W + i + 1], d = g[(j + 1) * W + i];
      const idx = a | (b << 1) | (c << 2) | (d << 3);
      if (idx === 0 || idx === 15) continue;
      const A = P(i, j), B = P(i + 1, j), C = P(i + 1, j + 1), D = P(i, j + 1);
      const T = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];     // 上中
      const R = [(B[0] + C[0]) / 2, (B[1] + C[1]) / 2];     // 右中
      const Bo = [(C[0] + D[0]) / 2, (C[1] + D[1]) / 2];    // 下中
      const L = [(D[0] + A[0]) / 2, (D[1] + A[1]) / 2];     // 左中
      const push = (p, q) => segs.push([p, q]);
      switch (idx) {
        case 1: push(L, T); break;
        case 2: push(T, R); break;
        case 3: push(L, R); break;
        case 4: push(R, Bo); break;
        case 5: push(L, T); push(R, Bo); break;
        case 6: push(T, Bo); break;
        case 7: push(L, Bo); break;
        case 8: push(Bo, L); break;
        case 9: push(Bo, T); break;
        case 10: push(T, R); push(Bo, L); break;
        case 11: push(Bo, R); break;
        case 12: push(R, L); break;
        case 13: push(R, T); break;
        case 14: push(T, L); break;
        default: break;
      }
    }
  }
  /* 串环：栅格端点天然精确相等，直接按 key 连 */
  const key = q => q[0].toFixed(3) + ',' + q[1].toFixed(3);
  const adj = {};
  segs.forEach((sg, i) => {
    const k = key(sg[0]);
    (adj[k] = adj[k] || []).push(i);
  });
  const used = new Array(segs.length).fill(false);
  const loops = [];
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    const loop = [segs[i][0]];
    used[i] = true;
    let cur = segs[i][1];
    let guard = 0;
    while (guard++ < segs.length + 2) {
      loop.push(cur);
      const kb = key(cur);
      const cand = (adj[kb] || []).filter(t => !used[t]);
      if (!cand.length) break;
      used[cand[0]] = true;
      cur = segs[cand[0]][1];
      if (key(cur) === key(loop[0])) break;
    }
    if (loop.length >= 4) { loop.pop(); loops.push(loop); }
  }
  /* Douglas-Peucker 抽稀 */
  function dp(pts, tol) {
    if (pts.length < 4) return pts;
    const keep = new Array(pts.length).fill(false);
    keep[0] = keep[pts.length - 1] = true;
    const stack = [[0, pts.length - 1]];
    while (stack.length) {
      const [s0, e0] = stack.pop();
      let best = -1, bd = 0;
      for (let i = s0 + 1; i < e0; i++) {
        const d = G.distPtSeg(pts[i], pts[s0], pts[e0]);
        if (d > bd) { bd = d; best = i; }
      }
      if (best > 0 && bd > tol) { keep[best] = true; stack.push([s0, best], [best, e0]); }
    }
    return pts.filter((_, i) => keep[i]);
  }
  const out = loops.map(l => {
    /* 闭合环：从最远点切成两段再各自抽稀，避免首尾被当成直线 */
    let far = 1, fd = 0;
    for (let i = 1; i < l.length; i++) {
      const d = Math.hypot(l[i][0] - l[0][0], l[i][1] - l[0][1]);
      if (d > fd) { fd = d; far = i; }
    }
    const s1 = dp(l.slice(0, far + 1), 1.4);
    const s2 = dp(l.slice(far).concat([l[0]]), 1.4);
    const merged = s1.concat(s2.slice(1, -1));
    /* 去共线 */
    const clean = [];
    for (let i = 0; i < merged.length; i++) {
      const a = merged[(i - 1 + merged.length) % merged.length];
      const b = merged[i], c = merged[(i + 1) % merged.length];
      const cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
      const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]), l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
      if (Math.abs(cr) / ((l1 * l2) || 1) > 0.02) clean.push(b);
    }
    return clean.length >= 3 ? clean : merged;
  }).filter(l => l.length >= 3);
  out.sort((a, b) => area2(b) - area2(a));
  return out;
}

/* 把栅格轮廓「吸附」回真实板边：每个顶点投影到最近的板边上，
 * 相邻两点若落在同一条边 → 合并；落在共享端点的两条边 → 补回精确拐角。
 * 这样栅格兜底出来的轮廓也能和板件严格贴合（不然判定用轮廓会出现锯齿）。 */
function snapLoop(loop, polys, NEAR, NO_PROJECT) {
  NEAR = NEAR || 0.8;
  const proj = (v, a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const l2 = dx * dx + dy * dy;
    let t = l2 > 1e-12 ? ((v[0] - a[0]) * dx + (v[1] - a[1]) * dy) / l2 : 0;
    t = Math.max(0, Math.min(1, t));
    return [a[0] + dx * t, a[1] + dy * t];
  };
  if (NO_PROJECT) {
    const clean0 = [];
    for (const p0 of loop) {
      const prev = clean0[clean0.length - 1];
      if (prev && Math.hypot(prev[0] - p0[0], prev[1] - p0[1]) < NEAR) continue;
      clean0.push(p0);
    }
    if (clean0.length > 1) {
      const f = clean0[0], l = clean0[clean0.length - 1];
      if (Math.hypot(f[0] - l[0], f[1] - l[1]) < NEAR) clean0.pop();
    }
    return clean0;
  }
  const hits = loop.map(v => {
    let bd = Infinity, bq = v, bp = -1, be = -1;
    polys.forEach((poly, pi) => {
      for (let e = 0; e < poly.length; e++) {
        const a = poly[e], b = poly[(e + 1) % poly.length];
        const q = proj(v, a, b);
        const d = Math.hypot(q[0] - v[0], q[1] - v[1]);
        if (d < bd) { bd = d; bq = q; bp = pi; be = e; }
      }
    });
    return { p: bq, d: bd, piece: bp, edge: be };
  });
  const out = [];
  for (let i = 0; i < hits.length; i++) {
    const cur = hits[i], nxt = hits[(i + 1) % hits.length];
    out.push(cur.p);
    if (cur.piece < 0 || nxt.piece < 0) continue;
    if (cur.piece === nxt.piece) {
      /* 同一条边上的相邻两点：只在不共线时才需要拐角（斜接） */
      continue;
    }
    /* 不同板、但两条边共用同一个顶点 → 补回精确拐角 */
    const A = polys[cur.piece], B = polys[nxt.piece];
    const a1 = A[cur.edge], a2 = A[(cur.edge + 1) % A.length];
    const b1 = B[nxt.edge], b2 = B[(nxt.edge + 1) % B.length];
    const near = (u, w) => Math.hypot(u[0] - w[0], u[1] - w[1]) < 1.5;
    if (near(a1, b1) || near(a1, b2) || near(a2, b1) || near(a2, b2)) {
      /* 这两条边本来就贴着，中间不该有折点 */
      continue;
    }
  }
  /* 去重 + 去共线 */
  const clean = [];
  for (let i = 0; i < out.length; i++) {
    const p0 = out[i];
    const prev = clean[clean.length - 1];
    if (prev && Math.hypot(prev[0] - p0[0], prev[1] - p0[1]) < NEAR) continue;
    clean.push(p0);
  }
  if (clean.length > 1) {
    const f = clean[0], l = clean[clean.length - 1];
    if (Math.hypot(f[0] - l[0], f[1] - l[1]) < NEAR) clean.pop();
  }
  return clean;
}

/* 把环整体向外平移 d 个单位（斜接）。
 * 栅格兜底出来的轮廓与板件最多差 1 单位，往外让一点，
 * 保证「每块板都完整落在轮廓内」，又不至于让虚线离板太远。 */
function offsetLoop(loop, d) {
  const n = loop.length;
  const ccw = signedAreaOf(loop) > 0;
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = loop[(i - 1 + n) % n], b = loop[i], c = loop[(i + 1) % n];
    const e1 = [b[0] - a[0], b[1] - a[1]], e2 = [c[0] - b[0], c[1] - b[1]];
    const l1 = Math.hypot(e1[0], e1[1]) || 1, l2 = Math.hypot(e2[0], e2[1]) || 1;
    /* 逆时针环绕时「右手法线」朝外 */
    const sgn = ccw ? 1 : -1;
    const n1 = [sgn * e1[1] / l1, -sgn * e1[0] / l1];
    const n2 = [sgn * e2[1] / l2, -sgn * e2[0] / l2];
    let mx = n1[0] + n2[0], my = n1[1] + n2[1];
    const ml = Math.hypot(mx, my) || 1;
    mx /= ml; my /= ml;
    const cos = Math.max(0.4, Math.abs(mx * n1[0] + my * n1[1]));
    out.push([b[0] + mx * d / cos, b[1] + my * d / cos]);
  }
  return out;
}
function signedAreaOf(p) {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const q = p[(i + 1) % p.length];
    a += p[i][0] * q[1] - q[0] * p[i][1];
  }
  return a / 2;
}

/* ---------- 2.5 吸附回整数格（v0.50 的关键一步） ----------
 * 这些关卡本来是 grow() 在「整数格」上拼出来的：每块板的顶点落在 1u 整数格点上，
 * 相邻板的边完全重合、缝为 0。但写进 levels.js 时坐标被取整到 2 位小数，
 * 加上质心反解，装配被「抖」了不到 1 个单位 —— 于是出现 0.4%~0.5% 的缝，
 * 也就是用户截图里字母旁边的白线。
 *
 * 观察到的事实（tools/debug_lattice.js 验证）：同一块板的 7 个世界顶点，
 * 换回 base 坐标系后小数部分完全一致（偏差 0.0000）。说明只要给每块板补一个
 * 小于 1 单位的平移，就能让它的 base 顶点重新落回整数格 —— 装配精确复原。
 *   q = flipx(rot(P − t, −angle)) + centroid(base)
 * 取 δ = −frac(q) 后，Δ_world = rot(flipx(δ), angle)，把 t 平移 Δ 即可。 */
const CEN = {};
for (const id in DS.pieces) {
  const b = DS.pieces[id].base;
  let cx = 0, cy = 0;
  for (const v of b) { cx += v[0]; cy += v[1]; }
  CEN[id] = [cx / b.length, cy / b.length];
}
function rotV(v, deg) {
  const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  return [c * v[0] - s * v[1], s * v[0] + c * v[1]];
}
function baseResidual(st) {
  const poly = G.toWorld(LOCAL[st.id], st);
  const c = CEN[st.id];
  let sx = 0, sy = 0;
  for (const P of poly) {
    const back = rotV([P[0] - st.x, P[1] - st.y], -st.angle);
    const fx = st.flipped ? -back[0] : back[0];
    sx += fx + c[0];
    sy += back[1] + c[1];
  }
  const n = poly.length;
  const qx = sx / n, qy = sy / n;
  return [qx - Math.round(qx), qy - Math.round(qy)];   // 落在 [-0.5,0.5]
}
function latticeSnap(sol) {
  return sol.map(st => {
    const r = baseResidual(st);
    /* δ 是 base 坐标系里要补的量；换回世界坐标 */
    const dBase = [-r[0], -r[1]];
    const back = st.flipped ? [-dBase[0], dBase[1]] : dBase;
    const dW = rotV(back, st.angle);
    return { id: st.id, x: +(st.x + dW[0]).toFixed(4), y: +(st.y + dW[1]).toFixed(4),
      angle: st.angle, flipped: st.flipped };
  });
}

/* ---------- 3. 修一关 ---------- */
function splitLoops(loops, polys) {
  const outer = loops[0];
  const holes = loops.slice(1).filter(h => {
    let deep = 0;
    for (const v of h) if (G.pointInPoly(v, outer)) deep++;
    return deep >= h.length / 2;
  });
  const sumA = polys.reduce((a, p) => a + area2(p), 0);
  const outA = area2(outer) - holes.reduce((a, h) => a + area2(h), 0);
  return { outer, holes, sumA, outA, err: (sumA - outA) / sumA };
}
function repair(lv) {
  const sol0 = lv.solution.map(s => ({ id: s.id, x: s.x, y: s.y, angle: s.angle, flipped: s.flipped }));
  /* v0.50：先不缝合，直接用原解 —— grow() 装配时本来就拒绝重叠、靠边贴合，
   * 原解的面积和恒等于轮廓面积（实测 26 关 maxOverlap ≤ 2 世界单位²），
   * 玩家看到的「错位 / 白缝」其实来自旧轮廓多边形本身在抖（17~25 个多余顶点）。
   * 只有在原解真的拼不严（并集面积明显小于板件和）时才退回缝合。 */
  let sol = latticeSnap(sol0), stitched = false;
  let polys = sol.map(polyOf);
  let loops = unionLoops(polys);
  let info = loops.length ? splitLoops(loops, polys) : null;
  /* 0.002 这条线是「缝宽 ≈ 0.2 世界单位」的量级：
   * 再往下压就得缝合挪板，而挪过之后 G/H/K 这类「两块板只在一个顶点相碰」的
   * 装配反而串不出轮廓（退回栅格，误差更大）。权衡后按 0.002 收。 */
  if (!info || Math.abs(info.err) > 0.002) {
    sol = stitch(sol);
    stitched = true;
    polys = sol.map(polyOf);
    loops = unionLoops(polys);
    info = loops.length ? splitLoops(loops, polys) : null;
  }
  let mode = stitched ? 'exact+stitch' : 'exact';
  if (!info || Math.abs(info.err) > 0.002) {
    /* 精确串环没走通（两块板只在一个顶点相碰 → 边界在该点分叉，串环跳线）
     * → 栅格 marching squares 兜底。v0.50：轮廓不再外扩（旧版外扩 1.4 世界单位，
     * 会在剪影内侧留一圈白边，正是用户截图里那种「缝」）；栅格误差靠 STEP=0.5 压住。 */
    /* STEP 取 0.5：marching squares 的误差 ≈ STEP/2，2.0 时 45° 边上会差 1.4 单位，
     * 板件就会「探出」轮廓一点点；0.5 足够细，代价只有这几个字母几秒的计算量。 */
    /* 只做去重，不做「投影回板边」：投影在尖角处会认错最近的边，把拐角削掉，
     * 反而让那块板探出轮廓（G/H 就是栽在这）。STEP=0.5 的原始栅格误差 ≤0.35 世界单位。 */
    loops = rasterUnion(polys, 0.5).map(l => snapLoop(l, polys, 0.45, true));
    mode = stitched ? 'raster+stitch' : 'raster';
    info = loops.length ? splitLoops(loops, polys) : null;
  }
  if (!info) return { ok: false, why: '并集为空', sol };
  const { outer, holes, sumA, outA, err } = info;
  const areaErr = err;
  const tol = 3.0;   /* 与 core.js C.JUDGE.fitTol 一致：按「玩家能不能过关」判，而不是按像素完美 */
  const insides = polys.map(p => G.pieceInside(p, outer, holes, tol));
  return {
    ok: insides.every(Boolean) && Math.abs(err) < 0.01,
    why: insides.some(x => !x) ? '仍有板越界 ' + sol.map((s, i) => s.id + ':' + insides[i]).join(' ')
      : (Math.abs(err) >= 0.01 ? '面积误差超限 ' + (err * 100).toFixed(2) + '%' : ''),
    sol, outer, holes, areaErr, mode
  };
}

/* ---------- 4. 跑全部 ---------- */
/* v0.50：主流程只在直接运行时执行，便于 tools/relax_letters.js 复用上面的并集原语 */
function main() {
const letters = SET.levels.filter(l => l.chapter === 2);
const COLOR = { T1: '#FF8A5B', T2: '#4FA8E0', T3: '#63C88B', S: '#F47FA8', T4: '#A87BE8', T5: '#FFC94D', P: '#4FC9C0' };
function svgOf(name, polys, ids, outer, holes) {
  const bb = [];
  for (const p of polys) for (const v of p) bb.push(v);
  const box = G.bbox([bb]);
  const w = box[2] - box[0], h = box[3] - box[1];
  const s = 200 / Math.max(w, h);
  const path = p => p.map((v, i) => (i ? 'L' : 'M') + ((v[0] - box[0]) * s + 10).toFixed(1) + ',' +
    ((v[1] - box[1]) * s + 10).toFixed(1)).join('') + 'Z';
  let out = `<div class="c"><svg width="220" height="220" viewBox="0 0 220 220">`;
  polys.forEach((p, i) => {
    out += `<path d="${path(p)}" fill="${COLOR[ids[i]]}" fill-opacity="0.55" stroke="#fff" stroke-width="1"/>`;
  });
  if (outer) out += `<path d="${path(outer)}" fill="none" stroke="#e11" stroke-width="2"/>`;
  (holes || []).forEach(h => { out += `<path d="${path(h)}" fill="none" stroke="#e11" stroke-width="2"/>`; });
  out += `</svg><b>${name}</b></div>`;
  return out;
}

let okN = 0, bad = [], fixed = {}, sheet = [];
for (const lv of letters) {
  if (ONLY && lv.name !== ONLY) continue;
  const r = repair(lv);
  if (r.ok) { okN++; fixed[lv.id] = r; }
  else bad.push({ id: lv.id, name: lv.name, why: r.why, r });
  if (r.sol) {
    const polys = r.sol.map(polyOf);
    sheet.push(svgOf(lv.name, polys, r.sol.map(s => s.id), r.outer, r.holes));
  }
  console.log(`${r.ok ? 'OK ' : 'XX '} ${String(lv.id).padStart(2)} ${lv.name}  [${r.mode || '-'}] 面积误差 ${(r.areaErr * 100).toFixed(3)}%  ${r.why}`);
  if (r.outer) console.log(`     轮廓 ${r.outer.length} 点，孔 ${r.holes.length}`);
}
console.log(`\n缝合成功 ${okN}/${letters.length}，失败 ${bad.length}`);
if (process.argv.indexOf('--html') >= 0) {
  const html = '<html><meta charset="utf-8"><style>body{background:#f4efe6;font:12px sans-serif;display:flex;flex-wrap:wrap}' +
    '.c{width:220px;text-align:center;margin:2px}</style><body>' + sheet.join('') + '</body></html>';
  fs.writeFileSync(path.join(__dirname, 'out', 'letters_sheet.html'), html);
  console.log('联系表 → tools/out/letters_sheet.html');
}

/* ---------- 5. 写回 ---------- */
if (WRITE) {
  if (bad.length) { console.log('!! 有失败项，先不写回（避免把字母写坏）'); process.exit(1); }
  const file = path.join(ROOT, 'js', 'levels.js');
  let src = fs.readFileSync(file, 'utf8');
  const MARK = 'var LEVELS7 = ';
  const at = src.indexOf(MARK);
  const open = src.indexOf('[', at);
  let depth = 0, close = open;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) { close = i + 1; break; } }
  }
  const arr = JSON.parse(src.slice(open, close));
  let n = 0;
  for (const lv of arr) {
    const f = fixed[lv.id];
    if (!f) continue;
    if (lv.name !== (SET.levels.find(x => x.id === lv.id) || {}).name) continue;
    lv.outline = f.outer.map(v => [r3(v[0]), r3(v[1])]);
    lv.solution = ORDER.map(id => {
      const s = f.sol.find(x => x.id === id);
      return { id: s.id, x: r3(s.x), y: r3(s.y), angle: s.angle, flipped: !!s.flipped };
    });
    if (f.holes.length) lv.holes = f.holes.map(h => h.map(v => [r3(v[0]), r3(v[1])]));
    else delete lv.holes;
    /* splitLines：内部共用边（只用于「细实线轮廓」这一档的显示，不影响判定） */
    const lines = [];
    const seen = {};
    for (let i = 0; i < f.sol.length; i++) {
      for (let j = i + 1; j < f.sol.length; j++) {
        const A = polyOf(f.sol[i]), B = polyOf(f.sol[j]);
        for (let a = 0; a < A.length; a++) {
          const p = A[a], q = A[(a + 1) % A.length];
          for (let b2 = 0; b2 < B.length; b2++) {
            const c = B[b2], d = B[(b2 + 1) % B.length];
            const dx = q[0] - p[0], dy = q[1] - p[1];
            const ex = d[0] - c[0], ey = d[1] - c[1];
            const cr = dx * ey - dy * ex;
            if (Math.abs(cr) / (Math.hypot(dx, dy) * Math.hypot(ex, ey) || 1) > 1e-3) continue;
            const dist = Math.abs((c[0] - p[0]) * dy - (c[1] - p[1]) * dx) / (Math.hypot(dx, dy) || 1);
            if (dist > 0.6) continue;
            /* 取两条边的公共段 */
            const ux = dx / (Math.hypot(dx, dy) || 1), uy = dy / (Math.hypot(dx, dy) || 1);
            const proj = v => (v[0] - p[0]) * ux + (v[1] - p[1]) * uy;
            const s0 = Math.max(Math.min(proj(p), proj(q)), Math.min(proj(c), proj(d)));
            const s1 = Math.min(Math.max(proj(p), proj(q)), Math.max(proj(c), proj(d)));
            if (s1 - s0 < 8) continue;
            const A2 = [p[0] + ux * s0, p[1] + uy * s0];
            const B2 = [p[0] + ux * s1, p[1] + uy * s1];
            const k = keyOf(A2) + '|' + keyOf(B2);
            if (seen[k]) continue;
            seen[k] = 1;
            lines.push([[r2(A2[0]), r2(A2[1])], [r2(B2[0]), r2(B2[1])]]);
          }
        }
      }
    }
    lv.splitLines = lines;
    n++;
  }
  src = src.slice(0, open) + JSON.stringify(arr, null, 2) + src.slice(close);
  fs.writeFileSync(file, src);
  console.log(`已写回 js/levels.js：${n} 关`);
}

}
if (require.main === module) main();

/* 供调试脚本复用（tools/debug_letters.js） */
module.exports = { unionLoops: unionLoops, splitLoops: splitLoops, stitch: stitch,
  rasterUnion: rasterUnion, snapLoop: snapLoop, polyOf: polyOf, repair: repair, SET: SET };
