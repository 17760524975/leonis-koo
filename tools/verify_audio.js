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
const SUBPKG = [];          // v0.62：loadSubpackage 的调用记录
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
  /* v0.62：BGM 在 audio-pkg 分包里。这里给一个「成功」的桩：
   * 关键是要验证 loadSubpackage 之前**不建 InnerAudioContext**，
   * 成功之后才预载 4 首（src 必须带 audio-pkg/ 前缀）。 */
  loadSubpackage: opt => {
    SUBPKG.push(opt);
    setImmediate(() => { if (opt && opt.success) opt.success({ errMsg: 'loadSubpackage:ok' }); });
    return { onProgressUpdate() {} };
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
  console.log('v0.13 音频验收：主页轻音乐 + 关卡 mp3，切场景零延迟');
  const audio = global.__audio;
  const game = global.__game;
  if (!audio || !game) { console.log('  [XX] 启动失败：__audio/__game 未创建'); process.exit(1); }

  console.log('\n== 1. 主页 = 合成轻音乐（零文件） ==');
  audio.unlock();
  const i1 = audio.bgmInfo();
  check('解锁后主页曲在放', i1.home === true);
  check('闸门已打开（gate=1）', Math.abs(i1.gate - 1) < 0.01, 'gate=' + i1.gate);
  const trim = CFG.AUDIO.trim || {};
  check('总线音量 = bgmVolume × trim.home',
    Math.abs(i1.gain - CFG.AUDIO.bgmVolume * trim.home) < 0.01,
    'gain=' + i1.gain.toFixed(2) + ' 期望=' + (CFG.AUDIO.bgmVolume * trim.home).toFixed(2));
  check('响度对齐表覆盖主页 + 4 首关卡',
    typeof trim.home === 'number' && CFG.AUDIO.bgm.lv.every(f => typeof trim[f.replace(/\.mp3$/, '')] === 'number'),
    JSON.stringify(trim));
  /* v0.14.1：预载挪到解锁后 120ms（不再堵住点击那一拍），所以这里等一下 */
  await sleep(200);
  check('4 首关卡曲在解锁后预载完成', audio.bgmInfo().ctxs === 4, 'ctxs=' + audio.bgmInfo().ctxs);
  /* v0.62：分包闸门 —— 解锁时先拉 audio-pkg，成功后才建实例，路径必须指向分包 */
  check('解锁触发了音频分包加载（1 次）', SUBPKG.length === 1, 'calls=' + SUBPKG.length);
  check('分包名 / 路径正确', SUBPKG[0] && SUBPKG[0].name === 'audio', SUBPKG[0] && SUBPKG[0].name);
  check('4 首关卡曲的 src 都在 audio-pkg/assets/audio/ 下',
    players.length >= 4 && players.every(p => /^audio-pkg\/assets\/audio\/bgm_lv\d\.mp3$/.test(p.src)),
    players.slice(0, 4).map(p => p.src).join(' | '));
  check('预载不留声（没有 mp3 在播）', audio.bgmInfo().playing === 0, 'playing=' + audio.bgmInfo().playing);
  check('解锁当拍只做「出声」（不阻塞点击）', i1.ctxs === 0 && i1.home === true,
    'instant ctxs=' + i1.ctxs + ' home=' + i1.home);
  const nHome = oscillators.length;
  check('主页排出了音符（振荡器 > 20）', nHome > 20, 'osc=' + nHome);
  const types = [...new Set(oscillators.map(o => o.type))].sort().join(',');
  check('两条音色齐：木琴 sine + 低音/和弦 triangle', types === 'sine,triangle', types);
  const freqs = oscillators.map(o => o.frequency.value);
  check('音域铺开（最低 < 200Hz，最高 > 600Hz）',
    Math.min(...freqs) < 200 && Math.max(...freqs) > 600,
    'min=' + Math.min(...freqs).toFixed(1) + ' max=' + Math.max(...freqs).toFixed(1));
  check('主页不再引用任何音频文件', CFG.AUDIO.bgm.home === '', "'" + CFG.AUDIO.bgm.home + "'");

  console.log('\n== 2. 进关卡：同步切、不再等 ==');
  audio.setScene('lv1');
  const i2 = audio.bgmInfo();                     // 调用返回后立刻读，不等任何定时器
  check('主页曲立刻停（home=false）', i2.home === false);
  check('mp3 立刻处于播放态', i2.paused === false && i2.file === 'bgm_lv1.mp3',
    i2.file + ' paused=' + i2.paused);
  check('mp3 音量已乘本条 trim',
    Math.abs(i2.volume - Math.min(1, CFG.AUDIO.bgmVolume * trim.bgm_lv1)) < 0.01,
    'vol=' + i2.volume.toFixed(2));
  check('同时只有 1 首在播', i2.playing === 1, 'playing=' + i2.playing);
  await sleep(120);
  check('闸门已归零（残留音不会继续响）', Math.abs(audio.bgmInfo().gate) < 0.01,
    'gate=' + audio.bgmInfo().gate);
  check('切曲不新建实例（复用预载的 4 个）', audio.bgmInfo().ctxs === 4, 'ctxs=' + audio.bgmInfo().ctxs);

  console.log('\n== 3. 回主页：mp3 同步停 ==');
  audio.setScene('home');
  const i3 = audio.bgmInfo();
  check('主页曲立刻起（home=true）', i3.home === true);
  check('mp3 立刻停止（playing=0）', i3.playing === 0, 'playing=' + i3.playing);
  check('回主页重新打开闸门', Math.abs(i3.gate - 1) < 0.01, 'gate=' + i3.gate);

  console.log('\n== 4. 关卡换曲 ==');
  audio.setScene('lv3');
  await sleep(60);
  check('第 3 首 → bgm_lv3', audio.bgmInfo().file === 'bgm_lv3.mp3', audio.bgmInfo().file);
  const before = audio.bgmInfo().ctxs;
  audio.setScene('lv4');
  await sleep(60);
  check('第 4 首 → bgm_lv4', audio.bgmInfo().file === 'bgm_lv4.mp3', audio.bgmInfo().file);
  check('仍复用预载实例', audio.bgmInfo().ctxs === before, 'ctxs=' + audio.bgmInfo().ctxs);
  check('换曲后只剩 1 首在播', audio.bgmInfo().playing === 1, 'playing=' + audio.bgmInfo().playing);
  /* 同一首重复设场景（1~5 关都是 lv1 的情形）不该从头放 */
  const cur = players.filter(p => !p.paused);
  const nPlay = cur.length ? cur[0].plays : -1;
  audio.setScene('lv4');
  await sleep(60);
  const cur2 = players.filter(p => !p.paused);
  check('同一首不重头开始（plays 不增加）', cur2.length === 1 && cur2[0].plays === nPlay,
    'plays ' + nPlay + '→' + (cur2.length ? cur2[0].plays : 'none'));

  console.log('\n== 5. 压低 / 开关 / 前后台 ==');
  audio.duck(true);
  const curFile = audio.bgmInfo().file;
  check('弹窗压到 duck × trim', Math.abs(audio.bgmInfo().volume - CFG.AUDIO.bgmDuckVolume * trim[String(curFile || '').replace(/\.mp3$/, '')]) < 0.01,
    'vol=' + audio.bgmInfo().volume.toFixed(2));
  audio.duck(false);
  check('恢复 bgmVolume × trim',
    Math.abs(audio.bgmInfo().volume - Math.min(1, CFG.AUDIO.bgmVolume * trim[String(curFile || '').replace(/\.mp3$/, '')])) < 0.01,
    'vol=' + audio.bgmInfo().volume.toFixed(2));
  audio.setEnabled(true, false);
  check('关 BGM：mp3 停 + 主页曲停', audio.bgmInfo().playing === 0 && audio.bgmInfo().home === false);
  check('关 BGM：总线归零', Math.abs(audio.bgmInfo().gain) < 0.01, 'gain=' + audio.bgmInfo().gain);
  audio.setEnabled(true, true);
  await sleep(60);
  check('重开 BGM 恢复播放', audio.bgmInfo().playing === 1, 'playing=' + audio.bgmInfo().playing);
  audio.setVisible(false);
  check('切后台全部停止', audio.bgmInfo().playing === 0 && audio.bgmInfo().home === false);
  audio.setVisible(true);
  await sleep(60);
  check('回前台恢复', audio.bgmInfo().playing === 1 || audio.bgmInfo().home === true,
    'playing=' + audio.bgmInfo().playing + ' home=' + audio.bgmInfo().home);

  console.log('\n== 6. 四首关卡曲资源齐（v0.62：都在 audio-pkg 分包里） ==');
  /* 主包不能再有 mp3 —— 有就说明分包没生效，包体又回到 3.2MB */
  const mainPkgLv = CFG.AUDIO.bgm.lv.filter(f => fs.existsSync(path.join(ROOT, 'miniprogram', 'assets/audio', f)));
  check('主包内不再残留关卡曲', mainPkgLv.length === 0, mainPkgLv.join(',') || 'none');
  for (const f of CFG.AUDIO.bgm.lv) {
    const fp = path.join(ROOT, 'miniprogram', 'audio-pkg', 'assets/audio', f);
    check(f, fs.existsSync(fp) && fs.statSync(fp).size > 100 * 1024,
      fs.existsSync(fp) ? Math.round(fs.statSync(fp).size / 1024) + 'KB' : '缺失');
  }
  check('主页谱表完整（8 小节 / 32 个旋律音）',
    (CFG.AUDIO.home.prog || []).length === 8 && (CFG.AUDIO.home.melody || []).length === 32,
    'prog=' + (CFG.AUDIO.home.prog || []).length + ' melody=' + (CFG.AUDIO.home.melody || []).length);

  console.log('\n== 7. v0.14.1：进关卡不会被「预载收声」掐掉 ==');
  /* 上一版的坑：解锁时把 4 首 play() 起来、90ms 后统一 pause()。
   * 玩家第一下点的就是「开始」时，解锁与进关卡同一拍，lv1 刚播上就被 90ms 后的
   * pause 掐掉 → "进拼图音乐直接没了"，而且没有代码救回来。 */
  audio.setScene('lv1');
  const lv1p = players.filter(p => /bgm_lv1/.test(p.src))[0];
  const playsAtEntry = lv1p.plays;
  await sleep(260);
  check('进关卡 260ms 后仍在播（不被预载 pause 掐掉）',
    audio.bgmInfo().paused === false && audio.bgmInfo().playing === 1,
    'paused=' + audio.bgmInfo().paused + ' playing=' + audio.bgmInfo().playing);
  check('没有反复 play（plays 只 +1）', lv1p.plays - playsAtEntry <= 1,
    'plays ' + playsAtEntry + '→' + lv1p.plays);
  check('预载闸门只开一次（loadBuffers 完成再调 startBgm 不会二次预载）',
    audio.bgmInfo().preloaded === true && audio.bgmInfo().ctxs === 4,
    'preloaded=' + audio.bgmInfo().preloaded + ' ctxs=' + audio.bgmInfo().ctxs);

  console.log('\n== 8. 首播被吞时看门狗补一次 ==');
  audio.setScene('lv2');
  await sleep(80);
  const lv2p = players.filter(p => /bgm_lv2/.test(p.src))[0];
  /* 制造"点了 play 但没起来"：下一次 play 只计数不真的播 */
  let swallow = true;
  const realPlay = lv2p.play.bind(lv2p);
  lv2p.play = function () {
    if (swallow) { swallow = false; lv2p.plays++; return; }
    return realPlay();
  };
  audio.setScene('lv3');            // 换走，保证下一次进来要重新 play
  await sleep(60);
  audio.setScene('lv2');
  await sleep(40);
  check('首播被吞时确实处于暂停', lv2p.paused === true, 'paused=' + lv2p.paused);
  await sleep(360);
  check('300ms 看门狗把它补起来了', lv2p.paused === false, 'paused=' + lv2p.paused);

  console.log('\n== 9. 源码约束（两端一致的做法） ==');
  const miniSrc = fs.readFileSync(path.join(ROOT, 'miniprogram/game.js'), 'utf8');
  const pvSrc = fs.readFileSync(path.join(ROOT, 'preview/js/game.js'), 'utf8');
  check('小程序：预载里不再 play() / pause()', !/a\.play\(\)[\s\S]{0,200}a\.pause\(\)/.test(miniSrc));
  check('小程序：预载有一次性闸门', /bgmPreloaded/.test(miniSrc));
  check('小程序：不再 seek(0)（避免多余解码）', !/\.seek\(0\)/.test(miniSrc));
  check('小程序：进关卡用淡出让位', /homeStop\(true\)/.test(miniSrc));
  /* 只卡 bgmPlay 段：音效池 playElement 里的 currentTime=0 是正常的"重头播一声" */
  const pvBgm = pvSrc.slice(pvSrc.indexOf('function bgmPlay'), pvSrc.indexOf('function bgmSetScene'));
  check('预览：bgm 切曲不再 currentTime = 0', !/currentTime = 0/.test(pvBgm));
  check('预览：有 canplay 补播 + 看门狗', /startEl\(/.test(pvSrc) && /armWatch\(/.test(pvSrc));
  check('两端都关掉了在飞的补播（关音乐时）', /_watch/.test(miniSrc) && /_watch/.test(pvSrc));

  console.log('\n== 10. v0.14.2：WebAudio 被挂起后回主页要自己醒过来 ==');
  /* 真机现象：第一次主页有声 → 进关卡（原生 mp3 抢了音频会话）→ 回主页静音。
   * 系统把 wx.createWebAudioContext 置为 suspended，currentTime 冻结、音符全不发；
   * mp3 走 InnerAudioContext，所以关卡那边照常有声。 */
  audio.setScene('lv1');
  await sleep(60);
  AC_REF.state = 'suspended';                 // 模拟平台挂起
  const resumeBefore = AC_REF.resumeCalls;
  const oscBefore = oscillators.length;
  audio.setScene('home');
  await sleep(120);
  check('挂起后回主页会自动 resume', AC_REF.state === 'running' && audio.bgmInfo().ac === 'running',
    'state=' + AC_REF.state);
  check('resume 只叫一次（不刷）', AC_REF.resumeCalls - resumeBefore === 1,
    'resumeCalls +' + (AC_REF.resumeCalls - resumeBefore));
  check('醒来后主页曲重新排上', oscillators.length > oscBefore, 'osc=' + (oscillators.length - oscBefore));

  /* 主页正在放时被挂起：tick 里要能自己救回来，而不是一直空转 */
  AC_REF.state = 'suspended';
  const resume2 = AC_REF.resumeCalls;
  await sleep(500);                            // 等一次 400ms 的 tick
  check('主页播放中被挂起，tick 也能叫醒', AC_REF.state === 'running' || AC_REF.resumeCalls > resume2,
    'state=' + AC_REF.state + ' resume+=' + (AC_REF.resumeCalls - resume2));

  console.log('\n== 11. 闸门写入要能盖住「在飞的淡出」 ==');
  audio.setScene('lv1');                       // 触发 150ms 淡出
  await sleep(20);
  audio.setScene('home');                      // 淡出还没走完就回主页
  await sleep(40);
  check('淡出未完成时回主页，闸门仍到 1', audio.bgmInfo().gate > 0.9,
    'gate=' + audio.bgmInfo().gate);
  const gmSrc = fs.readFileSync(path.join(ROOT, 'miniprogram/game.js'), 'utf8');
  check('闸门写入用 cancel(0)+setValueAtTime，不只写 .value', /function gateTo/.test(gmSrc));

  const pvHome = fs.readFileSync(path.join(ROOT, 'preview/js/game.js'), 'utf8');
  check('预览端 homeStart 前也先 resumeAudio', /function homeStart\(\) \{[\s\S]{0,160}resumeAudio\(\)/.test(pvHome));

  /* ---- 12. v0.29.2 新增、v0.29.3 音频回退后仍保留的「拼接失败音」 ---- */
  console.log('\n== 12. 拼接失败音效（回退后保留） ==');
  const failWavMp = path.join(ROOT, 'miniprogram/assets/audio/sfx_fail.wav');
  const failWavPv = path.join(ROOT, 'preview/assets/audio/sfx_fail.wav');
  const failExists = fs.existsSync(failWavMp) && fs.existsSync(failWavPv);
  check('配置注册了 sfx_fail.wav', CFG.AUDIO.files.sfx_fail === 'sfx_fail.wav',
    String(CFG.AUDIO.files.sfx_fail));
  check('失败音比成功吸附音轻', typeof CFG.AUDIO.sfxGain.sfx_fail === 'number' &&
    CFG.AUDIO.sfxGain.sfx_fail < CFG.AUDIO.sfxGain.sfx_snap,
    'fail=' + CFG.AUDIO.sfxGain.sfx_fail + ' snap=' + CFG.AUDIO.sfxGain.sfx_snap);
  check('两端失败音资源齐且一致', failExists &&
    fs.readFileSync(failWavMp).equals(fs.readFileSync(failWavPv)),
    failExists ? fs.statSync(failWavMp).size + 'B' : 'missing');
  check('两端合成兜底都有 sfx_fail', /sfx_fail:\s*function/.test(gmSrc) && /sfx_fail:\s*function/.test(pvHome),
    'miniprogram=' + /sfx_fail:\s*function/.test(gmSrc) + ' preview=' + /sfx_fail:\s*function/.test(pvHome));
  const coreSrc = fs.readFileSync(path.join(ROOT, 'js/core.js'), 'utf8');
  check('重叠失败时确实调用 sfx_fail',
    /overlaps\.length[\s\S]{0,300}env\.audio\.play\('sfx_fail'\)/.test(coreSrc));

  console.log('\n== 13. v0.47：快速切页不许把两代主页曲叠在一起 ==');
  /* 用户反馈：「快速进入游戏主页几次音乐有重叠，隔一会又好了」。
   * 根因：homeStop() 只是「闸门淡出 150ms + 190ms 定时器里硬停振荡器」，
   * 在这 190ms 内又 homeStart() 的话闸门会被拉回 1，上一代已经排进时间轴的
   * 一整小节重新出声 —— 听起来就是同一首曲子叠了两三遍。
   * 修法：上一代挂进 homeDead，homeStart 开闸前先 flushHomeDead() 同步停掉。
   *
   * 断言口径：看「这一代还在时间轴上的音符数」。
   * 旧版快速切 8 次会涨到 8 倍（54/80/105…），现在必须稳定在基线。 */
  audio.setScene('home');
  await sleep(40);
  const liveBase = audio.bgmInfo().live;
  check('基线：单代主页曲的音符数 > 10', liveBase > 10, 'live=' + liveBase);
  let maxLive = 0;
  for (let i = 0; i < 8; i++) {
    audio.setScene('lv1');          // 与真实操作同节奏：60ms 内来回一趟
    await sleep(20);
    audio.setScene('home');
    await sleep(40);
    maxLive = Math.max(maxLive, audio.bgmInfo().live);
  }
  check('快速进出 8 次，音符数始终不超过基线的 1.2 倍（不叠代）',
    maxLive <= Math.ceil(liveBase * 1.2), `基线 ${liveBase}，峰值 ${maxLive}`);
  check('每次回主页都只有一代在放（dead 里不留残余）',
    audio.bgmInfo().dead === 0, 'dead=' + audio.bgmInfo().dead);
  await sleep(240);
  check('稳定后仍只有一代', audio.bgmInfo().live === liveBase && audio.bgmInfo().dead === 0,
    `live=${audio.bgmInfo().live} dead=${audio.bgmInfo().dead}`);

  /* 慢速（> 190ms）本来就没有重叠问题，这里做反向对照：修复不能把慢速切页弄坏 */
  for (let i = 0; i < 2; i++) {
    audio.setScene('lv1');
    await sleep(260);
    audio.setScene('home');
    await sleep(260);
  }
  check('慢速切换后仍在正常播放', audio.bgmInfo().home === true && audio.bgmInfo().gate > 0.9,
    'home=' + audio.bgmInfo().home + ' gate=' + audio.bgmInfo().gate);

  const _mini = fs.readFileSync(path.join(ROOT, 'miniprogram/game.js'), 'utf8');
  const _pv = fs.readFileSync(path.join(ROOT, 'preview/js/game.js'), 'utf8');
  check('两端都有「旧代」队列与同步清场', /homeDying/.test(_mini) && /homeDying/.test(_pv) &&
    /function stopHomeGen/.test(_mini) && /function stopHomeGen/.test(_pv) &&
    /function flushHomeDead/.test(_mini) && /function flushHomeDead/.test(_pv));
  check('两端都按代创建 gate / delay（不共用旧图）',
    /function createHomeGen/.test(_mini) && /function createHomeGen/.test(_pv) &&
    /gen\.gate = AC\.createGain/.test(_mini) && /gen\.gate = AC\.createGain/.test(_pv) &&
    /gen\.delay = AC\.createDelay/.test(_mini) && /gen\.delay = AC\.createDelay/.test(_pv));
  check('两端 homeStart 先清旧代再开新闸',
    /flushHomeDead\(\);[\s\S]{0,260}var gen = createHomeGen/.test(_mini) &&
    /flushHomeDead\(\);[\s\S]{0,260}var gen = createHomeGen/.test(_pv) &&
    /gen\.gate\.gain\.value = 1/.test(_pv));
  check('不再共用上一代 homeGate / homeDead',
    !/homeDeadTimer/.test(_mini) && !/homeDeadTimer/.test(_pv) &&
    !/homeDead = HOME_OSC/.test(_mini) && !/homeDead = HOME_OSC/.test(_pv));

  console.log('\n' + (fail === 0 ? '音频验收全部通过' : `!! ${fail} 项未通过`));
  process.exit(fail === 0 ? 0 : 1);
});
