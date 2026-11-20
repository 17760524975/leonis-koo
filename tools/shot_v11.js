/* v0.11 验收截图：已经摆了几块之后的提示（本次修复的核心场景）+ 换曲后的对局页
 * 用法：node tools/shot_v11.js
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
  /* 主场景：4 块里已摆 2 块，第 2 档提示要盖在板件之上 */
  { name: 'v11_hint2_placed_750', w: 750, q: 'screen=hint&w=750&level=0&placed=2&hinttier=2' },
  { name: 'v11_hint2_placed_375', w: 375, q: 'screen=hint&w=375&level=0&placed=2&hinttier=2' },
  /* 档3：只淡显没放对的两块 */
  { name: 'v11_hint3_placed_750', w: 750, q: 'screen=hint&w=750&level=0&placed=2&hinttier=3' },
  /* 七巧板：摆 4 块（与用户截图同一状态） */
  { name: 'v11_hint2_7_placed_750', w: 750, q: 'screen=hint&w=750&set=tangram7&level=2&placed=4&hinttier=2' },
  { name: 'v11_hint3_7_placed_750', w: 750, q: 'screen=hint&w=750&set=tangram7&level=2&placed=4&hinttier=3' },
  /* 全部上板但有一块摆歪：圈出那块 + 「移到这」 */
  { name: 'v11_hint_bad_750', w: 750, q: 'screen=hint&w=750&set=tangram7&level=2&placed=6&hintbad=0&hinttier=2' },
  /* 对局页整体（没有提示时） */
  { name: 'v11_play_750', w: 750, q: 'screen=play&w=750&level=7&placed=0' },
  { name: 'v11_levels_750', w: 750, q: 'screen=levels&w=750&unlocked=12' }
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
const udd = path.join(os.tmpdir(), 'v11_edge_' + process.pid);
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
fs.writeFileSync(path.join(OUT, 'v11_shots.json'), JSON.stringify(manifest, null, 2));
console.log(`\n共 ${manifest.length} 张 → ${OUT}\\v11_*.png，失败 ${bad} 张`);
process.exit(bad ? 1 : 0);
