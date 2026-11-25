const L = require('./lib.js');
const cases = [];
function add(name, fn) {
  try { cases.push({ name, asm: fn() }); } catch (e) { console.log('XX', name, e.message); }
}
function up(a, id, ref, dx, dy, mo) {
  for (const m of [mo||0.7, 0.55, 0.4, 0.25, 0]) {
    try { return a.attachDir(id, ref, dx, dy, m); } catch (e) { }
  }
  throw new Error('放不下 ' + id);
}
/* 牛（横卧头左）——已验证像动物，作为参照 */
add('牛', () => {
  const a = new L.Asm();
  a.place('T1', 0, 0, 0);
  up(a, 'T2', 0, 0.9, 0.4);
  up(a, 'S', 0, -1, 0);
  up(a, 'T3', 0, 0, -1);
  up(a, 'T4', 2, 0, -1);
  up(a, 'T5', 0, 0, 1);
  up(a, 'P', 1, 0.6, 1);
  return a;
});
/* 鼠（直立，头在上，双耳，尾右下） */
add('鼠', () => {
  const a = new L.Asm();
  a.place('T1', 0, 0, 180);          // 尖朝上
  up(a, 'T2', 0, 0, 1);              // 身体往下
  up(a, 'T3', 0, 0, -1);             // 头在上
  up(a, 'S', 2, 0, -1);
  up(a, 'T4', 3, -1, -0.4);          // 左耳
  up(a, 'T5', 3, 1, -0.4);           // 右耳
  up(a, 'P', 1, 1, 0.5);             // 尾
  return a;
});
/* 兔（直立，长耳向上） */
add('兔', () => {
  const a = new L.Asm();
  a.place('T1', 0, 0, 180);
  up(a, 'T2', 0, 0, 1);
  up(a, 'T3', 0, 0, -1);
  up(a, 'S', 2, 0, -1);
  up(a, 'P', 3, 0, -1);              // 长耳
  up(a, 'T4', 0, -1, 0.3);           // 前爪
  up(a, 'T5', 1, 0, 1);              // 脚
  return a;
});
/* 鸡（直立，冠在顶，尾羽在右） */
add('鸡', () => {
  const a = new L.Asm();
  a.place('T1', 0, 0, 180);
  up(a, 'T2', 0, 1, 0.3);
  up(a, 'T3', 0, 0, -1);
  up(a, 'S', 2, 0, -1);
  up(a, 'T4', 3, 0, -1);             // 冠
  up(a, 'P', 1, 1, -0.3);            // 尾羽
  up(a, 'T5', 1, 0, 1);              // 脚
  return a;
});
L.renderHTML(cases, __dirname + '/try6.html');
cases.forEach(c => console.log(c.name, c.asm.box().w.toFixed(1) + 'x' + c.asm.box().h.toFixed(1)));
