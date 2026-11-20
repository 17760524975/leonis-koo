/* v0.3.2 手柄与高亮优化验收截图：headless Edge + harness.html
 * 不用 tools/render.js（存在 clip 未进 save/restore 的既有 bug，多张 shot 会串图）。
 * 覆盖规格 §4 V4：
 *   - 选中态高亮增强（375/750，另附托盘选中）
 *   - 手柄在板件角上、不遮质心（375/750，红十字=质心 蓝圈=手柄）
 *   - 质心按下并拖动 → 角度不变（叠加实时 angle 文本）
 *   - 四巧板对局页无回归
 * 用法：node tools/shot_v032.js
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
  // ---------- B2 选中高亮增强 ----------
  { name: 'v032_375_select_highlight', w: 375, q: 'screen=play&w=375&set=tangram7&level=0&placed=0&sel=0' },
  { name: 'v032_750_select_highlight', w: 750, q: 'screen=play&w=750&set=tangram7&level=0&placed=0&sel=0' },
  { name: 'v032_375_tray_highlight',   w: 375, q: 'screen=play&w=375&set=tangram7&level=0&placed=0&traysel=1' },

  // ---------- B1 手柄在角上（红十=质心，蓝圈=手柄） ----------
  { name: 'v032_375_handle_corner', w: 375, q: 'screen=play&w=375&set=tangram7&level=0&placed=0&sel=0&mark=1' },
  { name: 'v032_750_handle_corner', w: 750, q: 'screen=play&w=750&set=tangram7&level=0&placed=0&sel=0&mark=1' },

  // ---------- B1 质心拖拽无旋转（页面内实际模拟 down→move→up） ----------
  { name: 'v032_375_centroid_drag', w: 375, q: 'screen=play&w=375&set=tangram7&level=0&placed=0&sel=0&dragcenter=1' },
  { name: 'v032_750_centroid_drag', w: 750, q: 'screen=play&w=750&set=tangram7&level=0&placed=0&sel=0&dragcenter=1' },

  // ---------- 四巧板无回归 ----------
  { name: 'v032_375_play4', w: 375, q: 'screen=play&w=375&level=0&placed=2' },
  { name: 'v032_750_play4', w: 750, q: 'screen=play&w=750&level=0&placed=2' }
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
const udd = path.join(os.tmpdir(), 'v032_edge_' + process.pid);
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
fs.writeFileSync(path.join(OUT, 'v032_shots.json'), JSON.stringify(manifest, null, 2));
console.log(`\n共 ${manifest.length} 张 → ${OUT}\\v032_*.png，清单 v032_shots.json`);
console.log(bad === 0 ? '截图全部产出' : `!! ${bad} 张失败`);
process.exit(bad === 0 ? 0 : 1);
