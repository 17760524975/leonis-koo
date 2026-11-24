/* 临时探针：打印两套数据集在散放托盘里的实际占用（不参与验收）
 * 用法：node tools/probe_pack.js
 */
require('../js/levels.js');
const C = require('../js/config.js');
const core = require('../js/core.js');

const grad = { addColorStop() {} };
const ctx = new Proxy({}, {
  get(t, k) {
    if (k === 'measureText') return () => ({ width: 40 });
    if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad;
    if (k === 'createPattern') return () => null;
    if (k === 'canvas') return { width: 0, height: 0, style: {} };
    return () => {};
  }
});
const store = {};
global.requestAnimationFrame = () => 1;
const env = {
  ctx, size: () => ({ w: 375, h: 812 }), dpr: () => 3,
  bindInput() {}, storage: { get: k => store[k] || null, set: (k, v) => { store[k] = v; } },
  audio: { unlock() {}, setEnabled() {}, play() {}, duck() {}, setVisible() {} },
  vibrate() {}, images: {}, onHide() {}, onShow() {}
};
const g = core(env);
['tangram4', 'tangram7'].forEach(k => {
  const b = (g.buildSet || g._debug.buildSet)(k);
  const y0 = b.SLOT_POS.map(s => s.y).sort((a, b2) => a - b2);
  console.log(k, 'band', b.fit.band, 'fit', Math.round(b.fit.totalW) + 'x' + Math.round(b.fit.totalH),
    'minVisible', b.fit.pile.minVisible.toFixed(2), 'cells', b.fit.pile.cells);
  b.SLOT_POS.forEach((s, i) => console.log('   ', b.ds.pieceOrder[i],
    'cx', Math.round(s.x), 'cy', Math.round(s.y), 'vis', (s.vis * 100).toFixed(0) + '%'));
});
