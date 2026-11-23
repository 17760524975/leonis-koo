/* 方寸巧拼 · 云函数 player
 *
 * 一个函数管四件事（客户端按 action 调用）：
 *   login  建档 + 发昵称，返回 openid（客户端不落地 openid，只用于显示）
 *   load   拉我自己的存档（saves 集合，_id = openid）
 *   sync   上行存档 + 刷新名次数据（players 集合）
 *   rank   全服榜（tab 0 通关数 / 1 历史最高连胜；tab 2 好友榜走开放数据域，这里只回 note）
 *
 * 集合约定（云开发控制台手动建，见 docs 指南）：
 *   players  { _id, openid, nick, avatar, src, auth, stars, cleared, streak, updatedAt }
 *            v0.18 起 streak = 历史最高连胜（客户端取两个数据集里最高的那份）
 *            streakV = 口径版本号（2 = 最高连胜；0/缺省 = 老数据，首次上行覆盖一次）
 *   saves    { _id: openid, sets: { saveKey: save }, updatedAt, nick }
 *
 * v0.14 玩家资料（昵称/头像）：
 *   · nick   展示名：授权后是微信昵称，玩家改过就是自定义名，否则是「巧手1234」化名
 *   · avatar 头像 URL（thirdwx.qlogo.cn），没授权就是空串，前端画「首字头像」
 *   · src    auto / wx / custom，标明这份名字从哪来（前端据此决定要不要覆盖本地）
 *   · auth   是否已授权微信资料（改过名仍为 true，头像还是微信那张）
 *   这些字段全部由本函数清洗后写入，客户端传超长昵称 / 非法头像 URL 一律丢弃。
 *
 * 安全：
 *   - 客户端不直连数据库，全部走本函数（管理员权限），改包改不出假成绩；
 *   - openid 由 getWXContext() 取，客户端传什么都不认；
 *   - sets 体积上限 200KB，超了拒收，防止有人拿存档当网盘。
 */
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;
const PLAYERS = 'players';
const SAVES = 'saves';
const MAX_SETS_BYTES = 200 * 1024;
const MAX_NICK = 12;                 // 与 config.js PLAYER.nickMax 一致

function nickOf(openid) {
  /* 稳定化名：openid 做个简单的字符串哈希 → 巧手 + 4 位。
   * 这是「没授权微信资料」时的默认身份：稳定、唯一、零权限、不打扰玩家。 */
  let h = 5381;
  for (let i = 0; i < openid.length; i++) h = ((h * 33) ^ openid.charCodeAt(i)) >>> 0;
  return '巧手' + String(h % 10000).padStart(4, '0');
}

/* ---- 玩家资料的清洗（客户端给的字符串一律不可信） ---- */
function cleanNick(s) {
  return String(s == null ? '' : s).replace(/[\r\n\t]+/g, ' ').trim().slice(0, MAX_NICK);
}
function cleanAvatar(s) {
  const v = String(s == null ? '' : s).slice(0, 300);
  /* 只收 https：微信头像（thirdwx.qlogo.cn）与云存储 CDN 都是 https */
  return /^https:\/\/[^\s]+$/i.test(v) ? v : '';
}
function cleanSrc(s) {
  return ['wx', 'custom', 'auto'].indexOf(s) >= 0 ? s : 'auto';
}

async function getPlayer(openid) {
  const r = await db.collection(PLAYERS).where({ openid }).limit(1).get();
  return r.data.length ? r.data[0] : null;
}

async function ensurePlayer(openid) {
  const p = await getPlayer(openid);
  if (p) return p;
  const doc = {
    openid, nick: nickOf(openid), avatar: '', src: 'auto', auth: false,
    stars: 0, cleared: 0, streak: 0, updatedAt: Date.now()
  };
  const add = await db.collection(PLAYERS).add({ data: doc });
  doc._id = add._id;
  return doc;
}

async function rankOf(openid, tab, player) {
  /* 主线榜按「通关关数」排（前端显示 N 关），连胜榜按历史最高连胜 */
  const field = tab === 1 ? 'streak' : 'cleared';
  let list = [];
  try {
    const r = await db.collection(PLAYERS)
      .where({ [field]: _.gt(0) })
      .orderBy(field, 'desc')
      .limit(20)
      .get();
    list = r.data.map(p => ({
      nick: p.nick || nickOf(p.openid),
      avatar: p.avatar || '',
      v: p[field] || 0,
      me: p.openid === openid
    }));
  } catch (e) {
    list = [];
  }
  const greater = await db.collection(PLAYERS).where({ [field]: _.gt(player[field] || 0) }).count();
  return {
    list,
    me: {
      nick: player.nick, avatar: player.avatar || '',
      v: player[field] || 0, rank: greater.total + 1
    }
  };
}

exports.main = async (event, context) => {
  const { OPENID, APPID } = cloud.getWXContext();
  if (!OPENID) return { ok: false, msg: '拿不到 openid（请在微信客户端内打开）' };
  const action = event.action || 'login';

  try {
    if (action === 'login') {
      const p = await ensurePlayer(OPENID);
      return {
        ok: true, openid: OPENID, appid: APPID,
        nick: p.nick, avatar: p.avatar || '', src: p.src || 'auto', auth: !!p.auth
      };
    }

    if (action === 'profile') {
      /* 授权成功 / 改完昵称：只更新 players 里的资料，不碰存档（轻量、幂等）。
       * 前端平时走 sync 一起带，这个分支留给「只想改名」的场景与联调。 */
      const p = await ensurePlayer(OPENID);
      const data = {};
      const nk = cleanNick(event.nick);
      if (nk) data.nick = nk;
      if (event.avatar !== undefined) data.avatar = cleanAvatar(event.avatar);
      if (event.src) data.src = cleanSrc(event.src);
      if (event.auth !== undefined) data.auth = !!event.auth;
      data.updatedAt = Date.now();
      await db.collection(PLAYERS).doc(p._id).update({ data });
      const now = await getPlayer(OPENID);
      return {
        ok: true, nick: now.nick, avatar: now.avatar || '',
        src: now.src || 'auto', auth: !!now.auth
      };
    }

    if (action === 'load') {
      try {
        const r = await db.collection(SAVES).doc(OPENID).get();
        return { ok: true, sets: (r.data && r.data.sets) || {}, updatedAt: (r.data && r.data.updatedAt) || 0 };
      } catch (e) {
        return { ok: true, sets: {}, updatedAt: 0 };   // 首次进入没有档，正常
      }
    }

    if (action === 'sync') {
      const sets = event.sets || {};
      const stats = event.stats || {};
      if (JSON.stringify(sets).length > MAX_SETS_BYTES) return { ok: false, msg: '存档过大' };

      const p = await ensurePlayer(OPENID);
      const now = Date.now();
      /* v0.18：三项都是「只增不减」的进度量，取 max 而不是直接覆盖。
       * 换设备登录、旧版本客户端晚到的上行，都不会把成绩改小。
       * streak 从 v0.18 起语义 = 历史最高连胜（榜单口径），失败不影响它。 */
      const stars = Math.max(p.stars | 0, Math.max(0, Math.min(9999, stats.stars | 0)));
      const cleared = Math.max(p.cleared | 0, Math.max(0, Math.min(999, stats.cleared | 0)));
      /* 口径迁移：老数据的 streak 是「当前连胜」，还被重玩刷过，数值不可信。
       * streakV 为 0 的行第一次上行时直接按新口径覆盖一次，之后才走 max —— 
       * 否则那次虚高的数字会被 max 永久钉在榜上。 */
      const sent = Math.max(0, Math.min(9999, stats.streak | 0));
      const streak = (p.streakV | 0) >= 2 ? Math.max(p.streak | 0, sent) : sent;

      /* v0.14：昵称头像跟着存档一起上行（一次往返，不额外加请求） */
      const prof = event.profile || {};
      let nick = p.nick || nickOf(OPENID);
      let avatar = p.avatar || '';
      let src = p.src || 'auto';
      let auth = !!p.auth;
      const pn = cleanNick(prof.nick);
      if (pn) nick = pn;
      if (prof.avatar !== undefined) avatar = cleanAvatar(prof.avatar);
      if (prof.src) src = cleanSrc(prof.src);
      if (prof.auth !== undefined) auth = !!prof.auth;

      await db.collection(PLAYERS).doc(p._id).update({
        data: { stars, cleared, streak, streakV: 2, nick, avatar, src, auth, updatedAt: now }
      });
      try {
        await db.collection(SAVES).doc(OPENID).set({
          data: { openid: OPENID, nick, sets, updatedAt: now }
        });
      } catch (e) {
        /* saves 文档可能不存在导致 set 失败：补一次 add */
        try {
          await db.collection(SAVES).add({ data: { _id: OPENID, openid: OPENID, nick, sets, updatedAt: now } });
        } catch (e2) { /* 忽略：下次再来 */ }
      }
      const rk = await rankOf(OPENID, 0, Object.assign({}, p, { stars, cleared }));
      return {
        ok: true, nick, avatar, src, auth,
        me: { nick, avatar, v: stars, rank: rk.me.rank }
      };
    }

    if (action === 'rank') {
      const tab = event.tab | 0;
      if (tab === 2) {
        /* 好友榜要开放数据域（开放数据域里 wx.getFriendCloudStorage），
         * 云开发拿不到好友关系，返回 note 让前端显示正确文案。 */
        return { ok: true, list: [], me: null, note: 'friend' };
      }
      const p = await ensurePlayer(OPENID);
      const rk = await rankOf(OPENID, tab, p);
      return { ok: true, list: rk.list, me: rk.me };
    }

    return { ok: false, msg: '未知 action: ' + action };
  } catch (e) {
    return { ok: false, msg: String((e && e.message) || e).slice(0, 120) };
  }
};
