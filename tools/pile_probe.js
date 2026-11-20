/* 散放打包探针：打印两套板件的托盘落点、重叠率、可见率、耗时
 * 用法：node tools/pile_probe.js [--json]
 */
const path = require('path');
const ROOT = path.join(__dirname, '..');

global.requestAnimationFrame = () => 1;
require(path.join(ROOT, 'js/levels.js'));
require(path.join(ROOT, 'js/geom.js'));
require(path.join(ROOT, 'js/judge.js'));
const CFG = require(path.join(ROOT, 'js/config.js'));
const CORE = require(path.join(ROOT, 'js/core.js'));

const ctx = new Proxy({}, {
  get: (t, k) => {
    if (k === 'measureText') return () => ({ width: 40 });
    if (k === 'canvas') return { width: 0, height: 0, style: {} };
    return () => {};
  },
  set: () => true
});
const env = {
  ctx, size: () => ({ w: 375, h: 812 }), dpr: () => 2,
  safeInsets: () => ({ top: 20, bottom: 0 }),
  bindInput() {}, storage: { get: () => null, set() {} },
  audio: { play() {}, duck() {}, setEnabled() {}, unlock() {}, setVisible() {} },
  vibrate() {}, images: {}
};
const game = CORE(env);

function dump(key) {
  const t0 = Date.now();
  const b = game._debug.buildSet(key);
  const ms = Date.now() - t0;
  const LAY = CFG.LAYOUT;
  console.log(`\n=== ${key} === 打包耗时 ${ms}ms  带 ${LAY.TRAY.top}~${LAY.TRAY.bottom}`);
  let minVis = 1;
  b.SLOT_POS.forEach((s, i) => {
    const bb = b.TRAY_BB[b.ds.pieceOrder[i]];
    minVis = Math.min(minVis, s.vis);
    console.log(`  ${b.ds.pieceOrder[i].padEnd(3)} 质心 (${s.x.toFixed(0)},${s.y.toFixed(0)})  bbox ${bb.w.toFixed(0)}×${bb.h.toFixed(0)}  覆盖 ${(s.cover * 100).toFixed(0)}%  可见 ${(s.vis * 100).toFixed(0)}%`);
  });
  const ys = b.SLOT_POS.map(s => s.y);
  console.log(`  质心 y 范围 ${Math.min(...ys).toFixed(0)}~${Math.max(...ys).toFixed(0)}  最小可见 ${(minVis * 100).toFixed(0)}%`);
  return b;
}
const a = dump('tangram4');
const b = dump('tangram7');
if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ t4: a.SLOT_POS, t7: b.SLOT_POS }, null, 1));
}
