/* 把求解出的 4 块拼法导出成 levels.js 用的关卡对象
 *
 * 坐标口径与已有关卡一致：
 *   · 1u = 130 世界单位（dataset.unitScale）
 *   · 整体居中到 (500,500)，且顶点落在「500 + 65k」点阵上（0.5u 格子）
 *   · solution 里 (x,y) 是板件**质心**的世界坐标，变换为
 *       p_world = R(angle) · F(flipped) · (base − centroid(base)) · 130 + (x,y)
 *     其中 base 是 u 单位的板型顶点
 *
 * 用法：node tools/figs4/export.js
 */
const fs = require('fs');
const path = require('path');
const G = require('../../js/geom.js');

const HERE = __dirname, OUT = path.join(HERE, 'out');
const FINAL = JSON.parse(fs.readFileSync(path.join(OUT, 'final.json'), 'utf8'));

const U = 130;
const BASE = {
  A: [[3, 0], [0, 0], [1, 1], [3, 1]],
  B: [[0, 1], [0, 0], [1, 1]],
  C: [[0, 0], [1.5, 0], [0.5, 1], [0, 1]],
  D: [[0.5, 0], [0.5, 1], [0, 1], [1, 2], [2.5, 2]]
};
const LOCAL = {};
for (const id of Object.keys(BASE)) LOCAL[id] = G.makeLocal(BASE[id]).map(v => [v[0] * U, v[1] * U]);

const r2 = v => Math.round(v * 100) / 100;
const r4 = v => Math.round(v * 10000) / 10000;
function shoelace(p) {
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s / 2;
}
/* 世界多边形 → {angle, flipped, x, y} */
function solveState(id, worldPoly) {
  const L = LOCAL[id];
  const c = G.centroid(worldPoly);           // 世界质心 = toWorld 的 (x,y)
  /* 先扫一圈「不翻面」，再扫一圈「翻面」：B 这种等腰直角三角形翻面后能被旋转等价，
   * 若按 angle 外层遍历会先命中 flipped=true 的写法，白白要求玩家翻面。 */
  for (const fl of [false, true]) {
    for (let k = 0; k < 8; k++) {
      const st = { x: c[0], y: c[1], angle: k * 45, flipped: fl };
      const pred = G.toWorld(L, st);
      let ok = true;
      for (let i = 0; i < pred.length; i++) {
        const j = (i + worldPoly.length - 0) % worldPoly.length;
        // 顶点顺序可能整体轮转，逐个比对（同向遍历）
        let hit = false;
        for (let t = 0; t < worldPoly.length; t++) {
          const dx = pred[i][0] - worldPoly[t][0], dy = pred[i][1] - worldPoly[t][1];
          if (Math.hypot(dx, dy) < 0.05) { hit = true; break; }
        }
        if (!hit) { ok = false; break; }
      }
      if (ok) {
        // 反向校验：世界顶点也都能在预测里找到
        let ok2 = true;
        for (let t = 0; t < worldPoly.length; t++) {
          let hit = false;
          for (let i = 0; i < pred.length; i++) {
            const dx = pred[i][0] - worldPoly[t][0], dy = pred[i][1] - worldPoly[t][1];
            if (Math.hypot(dx, dy) < 0.05) { hit = true; break; }
          }
          if (!hit) { ok2 = false; break; }
        }
        if (ok2) return st;
      }
    }
  }
  return null;
}

/* parTime / parSteps：难度曲线不能倒退 —— 前 20 关是 78..105（用时）、6..25（步数），
 * 第 27 关（原 21 关）是 106 / 26，所以 6 个新关只能落在 105..106 / 25..26 这个窄区间里。 */
const META = {
  f1: { parTime: 105, parSteps: 25, tip: '斜着看，凹口只有一种填法' },
  f2: { parTime: 105, parSteps: 25, tip: '先把最深那条凹槽填掉' },
  f3: { parTime: 105, parSteps: 25, tip: '两个尖角各占一块，别急着动大梯形' },
  f4: { parTime: 106, parSteps: 26, tip: '上下两条横带，中间靠一块斜的接起来' },
  f5: { parTime: 106, parSteps: 26, tip: '窄缝比看上去宽，先塞小三角' },
  f6: { parTime: 106, parSteps: 26, tip: '中间那道斜槽是关键，先放进去的那块最省事' }
};
const ORDER = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'];

const levels = [];
ORDER.forEach((tag, i) => {
  const rec = FINAL[tag];
  if (!rec) throw new Error(tag + ' 缺失');
  const outline = rec.outline;
  const bb = G.bbox([outline]);
  const cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2;
  // 平移量取 65 的整数倍，保证顶点落在 500+65k 点阵上
  const tx = 500 - 65 * Math.round(cx * 2);
  const ty = 500 - 65 * Math.round(cy * 2);
  const toWorld = p => [p[0] * U + tx, p[1] * U + ty];

  const outlineW = outline.map(p => toWorld(p).map(r2));
  const sol = [];
  let anyFlip = false;
  for (const pc of rec.pieces) {
    const wp = pc.poly.map(toWorld);
    const st = solveState(pc.id, wp);
    if (!st) throw new Error(tag + ' 的 ' + pc.id + ' 块无法反解朝向');
    if (st.flipped) anyFlip = true;
    sol.push({ id: pc.id, x: r2(st.x), y: r2(st.y), angle: st.angle, flipped: st.flipped });
  }
  // 面积校验：4 块 = 6u²
  const arW = Math.abs(shoelace(outlineW));
  const expect = 6 * U * U;
  /* 轮廓坐标保留 2 位小数（转了 45°/135° 后是无理数），面积会差几十个单位，
   * 相对误差 < 0.05% 即可（101400 × 5e-4 ≈ 50）。 */
  if (Math.abs(arW - expect) > expect * 5e-4) throw new Error(tag + ' 面积异常 ' + arW);
  // 覆盖率校验：4 块并集面积应等于轮廓面积
  const piecesW = sol.map(s => G.toWorld(LOCAL[s.id], s));
  const sumP = piecesW.reduce((a, p) => a + Math.abs(shoelace(p)), 0);
  if (Math.abs(sumP - arW) > expect * 5e-4) throw new Error(tag + ' 板件面积和与轮廓不符 ' + sumP);

  const o = {
    id: 21 + i,
    chapter: 2,
    name: '',
    tip: META[tag].tip,
    outline: outlineW,
    solution: sol,
    parTime: META[tag].parTime,
    parSteps: META[tag].parSteps,
    needFlip: anyFlip
  };
  levels.push(o);
  console.log(tag, '→ id', o.id, '| 顶点', outlineW.length, '| 面积', arW.toFixed(0),
    '| 翻面', anyFlip, '| bbox', outlineW.reduce((a, p) => [Math.min(a[0], p[0]), Math.min(a[1], p[1]),
      Math.max(a[2], p[0]), Math.max(a[3], p[1])], [1e9, 1e9, -1e9, -1e9]).map(v => v.toFixed(0)).join(','));
  console.log('   拼法', sol.map(s => s.id + '@' + s.angle + (s.flipped ? 'F' : '')).join(' '));
});

fs.writeFileSync(path.join(OUT, 'levels4.json'), JSON.stringify(levels, null, 1));
console.log('\n→ tools/figs4/out/levels4.json');
