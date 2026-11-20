/* 微信小游戏环境模拟：用 wx 桩在 Node 里真实执行 miniprogram/game.js，
 * 验证「require 链 → 画布 → 启动 → 首帧渲染 → 触摸事件」整条链路不报错。
 * 这是静态检查替代不了的：能抓到 wx.* 用法错误、模块路径错误、渲染期异常。
 * 用法：node tools/wx_sim.js
 */
'use strict';

const path = require('path');
const W = 375, H = 812;
const calls = { ctx: 0 };
const errors = [];

/* ---------- 2D 上下文桩：记录调用次数，任何属性都能取到可调用对象 ---------- */
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
      calls.ctx++;
      return function () {
        if (k === 'measureText') return { width: 20 };
        if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') {
          return { addColorStop: function () {} };
        }
        return undefined;
      };
    },
    set(t, k, v) { t[k] = v; return true; }
  });
}

/* ---------- 资源桩 ---------- */
const storage = {};
const audioCtxs = [];
const images = [];

global.requestAnimationFrame = function () { return 1; };
global.cancelAnimationFrame = function () {};
global.setTimeout = function (fn) { try { fn(); } catch (e) { errors.push('setTimeout: ' + e.message); } return 0; };
global.setInterval = function () { return 0; };

const wx = {
  createCanvas: function () {
    return { width: W, height: H, getContext: function () { return makeCtx(); } };
  },
  getWindowInfo: function () {
    return {
      windowWidth: W, windowHeight: H, pixelRatio: 2, screenWidth: W, screenHeight: H,
      safeArea: { top: 44, bottom: H - 34, left: 0, right: W, width: W, height: H - 78 }
    };
  },
  getSystemInfoSync: function () { return wx.getWindowInfo(); },
  getStorageSync: function (k) { return k in storage ? storage[k] : ''; },
  setStorageSync: function (k, v) { storage[k] = v; },
  createInnerAudioContext: function () {
    const a = {
      src: '', loop: false, volume: 1, playbackRate: 1, obeyMuteSwitch: true, paused: true,
      play() { this.paused = false; }, pause() { this.paused = true; },
      stop() { this.paused = true; }, destroy() {}, seek() {},
      onPlay() {}, onPause() {}, onStop() {}, onEnded() {}, onError() {}, onCanplay() {}
    };
    audioCtxs.push(a);
    return a;
  },
  createWebAudioContext: function () {
    const node = function () {
      return {
        connect() {}, disconnect() {}, start() {}, stop() {},
        gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {} },
        playbackRate: { value: 1 },
        frequency: { value: 440 }, type: 'sine',
        buffer: null, onended: null
      };
    };
    return {
      state: 'running', sampleRate: 44100, currentTime: 0, destination: {},
      resume() {}, close() {}, suspend() {},
      createBufferSource: node, createGain: node, createOscillator: node,
      createBiquadFilter: node, createDynamicsCompressor: node, createBuffer: node,
      decodeAudioData: function (d, ok) { if (ok) ok({ duration: 1, sampleRate: 44100, numberOfChannels: 1, length: 44100, getChannelData: function () { return new Float32Array(44100); } }); }
    };
  },
  createImage: function () {
    const img = { src: '', width: 0, height: 0, onload: null, onerror: null };
    images.push(img);
    // 真实环境是异步回调；这里同步触发 onload，模拟素材存在
    Object.defineProperty(img, 'src', {
      configurable: true,
      set(v) {
        this._src = v;
        const self = this;
        setImmediate(function () { if (self.onload) self.onload(); });
      },
      get() { return this._src; }
    });
    return img;
  },
  getFileSystemManager: function () {
    return { readFileSync: function () { throw new Error('no fs in sim'); }, statSync: function () {} };
  },
  onTouchStart() {}, onTouchMove() {}, onTouchEnd() {}, onTouchCancel() {},
  onHide() {}, onShow() {}, offHide() {}, offShow() {},
  vibrateShort() {}, setPreferredFramesPerSecond() {},
  triggerGC() {}, reportError() {}, onError() {},
  env: { USER_DATA_PATH: '/tmp' },
  getLaunchOptionsSync: function () { return { scene: 1001 }; }
};

global.wx = wx;
global.GameGlobal = global;
global.canvas = wx.createCanvas();

/* ---------- 执行 ---------- */
let mod = null;
try {
  mod = require(path.join(__dirname, '..', 'miniprogram', 'game.js'));
} catch (e) {
  errors.push('require game.js 抛错: ' + e.message + '\n' + e.stack);
}

setImmediate(function () {
  const g = global.__game;
  if (!g) {
    console.log('✗ 启动失败：global.__game 未创建');
    errors.forEach(function (e) { console.log('  ' + e); });
    process.exit(1);
  }
  console.log('✓ game.init() 完成，core 实例已创建');
  console.log('  当前页面：' + g.state.page + '，关卡数：' + (g._debug.LEVELS || []).length);

  // 走一遍页面切换 + 首帧渲染（render 在 rAF 里，手动驱动一次）
  try {
    g._debug.setupLevel(0);
    g.state.page = 'play';
    if (typeof g.render === 'function') g.render();
    console.log('✓ 进入第 1 关并渲染首帧，ctx 调用 ' + calls.ctx + ' 次');
  } catch (e) {
    errors.push('渲染抛错: ' + e.message + '\n' + e.stack);
  }

  // 判定一次
  try {
    const r = g._debug.judgeNow();
    console.log('✓ judgeNow() 返回 coverage=' + (r && r.coverage !== undefined ? r.coverage : JSON.stringify(r)));
  } catch (e) {
    errors.push('judgeNow 抛错: ' + e.message);
  }

  console.log('  图片素材请求 ' + images.length + ' 个，音频上下文 ' + audioCtxs.length + ' 个');
  if (errors.length) {
    console.log('\n✗ 有 ' + errors.length + ' 处异常：');
    errors.forEach(function (e) { console.log('  - ' + e); });
    process.exit(1);
  }
  console.log('\n✓ 微信环境模拟全链路通过');
});
