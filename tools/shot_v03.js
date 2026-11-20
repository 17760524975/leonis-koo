/* v0.3 正式版验收截图：headless Edge + harness.html
 * 不用 tools/render.js（存在 clip 未进 save/restore 的既有 bug，多张 shot 会串图）。
 * 覆盖 V4 提示三档同关三张 / V7 375 尺寸与托盘 / V8 六题材章节胶囊 /
 *      V9 双方结算文案 / V11 375+750 关键页各一套。
 * 用法：node tools/shot_v03.js
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
  // ---------- 750 设计稿档 ----------
  { name: 'v03_750_home',         w: 750, q: 'screen=home&w=750' },
  { name: 'v03_750_levels7_c1',   w: 750, q: 'screen=levels&w=750&set=tangram7&unlocked=60&page=0' },
  { name: 'v03_750_levels7_c6',   w: 750, q: 'screen=levels&w=750&set=tangram7&unlocked=60&page=5' },
  { name: 'v03_750_levels4',      w: 750, q: 'screen=levels&w=750&unlocked=120&page=0' },
  { name: 'v03_750_play7',        w: 750, q: 'screen=play&w=750&set=tangram7&level=0&placed=0' },
  { name: 'v03_750_play4',        w: 750, q: 'screen=play&w=750&level=0&placed=2' },
  // 提示三档：同一关（第 1 章第 1 关 正方形）三张
  { name: 'v03_750_tier1',        w: 750, q: 'screen=play&w=750&set=tangram7&level=0&placed=0&tier=1' },
  { name: 'v03_750_tier2',        w: 750, q: 'screen=play&w=750&set=tangram7&level=0&placed=0&tier=2' },
  { name: 'v03_750_tier3',        w: 750, q: 'screen=play&w=750&set=tangram7&level=0&placed=0&tier=3' },
  { name: 'v03_750_hint',         w: 750, q: 'screen=hint&w=750&set=tangram7&level=0&placed=1&tier=1' },
  // 双方结算（last=1 触发「全部完成」文案，A7）
  { name: 'v03_750_result7',      w: 750, q: 'screen=result&w=750&set=tangram7&last=1&placed=0' },
  { name: 'v03_750_result4',      w: 750, q: 'screen=result&w=750&last=1&placed=2' },

  // ---------- 375 移动模拟档（h = 1624 * 375 / 750 = 812） ----------
  { name: 'v03_375_home',         w: 375, q: 'screen=home&w=375' },
  { name: 'v03_375_levels7',      w: 375, q: 'screen=levels&w=375&set=tangram7&unlocked=60&page=0' },
  { name: 'v03_375_play7',        w: 375, q: 'screen=play&w=375&set=tangram7&level=0&placed=0' },
  { name: 'v03_375_play4',        w: 375, q: 'screen=play&w=375&level=0&placed=2' },
  { name: 'v03_375_tier1',        w: 375, q: 'screen=play&w=375&set=tangram7&level=0&placed=0&tier=1' },
  { name: 'v03_375_tier2',        w: 375, q: 'screen=play&w=375&set=tangram7&level=0&placed=0&tier=2' },
  { name: 'v03_375_tier3',        w: 375, q: 'screen=play&w=375&set=tangram7&level=0&placed=0&tier=3' },
  { name: 'v03_375_result7',      w: 375, q: 'screen=result&w=375&set=tangram7&last=1&placed=0' },
  { name: 'v03_375_result4',      w: 375, q: 'screen=result&w=375&last=1&placed=2' }
];

/* 真·预览版入口（file:// 直接打开 preview/index.html，验证自包含无 404） */
const PREVIEW = 'file:///' + path.join(ROOT, 'preview', 'index.html').replace(/\\/g, '/');
const EXTRA = [{ name: 'v03_preview_real', w: 750, url: PREVIEW }];

function pngSize(file) {
  try {
    const b = fs.readFileSync(file);
    if (b.slice(1, 4).toString() !== 'PNG') return null;
    return [b.readUInt32BE(16), b.readUInt32BE(20)];
  } catch (e) { return null; }
}

if (!fs.existsSync(EDGE)) { console.log('找不到 Edge: ' + EDGE); process.exit(1); }
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
const udd = path.join(os.tmpdir(), 'v03_edge_' + process.pid);
fs.mkdirSync(udd, { recursive: true });

let bad = 0;
const manifest = [];
for (const s of SHOTS.concat(EXTRA)) {
  const h = Math.round(1624 * s.w / 750);
  const file = path.join(OUT, s.name + '.png');
  const args = [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
    '--hide-scrollbars', '--force-device-scale-factor=1',
    '--user-data-dir=' + udd,
    '--window-size=' + s.w + ',' + h,
    '--virtual-time-budget=3500',
    '--screenshot=' + file,
    s.url || (urlBase + '?' + s.q)
  ];
  const r = spawnSync(EDGE, args, { encoding: 'utf8', timeout: 60000 });
  const ok = fs.existsSync(file) && fs.statSync(file).size > 5000;
  if (!ok) bad++;
  const dim = pngSize(file);
  const kb = fs.existsSync(file) ? (fs.statSync(file).size / 1024).toFixed(0) : '0';
  manifest.push({ name: s.name + '.png', window: s.w + '×' + h, png: dim ? dim.join('×') : '?', kb: +kb });
  console.log(`  [${ok ? 'OK' : 'XX'}] ${s.name}.png  窗口 ${s.w}×${h}  PNG ${dim ? dim.join('×') : '?'}  ${kb} KB` +
    (ok ? '' : '  ' + (r.stderr || '').slice(0, 160)));
}
fs.writeFileSync(path.join(OUT, 'v03_shots.json'), JSON.stringify(manifest, null, 2));
console.log(`\n共 ${manifest.length} 张 → ${OUT}\\v03_*.png，清单 v03_shots.json`);
console.log(bad === 0 ? '截图全部产出' : `!! ${bad} 张失败`);
process.exit(bad === 0 ? 0 : 1);
