/* 把「太长」的生肖图形压紧：把若干小板块沿另一块板的边贴到新位置。
 *
 * 为什么需要：七块板的尺寸是全关卡共用一套托盘，绝对不能缩放，
 * 所以图形多大就是多大。参考图里的龙（993）和蛇（924）是「一张长条」，
 * 放进 1000 世界单位的棋盘后左右只剩 3.4 / 35，会顶到卡纸边（设计上要留 40px）。
 *
 * 做法（只做合法的贴边移动，不改板件尺寸/面积）：
 *   1. 取下一组板（小三角 T4/T5、中三角 T3 的组合）
 *   2. 枚举剩下各板的每条边 × 这块板的每条边 × 8 种朝向 × 2 个方向
 *   3. 只保留「两条边长度相等且完全重合、与其它板零压叠、仍在棋盘内」的摆法
 *   4. 贪心：每次放一块，选「外接框最长边最短」的摆法；放不下就判失败
 * 每次移动后都重新校验：零压叠 / 面积守恒 / 并集不比原来碎 / 每块都在剪影内。
 *
 * 用法：node tools/zodiac/compact.js 龙 蛇
 * 结果写回 zodiac_exact.json（原文件备份为 zodiac_exact.bak.json）
 */
const fs = require('fs');
const path = require('path');
require('../../js/geom.js');
const G = globalThis.TANGRAM_GEOM;
const L = require('./lib.js');
const UN = require('./union.js');

const U = 96;
const FILE = path.join(__dirname, 'zodiac_exact.json');
const RAW = JSON.parse(fs.readFileSync(FILE, 'utf8'));
if (!fs.existsSync(path.join(__dirname, 'zodiac_exact.bak.json'))) {
  fs.copyFileSync(FILE, path.join(__dirname, 'zodiac_exact.bak.json'));
}

const LOCAL = {};
for (const id of Object.keys(L.LOCAL)) LOCAL[id] = L.LOCAL[id].map(v => [v[0] * U, v[1] * U]);

const polyOf = p => LOCAL[p.id].map(v => {
  const r = L.rot(v, p.ang, p.f);
  return [r[0] + p.x, r[1] + p.y];
});
const bboxOf = ps => {
  let a = 1e9, b = 1e9, c = -1e9, d = -1e9;
  for (const p of ps) for (const v of p) { if (v[0] < a) a = v[0]; if (v[0] > c) c = v[0]; if (v[1] < b) b = v[1]; if (v[1] > d) d = v[1]; }
  return [a, b, c, d];
};
const edgeLen = (p, k) => Math.hypot(p[(k + 1) % p.length][0] - p[k][0], p[(k + 1) % p.length][1] - p[k][1]);
const spanOf = ps => { const b = bboxOf(ps); return Math.max(b[2] - b[0], b[3] - b[1]); };

/* 剪影（与 lattice.js 同一套参数）：栅格并集 → 边界串环 → DP0.3，外扩 1 格，居中到棋盘 */
function outlineOf(polys) {
  const ob = bboxOf(polys);
  const tx = 500 - (ob[0] + ob[2]) / 2, ty = 500 - (ob[1] + ob[3]) / 2;
  const moved = polys.map(p => p.map(v => [v[0] + tx, v[1] + ty]));
  const outer = UN.rasterOutline(moved, 0.25, 1, 0.3);
  return { outer, moved, tx, ty };
}

/* 给一块板找所有「贴在 others 某条边上、不与 others 压叠、不出棋盘」的摆法 */
function placements(mvId, others) {
  const out = [];
  const base0 = LOCAL[mvId];
  const lens = base0.map((v, k) => edgeLen(base0, k));
  for (let oi = 0; oi < others.length; oi++) {
    const op = others[oi].poly;
    for (let oe = 0; oe < op.length; oe++) {
      const oL = edgeLen(op, oe);
      for (let se = 0; se < base0.length; se++) {
        if (Math.abs(lens[se] - oL) > 0.02) continue;
        for (let a = 0; a < 8; a++) {
          for (const f of [false, true]) {
            const base = base0.map(v => L.rot(v, a * 45, f));
            const A = base[se];
            const C = op[oe], D = op[(oe + 1) % op.length];
            for (const rev of [false, true]) {
              const tgt = rev ? [D, C] : [C, D];
              const tx = tgt[0][0] - A[0], ty = tgt[0][1] - A[1];
              const poly = base.map(v => [v[0] + tx, v[1] + ty]);
              const Bm = poly[(se + 1) % poly.length];
              if (Math.hypot(Bm[0] - tgt[1][0], Bm[1] - tgt[1][1]) > 0.05) continue;
              let ov = 0;
              for (const o of others) ov = Math.max(ov, G.convexOverlapArea(poly, o.poly));
              if (ov > 1.0) continue;
              const bb = bboxOf([poly]);
              if (bb[0] < 1 || bb[1] < 1 || bb[2] > 999 || bb[3] > 999) continue;
              out.push({ poly, ang: a * 45, f, tx, ty, host: others[oi].id });
            }
          }
        }
      }
    }
  }
  return out;
}

/* 一组板贪心压紧；返回新 pieces 数组或 null */
function trySet(lv, movableIds) {
  const rest = lv.pieces.filter(p => movableIds.indexOf(p.id) < 0).map(p => ({ ...p }));
  const queue = movableIds.slice();
  while (queue.length) {
    const mvId = queue.shift();
    const others = rest.map(p => ({ id: p.id, poly: polyOf(p) }));
    const cands = placements(mvId, others);
    if (!cands.length) return null;
    let best = null;
    for (const c of cands) {
      const all = others.map(o => o.poly).concat([c.poly]);
      const sp = spanOf(all);
      if (!best || sp < best.sp) best = { ...c, sp };
    }
    if (!best) return null;
    const base = LOCAL[mvId].map(v => L.rot(v, best.ang, best.f));
    const lb = bboxOf([base]), wb = bboxOf([best.poly]);
    rest.push({ id: mvId, ang: best.ang, f: best.f, x: +(wb[0] - lb[0]).toFixed(2), y: +(wb[1] - lb[1]).toFixed(2) });
  }
  return rest;
}

const targets = process.argv.slice(2);
const names = targets.length ? targets : ['龙', '蛇'];
const SETS = [['T5'], ['T4'], ['T4', 'T5'], ['T3'], ['T4', 'T5', 'T3']];

names.forEach(nm => {
  const lv = RAW.find(l => l.name === nm);
  if (!lv) { console.log('跳过 ' + nm + '（找不到）'); return; }
  const before = outlineOf(lv.pieces.map(polyOf));
  const b0 = bboxOf(before.moved);
  const w0 = b0[2] - b0[0];
  const loops0 = UN.unionPolys(before.moved, 0.6).length;
  console.log('\n' + nm + ' 原外接框 ' + w0.toFixed(0) + '×' + (b0[3] - b0[1]).toFixed(0) + '（并集 ' + loops0 + ' 块）');

  /* 选「改动最小」的方案：先试只动一块，只要落进 880 就收；
   * 动得越多，图形离参考图越远（龙的尾巴一挪就不像龙了），所以要克制。 */
  const TARGET = 880;
  let best = null;
  for (const set of SETS) {
    const r = trySet(lv, set);
    if (!r) continue;
    const polys = r.map(polyOf);
    const sp = spanOf(polys);
    if (sp > TARGET) continue;
    if (!best || set.length < best.set.length || (set.length === best.set.length && sp < best.sp)) {
      best = { sp, pieces: r, set };
    }
  }
  if (!best) { console.log('  没有找到「动一块就能进 880」的摆法（保持原样）'); return; }

  const polys = best.pieces.map(polyOf);
  const bb = bboxOf(polys);
  const gainX = w0 - (bb[2] - bb[0]);
  if (gainX < 20) { console.log('  最佳只省 ' + gainX.toFixed(0) + '，不值得改（保持原样）'); return; }

  const sumA = polys.reduce((a, p) => a + G.area(p), 0);
  let ov = 0;
  for (let i = 0; i < polys.length; i++) for (let j = i + 1; j < polys.length; j++) ov = Math.max(ov, G.convexOverlapArea(polys[i], polys[j]));
  const chk = outlineOf(polys);
  const inside = chk.moved.every(p => G.pieceInside(p, chk.outer, [], 3.0));
  const loops = UN.unionPolys(chk.moved, 0.6).length;
  console.log('  移动 ' + best.set.join('+') + ' → 外接框 ' + (bb[2] - bb[0]).toFixed(0) + '×' + (bb[3] - bb[1]).toFixed(0) +
    '（横向省 ' + gainX.toFixed(0) + '）');
  console.log('  校验：压叠 ' + ov.toFixed(2) + 'u² 面积 ' + (sumA / (U * U)).toFixed(4) + 'u² 并集块数 ' +
    loops + '（原 ' + loops0 + '） 全部在内 ' + inside);
  if (ov > 1 || Math.abs(sumA - 16 * U * U) > 1 || loops > loops0 || !inside) {
    console.log('  校验没过，放弃改动');
    return;
  }
  /* 板件动了，剪影必须跟着重算 —— 否则关卡里会出现「板在剪影外」 */
  const ra = UN.rasterArea(chk.moved, 0.5);
  const grow = (Math.abs(L.polyArea(chk.outer)) - sumA) / sumA;
  console.log('  剪影重算：' + chk.outer.length + ' 点，外扩 ' + (grow * 100).toFixed(2) + '%，并集面积差 ' +
    ((sumA - ra) / sumA * 100).toFixed(2) + '%');
  if (!chk.outer || chk.outer.length < 3) { console.log('  剪影生成失败，放弃改动'); return; }
  /* 剪影是按「居中到 500,500」算的，板件必须同步平移同样的量，否则会错位 */
  lv.pieces = best.pieces.map(p => ({ ...p, x: +(p.x + chk.tx).toFixed(2), y: +(p.y + chk.ty).toFixed(2) }));
  lv.outline = chk.outer.map(v => [+v[0].toFixed(2), +v[1].toFixed(2)]);
  lv.holes = [];
  lv._compacted = best.set.join('+');
  console.log('  ✔ 已更新 ' + nm);
});

fs.writeFileSync(FILE, JSON.stringify(RAW, null, 1));
console.log('\n写回 zodiac_exact.json');
