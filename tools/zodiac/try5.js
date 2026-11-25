const L = require('./lib.js');
const cases = [];
function add(name, fn) {
  try { cases.push({ name, asm: fn() }); } catch (e) { console.log(name, 'XX', e.message); }
}
add('菱1', () => {
  const a = new L.Asm();
  a.place('T1', 0, 0, 0); a.attach('T2', 0, 0, 0);
  a.attach('T3', 0, 2, 1); a.attach('T5', 0, 1, 0);
  a.attach('P', 1, 1, 3); a.attach('T4', 2, 2, 0); a.attach('S', 1, 0, 0);
  return a;
});
add('牛C', () => {
  const a = new L.Asm();
  a.place('T1', 0, 0, 0); a.attach('T2', 0, 1, 1);
  a.attach('S', 0, 2, 0); a.attach('T5', 1, 2, 0);
  a.attach('T3', 0, 0, 0); a.attach('T4', 2, 1, 0); a.attach('P', 1, 0, 3);
  return a;
});
add('菱3', () => {
  const a = new L.Asm();
  a.place('T1', 0, 0, 90);       // 尖朝右
  a.attach('T2', 0, 0, 0);       // 菱形
  a.attach('T3', 1, 2, 1);       // 头（左上）
  a.attach('T4', 2, 2, 0);       // 角
  a.attach('T5', 0, 1, 0);       // 腿（右下）
  a.attach('S', 1, 1, 0);        // 腿
  a.attach('P', 1, 0, 3);        // 尾
  return a;
});
add('长条3', () => {
  const a = new L.Asm();
  a.place('T1', 0, 0, 90);
  a.attach('T2', 0, 0, 0);
  a.attach('T3', 1, 3, 1);
  a.attach('P', 1, 2, 2);
  a.attach('T4', 2, 1, 0);
  a.attach('T5', 0, 1, 0);
  a.attach('S', 1, 1, 0);
  return a;
});
L.renderHTML(cases, __dirname + '/try5.html');
console.log(cases.map(c => c.name + ' ' + c.asm.box().w.toFixed(1) + 'x' + c.asm.box().h.toFixed(1)).join(' | '));
