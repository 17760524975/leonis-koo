/* v0.5 验收截图：headless Edge + harness.html
 * 覆盖：主页 HUD+四入口 / 对局 3 心+倒计时 / 免费体力 / 复活 / 任务 / 邀请 / 桌面 / 皮肤（含薄荷·夜空）
 * 用法：node tools/shot_v05.js
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
  { name: 'v05_home_375', w: 375, q: 'screen=home&w=375&notoast=1' },
  { name: 'v05_home_750', w: 750, q: 'screen=home&w=750&notoast=1' },
  { name: 'v05_play_375', w: 375, q: 'screen=play&w=375&level=0&placed=2&sel=0' },
  { name: 'v05_play_750', w: 750, q: 'screen=play&w=750&level=0&placed=2&sel=0' },
  { name: 'v05_energy_375', w: 375, q: 'screen=energy&w=375&notoast=1' },
  { name: 'v05_energy_750', w: 750, q: 'screen=energy&w=750&notoast=1' },
  { name: 'v05_fail_375', w: 375, q: 'screen=fail&w=375&notoast=1' },
  { name: 'v05_fail_750', w: 750, q: 'screen=fail&w=750&notoast=1' },
  { name: 'v05_tasks_750', w: 750, q: 'screen=tasks&w=750&notoast=1' },
  { name: 'v05_invite_750', w: 750, q: 'screen=invite&w=750&notoast=1' },
  { name: 'v05_desktop_750', w: 750, q: 'screen=desktop&w=750&notoast=1' },
  { name: 'v05_skin_750', w: 750, q: 'screen=skin&w=750&notoast=1' },
  { name: 'v05_home_mint_750', w: 750, q: 'screen=home&w=750&skin=mint&notoast=1' },
  { name: 'v05_home_night_750', w: 750, q: 'screen=home&w=750&skin=night&notoast=1' }
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
const udd = path.join(os.tmpdir(), 'v05_edge_' + process.pid);
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
fs.writeFileSync(path.join(OUT, 'v05_shots.json'), JSON.stringify(manifest, null, 2));
console.log(`\n共 ${manifest.length} 张 → ${OUT}\\v05_*.png，清单 v05_shots.json`);
console.log(bad === 0 ? '截图全部产出' : `!! ${bad} 张失败`);
process.exit(bad === 0 ? 0 : 1);
