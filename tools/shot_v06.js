/* v0.6 验收截图：headless Edge + harness.html
 * 覆盖：主页（四巧/七巧两套固定入口、左列标签不重叠）/ 首波鲜花 / 结算期持续小花流（密→疏）
 * 用法：node tools/shot_v06.js
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
  { name: 'v06_home_750', w: 750, q: 'screen=home&w=750&notoast=1' },
  { name: 'v06_home_375', w: 375, q: 'screen=home&w=375&notoast=1' },
  { name: 'v06_home_t7_750', w: 750, q: 'screen=home&w=750&set=tangram7&notoast=1' },
  { name: 'v06_fx_t0', w: 750, q: 'screen=home&w=750&notoast=1&t=0' },
  { name: 'v06_fx_t3000', w: 750, q: 'screen=home&w=750&notoast=1&t=3000' },
  { name: 'v06_play_750', w: 750, q: 'screen=play&w=750&level=0&placed=2&sel=0' },
  { name: 'v06_burst_700', w: 750, q: 'screen=play&w=750&level=0&placed=4&flower=700&full=1' },
  { name: 'v06_result_1200', w: 750, q: 'screen=play&w=750&level=0&placed=4&flower=1200&full=1' },
  { name: 'v06_result_3000', w: 750, q: 'screen=play&w=750&level=0&placed=4&flower=3000&full=1' },
  { name: 'v06_result_6000', w: 750, q: 'screen=play&w=750&level=0&placed=4&flower=6000&full=1' }
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
const udd = path.join(os.tmpdir(), 'v06_edge_' + process.pid);
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
    s.url || (urlBase + '?' + s.q)
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
fs.writeFileSync(path.join(OUT, 'v06_shots.json'), JSON.stringify(manifest, null, 2));
console.log(`\n共 ${manifest.length} 张 → ${OUT}\\v06_*.png，清单 v06_shots.json`);
console.log(bad === 0 ? '截图全部产出' : `!! ${bad} 张失败`);
process.exit(bad === 0 ? 0 : 1);
