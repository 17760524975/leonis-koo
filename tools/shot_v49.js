/* v0.49 验收截图：深色主题下的「浅底白字」+ 失败页进场动画
 * 用法：node tools/shot_v49.js
 *
 * 覆盖：
 *   · 排行榜在 夜间护眼(dusk) / 暖木(warm) / 星夜特效(stars) 三种深色环境下的可读性
 *   · 设置页资料卡（昵称 / 状态 / 改昵称）在 dusk 下的可读性
 *   · 主页 HUD 胶囊 / 桌面工具条在 dusk 下不再是浅底
 *   · 失败页进场动画四个定格：0ms(红闪) / 520ms(心飞中) / 980ms(卡片落位) / 1300ms(完整)
 *   · 对照：同一关的 warm 皮肤静态版（颜色对得上，布局不变）
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
  { name: 'v49_rank_dusk', w: 750, q: 'screen=rank&ranklive=1&skin=dusk&notoast=1' },
  { name: 'v49_rank_warm', w: 750, q: 'screen=rank&ranklive=1&skin=warm&notoast=1' },
  { name: 'v49_rank_stars', w: 750, q: 'screen=rank&ranklive=1&bgfx=stars&notoast=1' },
  { name: 'v49_rank_dusk_streak', w: 750, q: 'screen=rank&ranklive=1&skin=dusk&tab=1&notoast=1' },
  { name: 'v49_settings_dusk', w: 750, q: 'screen=settings&skin=dusk&net=1&notoast=1' },
  { name: 'v49_home_dusk', w: 750, q: 'screen=home&skin=dusk&notoast=1' },
  { name: 'v49_play_dusk', w: 750, q: 'screen=play&skin=dusk&level=5&placed=2&notoast=1' },
  { name: 'v49_fail_t0', w: 750, q: 'screen=fail&skin=dusk&failT=0&freezeFail=1&notoast=1' },
  { name: 'v49_fail_t520', w: 750, q: 'screen=fail&skin=dusk&failT=520&freezeFail=1&notoast=1' },
  { name: 'v49_fail_t980', w: 750, q: 'screen=fail&skin=dusk&failT=980&freezeFail=1&notoast=1' },
  { name: 'v49_fail_t1300', w: 750, q: 'screen=fail&skin=dusk&failT=1300&freezeFail=1&notoast=1' },
  { name: 'v49_fail_warm_t1300', w: 750, q: 'screen=fail&skin=warm&failT=1300&freezeFail=1&notoast=1' },
  /* 「其他地方有没有类似问题」：把深色下每一个弹层都拍一遍 */
  { name: 'v49_levels_dusk', w: 750, q: 'screen=levels&skin=dusk&notoast=1' },
  { name: 'v49_result_dusk', w: 750, q: 'screen=result&skin=dusk&level=5&notoast=1' },
  { name: 'v49_hint_dusk', w: 750, q: 'screen=hint&skin=dusk&level=5&items=2&notoast=1' },
  { name: 'v49_hintpanel_dusk', w: 750, q: 'screen=hintpanel&skin=dusk&notoast=1' },
  { name: 'v49_skin_dusk', w: 750, q: 'screen=skin&skin=dusk&notoast=1' },
  { name: 'v49_online_dusk', w: 750, q: 'screen=online&skin=dusk&notoast=1' },
  { name: 'v49_invite_dusk', w: 750, q: 'screen=invite&skin=dusk&notoast=1' },
  { name: 'v49_energy_dusk', w: 750, q: 'screen=energy&skin=dusk&notoast=1' },
  { name: 'v49_rank_dusk_err', w: 750, q: 'screen=rank&skin=dusk&rankerr=1&notoast=1' }
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
const udd = path.join(os.tmpdir(), 'v49_edge_' + process.pid);
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
    s.url || (urlBase + '?' + s.q)
  ];
  const r = spawnSync(EDGE, args, { encoding: 'utf8', timeout: 60000 });
  const ok = fs.existsSync(file) && fs.statSync(file).size > 5000;
  const sz = ok ? pngSize(file) : null;
  console.log(`  [${ok ? 'OK' : 'XX'}] ${s.name}  ${sz ? sz.join('x') : (r.stderr || '').slice(0, 160)}`);
  if (!ok) bad++;
  else manifest.push({ name: s.name, q: s.q, size: sz });
}
try { fs.rmSync(udd, { recursive: true, force: true }); } catch (e) {}
fs.writeFileSync(path.join(OUT, 'v49_manifest.json'), JSON.stringify(manifest, null, 2));
console.log(bad === 0 ? `\nv0.49 截图 ${manifest.length} 张全部生成 → tools/out/`
  : `\n!! ${bad} 张失败`);
process.exit(bad === 0 ? 0 : 1);
