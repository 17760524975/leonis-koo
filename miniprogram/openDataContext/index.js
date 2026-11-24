/* 方寸巧拼 · 好友榜（微信开放数据域）
 *
 * 这个文件跑在「开放数据域」里：一个独立的 JS 环境，只能访问关系链相关 API，
 * 拿不到主域的任何变量（也不能 require 主域的 config/core）。
 * 它把好友榜画到 sharedCanvas 上，主域再把这块画布贴进排行榜卡片。
 *
 * 数据流：
 *   主域 wx.setUserCloudStorage({key:'tangram'})  → 微信关系链云存储
 *   本文件 wx.getFriendCloudStorage({keyList:['tangram']}) → 好友们写的那份
 *   主域 postMessage({type:'show', w, h, k, me}) → 本文件按尺寸重画
 *
 * 注意：主域 → 开放数据域是单向的（只有 postMessage / onMessage），
 * 所以「我」的那一行由主域在消息里带过来，好友列表里本来也不含自己。
 */
'use strict';

var KEY = 'tangram';
var sc = wx.getSharedCanvas();
var ctx = sc.getContext('2d');

/* 与 config.RANK.list 保持一致（开放数据域读不到主域配置，只能抄同一组数；
 * 改版式时两边一起改，verify_v18 会断言这两组数相等） */
var L = { w: 566, h: 588, rowH: 74, step: 84, rows: 7 };

/* 与 config.COLORS 对齐的一小份配色（主域每次 show 都会带 pal 过来覆盖，
 * v0.47：这组只剩「兜底」用途 —— 深色皮肤下主域会传深色的一套，
 * 否则好友榜会在深色卡片里贴一张浅色列表） */
var K = {
  text: '#2C3A4B', sub: '#7A8A9C', rowBg: 'rgba(246,243,238,0.95)',
  me: '#FDE7DF', meText: '#E2624A', gold: '#FFB93D', line: '#E3E9F2'
};
var K_DEFAULT = {};
(function () { for (var k in K) K_DEFAULT[k] = K[k]; })();
/* 只认这几个 key，其它字段一律忽略（防止主域改名后把配色带崩） */
function applyPal(pal) {
  for (var k in K_DEFAULT) K[k] = K_DEFAULT[k];
  if (!pal) return;
  for (var j in K_DEFAULT) {
    if (typeof pal[j] === 'string' && pal[j]) K[j] = pal[j];
  }
}
var MEDAL = ['#F5B73D', '#C9D3DD', '#E0A276'];
var FALLBACK = ['#FF8A5B', '#4FA8E0', '#63C88B', '#A87BE8', '#D96A9B', '#FFC53D', '#3FB8B0'];

var cfg = { w: L.w, h: L.h, k: 2, me: null };
var rows = [];            // [{nick, avatar, cleared, streak, me}]
var state = 'init';       // init | loading | ready | error
var errMsg = '';
var imgs = {};            // url -> Image（加载完重画）

/* ---------------- 画布尺寸 / 缩放 ---------------- */
function sizeCanvas() {
  var w = Math.round(cfg.w * cfg.k), h = Math.round(cfg.h * cfg.k);
  if (sc.width !== w || sc.height !== h) { sc.width = w; sc.height = h; }
  ctx.setTransform(cfg.k, 0, 0, cfg.k, 0, 0);
}

/* ---------------- 小工具 ---------------- */
function rr(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function text(s, x, y, size, color, align, weight) {
  ctx.save();
  ctx.font = (weight || '400') + ' ' + size + 'px -apple-system,"PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillStyle = color;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
  ctx.restore();
}
function fit(s, max, size, weight) {
  s = String(s == null ? '' : s);
  ctx.save();
  ctx.font = (weight || '400') + ' ' + size + 'px -apple-system,"PingFang SC","Microsoft YaHei",sans-serif';
  if (ctx.measureText(s).width <= max) { ctx.restore(); return s; }
  while (s.length > 1 && ctx.measureText(s + '…').width > max) s = s.slice(0, -1);
  ctx.restore();
  return s + '…';
}

/* 头像：加载完再重画一次；失败就画首字 */
function drawAvatar(url, cx, cy, r, nick, color) {
  var img = url ? imgs[url] : null;
  if (img && img.__ok) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    try { ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2); } catch (e) {}
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = color || K.gold;
  ctx.fill();
  ctx.restore();
  text(String(nick || '玩').slice(0, 1), cx, cy + 1, Math.round(r * 0.95), '#FFFFFF', 'center', '700');
  if (url && !imgs[url] && wx.createImage) {
    var im = wx.createImage();
    imgs[url] = im;
    im.__ok = false;
    im.onload = function () { im.__ok = true; draw(); };
    im.onerror = function () { im.__bad = true; };
    try { im.src = url; } catch (e) {}
  }
}

/* ---------------- 数据 ---------------- */
function pick(f) {
  var arr = f.KVDataList || [], i;
  for (i = 0; i < arr.length; i++) {
    if (arr[i] && arr[i].key === KEY) {
      try {
        var o = JSON.parse(arr[i].value);
        return { cleared: Math.max(0, o.cleared | 0), streak: Math.max(0, o.streak | 0) };
      } catch (e) { /* 脏数据当 0 */ }
    }
  }
  return { cleared: 0, streak: 0 };
}

function build(friends) {
  var out = [];
  for (var i = 0; i < friends.length; i++) {
    var f = friends[i] || {};
    var v = pick(f);
    out.push({
      nick: f.nickname || '好友', avatar: f.avatarUrl || '',
      cleared: v.cleared, streak: v.streak, me: false
    });
  }
  /* 自己：主域带过来（好友列表里没有自己），排在同分的前面一点点，
   * 让玩家一眼能找到自己 —— 不是作弊，同分本来就是并列。 */
  if (cfg.me && cfg.me.nick) {
    out.push({
      nick: cfg.me.nick, avatar: cfg.me.avatar || '',
      cleared: Math.max(0, cfg.me.cleared | 0), streak: Math.max(0, cfg.me.streak | 0),
      me: true
    });
  }
  out.sort(function (a, b) {
    if (b.cleared !== a.cleared) return b.cleared - a.cleared;
    if (b.streak !== a.streak) return b.streak - a.streak;
    if (a.me !== b.me) return a.me ? -1 : 1;
    return 0;
  });
  return out;
}

function load() {
  state = 'loading';
  draw();
  if (!wx.getFriendCloudStorage) { state = 'error'; errMsg = '当前基础库不支持好友榜'; draw(); return; }
  try {
    wx.getFriendCloudStorage({
      keyList: [KEY],
      success: function (res) {
        rows = build((res && res.data) || []);
        state = 'ready';
        draw();
      },
      fail: function (e) {
        state = 'error';
        errMsg = (e && (e.errMsg || e.message)) || '读取失败';
        draw();
      }
    });
  } catch (e) {
    state = 'error';
    errMsg = String((e && e.message) || e);
    draw();
  }
}

/* ---------------- 绘制 ---------------- */
function draw() {
  sizeCanvas();
  ctx.clearRect(0, 0, cfg.w, cfg.h);

  if (state === 'loading' || state === 'init') {
    text('正在读取好友…', cfg.w / 2, cfg.h / 2 - 10, 24, K.sub, 'center', '500');
    return;
  }
  if (state === 'error') {
    text('暂时读不到好友数据', cfg.w / 2, cfg.h / 2 - 26, 26, K.text, 'center', '600');
    text('确认网络正常后再进来看', cfg.w / 2, cfg.h / 2 + 18, 19, K.sub, 'center');
    return;
  }
  if (!rows.length || (rows.length === 1 && rows[0].me && !rows[0].cleared)) {
    text('还没有好友上榜', cfg.w / 2, cfg.h / 2 - 26, 26, K.text, 'center', '600');
    text('邀请微信好友一起拼，通关就会出现在这里', cfg.w / 2, cfg.h / 2 + 18, 19, K.sub, 'center');
    return;
  }

  /* 最多 N 行：自己不在前 N 就把最后一行让给自己（与主线榜的「我的排名」同规矩） */
  var list = rows.slice(0, L.rows), selfIn = false, i;
  for (i = 0; i < list.length; i++) if (list[i].me) selfIn = true;
  if (!selfIn) {
    for (i = 0; i < rows.length; i++) {
      if (rows[i].me) {
        list = rows.slice(0, L.rows - 1);
        list.push(rows[i]);
        break;
      }
    }
  }

  for (i = 0; i < list.length; i++) {
    var it = list[i], y = L.rowH / 2 + i * L.step;
    var hl = !!it.me;
    ctx.save();
    rr(0, y - L.rowH / 2, cfg.w, L.rowH, 16);
    ctx.fillStyle = hl ? K.me : K.rowBg;
    ctx.fill();
    if (hl) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(226,98,74,0.35)';
      ctx.stroke();
    }
    ctx.restore();

    /* 名次：前三名奖牌，其余数字。自己那行永远显示真实名次（与主域一致） */
    var rk = i + 1;
    if (i < 3 && !hl) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(42, y, 23, 0, Math.PI * 2);
      ctx.fillStyle = MEDAL[i];
      ctx.fill();
      ctx.restore();
      text(String(rk), 42, y + 1, 24, '#3A2A12', 'center', '700');
    } else {
      text(String(rk > 99 ? '99+' : rk), 42, y + 1, rk > 99 ? 20 : 24,
        hl ? K.meText : K.sub, 'center', '700');
    }

    drawAvatar(it.avatar, 96, y, 24, it.nick, FALLBACK[i % FALLBACK.length]);
    text(fit(it.nick, cfg.w - 136 - 96, 24, hl ? '700' : '500'), 136, y + 1, 24, K.text, 'left');
    text(it.cleared + ' 关', cfg.w - 28, y + 1, 26, hl ? K.meText : K.text, 'right', '700');
  }
}

/* ---------------- 消息 ---------------- */
wx.onMessage(function (msg) {
  if (!msg || msg.type !== 'show') return;
  cfg.w = Math.max(200, Math.round(msg.w || L.w));
  cfg.h = Math.max(200, Math.round(msg.h || L.h));
  cfg.k = Math.max(1, Math.min(3, msg.k || 2));
  applyPal(msg.pal);        // v0.47：主域把当前皮肤的配色一起送过来
  cfg.me = msg.me || null;
  load();                 // 每次切到好友榜都重新拉一次：好友进度可能刚变
});
