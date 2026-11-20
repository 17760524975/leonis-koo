/* v0.9 验收截图：对局页（倒计时居中 / 散放托盘 / 顶部广告位）、T 字关、七巧板托盘
 * 用法：node tools/shot_v09.js
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
  { name: 'v09_play4_750', w: 750, q: 'screen=play&w=750&level=0&placed=0' },
  { name: 'v09_play4_half_750', w: 750, q: 'screen=play&w=750&level=0&placed=2&sel=0' },
  { name: 'v09_play4_375', w: 375, q: 'screen=play&w=375&level=0&placed=0' },
  { name: 'v09_play7_750', w: 750, q: 'screen=play&w=750&set=tangram7&level=0&placed=0' },
  { name: 'v09_play7_375', w: 375, q: 'screen=play&w=375&set=tangram7&level=0&placed=0' },
  { name: 'v09_playT_750', w: 750, q: 'screen=play&w=750&level=29&placed=0' },
  { name: 'v09_levels_750', w: 750, q: 'screen=levels&w=750&page=2' },
  { name: 'v09_rank_live_750', w: 750, q: 'screen=rank&w=750&ranklive=1&tab=0' },
  { name: 'v09_rank_off_750', w: 750, q: 'screen=rank&w=750&tab=0' },
  { name: 'v09_settings_750', w: 750, q: 'screen=settings&w=750&net=1' }
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
const udd = path.join(os.tmpdir(), 'v09_edge_' + process.pid);
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
fs.writeFileSync(path.join(OUT, 'v09_shots.json'), JSON.stringify(manifest, null, 2));
console.log(`\n共 ${manifest.length} 张 → ${OUT}\\v09_*.png，失败 ${bad} 张`);
process.exit(bad ? 1 : 0);
