/* 包体体检：node tools/audit_package.js
 *
 * 扫 miniprogram/（小游戏上传目录），按「类型 / 目录 / 单文件」三个维度给出占用，
 * 并按微信小游戏的包体规则算余量：
 *   主包 ≤ 4MB，主包 + 分包 ≤ 30MB，普通分包不限单个大小（官方文档 2024 起）。
 *
 * 结论口径：
 *   · 这里统计的是**磁盘文件体积**，实际以上传预览为准 —— *.js 会被编译（ES6→ES5），
 *     体积可能与源文件不同；带上 sourcemap 时上传体积另算；
 *   · cloudfunctions/ 是云函数目录（cloudfunctionRoot），不进入小游戏代码包，已排除。
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PKG = path.join(ROOT, 'miniprogram');
const MAIN_LIMIT = 4 * 1024 * 1024;
const TOTAL_LIMIT = 30 * 1024 * 1024;

/* 不进入代码包的目录 */
const EXCLUDE_DIRS = ['cloudfunctions', '.cloudbase', '.git'];

function walk(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    if (EXCLUDE_DIRS.indexOf(name) >= 0) continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push({ path: p, rel: path.relative(PKG, p).replace(/\\/g, '/'), size: st.size });
  }
  return out;
}

const files = walk(PKG, []);
const total = files.reduce((a, f) => a + f.size, 0);
const kb = n => (n / 1024).toFixed(1) + ' KB';
const mb = n => (n / 1048576).toFixed(2) + ' MB';

/* ---------- 分类 ---------- */
function cat(rel) {
  if (/^assets\/audio\//.test(rel)) return /^assets\/audio\/bgm_/.test(rel) ? '音频 · BGM' : '音频 · 音效';
  if (/^assets\/img\//.test(rel)) return '图片';
  if (/^js\/levels\.js$/.test(rel)) return '代码 · 关卡数据';
  if (/^js\/core\.js$/.test(rel)) return '代码 · 渲染/玩法核心';
  if (/^js\/config\.js$/.test(rel)) return '代码 · 配置表';
  if (/^js\//.test(rel) || /^game\.js$/.test(rel) || /^openDataContext\//.test(rel)) return '代码 · 其他';
  return '配置/杂项';
}

const byCat = {};
files.forEach(f => {
  const c = cat(f.rel);
  byCat[c] = byCat[c] || { size: 0, n: 0 };
  byCat[c].size += f.size;
  byCat[c].n++;
});

console.log('== 小游戏代码包（miniprogram/） ==');
console.log('文件数 ' + files.length + '，总体积 ' + mb(total) + '（' + kb(total) + '）');
console.log('主包上限 ' + mb(MAIN_LIMIT) + ' → 已用 ' + (total / MAIN_LIMIT * 100).toFixed(1) +
  '%，余量 ' + mb(MAIN_LIMIT - total));

console.log('\n-- 按类型 --');
Object.keys(byCat).sort((a, b) => byCat[b].size - byCat[a].size).forEach(c => {
  const v = byCat[c];
  console.log('  ' + c.padEnd(22, ' ') + kb(v.size).padStart(10) + '  ' +
    String(v.n).padStart(3) + ' 个  ' + (v.size / total * 100).toFixed(1) + '%');
});

console.log('\n-- 单文件 Top 12 --');
files.slice().sort((a, b) => b.size - a.size).slice(0, 12).forEach(f => {
  console.log('  ' + kb(f.size).padStart(10) + '  ' + f.rel);
});

/* ---------- 关卡数据的单价 ---------- */
require(path.join(ROOT, 'js/levels.js'));
const SETS = globalThis.TANGRAM_SETS;
let lvN = 0;
Object.keys(SETS).forEach(k => { lvN += SETS[k].levels.length; });
const levelsBytes = files.find(f => f.rel === 'js/levels.js').size;
console.log('\n-- 关卡数据单价 --');
console.log('  ' + lvN + ' 关 / ' + kb(levelsBytes) + ' → 每关 ' + (levelsBytes / lvN / 1024).toFixed(2) + ' KB');
const compact = Object.keys(SETS).map(k => {
  const o = { levels: SETS[k].levels, dataset: SETS[k].dataset, tray: SETS[k].tray, snapGrid: SETS[k].snapGrid };
  return JSON.stringify(o).length;
}).reduce((a, b) => a + b, 0);
console.log('  紧凑 JSON（去缩进/换行）约 ' + kb(compact) + '，可再省 ' + kb(levelsBytes - compact));

/* ---------- 瘦身情景 ---------- */
const bgm = files.filter(f => /^assets\/audio\/bgm_/.test(f.rel)).reduce((a, f) => a + f.size, 0);
const sfx = files.filter(f => /^assets\/audio\/sfx_/.test(f.rel)).reduce((a, f) => a + f.size, 0);
const img = files.filter(f => /^assets\/img\//.test(f.rel)).reduce((a, f) => a + f.size, 0);
const coreSrc = fs.readFileSync(path.join(ROOT, 'js/core.js'), 'utf8');
const jsBytes = files.filter(f => /\.js$/.test(f.rel)).reduce((a, f) => a + f.size, 0);

console.log('\n-- 瘦身情景（主包体积） --');
const rows = [
  ['现状', total, ''],
  ['P0 BGM 移出主包（分包 / 云存储）', total - bgm, '−' + mb(bgm)],
  ['P0+P1 再把 JS 压到 55%（去注释+缩进+关卡紧凑）', total - bgm - jsBytes * 0.45, '−' + mb(jsBytes * 0.45)],
  ['P0+P1+P2 图片转 JPEG/WebP（约 −50%）', total - bgm - jsBytes * 0.45 - img * 0.5, '−' + mb(img * 0.5)]
];
rows.forEach(r => {
  const rest = (MAIN_LIMIT - r[1]) / 1048576;
  console.log('  ' + r[0].padEnd(46, ' ') + mb(r[1]).padStart(8) + '  余量 ' + rest.toFixed(2) +
    ' MB  ' + (r[2] ? '(' + r[2] + ')' : ''));
});

console.log('\n-- 换算：余量能装多少关 --');
const perLv = levelsBytes / lvN;
rows.forEach(r => {
  const room = MAIN_LIMIT - r[1];
  console.log('  ' + r[0].slice(0, 30).padEnd(32, ' ') + '≈ ' + Math.floor(room / perLv) + ' 关');
});

console.log('\n提示：主包上限 4MB / 主包+分包 30MB，以上为磁盘体积估算，实际以上传预览为准。');
