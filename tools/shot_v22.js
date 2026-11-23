/* v0.23 验收截图：结算页首通奖励条 + 看视频 ×5 / 重复通关 / 复活弹窗（无 +90）
 * 用法：node tools/shot_v22.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'shots', 'v0.23');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const urlBase = 'file:///' + path.join(ROOT, 'tools', 'harness.html').replace(/\\/g, '/');

const SHOTS = [
  /* ① 首通 3★：奖励条写「首通奖励 +5 巧币」，右侧金按钮「看视频 ×5」 */
  { name: 'v23_result_first_750', q: 'screen=result&w=750&level=2&first=1&rw=5' },
  /* ② 已翻倍：文案变 +25、右侧变静态「×5 已领」 */
  { name: 'v23_result_ad_750', q: 'screen=result&w=750&level=2&first=1&rw=5&ad=1' },
  /* ③ 重复通关：灰条「已通过 · 重复挑战无奖励」，没有 ×5 入口 */
  { name: 'v23_result_repeat_750', q: 'screen=result&w=750&level=2&first=0&rw=0' },
  /* ④ 复活弹窗：+90 巧币已删，只写「+1 心 · 继续本关」，且不再有次数限制文案 */
  { name: 'v23_fail_750', q: 'screen=fail&w=750&level=2' }
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
const udd = path.join(os.tmpdir(), 'v23_edge_' + process.pid);
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
fs.writeFileSync(path.join(OUT, 'v23_shots.json'), JSON.stringify(manifest, null, 2));
console.log('\n' + (bad === 0 ? `v0.23 截图 ${SHOTS.length} 张全部生成` : `!! ${bad} 张失败`));
process.exit(bad === 0 ? 0 : 1);
