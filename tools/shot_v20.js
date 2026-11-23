/* v0.20 验收截图：提示面板（小字已删）/ 托盘提示（哪块+放哪）/ 摆歪提示
 * 用法：node tools/shot_v20.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'shots', 'v0.20');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const urlBase = 'file:///' + path.join(ROOT, 'tools', 'harness.html').replace(/\\/g, '/');

const SHOTS = [
  /* ① 提示面板：只剩一句话 + 三个付费入口，底部两行小字已删 */
  { name: 'v20_hint_panel_750', w: 750, q: 'screen=hintpanel&w=750&items=2&coin=475' },
  /* ② 对局提示：托盘那块被圈出 + 「用这块」+ 落点「放这里」+ 连接虚线 */
  { name: 'v20_hint_tray_750', w: 750, q: 'screen=hint&w=750&level=3' },
  /* ③ 摆歪的块：圈出来 + 箭头 + 「移到此处」 */
  { name: 'v20_hint_move_750', w: 750, q: 'screen=hint&w=750&level=3&hintbad=2' }
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
const udd = path.join(os.tmpdir(), 'v20_edge_' + process.pid);
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
  manifest.push({ name: s.name, ok, size: ok ? fs.statSync(file).size : 0, dim });
  console.log(`  [${ok ? 'OK' : 'XX'}] ${s.name}  ${ok ? (fs.statSync(file).size / 1024).toFixed(0) + 'KB' : 'fail'}` +
    (dim ? `  ${dim[0]}×${dim[1]}` : '') + (r.status ? `  exit=${r.status}` : ''));
}
fs.writeFileSync(path.join(OUT, 'v20_shots.json'), JSON.stringify(manifest, null, 2));
console.log('\n' + (bad === 0 ? `v0.20 截图 ${SHOTS.length} 张全部生成` : `!! ${bad} 张失败`));
process.exit(bad === 0 ? 0 : 1);
