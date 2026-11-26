/* v0.49 专项验收：深色主题下的「面 / 字成对」+ 失败页进场动画分段
 * 用法：node tools/verify_v049.js
 *
 * 用户反馈：
 *   1.「换了黑色的主题后，排行榜这边的字体显示颜色有冲突，改一下再检查下其他地方有没有类似的问题」
 *   2.「快速进入游戏主页几次音乐有重叠现象…」（BGM 代际隔离，见 verify_audio 第 13 节）
 *   3.「游戏倒计时结束就算游戏失败，这时候需要设计一个失败动画配一个失败的音乐」
 *      （v0.48 已有骨架，v0.49 把「红心 / 碎片 / 横幅 / 卡片」做成真的看得见的序列）
 *
 * 修法（第 1 条）：
 *   · 不再靠调用点逐个判深浅，而是给内容面配一套**配对字色**：
 *       textOnSurface / textOnSurfaceHi / textOnChip / inkOnLight
 *   · 再由 inkOnSurface()/bestInk() 按「字色叠在实际面色上的 WCAG 对比度」挑一支，
 *     浅面自动落回深墨、深面用近白 —— 从根上消掉「浅底白字」。
 *   · state.darkUi = 深色皮肤 || 深色背景特效，替换掉原先 24 处只判 darkSkin 的分支，
 *     修掉 stars/nebula 特效下工具按钮、纸纹、小样仍是浅色的问题。
 *
 * 断言：
 *   A. 配置：配对字色 token 存在，且 dusk / DARK_PAL 都覆盖
 *   B. 数值对比度：四种皮肤 + 深色特效下，内容面上的字色 ≥ 4.5:1
 *   C. 实画：排行榜（dusk / warm）与设置页每一行字都落在可读区间
 *   D. 失败页：520ms 只有动画没有按钮，1300ms 才落位；卡底不透明
 *   E. 源码：core 不再直接拿 COL.text 当行内字色；开放数据域用同一套配对字色
 */
const path = require('path');
const fs = require('fs');
const ROOT = path.join(__dirname, '..');

const rec = { texts: [], fills: [] };

function makeCtx() {
  const grad = { addColorStop() {} };
  const o = {
    canvas: { width: 0, height: 0, style: {} },
    measureText() { return { width: 40 }; },
    createLinearGradient() { return grad; }, createRadialGradient() { return grad; },
    createPattern() { return null; },
    fillText(s, x, y) { rec.texts.push({ s: String(s), color: String(o._fill || ''), x, y }); },
    fillRect(x, y, w, h) { rec.fills.push(String(o._fill || '')); },
    save() {}, restore() {}, translate() {}, scale() {}, rotate() {}, setTransform() {},
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, arcTo() {},
    ellipse() {}, quadraticCurveTo() {}, bezierCurveTo() {}, rect() {}, clip() {},
    fill() { rec.fills.push(String(o._fill || '')); },
    stroke() {}, strokeRect() {}, clearRect() {},
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
function render() { rec.texts = []; rec.fills = []; step(16); }

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
  audio: { unlock() {}, setEnabled() {}, duck() {}, setVisible() {}, play() {}, halt() {}, setScene() {} },
  vibrate() {}, images: {}, onHide() {}, onShow() {}, share() {}
};

const game = CORE(env);
game.init();
step(16);
const D = game._debug, S = game.state;

/* 对比度工具直接用 core 里的那一套，避免「测试自己写一套算法」对不上实现 */
const C0 = () => D.COLORS;
function rgb(c) { return D.rgbOf(c); }
function contrast(a, b) {
  const ra = rgb(a), rb = rgb(b);
  if (!ra || !rb) return 0;
  return D.contrastOf(ra, rb);
}
function over(fg, bg) {
  const a = rgb(fg), b = rgb(bg);
  if (!a) return b; if (!b) return a;
  const al = a.a == null ? 1 : a.a;
  return `rgb(${Math.round(a.r * al + b.r * (1 - al))},` +
    `${Math.round(a.g * al + b.g * (1 - al))},${Math.round(a.b * al + b.b * (1 - al))})`;
}
/* 内容面 = 面色叠在卡纸上，卡纸叠在页面底色上（三层，跟 drawCard 的顺序一致） */
function faces() {
  const C = C0();
  const page = C.bg, card = over(C.card, page);
  return {
    page, card,
    surface: over(C.surface, card),
    surfaceHi: over(C.surfaceHi, card),
    chip: over(C.chipOff || C.surface, card),
    track: over(C.track, card),
    gold: over(C.gold, card)
  };
}
const f2 = n => Math.round(n * 100) / 100;

/* ================= A. 配置 ================= */
section('A. 配置：内容面配对字色（四种皮肤 + 深色特效）');
/* v0.50：本脚本验的是 v0.49 引入的能力，版本号只要求「≥ v0.49 且三端一致」，
 * 否则每升一版这条都要回来改一次（v0.48 那条也一起改成比对三端一致性了）。 */
const numOf = v => parseFloat(String(v).replace(/^v/, '')) || 0;
check('版本 ≥ v0.49（三端一致）',
  numOf(CFG.version) >= 0.49 &&
  require(path.join(ROOT, 'preview/js/config.js')).version === CFG.version &&
  require(path.join(ROOT, 'miniprogram/js/config.js')).version === CFG.version,
  CFG.version);
const need = ['textOnSurface', 'textOnSurfaceHi', 'textOnChip', 'inkOnLight'];
check('COLORS 里有四个配对字色 token',
  need.every(k => typeof CFG.COLORS[k] === 'string'), need.map(k => k + '=' + CFG.COLORS[k]).join(' '));
check('dusk 皮肤覆盖了配对字色（浅字配深面）',
  !!CFG.SKINS.dusk && need.every(k => typeof CFG.SKINS.dusk[k] === 'string'),
  need.map(k => k + '=' + (CFG.SKINS.dusk[k] || '-')).join(' '));
check('DARK_PAL 也覆盖（深色背景特效走同一套）',
  !!CFG.DARK_PAL && need.every(k => typeof CFG.DARK_PAL[k] === 'string'));
check('浅色皮肤的配对字色是深墨（不是白色）',
  need.slice(0, 3).every(k => D.relLum(rgb(CFG.COLORS[k])) < 0.25));

/* ================= B. 数值对比度 ================= */
section('B. 数值对比度：内容面上的字色 ≥ 4.5:1（正文）/ ≥ 3:1（次级）');
const combos = [
  ['warm', null], ['mint', null], ['night', null], ['dusk', null],
  ['warm', 'stars'], ['warm', 'nebula'], ['dusk', 'firefly']
];
combos.forEach(([skin, fx]) => {
  D.applySkin(skin);
  if (fx) D.applyBgFx(fx);
  const F = faces();
  const ink = D.inkOnSurface(false, false);
  const sub = D.inkOnSurface(false, true);
  const inkHi = D.inkOnSurface(true, false);
  const tag = skin + (fx ? '+' + fx : '');
  check(`${tag}：正文墨色 vs 行底 ≥ 4.5`,
    contrast(ink, F.surface) >= 4.5 && contrast(ink, F.surfaceHi) >= 4.5,
    `ink=${ink} surface=${f2(contrast(ink, F.surface))} surfaceHi=${f2(contrast(ink, F.surfaceHi))}`);
  check(`${tag}：高亮行墨色 vs 高亮行底 ≥ 4.5`,
    contrast(inkHi, F.surfaceHi) >= 4.5, `ink=${inkHi} c=${f2(contrast(inkHi, F.surfaceHi))}`);
  check(`${tag}：次级字色 vs 行底 ≥ 3`,
    contrast(sub, F.surface) >= 3, `sub=${sub} c=${f2(contrast(sub, F.surface))}`);
  /* 行底与卡纸必须**有区分**：浅色皮肤本来就是「白卡 + 微米色行」，
   * 只要不是同一个颜色（比值 > 1.05）就算分层成立；深色皮肤差距更大。 */
  check(`${tag}：行底与卡纸有区分（不糊成一片）`,
    contrast(F.surface, F.card) > 1.05,
    `surface=${F.surface} card=${F.card} c=${f2(contrast(F.surface, F.card))}`);
});
D.applyBgFx('classic');
D.applySkin('warm');

/* ================= C. 实画 ================= */
section('C. 实画：排行榜 / 设置页每一行都落在可读区间');

/* 手动喂一份榜单：本地没连云，不喂数据排行榜只会画「未开启云同步」 */
const ROWS = [
  { n: '刘晓飞二大爷', v: 120 }, { n: '泡泡', v: 96 }, { n: '尼西26G', v: 74 },
  { n: '小满', v: 52 }, { n: 'wayne wong', v: 41 }, { n: '木木不吃鱼', v: 28 },
  { n: '古月三金', v: 12 }
];
const mockNames = ROWS.map(r => r.n);

function drawRank(skin) {
  D.applySkin(skin);
  S.page = 'home'; S.overlay = 'rank'; S.rankTab = 0; S.rankT = 999;
  S.rankErr = ''; S.rankLoading = false;
  S.rankList = { list: ROWS.slice(0), me: { nick: D.meNick(), rank: 8 } };
  render();
}
function inkOf(s) {
  const t = rec.texts.filter(t => t.s === s);
  return t.length ? t[t.length - 1].color : null;
}

['dusk', 'warm'].forEach(skin => {
  drawRank(skin);
  const F = faces();
  const C = C0();
  /* 卡纸上的通用文字（标题 / 说明） */
  const titleInk = inkOf('排行榜');
  check(`${skin}：卡纸上的「排行榜」标题对比度 ≥ 4.5`,
    titleInk && contrast(titleInk, F.card) >= 4.5,
    `ink=${titleInk} c=${titleInk ? f2(contrast(titleInk, F.card)) : '-'}`);
  /* 页签：选中 / 未选中都要能读 */
  const tabOn = inkOf(CFG.RANK.tabs[0]), tabOff = inkOf(CFG.RANK.tabs[1]);
  check(`${skin}：选中页签字色 vs 金色底 ≥ 4`,
    tabOn && contrast(tabOn, F.gold) >= 4, `ink=${tabOn} c=${tabOn ? f2(contrast(tabOn, F.gold)) : '-'}`);
  check(`${skin}：未选中页签字色 vs 灰底 ≥ 4`,
    tabOff && contrast(tabOff, F.chip) >= 4, `ink=${tabOff} c=${tabOff ? f2(contrast(tabOff, F.chip)) : '-'}`);
  check(`${skin}：选/未选页签字色不同（状态可辨）`, tabOn && tabOff && tabOn !== tabOff,
    `${tabOn} / ${tabOff}`);

  /* 行内昵称：必须是配对字色，且 vs 行底 ≥ 4.5 */
  const bad = [];
  let seenName = 0;
  mockNames.forEach(n => {
    const ink = inkOf(n);
    if (!ink) return;
    seenName++;
    const cH = Math.max(contrast(ink, F.surface), contrast(ink, F.surfaceHi));
    if (cH < 4.5) bad.push(`${n}=${ink}(${f2(cH)})`);
  });
  check(`${skin}：${mockNames.length} 个昵称全部画出来且 ≥ 4.5:1`,
    seenName === mockNames.length && bad.length === 0, `seen=${seenName} ${bad.join(' ')}`);

  /* 名次 / 数值 */
  /* v0.65：三榜主值统一成「★N」，不再有「N 关」这种单位混排 */
  const vInk = rec.texts.filter(t => /^★\d+$/.test(t.s)).map(t => t.color);
  check(`${skin}：数值字色全部 ≥ 4.5:1`,
    vInk.length > 0 && vInk.every(c => Math.max(contrast(c, F.surface), contrast(c, F.surfaceHi),
      contrast(c, F.card)) >= 4.5),
    vInk.slice(0, 3).join(','));

  /* 深色皮肤下不许再出现「近白字 + 浅行底」这种组合 */
  if (skin === 'dusk') {
    const lightRow = D.relLum(rgb(F.surface)) > 0.6;
    const whiteInk = rec.texts.filter(t => D.relLum(rgb(t.color) || { r: 0, g: 0, b: 0 }) > 0.8);
    check('dusk：行底已变深（不再有浅米色行底）', !lightRow, `surface=${F.surface}`);
    check('dusk：浅色字只出现在深面上（无浅底白字）',
      whiteInk.every(t => Math.max(contrast(t.color, F.surface), contrast(t.color, F.card),
        contrast(t.color, F.surfaceHi)) >= 4.5),
      whiteInk.map(t => t.s + '=' + t.color).slice(0, 6).join(' '));
  }
});

/* 设置页资料卡：昵称 / 状态 / 改昵称 */
S.overlay = null; S.page = 'home';
function drawSettings(skin) {
  D.applySkin(skin);
  S.overlay = 'settings'; S.setT = 999;
  render();
}
['dusk', 'warm'].forEach(skin => {
  drawSettings(skin);
  const F = faces();
  const name = rec.texts.find(t => t.s === D.meNick());
  check(`${skin}：设置页昵称对比度 ≥ 4.5`,
    !!name && contrast(name.color, F.card) >= 4.5,
    name ? `${name.s}=${name.color} c=${f2(contrast(name.color, F.card))}` : '没找到昵称');
  const namer = rec.texts.find(t => t.s === '改昵称');
  check(`${skin}：「改昵称」对比度 ≥ 3`,
    !!namer && contrast(namer.color, F.card) >= 3,
    namer ? namer.color + ' c=' + f2(contrast(namer.color, F.card)) : '没找到');
});

/* 邀请面板的进度数字画在「轨道」上：深色皮肤的轨道是**浅半透明**，
 * 旧代码固定用 COL.textSub（浅灰）→ 深色下 1.02:1，截图里几乎看不见。 */
['dusk', 'warm'].forEach(skin => {
  D.applySkin(skin);
  S.overlay = 'invite'; S.inviteScroll = 0;
  render();
  const F = faces();
  /* 只取阶梯上的「已邀请/需要」（分母是 1~8 的一位数），别把 HUD 的 16/16 揽进来 */
  const nums = rec.texts.filter(t => /^\d{1,2}\/\d$/.test(t.s));
  check(`${skin}：邀请进度数字在轨道上可读（≥ 3:1）`,
    nums.length > 0 && nums.every(t => contrast(t.color, F.track) >= 3),
    nums.slice(0, 3).map(t => t.s + '=' + t.color + '(' + f2(contrast(t.color, F.track)) + ')').join(' ') +
    ' n=' + nums.length);
});
S.overlay = null;
D.applySkin('warm');
/* ================= D. 失败页进场分段 ================= */
section('D. 失败页：动画期不出按钮，落位后才可点');
D.setupLevel(6);
S.page = 'play'; S.fade = 1; S.pageT = 9999;
S.timeLeft = 0.004; S.save.streak = 3;
step(20);
check('超时进复活页', S.overlay === 'fail', 'overlay=' + S.overlay);

S.failT = 520; render();
const t520 = rec.texts.map(t => t.s);
check('520ms：红心 / 碎片段还在（卡片已起，内容未出）',
  t520.indexOf('时间到！') >= 0 && !t520.some(t => /看广告复活|巧币复活|忍痛放弃/.test(t)),
  t520.filter(t => /复活|放弃|连胜/.test(t)).join(','));
const hits520 = D.hitList().filter(h => /revive|give_up/.test(h.id));
check('520ms：复活按钮还没挂热区（点了不会误触）', hits520.length === 0,
  hits520.map(h => h.id).join(','));

S.failT = 1300; render();
const t1300 = rec.texts.map(t => t.s);
check('1300ms：卡片落位，连胜文案出现',
  t1300.some(t => /已经连胜 3 关了/.test(t)), t1300.filter(t => /连胜/.test(t)).join(','));
/* v0.65：文案改成「看视频复活」，巧币那只改成「币图标 + 80 · 复活」（不再有"巧币"二字） */
check('1300ms：三个出口按钮都在',
  t1300.some(t => /^看视频复活$/.test(t)) &&
  t1300.some(t => /^(\d+ · 复活|巧币不足 \d+\/\d+)$/.test(t)) &&
  t1300.some(t => t === '忍痛放弃'),
  t1300.filter(t => /复活|放弃|巧币/.test(t)).join(','));
const hits1300 = D.hitList().filter(h => /revive|give_up/.test(h.id)).map(h => h.id);
check('1300ms：热区齐全（看广告 / 巧币 / 放弃）',
  hits1300.length >= 2 && hits1300.indexOf('ad_revive') >= 0, hits1300.join(','));
check('失败卡先铺一层实色底（不透明，不透关卡虚线）',
  rec.fills.some(f => /^rgb\(\d+,\d+,\d+\)$/.test(f)), rec.fills.filter(f => /^rgb\(/.test(f)).slice(0, 3).join(' '));

S.failT = 0; render();
check('0ms：红闪 + 碎片 + 横幅同时在画（失败瞬间就有反馈）',
  rec.texts.some(t => t.s === '时间到！'), 'texts=' + rec.texts.length);
S.reduceMotion = true; render();
check('reduceMotion：直接静态版，按钮立刻可点',
  rec.texts.some(t => /^看视频复活$/.test(t.s)) && D.hitList().some(h => h.id === 'ad_revive'),
  rec.texts.length + ' texts');
S.reduceMotion = false;
S.overlay = null; S.page = 'home';

/* ================= E. 源码约束 ================= */
section('E. 源码：面 / 字成对，缺口要么堵上要么标出来');
const coreSrc = fs.readFileSync(path.join(ROOT, 'js/core.js'), 'utf8');
const odc = fs.readFileSync(path.join(ROOT, 'miniprogram/openDataContext/index.js'), 'utf8');
{
  /* darkSkin 只允许出现在 refreshPalette 里（它是「皮肤是不是深色」的原始标记），
   * 任何组件分支都必须走 darkUi —— 否则 stars/nebula 特效就漏了。 */
  const from = coreSrc.indexOf('function refreshPalette');
  const to = coreSrc.indexOf('function applySkin');
  const outside = coreSrc.slice(0, from) + coreSrc.slice(to);
  const leak = outside.match(/state\.darkSkin/g) || [];
  check('state.darkSkin 只在 refreshPalette 内出现（组件一律走 darkUi）',
    from > 0 && to > from && leak.length === 0, 'leak=' + leak.length);
}
check('state.darkUi = 深色皮肤 || 深色背景特效',
  /state\.darkUi = !!\(state\.darkSkin \|\| state\.darkFx\)/.test(coreSrc));
check('rankRow 昵称不再直接吃 COL.text',
  /* v0.65：行高从 74 收到 68，昵称改成「名字 + 副信息」两行，用 textFit 收长度 */
  /textFit\(item\.n, x0 \+ 128, y - 11, 22, rowInk/.test(coreSrc) &&
  !/text\(item\.n, [^,]+, [^,]+, 2\d, COL\.text[,)]/.test(coreSrc));
check('开放数据域也用同一套配对字色',
  /rowText: '#2C3A4B'/.test(odc) && /rowSub: '#4E5E72'/.test(odc) &&
  /K\.rowText/.test(odc) && /K\.rowSub/.test(odc));
check('主域把 rowText / rowSub 传给开放数据域',
  /rowText: COL\.textOnSurface/.test(coreSrc) && /rowSub: COL\.textOnChip/.test(coreSrc));
check('失败页的「已经连胜」包在 contentA 里（心飞到位后再淡入）',
  /if \(contentA > 0\)/.test(coreSrc));

console.log('\n' + (fail === 0 ? `v0.49 深色字色 / 失败动画验收全部通过（${total} 项）`
  : `!! ${fail}/${total} 项未通过`));
process.exit(fail === 0 ? 0 : 1);
