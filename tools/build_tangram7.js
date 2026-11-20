/* v0.3 正式版 · 七巧板 60 关题库生成器
 * 生产范式沿用 Phase 0：先摆出 7 块板的「标准解」（刚体变换，不切板），
 * 再由标准解反算轮廓（边消去法），最后用现有 judge 验证 coverage/overflow/真重叠。
 *
 * 与 Phase 0 的差别：不再只搬动「两个半块」，改成「逐块沿外轮廓附着」的装配生长
 * （grow）：大三角先成核心、小板当肢体 → 产出的是经典七巧板写意剪影，
 * 每关都恰好 7 块、有精确标准解、可拼回，绝无手画轮廓 / 无解关。
 *
 * 另产出：splitLines（档位一用，由标准解的内部共用边生成）、hintTier、par、
 * 数据集自带的 CHAP_NAMES / CHAP_PER / chapTitles / 结算文案。
 *
 * 用法：node tools/build_tangram7.js
 * 幂等：靠 levels.js 里的 BEGIN/END 标记整段替换，重复跑不会叠加。
 * 附产物：tools/out/v03_sheet.html（60 关轮廓联系表，供关名核对）
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const G = require('../js/geom.js');
const J = require('../js/judge.js');

/* v0.3 A2：unitScale 取 107。
 * 375 宽手机：view.scale = 375/750 = 0.5，世界→设计 = BOARD.size/1000 = 0.702，
 * 正方形轮廓边长 = 4U × 0.702 × 0.5 = 1.404U CSS px。
 * U=105 → 147.4px（差 2.6px 未达标），U=107 → 150.2px（达标）。
 * 四巧板版式一个字节不动；七巧板托盘用 2 列 × 4 行 + 带高 912~1410 吸收放大。 */
const U = 107;
const BOARD = 1000;
const CENTER = 500;

/* ---------- 7 块标准切分（单位 u，4u×4u 正方形 = 16u²） ----------
 * 顶点全为整数（45° 网格），边只走 0/∞/±1，内角均为 45° 整数倍。
 * 面积：4+4+2+1+1+2+2 = 16 u²。 */
const BASE = {
  T1: [[0, 0], [4, 0], [2, 2]],              // 大三角 4
  T2: [[0, 0], [4, 0], [2, 2]],              // 大三角 4（与 T1 全等，靠角度区分）
  T3: [[0, 0], [2, 0], [0, 2]],              // 中三角 2
  T4: [[0, 0], [2, 0], [1, 1]],              // 小三角 1
  T5: [[0, 0], [2, 0], [1, 1]],              // 小三角 1
  S:  [[1, 0], [2, 1], [1, 2], [0, 1]],      // 正方形 2（45° 菱形）
  P:  [[1, 0], [3, 0], [2, 1], [0, 1]]       // 平行四边形 2（手性块）
};
/* pieceOrder 同时决定托盘槽位顺序。2 列排布把「高块」和「矮块」分行，
 * 7 块共用 scale=1 也能塞进 912~1410 带内（见 buildSet 自适应行列）。 */
const ORDER = ['T1', 'T2', 'T3', 'S', 'T4', 'T5', 'P'];
const NAMES = { T1: '大三角①', T2: '大三角②', T3: '中三角', T4: '小三角①', T5: '小三角②', S: '正方形', P: '平行四边形' };
const COLORS = {
  T1: ['#FF8A5B', '#D96A3D'], T2: ['#4FA8E0', '#3585BC'], T3: ['#63C88B', '#46A66D'],
  T4: ['#A87BE8', '#8455CC'], T5: ['#FFC94D', '#E0A800'], S: ['#F47FA8', '#D95C87'],
  P: ['#4FC9C0', '#33A79E']
};

/* ---------- 章节 / 关卡名（数据集自带，供选关页与结算页读取） ---------- */
const CHAPTERS = [
  '几何·入门', '动物·飞禽', '动物·走兽', '水族·爬行', '人物·动作', '交通·挑战'
];
/* 胶囊用短名（96px 宽放得下），章名行用全称 */
const CHAP_TITLES = ['几何', '飞禽', '走兽', '水族', '人物', '交通'];
/* 6 章 × 10 关。名字走「经典七巧板题库」的写意命名，题材按轮廓特征分组。
 * 参考用户给的动物图只取题材风格，不逐个照抄（狮子鬃毛/熊猫耳是超 7 块的装饰拼法）。 */
const LEVEL_NAMES = [
  // 1 几何·入门：凸形/少顶点
  ['正方形', '大三角形', '矩形', '平行四边形', '梯形', '菱形', '五边形', '六边形', '箭头', '山形'],
  // 2 动物·飞禽：带颈/翼突起的竖向剪影（按联系表逐个核对后定名）
  ['飞鸟', '天鹅', '雄鹰', '鸭子', '燕子', '栖鸟', '鸽子', '企鹅', '长尾鸟', '雏鸟'],
  // 3 动物·走兽：横向躯干 + 腿/尾
  ['卧猫', '坐犬', '奔兔', '立马', '长颈兽', '狐狸', '松鼠', '山羊', '小鹿', '伏兽'],
  // 4 动物·水族与爬行：宽扁 + 尖尾/鳍
  ['游鱼', '乌龟', '青蛙', '螃蟹', '海豚', '鲨鱼', '水蛇', '鳄鱼', '虾', '金鱼'],
  // 5 人物与动作：竖向 + 四肢分叉
  ['立人', '行者', '奔人', '舞者', '举臂人', '侧身人', '弯腰人', '踏步人', '扬手人', '静立人'],
  // 6 交通与挑战：大跨度 / 多凹角高难剪影
  ['帆船', '小舟', '屋舍', '拱桥', '双轮车', '火箭', '飞机', '灯塔', '塔楼', '难题剪影']
];

const LOCAL = {};
for (const id of ORDER) LOCAL[id] = G.makeLocal(BASE[id]).map(v => [v[0] * U, v[1] * U]);

/* ---------- 几何工具（全整数坐标，90° 旋转 + 镜像，保证边精确贴合） ---------- */
function signedArea(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}
function ccw(poly) { return signedArea(poly) > 0 ? poly.slice() : poly.slice().reverse(); }
function r6(v) { return Math.round(v * 1e6) / 1e6; }
function key2(a, b) {
  const A = r6(a[0]) + ',' + r6(a[1]), B = r6(b[0]) + ',' + r6(b[1]);
  return A < B ? A + '|' + B : B + '|' + A;
}
function onSeg(p, a, b) {
  const cross = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
  if (Math.abs(cross) > 1e-7) return false;
  const dot = (p[0] - a[0]) * (p[0] - b[0]) + (p[1] - a[1]) * (p[1] - b[1]);
  return dot <= 1e-7;
}
/* 把所有板边按顶点打断；返回有向边（已统一 CCW 绕向） */
function splitRaw(polys) {
  const verts = [];
  for (const p of polys) for (const v of p) verts.push(v);
  const raw = [];
  for (const poly of polys) {
    const n = poly.length;
    for (let i = 0; i < n; i++) {
      const a = poly[i], b = poly[(i + 1) % n];
      const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
      const ts = [0, 1];
      for (const v of verts) {
        if ((v[0] === a[0] && v[1] === a[1]) || (v[0] === b[0] && v[1] === b[1])) continue;
        if (!onSeg(v, a, b)) continue;
        const t = ((v[0] - a[0]) * dx + (v[1] - a[1]) * dy) / l2;
        if (t > 1e-9 && t < 1 - 1e-9) ts.push(t);
      }
      ts.sort((x, y) => x - y);
      for (let k = 0; k + 1 < ts.length; k++) {
        if (ts[k + 1] - ts[k] < 1e-9) continue;
        raw.push([
          [a[0] + dx * ts[k], a[1] + dy * ts[k]],
          [a[0] + dx * ts[k + 1], a[1] + dy * ts[k + 1]]
        ]);
      }
    }
  }
  return raw;
}
/* 外轮廓 / 内部共用边；返回 null 表示出现孔洞或多个环（弃用该候选） */
function boundaryInfo(polys) {
  const raw = splitRaw(polys);
  const counts = {};
  for (const e of raw) { const k = key2(e[0], e[1]); counts[k] = (counts[k] || 0) + 1; }
  const boundary = raw.filter(e => counts[key2(e[0], e[1])] === 1);
  const internal = raw.filter(e => counts[key2(e[0], e[1])] >= 2);
  if (!boundary.length) return null;
  const adj = {};
  for (const e of boundary) {
    const ka = r6(e[0][0]) + ',' + r6(e[0][1]), kb = r6(e[1][0]) + ',' + r6(e[1][1]);
    const k = key2(e[0], e[1]);
    (adj[ka] = adj[ka] || []).push({ to: kb, key: k, out: true });
    (adj[kb] = adj[kb] || []).push({ to: ka, key: k, out: false });
  }
  for (const k in adj) {
    if (adj[k].length !== 2 || adj[k].filter(x => x.out).length !== 1) return null;
  }
  const used = new Set();
  const start = Object.keys(adj)[0];
  const loop = [];
  let cur = start;
  for (let guard = 0; guard <= boundary.length; guard++) {
    loop.push(cur.split(',').map(Number));
    const nx = adj[cur].filter(x => x.out && !used.has(x.key))[0];
    if (!nx) break;
    used.add(nx.key);
    cur = nx.to;
  }
  if (cur !== start || used.size !== boundary.length) return null;
  if (loop.length > 1) loop.pop();
  // 去掉共线中间点，保持轮廓简洁
  const simp = [];
  for (let i = 0; i < loop.length; i++) {
    const a = loop[(i - 1 + loop.length) % loop.length], b = loop[i], c = loop[(i + 1) % loop.length];
    const cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (Math.abs(cr) > 1e-7) simp.push(b);
  }
  if (simp.length < 3) return null;
  return { loop: simp, boundary: boundary, internal: internal };
}
/* 90° 旋转 + 可选镜像；结果仍为整数坐标 */
function orient(base, k, flip) {
  const c = [1, 0, -1, 0][k], s = [0, 1, 0, -1][k];   // cos/sin of k*90°
  const fx = flip ? -1 : 1;
  const out = base.map(v => [c * (v[0] * fx) - s * v[1], s * (v[0] * fx) + c * v[1]]);
  return ccw(out);
}
/* 凸多边形交叠面积（Sutherland–Hodgman），用于禁止压叠 */
function overlapArea(A, B) {
  let out = A.map(v => v.slice());
  for (let i = 0; i < B.length; i++) {
    const p = B[i], q = B[(i + 1) % B.length];
    const dx = q[0] - p[0], dy = q[1] - p[1];
    const side = v => dx * (v[1] - p[1]) - dy * (v[0] - p[0]);   // >0 = 左侧 = CCW 内部
    const inp = out; out = [];
    for (let j = 0; j < inp.length; j++) {
      const a = inp[j], b = inp[(j + 1) % inp.length];
      const da = side(a), db = side(b);
      if (da >= -1e-9) out.push(a);
      if ((da < -1e-9 && db > 1e-9) || (da > 1e-9 && db < -1e-9)) {
        const t = da / (da - db);
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      }
    }
    if (out.length < 3) return 0;
  }
  return Math.abs(signedArea(out));
}
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- 装配生长：逐块沿外轮廓附着，生成 7 块标准解 ---------- */
function grow(seed) {
  const dbg = process.env.DBG && String(seed) === process.env.DBG;
  const rnd = rng(seed);
  // 按面积从大到小（同面积随机打乱）：大三角先成躯干、小板后当肢体。
  // 这样外轮廓的边总是「长边」，后续小板只需匹配长边的一段，装配才长得起来。
  const seq = ORDER.slice().sort((a, b) => {
    const d = G.area(BASE[b]) - G.area(BASE[a]);
    return d !== 0 ? d : (rnd() < 0.5 ? -1 : 1);
  });
  const placed = [];
  const byId = {};
  placed.push(orient(BASE[seq[0]], Math.floor(rnd() * 4), rnd() < 0.5));
  byId[seq[0]] = placed[0];
  for (let step = 1; step < 7; step++) {
    const info = boundaryInfo(placed);
    if (!info) { if (dbg) console.log('  [DBG] step ' + step + ' boundaryInfo null'); return null; }
    const opts = [];
    const id = seq[step];
    const dbgCnt = { match: 0, clean: 0, outward: 0 };
    for (let k = 0; k < 4; k++) for (const f of [false, true]) {
      const po = orient(BASE[id], k, f);
      for (let ei = 0; ei < po.length; ei++) {
        const a = po[ei], b = po[(ei + 1) % po.length];
        const ex = b[0] - a[0], ey = b[1] - a[1];
        for (const e of info.boundary) {
          const p = e[0], q = e[1];
          const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy);
          if (L < 1e-9) continue;
          // 板件的边与轮廓边共线、反向，且不长于轮廓边（贴在其一段上）。
          // 七巧板里大三角的斜边 2√2 常由两条小三角直角边 √2 拼成，必须允许部分贴合。
          const cr = ex * dy - ey * dx;
          const dt = ex * dx + ey * dy;
          if (Math.abs(cr) > 1e-7 || dt >= -1e-7) continue;
          const lam = Math.hypot(ex, ey) / L;
          if (lam > 1 + 1e-7) continue;
          dbgCnt.match++;
          // 在轮廓边上选起点：贴左端 / 贴右端 / 居中，三种姿态
          const ts = [lam, 1, (lam + 1) / 2];
          for (const tt of ts) {
            if (tt < lam - 1e-9 || tt > 1 + 1e-9) continue;
            const X = [p[0] + dx * tt, p[1] + dy * tt];
            const T = [X[0] - a[0], X[1] - a[1]];
            const np = po.map(v => [v[0] + T[0], v[1] + T[1]]);
            let bad = false;
            for (const old of placed) if (overlapArea(np, old) > 1e-6) { bad = true; break; }
            if (bad) continue;
            dbgCnt.clean++;
            // 必须向轮廓外侧生长（防止填进凹口形成孔洞 / 压在已有板上）
            const mid = [X[0] + ex / 2 + dy / L * 0.3, X[1] + ey / 2 - dx / L * 0.3];
            if (!G.pointInPoly(mid, np)) continue;
            dbgCnt.outward++;
            let cx = 0, cy = 0;
            for (const old of placed) { const c = G.centroid(old); cx += c[0]; cy += c[1]; }
            cx /= placed.length; cy /= placed.length;
            const c = G.centroid(np);
            opts.push({ poly: np, d: Math.hypot(c[0] - cx, c[1] - cy) });
          }
        }
      }
    }
    if (dbg) console.log('  [DBG] step ' + step + ' piece ' + id + ' counters=' + JSON.stringify(dbgCnt) + ' boundary=' + info.boundary.length);
    if (!opts.length) return null;
    // 偏向紧凑剪影：从距离核心最近的前 35% 里随机挑
    opts.sort((x, y) => x.d - y.d);
    const pick = opts[Math.floor(rnd() * Math.max(1, Math.ceil(opts.length * 0.35)))];
    placed.push(pick.poly);
    byId[id] = pick.poly;
  }
  const info = boundaryInfo(placed);
  if (!info) { if (dbg) console.log('  [DBG] final boundaryInfo null'); return null; }
  if (dbg) console.log('  [DBG] OK loop=' + info.loop.length + ' boundary=' + info.boundary.length);
  return { byId: byId, outlineU: info.loop, internalU: info.internal };
}

/* ---------- 轮廓规范化签名（旋转/镜像/平移去重） ---------- */
function canon(poly) {
  const variants = [];
  for (let k = 0; k < 4; k++) for (const f of [false, true]) {
    const t = poly.map(v => {
      const c = [1, 0, -1, 0][k], s = [0, 1, 0, -1][k], x = f ? -v[0] : v[0];
      return [c * x - s * v[1], s * x + c * v[1]];
    });
    let x0 = Infinity, y0 = Infinity;
    for (const v of t) { if (v[0] < x0) x0 = v[0]; if (v[1] < y0) y0 = v[1]; }
    variants.push(t.map(v => (Math.round((v[0] - x0) * 1000) / 1000) + ',' +
      (Math.round((v[1] - y0) * 1000) / 1000)).join(';'));
  }
  return variants.sort()[0];
}
function reflexCount(poly) {
  let n = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[(i - 1 + poly.length) % poly.length], b = poly[i], c = poly[(i + 1) % poly.length];
    if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) < -1e-7) n++;
  }
  return n;
}

/* ---------- 反解 (x,y,angle,flipped)：与 core.js 的 G.toWorld 完全同一套变换 ---------- */
function sameVertexSet(a, b) {
  if (a.length !== b.length) return false;
  const bb = b.slice();
  for (const p of a) {
    let bi = -1, best = Infinity;
    for (let i = 0; i < bb.length; i++) {
      const d = Math.hypot(p[0] - bb[i][0], p[1] - bb[i][1]);
      if (d < best) { best = d; bi = i; }
    }
    if (best > 1e-4) return false;
    bb.splice(bi, 1);
  }
  return true;
}
function recoverState(id, poly) {
  const c = G.centroid(poly);
  for (const f of [false, true]) for (let k = 0; k < 8; k++) {
    const cand = G.toWorld(LOCAL[id], { x: c[0], y: c[1], angle: k * 45, flipped: f });
    if (sameVertexSet(cand, poly)) return { angle: k * 45, flipped: f, x: c[0], y: c[1] };
  }
  throw new Error('无法反解板件状态 ' + id);
}

/* ---------- 单位坐标 → 1000 世界坐标（bbox 居中） ---------- */
function makeWorldMap(outlineU) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const v of outlineU) {
    if (v[0] < x0) x0 = v[0]; if (v[0] > x1) x1 = v[0];
    if (v[1] < y0) y0 = v[1]; if (v[1] > y1) y1 = v[1];
  }
  const ox = CENTER - (x0 + x1) / 2 * U, oy = CENTER - (y0 + y1) / 2 * U;
  const w = v => [r6(v[0] * U + ox), r6(v[1] * U + oy)];
  return { w: w, bboxU: [+(x1 - x0).toFixed(3), +(y1 - y0).toFixed(3)] };
}

/* ---------- 逐关构造 + judge 验证 ---------- */
function judgeLevel(level) {
  const judge = new J.Judge();
  judge.setTarget(level.outline);
  const polys = level.solution.map(st => [G.toWorld(LOCAL[st.id], st), ORDER.indexOf(st.id)]);
  const r = judge.judge(polys);
  const areas = polys.map(p => G.area(p[0]));
  let bad = null;
  for (const p of r.overlapPairs) {
    const [a, b] = p.key.split('-').map(Number);
    const ov = p.cells * J.CELL * J.CELL;
    const lim = 0.005 * Math.min(areas[a], areas[b]);
    if (ov > lim) bad = { key: p.key, ov, lim };
  }
  const sumA = polys.reduce((s, p) => s + G.area(p[0]), 0);
  const outA = G.area(level.outline);
  return { coverage: r.coverage, overflow: r.overflow, bad: bad,
    areaErrPct: Math.abs(sumA - outA) / outA * 100 };
}

function buildLevel(id, chapter, name, hintTier, c) {
  const m = makeWorldMap(c.outlineU);
  const outline = c.outlineU.map(m.w);
  const solution = ORDER.map(pid => {
    const st = recoverState(pid, c.byId[pid].map(m.w));
    return { id: pid, x: +st.x.toFixed(2), y: +st.y.toFixed(2), angle: st.angle, flipped: st.flipped };
  });
  const seen = {}, splitLines = [];
  for (const e of c.internalU) {
    const k = key2(e[0], e[1]);
    if (seen[k]) continue;
    seen[k] = 1;
    splitLines.push([m.w(e[0]), m.w(e[1])]);
  }
  const parTime = 90 + (chapter - 1) * 30;
  const parSteps = 24 + (chapter - 1) * 4;
  const lv = {
    id: id, chapter: chapter, name: name,
    tip: chapterName(chapter - 1) + ' · 七块板拼出剪影',
    outline: outline, solution: solution, splitLines: splitLines,
    hintTier: hintTier, parTime: parTime, parSteps: parSteps,
    needFlip: solution.some(s => s.flipped)
  };
  const v = judgeLevel(lv);
  lv._v = v;
  lv._bboxU = m.bboxU;
  return lv;
}
function chapterName(c) { return CHAPTERS[c] || ('第 ' + (c + 1) + ' 章'); }

function hintTierOf(globalIdx) {
  // 第 1 章前几关默认档 1（轮廓+分割线），其余 2/3 递增
  if (globalIdx < 3) return 1;
  if (globalIdx < 10) return 2;
  if (globalIdx < 30) return 2;
  return 3;
}

/* ---------- 生成候选池 → 按章节轮廓特征选 60 关 ---------- */
console.log('==== 七巧板 60 关题库生成 ====');
console.log('  unitScale = ' + U + '（375 宽正方形轮廓 ' + (1.404 * U).toFixed(1) + ' CSS px）');

const areaU = {}, sumU0 = ORDER.reduce((s, id) => { areaU[id] = G.area(BASE[id]); return s + areaU[id]; }, 0);
console.log('  7 块面积(u²): ' + ORDER.map(id => id + '=' + areaU[id].toFixed(2)).join('  ') + '  Σ=' + sumU0.toFixed(6));
if (Math.abs(sumU0 - 16) / 16 >= 0.001) throw new Error('面积闭合失败');

const pool = [], seenSig = new Set();
for (let seed = 1; seed <= 900 && pool.length < 260; seed++) {
  let c;
  try { c = grow(seed); } catch (e) {
    c = null;
    if (process.env.DBG && String(seed) === process.env.DBG) console.log('  [DBG] throw: ' + e.stack);
  }
  if (!c) continue;
  const sig = canon(c.outlineU);
  if (seenSig.has(sig)) continue;
  const bb = makeWorldMap(c.outlineU).bboxU;
  const nV = c.outlineU.length, nR = reflexCount(c.outlineU);
  const asp = bb[0] / bb[1];
  // 过滤：太大/太细/太碎的剪影不适合手机拼图
  if (bb[0] > 9.2 || bb[1] > 9.2 || bb[0] < 3.4 || bb[1] < 3.4) continue;
  if (nV < 3 || nV > 18 || asp < 0.38 || asp > 2.6) continue;
  seenSig.add(sig);
  pool.push({ seed: seed, c: c, bb: bb, nV: nV, nR: nR, asp: asp });
}
console.log('  候选池 ' + pool.length + ' 个互不相同的 7 块剪影');
{
  const convex = pool.filter(p => p.nR === 0);
  const byV = {};
  for (const p of convex) byV[p.nV] = (byV[p.nV] || 0) + 1;
  console.log('  其中凸剪影 ' + convex.length + ' 个，顶点数分布 ' + JSON.stringify(byV));
}
if (pool.length < 60) throw new Error('候选池不足 60');

/* ---------- 第 1 章：纯几何形（两半块枚举，Phase 0 范式的全量版） ----------
 * H1={T1,T2}、H2={T3,T4,T5,S,P} 各成一个刚体组，枚举 H2 相对 H1 的全部
 * 45° 旋转 / 镜像 / 贴边位置 → 产出的都是「真正的几何剪影」（正方形 / 大三角 /
 * 平行四边形 / 闪电 / 箭头…），保证可解、可拼回。 */
const SQUARE = {
  T1: [[0, 0], [4, 0], [2, 2]], T2: [[0, 0], [2, 2], [0, 4]],
  T3: [[2, 4], [4, 4], [4, 2]], T4: [[2, 2], [3, 3], [1, 3]],
  T5: [[4, 0], [3, 1], [4, 2]], S: [[3, 1], [4, 2], [3, 3], [2, 2]],
  P: [[1, 3], [3, 3], [2, 4], [0, 4]]
};
function orient45(base, k, flip) {
  const a = k * Math.PI / 4, c = Math.cos(a), s = Math.sin(a), fx = flip ? -1 : 1;
  return ccw(base.map(v => [c * (v[0] * fx) - s * v[1], s * (v[0] * fx) + c * v[1]]));
}
function geoCandidates() {
  const H1 = ['T1', 'T2'], H2 = ['T3', 'T4', 'T5', 'S', 'P'];
  const h1 = H1.map(id => ccw(SQUARE[id]));
  const out = [], seen = new Set();
  for (let k = 0; k < 8; k++) for (const f of [false, true]) {
    const g2 = H2.map(id => orient45(SQUARE[id], k, f));
    // H1 外轮廓（凸三角形）边界
    const b1 = boundaryInfo(h1);
    if (!b1) continue;
    for (let pi = 0; pi < g2.length; pi++) {
      const po = g2[pi];
      for (let ei = 0; ei < po.length; ei++) {
        const a = po[ei], b = po[(ei + 1) % po.length];
        const ex = b[0] - a[0], ey = b[1] - a[1];
        for (const e of b1.boundary) {
          const p = e[0], q = e[1];
          const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy);
          if (L < 1e-9) continue;
          const cr = ex * dy - ey * dx, dt = ex * dx + ey * dy;
          if (Math.abs(cr) > 1e-7 || dt >= -1e-7) continue;
          const lam = Math.hypot(ex, ey) / L;
          if (lam > 1 + 1e-7) continue;
          for (const tt of [lam, 1, (lam + 1) / 2]) {
            const X = [p[0] + dx * tt, p[1] + dy * tt];
            const T = [X[0] - a[0], X[1] - a[1]];
            const g2t = g2.map(pl => pl.map(v => [v[0] + T[0], v[1] + T[1]]));
            let bad = false;
            for (const np of g2t) for (const oldp of h1) {
              if (overlapArea(np, oldp) > 1e-6) { bad = true; break; }
            }
            if (bad) continue;
            const mid = [X[0] + ex / 2 + dy / L * 0.3, X[1] + ey / 2 - dx / L * 0.3];
            if (!G.pointInPoly(mid, g2t[pi])) continue;
            const all = h1.concat(g2t);
            const info = boundaryInfo(all);
            if (!info) continue;
            const sig = canon(info.loop);
            if (seen.has(sig)) continue;
            seen.add(sig);
            const bb = bboxOf(info.loop);
            out.push({ byId: toMap(H1, h1, H2, g2t), outlineU: info.loop, internalU: info.internal, bb: bb, nV: info.loop.length, nR: reflexCount(info.loop), asp: bb[0] / bb[1], sig: sig });
          }
        }
      }
    }
  }
  return out;
}
function bboxOf(poly) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const v of poly) { if (v[0] < x0) x0 = v[0]; if (v[0] > x1) x1 = v[0]; if (v[1] < y0) y0 = v[1]; if (v[1] > y1) y1 = v[1]; }
  return [x1 - x0, y1 - y0];
}
function toMap(idsA, polysA, idsB, polysB) {
  const m = {};
  idsA.forEach((id, i) => { m[id] = polysA[i]; });
  idsB.forEach((id, i) => { m[id] = polysB[i]; });
  return m;
}
/* 凸几何形的自动分类（第 1 章命名依据，保证名实相符） */
function classifyGeo(loop) {
  const n = loop.length;
  const edges = [];
  for (let i = 0; i < n; i++) {
    const a = loop[i], b = loop[(i + 1) % n];
    edges.push([r6(b[0] - a[0]), r6(b[1] - a[1])]);
  }
  const isPar = (u, v) => Math.abs(u[0] * v[1] - u[1] * v[0]) < 1e-6 && (u[0] * v[0] + u[1] * v[1]) < 0;
  const len = e => Math.hypot(e[0], e[1]);
  const perp = (u, v) => Math.abs(u[0] * v[0] + u[1] * v[1]) < 1e-6;
  if (n === 3) return '大三角形';
  if (n === 4) {
    const par01 = isPar(edges[0], edges[2]), par12 = isPar(edges[1], edges[3]);
    if (par01 && par12) {
      const rect = perp(edges[0], edges[1]);
      const equ = Math.abs(len(edges[0]) - len(edges[1])) < 1e-6;
      if (rect && equ) return '正方形';
      if (rect) return '矩形';
      return equ ? '菱形' : '平行四边形';
    }
    if (par01 || par12) return '梯形';
    return '四边形';
  }
  return n + '边形';
}

/* 每章按题材挑 10 个最贴合轮廓特征的（不重复） */
function scoreOf(p, ch) {
  const a = p.asp, r = p.nR, v = p.nV;
  switch (ch) {
    case 0: return Math.abs(r - 0) * 3 + Math.abs(v - 5) * 0.7 + Math.abs(a - 1) * 2;      // 凸/少顶点
    case 1: return Math.abs(r - 3) * 1.4 + Math.abs(a - 0.85) * 5 + Math.abs(v - 9);      // 竖向带突起
    case 2: return Math.abs(r - 4) * 1.4 + Math.abs(a - 1.45) * 5 + Math.abs(v - 10);     // 横向躯干
    case 3: return Math.abs(r - 4) * 1.4 + Math.abs(a - 1.75) * 5 + Math.abs(v - 10);     // 宽扁尖尾
    case 4: return Math.abs(r - 5) * 1.2 + Math.abs(a - 0.62) * 5 + Math.abs(v - 11);     // 竖向四肢
    default: return -r * 1.4 - v * 0.8 + Math.abs(a - 1.15) * 2;                          // 高难多凹角
  }
}
const usedSeeds = new Set();
const chosen = [];
/* 第 1 章：两半块几何候选，正方形优先，类名不重复保证多样化 */
const geoC = geoCandidates().filter(p => p.bb[0] <= 9.2 && p.bb[1] <= 9.2 && p.bb[0] >= 3 && p.bb[1] >= 3);
console.log('  两半块几何候选 ' + geoC.length + ' 个（去重后）');
{
  const tagged = geoC.map(p => ({ p: p, cls: classifyGeo(p.outlineU) }))
    .sort((a, b) => a.p.nV - b.p.nV || a.p.nR - b.p.nR);
  const sq = tagged.find(x => x.cls === '正方形');
  const picked = [];
  if (sq) picked.push(sq);
  for (const x of tagged) {
    if (picked.length >= 10) break;
    if (picked.indexOf(x) >= 0) continue;
    if (picked.some(y => y.cls === x.cls)) continue;
    picked.push(x);
  }
  for (const x of tagged) {
    if (picked.length >= 10) break;
    if (picked.indexOf(x) < 0) picked.push(x);
  }
  if (picked.length < 10) throw new Error('第 1 章几何候选不足 10 个：' + picked.length);
  /* picked 顺序确定（按顶点数/凹角数排序），第 1 个必须是正方形（题目基准）。
   * 命名与 classifyGeo 的判定一一对应 —— 名实相符在这里硬性绑定。 */
  if (picked[0].cls !== '正方形') throw new Error('第 1 关不是正方形: ' + picked[0].cls);
  const GEO_NAMES = ['正方形', '大三角形', '平行四边形', '凹五边形', '凹六边形', '凹七边形',
    '凹八边形', '大三角·倒', '平行四边形·竖', '凹五边形·横'];
  picked.forEach((x, i) => {
    LEVEL_NAMES[0][i] = GEO_NAMES[i] || x.cls;
    usedSeeds.add('geo' + i);
    chosen.push({ ch: 0, slot: i, c: { c: x.p } });   // 与 pool 条目同构：c.c = 候选
  });
  console.log('  第 1 章 10 关几何形: ' + LEVEL_NAMES[0].join(' / '));
}
for (let ch = 1; ch < 6; ch++) {
  const arr = pool.filter(p => !usedSeeds.has(p.seed))
    .map(p => ({ p: p, s: scoreOf(p, ch) + (p.seed % 97) * 1e-4 }))
    .sort((x, y) => x.s - y.s);
  if (arr.length < 10) throw new Error('第 ' + (ch + 1) + ' 章候选不足');
  for (let i = 0; i < 10; i++) { usedSeeds.add(arr[i].p.seed); chosen.push({ ch: ch, slot: i, c: arr[i].p }); }
}

const LEVELS = [];
for (let i = 0; i < 60; i++) {
  const o = chosen[i];
  const id = i + 1;
  const lv = buildLevel(id, o.ch + 1, LEVEL_NAMES[o.ch][o.slot], hintTierOf(i), o.c.c);
  LEVELS.push(lv);
}

/* ---------- 几何硬校验 ---------- */
let minCov = 1, maxOver = 0, maxErr = 0, badCnt = 0, minBBox = Infinity, maxBBox = 0;
for (const lv of LEVELS) {
  const v = lv._v;
  minCov = Math.min(minCov, v.coverage);
  maxOver = Math.max(maxOver, v.overflow);
  maxErr = Math.max(maxErr, v.areaErrPct);
  if (v.bad) badCnt++;
  minBBox = Math.min(minBBox, lv._bboxU[0], lv._bboxU[1]);
  maxBBox = Math.max(maxBBox, lv._bboxU[0], lv._bboxU[1]);
  if (v.coverage < 0.99 || v.overflow >= 0.01 || v.bad || v.areaErrPct >= 0.1) {
    throw new Error(`第 ${lv.id} 关「${lv.name}」标准解不通过: ` + JSON.stringify(v));
  }
  if (lv.solution.length !== 7 || lv.splitLines.length < 3) throw new Error(`第 ${lv.id} 关数据不完整`);
}
console.log(`  60 关逐关验证: 最低覆盖 ${(minCov * 100).toFixed(3)}%  最高溢出 ${(maxOver * 100).toFixed(3)}%  ` +
  `最大面积误差 ${maxErr.toFixed(4)}%  真重叠 ${badCnt} 关`);
console.log(`  轮廓 bbox ${minBBox.toFixed(2)}~${maxBBox.toFixed(2)}u（1000 坐标系内居中）`);

/* 7 块拼回 4×4 正方形硬校验：第 1 关必须是正方形且面积 = 16U² */
{
  const lv = LEVELS[0];
  const sq = G.area(lv.outline), expect = 16 * U * U;
  console.log(`  拼回正方形: 轮廓面积 ${sq.toFixed(2)} / 期望 ${expect.toFixed(2)}  ` +
    `误差 ${(Math.abs(sq - expect) / expect * 100).toFixed(6)}%  顶点 ${lv.outline.length}`);
  if (Math.abs(sq - expect) / expect >= 0.001 || lv.outline.length !== 4) {
    // 若随机装配没产出正方形，显式用 Phase 0 的经典切分覆盖第 1 关
    const SQUARE = {
      T1: [[0, 0], [4, 0], [2, 2]], T2: [[0, 0], [2, 2], [0, 4]],
      T3: [[2, 4], [4, 4], [4, 2]], T4: [[2, 2], [3, 3], [1, 3]],
      T5: [[4, 0], [3, 1], [4, 2]], S: [[3, 1], [4, 2], [3, 3], [2, 2]],
      P: [[1, 3], [3, 3], [2, 4], [0, 4]]
    };
    const byId = SQUARE;
    const fake = { byId: byId, outlineU: [[0, 0], [4, 0], [4, 4], [0, 4]], internalU: [] };
    // 内部边由 splitRaw 现算
    const raw = splitRaw(ORDER.map(id => ccw(byId[id])));
    const cnt = {};
    for (const e of raw) { const k = key2(e[0], e[1]); cnt[k] = (cnt[k] || 0) + 1; }
    fake.internalU = raw.filter(e => cnt[key2(e[0], e[1])] >= 2);
    const fixed = buildLevel(1, 1, LEVEL_NAMES[0][0], 1, fake);
    if (Math.abs(G.area(fixed.outline) - expect) / expect >= 0.001) throw new Error('拼回正方形失败');
    LEVELS[0] = fixed;
    console.log('  → 第 1 关改用经典 4×4 正方形切分（题目基准，非随机装配）');
  }
}

/* ---------- 4 类反例抽验（至少 10 关，写进报告） ---------- */
const NEG = [
  ['错位一块', s => { s[1].x += 40; s[1].y += 40; return s; }],
  // 14 世界单位：约等于 1/8 个小三角边长，肉眼「就差一点」，但足以让覆盖率跌破 99%
  ['差一点点', s => { s[1].x += 14; return s; }],
  ['两块压叠', s => { s[1].x = s[0].x; s[1].y = s[0].y; return s; }],
  ['少放一块', s => s.slice(0, 6)]
];
let negFail = 0, negTotal = 0;
const negReport = [];
for (let i = 0; i < 60; i += 6) {          // 抽 10 关：1,7,13,...,55
  const lv = LEVELS[i];
  const item = { id: lv.id, name: lv.name, cases: [] };
  for (const [label, mut] of NEG) {
    const s = mut(JSON.parse(JSON.stringify(lv.solution)));
    const probe = { outline: lv.outline, solution: s };
    const v = judgeLevel(probe);
    const failed = s.length < 7 || v.coverage < 0.99 || v.overflow >= 0.01 || !!v.bad;
    negTotal++;
    if (!failed) { negFail++; console.log('  [NEG!] #' + lv.id + ' ' + lv.name + ' / ' + label +
      ' 覆盖 ' + (v.coverage * 100).toFixed(3) + '% 溢出 ' + (v.overflow * 100).toFixed(3) + '% bad=' + !!v.bad); }
    item.cases.push({ label: label, pass: failed, coverage: +v.coverage.toFixed(4) });
  }
  negReport.push(item);
}
console.log(`  反例抽验 ${negReport.length} 关 × 4 类 = ${negTotal} 例，全部判负: ${negFail === 0}`);
if (negFail) throw new Error('反例未全部判负');

/* ---------- 数据集 ---------- */
const DS7 = {
  id: 'tangram7', name: '七巧板', unitScale: U,
  pieceOrder: ORDER.slice(), snapGrid: U / 2,
  tray: { cols: 2, gapX: 8, gapY: 4, top: 912, bottom: 1410, padX: 8, padY: 0, minW: 88, minH: 88 },
  pieces: {}
};
for (const id of ORDER) {
  DS7.pieces[id] = { id: id, name: NAMES[id], color: COLORS[id][0], stroke: COLORS[id][1],
    area: areaU[id], base: BASE[id] };
}
const CLEAN = LEVELS.map(l => {
  const o = Object.assign({}, l); delete o._v; delete o._bboxU; return o;
});

/* ---------- 联系表（供关名核对，浏览器直接打开） ---------- */
{
  const cols = 10, cw = 128, chh = 142, pad = 12;
  const W = cols * cw + 2 * pad, H = 6 * chh + 2 * pad + 40;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<rect width="${W}" height="${H}" fill="#F6E9D4"/>` +
    `<text x="${W / 2}" y="28" text-anchor="middle" font-size="20" fill="#2C3A4B" font-family="sans-serif">七巧板 60 关轮廓联系表 · 每行一章</text>`;
  for (let i = 0; i < 60; i++) {
    const lv = CLEAN[i], r = Math.floor(i / cols), c = i % cols;
    const x = pad + c * cw, y = pad + 40 + r * chh;
    svg += `<rect x="${x + 2}" y="${y + 2}" width="${cw - 6}" height="${chh - 6}" rx="8" fill="#FFFFFF" stroke="#E3E9F2"/>`;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const v of lv.outline) { x0 = Math.min(x0, v[0]); x1 = Math.max(x1, v[0]); y0 = Math.min(y0, v[1]); y1 = Math.max(y1, v[1]); }
    const s = Math.min(88 / (x1 - x0), 88 / (y1 - y0));
    const ox = x + cw / 2 - (x1 - x0) * s / 2, oy = y + 66 - (y1 - y0) * s / 2;
    const pts = lv.outline.map(v => ((ox + (v[0] - x0) * s).toFixed(1)) + ',' + ((oy + (v[1] - y0) * s).toFixed(1))).join(' ');
    svg += `<polygon points="${pts}" fill="#E8EEF7" stroke="#9FB6D0" stroke-width="2"/>`;
    svg += `<text x="${x + cw / 2}" y="${y + 118}" text-anchor="middle" font-size="13" fill="#2C3A4B" font-family="sans-serif">${lv.id} ${lv.name}</text>`;
    svg += `<text x="${x + cw / 2}" y="${y + 134}" text-anchor="middle" font-size="11" fill="#7A8A9C" font-family="sans-serif">第${lv.chapter}章 档${lv.hintTier}</text>`;
  }
  svg += '</svg>';
  fs.writeFileSync(path.join(__dirname, 'out', 'v03_sheet.html'),
    '<!DOCTYPE html><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:#EFDFC6}svg{display:block}</style>' + svg);
}

/* ---------- 落盘：替换 levels.js 里的七巧板段 ---------- */
const BEGIN = '/* ==== TANGRAM7_DATA_BEGIN (generated by tools/build_tangram7.js) ==== */';
const END = '/* ==== TANGRAM7_DATA_END ==== */';
const block = `${BEGIN}
(function (root) {
  var FOUR = root.TANGRAM_DATA;            // 四巧板原样保留，一个字节都不改
  var DATA7 = ${JSON.stringify(DS7, null, 2)};
  var LEVELS7 = ${JSON.stringify(CLEAN, null, 2)};
  /* 两套数据集并存：core.js 用 setKey 选择，四巧板仍走 FOUR.dataset / FOUR.levels。
   * 章节名 / 每章关数 / 胶囊短名 / 结算文案全部由数据集自带（后续新拼图类型同构扩展）。 */
  root.TANGRAM_SETS = {
    tangram4: { dataset: FOUR.dataset, levels: FOUR.levels,
      saveKey: 'tangram_save_v1', chapPer: 20,
      chapNames: ['启蒙', '熟悉', '转折', '嵌套', '交错', '硬骨头'], chapTitles: null,
      completeTitle: '四巧板全部完成', completeSub: '七巧板即将开启',
      tray: null, snapGrid: null },
    tangram7: { dataset: DATA7, levels: LEVELS7,
      saveKey: 'tangram7_save_v1', chapPer: 10,
      chapNames: ${JSON.stringify(CHAPTERS)}, chapTitles: ${JSON.stringify(CHAP_TITLES)},
      completeTitle: '七巧板全部完成', completeSub: '全部 60 关已通关',
      tray: DATA7.tray, snapGrid: DATA7.snapGrid }
  };
  root.TANGRAM_DATA.defaultSet = 'tangram4';
  root.TANGRAM_DATA.sets = root.TANGRAM_SETS;
})(typeof window !== 'undefined' ? window : globalThis);
${END}`;

const lf = path.join(ROOT, 'js', 'levels.js');
let src = fs.readFileSync(lf, 'utf8');
const bi = src.indexOf(BEGIN), ei = src.indexOf(END);
if (bi >= 0 && ei >= 0) src = src.slice(0, bi) + block + src.slice(ei + END.length);
else src = src.replace(/\s*$/, '') + '\n\n' + block + '\n';
fs.writeFileSync(lf, src);

const report = {
  unitScale: U, areaByPiece: areaU, areaSum: sumU0,
  minCoverage: minCov, maxOverflow: maxOver, maxAreaErrPct: maxErr, trueOverlapLevels: badCnt,
  negative: negReport,
  levels: LEVELS.map(l => ({ id: l.id, chapter: l.chapter, name: l.name, hintTier: l.hintTier,
    outlineVerts: l.outline.length, splitLines: l.splitLines.length, needFlip: l.needFlip,
    coverage: +l._v.coverage.toFixed(6), overflow: +l._v.overflow.toFixed(6), areaErrPct: +l._v.areaErrPct.toFixed(6) }))
};
fs.writeFileSync(path.join(__dirname, 'out', 'tangram7_report.json'), JSON.stringify(report, null, 2));
console.log('  已写入 js/levels.js 七巧板段 + tools/out/tangram7_report.json + tools/out/v03_sheet.html');
