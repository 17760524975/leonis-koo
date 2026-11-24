/* 字母 → 严格七巧板解的「局部搜索」：
 *   1) 先用装配生长造一个合法的 7 块解（一定有解）
 *   2) 反复做「换格」：拿掉一个不在字母上的格、补上一个字母上的格，
 *      再跑精确覆盖验证新形状仍可拼 —— 只有可拼的才接受
 *   3) 目标函数 = 落在字母内的格 − 2.2×落在字母外的格 − 0.6×字母没填到的格
 * 这样得到的每个字母：形状尽量贴着参考剪影，同时**一定存在严格解**。
 *
 * 用法：node tools/letters7/search.js [A B ...]
 *      ITER=600 BEAM... 环境变量可调
 * 产出：tools/letters7/letters7_sol.json
 */
'use strict';
const fs = require('fs');
const path = require('path');
const Q = require('./qsolve.js');
const HERE = __dirname;

const TOTAL = 16;
const W_OUT = 2.2, W_MISS = 0.6;

function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function overlapArea(A, B) {
  let out = A.map(v => v.slice());
  for (let i = 0; i < B.length; i++) {
    const p = B[i], q = B[(i + 1) % B.length];
    const dx = q[0] - p[0], dy = q[1] - p[1];
    const side = v => dx * (v[1] - p[1]) - dy * (v[0] - p[0]);
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
  return Math.abs(Q.shoelace(out));
}
function boundaryEdges(polys) {
  const raw = Q.splitRaw(polys);
  const counts = {};
  for (const e of raw) { const k = e[0].join(',') + '|' + e[1].join(','); counts[k] = (counts[k] || 0) + 1; }
  const out = [];
  const seen = new Set();
  for (const e of raw) {
    const k = e[0].join(',') + '|' + e[1].join(',');
    const k2 = e[1].join(',') + '|' + e[0].join(',');
    if (counts[k] !== 1) continue;
    if (seen.has(k2)) continue;
    seen.add(k);
    out.push(e);
  }
  return out;
}

/* ---------- 随机装配（复用 build_tangram7 的装配范式，格子版） ---------- */
function grow(g, rnd, cellSetWanted) {
  const placed = [], used = new Set();
  const first = Q.ORDER[0];
  const shape = Q.orient(Q.BASE[first], Math.floor(rnd() * 4), false);
  const tx = Math.floor(g.ox + 1 + rnd() * Math.max(1, g.nx - 5));
  const ty = Math.floor(g.oy + 1 + rnd() * Math.max(1, g.ny - 5));
  placed.push({ id: first, poly: shape.map(v => [v[0] + tx, v[1] + ty]) });
  used.add(first);
  for (let step = 1; step < 7; step++) {
    const cand = [];
    const bnd = boundaryEdges(placed.map(p => p.poly));
    for (const id of Q.ORDER) {
      if (used.has(id)) continue;
      for (let k = 0; k < 4; k++) for (const f of (id === 'P' ? [false, true] : [false])) {
        const po = Q.orient(Q.BASE[id], k, f);
        for (let ei = 0; ei < po.length; ei++) {
          const a = po[ei], b = po[(ei + 1) % po.length];
          const ex = b[0] - a[0], ey = b[1] - a[1];
          for (const e of bnd) {
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
              for (const old of placed) if (overlapArea(np, old.poly) > 1e-6) { bad = true; break; }
              if (bad) continue;
              const mid = [X[0] + ex / 2 + dy / L * 0.2, X[1] + ey / 2 - dx / L * 0.2];
              if (!Q.inPoly(mid, np)) continue;
              cand.push({ id, poly: np });
            }
          }
        }
      }
    }
    if (!cand.length) return null;
    let pick = cand[Math.floor(rnd() * cand.length)];
    placed.push(pick);
    used.add(pick.id);
  }
  return placed;
}

function buildTarget(letter) {
  const S = Math.sqrt(letter.area / TOTAL);       // px → u
  const uw = letter.w / S, uh = letter.h / S;
  const g = Q.makeGrid(-1, -1, Math.ceil(uw) + 2, Math.ceil(uh) + 2);
  const inMask = new Uint8Array(g.n);
  for (let idx = 0; idx < g.n; idx++) {
    const c = Q.triCenter(g, idx);
    /* triCenter 已经加过网格原点（ox=oy=-1），这里直接乘 S 就是像素坐标 */
    const px = Math.round(c[0] * S), py = Math.round(c[1] * S);
    if (px < 0 || py < 0 || px >= letter.w || py >= letter.h) continue;
    inMask[idx] = letter.rows[py][px] === '1' ? 1 : 0;
  }
  let nMask = 0;
  for (let i = 0; i < g.n; i++) nMask += inMask[i];
  return { g, inMask, nMask, uw, uh };
}

function cellScore(cells, t) {
  let inside = 0, outside = 0, miss = t.nMask;
  const cov = new Uint8Array(t.g.n);
  for (const c of cells) cov[c] = 1;
  for (const c of cells) { if (t.inMask[c]) { inside++; miss--; } else outside++; }
  return { score: inside - W_OUT * outside - W_MISS * miss, inside, outside, miss };
}

function searchLetter(letter, opts) {
  const t = buildTarget(letter);
  const rnd = rng(opts.seed);
  const g = t.g;
  const cache = {};
  const solCache = new Map();

  let best = null;
  const starts = [];
  /* 起点①：fit.js（目标引导束搜索）给出的装配 —— 已经贴形，只是可能不严格 */
  const fitRec = opts.fit && opts.fit[letter.ch];
  if (fitRec) {
    const polys = fitRec.pieces.map(p => ({ id: p.id, poly: p.poly.map(v => v.slice()) }));
    starts.push(polys);
  }
  /* 起点②：随机装配（兜底，fit 缺失时用） */
  for (let k = 0; k < 6; k++) { const g2 = grow(g, rnd); if (g2) starts.push(g2); }
  for (let r = 0; r < starts.length; r++) {
    let placed = starts[r];
    let cells = [];
    for (const p of placed) cells = cells.concat(Q.trisOfPoly(p.poly, g));
    let cur = cellScore(cells, t);
   /* ---- 局部搜索：换格 ---- */
    const iters = opts.iters || 400;
    for (let it = 0; it < iters; it++) {
      const set = new Set(cells);
      /* 候选：字母上的空格 / 字母外的已占格 */
      const addCand = [], delCand = [];
      for (const c of cells) if (!t.inMask[c]) delCand.push(c);
      for (let c = 0; c < g.n; c++) if (!set.has(c) && t.inMask[c]) {
        /* 必须贴着已占格，避免长成碎片 */
        let near = false;
        for (const nb of neighbours(g, c)) if (set.has(nb)) { near = true; break; }
        if (near) addCand.push(c);
      }
      if (!addCand.length || !delCand.length) break;
      const add = addCand[Math.floor(rnd() * addCand.length)];
      const del = delCand[Math.floor(rnd() * delCand.length)];
      const next = cells.filter(c => c !== del).concat([add]);
      if (next.length !== 64) continue;
      const key = next.slice().sort((a, b) => a - b).join(',');
      let sol = solCache.get(key);
      if (sol === undefined) {
        sol = Q.exactCover(Q.maskOf(next), g, { cache: cache });
        solCache.set(key, sol);
      }
      if (!sol) continue;
      const sc = cellScore(next, t);
      if (sc.score >= cur.score) {
        cells = next; cur = sc;
        placed = sol;
        if (!best || sc.score > best.score) best = { score: sc.score, cells: next, placed: sol, stat: sc };
      }
    }
    if (!best) {
      const sc = cellScore(cells, t);
      best = { score: sc.score, cells: cells, placed: placed, stat: sc };
    }
  }
  return { letter: letter.ch, t, best };
}
function neighbours(g, idx) {
  const cell = idx >> 2, q = idx & 3, i = cell % g.nx, j = (cell / g.nx) | 0;
  /* 小三角形相邻：同格内相邻两个 + 跨格同位置（上下左右） */
  const out = [((j * g.nx + i) * 4) + ((q + 1) & 3), ((j * g.nx + i) * 4) + ((q + 3) & 3)];
  const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const d = dirs[q === 0 ? 0 : q === 1 ? 1 : q === 2 ? 2 : 3];
  const ni = i + d[0], nj = j + d[1];
  if (ni >= 0 && nj >= 0 && ni < g.nx && nj < g.ny) out.push(((nj * g.nx + ni) * 4) + q);
  return out.filter(x => x >= 0 && x < g.n);
}

/* ---------------- 主程序 ---------------- */
const letters = JSON.parse(fs.readFileSync(path.join(HERE, 'letters_mask.json'), 'utf8'));
const only = process.argv.slice(2);
const FIT = fs.existsSync(path.join(HERE, 'letters7_fit.json'))
  ? JSON.parse(fs.readFileSync(path.join(HERE, 'letters7_fit.json'), 'utf8')) : {};
const opts = {
  fit: FIT,
  iters: +(process.env.ITER || 500),
  restarts: +(process.env.RESTARTS || 4),
  seed: +(process.env.SEED || 7)
};
const outFile = path.join(HERE, process.env.OUT || 'letters7_sol.json');
const res = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : {};

for (const L of letters) {
  if (only.length && only.indexOf(L.ch) < 0) continue;
  const t0 = Date.now();
  const r = searchLetter(L, opts);
  if (!r.best) { console.log(L.ch + ' 失败'); continue; }
  const b = r.best;
  const info = Q.ringsOf(b.placed.map(p => p.poly));
  const outer = info.loops.slice().sort((a, c2) => Math.abs(Q.shoelace(c2)) - Math.abs(Q.shoelace(a)))[0];
  const outerArea = Math.abs(Q.shoelace(outer));
  console.log(`${L.ch}: 分数 ${b.score.toFixed(1)}  内 ${b.stat.inside} 外 ${b.stat.outside} 漏 ${b.stat.miss}` +
    `  环 ${info.loops.length}  外框顶点 ${outer.length}  面积 ${outerArea.toFixed(2)}  ${Date.now() - t0}ms`);
  res[L.ch] = {
    score: +b.score.toFixed(2),
    stat: b.stat,
    pieces: b.placed.map(p => ({ id: p.id, poly: p.poly.map(v => [Math.round(v[0] * 1e4) / 1e4, Math.round(v[1] * 1e4) / 1e4]) }))
  };
  fs.writeFileSync(outFile, JSON.stringify(res, null, 1));
}
console.log('写出 ' + outFile);
