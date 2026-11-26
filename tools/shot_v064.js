/* v0.64 舞者关卡截图（Edge headless）：node tools/shot_v064.js
 * 截 4 张：舞者章节的关卡列表 / 回眸 / 垂手 / 旋身 的对局画面
 * 目的：确认剪影与板严丝合缝、没有台阶和缝，缩略图排版正常。
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

/* 章节页签 0 基：0 几何 / 1 字母 / 2 生肖 / 3 舞者
 * 关卡 id 58..67 → 索引 57..66 */
const SHOTS = [
  { name: 'v064_dancer_levels', q: 'set=tangram7&screen=levels&page=3&lvscroll=9999' },
  { name: 'v064_play_huimou', q: 'set=tangram7&screen=play&level=57&placed=0' },
  { name: 'v064_play_chuishou', q: 'set=tangram7&screen=play&level=61&placed=0' },
  { name: 'v064_play_xuanshen', q: 'set=tangram7&screen=play&level=66&placed=0' }
];

if (!fs.existsSync(EDGE)) { console.log('找不到 Edge: ' + EDGE); process.exit(1); }
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
const udd = path.join(os.tmpdir(), 'v064_edge_' + process.pid);

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
