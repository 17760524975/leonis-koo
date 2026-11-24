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
  /* v0.46：卡纸顶/高会被 resize() 按安全区改写，这里先留一份「设计基准值」，
   * 每次 resize 都从基准重算（而不是在上一帧的结果上累加），转屏/切设备都不会漂。 */
  var BASE_BOARD_Y = LAY.BOARD.y;
  var BASE_BOARD_H = LAY.BOARD.h;
  var BOARD_MAX_NUDGE = 90;                    // 卡纸最多下移 90（再多纸就矮得放不下盘面了）

  /* v0.3 Phase 0：两套数据集并存，四巧板零改动。
   * 四巧板仍走 D.dataset / D.levels（现成工具与 harness 的 fake 关卡照旧）；
   * 七巧板走 TANGRAM_SETS.tangram7。切换时只重算下面这组 var —— 后面所有引用
   * 都是闭包变量，重新赋值即自动生效，不用逐处改成查表。 */
  var SETS = D.sets || root.TANGRAM_SETS || null;
  var DEFAULT_SET = D.defaultSet || 'tangram4';
  var FALLBACK_CHAP = ['启蒙', '熟悉', '转折', '嵌套', '交错', '硬骨头'];

  /* ==================================================================== */
  /* v0.9 托盘「散放打包」
   * 旧版是 2×2 槽位网格：槽宽 = 板宽 + pad，再被 minW/minH 抬高下限，
   * 四块板就要 700×410，加整排浅底框，半个屏都是工具区。
   * 新版把板件按 1:1 随手摊在一条带子里，允许部分重叠，约束三条：
   *   ① 每块可见面积 ≥ PILE.minVisible（保证点得到）；
   *   ② 质心不被别的板压住（点质心必定命中它自己）；
   *   ③ 完整落在 band 内（不压进度条/工具栏）。
   * 做法：按面积从大到小贪心；候选质心在 12px 网格上搜，代价 =
   *   覆盖率×100 + 质心被占×60 + 抖动 + 离带中心的距离（保持成团不贴边）。
   * 纯计算、无随机数（抖动是坐标哈希），同一份数据每次结果一致 —— 这样才能截图对账。
   */
  function pilePack(order, TRAY, LOCAL, TRAY_BB, WS) {
    var PL = C.LAYOUT.PILE;
    var cell = PL.cell || 8, step = PL.step || 12;
    var pad = PL.pad || TRAY.pad || 10;
    var bx0 = LAY.BOARD.x + pad, bx1 = LAY.BOARD.x + LAY.BOARD.size - pad;
    var by0 = TRAY.top, by1 = TRAY.bottom;
    var items = order.map(function (id, i) {
      var poly = LOCAL[id].map(function (v) { return [v[0] * WS, v[1] * WS]; });
      var bb = G.bbox([poly]);
      var ce = G.centroid(poly);
      var cells = [], x, y;
      for (x = bb[0]; x < bb[2]; x += cell) {
        for (y = bb[1]; y < bb[3]; y += cell) {
          var px = x + cell / 2, py = y + cell / 2;
          if (G.pointInPoly([px, py], poly)) cells.push([px - ce[0], py - ce[1]]);
        }
      }
      return {
        id: id, slotIdx: i, poly: poly,
        cx: ce[0], cy: ce[1],
        minX: bb[0] - ce[0], maxX: bb[2] - ce[0],
        minY: bb[1] - ce[1], maxY: bb[3] - ce[1],
        w: bb[2] - bb[0], h: bb[3] - bb[1],
        area: Math.abs(G.area(poly)), cells: cells
      };
    });
    /* 大块先放：小块能钻进大块让出的空隙，整体更紧 */
    var queue = items.slice().sort(function (a, b) { return b.area - a.area; });
    /* 格子用整数键（ix*4096+iy）：字符串拼键在 7 块板的搜索里要花 200ms+，
     * 整数键能把打包从 ~300ms 压到 ~40ms（手机上开机卡顿肉眼可见）。 */
    var occ = {}, near = {}, keys = 0;      // cellKey → [占这个格子的 slotIdx...]
    function cellKey(x, y) { return Math.round(x / cell) * 4096 + Math.round(y / cell); }
    function occAt(x, y) {
      var a = occ[cellKey(x, y)];
      return !!(a && a.length);
    }
    function mark(x, y, slotIdx) {
      var k = cellKey(x, y);
      if (!occ[k]) { occ[k] = []; keys++; }
      occ[k].push(slotIdx);
      /* 八邻域记成"贴边"：只用来算一点间距代价，让相邻两块之间留一条缝，
       * 否则散放的板会连成一整块色斑，看不出有几块。 */
      var ix = Math.round(x / cell), iy = Math.round(y / cell);
      for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) near[(ix + dx) * 4096 + (iy + dy)] = 1;
    }
    var midX = (bx0 + bx1) / 2, midY = (by0 + by1) / 2;
    /* v0.34：居中收窄的候选区（spanW）。板件必须叠着挤进中心一条，
     * 不再摊满整条带子 —— 用户要的是「这块区域占得小一点」。
     * 放不下（某块比 spanW 还宽）时退回整条带子，绝不丢板。 */
    var spanW = PL.spanW || 0;
    var sx0 = spanW ? Math.max(bx0, midX - spanW / 2) : bx0;
    var sx1 = spanW ? Math.min(bx1, midX + spanW / 2) : bx1;
    /* spanH 同理：把板件簇压在带子中线上下 spanH/2 之内，带子本身仍留够手指活动区 */
    var spanH = PL.spanH || 0;
    var sy0 = spanH ? Math.max(by0, midY - spanH / 2) : by0;
    var sy1 = spanH ? Math.min(by1, midY + spanH / 2) : by1;
    for (var qi = 0; qi < queue.length; qi++) {
      var it = queue[qi], best = null;
      for (var pass = 0; pass < 2 && !best; pass++) {
        var rx0 = pass === 0 ? sx0 : bx0, rx1 = pass === 0 ? sx1 : bx1;
        var ry0 = pass === 0 ? sy0 : by0, ry1 = pass === 0 ? sy1 : by1;
        var loX = rx0 - it.minX, hiX = rx1 - it.maxX;
        var loY = ry0 - it.minY, hiY = ry1 - it.maxY;
        if (hiX < loX || hiY < loY) continue;
        for (var gx = loX; gx <= hiX + 0.01; gx += step) {
        for (var gy = loY; gy <= hiY + 0.01; gy += step) {
          var cov = 0, c;
          for (c = 0; c < it.cells.length; c++) {
            if (occAt(gx + it.cells[c][0], gy + it.cells[c][1])) cov++;
          }
          var covR = cov / Math.max(1, it.cells.length);
          var nearHit = 0;
          for (c = 0; c < it.cells.length; c++) {
            if (near[cellKey(gx + it.cells[c][0], gy + it.cells[c][1])]) nearHit++;
          }
          /* 坐标哈希抖动：±1 个 step 的"随手摊开"感，且完全可复现 */
          var h = Math.sin(gx * 12.9898 + gy * 78.233 + qi * 37.719) * 43758.5453;
          var jit = (h - Math.floor(h)) * (PL.jitter || 0);
          var cost = covR * 100
            + nearHit / Math.max(1, it.cells.length) * 34
            + (occAt(gx, gy) ? 60 : 0)
            + jit
            + Math.abs(gx - midX) * 0.012
            + Math.abs(gy - midY) * 0.010;
          if (!best || cost < best.cost) best = { x: gx, y: gy, cost: cost, cov: covR };
        }
        }
      }
      if (!best) best = { x: midX, y: midY, cost: 0, cov: 1 };   // 带子放不下时的兜底
      it.x = best.x; it.y = best.y; it.cov = best.cov;
      for (var m = 0; m < it.cells.length; m++) mark(it.x + it.cells[m][0], it.y + it.cells[m][1], it.slotIdx);
    }
    /* 回收：按 pieceOrder 还原顺序，并把可见率回填（验收脚本要读） */
    var slots = [], minVis = 1, ux0 = 1e9, ux1 = -1e9, uy0 = 1e9, uy1 = -1e9;
    for (var i2 = 0; i2 < items.length; i2++) {
      var a = items[i2];
      var hidden = 0;
      for (var n = 0; n < a.cells.length; n++) {
        var xx = a.x + a.cells[n][0], yy = a.y + a.cells[n][1];
        var k2 = cellKey(xx, yy);
        /* 绘制顺序就是 pieceOrder（slotIdx 大的盖在上面）：
         * 这个格子上若有一块 slotIdx 更大的板，本块的这一格就被压住了。 */
        var arr = occ[k2] || [];
        for (var z = 0; z < arr.length; z++) if (arr[z] > a.slotIdx) { hidden++; break; }
        if (xx < ux0) ux0 = xx; if (xx > ux1) ux1 = xx;
        if (yy < uy0) uy0 = yy; if (yy > uy1) uy1 = yy;
      }
      a.vis = 1 - hidden / Math.max(1, a.cells.length);
      if (a.vis < minVis) minVis = a.vis;
      slots[a.slotIdx] = { x: a.x, y: a.y, w: a.w, h: a.h, vis: a.vis, cover: a.cov };
    }
    return {
      slots: slots,
      fit: { w: ux1 - ux0, h: uy1 - uy0 },
      info: { minVisible: minVis, cells: keys, band: [by0, by1], pad: pad }
    };
  }

  function buildSet(key) {
    var meta = (SETS && SETS[key]) || {};
    var ds = (key === DEFAULT_SET) ? D.dataset : meta.dataset;
    var levels = (key === DEFAULT_SET) ? D.levels : meta.levels;
    var UNIT = ds.unitScale;                 // 缩放走数据集字段，不硬编码
    var LOCAL = {}, TRAY_BB = {}, id;
    for (id in ds.pieces) {
      LOCAL[id] = G.makeLocal(ds.pieces[id].base).map(function (v) { return [v[0] * UNIT, v[1] * UNIT]; });
    }
    /* 每块板的 bbox 与质心（设计像素）。1:1 摆放时把「质心」对齐槽位中心：
     * 质心一定落在板内部，玩家点槽位中心必然点到这块（旧版对齐 bbox 中心，
     * 直角三角形的 bbox 中心在斜边外侧，只能靠 44px 圆形热区兜底）。 */
    for (id in LOCAL) {
      var bb = G.bbox([LOCAL[id]]);
      var ce = G.centroid(LOCAL[id]);
      TRAY_BB[id] = {
        cx: (bb[0] + bb[2]) / 2 * WS, cy: (bb[1] + bb[3]) / 2 * WS,
        ccx: ce[0] * WS, ccy: ce[1] * WS,
        w: (bb[2] - bb[0]) * WS, h: (bb[3] - bb[1]) * WS
      };
    }
    /* 托盘：v0.9 起不再是 2×2 槽位网格，改成「散放打包」（允许部分重叠）。
     * 参数在 config.LAYOUT.PILE / TRAY，七巧板带子加高走 TRAY_OVERRIDE。 */
    var TRAY = meta.tray || C.LAYOUT.TRAY;
    var ovr = C.LAYOUT.TRAY_OVERRIDE && C.LAYOUT.TRAY_OVERRIDE[key];
    if (ovr) {
      var merged = {}, tk;
      for (tk in TRAY) merged[tk] = TRAY[tk];
      for (tk in ovr) merged[tk] = ovr[tk];
      TRAY = merged;
    }
    var PACK = pilePack(ds.pieceOrder, TRAY, LOCAL, TRAY_BB, WS);
    var SLOT_POS = PACK.slots;
    var totalW = PACK.fit.w, totalH = PACK.fit.h;
    var band = TRAY.bottom - TRAY.top;
    return {
      ds: ds, levels: levels, LOCAL: LOCAL, TRAY_BB: TRAY_BB, SLOT_POS: SLOT_POS,
      chapPer: meta.chapPer || 20, chapNames: meta.chapNames || FALLBACK_CHAP,
      chapTitles: meta.chapTitles || null,
      completeTitle: meta.completeTitle || '', completeSub: meta.completeSub || '',
      saveKey: meta.saveKey || C.SAVE_KEY, snapGrid: meta.snapGrid || null,
      fit: { totalW: totalW, totalH: totalH, band: band, pile: PACK.info }
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
      hintUsed: false,      // v0.10：本局是否用过提示（只看本局，不再从存档恢复）
      hintLv: 0,            // v0.20：本关买过几次提示（只做计数，不再有档位上限）
      hintPaid: 0,          // v0.20：本关已为提示付过费（广告/巧币）的次数
      hintTier: 2,          // 目标轮廓样式档（只读，取关卡数据 hintTier）
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
      streakGain: 0,          // v0.8 本次通关拿到的连胜奖励巧币（0=没到里程碑）
      rankTab: 0,             // v0.8 排行榜当前页签
      skinTab: 0,             // v0.27 皮肤面板分类页签（0配色 1背景 2板件 3音效）
      inviteCd: 0,            // v0.41 邀请分享冷却（ms 时间戳），防一次点击连发
      inviteFlash: null,      // v0.41 本次打开邀请面板时结算出的 {added, tiers}，供顶部提示
      /* v0.42：邀请面板改成可滑动列表（8 档一屏放不下）
       *   inviteScroll    当前滚动偏移（设计 px）
       *   inviteScrollMax 本帧算出的最大偏移（内容高 - 视口高，<=0 表示不需要滑）
       *   inviteList      本帧列表视口的屏幕矩形，供 onDown 判断「按在列表里」
       *   scrollDrag      滑动中的临时手势状态 {y0, s0, moved} */
      inviteScroll: 0, inviteScrollMax: 0, inviteList: null, scrollDrag: null,
      /* v0.39：待确认购买的皮肤项 {kind:'bgfx'|'pstyle', key, price, name}
       * 点已锁的项先进确认页（巧币不是白来的，100/150 不能一碰就扣）。 */
      buyItem: null,
      fxParts: null,          // v0.27 背景特效粒子缓存（惰性初始化，按当前 bgFx 生成）
      rankBack: null,         // v0.8 打开排行榜前的浮层（结算页 → 'result'，主页 → null）
      rankT: 0,               // v0.8 排行榜入场动画时钟
      /* v0.9 云端：登录态 / 榜单缓存 / 同步状态。没有云环境时全部保持默认，
       * 界面自动降级成「未开启云同步」，不影响本地玩。 */
      net: { on: false, ready: false, nick: '', syncing: false, ts: 0, err: '' },
      /* v0.14 玩家资料：nick/avatar 是展示用的一份，src 标明来源
       *   auto   云函数按 openid 生成的化名（巧手1234）
       *   wx     微信授权拿到的真实昵称 + 头像
       *   custom 玩家自己起的名字
       * auth 只表示「微信资料已授权」，与 src=wx 不完全等价（授权后改过名仍是 auth=true）。 */
      me: { nick: '', avatar: '', src: 'auto', auth: false, err: '', busy: false },
      rankList: null,         // null=未拉取；{list,me}=云榜结果（只放「当前页签」那一份）
      rankErr: '',
      rankLoading: false,
      /* v0.18：三个页签各自的最后一次成功结果。切回某个页签时先显缓存、
       * 再后台刷新 —— 不能像旧版那样把 rankList 清空，否则网络一抖就只剩「加载失败」。 */
      rankCache: { 0: null, 1: null },
      rankListTab: -1,        // rankList 属于哪个页签（乱序响应据此丢弃）
      rankSeq: 0,             // 请求序号（只认最后一次发出的请求）
      /* v0.18：失败（计时归零）会把当前连胜清零，但复活要能恢复 →
       * 断点前停在 state 里，不写盘；玩家强杀进程也不会把旧的连胜留下来。
       * v0.19：连胜的计数单位变成「本段内成功的一局」，所以除了数值，
       * 「这一段已经计过哪些关」也必须一起断点 —— 否则复活后重打刚失败的那关
       * 会被当成新关再计一次，一段连胜就能靠复活刷高。 */
      streakBeforeFail: 0,
      seenBeforeFail: [],     // v0.19：失败瞬间的 streakSeen 快照（复活时接回来）
      friendT: 0,             // 好友榜开放数据域是否已把画布摆好（0=未请求）
      bgmDuck: false,
      /* ---- v0.5：倒计时 / 经济 / 浮层 ---- */
      timeLimit: 0,         // 本关总时限（秒）
      timeLeft: 0,          // 剩余秒数（倒计）
      hearts: 3,            // 由 timeLeft 映射的 3/2/1 心
      reviveUsed: 0,        // 本关已复活次数
      /* v0.35：本关已看完的激励视频次数（提示 / 复活 / ×5 三类合计，上限见 ECON.adPerLevel）。
       * 换关清零；"重开"不清 —— 重开还是同一局、同一个倒计时，额度不该白送。 */
      adLv: 0,
      /* v0.21：教学关状态（null = 不在教学）。{ t } —— 指令内容每帧由 tutStep() 算 */
      tut: null,
      toast: null,          // { text, t } 轻提示
      adSim: null,          // { kind, t } 模拟广告进度（无广告位时的兜底演示）
      adWait: null,         // v0.9 正在拉激励视频：存 kind，回调里发奖
      /* v0.15：在线计时锚点（毫秒时间戳，0=停表）与落盘节流计数 */
      onlineMark: 0,
      onlineSaveT: 0
    };

    var hits = [];        // 每帧重建的可点区域
    var view = { scale: 1, ox: 0, oy: 0, w: 0, h: 0, dh: C.DESIGN.h, dpr: 1, safeTop: C.SAFE.top, safeBottom: C.SAFE.bottom };

    /* ---------------- v0.31 全局视觉设置 ----------------
     * 四巧板 / 七巧板各自一份存档（SAVE_KEY 不同），皮肤/背景/板件/音效风格
     * 原先混在这两份存档里 → 换个玩法就变回默认，等于「按游戏分别设置」。
     * 用户要求「皮肤相关设置作用于整个游戏」，所以把这一组抽成独立的一个键，
     * 与数据集无关：写的时候两边都写（兼容旧存档），读的时候以全局键为准。 */
    var VIS_KEY = 'tangram_visual_v1';
    var VIS_FIELDS = ['skin', 'bgFx', 'pieceStyle', 'sfxStyle'];
    function loadVisual() {
      var raw = null;
      try { raw = env.storage.get(VIS_KEY); } catch (e) { raw = null; }
      if (!raw) return null;
      var o = raw;
      if (typeof raw === 'string') { try { o = JSON.parse(raw); } catch (e) { return null; } }
      return (o && typeof o === 'object') ? o : null;
    }
    function saveVisual(src) {
      var s = src || (state && state.save) || {};
      var o = {};
      for (var i = 0; i < VIS_FIELDS.length; i++) o[VIS_FIELDS[i]] = s[VIS_FIELDS[i]];
      try { env.storage.set(VIS_KEY, JSON.stringify(o)); } catch (e) { /* 隐私模式静默降级 */ }
    }
    /* 把全局设置盖到一份存档上；非法值收敛回默认，避免渲染分支落空 */
    function applyVisualTo(s) {
      var v = loadVisual();
      if (!v) return false;
      if (v.skin && C.SKINS && C.SKINS[v.skin]) s.skin = v.skin;
      if (v.bgFx && C.BG_FX && C.BG_FX[v.bgFx]) s.bgFx = v.bgFx;
      if (v.pieceStyle && C.PIECE_STYLES && C.PIECE_STYLES[v.pieceStyle]) s.pieceStyle = v.pieceStyle;
      if (v.sfxStyle && C.SFX_STYLES && C.SFX_STYLES[v.sfxStyle]) s.sfxStyle = v.sfxStyle;
      return true;
    }

    /* ---------------- v0.34 全局钱包 ----------------
     * 巧币 / 体力 / 每日免费体力次数 / 查找道具是「玩家」的资源，不是「四巧板这套题」的。
     * 之前它们各自塞在两套存档里：切到七巧板就像换了个账号，余额各算各的，
     * 在一边看广告领的体力到另一边用不了。用户要求「作用于整个游戏」。
     * 做法沿用 v0.31 视觉设置那套：独立一个键，读档时覆盖、写档时同步。
     * 两份存档里仍保留同名字段（云同步 payload 不变），但本地一律以钱包为准。
     * 首次升级没有钱包键时，用当前读到的这份存档就地播种，不清零任何余额。 */
    var WALLET_KEY = 'tangram_wallet_v1';
    var WALLET_FIELDS = ['coin', 'energy', 'energyMax', 'energyTs',
      'freeEnergyUsed', 'freeEnergyDay', 'hintItems'];
    function loadWallet() {
      var raw = null;
      try { raw = env.storage.get(WALLET_KEY); } catch (e) { raw = null; }
      if (!raw) return null;
      var o = raw;
      if (typeof raw === 'string') { try { o = JSON.parse(raw); } catch (e) { return null; } }
      return (o && typeof o === 'object') ? o : null;
    }
    function writeWallet(src) {
      var s = src || (state && state.save) || {};
      var o = {}, i;
      for (i = 0; i < WALLET_FIELDS.length; i++) o[WALLET_FIELDS[i]] = s[WALLET_FIELDS[i]];
      try { env.storage.set(WALLET_KEY, JSON.stringify(o)); } catch (e) { /* 隐私模式静默降级 */ }
    }
    function applyWalletTo(s) {
      var w = loadWallet();
      if (!w) { writeWallet(s); return false; }   // 首次升级：以当前存档播种
      for (var i = 0; i < WALLET_FIELDS.length; i++) {
        var f = WALLET_FIELDS[i];
        if (w[f] !== undefined && w[f] !== null) s[f] = w[f];
      }
      return true;
    }

    /* ---------------- v0.39 皮肤解锁（巧币买断） ----------------
     * 背景 3 套 ×150、板件 6 套 ×100（价格写在 config 各条目的 price 字段）。
     * 与 v0.31 视觉设置同一套思路：解锁记录抽成全局键 tangram_shop_v1，
     * 四巧板 / 七巧板共用一份 —— 在一边买了，另一边不能再收一次钱。
     * 不含 price 的项（默认组合）永远免费，不写记录也能选。
     *
     * 老玩家升级：把「当前已选中的付费项」就地记为已购。他本来就在用这套，
     * 更新完突然被锁在门外、还要再付一遍巧币，是明显的体验倒退。
     * 不迁移任何未选中的项 —— 没买过的还是没买过。 */
    var SHOP_KEY = 'tangram_shop_v1';
    var SHOP_MAP = { bgfx: 'BG_FX', pstyle: 'PIECE_STYLES' };
    function loadShop() {
      var raw = null;
      try { raw = env.storage.get(SHOP_KEY); } catch (e) { raw = null; }
      if (!raw) return null;
      var o = raw;
      if (typeof raw === 'string') { try { o = JSON.parse(raw); } catch (e) { return null; } }
      return (o && typeof o === 'object') ? o : null;
    }
    function writeShop(o) {
      try { env.storage.set(SHOP_KEY, JSON.stringify(o || {})); } catch (e) { /* 隐私模式静默降级 */ }
    }
    function itemPrice(kind, key) {
      var m = C[SHOP_MAP[kind]];
      var it = m && m[key];
      return (it && typeof it.price === 'number') ? it.price : 0;
    }
    function ownsItem(kind, key) {
      var o = loadShop();
      var arr = o && o[kind];
      return Array.isArray(arr) && arr.indexOf(key) >= 0;
    }
    function grantItem(kind, key) {
      var o = loadShop() || {};
      if (!Array.isArray(o[kind])) o[kind] = [];
      if (o[kind].indexOf(key) < 0) o[kind].push(key);
      writeShop(o);
    }
    function itemLocked(kind, key) {
      return itemPrice(kind, key) > 0 && !ownsItem(kind, key);
    }
    /* 升级播种：只补「当前正在用的付费项」，其余一概不送 */
    function seedShop(s) {
      if (!loadShop()) writeShop({});
      if (s.bgFx && itemPrice('bgfx', s.bgFx) > 0) grantItem('bgfx', s.bgFx);
      if (s.pieceStyle && itemPrice('pstyle', s.pieceStyle) > 0) grantItem('pstyle', s.pieceStyle);
    }

    /* ---------------- v0.36 全局在线状态 ----------------
     * 在线奖励原本和钱包一样，是塞在「四巧 / 七巧各自一份存档」里的
     * （onlineDay / onlineSec / onlineGot）。切一次玩法就等于换了一套计时：
     * 另一边从 0 开始重新累计、6 档又能再领一遍，等于一天领两轮。
     * 用户要求「不区分四巧和七巧，统一只有一个在线时长统计，一天只能领取一次」。
     * 做法沿用 v0.31 视觉设置 / v0.34 全局钱包：抽成独立的一个键，
     * 读档时覆盖、写盘时同步；两套存档里的同名字段只是云同步的镜像。
     * 奖励档位不变（1/5/10/20/40/60 分钟共 6 档），每档每天各一次，
     * 但「今天」的计时与已领记录全游戏只有这一份，切玩法不能重复领。
     *
     * 首次升级没有这个键时，扫描两份老存档把「今天」的状态合并成一份：
     * 时长取较大值（不亏待玩家），已领档位取并集（防止升级后重复领）。
     * 昨天的记录一律不迁 —— 迁过来只会让今天白送一轮。 */
    var ONLINE_KEY = 'tangram_online_v1';
    function loadOnline() {
      var raw = null;
      try { raw = env.storage.get(ONLINE_KEY); } catch (e) { raw = null; }
      if (!raw) return null;
      var o = raw;
      if (typeof raw === 'string') { try { o = JSON.parse(raw); } catch (e) { return null; } }
      return (o && typeof o === 'object') ? o : null;
    }
    function writeOnline(src) {
      var s = src || (state && state.save) || {};
      var o = {
        onlineDay: s.onlineDay || '',
        onlineSec: (typeof s.onlineSec === 'number' && isFinite(s.onlineSec)) ? s.onlineSec : 0,
        onlineGot: (s.onlineGot && typeof s.onlineGot === 'object') ? s.onlineGot : {}
      };
      try { env.storage.set(ONLINE_KEY, JSON.stringify(o)); } catch (e) { /* 隐私模式静默降级 */ }
      return o;
    }
    function mergeOnlineInto(out, o) {
      if (!o || typeof o !== 'object') return;
      if (typeof o.onlineSec === 'number' && isFinite(o.onlineSec) && o.onlineSec > out.onlineSec) {
        out.onlineSec = o.onlineSec;
      }
      var g = o.onlineGot, k;
      if (g && typeof g === 'object') { for (k in g) if (g[k]) out.onlineGot[k] = true; }
    }
    function seedOnline(cur) {
      var d = todayKey(), out = { onlineDay: d, onlineSec: 0, onlineGot: {} }, i;
      var ks = saveKeys();
      for (i = 0; i < ks.length; i++) {
        var o = readSaveByKey(ks[i]);
        if (o && o.onlineDay === d) mergeOnlineInto(out, o);
      }
      /* 当前这份可能还没落盘（比如刚跨天清零），一并纳入 */
      if (cur && cur.onlineDay === d) mergeOnlineInto(out, cur);
      writeOnline(out);
      return out;
    }
    function applyOnlineTo(s) {
      var o = loadOnline();
      if (!o) o = seedOnline(s);
      s.onlineDay = (typeof o.onlineDay === 'string') ? o.onlineDay : '';
      s.onlineSec = (typeof o.onlineSec === 'number' && isFinite(o.onlineSec) && o.onlineSec >= 0)
        ? Math.min(C.ONLINE.maxSec, o.onlineSec) : 0;
      var g = (o.onlineGot && typeof o.onlineGot === 'object') ? o.onlineGot : {};
      var got = {}, k;
      for (k in g) if (g[k]) got[k] = true;   /* 克隆，别和全局对象共用引用 */
      s.onlineGot = got;
      return true;
    }

    /* ---------------- 存档 ---------------- */
    function defaultSave() {
      var E = C.ECON;
      return {
        playerId: 'local', starOf: {}, unlockedMax: 1, bestTime: {}, hintUsed: {},
        /* v0.40：每关「已发放的星级奖励累计额」（key = 关卡号）。
         * 结算时按 starReward[新星级-1] - starPaid[k] 补差 —— 没有这笔账，
         * 就无法区分「1★ 首通」和「1★ 升到 2★」，补差价会变成重复发。 */
        starPaid: {},
        settings: { sfx: true, bgm: true },
        /* v0.5 经济 / 体力 / 运营（老存档缺字段由 loadSave 逐项兜底） */
        coin: E.coinInit,
        energy: E.energyInit, energyMax: E.energyMax, energyTs: Date.now(),
        freeEnergyUsed: 0, freeEnergyDay: '',
        /* v0.15：每日在线奖励 —— 当日累计秒数 / 当天已领档位（每日 0 点清空） */
        onlineDay: '', onlineSec: 0, onlineGot: {},
        hintItems: 0,             // v0.16：查找道具（在线奖励 40/60 分钟、邀请有礼给），跨天不清
        /* v0.41 邀请有礼：累计制 + 8 档阶梯
         *   inviteCount 有效邀请人数（好友完成 ≥4 关才算，跨天不重置）
         *   invitePend  待确认的邀请时间戳（ms），到点/宿主确认后转入 inviteCount
         *   inviteGot   已发放的阶梯档位（tier.n），每档只发一次 */
        inviteCount: 0, invitePend: [], inviteGot: [],
        skin: 'warm',
        /* v0.27 视觉升级：三类独立风格，缺省为经典组合 */
        bgFx: 'geometric',        // v0.31：默认「几何轻舞」（用户指定），全局生效
        pieceStyle: 'classic',    // 板件样式（见 C.PIECE_STYLES）
        sfxStyle: 'wood',         // 音效风格（见 C.SFX_STYLES）
        bgmIdx: 0,
        streak: 0,
        /* v0.18：历史最高连胜。榜单按它排（当前连胜会因一次失手归零，
         * 拿它上榜等于「一次手滑就前功尽弃」，不是排行榜该有的口径）。 */
        bestStreak: 0,
        /* v0.19：本段连胜里「已经计过关」的关卡号（String(idx+1)）。
         * 计数单位从「首次通关的关」改成「本段内成功完成的一局」，
         * 靠这个集合在段内去重 —— 同一关一段里只计一次，重复刷不掉榜。 */
        streakSeen: [],
        /* v0.21 曾有 tutDone（已看过教学的玩法），v0.25 废弃：
         * 教学是否出现改由"第 1 关通没通关"判断，不再需要一次性标记。
         * v0.26 再改：第 1 关永远是教学形式，连"通没通关"也不看（见 makeTutorial）。 */
        /* v0.26：未通关关卡的中途快照。玩家玩一半返回，下次进来接着走 ——
         * 不重复扣体力，倒计时也从剩余时间continue，不回满。
         * 只保留最近一关（单槽）：玩家真正玩过的关才会写，进关立刻退出不覆盖。 */
        resume: null,
        /* v0.14 玩家资料缓存：断网 / 云端不可用时也能显示自己的昵称头像 */
        profile: null,
        updatedAt: Date.now()        // v0.9：云端合并按这份时间戳判新旧
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
            s.starPaid = (o.starPaid && typeof o.starPaid === 'object') ? o.starPaid : {};
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
            /* v0.15：老存档只有 onlineTs（3 分钟领一次那套），直接丢弃，
             * 从当天 0 秒开始累计 —— 不能把旧的时间戳换算成累计时长，
             * 否则老玩家一进来就能把 6 档全领了。 */
            s.onlineDay = o.onlineDay || '';
            s.onlineSec = (typeof o.onlineSec === 'number') ? o.onlineSec : 0;
            s.onlineGot = (o.onlineGot && typeof o.onlineGot === 'object') ? o.onlineGot : {};
            s.hintItems = (typeof o.hintItems === 'number') ? o.hintItems : 0;
            /* v0.26：中途快照。老存档没有 → null（等于没有续玩状态） */
            s.resume = (o.resume && typeof o.resume === 'object' && typeof o.resume.lv === 'number')
              ? o.resume : null;
            /* v0.16：每日任务已下线，老存档里的 tasksDay/tasksClaimed/taskPlays 直接丢弃 */
            /* v0.41：老存档只有 inviteDay（每日一次那套）+ inviteCount，
             * 直接沿用 inviteCount 当起始人数（老玩家邀请过的朋友不该清零），
             * inviteDay 彻底作废；待确认队列与已发档位缺省为空。 */
            s.inviteCount = (typeof o.inviteCount === 'number') ? Math.max(0, o.inviteCount) : 0;
            s.invitePend = Array.isArray(o.invitePend)
              ? o.invitePend.filter(function (t) { return typeof t === 'number'; }) : [];
            s.inviteGot = Array.isArray(o.inviteGot)
              ? o.inviteGot.filter(function (n) { return typeof n === 'number'; }) : [];
            /* v0.14：老存档没有 profile，留 null 让登录后由云端补 */
            s.profile = (o.profile && typeof o.profile === 'object') ? o.profile : null;
            s.skin = o.skin || 'warm';
            /* v0.27：老存档缺视觉风格字段 → 缺省经典组合；非法值也收敛，避免渲染分支落空 */
            s.bgFx = (C.BG_FX && C.BG_FX[o.bgFx]) ? o.bgFx : 'geometric';
            s.pieceStyle = (C.PIECE_STYLES && C.PIECE_STYLES[o.pieceStyle]) ? o.pieceStyle : 'classic';
            s.sfxStyle = (C.SFX_STYLES && C.SFX_STYLES[o.sfxStyle]) ? o.sfxStyle : 'wood';
            s.bgmIdx = (typeof o.bgmIdx === 'number') ? o.bgmIdx : 0;
            s.streak = (typeof o.streak === 'number') ? o.streak : 0;
            /* v0.18：老存档没有 bestStreak —— 用当前连胜兜底（宁可少不能凭空多），
             * 之后只在真正刷新纪录时才往上写。 */
            s.bestStreak = (typeof o.bestStreak === 'number')
              ? o.bestStreak : Math.max(0, s.streak);
            /* v0.19：老存档没有 streakSeen —— 一律迁成空数组。
             * 严禁用 starOf 反推「已计过的关」：升级后第一段连胜会被整段判成
             * 「全都计过了」而永不增长，玩家会以为连胜榜又坏了。 */
            s.streakSeen = Array.isArray(o.streakSeen)
              ? o.streakSeen.map(String) : [];
            /* v0.21：已看过的教学数据集（tangram4 / tangram7）。
             * v0.25 起废弃：是否再教改由"这一关通没通关"决定（见 makeTutorial），
             * 老存档里的这个字段直接忽略，不再迁移 —— 它本来就是个一次性开关，
             * 迁过来只会让老玩家继续看不到教学。 */
          }
        } catch (e) { /* 存档损坏 → 用默认值，静默降级 */ }
      }
      /* v0.8：四巧板 120 关 → 30 关。老存档的解锁进度与星星按新关卡数收敛，
       * 否则会停在「已解锁 87 关」这种越界状态，关卡列表算出空章节。 */
      var maxLv = LEVELS.length;
      if (s.unlockedMax > maxLv) s.unlockedMax = maxLv;
      if (s.unlockedMax < 1) s.unlockedMax = 1;
      /* v0.40：老存档补一笔「已发奖励」账。
       * 旧口径（v0.23~v0.39）是首通一次性给 1★2 / 2★3 / 3★5，存档只记星级、不记金额。
       * v0.43 起新总额又回到 2/3/5，两边数值一致，所以：
       *   · 记旧值 → 老玩家的账正好对上，现有星级不会被重复发币，也不会被少给；
       *   · 记 0 → 每关都重发一遍，一进游戏凭空多几十巧币。
       * v0.41/v0.42 存档里的 21/22/24 是错误口径留下的脏账，下面统一夹到新总额，
       * 免得 starPaid 长期大于 targetTotal（虽然不发放，但账目对不上）。 */
      var OLD_STAR_COIN = [2, 3, 5];
      var NEW_TOTALS = C.ECON.starReward;
      for (var k in s.starOf) {
        if (!(Number(k) >= 1 && Number(k) <= maxLv)) {
          delete s.starOf[k];
          delete s.starPaid[k];
          continue;
        }
        var pst = s.starOf[k] || 0;
        if (typeof s.starPaid[k] !== 'number') {
          s.starPaid[k] = pst > 0 ? (OLD_STAR_COIN[pst - 1] || 0) : 0;
        }
        var cap0 = pst > 0 ? (NEW_TOTALS[pst - 1] || 0) : 0;
        if (s.starPaid[k] > cap0) s.starPaid[k] = cap0;
      }
      /* v0.19：streakSeen 里的关卡号同样要收敛（数据集关卡数可能变少），
       * 顺便去重并丢掉非数字项，避免脏存档把「段内已计」判错。 */
      var seen = [], seenMap = {};
      for (var si = 0; si < s.streakSeen.length; si++) {
        var sk2 = String(s.streakSeen[si]);
        if (!(Number(sk2) >= 1 && Number(sk2) <= maxLv)) continue;
        if (seenMap[sk2]) continue;
        seenMap[sk2] = 1;
        seen.push(sk2);
      }
      s.streakSeen = seen;
      /* v0.31：全局视觉设置优先于「这套存档自己的」设置 —— 四巧板 / 七巧板共用一份。
       * 没有全局键（首次升级）时保持本档的配色/板件/音效，但背景统一落到「几何轻舞」，
       * 这就是用户说的「进游戏默认几何轻舞」。 */
      if (!applyVisualTo(s)) s.bgFx = 'geometric';
      /* v0.34：巧币 / 体力一律以全局钱包为准 —— 切数据集不再换余额 */
      applyWalletTo(s);
      /* v0.36：在线时长 / 已领记录一律以全局键为准 —— 切数据集不再重开一轮 */
      applyOnlineTo(s);
      /* v0.39：付费皮肤解锁记录（全局键）。老存档里正在用的付费项自动视为已购 */
      seedShop(s);
      return s;
    }
    /* keepTs=true：只落盘、不刷新 updatedAt。
     * 在线计时的 15 秒定时写盘必须走这个分支 —— 否则玩家挂在主页没玩，
     * updatedAt 一直在涨，云端合并会误判「本机最新」，把另一台设备刚打的进度顶掉。 */
    function writeLocal(keepTs) {
      if (!keepTs) state.save.updatedAt = Date.now();
      try { env.storage.set(SAVE_KEY, JSON.stringify(state.save)); } catch (e) { /* 隐私模式静默降级 */ }
      /* v0.34：钱包跟着每次落盘同步，两套存档里的同名字段只是云同步的镜像 */
      writeWallet(state.save);
      /* v0.36：在线状态同理 —— 15 秒一次的计时落盘、领取、切后台都走这里 */
      writeOnline(state.save);
    }
    function persist() {
      writeLocal();
      cloudPush(false);
    }

    /* ==================== v0.9 云开发：登录 / 存档 / 排行榜 ====================
     * 平台差异（wx.cloud、云函数名、错误码）全在 env.cloud 里，core 只认这四个方法：
     *   enabled()            有没有可用的云能力
     *   init(cb)             登录（wx.cloud.init + 云函数取 openid）
     *   load(cb)             拉云端存档 → cb(err, {sets:{saveKey:save}})
     *   save(payload, cb)    上行存档 + 顺便拿回我的名次
     *   rank(tab, cb)        拉榜单 → cb(err, {list:[{nick,v,me}], me:{nick,v,rank}})
     * 没有 env.cloud（Node 测试 / 浏览器预览）时这些分支全部不执行，行为与 v0.8 一致。 */
    var CLOUD = env.cloud || null;

    function cloudOn() { return !!(CLOUD && CLOUD.enabled && CLOUD.enabled()); }

    /* ==================== v0.14 玩家资料：微信昵称 / 头像 ====================
     * 平台差异（wx.createUserInfoButton / 隐私弹窗 / 键盘输入）全在 env.profile 里，
     * core 只认这几个方法：
     *   enabled()              这台设备有没有资料能力
     *   canAuth()              能不能走「微信授权」（小游戏里 = 有 createUserInfoButton）
     *   restore(local)         把本地缓存放进来（启动时最先做，头像不会闪一下）
     *   request(cb)            走授权流程 → cb(err, { nick, avatar, src, auth })
     *   rename(nick, cb)       改昵称（小游戏用 wx.showKeyboard，没有输入框组件）
     *   place(rect) / hide()   原生授权按钮的显隐与定位（只认 CSS px，不认画布变换）
     *   imageOf(url)           头像 Image 缓存（拿不到就返回 null，退回「首字头像」）
     *   onChange(fn)           资料变化通知（例如已授权用户静默刷新了头像）
     *
     * 为什么不是「一进游戏就自动拿昵称头像」：
     * 微信 2022-10-25 起把小游戏的静默读取收口了，只有两种情况能拿到真实资料——
     *   ① 玩家此前已在 wx.createUserInfoButton 上点过「允许」；
     *   ② 玩家这次点了授权按钮。
     * 所以默认身份是云函数生成的化名「巧手1234」，玩家愿意才换成微信昵称头像。 */
    var PROFILE = env.profile || null;

    function profileOn() { return !!(PROFILE && (!PROFILE.enabled || PROFILE.enabled())); }
    function profileCanAuth() { return !!(PROFILE && PROFILE.canAuth && PROFILE.canAuth()); }

    /* 展示用昵称：玩家资料 > 云端化名 > 占位 */
    function meNick() {
      return state.me.nick || state.net.nick || (C.PLAYER.defaultName + '玩家');
    }
    function meAvatarUrl() { return state.me.avatar || ''; }

    /* 写入一份到本地存档 + 上行云端。
     *   push  玩家主动动作（授权 / 改名）→ 落本地 + 上行
     *  'local' 云端刚给的值 → 只落本地，不必再上行一次
     *   false  启动时从本地缓存恢复 → 什么都不写（写了会把 updatedAt 刷新，
     *          让 mergeSave 误判「本地比云端新」，新设备首次登录就会用默认币值盖掉云端） */
    function applyProfile(p, push) {
      if (!p) return false;
      var changed = false;
      if (p.nick && p.nick !== state.me.nick) { state.me.nick = p.nick; changed = true; }
      if (p.avatar !== undefined && (p.avatar || '') !== state.me.avatar) {
        state.me.avatar = p.avatar || ''; changed = true;
      }
      if (p.src && p.src !== state.me.src) { state.me.src = p.src; changed = true; }
      if (p.auth !== undefined && !!p.auth !== !!state.me.auth) { state.me.auth = !!p.auth; changed = true; }
      state.net.nick = meNick();
      if (!changed) return false;                       // 值没变就别写盘，免得每帧刷 storage
      state.save.profile = { nick: meNick(), avatar: meAvatarUrl(), src: state.me.src, auth: !!state.me.auth };
      if (push === false) return true;                  // 纯内存
      if (push === 'local') writeLocal();
      else { persist(); cloudPush(true); }              // 玩家改完名立刻上行，不等 3.5s 节流
      return true;
    }

    /* 设置页那行小字：把「现在是什么身份」说清楚，别让玩家猜 */
    function profileStateText() {
      if (!profileOn()) return '当前环境读不到微信资料';
      if (state.me.busy) return '正在读取微信资料…';
      if (state.me.err) return state.me.err;
      if (state.me.auth) return '微信昵称头像已授权';
      if (state.me.src === 'custom') return '自定义昵称 · 未授权微信资料';
      if (profileCanAuth()) return '未授权 · 点下方按钮使用微信资料';
      return '系统化名，可以自己改一个';
    }

    /* 设计坐标 → CSS px（原生按钮只认屏幕像素） */
    function cssRect(cx, cy, w, h) {
      return {
        left: view.ox + (cx - w / 2) * view.scale,
        top: view.oy + (cy - h / 2) * view.scale,
        width: w * view.scale,
        height: h * view.scale
      };
    }
    /* 只有「设置页开着 + 还没授权 + 平台支持授权」时才需要这个原生按钮 */
    function syncProfileButton() {
      if (!PROFILE || !PROFILE.place) return;
      var need = state.overlay === 'settings' && profileCanAuth() && !state.me.auth;
      if (!need) { hideProfileButton(); return; }
      var P = C.PLAYER;
      var r = cssRect(C.DESIGN.w / 2, DH() / 2 + P.authBtn.dy, P.authBtn.w, P.authBtn.h);
      r.label = P.authLabel;
      r.fontSize = Math.round(28 * view.scale);
      try { PROFILE.place(r); } catch (e) { /* 老基础库没有这个 API，退回纯画布按钮 */ }
    }
    function hideProfileButton() {
      if (PROFILE && PROFILE.hide) { try { PROFILE.hide(); } catch (e) {} }
    }

    /* 点「使用微信昵称头像」 */
    function requestProfile() {
      if (!profileOn()) { toast('当前环境读不到微信资料'); return; }
      if (state.me.busy) return;
      state.me.busy = true;
      state.me.err = '';
      PROFILE.request(function (err, p) {
        state.me.busy = false;
        if (err) {
          state.me.err = (err && err.msg) || '读取失败';
          toast(state.me.err);
          syncProfileButton();
          return;
        }
        applyProfile(p);
        toast(p && p.auth ? '已使用微信昵称头像' : '昵称已更新');
        syncProfileButton();
      });
    }
    /* 点「改昵称」：小游戏没有输入框组件，走 wx.showKeyboard */
    function renameProfile() {
      if (!PROFILE || !PROFILE.rename) { toast('当前环境不支持改昵称'); return; }
      PROFILE.rename(meNick(), function (err, nick) {
        if (err || !nick) return;
        var n = String(nick).replace(/[\r\n\t]/g, ' ').trim().slice(0, C.PLAYER.nickMax);
        if (!n || n === state.me.nick) return;
        applyProfile({ nick: n, avatar: state.me.avatar, src: 'custom', auth: !!state.me.auth });
        toast('昵称已改为「' + n + '」');
        syncProfileButton();
      });
    }

    /* 头像圆：有图贴图，没图退回「首字 + 底色」（榜单与设置页共用） */
    function drawAvatar(cx, cy, r, nick, url, color) {
      var img = (url && PROFILE && PROFILE.imageOf) ? PROFILE.imageOf(url) : null;
      if (img) {
        ctx.save();
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
        try { ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2); ctx.restore(); return; }
        catch (e) { ctx.restore(); }             // 图坏了就当没有，别让整帧挂掉
      }
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = color || COL.gold; ctx.fill();
      text((nick || '?').slice(0, 1), cx, cy + 1, Math.round(r * 1.02), '#FFFFFF', 'center', '700');
    }

    function saveKeys() {
      var ks = [C.SAVE_KEY];
      if (SETS && SETS.tangram7 && SETS.tangram7.saveKey && SETS.tangram7.saveKey !== C.SAVE_KEY) {
        ks.push(SETS.tangram7.saveKey);
      }
      return ks;
    }
    function readSaveByKey(k) {
      try {
        var raw = env.storage.get(k);
        if (!raw) return null;
        var o = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return (o && typeof o === 'object') ? o : null;
      } catch (e) { return null; }
    }
    function writeSaveByKey(k, o) {
      try { env.storage.set(k, JSON.stringify(o)); } catch (e) {}
    }
    function starsOfSave(o) {
      var n = 0;
      for (var k in (o.starOf || {})) n += o.starOf[k] || 0;
      return n;
    }

    /* 合并两份存档：进度类取 max（换设备不丢星），会消耗的货币/体力取较新那份 */
    function mergeSave(a, b) {
      if (!a) return b;
      if (!b) return a;
      var newer = ((b.updatedAt || 0) > (a.updatedAt || 0)) ? b : a;
      var out = {}, k;
      for (k in a) out[k] = a[k];
      for (k in b) out[k] = b[k];
      out.coin = newer.coin;
      out.energy = newer.energy;
      out.energyTs = newer.energyTs;
      out.settings = newer.settings || out.settings;
      out.skin = newer.skin || out.skin;
      out.starOf = {};
      var lv;
      for (lv in (a.starOf || {})) out.starOf[lv] = a.starOf[lv] || 0;
      for (lv in (b.starOf || {})) out.starOf[lv] = Math.max(out.starOf[lv] || 0, b.starOf[lv] || 0);
      /* v0.40：已发奖励额也要合并，且只能取 max。
       * 两设备各升一次星时若取新的那份，会把另一台已发的账抹掉 → 再升一次又发一遍。
       * 取 max 等于「记录哪台发得更多」，差价只会算少不会算重。 */
      out.starPaid = {};
      for (lv in (a.starPaid || {})) out.starPaid[lv] = a.starPaid[lv] || 0;
      for (lv in (b.starPaid || {})) out.starPaid[lv] = Math.max(out.starPaid[lv] || 0, b.starPaid[lv] || 0);
      out.unlockedMax = Math.max(a.unlockedMax || 1, b.unlockedMax || 1);
      /* v0.18：当前连胜跟「较新的那份」走。旧版取 Math.max 会出大问题：
       * 这一局输了把 streak 清零并上行，下次启动合并云端旧值时又被 max 复活，
       * 玩家会觉得「输了也没断」——连胜榜数字就是这么假的。
       * 历史最高才是单调量，取两者的最大值。 */
      out.streak = (newer.streak || 0);
      /* v0.19：streakSeen 必须与 streak 同步跟「较新的那份」走。
       * 若按 starOf 那套 union 合并，两段连胜的集合会串在一起 ——
       * 合并出来的 streak 与集合对不上，玩家重打已经断开过的关时会被误判成「本段计过」。 */
      out.streakSeen = (newer.streakSeen || []).slice();
      out.bestStreak = Math.max(a.bestStreak || 0, b.bestStreak || 0);
      /* v0.36：在线状态是「这台设备今天待了多久」，不能拿云端那份覆盖本机，
       * 否则换设备一登录就凭空多出几小时、白领一轮奖励。这里先按本地兜底，
       * 末尾再由 applyOnlineTo(out) 用全局键统一覆盖 —— 四巧 / 七巧两份镜像
       * 与云端旧值都不会把「今天已领」冲掉。 */
      out.onlineDay = a.onlineDay || '';
      out.onlineSec = a.onlineSec || 0;
      out.onlineGot = a.onlineGot || {};
      /* v0.16：查找道具是消耗品：谁改得晚听谁的（updatedAt 已经判过新旧） */
      out.hintItems = (newer.hintItems || 0);
      /* v0.26：续玩快照跟「较新的那份」走 —— 它记录的是这段设备上的当前局面，
       * 取 max 或 union 都没有意义（两份快照拼不到一起）。 */
      out.resume = newer.resume || null;
      out.updatedAt = Math.max(a.updatedAt || 0, b.updatedAt || 0);
      /* v0.31：视觉设置是全局的，合并后仍然以全局键为准 —— 否则换设备登录后
       * 会拿云端那份旧配色把本机刚选的皮肤盖掉。 */
      applyVisualTo(out);
      /* v0.36：合并结果里的在线字段一律以全局键为准（本机权威、跨玩法共用） */
      applyOnlineTo(out);
      return out;
    }

    function collectCloud() {
      writeLocal();
      var sets = {}, ks = saveKeys(), i, gOn = loadOnline();
      for (i = 0; i < ks.length; i++) {
        var o = readSaveByKey(ks[i]);
        if (!o) continue;
        /* v0.36：在线状态全局唯一。上行前把每份存档里的镜像对齐到全局键，
         * 否则云端会同时存着「四巧 700 秒 / 七巧 0 秒」两份分叉统计。 */
        if (gOn) {
          o.onlineDay = gOn.onlineDay || '';
          o.onlineSec = gOn.onlineSec || 0;
          o.onlineGot = gOn.onlineGot || {};
        }
        sets[ks[i]] = o;
      }
      var stars = 0, cleared = 0, best = state.save.bestStreak || 0, sk, lv;
      for (sk in sets) {
        for (lv in (sets[sk].starOf || {})) {
          var v = sets[sk].starOf[lv] || 0;
          if (v > 0) { cleared++; stars += v; }
        }
        /* v0.18：连胜榜按「两个数据集里最高的历史连胜」排。
         * 旧版直接发当前数据集的 streak，切到七巧板就换了个数，
         * 同一个人在不同时刻上榜值不同 —— 这就是「统计不对」的来源之一。 */
        if ((sets[sk].bestStreak || 0) > best) best = sets[sk].bestStreak || 0;
      }
      return {
        sets: sets,
        stats: { stars: stars, cleared: cleared, streak: best },
        /* v0.14：昵称头像跟着存档一起上行，players 集合里存的就是排行榜展示的那一份 */
        profile: { nick: meNick(), avatar: meAvatarUrl(), src: state.me.src, auth: !!state.me.auth }
      };
    }

    /* v0.18 好友榜：把成绩写进「微信托管数据」（与云开发是两套东西）。
     * 开放数据域只能读 wx.getFriendCloudStorage，读不到 players 集合。 */
    function friendStats() {
      var ks = saveKeys(), i, cleared = 0, best = state.save.bestStreak || 0;
      for (i = 0; i < ks.length; i++) {
        var o = readSaveByKey(ks[i]);
        if (!o) continue;
        for (var lv in (o.starOf || {})) if ((o.starOf[lv] || 0) > 0) cleared++;
        if ((o.bestStreak || 0) > best) best = o.bestStreak || 0;
      }
      return { cleared: cleared, streak: best, stars: starsOfSave(state.save) };
    }
    function publishFriend() {
      if (!env.friend || !env.friend.publish) return;
      try { env.friend.publish(friendStats()); } catch (e) { /* 静默：不影响游戏 */ }
    }

    var pushTimer = null, pushing = false, pushAgain = false;
    function cloudPush(immediate) {
      if (!cloudOn() || !state.net.ready) return;
      if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; }
      if (immediate) { doCloudPush(); return; }
      pushTimer = setTimeout(doCloudPush, C.CLOUD.pushDebounceMs || 3500);
    }
    function doCloudPush() {
      if (!cloudOn() || !state.net.ready) return;
      /* v0.19：上行即时化以后，「通关 → 马上失败」这种连着的两次即时上行
       * 会撞上上一次还在途。旧写法直接 return 把它吞掉（防抖定时器又已经被清掉），
       * 这一次的变化就永远发不出去 —— 榜上看不到刚变化的值。改成记一笔、回调里补发。 */
      if (pushing) { pushAgain = true; return; }
      pushing = true;
      state.net.syncing = true;
      CLOUD.save(collectCloud(), function (err, res) {
        pushing = false;
        state.net.syncing = false;
        /* 在途期间又被要求即时上行 → 用它补一次（此时 pushing 已复位，不会递归） */
        if (pushAgain) { pushAgain = false; cloudPush(true); }
        if (err) { state.net.err = String((err && err.msg) || err); return; }
        state.net.err = '';
        state.net.ts = Date.now();
        if (res && res.me) state.rankMe = res.me;
      });
    }
    function cloudPull() {
      if (!cloudOn()) return;
      CLOUD.load(function (err, remote) {
        state.net.ready = true;
        if (err || !remote || !remote.sets) return;
        var changed = false, k, bestMerged = null, bestTs = -1;
        for (k in remote.sets) {
          var l = readSaveByKey(k), m = mergeSave(l, remote.sets[k]);
          if (!l || (m.updatedAt || 0) > (l.updatedAt || 0) ||
            (m.unlockedMax || 0) > (l.unlockedMax || 0) ||
            starsOfSave(m) > starsOfSave(l)) {
            writeSaveByKey(k, m);
            changed = true;
          }
          /* v0.34：钱包是全局权威源。云端那份较新时，把合并后的余额一并推进钱包，
           * 否则 loadSave() 会拿本地旧钱包把刚从云端合并来的 999 巧币盖成 50。
           * 两套存档都合并时取 updatedAt 最大的那份，避免第二份旧值把钱包拉回去。 */
          if ((m.updatedAt || 0) > bestTs) { bestTs = m.updatedAt || 0; bestMerged = m; }
        }
        if (bestMerged) writeWallet(bestMerged);
        if (changed) {
          state.save = loadSave();          // 当前数据集重新读盘（星星/进度立刻生效）
          initSkin();
          applyAudio();
        }
        /* 合并结果回写一次云端：首次登录时把本地存档"认领"到账号下，
         * 之后两端不一致也会在这一步收敛（幂等，一次调用）。 */
        publishFriend();     // v0.18：好友榜的数据源是微信托管数据，合并完再写一次
        cloudPush(true);
      });
    }
    /* v0.18：拉某个页签的榜。
     * 旧版两个毛病（用户实测「切好友榜再切回主线榜，直接加载失败」就是它俩）：
     *   ① 好友榜也走 state.rankList，把主线榜那份数据覆盖成空列表；
     *   ② 只有 state.rankErr 一个错误位，且失败时把 rankList 置 null ——
     *      切回去的瞬间没有数据可画，只能显示「加载失败」。
     * 现在：按页签各自缓存 + 请求序号丢弃迟到回调，失败时绝不清掉已有缓存。 */
    function cloudRank(tab) {
      if (!cloudOn()) { state.rankLoading = false; return; }
      var seq = ++state.rankSeq;
      state.rankLoading = true;
      if (state.rankTab === tab) state.rankErr = '';
      CLOUD.rank(tab, function (err, res) {
        if (seq !== state.rankSeq) {
          /* 用户已经切走：结果只补缓存（且只补空白页签，不覆盖更新的那份），
           * 下次切回这个页签就能直接看到，不用再等一次网络。 */
          if (!err && res && !state.rankCache[tab]) state.rankCache[tab] = res;
          return;
        }
        state.rankLoading = false;
        if (err) {
          /* 有缓存就继续用缓存渲染，只在「一份旧数据都没有」时才让玩家看到失败 */
          if (state.rankTab === tab) {
            state.rankErr = (err && err.msg) || '网络异常';
            if (!state.rankCache[tab]) { state.rankList = null; state.rankListTab = tab; }
          }
          return;
        }
        var data = res || { list: [], me: null };
        state.rankCache[tab] = data;
        if (state.rankTab === tab) { state.rankList = data; state.rankListTab = tab; }
      });
    }

    /* 切页签：先把缓存摆上去，再后台刷新。好友榜不走云开发。 */
    function selectRankTab(tab) {
      state.rankTab = tab;
      state.rankErr = '';
      state.rankLoading = false;
      if (tab === 2) { openFriendRank(); return; }
      state.rankList = state.rankCache[tab] || null;
      state.rankListTab = tab;
      cloudRank(tab);
    }

    /* v0.18 好友榜：开放数据域整块画好，主域只负责把 sharedCanvas 贴进卡片。
     * 平台差异（getOpenDataContext / 尺寸）在 env.friend 里，core 不碰 wx.*。 */
    function friendOn() {
      return !!(env.friend && env.friend.available && env.friend.available());
    }
    function openFriendRank() {
      if (!friendOn()) return;
      var L = C.RANK.list;
      /* 离屏画布按「设计 px × 主画布缩放 × 设备像素比」开，贴回来 1:1 不糊 */
      var k = (view.scale || 1) * (view.dpr || 1);
      if (!(k > 0)) k = 2;
      k = Math.max(1, Math.min(3, k));
      state.friendT = Date.now();
      var fs = friendStats();
      try {
        env.friend.show({
          w: L.w, h: L.h, k: k,
          /* v0.47：把当前皮肤的一小组配色一起送进开放数据域。
           * 那边是独立 JS 环境，读不到 config，配色只能抄一份写死；
           * 深色皮肤下不传的话，好友榜会在深色卡片里贴一张浅色列表。 */
          pal: {
            text: COL.text, sub: COL.textSub, rowBg: COL.surface,
            me: COL.surfaceHi, meText: COL.accentText,
            gold: COL.gold, line: COL.line
          },
          me: { nick: meNick(), avatar: meAvatarUrl(), cleared: fs.cleared, streak: fs.streak }
        });
      } catch (e) { /* 开放数据域不可用 → 界面走降级文案 */ }
    }

    /* 云同步状态一句话（设置页显示） */
    function netText() {
      /* 已登录优先：云端临时抖动时不要显示成"未开启"，那会让玩家以为存档丢了 */
      if (state.net.ready && (state.net.nick || state.me.nick)) {
        return state.net.syncing ? '同步中…' : ('已同步 · ' + meNick());
      }
      if (!cloudOn()) return '未开启（纯本地）';
      if (state.net.err) return '同步失败：' + state.net.err;
      return state.net.ready ? '已登录' : '正在登录…';
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
    /* overflow=true：允许超过上限（看视频 / 在线奖励这类"白给的"）。
     * v0.31：看视频一次 +20，而上限只有 16 —— 若照旧封顶，4 点会被吞掉，
     * 玩家只会看到"我看了 30 秒广告，体力只涨到 16"。与在线奖励同一口径。 */
    function addEnergy(n, why, overflow) {
      var s = state.save; if (!s) return;
      var was = s.energy || 0;
      s.energy = overflow ? (was + n) : Math.min(s.energyMax, was + n);
      if (was >= s.energyMax) s.energyTs = Date.now();
      persist();
      var got = s.energy - was;
      if (why) toast(got > 0 ? (why + ' +' + got + ' 体力') : '体力已满');
    }
    /* 进关扣 energyCostLevel 点体力（v0.7 起为 2）；不足返回 false（由调用方弹「体力不足」） */
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

    /* 每关时限：v0.31 起全关统一 fixedSec（2 分钟，用户要求）。
     * 旧口径「parTime×parFactor 夹在 [90,240]」退化为 fixedSec=0 时的兜底；
     * parTime 现在只用于星级判定，不再决定时限。 */
    function timeLimitOf(lv) {
      var T = C.TIMER;
      if (T.fixedSec > 0) return T.fixedSec;
      if (lv && typeof lv.timeLimit === 'number' && lv.timeLimit > 0) {
        return clampN(lv.timeLimit, T.minSec, T.maxSec);
      }
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
      addEnergy(n, byAd ? '看广告' : '分享获得', !!byAd);
      return true;
    }

    /* ==================== v0.15 每日在线奖励 ====================
     * 旧版（v0.5）：每 3 分钟点一次 +10 巧币，没有页面、没有上限、也没有「今天待了多久」的概念。
     * 新版：按今日累计在线时长解锁 6 档，点主页入口进页面领，每日 0 点清零。
     *
     * 计时口径：
     *   只算前台。state.onlineMark 记「上一次结算的时刻」，update 每帧把差值累进 onlineSec；
     *   切后台时 flush 一次并把 mark 置 0（停表），回前台再置为当前时刻。
     *   这样即使杀掉进程，最多只丢 15 秒（persistSec 落盘间隔）。
     *
     * 落盘：onlineSec 用 writeLocal（只写本地、不走云端上行），每 15 秒一次；
     *       领取 / 切后台 / 关面板才 persist()。避免每帧刷 storage，也避免云端被刷。
     *
     * 日界：与每日任务同一个 todayKey()（本地时区），进入页面/领取/每帧都会先 onlineRoll()，
     *       0 点整在游戏里也会自动清零，不需要重启。 */

    /* 跨天就把今天的时长与已领记录清空；返回是否发生了清零 */
    function onlineRoll() {
      var s = state.save; if (!s) return false;
      var d = todayKey();
      if (s.onlineDay === d) return false;
      s.onlineDay = d;
      s.onlineSec = 0;
      s.onlineGot = {};
      return true;
    }

    /* 把「上次结算到现在」的时间累进 today 的 onlineSec。可在任何地方安全重复调用 */
    function onlineSync() {
      var s = state.save; if (!s) return false;
      var rolled = onlineRoll();
      if (!state.onlineMark) return rolled;
      var now = Date.now();
      var el = (now - state.onlineMark) / 1000;
      state.onlineMark = now;
      /* 单次最多记 5 分钟：时钟被手动改过 / 主线程长卡顿 / 从挂起里"诈尸"时，
       * 不加这个上限会一次性灌进几小时，玩家一进来就能领满 6 档 */
      if (el > 300) el = 300;
      if (el > 0) s.onlineSec = Math.min(C.ONLINE.maxSec, (s.onlineSec || 0) + el);
      return rolled;
    }

    /* 当前今日累计秒数（读之前先结算，保证界面数字与判定一致） */
    function onlineSecNow() {
      onlineSync();
      return Math.max(0, Math.floor(state.save.onlineSec || 0));
    }

    function onlineClock(sec) {
      sec = Math.max(0, Math.floor(sec));
      var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), ss = sec % 60;
      function p2(n) { return (n < 10 ? '0' : '') + n; }
      return h > 0 ? (h + ':' + p2(m) + ':' + p2(ss)) : (p2(m) + ':' + p2(ss));
    }

    /* 六档的实时状态：got=已领、ready=到点可领、left=还差多少秒 */
    function onlineTierList() {
      var sec = onlineSecNow(), got = state.save.onlineGot || {}, out = [];
      var T = C.ONLINE.tiers;
      for (var i = 0; i < T.length; i++) {
        var t = T[i];
        out.push({
          id: t.id, at: t.at, label: t.label,
          energy: t.energy || 0, coin: t.coin || 0, hint: t.hint || 0,
          got: !!got[t.id],
          ready: !got[t.id] && sec >= t.at,
          left: Math.max(0, t.at - sec)
        });
      }
      return out;
    }
    function onlineClaimCount() {
      var arr = onlineTierList(), n = 0;
      for (var i = 0; i < arr.length; i++) if (arr[i].ready) n++;
      return n;
    }

    /* 领一档。体力允许溢出上限 —— 在线奖励被 16 点上限吃掉会让玩家觉得白等一小时 */
    function onlineClaim(id) {
      var arr = onlineTierList(), t = null;
      for (var i = 0; i < arr.length; i++) if (arr[i].id === id) t = arr[i];
      if (!t) return false;
      if (t.got) { toast('这一档已经领过了'); return false; }
      if (!t.ready) { toast('还差 ' + onlineClock(t.left) + ' 才能领'); return false; }
      var s = state.save;
      var got = s.onlineGot || (s.onlineGot = {});
      got[id] = true;
      var parts = [];
      if (t.coin) { s.coin = (s.coin || 0) + t.coin; parts.push('+' + t.coin + ' 巧币'); }
      if (t.energy) { s.energy = (s.energy || 0) + t.energy; parts.push('+' + t.energy + ' 体力'); }
      if (t.hint) { s.hintItems = (s.hintItems || 0) + t.hint; parts.push('+' + t.hint + ' ' + C.HINT.itemName); }
      persist();
      env.audio.play('sfx_snap');
      toast('在线奖励 ' + parts.join(' · '));
      return true;
    }

    /* v0.16：付费前先验一次「这一档真的能发」——否则会出现「扣了道具/巧币，
     * 但 pickHintPiece() 返回 null（板已经全放对）→ 提示没发」的吞费。
     * 旧版扣费在 useHint 之前，属于隐性缺陷；取消免费档后道具变稀缺，必须先守住。
     * v0.20：不再有档位上限（每关可反复买），只保留"能不能发"这一层校验。 */
    function canTakeHint() {
      if (state.page !== 'play' || state.win) return false;
      /* v0.21：教学关已经免费在指了 —— 这时候买提示纯属白花钱，直接拦住不扣费 */
      if (state.tut) { toast('教学关不用买提示，照着屏幕上的指令做就行'); return false; }
      /* v0.20：上一条提示还亮着（那一块还没放上去）就不要再扣一次费 ——
       * 玩家连点两下面板会买到同一个提示，白花一个道具/40 巧币。 */
      if (state.hint) {
        var hst0 = null, lv0 = LEVELS[state.levelIdx];
        for (var c0 = 0; c0 < lv0.solution.length; c0++) {
          if (lv0.solution[c0].id === state.hint.id) hst0 = lv0.solution[c0];
        }
        if (hst0 && !pieceSolved(pieceOf(hst0.id), hst0)) {
          toast('这一步已经标出来了，先把它放上去');
          return false;
        }
      }
      if (!pickHintPiece()) { toast('这一关已经拼好啦'); return false; }
      return true;
    }

    /* v0.16：查找道具 = 提示的唯一"免费"支付方式（不花巧币、不看广告）。
     * 每关不再白送一次，所以这里是玩家最常用的那条路。 */
    function useHintItem() {
      var s = state.save;
      if ((s.hintItems || 0) <= 0) { toast(C.HINT.itemName + '不足'); return; }
      if (!canTakeHint()) return;
      s.hintItems -= 1;
      persist();
      useHint();
    }

    /* 每帧记账（由 update 调用）：累计 + 每 persistSec 落一次本地盘 */
    function onlineTick(dt) {
      var s = state.save; if (!s) return;
      if (!state.onlineMark) { state.onlineMark = Date.now(); return; }
      if (onlineRoll()) { state.onlineSaveT = 0; writeLocal(true); }
      onlineSync();
      state.onlineSaveT += dt;
      if (state.onlineSaveT >= (C.ONLINE.persistSec || 15) * 1000) {
        state.onlineSaveT = 0;
        writeLocal(true);
      }
    }

    /* ---- 皮肤（只覆盖配色，动态改 COL 字段以让闭包引用同步生效） ---- */
    /* v0.38：先留一份「浅色基准」快照。COL 就是 C.COLORS 本体、被反复改写，
     * 所以每次刷新都从基准重建，否则从深色皮肤 / 深色背景切回浅色时，
     * cardEdge / board / targetFill / mask 这些只出现在深色板里的字段会残留深色。 */
    var BASE_COL = {};
    for (var _bk in C.COLORS) BASE_COL[_bk] = C.COLORS[_bk];
    /* v0.28 refreshPalette：皮肤 → 深色打底 → 深色背景特效，顺序固定。
     * v0.38：新增「深色皮肤」（dusk 夜间护眼）。它先铺 DARK_PAL 打底保证字段齐全，
     * 再用皮肤自己的色覆盖，因此深色皮肤下的卡纸 / 描边 / 目标轮廓不会漏出浅色值。 */
    function refreshPalette() {
      var k, sk;
      for (k in BASE_COL) COL[k] = BASE_COL[k];
      var key = state.save.skin || 'warm';
      sk = C.SKINS[key];
      /* 老存档里的 sunset / ocean 已下线（v0.38 换成夜间护眼），静默回落暖木，
       * 否则面板里一个都不高亮、COL 也会停在上一套颜色上。 */
      if (!sk) { key = 'warm'; state.save.skin = key; sk = C.SKINS.warm; }
      state.darkSkin = !!sk.dark;
      if (state.darkSkin && C.DARK_PAL) { for (k in C.DARK_PAL) COL[k] = C.DARK_PAL[k]; }
      for (k in sk) { if (k !== 'name' && k !== 'dark') COL[k] = sk[k]; }
      var fx = C.BG_FX && C.BG_FX[state.save.bgFx || 'geometric'];
      state.darkFx = !!(fx && fx.dark);
      if (state.darkFx && C.DARK_PAL) {
        for (k in C.DARK_PAL) COL[k] = C.DARK_PAL[k];
      }
    }
    function applySkin(key) {
      var sk = C.SKINS[key];
      if (!sk) return;
      state.save.skin = key;
      refreshPalette();
      saveVisual();          // v0.31：同步到全局键，另一套玩法立即一致
      persist();
      toast('皮肤：' + sk.name);
    }
    function initSkin() {
      /* v0.27：视觉风格三件套随存档恢复。板件样式/背景特效是纯绘制状态，
       * 音效风格需要通知音频层（两端 game.js 实现了 setSfxStyle）。 */
      refreshPalette();
      state.fxParts = null;
      if (env.audio && env.audio.setSfxStyle) env.audio.setSfxStyle(state.save.sfxStyle || 'wood');
    }

    /* ---- v0.27：三类视觉风格的切换 ---- */
    function applyBgFx(key) {
      if (!C.BG_FX || !C.BG_FX[key]) return;
      state.save.bgFx = key;
      state.fxParts = null;          // 换了特效 → 下一帧重新生成粒子
      refreshPalette();              // v0.28：深/浅特效切换时同步换字色 / 卡色
      saveVisual();                  // v0.31：全局生效
      persist();
      toast('背景：' + C.BG_FX[key].name);
    }
    function applyPieceStyle(key) {
      if (!C.PIECE_STYLES || !C.PIECE_STYLES[key]) return;
      state.save.pieceStyle = key;
      saveVisual();                  // v0.31：全局生效
      persist();
      toast('板件：' + C.PIECE_STYLES[key].name);
    }
    function applySfxStyle(key) {
      if (!C.SFX_STYLES || !C.SFX_STYLES[key]) return;
      state.save.sfxStyle = key;
      if (env.audio && env.audio.setSfxStyle) env.audio.setSfxStyle(key);
      saveVisual();                  // v0.31：全局生效
      persist();
      env.audio.play('sfx_pick');    // 立即试听，切换手感可感知
      toast('音效：' + C.SFX_STYLES[key].name);
    }

    /* ---- v0.39：付费皮肤 选 / 买 ----
     * 点卡片分两种：
     *   · 没锁（免费或已买过）→ 直接应用，和以前一样；
     *   · 已锁 → 进确认页（state.overlay='buy'），绝不一点就扣巧币。
     * 购买成功后 key 进全局解锁表，之后两边（四巧/七巧）都是已购状态。 */
    function pickSkinItem(kind, key) {
      if (!itemLocked(kind, key)) {
        if (kind === 'bgfx') applyBgFx(key); else applyPieceStyle(key);
        return;
      }
      var m = C[SHOP_MAP[kind]], it = m && m[key];
      if (!it) return;
      env.audio.play('sfx_tap');
      state.buyItem = { kind: kind, key: key, price: it.price || 0, name: it.name, desc: it.desc };
      state.overlay = 'buy';
    }
    function buySkinItem() {
      var it = state.buyItem, s = state.save;
      if (!it) { state.overlay = 'skin'; return; }
      if ((s.coin || 0) < it.price) { toast('巧币不足，还需 ' + (it.price - (s.coin || 0)) + ' 巧币'); return; }
      s.coin -= it.price;
      persist();                     // 扣币立刻落盘（writeLocal 会同步全局钱包）
      grantItem(it.kind, it.key);
      if (it.kind === 'bgfx') applyBgFx(it.key); else applyPieceStyle(it.key);
      state.buyItem = null;
      state.overlay = 'skin';
      env.audio.play('sfx_win');
      toast('已解锁：' + it.name);
    }

    /* ---- 模拟广告（个人主体无流量主：adSimMs 进度条后发奖） ---- */
    /* v0.35：本关看视频额度（提示 / 复活 / 结算 ×5，合计上限 ECON.adPerLevel=3）。
     * 体力面板的看视频**不占额度** —— 那是全局钱包，跟哪一关无关。 */
    var AD_LV_KINDS = { hint: 1, revive: 1, coin5: 1 };
    function adLvLimit() { return C.ECON.adPerLevel || 3; }
    function adLvLeft() { return Math.max(0, adLvLimit() - (state.adLv || 0)); }
    /* 激励视频：有真实广告位就走 wx 的激励视频（看完才发奖），
     * 没有（预览端 / 未开流量主 / 广告拉取失败）再退回原来的模拟播放。
     * 注意：真广告「没看完」不发奖，这是流量主结算的前提，不能作弊友好。 */
    function adStart(kind) {
      if (state.adSim || state.adWait) return;
      if (AD_LV_KINDS[kind] && adLvLeft() <= 0) {
        toast('本关看视频次数已用完（最多 ' + adLvLimit() + ' 次）');
        return;
      }
      env.audio.play('sfx_tap');
      if (adAvailable()) {
        state.adWait = kind;
        env.ad.rewarded(kind, function (ok, msg) {
          state.adWait = null;
          if (ok) adFinishKind(kind);
          else toast(msg || '广告暂时不可用，试试用巧币复活');
        });
        return;
      }
      state.adSim = { kind: kind, t: 0 };
    }
    function adFinish() {
      var kind = state.adSim && state.adSim.kind;
      state.adSim = null;
      adFinishKind(kind);
    }
    function adFinishKind(kind) {
      /* 只在这条"真发奖"的路径上计数：拉不到广告 / 用户中途退出都不扣额度 */
      if (AD_LV_KINDS[kind]) state.adLv = (state.adLv || 0) + 1;
      if (kind === 'energy') grantFreeEnergy(true);
      else if (kind === 'revive') doRevive(true);
      else if (kind === 'invite') doInviteShare();
      else if (kind === 'hint') useHint();          // v0.10：看完广告才给下一档提示
      else if (kind === 'coin5') grantWinAdMul();   // v0.23：结算页 ×5
    }

    /* ---------------- v0.9 广告位（v0.33：banner 下线） ----------------
     * 原生 banner 预留区（LAY.AD）已随卡纸放大一并移除，adRect/syncBanner 删除。
     * 激励视频 / 插屏仍走 env.ad.rewarded / env.ad.interstitial，不受影响。 */
    function adAvailable() {
      return !!(env.ad && env.ad.rewarded);
    }

    /* ---- 失败 / 复活 ---- */
    function failLevel() {
      if (state.overlay === 'fail') return;
      var s = state.save;
      state.running = false;
      clearResume();          // v0.26：时间耗尽 = 这局结束，不再有"续玩"
      state.overlay = 'fail';
      state.failT = 0;
      state.selId = null;
      /* v0.18：计时归零 = 本局失败，当前连胜当场中断并落盘。
       * 旧版只在「忍痛放弃」里清零：玩家直接在失败页杀掉进程，
       * 下次进来连胜还在 —— 这是连胜榜虚高的第二个来源。
       * 断点前的值只放内存，复活时恢复（面板上「复活可以保持连胜」仍然算数）。
       * v0.19：断点除了连胜数值，还要带上「本段已计关集合」（state.seenBeforeFail），
       * 否则复活后重打刚失败的那关会被当成新关再计一次。 */
      state.streakBeforeFail = s.streak || 0;
      state.seenBeforeFail = (s.streakSeen || []).slice();
      if (state.streakBeforeFail > 0 || state.seenBeforeFail.length) {
        s.streak = 0;
        s.streakSeen = [];
        persist();
        /* v0.19：连胜是榜上的数，失败必须立刻上行（3.5s 防抖会让玩家以为没算），
         * 也不留一次「被杀进程前还没发出去」的空档。 */
        cloudPush(true);
        publishFriend();
      }
      env.audio.play('sfx_tap');
    }
    function doRevive(byAd) {
      var E = C.ECON, s = state.save;
      /* v0.23：取消「每关最多复活 2 次」——
       *   广告复活不再给巧币（旧版 +90，比付费复活 -100 还划算，
       *   最优策略变成"故意失败看广告"，与"别失败"的设计意图相反），
       *   于是它回归成"看一段广告换回本关"的等价交换；
       *   付费复活 100 → 80，与首通收入（2/3/5）拉开但不至于遥不可及。
       * 次数不设上限：想连着看三次广告就复活三次，代价是时间，不是被拦下。 */
      if (byAd) {
        /* 广告复活只给心，不给巧币 */
      } else {
        if ((s.coin || 0) < E.coinRevive) { toast('巧币不足'); return; }
        s.coin -= E.coinRevive;
      }
      state.reviveUsed++;
      /* v0.18：复活把失败时中断的连胜接回来（这就是「复活可以保持连胜」）
       * v0.19：数值与「本段已计关集合」一起接回来，两处断点同时清掉。
       * 没有断点（本局失败前连胜本来就是 0 / 集合为空）时不要动现有值 ——
       * 否则「无断点的复活」会把连胜抹成 0。 */
      var hadBp = (state.streakBeforeFail > 0) || ((state.seenBeforeFail || []).length > 0);
      if (hadBp) {
        s.streak = state.streakBeforeFail || 0;
        s.streakSeen = (state.seenBeforeFail || []).slice();
      }
      state.streakBeforeFail = 0;
      state.seenBeforeFail = [];
      state.timeLeft = Math.min(state.timeLimit, state.timeLeft + state.timeLimit / C.TIMER.hearts);
      state.hearts = heartsOf(state.timeLeft, state.timeLimit);
      persist();
      if (hadBp) { cloudPush(true); publishFriend(); }
      state.overlay = null;
      state.running = true;
      env.audio.play('sfx_snap');
      toast(byAd ? '复活成功' : ('复活成功 -' + E.coinRevive + ' 巧币'));
      setLevelScene();
    }
    /* v0.23：结算页「看视频 ×5」—— 只作用于**本次**通关奖励。
     * 不做「本关永久翻倍」，也不做「下一关自动带着」：
     * 每一关想翻倍都得自己点一次，否则一次观看会被记成一个长期倍率，
     * 奖励结构又回到"看一次广告吃一整局"的老问题。
     * r.gain 是本次已经落账的金额（首通 / 升星补差都算），这里补发 (倍率-1) 倍的差额。 */
    function grantWinAdMul() {
      var r = state.result;
      /* v0.40：判定从 r.first 放宽到 r.gain —— 升星补差也能翻倍，
       * 用户的说法是「看视频对获得的巧币数量进行翻 5 倍」，翻的是这次拿到的钱。 */
      if (!r || r.adUsed || !r.gain) { toast('本关没有可翻倍的奖励'); return; }
      var mul = (C.ECON.coinWinAdMul || 5);
      var extra = r.gain * (mul - 1);
      state.save.coin = Math.max(0, (state.save.coin || 0) + extra);
      r.adUsed = true;
      r.extra = extra;
      persist();
      env.audio.play('sfx_snap');
      toast('+' + r.gain + ' → +' + (r.gain * mul) + ' 巧币');
    }
    function giveUp() {
      state.overlay = null;
      state.running = false;
      clearResume();                           // v0.26：主动放弃 = 这局不要了
      state.save.streak = 0;                   // 放弃 → 连胜清零
      state.save.streakSeen = [];              // v0.19：本段集合同时清空
      state.streakBeforeFail = 0;
      state.seenBeforeFail = [];               // v0.19：两处断点一起清
      persist();
      cloudPush(true);                         // v0.19：榜上的数立即上行
      publishFriend();
      go('levels');
    }

    /* ==================== v0.41 邀请有礼（累计制 + 8 档阶梯） ====================
     * 旧口径（v0.16~v0.40）：每天首次分享当场 +20 巧币 +1 查找道具，一天一次。
     * 新口径（用户要求）：
     *   · 不限每日次数，改成**累计**邀请人数；
     *   · 分享只是「发出邀请」，当场**不发奖**；
     *   · 被邀请的好友完成任意 needCleared(4) 关，这一位才计入人数；
     *   · 人数达标后按 INVITE.tiers 逐档发放（每档只发一次，自动到账）。
     *
     * 判定入口只有 inviteConfirmed()：接后端时只替换它，
     * 存档 / 发奖 / UI 都不动。 */

    /* 这一条邀请（ts = 发出时刻）是否已满足「好友完成 4 关」 */
    function inviteConfirmed(ts) {
      if (env.invite && typeof env.invite.confirmed === 'function') {
        try { if (env.invite.confirmed(ts)) return true; } catch (e) { /* 宿主异常 → 退回模拟 */ }
      }
      return (Date.now() - ts) >= (C.INVITE.verifySec || 60) * 1000;
    }

    /* 发一档奖励。体力走 addEnergy(…, overflow=true)：
     * 邀请奖励和看视频一样允许溢出上限，否则满体力时给的 20 点会被吞掉。 */
    function grantInviteTier(t) {
      var s = state.save;
      if (!t) return;
      if (t.coin) s.coin = (s.coin || 0) + t.coin;
      if (t.energy) addEnergy(t.energy, null, true);
      if (t.hint) s.hintItems = (s.hintItems || 0) + t.hint;
      if (t.pstyle) grantItem('pstyle', t.pstyle);   // 走全局解锁表，四巧/七巧通用
      if (t.bgfx) grantItem('bgfx', t.bgfx);
    }

    /* 按当前人数把「已达标的未发档位」补齐。返回本次新发的档位数组。 */
    function inviteGrant() {
      var s = state.save, T = (C.INVITE && C.INVITE.tiers) || [], out = [];
      if (!s) return out;
      if (!Array.isArray(s.inviteGot)) s.inviteGot = [];
      for (var i = 0; i < T.length; i++) {
        var t = T[i];
        if ((s.inviteCount || 0) < t.n) break;          // 后面的档位人数只会更高
        if (s.inviteGot.indexOf(t.n) >= 0) continue;
        grantInviteTier(t);
        s.inviteGot.push(t.n);
        out.push(t);
      }
      return out;
    }

    /* 结算待确认队列 → 计数 → 补发阶梯奖。打开面板、分享、启动时都会调。 */
    function inviteVerify() {
      var s = state.save;
      if (!s) return { added: 0, tiers: [] };
      var keep = [], added = 0, pend = s.invitePend || [];
      for (var i = 0; i < pend.length; i++) {
        if (inviteConfirmed(pend[i])) added++;
        else keep.push(pend[i]);
      }
      s.invitePend = keep;
      if (added) s.inviteCount = (s.inviteCount || 0) + added;
      var tiers = inviteGrant();
      if (added || tiers.length) persist();
      return { added: added, tiers: tiers };
    }

    /* 主页入口红点：有没有「已满足条件、还没被算进去」的邀请 */
    function inviteHasNews() {
      var s = state.save, pend = (s && s.invitePend) || [];
      for (var i = 0; i < pend.length; i++) if (inviteConfirmed(pend[i])) return true;
      return false;
    }
    /* 下一个还没达成的档位（面板上写进度用），已满 8 档返回 null */
    function inviteNextTier() {
      var s = state.save, T = (C.INVITE && C.INVITE.tiers) || [];
      for (var i = 0; i < T.length; i++) if ((s.inviteCount || 0) < T[i].n) return T[i];
      return null;
    }

    /* v0.42：邀请列表滚动 —— 夹在 [0, inviteScrollMax] 之间，越界只会贴边不会弹飞 */
    function setInviteScroll(v) {
      var m = state.inviteScrollMax || 0;
      state.inviteScroll = Math.max(0, Math.min(m, v));
    }

    /* 分享 = 发出一张邀请券。不再当场发奖，也不再限每日一次。 */
    function doInviteShare() {
      var s = state.save, V = C.INVITE, now = Date.now();
      if (!s) return;
      if (state.inviteCd && now < state.inviteCd) return;      // 冷却中，忽略连点
      state.inviteCd = now + (V.shareCdMs || 1200);
      if (!Array.isArray(s.invitePend)) s.invitePend = [];
      /* 队列满了先结算一轮（可能有的已经完成 4 关），腾出位置再发 */
      if (s.invitePend.length >= (V.maxPend || 12)) {
        var r0 = inviteVerify();
        state.inviteFlash = r0;
      }
      if (s.invitePend.length >= (V.maxPend || 12)) {
        toast('待确认的邀请已满，等好友通关后再来');
        return;
      }
      s.invitePend.push(now);
      persist();
      if (env.share) { try { env.share(); } catch (e) {} }
      toast('邀请已发出 · 好友完成 ' + (V.needCleared || 4) + ' 关后计入');
    }

    /* ---------------- 数据集切换（v0.3 Phase 0）----------------
     * 四巧板 / 七巧板各自独立存档，切换时重算数据集相关闭包变量并重载存档。
     * 不重建 game 实例 → 不会重复 bindInput / 重复启动 rAF 主循环。 */
    function useSet(key) {
      if (!SETS || !SETS[key] || key === state.setKey) return;
      /* v0.36：在线状态是全局的。切玩法前先把这一刻的累计秒数结算并落盘，
       * 否则 loadSave() 会拿 15 秒前那次落盘的旧值把刚待的这段时间抹掉，
       * 玩家会看到「切一次玩法，今日在线倒退」。 */
      if (state.save) { onlineSync(); writeLocal(true); }
      var b = buildSet(key);
      DS = b.ds; LEVELS = b.levels; LOCAL = b.LOCAL; TRAY_BB = b.TRAY_BB;
      SLOT_POS = b.SLOT_POS; CHAP_PER = b.chapPer; CHAP_NAMES = b.chapNames;
      CHAP_TITLES = b.chapTitles; COMPLETE_TITLE = b.completeTitle; COMPLETE_SUB = b.completeSub;
      SAVE_KEY = b.saveKey; SNAP_GRID = b.snapGrid;
      state.setKey = key;
      state.save = loadSave();
      /* v0.36：把全局在线状态回写进刚载入的这份存档，两套镜像不分叉
       * （玩家看不到镜像，但云端上行会读它；见 collectCloud） */
      writeLocal(true);
      state.settingsFx = state.save.settings.sfx !== false;
      state.settingsBgm = state.save.settings.bgm !== false;
      applyAudio();
      state.levelIdx = 0; state.pieces = []; state.selId = null;
      state.drag = null; state.win = null; state.result = null; state.overlay = null;
      /* v0.19：两个数据集各存一份 save，切数据集时内存里的断点必须清干净 ——
       * 否则四巧板失败后切到七巧板再复活，会把另一套数据集的连胜接回来。 */
      state.streakBeforeFail = 0;
      state.seenBeforeFail = [];
      state.flower = null;   // v0.3.4 A4a：切数据集时清掉未播完的鲜花
      state.lastTap = null;  // v0.4 A1：切数据集不残留双击配对
      go('home');
    }

    /* ---------------- v0.11 BGM 选曲 ----------------
     * 4 首关卡曲按「关卡序号 / 每首关数」取模，四巧板与七巧板各自从第 1 关起算：
     *   1~5 → lv1、6~10 → lv2、11~15 → lv3、16~20 → lv4、21~25 → lv1 …
     * 一关之内永不换曲；换曲只发生在"进入下一关"，结算页沿用本关那首。 */
    function bgmSceneKey() {
      var B = C.BGM || {}, arr = B.scenes || [];
      if (!arr.length) return 'home';
      var per = B.levelsPerTrack || 5;
      return arr[Math.floor(state.levelIdx / per) % arr.length];
    }
    function setLevelScene() {
      if (env.audio && env.audio.setScene) env.audio.setScene(bgmSceneKey());
    }

    /* ---------------- 页面切换 ---------------- */
    function go(page) {
      /* v0.26：离开对局页且这局还没结束 → 先记一份续玩快照。
       * 必须放在 state.page = page 之前，否则读到的已经是新页面。 */
      if (state.page === 'play' && page !== 'play') saveResume();
      state.page = page;
      state.fade = 0;
      state.pageT = 0;
      /* v0.6：主页与关卡列表都放温馨曲（列表页原本会残留上一关的曲子）；
       * 对局放当前关卡曲；通关后由 win() 切到欢庆曲，进下一关再切回来。 */
      if (env.audio && env.audio.setScene) {
        if (page === 'home' || page === 'levels') env.audio.setScene('home');
        else if (page === 'play') env.audio.setScene(bgmSceneKey());
      }
      if (page !== 'play') { state.running = false; }
      /* v0.14：切页就撤掉盖在画布上的原生授权按钮，别让它留在别的页面上 */
      if (state.overlay !== 'settings') hideProfileButton();
      /* v0.6：离开对局页就收掉通关鲜花/结算态，避免下次进来还在飘 */
      if (page !== 'play') { state.win = null; state.flower = null; }
      // 进关卡页时跳到「当前进度所在章」，关卡再多也不该每次都从第 1 章翻起
      if (page === 'levels') {
        var um = Math.max(1, Math.min(state.save.unlockedMax || 1, LEVELS.length));
        state.lvPage = Math.floor((um - 1) / CHAP_PER);
      }
    }

    /* ---------------- v0.26 中途续玩 ----------------
     * 旧版有三种"退出即刷新"的漏洞，都会把倒计时变成摆设：
     *   ① 玩到只剩 10 秒，返回列表再进来 → 时间回满，等于用"退出"续命；
     *   ② 同一关每进去一次就扣一次体力，拼不上的人越试越穷；
     *   ③ 拼了一半的板子全回托盘，之前的操作白做。
     * 现在：离开未通关的关卡时留一份快照（剩余时间 / 用时 / 步数 / 复活次数 /
     * 已在板上的块），下次从列表点同一关整份恢复，并且不再扣体力。
     * 只在"真正动过手"时才写（步数 > 0 或有块在板上），所以点错关立刻退出
     * 不会把上一关的快照冲掉。 */
    function isTutLevel(idx) {
      var T = C.TUTORIAL;
      return !!(T && T.on && idx < (T.levels || 1));
    }
    function saveResume() {
      var s = state.save, i = state.levelIdx;
      if (state.page !== 'play') return;
      if (!state.running || state.win || state.tut) return;
      if (isTutLevel(i)) return;                        // 教学关每次重来，不留档
      if ((s.starOf[String(i + 1)] || 0) > 0) return;   // 已通关的重玩不需要续
      if (!(state.timeLeft > 0)) return;                // 时间耗尽 = 这局已结束
      var pc = [], k;
      for (k = 0; k < state.pieces.length; k++) {
        var p = state.pieces[k];
        if (p.onBoard) {
          pc.push([p.id, Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10,
            Math.round(p.angle), p.flipped ? 1 : 0]);
        }
      }
      if (!pc.length && !state.steps) return;           // 没动过手 → 别冲掉上一关的快照
      s.resume = {
        lv: i, tl: state.timeLimit, left: Math.round(state.timeLeft * 100) / 100,
        el: Math.round(state.elapsed || 0), st: state.steps || 0,
        rv: state.reviveUsed || 0, pc: pc, at: Date.now()
      };
      persist();
    }
    function clearResume() {
      if (!state.save.resume) return;
      state.save.resume = null;
      persist();
    }
    /* 能续玩吗：关卡号对上、还没通关、也不是教学关 */
    function takeResume(idx) {
      var r = state.save.resume;
      if (!r || r.lv !== idx) return null;
      if ((state.save.starOf[String(idx + 1)] || 0) > 0) return null;
      if (isTutLevel(idx)) return null;
      return r;
    }
    /* v0.26：所有"进关"入口统一走这里 —— 三件事必须一起判，不能两处各写一份：
     *   ① 有快照 → 续玩（不扣体力、不回满时间）
     *   ② 教学关 → 不扣体力（练习场，本就没有通关奖励，再收体力纯亏）
     *   ③ 已通关 → 不扣体力（v0.23 口径：重复通关无奖励，再收就是罚）
     * 只有"未通关 + 没快照 + 非教学关"才真正扣。 */
    function openLevel(idx) {
      var s = state.save;
      var r = takeResume(idx);
      var cleared = (s.starOf[String(idx + 1)] || 0) > 0;
      if (!r && !cleared && !isTutLevel(idx) && !spendEnergy()) {
        state.overlay = 'energy';     // 体力不足 → 免费体力弹窗
        return false;
      }
      setupLevel(idx, r ? { resume: r } : null);
      go('play');
      /* v0.26：续玩时给一句提示 —— 否则玩家看到"时间不满 + 板上有块"会以为界面出错 */
      if (r) toast('继续上次进度');
      return true;
    }

    /* ---------------- 关卡初始化 ---------------- */
    function setupLevel(idx, opts) {
      opts = opts || {};
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
      /* v0.21：重开不清用时/步数 —— 计时没重置，这两个也必须跟着连续，
       * 否则重开一次就等于把"用时"清空，星级又能刷回三星。 */
      if (!opts.keepTimer) { state.elapsed = 0; state.steps = 0; }
      /* v0.10：提示改为「每关独立的三档阶梯」。
       * 不再从存档 hintUsed 恢复：旧版一旦用过提示，该关永久封顶 ★★（重玩也拿不到三星），
       * 玩家反馈"这关废了"。存档字段只留作历史标记，不参与星级计算。 */
      state.hintUsed = false;
      state.hintLv = 0;
      state.hintPaid = 0;
      state.hintTier = LEVELS[idx].hintTier ||
        ((LEVELS[idx].splitLines && LEVELS[idx].splitLines.length) ? 2 : 1);
      state.cov = 0; state.covFrom = 0; state.covTo = 0; state.covT = 1;
      state.msg = ''; state.msgT = 0;
      state.overlapT = 0; state.overlapPairs = [];
      state.win = null; state.result = null; state.resT = 0; state.starShown = 0;
      state.flower = null;   // v0.3.4 A4a：重开关卡不残留上一局鲜花
      state.lastTap = null;  // v0.4 A1：重开关卡不残留双击配对
      state.hint = null;
      state.judge = new J.Judge();
      /* v0.32：支持内孔（字母 A/P 这类轮廓中间必须挖空）
       * lv.holes 可选，缺省时行为与旧版完全一致。 */
      state.judge.setTarget(lv.outline, lv.holes);
      state.running = true;
      state.lastSnap = null;
      state.lastEdge = null;
      /* v0.5：每关重置倒计时 / 生命值 / 复活次数
       * v0.21：重开（工具栏那个刷新按钮）**不再重置倒计时**。
       * 旧版 restart 也走这里，等于按一下就把时间充满 —— 玩家发现后
       * 只要在最后 10 秒狂点刷新，就能无限拖时间，"倒计时"形同虚设。
       * 现在只有「换关 / 结算后重玩」才重置；重开保留 timeLeft、生命值、
       * 已用复活次数与 elapsed，相当于「这一局还在继续，只是把板子放回托盘」。 */
      var tl = timeLimitOf(lv);
      if (opts.resume) {
        /* v0.26：续玩 —— 时间、用时、步数、复活次数、已在板上的块全部照搬。
         * 这里绝不能回满：否则"快没时间就返回再进"就是免费续命。 */
        var r0 = opts.resume;
        /* v0.31：时限口径改成 2 分钟后，旧快照里可能是 240 秒 —— 夹到当前时限，
         * 否则「老存档续玩」会白拿 2 分钟。剩余时间同理不能超过时限。 */
        state.timeLimit = Math.min(r0.tl || tl, tl);
        state.timeLeft = Math.max(0, Math.min(r0.left || 0, state.timeLimit));
        state.hearts = heartsOf(state.timeLeft, state.timeLimit);
        state.reviveUsed = r0.rv || 0;
        state.elapsed = Math.max(0, r0.el || 0);
        state.steps = Math.max(0, r0.st || 0);
        if (r0.pc && r0.pc.length) {
          for (var qi = 0; qi < r0.pc.length; qi++) {
            var it = r0.pc[qi];
            for (var pi = 0; pi < state.pieces.length; pi++) {
              var pp = state.pieces[pi];
              if (pp.id !== it[0]) continue;
              pp.onBoard = true;
              pp.x = it[1]; pp.y = it[2];
              pp.angle = it[3]; pp.dAngle = it[3];
              pp.flipped = !!it[4]; pp.dFlipped = !!it[4];
              break;
            }
          }
        }
      } else if (opts.keepTimer) {
        state.timeLimit = state.timeLimit || tl;
        state.timeLeft = Math.max(0, state.timeLeft);
        state.hearts = heartsOf(state.timeLeft, state.timeLimit || 1);
      } else {
        state.timeLimit = tl;
        state.timeLeft = tl;
        state.hearts = C.TIMER.hearts;
        state.reviveUsed = 0;
        /* v0.35：新的一关 → 看视频额度重新给满 3 次（keepTimer 的"重开"不清，
         * 那是同一局接着打，额度不该因为点了一下刷新就回满）。 */
        state.adLv = 0;
      }
      /* v0.21：每类游戏的第 1 关是教学关 */
      state.tut = makeTutorial(idx, opts);
    }

    /* ---------------- v0.21 新手教学 ----------------
     * 依据参考视频的做法：教学关不在弹窗里念规则，而是
     *   ① 把标准解按彩色淡显铺在轮廓里（玩家有"照着摆"的参照）
     *   ② 卡纸顶部一行指令，说清下一步手上该做什么动作
     *   ③ 倒计时冻结，不拿时间逼新手
     * 指令不是写死的脚本，而是每帧按「下一块还差什么」算出来的：
     * 还没上板 → 教拖；上板了角度不对 → 教转；角度对了但要翻面 → 教翻。
     * 这样第 1 关需要哪种手势就教哪种，不会出现"教了翻转但本关不用翻"。 */
    function makeTutorial(idx, opts) {
      var T = C.TUTORIAL;
      if (!T || !T.on) return null;
      /* 验收/截图脚本可以显式关掉教学（env.tutorial === false）：
       * 它们要测的是提示、计时、榜单这些横向系统，第 1 关被教学接管会互相干扰。 */
      if (env.tutorial === false) return null;
      if (idx >= (T.levels || 1)) return null;   // 只有每类第 1 关教
      /* v0.26：第 1 关永远是教学形式，不再看"通没通关"。
       * 用户原话：「不管是否通关都是教学的形式」。第 1 关就是练习场：
       * 虚影 + 指令 + 冻结计时一直都在，通关后想再学一遍直接点进来即可，
       * 不需要任何入口，也不会因为"教过"就消失。
       * （noTut 一并去掉：它当初只为"重开时别再教"，而教学关重开本就该重新教。） */
      return { t: 0, done: false };
    }
    /* 教学关的下一条指令：按"下一块差什么"给动作，全部放对后返回 null
     * 判定顺序 = 拖上板 → 翻面 → 摆到位置 → 转角度，和玩家实际会踩的顺序一致：
     * 不在板上先拖；翻错了怎么转都对不上，先翻；位置偏了先摆过去；最后才谈角度。 */
    function tutStep() {
      var lv = LEVELS[state.levelIdx], i;
      for (i = 0; i < lv.solution.length; i++) {
        var st = lv.solution[i], p = pieceOf(st.id);
        if (!p) continue;
        if (!p.onBoard) {
          return { kind: 'drag', id: st.id,
            text: '把亮起来的这块拖进来，放到同色的虚影上' };
        }
        if (pieceSolved(p, st)) continue;
        if (!!p.flipped !== !!st.flipped) {
          return { kind: 'flip', id: st.id,
            text: '这块要翻个面：双击它一下' };
        }
        if (Math.abs(p.x - st.x) > 1 || Math.abs(p.y - st.y) > 1) {
          return { kind: 'drag', id: st.id,
            text: '把它挪到虚影的位置上，靠近会自动吸住' };
        }
        return { kind: 'rot', id: st.id,
          text: '拖住板上的小圆点转一转，让它和虚影对齐' };
      }
      return null;
    }
    /* v0.25：跳过只关掉"这一次"，不再落档。
     * 落档会让"点过一次跳过 = 以后永远没有教学"，也正是新玩家看不到教程的主要来源。
     * 只关本次的话：当关继续玩不受影响；退出重进（仍未通关）还会教一次，这不算打扰。 */
    function tutSkip() {
      state.tut = null;
      toast('已跳过教学');
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
    /* 托盘 1:1：s 恒为 1，只做平移，把「质心」对到散放落点。
     * 旧实现 s = min((slot-2*pad)/w, (slot-2*pad)/h)，每块板各自缩放，
     * 于是 A(2.5u²) 和 B(0.5u²) 在托盘里看起来差不多大 —— 这就是「空间误差」。
     * v0.9：对齐点从 bbox 中心改成质心，重叠加叠时点落点也不会点空。 */
    function trayTransform(p) {
      var bb = TRAY_BB[p.id];
      var sp = SLOT_POS[p.slot];
      return {
        cx: sp.x,
        cy: sp.y,
        s: 1,
        lcx: bb.ccx !== undefined ? bb.ccx : bb.cx,
        lcy: bb.ccy !== undefined ? bb.ccy : bb.cy
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
        /* v0.29.2：用户要求补「拼接失败」音效。只在真实重叠时响，
         * 不绑「没吸附上」——那可能只是靠近一点点的正常微调，会太吵。 */
        env.audio.play('sfx_fail');
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
      clearResume();          // v0.26：通关后这关的续玩快照作废
      state.win = { t: 0 };
      /* v0.21：通关即结束教学 —— 否则虚影和指令会透过结算面板继续飘 */
      if (state.tut) state.tut = null;
      state.flower = { t: 0 };   // v0.3.4 A4a：鲜花与音乐共用这一时刻起算
      env.audio.play('sfx_win');
      /* 星级沿用策划 5.7 原规则（三星=时限+步数；二星=时限内）。
       * v0.3 A3 变更点：用提示（hint_used）从「只给 1 星」放宽为「封顶 ★★☆」。
       * v0.20：取消这条封顶 —— 提示从「三档作弊（含看全图）」收窄成「指一步」，
       * 而且是唯一档、每次都要付费（查找道具/40 巧币/看视频）。
       * 保留封顶等于「花钱买提示还降星」，玩家会觉得被罚；
       * 面板上那行「用提示本关最高 ★★」也随本次需求一并删掉了，
       * 规则和文案必须一致，所以这里把封顶一起去掉。
       * 经济上不会刷币：三星多给 10 巧币，而一次提示 40 巧币。 */
      var stars = 1;
      if (state.elapsed <= lv.parTime * C.STAR.twoStarTimeFactor) stars = 2;
      if (state.elapsed <= lv.parTime && state.steps <= lv.parSteps) stars = 3;
      var k = String(state.levelIdx + 1);
      var s = state.save;
      /* ---------- v0.40 星级奖励：总额制 + 补差价（v0.43 数值回正） ----------
       * 口径（用户定义）：1★ 2 / 2★ 3 / 3★ 5，不看视频时每关累计最多 5 巧币。
       * 已通过的关重玩、星级提高时，补「该星级总额 − 这关已拿过的」差额，
       * 这笔补差同样能看视频 ×5。
       *
       * 于是奖励不再按「本局几星」取，而是按**该关历史最高星级**取总额：
       *     本局应得 = starReward[bestStars-1] - starPaid[k]
       *   · 首通 1★ → 2 - 0 = 2
       *   · 1★ 升 2★ → 3 - 2 = 1
       *   · 2★ 升 3★ → 5 - 3 = 2
       *   · 1★ 直接打回 3★ → 5 - 2 = 3（跨级 = 1+2）
       *   · 已 3★ 再打（哪怕这局只有 1★）→ 5 - 5 = 0
       * 每关总额恒定封顶 5，重复刷同星级一分不多，所以没有刷币漏洞。
       *
       * prevStars 必须在 starOf 更新**之前**取，否则永远"已通过、无提升"。 */
      var SR = C.ECON.starReward;
      var prevStars = s.starOf[k] || 0;
      var bestStars = Math.max(prevStars, stars);
      var firstClear = prevStars === 0;
      var targetTotal = SR[bestStars - 1] || 0;
      /* 没通关的关不该有账（容错：手改存档 / 删星重来时不认残留值） */
      var paidTotal = prevStars > 0
        ? (typeof s.starPaid[k] === 'number' ? s.starPaid[k] : (SR[prevStars - 1] || 0))
        : 0;
      var gain = Math.max(0, targetTotal - paidTotal);
      state.result = { stars: stars, time: state.elapsed, steps: state.steps,
        prevStars: prevStars, bestStars: bestStars,
        first: firstClear, up: bestStars > prevStars,
        gain: gain, target: targetTotal, adUsed: false };
      s.starOf[k] = bestStars;
      if (gain > 0) {
        s.coin = Math.max(0, (s.coin || 0) + gain);
        s.starPaid[k] = targetTotal;
      }
      if (!s.bestTime[k] || state.elapsed < s.bestTime[k]) s.bestTime[k] = +state.elapsed.toFixed(1);
      if (state.levelIdx + 1 === s.unlockedMax && s.unlockedMax < LEVELS.length) s.unlockedMax = state.levelIdx + 2;
      if (s.unlockedMax > LEVELS.length) s.unlockedMax = LEVELS.length;
      /* v0.5：通关奖励巧币 + 连胜 +1 + 下一关换 BGM 场景（每通一关切下一首）
       * v0.23：重复通关不再扣体力（见 fireBtn 的 start / lvl_ 分支）——
       * v0.40 起重玩有「升星补差」可拿，这条「不给奖励还收门票」的问题更站不住。 */
      var E2 = C.ECON;
      state.streakGain = 0;
      state.streakBeforeFail = 0;      // 通关 → 本段继续/结束，没有断点
      state.seenBeforeFail = [];       // v0.19：两个断点一起清
      /* v0.19 口径：计数单位是「本段内成功完成的一局」，不再是「首次通关的关」。
       * 旧判定 wasCleared = starOf[k] > 0 把「同一关的第二次通过」一律当成重玩 ——
       * 玩家在本关制造失败再复活通关（最常见的复现路径）就被判成重玩，连胜不涨，
       * 体感就是「用道具/复活后通过没算」。现在只按「本段是否已经计过这关」去重：
       *   · 失败后重打同一关 → 新段、集合为空 → 计入（修复用户报的问题）
       *   · 复活后通关 → 段没断、集合保留 → 没计过就计入
       *   · 同一关反复刷 → 第二次起不计（集合里有）→ 榜刷不动
       *   · 段内换关通关 → 计入 → 一段最高仍是「已解锁关数」 */
      if (!s.streakSeen) s.streakSeen = [];        // 迁移兜底（正常路径 loadSave 已给数组）
      if (s.streakSeen.indexOf(k) < 0) {
        s.streak = (s.streak || 0) + 1;
        s.streakSeen.push(k);
        s.bestStreak = Math.max(s.bestStreak || 0, s.streak);
        /* v0.8 连胜里程碑：每满 STREAK.step 关额外给巧币，结算页进度条走满即发。
         * v0.19：跟着「段内去重」走 —— 同一关在段内重复通关不会再发一次。 */
        if (s.streak % C.STREAK.step === 0) {
          s.coin += C.STREAK.coin;
          state.streakGain = C.STREAK.coin;
        }
      }
      persist();
      /* v0.19：连胜是榜上的数，通关后必须立刻上行 —— 旧版只走 3.5s 防抖，
       * 玩家通关后马上去看榜，拿到的是旧值，体感同样是「统计没算」。 */
      cloudPush(true);
      publishFriend();          // v0.18：好友榜读的是微信托管数据，通关就更新一次
      /* v0.11：通关不换曲——一关只播一首，换曲只发生在"进入下一关"。
       * 结算页继续放本关那首（音效 sting 已经给了庆祝感），
       * 这样第 5 关结束时不会在结算面板上突然换歌。 */
      /* v0.9 插屏：每攒够 N 关弹一次（N 在 config.ADS.interstitial）。
       * 放在拿到结算之后，不打断拼图；没配广告位时 ad.js 里直接 no-op。 */
      var iv = (C.ADS && C.ADS.interstitial) || null;
      if (iv && iv.unitId && env.ad && env.ad.interstitial) {
        var clearedAll = 0, sk;
        for (sk in state.save.starOf) if (state.save.starOf[sk] > 0) clearedAll++;
        if (clearedAll > 0 && clearedAll % (iv.everyLevels || 3) === 0) env.ad.interstitial();
      }
    }

    function nextLevel() {
      if (state.levelIdx + 1 >= LEVELS.length) {
        state.overlay = null;
        go('levels');
        return;
      }
      /* v0.34：必须走 openLevel 这个「所有进关入口」的统一口径。
       * 旧版直接 setupLevel + state.overlay=null，绕过了 spendEnergy ——
       * 于是从列表点关扣 2 点体力、结算页点「下一关」却白嫖一关。
       * openLevel 已处理续玩快照 / 教学关 / 重复通关不扣，这里只管切场景。
       * 体力不足时 openLevel 会自己弹 energy 面板，本次不切关，结算态保留，
       * 玩家补完体力关掉面板还能再点一次「下一关」。 */
      if (!openLevel(state.levelIdx + 1)) return;
      state.overlay = null;
      state.win = null; state.result = null; state.flower = null;
      state.adSim = null; state.adWait = null;
      /* v0.6：离开结算页 → 从欢庆曲切回本关关卡曲 */
      setLevelScene();
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
      /* v0.42：列表滑动（邀请面板）。位移超过 10px 才认作「滑」，之前仍算点击，
       * 这样手指略抖也不会把按钮点丢。滑动一旦成立，立刻取消待触发的按钮。 */
      if (state.scrollDrag) {
        var sdy = y - state.scrollDrag.y0;
        if (!state.scrollDrag.moved && Math.abs(sdy) > 10) {
          state.scrollDrag.moved = true;
          state.press = null;
        }
        if (state.scrollDrag.moved) setInviteScroll(state.scrollDrag.s0 - sdy);
        return;
      }
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
      /* v0.42：滑动松手 —— 拖动过就不算点击（press 已在 move 阶段清掉） */
      var scr0 = state.scrollDrag;
      state.scrollDrag = null;
      if (scr0 && scr0.moved) state.press = null;
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
          openLevel(idx); break;
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
        case 'close_settings': state.overlay = null; hideProfileButton(); break;
        /* v0.14 玩家资料 */
        case 'profile_auth': requestProfile(); break;
        case 'profile_rename': renameProfile(); break;
        case 'toggle_sfx':
          state.settingsFx = !state.settingsFx;
          state.save.settings.sfx = state.settingsFx; persist(); applyAudio(); break;
        case 'toggle_bgm':
          state.settingsBgm = !state.settingsBgm;
          state.save.settings.bgm = state.settingsBgm; persist(); applyAudio(); break;
        case 'close_settings': state.overlay = null; hideProfileButton(); break;
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
          /* v0.16：每关不再白送一次，第一次点也要付一次。
           * v0.20：取消档位上限，面板里随时可以再买一次（每次都指下一步）。
           * v0.22：手里有查找道具就**一步用完**，不弹面板 —— 道具是已经付过费的，
           * 再让玩家在面板里点第二下纯属多此一举（用户要求）。
           * 面板只留给「没道具」的情形：花巧币买一次 / 看视频免费一次。
           * 有道具但此刻不能发（上一步还亮着 / 教学关 / 已拼完），
           * useHintItem() → canTakeHint() 会拦下并 toast，道具不会白扣。 */
          if (state.tut) { toast('教学关不用买提示，照着屏幕上的指令做就行'); break; }
          if ((state.save.hintItems || 0) > 0) { useHintItem(); break; }
          state.overlay = 'hint';
          env.audio.play('sfx_tap');
          break;
        }
        case 'hint_ad': adStart('hint'); break;
        case 'hint_coin': useHintCoin(); break;
        case 'hint_item': useHintItem(); break;
        case 'restart':
          /* v0.26：重开只把板子放回托盘，时间不动；教学关会重新起一遍教学
           * （noTut 已删）。快照同步刷成"空盘 + 当前剩余时间"，
           * 免得下次续玩又摆回重开前那个盘面。 */
          setupLevel(state.levelIdx, { keepTimer: true });
          saveResume();
          /* v0.21：说一句，免得玩家以为按钮坏了（旧版这里是"时间回满"） */
          toast('已重排，倒计时继续');
          break;
        case 'tut_skip': tutSkip(); break;
        case 'next': nextLevel(); break;
        /* v0.23：结算页看视频 ×5（只作用当次通关奖励） */
        case 'win_ad5': adStart('coin5'); break;
        case 'replay': setupLevel(state.levelIdx); state.overlay = null;
          setLevelScene();
          break;
        case 'to_list': state.overlay = null; go('levels'); break;
        case 'to_home_from_result': state.overlay = null; go('home'); break;
        /* v0.5：HUD / 主页入口 / 弹窗按钮 */
        case 'hud_energy': state.overlay = 'energy'; break;
        /* v0.28：entry_desktop「添加桌面」已按用户要求下线 */
        case 'entry_skin': state.overlay = 'skin'; break;
        /* v0.41：打开面板时先结算「待确认的邀请」—— 好友完成 4 关的，
         * 在这里转入人数并补发阶梯奖；结果留给 renderInvite 顶部提示。 */
        case 'entry_invite':
          state.inviteScroll = 0;          // v0.42：每次打开都从第 1 档看起
          state.inviteFlash = inviteVerify();
          if (state.inviteFlash.added) {
            toast('新增 ' + state.inviteFlash.added + ' 位好友完成 ' + C.INVITE.needCleared + ' 关');
          } else if (state.inviteFlash.tiers.length) {
            toast('邀请奖励到账 ' + state.inviteFlash.tiers.length + ' 档');
          }
          state.overlay = 'invite';
          break;
        /* v0.16：主页「任务」入口下线（用户要求，不再有每日任务） */
        case 'entry_rank': openRank(null); break;
        /* v0.8：结算页分享成品 / 查看榜单 / 切页签 */
        case 'share_pattern': sharePattern(); break;
        case 'open_rank': openRank('result'); break;
        case 'rank_t0': selectRankTab(0); break;
        case 'rank_t1': selectRankTab(1); break;
        case 'rank_t2': selectRankTab(2); break;
        case 'rank_retry': cloudRank(state.rankTab); break;
        case 'close_rank':
          /* 从结算页进来的退回结算页，从主页进来的直接关掉（不能读 state.result：
           * 通关后 result 一直留着，从主页进榜单会被误判成结算页） */
          state.overlay = state.rankBack || null;
          break;
        /* v0.15：在线奖励从「点一下直接领」改成「进页面按档领」 */
        case 'online_claim': state.overlay = 'online'; break;
        /* v0.31：分享入口已下线（体力只走看视频），这里保留分支只为兼容旧热区/脚本 */
        case 'free_share': grantFreeEnergy(false); break;
        case 'free_ad': adStart('energy'); break;
        case 'ad_revive': adStart('revive'); break;
        case 'coin_revive': doRevive(false); break;
        case 'give_up': giveUp(); break;
        case 'skin_warm': applySkin('warm'); break;
        case 'skin_mint': applySkin('mint'); break;
        case 'skin_night': applySkin('night'); break;
        /* v0.38：落日 / 海岸下线，换成一键夜间护眼深色配色 */
        case 'skin_dusk': applySkin('dusk'); break;
        /* v0.39：皮肤购买确认页 */
        case 'buy_confirm': buySkinItem(); break;
        case 'buy_cancel': state.buyItem = null; state.overlay = 'skin'; break;
        /* v0.41：分享是「发邀请」，不是看视频 —— 直接发，不再走广告流程 */
        case 'invite_share': doInviteShare(); break;
        case 'close_sheet':
        case 'close_energy':
        case 'close_hint':
        case 'close_fail':
          if (!state.adSim) state.overlay = null;
          break;
        case 'lvl': break;
        default:
          /* v0.42：邀请阶梯的「领取」按钮（正常流程打开面板就自动发了，
           * 这里只兜底：宿主把人数判定推上来时，玩家可以手动点一下） */
          if (id.indexOf('invite_claim') === 0) {
            var rCl = inviteVerify();
            if (rCl.tiers.length) toast('邀请奖励到账 ' + rCl.tiers.length + ' 档');
            break;
          }
          /* v0.27：皮肤面板页签 + 三类风格项（前缀统一分发） */
          if (id.indexOf('skin_tab_') === 0) { state.skinTab = +id.slice(9) || 0; break; }
          /* v0.39：付费项先查解锁状态 —— 已锁的进确认页，没锁的直接应用 */
          if (id.indexOf('bgfx_') === 0) { pickSkinItem('bgfx', id.slice(5)); break; }
          if (id.indexOf('pstyle_') === 0) { pickSkinItem('pstyle', id.slice(7)); break; }
          if (id.indexOf('sfx_') === 0) { applySfxStyle(id.slice(4)); break; }
          /* v0.15：在线奖励 6 档统一走前缀，别在 switch 里铺 6 个 case */
          if (id.indexOf('online_o') === 0) { onlineClaim(id.slice(7)); break; }
          if (id.indexOf('lvpage_') === 0) {
            state.lvPage = +id.slice(7);
            state.pageT = 0;          // 重置入场错峰，让新一章重新入场
            break;
          }
          if (id.indexOf('lvl_') === 0) {
            var n = +id.slice(4);
            if (n <= state.save.unlockedMax) openLevel(n - 1);
          }
      }
    }

    /* ---------------- v0.20 提示：只有一档，常驻到那块放对 ----------------
     * 旧版是 3 档阶梯（指位置 / 指板件 / 看全图），每档 3.5 秒后自己消失。
     * 玩家实际用起来：想同时知道"哪块"和"放哪"得买两档，而且一闪就没。
     * 现在一次购买 = 一步指引，内容是固定的三件事：
     *   ① 目标位置脉冲高亮（棋盘上）
     *   ② 把要用的那块圈出来（托盘里，或棋盘上摆歪的那块）
     *   ③ 一条虚线从那一块连到落点
     * 亮到那块被放对为止（没有 until，不会再定时消失）。
     * 每次仍要付费：用查找道具 / 花巧币 / 看视频，本关不限次数。
     * 返回 true 表示真的给了提示（广告回调/扣币分支据此决定要不要提示失败）。 */
    function useHint() {
      if (state.page !== 'play' || state.win) return false;
      var pid = pickHintPiece();
      if (!pid) { toast('这一关已经拼好啦'); return false; }
      state.hintLv++;                  // 只做计数（统计/日志），不再限制次数
      state.hintPaid++;
      if (!state.hintUsed) {
        state.hintUsed = true;
        /* 只写历史标记：本关"用过提示"这件事记在存档里（云端/老版本可读），
         * 但星级判定只看本局，重玩不用提示仍能拿三星。 */
        state.save.hintUsed[String(state.levelIdx + 1)] = true;
        persist();
      }
      state.hint = { id: pid, t: 0 };  // 没有 until：常驻到这一块放对
      state.overlay = null;
      env.audio.play('sfx_snap');
      toast('已标出下一步：圈起来的那块，放到虚线处');
      return true;
    }
    /* 巧币直接买一次提示：钱够就扣，不够给一句"看视频也行"，不弹失败页 */
    function useHintCoin() {
      var H = C.HINT, s = state.save;
      if ((s.coin || 0) < H.coinCost) { toast('巧币不足，看视频也能拿提示'); return; }
      if (!canTakeHint()) return;
      s.coin -= H.coinCost;
      persist();
      useHint();
    }

    /* 一块板是否已经"放对"（位置/角度/翻面都对）。提示选块与档3淡显都用它。 */
    function pieceSolved(p, st) {
      return !!p && p.onBoard &&
        Math.abs(p.x - st.x) <= 1 && Math.abs(p.y - st.y) <= 1 &&
        Math.abs(((p.angle - st.angle) % 360 + 540) % 360 - 180) <= 1 &&
        !!p.flipped === !!st.flipped;
    }
    /* v0.11：优先「还没上板的块」，其次是「上板但没放对的块」。
     * 旧版拿 solution[0] 兜底——当所有块都已上板（但没拼对）时会指到一块
     * 已经摆在棋盘上的板，托盘不亮、落点高亮又被板压住，玩家什么提示都看不见。 */
    function pickHintPiece() {
      var lv = LEVELS[state.levelIdx], i, st, p;
      for (i = 0; i < lv.solution.length; i++) {
        st = lv.solution[i]; p = pieceOf(st.id);
        if (!p || !p.onBoard) return st.id;
      }
      for (i = 0; i < lv.solution.length; i++) {
        st = lv.solution[i]; p = pieceOf(st.id);
        if (!pieceSolved(p, st)) return st.id;
      }
      return null;                      // 全部放对（理论上已判定通关）
    }

    function handleOverlayDown(x, y) {
      var h = hitTest(x, y);
      if (h && h.id) { state.press = h.id; }
      else if (state.overlay === 'settings') { /* 点遮罩不关闭，避免误触 */ }
      /* v0.42：按在邀请列表视口里 → 起一个拖动会话。按在行内按钮上也起，
       * 但移动超过阈值就会 turn 成滑动（见 onMove），不会既滑又点。 */
      if (state.overlay === 'invite') {
        var L0 = state.inviteList;
        if (L0 && x >= L0.x && x <= L0.x + L0.w && y >= L0.y && y <= L0.y + L0.h) {
          state.scrollDrag = { y0: y, s0: state.inviteScroll || 0, moved: false };
        }
      }
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
      /* 找板 v0.9：托盘改成散放后板件会互相压住，命中规则必须与绘制顺序一致 ——
       * 循环顺序 = 绘制顺序 = 后画在上层，所以「最后一个命中的」就是玩家看见的那块。
       * 旧版取「质心最近」，重叠时会选中被压住的下层板，是这次改动引入的新坑。 */
      var best = null;
      for (var i = 0; i < state.pieces.length; i++) {
        var p = state.pieces[i];
        var poly = p.onBoard ? piecePolyDesign(p) : trayPoly(p);
        if (!G.pointInPoly([x, y], poly)) continue;
        var sp0 = p.onBoard ? null : SLOT_POS[p.slot];
        var cx0 = p.onBoard ? w2d(p.x) : sp0.x;
        var cy0 = p.onBoard ? h2d(p.y) : sp0.y;
        best = { p: p, d: 0, sp: sp0, cx: cx0, cy: cy0 };
      }
      if (!best) {
        /* 兜底：细长/尖角块纯多边形命中太窄（小三角只有 91px 宽），
         * 托盘再给「质心 44px 内」一层圆形热区；已上板的板不参与（避免误选远处板）。 */
        for (var i2 = 0; i2 < state.pieces.length; i2++) {
          var p2 = state.pieces[i2];
          if (p2.onBoard) continue;
          var sp2 = SLOT_POS[p2.slot];
          var d2 = Math.hypot(x - sp2.x, y - sp2.y);
          if (d2 <= C.LAYOUT.MIN_HIT / 2 && (!best || d2 < best.d)) {
            best = { p: p2, d: d2, sp: sp2, cx: sp2.x, cy: sp2.y };
          }
        }
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
      state.dt = dt;                // v0.27：供背景粒子层按真实帧间隔推进
      /* v0.15：在线时长记账（只在前台；切后台由 init 里的 onHide 停表） */
      onlineTick(dt);
      if (state.page === 'play' && state.running && !state.overlay && !state.win) {
        state.elapsed += dt / 1000;
        /* v0.5 A：倒计时递减 → 映射生命值；归零即失败
         * v0.21：教学关冻结倒计时（freezeTimer）。新手第一关还要边学边拼，
         * 拿 90 秒逼他，只会让人在第一关就失败退游；这也是参考视频的做法。 */
        var tutFreeze = !!(state.tut && C.TUTORIAL.freezeTimer);
        if (state.timeLeft > 0 && !tutFreeze) {
          state.timeLeft = Math.max(0, state.timeLeft - dt / 1000);
          state.hearts = heartsOf(state.timeLeft, state.timeLimit || 1);
          if (state.timeLeft <= 0) failLevel();
        }
        /* v0.21 教学：每帧看"下一块还差什么"，全部放对就自动收尾 */
        if (state.tut) {
          state.tut.t += dt;
          var tstep = tutStep();
          /* 教"转"的时候先把那块选中 —— 旋转手柄只有选中才出现，
           * 不替玩家选上，他看到的就只是一句"拖住小圆点"，而小圆点根本不在。 */
          if (tstep && tstep.kind === 'rot' && state.selId !== tstep.id && !state.drag) {
            state.selId = tstep.id;
          }
          /* v0.24.1：只有"棋盘已经建好"时才允许判定教学完成。
           * tutStep() 在 solution 里的块一块都匹配不上时也会返回 null（找不到就 continue），
           * 若不卡这一道，教学会在第一帧被当作"全部放对"，静默收尾 —— 玩家看到的就是
           * "第 1 关教学莫名其妙没有了"。
           * v0.25：收尾只关本次教学，不落档；下次是否再教由"第 1 关通没通关"决定。 */
          var tutReady = state.pieces && state.pieces.length === DS.pieceOrder.length;
          if (!tstep && tutReady) {
            state.tut = null;
            toast('教学完成，剩下的自己来');
          }
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
      if (state.overlay === 'rank') state.rankT += dt;
      if (state.hint) {
        /* v0.20：没有计时器了 —— 提示一直亮着，直到被指的那块真的放对。
         * 放对就收工（不自动改指下一块：一次购买只换一步指引，
         * 否则买一次就能一路看完整关解法）。 */
        var hlv = LEVELS[state.levelIdx], hst = null;
        for (var hi = 0; hi < hlv.solution.length; hi++) {
          if (hlv.solution[hi].id === state.hint.id) hst = hlv.solution[hi];
        }
        if (hst && pieceSolved(pieceOf(hst.id), hst)) state.hint = null;
      }
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
    /* v0.14：按最大宽度截断（昵称最长 12 字，长名字不能压到右边的「改昵称」） */
    function textFit(str, x, y, size, color, align, weight, maxW) {
      var s = String(str === undefined || str === null ? '' : str);
      if (maxW && ctx.measureText) {
        ctx.font = font(size, weight);
        if (ctx.measureText(s).width > maxW) {
          while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
          s += '…';
        }
      }
      text(s, x, y, size, color, align, weight);
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
        /* v0.35：对局页工具栏换成「糖果按钮」——五枚各自带柔光底色 + 6px 厚底边，
         * 按下去整体下移 2px，像捏了一颗软糖。图标用同色系深一档的墨色，
         * 只有提示（灯泡）按用户要求固定是黄色。
         * b.tone 为空时仍走原来的白卡样式（主页入口、返回按钮都是白卡，
         * 那里不能变 —— 它们是"导航"，不是"操作玩具"）。 */
        if (b.tone) {
          var tn = b.tone;
          /* v0.38：夜间护眼 —— 奶油糖果底色在深色页面里是全屏最亮的一块，
           * 护眼模式下换成同色系的深色糖（图标仍保留亮色 accent，语义不变）。 */
          var dkT = !!state.darkSkin;
          var cx0 = b.x - b.w / 2, cy0 = b.y - b.h / 2 + dy;
          ctx.save();
          if (!dis) shadow(0, 7, dkT ? 'rgba(0,0,0,0.34)' : 'rgba(122,98,66,0.16)');
          var tg = ctx.createLinearGradient(0, cy0, 0, cy0 + b.h);
          tg.addColorStop(0, dis ? (dkT ? '#2A313D' : '#F8FAFD') : tn.bg1);
          tg.addColorStop(1, dis ? (dkT ? '#232A35' : '#EEF2F7') : tn.bg2);
          rr(cx0, cy0, b.w, b.h, 30);
          ctx.fillStyle = tg; ctx.fill();
          noShadow();
          ctx.save(); rr(cx0, cy0, b.w, b.h, 30); ctx.clip();
          /* 底部厚边：糖果的"厚度"，也是按下的视觉锚 */
          ctx.fillStyle = dis ? (dkT ? '#1C222C' : '#E4EAF1') : tn.edge;
          ctx.fillRect(cx0, cy0 + b.h - 6, b.w, 9);
          /* 左上柔光 */
          if (ctx.ellipse) {
            ctx.beginPath();
            ctx.ellipse(b.x - b.w * 0.06, cy0 + 15, b.w * 0.30, 9, 0, 0, Math.PI * 2);
            ctx.fillStyle = dkT ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.6)'; ctx.fill();
          }
          ctx.restore();
          drawIcon(b.icon, b.x, b.y + dy - 3,
            dis ? COL.disabledIcon : tn.ink, b.iconScale || 1.16);
          ctx.restore();
        } else {
          rr(x, y, b.w, b.h, 24);
          ctx.fillStyle = dis ? COL.disabledBg : COL.card;
          ctx.fill();
          ctx.lineWidth = 1.5; ctx.strokeStyle = dis ? COL.disabledBg : COL.cardEdge;
          ctx.stroke();
          noShadow();
          // v0.4 A3：翻转按钮 tip 汉字已删除，图标恢复满尺寸居中（v0.3.2 布局）
          drawIcon(b.icon, b.x, b.y + dy,
            dis ? COL.disabledIcon : COL.text, b.iconScale || 1);
        }
        if (b.badge) {
          /* v0.3 A3 角标（右上角小圆 + 数字）。
           * v0.22：数字从"档号"变成"道具个数"，可能是两位数（囤了 12 个），
           * 圆会放不下 → 改成右上角胶囊，宽度跟着文字走，>99 收敛成 99+。
           * 描一圈白边，压在卡片色上也能分清边界。 */
          var bt = String(b.badge);
          if (b.badge > 99) bt = '99+';
          ctx.save();
          ctx.font = font(16, '700');
          var tw = ctx.measureText ? ctx.measureText(bt).width : 20;
          var bw2 = Math.max(30, tw + 14), bh2 = 30;
          var bcy = b.y - b.h / 2 + 6 + bh2 / 2 + (pressed ? 2 : 0);
          var bcx = b.x + b.w / 2 - 6 - bw2 / 2;
          rr(bcx - bw2 / 2, bcy - bh2 / 2, bw2, bh2, bh2 / 2);
          ctx.fillStyle = COL.gold;
          ctx.fill();
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = 'rgba(255,255,255,0.95)';
          ctx.stroke();
          ctx.restore();
          text(bt, bcx, bcy + 1, 16, COL.btnText, 'center', '700');
        }
      } else if (b.variant === 'ghost') {
        /* v0.8：结算页第三排「重玩 / 回列表」用的无底文字按钮，只保留点击热区 */
        text(b.label, b.x, b.y + dy, b.size || 22, pressed ? COL.text : COL.textSub, 'center', '500');
      } else {
        // secondary
        rr(x, y, b.w, b.h, 20);
        ctx.fillStyle = b.disabled ? COL.disabledBg : COL.card; ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = b.disabled ? COL.disabledBg : COL.cardEdge; ctx.stroke();
        ctx.save(); rr(x, y, b.w, b.h, 20); ctx.clip();
        ctx.fillStyle = b.disabled ? COL.disabledBg : COL.cardEdge;
        ctx.fillRect(x, y + b.h - C.LAYOUT.BTN_EDGE + (pressed ? 2 : 0), b.w, C.LAYOUT.BTN_EDGE * 2);
        ctx.restore();
        // v0.8：secondary 也支持左侧图标（分享 / 排行榜），文字随之右移，避免压图标
        if (b.icon) drawIcon(b.icon, x + 46, b.y + dy, COL.text, 0.86);
        text(b.label, b.x + (b.icon ? 20 : 0), b.y + dy, b.size || 30,
          b.disabled ? COL.disabledIcon : COL.text, 'center', '500');
      }
      ctx.restore();
    }

    /* v0.28 图标重设计：货币 / 道具 / 入口图标改成「彩色徽章」质感（渐变 + 高光 + 暗描边），
     * 工具图标（返回/旋转/翻转/关闭等）维持线性风格不动，避免破坏操作语义。
     * 所有图标只依赖传入 color，不写死皮肤色，换肤自然跟随。 */
    function badgeDisc(rad, c1, c2, edge) {
      var g = ctx.createLinearGradient(-rad * 0.6, -rad, rad * 0.5, rad);
      g.addColorStop(0, c1); g.addColorStop(1, c2);
      ctx.beginPath(); ctx.arc(0, 0, rad, 0, Math.PI * 2);
      ctx.fillStyle = g; ctx.fill();
      ctx.lineWidth = 2.4; ctx.strokeStyle = edge || 'rgba(0,0,0,0.18)'; ctx.stroke();
      ctx.beginPath(); ctx.arc(-rad * 0.28, -rad * 0.32, rad * 0.34, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.42)'; ctx.fill();
    }
    function drawIcon(name, cx, cy, color, s) {
      s = s || 1;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(s, s);
      ctx.strokeStyle = color; ctx.fillStyle = color;
      ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      /* v0.37：旧 back 分支用的 r=22 已随细 chevron 一起删掉，这里不再留无用局部量。 */

      /* ---------- 彩色徽章系：巧币 / 体力 / 查找 / 排行榜 / 在线奖励 / 礼物 ---------- */
      if (name === 'coin') {
        /* 金币：三层同心 + 星形压印 + 高光，比原来的「圆+竖纹」更像收藏币 */
        badgeDisc(15.5, '#FFE07A', '#F5A623', 'rgba(150,90,10,0.55)');
        ctx.strokeStyle = 'rgba(150,90,10,0.42)'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#B86E12';
        ctx.beginPath();
        for (var ci = 0; ci < 10; ci++) {
          var ca = -Math.PI / 2 + ci * Math.PI / 5, cr = ci % 2 === 0 ? 6.6 : 2.9;
          var cxx = Math.cos(ca) * cr, cyy = Math.sin(ca) * cr;
          if (ci === 0) ctx.moveTo(cxx, cyy); else ctx.lineTo(cxx, cyy);
        }
        ctx.closePath(); ctx.fill();
      } else if (name === 'energy') {
        /* 体力：蓝色能量珠 + 白色闪电，闪电带深色描边更立体 */
        badgeDisc(15.5, '#8FE3FF', '#22A9E8', 'rgba(12,78,128,0.5)');
        ctx.beginPath();
        ctx.moveTo(3, -11); ctx.lineTo(-8, 1.5); ctx.lineTo(-1.5, 1.5);
        ctx.lineTo(-4, 11); ctx.lineTo(8.5, -2.5); ctx.lineTo(1.5, -2.5);
        ctx.closePath();
        ctx.lineWidth = 2.4; ctx.strokeStyle = '#0E6FA8'; ctx.stroke();
        ctx.fillStyle = '#FFFFFF'; ctx.fill();
      } else if (name === 'hint') {
        /* 查找道具（v0.35）：用户要求把放大镜换成**黄色灯泡**。
         * 结构从下往上：两道螺纹底座 → 玻璃球（黄渐变 + 深黄描边）→ 外圈光晕 → 左侧高光。
         * 光晕用径向渐变而不是描边，缩到 46px 也还是一颗"亮着的灯泡"。 */
        var by0 = -3.6;
        var glow = ctx.createRadialGradient(0, by0, 3, 0, by0, 21);
        glow.addColorStop(0, 'rgba(255,214,92,0.60)');
        glow.addColorStop(1, 'rgba(255,214,92,0)');
        ctx.beginPath(); ctx.arc(0, by0, 21, 0, Math.PI * 2);
        ctx.fillStyle = glow; ctx.fill();
        /* 玻璃球：上 3/4 圆 + 收口到颈部 */
        ctx.beginPath();
        ctx.arc(0, by0, 10.6, Math.PI * 0.80, Math.PI * 2.20);
        ctx.quadraticCurveTo(8.2, by0 + 11, 4.6, 10.4);
        ctx.lineTo(-4.6, 10.4);
        ctx.quadraticCurveTo(-8.2, by0 + 11, -8.4, by0 + 9.6);
        ctx.closePath();
        var bg2 = ctx.createLinearGradient(-9, -12, 7, 12);
        bg2.addColorStop(0, '#FFE888'); bg2.addColorStop(0.55, '#FFCC4D'); bg2.addColorStop(1, '#F5A623');
        ctx.fillStyle = bg2; ctx.fill();
        ctx.lineWidth = 2.2; ctx.strokeStyle = '#D9861A'; ctx.stroke();
        /* 螺纹底座 */
        ctx.lineWidth = 2.4; ctx.strokeStyle = '#C57C16';
        ctx.beginPath(); ctx.moveTo(-4.8, 14.2); ctx.lineTo(4.8, 14.2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-4.0, 18.0); ctx.lineTo(4.0, 18.0); ctx.stroke();
        /* 高光 */
        ctx.beginPath(); ctx.arc(-3.6, by0 - 3.4, 3.1, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill();
      } else if (name === 'rank') {
        /* 排行榜：奖杯（杯身 + 双耳 + 底座），替换原三根柱子 */
        ctx.lineWidth = 3; ctx.strokeStyle = shadeHex(color, -0.18);
        ctx.beginPath(); ctx.moveTo(-9, -11); ctx.lineTo(9, -11);
        ctx.lineTo(6, -1); ctx.quadraticCurveTo(0, 5, -6, -1); ctx.closePath();
        ctx.fillStyle = hexA(color, 0.42); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(-11, -7, 4, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
        ctx.beginPath(); ctx.arc(11, -7, 4, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(0, 10); ctx.stroke();
        ctx.lineWidth = 3.6; ctx.beginPath(); ctx.moveTo(-9, 12); ctx.lineTo(9, 12); ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(0, -6, 2.4, 0, Math.PI * 2); ctx.fill();
      } else if (name === 'online' || name === 'gift') {
        /* 在线奖励/礼物：礼盒 + 丝带蝴蝶结 + 点点闪光 */
        ctx.fillStyle = hexA(color, 0.30);
        ctx.strokeStyle = shadeHex(color, -0.2); ctx.lineWidth = 2.6;
        rr(-13, -6, 26, 17, 3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = hexA(color, 0.46);
        rr(-15, -10, 30, 6, 2); ctx.fill(); ctx.stroke();
        ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, 11); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -10); ctx.quadraticCurveTo(-12, -20, -7, -11); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -10); ctx.quadraticCurveTo(12, -20, 7, -11); ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(9, 1, 2, 0, Math.PI * 2); ctx.fill();
      } else if (name === 'gear') {
        /* 设置：真齿轮 + 中心孔，加一圈浅色高光环 */
        ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2);
        ctx.strokeStyle = shadeHex(color, -0.12); ctx.lineWidth = 3.4; ctx.stroke();
        ctx.fillStyle = color;
        for (var gi = 0; gi < 8; gi++) {
          ctx.save(); ctx.rotate(gi * Math.PI / 4);
          rr(-3.4, -16.5, 6.8, 7, 2); ctx.fill();
          ctx.restore();
        }
        ctx.beginPath(); ctx.arc(0, 0, 3.8, 0, Math.PI * 2);
        ctx.fillStyle = hexA(color, 0.35); ctx.fill();
        ctx.strokeStyle = shadeHex(color, -0.2); ctx.lineWidth = 2.4; ctx.stroke();
      } else if (name === 'heart') {
        /* 生命心：渐变 + 高光点 */
        var hg = ctx.createLinearGradient(0, -12, 0, 12);
        hg.addColorStop(0, shadeHex(color, 0.28)); hg.addColorStop(1, color);
        ctx.beginPath();
        ctx.moveTo(0, 14);
        ctx.bezierCurveTo(-21, -2, -14, -17, 0, -7);
        ctx.bezierCurveTo(14, -17, 21, -2, 0, 14);
        ctx.closePath(); ctx.fillStyle = hg; ctx.fill();
        ctx.beginPath(); ctx.arc(-5, -5, 2.6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.62)'; ctx.fill();
      } else if (name === 'invite') {
        /* 邀请有礼：两个人形 + 中间心 */
        ctx.lineWidth = 3; ctx.strokeStyle = shadeHex(color, -0.15);
        ctx.beginPath(); ctx.arc(-8, -7, 5, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(8, -7, 5, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(-8, 15, 10, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke();
        ctx.beginPath(); ctx.arc(8, 15, 10, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke();
        ctx.fillStyle = '#FF6B8A';
        ctx.beginPath(); ctx.moveTo(0, 2);
        ctx.bezierCurveTo(-7, -4, -4, -9, 0, -5);
        ctx.bezierCurveTo(4, -9, 7, -4, 0, 2); ctx.closePath(); ctx.fill();
      } else if (name === 'skin') {
        /* 皮肤：调色盘 + 三色颜料点 */
        ctx.lineWidth = 3; ctx.strokeStyle = shadeHex(color, -0.15);
        if (ctx.ellipse) { ctx.beginPath(); ctx.ellipse(0, 0, 17, 13, 0, 0, Math.PI * 2); ctx.stroke(); }
        else { ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.stroke(); }
        var dots = ['#FF6B6B', '#4FA8E0', '#63C88B'];
        for (var di = 0; di < 3; di++) {
          ctx.beginPath(); ctx.arc(-7 + di * 8, -3 + (di === 1 ? -4 : 0), 3, 0, Math.PI * 2);
          ctx.fillStyle = dots[di]; ctx.fill();
        }
      } else if (name === 'back') {
        /* v0.37：可爱风圆滚滚的「←」——粗描边、圆头圆角、带一条短尾巴，
         * 配糖果底返回按钮；与工具栏的 rotL/rotR/flip/restart 一眼可分。
         * 坐标是固定小尺寸（±12），由 drawIcon 的 s 与按钮的 iconScale 一起缩放。 */
        ctx.lineWidth = 5.2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(6.5, -12); ctx.lineTo(-8, 0); ctx.lineTo(6.5, 12);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-6.5, 0); ctx.lineTo(9, 0);
        ctx.stroke();
      } else if (name === 'rotL' || name === 'rotR') {
        /* v0.35：圆环箭头重画（可爱版）—— 粗描边 + 圆头 + 实心胖箭头。
         * 两枚的箭头都落在**正上方**（这样并排时一眼能比方向）：
         *   顺时针箭头朝右（↻）、逆时针箭头朝左（↺）；
         *   缺口 70° 分别镜像到右上 / 左上。
         * 踩过的坑：逆时针若照顺时针那组角度反扫，扫过的是整圈 360°，
         * 环会闭合、缺口和箭头一起消失。 */
        var cw = name === 'rotR';
        var R2 = 12.4, TH = -Math.PI * 0.5;
        ctx.lineWidth = 5.2; ctx.lineCap = 'round';
        ctx.beginPath();
        if (cw) ctx.arc(0, 0, R2, TH + Math.PI * 0.39, TH + Math.PI * 2, false);
        else ctx.arc(0, 0, R2, TH - Math.PI * 0.39, TH - Math.PI * 2, true);
        ctx.stroke();
        ctx.save();
        ctx.translate(0, -R2);
        if (!cw) ctx.rotate(Math.PI);
        ctx.beginPath();
        ctx.moveTo(7.6, 0); ctx.lineTo(-5.6, -6.4); ctx.lineTo(-2.2, 0); ctx.lineTo(-5.6, 6.4);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      } else if (name === 'flip') {
        /* v0.35：左右翻转（可爱版）—— 上下两支粗圆头箭头反向指，
         * 笔画加粗、箭头放大。原来的中间虚线轴在 46px 下会压住箭头，
         * 反而读成"两条虚线"，已去掉。 */
        ctx.lineWidth = 5; ctx.lineCap = 'round';
        /* 上排向右 */
        ctx.beginPath(); ctx.moveTo(-13, -7.5); ctx.lineTo(10, -7.5); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(14, -7.5); ctx.lineTo(5.4, -12.6); ctx.lineTo(5.4, -2.4);
        ctx.closePath(); ctx.fill();
        /* 下排向左 */
        ctx.beginPath(); ctx.moveTo(13, 7.5); ctx.lineTo(-10, 7.5); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-14, 7.5); ctx.lineTo(-5.4, 2.4); ctx.lineTo(-5.4, 12.6);
        ctx.closePath(); ctx.fill();
      } else if (name === 'restart') {
        /* v0.35：刷新（可爱版）—— 双箭头圆环（⟳），两个头都朝顺时针。
         * 不能再画成单箭头圆环：那和两枚旋转按钮长得几乎一样，玩家分不清
         * "转 90°" 和 "整盘重来"。 */
        var R3 = 12.4;
        ctx.lineWidth = 5; ctx.lineCap = 'round';
        var arcs = [[Math.PI * 0.55, Math.PI * 1.45], [Math.PI * 1.55, Math.PI * 2.45]];
        for (var ai = 0; ai < 2; ai++) {
          ctx.beginPath();
          ctx.arc(0, 0, R3, arcs[ai][0], arcs[ai][1], false);
          ctx.stroke();
          var hEnd = arcs[ai][1];
          ctx.save();
          ctx.translate(Math.cos(hEnd) * R3, Math.sin(hEnd) * R3);
          ctx.rotate(Math.atan2(Math.cos(hEnd), -Math.sin(hEnd)));
          ctx.beginPath();
          ctx.moveTo(7.2, 0); ctx.lineTo(-5.4, -6.0); ctx.lineTo(-2.1, 0); ctx.lineTo(-5.4, 6.0);
          ctx.closePath(); ctx.fill();
          ctx.restore();
        }
      } else if (name === 'lock') {
        ctx.lineWidth = 3.5;
        rr(-11, -2, 22, 18, 4); ctx.fill();
        ctx.beginPath();
        ctx.arc(0, -3, 7, Math.PI, 0);
        ctx.stroke();
      } else if (name === 'desktop') {
        ctx.lineWidth = 3;
        rr(-10, -17, 17, 34, 4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-6, 12); ctx.lineTo(-1, 12); ctx.stroke();
        ctx.lineWidth = 2.6;
        rr(9, -6, 7, 7, 1.6); ctx.stroke();
        rr(9, 3, 7, 7, 1.6); ctx.stroke();
        rr(9, 12, 7, 7, 1.6); ctx.stroke();
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
        var py = DH() * s[1] + Math.cos(t * (0.33 + i * 0.08) + s[3]) * 104;
        var r = C.DESIGN.w * s[2] * (1 + 0.07 * Math.sin(t * 0.55 + i));
        var gr = ctx.createRadialGradient(px, py, r * 0.10, px, py, r);
        /* v0.38：夜间护眼是深底，原亮度会把屏幕照出一块暖白，护眼失去意义 —— 整体减半 */
        var ga = state.darkSkin ? 0.5 : 1;
        gr.addColorStop(0, 'rgba(255,244,214,' + (0.34 * ga).toFixed(3) + ')');
        gr.addColorStop(0.55, 'rgba(255,232,190,' + (0.12 * ga).toFixed(3) + ')');
        gr.addColorStop(1, 'rgba(255,232,190,0)');
        ctx.fillStyle = gr;
        ctx.fillRect(0, 0, C.DESIGN.w, DH());
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
      /* v0.38：夜间护眼深底上白光带会显眼，压到 0.05 只留一丝流动感 */
      lg.addColorStop(0.5, 'rgba(255,255,255,' + (state.darkSkin ? '0.05' : '0.12') + ')');
      lg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(-260, -C.DESIGN.h, 520, C.DESIGN.h * 3);
      ctx.restore();
    }

    /* ================= v0.27 主页动态背景特效系统（纯 Canvas，零素材） =================
     * 设计目标：让主页「一眼看出是活的」——粒子持续运动 + 主题化视觉。
     * 工程约束：
     *   ① 粒子惰性初始化并按当前皮肤主色着色，换肤/换特效时重建（fxParts=null）；
     *   ② 低帧率（lowFps）减半粒子、关闭逐帧渐变开销；reduceMotion 全停；
     *   ③ 只用设计坐标 (750×1624)，不写 hits、不吞点击；
     *   ④ 六套特效共用一份粒子缓存结构，靠 eff 分支绘制，避免为每套存一份状态。 */

    function fxRnd(seed) {                       // 确定性伪随机（粒子生成用，避免 Math.random 抖动）
      var x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
      return x - Math.floor(x);
    }

    function buildFxParts(key) {
      var P = (C.BG_FX_PARTS && C.BG_FX_PARTS[key]) || {};
      var mode = C.BG_FX[key] ? C.BG_FX[key].mode : 'glow';
      var pal = ['#FF8A5B', '#4FA8E0', '#63C88B', '#A87BE8', '#D96A9B', '#FFC53D', '#3FB8B0'];
      var out = { mode: mode, items: [], t: 0, lastShoot: 0 };
      var i, r1, r2, r3;
      if (mode === 'aurora') {
        var bands = P.bands || 4;
        for (i = 0; i < bands; i++) {
          out.items.push({ phase: fxRnd(i + 1) * 6.28, y: 0.26 + i * 0.16,
            hue: i, speed: (P.speed || 0.085) * (0.8 + fxRnd(i + 7) * 0.5) });
        }
      } else if (mode === 'stars') {
        var n = P.count || 64;
        for (i = 0; i < n; i++) {
          r1 = fxRnd(i * 3 + 1); r2 = fxRnd(i * 3 + 2); r3 = fxRnd(i * 3 + 3);
          out.items.push({ x: r1 * C.DESIGN.w, y: r2 * DH(),
            r: 1 + r3 * 2.4, ph: r1 * 6.28, sp: 0.6 + r2 * 1.4, big: r3 > 0.94 });
        }
        out.shoot = null;
      } else if (mode === 'bubbles' || mode === 'petals' || mode === 'geometric' ||
                 mode === 'snow' || mode === 'firefly') {
        var cnt = P.count || 22;
        for (i = 0; i < cnt; i++) {
          r1 = fxRnd(i * 4 + 1); r2 = fxRnd(i * 4 + 2); r3 = fxRnd(i * 4 + 3);
          var r4 = fxRnd(i * 4 + 4);
          out.items.push({
            x: r1 * C.DESIGN.w, y: r2 * DH(),
            size: mode === 'bubbles' ? (10 + r3 * 34)
                : mode === 'firefly' ? (2 + r3 * 4.5)
                : mode === 'snow' ? (4.5 + r3 * 9) : (10 + r3 * 16),
            sp: mode === 'firefly' ? (10 + r4 * 24)
              : mode === 'snow' ? (28 + r4 * 46) : (18 + r4 * 42),
            ph: r1 * 6.28, sway: mode === 'snow' ? (20 + r3 * 34) : (12 + r3 * 26),
            color: mode === 'firefly' ? (r3 > 0.5 ? '#C8FF7A' : '#FFE98A')
                 : mode === 'snow' ? '#FFFFFF' : pal[i % pal.length],
            spin: (r2 - 0.5) * 2.2,
            rot: r3 * 6.28,
            shape: i % 3
          });
        }
      } else if (mode === 'rain') {
        var rn = P.count || 60;
        for (i = 0; i < rn; i++) {
          r1 = fxRnd(i * 3 + 1); r2 = fxRnd(i * 3 + 2); r3 = fxRnd(i * 3 + 3);
          out.items.push({ x: r1 * C.DESIGN.w, y: r2 * DH(),
            len: 22 + r3 * 46, sp: 480 + r3 * 560, ph: r1 * 6.28,
            alpha: 0.18 + r2 * 0.36, sway: r1 * 6 });
        }
      } else if (mode === 'nebula') {
        var cn = P.clouds || 6;
        for (i = 0; i < cn; i++) {
          r1 = fxRnd(i * 3 + 1); r2 = fxRnd(i * 3 + 2); r3 = fxRnd(i * 3 + 3);
          out.items.push({ x: r1 * C.DESIGN.w, y: r2 * DH(),
            r: 160 + r3 * 240, ph: r1 * 6.28, speed: 0.10 + r2 * 0.14,
            color: ['#7B5CE8', '#3E7FE0', '#C451D6', '#4BC6E8', '#9B6BFF', '#E85C9E'][i % 6] });
        }
      }
      return out;
    }

    /* intensity：主页 1、关卡 / 对局 0.55（局内收敛，不抢拼图注意力）。
     * v0.28：① 深色特效自己铺一层夜空底（对局白卡之下仍可见）；② 粒子整体加浓；
     *        ③ 新增 snow / rain / firefly / nebula 四套，全部纯 Canvas。 */
    function drawFxLayer(tSec, dtMs, intensity) {
      var key = state.save.bgFx || 'classic';
      var def = C.BG_FX && C.BG_FX[key];
      if (!def || def.mode === 'glow') return;    // classic 沿用原 drawHomeGlow，不叠加粒子
      var inten = (intensity === undefined ? 1 : intensity);
      if (state.reduceMotion) {
        /* 减少动效：深色背景仍要铺（否则配色错乱），但不画任何粒子 */
        if (def.dark) drawFxDarkBase(def.mode);
        return;
      }
      if (!state.fxParts || state.fxParts.mode !== def.mode) state.fxParts = buildFxParts(key);
      var F = state.fxParts;
      var low = !!state.lowFps;
      var n = F.items.length;
      var W = C.DESIGN.w, H = DH();          // v0.31：粒子按真实可用高度分布，细长屏也铺满
      var dt = Math.min(0.05, dtMs / 1000);
      F.t += dt;

      ctx.save();
      if (def.dark) drawFxDarkBase(def.mode);
      if (def.mode === 'aurora') {
        ctx.globalCompositeOperation = 'source-over';
        for (var a = 0; a < n; a++) {
          var b = F.items[a];
          var cx = W * (0.14 + a * 0.19) + Math.sin(F.t * b.speed * 6 + b.phase) * W * 0.19;
          var cw = W * (0.40 + 0.08 * Math.sin(F.t * 0.4 + a));
          var cy = H * b.y + Math.cos(F.t * 0.3 + b.phase) * 100;
          var col = ['#FFB38A', '#8EC9F5', '#9BE3C4', '#C6A8F2', '#FFD166'][a % 5];
          var gr = ctx.createRadialGradient(cx, cy, 10, cx, cy, cw);
          gr.addColorStop(0, hexA(col, 0.42 * inten));
          gr.addColorStop(0.5, hexA(col, 0.22 * inten));
          gr.addColorStop(1, hexA(col, 0));
          ctx.fillStyle = gr;
          ctx.fillRect(cx - cw, cy - cw, cw * 2, cw * 2);
        }
      } else if (def.mode === 'nebula') {
        /* 星云：多团大半径彩色雾，缓慢公转 + 呼吸，深紫夜空上非常显眼 */
        for (var q = 0; q < n; q++) {
          var cl = F.items[q];
          var ang = cl.ph + F.t * cl.speed;
          var nx = W / 2 + Math.cos(ang) * (W * 0.26) + (cl.x - W / 2) * 0.42;
          var ny = H * 0.42 + Math.sin(ang) * (H * 0.16) + (cl.y - H / 2) * 0.34;
          var pulse = 1 + 0.16 * Math.sin(F.t * 0.7 + cl.ph);
          var rr = cl.r * pulse;
          var ng = ctx.createRadialGradient(nx, ny, 8, nx, ny, rr);
          ng.addColorStop(0, hexA(cl.color, 0.44 * inten));
          ng.addColorStop(0.45, hexA(cl.color, 0.24 * inten));
          ng.addColorStop(1, hexA(cl.color, 0));
          ctx.fillStyle = ng; ctx.fillRect(nx - rr, ny - rr, rr * 2, rr * 2);
        }
        /* 星云里叠一层细星点，避免只有雾 */
        var sn = low ? 26 : 52;
        for (var si = 0; si < sn; si++) {
          var sx = fxRnd(si * 7 + 1) * W, sy = fxRnd(si * 7 + 2) * H;
          var stw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(F.t * 1.6 + si));
          ctx.globalAlpha = stw * 0.9 * inten; ctx.fillStyle = '#EAF0FF';
          ctx.beginPath(); ctx.arc(sx, sy, si % 9 === 0 ? 2.8 : 1.3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      } else if (def.mode === 'stars') {
        for (var s = 0; s < n; s++) {
          var st = F.items[s];
          var tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(F.t * st.sp * 2 + st.ph));
          ctx.globalAlpha = tw * (st.big ? 1 : 0.85) * inten;
          ctx.fillStyle = st.big ? '#FFF4C8' : '#FFFFFF';
          ctx.beginPath();
          ctx.arc(st.x, st.y, st.r * (st.big ? 1.5 : 1), 0, Math.PI * 2);
          ctx.fill();
          if (st.big) {
            ctx.globalAlpha = tw * 0.42 * inten;
            ctx.fillRect(st.x - st.r * 5, st.y - 0.7, st.r * 10, 1.4);
            ctx.fillRect(st.x - 0.7, st.y - st.r * 5, 1.4, st.r * 10);
          }
        }
        ctx.globalAlpha = 1;
        var gap = (C.BG_FX_PARTS.stars && C.BG_FX_PARTS.stars.shootGap) || 4800;
        if (F.t * 1000 - F.lastShoot > gap && !F.shoot) {
          F.shoot = { t: 0, x: W * (0.1 + fxRnd(F.t | 0) * 0.5), y: -40, len: 150 + fxRnd(F.t) * 110 };
        }
        if (F.shoot) {
          F.shoot.t += dt;
          F.shoot.x += 340 * dt; F.shoot.y += 480 * dt;
          var sp = F.shoot;
          var g2 = ctx.createLinearGradient(sp.x - sp.len, sp.y - sp.len * 1.4, sp.x, sp.y);
          g2.addColorStop(0, 'rgba(255,255,255,0)');
          g2.addColorStop(1, 'rgba(255,244,200,0.95)');
          ctx.strokeStyle = g2; ctx.lineWidth = 3; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(sp.x - sp.len, sp.y - sp.len * 1.4); ctx.lineTo(sp.x, sp.y); ctx.stroke();
          if (sp.t > 2.2 || sp.y > H + 200) { F.shoot = null; F.lastShoot = F.t * 1000; }
        }
      } else if (def.mode === 'rain') {
        /* 雨丝：斜向短线快速下落，深/浅底都靠 alpha 适配 */
        var stepR = low ? 2 : 1;
        ctx.lineCap = 'round';
        for (var ri = 0; ri < n; ri += stepR) {
          var dr = F.items[ri];
          var ry = ((dr.y + F.t * dr.sp) % (H + 200)) - 100;
          var rx = dr.x + dr.sway;
          ctx.globalAlpha = dr.alpha * inten;
          ctx.strokeStyle = state.darkFx ? 'rgba(196,220,255,0.9)' : 'rgba(120,160,210,0.75)';
          ctx.lineWidth = dr.len > 52 ? 2.2 : 1.5;
          ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - dr.len * 0.28, ry + dr.len); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      } else if (def.mode === 'bubbles' || def.mode === 'petals' || def.mode === 'geometric' ||
                 def.mode === 'snow' || def.mode === 'firefly') {
        var step = low ? 2 : 1;
        for (var i = 0; i < n; i += step) {
          var it = F.items[i];
          var yy, xx;
          if (def.mode === 'bubbles') {
            yy = ((it.y - F.t * it.sp) % (H + 120) + (H + 120)) % (H + 120) - 60;
            xx = it.x + Math.sin(F.t * 0.8 + it.ph) * it.sway;
            ctx.globalAlpha = 0.46 * inten;
            ctx.strokeStyle = 'rgba(255,255,255,0.92)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(xx, yy, it.size, 0, Math.PI * 2); ctx.stroke();
            var bg = ctx.createRadialGradient(xx - it.size * 0.3, yy - it.size * 0.3, 1, xx, yy, it.size);
            bg.addColorStop(0, 'rgba(255,255,255,0.55)');
            bg.addColorStop(0.7, hexA(it.color, 0.16));
            bg.addColorStop(1, hexA(it.color, 0.34));
            ctx.fillStyle = bg;
            ctx.beginPath(); ctx.arc(xx, yy, it.size - 1, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 0.72 * inten; ctx.fillStyle = '#FFFFFF';
            ctx.beginPath(); ctx.arc(xx - it.size * 0.32, yy - it.size * 0.32, Math.max(1.5, it.size * 0.14), 0, Math.PI * 2); ctx.fill();
          } else if (def.mode === 'petals') {
            yy = ((it.y + F.t * it.sp * 0.6) % (H + 100) + (H + 100)) % (H + 100) - 50;
            xx = it.x + Math.sin(F.t * 0.9 + it.ph) * it.sway;
            ctx.globalAlpha = 0.72 * inten;
            ctx.save(); ctx.translate(xx, yy); ctx.rotate(it.rot + F.t * it.spin);
            ctx.fillStyle = hexA(it.color, 0.92);
            petalPath(ctx, it.size * 1.2); ctx.fill();
            ctx.restore();
          } else if (def.mode === 'snow') {
            yy = ((it.y + F.t * it.sp) % (H + 100) + (H + 100)) % (H + 100) - 50;
            xx = it.x + Math.sin(F.t * 1.1 + it.ph) * it.sway;
            ctx.globalAlpha = 0.92 * inten; ctx.fillStyle = '#FFFFFF';
            ctx.shadowColor = 'rgba(120,165,215,0.85)'; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.arc(xx, yy, it.size * 0.5, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            /* 冷色细描边：浅色背景上白点也有轮廓，雪才看得清 */
            ctx.strokeStyle = 'rgba(140,175,215,0.5)'; ctx.lineWidth = 1.2; ctx.stroke();
            if (it.size > 8) {
              ctx.globalAlpha = 0.5 * inten; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1;
              ctx.beginPath(); ctx.moveTo(xx - it.size, yy); ctx.lineTo(xx + it.size, yy);
              ctx.moveTo(xx, yy - it.size); ctx.lineTo(xx, yy + it.size); ctx.stroke();
            }
          } else if (def.mode === 'firefly') {
            yy = it.y + Math.sin(F.t * 0.5 + it.ph) * 40;
            xx = it.x + Math.sin(F.t * 0.8 + it.ph * 1.6) * it.sway;
            var fg = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(F.t * 2.2 + it.ph * 3));
            ctx.globalAlpha = fg * inten;
            ctx.fillStyle = it.color; ctx.shadowColor = it.color; ctx.shadowBlur = 16;
            ctx.beginPath(); ctx.arc(xx, yy, it.size, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
          } else { // geometric
            yy = ((it.y - F.t * it.sp * 0.5) % (H + 120) + (H + 120)) % (H + 120) - 60;
            xx = it.x + Math.sin(F.t * 0.7 + it.ph) * it.sway;
            ctx.globalAlpha = 0.42 * inten;
            ctx.save(); ctx.translate(xx, yy); ctx.rotate(it.rot + F.t * it.spin * 0.5);
            ctx.fillStyle = hexA(it.color, 0.95);
            var sz = it.size * 1.15;
            ctx.beginPath();
            if (it.shape === 0) { ctx.moveTo(-sz, sz * 0.6); ctx.lineTo(sz, sz * 0.6); ctx.lineTo(0, -sz); }
            else if (it.shape === 1) { ctx.rect(-sz * 0.7, -sz * 0.7, sz * 1.4, sz * 1.4); }
            else { ctx.moveTo(-sz, sz * 0.5); ctx.lineTo(sz * 0.6, sz * 0.5); ctx.lineTo(sz, -sz * 0.5); ctx.lineTo(-sz * 0.6, -sz * 0.5); }
            ctx.closePath(); ctx.fill();
            ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.stroke();
            ctx.restore();
          }
        }
        ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      }
      ctx.restore();
    }

    /* 深色夜空底：深蓝 / 深紫渐变 + 顶部微光，铺在粒子之下、卡片之下 */
    function drawFxDarkBase(mode) {
      var W = C.DESIGN.w, H = DH();
      var g = ctx.createLinearGradient(0, 0, W * 0.3, H);
      if (mode === 'nebula') {
        g.addColorStop(0, '#1A1038'); g.addColorStop(0.55, '#120E2C'); g.addColorStop(1, '#070A1C');
      } else if (mode === 'firefly') {
        g.addColorStop(0, '#0C2230'); g.addColorStop(0.55, '#091C26'); g.addColorStop(1, '#05121A');
      } else {
        g.addColorStop(0, '#16234A'); g.addColorStop(0.55, '#0E1732'); g.addColorStop(1, '#070B1C');
      }
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      var rg = ctx.createRadialGradient(W * 0.5, H * 0.12, 20, W * 0.5, H * 0.12, H * 0.62);
      rg.addColorStop(0, 'rgba(150,180,255,0.14)'); rg.addColorStop(1, 'rgba(150,180,255,0)');
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    }

    function petalPath(c, s) {
      c.beginPath();
      c.moveTo(0, -s);
      c.bezierCurveTo(s * 0.9, -s * 0.5, s * 0.9, s * 0.6, 0, s);
      c.bezierCurveTo(-s * 0.9, s * 0.6, -s * 0.9, -s * 0.5, 0, -s);
      c.closePath();
    }

    /* #RRGGBB + alpha → rgba()，供粒子层复用（避免每处手写颜色字符串） */
    function hexA(hex, a) {
      var h = hex.replace('#', '');
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      var v = parseInt(h, 16);
      return 'rgba(' + ((v >> 16) & 255) + ',' + ((v >> 8) & 255) + ',' + (v & 255) + ',' + a + ')';
    }

    function drawBg(withArt) {
      /* v0.6 底纹动效（纯 Canvas，零素材），两条背景路径共用：
       * 1) 有底图时做 Ken Burns——1.035 倍 + ±10px 极缓平移，静止底图有呼吸感；
       * 2) 光斑层 drawHomeGlow 单独叠在最后，素材缺失走渐变兜底时同样有流动的光。
       * reduceMotion 全停，与鲜花动效同一开关；drawBg(false)（关卡页）不加光效。 */
      var fx = withArt && !state.reduceMotion;
      var t = state.time / 1000;
      /* v0.38：夜间护眼（深色皮肤）**不再铺米色桌面底图** —— 一张浅色照片靠色罩压暗
       * 只会得到灰蒙蒙的脏色，护眼也做不到。深色皮肤直接走渐变分支，用皮肤自己的
       * bgTop/bg/bgDeep 三层铺夜景，纹理交给背景特效粒子层。 */
      var img = withArt && !state.darkSkin && env.images && env.images.home_bg_desk;
      var bgh = DH();        // v0.31：底图/渐变铺到真实可用高度，细长屏不留边
      if (img) {
        var sc = Math.max(C.DESIGN.w / (img.width || 1), bgh / (img.height || 1)) * (fx ? 1.06 : 1);
        var dw = (img.width || 1) * sc, dh = (img.height || 1) * sc;
        var dx = (C.DESIGN.w - dw) / 2 + (fx ? Math.sin(t * 0.26) * 22 : 0);
        var dy = (bgh - dh) / 2 + (fx ? Math.cos(t * 0.19) * 18 : 0);
        ctx.drawImage(img, dx, dy, dw, dh);
        /* v0.5：皮肤色罩——主界面用固定背景图，不叠罩则换肤几乎看不出 */
        if (COL.tint) { ctx.fillStyle = COL.tint; ctx.fillRect(0, 0, C.DESIGN.w, bgh); }
      } else {
        var g = ctx.createLinearGradient(0, 0, 0, bgh);
        g.addColorStop(0, COL.bgTop || COL.card || '#FBF3E6');   // v0.5：随皮肤变化
        g.addColorStop(0.45, COL.bg);
        g.addColorStop(1, COL.bgDeep);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, C.DESIGN.w, bgh);
        // 左上柔光（v0.38：夜间护眼是深底，0.85 白会糊出一大块亮斑，压到 0.10）
        var rg = ctx.createRadialGradient(180, 180, 20, 180, 180, 620);
        var la = state.darkSkin ? 0.10 : 0.85;
        rg.addColorStop(0, 'rgba(255,255,255,' + la + ')');
        rg.addColorStop(0.55, 'rgba(255,255,255,' + (la * 0.26).toFixed(3) + ')');
        rg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, C.DESIGN.w, bgh);
        /* v0.3.1 A1：删除原「极淡木纹」9 条横向贝塞尔线——
         * 关卡页 drawBg(false) 走渐变分支，这些线在米色底上形成贯穿横条，
         * 用户反馈「布局错乱」。保留渐变 + 左上柔光即可。 */
      }
      if (fx) drawHomeGlow(t, !!state.lowFps);
    }

    /* ---------------- 主界面 ---------------- */
    /* v0.31 主页竖向布局：底部三件套（继续 / 两套入口 / 星数）锚在安全区上方。
     * 抽成函数是为了让 verify_v06 / verify_tangram7 直接取运行时坐标 ——
     * 以前它们抄 CFG.LAYOUT.HOME 的固定值，布局一自适应就会点空。 */
    function homeLayout() {
      var HL = C.LAYOUT.HOME;
      var bottom = Math.max(140, (view.safeBottom || 0) + 40);
      var starY = DH() - bottom;
      /* v0.38：用户要求「把开始游戏的按钮放到关卡下面去」——
       * 竖向顺序由 继续 → 四巧板 → 七巧板 改成 四巧板 → 七巧板 → 开始 → 星数。
       * 间距：七巧板→开始 126（按钮半高 54 + 净空）、四巧板→七巧板 118（卡片高 100 + 净空）。 */
      var startY = starY - 86;
      var set7Y = startY - (HL.startGap || 126);
      var set4Y = set7Y - (HL.setGap || 118);
      return { starY: starY, set7Y: set7Y, set4Y: set4Y, startY: startY,
        shift: Math.max(0, startY - HL.startY) };
    }

    function renderHome() {
      drawBg(true);
      /* v0.27：背景特效粒子层——画在底图之上、标题/装饰之下，不写热区不吞点击。
       * 位置刻意放在 drawBg 之后，让粒子浮在木纹/色罩之上但不遮 UI（后续 UI 更高层）。 */
      drawFxLayer(state.time / 1000, state.dt || 16);
      var t = state.time / 1000;
      var float = Math.sin(t * 1.4) * 3;

      /* v0.31 底部锚定（vivo X200s 2.222:1 等细长屏）：
       * 设计稿 1624 高、星数行固定在 1360，本身就留了 264 的底部空白；
       * 再加上全面屏多出的高度（本机 42.7），合成截图里就是一大片空地。
       * 现在把「继续 / 四巧板 / 七巧板 / 星数」整组锚在安全区上方，
       * 多出来的高度由这组按钮吃掉；装饰帆船按位移的 45% 跟着下移，
       * 让上半屏与按钮之间的气口保持不变，不会上头挤、下头空。
       * 坐标由 homeLayout() 统一算 —— 验收脚本读同一个函数，不再抄死数字。 */
      var HL = homeLayout();
      var starY = HL.starY, set7Y = HL.set7Y, set4Y = HL.set4Y, startY = HL.startY;
      var homeShift = HL.shift;

      /* v0.6：标题 / 副标题 / 装饰恒定，不随数据集联动。
       * 旧版标题写死「四巧 · 七巧」、装饰取当前数据集头 4 块，
       * 在下面点「七巧板」后上面 logo 跟着变，用户误以为点错了按钮。 */
      /* v0.27 标题视觉增强：柔和外发光 + 浅色描边 + 轻微缩放呼吸，
       * 让品牌名在动态背景上依然清晰、有质感（描边随皮肤主色走）。 */
      var V = C.HOME_VFX || {};
      ctx.save();
      var titleScale = 1 + 0.012 * Math.sin(t * 1.6);
      ctx.translate(C.DESIGN.w / 2, 412 + float);
      ctx.scale(titleScale, titleScale);
      if (V.titleGlow !== false) {
        ctx.shadowColor = V.titleGlowColor || 'rgba(255,255,255,0.55)';
        ctx.shadowBlur = 22;
      }
      /* v0.28：标题换成「华文彩云」字体 + 黑色描边 + 白色填充（用户指定）。
       * 描边画两遍：先粗黑边，再内收一档提亮边缘，字体再花哨也压得住动态背景。 */
      ctx.font = '700 78px ' + (V.titleFontFamily || '"STCaiyun","华文彩云",serif');
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.lineJoin = 'round';
      if (V.titleStroke) {
        ctx.lineWidth = V.titleStroke;
        ctx.strokeStyle = V.titleStrokeColor || '#141821';
        ctx.strokeText(C.BRAND.name, 0, 0);
      }
      ctx.shadowBlur = 0;
      ctx.fillStyle = V.titleFill || '#FFFFFF';
      ctx.fillText(C.BRAND.name, 0, 0);
      ctx.restore();
      text(C.BRAND.slogan, C.DESIGN.w / 2, 480 + float, 26, COL.textSub, 'center');

      /* 固定装饰：坐标见 config.HOME_DECO，四巧/七巧怎么切都不动一个像素 */
      var deco = C.HOME_DECO;
      var decoX = C.DESIGN.w / 2 + deco.cxOff, decoY = deco.cy + float + homeShift * 0.45;
      /* v0.27：帆船底座柔光晕 + 环绕星点，让主视觉「浮起来」并随呼吸变化 */
      if (V.decoHalo !== false && !state.reduceMotion) {
        ctx.save();
        var halo = ctx.createRadialGradient(decoX, decoY + 20, 20, decoX, decoY + 20, 300);
        halo.addColorStop(0, hexA(COL.gold || '#FFB93D', 0.16));
        halo.addColorStop(1, hexA(COL.gold || '#FFB93D', 0));
        ctx.fillStyle = halo;
        ctx.fillRect(decoX - 320, decoY - 300, 640, 640);
        var sn = V.decoSparkN || 10;
        for (var q = 0; q < sn; q++) {
          var qa = (q / sn) * Math.PI * 2 + t * 0.35;
          var qr = 210 + Math.sin(t * 1.2 + q) * 22;
          var qx = decoX + Math.cos(qa) * qr * 1.05;
          var qy = decoY + Math.sin(qa) * qr * 0.52 + 20;
          var qa2 = 0.35 + 0.5 * (0.5 + 0.5 * Math.sin(t * 2 + q * 1.7));
          ctx.globalAlpha = qa2;
          ctx.fillStyle = q % 2 ? '#FFFFFF' : (COL.gold || '#FFB93D');
          var qs = q % 3 === 0 ? 4 : 2.4;
          ctx.beginPath(); ctx.arc(qx, qy, qs, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
      for (var i = 0; i < deco.pieces.length; i++) {
        var d = deco.pieces[i];
        var bob = Math.sin(t * 1.1 + i * 0.9) * 3;
        ctx.save();
        ctx.translate(C.DESIGN.w / 2 + deco.cxOff, decoY + bob);
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

      /* ================= HUD：巧币 + 体力（左上，v0.7 胶囊底框） =================
       * 对齐用户参考图：图标压在胶囊左端外侧、数字统一 30px/700 白字、
       * 胶囊半透明深底 + 亮描边。整体比 v0.6 上移 20px（贴近安全区顶部）。
       * 几何全部取自 config.LAYOUT.HUD，验收脚本读同一组数据。 */
      var HU = C.LAYOUT.HUD;
      var hy = view.safeTop + HU.y0;
      var ey = hy + HU.rowGap;
      /* v0.7.1：两行胶囊等长。旧版按各自文字宽度自适应，巧币「120」比体力
       * 「16/16」短一截（用户反馈「一长一短」）。改为先量两行所需宽度取最大值、
       * 两条胶囊统一用这个宽度，左端起齐 + 右端对齐，数字仍从 padL 处左对齐。 */
      var coinLabel = String(state.save.coin || 0);
      var energyLabel = (state.save.energy || 0) + '/' + state.save.energyMax;
      ctx.font = font(HU.fontSize, HU.fontWeight);
      var pwCoin = HU.padL + ctx.measureText(coinLabel).width + HU.padR;
      var pwEnergy = HU.padL + ctx.measureText(energyLabel).width + HU.plusPad;
      var pillW = Math.max(pwCoin, pwEnergy, HU.pillMinW);
      /* v0.29.1：回到左上角默认左锚定（iconX）；rightAnchor 仅保留为可选开关。 */
      var hudIconX = HU.rightAnchor
        ? (C.DESIGN.w - HU.rightPad - HU.pillDx - pillW)
        : HU.iconX;
      function hudPill(iconName, iconColor, iconScale, label, rowY) {
        var px = hudIconX + HU.pillDx;
        var pw = pillW;
        var ph = HU.pillH;
        ctx.save();
        shadow(10, 4, 'rgba(44,58,75,0.22)');
        rr(px, rowY - ph / 2, pw, ph, ph / 2);
        /* v0.38：夜间护眼（深底）下用半透明白底，深底深胶囊会糊在一起 */
        ctx.fillStyle = (state.darkSkin && HU.pillFillDark) ? HU.pillFillDark : HU.pillFill;
        ctx.fill();
        noShadow();
        ctx.lineWidth = HU.border;
        ctx.strokeStyle = HU.pillStroke;
        ctx.stroke();
        ctx.restore();
        drawIcon(iconName, hudIconX, rowY, iconColor, iconScale);
        text(label, px + HU.padL, rowY + 1, HU.fontSize, HU.textColor, 'left', HU.fontWeight);
        return px + pw;
      }
      hudPill('coin', COL.gold, HU.coinScale, coinLabel, hy);
      /* 体力行：等长胶囊，右侧留 HU.plusPad 给「+」圆钮，避免压住分母 */
      var energyRight = hudPill('energy', '#3DBEF0', HU.energyScale, energyLabel, ey);

      /* 体力「+」：骑在胶囊右端（参考图同位置），点开免费体力面板 */
      var pcx = energyRight - HU.plusInset, pcy = ey, pr = HU.plusR;
      ctx.save();
      shadow(8, 3, 'rgba(38,150,86,0.38)');
      ctx.beginPath(); ctx.arc(pcx, pcy, pr, 0, Math.PI * 2);
      ctx.fillStyle = HU.plusFill;
      ctx.fill();
      noShadow();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.stroke();
      ctx.restore();
      drawIcon('plus', pcx, pcy, '#FFFFFF', 0.5);
      addHit(pcx, pcy, HU.plusHit, HU.plusHit, 'hud_energy');

      /* 主页入口：图标 + 下方小字。
       * v0.6 修「图标与标签重叠」：图标 96→88、标签偏移 76→68、行距 130→142，
       * 标签底(中心+78) 与下一图标顶(中心+98) 之间留 20px。 */
      var H = C.LAYOUT.HOME;
      function homeEntry(id, icon, label, ex, eyy, badge) {
        /* v0.27：入口呼吸光晕——各入口按 y 位置错相，形成自上而下流动的点亮波，
         * 让玩家一眼看到「这些按钮是活的」。低帧率/减少动效时跳过。 */
        if (V.ringPulseMs && !state.reduceMotion) {
          var ph2 = (state.time % V.ringPulseMs) / V.ringPulseMs;
          var wave = 0.5 + 0.5 * Math.sin(ph2 * Math.PI * 2 - eyy / 90);
          ctx.save();
          ctx.shadowColor = hexA(COL.gold || '#FFB93D', 0.35 + wave * 0.3);
          ctx.shadowBlur = 8 + wave * 14;
          rr(ex - H.entryW / 2, eyy - H.entryW / 2, H.entryW, H.entryW, 24);
          ctx.fillStyle = COL.card; ctx.fill();
          ctx.restore();
        }
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
      /* v0.28：用户要求去掉「添加桌面」入口，左列整体上移一格填补空位。 */
      homeEntry('entry_skin', 'skin', '皮肤', lx, e0);
      /* v0.41：红点表示「有好友已完成 4 关、还没去看」—— 不再是「今天没邀请过」 */
      homeEntry('entry_invite', 'invite', '邀请有礼', lx, e0 + eg, inviteHasNews());
      /* v0.16：左列第 4 格「任务」已下线（用户要求）。 */

      /* 在线奖励：图标 + 上方气泡。
       * v0.15：气泡从「3 分钟倒计时」改成「今日累计时长」，有可领档位时变红显示「可领 N」。
       * 不再叠图标红点 —— 红气泡本身已经把「有事可做」说清楚了，双红点反而吵。 */
      homeEntry('entry_rank', 'rank', '排行榜', rx, e0);   // v0.8：右列顶部空位
      var oReady = onlineClaimCount();
      homeEntry('online_claim', 'online', '在线奖励', rx, e0 + eg * 1.5);
      var otxt = oReady > 0 ? ('可领 ' + oReady) : onlineClock(onlineSecNow());
      var bbx = rx, bby = e0 + eg * 1.5 - 70, bw2 = 92, bh2 = 36;
      ctx.save();
      rr(bbx - bw2 / 2, bby - bh2 / 2, bw2, bh2, bh2 / 2);
      ctx.fillStyle = oReady > 0 ? '#FF5A5A' : 'rgba(255,255,255,0.95)';
      ctx.fill();
      noShadow();
      ctx.restore();
      text(otxt, bbx, bby, 19, oReady > 0 ? '#FFFFFF' : COL.goldDeep, 'center', '700');

      var startLabel = state.save.unlockedMax > 1
        ? '继续 第 ' + Math.min(state.save.unlockedMax, LEVELS.length) + ' 关'
        : '开始';
      var b1 = { id: 'start', x: C.DESIGN.w / 2, y: startY, w: 420, h: 108, label: startLabel, variant: 'primary', size: 32 };
      addHit(b1.x, b1.y, b1.w, b1.h, 'start');
      drawButton(b1);
      /* v0.27：主按钮周期流光——一道窄高光沿按钮内从左扫到右，
       * Clip 在圆角内、不影响文字可读性；reduceMotion 时静止。 */
      if (V.btnShineMs && !state.reduceMotion) {
        var shinePh = (state.time % V.btnShineMs) / V.btnShineMs;
        var sx0 = b1.x - b1.w / 2 - 90 + shinePh * (b1.w + 180);
        ctx.save();
        rr(b1.x - b1.w / 2, b1.y - b1.h / 2, b1.w, b1.h, b1.h / 2); ctx.clip();
        var sg = ctx.createLinearGradient(sx0 - 60, 0, sx0 + 60, 0);
        sg.addColorStop(0, 'rgba(255,255,255,0)');
        sg.addColorStop(0.5, 'rgba(255,255,255,0.42)');
        sg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = sg;
        ctx.save(); ctx.rotate(-0.14);
        ctx.fillRect(sx0 - 80, b1.y - b1.h, 160, b1.h * 3);
        ctx.restore();
        ctx.restore();
      }

      /* ================= v0.29.2 两套拼图入口：一个图案 + 华文彩云汉字 =================
       * 用户反馈纯拼片图案「太丑」。改回「一个拼片徽章 + 四巧板 / 七巧板」，
       * 文字用主页标题同款华文彩云（titleFontFamily）；卡片保留玻璃质感与选中金边，
       * 不再显示关数。位置仍固定：四巧板在上(set4Y)、七巧板在下(set7Y)，热区 id 不变。 */
      var SET_PIECE_COLORS = ['#4FA8E0', '#63C88B', '#FF8A5B', '#A87BE8', '#F5C84D', '#EE7FA8', '#59C7C0'];
      function setFacet(pts, color) {
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.closePath();
        ctx.fillStyle = color; ctx.fill();
        ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(255,255,255,0.92)'; ctx.stroke();
      }
      /* 一个完整徽章：四巧板是四色菱形，七巧板是 7 面方形拼图，
       * 不再是散落的小碎片，远看就是一个整块图案。 */
      function setBadge(kind, cx, cy, s) {
        var r = s / 2;
        ctx.save(); ctx.translate(cx, cy);
        ctx.beginPath(); rr(-r - 8, -r - 8, s + 16, s + 16, 14);
        ctx.fillStyle = 'rgba(255,255,255,0.82)'; ctx.fill();
        ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(150,168,205,0.45)'; ctx.stroke();
        if (kind === 't4') {
          setFacet([[0, -r], [r, 0], [0, 0]], SET_PIECE_COLORS[0]);
          setFacet([[0, -r], [-r, 0], [0, 0]], SET_PIECE_COLORS[1]);
          setFacet([[-r, 0], [0, r], [0, 0]], SET_PIECE_COLORS[2]);
          setFacet([[r, 0], [0, r], [0, 0]], SET_PIECE_COLORS[3]);
        } else {
          setFacet([[-r, -r], [0, -r], [-r, 0]], SET_PIECE_COLORS[0]);
          setFacet([[0, -r], [0, 0], [-r, 0]], SET_PIECE_COLORS[1]);
          setFacet([[0, -r], [r, -r], [r, 0]], SET_PIECE_COLORS[2]);
          setFacet([[0, -r], [r, 0], [0, 0]], SET_PIECE_COLORS[3]);
          setFacet([[-r, 0], [0, 0], [-r, r]], SET_PIECE_COLORS[4]);
          setFacet([[0, 0], [0, r], [-r, r]], SET_PIECE_COLORS[5]);
          setFacet([[0, 0], [r, 0], [r, r], [0, r]], SET_PIECE_COLORS[6]);
        }
        ctx.restore();
      }
      function setEntryLabel(label, x, y, sel, size) {
        var dark = state.darkSkin || state.darkFx;
        ctx.save();
        ctx.font = '700 ' + (size || 38) + 'px ' + (V.titleFontFamily || '"STCaiyun","华文彩云",serif');
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 3; ctx.lineJoin = 'round';
        ctx.strokeStyle = dark ? 'rgba(18,24,34,0.55)' : 'rgba(255,255,255,0.9)';
        ctx.strokeText(label, x, y);
        /* 夜间护眼是深卡片：选中用暖金、未选中用浅墨，否则深底深字看不见 */
        ctx.fillStyle = dark ? (sel ? '#F3C87E' : '#DCE6F5') : (sel ? '#7A4A00' : '#3E4C60');
        ctx.fillText(label, x, y);
        ctx.restore();
      }
      function setEntry(id, key, kind, yy) {
        var sel = state.setKey === key;
        var dark = state.darkSkin || state.darkFx;
        /* v0.38：用户要求「关卡的按钮缩小一点点」，440×112 → 408×100（尺寸在 config 里） */
        var w = H.setW || 408, h = H.setH || 100, x = C.DESIGN.w / 2;
        addHit(x, yy, w, h, id);
        ctx.save();
        /* 底部投影 + 选中态外发光 */
        ctx.shadowColor = sel ? hexA(COL.gold || '#FFB93D', dark ? 0.34 : 0.5) : (dark ? 'rgba(0,0,0,0.34)' : 'rgba(40,50,80,0.20)');
        ctx.shadowBlur = sel ? 26 : 14; ctx.shadowOffsetY = 5;
        var g = ctx.createLinearGradient(x - w / 2, yy - h / 2, x + w / 2, yy + h / 2);
        if (dark) {
          if (sel) { g.addColorStop(0, '#4A4334'); g.addColorStop(1, '#3A3427'); }
          else { g.addColorStop(0, '#323B4A'); g.addColorStop(1, '#28303D'); }
        } else if (sel) { g.addColorStop(0, '#FFFDF6'); g.addColorStop(1, '#FFE9C4'); }
        else { g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, '#EDF1FA'); }
        rr(x - w / 2, yy - h / 2, w, h, 24); ctx.fillStyle = g; ctx.fill();
        ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        /* 顶部高光条：玻璃质感（深色皮肤上压到很淡，避免整块发白） */
        ctx.save(); rr(x - w / 2 + 3, yy - h / 2 + 3, w - 6, h - 6, 21); ctx.clip();
        var hl = ctx.createLinearGradient(0, yy - h / 2, 0, yy + h / 2);
        if (dark) {
          hl.addColorStop(0, 'rgba(255,255,255,0.10)'); hl.addColorStop(0.45, 'rgba(255,255,255,0.02)');
          hl.addColorStop(1, 'rgba(0,0,0,0.10)');
        } else {
          hl.addColorStop(0, 'rgba(255,255,255,0.85)'); hl.addColorStop(0.45, 'rgba(255,255,255,0.05)');
          hl.addColorStop(1, 'rgba(0,0,0,0.04)');
        }
        ctx.fillStyle = hl; ctx.fillRect(x - w / 2, yy - h / 2, w, h);
        ctx.restore();
        /* 描边：选中金色，未选中浅蓝灰（深色皮肤改半透明浅线） */
        rr(x - w / 2, yy - h / 2, w, h, 24);
        ctx.lineWidth = sel ? 4 : 2;
        ctx.strokeStyle = sel ? (COL.goldEdge || '#E5962D')
          : (dark ? 'rgba(160,178,205,0.42)' : 'rgba(150,168,205,0.55)');
        ctx.stroke();
        ctx.restore();
        /* 徽章 + 华文彩云汉字：卡片缩小后整体左收、字号降一档，右侧给勾选灯留位 */
        setBadge(kind, x - 134, yy, 58);
        setEntryLabel(kind === 't4' ? '四巧板' : '七巧板', x - 76, yy + 1, sel, 38);
        if (sel) {
          /* 右侧「进行中」小灯，纯图形不写字 */
          var px = x + w / 2 - 52;
          ctx.save();
          ctx.beginPath(); ctx.arc(px, yy, 13, 0, Math.PI * 2);
          ctx.fillStyle = hexA(COL.gold || '#FFB93D', 0.22); ctx.fill();
          drawIcon('check', px, yy, COL.goldEdge || '#E5962D', 0.52);
          ctx.restore();
        }
      }
      setEntry('set_t4', 'tangram4', 't4', set4Y);
      setEntry('set_t7', 'tangram7', 't7', set7Y);

      /* v0.7：设置从右上角挪到右列底部，样式与其它入口统一成「图标 + 下方小字」。
       * v0.16：左列「任务」下线后，右列仍保持 3 个入口（排行榜 / 在线奖励 / 设置）。 */
      homeEntry('settings', 'gear', '设置', rx, e0 + eg * 3);

      text('已获得 ' + totalStars() + '/' + (LEVELS.length * 3) + ' 星', C.DESIGN.w / 2, starY, 24, COL.textSub, 'center');
    }

    /* ---------------- 关卡选择（v0.2：按章分页） ----------------
     * 一屏塞不下全部关卡，改成「章节胶囊 + 4×5 格」（v0.8 四巧板 30 关 = 3 章）。
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
    function drawLevelThumb(outline, cx, cy, maxW, maxH, fill, edge, holes) {
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
      /* v0.32：带内孔的剪影（字母 A/P 等）用奇偶填充，避免缩略图画成实心块 */
      var hs = holes || [];
      for (var m2 = 0; m2 < hs.length; m2++) {
        var hr2 = hs[m2];
        if (!hr2 || hr2.length < 3) continue;
        ctx.moveTo(ox + (hr2[0][0] - bx0) * s, oy + (hr2[0][1] - by0) * s);
        for (var n2 = 1; n2 < hr2.length; n2++) {
          ctx.lineTo(ox + (hr2[n2][0] - bx0) * s, oy + (hr2[n2][1] - by0) * s);
        }
        ctx.closePath();
      }
      ctx.fillStyle = fill;
      if (hs.length) ctx.fill('evenodd'); else ctx.fill();
      ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
      ctx.strokeStyle = edge; ctx.stroke();
      ctx.restore();
    }

    function renderLevels() {
      drawBg(false);
      /* v0.28：背景特效在关卡页同样生效，强度收敛到 0.55 不抢关卡格注意力 */
      drawFxLayer(state.time / 1000, state.dt || 16, 0.55);
      var by = view.safeTop + 40;
      var bb = { id: 'back_home', x: 70, y: by + 8, w: 76, h: 76, variant: 'tool', icon: 'back' };
      addHit(bb.x, bb.y, bb.w, bb.h, 'back_home');
      drawButton(bb);
      text('关卡', C.DESIGN.w / 2, by + 8, 40, COL.text, 'center', '600');

      var nCh = chapterCount();
      var page = Math.max(0, Math.min(state.lvPage || 0, nCh - 1));
      state.lvPage = page;

      /* 章节胶囊 */
      /* v0.30：章节数从 6 增到 9，固定 96px 胶囊会超出 750 设计宽
       * （9×96 + 8×10 = 944）。改为按可用宽度自适应：先取理想值 96，
       * 放不下就等比收窄并压缩间隙，字号保持不变（2 个汉字 48px 仍放得下）。 */
      var ph = 64;
      var pgap = nCh > 7 ? 6 : 10;
      var avail = C.DESIGN.w - 32;
      var pw = Math.min(96, Math.floor((avail - (nCh - 1) * pgap) / nCh));
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
          locked ? COL.textSub : COL.targetEdge, lv.holes);
        if (locked) {
          drawIcon('lock', cx, cellY + 46, COL.disabledIcon, 0.8);
        } else {
          var stars = state.save.starOf[String(idx + 1)] || 0;
          for (var s = 0; s < 3; s++) {
            drawStar(cx - 40 + s * 40, cellY + 48, 17, s < stars);
          }
          /* v0.40：已通关但还没满 3 星 → 关号右边标出「升下一星还能补多少」。
           * 不标出来，玩家根本不知道重玩老关有进账 —— 那这次改动就白做了。
           * 标签压在整卡热区里，点它和点卡片同效，不需要单独 addHit。 */
          if (stars > 0 && stars < 3) {
            var SRt = C.ECON.starReward;
            var sp = state.save.starPaid || {};
            var paidN = (typeof sp[String(idx + 1)] === 'number')
              ? sp[String(idx + 1)] : (SRt[stars - 1] || 0);
            var rest = Math.max(0, (SRt[stars] || 0) - paidN);
            if (rest > 0) drawStarGainTag(cx + 46, cellY + 82, rest);
          }
        }
        // 小字关号保留在星星行下方：报关号/对答案仍方便，且不与图案、星星重叠
        text(String(idx + 1), cx, cellY + 82, 18, COL.textSub, 'center', '600');
        ctx.restore();
        addHit(cx, cellY, cw, chh, 'lvl_' + (idx + 1), 'btn');
      }
    }

    /* ---------------- 对局页 HUD（v0.17） ----------------
     * 局内会因「买提示 / 巧币复活」扣钱，玩家不能等到退回主页才知道余量，
     * 所以顶栏常驻一对胶囊（巧币在上、体力在下，与主页同序）。
     * 放在**左侧**：真机右上角是微信原生胶囊按钮（系统层盖在画布之上），
     * 画在右边会被压掉一半，而网页预览里完全看不出来。
     * 几何全取自 config.LAYOUT.HUD_MIN，验收脚本读同一组数，避免两边抄魔数。 */
    /* v0.40：关卡卡片的「升星还能补多少」小标签（金色胶囊 + ↑N）
     * 尺寸按文字宽度自适应，最长是「↑21」这种 3 字符，胶囊最宽 ~44 < 卡片右边距。 */
    function drawStarGainTag(x, y, n) {
      var t = '↑' + n, h = 20;
      ctx.font = font(15, '700');
      var w = Math.max(32, ctx.measureText(t).width + 14);
      ctx.save();
      rr(x - w / 2, y - h / 2, w, h, h / 2);
      ctx.fillStyle = 'rgba(233,177,106,0.18)';
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(233,177,106,0.55)';
      ctx.stroke();
      ctx.restore();
      /* 深色皮肤下 goldDeep 压不住深灰卡片，改用亮金（浅色仍用深金，白底才看得清） */
      text(t, x, y + 1, 15, state.darkSkin ? COL.gold : COL.goldDeep, 'center', '700');
    }

    /* v0.40：结算页「升到 ★★」用的星符串。
     * 不用 String.prototype.repeat —— 小游戏基础库版本参差，手拼最稳。 */
    function starTag(r) {
      var n = Math.max(1, Math.min(3, (r && (r.bestStars || r.stars)) || 1));
      var t = '';
      for (var i = 0; i < n; i++) t += '★';
      return t;
    }

    /* 位数兜底：巧币真攒到一万以上时，`10000` 这种 5 位数即使用 18px 也塞不进
     * 127 宽的胶囊（会顶到倒计时胶囊上）。折算成「1.2万 / 10亿」后最宽 4 个字符，
     * 宽度问题从根上消失，也不比一串数字更难读。 */
    function shortNum(n) {
      n = Math.max(0, Math.floor(n || 0));
      if (n < 10000) return String(n);
      if (n < 100000000) {
        return (n / 10000).toFixed(n < 100000 ? 1 : 0).replace(/\.0$/, '') + '万';
      }
      return (n / 100000000).toFixed(1).replace(/\.0$/, '') + '亿';
    }

    function playHud(cy) {
      var M = C.LAYOUT.HUD_MIN, s = state.save;
      var rows = [
        { icon: 'coin', color: COL.gold, scale: M.coinScale, num: shortNum(s.coin), sub: '' },
        { icon: 'energy', color: '#3DBEF0', scale: M.energyScale,
          num: shortNum(s.energy), sub: '/' + s.energyMax }
      ];
      var ratio = M.subFontSize / M.fontSize;
      /* 两行等长（沿用主页 v0.7.1 的规矩：一长一短斜着难看），
       * 先量各自文字取最大值；超过 maxW 就按 2px 递减字号，宁可变小也不许撑出屏幕。 */
      var fsz = M.fontSize, wEach = 0, guard = 0;
      while (guard++ < 20) {
        wEach = 0;
        for (var i = 0; i < rows.length; i++) {
          ctx.font = font(fsz, M.fontWeight);
          var w = M.padL + ctx.measureText(rows[i].num).width + M.padR;
          if (rows[i].sub) {
            ctx.font = font(Math.max(12, Math.round(fsz * ratio)), M.fontWeight);
            w += ctx.measureText(rows[i].sub).width;
          }
          if (w > wEach) wEach = w;
        }
        if (wEach <= M.maxW || fsz <= M.minFontSize) break;
        fsz -= 2;
      }
      /* v0.29.1：回到左上角（返回按钮 108 与倒计时 255 之间）；topShift 让两枚胶囊再上移一点。 */
      var x = M.rightAnchor ? (C.DESIGN.w - M.rightPad - wEach) : M.left;
      var ph = M.pillH;
      var subFs = Math.max(12, Math.round(fsz * ratio));
      for (var k = 0; k < rows.length; k++) {
        var r = rows[k], rowY = cy - (M.topShift || 0) + (k - 0.5) * M.rowGap;
        ctx.save();
        shadow(8, 3, 'rgba(44,58,75,0.20)');
        rr(x, rowY - ph / 2, wEach, ph, ph / 2);
        /* v0.38：与主页 HUD 一致 —— 夜间护眼深底改用半透明白胶囊 */
        ctx.fillStyle = (state.darkSkin && M.pillFillDark) ? M.pillFillDark : M.pillFill;
        ctx.fill();
        noShadow();
        ctx.lineWidth = M.border;
        ctx.strokeStyle = M.pillStroke;
        ctx.stroke();
        ctx.restore();
        drawIcon(r.icon, x + M.iconInset, rowY, r.color, r.scale);
        text(r.num, x + M.padL, rowY + 1, fsz, M.textColor, 'left', M.fontWeight);
        if (r.sub) {
          ctx.save();
          ctx.font = font(fsz, M.fontWeight);
          var nw = ctx.measureText(r.num).width;
          ctx.restore();
          /* 分母压暗一点：一眼看到「现在还剩多少」，上限是次要信息 */
          text(r.sub, x + M.padL + nw + 1, rowY + 2, subFs,
            'rgba(255,255,255,0.72)', 'left', M.fontWeight);
        }
      }
    }

    /* ================= v0.21 教学绘制 =================
     * 分两层：
     *   ① drawTutGhost —— 画在轮廓之后、板件之前：把还没放对的标准解淡显成彩色虚影
     *   ② drawTutTip   —— 画在板件/托盘之后：顶部一行指令 + 手势图标 + 跳过
     * 分开画的理由和提示层一样：虚影要在玩家自己的板下面（不然糊住真实板件），
     * 文字要在最上面（不然被板压住）。
     */
    var TUT_ICON = { drag: '拖', rot: '转', flip: '翻' };

    function drawTutGhost(lv) {
      var T = C.TUTORIAL, step = tutStep(), i;
      /* 目标：当前这一块的落点脉冲得更亮，其余虚影保持低透明度 */
      for (i = 0; i < lv.solution.length; i++) {
        var st = lv.solution[i], p = pieceOf(st.id);
        if (pieceSolved(p, st)) continue;      // 已放对的不再盖虚影（会糊掉真板）
        var gp = G.toWorld(LOCAL[st.id], st).map(function (v) { return [w2d(v[0]), h2d(v[1])]; });
        var isCur = !!(step && step.id === st.id && step.kind === 'drag');
        var ga = isCur
          ? (T.ghostAlpha + 0.10 + 0.06 * Math.sin(state.time / 220))
          : T.ghostAlpha;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(gp[0][0], gp[0][1]);
        for (var gi = 1; gi < gp.length; gi++) ctx.lineTo(gp[gi][0], gp[gi][1]);
        ctx.closePath();
        ctx.globalAlpha = ga;
        ctx.fillStyle = DS.pieces[st.id].color;
        ctx.fill();
        ctx.globalAlpha = isCur ? 0.95 : 0.55;
        ctx.lineWidth = isCur ? 3 : 2;
        ctx.setLineDash([8, 6]);
        ctx.strokeStyle = isCur ? COL.goldDeep : COL.gold;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    }

    /* 手势图标：用最少的笔画讲清"手指怎么动"，尺寸按 T.iconR 缩放 */
    function drawTutIcon(kind, cx, cy, r) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = COL.goldDeep;
      ctx.fillStyle = COL.goldDeep;
      ctx.lineWidth = Math.max(2.4, r * 0.16);
      if (kind === 'rot') {
        /* 圆弧 + 箭头：转 */
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.78, -0.5, 4.3);
        ctx.stroke();
        var ax = Math.cos(-0.5) * r * 0.78, ay = Math.sin(-0.5) * r * 0.78;
        ctx.beginPath();
        ctx.moveTo(ax - r * 0.34, ay - r * 0.06);
        ctx.lineTo(ax + r * 0.18, ay + r * 0.24);
        ctx.lineTo(ax + r * 0.06, ay - r * 0.36);
        ctx.closePath();
        ctx.fill();
      } else if (kind === 'flip') {
        /* 双向箭头：翻 */
        ctx.beginPath();
        ctx.moveTo(-r * 0.62, -r * 0.26); ctx.lineTo(r * 0.58, -r * 0.26);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(r * 0.62, r * 0.26); ctx.lineTo(-r * 0.58, r * 0.26);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(r * 0.62, -r * 0.26); ctx.lineTo(r * 0.24, -r * 0.56);
        ctx.lineTo(r * 0.24, r * 0.04);
        ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-r * 0.62, r * 0.26); ctx.lineTo(-r * 0.24, r * 0.56);
        ctx.lineTo(-r * 0.24, -r * 0.04);
        ctx.closePath(); ctx.fill();
      } else {
        /* 拖：一块实心方 + 箭头 + 一个虚线空框 —— 一眼就是"把它拖进框里"，
         * 比画手指可靠（60px 见方时手指的细节全糊成一团）。
         * 两个方块直接用 0.72r，撑满图标框；太小会缩成两个点。 */
        var q = r * 0.72, gap = r * 0.30;
        ctx.fillStyle = COL.gold;
        ctx.strokeStyle = COL.goldDeep;
        ctx.lineWidth = Math.max(2, r * 0.11);
        rr(-gap - q, -q / 2, q, q, q * 0.2);
        ctx.fill();
        ctx.stroke();
        /* 箭头：从左边方块右沿指向右边虚框左沿 */
        var ax0 = -gap + r * 0.04, ax1 = gap - r * 0.04;
        ctx.beginPath();
        ctx.moveTo(ax0, 0); ctx.lineTo(ax1, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ax1 + r * 0.02, 0);
        ctx.lineTo(ax1 - r * 0.26, -r * 0.22);
        ctx.lineTo(ax1 - r * 0.26, r * 0.22);
        ctx.closePath();
        ctx.fillStyle = COL.goldDeep;
        ctx.fill();
        ctx.save();
        ctx.setLineDash([q * 0.30, q * 0.24]);
        ctx.lineWidth = Math.max(1.8, r * 0.10);
        ctx.strokeStyle = COL.goldDeep;
        rr(gap, -q / 2, q, q, q * 0.2);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }

    /* 把"这一步要用哪块"圈出来：托盘里圈板件、已经在台上就圈台上那块。
     * 窗口文字写的是「亮起来的这块」，所以必须真有一块在亮 —— 否则玩家会盯着
     * 一动不动的一句话找半天。箭头压在包围盒上方（太靠上会顶到指令行，那就翻到下方）。 */
    function drawTutFocus() {
      var step = tutStep();
      if (!step) return;
      var p = pieceOf(step.id);
      if (!p) return;
      var pts = p.onBoard ? piecePolyDesign(p) : trayPoly(p);
      if (!pts || !pts.length) return;
      var a = 0.55 + 0.30 * Math.sin(state.time / 180);
      var minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, i;
      for (i = 0; i < pts.length; i++) {
        if (pts[i][0] < minX) minX = pts[i][0];
        if (pts[i][0] > maxX) maxX = pts[i][0];
        if (pts[i][1] < minY) minY = pts[i][1];
        if (pts[i][1] > maxY) maxY = pts[i][1];
      }
      ctx.save();
      ctx.beginPath();
      for (i = 0; i < pts.length; i++) {
        if (i === 0) ctx.moveTo(pts[i][0], pts[i][1]); else ctx.lineTo(pts[i][0], pts[i][1]);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,185,61,0.14)';
      ctx.fill();
      /* 白描边打底 + 金色虚线环：板件本身就是暖色（橙/黄）时，
       * 单靠一圈金线看不出"被选中"，垫一层白边才在任何底色上都跳出来。 */
      ctx.lineWidth = 9;
      ctx.strokeStyle = 'rgba(255,255,255,0.92)';
      ctx.stroke();
      ctx.lineWidth = 4.5;
      ctx.strokeStyle = 'rgba(255,159,28,' + a.toFixed(2) + ')';
      ctx.stroke();

      /* 箭头只在"还在托盘里"时画：台上那块已经有白+金双圈，
       * 再压一个箭头反而挡住板件本身。 */
      if (p.onBoard) { ctx.restore(); return; }
      /* 箭头：默认在包围盒上方往下指；离指令行太近就翻到下方往上指 */
      var T = C.TUTORIAL, B = LAY.BOARD;
      var cx = (minX + maxX) / 2;
      var up = (minY - 34) > (B.y + T.textY + 34);
      var ay = up ? (minY - 30) : (maxY + 30);
      var bob = Math.sin(state.time / 200) * 4;
      ctx.beginPath();
      if (up) {
        ctx.moveTo(cx, ay + 18 + bob);
        ctx.lineTo(cx - 16, ay - 8 + bob);
        ctx.lineTo(cx + 16, ay - 8 + bob);
      } else {
        ctx.moveTo(cx, ay - 18 + bob);
        ctx.lineTo(cx - 16, ay + 8 + bob);
        ctx.lineTo(cx + 16, ay + 8 + bob);
      }
      ctx.closePath();
      ctx.fillStyle = COL.goldDeep;
      ctx.fill();
      ctx.restore();
    }

    function drawTutTip(lv) {
      var T = C.TUTORIAL, B = LAY.BOARD;
      var step = tutStep();
      var txt = step ? step.text : '拼好了，点「下一关」继续';
      var kind = step ? step.kind : 'drag';

      /* 指令一行：图标 + 文字整体居中，文字过长时降字号兜底 */
      var size = T.textSize, iconW = T.iconR * 2 + 14;
      ctx.font = font(size, '600');
      var tw = ctx.measureText ? ctx.measureText(txt).width : 300;
      var maxW = B.size - 120;
      while (tw + iconW > maxW && size > 18) {
        size -= 2;
        ctx.font = font(size, '600');
        tw = ctx.measureText ? ctx.measureText(txt).width : tw;
      }
      var groupW = iconW + tw;
      var gx = C.DESIGN.w / 2 - groupW / 2;
      var gy = B.y + T.textY;
      /* 背部一层极淡底，避免虚影透上来压低文字对比度。
       * v0.38：夜间护眼的纸面是深色，白底会把浅墨字吞掉 → 改深底。 */
      ctx.save();
      rr(gx - 16, gy - 26, groupW + 32, 52, 26);
      ctx.fillStyle = state.darkSkin ? 'rgba(12,18,28,0.72)' : 'rgba(255,255,255,0.82)';
      ctx.fill();
      ctx.restore();
      var bob = Math.sin(state.time / 260) * 3;
      drawTutIcon(kind, gx + T.iconR, gy + bob, T.iconR);
      /* v0.28：教学文字压在固定浅色提示条上，深色特效下也要用深色墨，避免白字白底 */
      text(txt, gx + iconW, gy, size, inkOnCard(false), 'left', '600');

      /* 跳过：卡纸右下角一行小字（教学是一次性的，必须留出口） */
      var sx = B.x + B.size - T.skipW / 2 - 12, sy = B.y + B.size - 34;
      text(T.skipText, sx, sy, 22, inkOnCard(true), 'center', '500');
      ctx.save();
      ctx.strokeStyle = 'rgba(122,138,156,0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sx - 44, sy + 15); ctx.lineTo(sx + 44, sy + 15);
      ctx.stroke();
      ctx.restore();
      addHit(sx, sy, T.skipW, 72, 'tut_skip');
    }

    /* ---------------- 对局页 ---------------- */
    function renderPlay() {
      var lv = LEVELS[state.levelIdx];
      drawBg(false);
      /* v0.28：背景特效进入对局页，强度更低（0.45）避免干扰拼图辨识；
       * 画在底图之上、卡纸/板件之下，不写热区不吞点击。 */
      drawFxLayer(state.time / 1000, state.dt || 16, 0.45);

      /* 顶栏 v0.9：关号靠左（关名放第二行），倒计时胶囊**居中**。
       * 旧版倒计时贴在右上角，和返回/关号同一水平线，玩家专注拼图时根本注意不到
       * （用户反馈「很容易忽略」）。居中后它成了这一行唯一的视觉重心。
       * v0.46：锚点抽成 hudAnchorY()，与两枚余量胶囊共用一条中心线 ——
       * 以前这里写死 safeTop+40，胶囊却用 topShift 自己往上顶，两条线本来就不一致，
       * 放大胶囊后更容易看出高低不齐。 */
      var by = hudAnchorY();
      /* 计时胶囊几何先算出来：关名截断要用它算可用宽度（写成 var 会因提升拿到 undefined） */
      var capW = 240, capH = 56, capCx = C.DESIGN.w / 2, capL = capCx - capW / 2;
      /* v0.37：返回键下移方便单手操作 —— 中心 y 由 by(安全区+40) 挪到 1130，
       * 落在卡纸底(1018)下方托盘带的左侧空白区；x 保持 70（左沿 32 与胶囊左沿对齐）。
       * 顺带换成可爱风糖果按钮：tone 必须内联，下面 renderPlay 尾部的 TOOL_TONE
       * 因 var 提升在此处拿到的是 undefined，不能引用。 */
      var bb = { id: 'back_levels', x: 70, y: 1130, w: 76, h: 76, variant: 'tool', icon: 'back',
        tone: { bg1: '#FFF3E6', bg2: '#FFE2C7', edge: '#FFC79E', ink: '#E07B3A' },
        iconScale: 0.92 };
      /* v0.38：夜间护眼下返回键也换深色糖，避免一颗奶白按钮在深色页里发亮 */
      if (state.darkSkin) bb.tone = { bg1: '#3A3229', bg2: '#2F2921', edge: '#241F19', ink: '#F0A76A' };
      addHit(bb.x, bb.y, bb.w, bb.h, 'back_levels');
      drawButton(bb);
      /* v0.17：关号从顶栏让位到卡纸内左上角（见下方「关卡标题」）。
       * 原因：真机右上角是微信原生胶囊按钮，巧币/体力必须占住返回按钮右侧那一段，
       * 顶栏一行塞不下「返回 + 关号 + 居中的倒计时 + 双胶囊」四组东西。 */

      /* 生命值（3 心，随剩余时间递减）+ 倒计时胶囊，整条胶囊对齐屏幕中线。
       * 倒计时 ≤warnSec 时数字转红并轻微脉冲，给紧迫感。 */
      var leftS = Math.max(0, Math.ceil(state.timeLeft));
      var mm = Math.floor(leftS / 60), ss = leftS % 60;
      var timeTxt = (mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss;
      var warn = leftS <= C.TIMER.warnSec;
      ctx.save();
      rr(capL, by - capH / 2, capW, capH, capH / 2);
      /* v0.47：胶囊底与字色走 pillBg / pillInk —— 旧版写死 0.86 白底 + COL.btnText，
       * 深色皮肤下 btnText 变 #2A1D00（给金色按钮用的近黑），压在白色胶囊上虽然能读，
       * 但这枚胶囊会是深色页面里最亮的一块，和左边两枚深色余量胶囊明显不是一套。 */
      ctx.fillStyle = COL.pillBg || 'rgba(255,255,255,0.86)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = warn ? hexA(COL.dangerText || '#E5484D', 0.55) : COL.cardEdge;
      ctx.stroke();
      ctx.restore();
      var hcnt = C.TIMER.hearts;
      for (var hi = 0; hi < hcnt; hi++) {
        var hx = capL + 26 + hi * 26;
        /* v0.47：空心的颜色跟着皮肤走 —— 原来写死 rgba(150,162,180,0.42)，
         * 深色胶囊上基本看不见，玩家会以为"只有 1 颗心" */
        drawIcon('heart', hx, by, hi < state.hearts ? '#FF5A5A' : (COL.disabledIcon || 'rgba(150,162,180,0.42)'), 0.62);
      }
      /* 数字按实测宽度定位，脉冲以数字中心为原点缩放（否则会左右抖） */
      ctx.save();
      ctx.font = font(34, '700');
      var timeW = ctx.measureText ? ctx.measureText(timeTxt).width : 90;
      ctx.restore();
      var timeCx = capL + capW - 22 - timeW / 2;
      var pl = warn ? (1 + Math.sin(state.time * 0.012) * 0.07) : 1;
      ctx.save();
      ctx.translate(timeCx, by);
      ctx.scale(pl, pl);
      text(timeTxt, 0, 0, 34, warn ? (COL.dangerText || '#E5484D') : (COL.pillInk || COL.btnText), 'center', '700');
      ctx.restore();

      /* v0.17：顶栏右侧常驻巧币 / 体力余量（局内买提示、复活都要扣巧币）。
       * 与倒计时胶囊同一条水平线（v0.29.1 起回到左上角，见 HUD_MIN），不挂热区 ——
       * 局内点开面板会打断拼图，展示就够了。
       * 复活 / 结算弹层会在自己的遮罩之上再画一遍（否则会被压暗），这里别重复画：
       * 半透明深底叠两次会比正常页面明显更黑。 */
      if (state.overlay !== 'fail' && state.overlay !== 'result') playHud(by);

      /* v0.33：原 v0.9 顶部广告位（LAY.AD）已移除，这块位置直接让给拼图卡纸。 */

      /* 拼图卡纸
       * v0.35：纸面是 734×842 的竖长方形，盘面（1000×1000 世界映射）仍是顶对齐的 734 正方形。
       * 多出来的 108px 是纸的页脚，进度条搬进去了 —— 纸面加高但没有一片空白区。 */
      var B = LAY.BOARD;
      var BH = B.h || B.size;
      ctx.save();
      shadow(16, 4, COL.shadow);
      rr(B.x, B.y, B.size, BH, 28);
      ctx.fillStyle = COL.card; ctx.fill();
      noShadow();
      ctx.restore();
      // 纸纹（极淡）
      var paper = env.images && env.images.board_paper;
      if (paper && state.darkSkin) {
        /* v0.38：夜间护眼不铺浅色纸质图（一张白纸在深色页面里最刺眼），
         * 改用皮肤自己的深色纸面 + 一丝浅色纹路，卡纸上的字改走浅墨（inkOnCard）。 */
        ctx.save(); rr(B.x, B.y, B.size, BH, 28); ctx.clip();
        ctx.fillStyle = COL.board; ctx.fillRect(B.x, B.y, B.size, BH);
        ctx.strokeStyle = 'rgba(255,255,255,0.035)'; ctx.lineWidth = 1;
        var dRows = Math.round(BH / 27);
        for (var di = 0; di < dRows; di++) {
          var dyy = B.y + 20 + di * 27;
          ctx.beginPath(); ctx.moveTo(B.x, dyy); ctx.lineTo(B.x + B.size, dyy + 6); ctx.stroke();
        }
        ctx.restore();
      } else if (paper) {
        ctx.save(); rr(B.x, B.y, B.size, BH, 28); ctx.clip();
        ctx.drawImage(paper, B.x, B.y, B.size, BH);
        ctx.restore();
      } else {
        ctx.save(); rr(B.x, B.y, B.size, BH, 28); ctx.clip();
        /* v0.38：深色皮肤无纸质图时也铺深色纸面，纹路改成极淡白色 */
        var dkPaper = !!state.darkSkin;
        if (dkPaper) { ctx.fillStyle = COL.board; ctx.fillRect(B.x, B.y, B.size, BH); }
        ctx.strokeStyle = dkPaper ? 'rgba(255,255,255,0.035)' : 'rgba(44,58,75,0.022)'; ctx.lineWidth = 1;
        var rows = Math.round(BH / 27);
        for (var i = 0; i < rows; i++) {
          var yy = B.y + 20 + i * 27;
          ctx.beginPath(); ctx.moveTo(B.x, yy); ctx.lineTo(B.x + B.size, yy + 6); ctx.stroke();
        }
        ctx.restore();
      }

      /* 关卡标题（v0.17）：从顶栏挪进卡纸左上角，单行「第 N 关 · 关名」。
       * 只放一行是有依据的：所有关卡轮廓的最高点在屏幕上不低于 352
       * （七巧板第 2 关最靠上，而卡纸从 302 起），两行就会压上去。
       * 40..686 的宽度足够 20 多个字，仍按卡纸内宽兜底截断。 */
      var headTxt = '第 ' + (state.levelIdx + 1) + ' 关' + (lv.name ? ' · ' + lv.name : '');
      var headMax = B.size - 52;
      ctx.save();
      ctx.font = font(22, '600');
      if (ctx.measureText && ctx.measureText(headTxt).width > headMax) {
        var hm = headTxt;
        while (hm.length > 1 && ctx.measureText(hm + '…').width > headMax) hm = hm.slice(0, -1);
        headTxt = hm + '…';
      }
      ctx.restore();
      /* v0.28：关号画在浅色卡纸上，固定深色墨（深色特效下 COL.textSub 会变浅） */
      text(headTxt, B.x + 26, B.y + 32, 22, inkOnCard(true), 'left', '600');

      /* 目标轮廓（v0.3.1 A2 样式，v0.10 起固定不变）
       * 档1 虚线轮廓(3px,[8,6])+淡填充 / 档2 细实线轮廓(1.5px)+淡填充 / 档3 纯剪影无描边。
       * v0.10：这三档是「关卡自带的显示难度」，不再由提示按钮改动
       * （旧版按提示会把轮廓越按越淡，等于提示越用越难，语义是反的）。 */
      var hasTiersLv = !!(lv.splitLines && lv.splitLines.length);
      var drawTier = hasTiersLv ? (state.hintTier || 2) : 1;
      var outline = lv.outline.map(function (v) { return [w2d(v[0]), h2d(v[1])]; });
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(outline[0][0], outline[0][1]);
      for (var o = 1; o < outline.length; o++) ctx.lineTo(outline[o][0], outline[o][1]);
      ctx.closePath();
      /* v0.32：内孔用奇偶填充挖空（字母 A/P 等轮廓本身就带洞） */
      var holes = lv.holes || [];
      for (var hh = 0; hh < holes.length; hh++) {
        var hr = holes[hh];
        if (!hr || hr.length < 3) continue;
        ctx.moveTo(w2d(hr[0][0]), h2d(hr[0][1]));
        for (var hk = 1; hk < hr.length; hk++) ctx.lineTo(w2d(hr[hk][0]), h2d(hr[hk][1]));
        ctx.closePath();
      }
      ctx.fillStyle = drawTier === 3 ? COL.targetSilhouette : COL.targetFill;
      if (holes.length) ctx.fill('evenodd'); else ctx.fill();
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

      /* v0.21 教学关：标准解彩色虚影（画在轮廓之上、板件之下） */
      if (state.tut) drawTutGhost(lv);

      /* 已上板的板件（先画，被拖的那块最后画） */
      var dragging = state.drag ? state.drag.id : null;
      for (var m = 0; m < state.pieces.length; m++) {
        var p = state.pieces[m];
        if (!p.onBoard || p.id === dragging) continue;
        drawBoardPiece(p);
      }

      /* 提示引导必须画在「已上板件」之上（v0.11 修复）：
       * 旧版画在板件之前，玩家一旦先摆了几块，落点高亮就被板压住——
       * 截图里只剩一句「提示 2/3」，棋盘上什么都看不见。 */
      if (state.hint) drawHintGuide(lv);

      /* 托盘 v0.9：不再画整块槽位底框（那是「工具区太大」的主因）。
       * 板件按散放落点直接摆，互相压一点；绘制顺序 = pieceOrder，
       * 后画在上层，命中判定也按这个顺序取最上层（见 playHit）。 */
      for (var t = 0; t < state.pieces.length; t++) {
        if (!state.pieces[t].onBoard) drawTrayPiece(state.pieces[t]);
      }
      /* v0.10 档2：把「托盘里的哪一块」标出来（画在托盘之上，压住叠放关系） */
      if (state.hint) drawHintTray();
      /* v0.21 教学：把「这一步要用的是哪一块」圈出来（窗口里说"亮起来的这块"必须真有亮） */
      if (state.tut) drawTutFocus();

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

      /* 覆盖率进度条
       * v0.35：从「卡纸外独立一行」搬进卡纸页脚。页脚顶画一条极淡分隔线，
       * 让下半截读起来像卡片的"信息栏"，而不是一片没画完的白。 */
      var P = LAY.PROGRESS;
      ctx.save();
      ctx.strokeStyle = 'rgba(44,58,75,0.065)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(B.x + 26, B.y + B.size + 24);
      ctx.lineTo(B.x + B.size - 26, B.y + B.size + 24);
      ctx.stroke();
      ctx.restore();
      text('覆盖', P.x, P.y + P.h / 2, 26, COL.textSub, 'left');
      var px = P.x + 74, pw = P.w - 144;   // v0.9：右侧留 70 给百分比，绿条走满不再穿字
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

      /* 提示文字（v0.9）：原来画在进度条下方，托盘上移后那里没位置了，
       * 改成棋盘下沿的轻量 toast（深底白字），压住作品也不碍事，1.5s 自己消失。 */
      if (state.msgT > 0) {
        var alpha = Math.min(1, state.msgT / 400);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = font(26, '500');
        var mw = (ctx.measureText ? ctx.measureText(state.msg).width : 200) + 52;
        var my = LAY.BOARD.y + LAY.BOARD.size - 60;
        rr(C.DESIGN.w / 2 - mw / 2, my - 27, mw, 54, 27);
        ctx.fillStyle = 'rgba(44,58,75,0.82)';
        ctx.fill();
        text(state.msg, C.DESIGN.w / 2, my, 26, '#FFFFFF', 'center', '500');
        ctx.restore();
      }

      /* v0.21 教学：指令行 + 跳过（画在板件/托盘之上，不吞拖动 —— 只有「跳过」挂热区） */
      if (state.tut) drawTutTip(lv);

      /* 工具栏 */
      /* 工具栏（v0.35：五枚糖果按钮的配色表）
       * 底色两档渐变 + 一支深色"厚度边"，图标取同色系深一档；
       * 提示按钮固定黄色（用户指定：黄色灯泡）。 */
      var TOOL_TONE = {
        rot_ccw: { bg1: '#EAF6FF', bg2: '#D2EAFB', edge: '#AED6F2', ink: '#3E9BD8' },
        rot_cw:  { bg1: '#E9FBF3', bg2: '#D0F2E4', edge: '#B0E2CF', ink: '#33AC84' },
        flip:    { bg1: '#F5EFFF', bg2: '#E7DAFE', edge: '#D2BEF7', ink: '#8A68E0' },
        hint:    { bg1: '#FFF9E4', bg2: '#FFEDBC', edge: '#FFDA8C', ink: '#F2A73B' },
        restart: { bg1: '#FFF1EE', bg2: '#FFE0DA', edge: '#FFC7BD', ink: '#EF6F5D' }
      };
      /* v0.38 夜间护眼：同色系的深色糖，图标 accent 提亮保持可辨（奶白底在深色页里最刺眼） */
      var TOOL_TONE_DARK = {
        rot_ccw: { bg1: '#2B3949', bg2: '#233040', edge: '#1B2532', ink: '#6FC0F0' },
        rot_cw:  { bg1: '#26382F', bg2: '#1F2E27', edge: '#172420', ink: '#5FD3A6' },
        flip:    { bg1: '#302B40', bg2: '#272238', edge: '#1E1A2C', ink: '#A98BF0' },
        hint:    { bg1: '#3A3222', bg2: '#2F291C', edge: '#241F14', ink: '#FFC96B' },
        restart: { bg1: '#3B2B28', bg2: '#302320', edge: '#251A18', ink: '#FF8A78' }
      };
      var sel = pieceOf(state.selId);
      var tools = [
        { id: 'rot_ccw', icon: 'rotL', disabled: !sel },
        { id: 'rot_cw', icon: 'rotR', disabled: !sel },
        /* v0.4 A1/A3：翻转 = 双击板件本体 或 本按钮；长按已移除、tip 汉字已删除 */
        { id: 'flip', icon: 'flip', disabled: !sel },
        /* v0.10：角标 = 本关还剩几档提示（3/2/1）。
         * v0.16：角标同时提示「还有几档」，任何一档点按钮都先弹付费面板
         * （查找道具 / 巧币 / 看视频），不再有免费直给的那一次。
         * v0.20：没有档位上限了 —— 去掉角标和置灰，按钮永远可点。
         * v0.22：角标改成**查找道具余量**（用户要求）：有几个就直接显示几个，
         * 没有就不画。配合「点一下直接用」，玩家一眼知道还能免费用几次。 */
        { id: 'hint', icon: 'hint', badge: (state.save.hintItems || 0) },
        { id: 'restart', icon: 'restart', disabled: false }
      ];
      for (var i2 = 0; i2 < tools.length; i2++) {
        var tb = {
          id: tools[i2].id, x: TOOL_X[i2], y: TOOL_Y,
          w: LAY.TOOLBAR.w, h: LAY.TOOLBAR.h,
          variant: 'tool', icon: tools[i2].icon, disabled: tools[i2].disabled,
          tone: (state.darkSkin ? TOOL_TONE_DARK : TOOL_TONE)[tools[i2].id],
          badge: tools[i2].badge        // v0.10：剩余档位角标（之前漏传，角标根本没画出来）
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

      var bb = G.bbox([pts]);
      var px0 = placed ? mapX(bb[0]) : bb[0] * scale;
      var px1 = placed ? mapX(bb[2]) : bb[2] * scale;
      var py0 = placed ? mapY(bb[1]) : bb[1] * scale;
      var py1 = placed ? mapY(bb[3]) : bb[3] * scale;
      var pstyle = (state.save && state.save.pieceStyle) || 'classic';

      ctx.save();
      ctx.globalAlpha = alpha;
      // 投影 + 填充（v0.27：随板件样式切换填充质感）
      if (pstyle === 'neon') {
        // 霓虹：深色底 + 同色外发光
        ctx.shadowColor = def.color; ctx.shadowBlur = 18;
        path(); ctx.fillStyle = shadeHex(def.color, -0.55); ctx.fill();
        ctx.shadowBlur = 0;
      } else if (pstyle === 'glow') {
        // v0.28 荧光：亮色底 + 同色柔光（比 neon 亮、不压暗）
        ctx.shadowColor = def.color; ctx.shadowBlur = 13;
        path(); ctx.fillStyle = def.color; ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        shadow(C.PIECE.shadowBlur, C.PIECE.shadowDy, COL.shadowPiece);
        path(); ctx.fillStyle = def.color; ctx.fill();
        noShadow();
      }
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = alpha;
      // 样式化表面纹理（裁剪在板内）
      ctx.save();
      path(); ctx.clip();
      if (pstyle === 'candy' || pstyle === 'pastel') {
        // 糖果/马卡龙：斜向明→暗渐变，顶部加一层柔亮
        var cg = ctx.createLinearGradient(px0, py0, px1, py1);
        if (pstyle === 'candy') {
          cg.addColorStop(0, 'rgba(255,255,255,0.42)');
          cg.addColorStop(0.45, 'rgba(255,255,255,0.02)');
          cg.addColorStop(1, 'rgba(0,0,0,0.18)');
        } else {
          cg.addColorStop(0, 'rgba(255,255,255,0.30)');
          cg.addColorStop(0.6, 'rgba(255,255,255,0)');
          cg.addColorStop(1, 'rgba(255,255,255,0.12)');
        }
        ctx.fillStyle = cg; ctx.fillRect(px0, py0, px1 - px0, py1 - py0);
      } else if (pstyle === 'wood') {
        // 原木：沿 y 方向的细密木纹条 + 顶部受光
        var wg = ctx.createLinearGradient(px0, py0, px1, py0);
        wg.addColorStop(0, 'rgba(120,72,32,0.16)');
        wg.addColorStop(0.3, 'rgba(255,225,180,0.10)');
        wg.addColorStop(0.6, 'rgba(120,72,32,0.10)');
        wg.addColorStop(1, 'rgba(120,72,32,0.20)');
        ctx.fillStyle = wg; ctx.fillRect(px0, py0, px1 - px0, py1 - py0);
        ctx.strokeStyle = 'rgba(90,52,20,0.10)'; ctx.lineWidth = 1;
        for (var wy = py0 + 6; wy < py1; wy += 9) {
          ctx.beginPath(); ctx.moveTo(px0, wy); ctx.lineTo(px1, wy); ctx.stroke();
        }
      } else if (pstyle === 'crystal') {
        // v0.28 水晶：斜向高光带 + 棱面折线，玻璃通透感
        var crg = ctx.createLinearGradient(px0, py0, px1, py1);
        crg.addColorStop(0, 'rgba(255,255,255,0.72)');
        crg.addColorStop(0.28, 'rgba(255,255,255,0.06)');
        crg.addColorStop(0.55, 'rgba(255,255,255,0.30)');
        crg.addColorStop(1, 'rgba(0,40,90,0.20)');
        ctx.fillStyle = crg; ctx.fillRect(px0, py0, px1 - px0, py1 - py0);
        ctx.strokeStyle = 'rgba(255,255,255,0.42)'; ctx.lineWidth = 2;
        var cmx = (px0 + px1) / 2, cmy = (py0 + py1) / 2;
        ctx.beginPath(); ctx.moveTo(px0, cmy); ctx.lineTo(cmx, py0); ctx.lineTo(px1, cmy);
        ctx.moveTo(cmx, py0); ctx.lineTo(cmx, py1); ctx.stroke();
      } else if (pstyle === 'metal') {
        // v0.28 金属：多档明暗横带模拟拉丝反光
        var mg = ctx.createLinearGradient(px0, py0, px0, py1);
        mg.addColorStop(0, 'rgba(255,255,255,0.55)');
        mg.addColorStop(0.22, 'rgba(0,0,0,0.20)');
        mg.addColorStop(0.46, 'rgba(255,255,255,0.28)');
        mg.addColorStop(0.70, 'rgba(0,0,0,0.16)');
        mg.addColorStop(1, 'rgba(255,255,255,0.34)');
        ctx.fillStyle = mg; ctx.fillRect(px0, py0, px1 - px0, py1 - py0);
        ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1;
        for (var my = py0 + 3; my < py1; my += 4) {
          ctx.beginPath(); ctx.moveTo(px0, my); ctx.lineTo(px1, my); ctx.stroke();
        }
      } else if (pstyle === 'jade') {
        // v0.28 玉石：柔和云纹 + 边缘内阴影，温润感
        var jg = ctx.createRadialGradient(px0 + (px1 - px0) * 0.35, py0 + (py1 - py0) * 0.3, 4,
          (px0 + px1) / 2, (py0 + py1) / 2, Math.max(px1 - px0, py1 - py0));
        jg.addColorStop(0, 'rgba(255,255,255,0.42)');
        jg.addColorStop(0.6, 'rgba(255,255,255,0)');
        jg.addColorStop(1, 'rgba(10,70,50,0.22)');
        ctx.fillStyle = jg; ctx.fillRect(px0, py0, px1 - px0, py1 - py0);
        ctx.strokeStyle = 'rgba(255,255,255,0.24)'; ctx.lineWidth = 2.2;
        for (var jj = 0; jj < 3; jj++) {
          var jy = py0 + (py1 - py0) * (0.3 + jj * 0.22);
          ctx.beginPath(); ctx.moveTo(px0, jy);
          ctx.bezierCurveTo(px0 + (px1 - px0) * 0.3, jy - 12,
            px0 + (px1 - px0) * 0.6, jy + 12, px1, jy);
          ctx.stroke();
        }
      }
      // 通用顶部内高光（所有样式共用，保留原木块受光质感）
      var g = ctx.createLinearGradient(0, py0, 0, Math.min(py1, py0 + 14 * Math.max(scale, 0.5)));
      g.addColorStop(0, C.PIECE.highlight);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(px0, py0, px1 - px0, Math.max(4, py1 - py0));
      ctx.restore();

      // 描边（霓虹/荧光用亮色描边加深发光感，水晶用半透明白）
      path();
      var glowing = pstyle === 'neon' || pstyle === 'glow';
      ctx.lineWidth = glowing ? C.PIECE.strokeW + 0.6 : C.PIECE.strokeW;
      ctx.strokeStyle = glowing ? def.color
        : pstyle === 'crystal' ? 'rgba(255,255,255,0.85)'
        : pstyle === 'metal' ? 'rgba(255,255,255,0.55)'
        : (def.stroke || '#000000');
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.restore();
    }

    /* v0.28：深色背景特效下，卡纸仍保持浅色纸纹（保证板件辨识度），
     * 所以「画在浅色卡纸上的文字」必须固定用深色墨，不能跟随暗色板的浅字色。 */
    /* 卡纸上的墨色（教学提示 / 跳过 / 关号抬头都走这里）。
     * v0.28 固定深墨是为了修「深色特效下浅卡纸出现白字白底」—— 那时纸面仍是
     *   board_paper 浅色图，所以深色特效也算「浅卡纸」。
     * v0.38 夜间护眼不再铺浅色纸质图、改用深色纸面，深墨会反过来糊住，
     *   因此只有**深色皮肤**才切浅墨；深色特效（stars/nebula）纸面依旧浅，保持深墨。 */
    function inkOnCard(sub) {
      if (state.darkSkin) return sub ? (COL.textSub || '#B9C6E6') : (COL.text || '#E4EBF8');
      return sub ? '#5A687C' : '#2C3A4B';
    }

    /* 颜色明暗调整：pct>0 提亮、pct<0 压暗（板件霓虹样式用） */
    function shadeHex(hex, pct) {
      if (!hex || hex.charAt(0) !== '#') return hex || '#000000';
      var h = hex.slice(1);
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      var v = parseInt(h, 16), isNaNV = isNaN(v);
      if (isNaNV) return hex;
      var r = (v >> 16) & 255, g = (v >> 8) & 255, b = v & 255;
      function adj(c) { return Math.max(0, Math.min(255, Math.round(c + (pct > 0 ? (255 - c) * pct : c * pct)))); }
      return 'rgb(' + adj(r) + ',' + adj(g) + ',' + adj(b) + ')';
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

    /* ================= v0.20 提示绘制（单档，画在已上板件之上） =================
     * 一次提示 = 三件事一起给：目标位置（脉冲+金虚线）、要用哪一块（托盘圈或棋盘圈）、
     * 一条从那一块连到落点的虚线。没有档位、没有倒计时，亮到那块放对为止。
     * 关键：这一层在 board pieces 之后绘制——玩家先摆了几块也一定看得见提示。 */
    function drawHintGuide(lv) {
      var H = C.HINT, hh = state.hint;
      var hs = null;
      for (var q = 0; q < lv.solution.length; q++) if (lv.solution[q].id === hh.id) hs = lv.solution[q];
      if (!hs) return;
      var pz = pieceOf(hh.id);
      var onBoard = !!(pz && pz.onBoard);

      /* 这一块的落点脉冲 */
      var hp = G.toWorld(LOCAL[hs.id], hs).map(function (v) { return [w2d(v[0]), h2d(v[1])]; });
      var a = 0.30 + 0.22 * Math.sin(state.time / 180);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(hp[0][0], hp[0][1]);
      for (var h2 = 1; h2 < hp.length; h2++) ctx.lineTo(hp[h2][0], hp[h2][1]);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,185,61,' + a.toFixed(2) + ')';
      ctx.fill();
      /* 白色打底 + 金色虚线：浅卡纸上白描边是边界，深色板件上金线是主体 */
      ctx.lineJoin = 'round';
      ctx.lineWidth = 7;
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.stroke();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = COL.gold;
      ctx.setLineDash([10, 7]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      /* 那块已经上了板但没放对（位置/角度/翻面不对）：
       * 托盘里没有可标的块，就在棋盘上把它圈出来，再拉一条线指向正确落点。
       * 这是旧版最容易卡住的场景——玩家摆错了 3 块，按提示却毫无反应。 */
      if (onBoard) {
        var bp = piecePolyDesign(pz);
        ctx.save();
        ctx.beginPath();
        for (var b2 = 0; b2 < bp.length; b2++) {
          if (b2 === 0) ctx.moveTo(bp[b2][0], bp[b2][1]); else ctx.lineTo(bp[b2][0], bp[b2][1]);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(255,185,61,0.10)';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 5]);
        ctx.strokeStyle = 'rgba(255,159,28,0.95)';
        ctx.stroke();
        ctx.setLineDash([]);
        /* 从这块的质心指向目标落点：箭头落在落点边缘，不盖住落点本身 */
        var x0 = w2d(pz.x), y0 = h2d(pz.y), x1 = w2d(hs.x), y1 = h2d(hs.y);
        var dx = x1 - x0, dy = y1 - y0, dd = Math.hypot(dx, dy);
        if (dd > 40) {
          var ux = dx / dd, uy = dy / dd, ex = x1 - ux * 26, ey = y1 - uy * 26;
          ctx.beginPath();
          ctx.moveTo(x0 + ux * 18, y0 + uy * 18);
          ctx.lineTo(ex, ey);
          ctx.lineWidth = 3;
          ctx.strokeStyle = 'rgba(255,159,28,0.75)';
          ctx.setLineDash([9, 7]);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(ex, ey);
          ctx.lineTo(ex - ux * 14 - uy * 8, ey - uy * 14 + ux * 8);
          ctx.lineTo(ex - ux * 14 + uy * 8, ey - uy * 14 - ux * 8);
          ctx.closePath();
          ctx.fillStyle = 'rgba(255,159,28,0.95)';
          ctx.fill();
        }
        ctx.restore();
      }

      /* 小牌：
       *   · 那块还在托盘里 → 牌子放在落点形心「放这里」；
       *   · 那块已上板但摆歪 → 牌子挂在那块上方「移到虚线处」。
       * 后者的牌子不能放落点：玩家常常正好把歪的那块压在落点上，牌子会像
       * "写给这块板"的注释，反而误导（v0.11 第一版就是这么翻车的）。 */
      var label, lw, lh = 40, ly;
      if (onBoard) {
        var pTop = 1e9, pBot = -1e9;
        var pbp = piecePolyDesign(pz);
        for (var b3 = 0; b3 < pbp.length; b3++) {
          if (pbp[b3][1] < pTop) pTop = pbp[b3][1];
          if (pbp[b3][1] > pBot) pBot = pbp[b3][1];
        }
        label = H.labels.move; lw = 138;
        ly = pTop - 28;
        if (ly < LAY.BOARD.y + 30) ly = pBot + 28;
      } else {
        /* v0.20：落点小牌挪到目标轮廓的上/下方，不再压在轮廓正中 ——
         * 压在正中会把刚高亮出来的形状盖掉一半，玩家反而看不清要放什么形状。 */
        var cx = 0, cy = 0, hpTop = 1e9, hpBot = -1e9;
        for (var c2 = 0; c2 < hp.length; c2++) {
          cx += hp[c2][0]; cy += hp[c2][1];
          if (hp[c2][1] < hpTop) hpTop = hp[c2][1];
          if (hp[c2][1] > hpBot) hpBot = hp[c2][1];
        }
        label = H.labels.place; lw = 96;
        cx /= hp.length; cy /= hp.length;
        ly = hpTop - 26;
        if (ly < LAY.BOARD.y + 30) ly = hpBot + 26;
      }
      var bTop = LAY.BOARD.y + 26, bBot = LAY.BOARD.y + LAY.BOARD.size - 26;
      var bL = LAY.BOARD.x + lw / 2 + 8, bR = LAY.BOARD.x + LAY.BOARD.size - lw / 2 - 8;
      var lx = onBoard ? w2d(pz.x) : cx;
      lx = Math.max(bL, Math.min(bR, lx));
      ly = Math.max(bTop, Math.min(bBot, ly));
      rr(lx - lw / 2, ly - lh / 2, lw, lh, lh / 2);
      ctx.fillStyle = 'rgba(44,58,75,0.86)';
      ctx.fill();
      text(label, lx, ly + 1, 21, '#FFFFFF', 'center', '600');

      /* 从托盘那块拉一条引导虚线，省掉"眼睛在棋盘和托盘之间来回找" */
      if (!onBoard) {
        var sp0 = SLOT_POS[pz.slot];
        ctx.save();
        ctx.setLineDash([10, 10]);
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(255,159,28,0.55)';
        ctx.beginPath();
        ctx.moveTo(sp0.x, sp0.y);
        ctx.lineTo(w2d(hs.x), h2d(hs.y));
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    }

    /* v0.20：托盘上那一块的描边 + 「用这块」小牌（每次都标，不再分档） */
    function drawHintTray() {
      var hh = state.hint;
      if (!hh) return;
      var p = pieceOf(hh.id);
      if (!p || p.onBoard) return;                 // 已经拿到棋盘上了就不再标托盘
      var pts = trayPoly(p);
      var a = 0.6 + 0.35 * Math.sin(state.time / 200);
      ctx.save();
      ctx.beginPath();
      for (var i = 0; i < pts.length; i++) {
        if (i === 0) ctx.moveTo(pts[i][0], pts[i][1]); else ctx.lineTo(pts[i][0], pts[i][1]);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,185,61,0.16)';
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(255,159,28,' + a.toFixed(2) + ')';
      ctx.stroke();

      /* 小牌：放在这块板的正上方；若太高会顶到进度条就压到下方 */
      var sp = SLOT_POS[p.slot];
      var minY = Math.min.apply(null, pts.map(function (v) { return v[1]; }));
      var maxY = Math.max.apply(null, pts.map(function (v) { return v[1]; }));
      var py = minY - 34;
      if (py < C.LAYOUT.PROGRESS.y + 40) py = maxY + 34;
      var pw = 132, ph = 46;
      rr(sp.x - pw / 2, py - ph / 2, pw, ph, ph / 2);
      ctx.fillStyle = 'rgba(44,58,75,0.88)';
      ctx.fill();
      text(C.HINT.labels.use, sp.x, py + 1, 24, '#FFFFFF', 'center', '600');
      ctx.restore();
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

    /* v0.8：把某关的成品按解算结果画成彩色图案（等比缩放进 maxSide 方框）
     * 结算页不再只报「拼好了」，而是把玩家刚拼出的形状原样展示出来。 */
    function drawSolved(lv, cx, cy, maxSide, k) {
      var polys = [], i, j, minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
      for (i = 0; i < lv.solution.length; i++) {
        var st = lv.solution[i];
        var wp = G.toWorld(LOCAL[st.id], st);
        polys.push({ id: st.id, pts: wp });
        for (j = 0; j < wp.length; j++) {
          if (wp[j][0] < minX) minX = wp[j][0];
          if (wp[j][0] > maxX) maxX = wp[j][0];
          if (wp[j][1] < minY) minY = wp[j][1];
          if (wp[j][1] > maxY) maxY = wp[j][1];
        }
      }
      var bw = Math.max(1, maxX - minX), bh = Math.max(1, maxY - minY);
      var s = maxSide / Math.max(bw, bh) * (k || 1);
      var ox = cx - bw * s / 2 - minX * s, oy = cy - bh * s / 2 - minY * s;
      for (i = 0; i < polys.length; i++) {
        var pc = (DS.pieces && DS.pieces[polys[i].id]) || {};
        ctx.beginPath();
        for (j = 0; j < polys[i].pts.length; j++) {
          var qx = ox + polys[i].pts[j][0] * s, qy = oy + polys[i].pts[j][1] * s;
          if (j === 0) ctx.moveTo(qx, qy); else ctx.lineTo(qx, qy);
        }
        ctx.closePath();
        ctx.save();
        shadow(10, 3, 'rgba(44,58,75,0.18)');
        ctx.fillStyle = pc.color || COL.gold;
        ctx.fill();
        noShadow();
        ctx.restore();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.stroke();
      }
      return { s: s, w: bw * s, h: bh * s };
    }

    /* 连胜条上的小三件：奖杯 / 宝箱 */
    function drawTrophy(cx, cy, k) {
      ctx.save();
      ctx.translate(cx, cy); ctx.scale(k, k);
      ctx.lineWidth = 2; ctx.strokeStyle = '#D98A00'; ctx.fillStyle = '#FFC53D';
      // 杯身
      ctx.beginPath();
      ctx.moveTo(-14, -16); ctx.lineTo(14, -16);
      ctx.quadraticCurveTo(14, 4, 0, 7);
      ctx.quadraticCurveTo(-14, 4, -14, -16);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // 双耳
      ctx.beginPath(); ctx.arc(-15, -8, 6, Math.PI * 0.4, Math.PI * 1.55); ctx.stroke();
      ctx.beginPath(); ctx.arc(15, -8, 6, Math.PI * 1.45, Math.PI * 0.6); ctx.stroke();
      // 柱与底座
      ctx.beginPath(); ctx.moveTo(0, 7); ctx.lineTo(0, 12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-9, 15); ctx.lineTo(9, 15); ctx.stroke();
      ctx.restore();
    }
    function drawChest(cx, cy, k, lit) {
      ctx.save();
      ctx.translate(cx, cy); ctx.scale(k, k);
      ctx.lineWidth = 2.4; ctx.strokeStyle = '#B4690E';
      // 箱体
      rr(-22, -8, 44, 26, 6);
      ctx.fillStyle = '#FF9F1C'; ctx.fill(); ctx.stroke();
      // 箱盖
      rr(-22, -20, 44, 14, 6);
      ctx.fillStyle = '#FFC53D'; ctx.fill(); ctx.stroke();
      // 锁扣
      rr(-6, -8, 12, 12, 3);
      ctx.fillStyle = lit ? '#FFF3D0' : '#FFE2A6'; ctx.fill(); ctx.stroke();
      ctx.restore();
    }

    /* 连胜进度：本轮第 n/step 关，进度条走满即开箱 */
    function drawStreakBar(y, streak) {
      var W = C.WIN, ST = C.STREAK;
      var n = ((streak - 1) % ST.step) + 1;
      var x0 = 154, x1 = 588, bh = 38, by = y - bh / 2;
      // 奖杯 + 文字
      drawTrophy(W.streakX0 + 8, y - 8, 1.15);
      text('连胜', W.streakX0 + 8, y + 26, 17, '#B4690E', 'center', '700');
      // 槽
      rr(x0, by, x1 - x0, bh, bh / 2);
      ctx.fillStyle = 'rgba(214,205,192,0.55)'; ctx.fill();
      // 进度
      var pw = (x1 - x0) * n / ST.step;
      if (pw > bh) {
        ctx.save();
        rr(x0, by, pw, bh, bh / 2);
        ctx.clip();
        var g = ctx.createLinearGradient(x0, 0, x1, 0);
        g.addColorStop(0, '#FFD24A');
        g.addColorStop(1, '#FFB01F');
        ctx.fillStyle = g;
        ctx.fillRect(x0, by, pw, bh);
        ctx.restore();
      }
      // 数值（本轮进度居中；刚到里程碑时在条内右端补一条 +60，不往卡片边缘外挤）
      text(n + '/' + ST.step, (x0 + x1) / 2, y + 1, 22, '#8A5A1A', 'center', '700');
      if (state.streakGain > 0) {
        text('+' + state.streakGain, x1 - 26, y + 1, 20, '#8A5A1A', 'right', '700');
      }
      // 宝箱
      drawChest(W.streakX1, y, 1, n >= ST.step);
    }

    function renderResult() {
      var W = C.WIN;
      ctx.fillStyle = COL.mask;
      ctx.fillRect(0, 0, C.DESIGN.w, DH());
      /* v0.17：结算会现场加巧币/体力，余额就摆在屏幕顶部（与对局页同位置），
       * 不用等玩家退回主页才发现数字变了。 */
      playHud(hudAnchorY());
      var appear = Math.min(1, state.resT / C.ANIM.panelFade);
      var e = G.easeOutCubic(appear);
      ctx.save();
      ctx.globalAlpha = e;
      var cy = W.cy + (1 - e) * 24;
      var dy = cy - W.cy;
      drawCard(C.DESIGN.w / 2, cy, W.cardW, W.cardH, 34);
      var lv = LEVELS[state.levelIdx];
      var last = state.levelIdx === LEVELS.length - 1;

      /* ---- 顶部：连胜进度（参考用户截图：奖杯 + 进度条 + 宝箱） ---- */
      drawStreakBar(W.streakY + dy, state.save.streak || 0);

      /* ---- 标题（v0.8 缩小，让位给成品图案） ---- */
      text(last ? (COMPLETE_TITLE || '四巧板全部完成') : '拼好了！',
        C.DESIGN.w / 2, W.titleY + dy, W.titleSize, COL.text, 'center', '700');
      /* 有关名才画副标题：四巧板 30 关里 28 关无名称，占位文案会顶到图案框 */
      var subTxt = last ? (COMPLETE_SUB || '七巧板即将开启') : lv.name;
      if (subTxt) text(subTxt, C.DESIGN.w / 2, W.nameY + dy, W.nameSize, COL.textSub, 'center');

      /* ---- 成品图案：白底框 + 四块板原色，进场缩放弹出 ---- */
      var boxW = W.shapeBox, boxH = W.shapeBox, bx = C.DESIGN.w / 2, byc = W.shapeY + dy;
      ctx.save();
      shadow(16, 6, 'rgba(44,58,75,0.10)');
      rr(bx - boxW / 2, byc - boxH / 2, boxW, boxH, 26);
      ctx.fillStyle = 'rgba(255,255,255,0.94)'; ctx.fill();
      noShadow(); ctx.restore();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,185,61,0.55)';
      rr(bx - boxW / 2, byc - boxH / 2, boxW, boxH, 26);
      ctx.stroke();

      /* v0.24：完成感不再靠「拼好了！」这行字撑（标题保留不动），
       * 改成图案本体呼吸发光。做法是三层"越靠外越淡"的金色描边套在图案框上：
       * 图案几乎填满整个框，框内没有留白做渐变（试过径向金光，结果是整块糊黄），
       * 所以把光放到框外沿，明暗呼吸 —— 远看就是这块拼好的图案在发亮。
       * 周期 1.9s，cos 做 0→1→0 往返；进场 120ms 后才起，避开图案弹出的缩放。 */
      if (state.resT > 120) {
        var glowPh = ((state.resT - 120) % 1900) / 1900;
        var pulse = 0.5 - 0.5 * Math.cos(glowPh * Math.PI * 2);
        /* ① 环形辉光：内圈透明、图案边缘处最亮、向外淡出。
         * 中心必须透明 —— 试过中心亮的径向光，整块白底被染黄，像脏了。
         * 做成横向椭圆（rx 0.85 / ry 0.55 个框边长）：卡片上下几乎没有余量
         * （框顶到关卡名 18px、框底到星级 11px），垂直方向扩散会压字，
         * 横向左右各有 210px，光就往两侧散。 */
        var gRx = boxW * 0.85, gRy = boxW * 0.55;
        ctx.save();
        ctx.translate(bx, byc);
        ctx.scale(1, gRy / gRx);
        var gRad = ctx.createRadialGradient(0, 0, boxW * 0.30, 0, 0, gRx);
        gRad.addColorStop(0, 'rgba(255,208,110,0)');
        gRad.addColorStop(0.45, 'rgba(255,200,92,' + (0.16 + 0.16 * pulse).toFixed(3) + ')');
        gRad.addColorStop(0.74, 'rgba(255,186,60,' + (0.09 + 0.09 * pulse).toFixed(3) + ')');
        gRad.addColorStop(1, 'rgba(255,186,60,0)');
        ctx.fillStyle = gRad;
        ctx.fillRect(-gRx, -gRx, gRx * 2, gRx * 2);
        ctx.restore();
        /* ② 三层描边：负责勾出光的"边"，越靠外越淡；pad 收到 10px 以内，
         * 免得压到关卡名（框顶 -18px 就是那行字） */
        var halos = [[10, 8, 0.050], [5, 4, 0.100], [2.5, 1.5, 0.240]];
        ctx.save();
        for (var hi = 0; hi < halos.length; hi++) {
          var padv = halos[hi][1] + 1.6 * pulse;
          ctx.lineWidth = halos[hi][0];
          ctx.strokeStyle = 'rgba(255,190,72,' +
            (halos[hi][2] + halos[hi][2] * 1.2 * pulse).toFixed(3) + ')';
          rr(bx - boxW / 2 - padv, byc - boxH / 2 - padv,
            boxW + padv * 2, boxH + padv * 2, 26 + padv);
          ctx.stroke();
        }
        ctx.restore();
        /* 四角星芒：四颗小星相位错开闪烁，让"发光"不只是明暗，还有星点游走。
         * 位置压在光带上（框角外侧 10px），不与图案和星级抢视线。 */
        var cornerX = [-1, 1, 1, -1], cornerY = [-1, -1, 1, 1];
        for (var si = 0; si < 4; si++) {
          var sph = ((glowPh + si * 0.25) % 1);
          var sp = 0.5 - 0.5 * Math.cos(sph * Math.PI * 2);
          if (sp < 0.14) continue;
          ctx.save();
          ctx.globalAlpha = 0.30 + 0.65 * sp;
          drawStar(bx + cornerX[si] * (boxW / 2 + 10), byc + cornerY[si] * (boxH / 2 + 10),
            2.5 + 4 * sp, true, 1);
          ctx.restore();
        }
      }
      var pop = G.easeOutBack(Math.min(1, Math.max(0, (state.resT - 140) / 460)));
      drawSolved(lv, bx, byc, W.shapeMax, 0.84 + 0.16 * pop);

      /* ---- 星级（位置让给图案，半径 40→24） ---- */
      for (var i = 0; i < 3; i++) {
        var on = state.result && i < state.result.stars;
        var shown = state.starShown > i;
        var sc = 1;
        if (shown) {
          var st = Math.min(1, (state.resT - i * C.ANIM.starStep) / 160);
          sc = 0.6 + 0.55 * G.easeOutBack(st);
          if (st >= 1) sc = 1;
        }
        drawStar(C.DESIGN.w / 2 - W.starGap + i * W.starGap, W.starY + dy, W.starR, on && shown, on ? sc : 1);
      }

      // 数据
      var sec = Math.floor(state.result ? state.result.time : 0);
      var mm = Math.floor(sec / 60), ss = sec % 60;
      text('用时', C.DESIGN.w / 2 - 120, W.statLabelY + dy, 22, COL.textSub, 'center');
      text((mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss,
        C.DESIGN.w / 2 - 120, W.statValueY + dy, 30, COL.text, 'center', '600');
      text('步数', C.DESIGN.w / 2 + 120, W.statLabelY + dy, 22, COL.textSub, 'center');
      text(String(state.result ? state.result.steps : 0),
        C.DESIGN.w / 2 + 120, W.statValueY + dy, 30, COL.text, 'center', '600');

      /* ---- v0.23：奖励条（首通 / 升星补差都发巧币，可当场看视频 ×5） ----
       * 放在数据行与主按钮之间，是一条"横向说明条"而不是第四个主按钮：
       * 左侧写这一局到底给了什么，右侧才是 ×5 入口，避免整条误触播广告。 */
      var rw = W.rewardW, rh = W.rewardH, ry = W.rewardY + dy;
      var res = state.result || { first: false, gain: 0, adUsed: false };
      var mul = C.ECON.coinWinAdMul || 5;
      var adLeft = adLvLeft();       // v0.35：本关还剩几次看视频（提示/复活/×5 共用）
      /* v0.40：条底色的判据从 first 改成「这一局到底有没有进账」——
       * 升星补差同样是真的拿到钱，用灰条会让人以为白打了一局。 */
      var hasGain = (res.gain || 0) > 0;
      ctx.save();
      rr(C.DESIGN.w / 2 - rw / 2, ry - rh / 2, rw, rh, rh / 2);
      ctx.fillStyle = hasGain ? 'rgba(255,185,61,0.14)' : 'rgba(120,130,146,0.10)';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = hasGain ? 'rgba(255,159,28,0.55)' : 'rgba(120,130,146,0.20)';
      ctx.stroke();
      ctx.restore();

      /* v0.24：这条只剩"这一局给了什么"一句话，整条居中；
       * v0.40 文案分四种：首通 / 升星（各含未翻倍 / 已翻倍）、已通关无提升。
       * v0.43：去掉「补差 +N」的说法与「本关视频 x/3」——
       *   · 玩家只关心这一局进账多少，不需要看到"补差"这种内部记账口径；
       *   · 视频额度由下面 ×5 按钮自己表达（用完显示「本关已看完」），
       *     奖励条再写一遍既挤又重复。 */
      var gainTxt, gainCol;
      if (!hasGain) {
        gainTxt = '已通过 · 星级未提升，无奖励';
        gainCol = COL.textSub;
      } else if (res.adUsed) {
        gainTxt = (res.first ? '首通奖励 +' : ('升到 ' + starTag(res) + ' · +'))
          + (res.gain * mul) + ' 巧币 · 已翻 ' + mul + ' 倍';
        gainCol = COL.goldDeep;
      } else {
        gainTxt = (res.first ? '首通奖励 +' : ('升到 ' + starTag(res) + ' · +'))
          + res.gain + ' 巧币';
        gainCol = COL.text;
      }
      text(gainTxt, C.DESIGN.w / 2, ry + 1, 23, gainCol, 'center', '600');

      /* ---- 主操作排（v0.24）：[看视频 ×5] [下一关 / 返回] 并排 ----
       * 原来 ×5 缩在奖励条末端（宽 160、高 42），既小又和"这局给了什么"
       * 挤在同一行，主次不清。现在奖励条独占一行讲结果，动作统一收到这一排：
       * 有 ×5 可领时两枚并排（排宽 552 居中），否则主按钮单独 360 居中。 */
      /* v0.35：本关看视频额度用完时，×5 按钮**留在原位但置灰**——
       * 直接消失会让「下一关」突然占满整排，玩家以为是界面错乱。 */
      /* v0.40：有进账（首通或升星补差）就给 ×5 入口，判定同上 */
      var showMul = hasGain && !res.adUsed;
      var canAd = showMul && adLeft > 0;
      /* v0.34：两枚主按钮同宽同高（W.primaryW === W.adMulW、共用 W.primaryH），
       * 单独一枚时也不再放大到 360，避免「有广告时小、没广告时大」来回跳。 */
      var nextW = W.primaryW, nextX = C.DESIGN.w / 2, adX = 0;
      if (showMul) {
        var rowW = W.adMulW + W.btnGap + W.primaryW;
        var rowX0 = C.DESIGN.w / 2 - rowW / 2;
        adX = rowX0 + W.adMulW / 2;
        nextX = rowX0 + W.adMulW + W.btnGap + W.primaryW / 2;
        nextW = W.primaryW;
      }

      if (showMul) {
        /* 用 danger 而不是 primary：全 App 的「看视频」都是橙红（提示面板、
         * 复活弹窗），保持"红=看广告"的一致语义；也和金色的「下一关」区分开。 */
        var bMul = { id: 'win_ad5', x: adX, y: W.primaryY + dy, w: W.adMulW, h: W.primaryH,
          label: canAd ? ('看视频 ×' + mul) : '本关已看完',
          variant: 'danger', size: canAd ? 22 : 20, disabled: !!state.adSim || !canAd };
        if (canAd && !state.adSim) addHit(bMul.x, bMul.y, bMul.w, bMul.h, 'win_ad5');
        drawButton(bMul);
      }

      var b1 = { id: last ? 'to_list' : 'next', x: nextX, y: W.primaryY + dy,
        w: nextW, h: W.primaryH, label: last ? '返回' : '下一关', variant: 'primary', size: 30 };
      addHit(b1.x, b1.y, b1.w, b1.h, b1.id);
      drawButton(b1);

      // 第二排：分享图案 / 排行榜
      var b2 = { id: 'share_pattern', x: C.DESIGN.w / 2 - 118, y: W.row2Y + dy,
        w: 216, h: W.row2H, label: '分享图案', variant: 'secondary', size: 24, icon: 'share' };
      addHit(b2.x, b2.y, b2.w, b2.h, 'share_pattern');
      drawButton(b2);
      var b3 = { id: 'open_rank', x: C.DESIGN.w / 2 + 118, y: W.row2Y + dy,
        w: 216, h: W.row2H, label: '排行榜', variant: 'secondary', size: 24, icon: 'rank' };
      addHit(b3.x, b3.y, b3.w, b3.h, 'open_rank');
      drawButton(b3);

      // 第三排：重玩 / 返回（小号文字按钮）
      var b4 = { id: 'replay', x: last ? C.DESIGN.w / 2 : C.DESIGN.w / 2 - 108,
        y: W.row3Y + dy, w: 200, h: W.row3H, label: '重玩', variant: 'ghost', size: 22 };
      addHit(b4.x, b4.y, b4.w, b4.h, 'replay');
      drawButton(b4);
      if (!last) {
        var b5 = { id: 'to_list', x: C.DESIGN.w / 2 + 108, y: W.row3Y + dy,
          w: 200, h: W.row3H, label: '返回', variant: 'ghost', size: 22 };
        addHit(b5.x, b5.y, b5.w, b5.h, 'to_list');
        drawButton(b5);
      }
      ctx.restore();
      /* v0.23：结算页现在也能播激励视频（×5），模拟广告的进度条必须画在这一层 */
      adLayer();
      /* 真广告走 state.adWait（没有进度层），这几秒里也不许点穿到「下一关 / 重玩」，
       * 否则玩家可能在看广告期间离开结算页，回调回来时 state.result 已经是 null。 */
      if (state.adSim || state.adWait) hits = [];
    }

    /* ---------------- v0.8 排行榜 ---------------- */
    /* 主线榜 = 通关关数；连胜榜 = 历史最高连胜（v0.18 改口径，见 config.STREAK 注释）；
     * 好友榜 = 微信开放数据域读到的好友通关数（不走云开发）。 */
    function rankValue(tab) {
      var s = state.save;
      if (tab === 1) return Math.max(s.bestStreak || 0, s.streak || 0);
      var n = 0;
      for (var k in s.starOf) if ((s.starOf[k] || 0) > 0) n++;
      return n;
    }
    /* v0.9：榜单数据只认云端。useMock 只在本地调试时给出示例，默认关闭；
     * 云端没数据时返回空榜，界面显示「还没有人上榜」而不是编造名次。 */
    function rankData() {
      var tab = state.rankTab, raw = [];
      if (C.RANK.useMock) raw = (C.RANK.mock[tab] || []).slice();
      /* v0.18：好友榜绝不读 state.rankList —— 那份缓存是云榜（主线/连胜）的，
       * 旧版就是被好友榜这次请求覆盖成空列表，切回来才变成「加载失败」。 */
      else if (tab !== 2 && state.rankList && state.rankList.list) raw = state.rankList.list;

      var list = [];
      for (var i = 0; i < raw.length; i++) {
        var r = raw[i];
        list.push({
          n: r.n || r.nick || '玩家',
          v: (r.v !== undefined ? r.v : r.value) || 0,
          c: r.c || r.color || RANK_COLORS[i % RANK_COLORS.length],
          a: r.a || r.avatar || '',
          me: !!r.me
        });
      }
      var mine = null, rank = 0;
      for (var j = 0; j < list.length; j++) if (list[j].me) { mine = list[j]; rank = j + 1; }
      if (!mine) {
        var mc = state.rankList && state.rankList.me;
        mine = { n: (mc && mc.nick) || meNick(), v: rankValue(tab), me: true,
          c: COL.gold, a: meAvatarUrl() };
        rank = (mc && mc.rank) || (list.length + 1);
      }
      var rows = C.RANK.list.rows || 7;
      var top = list.slice(0, rows);
      var inTop = false;
      for (var k = 0; k < top.length; k++) if (top[k].me) inTop = true;
      return { top: top, mine: mine, rank: rank, inTop: inTop, empty: list.length === 0 };
    }
    var RANK_COLORS = ['#FF8A5B', '#4FA8E0', '#63C88B', '#A87BE8', '#D96A9B', '#FFC53D', '#3FB8B0'];

    function rankRow(item, y, idx, highlight) {
      var L = C.RANK.list, x0 = L.x, w = L.w, h = L.rowH;
      ctx.save();
      if (highlight) shadow(10, 4, hexA(COL.gold || '#FFB93D', 0.20));
      rr(x0, y - h / 2, w, h, 16);
      /* v0.47：行底走语义色 —— 旧版写死 '#FDE7DF' / 'rgba(246,243,238,0.95)'，
       * 深色皮肤下白字压浅米底，整行昵称直接消失（用户截图就是这个问题）。 */
      ctx.fillStyle = highlight ? COL.surfaceHi : COL.surface;
      ctx.fill();
      noShadow();
      ctx.restore();
      // 名次
      if (idx < 3 && !highlight) {
        var medal = ['#F5B73D', '#C9D3DD', '#E0A276'][idx];
        ctx.beginPath(); ctx.arc(x0 + 42, y, 23, 0, Math.PI * 2);
        ctx.fillStyle = medal; ctx.fill();
        /* 金银铜三色都偏亮，名次字统一用深墨色（浅色皮肤下原来是白字，
         * 银牌 #C9D3DD 上的白字只有 1.5:1，本来就偏糊） */
        text(String(idx + 1), x0 + 42, y + 1, 24, '#3A2A12', 'center', '700');
      } else {
        /* 自己那行显示真实名次（榜尾固定条）；名次过百按「99+」收敛宽度 */
        var rk = idx + 1;
        text(String(rk > 99 ? '99+' : rk), x0 + 42, y + 1, rk > 99 ? 20 : 24,
          highlight ? COL.accentText : COL.textSub, 'center', '700');
      }
      // 头像：v0.14 起优先用微信头像，取不到图仍退回「首字 + 底色」
      drawAvatar(x0 + 96, y, C.PLAYER.rankAvatarR, item.n, item.a, item.c || COL.gold);
      // 名字
      text(item.n, x0 + 136, y + 1, 24, COL.text, 'left', highlight ? '700' : '500');
      // 数值
      var unit = C.RANK.unit[state.rankTab] || '关';
      text(item.v + ' ' + unit, x0 + w - 28, y + 1, 26, highlight ? COL.accentText : COL.text, 'right', '700');
    }

    /* v0.18：好友榜。真机走开放数据域（离屏画布整块贴进来）；
     * 浏览器预览没有关系链 —— 调试时用 useMock 画同一套行，正式包不会走到。 */
    function renderFriendRank(d, ry) {
      var L = C.RANK.list, img = null;
      if (friendOn() && state.friendT) {
        try { img = env.friend.image(); } catch (e) { img = null; }
      }
      if (img) {
        ctx.drawImage(img, L.x, ry, L.w, L.h);
        text(C.RANK.friendNote, C.DESIGN.w / 2, ry + L.h + 32, 18, COL.textSub, 'center');
        return;
      }
      if (C.RANK.useMock) {
        /* 与开放数据域同一规矩：自己不在前 7 就顶掉第 7 名，占最后一行。
         * 否则 7 行 + 我的排名 = 8 行，会压到下面的说明文字。 */
        var lst = d.top.slice(0);
        if (!d.inTop && lst.length >= L.rows) lst = lst.slice(0, L.rows - 1);
        for (var i = 0; i < lst.length; i++) {
          rankRow(lst[i], ry + i * L.step, i, !!lst[i].me);
        }
        if (!d.inTop) rankRow(d.mine, ry + lst.length * L.step + 6, d.rank - 1, true);
        text('预览示例 · 真机显示微信好友', C.DESIGN.w / 2, ry + L.h + 32, 18, COL.textSub, 'center');
        return;
      }
      text('好友榜要在微信小游戏里看', C.DESIGN.w / 2, ry + 120, 26, COL.text, 'center', '600');
      text('浏览器预览拿不到微信好友关系链', C.DESIGN.w / 2, ry + 164, 19, COL.textSub, 'center');
      text('真机上会自动读取已授权好友的通关数', C.DESIGN.w / 2, ry + 196, 19, COL.textSub, 'center');
    }

    function renderRank() {
      var R = C.RANK;
      var W = 660, H = 900, cy = 812;
      ctx.fillStyle = COL.mask;
      ctx.fillRect(0, 0, C.DESIGN.w, DH());
      var e = G.easeOutCubic(Math.min(1, state.rankT / 180));
      ctx.save();
      ctx.globalAlpha = e;
      var y0 = cy + (1 - e) * 20;
      drawCard(C.DESIGN.w / 2, y0, W, H, 34);
      text('排行榜', C.DESIGN.w / 2, 425 + (y0 - cy), 40, COL.text, 'center', '700');

      // 页签
      var tw = 176, gap = 10, tx0 = C.DESIGN.w / 2 - (tw * 3 + gap * 2) / 2;
      for (var i = 0; i < 3; i++) {
        var tx = tx0 + i * (tw + gap) + tw / 2, ty = 495 + (y0 - cy);
        rr(tx - tw / 2, ty - 27, tw, 54, 27);
        ctx.fillStyle = state.rankTab === i ? COL.gold : COL.chipOff;
        ctx.fill();
        /* v0.47：选中页签的字色改用 COL.btnText（深棕，浅色皮肤下与旧值 #7A4A00 一致），
         * 未选中的字色本来是 COL.textSub —— 它跟着皮肤变，浅底却不跟着变，深色下就糊了。
         * 现在底走 chipOff、字走 textSub，两边都随皮肤，凑成一对。 */
        text(R.tabs[i], tx, ty + 1, 24, state.rankTab === i ? COL.btnText : COL.textSub, 'center', '700');
        addHit(tx, ty, tw + 12, 80, 'rank_t' + i);
      }

      // 榜单
      var L = C.RANK.list;
      var d = rankData();
      var ry = L.top + (y0 - cy), step = L.step;
      if (state.rankTab === 2) {
        renderFriendRank(d, ry);
      } else if (state.rankLoading && !d.top.length) {
        text('正在加载榜单…', C.DESIGN.w / 2, ry + 120, 24, COL.textSub, 'center');
      } else if (state.rankErr && !d.top.length) {
        /* v0.18：错误优先于「未开启云同步」——能报出具体原因的，就不该用一句
         * 笼统的降级文案盖过去（这张图也正是用户看到的「数据直接加载失败」）。 */
        text('榜单加载失败', C.DESIGN.w / 2, ry + 96, 26, COL.text, 'center', '600');
        text(state.rankErr, C.DESIGN.w / 2, ry + 140, 19, COL.textSub, 'center');
        /* 给一条活路。以前失败只能关掉重开，重开还是那次失败的缓存 */
        var bR = { id: 'rank_retry', x: C.DESIGN.w / 2, y: ry + 224, w: 260, h: 76,
          label: '重新加载', variant: 'primary', size: 26 };
        addHit(bR.x, bR.y, bR.w, bR.h, 'rank_retry');
        drawButton(bR);
      } else if (!cloudOn() && !C.RANK.useMock && !state.rankList) {
        text('未开启云同步', C.DESIGN.w / 2, ry + 96, 26, COL.text, 'center', '600');
        /* 给玩家看的话，不是给开发看的：只在真机上永远不该出现在这里 */
        text('当前进度只保存在这台手机上', C.DESIGN.w / 2, ry + 140, 19, COL.textSub, 'center');
        text('开启后可跨设备同步并与全服玩家比进度', C.DESIGN.w / 2, ry + 172, 19, COL.textSub, 'center');
      } else if (d.empty) {
        text('还没有人上榜', C.DESIGN.w / 2, ry + 96, 26, COL.text, 'center', '600');
        text('拼完一关就会出现在这里', C.DESIGN.w / 2, ry + 140, 19, COL.textSub, 'center');
        /* 空榜时仍把自己那一行画出来，玩家能看到自己的进度 */
        rankRow(d.mine, ry + 200, Math.max(0, d.rank - 1), true);
      } else {
        /* 自己进了前 7 也要高亮（旧版只高亮榜尾那条，自己排第 4 会被当成路人） */
        for (var j = 0; j < d.top.length; j++) {
          rankRow(d.top[j], ry + j * step, j, !!d.top[j].me);
        }
        // 自己不在前 7 → 底部固定一条「我的排名」
        if (!d.inTop) {
          rankRow(d.mine, ry + d.top.length * step + 6, d.rank - 1, true);
        }
      }
      text(C.RANK.useMock ? '示例榜单 · 仅供本地调试'
        : (state.rankTab === 2) ? (friendOn() ? '好友榜 · 数据来自微信关系链'
          : '浏览器预览 · 看不到微信好友')
        : (state.rankErr) ? (d.top.length ? '网络不稳定 · 显示的是上次的榜单' : '加载失败 · 可点上面按钮重试')
        : (state.rankTab === 1) ? '按历史最高连胜排名 · 每关在一段连胜里只计一次'
        : ((cloudOn() || state.rankList) ? '全服实时榜 · 数据来自云开发' : '本地预览 · 未连接云端'),
        C.DESIGN.w / 2, 1222 + (y0 - cy), 18, COL.textSub, 'center');

      // 关闭（卡片外的圆形按钮，参考图同位置）
      ctx.beginPath(); ctx.arc(C.DESIGN.w / 2, 1300, 38, 0, Math.PI * 2);
      /* v0.47：这枚钮浮在遮罩上，不再是"白卡上的一块白"，改走 COL.disc ——
       * 深色皮肤下换成半透明白纱，里面的 × 用 COL.text（近白）才看得见。 */
      ctx.fillStyle = COL.disc; ctx.fill();
      drawIcon('close', C.DESIGN.w / 2, 1300, COL.text, 1.0);
      addHit(C.DESIGN.w / 2, 1300, 100, 100, 'close_rank');
      ctx.restore();
    }

    /* 打开排行榜：记住来源，关闭时原路返回 */
    function openRank(from) {
      state.rankBack = from || null;
      state.overlay = 'rank';
      state.rankT = 0;
      /* v0.18：每次打开都刷新当前页签。有缓存就先显缓存，
       * 不再像旧版那样「有 rankList 就不拉了」——那样榜单永远是上次的。 */
      selectRankTab(state.rankTab);
    }

    /* ---------------- v0.8 分享成品图案 ---------------- */
    function sharePattern() {
      var lv = LEVELS[state.levelIdx];
      var name = lv.name || ('第 ' + (state.levelIdx + 1) + ' 关');
      var stars = state.result ? state.result.stars : 0;
      var starTxt = stars ? ' ' + new Array(stars + 1).join('★') : '';
      var title = '我在方寸巧拼拼出了「' + name + '」' + starTxt + '，来挑战一下？';
      if (env.share) {
        try { env.share({ title: title, text: title, capture: true }); } catch (err) { /* 静默 */ }
      }
      toast('已唤起分享');
    }


    function renderSettings() {
      var P = C.PLAYER;
      ctx.fillStyle = COL.mask;
      ctx.fillRect(0, 0, C.DESIGN.w, DH());
      /* v0.14：加了一张「玩家资料」卡 + 一个授权按钮，卡片从 620 长到 812。
       * 设计稿 1624 高，卡片上下各留 406，仍不会压到安全区。 */
      drawCard(C.DESIGN.w / 2, DH() / 2, 588, 812, 32);
      var cy = DH() / 2;
      text('设置', C.DESIGN.w / 2, cy - 352, 44, COL.text, 'center', '600');

      /* ---- 玩家资料卡：头像 + 昵称 + 一行状态 ---- */
      var cw = P.card.w, ch = P.card.h, ccy = cy + P.card.dy;
      rr(C.DESIGN.w / 2 - cw / 2, ccy - ch / 2, cw, ch, 24);
      /* v0.47：底走 COL.surface —— 原来是写死的浅米色，深色皮肤下昵称/状态
       * 两行近白字压上去完全看不见（和排行榜同一类问题）。 */
      ctx.fillStyle = COL.surface; ctx.fill();
      var ax = C.DESIGN.w / 2 - cw / 2 + 34 + P.card.avatarR;
      drawAvatar(ax, ccy, P.card.avatarR, meNick(), meAvatarUrl(), COL.gold);
      var nx = ax + P.card.avatarR + P.card.gap;
      /* 主按钮已经叫「改昵称」时，卡片右上角就不再重复一个入口 */
      var authable = profileCanAuth() && !state.me.auth;
      var ebx = C.DESIGN.w / 2 + cw / 2 - 74;
      var nickMaxW = authable ? (ebx - nx - 16) : (C.DESIGN.w / 2 + cw / 2 - 24 - nx);
      textFit(meNick(), nx, ccy - 26, 30, COL.text, 'left', '700', nickMaxW);
      if (authable) {
        text(P.editLabel, ebx, ccy - 26, 20, COL.goldDeep, 'center', '600');
        addHit(ebx, ccy - 26, 120, 56, 'profile_rename');
      }
      textFit(profileStateText(), nx, ccy + 22, 18,
        state.me.err ? (COL.dangerText || '#E5484D') : COL.textSub, 'left', null, C.DESIGN.w / 2 + cw / 2 - 24 - nx);

      /* ---- 主操作：未授权 → 用微信昵称头像；已授权 / 不支持 → 改昵称 ---- */
      var b1 = { id: authable ? 'profile_auth' : 'profile_rename',
        x: C.DESIGN.w / 2, y: cy + P.authBtn.dy,
        w: P.authBtn.w, h: P.authBtn.h,
        label: authable ? P.authLabel : (state.me.auth ? '改昵称' : P.editLabel),
        variant: 'secondary', size: 26 };
      addHit(b1.x, b1.y, b1.w, b1.h, b1.id);
      drawButton(b1);
      /* v0.14：能授权时，真正的点击目标是一枚盖在画布按钮上的原生 UserInfoButton
       * （wx.createUserInfoButton 必须由用户点原生按钮才弹授权，画布手势不算）。 */
      syncProfileButton();

      /* v0.26：设置页不再提供「重置进度」。
       * 玩家不该在设置里一键把整个游戏清零 —— 这是不可逆的破坏性操作，
       * 放哪个层级都容易误触，误触一次等于从头再来。
       * 教学也不再依赖它：第 1 关永远是教学形式（见 makeTutorial），
       * 想复习直接点进第 1 关就行，不需要"重置"这种核弹。 */
      var r2 = { id: 'close_settings', x: C.DESIGN.w / 2, y: cy + 246, w: 340, h: 92, label: '关闭', variant: 'primary', size: 32 };
      addHit(r2.x, r2.y, r2.w, r2.h, 'close_settings');
      drawButton(r2);

      /* v0.9：让玩家看得见「我的进度已存到云上」——这是接云开发后的信任基础 */
      text('云端存档：' + netText(), C.DESIGN.w / 2, cy - 38, 19,
        state.net.err ? (COL.dangerText || '#E5484D') : COL.textSub, 'center');

      var rows = [
        { label: '音效', id: 'toggle_sfx', on: state.settingsFx },
        { label: '音乐', id: 'toggle_bgm', on: state.settingsBgm }
      ];
      for (var i = 0; i < rows.length; i++) {
        var y = cy + 40 + i * 110;
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
    }

    /* ==================== v0.5 弹窗 ==================== */
    /* 弹窗外壳：遮罩 + 白卡 + 返回卡片中心 y */
    function sheetBg(w, h) {
      ctx.fillStyle = COL.mask;
      ctx.fillRect(0, 0, C.DESIGN.w, DH());
      var cy = DH() / 2;
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
      ctx.fillRect(0, 0, C.DESIGN.w, DH());
      var cy = DH() / 2;
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

    /* v0.10 提示面板 —— v0.16 改版：每关不再送免费档，所以任何一档点开都是这里。
     * 三选一的付费方式按「对玩家最划算」从上到下排：
     *   ① 用查找道具（在线奖励 / 邀请有礼得的，囤着不花巧币）
     *   ② 花巧币直接买一次（不必先囤道具）
     *   ③ 看视频（最后的兜底）
     * 绝不静默自动播广告，也不把"广告"和"提示"两个概念混在一个按钮里。 */
    /* v0.20 提示面板：单档，只讲一件事「下一步是哪块、放到哪」。
     * 旧版这里是 3 个档位圆点 + 档名 + 档描述 + 底部两行小字（来源/余量/星级封顶），
     * 玩家反馈那两行字既占位置又要读半天，已按 v0.20 需求删除。 */
    /* v0.22 提示面板：只在「没有查找道具」时才出现。
     * 有道具时点工具栏是**直接使用**（core 的 'hint' 路由），不进这里；
     * 所以这一页的常态是两行按钮：花巧币买一次 / 看视频免费一次。
     * 道具按钮保留但只作为兜底（若被别处以编程方式打开且身上有道具）。 */
    function renderHint() {
      var H = C.HINT, s = state.save;
      var busy = !!state.adSim || !!state.adWait;
      var items = s.hintItems || 0;
      var hasItem = items > 0 && !busy;
      /* 多一行道具按钮时面板要高一截，否则底部 × 会被裁掉 */
      var ch = hasItem ? 720 : 616;
      var cy = sheetBg(640, ch);
      sheetTitle('提示', cy, ch);
      var top = cy - ch / 2;
      var y = top + 330;

      text('帮你看下一步', C.DESIGN.w / 2, top + 168, 38, COL.text, 'center', '700');
      text('圈起来的那块，放到金色虚线处 · 放对前一直亮着', C.DESIGN.w / 2, top + 224, 24, COL.textSub, 'center');

      /* 主按钮跟着「现在真能用的那条路」走：有道具就高亮道具，
       * 没道具但巧币够就高亮巧币；两样都没有时只留视频按钮发光。 */
      if (hasItem) {
        var bItem = { id: 'hint_item', x: C.DESIGN.w / 2, y: y, w: 480, h: 96,
          label: '用' + H.itemName + ' · 剩 ' + items, variant: 'primary', size: 28 };
        addHit(bItem.x, bItem.y, bItem.w, bItem.h, 'hint_item');
        drawButton(bItem);
        y += 104;
      }

      var canCoin = (s.coin || 0) >= H.coinCost && !busy;
      var bCoin = { id: 'hint_coin', x: C.DESIGN.w / 2, y: y, w: 440, h: 84,
        label: (s.coin || 0) >= H.coinCost ? ('花 ' + H.coinCost + ' 巧币 · 买 1 次') : ('巧币不足 ' + (s.coin || 0) + '/' + H.coinCost),
        variant: (!hasItem && canCoin) ? 'primary' : 'secondary', size: 26, disabled: !canCoin };
      if (canCoin) addHit(bCoin.x, bCoin.y, bCoin.w, bCoin.h, 'hint_coin');
      drawButton(bCoin);
      y += 104;

      /* v0.35：本关看视频有次数上限（提示/复活/×5 共用 3 次），用完就置灰并改文案，
       * 不能让玩家点了之后只弹一句 toast —— 那样每次都要多试一次才知道没额度。 */
      var adLvOk = adLvLeft() > 0;
      var bAd = { id: 'hint_ad', x: C.DESIGN.w / 2, y: y, w: 480, h: 92,
        label: adLvOk ? '看视频 · 免费一次' : '本关看视频次数已用完',
        variant: 'danger', size: adLvOk ? 28 : 24, icon: 'tv',
        disabled: busy || !adLvOk };
      if (!busy && adLvOk) addHit(bAd.x, bAd.y, bAd.w, bAd.h, 'hint_ad');
      drawButton(bAd);
      if (adLvOk) {
        text('本关还可看 ' + adLvLeft() + '/' + adLvLimit() + ' 次（含复活与 ×5）',
          C.DESIGN.w / 2, y + 74, 20, COL.textSub, 'center');
        sheetClose(y + 130, 'close_hint');
      } else {
        sheetClose(y + 104, 'close_hint');
      }
      adLayer();
    }

    /* 复活弹窗（参考图 1） */
    function renderFail() {
      var cy = sheetBg(600, 820);
      sheetTitle('复活', cy, 820);
      /* v0.17：这一页要花巧币复活，余额必须可见 —— 弹层遮罩会把对局页顶栏压暗，
       * 所以在这里把常驻 HUD 重画一遍（位置与对局页完全相同，看起来是浮在遮罩上）。 */
      playHud(hudAnchorY());
      var s = state.save;
      var top = cy - 820 / 2;
      // 大红心
      drawIcon('heart', C.DESIGN.w / 2, top + 175, '#FF5A5A', 3.2);
      /* v0.18：失败瞬间 streak 已经清零落盘了，这里要显示「断点前的值」，
       * 否则复活面板会写「本轮挑战结束」——而复活明明还能把连胜接回来。 */
      var showStreak = Math.max(s.streak || 0, state.streakBeforeFail || 0);
      text(showStreak > 0 ? ('已经连胜 ' + showStreak + ' 关了') : '本轮挑战结束',
        C.DESIGN.w / 2, top + 305, 32, COL.text, 'center', '600');
      text(showStreak > 0 ? '复活可以保持连胜' : '下次再来，连胜从 1 重新算',
        C.DESIGN.w / 2, top + 355, 26, COL.textSub, 'center');

      /* v0.23：复活不再设每关上限 —— 反复看视频复活是允许的（用户要求）。
       * v0.35：但整个"看视频"总额度有上限（ECON.adPerLevel=3），用完置灰。 */
      var adLvOk = adLvLeft() > 0;
      var canAd = !state.adSim && adLvOk;
      // 广告复活（橙红大按钮）
      var bAd = { id: 'ad_revive', x: C.DESIGN.w / 2, y: top + 465, w: 440, h: 108,
        label: adLvOk ? '看广告复活' : '本关看视频次数已用完',
        variant: 'danger', size: adLvOk ? 32 : 26, icon: 'tv', disabled: !adLvOk };
      if (canAd) addHit(bAd.x, bAd.y, bAd.w, bAd.h, 'ad_revive');
      drawButton(bAd);
      /* v0.23：删掉「+90 巧币」—— 广告复活只给心。
       * 旧版给币 → 看广告比付费复活还划算 → 最优策略是"故意失败"。 */
      text(adLvOk ? ('+1 心 · 继续本关 · 还可看 ' + adLvLeft() + ' 次')
        : '+1 心 · 继续本关',
        C.DESIGN.w / 2, top + 545, 24, COL.textSub, 'center', '600');

      // 巧币复活
      var canCoin = (s.coin || 0) >= C.ECON.coinRevive && !state.adSim;
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

    /* 免费体力弹窗（参考图 2）
     * v0.31：用户要求「体力获取只保留看视频」—— 去掉「分享获得」，只留一枚通栏按钮。
     * v0.35：倍率 10 → 5（用户要求），单次 2×5 = 10 点。 */
    function renderEnergy() {
      var cy = sheetBg(600, 660);
      sheetTitle('免费体力', cy, 660);
      var top = cy - 660 / 2;
      var per = C.ECON.freeEnergyShare * C.ECON.freeEnergyAdMul;
      /* 图标 + 数字作为一组居中：旧版图标压在正中、数字挂在右边，视觉重心偏右 */
      drawIcon('energy', C.DESIGN.w / 2 - 62, top + 200, '#3DBEF0', 3.2);
      text('+' + per, C.DESIGN.w / 2 + 56, top + 200, 40, COL.text, 'center', '700');

      var used = freeEnergyUsedToday(), total = C.ECON.freeEnergyPerDay;
      var leftN = Math.max(0, total - used);
      var can = leftN > 0 && !state.adSim;
      var bAd = { id: 'free_ad', x: C.DESIGN.w / 2, y: top + 400, w: 460, h: 96,
        label: C.ECON.freeEnergyAdMul + ' 倍获得', variant: 'danger', size: 30, disabled: !can, icon: 'tv' };
      addHit(bAd.x, bAd.y, bAd.w, bAd.h, 'free_ad');
      drawButton(bAd);
      text('单次 ' + C.ECON.freeEnergyShare + ' 点 × ' + C.ECON.freeEnergyAdMul + ' 倍 · 每日 ' + total + ' 次',
        C.DESIGN.w / 2, top + 470, 21, COL.textSub, 'center');
      text('使用次数 ' + used + '/' + total, C.DESIGN.w / 2, top + 510, 24, COL.textSub, 'center');
      sheetClose(top + 700, 'close_energy');
      adLayer();
    }

    /* 在线奖励（v0.15）：今日累计时长 + 6 档奖励
     * 版式：顶部大号累计时长 + 到下一档的进度条，下面 6 行档位，
     * 每行左边「在线 N 分钟 + 奖励内容」，右边 领取/已领取/还差 mm:ss。
     * 卡片 1180 高，上下各留 222，关闭按钮压在中轴，不压安全区。 */
    function renderOnline() {
      var cy = sheetBg(680, 1180), top = cy - 1180 / 2;
      sheetTitle('在线奖励', cy, 1180);
      var sec = onlineSecNow(), arr = onlineTierList();
      var i;

      /* v0.36：明确告诉玩家这是「全游戏共用一份」的计时，切玩法不会重新开一轮 */
      text('今日累计在线 · 四巧 / 七巧共用', C.DESIGN.w / 2, top + 112, 22, COL.textSub, 'center');
      text(onlineClock(sec), C.DESIGN.w / 2, top + 158, 54, COL.goldDeep, 'center', '700');

      /* 进度条：到「下一个还没领的档」的完成度。全领完就满格 */
      var next = null;
      for (i = 0; i < arr.length; i++) { if (!arr[i].got) { next = arr[i]; break; } }
      var p = next ? Math.min(1, sec / next.at) : 1;
      var bx = C.DESIGN.w / 2 - 260, bw = 520, by = top + 204;
      ctx.save();
      rr(bx, by, bw, 12, 6); ctx.fillStyle = COL.track; ctx.fill();
      if (p > 0) { rr(bx, by, Math.max(12, bw * p), 12, 6); ctx.fillStyle = COL.gold; ctx.fill(); }
      ctx.restore();
      var readyN = onlineClaimCount();
      var note = readyN > 0 ? ('有 ' + readyN + ' 档奖励可领')
        : (!next ? '今天的奖励已全部领完'
          : ('距「' + next.label + '」还差 ' + onlineClock(next.left)));
      text(note + ' · 每日 0 点重新统计', C.DESIGN.w / 2, top + 240, 20, COL.textSub, 'center');

      for (i = 0; i < arr.length; i++) {
        var t = arr[i], y = top + 318 + i * 122;
        ctx.save();
        rr(55, y - 56, 640, 112, 20);
        ctx.fillStyle = t.ready ? 'rgba(255,185,61,0.13)' : 'rgba(74,51,39,0.05)';
        ctx.fill();
        if (t.ready) { ctx.lineWidth = 2; ctx.strokeStyle = COL.gold; ctx.stroke(); }
        ctx.restore();

        text('在线 ' + t.label, 86, y - 18, 27, COL.text, 'left', '600');
        /* v0.39：奖励行按用户要求去掉「体力 / 巧币 / 查找道具」这些汉字，
         * 换成游戏内对应的图标 + 数字 —— 图标在 HUD 和工具栏里已经出现过，
         * 玩家一眼认得出；顺带省下宽度，三档奖励也不会挤到「领取」按钮上。 */
        var rw = [];
        if (t.energy) rw.push({ icon: 'energy', n: t.energy });
        if (t.coin) rw.push({ icon: 'coin', n: t.coin });
        if (t.hint) rw.push({ icon: 'hint', n: t.hint });
        drawRewardRow(rw, 86, y + 22, !!t.got);

        var label = t.got ? '已领取' : (t.ready ? '领取' : ('差 ' + onlineClock(t.left)));
        var b = {
          id: 'online_' + t.id, x: 596, y: y, w: 150, h: 70,
          label: label, variant: t.ready ? 'primary' : 'secondary',
          size: t.ready || t.got ? 24 : 20,
          disabled: t.got || !t.ready
        };
        addHit(b.x, b.y, b.w, b.h, b.id);
        drawButton(b);
      }

      var ht = '×' + (state.save.hintItems || 0) + ' · 关卡「提示」面板可直接使用';
      ctx.font = font(21);
      var hw = ctx.measureText ? ctx.measureText(ht).width : 300;
      var hx0 = C.DESIGN.w / 2 - (hw + 30) / 2;
      drawIcon('hint', hx0 + 13, top + 1030, COL.textSub, 0.62);
      text(ht, hx0 + 30, top + 1030, 21, COL.textSub, 'left');
      sheetClose(top + 1112, 'close_sheet');
      adLayer();
    }

    /* v0.39：一行「图标 + 数字」的奖励标签（在线奖励逐档用）。
     * 图标自带彩色徽章底（体力蓝珠 / 金币 / 灯泡），所以 color 参数只在
     * 少数线条图标上起作用，这里传金色让线条与数字同色。 */
    function drawRewardRow(items, x, y, dim) {
      var cx = x;
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        drawIcon(it.icon, cx + 13, y, COL.goldDeep, 0.78);
        var txt = '+' + it.n;
        ctx.font = font(22, '600');
        var tw = ctx.measureText ? ctx.measureText(txt).width : 26;
        text(txt, cx + 30, y + 1, 22, dim ? COL.textSub : COL.goldDeep, 'left', '600');
        cx += 30 + tw + 26;
      }
    }

    /* ==================== v0.42 邀请有礼 · 图标化 + 进度条 + 可滑动 ====================
     * 用户反馈（附对标图）：
     *   ① 奖励写成「30 巧币 + 1 查找道具」这种文字，扫一眼根本不知道给什么 → 全换图标 + ×数量；
     *   ② 每行中间要一条进度条，直接看到「已邀请 2 / 需要 3」的进度；
     *   ③ 8 档一屏放不下时要能上下滑动，而不是把卡片撑到看不见底。
     *
     * 每档一行（行高 118 = 金色行标 32 + 内容 86，行距 12）：
     *   ┌ 累计邀请 N 人进入游戏 ─────────────────┐
     *   │ [图标×N][图标×N]    ▓▓▓▓░░ 2/3   [邀请] │
     *   └────────────────────────────────────────┘
     * 8 档共 1028px，视口约 868px → 一定超出，所以滑动是主交互，不是兜底。 */
    var INV_ROW_H = 118, INV_HEAD_H = 32, INV_PITCH = 130;

    /* 一档奖励 → 图标序列（顺序固定：巧币 → 体力 → 查找道具 → 板件 → 背景） */
    function tierRewards(t) {
      var out = [];
      if (t.coin) out.push({ kind: 'coin', n: t.coin });
      if (t.energy) out.push({ kind: 'energy', n: t.energy });
      if (t.hint) out.push({ kind: 'hint', n: t.hint });
      if (t.pstyle) out.push({ kind: 'pstyle', key: t.pstyle, n: 1 });
      if (t.bgfx) out.push({ kind: 'bgfx', key: t.bgfx, n: 1 });
      return out;
    }
    /* 板件图标的预览色：与皮肤面板同一套固定色板，霓虹 / 水晶才一眼可辨 */
    var PS_ICON_COL = {
      classic: '#4FA8E0', candy: '#F5A623', wood: '#C08850', neon: '#8A6BF0',
      pastel: '#F5A0B8', crystal: '#3E9BD6', metal: '#98A6B4', jade: '#3FAF7C', glow: '#57D48C'
    };
    /* 单个奖励图标：巧币 / 体力 / 查找道具直接用游戏里那套徽章图标；
     * 板件 / 背景没有现成图标，这里画「能认出是什么」的小样 ——
     * 板件 = 该质感的小三角；背景 = 该特效的底色 + 招牌粒子。
     * （把皮肤面板 120px 的预览缩到 42px 会糊成一团，所以这里单独画。） */
    function drawRewardIcon(kind, key, x, y, box) {
      if (kind === 'coin' || kind === 'energy' || kind === 'hint') {
        drawIcon(kind, x, y, COL.text, box / 44);
        return;
      }
      var r = box / 2;
      ctx.save();
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = state.darkSkin ? 'rgba(255,255,255,0.10)' : 'rgba(44,58,75,0.05)';
      ctx.fill();
      ctx.lineWidth = 1.6; ctx.strokeStyle = hexA(COL.gold, 0.55); ctx.stroke();
      ctx.clip();
      if (kind === 'pstyle') {
        /* 三角占满圆底（0.66 倍时质感基本看不出来） */
        drawPreviewPiece(x, y + r * 0.06, r * 0.80, PS_ICON_COL[key] || '#4FA8E0', key);
      } else {
        drawBgSwatch(key, x, y, r);
      }
      ctx.restore();
    }

    /* 背景特效小样：底色 + 该特效的招牌粒子（泡泡 / 花瓣各画各的，其余用主题色点） */
    function drawBgSwatch(key, x, y, r) {
      var fx = C.BG_FX[key] || {}, mode = fx.mode || 'glow', i;
      var bgCol = fx.dark ? '#1B2547'
        : (state.darkSkin ? 'rgba(255,255,255,0.12)'      // 深色皮肤：小样也别留一块亮底
          : (mode === 'aurora' ? '#E8E2F7' : mode === 'snow' ? '#DCEBF5'
            : mode === 'bubbles' ? '#E4F2FB' : '#FFF6E2'));
      ctx.fillStyle = bgCol;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
      if (mode === 'bubbles') {
        var bc = ['#78C4F0', '#F7A8C0', '#F7C873'];
        for (i = 0; i < 4; i++) {
          var bx = x - 7 + (i % 2) * 12, by = y - 7 + Math.floor(i / 2) * 13;
          var br = i % 3 === 0 ? 5 : 3.8;
          ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2);
          ctx.fillStyle = hexA(bc[i % 3], 0.30); ctx.fill();
          ctx.lineWidth = 1.3; ctx.strokeStyle = bc[i % 3]; ctx.stroke();
        }
      } else if (mode === 'petals') {
        var pc = ['#F7A0BE', '#EF7F9E', '#FFC0CE'];
        for (i = 0; i < 4; i++) {
          var px2 = x - 6 + (i % 2) * 12, py2 = y - 7 + Math.floor(i / 2) * 13;
          ctx.save(); ctx.translate(px2, py2); ctx.rotate(-0.6 + i * 0.45);
          ctx.beginPath(); ctx.ellipse(0, 0, 5, 2.5, 0, 0, Math.PI * 2);
          ctx.fillStyle = pc[i % 3]; ctx.fill();
          ctx.restore();
        }
      } else {
        var dots = mode === 'snow' ? '#FFFFFF'
          : mode === 'rain' ? '#8FC4E8'
          : mode === 'stars' ? '#FFF4C8'
          : mode === 'firefly' ? '#F7E27A'
          : mode === 'nebula' ? '#C9A8F5'
          : (fx.dark ? '#FFE6A8' : '#F5B93D');
        for (i = 0; i < 6; i++) {
          var dx = x - 10 + (i % 3) * 10, dy = y - 8 + Math.floor(i / 3) * 13;
          ctx.beginPath(); ctx.arc(dx, dy, i % 2 ? 2.2 : 1.5, 0, Math.PI * 2);
          ctx.fillStyle = dots; ctx.fill();
        }
      }
    }

    /* 列表内热区：只登记真正露在视口里的那一段，
     * 否则滑到边上时会出现「点空白也触发」的幽灵按钮。 */
    function addListHit(x, y, w, h, id, L) {
      var y0 = Math.max(y - h / 2, L.y), y1 = Math.min(y + h / 2, L.y + L.h);
      if (y1 - y0 < 24) return;
      hits.push({ x: x - w / 2, y: y0, w: w, h: y1 - y0, id: id, kind: 'btn' });
    }

    /* 画一档阶梯。返回右侧按钮 id：'邀请' / '领取' / null（已领取，不可点） */
    function drawInviteRow(t, rx, ry, w, cnt, got) {
      var done = got.indexOf(t.n) >= 0;
      var can = cnt >= t.n;
      /* --- 行底 + 金色行标 --- */
      ctx.save();
      rr(rx, ry, w, INV_ROW_H, 16);
      ctx.fillStyle = done ? hexA(COL.gold, state.darkSkin ? 0.13 : 0.10) : COL.card;
      ctx.fill();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = done ? hexA(COL.gold, 0.5) : COL.line;
      ctx.stroke();
      ctx.restore();
      /* 深色皮肤下的行标不能再用「实心亮金 + 深字」—— 8 条金带叠在黑卡上太刺眼，
       * 改成半透明金 + 亮金文字，护眼模式下也还是一个"金色标签"。 */
      var dk = !!state.darkSkin;
      ctx.save();
      rr(rx + 1, ry + 1, w - 2, INV_HEAD_H, 14);
      var hg = ctx.createLinearGradient(0, ry, 0, ry + INV_HEAD_H);
      if (dk) {
        hg.addColorStop(0, hexA(COL.gold, 0.34)); hg.addColorStop(1, hexA(COL.gold, 0.20));
      } else {
        hg.addColorStop(0, shadeHex(COL.gold, 0.20)); hg.addColorStop(1, COL.gold);
      }
      ctx.fillStyle = hg; ctx.fill();
      ctx.fillRect(rx + 1, ry + INV_HEAD_H - 10, w - 2, 10);   // 下沿抹平，接上白底
      ctx.restore();
      text('累计邀请 ' + t.n + ' 人进入游戏', rx + w / 2, ry + INV_HEAD_H / 2 + 1,
        20, dk ? COL.gold : COL.btnText, 'center', '700');

      var cy = ry + INV_HEAD_H + (INV_ROW_H - INV_HEAD_H) / 2;   // 内容区中线

      /* --- 奖励图标（最多两个，图标下写 ×数量）--- */
      var rw = tierRewards(t);
      for (var i = 0; i < rw.length; i++) {
        var ix = rx + 56 + i * 78;
        drawRewardIcon(rw[i].kind, rw[i].key, ix, cy - 7, 42);
        text('×' + rw[i].n, ix, cy + 27, 17, done ? COL.goldDeep : COL.textSub, 'center', '700');
      }

      /* --- 进度条（行中间）：填充比例 = 已邀请 / 需要，条形上写「已/需」--- */
      var barX = rx + 190, barW = 190, barH = 30;
      var pr = t.n > 0 ? Math.min(1, cnt / t.n) : 0;
      ctx.save();
      rr(barX, cy - barH / 2, barW, barH, barH / 2);
      ctx.fillStyle = COL.track; ctx.fill();
      if (pr > 0) {
        rr(barX, cy - barH / 2, Math.max(barH, barW * pr), barH, barH / 2);
        var pg = ctx.createLinearGradient(0, cy - barH / 2, 0, cy + barH / 2);
        pg.addColorStop(0, shadeHex(COL.gold, 0.16)); pg.addColorStop(1, COL.gold);
        ctx.fillStyle = pg; ctx.fill();
      }
      ctx.restore();
      text(Math.min(cnt, t.n) + '/' + t.n, barX + barW / 2, cy + 1, 18,
        pr >= 0.55 ? COL.btnText : COL.textSub, 'center', '700');

      /* --- 右侧按钮：已领取（灰）/ 领取（金，兜底）/ 邀请（蓝，带分享图标）--- */
      var bw = 148, bh = 60, bx = rx + w - 16 - bw / 2;
      if (done) {
        ctx.save();
        rr(bx - bw / 2, cy - bh / 2, bw, bh, bh / 2);
        ctx.fillStyle = state.darkSkin ? 'rgba(255,255,255,0.07)' : 'rgba(120,130,146,0.11)';
        ctx.fill();
        ctx.restore();
        text('已领取', bx, cy + 1, 22, COL.textSub, 'center', '600');
        return null;
      }
      if (can) {
        ctx.save(); shadow(8, 3, COL.shadow);
        rr(bx - bw / 2, cy - bh / 2, bw, bh, bh / 2);
        var cg = ctx.createLinearGradient(0, cy - bh / 2, 0, cy + bh / 2);
        cg.addColorStop(0, COL.gold); cg.addColorStop(1, COL.goldDeep);
        ctx.fillStyle = cg; ctx.fill(); noShadow(); ctx.restore();
        text('领取', bx, cy + 1, 24, COL.btnText, 'center', '700');
        return 'invite_claim_' + t.n;
      }
      ctx.save(); shadow(8, 3, 'rgba(30,120,160,0.26)');
      rr(bx - bw / 2, cy - bh / 2, bw, bh, bh / 2);
      var ig = ctx.createLinearGradient(0, cy - bh / 2, 0, cy + bh / 2);
      ig.addColorStop(0, '#5AD0F0'); ig.addColorStop(1, '#27A9D8');
      ctx.fillStyle = ig; ctx.fill(); noShadow(); ctx.restore();
      drawIcon('share', bx - 38, cy, '#FFFFFF', 0.72);
      text('邀请', bx + 16, cy + 1, 23, '#FFFFFF', 'center', '700');
      return 'invite_share';
    }

    /* 邀请有礼主面板 */
    function renderInvite() {
      var V = C.INVITE, T = V.tiers, s = state.save;
      /* 卡片高度跟屏幕走：DH()-140，上限 1180、下限 860。
       * 列表视口 = 卡片高 - 顶部 162 - 底部 150 —— 8 档 1028px 必然溢出，所以要能滑。 */
      var CH = Math.max(860, Math.min(1180, DH() - 140));
      var cy = sheetBg(660, CH);
      sheetTitle('邀请有礼', cy, CH);
      var top = cy - CH / 2, cx = C.DESIGN.w / 2;
      var cnt = s.inviteCount || 0;
      var got = s.inviteGot || [];
      var pendN = (s.invitePend || []).length;

      /* 顶部：规则说明（奖励才用图标，规则仍要文字讲清楚）+ 总进度 */
      text('邀请的好友需完成任意 ' + V.needCleared + ' 关才计入',
        cx, top + 96, 20, COL.textSub, 'center');
      var sum = '已邀请 ' + cnt + ' 人 · 已完成 ' + got.length + '/' + T.length + ' 档';
      if (pendN) sum += ' · ' + pendN + ' 位在闯关中';
      text(sum, cx, top + 130, 22, COL.goldDeep, 'center', '700');

      /* ---- 滚动视口 ---- */
      var L = { x: cx - 290, y: top + 162, w: 580, h: CH - 162 - 128 };
      state.inviteList = L;
      var contentH = T.length * INV_PITCH - (INV_PITCH - INV_ROW_H);
      state.inviteScrollMax = Math.max(0, contentH - L.h);
      if (state.inviteScroll > state.inviteScrollMax) state.inviteScroll = state.inviteScrollMax;
      if (!(state.inviteScroll > 0)) state.inviteScroll = 0;
      var sc = state.inviteScroll;

      ctx.save();
      rr(L.x, L.y, L.w, L.h, 16);
      ctx.clip();
      var rowX = L.x + 10, rowW = L.w - 20;
      for (var i = 0; i < T.length; i++) {
        var ry = L.y + i * INV_PITCH - sc;
        /* 完全在视口外的行不画也不登记热区（省绘制，也避免幽灵按钮） */
        if (ry + INV_ROW_H < L.y - 2 || ry > L.y + L.h + 2) continue;
        var rid = drawInviteRow(T[i], rowX, ry, rowW, cnt, got);
        if (rid) addListHit(rowX + rowW - 16 - 74, ry + INV_HEAD_H + (INV_ROW_H - INV_HEAD_H) / 2,
          148, 60, rid, L);
      }
      ctx.restore();

      /* 滚动条：装不下才出现，拇指位置反映当前进度（也给「这里能滑」一个暗示） */
      if (state.inviteScrollMax > 0) {
        var trH = L.h - 16, thH = Math.max(64, trH * (L.h / contentH));
        var thY = L.y + 8 + (trH - thH) * (sc / state.inviteScrollMax);
        ctx.save();
        rr(L.x + L.w - 7, L.y + 8, 5, trH, 3);
        ctx.fillStyle = hexA(COL.textSub, 0.14); ctx.fill();
        rr(L.x + L.w - 7, thY, 5, thH, 3);
        ctx.fillStyle = hexA(COL.gold, 0.75); ctx.fill();
        ctx.restore();
      }

      sheetClose(top + CH - 56, 'close_sheet');
      adLayer();
    }

    /* v0.28：renderDesktop「添加到桌面」面板已按用户要求删除 */

    /* 皮肤 */
    /* v0.27 皮肤面板重构：4 个分类页签（配色 / 背景 / 板件 / 音效）。
     * 三类新风格彼此独立、任选组合，全部为程序化预览，零图片。 */
    function renderSkin() {
      /* v0.28：背景 10 套 / 板件 9 套 / 音效 8 套，3 列布局最多 4 行。
       * 按当前页签的选项数动态定卡片高度：2 行→720、3 行→860、4 行→1000，
       * 避免最后一行掉出卡片，也避免少行页签下方空一大截。 */
      var tab0 = state.skinTab || 0;
      var cnt0 = tab0 === 0 ? Object.keys(C.SKINS).length
        : tab0 === 1 ? Object.keys(C.BG_FX).length
        : tab0 === 2 ? Object.keys(C.PIECE_STYLES).length
        : Object.keys(C.SFX_STYLES).length;
      var rows0 = Math.ceil(cnt0 / 3);
      var CH = rows0 <= 2 ? 720 : (rows0 === 3 ? 860 : 1000);
      var cy = sheetBg(660, CH);
      sheetTitle('皮肤', cy, CH);
      var top = cy - CH / 2;
      var tab = tab0;
      var TABS = [
        { k: 'theme', label: '配色' },
        { k: 'bg',    label: '背景' },
        { k: 'piece', label: '板件' },
        { k: 'sfx',   label: '音效' }
      ];

      /* --- 页签 --- */
      var tabW = 140, tabGap = 12, tabY = top + 96;
      var totalW = TABS.length * tabW + (TABS.length - 1) * tabGap;
      var tabX0 = C.DESIGN.w / 2 - totalW / 2;
      for (var ti = 0; ti < TABS.length; ti++) {
        var tx = tabX0 + ti * (tabW + tabGap);
        var active = ti === tab;
        ctx.save();
        rr(tx, tabY - 34, tabW, 68, 20);
        ctx.fillStyle = active ? COL.gold : COL.disabledBg;
        if (active) shadow(8, 3, hexA(COL.goldDeep || '#FF9F1C', 0.35));
        ctx.fill(); noShadow(); ctx.restore();
        /* v0.38：用户反馈「分类文字靠下、上下不均匀」。胶囊纵向范围是
         * tabY±34、中线正好在 tabY，而 text() 用 textBaseline='middle'，
         * 原来 +9 的偏移把 4 个页签整体压低了 9px —— 改为 +1 只留一点光学补偿。 */
        text(TABS[ti].label, tx + tabW / 2, tabY + 1, 27,
          active ? COL.btnText : COL.textSub, 'center', active ? '700' : '500');
        addHit(tx + tabW / 2, tabY, tabW, 68, 'skin_tab_' + ti);
      }

      /* --- 内容区 --- */
      var gridTop = top + 190;
      if (tab === 0) {
        var cur = state.save.skin || 'warm';
        var keys = Object.keys(C.SKINS);
        var cols = 3, cw = 178, ch = 176, gx = 14, gy = 18;
        var rowN = Math.ceil(keys.length / cols);
        var startX = C.DESIGN.w / 2 - (cols * cw + (cols - 1) * gx) / 2 + cw / 2;
        for (var i = 0; i < keys.length; i++) {
          var k = keys[i], sk = C.SKINS[k];
          var col = i % cols, row = Math.floor(i / cols);
          var x = startX + col * (cw + gx);
          var y = gridTop + row * (ch + gy) + ch / 2;
          skinOptionBox(x, y, cw - 8, ch - 8, cur === k);
          // 预览：背景块 + 金色主色点 + 文字色点
          rr(x - 52, y - 44, 104, 74, 12); ctx.fillStyle = sk.bg; ctx.fill();
          ctx.lineWidth = 1; ctx.strokeStyle = sk.line || COL.line; ctx.stroke();
          ctx.beginPath(); ctx.arc(x - 22, y - 18, 12, 0, Math.PI * 2); ctx.fillStyle = sk.gold; ctx.fill();
          ctx.beginPath(); ctx.arc(x + 16, y - 18, 12, 0, Math.PI * 2); ctx.fillStyle = sk.text; ctx.fill();
          ctx.fillStyle = sk.goldDeep; rr(x - 40, y + 14, 80, 8, 4); ctx.fill();
          if (cur === k) skinCheck(x, y, 170, 160);
          text(sk.name, x, y + ch / 2 - 18, 23, COL.text, 'center', '600');
          addHit(x, y, cw, ch, 'skin_' + k);
        }
        text('只换配色，不影响关卡与判定', C.DESIGN.w / 2, top + CH - 92, 21, COL.textSub, 'center');

      } else if (tab === 1) {
        var curFx = state.save.bgFx || 'classic';
        var fxKeys = Object.keys(C.BG_FX);
        drawSkinGrid(fxKeys, gridTop, curFx, function (k, x, y, sel) {
          var mode = C.BG_FX[k].mode;
          rr(x - 54, y - 44, 108, 78, 12);
          /* v0.40：泡泡改用淡蓝底 —— 白色气泡描边画在纯白卡片上等于没画 */
          ctx.fillStyle = C.BG_FX[k].dark ? '#141C36'
            : (mode === 'aurora' ? '#E8E2F7' : mode === 'snow' ? '#DCEBF5'
              : mode === 'bubbles' ? '#E4F2FB' : COL.card);
          ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = COL.line; ctx.stroke();
          ctx.save(); rr(x - 54, y - 44, 108, 78, 12); ctx.clip();
          drawFxPreview(mode, x, y);
          ctx.restore();
          if (sel) skinCheck(x, y, 170, 160);
          text(C.BG_FX[k].name, x, y + 46, 22, COL.text, 'center', '600');
          text(C.BG_FX[k].desc, x, y + 68, 17, COL.textSub, 'center');
        }, 'bgfx_');

      } else if (tab === 2) {
        var curPs = state.save.pieceStyle || 'classic';
        var psKeys = Object.keys(C.PIECE_STYLES);
        drawSkinGrid(psKeys, gridTop, curPs, function (k, x, y, sel) {
          rr(x - 54, y - 44, 108, 78, 12); ctx.fillStyle = COL.card; ctx.fill();
          ctx.lineWidth = 1; ctx.strokeStyle = COL.line; ctx.stroke();
          // 用是否选中无关的预览色（固定色板，展示质感差异）
          var demo = ['#4FA8E0', '#63C88B', '#FF8A5B'];
          for (var pi = 0; pi < 3; pi++) {
            var vx = x - 34 + pi * 34;
            drawPreviewPiece(vx, y - 5, 26, demo[pi], k);
          }
          if (sel) skinCheck(x, y, 170, 160);
          text(C.PIECE_STYLES[k].name, x, y + 46, 22, COL.text, 'center', '600');
          text(C.PIECE_STYLES[k].desc, x, y + 68, 17, COL.textSub, 'center');
        }, 'pstyle_');
        /* v0.39：第 2 行起带价签 —— 说清「要花钱」和「只花一次」 */
        text('带价签的板件需花巧币解锁 · 买一次四巧 / 七巧都能用',
          C.DESIGN.w / 2, top + CH - 92, 21, COL.textSub, 'center');

      } else {
        var curSf = state.save.sfxStyle || 'wood';
        var sfKeys = Object.keys(C.SFX_STYLES);
        drawSkinGrid(sfKeys, gridTop, curSf, function (k, x, y, sel) {
          rr(x - 54, y - 40, 108, 70, 12); ctx.fillStyle = COL.card; ctx.fill();
          ctx.lineWidth = 1; ctx.strokeStyle = COL.line; ctx.stroke();
          // 音符图标（自绘，不依赖图标表）
          ctx.save();
          ctx.fillStyle = COL.goldDeep;
          ctx.beginPath(); ctx.ellipse(x - 8, y + 4, 6, 4.2, -0.4, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = COL.goldDeep; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(x - 3, y + 3); ctx.lineTo(x - 3, y - 14); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x - 3, y - 14); ctx.quadraticCurveTo(x + 8, y - 15, x + 8, y - 7); ctx.stroke();
          ctx.restore();
          // 声波条
          var wave = C.SFX_STYLES[k].wave;
          var bars = wave === 'square' ? [8, 8, 18, 8, 18, 8] : (wave === 'triangle' ? [6, 12, 18, 12, 8, 5] : [4, 10, 20, 12, 7, 4]);
          for (var bi = 0; bi < bars.length; bi++) {
            ctx.fillStyle = hexA(COL.goldDeep || '#FF9F1C', 0.7);
            ctx.fillRect(x - 40 + bi * 14, y + 14 - bars[bi] / 2, 8, bars[bi]);
          }
          if (sel) skinCheck(x, y, 170, 160);
          text(C.SFX_STYLES[k].name, x, y + 46, 22, COL.text, 'center', '600');
          text(C.SFX_STYLES[k].desc, x, y + 68, 17, COL.textSub, 'center');
        }, 'sfx_');
        text('点选即刻试听，可随时切换', C.DESIGN.w / 2, top + CH - 92, 21, COL.textSub, 'center');
      }
      sheetClose(top + CH - 34, 'close_sheet');
    }

    /* v0.39：皮肤购买确认页
     * 从皮肤面板点「带价签」的项进来。为什么要有这一步：
     * 巧币只有 100~150 的量级，一次误触就花掉两三天的在线奖励，体验很差。
     * 这里把「长什么样 / 多少钱 / 现在有多少」摆在一起，玩家点头才扣币。 */
    function renderBuy() {
      var it = state.buyItem;
      if (!it) { state.overlay = 'skin'; return; }
      /* 版式：卡片 600×600，从「预览 → 名称 → 描述 → 一句话说明 → 价格 → 余额 → 两个按钮」
       * 一路往下排，间距 14~28px。底部不再放 X（「再想想」就是退出），
       * 省下的 90px 让内容能撑开、不挤成一坨。 */
      var CH = 600, cy = sheetBg(600, CH);
      sheetTitle('解锁皮肤', cy, CH);
      var top = cy - CH / 2, s = state.save;
      var cx = C.DESIGN.w / 2;
      var px = cx, py = top + 170;

      /* 预览：和面板里同一套绘制，只是放大摆中间 */
      if (it.kind === 'bgfx') {
        var mode = (C.BG_FX[it.key] || {}).mode || 'glow';
        rr(px - 90, py - 60, 180, 120, 16);
        ctx.fillStyle = C.BG_FX[it.key] && C.BG_FX[it.key].dark ? '#141C36'
          : (mode === 'aurora' ? '#E8E2F7' : mode === 'snow' ? '#DCEBF5' : COL.card);
        ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = COL.line; ctx.stroke();
        ctx.save(); rr(px - 90, py - 60, 180, 120, 16); ctx.clip();
        drawFxPreview(mode, px, py);
        ctx.restore();
      } else {
        rr(px - 90, py - 60, 180, 120, 16);
        ctx.fillStyle = COL.card; ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = COL.line; ctx.stroke();
        var demo = ['#4FA8E0', '#63C88B', '#FF8A5B'];
        for (var pi = 0; pi < 3; pi++) drawPreviewPiece(px - 44 + pi * 44, py + 4, 34, demo[pi], it.key);
      }

      text(it.name, cx, top + 276, 36, COL.text, 'center', '700');
      text(it.desc || '', cx, top + 312, 22, COL.textSub, 'center');
      text('买一次 · 四巧 / 七巧都能用', cx, top + 350, 19, COL.textSub, 'center');

      /* 价格 / 余额 */
      var priceTxt = it.price + ' 巧币';
      ctx.font = font(34, '700');
      var pw = (ctx.measureText ? ctx.measureText(priceTxt).width : 120);
      var gx0 = cx - (pw + 34) / 2;
      drawIcon('coin', gx0 + 14, top + 400, COL.gold, 0.85);
      text(priceTxt, gx0 + 34, top + 400, 34, COL.goldDeep, 'left', '700');
      var poor = (s.coin || 0) < it.price;
      text(poor ? ('巧币不足 · 当前 ' + (s.coin || 0)) : ('当前巧币 ' + (s.coin || 0)),
        cx, top + 442, 22, poor ? '#E4654F' : COL.textSub, 'center');

      /* v0.39：按钮宽 224、左右各留 62 —— 卡片内距 75，绝不能骑到圆角外面 */
      var bw = 224;
      drawButton({ id: 'buy_cancel', x: cx - 126, y: top + 518, w: bw, h: 92,
        label: '再想想', variant: 'secondary', size: 30 });
      addHit(cx - 126, top + 518, bw, 92, 'buy_cancel');
      drawButton({ id: 'buy_confirm', x: cx + 126, y: top + 518, w: bw, h: 92,
        label: poor ? '巧币不足' : '立即解锁', variant: 'primary', size: 30, disabled: poor });
      addHit(cx + 126, top + 518, bw, 92, 'buy_confirm');
    }

    /* 皮肤面板通用网格（每行 3 列，自动多行）
     * v0.39：带 price 且未解锁的项在卡片右上角挂一枚巧币价签；
     * 解锁后价签消失，选中时该位置换回对勾（两者不会同时出现）。 */
    function drawSkinGrid(keys, gridTop, curKey, drawCell, idPrefix) {
      var kind = idPrefix === 'bgfx_' ? 'bgfx' : (idPrefix === 'pstyle_' ? 'pstyle' : null);
      var cols = 3, cw = 178, ch = 168, gx = 14, gy = 14;
      var startX = C.DESIGN.w / 2 - (cols * cw + (cols - 1) * gx) / 2 + cw / 2;
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        var col = i % cols, row = Math.floor(i / cols);
        var x = startX + col * (cw + gx);
        var y = gridTop + row * (ch + gy) + ch / 2;
        skinOptionBox(x, y, cw - 8, ch - 8, curKey === k);
        drawCell(k, x, y, curKey === k);
        if (kind) {
          var pr = itemPrice(kind, k);
          if (pr > 0 && !ownsItem(kind, k)) drawPriceTag(x, y, pr);
        }
        addHit(x, y, cw, ch, idPrefix + k);
      }
    }

    /* 巧币价签：金底胶囊 + 小金币 + 数字，压在卡片右上角（不挡预览与名称） */
    function drawPriceTag(x, y, price) {
      var w = 76, h = 32;
      /* 右缩进 10、上缩进 4：避开卡片 18px 圆角，底边正好落在预览块上沿 */
      var px = x + 85 - 10 - w, py = y - 80 + 4;
      ctx.save();
      rr(px, py, w, h, h / 2);
      ctx.fillStyle = COL.gold; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = hexA(COL.goldEdge || '#E08A00', 0.75); ctx.stroke();
      ctx.restore();
      drawIcon('coin', px + 19, py + h / 2, COL.btnText, 0.5);
      text(String(price), px + 34, py + h / 2 + 1, 21, COL.btnText, 'left', '700');
    }

    function skinOptionBox(x, y, w, h, sel) {
      ctx.save();
      rr(x - w / 2, y - h / 2, w, h, 18);
      ctx.fillStyle = COL.card; ctx.fill();
      ctx.lineWidth = sel ? 5 : 1.5;
      ctx.strokeStyle = sel ? COL.goldEdge : COL.line;
      if (sel) shadow(8, 3, hexA(COL.goldDeep || '#FF9F1C', 0.3));
      ctx.stroke(); noShadow();
      ctx.restore();
    }
    function skinCheck(x, y, boxW, boxH) {
      /* 选中对勾固定在卡片右上角内侧，避免压住名称/描述文字 */
      var cx = x + (boxW || 170) / 2 - 22;
      var cy = y - (boxH || 168) / 2 + 20;
      ctx.save();
      shadow(4, 2, 'rgba(44,58,75,0.25)');
      ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2);
      ctx.fillStyle = COL.gold; ctx.fill();
      noShadow();
      ctx.restore();
      drawIcon('check', cx, cy, COL.btnText, 0.7);
    }

    /* 背景特效的静态预览缩略图（用几笔静态图形示意，不跑粒子动画） */
    function drawFxPreview(mode, x, y) {
      if (mode === 'glow') {
        var g = ctx.createRadialGradient(x, y, 4, x, y, 62);
        g.addColorStop(0, 'rgba(255,224,160,0.95)'); g.addColorStop(1, 'rgba(255,224,160,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 60, y - 55, 120, 110);
      } else if (mode === 'aurora') {
        var cols2 = ['#FFB38A', '#8EC9F5', '#9BE3C4'];
        for (var a = 0; a < 3; a++) {
          var g2 = ctx.createRadialGradient(x - 30 + a * 30, y, 4, x - 30 + a * 30, y, 34);
          g2.addColorStop(0, hexA(cols2[a], 0.65)); g2.addColorStop(1, hexA(cols2[a], 0));
          ctx.fillStyle = g2; ctx.fillRect(x - 60, y - 55, 120, 110);
        }
      } else if (mode === 'stars') {
        for (var s = 0; s < 12; s++) {
          var sx = x - 48 + fxRnd(s * 3 + 1) * 96, sy = y - 42 + fxRnd(s * 3 + 2) * 84;
          ctx.fillStyle = s % 3 ? '#FFFFFF' : '#FFF4C8';
          ctx.beginPath(); ctx.arc(sx, sy, s % 4 === 0 ? 2.6 : 1.4, 0, Math.PI * 2); ctx.fill();
        }
      } else if (mode === 'bubbles') {
        /* v0.40：原来清一色白色描边，在浅色卡片 / 淡蓝预览块上几乎看不见 ——
         * 改成三色描边 + 淡填充 + 左上高光点，缩略图里能一眼认出是气泡。 */
        var bTone = ['rgba(96,175,240,', 'rgba(255,150,180,', 'rgba(250,196,105,'];
        for (var b = 0; b < 6; b++) {
          var bx = x - 42 + fxRnd(b * 5) * 84, by = y - 38 + fxRnd(b * 5 + 2) * 74;
          var br = 5 + fxRnd(b * 5 + 3) * 9, bt = bTone[b % 3];
          ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2);
          ctx.fillStyle = bt + '0.18)'; ctx.fill();
          ctx.strokeStyle = bt + '0.85)'; ctx.lineWidth = 1.3; ctx.stroke();
          ctx.beginPath(); ctx.arc(bx - br * 0.34, by - br * 0.34, br * 0.2, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fill();
        }
      } else if (mode === 'petals') {
        for (var p = 0; p < 5; p++) {
          ctx.save(); ctx.translate(x - 38 + fxRnd(p * 7) * 76, y - 34 + fxRnd(p * 7 + 1) * 68);
          ctx.rotate(fxRnd(p * 7 + 2) * 6); ctx.fillStyle = hexA('#FF9BB0', 0.85);
          petalPath(ctx, 7); ctx.fill(); ctx.restore();
        }
      } else if (mode === 'geometric') {
        var pc = ['#4FA8E0', '#FF8A5B', '#63C88B', '#A87BE8'];
        for (var gi = 0; gi < 4; gi++) {
          ctx.save(); ctx.translate(x - 36 + fxRnd(gi * 9) * 72, y - 32 + fxRnd(gi * 9 + 1) * 64);
          ctx.rotate(fxRnd(gi * 9 + 2) * 6); ctx.fillStyle = hexA(pc[gi], 0.7);
          ctx.beginPath(); ctx.moveTo(-11, 7); ctx.lineTo(11, 7); ctx.lineTo(0, -11); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
      } else if (mode === 'snow') {
        for (var si = 0; si < 12; si++) {
          var sxx = x - 48 + fxRnd(si * 5 + 1) * 96, syy = y - 42 + fxRnd(si * 5 + 2) * 84;
          ctx.globalAlpha = 0.55 + fxRnd(si * 5 + 3) * 0.45; ctx.fillStyle = '#FFFFFF';
          ctx.beginPath(); ctx.arc(sxx, syy, 1.6 + fxRnd(si * 5 + 4) * 2.6, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      } else if (mode === 'rain') {
        ctx.strokeStyle = 'rgba(150,190,235,0.75)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
        for (var ri = 0; ri < 12; ri++) {
          var rxx = x - 48 + fxRnd(ri * 4 + 1) * 96, ryy = y - 42 + fxRnd(ri * 4 + 2) * 84;
          ctx.beginPath(); ctx.moveTo(rxx, ryy); ctx.lineTo(rxx - 5, ryy + 16 + fxRnd(ri * 4 + 3) * 10); ctx.stroke();
        }
      } else if (mode === 'firefly') {
        for (var fi = 0; fi < 11; fi++) {
          var fxx = x - 46 + fxRnd(fi * 6 + 1) * 92, fyy = y - 40 + fxRnd(fi * 6 + 2) * 80;
          ctx.fillStyle = fi % 2 ? '#C8FF7A' : '#FFE98A';
          ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 9;
          ctx.beginPath(); ctx.arc(fxx, fyy, 2 + fxRnd(fi * 6 + 3) * 2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.shadowBlur = 0;
      } else if (mode === 'nebula') {
        var nc = ['#7B5CE8', '#3E7FE0', '#C451D6', '#4BC6E8'];
        for (var ni = 0; ni < 4; ni++) {
          var nx = x - 28 + ni * 19, ny = y + Math.sin(ni * 2) * 16;
          var ng = ctx.createRadialGradient(nx, ny, 2, nx, ny, 32);
          ng.addColorStop(0, hexA(nc[ni], 0.7)); ng.addColorStop(1, hexA(nc[ni], 0));
          ctx.fillStyle = ng; ctx.fillRect(nx - 32, ny - 32, 64, 64);
        }
      }
    }

    /* 板件样式预览：画一个三角块，套用对应质感（与 drawPolyPiece 视觉一致） */
    function drawPreviewPiece(x, y, r, color, style) {
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r, r * 0.8); ctx.lineTo(-r, r * 0.8); ctx.closePath();
      if (style === 'neon') {
        ctx.shadowColor = color; ctx.shadowBlur = 10; ctx.fillStyle = shadeHex(color, -0.5);
      } else if (style === 'glow') {
        ctx.shadowColor = color; ctx.shadowBlur = 9; ctx.fillStyle = color;
      } else ctx.fillStyle = color;
      ctx.fill(); ctx.shadowBlur = 0;
      ctx.save(); ctx.clip();
      if (style === 'candy' || style === 'pastel') {
        var g = ctx.createLinearGradient(-r, -r, r, r);
        g.addColorStop(0, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0.18)');
        ctx.fillStyle = g; ctx.fillRect(-r, -r, r * 2, r * 2);
      } else if (style === 'wood') {
        ctx.strokeStyle = 'rgba(90,52,20,0.18)'; ctx.lineWidth = 1;
        for (var yy = -r; yy < r; yy += 5) { ctx.beginPath(); ctx.moveTo(-r, yy); ctx.lineTo(r, yy); ctx.stroke(); }
      } else if (style === 'crystal') {
        var cg = ctx.createLinearGradient(-r, -r, r, r);
        cg.addColorStop(0, 'rgba(255,255,255,0.7)'); cg.addColorStop(0.5, 'rgba(255,255,255,0.05)');
        cg.addColorStop(1, 'rgba(0,40,90,0.2)'); ctx.fillStyle = cg; ctx.fillRect(-r, -r, r * 2, r * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(0, -r); ctx.lineTo(r, 0);
        ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.stroke();
      } else if (style === 'metal') {
        var mg = ctx.createLinearGradient(0, -r, 0, r);
        mg.addColorStop(0, 'rgba(255,255,255,0.6)'); mg.addColorStop(0.4, 'rgba(0,0,0,0.22)');
        mg.addColorStop(1, 'rgba(255,255,255,0.4)'); ctx.fillStyle = mg; ctx.fillRect(-r, -r, r * 2, r * 2);
      } else if (style === 'jade') {
        var jg = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r * 2);
        jg.addColorStop(0, 'rgba(255,255,255,0.45)'); jg.addColorStop(1, 'rgba(10,70,50,0.24)');
        ctx.fillStyle = jg; ctx.fillRect(-r, -r, r * 2, r * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(-r, 0); ctx.bezierCurveTo(-r * 0.3, -8, r * 0.3, 8, r, 0); ctx.stroke();
      }
      ctx.restore();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = (style === 'neon' || style === 'glow') ? color
        : style === 'crystal' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.25)';
      ctx.stroke(); ctx.restore();
    }

    /* 轻提示（所有页面最上层） */
    function renderToast() {
      if (!state.toast) return;
      var a = Math.min(1, state.toast.t / 120);
      if (state.toast.t > 1300) a = Math.max(0, 1 - (state.toast.t - 1300) / 300);
      ctx.save();
      ctx.globalAlpha = a;
      var tw = Math.min(560, 40 + state.toast.text.length * 26);
      rr(C.DESIGN.w / 2 - tw / 2, DH() - 300, tw, 68, 34);
      ctx.fillStyle = 'rgba(44,58,75,0.90)'; ctx.fill();
      text(state.toast.text, C.DESIGN.w / 2, DH() - 266, 26, '#FFFFFF', 'center', '600');
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
      else if (state.overlay === 'rank') renderRank();
      else if (state.overlay === 'settings') renderSettings();
      else if (state.overlay === 'fail') renderFail();
      else if (state.overlay === 'hint') renderHint();
      else if (state.overlay === 'energy') renderEnergy();
      else if (state.overlay === 'online') renderOnline();
      else if (state.overlay === 'invite') renderInvite();
      /* v0.28：desktop 浮层已删除 */
      else if (state.overlay === 'skin') renderSkin();
      else if (state.overlay === 'buy') renderBuy();
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
        ctx.fillRect(0, 0, C.DESIGN.w, DH());
        ctx.restore();
      }
      ctx.restore();
    }

    /* ---------------- 尺寸 ---------------- */
    /* v0.31 全面屏兼容：设计稿是 750×1624（2.165:1），而 vivo X200s 这类机器是
     * 1260×2800（2.222:1）、部分机型更极端。旧版 scale 取 min(w/750, h/1624) 后
     * 把设计框垂直居中 —— 多出来的高度变成上下两条米色空白（实测 X200s 各 37 物理 px），
     * 用户截图反馈「主页顶部和尾部有空白」就是它。
     * 现在：宽度照旧决定 scale（保证排版宽度一致），竖向不再留边，
     * 用 view.dh 记录「当前屏在设计坐标系里的真实可用高度」，页面把多出来的高度吃掉。 */
    function DH() { return view.dh || C.DESIGN.h; }

    /* ---------------- v0.46 顶部栈（对局页） ----------------
     * 「顶部栈」= 左上两枚余量胶囊（竖排）+ 屏幕中线的倒计时胶囊。
     * 三者的中心线都锚在同一个 y（hudAnchorY），差别只在各自的高度：
     *   · 胶囊栈：顶沿 = safeTop + topPad，总高 = topPad + rowGap + pillH
     *   · 倒计时：capH 56，居中后上下各溢出 7，仍落在胶囊栈的范围里
     * 卡纸顶（BOARD.y）必须在栈底之下留出 gapToCard，否则就是用户截图里那种
     * 「胶囊被卡纸盖掉一截」—— 而且卡纸是在 playHud 之后画的，直接压上去。 */
    function hudStackH() {
      var M = LAY.HUD_MIN;
      return (M.topPad || 0) + M.rowGap + M.pillH;
    }
    function hudAnchorY() {
      var M = LAY.HUD_MIN;
      return view.safeTop + (M.topPad || 0) + M.pillH / 2 + M.rowGap / 2;
    }

    function resize() {
      var s = env.size();
      var dpr = env.dpr ? env.dpr() : 1;
      view.w = s.w; view.h = s.h; view.dpr = dpr;
      view.scale = Math.min(s.w / C.DESIGN.w, s.h / C.DESIGN.h);
      /* dh 只会 ≥ 设计高：宽受限（细长屏）时伸展，高受限（方屏/横屏）时保持 1624。
       * oy 恒为 0 —— 竖向从设计原点起排，不再上下留白。 */
      view.dh = Math.max(C.DESIGN.h, s.h / view.scale);
      view.ox = (s.w - C.DESIGN.w * view.scale) / 2;
      view.oy = 0;
      var si = env.safeInsets ? env.safeInsets() : { top: 0, bottom: 0 };
      view.safeTop = Math.max(C.SAFE.top, (si.top || 0) / view.scale);
      view.safeBottom = Math.max(C.SAFE.bottom, (si.bottom || 0) / view.scale);
      /* v0.46：卡纸顶按安全区自适应下移，**底部钉住不动**（纸只是变矮，盘面原点下移）。
       * 设计基准 208 是按 safeTop=88 定的；灵动岛机型 safeTop≈116 时再下移十几像素，
       * 保证「第二枚胶囊底 + 12」压不到卡纸顶。底部不动 → 进度条/托盘/工具栏一个都不动，
       * 而托盘里板件的散放位置是 buildSet 时按 TRAY 一次算好的，本来也动不了。 */
      var needTop = view.safeTop + hudStackH() + (LAY.HUD_MIN.gapToCard || 0);
      var nudge = Math.max(0, Math.min(BOARD_MAX_NUDGE, needTop - BASE_BOARD_Y));
      LAY.BOARD.y = BASE_BOARD_Y + nudge;
      LAY.BOARD.h = BASE_BOARD_H - nudge;
      view.boardNudge = nudge;
      /* v0.14：原生授权按钮同理，重算一次位置（不然转屏后会错位） */
      if (state.overlay === 'settings') syncProfileButton();
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
      /* v0.31：先把整块画布铺成当前皮肤的深底色，再上设计坐标系。
       * 细长屏（宽受限）时 oy=0 不会留边；方屏 / 平板（高受限）左右会有 ox>0 的边，
       * 这一层保证那些边也是游戏底色，而不是页面默认的米白色。 */
      var cv0 = ctx.canvas;
      if (cv0 && cv0.width && cv0.height) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = COL.bgDeep || COL.bg || '#0B1020';
        ctx.fillRect(0, 0, cv0.width, cv0.height);
      }
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
      /* v0.31：首次升级时把当前设置落成全局键（此后两套玩法共用一份）。
       * 放在 initSkin 之后：确保默认「几何轻舞」已经被 loadSave 写进 state.save。 */
      saveVisual();
      applyAudio();
      /* v0.14：先用本地缓存的昵称头像起步（不闪、断网也有名字），再等云端覆盖 */
      if (state.save.profile) applyProfile(state.save.profile, false);
      if (profileOn() && PROFILE.restore) {
        try { PROFILE.restore(state.save.profile || null); } catch (e) {}
      }
      if (profileOn() && PROFILE.onChange) {
        /* 平台层异步变化（已授权用户静默刷新到头像、或授权成功后回调） */
        PROFILE.onChange(function (p) { applyProfile(p); syncProfileButton(); });
      }
      /* 此前授权过的人：启动时静默刷新一次昵称头像（换头像能跟上），没授权的不打扰 */
      if (profileOn() && PROFILE.boot) { try { PROFILE.boot(); } catch (e) {} }
      resize();
      env.bindInput(function (type, cssX, cssY) {
        var d = toDesign(cssX, cssY);
        if (type === 'down') onDown(d[0], d[1]);
        else if (type === 'move') onMove(d[0], d[1]);
        else if (type === 'up') onUp(d[0], d[1]);
        else { state.activePointer = false; state.drag = null; state.press = null; state.lastTap = null; }
      });
      /* v0.9：云登录（拿 openid / 建档）→ 拉云端存档做合并。
       * 任何一步失败只影响「跨设备同步 + 排行榜」，本地存档照常玩。 */
      if (cloudOn()) {
        state.net.on = true;
        CLOUD.init(function (err, info) {
          if (err) {
            state.net.err = (err && err.msg) || String(err);
            state.net.ready = false;
            return;
          }
          state.net.nick = (info && info.nick) || '';
          state.net.ready = true;
          /* v0.14：云端的资料优先（换设备也认这个名），但有个例外——
           * 云端还是系统化名（src=auto），本地却已经是玩家自己起的名，就别把人家改回去。 */
          if (info && (info.nick || info.avatar)) {
            var remote = {
              nick: info.nick || '', avatar: info.avatar || '',
              src: info.src || 'auto', auth: !!info.auth
            };
            var keepLocal = (state.me.src === 'custom' || state.me.src === 'wx') && remote.src === 'auto';
            if (!keepLocal) applyProfile(remote, 'local');
          }
          if (C.CLOUD.pullOnBoot) cloudPull();
        });
      }
      if (env.onHide) env.onHide(function () {
        /* v0.26：切后台/切小程序前先落一份续玩快照 —— 被系统回收也不丢进度。
         * 必须在 running=false 之前，否则 saveResume() 会以为这局已经结束。 */
        saveResume();
        state.running = false;
        /* v0.15：切后台停表 + 落一次盘（onlineSec 不 persist 到云端，只写本地） */
        onlineSync();
        state.onlineMark = 0;
        state.onlineSaveT = 0;
        writeLocal(true);            // 只记时长，不动 updatedAt
      });
      if (env.onShow) env.onShow(function () {
        if (state.page === 'play' && !state.win && !state.overlay) state.running = true;
        /* v0.15：回前台重新起表（第一次进游戏时 mark 由 init 末尾设置） */
        state.onlineMark = Date.now();
        lastT = 0;
      });
      /* v0.15：起表。老存档没有 onlineDay，这里会顺手清零并从 0 开始累计 */
      onlineRoll();
      /* v0.36：把「今天的全局在线状态」立刻落一次盘（含首次播种 / 跨天清零），
       * 之后每 15 秒由 onlineTick 续写；不动 updatedAt，避免误判云端新旧。 */
      writeLocal(true);
      publishFriend();          // v0.18：启动先写一次好友榜数据（未授权也能写，只是没资料）
      state.onlineMark = Date.now();
      lastT = 0;
      frame(nowMs());
    }

    return {
      init: init,
      resize: resize,
      state: state,
      _debug: { judgeNow: judgeNow, setupLevel: setupLevel, useSet: useSet, win: win,
        handleAt: handleDesign,   // v0.3.2 B1：测试用，返回手柄圆心的设计坐标
        /* v0.5：经济/体力/倒计时/皮肤的工具函数，供 verify_v05 直接驱动 */
        fireBtn: fireBtn, syncEnergy: syncEnergy, onlineClaim: onlineClaim,
        applySkin: applySkin, grantFreeEnergy: grantFreeEnergy,
        doRevive: doRevive,
        /* v0.35：本关看视频额度（提示/复活/×5 合计 3 次） */
        adLvLeft: adLvLeft, adLvLimit: adLvLimit, adStart: adStart, adFinish: adFinish,
        /* v0.27：三类视觉风格切换，供截图/验收直接驱动 */
        applyBgFx: applyBgFx, applyPieceStyle: applyPieceStyle, applySfxStyle: applySfxStyle,
        /* v0.41：邀请有礼（累计人数 / 8 档阶梯）—— 供 verify_v041 直接驱动 */
        doInviteShare: doInviteShare, inviteVerify: inviteVerify, inviteGrant: inviteGrant,
        inviteHasNews: inviteHasNews, inviteNextTier: inviteNextTier,
        inviteConfirmed: inviteConfirmed, inviteTiers: C.INVITE.tiers,
        /* v0.42：邀请面板的滑动手势 —— 验收脚本用它模拟「按住 → 拖动 → 松手」 */
        setInviteScroll: setInviteScroll,
        onDown: onDown, onMove: onMove, onUp: onUp,
        tierRewards: tierRewards,
        /* v0.39：皮肤解锁（巧币买断）—— 供 verify_v039 直接驱动与断言 */
        pickSkinItem: pickSkinItem, buySkinItem: buySkinItem,
        itemPrice: itemPrice, ownsItem: ownsItem, itemLocked: itemLocked,
        grantItem: grantItem, loadShop: loadShop, seedShop: seedShop, shopKey: SHOP_KEY,
        /* v0.15：在线奖励（6 档 / 每日 0 点清零）与查找道具 */
        onlineSecNow: onlineSecNow, onlineTierList: onlineTierList,
        onlineClaimCount: onlineClaimCount, onlineClock: onlineClock,
        onlineSync: onlineSync, useHintItem: useHintItem, onlineTick: onlineTick,
        /* v0.36：全局在线状态（跨数据集共用），供 verify_v036 直接驱动 */
        onlineKey: ONLINE_KEY, loadOnline: loadOnline, writeOnline: writeOnline,
        applyOnlineTo: applyOnlineTo,
        timeLimitOf: timeLimitOf, heartsOf: heartsOf, totalStars: totalStars,
        /* v0.31：主页自适应布局（细长屏底部锚定）—— 验收脚本据此取点击坐标 */
        homeLayout: homeLayout, designH: DH,
        /* v0.9：云同步 / 榜单，供 verify_v09 直接驱动
         * （v0.33：banner 相关的 adRect/syncBanner 已随广告位移除） */
        cloudPush: cloudPush, cloudPull: cloudPull, cloudRank: cloudRank,
        openRank: openRank, netText: netText, go: go,
        /* v0.18：页签缓存 / 好友榜 / 连胜口径，供 verify_v18 直接驱动 */
        selectRankTab: selectRankTab, rankData: rankData, rankValue: rankValue,
        friendStats: friendStats, publishFriend: publishFriend, friendOn: friendOn,
        openFriendRank: openFriendRank, failLevel: failLevel,
        /* v0.19：连胜口径（段内去重）直接驱动 —— 放弃 / 复活 / 通关 三条路径 */
        giveUp: giveUp,
        /* v0.24：把当前帧的点击热区表交出去，供 verify_v24 校验"按钮是否同一排 / 是否重叠" */
        hitList: function () { return hits.slice(); },
        /* v0.21：教学步骤 / 跳过，供 verify_v21 直接断言 */
        tutStep: tutStep, tutSkip: tutSkip,
        /* v0.26：中途续玩 —— 快照的存 / 取 / 清，供 verify_v26 直接驱动 */
        saveResume: saveResume, takeResume: takeResume, clearResume: clearResume,
        openLevel: openLevel, isTutLevel: isTutLevel,
        /* v0.26：直接跑一次判定 —— verify_v26 要用它触发"真的通关" */
        runJudge: runJudge,
        mergeSave: mergeSave, collectCloud: collectCloud,
        /* v0.14：玩家资料 —— 供 verify_v14 直接驱动（授权 / 改名 / 云端覆盖） */
        meNick: meNick, applyProfile: applyProfile, profileStateText: profileStateText,
        requestProfile: requestProfile, renameProfile: renameProfile,
        syncProfileButton: syncProfileButton, hideProfileButton: hideProfileButton,
        profileCanAuth: profileCanAuth, drawAvatar: drawAvatar,
        get LEVELS() { return LEVELS; }, get slots() { return SLOT_POS; },
        get dataset() { return DS; }, get setKey() { return state.setKey; },
        get COLORS() { return COL; },
        get saveKey() { return SAVE_KEY; }, buildSet: buildSet,
        /* v0.6：品牌 / 主页版式 / 持续小花流，供 verify_v06 直接断言 */
        get BRAND() { return C.BRAND; },
        /* v0.31：homeLayout 由「设计基准对象」改成「运行时坐标函数」——
         * 底部锚定后位置随屏高变化，旧的固定值会点到空气（见上方 homeLayout）。 */
        flowerStream: function () { return flowerStreamParticles(state.setKey, state.levelIdx); },
        drawWinStreamAt: function (t) { drawWinStream(t, false); } }
    };
  };
});
