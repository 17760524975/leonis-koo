/* v0.6 专项验收：BGM 修复 / 主页版式 / 固定入口 / 持续小花流 / 改名
 * 用法：node tools/verify_v06.js
 * 说明：音频只验证「调度与增益链路」（无头环境听不到声音），
 *       实际听感仍需真机确认；但增益数值可算，避免再次出现 -42dBFS 的静音。
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

function makeCtx() {
  const grad = { addColorStop() {} };
  return new Proxy({}, {
    get(t, k) {
      if (k === 'measureText') return () => ({ width: 40 });
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad;
      if (k === 'createPattern') return () => null;
      if (k === 'canvas') return { width: 0, height: 0, style: {} };
      return () => {};
    },
    set() { return true; }
  });
}

let pendingFrame = null;
global.requestAnimationFrame = cb => { pendingFrame = cb; return 1; };
let clock = 0;
function step(ms) {
  clock += ms;
  const cb = pendingFrame;
  pendingFrame = null;
  if (cb) cb(clock);
}

require(path.join(ROOT, 'js/levels.js'));
require(path.join(ROOT, 'js/geom.js'));
require(path.join(ROOT, 'js/judge.js'));
const CFG = require(path.join(ROOT, 'js/config.js'));
const CORE = require(path.join(ROOT, 'js/core.js'));
const DATA = globalThis.TANGRAM_DATA;

const store = {};
const log = { play: [], scene: [], duck: [], enabled: [] };
const env = {
  ctx: makeCtx(),
  size: () => ({ w: 375, h: 812 }),
  dpr: () => 3,
  safeInsets: () => ({ top: 20, bottom: 0 }),
  bindInput(fn) { this._in = fn; },
  storage: { get: k => (k in store ? store[k] : null), set: (k, v) => { store[k] = v; } },
  audio: {
    unlock() {}, setEnabled(s, b) { log.enabled.push([s, b]); },
    play(n) { log.play.push(n); },
    duck(v) { log.duck.push(v); },
    setVisible() {},
    setScene(k) { log.scene.push(k); }
  },
  vibrate() {}, images: {},
  onHide() {}, onShow() {}
};

let fail = 0;
function check(label, ok, detail) {
  if (!ok) fail++;
  console.log(`  [${ok ? 'OK' : 'XX'}] ${label}${detail ? '  ' + detail : ''}`);
}
function section(t) { console.log('\n== ' + t + ' =='); }

const game = CORE(env);
game.init();
const S = game.state;

/* 坐标系换算（与 core 一致） */
const scale = Math.min(375 / CFG.DESIGN.w, 812 / CFG.DESIGN.h);
const ox = (375 - CFG.DESIGN.w * scale) / 2;
const oy = (812 - CFG.DESIGN.h * scale) / 2;
const css = (dx, dy) => [ox + dx * scale, oy + dy * scale];
function tap(dx, dy) {
  const p = css(dx, dy);
  env._in('down', p[0], p[1]); step(16);
  env._in('up', p[0], p[1]); step(16);
}
function drag(fromD, toD, steps) {
  const a = css(fromD[0], fromD[1]);
  env._in('down', a[0], a[1]); step(16);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const p = css(fromD[0] + (toD[0] - fromD[0]) * t, fromD[1] + (toD[1] - fromD[1]) * t);
    env._in('move', p[0], p[1]); step(16);
  }
  const b = css(toD[0], toD[1]);
  env._in('up', b[0], b[1]); step(16);
}

/* ---------- 1. 版本与改名 ---------- */
section('1. 版本与品牌名');
/* v0.7 起版本号继续前滚，这里只要求「不低于 v0.6」 */
check('版本号 ≥ v0.6', /^v0.[6-9]/.test(CFG.version), CFG.version);
check('品牌名 = 方寸巧拼', CFG.BRAND && CFG.BRAND.name === '方寸巧拼', CFG.BRAND && CFG.BRAND.name);
/* 只判「当标题/分享名用」的旧名；config 的 slogan「四巧 · 七巧，拼出你的形状」
 * 与历史注释属于正常描述，不算残留。 */
const files = ['js/core.js', 'preview/js/game.js', 'miniprogram/game.js',
  'preview/index.html', 'preview/css/style.css', 'miniprogram/project.config.json'];
let stale = [];
for (const f of files) {
  const t = fs.readFileSync(path.join(ROOT, f), 'utf8');
  if (/text\('四巧 · 七巧'/.test(t)) stale.push(f + ':标题');
  if (/title: '四巧·七巧'/.test(t) || /<title>四巧·七巧/.test(t)) stale.push(f + ':标题');
  if (/shareAppMessage\(\{ title: '四巧/.test(t)) stale.push(f + ':分享');
}
check('工程内无旧游戏名残留（标题/分享/工程名）', stale.length === 0, stale.join(',') || 'clean');
const pcfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'miniprogram/project.config.json'), 'utf8'));
check('微信工程名已改', pcfg.projectname === 'fangcun-qiaopin', pcfg.projectname);
check('微信工程描述含新名', /方寸巧拼/.test(pcfg.description), pcfg.description);
check('网页标题已改', /方寸巧拼/.test(fs.readFileSync(path.join(ROOT, 'preview/index.html'), 'utf8')));

/* ---------- 2. BGM 链路 ---------- */
section('2. BGM：场景与增益');
check('BGM 有 win 场景', !!CFG.BGM.win, JSON.stringify(CFG.BGM.win));
check('关卡轮换曲仍 3 首', CFG.BGM.scenes.length === 3, CFG.BGM.scenes.join(','));
check('合成总线音量已校准', CFG.AUDIO.bgmVolume >= 0.8, 'bgmVolume=' + CFG.AUDIO.bgmVolume);
check('压低后仍可听清', CFG.AUDIO.bgmDuckVolume >= 0.4, 'duck=' + CFG.AUDIO.bgmDuckVolume);
const NG = CFG.AUDIO.bgmNote;
const peak = NG.lead + NG.root;
const db = 20 * Math.log10(peak * CFG.AUDIO.bgmVolume);
check('单音峰值在可听区间', peak >= 0.10 && peak <= 0.50, `peak=${peak.toFixed(3)} (${db.toFixed(1)} dBFS)`);
const oldDb = 20 * Math.log10((0.030 + 0.020) * 0.30);
check('旧版确实明显偏小（对比值）', oldDb < -30, `v0.5 峰值 ${oldDb.toFixed(1)} dBFS`);

for (const [file, cfgVar] of [['preview/js/game.js', 'C'], ['miniprogram/game.js', 'CONFIG']]) {
  const t = fs.readFileSync(path.join(ROOT, file), 'utf8');
  check(`${file} 有 win 旋律`, /win:\s*\{ bpm: 112/.test(t));
  check(`${file} 增益走配置`, /BGM_NOTE\.(root|lead)/.test(t));
  check(`${file} 回退路径限幅括号正确`, /\(\(bgmSrc \|\| bgm\w+\) && v >/.test(t));
}

/* ---------- 3. 主页版式 ---------- */
section('3. 主页版式：标签不再压图标');
const H = CFG.LAYOUT.HOME;
const labelH = H.labelSize * 1.25;          // 单行文字实际占高（约 1.25 倍字号）
let worstGap = 1e9, worstAt = '';
for (let i = 0; i < 3; i++) {
  const labelBottom = H.entryY0 + i * H.entryGap + H.labelDy + labelH / 2;
  const nextTop = H.entryY0 + (i + 1) * H.entryGap - H.entryW / 2;
  const gap = nextTop - labelBottom;
  if (gap < worstGap) { worstGap = gap; worstAt = `第${i + 1}个标签`; }
}
check('标签与下一图标留有净空', worstGap >= 8, `${worstAt} 净空 ${worstGap.toFixed(1)}px`);
const lastLabelBottom = H.entryY0 + 3 * H.entryGap + H.labelDy + labelH / 2;
const startTop = H.startY - 108 / 2;
check('最后一个标签不压「开始」按钮', startTop - lastLabelBottom >= 8,
  `净空 ${(startTop - lastLabelBottom).toFixed(1)}px`);
check('四巧板在七巧板之上', H.set4Y < H.set7Y, `set4=${H.set4Y} set7=${H.set7Y}`);
check('主入口热区 ≥ 最小热区', H.entryW >= CFG.LAYOUT.MIN_HIT, H.entryW + 'px');

/* ---------- 4. 固定入口 ---------- */
section('4. 两套拼图固定入口（点击不换位）');
check('初始在四巧板', S.setKey === 'tangram4', S.setKey);
tap(375, H.set7Y);
for (let i = 0; i < 4; i++) step(16);
check('点七巧板 → 切到七巧板并进列表', S.setKey === 'tangram7' && S.page === 'levels',
  `${S.setKey}/${S.page}`);
tap(70, CFG.SAFE.top + 38);
for (let i = 0; i < 4; i++) step(16);
check('回到主页', S.page === 'home', S.page);
tap(375, H.set4Y);
for (let i = 0; i < 4; i++) step(16);
check('点四巧板 → 切回四巧板并进列表', S.setKey === 'tangram4' && S.page === 'levels',
  `${S.setKey}/${S.page}`);
tap(70, CFG.SAFE.top + 38);
for (let i = 0; i < 4; i++) step(16);
check('入口 id 固定：四巧=set_t4 / 七巧=set_t7',
  fs.readFileSync(path.join(ROOT, 'js/core.js'), 'utf8').indexOf("setEntry('set_t4', 'tangram4'") > 0);

/* ---------- 5. 通关音乐 ---------- */
section('5. 通关音乐持续播放');
tap(375, H.startY);
for (let i = 0; i < 6; i++) step(16);
check('点开始进入对局', S.page === 'play', S.page + '/' + S.levelIdx);
check('进对局切关卡曲', log.scene[log.scene.length - 1] === 'lv1',
  log.scene.join('→'));
const lv0 = DATA.levels[0];
S.pieces.forEach(p => {
  const st = lv0.solution.find(s => s.id === p.id);
  p.onBoard = true; p.x = st.x; p.y = st.y;
  p.angle = st.angle; p.dAngle = st.angle;
  p.flipped = st.flipped; p.dFlipped = st.flipped;
});
step(16);
const dp = S.pieces[0];
const bx = CFG.LAYOUT.BOARD.x + dp.x * (CFG.LAYOUT.BOARD.size / 1000);
const by = CFG.LAYOUT.BOARD.y + dp.y * (CFG.LAYOUT.BOARD.size / 1000);
drag([bx, by], [bx + 2, by + 1], 3);
for (let k = 0; k < 12; k++) step(16);
check('触发通关', !!S.win);
check('通关切到欢庆曲', log.scene[log.scene.length - 1] === 'win', log.scene.join('→'));
check('通关音效有播放', log.play.indexOf('sfx_win') >= 0);
for (let k = 0; k < 80; k++) step(16);
check('结算面板已弹出', S.overlay === 'result', S.overlay);
check('结算时仍停在欢庆曲（未被其他场景切走）',
  log.scene[log.scene.length - 1] === 'win', log.scene.join('→'));
const sceneCount = log.scene.length;
for (let k = 0; k < 200; k++) step(16);      // 停留 3.2s
check('停留 3 秒内没有重新调度场景（曲子自然循环）', log.scene.length === sceneCount,
  `新增 ${log.scene.length - sceneCount} 次`);
tap(375, 890);                                // 下一关
for (let k = 0; k < 8; k++) step(16);
check('下一关切回关卡曲（bgmIdx 已前进）', /^lv[123]$/.test(log.scene[log.scene.length - 1]),
  log.scene.join('→'));

/* ---------- 6. 持续小花流 ---------- */
section('6. 结算期持续小花流');
const S2 = CFG.FLOWER.stream;
game._debug.setupLevel(0);
const arr = game._debug.flowerStream();
check('粒子表非空', arr.length > 10, arr.length + ' 朵');
let mono = true;
for (let i = 1; i < arr.length; i++) if (arr[i].t0 <= arr[i - 1].t0) mono = false;
check('生成时刻严格递增', mono);
const gaps = [];
for (let i = 1; i < arr.length; i++) gaps.push(arr[i].t0 - arr[i - 1].t0);
check('密度由密到疏', gaps[0] < 140 && gaps[gaps.length - 1] > S2.gapMax * 0.9,
  `首间隔 ${gaps[0].toFixed(0)}ms → 末间隔 ${gaps[gaps.length - 1].toFixed(0)}ms`);
let yOk = true, bandT = 0, bandB = 0;
arr.forEach(p => {
  if (p.y >= S2.bandTopMin && p.y <= S2.bandTop) bandT++;
  else if (p.y >= S2.bandBottom && p.y <= S2.bandBottomMax) bandB++;
  else yOk = false;
});
check('小花只落在上下留白带（不压卡片/顶栏/工具栏）', yOk, `上带 ${bandT} / 下带 ${bandB}`);
check('上下两条带都有花', bandT > 3 && bandB > 3, `${bandT}/${bandB}`);
check('小花尺寸在配置区间', arr.every(p => p.size >= S2.minSize && p.size <= S2.maxSize));
/* 首尾循环：超出单轮排程后仍能取到花（不抛错、不空窗） */
let drew = 0;
for (const t of [700, 900, 1200, 3000, 6000, 9000, 12000, 20000]) {
  game._debug.drawWinStreamAt(t); drew++;
}
check('任意时刻绘制不抛错（含首轮结束后的尾部循环）', drew === 8);
check('单轮排程覆盖 ≥ 6s', arr[arr.length - 1].t0 - S2.from >= 6000,
  `覆盖 ${((arr[arr.length - 1].t0 - S2.from) / 1000).toFixed(1)}s`);
check('同屏上限合理', S2.maxAlive >= 8 && S2.maxAlive <= 24, S2.maxAlive);
check('首波时长已延长', CFG.FLOWER.total >= 1400 && CFG.FLOWER.overlayAt >= 900,
  `total=${CFG.FLOWER.total} overlayAt=${CFG.FLOWER.overlayAt}`);

/* ---------- 7. 底纹动效 ---------- */
section('7. 主页底纹动效');
const coreTxt = fs.readFileSync(path.join(ROOT, 'js/core.js'), 'utf8');
check('有光斑动效函数', /function drawHomeGlow/.test(coreTxt));
check('底图有 Ken Burns 缓动', /1\.06/.test(coreTxt));
check('reduceMotion 可关闭动效', /var fx = withArt && !state\.reduceMotion/.test(coreTxt));
 check('有柔光扫过层', /function drawHomeSweep/.test(coreTxt));

console.log('\n' + (fail === 0 ? '全部通过（v0.6）' : `!! ${fail} 项未通过`));
process.exit(fail === 0 ? 0 : 1);
