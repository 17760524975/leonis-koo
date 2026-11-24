/* v0.34 验收截图（Edge headless）：用法 node tools/shot_v034_layout.js
 * 注意：tools/shot_v034.js 是 v0.3.4 的旧脚本，别混淆。
 * 截六张：A（带孔新字母）/ E（满摆）/ L / X / 结算页（两枚等宽按钮）/ 字母章节列表。
 */
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
  { name: 'v034_play_A', q: 'set=tangram7&screen=play&level=10&placed=0' },
  { name: 'v034_play_E', q: 'set=tangram7&screen=play&level=11&placed=7' },
  { name: 'v034_play_L', q: 'set=tangram7&screen=play&level=13&placed=0' },
  { name: 'v034_play_Y', q: 'set=tangram7&screen=play&level=17&placed=7' },
  { name: 'v034_result', q: 'set=tangram7&screen=result&level=13' },
  { name: 'v034_levels', q: 'set=tangram7&screen=levels&page=1&unlocked=18' }
];

if (!fs.existsSync(EDGE)) { console.log('找不到 Edge: ' + EDGE); process.exit(1); }
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
const udd = path.join(os.tmpdir(), 'v034_edge_' + process.pid);

for (const s of SHOTS) {
  const png = path.join(OUT, s.name + '.png');
  const W = 750, H = 1624 + CHROME_H;
  const args = [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    '--user-data-dir=' + udd, '--window-size=' + W + ',' + H,
    '--screenshot=' + png, urlBase + '?' + s.q
  ];
  const r = spawnSync(EDGE, args, { timeout: 60000, encoding: 'utf8' });
  console.log(s.name, fs.existsSync(png) ? 'ok ' + fs.statSync(png).size + 'B' : 'FAIL ' + (r.stderr || '').slice(0, 200));
}
