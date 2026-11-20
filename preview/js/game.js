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
  var AC = null, masterGain = null, bgmGain = null, bgmSrc = null, bgmEl = null;
  var buf = {}, pool = {}, poolIdx = {};
  var enabled = { sfx: true, bgm: true };
  var ducked = false, snapVoices = 0, lastTapAt = 0;
  var unlocked = false, buffersReady = false, loadedOk = 0, elementMode = false;
  var bgmStarted = false;

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
      bgmGain.connect(masterGain);
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

  var synth = {
    sfx_tap: function () { tone(1500, 0.045, 'triangle', 0.1); noise(0.03, 0.05, 2600); },
    sfx_pick: function () { tone(620, 0.07, 'sine', 0.16); noise(0.05, 0.10, 1200); },
    sfx_snap: function () { noise(0.05, 0.24, 1500); tone(880, 0.06, 'square', 0.09, 0, 420); },
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

  /* ---- BGM：buffer 走精确循环，元素走 loop ---- */
  function bgmTarget() {
    if (!enabled.bgm) return 0;
    return ducked ? C.AUDIO.bgmDuckVolume : C.AUDIO.bgmVolume;
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
  var BGM_NOTE = C.AUDIO.bgmNote || { root: 0.05, lead: 0.075, other: 0.055 };

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

  function applyBgmGain() {
    var v = bgmTarget();
    /* v0.6：mp3 / 元素回退是满刻度素材，仍按旧上限，不跟着合成总线放大 */
    if ((bgmSrc || bgmEl) && v > C.AUDIO.bgmLegacyVolume) v = C.AUDIO.bgmLegacyVolume;
    if (bgmGain && AC) {
      try {
        if (bgmGain.gain.setTargetAtTime) bgmGain.gain.setTargetAtTime(v, AC.currentTime, 0.06);
        else bgmGain.gain.value = v;
      } catch (e) { try { bgmGain.gain.value = v; } catch (e2) {} }
    }
    if (bgmEl) { try { bgmEl.volume = Math.max(0, Math.min(1, v)); } catch (e) {} }
  }
  function startBgm() {
    if (!unlocked) return;
    /* v0.5：优先合成多场景 BGM（零文件）；AC 完全不可用时才回退 mp3 */
    if (C.AUDIO.useSynthBgm !== false && AC) { bgmStartSeq(bgmScene); bgmStarted = true; applyBgmGain(); return; }
    if (bgmStarted) { applyBgmGain(); return; }
    if (buffersReady && buf.bgm_main && AC) {
      try {
        bgmSrc = AC.createBufferSource();
        bgmSrc.buffer = buf.bgm_main;
        bgmSrc.loop = true;
        bgmSrc.loopStart = C.AUDIO.loopStart;
        bgmSrc.loopEnd = C.AUDIO.loopEnd;
        bgmSrc.connect(bgmGain);
        bgmSrc.start(0, C.AUDIO.loopStart);   // 跳过 MP3 前置填充 1105 采样
        bgmStarted = true;
        applyBgmGain();
        return;
      } catch (e) { bgmSrc = null; }
    }
    if (elementMode && C.AUDIO.files.bgm_main) {
      bgmEl = new Audio();
      bgmEl.src = C.AUDIO.base + C.AUDIO.files.bgm_main;
      bgmEl.loop = true;
      bgmEl.preload = 'auto';
      bgmEl.volume = 0;
      var p = bgmEl.play();
      if (p && p.catch) p.catch(function () {});
      bgmStarted = true;
      applyBgmGain();
    }
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
    // v0.3.4 A4b：通关 sting 强制走合成，避免既有 sfx_win.mp3 抢先播旧三音
    if (name === 'sfx_win') { if (synth.sfx_win) synth.sfx_win(); return; }
    if (name === 'sfx_snap' && snapVoices >= C.AUDIO.snapVoices) return;
    if (name === 'sfx_tap') {                 // 连点丢帧，避免机关枪
      var t = Date.now();
      if (t - lastTapAt < C.AUDIO.tapGuardMs) return;
      lastTapAt = t;
    }
    // 每次 ±5% 变调 + ±5% 音量：90ms 的木头声听不出音高差，但能打散复读机感
    var rate = 1 + (Math.random() * 0.10 - 0.05);
    var gain = (C.AUDIO.sfxGain[name] || 0.9) * (0.95 + Math.random() * 0.10);
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
      resumeAudio();
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
    setVisible: function (v) {                    // 切后台：停调度并静音；回前台恢复
      if (!v) {
        if (bgmGain && AC) { try { bgmGain.gain.value = 0; } catch (e) {} }
        if (bgmEl) { try { bgmEl.volume = 0; } catch (e) {} }
        bgmStopSeq();
      } else {
        if (unlocked && enabled.bgm) bgmStartSeq(bgmScene);
        applyBgmGain();
      }
    },
    play: function (name) {
      if (!enabled.sfx) return;
      resumeAudio();
      playSfx(name);
    }
  };

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
      share: function () {                       // v0.5 邀请有礼：系统分享 / 复制链接
        try {
          if (navigator.share) navigator.share({ title: '方寸巧拼', text: '一起来拼图！', url: location.href });
          else if (navigator.clipboard) navigator.clipboard.writeText(location.href);
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
