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
/* v0.62：设备档位（官方《运行性能》的「机型适配」）——
 * benchmarkLevel 在 Android 上由微信给出（10 以下低端 / 20 以上高端），iOS 拿不到就按高端算。
 * 真机实测：Canvas 2D 的成本几乎全在填充率，而全屏填充 ∝ dpr²，
 * 所以档位第一件事就是压 dpr 上限，第二件事才是关阴影 / 减粒子。 */
var _devTier = -1;
function deviceInfo() {
  try {
    if (wx.getDeviceInfo) return wx.getDeviceInfo() || {};
    return wx.getSystemInfoSync() || {};
  } catch (e) { return {}; }
}
function deviceTier() {
  if (_devTier >= 0) return _devTier;
  var bl = deviceInfo().benchmarkLevel;
  _devTier = (typeof bl === 'number' && bl > 0) ? (bl < 10 ? 0 : bl < 20 ? 1 : 2) : 2;
  return _devTier;
}
function dpr() {
  var i = sysInfo();
  var pr = i.pixelRatio || 1;
  /* 3 → 2.5 省 31% 填充，3 → 2 省 56%；纯色矢量的观感差别远小于这笔收益 */
  var cap = deviceTier() >= 2 ? 2.5 : (deviceTier() === 1 ? 2 : 1.75);
  return Math.min(pr, cap);
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

/* ---------- v0.58 音效引擎：乐器化模态合成 ----------
 * v0.31 已经用「非谐分音 + 噪声瞬态」摆脱了电子音，但 8 种风格跑的是同一套算法，
 * 只改音高/衰减倍数 —— 听感上就是「同一件乐器调了个音」，谈不上像木琴或钟。
 * 这一版按每件真实乐器的物理特征重写：
 *   ① 分音比照乐器本身的振动模态（马林巴琴条 1:4:10、青铜钟 hum/prime/tierce、
 *      铝管风铃的极端非谐 1:2.76:5.4…）；
 *   ② 主要分音成对出现、相差几音分 → 慢速拍频（"嗡——"的晃动，钟/风铃的灵魂）；
 *   ③ 每次敲击挂一个琴体低通 + 共振 Q，把散落的分音收成一个整体
 *      （没有这一步，分音各自干响，听起来就是几个正弦叠加）；
 *   ④ 1.2ms 起音 + 槌头噪声瞬态 + 低频冲击（木质/马林巴落地的那声"咚"）。
 * 8 种风格 = 8 件乐器，分音表、包络、滤波器全部独立。 */

var SFX_BASE = {
  tap:  { f: 660, d: 0.10, g: 0.11 },
  pick: { f: 392, d: 0.14, g: 0.15 },
  snap: { f: 198, d: 0.26, g: 0.22 }
};

/* p: [分音比, 振幅, 衰减秒]；beat: 拍频失谐（音分）；ring: 余音延长倍数
 * lpMul/lpQ: 琴体低通截止（×f0）与 Q；fenv: 截止扫频（减法合成的滤波器包络）
 * click/hz/tau: 瞬态强度 / 中心频率 / 时长；thump: 低频冲击强度 */
var SFX_MAT = {
  /* 木质梆子：非谐、极短、强起音，带一点低频"闷"的体感 */
  wood: {
    wave: 'triangle', ring: 1.0,
    p: [[1, 1, .052], [2.42, .44, .030], [4.11, .20, .018], [6.80, .09, .011], [.50, .32, .066]],
    click: .62, hz: 2600, tau: .0022, glide: -.045,
    lpMul: 12, lpQ: 1.2, thump: .22
  },
  /* 青铜钟：hum .5 / prime 1 / tierce 1.19 / quint 1.51 / nominal 2.0
   * + 上方 deciem 2.5 / undeciem 3.0 / duodeciem 4.07；失谐 7 音分 → 拍频余音 */
  bell: {
    wave: 'sine', ring: 2.4, beat: 7, norm: .50,
    p: [[.50, .52, 1.55], [1, .95, 1.10], [1.19, .60, .92], [1.51, .40, .76],
        [2.00, .52, .60], [2.51, .24, .44], [3.01, .18, .32], [4.07, .10, .22]],
    click: .10, hz: 7200, tau: .0014, glide: 0,
    lpMul: 16, lpQ: .9
  },
  /* 水滴：真实水滴是音高向上滑的"嘀"（不是往下掉），极短，带一点水花噪声 */
  water: {
    wave: 'sine', ring: 1.0,
    p: [[1, 1, .120], [1.62, .30, .070], [2.90, .12, .038]],
    click: .34, hz: 3200, tau: .0016, glide: .34,
    lpMul: 20, lpQ: 1.6
  },
  /* 8-bit 街机：方波 + 快速下滑 + 极短，像芯片音源的单声道 blip */
  retro: {
    wave: 'square', ring: .85,
    p: [[1, 1, .100], [2.00, .32, .062], [3.00, .14, .034]],
    click: .18, hz: 5200, tau: .0011, glide: -.16,
    lpMul: 9, lpQ: .7
  },
  /* 铝管风铃：分音极端非谐（1 : 2.76 : 5.4 : 8.9），余音极长，靠 4 音分拍频晃动 */
  chime: {
    wave: 'sine', ring: 3.2, beat: 4,
    p: [[1, 1, 1.85], [2.76, .40, 1.25], [5.40, .20, .85], [8.93, .10, .50], [13.3, .04, .30]],
    click: .05, hz: 8200, tau: .0013, glide: 0,
    lpMul: 22, lpQ: .8
  },
  /* 马林巴：琴条按 1 : 4 : 10 调音（4 倍频是"木"的音色来源），槌头噪声偏软 */
  marimba: {
    wave: 'sine', ring: 1.4,
    p: [[1, 1, .380], [4.00, .40, .140], [9.90, .12, .046], [16.2, .05, .020]],
    click: .30, hz: 1500, tau: .0026, glide: -.018,
    lpMul: 11, lpQ: 1.0, thump: .12
  },
  /* 泡泡：更低更短，上行滑音更夸张（肥皂泡破裂的"啵"） */
  bubble: {
    wave: 'sine', ring: .7,
    p: [[1, 1, .080], [2.24, .26, .042]],
    click: .30, hz: 2400, tau: .0015, glide: .52,
    lpMul: 18, lpQ: 2.0, thump: .10
  },
  /* 减法合成 lead：锯齿波 + 滤波器包络（截止从亮扫到暗） */
  synth: {
    wave: 'sawtooth', ring: 1.0,
    p: [[1, 1, .200], [2.00, .38, .130], [3.00, .20, .085]],
    click: .05, hz: 4000, tau: .0013, glide: 0,
    lpMul: 16, lpQ: 6, fenv: { from: 26, to: 6, t: .13 }
  }
};

/* 一次敲击：琴体滤波 → 分音组（含拍频对）→ 瞬态 / 低频冲击。delay 用于琶音排程。 */
function strike(f0, dur, gain, mat, wave, delay) {
  if (!AC) return;
  var t0 = AC.currentTime + (delay || 0);
  /* ① 琴体：低通 + 共振，把散落的分音收成一件乐器；合成器再加滤波器包络 */
  var dest = masterGain;
  try {
    if (AC.createBiquadFilter) {
      var body = AC.createBiquadFilter();
      body.type = 'lowpass';
      body.frequency.setValueAtTime(Math.max(320, f0 * (mat.lpMul || 14)), t0);
      if (mat.lpQ) body.Q.value = mat.lpQ;
      if (mat.fenv) {
        var fe = mat.fenv;
        body.frequency.setValueAtTime(Math.max(240, f0 * fe.from), t0);
        body.frequency.exponentialRampToValueAtTime(Math.max(200, f0 * fe.to), t0 + fe.t);
      }
      body.connect(masterGain);
      dest = body;
    }
  } catch (e) { dest = masterGain; }

  var oscType = mat.wave || ((wave && wave !== 'sine') ? wave : 'sine');
  var ring = mat.ring || 1;
  /* ② 分音组：拍频对只给前 3 个主分音（全部成对会让声音糊成一团，也浪费振子） */
  for (var i = 0; i < mat.p.length; i++) {
    var r = mat.p[i][0], a = mat.p[i][1], tau = mat.p[i][2];
    var copies = (mat.beat && i < 3) ? 2 : 1;
    for (var ci = 0; ci < copies; ci++) {
      try {
        var o = AC.createOscillator(), g = AC.createGain();
        o.type = oscType;
        o.frequency.setValueAtTime(f0 * r, t0);
        if (mat.glide) {
          o.frequency.exponentialRampToValueAtTime(Math.max(20, f0 * r * (1 + mat.glide)), t0 + 0.06);
        }
        if (ci === 1) {
          if (o.detune) o.detune.setValueAtTime(mat.beat, t0);      // 几音分 → 慢速拍频
          else o.frequency.setValueAtTime(f0 * r * (1 + mat.beat / 1200), t0);
        }
        /* 余音 = dur × ring，且不超过自身衰减时间的 5.5 倍（钟/风铃才长得起来） */
        var life = Math.min(2.6, Math.max(0.05, Math.min(dur * ring, tau * 5.5)));
        var amp = Math.max(0.0004, gain * a * (ci === 1 ? 0.55 : 1) * (mat.norm || 1));
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(amp, t0 + 0.0012);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + life);
        o.connect(g); g.connect(dest);
        o.start(t0); o.stop(t0 + life + 0.02);
      } catch (e) {}
    }
  }
  /* ③ 槌头/指尖碰上的那一下：极短带通噪声 */
  if (mat.click > 0) noiseBurst(mat.tau * 3, gain * mat.click * 0.5, mat.hz, delay);
  /* ④ 低频冲击：木质/马林巴落地的那声"咚"，只有高频分音没有重量 */
  if (mat.thump) {
    try {
      var o2 = AC.createOscillator(), g2 = AC.createGain();
      o2.type = 'sine';
      o2.frequency.setValueAtTime(f0 * 0.5, t0);
      o2.frequency.exponentialRampToValueAtTime(Math.max(30, f0 * 0.3), t0 + 0.09);
      g2.gain.setValueAtTime(0.0001, t0);
      g2.gain.exponentialRampToValueAtTime(Math.max(0.0004, gain * mat.thump), t0 + 0.006);
      g2.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.11);
      o2.connect(g2); g2.connect(masterGain);
      o2.start(t0); o2.stop(t0 + 0.13);
    } catch (e) {}
  }
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
        strike(ns[i], 0.42, 0.11 - i * 0.005, SFX_MAT.bell, 'sine', i * 0.085);
      }
      strike(261.63, 0.6, 0.055, SFX_MAT.bell, 'sine', 0.255);
    },
    /* v0.48 时间到（超时失败）：A 小调下行 A4→F4→D4→A3，每音 0.19s 错开，
     * 尾巴补一个 A2 闷音收句。和 sfx_win 一样属于"情绪表达"，不随木质/铃音
     * 等材质风格切换，也不读 wav 素材（纯合成，零文件）。总长约 1.55s。 */
    sfx_timeup: function () {
      /* 先一记低频「落地」+ 短噪声，像倒计时牌砸在桌面上；
       * 再走 A 小调下行。纯正弦低频在手机外放上容易被忽略，
       * 所以低频与噪声都给到比普通 UI 音更高一档。 */
      strike(82.41, 1.05, 0.20, SFX_MAT.wood, 'triangle');
      noiseBurst(0.18, 0.13, 220, 0);
      var ns = [440.00, 349.23, 293.66, 220.00];
      for (var i = 0; i < ns.length; i++) {
        strike(ns[i], 0.28, 0.13 - i * 0.014, SFX_MAT.bell, 'sine', i * 0.19);
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
/* v0.49：主页曲改成「按代隔离」。
 *
 * v0.47 已经会在重新开闸前把上一代振荡器同步 stop()，但两代仍共用同一个
 * homeGate 和同一条 delay/feedback 回声线。快速进出主页时会出现两类残留：
 *   ① stop() 在个别基础库上只覆盖「未来 stop」，旧音符仍挂在旧时间轴上；
 *   ② 回声反馈环里的尾音不会因为 stop() 立刻消失，新代一开闸就把旧尾音放大。
 * 听感就是"两首主页曲叠在一起，过一会儿才自己好"。
 *
 * 现在每一代都拥有自己的 gate / lead / delay / feedback / wet / osc；
 * homeStart() 先 flushHomeDead() 把旧代整张图断开，再建新图。旧代即使
 * stop() 没生效，也只挂在已经归零的旧 gate 上，永远不可能被新代开闸复活。 */
var homeGen = null;          // 当前代 { osc, gate, lead, delay, fb, wet, seq, watch, stopTimer }
var homeDying = [];          // 正在淡出、等待硬停的旧代

function stopHomeGen(gen) {
  if (!gen) return;
  if (gen.stopTimer) { clearTimeout(gen.stopTimer); gen.stopTimer = 0; }
  if (gen.seq && gen.seq.timer) { clearInterval(gen.seq.timer); gen.seq.timer = 0; }
  if (gen.watch) { clearTimeout(gen.watch); gen.watch = 0; }
  for (var i = 0; i < gen.osc.length; i++) {
    try { gen.osc[i].stop(); } catch (e) {}
  }
  gen.osc = [];
  try {
    if (gen.gate && gen.gate.gain) {
      if (gen.gate.gain.cancelScheduledValues) gen.gate.gain.cancelScheduledValues(0);
      if (gen.gate.gain.setValueAtTime) gen.gate.gain.setValueAtTime(0, AC ? AC.currentTime : 0);
      gen.gate.gain.value = 0;
    }
  } catch (e) {}
  try { if (gen.gate) gen.gate.disconnect(); } catch (e) {}
  try { if (gen.lead) gen.lead.disconnect(); } catch (e) {}
  try { if (gen.delay) gen.delay.disconnect(); } catch (e) {}
  try { if (gen.fb) gen.fb.disconnect(); } catch (e) {}
  try { if (gen.wet) gen.wet.disconnect(); } catch (e) {}
  var k = homeDying.indexOf(gen);
  if (k >= 0) homeDying.splice(k, 1);
}

/* 把旧代彻底停掉（同步），连同回声反馈环一起断开。 */
function flushHomeDead() {
  var list = homeDying.slice(0);
  homeDying = [];
  for (var i = 0; i < list.length; i++) stopHomeGen(list[i]);
}

/* 当前这一代里还有多少音"在时间轴上"（尚未到 stop 时刻）—— 供验收断言用 */
function homeOscLive() {
  if (!AC || !homeGen) return 0;
  var now = AC.currentTime, n = 0, list = homeGen.osc;
  for (var i = 0; i < list.length; i++) {
    if ((list[i]._end || 0) > now) n++;
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

/* 新建一代完整的音频图。注意这里绝不能复用旧 gate / delay ——
 * 复用就是 v0.47 仍然会叠回声的根因。 */
function createHomeGen() {
  if (!AC) return null;
  var gen = { osc: [], gate: null, lead: null, delay: null, fb: null, wet: null,
    seq: null, watch: 0, stopTimer: 0 };
  try {
    gen.gate = AC.createGain();
    gen.gate.gain.value = 0;
    gen.gate.connect(bgmGain);
    var E = (CONFIG.AUDIO.home && CONFIG.AUDIO.home.echo) || {};
    gen.lead = AC.createGain();
    gen.lead.gain.value = 1;
    gen.lead.connect(gen.gate);
    if (AC.createDelay && E.delay) {
      gen.delay = AC.createDelay(1.0);
      gen.fb = AC.createGain();
      gen.wet = AC.createGain();
      gen.delay.delayTime.value = E.delay;
      gen.fb.gain.value = E.feedback || 0.24;
      gen.wet.gain.value = E.wet || 0.22;
      gen.lead.connect(gen.delay);
      gen.delay.connect(gen.fb); gen.fb.connect(gen.delay);
      gen.delay.connect(gen.wet); gen.wet.connect(gen.gate);
    }
  } catch (e) {
    stopHomeGen(gen);
    return null;
  }
  return gen;
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
    if (homeGen) homeGen.osc = keep;   // 当前代也要指向新数组，否则 stop 漏掉后来的音
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
  /* 已在放：只同步音量，绝不再排一代。 */
  if (homeGen && homeGen.seq) { applyBgmGain(); return; }
  /* 异常残留（gen 在但 seq 没了）：先硬停，避免它挡住新代。 */
  if (homeGen) homeStop(false);
  var H = CONFIG.AUDIO.home;
  if (!H || !H.prog) return;
  /* 新代开建之前，把旧代连同回声反馈环彻底断开。
   * 这一步是新旧两代不共用 gate/delay 的关键：即使旧 stop() 没生效，
   * 旧音符也只挂在旧 gate 上，而旧 gate 已经是 0 且已 disconnect。 */
  flushHomeDead();
  var gen = createHomeGen();
  if (!gen) return;
  homeGen = gen; HOME_OSC = gen.osc; homeGate = gen.gate; homeLead = gen.lead;
  gateTo(1);
  var beat = 60 / (H.bpm || 100), bar = beat * 4;
  var seq = gen.seq = { bar: 0, nextT: AC.currentTime + 0.04, timer: 0, watch: 0 };
  homeSeq = seq;
  var tick = function () {
    if (!homeGen || homeGen.seq !== seq || !AC) return;
    if (!acRunning()) {                          // 挂起时时钟是冻的，别拿它算时刻
      ensureAC();
      return;
    }
    /* 从挂起里醒来时时钟可能跳过一段：落后太多就重新对表，避免一次性补放一堆音 */
    if (seq.nextT < AC.currentTime - 0.25) seq.nextT = AC.currentTime + 0.05;
    var horizon = AC.currentTime + bar * 0.98 + 0.05, guard = 0;
    while (seq.nextT < horizon && guard++ < 4) {
      homeBar(seq.bar, seq.nextT, beat);
      seq.nextT += bar; seq.bar++;
    }
  };
  tick();
  seq.timer = setInterval(tick, 400);
  /* 健康检查：600ms 后如果还没醒（有些机型 resume 会被静默拒），再叫一次；
   * 闸门若被旧的淡出 ramp 拖到接近 0，也顺手拉回来。 */
  seq.watch = setTimeout(function () {
    if (!homeGen || homeGen.seq !== seq) return;
    if (!acRunning()) ensureAC();
    try {
      if (gen.gate.gain.value < 0.5) gateTo(1);
    } catch (e) {}
  }, 600);
  gen.watch = seq.watch;
  applyBgmGain();
}

function homeStop(soft) {
  var gen = homeGen;
  if (gen) {
    if (gen.seq && gen.seq.timer) { clearInterval(gen.seq.timer); gen.seq.timer = 0; }
    if (gen.watch) { clearTimeout(gen.watch); gen.watch = 0; }
    gen.seq = null;
  }
  homeGen = null; homeSeq = null; HOME_OSC = [];
  homeGate = null; homeLead = null;
  /* 比当前代更早的残留先全部清掉 */
  flushHomeDead();
  if (!gen || !AC) return;
  /* soft=true：进关卡时主页曲淡出 150ms，给 mp3 一点缓冲时间。
   * 硬切（30ms）会先静音一两百毫秒，听感就是"音乐没了"；
   * 关音乐 / 切后台仍然用硬切，那两处不需要过渡。 */
  var ramp = soft ? 0.15 : 0.03;
  try {
    var g = gen.gate.gain, cur = g.value;
    if (g.cancelScheduledValues) g.cancelScheduledValues(0);   // 清历史，含上一次淡出
    if (g.setValueAtTime) g.setValueAtTime(cur, AC.currentTime);
    g.linearRampToValueAtTime(0, AC.currentTime + ramp);
  } catch (e) { try { if (gen.gate) gen.gate.gain.value = 0; } catch (e2) {} }
  /* 这一代挂进 homeDying，等淡出走完再停。它的 gate 和 delay 都是自己的，
   * 新代开闸不会把它重新放出来；homeStart() 若在淡出中到来，会先 flush 掉它。 */
  homeDying.push(gen);
  gen.stopTimer = setTimeout(function () {
    gen.stopTimer = 0;
    stopHomeGen(gen);
  }, soft ? 190 : 60);
}

/* ---------------- 关卡 mp3：每首一个 InnerAudioContext，解锁时建好预载 ----------------
 * 切曲 = 暂停旧的 + 播新的，同步完成；实例在解锁时就建好并设 src，
 * 平台据此开始缓冲，真正播的时候不用再等解码。
 * v0.62：4 首 mp3 搬进分包 audio-pkg/，上面这套逻辑不变，只在「拿路径」处加一道闸门。
 */
var BGM_CTX = {}, curCtx = null, bgmScene = 'home', bgmFileNow = '';

/* v0.62 音频分包闸门 —— BGM 占旧主包 2.0MB / 63%，是「关卡扩不动」的真正原因。
 * 现在主包只装短音效，mp3 全部在 audio-pkg/ 里按需下载：
 *   · 首次触摸就 wx.preDownloadSubpackage 预取（玩家在主页点两下再进关，基本已就绪）；
 *   · 真正要放关卡曲时若还没好，先让主页合成曲继续响，就绪后由 done() 补播，中间不静默；
 *   · 失败 = 永久静音降级（主页仍有合成轻音乐），绝不影响玩法；
 *   · 失败 60s 后允许重试一次，网络恢复的用户不用重启小程序。
 * 注意：分包没就绪时**不能**建 InnerAudioContext —— src 指向分包内路径，
 * 此时加载必然失败，还会把「错误」缓存进实例里。 */
var PKG = { state: 0, cbs: [], failAt: 0, task: null };   // 0 未开始 / 1 加载中 / 2 就绪 / 3 失败
function bgmPkgName() { return (CONFIG.AUDIO && CONFIG.AUDIO.subpackage) || 'audio'; }
function loadBgmPkg(cb) {
  if (cb) {
    if (PKG.state === 2) { cb(true); return; }
    if (PKG.state === 3 && (Date.now() - PKG.failAt) < 60000) { cb(false); return; }
    PKG.cbs.push(cb);
  }
  if (PKG.state === 1 || PKG.state === 2) return;
  if (PKG.state === 3) { PKG.state = 0; PKG.failAt = 0; }   // 超时重试
  PKG.state = 1;
  var done = function (ok) {
    PKG.state = ok ? 2 : 3;
    if (!ok) PKG.failAt = Date.now();
    var list = PKG.cbs; PKG.cbs = [];
    for (var i = 0; i < list.length; i++) { try { list[i](ok); } catch (e) {} }
    if (ok) {
      /* 就绪后才允许建实例 + 预载；如果玩家已经在关卡里等着听，立刻补播 */
      bgmPreloaded = false;
      preloadBgm();
      if (unlocked && enabled.bgm && bgmScene !== 'home') bgmPlay(bgmScene);
    }
  };
  if (!wx.loadSubpackage) { done(false); return; }
  try {
    PKG.task = wx.loadSubpackage({
      name: bgmPkgName(),
      success: function () { PKG.task = null; done(true); },
      fail: function () { PKG.task = null; done(false); }
    });
  } catch (e) { done(false); }
}
/* 三个触发点：首次触摸（预取）、进关卡（必须）、设置里重新打开音乐 */
function bgmPkgReady() { return PKG.state === 2; }

function bgmFile(key) {
  var m = (CONFIG.AUDIO && CONFIG.AUDIO.bgm) || {};
  if (key === 'home') return m.home || '';
  var arr = m.lv || [];
  if (!arr.length) return m.home || '';
  var i = parseInt(String(key).replace(/^lv/, ''), 10);
  return arr[((isFinite(i) && i > 0 ? i - 1 : 0) % arr.length)];
}
function bgmPath(file) {
  var base = (CONFIG.AUDIO.bgmPkg || CONFIG.AUDIO.base || '') + file;
  return base.replace(/^\.\//, '');
}
function ctxFor(file) {
  if (BGM_CTX[file]) return BGM_CTX[file];
  if (!bgmPkgReady()) return null;              // v0.62：分包未就绪不建实例
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
  /* v0.62：分包没好就只排队，不能提前建实例（src 指向分包路径，必失败） */
  if (!bgmPkgReady()) { loadBgmPkg(); return; }
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
  /* v0.62：分包还没就绪 —— 先让主页合成曲继续响着，别提前把音乐掐成静音。
   * 分包成功回调里会再调一次 bgmPlay(bgmScene) 补播。 */
  if (!bgmPkgReady()) { loadBgmPkg(); return; }
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
    scene: bgmScene, home: !!homeGen,
    gate: homeGen && homeGen.gate && homeGen.gate.gain ? homeGen.gate.gain.value : null,
    gain: bgmGain && bgmGain.gain ? bgmGain.gain.value : null,
    file: bgmFileNow, playing: n, ctxs: Object.keys(BGM_CTX).length,
    volume: curCtx ? curCtx.volume : null, paused: curCtx ? curCtx.paused : null,
    preloaded: bgmPreloaded, ac: AC ? AC.state : null,
    /* v0.49：主页曲的"代际"健康度。
     * live = 当前代还在时间轴上的音符数；
     * dead = 仍在淡出的旧代数（每代都有独立 gate/delay，正常应很快归 0）。 */
    live: homeOscLive(), dead: homeDying.length
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

/* v0.62：首次触摸就把 BGM 分包静默预取。
 * 玩家在主网点一下（任何一下）→ 开始下载 2MB；等他真的进关卡时通常已就绪，
 * 既不给首屏增加冷启动负担，也不会出现「进关半天没音乐」。
 * 关掉了音乐设置的人不下 —— 省流量。 */
var pkgKicked = false;
function kickBgmPkg() {
  if (pkgKicked) return;
  pkgKicked = true;
  if (!enabled.bgm) return;
  loadBgmPkg();
}
try {
  wx.onTouchStart(kickBgmPkg);
  if (wx.onShow) wx.onShow(function () { if (unlocked && enabled.bgm) loadBgmPkg(); });
} catch (e) {}

/* ---------------- 启动 ---------------- */
function boot() {
  var game = core({
    ctx: ctx,
    size: viewportSize,
    dpr: dpr,
    safeInsets: safeInsets,
    bindInput: bindInput,
    /* v0.62 性能三件套：设备档位、帧率上限、GC 提示 */
    device: function () { return { tier: deviceTier(), benchmarkLevel: deviceInfo().benchmarkLevel }; },
    setFps: function (n) { try { if (wx.setPreferredFramesPerSecond) wx.setPreferredFramesPerSecond(n); } catch (e) {} },
    gc: function () { try { if (wx.triggerGC) wx.triggerGC(); } catch (e) {} },
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
  /* v0.62：官方《垃圾回收》—— 内存告警时先丢缓存（渐变/测宽/粒子），再请系统 GC。
   * 贴图与存档不动：丢图片会让首页闪白，存档丢了更不可接受。 */
  try {
    if (wx.onMemoryWarning) {
      wx.onMemoryWarning(function () {
        try { game.trimMemory(); } catch (e) {}
        try { if (wx.triggerGC) wx.triggerGC(); } catch (e) {}
      });
    }
  } catch (e) {}
}

loadArt(boot);
