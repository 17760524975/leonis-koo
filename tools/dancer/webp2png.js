/* webp → png：本机无 Pillow / ImageMagick，用 headless Edge 渲染截图代替
 * 用法：node tools/dancer/webp2png.js <in.webp> <out.png>
 */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const { spawnSync } = require('child_process');

const SRC = path.resolve(process.argv[2]), DST = path.resolve(process.argv[3]);
const EDGE = 'C://Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const html = path.join(os.tmpdir(), 'w2p_' + process.pid + '.html');
const url = 'file:///' + SRC.replace(/\\/g, '/');
fs.writeFileSync(html, `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;padding:0;background:#fff}img{display:block}</style>
<img src="${url}">`);
const udd = path.join(os.tmpdir(), 'w2p_udd_' + process.pid);
spawnSync(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--force-device-scale-factor=1', '--user-data-dir=' + udd,
  '--window-size=800,458', '--screenshot=' + DST, 'file:///' + html.replace(/\\/g, '/')], { timeout: 60000 });
console.log(fs.existsSync(DST) ? 'ok ' + DST : 'fail');
