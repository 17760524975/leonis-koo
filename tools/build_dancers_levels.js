/* 把 tools/dancer/dancers_exact.json 的 10 个舞者写进 js/levels.js
 * 用法：node tools/build_dancers_levels.js
 *
 * 写入内容：
 *   1) LEVELS7 末尾追加 10 关（id 58..67，chapter = 4）
 *   2) TANGRAM_SETS.tangram7.chapters 追加「舞者」章（from 58, count 10）
 *   3) chapNames / chapTitles 同步追加
 *   4) completeSub 改为「全部 67 关已通关」
 * 幂等：重复执行会先删掉上次追加的舞者关再重写。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LV = path.join(ROOT, 'js', 'levels.js');
const EX = JSON.parse(fs.readFileSync(path.join(__dirname, 'dancer', 'dancers_exact.json'), 'utf8'));

const FIRST_ID = 58;
const U = 96;
const r2 = v => Math.round(v * 100) / 100;

/* 板件局部坐标：与生成时完全同一套（geom.makeLocal 的质心原点约定） */
require(path.join(ROOT, 'js', 'geom.js'));
const G = globalThis.TANGRAM_GEOM;
const BASE = {
  T1: [[0, 0], [4, 0], [2, 2]], T2: [[0, 0], [4, 0], [2, 2]],
  T3: [[0, 0], [2, 0], [0, 2]],
  S: [[1, 0], [2, 1], [1, 2], [0, 1]],
  T4: [[0, 0], [2, 0], [1, 1]], T5: [[0, 0], [2, 0], [1, 1]],
  P: [[1, 0], [3, 0], [2, 1], [0, 1]]
};
const LOCAL = {};
Object.keys(BASE).forEach(k => { LOCAL[k] = G.makeLocal(BASE[k].map(v => [v[0] * U, v[1] * U])); });

function piecePoly(st) {
  return G.toWorld(LOCAL[st.id], { x: st.x, y: st.y, angle: st.angle, flipped: st.flipped });
}

/* splitLines = 标准解内部共用边（提示档位 2/3 用） */
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
        const L = Math.sqrt(L2);
        for (let ib = 0; ib < B.length; ib++) {
          const b0 = B[ib], b1 = B[(ib + 1) % B.length];
          const db0 = Math.abs(((b0[0] - a0[0]) * dy - (b0[1] - a0[1]) * dx) / L);
          const db1 = Math.abs(((b1[0] - a0[0]) * dy - (b1[1] - a0[1]) * dx) / L);
          if (db0 > 1.2 || db1 > 1.2) continue;
          const t0 = ((b0[0] - a0[0]) * dx + (b0[1] - a0[1]) * dy) / L2;
          const t1 = ((b1[0] - a0[0]) * dx + (b1[1] - a0[1]) * dy) / L2;
          const lo = Math.max(0, Math.min(t0, t1)), hi = Math.min(1, Math.max(t0, t1));
          if ((hi - lo) * L < 8) continue;
          const p0 = [a0[0] + dx * lo, a0[1] + dy * lo];
          const p1 = [a0[0] + dx * hi, a0[1] + dy * hi];
          const k = key(p0, p1);
          if (seen[k]) continue;
          seen[k] = 1;
          out.push([[r2(p0[0]), r2(p0[1])], [r2(p1[0]), r2(p1[1])]]);
        }
      }
    }
  }
  return out;
}

/* ---------- 1. 生成 10 关 ---------- */
/* 板件尺寸是全局固定的（unitScale = 96），所以只能整体平移，不能缩放。
 * 原 57 关的包围盒整体是 x 28..972 / y 116..884，中心恰好在 (500,500)，
 * 这里对齐同一套约定，保证落进 1000x1000 归一化坐标系里。 */
const CX = 500, CY = 500;

const levels = EX.map((fig, k) => {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  fig.outline.forEach(v => { x0 = Math.min(x0, v[0]); y0 = Math.min(y0, v[1]); x1 = Math.max(x1, v[0]); y1 = Math.max(y1, v[1]); });
  const dx = CX - (x0 + x1) / 2, dy = CY - (y0 + y1) / 2;

  const sol = fig.pieces.map(p => ({
    id: p.id,
    x: r2(p.x + dx), y: r2(p.y + dy),
    angle: p.angle, flipped: !!p.flipped
  }));
  const ids = sol.map(s => s.id).sort().join(',');
  if (ids !== 'P,S,T1,T2,T3,T4,T5') throw new Error(fig.name + ' 板块不全: ' + ids);

  const outline = fig.outline.map(v => [r2(v[0] + dx), r2(v[1] + dy)]);
  const holes = (fig.holes || []).map(h => h.map(v => [r2(v[0] + dx), r2(v[1] + dy)]));
  const polys = sol.map(piecePoly);

  return {
    id: FIRST_ID + k,
    chapter: 4,
    name: fig.name,
    tip: '舞者·十姿 · ' + fig.tip,
    outline,
    solution: sol,
    splitLines: splitLinesOf(polys),
    holes,
    hintTier: 1,
    parTime: 100,
    parSteps: 20,
    needFlip: sol.some(s => s.flipped)
  };
});

/* ---------- 2. 读 levels.js ---------- */
let src = fs.readFileSync(LV, 'utf8').replace(/\r\n/g, '\n');

const MK_B = '/* ==== DANCER_LEVELS_BEGIN ==== */';
const MK_E = '/* ==== DANCER_LEVELS_END ==== */';
{
  const i = src.indexOf(MK_B);
  if (i >= 0) {
    const j = src.indexOf(MK_E);
    if (j < 0) throw new Error('舞者注入块不完整，请手工检查');
    let from = i;
    while (from > 0 && /\s/.test(src[from - 1])) from--;
    if (src[from - 1] === ',') from--;
    src = src.slice(0, from) + src.slice(j + MK_E.length);
    console.log('已移除旧的舞者注入块');
  }
}
src = src.replace(/,\s*\{ name: '舞者·十姿', title: '舞者', from: \d+, count: \d+ \}/g, '');

/* ---------- 3. 插到 LEVELS7 末尾 ---------- */
const tagI = src.indexOf('两套数据集并存：core.js');
if (tagI < 0) throw new Error('找不到 TANGRAM_SETS 注释锚点');
const ai = src.lastIndexOf('];', tagI);
if (ai < 0) throw new Error('找不到 LEVELS7 结尾的 ];');
const block = ',\n' + MK_B + '\n  /* v0.64：舞者十关，由 tools/dancer/ 从参考图反解得到（见 docs/v0.64-舞者关卡.md） */\n' +
  levels.map(l => '  ' + JSON.stringify(l)).join(',\n') + '\n' + MK_E;
src = src.slice(0, ai) + block + src.slice(ai);

/* ---------- 4. 章节表 ---------- */
const newChap = "{ name: '舞者·十姿', title: '舞者', from: " + FIRST_ID + ", count: " + levels.length + " }";
const chapAnchor = "{ name: '生肖·十二', title: '生肖', from: 46, count: 12 }";
if (!src.includes(chapAnchor)) throw new Error('找不到生肖章节锚点');
src = src.replace(chapAnchor, chapAnchor + ',\n        ' + newChap);

src = src.replace(/chapNames: \["几何·入门","字母·A–Z","生肖·十二"\]/, 'chapNames: ["几何·入门","字母·A–Z","生肖·十二","舞者·十姿"]');
src = src.replace(/chapTitles: \["几何","字母","生肖"\]/, 'chapTitles: ["几何","字母","生肖","舞者"]');

const total = FIRST_ID + levels.length - 1;
src = src.replace(/completeSub: '全部 \d+ 关已通关'/, "completeSub: '全部 " + total + " 关已通关'");

fs.writeFileSync(LV, src);
console.log('已写入 ' + levels.length + ' 关（id ' + FIRST_ID + '–' + total + '），章节 from=' + FIRST_ID +
  '，completeSub 改为「全部 ' + total + ' 关已通关」');
