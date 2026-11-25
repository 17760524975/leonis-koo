/* 把轮廓栅格化成 ASCII，肉眼判断「这个轮廓到底像不像那个字母」
 * 用法：node tools/ascii_letter.js H [head] [宽字符数] */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
function loadFile(file) {
  const src = fs.readFileSync(file, 'utf8');
  const box = {};
  new Function('window', 'globalThis', 'console', src)(box, box, console);
  return box.TANGRAM_SETS;
}
const which = process.argv[2] || 'H';
const src = process.argv[3] === 'head' ? 'tools/out/_levels_head.js' : (process.argv[3] === 'git' ? 'tools/out/_levels_githead.js' : 'js/levels.js');
const W = +(process.argv[4] || 34);
const S = loadFile(path.join(ROOT, src));
const lv = S.tangram7.levels.find(l => l.name === which);

function inPoly(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if (((yi > pt[1]) !== (yj > pt[1])) &&
        (pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}
const xs = lv.outline.map(p => p[0]), ys = lv.outline.map(p => p[1]);
const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
const H = Math.round(W * (y1 - y0) / (x1 - x0) * 0.5);  // 字符高宽比约 2:1
console.log('轮廓 bbox', x0.toFixed(0), y0.toFixed(0), x1.toFixed(0), y1.toFixed(0),
  '| 点', lv.outline.length, '| 内孔', (lv.holes || []).length);
for (let r = 0; r < H; r++) {
  let line = '';
  for (let c = 0; c < W; c++) {
    const px = x0 + (c + 0.5) / W * (x1 - x0);
    const py = y0 + (r + 0.5) / H * (y1 - y0);
    let v = inPoly([px, py], lv.outline);
    if (v && lv.holes) for (const h of lv.holes) if (inPoly([px, py], h)) v = false;
    line += v ? '#' : '.';
  }
  console.log(line);
}
