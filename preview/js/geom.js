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
    easeOutCubic: easeOutCubic, easeInOutCubic: easeInOutCubic,
    easeOutBack: easeOutBack, easeOutQuint: easeOutQuint
  };
});
