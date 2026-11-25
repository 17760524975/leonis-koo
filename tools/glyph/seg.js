/* 字母参考图（知乎 @老顽童 字母七巧板）的版面切分
 * ---------------------------------------------------------------
 * 参考图 tools/glyph/ref.png 是 800×616 的位图：4 行字母（7/7/7/5），
 * 每块板之间有一条 1~2px 的浅色缝，所以同一字母的七块板在连通域上是分开的。
 *
 * 这里做三件事：
 *   1) 按色相把像素分成 7 类（颜色 → 板件 id 的映射由用户给定）
 *   2) 按行投影找 4 条字母带，带内按 x 方向间隙聚合出每个字母
 *   3) 每个字母里按颜色取最大连通域，得到「一块板一个掩膜」
 */
const path = require('path');
const { decodePNG, px } = require('../zodiac/png.js');

/* 颜色 → 板件。用户给的映射：
 *   蓝色 / 粉色 → 大三角（T1 / T2）
 *   绿色        → 正方形（S）
 *   深红 / 深黄 → 小三角（T4 / T5）
 *   淡黄        → 中三角（T3）
 *   紫色        → 平行四边形（P） */
const CLASSES = [
  { id: 'T1', name: '蓝·大三角', lo: 168, hi: 212 },
  { id: 'T3', name: '淡黄·中三角', lo: 45, hi: 66 },
  { id: 'S', name: '绿·正方形', lo: 66, hi: 105 },
  { id: 'T5', name: '深黄·小三角', lo: 20, hi: 45 },
  { id: 'P', name: '紫·平行四边形', lo: 236, hi: 276 },
  { id: 'T2', name: '粉·大三角', lo: 278, hi: 330 },
  { id: 'T4', name: '深红·小三角', lo: 330, hi: 20 }
];

const AREA_U = { T1: 4, T2: 4, T3: 2, S: 2, P: 2, T4: 1, T5: 1 };   // 每块板的面积（u²）

function hueOf(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (d < 10) return -1;
  let h;
  if (mx === r) h = ((g - b) / d + 6) % 6;
  else if (mx === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return h * 60;
}
function clsOf(h) {
  if (h < 0) return -1;
  for (let i = 0; i < CLASSES.length; i++) {
    const c = CLASSES[i];
    if (c.lo < c.hi ? (h >= c.lo && h < c.hi) : (h >= c.lo || h < c.hi)) return i;
  }
  return -1;
}

function load(file) {
  const img = decodePNG(file || path.join(__dirname, 'ref.png'));
  const W = img.w, H = img.h, N = W * H;
  const lab = new Int8Array(N).fill(-1);
  const fg = new Uint8Array(N);
  const rowCnt = new Int32Array(H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const [r, g, b] = px(img, x, y);
    if (r > 236 && g > 236 && b > 236) continue;
    fg[y * W + x] = 1;
    rowCnt[y]++;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx < 90) continue;
    if (mx - mn < 40) continue;               // 灰缝 / 抗锯齿边
    const c = clsOf(hueOf(r, g, b));
    if (c >= 0) lab[y * W + x] = c;
  }
  return { img, W, H, N, lab, fg, rowCnt };
}

function comps(mask, W, H, minPx) {
  const N = W * H, seen = new Uint8Array(N), out = [];
  for (let i = 0; i < N; i++) {
    if (seen[i] || mask[i] < 0) continue;
    const l0 = mask[i];
    const st = [i]; seen[i] = 1;
    const pix = [];
    let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
    while (st.length) {
      const k = st.pop(); pix.push(k);
      const x = k % W, y = (k / W) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (let t = 0; t < 4; t++) {
        const j = t === 0 ? k - 1 : t === 1 ? k + 1 : t === 2 ? k - W : k + W;
        if (t === 0 && x === 0) continue;
        if (t === 1 && x === W - 1) continue;
        if (j < 0 || j >= N || seen[j] || mask[j] !== l0) continue;
        seen[j] = 1; st.push(j);
      }
    }
    if (pix.length >= minPx) out.push({ l: l0, pix, n: pix.length, x0, x1, y0, y1 });
  }
  return out;
}

/* ---------- 版面切分 ---------- */
const NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
const ROW_COUNT = [7, 7, 7, 5];

function segment(src) {
  const { W, H, lab, rowCnt } = src;
  /* 行带：行投影 > 0 的连续段，太矮的丢掉（噪点） */
  const bands = [];
  let s = -1;
  for (let y = 0; y <= H; y++) {
    const on = y < H && rowCnt[y] > 2;
    if (on && s < 0) s = y;
    /* 只保留高度 > 40 的带：右下角「知乎 @老顽童」水印只有 23px 高，会被丢掉 */
    if (!on && s >= 0) { if (y - s > 40) bands.push([s, y - 1]); s = -1; }
  }
  if (bands.length !== 4) throw new Error('行带数 ' + bands.length + '（应为 4）');

  const letters = [];
  bands.forEach(([y0, y1], bi) => {
    const mask = new Int8Array(W * H).fill(-1);
    for (let y = y0; y <= y1; y++) for (let x = 0; x < W; x++) if (lab[y * W + x] >= 0) mask[y * W + x] = lab[y * W + x];
    const parts = comps(mask, W, H, 40);
    /* 按 x 聚合成字母：同一字母的板 x 区间会重叠或只隔 1~3px */
    parts.sort((a, b) => a.x0 - b.x0);
    const groups = [];
    for (const p of parts) {
      const g = groups[groups.length - 1];
      if (g && p.x0 <= g.x1 + 9) {
        g.items.push(p);
        g.x1 = Math.max(g.x1, p.x1);
        g.y0 = Math.min(g.y0, p.y0);
        g.y1 = Math.max(g.y1, p.y1);
      } else groups.push({ x0: p.x0, x1: p.x1, y0: p.y0, y1: p.y1, items: [p] });
    }
    if (groups.length !== ROW_COUNT[bi])
      console.log('!! 第 ' + (bi + 1) + ' 行切出 ' + groups.length + ' 个（期望 ' + ROW_COUNT[bi] + '）');
    groups.forEach(g => letters.push({ ...g, row: bi }));
  });
  if (letters.length !== 26) throw new Error('字母数 ' + letters.length + '（应为 26）');
  letters.forEach((g, i) => { g.name = NAMES[i]; });
  return letters;
}

/* 每块板取该色最大连通域 */
function piecesOf(src, g) {
  const { W, H, lab } = src;
  const mask = new Int8Array(W * H).fill(-1);
  for (let y = Math.max(0, g.y0 - 2); y <= g.y1 + 2; y++)
    for (let x = Math.max(0, g.x0 - 2); x <= g.x1 + 2; x++) {
      const k = y * W + x;
      if (lab[k] >= 0) mask[k] = lab[k];
    }
  const parts = comps(mask, W, H, 60);
  const byCls = {};
  for (const p of parts) if (!byCls[p.l] || p.n > byCls[p.l].n) byCls[p.l] = p;
  return CLASSES.map((c, ci) => byCls[ci] ? { cl: c, p: byCls[ci] } : null);
}

module.exports = { CLASSES, AREA_U, load, comps, segment, piecesOf, hueOf, clsOf };
