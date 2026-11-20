/* 方寸巧拼 · 浏览器预览端广告占位
 * 只画预留框（placeholder），不提供 rewarded —— core 会退回模拟广告流程，
 * 这样预览页也能把「看广告复活 / 领体力」的交互走完。
 */
(function (root) {
  'use strict';
  root.TANGRAM_AD = {
    createAd: function () {
      return {
        placeholder: true,
        banner: function () {},
        interstitial: function () {},
        refresh: function () {}
      };
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
