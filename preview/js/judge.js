/* 四巧板 · 判定（栅格覆盖率 + 逐对重叠粗筛）
 * 纯计算，不依赖渲染/平台 API。坐标系 1000×1000。
 *
 * 实现要点：
 *   - 250×250 格（每格 4 单位），每格内部用 4×4 子采样得到 0~1 的覆盖率（抗锯齿）
 *   - 用扫描线填充，避免 62500 格 × 4 块的点包含测试（比逐格采样快一个量级）
 *   - 同一 buffer 同时累计「覆盖计数」和「覆盖到该格的板 id 位掩码」，
 *     一次遍历即得到覆盖率、溢出面积与重叠对
 */
(function (root, factory) {
  var G = root.TANGRAM_GEOM;
  if (!G && typeof require !== 'undefined') G = require('./geom.js');
  var J = factory(G);
  root.TANGRAM_JUDGE = J;
  if (typeof module !== 'undefined' && module.exports) module.exports = J;
})(typeof window !== 'undefined' ? window : globalThis, function (G) {
  'use strict';

  var BOARD = 1000;      // 逻辑坐标系边长
  var CELLS = 250;       // 栅格数
  var SUB = 4;           // 每格子采样数（每轴）
  var CELL = BOARD / CELLS;      // 4
  var SUBP = BOARD / (CELLS * SUB);  // 1

  /* 扫描线：把多边形栅格化进 cellCnt / cellBits
   * pieceBit 为 0 表示只算目标轮廓（不写位掩码）
   */
  function rasterize(poly, cellCnt, cellBits, pieceBit, mode) {
    var n = poly.length;
    var SUBROWS = CELLS * SUB;      // 1000
    for (var j = 0; j < SUBROWS; j++) {
      var y = (j + 0.5) * SUBP;
      var xs = [];
      for (var i = 0; i < n; i++) {
        var p = poly[i], q = poly[(i + 1) % n];
        if ((p[1] <= y && q[1] > y) || (q[1] <= y && p[1] > y)) {
          var t = (y - p[1]) / (q[1] - p[1]);
          xs.push(p[0] + t * (q[0] - p[0]));
        }
      }
      if (xs.length < 2) continue;
      xs.sort(function (a, b) { return a - b; });
      var cellRow = (j / SUB) | 0;
      for (var k = 0; k + 1 < xs.length; k += 2) {
        var xa = xs[k], xb = xs[k + 1];
        if (xb <= xa) continue;
        var i0 = Math.ceil(xa / SUBP - 0.5);
        var i1 = Math.ceil(xb / SUBP - 0.5) - 1;
        if (i0 < 0) i0 = 0;
        if (i1 > CELLS * SUB - 1) i1 = CELLS * SUB - 1;
        for (var s = i0; s <= i1; s++) {
          var cellCol = (s / SUB) | 0;
          var idx = cellRow * CELLS + cellCol;
          if (mode === 'target') {
            if (cellCnt[idx] < 255) cellCnt[idx]++;
          } else if (mode === 'hole') {
            if (cellCnt[idx] > 0) cellCnt[idx]--;
          } else {
            if (cellCnt[idx] < 250) cellCnt[idx]++;
            if (pieceBit) cellBits[idx] |= pieceBit;
          }
        }
      }
    }
  }

  function Judge() {
    this.cellCnt = new Uint8Array(CELLS * CELLS);
    this.cellBits = new Uint8Array(CELLS * CELLS);
    this.multi = new Uint8Array(CELLS * CELLS);
    this.targetFrac = new Uint8Array(CELLS * CELLS);
    this.targetTotal = 0;
    /* v0.50：单块「越界」度量用的临时缓冲（测一块板有多少面积落在轮廓外） */
    this.one = new Uint8Array(CELLS * CELLS);
  }

  /* 设置目标轮廓（每关一次）。outline 为 1000 坐标系多边形；
   * holes 可选，为该轮廓内部需要挖掉的孔（如字母 A/P 的内孔）。
   */
  Judge.prototype.setTarget = function (outline, holes) {
    var t = new Uint8Array(CELLS * CELLS);
    rasterize(outline, t, null, 0, 'target');
    if (holes && holes.length) {
      for (var hi = 0; hi < holes.length; hi++) rasterize(holes[hi], t, null, 0, 'hole');
    }
    this.targetFrac = t;
    var total = 0;
    for (var i = 0; i < t.length; i++) total += t[i];
    this.targetTotal = total;
  };

  /* v0.50：单块「越界」度量 —— 这块板有多少子采样落在目标轮廓内。
   * 返回 outside 为「露在轮廓外的比例」（0 = 整块都在剪影里）。
   *
   * 为什么需要它：v0.49 之前通关只看整体像素覆盖率（≥99%）。
   * 七巧板的板边都在 45° 网格上，接缝落在子采样中心时天然会漏掉一条细缝，
   * 于是「视觉上明明拼好了」却卡在 98~99%，再也上不去 —— 这是普遍的最后一格问题。
   * 改成逐块度量后，判定口径变成玩家能理解的那句话：
   * 「每一块都完整落在图案里，且互不压叠」= 拼成功。
   */
  Judge.prototype.measure = function (poly) {
    var one = this.one, tf = this.targetFrac;
    one.fill(0);
    rasterize(poly, one, null, 0, 'piece');
    var total = 0, inside = 0;
    for (var c = 0; c < one.length; c++) {
      var n = one[c];
      if (!n) continue;
      if (n > SUB * SUB) n = SUB * SUB;
      total += n;
      if (tf[c]) inside += n * (tf[c] / (SUB * SUB));
    }
    var area = Math.abs(polySignedArea(poly));
    if (!total) return { outside: 1, inside: 0, samples: 0, area: area };
    return {
      outside: 1 - inside / total,
      inside: inside / total,
      samples: total,
      area: area
    };
  };

  function polySignedArea(poly) {
    var a = 0;
    for (var i = 0; i < poly.length; i++) {
      var p = poly[i], q = poly[(i + 1) % poly.length];
      a += p[0] * q[1] - q[0] * p[1];
    }
    return a * 0.5;
  }

  /* 判定。polys = [[poly, pieceIndex], ...]（只传已放上拼图区的板）
   * 返回 { coverage, overflow, overlapPairs, pieces }
   *   coverage   目标轮廓被覆盖的比例（0~1）
   *   overflow   覆盖值超过 1 的面积 / 目标面积
   *   overlapPairs 有交叠的板序号对
   *   pieces     逐块的 { outside }（与入参同序，v0.50 起作为通关主口径）
   */
  Judge.prototype.judge = function (polys) {
    var cnt = this.cellCnt, bits = this.cellBits, multi = this.multi;
    cnt.fill(0); bits.fill(0); multi.fill(0);
    /* 板数参数化（v0.3 Phase 0）：不再写死 4 块。
     * cellBits 是 Uint8Array，位掩码 1<<pieceIndex 最多到 bit7（1<<7=128），
     * 因此数据集板数 N 不得超过 8（七巧板 7 块 → bit0..6，安全）。
     * N 取本轮实际出现的最大板序号 +1，四巧板全放时仍是 4，逻辑与旧版逐位一致。 */
    var nPieces = 0;
    for (var i = 0; i < polys.length; i++) {
      var pi = polys[i][1];
      if (pi < 0 || pi > 7) throw new Error('judge: pieceIndex 超出 Uint8 位掩码范围 0..7');
      if (pi + 1 > nPieces) nPieces = pi + 1;
      rasterize(polys[i][0], cnt, bits, 1 << pi, 'piece');
    }
    if (nPieces > 8) nPieces = 8;
    var tf = this.targetFrac;
    var coverNum = 0, overNum = 0, total = this.targetTotal;
    var FULL = SUB * SUB;
    for (var c = 0; c < cnt.length; c++) {
      var n = cnt[c];
      if (n === 0) continue;
      if (tf[c] > 0) coverNum += n < FULL ? n : FULL;
      if (n > FULL) overNum += n - FULL;
      var b = bits[c];
      if (b && (b & (b - 1))) multi[c] = 1;
    }
    /* 腐蚀一次再统计「真重叠」：
     * 两块板拼在一起时，接缝恰好压在子采样中心上会出现 1 子格宽的重复计数，
     * 那是量测噪声，不是玩家把两块压在一起了。要求重叠区 4 邻域也都是重叠，
     * 只有成片的重叠才算 —— 玩家真的压在一起时重叠区远大于 1 子格。
     */
    var pairMap = {};
    for (var y = 1; y < CELLS - 1; y++) {
      for (var x = 1; x < CELLS - 1; x++) {
        var idx = y * CELLS + x;
        if (!multi[idx]) continue;
        if (!multi[idx - 1] || !multi[idx + 1] || !multi[idx - CELLS] || !multi[idx + CELLS]) continue;
        var bb = bits[idx];
        for (var a = 0; a < nPieces; a++) {
          if (!(bb & (1 << a))) continue;
          for (var d = a + 1; d < nPieces; d++) {
            if (bb & (1 << d)) pairMap[a + '-' + d] = (pairMap[a + '-' + d] || 0) + 1;
          }
        }
      }
    }
    var pairs = [];
    for (var k in pairMap) pairs.push({ key: k, cells: pairMap[k] });
    pairs.sort(function (p, q) { return q.cells - p.cells; });
    return {
      coverage: total > 0 ? coverNum / total : 0,
      overflow: total > 0 ? overNum / total : 0,
      overlapPairs: pairs
    };
  };

  return {
    Judge: Judge,
    CELLS: CELLS, SUB: SUB, CELL: CELL,
    BOARD: BOARD
  };
});
