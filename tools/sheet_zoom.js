/* 把若干关的「板件 + 轮廓 + 补块」渲染成一张大图，用于目视判断缝隙到底是「内部裂缝」还是「字母凹口」
 * 用法：node tools/sheet_zoom.js H G F I V E K Y B T
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
require(path.join(ROOT, 'js', 'geom.js'));
require(path.join(ROOT, 'js', 'levels.js'));
const G = globalThis.TANGRAM_GEOM;
const S = globalThis.TANGRAM_SETS.tangram7;
const RL = require('./repair_letters.js');
const COLOR = { T1: '#FF8A5B', T2: '#4FA8E0', T3: '#63C88B', S: '#F47FA8', T4: '#A87BE8', T5: '#FFC94D', P: '#4FC9C0' };

const names = process.argv.slice(2);
const cells = [];
for (const nm of (names.length ? names : ['H', 'G', 'F', 'I', 'V', 'E', 'K', 'Y', 'B', 'T', 'A'])) {
  const lv = S.levels.find(l => l.name === nm);
  if (!lv) continue;
  const P = lv.solution.map(st => ({ id: st.id, poly: RL.polyOf(st) }));
  const all = [];
  P.forEach(p => p.poly.forEach(v => all.push(v)));
  const x0 = Math.min(...all.map(v => v[0])) - 10, x1 = Math.max(...all.map(v => v[0])) + 10;
  const y0 = Math.min(...all.map(v => v[1])) - 10, y1 = Math.max(...all.map(v => v[1])) + 10;
  const W = 300, sc = W / Math.max(x1 - x0, y1 - y0), H = (y1 - y0) * sc;
  const f = v => [(v[0] - x0) * sc, (v[1] - y0) * sc].map(n => n.toFixed(1)).join(',');
  let svg = P.map(p => `<polygon points="${p.poly.map(f).join(' ')}" fill="${COLOR[p.id]}" stroke="#fff" stroke-width="0.6"/>`).join('');
  svg += `<polygon points="${lv.outline.map(f).join(' ')}" fill="none" stroke="#d00" stroke-width="1"/>`;
  (lv.holes || []).forEach(h => { svg += `<polygon points="${h.map(f).join(' ')}" fill="none" stroke="#d00" stroke-width="1"/>`; });
  (lv.gapFill || []).forEach(g => {
    svg += `<polygon points="${g.qa.map(f).join(' ')}" fill="${COLOR[g.a]}" fill-opacity="1"/>`;
    svg += `<polygon points="${g.qb.map(f).join(' ')}" fill="${COLOR[g.b]}" fill-opacity="1"/>`;
  });
  cells.push(`<div class="c"><svg width="${W}" height="${H.toFixed(0)}" viewBox="0 0 ${W} ${H.toFixed(0)}" style="background:#fff">${svg}</svg><b>${nm}</b></div>`);
}
const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;padding:10px;background:#eef;font:12px system-ui}
.w{display:flex;flex-wrap:wrap;gap:10px}.c{background:#fff;border:1px solid #ccc;padding:4px;text-align:center}
.c b{display:block;color:#333}
</style><div class="w">${cells.join('')}</div>`;
fs.writeFileSync(path.join(__dirname, 'out', 'zoom_sheet.html'), html);
console.log('→ tools/out/zoom_sheet.html（' + cells.length + ' 关）');
