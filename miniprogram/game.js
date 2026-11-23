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

/* v0.20 音效重做：全部改成「低频为主 + 极短衰减」的木质感。
 * 依据是把参考视频的音轨拆开实测 —— 操作音的能量 65% 落在 0~1kHz、
 * 1~3kHz 只占 8%、衰减 10~15ms；而旧版 sfx_snap 是 1500Hz 带通噪声 +
 * 880→420 方波，1~3kHz 特别重，听感发尖发刺，这就是"难听"的主因。
 * 现在：tap = 620→480Hz 短点；pick = 392→523Hz 上滑；snap = 196→147Hz
 * 加 98Hz 的"笃"（只留一丝 700Hz 木质接触声）；win 去掉原来 1568Hz 的高频
 * 冠音（最刺耳），低音补一层 C5 垫底，242ms 顶点仍与鲜花动效对齐。 */
/* v0.27 音效风格：默认木质（原音色）。setSfxStyle 会按 CONFIG.SFX_STYLES 的参数
 * 重写三个操作音（tap/pick/snap）——pitch 改频率、decay 改时值、wave 改波形、
 * bell 追加一层高八度泛音。sfx_win 通关曲保持原样（情绪表达不随风格破坏）。 */
var SFX_BASE = {
  tap:  { f: 620, d: 0.055, g: 0.085, to: 480, f2: 1240, d2: 0.022, g2: 0.028 },
  pick: { f: 392, d: 0.075, g: 0.115, to: 523, f2: 1046, d2: 0.030, g2: 0.026 },
  snap: { f: 196, d: 0.085, g: 0.21, to: 147, f2: 98, d2: 0.070, g2: 0.12 }
};
function buildSfxSynth(key) {
  var st = (CONFIG.SFX_STYLES && CONFIG.SFX_STYLES[key]) || (CONFIG.SFX_STYLES && CONFIG.SFX_STYLES.wood) || { pitch: 1, decay: 1, wave: 'sine', bell: false };
  var p = st.pitch, d = st.decay, w = st.wave, bell = !!st.bell;
  function mk(b) {
    return function () {
      tone(b.f * p, b.d * d, w, b.g, 0, b.to ? b.to * p : 0);
      tone(b.f2 * p, b.d2 * d, w, b.g2);
      if (bell) tone(b.f2 * p * 1.5, b.d * d * 0.8, 'sine', b.g * 0.35, 0.008);
    };
  }
  return {
    sfx_tap: mk(SFX_BASE.tap),
    sfx_pick: mk(SFX_BASE.pick),
    sfx_snap: function () { mk(SFX_BASE.snap)(); noiseBurst(0.020, 0.055, 700); },
    sfx_win: function () {
      tone(523.25, 0.14, 'triangle', 0.10, 0.000);
      tone(659.25, 0.14, 'triangle', 0.10, 0.082);
      tone(783.99, 0.15, 'triangle', 0.11, 0.162);
      tone(1046.50, 0.24, 'sine', 0.13, 0.242);
      tone(523.25, 0.62, 'sine', 0.07, 0.242);
      tone(783.99, 0.52, 'sine', 0.06, 0.300);
      tone(1046.50, 0.50, 'sine', 0.05, 0.340);
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
  ensureAC();                                   // 系统可能把 WebAudio 挂了，先叫醒
  homeInit();
  if (!homeGate) return;
  if (homeSeq) { applyBgmGain(); return; }
  var H = CONFIG.AUDIO.home;
  if (!H || !H.prog) return;
  var beat = 60 / (H.bpm || 100), bar = beat * 4;
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
  var dead = HOME_OSC; HOME_OSC = [];
  setTimeout(function () {
    for (var i = 0; i < dead.length; i++) { try { dead[i].stop(); } catch (e) {} }
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
  /* v0.27：非木质风格必须走合成（wav 缓冲是固定的木质录音，换风格听不出差别） */
  if (sfxStyleKey === 'wood') {
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
    preloaded: bgmPreloaded, ac: AC ? AC.state : null
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
