/* 关卡构建器：从枚举出的合法拼法里挑 120 关，转成游戏可用的关卡数据
 * 用法：node tools/enumerate.js && node tools/build_levels.js
 * 输出：js/levels.js（核心数据，两端共用）+ tools/out/levels_report.json
 *
 * ── 难度分定义（可解释，全部由实测几何量算出来，不含主观调参）──
 *   ds = 1.0 * (顶点数 / 2)          // 轮廓顶点越多，需要照顾的转折越多
 *      + 1.5 * 凹角数                // 凹角是最容易卡住的地方（凹角越多越难）
 *      + 1.2 * (是否需要翻面 ? 1:0)   // 某块板必须镜像才能贴合 → 多数人想不到
 *      + 0.9 * max(0, 长宽比 - 1)     // 越细长的轮廓越难摆（拖拽半径小、易叠死）
 *      + 1.1 * (1 - 紧凑度)           // 紧凑度 = 面积 / bbox 面积，越低越"镂空"越难
 *      + 2.5 / (1 + 解数)             // 该轮廓在枚举里的摆法总数：解越少越难
 *   1..120 按 ds 升序排列；每 20 关一章，共 6 章，第 1 章最简单。
 */
const fs = require('fs');
const path = require('path');

/* ---------- 板件基准（u） ---------- */
const DEFS = {
  A: [[3, 0], [0, 0], [1, 1], [3, 1]],
  B: [[0, 1], [0, 0], [1, 1]],
  C: [[0, 0], [1.5, 0], [0.5, 1], [0, 1]],
  /* v0.3a D：经典四巧板（T 字板）的第四块——带 45° 尖角的凹五边形。
   * 边长 1 / 0.5 / √2 / 1.5 / 2√2，面积 2.0 u²，凹角 225°，与 A/B/C 的边长互配。
   * 这块是能拼出「横杠 3×1 + 竖梁 1×3」那个标准 T 的唯一解，见 TSPEC。 */
  D: [[0.5, 0], [0.5, 1], [0, 1], [1, 2], [2.5, 2]]
};
const NAMES = { A: '大梯形', B: '小三角', C: '小梯形', D: '燕尾块' };

function shoelace(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) { const q = poly[(i + 1) % poly.length]; a += poly[i][0] * q[1] - q[0] * poly[i][1]; }
  return a / 2;
}
const areaOf = p => Math.abs(shoelace(p));
function centroidOf(poly) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    const cr = p[0] * q[1] - q[0] * p[1];
    a += cr; cx += (p[0] + q[0]) * cr; cy += (p[1] + q[1]) * cr;
  }
  a *= 0.5;
  return [cx / (6 * a), cy / (6 * a)];
}
function rot(p, deg, flip) {
  const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  const x = flip ? -p[0] : p[0], y = p[1];
  return [x * c - y * s, x * s + y * c];
}
function bbox(ps) {
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  for (const p of ps) for (const v of p) { a = Math.min(a, v[0]); b = Math.min(b, v[1]); c = Math.max(c, v[0]); d = Math.max(d, v[1]); }
  return [a, b, c, d];
}

/* ---------- 板件局部坐标（质心为原点） ---------- */
const LOCAL = {}, CENTROID = {};
for (const id of Object.keys(DEFS)) {
  const c = centroidOf(DEFS[id]);
  CENTROID[id] = c;
  LOCAL[id] = DEFS[id].map(v => [v[0] - c[0], v[1] - c[1]]);
}
function toWorld(id, st) {
  return LOCAL[id].map(p => {
    const q = rot(p, st.angle, st.flipped);
    return [q[0] + st.x, q[1] + st.y];
  });
}

/* ---------- 读取候选轮廓 ---------- */
const S = JSON.parse(fs.readFileSync(__dirname + '/out/shapes.json', 'utf8'));

const U = 130;             // 1u = 130 世界单位（1000 坐标系）
const MAX_U = 6.8;         // 轮廓 bbox 长边上限（u）：越界会超出 702×702 拼图区的可拖拽范围
const WANT = 120;          // 关卡总数
const POOL_WANT = 119;     // 从枚举轮廓池里取 119 关，第 120 关是硬指定的干净 T

const GEOM = require('../js/geom.js');
const JUDGE = require('../js/judge.js');
const LOCAL1000 = {};
for (const id of Object.keys(DEFS)) {
  LOCAL1000[id] = GEOM.makeLocal(DEFS[id]).map(v => [v[0] * U, v[1] * U]);
}

/* ---------- 几何特征 ---------- */
function feats(poly) {
  const n = poly.length;
  const s = shoelace(poly), orient = Math.sign(s);
  let reflex = 0, ortho = true;
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    if (Math.abs(dx) > 1e-6 && Math.abs(dy) > 1e-6) ortho = false;
    const c = poly[(i + 2) % n];
    const cr = dx * (c[1] - b[1]) - dy * (c[0] - b[0]);
    if (Math.sign(cr) !== orient) reflex++;
  }
  const bb = bbox([poly]);
  const w = bb[2] - bb[0], h = bb[3] - bb[1];
  const a = areaOf(poly);
  return {
    n, reflex, ortho, w: +w.toFixed(2), h: +h.toFixed(2),
    aspect: Math.max(w, h) / Math.min(w, h),
    fill: a / (w * h), area: a
  };
}

/* ---------- 挑选 120 个轮廓 ---------- */
const pool = S.filter(s => {
  const f = feats(s.outline);
  return Math.max(f.w, f.h) <= MAX_U + 1e-6 && Math.abs(f.area - 6.0) < 0.01;
});

/* needFlip：该轮廓的「全部」枚举解都需要至少一块板镜像。只要存在一种不翻面的摆法就不算。 */
function needFlipOf(s) {
  const nsol = s.nsol || 1, nFlip = s.nFlip || 0;
  return nFlip >= nsol;
}
function diffScore(s) {
  const f = feats(s.outline);
  const nsol = s.nsol || 1;
  const flip = needFlipOf(s) ? 1 : 0;
  const ds = 1.0 * (f.n / 2) + 1.5 * f.reflex + 1.2 * flip
    + 0.9 * Math.max(0, f.aspect - 1) + 1.1 * (1 - f.fill)
    + 2.5 / (1 + nsol);
  return { ds: +ds.toFixed(3), f, nsol, flip };
}

const scored = pool.map(s => ({ s, ...diffScore(s) }));
scored.sort((a, b) => a.ds - b.ds);

// 等距采样 120 个，保证难度是平滑爬坡而不是扎堆
const pick = [];
const N = scored.length;
for (let i = 0; i < POOL_WANT; i++) {
  const idx = POOL_WANT === 1 ? 0 : Math.round(i * (N - 1) / (POOL_WANT - 1));
  pick.push(scored[idx]);
}
// 去重（等距采样可能撞同一个）
for (let i = pick.length - 1, seen = new Set(); i >= 0; i--) {
  if (seen.has(pick[i])) pick.splice(i, 1); else seen.add(pick[i]);
}
if (pick.length < POOL_WANT) {   // 补齐：从剩余里按难度顺序取
  const used = new Set(pick);
  for (const c of scored) { if (pick.length >= POOL_WANT) break; if (!used.has(c)) { pick.push(c); used.add(c); } }
}
pick.length = POOL_WANT;
pick.sort((a, b) => a.ds - b.ds);

/* ---------- 命名：只给「一眼认得出」的关起名，其余留空 ----------
 * 判据全部是可验证的几何谓词，不靠感觉：
 *   n==3                                   → 三角形
 *   n==4 且正交：长宽比 ≥3.5 / 1.2~3.5 / <1.2 → 长条 / 长方形 / 正方形
 *   n==6 且正交 1 凹角：两臂厚薄相近 → 缺角方，一臂明显更粗 → L 形
 *   n==8 且正交 2 凹角且左右对称：宽的一头在下 → 凸字；上下都满宽中间收窄 → 凹字
 *   n==8 且正交 2 凹角且不对称：横截面宽度单调变化 → 台阶；两头宽中间窄 → 桥
 * 每个类目最多给 1 关起名（挑最典型的那关），其余一律留空 ""。
 * 第 120 关固定 'T 字型'。
 */
function symV(poly) {
  const bb = bbox([poly]);
  const cx = (bb[0] + bb[2]) / 2;
  const key = v => (Math.round(v[0] * 100) / 100) + ',' + (Math.round(v[1] * 100) / 100);
  const A = poly.map(v => key([2 * cx - v[0], v[1]])).sort().join('|');
  const B = poly.map(v => key(v)).sort().join('|');
  return A === B;
}
function widthAt(poly, y) {
  const xs = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    if ((a[1] > y) === (b[1] > y)) continue;
    xs.push(a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]));
  }
  if (xs.length < 2) return 0;
  return Math.max(...xs) - Math.min(...xs);
}
function profile(poly) {
  const bb = bbox([poly]);
  const W = bb[2] - bb[0], H = bb[3] - bb[1];
  const n = 9;
  const ws = [];
  for (let i = 0; i < n; i++) ws.push(widthAt(poly, bb[1] + (i + 0.5) * H / n) / W);
  return { W, H, ws };
}
function classify(f, poly) {
  if (f.n === 3) return 'tri';
  if (f.ortho && f.n === 4) return f.aspect >= 3.5 ? 'bar' : (f.aspect <= 1.2 ? 'square' : 'rect');
  if (f.ortho && f.n === 6 && f.reflex === 1) {
    const { W, H, ws } = profile(poly);
    const a = Math.min(...ws), b = Math.max(...ws);
    return (b > 0.9 && a > 0.35) ? 'notch' : 'ell';
  }
  if (f.ortho && f.n === 8 && f.reflex === 2) {
    const { ws } = profile(poly);
    const top = ws[0], bot = ws[ws.length - 1], mid = ws[Math.floor(ws.length / 2)];
    const sym = symV(poly);
    if (sym) {
      if (bot > 0.95 && top < 0.8) return 'tu';
      if (top > 0.95 && bot > 0.95 && mid < 0.85) return 'ao';
      return '';
    }
    let inc = true, dec = true;
    for (let i = 1; i < ws.length; i++) { if (ws[i] < ws[i - 1] - 0.02) inc = false; if (ws[i] > ws[i - 1] + 0.02) dec = false; }
    if (inc || dec) return 'stair';
    if (top > 0.9 && bot > 0.9 && mid < 0.8) return 'bridge';
    return '';
  }
  return '';
}
const NAME_OF = {
  tri: '三角形', bar: '长条', square: '正方形', rect: '长方形',
  notch: '缺角方', ell: 'L 形', tu: '凸字', ao: '凹字', stair: '台阶', bridge: '桥'
};
/* 逐关命名表：每一关都是我把它单独渲染成轮廓图看过、能一句话说出像什么才写上的。
 * expect 是当时看到的几何签名，重建时若对不上就直接报错，避免换了采样后名字贴错关卡。
 *
 * 收名字的原则：名字的唯一职责是让玩家一看就「对上了」。
 *   宁可留空，不要勉强 —— 两个形状长得几乎一样却叫两个名字，比都没名字更糟。
 * 所以 120 关里只有下面 5 关挂名字（第 120 关的 T 由 TSPEC 段硬指定，不在这张表里）。
 * 被删掉的名字及原因，都是主理人逐个渲染轮廓图比对后判的：
 *   6 单级台阶 → 与 39 台阶撞名，实体是「横条右端抬起一块」，更像 L 的变体
 *   13 帆船    → 与 8 小旗近乎同形（横条 + 左侧三角帆），两个名字描述同一个形状
 *   21 宽台阶  → 撞名，实体是「横条中段抬起」，不是台阶
 *   48 滑梯    → 只是横条右下带个斜尖，「滑梯」属于硬凑
 * 其余关一律空名，UI 退化成只显示「第 N 关」。 */
/* v0.2.1（经典板件）：换经典 D 后 394 个轮廓里能"一眼认出像什么"的极少——
 * 其余大多是带 45° 斜边的多边形组合，硬起名只会名不副实（v0.2 教训：先枚举后命名、逐图核对）。
 * 经放大联排图（node tools/sheet_levels.js 4 1,20,40,120 300）核对：
 * 1=平行四边形（两组对边平行、无凹角）可命名；20/40 的"拱门"左右腿不对称、勉强，不硬给。
 * expect 是几何签名断言：形状变了直接抛错，防止名字悄悄贴错关。 */
const NAMED = {
  1: { name: '平行四边形', expect: { ortho: false, n: 4 } }
};
function nameOfLevel(id, f) {
  const meta = NAMED[id];
  if (!meta) return '';
  const e = meta.expect;
  if (f.ortho !== e.ortho || f.n !== e.n) {
    throw new Error(`第 ${id} 关的几何签名变了（正交 ${f.ortho}/${e.ortho}，顶点 ${f.n}/${e.n}），命名表要重做`);
  }
  return meta.name;
}

const TIPS = [
  '先把最长的那条直边贴出来',
  '注意那个凹进去的角，它只有一种填法',
  '有一块板要翻过来才贴合',
  '别急着摆小三角，留到最后收口',
  '沿着外轮廓一段一段往里填',
  '先定下最长的边，再补窄缝'
];
function makeTip(f, flip, i) {
  if (flip) return '有一块板要翻面才贴合';
  if (f.reflex >= 2) return '注意那两个凹角，它们是唯一解的关键';
  if (f.aspect > 2.5) return '轮廓很细长，先把长边对齐再补两端';
  if (f.reflex === 1) return '凹角只有一种填法，先解决它';
  return TIPS[i % TIPS.length];
}

/* ---------- 生成关卡 ---------- */
const CX = 500, CY = 500;
const levels = [];
const report = [];
const altMap = {};

pick.forEach((cand, i) => {
  const src = cand.s, f = cand.f;
  // 1. 反解每块板的状态（u 坐标系）
  const pieces = src.conf.map(p => {
    const cx = centroidOf(p.poly);
    let ang = Math.round(p.angle / 45) * 45 % 360; if (ang < 0) ang += 360;
    return { id: p.id, x: cx[0], y: cx[1], angle: ang, flipped: !!p.flip };
  });
  let maxErr = 0;
  for (const st of pieces) {
    const got = toWorld(st.id, st);
    const want = src.conf.find(c => c.id === st.id).poly;
    for (const g of got) {
      let best = Infinity;
      for (const w of want) best = Math.min(best, Math.hypot(g[0] - w[0], g[1] - w[1]));
      maxErr = Math.max(maxErr, best);
    }
  }
  if (maxErr > 1e-3) { console.error(`!! #${i + 1} 反解误差过大 ${maxErr}`); process.exit(1); }

  // 2. 缩放 + 居中到 1000×1000（bbox 中心对齐 (CX,CY)）
  const bb = bbox([src.outline]);
  const w = bb[2] - bb[0], h = bb[3] - bb[1];
  const scale = U;
  const ox = CX - (bb[0] + bb[2]) / 2 * scale;
  const oy = CY - (bb[1] + bb[3]) / 2 * scale;
  const toW = v => [+(v[0] * scale + ox).toFixed(2), +(v[1] * scale + oy).toFixed(2)];

  const outline = src.outline.map(toW);
  const solution = pieces.map(st => ({
    id: st.id, x: +(st.x * scale + ox).toFixed(2), y: +(st.y * scale + oy).toFixed(2),
    angle: st.angle, flipped: st.flipped
  }));

  // 3. 严格校验
  const V = verifY(outline, solution);
  const name = nameOfLevel(i + 1, f);
  report.push({
    id: i + 1, name, w: +(w * scale).toFixed(1), h: +(h * scale).toFixed(1),
    ds: cand.ds, n: f.n, reflex: f.reflex, ortho: f.ortho, nsol: cand.nsol,
    needFlip: !!cand.flip,
    aspect: +f.aspect.toFixed(2), fill: +f.fill.toFixed(3), ...V
  });

  altMap[i + 1] = (src.alts || []).map(conf => conf.map(p => ({
    id: p.id, angle: p.angle, flip: !!p.flip, poly: p.poly
  })));

  levels.push({
    id: i + 1,
    chapter: Math.floor(i / 20) + 1,
    name,
    tip: makeTip(f, cand.flip, i),
    outline,
    solution,
    parTime: 55 + Math.round(cand.ds * 4),
    parSteps: 6 + Math.round(cand.ds * 1.5),
    needFlip: !!cand.flip
  });
});

/* ---------- 第 120 关：硬指定的标准 T（对照主理人给的参考图） ----------
 *   T = 横杠 3×1（在上）+ 竖梁 1×3（居中），bbox 3×4，面积 6.0 u²
 *   八顶点：(0,3)(0,4)(3,4)(3,3)(2,3)(2,0)(1,0)(1,3)
 * 四块落位：
 *   C 橙=左上梯形 (0,3)(0.5,3)(1.5,4)(0,4)
 *   B 红=右上三角 (3,3)(3,4)(2,3)
 *   D 绿=带尖的长条 (3,4)(1.5,4)(0.5,3)(1,3)(1,2)   ← 长边 2√2 被 B 与 A 各盖一半
 *   A 黄=竖梁 (2,0)(2,3)(1,2)(1,0)
 * 这个拼法由 tools/tile_ref_t.js 的精确区间覆盖求解器验证：sum(area)=6.0，无重叠、无缝隙。
 * 注意：枚举器只表达「整边对整边」贴合，这个拼法用到 T 型接缝（长斜边被两块各盖一半），
 *       所以它不在 shapes.json 里，只能在这里硬指定，并照样过 judge 校验。
 */
const TSPEC = {
  outline: [[0, 3], [0, 4], [3, 4], [3, 3], [2, 3], [2, 0], [1, 0], [1, 3]],
  pieces: {
    A: [[2, 0], [2, 3], [1, 2], [1, 0]],
    B: [[3, 3], [3, 4], [2, 3]],
    C: [[0, 3], [0.5, 3], [1.5, 4], [0, 4]],
    D: [[3, 4], [1.5, 4], [0.5, 3], [1, 3], [1, 2]]
  }
};
function fitPiece(id, poly) {
  const c = centroidOf(poly);
  let best = null;
  for (let k = 0; k < 8; k++) for (const fl of [false, true]) {
    const st = { id, x: c[0], y: c[1], angle: k * 45, flipped: fl };
    const got = toWorld(id, st);
    let err = 0;
    for (const g of got) {
      let m = Infinity;
      for (const w of poly) m = Math.min(m, Math.hypot(g[0] - w[0], g[1] - w[1]));
      err = Math.max(err, m);
    }
    if (!best || err < best.err) best = { err, st };
  }
  if (best.err > 1e-6) throw new Error('T 拼法反解失败 ' + id + ' err=' + best.err);
  return best.st;
}
{
  const uO = TSPEC.outline;
  const bb = bbox([uO]);
  const w = bb[2] - bb[0], h = bb[3] - bb[1];
  const ox = CX - (bb[0] + bb[2]) / 2 * U, oy = CY - (bb[1] + bb[3]) / 2 * U;
  const toW = v => [+(v[0] * U + ox).toFixed(2), +(v[1] * U + oy).toFixed(2)];
  const outline = uO.map(toW);
  const solution = ['A', 'B', 'C', 'D'].map(id => {
    const st = fitPiece(id, TSPEC.pieces[id]);
    return { id, x: +(st.x * U + ox).toFixed(2), y: +(st.y * U + oy).toFixed(2), angle: st.angle, flipped: st.flipped };
  });
  // 绕 bbox 中心旋转 180°，让 T 正着显示（刚体变换，可解性不变，下面照样过 judge）
  const bb1 = bbox([outline]);
  const cxr = (bb1[0] + bb1[2]) / 2, cyr = (bb1[1] + bb1[3]) / 2;
  for (const v of outline) { const x = v[0], y = v[1]; v[0] = +(2 * cxr - x).toFixed(2); v[1] = +(2 * cyr - y).toFixed(2); }
  for (const st of solution) { st.x = +(2 * cxr - st.x).toFixed(2); st.y = +(2 * cyr - st.y).toFixed(2); st.angle = (st.angle + 180) % 360; }
  const f = feats(uO);
  const maxDs = Math.max(...pick.map(c => c.ds), 0) + 0.5;
  const id = levels.length + 1;
  const V = verifY(outline, solution);
  report.push({
    id, name: 'T 字型', w: +(w * U).toFixed(1), h: +(h * U).toFixed(1),
    ds: +maxDs.toFixed(3), n: f.n, reflex: f.reflex, ortho: f.ortho, nsol: 1,
    needFlip: solution.some(p => p.flipped), isT: true, ...V
  });
  levels.push({
    id, chapter: Math.ceil(id / 20), name: 'T 字型',
    tip: '四巧板的招牌：横杠压在竖杠上，两个肩的凹角各只有一种填法',
    outline, solution,
    parTime: 55 + Math.round(maxDs * 4), parSteps: 6 + Math.round(maxDs * 1.5),
    needFlip: solution.some(p => p.flipped)
  });
}

/* ---------- 校验：用与游戏完全相同的判定模块 ---------- */
function piecePolys(solution) {
  return solution.map((st, i) => [GEOM.toWorld(LOCAL1000[st.id], st), i]);
}
function verifY(outline, solution) {
  const judge = new JUDGE.Judge();
  judge.setTarget(outline);
  const t0 = Date.now();
  const r = judge.judge(piecePolys(solution));
  const ms = Date.now() - t0;
  const sumArea = solution.reduce((s, st) => s + areaOf(GEOM.toWorld(LOCAL1000[st.id], st)), 0);
  const outArea = areaOf(outline);
  return {
    coverRate: +r.coverage.toFixed(5),
    overRate: +r.overflow.toFixed(5),
    areaErr: +(Math.abs(sumArea - outArea) / outArea).toFixed(5),
    overlaps: r.overlapPairs.length,
    judgeMs: ms,
    pass: r.coverage >= 0.99 && r.overflow < 0.01 && Math.abs(sumArea - outArea) / outArea < 0.001
  };
}

/* ---------- 输出 ---------- */
const bad = report.filter(r => !r.pass);
const minCover = Math.min(...report.map(r => r.coverRate));
const maxOver = Math.max(...report.map(r => r.overRate));
console.log(`==== ${levels.length} 关校验 ====`);
console.log(`候选轮廓池 ${N} 个 → 取 ${levels.length} 关`);
console.log(`覆盖率最低 ${(minCover * 100).toFixed(3)}%   溢出最高 ${(maxOver * 100).toFixed(3)}%   判定中位 ${report.map(r => r.judgeMs).sort((a, b) => a - b)[60]}ms`);
console.log(`不通过 ${bad.length} 关`);
for (const r of bad.slice(0, 10)) console.log(`  !! #${r.id} ${r.name} 覆盖=${r.coverRate} 溢出=${r.overRate} 面积误差=${r.areaErr}`);
const dsAll = report.map(r => r.ds);
for (let ch = 1; ch <= 6; ch++) {
  const seg = report.filter(r => Math.ceil(r.id / 20) === ch);
  console.log(`  第${ch}章 ds ${seg[0].ds.toFixed(2)} → ${seg[seg.length - 1].ds.toFixed(2)}  含正交轮廓 ${seg.filter(r => r.ortho).length} 关  需翻面 ${seg.filter(r => r.needFlip).length} 关`);
}
console.log(`ds 总区间 ${Math.min(...dsAll).toFixed(2)} → ${Math.max(...dsAll).toFixed(2)}`);

const outDir = path.join(__dirname, '..', 'js');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

/* 板件的视觉属性；几何一律从 DEFS 读，绝不手写，避免换板件时产物与求解器脱钩。
 * mark 是 D 板凹口内侧的 45° 短虚线（u 坐标，与 base 同坐标系）。 */
const PIECE_STYLE = {
  A: { color: '#FF8A5B', stroke: '#D96A3D' },
  B: { color: '#4FA8E0', stroke: '#3585BC' },
  C: { color: '#63C88B', stroke: '#46A66D' },
  D: { color: '#A87BE8', stroke: '#8455CC', mark: { from: [0.5, 1], to: [0.25, 1.25] } }
};
const piecesSrc = ['A', 'B', 'C', 'D'].map(function (id) {
  const st = PIECE_STYLE[id];
  return `      ${id}: { id: '${id}', name: '${NAMES[id]}',   color: '${st.color}', stroke: '${st.stroke}', area: ${+areaOf(DEFS[id]).toFixed(4)},
           base: ${JSON.stringify(DEFS[id])}${st.mark ? `,
           mark: ${JSON.stringify(st.mark)}` : ''} }`;
}).join(',\n');
const js = `/* 四巧板 v0.1 关卡数据 —— 由 tools/build_levels.js 生成，请勿手改
 * 坐标系：1000×1000 归一化（拼图区内部坐标系）
 * 板件几何单位为 u，1u = ${U} 世界单位
 * 每关 outline 均由求解器枚举「四块边对边贴合」得到并校验：
 *   覆盖率 ≥99%、重叠 <1%、面积误差 <0.1%
 * 难度 ds 定义见 tools/build_levels.js 顶部注释；1..${levels.length} 按 ds 升序，每 20 关一章
 */
(function (root) {
  var DATASET = {
    id: 'tangram4',
    name: '四巧板',
    unitScale: ${U},
    pieceOrder: ['A', 'B', 'C', 'D'],
    pieces: {
${piecesSrc}
    }
  };

  var LEVELS = ${JSON.stringify(levels, null, 2).replace(/\n/g, '\n  ')};

  root.TANGRAM_DATA = { dataset: DATASET, levels: LEVELS };
})(typeof window !== 'undefined' ? window : globalThis);
`;
fs.writeFileSync(path.join(outDir, 'levels.js'), js);
console.log(`\n已写 js/levels.js（${levels.length} 关，${Buffer.byteLength(js)} 字节）`);
fs.writeFileSync(path.join(__dirname, 'out', 'levels_report.json'),
  JSON.stringify({ report, levels, alts: altMap }, null, 2));
if (bad.length) { console.error('!! 有关卡未通过校验'); process.exit(1); }
console.log('全部通过');
