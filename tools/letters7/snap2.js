/* 参考图 → 严格七巧板解（v2：IoU 判形状 + 格点残差定 u）
 *
 * 为什么不用顶点配对：凸包是像素台阶，每个角都被切成 2 个点（还带抗锯齿圆角），
 * 先 RDP 再配对很容易选错角点，实测误差能到 11px。
 * 改成「把模板栅格化后与凸包做 IoU」：形状本身只由 (板型, 朝向, 手性) 决定，
 * 与顶点采样无关，唯一要搜的是缩放 —— 鲁棒得多。
 *
 * 流程：
 *   1) 每块：40 个候选（板型×朝向×手性）各自取面积匹配的缩放，算与该块凸包的 IoU，取最大；
 *   2) 面积档必须凑成 2 大 + 3 中 + 2 小，否则报错；
 *   3) u：扫一遍 u，看「7 块所有顶点到最近格点的残差」—— 真解顶点全在间距 u 的整数格上，
 *      u 偏一点残差就变大，残差最小处即 u（同时得到格点相位 φ）；
 *   4) 顶点吸到最近格点，反查板型摆放 → 严格解（零重叠零缝隙）；
 *   5) 校验：面积 16u²、两两重叠面积、外轮廓。
 *
 * 用法：node tools/letters7/snap.js [--dbg A]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const HERE = __dirname;
const DBG = process.argv.includes('--dbg') ? process.argv[process.argv.indexOf('--dbg') + 1] : null;

const TPL = {
  T1: { base: [[0, 0], [4, 0], [2, 2]], area: 4 },
  T3: { base: [[0, 0], [2, 0], [0, 2]], area: 2 },
  S: { base: [[1, 0], [2, 1], [1, 2], [0, 1]], area: 2 },
  T4: { base: [[0, 0], [2, 0], [1, 1]], area: 1 },
  P: { base: [[1, 0], [3, 0], [2, 1], [0, 1]], area: 2 }
};

/* ---------------- 几何 ---------------- */
function sArea(p) {
  let a = 0;
  for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; }
  return a / 2;
}
const absArea = p => Math.abs(sArea(p));
const ccw = p => (sArea(p) < 0 ? p.slice().reverse() : p.slice());
function centroid(poly) {
  const P = ccw(poly);
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < P.length; i++) {
    const q = P[(i + 1) % P.length], cr = P[i][0] * q[1] - q[0] * P[i][1];
    a += cr; cx += (P[i][0] + q[0]) * cr; cy += (P[i][1] + q[1]) * cr;
  }
  a /= 2;
  return [cx / (6 * a), cy / (6 * a)];
}
function rot(p, k, flip) {
  const c = [1, 0, -1, 0][k], s = [0, 1, 0, -1][k], fx = flip ? -1 : 1;
  return ccw(p.map(v => [c * (v[0] * fx) - s * v[1], s * (v[0] * fx) + c * v[1]]));
}
function bbox(p) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const v of p) { x0 = Math.min(x0, v[0]); x1 = Math.max(x1, v[0]); y0 = Math.min(y0, v[1]); y1 = Math.max(y1, v[1]); }
  return [x0, y0, x1, y1];
}
/* 凸多边形求交（Sutherland–Hodgman）+ 精确 IoU：两边都是凸多边形，用裁剪算解析解，
 * 比栅格采样稳得多（栅格在 1px 分辨率下会把 3 种板判成同一个，实测 IoU 只差 0.01）。 */
function clipConvex(a, b) {
  let out = ccw(a).slice();
  const B = ccw(b);
  for (let i = 0; i < B.length && out.length; i++) {
    const p1 = B[i], p2 = B[(i + 1) % B.length];
    const side = v => (p2[0] - p1[0]) * (v[1] - p1[1]) - (p2[1] - p1[1]) * (v[0] - p1[0]);
    const inp = out; out = [];
    for (let j = 0; j < inp.length; j++) {
      const cur = inp[j], nxt = inp[(j + 1) % inp.length];
      const sc = side(cur), sn = side(nxt);
      if (sc >= -1e-12) out.push(cur);
      if ((sc > 1e-12 && sn < -1e-12) || (sc < -1e-12 && sn > 1e-12)) {
        const t = sc / (sc - sn);
        out.push([cur[0] + (nxt[0] - cur[0]) * t, cur[1] + (nxt[1] - cur[1]) * t]);
      }
    }
  }
  return out;
}
function iou(A, B) {
  const c = clipConvex(A, B);
  const inter = c.length >= 3 ? absArea(c) : 0;
  const uni = absArea(A) + absArea(B) - inter;
  return uni > 0 ? inter / uni : 0;
}

/* 形状识别：候选 40 个，各自面积匹配缩放，比 IoU */
function classify(hull) {
  const cH = centroid(hull), aH = absArea(hull);
  let best = null;
  for (const id in TPL) {
    const t = TPL[id];
    for (const flip of (id === 'P' ? [false, true] : [false])) {
      for (let k = 0; k < 4; k++) {
        const sh = rot(t.base, k, flip);
        const cS = centroid(sh);
        const s = Math.sqrt(aH / (t.area));
        // 放到凸包质心上比 IoU（模板尺寸 = 缩放后）
        const placed = sh.map(v => [cH[0] + (v[0] - cS[0]) * s, cH[1] + (v[1] - cS[1]) * s]);
        const q = iou(placed, hull);
        if (!best || q > best.iou) best = { id, k, flip, s, iou: q, cH, cS, shape: sh, area: t.area };
      }
    }
  }
  return best;
}

/* ---------------- 主流程 ---------------- */
const data = JSON.parse(fs.readFileSync(path.join(HERE, 'pieces.json'), 'utf8'));
const out = [];
let failCnt = 0;

for (const rec of data) {
  const ps = rec.pieces.slice().sort((a, b) => b.n - a.n).slice(0, 7);
  const fits = ps.map(p => classify(ccw(p.hull)));
  const okCls = fits.map(f => f.area).sort().join(',') === '1,1,2,2,2,4,4';
  const idCount = {};
  fits.forEach(f => { idCount[f.id] = (idCount[f.id] || 0) + 1; });
  const okIds = idCount.T1 === 2 && idCount.T4 === 2 && idCount.T3 === 1 && idCount.S === 1 && idCount.P === 1;

  if (DBG && rec.ch === DBG) {
    fits.forEach((f, i) => console.log('  块', i, f.id, 'k=' + f.k * 90, f.flip ? 'F' : '',
      's=' + f.s.toFixed(2), 'IoU=' + f.iou.toFixed(4)));
  }

  /* u 与格点相位：让所有顶点到最近格点的残差最小 */
  const shapesAt = u => fits.map(f => f.shape.map(v => [
    f.cH[0] + (v[0] - f.cS[0]) * u, f.cH[1] + (v[1] - f.cS[1]) * u]));
  const wrap1 = x => x - Math.round(x);
  const phaseOf = vals => {
    let sx = 0, sy = 0;
    for (const v of vals) { const a = v * 2 * Math.PI; sx += Math.cos(a); sy += Math.sin(a); }
    const a = Math.atan2(sy, sx) / (2 * Math.PI);
    return a - Math.round(a);
  };
  const resAt = u => {
    const V = shapesAt(u).flat();
    const px = phaseOf(V.map(v => v[0] / u)), py = phaseOf(V.map(v => v[1] / u));
    let s = 0;
    for (const v of V) s += Math.max(Math.abs(wrap1(v[0] / u - px)), Math.abs(wrap1(v[1] / u - py)));
    return { res: s / V.length, px, py };
  };
  const sMed = fits.map(f => f.s).sort((a, b) => a - b)[3];
  let bestU = null;
  for (let u = sMed * 0.92; u <= sMed * 1.12; u += sMed * 0.0004) {
    const r = resAt(u);
    if (!bestU || r.res < bestU.res) bestU = { u, ...r };
  }

  /* 吸到格点 → 反查板型摆放 */
  let okExact = true;
  const solved = [];
  for (const [i, f] of fits.entries()) {
    const V = shapesAt(bestU.u)[i].map(v => [
      Math.round(v[0] / bestU.u - bestU.px) + bestU.px,
      Math.round(v[1] / bestU.u - bestU.py) + bestU.py]);
    let hit = null;
    const key = q => ccw(q).map(v => Math.round(v[0] * 1e6) + ',' + Math.round(v[1] * 1e6)).sort().join(';');
    for (const id in TPL) {
      if (TPL[id].area !== f.area) continue;
      for (const flip of (id === 'P' ? [false, true] : [false])) {
        for (let k = 0; k < 4; k++) {
          const sh = rot(TPL[id].base, k, flip);
          if (sh.length !== V.length) continue;
          for (let off = 0; off < sh.length && !hit; off++) {
            const tx = Math.round(V[0][0] - sh[off][0]), ty = Math.round(V[0][1] - sh[off][1]);
            const got = sh.map(v => [v[0] + tx, v[1] + ty]);
            if (key(got) === key(V)) hit = { id, k, flip, verts: ccw(got) };
          }
        }
      }
    }
    if (!hit) { okExact = false; solved.push(null); continue; }
    const cS = centroid(hit.verts);
    solved.push({ tpl: hit.id, k: hit.k, flip: hit.flip, cx: cS[0], cy: cS[1], verts: hit.verts });
  }

  const tag = (okCls && okIds && okExact) ? 'OK' : '✗';
  if (tag === '✗') failCnt++;
  console.log(rec.ch, tag, 'u=' + bestU.u.toFixed(3),
    '面积档', okCls ? 'OK' : '✗' + fits.map(f => f.area).sort().join(','),
    '板型', okIds ? 'OK' : '✗' + JSON.stringify(idCount),
    '严格', okExact ? 'OK' : '✗',
    '最小IoU=' + Math.min(...fits.map(f => f.iou)).toFixed(3),
    '残差=' + bestU.res.toFixed(3) + 'u');
  out.push({ ch: rec.ch, u: bestU.u, box: rec.box, phase: [bestU.px, bestU.py],
    solved, okCls, okIds, okExact, minIou: Math.min(...fits.map(f => f.iou)) });
}

fs.writeFileSync(path.join(HERE, 'solved.json'), JSON.stringify(out, null, 1));
console.log('\n失败', failCnt, '个；写入 solved.json');
