/* 从参考图（26 个七巧板字母）里切出 26 个字母的掩码与包围盒。
 * 输入：tools/letters7/dom.html（由 mask.html 在 Edge 里跑出来的 0/1 文本）
 * 输出：tools/letters7/letters_mask.json —— 每个字母 { ch, x0,y0,x1,y1, w,h, area, rows[] }
 * 用法：node tools/letters7/extract.js
 */
const fs = require('fs');
const path = require('path');
const HERE = __dirname;

const dom = fs.readFileSync(path.join(HERE, 'dom.html'), 'utf8');
const m = dom.match(/<pre id="out">([\s\S]*?)<\/pre>/);
if (!m) throw new Error('找不到 <pre id=out>');
const lines = m[1].split('\n').map(s => s.trim()).filter(s => s && /^[01]+$/.test(s));
const W = lines[0].length, H = lines.length;
console.log('掩码 ' + W + '×' + H);

/* 连通域（4 邻接，迭代版），去掉贴边的大边框 */
const lab = new Int32Array(W * H).fill(-1);
const comps = [];
const stack = [];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y * W + x;
  if (lines[y][x] !== '1' || lab[i] >= 0) continue;
  const id = comps.length;
  const c = { id, n: 0, x0: W, y0: H, x1: -1, y1: -1, pts: [] };
  stack.push(i); lab[i] = id;
  while (stack.length) {
    const j = stack.pop();
    const jy = (j / W) | 0, jx = j - jy * W;
    c.n++; c.pts.push(j);
    if (jx < c.x0) c.x0 = jx; if (jx > c.x1) c.x1 = jx;
    if (jy < c.y0) c.y0 = jy; if (jy > c.y1) c.y1 = jy;
    const nb = [[jx - 1, jy], [jx + 1, jy], [jx, jy - 1], [jx, jy + 1]];
    for (const [nx, ny] of nb) {
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const k = ny * W + nx;
      if (lines[ny][nx] !== '1' || lab[k] >= 0) continue;
      lab[k] = id; stack.push(k);
    }
  }
  comps.push(c);
}
/* 边框：面积最大的那个且贴四边 → 丢 */
comps.sort((a, b) => b.n - a.n);
const border = comps[0];
const isBorder = border.x0 <= 1 && border.y0 <= 1 && border.x1 >= W - 2 && border.y1 >= H - 2;
/* 只要「字母大小」的块：面积 200~20000、bbox 宽高 < 150。
 * 页面外框（800×616 的细线框）和右下角水印都靠这条滤掉。 */
const shapes = comps.filter(c => c.n > 200 && c.n < 20000 &&
  (c.x1 - c.x0) < 150 && (c.y1 - c.y0) < 150);
console.log('连通域 ' + comps.length + ' 个，丢弃边框=' + isBorder + '，字母块 ' + shapes.length + ' 个');

/* 按行分组（4 行：A-G / H-N / O-U / V-Z），行内按 x 排序 */
shapes.sort((a, b) => (a.y0 - b.y0) || (a.x0 - b.x0));
const rows = [];
for (const s of shapes) {
  const cy = (s.y0 + s.y1) / 2;
  let r = rows.find(r => Math.abs(r.cy - cy) < 60);
  if (!r) { r = { cy, items: [] }; rows.push(r); }
  r.items.push(s);
  r.cy = (r.cy * (r.items.length - 1) + cy) / r.items.length;
}
rows.sort((a, b) => a.cy - b.cy);
console.log('行数 ' + rows.length + '：' + rows.map(r => r.items.length).join(' / '));

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const out = [];
let k = 0;
for (const r of rows) {
  r.items.sort((a, b) => a.x0 - b.x0);
  for (const s of r.items) {
    const ch = ALPHA[k++];
    if (!ch) continue;
    const w = s.x1 - s.x0 + 1, h = s.y1 - s.y0 + 1;
    const rowsArr = [];
    for (let y = s.y0; y <= s.y1; y++) {
      let line = '';
      for (let x = s.x0; x <= s.x1; x++) line += (lab[y * W + x] === s.id ? '1' : '0');
      rowsArr.push(line);
    }
    out.push({ ch, x0: s.x0, y0: s.y0, w, h, area: s.n, rows: rowsArr });
    console.log(`  ${ch}  ${w}×${h}  area=${s.n}  asp=${(w / h).toFixed(2)}`);
  }
}
fs.writeFileSync(path.join(HERE, 'letters_mask.json'), JSON.stringify(out));
console.log('写出 tools/letters7/letters_mask.json  ' + out.length + ' 个字母');
