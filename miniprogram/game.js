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

/* ---------------- v0.13 主页轻音乐（合成，零音频文件） ----------------
 * 四个声部按 8 小节谱排程：低音 / 和弦轻扫 / 八分琶音 / 主旋律，谱在 CONFIG.AUDIO.home。
 * 中间多一个闸门 homeGate 是为了"切场景立刻静音"：振荡器是提前一小节排进
 * 时间轴的，只 clearInterval 拦不住已排好的音，会再响一整小节（2.4s）。
 * 闸门归零 + 硬停振荡器，才能做到进关卡时主页曲当场消失。 */
var HOME_OSC = [], homeGate = null, homeLead = null, homeSeq = null;

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
  HOME_OSC.push(o);
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
  homeInit();
  if (!homeGate) return;
  if (homeSeq) { applyBgmGain(); return; }
  var H = CONFIG.AUDIO.home;
  if (!H || !H.prog) return;
  var beat = 60 / (H.bpm || 100), bar = beat * 4;
  try {
    if (homeGate.gain.cancelScheduledValues) homeGate.gain.cancelScheduledValues(AC.currentTime);
    homeGate.gain.value = 1;
  } catch (e) {}
  homeSeq = { bar: 0, nextT: AC.currentTime + 0.04, timer: 0 };
  var tick = function () {
    if (!homeSeq || !AC) return;
    var horizon = AC.currentTime + bar + 0.6, guard = 0;
    while (homeSeq.nextT < horizon && guard++ < 4) {
      homeBar(homeSeq.bar, homeSeq.nextT, beat);
      homeSeq.nextT += bar; homeSeq.bar++;
    }
  };
  tick();
  homeSeq.timer = setInterval(tick, 400);
  applyBgmGain();
}

function homeStop() {
  if (homeSeq && homeSeq.timer) clearInterval(homeSeq.timer);
  homeSeq = null;
  if (homeGate && AC) {
    try {
      homeGate.gain.cancelScheduledValues(AC.currentTime);
      homeGate.gain.setValueAtTime(homeGate.gain.value, AC.currentTime);
      homeGate.gain.linearRampToValueAtTime(0, AC.currentTime + 0.03);
    } catch (e) { try { homeGate.gain.value = 0; } catch (e) {} }
  }
  var dead = HOME_OSC; HOME_OSC = [];
  setTimeout(function () {
    for (var i = 0; i < dead.length; i++) { try { dead[i].stop(); } catch (e) {} }
  }, 60);
}

/* ---------------- 关卡 mp3：每首一个 InnerAudioContext，解锁时全部预载 ----------------
 * 切曲 = 暂停旧的 + 播新的，both 同步；预载把"点开始后等几百毫秒才响"吃掉了。
 * 4 个实例都在音量 0 下 play→pause 一次，只为触发解码预热，听不到声音。 */
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
  } catch (e) { return null; }
  BGM_CTX[file] = a;
  return a;
}
function preloadBgm() {
  var lv = (CONFIG.AUDIO.bgm && CONFIG.AUDIO.bgm.lv) || [];
  for (var i = 0; i < lv.length; i++) {
    var a = ctxFor(lv[i]);
    if (!a) continue;
    /* 音量 0 播一下再停：只为让底层把文件读进缓存 */
    try {
      a.volume = 0;
      a.play();
      setTimeout(function (x) { return function () { try { x.pause(); } catch (e) {} }; }(a), 90);
    } catch (e) {}
  }
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
  homeStop();                                   // 进关卡：主页曲立刻收声
  var a = ctxFor(file);
  if (!a) return;
  /* 同一首已经在放就别重头开始——1~5 关都是 lv1，换关不该把音乐倒回去 */
  if (a === curCtx && a.paused === false) {
    try { a.volume = Math.min(1, bgmTarget() * trimOf(file)); } catch (e) {}
    return;
  }
  pauseAll(a);
  curCtx = a; bgmFileNow = file;
  try { a.seek(0); } catch (e) {}
  try { a.volume = Math.min(1, bgmTarget() * trimOf(file)); } catch (e) {}
  try { a.play(); } catch (e) {}
}
function bgmSetScene(key) {
  if (!key || key === bgmScene) { if (unlocked && enabled.bgm) bgmPlay(bgmScene); return; }
  bgmScene = key;
  if (!unlocked || !enabled.bgm) return;
  bgmPlay(key);
}
/* 第一次用户手势（解锁音频）后进入：主页直接起播 */
function startBgm() {
  if (!unlocked || !enabled.bgm) { applyBgmGain(); return; }
  preloadBgm();
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
    if (!bgm) { pauseAll(null); curCtx = null; homeStop(); }
    else if (unlocked) bgmPlay(bgmScene);
    applyBgmGain();
  },
  duck: function (on) { ducked = !!on; applyBgmGain(); },
  setScene: function (k) { bgmSetScene(k); },   // v0.5：主页 / 关卡多场景 BGM
  setVisible: function (v) {
    if (!v) {
      pauseAll(null); homeStop();               // 切后台：两边都停，别继续排程
    } else if (unlocked && enabled.bgm) {
      bgmPlay(bgmScene);
    }
  },
  play: function (name) {
    if (!enabled.sfx) return;
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
    volume: curCtx ? curCtx.volume : null, paused: curCtx ? curCtx.paused : null
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
