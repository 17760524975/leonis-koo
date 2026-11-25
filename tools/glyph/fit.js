/* 字母造型解析：逐色掩膜 IoU 拟合
 * ---------------------------------------------------------------
 * 与生肖（tools/zodiac/extract6.js）同一套路，差别：
 *   · 颜色 → 板件的映射按用户给定的字母图配色（蓝/粉=大三角、绿=正方形、
 *     深红/深黄=小三角、淡黄=中三角、紫=平行四边形）
 *   · 版面切分走 seg.js（4 行 7/7/7/5，靠行投影 + x 间隙聚合）
 *   · 图形是字母，朝向以「正立」为准，所以同样先估一个整体旋转 δ（多数为 0），
 *     再逐块求 (角度, 翻面, 平移)，输出时扣掉 δ。
 *
 * 输出 tools/glyph/letters_fit.json
 */
const fs = require('fs');
const path = require('path');
const SEG = require('./seg.js');
const L = require('../zodiac/lib.js');

const src = SEG.load(path.join(__dirname, 'ref.png'));
const W = src.W, H = src.H;
const letters = SEG.segment(src);

function inPoly(pt, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if (((a[1] > pt[1]) !== (b[1] > pt[1])) && (pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0])) c = !c;
  }
  return c;
}
const polyArea = p => { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; };

function makeLocalMask(p) {
  const x0 = p.x0 - 4, y0 = p.y0 - 4;
  const w = p.x1 - p.x0 + 9, h = p.y1 - p.y0 + 9;
  const m = new Uint8Array(w * h);
  for (const k of p.pix) m[((k / W | 0) - y0) * w + (k % W - x0)] = 1;
  return { m, w, h, x0, y0, n: p.n };
}
function iouOn(lm, poly) {
  const x0 = Math.max(lm.x0, Math.floor(Math.min(...poly.map(v => v[0]))) - 1);
  const x1 = Math.min(lm.x0 + lm.w - 1, Math.ceil(Math.max(...poly.map(v => v[0]))) + 1);
  const y0 = Math.max(lm.y0, Math.floor(Math.min(...poly.map(v => v[1]))) - 1);
  const y1 = Math.min(lm.y0 + lm.h - 1, Math.ceil(Math.max(...poly.map(v => v[1]))) + 1);
  let inter = 0;
  for (let y = y0; y <= y1; y++) {
    const yy = y - lm.y0;
    if (yy < 0 || yy >= lm.h) continue;
    const row = yy * lm.w;
    for (let x = x0; x <= x1; x++) {
      const xx = x - lm.x0;
      if (xx < 0 || xx >= lm.w) continue;
      if (lm.m[row + xx] && inPoly([x + 0.5, y + 0.5], poly)) inter++;
    }
  }
  const pa = polyArea(poly);
  return inter / (lm.n + pa - inter);
}

const RESULT = [];
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
letters.filter(g => !ONLY.length || ONLY.indexOf(g.name) >= 0).forEach(g => {
  const ps = SEG.piecesOf(src, g);
  if (ps.some(x => !x)) { console.log('XX ' + g.name + ' 缺色块'); return; }
  let mx0 = 0, my0 = 0, area = 0;
  const items = ps.map(x => {
    let mx = 0, my = 0;
    for (const k of x.p.pix) { mx += k % W; my += (k / W) | 0; }
    mx /= x.p.n; my /= x.p.n;
    mx0 += mx * x.p.n; my0 += my * x.p.n; area += x.p.n;
    return { cl: x.cl, p: x.p, lm: makeLocalMask(x.p), mx, my };
  });
  mx0 /= area; my0 /= area;
  const u = Math.sqrt(area / 16);

  /* 阶段 A：整体旋转 δ（-25°..25°） */
  const scoreAt = (dd, uu) => {
    let s = 0;
    for (const it of items) {
      let bs = 0;
      for (let ai = 0; ai < 8; ai++) for (const f of [false, true]) {
        const tpl = L.LOCAL[it.cl.id].map(v => L.rot(v, ai * 45 + dd, f));
        const pts = tpl.map(v => [v[0] * uu + it.mx, v[1] * uu + it.my]);
        const sc = iouOn(it.lm, pts);
        if (sc > bs) bs = sc;
      }
      s += bs;
    }
    return s;
  };
  let bestD = { dd: 0, s: -1 };
  for (let dd = -25; dd <= 25; dd += 1) {
    const s = scoreAt(dd, u);
    if (s > bestD.s) bestD = { dd, s };
  }
  let fine = bestD;
  for (let dd = bestD.dd - 1; dd <= bestD.dd + 1.001; dd += 0.2) {
    const s = scoreAt(dd, u);
    if (s > fine.s) fine = { dd, s };
  }
  const dd = fine.dd;

  /* 阶段 B：定 δ 后逐块定 (角度, 翻面)，再做平移细化。
   * 缩放不逐块搜：掩膜面积与「4/4/2/2/2/1/1 u²」逐块吻合（误差 <2%），说明
   * 参考图就是标准七巧板，尺寸由总面积算出的 u 定死即可。逐块搜缩放只会把
   * 1px 的量化误差放大成板与板之间的尺寸差，后面拼接就会凭空多出缝隙。 */
  const pieces = [];
  for (const it of items) {
    let best = null;
    for (let ai = 0; ai < 8; ai++) for (const f of [false, true]) {
      const tpl = L.LOCAL[it.cl.id].map(v => L.rot(v, ai * 45 + dd, f));
      const pts = tpl.map(v => [v[0] * u + it.mx, v[1] * u + it.my]);
      const sc = iouOn(it.lm, pts);
      if (!best || sc > best.score) best = { ang: ai * 45, f, score: sc, dx: 0, dy: 0 };
    }
    let ref = best;
    for (let dy = -1.5; dy <= 1.501; dy += 0.25) {
      for (let dx = -1.5; dx <= 1.501; dx += 0.25) {
        const tpl = L.LOCAL[it.cl.id].map(v => L.rot(v, best.ang + dd, best.f));
        const pts = tpl.map(v => [v[0] * u + it.mx + dx, v[1] * u + it.my + dy]);
        const sc = iouOn(it.lm, pts);
        if (sc > ref.score) ref = { ...best, score: sc, dx, dy };
      }
    }
    pieces.push({
      id: it.cl.id, ang: ref.ang, f: ref.f,
      cx: it.mx + ref.dx, cy: it.my + ref.dy,
      score: ref.score, sMul: 1, areaU: it.p.n / (u * u)
    });
  }
  /* 去旋转：位置绕图形质心转 -δ */
  const a = -dd * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
  pieces.forEach(p => {
    const x = p.cx - mx0, y = p.cy - my0;
    p.cx = x * ca - y * sa + mx0;
    p.cy = x * sa + y * ca + my0;
  });

  const scMin = Math.min(...pieces.map(p => p.score));
  const ok = scMin > 0.88;
  console.log((ok ? 'OK ' : 'XX ') + g.name + ' δ=' + dd.toFixed(1).padStart(5) + '° u=' + u.toFixed(2) +
    ' IoU最低' + scMin.toFixed(3) + ' 均值' + (pieces.reduce((s, p) => s + p.score, 0) / 7).toFixed(3) +
    ' | ' + pieces.map(p => p.id + ':' + p.score.toFixed(2)).join(' '));
  RESULT.push({ name: g.name, u, delta: dd, cxPx: mx0, cyPx: my0, pieces });
});

fs.writeFileSync(path.join(__dirname, 'letters_fit.json'), JSON.stringify(RESULT, null, 1));
console.log('\n完成 ' + RESULT.length + '/26');
