/* v0.50 验收截图
 * 覆盖本轮六个反馈点的可见部分：
 *   ① 关卡页：几何 19 关 + 字母 26 关合成一章（可分页 + 纵向滚动）
 *   ② 新增几何图案（直角梯形 / 长六边形 / 盾形 / 纸飞机…）
 *   ③ 字母完成态：板与板之间不再有白缝，剪影不再露边
 *   ④ 金色提示：放对后消失（对照组 = 提示亮着）
 * 用法：node tools/shot_v50.js
 */
const path = require('path');
const { spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'out');
const EDGE = 'C://Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const urlBase = 'file:///' + path.join(ROOT, 'tools', 'harness.html').replace(/\\/g, '/');
const udd = process.env.TEMP + '\\edgeshot_v50';

const SHOTS = [
  { name: 'v50_levels_geo', q: 'set=tangram7&screen=levels&page=0&unlocked=19' },
  { name: 'v50_levels_letters', q: 'set=tangram7&screen=levels&page=1&unlocked=45' },
  { name: 'v50_levels_letters_scroll', q: 'set=tangram7&screen=levels&page=1&unlocked=45&lvscroll=420' },
  { name: 'v50_geo_trapezoid', q: 'set=tangram7&screen=play&level=10&placed=7' },
  { name: 'v50_geo_hexagon', q: 'set=tangram7&screen=play&level=13&placed=7' },
  { name: 'v50_geo_shield', q: 'set=tangram7&screen=play&level=18&placed=7' },
  { name: 'v50_letter_H', q: 'set=tangram7&screen=play&level=26&placed=7' },
  { name: 'v50_letter_Q', q: 'set=tangram7&screen=play&level=35&placed=7' },
  { name: 'v50_letter_H_dusk', q: 'set=tangram7&screen=play&level=26&placed=7&skin=dusk' },
  { name: 'v50_letter_A', q: 'set=tangram7&screen=play&level=19&placed=7' }
];

let n = 0;
for (const s of SHOTS) {
  const f = path.join(OUT, s.name + '.png');
  const r = spawnSync(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--force-device-scale-factor=2', '--user-data-dir=' + udd,
    '--window-size=750,1500', '--virtual-time-budget=4000',
    '--screenshot=' + f, urlBase + '?' + s.q], { encoding: 'utf8', timeout: 90000 });
  const ok = require('fs').existsSync(f);
  console.log((ok ? 'OK ' : 'XX ') + s.name + (ok ? '' : '  ' + (r.stderr || '').slice(-120)));
  if (ok) n++;
}
console.log(`截图 ${n}/${SHOTS.length} → tools/out/`);
