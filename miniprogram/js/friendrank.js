/* 方寸巧拼 · 好友榜适配层（小程序端专用）
 *
 * 微信的好友关系链只能通过「开放数据域」读取：主域拿不到好友列表，
 * 云开发也拿不到（players 集合里只有全服玩家，没有好友关系）。
 * 这里做两件事，都只在 main context 里：
 *
 *   1. publish(stats)  把自己的成绩写进「微信托管数据」（wx.setUserCloudStorage）。
 *      —— 注意这是微信关系链云存储，不是云开发的数据库，两套东西不互通。
 *      开放数据域里的 wx.getFriendCloudStorage 读的就是这份。
 *   2. show({w,h,k,me}) 向开放数据域发消息，让它把好友榜画到 sharedCanvas 上；
 *      主域每帧把 sharedCanvas 贴进排行榜卡片（见 core.js renderFriendRank）。
 *
 * 失败一律静默降级：拿不到开放数据域时 available() 返回 false，
 * 核心层显示「好友榜要在微信小游戏里看」，不影响主线/连胜榜。
 */
'use strict';

function createFriend() {
  var odc = null, shared = null, ready = false, booted = false;
  var KV = 'tangram';                 // 与 openDataContext/index.js 里的 keyList 一致
  var lastVal = '', timer = null;

  function ensure() {
    if (booted) return ready;
    booted = true;
    try {
      if (typeof wx === 'undefined' || !wx.getOpenDataContext) { ready = false; return false; }
      odc = wx.getOpenDataContext();
      shared = (odc && odc.canvas) || null;
      ready = !!(odc && shared);
    } catch (e) { ready = false; }
    return ready;
  }

  function flush() {
    timer = null;
    if (!lastVal || typeof wx === 'undefined' || !wx.setUserCloudStorage) return;
    try {
      wx.setUserCloudStorage({
        KVDataList: [{ key: KV, value: lastVal }],
        fail: function () { /* 无网络 / 未开通：下次通关再写 */ }
      });
    } catch (e) { /* 静默 */ }
  }

  return {
    /* 这台设备有没有开放数据域（浏览器预览 / 极老基础库返回 false） */
    available: ensure,

    /* 主域用来 drawImage 的离屏画布 */
    image: function () { return ensure() ? shared : null; },

    /* 通知开放数据域：按这个尺寸重画，并带上「我」的资料（好友数据里没有自己） */
    show: function (opt) {
      if (!ensure()) return false;
      opt = opt || {};
      try {
        odc.postMessage({
          type: 'show',
          w: Math.round(opt.w || 566),
          h: Math.round(opt.h || 588),
          k: Math.max(1, Math.min(3, opt.k || 2)),
          me: opt.me || null
        });
        return true;
      } catch (e) { return false; }
    },

    /* 写微信托管数据。合并 1.2s 内的多次调用（通关 + 云端合并常常挨在一起），
     * 只发最后一次的值，避免无意义的重复写入。 */
    publish: function (stats) {
      if (typeof wx === 'undefined' || !wx.setUserCloudStorage) return false;
      var val = JSON.stringify({
        v: 1,
        cleared: Math.max(0, (stats && stats.cleared) | 0),
        streak: Math.max(0, (stats && stats.streak) | 0),
        ts: Date.now()
      });
      if (val === lastVal) return true;
      lastVal = val;
      if (!timer) { try { timer = setTimeout(flush, 1200); } catch (e) { flush(); } }
      return true;
    },

    /* 设置页/联调用 */
    status: function () {
      return { available: ensure(), key: KV, last: lastVal };
    }
  };
}

module.exports = { createFriend: createFriend };
