/* 用「目标引导」的装配搜索，把 7 块七巧板拟合到参考图的 26 个字母剪影上。
 *
 * 为什么不用精确覆盖：参考图是插画，逐块面积偏离 ±12%，不存在严丝合缝的精确解
 * （tools/alpha/README-字母关卡.md 已论证）。这里改成「软目标」：
 *   · 目标 = 参考图里该字母的像素掩码，按「每块板面积 16u²」归一化到 u 网格
 *   · 候选 = 7 块板在整数格上边对边附着（沿用 build_tangram7 的装配范式，必然合法）
 *   · 打分 = 落在字母内的格数 − 2.2 × 落在字母外的格数 − 0.8 × 没填到的格数
 *   · 搜索 = 束搜索（beam search），每步保留分数最高的 B 个中间状态
 * 产出 letters7_fit.json：每字母 7 块板的多边形（u 整数坐标）+ 分数，供 build.js 出关。
 *
 * 用法：node tools/letters7/fit.js [A B C ...]   （不给参数 = 全部 26 个）
 */
const fs = require('fs');
const path = require('path');
const G = require('../../js/geom.js');
const HERE = __dirname;

const BASE = {
  T1: [[0, 0], [4, 0], [2, 2]],
  T2: [[0, 0], [4, 0], [2, 2]],
  T3: [[0, 0], [2, 0], [0, 2]],
  S: [[1, 0], [2, 1], [1, 2], [0, 1]],
  T4: [[0, 0], [2, 0], [1, 1]],
  T5: [[0, 0], [2, 0], [1, 1]],
  P: [[1, 0], [3, 0], [2, 1], [0, 1]]
};
const ORDER = ['T1', 'T2', 'T3', 'S', 'P', 'T4', 'T5'];
const AREA = {};
for (const id of ORDER) AREA[id] = Math.abs(shoelace(BASE[id]));
const TOTAL = ORDER.reduce((s, id) => s + AREA[id], 0);   // 16

function shoelace(p) {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const q = p[(i + 1) % p.length];
    a += p[i][0] * q[1] - q[0] * p[i][1];
  }
  return a / 2;
}
function ccw(p) { return shoelace(p) > 0 ? p.slice() : p.slice().reverse(); }
function orient(base, k, flip) {
  const c = [1, 0, -1, 0][k], s = [0, 1, 0, -1][k], fx = flip ? -1 : 1;
  return ccw(base.map(v => [c * (v[0] * fx) - s * v[1], s * (v[0] * fx) + c * v[1]]));
}
function overlapArea(A, B) {   // 凸多边形交面积（Sutherland–Hodgman）
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
  return Math.abs(shoelace(out));
}
function r6(v) { return Math.round(v * 1e6) / 1e6; }
function key2(a, b) {
  const A = r6(a[0]) + ',' + r6(a[1]), B = r6(b[0]) + ',' + r6(b[1]);
  return A < B ? A + '|' + B : B + '|' + A;
}
function onSeg(p, a, b) {
  const cr = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
  if (Math.abs(cr) > 1e-7) return false;
  const dt = (p[0] - a[0]) * (p[0] - b[0]) + (p[1] - a[1]) * (p[1] - b[1]);
  return dt <= 1e-7;
}
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
        raw.push([[a[0] + dx * ts[k], a[1] + dy * ts[k]],
          [a[0] + dx * ts[k + 1], a[1] + dy * ts[k + 1]]]);
      }
    }
  }
  return raw;
}
/* 返回所有边界环（外轮廓 + 内孔）。外环按 CCW、孔按 CW —— 依赖 splitRaw 保持
 * 各板自身的绕向（ccw(base) 后仍是 CCW），所以「内部共用边」抵消后，
 * 外轮廓仍然是 CCW、孔是 CW。面积符号可用来区分。 */
function loopsOf(polys) {
  const raw = splitRaw(polys);
  const counts = {};
  for (const e of raw) { const k = key2(e[0], e[1]); counts[k] = (counts[k] || 0) + 1; }
  const boundary = raw.filter(e => counts[key2(e[0], e[1])] === 1);
  const internal = raw.filter(e => counts[key2(e[0], e[1])] >= 2);
  const vk = v => r6(v[0]) + ',' + r6(v[1]);
  const outMap = {};
  for (const e of boundary) (outMap[vk(e[0])] = outMap[vk(e[0])] || []).push(e);
  const used = new Set();
  const loops = [];
  for (const e0 of boundary) {
    if (used.has(key2(e0[0], e0[1]))) continue;
    const loop = [];
    let cur = e0;
    for (let guard = 0; guard <= boundary.length + 4; guard++) {
      loop.push(cur[0]);
      used.add(key2(cur[0], cur[1]));
      const outs = (outMap[vk(cur[1])] || []).filter(x => !used.has(key2(x[0], x[1])));
      if (!outs.length) break;
      const nxt = outs[0];
      if (vk(nxt[1]) === vk(loop[0])) { loop.push(nxt[0]); used.add(key2(nxt[0], nxt[1])); break; }
      cur = nxt;
    }
    if (loop.length >= 3) loops.push(loop);
  }
  const simp = loops.map(loop => {
    const out = [];
    for (let i = 0; i < loop.length; i++) {
      const a = loop[(i - 1 + loop.length) % loop.length], b = loop[i], c = loop[(i + 1) % loop.length];
      const cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
      if (Math.abs(cr) > 1e-7) out.push(b);
    }
    return out.length >= 3 ? out : loop;
  });
  return { loops: simp, internal: internal };
}

/* ---------------- 目标掩码 → 打分网格 ---------------- */
const H = 0.35;                       // 网格步长（u）
function makeTarget(letter) {
  const rows = letter.rows, w = letter.w, h = letter.h;
  const S = Math.sqrt(letter.area / TOTAL);      // 像素 → u
  const uw = w / S, uh = h / S;
  const gw = Math.ceil(uw / H) + 2, gh = Math.ceil(uh / H) + 2;
  const inside = new Uint8Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
    const ux = (gx + 0.5) * H, uy = (gy + 0.5) * H;
    const px = Math.round(ux * S), py = Math.round(uy * S);
    if (px < 0 || py < 0 || px >= w || py >= h) continue;
    inside[gy * gw + gx] = rows[py][px] === '1' ? 1 : 0;
  }
  let n = 0;
  for (let i = 0; i < inside.length; i++) n += inside[i];
  return { gw, gh, H, inside, n, uw, uh };
}

function cellsOf(poly, t) {
  const out = [];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const v of poly) {
    if (v[0] < x0) x0 = v[0]; if (v[0] > x1) x1 = v[0];
    if (v[1] < y0) y0 = v[1]; if (v[1] > y1) y1 = v[1];
  }
  const gx0 = Math.max(0, Math.floor(x0 / t.H)), gx1 = Math.min(t.gw - 1, Math.ceil(x1 / t.H));
  const gy0 = Math.max(0, Math.floor(y0 / t.H)), gy1 = Math.min(t.gh - 1, Math.ceil(y1 / t.H));
  for (let gy = gy0; gy <= gy1; gy++) for (let gx = gx0; gx <= gx1; gx++) {
    const cx = (gx + 0.5) * t.H, cy = (gy + 0.5) * t.H;
    if (G.pointInPoly([cx, cy], poly)) out.push(gy * t.gw + gx);
  }
  return out;
}

/* ---------------- 束搜索 ---------------- */
const W_OUT = 2.2, W_MISS = 0.8;
function pieceScore(cells, cov, t) {
  let inN = 0, outN = 0;
  for (const c of cells) {
    if (cov[c]) return null;                 // 与已放置的板重叠
    if (t.inside[c]) inN++; else outN++;
  }
  if (!cells.length) return null;
  return inN - W_OUT * outN;
}

function fitLetter(letter, opts) {
  const t = makeTarget(letter);
  const B = opts.beam, nPieces = ORDER.length;
  const zero = new Uint8Array(t.gw * t.gh);

  /* 第一块（T1）位置枚举：字母包围盒内 1u 网格 × 8 姿态 */
  let seeds = [];
  const seenSeed = new Set();
  for (let k = 0; k < 4; k++) for (const f of [false, true]) {
    const base = orient(BASE.T1, k, f);
    for (let ty = -1; ty <= Math.ceil(t.uh) + 1; ty++) {
      for (let tx = -1; tx <= Math.ceil(t.uw) + 1; tx++) {
        const poly = base.map(v => [v[0] + tx, v[1] + ty]);
        const cells = cellsOf(poly, t);
        const sc = pieceScore(cells, zero, t);
        if (sc === null) continue;
        const sig = poly.map(v => v.join(',')).join(';');
        if (seenSeed.has(sig)) continue;
        seenSeed.add(sig);
        seeds.push({ polys: [poly], ids: ['T1'], cov: cells.slice(), score: sc, cells: cells });
      }
    }
  }
  seeds.sort((a, b) => b.score - a.score);
  let beam = seeds.slice(0, B).map(s => ({ ids: ['T1'], polys: [s.polys[0]], covArr: mkCov(s.cells, t), score: s.score }));
  console.log(`  ${letter.ch}: 目标 ${t.n} 格（${t.uw.toFixed(1)}×${t.uh.toFixed(1)}u），种子 ${seeds.length} → 保留 ${beam.length}`);

  for (let step = 1; step < nPieces; step++) {
    const id = ORDER[step];
    let cands = [];
    const seen = new Set();
    const cnt = { edgeMatch: 0, overlap: 0, noCells: 0, nullScore: 0, notOut: 0, ok: 0 };
    for (const st of beam) {
      const info = loopsOf(st.polys);
      if (!info.loops.length) { if (process.env.DBG) console.log('    [DBG] 状态无环'); continue; }
      if (process.env.DBG) console.log('    [DBG] 状态环=' + info.loops.length + ' 边界边=' + boundaryEdges(st.polys).length);
      const boundary = boundaryEdges(st.polys);
      for (let k = 0; k < 4; k++) for (const f of [false, true]) {
        const po = orient(BASE[id], k, f);
        for (let ei = 0; ei < po.length; ei++) {
          const a = po[ei], b = po[(ei + 1) % po.length];
          const ex = b[0] - a[0], ey = b[1] - a[1];
          for (const e of boundary) {
            const p = e[0], q = e[1];
            const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy);
            if (L < 1e-9) continue;
            const cr = ex * dy - ey * dx, dt = ex * dx + ey * dy;
            if (Math.abs(cr) > 1e-7 || dt >= -1e-7) continue;
            const lam = Math.hypot(ex, ey) / L;
            if (lam > 1 + 1e-7) continue;
            cnt.edgeMatch++;
            for (const tt of [lam, 1, (lam + 1) / 2]) {
              if (tt < lam - 1e-9 || tt > 1 + 1e-9) continue;
              const X = [p[0] + dx * tt, p[1] + dy * tt];
              const T = [X[0] - a[0], X[1] - a[1]];
              const np = po.map(v => [v[0] + T[0], v[1] + T[1]]);
              const sig = st.polys.length + '|' + np.map(v => r6(v[0]) + ',' + r6(v[1])).join(';') +
                '|' + st.ids.join('');
              if (seen.has(sig)) continue;
              let bad = false;
              for (const old of st.polys) if (overlapArea(np, old) > 1e-6) { bad = true; break; }
              if (bad) { cnt.overlap++; continue; }
              const cells = cellsOf(np, t);
              if (!cells.length) { cnt.noCells++; continue; }
              const inc = pieceScore(cells, st.covArr, t);
              if (inc === null) { cnt.nullScore++; continue; }
              /* 必须挂在外侧（防止填进凹口）：沿「轮廓边方向」的法线外侧取一点，
               * 必须落在新板内部。（用板边方向会取到反侧，导致一块都长不出来） */
              /* 沿「板边」走一半（板的边可能比轮廓边短），再朝轮廓外侧 0.2 抬出去。
               * 轮廓边 CCW ⇒ 内侧在左、外侧是右法线 (dy,-dx)/L。 */
              const mid = [X[0] + ex / 2 + dy / L * 0.2, X[1] + ey / 2 - dx / L * 0.2];
              if (!G.pointInPoly(mid, np)) { cnt.notOut++; continue; }
              cnt.ok++;
              seen.add(sig);
              cands.push({ st: st, id: id, poly: np, inc: inc, cells: cells });
            }
          }
        }
      }
    }
    if (process.env.DBG) console.log('    [DBG] 原始候选 ' + cands.length + ' ' + JSON.stringify(cnt));
    cands.sort((x, y) => (y.st.score + y.inc) - (x.st.score + x.inc));
    const next = [];
    for (const c of cands) {
      const covArr = Uint8Array.from(c.st.covArr);
      for (const cc of c.cells) covArr[cc] = 1;
      next.push({ ids: c.st.ids.concat(c.id), polys: c.st.polys.concat([c.poly]),
        covArr: covArr, score: c.st.score + c.inc });
      if (next.length >= B) break;
    }
    if (!next.length) { console.log('    step ' + step + ' 无候选'); return null; }
    beam = next;
    console.log(`    step ${step} ${id}: 候选 ${cands.length}，保留 ${beam.length}，最佳 ${beam[0].score.toFixed(2)}`);
  }

  /* 终评：补上「没填到的目标格」惩罚 */
  let best = null;
  for (const st of beam) {
    let miss = 0;
    for (let i = 0; i < t.inside.length; i++) if (t.inside[i] && !st.covArr[i]) miss++;
    const sc = st.score - W_MISS * miss;
    const rec = { ids: st.ids, polys: st.polys, score: sc, miss: miss, target: t.n };
    if (!best || sc > best.score) best = rec;
  }
  return { letter: letter.ch, best: best, t: t };
}

function mkCov(cells, t) {
  const a = new Uint8Array(t.gw * t.gh);
  for (const c of cells) a[c] = 1;
  return a;
}
function boundaryEdges(polys) {
  const raw = splitRaw(polys);
  const counts = {};
  for (const e of raw) { const k = key2(e[0], e[1]); counts[k] = (counts[k] || 0) + 1; }
  return raw.filter(e => counts[key2(e[0], e[1])] === 1);
}

if (process.env.SELFTEST) {
  const P = [[0, 0], [4, 0], [2, 2]];
  const raw = splitRaw([P]);
  const counts = {};
  for (const e of raw) { const k = key2(e[0], e[1]); counts[k] = (counts[k] || 0) + 1; }
  console.log('counts', JSON.stringify(counts));
  console.log('boundary', raw.filter(e => counts[key2(e[0], e[1])] === 1).length);
  console.log('splitRaw', JSON.stringify(raw));
  console.log('loops', JSON.stringify(loopsOf([P])));
  process.exit(0);
}
/* ---------------- 主程序 ---------------- */
const letters = JSON.parse(fs.readFileSync(path.join(HERE, 'letters_mask.json'), 'utf8'));
const only = process.argv.slice(2);
const beam = +(process.env.BEAM || 36);
const outFile = path.join(HERE, process.env.OUT || 'letters7_fit.json');
const prev = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : {};
const res = Object.assign({}, prev);

for (const L of letters) {
  if (only.length && only.indexOf(L.ch) < 0) continue;
  console.log('== ' + L.ch + ' ==');
  const r = fitLetter(L, { beam: beam });
  if (!r) { console.log('  ' + L.ch + ' 失败'); continue; }
  const info = loopsOf(r.best.polys);
  const polyArea = Math.abs(shoelace(info.loops[0] || [[0, 0], [1, 0], [1, 1]]));
  console.log(`  → 分数 ${r.best.score.toFixed(2)}  漏填 ${r.best.miss}/${r.best.target}  环 ${info.loops.length} 个  外框顶点 ${(info.loops[0] || []).length}`);
  res[L.ch] = {
    pieces: r.best.ids.map((id, i) => ({ id: id, poly: r.best.polys[i].map(v => [r6(v[0]), r6(v[1])]) })),
    score: +r.best.score.toFixed(3), miss: r.best.miss, targetCells: r.best.target
  };
  fs.writeFileSync(outFile, JSON.stringify(res, null, 1));
}
console.log('写出 ' + outFile);
