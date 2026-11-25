/* 按「色相 → 板件」固定映射解析参考图的 12 个生肖造型
 * ---------------------------------------------------------------
 * 用户给定映射：
 *   红            → 大三角形 T1
 *   淡黄          → 大三角形 T2
 *   深黄（偏橙）   → 正方形   S
 *   粉            → 小三角形 T4
 *   紫            → 小三角形 T5
 *   绿            → 中三角形 T3
 *   蓝（青）       → 平行四边形 P
 *
 * 原图是渐变填充（同一块板从高光到暗部），所以用「色相」分类而不是 RGB 距离；
 * 一色一块、板间无描边 → 每个色相的连通域就对应一块板。
 * 尺寸 u 由图形总面积反推：面积 = 16u²。
 *
 * 输出 tools/zodiac/zodiac_raw.json
 */
const fs = require('fs');
const path = require('path');
const { decodePNG, px } = require('./png.js');
const L = require('./lib.js');

const img = decodePNG(path.join(__dirname, 'ref.png'));
const W = img.w, H = img.h, N = W * H;

/* 色相分档：[起, 止) 与板件 */
const CLASSES = [
  { id: 'T1', name: '红·大三角', lo: 344, hi: 10 },
  { id: 'S', name: '深黄·正方形', lo: 10, hi: 46 },
  { id: 'T2', name: '淡黄·大三角', lo: 46, hi: 76 },
  { id: 'T3', name: '绿·中三角', lo: 76, hi: 158 },
  { id: 'P', name: '蓝·平行四边形', lo: 158, hi: 228 },
  { id: 'T5', name: '紫·小三角', lo: 228, hi: 288 },
  { id: 'T4', name: '粉·小三角', lo: 288, hi: 344 }
];
const AREA_U = { T1: 4, T2: 4, T3: 2, S: 2, T4: 1, T5: 1, P: 2 };

function hueOf(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (d < 12) return -1;                        // 灰
  let h;
  if (mx === r) h = ((g - b) / d + 6) % 6;
  else if (mx === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return h * 60;
}
function classOf(h) {
  if (h < 0) return -1;
  for (let i = 0; i < CLASSES.length; i++) {
    const c = CLASSES[i];
    if (c.lo < c.hi ? (h >= c.lo && h < c.hi) : (h >= c.lo || h < c.hi)) return i;
  }
  return -1;
}

const lab = new Int8Array(N).fill(-1);
const fg = new Uint8Array(N);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const [r, g, b] = px(img, x, y);
    if (r > 238 && g > 238 && b > 238) continue;
    fg[y * W + x] = 1;
    const mx = Math.max(r, g, b);
    if (mx < 70) continue;                      // 极暗（阴影/文字）不算
    lab[y * W + x] = classOf(hueOf(r, g, b));
  }
}

function comps(mask, minPx) {
  const seen = new Uint8Array(N), out = [];
  for (let i = 0; i < N; i++) {
    if (seen[i] || mask[i] < 0) continue;
    const l0 = mask[i];
    const st = [i]; seen[i] = 1;
    const pix = [];
    let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
    while (st.length) {
      const k = st.pop(); pix.push(k);
      const x = k % W, y = (k / W) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      const nb = [k - 1, k + 1, k - W, k + W];
      for (let t = 0; t < 4; t++) {
        if (t === 0 && x === 0) continue;
        if (t === 1 && x === W - 1) continue;
        const j = nb[t];
        if (j < 0 || j >= N || seen[j] || mask[j] !== l0) continue;
        seen[j] = 1; st.push(j);
      }
    }
    if (pix.length >= minPx) out.push({ l: l0, pix, n: pix.length, x0, x1, y0, y1 });
  }
  return out;
}

function hull(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  lo.pop(); up.pop();
  return lo.concat(up);
}
function cent(p) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < p.length; i++) {
    const q = p[i], r = p[(i + 1) % p.length];
    const cr = q[0] * r[1] - r[0] * q[1];
    a += cr; cx += (q[0] + r[0]) * cr; cy += (q[1] + r[1]) * cr;
  }
  a *= 0.5;
  return [cx / (6 * a), cy / (6 * a)];
}
function edges(poly) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
    if (len < 1.5) continue;
    let ang = Math.atan2(dy, dx) * 180 / Math.PI;
    ang = ((ang % 180) + 180) % 180;
    out.push({ ang, len });
  }
  return out;
}
function orientScore(hullEdges, tplEdges) {
  const used = new Uint8Array(hullEdges.length);
  let sum = 0, tot = 0;
  for (const t of tplEdges) {
    tot += t.len;
    let bi = -1, bs = -1;
    for (let i = 0; i < hullEdges.length; i++) {
      if (used[i]) continue;
      const h = hullEdges[i];
      let da = Math.abs(h.ang - t.ang); if (da > 90) da = 180 - da;
      if (da > 6) continue;
      if (Math.abs(h.len - t.len) / t.len > 0.18) continue;
      const s = 1 - da / 6;
      if (s > bs) { bs = s; bi = i; }
    }
    if (bi >= 0) { used[bi] = 1; sum += t.len; }
  }
  return tot > 0 ? sum / tot : 0;
}

/* ---------- 12 个图形的范围 ---------- */
const fgMask = new Int8Array(N).fill(-1);
for (let i = 0; i < N; i++) if (fg[i]) fgMask[i] = 0;
const figs = comps(fgMask, 2500)
  .filter(o => (o.x1 - o.x0) < 400 && (o.y1 - o.y0) < 400)
  .map(o => { o.cx = (o.x0 + o.x1) / 2; o.cy = (o.y0 + o.y1) / 2; return o; })
  .sort((a, b) => (Math.round(a.cy / 110) - Math.round(b.cy / 110)) || (a.cx - b.cx));

const NAMES = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
const out = [];
let bad = 0;

figs.forEach((fb, gi) => {
  const name = NAMES[gi] || ('#' + gi);
  const mask = new Int8Array(N).fill(-1);
  for (let y = fb.y0; y <= fb.y1; y++) for (let x = fb.x0; x <= fb.x1; x++) {
    const k = y * W + x;
    if (lab[k] >= 0) mask[k] = lab[k];
  }
  const parts = comps(mask, 120);
  /* 每个色相取最大连通域 */
  const byCls = {};
  for (const p of parts) if (!byCls[p.l] || p.n > byCls[p.l].n) byCls[p.l] = p;

  const totPx = parts.reduce((s, p) => s + p.n, 0);
  const u = Math.sqrt(totPx / 16);

  const pieces = [], miss = [];
  CLASSES.forEach((cl, ci) => {
    const p = byCls[ci];
    if (!p) { miss.push(cl.name); return; }
    const pts = p.pix.map(k => [k % W, (k / W) | 0]);
    const hp = hull(pts);
    const c = cent(hp);
    const he = edges(hp);
    let best = null;
    for (let ai = 0; ai < 8; ai++) {
      for (const f of [false, true]) {
        const tpl = L.LOCAL[cl.id].map(v => { const r = L.rot(v, ai * 45, f); return [r[0] * u, r[1] * u]; });
        const sc = orientScore(he, edges(tpl));
        if (!best || sc > best.score) best = { ang: ai * 45, f, score: sc };
      }
    }
    pieces.push({ id: cl.id, ang: best.ang, f: best.f, score: best.score, cx: c[0], cy: c[1], areaU: p.n / (u * u), hull: hp.length });
  });
  const scMin = pieces.length ? Math.min(...pieces.map(p => p.score)) : 0;
  const areaErr = pieces.length ? Math.max(...pieces.map(p => Math.abs(p.areaU - AREA_U[p.id]) / AREA_U[p.id])) : 1;
  const ok = !miss.length && pieces.length === 7 && scMin > 0.72 && areaErr < 0.35;
  if (!ok) bad++;
  console.log((ok ? 'OK ' : 'XX ') + name.padEnd(2) + ' 块' + pieces.length + ' u=' + u.toFixed(2) +
    'px 方向' + scMin.toFixed(2) + ' 面积误差' + (areaErr * 100).toFixed(0) + '%' + (miss.length ? ' 缺:' + miss.join('/') : ''));
  pieces.forEach(p => console.log('    ' + p.id.padEnd(2) + ' a=' + String(p.ang).padStart(3) + ' f=' + (p.f ? 1 : 0) +
    ' 吻合' + p.score.toFixed(2) + ' 面积' + p.areaU.toFixed(2) + 'u²(应' + AREA_U[p.id] + ') 质心 ' + p.cx.toFixed(1) + ',' + p.cy.toFixed(1)));
  out.push({ name, u, pieces: pieces.map(p => ({ id: p.id, ang: p.ang, f: p.f, cx: p.cx, cy: p.cy, score: p.score, areaU: p.areaU })) });
});

fs.writeFileSync(path.join(__dirname, 'zodiac_raw.json'), JSON.stringify(out, null, 1));
console.log('\n图形 ' + out.length + ' 个，不合格 ' + bad);
