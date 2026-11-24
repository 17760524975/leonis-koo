/* v0.48 验收截图：超时失败的进场动画（红闪 / 卡片滑入 / 心裂 / 横幅）
 *
 * 用法：node tools/shot_v48.js
 *
 * harness.html 的 fail 屏现已支持 &failT=<ms> 定格动画某一帧（静态渲染，
 * 不会自己推进）。这里按 0 / 180 / 450 / 1000 / 1500ms 拍一整条时间线，
 * 再补深色主题与 iPhone 17 尺寸各一组，最后一张必须是动画退场后的静态版。
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'out');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const urlBase = 'file:///' + path.join(ROOT, 'tools', 'harness.html').replace(/\\/g, '/');

const BASE = 'set=tangram4&screen=fail&level=3&notoast=1&freezeFail=1';
const TIMES = [0, 180, 450, 1000, 1500];
const SHOTS = [];
for (const t of TIMES) SHOTS.push({ name: `warm_t${t}`, win: '750,1624', q: `${BASE}&skin=warm&failT=${t}` });
for (const t of [0, 450, 1500]) SHOTS.push({ name: `dusk_t${t}`, win: '750,1624', q: `${BASE}&skin=dusk&failT=${t}` });
for (const t of [0, 1500]) SHOTS.push({ name: `ip17_t${t}`, win: '402,874', q: `${BASE}&skin=warm&failT=${t}&w=402&h=874&safeTop=62` });

function pngSize(file) {
  try {
    const b = fs.readFileSync(file);
    if (b.slice(1, 4).toString() !== 'PNG') return null;
    return [b.readUInt32BE(16), b.readUInt32BE(20)];
  } catch (e) { return null; }
}

if (!fs.existsSync(EDGE)) { console.log('找不到 Edge: ' + EDGE); process.exit(1); }
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
const udd = path.join(os.tmpdir(), 'v48_edge_' + process.pid);
fs.mkdirSync(udd, { recursive: true });

let bad = 0;
const manifest = [];
for (const s of SHOTS) {
  const file = path.join(OUT, 'v48_' + s.name + '.png');
  try { fs.unlinkSync(file); } catch (e) {}
  const args = [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
    '--hide-scrollbars', '--force-device-scale-factor=1',
    '--user-data-dir=' + udd,
    '--window-size=' + s.win,
    '--virtual-time-budget=4200',
    '--screenshot=' + file,
    urlBase + '?' + s.q
  ];
  const r = spawnSync(EDGE, args, { encoding: 'utf8', timeout: 60000 });
  const ok = fs.existsSync(file) && fs.statSync(file).size > 5000;
  if (!ok) bad++;
  const dim = pngSize(file);
  manifest.push({ name: s.name, ok, size: ok ? fs.statSync(file).size : 0, dim });
  console.log(`  [${ok ? 'OK' : 'XX'}] ${s.name}  ` +
    (ok ? (fs.statSync(file).size / 1024).toFixed(0) + 'KB' : 'fail') +
    (dim ? `  ${dim[0]}×${dim[1]}` : '') + (r.status ? `  exit=${r.status}` : ''));
}

fs.writeFileSync(path.join(OUT, 'v48_shots.json'), JSON.stringify(manifest, null, 2));
console.log(bad ? `\n!! ${bad} 张截图失败` : `\n${manifest.length} 张截图全部生成 → tools/out/`);
