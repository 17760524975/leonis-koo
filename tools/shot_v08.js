/* v0.8 验收截图：新结算面板 / 连胜条 / 排行榜
 * 用法：node tools/shot_v08.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'out');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const urlBase = 'file:///' + path.join(ROOT, 'tools', 'harness.html').replace(/\\/g, '/');

const SHOTS = [
  { name: 'v08_result_750', w: 750, q: 'screen=result&w=750&level=4&placed=4&notoast=1' },
  { name: 'v08_result_streak5_750', w: 750, q: 'screen=result&w=750&level=6&placed=4&stk=5&gain=60&notoast=1' },
  { name: 'v08_result_last_750', w: 750, q: 'screen=result&w=750&last=1&placed=4&stk=2&notoast=1' },
  { name: 'v08_rank_main_750', w: 750, q: 'screen=rank&w=750&tab=0&notoast=1' },
  { name: 'v08_rank_streak_750', w: 750, q: 'screen=rank&w=750&tab=1&notoast=1' },
  { name: 'v08_rank_friend_375', w: 375, q: 'screen=rank&w=375&tab=2&notoast=1' },
  { name: 'v08_levels_750', w: 750, q: 'screen=levels&w=750&unlocked=12&notoast=1' }
];

function pngSize(file) {
  try {
    const b = fs.readFileSync(file);
    if (b.slice(1, 4).toString() !== 'PNG') return null;
    return [b.readUInt32BE(16), b.readUInt32BE(20)];
  } catch (e) { return null; }
}

if (!fs.existsSync(EDGE)) { console.log('找不到 Edge: ' + EDGE); process.exit(1); }
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
const udd = path.join(os.tmpdir(), 'v08_edge_' + process.pid);
fs.mkdirSync(udd, { recursive: true });

let bad = 0;
const manifest = [];
for (const s of SHOTS) {
  const h = Math.round(1624 * s.w / 750);
  const file = path.join(OUT, s.name + '.png');
  try { fs.unlinkSync(file); } catch (e) {}
  const args = [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
    '--hide-scrollbars', '--force-device-scale-factor=1',
    '--user-data-dir=' + udd,
    '--window-size=' + s.w + ',' + h,
    '--virtual-time-budget=3500',
    '--screenshot=' + file,
    urlBase + '?' + s.q
  ];
  const r = spawnSync(EDGE, args, { encoding: 'utf8', timeout: 60000 });
  const ok = fs.existsSync(file) && fs.statSync(file).size > 5000;
  if (!ok) bad++;
  const dim = pngSize(file);
  const kb = fs.existsSync(file) ? (fs.statSync(file).size / 1024).toFixed(0) : '0';
  manifest.push({ name: s.name + '.png', window: s.w + '×' + h, png: dim ? dim.join('×') : '?', kb: +kb });
  console.log(`  [${ok ? 'OK' : 'XX'}] ${s.name}.png  ${s.w}×${h}  ${kb} KB` +
    (ok ? '' : '  ' + (r.stderr || '').slice(0, 140)));
}
fs.writeFileSync(path.join(OUT, 'v08_shots.json'), JSON.stringify(manifest, null, 2));
console.log(`\n共 ${manifest.length} 张 → ${OUT}\\v08_*.png`);
console.log(bad === 0 ? '截图全部产出' : `!! ${bad} 张失败`);
process.exit(bad === 0 ? 0 : 1);
