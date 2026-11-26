/* v0.59 验收截图（Edge headless）：node tools/shot_v059.js
 * 截四张：蛇（七块摆好 7/7）/ 蛇（开局剪影）/ 结算页（10倍奖励）/ 提示面板（图标化）
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'tools', 'out');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const urlBase = 'file:///' + path.join(ROOT, 'tools', 'harness.html').replace(/\\/g, '/');
const CHROME_H = 93;

const SHOTS = [
  { name: 'v059_snake_full', q: 'set=tangram7&screen=play&level=50&placed=7' },
  { name: 'v059_snake_start', q: 'set=tangram7&screen=play&level=50&placed=0' },
  { name: 'v059_win_10x', q: 'set=tangram7&screen=result&level=50&placed=7' },
  { name: 'v059_hint_icons', q: 'set=tangram7&screen=hintpanel&level=50&items=0&coin=168' }
];

if (!fs.existsSync(EDGE)) { console.log('找不到 Edge: ' + EDGE); process.exit(1); }
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
const udd = path.join(os.tmpdir(), 'v059_edge_' + process.pid);

for (const s of SHOTS) {
  const png = path.join(OUT, s.name + '.png');
  const W = 750, H = 1624 + CHROME_H;
  const args = [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    '--user-data-dir=' + udd, '--window-size=' + W + ',' + H,
    '--screenshot=' + png, urlBase + '?' + s.q
  ];
  const r = spawnSync(EDGE, args, { timeout: 60000, encoding: 'utf8' });
  console.log(s.name, fs.existsSync(png) ? 'ok ' + fs.statSync(png).size + 'B' : 'FAIL ' + String(r.stderr || '').slice(0, 200));
}
