/* v0.17 验收截图：对局页顶栏常驻巧币 / 体力胶囊
 * 用法：node tools/shot_v17.js
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
  /* 对局页：巧币 168 / 体力 9/16 —— 正常余量下的顶栏密度 */
  { name: 'v17_play_750', w: 750, q: 'screen=play&w=750&placed=2&coin=168&energy=9' },
  /* 小屏：这是最容易挤爆的一档 */
  { name: 'v17_play_375', w: 375, q: 'screen=play&w=375&placed=2&coin=168&energy=9' },
  /* 位数变长：4 位巧币 + 满体力，看会不会压倒计时胶囊 */
  { name: 'v17_play_wide_750', w: 750, q: 'screen=play&w=750&placed=2&coin=1280&energy=16' },
  /* 七巧板对局：换数据集后顶栏版式不能变 */
  { name: 'v17_play_tangram7_750', w: 750, q: 'screen=play&w=750&set=tangram7&placed=3&coin=168&energy=9' },
  /* 最坏关卡：七巧板第 2 关轮廓最高点(屏幕 y≈352)，用来确认卡纸内的关号标题不压图形 */
  { name: 'v17_play_tangram7_worst_750', w: 750, q: 'screen=play&w=750&set=tangram7&level=1&placed=1&coin=168&energy=9' },
  /* 复活弹层：遮罩之上余额仍清晰（这里要花 100 巧币） */
  { name: 'v17_fail_750', w: 750, q: 'screen=fail&w=750&coin=210&energy=9' },
  /* 结算弹层：刚加的巧币直接反映在顶部 */
  { name: 'v17_result_750', w: 750, q: 'screen=result&w=750&placed=3&coin=188&energy=9' },
  /* 提示面板打开时顶栏也在（面板本身另有余额行，两处对得上） */
  { name: 'v17_hint_750', w: 750, q: 'screen=hintpanel&w=750&lv=0&items=0&coin=168&energy=9' }
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
const udd = path.join(os.tmpdir(), 'v17_edge_' + process.pid);
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
fs.writeFileSync(path.join(OUT, 'v17_shots.json'), JSON.stringify(manifest, null, 2));
console.log('\n' + (bad === 0 ? `v0.17 截图 ${SHOTS.length} 张全部生成` : `!! ${bad} 张失败`));
process.exit(bad === 0 ? 0 : 1);
