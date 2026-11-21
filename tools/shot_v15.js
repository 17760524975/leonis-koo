/* v0.15 验收截图：在线奖励页（三种进度）+ 主页气泡 + 提示面板的提示卡入口
 * 用法：node tools/shot_v15.js
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
  /* 在线奖励页：刚进来（1 分钟档已领，10 分钟档可领，其余倒计时） */
  { name: 'v15_online_750', w: 750, q: 'screen=online&w=750&online=700&ogot=1&items=0' },
  /* 小屏：同一份状态下的文字/按钮是否还放得下 */
  { name: 'v15_online_375', w: 375, q: 'screen=online&w=375&online=700&ogot=1&items=0' },
  /* 全部领完 */
  { name: 'v15_online_done_750', w: 750, q: 'screen=online&w=750&online=3900&ogot=1,2,3,4,5,6&items=2' },
  /* 刚开局：只有 00:42，六档全是倒计时 */
  { name: 'v15_online_new_750', w: 750, q: 'screen=online&w=750&online=42&items=0' },
  /* 已有 1 小时 + 2 张提示卡：40/60 分钟档可领 */
  { name: 'v15_online_hour_750', w: 750, q: 'screen=online&w=750&online=3600&ogot=1,2,3&items=2' },
  /* 主页：有可领档 → 红色「可领 N」气泡 + 图标红点 */
  { name: 'v15_home_ready_750', w: 750, q: 'screen=home&w=750&online=90' },
  /* 主页：没到点 → 白色气泡显示今日累计 */
  { name: 'v15_home_clock_750', w: 750, q: 'screen=home&w=750&online=40' },
  /* 提示面板：有提示卡（最上面多一个主按钮） */
  { name: 'v15_hint_item_750', w: 750, q: 'screen=hintpanel&w=750&lv=1&items=2' },
  /* 提示面板：没卡（换成获取指引文案） */
  { name: 'v15_hint_noitem_750', w: 750, q: 'screen=hintpanel&w=750&lv=1&items=0' }
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
const udd = path.join(os.tmpdir(), 'v15_edge_' + process.pid);
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
fs.writeFileSync(path.join(OUT, 'v15_shots.json'), JSON.stringify(manifest, null, 2));
console.log('\n' + (bad === 0 ? `v0.15 截图 ${SHOTS.length} 张全部生成` : `!! ${bad} 张失败`));
process.exit(bad === 0 ? 0 : 1);
