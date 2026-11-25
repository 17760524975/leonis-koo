const L = require('./lib.js');
function show(name, fn) {
  try {
    const a = fn(); const bb = a.box();
    console.log('--- ' + name + '  ' + bb.w.toFixed(2) + 'x' + bb.h.toFixed(2) + 'u  未接触:' + (a.connected().join('') || 'ok'));
    console.log(L.ascii(a, 46));
  } catch (e) { console.log('--- ' + name + '  XX ' + e.message); }
}
/* 牛C：身体=T1+T2 长条(6x2)，头贴左下，后腿右下，背上一块，尾朝上 */
show('牛C', () => {
  const a = new L.Asm();
  a.place('T1', 0, 0, 0);
  a.attach('T2', 0, 1, 1);
  a.attach('S', 0, 2, 0);      // 头：左下
  a.attach('T5', 1, 2, 0);     // 后腿：右下
  a.attach('T3', 0, 0, 0);     // 背
  a.attach('T4', 2, 1, 0);     // 角
  a.attach('P', 1, 0, 3);      // 尾：朝上
  return a;
});
/* 牛D：头用中三角，身体长条，四足感 */
show('牛D', () => {
  const a = new L.Asm();
  a.place('T1', 0, 0, 0);
  a.attach('T2', 0, 1, 1);
  a.attach('T3', 0, 2, 1);     // 头/颈：左下
  a.attach('S', 2, 2, 0);
  a.attach('T5', 1, 2, 0);
  a.attach('P', 1, 0, 3);
  a.attach('T4', 3, 0, 0);
  return a;
});
