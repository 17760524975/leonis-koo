/* 独立几何校验（脱离 judge 栅格，避免自证循环）
 * 目的：验证七巧板 7 块世界多边形是否严丝合缝拼出第 1 关正方形。
 * 方法：正方形内密集点采样，统计每点被覆盖的板数；恰好 1 块 = 无缝无重叠。
 */
require('../js/geom.js');
require('../js/levels.js');
var G = globalThis.TANGRAM_GEOM;
var S = globalThis.TANGRAM_SETS.tangram7;
var UNIT = S.dataset.unitScale;
var lv = S.levels[0];

// 局部坐标（base 减质心 × unitScale），与 core.js buildSet 一致
var LOCAL = {};
Object.keys(S.dataset.pieces).forEach(function (id) {
  LOCAL[id] = G.makeLocal(S.dataset.pieces[id].base).map(function (v) {
    return [v[0] * UNIT, v[1] * UNIT];
  });
});

var polys = lv.solution.map(function (st) {
  return { id: st.id, poly: G.toWorld(LOCAL[st.id], st) };
});

// 精确面积
var sumArea = polys.reduce(function (a, o) { return a + G.area(o.poly); }, 0);
var outlineArea = G.area(lv.outline);
console.log('=== 几何常量 ===');
console.log('unitScale =', UNIT, '| outline =', JSON.stringify(lv.outline));
console.log('7块面积和 =', sumArea.toFixed(4), '| outline面积 =', outlineArea.toFixed(4), '| 差 =', (sumArea - outlineArea).toFixed(4));

console.log('\n=== 第1关 7块世界顶点 (3位小数) ===');
polys.forEach(function (o) {
  var vs = o.poly.map(function (v) { return '(' + v[0].toFixed(3) + ',' + v[1].toFixed(3) + ')'; }).join(' ');
  console.log(o.id.padEnd(3), 'area=' + G.area(o.poly).toFixed(4), vs);
});

// 密集采样：正方形 bbox 内，步长 0.5 世界单位
var bb = G.bbox([lv.outline]);
var step = 0.5, gaps = 0, overlaps = 0, ok = 0, outside = 0, total = 0;
for (var y = bb[1] + step / 2; y < bb[3]; y += step) {
  for (var x = bb[0] + step / 2; x < bb[2]; x += step) {
    if (!G.pointInPoly([x, y], lv.outline)) continue;
    total++;
    var cnt = 0;
    for (var k = 0; k < polys.length; k++) if (G.pointInPoly([x, y], polys[k].poly)) cnt++;
    if (cnt === 0) gaps++;
    else if (cnt === 1) ok++;
    else overlaps++;
  }
}
console.log('\n=== 高密度点采样 (步长 ' + step + ') ===');
console.log('outline内采样点 =', total);
console.log('恰好1块(完美) =', ok, '(' + (100 * ok / total).toFixed(4) + '%)');
console.log('0块(缝隙)     =', gaps, '(' + (100 * gaps / total).toFixed(4) + '%)');
console.log('≥2块(重叠)    =', overlaps, '(' + (100 * overlaps / total).toFixed(4) + '%)');

// 板件相对尺寸（bbox 宽高，世界单位）
console.log('\n=== 板件 bbox (世界单位) ===');
Object.keys(S.dataset.pieces).forEach(function (id) {
  var b = G.bbox([LOCAL[id]]);
  console.log(id.padEnd(3), 'w=' + (b[2] - b[0]).toFixed(2), 'h=' + (b[3] - b[1]).toFixed(2), 'area=' + G.area(LOCAL[id]).toFixed(2));
});
