/* 七巧板「精确并集轮廓」
 * ---------------------------------------------------------------
 * 板件严格铺砌（边贴边、零压叠）时，并集的边界一定是**板边的一部分**：
 *   ⓪ 先把相距 < 0.15 的顶点并成同一个点 —— 拼接出来两块板共用的角点
 *      常常差个 0.01~0.05（浮点/取整），不合并则端点串不起来
 *   ① 把每条板边按「落在它上面的其它顶点」切开（处理 T 形接头）
 *   ② 每小段取中点，往两侧各探 0.5 单位：两侧都有板 → 内部接缝，丢掉；
 *      只有一侧有板 → 边界段，并把方向定成「板在左侧」
 *   ③ 按端点串环；一个顶点同时属于多段时（顶点相碰），取最靠右转的那段
 *   ④ 面积最大的环是外轮廓，其余是内孔
 *
 * 相比栅格描边：没有量化误差（顶点就是板件顶点），也不会在「顶点相碰」处
 * 产生零宽尖刺 —— 因为内部接缝在 ② 就被丢掉了。
 */
function mergeVerts(polys, tol) {
  const reps = [];
  const idOf = v => {
    for (let i = 0; i < reps.length; i++) {
      if (Math.hypot(reps[i][0] - v[0], reps[i][1] - v[1]) <= tol) return i;
    }
    reps.push([v[0], v[1]]);
    return reps.length - 1;
  };
  const ids = polys.map(P => P.map(idOf));
  const acc = reps.map(() => [0, 0, 0]);
  ids.forEach(P => P.forEach(id => {
    const v = reps[id];
    acc[id][0] += v[0]; acc[id][1] += v[1]; acc[id][2]++;
  }));
  const pos = acc.map(a => [a[0] / a[2], a[1] / a[2]]);
  return { polys: ids.map(P => P.map(id => pos[id].slice())), pos };
}

function outlineOf(polysIn, opt) {
  const tol = (opt && opt.mergeTol) || 0.15;
  const eps = (opt && opt.eps) || 0.06;
  const probe = (opt && opt.probe) || 0.5;
  const { polys } = mergeVerts(polysIn, tol);

  const allVerts = [];
  for (const P of polys) for (const v of P) allVerts.push(v);

  const insideAny = (pt) => {
    for (const P of polys) {
      let c = false;
      for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
        const a = P[i], b = P[j];
        if (((a[1] > pt[1]) !== (b[1] > pt[1])) &&
            (pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0])) c = !c;
      }
      if (c) return true;
    }
    return false;
  };

  /* ① + ② */
  const segs = [];
  for (const poly of polys) {
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (L < 1e-6) continue;
      const ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
      const cuts = [{ t: 0, p: a }, { t: L, p: b }];
      for (const v of allVerts) {
        const px = v[0] - a[0], py = v[1] - a[1];
        const pr = px * ux + py * uy;
        if (pr <= 0.02 || pr >= L - 0.02) continue;
        if (Math.abs(px * uy - py * ux) > eps) continue;
        cuts.push({ t: pr, p: v });     // 直接用「那个顶点」当切点，保证相邻边端点完全一致
      }
      cuts.sort((x, y) => x.t - y.t);
      for (let k = 0; k + 1 < cuts.length; k++) {
        if (cuts[k + 1].t - cuts[k].t < 0.08) continue;
        const p0 = cuts[k].p, p1 = cuts[k + 1].p;
        const mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
        const nx = -uy, ny = ux;
        const l = insideAny([mx + nx * probe, my + ny * probe]);
        const r = insideAny([mx - nx * probe, my - ny * probe]);
        if (l && r) continue;
        if (!l && !r) continue;
        if (l) segs.push([p0, p1]);
        else segs.push([p1, p0]);
      }
    }
  }
  if (!segs.length) return { outer: [], holes: [] };

  /* ③ 串环 */
  const kk = p => Math.round(p[0] * 100) / 100 + ',' + Math.round(p[1] * 100) / 100;
  const byStart = new Map();
  segs.forEach((s, i) => {
    const k = kk(s[0]);
    if (!byStart.has(k)) byStart.set(k, []);
    byStart.get(k).push(i);
  });
  const used = new Uint8Array(segs.length);
  const loops = [];
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    const startKey = kk(segs[i][0]);
    const ring = [];
    let cur = i, guard = 0;
    while (guard++ < segs.length + 4) {
      used[cur] = 1;
      ring.push(segs[cur][0]);
      const end = segs[cur][1];
      if (kk(end) === startKey) break;
      let cands = (byStart.get(kk(end)) || []).filter(j => !used[j]);
      if (!cands.length) {
        /* 端点差了几百分之一（两条边各自被切在不同位置）：在 0.4 内找最近起点 */
        let bd = 0.4;
        for (const [k2, list] of byStart) {
          const q = k2.split(',').map(Number);
          const d = Math.hypot(q[0] - end[0], q[1] - end[1]);
          if (d <= bd) {
            const free = list.filter(j => !used[j]);
            if (free.length) { bd = d; cands = free; }
          }
        }
      }
      if (!cands.length) break;
      let pick = cands[0];
      if (cands.length > 1) {
        const a0 = segs[cur][0];
        const inx = end[0] - a0[0], iny = end[1] - a0[1];
        let best = Infinity;
        for (const j of cands) {
          const outx = segs[j][1][0] - segs[j][0][0], outy = segs[j][1][1] - segs[j][0][1];
          const ang = Math.atan2(inx * outy - iny * outx, inx * outx + iny * outy);
          if (ang < best) { best = ang; pick = j; }
        }
      }
      cur = pick;
    }
    if (ring.length >= 3) loops.push(ring);
  }

  const area = r => {
    let s = 0;
    for (let i = 0; i < r.length; i++) {
      const a = r[i], b = r[(i + 1) % r.length];
      s += a[0] * b[1] - b[0] * a[1];
    }
    return s / 2;
  };
  loops.sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)));
  const clean = r => {
    const out = [];
    for (const v of r) {
      const last = out[out.length - 1];
      if (!last || Math.hypot(v[0] - last[0], v[1] - last[1]) > 1e-6) out.push(v);
    }
    if (out.length > 1) {
      const f = out[0], l = out[out.length - 1];
      if (Math.hypot(f[0] - l[0], f[1] - l[1]) < 1e-6) out.pop();
    }
    let arr = out;
    for (let pass = 0; pass < 5; pass++) {
      const keep = [];
      const n = arr.length;
      for (let i = 0; i < n; i++) {
        const a = arr[(i - 1 + n) % n], b = arr[i], c = arr[(i + 1) % n];
        const dx = c[0] - a[0], dy = c[1] - a[1], L = Math.hypot(dx, dy);
        const d = L < 1e-9 ? Math.hypot(b[0] - a[0], b[1] - a[1])
          : Math.abs((b[0] - a[0]) * dy - (b[1] - a[1]) * dx) / L;
        if (d > 0.06) keep.push(b);
      }
      if (keep.length === arr.length) break;
      arr = keep;
    }
    return arr;
  };
  return { outer: clean(loops[0]), holes: loops.slice(1).map(clean).filter(h => h.length >= 3) };
}

module.exports = { outlineOf, mergeVerts };
