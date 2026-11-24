/* v0.34 全局钱包探针：四巧板 / 七巧板切换后巧币、体力是否同一份
 * 用法：node tools/probe_wallet.js
 */
require('../js/levels.js');
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
  bindInput() {}, storage: { get: k => (k in store ? store[k] : null), set: (k, v) => { store[k] = v; } },
  audio: { unlock() {}, setEnabled() {}, play() {}, duck() {}, setVisible() {} },
  vibrate() {}, images: {}, onHide() {}, onShow() {}
};
const g = core(env);
const D = g._debug;
g.init();
const W = () => JSON.parse(store['tangram_wallet_v1'] || 'null');

function show(tag) {
  const s = g.state.save;
  console.log(tag, 'set=' + g.state.setKey, 'coin=' + s.coin, 'energy=' + s.energy,
    'hintItems=' + s.hintItems, 'wallet=' + JSON.stringify(W()));
}
show('init(四巧)');
g.state.save.coin = 777; g.state.save.energy = 9; g.state.save.hintItems = 3;
D.openLevel(2);                       // 触发一次落盘（顺便扣 2 体力）
show('四巧改余额');
D.useSet('tangram7');
show('切七巧板  ');
g.state.save.coin = 123;
D.openLevel(2);
show('七巧改余额');
D.useSet('tangram4');
show('切回四巧  ');
const ok = g.state.save.coin === 123 && g.state.save.hintItems === 3 && W() && W().coin === 123;
console.log(ok ? '\n[OK] 巧币/体力/道具跨数据集共用一份钱包' : '\n[XX] 钱包未生效');
process.exit(ok ? 0 : 1);
