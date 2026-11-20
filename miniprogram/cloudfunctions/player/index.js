/* 方寸巧拼 · 云函数 player
 *
 * 一个函数管四件事（客户端按 action 调用）：
 *   login  建档 + 发昵称，返回 openid（客户端不落地 openid，只用于显示）
 *   load   拉我自己的存档（saves 集合，_id = openid）
 *   sync   上行存档 + 刷新名次数据（players 集合）
 *   rank   全服榜（tab 0 通关数 / 1 连胜；tab 2 好友榜需开放数据域，本期返回 note）
 *
 * 集合约定（云开发控制台手动建，见 docs 指南）：
 *   players  { _id, openid, nick, stars, cleared, streak, updatedAt }
 *   saves    { _id: openid, sets: { saveKey: save }, updatedAt, nick }
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

function nickOf(openid) {
  /* 稳定昵称：openid 做个简单的字符串哈希 → 巧手 + 4 位。
   * 不调 wx.getUserInfo：那要授权弹窗与《用户信息保护指引》，
   * 休闲游戏用不上真实头像昵称，稳定唯一的化名反而更省事。 */
  let h = 5381;
  for (let i = 0; i < openid.length; i++) h = ((h * 33) ^ openid.charCodeAt(i)) >>> 0;
  return '巧手' + String(h % 10000).padStart(4, '0');
}

async function getPlayer(openid) {
  const r = await db.collection(PLAYERS).where({ openid }).limit(1).get();
  return r.data.length ? r.data[0] : null;
}

async function ensurePlayer(openid) {
  const p = await getPlayer(openid);
  if (p) return p;
  const doc = { openid, nick: nickOf(openid), stars: 0, cleared: 0, streak: 0, updatedAt: Date.now() };
  const add = await db.collection(PLAYERS).add({ data: doc });
  doc._id = add._id;
  return doc;
}

async function rankOf(openid, tab, player) {
  /* 主线榜按「通关关数」排（前端显示 N 关），连胜榜按连胜场次 */
  const field = tab === 1 ? 'streak' : 'cleared';
  let list = [];
  try {
    const r = await db.collection(PLAYERS)
      .where({ [field]: _.gt(0) })
      .orderBy(field, 'desc')
      .limit(20)
      .get();
    list = r.data.map(p => ({ nick: p.nick || nickOf(p.openid), v: p[field] || 0, me: p.openid === openid }));
  } catch (e) {
    list = [];
  }
  const greater = await db.collection(PLAYERS).where({ [field]: _.gt(player[field] || 0) }).count();
  return { list, me: { nick: player.nick, v: player[field] || 0, rank: greater.total + 1 } };
}

exports.main = async (event, context) => {
  const { OPENID, APPID } = cloud.getWXContext();
  if (!OPENID) return { ok: false, msg: '拿不到 openid（请在微信客户端内打开）' };
  const action = event.action || 'login';

  try {
    if (action === 'login') {
      const p = await ensurePlayer(OPENID);
      return { ok: true, openid: OPENID, nick: p.nick, appid: APPID };
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
      const stars = Math.max(0, Math.min(9999, stats.stars | 0));
      const cleared = Math.max(0, Math.min(999, stats.cleared | 0));
      const streak = Math.max(0, Math.min(9999, stats.streak | 0));

      await db.collection(PLAYERS).doc(p._id).update({
        data: { stars, cleared, streak, updatedAt: now }
      });
      try {
        await db.collection(SAVES).doc(OPENID).set({
          data: { openid: OPENID, nick: p.nick, sets, updatedAt: now }
        });
      } catch (e) {
        /* saves 文档可能不存在导致 set 失败：补一次 add */
        try {
          await db.collection(SAVES).add({ data: { _id: OPENID, openid: OPENID, nick: p.nick, sets, updatedAt: now } });
        } catch (e2) { /* 忽略：下次再来 */ }
      }
      const rk = await rankOf(OPENID, 0, Object.assign({}, p, { stars, cleared }));
      return { ok: true, nick: p.nick, me: { nick: p.nick, v: stars, rank: rk.me.rank } };
    }

    if (action === 'rank') {
      const tab = event.tab === 1 ? 1 : 0;
      if (tab === 2 || event.tab === 2) {
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
