/* v0.24 专项验收：结算页版式重排 + 图案发光动效
 * 用法：node tools/verify_v24.js
 *
 * 用户这版需求原文：
 *   「看视频5倍奖励需要调整下来和下一关按钮放在一排，奖励信息居中显示，
 *     现在放在奖励的末尾太小了，回列表改为返回。拼好了字样的提示不需要删掉，
 *     改成在拼成的图形周围做一个发光的动效」
 *
 * 拆成可断言的口径：
 *   ① ×5 与「下一关 / 返回」同排：同一 y、互不重叠、整排水平居中、都不出卡
 *   ② 奖励条只剩一句结果文案，且水平居中（fillText 的 x = 设计宽/2）
 *   ③ 「回列表」全部改「返回」（含最后一关的主按钮）
 *   ④ 没有 ×5 可领时主按钮回落到 360 宽居中，不留下空位
 *   ⑤ 发光：resT < 120 不画光带，进场后画 3 层金色描边，且强度随相位呼吸
 *   ⑥ 广告播放期整页不可点（hits 清空），与 v0.23 的锁页口径一致
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');

const rec = { texts: [], ops: [] };
function makeCtx() {
  const grad = { addColorStop() {} };
  const base = {
    canvas: { width: 0, height: 0, style: {} },
    globalAlpha: 1,
    measureText(s) { return { width: String(s).length * 15 }; },
    createLinearGradient: () => grad, createRadialGradient: () => grad, createPattern: () => null,
    fillText(s, x, y) { rec.texts.push({ s: String(s), x, y }); },
    fill() { rec.ops.push({ k: 'fill', color: base.fillStyle, a: base.globalAlpha }); },
    stroke() { rec.ops.push({ k: 'stroke', color: base.strokeStyle, a: base.globalAlpha, w: base.lineWidth }); },
    arc() {}, moveTo() {}, lineTo() {}, fillRect() {}, strokeRect() {},
    setLineDash() {}, save() {}, restore() {}, beginPath() {}, closePath() {}, arcTo() {},
    bezierCurveTo() {}, quadraticCurveTo() {}, rect() {}, translate() {},
    rotate() {}, scale() {}, clip() {}, drawImage() {}, setTransform() {},
    clearRect() {}, ellipse() {}
  };
  return new Proxy(base, { get(t, k) { return k in t ? t[k] : () => {}; }, set(t, k, v) { t[k] = v; return true; } });
}

let pendingFrame = null;
global.requestAnimationFrame = cb => { pendingFrame = cb; return 1; };
let clock = 0;
function step(ms) { clock += ms; const cb = pendingFrame; pendingFrame = null; if (cb) cb(clock); }

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
const md5 = p => crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex');

const store = {};
const adLog = { rewarded: [] };
const env = {
  ctx: makeCtx(),
  tutorial: false,
  size: () => ({ w: 375, h: 812 }),
  dpr: () => 3,
  safeInsets: () => ({ top: 20, bottom: 0 }),
  bindInput(fn) { env._in = fn; },
  storage: { get: k => (k in store ? store[k] : null), set: (k, v) => { store[k] = v; } },
  audio: { unlock() {}, setEnabled() {}, play() {}, duck() {}, setVisible() {}, setScene() {} },
  vibrate() {}, images: {}, share() {}, onHide() {}, onShow() {},
  cloud: { enabled: () => false, init(cb) { setTimeout(() => cb('no-cloud'), 0); },
    load(cb) { setTimeout(() => cb('no-cloud'), 0); },
    save(p, cb) { setTimeout(() => cb(null, {}), 0); },
    rank(t, cb) { setTimeout(() => cb(null, { list: [], me: null }), 0); } },
  ad: { placeholder: true, banner() {}, rewarded(kind, cb) { adLog.rewarded.push(kind); cb(true, ''); } }
};

/* 渲染一帧结算页，同时抓文字 / 描边 / 热区 */
function frame(S, D, resT) {
  S.overlay = 'result'; S.resT = resT; S.starShown = 3;
  rec.texts.length = 0; rec.ops.length = 0;
  step(16);
  return { tx: rec.texts.map(t => t.s), texts: rec.texts.slice(), ops: rec.ops.slice(), hits: D.hitList() };
}
function hit(hits, id) { return hits.find(h => h.id === id); }

(async function main() {
  console.log('v0.24 验收：结算页按钮并排 / 奖励文案居中 / 回列表→返回 / 图案发光');
  const game = CORE(env);
  game.init();
  step(16);
  const S = game.state, D = game._debug, W = CFG.WIN, DW = CFG.DESIGN.w;

  /* ================= 1. 配置 ================= */
  section('1. 版本与版式配置');
  check('版本 v0.24 起（v0.24.1 继续沿用本版规则）', /^v0\.2[4-9](\.\d+)?$/.test(CFG.version), CFG.version);
  check('新增 primaryW / adMulW / btnGap 三个版式参数',
    W.primaryW === 320 && W.adMulW === 210 && W.btnGap === 22,
    `${W.primaryW}/${W.adMulW}/${W.btnGap}`);
  const rowW = W.adMulW + W.btnGap + W.primaryW;
  check('并排总宽 552 不超过卡片可用宽（620-2×30=560）', rowW <= W.cardW - 60,
    rowW + ' / ' + (W.cardW - 60));
  check('奖励条缩窄到 500（只需装一行字）', W.rewardW === 500, String(W.rewardW));
  check('奖励条与主按钮排不重叠',
    W.rewardY + W.rewardH / 2 <= W.primaryY - W.primaryH / 2,
    `${W.rewardY + W.rewardH / 2} <= ${W.primaryY - W.primaryH / 2}`);
  check('主按钮排与第二排不重叠',
    W.primaryY + W.primaryH / 2 <= W.row2Y - W.row2H / 2,
    `${W.primaryY + W.primaryH / 2} <= ${W.row2Y - W.row2H / 2}`);
  check('卡片容得下三排按钮', W.cy + W.cardH / 2 >= W.row3Y + W.row3H / 2 + 20,
    `卡底 ${W.cy + W.cardH / 2} / 内容底 ${W.row3Y + W.row3H / 2}`);

  /* ================= 2. 首通：×5 与下一关同排 ================= */
  section('2. 首通结算页：×5 与「下一关」并排');
  D.go('play');
  delete S.save.starOf['1'];
  S.save.streak = 0; S.save.streakSeen = [];
  D.setupLevel(0);
  S.elapsed = 0; S.steps = 0;
  D.win();
  let f = frame(S, D, 2000);
  const hAd = hit(f.hits, 'win_ad5'), hNext = hit(f.hits, 'next');
  check('两个热区都在', !!hAd && !!hNext, `ad=${!!hAd} next=${!!hNext}`);
  const cyAd = hAd.y + hAd.h / 2, cyNext = hNext.y + hNext.h / 2;
  check('两个按钮中心 y 相同（同一排）', Math.abs(cyAd - cyNext) < 0.5,
    `${cyAd} / ${cyNext}`);
  check('两个按钮水平不重叠（间距 ≥ 22）',
    hNext.x - (hAd.x + hAd.w) >= 21.5,
    `gap=${(hNext.x - (hAd.x + hAd.w)).toFixed(1)}`);
  const rowL = hAd.x, rowR = hNext.x + hNext.w;
  check('整排水平居中（左右留白差 < 1）',
    Math.abs((DW / 2 - rowL) - (rowR - DW / 2)) < 1,
    `left=${(DW / 2 - rowL).toFixed(1)} right=${(rowR - DW / 2).toFixed(1)}`);
  check('整排不出卡片（与卡边各留 ≥ 30）', rowL - (DW / 2 - W.cardW / 2) >= 30,
    `边距 ${(rowL - (DW / 2 - W.cardW / 2)).toFixed(1)}`);
  check('×5 热区宽 210（按钮视觉 210×74；热区高保底 88 是 MIN_HIT 的既有规则）',
    hAd.w === W.adMulW && Math.abs(hNext.h - hAd.h) < 0.5, `${hAd.w}×${hAd.h}`);
  check('主按钮尺寸缩到 320 宽与 ×5 配套', hNext.w === W.primaryW, String(hNext.w));

  /* ================= 3. 奖励文案居中 ================= */
  section('3. 奖励信息居中');
  const gTxt = f.texts.find(t => /首通奖励/.test(t.s));
  check('奖励条文案存在', !!gTxt, gTxt ? gTxt.s : 'none');
  check('奖励文案水平居中（x = 375）', gTxt && Math.abs(gTxt.x - DW / 2) < 0.6,
    gTxt ? String(gTxt.x) : '-');
  check('奖励条里不再塞 ×5 按钮（那枚字在条外）',
    f.tx.filter(t => /^首通奖励/.test(t)).length === 1, 'single line');
  const yMulBtn = cyAd, yReward = gTxt ? gTxt.y : 0;
  check('×5 按钮在奖励条下方（不同行）', yMulBtn - yReward > 50,
    `${yMulBtn.toFixed(0)} vs ${yReward.toFixed(0)}`);

  /* ================= 4. 回列表 → 返回 ================= */
  section('4. 「回列表」全部改「返回」');
  check('结算页没有「回列表」', !f.tx.some(t => t.indexOf('回列表') >= 0),
    f.tx.filter(t => /回列表/.test(t)).join('|'));
  check('第三排出现「返回」', f.tx.some(t => t === '返回'),
    f.tx.filter(t => /返回/.test(t)).join('|'));

  /* ================= 5. 已翻倍 / 重复通关：主按钮回落居中 ================= */
  section('5. 没有 ×5 可领时主按钮回落居中');
  D.fireBtn('win_ad5');
  f = frame(S, D, 2000);
  const hNext2 = hit(f.hits, 'next');
  check('翻倍后 ×5 热区消失', !hit(f.hits, 'win_ad5'), f.hits.map(h => h.id).join(','));
  check('翻倍后主按钮回落 360 宽', hNext2 && hNext2.w === 360, hNext2 ? String(hNext2.w) : '-');
  check('翻倍后主按钮居中（x 中心 = 375）',
    hNext2 && Math.abs(hNext2.x + hNext2.w / 2 - DW / 2) < 0.6,
    hNext2 ? String(hNext2.x + hNext2.w / 2) : '-');
  check('翻倍后文案写「已翻 5 倍」', f.tx.some(t => /已翻 5 倍/.test(t)),
    f.tx.filter(t => /已翻/.test(t)).join('|'));

  S.save.starOf['1'] = 3;
  S.save.streak = 0; S.save.streakSeen = [];
  D.setupLevel(0);
  S.elapsed = 0; S.steps = 0;
  D.win();
  f = frame(S, D, 2000);
  const hNext3 = hit(f.hits, 'next');
  check('重复通关也没有 ×5 入口', !hit(f.hits, 'win_ad5'), f.hits.map(h => h.id).join(','));
  check('重复通关主按钮仍居中 360', hNext3 && hNext3.w === 360 &&
    Math.abs(hNext3.x + hNext3.w / 2 - DW / 2) < 0.6, String(hNext3.w));

  /* ================= 6. 最后一关：主按钮「返回」 ================= */
  section('6. 最后一关主按钮 =「返回」');
  const lastIdx = CFG.LEVELS ? CFG.LEVELS.length - 1 : D.LEVELS.length - 1;
  S.levelIdx = lastIdx;
  S.result = { stars: 3, time: 30, steps: 10, first: true, gain: 5, adUsed: false };
  f = frame(S, D, 2000);
  check('最后一关主按钮写「返回」', f.tx.some(t => t === '返回'),
    f.tx.filter(t => /返回/.test(t)).join('|'));
  check('最后一关仍有 ×5 与「返回」并排', !!hit(f.hits, 'win_ad5') && !!hit(f.hits, 'to_list'),
    f.hits.map(h => h.id).join(','));

  /* ================= 7. 发光动效 ================= */
  section('7. 图案发光：进场后才起、三层金色描边、随相位呼吸');
  S.levelIdx = 0;
  S.result = { stars: 3, time: 30, steps: 10, first: true, gain: 5, adUsed: false };
  const GLOW = /rgba\(255,190,72,/;
  function glowOps(resT) {
    const g = frame(S, D, resT);
    return g.ops.filter(o => o.k === 'stroke' && typeof o.color === 'string' && GLOW.test(o.color));
  }
  check('resT=60（进场未完成）不发光', glowOps(60).length === 0, String(glowOps(60).length));
  const gPulse = glowOps(1000);
  check('进场后画出 3 层光带', gPulse.length === 3, String(gPulse.length));
  check('三层线宽 10 / 5 / 2.5（由外到内收窄）',
    JSON.stringify(gPulse.map(o => Math.round(o.w))) === '[10,5,3]',
    JSON.stringify(gPulse.map(o => Math.round(o.w))));
  const a0 = glowOps(120)[0], a1 = glowOps(1070)[0];
  check('光带透明度随相位变化（不是静态描边）',
    a0 && a1 && a0.color !== a1.color, `${a0 ? a0.color : '-'} → ${a1 ? a1.color : '-'}`);
  const peak = glowOps(1070).map(o => +(o.color.match(/,([\d.]+)\)$/)[1]));
  check('峰值不透顶（最亮一层 < 0.6，避免糊成一片）',
    Math.max(...peak) < 0.6, Math.max(...peak).toFixed(3) + ' max');
  S.levelIdx = 0;
  const fT = frame(S, D, 2000);
  check('标题「拼好了！」保留未删', fT.tx.some(t => t === '拼好了！'),
    fT.tx.filter(t => /拼好了/.test(t)).join('|'));

  /* ================= 8. 广告期锁页 ================= */
  section('8. 看广告期间整页不可点');
  S.overlay = 'result'; S.adSim = { kind: 'coin5', t: -1e6 }; S.resT = 2000;
  step(16);
  check('模拟广告进行中 hits 为空', D.hitList().length === 0, String(D.hitList().length));
  S.adSim = null;
  frame(S, D, 2000);
  check('广告结束后热区恢复', D.hitList().length > 0, String(D.hitList().length));

  /* ================= 9. 设置页不放假操作 + 第 1 关永远教学（v0.26）================= */
  /* 用户两条反馈：
   *   ①「设置里面也不能有重置进度，玩家怎么能够直接把游戏重置了呢」；
   *   ②「教学是四巧板和七巧板的第一关设置为教学的形式，不管是否通关都是教学的形式」。
   * 这一节把设置页的热区白名单和第 1 关的四种星级状态都钉死。 */
  section('9. 设置页无破坏性入口 / 第 1 关永远教学');
  env.tutorial = true;

  /* ① 设置页：只剩「关闭」，没有任何重置/教学入口 */
  S.save.starOf = {}; S.save.coin = 100; S.save.energy = 10;
  S.overlay = 'settings'; S.resT = 0;
  rec.texts.length = 0; step(16);
  check('设置页没有「重置进度」', !rec.texts.some(t => t.s === '重置进度'),
    rec.texts.map(t => t.s).filter(t => /重置|教程|关闭/.test(t)).join('|'));
  check('设置页没有「重看教程」', !rec.texts.some(t => t.s === '重看教程'),
    rec.texts.map(t => t.s).filter(t => /重置|教程|关闭/.test(t)).join('|'));
  check('设置页仍有「关闭」', rec.texts.some(t => t.s === '关闭'),
    rec.texts.map(t => t.s).filter(t => /重置|教程|关闭/.test(t)).join('|'));
  const sIds = D.hitList().map(h => h.id);
  check('热区里没有 reset_progress / replay_tut',
    sIds.indexOf('reset_progress') < 0 && sIds.indexOf('replay_tut') < 0, sIds.join(','));
  const hClose = D.hitList().find(h => h.id === 'close_settings');
  check('「关闭」居中（两枚并排的痕迹已清）',
    !!hClose && Math.abs(hClose.x + hClose.w / 2 - DW / 2) < 1,
    hClose ? `x=${(hClose.x + hClose.w / 2).toFixed(0)} 期望 ${DW / 2}` : 'missing');

  /* ② 第 1 关永远是教学形式：0 / 1 / 3 星都一样 */
  S.overlay = null;
  S.save.starOf = {};
  D.setupLevel(0);
  check('第 1 关（0 星）→ 教学', !!S.tut, String(!!S.tut));
  S.save.starOf['1'] = 1;
  D.setupLevel(0);
  check('第 1 关（1 星，已通关）→ 仍然教学', !!S.tut, String(!!S.tut));
  S.save.starOf['1'] = 3;
  D.setupLevel(0);
  check('第 1 关（3 星，已通关）→ 仍然教学', !!S.tut, String(!!S.tut));
  D.setupLevel(1);
  check('第 2 关 → 不教学', !S.tut, String(!!S.tut));

  /* ③ 跳过只关本次，不落任何标记 */
  D.setupLevel(0);
  D.fireBtn('tut_skip'); step(16);
  check('点「跳过教学」→ 本次立刻收起', !S.tut, String(!!S.tut));
  check('跳过不写存档标记', S.save.tutDone === undefined, JSON.stringify(S.save.tutDone));
  D.setupLevel(0);
  check('跳过后重进 → 还是教学', !!S.tut, String(!!S.tut));

  /* ④ 误判防御：棋盘还没建好（pieces 为空）时 tutStep() 返回 null，
   * 不能当成"教学完成"而静默收起。 */
  const keepPieces = S.pieces;
  S.pieces = [];
  for (let k = 0; k < 5; k++) step(16);
  check('棋盘未就绪（pieces=[]）时不误判教学完成', !!S.tut,
    'tut=' + !!S.tut + ' tutDone=' + JSON.stringify(S.save.tutDone));
  S.pieces = keepPieces;
  env.tutorial = false;

  /* ================= 10. 三端一致性 ================= */
  section('10. 三端一致性与包体积');
  const mods = ['config.js', 'core.js', 'geom.js', 'judge.js', 'levels.js'];
  let same = true, detail = [];
  for (const m of mods) {
    const h = md5(path.join(ROOT, 'js', m));
    const a = md5(path.join(ROOT, 'preview/js', m));
    const b = md5(path.join(ROOT, 'miniprogram/js', m));
    if (!(h === a && h === b)) { same = false; detail.push(m); }
  }
  check('五个模块三端 md5 一致', same, same ? 'all same' : detail.join(','));
  let bytes = 0;
  (function walk(d) {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f);
      const st = fs.statSync(p);
      if (st.isDirectory()) { if (f !== 'node_modules' && f !== '.git') walk(p); }
      else bytes += st.size;
    }
  })(path.join(ROOT, 'miniprogram'));
  check('主包 < 4MB', bytes < 4 * 1024 * 1024, (bytes / 1024 / 1024).toFixed(2) + 'MB');

  console.log(fail ? `\n!! ${fail} 项未通过` : '\n全部通过');
  process.exit(fail ? 1 : 0);
})();
