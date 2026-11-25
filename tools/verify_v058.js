/* v0.58 验收：乐器化音效 + 彩带/玫瑰花瓣/蝴蝶
 *
 * 这版改的是「听感」和「观感」，没有新增数据，所以验收分两路：
 *   A. 音效 —— 不靠读源码猜，直接把 preview/js/game.js 里的合成引擎
 *      （SFX_BASE / SFX_MAT / strike）整段抽出来，用假的 AudioContext 真跑一遍，
 *      断言 8 种风格都真的排了振子、挂上了琴体滤波、分音比符合乐器模态。
 *   B. 动画 —— 彩带必须「由少到多」（四波片数递增）、落速必须比弹道模型慢、
 *      鲜花绘制必须已被玫瑰花瓣 + 蝴蝶替换。
 * 用法：node tools/verify_v058.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
require(path.join(ROOT, 'js/config.js'));
const CFG = globalThis.TANGRAM_CONFIG;

let fail = 0;
function check(label, ok, detail) {
  if (!ok) fail++;
  console.log(`  [${ok ? 'OK' : 'XX'}] ${label}${detail ? '  ' + detail : ''}`);
}
function section(t) { console.log('\n== ' + t + ' =='); }

/* ---------- 假 AudioContext：记录每一个节点 ---------- */
function mkParam(v, log) {
  return {
    value: v, events: log,
    setValueAtTime(x, t) { log.push(['set', x, t]); this.value = x; return this; },
    linearRampToValueAtTime(x, t) { log.push(['lin', x, t]); this.value = x; return this; },
    exponentialRampToValueAtTime(x, t) { log.push(['exp', x, t]); this.value = x; return this; },
    setTargetAtTime(x, t) { log.push(['tgt', x, t]); this.value = x; return this; },
    cancelScheduledValues() { return this; }
  };
}
function mkAC() {
  const rec = { osc: [], filters: [], gains: [] };
  const AC = {
    currentTime: 0, sampleRate: 44100, state: 'running',
    createGain: () => {
      const glog = [];
      const g = { gain: mkParam(1, glog), connect() {}, disconnect() {}, _g: true, _log: glog };
      rec.gains.push(g);
      return g;
    },
    createOscillator: () => {
      const o = {
        type: 'sine', frequency: mkParam(0, []), detune: mkParam(0, []),
        connect() {}, disconnect() {}, start(t) { o._start = t; }, stop(t) { o._stop = t; }
      };
      rec.osc.push(o);
      return o;
    },
    createBiquadFilter: () => {
      const f = { type: 'lowpass', frequency: mkParam(1000, []), Q: mkParam(1, []), connect() {}, disconnect() {} };
      rec.filters.push(f);
      return f;
    },
    createBuffer: (ch, len) => ({ getChannelData: () => new Float32Array(len) }),
    createBufferSource: () => ({
      buffer: null, loop: false, playbackRate: mkParam(1, []),
      connect() {}, disconnect() {}, start() {}, stop() {}
    })
  };
  return { AC, rec };
}

/* 把真实引擎整段抽出来执行（不是复制一份，避免实现漂移） */
function loadEngine(file) {
  const src = fs.readFileSync(file, 'utf8');
  const a = src.indexOf('var SFX_BASE');
  const b = src.indexOf('function buildSfxSynth');
  if (a < 0 || b < 0) throw new Error('引擎段落找不到：' + file);
  const code = src.slice(a, b);
  const { AC, rec } = mkAC();
  let clicks = 0;
  const noise = function () { clicks++; };
  const masterGain = { connect() {}, disconnect() {} };
  const factory = new Function('AC', 'masterGain', 'noise',
    code + '\n return { SFX_MAT: SFX_MAT, SFX_BASE: SFX_BASE, strike: strike };');
  const api = factory(AC, masterGain, noise);
  return { api, rec, clicks: () => clicks, AC };
}

const PREV = path.join(ROOT, 'preview/js/game.js');
const MINI = path.join(ROOT, 'miniprogram/game.js');

/* ================= A. 音效 ================= */
section('A1. 两端合成引擎一致（除噪声函数名）');
const prevTxt = fs.readFileSync(PREV, 'utf8');
const miniTxt = fs.readFileSync(MINI, 'utf8');
const norm = t => t.replace(/noiseBurst\(/g, 'noise(');
check('preview / miniprogram 的 SFX_MAT 完全一致',
  prevTxt.slice(prevTxt.indexOf('var SFX_MAT'), prevTxt.indexOf('function buildSfxSynth')) ===
  norm(miniTxt).slice(norm(miniTxt).indexOf('var SFX_MAT'), norm(miniTxt).indexOf('function buildSfxSynth')));

const eng = loadEngine(PREV);
const MAT = eng.api.SFX_MAT;
const STYLES = Object.keys(CFG.SFX_STYLES);

section('A2. 八种风格都真的发声（不是静音/半死）');
STYLES.forEach(k => {
  const st = CFG.SFX_STYLES[k];
  const mat = MAT[k];
  if (!mat) { check(k + ' 有材质表', false); return; }
  eng.rec.osc.length = 0; eng.rec.filters.length = 0; eng.rec.gains.length = 0;
  const f0 = eng.api.SFX_BASE.snap.f * (st.pitch || 1);
  const dur = eng.api.SFX_BASE.snap.d * (st.decay || 1);
  eng.api.strike(f0, dur, 0.22, mat, st.wave, 0);
  const osc = eng.rec.osc.length;
  const flt = eng.rec.filters.length;
  const freqOk = eng.rec.osc.every(o => o.frequency.value > 15 && o.frequency.value < 22000);
  const timeOk = eng.rec.osc.every(o => o._start !== undefined && o._stop > o._start);
  /* 峰值：所有分音振幅相加（最坏情况同时起振），超过 1.0 在 masterGain=1 时会削波 */
  /* 最坏情况峰值 = 各分音「起振振幅」之和（每个 gain 取它自己的最大值） */
  let peak = 0;
  eng.rec.gains.forEach(g => {
    if (!g._g) return;
    let mx = 0;
    g._log.forEach(e => { if (e[1] > mx) mx = e[1]; });
    peak += mx;
  });
  check(`${k} 排了振子且有琴体滤波`,
    osc >= 2 && flt === 1 && freqOk && timeOk && peak < 1.0,
    `输出 ${osc} 振子 / ${flt} 滤波 / 峰值 ${peak.toFixed(2)} / 时长 ${dur.toFixed(2)}s`);
});

section('A3. 分音比符合乐器振动模态');
const ratios = k => (MAT[k] ? MAT[k].p.map(x => x[0]) : []);
const near = (arr, v, tol) => arr.some(x => Math.abs(x - v) <= (tol || 0.05));
check('木质：非谐（2.42 / 4.11）+ 半频 0.50', near(ratios('wood'), 2.42) && near(ratios('wood'), 4.11) && near(ratios('wood'), 0.50));
check('青铜钟：hum .50 / tierce 1.19 / quint 1.51 / nominal 2.0',
  near(ratios('bell'), 0.50) && near(ratios('bell'), 1.19) && near(ratios('bell'), 1.51) && near(ratios('bell'), 2.0));
check('马林巴：1 : 4 : 10 调音', near(ratios('marimba'), 4.0) && near(ratios('marimba'), 9.9));
check('风铃：极端非谐 2.76 / 5.40 / 8.93',
  near(ratios('chime'), 2.76) && near(ratios('chime'), 5.40) && near(ratios('chime'), 8.93));
check('水滴 / 泡泡：音高向上滑（glide > 0）', MAT.water.glide > 0.2 && MAT.bubble.glide > 0.2,
  `water ${MAT.water.glide} / bubble ${MAT.bubble.glide}`);
check('木质 / 马林巴：音高微降（敲击的"落"感）', MAT.wood.glide < 0 && MAT.marimba.glide < 0);
check('复古是 8bit 方波、合成器是锯齿波', MAT.retro.wave === 'square' && MAT.synth.wave === 'sawtooth');

section('A4. 钟 / 风铃有拍频（成对失谐分音）');
['bell', 'chime'].forEach(k => {
  eng.rec.osc.length = 0;
  eng.api.strike(660, 0.3, 0.1, MAT[k], 'sine', 0);
  const det = eng.rec.osc.map(o => o.detune.value).filter(v => v !== 0);
  check(`${k} 前 3 个主分音各有一枚失谐副本`, det.length === 3 && det.every(v => v > 0 && v < 20),
    '失谐 ' + det.join('/') + ' 音分');
});

section('A5. 合成器的滤波器包络（减法合成的灵魂）');
eng.rec.filters.length = 0;
eng.api.strike(170, 0.26, 0.2, MAT.synth, 'sawtooth', 0);
const sf = eng.rec.filters[0];
const fev = sf ? sf.frequency.events : [];
check('低通截止有「起始值 → 指数扫到低」两段',
  fev.length >= 2 && fev[fev.length - 1][0] === 'exp' && fev[fev.length - 1][1] < fev[0][1],
  fev.map(e => e[0] + '@' + Math.round(e[1])).join(' '));

section('A6. 木质 / 马林巴的低频冲击（重量感）');
[['wood', MAT.wood], ['marimba', MAT.marimba]].forEach(([k, mat]) => {
  eng.rec.osc.length = 0;
  eng.api.strike(198, 0.26, 0.22, mat, 'triangle', 0);
  /* 看起振那一刻的频率（后续 ramp 会把 .value 改成终点值） */
  const thump = eng.rec.osc.filter(o => {
    const ev = o.frequency.events[0];
    return ev && Math.abs(ev[1] - 99) < 2;
  });
  /* 木质表里本来就有一枚 0.50 的半分音，也会落在 99Hz，所以这里只要「至少一枚
   * 从 99Hz 往下滑」即可 —— 关键是那声下滑的冲击存在。 */
  const drops = thump.some(o => o.frequency.events.some(e => e[0] === 'exp' && e[1] < 99));
  check(`${k} 有 0.5×f0 的下滑冲击`, thump.length >= 1 && drops, `${thump.length} 枚`);
});

section('A7. 通关音 / 失败音');
check('通关音是 C–E–G–C 四个钟音 + 低八度收尾',
  /var ns = \[523\.25, 659\.25, 783\.99, 1046\.50\]/.test(prevTxt) &&
  /strike\(261\.63,\s*0\.6/.test(prevTxt));
check('失败音仍是木质闷音（不随风格变清脆）',
  /sfx_fail: function \(\) \{ strike\(168, 0\.26, 0\.14, SFX_MAT\.wood, 'sine'\); \}/.test(prevTxt));
check('通关音的余音交给 bell 的 ring，不被 1.1s 截断',
  /strike\(ns\[i\], 0\.42, 0\.11 - i \* 0\.005, SFX_MAT\.bell/.test(prevTxt));

/* ================= B. 动画 ================= */
section('B1. 彩带：由少到多 + 慢');
const CF = CFG.WIN_FX;
const ns = CF.waves.map(w => w.n);
check('四波片数严格递增（少量 → 大量）',
  ns.length === 4 && ns.every((v, i) => i === 0 || v > ns[i - 1]), ns.join(' → '));
check('首波是「一小把」（≤ 20 片）', ns[0] <= 20, ns[0] + ' 片');
check('终端落速 < 400px/s（弹道模型约 1750）', CF.terminal < 400, CF.terminal + 'px/s');
check('总时长 ≥ 8s（原来 3.6s）', CF.life >= 8000, CF.life + 'ms');
check('波次时间铺开在前 1.5s', CF.waves[CF.waves.length - 1].at <= 1500,
  CF.waves.map(w => w.at).join('/') + 'ms');

const coreTxt = fs.readFileSync(path.join(ROOT, 'js/core.js'), 'utf8');
check('彩带用空气阻力模型（1-e^{-kt}）而不是纯弹道',
  /1 - Math\.exp\(-k \* tt\)/.test(coreTxt) && !/0\.5 \* GR \* tt \* tt/.test(coreTxt));
check('每片有翻面相位 + 正反面明暗差', /flip0/.test(coreTxt) && /cf < 0 \? 0\.86 : 1/.test(coreTxt));

section('B2. 鲜花已换成玫瑰花瓣 + 蝴蝶');
check('有玫瑰花瓣绘制函数（凹口 + 卷边 + 高光）',
  /function drawRosePetal/.test(coreTxt) && /左波峰/.test(coreTxt) && /内卷暗面/.test(coreTxt));
check('有蝴蝶绘制函数（前翅 + 后翅 + 身体 + 触角）',
  /function drawButterfly/.test(coreTxt) && /前翅/.test(coreTxt) && /后翅/.test(coreTxt) && /触角/.test(coreTxt));
check('旧的程序化鲜花已删除', !/function drawFlower\b/.test(coreTxt) && !/function flowerState/.test(coreTxt));
check('通关瞬间有花瓣剧本（含蝴蝶）',
  /function makePetalScene/.test(coreTxt) && /butterflies/.test(coreTxt) && /state\.petalScene = makePetalScene/.test(coreTxt));
check('结算期的飘落粒子包含蝴蝶（不只是花瓣）',
  /kind: bfly \? 'bfly' : 'petal'/.test(coreTxt) && /p\.kind === 'bfly'/.test(coreTxt));
check('花瓣有 3D 翻面（cos(flip) 控制横向缩放）',
  /Math\.cos\(p\.flip0 \+ p\.flipV \* tt\)/.test(coreTxt));

console.log('\n' + (fail ? `!! ${fail} 项未通过` : '[OK] v0.58 验收通过（乐器化音效 + 彩带/花瓣/蝴蝶）'));
process.exit(fail ? 1 : 0);
