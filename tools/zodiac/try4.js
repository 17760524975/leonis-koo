const L = require('./lib.js');
function show(name, fn) {
  try {
    const a = fn(); const bb = a.box();
    console.log('--- ' + name + '  ' + bb.w.toFixed(2) + 'x' + bb.h.toFixed(2) + 'u  未接触:' + (a.connected().join('') || 'ok'));
    console.log(L.ascii(a, 46));
  } catch (e) { console.log('--- ' + name + '  XX ' + e.message); }
}
/* 菱形身体（T1+T2）：头左、腿下、尾右 */
show('菱1', () => {
  const a = new L.Asm();
  a.place('T1', 0, 0, 0);
  a.attach('T2', 0, 0, 0);     // 菱形
  a.attach('T3', 0, 2, 1);     // 头：贴左下斜边
  a.attach('T5', 0, 1, 0);     // 腿：右下
  a.attach('P', 1, 1, 3);      // 尾
  a.attach('T4', 2, 2, 0);     // 角
  a.attach('S', 1, 0, 0);      // 另一块
  return a;
});
/* 菱形身体 + 头用正方形 + 上方耳朵 */
show('菱2', () => {
  const a = new L.Asm();
  a.place('T1', 0, 0, 0);
  a.attach('T2', 0, 0, 0);
  a.attach('S', 0, 2, 1);
  a.attach('T4', 2, 2, 0);
  a.attach('T5', 2, 1, 0);
  a.attach('T3', 1, 1, 1);
  a.attach('P', 1, 0, 3);
  return a;
});
