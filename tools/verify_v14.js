/* v0.14 专项验收：微信登录态 + 玩家资料（昵称 / 头像）
 * 用法：node tools/verify_v14.js
 *
 * 覆盖：
 *   1) 平台层 wxprofile.js 的四种真实情况：已授权静默拿、未授权等点按钮、
 *      匿名返回（「微信用户」）判无效、改昵称走 showKeyboard；
 *   2) core 侧：资料落盘 / 云端覆盖规则 / 设置页版式与按钮态 / 榜单头像；
 *   3) 云函数 player 的资料清洗与返回字段；
 *   4) 三端 md5 与主包体积。
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');

/* ---------- 记录型 ctx ---------- */
const rec = { ops: [], texts: [], imgs: [] };
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
      rec.texts.push({ s: String(s), x, y, color: base.fillStyle, alpha: base.globalAlpha, seq: ++seq });
    },
    stroke() { rec.ops.push({ k: 'stroke', color: base.strokeStyle, a: base.globalAlpha, seq: ++seq }); },
    fill() { rec.ops.push({ k: 'fill', color: base.fillStyle, a: base.globalAlpha, seq: ++seq }); },
    fillRect() { rec.ops.push({ k: 'fill', color: base.fillStyle, a: base.globalAlpha, seq: ++seq }); },
    drawImage(img, x, y, w, h) {
      rec.imgs.push({ src: img && img._src, x, y, w, h, seq: ++seq });
    },
    arc() {}, moveTo() {}, lineTo() {},
    setLineDash(d) { base._dash = d; },
    save() { this._st = { a: base.globalAlpha }; },
    restore() { if (this._st) base.globalAlpha = this._st.a; },
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

let pendingFrame = null;
global.requestAnimationFrame = cb => { pendingFrame = cb; return 1; };
let clock = 0;
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
const PROFILE_LIB = require(path.join(ROOT, 'miniprogram/js/wxprofile.js'));

let fail = 0;
function check(label, ok, detail) {
  if (!ok) fail++;
  console.log(`  [${ok ? 'OK' : 'XX'}] ${label}${detail ? '  ' + detail : ''}`);
}
function section(t) { console.log('\n== ' + t + ' =='); }

/* ---------- 假 wx：把「授权 / 匿名 / 键盘 / 头像图」都做成可控的 ---------- */
const WX = {
  setting: { authSetting: {} },
  userInfo: { nickName: '古月三金', avatarUrl: 'https://thirdwx.qlogo.cn/mmopen/a/b/132' },
  failInfo: false,
  btns: [],
  kb: null, kbConfirm: null, kbComplete: null,
  getSetting(o) { setTimeout(() => o.success({ authSetting: WX.setting.authSetting }), 0); },
  getUserInfo(o) {
    setTimeout(() => {
      if (WX.failInfo) o.fail({ errMsg: 'getUserInfo:fail auth deny' });
      else o.success({ userInfo: WX.userInfo, rawData: '{}' });
    }, 0);
  },
  createUserInfoButton(opt) {
    const b = {
      opt, shown: false, destroyed: false, tap: null,
      onTap(fn) { b.tap = fn; }, show() { b.shown = true; }, hide() { b.shown = false; },
      destroy() { b.destroyed = true; }
    };
    WX.btns.push(b);
    return b;
  },
  createImage() {
    const im = { onload: null, onerror: null, _src: '' };
    Object.defineProperty(im, 'src', {
      get() { return im._src; },
      set(v) {
        im._src = v;
        setTimeout(() => {
          if (/bad|undefined/.test(v)) { im.onerror && im.onerror(); } else { im.onload && im.onload(); }
        }, 0);
      }
    });
    return im;
  },
  showKeyboard(o) { WX.kb = o; },
  hideKeyboard() {},
  onKeyboardConfirm(fn) { WX.kbConfirm = fn; },
  onKeyboardComplete(fn) { WX.kbComplete = fn; },
  requirePrivacyAuthorize(o) { setTimeout(() => { o && o.success && o.success(); }, 0); }
};
global.wx = WX;

/* ---------- env 工厂 ---------- */
function mkEnv(cloudImpl, profileImpl, store) {
  return {
    ctx: makeCtx(),
  tutorial: false,   // v0.21：这些脚本专测横向系统，关掉第 1 关教学
    size: () => ({ w: 375, h: 812 }),
    dpr: () => 3,
    safeInsets: () => ({ top: 20, bottom: 0 }),
    bindInput(fn) { this._in = fn; },
    storage: { get: k => (k in store ? store[k] : null), set: (k, v) => { store[k] = v; } },
    audio: { unlock() {}, setEnabled() {}, play() {}, duck() {}, setVisible() {}, setScene() {} },
    vibrate() {}, images: {},
    share() {}, onHide() {}, onShow() {},
    cloud: cloudImpl,
    profile: profileImpl,
    ad: { placeholder: true, banner() {}, rewarded(k, cb) { cb(true, ''); } }
  };
}
function noCloud() {
  return {
    enabled: () => false,
    init(cb) { setTimeout(() => cb({ msg: 'no-cloud' }), 0); },
    load(cb) { setTimeout(() => cb({ msg: 'no-cloud' }), 0); },
    save(p, cb) { setTimeout(() => cb(null, {}), 0); },
    rank(t, cb) { setTimeout(() => cb(null, { list: [], me: null }), 0); }
  };
}
const SCALE = Math.min(375 / CFG.DESIGN.w, 812 / CFG.DESIGN.h);

async function main() {
  console.log('v0.14 验收：微信登录态 + 玩家资料（昵称/头像）');
  check('版本号 v0.14+', /^v0\.\d+(\.\d+)?$/.test(CFG.version), CFG.version);

  /* ================= 1. 平台层：wxprofile ================= */
  section('1. 平台层 wxprofile（四种真实情况）');
  WX.setting.authSetting = {};
  WX.userInfo = { nickName: '古月三金', avatarUrl: 'https://thirdwx.qlogo.cn/mmopen/a/b/132' };
  WX.failInfo = false;
  WX.btns.length = 0;

  const P1 = PROFILE_LIB.createProfile();
  check('支持微信资料（有 getUserInfo/createUserInfoButton）', P1.enabled() && P1.canAuth());

  /* 1.1 未授权：request 不能假装成功，要提示去点原生按钮 */
  let r1 = await new Promise(res => P1.request((err, p) => res({ err, p })));
  check('未授权时 request 返回错误而不是假资料', !!r1.err && !r1.p, (r1.err && r1.err.msg) || '');
  check('错误文案指向「点按钮」或「改昵称」', /按钮|昵称/.test((r1.err && r1.err.msg) || ''));

  /* 1.2 原生按钮：定位 + 幂等 + 销毁 */
  const rect = { left: 100, top: 300, width: 200, height: 40, fontSize: 14, label: '使用微信昵称头像' };
  check('place() 建出原生按钮', P1.place(rect) === true && WX.btns.length === 1);
  const b0 = WX.btns[0];
  check('按钮尺寸取 CSS px（不跟画布缩放）',
    Math.abs(b0.opt.style.width - 200) < 0.5 && Math.abs(b0.opt.style.height - 40) < 0.5,
    `${b0.opt.style.width}×${b0.opt.style.height}`);
  check('按钮文案来自配置', b0.opt.text === CFG.PLAYER.authLabel, b0.opt.text);
  P1.place(rect);
  check('同样矩形再 place 不重复建按钮（每帧调用安全）', WX.btns.length === 1, 'btns=' + WX.btns.length);
  P1.place(Object.assign({}, rect, { top: 320 }));
  check('矩形变了重建一个（转屏/换版式）', WX.btns.length === 2, 'btns=' + WX.btns.length);

  /* 1.3 玩家点按钮 → 拿到真实资料 */
  let got = null;
  P1.onChange(p => { got = p; });
  WX.setting.authSetting = { 'scope.userInfo': true };
  WX.btns[WX.btns.length - 1].tap({ userInfo: WX.userInfo, errMsg: 'getUserInfo:ok' });
  await delay(10);
  check('授权回调把昵称头像交给上层', !!got && got.nick === '古月三金' && !!got.avatar, JSON.stringify(got));
  check('授权后 src=wx、auth=true', got && got.src === 'wx' && got.auth === true);

  /* 1.4 匿名返回：判无效，绝不用「微信用户」覆盖 */
  const P2 = PROFILE_LIB.createProfile();
  WX.userInfo = { nickName: '微信用户', avatarUrl: 'https://thirdwx.qlogo.cn/mmopen/a/b/132' };
  let r2 = await new Promise(res => P2.request((err, p) => res({ err, p })));
  check('匿名资料（微信用户）视为失败', !!r2.err && !r2.p, (r2.err && r2.err.msg) || '');
  check('失败文案说明要自己起昵称', /昵称/.test((r2.err && r2.err.msg) || ''));

  /* 1.5 已授权静默拿 */
  WX.userInfo = { nickName: '古月三金', avatarUrl: 'https://thirdwx.qlogo.cn/mmopen/a/b/132' };
  const P3 = PROFILE_LIB.createProfile();
  let r3 = await new Promise(res => P3.request((err, p) => res({ err, p })));
  check('已授权时 request 直接拿到资料（无弹窗）', !r3.err && r3.p && r3.p.nick === '古月三金');

  /* 1.6 头像图缓存 */
  const P4 = PROFILE_LIB.createProfile();
  const url = 'https://thirdwx.qlogo.cn/mmopen/a/b/132';
  check('头像图首帧返回 null（未加载完，先画首字）', P4.imageOf(url) === null);
  await delay(10);
  check('图加载完返回 Image', !!P4.imageOf(url));
  check('坏图不会反复重试也不会抛异常', P4.imageOf('https://x/bad.png') === null);
  await delay(10);
  check('坏图仍返回 null（退回首字头像）', P4.imageOf('https://x/bad.png') === null);

  /* 1.7 改昵称：showKeyboard → onKeyboardConfirm */
  const P5 = PROFILE_LIB.createProfile();
  const kb = new Promise(res => P5.rename('旧名', (err, v) => res({ err, v })));
  check('唤起了系统键盘并带上当前昵称', !!WX.kb && WX.kb.defaultValue === '旧名', WX.kb && WX.kb.defaultValue);
  check('键盘长度上限取配置', WX.kb && WX.kb.maxLength === CFG.PLAYER.nickMax, String(WX.kb && WX.kb.maxLength));
  WX.kbConfirm({ value: '拼图小将' });
  const kbRes = await kb;
  check('确认键把新昵称回调给上层', kbRes.v === '拼图小将', JSON.stringify(kbRes));

  /* ================= 2. core 集成 ================= */
  section('2. core：资料落盘 / 设置页 / 榜单');
  /* 换成「新用户」：没授权过、也没建过按钮 */
  WX.setting.authSetting = {};
  WX.userInfo = { nickName: '古月三金', avatarUrl: url };
  WX.btns.length = 0;
  const store = {};
  const Prof = PROFILE_LIB.createProfile();
  const env = mkEnv(noCloud(), Prof, store);
  const game = CORE(env);
  game.init();
  const S = game.state, D = game._debug;
  await delay(20);

  check('默认身份是占位名（云端化名前）', /巧手/.test(D.meNick()), D.meNick());

  /* 2.1 设置页版式 */
  S.overlay = 'settings';
  rec.texts.length = 0; rec.ops.length = 0;
  step(16);
  const txt = () => rec.texts.map(t => t.s).join('|');
  check('设置页有「玩家资料」状态文案', /未授权|系统化名/.test(txt()), txt().slice(-90));
  check('未授权时主按钮是「使用微信昵称头像」', txt().indexOf(CFG.PLAYER.authLabel) >= 0);
  const coreBtn = WX.btns[WX.btns.length - 1];
  check('画布按钮上盖了原生按钮', !!coreBtn && coreBtn.shown === true && coreBtn.opt.text === CFG.PLAYER.authLabel);
  const expW = CFG.PLAYER.authBtn.w * SCALE;
  check('原生按钮宽度与画布按钮一致', !!coreBtn && Math.abs(coreBtn.opt.style.width - expW) < 1.5,
    coreBtn ? `${coreBtn.opt.style.width.toFixed(1)} vs ${expW.toFixed(1)}` : 'no btn');
  check('原生按钮位置落在画布按钮中心', !!coreBtn &&
    Math.abs((coreBtn.opt.style.left + coreBtn.opt.style.width / 2) - (CFG.DESIGN.w / 2) * SCALE) < 2,
    coreBtn ? String(coreBtn.opt.style.left) : '');
  /* 卡片不越界：设计稿 1624 高 */
  const cardTop = CFG.DESIGN.h / 2 - 406, cardBottom = CFG.DESIGN.h / 2 + 406;
  check('设置卡片在画布内', cardTop > 0 && cardBottom < CFG.DESIGN.h, `${cardTop}~${cardBottom}`);

  /* 2.2 授权成功 → 名字/头像/落盘 */
  coreBtn.tap({ userInfo: { nickName: '古月三金', avatarUrl: url }, errMsg: 'getUserInfo:ok' });
  await delay(10);
  check('授权后昵称变成微信昵称', D.meNick() === '古月三金', D.meNick());
  check('授权后 auth=true', S.me.auth === true);
  check('资料写进本地存档（断网也记得）',
    !!S.save.profile && S.save.profile.nick === '古月三金', JSON.stringify(S.save.profile));
  const stored = JSON.parse(store[CFG.SAVE_KEY] || '{}');
  check('本地 JSON 里也有 profile', !!stored.profile && stored.profile.nick === '古月三金');
  rec.texts.length = 0;
  step(16);
  check('设置页改显示「微信昵称头像已授权」', txt().indexOf('微信昵称头像已授权') >= 0, txt().slice(0, 80));
  check('已授权后主按钮变「改昵称」', txt().indexOf('改昵称') >= 0);
  check('已授权后撤掉原生按钮', coreBtn.destroyed === true);

  /* 2.3 头像真的画出来了（drawImage 而不是只有首字） */
  await delay(10);
  rec.imgs.length = 0;
  step(16);
  check('设置页头像用 drawImage 画微信头像', rec.imgs.length >= 1, 'imgs=' + rec.imgs.length);

  /* 2.4 改昵称 */
  D.renameProfile();
  await delay(10);
  WX.kbConfirm({ value: '七巧小将' });
  await delay(10);
  check('改昵称生效', D.meNick() === '七巧小将', D.meNick());
  check('改名后仍是已授权（头像保留）', S.me.auth === true && S.me.avatar === url);
  check('改名后 src=custom', S.me.src === 'custom', S.me.src);

  /* 2.5 榜单：自己那行用资料名 + 头像 */
  S.rankList = {
    list: [
      { nick: '张三', v: 9, avatar: url },
      { nick: '七巧小将', v: 7, me: true, avatar: url }
    ],
    me: { nick: '七巧小将', v: 7, rank: 2 }
  };
  S.rankTab = 0; S.overlay = 'rank'; S.rankT = 999;
  rec.texts.length = 0; rec.imgs.length = 0;
  step(16);
  check('榜单显示玩家昵称', rec.texts.some(t => t.s === '七巧小将'), txt().slice(0, 80));
  check('榜单每行都有头像图', rec.imgs.length >= 2, 'imgs=' + rec.imgs.length);
  check('云端榜数据带 avatar 字段被读到', rec.imgs.some(i => i.src === url));
  S.overlay = null;

  /* 2.7 老玩家：此前授权过 → 启动静默刷新，全程无弹窗 */
  WX.setting.authSetting = { 'scope.userInfo': true };
  WX.userInfo = { nickName: '古月三金', avatarUrl: 'https://thirdwx.qlogo.cn/mmopen/c/d/132' };
  const gBoot = CORE(mkEnv(noCloud(), PROFILE_LIB.createProfile(), {}));
  gBoot.init();
  await delay(30);
  check('已授权老玩家进游戏自动带上微信昵称', gBoot._debug.meNick() === '古月三金', gBoot._debug.meNick());
  check('头像也跟着刷新（换了微信头像能跟上）',
    /thirdwx\.qlogo\.cn\/mmopen\/c/.test(gBoot.state.me.avatar), gBoot.state.me.avatar);
  WX.setting.authSetting = {};                       // 后面的用例按「新用户」跑

  /* 2.8 云端覆盖规则 */
  section('3. 云端资料覆盖规则');
  const store2 = {
    [CFG.SAVE_KEY]: JSON.stringify({
      profile: { nick: '我自己起的名', avatar: '', src: 'custom', auth: false },
      updatedAt: 1
    })
  };
  const cloudAuto = {
    enabled: () => true,
    init(cb) { setTimeout(() => cb(null, { openid: 'o1', nick: '巧手0001', avatar: '', src: 'auto', auth: false }), 0); },
    load(cb) { setTimeout(() => cb(null, { sets: {}, updatedAt: 0 }), 0); },
    save(p, cb) { setTimeout(() => cb(null, { nick: '巧手0001' }), 0); },
    rank(t, cb) { setTimeout(() => cb(null, { list: [], me: null }), 0); }
  };
  const g2 = CORE(mkEnv(cloudAuto, PROFILE_LIB.createProfile(), store2));
  g2.init();
  await delay(30);
  check('云端还是化名时，不覆盖本地自定义名', g2._debug.meNick() === '我自己起的名', g2._debug.meNick());

  const store3 = { [CFG.SAVE_KEY]: JSON.stringify({ updatedAt: 1 }) };
  const cloudWx = {
    enabled: () => true,
    init(cb) { setTimeout(() => cb(null, { openid: 'o2', nick: '古月三金', avatar: url, src: 'wx', auth: true }), 0); },
    load(cb) { setTimeout(() => cb(null, { sets: {}, updatedAt: 0 }), 0); },
    save(p, cb) { setTimeout(() => cb(null, {}), 0); },
    rank(t, cb) { setTimeout(() => cb(null, { list: [], me: null }), 0); }
  };
  const g3 = CORE(mkEnv(cloudWx, PROFILE_LIB.createProfile(), store3));
  g3.init();
  await delay(60);
  check('换设备时云端微信资料覆盖本地', g3._debug.meNick() === '古月三金', g3._debug.meNick());
  check('换设备后 auth=true（还认这张头像）', g3.state.me.auth === true);
  check('同步状态显示「已同步 · 昵称」', /已同步 · 古月三金/.test(g3._debug.netText()), g3._debug.netText());

  /* ================= 4. 云函数与源码约束 ================= */
  section('4. 云函数 player 与源码约束');
  const fnSrc = fs.readFileSync(path.join(ROOT, 'miniprogram/cloudfunctions/player/index.js'), 'utf8');
  check('login 返回 avatar/src/auth', /login[\s\S]{0,400}avatar: p\.avatar/.test(fnSrc));
  check('有 profile 分支（轻量改名）', /action === 'profile'/.test(fnSrc));
  check('sync 会带资料一起写', /cleanNick\(prof\.nick\)/.test(fnSrc));
  check('头像只收 https', /https:\\\/\\\/\[\^\\s\]\+/.test(fnSrc) || /cleanAvatar/.test(fnSrc));
  check('昵称长度上限 12 且与配置一致', /MAX_NICK = 12/.test(fnSrc) && CFG.PLAYER.nickMax === 12);
  check('榜单返回 avatar', /avatar: p\.avatar \|\| ''/.test(fnSrc));

  const coreSrc = fs.readFileSync(path.join(ROOT, 'js/core.js'), 'utf8');
  const coreCode = coreSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  check('core 里不出现 wx.*（平台差异全在适配层）', !/\bwx\./.test(coreCode));
  check('core 有 drawAvatar 供设置页与榜单复用', /function drawAvatar/.test(coreSrc));
  const miniSrc = fs.readFileSync(path.join(ROOT, 'miniprogram/game.js'), 'utf8');
  check('小程序端注入了 env.profile', /profile:\s*profileLib\.createProfile\(\)/.test(miniSrc));
  check('资料层只在 miniprogram/js（不进共享包）',
    fs.existsSync(path.join(ROOT, 'miniprogram/js/wxprofile.js')) &&
    !fs.existsSync(path.join(ROOT, 'js/wxprofile.js')));
  const pvSrc = fs.readFileSync(path.join(ROOT, 'preview/js/game.js'), 'utf8');
  check('网页预览没有接 wxprofile（无 wx 环境）', !/wxprofile/.test(pvSrc));

  /* ================= 5. md5 与包体 ================= */
  section('5. 三端一致与包体');
  const md5 = p => crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex');
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
      const p = path.join(dir, f);
      const st = fs.statSync(p);
      if (st.isDirectory()) total += walkSize(p); else total += st.size;
    }
    return total;
  }
  const pkg = walkSize(path.join(ROOT, 'miniprogram'));
  check('主包 < 4MB', pkg < 4 * 1024 * 1024, (pkg / 1024 / 1024).toFixed(2) + 'MB');

  console.log('\n' + (fail === 0 ? 'v0.14 全部通过' : `!! ${fail} 项未通过`));
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
