/* v0.39 验收截图：付费皮肤价签 / 解锁确认页 / 在线奖励图标化
 * 用法：node tools/shot_v39.js
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
  { name: 'v39_skin_piece',   q: 'screen=skin&w=750&skinpanel=1&skintab=2&coin=120' },
  { name: 'v39_skin_bg',      q: 'screen=skin&w=750&skinpanel=1&skintab=1&coin=120' },
  { name: 'v39_skin_piece_dark', q: 'screen=skin&w=750&skin=dusk&skinpanel=1&skintab=2&coin=120' },
  { name: 'v39_buy_piece',    q: 'screen=skin&w=750&buy=pstyle:neon&coin=120' },
  { name: 'v39_buy_bg_poor',  q: 'screen=skin&w=750&buy=bgfx:stars&coin=50' },
  { name: 'v39_online',       q: 'screen=online&w=750&online=1500&items=2' },
  { name: 'v39_online_dark',  q: 'screen=online&w=750&skin=dusk&online=1500&items=2' }
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
const udd = path.join(os.tmpdir(), 'v39_edge_' + process.pid);
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
fs.writeFileSync(path.join(OUT, 'v39_shots.json'), JSON.stringify(manifest, null, 2));
console.log(bad ? `\n!! ${bad} 张截图失败` : '\n截图全部生成 → tools/out/');
process.exit(bad ? 1 : 0);
