/* v0.3.1 体验优化验收截图：headless Edge + harness.html
 * 不用 tools/render.js（存在 clip 未进 save/restore 的既有 bug，多张 shot 会串图）。
 * 覆盖规格 §4 V4：
 *   - 关卡页背景无横线（375/750）
 *   - 对局页目标图案无内部分割线 + 三档视觉区分（同关 tier1/2/3）
 *   - 选中板件旋转手柄可见（375/750）
 *   - 四巧板对局页无回归
 * 用法：node tools/shot_v031.js
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
  // ---------- 关卡页背景无横线（drawBg(false) 走渐变+柔光，无 9 条木纹） ----------
  { name: 'v031_750_levels7',     w: 750, q: 'screen=levels&w=750&set=tangram7&unlocked=60&page=0' },
  { name: 'v031_375_levels7',     w: 375, q: 'screen=levels&w=375&set=tangram7&unlocked=60&page=0' },

  // ---------- 目标图案三档（同关正方形 tier1/2/3，档1 无内部切割线） ----------
  { name: 'v031_750_tier1',       w: 750, q: 'screen=play&w=750&set=tangram7&level=0&placed=0&tier=1' },
  { name: 'v031_750_tier2',       w: 750, q: 'screen=play&w=750&set=tangram7&level=0&placed=0&tier=2' },
  { name: 'v031_750_tier3',       w: 750, q: 'screen=play&w=750&set=tangram7&level=0&placed=0&tier=3' },
  { name: 'v031_375_tier1',       w: 375, q: 'screen=play&w=375&set=tangram7&level=0&placed=0&tier=1' },
  { name: 'v031_375_tier2',       w: 375, q: 'screen=play&w=375&set=tangram7&level=0&placed=0&tier=2' },
  { name: 'v031_375_tier3',       w: 375, q: 'screen=play&w=375&set=tangram7&level=0&placed=0&tier=3' },
  // 带名称的形状关（飞鸟 #11）档1，验证不规则轮廓无内部切割线
  { name: 'v031_750_bird_tier1',  w: 750, q: 'screen=play&w=750&set=tangram7&level=10&placed=0&tier=1' },

  // ---------- 旋转手柄（选中板件质心 ↻ 标记，375/750） ----------
  { name: 'v031_750_handle',      w: 750, q: 'screen=play&w=750&set=tangram7&level=0&placed=0&sel=0' },
  { name: 'v031_375_handle',      w: 375, q: 'screen=play&w=375&set=tangram7&level=0&placed=0&sel=0' },

  // ---------- 四巧板对局页无回归 ----------
  { name: 'v031_750_play4',       w: 750, q: 'screen=play&w=750&level=0&placed=2' },
  { name: 'v031_375_play4',       w: 375, q: 'screen=play&w=375&level=0&placed=2' }
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
const udd = path.join(os.tmpdir(), 'v031_edge_' + process.pid);
fs.mkdirSync(udd, { recursive: true });

let bad = 0;
const manifest = [];
for (const s of SHOTS) {
  const h = Math.round(1624 * s.w / 750);
  const file = path.join(OUT, s.name + '.png');
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
fs.writeFileSync(path.join(OUT, 'v031_shots.json'), JSON.stringify(manifest, null, 2));
console.log(`\n共 ${manifest.length} 张 → ${OUT}\\v031_*.png，清单 v031_shots.json`);
console.log(bad === 0 ? '截图全部产出' : `!! ${bad} 张失败`);
process.exit(bad === 0 ? 0 : 1);
