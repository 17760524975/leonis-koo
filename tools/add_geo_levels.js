/* v0.50 · 七巧板「几何」章补充图案
 *
 * 用户反馈：几何章只有 10 个图案，想再多一些。
 * 做法沿用 Phase 0 的范式 —— 不手画轮廓，先摆 7 块板的标准解，再由标准解反算轮廓：
 *   · 复用 tools/build_tangram7.js 里的 grow（逐块沿外轮廓附着）+ boundaryInfo（边消去求并集）
 *   · 优先「凸剪影 + 左右对称」：经典七巧板里最有辨识度的那批（三角形/矩形/梯形/菱形/箭头…）
 *   · 用 canon() 做旋转/镜像/平移去重，再排除已经存在的关卡
 * 产出：
 *   tools/out/geo_candidates.html   候选联系表（人工挑图 + 定名用）
 *   tools/out/geo_pick.json         挑中的关卡数据（--write 时读取）
 *
 * 用法：
 *   node tools/add_geo_levels.js                 只生成候选联系表
 *   node tools/add_geo_levels.js --write         把 geo_pick.json 里的关卡插进 levels.js
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const G = require(path.join(ROOT, 'js/geom.js'));
require(path.join(ROOT, 'js/levels.js'));

const DATA = globalThis.TANGRAM_DATA;
const SET = DATA.sets.tangram7;
/* 关卡里的世界坐标 = 单位坐标 × 数据集 unitScale（几何/字母都走这个值）。
 * build_tangram7.js 里的 U=107 是它自己那套版式参数，别混用。 */
const UNIT = SET.unitScale || 96;
const CENTER = 500;

/* ---------- 复用生成器里的纯函数 ---------- */
const SRC = fs.readFileSync(path.join(__dirname, 'build_tangram7.js'), 'utf8');
const A = SRC.indexOf('const U = 107;');
const B = SRC.indexOf('/* ---------- 逐关构造 + judge 验证 ---------- */');
if (A < 0 || B < 0) throw new Error('build_tangram7.js 结构变了，找不到可复用的代码段');
const slice = SRC.slice(A, B) + `
return { grow, canon, reflexCount, boundaryInfo, orient, overlapArea, signedArea,
         BASE, ORDER, U, CENTER, recoverState, r6 };
`;
const gen = new Function('require', 'module', '__dirname', 'G', 'process', slice)(
  require, { exports: {} }, __dirname, G, process);
const { grow, canon, reflexCount, boundaryInfo, orient, overlapArea, signedArea,
  BASE, ORDER } = gen;

/* ---------- 世界坐标映射（unit → board） ----------
 * 注意 UNIT 取数据集自己的 unitScale：core.js 建板件时就是 local × unitScale，
 * 生成器里那套 U=107 是它自己的版式参数，混用会导致标准解跟轮廓对不上。 */
const LOCALW = {};
for (const id of ORDER) LOCALW[id] = G.makeLocal(BASE[id]).map(v => [v[0] * UNIT, v[1] * UNIT]);
function sameVertexSet(a, b, tol) {
  if (a.length !== b.length) return false;
  const used = new Array(b.length).fill(false);
  for (const p of a) {
    let bi = -1, best = Infinity;
    for (let i = 0; i < b.length; i++) {
      if (used[i]) continue;
      const d = Math.hypot(p[0] - b[i][0], p[1] - b[i][1]);
      if (d < best) { best = d; bi = i; }
    }
    if (bi < 0 || best > (tol || 0.5)) return false;
    used[bi] = true;
  }
  return true;
}
/* 反解 (x, y, angle, flipped)：与 core.js 的 G.toWorld 同一套变换，但用本数据集的比例 */
function recoverState(id, poly) {
  const c = G.centroid(poly);
  for (const f of [false, true]) for (let k = 0; k < 8; k++) {
    const cand = G.toWorld(LOCALW[id], { x: c[0], y: c[1], angle: k * 45, flipped: f });
    if (sameVertexSet(cand, poly, 0.5)) return { angle: k * 45, flipped: f, x: c[0], y: c[1] };
  }
  throw new Error('无法反解板件状态 ' + id);
}

const seedArg = process.argv.find(a => /^--seeds=/.test(a));
const SEEDS = seedArg ? +seedArg.split('=')[1] : 24000;

/* ---------- 世界坐标映射（unit → board） ---------- */
function r6(v) { return Math.round(v * 1e6) / 1e6; }
function worldMap(outlineU) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const v of outlineU) {
    if (v[0] < x0) x0 = v[0]; if (v[0] > x1) x1 = v[0];
    if (v[1] < y0) y0 = v[1]; if (v[1] > y1) y1 = v[1];
  }
  const ox = CENTER - (x0 + x1) / 2 * UNIT, oy = CENTER - (y0 + y1) / 2 * UNIT;
  return {
    w: v => [r6(v[0] * UNIT + ox), r6(v[1] * UNIT + oy)],
    bboxU: [+(x1 - x0).toFixed(3), +(y1 - y0).toFixed(3)]
  };
}

/* 只用旋转（不含镜像）的签名 —— 用来判左右对称。
 * 两个坑：①多边形顶点序列只是环，起点不同不代表形状不同，要遍历所有循环移位；
 * ②镜像会把绕向翻过来，必须先统一成逆时针再比。
 * build_tangram7 自带的 canon() 这两个都没处理（它内部所有环的起点、绕向一致）。 */
function ccwPoly(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a >= 0 ? poly.slice() : poly.slice().reverse();
}
function normCycle(poly, mirror) {
  const base = ccwPoly(mirror ? poly.map(v => [-v[0], v[1]]) : poly);
  let best = null;
  for (let k = 0; k < 4; k++) {
    const c = [1, 0, -1, 0][k], s = [0, 1, 0, -1][k];
    const t = base.map(v => [c * v[0] - s * v[1], s * v[0] + c * v[1]]);
    let ax = Infinity, ay = Infinity;
    for (const v of t) { if (v[0] < ax) ax = v[0]; if (v[1] < ay) ay = v[1]; }
    const keyed = t.map(v => (Math.round((v[0] - ax) * 1000) / 1000) + ',' +
      (Math.round((v[1] - ay) * 1000) / 1000));
    for (let st = 0; st < keyed.length; st++) {
      const s2 = keyed.slice(st).concat(keyed.slice(0, st)).join(';');
      if (best === null || s2 < best) best = s2;
    }
  }
  return best;
}
function sigRot(poly) { return normCycle(poly, false); }
function isSym(poly) { return sigRot(poly) === sigRot(poly.map(v => [-v[0], v[1]])); }

/* 现有关卡签名（缩放归一后再规范化，避免 96/107 之类的比例差导致漏判重复） */
function shapeSig(poly) {
  const bb = G.bbox([poly]);
  const k = Math.max(bb[2] - bb[0], bb[3] - bb[1]) || 1;
  const norm = poly.map(v => [(v[0] - bb[0]) / k, (v[1] - bb[1]) / k]);
  const a = normCycle(norm, false), b = normCycle(norm, true);
  return a < b ? a : b;
}
const existing = {};
for (const lv of SET.levels) existing[shapeSig(lv.outline)] = lv.name;

/* ---------- 枚举 A：随机生长（grow），只留「少凹角 / 左右对称」的干净剪影 ---------- */
const pool = [], seen = {};
for (let seed = 1; seed <= SEEDS; seed++) {
  let c;
  try { c = grow(seed); } catch (e) { c = null; }
  if (!c) continue;
  const nV = c.outlineU.length;
  if (nV < 3 || nV > 9) continue;
  const nR = reflexCount(c.outlineU);
  if (nR > 3) continue;
  const bb = worldMap(c.outlineU).bboxU;
  if (bb[0] > 10.4 || bb[1] > 10.4 || bb[0] < 3.2 || bb[1] < 3.2) continue;
  const sig = shapeSig(c.outlineU);
  if (seen[sig]) continue;
  seen[sig] = 1;
  const sym = isSym(c.outlineU);
  pool.push({ seed, c, sig, bb, nV, nR, sym, dup: existing[sig] || null, src: 'grow' });
}

/* 凸包面积（monotone chain）。用来做凸图形的强剪枝：
 * 部分装配一定是最终图形的子集，而最终图形凸 → 凸包(部分) ⊆ 最终图形，
 * 于是 凸包面积 ≤ 16u²（七块板总面积）恒成立，超过就一定拼不成凸形。 */
function hullArea(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [];
  for (const v of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], v) <= 0) lo.pop(); lo.push(v); }
  const up = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const v = p[i];
    while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], v) <= 0) up.pop();
    up.push(v);
  }
  const h = lo.slice(0, -1).concat(up.slice(0, -1));
  return Math.abs(signedArea(h));
}
const TOTAL_AREA = ORDER.reduce((s, id) => s + Math.abs(signedArea(BASE[id])), 0);

/* ---------- 枚举 B：穷举装配 → 经典凸七巧板图形 ----------
 * grow 是随机的，绝大多数结果是「楼梯形」，凸的极少（几万分之一）。
 * 凸图形在教科书里就那么十几个（正方形 / 矩形 / 三角形 / 梯形 / 菱形 / 五边形 / 六边形），
 * 正好是「几何」章该有的样子，所以单独走一次确定性 DFS：
 *   · 板按面积从大到小固定顺序放（避免同一装配的不同排列重复出图）
 *   · 每放一块都要求「无重叠 + 向外长」
 *   · 凸包面积 ≤ 16u² 剪枝（见 hullArea 注释）—— 这一条把 3 分钟的搜索压到 6 秒
 *   · 同一深度的中间状态用规范签名去重 —— 之后的拼法只取决于当前并集
 *   · 全部放完后只留「凸 + 无洞」的并集 */
function enumConvex() {
  const out = [], memo = {};
  let nodes = 0;
  function options(info, id, placed) {
    const opts = [], seenOpt = {};
    for (let k = 0; k < 4; k++) for (const f of [false, true]) {
      const po = orient(BASE[id], k, f);
      for (let ei = 0; ei < po.length; ei++) {
        const a = po[ei], b = po[(ei + 1) % po.length];
        const ex = b[0] - a[0], ey = b[1] - a[1];
        for (const e of info.boundary) {
          const p = e[0], q = e[1];
          const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy);
          if (L < 1e-9) continue;
          const cr = ex * dy - ey * dx, dt = ex * dx + ey * dy;
          if (Math.abs(cr) > 1e-7 || dt >= -1e-7) continue;
          const lam = Math.hypot(ex, ey) / L;
          if (lam > 1 + 1e-7) continue;
          for (const tt of [lam, 1, (lam + 1) / 2]) {
            if (tt < lam - 1e-9 || tt > 1 + 1e-9) continue;
            const X = [p[0] + dx * tt, p[1] + dy * tt];
            const T = [X[0] - a[0], X[1] - a[1]];
            const np = po.map(v => [v[0] + T[0], v[1] + T[1]]);
            let bad = false;
            for (const old of placed) if (overlapArea(np, old) > 1e-6) { bad = true; break; }
            if (bad) continue;
            const mid = [X[0] + ex / 2 + dy / L * 0.3, X[1] + ey / 2 - dx / L * 0.3];
            if (!G.pointInPoly(mid, np)) continue;             // 只许向外生长
            const key = np.map(v => v.join(',')).sort().join(';');
            if (seenOpt[key]) continue;
            seenOpt[key] = 1;
            opts.push(np);
          }
        }
      }
    }
    return opts;
  }
  function dfs(placed, byId, step) {
    if (++nodes > 4000000) return;
    const info = boundaryInfo(placed);
    if (!info) return;
    if (hullArea(info.loop) > TOTAL_AREA + 1e-6) return;      // 凸包剪枝
    if (step === ORDER.length) {
      let sum = 0;
      for (const p of placed) sum += Math.abs(signedArea(p));
      if (Math.abs(Math.abs(signedArea(info.loop)) - sum) > 1e-6) return;  // 有洞，丢弃
      if (reflexCount(info.loop) !== 0) return;
      out.push({ byId: Object.assign({}, byId), outlineU: info.loop, internalU: info.internal });
      return;
    }
    /* 只剩最后两块时不再做记忆化（canon 是热点，末端状态不会有第二次访问） */
    if (step < 6) {
      const key = step + '|' + canon(info.loop);
      if (memo[key]) return;
      memo[key] = 1;
    }
    const id = ORDER[step];
    for (const np of options(info, id, placed)) {
      const nById = Object.assign({}, byId);
      nById[id] = np;
      dfs(placed.concat([np]), nById, step + 1);
    }
  }
  const first = orient(BASE[ORDER[0]], 0, false);
  const byId = {}; byId[ORDER[0]] = first;
  dfs([first], byId, 1);
  /* 同一图形（旋转/镜像/不同装配）去重 */
  const uniq = {}, res = [];
  for (const c of out) {
    const sig = shapeSig(c.outlineU);
    if (uniq[sig]) continue;
    uniq[sig] = 1;
    res.push(c);
  }
  res.assemblies = out.length;
  res.nodes = nodes;
  return res;
}
let convexShapes = [];
try {
  convexShapes = enumConvex();
  console.log(`穷举凸图形：${convexShapes.assemblies} 个装配 → ${convexShapes.length} 个不同形状`);
} catch (e) {
  console.log('穷举凸图形失败：' + e.message);
}
for (const c of convexShapes) {
  const sig = shapeSig(c.outlineU);
  if (seen[sig]) continue;
  seen[sig] = 1;
  const bb = worldMap(c.outlineU).bboxU;
  pool.push({ seed: 0, c, sig, bb, nV: c.outlineU.length, nR: 0,
    sym: isSym(c.outlineU), dup: existing[sig] || null, src: 'convex' });
}

/* 排序：先凸、再对称、再顶点少（越「几何」越靠前） */
pool.sort((a, b) => (a.nR - b.nR) || (b.sym - a.sym) || (a.nV - b.nV) ||
  (a.bb[0] * a.bb[1] - b.bb[0] * b.bb[1]));
const fresh = pool.filter(p => !p.dup);
console.log(`候选 ${pool.length} 个 / 去掉与现有重复后 ${fresh.length} 个` +
  `（对称 ${fresh.filter(p => p.sym).length}，凸 ${fresh.filter(p => !p.nR).length}）`);

/* ---------- 联系表 ---------- */
const CELL = 168;
const sheet = fresh.map((p, i) => {
  const bb = G.bbox([p.c.outlineU]);
  const w = bb[2] - bb[0], h = bb[3] - bb[1];
  const sc = (CELL - 34) / Math.max(w, h);
  const px = v => ((v[0] - bb[0]) * sc + 17).toFixed(1);
  const py = v => ((v[1] - bb[1]) * sc + 17).toFixed(1);
  const d = p.c.outlineU.map((v, k) => (k ? 'L' : 'M') + px(v) + ',' + py(v)).join('') + 'Z';
  const lines = p.c.internalU.map(e => `<line x1="${px(e[0])}" y1="${py(e[0])}" x2="${px(e[1])}" y2="${py(e[1])}"/>`).join('');
  return `<div class="c${p.sym ? ' sym' : ''}"><svg width="${CELL}" height="${CELL}" viewBox="0 0 ${CELL} ${CELL}">
    <path d="${d}" fill="#8fb6dd" stroke="#2c4f75" stroke-width="2"/>
    <g stroke="#5b86b5" stroke-width="0.9" opacity=".85">${lines}</g>
    <text x="6" y="16" class="idx">#${i}</text></svg>
    <small>${p.nV}边${p.nR ? '·凹' + p.nR : '·凸'}${p.sym ? '·对称' : ''} ${p.bb[0].toFixed(1)}×${p.bb[1].toFixed(1)}</small></div>`;
}).join('');
const html = `<!doctype html><meta charset="utf-8"><title>几何候选</title><style>
body{background:#f6f2ea;font:12px/1.35 -apple-system,"Segoe UI",sans-serif;margin:10px;
display:grid;grid-template-columns:repeat(8,${CELL}px);gap:4px;justify-content:center}
.c{background:#fff;border-radius:8px;padding:4px;text-align:center;box-shadow:0 1px 2px #0001}
.c.sym{outline:2px solid #7fd6a2}
.idx{font:bold 12px sans-serif;fill:#c0392b}
small{color:#666;font-size:11px}
</style><body>${sheet}</body>`;
fs.writeFileSync(path.join(__dirname, 'out', 'geo_candidates.html'), html);
console.log('联系表 → tools/out/geo_candidates.html');
/* 候选明细落盘：方便事后建「放大版」联系表挑图 / 定名，不用重跑枚举 */
fs.writeFileSync(path.join(__dirname, 'out', 'geo_pool.json'), JSON.stringify(fresh.map((p, i) => ({
  idx: i, src: p.src, nV: p.nV, nR: p.nR, sym: p.sym, bb: p.bb,
  outline: p.c.outlineU, internal: p.c.internalU
})), null, 1));

/* ---------- 写回 ---------- */
/* ---------- 写回 ----------
 * geo_pick.json 结构：{ "drop": ["关名", ...], "levels": [{ idx, name, tier, parTime }] }
 * drop 用来清掉「同一个图形重复出现」的关（现有关卡里 大三角形/大三角·立、平行四边形/平行四边形·竖、
 * 凹五边形/凹五边形·横 就是同一轮廓转了个方向，玩家会觉得凑数）。 */
if (process.argv.indexOf('--write') >= 0) {
  const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'out', 'geo_pick.json'), 'utf8'));
  const picks = Array.isArray(cfg) ? cfg : (cfg.levels || []);
  const drop = Array.isArray(cfg) ? [] : (cfg.drop || []);
  const levels = [];
  for (const it of picks) {
    const cand = fresh[it.idx];
    if (!cand) throw new Error('候选序号不存在：' + it.idx);
    const m = worldMap(cand.c.outlineU);
    const outline = cand.c.outlineU.map(m.w);
    const solution = ORDER.map(pid => {
      const st = recoverState(pid, cand.c.byId[pid].map(m.w));
      return { id: pid, x: +st.x.toFixed(2), y: +st.y.toFixed(2), angle: st.angle, flipped: st.flipped };
    });
    const seen2 = {}, splitLines = [];
    for (const e of cand.c.internalU) {
      const k = e[0].join(',') + '|' + e[1].join(',');
      const k2 = e[1].join(',') + '|' + e[0].join(',');
      if (seen2[k] || seen2[k2]) continue;
      seen2[k] = seen2[k2] = 1;
      splitLines.push([m.w(e[0]), m.w(e[1])]);
    }
    levels.push({
      name: it.name,
      tip: it.tip || '几何 · 七块板拼出剪影',
      outline: outline,
      solution: solution,
      splitLines: splitLines,
      hintTier: it.tier || 2,
      parTime: it.parTime || 100,
      parSteps: it.parSteps || 26,
      needFlip: solution.some(s => s.flipped)
    });
  }
  writeLevels(levels, drop);
}

/* 把新关插到「几何」章末尾，并整体重排 id / 章节表 */
function writeLevels(newLvs, dropNames) {
  const file = path.join(ROOT, 'js', 'levels.js');
  let src = fs.readFileSync(file, 'utf8');
  const MARK = 'var LEVELS7 = ';
  const at = src.indexOf(MARK);
  const open = src.indexOf('[', at);
  let depth = 0, close = open;
  for (let i = open; i < src.length; i++) {
    const ch = src[i];
    if (ch === '[') depth++;
    else if (ch === ']') { depth--; if (depth === 0) { close = i + 1; break; } }
  }
  const arr = JSON.parse(src.slice(open, close));
  const gone = {};
  (dropNames || []).forEach(n => { gone[n] = 1; });
  const geo = arr.filter(l => l.chapter === 1 && !gone[l.name]);
  const letters = arr.filter(l => l.chapter === 2);
  /* 幂等：同名关不重复插入 */
  const have = {};
  geo.forEach(l => { have[l.name] = 1; });
  const add = newLvs.filter(l => !have[l.name]);
  const merged = geo.concat(add.map(l => Object.assign({ chapter: 1 }, l))).concat(letters);
  merged.forEach((l, i) => { l.id = i + 1; });
  src = src.slice(0, open) + JSON.stringify(merged, null, 2) + src.slice(close);

  /* 章节表跟着几何关数走 */
  const geoN = geo.length + add.length;
  src = src.replace(/chapters: \[[\s\S]*?\n      \]/, `chapters: [
        { name: '几何·入门', title: '几何', from: 1, count: ${geoN} },
        { name: '字母·A–Z', title: '字母', from: ${geoN + 1}, count: ${letters.length} }
      ]`);
  src = src.replace(/completeSub: '全部 \d+ 关已通关'/, `completeSub: '全部 ${merged.length} 关已通关'`);
  fs.writeFileSync(file, src);
  console.log(`已写入：几何 ${geoN} 关 + 字母 ${letters.length} 关 = ${merged.length} 关` +
    `（新增 ${add.length}，删重复 ${(dropNames || []).length}）`);
}
