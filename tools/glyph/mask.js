/* 从参考图的「字母掩膜」直接描剪影
 * ---------------------------------------------------------------
 * 为什么不用「七块板并集的栅格轮廓」：板是逐块拟合出来的，每块有 0.05~0.3u 的
 * 残差，于是「本该共线」的两条板边会错开几个单位，剪影就在接缝处拐一道台阶；
 * 而板之间那条 1px 的白色接缝又会让剪影顺着缝描进去，形成 I / S / X 那种内部狭缝。
 *
 * 参考图本身就是矢量画的字母，直接描它最忠实：
 *   ① 掩膜 = 「不是近白背景」的像素（板之间的白色接缝天然被排除）
 *   ② 形态学闭运算（先膨胀 R 再腐蚀 R）把 1~2px 的接缝填掉 —— 这一步只填缝，
 *      不会吃掉字母的内孔（内孔有 2u 见方，远大于 R）
 *   ③ 再膨胀 1px，给「板件整块在剪影内」留一点余量
 *   ④ 4 邻域边界串环 + Douglas-Peucker，得到外轮廓与内孔
 *
 * 输出坐标是参考图像素坐标；调用方按 u 缩放到世界坐标。
 */
function traceGrid(g, w, h, x0, y0, res) {
  const key = (i, j) => i * (h + 2) + j;
  const edges = new Map();
  const add = (ax, ay, bx, by) => {
    const k = key(ax, ay);
    if (!edges.has(k)) edges.set(k, []);
    edges.get(k).push([bx, by]);
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!g[y * w + x]) continue;
    const up = y > 0 && g[(y - 1) * w + x];
    const dn = y < h - 1 && g[(y + 1) * w + x];
    const lf = x > 0 && g[y * w + x - 1];
    const rt = x < w - 1 && g[y * w + x + 1];
    if (!up) add(x, y, x + 1, y);
    if (!rt) add(x + 1, y, x + 1, y + 1);
    if (!dn) add(x + 1, y + 1, x, y + 1);
    if (!lf) add(x, y + 1, x, y);
  }
  const used = new Set();
  const loops = [];
  for (const [k, list] of edges) {
    for (const e of list) {
      const ax = Math.floor(k / (h + 2)), ay = k % (h + 2);
      const ek = ax + ',' + ay + ',' + e[0] + ',' + e[1];
      if (used.has(ek)) continue;
      const ring = [];
      let cx = ax, cy = ay, nx = e[0], ny = e[1];
      used.add(ek);
      ring.push([cx, cy]);
      let guard = 0;
      while (guard++ < w * h * 4) {
        const din = [nx - cx, ny - cy];
        cx = nx; cy = ny;
        ring.push([cx, cy]);
        if (cx === ax && cy === ay) break;
        const cands = edges.get(key(cx, cy));
        if (!cands) break;
        let best = null, bestTurn = Infinity;
        for (const c of cands) {
          const ck = cx + ',' + cy + ',' + c[0] + ',' + c[1];
          if (used.has(ck)) continue;
          const dout = [c[0] - cx, c[1] - cy];
          /* 取「最右转」：外轮廓贴着外侧走，内孔自然反向 */
          const ang = Math.atan2(din[0] * dout[1] - din[1] * dout[0], din[0] * dout[0] + din[1] * dout[1]);
          if (ang < bestTurn) { bestTurn = ang; best = { c, ck }; }
        }
        if (!best) break;
        used.add(best.ck);
        nx = best.c[0]; ny = best.c[1];
      }
      if (ring.length > 2) loops.push(ring);
    }
  }
  const area2 = r => {
    let s = 0;
    for (let i = 0; i < r.length; i++) {
      const a = r[i], b = r[(i + 1) % r.length];
      s += a[0] * b[1] - b[0] * a[1];
    }
    return s / 2;
  };
  const px = loops.map(r => r.map(([x, y]) => [x0 + x * res, y0 + y * res]));
  px.forEach((l, i) => { l._a = area2(l); });
  /* 外轮廓 = |面积| 最大；其余是内孔 */
  const sorted = px.slice().sort((a, b) => Math.abs(b._a) - Math.abs(a._a));
  const dp = (arr, tol) => {
    if (arr.length < 3) return arr;
    const a = arr[0], b = arr[arr.length - 1];
    let mi = 0, md = -1;
    const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
    for (let i = 1; i < arr.length - 1; i++) {
      let t = L2 > 0 ? ((arr[i][0] - a[0]) * dx + (arr[i][1] - a[1]) * dy) / L2 : 0;
      t = Math.max(0, Math.min(1, t));
      const d = Math.hypot(arr[i][0] - (a[0] + dx * t), arr[i][1] - (a[1] + dy * t));
      if (d > md) { md = d; mi = i; }
    }
    if (md <= tol) return [a, b];
    return dp(arr.slice(0, mi + 1), tol).slice(0, -1).concat(dp(arr.slice(mi), tol));
  };
  const simplify = (loop, tol) => {
    const ded = [];
    for (const v of loop) {
      const last = ded[ded.length - 1];
      if (!last || Math.hypot(v[0] - last[0], v[1] - last[1]) > 1e-9) ded.push(v);
    }
    if (ded.length > 1 && Math.hypot(ded[0][0] - ded[ded.length - 1][0], ded[0][1] - ded[ded.length - 1][1]) < 1e-9) ded.pop();
    if (ded.length < 4) return ded;
    let far = 0, fd = -1;
    for (let i = 0; i < ded.length; i++) {
      const d = Math.hypot(ded[i][0] - ded[0][0], ded[i][1] - ded[0][1]);
      if (d > fd) { fd = d; far = i; }
    }
    const A = ded.slice(0, far + 1), B = ded.slice(far).concat([ded[0]]);
    return dp(A, tol).slice(0, -1).concat(dp(B, tol).slice(0, -1));
  };
  return {
    outer: regularize45(simplify(sorted[0], 1.1)),
    holes: sorted.slice(1).map(l => regularize45(simplify(l, 1.1)))
      .filter(h => h.length >= 3 && Math.abs(area2(h)) > 120)
  };
}

/* 参考图里的边只有 0°/45°/90°，但 1px 栅格描出来是台阶。
 * 这里把每条边的方向吸附到最近的 45° 倍数，再用「相邻两条线求交」重建顶点 ——
 * 得到的多边形边是精确的直线，台阶和 1px 抖动都被吃掉。 */
function regularize45(loop, center) {
  const n = loop.length;
  if (n < 4) return loop;
  const lines = [];
  for (let i = 0; i < n; i++) {
    const a = loop[i], b = loop[(i + 1) % n];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const L = Math.hypot(dx, dy);
    if (L < 1e-9) { lines.push(null); continue; }
    let ang = Math.atan2(dy, dx);
    const snap = Math.round(ang / (Math.PI / 4)) * (Math.PI / 4);
    const off = Math.abs(((ang - snap + Math.PI) % (2 * Math.PI)) - Math.PI);
    /* 只吸附「本来就接近 45° 倍数」的边；差太多的保留原方向，避免把特征抹平 */
    const use = off < 8 * Math.PI / 180 ? snap : ang;
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    lines.push({ px: mx, py: my, dx: Math.cos(use), dy: Math.sin(use) });
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    const l1 = lines[(i - 1 + n) % n], l2 = lines[i];
    if (!l1 || !l2) { out.push(loop[i]); continue; }
    const den = l1.dx * l2.dy - l1.dy * l2.dx;
    if (Math.abs(den) < 1e-6) { out.push(loop[i]); continue; }
    const t = ((l2.px - l1.px) * l2.dy - (l2.py - l1.py) * l2.dx) / den;
    let p = [l1.px + l1.dx * t, l1.py + l1.dy * t];
    /* 求交可能飞到很远（两条近平行线），限制在原点附近 4 格内 */
    if (Math.hypot(p[0] - loop[i][0], p[1] - loop[i][1]) > 4) p = loop[i];
    out.push(p);
  }
  /* 去重 + 去共线 */
  let arr = out;
  for (let pass = 0; pass < 4; pass++) {
    const keep = [];
    const m = arr.length;
    for (let i = 0; i < m; i++) {
      const a = arr[(i - 1 + m) % m], b = arr[i], c = arr[(i + 1) % m];
      const dx = c[0] - a[0], dy = c[1] - a[1], L = Math.hypot(dx, dy);
      const d = L < 1e-9 ? Math.hypot(b[0] - a[0], b[1] - a[1])
        : Math.abs((b[0] - a[0]) * dy - (b[1] - a[1]) * dx) / L;
      if (d > 0.8) keep.push(b);
    }
    if (keep.length === arr.length) break;
    arr = keep;
  }
  return arr;
}

/* 形态学：dilate / erode（圆形结构元） */
function morph(g, w, h, r, mode) {
  if (r <= 0) return g;
  const mask = [];
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (dx * dx + dy * dy <= r * r + 1) mask.push([dx, dy]);
  }
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (mode === 'dilate') {
      if (!g[y * w + x]) continue;
      for (const [dx, dy] of mask) {
        const a = x + dx, b = y + dy;
        if (a >= 0 && a < w && b >= 0 && b < h) out[b * w + a] = 1;
      }
    } else {
      let keep = 1;
      for (const [dx, dy] of mask) {
        const a = x + dx, b = y + dy;
        if (a < 0 || a >= w || b < 0 || b >= h || !g[b * w + a]) { keep = 0; break; }
      }
      if (keep) out[y * w + x] = 1;
    }
  }
  return out;
}

/* 从参考图取某个字母的剪影（像素坐标） */
function letterOutline(img, box, opt) {
  const PAD = 6;
  const x0 = box.x0 - PAD, y0 = box.y0 - PAD;
  const w = box.x1 - box.x0 + 1 + PAD * 2, h = box.y1 - box.y0 + 1 + PAD * 2;
  const g = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = ((y0 + y) * img.w + (x0 + x)) * img.ch;
    const r = img.data[i], gg = img.data[i + 1], b = img.data[i + 2];
    /* 近白（背景 / 板之间的白接缝）都不算字母 */
    if (r > 236 && gg > 236 && b > 236) continue;
    if (Math.max(r, gg, b) - Math.min(r, gg, b) < 18 && Math.max(r, gg, b) > 215) continue;
    g[y * w + x] = 1;
  }
  const R = (opt && opt.close) || 2;
  const D = (opt && opt.dilate) || 1;
  const closed = morph(morph(g, w, h, R, 'dilate'), w, h, R, 'erode');
  const grown = morph(closed, w, h, D, 'dilate');
  const res = traceGrid(grown, w, h, x0, y0, 1);
  return res;
}

module.exports = { letterOutline, morph, traceGrid };
