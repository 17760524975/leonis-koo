/* v0.16 验收截图：主页（任务已下线）+ 提示面板两条状态 + 邀请有礼 + 在线奖励
 * 用法：node tools/shot_v16.js
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
  /* 主页：左列 3 个入口（添加桌面/皮肤/邀请有礼），不再有「任务」 */
  { name: 'v16_home_750', w: 750, q: 'screen=home&w=750&online=40' },
  /* 小屏：入口列与在线气泡是否还放得下 */
  { name: 'v16_home_375', w: 375, q: 'screen=home&w=375&online=40' },
  /* 提示面板：第 1 档、没有查找道具、巧币够（道具按钮置灰 + 巧币可买） */
  { name: 'v16_hint_noitem_750', w: 750, q: 'screen=hintpanel&w=750&lv=0&items=0&coin=168' },
  /* 提示面板：第 2 档、有 3 个查找道具（主按钮「用查找道具 · 剩 3」） */
  { name: 'v16_hint_item_750', w: 750, q: 'screen=hintpanel&w=750&lv=1&items=3&coin=168' },
  /* 提示面板：巧币和道具都没有，只剩看视频那条路 */
  { name: 'v16_hint_broke_750', w: 750, q: 'screen=hintpanel&w=750&lv=0&items=0&coin=0' },
  /* 邀请有礼：+20 巧币 +1 查找道具 */
  { name: 'v16_invite_750', w: 750, q: 'screen=invite&w=750' },
  /* 在线奖励：40/60 分钟档给查找道具 */
  { name: 'v16_online_750', w: 750, q: 'screen=online&w=750&online=2400&ogot=1,2,3,4&items=1' }
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
const udd = path.join(os.tmpdir(), 'v16_edge_' + process.pid);
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
fs.writeFileSync(path.join(OUT, 'v16_shots.json'), JSON.stringify(manifest, null, 2));
console.log('\n' + (bad === 0 ? `v0.16 截图 ${SHOTS.length} 张全部生成` : `!! ${bad} 张失败`));
process.exit(bad === 0 ? 0 : 1);
