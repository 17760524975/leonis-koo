/* v0.12 音频端到端验收：用 wx 桩真实执行 miniprogram/game.js，
 * 直接驱动 audio.unlock / setScene，断言两套链路都对：
 *   · 主页/关卡列表 = 合成和弦（WebAudio 振荡器），
 *   · 关卡 = 真人 mp3（InnerAudioContext），
 * 以及循环、压低、开关、前后台。这是静态检查替代不了的：能抓到路径拼错、
 * src 没设、切场景没生效、和弦没让位给 mp3（两首同时在响）。
 * 用法：node tools/verify_audio.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const W = 375, H = 812;

let fail = 0;
function check(label, ok, detail) {
  if (!ok) fail++;
  console.log(`  [${ok ? 'OK' : 'XX'}] ${label}${detail ? '  ' + detail : ''}`);
}

function makeCtx() {
  const store = {
    fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, globalAlpha: 1,
    font: '', textAlign: 'left', textBaseline: 'alphabetic',
    lineCap: 'butt', lineJoin: 'miter', shadowBlur: 0, shadowColor: 'transparent',
    shadowOffsetX: 0, shadowOffsetY: 0, globalCompositeOperation: 'source-over',
    canvas: { width: W, height: H }
  };
  return new Proxy(store, {
    get(t, k) {
      if (k in t) return t[k];
      return function () {
        if (k === 'measureText') return { width: 20 };
        if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') {
          return { addColorStop() {} };
        }
        return undefined;
      };
    },
    set(t, k, v) { t[k] = v; return true; }
  });
}

const storage = {};
const players = [];
function mkPlayer() {
  const a = {
    src: '', loop: false, volume: 1, playbackRate: 1, obeyMuteSwitch: true, paused: true,
    _onErr: null,
    plays: 0,
    play() { this.paused = false; this.plays++; }, pause() { this.paused = true; },
    stop() { this.paused = true; }, destroy() {}, seek() {},
    onPlay() {}, onPause() {}, onStop() {}, onEnded() {},
    onError(cb) { this._onErr = cb; }, onCanplay() {}
  };
  players.push(a);
  return a;
}

global.requestAnimationFrame = () => 1;
global.cancelAnimationFrame = () => {};
/* WebAudio 桩：只实现 game.js 用到的部分，并把振荡器记下来，
 * 这样能断言"主页到底有没有真的在发声"（旧版合成 BGM 就是这么验的）。 */
const oscillators = [];
function mkParam(v) {
  return {
    value: v, events: [],
    setValueAtTime(x, t) { this.events.push(['set', x, t]); this.value = x; return this; },
    linearRampToValueAtTime(x, t) { this.events.push(['lin', x, t]); this.value = x; return this; },
    exponentialRampToValueAtTime(x, t) { this.events.push(['exp', x, t]); this.value = x; return this; },
    setTargetAtTime(x, t, c) { this.events.push(['tgt', x, t]); this.value = x; return this; },
    cancelScheduledValues() { return this; }
  };
}
let AC_REF = null;
function mkAC() {
  const ac = {
    currentTime: 0, sampleRate: 44100, state: 'running', destination: {}, resumeCalls: 0,
    createGain: () => ({ gain: mkParam(1), connect() {}, disconnect() {} }),
    createOscillator: () => {
      const o = {
        type: 'sine', frequency: mkParam(440), startedAt: -1, stoppedAt: -1,
        connect() {}, disconnect() {},
        start(t) { o.startedAt = t; }, stop(t) { o.stoppedAt = t; }
      };
      oscillators.push(o);
      return o;
    },
    createBiquadFilter: () => ({ type: 'lowpass', frequency: mkParam(1000), Q: mkParam(1), connect() {}, disconnect() {} }),
    createDelay: () => ({ delayTime: mkParam(0), connect() {}, disconnect() {} }),
    createBuffer: (ch, len) => ({ getChannelData: () => new Float32Array(len) }),
    createBufferSource: () => ({
      buffer: null, loop: false, playbackRate: mkParam(1),
      connect() {}, disconnect() {}, start() {}, stop() {}, onended: null
    }),
    createDynamicsCompressor: () => ({
      threshold: mkParam(-24), knee: mkParam(30), ratio: mkParam(12),
      attack: mkParam(0.003), release: mkParam(0.25), connect() {}, disconnect() {}
    }),
    decodeAudioData: () => new Promise(() => {}),
    resume() { ac.state = 'running'; ac.resumeCalls++; },
    suspend() { ac.state = 'suspended'; }
  };
  AC_REF = ac;
  return ac;
}

const wx = {
  createCanvas: () => ({ width: W, height: H, getContext: () => makeCtx() }),
  getWindowInfo: () => ({
    windowWidth: W, windowHeight: H, pixelRatio: 2, screenWidth: W, screenHeight: H,
    safeArea: { top: 44, bottom: H - 34, left: 0, right: W, width: W, height: H - 78 }
  }),
  getSystemInfoSync: null,
  getStorageSync: k => (k in storage ? storage[k] : ''),
  setStorageSync: (k, v) => { storage[k] = v; },
  createInnerAudioContext: mkPlayer,
  createWebAudioContext: () => mkAC(),
  createImage: () => {
    const img = { src: '', width: 0, height: 0, onload: null, onerror: null };
    Object.defineProperty(img, 'src', {
      configurable: true,
      set(v) { this._src = v; setImmediate(() => { if (this.onload) this.onload(); }); },
      get() { return this._src; }
    });
    return img;
  },
  getFileSystemManager: () => ({ readFileSync() { throw new Error('no fs'); }, statSync() {} }),
  onTouchStart() {}, onTouchMove() {}, onTouchEnd() {}, onTouchCancel() {},
  onHide() {}, onShow() {}, offHide() {}, offShow() {},
  vibrateShort() {}, setPreferredFramesPerSecond() {}, setInnerAudioOption() {},
  triggerGC() {}, reportError() {}, onError() {},
  env: { USER_DATA_PATH: '/tmp' },
  getLaunchOptionsSync: () => ({ scene: 1001 })
};
wx.getSystemInfoSync = wx.getWindowInfo;
global.wx = wx;
global.GameGlobal = global;

require(path.join(ROOT, 'miniprogram/game.js'));
const CFG = require(path.join(ROOT, 'miniprogram/js/config.js'));

const sleep = ms => new Promise(r => setTimeout(r, ms));


/* v0.47 音频探针：快速进出主页 / 关卡，看主页曲会不会叠成两层
 *
 * 现象（用户反馈）：快速回主页几次，音乐像两首同时放，隔一会儿又自己好了。
 * 假设：homeStop() 只是「闸门 150ms 淡出 + 190ms 后硬停振荡器」，
 * 若在这 190ms 内又 homeStart()，闸门被拉回 1 → 上一代已经排进时间轴的音符
 * 重新出声，与新排的一整小节叠在一起。
 *
 * 度量：数「还在时间轴上、尚未到 stop 时刻」的振荡器 —— 它们此刻都会发声。
 */
function sounding() {
  const now = AC_REF ? AC_REF.currentTime : 0;
  return oscillators.filter(o => o.startedAt >= 0 && o.stoppedAt > now).length;
}
function past() {   // 已经被叫停的（stop 时刻已过）
  const now = AC_REF ? AC_REF.currentTime : 0;
  return oscillators.filter(o => o.startedAt >= 0 && o.stoppedAt <= now).length;
}

setImmediate(async function () {
  const audio = global.__audio;
  await sleep(30);

  console.log('\n== 基线：只进一次主页 ==');
  audio.unlock();
  const base = sounding();
  console.log('  主页起播后 在响/待响 osc =', base, ' 总创建 =', oscillators.length);

  console.log('\n== 快速进出 8 次（间隔 60ms，远小于 190ms 的硬停窗口）==');
  for (let i = 0; i < 8; i++) {
    AC_REF.currentTime += 0.06;
    audio.setScene('lv1');
    AC_REF.currentTime += 0.06;
    audio.setScene('home');
    console.log(`  第 ${i + 1} 次回主页：在响/待响 = ${sounding()}  (基线 ${base})`);
  }

  await sleep(320);
  AC_REF.currentTime += 0.4;
  console.log('\n  等 320ms 后 =', sounding(), '（应回落到 ≈', base, '）');

  console.log('\n== 慢速进出 3 次（间隔 400ms）==');
  for (let i = 0; i < 3; i++) {
    AC_REF.currentTime += 0.4;
    audio.setScene('lv1');
    AC_REF.currentTime += 0.4;
    audio.setScene('home');
    await sleep(400);
    console.log(`  第 ${i + 1} 次回主页：在响/待响 = ${sounding()}`);
  }
  await sleep(320);
  console.log('\n结论：快速组若明显高于基线，就是两代音符同时在响。');
  process.exit(0);
});
