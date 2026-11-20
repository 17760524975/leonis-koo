/* 关卡与判定验收（Node 直接跑，不依赖浏览器）
 * 1. 六关标准解：覆盖率/溢出/重叠/面积守恒
 * 2. 多解不误杀：每关的替代摆法也要通过
 * 3. 反例：故意错位、故意重叠 → 必须判不通关
 * 4. 判定性能：预热后取中位数
 * 用法：node verify_levels.js
 */
const G = require('../js/geom.js');
const J = require('../js/judge.js');
require('../js/levels.js');
const DATA = globalThis.TANGRAM_DATA;
const DS = DATA.dataset;

const LOCAL1000 = {};
for (const id of Object.keys(DS.pieces)) {
  LOCAL1000[id] = G.makeLocal(DS.pieces[id].base).map(v => [v[0] * DS.unitScale, v[1] * DS.unitScale]);
}
function polysOf(solution) {
  return solution.map((st, i) => [G.toWorld(LOCAL1000[st.id], st), i]);
}

const PASS_COVER = 0.99, PASS_OVER = 0.01, PAIR_TOL = 0.005;

let fail = 0, quiet = false;
function check(label, ok, detail) {
  if (!ok) fail++;
  if (!ok || !quiet) console.log(`  [${ok ? 'OK' : 'XX'}] ${label}  ${detail}`);
}

function judgeSolution(level, solution) {
  const judge = new J.Judge();
  judge.setTarget(level.outline);
  const r = judge.judge(polysOf(solution));
  // 逐对重叠阈值：交叠面积 > 该块自身面积 0.5%
  const polys = polysOf(solution);
  const areas = polys.map(p => G.area(p[0]));
  let bad = null;
  for (const p of r.overlapPairs) {
    const [a, b] = p.key.split('-').map(Number);
    const ov = p.cells * J.CELL * J.CELL;
    const limit = PAIR_TOL * Math.min(areas[a], areas[b]);
    if (ov > limit) bad = { key: p.key, ov, limit };
  }
  return { r, bad, areas };
}

console.log(`==== 1. ${DATA.levels.length} 关标准解 ====`);
let minCover = 1, maxOver = 0, maxAreaErr = 0, overlapBad = 0;
for (const lv of DATA.levels) {
  const { r, bad, areas } = judgeSolution(lv, lv.solution);
  const sumA = lv.solution.reduce((s, st) => s + G.area(G.toWorld(LOCAL1000[st.id], st)), 0);
  const outA = G.area(lv.outline);
  const areaErr = Math.abs(sumA - outA) / outA;
  minCover = Math.min(minCover, r.coverage);
  maxOver = Math.max(maxOver, r.overflow);
  maxAreaErr = Math.max(maxAreaErr, areaErr);
  if (bad) overlapBad++;
  quiet = true;
  check(`#${lv.id} ${lv.name} 覆盖率 ${(r.coverage * 100).toFixed(3)}%`, r.coverage >= PASS_COVER, `阈值 ${PASS_COVER * 100}%`);
  check(`#${lv.id} ${lv.name} 溢出 ${(r.overflow * 100).toFixed(3)}%`, r.overflow < PASS_OVER, `阈值 ${PASS_OVER * 100}%`);
  check(`#${lv.id} ${lv.name} 面积误差 ${(areaErr * 100).toFixed(4)}%`, areaErr < 0.001, `阈值 0.1%`);
  check(`#${lv.id} ${lv.name} 无真重叠`, !bad, bad ? `对 ${bad.key} 交叠 ${bad.ov.toFixed(0)} > ${bad.limit.toFixed(0)}` : '通过');
}
quiet = false;
console.log(`  ${DATA.levels.length} 关全部检完：覆盖率最低 ${(minCover * 100).toFixed(3)}%、溢出最高 ${(maxOver * 100).toFixed(3)}%、面积误差最大 ${(maxAreaErr * 100).toFixed(4)}%、有真重叠 ${overlapBad} 关`);

console.log('\n==== 2. 多解不误杀（同轮廓的另一种摆法）====');
const report = require('./out/levels_report.json');

/* 替代摆法在枚举时是「A 板固定在原位」的独立帧，可能整体旋转/镜像过。
 * 这里用各板质心做最小二乘拟合，找出与关卡解一致的刚体变换，再送去判定。
 */
function fitAlt(altConf, solution) {
  const U = DS.unitScale;
  const solById = {};
  for (const st of solution) solById[st.id] = st;
  // 按板 id 对齐（替代摆法的板顺序可能与标准解不同）
  altConf = altConf.slice().sort((a, b) => (a.id < b.id ? -1 : 1));
  const altCent = altConf.map(p => G.centroid(p.poly));
  const solCent = altConf.map(p => [solById[p.id].x, solById[p.id].y]);
  const rotFlip = (p, k, fl) => {
    const a = k * Math.PI / 2, c = Math.cos(a), s = Math.sin(a);
    const x = fl ? -p[0] : p[0], y = p[1];
    return [x * c - y * s, x * s + y * c];
  };
  let best = null;
  for (let k = 0; k < 4; k++) for (const fl of [false, true]) {
    const ta = altCent.map(c => {
      const r = rotFlip(c, k, fl);
      return [r[0] * U, r[1] * U];
    });
    let dx = 0, dy = 0;
    for (let i = 0; i < ta.length; i++) { dx += solCent[i][0] - ta[i][0]; dy += solCent[i][1] - ta[i][1]; }
    dx /= ta.length; dy /= ta.length;
    let err = 0;
    for (let i = 0; i < ta.length; i++) {
      err = Math.max(err, Math.hypot(ta[i][0] + dx - solCent[i][0], ta[i][1] + dy - solCent[i][1]));
    }
    if (!best || err < best.err) best = { err, k, fl, dx, dy };
  }
  if (best.err > 3) return null;
  // 反解每块板的 (x,y,angle,flipped)
  return altConf.map((p, i) => {
    const w = p.poly.map(v => {
      const r = rotFlip(v, best.k, best.fl);
      return [r[0] * U + best.dx, r[1] * U + best.dy];
    });
    const c = G.centroid(w);
    let fit = null;
    for (let kk = 0; kk < 8; kk++) for (const ff of [false, true]) {
      const cand = G.toWorld(LOCAL1000[p.id], { x: c[0], y: c[1], angle: kk * 45, flipped: ff });
      let e = 0;
      for (const v of w) {
        let m = Infinity;
        for (const q of cand) m = Math.min(m, Math.hypot(v[0] - q[0], v[1] - q[1]));
        e = Math.max(e, m);
      }
      if (!fit || e < fit.e) fit = { e, st: { id: p.id, x: +c[0].toFixed(2), y: +c[1].toFixed(2), angle: kk * 45, flipped: ff } };
    }
    return fit.e < 1 ? fit.st : null;
  });
}

let altTested = 0;
let altSkipped = 0, altFail = 0;
quiet = true;
for (const lv of DATA.levels) {
  const alts = (report.alts && report.alts[lv.id]) || [];
  for (const raw of alts) {
    const st = fitAlt(raw.slice(), lv.solution);
    if (!st || st.some(x => !x)) { altSkipped++; continue; }
    const { r, bad } = judgeSolution(lv, st);
    altTested++;
    if (!(r.coverage >= PASS_COVER && !bad)) altFail++;
    check(`#${lv.id} ${lv.name} 替代摆法 覆盖率 ${(r.coverage * 100).toFixed(2)}%`, r.coverage >= PASS_COVER && !bad,
      `溢出 ${(r.overflow * 100).toFixed(2)}% ${bad ? '有真重叠' : ''}`);
  }
}
quiet = false;
console.log(`  对齐失败跳过 ${altSkipped} 种；替代摆法不通过 ${altFail} 种`);
console.log(`  共测试 ${altTested} 种替代摆法`);

console.log('\n==== 3. 反例（必须判不通关）====');
{
  const lv = DATA.levels[0];
  // 3.1 错位：把 B 平移 40 个单位
  const shifted = JSON.parse(JSON.stringify(lv.solution));
  shifted[1].x += 40; shifted[1].y += 40;
  const { r } = judgeSolution(lv, shifted);
  check(`错位一块 → 覆盖率 ${(r.coverage * 100).toFixed(2)}%`, r.coverage < PASS_COVER, '应判不通关');

  // 3.2 差一点点：平移 8 个单位
  const near = JSON.parse(JSON.stringify(lv.solution));
  near[1].x += 8;
  const n2 = judgeSolution(lv, near);
  check(`差一点点(8单位) → 覆盖率 ${(n2.r.coverage * 100).toFixed(2)}%  重叠 ${n2.bad ? '有' : '无'}`,
    n2.r.coverage < PASS_COVER || !!n2.bad, '应判不通关');

  // 3.3 故意把 B 压到 A 上
  const onTop = JSON.parse(JSON.stringify(lv.solution));
  const aSt = onTop[0], bSt = onTop[1];
  bSt.x = aSt.x; bSt.y = aSt.y;
  const n3 = judgeSolution(lv, onTop);
  check(`B 压到 A 上 → 重叠 ${n3.bad ? (n3.bad.ov / n3.areas[1] * 100).toFixed(1) + '%' : '未检出'}`,
    !!n3.bad, '应报「有两块压在一起了」');

  // 3.4 少放一块
  const missing = JSON.parse(JSON.stringify(lv.solution)).slice(0, 3);
  const n4 = judgeSolution(lv, missing);
  check(`少放一块 → 覆盖率 ${(n4.r.coverage * 100).toFixed(2)}%`, n4.r.coverage < PASS_COVER, '应判不通关');
}

console.log('\n==== 4. 判定性能（1000 坐标系 / 250×250 栅格 / 4×4 子采样）====');
{
  const lv = DATA.levels[0];
  const judge = new J.Judge();
  judge.setTarget(lv.outline);
  const polys = polysOf(lv.solution);
  for (let i = 0; i < 8; i++) judge.judge(polys);       // 预热
  const times = [];
  for (let i = 0; i < 40; i++) {
    const t0 = process.hrtime.bigint();
    judge.judge(polys);
    times.push(Number(process.hrtime.bigint() - t0) / 1e6);
  }
  times.sort((a, b) => a - b);
  console.log(`  setTarget 一次：`, (() => {
    const t0 = process.hrtime.bigint(); judge.setTarget(lv.outline);
    return (Number(process.hrtime.bigint() - t0) / 1e6).toFixed(2) + ' ms';
  })());
  console.log(`  单次判定 中位数 ${times[20].toFixed(2)}ms  最小 ${times[0].toFixed(2)}ms  最大 ${times[39].toFixed(2)}ms`);
  check('单次判定 ≤ 16ms', times[20] <= 16, `${times[20].toFixed(2)}ms`);
}

console.log('\n' + (fail === 0 ? '全部通过' : `!! ${fail} 项未通过`));
process.exit(fail === 0 ? 0 : 1);
