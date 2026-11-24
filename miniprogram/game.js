/* 方寸巧拼 · 微信小游戏平台适配层
 * 只做「wx.* ↔ 核心」的桥：Canvas / 尺寸 / 安全区 / 触摸 / 存档 / 音频 / 震动 / 图片
 * 核心逻辑全部在 js/core.js，两端同源。
 */
'use strict';

var CONFIG = require('./js/config.js');
var geom = require('./js/geom.js');
var judge = require('./js/judge.js');
var data = require('./js/levels.js');
var core = require('./js/core.js');
var cloudLib = require('./js/cloud.js');     // v0.9：微信登录 + 云存档 + 真实榜单
var profileLib = require('./js/wxprofile.js'); // v0.14：微信昵称 / 头像（原生授权按钮）
var friendLib = require('./js/friendrank.js'); // v0.18：好友榜（开放数据域 + 微信托管数据）
var adLib = require('./js/ad.js');           // v0.9：banner / 激励视频 / 插屏

/* ---------------- 画布 ---------------- */
var canvas = wx.createCanvas();
var ctx = canvas.getContext('2d');

/* ---------------- 系统信息（新旧 API 兼容） ---------------- */
function sysInfo() {
  var info = null;
  try {
    if (wx.getWindowInfo) info = wx.getWindowInfo();
    else info = wx.getSystemInfoSync();
  } catch (e) {
    info = { windowWidth: 375, windowHeight: 667, pixelRatio: 2, safeArea: null };
  }
  return info;
}

function viewportSize() {
  var i = sysInfo();
  return { w: i.windowWidth || 375, h: i.windowHeight || 667 };
}
function dpr() {
  var i = sysInfo();
  return Math.min(i.pixelRatio || 1, 3);
}
function safeInsets() {
  var i = sysInfo();
  var sa = i.safeArea;
  if (!sa) return { top: 0, bottom: 0 };
  var sh = i.screenHeight || i.windowHeight || 0;
  return {
    top: sa.top || 0,
    bottom: Math.max(0, (i.screenHeight || sh) - (sa.bottom || 0))
  };
}

/* ---------------- 存档（同步 API） ---------------- */
var memStore = {};
var storage = {
  get: function (k) {
    try { var v = wx.getStorageSync(k); return v === '' || v === undefined ? (memStore[k] || null) : v; }
    catch (e) { return memStore[k] || null; }
  },
  set: function (k, v) {
    try { wx.setStorageSync(k, v); } catch (e) { memStore[k] = v; }
  }
};

/* ---------------- 音频 ----------------
 * 首选 wx.createWebAudioContext + decodeAudioData：低延迟、可精确循环、可变调。
 * 不可用 / 解码失败 → wx.createInnerAudioContext 元素池兜底（延迟略高但能出声）。
 * 全部失败 → Web Audio 合成兜底。任何一步失败都不抛异常。
 * iOS 静音键：obeyMuteSwitch 必须关掉，否则用户开静音就听不见。
 */
var AC = null, masterGain = null, bgmGain = null, bgmSrc = null;
var buf = {}, pool = {}, poolIdx = {};
var enabled = { sfx: true, bgm: true };
var ducked = false, snapVoices = 0, lastTapAt = 0;
var unlocked = false, buffersReady = false, loadedOk = 0, elementMode = false;
var bgmStarted = false;

try { if (wx.setInnerAudioOption) wx.setInnerAudioOption({ obeyMuteSwitch: false, mixWithOther: true }); } catch (e) {}

function initAudio() {
  if (AC) return;
  try {
    if (wx.createWebAudioContext) {
      AC = wx.createWebAudioContext();
      masterGain = AC.createGain();
      masterGain.gain.value = 1;
      masterGain.connect(AC.destination);
      bgmGain = AC.createGain();
      bgmGain.gain.value = 0;
    /* v0.7：合成 BGM 音符振幅提高后挂一道软限幅兜住瞬态，避免破音；
     * 没有 createDynamicsCompressor 时静默回退直连。 */
    var bgmBus = masterGain;
    try {
      if (AC.createDynamicsCompressor) {
        var lim = AC.createDynamicsCompressor();
        lim.threshold.value = -7;
        lim.knee.value = 8;
        lim.ratio.value = 6;
        lim.attack.value = 0.005;
        lim.release.value = 0.28;
        lim.connect(masterGain);
        bgmBus = lim;
      }
    } catch (e) { bgmBus = masterGain; }
    bgmGain.connect(bgmBus);
    }
  } catch (e) { AC = null; }
}

function tone(freq, dur, type, gain, delay, slideTo) {
  if (!AC) return;
  try {
    var t0 = AC.currentTime + (delay || 0);
    var o = AC.createOscillator();
    var g = AC.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain || 0.2, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(masterGain);
    o.start(t0); o.stop(t0 + dur + 0.02);
  } catch (e) {}
}
function noiseBurst(dur, gain, filterFreq, delay) {
  if (!AC) return;
  try {
    var t0 = AC.currentTime + (delay || 0);
    var n = Math.floor(AC.sampleRate * dur);
    var buf2 = AC.createBuffer(1, n, AC.sampleRate);
    var d = buf2.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.5);
    var src = AC.createBufferSource();
    src.buffer = buf2;
    var bp = AC.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = filterFreq || 1800; bp.Q.value = 1.1;
    var g = AC.createGain();
    g.gain.value = gain || 0.18;
    src.connect(bp); bp.connect(g); g.connect(masterGain);
    src.start(t0);
  } catch (e) {}
}

/* ---------- v0.31 音效引擎：模态合成（modal synthesis） ----------
 * 旧版每个操作音是「两个正弦 + 6ms 指数渐入」，听起来"假"的两个根因：
 *   ① 只有 2 个分音 —— 真实物体被敲击是一组非谐分音同时衰减（木、玻璃、金属各不相同）；
 *   ② 没有瞬态 —— 软起音听不到"碰上了"的那一下，耳朵会直接判定为电子音。
 * 新引擎：一组非谐分音（各自独立衰减）+ 1.5~3ms 带通噪声瞬态 + 音高微滑。
 * 材质表 SFX_MAT 同时服务 8 种音效风格；默认「木质」优先播 v0.31 重制的 wav
 * （生成脚本 tools/sfx_build.py），合成只在缺素材 / 换风格时兜底。 */
var SFX_BASE = {
  tap:  { f: 660, d: 0.10, g: 0.11 },
  pick: { f: 392, d: 0.14, g: 0.15 },
  snap: { f: 198, d: 0.26, g: 0.22 }
};
/* p: [分音比, 振幅, 衰减时间]；click/hz/tau: 瞬态强度/中心频率/时长；glide: 音高滑移（负=下坠） */
var SFX_MAT = {
  wood:    { p: [[1, 1, .048], [2.02, .52, .030], [3.05, .26, .018], [.50, .40, .062]], click: .50, hz: 2400, tau: .0022, glide: -.05 },
  bell:    { p: [[1, 1, .90], [2.00, .48, .55], [2.76, .42, .44], [5.40, .18, .22], [8.16, .08, .12]], click: .12, hz: 7000, tau: .0015, glide: 0 },
  water:   { p: [[1, 1, .16], [1.50, .34, .10], [2.70, .18, .06]], click: .30, hz: 3000, tau: .0018, glide: .22 },
  retro:   { p: [[1, 1, .14], [2.00, .40, .09], [3.00, .20, .05]], click: .10, hz: 5000, tau: .0012, glide: 0 },
  chime:   { p: [[1, 1, 1.30], [2.01, .30, .90], [3.93, .18, .60], [6.80, .08, .35]], click: .06, hz: 8000, tau: .0015, glide: 0 },
  marimba: { p: [[1, 1, .34], [3.93, .34, .12], [9.20, .14, .05]], click: .26, hz: 1800, tau: .0020, glide: -.02 },
  bubble:  { p: [[1, 1, .10], [2.20, .30, .05]], click: .26, hz: 2500, tau: .0016, glide: .38 },
  synth:   { p: [[1, 1, .20], [2.00, .45, .12], [4.00, .20, .07]], click: .06, hz: 4200, tau: .0014, glide: 0 }
};

/* 一次敲击：分音组 + 瞬态。delay 用于琶音排程。 */
function strike(f0, dur, gain, mat, wave, delay) {
  if (!AC) return;
  var t0 = AC.currentTime + (delay || 0);
  for (var i = 0; i < mat.p.length; i++) {
    var r = mat.p[i][0], a = mat.p[i][1], tau = mat.p[i][2];
    try {
      var o = AC.createOscillator(), g = AC.createGain();
      o.type = (wave && wave !== 'sine') ? wave : 'sine';
      o.frequency.setValueAtTime(f0 * r, t0);
      if (mat.glide) {
        o.frequency.exponentialRampToValueAtTime(Math.max(20, f0 * r * (1 + mat.glide)), t0 + 0.06);
      }
      var life = Math.min(dur, Math.max(0.05, tau * 4.5));
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0004, gain * a), t0 + 0.0012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + life);
      o.connect(g); g.connect(masterGain);
      o.start(t0); o.stop(t0 + life + 0.02);
    } catch (e) {}
  }
  if (mat.click > 0) noiseBurst(mat.tau * 3, gain * mat.click * 0.5, mat.hz, delay);
}

function buildSfxSynth(key) {
  var st = (CONFIG.SFX_STYLES && CONFIG.SFX_STYLES[key]) ||
    (CONFIG.SFX_STYLES && CONFIG.SFX_STYLES.wood) || { pitch: 1, decay: 1, wave: 'sine' };
  var mat = SFX_MAT[key] || SFX_MAT.wood;
  var p = st.pitch || 1, d = st.decay || 1, w = st.wave;
  return {
    sfx_tap:  function () { strike(SFX_BASE.tap.f * p, SFX_BASE.tap.d * d, SFX_BASE.tap.g, mat, w); },
    sfx_pick: function () { strike(SFX_BASE.pick.f * p, SFX_BASE.pick.d * d, SFX_BASE.pick.g, mat, w); },
    sfx_snap: function () { strike(SFX_BASE.snap.f * p, SFX_BASE.snap.d * d, SFX_BASE.snap.g, mat, w); },
    /* 失败音永远是「闷」的木质：换风格也不该把"拼错了"变成清脆铃音 */
    sfx_fail: function () { strike(168, 0.26, 0.14, SFX_MAT.wood, 'sine'); },
    /* 通关琶音：C5-E5-G5-C6 钟琴分音，尾巴接鲜花动效（素材缺失时兜底） */
    sfx_win: function () {
      var ns = [523.25, 659.25, 783.99, 1046.50];
      for (var i = 0; i < ns.length; i++) {
        strike(ns[i], 1.1, 0.11 - i * 0.005, SFX_MAT.bell, 'sine', i * 0.085);
      }
      strike(261.63, 1.3, 0.06, SFX_MAT.bell, 'sine', 0.255);
    },
    /* v0.48 时间到（超时失败）：A 小调下行 A4→F4→D4→A3，每音 0.19s 错开，
     * 尾巴补一个 A2 闷音收句。和 sfx_win 一样属于"情绪表达"，不随木质/铃音
     * 等材质风格切换，也不读 wav 素材（纯合成，零文件）。总长约 1.55s。 */
    sfx_timeup: function () {
      var ns = [440.00, 349.23, 293.66, 220.00];
      for (var i = 0; i < ns.length; i++) {
        strike(ns[i], 0.46, 0.13 - i * 0.014, SFX_MAT.bell, 'sine', i * 0.19);
      }
      strike(110.00, 1.05, 0.09, SFX_MAT.wood, 'sine', 0.62);
    }
  };
}
var synth = buildSfxSynth('wood');
var sfxStyleKey = 'wood';


/* 包内路径：文件系统 API 不接受前导 './' */
function pkgPath(name) {
  return (CONFIG.AUDIO.base + (CONFIG.AUDIO.files[name] || '')).replace(/^\.\//, '');
}

function decode(ab, cb) {
  var done = false;
  function ok(b) { if (done) return; done = true; cb(b || null); }
  try {
    var ret = AC.decodeAudioData(ab, ok, function () { ok(null); });
    if (ret && ret.then) ret.then(ok, function () { ok(null); });
  } catch (e) { ok(null); }
}

function loadBuffers() {
  if (!CONFIG.AUDIO.enabled || !AC || buffersReady) return;
  var names = Object.keys(CONFIG.AUDIO.files);
  var left = names.length;
  if (!left) { buffersReady = true; elementMode = true; return; }
  function settle(got) {
    if (got) loadedOk++;
    if (--left > 0) return;
    buffersReady = true;
    elementMode = loadedOk === 0;
    startBgm();
  }
  names.forEach(function (name) {
    var ab = null;
    try {
      ab = wx.getFileSystemManager().readFileSync(pkgPath(name));
    } catch (e) { ab = null; }
    if (!ab) { settle(false); return; }
    decode(ab, function (b) { if (b) buf[name] = b; settle(!!b); });
  });
}

/* ---------------- v0.13 主页轻音乐（合成，零音频文件） ----------------
 * 四个声部按 8 小节谱排程：低音 / 和弦轻扫 / 八分琶音 / 主旋律，谱在 CONFIG.AUDIO.home。
 * 中间多一个闸门 homeGate 是为了"切场景立刻静音"：振荡器是提前一小节排进
 * 时间轴的，只 clearInterval 拦不住已排好的音，会再响一整小节（2.4s）。
 * 闸门归零 + 硬停振荡器，才能做到进关卡时主页曲当场消失。 */
var HOME_OSC = [], homeGate = null, homeLead = null, homeSeq = null;
/* v0.47：上一代正在淡出的振荡器。旧版 homeStop 把 stop() 挂在 190ms 的定时器上，
 * 这段时间里如果又 homeStart（快速进出主页 / 关卡列表来回切），闸门被拉回 1，
 * 上一代已经排进时间轴的一整小节会**重新出声**，和新排的那小节叠在一起 ——
 * 用户听到的就是"两首主页曲同时放，隔一会儿又好了"。现在这一代先挂在这里，
 * 下一次 homeStart 打开闸门之前必须先把它们同步停掉（flushHomeDead）。 */
var homeDead = [], homeDeadTimer = 0;

/* 把上一代彻底停掉（同步）。stop() 不带参数 = 立刻停：
 * 那些还没到开声时刻的音符，start 在 stop 之后，等于永远不出声。 */
function flushHomeDead() {
  if (homeDeadTimer) { clearTimeout(homeDeadTimer); homeDeadTimer = 0; }
  var list = homeDead;
  homeDead = [];
  for (var i = 0; i < list.length; i++) { try { list[i].stop(); } catch (e) {} }
}

/* 当前这一代里还有多少音"在时间轴上"（尚未到 stop 时刻）—— 供验收断言用 */
function homeOscLive() {
  if (!AC) return 0;
  var now = AC.currentTime, n = 0;
  for (var i = 0; i < HOME_OSC.length; i++) {
    if ((HOME_OSC[i]._end || 0) > now) n++;
  }
  return n;
}

/* v0.14.2：WebAudio 会被系统挂起 —— 回主页没声音的根因
 *
 * 现象：第一次进主页有音乐 → 进关卡（InnerAudioContext 播 mp3）→ 回主页静音。
 * 原因：小游戏在原生音频起播/音频会话切换时会把 wx.createWebAudioContext 置为
 * suspended，此时 currentTime 冻结、排进去的音符一个都不发。mp3 走的是另一套
 * （InnerAudioContext），所以关卡那边照常有声——这就是"只有主页没音乐"的原因。
 * 我们的代码从来没主动 suspend 过，所以只需要在"要出声"的时机确保它在 running。 */
function ensureAC() {
  if (!AC) return false;
  try {
    if (AC.state === 'suspended' && AC.resume) AC.resume();
  } catch (e) {}
  return true;
}
function acRunning() { return !!(AC && AC.state === 'running'); }

/* 闸门写入：cancelScheduledValues(0) 连历史一起清（包括在飞的淡出 ramp），
 * 再补一条显式 setValueAtTime —— 只写 .value 在某些实现里会被旧 ramp 覆盖，
 * 结果就是"闸门永远停在 0"，听起来同样是没声音。 */
function gateTo(v) {
  if (!homeGate || !AC) return;
  var g = homeGate.gain;
  try {
    if (g.cancelScheduledValues) g.cancelScheduledValues(0);
    if (g.setValueAtTime) g.setValueAtTime(v, AC.currentTime);
    g.value = v;
  } catch (e) { try { g.value = v; } catch (e2) {} }
}

function homeInit() {
  if (!AC || homeGate) return;
  try {
    homeGate = AC.createGain();
    homeGate.gain.value = 0;
    homeGate.connect(bgmGain);
    var E = (CONFIG.AUDIO.home && CONFIG.AUDIO.home.echo) || {};
    homeLead = AC.createGain();
    homeLead.gain.value = 1;
    homeLead.connect(homeGate);
    if (AC.createDelay && E.delay) {
      var d = AC.createDelay(1.0), fb = AC.createGain(), wet = AC.createGain();
      d.delayTime.value = E.delay;
      fb.gain.value = E.feedback || 0.24;
      wet.gain.value = E.wet || 0.22;
      homeLead.connect(d);
      d.connect(fb); fb.connect(d);
      d.connect(wet); wet.connect(homeGate);
    }
  } catch (e) { homeGate = null; homeLead = null; }
}

function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

/* 单个泛音：线性起音 + 指数衰减 —— 木琴/音盒的"颗粒"就来自这个包络 */
function homePartial(freq, at, dur, peak, type, attack, dest) {
  var o = AC.createOscillator(), g = AC.createGain();
  o.type = type;
  o.frequency.value = freq;
  var a = Math.max(0.003, attack || 0.006);
  var d = Math.max(dur, a + 0.03);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(peak, at + a);
  g.gain.exponentialRampToValueAtTime(0.0001, at + d);
  o.connect(g); g.connect(dest || homeGate);
  o.start(at); o.stop(at + d + 0.05);
  o._end = at + d + 0.05;
  HOME_OSC.push(o);
  /* v0.47：主页放久了 HOME_OSC 只增不减（每个音都自己停下了，但引用还留着）。
   * 超过 300 个就按"是否已经响完"清一遍，长驻主页也不会几百个对象不释放。 */
  if (HOME_OSC.length > 300) {
    var keep = [], nowT = AC.currentTime;
    for (var pi = 0; pi < HOME_OSC.length; pi++) {
      if ((HOME_OSC[pi]._end || 0) > nowT) keep.push(HOME_OSC[pi]);
    }
    HOME_OSC = keep;
  }
}
function homeMallet(freq, at, dur, peak, dest) {
  homePartial(freq, at, dur, peak, 'sine', 0.006, dest);
  homePartial(freq * 4.02, at, dur * 0.26, peak * 0.14, 'sine', 0.004, dest);
}
function hJit(i) { var x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); }

function homeBar(bar, t0, beat) {
  var H = CONFIG.AUDIO.home, P = H.prog, i = bar % P.length;
  var ch = P[i], g = H.gain || {};
  homePartial(mtof(ch.b), t0, beat * 1.7, g.bass || 0.17, 'triangle', 0.012);
  homePartial(mtof(ch.b), t0 + beat * 2, beat * 1.5, (g.bass || 0.17) * 0.82, 'triangle', 0.012);
  for (var c = 0; c < ch.ch.length; c++) {
    homePartial(mtof(ch.ch[c]), t0 + c * 0.02, beat * 1.6, g.chord || 0.05, 'triangle', 0.02);
  }
  var arp = H.arp || [0, 1, 2, 1];
  for (var k = 0; k < 8; k++) {
    var idx = arp[k % arp.length];
    var m = idx === 3 ? ch.ch[0] + 12 : ch.ch[idx];
    var v = (g.arp || 0.085) * (0.85 + 0.3 * hJit(bar * 8 + k));
    homeMallet(mtof(m), t0 + k * beat / 2 + hJit(bar * 8 + k + 99) * 0.006, beat * 0.55, v);
  }
  var mel = H.melody || [], mb = bar % P.length;
  for (var q = 0; q < mel.length; q++) {
    var n = mel[q];
    if (n[0] !== mb) continue;
    homeMallet(mtof(n[2]), t0 + n[1] * beat, n[3] * beat * 1.15, g.lead || 0.125, homeLead);
  }
}

function homeStart() {
  if (!AC || !enabled.bgm) return;
  ensureAC();                                   // 系统可能把 WebAudio 挂了，先叫醒
  homeInit();
  if (!homeGate) return;
  if (homeSeq) { applyBgmGain(); return; }
  var H = CONFIG.AUDIO.home;
  if (!H || !H.prog) return;
  var beat = 60 / (H.bpm || 100), bar = beat * 4;
  /* v0.47：开闸之前必须先把上一代清干净 —— 否则淡出中的旧曲会被这道闸门
   * 重新放出来，与新排的一整小节叠在一起（快速进出主页时的"重叠音"）。 */
  flushHomeDead();
  gateTo(1);
  homeSeq = { bar: 0, nextT: AC.currentTime + 0.04, timer: 0, watch: 0 };
  var tick = function () {
    if (!homeSeq || !AC) return;
    if (!acRunning()) {                          // 挂起时时钟是冻的，别拿它算时刻
      ensureAC();
      return;
    }
    /* 从挂起里醒来时时钟可能跳过一段：落后太多就重新对表，避免一次性补放一堆音 */
    if (homeSeq.nextT < AC.currentTime - 0.25) homeSeq.nextT = AC.currentTime + 0.05;
    var horizon = AC.currentTime + bar * 0.98 + 0.05, guard = 0;
    while (homeSeq.nextT < horizon && guard++ < 4) {
      homeBar(homeSeq.bar, homeSeq.nextT, beat);
      homeSeq.nextT += bar; homeSeq.bar++;
    }
  };
  tick();
  homeSeq.timer = setInterval(tick, 400);
  /* 健康检查：600ms 后如果还没醒（有些机型 resume 会被静默拒），再叫一次；
   * 闸门若被旧的淡出 ramp 拖到接近 0，也顺手拉回来。 */
  homeSeq.watch = setTimeout(function () {
    if (!homeSeq) return;
    if (!acRunning()) ensureAC();
    try {
      if (homeGate.gain.value < 0.5) gateTo(1);
    } catch (e) {}
  }, 600);
  applyBgmGain();
}

function homeStop(soft) {
  if (homeSeq && homeSeq.timer) clearInterval(homeSeq.timer);
  if (homeSeq && homeSeq.watch) clearTimeout(homeSeq.watch);
  homeSeq = null;
  if (homeGate && AC) {
    /* soft=true：进关卡时主页曲淡出 150ms，给 mp3 一点缓冲时间。
     * 硬切（30ms）会先静音一两百毫秒，听感就是"音乐没了"；
     * 关音乐 / 切后台仍然用硬切，那两处不需要过渡。 */
    var ramp = soft ? 0.15 : 0.03;
    try {
      var g = homeGate.gain, cur = g.value;
      if (g.cancelScheduledValues) g.cancelScheduledValues(0);   // 清历史，含上一次淡出
      if (g.setValueAtTime) g.setValueAtTime(cur, AC.currentTime);
      g.linearRampToValueAtTime(0, AC.currentTime + ramp);
    } catch (e) { try { homeGate.gain.value = 0; } catch (e2) {} }
  }
  /* v0.47：这一代挂进 homeDead，等淡出走完再硬停；在此之前若又 homeStart，
   * flushHomeDead() 会把它们同步停掉。旧版这里是裸 setTimeout + 局部变量，
   * 新起的曲子无从得知"上一代还没停"，于是两代一起响。 */
  if (homeDead.length) flushHomeDead();          // 更早的一代直接停（极少出现）
  homeDead = HOME_OSC; HOME_OSC = [];
  if (homeDeadTimer) clearTimeout(homeDeadTimer);
  homeDeadTimer = setTimeout(function () {
    homeDeadTimer = 0;
    var list = homeDead; homeDead = [];
    for (var i = 0; i < list.length; i++) { try { list[i].stop(); } catch (e) {} }
  }, soft ? 190 : 60);
}

/* ---------------- 关卡 mp3：每首一个 InnerAudioContext，解锁时建好预载 ----------------
 * 切曲 = 暂停旧的 + 播新的，同步完成；实例在解锁时就建好并设 src，
 * 平台据此开始缓冲，真正播的时候不用再等解码。 */
var BGM_CTX = {}, curCtx = null, bgmScene = 'home', bgmFileNow = '';

function bgmFile(key) {
  var m = (CONFIG.AUDIO && CONFIG.AUDIO.bgm) || {};
  if (key === 'home') return m.home || '';
  var arr = m.lv || [];
  if (!arr.length) return m.home || '';
  var i = parseInt(String(key).replace(/^lv/, ''), 10);
  return arr[((isFinite(i) && i > 0 ? i - 1 : 0) % arr.length)];
}
function bgmPath(file) {
  return (CONFIG.AUDIO.base + file).replace(/^\.\//, '');
}
function ctxFor(file) {
  if (BGM_CTX[file]) return BGM_CTX[file];
  var a = null;
  try {
    a = wx.createInnerAudioContext();
    a.loop = true;
    a.obeyMuteSwitch = false;
    a.volume = 0;
    a.src = bgmPath(file);
    /* 加载完时如果正是"该响却没响"，补一次 play —— 覆盖 pause/play 抢拍丢首播的机型 */
    if (a.onCanplay) a.onCanplay(function () {
      if (enabled.bgm && bgmFileNow === file && a.paused) { try { a.play(); } catch (e) {} }
    });
    if (a.onError) a.onError(function (e) {
      a._err = (e && (e.errMsg || e.errCode)) || 'audio error';
      /* 加载失败就把这首标出来，别让后面的看门狗一直空转 */
    });
  } catch (e) { return null; }
  BGM_CTX[file] = a;
  return a;
}
/* v0.14.1：预载只做「建实例 + 设 src」，不再 play→pause 预热。
 *
 * v0.13 那版是解锁时把 4 首一起 play()、90ms 后统一 pause()。两个坑：
 *   ① 玩家第一下点的就是「开始」时，解锁与进关卡在同一拍发生 ——
 *      bgm_lv1 刚被 bgmPlay 正式播上，90ms 后预载的 pause 把它掐了，
 *      「进拼图音乐直接没了」，而且之后没有代码会把它救回来；
 *   ② loadBuffers() 解码完会再调一次 startBgm() → 再预载一遍。这次可能发生在
 *      玩家已经在关卡里放歌之后，同样把正在放的掐掉（"随机中途没音乐"）。
 *   ③ 4 个解码器同一拍启动，就是玩家说的"卡顿"。
 * 现在：一个 preloaded 闸门只建一次；InnerAudioContext 在设 src 时就会开始缓冲，
 * 不需要真的出声去"暖机"；真正该响的时候由 startCtx 的 300ms 看门狗兜底。 */
var bgmPreloaded = false;
function preloadBgm() {
  if (bgmPreloaded) return;
  bgmPreloaded = true;
  var lv = (CONFIG.AUDIO.bgm && CONFIG.AUDIO.bgm.lv) || [];
  for (var i = 0; i < lv.length; i++) ctxFor(lv[i]);
}
function pauseAll(except) {
  for (var k in BGM_CTX) {
    if (!Object.prototype.hasOwnProperty.call(BGM_CTX, k)) continue;
    var a = BGM_CTX[k];
    if (a === except) continue;
    try { a.pause(); } catch (e) {}
    try { a.volume = 0; } catch (e) {}
  }
}
function bgmTarget() {
  if (!enabled.bgm) return 0;
  return ducked ? CONFIG.AUDIO.bgmDuckVolume : CONFIG.AUDIO.bgmVolume;
}
function trimOf(key) {
  /* 传进来的可能是文件名（bgm_lv1.mp3），也可能只是键（home），统一去掉扩展名 */
  var k = String(key || '').replace(/\.mp3$/i, '');
  var t = (CONFIG.AUDIO.trim || {})[k];
  return (typeof t === 'number' && t > 0) ? t : 1;
}
function applyBgmGain() {
  var v = bgmTarget();
  if (curCtx) { try { curCtx.volume = Math.max(0, Math.min(1, v * trimOf(bgmFileNow))); } catch (e) {} }
  if (bgmGain && AC) {
    try {
      if (bgmGain.gain.cancelScheduledValues) bgmGain.gain.cancelScheduledValues(AC.currentTime);
      bgmGain.gain.value = v * trimOf('home');
    } catch (e) {}
  }
}
function bgmPlay(key) {
  var file = bgmFile(key);
  if (!file) {                                  // 主页/关卡列表：合成轻音乐
    pauseAll(null);
    curCtx = null; bgmFileNow = '';
    homeStart();
    return;
  }
  homeStop(true);                               // 进关卡：主页曲淡出 150ms 让位给 mp3
  var a = ctxFor(file);
  if (!a) return;
  /* 同一首已经在放就别重头开始——1~5 关都是 lv1，换关不该把音乐倒回去 */
  if (a === curCtx && a.paused === false) {
    try { a.volume = Math.min(1, bgmTarget() * trimOf(file)); } catch (e) {}
    armWatch(a, file);
    return;
  }
  pauseAll(a);
  curCtx = a; bgmFileNow = file;
  /* v0.14.1：不再 seek(0)。新建的实例本来就在 0，seek 在还没 canplay 时会触发
   * 一次多余的解码；而回到同一首时"接着放"比"倒回开头"更不容易听出接缝。 */
  try { a.volume = Math.min(1, bgmTarget() * trimOf(file)); } catch (e) {}
  startCtx(a, file);
}

/* 首播补一次：个别机型在 pause→play 的同一拍里会丢掉这次 play（回调不报错），
 * 300ms 后如果还是 paused 就再补一次；只补一次，不做无限重试。 */
function armWatch(a, file) {
  if (a._watch) { clearTimeout(a._watch); a._watch = null; }
  a._watch = setTimeout(function () {
    a._watch = null;
    if (!enabled.bgm || bgmFileNow !== file) return;
    if (a.paused) { try { a.play(); } catch (e) {} }
  }, 300);
}
function startCtx(a, file) {
  try { a.play(); } catch (e) {}
  armWatch(a, file);
}
function bgmSetScene(key) {
  if (!key || key === bgmScene) { if (unlocked && enabled.bgm) bgmPlay(bgmScene); return; }
  bgmScene = key;
  if (!unlocked || !enabled.bgm) return;
  bgmPlay(key);
}
/* v0.48：超时失败时给失败乐句让出安静的背景。
 * 只停声、不改 bgmScene —— 复活时 core.js 的 setLevelScene() 会按原场景恢复。
 * 不用 setScene('home')：那会把主页曲放起来，比关卡曲还吵。 */
function bgmHalt() {
  pauseAll(null);
  homeStop(false);
  curCtx = null; bgmFileNow = '';
}
/* 第一次用户手势（解锁音频）后进入：主页直接起播 */
function startBgm() {
  if (!unlocked || !enabled.bgm) { applyBgmGain(); return; }
  bgmPlay(bgmScene);
}

function playElement(name, rate, gain) {
  var path = pkgPath(name);
  if (!path) return false;
  try {
    var arr = pool[name] || (pool[name] = []);
    var i = (poolIdx[name] = ((poolIdx[name] || 0) + 1) % 2);
    var el = arr[i];
    if (!el) {
      el = arr[i] = wx.createInnerAudioContext();
      el.src = path;
      el.obeyMuteSwitch = false;
    }
    el.stop();
    el.playbackRate = Math.max(0.5, Math.min(2, rate));
    el.volume = Math.max(0, Math.min(1, gain));
    el.play();
    return true;
  } catch (e) { return false; }
}

function playSfx(name) {
  if (!enabled.sfx) return;
  if (name === 'sfx_snap' && snapVoices >= CONFIG.AUDIO.snapVoices) return;
  if (name === 'sfx_tap') {
    var t = Date.now();
    if (t - lastTapAt < CONFIG.AUDIO.tapGuardMs) return;
    lastTapAt = t;
  }
  var rate = 1 + (Math.random() * 0.10 - 0.05);
  var gain = (CONFIG.AUDIO.sfxGain[name] || 0.9) * (0.95 + Math.random() * 0.10);
  /* v0.27：非木质风格必须走合成（wav 缓冲是固定的木质录音，换风格听不出差别）。
   * v0.31：通关音是"情绪表达"、不属于材质风格，任何风格都优先播重制后的素材。 */
  /* v0.48：sfx_timeup 与 sfx_win 同属情绪表达，任何音效风格下都直接走合成 */
  if (sfxStyleKey === 'wood' || name === 'sfx_win' || name === 'sfx_timeup') {
    if (buf[name] && AC) {
      try {
        var s = AC.createBufferSource();
        s.buffer = buf[name];
        s.playbackRate.value = rate;
        var g = AC.createGain();
        g.gain.value = gain;
        s.connect(g); g.connect(masterGain);
        if (name === 'sfx_snap') { snapVoices++; s.onended = function () { snapVoices--; }; }
        s.start();
        return;
      } catch (e) { /* 落到下面 */ }
    }
    if (elementMode && playElement(name, rate, gain)) return;
  }
  if (synth[name]) synth[name]();
}

/* v0.14.1：解锁这一拍只做「出声」，其它活挪到下一拍。
 * loadBuffers() 里 4 次 readFileSync + 解码是同步 I/O，紧跟在点击后面执行，
 * 就是"点开始卡一下"的直接来源；preloadBgm() 建 4 个 InnerAudioContext 也一样。
 * 现在先起主页曲，120ms 后再预热，玩家听感上完全无感。 */
function warmUp() {
  if (!unlocked) return;
  preloadBgm();
  loadBuffers();
}

var audio = {
  unlock: function () {
    initAudio();
    ensureAC();
    unlocked = true;
    startBgm();                       // 先出声
    setTimeout(warmUp, 120);          // 音效解码 + mp3 预载算下一拍
  },
  setEnabled: function (sfx, bgm) {
    enabled.sfx = sfx; enabled.bgm = bgm;
    if (!bgm) {
      /* 关音乐：先撤看门狗再停，否则 300ms 后的重播会把刚关掉的又放起来 */
      if (curCtx && curCtx._watch) { clearTimeout(curCtx._watch); curCtx._watch = null; }
      pauseAll(null); curCtx = null; bgmFileNow = ''; homeStop();
    } else if (unlocked) bgmPlay(bgmScene);
    applyBgmGain();
  },
  duck: function (on) { ducked = !!on; applyBgmGain(); },
  setScene: function (k) { bgmSetScene(k); },   // v0.5：主页 / 关卡多场景 BGM
  halt: function () { bgmHalt(); },             // v0.48：失败乐句前让背景安静（不改场景）
  setSfxStyle: function (key) {                  // v0.27：切换交互音效风格
    if (!CONFIG.SFX_STYLES || !CONFIG.SFX_STYLES[key]) key = 'wood';
    sfxStyleKey = key;
    synth = buildSfxSynth(key);
  },
  setVisible: function (v) {
    if (!v) {
      if (curCtx && curCtx._watch) { clearTimeout(curCtx._watch); curCtx._watch = null; }
      pauseAll(null); homeStop();               // 切后台：两边都停，别继续排程
    } else if (unlocked && enabled.bgm) {
      ensureAC();                             // 切后台也可能被挂起
      bgmPlay(bgmScene);
    }
  },
  play: function (name) {
    if (!enabled.sfx) return;
    ensureAC();                               // 每次点击都顺手叫醒（点击是真手势，resume 最容易被接受）
    playSfx(name);
  }
};
/* 调试/验收钩子：tools/verify_audio.js 用它直接驱动 BGM 切场景（与 __game 同性质） */
audio.bgmInfo = function () {
  var n = 0, k;
  for (k in BGM_CTX) if (BGM_CTX[k] && BGM_CTX[k].paused === false) n++;
  return {
    scene: bgmScene, home: !!homeSeq, gate: homeGate && homeGate.gain ? homeGate.gain.value : null,
    gain: bgmGain && bgmGain.gain ? bgmGain.gain.value : null,
    file: bgmFileNow, playing: n, ctxs: Object.keys(BGM_CTX).length,
    volume: curCtx ? curCtx.volume : null, paused: curCtx ? curCtx.paused : null,
    preloaded: bgmPreloaded, ac: AC ? AC.state : null,
    /* v0.47：主页曲的"代际"健康度 —— verify_audio 用它们断言快速切页时不会叠音。
     * live = 还在时间轴上（尚未到 stop 时刻）的音符数；
     * dead = 上一代正等淡出结束的音符数（正常应 ≤ 一次淡出的量）。 */
    live: homeOscLive(), dead: homeDead.length
  };
};
globalThis.__audio = audio;

/* ---------------- 震动 ---------------- */
function vibrate(ms) {
  try { wx.vibrateShort({ type: ms > 10 ? 'medium' : 'light' }); } catch (e) {}
}

/* ---------------- 图片（素材未到位则跳过） ---------------- */
var images = {};
function loadArt(done) {
  if (!CONFIG.ART.enabled) { done(); return; }
  var keys = Object.keys(CONFIG.ART.files);
  var left = keys.length, finished = false;
  function finish() { if (finished) return; finished = true; done(); }
  if (!left) { done(); return; }
  keys.forEach(function (k) {
    try {
      var img = wx.createImage();
      img.onload = function () { images[k] = img; if (--left === 0) finish(); };
      img.onerror = function () { if (--left === 0) finish(); };
      img.src = (CONFIG.ART.base + CONFIG.ART.files[k]).replace(/^\.\//, '');
    } catch (e) { if (--left === 0) finish(); }
  });
  setTimeout(finish, 2000);
}

/* ---------------- 触摸 ---------------- */
var inputHandler = null;
var active = false;
function emit(type, x, y) { if (inputHandler) inputHandler(type, x, y); }

function bindInput(fn) {
  inputHandler = fn;
  function pos(e) {
    var t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
    if (!t) return null;
    return [t.clientX, t.clientY];
  }
  wx.onTouchStart(function (e) {
    if (active) return;              // 单指锁定：已有一块被抓，第二根手指忽略
    active = true;
    var p = pos(e);
    if (p) emit('down', p[0], p[1]);
  });
  wx.onTouchMove(function (e) {
    if (!active) return;
    var p = pos(e);
    if (p) emit('move', p[0], p[1]);
  });
  var end = function (e) {
    active = false;
    var p = pos(e);
    emit('up', p ? p[0] : 0, p ? p[1] : 0);
  };
  wx.onTouchEnd(end);
  wx.onTouchCancel(function () { active = false; emit('cancel', 0, 0); });
}

/* ---------------- 启动 ---------------- */
function boot() {
  var game = core({
    ctx: ctx,
    size: viewportSize,
    dpr: dpr,
    safeInsets: safeInsets,
    bindInput: bindInput,
    storage: storage,
    audio: audio,
    vibrate: vibrate,
    images: images,
    cloud: cloudLib.createCloud(),           // 没配 CLOUD.envId 时 enabled() 返回 false
    profile: profileLib.createProfile(),     // v0.14：微信昵称/头像（不可用时 core 自动降级）
    friend: friendLib.createFriend(),        // v0.18：好友榜（开放数据域，不可用时降级文案）
    ad: adLib.createAd(),                    // 没配 unitId 时 banner 空操作、rewarded 不存在
    share: function (opt) {                   // v0.5 邀请有礼 / v0.8 分享成品图案
      opt = opt || {};
      var title = opt.title || '方寸巧拼 · 一起来拼图！';
      var doShare = function (imageUrl) {
        try {
          wx.shareAppMessage(imageUrl ? { title: title, imageUrl: imageUrl } : { title: title });
        } catch (e) {}
      };
      /* v0.8：分享成品图案时把当前画面（结算页）截成图片一起转发。
       * toTempFilePath 是画布实例方法；老基础库没有就退回纯文字分享。 */
      if (opt.capture && canvas && canvas.toTempFilePath) {
        try {
          canvas.toTempFilePath({
            x: 0, y: 0, width: canvas.width, height: canvas.height,
            destWidth: 500, destHeight: Math.round(500 * canvas.height / Math.max(1, canvas.width)),
            success: function (res) { doShare(res.tempFilePath); },
            fail: function () { doShare(null); }
          });
          return;
        } catch (e) { /* 落到纯文字 */ }
      }
      doShare(null);
    },
    onHide: function (cb) { wx.onHide(function () { audio.setVisible(false); cb(); }); },
    onShow: function (cb) { wx.onShow(function () { audio.setVisible(true); cb(); }); }
  });
  game.init();
  globalThis.__game = game;
}

loadArt(boot);
