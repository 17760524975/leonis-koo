/* v0.28 视觉升级验收截图：新增背景 / 深色夜空 / 标题字体 / 右上 HUD / 新板件质感
 * 用法：node tools/shot_v28.js
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
  { name: 'v28_home_default',  q: 'screen=home&w=750' },
  { name: 'v28_home_stars',    q: 'screen=home&w=750&bgfx=stars' },
  { name: 'v28_home_nebula',   q: 'screen=home&w=750&bgfx=nebula' },
  { name: 'v28_home_firefly',  q: 'screen=home&w=750&bgfx=firefly' },
  { name: 'v28_home_snow',     q: 'screen=home&w=750&bgfx=snow' },
  { name: 'v28_home_rain',     q: 'screen=home&w=750&bgfx=rain' },
  { name: 'v28_skin_bg',       q: 'screen=home&w=750&skinpanel=1&skintab=1' },
  { name: 'v28_skin_piece',    q: 'screen=home&w=750&skinpanel=1&skintab=2' },
  { name: 'v28_skin_sfx',      q: 'screen=home&w=750&skinpanel=1&skintab=3' },
  { name: 'v28_play_stars',    q: 'screen=play&w=750&bgfx=stars&placed=2' },
  { name: 'v28_play_crystal',  q: 'screen=play&w=750&pstyle=crystal&placed=3' },
  { name: 'v28_play_neon',     q: 'screen=play&w=750&pstyle=neon&placed=3' }
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
const udd = path.join(os.tmpdir(), 'v28_edge_' + process.pid);
fs.mkdirSync(udd, { recursive: true });

let bad = 0;
const manifest = [];
for (const s of SHOTS) {
  const h = 1624;
  const file = path.join(OUT, s.name + '.png');
  try { fs.unlinkSync(file); } catch (e) {}
  const args = [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
    '--hide-scrollbars', '--force-device-scale-factor=1',
    '--user-data-dir=' + udd,
    '--window-size=750,' + h,
    '--virtual-time-budget=4200',
    '--screenshot=' + file,
    urlBase + '?' + s.q
  ];
  const r = spawnSync(EDGE, args, { encoding: 'utf8', timeout: 60000 });
  const ok = fs.existsSync(file) && fs.statSync(file).size > 5000;
  if (!ok) bad++;
  const dim = pngSize(file);
  manifest.push({ name: s.name, ok, size: ok ? fs.statSync(file).size : 0, dim });
  console.log(`  [${ok ? 'OK' : 'XX'}] ${s.name}  ${ok ? (fs.statSync(file).size / 1024).toFixed(0) + 'KB' : 'fail'}` +
    (dim ? `  ${dim[0]}×${dim[1]}` : '') + (r.status ? `  exit=${r.status}` : ''));
}
fs.writeFileSync(path.join(OUT, 'v28_shots.json'), JSON.stringify(manifest, null, 2));
console.log('\n' + (bad === 0 ? `v0.28 截图 ${SHOTS.length} 张全部生成` : `!! ${bad} 张失败`));
process.exit(bad === 0 ? 0 : 1);
