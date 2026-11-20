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
  var bgmScene = 'home', bgmFade = 0;

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

  /* ---- v0.11 真人 BGM（mp3，90s 循环） ----
   * 用 <audio> 元素而不是 WebAudio buffer：长音频 decodeAudioData 在低端机上
   * 要几十 MB 内存，元素播放省内存、file:// 双击也能用。
   * 换曲：6 步音量淡出 → 换 src → 淡入，听不到"咔"的断点。
   * 选哪首由 core.js 决定（bgmSceneKey），这里只负责按键取文件。 */
  function bgmFile(key) {
    var A = C.AUDIO, m = A.bgm || {};
    if (key === 'home') return m.home || '';
    var arr = m.lv || [];
    if (!arr.length) return m.home || '';
    var i = parseInt(String(key).replace(/^lv/, ''), 10);
    return arr[((isFinite(i) && i > 0 ? i - 1 : 0) % arr.length)];
  }
  function bgmTarget() {
    if (!enabled.bgm) return 0;
    return ducked ? C.AUDIO.bgmDuckVolume : C.AUDIO.bgmVolume;
  }
  function applyBgmGain() {
    if (!bgmEl) return;
    try { bgmEl.volume = Math.max(0, Math.min(1, bgmTarget())); } catch (e) {}
  }
  function bgmFadeTo(to, cb) {
    if (bgmFade) { clearInterval(bgmFade); bgmFade = 0; }
    if (!bgmEl) { if (cb) cb(); return; }
    var from = bgmEl.volume || 0, steps = 6, i = 0;
    var gap = Math.max(24, Math.round((C.BGM.fadeMs || 320) / steps));
    bgmFade = setInterval(function () {
      i++;
      try { bgmEl.volume = Math.max(0, Math.min(1, from + (to - from) * i / steps)); } catch (e) {}
      if (i >= steps) { clearInterval(bgmFade); bgmFade = 0; if (cb) cb(); }
    }, gap);
  }
  var bgmFileNow = '';
  function bgmPlay(key) {
    var file = bgmFile(key);
    if (!file) return;
    if (!bgmEl) {
      bgmEl = new Audio();
      bgmEl.loop = true;               // 一首播完直接回到开头，一关之内不断
      bgmEl.preload = 'auto';
      bgmEl.volume = 0;
    }
    if (file === bgmFileNow && !bgmEl.paused) { applyBgmGain(); return; }
    /* 立刻换 src——不先等淡出。单元素做不了交叉淡变，等 300ms 再换只多一段静音，
     * 还会被后台节流/定时器暂停卡住；直接换 + 淡入更稳。 */
    try { bgmEl.src = C.AUDIO.base + file; bgmEl.currentTime = 0; } catch (e) {}
    bgmFileNow = file;
    var p = bgmEl.play();
    if (p && p.catch) p.catch(function () {});
    bgmEl.volume = 0;
    bgmFadeTo(bgmTarget());
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
      if (!bgm) { if (bgmEl) { try { bgmEl.pause(); } catch (e) {} } }
      else if (unlocked) bgmPlay(bgmScene);
      applyBgmGain();
    },
    duck: function (on) { ducked = !!on; applyBgmGain(); },
    setScene: function (k) { bgmSetScene(k); },   // v0.5：主页 / 关卡多场景 BGM
    setVisible: function (v) {                    // 切后台：停调度并静音；回前台恢复
      if (!v) {
        if (bgmEl) { try { bgmEl.pause(); } catch (e) {} }
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
    return bgmEl ? {
      src: bgmEl.src, file: bgmFileNow, volume: bgmEl.volume,
      paused: bgmEl.paused, loop: bgmEl.loop
    } : null;
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
