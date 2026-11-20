/* 方寸巧拼 · 玩家资料适配层（小程序/小游戏端专用）
 *
 * 只做「微信资料 ↔ 核心」这一件事，全部回调、绝不抛异常。核心（js/core.js）不写一个 wx.*。
 *
 * 为什么这么绕（2026 年的真实规则，别照十年前的文章写）：
 *   1. wx.getUserInfo 早在 2022-10-25 就被收回静默能力：没授权时调用只给「微信用户 + 灰色头像」，
 *      所以绝不能拿它当默认值，否则排行榜会出现一片「微信用户」。
 *   2. 小游戏没有 <button open-type="chooseAvatar"> 那种组件，官方唯一入口是
 *      wx.createUserInfoButton：一枚渲染在画布之上的原生按钮，玩家点了才会弹授权。
 *      画布上自己画的按钮收不到授权——这就是 core 要把按钮矩形算成 CSS px 传进来的原因。
 *   3. 授权过之后才可以随时 wx.getUserInfo 静默刷新（玩家换了微信头像能跟上），
 *      这条路径用于启动时的 boot()，不打扰玩家。
 *   4. 小游戏没有输入框组件，改昵称只能用 wx.showKeyboard + onKeyboardConfirm。
 *   5. 隐私协议：调用 createUserInfoButton 前要过 wx.requirePrivacyAuthorize；
 *      没在 MP 后台配置《用户隐私保护指引》勾选「昵称、头像」的话，这里会 fail，
 *      错误文案要能指导玩家，而不是甩一串英文。
 *
 * 失败一律降级：昵称退回云函数生成的「巧手1234」，头像退回「首字 + 底色」。
 */
'use strict';

var CONFIG = require('./config.js');

function createProfile() {
  var C = CONFIG.PLAYER || {};
  var NICK_MAX = C.nickMax || 12;

  var P = { nick: '', avatar: '', src: 'auto', auth: false };
  var supported = (typeof wx !== 'undefined') && typeof wx.getUserInfo === 'function';
  var canAuth = supported && typeof wx.createUserInfoButton === 'function';

  var btn = null, btnSig = '';
  var imgs = {}, imgKeys = [];
  var listeners = [];
  var pendingCb = null;
  var kbBound = false, kbCb = null;

  /* ---------------- 小工具 ---------------- */
  function snapshot() {
    return { nick: P.nick, avatar: P.avatar, src: P.src, auth: !!P.auth };
  }
  function emit() {
    var snap = snapshot(), i;
    for (i = 0; i < listeners.length; i++) {
      try { listeners[i](snap); } catch (e) { /* 单个监听器出错不影响其它 */ }
    }
  }
  /* 把微信 userInfo 洗成我们能存的一份；匿名数据直接判无效 */
  function normalize(ui, src) {
    var nick = (ui && ui.nickName) || '';
    var avatar = (ui && ui.avatarUrl) || '';
    if (!nick || nick === '微信用户') return null;      // 匿名：昵称被替换成「微信用户」
    nick = String(nick).replace(/[\r\n\t]/g, ' ').trim().slice(0, NICK_MAX);
    if (!nick) return null;
    return { nick: nick, avatar: avatar, src: src || 'wx', auth: true };
  }
  function finish(err, p) {
    var cb = pendingCb;
    pendingCb = null;
    if (p) {
      P.nick = p.nick; P.avatar = p.avatar || ''; P.src = p.src || 'wx'; P.auth = !!p.auth;
      emit();
    }
    if (cb) cb(err || null, err ? null : snapshot());
  }
  function fetchInfo(cb) {
    try {
      wx.getUserInfo({
        withCredentials: false,
        lang: 'zh_CN',
        success: function (res) { cb(null, (res && res.userInfo) || null); },
        fail: function () { cb({ msg: '读取微信资料失败' }); }
      });
    } catch (e) { cb({ msg: '读取微信资料失败' }); }
  }

  /* ---------------- 隐私协议 ----------------
   * 只是「把该弹的弹窗弹出来」，不强行拦截：老基础库没有这个 API 就直接往下走，
   * 真的被拦了会由 createUserInfoButton 的 fail 给出更准确的错误。 */
  function privacy(then) {
    var once = false;
    var go = function (ok) { if (once) return; once = true; then(ok); };
    if (typeof wx === 'undefined' || !wx.requirePrivacyAuthorize) { go(true); return; }
    try {
      wx.requirePrivacyAuthorize({
        success: function () { go(true); },
        fail: function () { go(false); },
        complete: function () { go(true); }
      });
    } catch (e) { go(true); }
    setTimeout(function () { go(true); }, 12000);   // 兜底：隐私弹窗被关掉也要能继续
  }

  /* ---------------- 原生授权按钮 ---------------- */
  function destroy() {
    if (!btn) return;
    try { if (btn.destroy) btn.destroy(); else if (btn.hide) btn.hide(); } catch (e) {}
    btn = null; btnSig = '';
  }

  function onTap(res) {
    /* 成功：{ userInfo:{nickName,avatarUrl}, rawData, encryptedData... }
     * 拒绝：{ errMsg: 'getUserInfo:fail auth deny' } 没有 userInfo */
    if (res && res.errMsg && res.errMsg.indexOf(':ok') < 0 && !res.userInfo) {
      finish({ msg: '你取消了授权，可以改个昵称' });
      return;
    }
    var p = normalize(res && res.userInfo, 'wx');
    if (!p) { finish({ msg: '微信只给了匿名资料，请自己起个昵称' }); return; }
    finish(null, p);
  }

  /* rect: { left, top, width, height, fontSize, label }，单位 CSS px */
  function place(rect) {
    if (!canAuth || !rect) return false;
    var sig = [Math.round(rect.left), Math.round(rect.top), Math.round(rect.width),
      Math.round(rect.height), Math.round(rect.fontSize || 16), rect.label || ''].join('|');
    if (btn && sig === btnSig) return true;
    destroy();
    try {
      btn = wx.createUserInfoButton({
        type: 'text',
        text: rect.label || C.authLabel || '使用微信昵称头像',
        withCredentials: false,
        lang: 'zh_CN',
        style: {
          left: Math.max(0, rect.left),
          top: Math.max(0, rect.top),
          width: Math.max(1, rect.width),
          height: Math.max(1, rect.height),
          lineHeight: Math.max(1, rect.height),
          backgroundColor: '#FFFFFF',        // 与画布上的 secondary 按钮同色，盖上去看不出接缝
          color: '#2C3A4B',
          borderColor: '#E3E9F2',
          borderWidth: 1,
          borderRadius: Math.max(1, rect.height / 2),
          textAlign: 'center',
          fontSize: Math.max(11, Math.round(rect.fontSize || 16))
        }
      });
      btnSig = sig;
      if (btn && btn.onTap) btn.onTap(onTap);
      if (btn && btn.show) btn.show();
      return !!btn;
    } catch (e) {
      btn = null; btnSig = '';
      return false;
    }
  }

  /* ---------------- 头像图缓存 ----------------
   * 微信头像 URL（thirdwx.qlogo.cn）直接喂 wx.createImage；
   * 未加载完先返回 null，core 会画「首字头像」，下一帧自然补上。 */
  function imageOf(url) {
    if (!url) return null;
    var rec = imgs[url];
    if (rec) return rec.ok ? rec.img : null;
    if (!supported || !wx.createImage) return null;
    rec = { img: null, ok: false };
    imgs[url] = rec;
    imgKeys.push(url);
    if (imgKeys.length > 60) {                    // 榜单最多 7 行，60 条足够且不会漏内存
      var k = imgKeys.shift();
      if (k && k !== url) delete imgs[k];
    }
    try {
      var img = wx.createImage();
      img.onload = function () { rec.ok = true; };
      img.onerror = function () { rec.ok = false; };
      img.src = url;
      rec.img = img;
    } catch (e) { rec.ok = false; }
    return null;
  }

  /* ---------------- 对外 ---------------- */
  return {
    enabled: function () { return supported; },
    canAuth: function () { return canAuth; },
    state: snapshot,
    onChange: function (fn) { if (typeof fn === 'function') listeners.push(fn); },

    /* 启动时先用本地缓存，界面不闪 */
    restore: function (local) {
      if (!local) return;
      P.nick = local.nick || '';
      P.avatar = local.avatar || '';
      P.src = local.src || 'auto';
      P.auth = !!local.auth;
    },

    /* 启动静默刷新：只有此前授权过的玩家才会真正走网络，其余人零打扰 */
    boot: function () {
      if (!supported) return;
      try {
        wx.getSetting({
          success: function (r) {
            if (!r || !r.authSetting || !r.authSetting['scope.userInfo']) return;
            fetchInfo(function (err, ui) {
              if (err) return;
              var p = normalize(ui, P.src === 'custom' ? 'custom' : 'wx');
              if (!p) return;
              if (P.src === 'custom') {           // 名字是玩家自己改的，只悄悄刷新头像
                if (p.avatar && p.avatar !== P.avatar) { P.avatar = p.avatar; P.auth = true; emit(); }
                return;
              }
              P.nick = p.nick; P.avatar = p.avatar; P.src = 'wx'; P.auth = true;
              emit();
            });
          },
          fail: function () {}
        });
      } catch (e) {}
    },

    /* 授权：已授权 → 静默拿；没授权 → 等玩家点原生按钮（place 里已挂 onTap） */
    request: function (cb) {
      pendingCb = cb || function () {};
      if (!canAuth) { finish({ msg: '当前环境不支持微信授权' }); return; }
      privacy(function () {
        try {
          wx.getSetting({
            success: function (r) {
              var granted = !!(r && r.authSetting && r.authSetting['scope.userInfo']);
              if (!granted) {
                /* 原生按钮就在画布按钮上面，玩家点它才会弹授权；这里如实告诉 core */
                finish({ msg: btn ? '请点上面的按钮完成授权' : '授权按钮不可用，请改昵称' });
                return;
              }
              fetchInfo(function (err, ui) {
                if (err) { finish(err); return; }
                var p = normalize(ui, 'wx');
                if (!p) { finish({ msg: '微信只给了匿名资料，请自己起个昵称' }); return; }
                finish(null, p);
              });
            },
            fail: function () { finish({ msg: '读取授权状态失败' }); }
          });
        } catch (e) { finish({ msg: '读取授权状态失败' }); }
      });
    },

    /* 改昵称：小游戏没有输入框组件，走系统键盘 */
    rename: function (cur, cb) {
      cb = cb || function () {};
      if (typeof wx === 'undefined' || !wx.showKeyboard) { cb({ msg: '当前环境不支持输入' }); return; }
      kbCb = cb;
      if (!kbBound) {
        kbBound = true;
        if (wx.onKeyboardConfirm) {
          wx.onKeyboardConfirm(function (res) {
            var v = (res && res.value) || '';
            var c = kbCb; kbCb = null;
            try { wx.hideKeyboard({}); } catch (e) {}
            if (c) c(null, v);
          });
        }
        if (wx.onKeyboardComplete) {
          wx.onKeyboardComplete(function (res) {
            var c = kbCb; kbCb = null;      // confirm 已处理过就为空，直接忽略
            if (c) c(null, (res && res.value) || '');
          });
        }
      }
      try {
        wx.showKeyboard({
          defaultValue: cur || '',
          maxLength: NICK_MAX,
          multiple: false,
          confirmHold: false,
          confirmType: 'done',
          fail: function () {
            var c = kbCb; kbCb = null;
            if (c) c({ msg: '无法唤起键盘' });
          }
        });
      } catch (e) {
        var c2 = kbCb; kbCb = null;
        if (c2) c2({ msg: '无法唤起键盘' });
      }
    },

    place: place,
    hide: destroy,
    imageOf: imageOf
  };
}

module.exports = { createProfile: createProfile };
