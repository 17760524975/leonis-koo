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
    play() { this.paused = false; }, pause() { this.paused = true; },
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
function mkAC() {
  return {
    currentTime: 0, sampleRate: 44100, state: 'running', destination: {},
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
    resume() {}, suspend() {}
  };
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
  createWebAudioContext: mkAC,
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

setImmediate(async function () {
  console.log('v0.12 音频验收：主页合成和弦 + 关卡 mp3');
  const audio = global.__audio;
  const game = global.__game;
  if (!audio || !game) { console.log('  [XX] 启动失败：__audio/__game 未创建'); process.exit(1); }

  console.log('\n== 1. 主页 = 合成和弦（无 mp3） ==');
  audio.unlock();
  await sleep(60);
  const padN = oscillators.length;
  check('解锁后主页起了振荡器（和弦）', padN > 0, 'osc=' + padN);
  check('主页不创建 InnerAudioContext（不走 mp3）', players.length === 0, 'players=' + players.length);
  check('和弦音全部是正弦（柔和、无敲击感）', oscillators.every(o => o.type === 'sine'),
    [...new Set(oscillators.map(o => o.type))].join(','));
  /* 一小节 = 1 个和弦 = (1 根音 + 3 和弦音) × 2 路失谐 = 8 个振荡器；
   * 首次 tick 会预排 2 小节（lookahead），所以是 16 个。 */
  check('每小节 8 个振荡器、首排 2 小节共 16 个', padN === 16, 'osc=' + padN);
  const durs = oscillators.map(o => +(o.stoppedAt - o.startedAt).toFixed(2));
  check('每个音都撑满约一小节（4.3~4.5s）', durs.every(d => d > 4.3 && d < 4.6),
    'min=' + Math.min(...durs) + ' max=' + Math.max(...durs));
  check('和弦文件不从 assets 读（配置里 home 为空）', CFG.AUDIO.bgm.home === '', "'" + CFG.AUDIO.bgm.home + "'");

  console.log('\n== 2. 进关卡 → 换成真人 mp3 ==');
  audio.setScene('lv1');
  await sleep(120);
  const padAfterLv = oscillators.length;
  check('第 1 关 → bgm_lv1', players.length > 0 && players[players.length - 1].src === 'assets/audio/bgm_lv1.mp3',
    players.length ? players[players.length - 1].src : 'no player');
  check('进关卡后和弦停止排程（不再新增振荡器）', padAfterLv === padN, padN + '→' + padAfterLv);
  check('关卡 mp3 循环播放', players[players.length - 1].loop === true);
  const before = players.length;
  audio.setScene('lv3');
  await sleep(200);
  check('切到第 3 首', players[players.length - 1].src === 'assets/audio/bgm_lv3.mp3', players[players.length - 1].src);
  check('复用同一个播放器（不新建实例）', players.length === before, 'players=' + players.length);
  audio.setScene('lv3');
  await sleep(60);
  check('重复设同一场景不重播', players[players.length - 1].src === 'assets/audio/bgm_lv3.mp3');
  audio.setScene('home');
  await sleep(80);
  const padBack = oscillators.length;
  check('回主页重新起和弦', padBack > padAfterLv, padAfterLv + '→' + padBack);
  check('回主页暂停了 mp3（不会两首同时响）', players[players.length - 1].paused === true);

  console.log('\n== 3. 压低 / 开关（在关卡 mp3 上验） ==');
  audio.setScene('lv3');
  await sleep(400);
  audio.duck(true);
  await sleep(400);
  check('弹窗时压低到 duck 音量', Math.abs(players[players.length - 1].volume - CFG.AUDIO.bgmDuckVolume) < 0.02,
    'volume=' + players[players.length - 1].volume.toFixed(2));
  audio.duck(false);
  await sleep(400);
  check('关掉弹窗回到正常音量', Math.abs(players[players.length - 1].volume - CFG.AUDIO.bgmVolume) < 0.02,
    'volume=' + players[players.length - 1].volume.toFixed(2));

  audio.setEnabled(true, false);
  check('关闭 BGM 会暂停', players[players.length - 1].paused === true);
  audio.setEnabled(true, true);
  await sleep(60);
  check('重新开启会继续播（同一首）', players[players.length - 1].paused === false &&
    players[players.length - 1].src.indexOf('bgm_lv3') >= 0, players[players.length - 1].src);

  console.log('\n== 4. 切后台 / 回前台 ==');
  audio.setVisible(false);
  check('切后台暂停', players[players.length - 1].paused === true);
  audio.setVisible(true);
  await sleep(60);
  check('回前台恢复', players[players.length - 1].paused === false);

  console.log('\n== 5. 四首关卡曲资源齐（主页已不用文件） ==');
  for (const f of CFG.AUDIO.bgm.lv) {
    const fp = path.join(ROOT, 'miniprogram', 'assets/audio', f);
    check(f, fs.existsSync(fp) && fs.statSync(fp).size > 100 * 1024,
      fs.existsSync(fp) ? Math.round(fs.statSync(fp).size / 1024) + 'KB' : '缺失');
  }

  console.log('\n' + (fail === 0 ? '音频验收全部通过' : `!! ${fail} 项未通过`));
  process.exit(fail === 0 ? 0 : 1);
});
