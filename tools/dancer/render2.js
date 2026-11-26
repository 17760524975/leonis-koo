/* 舞者关卡预览：直接按世界坐标画（轮廓 + 七块板），一图一卡，另附「轮廓单独一张」便于看台阶 */
'use strict';
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const FIT = require('./fit.js');
const J = JSON.parse(fs.readFileSync(path.join(__dirname, 'dancers_exact.json'), 'utf8'));
const COLORS = {
  T1: ['#FF8A5B', '#D96A3D'], T2: ['#FF8A5B', '#D96A3D'],
  T3: ['#63C88B', '#46A66D'], S: ['#F5C542', '#C99A1E'],
  T4: ['#F07BB0', '#C75688'], T5: ['#F07BB0', '#C75688'],
  P: ['#4FA8E0', '#3585BC']
};
function piecePoly(p) {
  return FIT.LOCAL[p.id].map(v => {
    const q = FIT.rot(v, p.angle, p.flipped);
    return [(q[0] + p.x / 96) * 96, (q[1] + p.y / 96) * 96];
  });
}
const ONLY = process.argv[2] ? +process.argv[2] : -1;
const CARD = ONLY >= 0 ? 620 : 300, COLS = ONLY >= 0 ? 1 : 5, ROWS = ONLY >= 0 ? 1 : 2;
let html = '<html><body style="margin:0;background:#111"><div style="display:grid;grid-template-columns:repeat(5,300px)">';
J.forEach((lv, i) => {
  if (ONLY >= 0 && i !== ONLY) return;
  const polys = lv.pieces.map(piecePoly);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  polys.flat().forEach(v => { x0 = Math.min(x0, v[0]); y0 = Math.min(y0, v[1]); x1 = Math.max(x1, v[0]); y1 = Math.max(y1, v[1]); });
  const w = x1 - x0, h = y1 - y0, pad = 26;
  const sc = Math.min((CARD - pad * 2) / w, (CARD - pad * 2 - 26) / h);
  const tx = v => (v[0] - x0) * sc + pad, ty = v => (v[1] - y0) * sc + pad;
  const pts = P => P.map(v => tx(v) + ',' + ty(v)).join(' ');
  let g = '<svg width="' + CARD + '" height="' + CARD + '" style="background:#1b1b1f">';
  /* 轮廓（深色底 + 浅描边） */
  const oc = lv.outline.map(v => [v[0], v[1]]);
  g += '<polygon points="' + pts(oc) + '" fill="#2e2e36" stroke="#6a6a7a" stroke-width="1"/>';
  polys.forEach((P, k) => {
    const id = lv.pieces[k].id;
    const c = COLORS[id] || ['#999', '#666'];
    g += '<polygon points="' + pts(P) + '" fill="' + c[0] + '" fill-opacity="0.92" stroke="' + c[1] + '" stroke-width="1.1" stroke-linejoin="miter"/>';
  });
  g += '<text x="8" y="' + (CARD - 8) + '" fill="#e8e8f0" font-size="' + (ONLY >= 0 ? 18 : 14) + '" font-family="sans-serif">' + (i + 1) + '. ' + lv.name + '</text>';
  g += '</svg>';
  html += '<div>' + g + '</div>';
});
html += '</div></body></html>';
const out = path.join(__dirname, 'out', ONLY >= 0 ? 'one' + ONLY + '.html' : 'preview2.html');
fs.writeFileSync(out, html);
const EDGE = 'C://Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const png = path.resolve(path.join(__dirname, 'out', ONLY >= 0 ? 'one' + ONLY + '.png' : 'preview2.png'));
try {
  execFileSync(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--window-size=' + (CARD * COLS) + ',' + (CARD * ROWS),
    '--screenshot=' + png, 'file:///' + out.replace(/\\/g, '/')], { stdio: 'ignore' });
  console.log('ok', png);
} catch (e) { console.log('截图失败，可手动打开', out); }
