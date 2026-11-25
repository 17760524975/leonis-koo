/* 生肖关卡装配工具
 * ---------------------------------------------------------------
 * 设计方式：不手算坐标，而是「把一块板的某条边贴到另一块板的某条边上」。
 * 七块板的边方向只有 0/45/90/... 八种，贴边后角度必然仍是 45° 的整数倍，
 * 因此几何上一定可以精确还原成关卡所需的 { x, y, angle, flipped }。
 *
 * 坐标单位统一用 u（= dataset.unitScale = 96 世界单位），y 轴向下（与画布一致）。
 * ---------------------------------------------------------------
 */
const path = require('path');
const fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
require(path.join(ROOT, 'js', 'geom.js'));
require(path.join(ROOT, 'js', 'levels.js'));

const G = globalThis.TANGRAM_GEOM;
const SET = globalThis.TANGRAM_SETS.tangram7;
const U = SET.dataset.unitScale || 96;

const BASE = {}, LOCAL = {};
SET.dataset.pieceOrder.forEach(id => {
  BASE[id] = SET.dataset.pieces[id].base.map(v => [v[0], v[1]]);
  LOCAL[id] = G.makeLocal(BASE[id]);   // 质心在原点，u 单位
});

const DEG = Math.PI / 180;
function rot(v, a, f) {
  const r = a * DEG, ca = Math.cos(r), sa = Math.sin(r);
  const x = v[0] * (f ? -1 : 1), y = v[1];
  return [x * ca - y * sa, x * sa + y * ca];
}
function bbox(pts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  pts.forEach(v => { x0 = Math.min(x0, v[0]); y0 = Math.min(y0, v[1]); x1 = Math.max(x1, v[0]); y1 = Math.max(y1, v[1]); });
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}

class Asm {
  constructor() { this.items = []; }

  _overlapWith(pts) {
    for (let i = 0; i < this.items.length; i++) {
      if (G.convexOverlapArea(pts, this.items[i].pts) > 1e-6) return i;
    }
    return -1;
  }

  _push(id, a, f, t, pts) {
    const bad = this._overlapWith(pts);
    if (bad >= 0) throw new Error('重叠：' + id + ' 与 ' + this.items[bad].id + ' 压叠');
    this.items.push({ id, a, f, x: t[0], y: t[1], pts });
    return this.items.length - 1;
  }

  /* 直接摆：cx,cy = 质心（u 单位） */
  place(id, cx, cy, a, f) {
    const t = [cx, cy];
    const pts = LOCAL[id].map(v => { const r = rot(v, a || 0, !!f); return [r[0] + t[0], r[1] + t[1]]; });
    return this._push(id, a || 0, !!f, t, pts);
  }

  /* 自动吸附：把 id 贴到「已放板」的任意边上，取质心离 (tx,ty) 最近且：
   *   ① 不重叠  ② 与 ref 边的贴合并长度 ≥ minRatio × 两边较短者（避免只碰一个角而显得散）
   * 设计时只需给「这块大概在哪」，角度/翻转由几何唯一确定。 */
  autoPlace(id, tx, ty, minRatio) {
    if (!this.items.length) return this.place(id, tx, ty, 0, false);
    const mr = minRatio == null ? 0.55 : minRatio;
    const L = LOCAL[id], m = L.length;
    let best = null;
    for (let r = 0; r < this.items.length; r++) {
      const R = this.items[r].pts, n = R.length;
      for (let ri = 0; ri < n; ri++) {
        const A = R[ri], B = R[(ri + 1) % n];
        const la = Math.hypot(A[0] - B[0], A[1] - B[1]);
        if (la < 1e-6) continue;
        const ux = (A[0] - B[0]) / la, uy = (A[1] - B[1]) / la;
        for (let pi = 0; pi < m; pi++) {
          const P0 = L[pi], Q0 = L[(pi + 1) % m];
          const lp = Math.hypot(Q0[0] - P0[0], Q0[1] - P0[1]);
          if (lp < 1e-6) continue;
          for (const a of [0, 45, 90, 135, 180, 225, 270, 315]) {
            for (const f of [false, true]) {
              const P = rot(P0, a, f), Q = rot(Q0, a, f);
              const vx = Q[0] - P[0], vy = Q[1] - P[1];
              if (Math.abs((vx / lp) * uy - (vy / lp) * ux) > 1e-6) continue;
              /* 沿边滑动的量：让质心最靠近目标（质心 = t，因为 LOCAL 质心在原点） */
              const sRaw = ux * (tx - (B[0] - P[0])) + uy * (ty - (B[1] - P[1]));
              const sMin = -lp / 2, sMax = la - lp / 2;
              let s = Math.max(sMin, Math.min(sMax, sRaw));
              /* 贴合长度：新板边在 ref 边上的投影 */
              const lo = Math.max(0, s), hi = Math.min(la, s + lp);
              const ov = hi - lo;
              if (ov < mr * Math.min(la, lp)) {
                /* 推一推，看能不能让它完全贴住 */
                const s2 = Math.max(sMin, Math.min(sMax, Math.max(0, Math.min(la - lp, s))));
                const lo2 = Math.max(0, s2), hi2 = Math.min(la, s2 + lp);
                if (hi2 - lo2 < mr * Math.min(la, lp)) continue;
                s = s2;
              }
              s = Math.round(s * 4) / 4;
              const t = [B[0] + ux * s - P[0], B[1] + uy * s - P[1]];
              const pts = L.map(v => { const rr = rot(v, a, f); return [rr[0] + t[0], rr[1] + t[1]]; });
              if (this._overlapWith(pts) >= 0) continue;
              const d = Math.hypot(t[0] - tx, t[1] - ty);
              if (!best || d < best.d) best = { d, a, f, t, pts };
            }
          }
        }
      }
    }
    if (!best) throw new Error('自动吸附失败：' + id + ' @(' + tx + ',' + ty + ')');
    return this._push(id, best.a, best.f, best.t, best.pts);
  }

  /* 枚举「把 id 贴到 refIdx 第 ri 条边上」的全部不重叠摆法 */
  _candsOnEdge(id, refIdx, ri) {
    const R = this.items[refIdx].pts, n = R.length;
    const A = R[ri % n], B = R[(ri + 1) % n];
    const la = Math.hypot(A[0] - B[0], A[1] - B[1]);
    const L = LOCAL[id], m = L.length;
    const ux = (A[0] - B[0]) / la, uy = (A[1] - B[1]) / la;
    const out = [];
    if (la < 1e-6) return out;
    for (let pi = 0; pi < m; pi++) {
      const P0 = L[pi], Q0 = L[(pi + 1) % m];
      const lp = Math.hypot(Q0[0] - P0[0], Q0[1] - P0[1]);
      if (lp < 1e-6) continue;
      for (const a of [0, 45, 90, 135, 180, 225, 270, 315]) {
        for (const f of [false, true]) {
          const P = rot(P0, a, f), Q = rot(Q0, a, f);
          const vx = Q[0] - P[0], vy = Q[1] - P[1];
          if (Math.abs((vx / lp) * uy - (vy / lp) * ux) > 1e-6) continue;
          for (const [al, ar] of [[P, A], [P, B], [Q, A], [Q, B]]) {
            const t = [ar[0] - al[0], ar[1] - al[1]];
            const pts = L.map(v => { const r = rot(v, a, f); return [r[0] + t[0], r[1] + t[1]]; });
            if (this._overlapWith(pts) >= 0) continue;
            const sP = (P[0] + t[0] - B[0]) * ux + (P[1] + t[1] - B[1]) * uy;
            const dq = (Q[0] - P[0]) * ux + (Q[1] - P[1]) * uy;
            const sQ = sP + dq;
            const ov = Math.max(0, Math.min(la, Math.max(sP, sQ)) - Math.max(0, Math.min(sP, sQ)));
            out.push({ pi, a, f, t, pts, ov, ovr: ov / Math.min(la, lp), s: sP, la, lp });
          }
        }
      }
    }
    return out;
  }

  /* 贴到 refIdx 的第 ri 条边上（取贴合最满、最不外伸的那个） */
  attach(id, refIdx, ri, pi, slip, center) {
    const cands = this._candsOnEdge(id, refIdx, ri);
    if (!cands.length) throw new Error('贴边失败：' + id + ' → ' + this.items[refIdx].id + ' 边' + ri);
    const ok = pi == null ? cands : cands.filter(c => c.pi === pi);
    const use = ok.length ? ok : cands;
    use.sort((x, y) => (Math.abs(y.ovr - x.ovr) > 1e-9 ? y.ovr - x.ovr : Math.abs(x.s) - Math.abs(y.s)));
    const c = use[0];
    return this._push(id, c.a, c.f, c.t, c.pts);
  }

  /* 贴到 refIdx 的「某个方向」去：dir 是期望的方位（-1/0/1 组合），如 (-1,0)=左边、(0,1)=下方 */
  attachDir(id, refIdx, dx, dy, minOv) {
    const R = this.items[refIdx].pts;
    const rc = R.reduce((s, v) => [s[0] + v[0] / R.length, s[1] + v[1] / R.length], [0, 0]);
    const dl = Math.hypot(dx, dy) || 1;
    dx /= dl; dy /= dl;
    let best = null;
    for (let ri = 0; ri < R.length; ri++) {
      for (const c of this._candsOnEdge(id, refIdx, ri)) {
        if (c.ovr < (minOv == null ? 0.6 : minOv)) continue;
        const cc = c.pts.reduce((s, v) => [s[0] + v[0] / c.pts.length, s[1] + v[1] / c.pts.length], [0, 0]);
        const vx = cc[0] - rc[0], vy = cc[1] - rc[1];
        const len = Math.hypot(vx, vy) || 1;
        const score = (vx / len) * dx + (vy / len) * dy + c.ovr * 0.3;
        if (!best || score > best.score) best = { ...c, score };
      }
    }
    if (!best) throw new Error('方向贴边失败：' + id + ' → ' + this.items[refIdx].id + ' 方向(' + dx + ',' + dy + ')');
    return this._push(id, best.a, best.f, best.t, best.pts);
  }

  /* 整体平移 */
  translate(dx, dy) {
    this.items.forEach(it => {
      it.x += dx; it.y += dy;
      it.pts = it.pts.map(v => [v[0] + dx, v[1] + dy]);
    });
    return this;
  }

  /* 水平镜像（用于调整动物朝向）：x → -x，角度 → -角度，翻转取反 */
  mirrorX() {
    this.items.forEach(it => {
      it.x = -it.x; it.y = it.y;
      it.a = (360 - it.a) % 360;
      it.f = !it.f;
      it.pts = it.pts.map(v => [-v[0], v[1]]);
    });
    return this;
  }

  all() { return [].concat.apply([], this.items.map(it => it.pts)); }
  box() { return bbox(this.all()); }
  area() { return this.items.reduce((s, it) => s + Math.abs(polyArea(it.pts)), 0); }

  /* 顶点在图上的「贴合度」检查：每块板至少有一个顶点落在另一块板的顶点/边上 */
  connected() {
    const out = [];
    for (let i = 0; i < this.items.length; i++) {
      let touch = 0;
      for (let j = 0; j < this.items.length; j++) {
        if (i === j) continue;
        const A = this.items[i].pts, B = this.items[j].pts;
        for (const p of A) for (let k = 0; k < B.length; k++) {
          const q = B[k], r = B[(k + 1) % B.length];
          if (segDist(p, q, r) < 0.05) { touch++; break; }
        }
      }
      if (!touch) out.push(this.items[i].id);
    }
    return out;   // 空数组 = 全部有接触
  }
}

function polyArea(p) {
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s / 2;
}
function segDist(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
  let t = L2 > 0 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + dx * t), p[1] - (a[1] + dy * t));
}

/* ---------- 渲染预览（真色，便于目视检查造型） ---------- */
function renderHTML(cases, file) {
  const cells = cases.map(c => {
    const asm = c.asm;
    const bb = asm.box();
    const pad = 0.6;
    const w = bb.w + pad * 2, h = bb.h + pad * 2;
    const polys = asm.items.map(it => {
      const def = SET.dataset.pieces[it.id];
      const d = it.pts.map(v => (v[0] - bb.x0 + pad).toFixed(3) + ',' + (v[1] - bb.y0 + pad).toFixed(3)).join(' ');
      return `<polygon points="${d}" fill="${def.color}" stroke="${def.stroke}" stroke-width="0.06" stroke-linejoin="round"/>`;
    }).join('');
    return `<figure>
      <svg viewBox="0 0 ${w.toFixed(2)} ${h.toFixed(2)}" width="200">${polys}</svg>
      <figcaption>${c.name}<br><small>${bb.w.toFixed(2)}×${bb.h.toFixed(2)}u</small></figcaption>
    </figure>`;
  }).join('\n');
  fs.writeFileSync(file, `<!doctype html><meta charset="utf-8">
<style>
body{background:#fff;font:13px/1.4 system-ui;margin:0;padding:14px;display:flex;flex-wrap:wrap;gap:10px}
figure{margin:0;text-align:center;width:200px}
figcaption{margin-top:2px;color:#333}
small{color:#888}
</style>${cells}`);
  return file;
}

/* ---------- ASCII 预览（快速看轮廓，不用截图） ---------- */
const SYM = { T1: 'A', T2: 'B', T3: 'C', S: 'S', T4: 'x', T5: 'y', P: 'P' };
function pointInPoly(p, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function ascii(asm, cols) {
  cols = cols || 64;
  const bb = asm.box();
  const rows = Math.max(4, Math.round(cols * (bb.h / bb.w) * 0.52));
  const out = [];
  for (let r = 0; r < rows; r++) {
    let line = '';
    for (let c = 0; c < cols; c++) {
      const x = bb.x0 + (c + 0.5) / cols * bb.w;
      const y = bb.y0 + (r + 0.5) / rows * bb.h;
      let ch = ' ';
      for (const it of asm.items) if (pointInPoly([x, y], it.pts)) { ch = SYM[it.id] || '?'; break; }
      line += ch;
    }
    out.push(line.replace(/\s+$/, ''));
  }
  return out.join('\n');
}

module.exports = { G, SET, U, BASE, LOCAL, rot, bbox, Asm, renderHTML, polyArea, ascii, pointInPoly };
