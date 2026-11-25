/* 把 tools/glyph/letters_exact.json 的 26 个字母写进 js/levels.js 的 TANGRAM7 数据集。
 * 用法：node tools/build_letters_levels.js
 *
 * 只替换 chapter 2（id 20–45）那 26 关，其余章节不动；脚本幂等。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LV = path.join(ROOT, 'js', 'levels.js');
const EX = JSON.parse(fs.readFileSync(path.join(__dirname, 'glyph', 'letters_exact.json'), 'utf8'));
const ZL = require('./zodiac/lib.js');

const U = 96;
const LOCALP = {};
Object.keys(ZL.LOCAL).forEach(id => { LOCALP[id] = ZL.LOCAL[id].map(v => [v[0] * U, v[1] * U]); });
function piecePoly(st) {
  return LOCALP[st.id].map(v => {
    const r = ZL.rot(v, st.angle || 0, !!st.flipped);
    return [r[0] + st.x, r[1] + st.y];
  });
}
/* splitLines = 标准解内部共用边（两块板重合的那段边），提示档位 2/3 用 */
function splitLinesOf(polys) {
  const out = [], seen = {};
  const key = (a, b) => [a, b].map(v => v.map(n => Math.round(n * 2) / 2).join(',')).sort().join('|');
  for (let i = 0; i < polys.length; i++) {
    for (let j = i + 1; j < polys.length; j++) {
      const A = polys[i], B = polys[j];
      for (let ia = 0; ia < A.length; ia++) {
        const a0 = A[ia], a1 = A[(ia + 1) % A.length];
        const dx = a1[0] - a0[0], dy = a1[1] - a0[1], L2 = dx * dx + dy * dy;
        if (L2 < 1) continue;
        const len = Math.sqrt(L2);
        for (let ib = 0; ib < B.length; ib++) {
          const b0 = B[ib], b1 = B[(ib + 1) % B.length];
          const db0 = Math.abs(((b0[0] - a0[0]) * dy - (b0[1] - a0[1]) * dx) / len);
          const db1 = Math.abs(((b1[0] - a0[0]) * dy - (b1[1] - a0[1]) * dx) / len);
          if (db0 > 0.6 || db1 > 0.6) continue;
          const t0 = ((b0[0] - a0[0]) * dx + (b0[1] - a0[1]) * dy) / L2;
          const t1 = ((b1[0] - a0[0]) * dx + (b1[1] - a0[1]) * dy) / L2;
          const lo = Math.max(0, Math.min(t0, t1)), hi = Math.min(1, Math.max(t0, t1));
          if ((hi - lo) * len < 8) continue;
          const p0 = [a0[0] + dx * lo, a0[1] + dy * lo];
          const p1 = [a0[0] + dx * hi, a0[1] + dy * hi];
          const k = key(p0, p1);
          if (seen[k]) continue;
          seen[k] = 1;
          out.push([[Math.round(p0[0] * 100) / 100, Math.round(p0[1] * 100) / 100],
                    [Math.round(p1[0] * 100) / 100, Math.round(p1[1] * 100) / 100]]);
        }
      }
    }
  }
  return out;
}

const ORDER = ['T1', 'T2', 'T3', 'T4', 'T5', 'S', 'P'];
const r2 = v => Math.round(v * 100) / 100;
const levels = EX.map((fig, k) => {
  const name = fig.name;
  const sol = ORDER.map(id => {
    const p = fig.pieces.find(q => q.id === id);
    if (!p) throw new Error(name + ' 缺 ' + id);
    return { id, x: r2(p.x), y: r2(p.y), angle: p.ang, flipped: !!p.f };
  });
  return {
    id: 20 + k,
    chapter: 2,
    name,
    tip: '字母·七巧 · 七块板拼出大写 ' + name,
    outline: fig.outline.map(v => [r2(v[0]), r2(v[1])]),
    holes: fig.holes.map(h => h.map(v => [r2(v[0]), r2(v[1])])),
    solution: sol,
    splitLines: splitLinesOf(sol.map(piecePoly)),
    hintTier: 1,
    parTime: 90,
    parSteps: 18,
    needFlip: sol.some(s => s.flipped)
  };
});
if (levels.length !== 26) throw new Error('字母数 ' + levels.length);

/* ---------- 定位并替换 chapter 2 的 26 关 ---------- */
let src = fs.readFileSync(LV, 'utf8');
const head = '  {\n    "id": 20,\n    "chapter": 2,\n    "name": "A",';
const start = src.indexOf(head);
if (start < 0) throw new Error('找不到七巧板第 20 关（字母 A）');

function objEnd(s, from) {
  let d = 0, inStr = false, esc = false;
  for (let i = from; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{') d++;
    else if (c === '}') { d--; if (!d) return i; }
  }
  throw new Error('括号不配对');
}
/* 第 45 关 = 第 start 之后的第 26 个对象 */
/* 逐个对象往下走：objEnd 必须从对象的 '{' 开始数，否则会把嵌套的花括号数错 */
let pos = start, end = start;
for (let k = 0; k < 26; k++) {
  end = objEnd(src, pos);
  if (k === 25) break;
  const idPos = src.indexOf('"id": ' + (21 + k) + ',', end);
  if (idPos < 0) throw new Error('第 ' + (21 + k) + ' 关缺失');
  pos = src.lastIndexOf('{', idPos);
}
const oldLen = end - start + 1;
const block = levels.map(l => JSON.stringify(l, null, 2).split('\n').map(x => '  ' + x).join('\n')).join(',\n');
src = src.slice(0, start) + block + src.slice(end + 1);

fs.writeFileSync(LV, src);
console.log('替换 26 关（旧文本 ' + oldLen + ' 字符 → 新 ' + block.length + ' 字符）');
