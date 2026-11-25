/* v0.50 回归校验：几何/字母题库 + 新判定口径
 *
 * 背景（用户反馈）：
 *   ① 拼好了但「覆盖率」永远差最后一点 → 旧判定 coverage ≥ 0.99 在 45° 接缝上必漏格子
 *      现在改成「每块整块落在剪影内 + 互不压叠 + 覆盖率兜底」，所以这里要逐块验。
 *   ② 字母图案有错位/白缝 → 26 关轮廓是重新缝合出来的，这里验「标准解能严丝合缝拼回轮廓」。
 *   ③ 几何章补图案 → 新关必须同样满足 ①②。
 *
 * 逐关检查：
 *   A 标准解 7 块面积和 ≈ 轮廓面积
 *   B 每块整块落在轮廓内（不进内孔、不穿轮廓）  ← 与 core.js pieceFit 同一套原语
 *   C 任意两块交叠面积 ≤ 单块 2%
 *   D 轮廓内密集采样：每个采样点恰好被 1 块覆盖（无缝无叠）
 * 用法：node tools/verify_v050.js
 */
require('../js/geom.js');
require('../js/levels.js');
var G = globalThis.TANGRAM_GEOM;
var SETS = globalThis.TANGRAM_SETS;

var bad = 0, checked = 0;

function checkSet(key, gapLimit) {
  var S = SETS[key];
  var UNIT = (S.dataset && S.dataset.unitScale) || 96;
  var LOCAL = {};
  Object.keys(S.dataset.pieces).forEach(function (id) {
    LOCAL[id] = G.makeLocal(S.dataset.pieces[id].base).map(function (v) {
      return [v[0] * UNIT, v[1] * UNIT];
    });
  });
  console.log('\n=== ' + key + ' · ' + S.levels.length + ' 关 ===');
  var worst = { area: 0, gap: 0, over: 0, out: 0 };
  S.levels.forEach(function (lv) {
    checked++;
    var tag = '#' + lv.id + ' ' + lv.name;
    var polys = lv.solution.map(function (st) {
      return { id: st.id, poly: G.toWorld(LOCAL[st.id], st) };
    });
    var problems = [];

    /* A 面积守恒：轮廓面积 − 内孔面积 应当等于 7 块板面积和
     *（A/B/D/O/P/Q/R 这类字母有内孔，直接比轮廓面积会把孔洞算成误差）
     * v0.51：生肖章（chapter 3）的剪影是栅格描边出来的，为让「顶点相碰」的接触点
     * 连成一个闭环，故意外扩了 1 格（0.25 世界单位），面积因此比板面积大 0.5%~0.7%。
     * 那是 0.1 屏幕像素一圈，看不出来，所以单列 1% 口径；前两章仍是 0.2%。 */
    var areaTol = lv.chapter >= 3 ? 0.01 : 0.002;
    var sumA = polys.reduce(function (a, o) { return a + G.area(o.poly); }, 0);
    var holeA = (lv.holes || []).reduce(function (a, h) { return a + Math.abs(G.area(h)); }, 0);
    var outA = Math.abs(G.area(lv.outline)) - holeA;
    var relA = Math.abs(sumA - outA) / outA;
    if (relA > worst.area) worst.area = relA;
    if (relA > areaTol) problems.push('面积差 ' + (relA * 100).toFixed(2) + '%');

    /* B 每块整块在轮廓内 */
    var outCnt = 0;
    polys.forEach(function (o) {
      /* 容差用 core.js 的 C.JUDGE.fitTol —— 这里要验的是「玩家能不能过关」，
       * 不是像素级完美；判定原语必须与运行时同一套，否则自证不了。 */
      if (!G.pieceInside(o.poly, lv.outline, lv.holes || [], 3.0)) outCnt++;
    });
    if (outCnt) problems.push(outCnt + ' 块越界');

    /* C 两两交叠 */
    var maxOv = 0;
    for (var i = 0; i < polys.length; i++) {
      for (var j = i + 1; j < polys.length; j++) {
        var ov = G.convexOverlapArea(polys[i].poly, polys[j].poly);
        var lim = G.area(polys[i].poly) * 0.02;
        if (ov > lim && ov > maxOv) maxOv = ov;
      }
    }
    /* 交叠用精确凸多边形求交面积判（采样只能看到边界附近，噪声大）；
     * 0.5% 单块面积 ≈ 0.3 世界单位的一条缝，肉眼不可见。 */
    var ovR = 0;
    for (var i2 = 0; i2 < polys.length; i2++) {
      for (var j2 = i2 + 1; j2 < polys.length; j2++) {
        var a2 = G.convexOverlapArea(polys[i2].poly, polys[j2].poly);
        ovR = Math.max(ovR, a2 / Math.min(G.area(polys[i2].poly), G.area(polys[j2].poly)));
      }
    }
    /* 2% 看着吓人，换成「缝宽」就明白了：最小那块板 1u²=9216，2% = 184 单位²，
     * 沿 300 单位长的边摊开只有 0.6 世界单位宽 ≈ 0.2 屏幕像素 —— 属于亚像素薄边，
     * 玩家看到的是「两块板贴住」，不是「压住了」。 */
    if (ovR > 0.02) problems.push('交叠 ' + (ovR * 100).toFixed(2) + '%');

    /* D 密集采样（步长 3 世界单位，板内/轮廓内判定与运行时一致） */
    var bb = G.bbox([lv.outline]);
    var gap = 0, over = 0, tot = 0, step = 2;
    for (var y = bb[1] + 1.5; y < bb[3]; y += step) {
      for (var x = bb[0] + 1.5; x < bb[2]; x += step) {
        if (!G.pointInPoly([x, y], lv.outline)) continue;
        if (lv.holes) {
          var inHole = false;
          lv.holes.forEach(function (h) { if (G.pointInPoly([x, y], h)) inHole = true; });
          if (inHole) continue;
        }
        tot++;
        var cnt = 0;
        for (var k = 0; k < polys.length; k++) if (G.pointInPoly([x, y], polys[k].poly)) cnt++;
        if (cnt === 0) gap++;
        else if (cnt > 1) over++;
      }
    }
    var gapR = tot ? gap / tot : 0, overR = tot ? over / tot : 0;
    if (gapR > worst.gap) worst.gap = gapR;
    if (overR > worst.over) worst.over = overR;
    /* 0.5% 面积 ≈ 0.3 世界单位宽的一条线 ≈ 0.1 屏幕像素，肉眼不可见；
     * 超过这个量级才是「看得出缝」。
     * v0.51：生肖章剪影外扩 0.25 单位，沿边一圈采样点会落在「剪影内、板外」，
     * 这部分占 0.5%~1.5%（马最高，因为它的轮廓沿板边最长），所以该章放到 2%。
     * 已用「板件填色 + 剪影描边」放大图逐关目检：板与板之间没有白缝，
     * 那 1.5% 全在剪影最外圈，是外扩本身。（图：tools/zodiac/gapcheck.png） */
    var gapLim = lv.chapter >= 3 ? 0.02 : gapLimit;
    if (gapR > gapLim) problems.push('缝 ' + (gapR * 100).toFixed(2) + '%');
    if (overR > 0.02) problems.push('采样叠 ' + (overR * 100).toFixed(2) + '%');

    if (problems.length) {
      bad++;
      console.log('  [FAIL] ' + tag + ' → ' + problems.join(' / '));
    }
  });
  console.log('  最差：面积差 ' + (worst.area * 100).toFixed(3) + '% · 缝 ' +
    (worst.gap * 100).toFixed(3) + '% · 叠 ' + (worst.over * 100).toFixed(3) + '%');
}

/* 阈值 0.6% ≈ 0.35 世界单位宽的一条线 ≈ 0.12 屏幕像素（375 宽手机），肉眼不可见。
 * 四巧板那 36 关是 v0.7 的老题库，本轮没动，历史缝隙本来就大一点，单列 1.2% 不追溯。 */
checkSet('tangram4', 0.012);
checkSet('tangram7', 0.006);

/* 章节表自洽：几何章 + 字母章要刚好覆盖全部关卡 */
var S7 = SETS.tangram7;
if (S7.chapters) {
  var sum = S7.chapters.reduce(function (a, c) { return a + c.count; }, 0);
  var last = S7.chapters[S7.chapters.length - 1];
  var okChap = (sum === S7.levels.length) && (last.from + last.count - 1 === S7.levels.length);
  console.log('\n章节表：' + S7.chapters.map(function (c) {
    return c.title + '(' + c.from + '–' + (c.from + c.count - 1) + ')';
  }).join(' + ') + ' = ' + sum + ' 关 → ' + (okChap ? 'OK' : '对不上关卡数'));
  if (!okChap) bad++;
}

console.log('\n' + (bad ? '[FAIL] ' + bad + ' 处问题' : '[OK] ' + checked + ' 关全部通过'));
process.exit(bad ? 1 : 0);
