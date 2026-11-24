/* v0.40 验收截图：关卡卡片「↑补差」角标 / 结算页升星补差 / 泡泡 + 萤火上架
 * 用法：node tools/shot_v40.js
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
  /* 关卡列表：第 1 关 3★（无角标）、第 2 关 2★（↑21）、第 3 关 1★（↑11） */
  { name: 'v40_levels_tag',      q: 'screen=levels&w=750&unlocked=6' },
  { name: 'v40_levels_tag_dark', q: 'screen=levels&w=750&unlocked=6&skin=dusk' },
  /* 结算页：首通 / 升星补差 / 升星补差已翻倍 / 满星重打 */
  { name: 'v40_result_first',    q: 'screen=result&w=750&level=3&first=1&rw=53&prev=0&best=3' },
  { name: 'v40_result_up',       q: 'screen=result&w=750&level=3&first=0&rw=21&prev=2&best=3' },
  { name: 'v40_result_up_ad',    q: 'screen=result&w=750&level=3&first=0&rw=21&prev=2&best=3&ad=1' },
  { name: 'v40_result_none',     q: 'screen=result&w=750&level=3&first=0&rw=0&prev=3&best=3' },
  { name: 'v40_result_up_dark',  q: 'screen=result&w=750&level=3&skin=dusk&first=0&rw=21&prev=2&best=3' },
  /* 皮肤面板：背景页 5 个价签（3×150 + 2×100） */
  { name: 'v40_skin_bg',         q: 'screen=skin&w=750&skinpanel=1&skintab=1&coin=260' },
  { name: 'v40_buy_bubble',      q: 'screen=skin&w=750&buy=bgfx:bubbles&coin=260' },
  { name: 'v40_buy_firefly',     q: 'screen=skin&w=750&buy=bgfx:firefly&coin=60' }
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
const udd = path.join(os.tmpdir(), 'v40_edge_' + process.pid);
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
fs.writeFileSync(path.join(OUT, 'v40_shots.json'), JSON.stringify(manifest, null, 2));
console.log(bad ? `\n!! ${bad} 张截图失败` : '\n截图全部生成 → tools/out/');
process.exit(bad ? 1 : 0);
