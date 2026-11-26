/* 舞者关卡反解 · 预览渲染：把 dancers_exact.json 画成 HTML/PNG
 * 用法：node tools/dancer/render.js [out.png]
 * 左半 = 反解结果（标准七巧板配色），右半 = 参考图原图，方便逐块对照姿势。
 */
'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const J = JSON.parse(fs.readFileSync(path.join(__dirname, 'dancers_exact.json'), 'utf8'));
require(path.join(ROOT, 'js', 'levels.js'));
const DS = globalThis.TANGRAM_SETS.tangram7.dataset;

const COLOR = {};
DS.pieceOrder.forEach(id => { COLOR[id] = DS.pieces[id].color; });
/* 大三角两块、小三角两块用深浅区分，方便看清单块 */
const ALT = { T2: '#F2703F', T5: '#F0BE3C' };

function svgOf(lv, w) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  lv.outline.forEach(v => { x0 = Math.min(x0, v[0]); y0 = Math.min(y0, v[1]); x1 = Math.max(x1, v[0]); y1 = Math.max(y1, v[1]); });
  const pad = 26;
  const vw = x1 - x0 + pad * 2, vh = y1 - y0 + pad * 2;
  const polys = lv.pieces.map(p => {
    /* 用与 core.js 一致的变换还原顶点 */
    const base = DS.pieces[p.id].base.map(v => [v[0] * 96, v[1] * 96]);
    const cx = base.reduce((s, v) => s + v[0], 0) / base.length;
    const cy = base.reduce((s, v) => s + v[1], 0) / base.length;
    const a = p.angle * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    const pts = base.map(v => {
      const x = (v[0] - cx) * (p.flipped ? -1 : 1), y = v[1] - cy;
      return [x * ca - y * sa + p.x - x0 + pad, x * sa + y * ca + p.y - y0 + pad];
    });
    const d = pts.map(v => v[0].toFixed(3) + ',' + v[1].toFixed(3)).join(' ');
    return `<polygon points="${d}" fill="${ALT[p.id] || COLOR[p.id]}" stroke="#00000022" stroke-width="1.4"/>`;
  }).join('');
  const od = lv.outline.map(v => (v[0] - x0 + pad).toFixed(3) + ',' + (v[1] - y0 + pad).toFixed(3)).join(' ');
  return `<svg viewBox="0 0 ${vw.toFixed(3)} ${vh.toFixed(3)}" width="${w}" height="${(w * vh / vw).toFixed(0)}">
    <polygon points="${od}" fill="none" stroke="#333" stroke-width="2" stroke-dasharray="10 6"/>
    ${polys}
  </svg>`;
}

const cells = J.map((lv, i) => `<figure>
  ${svgOf(lv, 170)}
  <figcaption>${i + 1}. ${lv.name}<br><small>${lv.quality.width.toFixed(1)}×${lv.quality.height.toFixed(1)}u · 点 ${lv.outline.length} · 面积差 ${lv.quality.areaErrPct}%</small></figcaption>
</figure>`).join('\n');

const refB64 = fs.readFileSync(path.join(__dirname, 'ref.png')).toString('base64');
const html = `<!doctype html><meta charset="utf-8">
<style>
 body{margin:0;padding:10px;background:#fff;font:12px/1.4 system-ui;color:#222}
 .row{display:flex;flex-wrap:wrap;gap:6px}
 figure{margin:0;width:178px;text-align:center}
 figcaption{margin-top:2px}small{color:#777}
 .ref{margin-top:6px;border-top:1px solid #ddd;padding-top:6px}
 .ref img{width:100%}
</style>
<div class="row">${cells}</div>
<div class="ref"><img src="data:image/png;base64,${refB64}"></div>`;

const htmlFile = path.join(__dirname, 'out', 'preview.html');
fs.mkdirSync(path.dirname(htmlFile), { recursive: true });
fs.writeFileSync(htmlFile, html);

const png = path.resolve(process.argv[2] || path.join(__dirname, 'out', 'preview.png'));
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const udd = path.join(os.tmpdir(), 'dance_' + process.pid);
const r = spawnSync(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--force-device-scale-factor=1', '--user-data-dir=' + udd,
  '--window-size=980,620', '--screenshot=' + png,
  'file:///' + htmlFile.replace(/\\/g, '/')], { timeout: 60000 });
console.log(fs.existsSync(png) ? 'ok ' + png : 'fail ' + r.status);
