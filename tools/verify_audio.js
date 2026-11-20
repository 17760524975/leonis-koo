/* v0.11 音频端到端验收：用 wx 桩真实执行 miniprogram/game.js，
 * 直接驱动 audio.unlock / setScene，断言「主页曲 → 关卡曲」换得对、循环、压低、开关都生效。
 * 这是静态检查替代不了的：能抓到路径拼错、src 没设、切场景没生效。
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
  console.log('v0.11 音频验收：mp3 BGM 端到端');
  const audio = global.__audio;
  const game = global.__game;
  if (!audio || !game) { console.log('  [XX] 启动失败：__audio/__game 未创建'); process.exit(1); }

  console.log('\n== 1. 主页曲 ==');
  audio.unlock();
  await sleep(30);
  let p = players[players.length - 1];
  check('解锁后创建了 InnerAudioContext', !!p, 'players=' + players.length);
  check('主页曲路径正确', !!p && p.src === 'assets/audio/' + CFG.AUDIO.bgm.home, p && p.src);
  check('循环播放', !!p && p.loop === true);
  check('开始播放', !!p && p.paused === false);
  check('主页曲文件存在', fs.existsSync(path.join(ROOT, 'miniprogram', 'assets/audio', CFG.AUDIO.bgm.home)));

  console.log('\n== 2. 按关卡换曲 ==');
  audio.setScene('lv1');
  await sleep(400);
  check('第 1 关 → bgm_lv1', players[players.length - 1].src === 'assets/audio/bgm_lv1.mp3', players[players.length - 1].src);
  const before = players.length;
  audio.setScene('lv3');
  await sleep(400);
  check('切到第 3 首', players[players.length - 1].src === 'assets/audio/bgm_lv3.mp3', players[players.length - 1].src);
  check('复用同一个播放器（不新建实例）', players.length === before, 'players=' + players.length);
  audio.setScene('lv3');
  await sleep(60);
  check('重复设同一场景不重播', players[players.length - 1].src === 'assets/audio/bgm_lv3.mp3');

  console.log('\n== 3. 压低 / 开关 ==');
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

  console.log('\n== 5. 五首资源齐 ==');
  for (const f of [CFG.AUDIO.bgm.home].concat(CFG.AUDIO.bgm.lv)) {
    const fp = path.join(ROOT, 'miniprogram', 'assets/audio', f);
    check(f, fs.existsSync(fp) && fs.statSync(fp).size > 100 * 1024,
      fs.existsSync(fp) ? Math.round(fs.statSync(fp).size / 1024) + 'KB' : '缺失');
  }

  console.log('\n' + (fail === 0 ? '音频验收全部通过' : `!! ${fail} 项未通过`));
  process.exit(fail === 0 ? 0 : 1);
});
