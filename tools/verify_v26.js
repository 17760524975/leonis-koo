/* v0.26 专项验收：设置页去掉破坏性操作 / 第 1 关永远教学 / 中途续玩
 * 用法：node tools/verify_v26.js
 *
 * 用户这版三条需求原文：
 *   ①「设置里面也不能有重置进度，玩家怎么能够直接把游戏重置了呢？这是什么设计逻辑？」
 *   ②「我说教学是四巧板和七巧板的第一关设置为教学的形式，不管是否通关都是教学的形式」
 *   ③「进入新解锁的下一关后，玩了一半然后返回出来，下次进入应该不扣除体力，
 *      继续按照上次还剩的倒计时进行，不应该直接又重新刷新进去，这样玩家一旦拼不上
 *      等倒计时快完的时候返回，再次进去时间就又满了」
 *
 * 拆成可断言的口径：
 *   ① 设置页热区白名单里没有 reset_progress / replay_tut，只剩 close_settings
 *   ② makeTutorial 不再看星级：第 1 关 0/1/3 星都进教学，第 2 关不进
 *   ③ 未通关关玩一半返回 → 写快照（剩余时间 / 用时 / 步数 / 板上块）
 *      再进 → 不扣体力、时间接着走、板件复位
 *   ④ 快照的清理边界：通关 / 失败 / 放弃 清空；教学关 / 已通关 / 没动过手 / 时间耗尽 不写
 *   ⑤ 老存档（无 resume 字段）兼容；mergeSave 跟随较新那份
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');

const rec = { texts: [] };
function makeCtx() {
  const grad = { addColorStop() {} };
  const base = {
    canvas: { width: 0, height: 0, style: {} },
    globalAlpha: 1,
    measureText(s) { return { width: String(s).length * 15 }; },
    createLinearGradient: () => grad, createRadialGradient: () => grad, createPattern: () => null,
    fillText(s, x, y) { rec.texts.push({ s: String(s), x, y }); },
    fill() {}, stroke() {}, arc() {}, moveTo() {}, lineTo() {}, fillRect() {}, strokeRect() {},
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
function md5(p) { var __s = p; return require('crypto').createHash('md5').update(/\.js$/i.test(String(__s)) ? Buffer.from(require('./lib/pack.js').strip(require('fs').readFileSync(__s, 'utf8'))) : require('fs').readFileSync(__s)).digest('hex'); }

const store = {};
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
  ad: { placeholder: true, banner() {}, rewarded(k, cb) { cb(true, ''); } }
};

function putSolved(S, lv, id) {
  const st = lv.solution.filter(x => x.id === id)[0];
  const p = S.pieces.filter(x => x.id === id)[0];
  if (!st || !p) return;
  p.onBoard = true; p.x = st.x; p.y = st.y;
  p.angle = st.angle; p.dAngle = st.angle;
  p.flipped = !!st.flipped; p.dFlipped = p.flipped;
}

/* 每次都从干净存档起 —— 上一节的状态不能漏到下一节 */
function boot(tut) {
  Object.keys(store).forEach(k => delete store[k]);
  env.tutorial = !!tut;
  const g = CORE(env);
  g.init();
  step(16);
  return { g, S: g.state, D: g._debug };
}

(async function main() {
  console.log('v0.26 验收：设置页无破坏性入口 / 第 1 关永远教学 / 中途续玩');
  const DW = CFG.DESIGN.w, EC = CFG.ECON;

  /* ================= 1. 版本 ================= */
  section('1. 版本与配置');
  check('版本 v0.26 起', /^v0\.\d+(\.\d+)?$/.test(CFG.version), CFG.version);
  check('TUTORIAL 仍然只教每类第 1 关', CFG.TUTORIAL.on === true && CFG.TUTORIAL.levels === 1,
    `on=${CFG.TUTORIAL.on} levels=${CFG.TUTORIAL.levels}`);

  /* ================= 2. 设置页没有任何重置入口 ================= */
  section('2. 设置页不提供破坏性操作');
  {
    const { S, D } = boot(false);
    S.page = 'home'; S.fade = 1; S.overlay = 'settings';
    rec.texts.length = 0; step(16);
    const ids = D.hitList().map(h => h.id);
    const tx = rec.texts.map(t => t.s);
    check('没有「重置进度」按钮', tx.indexOf('重置进度') < 0, tx.filter(t => /重置|教程/.test(t)).join('|') || '(none)');
    check('没有「重看教程」按钮（v0.25 已删）', tx.indexOf('重看教程') < 0, '(none)');
    check('热区里没有 reset_progress', ids.indexOf('reset_progress') < 0, ids.join(','));
    check('热区里没有 replay_tut', ids.indexOf('replay_tut') < 0, ids.join(','));
    check('仍有「关闭」', tx.indexOf('关闭') >= 0, tx.join('|'));
    const hc = D.hitList().find(h => h.id === 'close_settings');
    check('「关闭」水平居中', !!hc && Math.abs(hc.x + hc.w / 2 - DW / 2) < 1,
      hc ? `x=${(hc.x + hc.w / 2).toFixed(0)}/${DW / 2}` : 'missing');
    check('fireBtn(\'reset_progress\') 已无对应分支（点了也不清空存档）', (function () {
      S.save.coin = 123; S.save.starOf = { '1': 3 };
      D.fireBtn('reset_progress'); step(16);
      return S.save.coin === 123 && S.save.starOf['1'] === 3;
    })(), 'coin=' + S.save.coin + ' star=' + JSON.stringify(S.save.starOf));
  }

  /* ================= 3. 第 1 关永远是教学形式 ================= */
  section('3. 第 1 关不管是否通关都是教学');
  {
    const { S, D } = boot(true);
    D.go('play'); D.setupLevel(0);
    check('第 1 关（全新，0 星）→ 教学', !!S.tut, String(!!S.tut));
    S.save.starOf['1'] = 1;
    D.setupLevel(0);
    check('第 1 关（1 星，已通关）→ 仍然教学', !!S.tut, String(!!S.tut));
    S.save.starOf['1'] = 3;
    D.setupLevel(0);
    check('第 1 关（3 星，已通关）→ 仍然教学', !!S.tut, String(!!S.tut));
    D.setupLevel(1);
    check('第 2 关 → 不教学', !S.tut, String(!!S.tut));
    /* 七巧板同样只看"是不是第 1 关" */
    D.useSet('tangram7');
    S.save.starOf = { '1': 3 };
    D.setupLevel(0);
    check('七巧板第 1 关（已通关 3 星）→ 也仍然教学', !!S.tut, String(!!S.tut));
    D.setupLevel(1);
    check('七巧板第 2 关 → 不教学', !S.tut, String(!!S.tut));
  }

  /* ================= 4. 中途续玩（核心） ================= */
  section('4. 玩一半返回 → 再进不扣体力、时间接着走');
  {
    const { S, D } = boot(false);
    S.save.unlockedMax = 3;
    S.save.energy = 10; S.save.energyTs = Date.now();
    S.save.resume = null;
    D.fireBtn('lvl_2'); step(16);
    const e1 = S.save.energy;
    check('首次进第 2 关扣 ' + EC.energyCostLevel + ' 点体力', e1 === 10 - EC.energyCostLevel,
      '10→' + e1);
    check('第一次进是满时间', Math.abs(S.timeLeft - S.timeLimit) < 0.1,
      `${S.timeLeft.toFixed(1)}/${S.timeLimit}`);
    check('第一次进没有续玩快照', S.save.resume === null, JSON.stringify(S.save.resume));

    /* 玩一半：摆上一块、只剩 42 秒、走了 7 步 */
    const L2 = D.LEVELS[1];
    putSolved(S, L2, L2.solution[0].id);
    S.timeLeft = 42; S.elapsed = 12000; S.steps = 7;
    D.fireBtn('back_levels'); step(16);

    const r = S.save.resume;
    check('返回后写入快照', !!r && r.lv === 1, r ? JSON.stringify({ lv: r.lv, left: r.left, st: r.st }) : 'null');
    check('快照记住剩余 42 秒', !!r && Math.abs(r.left - 42) < 0.05, r && r.left);
    check('快照记住已在板上的块', !!r && r.pc.length === 1, r && r.pc.length);
    check('快照记住步数与用时', !!r && r.st === 7 && r.el === 12000, r && `${r.st} 步 / ${r.el}ms`);

    D.fireBtn('lvl_2'); step(16);
    check('续玩不再扣体力', S.save.energy === e1, e1 + '→' + S.save.energy);
    check('续玩时间从 42 秒继续（不是回满）',
      Math.abs(S.timeLeft - 42) < 0.6, S.timeLeft.toFixed(2) + 's');
    check('续玩把板上的块摆回原位', S.pieces.filter(x => x.onBoard).length === 1,
      S.pieces.map(x => x.onBoard ? 1 : 0).join(''));
    check('续玩保留步数', S.steps === 7, 'steps=' + S.steps);
    check('续玩保留已用用时', Math.abs(S.elapsed - 12000) < 20, 'elapsed=' + S.elapsed);

    /* 连续第三次进出也别把时间越滚越多 */
    S.timeLeft = 30;
    D.fireBtn('back_levels'); step(16);
    D.fireBtn('lvl_2'); step(16);
    check('再退出再进，时间仍接着走（30 秒附近）',
      Math.abs(S.timeLeft - 30) < 0.6, S.timeLeft.toFixed(2) + 's');
  }

  /* ================= 5. 快照的清理边界 ================= */
  section('5. 什么情况下快照作废');
  {
    /* 通关 */
    const a = boot(false);
    a.S.save.unlockedMax = 3; a.S.save.energy = 10; a.S.save.energyTs = Date.now();
    a.D.fireBtn('lvl_2'); step(16);
    a.S.timeLeft = 60; a.S.save.resume = { lv: 1, left: 60, pc: [] };
    const L2 = a.D.LEVELS[1];
    L2.solution.forEach(s => putSolved(a.S, L2, s.id));
    a.D.runJudge(true);               // putSolved 只挪坐标，判定要自己跑一次
    for (let k = 0; k < 6; k++) step(16);
    check('通关 → 快照清空', a.S.save.resume === null,
      'win=' + !!a.S.win + ' resume=' + JSON.stringify(a.S.save.resume));

    /* 失败 */
    const b = boot(false);
    b.S.save.unlockedMax = 3; b.S.save.energy = 10; b.S.save.energyTs = Date.now();
    b.D.fireBtn('lvl_2'); step(16);
    b.S.save.resume = { lv: 1, left: 60, pc: [] };
    b.S.timeLeft = 0.001; step(30);
    check('时间耗尽（失败）→ 快照清空', b.S.save.resume === null,
      'overlay=' + b.S.overlay + ' resume=' + JSON.stringify(b.S.save.resume));

    /* 放弃 */
    const c = boot(false);
    c.S.save.unlockedMax = 3; c.S.save.energy = 10; c.S.save.energyTs = Date.now();
    c.D.fireBtn('lvl_2'); step(16);
    c.S.save.resume = { lv: 1, left: 60, pc: [] };
    c.D.giveUp(); step(16);
    check('忍痛放弃 → 快照清空', c.S.save.resume === null, JSON.stringify(c.S.save.resume));

    /* 教学关不写 */
    const d = boot(true);
    d.S.save.unlockedMax = 2; d.S.save.energy = 10; d.S.save.energyTs = Date.now();
    d.D.fireBtn('lvl_1'); step(16);
    check('教学关进关不扣体力', d.S.save.energy === 10, 'energy=' + d.S.save.energy);
    putSolved(d.S, d.D.LEVELS[0], d.D.LEVELS[0].solution[0].id);
    d.S.steps = 3; d.S.timeLeft = 20;
    d.D.fireBtn('back_levels'); step(16);
    check('教学关中途返回不写快照', d.S.save.resume === null, JSON.stringify(d.S.save.resume));

    /* 已通关的重玩不写 */
    const e = boot(false);
    e.S.save.unlockedMax = 3; e.S.save.starOf = { '2': 3 };
    e.S.save.energy = 10; e.S.save.energyTs = Date.now();
    e.D.fireBtn('lvl_2'); step(16);
    check('已通关重玩不扣体力', e.S.save.energy === 10, 'energy=' + e.S.save.energy);
    putSolved(e.S, e.D.LEVELS[1], e.D.LEVELS[1].solution[0].id);
    e.S.steps = 2;
    e.D.fireBtn('back_levels'); step(16);
    check('已通关的关重玩返回不写快照', e.S.save.resume === null, JSON.stringify(e.S.save.resume));

    /* 没动过手不覆盖上一关的快照 */
    const f = boot(false);
    f.S.save.unlockedMax = 4; f.S.save.energy = 20; f.S.save.energyTs = Date.now();
    f.D.fireBtn('lvl_2'); step(16);
    putSolved(f.S, f.D.LEVELS[1], f.D.LEVELS[1].solution[0].id);
    f.S.timeLeft = 55; f.S.steps = 4;
    f.D.fireBtn('back_levels'); step(16);
    check('先在第 2 关留下快照', f.S.save.resume && f.S.save.resume.lv === 1,
      JSON.stringify(f.S.save.resume && f.S.save.resume.lv));
    f.D.fireBtn('lvl_3'); step(16);          // 点错关，一下没动
    f.D.fireBtn('back_levels'); step(16);
    check('点错关立刻退出 → 不冲掉第 2 关的快照',
      f.S.save.resume && f.S.save.resume.lv === 1,
      JSON.stringify(f.S.save.resume && f.S.save.resume.lv));
  }

  /* ================= 6. 存档兼容与云合并 ================= */
  section('6. 老存档兼容 / 云合并');
  {
    /* 前面的小节 useSet('tangram7') 过，模块级"当前数据集"还停在七巧板，
     * 所以存档键不能写死 —— 先建一个实例问它用哪个 key，再往那个 key 写老存档。 */
    Object.keys(store).forEach(k => delete store[k]);
    env.tutorial = false;
    const g = CORE(env);
    /* 两个数据集的 key 都写一份 —— 前面的小节切过七巧板，模块级默认集不确定，
     * 这里只关心"老存档（没有 resume 字段）能不能正常载入"。 */
    const old = { starOf: { '1': 2 }, coin: 90, energy: 12, energyMax: 16, unlockedMax: 2 };
    store['tangram_save_v1'] = JSON.stringify(old);
    store['tangram7_save_v1'] = JSON.stringify(old);
    g.init(); step(16);
    check('老存档没有 resume 字段 → 载入为 null', g.state.save.resume === null,
      JSON.stringify(g.state.save.resume));
    check('老存档的星级没被冲掉', g.state.save.starOf['1'] === 2,
      JSON.stringify(g.state.save.starOf));

    const m = g._debug.mergeSave(
      { resume: { lv: 3 }, updatedAt: 2, starOf: {}, streakSeen: [] },
      { resume: { lv: 0 }, updatedAt: 1, starOf: {}, streakSeen: [] });
    check('mergeSave 的 resume 跟较新那份走', m.resume && m.resume.lv === 3,
      JSON.stringify(m.resume));
    const m2 = g._debug.mergeSave(
      { resume: null, updatedAt: 9, starOf: {}, streakSeen: [] },
      { resume: { lv: 2 }, updatedAt: 3, starOf: {}, streakSeen: [] });
    check('较新那份没有快照 → 结果就是 null（不拿旧的顶上）', m2.resume === null,
      JSON.stringify(m2.resume));
  }

  /* ================= 7. 三端一致 / 包体 ================= */
  section('7. 三端一致性与包体积');
  for (const f of ['config', 'core', 'judge', 'geom', 'levels']) {
    const a = md5(path.join(ROOT, 'js', f + '.js'));
    const b = md5(path.join(ROOT, 'preview/js', f + '.js'));
    const c = md5(path.join(ROOT, 'miniprogram/js', f + '.js'));
    check(`${f}.js 三端 md5 一致`, a === b && a === c, a === b && a === c ? 'same' : 'diff');
  }
  let bytes = 0;
  (function walk(d) {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f);
      const st = fs.statSync(p);
      if (st.isDirectory()) { if (f !== 'node_modules' && f !== '.git') walk(p); }
      else bytes += st.size;
    }
  })(path.join(ROOT, 'miniprogram'));
  check('小游戏主包 < 4MB', bytes < 4 * 1024 * 1024, (bytes / 1048576).toFixed(2) + 'MB');

  console.log(fail ? `\n${fail} 项未通过` : '\nv0.26 验收全部通过');
  process.exit(fail ? 1 : 0);
})();
