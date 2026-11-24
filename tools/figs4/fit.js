/* 四巧板剪影拟合器（连续位置优化）
 *
 * 用法：node tools/figs4/fit.js
 *   读 tools/figs4/out/poly.json，写 tools/figs4/out/fitted.json
 *
 * 思路：把「找到四块摆法」当成优化问题，而不是几何构造问题。
 *   剪影栅格化成掩膜（0.04u/格）；四块板各 16 个朝向（45° 步进 × 镜像，去重）；
 *   目标 = 覆盖剪影的格数 − 3×越界格数 − 6×两两重叠格数；
 *   贪心初始化（增量打分）→ 逐块「换朝向 + 位置下降」→ 少量随机重启取最优。
 * 产出直接拿「四块并集」当关卡轮廓 —— 优化到什么程度，关卡都一定可解。
 */
const fs = require('fs');
const path = require('path');
const E = require('../enumerate.js');
const { DEFS, area, centroidOf, inPoly, hasOverlap, unionOutline, simplify, bbox } = E;

const HERE = __dirname;
const OUT = path.join(HERE, 'out');
const IDS = ['A', 'B', 'C', 'D'];

const RES = 0.04;
const PAD = 0.6;
const LAMBDA_OUT = 3.0;
const LAMBDA_OVL = 6.0;

function variantsAll() {
  const out = {};
  for (const id of IDS) {
    const c0 = centroidOf(DEFS[id]);
    const list = [];
    const seen = new Set();
    for (let k = 0; k < 8; k++) {
      for (const flip of [false, true]) {
        const a = k * Math.PI / 4, ca = Math.cos(a), sa = Math.sin(a);
        const poly = DEFS[id].map(v => {
          const x = flip ? -(v[0] - c0[0]) : (v[0] - c0[0]);
          const y = v[1] - c0[1];
          return [x * ca - y * sa, x * sa + y * ca];
        });
        const key = poly.map(v => Math.round(v[0] * 1e4) + ',' + Math.round(v[1] * 1e4)).sort().join(';');
        if (seen.has(key)) continue;
        seen.add(key);
        const bb = bbox(poly);
        const w = Math.ceil((bb[2] - bb[0]) / RES) + 2;
        const h = Math.ceil((bb[3] - bb[1]) / RES) + 2;
        const px = [];
        for (let gy = 0; gy < h; gy++) {
          for (let gx = 0; gx < w; gx++) {
            const x = bb[0] - RES + (gx + 0.5) * RES;
            const y = bb[1] - RES + (gy + 0.5) * RES;
            if (inPoly([x, y], poly)) px.push(gx, gy);
          }
        }
        list.push({ id, angle: k * 45, flip, poly, px, ox: bb[0] - RES, oy: bb[1] - RES });
      }
    }
    out[id] = list;
  }
  return out;
}

function makeField(target) {
  const bb = bbox(target);
  const x0 = bb[0] - PAD, y0 = bb[1] - PAD;
  const W = Math.ceil((bb[2] - bb[0] + 2 * PAD) / RES) + 2;
  const H = Math.ceil((bb[3] - bb[1] + 2 * PAD) / RES) + 2;
  const S = new Uint8Array(W * H);
  let inN = 0;
  for (let gy = 0; gy < H; gy++) {
    const y = y0 + (gy + 0.5) * RES;
    for (let gx = 0; gx < W; gx++) {
      const x = x0 + (gx + 0.5) * RES;
      if (inPoly([x, y], target)) { S[gy * W + gx] = 1; inN++; }
    }
  }
  return { W, H, x0, y0, S, inN, bb };
}

/* 计算某块在 (px,py) 覆盖的格（写入 out 数组，返回个数） */
function fillCells(v, px, py, F, out) {
  const gx0 = Math.round((px + v.ox - F.x0) / RES);
  const gy0 = Math.round((py + v.oy - F.y0) / RES);
  let n = 0;
  for (let i = 0; i < v.px.length; i += 2) {
    const X = gx0 + v.px[i], Y = gy0 + v.px[i + 1];
    if (X < 0 || Y < 0 || X >= F.W || Y >= F.H) continue;
    out[n++] = Y * F.W + X;
  }
  return n;
}

/* 增量代价：只算「新放这一块」引起的三项变化 */
function deltaScore(cells, n, occ, F) {
  let hit = 0, out = 0, ovl = 0;
  for (let i = 0; i < n; i++) {
    const c = cells[i];
    if (occ[c] > 0) { ovl++; continue; }
    if (F.S[c]) hit++; else out++;
  }
  return hit - LAMBDA_OUT * out - LAMBDA_OVL * ovl;
}

function main() {
  const raw = JSON.parse(fs.readFileSync(path.join(OUT, 'poly.json'), 'utf8'));
  const S = require('./solve.js');
  const V = variantsAll();
  const result = {};
  const buf = new Int32Array(400000);

  for (const tag of Object.keys(raw)) {
    const p = S.cleanPoly(raw[tag].poly.map(v => [v[0], v[1]]), 0.03, 0.04);
    const rc = S.rectifyFull(p);
    const target = S.normalizeArea(rc.poly);
    const F = makeField(target);
    const bb = F.bb;
    console.log(`\n[${tag}] 掩膜 ${F.W}×${F.H}（剪影 ${F.inN} 格）`);

    const t0 = Date.now();
    let best = null;

    const RESTART = 4;
    for (let rs = 0; rs < RESTART; rs++) {
      const order = rs === 0 ? ['A', 'D', 'C', 'B']
        : (rs === 1 ? ['D', 'B', 'A', 'C'] : IDS.slice().sort(() => Math.random() - 0.5));
      const occ = new Int16Array(F.W * F.H);
      const state = [];
      let okAll = true;
      for (const id of order) {
        let bestPl = null, bestScore = -1e9;
        const step0 = rs === 0 ? 0.1 : 0.15;
        for (const v of V[id]) {
          for (let px = bb[0] - 0.35; px <= bb[2] + 0.35; px += step0) {
            for (let py = bb[1] - 0.35; py <= bb[3] + 0.35; py += step0) {
              const n = fillCells(v, px, py, F, buf);
              if (n < 3) continue;
              const sc = deltaScore(buf, n, occ, F);
              if (sc > bestScore) { bestScore = sc; bestPl = { v, px, py, cells: Array.from(buf.subarray(0, n)) }; }
            }
          }
        }
        if (!bestPl) { okAll = false; break; }
        for (const c of bestPl.cells) occ[c]++;
        state.push(bestPl);
      }
      if (!okAll) continue;

      // 位置/朝向下降
      let cur = 0;
      {
        const o2 = new Int16Array(F.W * F.H);
        for (const s of state) for (const c of s.cells) o2[c]++;
        let hit = 0, out = 0, ovl = 0;
        for (let c = 0; c < o2.length; c++) {
          if (!o2[c]) continue;
          if (o2[c] > 1) ovl++;
          if (F.S[c]) { if (o2[c] === 1) hit++; } else out++;
        }
        cur = hit - LAMBDA_OUT * out - LAMBDA_OVL * ovl;
      }
      const passes = [
        { span: 0.32, step: 0.08 },
        { span: 0.16, step: 0.04 },
        { span: 0.08, step: 0.02 },
      ];
      for (let iter = 0; iter < 6; iter++) {
        const cfg = passes[Math.min(iter, passes.length - 1)];
        let improved = false;
        for (let k = 0; k < 4; k++) {
          const id = state[k].v.id;
          // 先把这块从占位里拿掉
          for (const c of state[k].cells) occ[c]--;
          let bestPl = state[k], bestSc = -1e9;
          for (const v of V[id]) {
            for (let dx = -cfg.span; dx <= cfg.span + 1e-9; dx += cfg.step) {
              for (let dy = -cfg.span; dy <= cfg.span + 1e-9; dy += cfg.step) {
                const px = state[k].px + dx, py = state[k].py + dy;
                const n = fillCells(v, px, py, F, buf);
                if (n < 3) continue;
                const sc = deltaScore(buf, n, occ, F);
                if (sc > bestSc) { bestSc = sc; bestPl = { v, px, py, cells: Array.from(buf.subarray(0, n)) }; }
              }
            }
          }
          for (const c of bestPl.cells) occ[c]++;
          state[k] = bestPl;
        }
        // 重算总分
        let tot = 0;
        {
          const o2 = new Int16Array(F.W * F.H);
          for (const s of state) for (const c of s.cells) o2[c]++;
          let hit = 0, out = 0, ovl = 0;
          for (let c = 0; c < o2.length; c++) {
            if (!o2[c]) continue;
            if (o2[c] > 1) ovl++;
            if (F.S[c]) { if (o2[c] === 1) hit++; } else out++;
          }
          tot = hit - LAMBDA_OUT * out - LAMBDA_OVL * ovl;
          var last = { hit, out, ovl };
        }
        if (tot > cur + 1e-9) { cur = tot; improved = true; }
        if (!improved && iter > 1) break;
      }

      const polys = state.map(s => s.v.poly.map(q => [q[0] + s.px, q[1] + s.py]));
      let bad = false;
      for (let i = 0; i < 4 && !bad; i++) for (let j = i + 1; j < 4; j++) if (hasOverlap(polys[i], polys[j])) { bad = true; break; }
      const iou = last.hit / (F.inN + last.out);
      if (!bad && (!best || cur > best.cur)) best = { state: state.map(s => ({ v: s.v, px: s.px, py: s.py })), polys, cur, iou, sc: last };
    }

    if (!best) { console.log('  !! 拟合失败'); continue; }
    console.log(`  覆盖 ${best.sc.hit}/${F.inN}（${(best.sc.hit / F.inN * 100).toFixed(2)}%）越界 ${best.sc.out} 重叠 ${best.sc.ovl}  IoU≈${best.iou.toFixed(4)}  ${Date.now() - t0}ms`);
    console.log('  板：' + best.state.map(s => `${s.v.id}@${s.v.angle}${s.v.flip ? 'F' : ''}(${s.px.toFixed(2)},${s.py.toFixed(2)})`).join(' '));

    const sol = best.polys.map((poly, i) => {
      const st = S.solveState(best.state[i].v.id, poly, best.state[i].v.flip);
      return { id: best.state[i].v.id, x: +st.x.toFixed(4), y: +st.y.toFixed(4), angle: st.angle, flipped: st.flip, err: st.err };
    });
    const un = unionOutline(best.polys);
    if (un.length !== 1) { console.log('  !! 并集不是单环'); continue; }
    const uo = simplify(un[0], 0.004);
    const ua = Math.abs(area(uo));
    console.log(`  并集顶点=${uo.length} 面积=${ua.toFixed(6)} 误差=${(Math.abs(ua - 6) / 6 * 100).toFixed(4)}%`);
    console.log('  反解：' + sol.map(s => `${s.id}@${s.angle}${s.flipped ? 'F' : ''}`).join(' '));

    result[tag] = {
      outline: uo.map(v => [+v[0].toFixed(5), +v[1].toFixed(5)]),
      solution: sol.map(({ id, x, y, angle, flipped }) => ({ id, x, y, angle, flipped })),
      iou: +best.iou.toFixed(5),
      coverRate: +(best.sc.hit / F.inN).toFixed(5),
      areaErr: +(Math.abs(ua - 6) / 6).toFixed(8),
    };
  }
  fs.writeFileSync(path.join(OUT, 'fitted.json'), JSON.stringify(result, null, 1));
  console.log('\n已写 out/fitted.json');
}

if (require.main === module) main();
module.exports = { variantsAll, makeField, fillCells, deltaScore };
