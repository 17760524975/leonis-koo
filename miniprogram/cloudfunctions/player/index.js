/* 方寸巧拼 · 云函数 player
 *
 * 一个函数管四件事（客户端按 action 调用）：
 *   login  建档 + 发昵称，返回 openid（客户端不落地 openid，只用于显示）
 *   load   拉我自己的存档（saves 集合，_id = openid）
 *   sync   上行存档 + 刷新榜单数据（players 集合）+ 结算本周星事件
 *   rank   榜单（v0.65：tab 0 全服 / 1 好友 / 2 本周；好友榜走开放数据域，这里只回 note）
 *
 * 集合约定（云开发控制台手动建，见 docs/v0.65-排行榜部署.md）：
 *   players  { _id, openid, nick, avatar, src, auth,
 *              stars, cleared, streak,            ← v0.18 起 streak = 历史最高连胜
 *              weekStars, weekCleared, weekKey,   ← v0.65 本周新增
 *              weekUids,                          ← v0.65 本周已计过的「关卡版本」，给 weekCleared 去重
 *              starsV, streakV, updatedAt }
 *   saves    { _id: openid, sets: { saveKey: save }, updatedAt, nick }
 *   starEvents { _id: openid|uid|rev|day, openid, uid, rev, day, stars, weekKey, ts }
 *                                          ← v0.65 周星去重表（_id 唯一 = 天然幂等）
 *
 * v0.65 排行榜口径（唯一来源 docs/v0.63-排行榜重设计规格.md）：
 *   全服榜 stars ↓ → cleared ↓ → updatedAt ↑
 *   本周榜 weekStars ↓ → streak ↓ → weekCleared ↓ → updatedAt ↑
 *   名次用复合条件 count 算（主值更高，或主值相等但次值更高），不能只按单字段数。
 *
 * 安全：
 *   - 客户端不直连数据库，全部走本函数（管理员权限），改包改不出假成绩；
 *   - openid 由 getWXContext() 取，客户端传什么都不认；
 *   - stars / cleared 有上限夹取；周星事件单条 1~3、单日 ≤60，超出直接拒绝；
 *   - sets 体积上限 200KB，超了拒收，防止有人拿存档当网盘。
 */
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;
const PLAYERS = 'players';
const SAVES = 'saves';
const SEVENTS = 'starEvents';
const MAX_SETS_BYTES = 200 * 1024;
const MAX_NICK = 12;                 // 与 config.js PLAYER.nickMax 一致
const MAX_STARS = 300;               // 100 关 × 3 的余量（当前 67 关 = 201）
const MAX_CLEARED = 120;
const WEEK_DAY_MAX = 60;             // 单日周星增量上限（防刷）
const TZ = 8 * 3600 * 1000;          // 北京时间

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

/* ---------------- v0.65 周口径 ---------------- */
/* ISO 周（UTC+8）。必须与客户端 core.weekKeyCN 同算法，否则跨周判定会差一周。 */
function weekKeyOf(ts) {
  const d = new Date(ts + TZ);
  const day = d.getUTCDay() || 7;
  const thu = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 4 - day));
  const y0 = Date.UTC(thu.getUTCFullYear(), 0, 1);
  const wk = Math.ceil(((thu - y0) / 86400000 + 1) / 7);
  return thu.getUTCFullYear() + '-W' + String(wk).padStart(2, '0');
}
/* 北京时间「下周一 00:00」的毫秒值（客户端拿它做倒计时） */
function nextResetAt(ts) {
  const d = new Date(ts + TZ);
  const day = d.getUTCDay() || 7;
  const mondayShift = 8 - day;                       // 周一(1) → +7，周日(7) → +1
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + mondayShift) - TZ;
}
function dayKeyCN(ts) {
  const d = new Date(ts + TZ);
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') +
    '-' + String(d.getUTCDate()).padStart(2, '0');
}

async function getPlayer(openid) {
  const r = await db.collection(PLAYERS).where({ openid }).limit(1).get();
  return r.data.length ? r.data[0] : null;
}

async function ensurePlayer(openid) {
  const p = await getPlayer(openid);
  if (p) return p;
  const now = Date.now();
  const doc = {
    openid, nick: nickOf(openid), avatar: '', src: 'auto', auth: false,
    stars: 0, cleared: 0, streak: 0,
    weekStars: 0, weekCleared: 0, weekKey: weekKeyOf(now), weekUids: [],
    starsV: 1, streakV: 2, updatedAt: now
  };
  const add = await db.collection(PLAYERS).add({ data: doc });
  doc._id = add._id;
  return doc;
}

/* 周切换：weekKey 不一致 → 先把周字段归零落库（主榜字段一律不动）。
 * 返回归一化后的 player（调用方拿去算名次）。 */
async function rollWeek(p, now) {
  const wk = weekKeyOf(now);
  if (p.weekKey === wk) return p;
  const data = { weekStars: 0, weekCleared: 0, weekKey: wk, weekUids: [] };
  try { await db.collection(PLAYERS).doc(p._id).update({ data }); } catch (e) { /* 下个人再试 */ }
  return Object.assign({}, p, data);
}

/* v0.65：结算一条周星事件。
 * 去重键 openid|uid|rev|day —— 同一关（同版本）同一天只记最高星级一次。
 * 返回 { delta, fresh }：delta = 本次新增的星数，fresh = 这一关版本本周第一次计。
 * 重复上报是幂等的（客户端上行失败会重发，靠这个兜住）。 */
async function applyWeekEvent(openid, ev, wk) {
  const uid = String(ev.uid == null ? '' : ev.uid).slice(0, 40);
  const rev = Math.max(0, Math.min(999, ev.rev | 0));
  const day = String(ev.day == null ? '' : ev.day).slice(0, 10);
  const stars = ev.stars | 0;
  if (!uid || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return { delta: 0, fresh: false };
  if (stars < 1 || stars > 3) return { delta: 0, fresh: false };
  if (day !== dayKeyCN(Date.now())) return { delta: 0, fresh: false };   // 只认今天，防补刷历史

  const _id = openid + '|' + uid + '|' + rev + '|' + day;
  let prev = 0, existed = false;
  try {
    const cur = await db.collection(SEVENTS).doc(_id).get();
    prev = (cur.data && cur.data.stars) || 0;
    existed = true;
  } catch (e) { prev = 0; }
  if (stars <= prev) return { delta: 0, fresh: false };
  const delta = stars - prev;
  try {
    if (!existed) {
      await db.collection(SEVENTS).add({
        data: { _id, openid, uid, rev, day, stars, weekKey: wk, ts: Date.now() }
      });
    } else {
      await db.collection(SEVENTS).doc(_id).update({ data: { stars, weekKey: wk, ts: Date.now() } });
    }
  } catch (e) {
    return { delta: 0, fresh: false };      // 写不进去就不加星（宁可少算，不能多算）
  }
  return { delta, fresh: prev === 0 };
}

/* ---------------- 榜单 ---------------- */
const TAB_SPEC = {
  /* [主键, 次键, 三键] —— 排序与复合名次都按这张表走 */
  0: { v: 'stars', v2: 'cleared', v3: null },
  2: { v: 'weekStars', v2: 'streak', v3: 'weekCleared' }
};

async function rankOf(openid, tab, player) {
  const spec = TAB_SPEC[tab] || TAB_SPEC[0];
  const field = spec.v, f2 = spec.v2;
  let list = [];
  try {
    /* 云数据库的多字段 orderBy 逐级生效，但同分时仍可能乱序 →
     * 取回 60 条在函数内再排一次，保证展示顺序与名次算法完全一致。 */
    const r = await db.collection(PLAYERS)
      .where({ [field]: _.gt(0) })
      .orderBy(field, 'desc')
      .orderBy(f2, 'desc')
      .limit(60)
      .get();
    const rows = r.data.sort((a, b) => {
      if ((b[field] | 0) !== (a[field] | 0)) return (b[field] | 0) - (a[field] | 0);
      if ((b[f2] | 0) !== (a[f2] | 0)) return (b[f2] | 0) - (a[f2] | 0);
      if (spec.v3 && (b[spec.v3] | 0) !== (a[spec.v3] | 0)) return (b[spec.v3] | 0) - (a[spec.v3] | 0);
      return (a.updatedAt | 0) - (b.updatedAt | 0);      // 同分早到者靠前
    });
    list = rows.slice(0, 20).map(p => {
      const item = {
        nick: p.nick || nickOf(p.openid),
        avatar: p.avatar || '',
        v: p[field] | 0,
        v2: p[f2] | 0,
        me: p.openid === openid
      };
      if (spec.v3) item.v3 = p[spec.v3] | 0;
      return item;
    });
  } catch (e) {
    list = [];
  }

  /* 名次 = 主值更高的人数 + 主值相等但次值更高的人数 + 1（复合条件，不能只数主值） */
  const mv = player[field] | 0, m2 = player[f2] | 0;
  let rank = 1;
  try {
    if (mv > 0) {
      const g1 = await db.collection(PLAYERS).where({ [field]: _.gt(mv) }).count();
      rank = g1.total + 1;
      if (m2 > 0) {
        const g2 = await db.collection(PLAYERS)
          .where({ [field]: _.eq(mv), [f2]: _.gt(m2) }).count();
        rank += g2.total;
      }
    } else {
      /* 还没上榜：排在所有上榜者之后 */
      const g0 = await db.collection(PLAYERS).where({ [field]: _.gt(0) }).count();
      rank = g0.total + 1;
    }
  } catch (e) { rank = list.length + 1; }

  let totalPlayers = 0;
  try {
    totalPlayers = (await db.collection(PLAYERS).where({ [field]: _.gt(0) }).count()).total;
  } catch (e) { totalPlayers = list.length; }

  const me = {
    nick: player.nick, avatar: player.avatar || '',
    v: mv, v2: m2, rank
  };
  if (spec.v3) me.v3 = player[spec.v3] | 0;
  return { list, me, totalPlayers };
}

exports.main = async (event, context) => {
  const { OPENID, APPID } = cloud.getWXContext();
  if (!OPENID) return { ok: false, msg: '拿不到 openid（请在微信客户端内打开）' };
  const action = event.action || 'login';
  const now = Date.now();

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
      data.updatedAt = now;
      await db.collection(PLAYERS).doc(p._id).update({ data });
      const fresh = await getPlayer(OPENID);
      return {
        ok: true, nick: fresh.nick, avatar: fresh.avatar || '',
        src: fresh.src || 'auto', auth: !!fresh.auth
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

      let p = await ensurePlayer(OPENID);
      p = await rollWeek(p, now);

      /* v0.18：三项都是「只增不减」的进度量，取 max 而不是直接覆盖。
       * 换设备登录、旧版本客户端晚到的上行，都不会把成绩改小。
       * streak 语义 = 历史最高连胜（榜单口径），失败不影响它。
       * v0.65：上限按 100 关口径收紧到 300 星 / 120 关。 */
      const stars = Math.max(p.stars | 0,
        Math.max(0, Math.min(MAX_STARS, stats.stars | 0)));
      const cleared = Math.max(p.cleared | 0,
        Math.max(0, Math.min(MAX_CLEARED, stats.cleared | 0)));
      /* 口径迁移：老数据的 streak 是「当前连胜」，还被重玩刷过，数值不可信。
       * streakV 为 0 的行第一次上行时直接按新口径覆盖一次，之后才走 max。 */
      const sent = Math.max(0, Math.min(9999, stats.streak | 0));
      const streak = (p.streakV | 0) >= 2 ? Math.max(p.streak | 0, sent) : sent;

      /* ---------- v0.65 周星事件 ---------- */
      const wk = weekKeyOf(now);
      let weekStars = p.weekStars | 0;
      let weekCleared = p.weekCleared | 0;
      const weekUids = Array.isArray(p.weekUids) ? p.weekUids.slice(0, 200) : [];
      let dayGain = 0;
      const evs = Array.isArray(stats.weekEvents) ? stats.weekEvents.slice(0, 12) : [];
      for (let i = 0; i < evs.length; i++) {
        const ev = evs[i] || {};
        const r = await applyWeekEvent(OPENID, ev, wk);
        if (r.delta > 0) {
          weekStars += r.delta;
          dayGain += r.delta;
          if (r.fresh) {
            const tag = String(ev.uid) + '#' + (ev.rev | 0);
            if (weekUids.indexOf(tag) < 0) {
              weekUids.push(tag);
              weekCleared += 1;
            }
          }
        }
      }
      /* 防刷：单日周星增量上限 60（一整周 93 关 × 3 的日分布远小于它） */
      if (dayGain > WEEK_DAY_MAX) {
        weekStars = Math.max(p.weekStars | 0, weekStars - (dayGain - WEEK_DAY_MAX));
      }
      if (weekUids.length > 200) weekUids.length = 200;

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

      const upd = {
        stars, cleared, streak, streakV: 2, starsV: 1,
        weekStars, weekCleared, weekKey: wk, weekUids,
        nick, avatar, src, auth, updatedAt: now
      };
      await db.collection(PLAYERS).doc(p._id).update({ data: upd });
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
      const merged = Object.assign({}, p, upd);
      const rk = await rankOf(OPENID, 0, merged);
      return {
        ok: true, nick, avatar, src, auth,
        me: { nick, avatar, v: stars, v2: cleared, rank: rk.me.rank },
        week: { weekStars, weekCleared, weekKey: wk, nextResetAt: nextResetAt(now) },
        weekResetAt: nextResetAt(now)
      };
    }

    if (action === 'rank') {
      const tab = event.tab | 0;
      if (tab === 1) {
        /* 好友榜要开放数据域（wx.getFriendCloudStorage），云开发拿不到好友关系，
         * 返回 note 让前端显示正确文案。 */
        return { ok: true, list: [], me: null, note: 'friend',
          nextResetAt: nextResetAt(now), weekKey: weekKeyOf(now) };
      }
      let p = await ensurePlayer(OPENID);
      if (tab === 2) p = await rollWeek(p, now);      // 周榜先做周切换再排
      const rk = await rankOf(OPENID, tab, p);
      return {
        ok: true, list: rk.list, me: rk.me,
        totalPlayers: rk.totalPlayers,
        nextResetAt: nextResetAt(now), weekKey: weekKeyOf(now)
      };
    }

    return { ok: false, msg: '未知 action: ' + action };
  } catch (e) {
    return { ok: false, msg: String((e && e.message) || e).slice(0, 120) };
  }
};
