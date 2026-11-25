/* v0.51 验收截图（Edge headless）：用法 node tools/shot_v051.js
 * 截五张：生肖章节列表 / 龙 / 蛇 / 猴（开局）/ 鸡（七块摆好）
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
  { name: 'v051_levels_zodiac', q: 'set=tangram7&screen=levels&page=2&unlocked=57' },
  { name: 'v051_play_dragon', q: 'set=tangram7&screen=play&level=49&placed=0' },
  { name: 'v051_play_snake', q: 'set=tangram7&screen=play&level=50&placed=0' },
  { name: 'v051_play_monkey', q: 'set=tangram7&screen=play&level=53&placed=0' },
  { name: 'v051_play_rooster_full', q: 'set=tangram7&screen=play&level=54&placed=7' }
];

if (!fs.existsSync(EDGE)) { console.log('找不到 Edge: ' + EDGE); process.exit(1); }
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
const udd = path.join(os.tmpdir(), 'v051_edge_' + process.pid);

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
