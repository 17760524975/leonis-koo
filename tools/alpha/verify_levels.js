/* 关卡端到端验收：直接读 js/levels.js，用引擎自己的 geom + judge 判定。
 * 用法：node tools/alpha/verify_levels.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '../..');
const G = require(path.join(ROOT, 'js/geom.js'));
const J = require(path.join(ROOT, 'js/judge.js'));
const C = require(path.join(ROOT, 'js/config.js'));

const ctx = { window: {} };
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/levels.js'), 'utf8'), ctx);
const SET = ctx.window.TANGRAM_DATA.sets.tangram7;
const DS = SET.dataset;
const UNIT = DS.unitScale;
const PAIR_TOL = (C.CONFIG && C.CONFIG.JUDGE ? C.CONFIG.JUDGE : C.JUDGE).pairTol;

const LOCAL = {};
for (const id in DS.pieces) {
  LOCAL[id] = G.makeLocal(DS.pieces[id].base).map(v => [v[0] * UNIT, v[1] * UNIT]);
}
const ORDER = DS.pieceOrder;

let fails = 0;
const rows = [];
for (const lv of SET.levels) {
  const polys = lv.solution.map(st => [G.toWorld(LOCAL[st.id], st), ORDER.indexOf(st.id)]);
  const judge = new J.Judge();
  judge.setTarget(lv.outline, lv.holes || undefined);
  const r = judge.judge(polys);

  const areas = polys.map(p => G.area(p[0]));
  const bad = r.overlapPairs.filter(pp => {
    const [a, b] = pp.key.split('-').map(Number);
    const ia = polys.findIndex(x => x[1] === a);
    const ib = polys.findIndex(x => x[1] === b);
    const lim = PAIR_TOL * Math.min(areas[ia], areas[ib]);
    return pp.cells * J.CELL * J.CELL > lim;
  });
  const sumArea = areas.reduce((a, b) => a + b, 0);
  const want = 16 * UNIT * UNIT;
  const areaOk = Math.abs(sumArea - want) / want < 1e-4;
  const ok = r.coverage >= 0.99 && r.overflow <= 0.01 && bad.length === 0 && areaOk;
  if (!ok) fails++;
  rows.push({ id: lv.id, name: lv.name, cov: r.coverage, ovf: r.overflow, bad: bad.length,
              raw: r.overlapPairs.length, area: sumArea, ok });
  console.log(
    String(lv.id).padStart(2) + '  ' + lv.name.padEnd(4, '　') +
    ' coverage=' + r.coverage.toFixed(4) +
    ' overflow=' + r.overflow.toFixed(4) +
    ' 真重叠=' + bad.length + '/' + r.overlapPairs.length +
    ' 面积=' + (sumArea / want * 16).toFixed(3) +
    (ok ? '  PASS' : '  FAIL'));
}
console.log('\n共 ' + rows.length + ' 关，通过 ' + (rows.length - fails) + '，失败 ' + fails);
fs.writeFileSync(path.join(__dirname, 'out/verify_levels.json'), JSON.stringify(rows, null, 1));
process.exit(fails ? 1 : 0);
