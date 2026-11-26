(function (root, factory) {
var G = root.TANGRAM_GEOM;
if (!G && typeof require !== 'undefined') G = require('./geom.js');
var J = factory(G);
root.TANGRAM_JUDGE = J;
if (typeof module !== 'undefined' && module.exports) module.exports = J;
})(typeof window !== 'undefined' ? window : globalThis, function (G) {
'use strict';
var BOARD = 1000;
var CELLS = 250;
var SUB = 4;
var CELL = BOARD / CELLS;
var SUBP = BOARD / (CELLS * SUB);
function rasterize(poly, cellCnt, cellBits, pieceBit, mode) {
var n = poly.length;
var SUBROWS = CELLS * SUB;
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
this.one = new Uint8Array(CELLS * CELLS);
}
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
Judge.prototype.judge = function (polys) {
var cnt = this.cellCnt, bits = this.cellBits, multi = this.multi;
cnt.fill(0); bits.fill(0); multi.fill(0);
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
