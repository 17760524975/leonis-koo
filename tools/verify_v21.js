/* v0.21 专项验收：① 刷新按钮不再重置倒计时 ② 每类游戏第 1 关做教学
 * 用法：node tools/verify_v21.js
 *
 * 用户这版两条需求：
 *   ① 刷新按钮不应该把倒计时都刷新了；
 *   ② 每类游戏（四巧板 / 七巧板）的第 1 关都要做成教学，参考视频的做法。
 *
 * 教学这一条按参考视频的行为立断言：
 *   · 第 1 关里把「标准解」淡显成彩色虚影（有参照物）
 *   · 卡纸顶部一行指令，且指令随「下一块还差什么」切换 拖 / 翻 / 转
 *   · 教学关冻结倒计时（视频里一直是 00:30）
 *   · 教过一次就记进存档，第 2 关起不再出现；可随时跳过
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
    stroke() { rec.ops.push({ k: 'stroke', color: base.strokeStyle, a: base.globalAlpha }); },
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
const env = {
  ctx: makeCtx(),
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
  ad: { placeholder: true, banner() {}, rewarded(kind, cb) { cb(true, ''); } }
};

/* 把一块直接摆到标准解位置（模拟玩家照着虚影拼） */
function putSolved(S, lv, id) {
  const st = lv.solution.filter(x => x.id === id)[0];
  const p = S.pieces.filter(x => x.id === id)[0];
  if (!st || !p) return;
  p.onBoard = true; p.x = st.x; p.y = st.y;
  p.angle = st.angle; p.dAngle = st.angle;
  p.flipped = !!st.flipped; p.dFlipped = p.flipped;
}

(async function main() {
  console.log('v0.21 验收：刷新不重置倒计时 / 每类第 1 关教学');
  const game = CORE(env);
  game.init();
  step(16);
  const S = game.state, D = game._debug, T = CFG.TUTORIAL;

  /* ================= 1. 版本与配置 ================= */
  section('1. 版本与教学配置');
  check('版本 v0.21 起（v0.23 继续沿用本版规则）', /^v0\.2[1-9](\.\d+)?$/.test(CFG.version), CFG.version);
  check('教学开关 + 只教第 1 关', T && T.on === true && T.levels === 1, `on=${T && T.on} levels=${T && T.levels}`);
  check('教学关冻结倒计时', T.freezeTimer === true);
  check('虚影透明度在 0.2~0.5 之间（看得见但不糊住板件）',
    T.ghostAlpha > 0.2 && T.ghostAlpha < 0.5, 'ghostAlpha=' + T.ghostAlpha);
  check('指令行落在卡纸顶部空白带（302+textY < 轮廓最高点 503）',
    CFG.LAYOUT.BOARD.y + T.textY < 503, `y=${CFG.LAYOUT.BOARD.y + T.textY}`);

  /* ================= 2. 刷新不重置倒计时 ================= */
  section('2. 重开（工具栏刷新）不再重置倒计时');
  D.go('play'); D.setupLevel(0);
  /* v0.25：教学是否出现改看"第 1 关通没通关"，不再看 tutDone。
   * 这一节只想单独测计时，所以先把第 1 关标成已通关，把教学摘掉。 */
  S.save.starOf['1'] = 3;
  D.setupLevel(0);
  check('进关 → 教学不出现（第 1 关已通关）', !S.tut);
  S.timeLeft = 30; S.timeLimit = 195; S.elapsed = 12; S.reviveUsed = 1;
  S.hearts = D.heartsOf(30, 195);
  const hearts0 = S.hearts;
  D.fireBtn('restart'); step(16);
  check('刷新后倒计时仍是 30s（旧版会回满 195s）', Math.abs(S.timeLeft - 30) < 0.1,
    'timeLeft=' + S.timeLeft.toFixed(2));
  check('刷新后生命值跟着剩余时间（不回满 3 心）', S.hearts === hearts0, `hearts=${S.hearts} expect=${hearts0}`);
  check('刷新后已用复活次数不被退还', S.reviveUsed === 1, 'reviveUsed=' + S.reviveUsed);
  check('刷新后用时继续累计（不给"重开就重算"的机会）', S.elapsed >= 12, 'elapsed=' + S.elapsed);
  check('刷新确实把板子放回托盘', S.pieces.every(p => !p.onBoard), S.pieces.map(p => p.onBoard ? 1 : 0).join(''));
  check('刷新后提示/选中状态清空', !S.hint && !S.selId);

  /* 快进 3 秒：倒计时继续走，证明"不重置"不是"冻结" */
  const before = S.timeLeft;
  for (let i = 0; i < 8; i++) step(120);
  check('刷新后倒计时照常递减（没有变成"冻结"）',
    before - S.timeLeft > 0.3, `${before.toFixed(2)}→${S.timeLeft.toFixed(2)}`);

  section('2b. 换关 / 结算重玩仍然重置倒计时');
  D.setupLevel(3);
  check('换到第 4 关 → 倒计时回满', Math.abs(S.timeLeft - S.timeLimit) < 0.001,
    `${S.timeLeft}/${S.timeLimit}`);
  S.timeLeft = 5; S.reviveUsed = 2; S.overlay = 'result'; S.win = { t: 0 };
  S.result = { stars: 3, time: 10, steps: 5 };
  D.fireBtn('replay'); step(16);
  check('结算页「再来一次」→ 倒计时回满（这是新的一局）',
    Math.abs(S.timeLeft - S.timeLimit) < 0.1, `${S.timeLeft.toFixed(2)}/${S.timeLimit}`);
  check('结算页「再来一次」→ 复活次数归零', S.reviveUsed === 0, 'reviveUsed=' + S.reviveUsed);

  /* ================= 3. 教学只在每类第 1 关 ================= */
  section('3. 教学与关号 / 数据集的关系');
  store['tangram_save_v1'] = null; delete store['tangram_save_v1'];
  delete store['tangram7_save_v1'];
  const g2 = CORE(env); g2.init(); step(16);
  const S2 = g2.state, D2 = g2._debug;
  D2.go('play'); D2.setupLevel(0);
  check('四巧板第 1 关 → 进教学', !!S2.tut);
  D2.setupLevel(1);
  check('四巧板第 2 关 → 没有教学', !S2.tut);
  D2.setupLevel(0);
  check('回到第 1 关 → 教学还在（没教完就不会跳过关卡）', !!S2.tut);

  D2.useSet('tangram7');
  D2.go('play'); D2.setupLevel(0);
  check('七巧板第 1 关 → 独立一段教学（两套各有自己的"第一关"）', !!S2.tut);
  D2.setupLevel(1);
  check('七巧板第 2 关 → 没有教学', !S2.tut);

  /* ================= 4. 教学三步：拖 → 翻 → 转 ================= */
  section('4. 指令跟着"下一块还差什么"走');
  D2.useSet('tangram4');
  D2.go('play'); D2.setupLevel(0);
  const L4 = D2.LEVELS[0];
  let st0 = D2.tutStep();
  check('初始指令 = 拖（指向 solution 里第一块）',
    st0 && st0.kind === 'drag' && st0.id === L4.solution[0].id,
    st0 && `${st0.kind}/${st0.id}`);
  check('指令文案里有具体动作（拖进来）', /拖进来/.test(st0.text), st0.text);

  rec.texts.length = 0; step(16);
  check('虚影真的画出来了（同一帧里有多块半透明填充）',
    rec.ops.filter(o => o.k === 'fill' && o.a > 0.2 && o.a < 0.5).length >= 2,
    'alpha 层数=' + rec.ops.filter(o => o.k === 'fill' && o.a > 0.2 && o.a < 0.5).length);
  check('顶部指令画在卡纸上（y 落在 302~380 之间）',
    rec.texts.some(t => /拖进来/.test(t.s) && t.y > 302 && t.y < 400),
    rec.texts.filter(t => /拖进来/.test(t.s)).map(t => Math.round(t.y)).join(','));
  check('右下角有「跳过教学」出口', rec.texts.some(t => t.s === T.skipText), T.skipText);

  /* 四巧板第 1 关：A D B 摆对后，C 需要翻面 */
  putSolved(S2, L4, 'A'); putSolved(S2, L4, 'D'); putSolved(S2, L4, 'B');
  check('前三块摆对 → 指令仍指向最后那块 C（先拖进来）',
    (() => { const x = D2.tutStep(); return x && x.kind === 'drag' && x.id === 'C'; })(),
    (() => { const x = D2.tutStep(); return x && x.kind + '/' + x.id; })());
  /* C 拖到位但翻面反了 → 该教翻 */
  const pc = S2.pieces.filter(p => p.id === 'C')[0];
  const stc = L4.solution.filter(s => s.id === 'C')[0];
  pc.onBoard = true; pc.x = stc.x; pc.y = stc.y;
  pc.angle = stc.angle; pc.dAngle = stc.angle;
  pc.flipped = !stc.flipped; pc.dFlipped = pc.flipped;
  let stF = D2.tutStep();
  check('C 拖到位但翻面反着 → 指令切到"翻面"',
    stF && stF.kind === 'flip' && stF.id === 'C', stF && `${stF.kind}/${stF.id}`);
  check('翻面文案提到双击', /双击/.test(stF.text), stF.text);
  pc.flipped = stc.flipped; pc.dFlipped = pc.flipped;
  pc.angle = (stc.angle + 40) % 360; pc.dAngle = pc.angle;
  const stR = D2.tutStep();
  check('翻对了但角度歪 40° → 指令切到"转"', stR && stR.kind === 'rot', stR && stR.kind);
  step(16);
  check('转的教学会把那块自动选中（旋转手柄才在屏幕上）', S2.selId === 'C', 'selId=' + S2.selId);
  putSolved(S2, L4, 'C');
  check('最后一块对了 → tutStep 返回 null（教学收尾）', D2.tutStep() === null);

  section('5. 教学关的收尾：自动完成 / 跳过 / 不再打扰');
  {
    delete store['tangram_save_v1'];
    const g3 = CORE(env); g3.init(); step(16);
    const S3 = g3.state, D3 = g3._debug;
    D3.go('play'); D3.setupLevel(0);
    check('新存档第一次进第 1 关 → 教学出现', !!S3.tut);
    /* 冻结计时 */
    const t0 = S3.timeLeft;
    for (let i = 0; i < 10; i++) step(500);
    check('教学关 5 秒不扣时间（参考视频里倒计时一直是 00:30）',
      Math.abs(S3.timeLeft - t0) < 0.001, `${t0}→${S3.timeLeft}`);
    /* 提示被拦 */
    S3.save.hintItems = 1;
    const coin0 = S3.save.coin, item0 = S3.save.hintItems;
    D3.fireBtn('hint'); step(16);
    D3.useHintItem();
    check('教学关买提示 → 不扣道具、只提示"不用买"',
      S3.save.hintItems === item0 && S3.save.coin === coin0 && S3.toast && /教学关不用买提示/.test(S3.toast.text),
      `items=${item0}→${S3.save.hintItems} toast=${S3.toast && S3.toast.text}`);
    S3.overlay = null;

    /* 全部拼对 → 自动收起（v0.25：收起只关本次，不落档） */
    const L3 = D3.LEVELS[0];
    L3.solution.forEach(s => putSolved(S3, L3, s.id));
    step(16);
    check('全部摆对 → 教学自动收起', !S3.tut);
    check('收起不写存档标记（判据已换成通关与否）', S3.save.tutDone === undefined,
      JSON.stringify(S3.save.tutDone));
    check('收尾有一句"教学完成"', S3.toast && /教学完成/.test(S3.toast.text), S3.toast && S3.toast.text);
    S3.save.starOf['1'] = 1;                      // 视为已通关
    D3.setupLevel(0);
    check('第 1 关通关后 → 再进不再出现', !S3.tut);

    /* 跳过路径 */
    delete store['tangram_save_v1'];
    const g4 = CORE(env); g4.init(); step(16);
    const S4 = g4.state, D4 = g4._debug;
    D4.go('play'); D4.setupLevel(0);
    check('新玩家 → 教学出现', !!S4.tut);
    D4.fireBtn('tut_skip'); step(16);
    check('点「跳过教学」→ 立刻收起', !S4.tut);
    check('跳过不落档（未通关时下次还会教）', S4.save.tutDone === undefined,
      JSON.stringify(S4.save.tutDone));
    D4.setupLevel(0);
    check('跳过后再进第 1 关（仍未通关）→ 仍会教', !!S4.tut);
  }

  /* ================= 6. 不误伤既有功能 ================= */
  section('6. 回归：教学与新计时不破坏原逻辑');
  delete store['tangram_save_v1'];
  const g5 = CORE(env); g5.init(); step(16);
  const S5 = g5.state, D5 = g5._debug;
  D5.go('play'); D5.setupLevel(2);   // 第 3 关，非教学
  check('普通关卡没有虚影、没有指令行', !S5.tut);
  S5.save.hintItems = 1;
  D5.fireBtn('hint'); step(16);
  D5.useHintItem();
  check('普通关卡提示照常可用', !!S5.hint, 'hint=' + (S5.hint && S5.hint.id));
  D5.fireBtn('restart'); step(16);
  check('重开清掉提示（否则会指着一块已经回托盘的板）', !S5.hint);

  /* ================= 7. 三端一致 ================= */
  section('7. 三端一致 + 版本号');
  for (const m of ['config', 'core', 'geom', 'judge', 'levels']) {
    const a = md5(path.join(ROOT, 'js', m + '.js'));
    const b = md5(path.join(ROOT, 'preview', 'js', m + '.js'));
    const c = md5(path.join(ROOT, 'miniprogram', 'js', m + '.js'));
    check(`${m}.js 三端一致`, a === b && a === c, a.slice(0, 8));
  }
  const mpProj = JSON.parse(fs.readFileSync(path.join(ROOT, 'miniprogram', 'project.config.json'), 'utf8'));
  check('小程序工程说明跟着版本走（v0.21 起）', /v0\.2\d/.test(mpProj.description || ''), mpProj.description);

  console.log('\n' + (fail === 0 ? 'v0.21 验收全部通过' : `!! ${fail} 项失败`));
  process.exit(fail === 0 ? 0 : 1);
})();
