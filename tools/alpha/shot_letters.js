/* 字母关卡实机截图（Edge headless）。用法：node tools/alpha/shot_letters.js */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '../..');
const OUT = path.join(__dirname, 'out');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const urlBase = 'file:///' + path.join(ROOT, 'tools', 'harness.html').replace(/\\/g, '/');
const CHROME_H = 93;

const SHOTS = [
  { name: 'game_E', q: 'set=tangram7&screen=play&level=10&placed=7' },
  { name: 'game_P', q: 'set=tangram7&screen=play&level=13&placed=7' },
  { name: 'game_levels', q: 'set=tangram7&screen=levels&page=1&unlocked=15' }
];

if (!fs.existsSync(EDGE)) { console.log('找不到 Edge: ' + EDGE); process.exit(1); }
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
const udd = path.join(os.tmpdir(), 'alpha_edge_' + process.pid);

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
