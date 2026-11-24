/* v0.44 验收截图：26 个字母关卡
 * 用法：node tools/shot_v44.js
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
  { name: 'v44_lv_A',       q: 'set=tangram7&screen=play&w=750&level=10&placed=0' },
  { name: 'v44_lv_A_done',  q: 'set=tangram7&screen=play&w=750&level=10&placed=7' },
  { name: 'v44_lv_B_done',  q: 'set=tangram7&screen=play&w=750&level=11&placed=7' },
  { name: 'v44_lv_L_done',  q: 'set=tangram7&screen=play&w=750&level=21&placed=7' },
  { name: 'v44_lv_T_done',  q: 'set=tangram7&screen=play&w=750&level=29&placed=7' },
  { name: 'v44_lv_X_done',  q: 'set=tangram7&screen=play&w=750&level=33&placed=7' },
  { name: 'v44_lv_Z_done',  q: 'set=tangram7&screen=play&w=750&level=35&placed=7' },
  { name: 'v44_levels_p2',  q: 'set=tangram7&screen=levels&w=750&page=1&unlocked=20' },
  { name: 'v44_levels_p4',  q: 'set=tangram7&screen=levels&w=750&page=3&unlocked=36' },
  { name: 'v44_lv_C_play',  q: 'set=tangram7&screen=play&w=750&level=12&placed=2' }
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
const udd = path.join(os.tmpdir(), 'v44_edge_' + process.pid);
fs.mkdirSync(udd, { recursive: true });

let bad = 0;
const manifest = [];
for (const s of SHOTS) {
  const file = path.join(OUT, s.name + '.png');
  try { fs.unlinkSync(file); } catch (e) {}
  const args = [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
    '--hide-scrollbars', '--force-device-scale-factor=1',
    '--user-data-dir=' + udd,
    '--window-size=750,1624',
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
fs.writeFileSync(path.join(OUT, 'v44_shots.json'), JSON.stringify(manifest, null, 2));
console.log(bad ? `\n!! ${bad} 张截图失败` : '\n截图全部生成 → tools/out/');
