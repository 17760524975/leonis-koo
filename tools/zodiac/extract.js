/* 从参考图里「量」出每块七巧板的位置
 * ---------------------------------------------------------------
 * 步骤：解码 PNG → 按色相分割成色块 → 每块取凸包（七块板都是凸的）→
 *       用 7 种标准板型做 8 角度 × 2 翻转的 IoU 拟合 → 得到 { id, x, y, angle, flipped }
 * 这样关卡造型就等于参考图本身，不会「摆歪」。
 */
const path = require('path');
const { decodePNG, px } = require('./png.js');
const L = require('./lib.js');

const IMG = path.join(__dirname, 'ref.png');
const img = decodePNG(IMG);

function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const l = (mx + mn) / 2, d = mx - mn;
  let h = 0, s = 0;
  if (d > 1e-9) {
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}

function bucket(r, g, b) {
  const [h, s, l] = rgb2hsl(r, g, b);
  if (s < 0.35 || l < 0.18) return -1;          // 白/灰/黑描边
  if (h < 15 || h >= 345) return 0;             // 红
  if (h < 45) return 1;                          // 橙
  if (h < 70) return 2;                          // 黄
  if (h < 160) return 3;                         // 绿
  if (h < 200) return 4;                         // 青
  if (h < 240) return 5;                         // 蓝
  if (h < 290) return 6;                         // 紫
  return 7;                                      // 品红/粉
}

/* ---------- 色块分割 ---------- */
const W = img.w, H = img.h;
const lab = new Int8Array(W * H).fill(-1);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const [r, g, b] = px(img, x, y);
  lab[y * W + x] = bucket(r, g, b);
}

function components() {
  const seen = new Uint8Array(W * H);
  const out = [];
  const stack = [];
  for (let i = 0; i < W * H; i++) {
    if (seen[i] || lab[i] < 0) continue;
    const b0 = lab[i];
    if (b0 < 0) continue;
    let x0 = i % W, y0 = (i / W) | 0;
    if (y0 > 500) continue;                    // 底部水印区直接跳过
    const pts = [];
    stack.length = 0; stack.push(i); seen[i] = 1;
    while (stack.length) {
      const k = stack.pop();
      pts.push(k);
      const x = k % W, y = (k / W) | 0;
      const nb = [k - 1, k + 1, k - W, k + W];
      for (let t = 0; t < 4; t++) {
        const j = nb[t];
        if (j < 0 || j >= W * H || seen[j]) continue;
        if (t === 0 && x === 0) continue;
        if (t === 1 && x === W - 1) continue;
        if (lab[j] !== b0) continue;
        seen[j] = 1; stack.push(j);
      }
    }
    if (pts.length < 120) continue;
    out.push({ bucket: b0, pts });
  }
  return out;
}

function hull(points) {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  const up = [];
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  lo.pop(); up.pop();
  return lo.concat(up);
}

function polyArea(p) {
  let s = 0;
  for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; }
  return Math.abs(s) / 2;
}
function clipConvex(sub, clip) {
  let out = sub;
  for (let i = 0; i < clip.length && out.length; i++) {
    const a = clip[i], b = clip[(i + 1) % clip.length];
    const side = p => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    const inp = out; out = [];
    for (let j = 0; j < inp.length; j++) {
      const cur = inp[j], nxt = inp[(j + 1) % inp.length];
      const sc = side(cur), sn = side(nxt);
      if (sc >= 0) out.push(cur);
      if ((sc > 0 && sn < 0) || (sc < 0 && sn > 0)) {
        const t = sc / (sc - sn);
        out.push([cur[0] + (nxt[0] - cur[0]) * t, cur[1] + (nxt[1] - cur[1]) * t]);
      }
    }
  }
  return out;
}
function iou(A, B) {
  const inter = polyArea(clipConvex(A, B));
  const ua = polyArea(A) + polyArea(B) - inter;
  return ua > 0 ? inter / ua : 0;
}

/* ---------- 拟合 ---------- */
const IDS = ['T1', 'T2', 'T3', 'S', 'T4', 'T5', 'P'];

function fitPiece(hullPts) {
  const n = hullPts.length;
  const cx = hullPts.reduce((s, p) => s + p[0], 0) / n;
  const cy = hullPts.reduce((s, p) => s + p[1], 0) / n;
  const A = polyArea(hullPts);
  let best = null;
  for (const id of IDS) {
    const tpl = L.LOCAL[id];
    const At = Math.abs(L.polyArea(tpl));
    const s0 = Math.sqrt(A / At);
    for (const ds of [0.97, 1.0, 1.03]) {
      const s = s0 * ds;
      for (let ai = 0; ai < 8; ai++) {
        const ang = ai * 45;
        for (const f of [false, true]) {
          const poly = tpl.map(v => {
            const r = L.rot(v, ang, f);
            return [r[0] * s + cx, r[1] * s + cy];
          });
          const v = iou(poly, hullPts);
          if (!best || v > best.iou) best = { id, ang, f, iou: v, s, cx, cy, area: A };
        }
      }
    }
  }
  return { best, hullPts, cx, cy, A };
}

/* ---------- 分组成 12 个图形（色块两两最近距离做并查集） ---------- */
const comps = components();
const info = comps.map(c => {
  const pts = c.pts.map(k => [k % W, (k / W) | 0]);
  const h = hull(pts);
  const fit = fitPiece(h);
  return { bucket: c.bucket, n: c.pts.length, hull: h, ...fit };
}).filter(it => it.A > 400);          // 滤掉抗锯齿碎片

function hullDist(A, B) {             // 两个凸包最近点距（用顶点到对方边）
  const d2 = (p, q) => [q[0] - p[0], q[1] - p[1]];
  const segD = (p, a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
    let t = L2 > 0 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2 : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p[0] - (a[0] + dx * t), p[1] - (a[1] + dy * t));
  };
  let m = Infinity;
  for (let i = 0; i < A.length; i++) for (let j = 0; j < B.length; j++) {
    m = Math.min(m, segD(A[i], B[j], B[(j + 1) % B.length]));
    m = Math.min(m, segD(B[j], A[i], A[(i + 1) % A.length]));
  }
  return m;
}

const par = info.map((_, i) => i);
const find = i => par[i] === i ? i : (par[i] = find(par[i]));
const uni = (a, b) => { a = find(a); b = find(b); if (a !== b) par[a] = b; };
for (let i = 0; i < info.length; i++) for (let j = i + 1; j < info.length; j++) {
  if (hullDist(info[i].hull, info[j].hull) < 18) uni(i, j);
}
const byRoot = new Map();
info.forEach((it, i) => {
  const r = find(i);
  if (!byRoot.has(r)) byRoot.set(r, []);
  byRoot.get(r).push(it);
});

const ZODIAC = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
let groups = [...byRoot.values()].filter(g => g.length >= 5);
/* 按阅读顺序（先 y 后 x）排序 */
groups.sort((a, b) => {
  const ya = a.reduce((s, q) => s + q.cy, 0) / a.length, yb = b.reduce((s, q) => s + q.cy, 0) / b.length;
  if (Math.abs(ya - yb) > 45) return ya - yb;
  const xa = a.reduce((s, q) => s + q.cx, 0) / a.length, xb = b.reduce((s, q) => s + q.cx, 0) / b.length;
  return xa - xb;
});

console.log('色块', info.length, '→ 图形', groups.length);
groups.forEach((g, gi) => {
  const name = ZODIAC[gi] || ('#' + gi);
  const sum = g.reduce((s, q) => s + q.A, 0);
  const uPx = Math.sqrt(sum / 16);
  console.log('\n=== ' + name + '  ' + g.length + ' 块  1u=' + uPx.toFixed(2) + 'px');
  g.forEach(q => {
    const bb = q.best;
    console.log('  ' + bb.id.padEnd(2), 'iou=' + bb.iou.toFixed(3), 'a=' + String(bb.ang).padStart(3),
      'f=' + (bb.f ? 1 : 0), 'u²=' + (q.A / (uPx * uPx)).toFixed(2), 'v=' + q.hull.length);
  });
});
