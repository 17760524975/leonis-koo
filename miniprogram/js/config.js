/* 四巧板 v0.1 · 全部可调参数与配色
 * 策划要改数值只改这里，逻辑层不写死任何数字。
 */
(function (root, factory) {
  var C = factory();
  root.TANGRAM_CONFIG = C;
  if (typeof module !== 'undefined' && module.exports) module.exports = C;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  return {
    version: 'v0.7.1',

    /* ---------- 品牌（v0.6 改名「方寸巧拼」） ----------
     * 游戏名只在这里定义一次：主页标题、分享文案、工程名都从这里取，
     * 以后改名只改这一处，避免再出现「主页叫A、分享叫B」的串名。 */
    BRAND: {
      name: '方寸巧拼',
      slogan: '四巧 · 七巧，拼出你的形状',
      shareText: '方寸巧拼 · 一起来拼图！'
    },

    /* ---------- 主页装饰（v0.6：与数据集彻底解耦） ----------
     * v0.5 之前装饰取当前数据集的头 4 块，切到七巧板时形状/数量都变，
     * 用户看到「点下面的按钮，上面的 logo 跟着变」。现在坐标写死在这里，
     * 四巧/七巧怎么切，这块装饰一个像素都不动。 */
    HOME_DECO: {
      cy: 682,                    // 装饰整体中心 y（设计坐标）
      cxOff: 14,                  // 整体相对屏幕中心的 x 偏移
      /* 4 块板拼成一条帆船：大帆 / 小帆 / 船体 / 桅顶小旗。
       * 4 块都能在四巧板里找到对应形状，看久了会觉得「这是能拼出来的」。 */
      pieces: [
        { c: '#4FA8E0', pts: [[0, -167], [0, 82], [-143, 82]] },              // 蓝：大帆
        { c: '#63C88B', pts: [[22, -88], [22, 82], [151, 82]] },              // 绿：小帆
        { c: '#FF8A5B', pts: [[-179, 102], [179, 102], [128, 175], [-128, 175]] }, // 橙：船体
        { c: '#A87BE8', pts: [[0, -167], [46, -150], [0, -133]] }             // 紫：桅顶小旗
      ]
    },

    /* ---------- 设计基准（策划 6.4） ---------- */
    DESIGN: { w: 750, h: 1624 },
    SAFE: { top: 88, bottom: 100 },     // 逻辑保留；真机会用 env(safe-area-inset-*) 取较大值

    /* ---------- 版式 ---------- */
    LAYOUT: {
      topBarH: 112,
      // 拼图区：1000×1000 逻辑坐标映射到正方形 BOARD（等比，不拉伸）
      // y 从 176 起：顶栏按钮 90..166，卡纸不能压住返回按钮（真机截图验收发现过）
      BOARD: { x: 24, y: 176, size: 702 },
      PROGRESS: { x: 60, y: 896, w: 630, h: 14 },
      /* 托盘 v0.2：2×2、与拼图区 **1:1** 同尺度。
       * 旧版是一行四槽、每块板各自缩放到槽位 → 面积差 5 倍的板看起来一样大，
       * 拿起后尺寸又突变，是「空间误差」的根源。
       * 1:1 后托盘里板的边长 = 棋盘上轮廓缺口的边长，玩家可以直接比长度。
       * 四块板横排 1:1 需要 274×2+137+137 ≈ 822 > 702，放不下，所以改 2×2。
       * 槽位尺寸不写死：按每块板实测 bbox + padX/padY 算，列宽取列内最大、行高取行内最大。
       * 这样换板件几何（D 从横条变成竖块）不用再动版式。 */
      /* v0.3 正式版：这里是「四巧板」默认托盘参数，一个字节都不改（A8 零回归）。
       * 七巧板 7 块的托盘参数由数据集自带（levels.js 的 TANGRAM_SETS.tangram7.tray），
       * core.js buildSet() 按 DS.pieceOrder 自适应行列后覆盖本值。
       * 七巧板参数（A2 尺寸调优后）：cols:2 / gapX:8 / gapY:4 / top:912 / bottom:1410
       *             padX:8 / padY:0 / minW:88 / minH:88（7 块共用一个 scale=1，见 core.js）。 */
      TRAY: {
        cols: 2, gapX: 24, gapY: 14,
        top: 1030, bottom: 1400,      // 竖直可用带；整块在其中垂直居中
        padX: 12, padY: 12,          // 槽位内边距
        minW: 120, minH: 120         // 小板的槽位下限，别缩成一个小方块
      },
      /* v0.3.4 A1：七巧板托盘「绘制间距」修正。levels.js 数据集一个字节不动，
       * core.js buildSet() 在算槽位时叠加这组覆盖（槽位热区同步，判定/关卡数据不变）。
       * 原数据 gapY:4 → 相邻行槽框只隔 4 设计 px（375 屏 2 CSS px），空槽虚线框与
       * 板件阴影压住下一行板件顶；top:912 → 首行距进度条底(910)仅 6.8px。
       * 修后：首行顶 926.8（距进度条 16.8）、行间 10、末行底 1409.2（工具栏 1420）。
       * 小板 bbox 75.1 < minH 76，仍完整落在自己槽内。 */
      TRAY_OVERRIDE: {
        tangram7: { top: 926, gapY: 10, minH: 76 }
      },
      TOOLBAR: { y: 1420, w: 120, h: 100, gap: 16 },
      BTN_EDGE: 2,                       // 按钮底部厚边（高密度屏 4px 太笨重）
      MIN_HIT: 88,                       // 最小可点热区

      /* v0.6 主页版式：verify_v06 直接读这组数做「标签不压下一图标」断言，
       * 避免验收脚本里再抄一份魔数导致两边漂移。 */
      HOME: {
        entryX: 104, entryW: 88, entryY0: 430, entryGap: 142,
        labelDy: 68, labelSize: 20,
        startY: 1010, set4Y: 1150, set7Y: 1250
      },
      /* v0.7 HUD：巧币 / 体力做成带描边的胶囊（参考用户给的截图）。
       * 图标压在胶囊左端外侧，数字统一 fontSize/700 白字，两行间距 rowGap。
       * 验收脚本读这组数据算净空，不再抄魔数。 */
      HUD: {
        iconX: 96,                        // 图标中心 x
        y0: 38,                           // 巧币行中心距安全区顶（v0.6=58，上移 20）
        rowGap: 66,                       // 两行中心间距
        pillH: 56, pillDx: 6,             // 胶囊高 / 左端相对图标中心的偏移
        padL: 34, padR: 26,               // 胶囊内左右留白（左侧要容下压在端头的图标）
        fontSize: 30, fontWeight: '700',  // 两行同字号同字重（v0.6 是 32 与 26）
        textColor: '#FFFFFF',
        pillFill: 'rgba(30,40,52,0.72)',  // 深底（换肤后仍压在浅色底上）：白字对比度约 7:1
        pillStroke: 'rgba(255,255,255,0.62)',
        border: 2.5,
        plusR: 24, plusInset: 6, plusHit: 76, plusFill: '#46C46B', plusPad: 34,
        /* v0.7.1：两行胶囊等长——实际宽度取「两行文字所需宽度的较大值」与
         * pillMinW 的最大值，巧币行与体力行永远同长（用户反馈一长一短）。
         * pillMinW 兜住数字位数少的场景，避免胶囊短到图标压字。 */
        pillMinW: 172,
        coinScale: 1.45, energyScale: 1.32   // 图标直径 ≈ 胶囊高的 0.7~0.75，才压得住整条胶囊
      }
    },

    /* ---------- 配色（策划 6.5.1，v1.1 明亮版） ---------- */
    COLORS: {
      bg: '#F6E9D4',
      bgDeep: '#EFDFC6',
      woodLine: 'rgba(199,164,120,0.18)',   // 极淡木纹
      card: '#FFFFFF',
      cardEdge: '#E3E9F2',
      board: '#FFFFFF',
      text: '#2C3A4B',
      textSub: '#7A8A9C',
      textOn: '#FFFFFF',
      btnText: '#7A4A00',            // 主按钮深棕字：橙底白字仅 1.9:1，会糊
      gold: '#FFB93D',
      goldDeep: '#FF9F1C',
      goldEdge: '#E08A00',
      line: '#E3E9F2',
      lineDeep: '#C3CDD9',
      slotBg: 'rgba(74,51,39,0.045)',   // 托盘槽位底框：极浅暖棕，让板"落在槽里"而不是浮着
      disabledBg: '#F4F6F9',
      disabledIcon: '#C3CDD9',
      targetFill: '#E8EEF7',
      targetEdge: '#9FB6D0',        // 旧值 #B9CBE0 对白卡只有 1.66:1，看不清
      targetSilhouette: '#DCE5F1',  // v0.3 提示档 3「纯剪影」：无描边时加深一档保持可读
      splitLine: 'rgba(84,110,140,0.55)',  // 提示档 1 内部分割线
      track: '#E8EEF7',
      progressA: '#63C88B',
      progressB: '#4FB87A',
      starOn: '#FFB93D',
      starOff: '#E3E9F2',
      mask: 'rgba(60,45,35,0.24)',   // 暖棕，冷墨蓝盖暖木会发灰绿
      snapRing: 'rgba(255,255,255,0.95)',
      overlapFlash: '#FF6B6B',
      shadow: 'rgba(44,58,75,0.10)',
      shadowPiece: 'rgba(44,58,75,0.14)'
    },

    /* ---------- 白卡纸卡片（策划 6.5.1；零图片，纯 Canvas 绘制） ----------
     * 结算面板 / 设置面板 / 关卡格 复用同一套。 */
    CARD: {
      radius: 32,
      edgeW: 1,
      edge: '#E3E9F2',
      topGlow: 'rgba(255,185,61,0.06)',
      topGlowH: 0.30,                    // 渐变高度占卡片高度的比例
      shadowBlur: 16,
      shadowDy: 4,
      shadow: 'rgba(44,58,75,0.10)'
    },

    /* ---------- 板件绘制 ---------- */
    PIECE: {
      strokeW: 2,
      highlightH: 1.5,
      highlight: 'rgba(255,255,255,0.25)',
      shadowBlur: 6,
      shadowDy: 2
    },

    /* ---------- 吸附（策划 5.5） ---------- */
    SNAP: {
      // 策划写「22 逻辑像素（1000 坐标系下）」。实测 22/1000 换算到 375pt 手机
      // 只有 7.7 CSS px，手指够不到，故按「可玩性」取 60（≈21 CSS px）。
      // 真机调优只需改这一个数。
      vertex: 60,
      grid: 65,             // 0.5u（1u = 130 → 0.5u = 65 世界单位）
      gridMax: 14,          // 网格兜底只在修正量很小的时候生效，避免把已经对准的板推开
      switchHyst: 2,        // 吸附目标切换的防抖（世界单位）
      breatheMs: 600,
      pulseMs: 140,
      ringMs: 180,          // 白色外高亮环：等距外扩 0→4px，宽 4→3，α 0.95→0
      ringOffset: 4,
      ringW: 4,
      ringWEnd: 3,
      ringAlpha: 0.95,
      ringGlowAlpha: 0.42,  // 环下垫一层同色柔光，给白环做出边界（白卡上纯白环不可见）
      ringGlowBlur: 2.6,
      vibrateMs: 8,
      /* v0.3 A4 第三层「边吸附」：
       * edge      两线距离阈值（世界单位，30 ≈ 21 设计 px ≈ 10.5 CSS px @375）
       * edgeAngle 边与边夹角容差（度）。板件与轮廓的边全部锁定在 45° 网格上，
       *           夹角 <6° 即「已精确平行」，故角度吸附在本引擎里是空操作，
       *           实际生效的是「沿法线贴靠」。参数保留以对齐方案文档 §3.5。 */
      edge: 30,
      edgeAngle: 6,
      edgeMinOverlap: 0.3   // 两边投影重叠长度须 > 0.3×短边，避免吸到远处共线边
    },

    /* ---------- 手势（v0.4 A1 双击翻转回归；环形旋转沿用 v0.3 A5） ---------- */
    GESTURE: {
      /* v0.4 A1：翻转改回「双击」——同一板件本体两次连续短 tap，间隔 < doubleTapMs、
       * 每次位移 < doubleTapMove 即触发。判定在 pointerup 之后，不占用按住时段，
       * 因此天然不干扰拖动（v0.3.3 的「长按 400ms」真机验证会误伤拖动，本版彻底移除）。 */
      doubleTapMs: 300,     // 两次 tap 的最大间隔（ms）
      doubleTapMove: 10,    // 单次 tap 允许的最大位移（设计 px），超过按拖动处理、不参与配对
      ringStep: 15,         // 环形旋转实时跟随步进（度）
      ringSnap: 45,         // 松手吸附步进（度）
      /* v0.3.1 A3 旋转手柄；v0.3.2 B1 手柄移到板件角上；v0.4 回归双击翻转、移除长按 */
      handleVisual: 68,     // 手柄视觉直径（设计 px；v0.3.1=84，小板件上缩小到 64~72）
      handleRadius: 44,     // 手柄热区半径（设计 px，保持 ≥40）
      handleOut: 22,        // 手柄中心沿质心→最远顶点方向外移（设计 px），让圆钮主体落在轮廓外侧
      handleTapMove: 10     // 手柄「点击」判定的最大位移（设计 px）：小于此值=点一下转45°，大于=拖动绕圈旋转
    },

    /* ---------- 判定（策划 5.6 / 5.7） ---------- */
    JUDGE: {
      passCoverage: 0.99,
      passOverflow: 0.01,
      pairTol: 0.005,       // 单对交叠 > 该块面积 0.5% 视为重叠
      lowCoverHint: 0.90,   // 覆盖率 <90% 不提示（避免打击）
      missHintBelow: 0.99
    },

    /* ---------- 星级（策划 5.7） ---------- */
    STAR: { twoStarTimeFactor: 1.6 },

    /* ---------- 动效（策划 7.5） ---------- */
    ANIM: {
      pressDown: 80,
      pressUp: 120,
      rotate: 120,
      flip: 180,
      grab: 100,
      progressTween: 300,
      panelFade: 200,
      starStep: 120,
      winShrink: 260,
      /* v0.6：260 + 640 = 900ms 才进场结算面板，与 FLOWER.overlayAt 对齐，
       * 让「主花+6 卫星花」完整绽放完再让位给面板（v0.5 是 660ms，花还没铺满就被盖住）。 */
      winDelay: 640,
      pageFade: 200,
      hintShow: 3000
    },

    /* ---------- 鲜花绽放（v0.3.4 A4a；v0.6 延长并接续持续小花流） ----------
     * 纯视觉、不参与判定。1 主花(7 瓣七色) + 6 卫星花(5 瓣)。
     * v0.6 时序：主花峰值 400ms → 卫星花铺满 700ms → 结算面板 900ms 进场 →
     * 主花与卫星花在 900~1500ms 内淡出（让位给面板），随后由 stream 接续。 */
    FLOWER: {
      total: 1500,
      budEnd: 90, bloomEnd: 400, settleEnd: 700,
      overlayAt: 900, fadeEnd: 1500,
      peakScale: 1.12,
      main: { x: 375, y: 470, petals: 7, L: 88 },
      satDelay: 45, satStart: 120, satDur: 240, satDist: 190, satYFactor: 0.82,
      colors: ['#FF8A5B', '#4FA8E0', '#63C88B', '#A87BE8', '#D96A9B', '#FFC53D', '#3FB8B0'],
      /* 卫星花：角度 / 主花色索引 / 相对大小 / 弹开延迟（规格 §2 表） */
      satellites: [
        { ang: -90, color: 1, size: 0.72, delay: 120 },
        { ang: -30, color: 5, size: 0.64, delay: 165 },
        { ang: 30, color: 2, size: 0.74, delay: 210 },
        { ang: 90, color: 4, size: 0.66, delay: 255 },
        { ang: 150, color: 3, size: 0.72, delay: 300 },
        { ang: 210, color: 6, size: 0.64, delay: 345 },
        { ang: -150, color: 3, size: 0.56, delay: 385 },
        { ang: 120, color: 0, size: 0.52, delay: 425 },
        { ang: 60, color: 2, size: 0.58, delay: 465 }
      ],
      /* v0.6 持续小花流：结算面板打开期间一直有小花自上/下留白带飘落。
       * 间隔从 gap0 按时间常数 decay 衰减到 gapMax（由密到疏），到 gapMax 后维持，
       * 首尾循环 → 玩家停在结算页多久都有花，不会戛然而止。
       * 只出现在卡片上/下留白带，绝不压住结算文字与按钮。 */
      stream: {
        from: 700,            // 与卫星花铺满时刻重叠，视觉不断档
        gap0: 110,            // 起始间隔（ms）：最密
        gapMax: 520,          // 衰减终点（ms）：维持期
        decay: 2600,          // 衰减时间常数（ms）
        cycleEnd: 9000,       // 单轮排程时长，之后按 tail 循环
        life: 1600,           // 单朵小花存活（ms）
        minSize: 26, maxSize: 46,
        petals: 5,
        maxAlive: 16,         // 同屏上限（低帧率减半）
        bandTop: 396,         // 上留白带下界：结算卡上边缘 410 再留 14
        bandTopMin: 150,      // 上留白带上界：避开顶栏（返回/关卡名/生命+倒计时）
        bandBottom: 1120,     // 下留白带上界：卡片下边缘 1110 再留 10
        bandBottomMax: 1360   // 下留白带下界：避开底部工具栏（1370~1470）
      }
    },

    /* ---------- v0.5 经济系统（巧币 / 体力） ----------
     * 全部纯逻辑，无服务端；存档持久化在本地。
     * 广告为「模拟广告」：个人主体无法开通流量主，点击后走 adSimMs 进度条再发奖。 */
    ECON: {
      coinInit: 120,          // 新玩家/老存档补发的初始巧币
      coinClear: 20,          // 通关奖励
      coinClear3Star: 30,     // 三星奖励（覆盖 coinClear）
      coinRevive: 100,        // 巧币复活价格
      energyMax: 16,          // 体力上限
      energyInit: 16,         // 初始体力
      energyRecoverSec: 300,  // 每 5 分钟恢复 1 点（离线和在线都算）
      energyCostLevel: 2,     // 进入一关消耗（v0.7：1 → 2，用户要求）
      freeEnergyPerDay: 3,    // 每日免费体力次数上限
      freeEnergyShare: 2,     // 「分享获得」+2
      freeEnergyAdMul: 4,     // 「4 倍获得」= 2×4 = 8
      onlineRewardSec: 180,   // 在线奖励间隔（秒）
      onlineRewardCoin: 10,   // 在线奖励巧币
      taskCoin: 10,           // 任务①完成 1 关
      taskCoin3: 20,          // 任务②获得 3 星
      taskEnergy: 2,          // 任务③玩 3 局
      taskPlays: 3,           // 任务③所需局数
      reviveMaxPerLevel: 2,   // 同一关最多复活次数
      adSimMs: 1200           // 模拟广告时长
    },

    /* ---------- v0.5 倒计时 / 生命值 ----------
     * 每关倒计时，时间按三等分映射为 3/2/1 颗心；归零失败。
     * 关卡数据未定义 timeLimit 时用 parTime×parFactor，并夹在 [minSec,maxSec]。 */
    TIMER: {
      minSec: 90,
      maxSec: 240,
      parFactor: 2.5,
      hearts: 3,
      warnSec: 20
    },

    /* ---------- v0.5 皮肤（只覆盖配色，绝不改布局/几何） ----------
     * 切换时把子集写回 COLORS 并 persist；缺省字段沿用暖木原值。 */
    SKINS: {
      warm: {
        name: '暖木',
        bg: '#F6E9D4', bgDeep: '#EFDFC6', text: '#2C3A4B', textSub: '#7A8A9C',
        gold: '#FFB93D', goldDeep: '#FF9F1C', goldEdge: '#E08A00',
        card: '#FFFFFF', line: '#E3E9F2', lineDeep: '#C3CDD9',
        tint: null                      // 暖木：不叠色罩
      },
      mint: {
        name: '薄荷',
        bg: '#E9F7F1', bgDeep: '#D6EEE4', text: '#22463B', textSub: '#6B8C81',
        gold: '#5ACBA4', goldDeep: '#3FBA90', goldEdge: '#2C9E78',
        card: '#FFFFFF', line: '#DCEBE4', lineDeep: '#BFD9CE',
        tint: 'rgba(58,178,138,0.20)'   // 薄荷：米色背景叠淡绿罩
      },
      night: {
        name: '夜空',
        bg: '#E2E8FA', bgDeep: '#CFD8F0', text: '#26304A', textSub: '#68728E',
        gold: '#8E7CEB', goldDeep: '#7A66DF', goldEdge: '#6350C4',
        card: '#FFFFFF', line: '#DEE4F7', lineDeep: '#C2CBEA',
        tint: 'rgba(112,98,205,0.24)'   // 夜空：叠淡紫罩
      }
    },

    /* ---------- v0.5 多首 BGM（场景键；实际旋律在两端 game.js 里合成） ----------
     * home=主页温馨；lv1/lv2/lv3=关卡三首轮换（每通一关切下一首）。 */
    BGM: {
      home: { name: '主页·暖阳', bpm: 60 },
      lv1: { name: '关卡·木琴轻快', bpm: 96 },
      lv2: { name: '关卡·五声明亮', bpm: 104 },
      lv3: { name: '关卡·琶音舒展', bpm: 88 },
      /* v0.6：通关场景。结算面板停留期间循环播放，进入下一关才切回关卡曲。 */
      win: { name: '通关·欢庆', bpm: 112 },
      scenes: ['lv1', 'lv2', 'lv3']
    },

    /* ---------- 存档 ---------- */
    SAVE_KEY: 'tangram_save_v1',

    /* ---------- 美术素材（2 张，已到位） ----------
     * 取消 panel_card.png：白卡纸是纯几何，Canvas 画得比九宫格拉伸更准。
     * 文件缺失时 run 期会自动回退到程序化背景，不会 404 崩掉。 */
    ART: {
      enabled: true,
      base: './assets/img/',
      files: {
        home_bg_desk: 'home_bg_desk.png',   // 750×1624 主界面背景
        board_paper: 'board_paper.png'      // 800×800  拼图区底衬
      }
    },

    /* ---------- 音频（5 个文件，已到位） ----------
     * 3 个短音效是 .wav（MP3 固定 25ms 编码延迟，手感可感知）。
     * gain / 循环点参数来自音频交付说明 §1 §4.2 §6。 */
    AUDIO: {
      enabled: true,
      base: './assets/audio/',
      files: {
        bgm_main: 'bgm_main.mp3',
        sfx_pick: 'sfx_pick.wav',
        sfx_snap: 'sfx_snap.wav',
        sfx_win: 'sfx_win.mp3',
        sfx_tap: 'sfx_tap.wav'
      },
      /* v0.6 音量校准（v0.5 无声的真正根因）：
       * 合成 BGM 的单音振幅只有 0.024~0.030，再乘 bgmVolume 0.30 → 峰值约 0.008
       * （≈ -42 dBFS），手机扬声器基本听不见。现在的口径是：
       *   单音振幅 bgmNote.*  ≈ 0.05~0.08，bgmVolume 1.0 → 和弦叠加峰值 ≈ 0.13，
       *   与原来 mp3（满刻度素材 × 0.30）听感相当。
       * bgmLegacyVolume 只用于 mp3 / <audio> 回退路径，避免满刻度素材被叠加放大。 */
      bgmVolume: 1.0,           // 合成 BGM 总线（常态）
      bgmDuckVolume: 0.55,      // 结算/弹窗出现时压低（v0.5=0.18，已听不清）
      bgmLegacyVolume: 0.30,    // mp3 / element 回退路径的音量上限
      /* v0.7 二次提音量：v0.6 的 0.052/0.078/0.058 实测峰值仍只有 0.13（≈-17.7dBFS），
       * 手机外放仍偏小。现在提到 0.15/0.26/0.19，主旋律+根音峰值 0.41（≈-7.7dBFS），
       * 约为 v0.6 的 +10dB；总线保持 1.0，靠 bgmLimit 软限幅兜住叠加峰值。 */
      bgmNote: { root: 0.15, lead: 0.26, other: 0.19 },
      /* v0.6：换真人做的 BGM 只需两步——把音频放进 assets/audio/、把这里改成 false。
       * true=用代码合成的 5 首场景曲（零音频文件）；false=走 bgm_main.mp3 精确循环。 */
      useSynthBgm: true,
      sfxVolume: 1.0,
      sfxGain: { sfx_snap: 1.00, sfx_win: 1.00, sfx_pick: 0.90, sfx_tap: 0.80 },
      // MP3 解码后 3088512 采样 = 1105 前置填充 + 3087000 音乐 + 407 尾填充
      loopStart: 1105 / 44100,
      loopEnd: (1105 + 3087000) / 44100,
      fadeMs: 220,
      tapGuardMs: 40,
      snapVoices: 2
    }
  };
});
