/* v0.33 验收截图：去广告位 + 卡纸放大（Edge headless）。用法：node tools/shot_card_v033.js
 * 截四张：七巧板字母关（满摆）、七巧板开局（纯剪影）、四巧板对局、七巧板关卡列表。
 * 注意：与本文件同目录的 shot_v033.js 是 2009 年 v0.3.3 的旧脚本，勿混淆。 */
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
  { name: 'v033card_play_E', q: 'set=tangram7&screen=play&level=10&placed=7' },
  { name: 'v033card_play_fresh', q: 'set=tangram7&screen=play&level=0&placed=0' },
  { name: 'v033card_play_t4', q: 'screen=play&level=0&placed=4' },
  { name: 'v033card_levels', q: 'set=tangram7&screen=levels&page=1&unlocked=15' }
];

if (!fs.existsSync(EDGE)) { console.log('找不到 Edge: ' + EDGE); process.exit(1); }
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
const udd = path.join(os.tmpdir(), 'v033card_edge_' + process.pid);

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
