/* v0.48 专项验收：倒计时归零 → 失败动画 + 失败音乐
 * 用法：node tools/verify_v048.js
 *
 * 用户反馈：「游戏倒计时结束就算游戏失败，这时候需要设计一个失败动画配一个失败的音乐。」
 *
 * 实现：
 *   · 音乐：两端 game.js 新增 sfx_timeup（A 小调下行 A4→F4→D4→A3 + A2 闷音，
 *     约 1.55s，纯合成零文件）；失败时先 audio.halt() 停关卡曲再播放，
 *     halt 不改 bgmScene —— 复活时 setLevelScene() 自然恢复。
 *   · 动画：state.failT 只在 overlay==='fail' 时推进；红闪 → 卡片下滑缩放 →
 *     大红心弹性放大 + 裂纹 →「时间到！」横幅砸下淡出。全部包在 save/restore
 *     里，动画结束后与静态版逐像素相同；动画期间不注册热区防错位点击。
 *
 * 断言：
 *   A. 配置/版本（三端一致）
 *   B. 超时触发：halt + sfx_timeup，不再响 sfx_tap
 *   C. 动画时间轴：0ms 有红闪/横幅；>1300ms 全部退场
 *   D. reduceMotion 直接走静态版
 *   E. 复活恢复关卡曲
 *   F. 两端源码守住「情绪音走合成」「halt 不改场景」「动画期不收点击」
 */
const path = require('path');
const fs = require('fs');
const ROOT = path.join(__dirname, '..');

const rec = { texts: [], rects: [], plays: [], halts: 0, scenes: [] };

function makeCtx() {
  const grad = { addColorStop() {} };
  const o = {
    canvas: { width: 0, height: 0, style: {} },
    measureText() { return { width: 40 }; },
    createLinearGradient() { return grad; }, createRadialGradient() { return grad; },
    createPattern() { return null; },
    fillText(s, x, y) { rec.texts.push(String(s)); },
    fillRect(x, y, w, h) { rec.rects.push({ x, y, w, h, style: String(o._fill || '') }); },
    save() {}, restore() {}, translate() {}, scale() {}, rotate() {}, setTransform() {},
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, arcTo() {},
    ellipse() {}, quadraticCurveTo() {}, bezierCurveTo() {}, rect() {}, clip() {},
    fill() {}, stroke() {}, strokeRect() {}, clearRect() {},
    strokeText() {}, setLineDash() {}, drawImage() {}
  };
  Object.defineProperty(o, 'fillStyle', {
    get() { return o._fill || ''; },
    set(v) { o._fill = v; }
  });
  return o;
}

let pendingFrame = null, clock = 0;
global.requestAnimationFrame = cb => { pendingFrame = cb; return 1; };
function step(ms) { clock += (ms || 16); const cb = pendingFrame; pendingFrame = null; if (cb) cb(clock); }
function render() { rec.texts = []; rec.rects = []; step(16); }

require(path.join(ROOT, 'js/levels.js'));
const CFG = require(path.join(ROOT, 'js/config.js'));
const CORE = require(path.join(ROOT, 'js/core.js'));

let fail = 0, total = 0;
function check(label, ok, detail) {
  total++;
  if (!ok) fail++;
  console.log(`  [${ok ? 'OK' : 'XX'}] ${label}${detail ? '  ' + detail : ''}`);
}
function section(t) { console.log('\n' + t); }

const store = {};
const env = {
  ctx: makeCtx(), tutorial: false,
  size: () => ({ w: 750, h: 1624 }), dpr: () => 3,
  safeInsets: () => ({ top: 0, bottom: 0 }),
  bindInput() {},
  storage: { get: k => (k in store ? store[k] : null), set: (k, v) => { store[k] = v; } },
  audio: {
    unlock() {}, setEnabled() {}, duck() {}, setVisible() {},
    play(n) { rec.plays.push(n); },
    halt() { rec.halts++; },
    setScene(k) { rec.scenes.push(k); }
  },
  vibrate() {}, images: {}, onHide() {}, onShow() {}, share() {}
};

const game = CORE(env);
game.init();
step(16);
const D = game._debug, S = game.state;

/* ================= A. 配置 ================= */
section('A. 配置 / 版本（三端一致）');
check('版本 ≥ v0.48', /^v0\.(4[89]|[5-9]\d)/.test(CFG.version), CFG.version);
const A = CFG.FAIL_ANIM || {};
check('FAIL_ANIM 节奏齐全且卡片延迟进场',
  A.flashMs === 360 && A.cardDelay === 460 && A.enterMs === 440 &&
  A.heartMs === 700 && A.shardMs === 900 && A.bannerMs === 820,
  JSON.stringify(A));
check('横幅在卡片落位前退场（bannerMs < cardDelay + enterMs）',
  A.bannerMs < A.cardDelay + A.enterMs,
  `banner=${A.bannerMs} card=${A.cardDelay + A.enterMs}`);
check('sfx_timeup 已配增益（纯合成，不进 files）',
  CFG.AUDIO.sfxGain.sfx_timeup === 0.95 && !CFG.AUDIO.files.sfx_timeup,
  'gain=' + CFG.AUDIO.sfxGain.sfx_timeup);

/* ================= B. 超时触发 ================= */
section('B. 倒计时归零 → 停背景曲 + 播失败乐句');
D.setupLevel(5);
S.page = 'play'; S.fade = 1; S.pageT = 9999;
S.timeLeft = 0.004;
rec.plays = []; rec.halts = 0; rec.scenes = [];
step(20);
check('归零进复活页', S.overlay === 'fail', 'overlay=' + S.overlay);
check('halt() 先让背景安静', rec.halts === 1, 'halts=' + rec.halts);
check('播放 sfx_timeup', rec.plays.indexOf('sfx_timeup') >= 0, rec.plays.join(','));
check('不再叠 sfx_tap（旧版失败音）', rec.plays.indexOf('sfx_tap') < 0, rec.plays.join(','));
check('halt 没有改场景（复活可自然恢复）', rec.scenes.length === 0, rec.scenes.join(','));
check('failT 从 0 起算，且只在 fail 页推进', S.failT >= 0 && S.failT < 60, 'failT=' + S.failT);

/* ================= C. 动画时间轴 ================= */
section('C. 动画：红闪 / 横幅进场与退场');
S.failT = 0;
render();
const flash0 = rec.rects.some(r => /rgba\(229,72,77,0\.\d+\)/.test(r.style));
const banner0 = rec.texts.indexOf('时间到！') >= 0;
check('0ms：全屏红闪在画', flash0, rec.rects.filter(r => /229,72,77/.test(r.style)).map(r => r.style).join(' '));
check('0ms：「时间到！」横幅在画', banner0, rec.texts.join('|'));

S.failT = 700;
render();
check('700ms：横幅仍在（停留段，全不透明）', rec.texts.indexOf('时间到！') >= 0, rec.texts.join('|'));
check('700ms：红闪已退场', !rec.rects.some(r => /rgba\(229,72,77,0\.\d+\)/.test(r.style)));

S.failT = 899;
render();
check('899ms：横幅已开始退场（不让它压在落位的卡片上）',
  rec.texts.indexOf('时间到！') < 0, rec.texts.join('|'));

S.failT = 1900;
render();
check('1900ms：横幅完全退场（静态版一致）', rec.texts.indexOf('时间到！') < 0, rec.texts.join('|'));
check('静态版仍保留复活页全部按钮文案',
  rec.texts.some(t => /看广告复活|本关看视频次数已用完/.test(t)) &&
  rec.texts.some(t => /花 \d+ 巧币复活/.test(t)) &&
  rec.texts.some(t => t === '忍痛放弃'), rec.texts.join('|'));

/* ================= D. reduceMotion ================= */
section('D. 减少动态效果 → 静态版');
S.failT = 0; S.reduceMotion = true;
render();
check('reduceMotion：无红闪', !rec.rects.some(r => /rgba\(229,72,77,0\.\d+\)/.test(r.style)));
check('reduceMotion：无横幅', rec.texts.indexOf('时间到！') < 0, rec.texts.join('|'));
check('reduceMotion：按钮文案仍在', rec.texts.some(t => /复活/.test(t)));
S.reduceMotion = false;

/* ================= E. 复活恢复 ================= */
section('E. 复活后关卡曲恢复');
const before = rec.scenes.length;
D.doRevive(true);
check('复活关闭弹窗并继续', S.overlay === null && S.running === true);
check('复活重新 setScene（恢复关卡曲）', rec.scenes.length > before,
  rec.scenes.slice(before).join(','));

/* ================= F. 两端源码 ================= */
section('F. 两端 game.js 的实现约束');
const mini = fs.readFileSync(path.join(ROOT, 'miniprogram/game.js'), 'utf8');
const pv = fs.readFileSync(path.join(ROOT, 'preview/js/game.js'), 'utf8');
const coreSrc = fs.readFileSync(path.join(ROOT, 'js/core.js'), 'utf8');
const cfgSrc = fs.readFileSync(path.join(ROOT, 'js/config.js'), 'utf8');
check('两端都有 sfx_timeup 合成实现',
  /sfx_timeup:\s*function/.test(mini) && /sfx_timeup:\s*function/.test(pv));
check('两端都让 sfx_timeup 绕过 wav/风格直达合成',
  /name === 'sfx_timeup'/.test(mini) && /name === 'sfx_timeup'/.test(pv));
check('两端都有 halt() 且只停声不改场景',
  /halt:\s*function/.test(mini) && /halt:\s*function/.test(pv) &&
  /function bgmHalt/.test(mini) && /function bgmHalt/.test(pv) &&
  !/function bgmHalt[\s\S]{0,240}bgmScene\s*=/.test(mini) &&
  !/function bgmHalt[\s\S]{0,240}bgmScene\s*=/.test(pv));
check('core 先 halt 再 play（顺序不能反）',
  /env\.audio\.halt\(\);\s*\n\s*env\.audio\.play\('sfx_timeup'\)/.test(coreSrc));
check('动画期不注册热区', /hitOK/.test(coreSrc) && /if \(canAd && hitOK\)/.test(coreSrc));
check('failT 只在 fail 页推进',
  /if \(state\.overlay === 'fail'\) state\.failT[\s\S]{0,80}\+ dt/.test(coreSrc));
check('三端版本号一致',
  /version: 'v0\.49'/.test(cfgSrc) &&
  /version: 'v0\.49'/.test(fs.readFileSync(path.join(ROOT, 'preview/js/config.js'), 'utf8')) &&
  /version: 'v0\.49'/.test(fs.readFileSync(path.join(ROOT, 'miniprogram/js/config.js'), 'utf8')));

console.log('\n' + (fail === 0 ? `v0.48 失败动画/音乐验收全部通过（${total} 项）`
  : `!! ${fail}/${total} 项未通过`));
process.exit(fail === 0 ? 0 : 1);
