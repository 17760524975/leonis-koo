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
    version: 'v0.29.2',

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
      /* v0.9 广告位：顶栏下整条 702×112 的 banner 预留区（设计 px，375 屏约 351×56 CSS）。
       * 真机由 wx.createBannerAd 原生绘制在这块空白上；预览端只画虚线占位框。
       * 它不参与任何点击判定（避免误点），棋盘整体下移到 302 让出位置。 */
      AD: { x: 24, y: 184, w: 702, h: 112, cssMinW: 300 },
      // 拼图区：1000×1000 逻辑坐标映射到正方形 BOARD（等比，不拉伸）
      // y 从 302 起：顶栏 88..178 + 广告位 184..296，卡纸不能压住返回按钮（真机截图验收发现过）
      BOARD: { x: 24, y: 302, size: 702 },
      PROGRESS: { x: 60, y: 1024, w: 630, h: 14 },
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
      /* v0.9 托盘改为「散放」：取消 2×2 槽位网格。
       * 旧版槽位按 bbox + pad + minW/minH 撑开，四块板就占 700×410，
       * 加上整排浅底框，视觉上半个屏都是工具区（用户反馈「占用区域太大」）。
       * 新版把板件仍按 1:1 散放在一条带子里，允许部分重叠，只在需要时才占高度。
       * 约束（由 core.js pilePack 保证）：
       *   ① 每块板可见面积 ≥ minVisible，任何一块都点得到；
       *   ② 每块板的质心不被别的板压住，点质心必定选中它；
       *   ③ 全部落在 [top,bottom] 带内，不压进度条、不压工具栏。 */
      PILE: {
        cell: 8,            // 覆盖率采样格（设计 px）
        step: 12,           // 候选质心搜索步长
        pad: 10,            // 带子左右留白
        jitter: 16,         // 伪随机抖动，避免排成整齐网格
        minVisible: 0.58    // 单块最少可见面积占比
      },
      TRAY: {
        top: 1072, bottom: 1352,      // 散放带上下界（离进度条 34、离工具栏 20）
        pad: 10
      },
      /* v0.3.4 A1：七巧板托盘「绘制间距」修正。levels.js 数据集一个字节不动，
       * core.js buildSet() 在算槽位时叠加这组覆盖（槽位热区同步，判定/关卡数据不变）。
       * 原数据 gapY:4 → 相邻行槽框只隔 4 设计 px（375 屏 2 CSS px），空槽虚线框与
       * 板件阴影压住下一行板件顶；top:912 → 首行距进度条底(910)仅 6.8px。
       * 修后：首行顶 926.8（距进度条 16.8）、行间 10、末行底 1409.2（工具栏 1420）。
       * 小板 bbox 75.1 < minH 76，仍完整落在自己槽内。 */
      TRAY_OVERRIDE: {
        tangram7: { top: 1064, bottom: 1356 }   // 7 块比 4 块多一层，带子上下各放 8
      },
      TOOLBAR: { y: 1372, w: 120, h: 100, gap: 16 },
      BTN_EDGE: 2,                       // 按钮底部厚边（高密度屏 4px 太笨重）
      MIN_HIT: 88,                       // 最小可点热区

      /* v0.6 主页版式：verify_v06 直接读这组数做「标签不压下一图标」断言，
       * 避免验收脚本里再抄一份魔数导致两边漂移。 */
      HOME: {
        entryX: 104, entryW: 88, entryY0: 430, entryGap: 142,
        labelDy: 68, labelSize: 20,
        startY: 1010, set4Y: 1148, set7Y: 1274
      },
      /* v0.7 HUD：巧币 / 体力做成带描边的胶囊（参考用户给的截图）。
       * 图标压在胶囊左端外侧，数字统一 fontSize/700 白字，两行间距 rowGap。
       * 验收脚本读这组数据算净空，不再抄魔数。 */
      HUD: {
        iconX: 96,                        // 图标中心 x
        y0: 20,                           // 巧币行中心距安全区顶（v0.6=58→v0.7=38→v0.29.1=20，再上移 18）
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
        coinScale: 1.45, energyScale: 1.32,  // 图标直径 ≈ 胶囊高的 0.7~0.75，才压得住整条胶囊
        /* v0.29.1：用户更正——位置应是**左上角**。回到 iconX 左锚定；
         * y0 再上移 18，胶囊顶落在安全区上沿之上 8px（左侧没有微信原生胶囊，不会遮挡）。
         * rightAnchor 保留为开关，默认关闭；如以后真要回右上角，设 true 并补 rightPad 即可。 */
        rightAnchor: false
      },
      /* v0.17 对局页 HUD：顶栏左侧常驻的巧币 / 体力余量（竖排两枚）。
       * 为什么在左侧：**真机右上角是微信原生胶囊按钮**（「···」和「○」，
       * 375 屏约 x 278~368 / y 26~58 CSS，系统层盖在画布之上），
       * 画在那儿的 UI 会被压掉一半，网页预览里却完全正常 —— 这个坑必须提前避开。
       * 左侧能用的只有「返回按钮(32..108) 右边」这一段：
       *   118..219 放两枚胶囊，倒计时胶囊从 255 起，中间留 36 净空。
       * 关号因此让位到卡纸内左上角（见 renderPlay）。
       * 高度：两行中心 by±21，胶囊占 89..167，与返回按钮 90..166 几乎完全对齐，
       * 上不越 safeTop，下不碰 184 起的广告位。
       * maxW 是硬上限：数字变长（999→1280）时先量宽，超了就降字号，绝不压到倒计时上。 */
      HUD_MIN: {
        left: 120,                        // 胶囊左沿 x（返回按钮右沿 108，留 12 与右端 17 的净空大致均衡）
        pillH: 36, rowGap: 44,            // 胶囊高 / 两行中心间距（36 + 8 缝，缝再细两枚就粘一起）
        iconInset: 21, border: 2,         // 图标中心在胶囊内距左沿的距离（主页那套是压在端头外侧，
                                          //   这里放不进去：图标外溢会顶到返回按钮的白色框上）
        padL: 43, padR: 18,               // 文字起点要避开图标右沿（21+17=38，再留 5）
        fontSize: 24, subFontSize: 17,    // 主数字 / 分母「/16」小一号
        minFontSize: 18,                  // 降字号兜底的下限
        fontWeight: '700',
        maxW: 127,                        // 单枚胶囊的宽度上限（≤ 倒计时左沿 255 − left 118 − 10 净空）
        textColor: '#FFFFFF',
        pillFill: 'rgba(30,40,52,0.72)',  // 与主页 HUD 同款深底，白字对比度约 7:1
        pillStroke: 'rgba(255,255,255,0.62)',
        coinScale: 0.78, energyScale: 0.70,
        /* v0.29.1 用户更正：回到左上角——返回按钮右沿 108 之后、倒计时胶囊 255 之前（120..247）。
         * topShift=8：两枚胶囊整体上移 8px，顶沿同样贴近安全区上沿；rightAnchor 默认关闭。 */
        topShift: 8, rightAnchor: false
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

    /* ---------- v0.8 结算面板 / 连胜 / 排行榜 ---------- */
    /* v0.23：结算页多了一行「首通奖励 + 看视频 ×5」，卡片 800 → 840、整体下移 7px。
     * 竖向预算（卡内 335~1175，共 840）：
     *   连胜条 375~429 / 标题 462 / 关名 492 / 图案框 506~700 / 星级 717~759
     *   数据 781~836 / 奖励条 845~899 / 主按钮 907~985 / 第二排 999~1063 / 第三排 1077~1127
     * 奖励条与主按钮只隔 8px 是有意的：它是"主按钮之上的横向提示条"，
     * 不是第四个同级按钮；间隔再大就会被读成"并列的两个主操作"。 */
    WIN: {
      cardW: 620, cardH: 840, cy: 755,
      streakY: 402, streakH: 54, streakX0: 96, streakX1: 654,
      titleY: 462, titleSize: 29,
      nameY: 492, nameSize: 19,
      shapeY: 608, shapeBox: 196, shapeMax: 178,   // 图案预览框边长 / 图案最大边
      starY: 738, starR: 21, starGap: 72,
      statLabelY: 792, statValueY: 822,
      rewardY: 868, rewardH: 52, rewardW: 500,
      /* v0.24：×5 与「下一关 / 返回」并排（原来 ×5 挤在奖励条右端，宽 160 太小）。
       * 排宽 = adMulW + btnGap + primaryW，渲染时按这个总宽整体居中；
       * 没有 ×5 可领时主按钮单独回落到 360 宽居中。 */
      primaryY: 944, primaryH: 74, primaryW: 320, adMulW: 210, btnGap: 22,
      row2Y: 1031, row2H: 64,
      row3Y: 1102, row3H: 50
    },
    /* 连胜：每 streakStep 连击给一次巧币，进度条按当前轮显示 n/streakStep
     * v0.19 口径（用户确认）：
     *   胜 = 本段连胜里「成功完成的一局」。用过查找道具 / 巧币提示 / 广告提示、
     *        复活过、该关以前通过没有 —— 一律照算（这是本次修订的核心）
     *   不计 = 该关在「当前这一段连胜」里已经计过一次（防同一关连刷，榜刷不动）
     *   负 = 该关计时归零且没复活（点「忍痛放弃」/ 直接离开）→ 连胜清零 + 本段集合清空
     *   续 = 复活时连胜值与「本段已计关集合」一起接回来
     *   榜单按「历史最高连胜」排，失败不会把已经打出来的成绩抹掉；
     *   一段内每关最多计一次 → 最高连胜天然被该数据集关卡数封顶。 */
    STREAK: { step: 5, coin: 60 },

    /* 排行榜：主线 / 连胜走云开发；好友榜走微信「开放数据域」
     * （openDataContext + wx.getFriendCloudStorage，见 miniprogram/openDataContext/）。
     * 云开发拿不到微信好友关系，所以好友榜不能复用 players 集合。 */
    RANK: {
      tabs: ['主线榜', '连胜榜', '好友榜'],
      /* v0.9：榜单数据来自云开发（真实用户），mock 只在本地调试时用。
       * 想在本机看版式：把 useMock 改 true，或 preview 里带 ?mockrank=1。 */
      useMock: false,
      topN: 20,
      unit: ['关', '连胜', '关'],   // 连胜榜按「连胜场次」计，别沿用「关」
      /* v0.18：榜单行版式（主域与开放数据域共用同一组数，好友榜画出来才对得上）
       *   x/w 为卡片内的行宽，top 为第一行中心，step 行距，rowH 行高，
       *   rows 可视行数，h 整块列表高度（= rows × step，开放数据域画布尺寸） */
      list: { x: 92, w: 566, top: 566, step: 84, rowH: 74, rows: 7, h: 588 },
      /* 好友榜页脚提示（真机走开放数据域时显示在列表下方） */
      friendNote: '好友榜只显示已授权微信好友 · 数据来自微信关系链',
      mock: {
        0: [
          { n: '废的柴', v: 18153, c: '#FF8A5B' },
          { n: '泡泡', v: 14410, c: '#4FA8E0' },
          { n: '刘晓飞二大爷', v: 13903, c: '#63C88B' },
          { n: '尼西ヾ゛26G', v: 10470, c: '#A87BE8' },
          { n: 'wayne wong', v: 9338, c: '#D96A9B' },
          { n: '彩云之川', v: 9249, c: '#FFC53D' },
          { n: '木木不吃鱼', v: 8032, c: '#3FB8B0' }
        ],
        1: [
          { n: '连击王阿哲', v: 126, c: '#FF8A5B' },
          { n: '泡泡', v: 98, c: '#4FA8E0' },
          { n: '废的柴', v: 87, c: '#63C88B' },
          { n: '小满', v: 66, c: '#A87BE8' },
          { n: 'wayne wong', v: 51, c: '#D96A9B' },
          { n: '彩云之川', v: 40, c: '#FFC53D' },
          { n: '木木不吃鱼', v: 33, c: '#3FB8B0' }
        ],
        2: [
          { n: '泡泡', v: 120, c: '#4FA8E0' },
          { n: '刘晓飞二大爷', v: 96, c: '#63C88B' },
          { n: '尼西ヾ゛26G', v: 74, c: '#A87BE8' },
          { n: '小满', v: 52, c: '#D96A9B' },
          { n: 'wayne wong', v: 41, c: '#FFC53D' },
          { n: '木木不吃鱼', v: 28, c: '#3FB8B0' },
          { n: '阿树', v: 19, c: '#FF8A5B' }
        ]
      }
    },


    /* ---------- v0.9 云开发（微信登录 + 云端存档 + 真实排行榜） ----------
     * envId 填「云开发控制台 → 设置 → 环境 ID」，一般形如 fangcun-3gxxxxxx。
     * 留空 = 不启用（游戏退化为纯本地存档，排行榜显示「未开启云同步」），
     * 这样没有云环境的同学也能跑起来，不会白屏。 */
    CLOUD: {
      enabled: true,
      envId: 'cloud1-d4g6rm6duad5ba0aa',   // ← v0.10 已填（用户环境 ID）
      fn: 'player',              // 云函数名（cloudfunctions/player）
      pushDebounceMs: 3500,      // 存档上行节流：连拼几关只写一次
      pullOnBoot: true           // 启动时拉一次云端存档做合并
    },

    /* ---------- v0.14 玩家资料（微信昵称 / 头像） ----------
     * 微信自 2022-10-25 起收回了「静默读取真实头像昵称」：
     *   · 小程序侧   → 只能让用户自己填（button open-type="chooseAvatar" + input type="nickname"）；
     *   · 小游戏侧   → 官方唯一途径是 wx.createUserInfoButton（用户点击授权），
     *                  已授权后再用 wx.getUserInfo 静默刷新。
     * 所以本作分三档 identity：
     *   auto   = 云函数按 openid 生成的化名「巧手1234」（默认，零打扰）
     *   wx     = 玩家点了「使用微信昵称头像」，拿到真实昵称 + 头像 URL
     *   custom = 玩家自己起的名字（小程序授权按钮不可用 / 玩家拒绝时的兜底）
     * 昵称会随存档上行到 players 集合，排行榜展示的就是这一份。 */
    PLAYER: {
      nickMax: 12,               // 与云函数 MAX_NICK 保持一致
      defaultName: '巧手',       // 云还没登录时的占位名（云函数会补 4 位数字）
      authLabel: '使用微信昵称头像',
      editLabel: '改昵称',
      /* 设置页资料卡（设计坐标，相对卡片中心 cy 的纵向偏移） */
      card: { w: 496, h: 168, dy: -246, avatarR: 46, gap: 20 },
      authBtn: { w: 340, h: 76, dy: -104 },
      /* 榜单每行头像半径（rankRow 里用） */
      rankAvatarR: 26
    },

    /* ---------- v0.9 广告位 ----------
     * 按微信流量主后台创建的广告位填 unitId；留空则不加载任何广告，
     * 版式里预留的位置会留白（不影响判定与排版）。
     * 收益结构建议见《v0.9-云开发与广告接入规格.md》，简单说：
     *   激励视频（复活/领体力）eCPM 远高于 banner，banner 只做"存在感"收入。 */
    ADS: {
      banner: {
        unitId: '',              // ← 对局页顶部 banner 广告位 ID
        refreshSec: 30           // 微信要求 banner 至少 30s 才能刷新
      },
      rewarded: {
        unitId: '',              // ← 激励视频广告位 ID（复活 / 领体力 / 双倍巧币）
        reviveOffer: 1           // 复活弹窗里"看广告复活"最多几次
      },
      interstitial: {
        unitId: '',              // ← 插屏广告位 ID（每 3 关弹一次）
        everyLevels: 3
      }
    },

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
        bandTop: 329,         // 上留白带下界：v0.23 结算卡上边缘 335 再留 6
        bandTopMin: 150,      // 上留白带上界：避开顶栏（返回/关卡名/生命+倒计时）
        /* 下界要同时让开三样：卡片下边缘 1175、小花上浮 rise(≤36)、花瓣半径(≤24)。
         * v0.8 只留 8px 时，靠上的花会飘到「重玩 / 回列表」那排字上（截图实测压字）。 */
        bandBottom: 1237,     // 下留白带上界：1175 + 36(上浮) + 26(半径)
        bandBottomMax: 1360   // 下留白带下界：避开底部工具栏（1370~1470）
      }
    },

    /* ---------- v0.5 经济系统（巧币 / 体力） ----------
     * 全部纯逻辑，无服务端；存档持久化在本地。
     * 广告为「模拟广告」：个人主体无法开通流量主，点击后走 adSimMs 进度条再发奖。 */
    /* ---------- v0.23 经济再平衡（方案 C，不含"巧币买体力"） ----------
     * 旧口径的三个结构性问题：
     *   ① 看广告复活倒给 90 巧币 —— 比付费复活（-100）还划算，
     *      最优策略变成"故意失败看广告"，和"别失败"的设计意图反了；
     *   ② 通关奖励不分首通/重复 —— 第 1 关 30 秒一局稳拿 30 巧币，是全场最高效刷币点；
     *   ③ 单关收入（25~37）低于一次提示（40）—— 越需要提示的人越穷。
     * 新口径：
     *   · 首通才给，按星级 2 / 3 / 5；结算页可看视频 ×5（只作用于当次，下一关要再点）；
     *   · 重复通关 0 奖励，**同时不扣体力**（不给奖励还收门票，是纯罚）；
     *   · 广告复活不再给巧币，且每关不限次数；
     *   · 初始 120 → 50；提示 40 → 30；巧币复活 100 → 80。 */
    ECON: {
      coinInit: 50,           // 新玩家初始巧币（v0.23：120 → 50）
      coinFirst: [2, 3, 5],   // 首通奖励，下标 = 星级-1（1★/2★/3★）
      coinWinAdMul: 5,        // 结算页看视频翻倍（×5，只作用当次通关奖励）
      coinRevive: 80,         // 巧币复活价格（v0.23：100 → 80）
      energyMax: 16,          // 体力上限
      energyInit: 16,         // 初始体力
      energyRecoverSec: 300,  // 每 5 分钟恢复 1 点（离线和在线都算）
      energyCostLevel: 2,     // 进入一关消耗（v0.7：1 → 2，用户要求）
      freeEnergyPerDay: 3,    // 每日免费体力次数上限
      freeEnergyShare: 2,     // 「分享获得」+2
      freeEnergyAdMul: 4,     // 「4 倍获得」= 2×4 = 8
      /* v0.16：每日任务下线（主页不再有「任务」入口），奖励挪到邀请有礼 */
      inviteCoin: 20,         // 邀请有礼：每日首次分享
      inviteHint: 1,          // 邀请有礼：顺带 1 个查找道具
      /* v0.23：删掉 reviveMaxPerLevel —— 复活不再设每关上限（用户要求可多次看视频复活）。
       * state.reviveUsed 保留，仅作统计，不再参与判定。 */
      adSimMs: 1200,          // 模拟广告时长
      coinHint: 30            // 提示价格（v0.23：40 → 30，与首通收入对齐）
    },

    /* ---------- v0.15 每日在线奖励 ----------
     * 取代 v0.5 的「每 3 分钟点一次 +10 巧币」：改成按「今日累计在线时长」解锁 6 档，
     * 每档只领一次，每日 0 点清零（与 todayKey() 同一天界）。
     *
     * 为什么用累计时长而不是连续在线：
     *   连续在线会被「切后台回消息」打断，玩家为了奖励不敢退，体验差；
     *   累计时长对玩家宽容，也更符合「在线奖励」的常规定义。
     * 只算前台：onHide 停表，onShow 重新起表（详见 core 的 onlineSync）。
     *
     * 体力档允许溢出上限（如 16/16 领 +20 → 36/16）：
     *   在线奖励是「白给的」，被上限吃掉会让玩家觉得领了个寂寞；
     *   体力恢复逻辑在 energy >= max 时本来就不计时，溢出不会产生副作用。 */
    ONLINE: {
      persistSec: 15,         // 每 15 秒落一次本地存档（不触发云端上行）
      maxSec: 6 * 3600,       // 累计上限 6 小时：档位最高 60 分钟，再往后不再累加
      tiers: [
        { id: 'o1', at: 60,    label: '1 分钟',  energy: 6,  coin: 5,  hint: 0 },
        { id: 'o2', at: 300,   label: '5 分钟',  energy: 0,  coin: 5,  hint: 0 },
        { id: 'o3', at: 600,   label: '10 分钟', energy: 6,  coin: 5,  hint: 0 },
        { id: 'o4', at: 1200,  label: '20 分钟', energy: 0,  coin: 10, hint: 0 },
        { id: 'o5', at: 2400,  label: '40 分钟', energy: 6,  coin: 0,  hint: 1 },
        { id: 'o6', at: 3600,  label: '60 分钟', energy: 20, coin: 10, hint: 1 }
      ]
    },

    /* ---------- v0.10 提示机制（统一三档阶梯 + 广告/巧币入口） ----------
     * 旧版分裂行为（本次统一掉）：
     *   四巧板：只能按 1 次，按完按钮永久变灰 —— 玩家以为坏了；
     *   七巧板：再按会「降档」，即把目标轮廓从细实线变成纯剪影 —— 越按越难，语义反了。
     * 新版四巧/七巧共用同一条阶梯，档位只升不降：
     *   档1 指位置：高亮「下一块该落在哪」（原行为）
     *   档2 指板件：档1 + 托盘里那块描边脉冲 + 一条引导虚线（省掉"在哪块"的搜索）
     *   档3 看全图：整幅标准解淡显（每块的位置/朝向都能看清，3.6s 后消失）
     * 成本（v0.16 起）：**每关不再白送**，三档每一档都要付一次，三选一：
     *   ① 消耗 1 个「查找道具」（在线奖励 40/60 分钟、邀请有礼给，可囤）；
     *   ② 花 coinCost 巧币直接买一次（不必先囤道具）；
     *   ③ 看激励视频。
     *   ——广告只在玩家主动点开面板后出现，不静默自动播。
     * 为什么取消每关免费 1 次（用户 v0.16 要求）：
     *   免费档让「按提示」变成默认动作，查找道具与巧币都没有消耗场景；
     *   取消后提示回归"稀缺资源"，在线奖励 / 邀请有礼 / 巧币三条获取路径才有意义。
     * 星级：任一次提示 → 本关封顶 ★★（沿用 v0.3 规则，防止白送三星）。
     *       但只封顶「本局」：重玩不用提示仍可拿三星（旧版是永久封顶，属缺陷）。 */
    /* ---------- v0.20 提示（单档 · 常驻） ----------
     * 旧版是三档阶梯：第 1 档指位置、第 2 档指板件、第 3 档看全图，每档只亮 3.5 秒。
     * 玩家用下来两个问题：① 想知道"哪块放哪"要连买两档；② 高亮一闪就没了，
     * 低头看托盘再抬头就找不着了。
     * 现在只有一种提示，也永远只有这一句：**下一块是哪块、放到哪里**。
     *   · 棋盘上：目标位置的脉冲高亮 + 金色虚线（放对之前一直亮着，不再定时消失）
     *   · 托盘里：把要用的那块圈起来，并画一条虚线连到落点
     *   · 那块已经上板但摆歪了：圈出它 + 箭头指向正确落点（旧版最容易卡住的场景）
     * 每次仍要付费（查找道具 / 巧币 / 看视频），本关不限次数 —— 想一步步全提示
     * 也行，只是每一步都要付一次。 */
    HINT: {
      coinCost: 30,          // v0.23：40 → 30
      itemName: '查找道具',
      labels: { place: '放这里', move: '移到此处', use: '用这块' }
    },

    /* ---------- v0.21 新手教学（每类游戏第 1 关） ----------
     * 参考视频的做法：教学不弹窗讲规则，而是让玩家在第一关里"照着做"。
     *   · 标准解按彩色淡显铺在轮廓里（ghostAlpha）—— 有参照物，不用猜
     *   · 卡纸顶部一行指令（textY 是基线相对卡纸顶的距离），配手势图标
     *   · 倒计时冻结（freezeTimer）：教学关了倒计时，新手不会被时间逼死
     * 指令按「下一块还差什么」实时算：没上板教拖、角度不对教转、翻了面教翻，
     * 所以第 1 关用得上哪种手势就教哪种，不会教到本关用不上的动作。 */
    TUTORIAL: {
      on: true,
      /* 每类游戏（四巧板 / 七巧板）的第 1 关。
       * v0.25：判据是"这一关通没通关"—— 没通关就一直教，通关过一次就不再打扰。
       * 不再用存档里的一次性标记，所以清缓存/换设备/重置进度都能重新看到。 */
      levels: 1,
      freezeTimer: true,    // 教学关不扣倒计时
      ghostAlpha: 0.34,     // 标准解淡显透明度
      textY: 74,            // 指令基线：卡纸顶往下 74（卡纸 302 起，轮廓最高点 ≥503，净空足够）
      textSize: 26,
      iconR: 30,            // 手势图标半径
      skipW: 116,           // 「跳过」热区宽（高按 MIN_HIT 兜底）
      skipText: '跳过教学'
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
      },
      sunset: {
        name: '落日',
        bg: '#FCE6D4', bgDeep: '#F6CDB2', text: '#4A2C25', textSub: '#936A57',
        gold: '#FF8A5B', goldDeep: '#F2703C', goldEdge: '#D4521F',
        card: '#FFFFFF', line: '#F3DFD2', lineDeep: '#E4BFA8',
        tint: 'rgba(242,112,60,0.14)'
      },
      ocean: {
        name: '海岸',
        bg: '#E4F2F6', bgDeep: '#C7E4EC', text: '#1D3D48', textSub: '#5E8896',
        gold: '#3FB8B0', goldDeep: '#2A9E96', goldEdge: '#1C827A',
        card: '#FFFFFF', line: '#D7E9EE', lineDeep: '#B4D6DE',
        tint: 'rgba(63,184,176,0.14)'
      }
    },

    /* ===== v0.27 视觉升级 · 皮肤功能扩展 =====
     * 三类可独立选择的风格，均存进存档（bgFx / pieceStyle / sfxStyle），
     * 与配色 skin 彼此独立、任意组合。全部纯 Canvas / WebAudio 程序化绘制，
     * 零新增素材、零包体增长。 */

    /* ---------- 主页动态背景特效（Canvas 程序化，零图片） ----------
     * classic 沿用原暖木光斑；其余为新增粒子特效，mode 决定绘制分支。
     * 低帧率自动减半粒子（state.lowFps），reduceMotion 全停。 */
    BG_FX: {
      classic:   { name: '暖木微光', desc: '原版柔光',     mode: 'glow' },
      aurora:    { name: '流光溢彩', desc: '极光缓缓流动', mode: 'aurora' },
      /* v0.28：星夜流萤 / 星云流转改为深色夜空底，粒子才看得清（dark:true 由 drawFxLayer 铺深底） */
      stars:     { name: '星夜流萤', desc: '深蓝夜空 + 流萤', mode: 'stars',   dark: true },
      bubbles:   { name: '泡泡漂浮', desc: '彩色气泡上浮', mode: 'bubbles' },
      petals:    { name: '花瓣飘落', desc: '花瓣随风飘落', mode: 'petals' },
      geometric: { name: '几何轻舞', desc: '碎片漂浮旋转', mode: 'geometric' },
      /* v0.28 新增 4 套：粒子更密、对比更强，主页 / 关卡 / 对局三处共用 */
      snow:      { name: '初雪纷飞', desc: '白雪缓缓飘落', mode: 'snow' },
      rain:      { name: '烟雨绵绵', desc: '雨丝斜落带涟漪', mode: 'rain' },
      firefly:   { name: '萤火之森', desc: '夜色 + 点点萤火', mode: 'firefly', dark: true },
      nebula:    { name: '星云流转', desc: '深紫星云缓缓旋转', mode: 'nebula',  dark: true }
    },
    BG_FX_PARTS: {
      aurora:    { bands: 5, speed: 0.085 },
      stars:     { count: 92, shootGap: 3200 },
      bubbles:   { count: 32 },
      petals:    { count: 28 },
      geometric: { count: 22 },
      snow:      { count: 62 },
      rain:      { count: 60 },
      firefly:   { count: 40 },
      nebula:    { clouds: 6 }
    },

    /* ---------- 七巧板 / 四巧板 板件样式（只改绘制，不动几何/判定/热区） ---------- */
    PIECE_STYLES: {
      classic: { name: '经典', desc: '纯色白边' },
      candy:   { name: '糖果', desc: '糖果渐变' },
      wood:    { name: '原木', desc: '木质纹理' },
      neon:    { name: '霓虹', desc: '暗底发光' },
      pastel:  { name: '马卡龙', desc: '柔和粉彩' },
      /* v0.28 新增 4 套质感 */
      crystal: { name: '水晶', desc: '通透高光棱面' },
      metal:   { name: '金属', desc: '拉丝银灰光泽' },
      jade:    { name: '玉石', desc: '温润云纹玉质' },
      glow:    { name: '荧光', desc: '亮色柔光描边' }
    },

    /* ---------- 交互音效风格（影响 game.js 合成音的音色） ----------
     * pitch=频率倍率、decay=时值倍率、wave=振荡器类型、bell=是否加泛音层。
     * wood 为当前默认音色；其余由两端 game.js 的 setSfxStyle 应用。 */
    SFX_STYLES: {
      wood:   { name: '木质', desc: '笃·笃·笃', wave: 'sine',     pitch: 1.00, decay: 1.00, bell: false },
      bell:   { name: '铃铛', desc: '清脆铃音', wave: 'triangle', pitch: 1.62, decay: 1.30, bell: true  },
      water:  { name: '水滴', desc: '叮咚水声', wave: 'sine',     pitch: 1.34, decay: 0.72, bell: true  },
      retro:  { name: '复古', desc: '电子街机', wave: 'square',   pitch: 0.94, decay: 0.58, bell: false },
      /* v0.28 新增 4 套音色 */
      chime:  { name: '风铃', desc: '空灵悠长', wave: 'sine',     pitch: 1.90, decay: 1.85, bell: true  },
      marimba:{ name: '木琴', desc: '圆润弹跳', wave: 'triangle', pitch: 1.15, decay: 0.62, bell: false },
      bubble: { name: '泡泡', desc: '轻快啵啵', wave: 'sine',     pitch: 1.55, decay: 0.42, bell: true  },
      synth:  { name: '合成器', desc: '未来电子', wave: 'sawtooth', pitch: 0.86, decay: 0.92, bell: false }
    },

    /* ---------- v0.28：深色背景特效自动切换的暗色调色板 ----------
     * 当 bgFx 带 dark:true（星夜流萤 / 萤火之森 / 星云流转）时叠加在皮肤配色之上，
     * 保证深色夜空里文字 / 卡片仍清晰。切换皮肤或背景时统一由 refreshPalette() 重算。 */
    DARK_PAL: {
      bg: '#101733', bgDeep: '#080D20', bgTop: '#1B2450',
      text: '#F2F5FF', textSub: '#B9C6E6', textOn: '#FFFFFF', btnText: '#241700',
      card: 'rgba(28,36,62,0.94)', cardEdge: 'rgba(170,190,235,0.28)', board: 'rgba(24,32,56,0.92)',
      line: 'rgba(180,196,236,0.26)', lineDeep: 'rgba(180,196,236,0.45)',
      gold: '#FFD166', goldDeep: '#FFB93D', goldEdge: '#E89B22',
      disabledBg: 'rgba(255,255,255,0.08)', disabledIcon: 'rgba(200,212,240,0.35)',
      targetFill: 'rgba(130,155,215,0.18)', targetEdge: '#A8BEF0', targetSilhouette: 'rgba(150,175,225,0.30)',
      splitLine: 'rgba(190,208,245,0.65)', track: 'rgba(180,196,236,0.22)',
      starOff: 'rgba(180,196,236,0.30)', slotBg: 'rgba(255,255,255,0.05)',
      mask: 'rgba(6,10,24,0.68)', snapRing: 'rgba(255,255,255,0.98)',
      shadow: 'rgba(0,0,0,0.32)', shadowPiece: 'rgba(0,0,0,0.40)'
    },

    /* ---------- 主页 UI 视觉增强参数 ---------- */
    HOME_VFX: {
      titleGlow: true, titleStroke: 9,      // 标题描边 + 柔光
      ringPulseMs: 2600,                    // 入口按钮呼吸光周期
      btnShineMs: 3200,                     // 主按钮流光扫过周期
      decoHalo: true, decoSparkN: 10,        // 帆船光晕 + 环绕星点
      /* v0.28：标题「华文彩云」字体 + 黑边白填充 */
      titleFontFamily: '"STCaiyun","华文彩云","STKaiti","KaiTi",serif',
      titleFill: '#FFFFFF', titleStrokeColor: '#141821', titleGlowColor: 'rgba(255,255,255,0.55)'
    },

    /* ---------- v0.11 真人 BGM（audio/ 下的 5 首 mp3，已压成 48kbps 单声道） ----------
     * 规则（用户指定）：
     *   · 主页固定播「主页音乐」；
     *   · 对局按章节轮换 4 首关卡曲，顺序 = 文件名开头的 1/2/3/4；
     *   · 一关之内不换曲，连过 5 关换下一首（第 1~5 关 lv1、6~10 关 lv2…）；
     *   · 四巧板 30 关 / 七巧板 60 关各自从 lv1 起算，互不影响。
     * 之所以按「关卡序号」而不是「通关次数」算：同一个关卡每次进来听同一首，
     * 玩家对关卡与音乐的对应关系是稳定的；重玩旧关也不会跳曲。 */
    BGM: {
      home: { name: '主页 · 晨光微语' },
      lv1: { name: '对局 · 巧思时刻（动态混音）' },
      lv2: { name: '对局 · 巧思时刻（动态混音）' },
      lv3: { name: '对局 · 巧思时刻（动态混音）' },
      lv4: { name: '对局 · 巧思时刻（动态混音）' },
      scenes: ['lv1', 'lv2', 'lv3', 'lv4'],
      levelsPerTrack: 5,      // 每 5 关换一首
      /* 换曲淡出/淡入时长（ms）。真机 InnerAudioContext 不支持采样级淡变，
       * 用定时器分 6 步改 volume，听感上够用，也不会有"咔"的爆音。 */
      fadeMs: 320
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

    /* ---------- 音频（v0.11：真人 BGM 5 首 + 3 个短音效） ----------
     * BGM：audio/ 原始 mp3 经 tools/audiokit/build.mjs 转成 90s / 48kbps / 单声道，
     *      单曲约 0.5MB，5 首合计 2.5MB，主包仍 <4MB（小游戏硬限制）。
     *      要换曲：把新 mp3 丢进 audio/、按 1_/2_/3_/4_ 前缀命名，再跑一次构建脚本。
     *      想听整首而不是 90s 循环：把 --sec 调大，但注意主包体积。
     * 音效仍是 wav（MP3 固定 25ms 编码延迟，手感可感知）。 */
    AUDIO: {
      enabled: true,
      base: './assets/audio/',
      files: {
        sfx_pick: 'sfx_pick.wav',
        sfx_snap: 'sfx_snap.wav',
        sfx_tap: 'sfx_tap.wav',
        /* v0.29.2：用户试听通过后启用的新版胜利音与拼接失败音。 */
        sfx_win_fanfare: 'sfx_win_fanfare.mp3',
        sfx_fail: 'sfx_fail.wav'
      },
      /* v0.29.2：三首新曲替换旧的 5 首 BGM。
       *   主页 = 晨光微语（dawn），关卡列表 = 星海漫游（starlit），
       *   对局 = 巧思时刻（flow）的 5 条 stem 动态混音。
       * lv 数组仅为兼容旧场景键 / file:// 元素池兜底，四项都指向 flow 全混。 */
      bgm: {
        home: 'bgm_dawn.mp3',
        levels: 'bgm_starlit.mp3',
        play: 'bgm_flow.mp3',
        lv: ['bgm_flow.mp3', 'bgm_flow.mp3', 'bgm_flow.mp3', 'bgm_flow.mp3']
      },
      /* v0.29.2 动态混音：5 条 stem + 紧张层，增益与 audio-lab/试听.html 的预设一致。
       * 同一时刻 start() 排程，避免微信 InnerAudioContext 多路播放的时钟漂移。 */
      mix: {
        trim: 0.42,                        // 5 路叠加后的总线衰减，给软限幅留余量
        stems: {
          pad: 'stem_flow_pad.mp3', arp: 'stem_flow_arp.mp3', bass: 'stem_flow_bass.mp3',
          perc: 'stem_flow_perc.mp3', lead: 'stem_flow_lead.mp3', tension: 'layer_tension.mp3'
        },
        presets: {
          calm:  { pad: 0.70, arp: 0.55, bass: 0.60, perc: 0.08, lead: 0.35, tension: 0 },
          play:  { pad: 0.55, arp: 0.60, bass: 0.65, perc: 0.45, lead: 0.70, tension: 0 },
          tense: { pad: 0.45, arp: 0.15, bass: 0.80, perc: 0.85, lead: 0.10, tension: 0.55 },
          win:   { pad: 0.75, arp: 0.80, bass: 0.55, perc: 0.55, lead: 0.95, tension: 0 }
        },
        fadeMs: 280,
        tenseAt: 0.20                      // 剩余时间 < 20% 切紧张层
      },
      /* ---------- v0.13 主页轻音乐（纯合成，零音频文件） ----------
       * v0.12 那版是四个正弦长音慢起慢落，实测听感像风琴/嗡鸣（"难听"），
       * 主因是：①全部正弦 + 1.1s 渐入 → 没有起音点，糊成一片；
       *          ②只有和弦没有旋律，八小节一模一样，缺"曲子"感。
       * 现在改成一首真正的轻音乐小品：
       *   · 100 BPM，八小节一段（19.2s 循环），和声 C–G–Am–F–C–G–F–G；
       *   · 四条声部：低音（三角波，每小节两下）+ 和弦轻扫（弱三角波）+
       *     八分音符琶音 + 主旋律（正弦基音 + 4 倍频泛音 = 木琴/音盒质感）；
       *   · 每个音都是"快起慢落"的木琴包络（起音 5ms），有颗粒感不再糊；
       *   · 主旋律走 C 大调五声音阶内的级进，第 4、8 小节留长音收句；
       *   · 琶音带 ±6ms 随机微延迟、±15% 力度抖动，避免机械感；
       *   · 主旋律单独一路送出，挂一个 0.32s / 24% 反馈的短回声，空间感来自这里。
       * MIDI 记谱：60 = C4。prog[i].b 是低音根音，ch 是三个和弦音。 */
      home: {
        bpm: 100,
        prog: [
          { b: 48, ch: [60, 64, 67] },   // C
          { b: 55, ch: [59, 62, 67] },   // G
          { b: 57, ch: [57, 60, 64] },   // Am
          { b: 53, ch: [57, 60, 65] },   // F
          { b: 48, ch: [60, 64, 67] },   // C
          { b: 55, ch: [59, 62, 67] },   // G
          { b: 53, ch: [57, 60, 65] },   // F
          { b: 55, ch: [59, 62, 67] }    // G
        ],
        /* 八分音符琶音：索引进 [ch0, ch1, ch2, ch0+12] */
        arp: [0, 1, 2, 3, 2, 1, 0, 1],
        /* 主旋律 [小节, 拍, MIDI, 时值(拍)] */
        melody: [
          [0, 0, 76, 1], [0, 1, 79, 1], [0, 2, 81, 1.5],
          [1, 0, 74, 1], [1, 1, 76, 0.5], [1, 1.5, 74, 0.5], [1, 2, 71, 1.5],
          [2, 0, 72, 1], [2, 1, 76, 1], [2, 2, 81, 1], [2, 3, 79, 1],
          [3, 0, 81, 1], [3, 1, 79, 1], [3, 2, 77, 0.5], [3, 2.5, 76, 1.5],
          [4, 0, 79, 0.5], [4, 0.5, 81, 0.5], [4, 1, 84, 1], [4, 2, 81, 1], [4, 3, 79, 1],
          [5, 0, 76, 1], [5, 1, 74, 0.5], [5, 1.5, 76, 0.5], [5, 2, 79, 1], [5, 3, 74, 1],
          [6, 0, 81, 1], [6, 1, 79, 1], [6, 2, 76, 0.5], [6, 2.5, 74, 1.5],
          [7, 0, 74, 1.5], [7, 1.5, 76, 0.5], [7, 2, 74, 2]
        ],
        /* 电平口径：源 RMS 约 -22 dBFS、峰值 < 0.7，乘 bgmVolume(0.55) 后
         * 与关卡 mp3 的响度接近——不然从主页进关卡会突然变响/变轻。 */
        gain: { bass: 0.34, chord: 0.10, arp: 0.19, lead: 0.28 },
        echo: { delay: 0.32, feedback: 0.24, wet: 0.22 }
      },
      /* 真人 mp3 是满刻度素材，0.55 在手机外放上约 -5dB，既能听清又不盖音效。
       * 弹窗/结算压低到 0.20（v0.10 合成曲的 0.55 是相对合成总线，不能直接搬）。 */
      bgmVolume: 0.55,
      bgmDuckVolume: 0.20,
      /* 响度对齐（v0.13）：实测四首关卡曲的 RMS 差到 10dB——
       *   lv1 -23.7 / lv2 -24.4 / lv3 -16.3 / lv4 -14.4 dBFS，主页源 -24.6。
       * 不处理的话，同一音量下第 3、4 首会突然变响，主页又显得很轻。
       * 这里把每首乘一个系数拉到约 -20 dBFS（trim = 10^((-20 - RMS)/20)）。
       * 系数直接乘在音量上，峰值仍有余量（最热的 lv4：-0.2dBFS × 0.52 × 0.55 ≈ -11dBFS）。 */
      trim: { home: 1.00, bgm_dawn: 1.00, bgm_starlit: 0.92, bgm_flow: 0.88, bgm_lv1: 0.88, bgm_lv2: 0.88, bgm_lv3: 0.88, bgm_lv4: 0.88 },
      sfxVolume: 1.0,
      /* v0.20：音效整体重做成"低频为主"的木质感（见 game.js 的 synth 注释），
       * 三个短音的响度重新配平：吸附最响（反馈最重要）、点击最轻。 */
      sfxGain: { sfx_snap: 1.00, sfx_win: 0.95, sfx_pick: 0.85, sfx_tap: 0.70, sfx_fail: 0.55, sfx_win_fanfare: 0.85 },
      fadeMs: 220,
      tapGuardMs: 40,
      snapVoices: 2
    }
  };
});
