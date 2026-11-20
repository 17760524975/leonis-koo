/* v0.10 验收截图：提示三档（指位置 / 指板件 / 看全图） + 提示面板（看视频 / 巧币）
 * 用法：node tools/shot_v10.js
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
  { name: 'v10_hint1_750', w: 750, q: 'screen=hint&w=750&level=0&placed=0&hinttier=1' },
  { name: 'v10_hint2_750', w: 750, q: 'screen=hint&w=750&level=0&placed=0&hinttier=2' },
  { name: 'v10_hint3_750', w: 750, q: 'screen=hint&w=750&level=0&placed=0&hinttier=3' },
  { name: 'v10_hint2_375', w: 375, q: 'screen=hint&w=375&level=0&placed=0&hinttier=2' },
  { name: 'v10_panel2_750', w: 750, q: 'screen=hintpanel&w=750&lv=1' },
  { name: 'v10_panel3_750', w: 750, q: 'screen=hintpanel&w=750&lv=2' },
  { name: 'v10_panel_poor_750', w: 750, q: 'screen=hintpanel&w=750&lv=1&coin=0' },
  { name: 'v10_panel_375', w: 375, q: 'screen=hintpanel&w=375&lv=1' },
  { name: 'v10_hint2_7_750', w: 750, q: 'screen=hint&w=750&set=tangram7&level=2&placed=0&hinttier=2' },
  { name: 'v10_hint3_7_750', w: 750, q: 'screen=hint&w=750&set=tangram7&level=2&placed=0&hinttier=3' }
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
const udd = path.join(os.tmpdir(), 'v10_edge_' + process.pid);
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
fs.writeFileSync(path.join(OUT, 'v10_shots.json'), JSON.stringify(manifest, null, 2));
console.log(`\n共 ${manifest.length} 张 → ${OUT}\\v10_*.png，失败 ${bad} 张`);
process.exit(bad ? 1 : 0);
