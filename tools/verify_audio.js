/* v0.29.2 音频端到端验收：用 wx 桩真实执行 miniprogram/game.js，
 * 覆盖新三首 BGM、5 条 stem 动态混音、紧张层、胜利音与拼接失败音。
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
    plays: 0,
    play() { this.paused = false; this.plays++; }, pause() { this.paused = true; },
    stop() { this.paused = true; }, destroy() {}, seek() {},
    onPlay() {}, onPause() {}, onStop() {}, onEnded() {},
    onError() {}, onCanplay() {}
  };
  players.push(a);
  return a;
}

global.requestAnimationFrame = () => 1;
global.cancelAnimationFrame = () => {};

const oscillators = [];
const bufSources = [];
function mkParam(v) {
  return {
    value: v,
    setValueAtTime(x) { this.value = x; return this; },
    linearRampToValueAtTime(x) { this.value = x; return this; },
    exponentialRampToValueAtTime(x) { this.value = x; return this; },
    setTargetAtTime(x) { this.value = x; return this; },
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
        type: 'sine', frequency: mkParam(440),
        connect() {}, disconnect() {}, start() {}, stop() {}
      };
      oscillators.push(o);
      return o;
    },
    createBiquadFilter: () => ({ type: 'lowpass', frequency: mkParam(1000), Q: mkParam(1), connect() {}, disconnect() {} }),
    createDelay: () => ({ delayTime: mkParam(0), connect() {}, disconnect() {} }),
    createBuffer: (ch, len) => ({ getChannelData: () => new Float32Array(len) }),
    createBufferSource: () => {
      const s = {
        buffer: null, loop: false, playbackRate: mkParam(1), started: false,
        connect() {}, disconnect() {}, start() { s.started = true; }, stop() {}, onended: null
      };
      bufSources.push(s);
      return s;
    },
    createDynamicsCompressor: () => ({
      threshold: mkParam(-24), knee: mkParam(30), ratio: mkParam(12),
      attack: mkParam(0.003), release: mkParam(0.25), connect() {}, disconnect() {}
    }),
    /* 桩：立即回调成功，让 loadBuffers 走完新链路；真实解码由浏览器/真机负责。 */
    decodeAudioData: (ab, ok) => { setImmediate(() => ok({ byteLength: ab.byteLength })); },
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
  /* 直接从磁盘读包内音频，路径与 game.js 的 pkgPath() 对齐。 */
  getFileSystemManager: () => ({
    readFileSync(p) {
      const b = fs.readFileSync(path.join(ROOT, 'miniprogram', p));
      return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
    },
    statSync() {}
  }),
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
  console.log('v0.29.2 音频验收：新 BGM + 动态混音 + 拼接失败音');
  const audio = global.__audio;
  if (!audio) { console.log('  [XX] 启动失败：__audio 未创建'); process.exit(1); }

  console.log('\n== 1. 资源与配置 ==');
  const want = ['bgm_dawn.mp3', 'bgm_starlit.mp3', 'bgm_flow.mp3',
    'stem_flow_pad.mp3', 'stem_flow_arp.mp3', 'stem_flow_bass.mp3',
    'stem_flow_perc.mp3', 'stem_flow_lead.mp3', 'layer_tension.mp3',
    'sfx_win_fanfare.mp3', 'sfx_fail.wav'];
  for (const dir of ['miniprogram', 'preview']) {
    const missing = want.filter(f => !fs.existsSync(path.join(ROOT, dir, 'assets/audio', f)));
    check(`${dir} 新音频资源齐（${want.length} 个）`, missing.length === 0, missing.join(','));
  }
  check('三首新曲已配置到三个场景',
    CFG.AUDIO.bgm.home === 'bgm_dawn.mp3' && CFG.AUDIO.bgm.levels === 'bgm_starlit.mp3'
      && CFG.AUDIO.bgm.play === 'bgm_flow.mp3');
  check('6 路 stem / 4 个预设已配置',
    Object.keys(CFG.AUDIO.mix.stems).length === 6 && Object.keys(CFG.AUDIO.mix.presets).length === 4);
  check('失败音与新版胜利音已进文件表',
    CFG.AUDIO.files.sfx_fail === 'sfx_fail.wav'
      && CFG.AUDIO.files.sfx_win_fanfare === 'sfx_win_fanfare.mp3');
  check('失败音有独立增益', CFG.AUDIO.sfxGain.sfx_fail > 0 && CFG.AUDIO.sfxGain.sfx_fail <= 1,
    'gain=' + CFG.AUDIO.sfxGain.sfx_fail);

  console.log('\n== 2. 解锁 → 主页曲（WebAudio 单曲） ==');
  audio.unlock();
  await sleep(240);                              // 等 warmUp 解码完成并切到 WebAudio 链路
  let i = audio.bgmInfo();
  check('音频上下文在跑', i.ac === 'running', 'ac=' + i.ac);
  check('解码预载完成', i.preloaded === true);
  check('主页 = 单曲链路', i.mode === 'single', 'mode=' + i.mode);
  check('主页曲 = bgm_dawn.mp3', i.file === 'bgm_dawn.mp3', i.file);
  check('主页只有 1 路在播', i.playing === 1, 'playing=' + i.playing);
  check('总线音量 = bgmVolume × trim.home',
    Math.abs(i.gain - CFG.AUDIO.bgmVolume * CFG.AUDIO.trim.home) < 0.01,
    'gain=' + i.gain.toFixed(2));

  console.log('\n== 3. 关卡列表 → 星海漫游 ==');
  audio.setPage('levels');
  i = audio.bgmInfo();
  check('关卡列表曲 = bgm_starlit.mp3', i.file === 'bgm_starlit.mp3', i.file);
  check('仍是单曲链路且只有 1 路', i.mode === 'single' && i.playing === 1,
    `mode=${i.mode} playing=${i.playing}`);

  console.log('\n== 4. 对局 → 5+1 路动态混音 ==');
  audio.setPage('play');
  i = audio.bgmInfo();
  check('对局 = 混音链路', i.mode === 'mix', 'mode=' + i.mode);
  check('6 条 stem 同时排程', i.sources === 6, 'sources=' + i.sources);
  check('混音只有 1 条总线在播', i.playing === 1, 'playing=' + i.playing);
  const trim = CFG.AUDIO.mix.trim, playP = CFG.AUDIO.mix.presets.play;
  let gainOk = true;
  for (const k of Object.keys(playP)) {
    const got = i.gains[k] || 0, wantV = playP[k] * trim;
    if (Math.abs(got - wantV) > 0.02) gainOk = false;
  }
  check('初始增益 = play 预设 × trim', gainOk, JSON.stringify(i.gains));

  console.log('\n== 5. 倒计时紧张层 / 通关混音 ==');
  audio.setMix('tense');
  let t = audio.bgmInfo().gains;
  const pp = CFG.AUDIO.mix.presets.play, tp = CFG.AUDIO.mix.presets.tense;
  check('紧张层淡入', t.tension > 0.1, 'tension=' + t.tension.toFixed(2));
  check('鼓点 / 低音抬上来', t.perc > pp.perc * trim && t.bass > pp.bass * trim,
    `perc ${t.perc.toFixed(2)} bass ${t.bass.toFixed(2)}`);
  check('主旋 / 琶音退下去', t.lead < pp.lead * trim && t.arp < pp.arp * trim,
    `lead ${t.lead.toFixed(2)} arp ${t.arp.toFixed(2)}`);
  audio.setMix('win');
  const w = audio.bgmInfo().gains;
  check('通关全声部齐鸣、紧张层退出', w.lead > t.lead && w.tension < 0.01,
    `lead=${w.lead.toFixed(2)} tension=${w.tension.toFixed(2)}`);

  console.log('\n== 6. 压低 / 开关 / 前后台 ==');
  audio.duck(true);
  check('弹窗压低到 duck 音量',
    Math.abs(audio.bgmInfo().gain - CFG.AUDIO.bgmDuckVolume * CFG.AUDIO.trim.home) < 0.01,
    'gain=' + audio.bgmInfo().gain.toFixed(2));
  audio.duck(false);
  audio.setEnabled(true, false);
  check('关 BGM：总线归零且无在播音源',
    Math.abs(audio.bgmInfo().gain) < 0.01 && audio.bgmInfo().playing === 0,
    'gain=' + audio.bgmInfo().gain + ' playing=' + audio.bgmInfo().playing);
  audio.setEnabled(true, true);
  await sleep(60);
  check('重开 BGM 恢复播放', audio.bgmInfo().playing === 1, 'playing=' + audio.bgmInfo().playing);
  audio.setVisible(false);
  check('切后台全部停止', audio.bgmInfo().playing === 0);
  audio.setVisible(true);
  await sleep(60);
  check('回前台恢复播放', audio.bgmInfo().playing === 1);

  console.log('\n== 7. 音效：失败音 + 新版胜利音 ==');
  const beforeSfx = bufSources.length;
  audio.play('sfx_fail');
  check('拼接失败音真的起播了', bufSources.length > beforeSfx,
    `bufferSource ${beforeSfx}→${bufSources.length}`);
  const beforeWin = bufSources.length;
  audio.play('sfx_win');
  check('新版胜利音用采样而非旧三音合成', bufSources.length > beforeWin,
    `bufferSource ${beforeWin}→${bufSources.length}`);

  console.log('\n== 8. 源码约束（两端一致） ==');
  for (const f of ['miniprogram/game.js', 'preview/js/game.js']) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    check(`${f} 有 setPage / setMix`, /setPage:\s*function/.test(src) && /setMix:\s*function/.test(src));
    check(`${f} 有 WebAudio 混音排程`, /function startMix\(\)/.test(src) && /function applyMix\(/.test(src));
    check(`${f} 有 sfx_fail 合成兜底`, /sfx_fail:\s*function/.test(src));
    check(`${f} 不再播放旧 4 首 BGM 文件`, !/bgm_lv[1-4]\.mp3['"]/.test(src.replace(/lv:\s*\[[^\]]*\]/, '')));
  }
  const coreSrc = fs.readFileSync(path.join(ROOT, 'js/core.js'), 'utf8');
  check('重叠判定会播失败音', /flashMsg\('有两块压在一起了'\)[\s\S]{0,180}sfx_fail/.test(coreSrc));
  check('倒计时 20% 驱动紧张层', /tenseAt/.test(coreSrc) && /setMix\(/.test(coreSrc));
  check('通关驱动 win 混音', /setMix\('win'\)/.test(coreSrc));

  console.log('\n' + (fail === 0 ? '音频验收全部通过' : `!! ${fail} 项未通过`));
  process.exit(fail === 0 ? 0 : 1);
});
