/* 把 tools/letters7/letters_levels.json 里的 26 个字母并进 js/levels.js 的 LEVELS7
 *
 * 只动三处：
 *   1) LEVELS7 数组里 chapter:2 的部分整体替换成新的 26 关（id 11..36）
 *   2) chapNames / chapTitles 补到 4 章（几何 10 关 + 字母 26 关，按 10 关/章分页）
 *   3) completeSub 的关卡总数文案
 * 用法：node tools/letters7/emit_levels.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const LVFILE = path.join(__dirname, 'letters_levels.json');
const TARGET = path.join(ROOT, 'js', 'levels.js');

const letters = JSON.parse(fs.readFileSync(LVFILE, 'utf8')).filter(r => r.ok);
if (letters.length !== 26) throw new Error('字母数据不足 26 个：' + letters.length);

const ORDER = ['T1', 'T2', 'T3', 'S', 'T4', 'T5', 'P'];

let src = fs.readFileSync(TARGET, 'utf8');
const MARK = 'var LEVELS7 = ';
const at = src.indexOf(MARK);
if (at < 0) throw new Error('找不到 LEVELS7');
const open = src.indexOf('[', at);
let depth = 0, close = open;
for (let i = open; i < src.length; i++) {
  const c = src[i];
  if (c === '[') depth++;
  else if (c === ']') { depth--; if (depth === 0) { close = i + 1; break; } }
}
const oldArr = JSON.parse(src.slice(open, close));
const kept = oldArr.filter(l => l.chapter !== 2);
console.log('原有：ch1', kept.length, '关；丢弃 ch2', oldArr.length - kept.length, '关');

const fresh = letters.map((r, i) => {
  const sol = r.solution.slice().sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
  const lv = {
    id: 11 + i,
    chapter: 2,
    name: r.ch,
    tip: '字母·七巧 · 七块板拼出大写 ' + r.ch,
    outline: r.outline.map(v => [Math.round(v[0] * 100) / 100, Math.round(v[1] * 100) / 100]),
  };
  if (r.holes && r.holes.length) {
    lv.holes = r.holes.map(h => h.map(v => [Math.round(v[0] * 100) / 100, Math.round(v[1] * 100) / 100]));
  }
  lv.solution = sol;
  lv.splitLines = r.splitLines;
  lv.hintTier = 1;
  lv.parTime = 90;
  lv.parSteps = 18;
  lv.needFlip = !!r.needFlip;
  return lv;
});

const arr = kept.concat(fresh);
src = src.slice(0, open) + JSON.stringify(arr, null, 2) + src.slice(close);

// 章节：10 关/章 → 几何(1-10) / 字母A-J(11-20) / K-T(21-30) / U-Z(31-36)
const rep = [
  ['chapNames: ["几何·入门","字母·七巧"], chapTitles: ["几何","字母"]',
   'chapNames: ["几何·入门","字母·A–J","字母·K–T","字母·U–Z"], chapTitles: ["几何","字母","字母","字母"]'],
  ["completeSub: '全部 18 关已通关'", "completeSub: '全部 36 关已通关'"],
  ['chapPer: 10,\n      chapNames', 'chapPer: 10,\n      chapNames'],
];
for (const [a, b] of rep) {
  if (a === b) continue;
  if (!src.includes(a)) throw new Error('未找到待替换片段：' + a.slice(0, 40));
  src = src.replace(a, b);
}

fs.writeFileSync(TARGET, src, 'utf8');
console.log('写入', TARGET, '总关卡', arr.length,
  '| ch1', arr.filter(l => l.chapter === 1).length, 'ch2', arr.filter(l => l.chapter === 2).length);
