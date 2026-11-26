/* 只画剪影：用来检查轮廓有没有台阶 / 缺口 */
'use strict';
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const J = JSON.parse(fs.readFileSync(path.join(__dirname, 'dancers_exact.json'), 'utf8'));
const CARD = 300;
let html = '<html><body style="margin:0;background:#111"><div style="display:grid;grid-template-columns:repeat(5,' + CARD + 'px)">';
J.forEach((lv, i) => {
  const oc = lv.outline;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  oc.forEach(v => { x0 = Math.min(x0, v[0]); y0 = Math.min(y0, v[1]); x1 = Math.max(x1, v[0]); y1 = Math.max(y1, v[1]); });
  const pad = 18, sc = Math.min((CARD - pad * 2) / (x1 - x0), (CARD - pad * 2 - 20) / (y1 - y0));
  const pts = oc.map(v => ((v[0] - x0) * sc + pad) + ',' + ((v[1] - y0) * sc + pad)).join(' ');
  html += '<div><svg width="' + CARD + '" height="' + CARD + '" style="background:#15151a">' +
    '<polygon points="' + pts + '" fill="#c9c9d6"/>' +
    '<text x="8" y="' + (CARD - 8) + '" fill="#888" font-size="13" font-family="sans-serif">' + (i + 1) + '. ' + lv.name + ' · ' + oc.length + '点</text></svg></div>';
});
html += '</div></body></html>';
const out = path.join(__dirname, 'out', 'sil.html');
fs.writeFileSync(out, html);
const EDGE = 'C://Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const png = path.resolve(path.join(__dirname, 'out', 'sil.png'));
execFileSync(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
  '--window-size=' + (CARD * 5) + ',' + (CARD * 2), '--screenshot=' + png,
  'file:///' + out.replace(/\\/g, '/')], { stdio: 'ignore' });
console.log('ok', png);
