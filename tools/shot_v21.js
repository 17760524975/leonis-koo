/* v0.21 验收截图：每类第 1 关的教学（虚影 + 指令 + 手势）
 * 用法：node tools/shot_v21.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'shots', 'v0.21');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const urlBase = 'file:///' + path.join(ROOT, 'tools', 'harness.html').replace(/\\/g, '/');

const SHOTS = [
  /* ① 四巧板第 1 关刚进来：标准解淡显，指令教"拖" */
  { name: 'v21_tut4_drag_750', q: 'screen=tut&w=750&level=0&placed=0' },
  /* ② 四巧板第 1 关：别的都摆对了，只剩 C 翻面反着 → 指令切"翻" */
  { name: 'v21_tut4_flip_750', q: 'screen=tut&w=750&level=0&placed=4&tutflip=2' },
  /* ③ 七巧板第 1 关：别摆摆对了，剩一块角度歪 40° → 指令切"转" */
  { name: 'v21_tut7_rot_750', q: 'screen=tut&set=tangram7&w=750&level=0&placed=7&tutrot=1' },
  /* ④ 重开不重置倒计时：只剩 0:32 时点刷新（对局页，看倒计时是否还停在 32） */
  { name: 'v21_restart_keep_750', q: 'screen=play&w=750&level=2&placed=1&left=32' }
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
const udd = path.join(os.tmpdir(), 'v21_edge_' + process.pid);
fs.mkdirSync(udd, { recursive: true });

let bad = 0;
const manifest = [];
for (const s of SHOTS) {
  const w = +(s.q.match(/w=(\d+)/) || [])[1] || 750;
  const h = Math.round(1624 * w / 750);
  const file = path.join(OUT, s.name + '.png');
  try { fs.unlinkSync(file); } catch (e) {}
  const args = [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
    '--hide-scrollbars', '--force-device-scale-factor=1',
    '--user-data-dir=' + udd,
    '--window-size=' + w + ',' + h,
    '--virtual-time-budget=3500',
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
fs.writeFileSync(path.join(OUT, 'v21_shots.json'), JSON.stringify(manifest, null, 2));
console.log('\n' + (bad === 0 ? `v0.21 截图 ${SHOTS.length} 张全部生成` : `!! ${bad} 张失败`));
process.exit(bad === 0 ? 0 : 1);
