/* 把 tools/zodiac/zodiac_exact.json 的 12 个生肖写进 js/levels.js 的 TANGRAM7 数据集。
 * 用法：node tools/build_zodiac_levels.js
 *
 * 写入内容：
 *   1) LEVELS7 末尾追加 12 关（id 46..57，chapter = 3）
 *   2) TANGRAM_SETS.tangram7.chapters 追加「生肖」章（from 46, count 12）
 *   3) chapNames 同步追加一项（旧规则兜底时也不会错位）
 *   4) completeSub 改为「全部 57 关已通关」
 * 这个脚本是幂等的：重复执行会先删掉上次追加的生肖关再重写。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LV = path.join(ROOT, 'js', 'levels.js');
const EX = JSON.parse(fs.readFileSync(path.join(__dirname, 'zodiac', 'zodiac_exact.json'), 'utf8'));

const NAMES = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
const TIPS = {
  鼠: '尖嘴长尾 · 小老鼠', 牛: '双角低首 · 老黄牛', 虎: '昂首翘尾 · 猛虎',
  兔: '长耳直立 · 小兔',   龙: '长身昂首 · 游龙',   蛇: '盘曲蜿蜒 · 蛇',
  马: '昂首扬蹄 · 奔马',   羊: '弯角侧立 · 山羊',   猴: '攀枝挠腮 · 猴',
  鸡: '高冠翘尾 · 公鸡',   狗: '伏身竖耳 · 狗',     猪: '圆身短腿 · 猪'
};
const FIRST_ID = 46;

/* ---------- 1. 生成 12 关 ---------- */
const r2 = v => Math.round(v * 100) / 100;

/* 板件局部坐标直接复用反解工具链的 lib.js，保证「角度/翻面」约定与生成时完全一致 */
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
        const L = Math.sqrt(L2);
        for (let ib = 0; ib < B.length; ib++) {
          const b0 = B[ib], b1 = B[(ib + 1) % B.length];
          /* b 的两端都要落在 a 所在直线上（距离 < 0.6） */
          const db0 = Math.abs(((b0[0] - a0[0]) * dy - (b0[1] - a0[1]) * dx) / L);
          const db1 = Math.abs(((b1[0] - a0[0]) * dy - (b1[1] - a0[1]) * dx) / L);
          if (db0 > 0.6 || db1 > 0.6) continue;
          const t0 = ((b0[0] - a0[0]) * dx + (b0[1] - a0[1]) * dy) / L2;
          const t1 = ((b1[0] - a0[0]) * dx + (b1[1] - a0[1]) * dy) / L2;
          const lo = Math.max(0, Math.min(t0, t1)), hi = Math.min(1, Math.max(t0, t1));
          if ((hi - lo) * L < 8) continue;               // 太短（顶点相碰）不算
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

const levels = EX.map((fig, k) => {
  const name = NAMES[k] || fig.name;
  const sol = fig.pieces.map(p => ({
    id: p.id,
    x: r2(p.x), y: r2(p.y),
    angle: p.ang, flipped: !!p.f
  }));
  /* 校验：必须恰好七块、板块齐全 */
  const ids = sol.map(s => s.id).sort().join(',');
  if (ids !== 'P,S,T1,T2,T3,T4,T5') throw new Error(name + ' 板块不全: ' + ids);
  return {
    id: FIRST_ID + k,
    chapter: 3,
    name,
    tip: '生肖·七巧 · ' + (TIPS[name] || ('拼出' + name)),
    outline: fig.outline.map(v => [r2(v[0]), r2(v[1])]),
    solution: sol,
    splitLines: splitLinesOf(sol.map(piecePoly)),
    holes: fig.holes.map(h => h.map(v => [r2(v[0]), r2(v[1])])),
    hintTier: 1,
    parTime: 90,
    parSteps: 18,
    needFlip: sol.some(s => s.flipped)
  };
});

/* ---------- 2. 读 levels.js ---------- */
let src = fs.readFileSync(LV, 'utf8');

const MK_B = '/* ==== ZODIAC_LEVELS_BEGIN ==== */';
const MK_E = '/* ==== ZODIAC_LEVELS_END ==== */';
/* 幂等：先去掉上一次注入 */
{
  const i = src.indexOf(MK_B);
  if (i >= 0) {
    const j = src.indexOf(MK_E);
    if (j < 0) throw new Error('生肖注入块不完整，请手工检查');
    /* 连带吃掉注入块前面那个分隔逗号（跳过空白往回找，否则会留下 `,,` 造成空槽） */
    let from = i;
    while (from > 0 && /\s/.test(src[from - 1])) from--;
    if (src[from - 1] === ',') from--;
    src = src.slice(0, from) + src.slice(j + MK_E.length);
    console.log('已移除旧的生肖注入块');
  }
}
/* 同时把上次可能写进的章节表还原（幂等） */
src = src.replace(/,\s*\{ name: '生肖·十二', title: '生肖', from: \d+, count: \d+ \}/g, '');
src = src.replace(/completeSub: '全部 \d+ 关已通关'/g, "completeSub: '全部 45 关已通关'");

/* ---------- 3. 插到 LEVELS7 末尾 ---------- */
/* 文件是混合换行（生成的 JSON 用 \n，手写段落用 \r\n），所以按「往前找 ]」定位 */
const tagI = src.indexOf('两套数据集并存：core.js');
if (tagI < 0) throw new Error('找不到 TANGRAM_SETS 注释锚点');
const ai = src.lastIndexOf('];', tagI);
if (ai < 0) throw new Error('找不到 LEVELS7 结尾的 ];');
const block = ',\n' + MK_B + '\n  /* v0.51：生肖十二关，由 tools/zodiac/ 从参考图反解得到（见 docs/v0.51-生肖关卡.md） */\n' +
  levels.map(l => '  ' + JSON.stringify(l)).join(',\n') + '\n' + MK_E;
src = src.slice(0, ai) + block + src.slice(ai);

/* ---------- 4. 章节表 ---------- */
const newChap = "{ name: '生肖·十二', title: '生肖', from: " + FIRST_ID + ", count: " + levels.length + " }";
const chapAnchor = "{ name: '字母·A–Z', title: '字母', from: 20, count: 26 }";
if (!src.includes(chapAnchor)) throw new Error('找不到字母章节锚点');
src = src.replace(chapAnchor, chapAnchor + ',\n        ' + newChap);

/* chapNames / chapTitles 兜底表同步 */
src = src.replace(/chapNames: \["几何·入门","字母·A–Z"\]/, 'chapNames: ["几何·入门","字母·A–Z","生肖·十二"]');
src = src.replace(/chapTitles: \["几何","字母"\]/, 'chapTitles: ["几何","字母","生肖"]');

/* 待办总数 */
const total = 45 + levels.length;
src = src.replace(/completeSub: '全部 \d+ 关已通关'/, "completeSub: '全部 " + total + " 关已通关'");

fs.writeFileSync(LV, src);
console.log('已写入 ' + levels.length + ' 关（id ' + FIRST_ID + '–' + (FIRST_ID + levels.length - 1) + '），章节 from=' + FIRST_ID +
  '，completeSub 改为「全部 ' + total + ' 关已通关」');
