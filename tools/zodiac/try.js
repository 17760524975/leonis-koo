const L = require('./lib.js');
function show(name, fn) {
  try {
    const a = fn();
    const bb = a.box();
    console.log('--- ' + name + '  ' + bb.w.toFixed(2) + 'x' + bb.h.toFixed(2) + 'u');
    console.log(L.ascii(a, 56));
  } catch (e) { console.log('--- ' + name + '  XX ' + e.message); }
}
const T1 = a => a.place('T1', 0, 0, 0);

show('T1 + T2 贴边1', () => { const a = new L.Asm(); T1(a); a.attach('T2', 0, 1, 1); return a; });
show('T1 + T2 贴边0', () => { const a = new L.Asm(); T1(a); a.attach('T2', 0, 0, 0); return a; });
show('T1 + T3 贴边1', () => { const a = new L.Asm(); T1(a); a.attach('T3', 0, 1, 1); return a; });
show('T1 + S 贴边1', () => { const a = new L.Asm(); T1(a); a.attach('S', 0, 1, 0); return a; });
show('T1 + P 贴边2', () => { const a = new L.Asm(); T1(a); a.attach('P', 0, 2, 0); return a; });
show('T1 + T4 贴边2', () => { const a = new L.Asm(); T1(a); a.attach('T4', 0, 2, 0); return a; });
