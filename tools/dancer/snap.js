/* 舞者关卡反解 · 第 4 步：固定角度 + 贴边吸附（IoU 参与打分）
 * ------------------------------------------------------------------
 * 参考图是手工摆的，板之间本来就有 0.1~0.5 单位的缝，七块板的拟合误差方向还各不相同。
 * 照着抄进关卡就是一条条「差一点点」的缝和台阶 —— v0.52 龙尾、v0.63 Y 竖干两次返工
 * 都是这个根因。
 *
 * 做法：角度与翻面沿用拟合值（已吸附到 45° 整数倍），只解平移。
 * 按面积从大到小逐块落位：新板找「与已落位板共线且平行」的边，沿法向压平，再沿边滑
 * 让某个顶点精确重合（4 种对法全试）。于是新板坐标 = 已落位板顶点 + 边长向量，
 * 天然落在同一套格系里，缝和台阶一次性消失。
 *
 * 候选评分三件事一起看，避免「贴是贴上了，却滑到边上的别的位置」：
 *   贴合长度（越满越好）、移动距离（越小越好）、与该板颜色掩码的 IoU（越像原图越好）。
 * 上层还会枚举 7 种「谁当骨架」，挑轮廓面积与板面积之和最接近的那组 ——
 * 面积差 ≈ 0 等价于「没有洞、没有浮空的板」。
 */
'use strict';
const path = require('path');
require(path.join(__dirname, '..', '..', 'js', 'geom.js'));
const G = globalThis.TANGRAM_GEOM;

const DEG = Math.PI / 180;
function rot(v, a, f) {
  const r = a * DEG, ca = Math.cos(r), sa = Math.sin(r);
  const x = v[0] * (f ? -1 : 1), y = v[1];
  return [x * ca - y * sa, x * sa + y * ca];
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, s) => [a[0] * s, a[1] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const len = a => Math.hypot(a[0], a[1]);
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];

function areaOf(p) {
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(s) / 2;
}
function clash(pts, others) {
  for (const Q of others) if (G.convexOverlapArea(pts, Q) > 1e-4) return true;
  return false;
}
function param(p, a, b) {
  const d = sub(b, a);
  return dot(sub(p, a), d) / (d[0] * d[0] + d[1] * d[1]);
}
function iouMask(pts, mask, s, ox, oy) {
  if (!mask) return 0;
  const px = pts.map(p => [p[0] * s + ox - mask.bx, p[1] * s + oy - mask.by]);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  px.forEach(p => { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); });
  let A = 0;
  for (let i = 0; i < mask.mask.length; i++) if (mask.mask[i]) A++;
  let I = 0, B = 0;
  for (let y = 0; y < mask.bh; y++) {
    for (let x = 0; x < mask.bw; x++) {
      const cx = x + 0.5, cy = y + 0.5;
      let inside = false;
      if (cx >= x0 - 1 && cx <= x1 + 1 && cy >= y0 - 1 && cy <= y1 + 1) {
        for (let i = 0, j = px.length - 1; i < px.length; j = i++) {
          const xi = px[i][0], yi = px[i][1], xj = px[j][0], yj = px[j][1];
          if ((yi > cy) !== (yj > cy) && cx < (xj - xi) * (cy - yi) / (yj - yi) + xi) inside = !inside;
        }
      }
      const im = mask.mask[y * mask.bw + x];
      if (inside && im) I++;
      else if (inside) B++;
    }
  }
  return I / (A + B || 1);
}

function snap(fits, LOCAL, opt) {
  const s = (opt && opt.s) || 1, ox = (opt && opt.ox) || 0, oy = (opt && opt.oy) || 0;
  const st = fits.map(f => ({
    key: f.key, ang: f.ang, fl: f.fl, src: f, mask: f.mask,
    base: LOCAL[f.key].map(v => rot(v, f.ang, f.fl)),
    t: [f.cx, f.cy]
  }));
  st.sort((a, b) => areaOf(b.base) - areaOf(a.base));
  const ak = opt && opt.anchor;
  if (ak) {
    const i = st.findIndex(x => x.src === ak);
    if (i > 0) { const [x] = st.splice(i, 1); st.unshift(x); }
  }
  const placed = [];

  st.forEach((me, idx) => {
    if (!idx) {
      me.t = [Math.round(me.t[0] * 4) / 4, Math.round(me.t[1] * 4) / 4];
      me.pts = me.base.map(p => add(p, me.t));
      placed.push(me);
      return;
    }
    const others = placed.map(x => x.pts);
    const uW = me.base.map(v => add(v, me.t));       // 当前位置
    let best = null;
    for (const P of others) {
      for (let pi = 0; pi < P.length; pi++) {
        const a = P[pi], b = P[(pi + 1) % P.length];
        const dAB = sub(b, a), LAB = len(dAB);
        if (LAB < 1e-9) continue;
        const uAB = mul(dAB, 1 / LAB);
        const nrm = [-uAB[1], uAB[0]];
        for (let qi = 0; qi < me.base.length; qi++) {
          const u = uW[qi], v = uW[(qi + 1) % me.base.length];
          const dUV = sub(v, u), LUV = len(dUV);
          if (LUV < 1e-9) continue;
          if (Math.abs(cross(uAB, mul(dUV, 1 / LUV))) > 1e-9) continue;   // 平行才可能共线
          const flat = mul(nrm, -dot(sub(u, a), nrm));
          for (const [pp, qq] of [[u, a], [u, b], [v, a], [v, b]]) {
            const pu = add(pp, flat);
            const t = add(flat, mul(uAB, dot(sub(qq, pu), uAB)));
            const pts = uW.map(p => add(p, t));
            if (clash(pts, others)) continue;
            let lo = 1e9, hi = -1e9;
            for (const p of pts) {
              const q = param(p, a, b);
              if (q < lo) lo = q;
              if (q > hi) hi = q;
            }
            const ov = Math.max(0, Math.min(1, hi) - Math.max(0, lo)) * LAB;
            const moved = len(t);
            const iou = iouMask(pts, me.mask, s, ox, oy);
            const score = ov * 2.0 + iou * 6.0 - moved * 2.0;
            if (!best || score > best.score) best = { score, t, pts, ov, iou, moved };
          }
        }
      }
    }
    if (best) {
      me.t = add(me.t, best.t);
      me.pts = best.pts;
      me.score = best.score;
    } else {
      me.pts = uW;
      me.score = -99;
    }
    placed.push(me);
  });

  return st.map(x => ({
    key: x.key, ang: x.ang, fl: x.fl, x: x.t[0], y: x.t[1], pts: x.pts, score: x.score, src: x.src
  }));
}

module.exports = { snap, rot, areaOf, iouMask };
