/* v0.65 截图（Edge headless）：node tools/shot_v065.js [只截某几张的名字...]
 *
 * 覆盖两块改动：
 *   UI    提示面板（查找道具）/ 免费体力 / 复活弹窗 —— 确认「看视频」图标同源、
 *         复活弹窗两枚按钮同尺寸同圆角、巧币用图标。
 *   RANK  全服榜 / 好友榜 / 本周榜 —— 确认新几何（信息条、常驻「我的名次」、
 *         7 行列表、倒计时）不重叠、不越界。
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
  /* ---- UI：三张弹窗 ---- */
  { name: 'v065_ui_hint', q: 'set=tangram7&screen=hint&level=40&items=0&coin=210' },
  { name: 'v065_ui_energy', q: 'set=tangram7&screen=energy' },
  { name: 'v065_ui_fail', q: 'set=tangram7&screen=fail&level=40&failT=2000' },

  /* ---- 排行榜：三页签（mock 打开，浏览器里没有真数据） ---- */
  { name: 'v065_rank_all', q: 'set=tangram7&screen=rank&mockrank=1&tab=0' },
  { name: 'v065_rank_friend', q: 'set=tangram7&screen=rank&mockrank=1&tab=1' },
  { name: 'v065_rank_week', q: 'set=tangram7&screen=rank&mockrank=1&tab=2' }
];

const only = process.argv.slice(2);
const list = only.length ? SHOTS.filter(s => only.indexOf(s.name) >= 0) : SHOTS;

if (!fs.existsSync(EDGE)) { console.log('找不到 Edge: ' + EDGE); process.exit(1); }
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
const udd = path.join(os.tmpdir(), 'v065_edge_' + process.pid);
let bad = 0;

for (const s of list) {
  const png = path.join(OUT, s.name + '.png');
  const args = [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    '--user-data-dir=' + udd, '--window-size=' + W + ',' + H,
    '--screenshot=' + png, urlBase + '?' + s.q
  ];
  const r = spawnSync(EDGE, args, { timeout: 60000, encoding: 'utf8' });
  const ok = fs.existsSync(png);
  if (!ok) bad++;
  console.log(s.name, ok ? 'ok ' + fs.statSync(png).size + 'B' : 'FAIL ' + String(r.stderr || '').slice(0, 200));
}
process.exit(bad ? 1 : 0);
