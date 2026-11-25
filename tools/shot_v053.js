/* v0.53 验收截图（Edge headless）：用法 node tools/shot_v053.js
 * 截：字母章节列表 / A、S、Y 开局 / 半拼（4 块就位，看绿色整块高亮）/ 拼完
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
  { name: 'v053_levels_letters', q: 'set=tangram7&screen=levels&page=1&unlocked=57' },
  { name: 'v053_play_A', q: 'set=tangram7&screen=play&level=19&placed=0' },
  { name: 'v053_play_S', q: 'set=tangram7&screen=play&level=37&placed=0' },
  { name: 'v053_play_Y', q: 'set=tangram7&screen=play&level=43&placed=0' },
  { name: 'v053_play_partial', q: 'set=tangram7&screen=play&level=37&placed=4' },
  { name: 'v053_play_full', q: 'set=tangram7&screen=play&level=43&placed=7' }
];

if (!fs.existsSync(EDGE)) { console.log('找不到 Edge: ' + EDGE); process.exit(1); }
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
const udd = path.join(os.tmpdir(), 'v053_edge_' + process.pid);

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
