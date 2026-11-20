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
var AC = null, masterGain = null, bgmGain = null, bgmSrc = null, bgmPlayer = null;
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

var synth = {
  sfx_tap: function () { tone(1500, 0.045, 'triangle', 0.1); noiseBurst(0.03, 0.05, 2600); },
  sfx_pick: function () { tone(620, 0.07, 'sine', 0.16); noiseBurst(0.05, 0.10, 1200); },
  sfx_snap: function () { noiseBurst(0.05, 0.24, 1500); tone(880, 0.06, 'square', 0.09, 0, 420); },
  sfx_win: function () {
    // v0.3.4 A4b：欢快通关 sting — C 大调上行琶音 + 顶点重音 + 收束和弦（约 0.82s）
    // offset 与动画线鲜花关键帧共用 state.win.t 基准：242ms 顶点重音对齐主花绽放峰值
    // triangle 上行（明亮），C6 gain 0.16 做重音；sine 收束和弦高频压低 gain 防刺耳
    tone(523.25, 0.12, 'triangle', 0.13, 0.000);  // C5 — t=0 起苞
    tone(659.25, 0.12, 'triangle', 0.13, 0.082);  // E5 — 卫星花区
    tone(783.99, 0.13, 'triangle', 0.14, 0.162);  // G5 — 卫星花②
    tone(1046.50, 0.22, 'triangle', 0.16, 0.242); // C6 — ★顶点重音，对齐主花峰值 242ms
    tone(1046.50, 0.50, 'sine', 0.10, 0.300);     // C6 和弦根
    tone(1318.51, 0.48, 'sine', 0.09, 0.330);     // E6 和弦三音
    tone(1567.98, 0.46, 'sine', 0.06, 0.360);     // G6 和弦冠（压低高频）
  }
};

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

/* ---------------- v0.5 多场景合成 BGM（零音频文件） ----------------
 * 每 120ms 排一次未来 0.55s 的音符：4 音和弦分解 + 低八度根音，按 bpm 循环。
 * setScene(key) 切场景；切后台暂停调度省电。旋律均为益智类轻快/温馨纯音乐。 */
var BGM_DEF = {
  home: { bpm: 60, wave: 'sine', chords: [
    [261.63, 329.63, 392.00, 523.25],   // C
    [220.00, 261.63, 329.63, 440.00],   // Am
    [174.61, 220.00, 261.63, 349.23],   // F
    [196.00, 246.94, 293.66, 392.00]    // G
  ] },
  lv1: { bpm: 96, wave: 'triangle', chords: [
    [261.63, 392.00, 523.25, 392.00],   // C
    [196.00, 293.66, 392.00, 293.66],   // G
    [220.00, 329.63, 440.00, 329.63],   // Am
    [174.61, 261.63, 349.23, 261.63]    // F
  ] },
  lv2: { bpm: 104, wave: 'triangle', chords: [
    [174.61, 261.63, 349.23, 261.63],   // F
    [261.63, 392.00, 523.25, 392.00],   // C
    [293.66, 349.23, 440.00, 349.23],   // Dm
    [196.00, 293.66, 392.00, 293.66]    // G
  ] },
  lv3: { bpm: 88, wave: 'sine', chords: [
    [220.00, 329.63, 440.00, 659.25],   // Am
    [174.61, 261.63, 349.23, 523.25],   // F
    [261.63, 392.00, 523.25, 783.99],   // C
    [196.00, 293.66, 392.00, 587.33]    // G
  ] },
  /* v0.6 通关场景：循环欢庆曲，结算面板停留期间一直在放 */
  win: { bpm: 112, wave: 'triangle', chords: [
    [261.63, 329.63, 392.00, 523.25],   // C
    [349.23, 440.00, 523.25, 698.46],   // F
    [392.00, 493.88, 587.33, 783.99],   // G
    [261.63, 329.63, 392.00, 659.25]    // C（加高音，循环点更亮）
  ] }
};
var bgmScene = 'home', bgmSeq = null;
/* v0.6 音量校准：旧值 0.020/0.030/0.024 乘 0.30 总线只有 ≈0.008（听不见） */
var BGM_NOTE = CONFIG.AUDIO.bgmNote || { root: 0.05, lead: 0.075, other: 0.055 };

function bgmNote(freq, at, dur, gain, wave) {
  if (!AC) return;
  try {
    var o = AC.createOscillator(), g = AC.createGain();
    o.type = wave || 'triangle';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(gain, at + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); g.connect(bgmGain);
    o.start(at); o.stop(at + dur + 0.05);
  } catch (e) {}
}
function bgmStopSeq() {
  if (bgmSeq && bgmSeq.timer) clearInterval(bgmSeq.timer);
  bgmSeq = null;
}
function bgmStartSeq(key) {
  if (!AC || !enabled.bgm) return;
  var def = BGM_DEF[key] || BGM_DEF.home;
  bgmStopSeq();
  var beat = 60 / def.bpm, bar = beat * 4;
  bgmSeq = { idx: 0, nextT: AC.currentTime + 0.10, timer: 0 };
  var tick = function () {
    if (!bgmSeq || !AC) return;
    var horizon = AC.currentTime + 0.55, guard = 0;
    while (bgmSeq.nextT < horizon && guard++ < 8) {
      var ch = def.chords[bgmSeq.idx % def.chords.length];
      bgmNote(ch[0] / 2, bgmSeq.nextT, bar * 0.92, BGM_NOTE.root, 'sine');   // 低八度根音
      for (var k = 0; k < ch.length; k++) {
        bgmNote(ch[k], bgmSeq.nextT + k * beat, beat * 0.88,
          k === 0 ? BGM_NOTE.lead : BGM_NOTE.other, def.wave);
      }
      bgmSeq.nextT += bar;
      bgmSeq.idx++;
    }
  };
  tick();
  bgmSeq.timer = setInterval(tick, 120);
}
function bgmSetScene(key) {
  if (!BGM_DEF[key] || key === bgmScene) return;
  bgmScene = key;
  if (!unlocked || !enabled.bgm || !AC) return;
  bgmStartSeq(key);
}

function bgmTarget() {
  if (!enabled.bgm) return 0;
  return ducked ? CONFIG.AUDIO.bgmDuckVolume : CONFIG.AUDIO.bgmVolume;
}
function applyBgmGain() {
  var v = bgmTarget();
  /* v0.6：mp3 / 元素回退是满刻度素材，仍按旧上限，不跟着合成总线放大 */
  if ((bgmSrc || bgmPlayer) && v > CONFIG.AUDIO.bgmLegacyVolume) v = CONFIG.AUDIO.bgmLegacyVolume;
  if (bgmGain && AC) {
    try {
      if (bgmGain.gain.setTargetAtTime) bgmGain.gain.setTargetAtTime(v, AC.currentTime, 0.06);
      else bgmGain.gain.value = v;
    } catch (e) { try { bgmGain.gain.value = v; } catch (e2) {} }
  }
  if (bgmPlayer) { try { bgmPlayer.volume = Math.max(0, Math.min(1, v)); } catch (e) {} }
}
function startBgm() {
  if (!unlocked) { applyBgmGain(); return; }
  /* v0.5：优先合成多场景 BGM（零文件）；AC 完全不可用时才回退 mp3 */
  if (CONFIG.AUDIO.useSynthBgm !== false && AC) { bgmStartSeq(bgmScene); bgmStarted = true; applyBgmGain(); return; }
  if (bgmStarted) { applyBgmGain(); return; }
  if (buffersReady && buf.bgm_main && AC) {
    try {
      bgmSrc = AC.createBufferSource();
      bgmSrc.buffer = buf.bgm_main;
      bgmSrc.loop = true;
      bgmSrc.loopStart = CONFIG.AUDIO.loopStart;
      bgmSrc.loopEnd = CONFIG.AUDIO.loopEnd;
      bgmSrc.connect(bgmGain);
      bgmSrc.start(0, CONFIG.AUDIO.loopStart);
      bgmStarted = true;
      applyBgmGain();
      return;
    } catch (e) { bgmSrc = null; }
  }
  if (elementMode && CONFIG.AUDIO.files.bgm_main) {
    try {
      bgmPlayer = wx.createInnerAudioContext();
      bgmPlayer.src = pkgPath('bgm_main');
      bgmPlayer.loop = true;
      bgmPlayer.obeyMuteSwitch = false;
      bgmPlayer.volume = 0;
      bgmPlayer.play();
      bgmStarted = true;
      applyBgmGain();
    } catch (e) { bgmPlayer = null; }
  }
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
  // v0.3.4 A4b：通关 sting 强制走合成，避免既有 sfx_win.mp3 抢先播旧三音
  if (name === 'sfx_win') { if (synth.sfx_win) synth.sfx_win(); return; }
  if (name === 'sfx_snap' && snapVoices >= CONFIG.AUDIO.snapVoices) return;
  if (name === 'sfx_tap') {
    var t = Date.now();
    if (t - lastTapAt < CONFIG.AUDIO.tapGuardMs) return;
    lastTapAt = t;
  }
  var rate = 1 + (Math.random() * 0.10 - 0.05);
  var gain = (CONFIG.AUDIO.sfxGain[name] || 0.9) * (0.95 + Math.random() * 0.10);
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
  if (synth[name]) synth[name]();
}

var audio = {
  unlock: function () {
    initAudio();
    try { if (AC && AC.state === 'suspended') AC.resume(); } catch (e) {}
    unlocked = true;
    loadBuffers();
    startBgm();
  },
  setEnabled: function (sfx, bgm) {
    enabled.sfx = sfx; enabled.bgm = bgm;
    if (!bgm) bgmStopSeq();
    else if (unlocked && AC) bgmStartSeq(bgmScene);
    applyBgmGain();
  },
  duck: function (on) { ducked = !!on; applyBgmGain(); },
  setScene: function (k) { bgmSetScene(k); },   // v0.5：主页 / 关卡多场景 BGM
  setVisible: function (v) {
    if (!v) {
      if (bgmGain && AC) { try { bgmGain.gain.value = 0; } catch (e) {} }
      if (bgmPlayer) { try { bgmPlayer.volume = 0; } catch (e) {} }
      bgmStopSeq();
    } else {
      if (unlocked && enabled.bgm) bgmStartSeq(bgmScene);
      applyBgmGain();
    }
  },
  play: function (name) {
    if (!enabled.sfx) return;
    playSfx(name);
  }
};

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
    share: function () {                       // v0.5 邀请有礼：微信转发
      try { if (wx.shareAppMessage) wx.shareAppMessage({ title: '方寸巧拼 · 一起来拼图！' }); } catch (e) {}
    },
    onHide: function (cb) { wx.onHide(function () { audio.setVisible(false); cb(); }); },
    onShow: function (cb) { wx.onShow(function () { audio.setVisible(true); cb(); }); }
  });
  game.init();
  globalThis.__game = game;
}

loadArt(boot);
