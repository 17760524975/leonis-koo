const L = require('./lib.js');
const cases = [];
function add(name, fn) {
  try { cases.push({ name, asm: fn() }); } catch (e) { console.log('XX', name, e.message); }
}
function up(a, id, ref, dx, dy) {
  for (const m of [0.7, 0.55, 0.4, 0.25, 0]) {
    try { return a.attachDir(id, ref, dx, dy, m); } catch (e) { }
  }
  throw new Error('放不下 ' + id);
}
/* 鼠：蹲坐，身体尖朝下，背在右，头在左上，双耳 */
add('鼠', () => {
  const a = new L.Asm();
  a.place('T1', 0, 0, 0);            // 尖朝下=坐着的臀
  up(a, 'T2', 0, 0.7, -1);           // 背：右上
  up(a, 'T3', 0, -0.8, -1);          // 胸：左上
  up(a, 'S', 2, 0, -1);
  up(a, 'T4', 3, -1, -0.2);
  up(a, 'T5', 3, 1, -0.3);
  up(a, 'P', 1, 0, 1);               // 尾
  return a;
});
/* 羊：蹲坐，头顶角 */
add('羊', () => {
  const a = new L.Asm();
  a.place('T1', 0, 0, 0);
  up(a, 'T2', 0, 0.7, -1);
  up(a, 'T3', 0, -0.8, -1);
  up(a, 'S', 2, 0, -1);
  up(a, 'T4', 3, 0, -1);             // 角
  up(a, 'P', 0, -1, 0.4);
  up(a, 'T5', 1, 0, 1);
  return a;
});
/* 猴：蹲坐，长尾绕右 */
add('猴', () => {
  const a = new L.Asm();
  a.place('T1', 0, 0, 0);
  up(a, 'T2', 0, 1, 0.6);
  up(a, 'T3', 0, -1, -0.3);
  up(a, 'S', 2, 0, -1);
  up(a, 'T4', 3, -1, 0);
  up(a, 'T5', 0, -1, -0.8);
  up(a, 'P', 1, 0.3, 1);
  return a;
});
L.renderHTML(cases, __dirname + '/try7.html');
cases.forEach(c => console.log(c.name, c.asm.box().w.toFixed(1) + 'x' + c.asm.box().h.toFixed(1)));
