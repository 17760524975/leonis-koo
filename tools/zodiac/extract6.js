/* 生肖造型解析 v2：加「整体去旋转」
 * ---------------------------------------------------------------
 * 参考图里有的图形整体被画歪了十几度（例如猴、兔），板件角度不是 45° 的整数倍，
 * 直接拟合 IoU 只有 0.66~0.8。而关卡里板件只能转 45° 的整数倍，所以先估一个
 * 整体旋转量 δ（各块共用），把整个图形转回正，再由 (角度, 翻转, 质心) 精确重建。
 *
 * 输出 tools/zodiac/zodiac_fit.json（已去旋转，角度均为 45° 整数倍）
 */
const fs = require('fs');
const path = require('path');
const { decodePNG, px } = require('./png.js');
const L = require('./lib.js');

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

function makeLocalMask(p) {
  const x0 = p.x0 - 5, y0 = p.y0 - 5;
  const w = p.x1 - p.x0 + 11, h = p.y1 - p.y0 + 11;
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
    const row = yy * lm.w;
    for (let x = x0; x <= x1; x++) {
      const xx = x - lm.x0;
      if (xx < 0 || xx >= lm.w) continue;
      if (lm.m[row + xx] && inPoly([x + 0.5, y + 0.5], poly)) inter++;
    }
  }
  const pa = polyArea(poly);
  return inter / (lm.n + pa - inter);
}

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

  /* 每块：局部掩膜 + 质心 */
  const items = [];
  CLASSES.forEach((cl, ci) => {
    const p = byCls[ci];
    if (!p) return;
    let mx = 0, my = 0;
    for (const k of p.pix) { mx += k % W; my += (k / W) | 0; }
    items.push({ cl, p, lm: makeLocalMask(p), mx: mx / p.n, my: my / p.n });
  });
  if (items.length < 7) { console.log('XX ' + name + ' 少块：' + (7 - items.length)); return; }

  /* 阶段 A：估计整体旋转 δ（各块共用），先在 δ 网格上粗搜 */
  let bestD = null;
  for (let dd = -24; dd <= 24; dd += 1) {
    let sum = 0;
    for (const it of items) {
      let bs = 0;
      for (let ai = 0; ai < 8; ai++) for (const f of [false, true]) {
        const tpl = L.LOCAL[it.cl.id].map(v => L.rot(v, ai * 45 + dd, f));
        const pts = tpl.map(v => [v[0] * u + it.mx, v[1] * u + it.my]);
        const sc = iouOn(it.lm, pts);
        if (sc > bs) bs = sc;
      }
      sum += bs;
    }
    if (!bestD || sum > bestD.sum) bestD = { dd, sum };
  }
  /* 细化到 0.25° */
  let fine = bestD;
  for (let dd = bestD.dd - 1; dd <= bestD.dd + 1; dd += 0.25) {
    let sum = 0;
    for (const it of items) {
      let bs = 0;
      for (let ai = 0; ai < 8; ai++) for (const f of [false, true]) {
        const tpl = L.LOCAL[it.cl.id].map(v => L.rot(v, ai * 45 + dd, f));
        const pts = tpl.map(v => [v[0] * u + it.mx, v[1] * u + it.my]);
        const sc = iouOn(it.lm, pts);
        if (sc > bs) bs = sc;
      }
      sum += bs;
    }
    if (sum > fine.sum) fine = { dd, sum };
  }
  const dd = fine.dd;

  /* 阶段 B：定 δ 后逐块求角度（含缩放/平移细化），角度扣掉 δ 成为 45° 整数倍 */
  const c0 = { x: items.reduce((s, q) => s + q.mx, 0) / items.length, y: items.reduce((s, q) => s + q.my, 0) / items.length };
  const pieces = [];
  for (const it of items) {
    let best = null;
    for (const sMul of [0.96, 0.98, 1.0, 1.02, 1.04]) {
      const uu = u * sMul;
      for (let ai = 0; ai < 8; ai++) {
        for (const f of [false, true]) {
          const tpl = L.LOCAL[it.cl.id].map(v => L.rot(v, ai * 45 + dd, f));
          const pts = tpl.map(v => [v[0] * uu + it.mx, v[1] * uu + it.my]);
          const sc = iouOn(it.lm, pts);
          if (!best || sc > best.score) best = { ang: ai * 45, f, sMul, score: sc, dx: 0, dy: 0 };
        }
      }
    }
    /* 平移细化 */
    let ref = best;
    for (let dy = -2; dy <= 2; dy += 0.5) {
      for (let dx = -2; dx <= 2; dx += 0.5) {
        const tpl = L.LOCAL[it.cl.id].map(v => L.rot(v, best.ang + dd, best.f));
        const pts = tpl.map(v => [v[0] * u * best.sMul + it.mx + dx, v[1] * u * best.sMul + it.my + dy]);
        const sc = iouOn(it.lm, pts);
        if (sc > ref.score) ref = { ...best, score: sc, dx, dy };
      }
    }
    /* 去旋转：位置绕图形中心转 -δ，角度扣 δ */
    const a = -dd * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    const px0 = it.mx + (ref.dx || 0) - c0.x, py0 = it.my + (ref.dy || 0) - c0.y;
    pieces.push({
      id: it.cl.id, ang: ref.ang, f: ref.f,
      cx: px0 * ca - py0 * sa + c0.x,
      cy: px0 * sa + py0 * ca + c0.y,
      score: ref.score, areaU: it.p.n / (u * u)
    });
  }

  const scMin = Math.min(...pieces.map(p => p.score));
  const ok = scMin > 0.9;
  console.log((ok ? 'OK ' : 'XX ') + name.padEnd(2) + ' δ=' + dd.toFixed(2) + '° u=' + u.toFixed(2) + ' IoU最低' + scMin.toFixed(3));
  pieces.forEach(p => console.log('    ' + p.id.padEnd(2) + ' a=' + String(p.ang).padStart(3) + ' f=' + (p.f ? 1 : 0) +
    ' IoU=' + p.score.toFixed(3) + ' 面积' + p.areaU.toFixed(2) + 'u² 质心 ' + p.cx.toFixed(1) + ',' + p.cy.toFixed(1)));
  RESULT.push({ name, u, delta: dd, cxPx: c0.x, cyPx: c0.y, pieces: pieces.map(p => ({ id: p.id, ang: p.ang, f: p.f, cx: p.cx, cy: p.cy, score: p.score })) });
});

fs.writeFileSync(path.join(__dirname, 'zodiac_fit.json'), JSON.stringify(RESULT, null, 1));
console.log('\n完成 ' + RESULT.length + ' 个');
