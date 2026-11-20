/* v0.3.4 A4a 鲜花绽放验收截图：headless Edge + harness.html?flower=<ms>
 * flower 参数把 state.flower.t / state.win.t 冻结在关键帧：
 *   242ms = 主花绽放视觉峰值（easeOutBack 过冲）
 *   700ms = 结算面板已出现、鲜花随遮罩淡出（检查不吞结算按钮）
 * 两套数据集都出图。用法：node tools/shot_v034_flower.js
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
  { name: 'v034_flower_peak_375', w: 375, q: 'screen=play&w=375&set=tangram7&level=0&placed=7&flower=242&full=1' },
  { name: 'v034_flower_peak_750', w: 750, q: 'screen=play&w=750&set=tangram7&level=0&placed=7&flower=242&full=1' },
  { name: 'v034_flower_result_375', w: 375, q: 'screen=play&w=375&set=tangram7&level=0&placed=7&flower=700&full=1' },
  { name: 'v034_flower_result_750', w: 750, q: 'screen=play&w=750&set=tangram7&level=0&placed=7&flower=700&full=1' },
  { name: 'v034_flower_peak4_375', w: 375, q: 'screen=play&w=375&level=0&placed=4&flower=242&full=1' },
  { name: 'v034_flower_peak4_750', w: 750, q: 'screen=play&w=750&level=0&placed=4&flower=242&full=1' }
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
const udd = path.join(os.tmpdir(), 'v034flower_edge_' + process.pid);
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
  console.log(`  [${ok ? 'OK' : 'XX'}] ${s.name}.png  窗口 ${s.w}×${h}  PNG ${dim ? dim.join('×') : '?'}  ${kb} KB` +
    (ok ? '' : '  ' + (r.stderr || '').slice(0, 160)));
}
fs.writeFileSync(path.join(OUT, 'v034_flower_shots.json'), JSON.stringify(manifest, null, 2));
console.log(`\n共 ${manifest.length} 张 → ${OUT}\\v034_flower_*.png，清单 v034_flower_shots.json`);
console.log(bad === 0 ? '截图全部产出' : `!! ${bad} 张失败`);
process.exit(bad === 0 ? 0 : 1);
