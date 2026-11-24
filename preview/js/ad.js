/* 方寸巧拼 · 浏览器预览端广告桩
 * v0.33：banner 广告位（对局页顶部预留框）已随卡纸放大移除，
 * 这里不再提供 placeholder/banner；rewarded 仍不提供 —— core 会退回模拟广告流程，
 * 这样预览页也能把「看广告复活 / 领体力」的交互走完。
 */
(function (root) {
  'use strict';
  root.TANGRAM_AD = {
    createAd: function () {
      return {
        placeholder: false,
        interstitial: function () {}
      };
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
