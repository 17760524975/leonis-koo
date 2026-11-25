/* 按「颜色 → 板件」固定映射，从参考图解析 12 个生肖造型
 * ---------------------------------------------------------------
 * 用户给定的映射：
 *   红  #e40414 → 大三角形 T1
 *   淡黄 #fcec04 → 大三角形 T2
 *   深黄(橙) #f49404 → 正方形 S
 *   粉  #f44cf4 → 小三角形 T4
 *   紫  #8c2cdc → 小三角形 T5
 *   绿  #44fc44 → 中号三角形 T3
 *   蓝  #2cd4fc → 平行四边形 P
 *
 * 一色一块，且板间无描边，所以「按调色板分类 + 连通域」恰好得到 7 块，
 * 板件身份直接由颜色确定，只需要拟合「角度 / 翻转 / 质心」。
 * 角度用「板边方向 + 长度」匹配（与缩放无关，比 IoU 稳），质心用多边形面积质心。
 *
 * 输出 tools/zodiac/zodiac_raw.json
 */
const fs = require('fs');
const path = require('path');
const { decodePNG, px } = require('./png.js');
const L = require('./lib.js');

const img = decodePNG(path.join(__dirname, 'ref.png'));
const W = img.w, H = img.h, N = W * H;

const PAL = [
  { rgb: [228, 4, 20], id: 'T1', name: '红·大三角' },
  { rgb: [252, 236, 4], id: 'T2', name: '淡黄·大三角' },
  { rgb: [244, 148, 4], id: 'S', name: '深黄·正方形' },
  { rgb: [244, 76, 244], id: 'T4', name: '粉·小三角' },
  { rgb: [140, 44, 220], id: 'T5', name: '紫·小三角' },
  { rgb: [68, 252, 68], id: 'T3', name: '绿·中三角' },
  { rgb: [44, 212, 252], id: 'P', name: '蓝·平行四边形' }
];
const AREA_U = { T1: 4, T2: 4, T3: 2, S: 2, T4: 1, T5: 1, P: 2 };

/* ---------- 像素 → 调色板标签 ---------- */
const lab = new Int8Array(N).fill(-1);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const [r, g, b] = px(img, x, y);
    if (r > 238 && g > 238 && b > 238) continue;
    let bi = -1, bd = 1e9;
    for (let i = 0; i < PAL.length; i++) {
      const dr = r - PAL[i].rgb[0], dg = g - PAL[i].rgb[1], db = b - PAL[i].rgb[2];
      const d = dr * dr + dg * dg + db * db;
      if (d < bd) { bd = d; bi = i; }
    }
    if (bd < 9000) lab[y * W + x] = bi;      // 离调色板太远 = 抗锯齿边，丢掉
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

/* ---------- 几何小工具 ---------- */
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
    if (len < 1.2) continue;
    let ang = Math.atan2(dy, dx) * 180 / Math.PI;
    ang = ((ang % 180) + 180) % 180;
    out.push({ ang, len });
  }
  return out;
}
/* 板边方向 ±4°、长度 ±13% 视为匹配，返回匹配总长度占比 */
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
      if (da > 5) continue;
      if (Math.abs(h.len - t.len) / t.len > 0.16) continue;
      const s = 1 - da / 5;
      if (s > bs) { bs = s; bi = i; }
    }
    if (bi >= 0) { used[bi] = 1; sum += t.len; }
  }
  return tot > 0 ? sum / tot : 0;
}

/* ---------- 主流程 ---------- */
function isFigure(o) { return (o.x1 - o.x0) < 400 && (o.y1 - o.y0) < 400 && o.n > 2500; }

/* 先用「全部非白前景」找 12 个图形的范围 */
const fgMask = new Int8Array(N).fill(-1);
for (let i = 0; i < N; i++) if (lab[i] >= 0) fgMask[i] = 0;
const figs = comps(fgMask, 2500).filter(isFigure)
  .map(o => { o.cx = (o.x0 + o.x1) / 2; o.cy = (o.y0 + o.y1) / 2; return o; })
  .sort((a, b) => (Math.round(a.cy / 110) - Math.round(b.cy / 110)) || (a.cx - b.cx));

const NAMES = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
const out = [];
let bad = 0;

figs.forEach((fb, gi) => {
  const name = NAMES[gi] || ('#' + gi);
  /* 该图形范围内的调色板连通域 */
  const mask = new Int8Array(N).fill(-1);
  for (let y = fb.y0; y <= fb.y1; y++) for (let x = fb.x0; x <= fb.x1; x++) {
    const k = y * W + x;
    if (lab[k] >= 0) mask[k] = lab[k];
  }
  const parts = comps(mask, 100);
  /* 同色若被切成两块（几乎不可能），取最大那块 */
  const byId = {};
  for (const p of parts) {
    const id = PAL[p.l].id;
    if (!byId[id] || p.n > byId[id].n) byId[id] = p;
  }
  const totalA = parts.reduce((s, p) => s + p.n, 0);
  const u = Math.sqrt(totalA / 16);
  const pieces = [];
  const miss = [];
  for (const pl of PAL) {
    const p = byId[pl.id];
    if (!p) { miss.push(pl.name); continue; }
    const pts = p.pix.map(k => [k % W, (k / W) | 0]);
    const hp = hull(pts);
    const c = cent(hp);
    const he = edges(hp);
    let best = null;
    for (let ai = 0; ai < 8; ai++) {
      for (const f of [false, true]) {
        const tpl = L.LOCAL[pl.id].map(v => { const r = L.rot(v, ai * 45, f); return [r[0] * u, r[1] * u]; });
        const sc = orientScore(he, edges(tpl));
        if (!best || sc > best.score) best = { ang: ai * 45, f, score: sc };
      }
    }
    pieces.push({ id: pl.id, ang: best.ang, f: best.f, score: best.score, cx: c[0], cy: c[1], areaU: p.n / (u * u) });
  }
  const scMin = Math.min(...pieces.map(p => p.score));
  const ok = !miss.length && pieces.length === 7 && scMin > 0.75;
  if (!ok) bad++;
  console.log((ok ? 'OK ' : 'XX ') + name.padEnd(2) + ' 块' + pieces.length + ' u=' + u.toFixed(2) + 'px' +
    ' 方向吻合最低' + scMin.toFixed(2) + (miss.length ? ' 缺:' + miss.join('/') : ''));
  pieces.forEach(p => console.log('    ' + p.id.padEnd(2) + ' a=' + String(p.ang).padStart(3) + ' f=' + (p.f ? 1 : 0) +
    ' 吻合' + p.score.toFixed(2) + ' 面积' + p.areaU.toFixed(2) + 'u²(应' + AREA_U[p.id] + ')  质心 ' + p.cx.toFixed(1) + ',' + p.cy.toFixed(1)));
  out.push({ name, u, cxFig: (fb.x0 + fb.x1) / 2, cyFig: (fb.y0 + fb.y1) / 2, pieces });
});

fs.writeFileSync(path.join(__dirname, 'zodiac_raw.json'), JSON.stringify(out, null, 1));
console.log('\n图形 ' + out.length + ' 个，不合格 ' + bad);
