const L = require('./lib.js');
const { ZODIAC, build } = require('./designs.js');
const cases = [];
ZODIAC.forEach(([name], i) => {
  try {
    const a = build(i);
    const bb = a.box();
    cases.push({ name, asm: a });
    console.log(name.padEnd(2), 'box', bb.w.toFixed(1) + 'x' + bb.h.toFixed(1), '未接触:' + (a.connected().join('') || 'ok'));
  } catch (e) { console.log(name.padEnd(2), 'XX', e.message); }
});
L.renderHTML(cases, __dirname + '/sheet.html');
