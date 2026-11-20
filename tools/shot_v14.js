/* v0.14 验收截图：设置页的四种玩家资料态 + 榜单头像
 * 用法：node tools/shot_v14.js
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
  /* 设置页：未授权（默认态，主按钮=使用微信昵称头像） */
  { name: 'v14_settings_anon_750', w: 750, q: 'screen=settings&w=750&profile=anon' },
  { name: 'v14_settings_anon_375', w: 375, q: 'screen=settings&w=375&profile=anon' },
  /* 设置页：已授权微信资料（头像 + 微信昵称 + 改昵称） */
  { name: 'v14_settings_wx_750', w: 750, q: 'screen=settings&w=750&profile=wx' },
  { name: 'v14_settings_wx_375', w: 375, q: 'screen=settings&w=375&profile=wx' },
  /* 设置页：系统化名（云端登录但没授权） */
  { name: 'v14_settings_auto_750', w: 750, q: 'screen=settings&w=750&profile=auto' },
  /* 设置页：自定义昵称（授权后改过名） */
  { name: 'v14_settings_custom_750', w: 750, q: 'screen=settings&w=750&profile=custom' },
  /* 榜单：化名态 vs 资料态（同一份数据，只差昵称头像） */
  { name: 'v14_rank_anon_750', w: 750, q: 'screen=rank&w=750&ranklive=1&profile=anon' },
  { name: 'v14_rank_wx_750', w: 750, q: 'screen=rank&w=750&ranklive=1&profile=wx' }
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
const udd = path.join(os.tmpdir(), 'v14_edge_' + process.pid);
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
fs.writeFileSync(path.join(OUT, 'v14_shots.json'), JSON.stringify(manifest, null, 2));
console.log('\n' + (bad === 0 ? `v0.14 截图 ${SHOTS.length} 张全部生成` : `!! ${bad} 张失败`));
process.exit(bad === 0 ? 0 : 1);
