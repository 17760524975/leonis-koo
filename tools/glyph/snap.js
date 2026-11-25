/* 精确贴边（exact snap）
 * ---------------------------------------------------------------
 * 拟合出来的摆位有 0.05~0.3u 的随机误差，后果是两个：
 *   ① 本该共线的两条板边错开几个单位 → 剪影在接缝处拐一道「错位」台阶；
 *   ② 本该贴住的板之间留下一条缝 → 剪影顺着缝描进去，形成内部狭缝（I / S / X）。
 *
 * 这里做的是「拼图式装配」而不是继续最小二乘：
 *   · 从最大的一块开始，按邻接关系 BFS
 *   · 每块只做**纯平移**（角度/翻面是 45° 整数倍，已确定），把它吸到最近的邻板上：
 *       候选 A：自己的某个顶点 ↔ 邻板的某个顶点（距离 < 0.45u）
 *       候选 B：自己的某个顶点 ↔ 邻板的某条边（垂足在边内，距离 < 0.45u）
 *     取位移最小的那个候选。平移后「顶点落在边上」是精确成立的，
 *     而两块板的边方向本来就平行（45° 整数倍），于是两条边**精确共线**。
 *   · 同样的 BFS 再走一遍，让被后放的板带偏的邻居回正。
 *
 * 目标函数是「位移最小」，所以不会像 connect 那样把图形拽变形。
 */
/* 凸多边形交集面积（Sutherland–Hodgman，七块板都是凸的） */
function overlapArea(A, B) {
  let out = A.map(v => [v[0], v[1]]);
  for (let i = 0; i < B.length && out.length; i++) {
    const a = B[i], b = B[(i + 1) % B.length];
    const inp = out; out = [];
    const side = p => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    for (let k = 0; k < inp.length; k++) {
      const cur = inp[k], nxt = inp[(k + 1) % inp.length];
      const sc = side(cur), sn = side(nxt);
      if (sc >= 0) out.push(cur);
      if ((sc >= 0) !== (sn >= 0)) {
        const tt = sc / (sc - sn);
        out.push([cur[0] + (nxt[0] - cur[0]) * tt, cur[1] + (nxt[1] - cur[1]) * tt]);
      }
    }
  }
  if (out.length < 3) return 0;
  let s = 0;
  for (let i = 0; i < out.length; i++) {
    const a = out[i], b = out[(i + 1) % out.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(s) / 2;
}

function polyDist(A, B) {
  const segD = (p, a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
    let t = L2 > 0 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2 : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t);
  };
  let m = Infinity;
  for (let i = 0; i < A.length; i++) for (let j = 0; j < B.length; j++) {
    m = Math.min(m, segD(A[i], B[j], B[(j + 1) % B.length]));
    m = Math.min(m, segD(B[j], A[i], A[(i + 1) % A.length]));
  }
  return m;
}

/* ps: [{id, P（以质心为原点、已旋好的局部多边形，长度单位 px）, t:[x,y]}]
 * 返回新的 t（单位同上），并把「贴边命中次数」一起带出来方便打日志。 */
function snapExact(ps, u, opt) {
  const TOL = (opt && opt.tol) || 0.45 * u;     // 判定「该贴」的距离
  const n = ps.length;
  const world = t => ps.map((p, i) => p.P.map(v => [v[0] + t[i][0], v[1] + t[i][1]]));
  let t = ps.map(p => p.t.slice());

  /* 邻接图：距离 < TOL 的算一条边 */
  const adj = Array.from({ length: n }, () => []);
  {
    const W = world(t);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      if (polyDist(W[i], W[j]) <= TOL) { adj[i].push(j); adj[j].push(i); }
    }
  }

  /* 从面积最大的那块出发 BFS（面积 = |shoelace|） */
  const areaOf = P => {
    let s = 0;
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length];
      s += a[0] * b[1] - b[0] * a[1];
    }
    return Math.abs(s) / 2;
  };
  const order = ps.map((p, i) => i).sort((a, b) => areaOf(ps[b].P) - areaOf(ps[a].P));

  /* 把第 i 块吸到已摆好的第 j 块上，返回新 t[i]（找不到候选就原样） */
  function candsFor(i, j, W) {
    const A = W[i], B = W[j];
    const out = [];
    /* 候选 A：顶点对顶点 */
    for (const a of A) for (const b of B) {
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (d > TOL || d < 1e-6) continue;
      out.push({ d, dx: b[0] - a[0], dy: b[1] - a[1], kind: 'vv' });
    }
    /* 候选 B：顶点贴边（垂足落在边内） */
    for (const a of A) {
      for (let k = 0; k < B.length; k++) {
        const p0 = B[k], p1 = B[(k + 1) % B.length];
        const dx = p1[0] - p0[0], dy = p1[1] - p0[1], L2 = dx * dx + dy * dy;
        if (L2 < 1e-9) continue;
        const tt = ((a[0] - p0[0]) * dx + (a[1] - p0[1]) * dy) / L2;
        if (tt < -0.02 || tt > 1.02) continue;
        const tc = Math.max(0, Math.min(1, tt));
        const q = [p0[0] + dx * tc, p0[1] + dy * tc];
        const d = Math.hypot(q[0] - a[0], q[1] - a[1]);
        if (d > TOL || d < 1e-6) continue;
        out.push({ d, dx: q[0] - a[0], dy: q[1] - a[1], kind: 've' });
      }
    }
    out.sort((x, y) => x.d - y.d);
    return out;
  }

  let hits = 0;
  for (let pass = 0; pass < 3; pass++) {
    const seen = new Uint8Array(n);
    const queue = [order[0]];
    seen[order[0]] = 1;
    hits = 0;
    while (queue.length) {
      const i = queue.shift();
      const W = world(t);
      /* 已在图里的邻居：把所有候选按位移升序收集，取第一个「贴完不压叠」的 */
      const all = [];
      for (const j of adj[i]) {
        if (!seen[j]) continue;
        for (const c of candsFor(i, j, W)) all.push(c);
      }
      all.sort((a, b) => a.d - b.d);
      let chosen = null;
      for (const c of all) {
        const nt = [t[i][0] + c.dx, t[i][1] + c.dy];
        const moved = ps[i].P.map(v => [v[0] + nt[0], v[1] + nt[1]]);
        let bad = false;
        for (let k = 0; k < n; k++) {
          if (k === i) continue;
          const other = ps[k].P.map(v => [v[0] + t[k][0], v[1] + t[k][1]]);
          /* 贴边只允许「零厚度接触」，压出面积就换下一个候选 */
          if (overlapArea(moved, other) > 0.02 * u * u) { bad = true; break; }
        }
        if (!bad) { chosen = nt; break; }
      }
      if (chosen) { t[i] = chosen; hits++; }
      for (const j of adj[i]) if (!seen[j]) { seen[j] = 1; queue.push(j); }
    }
  }
  return { t, hits, adj: adj.map(a => a.length) };
}

module.exports = { snapExact, polyDist };
