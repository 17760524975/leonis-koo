/* 四巧板 · 几何工具（纯函数，不依赖渲染/平台 API）
 * 可在浏览器（window.TANGRAM_GEOM）与 Node（require）中使用
 */
(function (root, factory) {
  var G = factory();
  root.TANGRAM_GEOM = G;
  if (typeof module !== 'undefined' && module.exports) module.exports = G;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function area(poly) {
    var a = 0;
    for (var i = 0; i < poly.length; i++) {
      var p = poly[i], q = poly[(i + 1) % poly.length];
      a += p[0] * q[1] - q[0] * p[1];
    }
    return Math.abs(a) * 0.5;
  }

  function centroid(poly) {
    var a = 0, cx = 0, cy = 0;
    for (var i = 0; i < poly.length; i++) {
      var p = poly[i], q = poly[(i + 1) % poly.length];
      var cr = p[0] * q[1] - q[0] * p[1];
      a += cr; cx += (p[0] + q[0]) * cr; cy += (p[1] + q[1]) * cr;
    }
    a *= 0.5;
    if (Math.abs(a) < 1e-12) return [0, 0];
    return [cx / (6 * a), cy / (6 * a)];
  }

  function bbox(polys) {
    var a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
    for (var k = 0; k < polys.length; k++) {
      var p = polys[k];
      for (var i = 0; i < p.length; i++) {
        var v = p[i];
        if (v[0] < a) a = v[0];
        if (v[1] < b) b = v[1];
        if (v[0] > c) c = v[0];
        if (v[1] > d) d = v[1];
      }
    }
    return [a, b, c, d];
  }

  function pointInPoly(pt, poly) {
    var c = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var a = poly[i], b = poly[j];
      if ((a[1] > pt[1]) !== (b[1] > pt[1]) &&
          pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  }

  function distPtSeg(p, a, b) {
    var dx = b[0] - a[0], dy = b[1] - a[1];
    var l2 = dx * dx + dy * dy;
    if (l2 < 1e-12) return Math.hypot(p[0] - a[0], p[1] - a[1]);
    var t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2;
    t = t < 0 ? 0 : (t > 1 ? 1 : t);
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
  }

  function distPtPolyEdge(p, poly) {
    var m = Infinity;
    for (var i = 0; i < poly.length; i++) {
      var d = distPtSeg(p, poly[i], poly[(i + 1) % poly.length]);
      if (d < m) m = d;
    }
    return m;
  }

  /* 板件局部坐标：以面积质心为原点（base 顶点先减去质心） */
  function makeLocal(base) {
    var c = centroid(base);
    var out = [];
    for (var i = 0; i < base.length; i++) out.push([base[i][0] - c[0], base[i][1] - c[1]]);
    return out;
  }

  /* 局部坐标 → 世界坐标
   * st = { x, y, angle(度), flipped }
   * 变换：p → R(angle) · F(flipped) · p + (x, y)
   */
  function toWorld(local, st) {
    var a = (st.angle || 0) * Math.PI / 180;
    var ca = Math.cos(a), sa = Math.sin(a);
    var fx = st.flipped ? -1 : 1;
    var out = new Array(local.length);
    for (var i = 0; i < local.length; i++) {
      var x = local[i][0] * fx, y = local[i][1];
      out[i] = [x * ca - y * sa + st.x, x * sa + y * ca + st.y];
    }
    return out;
  }

  /* 几何裁剪：把多边形各顶点钳制到 [min,max]² 内（仅用于绘制兜底，不参与判定） */
  function clampPoly(poly, min, max) {
    var out = [];
    for (var i = 0; i < poly.length; i++) {
      out.push([
        Math.max(min, Math.min(max, poly[i][0])),
        Math.max(min, Math.min(max, poly[i][1]))
      ]);
    }
    return out;
  }

  /* ---------- v0.50 整块落位判定 ----------
   * 「这块板有没有完整落在剪影里」不再靠像素覆盖率，而是精确的几何判断：
   *   ① 每个顶点都在轮廓内（或压在轮廓边上，容差 tol）
   *   ② 顶点不落在内孔里（离孔边 < tol 时算「贴边」，允许）
   *   ③ 板边不穿越轮廓边/孔边（共线贴合不算穿越）
   * 三条同时成立 => 这块板的内部整体在剪影内（板是凸的、目标内部连通）。
   * 相比栅格统计，它没有「一格宽」的量化误差 —— 拼得对就是 0，拼错一点就一定露出。 */
  function pointOnPoly(p, poly, tol) {
    if (pointInPoly(p, poly)) return true;
    return distPtPolyEdge(p, poly) <= tol;
  }
  /* 两线段「真穿越」。交点离任一端点比 tol 还近时不算穿越 ——
   * 板顶点恰好落在轮廓顶点上时，浮点误差会让两条共端点的边被判成相交。 */
  function segCross(a, b, c, d, tol) {
    tol = tol > 0 ? tol : 1e-6;
    var rx = b[0] - a[0], ry = b[1] - a[1];
    var sx = d[0] - c[0], sy = d[1] - c[1];
    var den = rx * sy - ry * sx;
    var lr = Math.hypot(rx, ry), ls = Math.hypot(sx, sy);
    if (lr < 1e-9 || ls < 1e-9) return false;
    /* 近似平行就当共线：两块板贴在一起时，共边由同一批顶点生成，
     * 数值上会差 1e-7 rad 量级；不排除掉会把「贴合」误判成「穿越」。 */
    if (Math.abs(den) / (lr * ls) < 1e-3) return false;
    var t = ((c[0] - a[0]) * sy - (c[1] - a[1]) * sx) / den;
    var u = ((c[0] - a[0]) * ry - (c[1] - a[1]) * rx) / den;
    if (t < 0 || t > 1 || u < 0 || u > 1) return false;
    var px = a[0] + t * rx, py = a[1] + t * ry;
    var m = Math.min(
      Math.hypot(px - a[0], py - a[1]), Math.hypot(px - b[0], py - b[1]),
      Math.hypot(px - c[0], py - c[1]), Math.hypot(px - d[0], py - d[1])
    );
    return m > tol;
  }
  function crossesAny(poly, other, tol) {
    for (var i = 0; i < poly.length; i++) {
      var a = poly[i], b = poly[(i + 1) % poly.length];
      for (var j = 0; j < other.length; j++) {
        var c = other[j], d = other[(j + 1) % other.length];
        if (segCross(a, b, c, d, tol)) return true;
      }
    }
    return false;
  }
  function pieceInside(poly, target, holes, tol) {
    if (!target || target.length < 3) return false;
    tol = tol > 0 ? tol : 0.75;
    var hs = holes || [];
    var i, j;
    for (i = 0; i < poly.length; i++) {
      if (!pointOnPoly(poly[i], target, tol)) return false;
      for (j = 0; j < hs.length; j++) {
        var h = hs[j];
        if (!h || h.length < 3) continue;
        if (pointInPoly(poly[i], h) && distPtPolyEdge(poly[i], h) > tol) return false;
      }
    }
    if (crossesAny(poly, target, tol)) return false;
    for (j = 0; j < hs.length; j++) {
      if (hs[j] && hs[j].length >= 3 && crossesAny(poly, hs[j], tol)) return false;
    }
    return true;
  }

  /* 把多边形规范成逆时针（有符号面积为负就反序）。
   * v0.52：板件 flipped 之后 toWorld 会把绕向翻成顺时针，
   * 而下面 Sutherland–Hodgman 的「内侧」判据只认逆时针 ——
   * 不归一化的话，两块翻面的板叠在一起也裁不出交集、恒返回 0（漏检重叠）。 */
  function ccw(poly) {
    var a = 0;
    for (var i = 0; i < poly.length; i++) {
      var p = poly[i], q = poly[(i + 1) % poly.length];
      a += p[0] * q[1] - q[0] * p[1];
    }
    return a < 0 ? poly.slice().reverse() : poly;
  }

  /* 凸多边形交集面积（Sutherland–Hodgman；七块板都是凸的，够用且零依赖）。
   * 用来算「这块板压在别的板上有多少面积」，比栅格重叠对更直接。 */
  function convexOverlapArea(A, B) {
    if (!A || !B || A.length < 3 || B.length < 3) return 0;
    A = ccw(A); B = ccw(B);
    var out = A.map(function (v) { return [v[0], v[1]]; });
    for (var i = 0; i < B.length; i++) {
      var p = B[i], q = B[(i + 1) % B.length];
      var dx = q[0] - p[0], dy = q[1] - p[1];
      var side = function (v) { return dx * (v[1] - p[1]) - dy * (v[0] - p[0]); };
      var inp = out; out = [];
      for (var j = 0; j < inp.length; j++) {
        var a = inp[j], b = inp[(j + 1) % inp.length];
        var da = side(a), db = side(b);
        if (da >= -1e-9) out.push(a);
        if ((da < -1e-9 && db > 1e-9) || (da > 1e-9 && db < -1e-9)) {
          var t = da / (da - db);
          out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
        }
      }
      if (out.length < 3) return 0;
    }
    return area(out);
  }

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeOutBack(t) {
    var c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
  // 对应 cubic-bezier(0.22, 1, 0.36, 1) 的近似
  function easeOutQuint(t) { return 1 - Math.pow(1 - t, 5); }

  return {
    area: area, centroid: centroid, bbox: bbox,
    pointInPoly: pointInPoly, distPtSeg: distPtSeg, distPtPolyEdge: distPtPolyEdge,
    makeLocal: makeLocal, toWorld: toWorld, clampPoly: clampPoly,
    pointOnPoly: pointOnPoly, segCross: segCross, pieceInside: pieceInside,
    convexOverlapArea: convexOverlapArea,
    easeOutCubic: easeOutCubic, easeInOutCubic: easeInOutCubic,
    easeOutBack: easeOutBack, easeOutQuint: easeOutQuint
  };
});
