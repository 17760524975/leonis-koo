/* 四巧板 v0.1 · 核心（页面状态机 + Canvas 渲染 + 输入）
 * 与平台无关：不出现 document / window / localStorage / wx.*。
 * 平台差异全部由 env 适配层提供（见 preview/js/platform_web.js 与 miniprogram/game.js）。
 *
 * env = {
 *   ctx,                      CanvasRenderingContext2D
 *   size() -> {w, h}          画布 CSS 像素尺寸
 *   dpr() -> number
 *   safeInsets() -> {top,bottom}   CSS 像素
 *   bindInput(fn)             fn(type, cssX, cssY)，type: 'down'|'move'|'up'|'cancel'
 *   storage: {get(k), set(k,v)}
 *   audio: {play(name), setEnabled(sfx,bgm), unlock()}
 *   vibrate(ms)
 *   images: {home_bg_desk, board_paper} | {}
 *   onHide(cb), onShow(cb)
 * }
 */
(function (root, factory) {
  var G = root.TANGRAM_GEOM, J = root.TANGRAM_JUDGE, D = root.TANGRAM_DATA, C = root.TANGRAM_CONFIG;
  if (typeof require !== 'undefined') {
    if (!G) G = require('./geom.js');
    if (!J) J = require('./judge.js');
    if (!D) D = require('./levels.js');
    if (!C) C = require('./config.js');
  }
  root.TANGRAM_CORE = factory(G, J, D, C);
  if (typeof module !== 'undefined' && module.exports) module.exports = root.TANGRAM_CORE;
})(typeof window !== 'undefined' ? window : globalThis, function (G, J, D, C) {
  'use strict';

  var COL = C.COLORS, LAY = C.LAYOUT;
  var WS = LAY.BOARD.size / 1000;              // 世界单位 → 设计像素（与数据集无关）

  /* v0.3 Phase 0：两套数据集并存，四巧板零改动。
   * 四巧板仍走 D.dataset / D.levels（现成工具与 harness 的 fake 关卡照旧）；
   * 七巧板走 TANGRAM_SETS.tangram7。切换时只重算下面这组 var —— 后面所有引用
   * 都是闭包变量，重新赋值即自动生效，不用逐处改成查表。 */
  var SETS = D.sets || root.TANGRAM_SETS || null;
  var DEFAULT_SET = D.defaultSet || 'tangram4';
  var FALLBACK_CHAP = ['启蒙', '熟悉', '转折', '嵌套', '交错', '硬骨头'];

  function buildSet(key) {
    var meta = (SETS && SETS[key]) || {};
    var ds = (key === DEFAULT_SET) ? D.dataset : meta.dataset;
    var levels = (key === DEFAULT_SET) ? D.levels : meta.levels;
    var UNIT = ds.unitScale;                 // 缩放走数据集字段，不硬编码
    var LOCAL = {}, TRAY_BB = {}, id;
    for (id in ds.pieces) {
      LOCAL[id] = G.makeLocal(ds.pieces[id].base).map(function (v) { return [v[0] * UNIT, v[1] * UNIT]; });
    }
    /* 每块板的 bbox 中心与尺寸（设计像素）。1:1 摆放时用 bbox 中心对齐槽位中心，
     * 不能用质心——质心在板内部偏一侧，直接对齐会让视觉重心偏移。 */
    for (id in LOCAL) {
      var bb = G.bbox([LOCAL[id]]);
      TRAY_BB[id] = {
        cx: (bb[0] + bb[2]) / 2 * WS, cy: (bb[1] + bb[3]) / 2 * WS,
        w: (bb[2] - bb[0]) * WS, h: (bb[3] - bb[1]) * WS
      };
    }
    /* 托盘槽位：按 DS.pieceOrder 自适应行列；七巧板 7 块用独立 tray 参数，
     * 全部槽位共用 scale=1（严禁逐块 fit-to-slot），拿起后尺寸不突变。 */
    var TRAY = meta.tray || C.LAYOUT.TRAY;
    /* v0.3.4 A1：只覆盖「槽位绘制间距」，不改数据集、不改判定。
     * 覆盖值放 config.LAYOUT.TRAY_OVERRIDE，策划改数只改配置表。 */
    var ovr = C.LAYOUT.TRAY_OVERRIDE && C.LAYOUT.TRAY_OVERRIDE[key];
    if (ovr) {
      var merged = {}, tk;
      for (tk in TRAY) merged[tk] = TRAY[tk];
      for (tk in ovr) merged[tk] = ovr[tk];
      TRAY = merged;
    }
    var order = ds.pieceOrder, n = order.length, cols = TRAY.cols, rows = Math.ceil(n / cols);
    var w = [], h = [], i;
    for (i = 0; i < n; i++) {
      var b = TRAY_BB[order[i]];
      w[i] = Math.max(TRAY.minW, b.w + TRAY.padX * 2);
      h[i] = Math.max(TRAY.minH, b.h + TRAY.padY * 2);
    }
    var colW = [], rowH = [];
    for (i = 0; i < cols; i++) colW[i] = 0;
    for (i = 0; i < rows; i++) rowH[i] = 0;
    for (i = 0; i < n; i++) {
      colW[i % cols] = Math.max(colW[i % cols], w[i]);
      rowH[Math.floor(i / cols)] = Math.max(rowH[Math.floor(i / cols)], h[i]);
    }
    var totalW = (cols - 1) * TRAY.gapX, totalH = (rows - 1) * TRAY.gapY;
    for (i = 0; i < cols; i++) totalW += colW[i];
    for (i = 0; i < rows; i++) totalH += rowH[i];
    var x0 = LAY.BOARD.x + (LAY.BOARD.size - totalW) / 2;
    var band = TRAY.bottom - TRAY.top;
    var y0 = TRAY.top + Math.max(0, (band - totalH) / 2);
    var cx = [], cy = [];
    cx[0] = x0; for (i = 1; i < cols; i++) cx[i] = cx[i - 1] + colW[i - 1] + TRAY.gapX;
    cy[0] = y0; for (i = 1; i < rows; i++) cy[i] = cy[i - 1] + rowH[i - 1] + TRAY.gapY;
    var SLOT_POS = [];
    for (i = 0; i < n; i++) {
      var c = i % cols, r = Math.floor(i / cols);
      SLOT_POS.push({ x: cx[c] + colW[c] / 2, y: cy[r] + rowH[r] / 2, w: colW[c], h: rowH[r] });
    }
    return {
      ds: ds, levels: levels, LOCAL: LOCAL, TRAY_BB: TRAY_BB, SLOT_POS: SLOT_POS,
      chapPer: meta.chapPer || 20, chapNames: meta.chapNames || FALLBACK_CHAP,
      chapTitles: meta.chapTitles || null,
      completeTitle: meta.completeTitle || '', completeSub: meta.completeSub || '',
      saveKey: meta.saveKey || C.SAVE_KEY, snapGrid: meta.snapGrid || null,
      fit: { totalW: totalW, totalH: totalH, band: band, cols: cols, rows: rows }
    };
  }

  var B0 = buildSet(DEFAULT_SET);
  var DS = B0.ds, LEVELS = B0.levels, LOCAL = B0.LOCAL, TRAY_BB = B0.TRAY_BB;
  var SLOT_POS = B0.SLOT_POS, CHAP_PER = B0.chapPer, CHAP_NAMES = B0.chapNames;
  var CHAP_TITLES = B0.chapTitles, COMPLETE_TITLE = B0.completeTitle, COMPLETE_SUB = B0.completeSub;
  var SAVE_KEY = B0.saveKey, SNAP_GRID = B0.snapGrid;
  function w2d(x) { return LAY.BOARD.x + x * WS; }
  function h2d(y) { return LAY.BOARD.y + y * WS; }
  function d2w(x) { return (x - LAY.BOARD.x) / WS; }
  function d2wy(y) { return (y - LAY.BOARD.y) / WS; }

  /* 托盘槽位已移入 buildSet()（按数据集重算），这里不再重复计算。 */
  /* 工具按钮（设计坐标中心） */
  var TOOL_X = (function () {
    var n = 5, total = n * LAY.TOOLBAR.w + (n - 1) * LAY.TOOLBAR.gap;
    var x0 = LAY.BOARD.x + (LAY.BOARD.size - total) / 2;
    var arr = [];
    for (var i = 0; i < n; i++) arr.push(x0 + LAY.TOOLBAR.w / 2 + i * (LAY.TOOLBAR.w + LAY.TOOLBAR.gap));
    return arr;
  })();
  var TOOL_Y = LAY.TOOLBAR.y + LAY.TOOLBAR.h / 2;

  var FONT = '-apple-system, "PingFang SC", "Helvetica Neue", sans-serif';
  function font(size, weight) { return (weight ? weight + ' ' : '') + size + 'px ' + FONT; }

  /* ==================================================================== */
  return function createGame(env) {
    var ctx = env.ctx;
    var state = {
      page: 'home',
      setKey: DEFAULT_SET,        // 当前数据集：tangram4 / tangram7
      overlay: null,
      levelIdx: 0,
      lvPage: 0,            // 关卡页当前章节（0 基）
      pieces: [],
      selId: null,
      drag: null,
      activePointer: false,
      time: 0,
      elapsed: 0,
      running: false,
      steps: 0,
      hintUsed: false,
      hintTier: 2,          // v0.3 A3 当前提示档（1=轮廓+分割线 2=轮廓 3=纯剪影）
      covFrom: 0, covTo: 0, covT: 1, cov: 0,
      msg: '', msgT: 0,
      overlapT: 0,
      overlapPairs: [],
      win: null,
      flower: null,        // v0.3.4 A4a：鲜花绽放时钟（与 win.t 同起点，1000ms 后自动置 null）
      lowFps: false,       // v0.3.4 A4a：持续 <40fps 时卫星花 6→3、关自转
      fade: 1,
      pageT: 0,             // 进页面后经过的毫秒（关卡格错峰入场用）
      hint: null,
      judge: null,
      judgeMs: 0,
      press: null,
      pressT: 0,
      lastTap: null,        // v0.4 A1：双击翻转配对 { id, t }（t 取 nowMs()）；跨场景清空
      save: null,
      settingsFx: true,
      settingsBgm: true,
      lastSnap: null,
      lastEdge: null,       // v0.3 A4 边吸附防抖目标
      result: null,
      starShown: 0,
      resT: 0,
      bgmDuck: false,
      /* ---- v0.5：倒计时 / 经济 / 浮层 ---- */
      timeLimit: 0,         // 本关总时限（秒）
      timeLeft: 0,          // 剩余秒数（倒计）
      hearts: 3,            // 由 timeLeft 映射的 3/2/1 心
      reviveUsed: 0,        // 本关已复活次数
      toast: null,          // { text, t } 轻提示
      adSim: null           // { kind, t } 模拟广告进度
    };

    var hits = [];        // 每帧重建的可点区域
    var view = { scale: 1, ox: 0, oy: 0, w: 0, h: 0, dpr: 1, safeTop: C.SAFE.top, safeBottom: C.SAFE.bottom };

    /* ---------------- 存档 ---------------- */
    function defaultSave() {
      var E = C.ECON;
      return {
        playerId: 'local', starOf: {}, unlockedMax: 1, bestTime: {}, hintUsed: {},
        settings: { sfx: true, bgm: true },
        /* v0.5 经济 / 体力 / 运营（老存档缺字段由 loadSave 逐项兜底） */
        coin: E.coinInit,
        energy: E.energyInit, energyMax: E.energyMax, energyTs: Date.now(),
        freeEnergyUsed: 0, freeEnergyDay: '',
        onlineTs: Date.now(),
        tasksDay: '', tasksClaimed: {}, taskPlays: 0,
        inviteCount: 0, inviteDay: '',
        skin: 'warm',
        bgmIdx: 0,
        streak: 0
      };
    }
    function loadSave() {
      var raw = null;
      try { raw = env.storage.get(SAVE_KEY); } catch (e) { raw = null; }
      var s = defaultSave();
      if (raw) {
        try {
          var o = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (o && typeof o === 'object') {
            var E = C.ECON;
            s.starOf = o.starOf || {};
            s.unlockedMax = o.unlockedMax || 1;
            s.bestTime = o.bestTime || {};
            s.hintUsed = o.hintUsed || {};
            s.settings = o.settings || { sfx: true, bgm: true };
            /* v0.5：老存档（v0.4 及以前）没有经济字段 → 逐项给默认值，绝不清空星星/进度 */
            s.coin = (typeof o.coin === 'number') ? o.coin : E.coinInit;
            s.energy = (typeof o.energy === 'number') ? o.energy : E.energyInit;
            s.energyMax = (typeof o.energyMax === 'number') ? o.energyMax : E.energyMax;
            s.energyTs = (typeof o.energyTs === 'number') ? o.energyTs : Date.now();
            s.freeEnergyUsed = (typeof o.freeEnergyUsed === 'number') ? o.freeEnergyUsed : 0;
            s.freeEnergyDay = o.freeEnergyDay || '';
            s.onlineTs = (typeof o.onlineTs === 'number') ? o.onlineTs : Date.now();
            s.tasksDay = o.tasksDay || '';
            s.tasksClaimed = o.tasksClaimed || {};
            s.taskPlays = (typeof o.taskPlays === 'number') ? o.taskPlays : 0;
            s.inviteCount = (typeof o.inviteCount === 'number') ? o.inviteCount : 0;
            s.inviteDay = o.inviteDay || '';
            s.skin = o.skin || 'warm';
            s.bgmIdx = (typeof o.bgmIdx === 'number') ? o.bgmIdx : 0;
            s.streak = (typeof o.streak === 'number') ? o.streak : 0;
          }
        } catch (e) { /* 存档损坏 → 用默认值，静默降级 */ }
      }
      return s;
    }
    function persist() {
      try { env.storage.set(SAVE_KEY, JSON.stringify(state.save)); } catch (e) { /* 隐私模式静默降级 */ }
    }

    /* ================= v0.5 经济 / 体力 / 倒计时 ================= */
    function todayKey() {
      var d = new Date();
      return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    }
    function clampN(n, a, b) { return Math.max(a, Math.min(b, n)); }
    function totalStars() {
      var n = 0;
      for (var k in state.save.starOf) n += state.save.starOf[k] || 0;
      return n;
    }

    /* 体力按时间戳恢复：每 energyRecoverSec 秒 +1，封顶 energyMax。
     * 只把「整点数」对应的时间推进 energyTs，余数留到下次，避免吞进度。 */
    function syncEnergy(silent) {
      var E = C.ECON, s = state.save;
      if (!s) return;
      var now = Date.now();
      if ((s.energy || 0) < s.energyMax) {
        var el = (now - (s.energyTs || now)) / 1000;
        var n = Math.floor(el / E.energyRecoverSec);
        if (n > 0) {
          var gained = Math.min(n, s.energyMax - s.energy);
          s.energy += gained;
          s.energyTs = s.energyTs + gained * E.energyRecoverSec * 1000;
          if (s.energy >= s.energyMax) s.energyTs = now;
          persist();
          if (!silent) toast('体力 +' + gained);
        }
      } else {
        s.energyTs = now;   // 满体力时把恢复起点滚到当前，避免溢出后一次爆补
      }
    }

    function toast(t) { state.toast = { text: t, t: 0 }; }

    function addCoin(n, why) {
      var s = state.save; if (!s) return;
      s.coin = Math.max(0, (s.coin || 0) + n);
      persist();
      if (why && n) toast(why + (n > 0 ? ' +' : ' ') + n + ' 巧币');
    }
    function addEnergy(n, why) {
      var s = state.save; if (!s) return;
      var was = s.energy || 0;
      s.energy = Math.min(s.energyMax, was + n);
      if (was >= s.energyMax) s.energyTs = Date.now();
      persist();
      var got = s.energy - was;
      if (why) toast(got > 0 ? (why + ' +' + got + ' 体力') : '体力已满');
    }
    /* 进关扣 1 点体力；不足返回 false（由调用方弹「体力不足」） */
    function spendEnergy() {
      var E = C.ECON, s = state.save;
      syncEnergy(true);
      if ((s.energy || 0) < E.energyCostLevel) return false;
      var wasFull = s.energy >= s.energyMax;
      s.energy -= E.energyCostLevel;
      if (wasFull) s.energyTs = Date.now();   // 从满体力掉下来，恢复计时从此刻起
      persist();
      return true;
    }

    /* 每关时限：关卡自带 timeLimit 优先，否则 parTime×parFactor 并夹到区间 */
    function timeLimitOf(lv) {
      var T = C.TIMER;
      if (lv && typeof lv.timeLimit === 'number' && lv.timeLimit > 0) return lv.timeLimit;
      var pt = (lv && lv.parTime) || 60;
      return clampN(Math.round(pt * T.parFactor), T.minSec, T.maxSec);
    }
    function heartsOf(left, limit) {
      if (left <= 0) return 0;
      var r = left / (limit || 1);
      return r > 2 / 3 ? 3 : (r > 1 / 3 ? 2 : 1);
    }

    /* ---- 每日免费体力（分享 / 看广告） ---- */
    function freeEnergyUsedToday() {
      var s = state.save, d = todayKey();
      if (s.freeEnergyDay !== d) { s.freeEnergyDay = d; s.freeEnergyUsed = 0; persist(); }
      return s.freeEnergyUsed || 0;
    }
    function freeEnergyLeft() {
      return Math.max(0, C.ECON.freeEnergyPerDay - freeEnergyUsedToday());
    }
    function grantFreeEnergy(byAd) {
      var E = C.ECON, s = state.save;
      if (freeEnergyLeft() <= 0) { toast('今日次数已用完'); return false; }
      s.freeEnergyUsed = (s.freeEnergyUsed || 0) + 1;
      var n = byAd ? E.freeEnergyShare * E.freeEnergyAdMul : E.freeEnergyShare;
      addEnergy(n, byAd ? '看广告' : '分享获得');
      return true;
    }

    /* ---- 在线奖励 ---- */
    function onlineLeft() {
      var s = state.save, E = C.ECON;
      var el = (Date.now() - (s.onlineTs || Date.now())) / 1000;
      return Math.max(0, E.onlineRewardSec - el);
    }
    function claimOnline() {
      if (onlineLeft() > 0) { toast('奖励还在路上～'); return; }
      state.save.onlineTs = Date.now();
      addCoin(C.ECON.onlineRewardCoin, '在线奖励');
    }

    /* ---- 每日任务 ---- */
    function taskList() {
      var E = C.ECON, s = state.save, d = todayKey();
      if (s.tasksDay !== d) { s.tasksDay = d; s.tasksClaimed = {}; s.taskPlays = 0; }
      var got = s.tasksClaimed || {};
      return [
        { id: 't1', name: '完成 1 关', reward: '+' + E.taskCoin + ' 巧币', done: (s.taskPlays || 0) >= 1, got: !!got.t1, coin: E.taskCoin },
        { id: 't2', name: '累计获得 3 星', reward: '+' + E.taskCoin3 + ' 巧币', done: totalStars() >= 3, got: !!got.t2, coin: E.taskCoin3 },
        { id: 't3', name: '玩 3 局', reward: '+' + E.taskEnergy + ' 体力', done: (s.taskPlays || 0) >= E.taskPlays, got: !!got.t3, energy: E.taskEnergy }
      ];
    }
    function claimTask(id) {
      var s = state.save, d = todayKey();
      if (s.tasksDay !== d) { s.tasksDay = d; s.tasksClaimed = {}; s.taskPlays = 0; }
      var t = null, arr = taskList();
      for (var i = 0; i < arr.length; i++) if (arr[i].id === id) t = arr[i];
      if (!t || !t.done || t.got) return;
      s.tasksClaimed[id] = true;
      if (t.coin) s.coin += t.coin;
      if (t.energy) s.energy = Math.min(s.energyMax, s.energy + t.energy);
      persist();
      toast('任务奖励已领取');
    }

    /* ---- 皮肤（只覆盖配色，动态改 COL 字段以让闭包引用同步生效） ---- */
    function applySkin(key) {
      var sk = C.SKINS[key];
      if (!sk) return;
      state.save.skin = key;
      for (var k in sk) { if (k !== 'name') COL[k] = sk[k]; }
      persist();
      toast('皮肤：' + sk.name);
    }
    function initSkin() {
      var sk = C.SKINS[state.save.skin || 'warm'];
      if (sk) { for (var k in sk) { if (k !== 'name') COL[k] = sk[k]; } }
    }

    /* ---- 模拟广告（个人主体无流量主：adSimMs 进度条后发奖） ---- */
    function adStart(kind) {
      if (state.adSim) return;
      state.adSim = { kind: kind, t: 0 };
      env.audio.play('sfx_tap');
    }
    function adFinish() {
      var kind = state.adSim && state.adSim.kind;
      state.adSim = null;
      if (kind === 'energy') grantFreeEnergy(true);
      else if (kind === 'revive') doRevive(true);
      else if (kind === 'invite') doInviteShare();
    }

    /* ---- 失败 / 复活 ---- */
    function failLevel() {
      if (state.overlay === 'fail') return;
      state.running = false;
      state.overlay = 'fail';
      state.failT = 0;
      state.selId = null;
      env.audio.play('sfx_tap');
    }
    function doRevive(byAd) {
      var E = C.ECON, s = state.save;
      if (state.reviveUsed >= E.reviveMaxPerLevel) { toast('本关复活次数已用完'); return; }
      if (byAd) {
        s.coin = (s.coin || 0) + 90;           // 参考图：看广告复活 +1 心 +90 巧币
      } else {
        if ((s.coin || 0) < E.coinRevive) { toast('巧币不足'); return; }
        s.coin -= E.coinRevive;
      }
      state.reviveUsed++;
      state.timeLeft = Math.min(state.timeLimit, state.timeLeft + state.timeLimit / C.TIMER.hearts);
      state.hearts = heartsOf(state.timeLeft, state.timeLimit);
      persist();
      state.overlay = null;
      state.running = true;
      env.audio.play('sfx_snap');
      toast(byAd ? '复活成功 +90 巧币' : ('复活成功 -' + E.coinRevive + ' 巧币'));
      if (env.audio.setScene) env.audio.setScene(C.BGM.scenes[(s.bgmIdx || 0) % C.BGM.scenes.length]);
    }
    function giveUp() {
      state.overlay = null;
      state.running = false;
      state.save.streak = 0;                   // 放弃 → 连胜清零
      persist();
      go('levels');
    }

    /* ---- 邀请有礼（模拟分享：微信端可接 wx.shareAppMessage） ---- */
    function doInviteShare() {
      var s = state.save, d = todayKey();
      if (s.inviteDay === d) { toast('今天已经邀请过啦'); return; }
      s.inviteDay = d;
      s.inviteCount = (s.inviteCount || 0) + 1;
      s.coin = (s.coin || 0) + 20;
      persist();
      toast('邀请成功 +20 巧币');
      if (env.share) { try { env.share(); } catch (e) {} }
    }

    /* ---------------- 数据集切换（v0.3 Phase 0）----------------
     * 四巧板 / 七巧板各自独立存档，切换时重算数据集相关闭包变量并重载存档。
     * 不重建 game 实例 → 不会重复 bindInput / 重复启动 rAF 主循环。 */
    function useSet(key) {
      if (!SETS || !SETS[key] || key === state.setKey) return;
      var b = buildSet(key);
      DS = b.ds; LEVELS = b.levels; LOCAL = b.LOCAL; TRAY_BB = b.TRAY_BB;
      SLOT_POS = b.SLOT_POS; CHAP_PER = b.chapPer; CHAP_NAMES = b.chapNames;
      CHAP_TITLES = b.chapTitles; COMPLETE_TITLE = b.completeTitle; COMPLETE_SUB = b.completeSub;
      SAVE_KEY = b.saveKey; SNAP_GRID = b.snapGrid;
      state.setKey = key;
      state.save = loadSave();
      state.settingsFx = state.save.settings.sfx !== false;
      state.settingsBgm = state.save.settings.bgm !== false;
      applyAudio();
      state.levelIdx = 0; state.pieces = []; state.selId = null;
      state.drag = null; state.win = null; state.result = null; state.overlay = null;
      state.flower = null;   // v0.3.4 A4a：切数据集时清掉未播完的鲜花
      state.lastTap = null;  // v0.4 A1：切数据集不残留双击配对
      go('home');
    }

    /* ---------------- 页面切换 ---------------- */
    function go(page) {
      state.page = page;
      state.fade = 0;
      state.pageT = 0;
      /* v0.6：主页与关卡列表都放温馨曲（列表页原本会残留上一关的曲子）；
       * 对局放当前关卡曲；通关后由 win() 切到欢庆曲，进下一关再切回来。 */
      if (env.audio && env.audio.setScene) {
        if (page === 'home' || page === 'levels') env.audio.setScene('home');
        else if (page === 'play') env.audio.setScene(C.BGM.scenes[(state.save.bgmIdx || 0) % C.BGM.scenes.length]);
      }
      if (page !== 'play') { state.running = false; }
      /* v0.6：离开对局页就收掉通关鲜花/结算态，避免下次进来还在飘 */
      if (page !== 'play') { state.win = null; state.flower = null; }
      // 进关卡页时跳到「当前进度所在章」，120 关不该每次都从第 1 章翻起
      if (page === 'levels') {
        var um = Math.max(1, Math.min(state.save.unlockedMax || 1, LEVELS.length));
        state.lvPage = Math.floor((um - 1) / CHAP_PER);
      }
    }

    /* ---------------- 关卡初始化 ---------------- */
    function setupLevel(idx) {
      state.levelIdx = idx;
      var lv = LEVELS[idx];
      state.pieces = DS.pieceOrder.map(function (id, i) {
        return {
          id: id, slot: i,
          x: 0, y: 0, angle: 0, flipped: false,
          onBoard: false,
          dAngle: 0, dFlipped: false,
          rot: null, flip: null,
          pulse: 0, ring: 0, breathe: 0,
          grabT: 0
        };
      });
      state.selId = null;
      state.drag = null;
      state.elapsed = 0;
      state.steps = 0;
      state.hintUsed = !!(state.save.hintUsed && state.save.hintUsed[String(idx + 1)]);
      state.hintTier = LEVELS[idx].hintTier || 2;   // 默认档由关卡数据自带（v0.3 A3）
      state.cov = 0; state.covFrom = 0; state.covTo = 0; state.covT = 1;
      state.msg = ''; state.msgT = 0;
      state.overlapT = 0; state.overlapPairs = [];
      state.win = null; state.result = null; state.resT = 0; state.starShown = 0;
      state.flower = null;   // v0.3.4 A4a：重开关卡不残留上一局鲜花
      state.lastTap = null;  // v0.4 A1：重开关卡不残留双击配对
      state.hint = null;
      state.judge = new J.Judge();
      state.judge.setTarget(lv.outline);
      state.running = true;
      state.lastSnap = null;
      state.lastEdge = null;
      /* v0.5：每关重置倒计时 / 生命值 / 复活次数 */
      var tl = timeLimitOf(lv);
      state.timeLimit = tl;
      state.timeLeft = tl;
      state.hearts = C.TIMER.hearts;
      state.reviveUsed = 0;
    }

    function piecePoly(p) {
      return G.toWorld(LOCAL[p.id], {
        x: p.x, y: p.y,
        angle: p.dAngle, flipped: p.dFlipped
      });
    }
    function piecePolyDesign(p) {
      return piecePoly(p).map(function (v) { return [w2d(v[0]), h2d(v[1])]; });
    }
    /* 托盘 1:1：s 恒为 1，只做居中平移。
     * 旧实现 s = min((slot-2*pad)/w, (slot-2*pad)/h)，每块板各自缩放，
     * 于是 A(2.5u²) 和 B(0.5u²) 在托盘里看起来差不多大 —— 这就是「空间误差」。 */
    function trayTransform(p) {
      var bb = TRAY_BB[p.id];
      var sp = SLOT_POS[p.slot];
      return {
        cx: sp.x,
        cy: sp.y,
        s: 1,
        lcx: bb.cx,
        lcy: bb.cy
      };
    }
    function trayPoly(p) {
      var t = trayTransform(p);
      return LOCAL[p.id].map(function (v) {
        return [t.cx + (v[0] * WS - t.lcx) * t.s, t.cy + (v[1] * WS - t.lcy) * t.s];
      });
    }

    function boardPieces() {
      return state.pieces.filter(function (p) { return p.onBoard; });
    }
    function judgeNow() {
      var lv = LEVELS[state.levelIdx];
      var arr = boardPieces().map(function (p) {
        return [piecePoly(p), DS.pieceOrder.indexOf(p.id)];
      });
      var t0 = nowMs();
      var r = state.judge.judge(arr);
      state.judgeMs = nowMs() - t0;
      // 逐对重叠阈值
      var areas = arr.map(function (a) { return G.area(a[0]); });
      var bad = [];
      for (var i = 0; i < r.overlapPairs.length; i++) {
        var k = r.overlapPairs[i].key.split('-');
        var a = +k[0], b = +k[1];
        var ov = r.overlapPairs[i].cells * J.CELL * J.CELL;
        var lim = C.JUDGE.pairTol * Math.min(areas[arr.findIndex(function (x) { return x[1] === a; })],
          areas[arr.findIndex(function (x) { return x[1] === b; })]);
        if (ov > lim) bad.push(r.overlapPairs[i]);
      }
      return { coverage: r.coverage, overflow: r.overflow, overlaps: bad };
    }

    /* ---------------- 判定与结算 ---------------- */
    function runJudge(isDrop) {
      var lv = LEVELS[state.levelIdx];
      var r = judgeNow();
      state.overlapPairs = r.overlaps;
      state.covFrom = state.cov;
      state.covTo = r.coverage;
      state.covT = 0;
      if (r.overlaps.length) {
        state.overlapT = 400;
        flashMsg('有两块压在一起了');
        return;
      }
      if (r.coverage >= C.JUDGE.passCoverage && r.overflow < C.JUDGE.passOverflow &&
          boardPieces().length === DS.pieceOrder.length) {
        win();
        return;
      }
      if (r.coverage >= C.JUDGE.lowCoverHint) flashMsg('还差一点点');
    }

    function flashMsg(t) { state.msg = t; state.msgT = 1500; }

    function win() {
      var lv = LEVELS[state.levelIdx];
      state.running = false;
      state.win = { t: 0 };
      state.flower = { t: 0 };   // v0.3.4 A4a：鲜花与音乐共用这一时刻起算
      env.audio.play('sfx_win');
      /* 星级沿用策划 5.7 原规则（三星=时限+步数+未用提示；二星=时限内）。
       * v0.3 A3 变更点：用提示（hint_used）从「只给 1 星」放宽为「封顶 ★★☆」。 */
      var stars = 1;
      if (state.elapsed <= lv.parTime * C.STAR.twoStarTimeFactor) stars = 2;
      if (state.elapsed <= lv.parTime && state.steps <= lv.parSteps) stars = 3;
      if (state.hintUsed) stars = Math.min(stars, 2);
      state.result = { stars: stars, time: state.elapsed, steps: state.steps };
      var k = String(state.levelIdx + 1);
      var s = state.save;
      s.starOf[k] = Math.max(s.starOf[k] || 0, stars);
      if (!s.bestTime[k] || state.elapsed < s.bestTime[k]) s.bestTime[k] = +state.elapsed.toFixed(1);
      if (state.levelIdx + 1 === s.unlockedMax && s.unlockedMax < LEVELS.length) s.unlockedMax = state.levelIdx + 2;
      if (s.unlockedMax > LEVELS.length) s.unlockedMax = LEVELS.length;
      /* v0.5：通关奖励巧币 + 连胜 +1 + 下一关换 BGM 场景（每通一关切下一首） */
      var E2 = C.ECON;
      s.coin = Math.max(0, (s.coin || 0) + (stars >= 3 ? E2.coinClear3Star : E2.coinClear));
      s.streak = (s.streak || 0) + 1;
      s.bgmIdx = ((s.bgmIdx || 0) + 1) % C.BGM.scenes.length;
      persist();
      /* v0.6：通关立刻切到「欢庆」循环曲（不是 0.8s 的一次性 sting）。
       * bgmIdx 已经 +1，下一关进对局时播放的是新的关卡曲。 */
      if (env.audio.setScene) env.audio.setScene('win');
    }

    function nextLevel() {
      if (state.levelIdx + 1 < LEVELS.length) {
        setupLevel(state.levelIdx + 1);
        state.overlay = null;
        /* v0.6：离开结算页 → 从欢庆曲切回本关关卡曲 */
        if (env.audio.setScene) env.audio.setScene(C.BGM.scenes[(state.save.bgmIdx || 0) % C.BGM.scenes.length]);
      } else {
        state.overlay = null;
        go('levels');
      }
    }

    /* ---------------- 吸附（v0.3 三层：顶点 > 边 > 网格） ---------------- */
    function snapPiece(p, live) {
      var lv = LEVELS[state.levelIdx];
      var targets = [];
      var i;
      for (i = 0; i < lv.outline.length; i++) targets.push(lv.outline[i]);
      var others = boardPieces();
      for (i = 0; i < others.length; i++) {
        if (others[i] === p) continue;
        var op = piecePoly(others[i]);
        for (var j = 0; j < op.length; j++) targets.push(op[j]);
      }
      var mine = piecePoly(p);
      var best = null;
      for (i = 0; i < mine.length; i++) {
        for (var k = 0; k < targets.length; k++) {
          var dx = targets[k][0] - mine[i][0], dy = targets[k][1] - mine[i][1];
          var d = Math.sqrt(dx * dx + dy * dy);
          if (!best || d < best.d) best = { d: d, dx: dx, dy: dy, tx: targets[k][0], ty: targets[k][1], mi: i };
        }
      }
      // 防抖：上一帧命中的目标若仍可用且不比最优差太多，保持不切换
      if (live && state.lastSnap && best) {
        var lx = state.lastSnap.tx - mine[state.lastSnap.mi][0];
        var ly = state.lastSnap.ty - mine[state.lastSnap.mi][1];
        var ld = Math.sqrt(lx * lx + ly * ly);
        if (ld <= C.SNAP.vertex && ld - best.d < C.SNAP.switchHyst) {
          best = { d: ld, dx: lx, dy: ly, tx: state.lastSnap.tx, ty: state.lastSnap.ty, mi: state.lastSnap.mi };
        }
      }
      if (best && best.d <= C.SNAP.vertex) {
        p.x += best.dx; p.y += best.dy;
        state.lastSnap = { tx: best.tx, ty: best.ty, mi: best.mi };
        state.lastEdge = null;      // 顶点命中时跳过边吸附（优先级：顶点 > 边）
        return true;
      }
      state.lastSnap = null;
      // v0.3 A4 第三层：边吸附（方案文档 §3.5——夹角 <6° 且线距 < 阈值 → 沿法线贴靠）
      if (edgeSnap(p, mine, live)) return true;
      // 第三层兜底：0.5u 网格（修正量很小时才生效，避免把已对准的板推开）
      var grid = SNAP_GRID || C.SNAP.grid;      // 0.5u，随数据集 unitScale 走
      var gx = Math.round(p.x / grid) * grid;
      var gy = Math.round(p.y / grid) * grid;
      if (Math.sqrt((gx - p.x) * (gx - p.x) + (gy - p.y) * (gy - p.y)) <= C.SNAP.gridMax) {
        p.x = gx; p.y = gy;
      }
      return false;
    }

    /* 边吸附：被拖板件的边 vs 轮廓/已放置板件的边。
     * 本引擎里所有边都锁定在 45° 网格上，夹角 <6° 即已精确平行，
     * 「角度吸附到平行/垂直」为空操作，实际生效的是沿法线平移贴靠。 */
    function collectTargetEdges(p) {
      var lv = LEVELS[state.levelIdx];
      var edges = [];
      var i, j;
      for (i = 0; i < lv.outline.length; i++) {
        edges.push([lv.outline[i], lv.outline[(i + 1) % lv.outline.length], 'o' + i]);
      }
      var others = boardPieces();
      for (i = 0; i < others.length; i++) {
        if (others[i] === p) continue;      // 不吸自己的边
        var op = piecePoly(others[i]);
        for (j = 0; j < op.length; j++) {
          edges.push([op[j], op[(j + 1) % op.length], 'p' + i + '_' + j]);
        }
      }
      return edges;
    }
    function scanEdge(mine, edges) {
      var best = null;
      for (var i = 0; i < mine.length; i++) {
        var a = mine[i], b = mine[(i + 1) % mine.length];
        var ex = b[0] - a[0], ey = b[1] - a[1];
        var el = Math.hypot(ex, ey);
        if (el < 1e-6) continue;
        var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
        for (var j = 0; j < edges.length; j++) {
          var e = edges[j];
          var dx = e[1][0] - e[0][0], dy = e[1][1] - e[0][1];
          var L = Math.hypot(dx, dy);
          if (L < 1e-6) continue;
          var ang = Math.abs(Math.atan2(ex * dy - ey * dx, ex * dx + ey * dy)) * 180 / Math.PI;
          if (ang > 90) ang = 180 - ang;
          if (ang > C.SNAP.edgeAngle) continue;
          var nx = -dy / L, ny = dx / L;
          var s = (mx - e[0][0]) * nx + (my - e[0][1]) * ny;   // 有向线距
          var dist = Math.abs(s);
          if (dist > C.SNAP.edge || dist < 1e-6) continue;     // 已贴紧的不再推
          var proj = (mx - e[0][0]) * (dx / L) + (my - e[0][1]) * (dy / L);
          var ov = Math.min(proj + el / 2, L) - Math.max(proj - el / 2, 0);
          if (ov < C.SNAP.edgeMinOverlap * Math.min(el, L)) continue;
          if (!best || dist < best.dist) {
            best = { dist: dist, s: s, nx: nx, ny: ny, tkey: e[2], mi: i };
          }
        }
      }
      return best;
    }
    function edgeDistOf(tkey, mi, mine, edges) {
      for (var j = 0; j < edges.length; j++) {
        if (edges[j][2] !== tkey) continue;
        var e = edges[j];
        var a = mine[mi], b = mine[(mi + 1) % mine.length];
        var ex = b[0] - a[0], ey = b[1] - a[1];
        var dx = e[1][0] - e[0][0], dy = e[1][1] - e[0][1];
        var L = Math.hypot(dx, dy);
        if (L < 1e-6) return null;
        var ang = Math.abs(Math.atan2(ex * dy - ey * dx, ex * dx + ey * dy)) * 180 / Math.PI;
        if (ang > 90) ang = 180 - ang;
        if (ang > C.SNAP.edgeAngle) return null;
        var nx = -dy / L, ny = dx / L;
        var s = ((a[0] + b[0]) / 2 - e[0][0]) * nx + ((a[1] + b[1]) / 2 - e[0][1]) * ny;
        var dist = Math.abs(s);
        if (dist > C.SNAP.edge || dist < 1e-6) return null;
        return { dist: dist, s: s, nx: nx, ny: ny, tkey: tkey, mi: mi };
      }
      return null;
    }
    function edgeSnap(p, mine, live) {
      var edges = collectTargetEdges(p);
      var best = scanEdge(mine, edges);
      // 防抖（沿用顶点层的 <2px 规则）：目标来回切换时保持上帧目标
      if (live && state.lastEdge && best) {
        if (state.lastEdge.tkey !== best.tkey || state.lastEdge.mi !== best.mi) {
          var prev = edgeDistOf(state.lastEdge.tkey, state.lastEdge.mi, mine, edges);
          if (prev && best.dist - prev.dist < C.SNAP.switchHyst) best = prev;
        }
      }
      if (best) {
        p.x += -best.s * best.nx;
        p.y += -best.s * best.ny;
        state.lastEdge = { tkey: best.tkey, mi: best.mi };
        return true;
      }
      state.lastEdge = null;
      return false;
    }

    function clampToBoard(p) {
      var pad = 30;
      if (p.x < pad) p.x = pad;
      if (p.x > 1000 - pad) p.x = 1000 - pad;
      if (p.y < pad) p.y = pad;
      if (p.y > 1000 - pad) p.y = 1000 - pad;
    }

    /* ---------------- 输入 ---------------- */
    function hitTest(x, y, kind) {
      for (var i = hits.length - 1; i >= 0; i--) {
        var h = hits[i];
        if (kind && h.kind !== kind) continue;
        if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h;
      }
      return null;
    }
    function addHit(cx, cy, w, h, id, kind) {
      // (cx, cy) 是元素中心；热区至少 88×88，且必须仍以该中心为中心
      var hw = Math.max(w, LAY.MIN_HIT), hh = Math.max(h, LAY.MIN_HIT);
      hits.push({ x: cx - hw / 2, y: cy - hh / 2, w: hw, h: hh, id: id, kind: kind || 'btn' });
    }

    function onDown(x, y) {
      env.audio.unlock();
      state.activePointer = true;
      if (state.overlay) { handleOverlayDown(x, y); return; }
      if (state.page === 'home' || state.page === 'levels') { handlePageDown(x, y); return; }
      if (state.page === 'play') handlePlayDown(x, y);
    }
    function onMove(x, y) {
      if (!state.activePointer) return;
      if (state.drag) {
        var p = pieceOf(state.drag.id);
        if (!p) return;
        if (state.drag.mode === 'rotate') {
          // v0.3 A5 环形旋转：15° 实时跟随，旋转中暂停吸附（方案 §9.2）
          var rwx = d2w(x), rwy = d2wy(y);
          var a = Math.atan2(rwy - p.y, rwx - p.x);
          var d = a - state.drag.lastA;
          while (d > Math.PI) d -= 2 * Math.PI;
          while (d < -Math.PI) d += 2 * Math.PI;
          state.drag.acc += d * 180 / Math.PI;
          state.drag.lastA = a;
          var q = Math.round(state.drag.acc / C.GESTURE.ringStep) * C.GESTURE.ringStep;
          p.dAngle = state.drag.baseAngle + q;
          p.ring = 0; p.breathe = 0;
          return;
        }
        var wx = d2w(x) - state.drag.offX;
        var wy = d2wy(y) - state.drag.offY;
        p.x = wx; p.y = wy;
        if (!p.onBoard) p.onBoard = true;
        state.drag.moved = true;
        clampToBoard(p);
        var hit = snapPiece(p, true);
        p.ring = hit ? 1 : 0;
        p.breathe = hit ? (p.breathe || 0.001) : 0;
      }
    }
    function onUp(x, y) {
      if (!state.activePointer) return;
      state.activePointer = false;
      var btn = state.press;
      state.press = null;
      if (btn) {
        var h = hitTest(x, y);
        if (h && h.id === btn) fireBtn(btn);
        state.lastTap = null;   // v0.4 A1：按钮点击不参与双击配对
      }
      /* v0.3 A5：环形旋转松手 → 吸附最近 45°，恢复吸附并判定
       * v0.3.1 A3：手柄「点击」(位移<10px) → 顺时针 45°；「拖动」→ 沿用吸附最近 45° */
      if (state.drag && state.drag.mode === 'rotate') {
        state.lastTap = null;   // v0.4 A1：旋转手势不参与双击配对（含点手柄转 45°）
        var rp = pieceOf(state.drag.id);
        var fh = !!state.drag.fromHandle;
        var tapMove = fh ? Math.hypot(x - state.drag.startX, y - state.drag.startY) : 1e9;
        if (fh && tapMove < C.GESTURE.handleTapMove) {
          // 点击手柄：转 45°，与底部 ↻ 按钮同一 rot 动画（含连点追赶）
          // v0.4 A1：翻转 = 双击板件本体 或 底部翻转按钮；手柄点击只旋转，不翻转
          if (rp) {
            var hb = rp.rot ? rp.rot.to : rp.dAngle;
            var hto = hb + 45;
            var hdev = hto - rp.dAngle;
            if (Math.abs(hdev) > 90) { rp.dAngle = hto - (hdev > 0 ? 90 : -90); hdev = hto - rp.dAngle; }
            var hdur = Math.min(C.ANIM.rotate, Math.max(60, Math.abs(hdev) / 45 * C.ANIM.rotate));
            rp.rot = { from: rp.dAngle, to: hto, t: 0, dur: hdur };
            rp.angle = ((rp.angle + 45) % 360 + 360) % 360;
            state.steps++;
          }
          state.drag = null;
          return;
        }
        var to = state.drag.baseAngle + Math.round(state.drag.acc / C.GESTURE.ringSnap) * C.GESTURE.ringSnap;
        state.drag = null;
        if (rp) {
          rp.angle = ((to % 360) + 360) % 360;
          if (Math.abs(rp.dAngle - to) > 0.01) {
            rp.rot = { from: rp.dAngle, to: to, t: 0, dur: C.ANIM.rotate };
          } else {
            rp.dAngle = to;
          }
          state.steps++;
          if (rp.onBoard) {
            state.lastSnap = null;      // 旋转结束重新吸附
            var rsnap = snapPiece(rp, false);
            if (rsnap) {
              rp.pulse = 1; rp.ring = 1;
              env.audio.play('sfx_snap');
              env.vibrate(C.SNAP.vibrateMs);
            }
            runJudge(true);
          }
        }
        return;
      }
      if (state.drag) {
        var p = pieceOf(state.drag.id);
        var moved = state.drag.moved;
        var fromTray = state.drag.fromTray;
        var downX = state.drag.downX, downY = state.drag.downY;
        state.drag = null;
        if (p) {
          p.breathe = 0;
          if (!moved) {
            // 只是点了一下：托盘里的板退回槽位，棋盘上的板变为选中
            if (fromTray) p.onBoard = false;
            state.selId = p.id;
            /* v0.4 A1：双击翻转——仅「已上板板件本体」的干净短 tap 参与配对。
             * 判定在 pointerup 之后，不占用按住时段；拖动(moved)、手柄旋转、托盘拿起、
             * 按钮点击都不写 lastTap，故绝不干扰拖动。参数见 config.GESTURE。 */
            var tapDist = (downX == null) ? 0 : Math.hypot(x - downX, y - downY);
            var cleanTap = !fromTray && p.onBoard && tapDist < C.GESTURE.doubleTapMove;
            var tapNow = nowMs();
            if (cleanTap && state.lastTap && state.lastTap.id === p.id &&
                (tapNow - state.lastTap.t) < C.GESTURE.doubleTapMs) {
              if (!p.flip) {           // 与底部 flip 按钮同一动画/音效，动画中不重复触发
                p.flip = { t: 0 };
                state.steps++;
                env.audio.play('sfx_tap');
              }
              state.lastTap = null;   // 消费配对，避免三连击连续翻
            } else {
              state.lastTap = cleanTap ? { id: p.id, t: tapNow } : null;
            }
          } else {
            state.lastTap = null;   // 拖动手势不参与配对
            clampToBoard(p);
            var snapped = snapPiece(p, false);
            state.steps++;
            if (snapped) {
              p.pulse = 1; p.ring = 1;
              env.audio.play('sfx_snap');
              env.vibrate(C.SNAP.vibrateMs);
            }
            runJudge(true);
          }
        }
      }
    }

    function pieceOf(id) {
      for (var i = 0; i < state.pieces.length; i++) if (state.pieces[i].id === id) return state.pieces[i];
      return null;
    }

    function fireBtn(id) {
      env.audio.play('sfx_tap');
      var lv = LEVELS[state.levelIdx];
      switch (id) {
        case 'back_home': go('home'); break;
        case 'back_levels': go('levels'); break;
        case 'start': {
          var idx = Math.min((state.save.unlockedMax || 1) - 1, LEVELS.length - 1);
          if (idx < 0) idx = 0;
          if (!spendEnergy()) { state.overlay = 'energy'; break; }   // 体力不足 → 免费体力弹窗
          enterLevelCount(); setupLevel(idx); go('play'); break;
        }
        case 'to_levels': go('levels'); break;
        /* v0.6：两套拼图固定入口，点谁进谁的关卡列表（不再「当前集/另一集」逻辑换位）。
         * useSet 内部会 go('home')，所以切完再显式进列表。 */
        case 'set_t4':
        case 'set_t7': {
          var nk = id === 'set_t4' ? 'tangram4' : 'tangram7';
          if (nk !== state.setKey) useSet(nk);
          go('levels');
          break;
        }
        case 'settings': state.overlay = 'settings'; break;
        case 'close_settings': state.overlay = null; break;
        case 'toggle_sfx':
          state.settingsFx = !state.settingsFx;
          state.save.settings.sfx = state.settingsFx; persist(); applyAudio(); break;
        case 'toggle_bgm':
          state.settingsBgm = !state.settingsBgm;
          state.save.settings.bgm = state.settingsBgm; persist(); applyAudio(); break;
        case 'reset_progress':
          state.save = defaultSave(); persist(); state.overlay = null; go('home'); break;
        case 'rot_ccw':
        case 'rot_cw': {
          var p = pieceOf(state.selId);
          if (!p) break;                                  // 只判空，不再吞连点
          var delta = id === 'rot_cw' ? 45 : -45;
          var base = p.rot ? p.rot.to : p.dAngle;         // 连点时从已定的目标累加
          var to = base + delta;
          var dev = to - p.dAngle;
          // 安全网：视觉落后超过 90° 就把起点往前挪，正常连点不会触发
          if (Math.abs(dev) > 90) { p.dAngle = to - (dev > 0 ? 90 : -90); dev = to - p.dAngle; }
          // 追赶时长：偏差越大越快，45°→120ms，90°→60ms
          var dur = Math.min(C.ANIM.rotate, Math.max(60, Math.abs(dev) / 45 * C.ANIM.rotate));
          p.rot = { from: p.dAngle, to: to, t: 0, dur: dur };
          p.angle = ((p.angle + delta) % 360 + 360) % 360;
          state.steps++;
          break;
        }
        case 'flip': {
          var q = pieceOf(state.selId);
          if (!q || q.flip) break;
          q.flip = { t: 0 };
          state.steps++;
          break;
        }
        case 'hint': {
          var lvH = LEVELS[state.levelIdx];
          var hasTiers = !!(lvH.splitLines && lvH.splitLines.length);   // 七巧板关卡才带分割线
          if (!state.hintUsed) {
            // 第一次用提示：高亮「下一块该放哪」+ 写存档（影响星级，★☆☆→★★☆ 封顶）
            state.hintUsed = true;
            var k = String(state.levelIdx + 1);
            state.save.hintUsed[k] = true; persist();
            state.hint = { id: pickHintPiece(), t: 0, until: nowMs() + C.ANIM.hintShow };
          } else if (hasTiers && state.hintTier < 3) {
            // v0.3 A3：手动降档 1→2→3 单向（本关内不回升）
            state.hintTier++;
            flashMsg('提示降为档 ' + state.hintTier + (state.hintTier === 2 ? '（轮廓）' : '（纯剪影）'));
          }
          break;
        }
        case 'restart': setupLevel(state.levelIdx); break;
        case 'next': nextLevel(); break;
        case 'replay': setupLevel(state.levelIdx); state.overlay = null;
          if (env.audio.setScene) env.audio.setScene(C.BGM.scenes[(state.save.bgmIdx || 0) % C.BGM.scenes.length]);
          break;
        case 'to_list': state.overlay = null; go('levels'); break;
        case 'to_home_from_result': state.overlay = null; go('home'); break;
        /* v0.5：HUD / 主页入口 / 弹窗按钮 */
        case 'hud_energy': state.overlay = 'energy'; break;
        case 'entry_desktop': state.overlay = 'desktop'; break;
        case 'entry_skin': state.overlay = 'skin'; break;
        case 'entry_invite': state.overlay = 'invite'; break;
        case 'entry_task': state.overlay = 'tasks'; break;
        case 'entry_rank': toast('排行榜即将上线'); break;
        case 'online_claim': claimOnline(); break;
        case 'free_share': grantFreeEnergy(false); break;
        case 'free_ad': adStart('energy'); break;
        case 'ad_revive': adStart('revive'); break;
        case 'coin_revive': doRevive(false); break;
        case 'give_up': giveUp(); break;
        case 'skin_warm': applySkin('warm'); break;
        case 'skin_mint': applySkin('mint'); break;
        case 'skin_night': applySkin('night'); break;
        case 'invite_share': adStart('invite'); break;
        case 'task_t1': claimTask('t1'); break;
        case 'task_t2': claimTask('t2'); break;
        case 'task_t3': claimTask('t3'); break;
        case 'close_sheet':
        case 'close_energy':
        case 'close_fail':
          if (!state.adSim) state.overlay = null;
          break;
        case 'lvl': break;
        default:
          if (id.indexOf('lvpage_') === 0) {
            state.lvPage = +id.slice(7);
            state.pageT = 0;          // 重置入场错峰，让新一章重新入场
            break;
          }
          if (id.indexOf('lvl_') === 0) {
            var n = +id.slice(4);
            if (n <= state.save.unlockedMax) {
              if (!spendEnergy()) { state.overlay = 'energy'; break; }   // 体力不足 → 免费体力弹窗
              enterLevelCount(); setupLevel(n - 1); go('play');
            }
          }
      }
    }

    /* v0.5：进入一局时累加任务进度（每日重置由 taskList 负责） */
    function enterLevelCount() {
      var s = state.save;
      s.taskPlays = (s.taskPlays || 0) + 1;
      persist();
    }

    function pickHintPiece() {
      var lv = LEVELS[state.levelIdx];
      for (var i = 0; i < lv.solution.length; i++) {
        var st = lv.solution[i];
        var p = pieceOf(st.id);
        if (!p || !p.onBoard) return st.id;
        if (Math.abs(p.x - st.x) > 1 || Math.abs(p.y - st.y) > 1 ||
            Math.abs(p.angle - st.angle) > 1 || p.flipped !== st.flipped) return st.id;
      }
      return lv.solution[0].id;
    }

    function handleOverlayDown(x, y) {
      var h = hitTest(x, y);
      if (h && h.id) { state.press = h.id; }
      else if (state.overlay === 'settings') { /* 点遮罩不关闭，避免误触 */ }
    }
    function handlePageDown(x, y) {
      var h = hitTest(x, y);
      if (h && h.id) state.press = h.id;
    }
    /* 板件的内切圆半径 / 外接圆半径（世界单位）。
     * (p.x,p.y) 就是质心（LOCAL 以质心为原点），直接量质心到边/顶点的距离。 */
    function pieceRadii(p) {
      var poly = piecePoly(p);
      var inr = Infinity, circ = 0;
      for (var i = 0; i < poly.length; i++) {
        var a = poly[i], b = poly[(i + 1) % poly.length];
        var d = G.distPtSeg([p.x, p.y], a, b);
        if (d < inr) inr = d;
        var dv = Math.hypot(a[0] - p.x, a[1] - p.y);
        if (dv > circ) circ = dv;
      }
      return { inr: inr, circ: circ };
    }
    /* v0.3.2 B1 旋转手柄锚点：取局部多边形离质心最远的顶点，沿质心→该顶点方向
     * 外移 handleOut（设计 px）。锚点定义在局部坐标上，再走与板件相同的
     * R(dAngle)·F(dFlipped) 变换 —— 旋转/翻转时手柄自然跟着走；
     * 外移量保证热区内缘落在质心拖拽区之外，质心归还拖拽。 */
    function handleLocal(p) {
      var L = LOCAL[p.id], v = L[0], bd = -1, i, d;
      for (i = 0; i < L.length; i++) {
        d = L[i][0] * L[i][0] + L[i][1] * L[i][1];
        if (d > bd) { bd = d; v = L[i]; }
      }
      var len = Math.sqrt(bd) || 1;
      var out = C.GESTURE.handleOut / WS;   // 设计 px → 世界单位
      return [v[0] + v[0] / len * out, v[1] + v[1] / len * out];
    }
    function handleWorld(p) {
      return G.toWorld([handleLocal(p)], {
        x: p.x, y: p.y, angle: p.dAngle, flipped: p.dFlipped
      })[0];
    }
    function handleDesign(p) {
      var w = handleWorld(p);
      return [w2d(w[0]), h2d(w[1])];
    }

    function handlePlayDown(x, y) {
      var h = hitTest(x, y);
      if (h && h.kind === 'btn') { state.press = h.id; return; }
      if (state.win) return;
      var wx = d2w(x), wy = d2wy(y);
      /* v0.3.2 B1：手柄命中优先于「最近板件」—— 已选中+已上板的板件先独立判
       * 角上手柄热区，命中即进 rotate。即使手柄压在邻板上也能点中。 */
      if (state.selId) {
        var hp = pieceOf(state.selId);
        if (hp && hp.onBoard) {
          var hd = handleDesign(hp);
          if (Math.hypot(x - hd[0], y - hd[1]) <= C.GESTURE.handleRadius) {
            hp.grabT = 1; hp.rot = null; state.selId = hp.id;
            state.drag = { id: hp.id, mode: 'rotate', fromHandle: true,
              baseAngle: hp.angle, acc: 0,
              lastA: Math.atan2(wy - hp.y, wx - hp.x),
              startX: x, startY: y };
            state.lastTap = null;   // v0.4 A1：进入手柄旋转，清空双击配对
            env.audio.play('sfx_pick');
            return;
          }
        }
      }
      // 找板：取质心最近的一块
      var best = null;
      for (var i = 0; i < state.pieces.length; i++) {
        var p = state.pieces[i];
        var poly = p.onBoard ? piecePolyDesign(p) : trayPoly(p);
        var sp = p.onBoard ? null : SLOT_POS[p.slot];
        var cx = p.onBoard ? w2d(p.x) : sp.x;
        var cy = p.onBoard ? h2d(p.y) : sp.y;
        // 托盘 1:1 后小三角只有 91px 宽，纯多边形命中太窄，槽位内兜一层圆形热区
        var nearSlot = !p.onBoard && Math.hypot(x - cx, y - cy) <= C.LAYOUT.MIN_HIT / 2;
        if (!G.pointInPoly([x, y], poly) && !nearSlot) continue;
        var d = Math.hypot(x - cx, y - cy);
        if (!best || d < best.d) best = { p: p, d: d, sp: sp, cx: cx, cy: cy };
      }
      if (!best) { state.selId = null; return; }
      var pc = best.p;
      state.selId = pc.id;
      pc.grabT = 1;
      pc.rot = null;
      // v0.3.2 B1：手柄判定已前置到 best 循环之前；这里只留原始拖拽/环形手势。
      if (!pc.onBoard) {
        // 从托盘拿起：托盘与棋盘同尺度，按抓取点偏移落到棋盘，板不会跳位置
        pc.onBoard = true;
        pc.x = wx - (x - best.cx) / WS;
        pc.y = wy - (y - best.cy) / WS;
        clampToBoard(pc);
        state.drag = { id: pc.id, offX: (x - best.cx) / WS, offY: (y - best.cy) / WS, moved: false, fromTray: true, mode: 'drag', downX: x, downY: y };
      } else {
        /* v0.3 A5 环形手势：抓取起点在质心外围环形区（半径 > 内切圆）→ 绕圈旋转；
         * 板内起点仍是拖拽，互不干扰。
         * 环内界取 max(内切圆, 0.55×外接圆)：对细长块（平行四边形）只用内切圆
         * 会让整块几乎都是旋转区、拖不了，故取两者较大值，仍满足「>内切圆」。 */
        var rr = pieceRadii(pc);
        var dC = Math.hypot(wx - pc.x, wy - pc.y);
        var ringInner = Math.max(rr.inr, rr.circ * 0.55);
        if (dC > ringInner) {
          state.drag = { id: pc.id, mode: 'rotate', baseAngle: pc.angle, acc: 0,
            lastA: Math.atan2(wy - pc.y, wx - pc.x) };
        } else {
          state.drag = { id: pc.id, offX: wx - pc.x, offY: wy - pc.y, moved: false, fromTray: false, mode: 'drag', downX: x, downY: y };
        }
      }
      env.audio.play('sfx_pick');
    }

    /* ---------------- 音频 ---------------- */
    function applyAudio() {
      env.audio.setEnabled(state.settingsFx, state.settingsBgm);
    }

    /* ---------------- 每帧更新 ---------------- */
    function nowMs() { return Date.now(); }

    function update(dt) {
      state.time += dt;
      if (state.page === 'play' && state.running && !state.overlay && !state.win) {
        state.elapsed += dt / 1000;
        /* v0.5 A：倒计时递减 → 映射生命值；归零即失败 */
        if (state.timeLeft > 0) {
          state.timeLeft = Math.max(0, state.timeLeft - dt / 1000);
          state.hearts = heartsOf(state.timeLeft, state.timeLimit || 1);
          if (state.timeLeft <= 0) failLevel();
        }
      }
      if (state.toast) { state.toast.t += dt; if (state.toast.t > 1600) state.toast = null; }
      if (state.adSim) {
        state.adSim.t += dt;
        if (state.adSim.t >= C.ECON.adSimMs) adFinish();
      }
      if (state.fade < 1) state.fade = Math.min(1, state.fade + dt / C.ANIM.pageFade);
      state.pageT += dt;
      // BGM 压低：结算面板出现时 0.30→0.18，让 sfx_win 露出来；关闭后回 0.30
      var wantDuck = state.overlay === 'result';
      if (wantDuck !== state.bgmDuck) {
        state.bgmDuck = wantDuck;
        if (env.audio.duck) env.audio.duck(wantDuck);
      }
      if (state.msgT > 0) state.msgT -= dt;
      if (state.overlapT > 0) state.overlapT -= dt;
      if (state.covT < 1) {
        state.covT = Math.min(1, state.covT + dt / C.ANIM.progressTween);
        var e = G.easeOutCubic(state.covT);
        state.cov = state.covFrom + (state.covTo - state.covFrom) * e;
      }
      for (var i = 0; i < state.pieces.length; i++) {
        var p = state.pieces[i];
        if (p.rot) {
          p.rot.t = Math.min(1, p.rot.t + dt / (p.rot.dur || C.ANIM.rotate));
          var e2 = G.easeOutQuint(p.rot.t);
          p.dAngle = p.rot.from + (p.rot.to - p.rot.from) * e2;
          if (p.rot.t >= 1) { p.dAngle = p.rot.to; p.rot = null; }
        }
        if (p.flip) {
          p.flip.t = Math.min(1, p.flip.t + dt / C.ANIM.flip);
          if (p.flip.t >= 0.5 && p.flipped === p.dFlipped) p.dFlipped = !p.dFlipped;
          if (p.flip.t >= 1) { p.flipped = p.dFlipped; p.flip = null; }
        }
        if (p.pulse > 0) p.pulse = Math.max(0, p.pulse - dt / C.SNAP.pulseMs);
        if (p.ring > 0) p.ring = Math.max(0, p.ring - dt / C.SNAP.ringMs);
        if (p.grabT > 0) p.grabT = Math.max(0, p.grabT - dt / C.ANIM.grab);
        if (p.breathe > 0) p.breathe = (p.breathe + dt / C.SNAP.breatheMs) % 1;
      }
      if (state.flower) {
        state.flower.t += dt;
        if (state.flower.t > C.FLOWER.total) state.flower = null;
      }
      if (state.win) {
        state.win.t += dt;
        if (state.win.t > C.ANIM.winShrink + C.ANIM.winDelay && !state.overlay) {
          state.overlay = 'result';
          state.resT = 0;
          state.starShown = 0;
        }
      }
      if (state.overlay === 'result') {
        state.resT += dt;
        var n = Math.min(3, Math.floor(state.resT / C.ANIM.starStep));
        state.starShown = state.result ? Math.min(state.result.stars, n) : 0;
      }
      if (state.hint && nowMs() > state.hint.until) state.hint = null;
      if (state.press) state.pressT += dt;
      /* v0.4 A2：长按翻转已彻底移除——翻转改为 pointerup 后判定的「双击」，
       * 不再在按住时段触发，根除「想拖动却被翻面」的真机问题（见规格 §1 根因）。 */
    }

    /* ---------------- 绘制基础 ---------------- */
    function rr(x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.arcTo(x + w, y, x + w, y + r, r);
      ctx.lineTo(x + w, y + h - r);
      ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
      ctx.lineTo(x + r, y + h);
      ctx.arcTo(x, y + h, x, y + h - r, r);
      ctx.lineTo(x, y + r);
      ctx.arcTo(x, y, x + r, y, r);
      ctx.closePath();
    }
    function shadow(blur, dy, color) {
      ctx.shadowBlur = blur; ctx.shadowColor = color; ctx.shadowOffsetY = dy;
    }
    function noShadow() { ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; ctx.shadowOffsetY = 0; }

    function text(str, x, y, size, color, align, weight) {
      ctx.font = font(size, weight);
      ctx.fillStyle = color;
      ctx.textAlign = align || 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(str, x, y);
    }

    /* ---------------- v0.3.4 A4a 鲜花绽放（纯视觉层，零图片 / 零热区） ----------------
     * 算法照抄 animation/flower-demo.html（drawFlower / flowerState / drawFlowers），
     * 常量取 config.FLOWER；缓动复用 geom.js 的 easeOutCubic / easeOutBack，淡出用 t²。
     * 只依赖 t，不写 hits；由 renderPlay() 末尾调用，永远在结算面板之前绘制。 */
    function fClamp01(x) { return x < 0 ? 0 : (x > 1 ? 1 : x); }
    function fSeg(t, a, b) { return fClamp01((t - a) / (b - a)); }
    function fEaseIn(t) { return t * t; }
    function fShade(hex, pct) {
      var n = parseInt(hex.slice(1), 16);
      var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
      r = Math.max(0, Math.min(255, Math.round(r * (1 + pct / 100))));
      g = Math.max(0, Math.min(255, Math.round(g * (1 + pct / 100))));
      b = Math.max(0, Math.min(255, Math.round(b * (1 + pct / 100))));
      return 'rgb(' + r + ',' + g + ',' + b + ')';
    }

    /* 单朵花：花瓣朝 -Y，逐瓣 rotate 排布；无 shadowBlur，同色加深描边做层次 */
    function drawFlower(c, cx, cy, scale, alpha, bloomP, colorList, petalN, L, spin) {
      if (alpha <= 0 || scale <= 0) return;
      c.save();
      c.translate(cx, cy);
      if (spin) c.rotate(spin);
      c.scale(scale, scale);
      c.globalAlpha = alpha;
      var len = L * (0.15 + 0.85 * G.easeOutCubic(bloomP));
      var w = len * 0.42;
      for (var i = 0; i < petalN; i++) {
        var base = colorList[i % colorList.length];
        c.save();
        c.rotate((i * 2 * Math.PI / petalN) * G.easeOutCubic(bloomP));
        c.beginPath();
        c.moveTo(0, 0);
        c.quadraticCurveTo(-w, -len * 0.55, 0, -len);
        c.quadraticCurveTo(w, -len * 0.55, 0, 0);
        c.closePath();
        c.fillStyle = base; c.fill();
        c.lineWidth = 1.5; c.strokeStyle = fShade(base, -12); c.stroke();
        c.restore();
      }
      c.beginPath(); c.arc(0, 0, L * 0.22, 0, 7); c.fillStyle = '#FFC53D'; c.fill();
      c.lineWidth = 1.5; c.strokeStyle = fShade('#FFC53D', -14); c.stroke();
      c.beginPath(); c.arc(0, 0, L * 0.09, 0, 7); c.fillStyle = '#FFFFFF'; c.fill();
      c.restore();
    }

    var flowerTargetsCache = null, flowerTargetsSrc = null;
    function flowerTargets(F) {
      if (flowerTargetsSrc === F.satellites && flowerTargetsCache) return flowerTargetsCache;
      var arr = F.satellites.map(function (s) {
        var r = s.ang * Math.PI / 180;
        return {
          ang: s.ang, color: s.color, size: s.size, delay: s.delay,
          tx: F.main.x + F.satDist * Math.cos(r),
          ty: F.main.y + F.satDist * Math.sin(r) * F.satYFactor
        };
      });
      flowerTargetsSrc = F.satellites; flowerTargetsCache = arr;
      return arr;
    }

    /* 时间轴 → 主花 / 6 卫星花状态（与演示页 flowerState 同源） */
    function flowerState(t, F) {
      var bud = fSeg(t, 0, F.budEnd);
      var bloom = fSeg(t, F.budEnd, F.bloomEnd);
      var settle = fSeg(t, F.bloomEnd, F.settleEnd);
      var fade = fSeg(t, F.overlayAt, F.fadeEnd);
      var s, a;
      if (t <= F.budEnd) {
        s = 0.25 + 0.20 * G.easeOutCubic(bud);
        a = 0.5 * G.easeOutCubic(bud);
      } else if (t <= F.bloomEnd) {
        s = 0.45 + (F.peakScale - 0.45) * G.easeOutBack(bloom);
        a = 0.5 + 0.5 * G.easeOutCubic(bloom);
      } else {
        s = t <= F.settleEnd ? F.peakScale + (1 - F.peakScale) * G.easeOutCubic(settle) : 1;
        a = 1;
      }
      var spin = t > F.settleEnd
        ? Math.min(1, (t - F.settleEnd) / (F.overlayAt - F.settleEnd)) * 6 * Math.PI / 180 : 0;
      if (t > F.overlayAt) {
        a = 1 - fEaseIn(fade);
        s = 1 + (0.90 - 1) * fEaseIn(fade);
      }
      var main = { s: s, a: a, p: bloom, spin: spin };
      var sats = flowerTargets(F).map(function (cfg) {
        var p = fSeg(t, cfg.delay, cfg.delay + F.satDur);
        if (p <= 0) return { cx: F.main.x, cy: F.main.y, s: 0, a: 0, p: 0, cfg: cfg };
        var mv = G.easeOutCubic(p);
        var sc = cfg.size * G.easeOutBack(p);
        var al = G.easeOutCubic(fSeg(t, cfg.delay, cfg.delay + F.budEnd));
        if (t > F.overlayAt) {
          al = 1 - fEaseIn(fade);
          sc = cfg.size + (cfg.size * 0.9 - cfg.size) * fEaseIn(fade);
        }
        return {
          cx: F.main.x + (cfg.tx - F.main.x) * mv,
          cy: F.main.y + (cfg.ty - F.main.y) * mv,
          s: Math.max(0, sc), a: al, p: p, cfg: cfg
        };
      });
      return { main: main, sats: sats, fade: fade };
    }

    function drawFlowers(c, t, F, low) {
      var f = flowerState(t, F);
      drawFlower(c, F.main.x, F.main.y, f.main.s, f.main.a, f.main.p,
        F.colors, F.main.petals, F.main.L, low ? 0 : f.main.spin);
      for (var i = 0; i < f.sats.length; i++) {
        if (low && i % 2 === 1) continue;   // 低帧率降级：卫星花 6→3（取 0/2/4）
        var st = f.sats[i];
        if (st.a <= 0) continue;
        drawFlower(c, st.cx, st.cy, st.s, st.a, st.p,
          [F.colors[st.cfg.color]], 5, F.main.L * st.cfg.size, 0);
      }
    }

    /* ---------------- v0.6 结算期持续小花流 ----------------
     * 首波（主花 + 6 卫星）在 900ms 让位给结算面板后，由这一层接续：
     * 只在面板上方(0~bandTop)与下方(bandBottom~底部)的留白带飘小花，
     * 绝不压住结算文字与按钮。密度按 gap0 → gapMax 指数衰减（由密到疏），
     * 排程走完一遍后尾部循环 → 停在结算页多久都有花，不会戛然而止。
     * 粒子由「关卡序号 + 数据集」做确定性伪随机，同一关每次落点一致。 */
    var flowerStreamCache = null, flowerStreamDst = null;

    function streamRng(key, levelIdx) {
      var h = (2166136261 ^ (levelIdx * 2654435761) ^ (key === 'tangram7' ? 0x9E3779B9 : 0)) >>> 0;
      return function () {
        h ^= h << 13; h >>>= 0;
        h ^= h >>> 17;
        h ^= h << 5; h >>>= 0;
        return (h % 10000) / 10000;
      };
    }

    function makeStreamParticle(t0, rnd, S, F, idx) {
      /* 上下带交替而不是随机：随机会出现「整屏都在上面、下面空着」的时刻，
       * 交替能保证任一时刻上下都有花，画面更均衡。 */
      var top = (idx % 2 === 0);
      var x = 44 + rnd() * (C.DESIGN.w - 88);
      var y = top
        ? (S.bandTopMin + rnd() * Math.max(20, S.bandTop - S.bandTopMin - 40))
        : (S.bandBottom + rnd() * Math.max(20, S.bandBottomMax - S.bandBottom));
      return {
        t0: t0, x: x, y: y,
        size: S.minSize + rnd() * (S.maxSize - S.minSize),
        ci: Math.floor(rnd() * F.colors.length),
        rot: rnd() * Math.PI * 2,
        spin: (rnd() - 0.5) * 0.8,
        rise: 16 + rnd() * 20
      };
    }

    function flowerStreamParticles(key, levelIdx) {
      if (flowerStreamDst === key + ':' + levelIdx && flowerStreamCache) return flowerStreamCache;
      var S = C.FLOWER.stream, F = C.FLOWER;
      var rnd = streamRng(key, levelIdx);
      var arr = [], t = S.from, gap = S.gap0, guard = 0;
      while (t < S.cycleEnd && guard++ < 200) {
        arr.push(makeStreamParticle(t, rnd, S, F, arr.length));
        gap = S.gap0 + (S.gapMax - S.gap0) * (1 - Math.exp(-(t - S.from) / S.decay));
        t += gap;
      }
      flowerStreamDst = key + ':' + levelIdx;
      flowerStreamCache = arr;
      return arr;
    }

    function drawWinStream(t, low) {
      var S = C.FLOWER.stream, F = C.FLOWER;
      var arr = flowerStreamParticles(state.setKey, state.levelIdx);
      /* 主排程走完后只循环最后一段，维持「稀疏但不断」的余韵 */
      var tail = S.gapMax * 4;
      var wt = t > S.cycleEnd ? (S.cycleEnd - tail + ((t - S.cycleEnd) % tail)) : t;
      var maxAlive = low ? Math.ceil(S.maxAlive / 2) : S.maxAlive;
      var drawn = 0;
      for (var i = 0; i < arr.length && drawn < maxAlive; i++) {
        var p = arr[i];
        var age = wt - p.t0;
        if (age < 0 || age > S.life) continue;
        var q = age / S.life;
        var a = Math.min(Math.min(1, q / 0.14), Math.min(1, (1 - q) / 0.30));
        if (a <= 0.01) continue;
        var bloom = Math.min(1, age / 380);
        var sc = (0.72 + 0.34 * G.easeOutCubic(bloom)) * (1 - 0.10 * q);
        drawFlower(ctx, p.x, p.y - p.rise * (age / 1000), sc, a * 0.95, bloom,
          [F.colors[p.ci]], S.petals, p.size,
          low ? 0 : (p.rot + p.spin * (age / 1000)));
        drawn++;
      }
    }

    /* 主按钮 / 次按钮 / 工具按钮 */
    function drawButton(b) {
      var pressed = state.press === b.id;
      var dy = pressed ? 2 : 0;
      var x = b.x - b.w / 2, y = b.y - b.h / 2 + dy;
      ctx.save();
      if (b.variant === 'primary' || b.variant === 'danger') {
        var isDanger = b.variant === 'danger';
        shadow(10, 4, COL.shadow);
        rr(x, y, b.w, b.h, b.h / 2);
        var gr = ctx.createLinearGradient(0, y, 0, y + b.h);
        if (isDanger) { gr.addColorStop(0, '#FF7A63'); gr.addColorStop(1, '#F2543F'); }
        else { gr.addColorStop(0, COL.gold); gr.addColorStop(1, COL.goldDeep); }
        ctx.fillStyle = gr; ctx.fill();
        noShadow();
        ctx.save(); rr(x, y, b.w, b.h, b.h / 2); ctx.clip();
        ctx.fillStyle = isDanger ? '#C93A28' : COL.goldEdge;
        ctx.fillRect(x, y + b.h - C.LAYOUT.BTN_EDGE + (pressed ? 2 : 0), b.w, C.LAYOUT.BTN_EDGE * 2);
        ctx.restore();
        var fg = isDanger ? '#FFFFFF' : COL.btnText;
        if (b.disabled) fg = isDanger ? 'rgba(255,255,255,0.55)' : 'rgba(122,74,0,0.45)';
        if (b.icon) drawIcon(b.icon, b.x - b.w / 2 + 56, b.y + dy, fg, 0.95);
        text(b.label, b.x + (b.icon ? 18 : 0), b.y + dy, b.size || 32, fg, 'center', '600');
      } else if (b.variant === 'tool') {
        var dis = !!b.disabled;
        rr(x, y, b.w, b.h, 24);
        ctx.fillStyle = dis ? COL.disabledBg : COL.card;
        ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = dis ? COL.disabledBg : COL.cardEdge;
        ctx.stroke();
        noShadow();
        // v0.4 A3：翻转按钮 tip 汉字已删除，图标恢复满尺寸居中（v0.3.2 布局）
        drawIcon(b.icon, b.x, b.y + dy,
          dis ? COL.disabledIcon : COL.text, b.iconScale || 1);
        if (b.badge) {
          // v0.3 A3 当前提示档角标（右上角小圆 + 档号）
          var bx = b.x + b.w / 2 - 12, byy = b.y - b.h / 2 + 12 + (pressed ? 2 : 0);
          ctx.beginPath();
          ctx.arc(bx, byy, 12, 0, Math.PI * 2);
          ctx.fillStyle = COL.gold; ctx.fill();
          text(String(b.badge), bx, byy + 1, 15, COL.btnText, 'center', '700');
        }
      } else {
        // secondary
        rr(x, y, b.w, b.h, 20);
        ctx.fillStyle = COL.card; ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = COL.cardEdge; ctx.stroke();
        ctx.save(); rr(x, y, b.w, b.h, 20); ctx.clip();
        ctx.fillStyle = COL.cardEdge;
        ctx.fillRect(x, y + b.h - C.LAYOUT.BTN_EDGE + (pressed ? 2 : 0), b.w, C.LAYOUT.BTN_EDGE * 2);
        ctx.restore();
        text(b.label, b.x, b.y + dy, b.size || 30, b.disabled ? COL.textSub : COL.text, 'center', '500');
      }
      ctx.restore();
    }

    function drawIcon(name, cx, cy, color, s) {
      s = s || 1;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(s, s);
      ctx.strokeStyle = color; ctx.fillStyle = color;
      ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      var r = 22;
      if (name === 'back') {
        ctx.beginPath();
        ctx.moveTo(6, -r); ctx.lineTo(-8, 0); ctx.lineTo(6, r);
        ctx.stroke();
      } else if (name === 'rotL' || name === 'rotR') {
        var dir = name === 'rotR' ? 1 : -1;
        ctx.beginPath();
        ctx.arc(0, 2, r * 0.8, dir > 0 ? -0.5 : Math.PI - 2.2, dir > 0 ? 2.2 : Math.PI + 0.5, dir < 0);
        ctx.stroke();
        var a = dir > 0 ? 2.2 : Math.PI - 2.2;
        var px = Math.cos(a) * r * 0.8, py = 2 + Math.sin(a) * r * 0.8;
        ctx.beginPath();
        ctx.moveTo(px - 8, py - 3);
        ctx.lineTo(px + 6, py + 5);
        ctx.lineTo(px + 2, py - 10);
        ctx.closePath();
        ctx.fill();
      } else if (name === 'flip') {
        // ⇄ 双向箭头：上排向右、下排向左（原版是"竖线+三角"，辨识度太低，改成标准双向箭头）
        ctx.beginPath();
        ctx.moveTo(-13, -7); ctx.lineTo(12, -7);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(13, -7); ctx.lineTo(6, -12.5); ctx.lineTo(6, -1.5);
        ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(13, 7); ctx.lineTo(-12, 7);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-13, 7); ctx.lineTo(-6, 1.5); ctx.lineTo(-6, 12.5);
        ctx.closePath(); ctx.fill();
      } else if (name === 'hint') {
        // 灯泡：圆 + 颈 + 两道底边
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.arc(0, -3, 11, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-5, 7); ctx.lineTo(-5, 12); ctx.lineTo(5, 12); ctx.lineTo(5, 7);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-4, 17); ctx.lineTo(4, 17);
        ctx.stroke();
      } else if (name === 'restart') {
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.85, -0.6, 4.4);
        ctx.stroke();
        var ax = Math.cos(-0.6) * r * 0.85, ay = Math.sin(-0.6) * r * 0.85;
        ctx.beginPath();
        ctx.moveTo(ax - 9, ay - 1); ctx.lineTo(ax + 5, ay + 6); ctx.lineTo(ax + 2, ay - 9);
        ctx.closePath(); ctx.fill();
      } else if (name === 'gear') {
        // 真齿轮：环形主体 + 8 个实心梯形齿 + 中心孔（原版是"圆 + 8 条放射线"，看着像太阳）
        ctx.beginPath();
        ctx.arc(0, 0, 10.5, 0, Math.PI * 2);
        ctx.stroke();
        for (var gi = 0; gi < 8; gi++) {
          ctx.save();
          ctx.rotate(gi * Math.PI / 4);
          ctx.beginPath();
          ctx.moveTo(-3.2, -10);
          ctx.lineTo(-2.2, -15.5);
          ctx.lineTo(2.2, -15.5);
          ctx.lineTo(3.2, -10);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        ctx.beginPath();
        ctx.arc(0, 0, 3.6, 0, Math.PI * 2);
        ctx.stroke();
      } else if (name === 'lock') {
        ctx.lineWidth = 3.5;
        rr(-11, -2, 22, 18, 4); ctx.fill();
        ctx.beginPath();
        ctx.arc(0, -3, 7, Math.PI, 0);
        ctx.stroke();
      } else if (name === 'coin') {
        // 金币：实心圆 + 内圈 + 竖纹
        ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.82)'; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.arc(0, 0, 9.6, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(0, 5);
        ctx.moveTo(-4, -1.5); ctx.lineTo(4, -1.5); ctx.stroke();
        ctx.restore();
      } else if (name === 'energy') {
        // 闪电
        ctx.beginPath();
        ctx.moveTo(3, -17); ctx.lineTo(-12, 2); ctx.lineTo(-1, 2);
        ctx.lineTo(-4, 17); ctx.lineTo(12, -3); ctx.lineTo(1, -3);
        ctx.closePath(); ctx.fill();
      } else if (name === 'heart') {
        ctx.beginPath();
        ctx.moveTo(0, 14);
        ctx.bezierCurveTo(-21, -2, -14, -17, 0, -7);
        ctx.bezierCurveTo(14, -17, 21, -2, 0, 14);
        ctx.closePath(); ctx.fill();
      } else if (name === 'gift') {
        ctx.lineWidth = 3;
        rr(-14, -4, 28, 18, 3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-17, -8); ctx.lineTo(17, -8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, 14); ctx.stroke();
        ctx.beginPath(); ctx.arc(-6.5, -13, 5, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(6.5, -13, 5, 0, Math.PI * 2); ctx.stroke();
      } else if (name === 'desktop') {
        ctx.lineWidth = 3;
        rr(-10, -17, 17, 34, 4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-6, 12); ctx.lineTo(-1, 12); ctx.stroke();
        ctx.lineWidth = 2.6;
        rr(9, -6, 7, 7, 1.6); ctx.stroke();
        rr(9, 3, 7, 7, 1.6); ctx.stroke();
        rr(9, 12, 7, 7, 1.6); ctx.stroke();
      } else if (name === 'skin') {
        ctx.lineWidth = 3;
        if (ctx.ellipse) { ctx.beginPath(); ctx.ellipse(0, 0, 17, 13, 0, 0, Math.PI * 2); ctx.stroke(); }
        else { ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(-7, -5, 3.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(2, -8, 3.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(9, 2, 3.2, 0, Math.PI * 2); ctx.fill();
      } else if (name === 'invite') {
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(-7, -7, 6, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(9, -4, 5, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(-7, 15, 11, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke();
        ctx.beginPath(); ctx.arc(9, 16, 9, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke();
      } else if (name === 'task') {
        ctx.lineWidth = 3;
        rr(-13, -17, 26, 34, 4); ctx.stroke();
        ctx.lineWidth = 2.6;
        for (var ti = 0; ti < 3; ti++) {
          var ty = -9 + ti * 9;
          ctx.beginPath(); ctx.moveTo(-7, ty); ctx.lineTo(-4, ty + 3); ctx.lineTo(1, ty - 3); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(4, ty); ctx.lineTo(10, ty); ctx.stroke();
        }
      } else if (name === 'online') {
        ctx.lineWidth = 3;
        rr(-15, -5, 30, 18, 3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-15, -5); ctx.quadraticCurveTo(0, -21, 15, -5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(0, 13); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, -1, 2.8, 0, Math.PI * 2); ctx.fill();
      } else if (name === 'rank') {
        rr(-15, 2, 7.5, 13, 2); ctx.fill();
        rr(-3.8, -6, 7.5, 21, 2); ctx.fill();
        rr(7.4, -14, 7.5, 29, 2); ctx.fill();
      } else if (name === 'close') {
        ctx.lineWidth = 4.2;
        ctx.beginPath(); ctx.moveTo(-10, -10); ctx.lineTo(10, 10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(10, -10); ctx.lineTo(-10, 10); ctx.stroke();
      } else if (name === 'share') {
        ctx.beginPath(); ctx.arc(-11, 0, 4.6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(10, -9, 4.6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(10, 9, 4.6, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-7, -2); ctx.lineTo(6, -8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-7, 2); ctx.lineTo(6, 8); ctx.stroke();
      } else if (name === 'tv') {
        ctx.lineWidth = 3;
        rr(-15, -11, 30, 22, 5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-4, -6); ctx.lineTo(8, 0); ctx.lineTo(-4, 6); ctx.closePath(); ctx.fill();
      } else if (name === 'check') {
        ctx.lineWidth = 4.6;
        ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-2, 8); ctx.lineTo(10, -8); ctx.stroke();
      } else if (name === 'plus') {
        ctx.lineWidth = 4.6;
        ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(0, 9); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(9, 0); ctx.stroke();
      }
      ctx.restore();
    }

    function drawStar(cx, cy, r, filled, scale) {
      ctx.save();
      ctx.translate(cx, cy);
      if (scale && scale !== 1) ctx.scale(scale, scale);
      ctx.beginPath();
      for (var i = 0; i < 10; i++) {
        var a = -Math.PI / 2 + i * Math.PI / 5;
        var rr2 = i % 2 === 0 ? r : r * 0.45;
        var x = Math.cos(a) * rr2, y = Math.sin(a) * rr2;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = filled ? COL.starOn : COL.starOff;
      ctx.fill();
      ctx.restore();
    }

    /* 背景：浅木 + 柔光；主界面若美术图到位则用图 */
    /* v0.6：主页底纹光斑（3 个暖色径向渐变，不同相位慢速漂移）。
     * 纯 Canvas，零素材、零热区；低帧率时减到 2 个。 */
    function drawHomeGlow(t, low) {
      var spots = [
        [0.20, 0.30, 0.62, 0.00],
        [0.80, 0.60, 0.55, 1.90],
        [0.46, 0.86, 0.50, 3.40]
      ];
      var n = low ? 2 : 3;
      for (var i = 0; i < n; i++) {
        var s = spots[i];
        var px = C.DESIGN.w * s[0] + Math.sin(t * (0.42 + i * 0.10) + s[3]) * 136;
        var py = C.DESIGN.h * s[1] + Math.cos(t * (0.33 + i * 0.08) + s[3]) * 104;
        var r = C.DESIGN.w * s[2] * (1 + 0.07 * Math.sin(t * 0.55 + i));
        var gr = ctx.createRadialGradient(px, py, r * 0.10, px, py, r);
        gr.addColorStop(0, 'rgba(255,244,214,0.34)');
        gr.addColorStop(0.55, 'rgba(255,232,190,0.12)');
        gr.addColorStop(1, 'rgba(255,232,190,0)');
        ctx.fillStyle = gr;
        ctx.fillRect(0, 0, C.DESIGN.w, C.DESIGN.h);
      }
      drawHomeSweep(t);
    }

    /* v0.6：11 秒一次的柔光扫过（斜向白色渐变带，峰值不透明度仅 0.09）。
     * 光斑负责「呼吸」，这一道负责「看得见的流动」——手机上静止图与动画一眼能分。 */
    function drawHomeSweep(t) {
      var ph = (t / 11) % 1;
      var sx = (-0.45 + ph * 1.9) * C.DESIGN.w;
      ctx.save();
      ctx.translate(sx, 0);
      ctx.rotate(-0.16);
      var lg = ctx.createLinearGradient(-260, 0, 260, 0);
      lg.addColorStop(0, 'rgba(255,255,255,0)');
      lg.addColorStop(0.5, 'rgba(255,255,255,0.12)');
      lg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(-260, -C.DESIGN.h, 520, C.DESIGN.h * 3);
      ctx.restore();
    }

    function drawBg(withArt) {
      /* v0.6 底纹动效（纯 Canvas，零素材），两条背景路径共用：
       * 1) 有底图时做 Ken Burns——1.035 倍 + ±10px 极缓平移，静止底图有呼吸感；
       * 2) 光斑层 drawHomeGlow 单独叠在最后，素材缺失走渐变兜底时同样有流动的光。
       * reduceMotion 全停，与鲜花动效同一开关；drawBg(false)（关卡页）不加光效。 */
      var fx = withArt && !state.reduceMotion;
      var t = state.time / 1000;
      var img = withArt && env.images && env.images.home_bg_desk;
      if (img) {
        var sc = Math.max(C.DESIGN.w / (img.width || 1), C.DESIGN.h / (img.height || 1)) * (fx ? 1.06 : 1);
        var dw = (img.width || 1) * sc, dh = (img.height || 1) * sc;
        var dx = (C.DESIGN.w - dw) / 2 + (fx ? Math.sin(t * 0.26) * 22 : 0);
        var dy = (C.DESIGN.h - dh) / 2 + (fx ? Math.cos(t * 0.19) * 18 : 0);
        ctx.drawImage(img, dx, dy, dw, dh);
        /* v0.5：皮肤色罩——主界面用固定背景图，不叠罩则换肤几乎看不出 */
        if (COL.tint) { ctx.fillStyle = COL.tint; ctx.fillRect(0, 0, C.DESIGN.w, C.DESIGN.h); }
      } else {
        var g = ctx.createLinearGradient(0, 0, 0, C.DESIGN.h);
        g.addColorStop(0, COL.bgTop || COL.card || '#FBF3E6');   // v0.5：随皮肤变化
        g.addColorStop(0.45, COL.bg);
        g.addColorStop(1, COL.bgDeep);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, C.DESIGN.w, C.DESIGN.h);
        // 左上柔光
        var rg = ctx.createRadialGradient(180, 180, 20, 180, 180, 620);
        rg.addColorStop(0, 'rgba(255,255,255,0.85)');
        rg.addColorStop(0.55, 'rgba(255,255,255,0.22)');
        rg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, C.DESIGN.w, C.DESIGN.h);
        /* v0.3.1 A1：删除原「极淡木纹」9 条横向贝塞尔线——
         * 关卡页 drawBg(false) 走渐变分支，这些线在米色底上形成贯穿横条，
         * 用户反馈「布局错乱」。保留渐变 + 左上柔光即可。 */
      }
      if (fx) drawHomeGlow(t, !!state.lowFps);
    }

    /* ---------------- 主界面 ---------------- */
    function renderHome() {
      drawBg(true);
      var t = state.time / 1000;
      var float = Math.sin(t * 1.4) * 3;

      /* v0.6：标题 / 副标题 / 装饰恒定，不随数据集联动。
       * 旧版标题写死「四巧 · 七巧」、装饰取当前数据集头 4 块，
       * 在下面点「七巧板」后上面 logo 跟着变，用户误以为点错了按钮。 */
      text(C.BRAND.name, C.DESIGN.w / 2, 412 + float, 76, COL.text, 'center', '700');
      text(C.BRAND.slogan, C.DESIGN.w / 2, 480 + float, 26, COL.textSub, 'center');

      /* 固定装饰：坐标见 config.HOME_DECO，四巧/七巧怎么切都不动一个像素 */
      var deco = C.HOME_DECO;
      for (var i = 0; i < deco.pieces.length; i++) {
        var d = deco.pieces[i];
        var bob = float + Math.sin(t * 1.1 + i * 0.9) * 3;
        ctx.save();
        ctx.translate(C.DESIGN.w / 2 + deco.cxOff, deco.cy + bob);
        ctx.beginPath();
        for (var k = 0; k < d.pts.length; k++) {
          if (k === 0) ctx.moveTo(d.pts[k][0], d.pts[k][1]);
          else ctx.lineTo(d.pts[k][0], d.pts[k][1]);
        }
        ctx.closePath();
        shadow(12, 4, 'rgba(44,58,75,0.13)');
        ctx.fillStyle = d.c;
        ctx.fill();
        noShadow();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.stroke();
        ctx.restore();
      }

      /* ================= HUD：巧币 + 体力（左上） ================= */
      var hy = view.safeTop + 58;
      drawIcon('coin', 84, hy, COL.gold, 1.0);
      text(String(state.save.coin || 0), 114, hy, 32, COL.text, 'left', '700');
      var ey = hy + 58;
      drawIcon('energy', 84, ey, '#3DBEF0', 0.9);
      text((state.save.energy || 0) + '/' + state.save.energyMax, 114, ey, 26, COL.text, 'left', '600');
      ctx.beginPath(); ctx.arc(262, ey, 20, 0, Math.PI * 2);
      ctx.fillStyle = COL.progressA; ctx.fill();
      drawIcon('plus', 262, ey, '#FFFFFF', 0.42);
      addHit(262, ey, 64, 64, 'hud_energy');

      /* 主页入口：图标 + 下方小字。
       * v0.6 修「图标与标签重叠」：图标 96→88、标签偏移 76→68、行距 130→142，
       * 标签底(中心+78) 与下一图标顶(中心+98) 之间留 20px。 */
      var H = C.LAYOUT.HOME;
      function homeEntry(id, icon, label, ex, eyy, badge) {
        var eb = { id: id, x: ex, y: eyy, w: H.entryW, h: H.entryW, variant: 'tool', icon: icon };
        addHit(ex, eyy, H.entryW, H.entryW, id);
        drawButton(eb);
        text(label, ex, eyy + H.labelDy, H.labelSize, COL.textSub, 'center', '500');
        if (badge) {
          ctx.beginPath(); ctx.arc(ex + 36, eyy - 36, 8, 0, Math.PI * 2);
          ctx.fillStyle = '#FF5A5A'; ctx.fill();
        }
      }
      var lx = H.entryX, rx = C.DESIGN.w - H.entryX, e0 = H.entryY0, eg = H.entryGap;
      homeEntry('entry_desktop', 'desktop', '添加桌面', lx, e0);
      homeEntry('entry_skin', 'skin', '皮肤', lx, e0 + eg);
      homeEntry('entry_invite', 'invite', '邀请有礼', lx, e0 + eg * 2,
        state.save.inviteDay !== todayKey());
      homeEntry('entry_task', 'task', '任务', lx, e0 + eg * 3,
        taskList().some(function (it) { return it.done && !it.got; }));

      /* 在线奖励：图标 + 上方倒计时气泡（气泡不与任何标签同行） */
      homeEntry('online_claim', 'online', '在线奖励', rx, e0 + eg * 1.5);
      var ol = onlineLeft();
      var om = Math.floor(ol / 60), os2 = Math.floor(ol % 60);
      var otxt = ol > 0 ? ((om < 10 ? '0' : '') + om + ':' + (os2 < 10 ? '0' : '') + os2) : '可领';
      var bbx = rx, bby = e0 + eg * 1.5 - 70, bw2 = 92, bh2 = 36;
      ctx.save();
      rr(bbx - bw2 / 2, bby - bh2 / 2, bw2, bh2, bh2 / 2);
      ctx.fillStyle = ol > 0 ? 'rgba(255,255,255,0.95)' : '#FF5A5A';
      ctx.fill();
      noShadow();
      ctx.restore();
      text(otxt, bbx, bby, 19, ol > 0 ? COL.goldDeep : '#FFFFFF', 'center', '700');

      var startLabel = state.save.unlockedMax > 1
        ? '继续 第 ' + Math.min(state.save.unlockedMax, LEVELS.length) + ' 关'
        : '开始';
      var b1 = { id: 'start', x: C.DESIGN.w / 2, y: H.startY, w: 420, h: 108, label: startLabel, variant: 'primary', size: 32 };
      addHit(b1.x, b1.y, b1.w, b1.h, 'start');
      drawButton(b1);

      /* ================= v0.6 两套拼图固定入口 =================
       * 四巧板永远在上（y=1150）、七巧板永远在下（y=1250），编号 set_t4 / set_t7。
       * 旧版是「当前集」+「另一个集」两个按钮，切换后文案互换 → 看起来按钮换了位置。
       * 现在两个按钮各指一套，点谁进谁的关卡列表，当前那套加金色描边。 */
      function setEntry(id, key, name, yy) {
        var meta = SETS && SETS[key];
        var n = meta && meta.levels ? meta.levels.length : 0;
        var b = { id: id, x: C.DESIGN.w / 2, y: yy, w: 420, h: 88,
          label: name + ' · ' + n + ' 关', variant: 'secondary', size: 28 };
        addHit(b.x, b.y, b.w, b.h, id);
        drawButton(b);
        if (state.setKey === key) {
          ctx.save();
          rr(b.x - b.w / 2 - 4, b.y - b.h / 2 - 4, b.w + 8, b.h + 8, (b.h + 8) / 2);
          ctx.lineWidth = 3;
          ctx.strokeStyle = COL.gold;
          ctx.stroke();
          ctx.restore();
        }
        return b;
      }
      setEntry('set_t4', 'tangram4', '四巧板', H.set4Y);
      setEntry('set_t7', 'tangram7', '七巧板', H.set7Y);

      var gy = view.safeTop + 40;
      var gb = { id: 'settings', x: C.DESIGN.w - 70, y: gy, w: 76, h: 76, variant: 'tool', icon: 'gear' };
      addHit(gb.x, gb.y, gb.w, gb.h, 'settings');
      drawButton(gb);

      text('已获得 ' + totalStars() + '/' + (LEVELS.length * 3) + ' 星', C.DESIGN.w / 2, 1360, 24, COL.textSub, 'center');
    }

    /* ---------------- 关卡选择（v0.2：120 关，按章分页） ----------------
     * 120 关塞不进一屏，改成「章节胶囊 + 4×5 格」。
     * 每章 20 关 = 4 列 × 5 行，正好一屏，不需要滚动（小游戏里滚动列表
     * 会跟拖拽手势打架，能不分页滚动就不滚）。 */
    /* v0.3 A1：CHAP_PER / CHAP_NAMES 全部从数据集读取（buildSet/useSet 已赋值），
     * 四巧板 6×20、七巧板 6×10 由同一套代码自适应。 */
    function chapterCount() { return Math.max(1, Math.ceil(LEVELS.length / CHAP_PER)); }
    function chapterName(c) {
      return CHAP_NAMES[c] || ('第 ' + (c + 1) + ' 章');
    }

    /* 选关页目标图案缩略图：outline 是 1000×1000 归一化坐标，
     * 取 bbox 后等比缩放居中画进图形区（不拉伸）。
     * 配色沿用对局页目标轮廓：targetFill 填充 + targetEdge 描边；
     * 未解锁关走 disabled 系（灰化），一眼区分「能玩 / 还没开」。 */
    function drawLevelThumb(outline, cx, cy, maxW, maxH, fill, edge) {
      if (!outline || outline.length < 3) return;
      var bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
      for (var i = 0; i < outline.length; i++) {
        var v = outline[i];
        if (v[0] < bx0) bx0 = v[0];
        if (v[0] > bx1) bx1 = v[0];
        if (v[1] < by0) by0 = v[1];
        if (v[1] > by1) by1 = v[1];
      }
      var bw = bx1 - bx0, bh = by1 - by0;
      if (!(bw > 0) || !(bh > 0)) return;
      var s = Math.min(maxW / bw, maxH / bh);
      var ox = cx - bw * s / 2, oy = cy - bh * s / 2;
      ctx.save();
      ctx.beginPath();
      for (var j = 0; j < outline.length; j++) {
        var px = ox + (outline[j][0] - bx0) * s;
        var py = oy + (outline[j][1] - by0) * s;
        if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = fill; ctx.fill();
      ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
      ctx.strokeStyle = edge; ctx.stroke();
      ctx.restore();
    }

    function renderLevels() {
      drawBg(false);
      var by = view.safeTop + 40;
      var bb = { id: 'back_home', x: 70, y: by + 8, w: 76, h: 76, variant: 'tool', icon: 'back' };
      addHit(bb.x, bb.y, bb.w, bb.h, 'back_home');
      drawButton(bb);
      text('关卡', C.DESIGN.w / 2, by + 8, 40, COL.text, 'center', '600');

      var nCh = chapterCount();
      var page = Math.max(0, Math.min(state.lvPage || 0, nCh - 1));
      state.lvPage = page;

      /* 章节胶囊 */
      var pw = 96, ph = 64, pgap = 10;
      var ptotal = nCh * pw + (nCh - 1) * pgap;
      var px0 = (C.DESIGN.w - ptotal) / 2 + pw / 2;
      var py = view.safeTop + 96 + ph / 2;
      for (var c = 0; c < nCh; c++) {
        var pcx = px0 + c * (pw + pgap);
        var on = c === page;
        var pressed = state.press === 'lvpage_' + c;
        ctx.save();
        rr(pcx - pw / 2, py - ph / 2 + (pressed ? 2 : 0), pw, ph, ph / 2);
        ctx.fillStyle = on ? COL.gold : COL.card;
        ctx.fill();
        if (!on) { ctx.lineWidth = 2; ctx.strokeStyle = COL.line; ctx.stroke(); }
        ctx.restore();
        // 选中章用深棕字（橙底白字对比度只有 2:1）
        // v0.3 A1/V8：数据集自带 chapTitles（题材短名）时胶囊显示题材名，否则保持「第N章」
        var lbl = (CHAP_TITLES && CHAP_TITLES[c]) || ('第' + (c + 1) + '章');
        var fSize = (CHAP_TITLES && lbl.length > 2) ? 20 : 24;
        text(lbl, pcx, py, fSize, on ? COL.btnText : COL.textSub, 'center', '600');
        addHit(pcx, py, pw, ph, 'lvpage_' + c, 'btn');
      }
      // 章名放在胶囊下方，给玩家一个语义锚点（"这章在练什么"）
      text('第 ' + (page + 1) + ' 章 · ' + chapterName(page) + '　' + (page * CHAP_PER + 1) + '-' +
        Math.min((page + 1) * CHAP_PER, LEVELS.length) + ' 关',
        C.DESIGN.w / 2, py + ph / 2 + 34, 24, COL.textSub, 'center');

      /* 4 列 × 5 行 */
      var cols = 4, cw = 160, chh = 196, gx = 16, gy2 = 16;
      var n = Math.min(CHAP_PER, LEVELS.length - page * CHAP_PER);
      var totalW = cols * cw + (cols - 1) * gx;
      var x0 = (C.DESIGN.w - totalW) / 2 + cw / 2;
      var top = py + ph / 2 + 66 + chh / 2;
      for (var i = 0; i < n; i++) {
        var idx = page * CHAP_PER + i;
        var cx = x0 + (i % cols) * (cw + gx);
        var cy = top + Math.floor(i / cols) * (chh + gy2);
        var locked = (idx + 1) > state.save.unlockedMax;
        var press = state.press === 'lvl_' + (idx + 1);
        // 入场：opacity 0→1 / translateY +12→0，240ms，错峰 i×24ms
        var tk = Math.max(0, Math.min(1, (state.pageT - i * 24) / 240));
        tk = 1 - (1 - tk) * (1 - tk);
        var cellY = cy + (1 - tk) * 12;
        ctx.save();
        ctx.globalAlpha = tk;
        cardBox(cx - cw / 2, cellY - chh / 2 + (press ? 2 : 0), cw, chh, C.CARD.radius,
          { fill: locked ? COL.disabledBg : COL.card });

        // 原关号大字 → 该关目标图案缩略图（等比居中，locked 走 disabled 灰化）
        var lv = LEVELS[idx];
        drawLevelThumb(lv.outline, cx, cellY - 30, 116, 104,
          locked ? COL.disabledIcon : COL.targetFill,
          locked ? COL.textSub : COL.targetEdge);
        if (locked) {
          drawIcon('lock', cx, cellY + 46, COL.disabledIcon, 0.8);
        } else {
          var stars = state.save.starOf[String(idx + 1)] || 0;
          for (var s = 0; s < 3; s++) {
            drawStar(cx - 40 + s * 40, cellY + 48, 17, s < stars);
          }
        }
        // 小字关号保留在星星行下方：报关号/对答案仍方便，且不与图案、星星重叠
        text(String(idx + 1), cx, cellY + 82, 18, COL.textSub, 'center', '600');
        ctx.restore();
        addHit(cx, cellY, cw, chh, 'lvl_' + (idx + 1), 'btn');
      }
    }

    /* ---------------- 对局页 ---------------- */
    function renderPlay() {
      var lv = LEVELS[state.levelIdx];
      drawBg(false);

      /* 顶栏 */
      var by = view.safeTop + 40;
      var bb = { id: 'back_levels', x: 70, y: by, w: 76, h: 76, variant: 'tool', icon: 'back' };
      addHit(bb.x, bb.y, bb.w, bb.h, 'back_levels');
      drawButton(bb);
      // 关卡名可以为空（120 关里只有少数形状真的像某个物件），空名只显示关号。
      // 名字过长会压住右侧计时器（第 120 关实测溢出），量一下宽度，放不下就只留关号。
      var head = '第 ' + (state.levelIdx + 1) + ' 关';
      var full = lv.name ? head + ' · ' + lv.name : head;
      var titleTxt = full;
      if (lv.name && ctx.measureText) {
        ctx.save();
        ctx.font = font(34, '600');
        /* v0.3.4 A2：时间改 32px/700 + 浅胶囊底，占位比原来宽约 36px，
         * 阈值同步收紧 450→370，保证长标题降级后仍不与计时胶囊重叠。 */
        if (ctx.measureText(full).width > C.DESIGN.w - 520) titleTxt = head;   // v0.5：右侧 3 心+倒计时占位变宽
        ctx.restore();
      }
      text(titleTxt, C.DESIGN.w / 2, by, 34, COL.text, 'center', '600');
      /* v0.5 A：生命值（3 心，随剩余时间递减）+ 倒计时胶囊。
       * 倒计时 ≤warnSec 时数字转红并轻微脉冲，给紧迫感。 */
      var leftS = Math.max(0, Math.ceil(state.timeLeft));
      var mm = Math.floor(leftS / 60), ss = leftS % 60;
      var timeTxt = (mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss;
      var warn = leftS <= C.TIMER.warnSec;
      var capW = 214, capH = 48, capR = C.DESIGN.w - 42;
      ctx.save();
      rr(capR - capW, by - capH / 2, capW, capH, capH / 2);
      ctx.fillStyle = 'rgba(255,255,255,0.74)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = warn ? 'rgba(229,72,77,0.35)' : 'rgba(227,233,242,0.9)';
      ctx.stroke();
      ctx.restore();
      var hcnt = C.TIMER.hearts;
      for (var hi = 0; hi < hcnt; hi++) {
        var hx = capR - capW + 26 + hi * 30;
        drawIcon('heart', hx, by, hi < state.hearts ? '#FF5A5A' : 'rgba(150,162,180,0.42)', 0.60);
      }
      var pl = warn ? (1 + Math.sin(state.time * 0.012) * 0.07) : 1;
      ctx.save();
      ctx.translate(capR - 16, by);
      ctx.scale(pl, pl);
      text(timeTxt, 0, 0, 30, warn ? '#E5484D' : COL.btnText, 'right', '700');
      ctx.restore();

      /* 拼图卡纸 */
      var B = LAY.BOARD;
      ctx.save();
      shadow(16, 4, COL.shadow);
      rr(B.x, B.y, B.size, B.size, 28);
      ctx.fillStyle = COL.card; ctx.fill();
      noShadow();
      ctx.restore();
      // 纸纹（极淡）
      var paper = env.images && env.images.board_paper;
      if (paper) {
        ctx.save(); rr(B.x, B.y, B.size, B.size, 28); ctx.clip();
        ctx.drawImage(paper, B.x, B.y, B.size, B.size);
        ctx.restore();
      } else {
        ctx.save(); rr(B.x, B.y, B.size, B.size, 28); ctx.clip();
        ctx.strokeStyle = 'rgba(44,58,75,0.022)'; ctx.lineWidth = 1;
        for (var i = 0; i < 26; i++) {
          var yy = B.y + 20 + i * 27;
          ctx.beginPath(); ctx.moveTo(B.x, yy); ctx.lineTo(B.x + B.size, yy + 6); ctx.stroke();
        }
        ctx.restore();
      }

      /* 目标轮廓（v0.3.1 A2 提示三档重定义：三档都不泄露拼法，只渐进弱化目标形状）
       * 档1 虚线轮廓(3px,[8,6])+淡填充 / 档2 细实线轮廓(1.5px)+淡填充 / 档3 纯剪影无描边。
       * v0.3 的「档1 内部分割线」已整块删除——那等于把标准解画给玩家。
       * 四巧板（无 splitLines）不参与降档，固定用档1 样式，保持 v0.3 外观零回归。 */
      var hasTiersLv = !!(lv.splitLines && lv.splitLines.length);
      var drawTier = hasTiersLv ? (state.hintTier || 2) : 1;
      var outline = lv.outline.map(function (v) { return [w2d(v[0]), h2d(v[1])]; });
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(outline[0][0], outline[0][1]);
      for (var o = 1; o < outline.length; o++) ctx.lineTo(outline[o][0], outline[o][1]);
      ctx.closePath();
      ctx.fillStyle = drawTier === 3 ? COL.targetSilhouette : COL.targetFill;
      ctx.fill();
      if (drawTier === 1) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = COL.targetEdge;
        ctx.setLineDash([8, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (drawTier === 2) {
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = COL.targetEdge;
        ctx.stroke();
      }
      ctx.restore();

      /* 提示高亮 */
      if (state.hint) {
        var hs = null;
        for (var q = 0; q < lv.solution.length; q++) if (lv.solution[q].id === state.hint.id) hs = lv.solution[q];
        if (hs) {
          var hp = G.toWorld(LOCAL[hs.id], hs).map(function (v) { return [w2d(v[0]), h2d(v[1])]; });
          var a = 0.35 + 0.3 * Math.sin(state.time / 180);
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(hp[0][0], hp[0][1]);
          for (var h2 = 1; h2 < hp.length; h2++) ctx.lineTo(hp[h2][0], hp[h2][1]);
          ctx.closePath();
          ctx.fillStyle = 'rgba(255,185,61,' + a.toFixed(2) + ')';
          ctx.fill();
          ctx.lineWidth = 3; ctx.strokeStyle = COL.gold; ctx.stroke();
          ctx.restore();
        }
      }

      /* 已上板的板件（先画，被拖的那块最后画） */
      var dragging = state.drag ? state.drag.id : null;
      for (var m = 0; m < state.pieces.length; m++) {
        var p = state.pieces[m];
        if (!p.onBoard || p.id === dragging) continue;
        drawBoardPiece(p);
      }

      /* 托盘：所有槽位都画底框——有板的槽也要有，否则板看起来是浮在桌面上的。
       * v0.3.4 A1：改成两遍绘制（先全部槽框、后全部板件）。旧版逐槽「框+板」交替，
       * 后画的空槽虚线框会压在前一行板件上，行距只有 4px 时就是"绿三角上方横线穿过"。 */
      for (var t = 0; t < state.pieces.length; t++) {
        var tp = state.pieces[t];
        var sp2 = SLOT_POS[tp.slot];
        var sx = sp2.x - sp2.w / 2;
        var sy = sp2.y - sp2.h / 2;
        ctx.save();
        rr(sx, sy, sp2.w, sp2.h, 22);
        ctx.fillStyle = COL.slotBg;
        ctx.fill();
        if (tp.onBoard) {
          // 空槽再加虚线轮廓，暗示"这块已经上板了"
          ctx.setLineDash([8, 8]);
          ctx.lineWidth = 2;
          ctx.strokeStyle = COL.lineDeep;
          ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.restore();
      }
      for (t = 0; t < state.pieces.length; t++) {
        if (!state.pieces[t].onBoard) drawTrayPiece(state.pieces[t]);
      }

      /* 拖动中的板最后画（在最上层） */
      if (dragging) {
        var dp = pieceOf(dragging);
        if (dp) drawBoardPiece(dp);
      }

      /* v0.3.2 B1：已选中且已上板的板件，在角上手柄锚点画旋转手柄（最上层，成局后隐藏）。
       * 与 handlePlayDown 共用 handleDesign()，视觉与热区始终同心；质心不再被手柄占用。 */
      if (!state.win && state.selId) {
        var selp = pieceOf(state.selId);
        if (selp && selp.onBoard) {
          var hpos = handleDesign(selp);
          drawRotateHandle(hpos[0], hpos[1]);
        }
      }

      /* 覆盖率进度条 */
      var P = LAY.PROGRESS;
      text('覆盖', P.x, P.y + P.h / 2, 26, COL.textSub, 'left');
      var px = P.x + 74, pw = P.w - 74;
      rr(px, P.y, pw, P.h, P.h / 2);
      ctx.fillStyle = COL.track; ctx.fill();
      var pct = Math.max(0, Math.min(1, state.cov));
      if (pct > 0.001) {
        ctx.save();
        rr(px, P.y, pw, P.h, P.h / 2); ctx.clip();
        var pg = ctx.createLinearGradient(px, 0, px + pw, 0);
        pg.addColorStop(0, COL.progressA); pg.addColorStop(1, COL.progressB);
        ctx.fillStyle = pg;
        ctx.fillRect(px, P.y, Math.max(P.h, pw * pct), P.h);
        ctx.restore();
      }
      text(Math.round(pct * 100) + '%', C.DESIGN.w - 60, P.y + P.h / 2, 26, COL.text, 'right', '600');

      /* 提示文字 */
      if (state.msgT > 0) {
        var alpha = Math.min(1, state.msgT / 400);
        ctx.save();
        ctx.globalAlpha = alpha;
        text(state.msg, C.DESIGN.w / 2, P.y + 52, 26, COL.textSub, 'center');
        ctx.restore();
      }

      /* 工具栏 */
      var sel = pieceOf(state.selId);
      var hasTiers = !!(lv.splitLines && lv.splitLines.length);
      var tools = [
        { id: 'rot_ccw', icon: 'rotL', disabled: !sel },
        { id: 'rot_cw', icon: 'rotR', disabled: !sel },
        /* v0.4 A1/A3：翻转 = 双击板件本体 或 本按钮；长按已移除、tip 汉字已删除 */
        { id: 'flip', icon: 'flip', disabled: !sel },
        /* v0.3 A3：提示按钮 = 首次高亮下一块；再用 = 降档 1→2→3（仅带分割线的关卡）。
         * 角标显示当前档；四巧板关卡无分割线，行为与 v0.2 完全一致。 */
        { id: 'hint', icon: 'hint', badge: hasTiers ? state.hintTier : 0,
          disabled: state.hintUsed && (!hasTiers || state.hintTier >= 3) },
        { id: 'restart', icon: 'restart', disabled: false }
      ];
      for (var i2 = 0; i2 < tools.length; i2++) {
        var tb = {
          id: tools[i2].id, x: TOOL_X[i2], y: TOOL_Y,
          w: LAY.TOOLBAR.w, h: LAY.TOOLBAR.h,
          variant: 'tool', icon: tools[i2].icon, disabled: tools[i2].disabled
        };
        addHit(tb.x, tb.y, tb.w, tb.h, tb.id);
        drawButton(tb);
      }

      /* v0.3.4 A4a：鲜花画在对局页最后一层、结算面板之前（不写 hits，不吞按钮）。
       * reduceMotion 时不画（音乐照常）；低帧率时卫星花自动 6→3。 */
      if (state.flower && !state.reduceMotion) {
        drawFlowers(ctx, state.flower.t, C.FLOWER, !!state.lowFps);
      }
    }

    function drawPolyPiece(pts, def, opts) {
      opts = opts || {};
      var scale = opts.scale === undefined ? 1 : opts.scale;
      var sx = opts.sx === undefined ? 1 : opts.sx;
      var cx = opts.cx, cy = opts.cy;
      var placed = cx !== undefined;
      var alpha = opts.alpha === undefined ? 1 : opts.alpha;

      // 局部→画布：围绕 (cx,cy) 做脉冲缩放；只有托盘需要整体 scale
      function mapX(x) { return placed ? cx + (x - cx) * scale * sx : x * scale; }
      function mapY(y) { return placed ? cy + (y - cy) * scale : y * scale; }

      function path() {
        ctx.beginPath();
        for (var i = 0; i < pts.length; i++) {
          var x = mapX(pts[i][0]), y = mapY(pts[i][1]);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
      }

      ctx.save();
      ctx.globalAlpha = alpha;
      // 投影 + 填充
      shadow(C.PIECE.shadowBlur, C.PIECE.shadowDy, COL.shadowPiece);
      path();
      ctx.fillStyle = def.color;
      ctx.fill();
      noShadow();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = alpha;
      // 顶部内高光（裁剪在板内，用一段竖向渐变模拟受光的木块上缘）
      var bb = G.bbox([pts]);
      var top = placed ? mapY(bb[1]) : bb[1] * scale;
      var bot = placed ? mapY(bb[3]) : bb[3] * scale;
      ctx.save();
      path(); ctx.clip();
      var g = ctx.createLinearGradient(0, top, 0, Math.min(bot, top + 14 * Math.max(scale, 0.5)));
      g.addColorStop(0, C.PIECE.highlight);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(
        placed ? mapX(bb[0]) : bb[0] * scale,
        top,
        (placed ? mapX(bb[2]) : bb[2] * scale) - (placed ? mapX(bb[0]) : bb[0] * scale),
        Math.max(4, bot - top)
      );
      ctx.restore();
      // 描边
      path();
      ctx.lineWidth = C.PIECE.strokeW;
      ctx.strokeStyle = def.stroke || '#000000';
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.restore();
    }

    /* v0.3.2 B1：选中板件角上的旋转手柄——半透明圆底 + ↻ 弧形箭头。
     * 视觉直径 C.GESTURE.handleVisual(68)，热区半径 handleRadius=44，与视觉同心。
     * 圆心由 handleDesign() 给出，随板件旋转/翻转一起移动。 */
    function drawRotateHandle(cx, cy) {
      var R = C.GESTURE.handleVisual / 2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,185,61,0.30)';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(224,138,0,0.92)';
      ctx.stroke();
      // ↻ 弧形箭头：画一段圆弧 + 末端切向三角
      var ar = R * 0.56;
      var a0 = -Math.PI * 0.70, a1 = Math.PI * 0.55;
      ctx.beginPath();
      ctx.arc(cx, cy, ar, a0, a1);
      ctx.lineWidth = Math.max(4, R * 0.16);
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#7A4A00';
      ctx.stroke();
      var ex = cx + ar * Math.cos(a1), ey = cy + ar * Math.sin(a1);
      var tx = -Math.sin(a1), ty = Math.cos(a1);   // 切向（增角方向）
      var nx = Math.cos(a1), ny = Math.sin(a1);   // 径向
      var ah = R * 0.30;
      ctx.beginPath();
      ctx.moveTo(ex + tx * ah, ey + ty * ah);
      ctx.lineTo(ex - tx * ah * 0.5 + nx * ah * 0.72, ey - ty * ah * 0.5 + ny * ah * 0.72);
      ctx.lineTo(ex - tx * ah * 0.5 - nx * ah * 0.72, ey - ty * ah * 0.5 - ny * ah * 0.72);
      ctx.closePath();
      ctx.fillStyle = '#7A4A00';
      ctx.fill();
      ctx.restore();
    }

    function drawBoardPiece(p) {
      var pts = piecePolyDesign(p);
      var def = DS.pieces[p.id];
      var pulse = p.pulse > 0 ? 1 + 0.06 * Math.sin(p.pulse * Math.PI) : 1;
      var grab = p.grabT > 0 ? 1 + 0.04 * p.grabT : 1;
      var sx = 1;
      if (p.flip) sx = Math.abs(Math.cos(p.flip.t * Math.PI));
      var cyc = h2d(p.y);
      var cxc = w2d(p.x);
      // 呼吸高亮环
      if (p.breathe > 0) {
        ctx.save();
        var al = 0.25 + 0.25 * Math.sin(p.breathe * Math.PI * 2);
        ctx.beginPath();
        for (var i = 0; i < pts.length; i++) { if (i === 0) ctx.moveTo(pts[i][0], pts[i][1]); else ctx.lineTo(pts[i][0], pts[i][1]); }
        ctx.closePath();
        ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(255,255,255,' + al.toFixed(2) + ')';
        ctx.stroke();
        ctx.restore();
      }
      // 吸附成功：白色外高亮环等距外扩 0→4px、宽 4→3、α 0.95→0（180ms）
      // 环下垫一层同色柔光，否则纯白环在 #FFFFFF 卡纸上完全看不见
      if (p.ring > 0) {
        var k = 1 - p.ring;
        var off = C.SNAP.ringOffset * k;
        var rw = C.SNAP.ringW + (C.SNAP.ringWEnd - C.SNAP.ringW) * k;
        var ra = C.SNAP.ringAlpha * p.ring;
        // 只画板外侧：用「大矩形 + 板路径」even-odd 裁掉板内，避免白边糊住板面
        ctx.save();
        ctx.beginPath();
        ctx.rect(cxc - 260, cyc - 260, 520, 520);
        for (var q0 = 0; q0 < pts.length; q0++) {
          if (q0 === 0) ctx.moveTo(pts[q0][0], pts[q0][1]); else ctx.lineTo(pts[q0][0], pts[q0][1]);
        }
        ctx.closePath();
        if (ctx.clip) ctx.clip('evenodd');
        // 柔光层：同色、更宽、模糊，给白环做边界
        ctx.lineJoin = 'round';
        ctx.shadowBlur = C.SNAP.ringGlowBlur;
        ctx.shadowColor = def.color;
        ctx.strokeStyle = def.color;
        ctx.globalAlpha = ra * C.SNAP.ringGlowAlpha;
        ctx.lineWidth = 2 * off + rw + 7;
        ctx.beginPath();
        for (var q1 = 0; q1 < pts.length; q1++) {
          if (q1 === 0) ctx.moveTo(pts[q1][0], pts[q1][1]); else ctx.lineTo(pts[q1][0], pts[q1][1]);
        }
        ctx.closePath(); ctx.stroke();
        // 白主环
        ctx.shadowBlur = 0;
        ctx.strokeStyle = COL.snapRing;
        ctx.globalAlpha = ra;
        ctx.lineWidth = 2 * off + rw;
        ctx.beginPath();
        for (var q2 = 0; q2 < pts.length; q2++) {
          if (q2 === 0) ctx.moveTo(pts[q2][0], pts[q2][1]); else ctx.lineTo(pts[q2][0], pts[q2][1]);
        }
        ctx.closePath(); ctx.stroke();
        ctx.restore();
      }
      // 成局收缩动画
      var winScale = 1;
      if (state.win) {
        var wt = Math.min(1, state.win.t / C.ANIM.winShrink);
        winScale = 1 - 0.02 * Math.sin(wt * Math.PI);
      }
      drawPolyPiece(pts, def, { cx: cxc, cy: cyc, scale: pulse * grab * winScale, sx: sx });
      /* v0.3.2 B2：选中高亮增强——半透明金色填充 + 5px 金边，拖动中也保持。
       * 叠加在板件之上（底色/形状仍可辨），成局动画/结算时隐藏。 */
      if (state.selId === p.id && !state.win) {
        ctx.save();
        ctx.beginPath();
        for (var s2 = 0; s2 < pts.length; s2++) { if (s2 === 0) ctx.moveTo(pts[s2][0], pts[s2][1]); else ctx.lineTo(pts[s2][0], pts[s2][1]); }
        ctx.closePath();
        ctx.fillStyle = 'rgba(255,185,61,0.15)';
        ctx.fill();
        ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,185,61,0.92)';
        ctx.stroke();
        ctx.restore();
      }
    }

    function drawTrayPiece(p) {
      var pts = trayPoly(p);
      var def = DS.pieces[p.id];
      drawPolyPiece(pts, def);
      if (state.selId === p.id && !state.win) {
        ctx.save();
        ctx.beginPath();
        for (var i = 0; i < pts.length; i++) { if (i === 0) ctx.moveTo(pts[i][0], pts[i][1]); else ctx.lineTo(pts[i][0], pts[i][1]); }
        ctx.closePath();
        ctx.fillStyle = 'rgba(255,185,61,0.15)';
        ctx.fill();
        ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,185,61,0.92)';
        ctx.stroke();
        ctx.restore();
      }
    }

    /* 白卡纸盒：底 #FFFFFF + 1px 边 + 顶部暖色渐变 + 外投影
     * 策划 6.5.1；零图片（原 panel_card.png 已取消），结算/设置/关卡格复用 */
    function cardBox(x, y, w, h, r, opts) {
      opts = opts || {};
      ctx.save();
      shadow(C.CARD.shadowBlur, C.CARD.shadowDy, C.CARD.shadow);
      rr(x, y, w, h, r);
      ctx.fillStyle = opts.fill || COL.card;
      ctx.fill();
      noShadow();
      ctx.lineWidth = C.CARD.edgeW;
      ctx.strokeStyle = opts.edge || C.CARD.edge;
      ctx.stroke();
      ctx.restore();
      // 顶部一道极淡暖色渐变，高度约卡片高度的 30%
      ctx.save();
      rr(x, y, w, h, r);
      ctx.clip();
      var gh = h * C.CARD.topGlowH;
      var g = ctx.createLinearGradient(0, y, 0, y + gh);
      g.addColorStop(0, C.CARD.topGlow);
      g.addColorStop(1, 'rgba(255,185,61,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, gh);
      ctx.restore();
    }

    /* ---------------- 浮层 ---------------- */
    function drawCard(cx, cy, w, h, r) {
      cardBox(cx - w / 2, cy - h / 2, w, h, r);
    }

    function renderResult() {
      ctx.fillStyle = COL.mask;
      ctx.fillRect(0, 0, C.DESIGN.w, C.DESIGN.h);
      var appear = Math.min(1, state.resT / C.ANIM.panelFade);
      var e = G.easeOutCubic(appear);
      ctx.save();
      ctx.globalAlpha = e;
      var cy = 760 + (1 - e) * 24;
      drawCard(C.DESIGN.w / 2, cy, 600, 700, 32);
      var lv = LEVELS[state.levelIdx];
      var last = state.levelIdx === LEVELS.length - 1;
      /* v0.3 A7：结算文案从数据集取，修掉 Phase 0 的「四巧板完成/七巧板开启」串词 */
      text(last ? (COMPLETE_TITLE || '四巧板全部完成') : '拼好了！', C.DESIGN.w / 2, cy - 250, 44, COL.text, 'center', '700');
      text(last ? (COMPLETE_SUB || '七巧板即将开启') : (lv.name || '拼得不错'), C.DESIGN.w / 2, cy - 196, 26, COL.textSub, 'center');
      // 星级
      for (var i = 0; i < 3; i++) {
        var on = state.result && i < state.result.stars;
        var shown = state.starShown > i;
        var sc = 1;
        if (shown) {
          var st = Math.min(1, (state.resT - i * C.ANIM.starStep) / 160);
          sc = 0.6 + 0.55 * G.easeOutBack(st);
          if (st >= 1) sc = 1;
        }
        drawStar(C.DESIGN.w / 2 - 110 + i * 110, cy - 110, 40, on && shown, on ? sc : 1);
      }
      // 数据
      var sec = Math.floor(state.result ? state.result.time : 0);
      var mm = Math.floor(sec / 60), ss = sec % 60;
      text('用时', C.DESIGN.w / 2 - 150, cy - 20, 26, COL.textSub, 'center');
      text((mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss, C.DESIGN.w / 2 - 150, cy + 26, 36, COL.text, 'center', '600');
      text('步数', C.DESIGN.w / 2 + 150, cy - 20, 26, COL.textSub, 'center');
      text(String(state.result ? state.result.steps : 0), C.DESIGN.w / 2 + 150, cy + 26, 36, COL.text, 'center', '600');

      var b1 = { id: last ? 'to_list' : 'next', x: C.DESIGN.w / 2, y: cy + 130, w: 380, h: 100, label: last ? '回列表' : '下一关', variant: 'primary', size: 32 };
      addHit(b1.x, b1.y, b1.w, b1.h, b1.id);
      drawButton(b1);
      var b2 = { id: 'replay', x: C.DESIGN.w / 2 - (last ? 0 : 130), y: cy + 250, w: 240, h: 84, label: '重玩', variant: 'secondary', size: 30 };
      addHit(b2.x, b2.y, b2.w, b2.h, 'replay');
      drawButton(b2);
      // 最后一关时主按钮已是「回列表」，不再重复画第二个回列表
      if (!last) {
        var b3 = { id: 'to_list', x: C.DESIGN.w / 2 + 130, y: cy + 250, w: 240, h: 84, label: '回列表', variant: 'secondary', size: 30 };
        addHit(b3.x, b3.y, b3.w, b3.h, 'to_list');
        drawButton(b3);
      }
      // 右下角预留按钮位（v0.3 放分享），本版只留空间不放按钮
      ctx.restore();
    }

    function renderSettings() {
      ctx.fillStyle = COL.mask;
      ctx.fillRect(0, 0, C.DESIGN.w, C.DESIGN.h);
      drawCard(C.DESIGN.w / 2, C.DESIGN.h / 2, 580, 620, 32);
      var cy = C.DESIGN.h / 2;
      text('设置', C.DESIGN.w / 2, cy - 230, 44, COL.text, 'center', '600');

      var rows = [
        { label: '音效', id: 'toggle_sfx', on: state.settingsFx },
        { label: '音乐', id: 'toggle_bgm', on: state.settingsBgm }
      ];
      for (var i = 0; i < rows.length; i++) {
        var y = cy - 120 + i * 110;
        text(rows[i].label, 190, y, 32, COL.text, 'left');
        // 开关
        var sw = 108, sh = 56, sx = 480;
        rr(sx, y - sh / 2, sw, sh, sh / 2);
        ctx.fillStyle = rows[i].on ? COL.progressA : COL.lineDeep;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rows[i].on ? sx + sw - sh / 2 : sx + sh / 2, y, sh / 2 - 5, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF'; ctx.fill();
        addHit(sx + sw / 2, y, sw + 40, 88, rows[i].id);
      }

      var r1 = { id: 'reset_progress', x: C.DESIGN.w / 2, y: cy + 110, w: 340, h: 84, label: '重置进度', variant: 'secondary', size: 28 };
      addHit(r1.x, r1.y, r1.w, r1.h, 'reset_progress');
      drawButton(r1);

      var r2 = { id: 'close_settings', x: C.DESIGN.w / 2, y: cy + 230, w: 300, h: 92, label: '关闭', variant: 'primary', size: 32 };
      addHit(r2.x, r2.y, r2.w, r2.h, 'close_settings');
      drawButton(r2);
    }

    /* ==================== v0.5 弹窗 ==================== */
    /* 弹窗外壳：遮罩 + 白卡 + 返回卡片中心 y */
    function sheetBg(w, h) {
      ctx.fillStyle = COL.mask;
      ctx.fillRect(0, 0, C.DESIGN.w, C.DESIGN.h);
      var cy = C.DESIGN.h / 2;
      drawCard(C.DESIGN.w / 2, cy, w, h, 32);
      return cy;
    }
    /* 胶囊标题（参考图：白底圆角小牌叠在卡片顶边） */
    function sheetTitle(txt, cy, cardH) {
      var tw = 220, th = 84, ty = cy - cardH / 2;
      ctx.save();
      shadow(10, 3, COL.shadow);
      rr(C.DESIGN.w / 2 - tw / 2, ty - th / 2, tw, th, th / 2);
      ctx.fillStyle = COL.card; ctx.fill();
      noShadow(); ctx.restore();
      text(txt, C.DESIGN.w / 2, ty, 40, COL.text, 'center', '700');
    }
    /* 圆形关闭按钮（卡片底部） */
    function sheetClose(vy, id) {
      ctx.save();
      ctx.beginPath(); ctx.arc(C.DESIGN.w / 2, vy, 40, 0, Math.PI * 2);
      ctx.fillStyle = COL.card; ctx.fill();
      ctx.restore();
      drawIcon('close', C.DESIGN.w / 2, vy, COL.textSub, 1.15);
      addHit(C.DESIGN.w / 2, vy, 100, 100, id || 'close_sheet');
    }
    /* 模拟广告进度层（挡住弹窗按钮，结束后自动发奖） */
    function adLayer() {
      if (!state.adSim) return;
      var p = Math.min(1, state.adSim.t / C.ECON.adSimMs);
      ctx.fillStyle = 'rgba(20,24,36,0.55)';
      ctx.fillRect(0, 0, C.DESIGN.w, C.DESIGN.h);
      var cy = C.DESIGN.h / 2;
      drawCard(C.DESIGN.w / 2, cy, 460, 240, 26);
      text('广告播放中…', C.DESIGN.w / 2, cy - 46, 32, COL.text, 'center', '600');
      ctx.save();
      rr(C.DESIGN.w / 2 - 170, cy + 10, 340, 20, 10);
      ctx.fillStyle = COL.track; ctx.fill();
      rr(C.DESIGN.w / 2 - 170, cy + 10, 340 * p, 20, 10);
      ctx.fillStyle = COL.gold; ctx.fill();
      ctx.restore();
      text(Math.round(p * 100) + '%', C.DESIGN.w / 2, cy + 70, 26, COL.textSub, 'center');
      hits = [];   // 广告期间吞掉所有点击
    }

    /* 复活弹窗（参考图 1） */
    function renderFail() {
      var cy = sheetBg(600, 820);
      sheetTitle('复活', cy, 820);
      var s = state.save;
      var top = cy - 820 / 2;
      // 大红心
      drawIcon('heart', C.DESIGN.w / 2, top + 175, '#FF5A5A', 3.2);
      text(s.streak > 0 ? ('已经连胜 ' + s.streak + ' 关了') : '本轮挑战结束',
        C.DESIGN.w / 2, top + 305, 32, COL.text, 'center', '600');
      text('复活可以保持连胜', C.DESIGN.w / 2, top + 355, 26, COL.textSub, 'center');

      var left = C.ECON.reviveMaxPerLevel - state.reviveUsed;
      var canAd = left > 0 && !state.adSim;
      // 广告复活（橙红大按钮；参考图的 +1 心 +90 巧币 放在按钮下方小字）
      var bAd = { id: 'ad_revive', x: C.DESIGN.w / 2, y: top + 465, w: 440, h: 108,
        label: left > 0 ? '看广告复活' : '本关复活次数已用完', variant: 'danger', size: 32, icon: 'tv' };
      if (canAd) addHit(bAd.x, bAd.y, bAd.w, bAd.h, 'ad_revive');
      drawButton(bAd);
      if (left > 0) text('+1 心  +90 巧币', C.DESIGN.w / 2, top + 545, 24, COL.textSub, 'center', '600');

      // 巧币复活
      var canCoin = left > 0 && (s.coin || 0) >= C.ECON.coinRevive && !state.adSim;
      var bCoin = { id: 'coin_revive', x: C.DESIGN.w / 2, y: top + 635, w: 380, h: 84,
        label: '花 ' + C.ECON.coinRevive + ' 巧币复活', variant: 'secondary', size: 28, disabled: !canCoin };
      if (canCoin) addHit(bCoin.x, bCoin.y, bCoin.w, bCoin.h, 'coin_revive');
      drawButton(bCoin);

      // 忍痛放弃（按钮下方）
      var gy = top + 750;
      text('忍痛放弃', C.DESIGN.w / 2, gy, 30, COL.textSub, 'center', '500');
      addHit(C.DESIGN.w / 2, gy, 240, 86, 'give_up');
      adLayer();
    }

    /* 免费体力弹窗（参考图 2） */
    function renderEnergy() {
      var cy = sheetBg(600, 660);
      sheetTitle('免费体力', cy, 660);
      var top = cy - 660 / 2;
      drawIcon('energy', C.DESIGN.w / 2, top + 190, '#3DBEF0', 3.4);
      text('+2', C.DESIGN.w / 2 + 96, top + 236, 34, COL.text, 'center', '700');

      var used = freeEnergyUsedToday(), total = C.ECON.freeEnergyPerDay;
      var leftN = Math.max(0, total - used);
      var can = leftN > 0 && !state.adSim;
      var half = 220;
      var bShare = { id: 'free_share', x: C.DESIGN.w / 2 - half / 2 - 12, y: top + 400, w: half, h: 96,
        label: '分享获得', variant: 'primary', size: 28, disabled: !can, icon: 'share' };
      var bAd = { id: 'free_ad', x: C.DESIGN.w / 2 + half / 2 + 12, y: top + 400, w: half, h: 96,
        label: '4 倍获得', variant: 'danger', size: 28, disabled: !can, icon: 'tv' };
      addHit(bShare.x, bShare.y, bShare.w, bShare.h, 'free_share');
      addHit(bAd.x, bAd.y, bAd.w, bAd.h, 'free_ad');
      drawButton(bShare); drawButton(bAd);
      text('使用次数 ' + used + '/' + total, C.DESIGN.w / 2, top + 510, 24, COL.textSub, 'center');
      sheetClose(top + 700, 'close_energy');
      adLayer();
    }

    /* 每日任务 */
    function renderTasks() {
      var cy = sheetBg(640, 700);
      sheetTitle('每日任务', cy, 700);
      var top = cy - 700 / 2;
      var arr = taskList();
      for (var i = 0; i < arr.length; i++) {
        var t = arr[i], y = top + 190 + i * 132;
        ctx.save();
        rr(60, y - 56, C.DESIGN.w - 120, 112, 20);
        ctx.fillStyle = 'rgba(74,51,39,0.05)'; ctx.fill();
        ctx.restore();
        text(t.name, 100, y - 18, 28, COL.text, 'left', '600');
        text(t.reward, 100, y + 24, 22, COL.goldDeep, 'left');
        var btn = { id: t.id === 't1' ? 'task_t1' : (t.id === 't2' ? 'task_t2' : 'task_t3'),
          x: C.DESIGN.w - 150, y: y, w: 160, h: 72,
          label: t.got ? '已领取' : (t.done ? '领取' : '未完成'),
          variant: t.done && !t.got ? 'primary' : 'secondary', size: 24,
          disabled: t.got || !t.done };
        addHit(btn.x, btn.y, btn.w, btn.h, btn.id);
        drawButton(btn);
      }
      text('每日 0 点刷新', C.DESIGN.w / 2, top + 620, 22, COL.textSub, 'center');
      sheetClose(top + 740, 'close_sheet');
      adLayer();
    }

    /* 邀请有礼 */
    function renderInvite() {
      var cy = sheetBg(620, 600);
      sheetTitle('邀请有礼', cy, 600);
      var top = cy - 600 / 2, s = state.save;
      drawIcon('invite', C.DESIGN.w / 2, top + 180, COL.goldDeep, 3);
      text('邀请好友一起拼图', C.DESIGN.w / 2, top + 300, 32, COL.text, 'center', '600');
      text('每位好友 +20 巧币（每日 1 次）', C.DESIGN.w / 2, top + 348, 24, COL.textSub, 'center');
      text('已邀请 ' + (s.inviteCount || 0) + ' 人', C.DESIGN.w / 2, top + 400, 24, COL.textSub, 'center');
      var b = { id: 'invite_share', x: C.DESIGN.w / 2, y: top + 490, w: 400, h: 100,
        label: '分享给好友', variant: 'primary', size: 30, icon: 'share' };
      addHit(b.x, b.y, b.w, b.h, 'invite_share');
      drawButton(b);
      sheetClose(top + 640, 'close_sheet');
      adLayer();
    }

    /* 添加桌面 */
    function renderDesktop() {
      var cy = sheetBg(620, 580);
      sheetTitle('添加到桌面', cy, 580);
      var top = cy - 580 / 2;
      drawIcon('desktop', C.DESIGN.w / 2, top + 170, COL.goldDeep, 2.6);
      var lines = ['① 点击右上角「···」', '② 选择「添加到桌面」', '③ 下次一键直达，不用再找'];
      for (var i = 0; i < lines.length; i++) {
        text(lines[i], C.DESIGN.w / 2, top + 300 + i * 54, 28, COL.text, 'center');
      }
      sheetClose(top + 640, 'close_sheet');
    }

    /* 皮肤 */
    function renderSkin() {
      var cy = sheetBg(660, 620);
      sheetTitle('皮肤', cy, 620);
      var top = cy - 620 / 2, cur = state.save.skin || 'warm';
      var keys = ['warm', 'mint', 'night'];
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i], sk = C.SKINS[k];
        var x = 130 + i * 175, y = top + 260;
        ctx.save();
        rr(x - 70, y - 70, 140, 140, 22);
        ctx.fillStyle = sk.bg; ctx.fill();
        ctx.lineWidth = (cur === k) ? 6 : 2;
        ctx.strokeStyle = (cur === k) ? COL.goldEdge : COL.line; ctx.stroke();
        ctx.restore();
        // 色点预览
        ctx.beginPath(); ctx.arc(x - 24, y - 18, 15, 0, Math.PI * 2); ctx.fillStyle = sk.gold; ctx.fill();
        ctx.beginPath(); ctx.arc(x + 14, y - 18, 15, 0, Math.PI * 2); ctx.fillStyle = sk.text; ctx.fill();
        if (cur === k) drawIcon('check', x, y + 34, COL.goldEdge, 1.1);
        text(sk.name, x, y + 96, 24, COL.text, 'center', '600');
        addHit(x, y, 150, 150, 'skin_' + k);
      }
      text('只换配色，不影响关卡与判定', C.DESIGN.w / 2, top + 520, 22, COL.textSub, 'center');
      sheetClose(top + 660, 'close_sheet');
    }

    /* 轻提示（所有页面最上层） */
    function renderToast() {
      if (!state.toast) return;
      var a = Math.min(1, state.toast.t / 120);
      if (state.toast.t > 1300) a = Math.max(0, 1 - (state.toast.t - 1300) / 300);
      ctx.save();
      ctx.globalAlpha = a;
      var tw = Math.min(560, 40 + state.toast.text.length * 26);
      rr(C.DESIGN.w / 2 - tw / 2, C.DESIGN.h - 300, tw, 68, 34);
      ctx.fillStyle = 'rgba(44,58,75,0.90)'; ctx.fill();
      text(state.toast.text, C.DESIGN.w / 2, C.DESIGN.h - 266, 26, '#FFFFFF', 'center', '600');
      ctx.restore();
    }

    /* ---------------- 渲染 ---------------- */
    function render() {
      var w = view.w, h = view.h, dpr = view.dpr || 1;
      // 先按设备像素铺满底色（letterbox 区域）
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = COL.bgDeep;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();

      // 注意：设计坐标到屏幕的 translate/scale 已在 frame() 里设好，
      // 这里**不能**再 translate/scale 一次（会变成 scale²，手机上版面缩成 1/4）。
      ctx.save();

      hits = [];
      if (state.page === 'home') renderHome();
      else if (state.page === 'levels') renderLevels();
      else if (state.page === 'play') renderPlay();

      // 浮层打开时清空页面热区，避免点穿到下层
      if (state.overlay) hits = [];
      if (state.overlay === 'result') renderResult();
      else if (state.overlay === 'settings') renderSettings();
      else if (state.overlay === 'fail') renderFail();
      else if (state.overlay === 'energy') renderEnergy();
      else if (state.overlay === 'tasks') renderTasks();
      else if (state.overlay === 'invite') renderInvite();
      else if (state.overlay === 'desktop') renderDesktop();
      else if (state.overlay === 'skin') renderSkin();
      /* v0.6：结算面板打开期间的持续小花流——画在面板之上，但只在卡片上/下留白带，
       * 不遮挡「下一关 / 重玩 / 回列表」与星级文字。不写 hits，不吞点击。 */
      if (state.win && state.overlay === 'result' && !state.reduceMotion) {
        drawWinStream(state.win.t, !!state.lowFps);
      }
      renderToast();

      if (state.fade < 1) {
        ctx.save();
        ctx.globalAlpha = 1 - state.fade;
        ctx.fillStyle = COL.bg;
        ctx.fillRect(0, 0, C.DESIGN.w, C.DESIGN.h);
        ctx.restore();
      }
      ctx.restore();
    }

    /* ---------------- 尺寸 ---------------- */
    function resize() {
      var s = env.size();
      var dpr = env.dpr ? env.dpr() : 1;
      view.w = s.w; view.h = s.h; view.dpr = dpr;
      view.scale = Math.min(s.w / C.DESIGN.w, s.h / C.DESIGN.h);
      view.ox = (s.w - C.DESIGN.w * view.scale) / 2;
      view.oy = (s.h - C.DESIGN.h * view.scale) / 2;
      var si = env.safeInsets ? env.safeInsets() : { top: 0, bottom: 0 };
      view.safeTop = Math.max(C.SAFE.top, (si.top || 0) / view.scale);
      view.safeBottom = Math.max(C.SAFE.bottom, (si.bottom || 0) / view.scale);
      var cv = ctx.canvas;
      if (cv) {
        cv.width = Math.round(s.w * dpr);
        cv.height = Math.round(s.h * dpr);
        if (cv.style) { cv.style.width = s.w + 'px'; cv.style.height = s.h + 'px'; }
      }
    }

    /* ---------------- 启动 ---------------- */
    var lastT = 0;
    var fpsAvg = 0;
    var rafFn = (typeof requestAnimationFrame !== 'undefined' && requestAnimationFrame) ||
      (root.requestAnimationFrame && root.requestAnimationFrame.bind(root)) ||
      function (cb) { return setTimeout(function () { cb(nowMs()); }, 16); };

    function frame(ts) {
      if (!lastT) lastT = ts;
      var dt = ts - lastT;
      // 时钟回拨 / 切后台回来 / 虚拟时间跳变时 dt 可能是负数或极大值，
      // 不夹住会让计时器与动画瞬间冲爆（负数时长会算出 "-29916534:0-3"）
      if (!(dt > 0)) dt = 0;
      if (dt > 64) dt = 64;
      lastT = ts;
      /* v0.3.4 A4a 降级：平滑帧间隔 >25ms（<40fps）→ 卫星花 6→3、关自转 */
      fpsAvg = fpsAvg ? fpsAvg * 0.9 + dt * 0.1 : dt;
      state.lowFps = fpsAvg > 25;
      update(dt);
      var dpr = view.dpr || 1;
      ctx.setTransform(dpr * view.scale, 0, 0, dpr * view.scale, dpr * view.ox, dpr * view.oy);
      render();
      rafFn(frame);
    }

    function toDesign(cssX, cssY) {
      return [(cssX - view.ox) / view.scale, (cssY - view.oy) / view.scale];
    }

    function init() {
      state.save = loadSave();
      state.settingsFx = state.save.settings.sfx !== false;
      state.settingsBgm = state.save.settings.bgm !== false;
      initSkin();                    // v0.5：载入存档里的皮肤配色（必须在首次渲染前）
      applyAudio();
      resize();
      env.bindInput(function (type, cssX, cssY) {
        var d = toDesign(cssX, cssY);
        if (type === 'down') onDown(d[0], d[1]);
        else if (type === 'move') onMove(d[0], d[1]);
        else if (type === 'up') onUp(d[0], d[1]);
        else { state.activePointer = false; state.drag = null; state.press = null; state.lastTap = null; }
      });
      if (env.onHide) env.onHide(function () { state.running = false; });
      if (env.onShow) env.onShow(function () { if (state.page === 'play' && !state.win && !state.overlay) state.running = true; lastT = 0; });
      lastT = 0;
      frame(nowMs());
    }

    return {
      init: init,
      resize: resize,
      state: state,
      _debug: { judgeNow: judgeNow, setupLevel: setupLevel, useSet: useSet,
        handleAt: handleDesign,   // v0.3.2 B1：测试用，返回手柄圆心的设计坐标
        /* v0.5：经济/体力/倒计时/皮肤的工具函数，供 verify_v05 直接驱动 */
        fireBtn: fireBtn, syncEnergy: syncEnergy, claimOnline: claimOnline,
        claimTask: claimTask, applySkin: applySkin, grantFreeEnergy: grantFreeEnergy,
        doRevive: doRevive, taskList: taskList, onlineLeft: onlineLeft,
        timeLimitOf: timeLimitOf, heartsOf: heartsOf, totalStars: totalStars,
        get LEVELS() { return LEVELS; }, get slots() { return SLOT_POS; },
        get dataset() { return DS; }, get setKey() { return state.setKey; },
        get COLORS() { return COL; },
        get saveKey() { return SAVE_KEY; }, buildSet: buildSet,
        /* v0.6：品牌 / 主页版式 / 持续小花流，供 verify_v06 直接断言 */
        get BRAND() { return C.BRAND; },
        get homeLayout() { return C.LAYOUT.HOME; },
        flowerStream: function () { return flowerStreamParticles(state.setKey, state.levelIdx); },
        drawWinStreamAt: function (t) { drawWinStream(t, false); } }
    };
  };
});
