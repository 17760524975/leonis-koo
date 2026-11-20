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
 *   1. 不用 wx.getUserInfo / createUserInfoButton —— 那要授权弹窗、要《用户信息保护指引》，
 *      对这个体量的休闲游戏不划算。昵称由云函数按 openid 生成「巧手1234」，
 *      稳定、唯一、零权限；后续想接真实头像昵称，只需要改云函数里的 nick 来源。
 *   2. 存档走云函数写库（saves 集合），客户端不直连数据库 —— 免得被改包伪造成绩。
 *   3. 云端失败一律降级：本地存档照玩，界面显示「未开启云同步」。
 */
'use strict';

var CONFIG = require('./config.js');

function createCloud() {
  var C = CONFIG.CLOUD || {};
  var FN = C.fn || 'player';
  var nick = '', openid = '', lastErr = '';

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
        cb(null, { openid: openid, nick: nick });
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
        cb(null, { nick: nick, me: res.me || null });
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
      return { nick: nick, openid: openid, err: lastErr };
    }
  };
}

module.exports = { createCloud: createCloud };
