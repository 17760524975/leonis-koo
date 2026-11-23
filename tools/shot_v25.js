/* v0.25 验收截图：设置页回到单枚「重置进度」+ 第 1 关就地教学
 * 用法：node tools/shot_v25.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'shots', 'v0.25');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const urlBase = 'file:///' + path.join(ROOT, 'tools', 'harness.html').replace(/\\/g, '/');

const SHOTS = [
  /* ① 设置页：教学入口已删，只剩居中的「重置进度」+「关闭」（间距 16px） */
  { name: 'v25_settings_750', q: 'screen=settings&w=750' },
  /* ② 第 1 关就地教学：顶部指令 + 虚影 + 右下角跳过 */
  { name: 'v25_tut_level1_750', q: 'screen=tut&w=750&level=0' }
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
const udd = path.join(os.tmpdir(), 'v25_edge_' + process.pid);
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
    '--virtual-time-budget=' + (s.budget || 3500),
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
fs.writeFileSync(path.join(OUT, 'v24_shots.json'), JSON.stringify(manifest, null, 2));
console.log('\n' + (bad === 0 ? `v0.24 截图 ${SHOTS.length} 张全部生成` : `!! ${bad} 张失败`));
process.exit(bad === 0 ? 0 : 1);
