/* 舞者关卡反解 · 顶点焊接（替代贴边装配）
 * ==================================================================
 * 思路：拟合出的板位置每次只差一点点（0.1~0.5 单位），而「缝 / 台阶」的根因是
 * 相邻板本该重合的顶点没有真正重合。于是不去搜索贴边组合，而是：
 *
 *   1) 把所有板的顶点摊平成一个点集（记住每个点属于哪块板、哪个角）；
 *   2) 两块不同板上的点，若互为最近点、且距离 < tol，就焊成一个点（取均值）；
 *   3) 每块板只允许平移（角度/翻面不动），用最小二乘把它的顶点拉向焊好的位置：
 *      t = mean(焊点 - 局部顶点)；
 *   4) 重复 2~3 两轮（第一轮 tol 小，逐步收紧），让焊接关系稳定下来。
 *
 * 「只平移」保证了板件形状和朝向不变，姿势不会被带歪；焊接保证共用顶点精确重合。
 * 同块板自己的两个顶点绝不焊接（并查集里加一条「同板不union」）。
 */
'use strict';
const path = require('path');
require(path.join(__dirname, '..', '..', 'js', 'geom.js'));
const G = globalThis.TANGRAM_GEOM;

const DEG = Math.PI / 180;
function rot(v, a, f) {
  const r = a * DEG, ca = Math.cos(r), sa = Math.sin(r);
  const x = v[0] * (f ? -1 : 1), y = v[1];
  return [x * ca - y * sa, x * sa + y * ca];
}

/* 并查集 */
function UF(n) {
  const p = new Array(n).fill(0).map((_, i) => i);
  const find = i => (p[i] === i ? i : (p[i] = find(p[i])));
  const uni = (a, b) => { a = find(a); b = find(b); if (a !== b) p[b] = a; };
  return { find, uni };
}

/* 顶点共用统计（验收线） */
function sharedStat(polys, tol) {
  const all = [];
  polys.forEach((p, i) => p.forEach(v => all.push([v[0], v[1], i])));
  const cl = [];
  for (const a of all) {
    let c = cl.find(c => Math.hypot(c.v[0] - a[0], c.v[1] - a[1]) < (tol || 0.06));
    if (!c) { c = { v: [a[0], a[1]], ps: new Set() }; cl.push(c); }
    c.ps.add(a[2]);
  }
  return { total: cl.length, shared: cl.filter(c => c.ps.size > 1).length };
}

/* 迭代焊接 + 平移回归 */
function weld(fits, LOCAL, opt) {
  const tols = (opt && opt.tols) || [0.16, 0.26, 0.34, 0.34];
  const items = fits.map(f => ({
    key: f.key, ang: f.ang, fl: f.fl, src: f, mask: f.mask,
    base: LOCAL[f.key].map(v => rot(v, f.ang, f.fl)),
    t: [f.cx, f.cy]
  }));

  for (const tol of tols) {
    /* 摊平顶点 */
    const V = [];                       // {pi, vi, x, y}
    items.forEach((it, pi) => it.base.forEach((v, vi) => V.push({ pi, vi, x: v[0] + it.t[0], y: v[1] + it.t[1] })));

    /* 互为最近点且跨板 => 焊接 */
    const uf = UF(V.length);
    const near = V.map(() => -1), nd = V.map(() => 1e9);
    for (let a = 0; a < V.length; a++) {
      for (let b = 0; b < V.length; b++) {
        if (V[a].pi === V[b].pi) continue;
        const d = Math.hypot(V[a].x - V[b].x, V[a].y - V[b].y);
        if (d < nd[a]) { nd[a] = d; near[a] = b; }
      }
    }
    for (let a = 0; a < V.length; a++) {
      const b = near[a];
      if (b < 0) continue;
      if (nd[a] > tol) continue;
      if (near[b] === a && nd[b] <= tol) uf.uni(a, b);      // 互为最近才焊
    }

    /* 焊点位置 = 组内均值 */
    const sum = new Map();
    for (let i = 0; i < V.length; i++) {
      const r = uf.find(i);
      const s = sum.get(r) || { x: 0, y: 0, n: 0 };
      s.x += V[i].x; s.y += V[i].y; s.n++;
      sum.set(r, s);
    }
    const cx = i => sum.get(uf.find(i)).x / sum.get(uf.find(i)).n;
    const cy = i => sum.get(uf.find(i)).y / sum.get(uf.find(i)).n;

    /* 每块板：平移最小二乘（对每个顶点求 delta 再取均值） */
    const move = [];
    let off = 0;
    for (let i = 0; i < V.length; i++) {
      const r = uf.find(i);
      if (sum.get(r).n < 2) continue;           // 没被焊的点不参与
      const dx = cx(i) - V[i].x, dy = cy(i) - V[i].y;
      if (!move[V[i].pi]) move[V[i].pi] = { x: 0, y: 0, n: 0 };
      move[V[i].pi].x += dx; move[V[i].pi].y += dy; move[V[i].pi].n++;
      off++;
    }
    items.forEach((it, i) => {
      const m = move[i];
      if (m && m.n) { it.t[0] += m.x / m.n; it.t[1] += m.y / m.n; }
    });
  }

  return items.map(it => ({
    key: it.key, ang: it.ang, fl: it.fl, src: it.src,
    x: it.t[0], y: it.t[1],
    pts: it.base.map(v => [v[0] + it.t[0], v[1] + it.t[1]])
  }));
}

module.exports = { weld, sharedStat, rot };
