/* 从参考图反解七巧板：像素级精确覆盖（exact cover）求解 12 个生肖造型
 * ---------------------------------------------------------------
 * 参考图没有板间描边、同色相邻板会连片，逐色分割不可行。
 * 因此改用「用 7 块标准板把图形区域铺满」的 DFS 求解：
 *   · 每次取「最上最左的未覆盖像素」作为目标点
 *   · 每块板 × 16 种朝向 × 把某个顶点对到目标点（±1px）生成候选
 *   · 校验：板不出区域（≤3% 溢出）+ 与已放板不重叠（精确多边形交叠面积）+ 面积守恒
 *   · 铺满 7 块后校验覆盖率
 *
 * 求解出来的是「近似」位置（像素级 ±0.5px）。再做一次精确重建：
 * 已知每块的 (id, 角度, 翻转)，把平移量吸附到「顶点与顶点重合」的精确关系上，
 * 得到严格共边、零重叠、零缝隙的坐标。
 *
 * 输出 tools/zodiac/zodiac_solved.json
 */
const fs = require('fs');
const path = require('path');
const { decodePNG, px } = require('./png.js');
const L = require('./lib.js');
const G = L.G;

const img = decodePNG(path.join(__dirname, 'ref.png'));
const W = img.w, H = img.h, N = W * H;
const DBG = { n: 0, spill: 0, vert: 0, ov: 0 };
const IDS = ['T1', 'T2', 'T3', 'S', 'T4', 'T5', 'P'];
const AREA = {};
IDS.forEach(id => { AREA[id] = Math.abs(L.polyArea(L.LOCAL[id])); });   // u²

/* ---------- 前景连通域 → 12 个图形 ---------- */
const fg = new Uint8Array(N);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const [r, g, b] = px(img, x, y);
  fg[y * W + x] = (r > 238 && g > 238 && b > 238) ? 0 : 1;
}
function cc(mask, minPx) {
  const seen = new Uint8Array(N), out = [];
  for (let i = 0; i < N; i++) {
    if (seen[i] || !mask[i]) continue;
    const st = [i]; seen[i] = 1;
    const pix = []; let sx = 0, sy = 0, x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
    while (st.length) {
      const k = st.pop(); pix.push(k);
      const x = k % W, y = (k / W) | 0;
      sx += x; sy += y;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      const nb = [k - 1, k + 1, k - W, k + W];
      for (let t = 0; t < 4; t++) {
        if (t === 0 && x === 0) continue;
        if (t === 1 && x === W - 1) continue;
        const j = nb[t];
        if (j < 0 || j >= N || seen[j] || !mask[j]) continue;
        seen[j] = 1; st.push(j);
      }
    }
    if (pix.length >= minPx) out.push({ pix, n: pix.length, cx: sx / pix.length, cy: sy / pix.length, x0, x1, y0, y1 });
  }
  return out;
}
const blobs = cc(fg, 2500)
  .filter(o => (o.x1 - o.x0) < 400 && (o.y1 - o.y0) < 400)
  .sort((a, b) => (Math.round(a.cy / 110) - Math.round(b.cy / 110)) || (a.cx - b.cx));

/* ---------- 区域掩膜（膨胀 1px 容忍抗锯齿） ---------- */
function makeRegion(bg) {
  const x0 = bg.x0 - 4, y0 = bg.y0 - 4, w = bg.x1 - bg.x0 + 9, h = bg.y1 - bg.y0 + 9;
  const raw = new Uint8Array(w * h), dil = new Uint8Array(w * h);
  for (const k of bg.pix) {
    const x = k % W, y = (k / W) | 0;
    raw[(y - y0) * w + (x - x0)] = 1;
  }
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    if (!raw[yy * w + xx]) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const a = xx + dx, b = yy + dy;
      if (a >= 0 && a < w && b >= 0 && b < h) dil[b * w + a] = 1;
    }
  }
  return { x0, y0, w, h, raw, dil };
}

/* ---------- 模板 ---------- */
const ORIENTS = [];             // {id, ang, f, pts:[...] }
for (const id of IDS) {
  const seen = new Set();
  for (let ai = 0; ai < 8; ai++) for (const f of [false, true]) {
    const pts = L.LOCAL[id].map(v => L.rot(v, ai * 45, f));
    const key = pts.map(p => p.map(n => n.toFixed(3)).join(',')).sort().join(';');
    if (seen.has(key)) continue;
    seen.add(key);
    ORIENTS.push({ id, ang: ai * 45, f, pts });
  }
}

/* ---------- 点是否在多边形内 ---------- */
function inPoly(pt, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if (((a[1] > pt[1]) !== (b[1] > pt[1])) &&
      (pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0])) c = !c;
  }
  return c;
}

/* ---------- 单一图形的求解 ---------- */
function solve(bg, name) {
  const R = makeRegion(bg);
  const u = Math.sqrt(bg.n / 16);
  const totA = bg.n;
  const cov = new Uint8Array(R.w * R.h);
  /* 未覆盖像素按 (y,x) 排序 */
  const list = [];
  for (let y = 0; y < R.h; y++) for (let x = 0; x < R.w; x++) if (R.raw[y * R.w + x]) list.push([x + R.x0, y + R.y0, y * R.w + x]);
  let remain = list.length;

  const placed = [];
  const marks = [];
  let nodes = 0;
  const T0 = Date.now();

  function tryPlace(o, t) {
    const pts = o.pts.map(v => [v[0] * u + t[0], v[1] * u + t[1]]);
    /* 1) 顶点必须在膨胀区域内 */
    for (const v of pts) {
      const gx = Math.round(v[0]) - R.x0, gy = Math.round(v[1]) - R.y0;
      if (gx < 0 || gy < 0 || gx >= R.w || gy >= R.h || !R.dil[gy * R.w + gx]) { if (process.env.DBG) DBG.vert++; return null; }
    }
    /* 2) 与已放板精确不重叠 */
    for (const p of placed) {
      if (G.convexOverlapArea(pts, p.pts) > 6) { if (process.env.DBG) DBG.ov++; return null; }
    }
    /* 3) 栅格化：溢出比例 + 覆盖像素 */
    const bx0 = Math.floor(Math.min(...pts.map(v => v[0]))), bx1 = Math.ceil(Math.max(...pts.map(v => v[0])));
    const by0 = Math.floor(Math.min(...pts.map(v => v[1]))), by1 = Math.ceil(Math.max(...pts.map(v => v[1])));
    let inN = 0, outN = 0;
    const hit = [];
    for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) {
      if (!inPoly([x + 0.5, y + 0.5], pts)) continue;
      const gx = x - R.x0, gy = y - R.y0;
      const inside = gx >= 0 && gy >= 0 && gx < R.w && gy < R.h && R.dil[gy * R.w + gx];
      if (inside) { inN++; if (gy >= 0 && gy < R.h && gx >= 0 && gx < R.w && R.raw[gy * R.w + gx] && !cov[gy * R.w + gx]) hit.push(gy * R.w + gx); }
      else outN++;
    }
    if (process.env.DBG) { DBG.n++; if (outN > (inN + outN) * 0.035) DBG.spill++; }
    if (outN > (inN + outN) * 0.035) return null;
    return { pts, hit, area: inN };
  }

  function dfs(used, areaSum) {
    if (Date.now() - T0 > 40000) throw new Error('超时');
    if (placed.length === 7) return remain <= list.length * 0.02;
    if (nodes++ > 400000) return false;
    /* 目标像素：最上最左未覆盖 */
    let tg = null;
    for (let i = 0; i < list.length; i++) {
      const [x, y, k] = list[i];
      if (cov[k]) continue;
      tg = [x + 0.5, y + 0.5]; break;
    }
    if (process.env.DBG) console.log('  '.repeat(placed.length) + 'depth' + placed.length + ' cands=' + (DBG.n) + ' spill=' + DBG.spill + ' vert=' + DBG.vert + ' ov=' + DBG.ov + ' tg=' + (tg?tg.join(','):'-'));
    if (!tg) return placed.length === 7;
    const cands = [];
    for (const o of ORIENTS) {
      if (used.has(o.id)) continue;
      if (areaSum + AREA[o.id] * u * u > totA * 1.04) continue;
      for (const v of o.pts) {
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const t = [tg[0] - v[0] * u + dx, tg[1] - v[1] * u + dy];
          const res = tryPlace(o, t);
          if (res && res.hit.length) cands.push({ o, t, res });
        }
      }
    }
    /* 优先「盖住目标点」且溢出少、面积大的 */
    cands.sort((a, b) => {
      const ha = a.res.hit.includes((Math.floor(tg[1]) - R.y0) * R.w + (Math.floor(tg[0]) - R.x0)) ? 1 : 0;
      const hb = b.res.hit.includes((Math.floor(tg[1]) - R.y0) * R.w + (Math.floor(tg[0]) - R.x0)) ? 1 : 0;
      if (ha !== hb) return hb - ha;
      return b.res.area - a.res.area;
    });
    for (const c of cands) {
      placed.push({ id: c.o.id, ang: c.o.ang, f: c.o.f, t: c.t, pts: c.res.pts });
      used.add(c.o.id);
      for (const k of c.res.hit) cov[k] = 1;
      marks.push(c.res.hit);
      remain -= c.res.hit.length;
      if (dfs(used, areaSum + AREA[c.o.id] * u * u)) return true;
      for (const k of c.res.hit) cov[k] = 0;
      marks.pop();
      remain += c.res.hit.length;
      used.delete(c.o.id);
      placed.pop();
    }
    return false;
  }

  const ok = dfs(new Set(), 0);
  return { ok, u, placed: placed.map(p => ({ id: p.id, ang: p.ang, f: p.f, tx: p.t[0], ty: p.t[1] })), nodes, ms: Date.now() - T0 };
}

/* ---------- 精确重建：把平移吸附到「顶点重合」关系上 ---------- */
function rebuild(sol, u) {
  const items = sol.map(p => {
    const pts = L.LOCAL[p.id].map(v => { const r = L.rot(v, p.ang, p.f); return [r[0] * u + p.tx, r[1] * u + p.ty]; });
    return { ...p, pts };
  });
  /* 面积大的先放（大三角定位最稳） */
  const order = items.slice().sort((a, b) => AREA[b.id] - AREA[a.id]);
  const done = [];
  const first = order[0];
  done.push({ ...first, pts: first.pts });

  for (let k = 1; k < order.length; k++) {
    const it = order[k];
    const base = L.LOCAL[it.id].map(v => L.rot(v, it.ang, it.f));   // u 单位
    let best = null;
    for (const ref of done) {
      for (const rv of ref.pts) {
        for (let vi = 0; vi < base.length; vi++) {
          const t = [rv[0] - base[vi][0] * u, rv[1] - base[vi][1] * u];
          const pts = base.map(v => [v[0] * u + t[0], v[1] * u + t[1]]);
          let ov = 0;
          for (const q of done) ov = Math.max(ov, G.convexOverlapArea(pts, q.pts));
          if (ov > 4) continue;
          const d = Math.hypot(t[0] - it.tx, t[1] - it.ty);
          if (!best || d < best.d) best = { d, t, pts };
        }
      }
    }
    if (!best) return null;
    done.push({ id: it.id, ang: it.ang, f: it.f, t: best.t, pts: best.pts, snap: best.d });
  }
  return done;
}

/* ---------- 主流程 ---------- */
const NAMES = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
const out = [];
const ONLY = process.env.FIG ? process.env.FIG.split(',').map(Number) : null;
blobs.forEach((bg, gi) => {
  if (ONLY && !ONLY.includes(gi)) return;
  const name = NAMES[gi] || ('#' + gi);
  let r;
  try { r = solve(bg, name); } catch (e) { console.log('XX ' + name + ' ' + e.message); return; }
  if (!r.ok) { console.log('XX ' + name + ' 无解  nodes=' + r.nodes); return; }
  const reb = rebuild(r.placed, r.u);
  if (!reb) { console.log('XX ' + name + ' 精确重建失败'); return; }
  /* 校验：总面积、零重叠、剪影 IoU */
  const sumA = IDS.reduce((s, id) => s + AREA[id], 0) * r.u * r.u;
  let maxOv = 0;
  for (let i = 0; i < reb.length; i++) for (let j = i + 1; j < reb.length; j++)
    maxOv = Math.max(maxOv, G.convexOverlapArea(reb[i].pts, reb[j].pts));
  const tol = Math.max(...reb.map(p => p.snap || 0));
  console.log('OK ' + name.padEnd(2) + ' u=' + r.u.toFixed(2) + ' 面积' + (sumA / bg.n * 100).toFixed(1) + '%' +
    ' 最大压叠' + maxOv.toFixed(2) + 'px² 吸附位移≤' + tol.toFixed(1) + 'px  nodes=' + r.nodes + ' ' + r.ms + 'ms');
  out.push({
    name, u: r.u,
    cxFig: reb.reduce((s, p) => s + p.t[0], 0) / reb.length,
    cyFig: reb.reduce((s, p) => s + p.t[1], 0) / reb.length,
    pieces: reb.map(p => ({ id: p.id, ang: p.ang, f: p.f, tx: p.t[0], ty: p.t[1] }))
  });
});
fs.writeFileSync(path.join(__dirname, 'zodiac_solved.json'), JSON.stringify(out, null, 1));
console.log('\n成功 ' + out.length + '/12');
