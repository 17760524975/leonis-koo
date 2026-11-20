/* v0.3.4 A1/A2/A3 验收截图：headless Edge + harness.html（不用有 clip bug 的 render.js）
 * A1 对局页净空：四巧/七巧 × 375/750（placed=2 露出空槽虚线框，复现"绿三角上方横线"位置）
 * A2 时间醒目：375/750，另附长标题降级一档（七巧第 9 关）
 * A3 主界面文案：四巧/七巧 × 375/750
 * 用法：node tools/shot_v034.js
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
  // A1：托盘/进度条/白卡净空，两套数据集、两档宽度
  { name: 'v034_a1_375_play7', w: 375, q: 'screen=play&w=375&set=tangram7&level=0&placed=2' },
  { name: 'v034_a1_750_play7', w: 750, q: 'screen=play&w=750&set=tangram7&level=0&placed=2' },
  { name: 'v034_a1_375_play4', w: 375, q: 'screen=play&w=375&level=0&placed=2' },
  { name: 'v034_a1_750_play4', w: 750, q: 'screen=play&w=750&level=0&placed=2' },
  // 主理人复核：初始态（placed=0，首行板件全在托盘）净空确认
  { name: 'v034_a1_750_play7_initial', w: 750, q: 'screen=play&w=750&set=tangram7&level=0&placed=0' },
  { name: 'v034_a1_375_play7_initial', w: 375, q: 'screen=play&w=375&set=tangram7&level=0&placed=0' },
  // A2：计时胶囊（harness 固定 elapsed=63.4 → 01:03）
  { name: 'v034_a2_375_time', w: 375, q: 'screen=play&w=375&set=tangram7&level=0&placed=0' },
  { name: 'v034_a2_750_time', w: 750, q: 'screen=play&w=750&set=tangram7&level=0&placed=0' },
  { name: 'v034_a2_750_longtitle', w: 750, q: 'screen=play&w=750&set=tangram7&level=8&placed=0' },
  // A3：主界面入口文案
  { name: 'v034_a3_375_home4', w: 375, q: 'screen=home&w=375' },
  { name: 'v034_a3_750_home4', w: 750, q: 'screen=home&w=750' },
  { name: 'v034_a3_375_home7', w: 375, q: 'screen=home&w=375&set=tangram7' },
  { name: 'v034_a3_750_home7', w: 750, q: 'screen=home&w=750&set=tangram7' }
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
const udd = path.join(os.tmpdir(), 'v034_edge_' + process.pid);
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
fs.writeFileSync(path.join(OUT, 'v034_shots.json'), JSON.stringify(manifest, null, 2));
console.log(`\n共 ${manifest.length} 张 → ${OUT}\\v034_*.png，清单 v034_shots.json`);
console.log(bad === 0 ? '截图全部产出' : `!! ${bad} 张失败`);
process.exit(bad === 0 ? 0 : 1);
