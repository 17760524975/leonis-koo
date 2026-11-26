/* v0.63 问题点截图（Edge headless）：node tools/shot_v063.js
 * 截 4 张：Y 关剪影（关卡缩略图 + 对局目标）/ 龙关剪影（同上）
 * 目的：定位「Y 底部竖干错位」「龙尾巴三角偏上」两处反馈。
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

/* Y = id 44 → 索引 43；龙 = id 50 → 索引 49
 * 关卡页页签：page=0 几何 / 1 字母 / 2 生肖（state.lvPage 是 0 基章节号） */
const SHOTS = [
  { name: 'v063_y_lv', q: 'set=tangram7&screen=levels&page=1&lvscroll=9999' },
  { name: 'v063_y_play', q: 'set=tangram7&screen=play&level=43&placed=0' },
  { name: 'v063_dragon_play', q: 'set=tangram7&screen=play&level=49&placed=0' },
  { name: 'v063_dragon_lv', q: 'set=tangram7&screen=levels&page=2&lvscroll=9999' }
];

if (!fs.existsSync(EDGE)) { console.log('找不到 Edge: ' + EDGE); process.exit(1); }
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
const udd = path.join(os.tmpdir(), 'v063_edge_' + process.pid);

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
