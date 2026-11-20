/* v0.7 专项验收：HUD 胶囊框 / 设置下移 / 体力成本 2 / BGM 音量再提一档
 * 用法：node tools/verify_v07.js
 * 说明：音频仍只验证「增益数值 + 限幅存在」，实际响度需真机听。
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

/* ---------- 记录型 ctx：能抓到 fillText 的字符串 / 字体 / 填充色 ---------- */
const rec = { texts: [], strokes: [], fills: [], font: '' };
function makeCtx() {
  const grad = { addColorStop() {} };
  const base = {
    canvas: { width: 0, height: 0, style: {} },
    measureText: () => ({ width: 40 }),
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
    createPattern: () => null,
    fillText(s, x, y) { rec.texts.push({ s: String(s), x, y, font: base.font, color: base.fillStyle }); },
    stroke() { rec.strokes.push(base.strokeStyle); },
    fill() { rec.fills.push(base.fillStyle); },
    save() {}, restore() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {},
    arc() {}, arcTo() {}, bezierCurveTo() {}, quadraticCurveTo() {}, rect() {},
    translate() {}, rotate() {}, scale() {}, clip() {}, drawImage() {},
    setTransform() {}, clearRect() {}, fillRect() {}, strokeRect() {}, ellipse() {},
    setLineDash() {}, getImageData: () => ({ data: [0, 0, 0, 0] }), putImageData() {}
  };
  return new Proxy(base, {
    get(t, k) { return k in t ? t[k] : () => {}; },
    set(t, k, v) { if (k === 'font') rec.font = v; t[k] = v; return true; }
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

const store = {};
const env = {
  ctx: makeCtx(),
  size: () => ({ w: 375, h: 812 }),
  dpr: () => 3,
  safeInsets: () => ({ top: 20, bottom: 0 }),
  bindInput(fn) { this._in = fn; },
  storage: { get: k => (k in store ? store[k] : null), set: (k, v) => { store[k] = v; } },
  audio: {
    unlock() {}, setEnabled() {}, play() {}, duck() {}, setVisible() {}, setScene() {}
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

const scale = Math.min(375 / CFG.DESIGN.w, 812 / CFG.DESIGN.h);
const ox = (375 - CFG.DESIGN.w * scale) / 2;
const oy = (812 - CFG.DESIGN.h * scale) / 2;
const css = (dx, dy) => [ox + dx * scale, oy + dy * scale];
function tap(dx, dy) {
  const p = css(dx, dy);
  env._in('down', p[0], p[1]); step(16);
  env._in('up', p[0], p[1]); step(16);
}
function renderHomeClean() {
  rec.texts.length = 0; rec.strokes.length = 0; rec.fills.length = 0;
  S.page = 'home';
  for (let i = 0; i < 3; i++) step(16);
}

/* ---------- 1. 版本 ---------- */
section('1. 版本');
/* v0.7.1 起版本号带补丁位（胶囊等长修正），断言放宽到 v0.7.x */
check('版本号 v0.7.x', /^v0\.7(\.\d+)?$/.test(CFG.version), CFG.version);

/* ---------- 2. HUD 胶囊 ---------- */
section('2. HUD：上移 + 同字号 + 底框描边');
const HU = CFG.LAYOUT.HUD;
check('HUD 版式进配置', !!HU && typeof HU.y0 === 'number');
const v06Y0 = 58;
check('巧币行比 v0.6 上移', HU.y0 < v06Y0, `y0=${HU.y0}（v0.6=${v06Y0}，上移 ${v06Y0 - HU.y0}px）`);
const pillTop = HU.y0 - HU.pillH / 2;
check('胶囊顶仍在安全区内', pillTop >= 6, `距安全区顶 ${pillTop.toFixed(1)}px`);
const coinCenter = CFG.SAFE.top + HU.y0;
const energyCenter = coinCenter + HU.rowGap;
check('两行不重叠', HU.rowGap >= HU.pillH + 6, `间距 ${HU.rowGap} / 胶囊高 ${HU.pillH}`);

renderHomeClean();
const coinTxt = rec.texts.find(r => r.s === String(S.save.coin));
const energyTxt = rec.texts.find(r => r.s === S.save.energy + '/' + S.save.energyMax);
check('巧币数字已绘制', !!coinTxt, coinTxt ? `y=${coinTxt.y}` : 'missing');
check('体力数字已绘制', !!energyTxt, energyTxt ? `y=${energyTxt.y}` : 'missing');
check('两行字号完全一致', coinTxt && energyTxt && coinTxt.font === energyTxt.font,
  (coinTxt && coinTxt.font) + ' vs ' + (energyTxt && energyTxt.font));
check('字号 = 配置值 30', coinTxt && coinTxt.font.indexOf('30px') >= 0, coinTxt && coinTxt.font);
check('两行都是白字', coinTxt && energyTxt && coinTxt.color === '#FFFFFF' && energyTxt.color === '#FFFFFF',
  (coinTxt && coinTxt.color) + '/' + (energyTxt && energyTxt.color));
check('胶囊描边已绘制（两行各一次）',
  rec.strokes.filter(c => c === HU.pillStroke).length >= 2,
  '命中 ' + rec.strokes.filter(c => c === HU.pillStroke).length + ' 次');
check('胶囊填充已绘制',
  rec.fills.filter(c => c === HU.pillFill).length >= 2,
  '命中 ' + rec.fills.filter(c => c === HU.pillFill).length + ' 次');
const coreTxt = fs.readFileSync(path.join(ROOT, 'js/core.js'), 'utf8');
check('旧的 32px/26px 硬编码已移除',
  !/text\(String\(state\.save\.coin \|\| 0\), 114, hy, 32/.test(coreTxt) &&
  !/state\.save\.energyMax, 114, ey, 26/.test(coreTxt));

/* ---------- 2b. 两行胶囊等长（v0.7.1） ---------- */
section('2b. 巧币 / 体力胶囊等长');
check('配置有 pillMinW', typeof HU.pillMinW === 'number' && HU.pillMinW >= 150, 'pillMinW=' + HU.pillMinW);
check('两行共用同一个 pillW（取两行文字所需宽度较大值）',
  /var pillW = Math\.max\(pwCoin, pwEnergy, HU\.pillMinW\)/.test(coreTxt));
/* hudPill 调用只传 5 个参数（不再各自传 padRight）→ 两行必然同宽 */
const pillCalls = (coreTxt.match(/hudPill\('(?:coin|energy)'[^;]*;/g) || []);
check('两条胶囊绘制调用参数一致（各 5 个）',
  pillCalls.length === 2 && pillCalls.every(c => c.split(',').length === 5),
  pillCalls.map(c => c.replace(/\s+/g, ' ').slice(0, 46)).join(' | '));
/* 像素复核：最新主页截图里巧币胶囊的深色填充宽度应 ≈ pillMinW */
const shotFile = path.join(ROOT, 'tools/out/v07_home_750.png');
if (fs.existsSync(shotFile)) {
  const { readPng, at } = require(path.join(ROOT, 'tools/png'));
  const img = readPng(shotFile);
  const dark = (x, y) => { const p = at(img, x, y); return p[0] < 105 && p[1] < 115 && p[2] < 125; };
  let best = { len: -1 };
  for (let y = 60; y < 158; y++) {
    let f = -1, l = -1;
    for (let x = 50; x < 340; x++) if (dark(x, y)) { if (f < 0) f = x; l = x; }
    if (f > 0 && l - f > best.len) best = { len: l - f, f, l, y };
  }
  /* 左端从 iconX+pillDx 起算（图标压在胶囊左端外侧，深色填充会被图标吃掉几像素） */
  const leftEdge = HU.iconX + HU.pillDx;
  const measured = best.l - leftEdge + 1;
  check('巧币胶囊实测宽度 ≈ pillMinW', Math.abs(measured - HU.pillMinW) <= 8,
    `实测 ${measured}px（x ${leftEdge}→${best.l}） / 配置 ${HU.pillMinW}px`);
} else {
  check('像素复核（缺少截图，跳过）', true, shotFile + ' 不存在');
}

/* ---------- 3. 设置下移 ---------- */
section('3. 设置按钮从右上角挪到右列');
const H = CFG.LAYOUT.HOME;
const gearX = CFG.DESIGN.w - H.entryX;
const gearY = H.entryY0 + H.entryGap * 3;
renderHomeClean();
tap(CFG.DESIGN.w - 70, CFG.SAFE.top + 40);      // 旧的右上角位置
for (let i = 0; i < 3; i++) step(16);
check('点旧右上角不再弹出设置', S.overlay === null, 'overlay=' + S.overlay);
check('设置落在页面中段', gearY > 700 && gearY < CFG.DESIGN.h * 0.62, 'y=' + gearY + '（页面 ' + CFG.DESIGN.h + '）');
tap(gearX, gearY);
for (let i = 0; i < 3; i++) step(16);
check('点右列齿轮 → 打开设置', S.overlay === 'settings', 'overlay=' + S.overlay);
game._debug.fireBtn('close_settings');
for (let i = 0; i < 3; i++) step(16);

/* ---------- 4. 体力成本 2 ---------- */
section('4. 每进一关扣 2 点体力');
check('配置值 = 2', CFG.ECON.energyCostLevel === 2, 'cost=' + CFG.ECON.energyCostLevel);
S.save.energy = 8; S.save.energyTs = Date.now();
const before = S.save.energy;
game._debug.fireBtn('start');
check('进关扣 2 点', S.save.energy === before - 2, before + ' → ' + S.save.energy);
check('已进入对局', S.page === 'play', S.page);
check('体力不足时进不去（1 点被拦）', (function () {
  S.page = 'home'; S.overlay = null; S.save.energy = 1; S.save.energyTs = Date.now();
  for (let i = 0; i < 3; i++) step(16);
  game._debug.fireBtn('start');
  return S.page === 'home' && S.overlay === 'energy';
})(), 'page=' + S.page + ' overlay=' + S.overlay);

/* ---------- 5. BGM 音量 ---------- */
section('5. BGM 音量再提一档');
const NG = CFG.AUDIO.bgmNote;
const mixPeak = NG.lead + NG.root;
const mixDb = 20 * Math.log10(mixPeak * CFG.AUDIO.bgmVolume);
const v06Peak = 0.078 + 0.052;
const v06Db = 20 * Math.log10(v06Peak * 1.0);
check('主旋律增益 ≥ 0.25', NG.lead >= 0.25, 'lead=' + NG.lead);
check('叠加峰值进入 -8dBFS 以内', mixDb >= -8.5, `peak=${mixPeak.toFixed(3)}（${mixDb.toFixed(1)} dBFS）`);
check('比 v0.6 至少响 8dB', mixDb - v06Db >= 8, `v0.6=${v06Db.toFixed(1)} → ${mixDb.toFixed(1)}（+${(mixDb - v06Db).toFixed(1)}dB）`);
for (const file of ['preview/js/game.js', 'miniprogram/game.js']) {
  const t = fs.readFileSync(path.join(ROOT, file), 'utf8');
  check(`${file} 有软限幅`, /createDynamicsCompressor/.test(t) && /bgmGain\.connect\(bgmBus\)/.test(t));
  check(`${file} 增益读配置`, /bgmNote/.test(t));
}

/* ---------- 6. 三端一致性 ---------- */
section('6. 三端模块一致');
const md5 = f => require('crypto').createHash('md5').update(fs.readFileSync(path.join(ROOT, f))).digest('hex');
for (const f of ['config', 'core', 'judge', 'geom', 'levels']) {
  const set = new Set(['js', 'preview/js', 'miniprogram/js'].map(d => md5(`${d}/${f}.js`)));
  check(`${f}.js 三端一致`, set.size === 1, [...set][0].slice(0, 8));
}

console.log(fail === 0 ? '\n全部通过' : `\n!! ${fail} 项未通过`);
process.exit(fail === 0 ? 0 : 1);
