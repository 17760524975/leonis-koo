/* 剪影多边形 → a 格严格 tiling（精确覆盖求解）
 *
 * 输入 tools/letters7/outline.json（像素坐标的剪影环，外环 + 内孔）
 * 输出 tools/letters7/levels.json（26 关的 outline / holes / solution）
 *
 * 单元 = a（小三角直角边长）。参考图是正立的字母，横平竖直 + 45° 斜边，
 * 所有顶点都在间距 a 的整数格上：
 *   L 大三角 (0,0)(2,0)(0,2)      § 面积 2
 *   M 中三角 (0,0)(2,0)(1,1)      § 1
 *   Q 正方形 (0,0)(1,0)(1,1)(0,1) § 1
 *   S 小三角 (0,0)(1,0)(0,1)      § 0.5
 *   R 平行四边 (0,0)(1,0)(2,1)(1,1) § 1（可镜像）
 * 面积合计 8a²。把单位格切成 4 个小三角（两条对角线），板的边全落在这些边上，
 * 于是「占了多少小三角」精确等于 4×面积，精确覆盖一定存在（原图就是证据）。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const HERE = __dirname;
const UNIT = 96;                    // DATA7.unitScale
const A_GAME = UNIT * Math.SQRT2;   // a 在游戏像素里 ≈135.76

const SHAPE = {
  L: { area: 2, base: [[0, 0], [2, 0], [0, 2]] },
  M: { area: 1, base: [[0, 0], [2, 0], [1, 1]] },
  Q: { area: 1, base: [[0, 0], [1, 0], [1, 1], [0, 1]] },
  S: { area: 0.5, base: [[0, 0], [1, 0], [0, 1]] },
  R: { area: 1, base: [[0, 0], [1, 0], [2, 1], [1, 1]] }
};
const GAME_BY_KEY = { L: ['T1', 'T2'], M: ['T3'], Q: ['S'], S: ['T4', 'T5'], R: ['P'] };
/* 游戏基型（u 单位） */
const GB = {
  T1: [[0, 0], [4, 0], [2, 2]], T2: [[0, 0], [4, 0], [2, 2]],
  T3: [[0, 0], [2, 0], [0, 2]], S: [[1, 0], [2, 1], [1, 2], [0, 1]],
  T4: [[0, 0], [2, 0], [1, 1]], T5: [[0, 0], [2, 0], [1, 1]],
  P: [[1, 0], [3, 0], [2, 1], [0, 1]]
};

/* ---------------- 几何 ---------------- */
function sArea(p) {
  let a = 0;
  for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; }
  return a / 2;
}
const absArea = p => Math.abs(sArea(p));
function rot90(p, k) {
  const c = [1, 0, -1, 0][k], s = [0, 1, 0, -1][k];
  return p.map(v => [c * v[0] - s * v[1], s * v[0] + c * v[1]]);
}
function centroid(poly) {
  const P = sArea(poly) < 0 ? poly.slice().reverse() : poly;
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < P.length; i++) {
    const q = P[(i + 1) % P.length], cr = P[i][0] * q[1] - q[0] * P[i][1];
    a += cr; cx += (P[i][0] + q[0]) * cr; cy += (P[i][1] + q[1]) * cr;
  }
  a /= 2;
  return [cx / (6 * a), cy / (6 * a)];
}
function bbox(p) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const v of p) { x0 = Math.min(x0, v[0]); x1 = Math.max(x1, v[0]); y0 = Math.min(y0, v[1]); y1 = Math.max(y1, v[1]); }
  return [x0, y0, x1, y1];
}
function inPoly(pt, poly) {
  let ins = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if (((yi > pt[1]) !== (yj > pt[1])) && (pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi)) ins = !ins;
  }
  return ins;
}

/* ---------------- 格点拟合：顶点全在「间距 a」的整数格上 ---------------- */
function fitLattice(verts, a0) {
  const wrap = x => x - Math.round(x);
  const phaseOf = vals => {
    let sx = 0, sy = 0;
    for (const v of vals) { const t = v * 2 * Math.PI; sx += Math.cos(t); sy += Math.sin(t); }
    const t = Math.atan2(sy, sx) / (2 * Math.PI);
    return t - Math.round(t);
  };
  const resAt = a => {
    const px = phaseOf(verts.map(v => v[0] / a)), py = phaseOf(verts.map(v => v[1] / a));
    let s = 0;
    for (const v of verts) s += Math.max(Math.abs(wrap(v[0] / a - px)), Math.abs(wrap(v[1] / a - py)));
    return { res: s / verts.length, px, py };
  };
  let best = null;
  for (let a = a0 * 0.94; a <= a0 * 1.06; a += a0 * 0.00015) {
    const r = resAt(a);
    if (!best || r.res < best.res) best = { a, ...r };
  }
  return best;
}

/* ---------------- 精确覆盖（4 小三角/格） ---------------- */
const TQ = [[0.5, 5 / 6], [5 / 6, 0.5], [0.5, 1 / 6], [1 / 6, 0.5]];
function makeGrid(x0, y0, nx, ny) { return { x0, y0, nx, ny, n: nx * ny * 4 }; }
function trisOfPoly(poly, g, out) {
  const bb = bbox(poly);
  const i0 = Math.max(0, Math.floor(bb[0] - g.x0)), i1 = Math.min(g.nx - 1, Math.ceil(bb[2] - g.x0));
  const j0 = Math.max(0, Math.floor(bb[1] - g.y0)), j1 = Math.min(g.ny - 1, Math.ceil(bb[3] - g.y0));
  const set = out || new Set();
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) for (let q = 0; q < 4; q++) {
    const cx = g.x0 + i + TQ[q][0], cy = g.y0 + j + TQ[q][1];
    if (inPoly([cx, cy], poly)) set.add(((j * g.nx + i) * 4) + q);
  }
  return set;
}
function maskOf(idxs) {
  let m = 0n;
  for (const k of idxs) m |= 1n << BigInt(k);
  return m;
}
function popcount(x) { let n = 0; while (x) { x &= x - 1n; n++; } return n; }

function placements(key, g) {
  const t = SHAPE[key];
  const out = [];
  const seen = new Set();
  for (const flip of (key === 'R' ? [false, true] : [false])) {
    const base = flip ? t.base.map(v => [-v[0], v[1]]) : t.base;
    for (let k = 0; k < 4; k++) {
      const sh = rot90(base, k);
      const bb = bbox(sh);
      for (let ty = Math.ceil(g.y0 - bb[1]); ty <= Math.floor(g.y0 + g.ny - bb[3]); ty++) {
        for (let tx = Math.ceil(g.x0 - bb[0]); tx <= Math.floor(g.x0 + g.nx - bb[2]); tx++) {
          const poly = sh.map(v => [v[0] + tx, v[1] + ty]);
          const idxs = trisOfPoly(poly, g);
          if (idxs.size !== t.area * 4) continue;
          const m = maskOf(idxs);
          const sk = m.toString();
          if (seen.has(sk)) continue;
          seen.add(sk);
          out.push({ key, flip, k, poly, mask: m });
        }
      }
    }
  }
  return out;
}

function solveCover(target, g, keys) {
  const byKey = {};
  for (const k of keys) byKey[k] = placements(k, g).filter(p => (p.mask & ~target) === 0n);
  const used = new Array(keys.length).fill(false);
  const sol = [];
  const order = keys.map((k, i) => i).sort((x, y) => byKey[keys[x]].length - byKey[keys[y]].length);
  function rec(cov) {
    if (cov === target) return true;
    if (sol.length === keys.length) return false;
    const rest = target & ~cov;
    // 选一个候选最少的空格
    let b = 0n, bestCnt = 1e9;
    let tmp = rest, guard = 0;
    while (tmp && guard++ < 400) {
      const low = tmp & -tmp, idx = low.toString(2).length - 1;
      let cnt = 0;
      for (let i = 0; i < keys.length; i++) {
        if (used[i]) continue;
        for (const p of byKey[keys[i]]) {
          if ((p.mask & low) && (p.mask & ~rest) === 0n) { cnt++; if (cnt > 1) break; }
        }
        if (cnt > 1) break;
      }
      if (cnt < bestCnt) { bestCnt = cnt; b = low; }
      if (cnt === 0) return false;
      tmp &= tmp - 1n;
    }
    if (!bestCnt) return false;
    for (let i = 0; i < keys.length; i++) {
      if (used[i]) continue;
      for (const p of byKey[keys[i]]) {
        if (!(p.mask & b)) continue;
        if ((p.mask & ~rest) !== 0n) continue;
        used[i] = true; sol.push({ i, p });
        if (rec(cov | p.mask)) return true;
        sol.pop(); used[i] = false;
      }
    }
    return false;
  }
  return rec(0n) ? sol.slice() : null;
}

/* ---------------- a 格形状 → 游戏 (angle, flipped) ---------------- */
/* 游戏里世界顶点 = R(θ)·F·base_u；a 格顶点（整数）对应世界 = R(θ)·F·base_u/√2 */
const ANGLE_MAP = (() => {
  const map = {};
  for (const key in SHAPE) {
    const ids = GAME_BY_KEY[key];
    const id = ids[0];
    for (const flip of (key === 'R' ? [false, true] : [false])) {
      const base = flip ? SHAPE[key].base.map(v => [-v[0], v[1]]) : SHAPE[key].base;
      for (let k = 0; k < 4; k++) {
        const aShape = rot90(base, k).map(v => [+v[0].toFixed(6), +v[1].toFixed(6)]);
        // 找 θ ∈ {0,45,...} 与 flipG 使 R(θ)·F·base_u/√2 与 aShape 同形
        let found = null;
        for (let th = 0; th < 360 && !found; th += 45) {
          for (const fg of ([false, true])) {
            const gb = fg ? GB[id].map(v => [-v[0], v[1]]) : GB[id];
            const rad = th * Math.PI / 180, c = Math.cos(rad), s2 = Math.sin(rad);
            const world = gb.map(v => [(v[0] * c - v[1] * s2) / Math.SQRT2, (v[0] * s2 + v[1] * c) / Math.SQRT2]);
            if (sameShape(world, aShape)) { found = { th, fg }; break; }
          }
        }
        map[key + '|' + k + '|' + (flip ? 1 : 0)] = found;
      }
    }
  }
  return map;
})();
function sameShape(A, B) {
  if (A.length !== B.length) return false;
  const norm = P => {
    const c = centroid(P);
    return P.map(v => [+(v[0] - c[0]).toFixed(3), +(v[1] - c[1]).toFixed(3)])
      .sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  };
  const a = norm(A), b = norm(B);
  for (let i = 0; i < a.length; i++) if (Math.hypot(a[i][0] - b[i][0], a[i][1] - b[i][1]) > 0.02) return false;
  return true;
}

/* ---------------- 主流程 ---------------- */
const data = JSON.parse(fs.readFileSync(path.join(HERE, 'outline.json'), 'utf8'));
const levels = [];
let fail = 0;

for (const rec of data) {
  const outer = rec.rings[0].poly;
  const holes = rec.rings.slice(1).map(r => r.poly);
  const a0 = Math.sqrt((rec.rings[0].area + rec.rings.slice(1).reduce((s, r) => s + r.area, 0)) / 8);
  const allV = outer.concat(...holes);
  const fit = fitLattice(allV, a0);
  // 吸附到整数格
  const snap = p => p.map(v => [Math.round(v[0] / fit.a - fit.px) + fit.px, Math.round(v[1] / fit.a - fit.py) + fit.py]);
  let oS = snap(outer), hS = holes.map(snap);
  // 去重 + 去共线
  const clean = p => {
    const out = [];
    for (let i = 0; i < p.length; i++) {
      const a = out.length ? out[out.length - 1] : p[(i - 1 + p.length) % p.length];
      if (a[0] === p[i][0] && a[1] === p[i][1]) continue;
      out.push(p[i]);
    }
    const res = [];
    for (let i = 0; i < out.length; i++) {
      const a = out[(i - 1 + out.length) % out.length], b = out[i], c = out[(i + 1) % out.length];
      const cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
      if (Math.abs(cr) > 1e-9) res.push(b);
    }
    return res.length >= 3 ? res : out;
  };
  oS = clean(oS); hS = hS.map(clean);
  // 45° 校验：所有边必须水平/垂直/45°
  const badEdge = (p) => {
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      const dx = Math.abs(b[0] - a[0]), dy = Math.abs(b[1] - a[1]);
      if (!(dx === 0 || dy === 0 || dx === dy)) return `${a}->${b}`;
    }
    return null;
  };
  const netArea = absArea(oS) - hS.reduce((s, p) => s + absArea(p), 0);

  /* 精确覆盖 */
  const bb = bbox(oS);
  const g = makeGrid(bb[0] - 1, bb[1] - 1, Math.ceil(bb[2] - bb[0]) + 3, Math.ceil(bb[3] - bb[1]) + 3);
  let target = maskOf(trisOfPoly(oS, g));
  for (const h of hS) for (const t of trisOfPoly(h, g)) target &= ~(1n << BigInt(t));
  const keys = ['L', 'L', 'M', 'Q', 'R', 'S', 'S'];
  const okCount = popcount(target) === 32;
  const sol = okCount ? solveCover(target, g, keys) : null;

  const okLattice = fit.res < 0.10;
  const okArea = Math.abs(netArea - 8) < 1e-9;
  const okEdge = !badEdge(oS) && !hS.some(h => badEdge(h));
  const tag = (okLattice && okArea && okEdge && sol) ? 'OK' : '✗';
  if (tag === '✗') fail++;
  console.log(rec.ch, tag, 'a=' + fit.a.toFixed(3), '残差=' + fit.res.toFixed(3),
    '净面积=' + netArea.toFixed(2), '小三角=' + popcount(target), '解=' + (sol ? '有' : '无'),
    okEdge ? '' : '✗边' + badEdge(oS) + (hS.map(badEdge).find(Boolean) || ''));

  if (!sol) { levels.push({ ch: rec.ch, ok: false }); continue; }
  /* 输出：a 格顶点 → 游戏像素 */
  const outPieces = sol.map((s, idx) => {
    const key = s.p.key, id = GAME_BY_KEY[key][idx <= 0 ? 0 : 0];
    const m = ANGLE_MAP[key + '|' + (s.p.k) + '|' + (s.p.flip ? 1 : 0)];
    const c = centroid(s.p.poly);
    return { key, id, angle: m.th, flipped: m.fg, cx: c[0], cy: c[1], poly: s.p.poly };
  });
  // 每种板型的 id 分配（T1/T2、T4/T5 各两块）
  const idPool = { L: ['T1', 'T2'], S: ['T4', 'T5'], M: ['T3'], Q: ['S'], R: ['P'] };
  const usedId = {};
  for (const p of outPieces) {
    const pool = idPool[p.key];
    p.id = pool[usedId[p.key] || 0] || pool[0];
    usedId[p.key] = (usedId[p.key] || 0) + 1;
  }
  levels.push({ ch: rec.ch, ok: true, a: fit.a, phase: [fit.px, fit.py],
    outer: oS, holes: hS, pieces: outPieces, netArea, lapRes: fit.res });
}

fs.writeFileSync(path.join(HERE, 'levels.json'), JSON.stringify(levels, null, 1));
console.log('\n失败', fail, '/', levels.length);
