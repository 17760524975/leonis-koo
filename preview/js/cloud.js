/* 方寸巧拼 · 浏览器预览端的「云」占位实现
 *
 * 浏览器里没有 wx.cloud，这里一律返回「未配置云环境」，让核心层走降级分支：
 * 本地存档照常、榜单显示「未开启云同步」。这样预览页与真机的 UI 结构一致，
 * 又不会假装有数据（v0.9 起排行榜不再编示例名次）。
 */
(function (root) {
  'use strict';

  function createCloud() {
    var NO = { msg: '浏览器预览环境没有云开发' };
    var disabled = function (cb) { if (cb) cb(NO); };
    return {
      enabled: function () { return false; },
      init: disabled,
      load: disabled,
      save: disabled,
      rank: disabled,
      status: function () { return { nick: '', openid: '', err: NO.msg }; }
    };
  }

  root.TANGRAM_CLOUD = { createCloud: createCloud };
})(typeof window !== 'undefined' ? window : globalThis);
