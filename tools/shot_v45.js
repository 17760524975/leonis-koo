/* v0.45 验收截图：四巧板第二章追加的 6 个「参考图」关卡（id 21-26）
 * 用法：node tools/shot_v45.js
 *
 * 每关拍两张：placed=0（空轮廓，看剪影是否和照片一致）+ placed=4（四块摆满，看是否严丝合缝）。
 * 另拍两张关卡页，确认第二章从 10 关变 16 关、编号 21-26 出现在第 2 章内。
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'out');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const urlBase = 'file:///' + path.join(ROOT, 'tools', 'harness.html').replace(/\\/g, '/');

/* id 21..26 → 0 基索引 20..25 */
const SHOTS = [
  { name: 'v45_lv21_empty', q: 'set=tangram4&screen=play&w=750&level=20&placed=0' },
  { name: 'v45_lv21_done', q: 'set=tangram4&screen=play&w=750&level=20&placed=4' },
  { name: 'v45_lv22_empty', q: 'set=tangram4&screen=play&w=750&level=21&placed=0' },
  { name: 'v45_lv22_done', q: 'set=tangram4&screen=play&w=750&level=21&placed=4' },
  { name: 'v45_lv23_empty', q: 'set=tangram4&screen=play&w=750&level=22&placed=0' },
  { name: 'v45_lv23_done', q: 'set=tangram4&screen=play&w=750&level=22&placed=4' },
  { name: 'v45_lv24_empty', q: 'set=tangram4&screen=play&w=750&level=23&placed=0' },
  { name: 'v45_lv24_done', q: 'set=tangram4&screen=play&w=750&level=23&placed=4' },
  { name: 'v45_lv25_empty', q: 'set=tangram4&screen=play&w=750&level=24&placed=0' },
  { name: 'v45_lv25_done', q: 'set=tangram4&screen=play&w=750&level=24&placed=4' },
  { name: 'v45_lv26_empty', q: 'set=tangram4&screen=play&w=750&level=25&placed=0' },
  { name: 'v45_lv26_done', q: 'set=tangram4&screen=play&w=750&level=25&placed=4' },
  /* 旧关回归：第 20 关（第二章最后一关旧编号）与第 27 关（顺延后的原第三章首关） */
  { name: 'v45_lv20_done', q: 'set=tangram4&screen=play&w=750&level=19&placed=4' },
  { name: 'v45_lv27_done', q: 'set=tangram4&screen=play&w=750&level=26&placed=4' },
  /* 关卡页：第 1 页（第 1-2 章）与第 2 页（跨章） */
  { name: 'v45_levels_p1', q: 'set=tangram4&screen=levels&w=750&page=0&unlocked=26' },
  { name: 'v45_levels_p2', q: 'set=tangram4&screen=levels&w=750&page=1&unlocked=36' }
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
const udd = path.join(os.tmpdir(), 'v45_edge_' + process.pid);
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

fs.writeFileSync(path.join(OUT, 'v45_shots.json'), JSON.stringify(manifest, null, 2));
console.log(bad ? `\n!! ${bad} 张截图失败` : '\n截图全部生成 → tools/out/');
