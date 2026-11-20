/* v0.4 A3 验收截图：headless Edge + harness.html（不用有 clip bug 的 render.js）
 * 重点：底部工具栏「翻转」按钮下方不再有「长按翻转」tip 汉字、图标恢复满尺寸居中。
 * 顺带确认 v0.3.4 的鲜花/时间胶囊/主界面文案/托盘净空零回归。
 * 用法：node tools/shot_v04.js
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
  // A3 核心：对局页底部工具栏（sel 选中一块 → flip 按钮 enabled，最能看清图标与文字）
  { name: 'v04_toolbar_375_play7', w: 375, q: 'screen=play&w=375&set=tangram7&level=0&placed=2&sel=0' },
  { name: 'v04_toolbar_750_play7', w: 750, q: 'screen=play&w=750&set=tangram7&level=0&placed=2&sel=0' },
  { name: 'v04_toolbar_375_play4', w: 375, q: 'screen=play&w=375&level=0&placed=2&sel=0' },
  { name: 'v04_toolbar_750_play4', w: 750, q: 'screen=play&w=750&level=0&placed=2&sel=0' },
  // 零回归对照：初始态（placed=0）、主界面文案、时间胶囊
  { name: 'v04_regress_750_play7_initial', w: 750, q: 'screen=play&w=750&set=tangram7&level=0&placed=0' },
  { name: 'v04_regress_750_home4', w: 750, q: 'screen=home&w=750' },
  { name: 'v04_regress_375_home7', w: 375, q: 'screen=home&w=375&set=tangram7' }
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
const udd = path.join(os.tmpdir(), 'v04_edge_' + process.pid);
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
fs.writeFileSync(path.join(OUT, 'v04_shots.json'), JSON.stringify(manifest, null, 2));
console.log(`\n共 ${manifest.length} 张 → ${OUT}\\v04_*.png，清单 v04_shots.json`);
console.log(bad === 0 ? '截图全部产出' : `!! ${bad} 张失败`);
process.exit(bad === 0 ? 0 : 1);
