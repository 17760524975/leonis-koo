/* v0.62 验收截图（Edge headless）：node tools/shot_v062.js
 * 截 5 张：主页 / 关卡列表 / 蛇关拼好 / 结算 / 提示面板
 * 目的：确认「去注释 + 缓存 + 跳帧 + dpr 上限」之后画面没有回退。
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
const W = 750, H = 1624 + CHROME_H;

const SHOTS = [
  { name: 'v062_home', q: 'set=tangram7&screen=home' },
  { name: 'v062_levels', q: 'set=tangram7&screen=levels&level=50' },
  { name: 'v062_play', q: 'set=tangram7&screen=play&level=50&placed=7' },
  { name: 'v062_win', q: 'set=tangram7&screen=result&level=50&placed=7' },
  { name: 'v062_hint', q: 'set=tangram7&screen=hintpanel&level=50&items=0&coin=168' }
];

if (!fs.existsSync(EDGE)) { console.log('找不到 Edge: ' + EDGE); process.exit(1); }
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
const udd = path.join(os.tmpdir(), 'v062_edge_' + process.pid);

for (const s of SHOTS) {
  const png = path.join(OUT, s.name + '.png');
  const args = [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    '--user-data-dir=' + udd, '--window-size=' + W + ',' + H,
    '--screenshot=' + png, urlBase + '?' + s.q
  ];
  const r = spawnSync(EDGE, args, { timeout: 60000, encoding: 'utf8' });
  console.log(s.name, fs.existsSync(png) ? 'ok ' + fs.statSync(png).size + 'B' : 'FAIL ' + String(r.stderr || '').slice(0, 200));
}
