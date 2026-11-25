const L = require('./lib.js');
function show(name, fn) {
  try {
    const a = fn(); const bb = a.box();
    console.log('--- ' + name + '  ' + bb.w.toFixed(2) + 'x' + bb.h.toFixed(2) + 'u  未接触:' + (a.connected().join('') || 'ok'));
    console.log(L.ascii(a, 50));
  } catch (e) { console.log('--- ' + name + '  XX ' + e.message); }
}
/* 牛：身体=两块大三角拼 6x2，头在左 */
show('牛A', () => {
  const a = new L.Asm();
  a.place('T1', 0, 0, 0);
  a.attach('T2', 0, 1, 1);      // 身体
  a.attach('T3', 0, 2, 1);      // 颈：贴 T1 左斜边
  a.attach('S', 2, 1, 0);       // 头：贴 T3 斜边
  a.attach('T5', 1, 2, 0);      // 腿
  a.attach('P', 1, 1, 3);       // 尾
  a.attach('T4', 3, 2, 0);      // 角
  return a;
});
/* 牛B：头用正方形直接贴身体左端 */
show('牛B', () => {
  const a = new L.Asm();
  a.place('T1', 0, 0, 0);
  a.attach('T2', 0, 1, 1);
  a.attach('S', 0, 2, 1);       // 头贴左斜边
  a.attach('T3', 0, 0, 0);      // 背
  a.attach('T5', 1, 2, 0);
  a.attach('P', 1, 1, 3);
  a.attach('T4', 2, 1, 0);
  return a;
});
