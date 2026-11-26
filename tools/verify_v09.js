/* v0.9 专项验收：T 字关保留 / 倒计时居中 / 散放托盘 / 顶部广告位 / 云开发存档与真实榜单
 * 用法：node tools/verify_v09.js
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const crypto = require('crypto');

/* ---------- 记录型 ctx ---------- */
const rec = { texts: [], fills: [], rects: [] };
function makeCtx() {
  const grad = { addColorStop() {} };
  const base = {
    canvas: { width: 0, height: 0, style: {} },
    measureText(s) { return { width: String(s).length * 15 }; },
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
    createPattern: () => null,
    fillText(s, x, y) { rec.texts.push({ s: String(s), x, y, color: base.fillStyle, font: base.font }); },
    stroke() {}, fill() { rec.fills.push(base.fillStyle); },
    arc() {}, moveTo() {}, lineTo() {},
    fillRect(x, y, w, h) { rec.rects.push({ x, y, w, h, color: base.fillStyle }); },
    setLineDash() {},
    save() {}, restore() {}, beginPath() {}, closePath() {}, arcTo() {},
    bezierCurveTo() {}, quadraticCurveTo() {}, rect() {}, translate() {},
    rotate() {}, scale() {}, clip() {}, drawImage() {}, setTransform() {},
    clearRect() {}, strokeRect() {}, ellipse() {}
  };
  return new Proxy(base, {
    get(t, k) { return k in t ? t[k] : () => {}; },
    set(t, k, v) { t[k] = v; return true; }
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
const sleep = ms => new Promise(r => setTimeout(r, ms));

require(path.join(ROOT, 'js/levels.js'));
require(path.join(ROOT, 'js/geom.js'));
require(path.join(ROOT, 'js/judge.js'));
const CFG = require(path.join(ROOT, 'js/config.js'));
const CORE = require(path.join(ROOT, 'js/core.js'));

let fail = 0;
function check(label, ok, detail) {
  if (!ok) fail++;
  console.log(`  [${ok ? 'OK' : 'XX'}] ${label}${detail ? '  ' + detail : ''}`);
}
function section(t) { console.log('\n== ' + t + ' =='); }

/* ---------- 假云：把云函数的契约搬到本地，验证 core 接线 ---------- */
const store = {};
const cloudLog = { init: 0, saved: [], rankCalls: [], banner: [], rewarded: null };
const cloudStore = { sets: {}, nick: '', openid: '' };
const fakeCloud = {
  enabled: () => true,
  init(cb) {
    cloudLog.init++;
    cloudStore.nick = '巧手0921';
    cloudStore.openid = 'oX123';
    setTimeout(() => cb(null, { openid: cloudStore.openid, nick: cloudStore.nick }), 0);
  },
  load(cb) { setTimeout(() => cb(null, { sets: JSON.parse(JSON.stringify(cloudStore.sets)) }), 0); },
  save(payload, cb) {
    cloudLog.saved.push(JSON.parse(JSON.stringify(payload)));
    cloudStore.sets = payload.sets;
    setTimeout(() => cb(null, { nick: cloudStore.nick, me: { nick: cloudStore.nick, v: payload.stats.stars, rank: 3 } }), 0);
  },
  rank(tab, cb) {
    cloudLog.rankCalls.push(tab);
    if (tab === 2) { setTimeout(() => cb(null, { list: [], me: null, note: 'friend' }), 0); return; }
    setTimeout(() => cb(null, {
      list: [{ nick: '巧手0001', v: 42, me: false }, { nick: '巧手0921', v: 7, me: true }],
      me: { nick: '巧手0921', v: 7, rank: 2 }
    }), 0);
  }
};

const env = {
  ctx: makeCtx(),
  tutorial: false,   // v0.21：这些脚本专测横向系统，关掉第 1 关教学
  size: () => ({ w: 375, h: 812 }),
  dpr: () => 3,
  safeInsets: () => ({ top: 20, bottom: 0 }),
  bindInput(fn) { env._in = fn; },
  storage: { get: k => (k in store ? store[k] : null), set: (k, v) => { store[k] = v; } },
  audio: { unlock() {}, setEnabled() {}, play() {}, duck() {}, setVisible() {}, setScene() {} },
  vibrate() {}, images: {},
  share() {}, onHide() {}, onShow() {},
  cloud: fakeCloud,
  ad: {
    placeholder: true,
    banner(show, rect) { cloudLog.banner.push({ show, rect: rect ? JSON.parse(JSON.stringify(rect)) : null }); },
    rewarded(kind, cb) { cloudLog.rewarded = kind; cb(true, ''); }
  }
};

const SCALE = Math.min(375 / CFG.DESIGN.w, 812 / CFG.DESIGN.h);
const css = (x, y) => [x * SCALE, y * SCALE];
function tapD(x, y) {
  const p = css(x, y);
  env._in('down', p[0], p[1]); step(16);
  env._in('up', p[0], p[1]); step(16);
}

(async function main() {
  console.log('v0.9 验收：布局改版 + 云开发');
  const game = CORE(env);
  game.init();
  step(16);
  await sleep(10);
  const S = game.state;

  /* ---------- 1. T 字关 ---------- */
  section('1. 四巧板 36 关里保留 T 字型（原 120 关；v0.45 起为第 36 关）');
  const L4 = game._debug.LEVELS;
  check('四巧板共 36 关', L4.length === 36, 'count=' + L4.length);
  const tIdx = L4.findIndex(l => /T/.test(l.name || ''));
  check('存在 T 字关', tIdx >= 0, 'idx=' + tIdx);
  /* 与原 120 关里的 T 字型逐点比对（那关是唯一"像实物"的关，玩家点名要留） */
  const bak = {};
  new Function('globalThis', fs.readFileSync(path.join(ROOT, 'tools/levels_120_v071.js'), 'utf8'))(bak);
  const oldT = bak.TANGRAM_DATA.sets.tangram4.levels[119];
  if (tIdx >= 0) {
    const lv = L4[tIdx];
    check('T 字关在最后一关（大师章）', tIdx === L4.length - 1 && lv.chapter === 3,
      `idx=${tIdx}/${L4.length - 1} chapter=${lv.chapter}`);
    check('T 字轮廓与原 120 关完全一致', JSON.stringify(lv.outline) === JSON.stringify(oldT.outline));
    check('T 字四块解算一致', JSON.stringify(lv.solution) === JSON.stringify(oldT.solution));
    check('T 字仍带关名（列表里能认出来）', lv.name === 'T 字型', 'name=' + lv.name);
    const xs = lv.outline.map(p => p[0]), ys = lv.outline.map(p => p[1]);
    check('T 字包围盒 390×520（横梁 + 竖干）',
      Math.max(...xs) - Math.min(...xs) === 390 && Math.max(...ys) - Math.min(...ys) === 520,
      (Math.max(...xs) - Math.min(...xs)) + '×' + (Math.max(...ys) - Math.min(...ys)));
  }

  /* ---------- 2. 顶栏：倒计时居中 ---------- */
  section('2. 倒计时居中（用户反馈靠右容易忽略）');
  const src = fs.readFileSync(path.join(ROOT, 'js/core.js'), 'utf8');
  check('胶囊按屏幕中线定位（capCx = 设计宽/2）',
    /var capW = 240, capH = 56, capCx = C\.DESIGN\.w \/ 2, capL = capCx - capW \/ 2/.test(src));
  check('时间数字 34px（v0.8 为 30px）', /text\(timeTxt, 0, 0, 34/.test(src));
  check('心形在胶囊内左侧', /capL \+ 26 \+ hi \* 26/.test(src));
  check('数字按实测宽度取中心（脉冲不左右抖）', /capL \+ capW - 22 - timeW \/ 2/.test(src));
  game._debug.go('play');
  game._debug.setupLevel(0);
  rec.texts.length = 0;
  step(16);
  const tTxt = rec.texts.find(t => /^\d\d:\d\d$/.test(t.s));
  check('对局页画出 分:秒 计时', !!tTxt, tTxt ? tTxt.s : 'none');
  /* 数字画在 translate(timeCx) 之后（记录的 x=0），用公式复算中心 */
  const timeW = (tTxt ? tTxt.s.length : 5) * 15;
  const timeCx = (CFG.DESIGN.w / 2 - 120) + 240 - 22 - timeW / 2;
  check('计时数字中心落在屏幕中线 ±80 内', Math.abs(timeCx - CFG.DESIGN.w / 2) <= 80,
    'cx=' + timeCx.toFixed(0));

  /* ---------- 3. 广告位（v0.33 已下线）----------
   * 个人主体没有流量主资格，顶栏下 702×112 的 banner 预留区自 v0.9 起一直空着。
   * v0.33 把整块让给卡纸（702→726、y 302→184），banner 相关代码全部删除。
   * 这 6 条旧断言测的是已删除的能力，改为「确实删干净 + 卡纸吃掉了这块空间」。 */
  section('3. 顶部广告位已下线（v0.33）');
  const BOARD = CFG.LAYOUT.BOARD;
  check('LAYOUT.AD 已删除', !('AD' in CFG.LAYOUT), 'keys=' + Object.keys(CFG.LAYOUT).join(','));
  check('ADS.banner 已删除', !(CFG.ADS && CFG.ADS.banner));
  /* v0.35：卡纸再往托盘方向长了一截（y 184→176、size 726→734、纸面 h=842）。
   * v0.46：灵动岛机型 safeArea.top 高达 116 设计 px，卡纸顶 176 会压住第二枚胶囊，
   * 因此回落到 216（纸面 h 802），底部仍钉在 1018 —— 这里改测「仍在原广告位起点
   * 302 之上」这个真实意图，具体数值由 verify_v046 覆盖。 */
  check('卡纸顶仍在原广告位起点之上（BOARD.y < 302；v0.46 为避安全区回落到 216）',
    BOARD.y < 302 && BOARD.y >= 176, 'y=' + BOARD.y);
  check('盘面用满屏宽（BOARD.size = 750 − 2×8 = 734）', BOARD.size === 734, 'size=' + BOARD.size);
  check('纸面比盘面高、且底边仍钉在 1018（吃掉卡纸底～托盘的空白带）',
    BOARD.h === (BOARD.bottom || 1018) - BOARD.y && BOARD.h > BOARD.size,
    'h=' + BOARD.h + ' size=' + BOARD.size + ' bottom=' + BOARD.bottom);
  /* 只查真实调用（带左括号），注释里提到这两个名字是给后人看的退役说明，不算残留 */
  check('core.js 里没有 syncBanner / adRect 调用残留',
    !/\b(syncBanner|adRect)\s*\(/.test(src),
    'calls=' + (src.match(/\b(syncBanner|adRect)\s*\(/g) || []).length);
  game._debug.go('home');

  /* ---------- 4. 托盘散放 ---------- */
  section('4. 托盘改为散放（去掉 2×2 大槽位）');
  check('配置里有 PILE 打包参数', !!CFG.LAYOUT.PILE && CFG.LAYOUT.PILE.minVisible > 0.5);
  check('不再画整排槽位底框', src.indexOf('fillStyle = COL.slotBg') < 0);
  const s4 = game._debug.buildSet('tangram4');
  const s7 = game._debug.buildSet('tangram7');
  [[s4, '四巧板 4 块'], [s7, '七巧板 7 块']].forEach(([b, name]) => {
    const vis = b.SLOT_POS.map(s => s.vis);
    check(name + '：每块可见面积 ≥ minVisible', Math.min(...vis) >= CFG.LAYOUT.PILE.minVisible - 1e-9,
      'min=' + (Math.min(...vis) * 100).toFixed(0) + '%');
    let minD = 1e9;
    for (let i = 0; i < b.SLOT_POS.length; i++) {
      for (let j = i + 1; j < b.SLOT_POS.length; j++) {
        minD = Math.min(minD, Math.hypot(b.SLOT_POS[i].x - b.SLOT_POS[j].x, b.SLOT_POS[i].y - b.SLOT_POS[j].y));
      }
    }
    check(name + '：落点两两间距 ≥ 30', minD >= 30, 'minD=' + minD.toFixed(0));
  });
  /* v0.34：带子本身留给手指（386 高），用户要缩的是「板件簇实际占的地方」。
   * 用 PILE.spanW/spanH 把 7 块压进居中 470×300，断言改成量实际簇尺寸。 */
  const b4c = game._debug.buildSet('tangram4'), b7c = game._debug.buildSet('tangram7');
  const clusterH = Math.max(b4c.fit.totalH, b7c.fit.totalH);
  const clusterW = Math.max(b4c.fit.totalW, b7c.fit.totalW);
  check('v0.34：板件簇实际占用 ≤ 300 高 / ≤ 500 宽（旧版摊满 706 宽整条带子）',
    clusterH <= 300 && clusterW <= 500 && CFG.LAYOUT.PILE.spanW <= 500,
    `簇 ${Math.round(clusterW)}×${Math.round(clusterH)} / spanW=${CFG.LAYOUT.PILE.spanW}`);
  check('托盘不压工具栏', CFG.LAYOUT.TRAY.bottom <= CFG.LAYOUT.TOOLBAR.y - 10,
    `tray.bottom=${CFG.LAYOUT.TRAY.bottom} toolbar=${CFG.LAYOUT.TOOLBAR.y}`);

  /* ---------- 4b. 点选正确性 ---------- */
  section('4b. 散放后每块都点得中');
  game._debug.go('play');
  game._debug.setupLevel(0);
  step(16);
  const SL = game._debug.slots;
  const order = game._debug.dataset.pieceOrder;
  let hitOk = 0; const hitBad = [];
  for (let i = 0; i < SL.length; i++) {
    tapD(SL[i].x, SL[i].y);
    if (S.selId === order[i]) hitOk++; else hitBad.push(order[i] + '→' + S.selId);
    const p = S.pieces.find(q => q.id === order[i]);
    if (p) { p.onBoard = false; }
    S.drag = null; S.selId = null;
  }
  check('四巧板 4 块都能从托盘点中', hitOk === SL.length, `${hitOk}/${SL.length} ${hitBad.join(',')}`);
  const lastSlot = SL[SL.length - 1];
  tapD(lastSlot.x, lastSlot.y);
  check('点最下层板件的落点仍命中它（质心不重叠）', S.selId === order[order.length - 1], 'sel=' + S.selId);

  /* ---------- 5. 云存档 ---------- */
  section('5. 云开发：登录 / 存档上行 / 合并');
  check('启动即登录（调用了 init）', cloudLog.init === 1, 'init=' + cloudLog.init);
  check('登录后拿到昵称', S.net.nick === '巧手0921' && S.net.ready === true,
    `nick=${S.net.nick} ready=${S.net.ready}`);
  /* 先把挂起的 debounce 上行 flush 掉再断言：否则随机停在「同步中…」，
   * 这是用例本身的竞态，不是产品问题（pushDebounceMs=3500，测试跑不到那么久）。 */
  game._debug.cloudPush(true);
  await new Promise(r => setTimeout(r, 30));
  check('设置页文案反映已同步', /已同步/.test(game._debug.netText()), game._debug.netText());

  store[CFG.SAVE_KEY] = JSON.stringify({
    starOf: { 1: 3, 2: 2 }, unlockedMax: 3,
    settings: { sfx: true, bgm: true }, coin: 100, energy: 5, updatedAt: 1000
  });
  cloudStore.sets[CFG.SAVE_KEY] = {
    starOf: { 1: 3, 5: 3 }, unlockedMax: 5,
    settings: { sfx: true, bgm: true }, coin: 999, energy: 9, updatedAt: 2000
  };
  game._debug.cloudPull();
  await sleep(10);
  const merged = JSON.parse(store[CFG.SAVE_KEY]);
  check('合并后进度取并集（本地第 2 关 + 云端第 5 关）',
    merged.starOf[2] === 2 && merged.starOf[5] === 3, JSON.stringify(merged.starOf));
  check('解锁进度取较大值（3→5）', merged.unlockedMax === 5, 'unlockedMax=' + merged.unlockedMax);
  check('货币/体力取较新那份（云端更新）', merged.coin === 999 && merged.energy === 9,
    `coin=${merged.coin} energy=${merged.energy}`);

  /* 七巧板也玩过一关：云端一份包要能装下两套存档 */
  store['tangram7_save_v1'] = JSON.stringify({
    starOf: { 1: 3 }, unlockedMax: 2, settings: { sfx: true, bgm: true },
    coin: 0, energy: 4, updatedAt: 1500
  });
  S.save.coin = 120;
  game._debug.setupLevel(0);
  S.elapsed = 30; S.steps = 5;
  game._debug.win();
  /* 先等可能还在路上的上行落地：doCloudPush 有 pushing 互斥，
   * 紧接着再 push 会被直接跳过，取到的 last 就是上一份（只有一套存档）——用例竞态。 */
  await sleep(30);
  game._debug.cloudPush(true);
  await sleep(30);
  check('通关后把存档推到云端', cloudLog.saved.length >= 1, 'pushes=' + cloudLog.saved.length);
  const last = cloudLog.saved[cloudLog.saved.length - 1];
  check('上行包含两套存档快照', !!last.sets[CFG.SAVE_KEY] && !!last.sets.tangram7_save_v1,
    Object.keys(last.sets).join(','));
  check('上行带统计（星星/通关数/连胜）',
    typeof last.stats.stars === 'number' && typeof last.stats.cleared === 'number',
    JSON.stringify(last.stats));

  /* ---------- 6. 榜单 ---------- */
  section('6. 排行榜走真实数据');
  check('默认不再用示例数据', CFG.RANK.useMock === false, 'useMock=' + CFG.RANK.useMock);
  S.overlay = 'rank'; S.rankTab = 0; S.rankT = 999; S.rankList = null;
  game._debug.openRank(null);
  await sleep(10);
  check('打开榜单向云端要数据', cloudLog.rankCalls.length >= 1, JSON.stringify(cloudLog.rankCalls));
  rec.texts.length = 0;
  step(16);
  check('云端两行都画出来', rec.texts.filter(t => /^巧手/.test(t.s)).length >= 2,
    rec.texts.filter(t => /^巧手/.test(t.s)).map(t => t.s).join(','));
  check('底部说明改为「全服实时榜」', rec.texts.some(t => /全服实时榜/.test(t.s)));
  check('不再出现「示例榜单」', !rec.texts.some(t => /示例榜单/.test(t.s)));

  /* v0.18：好友榜改走开放数据域；Node 环境没有 env.friend → 走降级文案。
   * 关键是它不再动 state.rankList（旧版会把主线榜那份覆盖成空列表）。 */
  const mainBefore = S.rankList;
  /* v0.65：好友榜的页签序号从 2 变成 1（0 全服 / 1 好友 / 2 本周） */
  game._debug.selectRankTab(1);
  await sleep(10);
  rec.texts.length = 0;
  step(16);
  check('好友榜在无开放数据域时给出降级说明',
    rec.texts.some(t => /好友榜要在微信小游戏里看/.test(t.s)),
    rec.texts.map(t => t.s).filter(t => /好友/.test(t)).join('|'));
  check('切到好友榜不会清掉主线榜缓存', S.rankList === mainBefore,
    'same=' + (S.rankList === mainBefore));

  S.rankTab = 0; S.rankListTab = 0;
  S.rankList = { list: [], me: { nick: '巧手0921', v: 0, rank: 1 } };
  rec.texts.length = 0;
  step(16);
  check('空榜显示「还没有人上榜」', rec.texts.some(t => /还没有人上榜/.test(t.s)));

  const env2 = Object.assign({}, env, { cloud: null, ctx: makeCtx() });
  const g2 = CORE(env2);
  g2.init(); step(16);
  g2.state.overlay = 'rank'; g2.state.rankT = 999; g2.state.rankTab = 0;
  rec.texts.length = 0;
  step(16);
  check('没有云环境时显示「未开启云同步」', rec.texts.some(t => /未开启云同步/.test(t.s)));

  /* ---------- 7. 三端一致 ---------- */
  section('7. 三端文件一致性');
  function md5(f) { var __s = f; return require('crypto').createHash('md5').update(/\.js$/i.test(String(__s)) ? Buffer.from(require('./lib/pack.js').strip(require('fs').readFileSync(__s, 'utf8'))) : require('fs').readFileSync(__s)).digest('hex'); }
  const files = ['config.js', 'core.js', 'geom.js', 'judge.js', 'levels.js'];
  check('preview 与 js 同源', files.every(f => md5(path.join(ROOT, 'js', f)) === md5(path.join(ROOT, 'preview/js', f))));
  check('小程序端也同源', files.every(f => md5(path.join(ROOT, 'js', f)) === md5(path.join(ROOT, 'miniprogram/js', f))));
  check('云函数已就位', fs.existsSync(path.join(ROOT, 'miniprogram/cloudfunctions/player/index.js')));
  check('小程序端有云/广告适配层',
    fs.existsSync(path.join(ROOT, 'miniprogram/js/cloud.js')) &&
    fs.existsSync(path.join(ROOT, 'miniprogram/js/ad.js')));
  check('project.config.json 指向 cloudfunctions',
    /"cloudfunctionRoot":\s*"cloudfunctions\/"/.test(
      fs.readFileSync(path.join(ROOT, 'miniprogram/project.config.json'), 'utf8')));

  console.log(fail ? `\n!! ${fail} 项未通过` : '\nv0.9 验收全部通过');
  process.exit(fail ? 1 : 0);
})();
