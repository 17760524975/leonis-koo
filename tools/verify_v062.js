/* v0.62 验收：BGM 分包（P0）+ 代码瘦身（P1）+ 官方性能篇落地
 *
 * 三块断言：
 *   A. 包体：主包 < 1.2MB（曾经 3.18MB）、分包声明与入口文件齐、mp3 不在主包；
 *   B. 瘦身不等于改语义：产物 == strip(源码)，且**用产物真跑 57 关标准解全部通关**；
 *   C. 渲染开销（都在真实渲染路径上量）：
 *      · 每帧全屏填充从 2 次降到 1 次；
 *      · 第二帧的 createLinearGradient / measureText 调用数为 0（缓存命中）；
 *      · 低端档（tier 0）shadowBlur 全为 0、粒子数 ≈45%；
 *      · 静态浮层静置时不再每帧重画（1s 心跳兜底）；
 *      · trimMemory 之后缓存确实被清空、下一帧重建。
 * 用法：node tools/verify_v062.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const PKG = path.join(ROOT, 'miniprogram');

let fail = 0;
function check(label, ok, detail) {
  if (!ok) fail++;
  console.log(`  [${ok ? 'OK' : 'XX'}] ${label}${detail ? '  ' + detail : ''}`);
}
function section(t) { console.log('\n== ' + t + ' =='); }

/* ================= A. 包体 / 分包 ================= */
section('A. BGM 分包（P0）');
const gj = JSON.parse(fs.readFileSync(path.join(PKG, 'game.json'), 'utf8'));
const subs = gj.subpackages || gj.subPackages || [];
const audioSub = subs.find(s => s.name === 'audio');
check('game.json 声明了 audio 分包', !!audioSub, JSON.stringify(subs));
check('分包 root = audio-pkg/', !!audioSub && String(audioSub.root).replace(/^\.?\//, '') === 'audio-pkg/',
  audioSub && audioSub.root);
check('分包根目录有 game.js 入口（小游戏硬性校验，缺了直接编译报错）',
  fs.existsSync(path.join(PKG, 'audio-pkg', 'game.js')));

const CFG = require(path.join(ROOT, 'js/config.js'));
const lvBgm = CFG.AUDIO.bgm.lv;
check('配置里声明了分包前缀 bgmPkg', /^audio-pkg\/assets\/audio\/$/.test(CFG.AUDIO.bgmPkg || ''), CFG.AUDIO.bgmPkg);
check('配置里声明了分包名 subpackage = audio', CFG.AUDIO.subpackage === 'audio', CFG.AUDIO.subpackage);
check('4 首关卡曲都在分包里',
  lvBgm.every(f => fs.existsSync(path.join(PKG, 'audio-pkg', 'assets/audio', f))), lvBgm.join(','));
check('主包里不再有 mp3（否则分包白做）',
  lvBgm.every(f => !fs.existsSync(path.join(PKG, 'assets/audio', f))));

/* 主包体积：排除分包目录 */
function walk(dir, out) {
  for (const n of fs.readdirSync(dir)) {
    if (n === 'cloudfunctions' || n === '.cloudbase' || n === '.git') continue;
    const p = path.join(dir, n);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push({ rel: path.relative(PKG, p).replace(/\\/g, '/'), size: st.size });
  }
  return out;
}
const all = walk(PKG, []);
const roots = subs.map(s => String(s.root).replace(/^\.?\//, '').replace(/\/?$/, '/'));
const mainFiles = all.filter(f => !roots.some(r => f.rel.indexOf(r) === 0));
const mainB = mainFiles.reduce((a, f) => a + f.size, 0);
const allB = all.reduce((a, f) => a + f.size, 0);
check('主包 < 1.2MB（v0.61 时 3.18MB）', mainB < 1.2 * 1024 * 1024, (mainB / 1048576).toFixed(2) + 'MB');
check('全包 < 30MB（主包+分包上限）', allB < 30 * 1024 * 1024, (allB / 1048576).toFixed(2) + 'MB');
check('分包只装了 mp3 与入口，没有把主包代码带进去',
  all.filter(f => roots.some(r => f.rel.indexOf(r) === 0)).every(f => /\.mp3$|game\.js$/.test(f.rel)),
  all.filter(f => roots.some(r => f.rel.indexOf(r) === 0)).map(f => f.rel).join(' '));

const gameSrc = fs.readFileSync(path.join(PKG, 'game.js'), 'utf8');
check('平台层有分包加载状态机 loadBgmPkg', /function loadBgmPkg/.test(gameSrc));
check('分包未就绪时不建 InnerAudioContext（否则 src 必失败）',
  /function ctxFor[\s\S]{0,160}!bgmPkgReady\(\)[\s\S]{0,80}return null/.test(gameSrc));
check('首次触摸预取分包（不压首屏冷启动）', /onTouchStart\(kickBgmPkg\)/.test(gameSrc));
check('分包失败静音降级 + 60s 后可重试', /failAt/.test(gameSrc) && /60000/.test(gameSrc));

/* ================= B. 代码瘦身 ================= */
section('B. 代码瘦身（P1）：产物 == strip(源码)');
const P = require('./lib/pack.js');
const MODS = ['config.js', 'geom.js', 'judge.js', 'levels.js', 'core.js'];
let shrinkBefore = 0, shrinkAfter = 0, same = true, noComment = true;
for (const f of MODS) {
  const src = fs.readFileSync(path.join(ROOT, 'js', f), 'utf8');
  const out = fs.readFileSync(path.join(PKG, 'js', f), 'utf8');
  shrinkBefore += Buffer.byteLength(src);
  shrinkAfter += Buffer.byteLength(out);
  /* 两侧都 normalize 再比：产物可能是 CRLF checkout */
  if (P.strip(src) !== P.strip(out)) same = false;
  /* 产物里不该再有块注释；行注释也不该有（字符串/正则里的 // 除外，扫行首即可） */
  if (/\/\*/.test(out) || /(^|\n)\s*\/\//.test(out)) noComment = false;
}
check('5 个模块：产物 == strip(源码)（语义逐字等价）', same);
check('产物里没有注释残留', noComment);
check('代码体积至少减半', shrinkAfter < shrinkBefore * 0.55,
  (shrinkBefore / 1024).toFixed(0) + 'KB → ' + (shrinkAfter / 1024).toFixed(0) + 'KB');
check('levels.js 每关数据 < 1.1KB（原 1.93KB）',
  fs.statSync(path.join(PKG, 'js/levels.js')).size / 93 < 1.1 * 1024,
  (fs.statSync(path.join(PKG, 'js/levels.js')).size / 93 / 1024).toFixed(2) + 'KB/关');

section('B2. 产物可跑：57 关标准解全部通关');
/* 单独把 miniprogram/js 的产物加载进来（与源码是两份不同的模块实例） */
require(path.join(PKG, 'js/levels.js'));
require(path.join(PKG, 'js/geom.js'));
require(path.join(PKG, 'js/judge.js'));
const PCFG = require(path.join(PKG, 'js/config.js'));
const PCORE = require(path.join(PKG, 'js/core.js'));
let pending = null;
global.requestAnimationFrame = cb => { pending = cb; return 1; };
let clock = 0;
function step(ms) { clock += ms; const cb = pending; pending = null; if (cb) cb(clock); }

/* 记录型 ctx：统计填充 / 渐变 / 测宽 / 阴影，供 C 段断言 */
const rec = { fillRects: [], grads: 0, meas: 0, maxShadow: 0, draws: 0 };
function makeCtx() {
  const g = { addColorStop() {} };
  const base = {
    canvas: { width: 0, height: 0, style: {} },
    globalAlpha: 1, font: '', fillStyle: '', strokeStyle: '',
    measureText(s) { rec.meas++; return { width: String(s).length * 15 }; },
    createLinearGradient() { rec.grads++; return g; },
    createRadialGradient() { rec.grads++; return g; },
    createPattern() { return null; },
    fillRect(x, y, w, h) { rec.fillRects.push({ x, y, w, h }); rec.draws++; },
    fillText() { rec.draws++; },
    fill() { rec.draws++; }, stroke() { rec.draws++; },
    drawImage() { rec.draws++; },
    save() {}, restore() {}, translate() {}, scale() {}, rotate() {}, setTransform() {},
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, arcTo() {},
    quadraticCurveTo() {}, bezierCurveTo() {}, rect() {}, clip() {}, strokeRect() {},
    clearRect() {}, strokeText() {}, setLineDash() {}, ellipse() {}
  };
  return new Proxy(base, {
    get(t, k) { return k in t ? t[k] : () => {}; },
    set(t, k, v) {
      if (k === 'shadowBlur' && v > rec.maxShadow) rec.maxShadow = v;
      t[k] = v; return true;
    }
  });
}

let curTier = 2;
const store = {};
const env = {
  ctx: makeCtx(),
  tutorial: false,
  size: () => ({ w: 375, h: 812 }),
  dpr: () => 3,
  safeInsets: () => ({ top: 20, bottom: 0 }),
  device: () => ({ tier: curTier }),
  setFps() {},
  gc() {},
  bindInput() {},
  storage: { get: k => (k in store ? store[k] : null), set: (k, v) => { store[k] = v; } },
  audio: { unlock() {}, setEnabled() {}, play() {}, duck() {}, setVisible() {}, setScene() {} },
  vibrate() {}, images: {}, share() {}, onHide() {}, onShow() {},
  cloud: { enabled: () => false, init(cb) { setTimeout(() => cb('no-cloud'), 0); },
    load(cb) { setTimeout(() => cb('no-cloud'), 0); },
    save(p, cb) { setTimeout(() => cb(null, {}), 0); },
    rank(t, cb) { setTimeout(() => cb(null, { list: [], me: null }), 0); } },
  ad: { placeholder: true, banner() {}, rewarded(kind, cb) { cb(true, ''); } }
};
const game = PCORE(env);
game.init();
step(16);
const S = game.state, D = game._debug;
check('画质档位默认按设备读到 tier=2', S.quality && S.quality.tier === 2, JSON.stringify(S.quality));

let winAll = 0, lvAll = 0, packedBad = [];
['tangram4', 'tangram7'].forEach(k => {
  D.useSet(k);
  step(16);
  const set = globalThis.TANGRAM_SETS[k];
  set.levels.forEach((lv, idx) => {
    lvAll++;
    D.setupLevel(idx);
    S.page = 'play'; S.win = null; S.result = null; S.overlay = null;
    step(16);
    S.pieces.forEach(p => {
      const st = lv.solution.find(q => q.id === p.id);
      if (!st) return;
      p.onBoard = true; p.x = st.x; p.y = st.y;
      p.angle = st.angle; p.dAngle = st.angle;
      p.flipped = !!st.flipped; p.dFlipped = !!st.flipped;
    });
    step(16);
    D.runJudge(false);
    step(16);
    if (S.win) winAll++; else packedBad.push(lv.id + ':' + lv.name);
  });
});
check(`打包产物跑 ${lvAll} 关标准解全部通关`, winAll === lvAll,
  winAll + '/' + lvAll + (packedBad.length ? ' 失败 ' + packedBad.join(',') : ''));

/* ================= C. 渲染开销 ================= */
section('C. 渲染：全屏填充 / 渐变 / 测宽');
D.useSet('tangram7');
step(16);
D.setupLevel(0);
S.page = 'play'; S.overlay = null; S.win = null;
/* 关掉动画粒子层，只量稳定管线（classic 光斑在 drawHomeGlow 里，不建渐变） */
S.save.bgFx = 'glow'; S.fxParts = null;
step(16);   // 首帧：建缓存

rec.fillRects.length = 0; rec.grads = 0; rec.meas = 0; rec.draws = 0;
const cv = env.ctx.canvas;
step(16);
const fullFills = rec.fillRects.filter(r => r.w >= cv.width - 1 && r.h >= cv.height - 1).length;
check('每帧只有 1 次全屏填充（旧版 2 次）', fullFills === 1, 'full=' + fullFills +
  ' 全部 fillRect=' + rec.fillRects.length);
check('稳定帧不再新建渐变（缓存命中）', rec.grads === 0, 'grads=' + rec.grads);
check('稳定帧不再 measureText（测宽缓存命中）', rec.meas === 0, 'meas=' + rec.meas);
check('一帧的绘制调用 < 400（可量化的开销上限）', rec.draws > 0 && rec.draws < 400, 'draws=' + rec.draws);

section('C2. 低端档降级：阴影关、粒子减、帧率上限');
curTier = 0;
D.initQuality();
check('tier 0：shadow 系数 0', S.quality.shadow === 0);
check('tier 0：particles 0.45', Math.abs(S.quality.particles - 0.45) < 1e-6);
check('tier 0：请求 30fps', S.quality.fps === 30);
rec.maxShadow = 0;
step(16);
check('tier 0 一帧里没有任何 shadowBlur', rec.maxShadow === 0, 'max=' + rec.maxShadow);

/* 粒子数：geometric 背景在两档下的条数 */
function particleCount(tier) {
  curTier = tier; D.initQuality();
  S.save.bgFx = 'geometric'; S.fxParts = null;
  step(16);
  return (S.fxParts && S.fxParts.items.length) || 0;
}
const p2 = particleCount(2), p0 = particleCount(0);
check('低端档粒子数 ≈ 45%（高端 ' + p2 + ' → 低端 ' + p0 + '）',
  p2 > 6 && p0 === Math.max(1, Math.round(p2 * 0.45)), p0 + '/' + p2);

section('C3. 静态浮层跳帧');
curTier = 2; D.initQuality();
S.save.bgFx = 'glow'; S.fxParts = null;
S.overlay = 'rank'; S.rankList = { list: [], me: null }; S.dirty = true;
step(16);
step(16);
rec.draws = 0;
for (let i = 0; i < 10; i++) step(16);      // 160ms 静置
check('排行榜静置 160ms 内零重画（旧版 10 帧全画）', rec.draws === 0, 'draws=' + rec.draws);
rec.draws = 0;
step(1100);                                  // 1s 心跳
check('心跳到点会重画一次（兜住异步数据）', rec.draws > 0, 'draws=' + rec.draws);
S.dirty = true; rec.draws = 0; step(16);
check('有输入/数据变化立刻重画', rec.draws > 0, 'draws=' + rec.draws);
S.overlay = null; S.dirty = true; step(16);

section('C4. trimMemory 释放缓存');
S.page = 'play'; S.overlay = null; S.dirty = true; step(16);
rec.grads = 0;
game.trimMemory();
S.dirty = true;
step(16);
check('trimMemory 后下一帧重建渐变（缓存确实被清空）', rec.grads > 0, 'grads=' + rec.grads);

section('D. 平台层接线');
check('game.js 读 benchmarkLevel 分档', /benchmarkLevel/.test(gameSrc) && /deviceTier/.test(gameSrc));
check('game.js dpr 上限分三档（2.5 / 2 / 1.75）',
  /2\.5/.test(gameSrc) && /1\.75/.test(gameSrc));
check('game.js 接 wx.setPreferredFramesPerSecond', /setPreferredFramesPerSecond/.test(gameSrc));
check('game.js 接 wx.onMemoryWarning → trimMemory + triggerGC',
  /onMemoryWarning/.test(gameSrc) && /trimMemory/.test(gameSrc) && /triggerGC/.test(gameSrc));
check('core 每局开始/结束都发 GC 提示', (fs.readFileSync(path.join(ROOT, 'js/core.js'), 'utf8').match(/gcHint\(\)/g) || []).length >= 3);

console.log('\n' + (fail === 0 ? 'v0.62 验收全部通过' : `!! ${fail} 项未通过`));
process.exit(fail ? 1 : 0);
