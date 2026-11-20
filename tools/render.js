/* 最小 Canvas2D 光栅化器 + 截图工具
 * 目的：在没有浏览器的情况下把核心渲染层的真实输出导成 BMP，用来肉眼验收版式。
 * 支持：路径多边形填充、fillRect、arc/arcTo/bezier 折线化、纯色与渐变（取首色）、
 *       globalAlpha、矩形 clip 近似、描边（按线段加粗）、文字（画占位条）
 * 不支持：阴影、图片、虚线、字体（文字画成色条）
 * 用法：node tools/render.js
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

/* ---------------- 光栅缓冲 ---------------- */
function makeSurface(W, H) {
  const buf = Buffer.alloc(W * H * 3, 255);
  return {
    W, H, buf,
    set(x, y, r, g, b, a) {
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const i = (y * W + x) * 3;
      const ia = 1 - a;
      buf[i] = Math.round(r * a + buf[i] * ia);
      buf[i + 1] = Math.round(g * a + buf[i + 1] * ia);
      buf[i + 2] = Math.round(b * a + buf[i + 2] * ia);
    }
  };
}
function writeBMP(file, s) {
  const W = s.W, H = s.H, buf = s.buf;
  const hd = Buffer.alloc(54);
  hd.write('BM', 0);
  hd.writeUInt32LE(54 + buf.length, 2);
  hd.writeUInt32LE(54, 10);
  hd.writeUInt32LE(40, 14);
  hd.writeInt32LE(W, 18);
  hd.writeInt32LE(H, 22);
  hd.writeUInt16LE(1, 26);
  hd.writeUInt16LE(24, 28);
  hd.writeUInt32LE(buf.length, 34);
  hd.writeInt32LE(2835, 38);
  hd.writeInt32LE(2835, 42);
  // BMP 自下而上，这里翻转
  const out = Buffer.alloc(buf.length);
  for (let y = 0; y < H; y++) {
    const src = (H - 1 - y) * W * 3;
    buf.copy(out, y * W * 3, src, src + W * 3);
  }
  fs.writeFileSync(file, Buffer.concat([hd, out]));
}

/* ---------------- 颜色解析 ---------------- */
function parseColor(c) {
  if (!c) return [0, 0, 0, 1];
  if (typeof c === 'object') {
    // 渐变：取第一个色标
    const st = c.__stops || [];
    if (!st.length) return [128, 128, 128, 1];
    return parseColor(st[0][1]);
  }
  if (c[0] === '#') {
    let h = c.slice(1);
    if (h.length === 3) h = h.split('').map(x => x + x).join('');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
  }
  const m = /rgba?\(([^)]+)\)/.exec(c);
  if (m) {
    const p = m[1].split(',').map(s => parseFloat(s));
    return [p[0] | 0, p[1] | 0, p[2] | 0, p.length > 3 ? p[3] : 1];
  }
  return [0, 0, 0, 1];
}

/* ---------------- 伪 Canvas2D ---------------- */
function makeCtx(surface) {
  const st = {
    m: [1, 0, 0, 1, 0, 0],
    fillStyle: '#000', strokeStyle: '#000', lineWidth: 1,
    globalAlpha: 1, font: '10px sans', textAlign: 'left', textBaseline: 'middle',
    lineJoin: 'miter', lineCap: 'butt',
    shadowBlur: 0, shadowColor: 'transparent', shadowOffsetY: 0
  };
  const stack = [];
  let sub = [];          // 当前路径的子路径数组
  let cur = null;
  let clip = null;       // {x0,y0,x1,y1}

  function tp(x, y) {
    const m = st.m;
    return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  }
  function toPath(pts) {
    const out = pts.map(p => tp(p[0], p[1]));
    if (clip) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const p of out) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
      if (x1 < clip.x0 || x0 > clip.x1 || y1 < clip.y0 || y0 > clip.y1) return null;
    }
    return out;
  }
  function pathBBox() {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const sp of sub) for (const p of sp) {
      const q = tp(p[0], p[1]);
      x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]);
    }
    if (!isFinite(x0)) return null;
    return { x0, y0, x1, y1 };
  }
  function fillPolygon(pts, rgba) {
    if (!pts || pts.length < 3) return;
    let minY = Infinity, maxY = -Infinity;
    for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
    if (clip) { minY = Math.max(minY, clip.y0); maxY = Math.min(maxY, clip.y1); }
    if (!isFinite(minY) || maxY < minY) return;
    const n = pts.length;
    for (let y = Math.ceil(minY); y <= Math.floor(maxY); y++) {
      const yc = y + 0.5;
      const xs = [];
      for (let i = 0; i < n; i++) {
        const a = pts[i], b = pts[(i + 1) % n];
        if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) {
          xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
        }
      }
      if (xs.length < 2) continue;
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        let xa = Math.ceil(xs[k] - 0.5), xb = Math.floor(xs[k + 1] - 0.5);
        if (clip) { xa = Math.max(xa, Math.ceil(clip.x0)); xb = Math.min(xb, Math.floor(clip.x1)); }
        for (let x = xa; x <= xb; x++) surface.set(x, y, rgba[0], rgba[1], rgba[2], rgba[3]);
      }
    }
  }

  const ctx = {
    canvas: null,
    save() { stack.push(JSON.parse(JSON.stringify(st))); },
    restore() { if (stack.length) Object.assign(st, stack.pop()); },
    setTransform(a, b, c, d, e, f) { st.m = [a, b, c, d, e, f]; },
    translate(x, y) { const m = st.m; st.m = [m[0], m[1], m[2], m[3], m[4] + m[0] * x + m[2] * y, m[5] + m[1] * x + m[3] * y]; },
    scale(x, y) { const m = st.m; st.m = [m[0] * x, m[1] * x, m[2] * y, m[3] * y, m[4], m[5]]; },
    rotate() {},
    beginPath() { sub = []; cur = null; },
    moveTo(x, y) { cur = [[x, y]]; sub.push(cur); },
    lineTo(x, y) { if (!cur) { cur = [[x, y]]; sub.push(cur); } else cur.push([x, y]); },
    quadraticCurveTo(cx, cy, x, y) {
      const p0 = cur ? cur[cur.length - 1] : [0, 0];
      for (let i = 1; i <= 10; i++) {
        const t = i / 10, u = 1 - t;
        cur.push([u * u * p0[0] + 2 * u * t * cx + t * t * x, u * u * p0[1] + 2 * u * t * cy + t * t * y]);
      }
    },
    bezierCurveTo(c1x, c1y, c2x, c2y, x, y) {
      const p0 = cur ? cur[cur.length - 1] : [0, 0];
      for (let i = 1; i <= 14; i++) {
        const t = i / 14, u = 1 - t;
        cur.push([
          u * u * u * p0[0] + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * x,
          u * u * u * p0[1] + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * y
        ]);
      }
    },
    arc(cx, cy, r, a0, a1, ccw) {
      const start = [cx + Math.cos(a0) * r, cy + Math.sin(a0) * r];
      if (!cur) { cur = [start]; sub.push(cur); } else cur.push(start);
      let span = a1 - a0;
      if (!ccw) { while (span < 0) span += Math.PI * 2; } else { while (span > 0) span -= Math.PI * 2; }
      const seg = Math.max(8, Math.ceil(Math.abs(span) / (Math.PI / 18)));
      for (let i = 1; i <= seg; i++) {
        const a = a0 + span * i / seg;
        cur.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
    },
    arcTo(x1, y1, x2, y2) { ctx.lineTo(x1, y1); },
    closePath() { if (cur && cur.length) cur.push([cur[0][0], cur[0][1]]); },
    rect(x, y, w, h) {
      ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath();
    },
    fill() {
      const c = parseColor(st.fillStyle);
      const a = c[3] * st.globalAlpha;
      for (const sp of sub) fillPolygon(toPath(sp), [c[0], c[1], c[2], a]);
    },
    stroke() {
      const c = parseColor(st.strokeStyle);
      const a = c[3] * st.globalAlpha;
      const lw = Math.max(1, st.lineWidth * Math.abs(st.m[0]));
      for (const sp of sub) {
        for (let i = 0; i + 1 < sp.length; i++) {
          const p = tp(sp[i][0], sp[i][1]), q = tp(sp[i + 1][0], sp[i + 1][1]);
          const dx = q[0] - p[0], dy = q[1] - p[1];
          const L = Math.hypot(dx, dy) || 1;
          const nx = -dy / L * lw / 2, ny = dx / L * lw / 2;
          fillPolygon([[p[0] + nx, p[1] + ny], [q[0] + nx, q[1] + ny], [q[0] - nx, q[1] - ny], [p[0] - nx, p[1] - ny]],
            [c[0], c[1], c[2], a]);
        }
      }
    },
    fillRect(x, y, w, h) {
      const c = parseColor(st.fillStyle);
      const a = c[3] * st.globalAlpha;
      const p0 = tp(x, y), p1 = tp(x + w, y + h);
      const x0 = Math.min(p0[0], p1[0]), x1 = Math.max(p0[0], p1[0]);
      const y0 = Math.min(p0[1], p1[1]), y1 = Math.max(p0[1], p1[1]);
      fillPolygon([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], [c[0], c[1], c[2], a]);
    },
    strokeRect() {}, clearRect() {},
    clip() {
      const bb = pathBBox();
      if (!bb) return;
      clip = clip ? {
        x0: Math.max(clip.x0, bb.x0), y0: Math.max(clip.y0, bb.y0),
        x1: Math.min(clip.x1, bb.x1), y1: Math.min(clip.y1, bb.y1)
      } : bb;
    },
    setLineDash() {},
    drawImage() {},
    fillText(txt, x, y) {
      // 文字画成半透明占位条：只验版式，不验字形
      const size = parseFloat(/(\d+(?:\.\d+)?)px/.exec(st.font || '10px')?.[1] || 10);
      const w = String(txt).length * size * 0.52 * (size >= 30 ? 0.92 : 0.88);
      const p = tp(x, y);
      const sw = w * Math.abs(st.m[0]), sh = size * 0.66 * Math.abs(st.m[3]);
      let x0 = p[0];
      if (st.textAlign === 'center') x0 = p[0] - sw / 2;
      else if (st.textAlign === 'right') x0 = p[0] - sw;
      const c = parseColor(st.fillStyle);
      const alpha = 0.35 * st.globalAlpha * c[3];
      fillPolygon([[x0, p[1] - sh / 2], [x0 + sw, p[1] - sh / 2], [x0 + sw, p[1] + sh / 2], [x0, p[1] + sh / 2]],
        [c[0], c[1], c[2], alpha]);
    },
    strokeText() {},
    measureText(t) { return { width: String(t).length * 10 }; },
    createLinearGradient() {
      const g = { __stops: [], addColorStop(o, c) { g.__stops.push([o, c]); } };
      return g;
    },
    createRadialGradient() {
      const g = { __stops: [], addColorStop(o, c) { g.__stops.push([o, c]); } };
      return g;
    }
  };
  // 关键：把绘制状态的属性读写代理到 st，否则 ctx.fillStyle = ... 只写到 ctx 上，st 永远是初值（全黑）
  ['fillStyle', 'strokeStyle', 'lineWidth', 'globalAlpha', 'font', 'textAlign', 'textBaseline',
    'lineJoin', 'lineCap', 'shadowBlur', 'shadowColor', 'shadowOffsetY'].forEach(function (p) {
    Object.defineProperty(ctx, p, {
      get: function () { return st[p]; },
      set: function (v) { st[p] = v; }
    });
  });
  return ctx;
}

/* ---------------- 驱动核心跑出几个画面 ---------------- */
let pendingFrame = null;
global.requestAnimationFrame = function (cb) { pendingFrame = cb; return 1; };
let clock = 0;
function step(ms) { clock += ms; const cb = pendingFrame; pendingFrame = null; if (cb) cb(clock); }

require(path.join(ROOT, 'js/levels.js'));
require(path.join(ROOT, 'js/geom.js'));
require(path.join(ROOT, 'js/judge.js'));
const CFG = require(path.join(ROOT, 'js/config.js'));
const CORE = require(path.join(ROOT, 'js/core.js'));
const DATA = globalThis.TANGRAM_DATA;

const W = 375, H = 812;
const surface = makeSurface(W, H);
const ctx = makeCtx(surface);

const store = {};
const env = {
  ctx,
  size: () => ({ w: W, h: H }),
  dpr: () => 1,
  safeInsets: () => ({ top: 20, bottom: 0 }),
  bindInput(fn) { env._input = fn; },
  storage: { get: k => (k in store ? store[k] : null), set: (k, v) => { store[k] = v; } },
  audio: { unlock() {}, setEnabled() {}, play() {} },
  vibrate() {}, images: {}, onHide() {}, onShow() {}
};

const game = CORE(env);
game.init();
const S = game.state;
const ctxCanvas = { width: W, height: H, style: {} };
ctx.canvas = ctxCanvas;

const scale = Math.min(W / CFG.DESIGN.w, H / CFG.DESIGN.h);
const ox = (W - CFG.DESIGN.w * scale) / 2;
const oy = (H - CFG.DESIGN.h * scale) / 2;
const css = (dx, dy) => [ox + dx * scale, oy + dy * scale];
function tap(dx, dy) {
  const p = css(dx, dy);
  env._input('down', p[0], p[1]); step(16);
  env._input('up', p[0], p[1]); step(16);
}
function shot(name) {
  step(16);
  writeBMP(path.join(__dirname, 'out', 'shot_' + name + '.bmp'), surface);
  console.log('  写出 shot_' + name + '.bmp');
}
function clearSurface() {
  for (let i = 0; i < surface.buf.length; i += 3) { surface.buf[i] = 255; surface.buf[i + 1] = 255; surface.buf[i + 2] = 255; }
}

console.log('渲染截图：');
// 1 主界面
for (let i = 0; i < 40; i++) step(16);
shot('1_home');

// 2 关卡列表（先解锁 2 关）
S.save.unlockedMax = 3;
S.save.starOf = { 1: 3, 2: 2 };
tap(375, 1150);        // 关卡
for (let i = 0; i < 20; i++) step(16);
shot('2_levels');

// 3 对局页（第 1 关，两块已放）
// 直接进第 1 关，不靠点坐标（关卡格位置随关卡数变化，硬编码会点空）
game._debug.setupLevel(0);
S.page = 'play';
for (let i = 0; i < 30; i++) step(16);
const lv = DATA.levels[0];
for (const id of ['A', 'B']) {
  const p = S.pieces.find(x => x.id === id);
  const st = lv.solution.find(s => s.id === id);
  p.onBoard = true; p.x = st.x; p.y = st.y;
  p.angle = st.angle; p.dAngle = st.angle;
  p.flipped = st.flipped; p.dFlipped = st.flipped;
}
S.selId = 'C';
S.covFrom = 0; S.covTo = 0.52; S.covT = 0; 
for (let i = 0; i < 30; i++) step(16);
shot('3_play');

// 4 有提示高亮的对局页
S.hint = { id: 'C', t: 0, until: Date.now() + 99999 };
for (let i = 0; i < 10; i++) step(16);
shot('4_hint');
S.hint = null;

// 5 结算面板
S.pieces.forEach(p => {
  const st = lv.solution.find(s => s.id === p.id);
  p.onBoard = true; p.x = st.x; p.y = st.y;
  p.angle = st.angle; p.dAngle = st.angle;
  p.flipped = st.flipped; p.dFlipped = st.flipped;
});
S.covTo = 1; S.cov = 1;
S.steps = 9; S.elapsed = 42.3;
S.result = { stars: 3, time: 42.3, steps: 9 };
S.overlay = 'result'; S.resT = 600; S.starShown = 3;
for (let i = 0; i < 20; i++) step(16);
shot('5_result');

// 6 设置面板
S.overlay = 'settings';
for (let i = 0; i < 20; i++) step(16);
shot('6_settings');

console.log('完成');
