/* v0.41 验收截图：邀请有礼 8 档阶梯 / 星级补差 1·2·3
 * 用法：node tools/shot_v41.js
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
  /* 邀请面板：空 / 进行中 / 有待确认 / 全解锁 / 深色 */
  { name: 'v41_invite_empty',    q: 'screen=invite&w=750&ic=0&skins=' },
  { name: 'v41_invite_progress', q: 'screen=invite&w=750&ic=3&ig=1,2,3' },
  { name: 'v41_invite_pending',  q: 'screen=invite&w=750&ic=2&ig=1,2&ip=2' },
  { name: 'v41_invite_full',     q: 'screen=invite&w=750&ic=8&ig=1,2,3,4,5,6,7,8' },
  { name: 'v41_invite_dark',     q: 'screen=invite&w=750&skin=dusk&ic=3&ig=1,2,3' },
  /* 关卡列表：角标数值跟着新口径变成 ↑1 / ↑2 */
  { name: 'v41_levels_tag',      q: 'screen=levels&w=750&unlocked=6' },
  { name: 'v41_levels_tag_dark', q: 'screen=levels&w=750&unlocked=6&skin=dusk' },
  /* 结算页：1★→2★ 补 1、2★→3★ 补 2、1★ 直接 3★ 补 3 */
  { name: 'v41_result_up1', q: 'screen=result&w=750&level=4&stars=2&prev=1&best=2&rw=1&first=0' },
  { name: 'v41_result_up2', q: 'screen=result&w=750&level=4&stars=3&prev=2&best=3&rw=2&first=0' },
  { name: 'v41_result_up3', q: 'screen=result&w=750&level=4&stars=3&prev=1&best=3&rw=3&first=0' }
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
const udd = path.join(os.tmpdir(), 'v41_edge_' + process.pid);
fs.mkdirSync(udd, { recursive: true });

let bad = 0;
const manifest = [];
for (const s of SHOTS) {
  const file = path.join(OUT, s.name + '.png');
  try { fs.unlinkSync(file); } catch (e) {}
  const args = [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
    '--hide-scrollbars', '--force-device-scale-factor=1',
    '--user-data-dir=' + udd,
    '--window-size=750,1624',
    '--virtual-time-budget=4200',
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
fs.writeFileSync(path.join(OUT, 'v41_shots.json'), JSON.stringify(manifest, null, 2));
console.log(bad ? `\n!! ${bad} 张截图失败` : '\n截图全部生成 → tools/out/');
process.exit(bad ? 1 : 0);
