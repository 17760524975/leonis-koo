/* v0.47 验收截图：深色皮肤（夜间护眼）下的全浮层配色审查
 *
 * 用法：node tools/shot_v47.js
 *
 * 为什么要有这一组：v0.38 的深色皮肤只覆盖了「卡片 / 底纹 / 按钮」这些走
 * COL.* 的部分，而排行榜行、页签、设置页资料卡、倒计时胶囊这些是**写死的浅色**，
 * 深色下一压就变成「白字压白底」。这组截图就是逐屏看一遍有没有同类问题。
 *
 * 每屏拍 2 张：skin=warm（浅色基准，用来对照「改动前后观感有没有变」）
 * 与 skin=dusk（夜景），同名不同后缀。
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'out');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const urlBase = 'file:///' + path.join(ROOT, 'tools', 'harness.html').replace(/\\/g, '/');

/* 审查用尺寸：750×1624 是设计基准，文字按 1:1 像素落位，最容易看出压色 */
const WIN = '750,1624';

const SCREENS = [
  /* name            额外参数 */
  ['home',        'set=tangram4&screen=home'],
  ['levels',      'set=tangram4&screen=levels&page=1&unlocked=36'],
  ['play',        'set=tangram4&screen=play&level=30&placed=2'],
  ['result',      'set=tangram4&screen=result&level=30'],
  ['rank_main',   'set=tangram4&screen=rank&ranklive=1&profile=wx'],
  ['rank_streak', 'set=tangram4&screen=rank&ranklive=1&profile=wx&tab=1'],
  ['rank_friend', 'set=tangram4&screen=rank&friendmock=1&ranklive=1&profile=wx'],
  ['rank_err',    'set=tangram4&screen=rank&rankerr=1'],
  ['settings',    'set=tangram4&screen=settings&profile=custom&net=1'],
  ['hintpanel',   'set=tangram4&screen=hintpanel&level=3'],
  ['fail',        'set=tangram4&screen=fail&level=3'],
  ['energy',      'set=tangram4&screen=energy&coin=168&energy=12'],
  ['online',      'set=tangram4&screen=online&online=620&items=2'],
  ['invite',      'set=tangram4&screen=invite&ic=5&ip=1'],
  ['skin',        'set=tangram4&screen=skin&skintab=0'],
  ['buy',         'set=tangram4&screen=buy&buy=pstyle:neon&coin=168']
];

const SKINS = ['warm', 'dusk'];

function pngSize(file) {
  try {
    const b = fs.readFileSync(file);
    if (b.slice(1, 4).toString() !== 'PNG') return null;
    return [b.readUInt32BE(16), b.readUInt32BE(20)];
  } catch (e) { return null; }
}

if (!fs.existsSync(EDGE)) { console.log('找不到 Edge: ' + EDGE); process.exit(1); }
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
const udd = path.join(os.tmpdir(), 'v47_edge_' + process.pid);
fs.mkdirSync(udd, { recursive: true });

let bad = 0;
const manifest = [];
for (const skin of SKINS) {
  console.log('\n== skin=' + skin + ' ==');
  for (const [name, q] of SCREENS) {
    const file = path.join(OUT, 'v47_' + skin + '_' + name + '.png');
    try { fs.unlinkSync(file); } catch (e) {}
    const args = [
      '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
      '--hide-scrollbars', '--force-device-scale-factor=1',
      '--user-data-dir=' + udd,
      '--window-size=' + WIN,
      '--virtual-time-budget=4200',
      '--screenshot=' + file,
      urlBase + '?' + q + '&skin=' + skin
    ];
    const r = spawnSync(EDGE, args, { encoding: 'utf8', timeout: 60000 });
    const ok = fs.existsSync(file) && fs.statSync(file).size > 5000;
    if (!ok) bad++;
    const dim = pngSize(file);
    manifest.push({ skin, name, ok, size: ok ? fs.statSync(file).size : 0, dim });
    console.log(`  [${ok ? 'OK' : 'XX'}] ${name}  ` +
      (ok ? (fs.statSync(file).size / 1024).toFixed(0) + 'KB' : 'fail') +
      (dim ? `  ${dim[0]}×${dim[1]}` : '') + (r.status ? `  exit=${r.status}` : ''));
  }
}

fs.writeFileSync(path.join(OUT, 'v47_shots.json'), JSON.stringify(manifest, null, 2));
console.log(bad ? `\n!! ${bad} 张截图失败` : `\n${manifest.length} 张截图全部生成 → tools/out/`);
