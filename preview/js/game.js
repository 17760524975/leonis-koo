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
  /* v0.29.2 新 BGM：单曲（主页 / 关卡列表）与对局动态混音两套链路。
   * 所有声部都在同一个 WebAudio 时钟上排程，避免多播放器漂移。 */
  var pageKey = 'home', mixPreset = 'calm';
  var singleSrc = null, singleNode = null, singleFile = '';
  var mixSrcs = [], mixGains = {}, mixActive = false;

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

  /* v0.20 音效重做：全部改成「低频为主 + 极短衰减」的木质感。
   * 依据是把参考视频的音轨拆开实测 —— 操作音的能量 65% 落在 0~1kHz、
   * 1~3kHz 只占 8%、衰减 10~15ms；而旧版 sfx_snap 是 1500Hz 带通噪声 +
   * 880→420 方波，1~3kHz 特别重，听感发尖发刺，这就是"难听"的主因。
   * 现在：tap = 620→480Hz 短点；pick = 392→523Hz 上滑；snap = 196→147Hz
   * 加 98Hz 的"笃"（只留一丝 700Hz 木质接触声）；win 去掉原来 1568Hz 的高频
   * 冠音（最刺耳），低音补一层 C5 垫底，242ms 顶点仍与鲜花动效对齐。 */
  /* v0.27 音效风格：默认木质（原音色）。setSfxStyle 会按 CFG.SFX_STYLES 的参数
   * 重写三个操作音（tap/pick/snap）——pitch 改频率、decay 改时值、wave 改波形、
   * bell 追加一层高八度泛音。sfx_win 通关曲保持原样（情绪表达不随风格破坏）。 */
  var SFX_BASE = {
    tap:  { f: 620, d: 0.055, g: 0.085, to: 480, f2: 1240, d2: 0.022, g2: 0.028 },
    pick: { f: 392, d: 0.075, g: 0.115, to: 523, f2: 1046, d2: 0.030, g2: 0.026 },
    snap: { f: 196, d: 0.085, g: 0.21, to: 147, f2: 98, d2: 0.070, g2: 0.12 }
  };
  function buildSfxSynth(key) {
    var st = (C.SFX_STYLES && C.SFX_STYLES[key]) || C.SFX_STYLES.wood || { pitch: 1, decay: 1, wave: 'sine', bell: false };
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
      sfx_snap: function () { mk(SFX_BASE.snap)(); noise(0.020, 0.055, 700); },
      /* v0.29.2：拼接失败——低沉短促的「没吸上」，比成功音轻，避免试错时烦躁 */
      sfx_fail: function () {
        tone(220 * p, 0.16 * d, w, 0.10, 0, 165 * p);
        tone(330 * p, 0.08 * d, 'sine', 0.035, 0.005);
        noise(0.035, 0.028, 500);
      },
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
    var loads = [], k, seen = {};
    function addLoad(key, file) {
      if (!file || seen[file]) return;
      seen[file] = 1; loads.push({ key: key, file: file });
    }
    for (k in C.AUDIO.files) addLoad(k, C.AUDIO.files[k]);
    /* v0.29.2：三首新 BGM + 5 条 stem + 紧张层也一起解码，切场景不用等网络。 */
    var A = C.AUDIO, M = A.mix || {};
    addLoad('bgm_dawn', A.bgm.home); addLoad('bgm_starlit', A.bgm.levels); addLoad('bgm_flow', A.bgm.play);
    for (k in M.stems) addLoad(M.stems[k], M.stems[k]);
    var left = loads.length;
    if (!left) { buffersReady = true; elementMode = true; return; }
    function settle(ok) {
      if (ok) loadedOk++;
      if (--left > 0) return;
      buffersReady = true;
      elementMode = loadedOk === 0;       // 全部失败（典型：file:// 双击打开）→ 元素池
      startBgm();
    }
    loads.forEach(function (it) {
      fetch(C.AUDIO.base + it.file, { cache: 'force-cache' })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
        .then(function (ab) {
          return new Promise(function (res, rej) {
            try { AC.decodeAudioData(ab, res, rej); } catch (e) { rej(e); }
          });
        })
        .then(function (b) { buf[it.key] = b; if (it.key !== it.file) buf[it.file] = b; settle(true); })
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
    HOME_OSC.push(o);
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
    var dead = HOME_OSC; HOME_OSC = [];
    setTimeout(function () {
      for (var i = 0; i < dead.length; i++) { try { dead[i].stop(); } catch (e) {} }
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
  /* ---- v0.29.2：WebAudio 单曲 / 多 stem 混音总线 ---- */
  function rampGain(g, to, ms) {
    if (!g || !AC) return;
    try {
      if (g.gain.cancelScheduledValues) g.gain.cancelScheduledValues(AC.currentTime);
      g.gain.setValueAtTime(g.gain.value, AC.currentTime);
      g.gain.linearRampToValueAtTime(to, AC.currentTime + (ms || 200) / 1000);
    } catch (e) { try { g.gain.value = to; } catch (e2) {} }
  }
  function stopBgmSources(ms) {
    var dead = [];
    if (singleSrc) { dead.push({ s: singleSrc, g: singleNode }); singleSrc = null; singleNode = null; }
    if (mixActive) {
      for (var k in mixSrcs) dead.push({ s: mixSrcs[k], g: mixGains[k] });
      mixSrcs = []; mixGains = {}; mixActive = false;
    }
    singleFile = '';
    if (!dead.length) return;
    ms = ms || 180;
    for (var i = 0; i < dead.length; i++) {
      rampGain(dead[i].g, 0, ms);
      (function (s) { setTimeout(function () { try { s.stop(); } catch (e) {} }, ms + 40); })(dead[i].s);
    }
  }
  function playSingleFile(file) {
    if (!file || !buf[file] || !AC) return false;
    stopBgmSources(160);
    var s = AC.createBufferSource(), g = AC.createGain();
    s.buffer = buf[file]; s.loop = true; g.gain.value = 0;
    s.connect(g); g.connect(bgmGain);
    s.start();
    singleSrc = s; singleNode = g; singleFile = file;
    rampGain(g, trimOf(file), 260);
    return true;
  }
  function applyMix(preset, immediate) {
    var M = C.AUDIO.mix || {}, p = (M.presets || {})[preset] || (M.presets || {}).play || {};
    var trim = typeof M.trim === 'number' ? M.trim : 0.42;
    var ms = immediate ? 0 : (M.fadeMs || 280);
    for (var k in mixGains) rampGain(mixGains[k], (p[k] || 0) * trim, ms);
  }
  function startMix() {
    var M = C.AUDIO.mix || {}, stems = M.stems || {};
    var keys = [], k;
    for (k in stems) if (buf[stems[k]]) keys.push(k);
    if (!keys.length || !AC) return false;
    stopBgmSources(160);
    var t0 = AC.currentTime + 0.04;              // 同一时刻起播，声部之间不会错拍
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i], s = AC.createBufferSource(), g = AC.createGain();
      s.buffer = buf[stems[key]]; s.loop = true; g.gain.value = 0;
      s.connect(g); g.connect(bgmGain);
      s.start(t0);
      mixSrcs.push(s); mixGains[key] = g;
    }
    mixActive = true; singleFile = 'bgm_flow';
    applyMix(mixPreset, true);
    return true;
  }

  function bgmPlay(key) {
    var A = C.AUDIO;
    homeStop(true);
    /* 新链路：WebAudio 已解码完成 → 单曲 / 动态混音，不再依赖 <audio> 元素。 */
    if (!elementMode && AC && buffersReady) {
      pauseAll(null); curEl = null; bgmFileNow = '';   // 解码前的元素池兜底先停掉
      if (pageKey === 'play') {
        if (!startMix()) playSingleFile(A.bgm.play);
      } else {
        playSingleFile(pageKey === 'levels' ? A.bgm.levels : A.bgm.home);
      }
      applyBgmGain();
      return;
    }
    /* file:// 预览等场景的兜底：元素池按页面选一首全混曲。 */
    var file = pageKey === 'levels' ? A.bgm.levels : (pageKey === 'play' ? A.bgm.play : bgmFile(key));
    if (!file) { homeStart(); return; }
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
    /* v0.29.2：新版胜利音走试听通过的文件；木质风格才有对应采样，其它风格沿用合成。
     * 失败音同理：木质用 sfx_fail.wav，其它风格用 buildSfxSynth 的同款低沉音。 */
    if (name === 'sfx_win' && sfxStyleKey !== 'wood') {
      if (synth.sfx_win) synth.sfx_win();
      return;
    }
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
     * wood 保持原优先级（buffer → element → synth），零回归。 */
    if (sfxStyleKey === 'wood') {
      var fkey = name === 'sfx_win' ? 'sfx_win_fanfare' : name;
      if (buf[fkey] && AC) {
        try {
          var s = AC.createBufferSource();
          s.buffer = buf[fkey];
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
        pauseAll(null); curEl = null; bgmFileNow = '';   // 关卡 mp3（元素池兜底）
        homeStop();                               // 主页轻音乐（同时清掉已排程的音）
        stopBgmSources(0);                        // v0.29.2：单曲 / stem 混音
      } else if (unlocked) bgmPlay(bgmScene);
      applyBgmGain();
    },
    duck: function (on) { ducked = !!on; applyBgmGain(); },
    setScene: function (k) { bgmSetScene(k); },   // v0.5：主页 / 关卡多场景 BGM
    /* v0.29.2：页面决定曲目，设定决定混音预设；老版本音频层没有这两个方法。 */
    setPage: function (p) {
      if (!p || pageKey === p) return;
      pageKey = p;
      mixPreset = p === 'play' ? 'play' : 'calm';   // 进对局先用专注预设，倒计时再由 setMix 接管
      if (unlocked && enabled.bgm) bgmPlay(bgmScene);
    },
    setMix: function (preset) {
      if (!preset || mixPreset === preset) return;
      mixPreset = preset;
      if (mixActive) applyMix(preset);
    },
    setSfxStyle: function (key) {                  // v0.27：切换交互音效风格
      if (!C.SFX_STYLES || !C.SFX_STYLES[key]) key = 'wood';
      sfxStyleKey = key;
      synth = buildSfxSynth(key);
    },
    setVisible: function (v) {                    // 切后台：停调度并静音；回前台恢复
      if (!v) {
        if (curEl && curEl._watch) { clearTimeout(curEl._watch); curEl._watch = null; }
        pauseAll(null); homeStop();               // 切后台：两边都停，别继续排程
        stopBgmSources(0);
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
      playing: (function () { var n = 0; for (var k in EL) if (EL[k] && !EL[k].paused) n++; return n; })() +
        (singleSrc || mixActive ? 1 : 0),
      /* v0.29.2：新链路状态，供 verify_audio / audio_probe 读取 */
      page: pageKey, mix: mixPreset, mode: mixActive ? 'mix' : (singleSrc ? 'single' : (homeSeq ? 'home' : 'none')),
      file: singleFile || bgmFileNow, sources: mixSrcs.length,
      gains: (function () { var o = {}; for (var k in mixGains) o[k] = mixGains[k].gain.value; return o; })()
    };
    if (curEl && !singleSrc && !mixActive) {
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
