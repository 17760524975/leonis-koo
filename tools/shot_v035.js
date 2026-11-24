/* v0.35 验收截图（Edge headless）：用法 node tools/shot_v035.js
 * 截五张：对局页（七巧板满摆 / 空盘 / 四巧板）、结算页（×5 与下一关同排）、提示面板。
 * 目的：①卡纸是否吃掉到托盘之间的空白带 ②工具栏糖果按钮与黄色灯泡 ③结算按钮不溢出。
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
  { name: 'v035_play_7', q: 'set=tangram7&screen=play&level=11&placed=7' },
  { name: 'v035_play_7_empty', q: 'set=tangram7&screen=play&level=13&placed=0' },
  { name: 'v035_play_4', q: 'screen=play&level=1&placed=0' },
  { name: 'v035_result', q: 'set=tangram7&screen=result&level=13' },
  { name: 'v035_hint', q: 'set=tangram7&screen=hintpanel&level=13' },
  { name: 'v035_energy', q: 'set=tangram7&screen=energy' },
  { name: 'v035_fail', q: 'set=tangram7&screen=fail&level=13' }
];

if (!fs.existsSync(EDGE)) { console.log('找不到 Edge: ' + EDGE); process.exit(1); }
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
const udd = path.join(os.tmpdir(), 'v035_edge_' + process.pid);

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
