/* v0.18 验收截图：连胜榜 / 好友榜 / 榜单失败态
 * 用法：node tools/shot_v18.js
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
  /* 主线榜：真实云榜形状（ranklive=1），7 行 + 我的排名 */
  { name: 'v18_rank_main_750', w: 750, q: 'screen=rank&w=750&tab=0&ranklive=1&profile=wx' },
  /* 连胜榜：v0.18 口径「历史最高连胜」，脚注要写清规则 */
  { name: 'v18_rank_streak_750', w: 750, q: 'screen=rank&w=750&tab=1&ranklive=1&profile=wx' },
  /* 好友榜：浏览器预览没有关系链 → 示例好友（真机是开放数据域画的同一套行） */
  { name: 'v18_rank_friend_750', w: 750, q: 'screen=rank&w=750&tab=2&friendmock=1&profile=wx' },
  /* 好友榜小屏：名字截断 / 数字不越界 */
  { name: 'v18_rank_friend_375', w: 375, q: 'screen=rank&w=375&tab=2&friendmock=1&profile=wx' },
  /* 失败态：无缓存 + 网络超时 → 重新加载按钮 */
  { name: 'v18_rank_err_750', w: 750, q: 'screen=rank&w=750&tab=0&rankerr=1&profile=wx' },
  /* 复活页：断点前连胜数 + 余额 */
  { name: 'v18_fail_streak_750', w: 750, q: 'screen=fail&w=750&coin=210&energy=9' }
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
const udd = path.join(os.tmpdir(), 'v18_edge_' + process.pid);
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
fs.writeFileSync(path.join(OUT, 'v18_shots.json'), JSON.stringify(manifest, null, 2));
console.log('\n' + (bad === 0 ? `v0.18 截图 ${SHOTS.length} 张全部生成` : `!! ${bad} 张失败`));
process.exit(bad === 0 ? 0 : 1);
