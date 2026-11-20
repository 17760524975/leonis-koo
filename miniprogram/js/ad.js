/* 方寸巧拼 · 广告适配层（小程序端）
 *
 * 三种广告位，全部「有 ID 才加载，加载不到就静默跳过」，绝不阻塞玩法：
 *   banner    对局页顶部预留区（LAY.AD）。原生组件盖在画布上，位置由 core 传 CSS 坐标。
 *   rewarded  激励视频：复活 / 领体力 / 邀请。看完才发奖（isEnded）。
 *   interstitial 插屏：每 N 关弹一次（可选，没配就不弹）。
 *
 * 注意：广告位 unitId 未填或流量主未开通时，这里全部返回失败/空操作，
 * 游戏会退回 v0.8 的「模拟广告」流程，不影响验收与试玩。
 */
'use strict';

var CONFIG = require('./config.js');

function createAd() {
  var A = CONFIG.ADS || {};
  var banner = null, bannerSig = '', bannerOn = false;
  var reward = null, rewardCb = null, rewardLoading = false;
  var inter = null, interTried = false;

  function bannerOk() { return !!(A.banner && A.banner.unitId) && !!wx.createBannerAd; }

  function destroyBanner() {
    if (!banner) return;
    try { banner.hide(); } catch (e) {}
    try { banner.destroy(); } catch (e) {}
    banner = null;
    bannerSig = '';
  }

  /* rect：{x,y,w,h} CSS px。同尺寸不重建，只 show/hide。 */
  function showBanner(show, rect) {
    bannerOn = !!show;
    if (!show) {
      if (banner) { try { banner.hide(); } catch (e) {} }
      return;
    }
    if (!bannerOk() || !rect) return;
    var sig = [Math.round(rect.x), Math.round(rect.y), Math.round(rect.w), Math.round(rect.h)].join(',');
    if (banner && sig === bannerSig) {
      try { banner.show(); } catch (e) {}
      return;
    }
    destroyBanner();
    bannerSig = sig;
    try {
      banner = wx.createBannerAd({
        adUnitId: A.banner.unitId,
        adIntervals: Math.max(30, A.banner.refreshSec || 30),
        style: {
          left: Math.round(rect.x),
          top: Math.round(rect.y),
          width: Math.round(rect.w)
        }
      });
    } catch (e) { banner = null; bannerSig = ''; return; }

    banner.onResize(function (res) {
      /* banner 高度由微信按比例算，用户给的预留框只是"最大占位"：
       * 真实广告在框内水平、垂直居中，避免上下留一条突兀的白边。 */
      if (!banner) return;
      try {
        banner.style.left = Math.round(rect.x + (rect.w - res.width) / 2);
        banner.style.top = Math.round(rect.y + (rect.h - res.height) / 2);
        banner.style.width = Math.round(res.width);
      } catch (e) {}
    });
    banner.onError(function () { /* 拉不到广告就不显示，版式留白 */ });
    try { banner.show(); } catch (e) {}
  }

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
    placeholder: false,       // 真机不画占位框（原生 banner 直接盖上来）
    banner: showBanner,
    interstitial: showInterstitial,
    refresh: function () { if (bannerOn && banner) { try { banner.show(); } catch (e) {} } }
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
