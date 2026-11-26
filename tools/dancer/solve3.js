/* 舞者关卡反解 · 主流程 v3（定稿）
 * ==================================================================
 * 输入：tools/dancer/ref.png（10 个舞者图案，2 行 5 列）
 * 输出：tools/dancer/dancers_exact.json
 *
 * 流程
 * ----
 *  1. HSV 分割 → 每个色块对 5 种板型各求最优拟合（8 个 45° 角 x 2 翻面）
 *  2. 全局形状指派：硬约束「2 大 / 1 中 / 1 方 / 2 小 / 1 平」，全枚举取总 IoU 最大
 *  3. 去压叠：解里有压叠 = 这关不可解，把压得最狠的一对推开（且不许推出着色剪影）
 *  4. 边线族对齐（snapLines）：七巧板的边只有 4 个方向，把每条边的法向偏移按族聚类、
 *     再对每块板解 2x2 最小二乘 —— 位移只有 0.005~0.03 单位，姿势不动，边严丝合缝。
 *     对齐会顺带让个别板压到一起，所以和对齐交替做 6 轮
 *  5. 剪影：外扩 d 求并集（把 1~3 单位的板间白缝焊上、把「角接触」的环连起来），
 *     再内缩到 keep=1.5~3.5 世界单位的余量
 *  6. 整形：killNeedles（削零宽针）→ fillSlits（填窄口凹缝）→ smoothShort（收短边，
 *     每删一点都验「不自交 + 七块仍在轮廓里」），三步循环到稳定
 *
 * 走过的弯路（别再重复）
 * ----------------------
 * · 「把拟合位置吸附到精确贴边」：会把板搬动 1.4 单位，姿势全歪 —— 拟合其实已经准到
 *   0.03 单位，问题只是「边线差 0.02」这一层，不需要搬板。
 * · 「共用顶点率」不能当验收线：这些图案大量是「角接触 / T 形接头」，顶点本来就不重合。
 * · tools/zodiac/union.js 在「板与板有 0.02 误差」时会裂环甚至算出自交环，所以这里
 *   用 tools/dancer/union2.js（打断 → 去内部段 → 抵消反向段 → 串环）。
 * · 「把 keep 收到 0.25 单位让剪影完全贴边」：看着漂亮，但缝宽 1~3 单位、内缩后焊缝
 *   宽度 = 2×keep − 缝宽 < 0，缝又露出来，屏幕上就是一道深色细线 —— 缝比那 1.5 单位
 *   的余量显眼得多。keep 必须 ≥ 缝宽/2。
 * · 「在外扩后的环上直接 cleanRing 削台阶」：削 6 单位台阶就要往里切 6 单位，切完板
 *   露头，只好把整圈轮廓再放大 —— 那才是「板没填满轮廓」的真正来源。削台阶必须用
 *   smoothShort：每删一点都验板还在里面。
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { readPng } = require('./pngio.js');
const SEG = require('./seg.js');
const FIT = require('./fit.js');
const SL = require('./snapLines.js');
const OF = require('./offset.js');
const U2 = require('./union2.js');
require(path.join(__dirname, '..', '..', 'js', 'geom.js'));
const G = globalThis.TANGRAM_GEOM;

const IMG = process.argv[2] || path.join(__dirname, 'ref.png');
const U = 96;                        // 世界单位 / base 单位（= dataset.unitScale）

const NAMES = [
  { name: '回眸', tip: '侧身回首 · 单臂上举' },
  { name: '展臂', tip: '双臂张开 · 抬头仰望' },
  { name: '托盘', tip: '双手托举 · 小步前倾' },
  { name: '跃起', tip: '收腿腾空 · 一臂上扬' },
  { name: '垂手', tip: '单腿站立 · 手臂下压' },
  { name: '横踢', tip: '一腿横出 · 上身侧倾' },
  { name: '探海', tip: '俯身探海 · 长腿后伸' },
  { name: '抬腿', tip: '高抬前腿 · 上身直立' },
  { name: '跳跃', tip: '凌空跃起 · 双腿张开' },
  { name: '旋身', tip: '单足旋转 · 裙摆飞扬' }
];
const SHAPES = ['T1', 'T3', 'S', 'T4', 'P'];

function comb(n, k) {
  const out = [], cur = [];
  (function rec(st) {
    if (cur.length === k) { out.push(cur.slice()); return; }
    for (let i = st; i < n; i++) { cur.push(i); rec(i + 1); cur.pop(); }
  })(0);
  return out;
}
const C2 = comb(7, 2);

function allocate(aoi) {
  let best = null;
  for (const big of C2) {
    const r1 = [0, 1, 2, 3, 4, 5, 6].filter(i => big.indexOf(i) < 0);
    for (const mid of r1) {
      const r2 = r1.filter(i => i !== mid);
      for (const sq of r2) {
        const r3 = r2.filter(i => i !== sq);
        for (let a = 0; a < r3.length; a++) {
          for (let b = a + 1; b < r3.length; b++) {
            const sm = [r3[a], r3[b]];
            const pl = r3.filter(i => i !== sm[0] && i !== sm[1]);
            if (pl.length !== 1) continue;
            const sum = aoi[big[0]].T1 + aoi[big[1]].T1 + aoi[mid].T3
              + aoi[sq].S + aoi[sm[0]].T4 + aoi[sm[1]].T4 + aoi[pl[0]].P;
            if (!best || sum > best.sum) {
              const asg = [];
              big.forEach(i => { asg[i] = 'T1'; });
              asg[mid] = 'T3'; asg[sq] = 'S';
              asg[sm[0]] = 'T4'; asg[sm[1]] = 'T4';
              asg[pl[0]] = 'P';
              best = { sum, asg };
            }
          }
        }
      }
    }
  }
  return best;
}

const areaOf = p => U2.areaOf(p);
/* 游戏里「整块落在剪影里」的容差是 3 世界单位，这里按 base 单位折算是 3/96 */
const TOL_IN = 3 / U;
/* cleanRing 的碎边门槛：3.2 世界单位 = 0.33% 棋盘宽，屏上 1px 上下，肉眼看不出来 */
const MIN_EDGE = 3.2 / U;
const r2 = v => Math.round(v * 100) / 100;
const r3 = v => Math.round(v * 1000) / 1000;


/* ---------- 去压叠 ----------
 * 拟合阶段被邻板遮住大半的块，位置会偏，于是两块板叠在一起。游戏里「两块压叠超过这块
 * 板面积的 0.4% 就不许放」，解里有压叠 = 这关不可解，所以必须抹掉。
 * 做法：找出压得最狠的一对，各试 16 个方向、4 档位移，选「压叠归零且自身颜色覆盖率
 * 损失最小」的那个，迭代到压叠 < 0.01 单位²。
 */
function ownCover(pts, mask, s, gx0, gy0) {
  let c = 0, n = 0;
  for (let y = 0; y < mask.bh; y += 3) {
    for (let x = 0; x < mask.bw; x += 3) {
      if (!mask.mask[y * mask.bw + x]) continue;
      n++;
      const u = (mask.bx + x + 0.5 - gx0) / s, v = (mask.by + y + 0.5 - gy0) / s;
      if (U2.inPoly(u, v, pts)) c++;
    }
  }
  return n ? c / n : 0;
}
/* 整幅着色剪影的栅格（膨胀 2px）：去压叠时不允许把板推出图形之外，
 * 否则为了包住这块板，剪影会被迫整体放大一圈，看起来就是「板没填满轮廓」。 */
function silGrid(masks) {
  const set = new Set();
  masks.forEach(m => {
    for (let y = 0; y < m.bh; y++) {
      for (let x = 0; x < m.bw; x++) {
        if (!m.mask[y * m.bw + x]) continue;
        const px = m.bx + x, py = m.by + y;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set.add((py + dy) * 4096 + (px + dx));
      }
    }
  });
  return set;
}
function deoverlap(polys, masks, s, gx0, gy0, opt) {
  opt = opt || {};
  const sil = silGrid(masks);
  const inSil = P => P.every(v => {
    const px = Math.round(v[0] * s + gx0), py = Math.round(v[1] * s + gy0);
    return sil.has(py * 4096 + px);
  });
  const cur = polys.map(p => p.map(v => v.slice()));
  const cov0 = masks.map((m, i) => ownCover(cur[i], m, s, gx0, gy0));
  const DIRS = [];
  for (let k = 0; k < 16; k++) DIRS.push([Math.cos(k * Math.PI / 8), Math.sin(k * Math.PI / 8)]);
  const MAGS = opt.MAGS || [0.04, 0.08, 0.12, 0.18, 0.26];
  let log = 0;
  for (let it = 0; it < 10; it++) {
    let worst = null;
    for (let i = 0; i < cur.length; i++) {
      for (let j = i + 1; j < cur.length; j++) {
        const ov = G.convexOverlapArea(cur[i], cur[j]);
        if (ov > 0.01 && (!worst || ov > worst.ov)) worst = { i, j, ov };
      }
    }
    if (!worst) break;
    const { i, j, ov } = worst;
    let best = null;
    for (const who of [i, j]) {
      const other = who === i ? cur[j] : cur[i];
      for (const d of DIRS) {
        for (const m of MAGS) {
          const P2 = cur[who].map(v => [v[0] + d[0] * m, v[1] + d[1] * m]);
          const nv = G.convexOverlapArea(P2, other);
          if (nv >= ov - 1e-6) continue;
          if (!inSil(P2)) continue;
          const cv = ownCover(P2, masks[who], s, gx0, gy0);
          const sc = -nv * 400 - (cov0[who] - cv) * 40 - m * 0.5;
          if (!best || sc > best.sc) best = { sc, who, P2, nv, m, cv };
        }
      }
    }
    if (!best) break;
    cur[best.who] = best.P2;
    cov0[best.who] = best.cv;
    log = Math.max(log, best.m);
  }
  return { polys: cur, moved: log };
}


/* 轮廓清理：去掉过短边、合并近共线点 */
function cleanRing(pts, minLen, tolDeg) {
  const R = pts.slice();
  let changed = true;
  while (changed && R.length > 4) {
    changed = false;
    for (let i = 0; i < R.length; i++) {
      const n = R.length;
      const a = R[(i - 1 + n) % n], b = R[i], c = R[(i + 1) % n];
      const L1 = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const L2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
      const t1 = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const t2 = Math.atan2(c[1] - b[1], c[0] - b[0]);
      const d = Math.abs(((t2 - t1 + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * 180 / Math.PI;
      if (L1 < minLen || L2 < minLen || d < tolDeg) { R.splice(i, 1); changed = true; break; }
    }
  }
  return R;
}

/* 削掉针状退化尖刺
 * ------------------------------------------------------------------
 * 两块板相邻的两条边几乎重合、只在一端张到 6~8 世界单位的口，并集的边界就会
 * 「出去 270、回来 270」走一条零宽度的针（图 5 两块大三角之间的斜缝就是这样，
 * 肉眼看是一道细黑线）。判据很硬：中间点到两端点的连线距离，远小于两条边长之和。
 * 任何合法的七巧板夹角（45° 起）都不会触发，所以放心削。
 */
function killNeedles(R0, ratio, maxMouth) {
  let R = R0.slice();
  let guard = 0, changed = true, killed = 0;
  while (changed && guard++ < 200 && R.length > 6) {
    changed = false;
    const n = R.length;
    for (let i = 0; i < n; i++) {
      const a = R[(i - 1 + n) % n], b = R[i], c = R[(i + 1) % n];
      const L1 = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const L2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
      const L3 = Math.hypot(c[0] - a[0], c[1] - a[1]);
      if (L1 + L2 < 1e-9 || L3 / (L1 + L2) > ratio || L3 > maxMouth) continue;
      /* 只削掉尖端那个点：轮廓上 a→c 直接连一条等于口宽的短边。
       * 这一步是「把针填实」，面积只增不减，绝不会把板挤到轮廓外。 */
      const R2 = R.slice();
      R2.splice(i, 1);
      if (R2.length < 5) continue;
      R = R2; changed = true; killed++;
      break;
    }
  }
  return { ring: R, killed };
}

/* 填掉细缝（slit）
 * ------------------------------------------------------------------
 * 参考图里每块板之间画了 1~2px 的白色分隔线，反解出来的板因此有 2~3 世界单位的缝；
 * 轮廓内部只要有一条没被外扩盖住的缝，放大看就是一道深色细线（「缝」）。
 * 做法：找一个「口宽 < mouth、两端都是凹点」的凹口，整段用中点代替 —— 填缝只会
 * 增加面积，绝不会把板挤出去，所以不需要验算。
 */
function fillSlits(R0, mouth) {
  let R = R0.slice();
  let guard = 0, changed = true, filled = 0;
  const sgn = (() => {
    let a = 0;
    for (let i = 0; i < R0.length; i++) {
      const p = R0[i], q = R0[(i + 1) % R0.length];
      a += p[0] * q[1] - q[0] * p[1];
    }
    return a >= 0 ? 1 : -1;
  })();
  const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
  while (changed && guard++ < 80 && R.length > 6) {
    changed = false;
    const n = R.length;
    for (let i = 0; i < n && !changed; i++) {
      for (let j = i + 2; j < n; j++) {
        if (i === 0 && j === n - 1) continue;
        const A = R[i], B = R[j];
        const dd = Math.hypot(B[0] - A[0], B[1] - A[1]);
        if (dd > mouth) continue;
        if (cross(R[(i - 1 + n) % n], A, R[(i + 1) % n]) * sgn >= 0) continue;   // i 不凹
        if (cross(R[(j - 1 + n) % n], B, R[(j + 1) % n]) * sgn >= 0) continue;   // j 不凹
        const mid = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
        const R2 = R.slice(0, i).concat([mid], R.slice(j + 1));
        if (R2.length < 6) continue;
        R = R2; changed = true; filled++;
        break;
      }
    }
  }
  return { ring: R, filled };
}

/* 短边/毛刺收口
 * ------------------------------------------------------------------
 * 两块板的边界在稍有不同的位置交接，并集轮廓上就会留下 3~6 世界单位的小毛刺、
 * 小台阶或者 9° 的歪斜短线（v0.52 龙尾、v0.63 竖干那类瑕疵的微缩版）。
 * cleanRing 只会删「明显废点」，这里再补一遍：只要还剩短于 minLen 的边，就试着
 * 把它的端点删掉 —— 但每删一个点都要重算「七块板是否仍整块落在新轮廓里」，
 * 一旦某块板会露头超过 tol 就放弃，绝不为好看把板挤出去。
 */
function isSimple(R) {
  for (let i = 0; i < R.length; i++) {
    for (let j = i + 2; j < R.length; j++) {
      if (i === 0 && j === R.length - 1) continue;
      if (G.segCross(R[i], R[(i + 1) % R.length], R[j], R[(j + 1) % R.length])) return false;
    }
  }
  return true;
}

function smoothShort(R0, polys, minLen, tol) {
  let R = R0.slice();
  let guard = 0, changed = true, cut = 0;
  while (changed && guard++ < 400 && R.length > 6) {
    changed = false;
    for (let i = 0; i < R.length; i++) {
      const n = R.length;
      const a = R[(i - 1 + n) % n], b = R[i], c = R[(i + 1) % n];
      const L1 = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const L2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
      if (L1 >= minLen && L2 >= minLen) continue;
      const R2 = R.slice();
      R2.splice(i, 1);
      if (!isSimple(R2)) continue;
      if (!polys.every(P => G.pieceInside(P, R2, [], tol))) continue;
      R = R2; changed = true; cut++;
      break;
    }
  }
  return { ring: R, cut };
}

function main() {
  const img = readPng(IMG);
  const idx = SEG.colorIndex(img);
  const list = Object.values(SEG.figures(idx, img.w, img.h));
  let px = 0; list.forEach(f => { px += f.n; });
  const s = Math.sqrt(px / (10 * 16));
  console.log('1 单位 ≈', s.toFixed(3), 'px');

  const out = [];
  for (let g = 0; g < 10; g++) {
    const sub = list.filter(f => f.fig === g).sort((a, b) => b.n - a.n).slice(0, 7);
    if (sub.length !== 7) throw new Error('图案 ' + (g + 1) + ' 只找到 ' + sub.length + ' 块');

    let gx0 = 1e9, gy0 = 1e9;
    sub.forEach(f => { gx0 = Math.min(gx0, f.bx); gy0 = Math.min(gy0, f.by); });

    const raw = sub.map(f => {
      const r = FIT.fitPiece(f, s);
      return { n: f.n, color: SEG.HUES[f.color].key, per: r.per, bx: r.bx, by: r.by, mask: f };
    });
    const aoi = raw.map(r => { const o = {}; SHAPES.forEach(k => { o[k] = r.per[k].iou; }); return o; });
    const alloc = allocate(aoi);
    if (!alloc) throw new Error('图案 ' + (g + 1) + ' 形状指派失败');

    const fits = raw.map((r, i) => {
      const shape = alloc.asg[i];
      const c = r.per[shape];
      return {
        key: shape, ang: c.ang, fl: c.fl, iou: c.iou, n: r.n, color: r.color,
        cx: (r.bx + c.cx - gx0) / s,
        cy: (r.by + c.cy - gy0) / s,
        mask: r.mask
      };
    });

    const big = fits.filter(f => f.key === 'T1').sort((a, b) => b.n - a.n);
    const small = fits.filter(f => f.key === 'T4').sort((a, b) => b.n - a.n);
    if (big.length !== 2 || small.length !== 2) {
      throw new Error('图案 ' + (g + 1) + ' 大/小三角数量不对：大 ' + big.length + ' 小 ' + small.length);
    }
    const idOf = new Map();
    idOf.set(big[0], 'T1'); idOf.set(big[1], 'T2');
    idOf.set(small[0], 'T4'); idOf.set(small[1], 'T5');
    fits.forEach(f => { if (!idOf.has(f)) idOf.set(f, f.key); });

    /* 拟合位置（不搬板） */
    let polys = fits.map(f => FIT.LOCAL[f.key].map(v => {
      const q = FIT.rot(v, f.ang, f.fl);
      return [q[0] + f.cx, q[1] + f.cy];
    }));

    /* 去压叠（解里有压叠 = 这关不可解） */
    polys = deoverlap(polys, fits.map(f => f.mask), s, gx0, gy0).polys;

    /* 边线族对齐 + 交替去压叠
     * --------------------------------------------------------------
     * 七巧板的边只有 0/45/90/135 四个方向。把每条边的法向偏移按族聚类，再对每块板
     * 解 2x2 最小二乘求平移 —— 位移只有 0.005~0.03 单位，姿势不动，但「本该共线的
     * 两条边」被拉到同一条线上，板与板之间就严丝合缝了。
     * 对齐会顺带让个别板微微压到一起，而对齐之后再搬板 0.1 单位，边又对不齐了，
     * 所以两者交替：对齐 → 只允许 0.008~0.04 的微调去压叠 → 再对齐……6 轮之后
     * 位移累积 <0.03 单位（3 世界单位），姿势肉眼无变化，压叠也归零。 */
    const MASKS = fits.map(f => f.mask);
    for (let it = 0; it < 6; it++) {
      polys = SL.snapLines(polys, 0.03).polys;
      polys = deoverlap(polys, MASKS, s, gx0, gy0, { MAGS: [0.008, 0.016, 0.024, 0.04] }).polys;
    }
    polys = SL.snapLines(polys, 0.03).polys;
    const sumA = polys.reduce((a, p) => a + areaOf(p), 0);

    /* 剪影 = 7 块板外扩 d 后的并集，再把多余的外扩收回去
     * ------------------------------------------------------------------
     * 参考图里每块板之间画了 1~2px 的白色分隔线，所以反解出来的板之间有 1~3 世界单位
     * 的缝；板与板只在一个角上相接的地方，直接求并集还会裂成 2~3 环 —— 而关卡轮廓只能
     * 是一个闭环。两个问题一起解决：**先外扩 d 求并集（把缝焊上、把环连上），再内缩
     * 回 keep 的余量**。d 只负责连通，逐个往上试；keep 决定剪影比板大多少，越小越好，
     * 所以 keep 在外层、d 在内层，取第一个「剪影简单 + 七块板严实落在里面」的组合。
     *
     * 为什么 keep 不能取 0.25 那么小：缝宽 1~3 单位，只有「外扩量 > 缝宽/2」才能把缝
     * 焊死，内缩之后焊缝的宽度是 2×keep − 缝宽。keep=0.25 时焊缝是负的（缝又露出来，
     * 屏幕上就是一道深色细线）；keep=1.5 时焊缝 0.5~2 单位，缝真正被填实，而板四周
     * 只多出 1.5 世界单位 = 0.2% 幅面（屏上 1px），看不出来。
     */
    function edgeStats(R) {
      let mn = 1e9;
      for (let i = 0; i < R.length; i++) {
        const p = R[i], q = R[(i + 1) % R.length];
        mn = Math.min(mn, Math.hypot(q[0] - p[0], q[1] - p[1]));
      }
      return mn;
    }
    let outline = null, dBig = 0, rings = 0;
    for (const tryD of [0.032, 0.036, 0.04, 0.048, 0.056, 0.07, 0.09]) {
      const rr = U2.unionOutline(polys.map(P => OF.inflate(P, tryD)), 0.02);
      rings = rr.length;
      if (rings !== 1) continue;
      dBig = tryD; outline = rr[0];
      break;
    }
    if (!outline) throw new Error('图案 ' + (g + 1) + ' 未收敛到单环（' + rings + ' 环）');

    let dKeep = 0;
    for (const keepU of [1.5, 2, 2.5, 3.5, 5, 7]) {
      const keep = keepU / U;
      const base = dBig > keep ? OF.inflate(outline, -(dBig - keep)) : outline;
      const cand = cleanRing(base.map(v => [r3(v[0]), r3(v[1])]), MIN_EDGE, 2.2);
      if (!isSimple(cand)) continue;
      if (!polys.every(P => G.pieceInside(P, cand, [], 0.5 / U))) continue;
      outline = cand; dKeep = keep;
      break;
    }
    if (!dKeep) throw new Error('图案 ' + (g + 1) + ' 内缩失败');

    /* 整形：削针 → 填缝 → 收毛刺，循环到不再变化
     * 三步会互相制造新问题（收毛刺会把一段凹口拉成一条几百单位长的零宽针），
     * 所以不能各做一次就完事，得反复做直到稳定；每删一个点都验「不自交 + 七块仍在里面」。 */
    for (let it = 0; it < 8; it++) {
      let moved = false;
      const k1 = killNeedles(outline, 0.15, 14 / U);
      if (k1.killed) { outline = k1.ring; moved = true; }
      const f1 = fillSlits(outline, 3.5 / U);
      if (f1.filled) { outline = f1.ring; moved = true; }
      const s1 = smoothShort(outline, polys, 8 / U, 2 / U);
      if (s1.cut) { outline = s1.ring; moved = true; }
      if (!moved) break;
    }
    const minEdge = edgeStats(outline);
    const allIn = polys.every(P => G.pieceInside(P, outline, [], TOL_IN));

    /* 压叠 */
    let maxOv = 0;
    for (let i = 0; i < polys.length; i++) {
      for (let j = i + 1; j < polys.length; j++) {
        const ov = G.convexOverlapArea(polys[i], polys[j]);
        if (ov > maxOv) maxOv = ov;
      }
    }
    const outA = areaOf(outline);

    const pieces = fits.map((f, i) => {
      const c = G.centroid(polys[i]);
      return {
        id: idOf.get(f),
        x: Math.round(c[0] * U * 100) / 100,
        y: Math.round(c[1] * U * 100) / 100,
        angle: f.ang, flipped: f.fl
      };
    });

    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    outline.forEach(v => { x0 = Math.min(x0, v[0]); y0 = Math.min(y0, v[1]); x1 = Math.max(x1, v[0]); y1 = Math.max(y1, v[1]); });

    const avgIoU = fits.reduce((a, f) => a + f.iou, 0) / 7;
    out.push({
      name: NAMES[g].name, tip: NAMES[g].tip,
      pieces,
      /* outline 存世界单位（与 pieces 的 x/y 一致，也便于直接写进关卡） */
      outline: outline.map(v => [Math.round(v[0] * U * 100) / 100, Math.round(v[1] * U * 100) / 100]),
      outlineUnits: outline.map(v => [Math.round(v[0] * 1000) / 1000, Math.round(v[1] * 1000) / 1000]),
      holes: [],
      meta: { gx0: Math.round(gx0 * 100) / 100, gy0: Math.round(gy0 * 100) / 100, scale: Math.round(s * 100) / 100 },
      quality: {
        areaErrPct: Math.round((outA - sumA) / sumA * 10000) / 100,
        maxOverlap: Math.round(maxOv * 1000) / 1000,
        inflate: Math.round(dKeep * 1000) / 1000, rings, minEdge: Math.round(minEdge * U * 10) / 10,
        points: outline.length,
        allInside: allIn,
        width: Math.round((x1 - x0) * U), height: Math.round((y1 - y0) * U),
        avgIoU: Math.round(avgIoU * 1000) / 1000,
        minIoU: Math.round(Math.min.apply(null, fits.map(f => f.iou)) * 1000) / 1000
      }
    });

    console.log(('图案 ' + (g + 1) + ' ' + NAMES[g].name).padEnd(11),
      '宽高 ' + (x1 - x0).toFixed(1) + '×' + (y1 - y0).toFixed(1),
      '点 ' + String(outline.length).padStart(2),
      '外扩 ' + dKeep.toFixed(3) + ' 环 ' + rings, '最短边 ' + (minEdge * U).toFixed(1),
      '面积差 ' + ((outA - sumA) / sumA * 100).toFixed(2) + '%',
      '压叠 ' + maxOv.toFixed(3),
      '全内含 ' + (allIn ? 'Y' : 'N'),
      'IoU 均 ' + avgIoU.toFixed(3) + ' 最差 ' + Math.min.apply(null, fits.map(f => f.iou)).toFixed(3));
  }

  const file = path.join(__dirname, 'dancers_exact.json');
  fs.writeFileSync(file, JSON.stringify(out, null, 1));
  console.log('写出', file);
}

main();
