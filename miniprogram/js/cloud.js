/* 方寸巧拼 · 云开发适配层（小程序端专用，浏览器/Node 端没有这个文件）
 *
 * 只做四件事，全部用回调、绝不抛异常：
 *   enabled()            有没有可用的云能力（配置了 envId + wx.cloud 存在）
 *   init(cb)             wx.cloud.init → 云函数 login（取 openid、建档、发昵称）
 *   load(cb)             拉云端存档 { sets: { saveKey: save } }
 *   save(payload, cb)    上行存档 + 顺手拿回我的名次
 *   rank(tab, cb)        全服榜（主线 = 通关数 / 连胜 = 连胜场次）
 *
 * 设计取舍：
 *   1. 登录用云开发的 openid：云函数里 cloud.getWXContext().OPENID 就是微信登录结果，
 *      等价于「wx.login 拿 code → 服务端 code2Session」，且不用自己管 AppSecret，
 *      客户端也拿不到 openid 的明文控制权（改包也换不出别人的档）。
 *   2. 昵称头像不在这里拿：真实微信资料要用户点授权按钮，交给 wxprofile.js；
 *      这里只负责把 `players` 里存的那一份（云端化名或玩家授权后的资料）传上去。
 *   3. 存档走云函数写库（saves 集合），客户端不直连数据库 —— 免得被改包伪造成绩。
 *   4. 云端失败一律降级：本地存档照玩，界面显示「未开启云同步」。
 */
'use strict';

var CONFIG = require('./config.js');

function createCloud() {
  var C = CONFIG.CLOUD || {};
  var FN = C.fn || 'player';
  var nick = '', openid = '', avatar = '', pSrc = 'auto', pAuth = false, lastErr = '';

  function hasCloud() {
    return typeof wx !== 'undefined' && !!wx.cloud && !!wx.cloud.callFunction;
  }
  function enabled() {
    return !!(C.enabled && C.envId && hasCloud());
  }
  function errText(e) {
    var code = e && (e.errCode || e.errcode);
    var msg = (e && (e.errMsg || e.message)) || '网络异常';
    if (code === -501000 || /env.*not.*exist|invalid env/i.test(msg)) return '云环境 ID 不对';
    if (/cloudfunction|FunctionName/i.test(msg)) return '云函数未部署';
    if (/collection.*not.*exist|DATABASE_COLLECTION_NOT_EXIST|Db or Table not exist/i.test(msg)) return '数据库集合未创建';
    if (/permission|PERMISSION_DENIED|权限/i.test(msg)) return '集合权限不放行';
    if (/timeout/i.test(msg)) return '网络超时';
    return String(msg).slice(0, 40);
  }
  function call(action, payload, cb) {
    cb = cb || function () {};
    if (!hasCloud()) { cb({ msg: '当前环境不支持云开发' }); return; }
    var data = { action: action }, k;
    for (k in (payload || {})) data[k] = payload[k];
    try {
      wx.cloud.callFunction({
        name: FN,
        data: data,
        success: function (res) {
          var r = res && res.result;
          if (!r || r.ok === false) {
            var msg = (r && r.msg) || '云函数返回异常';
            lastErr = msg;
            cb({ msg: msg });
            return;
          }
          cb(null, r);
        },
        fail: function (e) {
          lastErr = errText(e);
          cb({ msg: lastErr, raw: e });
        }
      });
    } catch (e) {
      cb({ msg: String((e && e.message) || e) });
    }
  }

  return {
    enabled: enabled,

    /* 登录 / 建档：返回 { openid, nick } */
    init: function (cb) {
      cb = cb || function () {};
      if (!enabled()) { cb({ msg: '未配置云环境' }); return; }
      try {
        wx.cloud.init({ env: C.envId, traceUser: true });
      } catch (e) {
        cb({ msg: 'wx.cloud.init 失败' });
        return;
      }
      call('login', {}, function (err, res) {
        if (err) { cb(err); return; }
        openid = res.openid || '';
        nick = res.nick || '';
        avatar = res.avatar || '';
        pSrc = res.src || 'auto';
        pAuth = !!res.auth;
        cb(null, { openid: openid, nick: nick, avatar: avatar, src: pSrc, auth: pAuth });
      });
    },

    /* 拉云端存档 */
    load: function (cb) {
      cb = cb || function () {};
      call('load', {}, function (err, res) {
        if (err) { cb(err); return; }
        cb(null, { sets: res.sets || {}, updatedAt: res.updatedAt || 0 });
      });
    },

    /* 上行存档（云端存档 + 名次数据一起写） */
    save: function (payload, cb) {
      cb = cb || function () {};
      call('sync', payload, function (err, res) {
        if (err) { cb(err); return; }
        if (res.nick) nick = res.nick;
        if (res.avatar !== undefined) avatar = res.avatar || '';
        if (res.src) pSrc = res.src;
        if (res.auth !== undefined) pAuth = !!res.auth;
        cb(null, { nick: nick, avatar: avatar, src: pSrc, auth: pAuth, me: res.me || null });
      });
    },

    /* 榜单：tab 0=主线(通关数) 1=连胜 2=好友(需开放数据域，本期不返回数据) */
    rank: function (tab, cb) {
      cb = cb || function () {};
      if (tab === 2) {
        cb(null, { list: [], me: null, note: 'friend' });
        return;
      }
      call('rank', { tab: tab }, function (err, res) {
        if (err) { cb(err); return; }
        cb(null, { list: res.list || [], me: res.me || null, note: res.note || '' });
      });
    },

    /* 供设置页显示 */
    status: function () {
      return { nick: nick, openid: openid, avatar: avatar, src: pSrc, auth: pAuth, err: lastErr };
    }
  };
}

module.exports = { createCloud: createCloud };
