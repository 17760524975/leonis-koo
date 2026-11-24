/* 方寸巧拼 · 网页平台适配层
 * 只做「浏览器 ↔ 核心」的桥：Canvas / 尺寸 / 安全区 / 触摸 / 存档 / 音频 / 震动 / 图片
 * 核心逻辑一行都不在这里。
 */
(function () {
  'use strict';
  var C = window.TANGRAM_CONFIG;

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d', { alpha: false });
  var probe = document.getElementById('safe-probe');

  /* ---------------- 尺寸 ---------------- */
  function viewportSize() {
    // iOS Safari 的 100% 高度在地址栏收起/展开时会变，用 innerWidth/Height 更可靠
    var w = window.innerWidth || document.documentElement.clientWidth || 375;
    var h = window.innerHeight || document.documentElement.clientHeight || 667;
    return { w: w, h: h };
  }
  function readSafeInsets() {
    var cs = window.getComputedStyle(probe);
    var t = parseFloat(cs.paddingTop) || 0;
    var b = parseFloat(cs.paddingBottom) || 0;
    return { top: t, bottom: b };
  }

  /* ---------------- 存档 ---------------- */
  var memStore = {};
  var storage = {
    get: function (k) {
      try { return window.localStorage.getItem(k); } catch (e) { return memStore[k] || null; }
    },
    set: function (k, v) {
      try { window.localStorage.setItem(k, v); } catch (e) { memStore[k] = v; }
    }
  };

  /* ---------------- 音频 ----------------
   * 移动端自动播放限制：AudioContext 必须在用户手势里创建/resume，
   * 所以第一次 pointerdown 才 initAudio()，之前一律静音不报错。
   * 载入优先级：fetch+decodeAudioData（低延迟、可精确循环、可变调）
   *   → <audio> 元素池（file:// 双击打开时 fetch 被浏览器禁掉，只能走这条）
   *   → Web Audio 合成（素材缺失时兜底，保证「有声音」而不是静音）
   */
  var AC = null, masterGain = null, bgmGain = null, bgmSrc = null;
  var buf = {}, pool = {}, poolIdx = {};
  var enabled = { sfx: true, bgm: true };
  var ducked = false, snapVoices = 0, lastTapAt = 0;
  var unlocked = false, buffersReady = false, loadedOk = 0, elementMode = false;
  var bgmStarted = false;
  var bgmScene = 'home';

  function initAudio() {
    if (AC) return;
    var Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    try {
      AC = new Ctor();
      masterGain = AC.createGain();
      masterGain.gain.value = 1;
      masterGain.connect(AC.destination);
      bgmGain = AC.createGain();
      bgmGain.gain.value = 0;
      /* v0.7：合成 BGM 音符振幅提到 0.115/0.19/0.14 后，多音叠加峰值接近 0.45，
       * 这里挂一道软限幅（阈值 -8dB / 6:1）兜住瞬态，避免手机外放破音。
       * 老基础库或音频实现没有 createDynamicsCompressor 时静默回退直连，不影响发声。 */
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
    } catch (e) { AC = null; }
  }
  function resumeAudio() {
    initAudio();
    if (AC && AC.state === 'suspended') { try { AC.resume(); } catch (e) {} }
  }

  // ---- 合成音效 ----
  function tone(freq, dur, type, gain, delay, slideTo) {
    if (!AC) return;
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
  }
  function noise(dur, gain, filterFreq, delay) {
    if (!AC) return;
    var t0 = AC.currentTime + (delay || 0);
    var n = Math.floor(AC.sampleRate * dur);
    var buf = AC.createBuffer(1, n, AC.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.5);
    var src = AC.createBufferSource();
    src.buffer = buf;
    var bp = AC.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = filterFreq || 1800; bp.Q.value = 1.1;
    var g = AC.createGain();
    g.gain.value = gain || 0.18;
    src.connect(bp); bp.connect(g); g.connect(masterGain);
    src.start(t0);
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
  if (mat.click > 0) noise(mat.tau * 3, gain * mat.click * 0.5, mat.hz, delay);
}

function buildSfxSynth(key) {
  var st = (C.SFX_STYLES && C.SFX_STYLES[key]) ||
    (C.SFX_STYLES && C.SFX_STYLES.wood) || { pitch: 1, decay: 1, wave: 'sine' };
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
    }
  };
}
var synth = buildSfxSynth('wood');
var sfxStyleKey = 'wood';


  /* ---- 预加载：fetch → decodeAudioData ---- */
  function loadBuffers() {
    if (!C.AUDIO.enabled || !AC || buffersReady) return;
    // file:// 双击打开时浏览器禁用 fetch（连 XHR 也不行），别白试一遍：
    // 直接走 <audio> 元素池。必须同步决定，才能保住手势上下文里 play() 的放行资格。
    if (location.protocol === 'file:') {
      buffersReady = true;
      elementMode = true;
      startBgm();
      return;
    }
    var names = [], k;
    for (k in C.AUDIO.files) names.push(k);
    var left = names.length;
    if (!left) { buffersReady = true; elementMode = true; return; }
    function settle(ok) {
      if (ok) loadedOk++;
      if (--left > 0) return;
      buffersReady = true;
      elementMode = loadedOk === 0;       // 全部失败（典型：file:// 双击打开）→ 元素池
      startBgm();
    }
    names.forEach(function (name) {
      fetch(C.AUDIO.base + C.AUDIO.files[name], { cache: 'force-cache' })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
        .then(function (ab) {
          return new Promise(function (res, rej) {
            try { AC.decodeAudioData(ab, res, rej); } catch (e) { rej(e); }
          });
        })
        .then(function (b) { buf[name] = b; settle(true); })
        .catch(function () { settle(false); });
    });
  }

  /* ---- v0.13 主页轻音乐（合成，零音频文件） ----
   * 四个声部按 8 小节谱排程：低音 / 和弦轻扫 / 八分琶音 / 主旋律，
   * 谱在 config 的 AUDIO.home（MIDI 记谱），改曲子只动配置不动代码。
   *
   * 为什么中间要多一个闸门（homeGate）：振荡器是提前一小节排进时间轴的，
   * 只 clearInterval 拦不住已经排好的音——切到关卡后还会再响一整小节（2.4s），
   * 听起来就是"主页音乐切不过去"。闸门 30ms 拉到 0、随后硬停振荡器。 */
  var HOME_OSC = [], homeGate = null, homeLead = null, homeSeq = null;
  /* v0.47：上一代正在淡出的振荡器（详见 miniprogram/game.js 同处注释）。
   * 旧版把 stop() 挂在 190ms 定时器上，这段时间内又 homeStart 的话，
   * 闸门被拉回 1 → 上一代已排程的音符重新出声，听起来就是两首主页曲叠在一起。 */
  var homeDead = [], homeDeadTimer = 0;

  function flushHomeDead() {
    if (homeDeadTimer) { clearTimeout(homeDeadTimer); homeDeadTimer = 0; }
    var list = homeDead;
    homeDead = [];
    for (var i = 0; i < list.length; i++) { try { list[i].stop(); } catch (e) {} }
  }

  function homeInit() {
    if (!AC || homeGate) return;
    try {
      homeGate = AC.createGain();
      homeGate.gain.value = 0;
      homeGate.connect(bgmGain);
      var E = (C.AUDIO.home && C.AUDIO.home.echo) || {};
      /* 主旋律单独一路：干声 + 短回声（不支持 DelayNode 的环境直接跳过） */
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
    /* v0.47：长驻主页时按"响完没有"清一遍，避免几百个已结束的振荡器一直被引用 */
    if (HOME_OSC.length > 300) {
      var keep = [], nowT = AC.currentTime;
      for (var pi = 0; pi < HOME_OSC.length; pi++) {
        if ((HOME_OSC[pi]._end || 0) > nowT) keep.push(HOME_OSC[pi]);
      }
      HOME_OSC = keep;
    }
  }
  /* 木琴音：基音 + 很弱的 4 倍频泛音（给一点"木"的亮度，不是钟声） */
  function homeMallet(freq, at, dur, peak, dest) {
    homePartial(freq, at, dur, peak, 'sine', 0.006, dest);
    homePartial(freq * 4.02, at, dur * 0.26, peak * 0.14, 'sine', 0.004, dest);
  }
  /* 力度/时间抖动：确定性哈希，同一遍听感稳定，但每个音不完全一样 */
  function hJit(i) { var x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); }

  function homeBar(bar, t0, beat) {
    var H = C.AUDIO.home, P = H.prog, i = bar % P.length;
    var ch = P[i], g = H.gain || {};
    /* 低音：1、3 拍各一下，三角波，1.7 拍收 */
    homePartial(mtof(ch.b), t0, beat * 1.7, g.bass || 0.17, 'triangle', 0.012);
    homePartial(mtof(ch.b), t0 + beat * 2, beat * 1.5, (g.bass || 0.17) * 0.82, 'triangle', 0.012);
    /* 和弦轻扫：第一拍把三个和弦音错开 20ms 扫下来，音量很低，只做和声垫 */
    for (var c = 0; c < ch.ch.length; c++) {
      homePartial(mtof(ch.ch[c]), t0 + c * 0.02, beat * 1.6, g.chord || 0.05, 'triangle', 0.02);
    }
    /* 八分琶音 */
    var arp = H.arp || [0, 1, 2, 1];
    for (var k = 0; k < 8; k++) {
      var idx = arp[k % arp.length];
      var m = idx === 3 ? ch.ch[0] + 12 : ch.ch[idx];
      var v = (g.arp || 0.085) * (0.85 + 0.3 * hJit(bar * 8 + k));
      homeMallet(mtof(m), t0 + k * beat / 2 + hJit(bar * 8 + k + 99) * 0.006, beat * 0.55, v);
    }
    /* 主旋律 */
    var mel = H.melody || [], mb = bar % P.length;
    for (var q = 0; q < mel.length; q++) {
      var n = mel[q];
      if (n[0] !== mb) continue;
      homeMallet(mtof(n[2]), t0 + n[1] * beat, n[3] * beat * 1.15, g.lead || 0.125, homeLead);
    }
  }

  function homeStart() {
    if (!AC || !enabled.bgm) return;
    resumeAudio();                               // v0.14.2：挂起的 AudioContext 先叫醒，否则排了也不响
    homeInit();
    if (!homeGate) return;
    if (homeSeq) { applyBgmGain(); return; }          // 已在放
    var H = C.AUDIO.home;
    if (!H || !H.prog) return;
    var beat = 60 / (H.bpm || 100), bar = beat * 4;
    /* 闸门直接置 1：每个音自带 5~20ms 起音，闸门不需要再淡入；
     * 用 ramp 反而要看音频时钟推进，页面在后台时会停在 0 → 误判"没声音"。 */
    flushHomeDead();   // v0.47：开闸前先停掉上一代，否则旧曲会被重新放出来
    try {
      if (homeGate.gain.cancelScheduledValues) homeGate.gain.cancelScheduledValues(AC.currentTime);
      homeGate.gain.value = 1;
    } catch (e) {}
    homeSeq = { bar: 0, nextT: AC.currentTime + 0.04, timer: 0 };
    var tick = function () {
      if (!homeSeq || !AC) return;
      var horizon = AC.currentTime + bar * 0.98 + 0.05, guard = 0;
      while (homeSeq.nextT < horizon && guard++ < 4) {
        homeBar(homeSeq.bar, homeSeq.nextT, beat);
        homeSeq.nextT += bar; homeSeq.bar++;
      }
    };
    tick();
    homeSeq.timer = setInterval(tick, 400);           // 提前一小节排程，定时器抖动不影响发音
    applyBgmGain();
  }

  function homeStop(soft) {
    if (homeSeq && homeSeq.timer) clearInterval(homeSeq.timer);
    homeSeq = null;
    if (homeGate && AC) {
      /* soft=true：进关卡时主页曲淡出 150ms，给 mp3 一点缓冲时间。
       * 硬切（30ms）会先静音一两百毫秒，听感就是"音乐没了"。 */
      var ramp = soft ? 0.15 : 0.03;
      try {
        homeGate.gain.cancelScheduledValues(AC.currentTime);
        homeGate.gain.setValueAtTime(homeGate.gain.value, AC.currentTime);
        homeGate.gain.linearRampToValueAtTime(0, AC.currentTime + ramp);
      } catch (e) { try { homeGate.gain.value = 0; } catch (e2) {} }
    }
    /* 闸门归零后再硬停振荡器，避免已经排进时间轴的音继续响 */
    /* v0.47：挂进 homeDead，淡出走完再硬停；若中途又 homeStart，那边会先同步清场 */
    if (homeDead.length) flushHomeDead();
    homeDead = HOME_OSC; HOME_OSC = [];
    if (homeDeadTimer) clearTimeout(homeDeadTimer);
    homeDeadTimer = setTimeout(function () {
      homeDeadTimer = 0;
      var list = homeDead; homeDead = [];
      for (var i = 0; i < list.length; i++) { try { list[i].stop(); } catch (e) {} }
    }, soft ? 190 : 60);
  }

  /* ---- 关卡 mp3：每首一个 <audio>，开局预载 ----
   * 切曲 = 暂停旧的 + 播新的，两步同步完成；预载把"点开始后等几百毫秒才响"
   * 这段等待吃掉了。音量 0→目标用 60ms 抬起，避免爆音。 */
  var EL = {}, curEl = null, bgmFileNow = '';

  function bgmFile(key) {
    var A = C.AUDIO, m = A.bgm || {};
    if (key === 'home') return m.home || '';
    var arr = m.lv || [];
    if (!arr.length) return m.home || '';
    var i = parseInt(String(key).replace(/^lv/, ''), 10);
    return arr[((isFinite(i) && i > 0 ? i - 1 : 0) % arr.length)];
  }
  function elFor(file) {
    if (EL[file]) return EL[file];
    var el = new Audio();
    el.loop = true;
    el.preload = 'auto';
    el.volume = 0;
    try { el.src = C.AUDIO.base + file; } catch (e) {}
    EL[file] = el;
    return el;
  }
  /* v0.14.1：预载只建元素（preload=auto 会自己缓冲），不真的 play()。
   * 加闸门是为了"只建一次"——反复进来会重复请求 4 个文件。 */
  var bgmPreloaded = false;
  function preloadBgm() {
    if (bgmPreloaded) return;
    bgmPreloaded = true;
    var lv = (C.AUDIO.bgm && C.AUDIO.bgm.lv) || [];
    for (var i = 0; i < lv.length; i++) elFor(lv[i]);
  }
  /* 首播兜底：play() 在"还没缓冲好"时会 reject，不重试就是「进关卡没音乐」。
   * 一次 canplay 补播 + 320ms 看门狗，两道就够，不做无限重试。 */
  function armWatch(el, file) {
    if (el._watch) { clearTimeout(el._watch); el._watch = null; }
    el._watch = setTimeout(function () {
      el._watch = null;
      if (!enabled.bgm || bgmFileNow !== file) return;
      if (el.paused) { var q = el.play(); if (q && q.catch) q.catch(function () {}); }
    }, 320);
  }
  function startEl(el, file) {
    var p = el.play();
    if (p && p.catch) {
      p.catch(function () {
        if (!el.addEventListener) return;
        var once = function () {
          el.removeEventListener('canplay', once);
          if (enabled.bgm && bgmFileNow === file) {
            var q = el.play(); if (q && q.catch) q.catch(function () {});
          }
        };
        el.addEventListener('canplay', once);
      });
    }
    armWatch(el, file);
  }
  function pauseAll(except) {
    for (var k in EL) {
      if (!Object.prototype.hasOwnProperty.call(EL, k)) continue;
      var el = EL[k];
      if (el === except) continue;
      if (!el.paused) { try { el.pause(); } catch (e) {} }
      try { el.volume = 0; } catch (e) {}
    }
  }
  function bgmTarget() {
    if (!enabled.bgm) return 0;
    return ducked ? C.AUDIO.bgmDuckVolume : C.AUDIO.bgmVolume;
  }
  /* v0.13 响度对齐：每首乘自己的 trim 系数（见 config 注释），
   * 不然四首关卡曲之间会差 10dB。 */
  function trimOf(key) {
    /* 传进来的可能是文件名（bgm_lv1.mp3），也可能只是键（home），统一去掉扩展名 */
    var k = String(key || '').replace(/\.mp3$/i, '');
    var t = (C.AUDIO.trim || {})[k];
    return (typeof t === 'number' && t > 0) ? t : 1;
  }
  function applyBgmGain() {
    var v = bgmTarget();
    if (curEl) { try { curEl.volume = Math.max(0, Math.min(1, v * trimOf(bgmFileNow))); } catch (e) {} }
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
      curEl = null; bgmFileNow = '';
      homeStart();
      return;
    }
    homeStop(true);                               // 进关卡：主页曲淡出 150ms 让位给 mp3
    preloadBgm();
    var el = elFor(file);
    /* 同一首已经在放就别重头开始——1~5 关都是 lv1，换关不该把音乐倒回去 */
    if (el === curEl && !el.paused) {
      try { el.volume = Math.min(1, bgmTarget() * trimOf(file)); } catch (e) {}
      armWatch(el, file);
      return;
    }
    pauseAll(el);
    curEl = el; bgmFileNow = file;
    /* 音量直接给到位：曲目本身从静音开始，不存在爆音；
     * 淡入只会让"点开始"到出声多等几十毫秒。
     * v0.14.1：不再 currentTime=0 —— 元数据没到之前赋值会抛、还可能触发一次重解；
     * 回到同一首时"接着放"比"倒回开头"更不容易听出接缝。 */
    try { el.volume = Math.min(1, bgmTarget() * trimOf(file)); } catch (e) {}
    startEl(el, file);
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

  /* ---- 音效：buffer 优先，元素池次之，合成兜底 ---- */
  function playElement(name, rate, gain) {
    var url = C.AUDIO.base + C.AUDIO.files[name];
    if (!url) return false;
    var arr = pool[name] || (pool[name] = []);
    var i = (poolIdx[name] = ((poolIdx[name] || 0) + 1) % 3);
    var el = arr[i];
    if (!el) { el = arr[i] = new Audio(url); el.preload = 'auto'; }
    try {
      el.currentTime = 0;
      el.playbackRate = rate;
      el.volume = Math.max(0, Math.min(1, gain));
      var p = el.play();
      if (p && p.catch) p.catch(function () {});
      return true;
    } catch (e) { return false; }
  }
  function playSfx(name) {
    if (!enabled.sfx) return;
    if (name === 'sfx_snap' && snapVoices >= C.AUDIO.snapVoices) return;
    if (name === 'sfx_tap') {                 // 连点丢帧，避免机关枪
      var t = Date.now();
      if (t - lastTapAt < C.AUDIO.tapGuardMs) return;
      lastTapAt = t;
    }
    // 每次 ±5% 变调 + ±5% 音量：90ms 的木头声听不出音高差，但能打散复读机感
    var rate = 1 + (Math.random() * 0.10 - 0.05);
    var gain = (C.AUDIO.sfxGain[name] || 0.9) * (0.95 + Math.random() * 0.10);
    /* v0.27：非木质风格必须走合成（wav 缓冲是固定的木质录音，换风格听不出差别）。
     * wood 保持原优先级（buffer → element → synth），零回归。
     * v0.31：通关音属于"情绪表达"，不随材质风格变，任何风格都优先播重制素材。 */
    if (sfxStyleKey === 'wood' || name === 'sfx_win') {
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

  var audio = {
    unlock: function () {
      resumeAudio();
      unlocked = true;
      loadBuffers();
      startBgm();
    },
    setEnabled: function (sfx, bgm) {
      enabled.sfx = sfx; enabled.bgm = bgm;
      if (!bgm) {
        /* 先撤看门狗再停，否则 320ms 后的补播会把刚关掉的又放起来 */
        if (curEl && curEl._watch) { clearTimeout(curEl._watch); curEl._watch = null; }
        pauseAll(null); curEl = null; bgmFileNow = '';   // 关卡 mp3
        homeStop();                               // 主页轻音乐（同时清掉已排程的音）
      } else if (unlocked) bgmPlay(bgmScene);
      applyBgmGain();
    },
    duck: function (on) { ducked = !!on; applyBgmGain(); },
    setScene: function (k) { bgmSetScene(k); },   // v0.5：主页 / 关卡多场景 BGM
    setSfxStyle: function (key) {                  // v0.27：切换交互音效风格
      if (!C.SFX_STYLES || !C.SFX_STYLES[key]) key = 'wood';
      sfxStyleKey = key;
      synth = buildSfxSynth(key);
    },
    setVisible: function (v) {                    // 切后台：停调度并静音；回前台恢复
      if (!v) {
        if (curEl && curEl._watch) { clearTimeout(curEl._watch); curEl._watch = null; }
        pauseAll(null); homeStop();               // 切后台：两边都停，别继续排程
      } else if (unlocked && enabled.bgm) {
        bgmPlay(bgmScene);
      }
    },
    play: function (name) {
      if (!enabled.sfx) return;
      resumeAudio();
      playSfx(name);
    }
  };
  /* 调试/验收钩子：tools/audio_probe.html 用它直接驱动 BGM 并读回状态 */
  audio.bgmInfo = function () {
    var info = {
      scene: bgmScene, home: !!homeSeq, gain: (bgmGain && bgmGain.gain) ? bgmGain.gain.value : null,
      gate: (homeGate && homeGate.gain) ? homeGate.gain.value : null,
      preloaded: !!bgmPreloaded, els: Object.keys(EL).length, ac: AC ? AC.state : null,
      playing: (function () { var n = 0; for (var k in EL) if (EL[k] && !EL[k].paused) n++; return n; })()
    };
    if (curEl) {
      info.src = curEl.src; info.file = bgmFileNow;
      info.volume = curEl.volume; info.paused = curEl.paused; info.loop = curEl.loop;
      info.ready = curEl.readyState;                 // 4 = 预载完成，切过来能立刻响
    }
    return info;
  };
  window.__audio = audio;

  /* ---------------- 震动 ---------------- */
  function vibrate(ms) {
    try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {}
  }

  /* ---------------- 图片（素材未到位则跳过，避免 404） ---------------- */
  var images = {};
  function loadArt(done) {
    if (!C.ART.enabled) { done(); return; }
    var keys = [], total = 0, loaded = 0;
    for (var k in C.ART.files) { keys.push(k); total++; }
    if (!total) { done(); return; }
    var finished = false;
    var finish = function () { if (finished) return; finished = true; done(); };
    keys.forEach(function (k) {
      var img = new Image();
      img.onload = function () { images[k] = img; if (++loaded === total) finish(); };
      img.onerror = function () { if (++loaded === total) finish(); };
      img.src = C.ART.base + C.ART.files[k];
    });
    setTimeout(finish, 2000);   // 兜底：图片卡住也要能进游戏
  }

  /* ---------------- 输入 ---------------- */
  var inputHandler = null;
  function emit(type, x, y) { if (inputHandler) inputHandler(type, x, y); }

  function bindInput(fn) {
    inputHandler = fn;
    var usePointer = !!window.PointerEvent;
    var activeId = null;

    function canvasPos(clientX, clientY) {
      var r = canvas.getBoundingClientRect();
      return [clientX - r.left, clientY - r.top];
    }

    if (usePointer) {
      canvas.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        if (activeId !== null) return;           // 只允许单指抓取
        activeId = e.pointerId;
        try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
        var p = canvasPos(e.clientX, e.clientY);
        emit('down', p[0], p[1]);
      }, { passive: false });
      canvas.addEventListener('pointermove', function (e) {
        if (e.pointerId !== activeId) return;
        e.preventDefault();
        var p = canvasPos(e.clientX, e.clientY);
        emit('move', p[0], p[1]);
      }, { passive: false });
      var up = function (e) {
        if (e.pointerId !== activeId) return;
        activeId = null;
        var p = canvasPos(e.clientX, e.clientY);
        emit('up', p[0], p[1]);
      };
      canvas.addEventListener('pointerup', up);
      canvas.addEventListener('pointercancel', function (e) {
        if (e.pointerId !== activeId) return;
        activeId = null;
        emit('cancel', 0, 0);
      });
    } else {
      // 老设备：只挂 touch，绝不同时挂 click（否则会触发两次）
      canvas.addEventListener('touchstart', function (e) {
        e.preventDefault();
        if (activeId !== null) return;
        var t = e.changedTouches[0];
        activeId = t.identifier;
        var p = canvasPos(t.clientX, t.clientY);
        emit('down', p[0], p[1]);
      }, { passive: false });
      canvas.addEventListener('touchmove', function (e) {
        e.preventDefault();
        for (var i = 0; i < e.changedTouches.length; i++) {
          var t = e.changedTouches[i];
          if (t.identifier === activeId) {
            var p = canvasPos(t.clientX, t.clientY);
            emit('move', p[0], p[1]);
          }
        }
      }, { passive: false });
      canvas.addEventListener('touchend', function (e) {
        e.preventDefault();
        for (var i = 0; i < e.changedTouches.length; i++) {
          var t = e.changedTouches[i];
          if (t.identifier === activeId) {
            activeId = null;
            var p = canvasPos(t.clientX, t.clientY);
            emit('up', p[0], p[1]);
          }
        }
      }, { passive: false });
      canvas.addEventListener('touchcancel', function () {
        activeId = null; emit('cancel', 0, 0);
      }, { passive: false });
    }

    // 桌面端：鼠标已由 pointer 覆盖；这里只补键盘/右键屏蔽
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    // 阻止 iOS 双击缩放 / 双指缩放
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    document.addEventListener('dblclick', function (e) { e.preventDefault(); });
  }

  /* ---------------- 启动 ---------------- */
  function boot() {
    var game = window.TANGRAM_CORE({
      ctx: ctx,
      size: viewportSize,
      dpr: function () { return Math.min(window.devicePixelRatio || 1, 3); },
      safeInsets: readSafeInsets,
      bindInput: bindInput,
      storage: storage,
      audio: audio,
      vibrate: vibrate,
      images: images,
      /* v0.9：浏览器没有真广告/真云开发，两个适配层都返回「不可用」，
       * 核心层自动降级（广告走模拟、榜单显示未开启云同步） */
      ad: window.TANGRAM_AD.createAd(),
      cloud: window.TANGRAM_CLOUD.createCloud(),
      share: function (opt) {                     // v0.5 邀请有礼 / v0.8 分享成品图案
        opt = opt || {};
        var text = opt.text || '一起来拼图！';
        var url = location.href;
        try {
          if (navigator.share) navigator.share({ title: opt.title || '方寸巧拼', text: text, url: url });
          else if (navigator.clipboard) navigator.clipboard.writeText(text + ' ' + url);
        } catch (e) {}
      },
      onHide: function (cb) {
        document.addEventListener('visibilitychange', function () {
          if (document.hidden) { audio.setVisible(false); cb(); }
        });
      },
      onShow: function (cb) {
        document.addEventListener('visibilitychange', function () {
          if (!document.hidden) { audio.setVisible(true); cb(); }
        });
      }
    });
    game.init();
    window.__game = game;

    var timer = null;
    function onResize() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () { game.resize(); }, 100);
    }
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', function () { setTimeout(onResize, 260); });
    // iOS 地址栏收起展开
    window.addEventListener('scroll', function () { window.scrollTo(0, 0); });
  }

  loadArt(boot);
})();
