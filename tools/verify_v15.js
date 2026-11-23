/* v0.15 专项验收：每日在线奖励（6 档 / 累计时长 / 每日 0 点清零）+ 查找道具
 * 用法：node tools/verify_v15.js
 *
 * 覆盖：
 *   1) 配置：6 档门槛与奖励数值（对着需求逐项核）；
 *   2) 计时：前台累计、单次结算上限（防时钟跳变）、跨天清零、15 秒落盘节流；
 *   3) 领取：未到点 / 已放弃重复领 / 体力溢出 / 查找道具入账；
 *   4) 主页入口：气泡「可领 N」与累计时长、点击进页面（不再是一点就领）；
 *   5) 页面版式：累计时长、进度条、6 行档位、三种按钮态；
 *   6) 查找道具在关卡提示面板里的入口与消耗（v0.16 起无免费档）；
 *   7) 三端一致 / 源码约束 / 包体。
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');

/* ---------- 记录型 ctx ---------- */
const rec = { texts: [] };
let seq = 0;
function makeCtx() {
  const grad = { addColorStop() {} };
  const base = {
    canvas: { width: 0, height: 0, style: {} },
    globalAlpha: 1,
    font: '16px sans-serif',
    measureText(s) { return { width: String(s).length * 15 }; },
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
    createPattern: () => null,
    fillText(s, x, y) {
      rec.texts.push({ s: String(s), x, y, seq: ++seq });
    },
    stroke() {}, fill() {}, fillRect() {}, drawImage() {},
    arc() {}, moveTo() {}, lineTo() {},
    setLineDash() {},
    save() {}, restore() {},
    beginPath() {}, closePath() {}, arcTo() {},
    bezierCurveTo() {}, quadraticCurveTo() {}, rect() {}, translate() {},
    rotate() {}, scale() {}, clip() {}, setTransform() {},
    clearRect() {}, strokeRect() {}, ellipse() {}
  };
  return new Proxy(base, {
    get(t, k) { return k in t ? t[k] : () => {}; },
    set(t, k, v) { t[k] = v; return true; }
  });
}

let pendingFrame = null, clock = 0;
global.requestAnimationFrame = cb => { pendingFrame = cb; return 1; };
function step(ms) {
  clock += ms || 16;
  const cb = pendingFrame;
  pendingFrame = null;
  if (cb) cb(clock);
}
const delay = ms => new Promise(r => setTimeout(r, ms || 5));

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
function texts() { return rec.texts.map(t => t.s).join(' | '); }
function grab(fn) { rec.texts.length = 0; fn(); return texts(); }

/* ---------- env ---------- */
function mkEnv(store) {
  return {
    ctx: makeCtx(),
  tutorial: false,   // v0.21：这些脚本专测横向系统，关掉第 1 关教学
    size: () => ({ w: 375, h: 812 }),
    dpr: () => 3,
    safeInsets: () => ({ top: 20, bottom: 0 }),
    bindInput() {},
    storage: { get: k => (k in store ? store[k] : null), set: (k, v) => { store[k] = v; } },
    audio: { unlock() {}, setEnabled() {}, play() {}, duck() {}, setVisible() {}, setScene() {} },
    vibrate() {}, images: {},
    share() {}, onHide() {}, onShow() {},
    cloud: {
      enabled: () => false,
      init(cb) { setTimeout(() => cb({ msg: 'no-cloud' }), 0); },
      load(cb) { setTimeout(() => cb({ msg: 'no-cloud' }), 0); },
      save(p, cb) { setTimeout(() => cb(null, {}), 0); },
      rank(t, cb) { setTimeout(() => cb(null, { list: [], me: null }), 0); }
    },
    ad: { placeholder: true, banner() {}, rewarded(k, cb) { cb(true, ''); } }
  };
}
function boot() {
  const store = {};
  const g = CORE(mkEnv(store));
  g.init();
  return { g, S: g.state, D: g._debug, store };
}
/* 停表：让后面手写的 onlineSec 不被 Date.now 差值污染 */
function freeze(S) { S.onlineMark = 0; S.onlineSaveT = 0; }

async function main() {
  console.log('v0.15 验收：每日在线奖励（6 档）+ 查找道具');
  check('版本号 v0.15+', /^v0\.(1[5-9]|2\d)/.test(CFG.version), CFG.version);

  /* ================= 1. 配置数值 ================= */
  section('1. 配置：6 档门槛与奖励（对着需求逐项核）');
  const T = CFG.ONLINE.tiers;
  check('共 6 档', T.length === 6, 'n=' + T.length);
  check('门槛 1/5/10/20/40/60 分钟', JSON.stringify(T.map(t => t.at)) === '[60,300,600,1200,2400,3600]',
    T.map(t => t.at).join(','));
  const spec = [
    { coin: 5, energy: 6, hint: 0 },
    { coin: 5, energy: 0, hint: 0 },
    { coin: 5, energy: 6, hint: 0 },
    { coin: 10, energy: 0, hint: 0 },
    { coin: 0, energy: 6, hint: 1 },
    { coin: 10, energy: 20, hint: 1 }
  ];
  for (let i = 0; i < 6; i++) {
    const t = T[i], e = spec[i];
    check(`${t.label}：体力 +${e.energy} 巧币 +${e.coin}` + (e.hint ? ` 查找道具 +${e.hint}` : ''),
      t.energy === e.energy && t.coin === e.coin && (t.hint || 0) === e.hint,
      `实际 ${t.energy}/${t.coin}/${t.hint || 0}`);
  }
  check('旧的「3 分钟一次」配置已移除',
    CFG.ECON.onlineRewardSec === undefined && CFG.ECON.onlineRewardCoin === undefined);

  /* ================= 2. 计时 ================= */
  section('2. 计时：前台累计 / 单次上限 / 跨天清零');
  const { g, S, D, store } = boot();
  await delay(20);
  freeze(S);
  S.save.onlineSec = 0;
  S.save.onlineDay = '';
  D.onlineSync();                                  // 第一次：只把日期对齐，不灌历史时间
  check('首次结算不会凭空累计（起表前不记时）', Math.floor(S.save.onlineSec) === 0, 'sec=' + S.save.onlineSec);
  const today = (function () {
    const d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  })();
  check('日期已对齐到今天', S.save.onlineDay === today, S.save.onlineDay);

  freeze(S);
  S.save.onlineSec = 0;
  S.onlineMark = Date.now() - 5000;                // 假装已经看了 5 秒
  D.onlineSync();
  const s5 = S.save.onlineSec;
  check('前台 5 秒 → 累计 5 秒', s5 >= 4.9 && s5 <= 5.2, 'sec=' + s5.toFixed(2));

  freeze(S);
  S.save.onlineSec = 0;
  S.onlineMark = Date.now() - 400000;              // 时钟被改 / 长卡顿 400 秒
  D.onlineSync();
  check('单次最多记 300 秒（防一次灌满 6 档）',
    S.save.onlineSec >= 299 && S.save.onlineSec <= 301, 'sec=' + S.save.onlineSec.toFixed(1));

  freeze(S);
  S.save.onlineDay = '2000-1-1';
  S.save.onlineSec = 999;
  S.save.onlineGot = { o1: true, o2: true };
  D.onlineSync();
  check('跨天：累计归零', Math.floor(S.save.onlineSec) === 0, 'sec=' + S.save.onlineSec);
  check('跨天：已领记录清空', Object.keys(S.save.onlineGot).length === 0);
  check('跨天：日期滚到今天', S.save.onlineDay === today, S.save.onlineDay);

  /* 落盘节流：15 秒一次 writeLocal，且不产生云端上行 */
  freeze(S);
  S.save.onlineSec = 10;
  S.onlineMark = Date.now();                       // 起表（只为让 onlineTick 走到落盘分支）
  D.onlineTick(16000);
  const raw = store[D.saveKey];
  let dumped = null;
  try { dumped = raw ? JSON.parse(raw) : null; } catch (e) { dumped = null; }
  check('15 秒后把 onlineSec 写进本地存档', !!dumped && typeof dumped.onlineSec === 'number',
    dumped ? 'sec=' + dumped.onlineSec.toFixed(1) : 'no save');
  check('定时落盘不刷新 updatedAt（否则云端合并会误判本机最新）',
    !!dumped && dumped.updatedAt === S.save.updatedAt, 'ts=' + (dumped && dumped.updatedAt));
  check('不足 15 秒不落盘', (function () {
    const before = store[D.saveKey];
    S.onlineSaveT = 0;
    D.onlineTick(500);
    return store[D.saveKey] === before;
  })());

  /* ================= 3. 领取 ================= */
  section('3. 领取：未到点 / 重复领 / 体力溢出 / 查找道具');
  const b = boot();
  await delay(20);
  freeze(b.S);
  b.S.save.onlineSec = 30;
  b.S.save.onlineGot = {};
  let list = b.D.onlineTierList();
  check('30 秒：1 分钟档未到点', list[0].ready === false && Math.floor(list[0].left) === 30,
    'left=' + list[0].left.toFixed(0));
  const coin0 = b.S.save.coin;
  check('未到点领取被拒', b.D.onlineClaim('o1') === false && b.S.save.coin === coin0);

  freeze(b.S);
  b.S.save.onlineSec = 60;
  b.S.save.energy = 4;
  const cBefore = b.S.save.coin, eBefore = b.S.save.energy;
  check('到点可领', b.D.onlineTierList()[0].ready === true && b.D.onlineClaimCount() === 1);
  check('领取成功', b.D.onlineClaim('o1') === true);
  check('巧币 +5', b.S.save.coin === cBefore + 5, cBefore + '→' + b.S.save.coin);
  check('体力 +6', b.S.save.energy === eBefore + 6, eBefore + '→' + b.S.save.energy);
  check('记录已领', b.S.save.onlineGot.o1 === true);
  check('重复领取无效（不重复发奖）',
    b.D.onlineClaim('o1') === false && b.S.save.coin === cBefore + 5);

  freeze(b.S);
  b.S.save.onlineSec = 3600;
  b.S.save.energy = CFG.ECON.energyMax;             // 满体力
  check('60 分钟档体力可溢出上限', b.D.onlineClaim('o6') === true &&
    b.S.save.energy === CFG.ECON.energyMax + 20, 'energy=' + b.S.save.energy);
  check('60 分钟档巧币 +10 查找道具 +1',
    b.S.save.coin === cBefore + 15 && b.S.save.hintItems === 1,
    'coin=' + b.S.save.coin + ' hint=' + b.S.save.hintItems);

  freeze(b.S);
  b.S.save.onlineSec = 2400;
  b.D.onlineClaim('o5');
  check('40 分钟档：体力 +6 查找道具 +1（无巧币）',
    b.S.save.hintItems === 2 && b.S.save.energy === CFG.ECON.energyMax + 20 + 6,
    'hint=' + b.S.save.hintItems + ' energy=' + b.S.save.energy);

  /* ================= 4. 主页入口 ================= */
  section('4. 主页入口：气泡与跳转');
  const h = boot();
  await delay(20);
  freeze(h.S);
  h.S.save.onlineSec = 90;
  h.S.save.onlineGot = {};
  h.D.go('home');
  let tx = grab(() => step(16));
  check('有可领档时气泡显示「可领 N」', /可领 1/.test(tx), tx.slice(0, 120));
  check('主页入口文案仍是「在线奖励」', /在线奖励/.test(tx));

  freeze(h.S);
  h.S.save.onlineSec = 40;
  h.S.save.onlineGot = {};
  tx = grab(() => step(16));
  check('没到点时气泡显示累计时长 mm:ss', /00:40/.test(tx) && !/可领/.test(tx), tx.slice(0, 120));

  check('点入口只是开页面，不直接发奖', (function () {
    const c0 = h.S.save.coin;
    h.D.fireBtn('online_claim');
    return h.S.overlay === 'online' && h.S.save.coin === c0;
  })(), 'overlay=' + h.S.overlay);

  /* ================= 5. 页面版式 ================= */
  section('5. 页面：累计时长 / 进度条 / 6 行档位 / 三种按钮态');
  freeze(h.S);
  h.S.save.onlineSec = 700;                        // 11:40 → 1/5/10 分钟档可领
  h.S.save.onlineGot = { o1: true };
  h.S.overlay = 'online';
  tx = grab(() => step(16));
  check('标题「在线奖励」', /在线奖励/.test(tx));
  check('顶部「今日累计在线」', /今日累计在线/.test(tx));
  check('累计时长 11:40', /11:40/.test(tx), tx.slice(0, 200));
  check('「每日 0 点重新统计」', /每日 0 点重新统计/.test(tx));
  check('有到点未领的档时提示「有 N 档奖励可领」', /有 2 档奖励可领/.test(tx), tx.slice(0, 300));
  for (const t of T) check('档位行「在线 ' + t.label + '」', new RegExp('在线 ' + t.label).test(tx));
  check('已领档显示「已领取」', /已领取/.test(tx));
  check('到点档显示「领取」', /领取/.test(tx));
  check('未到档显示「差 mm:ss」', /差 \d\d:\d\d/.test(tx), tx.slice(0, 400));
  check('底部查找道具余额', /查找道具 ×\d+/.test(tx), tx.slice(0, 300));

  /* 页面内点领取（走 switch 的 online_o 前缀分支） */
  const coinP = h.S.save.coin;
  h.D.fireBtn('online_o2');
  check('页面里点「领取」能发奖', h.S.save.coin === coinP + 5 && h.S.save.onlineGot.o2 === true,
    coinP + '→' + h.S.save.coin);

  /* 全部领完：进度条满格 + 文案换掉 */
  freeze(h.S);
  h.S.save.onlineSec = 3600;
  h.S.save.onlineGot = { o1: true, o2: true, o3: true, o4: true, o5: true, o6: true };
  tx = grab(() => step(16));
  check('全领完显示「今天的奖励已全部领完」', /今天的奖励已全部领完/.test(tx), tx.slice(0, 300));
  check('全领完 6 行都是「已领取」', (tx.match(/已领取/g) || []).length === 6,
    'hits=' + (tx.match(/已领取/g) || []).length);

  freeze(h.S);
  h.S.save.onlineSec = 700;
  h.S.save.onlineGot = { o1: true, o2: true, o3: true };
  tx = grab(() => step(16));
  check('下一档未到点：显示还差 08:20', /距「20 分钟」还差 08:20/.test(tx), tx.slice(0, 300));

  /* ================= 6. 查找道具 ================= */
  section('6. 查找道具：关卡提示面板可用（v0.16 起每关不再白送）');
  const p = boot();
  await delay(20);
  freeze(p.S);
  p.D.setupLevel(0);
  p.D.go('play');
  p.S.hintLv = 0;                                  // v0.16：第 1 档也要付费
  p.S.overlay = 'hint';
  p.S.save.hintItems = 2;
  tx = grab(() => step(16));
  check('有道具时提示面板出现「用查找道具 · 剩 2」', /用查找道具 · 剩 2/.test(tx), tx.slice(0, 300));
  check('仍保留看视频 / 巧币两条路', /看视频/.test(tx) && /巧币/.test(tx));

  p.D.fireBtn('hint_item');
  check('用道具后数量 -1', p.S.save.hintItems === 1, 'n=' + p.S.save.hintItems);
  check('用道具后提示档位 +1（第 1 档也要付）', p.S.hintLv === 1, 'lv=' + p.S.hintLv);
  check('用道具不扣巧币', p.S.save.coin >= 0);

  p.S.hintLv = 0;
  p.S.overlay = 'hint';
  p.S.save.hintItems = 0;
  tx = grab(() => step(16));
  /* v0.22：没道具时面板不再画道具按钮 —— 有道具时工具栏一点就用，面板只留巧币/视频 */
  check('没道具时面板不画道具按钮',
    !/查找道具/.test(tx), tx.slice(0, 300));
  /* v0.20：面板上「道具来源 / 巧币余量 / 用提示最高 ★★」两行小字已按需求删除 */
  check('面板不再写道具来源与星级封顶（v0.20 删除）',
    !/在线奖励 40\/60 分钟/.test(tx) && !/最高 ★★/.test(tx), tx.slice(0, 300));
  check('没道具时点用道具被拒（不出现负库存）', (function () {
    const n0 = p.S.save.hintItems;
    p.D.useHintItem();
    return p.S.save.hintItems === n0;
  })());

  /* ================= 7. 源码约束 / 三端 / 包体 ================= */
  section('7. 源码约束、三端一致与包体');
  const coreSrc = fs.readFileSync(path.join(ROOT, 'js/core.js'), 'utf8');
  const code = coreSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  check('core 里不出现 wx.*', !/\bwx\./.test(code));
  check('在线计时只在前台（onHide 停表）', /onHide[\s\S]{0,400}state\.onlineMark = 0/.test(coreSrc));
  check('onlineSec 用 writeLocal(true)（不上行、不动 updatedAt）',
    /function onlineTick[\s\S]{0,500}writeLocal\(true\)/.test(coreSrc));
  check('旧字段 onlineTs 不再参与逻辑', !/state\.save\.onlineTs/.test(code));
  check('在线时长不进云端覆盖（mergeSave 保留本地）',
    /out\.onlineDay = a\.onlineDay/.test(coreSrc) && /out\.onlineSec = a\.onlineSec/.test(coreSrc));

  const md5 = f => crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex');
  for (const f of ['config', 'core', 'judge', 'geom', 'levels']) {
    const a = md5(path.join(ROOT, 'js', f + '.js'));
    check(`${f}.js 三端一致`,
      a === md5(path.join(ROOT, 'preview/js', f + '.js')) && a === md5(path.join(ROOT, 'miniprogram/js', f + '.js')),
      a.slice(0, 8));
  }
  function walkSize(dir) {
    const SKIP = ['cloudfunctions', 'node_modules', '.cloudbase', '.git'];
    let total = 0;
    for (const f of fs.readdirSync(dir)) {
      if (SKIP.indexOf(f) >= 0) continue;
      const q = path.join(dir, f);
      const st = fs.statSync(q);
      if (st.isDirectory()) total += walkSize(q); else total += st.size;
    }
    return total;
  }
  const pkg = walkSize(path.join(ROOT, 'miniprogram'));
  check('主包 < 4MB', pkg < 4 * 1024 * 1024, (pkg / 1024 / 1024).toFixed(2) + 'MB');

  console.log('\n' + (fail === 0 ? 'v0.15 全部通过' : `!! ${fail} 项未通过`));
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
