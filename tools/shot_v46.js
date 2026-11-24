/* v0.46 验收截图：顶部胶囊 + 倒计时不再被卡纸压住，且整体放大一档
 * 用法：node tools/shot_v46.js
 *
 * 真机参数：iPhone 17 = 402×874 CSS px，safeArea.top = 62
 *   → 750 设计宽下 scale = min(402/750, 874/1624) = 0.536
 *   → safeTop = max(88, 62/0.536) = 115.7 设计 px
 * 另外拍 iPhone SE / 13 / 15 三档做回归，确认没把矮屏改坏。
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'out');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const urlBase = 'file:///' + path.join(ROOT, 'tools', 'harness.html').replace(/\\/g, '/');

/* 各机型的 w / h / safeArea.top（CSS px） */
const DEV = {
  ip17: { q: 'w=402&h=874&safeTop=62', win: '402,874' },
  ip15: { q: 'w=393&h=852&safeTop=59', win: '393,852' },
  ip13: { q: 'w=390&h=844&safeTop=47', win: '390,844' },
  se:   { q: 'w=375&h=667&safeTop=20', win: '375,667' },
  base: { q: 'w=750',                  win: '750,1624' }
};

const SHOTS = [
  { name: 'v46_ip17_play',    d: DEV.ip17, q: 'set=tangram4&screen=play&level=30&placed=0' },
  { name: 'v46_ip17_lv1',     d: DEV.ip17, q: 'set=tangram4&screen=play&level=0&placed=4' },
  { name: 'v46_ip17_levels',  d: DEV.ip17, q: 'set=tangram4&screen=levels&page=3&unlocked=36' },
  { name: 'v46_ip15_play',    d: DEV.ip15, q: 'set=tangram4&screen=play&level=30&placed=0' },
  { name: 'v46_ip13_play',    d: DEV.ip13, q: 'set=tangram4&screen=play&level=30&placed=0' },
  { name: 'v46_se_play',      d: DEV.se,   q: 'set=tangram4&screen=play&level=30&placed=0' },
  { name: 'v46_base_play',    d: DEV.base, q: 'set=tangram4&screen=play&level=30&placed=0' },
  /* 七巧板也拍一张：托盘/工具栏位置必须没被带歪 */
  { name: 'v46_ip17_tan7',    d: DEV.ip17, q: 'set=tangram7&screen=play&level=12&placed=0' },
  /* 结算 / 提示 两个弹层也会重画一遍 playHud，位置必须与对局页一致 */
  { name: 'v46_ip17_result',  d: DEV.ip17, q: 'set=tangram4&screen=result&level=30' },
  { name: 'v46_ip17_hint',    d: DEV.ip17, q: 'set=tangram4&screen=hint&level=30' }
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
const udd = path.join(os.tmpdir(), 'v46_edge_' + process.pid);
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
    '--window-size=' + s.d.win,
    '--virtual-time-budget=4200',
    '--screenshot=' + file,
    urlBase + '?' + s.q + '&' + s.d.q
  ];
  const r = spawnSync(EDGE, args, { encoding: 'utf8', timeout: 60000 });
  const ok = fs.existsSync(file) && fs.statSync(file).size > 5000;
  if (!ok) bad++;
  const dim = pngSize(file);
  manifest.push({ name: s.name, ok, size: ok ? fs.statSync(file).size : 0, dim });
  console.log(`  [${ok ? 'OK' : 'XX'}] ${s.name}  ${ok ? (fs.statSync(file).size / 1024).toFixed(0) + 'KB' : 'fail'}` +
    (dim ? `  ${dim[0]}×${dim[1]}` : '') + (r.status ? `  exit=${r.status}` : ''));
}

fs.writeFileSync(path.join(OUT, 'v46_shots.json'), JSON.stringify(manifest, null, 2));
console.log(bad ? `\n!! ${bad} 张截图失败` : '\n截图全部生成 → tools/out/');
