/* v0.50：给字母关「内部裂缝」生成补缝块（gapFill）
 *
 * 背景：26 个字母里 H/G/F/I/V/K/Y 这几个的标准解本身在字母内部留了 17~56 世界单位的
 * 细长裂缝（板件按参考插画拟合，不是严格铺满）。屏幕上 20 单位≈6.6pt，肉眼就是一条白线。
 * 几何上收缝会把已经贴好的邻接关系全拽乱（实测 19 个干净字母会被拽坏），
 * 所以在渲染层补：沿裂缝生成若干小四边形，刷上邻板的颜色，等于「把缝让给某一块板」。
 *
 * 输出 js/levels.js 的 gapFill：[{ a:'T2', pts:[[x,y]..] }]   （pts 已按 3 位小数圆整）
 * 用法：
 *   node tools/make_gap_patches.js            # 体检
 *   node tools/make_gap_patches.js --write    # 写回
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
require(path.join(ROOT, 'js', 'geom.js'));
require(path.join(ROOT, 'js', 'levels.js'));
const G = globalThis.TANGRAM_GEOM;
const S = globalThis.TANGRAM_SETS.tangram7;
const RL = require('./repair_letters.js');

const WRITE = process.argv.indexOf('--write') >= 0;
const r3 = v => Math.round(v * 1000) / 1000;
const GAP_MAX = 62;      // 超过这个距离不算「裂缝」
const GAP_MIN = 1.2;     // 小于这个距离渲染层本来就看不见
const STEPT = 28;        // 沿裂缝方向的补块步长
const WIN = 26;          // 非平行情形下取最近点两侧各多长

function edgesOf(poly) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L < 1e-6) continue;
    out.push({ a, b, ux: (b[0] - a[0]) / L, uy: (b[1] - a[1]) / L, L });
  }
  return out;
}
function projOn(e, v) { return (v[0] - e.a[0]) * e.ux + (v[1] - e.a[1]) * e.uy; }
function at(e, t) { return [e.a[0] + e.ux * t, e.a[1] + e.uy * t]; }

/* 4 点凸包（最多 4 个点，直接算） */
function hull4(pts) {
  const P = pts.slice().sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [], upper = [];
  for (const p of P) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 1e-9) lower.pop();
    lower.push(p);
  }
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 1e-9) upper.pop();
    upper.push(p);
  }
  upper.pop(); lower.pop();
  const h = lower.concat(upper);
  return h.length >= 3 ? h : null;
}

/* 一对板之间的补块 */
function patchesFor(A, B) {
  const EA = edgesOf(A), EB = edgesOf(B);
  /* 找最近的一对边（点到线段距离） */
  let best = null;
  for (const e1 of EA) {
    for (const e2 of EB) {
      for (const [p, e] of [[e1.a, e2], [e1.b, e2], [e2.a, e1], [e2.b, e1]]) {
        const t = Math.max(0, Math.min(1, projOn(e, p) / e.L));
        const q = at(e, t * e.L);
        const d = Math.hypot(p[0] - q[0], p[1] - q[1]);
        if (!best || d < best.d) best = { d, e1, e2, pa: p, pb: q };
      }
    }
  }
  if (!best) return [];
  const { d, e1, e2 } = best;
  if (d < GAP_MIN || d > GAP_MAX) return [];
  const cr = Math.abs(e1.ux * e2.uy - e1.uy * e2.ux);
  const quads = [];
  if (cr < 0.06) {
    /* 平行：沿 e1 方向一段段铺 */
    const ux = e1.ux, uy = e1.uy;
    const t2 = [projOn(e1, e2.a), projOn(e1, e2.b)].sort((x, y) => x - y);
    let lo = Math.max(0, t2[0]), hi = Math.min(e1.L, t2[1]);
    /* 只认「又长又窄」的内部裂缝：重叠跨度 ≥ 50 才算，否则是字母自己的凹口 */
    if (hi - lo < 50) return [];
    for (let t = lo; t < hi - 1e-6; t += STEPT) {
      const t1 = Math.min(hi, t + STEPT);
      const A0 = at(e1, t), A1 = at(e1, t1);
      const B0 = [e2.a[0] + ux * (t - projOn(e1, e2.a)), e2.a[1] + uy * (t - projOn(e1, e2.a))];
      const B1 = [e2.a[0] + ux * (t1 - projOn(e1, e2.a)), e2.a[1] + uy * (t1 - projOn(e1, e2.a))];
      const h = hull4([A0, A1, B0, B1]);
      if (h) quads.push(h);
    }
  } else {
    /* 斜交（45° 楔口）：只有很窄的（≤24）才补，宽的就是字母自己的凹口，补了等于往外长肉 */
    if (d > 26) return [];
    const W2 = 9;   // 楔口只补「最窄处」一小片，窗口再大就会啃到板身上
    const A0 = at(e1, Math.max(0, projOn(e1, best.pa) - W2));
    const A1 = at(e1, Math.min(e1.L, projOn(e1, best.pa) + W2));
    const B0 = at(e2, Math.max(0, projOn(e2, best.pb) - W2));
    const B1 = at(e2, Math.min(e2.L, projOn(e2, best.pb) + W2));
    const h = hull4([A0, A1, B0, B1]);
    if (h) quads.push(h);
  }
  /* 丢掉压到板身上的（>5 就说明压上去了，会盖住板的边） */
  return quads.filter(q => G.convexOverlapArea(q, A) < 5 && G.convexOverlapArea(q, B) < 5);
}

const out = {};
let total = 0, lvHit = 0;
S.levels.forEach(lv => {
  if (!/^[A-Z]$/.test(lv.name)) return;   // 只处理字母关（几何关的「缝」都是设计上的凹口）
  const P = lv.solution.map(st => ({ id: st.id, poly: RL.polyOf(st) }));
  const patches = [];
  for (let i = 0; i < P.length; i++) {
    for (let j = i + 1; j < P.length; j++) {
      if (G.convexOverlapArea(P[i].poly, P[j].poly) > 1) continue;
      const qs = patchesFor(P[i].poly, P[j].poly);
      if (!qs.length) continue;
      /* 颜色取「离补块更近的那块板」，看上去像是那块板的延伸 */
      for (const q of qs) {
        const cq = [q.reduce((s, v) => s + v[0], 0) / q.length, q.reduce((s, v) => s + v[1], 0) / q.length];
        const cA = [P[i].poly.reduce((s, v) => s + v[0], 0) / P[i].poly.length, P[i].poly.reduce((s, v) => s + v[1], 0) / P[i].poly.length];
        const cB = [P[j].poly.reduce((s, v) => s + v[0], 0) / P[j].poly.length, P[j].poly.reduce((s, v) => s + v[1], 0) / P[j].poly.length];
        const id = Math.hypot(cq[0] - cA[0], cq[1] - cA[1]) <= Math.hypot(cq[0] - cB[0], cq[1] - cB[1]) ? P[i].id : P[j].id;
        patches.push({ a: id, pts: q });
      }
    }
  }
  if (patches.length) { lvHit++; total += patches.length; out[lv.id] = patches; }
  if (patches.length) {
    console.log(String(lv.id).padStart(2), (lv.name + '').padEnd(6), patches.length + ' 块',
      '面积合计 ' + patches.reduce((s, p) => s + Math.abs(G.area(p.pts)), 0).toFixed(0));
  }
});
console.log('\n共 ' + total + ' 块，涉及 ' + lvHit + ' / ' + S.levels.length + ' 关');

if (!WRITE) { console.log('（未加 --write）'); process.exit(0); }

const file = path.join(ROOT, 'js', 'levels.js');
let src = fs.readFileSync(file, 'utf8');
const at0 = src.indexOf('var LEVELS7 = ');
const open = src.indexOf('[', at0);
let depth = 0, close = open;
for (let i = open; i < src.length; i++) {
  const c = src[i];
  if (c === '[') depth++;
  else if (c === ']') { depth--; if (depth === 0) { close = i + 1; break; } }
}
const arr = JSON.parse(src.slice(open, close));
let n = 0;
for (const lv of arr) {
  const ps = out[lv.id] || [];
  if (ps.length) {
    lv.gapFill = ps.map(p => ({ a: p.a, pts: p.pts.map(v => [r3(v[0]), r3(v[1])]) }));
    n++;
  } else delete lv.gapFill;
}
src = src.slice(0, open) + JSON.stringify(arr, null, 2) + src.slice(close);
fs.writeFileSync(file, src);
console.log('已写回 js/levels.js：' + n + ' 关带 gapFill');
