/* 方寸巧拼 · 广告适配层（小程序端）
 *
 * 两种广告位，全部「有 ID 才加载，加载不到就静默跳过」，绝不阻塞玩法：
 *   rewarded  激励视频：复活 / 领体力 / 邀请。看完才发奖（isEnded）。
 *   interstitial 插屏：每 N 关弹一次（可选，没配就不弹）。
 *
 * v0.33：banner 广告位下线 —— 对局页顶部的预留区（LAY.AD）已让给卡纸，
 * wx.createBannerAd 相关代码全部移除。
 *
 * 注意：广告位 unitId 未填或流量主未开通时，这里全部返回失败/空操作，
 * 游戏会退回 v0.8 的「模拟广告」流程，不影响验收与试玩。
 */
'use strict';

var CONFIG = require('./config.js');

function createAd() {
  var A = CONFIG.ADS || {};
  var reward = null, rewardCb = null, rewardLoading = false;
  var inter = null, interTried = false;

  function rewardOk() { return !!(A.rewarded && A.rewarded.unitId) && !!wx.createRewardedVideoAd; }

  function ensureReward() {
    if (reward || !rewardOk()) return reward;
    try {
      reward = wx.createRewardedVideoAd({ adUnitId: A.rewarded.unitId });
      reward.onClose(function (res) {
        var cb = rewardCb; rewardCb = null;
        if (!cb) return;
        var done = !res || res.isEnded !== false;   // 旧版本没有 isEnded，按看完处理
        cb(done, done ? '' : '要看完广告才能领奖励哦');
      });
      reward.onError(function () {
        var cb = rewardCb; rewardCb = null;
        if (cb) cb(false, '广告拉取失败，稍后再试');
      });
    } catch (e) { reward = null; }
    return reward;
  }

  /* cb(ok, msg)：ok=true 才发奖 */
  function showReward(kind, cb) {
    if (!rewardOk()) { cb(false, '暂无广告'); return; }
    var ad = ensureReward();
    if (!ad) { cb(false, '暂无广告'); return; }
    if (rewardLoading) { cb(false, '广告加载中'); return; }
    rewardCb = cb;
    rewardLoading = true;
    ad.show().catch(function () {
      /* 首次没缓存：load 之后再 show */
      return ad.load().then(function () { return ad.show(); });
    }).then(function () {
      rewardLoading = false;
    }).catch(function () {
      rewardLoading = false;
      var f = rewardCb; rewardCb = null;
      if (f) f(false, '广告拉取失败，稍后再试');
    });
  }

  function showInterstitial() {
    if (!(A.interstitial && A.interstitial.unitId) || !wx.createInterstitialAd) return;
    if (!interTried) {
      interTried = true;
      try { inter = wx.createInterstitialAd({ adUnitId: A.interstitial.unitId }); } catch (e) { inter = null; }
      if (inter) inter.onError(function () {});
    }
    if (!inter) return;
    try { inter.show().catch(function () {}); } catch (e) {}
  }

  var api = {
    placeholder: false,       // v0.33：banner 已下线，此字段仅保留兼容（core 不再读取）
    interstitial: showInterstitial
  };
  /* rewarded 只在「配了 unitId 且微信支持」时才暴露：
   * 没配广告位时 core 检测到 env.ad.rewarded 不存在，会走 v0.8 的模拟播放流程，
   * 这样开发工具里没有流量主也能把复活/领体力的交互跑通。 */
  Object.defineProperty(api, 'rewarded', {
    enumerable: true,
    get: function () { return rewardOk() ? showReward : undefined; }
  });
  return api;
}

module.exports = { createAd: createAd };
