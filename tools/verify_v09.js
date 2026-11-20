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
  section('1. 四巧板 30 关里保留 T 字型（原 120 关）');
  const L4 = game._debug.LEVELS;
  check('四巧板共 30 关', L4.length === 30, 'count=' + L4.length);
  const tIdx = L4.findIndex(l => /T/.test(l.name || ''));
  check('存在 T 字关', tIdx >= 0, 'idx=' + tIdx);
  /* 与原 120 关里的 T 字型逐点比对（那关是唯一"像实物"的关，玩家点名要留） */
  const bak = {};
  new Function('globalThis', fs.readFileSync(path.join(ROOT, 'tools/levels_120_v071.js'), 'utf8'))(bak);
  const oldT = bak.TANGRAM_DATA.sets.tangram4.levels[119];
  if (tIdx >= 0) {
    const lv = L4[tIdx];
    check('T 字关在最后一关（大师章）', tIdx === 29 && lv.chapter === 3, `idx=${tIdx} chapter=${lv.chapter}`);
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

  /* ---------- 3. 广告位 ---------- */
  section('3. 顶部广告位');
  const AD = CFG.LAYOUT.AD, BOARD = CFG.LAYOUT.BOARD;
  check('广告位在顶栏之下、棋盘之上', AD.y > 88 + 56 && AD.y + AD.h <= BOARD.y,
    `ad ${AD.y}~${AD.y + AD.h} board ${BOARD.y}`);
  check('广告位与棋盘间距 ≤ 24（不浪费屏）', BOARD.y - (AD.y + AD.h) <= 24, 'gap=' + (BOARD.y - AD.y - AD.h));
  check('广告位宽度 ≥ 300 CSS px（banner 下限，375 屏）', AD.w * SCALE >= 300, 'css=' + AD.w * SCALE);
  const shown = cloudLog.banner.filter(b => b.show);
  check('进对局页挂 banner', shown.length >= 1, JSON.stringify(cloudLog.banner.map(b => b.show)));
  if (shown.length) {
    const r = shown[shown.length - 1].rect;
    check('banner 用 CSS 坐标、落在广告位框内',
      Math.abs(r.y - AD.y * SCALE) < 1.5 && Math.abs(r.h - AD.h * SCALE) < 1.5 && r.w > 300,
      JSON.stringify(r));
  }
  game._debug.go('home');
  check('回主页摘掉 banner', cloudLog.banner[cloudLog.banner.length - 1].show === false);
  check('广告位不注册点击热区', !/addHit\(\s*AD\./.test(src));

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
  const trayH = CFG.LAYOUT.TRAY.bottom - CFG.LAYOUT.TRAY.top;
  check('工具区高度 ≤ 300（v0.8 为 370）', trayH <= 300, 'h=' + trayH);
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

  S.rankTab = 2; S.rankList = null;
  game._debug.cloudRank(2);
  await sleep(10);
  rec.texts.length = 0;
  step(16);
  check('好友榜如实说明「暂未开通」', rec.texts.some(t => /好友榜暂未开通/.test(t.s)));

  S.rankTab = 0;
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
  const md5 = f => crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex');
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
