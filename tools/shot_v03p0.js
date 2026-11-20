/* v0.3 Phase 0 验收截图：headless Edge + harness.html
 * 不用 tools/render.js（存在 clip 未进 save/restore 的既有 bug，多张 shot 会串图）。
 * 用法：node tools/shot_v03p0.js
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
  // 750 设计稿档
  { name: 'v03p0_750_home',        w: 750, q: 'screen=home&w=750' },
  { name: 'v03p0_750_levels7',     w: 750, q: 'screen=levels&w=750&set=tangram7&unlocked=4' },
  { name: 'v03p0_750_play7',       w: 750, q: 'screen=play&w=750&set=tangram7&level=2&placed=0' },
  { name: 'v03p0_750_play4',       w: 750, q: 'screen=play&w=750&level=0&placed=2' },
  // 375 移动模拟档（h = 1624 * 375 / 750 = 812）
  { name: 'v03p0_375_home',        w: 375, q: 'screen=home&w=375' },
  { name: 'v03p0_375_levels7',     w: 375, q: 'screen=levels&w=375&set=tangram7&unlocked=4' },
  { name: 'v03p0_375_play7',       w: 375, q: 'screen=play&w=375&set=tangram7&level=2&placed=0' },
  { name: 'v03p0_375_play4',       w: 375, q: 'screen=play&w=375&level=0&placed=2' },
  { name: 'v03p0_375_home7',       w: 375, q: 'screen=home&w=375&set=tangram7' }
];

/* 真·预览版入口（file:// 直接打开 preview/index.html，验证自包含无 404） */
const PREVIEW = 'file:///' + path.join(ROOT, 'preview', 'index.html').replace(/\\/g, '/');
/* 注：headless Edge（--headless=new）有最小视口宽度限制（约 500px），
 * 用 375 窗口截图会让 innerWidth 变成 500 而画面偏移。真机/浏览器无此问题，
 * 375 宽版式证据看 harness 显式 375 画布那几张；这里用 750 证明 real preview 能启动。 */
const EXTRA = [{ name: 'v03p0_preview_real', w: 750, url: PREVIEW }];

if (!fs.existsSync(EDGE)) { console.log('找不到 Edge: ' + EDGE); process.exit(1); }
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
const udd = path.join(os.tmpdir(), 'v03p0_edge_' + process.pid);
fs.mkdirSync(udd, { recursive: true });

let bad = 0;
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
  console.log(`  [${ok ? 'OK' : 'XX'}] ${s.name}.png  ${s.w}×${h}  ${ok ? (fs.statSync(file).size / 1024).toFixed(0) + ' KB' : (r.stderr || '').slice(0, 160)}`);
}
console.log(bad === 0 ? '截图全部产出' : `!! ${bad} 张失败`);
process.exit(bad === 0 ? 0 : 1);
