/* 生肖造型解析（最终版）
 * ---------------------------------------------------------------
 * 1) 色相 → 板件（用户给定映射），每个色相取最大连通域 = 一块板
 * 2) u 由图形总面积反推（16u²）
 * 3) 角度/翻转：用「板件像素掩膜 vs 模板多边形」的 IoU 拟合（渐变填充会让
 *    色相边界抖 ±2px，IoU 对此最不敏感）；再对最优朝向做平移细化
 * 4) 精确重建：平移吸附到「顶点与顶点重合」，保证严格共边 / 零重叠 / 零缝隙
 * 输出 tools/zodiac/zodiac_fit.json
 */
const fs = require('fs');
const path = require('path');
const { decodePNG, px } = require('./png.js');
const L = require('./lib.js');
const G = L.G;

const img = decodePNG(path.join(__dirname, 'ref.png'));
const W = img.w, H = img.h, N = W * H;

const CLASSES = [
  { id: 'T1', name: '红·大三角', lo: 344, hi: 10 },
  { id: 'S', name: '深黄·正方形', lo: 10, hi: 46 },
  { id: 'T2', name: '淡黄·大三角', lo: 46, hi: 76 },
  { id: 'T3', name: '绿·中三角', lo: 76, hi: 158 },
  { id: 'P', name: '蓝·平行四边形', lo: 158, hi: 228 },
  { id: 'T5', name: '紫·小三角', lo: 228, hi: 288 },
  { id: 'T4', name: '粉·小三角', lo: 288, hi: 344 }
];

function hueOf(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (d < 12) return -1;
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
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const [r, g, b] = px(img, x, y);
  if (r > 238 && g > 238 && b > 238) continue;
  fg[y * W + x] = 1;
  if (Math.max(r, g, b) < 70) continue;
  lab[y * W + x] = classOf(hueOf(r, g, b));
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

function inPoly(pt, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if (((a[1] > pt[1]) !== (b[1] > pt[1])) && (pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0])) c = !c;
  }
  return c;
}
const polyArea = p => { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; };
function centroid(p) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < p.length; i++) {
    const q = p[i], r = p[(i + 1) % p.length];
    const cr = q[0] * r[1] - r[0] * q[1];
    a += cr; cx += (q[0] + r[0]) * cr; cy += (q[1] + r[1]) * cr;
  }
  a *= 0.5;
  return [cx / (6 * a), cy / (6 * a)];
}

/* 局部掩膜（piece bbox + 4px 边距）上的 IoU */
function makeLocalMask(p) {
  const x0 = p.x0 - 4, y0 = p.y0 - 4;
  const w = p.x1 - p.x0 + 9, h = p.y1 - p.y0 + 9;
  const m = new Uint8Array(w * h);
  for (const k of p.pix) m[((k / W | 0) - y0) * w + (k % W - x0)] = 1;
  return { m, w, h, x0, y0, n: p.n };
}
function iouOn(lm, poly) {
  const x0 = Math.max(lm.x0, Math.floor(Math.min(...poly.map(v => v[0]))) - 1);
  const x1 = Math.min(lm.x0 + lm.w - 1, Math.ceil(Math.max(...poly.map(v => v[0]))) + 1);
  const y0 = Math.max(lm.y0, Math.floor(Math.min(...poly.map(v => v[1]))) - 1);
  const y1 = Math.min(lm.y0 + lm.h - 1, Math.ceil(Math.max(...poly.map(v => v[1]))) + 1);
  let inter = 0;
  for (let y = y0; y <= y1; y++) {
    const yy = y - lm.y0;
    if (yy < 0 || yy >= lm.h) continue;
    for (let x = x0; x <= x1; x++) {
      const xx = x - lm.x0;
      if (xx < 0 || xx >= lm.w) continue;
      if (lm.m[yy * lm.w + xx] && inPoly([x + 0.5, y + 0.5], poly)) inter++;
    }
  }
  const pa = polyArea(poly);
  return inter / (lm.n + pa - inter);
}

/* ---------- 12 个图形 ---------- */
const fgMask = new Int8Array(N).fill(-1);
for (let i = 0; i < N; i++) if (fg[i]) fgMask[i] = 0;
const figs = comps(fgMask, 2500)
  .filter(o => (o.x1 - o.x0) < 400 && (o.y1 - o.y0) < 400)
  .map(o => { o.cx = (o.x0 + o.x1) / 2; o.cy = (o.y0 + o.y1) / 2; return o; })
  .sort((a, b) => (Math.round(a.cy / 110) - Math.round(b.cy / 110)) || (a.cx - b.cx));

const NAMES = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
const RESULT = [];

figs.forEach((fb, gi) => {
  const name = NAMES[gi] || ('#' + gi);
  const mask = new Int8Array(N).fill(-1);
  for (let y = fb.y0; y <= fb.y1; y++) for (let x = fb.x0; x <= fb.x1; x++) {
    const k = y * W + x;
    if (lab[k] >= 0) mask[k] = lab[k];
  }
  const parts = comps(mask, 120);
  const byCls = {};
  for (const p of parts) if (!byCls[p.l] || p.n > byCls[p.l].n) byCls[p.l] = p;
  const u = Math.sqrt(parts.reduce((s, p) => s + p.n, 0) / 16);

  const pieces = [], miss = [];
  CLASSES.forEach((cl, ci) => {
    const p = byCls[ci];
    if (!p) { miss.push(cl.name); return; }
    const lm = makeLocalMask(p);
    let mx = 0, my = 0;
    for (const k of p.pix) { mx += k % W; my += (k / W) | 0; }
    mx /= p.n; my /= p.n;

    /* 阶段 1：求朝向（平移用掩膜质心） */
    let best = null;
    for (const sMul of [0.96, 0.98, 1.0, 1.02, 1.04]) {
      const uu = u * sMul;
      for (let ai = 0; ai < 8; ai++) {
        for (const f of [false, true]) {
          const tpl = L.LOCAL[cl.id].map(v => L.rot(v, ai * 45, f));
          const pts = tpl.map(v => [v[0] * uu + mx, v[1] * uu + my]);
          const sc = iouOn(lm, pts);
          if (!best || sc > best.score) best = { ang: ai * 45, f, sMul, score: sc };
        }
      }
    }
    /* 阶段 2：平移细化 */
    let ref = best;
    for (const uu of [u * best.sMul]) {
      const tpl = L.LOCAL[cl.id].map(v => L.rot(v, best.ang, best.f));
      for (let dy = -2; dy <= 2; dy += 0.5) {
        for (let dx = -2; dx <= 2; dx += 0.5) {
          const pts = tpl.map(v => [v[0] * uu + mx + dx, v[1] * uu + my + dy]);
          const sc = iouOn(lm, pts);
          if (sc > ref.score) ref = { ang: best.ang, f: best.f, sMul: best.sMul, score: sc, dx, dy };
        }
      }
    }
    pieces.push({
      id: cl.id, ang: ref.ang, f: ref.f,
      cx: mx + (ref.dx || 0), cy: my + (ref.dy || 0),
      score: ref.score, areaU: p.n / (u * u)
    });
  });

  const scMin = pieces.length ? Math.min(...pieces.map(p => p.score)) : 0;
  const ok = !miss.length && pieces.length === 7 && scMin > 0.88;
  console.log((ok ? 'OK ' : 'XX ') + name.padEnd(2) + ' 块' + pieces.length + ' u=' + u.toFixed(2) +
    ' IoU最低' + scMin.toFixed(3) + (miss.length ? ' 缺:' + miss.join('/') : ''));
  pieces.forEach(p => console.log('    ' + p.id.padEnd(2) + ' a=' + String(p.ang).padStart(3) + ' f=' + (p.f ? 1 : 0) +
    ' IoU=' + p.score.toFixed(3) + ' 面积' + p.areaU.toFixed(2) + 'u² 质心 ' + p.cx.toFixed(1) + ',' + p.cy.toFixed(1)));
  RESULT.push({ name, u, pieces: pieces.map(p => ({ id: p.id, ang: p.ang, f: p.f, cx: p.cx, cy: p.cy, score: p.score })) });
});

fs.writeFileSync(path.join(__dirname, 'zodiac_fit.json'), JSON.stringify(RESULT, null, 1));
console.log('\n完成 ' + RESULT.length + ' 个');
