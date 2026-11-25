/* 用「顶点重合 + 最紧空格优先」DFS 反解参考图的 12 个生肖造型
 * ---------------------------------------------------------------
 * 任意七巧板铺砌里，每块板的顶点必然与邻板顶点重合（T 形接头也至少一端重合），
 * 因此候选位置只需「把本块某顶点对到已放板某顶点 / 图形拐角 / 当前最紧空格」。
 * 再叠加两条强剪枝：
 *   · 候选必须覆盖「最紧的空格」——即 8 邻域里自由邻居最少的未覆盖像素
 *   · 格内像素溢出 > 3.5% 直接淘汰
 * 输出 tools/zodiac/zodiac_solved.json
 */
const fs = require('fs');
const path = require('path');
const { decodePNG, px } = require('./png.js');
const L = require('./lib.js');
const G = L.G;

const img = decodePNG(path.join(__dirname, 'ref.png'));
const W = img.w, H = img.h, N = W * H;

/* 形状去重：T1/T2 同形、T4/T5 同形 → 只搜一次，最后再分配编号 */
const SHAPES = [
  { key: 'BIG', ids: ['T1', 'T2'] },
  { key: 'MED', ids: ['T3'] },
  { key: 'SQ', ids: ['S'] },
  { key: 'SM', ids: ['T4', 'T5'] },
  { key: 'PARA', ids: ['P'] }
];
const MULT = { BIG: 2, MED: 1, SQ: 1, SM: 2, PARA: 1 };
const AREA = {}, LOCALO = {};
SHAPES.forEach(s => { AREA[s.key] = Math.abs(L.polyArea(L.LOCAL[s.ids[0]])); LOCALO[s.key] = L.LOCAL[s.ids[0]]; });

/* ---------- 前景 → 12 个图形 ---------- */
const fg = new Uint8Array(N);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const [r, g, b] = px(img, x, y);
  fg[y * W + x] = (r > 238 && g > 238 && b > 238) ? 0 : 1;
}
function cc(mask, minPx) {
  const seen = new Uint8Array(N), out = [];
  for (let i = 0; i < N; i++) {
    if (seen[i] || !mask[i]) continue;
    const st = [i]; seen[i] = 1;
    const pix = []; let sx = 0, sy = 0, x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
    while (st.length) {
      const k = st.pop(); pix.push(k);
      const x = k % W, y = (k / W) | 0;
      sx += x; sy += y;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      const nb = [k - 1, k + 1, k - W, k + W];
      for (let t = 0; t < 4; t++) {
        if (t === 0 && x === 0) continue;
        if (t === 1 && x === W - 1) continue;
        const j = nb[t];
        if (j < 0 || j >= N || seen[j] || !mask[j]) continue;
        seen[j] = 1; st.push(j);
      }
    }
    if (pix.length >= minPx) out.push({ pix, n: pix.length, cx: sx / pix.length, cy: sy / pix.length, x0, x1, y0, y1 });
  }
  return out;
}
const blobs = cc(fg, 2500)
  .filter(o => (o.x1 - o.x0) < 400 && (o.y1 - o.y0) < 400)
  .sort((a, b) => (Math.round(a.cy / 110) - Math.round(b.cy / 110)) || (a.cx - b.cx));

function makeRegion(bg, pad) {
  const x0 = bg.x0 - pad, y0 = bg.y0 - pad;
  const w = bg.x1 - bg.x0 + 1 + pad * 2, h = bg.y1 - bg.y0 + 1 + pad * 2;
  const raw = new Uint8Array(w * h), dil = new Uint8Array(w * h);
  for (const k of bg.pix) raw[((k / W | 0) - y0) * w + (k % W - x0)] = 1;
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    if (!raw[yy * w + xx]) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const a = xx + dx, b = yy + dy;
      if (a >= 0 && a < w && b >= 0 && b < h) dil[b * w + a] = 1;
    }
  }
  return { x0, y0, w, h, raw, dil };
}
function inPoly(pt, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if (((a[1] > pt[1]) !== (b[1] > pt[1])) && (pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0])) c = !c;
  }
  return c;
}

/* 形状 × 朝向（去重） */
function orientsOf(key) {
  const out = [], seen = new Set();
  for (let ai = 0; ai < 8; ai++) for (const f of [false, true]) {
    const pts = LOCALO[key].map(v => L.rot(v, ai * 45, f));
    const k = pts.map(p => p.map(n => n.toFixed(3)).join(',')).sort().join(';');
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ key, ang: ai * 45, f, pts });
  }
  return out;
}
const ORI = {};
SHAPES.forEach(s => { ORI[s.key] = orientsOf(s.key); });

function solve(bg, name, budgetMs) {
  const R = makeRegion(bg, 3);
  const u = Math.sqrt(bg.n / 16);
  const totA = bg.n;
  const cov = new Uint8Array(R.w * R.h);
  let remain = bg.n;
  const placed = [];
  let nodes = 0, tOut = 0;
  const T0 = Date.now();

  const usedCount = { BIG: 0, MED: 0, SQ: 0, SM: 0, PARA: 0 };

  function rasterize(pts) {
    const bx0 = Math.floor(Math.min(...pts.map(v => v[0]))), bx1 = Math.ceil(Math.max(...pts.map(v => v[0])));
    const by0 = Math.floor(Math.min(...pts.map(v => v[1]))), by1 = Math.ceil(Math.max(...pts.map(v => v[1])));
    let inN = 0, outN = 0;
    const hit = [];
    for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) {
      if (!inPoly([x + 0.5, y + 0.5], pts)) continue;
      const gx = x - R.x0, gy = y - R.y0;
      const ok = gx >= 0 && gy >= 0 && gx < R.w && gy < R.h && R.dil[gy * R.w + gx];
      if (!ok) { outN++; continue; }
      inN++;
      const k = gy * R.w + gx;
      if (R.raw[k] && !cov[k]) hit.push(k);
    }
    return { inN, outN, hit };
  }

  /* 最紧的空格：8 邻域里「自由（未覆盖且在区域内）」邻居最少的未覆盖像素 */
  function tightCell() {
    let best = -1, bs = 99;
    for (let y = 1; y < R.h - 1; y++) {
      for (let x = 1; x < R.w - 1; x++) {
        const k = y * R.w + x;
        if (!R.raw[k] || cov[k]) continue;
        let free = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const kk = k + dy * R.w + dx;
          if (R.raw[kk] && !cov[kk]) free++;
        }
        if (free < bs) { bs = free; best = k; if (free === 0) return [best, R.x0 + (best % R.w) + 0.5, R.y0 + ((best / R.w) | 0) + 0.5]; }
      }
    }
    return best < 0 ? null : [best, R.x0 + (best % R.w) + 0.5, R.y0 + ((best / R.w) | 0) + 0.5];
  }

  function dfs() {
    if (placed.length === 7) return remain <= bg.n * 0.015;
    if (nodes++ > 2000000) throw new Error('节点超限');
    if (Date.now() - T0 > budgetMs) throw new Error('超时');

    const tc = tightCell();
    if (!tc) return placed.length === 7;
    const [cellK, tcx, tcy] = tc;

    const anchors = [[tcx, tcy]];
    for (const p of placed) for (const v of p.pts) anchors.push(v);

    const seen = new Set();
    const scored = [];
    for (const s of SHAPES) {
      if (usedCount[s.key] >= MULT[s.key]) continue;
      if (AREA[s.key] * u * u > totA * 1.02) continue;
      for (const o of ORI[s.key]) {
        for (let vi = 0; vi < o.pts.length; vi++) {
          for (const an of anchors) {
            const tx = an[0] - o.pts[vi][0] * u, ty = an[1] - o.pts[vi][1] * u;
            const dk = Math.round(tx * 2) + ',' + Math.round(ty * 2) + ',' + o.ang + ',' + (o.f ? 1 : 0);
            if (seen.has(dk)) continue;
            seen.add(dk);
            const pts = o.pts.map(v => [v[0] * u + tx, v[1] * u + ty]);
            let bad = false;
            for (const v of pts) {
              const gx = Math.round(v[0]) - R.x0, gy = Math.round(v[1]) - R.y0;
              if (gx < 0 || gy < 0 || gx >= R.w || gy >= R.h || !R.dil[gy * R.w + gx]) { bad = true; break; }
            }
            if (bad) continue;
            let ov = 0;
            for (const q of placed) { ov = G.convexOverlapArea(pts, q.pts); if (ov > 5) break; }
            if (ov > 5) continue;
            const r = rasterize(pts);
            if (process.env.DBG && placed.length === 0) DBG2.push([s.key, o.ang, o.f, vi, tx.toFixed(1), ty.toFixed(1), r.outN, r.inN, r.hit.length]);
            if (r.outN > (r.inN + r.outN) * 0.035) continue;
            if (!r.hit.length) continue;
            /* 必须「占住」最紧空格：像素中心在板内，或板的顶点正好落在这个像素上 */
            if (!r.hit.includes(cellK)) {
              let near = false;
              for (const v of pts) { if (Math.abs(v[0] - tcx) < 0.8 && Math.abs(v[1] - tcy) < 0.8) { near = true; break; } }
              if (!near) continue;
            }
            scored.push({ key: s.key, ang: o.ang, f: o.f, pts, hit: r.hit, tx, ty, gain: r.hit.length });
          }
        }
      }
    }
    if (process.env.DBG && placed.length === 0) console.log('  DBG nodes=' + nodes + ' cell=' + tcx + ',' + tcy + ',' + cellK + ' anchors=' + anchors.length + ' cands=' + scored.length);
    scored.sort((a, b) => b.gain - a.gain);
    for (const c of scored) {
      placed.push(c); usedCount[c.key]++;
      for (const k of c.hit) cov[k] = 1;
      remain -= c.hit.length;
      if (dfs()) return true;
      for (const k of c.hit) cov[k] = 0;
      remain += c.hit.length;
      usedCount[c.key]--; placed.pop();
    }
    return false;
  }

  let ok = false;
  try { ok = dfs(); } catch (e) { return { ok: false, err: e.message, nodes, ms: Date.now() - T0, cover: (bg.n - remain) / bg.n }; }
  /* BIG×2 / SM×2 分配编号 */
  const bigs = placed.filter(p => p.key === 'BIG'), sms = placed.filter(p => p.key === 'SM');
  bigs.forEach((p, i) => { p.id = i === 0 ? 'T1' : 'T2'; });
  sms.forEach((p, i) => { p.id = i === 0 ? 'T4' : 'T5'; });
  placed.forEach(p => { if (!p.id) p.id = { MED: 'T3', SQ: 'S', PARA: 'P' }[p.key]; });
  return { ok, u, placed: placed.map(p => ({ id: p.id, ang: p.ang, f: p.f, tx: p.tx, ty: p.ty, pts: p.pts })), nodes, ms: Date.now() - T0, cover: (bg.n - remain) / bg.n };
}

const DBG2 = [];
const NAMES = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
const ONLY = process.env.FIG ? process.env.FIG.split(',').map(Number) : null;
const BUDGET = +(process.env.BUDGET || 60000);
const out = [];
blobs.forEach((bg, gi) => {
  if (ONLY && !ONLY.includes(gi)) return;
  const name = NAMES[gi] || ('#' + gi);
  const r = solve(bg, name, BUDGET);
  if (process.env.DBG) { console.log('  候选样例前 8:'); DBG2.slice(0, 8).forEach(d => console.log('   ', d.join(' '))); console.log('  候选总数', DBG2.length); }
  if (!r.ok) { console.log('XX ' + name.padEnd(2) + ' ' + (r.err || '无解') + ' nodes=' + r.nodes + ' 覆盖' + ((r.cover || 0) * 100).toFixed(1) + '% ' + r.ms + 'ms'); return; }
  let maxOv = 0;
  for (let i = 0; i < r.placed.length; i++) for (let j = i + 1; j < r.placed.length; j++)
    maxOv = Math.max(maxOv, G.convexOverlapArea(r.placed[i].pts, r.placed[j].pts));
  console.log('OK ' + name.padEnd(2) + ' u=' + r.u.toFixed(2) + ' 覆盖' + (r.cover * 100).toFixed(1) + '% 压叠' + maxOv.toFixed(2) + 'px²  nodes=' + r.nodes + ' ' + r.ms + 'ms');
  out.push({ name, u: r.u, pieces: r.placed.map(p => ({ id: p.id, ang: p.ang, f: p.f, tx: p.tx, ty: p.ty })) });
});
if (!ONLY) {
  fs.writeFileSync(path.join(__dirname, 'zodiac_solved.json'), JSON.stringify(out, null, 1));
  console.log('\n成功 ' + out.length + '/12');
}
