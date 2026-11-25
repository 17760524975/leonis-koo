/* 从参考图「量」出生肖七巧板：12 个图形 × 7 块
 * ---------------------------------------------------------------
 * 参考图（知乎 @老顽童 生肖七巧板）是标准七巧板画的：每个图形总像素
 * 约 5900，正好 16u²（u ≈ 19.2px），所以逐块拟合是可行的。
 *
 * 步骤：
 *   1) 非白前景做 4 邻连通域 → 12 个图形（另有 2 条边框噪声，按像素数滤掉）
 *   2) 图形内按「色相 bucket」分连通域 → 每块板（板与板之间有黑描边，天然隔开）
 *   3) 每块取凸包 → 与 7 种标准板型做 8 角度 × 2 翻转的 IoU 拟合（缩放锁死为 u）
 *   4) 检查：每图 7 块、7 种板型各出现一次、iou 达标
 * 输出 tools/zodiac/zodiac_raw.json
 */
const fs = require('fs');
const path = require('path');
const { decodePNG, px } = require('./png.js');
const L = require('./lib.js');

const img = decodePNG(path.join(__dirname, 'ref.png'));
const W = img.w, H = img.h;
const IDS = ['T1', 'T2', 'T3', 'S', 'T4', 'T5', 'P'];
const AREA_U = { T1: 4, T2: 4, T3: 2, S: 2, T4: 1, T5: 1, P: 2 };

/* ---------- 像素着色 ---------- */
const N = W * H;
const fg = new Uint8Array(N);
const hue = new Int8Array(N).fill(-1);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const [r, g, b] = px(img, x, y);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (r > 238 && g > 238 && b > 238) continue;                 // 白底
    fg[y * W + x] = 1;
    if (mx < 110) continue;                                      // 黑描边
    const d = mx - mn;
    if (mx === 0 || d / mx < 0.25) continue;                     // 灰（抗锯齿）
    let h;
    if (mx === r) h = ((g - b) / d + 6) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    hue[y * W + x] = Math.round(h * 60) % 360;
  }
}

function comps(mask, minPx) {
  const seen = new Uint8Array(N), out = [];
  for (let i = 0; i < N; i++) {
    if (seen[i] || mask[i] < 0) continue;
    const b0 = mask[i];
    const st = [i]; seen[i] = 1;
    const pix = [];
    let sx = 0, sy = 0, x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
    while (st.length) {
      const k = st.pop(); pix.push(k);
      const x = k % W, y = (k / W) | 0;
      sx += x; sy += y;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (let t = 0; t < 4; t++) {
        let j = t === 0 ? k - 1 : t === 1 ? k + 1 : t === 2 ? k - W : k + W;
        if (t === 0 && x === 0) continue;
        if (t === 1 && x === W - 1) continue;
        if (j < 0 || j >= N || seen[j] || mask[j] !== b0) continue;
        seen[j] = 1; st.push(j);
      }
    }
    if (pix.length >= minPx) out.push({ b: b0, pix, n: pix.length, cx: sx / pix.length, cy: sy / pix.length, x0, x1, y0, y1 });
  }
  return out;
}

/* 前景连通域 → 12 个图形 */
const blobs = comps(fg, 2500)
  .filter(o => (o.x1 - o.x0) < 400 && (o.y1 - o.y0) < 400)
  .sort((a, b) => (Math.round(a.cy / 110) - Math.round(b.cy / 110)) || (a.cx - b.cx));

/* ---------- 凸包 / 面积 / IoU ---------- */
function hull(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  lo.pop(); up.pop();
  return lo.concat(up);
}
const area = p => { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; };
function clip(sub, c) {
  let out = sub;
  for (let i = 0; i < c.length && out.length; i++) {
    const a = c[i], b = c[(i + 1) % c.length];
    const side = p => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    const inp = out; out = [];
    for (let j = 0; j < inp.length; j++) {
      const cur = inp[j], nx = inp[(j + 1) % inp.length];
      const sc = side(cur), sn = side(nx);
      if (sc >= 0) out.push(cur);
      if ((sc > 0 && sn < 0) || (sc < 0 && sn > 0)) {
        const t = sc / (sc - sn);
        out.push([cur[0] + (nx[0] - cur[0]) * t, cur[1] + (nx[1] - cur[1]) * t]);
      }
    }
  }
  return out;
}
const iou = (A, B) => { const it = area(clip(A, B)); const u = area(A) + area(B) - it; return u > 0 ? it / u : 0; };

/* ---------- 逐块拟合（缩放锁在 u 附近 ±6%，角度只取 45° 整数倍） ---------- */
function fit(hullPts, upx) {
  const n = hullPts.length;
  let cx = 0, cy = 0; hullPts.forEach(p => { cx += p[0]; cy += p[1]; }); cx /= n; cy /= n;
  const A = area(hullPts);
  let best = null;
  for (const id of IDS) {
    const tpl = L.LOCAL[id].map(v => [v[0] * upx, v[1] * upx]);
    for (const s of [0.94, 0.97, 1.0, 1.03, 1.06]) {
      for (let ai = 0; ai < 8; ai++) {
        for (const f of [false, true]) {
          const poly = tpl.map(v => { const r = L.rot(v, ai * 45, f); return [r[0] * s + cx, r[1] * s + cy]; });
          const v = iou(poly, hullPts);
          if (!best || v > best.iou) best = { id, ang: ai * 45, f, s, iou: v, cx, cy, areaPx: A };
        }
      }
    }
  }
  return best;
}

const NAMES = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
const out = [];
let bad = 0;

blobs.forEach((bg, gi) => {
  const name = NAMES[gi] || ('#' + gi);
  /* 该图形范围内的色相掩膜 */
  const mask = new Int8Array(N).fill(-1);
  for (const k of bg.pix) mask[k] = hue[k];
  const pieces = comps(mask, 120);
  const sumA = bg.n;
  const upx = Math.sqrt(sumA / 16);
  const pieces2 = pieces.map(p => {
    const pts = p.pix.map(k => [k % W, (k / W) | 0]);
    const h = hull(pts);
    return { h, ...fit(h, upx) };
  }).filter(p => p.iou > 0.55);

  const used = pieces2.map(p => p.id);
  const uniq = new Set(used);
  const ok = pieces2.length === 7 && uniq.size === 7 && pieces2.every(p => p.iou > 0.82);
  if (!ok) bad++;
  console.log((ok ? 'OK ' : 'XX ') + name.padEnd(2) + ' 块' + pieces2.length +
    ' 板型唯一' + uniq.size + ' u=' + upx.toFixed(2) + 'px  总 ' + sumA + 'px');
  pieces2.forEach(p => console.log('    ' + p.id.padEnd(2) + ' iou=' + p.iou.toFixed(3) +
    ' a=' + String(p.ang).padStart(3) + ' f=' + (p.f ? 1 : 0) + ' s=' + p.s.toFixed(3) +
    ' 面积u²=' + (p.areaPx / (upx * upx)).toFixed(2) + ' 应=' + AREA_U[p.id]));

  out.push({
    name, upx,
    cxFig: pieces2.reduce((s, p) => s + p.cx, 0) / pieces2.length,
    cyFig: pieces2.reduce((s, p) => s + p.cy, 0) / pieces2.length,
    pieces: pieces2.map(p => ({ id: p.id, ang: p.ang, f: p.f, cx: p.cx, cy: p.cy, iou: p.iou }))
  });
});

fs.writeFileSync(path.join(__dirname, 'zodiac_raw.json'), JSON.stringify(out, null, 1));
console.log('\n图形 ' + out.length + ' 个，不合格 ' + bad + ' 个');
