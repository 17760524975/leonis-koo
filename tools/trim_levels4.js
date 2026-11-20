/* v0.8：四巧板 120 关 → 30 关（2 简单 + 28 复杂且形状不雷同）
 *
 * 为什么不直接取原 61~120：build_levels.js 的 ds 里含 0.9*(长宽比-1) 与
 * 1.1*(1-紧凑度)，ds 越高越"细长/镂空"。直接取最难段会得到一堆细长斜条，
 * 缩略图几乎一样（用户反馈「都是相同逻辑的图案」）。所以这里改用
 * 「视觉复杂度」重新排序：
 *
 *   score = 2.0*凹角数 + 0.9*顶点数/2 − 2.5*max(0, 长宽比−2.0) − 1.5*max(0, 0.42−紧凑度)
 *
 * 即：转折多、凹角多、形状饱满优先，细长条重罚。再按形状指纹去重
 * （顶点数/凹角数/长宽比/紧凑度 四舍五入后相同视为同款），保证 28 关不雷同。
 *
 * 用法：node tools/trim_levels4.js
 */
const fs = require('fs');
const path = require('path');
const G = require('../js/geom.js');

const ROOT = path.join(__dirname, '..');
const FILE = path.join(ROOT, 'js/levels.js');
const SRC120 = path.join(ROOT, 'tools/levels_120_v071.js');   // v0.7.1 的 120 关原始数据（选关源）

const sandbox = {};
new Function('globalThis', fs.readFileSync(SRC120, 'utf8'))(sandbox);
const OLD = sandbox.TANGRAM_DATA.sets.tangram4.levels;
if (OLD.length !== 120) {
  console.error('备份应为 120 关，实际 ' + OLD.length + '，已中止');
  process.exit(1);
}

/* ---- 形状特征 ---- */
function features(lv) {
  const p = lv.outline;
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  for (const v of p) {
    minX = Math.min(minX, v[0]); maxX = Math.max(maxX, v[0]);
    minY = Math.min(minY, v[1]); maxY = Math.max(maxY, v[1]);
  }
  const w = maxX - minX, h = maxY - minY;
  const area = Math.abs(G.area(p));
  // 凹角：按多边形走向判定拐向，与主方向相反的即为凹角
  let reflex = 0, turn = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length], c = p[(i + 2) % p.length];
    const cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (cr > 1e-6) turn++; else if (cr < -1e-6) turn--;
    if (cr < -1e-6) reflex++;          // 顺时针轮廓下，负叉积为凹
  }
  if (turn > 0) reflex = p.length - reflex;   // 逆时针轮廓取反
  const asp = Math.max(w, h) / Math.max(1, Math.min(w, h));
  const fill = area / Math.max(1, w * h);
  return { w, h, asp, fill, nv: p.length, reflex, area };
}

const scored = OLD.map((lv, i) => {
  const f = features(lv);
  const score = 2.0 * f.reflex + 0.9 * f.nv / 2
    - 2.5 * Math.max(0, f.asp - 2.0) - 1.5 * Math.max(0, 0.42 - f.fill);
  return { lv, idx: i, f, score };
});

/* 最简单的两关：原 1、2（ds 最低，形状最规整） */
const easy = [scored[0], scored[1]];

/* 复杂候选：排除前两关，按 score 降序 */
const pool = scored.slice(2).sort((a, b) => b.score - a.score);
const seen = new Set();
easy.forEach(e => seen.add(sig(e)));
function sig(s) {
  return [s.f.nv, s.f.reflex, Math.round(s.f.asp * 10), Math.round(s.f.fill * 20)].join('|');
}

const chosen = easy.slice();
for (const c of pool) {
  if (chosen.length >= 30) break;
  if (seen.has(sig(c))) continue;         // 同款形状跳过
  seen.add(sig(c));
  chosen.push(c);
}
/* 指纹过滤后不足 30 关时（理论上不会），按分数补满 */
for (const c of pool) {
  if (chosen.length >= 30) break;
  if (chosen.indexOf(c) < 0) chosen.push(c);
}
/* 难度仍按原 ds 升序排（= 原 id 升序），保证曲线递增 */
chosen.sort((a, b) => a.idx - b.idx);

/* ---- 重编号 ---- */
const CHAP_PER = 10;
const levels = chosen.map((c, i) => {
  const lv = c.lv;
  const o = { id: i + 1, chapter: Math.floor(i / CHAP_PER) + 1 };
  o.name = lv.name || '';
  o.tip = lv.tip || '';
  o.outline = lv.outline;
  o.solution = lv.solution;
  o.parTime = lv.parTime;
  o.parSteps = lv.parSteps;
  if (lv.needFlip) o.needFlip = true;
  return o;
});

const body = levels.map(o => '    ' + JSON.stringify(o, null, 2).replace(/\n/g, '\n    ')).join(',\n');
const arr = '  var LEVELS = [\n' + body + '\n  ];\n';

const src = fs.readFileSync(FILE, 'utf8');
const START = '  var LEVELS = [';
const s = src.indexOf(START);
const e = src.indexOf('\n  ];\n', s);
if (s < 0 || e < 0) { console.error('找不到 LEVELS 数组边界，已中止'); process.exit(1); }
let out = src.slice(0, s) + arr + src.slice(e + '\n  ];\n'.length);

out = out.replace(
  "chapNames: ['热身', '进阶', '大师']",
  "chapNames: ['热身', '进阶', '大师']"
);
fs.writeFileSync(FILE, out);

console.log('已写入 ' + FILE + '\n');
console.log('新id 旧id  长宽比 紧凑度 顶点 凹角  分数   用时');
levels.forEach((lv, i) => {
  const c = chosen[i];
  console.log(String(lv.id).padStart(3) + '  ' + String(c.lv.id).padStart(3) + '  ' +
    c.f.asp.toFixed(2).padStart(6) + ' ' + c.f.fill.toFixed(2).padStart(6) + ' ' +
    String(c.f.nv).padStart(4) + ' ' + String(c.f.reflex).padStart(4) + ' ' +
    c.score.toFixed(1).padStart(6) + '  ' + lv.parTime + 's');
});
const all = levels.map((_, i) => chosen[i].f);
console.log('\n平均长宽比 ' + (all.reduce((s, f) => s + f.asp, 0) / all.length).toFixed(2) +
  '，平均紧凑度 ' + (all.reduce((s, f) => s + f.fill, 0) / all.length).toFixed(2) +
  '，平均凹角 ' + (all.reduce((s, f) => s + f.reflex, 0) / all.length).toFixed(1));
