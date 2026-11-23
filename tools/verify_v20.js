/* v0.20 专项验收：提示改成「单档 · 常驻 · 只指下一步」+ 音效重做
 * 用法：node tools/verify_v20.js
 *
 * 用户这版三条需求：
 *   ① 提示不分档了 —— 永远是「下一块是哪块、放到哪里」，而且高亮不再自动消失；
 *   ② 提示面板底部那两行小字（道具来源 / 巧币余量 / 用提示最高 ★★）删掉；
 *   ③ 音效参考视频重做（现在偏刺耳）。
 * 音效这一条用可测量的指标兜住：读 wav 算频谱，
 * 参考视频的音轨实测是「0~1kHz 占约 65%、1~3kHz 只占 8%、衰减 10~15ms」。
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');

const rec = { texts: [], ops: [] };
function makeCtx() {
  const grad = { addColorStop() {} };
  const base = {
    canvas: { width: 0, height: 0, style: {} },
    globalAlpha: 1,
    measureText(s) { return { width: String(s).length * 15 }; },
    createLinearGradient: () => grad, createRadialGradient: () => grad, createPattern: () => null,
    fillText(s, x, y) { rec.texts.push({ s: String(s), x, y }); },
    fill() { rec.ops.push({ k: 'fill', color: base.fillStyle, a: base.globalAlpha }); },
    stroke() { rec.ops.push({ k: 'stroke', color: base.strokeStyle, a: base.globalAlpha }); },
    arc() {}, moveTo() {}, lineTo() {}, fillRect() {}, strokeRect() {},
    setLineDash() {}, save() {}, restore() {}, beginPath() {}, closePath() {}, arcTo() {},
    bezierCurveTo() {}, quadraticCurveTo() {}, rect() {}, translate() {},
    rotate() {}, scale() {}, clip() {}, drawImage() {}, setTransform() {},
    clearRect() {}, ellipse() {}
  };
  return new Proxy(base, { get(t, k) { return k in t ? t[k] : () => {}; }, set(t, k, v) { t[k] = v; return true; } });
}

let pendingFrame = null;
global.requestAnimationFrame = cb => { pendingFrame = cb; return 1; };
let clock = 0;
function step(ms) { clock += ms; const cb = pendingFrame; pendingFrame = null; if (cb) cb(clock); }

require(path.join(ROOT, 'js/levels.js'));
require(path.join(ROOT, 'js/geom.js'));
require(path.join(ROOT, 'js/judge.js'));
const CFG = require(path.join(ROOT, 'js/config.js'));
const CORE = require(path.join(ROOT, 'js/core.js'));

let fail = 0;
function check(label, ok, detail) {
  if (!ok) fail++;
  console.log(`  [${ok ? 'OK' : 'XX'}] ${label}${detail ? '  ' + detail : ''}`);
}
function section(t) { console.log('\n== ' + t + ' =='); }
const md5 = p => crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex');

const store = {};
const adLog = { rewarded: [] };
const env = {
  ctx: makeCtx(),
  tutorial: false,   // v0.21：这些脚本专测横向系统，关掉第 1 关教学
  size: () => ({ w: 375, h: 812 }),
  dpr: () => 3,
  safeInsets: () => ({ top: 20, bottom: 0 }),
  bindInput(fn) { env._in = fn; },
  storage: { get: k => (k in store ? store[k] : null), set: (k, v) => { store[k] = v; } },
  audio: { unlock() {}, setEnabled() {}, play() {}, duck() {}, setVisible() {}, setScene() {} },
  vibrate() {}, images: {}, share() {}, onHide() {}, onShow() {},
  cloud: { enabled: () => false, init(cb) { setTimeout(() => cb('no-cloud'), 0); },
    load(cb) { setTimeout(() => cb('no-cloud'), 0); },
    save(p, cb) { setTimeout(() => cb(null, {}), 0); },
    rank(t, cb) { setTimeout(() => cb(null, { list: [], me: null }), 0); } },
  ad: { placeholder: true, banner() {}, rewarded(kind, cb) { adLog.rewarded.push(kind); cb(true, ''); } }
};

const SCALE = Math.min(375 / CFG.DESIGN.w, 812 / CFG.DESIGN.h);
function tapD(x, y) {
  const p = [x * SCALE, y * SCALE];
  env._in('down', p[0], p[1]); step(16);
  env._in('up', p[0], p[1]); step(16);
}
const TB = CFG.LAYOUT.TOOLBAR;
const TOOL_TOTAL = 5 * TB.w + 4 * TB.gap;
const HINT_X = CFG.LAYOUT.BOARD.x + (CFG.LAYOUT.BOARD.size - TOOL_TOTAL) / 2 + 3 * (TB.w + TB.gap) + TB.w / 2;
const HINT_Y = TB.y + TB.h / 2;
/* v0.22：面板只在「没有查找道具」时出现，此时只有两行按钮（ch=616）
 * 花 40 巧币 在 top+330、看视频 在 top+434 */
const SHEET_TOP = CFG.DESIGN.h / 2 - 308;
const BTN = { coin: SHEET_TOP + 330, ad: SHEET_TOP + 434 };

/* 把「当前被指的那一块」直接摆到标准解位置（模拟玩家照做） */
function solveHinted(S, lv) {
  if (!S.hint) return false;
  const st = lv.solution.filter(x => x.id === S.hint.id)[0];
  const p = S.pieces.filter(x => x.id === S.hint.id)[0];
  if (!st || !p) return false;
  p.onBoard = true; p.x = st.x; p.y = st.y; p.angle = st.angle; p.flipped = !!st.flipped;
  return true;
}

/* ---------- WAV 频谱（自实现 radix-2 FFT，避免引依赖） ---------- */
function readWav(file) {
  const b = fs.readFileSync(file);
  if (b.slice(0, 4).toString() !== 'RIFF') return null;
  let off = 12, fmt = null, data = null;
  while (off < b.length - 8) {
    const id = b.slice(off, off + 4).toString();
    const size = b.readUInt32LE(off + 4);
    if (id === 'fmt ') fmt = { ch: b.readUInt16LE(off + 10), sr: b.readUInt32LE(off + 12), bits: b.readUInt16LE(off + 22) };
    if (id === 'data') { data = b.slice(off + 8, off + 8 + size); break; }
    off += 8 + size + (size % 2);
  }
  if (!fmt || !data) return null;
  const n = Math.floor(data.length / 2);
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = data.readInt16LE(i * 2) / 32768;
  return { x, sr: fmt.sr, bits: fmt.bits };
}
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k], ui = im[i + k];
        const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + vr; im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
}
function profile(file) {
  const w = readWav(file);
  if (!w) return null;
  const N = 2048, x = w.x;
  const re = new Float64Array(N), im = new Float64Array(N);
  let peak = 0, peakAt = 0;
  for (let i = 0; i < N; i++) {
    const v = i < x.length ? x[i] : 0;
    if (Math.abs(v) > peak) { peak = Math.abs(v); peakAt = i; }
    re[i] = v * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1)));   // Hann
  }
  fft(re, im);
  const half = N / 2, binHz = w.sr / N;
  const mag = new Float64Array(half);
  let sum = 0;
  for (let k = 0; k < half; k++) { mag[k] = Math.hypot(re[k], im[k]); sum += mag[k]; }
  const band = (lo, hi) => {
    let e = 0;
    for (let k = 0; k < half; k++) { const f = k * binHz; if (f >= lo && f < hi) e += mag[k]; }
    return e / (sum || 1);
  };
  let cen = 0;
  for (let k = 0; k < half; k++) cen += k * binHz * mag[k];
  cen /= (sum || 1);
  /* 衰减时长：包络从峰值降到 12% 的时间 */
  let last = peakAt;
  for (let i = peakAt; i < x.length; i++) if (Math.abs(x[i]) > peak * 0.12) last = i;
  return { cen, b0: band(0, 300), b1: band(300, 1000), b2: band(1000, 3000), b3: band(3000, 8000),
    dur: (last - peakAt) / w.sr, sr: w.sr, bits: w.bits, n: x.length };
}

(async function main() {
  console.log('v0.20 验收：提示单档常驻 + 面板小字删除 + 音效重做');
  const game = CORE(env);
  game.init();
  step(16);
  const S = game.state, D = game._debug, H = CFG.HINT;

  /* ================= 1. 配置 ================= */
  section('1. 版本与提示配置');
  check('版本 v0.20 起（v0.21 继续沿用本版规则）', /^v0\.2[0-9](\.\d+)?$/.test(CFG.version), CFG.version);
  check('提示没有档位概念', H.maxTier === undefined && H.names === undefined && H.descs === undefined,
    `maxTier=${H.maxTier} names=${H.names} descs=${H.descs}`);
  check('没有"高亮时长"配置（不再定时消失）', H.showMs === undefined, 'showMs=' + H.showMs);
  check('三个小牌文案齐全', H.labels && H.labels.place === '放这里' &&
    H.labels.move === '移到此处' && H.labels.use === '用这块', JSON.stringify(H.labels));

  /* ================= 2. 面板 ================= */
  section('2. 提示面板：只有一句话，底部两行小字已删');
  D.go('play'); D.setupLevel(0);
  S.save.coin = 300; S.save.hintItems = 0;   // v0.22：有道具就直用，弹面板只在没道具时
  rec.texts.length = 0; step(16);
  tapD(HINT_X, HINT_Y);
  check('点工具栏提示 → 打开面板', S.overlay === 'hint' && !S.hint, `overlay=${S.overlay} hint=${!!S.hint}`);
  const tx = rec.texts.map(t => t.s);
  check('面板标题是「帮你看下一步」', tx.indexOf('帮你看下一步') >= 0, tx.slice(0, 8).join('|'));
  check('说明一行讲清：圈起来的那块放到虚线处', tx.some(s => /圈起来的那块/.test(s) && /虚线/.test(s)),
    tx.filter(s => /圈起来|虚线/.test(s)).join('|'));
  check('不再出现"第 N 档"', !tx.some(s => /第 \d 档/.test(s)), tx.filter(s => /档/.test(s)).join('|'));
  check('不再出现道具来源（在线奖励 / 邀请有礼）',
    !tx.some(s => /在线奖励|邀请有礼|来源/.test(s)), tx.filter(s => /奖励|邀请|来源/.test(s)).join('|'));
  check('不再出现"用提示本关最高 ★★"',
    !tx.some(s => /最高 ★★|★★/.test(s)), tx.filter(s => /★/.test(s)).join('|'));
  check('不再显示巧币 / 道具余量小字（按钮里已经有）',
    !tx.some(s => /^巧币 \d+ · /.test(s)), tx.filter(s => /^巧币/.test(s)).join('|'));
  check('没道具时面板只剩两条付费路径：巧币 / 视频',
    tx.some(s => new RegExp(CFG.HINT.coinCost + ' 巧币').test(s)) && tx.some(s => /看视频/.test(s)),
    tx.slice(-4).join('|'));
  check('面板里不再有禁用的道具按钮（v0.22 改成工具栏直用）',
    !tx.some(s => /查找道具/.test(s)), tx.filter(s => /查找道具/.test(s)).join('|'));

  /* ================= 3. 一次购买 = 一步 ================= */
  section('3. 一次购买 = 一步：哪块、放哪里、常驻');
  D.fireBtn('close_hint'); step(16);
  S.save.hintItems = 2;
  const coin0 = S.save.coin;
  rec.texts.length = 0; rec.ops.length = 0;
  tapD(HINT_X, HINT_Y);
  check('有道具 → 点一下就直接用，不弹面板', S.hintLv === 1 && !!S.hint && S.overlay === null,
    `lv=${S.hintLv} hint=${!!S.hint} overlay=${S.overlay}`);
  check('道具 -1、巧币不动', S.save.hintItems === 1 && S.save.coin === coin0,
    `items=${S.save.hintItems} coin=${coin0}→${S.save.coin}`);
  const lv0 = D.LEVELS[0];
  const firstUnsolved = lv0.solution.filter(st => {
    const p = S.pieces.filter(x => x.id === st.id)[0];
    return !(p && p.onBoard && Math.abs(p.x - st.x) <= 1 && Math.abs(p.y - st.y) <= 1 &&
      Math.abs(((p.angle - st.angle) % 360 + 540) % 360 - 180) <= 1 && !!p.flipped === !!st.flipped);
  })[0];
  check('指向的就是"下一块该放的那块"', !!firstUnsolved && S.hint.id === firstUnsolved.id,
    `hint=${S.hint.id} expect=${firstUnsolved && firstUnsolved.id}`);
  check('同屏画出「放这里」（落点）', rec.texts.some(t => t.s === '放这里'),
    rec.texts.map(t => t.s).filter(x => /这里|这块|此处/.test(x)).join('|'));
  check('同屏画出「用这块」（托盘里那块）', rec.texts.some(t => t.s === '用这块'));
  check('hint 上没有 tier / until', S.hint.tier === undefined && S.hint.until === undefined,
    JSON.stringify(S.hint));

  for (let i = 0; i < 24; i++) step(500);          // 快进 12 秒
  check('快进 12 秒提示仍在（旧版 3.5 秒消失）', !!S.hint && S.hint.id === firstUnsolved.id,
    'hint=' + (S.hint && S.hint.id));

  const lvGuard = S.hintLv, coinGuard = S.save.coin, itemsGuard = S.save.hintItems;
  tapD(HINT_X, HINT_Y);
  check('提示还亮着 → 再点不扣道具、也不弹面板，只提醒先放上去',
    S.hintLv === lvGuard && S.save.coin === coinGuard && S.save.hintItems === itemsGuard &&
    S.overlay === null && S.toast && /标出来了/.test(S.toast.text),
    `lv=${S.hintLv} items=${S.save.hintItems} toast=${S.toast && S.toast.text}`);

  solveHinted(S, lv0); step(16);
  check('那一块放对 → 提示收起', !S.hint, 'hint=' + JSON.stringify(S.hint));

  /* 道具用光/没有道具时，点工具栏才进面板 */
  S.save.hintItems = 0;
  tapD(HINT_X, HINT_Y);
  check('没有道具 → 弹面板', S.overlay === 'hint', 'overlay=' + S.overlay);
  const coin1 = S.save.coin;
  tapD(CFG.DESIGN.w / 2, BTN.coin);
  check('花 ' + CFG.HINT.coinCost + ' 巧币 → 指下一块', S.hintLv === 2 && !!S.hint && S.hint.id !== firstUnsolved.id,
    `lv=${S.hintLv} hint=${S.hint && S.hint.id}`);
  check('巧币扣 ' + CFG.HINT.coinCost, S.save.coin === coin1 - CFG.HINT.coinCost, `${coin1}→${S.save.coin}`);

  /* 广告这条 */
  D.fireBtn('close_hint'); step(16);
  solveHinted(S, lv0); step(16);
  S.save.hintItems = 0;
  tapD(HINT_X, HINT_Y); step(16);
  tapD(CFG.DESIGN.w / 2, BTN.ad);
  check('看视频 → 第三次提示', S.hintLv === 3 && !!S.hint, `lv=${S.hintLv} hint=${!!S.hint}`);
  check('激励视频类型是 hint', adLog.rewarded[adLog.rewarded.length - 1] === 'hint',
    JSON.stringify(adLog.rewarded));

  /* ================= 4. 摆歪的那块：圈出来 + 箭头 + 移到此处 ================= */
  section('4. 已上板但摆歪：圈出那块 + 箭头指向虚线处');
  D.setupLevel(0);
  const lv1 = D.LEVELS[0];
  const pz0 = S.pieces[0], st0 = lv1.solution.filter(s => s.id === pz0.id)[0];
  pz0.onBoard = true; pz0.x = st0.x + 90; pz0.y = st0.y + 60;   // 摆歪
  S.hint = { id: pz0.id, t: 0 };
  rec.texts.length = 0; rec.ops.length = 0;
  step(16);
  check('小牌写「移到此处」', rec.texts.some(t => t.s === '移到此处'),
    rec.texts.map(t => t.s).filter(x => /这里|这块|此处/.test(x)).join('|'));
  check('不再画「用这块」（那块不在托盘）', !rec.texts.some(t => t.s === '用这块'));
  check('画了箭头/引导线（金色或橙色描边存在）',
    rec.ops.some(o => o.k === 'stroke' && /255,\s*1[59]9|255,\s*185/.test(String(o.color))),
    rec.ops.filter(o => o.k === 'stroke').slice(0, 4).map(o => o.color).join(' | '));

  /* ================= 5. 音效 ================= */
  section('5. 音效：低频为主、无方波、衰减极短');
  const gPrev = fs.readFileSync(path.join(ROOT, 'preview/js/game.js'), 'utf8');
  const gMp = fs.readFileSync(path.join(ROOT, 'miniprogram/game.js'), 'utf8');
  check('两端都不再用 square 波', gPrev.indexOf("'square'") < 0 && gMp.indexOf("'square'") < 0);
  check('两端都没有旧的 1500 / 2600Hz 噪声',
    !/noise\(\s*0\.0\d+,\s*0\.\d+,\s*(1500|2600)/.test(gPrev) &&
    !/noiseBurst\(\s*0\.0\d+,\s*0\.\d+,\s*(1500|2600)/.test(gMp));
  /* v0.28 起音效改为「配置驱动」：SFX_BASE.snap = {f,d,g,to,f2,d2,g2}，
   * buildSfxSynth() 按风格缩放播放，源码里不再有硬编码的 tone(196,...,147)。
   * v0.20 的旧正则因此失效（实现本身没退化）。验证意图保持不变：
   * 吸附音必须是 196→147Hz 低频下滑 + 98Hz 的「笃」，且两端一致；
   * 下方还有对 sfx_snap.wav 的实测频谱断言（0~300Hz 占比、衰减、高频占比）。 */
  const snapCfg = s => {
    const m = s.match(/snap:\s*\{([^}]*)\}/);
    if (!m) return null;
    const num = k => {
      const x = m[1].match(new RegExp('\\b' + k + ':\\s*([0-9.]+)'));
      return x ? +x[1] : null;
    };
    return { f: num('f'), to: num('to'), f2: num('f2') };
  };
  const snapPrev = snapCfg(gPrev), snapMp = snapCfg(gMp);
  const snapOk = c => !!c && c.f === 196 && c.to === 147 && c.f2 === 98;
  check('吸附音改成低频下滑（196→147 + 98Hz，配置驱动）',
    snapOk(snapPrev) && snapOk(snapMp),
    snapPrev && snapMp
      ? `preview ${snapPrev.f}→${snapPrev.to}+${snapPrev.f2}Hz / miniprogram ${snapMp.f}→${snapMp.to}+${snapMp.f2}Hz`
      : '未找到 SFX_BASE.snap 配置');
  check('通关音去掉了 1568Hz 的高频冠音', gPrev.indexOf('1567.98') < 0 && gMp.indexOf('1567.98') < 0);
  check('通关音仍保留 242ms 顶点（鲜花动效对齐）',
    /0\.242/.test(gPrev) && /0\.242/.test(gMp));

  for (const f of ['sfx_tap.wav', 'sfx_pick.wav', 'sfx_snap.wav']) {
    const a = path.join(ROOT, 'preview/assets/audio', f);
    const b = path.join(ROOT, 'miniprogram/assets/audio', f);
    check('两包音效一致 ' + f, md5(a) === md5(b));
    const p = profile(a);
    check('能读出 ' + f, !!p, p ? `${p.sr}Hz/${p.bits}bit` : 'read fail');
    if (!p) continue;
    check(f + ' 衰减 < 0.12s（短促不拖尾）', p.dur < 0.12, 'dur=' + p.dur.toFixed(3) + 's');
    check(f + ' 高频占比低（1~3kHz < 15%）', p.b2 < 0.15,
      `1-3k=${(p.b2 * 100).toFixed(1)}% 3-8k=${(p.b3 * 100).toFixed(1)}%`);
    check(f + ' 能量集中在 1kHz 以下', p.b0 + p.b1 > 0.75,
      `0-300=${(p.b0 * 100).toFixed(0)}% 300-1k=${(p.b1 * 100).toFixed(0)}%`);
  }
  const snapP = profile(path.join(ROOT, 'preview/assets/audio/sfx_snap.wav'));
  check('吸附音是"低频笃"（0~300Hz 占一半以上）', snapP && snapP.b0 > 0.5,
    snapP ? `0-300=${(snapP.b0 * 100).toFixed(0)}%` : 'n/a');

  /* ================= 6. 三端一致 ================= */
  section('6. 三端一致与包体');
  const mods = ['config.js', 'core.js', 'geom.js', 'judge.js', 'levels.js'];
  for (const m of mods) {
    const a = path.join(ROOT, 'js', m);
    check(m + ' 三端一致',
      md5(a) === md5(path.join(ROOT, 'preview/js', m)) && md5(a) === md5(path.join(ROOT, 'miniprogram/js', m)),
      md5(a).slice(0, 8));
  }
  let bytes = 0;
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'cloudfunctions' || e.name === '.git' || e.name === '.cloudbase') continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p); else bytes += fs.statSync(p).size;
    }
  })(path.join(ROOT, 'miniprogram'));
  check('主包 < 4MB', bytes / 1048576 < 4, (bytes / 1048576).toFixed(2) + 'MB');

  console.log('\n' + (fail === 0 ? 'v0.20 验收全部通过' : `!! ${fail} 项未通过`));
  process.exit(fail === 0 ? 0 : 1);
})();
