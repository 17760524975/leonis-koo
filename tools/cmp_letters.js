/* 对比当前 js/levels.js 与 tools/out/_levels_head.js 中字母关的几何差异
 * 用途：确认 repair_letters --write 是否把字母关的装配改坏了
 * 用法：node tools/cmp_letters.js
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

function loadFile(file) {
  const src = fs.readFileSync(file, 'utf8');
  const box = {};
  new Function('window', 'globalThis', 'console', src)(box, box, console);
  return box.TANGRAM_SETS;
}

const cur = loadFile(path.join(ROOT, 'js', 'levels.js'));
const head = loadFile(path.join(ROOT, 'tools', 'out', '_levels_head.js'));
const lettersOf = S => S.tangram7.levels.filter(l => /^[A-Z]$/.test(l.name));
const A = lettersOf(cur), B = lettersOf(head);
console.log('当前字母关:', A.length, A.map(l => l.name).join(''));
console.log('HEAD字母关:', B.length, B.map(l => l.name).join(''));

function outlineArea(pts) {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s / 2;
}

let bad = 0;
for (const a of A) {
  const b = B.find(x => x.name === a.name);
  if (!b) { console.log(a.name, 'HEAD 缺失'); continue; }
  let maxd = 0, worst = '';
  for (const s of a.solution) {
    const t = b.solution.find(q => q.id === s.id);
    if (!t) { maxd = 9999; worst = s.id + '(无)'; break; }
    const d = Math.hypot(s.x - t.x, s.y - t.y);
    if (d > maxd) { maxd = d; worst = s.id; }
  }
  let maxo = 0;
  if (a.outline.length === b.outline.length) {
    for (let i = 0; i < a.outline.length; i++) {
      const d = Math.hypot(a.outline[i][0] - b.outline[i][0], a.outline[i][1] - b.outline[i][1]);
      if (d > maxo) maxo = d;
    }
  } else maxo = 9999;
  const aa = Math.abs(outlineArea(a.outline)), ba = Math.abs(outlineArea(b.outline));
  const tag = (maxd > 0.5 || maxo > 0.5) ? '  <== 差异' : '';
  if (tag) bad++;
  console.log(a.name.padEnd(2),
    'solΔ=' + maxd.toFixed(2).padStart(8), 'outlineΔ=' + maxo.toFixed(2).padStart(8),
    'pts=' + a.outline.length + '/' + b.outline.length,
    'area=' + aa.toFixed(2) + '/' + ba.toFixed(2),
    (maxd > 0.5 && worst) ? 'worst=' + worst : '', tag);
}
console.log(bad ? ('\n有 ' + bad + ' 关与 HEAD 不同') : '\n字母关几何与 HEAD 完全一致');
