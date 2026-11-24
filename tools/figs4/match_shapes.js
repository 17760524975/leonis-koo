/* 把提取出的 6 个剪影与 tools/out/shapes.json（394 个精确可拼的四巧板轮廓）做形状匹配。
 * 匹配用「质心对齐 + 45° 步进旋转 + 镜像」下的栅格 IoU。
 * 输出 tools/figs4/out/match.json：每个参考图的 top-N 候选（含该形状的官方拼法）。
 *
 * 用法：node tools/enumerate.js && node tools/figs4/match_shapes.js
 */
const fs = require('fs');
const path = require('path');
const E = require('../enumerate.js');
const { area, centroidOf, inPoly } = E;

const HERE = __dirname;
const OUT = path.join(HERE, 'out');
const SHAPES = path.join(HERE, '..', 'out', 'shapes.json');

const HALF = 3.8;          // 匹配窗口半宽（u）
const N = 96;              // 栅格边长
const CELL = (HALF * 2) / N;

function normalize(poly) {
  const a = Math.abs(area(poly));
  const s = Math.sqrt(6 / a);
  const c = centroidOf(poly);
  return poly.map(v => [(v[0] - c[0]) * s, (v[1] - c[1]) * s]);
}

function rasterOf(poly) {
  const m = new Uint32Array(Math.ceil((N * N) / 32));
  let count = 0;
  for (let gy = 0; gy < N; gy++) {
    const y = -HALF + (gy + 0.5) * CELL;
    for (let gx = 0; gx < N; gx++) {
      const x = -HALF + (gx + 0.5) * CELL;
      if (inPoly([x, y], poly)) {
        const i = gy * N + gx;
        m[i >> 5] |= (1 << (i & 31));
        count++;
      }
    }
  }
  return { m, count };
}

function iou(a, b) {
  let inter = 0;
  for (let i = 0; i < a.m.length; i++) {
    let x = a.m[i] & b.m[i];
    while (x) { inter++; x &= x - 1; }
  }
  const uni = a.count + b.count - inter;
  return uni ? inter / uni : 0;
}

function rotFlip(p, deg, flip) {
  const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  return p.map(v => {
    const x = flip ? -v[0] : v[0], y = v[1];
    return [x * c - y * s, x * s + y * c];
  });
}

function main() {
  const shapes = JSON.parse(fs.readFileSync(SHAPES, 'utf8'));
  const refs = JSON.parse(fs.readFileSync(path.join(OUT, 'poly.json'), 'utf8'));
  console.log(`形状库 ${shapes.length} 个`);

  console.log('预栅格化形状库…');
  const t0 = Date.now();
  const lib = shapes.map(s => {
    const poly = normalize(s.outline);
    return { idx: s.idx, poly, r: rasterOf(poly), s };
  });
  console.log(`  完成（${Date.now() - t0}ms）`);

  const result = {};
  for (const tag of Object.keys(refs)) {
    const raw = normalize(refs[tag].poly);
    // 参考图的 16 个朝向
    const views = [];
    for (let k = 0; k < 8; k++) {
      for (const flip of [false, true]) {
        const p = rotFlip(raw, k * 45, flip);
        views.push({ k, flip, r: rasterOf(p), p });
      }
    }
    const scored = [];
    for (const item of lib) {
      let best = { v: -1 };
      for (const v of views) {
        const val = iou(item.r, v.r);
        if (val > best.v) best = { v: val, view: v };
      }
      scored.push({ idx: item.idx, iou: best.v, k: best.view.k * 45, flip: best.view.flip, s: item.s });
    }
    scored.sort((a, b) => b.iou - a.iou);
    result[tag] = scored.slice(0, 8).map(x => ({
      idx: x.idx, iou: +x.iou.toFixed(4), rot: x.k, flip: x.flip,
      verts: x.s.outline.length,
      outline: x.s.outline,
      conf: x.s.conf,
      nFlip: x.s.nFlip, nsol: x.s.nsol,
    }));
    console.log(`\n[${tag}] 顶点=${raw.length} top8：`);
    result[tag].forEach((x, i) => {
      console.log(`  ${i + 1}. #${x.idx} IoU=${x.iou.toFixed(4)}  顶点=${x.verts}  旋转=${x.rot}${x.flip ? ' 镜像' : ''}  板=${x.conf.map(c => c.id + (c.flip ? '-' : '+') + c.angle).join(' ')}`);
    });
  }
  fs.writeFileSync(path.join(OUT, 'match.json'), JSON.stringify(result, null, 1));
  console.log('\n已写 out/match.json');
}

if (require.main === module) main();
module.exports = { normalize, rasterOf, iou, rotFlip };
