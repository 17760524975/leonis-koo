/* 包体体检：node tools/audit_package.js
 *
 * 扫 miniprogram/（小游戏上传目录），**按 game.json 的 subpackages 拆主包 / 分包**，
 * 按「类型 / 单文件」给出占用，并按微信小游戏的规则算余量：
 *   主包 ≤ 4MB，主包 + 全部分包 ≤ 30MB，单个普通分包不限大小。
 *
 * 结论口径：
 *   · 这里统计的是**磁盘文件体积**，实际以上传预览为准 —— *.js 会被编译（ES6→ES5），
 *     `uploadWithSourceMap: true` 还会另传一份 map；
 *   · cloudfunctions/ 是云函数目录（cloudfunctionRoot），不进入小游戏代码包，已排除；
 *   · 分级判断用 game.json 的 subpackages[].root（目前只有 audio-pkg/）。
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

const gameJson = JSON.parse(fs.readFileSync(path.join(PKG, 'game.json'), 'utf8'));
const SUBS = (gameJson.subpackages || gameJson.subPackages || []).map(s => ({
  name: s.name, root: String(s.root || '').replace(/^\.?\//, '').replace(/\/?$/, '/')
}));

function subOf(rel) {
  for (const s of SUBS) { if (rel.indexOf(s.root) === 0) return s; }
  return null;
}

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

const all = walk(PKG, []);
all.forEach(f => { f.sub = subOf(f.rel); });
const main = all.filter(f => !f.sub);
const totalMain = main.reduce((a, f) => a + f.size, 0);
const totalAll = all.reduce((a, f) => a + f.size, 0);
const kb = n => (n / 1024).toFixed(1) + ' KB';
const mb = n => (n / 1048576).toFixed(2) + ' MB';
const pct = (a, b) => (a / b * 100).toFixed(1) + '%';

/* ---------- 分类 ---------- */
function cat(rel) {
  if (/^assets\/audio\//.test(rel)) return /bgm_/.test(rel) ? '音频 · BGM' : '音频 · 音效';
  if (/^assets\/img\//.test(rel)) return '图片';
  if (/^js\/levels\.js$/.test(rel)) return '代码 · 关卡数据';
  if (/^js\/core\.js$/.test(rel)) return '代码 · 渲染/玩法核心';
  if (/^js\/config\.js$/.test(rel)) return '代码 · 配置表';
  if (/^js\//.test(rel) || /^game\.js$/.test(rel) || /^openDataContext\//.test(rel)) return '代码 · 其他';
  return '配置/杂项';
}

const byCat = {};
main.forEach(f => {
  const c = cat(f.rel);
  byCat[c] = byCat[c] || { size: 0, n: 0 };
  byCat[c].size += f.size;
  byCat[c].n++;
});

console.log('== 小游戏代码包（miniprogram/） ==');
console.log('主包 ' + main.length + ' 个文件，' + mb(totalMain) + '（' + kb(totalMain) + '）' +
  '  → 上限 ' + mb(MAIN_LIMIT) + '，已用 ' + pct(totalMain, MAIN_LIMIT) +
  '，余量 ' + mb(MAIN_LIMIT - totalMain));
SUBS.forEach(s => {
  const fs2 = all.filter(f => f.sub && f.sub.name === s.name);
  const sz = fs2.reduce((a, f) => a + f.size, 0);
  console.log('分包 ' + s.name.padEnd(8, ' ') + '(' + s.root + ') ' + fs2.length + ' 个文件，' + mb(sz));
});
console.log('全包合计 ' + mb(totalAll) + ' / 上限 ' + mb(TOTAL_LIMIT) + '（' + pct(totalAll, TOTAL_LIMIT) + '）');

console.log('\n-- 主包按类型 --');
Object.keys(byCat).sort((a, b) => byCat[b].size - byCat[a].size).forEach(c => {
  const v = byCat[c];
  console.log('  ' + c.padEnd(22, ' ') + kb(v.size).padStart(10) + '  ' +
    String(v.n).padStart(3) + ' 个  ' + pct(v.size, totalMain));
});

console.log('\n-- 主包单文件 Top 12 --');
main.slice().sort((a, b) => b.size - a.size).slice(0, 12).forEach(f => {
  console.log('  ' + kb(f.size).padStart(10) + '  ' + f.rel);
});

/* ---------- 关卡数据的单价 ---------- */
require(path.join(ROOT, 'js/levels.js'));
const SETS = globalThis.TANGRAM_SETS;
let lvN = 0;
Object.keys(SETS).forEach(k => { lvN += SETS[k].levels.length; });
const lvFile = main.find(f => f.rel === 'js/levels.js') || { size: 0 };
const perLv = lvFile.size / Math.max(1, lvN);
console.log('\n-- 关卡数据单价（打包后） --');
console.log('  ' + lvN + ' 关 / ' + kb(lvFile.size) + ' → 每关 ' + (perLv / 1024).toFixed(2) + ' KB');

/* ---------- 余量换算 ---------- */
console.log('\n-- 主包余量还能装多少关 --');
const room = MAIN_LIMIT - totalMain;
console.log('  ' + kb(room) + ' 余量 ≈ ' + Math.floor(room / perLv) + ' 关（每关 ' + (perLv / 1024).toFixed(2) + ' KB）');

/* ---------- 超限提醒 ---------- */
let over = 0;
if (totalMain > MAIN_LIMIT) { console.log('\n[XX] 主包超限 ' + mb(totalMain - MAIN_LIMIT)); over++; }
if (totalAll > TOTAL_LIMIT) { console.log('\n[XX] 主包+分包超限 ' + mb(totalAll - TOTAL_LIMIT)); over++; }
if (!SUBS.length) console.log('\n[!!] game.json 未声明 subpackages —— BGM 会全部算进主包');
console.log('\n提示：磁盘体积，实际以上传预览为准（js 会编译、sourcemap 另算）。');
process.exit(over ? 1 : 0);
