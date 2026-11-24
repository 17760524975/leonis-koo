/* 拟合结果可视化：每个字母一格 —— 淡灰底是参考剪影，彩色是 7 块板。
 * 用法：node tools/letters7/preview.js [A B ...]
 * 产出：tools/out/letters7_preview.html + .png（Edge 截图）
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const HERE = __dirname;
const ROOT = path.join(HERE, '..', '..');
const OUT = path.join(ROOT, 'tools', 'out');

const SRC = process.env.SRC || (fs.existsSync(path.join(HERE, 'letters7_sol.json')) ? 'letters7_sol.json' : 'letters7_fit.json');
const fit = JSON.parse(fs.readFileSync(path.join(HERE, SRC), 'utf8'));
const masks = JSON.parse(fs.readFileSync(path.join(HERE, 'letters_mask.json'), 'utf8'));
const only = process.argv.slice(2);
const list = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter(c => fit[c] && (!only.length || only.indexOf(c) >= 0));

const COL = { T1: '#FF8A5B', T2: '#4FA8E0', T3: '#63C88B', S: '#F47FA8', T4: '#A87BE8', T5: '#FFC94D', P: '#4FC9C0' };
const TOTAL = 16;
const SCALE = 46;                // 1u = 46px
const PAD = 14;

const cells = [];
for (const ch of list) {
  const f = fit[ch], m = masks.find(x => x.ch === ch);
  const S = Math.sqrt(m.area / TOTAL);           // px → u
  const uw = m.w / S, uh = m.h / S;
  if (!f) { cells.push(`<div class="cell"><div class="t">${ch}</div><div class="s">未拟合</div></div>`); continue; }
  const W = Math.ceil(uw * SCALE) + PAD * 2, Hh = Math.ceil(uh * SCALE) + PAD * 2 + 22;
  let svg = `<svg width="${W}" height="${Hh}">`;
  /* 参考剪影：逐像素块（2px 一格，够看） */
  const step = 2;
  for (let py = 0; py < m.h; py += step) {
    let run = null;
    for (let px = 0; px <= m.w; px += step) {
      const on = px < m.w && m.rows[py][px] === '1';
      if (on && run === null) run = px;
      if (!on && run !== null) {
        svg += `<rect x="${(PAD + run / S * SCALE).toFixed(1)}" y="${(PAD + py / S * SCALE).toFixed(1)}" ` +
          `width="${((px - run) / S * SCALE).toFixed(1)}" height="${(step / S * SCALE).toFixed(1)}" fill="#dfe6ef"/>`;
        run = null;
      }
    }
  }
  for (const pc of f.pieces) {
    const pts = pc.poly.map(v => `${(PAD + v[0] * SCALE).toFixed(1)},${(PAD + v[1] * SCALE).toFixed(1)}`).join(' ');
    svg += `<polygon points="${pts}" fill="${COL[pc.id]}" fill-opacity="0.85" stroke="#3b4a5a" stroke-width="1.2"/>`;
  }
  svg += `</svg><div class="t">${ch}</div><div class="s">${f.score.toFixed(0)} · 漏 ${f.miss}</div>`;
  cells.push(`<div class="cell">${svg}</div>`);
}
/* 26 个都放进去，未给出 fit 的字母也占位，保证 A–Z 排布稳定 */
const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#fff;font-family:system-ui">
<style>
 .wrap{display:flex;flex-wrap:wrap;gap:10px;padding:12px;width:1500px}
 .cell{position:relative;background:#fbfcfe;border:1px solid #e6ebf2;border-radius:8px;padding:0 0 18px}
 .t{position:absolute;left:8px;top:6px;font:700 15px system-ui;color:#2C3A4B}
 .s{position:absolute;right:8px;bottom:3px;font:12px system-ui;color:#7A8A9C}
</style><div class="wrap">${cells.join('')}</div></body>`;
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
const htmlFile = path.join(OUT, 'letters7_preview.html');
fs.writeFileSync(htmlFile, html);

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const png = path.join(OUT, 'letters7_preview.png');
try { fs.unlinkSync(png); } catch (e) {}
const udd = path.join(os.tmpdir(), 'l7_edge_' + process.pid);
fs.mkdirSync(udd, { recursive: true });
const r = spawnSync(EDGE, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
  '--force-device-scale-factor=1', '--user-data-dir=' + udd, '--window-size=1524,1400',
  '--virtual-time-budget=3000', '--screenshot=' + png,
  'file:///' + htmlFile.replace(/\\/g, '/')], { encoding: 'utf8', timeout: 60000 });
console.log('预览 ' + list.length + ' 个字母 → ' + png + (fs.existsSync(png) ? '  ' + (fs.statSync(png).size / 1024).toFixed(0) + 'KB' : '  截图失败'));
