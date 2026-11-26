(function (root, factory) {
var G = root.TANGRAM_GEOM, J = root.TANGRAM_JUDGE, D = root.TANGRAM_DATA, C = root.TANGRAM_CONFIG;
if (typeof require !== 'undefined') {
if (!G) G = require('./geom.js');
if (!J) J = require('./judge.js');
if (!D) D = require('./levels.js');
if (!C) C = require('./config.js');
}
root.TANGRAM_CORE = factory(G, J, D, C);
if (typeof module !== 'undefined' && module.exports) module.exports = root.TANGRAM_CORE;
})(typeof window !== 'undefined' ? window : globalThis, function (G, J, D, C) {
'use strict';
var COL = C.COLORS, LAY = C.LAYOUT;
var WS = LAY.BOARD.size / 1000;
var BASE_BOARD_Y = LAY.BOARD.y;
var BASE_BOARD_H = LAY.BOARD.h;
var BOARD_MAX_NUDGE = 90;
var SETS = D.sets || root.TANGRAM_SETS || null;
var DEFAULT_SET = D.defaultSet || 'tangram4';
var FALLBACK_CHAP = ['启蒙', '熟悉', '转折', '嵌套', '交错', '硬骨头'];
function pilePack(order, TRAY, LOCAL, TRAY_BB, WS) {
var PL = C.LAYOUT.PILE;
var cell = PL.cell || 8, step = PL.step || 12;
var pad = PL.pad || TRAY.pad || 10;
var bx0 = LAY.BOARD.x + pad, bx1 = LAY.BOARD.x + LAY.BOARD.size - pad;
var by0 = TRAY.top, by1 = TRAY.bottom;
var items = order.map(function (id, i) {
var poly = LOCAL[id].map(function (v) { return [v[0] * WS, v[1] * WS]; });
var bb = G.bbox([poly]);
var ce = G.centroid(poly);
var cells = [], x, y;
for (x = bb[0]; x < bb[2]; x += cell) {
for (y = bb[1]; y < bb[3]; y += cell) {
var px = x + cell / 2, py = y + cell / 2;
if (G.pointInPoly([px, py], poly)) cells.push([px - ce[0], py - ce[1]]);
}
}
return {
id: id, slotIdx: i, poly: poly,
cx: ce[0], cy: ce[1],
minX: bb[0] - ce[0], maxX: bb[2] - ce[0],
minY: bb[1] - ce[1], maxY: bb[3] - ce[1],
w: bb[2] - bb[0], h: bb[3] - bb[1],
area: Math.abs(G.area(poly)), cells: cells
};
});
var queue = items.slice().sort(function (a, b) { return b.area - a.area; });
var occ = {}, near = {}, keys = 0;
function cellKey(x, y) { return Math.round(x / cell) * 4096 + Math.round(y / cell); }
function occAt(x, y) {
var a = occ[cellKey(x, y)];
return !!(a && a.length);
}
function mark(x, y, slotIdx) {
var k = cellKey(x, y);
if (!occ[k]) { occ[k] = []; keys++; }
occ[k].push(slotIdx);
var ix = Math.round(x / cell), iy = Math.round(y / cell);
for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) near[(ix + dx) * 4096 + (iy + dy)] = 1;
}
var midX = (bx0 + bx1) / 2, midY = (by0 + by1) / 2;
var spanW = PL.spanW || 0;
var sx0 = spanW ? Math.max(bx0, midX - spanW / 2) : bx0;
var sx1 = spanW ? Math.min(bx1, midX + spanW / 2) : bx1;
var spanH = PL.spanH || 0;
var sy0 = spanH ? Math.max(by0, midY - spanH / 2) : by0;
var sy1 = spanH ? Math.min(by1, midY + spanH / 2) : by1;
for (var qi = 0; qi < queue.length; qi++) {
var it = queue[qi], best = null;
for (var pass = 0; pass < 2 && !best; pass++) {
var rx0 = pass === 0 ? sx0 : bx0, rx1 = pass === 0 ? sx1 : bx1;
var ry0 = pass === 0 ? sy0 : by0, ry1 = pass === 0 ? sy1 : by1;
var loX = rx0 - it.minX, hiX = rx1 - it.maxX;
var loY = ry0 - it.minY, hiY = ry1 - it.maxY;
if (hiX < loX || hiY < loY) continue;
for (var gx = loX; gx <= hiX + 0.01; gx += step) {
for (var gy = loY; gy <= hiY + 0.01; gy += step) {
var cov = 0, c;
for (c = 0; c < it.cells.length; c++) {
if (occAt(gx + it.cells[c][0], gy + it.cells[c][1])) cov++;
}
var covR = cov / Math.max(1, it.cells.length);
var nearHit = 0;
for (c = 0; c < it.cells.length; c++) {
if (near[cellKey(gx + it.cells[c][0], gy + it.cells[c][1])]) nearHit++;
}
var h = Math.sin(gx * 12.9898 + gy * 78.233 + qi * 37.719) * 43758.5453;
var jit = (h - Math.floor(h)) * (PL.jitter || 0);
var cost = covR * 100
+ nearHit / Math.max(1, it.cells.length) * 34
+ (occAt(gx, gy) ? 60 : 0)
+ jit
+ Math.abs(gx - midX) * 0.012
+ Math.abs(gy - midY) * 0.010;
if (!best || cost < best.cost) best = { x: gx, y: gy, cost: cost, cov: covR };
}
}
}
if (!best) best = { x: midX, y: midY, cost: 0, cov: 1 };
it.x = best.x; it.y = best.y; it.cov = best.cov;
for (var m = 0; m < it.cells.length; m++) mark(it.x + it.cells[m][0], it.y + it.cells[m][1], it.slotIdx);
}
var slots = [], minVis = 1, ux0 = 1e9, ux1 = -1e9, uy0 = 1e9, uy1 = -1e9;
for (var i2 = 0; i2 < items.length; i2++) {
var a = items[i2];
var hidden = 0;
for (var n = 0; n < a.cells.length; n++) {
var xx = a.x + a.cells[n][0], yy = a.y + a.cells[n][1];
var k2 = cellKey(xx, yy);
var arr = occ[k2] || [];
for (var z = 0; z < arr.length; z++) if (arr[z] > a.slotIdx) { hidden++; break; }
if (xx < ux0) ux0 = xx; if (xx > ux1) ux1 = xx;
if (yy < uy0) uy0 = yy; if (yy > uy1) uy1 = yy;
}
a.vis = 1 - hidden / Math.max(1, a.cells.length);
if (a.vis < minVis) minVis = a.vis;
slots[a.slotIdx] = { x: a.x, y: a.y, w: a.w, h: a.h, vis: a.vis, cover: a.cov };
}
return {
slots: slots,
fit: { w: ux1 - ux0, h: uy1 - uy0 },
info: { minVisible: minVis, cells: keys, band: [by0, by1], pad: pad }
};
}
function buildSet(key) {
var meta = (SETS && SETS[key]) || {};
var ds = (key === DEFAULT_SET) ? D.dataset : meta.dataset;
var levels = (key === DEFAULT_SET) ? D.levels : meta.levels;
var UNIT = ds.unitScale;
var LOCAL = {}, TRAY_BB = {}, id;
for (id in ds.pieces) {
LOCAL[id] = G.makeLocal(ds.pieces[id].base).map(function (v) { return [v[0] * UNIT, v[1] * UNIT]; });
}
for (id in LOCAL) {
var bb = G.bbox([LOCAL[id]]);
var ce = G.centroid(LOCAL[id]);
TRAY_BB[id] = {
cx: (bb[0] + bb[2]) / 2 * WS, cy: (bb[1] + bb[3]) / 2 * WS,
ccx: ce[0] * WS, ccy: ce[1] * WS,
w: (bb[2] - bb[0]) * WS, h: (bb[3] - bb[1]) * WS
};
}
var TRAY = meta.tray || C.LAYOUT.TRAY;
var ovr = C.LAYOUT.TRAY_OVERRIDE && C.LAYOUT.TRAY_OVERRIDE[key];
if (ovr) {
var merged = {}, tk;
for (tk in TRAY) merged[tk] = TRAY[tk];
for (tk in ovr) merged[tk] = ovr[tk];
TRAY = merged;
}
var PACK = pilePack(ds.pieceOrder, TRAY, LOCAL, TRAY_BB, WS);
var SLOT_POS = PACK.slots;
var totalW = PACK.fit.w, totalH = PACK.fit.h;
var band = TRAY.bottom - TRAY.top;
return {
ds: ds, levels: levels, LOCAL: LOCAL, TRAY_BB: TRAY_BB, SLOT_POS: SLOT_POS,
chapPer: meta.chapPer || 20, chapNames: meta.chapNames || FALLBACK_CHAP,
chapTitles: meta.chapTitles || null,
chapters: meta.chapters || null,
completeTitle: meta.completeTitle || '', completeSub: meta.completeSub || '',
saveKey: meta.saveKey || C.SAVE_KEY, snapGrid: meta.snapGrid || null,
fit: { totalW: totalW, totalH: totalH, band: band, pile: PACK.info }
};
}
var B0 = buildSet(DEFAULT_SET);
var DS = B0.ds, LEVELS = B0.levels, LOCAL = B0.LOCAL, TRAY_BB = B0.TRAY_BB;
var SLOT_POS = B0.SLOT_POS, CHAP_PER = B0.chapPer, CHAP_NAMES = B0.chapNames;
var CHAP_TITLES = B0.chapTitles, COMPLETE_TITLE = B0.completeTitle, COMPLETE_SUB = B0.completeSub;
var CHAP_LIST = B0.chapters;
var SAVE_KEY = B0.saveKey, SNAP_GRID = B0.snapGrid;
function w2d(x) { return LAY.BOARD.x + x * WS; }
function h2d(y) { return LAY.BOARD.y + y * WS; }
function d2w(x) { return (x - LAY.BOARD.x) / WS; }
function d2wy(y) { return (y - LAY.BOARD.y) / WS; }
var TOOL_X = (function () {
var n = 5, total = n * LAY.TOOLBAR.w + (n - 1) * LAY.TOOLBAR.gap;
var x0 = LAY.BOARD.x + (LAY.BOARD.size - total) / 2;
var arr = [];
for (var i = 0; i < n; i++) arr.push(x0 + LAY.TOOLBAR.w / 2 + i * (LAY.TOOLBAR.w + LAY.TOOLBAR.gap));
return arr;
})();
var TOOL_Y = LAY.TOOLBAR.y + LAY.TOOLBAR.h / 2;
var FONT = '-apple-system, "PingFang SC", "Helvetica Neue", sans-serif';
function font(size, weight) { return (weight ? weight + ' ' : '') + size + 'px ' + FONT; }
return function createGame(env) {
var ctx = env.ctx;
var state = {
page: 'home',
setKey: DEFAULT_SET,
overlay: null,
levelIdx: 0,
lvPage: 0,
lvScroll: 0, lvScrollMax: 0, lvView: null,
pieces: [],
selId: null,
drag: null,
activePointer: false,
time: 0,
elapsed: 0,
running: false,
steps: 0,
hintUsed: false,
hintLv: 0,
hintPaid: 0,
hintTier: 2,
covFrom: 0, covTo: 0, covT: 1, cov: 0,
msg: '', msgT: 0,
overlapT: 0,
overlapPairs: [],
win: null,
flower: null,
lowFps: false,
fade: 1,
pageT: 0,
hint: null,
judge: null,
judgeMs: 0,
press: null,
pressT: 0,
lastTap: null,
save: null,
settingsFx: true,
settingsBgm: true,
lastSnap: null,
lastEdge: null,
result: null,
starShown: 0,
resT: 0,
streakGain: 0,
rankTab: 0,
skinTab: 0,
inviteCd: 0,
inviteFlash: null,
inviteScroll: 0, inviteScrollMax: 0, inviteList: null, scrollDrag: null,
buyItem: null,
fxParts: null,
rankBack: null,
rankT: 0,
net: { on: false, ready: false, nick: '', syncing: false, ts: 0, err: '' },
me: { nick: '', avatar: '', src: 'auto', auth: false, err: '', busy: false },
rankList: null,
rankErr: '',
rankLoading: false,
rankCache: {},
rankListTab: -1,
rankSeq: 0,
rankMeta: { nextResetAt: 0, weekKey: '', weekStars: 0, weekCleared: 0 },
friendRankInfo: null,
rankTickAt: 0,
rankPaintSig: '',
streakBeforeFail: 0,
seenBeforeFail: [],
friendT: 0,
bgmDuck: false,
timeLimit: 0,
timeLeft: 0,
hearts: 3,
reviveUsed: 0,
adLv: 0,
tut: null,
toast: null,
adSim: null,
adWait: null,
onlineMark: 0,
onlineSaveT: 0
};
var hits = [];
var view = { scale: 1, ox: 0, oy: 0, w: 0, h: 0, dh: C.DESIGN.h, dpr: 1, safeTop: C.SAFE.top, safeBottom: C.SAFE.bottom };
var VIS_KEY = 'tangram_visual_v1';
var VIS_FIELDS = ['skin', 'bgFx', 'pieceStyle', 'sfxStyle'];
function loadVisual() {
var raw = null;
try { raw = env.storage.get(VIS_KEY); } catch (e) { raw = null; }
if (!raw) return null;
var o = raw;
if (typeof raw === 'string') { try { o = JSON.parse(raw); } catch (e) { return null; } }
return (o && typeof o === 'object') ? o : null;
}
function saveVisual(src) {
var s = src || (state && state.save) || {};
var o = {};
for (var i = 0; i < VIS_FIELDS.length; i++) o[VIS_FIELDS[i]] = s[VIS_FIELDS[i]];
try { env.storage.set(VIS_KEY, JSON.stringify(o)); } catch (e) { }
}
function applyVisualTo(s) {
var v = loadVisual();
if (!v) return false;
if (v.skin && C.SKINS && C.SKINS[v.skin]) s.skin = v.skin;
if (v.bgFx && C.BG_FX && C.BG_FX[v.bgFx]) s.bgFx = v.bgFx;
if (v.pieceStyle && C.PIECE_STYLES && C.PIECE_STYLES[v.pieceStyle]) s.pieceStyle = v.pieceStyle;
if (v.sfxStyle && C.SFX_STYLES && C.SFX_STYLES[v.sfxStyle]) s.sfxStyle = v.sfxStyle;
return true;
}
var WALLET_KEY = 'tangram_wallet_v1';
var WALLET_FIELDS = ['coin', 'energy', 'energyMax', 'energyTs',
'freeEnergyUsed', 'freeEnergyDay', 'hintItems'];
function loadWallet() {
var raw = null;
try { raw = env.storage.get(WALLET_KEY); } catch (e) { raw = null; }
if (!raw) return null;
var o = raw;
if (typeof raw === 'string') { try { o = JSON.parse(raw); } catch (e) { return null; } }
return (o && typeof o === 'object') ? o : null;
}
function writeWallet(src) {
var s = src || (state && state.save) || {};
var o = {}, i;
for (i = 0; i < WALLET_FIELDS.length; i++) o[WALLET_FIELDS[i]] = s[WALLET_FIELDS[i]];
try { env.storage.set(WALLET_KEY, JSON.stringify(o)); } catch (e) { }
}
function applyWalletTo(s) {
var w = loadWallet();
if (!w) { writeWallet(s); return false; }
for (var i = 0; i < WALLET_FIELDS.length; i++) {
var f = WALLET_FIELDS[i];
if (w[f] !== undefined && w[f] !== null) s[f] = w[f];
}
return true;
}
var SHOP_KEY = 'tangram_shop_v1';
var SHOP_MAP = { bgfx: 'BG_FX', pstyle: 'PIECE_STYLES' };
function loadShop() {
var raw = null;
try { raw = env.storage.get(SHOP_KEY); } catch (e) { raw = null; }
if (!raw) return null;
var o = raw;
if (typeof raw === 'string') { try { o = JSON.parse(raw); } catch (e) { return null; } }
return (o && typeof o === 'object') ? o : null;
}
function writeShop(o) {
try { env.storage.set(SHOP_KEY, JSON.stringify(o || {})); } catch (e) { }
}
function itemPrice(kind, key) {
var m = C[SHOP_MAP[kind]];
var it = m && m[key];
return (it && typeof it.price === 'number') ? it.price : 0;
}
function ownsItem(kind, key) {
var o = loadShop();
var arr = o && o[kind];
return Array.isArray(arr) && arr.indexOf(key) >= 0;
}
function grantItem(kind, key) {
var o = loadShop() || {};
if (!Array.isArray(o[kind])) o[kind] = [];
if (o[kind].indexOf(key) < 0) o[kind].push(key);
writeShop(o);
}
function itemLocked(kind, key) {
return itemPrice(kind, key) > 0 && !ownsItem(kind, key);
}
function seedShop(s) {
if (!loadShop()) writeShop({});
if (s.bgFx && itemPrice('bgfx', s.bgFx) > 0) grantItem('bgfx', s.bgFx);
if (s.pieceStyle && itemPrice('pstyle', s.pieceStyle) > 0) grantItem('pstyle', s.pieceStyle);
}
var ONLINE_KEY = 'tangram_online_v1';
function loadOnline() {
var raw = null;
try { raw = env.storage.get(ONLINE_KEY); } catch (e) { raw = null; }
if (!raw) return null;
var o = raw;
if (typeof raw === 'string') { try { o = JSON.parse(raw); } catch (e) { return null; } }
return (o && typeof o === 'object') ? o : null;
}
function writeOnline(src) {
var s = src || (state && state.save) || {};
var o = {
onlineDay: s.onlineDay || '',
onlineSec: (typeof s.onlineSec === 'number' && isFinite(s.onlineSec)) ? s.onlineSec : 0,
onlineGot: (s.onlineGot && typeof s.onlineGot === 'object') ? s.onlineGot : {}
};
try { env.storage.set(ONLINE_KEY, JSON.stringify(o)); } catch (e) { }
return o;
}
function mergeOnlineInto(out, o) {
if (!o || typeof o !== 'object') return;
if (typeof o.onlineSec === 'number' && isFinite(o.onlineSec) && o.onlineSec > out.onlineSec) {
out.onlineSec = o.onlineSec;
}
var g = o.onlineGot, k;
if (g && typeof g === 'object') { for (k in g) if (g[k]) out.onlineGot[k] = true; }
}
function seedOnline(cur) {
var d = todayKey(), out = { onlineDay: d, onlineSec: 0, onlineGot: {} }, i;
var ks = saveKeys();
for (i = 0; i < ks.length; i++) {
var o = readSaveByKey(ks[i]);
if (o && o.onlineDay === d) mergeOnlineInto(out, o);
}
if (cur && cur.onlineDay === d) mergeOnlineInto(out, cur);
writeOnline(out);
return out;
}
function applyOnlineTo(s) {
var o = loadOnline();
if (!o) o = seedOnline(s);
s.onlineDay = (typeof o.onlineDay === 'string') ? o.onlineDay : '';
s.onlineSec = (typeof o.onlineSec === 'number' && isFinite(o.onlineSec) && o.onlineSec >= 0)
? Math.min(C.ONLINE.maxSec, o.onlineSec) : 0;
var g = (o.onlineGot && typeof o.onlineGot === 'object') ? o.onlineGot : {};
var got = {}, k;
for (k in g) if (g[k]) got[k] = true;
s.onlineGot = got;
return true;
}
function defaultSave() {
var E = C.ECON;
return {
playerId: 'local', starOf: {}, unlockedMax: 1, bestTime: {}, hintUsed: {},
starPaid: {},
settings: { sfx: true, bgm: true },
coin: E.coinInit,
energy: E.energyInit, energyMax: E.energyMax, energyTs: Date.now(),
freeEnergyUsed: 0, freeEnergyDay: '',
onlineDay: '', onlineSec: 0, onlineGot: {},
hintItems: 0,
inviteCount: 0, invitePend: [], inviteGot: [],
skin: 'warm',
bgFx: 'geometric',
pieceStyle: 'classic',
sfxStyle: 'wood',
bgmIdx: 0,
streak: 0,
bestStreak: 0,
streakSeen: [],
resume: null,
profile: null,
updatedAt: Date.now()
};
}
function loadSave() {
var raw = null;
try { raw = env.storage.get(SAVE_KEY); } catch (e) { raw = null; }
var s = defaultSave();
if (raw) {
try {
var o = typeof raw === 'string' ? JSON.parse(raw) : raw;
if (o && typeof o === 'object') {
var E = C.ECON;
s.starOf = o.starOf || {};
s.starPaid = (o.starPaid && typeof o.starPaid === 'object') ? o.starPaid : {};
s.unlockedMax = o.unlockedMax || 1;
s.bestTime = o.bestTime || {};
s.hintUsed = o.hintUsed || {};
s.settings = o.settings || { sfx: true, bgm: true };
s.coin = (typeof o.coin === 'number') ? o.coin : E.coinInit;
s.energy = (typeof o.energy === 'number') ? o.energy : E.energyInit;
s.energyMax = (typeof o.energyMax === 'number') ? o.energyMax : E.energyMax;
s.energyTs = (typeof o.energyTs === 'number') ? o.energyTs : Date.now();
s.freeEnergyUsed = (typeof o.freeEnergyUsed === 'number') ? o.freeEnergyUsed : 0;
s.freeEnergyDay = o.freeEnergyDay || '';
s.onlineDay = o.onlineDay || '';
s.onlineSec = (typeof o.onlineSec === 'number') ? o.onlineSec : 0;
s.onlineGot = (o.onlineGot && typeof o.onlineGot === 'object') ? o.onlineGot : {};
s.hintItems = (typeof o.hintItems === 'number') ? o.hintItems : 0;
s.resume = (o.resume && typeof o.resume === 'object' && typeof o.resume.lv === 'number')
? o.resume : null;
s.inviteCount = (typeof o.inviteCount === 'number') ? Math.max(0, o.inviteCount) : 0;
s.invitePend = Array.isArray(o.invitePend)
? o.invitePend.filter(function (t) { return typeof t === 'number'; }) : [];
s.inviteGot = Array.isArray(o.inviteGot)
? o.inviteGot.filter(function (n) { return typeof n === 'number'; }) : [];
s.profile = (o.profile && typeof o.profile === 'object') ? o.profile : null;
s.skin = o.skin || 'warm';
s.bgFx = (C.BG_FX && C.BG_FX[o.bgFx]) ? o.bgFx : 'geometric';
s.pieceStyle = (C.PIECE_STYLES && C.PIECE_STYLES[o.pieceStyle]) ? o.pieceStyle : 'classic';
s.sfxStyle = (C.SFX_STYLES && C.SFX_STYLES[o.sfxStyle]) ? o.sfxStyle : 'wood';
s.bgmIdx = (typeof o.bgmIdx === 'number') ? o.bgmIdx : 0;
s.streak = (typeof o.streak === 'number') ? o.streak : 0;
s.bestStreak = (typeof o.bestStreak === 'number')
? o.bestStreak : Math.max(0, s.streak);
s.streakSeen = Array.isArray(o.streakSeen)
? o.streakSeen.map(String) : [];
}
} catch (e) { }
}
try {
var curSig = LEVELS.map(function (l) { return l.name || ''; });
if (Array.isArray(s.lvSig) && s.lvSig.length &&
s.lvSig.join('|') !== curSig.join('|')) {
var oldSig = s.lvSig;
var mapOld2New = {};
for (var ni2 = 0; ni2 < curSig.length; ni2++) {
var oi2 = oldSig.indexOf(curSig[ni2]);
if (oi2 >= 0 && mapOld2New[oi2] === undefined) mapOld2New[oi2] = ni2;
}
var remapObj = function (src) {
var out = {};
for (var k in src) {
var oi3 = parseInt(k, 10) - 1;
if (isNaN(oi3) || mapOld2New[oi3] === undefined) continue;
out[String(mapOld2New[oi3] + 1)] = src[k];
}
return out;
};
s.starOf = remapObj(s.starOf || {});
s.starPaid = remapObj(s.starPaid || {});
s.bestTime = remapObj(s.bestTime || {});
s.hintUsed = remapObj(s.hintUsed || {});
var newUnlocked = 1;
for (var oi4 = 0; oi4 < (s.unlockedMax || 1); oi4++) {
if (mapOld2New[oi4] === undefined) continue;
newUnlocked = Math.max(newUnlocked, mapOld2New[oi4] + 2);
}
s.unlockedMax = Math.min(curSig.length, newUnlocked);
}
s.lvSig = curSig;
} catch (e2) { }
var maxLv = LEVELS.length;
if (s.unlockedMax > maxLv) s.unlockedMax = maxLv;
if (s.unlockedMax < 1) s.unlockedMax = 1;
var OLD_STAR_COIN = [2, 3, 5];
var NEW_TOTALS = C.ECON.starReward;
for (var k in s.starOf) {
if (!(Number(k) >= 1 && Number(k) <= maxLv)) {
delete s.starOf[k];
delete s.starPaid[k];
continue;
}
var pst = s.starOf[k] || 0;
if (typeof s.starPaid[k] !== 'number') {
s.starPaid[k] = pst > 0 ? (OLD_STAR_COIN[pst - 1] || 0) : 0;
}
var cap0 = pst > 0 ? (NEW_TOTALS[pst - 1] || 0) : 0;
if (s.starPaid[k] > cap0) s.starPaid[k] = cap0;
}
var seen = [], seenMap = {};
for (var si = 0; si < s.streakSeen.length; si++) {
var sk2 = String(s.streakSeen[si]);
if (!(Number(sk2) >= 1 && Number(sk2) <= maxLv)) continue;
if (seenMap[sk2]) continue;
seenMap[sk2] = 1;
seen.push(sk2);
}
s.streakSeen = seen;
if (!applyVisualTo(s)) s.bgFx = 'geometric';
applyWalletTo(s);
applyOnlineTo(s);
seedShop(s);
return s;
}
function writeLocal(keepTs) {
if (!keepTs) state.save.updatedAt = Date.now();
try { env.storage.set(SAVE_KEY, JSON.stringify(state.save)); } catch (e) { }
writeWallet(state.save);
writeOnline(state.save);
}
function persist() {
state.dirty = true;
writeLocal();
cloudPush(false);
}
var CLOUD = env.cloud || null;
function cloudOn() { return !!(CLOUD && CLOUD.enabled && CLOUD.enabled()); }
var PROFILE = env.profile || null;
function profileOn() { return !!(PROFILE && (!PROFILE.enabled || PROFILE.enabled())); }
function profileCanAuth() { return !!(PROFILE && PROFILE.canAuth && PROFILE.canAuth()); }
function meNick() {
return state.me.nick || state.net.nick || (C.PLAYER.defaultName + '玩家');
}
function meAvatarUrl() { return state.me.avatar || ''; }
function applyProfile(p, push) {
if (!p) return false;
var changed = false;
if (p.nick && p.nick !== state.me.nick) { state.me.nick = p.nick; changed = true; }
if (p.avatar !== undefined && (p.avatar || '') !== state.me.avatar) {
state.me.avatar = p.avatar || ''; changed = true;
}
if (p.src && p.src !== state.me.src) { state.me.src = p.src; changed = true; }
if (p.auth !== undefined && !!p.auth !== !!state.me.auth) { state.me.auth = !!p.auth; changed = true; }
state.net.nick = meNick();
if (!changed) return false;
state.dirty = true;
state.save.profile = { nick: meNick(), avatar: meAvatarUrl(), src: state.me.src, auth: !!state.me.auth };
if (push === false) return true;
if (push === 'local') writeLocal();
else { persist(); cloudPush(true); }
return true;
}
function profileStateText() {
if (!profileOn()) return '当前环境读不到微信资料';
if (state.me.busy) return '正在读取微信资料…';
if (state.me.err) return state.me.err;
if (state.me.auth) return '微信昵称头像已授权';
if (state.me.src === 'custom') return '自定义昵称 · 未授权微信资料';
if (profileCanAuth()) return '未授权 · 点下方按钮使用微信资料';
return '系统化名，可以自己改一个';
}
function cssRect(cx, cy, w, h) {
return {
left: view.ox + (cx - w / 2) * view.scale,
top: view.oy + (cy - h / 2) * view.scale,
width: w * view.scale,
height: h * view.scale
};
}
function syncProfileButton() {
if (!PROFILE || !PROFILE.place) return;
var need = state.overlay === 'settings' && profileCanAuth() && !state.me.auth;
if (!need) { hideProfileButton(); return; }
var P = C.PLAYER;
var r = cssRect(C.DESIGN.w / 2, DH() / 2 + P.authBtn.dy, P.authBtn.w, P.authBtn.h);
r.label = P.authLabel;
r.fontSize = Math.round(28 * view.scale);
try { PROFILE.place(r); } catch (e) { }
}
function hideProfileButton() {
if (PROFILE && PROFILE.hide) { try { PROFILE.hide(); } catch (e) {} }
}
function requestProfile() {
if (!profileOn()) { toast('当前环境读不到微信资料'); return; }
if (state.me.busy) return;
state.me.busy = true;
state.me.err = '';
PROFILE.request(function (err, p) {
state.me.busy = false;
if (err) {
state.me.err = (err && err.msg) || '读取失败';
toast(state.me.err);
syncProfileButton();
return;
}
applyProfile(p);
toast(p && p.auth ? '已使用微信昵称头像' : '昵称已更新');
syncProfileButton();
});
}
function renameProfile() {
if (!PROFILE || !PROFILE.rename) { toast('当前环境不支持改昵称'); return; }
PROFILE.rename(meNick(), function (err, nick) {
if (err || !nick) return;
var n = String(nick).replace(/[\r\n\t]/g, ' ').trim().slice(0, C.PLAYER.nickMax);
if (!n || n === state.me.nick) return;
applyProfile({ nick: n, avatar: state.me.avatar, src: 'custom', auth: !!state.me.auth });
toast('昵称已改为「' + n + '」');
syncProfileButton();
});
}
function drawAvatar(cx, cy, r, nick, url, color) {
var img = (url && PROFILE && PROFILE.imageOf) ? PROFILE.imageOf(url) : null;
if (img) {
ctx.save();
ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
try { ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2); ctx.restore(); return; }
catch (e) { ctx.restore(); }
}
ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
ctx.fillStyle = color || COL.gold; ctx.fill();
text((nick || '?').slice(0, 1), cx, cy + 1, Math.round(r * 1.02), '#FFFFFF', 'center', '700');
}
function saveKeys() {
var ks = [C.SAVE_KEY];
if (SETS && SETS.tangram7 && SETS.tangram7.saveKey && SETS.tangram7.saveKey !== C.SAVE_KEY) {
ks.push(SETS.tangram7.saveKey);
}
return ks;
}
function readSaveByKey(k) {
try {
var raw = env.storage.get(k);
if (!raw) return null;
var o = typeof raw === 'string' ? JSON.parse(raw) : raw;
return (o && typeof o === 'object') ? o : null;
} catch (e) { return null; }
}
function writeSaveByKey(k, o) {
try { env.storage.set(k, JSON.stringify(o)); } catch (e) {}
}
function starsOfSave(o) {
var n = 0;
for (var k in (o.starOf || {})) n += o.starOf[k] || 0;
return n;
}
function mergeSave(a, b) {
if (!a) return b;
if (!b) return a;
var newer = ((b.updatedAt || 0) > (a.updatedAt || 0)) ? b : a;
var out = {}, k;
for (k in a) out[k] = a[k];
for (k in b) out[k] = b[k];
out.coin = newer.coin;
out.energy = newer.energy;
out.energyTs = newer.energyTs;
out.settings = newer.settings || out.settings;
out.skin = newer.skin || out.skin;
out.starOf = {};
var lv;
for (lv in (a.starOf || {})) out.starOf[lv] = a.starOf[lv] || 0;
for (lv in (b.starOf || {})) out.starOf[lv] = Math.max(out.starOf[lv] || 0, b.starOf[lv] || 0);
out.starPaid = {};
for (lv in (a.starPaid || {})) out.starPaid[lv] = a.starPaid[lv] || 0;
for (lv in (b.starPaid || {})) out.starPaid[lv] = Math.max(out.starPaid[lv] || 0, b.starPaid[lv] || 0);
out.unlockedMax = Math.max(a.unlockedMax || 1, b.unlockedMax || 1);
out.streak = (newer.streak || 0);
out.streakSeen = (newer.streakSeen || []).slice();
out.bestStreak = Math.max(a.bestStreak || 0, b.bestStreak || 0);
out.onlineDay = a.onlineDay || '';
out.onlineSec = a.onlineSec || 0;
out.onlineGot = a.onlineGot || {};
out.hintItems = (newer.hintItems || 0);
out.resume = newer.resume || null;
out.updatedAt = Math.max(a.updatedAt || 0, b.updatedAt || 0);
applyVisualTo(out);
applyOnlineTo(out);
return out;
}
function collectCloud() {
writeLocal();
var sets = {}, ks = saveKeys(), i, gOn = loadOnline();
for (i = 0; i < ks.length; i++) {
var o = readSaveByKey(ks[i]);
if (!o) continue;
if (gOn) {
o.onlineDay = gOn.onlineDay || '';
o.onlineSec = gOn.onlineSec || 0;
o.onlineGot = gOn.onlineGot || {};
}
sets[ks[i]] = o;
}
var stars = 0, cleared = 0, best = state.save.bestStreak || 0, sk, lv;
for (sk in sets) {
for (lv in (sets[sk].starOf || {})) {
var v = sets[sk].starOf[lv] || 0;
if (v > 0) { cleared++; stars += v; }
}
if ((sets[sk].bestStreak || 0) > best) best = sets[sk].bestStreak || 0;
}
return {
sets: sets,
stats: { stars: stars, cleared: cleared, streak: best,
weekEvents: (state.save.weekQ || []).slice(0, 12) },
profile: { nick: meNick(), avatar: meAvatarUrl(), src: state.me.src, auth: !!state.me.auth }
};
}
function pad2(n) { return (n < 10 ? '0' : '') + n; }
function dayKeyCN(t) {
var d = new Date((t || Date.now()) + 8 * 3600 * 1000);
return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate());
}
function weekKeyCN(t) {
var d = new Date((t || Date.now()) + 8 * 3600 * 1000);
var day = d.getUTCDay() || 7;
var thu = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 4 - day));
var y0 = Date.UTC(thu.getUTCFullYear(), 0, 1);
var wk = Math.ceil(((thu - y0) / 86400000 + 1) / 7);
return thu.getUTCFullYear() + '-W' + pad2(wk);
}
function lvUid(lv) { return (lv && (lv.uid || String(lv.id || ''))) || ''; }
function weekLedger() {
var s = state.save, wk = weekKeyCN();
if (s.weekWeek !== wk) { s.weekWeek = wk; s.weekSeen = {}; }
if (!s.weekSeen) s.weekSeen = {};
return s.weekSeen;
}
function weekStats() {
var seen = weekLedger(), sum = 0, uids = {}, n = 0, dk, u;
for (dk in seen) for (u in seen[dk]) {
sum += seen[dk][u] | 0;
if (!uids[u]) { uids[u] = 1; n++; }
}
return { stars: sum, cleared: n };
}
function recordWeekWin(lv, stars) {
if (!lv || !stars) return false;
var seen = weekLedger(), dk = dayKeyCN();
var day = seen[dk] || (seen[dk] = {});
var u = lvUid(lv);
if (!u) return false;
if ((day[u] | 0) >= stars) return false;
day[u] = stars;
var s = state.save;
if (!s.weekQ) s.weekQ = [];
s.weekQ.push({ uid: u, rev: (lv.rev | 0) || 1, stars: stars | 0, day: dk });
if (s.weekQ.length > 40) s.weekQ = s.weekQ.slice(-40);
return true;
}
function friendStats() {
var st = myStats(), wk = weekStats();
return { cleared: st.cleared, streak: st.streak, stars: st.stars, weekStars: wk.stars };
}
function myStats() {
var ks = saveKeys(), i, stars = 0, cleared = 0, best = 0, o;
for (i = 0; i < ks.length; i++) {
o = (ks[i] === SAVE_KEY) ? state.save : readSaveByKey(ks[i]);
if (!o) continue;
for (var lv in (o.starOf || {})) {
var v = o.starOf[lv] || 0;
if (v > 0) { cleared++; stars += v; }
}
if ((o.bestStreak || 0) > best) best = o.bestStreak || 0;
}
return { stars: stars, cleared: cleared, streak: best };
}
function publishFriend() {
if (!env.friend || !env.friend.publish) return;
try { env.friend.publish(friendStats()); } catch (e) { }
}
var pushTimer = null, pushing = false, pushAgain = false;
function cloudPush(immediate) {
if (!cloudOn() || !state.net.ready) return;
if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; }
if (immediate) { doCloudPush(); return; }
pushTimer = setTimeout(doCloudPush, C.CLOUD.pushDebounceMs || 3500);
}
function doCloudPush() {
if (!cloudOn() || !state.net.ready) return;
if (pushing) { pushAgain = true; return; }
pushing = true;
state.net.syncing = true;
var payload = collectCloud();
var sent = payload.stats.weekEvents || [];
CLOUD.save(payload, function (err, res) {
pushing = false;
state.net.syncing = false;
if (pushAgain) { pushAgain = false; cloudPush(true); }
if (err) { state.net.err = String((err && err.msg) || err); return; }
state.net.err = '';
state.net.ts = Date.now();
if (res && res.me) state.rankMe = res.me;
if (res && res.weekResetAt) state.rankMeta.nextResetAt = res.weekResetAt;
if (sent.length) {
var q = state.save.weekQ || [];
var keep = [];
for (var qi = 0; qi < q.length; qi++) if (sent.indexOf(q[qi]) < 0) keep.push(q[qi]);
if (keep.length !== q.length) { state.save.weekQ = keep; persist(); }
}
});
}
function cloudPull() {
if (!cloudOn()) return;
CLOUD.load(function (err, remote) {
state.net.ready = true;
if (err || !remote || !remote.sets) return;
var changed = false, k, bestMerged = null, bestTs = -1;
for (k in remote.sets) {
var l = readSaveByKey(k), m = mergeSave(l, remote.sets[k]);
if (!l || (m.updatedAt || 0) > (l.updatedAt || 0) ||
(m.unlockedMax || 0) > (l.unlockedMax || 0) ||
starsOfSave(m) > starsOfSave(l)) {
writeSaveByKey(k, m);
changed = true;
}
if ((m.updatedAt || 0) > bestTs) { bestTs = m.updatedAt || 0; bestMerged = m; }
}
if (bestMerged) writeWallet(bestMerged);
if (changed) {
state.save = loadSave();
initSkin();
applyAudio();
}
publishFriend();
cloudPush(true);
});
}
function rankCacheKey(tab) {
return tab === 2 ? ('2:' + (state.rankMeta.weekKey || 'na')) : String(tab);
}
function cloudRank(tab) {
if (!cloudOn()) { state.rankLoading = false; return; }
var seq = ++state.rankSeq, ck = rankCacheKey(tab);
state.rankLoading = true;
if (state.rankTab === tab) state.rankErr = '';
CLOUD.rank(tab, function (err, res) {
if (seq !== state.rankSeq) {
if (!err && res && !state.rankCache[ck]) state.rankCache[ck] = res;
return;
}
state.rankLoading = false;
if (err) {
if (state.rankTab === tab) {
state.rankErr = (err && err.msg) || '网络异常';
if (!state.rankCache[ck]) { state.rankList = null; state.rankListTab = tab; }
}
return;
}
var data = res || { list: [], me: null };
state.rankCache[ck] = data;
if (data.nextResetAt) state.rankMeta.nextResetAt = data.nextResetAt;
if (data.weekKey) state.rankMeta.weekKey = data.weekKey;
if (data.me && tab === 2) {
state.rankMeta.weekStars = data.me.v || 0;
state.rankMeta.weekCleared = data.me.v2 || 0;
}
state.dirty = true;
if (state.rankTab === tab) { state.rankList = data; state.rankListTab = tab; }
});
}
function selectRankTab(tab) {
state.rankTab = tab;
state.rankErr = '';
state.rankLoading = false;
state.rankPaintSig = '';
if (tab === 1) { state.rankListTab = 1; openFriendRank(); state.dirty = true; return; }
var ck = rankCacheKey(tab);
state.rankList = state.rankCache[ck] || null;
state.rankListTab = tab;
state.dirty = true;
cloudRank(tab);
}
function friendOn() {
return !!(env.friend && env.friend.available && env.friend.available());
}
function openFriendRank() {
if (!friendOn()) return;
var L = C.RANK.list;
var k = (view.scale || 1) * (view.dpr || 1);
if (!(k > 0)) k = 2;
k = Math.max(1, Math.min(3, k));
state.friendT = Date.now();
state.friendRankInfo = null;
var fs = friendStats();
try {
env.friend.show({
w: L.w, h: L.h, k: k,
pal: {
text: COL.text, sub: COL.textSub, rowBg: COL.surface,
rowText: COL.textOnSurface || COL.text,
rowSub: COL.textOnChip || COL.textSub,
me: COL.surfaceHi, meText: COL.accentText,
gold: COL.gold, line: COL.line
},
me: { nick: meNick(), avatar: meAvatarUrl(), cleared: fs.cleared,
stars: fs.stars, weekStars: fs.weekStars, streak: fs.streak }
});
} catch (e) { }
}
function applyFriendRankInfo(info) {
if (!info || state.rankTab !== 1) return;
state.friendRankInfo = info;
state.rankPaintSig = '';
state.dirty = true;
}
function netText() {
if (state.net.ready && (state.net.nick || state.me.nick)) {
return state.net.syncing ? '同步中…' : ('已同步 · ' + meNick());
}
if (!cloudOn()) return '未开启（纯本地）';
if (state.net.err) return '同步失败：' + state.net.err;
return state.net.ready ? '已登录' : '正在登录…';
}
function todayKey() {
var d = new Date();
return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}
function clampN(n, a, b) { return Math.max(a, Math.min(b, n)); }
function totalStars() {
var n = 0;
for (var k in state.save.starOf) n += state.save.starOf[k] || 0;
return n;
}
function syncEnergy(silent) {
var E = C.ECON, s = state.save;
if (!s) return;
var now = Date.now();
if ((s.energy || 0) < s.energyMax) {
var el = (now - (s.energyTs || now)) / 1000;
var n = Math.floor(el / E.energyRecoverSec);
if (n > 0) {
var gained = Math.min(n, s.energyMax - s.energy);
s.energy += gained;
s.energyTs = s.energyTs + gained * E.energyRecoverSec * 1000;
if (s.energy >= s.energyMax) s.energyTs = now;
persist();
if (!silent) toast('体力 +' + gained);
}
} else {
s.energyTs = now;
}
}
function toast(t) { state.toast = { text: t, t: 0 }; }
function addCoin(n, why) {
var s = state.save; if (!s) return;
s.coin = Math.max(0, (s.coin || 0) + n);
persist();
if (why && n) toast(why + (n > 0 ? ' +' : ' ') + n + ' 巧币');
}
function addEnergy(n, why, overflow) {
var s = state.save; if (!s) return;
var was = s.energy || 0;
s.energy = overflow ? (was + n) : Math.min(s.energyMax, was + n);
if (was >= s.energyMax) s.energyTs = Date.now();
persist();
var got = s.energy - was;
if (why) toast(got > 0 ? (why + ' +' + got + ' 体力') : '体力已满');
}
function spendEnergy() {
var E = C.ECON, s = state.save;
syncEnergy(true);
if ((s.energy || 0) < E.energyCostLevel) return false;
var wasFull = s.energy >= s.energyMax;
s.energy -= E.energyCostLevel;
if (wasFull) s.energyTs = Date.now();
persist();
return true;
}
function timeLimitOf(lv) {
var T = C.TIMER;
if (T.fixedSec > 0) return T.fixedSec;
if (lv && typeof lv.timeLimit === 'number' && lv.timeLimit > 0) {
return clampN(lv.timeLimit, T.minSec, T.maxSec);
}
var pt = (lv && lv.parTime) || 60;
return clampN(Math.round(pt * T.parFactor), T.minSec, T.maxSec);
}
function heartsOf(left, limit) {
if (left <= 0) return 0;
var r = left / (limit || 1);
return r > 2 / 3 ? 3 : (r > 1 / 3 ? 2 : 1);
}
function freeEnergyUsedToday() {
var s = state.save, d = todayKey();
if (s.freeEnergyDay !== d) { s.freeEnergyDay = d; s.freeEnergyUsed = 0; persist(); }
return s.freeEnergyUsed || 0;
}
function freeEnergyLeft() {
return Math.max(0, C.ECON.freeEnergyPerDay - freeEnergyUsedToday());
}
function grantFreeEnergy(byAd) {
var E = C.ECON, s = state.save;
if (freeEnergyLeft() <= 0) { toast('今日次数已用完'); return false; }
s.freeEnergyUsed = (s.freeEnergyUsed || 0) + 1;
var n = byAd ? E.freeEnergyShare * E.freeEnergyAdMul : E.freeEnergyShare;
addEnergy(n, byAd ? '看广告' : '分享获得', !!byAd);
return true;
}
function onlineRoll() {
var s = state.save; if (!s) return false;
var d = todayKey();
if (s.onlineDay === d) return false;
s.onlineDay = d;
s.onlineSec = 0;
s.onlineGot = {};
return true;
}
function onlineSync() {
var s = state.save; if (!s) return false;
var rolled = onlineRoll();
if (!state.onlineMark) return rolled;
var now = Date.now();
var el = (now - state.onlineMark) / 1000;
state.onlineMark = now;
if (el > 300) el = 300;
if (el > 0) s.onlineSec = Math.min(C.ONLINE.maxSec, (s.onlineSec || 0) + el);
return rolled;
}
function onlineSecNow() {
onlineSync();
return Math.max(0, Math.floor(state.save.onlineSec || 0));
}
function onlineClock(sec) {
sec = Math.max(0, Math.floor(sec));
var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), ss = sec % 60;
function p2(n) { return (n < 10 ? '0' : '') + n; }
return h > 0 ? (h + ':' + p2(m) + ':' + p2(ss)) : (p2(m) + ':' + p2(ss));
}
function onlineTierList() {
var sec = onlineSecNow(), got = state.save.onlineGot || {}, out = [];
var T = C.ONLINE.tiers;
for (var i = 0; i < T.length; i++) {
var t = T[i];
out.push({
id: t.id, at: t.at, label: t.label,
energy: t.energy || 0, coin: t.coin || 0, hint: t.hint || 0,
got: !!got[t.id],
ready: !got[t.id] && sec >= t.at,
left: Math.max(0, t.at - sec)
});
}
return out;
}
function onlineClaimCount() {
var arr = onlineTierList(), n = 0;
for (var i = 0; i < arr.length; i++) if (arr[i].ready) n++;
return n;
}
function onlineClaim(id) {
var arr = onlineTierList(), t = null;
for (var i = 0; i < arr.length; i++) if (arr[i].id === id) t = arr[i];
if (!t) return false;
if (t.got) { toast('这一档已经领过了'); return false; }
if (!t.ready) { toast('还差 ' + onlineClock(t.left) + ' 才能领'); return false; }
var s = state.save;
var got = s.onlineGot || (s.onlineGot = {});
got[id] = true;
var parts = [];
if (t.coin) { s.coin = (s.coin || 0) + t.coin; parts.push('+' + t.coin + ' 巧币'); }
if (t.energy) { s.energy = (s.energy || 0) + t.energy; parts.push('+' + t.energy + ' 体力'); }
if (t.hint) { s.hintItems = (s.hintItems || 0) + t.hint; parts.push('+' + t.hint + ' ' + C.HINT.itemName); }
persist();
env.audio.play('sfx_snap');
toast('在线奖励 ' + parts.join(' · '));
return true;
}
function canTakeHint() {
if (state.page !== 'play' || state.win) return false;
if (state.tut) { toast('教学关不用买提示，照着屏幕上的指令做就行'); return false; }
if (state.hint) {
var hst0 = null, lv0 = LEVELS[state.levelIdx];
for (var c0 = 0; c0 < lv0.solution.length; c0++) {
if (lv0.solution[c0].id === state.hint.id) hst0 = lv0.solution[c0];
}
if (hst0 && !slotCovered(hst0)) {
toast('这一步已经标出来了，先把它放上去');
return false;
}
}
if (!pickHintPiece()) { toast('这一关已经拼好啦'); return false; }
return true;
}
function useHintItem() {
var s = state.save;
if ((s.hintItems || 0) <= 0) { toast(C.HINT.itemName + '不足'); return; }
if (!canTakeHint()) return;
s.hintItems -= 1;
persist();
useHint();
}
function onlineTick(dt) {
var s = state.save; if (!s) return;
if (!state.onlineMark) { state.onlineMark = Date.now(); return; }
if (onlineRoll()) { state.onlineSaveT = 0; writeLocal(true); }
onlineSync();
state.onlineSaveT += dt;
if (state.onlineSaveT >= (C.ONLINE.persistSec || 15) * 1000) {
state.onlineSaveT = 0;
writeLocal(true);
}
}
var BASE_COL = {};
for (var _bk in C.COLORS) BASE_COL[_bk] = C.COLORS[_bk];
function refreshPalette() {
var k, sk;
for (k in BASE_COL) COL[k] = BASE_COL[k];
var key = state.save.skin || 'warm';
sk = C.SKINS[key];
if (!sk) { key = 'warm'; state.save.skin = key; sk = C.SKINS.warm; }
state.darkSkin = !!sk.dark;
if (state.darkSkin && C.DARK_PAL) { for (k in C.DARK_PAL) COL[k] = C.DARK_PAL[k]; }
for (k in sk) { if (k !== 'name' && k !== 'dark') COL[k] = sk[k]; }
var fx = C.BG_FX && C.BG_FX[state.save.bgFx || 'geometric'];
state.darkFx = !!(fx && fx.dark);
if (state.darkFx && C.DARK_PAL) {
for (k in C.DARK_PAL) COL[k] = C.DARK_PAL[k];
}
state.darkUi = !!(state.darkSkin || state.darkFx);
clearGrads();
clearTextW();
}
function applySkin(key) {
var sk = C.SKINS[key];
if (!sk) return;
state.save.skin = key;
refreshPalette();
saveVisual();
persist();
toast('皮肤：' + sk.name);
}
var QUALITY = [
{ shadow: 0, particles: 0.45, fps: 30 },
{ shadow: 0.55, particles: 0.7, fps: 0 },
{ shadow: 1, particles: 1, fps: 0 }
];
state.quality = { tier: 2, shadow: 1, particles: 1, fps: 0 };
function initQuality() {
var d = (env.device && env.device()) || {};
var t = d.tier;
if (typeof t !== 'number') {
var bl = d.benchmarkLevel;
t = (typeof bl === 'number' && bl > 0) ? (bl < 10 ? 0 : bl < 20 ? 1 : 2) : 2;
}
t = Math.max(0, Math.min(2, t | 0));
var q = QUALITY[t];
state.quality = { tier: t, shadow: q.shadow, particles: q.particles, fps: q.fps };
if (q.fps && env.setFps) { try { env.setFps(q.fps); } catch (e) {} }
}
function qShadow(v) { return v * (state.quality ? state.quality.shadow : 1); }
function qParticles(n) { return Math.max(1, Math.round(n * (state.quality ? state.quality.particles : 1))); }
var GRADS = {}, GRAD_N = 0;
function grad(key, build) {
var g = GRADS[key];
if (!g) {
if (GRAD_N > 300) { GRADS = {}; GRAD_N = 0; }
g = GRADS[key] = build();
GRAD_N++;
}
return g;
}
function clearGrads() { GRADS = {}; GRAD_N = 0; }
var TWM = {}, TWM_N = 0;
function meas(str) {
var s = String(str === undefined || str === null ? '' : str);
var k = (ctx.font || '') + '|' + s;
var v = TWM[k];
if (v === undefined) {
if (TWM_N > 400) { TWM = {}; TWM_N = 0; }
v = TWM[k] = ctx.measureText ? ctx.measureText(s).width : 0;
TWM_N++;
}
return v;
}
function clearTextW() { TWM = {}; TWM_N = 0; }
function gcHint() { try { if (env.gc) env.gc(); } catch (e) {} }
function trimMemory() {
clearGrads();
clearTextW();
state.fxParts = null;
state.dirty = true;
}
var STATIC_OVERLAY = { rank: 1, skin: 1, buy: 1, energy: 1, online: 1, invite: 1 };
function initSkin() {
refreshPalette();
state.fxParts = null;
if (env.audio && env.audio.setSfxStyle) env.audio.setSfxStyle(state.save.sfxStyle || 'wood');
}
function applyBgFx(key) {
if (!C.BG_FX || !C.BG_FX[key]) return;
state.save.bgFx = key;
state.fxParts = null;
refreshPalette();
saveVisual();
persist();
toast('背景：' + C.BG_FX[key].name);
}
function applyPieceStyle(key) {
if (!C.PIECE_STYLES || !C.PIECE_STYLES[key]) return;
state.save.pieceStyle = key;
saveVisual();
persist();
toast('板件：' + C.PIECE_STYLES[key].name);
}
function applySfxStyle(key) {
if (!C.SFX_STYLES || !C.SFX_STYLES[key]) return;
state.save.sfxStyle = key;
if (env.audio && env.audio.setSfxStyle) env.audio.setSfxStyle(key);
saveVisual();
persist();
env.audio.play('sfx_pick');
toast('音效：' + C.SFX_STYLES[key].name);
}
function pickSkinItem(kind, key) {
if (!itemLocked(kind, key)) {
if (kind === 'bgfx') applyBgFx(key); else applyPieceStyle(key);
return;
}
var m = C[SHOP_MAP[kind]], it = m && m[key];
if (!it) return;
env.audio.play('sfx_tap');
state.buyItem = { kind: kind, key: key, price: it.price || 0, name: it.name, desc: it.desc };
state.overlay = 'buy';
}
function buySkinItem() {
var it = state.buyItem, s = state.save;
if (!it) { state.overlay = 'skin'; return; }
if ((s.coin || 0) < it.price) { toast('巧币不足，还需 ' + (it.price - (s.coin || 0)) + ' 巧币'); return; }
s.coin -= it.price;
persist();
grantItem(it.kind, it.key);
if (it.kind === 'bgfx') applyBgFx(it.key); else applyPieceStyle(it.key);
state.buyItem = null;
state.overlay = 'skin';
env.audio.play('sfx_win');
toast('已解锁：' + it.name);
}
var AD_LV_KINDS = { hint: 1, revive: 1, coin5: 1 };
function adLvLimit() { return C.ECON.adPerLevel || 3; }
function adLvLeft() { return Math.max(0, adLvLimit() - (state.adLv || 0)); }
function adStart(kind) {
if (state.adSim || state.adWait) return;
if (AD_LV_KINDS[kind] && adLvLeft() <= 0) {
toast('本关看视频次数已用完（最多 ' + adLvLimit() + ' 次）');
return;
}
env.audio.play('sfx_tap');
if (adAvailable()) {
state.adWait = kind;
env.ad.rewarded(kind, function (ok, msg) {
state.adWait = null;
if (ok) adFinishKind(kind);
else toast(msg || '广告暂时不可用，试试用巧币复活');
});
return;
}
state.adSim = { kind: kind, t: 0 };
}
function adFinish() {
var kind = state.adSim && state.adSim.kind;
state.adSim = null;
adFinishKind(kind);
}
function adFinishKind(kind) {
if (AD_LV_KINDS[kind]) state.adLv = (state.adLv || 0) + 1;
if (kind === 'energy') grantFreeEnergy(true);
else if (kind === 'revive') doRevive(true);
else if (kind === 'invite') doInviteShare();
else if (kind === 'hint') useHint();
else if (kind === 'coin5') grantWinAdMul();
}
function adAvailable() {
return !!(env.ad && env.ad.rewarded);
}
function failLevel() {
if (state.overlay === 'fail') return;
var s = state.save;
state.running = false;
clearResume();
state.overlay = 'fail';
state.failT = 0;
state.selId = null;
state.streakBeforeFail = s.streak || 0;
state.seenBeforeFail = (s.streakSeen || []).slice();
if (state.streakBeforeFail > 0 || state.seenBeforeFail.length) {
s.streak = 0;
s.streakSeen = [];
persist();
cloudPush(true);
publishFriend();
}
if (env.audio.halt) env.audio.halt();
env.audio.play('sfx_timeup');
if (env.vibrate) { try { env.vibrate(24); } catch (e) {} }
}
function doRevive(byAd) {
var E = C.ECON, s = state.save;
if (byAd) {
} else {
if ((s.coin || 0) < E.coinRevive) { toast('巧币不足'); return; }
s.coin -= E.coinRevive;
}
state.reviveUsed++;
var hadBp = (state.streakBeforeFail > 0) || ((state.seenBeforeFail || []).length > 0);
if (hadBp) {
s.streak = state.streakBeforeFail || 0;
s.streakSeen = (state.seenBeforeFail || []).slice();
}
state.streakBeforeFail = 0;
state.seenBeforeFail = [];
state.timeLeft = Math.min(state.timeLimit, state.timeLeft + state.timeLimit / C.TIMER.hearts);
state.hearts = heartsOf(state.timeLeft, state.timeLimit);
persist();
if (hadBp) { cloudPush(true); publishFriend(); }
state.overlay = null;
state.running = true;
env.audio.play('sfx_snap');
toast(byAd ? '复活成功' : ('复活成功 -' + E.coinRevive + ' 巧币'));
setLevelScene();
}
function grantWinAdMul() {
var r = state.result;
if (!r || r.adUsed || !r.gain) { toast('本关没有可翻倍的奖励'); return; }
var mul = (C.ECON.coinWinAdMul || 5);
var extra = r.gain * (mul - 1);
state.save.coin = Math.max(0, (state.save.coin || 0) + extra);
r.adUsed = true;
r.extra = extra;
persist();
env.audio.play('sfx_snap');
toast('+' + r.gain + ' → +' + (r.gain * mul) + ' 巧币');
}
function giveUp() {
state.overlay = null;
state.running = false;
clearResume();
state.save.streak = 0;
state.save.streakSeen = [];
state.streakBeforeFail = 0;
state.seenBeforeFail = [];
persist();
cloudPush(true);
publishFriend();
go('levels');
}
function inviteConfirmed(ts) {
if (env.invite && typeof env.invite.confirmed === 'function') {
try { if (env.invite.confirmed(ts)) return true; } catch (e) { }
}
return (Date.now() - ts) >= (C.INVITE.verifySec || 60) * 1000;
}
function grantInviteTier(t) {
var s = state.save;
if (!t) return;
if (t.coin) s.coin = (s.coin || 0) + t.coin;
if (t.energy) addEnergy(t.energy, null, true);
if (t.hint) s.hintItems = (s.hintItems || 0) + t.hint;
if (t.pstyle) grantItem('pstyle', t.pstyle);
if (t.bgfx) grantItem('bgfx', t.bgfx);
}
function inviteGrant() {
var s = state.save, T = (C.INVITE && C.INVITE.tiers) || [], out = [];
if (!s) return out;
if (!Array.isArray(s.inviteGot)) s.inviteGot = [];
for (var i = 0; i < T.length; i++) {
var t = T[i];
if ((s.inviteCount || 0) < t.n) break;
if (s.inviteGot.indexOf(t.n) >= 0) continue;
grantInviteTier(t);
s.inviteGot.push(t.n);
out.push(t);
}
return out;
}
function inviteVerify() {
var s = state.save;
if (!s) return { added: 0, tiers: [] };
var keep = [], added = 0, pend = s.invitePend || [];
for (var i = 0; i < pend.length; i++) {
if (inviteConfirmed(pend[i])) added++;
else keep.push(pend[i]);
}
s.invitePend = keep;
if (added) s.inviteCount = (s.inviteCount || 0) + added;
var tiers = inviteGrant();
if (added || tiers.length) persist();
return { added: added, tiers: tiers };
}
function inviteHasNews() {
var s = state.save, pend = (s && s.invitePend) || [];
for (var i = 0; i < pend.length; i++) if (inviteConfirmed(pend[i])) return true;
return false;
}
function inviteNextTier() {
var s = state.save, T = (C.INVITE && C.INVITE.tiers) || [];
for (var i = 0; i < T.length; i++) if ((s.inviteCount || 0) < T[i].n) return T[i];
return null;
}
function setInviteScroll(v) {
var m = state.inviteScrollMax || 0;
state.inviteScroll = Math.max(0, Math.min(m, v));
state.dirty = true;
}
function setLvScroll(v) {
var m = state.lvScrollMax || 0;
state.lvScroll = Math.max(0, Math.min(m, v));
}
function doInviteShare() {
var s = state.save, V = C.INVITE, now = Date.now();
if (!s) return;
if (state.inviteCd && now < state.inviteCd) return;
state.inviteCd = now + (V.shareCdMs || 1200);
if (!Array.isArray(s.invitePend)) s.invitePend = [];
if (s.invitePend.length >= (V.maxPend || 12)) {
var r0 = inviteVerify();
state.inviteFlash = r0;
}
if (s.invitePend.length >= (V.maxPend || 12)) {
toast('待确认的邀请已满，等好友通关后再来');
return;
}
s.invitePend.push(now);
persist();
if (env.share) { try { env.share(); } catch (e) {} }
toast('邀请已发出 · 好友完成 ' + (V.needCleared || 4) + ' 关后计入');
}
function useSet(key) {
if (!SETS || !SETS[key] || key === state.setKey) return;
if (state.save) { onlineSync(); writeLocal(true); }
var b = buildSet(key);
DS = b.ds; LEVELS = b.levels; LOCAL = b.LOCAL; TRAY_BB = b.TRAY_BB;
SLOT_POS = b.SLOT_POS; CHAP_PER = b.chapPer; CHAP_NAMES = b.chapNames;
CHAP_TITLES = b.chapTitles; CHAP_LIST = b.chapters;
COMPLETE_TITLE = b.completeTitle; COMPLETE_SUB = b.completeSub;
SAVE_KEY = b.saveKey; SNAP_GRID = b.snapGrid;
state.setKey = key;
state.save = loadSave();
writeLocal(true);
state.settingsFx = state.save.settings.sfx !== false;
state.settingsBgm = state.save.settings.bgm !== false;
applyAudio();
state.levelIdx = 0; state.pieces = []; state.selId = null;
state.drag = null; state.win = null; state.result = null; state.overlay = null;
state.streakBeforeFail = 0;
state.seenBeforeFail = [];
state.flower = null;
state.winFx = null;
state.petalScene = null;
state.lastTap = null;
go('home');
}
function bgmSceneKey() {
var B = C.BGM || {}, arr = B.scenes || [];
if (!arr.length) return 'home';
var per = B.levelsPerTrack || 5;
return arr[Math.floor(state.levelIdx / per) % arr.length];
}
function setLevelScene() {
if (env.audio && env.audio.setScene) env.audio.setScene(bgmSceneKey());
}
function go(page) {
if (state.page === 'play' && page !== 'play') saveResume();
state.page = page;
state.fade = 0;
state.pageT = 0;
if (env.audio && env.audio.setScene) {
if (page === 'home' || page === 'levels') env.audio.setScene('home');
else if (page === 'play') env.audio.setScene(bgmSceneKey());
}
if (page !== 'play') { state.running = false; }
if (state.overlay !== 'settings') hideProfileButton();
if (page !== 'play') { state.win = null; state.flower = null; state.winFx = null; state.petalScene = null; }
if (page === 'levels') {
var um = Math.max(1, Math.min(state.save.unlockedMax || 1, LEVELS.length));
state.lvPage = chapterOf(um - 1);
state.lvScroll = 0;
}
}
function isTutLevel(idx) {
var T = C.TUTORIAL;
return !!(T && T.on && idx < (T.levels || 1));
}
function saveResume() {
var s = state.save, i = state.levelIdx;
if (state.page !== 'play') return;
if (!state.running || state.win || state.tut) return;
if (isTutLevel(i)) return;
if ((s.starOf[String(i + 1)] || 0) > 0) return;
if (!(state.timeLeft > 0)) return;
var pc = [], k;
for (k = 0; k < state.pieces.length; k++) {
var p = state.pieces[k];
if (p.onBoard) {
pc.push([p.id, Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10,
Math.round(p.angle), p.flipped ? 1 : 0]);
}
}
if (!pc.length && !state.steps) return;
s.resume = {
lv: i, tl: state.timeLimit, left: Math.round(state.timeLeft * 100) / 100,
el: Math.round(state.elapsed || 0), st: state.steps || 0,
rv: state.reviveUsed || 0, pc: pc, at: Date.now()
};
persist();
}
function clearResume() {
if (!state.save.resume) return;
state.save.resume = null;
persist();
}
function takeResume(idx) {
var r = state.save.resume;
if (!r || r.lv !== idx) return null;
if ((state.save.starOf[String(idx + 1)] || 0) > 0) return null;
if (isTutLevel(idx)) return null;
return r;
}
function openLevel(idx) {
var s = state.save;
var r = takeResume(idx);
var cleared = (s.starOf[String(idx + 1)] || 0) > 0;
if (!r && !cleared && !isTutLevel(idx) && !spendEnergy()) {
state.overlay = 'energy';
return false;
}
setupLevel(idx, r ? { resume: r } : null);
go('play');
if (r) toast('继续上次进度');
return true;
}
function setupLevel(idx, opts) {
opts = opts || {};
gcHint();
state.levelIdx = idx;
var lv = LEVELS[idx];
state.pieces = DS.pieceOrder.map(function (id, i) {
return {
id: id, slot: i,
x: 0, y: 0, angle: 0, flipped: false,
onBoard: false,
dAngle: 0, dFlipped: false,
rot: null, flip: null,
pulse: 0, ring: 0, breathe: 0,
grabT: 0,
z: 0,
fit: false
};
});
state.zSeq = 0;
state.selId = null;
state.drag = null;
if (!opts.keepTimer) { state.elapsed = 0; state.steps = 0; }
state.hintUsed = false;
state.hintLv = 0;
state.hintPaid = 0;
state.hintTier = LEVELS[idx].hintTier ||
((LEVELS[idx].splitLines && LEVELS[idx].splitLines.length) ? 2 : 1);
state.cov = 0; state.covFrom = 0; state.covTo = 0; state.covT = 1;
state.msg = ''; state.msgT = 0;
state.overlapT = 0; state.overlapPairs = [];
state.win = null; state.result = null; state.resT = 0; state.starShown = 0;
state.flower = null;
state.winFx = null;
state.petalScene = null;
state.lastTap = null;
state.hint = null;
state.judge = new J.Judge();
state.judge.setTarget(lv.outline, lv.holes);
state.running = true;
state.lastSnap = null;
state.lastEdge = null;
var tl = timeLimitOf(lv);
if (opts.resume) {
var r0 = opts.resume;
state.timeLimit = Math.min(r0.tl || tl, tl);
state.timeLeft = Math.max(0, Math.min(r0.left || 0, state.timeLimit));
state.hearts = heartsOf(state.timeLeft, state.timeLimit);
state.reviveUsed = r0.rv || 0;
state.elapsed = Math.max(0, r0.el || 0);
state.steps = Math.max(0, r0.st || 0);
if (r0.pc && r0.pc.length) {
for (var qi = 0; qi < r0.pc.length; qi++) {
var it = r0.pc[qi];
for (var pi = 0; pi < state.pieces.length; pi++) {
var pp = state.pieces[pi];
if (pp.id !== it[0]) continue;
pp.onBoard = true;
pp.x = it[1]; pp.y = it[2];
pp.angle = it[3]; pp.dAngle = it[3];
pp.flipped = !!it[4]; pp.dFlipped = !!it[4];
raisePiece(pp);
break;
}
}
}
} else if (opts.keepTimer) {
state.timeLimit = state.timeLimit || tl;
state.timeLeft = Math.max(0, state.timeLeft);
state.hearts = heartsOf(state.timeLeft, state.timeLimit || 1);
} else {
state.timeLimit = tl;
state.timeLeft = tl;
state.hearts = C.TIMER.hearts;
state.reviveUsed = 0;
state.adLv = 0;
}
state.tut = makeTutorial(idx, opts);
}
function makeTutorial(idx, opts) {
var T = C.TUTORIAL;
if (!T || !T.on) return null;
if (env.tutorial === false) return null;
if (idx >= (T.levels || 1)) return null;
return { t: 0, done: false };
}
function tutStep() {
var lv = LEVELS[state.levelIdx], i;
for (i = 0; i < lv.solution.length; i++) {
var st = lv.solution[i], p = pieceOf(st.id);
if (!p) continue;
if (!p.onBoard) {
return { kind: 'drag', id: st.id,
text: '把亮起来的这块拖进来，放到同色的虚影上' };
}
if (pieceSolved(p, st)) continue;
if (!!p.flipped !== !!st.flipped) {
return { kind: 'flip', id: st.id,
text: '这块要翻个面：双击它一下' };
}
if (Math.abs(p.x - st.x) > 1 || Math.abs(p.y - st.y) > 1) {
return { kind: 'drag', id: st.id,
text: '把它挪到虚影的位置上，靠近会自动吸住' };
}
return { kind: 'rot', id: st.id,
text: '拖住板上的小圆点转一转，让它和虚影对齐' };
}
return null;
}
function tutSkip() {
state.tut = null;
toast('已跳过教学');
}
function piecePoly(p) {
return G.toWorld(LOCAL[p.id], {
x: p.x, y: p.y,
angle: p.dAngle, flipped: p.dFlipped
});
}
function piecePolyDesign(p) {
return piecePoly(p).map(function (v) { return [w2d(v[0]), h2d(v[1])]; });
}
function trayTransform(p) {
var bb = TRAY_BB[p.id];
var sp = SLOT_POS[p.slot];
return {
cx: sp.x,
cy: sp.y,
s: 1,
lcx: bb.ccx !== undefined ? bb.ccx : bb.cx,
lcy: bb.ccy !== undefined ? bb.ccy : bb.cy
};
}
function trayPoly(p) {
var t = trayTransform(p);
return LOCAL[p.id].map(function (v) {
return [t.cx + (v[0] * WS - t.lcx) * t.s, t.cy + (v[1] * WS - t.lcy) * t.s];
});
}
function boardPieces() {
return state.pieces.filter(function (p) { return p.onBoard; });
}
function raisePiece(p) {
state.zSeq = (state.zSeq || 0) + 1;
p.z = state.zSeq;
}
function boardByZ() {
return boardPieces().sort(function (a, b) {
var za = a.z || 0, zb = b.z || 0;
if (za !== zb) return za - zb;
return DS.pieceOrder.indexOf(a.id) - DS.pieceOrder.indexOf(b.id);
});
}
function pieceIssue(p, tolOverride) {
var lv = LEVELS[state.levelIdx];
var tol = tolOverride > 0 ? tolOverride : (C.JUDGE.fitTol || 3);
var poly = piecePoly(p);
var mine = G.area(poly);
var lim = mine * (C.JUDGE.pairOverlapTol || 0.004);
var others = boardPieces();
for (var i = 0; i < others.length; i++) {
var o = others[i];
if (o === p) continue;
if (G.overlapArea(poly, piecePoly(o)) > lim) return 'overlap';
}
if (!G.pieceInside(poly, lv.outline, lv.holes, tol)) return 'outside';
return null;
}
function pieceFit(p, tolOverride) {
return !pieceIssue(p, tolOverride);
}
function judgeNow() {
var lv = LEVELS[state.levelIdx];
var list = boardPieces();
var arr = list.map(function (p) {
return [piecePoly(p), DS.pieceOrder.indexOf(p.id)];
});
var t0 = nowMs();
var r = state.judge.judge(arr);
state.judgeMs = nowMs() - t0;
var areas = arr.map(function (a) { return G.area(a[0]); });
var bad = [];
for (var i = 0; i < r.overlapPairs.length; i++) {
var k = r.overlapPairs[i].key.split('-');
var a = +k[0], b = +k[1];
var ov = r.overlapPairs[i].cells * J.CELL * J.CELL;
var lim = C.JUDGE.pairTol * Math.min(areas[arr.findIndex(function (x) { return x[1] === a; })],
areas[arr.findIndex(function (x) { return x[1] === b; })]);
if (ov > lim) bad.push(r.overlapPairs[i]);
}
var fits = list.map(function (p) { return pieceFit(p); });
return { coverage: r.coverage, overflow: r.overflow, overlaps: bad, fits: fits, list: list };
}
function runJudge(isDrop) {
var lv = LEVELS[state.levelIdx];
var r = judgeNow();
state.overlapPairs = r.overlaps;
var fitN = 0;
for (var fq = 0; fq < r.fits.length; fq++) if (r.fits[fq]) fitN++;
state.fitN = fitN;
var progTo = DS.pieceOrder.length ? fitN / DS.pieceOrder.length : 0;
state.covFrom = state.cov;
state.covTo = progTo;
state.covT = 0;
var dragId = state.drag ? state.drag.id : null;
for (var fi = 0; fi < r.list.length; fi++) {
if (r.list[fi].id === dragId) continue;
r.list[fi].fit = !!r.fits[fi];
r.list[fi].issue = r.fits[fi] ? null : pieceIssue(r.list[fi]);
}
if (r.overlaps.length) {
state.overlapT = 400;
flashMsg('有两块压在一起了');
env.audio.play('sfx_fail');
return;
}
var allPlaced = boardPieces().length === DS.pieceOrder.length;
var allFit = r.fits.length === DS.pieceOrder.length && r.fits.every(function (x) { return x; });
if (allPlaced && allFit) {
win();
return;
}
if (fitN === DS.pieceOrder.length - 1) flashMsg('还差一点点');
}
function flashMsg(t) { state.msg = t; state.msgT = 1500; }
function win() {
var lv = LEVELS[state.levelIdx];
state.running = false;
clearResume();
state.win = { t: 0 };
if (state.tut) state.tut = null;
state.flower = { t: 0 };
state.winFx = makeWinFx(lv);
state.petalScene = makePetalScene(lv);
env.audio.play('sfx_win');
var stars = 1;
if (state.elapsed <= lv.parTime * C.STAR.twoStarTimeFactor) stars = 2;
var t3 = C.STAR.threeStarTimeFactor == null ? 1 : C.STAR.threeStarTimeFactor;
if (state.elapsed <= lv.parTime * t3 && state.steps <= lv.parSteps) stars = 3;
var k = String(state.levelIdx + 1);
var s = state.save;
var SR = C.ECON.starReward;
var prevStars = s.starOf[k] || 0;
var bestStars = Math.max(prevStars, stars);
var firstClear = prevStars === 0;
var targetTotal = SR[bestStars - 1] || 0;
var paidTotal = prevStars > 0
? (typeof s.starPaid[k] === 'number' ? s.starPaid[k] : (SR[prevStars - 1] || 0))
: 0;
var gain = Math.max(0, targetTotal - paidTotal);
state.result = { stars: stars, time: state.elapsed, steps: state.steps,
prevStars: prevStars, bestStars: bestStars,
first: firstClear, up: bestStars > prevStars,
gain: gain, target: targetTotal, adUsed: false };
s.starOf[k] = bestStars;
recordWeekWin(lv, stars);
if (gain > 0) {
s.coin = Math.max(0, (s.coin || 0) + gain);
s.starPaid[k] = targetTotal;
}
if (!s.bestTime[k] || state.elapsed < s.bestTime[k]) s.bestTime[k] = +state.elapsed.toFixed(1);
if (state.levelIdx + 1 === s.unlockedMax && s.unlockedMax < LEVELS.length) s.unlockedMax = state.levelIdx + 2;
if (s.unlockedMax > LEVELS.length) s.unlockedMax = LEVELS.length;
var E2 = C.ECON;
state.streakGain = 0;
state.streakBeforeFail = 0;
state.seenBeforeFail = [];
if (!s.streakSeen) s.streakSeen = [];
if (s.streakSeen.indexOf(k) < 0) {
s.streak = (s.streak || 0) + 1;
s.streakSeen.push(k);
s.bestStreak = Math.max(s.bestStreak || 0, s.streak);
if (s.streak % C.STREAK.step === 0) {
s.coin += C.STREAK.coin;
state.streakGain = C.STREAK.coin;
}
}
persist();
cloudPush(true);
publishFriend();
var iv = (C.ADS && C.ADS.interstitial) || null;
if (iv && iv.unitId && env.ad && env.ad.interstitial) {
var clearedAll = 0, sk;
for (sk in state.save.starOf) if (state.save.starOf[sk] > 0) clearedAll++;
if (clearedAll > 0 && clearedAll % (iv.everyLevels || 3) === 0) env.ad.interstitial();
}
}
function nextLevel() {
if (state.levelIdx + 1 >= LEVELS.length) {
state.overlay = null;
go('levels');
return;
}
if (!openLevel(state.levelIdx + 1)) return;
state.overlay = null;
state.win = null; state.result = null; state.flower = null; state.winFx = null; state.petalScene = null;
state.adSim = null; state.adWait = null;
setLevelScene();
}
function flipSymmetric(id) {
var poly = LOCAL[id];
if (!poly) return false;
var used = [], i, j;
for (i = 0; i < poly.length; i++) {
var hit = -1;
for (j = 0; j < poly.length; j++) {
if (used[j]) continue;
if (Math.abs(poly[i][0] + poly[j][0]) < 1e-6 &&
Math.abs(poly[i][1] - poly[j][1]) < 1e-6) { hit = j; break; }
}
if (hit < 0) return false;
used[hit] = 1;
}
return true;
}
function snapToSolution(p) {
var lv = LEVELS[state.levelIdx];
if (!lv || !lv.solution) return false;
var sd = C.SNAP.solDist || 120, sa = C.SNAP.solAngle || 14;
for (var i = 0; i < lv.solution.length; i++) {
var s = lv.solution[i];
if (s.id !== p.id) continue;
var dx = s.x - p.x, dy = s.y - p.y;
if (dx * dx + dy * dy > sd * sd) return false;
var da = ((p.dAngle - s.angle) % 360 + 540) % 360 - 180;
if (Math.abs(da) > sa) return false;
if (!flipSymmetric(p.id) && (!!p.dFlipped !== !!s.flipped)) return false;
p.x = s.x; p.y = s.y;
p.dAngle = s.angle;
if (flipSymmetric(p.id)) p.dFlipped = !!s.flipped;
state.lastSnap = null;
state.lastEdge = null;
return true;
}
return false;
}
function snapPiece(p, live) {
var lv = LEVELS[state.levelIdx];
if (snapToSolution(p)) return true;
var targets = [];
var i;
for (i = 0; i < lv.outline.length; i++) targets.push(lv.outline[i]);
var others = boardPieces();
for (i = 0; i < others.length; i++) {
if (others[i] === p) continue;
var op = piecePoly(others[i]);
for (var j = 0; j < op.length; j++) targets.push(op[j]);
}
var mine = piecePoly(p);
var best = null;
for (i = 0; i < mine.length; i++) {
for (var k = 0; k < targets.length; k++) {
var dx = targets[k][0] - mine[i][0], dy = targets[k][1] - mine[i][1];
var d = Math.sqrt(dx * dx + dy * dy);
if (!best || d < best.d) best = { d: d, dx: dx, dy: dy, tx: targets[k][0], ty: targets[k][1], mi: i };
}
}
if (live && state.lastSnap && best) {
var lx = state.lastSnap.tx - mine[state.lastSnap.mi][0];
var ly = state.lastSnap.ty - mine[state.lastSnap.mi][1];
var ld = Math.sqrt(lx * lx + ly * ly);
if (ld <= C.SNAP.vertex && ld - best.d < C.SNAP.switchHyst) {
best = { d: ld, dx: lx, dy: ly, tx: state.lastSnap.tx, ty: state.lastSnap.ty, mi: state.lastSnap.mi };
}
}
if (best && best.d <= C.SNAP.vertex) {
p.x += best.dx; p.y += best.dy;
state.lastSnap = { tx: best.tx, ty: best.ty, mi: best.mi };
state.lastEdge = null;
return true;
}
state.lastSnap = null;
if (edgeSnap(p, mine, live)) return true;
var grid = SNAP_GRID || C.SNAP.grid;
var gx = Math.round(p.x / grid) * grid;
var gy = Math.round(p.y / grid) * grid;
if (Math.sqrt((gx - p.x) * (gx - p.x) + (gy - p.y) * (gy - p.y)) <= C.SNAP.gridMax) {
p.x = gx; p.y = gy;
}
return false;
}
function collectTargetEdges(p) {
var lv = LEVELS[state.levelIdx];
var edges = [];
var i, j;
for (i = 0; i < lv.outline.length; i++) {
edges.push([lv.outline[i], lv.outline[(i + 1) % lv.outline.length], 'o' + i]);
}
var others = boardPieces();
for (i = 0; i < others.length; i++) {
if (others[i] === p) continue;
var op = piecePoly(others[i]);
for (j = 0; j < op.length; j++) {
edges.push([op[j], op[(j + 1) % op.length], 'p' + i + '_' + j]);
}
}
return edges;
}
function scanEdge(mine, edges) {
var best = null;
for (var i = 0; i < mine.length; i++) {
var a = mine[i], b = mine[(i + 1) % mine.length];
var ex = b[0] - a[0], ey = b[1] - a[1];
var el = Math.hypot(ex, ey);
if (el < 1e-6) continue;
var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
for (var j = 0; j < edges.length; j++) {
var e = edges[j];
var dx = e[1][0] - e[0][0], dy = e[1][1] - e[0][1];
var L = Math.hypot(dx, dy);
if (L < 1e-6) continue;
var ang = Math.abs(Math.atan2(ex * dy - ey * dx, ex * dx + ey * dy)) * 180 / Math.PI;
if (ang > 90) ang = 180 - ang;
if (ang > C.SNAP.edgeAngle) continue;
var nx = -dy / L, ny = dx / L;
var s = (mx - e[0][0]) * nx + (my - e[0][1]) * ny;
var dist = Math.abs(s);
if (dist > C.SNAP.edge || dist < 1e-6) continue;
var proj = (mx - e[0][0]) * (dx / L) + (my - e[0][1]) * (dy / L);
var ov = Math.min(proj + el / 2, L) - Math.max(proj - el / 2, 0);
if (ov < C.SNAP.edgeMinOverlap * Math.min(el, L)) continue;
if (!best || dist < best.dist) {
best = { dist: dist, s: s, nx: nx, ny: ny, tkey: e[2], mi: i };
}
}
}
return best;
}
function edgeDistOf(tkey, mi, mine, edges) {
for (var j = 0; j < edges.length; j++) {
if (edges[j][2] !== tkey) continue;
var e = edges[j];
var a = mine[mi], b = mine[(mi + 1) % mine.length];
var ex = b[0] - a[0], ey = b[1] - a[1];
var dx = e[1][0] - e[0][0], dy = e[1][1] - e[0][1];
var L = Math.hypot(dx, dy);
if (L < 1e-6) return null;
var ang = Math.abs(Math.atan2(ex * dy - ey * dx, ex * dx + ey * dy)) * 180 / Math.PI;
if (ang > 90) ang = 180 - ang;
if (ang > C.SNAP.edgeAngle) return null;
var nx = -dy / L, ny = dx / L;
var s = ((a[0] + b[0]) / 2 - e[0][0]) * nx + ((a[1] + b[1]) / 2 - e[0][1]) * ny;
var dist = Math.abs(s);
if (dist > C.SNAP.edge || dist < 1e-6) return null;
return { dist: dist, s: s, nx: nx, ny: ny, tkey: tkey, mi: mi };
}
return null;
}
function edgeSnap(p, mine, live) {
var edges = collectTargetEdges(p);
var best = scanEdge(mine, edges);
if (live && state.lastEdge && best) {
if (state.lastEdge.tkey !== best.tkey || state.lastEdge.mi !== best.mi) {
var prev = edgeDistOf(state.lastEdge.tkey, state.lastEdge.mi, mine, edges);
if (prev && best.dist - prev.dist < C.SNAP.switchHyst) best = prev;
}
}
if (best) {
p.x += -best.s * best.nx;
p.y += -best.s * best.ny;
state.lastEdge = { tkey: best.tkey, mi: best.mi };
return true;
}
state.lastEdge = null;
return false;
}
function clampToBoard(p) {
var pad = 30;
if (p.x < pad) p.x = pad;
if (p.x > 1000 - pad) p.x = 1000 - pad;
if (p.y < pad) p.y = pad;
if (p.y > 1000 - pad) p.y = 1000 - pad;
}
function hitTest(x, y, kind) {
for (var i = hits.length - 1; i >= 0; i--) {
var h = hits[i];
if (kind && h.kind !== kind) continue;
if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h;
}
return null;
}
function addHit(cx, cy, w, h, id, kind) {
var hw = Math.max(w, LAY.MIN_HIT), hh = Math.max(h, LAY.MIN_HIT);
hits.push({ x: cx - hw / 2, y: cy - hh / 2, w: hw, h: hh, id: id, kind: kind || 'btn' });
}
function onDown(x, y) {
env.audio.unlock();
state.activePointer = true;
if (state.overlay) { handleOverlayDown(x, y); return; }
if (state.page === 'home' || state.page === 'levels') { handlePageDown(x, y); return; }
if (state.page === 'play') handlePlayDown(x, y);
}
function onMove(x, y) {
if (!state.activePointer) return;
if (state.scrollDrag) {
var sdy = y - state.scrollDrag.y0;
if (!state.scrollDrag.moved && Math.abs(sdy) > 10) {
state.scrollDrag.moved = true;
state.press = null;
}
if (state.scrollDrag.moved) {
if (state.scrollDrag.kind === 'levels') setLvScroll(state.scrollDrag.s0 - sdy);
else setInviteScroll(state.scrollDrag.s0 - sdy);
}
return;
}
if (state.drag) {
var p = pieceOf(state.drag.id);
if (!p) return;
if (state.drag.mode === 'rotate') {
var rwx = d2w(x), rwy = d2wy(y);
var a = Math.atan2(rwy - p.y, rwx - p.x);
var d = a - state.drag.lastA;
while (d > Math.PI) d -= 2 * Math.PI;
while (d < -Math.PI) d += 2 * Math.PI;
state.drag.acc += d * 180 / Math.PI;
state.drag.lastA = a;
var q = Math.round(state.drag.acc / C.GESTURE.ringStep) * C.GESTURE.ringStep;
p.dAngle = state.drag.baseAngle + q;
p.ring = 0; p.breathe = 0;
return;
}
var wx = d2w(x) - state.drag.offX;
var wy = d2wy(y) - state.drag.offY;
p.x = wx; p.y = wy;
if (!p.onBoard) { p.onBoard = true; raisePiece(p); }
state.drag.moved = true;
clampToBoard(p);
var bx0 = p.x, by0 = p.y;
var hit = snapPiece(p, true);
var sdx = p.x - bx0, sdy = p.y - by0;
var sd = Math.sqrt(sdx * sdx + sdy * sdy);
if (sd > 0.01) {
var kk = Math.pow(Math.max(0, 1 - sd / 150), 3);
p.x = bx0 + sdx * kk;
p.y = by0 + sdy * kk;
}
p.ring = hit ? 1 : 0;
p.breathe = hit ? (p.breathe || 0.001) : 0;
var iss = pieceIssue(p);
p.issue = iss;
p.fit = !iss;
p.shake = iss === 'overlap' ? 240 : 0;
}
}
function onUp(x, y) {
if (!state.activePointer) return;
state.activePointer = false;
var scr0 = state.scrollDrag;
state.scrollDrag = null;
if (scr0 && scr0.moved) state.press = null;
var btn = state.press;
state.press = null;
if (btn) {
var h = hitTest(x, y);
if (h && h.id === btn) fireBtn(btn);
state.lastTap = null;
}
if (state.drag && state.drag.mode === 'rotate') {
state.lastTap = null;
var rp = pieceOf(state.drag.id);
var fh = !!state.drag.fromHandle;
var tapMove = fh ? Math.hypot(x - state.drag.startX, y - state.drag.startY) : 1e9;
if (fh && tapMove < C.GESTURE.handleTapMove) {
if (rp) {
var hb = rp.rot ? rp.rot.to : rp.dAngle;
var hto = hb + 45;
var hdev = hto - rp.dAngle;
if (Math.abs(hdev) > 90) { rp.dAngle = hto - (hdev > 0 ? 90 : -90); hdev = hto - rp.dAngle; }
var hdur = Math.min(C.ANIM.rotate, Math.max(60, Math.abs(hdev) / 45 * C.ANIM.rotate));
rp.rot = { from: rp.dAngle, to: hto, t: 0, dur: hdur };
rp.angle = ((rp.angle + 45) % 360 + 360) % 360;
state.steps++;
}
state.drag = null;
return;
}
var to = state.drag.baseAngle + Math.round(state.drag.acc / C.GESTURE.ringSnap) * C.GESTURE.ringSnap;
state.drag = null;
if (rp) {
rp.angle = ((to % 360) + 360) % 360;
if (Math.abs(rp.dAngle - to) > 0.01) {
rp.rot = { from: rp.dAngle, to: to, t: 0, dur: C.ANIM.rotate };
} else {
rp.dAngle = to;
}
state.steps++;
if (rp.onBoard) {
state.lastSnap = null;
var rsnap = snapPiece(rp, false);
if (rsnap) {
rp.pulse = 1; rp.ring = 1;
env.audio.play('sfx_snap');
env.vibrate(C.SNAP.vibrateMs);
}
runJudge(true);
}
}
return;
}
if (state.drag) {
var p = pieceOf(state.drag.id);
var moved = state.drag.moved;
var fromTray = state.drag.fromTray;
var downX = state.drag.downX, downY = state.drag.downY;
state.drag = null;
if (p) {
p.breathe = 0;
if (!moved) {
if (fromTray) p.onBoard = false;
state.selId = p.id;
var tapDist = (downX == null) ? 0 : Math.hypot(x - downX, y - downY);
var cleanTap = !fromTray && p.onBoard && tapDist < C.GESTURE.doubleTapMove;
var tapNow = nowMs();
if (cleanTap && state.lastTap && state.lastTap.id === p.id &&
(tapNow - state.lastTap.t) < C.GESTURE.doubleTapMs) {
if (!p.flip) {
p.flip = { t: 0 };
state.steps++;
env.audio.play('sfx_tap');
}
state.lastTap = null;
} else {
state.lastTap = cleanTap ? { id: p.id, t: tapNow } : null;
}
} else {
state.lastTap = null;
clampToBoard(p);
var preX = p.x, preY = p.y;
var snapped = snapPiece(p, false);
state.steps++;
if (Math.hypot(p.x - preX, p.y - preY) > 3) {
p.drawOff = { x: (preX - p.x) * WS, y: (preY - p.y) * WS, t: 0, dur: 90 };
}
if (snapped) {
p.pulse = 1; p.ring = 1;
env.audio.play('sfx_snap');
env.vibrate(C.SNAP.vibrateMs);
}
runJudge(true);
}
}
}
}
function pieceOf(id) {
for (var i = 0; i < state.pieces.length; i++) if (state.pieces[i].id === id) return state.pieces[i];
return null;
}
function fireBtn(id) {
env.audio.play('sfx_tap');
var lv = LEVELS[state.levelIdx];
switch (id) {
case 'back_home': go('home'); break;
case 'back_levels': go('levels'); break;
case 'start': {
var idx = Math.min((state.save.unlockedMax || 1) - 1, LEVELS.length - 1);
if (idx < 0) idx = 0;
openLevel(idx); break;
}
case 'to_levels': go('levels'); break;
case 'set_t4':
case 'set_t7': {
var nk = id === 'set_t4' ? 'tangram4' : 'tangram7';
if (nk !== state.setKey) useSet(nk);
go('levels');
break;
}
case 'settings': state.overlay = 'settings'; break;
case 'close_settings': state.overlay = null; hideProfileButton(); break;
case 'profile_auth': requestProfile(); break;
case 'profile_rename': renameProfile(); break;
case 'toggle_sfx':
state.settingsFx = !state.settingsFx;
state.save.settings.sfx = state.settingsFx; persist(); applyAudio(); break;
case 'toggle_bgm':
state.settingsBgm = !state.settingsBgm;
state.save.settings.bgm = state.settingsBgm; persist(); applyAudio(); break;
case 'close_settings': state.overlay = null; hideProfileButton(); break;
case 'rot_ccw':
case 'rot_cw': {
var p = pieceOf(state.selId);
if (!p) break;
var delta = id === 'rot_cw' ? 45 : -45;
var base = p.rot ? p.rot.to : p.dAngle;
var to = base + delta;
var dev = to - p.dAngle;
if (Math.abs(dev) > 90) { p.dAngle = to - (dev > 0 ? 90 : -90); dev = to - p.dAngle; }
var dur = Math.min(C.ANIM.rotate, Math.max(60, Math.abs(dev) / 45 * C.ANIM.rotate));
p.rot = { from: p.dAngle, to: to, t: 0, dur: dur };
p.angle = ((p.angle + delta) % 360 + 360) % 360;
state.steps++;
break;
}
case 'flip': {
var q = pieceOf(state.selId);
if (!q || q.flip) break;
q.flip = { t: 0 };
state.steps++;
break;
}
case 'hint': {
if (state.tut) { toast('教学关不用买提示，照着屏幕上的指令做就行'); break; }
if ((state.save.hintItems || 0) > 0) { useHintItem(); break; }
state.overlay = 'hint';
env.audio.play('sfx_tap');
break;
}
case 'hint_ad': adStart('hint'); break;
case 'hint_coin': useHintCoin(); break;
case 'hint_item': useHintItem(); break;
case 'restart':
setupLevel(state.levelIdx, { keepTimer: true });
saveResume();
toast('已重排，倒计时继续');
break;
case 'tut_skip': tutSkip(); break;
case 'next': nextLevel(); break;
case 'win_ad5': adStart('coin5'); break;
case 'replay': setupLevel(state.levelIdx); state.overlay = null;
setLevelScene();
break;
case 'to_list': state.overlay = null; gcHint(); go('levels'); break;
case 'to_home_from_result': state.overlay = null; gcHint(); go('home'); break;
case 'hud_energy': state.overlay = 'energy'; break;
case 'entry_skin': state.overlay = 'skin'; break;
case 'entry_invite':
state.inviteScroll = 0;
state.inviteFlash = inviteVerify();
if (state.inviteFlash.added) {
toast('新增 ' + state.inviteFlash.added + ' 位好友完成 ' + C.INVITE.needCleared + ' 关');
} else if (state.inviteFlash.tiers.length) {
toast('邀请奖励到账 ' + state.inviteFlash.tiers.length + ' 档');
}
state.overlay = 'invite';
break;
case 'entry_rank': openRank(null); break;
case 'share_pattern': sharePattern(); break;
case 'open_rank': openRank('result'); break;
case 'rank_t0': selectRankTab(0); break;
case 'rank_t1': selectRankTab(1); break;
case 'rank_t2': selectRankTab(2); break;
case 'rank_retry': cloudRank(state.rankTab); break;
case 'close_rank':
state.overlay = state.rankBack || null;
break;
case 'online_claim': state.overlay = 'online'; break;
case 'free_share': grantFreeEnergy(false); break;
case 'free_ad': adStart('energy'); break;
case 'ad_revive': adStart('revive'); break;
case 'coin_revive': doRevive(false); break;
case 'give_up': giveUp(); break;
case 'skin_warm': applySkin('warm'); break;
case 'skin_mint': applySkin('mint'); break;
case 'skin_night': applySkin('night'); break;
case 'skin_dusk': applySkin('dusk'); break;
case 'buy_confirm': buySkinItem(); break;
case 'buy_cancel': state.buyItem = null; state.overlay = 'skin'; break;
case 'invite_share': doInviteShare(); break;
case 'close_sheet':
case 'close_energy':
case 'close_hint':
case 'close_fail':
if (!state.adSim) state.overlay = null;
break;
case 'lvl': break;
default:
if (id.indexOf('invite_claim') === 0) {
var rCl = inviteVerify();
if (rCl.tiers.length) toast('邀请奖励到账 ' + rCl.tiers.length + ' 档');
break;
}
if (id.indexOf('skin_tab_') === 0) { state.skinTab = +id.slice(9) || 0; break; }
if (id.indexOf('bgfx_') === 0) { pickSkinItem('bgfx', id.slice(5)); break; }
if (id.indexOf('pstyle_') === 0) { pickSkinItem('pstyle', id.slice(7)); break; }
if (id.indexOf('sfx_') === 0) { applySfxStyle(id.slice(4)); break; }
if (id.indexOf('online_o') === 0) { onlineClaim(id.slice(7)); break; }
if (id.indexOf('lvpage_') === 0) {
state.lvPage = +id.slice(7);
state.lvScroll = 0;
state.pageT = 0;
break;
}
if (id.indexOf('lvl_') === 0) {
var n = +id.slice(4);
if (n <= state.save.unlockedMax) openLevel(n - 1);
}
}
}
function useHint() {
if (state.page !== 'play' || state.win) return false;
var pid = pickHintPiece();
if (!pid) { toast('这一关已经拼好啦'); return false; }
state.hintLv++;
state.hintPaid++;
if (!state.hintUsed) {
state.hintUsed = true;
state.save.hintUsed[String(state.levelIdx + 1)] = true;
persist();
}
state.hint = { id: pid, t: 0 };
state.overlay = null;
env.audio.play('sfx_snap');
toast('已标出下一步：圈起来的那块，放到虚线处');
return true;
}
function useHintCoin() {
var H = C.HINT, s = state.save;
if ((s.coin || 0) < H.coinCost) { toast('巧币不足，看视频也能拿提示'); return; }
if (!canTakeHint()) return;
s.coin -= H.coinCost;
persist();
useHint();
}
function pieceSolved(p, st) {
return !!p && p.onBoard &&
Math.abs(p.x - st.x) <= 1 && Math.abs(p.y - st.y) <= 1 &&
Math.abs(((p.angle - st.angle) % 360 + 540) % 360 - 180) <= 1 &&
!!p.flipped === !!st.flipped;
}
function slotCovered(st) {
var slotPoly = G.toWorld(LOCAL[st.id], st);
var a = Math.abs(G.area(slotPoly));
if (!(a > 0)) return false;
for (var i = 0; i < state.pieces.length; i++) {
var q = state.pieces[i];
if (!q || !q.onBoard) continue;
if (G.overlapArea(piecePoly(q), slotPoly) > a * 0.98) return true;
}
return false;
}
function pickHintPiece() {
var lv = LEVELS[state.levelIdx], i, st, p, covered = [];
for (i = 0; i < lv.solution.length; i++) covered[i] = slotCovered(lv.solution[i]);
for (i = 0; i < lv.solution.length; i++) {
if (covered[i]) continue;
st = lv.solution[i]; p = pieceOf(st.id);
if (!p || !p.onBoard) return st.id;
}
for (i = 0; i < lv.solution.length; i++) {
if (covered[i]) continue;
st = lv.solution[i]; p = pieceOf(st.id);
if (!p || !pieceFit(p)) return st.id;
}
for (i = 0; i < lv.solution.length; i++) {
if (covered[i]) continue;
return lv.solution[i].id;
}
return null;
}
function handleOverlayDown(x, y) {
var h = hitTest(x, y);
if (h && h.id) { state.press = h.id; }
else if (state.overlay === 'settings') { }
if (state.overlay === 'invite') {
var L0 = state.inviteList;
if (L0 && x >= L0.x && x <= L0.x + L0.w && y >= L0.y && y <= L0.y + L0.h) {
state.scrollDrag = { y0: y, s0: state.inviteScroll || 0, moved: false };
}
}
}
function handlePageDown(x, y) {
var h = hitTest(x, y);
if (h && h.id) state.press = h.id;
if (state.page === 'levels') {
var V = state.lvView;
if (V && x >= V.x && x <= V.x + V.w && y >= V.y && y <= V.y + V.h) {
state.scrollDrag = { kind: 'levels', y0: y, s0: state.lvScroll || 0, moved: false };
}
}
}
function pieceRadii(p) {
var poly = piecePoly(p);
var inr = Infinity, circ = 0;
for (var i = 0; i < poly.length; i++) {
var a = poly[i], b = poly[(i + 1) % poly.length];
var d = G.distPtSeg([p.x, p.y], a, b);
if (d < inr) inr = d;
var dv = Math.hypot(a[0] - p.x, a[1] - p.y);
if (dv > circ) circ = dv;
}
return { inr: inr, circ: circ };
}
function handleLocal(p) {
var L = LOCAL[p.id], v = L[0], bd = -1, i, d;
for (i = 0; i < L.length; i++) {
d = L[i][0] * L[i][0] + L[i][1] * L[i][1];
if (d > bd) { bd = d; v = L[i]; }
}
var len = Math.sqrt(bd) || 1;
var out = C.GESTURE.handleOut / WS;
return [v[0] + v[0] / len * out, v[1] + v[1] / len * out];
}
function handleWorld(p) {
return G.toWorld([handleLocal(p)], {
x: p.x, y: p.y, angle: p.dAngle, flipped: p.dFlipped
})[0];
}
function handleDesign(p) {
var w = handleWorld(p);
return [w2d(w[0]), h2d(w[1])];
}
function handlePlayDown(x, y) {
var h = hitTest(x, y);
if (h && h.kind === 'btn') { state.press = h.id; return; }
if (state.win) return;
var wx = d2w(x), wy = d2wy(y);
if (state.selId) {
var hp = pieceOf(state.selId);
if (hp && hp.onBoard) {
var hd = handleDesign(hp);
if (Math.hypot(x - hd[0], y - hd[1]) <= C.GESTURE.handleRadius) {
hp.grabT = 1; hp.rot = null; state.selId = hp.id;
state.drag = { id: hp.id, mode: 'rotate', fromHandle: true,
baseAngle: hp.angle, acc: 0,
lastA: Math.atan2(wy - hp.y, wx - hp.x),
startX: x, startY: y };
state.lastTap = null;
env.audio.play('sfx_pick');
return;
}
}
}
var best = null, bestBoard = null;
for (var i = 0; i < state.pieces.length; i++) {
var p = state.pieces[i];
var poly = p.onBoard ? piecePolyDesign(p) : trayPoly(p);
if (!G.pointInPoly([x, y], poly)) continue;
var sp0 = p.onBoard ? null : SLOT_POS[p.slot];
var cx0 = p.onBoard ? w2d(p.x) : sp0.x;
var cy0 = p.onBoard ? h2d(p.y) : sp0.y;
var hit0 = { p: p, d: 0, sp: sp0, cx: cx0, cy: cy0 };
if (p.onBoard) {
if (!bestBoard || (p.z || 0) >= (bestBoard.p.z || 0)) bestBoard = hit0;
} else {
best = hit0;
}
}
if (bestBoard) best = bestBoard;
if (!best) {
for (var i2 = 0; i2 < state.pieces.length; i2++) {
var p2 = state.pieces[i2];
if (p2.onBoard) continue;
var sp2 = SLOT_POS[p2.slot];
var d2 = Math.hypot(x - sp2.x, y - sp2.y);
if (d2 <= C.LAYOUT.MIN_HIT / 2 && (!best || d2 < best.d)) {
best = { p: p2, d: d2, sp: sp2, cx: sp2.x, cy: sp2.y };
}
}
}
if (!best) { state.selId = null; return; }
var pc = best.p;
state.selId = pc.id;
pc.grabT = 1;
pc.rot = null;
raisePiece(pc);
if (!pc.onBoard) {
pc.onBoard = true;
pc.x = wx - (x - best.cx) / WS;
pc.y = wy - (y - best.cy) / WS;
clampToBoard(pc);
state.drag = { id: pc.id, offX: (x - best.cx) / WS, offY: (y - best.cy) / WS, moved: false, fromTray: true, mode: 'drag', downX: x, downY: y };
} else {
var rr = pieceRadii(pc);
var dC = Math.hypot(wx - pc.x, wy - pc.y);
var ringInner = Math.max(rr.inr, rr.circ * 0.55);
if (dC > ringInner) {
state.drag = { id: pc.id, mode: 'rotate', baseAngle: pc.angle, acc: 0,
lastA: Math.atan2(wy - pc.y, wx - pc.x) };
} else {
state.drag = { id: pc.id, offX: wx - pc.x, offY: wy - pc.y, moved: false, fromTray: false, mode: 'drag', downX: x, downY: y };
}
}
env.audio.play('sfx_pick');
}
function applyAudio() {
env.audio.setEnabled(state.settingsFx, state.settingsBgm);
}
function nowMs() { return Date.now(); }
function update(dt) {
state.time += dt;
state.dt = dt;
if (state.overlay === 'fail') state.failT = (state.failT || 0) + dt;
onlineTick(dt);
if (state.page === 'play' && state.running && !state.overlay && !state.win) {
state.elapsed += dt / 1000;
var tutFreeze = !!(state.tut && C.TUTORIAL.freezeTimer);
if (state.timeLeft > 0 && !tutFreeze) {
state.timeLeft = Math.max(0, state.timeLeft - dt / 1000);
state.hearts = heartsOf(state.timeLeft, state.timeLimit || 1);
if (state.timeLeft <= 0) failLevel();
}
if (state.tut) {
state.tut.t += dt;
var tstep = tutStep();
if (tstep && tstep.kind === 'rot' && state.selId !== tstep.id && !state.drag) {
state.selId = tstep.id;
}
var tutReady = state.pieces && state.pieces.length === DS.pieceOrder.length;
if (!tstep && tutReady) {
state.tut = null;
toast('教学完成，剩下的自己来');
}
}
}
if (state.toast) { state.toast.t += dt; if (state.toast.t > 1600) state.toast = null; }
if (state.adSim) {
state.adSim.t += dt;
if (state.adSim.t >= C.ECON.adSimMs) adFinish();
}
if (state.fade < 1) state.fade = Math.min(1, state.fade + dt / C.ANIM.pageFade);
state.pageT += dt;
var wantDuck = state.overlay === 'result';
if (wantDuck !== state.bgmDuck) {
state.bgmDuck = wantDuck;
if (env.audio.duck) env.audio.duck(wantDuck);
}
if (state.msgT > 0) state.msgT -= dt;
if (state.overlapT > 0) state.overlapT -= dt;
if (state.covT < 1) {
state.covT = Math.min(1, state.covT + dt / C.ANIM.progressTween);
var e = G.easeOutCubic(state.covT);
state.cov = state.covFrom + (state.covTo - state.covFrom) * e;
}
for (var i = 0; i < state.pieces.length; i++) {
var p = state.pieces[i];
if (p.rot) {
p.rot.t = Math.min(1, p.rot.t + dt / (p.rot.dur || C.ANIM.rotate));
var e2 = G.easeOutQuint(p.rot.t);
p.dAngle = p.rot.from + (p.rot.to - p.rot.from) * e2;
if (p.rot.t >= 1) { p.dAngle = p.rot.to; p.rot = null; }
}
if (p.flip) {
p.flip.t = Math.min(1, p.flip.t + dt / C.ANIM.flip);
if (p.flip.t >= 0.5 && p.flipped === p.dFlipped) p.dFlipped = !p.dFlipped;
if (p.flip.t >= 1) { p.flipped = p.dFlipped; p.flip = null; }
}
if (p.pulse > 0) p.pulse = Math.max(0, p.pulse - dt / C.SNAP.pulseMs);
if (p.ring > 0) p.ring = Math.max(0, p.ring - dt / C.SNAP.ringMs);
if (p.grabT > 0) p.grabT = Math.max(0, p.grabT - dt / C.ANIM.grab);
if (p.breathe > 0) p.breathe = (p.breathe + dt / C.SNAP.breatheMs) % 1;
if (p.shake > 0) p.shake = Math.max(0, p.shake - dt);
if (p.drawOff) {
p.drawOff.t += dt;
if (p.drawOff.t >= p.drawOff.dur) p.drawOff = null;
}
}
if (state.flower) {
state.flower.t += dt;
if (state.flower.t > C.WIN_FX.petalTotal) state.flower = null;
}
if (state.winFx) {
state.winFx.t += dt;
if (state.winFx.t > C.WIN_FX.life) state.winFx = null;
}
if (state.win) {
state.win.t += dt;
if (state.win.t > C.ANIM.winShrink + C.ANIM.winDelay && !state.overlay) {
state.overlay = 'result';
state.resT = 0;
state.starShown = 0;
}
}
if (state.overlay === 'result') {
state.resT += dt;
var n = Math.min(3, Math.floor(state.resT / C.ANIM.starStep));
state.starShown = state.result ? Math.min(state.result.stars, n) : 0;
}
if (state.overlay === 'rank') {
state.rankT += dt;
if (Date.now() - state.rankTickAt > 60000) {
state.rankTickAt = Date.now();
state.dirty = true;
if (state.rankTab === 2 && state.rankMeta.nextResetAt &&
Date.now() > state.rankMeta.nextResetAt) cloudRank(2);
}
}
if (state.hint) {
var hsH = null, lvH = LEVELS[state.levelIdx];
for (var qh = 0; qh < lvH.solution.length; qh++) {
if (lvH.solution[qh].id === state.hint.id) hsH = lvH.solution[qh];
}
if (!hsH) state.hint = null;
else if (slotCovered(hsH)) state.hint = null;
}
if (state.press) state.pressT += dt;
}
function rr(x, y, w, h, r) {
r = Math.min(r, w / 2, h / 2);
ctx.beginPath();
ctx.moveTo(x + r, y);
ctx.lineTo(x + w - r, y);
ctx.arcTo(x + w, y, x + w, y + r, r);
ctx.lineTo(x + w, y + h - r);
ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
ctx.lineTo(x + r, y + h);
ctx.arcTo(x, y + h, x, y + h - r, r);
ctx.lineTo(x, y + r);
ctx.arcTo(x, y, x + r, y, r);
ctx.closePath();
}
function shadow(blur, dy, color) {
ctx.shadowBlur = qShadow(blur); ctx.shadowColor = color; ctx.shadowOffsetY = dy;
}
function noShadow() { ctx.shadowBlur = qShadow(0); ctx.shadowColor = 'transparent'; ctx.shadowOffsetY = 0; }
function rgbOf(c) {
if (!c) return null;
c = String(c).trim();
var m;
if (c.charAt(0) === '#') {
var h = c.slice(1);
if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
if (h.length !== 6) return null;
return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 1 };
}
m = c.match(/^rgba?\(([^)]+)\)$/i);
if (!m) return null;
var p = m[1].split(',');
if (p.length < 3) return null;
return { r: +p[0], g: +p[1], b: +p[2], a: p.length > 3 ? +p[3] : 1 };
}
function overRgb(fg, bg) {
if (!fg) return bg;
if (!bg) return fg;
var a = Math.max(0, Math.min(1, fg.a == null ? 1 : fg.a));
return {
r: fg.r * a + bg.r * (1 - a),
g: fg.g * a + bg.g * (1 - a),
b: fg.b * a + bg.b * (1 - a),
a: 1
};
}
function relLum(c) {
function ch(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
}
function contrastOf(a, b) {
var la = relLum(a), lb = relLum(b);
return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
function bestInk(bg, base, inks) {
var b = rgbOf(base) || { r: 255, g: 255, b: 255, a: 1 };
var layer = overRgb(rgbOf(bg), b);
var best = (inks && inks[0]) || COL.text, bestC = -1;
for (var i = 0; inks && i < inks.length; i++) {
var ink = inks[i];
if (!ink) continue;
var c = contrastOf(layer, rgbOf(ink) || b);
if (c > bestC) { bestC = c; best = ink; }
}
return best;
}
function inkOnSurface(highlight, sub) {
var page = rgbOf(COL.bg || '#000000') || { r: 0, g: 0, b: 0, a: 1 };
var card = overRgb(rgbOf(COL.card || '#FFFFFF'), page);
var face = highlight ? COL.surfaceHi : COL.surface;
var main = sub ? (COL.textOnSurface || COL.textSub) : (COL.textOnSurface || COL.text);
return bestInk(face, 'rgb(' + Math.round(card.r) + ',' + Math.round(card.g) + ',' + Math.round(card.b) + ')',
[main, sub ? COL.textSub : COL.text, COL.inkOnLight || '#202A36']);
}
function text(str, x, y, size, color, align, weight) {
ctx.font = font(size, weight);
ctx.fillStyle = color;
ctx.textAlign = align || 'left';
ctx.textBaseline = 'middle';
ctx.fillText(str, x, y);
}
function textFit(str, x, y, size, color, align, weight, maxW) {
var s = String(str === undefined || str === null ? '' : str);
if (maxW && ctx.measureText) {
ctx.font = font(size, weight);
if (meas(s) > maxW) {
while (s.length > 1 && meas(s + '…') > maxW) s = s.slice(0, -1);
s += '…';
}
}
text(s, x, y, size, color, align, weight);
}
function fShade(hex, pct) {
var n = parseInt(hex.slice(1), 16);
var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
r = Math.max(0, Math.min(255, Math.round(r * (1 + pct / 100))));
g = Math.max(0, Math.min(255, Math.round(g * (1 + pct / 100))));
b = Math.max(0, Math.min(255, Math.round(b * (1 + pct / 100))));
return 'rgb(' + r + ',' + g + ',' + b + ')';
}
function drawRosePetal(c, x, y, size, rot, flip, alpha, hex) {
if (alpha <= 0.01 || size <= 1) return;
var fx = flip;
if (fx > -0.12 && fx < 0.12) fx = fx < 0 ? -0.12 : 0.12;
var L = size, W = size * 0.80;
alpha *= 0.74 + 0.26 * Math.abs(fx);
var lit = 0.70 + 0.30 * Math.abs(fx);
if (fx < 0) lit *= 0.88;
c.save();
c.translate(x, y);
c.rotate(rot);
c.scale(fx, 1);
c.globalAlpha = alpha;
c.beginPath();
c.moveTo(0, 0);
c.bezierCurveTo(-W * 0.74, -L * 0.20, -W * 0.94, -L * 0.62, -W * 0.42, -L * 0.94);
c.quadraticCurveTo(-W * 0.24, -L * 0.83, -W * 0.11, -L * 0.97);
c.quadraticCurveTo(0, -L * 0.85, W * 0.11, -L * 0.97);
c.quadraticCurveTo(W * 0.24, -L * 0.83, W * 0.42, -L * 0.94);
c.bezierCurveTo(W * 0.94, -L * 0.62, W * 0.74, -L * 0.20, 0, 0);
c.closePath();
c.fillStyle = fShade(hex, (lit - 1) * 100);
c.fill();
c.beginPath();
c.moveTo(-W * 0.04, -L * 0.06);
c.bezierCurveTo(-W * 0.50, -L * 0.26, -W * 0.66, -L * 0.62, -W * 0.38, -L * 0.90);
c.bezierCurveTo(-W * 0.28, -L * 0.66, -W * 0.26, -L * 0.36, -W * 0.02, -L * 0.12);
c.closePath();
c.fillStyle = fShade(hex, (lit - 1) * 100 - 26);
c.fill();
c.beginPath();
c.moveTo(-W * 0.30, -L * 0.92);
c.quadraticCurveTo(0, -L * 0.80, W * 0.30, -L * 0.92);
c.strokeStyle = fShade(hex, 26);
c.lineWidth = Math.max(0.8, size * 0.05);
c.stroke();
c.restore();
}
function drawButterfly(c, x, y, size, rot, flap, alpha, pal) {
if (alpha <= 0.01) return;
var open = 0.24 + 0.76 * flap;
c.save();
c.translate(x, y);
c.rotate(rot);
c.globalAlpha = alpha;
for (var s = -1; s <= 1; s += 2) {
c.save();
c.scale(s * open, 1);
c.beginPath();
c.moveTo(size * 0.04, -size * 0.06);
c.bezierCurveTo(size * 0.52, -size * 0.86, size * 1.06, -size * 0.66, size * 0.94, -size * 0.14);
c.bezierCurveTo(size * 0.86, size * 0.10, size * 0.34, size * 0.12, size * 0.04, size * 0.02);
c.closePath();
c.fillStyle = pal.w1; c.fill();
c.strokeStyle = pal.e; c.lineWidth = Math.max(0.9, size * 0.06); c.stroke();
c.beginPath();
c.moveTo(size * 0.03, size * 0.05);
c.bezierCurveTo(size * 0.56, size * 0.16, size * 0.74, size * 0.56, size * 0.40, size * 0.88);
c.bezierCurveTo(size * 0.14, size * 1.00, -size * 0.04, size * 0.62, -size * 0.02, size * 0.26);
c.closePath();
c.fillStyle = pal.w2; c.fill(); c.stroke();
c.beginPath();
c.arc(size * 0.52, -size * 0.36, size * 0.15, 0, Math.PI * 2);
c.fillStyle = pal.s; c.fill();
c.restore();
}
c.beginPath();
if (c.ellipse) c.ellipse(0, size * 0.10, size * 0.075, size * 0.46, 0, 0, Math.PI * 2);
else c.arc(0, size * 0.10, size * 0.12, 0, Math.PI * 2);
c.fillStyle = '#3A2A1E'; c.fill();
c.beginPath();
c.moveTo(0, -size * 0.32);
c.quadraticCurveTo(-size * 0.30, -size * 0.70, -size * 0.46, -size * 0.88);
c.moveTo(0, -size * 0.32);
c.quadraticCurveTo(size * 0.30, -size * 0.70, size * 0.46, -size * 0.88);
c.strokeStyle = '#3A2A1E';
c.lineWidth = Math.max(0.7, size * 0.045);
c.stroke();
c.restore();
}
function makePetalScene(lv) {
var bb = G.bbox([lv.outline]);
var cx = w2d((bb[0] + bb[2]) / 2), cy = h2d((bb[1] + bb[3]) / 2);
var low = !!state.lowFps;
var petals = [], i, n = low ? 16 : 28;
for (i = 0; i < n; i++) {
var ang = (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.7;
var sp = 150 + Math.random() * 240;
petals.push({
ox: (Math.random() - 0.5) * 34, oy: (Math.random() - 0.5) * 34,
vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp * 0.52 - (60 + Math.random() * 150),
size: 17 + Math.random() * 13,
rot0: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 1.8,
flip0: Math.random() * Math.PI * 2, flipV: 1.0 + Math.random() * 2.0,
sway: Math.random() * Math.PI * 2, swayA: 8 + Math.random() * 14,
swayF: 0.8 + Math.random() * 0.9,
ci: (Math.random() * C.WIN_FX.petalColors.length) | 0,
delay: Math.random() * 340
});
}
var bfs = [], nb = low ? 3 : 5;
for (i = 0; i < nb; i++) {
var dir = (i % 2 === 0) ? 1 : -1;
bfs.push({
delay: 150 + i * 150,
x0: cx + dir * (20 + Math.random() * 70),
y0: cy + (Math.random() - 0.5) * 50,
ax: 50 + Math.random() * 80, ay: 26 + Math.random() * 40,
fx: 0.5 + Math.random() * 0.5, fy: 0.85 + Math.random() * 0.7,
ph: Math.random() * Math.PI * 2,
rise: 22 + Math.random() * 34,
size: 18 + Math.random() * 8,
rot0: (Math.random() - 0.5) * 0.5,
flapHz: 6.2 + Math.random() * 3.4,
pal: C.WIN_FX.butterfly[i % C.WIN_FX.butterfly.length]
});
}
return { cx: cx, cy: cy, petals: petals, butterflies: bfs };
}
function drawPetalScene(t, low) {
var sc = state.petalScene;
if (!sc) return;
var life = C.WIN_FX.petalTotal;
var i, tt, a;
for (i = 0; i < sc.petals.length; i++) {
var p = sc.petals[i];
tt = (t - p.delay) / 1000;
if (tt <= 0) continue;
var k = 1.6, vt = 78;
var ek = 1 - Math.exp(-k * tt);
var x = sc.cx + p.ox + p.vx * ek / k + Math.sin(tt * p.swayF * 6.283 + p.sway) * p.swayA * Math.min(1, tt / 0.6);
var y = sc.cy + p.oy + (p.vy - vt) * ek / k + vt * tt;
a = Math.min(1, tt / 0.12);
if (t > life - 450) a *= Math.max(0, (life - t) / 450);
if (a <= 0.01) continue;
drawRosePetal(ctx, x, y, p.size, p.rot0 + p.spin * tt,
Math.cos(p.flip0 + p.flipV * tt), a, C.WIN_FX.petalColors[p.ci]);
}
for (i = 0; i < sc.butterflies.length; i++) {
var b = sc.butterflies[i];
tt = (t - b.delay) / 1000;
if (tt <= 0) continue;
var bx = b.x0 + Math.sin(tt * b.fx + b.ph) * b.ax + tt * 16;
var by = b.y0 - b.rise * Math.min(1, tt / 1.2) + Math.sin(tt * b.fy + b.ph * 1.7) * b.ay;
a = Math.min(1, tt / 0.3);
if (t > life - 450) a *= Math.max(0, (life - t) / 450);
if (a <= 0.01) continue;
drawButterfly(ctx, bx, by, b.size, b.rot0 + Math.sin(tt * 1.4 + b.ph) * 0.24,
0.5 + 0.5 * Math.sin(tt * 6.283 * b.flapHz), a, b.pal);
}
}
var flowerStreamCache = null, flowerStreamDst = null;
function streamRng(key, levelIdx) {
var h = (2166136261 ^ (levelIdx * 2654435761) ^ (key === 'tangram7' ? 0x9E3779B9 : 0)) >>> 0;
return function () {
h ^= h << 13; h >>>= 0;
h ^= h >>> 17;
h ^= h << 5; h >>>= 0;
return (h % 10000) / 10000;
};
}
function makeStreamParticle(t0, rnd, S, F, idx) {
var top = (idx % 2 === 0);
var x = 44 + rnd() * (C.DESIGN.w - 88);
var y = top
? (S.bandTopMin + rnd() * Math.max(20, S.bandTop - S.bandTopMin - 40))
: (S.bandBottom + rnd() * Math.max(20, S.bandBottomMax - S.bandBottom));
var bfly = (idx % 9) === 4;
return {
t0: t0, x: x, y: y,
kind: bfly ? 'bfly' : 'petal',
size: bfly
? (S.minSize + 2 + rnd() * 6)
: (S.minSize + rnd() * (S.maxSize - S.minSize)),
ci: Math.floor(rnd() * F.colors.length),
rot: rnd() * Math.PI * 2,
spin: (rnd() - 0.5) * 0.8,
flip0: rnd() * Math.PI * 2,
flipV: 0.8 + rnd() * 1.6,
sway: rnd() * Math.PI * 2,
rise: 16 + rnd() * 20
};
}
function flowerStreamParticles(key, levelIdx) {
if (flowerStreamDst === key + ':' + levelIdx && flowerStreamCache) return flowerStreamCache;
var S = C.FLOWER.stream, F = C.FLOWER;
var rnd = streamRng(key, levelIdx);
var arr = [], t = S.from, gap = S.gap0, guard = 0;
while (t < S.cycleEnd && guard++ < 200) {
arr.push(makeStreamParticle(t, rnd, S, F, arr.length));
gap = S.gap0 + (S.gapMax - S.gap0) * (1 - Math.exp(-(t - S.from) / S.decay));
t += gap;
}
flowerStreamDst = key + ':' + levelIdx;
flowerStreamCache = arr;
return arr;
}
function makeWinFx(lv) {
var bb = G.bbox([lv.outline]);
var cx = w2d((bb[0] + bb[2]) / 2);
var cy = h2d((bb[1] + bb[3]) / 2);
var pal = [];
DS.pieceOrder.forEach(function (id) { if (DS.pieces[id]) pal.push(DS.pieces[id].color); });
pal = pal.concat(['#FFD93D', '#FF6B6B', '#4D96FF', '#6BCB77', '#B983FF', '#FF9F1C', '#FFFFFF']);
var CF = C.WIN_FX;
var parts = [], wv, i;
for (wv = 0; wv < CF.waves.length; wv++) {
var w = CF.waves[wv];
var n = qParticles(w.n * (state.lowFps ? 0.55 : 1));
for (i = 0; i < n; i++) {
var ang = Math.random() * Math.PI * 2;
var spread = 0.35 + wv * 0.5;
var dir = Math.atan2(Math.sin(ang) * spread, Math.cos(ang));
var sp = w.sp * (0.6 + Math.random() * 0.8);
parts.push({
delay: w.at + Math.random() * (wv === 0 ? 80 : 240),
x: cx + (Math.random() - 0.5) * 26,
y: cy + (Math.random() - 0.5) * 26,
vx: Math.cos(dir) * sp,
vy: Math.sin(dir) * sp * 0.52 - (170 + Math.random() * 200),
w: 7 + Math.random() * 6,
h: 5 + Math.random() * 4,
rot0: Math.random() * Math.PI * 2,
spin: (Math.random() - 0.5) * 3.4,
flip0: Math.random() * Math.PI * 2,
flipV: 3.4 + Math.random() * 5.0,
sway: Math.random() * Math.PI * 2,
swayA: 11 + Math.random() * 20,
swayF: 0.7 + Math.random() * 1.1,
color: pal[(Math.random() * pal.length) | 0]
});
}
}
return { t: 0, cx: cx, cy: cy, parts: parts };
}
function drawWinFx() {
var fx = state.winFx;
if (!fx || state.reduceMotion) return;
var t = fx.t / 1000;
var cx = fx.cx, cy = fx.cy;
var CF = C.WIN_FX;
if (t < 0.9) {
var ft = t / 0.9;
var rad = 46 + ft * 330;
var g1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
g1.addColorStop(0, 'rgba(255,255,255,' + (0.88 * Math.pow(1 - ft, 0.8)).toFixed(3) + ')');
g1.addColorStop(0.38, 'rgba(255,238,190,' + (0.52 * Math.pow(1 - ft, 0.9)).toFixed(3) + ')');
g1.addColorStop(1, 'rgba(255,238,190,0)');
ctx.save();
ctx.fillStyle = g1;
ctx.beginPath();
ctx.arc(cx, cy, rad, 0, Math.PI * 2);
ctx.fill();
ctx.restore();
}
for (var r = 0; r < 2; r++) {
var rt = (t - r * 0.11) / 1.15;
if (rt <= 0 || rt >= 1) continue;
ctx.save();
ctx.globalAlpha = (1 - rt) * 0.42;
ctx.strokeStyle = r ? '#9BE8B8' : '#FFE9A8';
ctx.lineWidth = 4.5 * (1 - rt) + 1.2;
ctx.beginPath();
ctx.arc(cx, cy, 26 + rt * 330, 0, Math.PI * 2);
ctx.stroke();
ctx.restore();
}
var fadeAll = t > CF.fadeStart ? Math.max(0, 1 - (t - CF.fadeStart) / CF.fadeDur) : 1;
if (fadeAll <= 0) return;
var k = CF.drag, vt = CF.terminal;
var H = DH() + 80;
for (var i = 0; i < fx.parts.length; i++) {
var p = fx.parts[i];
var tt = t - p.delay / 1000;
if (tt <= 0) continue;
var ek = 1 - Math.exp(-k * tt);
var x = p.x + p.vx * ek / k + Math.sin(tt * p.swayF * 6.283 + p.sway) * p.swayA * Math.min(1, tt / 0.7);
var y = p.y + (p.vy - vt) * ek / k + vt * tt;
if (y > H) continue;
var rot = p.rot0 + p.spin * tt;
var flip = p.flip0 + p.flipV * tt;
var cf = Math.cos(flip);
var acf = Math.abs(cf);
var hh = p.h * Math.max(0.07, acf);
var lit = (0.70 + 0.30 * acf) * (cf < 0 ? 0.86 : 1);
ctx.save();
ctx.globalAlpha = fadeAll * (tt < 0.14 ? tt / 0.14 : 1) * 0.95;
ctx.translate(x, y);
ctx.rotate(rot);
ctx.fillStyle = fShade(p.color, (lit - 1) * 100);
ctx.fillRect(-p.w / 2, -hh / 2, p.w, hh);
ctx.fillStyle = fShade(p.color, (lit - 1) * 100 + 16);
ctx.fillRect(-p.w / 2, -hh / 2, p.w, Math.max(0.6, hh * 0.38));
if (acf < 0.30) {
ctx.strokeStyle = 'rgba(255,255,255,' + (0.55 * (1 - acf / 0.30)).toFixed(3) + ')';
ctx.lineWidth = 1;
ctx.beginPath();
ctx.moveTo(-p.w / 2, hh / 2);
ctx.lineTo(p.w / 2, hh / 2);
ctx.stroke();
}
ctx.restore();
}
}
function drawWinStream(t, low) {
var S = C.FLOWER.stream;
var arr = flowerStreamParticles(state.setKey, state.levelIdx);
var tail = S.gapMax * 4;
var wt = t > S.cycleEnd ? (S.cycleEnd - tail + ((t - S.cycleEnd) % tail)) : t;
var maxAlive = low ? Math.ceil(S.maxAlive / 2) : S.maxAlive;
var drawn = 0;
for (var i = 0; i < arr.length && drawn < maxAlive; i++) {
var p = arr[i];
var age = wt - p.t0;
if (age < 0 || age > S.life) continue;
var q = age / S.life;
var a = Math.min(Math.min(1, q / 0.14), Math.min(1, (1 - q) / 0.30));
if (a <= 0.01) continue;
var y = p.y - p.rise * (age / 1000);
if (p.kind === 'bfly') {
var bt = age / 1000;
drawButterfly(ctx, p.x + Math.sin(bt * 2.2 + p.sway) * 20, y - 6,
p.size, p.rot * 0.3 + Math.sin(bt * 1.6 + p.sway) * 0.2,
0.5 + 0.5 * Math.sin(bt * 6.283 * (6.8 + (p.spin + 0.4) * 3)),
a * 0.95, C.WIN_FX.butterfly[p.ci % C.WIN_FX.butterfly.length]);
} else {
var bloom = Math.min(1, age / 420);
var sc = (0.80 + 0.22 * G.easeOutCubic(bloom)) * (1 - 0.08 * q);
drawRosePetal(ctx, p.x + Math.sin(age / 900 + p.sway) * 9, y, p.size * sc,
p.rot + p.spin * (age / 1000),
Math.cos(p.flip0 + p.flipV * (age / 1000)), a * 0.96,
C.WIN_FX.petalColors[p.ci % C.WIN_FX.petalColors.length]);
}
drawn++;
}
}
function drawButton(b) {
var pressed = state.press === b.id;
var dy = pressed ? 2 : 0;
var x = b.x - b.w / 2, y = b.y - b.h / 2 + dy;
ctx.save();
if (b.variant === 'primary' || b.variant === 'danger') {
var isDanger = b.variant === 'danger';
shadow(10, 4, COL.shadow);
rr(x, y, b.w, b.h, b.h / 2);
ctx.fillStyle = grad('btn|' + (isDanger ? 'd' : 'p') + '|' + Math.round(y) + '|' +
Math.round(b.h) + '|' + COL.gold + '|' + COL.goldDeep, function () {
var gr = ctx.createLinearGradient(0, y, 0, y + b.h);
if (isDanger) { gr.addColorStop(0, '#FF7A63'); gr.addColorStop(1, '#F2543F'); }
else { gr.addColorStop(0, COL.gold); gr.addColorStop(1, COL.goldDeep); }
return gr;
});
ctx.fill();
noShadow();
ctx.save(); rr(x, y, b.w, b.h, b.h / 2); ctx.clip();
ctx.fillStyle = isDanger ? '#C93A28' : COL.goldEdge;
ctx.fillRect(x, y + b.h - C.LAYOUT.BTN_EDGE + (pressed ? 2 : 0), b.w, C.LAYOUT.BTN_EDGE * 2);
ctx.restore();
var fg = isDanger ? '#FFFFFF' : COL.btnText;
if (b.disabled) fg = isDanger ? 'rgba(255,255,255,0.55)' : 'rgba(122,74,0,0.45)';
if (b.icon && b.iconInline) {
var isz = 34, igap = 9;
ctx.save(); ctx.font = font(b.size || 32, '600');
var tw = ctx.measureText ? meas(String(b.label)) : 0;
ctx.restore();
var x0 = b.x - (isz + igap + tw) / 2;
drawIcon(b.icon, x0 + isz / 2, b.y + dy, fg, b.iconScale || 0.95);
text(b.label, x0 + isz + igap, b.y + dy, b.size || 32, fg, 'left', '600');
} else if (b.icon) {
drawIcon(b.icon, b.x - b.w / 2 + 56, b.y + dy, fg, 0.95);
text(b.label, b.x + 18, b.y + dy, b.size || 32, fg, 'center', '600');
} else {
text(b.label, b.x, b.y + dy, b.size || 32, fg, 'center', '600');
}
} else if (b.variant === 'tool') {
var dis = !!b.disabled;
if (b.tone) {
var tn = b.tone;
var dkT = !!state.darkUi;
var cx0 = b.x - b.w / 2, cy0 = b.y - b.h / 2 + dy;
ctx.save();
if (!dis) shadow(0, 7, dkT ? 'rgba(0,0,0,0.34)' : 'rgba(122,98,66,0.16)');
rr(cx0, cy0, b.w, b.h, 30);
ctx.fillStyle = grad('tone|' + Math.round(cy0) + '|' + Math.round(b.h) + '|' +
(dis ? 'x' : 'n') + (dkT ? 'd' : 'l') + tn.bg1 + tn.bg2, function () {
var tg = ctx.createLinearGradient(0, cy0, 0, cy0 + b.h);
tg.addColorStop(0, dis ? (dkT ? '#2A313D' : '#F8FAFD') : tn.bg1);
tg.addColorStop(1, dis ? (dkT ? '#232A35' : '#EEF2F7') : tn.bg2);
return tg;
});
ctx.fill();
noShadow();
ctx.save(); rr(cx0, cy0, b.w, b.h, 30); ctx.clip();
ctx.fillStyle = dis ? (dkT ? '#1C222C' : '#E4EAF1') : tn.edge;
ctx.fillRect(cx0, cy0 + b.h - 6, b.w, 9);
if (ctx.ellipse) {
ctx.beginPath();
ctx.ellipse(b.x - b.w * 0.06, cy0 + 15, b.w * 0.30, 9, 0, 0, Math.PI * 2);
ctx.fillStyle = dkT ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.6)'; ctx.fill();
}
ctx.restore();
drawIcon(b.icon, b.x, b.y + dy - 3,
dis ? COL.disabledIcon : tn.ink, b.iconScale || 1.16);
ctx.restore();
} else {
rr(x, y, b.w, b.h, 24);
ctx.fillStyle = dis ? COL.disabledBg : COL.card;
ctx.fill();
ctx.lineWidth = 1.5; ctx.strokeStyle = dis ? COL.disabledBg : COL.cardEdge;
ctx.stroke();
noShadow();
drawIcon(b.icon, b.x, b.y + dy,
dis ? COL.disabledIcon : COL.text, b.iconScale || 1);
}
if (b.badge) {
var bt = String(b.badge);
if (b.badge > 99) bt = '99+';
ctx.save();
ctx.font = font(16, '700');
var tw = ctx.measureText ? meas(bt) : 20;
var bw2 = Math.max(30, tw + 14), bh2 = 30;
var bcy = b.y - b.h / 2 + 6 + bh2 / 2 + (pressed ? 2 : 0);
var bcx = b.x + b.w / 2 - 6 - bw2 / 2;
rr(bcx - bw2 / 2, bcy - bh2 / 2, bw2, bh2, bh2 / 2);
ctx.fillStyle = COL.gold;
ctx.fill();
ctx.lineWidth = 2.5;
ctx.strokeStyle = 'rgba(255,255,255,0.95)';
ctx.stroke();
ctx.restore();
text(bt, bcx, bcy + 1, 16, COL.btnText, 'center', '700');
}
} else if (b.variant === 'ghost') {
text(b.label, b.x, b.y + dy, b.size || 22, pressed ? COL.text : COL.textSub, 'center', '500');
} else {
var srad = b.pill ? b.h / 2 : 20;
rr(x, y, b.w, b.h, srad);
ctx.fillStyle = b.disabled ? COL.disabledBg : COL.card; ctx.fill();
ctx.lineWidth = 1.5; ctx.strokeStyle = b.disabled ? COL.disabledBg : COL.cardEdge; ctx.stroke();
ctx.save(); rr(x, y, b.w, b.h, srad); ctx.clip();
ctx.fillStyle = b.disabled ? COL.disabledBg : COL.cardEdge;
ctx.fillRect(x, y + b.h - C.LAYOUT.BTN_EDGE + (pressed ? 2 : 0), b.w, C.LAYOUT.BTN_EDGE * 2);
ctx.restore();
var sfg = b.disabled ? COL.disabledIcon : COL.text;
if (b.icon && b.iconInline) {
var isz2 = 34, igap2 = 9;
ctx.save(); ctx.font = font(b.size || 30, '500');
var tw2 = ctx.measureText ? meas(String(b.label)) : 0;
ctx.restore();
var x2 = b.x - (isz2 + igap2 + tw2) / 2;
drawIcon(b.icon, x2 + isz2 / 2, b.y + dy, sfg, b.iconScale || 0.95);
text(b.label, x2 + isz2 + igap2, b.y + dy, b.size || 30, sfg, 'left', '500');
} else {
if (b.icon) drawIcon(b.icon, x + 46, b.y + dy, COL.text, 0.86);
text(b.label, b.x + (b.icon ? 20 : 0), b.y + dy, b.size || 30,
sfg, 'center', '500');
}
}
ctx.restore();
}
function badgeDisc(rad, c1, c2, edge) {
var g = grad('bd|' + rad + '|' + c1 + c2 + (edge || ''), function () {
var gg = ctx.createLinearGradient(-rad * 0.6, -rad, rad * 0.5, rad);
gg.addColorStop(0, c1); gg.addColorStop(1, c2);
return gg;
});
ctx.beginPath(); ctx.arc(0, 0, rad, 0, Math.PI * 2);
ctx.fillStyle = g; ctx.fill();
ctx.lineWidth = 2.4; ctx.strokeStyle = edge || 'rgba(0,0,0,0.18)'; ctx.stroke();
ctx.beginPath(); ctx.arc(-rad * 0.28, -rad * 0.32, rad * 0.34, 0, Math.PI * 2);
ctx.fillStyle = 'rgba(255,255,255,0.42)'; ctx.fill();
}
function drawIcon(name, cx, cy, color, s) {
s = s || 1;
ctx.save();
ctx.translate(cx, cy);
ctx.scale(s, s);
ctx.strokeStyle = color; ctx.fillStyle = color;
ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
if (name === 'coin') {
badgeDisc(15.5, '#FFE07A', '#F5A623', 'rgba(150,90,10,0.55)');
ctx.strokeStyle = 'rgba(150,90,10,0.42)'; ctx.lineWidth = 1.6;
ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.stroke();
ctx.fillStyle = '#B86E12';
ctx.beginPath();
for (var ci = 0; ci < 10; ci++) {
var ca = -Math.PI / 2 + ci * Math.PI / 5, cr = ci % 2 === 0 ? 6.6 : 2.9;
var cxx = Math.cos(ca) * cr, cyy = Math.sin(ca) * cr;
if (ci === 0) ctx.moveTo(cxx, cyy); else ctx.lineTo(cxx, cyy);
}
ctx.closePath(); ctx.fill();
} else if (name === 'energy') {
badgeDisc(15.5, '#8FE3FF', '#22A9E8', 'rgba(12,78,128,0.5)');
ctx.beginPath();
ctx.moveTo(3, -11); ctx.lineTo(-8, 1.5); ctx.lineTo(-1.5, 1.5);
ctx.lineTo(-4, 11); ctx.lineTo(8.5, -2.5); ctx.lineTo(1.5, -2.5);
ctx.closePath();
ctx.lineWidth = 2.4; ctx.strokeStyle = '#0E6FA8'; ctx.stroke();
ctx.fillStyle = '#FFFFFF'; ctx.fill();
} else if (name === 'hint') {
var by0 = -3.6;
var glow = grad('ic|' + name + '|' + color + '|' + s + '|glow', function () {
var gg = ctx.createRadialGradient(0, by0, 3, 0, by0, 21);
gg.addColorStop(0, 'rgba(255,214,92,0.60)');
gg.addColorStop(1, 'rgba(255,214,92,0)');
return gg;
});
ctx.beginPath(); ctx.arc(0, by0, 21, 0, Math.PI * 2);
ctx.fillStyle = glow; ctx.fill();
ctx.beginPath();
ctx.arc(0, by0, 10.6, Math.PI * 0.80, Math.PI * 2.20);
ctx.quadraticCurveTo(8.2, by0 + 11, 4.6, 10.4);
ctx.lineTo(-4.6, 10.4);
ctx.quadraticCurveTo(-8.2, by0 + 11, -8.4, by0 + 9.6);
ctx.closePath();
var bg2 = grad('ic|' + name + '|' + color + '|' + s + '|body', function () {
var gg = ctx.createLinearGradient(-9, -12, 7, 12);
gg.addColorStop(0, '#FFE888'); gg.addColorStop(0.55, '#FFCC4D'); gg.addColorStop(1, '#F5A623');
return gg;
});
ctx.fillStyle = bg2; ctx.fill();
ctx.lineWidth = 2.2; ctx.strokeStyle = '#D9861A'; ctx.stroke();
ctx.lineWidth = 2.4; ctx.strokeStyle = '#C57C16';
ctx.beginPath(); ctx.moveTo(-4.8, 14.2); ctx.lineTo(4.8, 14.2); ctx.stroke();
ctx.beginPath(); ctx.moveTo(-4.0, 18.0); ctx.lineTo(4.0, 18.0); ctx.stroke();
ctx.beginPath(); ctx.arc(-3.6, by0 - 3.4, 3.1, 0, Math.PI * 2);
ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill();
} else if (name === 'rank') {
ctx.lineWidth = 3; ctx.strokeStyle = shadeHex(color, -0.18);
ctx.beginPath(); ctx.moveTo(-9, -11); ctx.lineTo(9, -11);
ctx.lineTo(6, -1); ctx.quadraticCurveTo(0, 5, -6, -1); ctx.closePath();
ctx.fillStyle = hexA(color, 0.42); ctx.fill(); ctx.stroke();
ctx.beginPath(); ctx.arc(-11, -7, 4, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
ctx.beginPath(); ctx.arc(11, -7, 4, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(0, 10); ctx.stroke();
ctx.lineWidth = 3.6; ctx.beginPath(); ctx.moveTo(-9, 12); ctx.lineTo(9, 12); ctx.stroke();
ctx.fillStyle = '#FFFFFF';
ctx.beginPath(); ctx.arc(0, -6, 2.4, 0, Math.PI * 2); ctx.fill();
} else if (name === 'online' || name === 'gift') {
ctx.fillStyle = hexA(color, 0.30);
ctx.strokeStyle = shadeHex(color, -0.2); ctx.lineWidth = 2.6;
rr(-13, -6, 26, 17, 3); ctx.fill(); ctx.stroke();
ctx.fillStyle = hexA(color, 0.46);
rr(-15, -10, 30, 6, 2); ctx.fill(); ctx.stroke();
ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, 11); ctx.stroke();
ctx.beginPath(); ctx.moveTo(0, -10); ctx.quadraticCurveTo(-12, -20, -7, -11); ctx.stroke();
ctx.beginPath(); ctx.moveTo(0, -10); ctx.quadraticCurveTo(12, -20, 7, -11); ctx.stroke();
ctx.fillStyle = '#FFFFFF';
ctx.beginPath(); ctx.arc(9, 1, 2, 0, Math.PI * 2); ctx.fill();
} else if (name === 'gear') {
ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2);
ctx.strokeStyle = shadeHex(color, -0.12); ctx.lineWidth = 3.4; ctx.stroke();
ctx.fillStyle = color;
for (var gi = 0; gi < 8; gi++) {
ctx.save(); ctx.rotate(gi * Math.PI / 4);
rr(-3.4, -16.5, 6.8, 7, 2); ctx.fill();
ctx.restore();
}
ctx.beginPath(); ctx.arc(0, 0, 3.8, 0, Math.PI * 2);
ctx.fillStyle = hexA(color, 0.35); ctx.fill();
ctx.strokeStyle = shadeHex(color, -0.2); ctx.lineWidth = 2.4; ctx.stroke();
} else if (name === 'heart') {
var hg = grad('ic|' + name + '|' + color + '|' + s + '|heart', function () {
var gg = ctx.createLinearGradient(0, -12, 0, 12);
gg.addColorStop(0, shadeHex(color, 0.28)); gg.addColorStop(1, color);
return gg;
});
ctx.beginPath();
ctx.moveTo(0, 14);
ctx.bezierCurveTo(-21, -2, -14, -17, 0, -7);
ctx.bezierCurveTo(14, -17, 21, -2, 0, 14);
ctx.closePath(); ctx.fillStyle = hg; ctx.fill();
ctx.beginPath(); ctx.arc(-5, -5, 2.6, 0, Math.PI * 2);
ctx.fillStyle = 'rgba(255,255,255,0.62)'; ctx.fill();
} else if (name === 'invite') {
ctx.lineWidth = 3; ctx.strokeStyle = shadeHex(color, -0.15);
ctx.beginPath(); ctx.arc(-8, -7, 5, 0, Math.PI * 2); ctx.stroke();
ctx.beginPath(); ctx.arc(8, -7, 5, 0, Math.PI * 2); ctx.stroke();
ctx.beginPath(); ctx.arc(-8, 15, 10, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke();
ctx.beginPath(); ctx.arc(8, 15, 10, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke();
ctx.fillStyle = '#FF6B8A';
ctx.beginPath(); ctx.moveTo(0, 2);
ctx.bezierCurveTo(-7, -4, -4, -9, 0, -5);
ctx.bezierCurveTo(4, -9, 7, -4, 0, 2); ctx.closePath(); ctx.fill();
} else if (name === 'skin') {
ctx.lineWidth = 3; ctx.strokeStyle = shadeHex(color, -0.15);
if (ctx.ellipse) { ctx.beginPath(); ctx.ellipse(0, 0, 17, 13, 0, 0, Math.PI * 2); ctx.stroke(); }
else { ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.stroke(); }
var dots = ['#FF6B6B', '#4FA8E0', '#63C88B'];
for (var di = 0; di < 3; di++) {
ctx.beginPath(); ctx.arc(-7 + di * 8, -3 + (di === 1 ? -4 : 0), 3, 0, Math.PI * 2);
ctx.fillStyle = dots[di]; ctx.fill();
}
} else if (name === 'back') {
ctx.lineWidth = 5.2;
ctx.lineCap = 'round';
ctx.lineJoin = 'round';
ctx.beginPath();
ctx.moveTo(6.5, -12); ctx.lineTo(-8, 0); ctx.lineTo(6.5, 12);
ctx.stroke();
ctx.beginPath();
ctx.moveTo(-6.5, 0); ctx.lineTo(9, 0);
ctx.stroke();
} else if (name === 'rotL' || name === 'rotR') {
var cw = name === 'rotR';
var R2 = 12.4, TH = -Math.PI * 0.5;
ctx.lineWidth = 5.2; ctx.lineCap = 'round';
ctx.beginPath();
if (cw) ctx.arc(0, 0, R2, TH + Math.PI * 0.39, TH + Math.PI * 2, false);
else ctx.arc(0, 0, R2, TH - Math.PI * 0.39, TH - Math.PI * 2, true);
ctx.stroke();
ctx.save();
ctx.translate(0, -R2);
if (!cw) ctx.rotate(Math.PI);
ctx.beginPath();
ctx.moveTo(7.6, 0); ctx.lineTo(-5.6, -6.4); ctx.lineTo(-2.2, 0); ctx.lineTo(-5.6, 6.4);
ctx.closePath(); ctx.fill();
ctx.restore();
} else if (name === 'flip') {
ctx.lineWidth = 5; ctx.lineCap = 'round';
ctx.beginPath(); ctx.moveTo(-13, -7.5); ctx.lineTo(10, -7.5); ctx.stroke();
ctx.beginPath();
ctx.moveTo(14, -7.5); ctx.lineTo(5.4, -12.6); ctx.lineTo(5.4, -2.4);
ctx.closePath(); ctx.fill();
ctx.beginPath(); ctx.moveTo(13, 7.5); ctx.lineTo(-10, 7.5); ctx.stroke();
ctx.beginPath();
ctx.moveTo(-14, 7.5); ctx.lineTo(-5.4, 2.4); ctx.lineTo(-5.4, 12.6);
ctx.closePath(); ctx.fill();
} else if (name === 'restart') {
var R3 = 12.4;
ctx.lineWidth = 5; ctx.lineCap = 'round';
var arcs = [[Math.PI * 0.55, Math.PI * 1.45], [Math.PI * 1.55, Math.PI * 2.45]];
for (var ai = 0; ai < 2; ai++) {
ctx.beginPath();
ctx.arc(0, 0, R3, arcs[ai][0], arcs[ai][1], false);
ctx.stroke();
var hEnd = arcs[ai][1];
ctx.save();
ctx.translate(Math.cos(hEnd) * R3, Math.sin(hEnd) * R3);
ctx.rotate(Math.atan2(Math.cos(hEnd), -Math.sin(hEnd)));
ctx.beginPath();
ctx.moveTo(7.2, 0); ctx.lineTo(-5.4, -6.0); ctx.lineTo(-2.1, 0); ctx.lineTo(-5.4, 6.0);
ctx.closePath(); ctx.fill();
ctx.restore();
}
} else if (name === 'lock') {
ctx.lineWidth = 3.5;
rr(-11, -2, 22, 18, 4); ctx.fill();
ctx.beginPath();
ctx.arc(0, -3, 7, Math.PI, 0);
ctx.stroke();
} else if (name === 'desktop') {
ctx.lineWidth = 3;
rr(-10, -17, 17, 34, 4); ctx.stroke();
ctx.beginPath(); ctx.moveTo(-6, 12); ctx.lineTo(-1, 12); ctx.stroke();
ctx.lineWidth = 2.6;
rr(9, -6, 7, 7, 1.6); ctx.stroke();
rr(9, 3, 7, 7, 1.6); ctx.stroke();
rr(9, 12, 7, 7, 1.6); ctx.stroke();
} else if (name === 'close') {
ctx.lineWidth = 4.2;
ctx.beginPath(); ctx.moveTo(-10, -10); ctx.lineTo(10, 10); ctx.stroke();
ctx.beginPath(); ctx.moveTo(10, -10); ctx.lineTo(-10, 10); ctx.stroke();
} else if (name === 'share') {
ctx.beginPath(); ctx.arc(-11, 0, 4.6, 0, Math.PI * 2); ctx.fill();
ctx.beginPath(); ctx.arc(10, -9, 4.6, 0, Math.PI * 2); ctx.fill();
ctx.beginPath(); ctx.arc(10, 9, 4.6, 0, Math.PI * 2); ctx.fill();
ctx.lineWidth = 3;
ctx.beginPath(); ctx.moveTo(-7, -2); ctx.lineTo(6, -8); ctx.stroke();
ctx.beginPath(); ctx.moveTo(-7, 2); ctx.lineTo(6, 8); ctx.stroke();
} else if (name === 'video') {
ctx.save();
ctx.lineCap = 'round'; ctx.lineJoin = 'round';
ctx.strokeStyle = color; ctx.fillStyle = color;
ctx.lineWidth = 3;
ctx.beginPath(); ctx.moveTo(-5.2, -8.4); ctx.lineTo(-8.6, -15.2); ctx.stroke();
ctx.beginPath(); ctx.moveTo(5.2, -8.4); ctx.lineTo(8.6, -15.2); ctx.stroke();
ctx.beginPath(); ctx.arc(-8.9, -16.1, 2.0, 0, Math.PI * 2); ctx.fill();
ctx.beginPath(); ctx.arc(8.9, -16.1, 2.0, 0, Math.PI * 2); ctx.fill();
rr(-14, -8.6, 28, 21, 6.5);
ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fill();
ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.stroke();
ctx.fillStyle = color;
ctx.beginPath();
ctx.moveTo(-3.8, -2.4); ctx.lineTo(5.0, 1.9); ctx.lineTo(-3.8, 6.2);
ctx.closePath(); ctx.fill();
ctx.beginPath();
ctx.moveTo(15.6, -16.9); ctx.lineTo(16.5, -14.6); ctx.lineTo(18.8, -13.7);
ctx.lineTo(16.5, -12.8); ctx.lineTo(15.6, -10.5); ctx.lineTo(14.7, -12.8);
ctx.lineTo(12.4, -13.7); ctx.lineTo(14.7, -14.6);
ctx.closePath(); ctx.fill();
ctx.restore();
} else if (name === 'check') {
ctx.lineWidth = 4.6;
ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-2, 8); ctx.lineTo(10, -8); ctx.stroke();
} else if (name === 'plus') {
ctx.lineWidth = 4.6;
ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(0, 9); ctx.stroke();
ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(9, 0); ctx.stroke();
}
ctx.restore();
}
function drawStar(cx, cy, r, filled, scale) {
ctx.save();
ctx.translate(cx, cy);
if (scale && scale !== 1) ctx.scale(scale, scale);
ctx.beginPath();
for (var i = 0; i < 10; i++) {
var a = -Math.PI / 2 + i * Math.PI / 5;
var rr2 = i % 2 === 0 ? r : r * 0.45;
var x = Math.cos(a) * rr2, y = Math.sin(a) * rr2;
if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
}
ctx.closePath();
ctx.fillStyle = filled ? COL.starOn : COL.starOff;
ctx.fill();
ctx.restore();
}
function drawHomeGlow(t, low) {
var spots = [
[0.20, 0.30, 0.62, 0.00],
[0.80, 0.60, 0.55, 1.90],
[0.46, 0.86, 0.50, 3.40]
];
var n = low ? 2 : 3;
for (var i = 0; i < n; i++) {
var s = spots[i];
var px = C.DESIGN.w * s[0] + Math.sin(t * (0.42 + i * 0.10) + s[3]) * 136;
var py = DH() * s[1] + Math.cos(t * (0.33 + i * 0.08) + s[3]) * 104;
var r = C.DESIGN.w * s[2] * (1 + 0.07 * Math.sin(t * 0.55 + i));
var gr = ctx.createRadialGradient(px, py, r * 0.10, px, py, r);
var ga = state.darkUi ? 0.5 : 1;
gr.addColorStop(0, 'rgba(255,244,214,' + (0.34 * ga).toFixed(3) + ')');
gr.addColorStop(0.55, 'rgba(255,232,190,' + (0.12 * ga).toFixed(3) + ')');
gr.addColorStop(1, 'rgba(255,232,190,0)');
ctx.fillStyle = gr;
ctx.fillRect(0, 0, C.DESIGN.w, DH());
}
drawHomeSweep(t);
}
function drawHomeSweep(t) {
var ph = (t / 11) % 1;
var sx = (-0.45 + ph * 1.9) * C.DESIGN.w;
ctx.save();
ctx.translate(sx, 0);
ctx.rotate(-0.16);
var lg = ctx.createLinearGradient(-260, 0, 260, 0);
lg.addColorStop(0, 'rgba(255,255,255,0)');
lg.addColorStop(0.5, 'rgba(255,255,255,' + (state.darkUi ? '0.05' : '0.12') + ')');
lg.addColorStop(1, 'rgba(255,255,255,0)');
ctx.fillStyle = lg;
ctx.fillRect(-260, -C.DESIGN.h, 520, C.DESIGN.h * 3);
ctx.restore();
}
function fxRnd(seed) {
var x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
return x - Math.floor(x);
}
function buildFxParts(key) {
var P = (C.BG_FX_PARTS && C.BG_FX_PARTS[key]) || {};
var mode = C.BG_FX[key] ? C.BG_FX[key].mode : 'glow';
var pal = ['#FF8A5B', '#4FA8E0', '#63C88B', '#A87BE8', '#D96A9B', '#FFC53D', '#3FB8B0'];
var out = { mode: mode, items: [], t: 0, lastShoot: 0 };
var i, r1, r2, r3;
if (mode === 'aurora') {
var bands = qParticles(P.bands || 4);
for (i = 0; i < bands; i++) {
out.items.push({ phase: fxRnd(i + 1) * 6.28, y: 0.26 + i * 0.16,
hue: i, speed: (P.speed || 0.085) * (0.8 + fxRnd(i + 7) * 0.5) });
}
} else if (mode === 'stars') {
var n = qParticles(P.count || 64);
for (i = 0; i < n; i++) {
r1 = fxRnd(i * 3 + 1); r2 = fxRnd(i * 3 + 2); r3 = fxRnd(i * 3 + 3);
out.items.push({ x: r1 * C.DESIGN.w, y: r2 * DH(),
r: 1 + r3 * 2.4, ph: r1 * 6.28, sp: 0.6 + r2 * 1.4, big: r3 > 0.94 });
}
out.shoot = null;
} else if (mode === 'bubbles' || mode === 'petals' || mode === 'geometric' ||
mode === 'snow' || mode === 'firefly') {
var cnt = qParticles(P.count || 22);
for (i = 0; i < cnt; i++) {
r1 = fxRnd(i * 4 + 1); r2 = fxRnd(i * 4 + 2); r3 = fxRnd(i * 4 + 3);
var r4 = fxRnd(i * 4 + 4);
out.items.push({
x: r1 * C.DESIGN.w, y: r2 * DH(),
size: mode === 'bubbles' ? (10 + r3 * 34)
: mode === 'firefly' ? (2 + r3 * 4.5)
: mode === 'snow' ? (4.5 + r3 * 9) : (10 + r3 * 16),
sp: mode === 'firefly' ? (10 + r4 * 24)
: mode === 'snow' ? (28 + r4 * 46) : (18 + r4 * 42),
ph: r1 * 6.28, sway: mode === 'snow' ? (20 + r3 * 34) : (12 + r3 * 26),
color: mode === 'firefly' ? (r3 > 0.5 ? '#C8FF7A' : '#FFE98A')
: mode === 'snow' ? '#FFFFFF' : pal[i % pal.length],
spin: (r2 - 0.5) * 2.2,
rot: r3 * 6.28,
shape: i % 3
});
}
} else if (mode === 'rain') {
var rn = P.count || 60;
for (i = 0; i < rn; i++) {
r1 = fxRnd(i * 3 + 1); r2 = fxRnd(i * 3 + 2); r3 = fxRnd(i * 3 + 3);
out.items.push({ x: r1 * C.DESIGN.w, y: r2 * DH(),
len: 22 + r3 * 46, sp: 480 + r3 * 560, ph: r1 * 6.28,
alpha: 0.18 + r2 * 0.36, sway: r1 * 6 });
}
} else if (mode === 'nebula') {
var cn = P.clouds || 6;
for (i = 0; i < cn; i++) {
r1 = fxRnd(i * 3 + 1); r2 = fxRnd(i * 3 + 2); r3 = fxRnd(i * 3 + 3);
out.items.push({ x: r1 * C.DESIGN.w, y: r2 * DH(),
r: 160 + r3 * 240, ph: r1 * 6.28, speed: 0.10 + r2 * 0.14,
color: ['#7B5CE8', '#3E7FE0', '#C451D6', '#4BC6E8', '#9B6BFF', '#E85C9E'][i % 6] });
}
}
return out;
}
function drawFxLayer(tSec, dtMs, intensity) {
var key = state.save.bgFx || 'classic';
var def = C.BG_FX && C.BG_FX[key];
if (!def || def.mode === 'glow') return;
var inten = (intensity === undefined ? 1 : intensity);
if (state.reduceMotion) {
if (def.dark) drawFxDarkBase(def.mode);
return;
}
if (!state.fxParts || state.fxParts.mode !== def.mode) state.fxParts = buildFxParts(key);
var F = state.fxParts;
var low = !!state.lowFps;
var n = F.items.length;
var W = C.DESIGN.w, H = DH();
var dt = Math.min(0.05, dtMs / 1000);
F.t += dt;
ctx.save();
if (def.dark) drawFxDarkBase(def.mode);
if (def.mode === 'aurora') {
ctx.globalCompositeOperation = 'source-over';
for (var a = 0; a < n; a++) {
var b = F.items[a];
var cx = W * (0.14 + a * 0.19) + Math.sin(F.t * b.speed * 6 + b.phase) * W * 0.19;
var cw = W * (0.40 + 0.08 * Math.sin(F.t * 0.4 + a));
var cy = H * b.y + Math.cos(F.t * 0.3 + b.phase) * 100;
var col = ['#FFB38A', '#8EC9F5', '#9BE3C4', '#C6A8F2', '#FFD166'][a % 5];
var gr = ctx.createRadialGradient(cx, cy, 10, cx, cy, cw);
gr.addColorStop(0, hexA(col, 0.42 * inten));
gr.addColorStop(0.5, hexA(col, 0.22 * inten));
gr.addColorStop(1, hexA(col, 0));
ctx.fillStyle = gr;
ctx.fillRect(cx - cw, cy - cw, cw * 2, cw * 2);
}
} else if (def.mode === 'nebula') {
for (var q = 0; q < n; q++) {
var cl = F.items[q];
var ang = cl.ph + F.t * cl.speed;
var nx = W / 2 + Math.cos(ang) * (W * 0.26) + (cl.x - W / 2) * 0.42;
var ny = H * 0.42 + Math.sin(ang) * (H * 0.16) + (cl.y - H / 2) * 0.34;
var pulse = 1 + 0.16 * Math.sin(F.t * 0.7 + cl.ph);
var rr = cl.r * pulse;
var ng = ctx.createRadialGradient(nx, ny, 8, nx, ny, rr);
ng.addColorStop(0, hexA(cl.color, 0.44 * inten));
ng.addColorStop(0.45, hexA(cl.color, 0.24 * inten));
ng.addColorStop(1, hexA(cl.color, 0));
ctx.fillStyle = ng; ctx.fillRect(nx - rr, ny - rr, rr * 2, rr * 2);
}
var sn = low ? 26 : 52;
for (var si = 0; si < sn; si++) {
var sx = fxRnd(si * 7 + 1) * W, sy = fxRnd(si * 7 + 2) * H;
var stw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(F.t * 1.6 + si));
ctx.globalAlpha = stw * 0.9 * inten; ctx.fillStyle = '#EAF0FF';
ctx.beginPath(); ctx.arc(sx, sy, si % 9 === 0 ? 2.8 : 1.3, 0, Math.PI * 2); ctx.fill();
}
ctx.globalAlpha = 1;
} else if (def.mode === 'stars') {
for (var s = 0; s < n; s++) {
var st = F.items[s];
var tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(F.t * st.sp * 2 + st.ph));
ctx.globalAlpha = tw * (st.big ? 1 : 0.85) * inten;
ctx.fillStyle = st.big ? '#FFF4C8' : '#FFFFFF';
ctx.beginPath();
ctx.arc(st.x, st.y, st.r * (st.big ? 1.5 : 1), 0, Math.PI * 2);
ctx.fill();
if (st.big) {
ctx.globalAlpha = tw * 0.42 * inten;
ctx.fillRect(st.x - st.r * 5, st.y - 0.7, st.r * 10, 1.4);
ctx.fillRect(st.x - 0.7, st.y - st.r * 5, 1.4, st.r * 10);
}
}
ctx.globalAlpha = 1;
var gap = (C.BG_FX_PARTS.stars && C.BG_FX_PARTS.stars.shootGap) || 4800;
if (F.t * 1000 - F.lastShoot > gap && !F.shoot) {
F.shoot = { t: 0, x: W * (0.1 + fxRnd(F.t | 0) * 0.5), y: -40, len: 150 + fxRnd(F.t) * 110 };
}
if (F.shoot) {
F.shoot.t += dt;
F.shoot.x += 340 * dt; F.shoot.y += 480 * dt;
var sp = F.shoot;
var g2 = ctx.createLinearGradient(sp.x - sp.len, sp.y - sp.len * 1.4, sp.x, sp.y);
g2.addColorStop(0, 'rgba(255,255,255,0)');
g2.addColorStop(1, 'rgba(255,244,200,0.95)');
ctx.strokeStyle = g2; ctx.lineWidth = 3; ctx.lineCap = 'round';
ctx.beginPath(); ctx.moveTo(sp.x - sp.len, sp.y - sp.len * 1.4); ctx.lineTo(sp.x, sp.y); ctx.stroke();
if (sp.t > 2.2 || sp.y > H + 200) { F.shoot = null; F.lastShoot = F.t * 1000; }
}
} else if (def.mode === 'rain') {
var stepR = low ? 2 : 1;
ctx.lineCap = 'round';
for (var ri = 0; ri < n; ri += stepR) {
var dr = F.items[ri];
var ry = ((dr.y + F.t * dr.sp) % (H + 200)) - 100;
var rx = dr.x + dr.sway;
ctx.globalAlpha = dr.alpha * inten;
ctx.strokeStyle = state.darkFx ? 'rgba(196,220,255,0.9)' : 'rgba(120,160,210,0.75)';
ctx.lineWidth = dr.len > 52 ? 2.2 : 1.5;
ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - dr.len * 0.28, ry + dr.len); ctx.stroke();
}
ctx.globalAlpha = 1;
} else if (def.mode === 'bubbles' || def.mode === 'petals' || def.mode === 'geometric' ||
def.mode === 'snow' || def.mode === 'firefly') {
var step = low ? 2 : 1;
for (var i = 0; i < n; i += step) {
var it = F.items[i];
var yy, xx;
if (def.mode === 'bubbles') {
yy = ((it.y - F.t * it.sp) % (H + 120) + (H + 120)) % (H + 120) - 60;
xx = it.x + Math.sin(F.t * 0.8 + it.ph) * it.sway;
ctx.globalAlpha = 0.46 * inten;
ctx.strokeStyle = 'rgba(255,255,255,0.92)'; ctx.lineWidth = 2;
ctx.beginPath(); ctx.arc(xx, yy, it.size, 0, Math.PI * 2); ctx.stroke();
var bg = ctx.createRadialGradient(xx - it.size * 0.3, yy - it.size * 0.3, 1, xx, yy, it.size);
bg.addColorStop(0, 'rgba(255,255,255,0.55)');
bg.addColorStop(0.7, hexA(it.color, 0.16));
bg.addColorStop(1, hexA(it.color, 0.34));
ctx.fillStyle = bg;
ctx.beginPath(); ctx.arc(xx, yy, it.size - 1, 0, Math.PI * 2); ctx.fill();
ctx.globalAlpha = 0.72 * inten; ctx.fillStyle = '#FFFFFF';
ctx.beginPath(); ctx.arc(xx - it.size * 0.32, yy - it.size * 0.32, Math.max(1.5, it.size * 0.14), 0, Math.PI * 2); ctx.fill();
} else if (def.mode === 'petals') {
yy = ((it.y + F.t * it.sp * 0.6) % (H + 100) + (H + 100)) % (H + 100) - 50;
xx = it.x + Math.sin(F.t * 0.9 + it.ph) * it.sway;
ctx.globalAlpha = 0.72 * inten;
ctx.save(); ctx.translate(xx, yy); ctx.rotate(it.rot + F.t * it.spin);
ctx.fillStyle = hexA(it.color, 0.92);
petalPath(ctx, it.size * 1.2); ctx.fill();
ctx.restore();
} else if (def.mode === 'snow') {
yy = ((it.y + F.t * it.sp) % (H + 100) + (H + 100)) % (H + 100) - 50;
xx = it.x + Math.sin(F.t * 1.1 + it.ph) * it.sway;
ctx.globalAlpha = 0.92 * inten; ctx.fillStyle = '#FFFFFF';
ctx.shadowColor = 'rgba(120,165,215,0.85)'; ctx.shadowBlur = qShadow(8);
ctx.beginPath(); ctx.arc(xx, yy, it.size * 0.5, 0, Math.PI * 2); ctx.fill();
ctx.shadowBlur = qShadow(0);
ctx.strokeStyle = 'rgba(140,175,215,0.5)'; ctx.lineWidth = 1.2; ctx.stroke();
if (it.size > 8) {
ctx.globalAlpha = 0.5 * inten; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1;
ctx.beginPath(); ctx.moveTo(xx - it.size, yy); ctx.lineTo(xx + it.size, yy);
ctx.moveTo(xx, yy - it.size); ctx.lineTo(xx, yy + it.size); ctx.stroke();
}
} else if (def.mode === 'firefly') {
yy = it.y + Math.sin(F.t * 0.5 + it.ph) * 40;
xx = it.x + Math.sin(F.t * 0.8 + it.ph * 1.6) * it.sway;
var fg = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(F.t * 2.2 + it.ph * 3));
ctx.globalAlpha = fg * inten;
ctx.fillStyle = it.color; ctx.shadowColor = it.color; ctx.shadowBlur = qShadow(16);
ctx.beginPath(); ctx.arc(xx, yy, it.size, 0, Math.PI * 2); ctx.fill();
ctx.shadowBlur = qShadow(0);
} else {
yy = ((it.y - F.t * it.sp * 0.5) % (H + 120) + (H + 120)) % (H + 120) - 60;
xx = it.x + Math.sin(F.t * 0.7 + it.ph) * it.sway;
ctx.globalAlpha = 0.42 * inten;
ctx.save(); ctx.translate(xx, yy); ctx.rotate(it.rot + F.t * it.spin * 0.5);
ctx.fillStyle = hexA(it.color, 0.95);
var sz = it.size * 1.15;
ctx.beginPath();
if (it.shape === 0) { ctx.moveTo(-sz, sz * 0.6); ctx.lineTo(sz, sz * 0.6); ctx.lineTo(0, -sz); }
else if (it.shape === 1) { ctx.rect(-sz * 0.7, -sz * 0.7, sz * 1.4, sz * 1.4); }
else { ctx.moveTo(-sz, sz * 0.5); ctx.lineTo(sz * 0.6, sz * 0.5); ctx.lineTo(sz, -sz * 0.5); ctx.lineTo(-sz * 0.6, -sz * 0.5); }
ctx.closePath(); ctx.fill();
ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.stroke();
ctx.restore();
}
}
ctx.globalAlpha = 1; ctx.shadowBlur = qShadow(0);
}
ctx.restore();
}
function drawFxDarkBase(mode) {
var W = C.DESIGN.w, H = DH();
var g = ctx.createLinearGradient(0, 0, W * 0.3, H);
if (mode === 'nebula') {
g.addColorStop(0, '#1A1038'); g.addColorStop(0.55, '#120E2C'); g.addColorStop(1, '#070A1C');
} else if (mode === 'firefly') {
g.addColorStop(0, '#0C2230'); g.addColorStop(0.55, '#091C26'); g.addColorStop(1, '#05121A');
} else {
g.addColorStop(0, '#16234A'); g.addColorStop(0.55, '#0E1732'); g.addColorStop(1, '#070B1C');
}
ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
var rg = ctx.createRadialGradient(W * 0.5, H * 0.12, 20, W * 0.5, H * 0.12, H * 0.62);
rg.addColorStop(0, 'rgba(150,180,255,0.14)'); rg.addColorStop(1, 'rgba(150,180,255,0)');
ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
}
function petalPath(c, s) {
c.beginPath();
c.moveTo(0, -s);
c.bezierCurveTo(s * 0.9, -s * 0.5, s * 0.9, s * 0.6, 0, s);
c.bezierCurveTo(-s * 0.9, s * 0.6, -s * 0.9, -s * 0.5, 0, -s);
c.closePath();
}
function hexA(hex, a) {
var h = hex.replace('#', '');
if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
var v = parseInt(h, 16);
return 'rgba(' + ((v >> 16) & 255) + ',' + ((v >> 8) & 255) + ',' + (v & 255) + ',' + a + ')';
}
function drawBg(withArt) {
var fx = withArt && !state.reduceMotion;
var t = state.time / 1000;
var img = withArt && !state.darkUi && env.images && env.images.home_bg_desk;
var bgh = DH();
if (img) {
var sc = Math.max(C.DESIGN.w / (img.width || 1), bgh / (img.height || 1)) * (fx ? 1.06 : 1);
var dw = (img.width || 1) * sc, dh = (img.height || 1) * sc;
var dx = (C.DESIGN.w - dw) / 2 + (fx ? Math.sin(t * 0.26) * 22 : 0);
var dy = (bgh - dh) / 2 + (fx ? Math.cos(t * 0.19) * 18 : 0);
ctx.drawImage(img, dx, dy, dw, dh);
if (COL.tint) { ctx.fillStyle = COL.tint; ctx.fillRect(0, 0, C.DESIGN.w, bgh); }
} else {
ctx.fillStyle = grad('bg|' + (state.save.skin || '') + '|' + Math.round(bgh), function () {
var g = ctx.createLinearGradient(0, 0, 0, bgh);
g.addColorStop(0, COL.bgTop || COL.card || '#FBF3E6');
g.addColorStop(0.45, COL.bg);
g.addColorStop(1, COL.bgDeep);
return g;
});
ctx.fillRect(0, 0, C.DESIGN.w, bgh);
var la = state.darkUi ? 0.10 : 0.85;
ctx.fillStyle = grad('bgglow|' + (state.darkUi ? 'd' : 'l'), function () {
var rg = ctx.createRadialGradient(180, 180, 20, 180, 180, 620);
rg.addColorStop(0, 'rgba(255,255,255,' + la + ')');
rg.addColorStop(0.55, 'rgba(255,255,255,' + (la * 0.26).toFixed(3) + ')');
rg.addColorStop(1, 'rgba(255,255,255,0)');
return rg;
});
ctx.fillRect(0, 0, C.DESIGN.w, bgh);
}
if (fx) drawHomeGlow(t, !!state.lowFps);
}
function homeLayout() {
var HL = C.LAYOUT.HOME;
var bottom = Math.max(140, (view.safeBottom || 0) + 40);
var starY = DH() - bottom;
var startY = starY - 86;
var set7Y = startY - (HL.startGap || 126);
var set4Y = set7Y - (HL.setGap || 118);
return { starY: starY, set7Y: set7Y, set4Y: set4Y, startY: startY,
shift: Math.max(0, startY - HL.startY) };
}
function renderHome() {
drawBg(true);
drawFxLayer(state.time / 1000, state.dt || 16);
var t = state.time / 1000;
var float = Math.sin(t * 1.4) * 3;
var HL = homeLayout();
var starY = HL.starY, set7Y = HL.set7Y, set4Y = HL.set4Y, startY = HL.startY;
var homeShift = HL.shift;
var V = C.HOME_VFX || {};
ctx.save();
var titleScale = 1 + 0.012 * Math.sin(t * 1.6);
ctx.translate(C.DESIGN.w / 2, 412 + float);
ctx.scale(titleScale, titleScale);
if (V.titleGlow !== false) {
ctx.shadowColor = V.titleGlowColor || 'rgba(255,255,255,0.55)';
ctx.shadowBlur = qShadow(22);
}
ctx.font = '700 78px ' + (V.titleFontFamily || '"STCaiyun","华文彩云",serif');
ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
ctx.lineJoin = 'round';
if (V.titleStroke) {
ctx.lineWidth = V.titleStroke;
ctx.strokeStyle = V.titleStrokeColor || '#141821';
ctx.strokeText(C.BRAND.name, 0, 0);
}
ctx.shadowBlur = qShadow(0);
ctx.fillStyle = V.titleFill || '#FFFFFF';
ctx.fillText(C.BRAND.name, 0, 0);
ctx.restore();
text(C.BRAND.slogan, C.DESIGN.w / 2, 480 + float, 26, COL.textSub, 'center');
var deco = C.HOME_DECO;
var decoX = C.DESIGN.w / 2 + deco.cxOff, decoY = deco.cy + float + homeShift * 0.45;
if (V.decoHalo !== false && !state.reduceMotion) {
ctx.save();
var halo = ctx.createRadialGradient(decoX, decoY + 20, 20, decoX, decoY + 20, 300);
halo.addColorStop(0, hexA(COL.gold || '#FFB93D', 0.16));
halo.addColorStop(1, hexA(COL.gold || '#FFB93D', 0));
ctx.fillStyle = halo;
ctx.fillRect(decoX - 320, decoY - 300, 640, 640);
var sn = V.decoSparkN || 10;
for (var q = 0; q < sn; q++) {
var qa = (q / sn) * Math.PI * 2 + t * 0.35;
var qr = 210 + Math.sin(t * 1.2 + q) * 22;
var qx = decoX + Math.cos(qa) * qr * 1.05;
var qy = decoY + Math.sin(qa) * qr * 0.52 + 20;
var qa2 = 0.35 + 0.5 * (0.5 + 0.5 * Math.sin(t * 2 + q * 1.7));
ctx.globalAlpha = qa2;
ctx.fillStyle = q % 2 ? '#FFFFFF' : (COL.gold || '#FFB93D');
var qs = q % 3 === 0 ? 4 : 2.4;
ctx.beginPath(); ctx.arc(qx, qy, qs, 0, Math.PI * 2); ctx.fill();
}
ctx.restore();
}
for (var i = 0; i < deco.pieces.length; i++) {
var d = deco.pieces[i];
var bob = Math.sin(t * 1.1 + i * 0.9) * 3;
ctx.save();
ctx.translate(C.DESIGN.w / 2 + deco.cxOff, decoY + bob);
ctx.beginPath();
for (var k = 0; k < d.pts.length; k++) {
if (k === 0) ctx.moveTo(d.pts[k][0], d.pts[k][1]);
else ctx.lineTo(d.pts[k][0], d.pts[k][1]);
}
ctx.closePath();
shadow(12, 4, 'rgba(44,58,75,0.13)');
ctx.fillStyle = d.c;
ctx.fill();
noShadow();
ctx.lineWidth = 2;
ctx.strokeStyle = 'rgba(255,255,255,0.6)';
ctx.stroke();
ctx.restore();
}
var HU = C.LAYOUT.HUD;
var hy = view.safeTop + HU.y0;
var ey = hy + HU.rowGap;
var coinLabel = String(state.save.coin || 0);
var energyLabel = (state.save.energy || 0) + '/' + state.save.energyMax;
ctx.font = font(HU.fontSize, HU.fontWeight);
var pwCoin = HU.padL + meas(coinLabel) + HU.padR;
var pwEnergy = HU.padL + meas(energyLabel) + HU.plusPad;
var pillW = Math.max(pwCoin, pwEnergy, HU.pillMinW);
var hudIconX = HU.rightAnchor
? (C.DESIGN.w - HU.rightPad - HU.pillDx - pillW)
: HU.iconX;
function hudPill(iconName, iconColor, iconScale, label, rowY) {
var px = hudIconX + HU.pillDx;
var pw = pillW;
var ph = HU.pillH;
ctx.save();
shadow(10, 4, 'rgba(44,58,75,0.22)');
rr(px, rowY - ph / 2, pw, ph, ph / 2);
ctx.fillStyle = (state.darkUi && HU.pillFillDark) ? HU.pillFillDark : HU.pillFill;
ctx.fill();
noShadow();
ctx.lineWidth = HU.border;
ctx.strokeStyle = HU.pillStroke;
ctx.stroke();
ctx.restore();
drawIcon(iconName, hudIconX, rowY, iconColor, iconScale);
text(label, px + HU.padL, rowY + 1, HU.fontSize, HU.textColor, 'left', HU.fontWeight);
return px + pw;
}
hudPill('coin', COL.gold, HU.coinScale, coinLabel, hy);
var energyRight = hudPill('energy', '#3DBEF0', HU.energyScale, energyLabel, ey);
var pcx = energyRight - HU.plusInset, pcy = ey, pr = HU.plusR;
ctx.save();
shadow(8, 3, 'rgba(38,150,86,0.38)');
ctx.beginPath(); ctx.arc(pcx, pcy, pr, 0, Math.PI * 2);
ctx.fillStyle = HU.plusFill;
ctx.fill();
noShadow();
ctx.lineWidth = 2;
ctx.strokeStyle = 'rgba(255,255,255,0.85)';
ctx.stroke();
ctx.restore();
drawIcon('plus', pcx, pcy, '#FFFFFF', 0.5);
addHit(pcx, pcy, HU.plusHit, HU.plusHit, 'hud_energy');
var H = C.LAYOUT.HOME;
function homeEntry(id, icon, label, ex, eyy, badge) {
if (V.ringPulseMs && !state.reduceMotion) {
var ph2 = (state.time % V.ringPulseMs) / V.ringPulseMs;
var wave = 0.5 + 0.5 * Math.sin(ph2 * Math.PI * 2 - eyy / 90);
ctx.save();
ctx.shadowColor = hexA(COL.gold || '#FFB93D', 0.35 + wave * 0.3);
ctx.shadowBlur = qShadow(8 + wave * 14);
rr(ex - H.entryW / 2, eyy - H.entryW / 2, H.entryW, H.entryW, 24);
ctx.fillStyle = COL.card; ctx.fill();
ctx.restore();
}
var eb = { id: id, x: ex, y: eyy, w: H.entryW, h: H.entryW, variant: 'tool', icon: icon };
addHit(ex, eyy, H.entryW, H.entryW, id);
drawButton(eb);
text(label, ex, eyy + H.labelDy, H.labelSize, COL.textSub, 'center', '500');
if (badge) {
ctx.beginPath(); ctx.arc(ex + 36, eyy - 36, 8, 0, Math.PI * 2);
ctx.fillStyle = '#FF5A5A'; ctx.fill();
}
}
var lx = H.entryX, rx = C.DESIGN.w - H.entryX, e0 = H.entryY0, eg = H.entryGap;
homeEntry('entry_skin', 'skin', '皮肤', lx, e0);
homeEntry('entry_invite', 'invite', '邀请有礼', lx, e0 + eg, inviteHasNews());
homeEntry('entry_rank', 'rank', '排行榜', rx, e0);
var oReady = onlineClaimCount();
homeEntry('online_claim', 'online', '在线奖励', rx, e0 + eg * 1.5);
var otxt = oReady > 0 ? ('可领 ' + oReady) : onlineClock(onlineSecNow());
var bbx = rx, bby = e0 + eg * 1.5 - 70, bw2 = 92, bh2 = 36;
ctx.save();
rr(bbx - bw2 / 2, bby - bh2 / 2, bw2, bh2, bh2 / 2);
ctx.fillStyle = oReady > 0 ? '#FF5A5A' : 'rgba(255,255,255,0.95)';
ctx.fill();
noShadow();
ctx.restore();
text(otxt, bbx, bby, 19, oReady > 0 ? '#FFFFFF' : COL.goldDeep, 'center', '700');
var startLabel = state.save.unlockedMax > 1
? '继续 第 ' + Math.min(state.save.unlockedMax, LEVELS.length) + ' 关'
: '开始';
var b1 = { id: 'start', x: C.DESIGN.w / 2, y: startY, w: 420, h: 108, label: startLabel, variant: 'primary', size: 32 };
addHit(b1.x, b1.y, b1.w, b1.h, 'start');
drawButton(b1);
if (V.btnShineMs && !state.reduceMotion) {
var shinePh = (state.time % V.btnShineMs) / V.btnShineMs;
var sx0 = b1.x - b1.w / 2 - 90 + shinePh * (b1.w + 180);
ctx.save();
rr(b1.x - b1.w / 2, b1.y - b1.h / 2, b1.w, b1.h, b1.h / 2); ctx.clip();
var sg = ctx.createLinearGradient(sx0 - 60, 0, sx0 + 60, 0);
sg.addColorStop(0, 'rgba(255,255,255,0)');
sg.addColorStop(0.5, 'rgba(255,255,255,0.42)');
sg.addColorStop(1, 'rgba(255,255,255,0)');
ctx.fillStyle = sg;
ctx.save(); ctx.rotate(-0.14);
ctx.fillRect(sx0 - 80, b1.y - b1.h, 160, b1.h * 3);
ctx.restore();
ctx.restore();
}
var SET_PIECE_COLORS = ['#4FA8E0', '#63C88B', '#FF8A5B', '#A87BE8', '#F5C84D', '#EE7FA8', '#59C7C0'];
function setFacet(pts, color) {
ctx.beginPath();
ctx.moveTo(pts[0][0], pts[0][1]);
for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
ctx.closePath();
ctx.fillStyle = color; ctx.fill();
ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
ctx.strokeStyle = 'rgba(255,255,255,0.92)'; ctx.stroke();
}
function setBadge(kind, cx, cy, s) {
var r = s / 2;
ctx.save(); ctx.translate(cx, cy);
ctx.beginPath(); rr(-r - 8, -r - 8, s + 16, s + 16, 14);
ctx.fillStyle = 'rgba(255,255,255,0.82)'; ctx.fill();
ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(150,168,205,0.45)'; ctx.stroke();
if (kind === 't4') {
setFacet([[0, -r], [r, 0], [0, 0]], SET_PIECE_COLORS[0]);
setFacet([[0, -r], [-r, 0], [0, 0]], SET_PIECE_COLORS[1]);
setFacet([[-r, 0], [0, r], [0, 0]], SET_PIECE_COLORS[2]);
setFacet([[r, 0], [0, r], [0, 0]], SET_PIECE_COLORS[3]);
} else {
setFacet([[-r, -r], [0, -r], [-r, 0]], SET_PIECE_COLORS[0]);
setFacet([[0, -r], [0, 0], [-r, 0]], SET_PIECE_COLORS[1]);
setFacet([[0, -r], [r, -r], [r, 0]], SET_PIECE_COLORS[2]);
setFacet([[0, -r], [r, 0], [0, 0]], SET_PIECE_COLORS[3]);
setFacet([[-r, 0], [0, 0], [-r, r]], SET_PIECE_COLORS[4]);
setFacet([[0, 0], [0, r], [-r, r]], SET_PIECE_COLORS[5]);
setFacet([[0, 0], [r, 0], [r, r], [0, r]], SET_PIECE_COLORS[6]);
}
ctx.restore();
}
function setEntryLabel(label, x, y, sel, size) {
var dark = state.darkUi || state.darkFx;
ctx.save();
ctx.font = '700 ' + (size || 38) + 'px ' + (V.titleFontFamily || '"STCaiyun","华文彩云",serif');
ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
ctx.lineWidth = 3; ctx.lineJoin = 'round';
ctx.strokeStyle = dark ? 'rgba(18,24,34,0.55)' : 'rgba(255,255,255,0.9)';
ctx.strokeText(label, x, y);
ctx.fillStyle = dark ? (sel ? '#F3C87E' : '#DCE6F5') : (sel ? '#7A4A00' : '#3E4C60');
ctx.fillText(label, x, y);
ctx.restore();
}
function setEntry(id, key, kind, yy) {
var sel = state.setKey === key;
var dark = state.darkUi || state.darkFx;
var w = H.setW || 408, h = H.setH || 100, x = C.DESIGN.w / 2;
addHit(x, yy, w, h, id);
ctx.save();
ctx.shadowColor = sel ? hexA(COL.gold || '#FFB93D', dark ? 0.34 : 0.5) : (dark ? 'rgba(0,0,0,0.34)' : 'rgba(40,50,80,0.20)');
ctx.shadowBlur = qShadow(sel ? 26 : 14); ctx.shadowOffsetY = 5;
var g = ctx.createLinearGradient(x - w / 2, yy - h / 2, x + w / 2, yy + h / 2);
if (dark) {
if (sel) { g.addColorStop(0, '#4A4334'); g.addColorStop(1, '#3A3427'); }
else { g.addColorStop(0, '#323B4A'); g.addColorStop(1, '#28303D'); }
} else if (sel) { g.addColorStop(0, '#FFFDF6'); g.addColorStop(1, '#FFE9C4'); }
else { g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, '#EDF1FA'); }
rr(x - w / 2, yy - h / 2, w, h, 24); ctx.fillStyle = g; ctx.fill();
ctx.shadowBlur = qShadow(0); ctx.shadowOffsetY = 0;
ctx.save(); rr(x - w / 2 + 3, yy - h / 2 + 3, w - 6, h - 6, 21); ctx.clip();
var hl = ctx.createLinearGradient(0, yy - h / 2, 0, yy + h / 2);
if (dark) {
hl.addColorStop(0, 'rgba(255,255,255,0.10)'); hl.addColorStop(0.45, 'rgba(255,255,255,0.02)');
hl.addColorStop(1, 'rgba(0,0,0,0.10)');
} else {
hl.addColorStop(0, 'rgba(255,255,255,0.85)'); hl.addColorStop(0.45, 'rgba(255,255,255,0.05)');
hl.addColorStop(1, 'rgba(0,0,0,0.04)');
}
ctx.fillStyle = hl; ctx.fillRect(x - w / 2, yy - h / 2, w, h);
ctx.restore();
rr(x - w / 2, yy - h / 2, w, h, 24);
ctx.lineWidth = sel ? 4 : 2;
ctx.strokeStyle = sel ? (COL.goldEdge || '#E5962D')
: (dark ? 'rgba(160,178,205,0.42)' : 'rgba(150,168,205,0.55)');
ctx.stroke();
ctx.restore();
setBadge(kind, x - 134, yy, 58);
setEntryLabel(kind === 't4' ? '四巧板' : '七巧板', x - 76, yy + 1, sel, 38);
if (sel) {
var px = x + w / 2 - 52;
ctx.save();
ctx.beginPath(); ctx.arc(px, yy, 13, 0, Math.PI * 2);
ctx.fillStyle = hexA(COL.gold || '#FFB93D', 0.22); ctx.fill();
drawIcon('check', px, yy, COL.goldEdge || '#E5962D', 0.52);
ctx.restore();
}
}
setEntry('set_t4', 'tangram4', 't4', set4Y);
setEntry('set_t7', 'tangram7', 't7', set7Y);
homeEntry('settings', 'gear', '设置', rx, e0 + eg * 3);
text('已获得 ' + totalStars() + '/' + (LEVELS.length * 3) + ' 星', C.DESIGN.w / 2, starY, 24, COL.textSub, 'center');
}
function chapterInfo(c) {
if (CHAP_LIST && CHAP_LIST[c]) {
var it = CHAP_LIST[c];
var from0 = Math.max(0, (it.from || 1) - 1);
var cnt = it.count || (LEVELS.length - from0);
return {
from: from0, count: Math.min(cnt, LEVELS.length - from0),
name: it.name || CHAP_NAMES[c] || ('第 ' + (c + 1) + ' 章'),
title: it.title || null
};
}
var f = c * CHAP_PER;
return {
from: f, count: Math.max(0, Math.min(CHAP_PER, LEVELS.length - f)),
name: CHAP_NAMES[c] || ('第 ' + (c + 1) + ' 章'),
title: (CHAP_TITLES && CHAP_TITLES[c]) || null
};
}
function chapterCount() {
if (CHAP_LIST && CHAP_LIST.length) return CHAP_LIST.length;
return Math.max(1, Math.ceil(LEVELS.length / CHAP_PER));
}
function chapterOf(idx) {
var n = chapterCount();
for (var c = 0; c < n; c++) {
var ci = chapterInfo(c);
if (idx >= ci.from && idx < ci.from + ci.count) return c;
}
return 0;
}
function chapterName(c) {
return chapterInfo(c).name;
}
function drawLevelThumb(outline, cx, cy, maxW, maxH, fill, edge, holes) {
if (!outline || outline.length < 3) return;
var bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
for (var i = 0; i < outline.length; i++) {
var v = outline[i];
if (v[0] < bx0) bx0 = v[0];
if (v[0] > bx1) bx1 = v[0];
if (v[1] < by0) by0 = v[1];
if (v[1] > by1) by1 = v[1];
}
var bw = bx1 - bx0, bh = by1 - by0;
if (!(bw > 0) || !(bh > 0)) return;
var s = Math.min(maxW / bw, maxH / bh);
var ox = cx - bw * s / 2, oy = cy - bh * s / 2;
ctx.save();
ctx.beginPath();
for (var j = 0; j < outline.length; j++) {
var px = ox + (outline[j][0] - bx0) * s;
var py = oy + (outline[j][1] - by0) * s;
if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
}
ctx.closePath();
var hs = holes || [];
for (var m2 = 0; m2 < hs.length; m2++) {
var hr2 = hs[m2];
if (!hr2 || hr2.length < 3) continue;
ctx.moveTo(ox + (hr2[0][0] - bx0) * s, oy + (hr2[0][1] - by0) * s);
for (var n2 = 1; n2 < hr2.length; n2++) {
ctx.lineTo(ox + (hr2[n2][0] - bx0) * s, oy + (hr2[n2][1] - by0) * s);
}
ctx.closePath();
}
ctx.fillStyle = fill;
if (hs.length) ctx.fill('evenodd'); else ctx.fill();
ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
ctx.strokeStyle = edge; ctx.stroke();
ctx.restore();
}
function renderLevels() {
drawBg(false);
drawFxLayer(state.time / 1000, state.dt || 16, 0.55);
var by = view.safeTop + 40;
var bb = { id: 'back_home', x: 70, y: by + 8, w: 76, h: 76, variant: 'tool', icon: 'back' };
addHit(bb.x, bb.y, bb.w, bb.h, 'back_home');
drawButton(bb);
text('关卡', C.DESIGN.w / 2, by + 8, 40, COL.text, 'center', '600');
var nCh = chapterCount();
var page = Math.max(0, Math.min(state.lvPage || 0, nCh - 1));
state.lvPage = page;
var CH = chapterInfo(page);
var ph = 64;
var pgap = nCh > 7 ? 6 : 10;
var avail = C.DESIGN.w - 32;
var pw = Math.min(nCh <= 3 ? 148 : 96, Math.floor((avail - (nCh - 1) * pgap) / nCh));
var ptotal = nCh * pw + (nCh - 1) * pgap;
var px0 = (C.DESIGN.w - ptotal) / 2 + pw / 2;
var py = view.safeTop + 96 + ph / 2;
for (var c = 0; c < nCh; c++) {
var pcx = px0 + c * (pw + pgap);
var on = c === page;
var pressed = state.press === 'lvpage_' + c;
ctx.save();
rr(pcx - pw / 2, py - ph / 2 + (pressed ? 2 : 0), pw, ph, ph / 2);
ctx.fillStyle = on ? COL.gold : COL.card;
ctx.fill();
if (!on) { ctx.lineWidth = 2; ctx.strokeStyle = COL.line; ctx.stroke(); }
ctx.restore();
var ci = chapterInfo(c);
var lbl = ci.title || ci.name;
var fSize = lbl.length > 3 ? 20 : 24;
text(lbl, pcx, py, fSize, on ? COL.btnText : COL.textSub, 'center', '600');
addHit(pcx, py, pw, ph, 'lvpage_' + c, 'btn');
}
var capTxt = (CH.name === CH.title || !CH.title)
? ('第 ' + (page + 1) + ' 章 · ' + CH.name + '　' + (CH.from + 1) + '-' + (CH.from + CH.count) + ' 关')
: (CH.name + '　' + (CH.from + 1) + '-' + (CH.from + CH.count) + ' 关');
text(capTxt, C.DESIGN.w / 2, py + ph / 2 + 34, 24, COL.textSub, 'center');
var cols = 4, cw = 160, chh = 196, gx = 16, gy2 = 16;
var n = CH.count;
var totalW = cols * cw + (cols - 1) * gx;
var x0 = (C.DESIGN.w - totalW) / 2 + cw / 2;
var viewTop = py + ph / 2 + 56;
var viewBot = C.DESIGN.h - (view.safeBottom || 0) - 24;
var viewH = Math.max(120, viewBot - viewTop);
var rows = Math.ceil(n / cols);
var contentH = rows * chh + Math.max(0, rows - 1) * gy2;
var canScroll = contentH > viewH + 1;
state.lvScrollMax = canScroll ? (contentH - viewH) : 0;
if (!(state.lvScroll > 0)) state.lvScroll = 0;
if (state.lvScroll > state.lvScrollMax) state.lvScroll = state.lvScrollMax;
state.lvView = canScroll ? { x: 0, y: viewTop, w: C.DESIGN.w, h: viewH } : null;
var sc = state.lvScroll || 0;
ctx.save();
if (canScroll) {
ctx.beginPath();
ctx.rect(0, viewTop, C.DESIGN.w, viewH);
ctx.clip();
}
for (var i = 0; i < n; i++) {
var idx = CH.from + i;
var cx = x0 + (i % cols) * (cw + gx);
var cy = viewTop - sc + chh / 2 + Math.floor(i / cols) * (chh + gy2);
if (canScroll && (cy + chh / 2 < viewTop - 8 || cy - chh / 2 > viewBot + 8)) continue;
var locked = (idx + 1) > state.save.unlockedMax;
var press = state.press === 'lvl_' + (idx + 1);
var tk = Math.max(0, Math.min(1, (state.pageT - i * 24) / 240));
tk = 1 - (1 - tk) * (1 - tk);
var cellY = cy + (1 - tk) * 12;
ctx.save();
ctx.globalAlpha = tk;
cardBox(cx - cw / 2, cellY - chh / 2 + (press ? 2 : 0), cw, chh, C.CARD.radius,
{ fill: locked ? COL.disabledBg : COL.card });
var lv = LEVELS[idx];
drawLevelThumb(lv.outline, cx, cellY - 30, 116, 104,
locked ? COL.disabledIcon : COL.targetFill,
locked ? COL.textSub : COL.targetEdge, lv.holes);
if (locked) {
drawIcon('lock', cx, cellY + 46, COL.disabledIcon, 0.8);
} else {
var stars = state.save.starOf[String(idx + 1)] || 0;
for (var s = 0; s < 3; s++) {
drawStar(cx - 40 + s * 40, cellY + 48, 17, s < stars);
}
if (stars > 0 && stars < 3) {
var SRt = C.ECON.starReward;
var sp = state.save.starPaid || {};
var paidN = (typeof sp[String(idx + 1)] === 'number')
? sp[String(idx + 1)] : (SRt[stars - 1] || 0);
var rest = Math.max(0, (SRt[stars] || 0) - paidN);
if (rest > 0) drawStarGainTag(cx + 46, cellY + 82, rest);
}
}
text(String(idx + 1), cx, cellY + 82, 18, COL.textSub, 'center', '600');
ctx.restore();
if (canScroll && (cellY + chh / 2 < viewTop + 4 || cellY - chh / 2 > viewBot - 4)) continue;
addHit(cx, cellY, cw, chh, 'lvl_' + (idx + 1), 'btn');
}
ctx.restore();
if (canScroll) {
var trackX = C.DESIGN.w - 14, trackY = viewTop + 8, trackH = viewH - 16;
var th = Math.max(48, trackH * viewH / contentH);
var ty = trackY + (trackH - th) * (sc / (contentH - viewH || 1));
ctx.save();
rr(trackX - 3, trackY, 6, trackH, 3);
ctx.fillStyle = state.darkUi ? 'rgba(255,255,255,0.10)' : 'rgba(44,58,75,0.06)';
ctx.fill();
rr(trackX - 3, ty, 6, th, 3);
ctx.fillStyle = state.darkUi ? 'rgba(255,255,255,0.34)' : 'rgba(44,58,75,0.22)';
ctx.fill();
ctx.restore();
}
}
function drawStarGainTag(x, y, n) {
var t = '↑' + n, h = 20;
ctx.font = font(15, '700');
var w = Math.max(32, meas(t) + 14);
ctx.save();
rr(x - w / 2, y - h / 2, w, h, h / 2);
ctx.fillStyle = 'rgba(233,177,106,0.18)';
ctx.fill();
ctx.lineWidth = 1.2;
ctx.strokeStyle = 'rgba(233,177,106,0.55)';
ctx.stroke();
ctx.restore();
text(t, x, y + 1, 15, state.darkUi ? COL.gold : COL.goldDeep, 'center', '700');
}
function starTag(r) {
var n = Math.max(1, Math.min(3, (r && (r.bestStars || r.stars)) || 1));
var t = '';
for (var i = 0; i < n; i++) t += '★';
return t;
}
function shortNum(n) {
n = Math.max(0, Math.floor(n || 0));
if (n < 10000) return String(n);
if (n < 100000000) {
return (n / 10000).toFixed(n < 100000 ? 1 : 0).replace(/\.0$/, '') + '万';
}
return (n / 100000000).toFixed(1).replace(/\.0$/, '') + '亿';
}
function playHud(cy) {
var M = C.LAYOUT.HUD_MIN, s = state.save;
var rows = [
{ icon: 'coin', color: COL.gold, scale: M.coinScale, num: shortNum(s.coin), sub: '' },
{ icon: 'energy', color: '#3DBEF0', scale: M.energyScale,
num: shortNum(s.energy), sub: '/' + s.energyMax }
];
var ratio = M.subFontSize / M.fontSize;
var fsz = M.fontSize, wEach = 0, guard = 0;
while (guard++ < 20) {
wEach = 0;
for (var i = 0; i < rows.length; i++) {
ctx.font = font(fsz, M.fontWeight);
var w = M.padL + meas(rows[i].num) + M.padR;
if (rows[i].sub) {
ctx.font = font(Math.max(12, Math.round(fsz * ratio)), M.fontWeight);
w += meas(rows[i].sub);
}
if (w > wEach) wEach = w;
}
if (wEach <= M.maxW || fsz <= M.minFontSize) break;
fsz -= 2;
}
var x = M.rightAnchor ? (C.DESIGN.w - M.rightPad - wEach) : M.left;
var ph = M.pillH;
var subFs = Math.max(12, Math.round(fsz * ratio));
for (var k = 0; k < rows.length; k++) {
var r = rows[k], rowY = cy - (M.topShift || 0) + (k - 0.5) * M.rowGap;
ctx.save();
shadow(8, 3, 'rgba(44,58,75,0.20)');
rr(x, rowY - ph / 2, wEach, ph, ph / 2);
ctx.fillStyle = (state.darkUi && M.pillFillDark) ? M.pillFillDark : M.pillFill;
ctx.fill();
noShadow();
ctx.lineWidth = M.border;
ctx.strokeStyle = M.pillStroke;
ctx.stroke();
ctx.restore();
drawIcon(r.icon, x + M.iconInset, rowY, r.color, r.scale);
text(r.num, x + M.padL, rowY + 1, fsz, M.textColor, 'left', M.fontWeight);
if (r.sub) {
ctx.save();
ctx.font = font(fsz, M.fontWeight);
var nw = meas(r.num);
ctx.restore();
text(r.sub, x + M.padL + nw + 1, rowY + 2, subFs,
'rgba(255,255,255,0.72)', 'left', M.fontWeight);
}
}
}
var TUT_ICON = { drag: '拖', rot: '转', flip: '翻' };
function drawTutGhost(lv) {
var T = C.TUTORIAL, step = tutStep(), i;
for (i = 0; i < lv.solution.length; i++) {
var st = lv.solution[i], p = pieceOf(st.id);
if (pieceSolved(p, st)) continue;
var gp = G.toWorld(LOCAL[st.id], st).map(function (v) { return [w2d(v[0]), h2d(v[1])]; });
var isCur = !!(step && step.id === st.id && step.kind === 'drag');
var ga = isCur
? (T.ghostAlpha + 0.10 + 0.06 * Math.sin(state.time / 220))
: T.ghostAlpha;
ctx.save();
ctx.beginPath();
ctx.moveTo(gp[0][0], gp[0][1]);
for (var gi = 1; gi < gp.length; gi++) ctx.lineTo(gp[gi][0], gp[gi][1]);
ctx.closePath();
ctx.globalAlpha = ga;
ctx.fillStyle = DS.pieces[st.id].color;
ctx.fill();
ctx.globalAlpha = isCur ? 0.95 : 0.55;
ctx.lineWidth = isCur ? 3 : 2;
ctx.setLineDash([8, 6]);
ctx.strokeStyle = isCur ? COL.goldDeep : COL.gold;
ctx.stroke();
ctx.setLineDash([]);
ctx.restore();
}
}
function drawTutIcon(kind, cx, cy, r) {
ctx.save();
ctx.translate(cx, cy);
ctx.lineCap = 'round';
ctx.lineJoin = 'round';
ctx.strokeStyle = COL.goldDeep;
ctx.fillStyle = COL.goldDeep;
ctx.lineWidth = Math.max(2.4, r * 0.16);
if (kind === 'rot') {
ctx.beginPath();
ctx.arc(0, 0, r * 0.78, -0.5, 4.3);
ctx.stroke();
var ax = Math.cos(-0.5) * r * 0.78, ay = Math.sin(-0.5) * r * 0.78;
ctx.beginPath();
ctx.moveTo(ax - r * 0.34, ay - r * 0.06);
ctx.lineTo(ax + r * 0.18, ay + r * 0.24);
ctx.lineTo(ax + r * 0.06, ay - r * 0.36);
ctx.closePath();
ctx.fill();
} else if (kind === 'flip') {
ctx.beginPath();
ctx.moveTo(-r * 0.62, -r * 0.26); ctx.lineTo(r * 0.58, -r * 0.26);
ctx.stroke();
ctx.beginPath();
ctx.moveTo(r * 0.62, r * 0.26); ctx.lineTo(-r * 0.58, r * 0.26);
ctx.stroke();
ctx.beginPath();
ctx.moveTo(r * 0.62, -r * 0.26); ctx.lineTo(r * 0.24, -r * 0.56);
ctx.lineTo(r * 0.24, r * 0.04);
ctx.closePath(); ctx.fill();
ctx.beginPath();
ctx.moveTo(-r * 0.62, r * 0.26); ctx.lineTo(-r * 0.24, r * 0.56);
ctx.lineTo(-r * 0.24, -r * 0.04);
ctx.closePath(); ctx.fill();
} else {
var q = r * 0.72, gap = r * 0.30;
ctx.fillStyle = COL.gold;
ctx.strokeStyle = COL.goldDeep;
ctx.lineWidth = Math.max(2, r * 0.11);
rr(-gap - q, -q / 2, q, q, q * 0.2);
ctx.fill();
ctx.stroke();
var ax0 = -gap + r * 0.04, ax1 = gap - r * 0.04;
ctx.beginPath();
ctx.moveTo(ax0, 0); ctx.lineTo(ax1, 0);
ctx.stroke();
ctx.beginPath();
ctx.moveTo(ax1 + r * 0.02, 0);
ctx.lineTo(ax1 - r * 0.26, -r * 0.22);
ctx.lineTo(ax1 - r * 0.26, r * 0.22);
ctx.closePath();
ctx.fillStyle = COL.goldDeep;
ctx.fill();
ctx.save();
ctx.setLineDash([q * 0.30, q * 0.24]);
ctx.lineWidth = Math.max(1.8, r * 0.10);
ctx.strokeStyle = COL.goldDeep;
rr(gap, -q / 2, q, q, q * 0.2);
ctx.stroke();
ctx.restore();
}
ctx.restore();
}
function drawTutFocus() {
var step = tutStep();
if (!step) return;
var p = pieceOf(step.id);
if (!p) return;
var pts = p.onBoard ? piecePolyDesign(p) : trayPoly(p);
if (!pts || !pts.length) return;
var a = 0.55 + 0.30 * Math.sin(state.time / 180);
var minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, i;
for (i = 0; i < pts.length; i++) {
if (pts[i][0] < minX) minX = pts[i][0];
if (pts[i][0] > maxX) maxX = pts[i][0];
if (pts[i][1] < minY) minY = pts[i][1];
if (pts[i][1] > maxY) maxY = pts[i][1];
}
ctx.save();
ctx.beginPath();
for (i = 0; i < pts.length; i++) {
if (i === 0) ctx.moveTo(pts[i][0], pts[i][1]); else ctx.lineTo(pts[i][0], pts[i][1]);
}
ctx.closePath();
ctx.fillStyle = 'rgba(255,185,61,0.14)';
ctx.fill();
ctx.lineWidth = 9;
ctx.strokeStyle = 'rgba(255,255,255,0.92)';
ctx.stroke();
ctx.lineWidth = 4.5;
ctx.strokeStyle = 'rgba(255,159,28,' + a.toFixed(2) + ')';
ctx.stroke();
if (p.onBoard) { ctx.restore(); return; }
var T = C.TUTORIAL, B = LAY.BOARD;
var cx = (minX + maxX) / 2;
var up = (minY - 34) > (B.y + T.textY + 34);
var ay = up ? (minY - 30) : (maxY + 30);
var bob = Math.sin(state.time / 200) * 4;
ctx.beginPath();
if (up) {
ctx.moveTo(cx, ay + 18 + bob);
ctx.lineTo(cx - 16, ay - 8 + bob);
ctx.lineTo(cx + 16, ay - 8 + bob);
} else {
ctx.moveTo(cx, ay - 18 + bob);
ctx.lineTo(cx - 16, ay + 8 + bob);
ctx.lineTo(cx + 16, ay + 8 + bob);
}
ctx.closePath();
ctx.fillStyle = COL.goldDeep;
ctx.fill();
ctx.restore();
}
function drawTutTip(lv) {
var T = C.TUTORIAL, B = LAY.BOARD;
var step = tutStep();
var txt = step ? step.text : '拼好了，点「下一关」继续';
var kind = step ? step.kind : 'drag';
var size = T.textSize, iconW = T.iconR * 2 + 14;
ctx.font = font(size, '600');
var tw = ctx.measureText ? meas(txt) : 300;
var maxW = B.size - 120;
while (tw + iconW > maxW && size > 18) {
size -= 2;
ctx.font = font(size, '600');
tw = ctx.measureText ? meas(txt) : tw;
}
var groupW = iconW + tw;
var gx = C.DESIGN.w / 2 - groupW / 2;
var gy = B.y + T.textY;
ctx.save();
rr(gx - 16, gy - 26, groupW + 32, 52, 26);
ctx.fillStyle = state.darkUi ? 'rgba(12,18,28,0.72)' : 'rgba(255,255,255,0.82)';
ctx.fill();
ctx.restore();
var bob = Math.sin(state.time / 260) * 3;
drawTutIcon(kind, gx + T.iconR, gy + bob, T.iconR);
text(txt, gx + iconW, gy, size, inkOnCard(false), 'left', '600');
var sx = B.x + B.size - T.skipW / 2 - 12, sy = B.y + B.size - 34;
text(T.skipText, sx, sy, 22, inkOnCard(true), 'center', '500');
ctx.save();
ctx.strokeStyle = 'rgba(122,138,156,0.55)';
ctx.lineWidth = 1.5;
ctx.beginPath();
ctx.moveTo(sx - 44, sy + 15); ctx.lineTo(sx + 44, sy + 15);
ctx.stroke();
ctx.restore();
addHit(sx, sy, T.skipW, 72, 'tut_skip');
}
function renderPlay() {
var lv = LEVELS[state.levelIdx];
drawBg(false);
drawFxLayer(state.time / 1000, state.dt || 16, 0.45);
var by = hudAnchorY();
var capW = 240, capH = 56, capCx = C.DESIGN.w / 2, capL = capCx - capW / 2;
var bb = { id: 'back_levels', x: 70, y: 1130, w: 76, h: 76, variant: 'tool', icon: 'back',
tone: { bg1: '#FFF3E6', bg2: '#FFE2C7', edge: '#FFC79E', ink: '#E07B3A' },
iconScale: 0.92 };
if (state.darkUi) bb.tone = { bg1: '#3A3229', bg2: '#2F2921', edge: '#241F19', ink: '#F0A76A' };
addHit(bb.x, bb.y, bb.w, bb.h, 'back_levels');
drawButton(bb);
var leftS = Math.max(0, Math.ceil(state.timeLeft));
var mm = Math.floor(leftS / 60), ss = leftS % 60;
var timeTxt = (mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss;
var warn = leftS <= C.TIMER.warnSec;
ctx.save();
rr(capL, by - capH / 2, capW, capH, capH / 2);
ctx.fillStyle = COL.pillBg || 'rgba(255,255,255,0.86)';
ctx.fill();
ctx.lineWidth = 2;
ctx.strokeStyle = warn ? hexA(COL.dangerText || '#E5484D', 0.55) : COL.cardEdge;
ctx.stroke();
ctx.restore();
var hcnt = C.TIMER.hearts;
for (var hi = 0; hi < hcnt; hi++) {
var hx = capL + 26 + hi * 26;
drawIcon('heart', hx, by, hi < state.hearts ? '#FF5A5A' : (COL.disabledIcon || 'rgba(150,162,180,0.42)'), 0.62);
}
ctx.save();
ctx.font = font(34, '700');
var timeW = ctx.measureText ? meas(timeTxt) : 90;
ctx.restore();
var timeCx = capL + capW - 22 - timeW / 2;
var pl = warn ? (1 + Math.sin(state.time * 0.012) * 0.07) : 1;
ctx.save();
ctx.translate(timeCx, by);
ctx.scale(pl, pl);
text(timeTxt, 0, 0, 34, warn ? (COL.dangerText || '#E5484D') : (COL.pillInk || COL.btnText), 'center', '700');
ctx.restore();
if (state.overlay !== 'fail' && state.overlay !== 'result') playHud(by);
var B = LAY.BOARD;
var BH = B.h || B.size;
ctx.save();
shadow(16, 4, COL.shadow);
rr(B.x, B.y, B.size, BH, 28);
ctx.fillStyle = COL.card; ctx.fill();
noShadow();
ctx.restore();
var paper = env.images && env.images.board_paper;
if (paper && state.darkUi) {
ctx.save(); rr(B.x, B.y, B.size, BH, 28); ctx.clip();
ctx.fillStyle = COL.board; ctx.fillRect(B.x, B.y, B.size, BH);
ctx.strokeStyle = 'rgba(255,255,255,0.035)'; ctx.lineWidth = 1;
var dRows = Math.round(BH / 27);
for (var di = 0; di < dRows; di++) {
var dyy = B.y + 20 + di * 27;
ctx.beginPath(); ctx.moveTo(B.x, dyy); ctx.lineTo(B.x + B.size, dyy + 6); ctx.stroke();
}
ctx.restore();
} else if (paper) {
ctx.save(); rr(B.x, B.y, B.size, BH, 28); ctx.clip();
ctx.drawImage(paper, B.x, B.y, B.size, BH);
ctx.restore();
} else {
ctx.save(); rr(B.x, B.y, B.size, BH, 28); ctx.clip();
var dkPaper = !!state.darkUi;
if (dkPaper) { ctx.fillStyle = COL.board; ctx.fillRect(B.x, B.y, B.size, BH); }
ctx.strokeStyle = dkPaper ? 'rgba(255,255,255,0.035)' : 'rgba(44,58,75,0.022)'; ctx.lineWidth = 1;
var rows = Math.round(BH / 27);
for (var i = 0; i < rows; i++) {
var yy = B.y + 20 + i * 27;
ctx.beginPath(); ctx.moveTo(B.x, yy); ctx.lineTo(B.x + B.size, yy + 6); ctx.stroke();
}
ctx.restore();
}
var headTxt = '第 ' + (state.levelIdx + 1) + ' 关' + (lv.name ? ' · ' + lv.name : '');
var headMax = B.size - 52;
ctx.save();
ctx.font = font(22, '600');
if (ctx.measureText && meas(headTxt) > headMax) {
var hm = headTxt;
while (hm.length > 1 && meas(hm + '…') > headMax) hm = hm.slice(0, -1);
headTxt = hm + '…';
}
ctx.restore();
text(headTxt, B.x + 26, B.y + 32, 22, inkOnCard(true), 'left', '600');
var hasTiersLv = !!(lv.splitLines && lv.splitLines.length);
var drawTier = hasTiersLv ? (state.hintTier || 2) : 1;
var outline = lv.outline.map(function (v) { return [w2d(v[0]), h2d(v[1])]; });
ctx.save();
ctx.beginPath();
ctx.moveTo(outline[0][0], outline[0][1]);
for (var o = 1; o < outline.length; o++) ctx.lineTo(outline[o][0], outline[o][1]);
ctx.closePath();
var holes = lv.holes || [];
for (var hh = 0; hh < holes.length; hh++) {
var hr = holes[hh];
if (!hr || hr.length < 3) continue;
ctx.moveTo(w2d(hr[0][0]), h2d(hr[0][1]));
for (var hk = 1; hk < hr.length; hk++) ctx.lineTo(w2d(hr[hk][0]), h2d(hr[hk][1]));
ctx.closePath();
}
ctx.fillStyle = drawTier === 3 ? COL.targetSilhouette : COL.targetFill;
if (holes.length) ctx.fill('evenodd'); else ctx.fill();
if (drawTier === 1) {
ctx.lineWidth = 3;
ctx.strokeStyle = COL.targetEdge;
ctx.setLineDash([8, 6]);
ctx.stroke();
ctx.setLineDash([]);
} else if (drawTier === 2) {
ctx.lineWidth = 1.5;
ctx.strokeStyle = COL.targetEdge;
ctx.stroke();
}
ctx.restore();
if (state.tut) drawTutGhost(lv);
var dragging = state.drag ? state.drag.id : null;
var boardList = boardByZ();
for (var m = 0; m < boardList.length; m++) {
var p = boardList[m];
if (p.id === dragging) continue;
drawBoardPiece(p);
}
var lvGap = LEVELS[state.levelIdx];
if (lvGap && lvGap.gapFill && lvGap.gapFill.length) {
for (var gi = 0; gi < lvGap.gapFill.length; gi++) {
var gp = lvGap.gapFill[gi];
var gpiece = pieceOf(gp.a);
if (!gpiece || !gpiece.onBoard) continue;
if (!(gpiece.fit || pieceFit(gpiece))) continue;
var gdef = DS.pieces[gp.a];
if (!gdef || !gp.pts || gp.pts.length < 3) continue;
ctx.save();
ctx.beginPath();
for (var gj = 0; gj < gp.pts.length; gj++) {
var gv = gp.pts[gj];
if (gj === 0) ctx.moveTo(w2d(gv[0]), h2d(gv[1]));
else ctx.lineTo(w2d(gv[0]), h2d(gv[1]));
}
ctx.closePath();
ctx.fillStyle = gdef.color;
ctx.fill();
ctx.restore();
}
}
if (state.hint) drawHintGuide(lv);
for (var t = 0; t < state.pieces.length; t++) {
if (!state.pieces[t].onBoard) drawTrayPiece(state.pieces[t]);
}
if (state.hint) drawHintTray();
if (state.tut) drawTutFocus();
if (dragging) {
var dp = pieceOf(dragging);
if (dp) drawBoardPiece(dp);
}
if (!state.win && state.selId) {
var selp = pieceOf(state.selId);
if (selp && selp.onBoard) {
var hpos = handleDesign(selp);
drawRotateHandle(hpos[0], hpos[1]);
}
}
var P = LAY.PROGRESS;
ctx.save();
ctx.strokeStyle = 'rgba(44,58,75,0.065)';
ctx.lineWidth = 1.5;
ctx.beginPath();
ctx.moveTo(B.x + 26, B.y + B.size + 24);
ctx.lineTo(B.x + B.size - 26, B.y + B.size + 24);
ctx.stroke();
ctx.restore();
text('已拼', P.x, P.y + P.h / 2, 26, COL.textSub, 'left');
var px = P.x + 74, pw = P.w - 144;
rr(px, P.y, pw, P.h, P.h / 2);
ctx.fillStyle = COL.track; ctx.fill();
var pct = Math.max(0, Math.min(1, state.cov));
if (pct > 0.001) {
ctx.save();
rr(px, P.y, pw, P.h, P.h / 2); ctx.clip();
ctx.fillStyle = grad('prog|' + Math.round(px) + '|' + Math.round(pw) + '|' +
COL.progressA + COL.progressB, function () {
var pg = ctx.createLinearGradient(px, 0, px + pw, 0);
pg.addColorStop(0, COL.progressA); pg.addColorStop(1, COL.progressB);
return pg;
});
ctx.fillRect(px, P.y, Math.max(P.h, pw * pct), P.h);
ctx.restore();
}
text((state.fitN || 0) + '/' + DS.pieceOrder.length, C.DESIGN.w - 60, P.y + P.h / 2, 26, COL.text, 'right', '600');
if (state.msgT > 0) {
var alpha = Math.min(1, state.msgT / 400);
ctx.save();
ctx.globalAlpha = alpha;
ctx.font = font(26, '500');
var mw = (ctx.measureText ? meas(state.msg) : 200) + 52;
var my = LAY.BOARD.y + LAY.BOARD.size - 60;
rr(C.DESIGN.w / 2 - mw / 2, my - 27, mw, 54, 27);
ctx.fillStyle = 'rgba(44,58,75,0.82)';
ctx.fill();
text(state.msg, C.DESIGN.w / 2, my, 26, '#FFFFFF', 'center', '500');
ctx.restore();
}
if (state.tut) drawTutTip(lv);
var TOOL_TONE = {
rot_ccw: { bg1: '#EAF6FF', bg2: '#D2EAFB', edge: '#AED6F2', ink: '#3E9BD8' },
rot_cw: { bg1: '#E9FBF3', bg2: '#D0F2E4', edge: '#B0E2CF', ink: '#33AC84' },
flip: { bg1: '#F5EFFF', bg2: '#E7DAFE', edge: '#D2BEF7', ink: '#8A68E0' },
hint: { bg1: '#FFF9E4', bg2: '#FFEDBC', edge: '#FFDA8C', ink: '#F2A73B' },
restart: { bg1: '#FFF1EE', bg2: '#FFE0DA', edge: '#FFC7BD', ink: '#EF6F5D' }
};
var TOOL_TONE_DARK = {
rot_ccw: { bg1: '#2B3949', bg2: '#233040', edge: '#1B2532', ink: '#6FC0F0' },
rot_cw: { bg1: '#26382F', bg2: '#1F2E27', edge: '#172420', ink: '#5FD3A6' },
flip: { bg1: '#302B40', bg2: '#272238', edge: '#1E1A2C', ink: '#A98BF0' },
hint: { bg1: '#3A3222', bg2: '#2F291C', edge: '#241F14', ink: '#FFC96B' },
restart: { bg1: '#3B2B28', bg2: '#302320', edge: '#251A18', ink: '#FF8A78' }
};
var sel = pieceOf(state.selId);
var tools = [
{ id: 'rot_ccw', icon: 'rotL', disabled: !sel },
{ id: 'rot_cw', icon: 'rotR', disabled: !sel },
{ id: 'flip', icon: 'flip', disabled: !sel },
{ id: 'hint', icon: 'hint', badge: (state.save.hintItems || 0) },
{ id: 'restart', icon: 'restart', disabled: false }
];
for (var i2 = 0; i2 < tools.length; i2++) {
var tb = {
id: tools[i2].id, x: TOOL_X[i2], y: TOOL_Y,
w: LAY.TOOLBAR.w, h: LAY.TOOLBAR.h,
variant: 'tool', icon: tools[i2].icon, disabled: tools[i2].disabled,
tone: (state.darkUi ? TOOL_TONE_DARK : TOOL_TONE)[tools[i2].id],
badge: tools[i2].badge
};
addHit(tb.x, tb.y, tb.w, tb.h, tb.id);
drawButton(tb);
}
if (state.flower && !state.reduceMotion) {
drawPetalScene(state.flower.t, !!state.lowFps);
}
}
function drawPolyPiece(pts, def, opts) {
opts = opts || {};
var scale = opts.scale === undefined ? 1 : opts.scale;
var sx = opts.sx === undefined ? 1 : opts.sx;
var cx = opts.cx, cy = opts.cy;
var placed = cx !== undefined;
var alpha = opts.alpha === undefined ? 1 : opts.alpha;
function mapX(x) { return placed ? cx + (x - cx) * scale * sx : x * scale; }
function mapY(y) { return placed ? cy + (y - cy) * scale : y * scale; }
function path() {
ctx.beginPath();
for (var i = 0; i < pts.length; i++) {
var x = mapX(pts[i][0]), y = mapY(pts[i][1]);
if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
}
ctx.closePath();
}
var bb = G.bbox([pts]);
var px0 = placed ? mapX(bb[0]) : bb[0] * scale;
var px1 = placed ? mapX(bb[2]) : bb[2] * scale;
var py0 = placed ? mapY(bb[1]) : bb[1] * scale;
var py1 = placed ? mapY(bb[3]) : bb[3] * scale;
var pstyle = (state.save && state.save.pieceStyle) || 'classic';
ctx.save();
ctx.globalAlpha = alpha;
if (pstyle === 'neon') {
ctx.shadowColor = def.color; ctx.shadowBlur = qShadow(18);
path(); ctx.fillStyle = shadeHex(def.color, -0.55); ctx.fill();
ctx.shadowBlur = qShadow(0);
} else if (pstyle === 'glow') {
ctx.shadowColor = def.color; ctx.shadowBlur = qShadow(13);
path(); ctx.fillStyle = def.color; ctx.fill();
ctx.shadowBlur = qShadow(0);
} else {
shadow(C.PIECE.shadowBlur, C.PIECE.shadowDy, COL.shadowPiece);
path(); ctx.fillStyle = def.color; ctx.fill();
noShadow();
}
ctx.restore();
ctx.save();
ctx.globalAlpha = alpha;
ctx.save();
path(); ctx.clip();
var GK = 'pc|' + pstyle + '|' + Math.round(px0) + '|' + Math.round(py0) + '|' +
Math.round(px1) + '|' + Math.round(py1);
if (pstyle === 'candy' || pstyle === 'pastel') {
ctx.fillStyle = grad(GK + '|c', function () {
var cg = ctx.createLinearGradient(px0, py0, px1, py1);
if (pstyle === 'candy') {
cg.addColorStop(0, 'rgba(255,255,255,0.42)');
cg.addColorStop(0.45, 'rgba(255,255,255,0.02)');
cg.addColorStop(1, 'rgba(0,0,0,0.18)');
} else {
cg.addColorStop(0, 'rgba(255,255,255,0.30)');
cg.addColorStop(0.6, 'rgba(255,255,255,0)');
cg.addColorStop(1, 'rgba(255,255,255,0.12)');
}
return cg;
});
ctx.fillRect(px0, py0, px1 - px0, py1 - py0);
} else if (pstyle === 'wood') {
ctx.fillStyle = grad(GK + '|w', function () {
var wg = ctx.createLinearGradient(px0, py0, px1, py0);
wg.addColorStop(0, 'rgba(120,72,32,0.16)');
wg.addColorStop(0.3, 'rgba(255,225,180,0.10)');
wg.addColorStop(0.6, 'rgba(120,72,32,0.10)');
wg.addColorStop(1, 'rgba(120,72,32,0.20)');
return wg;
});
ctx.fillRect(px0, py0, px1 - px0, py1 - py0);
ctx.strokeStyle = 'rgba(90,52,20,0.10)'; ctx.lineWidth = 1;
for (var wy = py0 + 6; wy < py1; wy += 9) {
ctx.beginPath(); ctx.moveTo(px0, wy); ctx.lineTo(px1, wy); ctx.stroke();
}
} else if (pstyle === 'crystal') {
ctx.fillStyle = grad(GK + '|r', function () {
var crg = ctx.createLinearGradient(px0, py0, px1, py1);
crg.addColorStop(0, 'rgba(255,255,255,0.72)');
crg.addColorStop(0.28, 'rgba(255,255,255,0.06)');
crg.addColorStop(0.55, 'rgba(255,255,255,0.30)');
crg.addColorStop(1, 'rgba(0,40,90,0.20)');
return crg;
});
ctx.fillRect(px0, py0, px1 - px0, py1 - py0);
ctx.strokeStyle = 'rgba(255,255,255,0.42)'; ctx.lineWidth = 2;
var cmx = (px0 + px1) / 2, cmy = (py0 + py1) / 2;
ctx.beginPath(); ctx.moveTo(px0, cmy); ctx.lineTo(cmx, py0); ctx.lineTo(px1, cmy);
ctx.moveTo(cmx, py0); ctx.lineTo(cmx, py1); ctx.stroke();
} else if (pstyle === 'metal') {
ctx.fillStyle = grad(GK + '|m', function () {
var mg = ctx.createLinearGradient(px0, py0, px0, py1);
mg.addColorStop(0, 'rgba(255,255,255,0.55)');
mg.addColorStop(0.22, 'rgba(0,0,0,0.20)');
mg.addColorStop(0.46, 'rgba(255,255,255,0.28)');
mg.addColorStop(0.70, 'rgba(0,0,0,0.16)');
mg.addColorStop(1, 'rgba(255,255,255,0.34)');
return mg;
});
ctx.fillRect(px0, py0, px1 - px0, py1 - py0);
ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1;
for (var my = py0 + 3; my < py1; my += 4) {
ctx.beginPath(); ctx.moveTo(px0, my); ctx.lineTo(px1, my); ctx.stroke();
}
} else if (pstyle === 'jade') {
ctx.fillStyle = grad(GK + '|j', function () {
var jg = ctx.createRadialGradient(px0 + (px1 - px0) * 0.35, py0 + (py1 - py0) * 0.3, 4,
(px0 + px1) / 2, (py0 + py1) / 2, Math.max(px1 - px0, py1 - py0));
jg.addColorStop(0, 'rgba(255,255,255,0.42)');
jg.addColorStop(0.6, 'rgba(255,255,255,0)');
jg.addColorStop(1, 'rgba(10,70,50,0.22)');
return jg;
});
ctx.fillRect(px0, py0, px1 - px0, py1 - py0);
ctx.strokeStyle = 'rgba(255,255,255,0.24)'; ctx.lineWidth = 2.2;
for (var jj = 0; jj < 3; jj++) {
var jy = py0 + (py1 - py0) * (0.3 + jj * 0.22);
ctx.beginPath(); ctx.moveTo(px0, jy);
ctx.bezierCurveTo(px0 + (px1 - px0) * 0.3, jy - 12,
px0 + (px1 - px0) * 0.6, jy + 12, px1, jy);
ctx.stroke();
}
}
ctx.fillStyle = grad(GK + '|h|' + Math.round(scale * 10), function () {
var g = ctx.createLinearGradient(0, py0, 0, Math.min(py1, py0 + 14 * Math.max(scale, 0.5)));
g.addColorStop(0, C.PIECE.highlight);
g.addColorStop(1, 'rgba(255,255,255,0)');
return g;
});
ctx.fillRect(px0, py0, px1 - px0, Math.max(4, py1 - py0));
ctx.restore();
if (opts.fitted && C.PIECE.seamBleed > 0) {
var lvB = LEVELS[state.levelIdx];
ctx.save();
if (lvB && lvB.outline && lvB.outline.length >= 3) {
ctx.beginPath();
ctx.moveTo(w2d(lvB.outline[0][0]), h2d(lvB.outline[0][1]));
for (var ob = 1; ob < lvB.outline.length; ob++) ctx.lineTo(w2d(lvB.outline[ob][0]), h2d(lvB.outline[ob][1]));
ctx.closePath();
var holB = lvB.holes || [];
for (var hb = 0; hb < holB.length; hb++) {
var hrB = holB[hb];
if (!hrB || hrB.length < 3) continue;
ctx.moveTo(w2d(hrB[0][0]), h2d(hrB[0][1]));
for (var hc = 1; hc < hrB.length; hc++) ctx.lineTo(w2d(hrB[hc][0]), h2d(hrB[hc][1]));
ctx.closePath();
}
if (ctx.clip) { try { ctx.clip('evenodd'); } catch (eB) { ctx.clip(); } }
}
path();
ctx.lineWidth = C.PIECE.strokeW + C.PIECE.seamBleed * 2;
ctx.strokeStyle = def.color;
ctx.lineJoin = 'round';
ctx.stroke();
ctx.restore();
}
path();
var glowing = pstyle === 'neon' || pstyle === 'glow';
ctx.lineWidth = glowing ? C.PIECE.strokeW + 0.6 : C.PIECE.strokeW;
ctx.strokeStyle = glowing ? def.color
: pstyle === 'crystal' ? 'rgba(255,255,255,0.85)'
: pstyle === 'metal' ? 'rgba(255,255,255,0.55)'
: (def.stroke || '#000000');
ctx.lineJoin = 'round';
ctx.stroke();
ctx.restore();
}
function inkOnCard(sub) {
if (state.darkUi) return sub ? (COL.textSub || '#B9C6E6') : (COL.text || '#E4EBF8');
return sub ? '#5A687C' : '#2C3A4B';
}
function shadeHex(hex, pct) {
if (!hex || hex.charAt(0) !== '#') return hex || '#000000';
var h = hex.slice(1);
if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
var v = parseInt(h, 16), isNaNV = isNaN(v);
if (isNaNV) return hex;
var r = (v >> 16) & 255, g = (v >> 8) & 255, b = v & 255;
function adj(c) { return Math.max(0, Math.min(255, Math.round(c + (pct > 0 ? (255 - c) * pct : c * pct)))); }
return 'rgb(' + adj(r) + ',' + adj(g) + ',' + adj(b) + ')';
}
function drawRotateHandle(cx, cy) {
var R = C.GESTURE.handleVisual / 2;
ctx.save();
ctx.beginPath();
ctx.arc(cx, cy, R, 0, Math.PI * 2);
ctx.fillStyle = 'rgba(255,185,61,0.30)';
ctx.fill();
ctx.lineWidth = 2.5;
ctx.strokeStyle = 'rgba(224,138,0,0.92)';
ctx.stroke();
var ar = R * 0.56;
var a0 = -Math.PI * 0.70, a1 = Math.PI * 0.55;
ctx.beginPath();
ctx.arc(cx, cy, ar, a0, a1);
ctx.lineWidth = Math.max(4, R * 0.16);
ctx.lineCap = 'round';
ctx.strokeStyle = '#7A4A00';
ctx.stroke();
var ex = cx + ar * Math.cos(a1), ey = cy + ar * Math.sin(a1);
var tx = -Math.sin(a1), ty = Math.cos(a1);
var nx = Math.cos(a1), ny = Math.sin(a1);
var ah = R * 0.30;
ctx.beginPath();
ctx.moveTo(ex + tx * ah, ey + ty * ah);
ctx.lineTo(ex - tx * ah * 0.5 + nx * ah * 0.72, ey - ty * ah * 0.5 + ny * ah * 0.72);
ctx.lineTo(ex - tx * ah * 0.5 - nx * ah * 0.72, ey - ty * ah * 0.5 - ny * ah * 0.72);
ctx.closePath();
ctx.fillStyle = '#7A4A00';
ctx.fill();
ctx.restore();
}
function drawBoardPiece(p) {
var pts = piecePolyDesign(p);
var offX = 0, offY = 0;
if (p.shake > 0) offX += Math.sin(state.time / 22) * 3.2 * Math.min(1, p.shake / 160);
if (p.drawOff) {
var ok2 = 1 - p.drawOff.t / p.drawOff.dur;
offX += p.drawOff.x * ok2;
offY += p.drawOff.y * ok2;
}
var shakeRestore = false;
if (offX || offY) {
ctx.save();
ctx.translate(offX, offY);
shakeRestore = true;
}
var def = DS.pieces[p.id];
var pulse = p.pulse > 0 ? 1 + 0.06 * Math.sin(p.pulse * Math.PI) : 1;
var grab = p.grabT > 0 ? 1 + 0.04 * p.grabT : 1;
var sx = 1;
if (p.flip) sx = Math.abs(Math.cos(p.flip.t * Math.PI));
var cyc = h2d(p.y);
var cxc = w2d(p.x);
if (p.breathe > 0) {
ctx.save();
var al = 0.25 + 0.25 * Math.sin(p.breathe * Math.PI * 2);
ctx.beginPath();
for (var i = 0; i < pts.length; i++) { if (i === 0) ctx.moveTo(pts[i][0], pts[i][1]); else ctx.lineTo(pts[i][0], pts[i][1]); }
ctx.closePath();
ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(255,255,255,' + al.toFixed(2) + ')';
ctx.stroke();
ctx.restore();
}
if (p.ring > 0) {
var k = 1 - p.ring;
var off = C.SNAP.ringOffset * k;
var rw = C.SNAP.ringW + (C.SNAP.ringWEnd - C.SNAP.ringW) * k;
var ra = C.SNAP.ringAlpha * p.ring;
ctx.save();
ctx.beginPath();
ctx.rect(cxc - 260, cyc - 260, 520, 520);
for (var q0 = 0; q0 < pts.length; q0++) {
if (q0 === 0) ctx.moveTo(pts[q0][0], pts[q0][1]); else ctx.lineTo(pts[q0][0], pts[q0][1]);
}
ctx.closePath();
if (ctx.clip) ctx.clip('evenodd');
ctx.lineJoin = 'round';
ctx.shadowBlur = qShadow(C.SNAP.ringGlowBlur);
ctx.shadowColor = def.color;
ctx.strokeStyle = def.color;
ctx.globalAlpha = ra * C.SNAP.ringGlowAlpha;
ctx.lineWidth = 2 * off + rw + 7;
ctx.beginPath();
for (var q1 = 0; q1 < pts.length; q1++) {
if (q1 === 0) ctx.moveTo(pts[q1][0], pts[q1][1]); else ctx.lineTo(pts[q1][0], pts[q1][1]);
}
ctx.closePath(); ctx.stroke();
ctx.shadowBlur = qShadow(0);
ctx.strokeStyle = COL.snapRing;
ctx.globalAlpha = ra;
ctx.lineWidth = 2 * off + rw;
ctx.beginPath();
for (var q2 = 0; q2 < pts.length; q2++) {
if (q2 === 0) ctx.moveTo(pts[q2][0], pts[q2][1]); else ctx.lineTo(pts[q2][0], pts[q2][1]);
}
ctx.closePath(); ctx.stroke();
ctx.restore();
}
var winScale = 1;
if (state.win) {
var wt = Math.min(1, state.win.t / C.ANIM.winShrink);
winScale = 1 - 0.02 * Math.sin(wt * Math.PI);
}
drawPolyPiece(pts, def, { cx: cxc, cy: cyc, scale: pulse * grab * winScale, sx: sx,
fitted: !!p.fit });
if (state.selId === p.id && !state.win) {
ctx.save();
ctx.beginPath();
for (var s2 = 0; s2 < pts.length; s2++) { if (s2 === 0) ctx.moveTo(pts[s2][0], pts[s2][1]); else ctx.lineTo(pts[s2][0], pts[s2][1]); }
ctx.closePath();
ctx.fillStyle = 'rgba(255,185,61,0.15)';
ctx.fill();
ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,185,61,0.92)';
ctx.stroke();
ctx.restore();
}
var moving2 = !!(state.drag && state.drag.id === p.id);
var issue = p.issue || null;
if ((p.fit || issue) && !state.win) {
var isBad = !!issue;
var cMain = isBad ? '255,38,38' : '34,197,94';
var t = state.time;
var pulse = moving2 ? (0.72 + 0.28 * Math.sin(t / 110)) : 0.92;
ctx.save();
ctx.beginPath();
for (var s3 = 0; s3 < pts.length; s3++) {
if (s3 === 0) ctx.moveTo(pts[s3][0], pts[s3][1]); else ctx.lineTo(pts[s3][0], pts[s3][1]);
}
ctx.closePath();
ctx.fillStyle = 'rgba(' + cMain + ',' + (isBad ? 0.34 : (moving2 ? 0.26 : 0.18)) + ')';
ctx.fill();
ctx.lineJoin = 'round';
ctx.shadowBlur = qShadow(moving2 ? 26 : 18);
ctx.shadowColor = 'rgba(' + cMain + ',0.95)';
ctx.lineWidth = moving2 ? 7.5 : (isBad ? 6.5 : 5.5);
ctx.strokeStyle = 'rgba(' + cMain + ',' + pulse.toFixed(2) + ')';
ctx.stroke();
ctx.shadowBlur = qShadow(0);
ctx.lineWidth = 2;
ctx.strokeStyle = 'rgba(255,255,255,' + (isBad ? 0.72 : 0.85) + ')';
ctx.stroke();
if (moving2 && !isBad) {
var ph = (t % 620) / 620;
var grow = 4 + ph * 22;
ctx.globalAlpha = (1 - ph) * 0.55;
ctx.lineWidth = 3;
ctx.strokeStyle = 'rgba(34,197,94,0.9)';
ctx.beginPath();
for (var s4 = 0; s4 < pts.length; s4++) {
var vx = pts[s4][0], vy = pts[s4][1];
var cx0 = cxc, cy0 = cyc;
var dxv = vx - cx0, dyv = vy - cy0, dl = Math.sqrt(dxv * dxv + dyv * dyv) || 1;
var px2 = vx + dxv / dl * grow, py2 = vy + dyv / dl * grow;
if (s4 === 0) ctx.moveTo(px2, py2); else ctx.lineTo(px2, py2);
}
ctx.closePath();
ctx.stroke();
}
ctx.restore();
}
if (shakeRestore) ctx.restore();
}
function drawHintGuide(lv) {
var H = C.HINT, hh = state.hint;
var hs = null;
for (var q = 0; q < lv.solution.length; q++) if (lv.solution[q].id === hh.id) hs = lv.solution[q];
if (!hs) return;
var pz = pieceOf(hh.id);
var onBoard = !!(pz && pz.onBoard);
var hp = G.toWorld(LOCAL[hs.id], hs).map(function (v) { return [w2d(v[0]), h2d(v[1])]; });
var a = 0.30 + 0.22 * Math.sin(state.time / 180);
ctx.save();
ctx.beginPath();
ctx.moveTo(hp[0][0], hp[0][1]);
for (var h2 = 1; h2 < hp.length; h2++) ctx.lineTo(hp[h2][0], hp[h2][1]);
ctx.closePath();
ctx.fillStyle = 'rgba(255,185,61,' + a.toFixed(2) + ')';
ctx.fill();
ctx.lineJoin = 'round';
ctx.lineWidth = 7;
ctx.strokeStyle = 'rgba(255,255,255,0.9)';
ctx.stroke();
ctx.lineWidth = 3.5;
ctx.strokeStyle = COL.gold;
ctx.setLineDash([10, 7]);
ctx.stroke();
ctx.setLineDash([]);
ctx.restore();
if (onBoard) {
var bp = piecePolyDesign(pz);
ctx.save();
ctx.beginPath();
for (var b2 = 0; b2 < bp.length; b2++) {
if (b2 === 0) ctx.moveTo(bp[b2][0], bp[b2][1]); else ctx.lineTo(bp[b2][0], bp[b2][1]);
}
ctx.closePath();
ctx.fillStyle = 'rgba(255,185,61,0.10)';
ctx.fill();
ctx.lineWidth = 3;
ctx.setLineDash([6, 5]);
ctx.strokeStyle = 'rgba(255,159,28,0.95)';
ctx.stroke();
ctx.setLineDash([]);
var x0 = w2d(pz.x), y0 = h2d(pz.y), x1 = w2d(hs.x), y1 = h2d(hs.y);
var dx = x1 - x0, dy = y1 - y0, dd = Math.hypot(dx, dy);
if (dd > 40) {
var ux = dx / dd, uy = dy / dd, ex = x1 - ux * 26, ey = y1 - uy * 26;
ctx.beginPath();
ctx.moveTo(x0 + ux * 18, y0 + uy * 18);
ctx.lineTo(ex, ey);
ctx.lineWidth = 3;
ctx.strokeStyle = 'rgba(255,159,28,0.75)';
ctx.setLineDash([9, 7]);
ctx.stroke();
ctx.setLineDash([]);
ctx.beginPath();
ctx.moveTo(ex, ey);
ctx.lineTo(ex - ux * 14 - uy * 8, ey - uy * 14 + ux * 8);
ctx.lineTo(ex - ux * 14 + uy * 8, ey - uy * 14 - ux * 8);
ctx.closePath();
ctx.fillStyle = 'rgba(255,159,28,0.95)';
ctx.fill();
}
ctx.restore();
}
var label, lw, lh = 40, ly;
if (onBoard) {
var pTop = 1e9, pBot = -1e9;
var pbp = piecePolyDesign(pz);
for (var b3 = 0; b3 < pbp.length; b3++) {
if (pbp[b3][1] < pTop) pTop = pbp[b3][1];
if (pbp[b3][1] > pBot) pBot = pbp[b3][1];
}
label = H.labels.move; lw = 138;
ly = pTop - 28;
if (ly < LAY.BOARD.y + 30) ly = pBot + 28;
} else {
var cx = 0, cy = 0, hpTop = 1e9, hpBot = -1e9;
for (var c2 = 0; c2 < hp.length; c2++) {
cx += hp[c2][0]; cy += hp[c2][1];
if (hp[c2][1] < hpTop) hpTop = hp[c2][1];
if (hp[c2][1] > hpBot) hpBot = hp[c2][1];
}
label = H.labels.place; lw = 96;
cx /= hp.length; cy /= hp.length;
ly = hpTop - 26;
if (ly < LAY.BOARD.y + 30) ly = hpBot + 26;
}
var bTop = LAY.BOARD.y + 26, bBot = LAY.BOARD.y + LAY.BOARD.size - 26;
var bL = LAY.BOARD.x + lw / 2 + 8, bR = LAY.BOARD.x + LAY.BOARD.size - lw / 2 - 8;
var lx = onBoard ? w2d(pz.x) : cx;
lx = Math.max(bL, Math.min(bR, lx));
ly = Math.max(bTop, Math.min(bBot, ly));
rr(lx - lw / 2, ly - lh / 2, lw, lh, lh / 2);
ctx.fillStyle = 'rgba(44,58,75,0.86)';
ctx.fill();
text(label, lx, ly + 1, 21, '#FFFFFF', 'center', '600');
if (!onBoard) {
var sp0 = SLOT_POS[pz.slot];
ctx.save();
ctx.setLineDash([10, 10]);
ctx.lineWidth = 3;
ctx.strokeStyle = 'rgba(255,159,28,0.55)';
ctx.beginPath();
ctx.moveTo(sp0.x, sp0.y);
ctx.lineTo(w2d(hs.x), h2d(hs.y));
ctx.stroke();
ctx.setLineDash([]);
ctx.restore();
}
}
function drawHintTray() {
var hh = state.hint;
if (!hh) return;
var p = pieceOf(hh.id);
if (!p || p.onBoard) return;
var pts = trayPoly(p);
var a = 0.6 + 0.35 * Math.sin(state.time / 200);
ctx.save();
ctx.beginPath();
for (var i = 0; i < pts.length; i++) {
if (i === 0) ctx.moveTo(pts[i][0], pts[i][1]); else ctx.lineTo(pts[i][0], pts[i][1]);
}
ctx.closePath();
ctx.fillStyle = 'rgba(255,185,61,0.16)';
ctx.fill();
ctx.lineWidth = 5;
ctx.strokeStyle = 'rgba(255,159,28,' + a.toFixed(2) + ')';
ctx.stroke();
var sp = SLOT_POS[p.slot];
var minY = Math.min.apply(null, pts.map(function (v) { return v[1]; }));
var maxY = Math.max.apply(null, pts.map(function (v) { return v[1]; }));
var py = minY - 34;
if (py < C.LAYOUT.PROGRESS.y + 40) py = maxY + 34;
var pw = 132, ph = 46;
rr(sp.x - pw / 2, py - ph / 2, pw, ph, ph / 2);
ctx.fillStyle = 'rgba(44,58,75,0.88)';
ctx.fill();
text(C.HINT.labels.use, sp.x, py + 1, 24, '#FFFFFF', 'center', '600');
ctx.restore();
}
function drawTrayPiece(p) {
var pts = trayPoly(p);
var def = DS.pieces[p.id];
drawPolyPiece(pts, def);
if (state.selId === p.id && !state.win) {
ctx.save();
ctx.beginPath();
for (var i = 0; i < pts.length; i++) { if (i === 0) ctx.moveTo(pts[i][0], pts[i][1]); else ctx.lineTo(pts[i][0], pts[i][1]); }
ctx.closePath();
ctx.fillStyle = 'rgba(255,185,61,0.15)';
ctx.fill();
ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,185,61,0.92)';
ctx.stroke();
ctx.restore();
}
}
function cardBox(x, y, w, h, r, opts) {
opts = opts || {};
ctx.save();
shadow(C.CARD.shadowBlur, C.CARD.shadowDy, C.CARD.shadow);
rr(x, y, w, h, r);
ctx.fillStyle = opts.fill || COL.card;
ctx.fill();
noShadow();
ctx.lineWidth = C.CARD.edgeW;
ctx.strokeStyle = opts.edge || C.CARD.edge;
ctx.stroke();
ctx.restore();
ctx.save();
rr(x, y, w, h, r);
ctx.clip();
var gh = h * C.CARD.topGlowH;
var g = ctx.createLinearGradient(0, y, 0, y + gh);
g.addColorStop(0, C.CARD.topGlow);
g.addColorStop(1, 'rgba(255,185,61,0)');
ctx.fillStyle = g;
ctx.fillRect(x, y, w, gh);
ctx.restore();
}
function drawCard(cx, cy, w, h, r) {
cardBox(cx - w / 2, cy - h / 2, w, h, r);
}
function drawSolved(lv, cx, cy, maxSide, k) {
var polys = [], i, j, minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
for (i = 0; i < lv.solution.length; i++) {
var st = lv.solution[i];
var wp = G.toWorld(LOCAL[st.id], st);
polys.push({ id: st.id, pts: wp });
for (j = 0; j < wp.length; j++) {
if (wp[j][0] < minX) minX = wp[j][0];
if (wp[j][0] > maxX) maxX = wp[j][0];
if (wp[j][1] < minY) minY = wp[j][1];
if (wp[j][1] > maxY) maxY = wp[j][1];
}
}
var bw = Math.max(1, maxX - minX), bh = Math.max(1, maxY - minY);
var s = maxSide / Math.max(bw, bh) * (k || 1);
var ox = cx - bw * s / 2 - minX * s, oy = cy - bh * s / 2 - minY * s;
for (i = 0; i < polys.length; i++) {
var pc = (DS.pieces && DS.pieces[polys[i].id]) || {};
ctx.beginPath();
for (j = 0; j < polys[i].pts.length; j++) {
var qx = ox + polys[i].pts[j][0] * s, qy = oy + polys[i].pts[j][1] * s;
if (j === 0) ctx.moveTo(qx, qy); else ctx.lineTo(qx, qy);
}
ctx.closePath();
ctx.save();
shadow(10, 3, 'rgba(44,58,75,0.18)');
ctx.fillStyle = pc.color || COL.gold;
ctx.fill();
noShadow();
ctx.restore();
ctx.lineWidth = 2.5;
ctx.strokeStyle = 'rgba(255,255,255,0.9)';
ctx.stroke();
}
return { s: s, w: bw * s, h: bh * s };
}
function drawTrophy(cx, cy, k) {
ctx.save();
ctx.translate(cx, cy); ctx.scale(k, k);
ctx.lineWidth = 2; ctx.strokeStyle = '#D98A00'; ctx.fillStyle = '#FFC53D';
ctx.beginPath();
ctx.moveTo(-14, -16); ctx.lineTo(14, -16);
ctx.quadraticCurveTo(14, 4, 0, 7);
ctx.quadraticCurveTo(-14, 4, -14, -16);
ctx.closePath(); ctx.fill(); ctx.stroke();
ctx.beginPath(); ctx.arc(-15, -8, 6, Math.PI * 0.4, Math.PI * 1.55); ctx.stroke();
ctx.beginPath(); ctx.arc(15, -8, 6, Math.PI * 1.45, Math.PI * 0.6); ctx.stroke();
ctx.beginPath(); ctx.moveTo(0, 7); ctx.lineTo(0, 12); ctx.stroke();
ctx.beginPath(); ctx.moveTo(-9, 15); ctx.lineTo(9, 15); ctx.stroke();
ctx.restore();
}
function drawChest(cx, cy, k, lit) {
ctx.save();
ctx.translate(cx, cy); ctx.scale(k, k);
ctx.lineWidth = 2.4; ctx.strokeStyle = '#B4690E';
rr(-22, -8, 44, 26, 6);
ctx.fillStyle = '#FF9F1C'; ctx.fill(); ctx.stroke();
rr(-22, -20, 44, 14, 6);
ctx.fillStyle = '#FFC53D'; ctx.fill(); ctx.stroke();
rr(-6, -8, 12, 12, 3);
ctx.fillStyle = lit ? '#FFF3D0' : '#FFE2A6'; ctx.fill(); ctx.stroke();
ctx.restore();
}
function drawStreakBar(y, streak) {
var W = C.WIN, ST = C.STREAK;
var n = ((streak - 1) % ST.step) + 1;
var x0 = 154, x1 = 588, bh = 38, by = y - bh / 2;
drawTrophy(W.streakX0 + 8, y - 8, 1.15);
text('连胜', W.streakX0 + 8, y + 26, 17, '#B4690E', 'center', '700');
rr(x0, by, x1 - x0, bh, bh / 2);
ctx.fillStyle = 'rgba(214,205,192,0.55)'; ctx.fill();
var pw = (x1 - x0) * n / ST.step;
if (pw > bh) {
ctx.save();
rr(x0, by, pw, bh, bh / 2);
ctx.clip();
var g = ctx.createLinearGradient(x0, 0, x1, 0);
g.addColorStop(0, '#FFD24A');
g.addColorStop(1, '#FFB01F');
ctx.fillStyle = g;
ctx.fillRect(x0, by, pw, bh);
ctx.restore();
}
text(n + '/' + ST.step, (x0 + x1) / 2, y + 1, 22, '#8A5A1A', 'center', '700');
if (state.streakGain > 0) {
text('+' + state.streakGain, x1 - 26, y + 1, 20, '#8A5A1A', 'right', '700');
}
drawChest(W.streakX1, y, 1, n >= ST.step);
}
function renderResult() {
var W = C.WIN;
ctx.fillStyle = COL.mask;
ctx.fillRect(0, 0, C.DESIGN.w, DH());
playHud(hudAnchorY());
var appear = Math.min(1, state.resT / C.ANIM.panelFade);
var e = G.easeOutCubic(appear);
ctx.save();
ctx.globalAlpha = e;
var cy = W.cy + (1 - e) * 24;
var dy = cy - W.cy;
drawCard(C.DESIGN.w / 2, cy, W.cardW, W.cardH, 34);
var lv = LEVELS[state.levelIdx];
var last = state.levelIdx === LEVELS.length - 1;
drawStreakBar(W.streakY + dy, state.save.streak || 0);
text(last ? (COMPLETE_TITLE || '四巧板全部完成') : '拼好了！',
C.DESIGN.w / 2, W.titleY + dy, W.titleSize, COL.text, 'center', '700');
var subTxt = last ? (COMPLETE_SUB || '七巧板即将开启') : lv.name;
if (subTxt) text(subTxt, C.DESIGN.w / 2, W.nameY + dy, W.nameSize, COL.textSub, 'center');
var boxW = W.shapeBox, boxH = W.shapeBox, bx = C.DESIGN.w / 2, byc = W.shapeY + dy;
ctx.save();
shadow(16, 6, 'rgba(44,58,75,0.10)');
rr(bx - boxW / 2, byc - boxH / 2, boxW, boxH, 26);
ctx.fillStyle = 'rgba(255,255,255,0.94)'; ctx.fill();
noShadow(); ctx.restore();
ctx.lineWidth = 2;
ctx.strokeStyle = 'rgba(255,185,61,0.55)';
rr(bx - boxW / 2, byc - boxH / 2, boxW, boxH, 26);
ctx.stroke();
if (state.resT > 120) {
var glowPh = ((state.resT - 120) % 1900) / 1900;
var pulse = 0.5 - 0.5 * Math.cos(glowPh * Math.PI * 2);
var gRx = boxW * 0.85, gRy = boxW * 0.55;
ctx.save();
ctx.translate(bx, byc);
ctx.scale(1, gRy / gRx);
var gRad = ctx.createRadialGradient(0, 0, boxW * 0.30, 0, 0, gRx);
gRad.addColorStop(0, 'rgba(255,208,110,0)');
gRad.addColorStop(0.45, 'rgba(255,200,92,' + (0.16 + 0.16 * pulse).toFixed(3) + ')');
gRad.addColorStop(0.74, 'rgba(255,186,60,' + (0.09 + 0.09 * pulse).toFixed(3) + ')');
gRad.addColorStop(1, 'rgba(255,186,60,0)');
ctx.fillStyle = gRad;
ctx.fillRect(-gRx, -gRx, gRx * 2, gRx * 2);
ctx.restore();
var halos = [[10, 8, 0.050], [5, 4, 0.100], [2.5, 1.5, 0.240]];
ctx.save();
for (var hi = 0; hi < halos.length; hi++) {
var padv = halos[hi][1] + 1.6 * pulse;
ctx.lineWidth = halos[hi][0];
ctx.strokeStyle = 'rgba(255,190,72,' +
(halos[hi][2] + halos[hi][2] * 1.2 * pulse).toFixed(3) + ')';
rr(bx - boxW / 2 - padv, byc - boxH / 2 - padv,
boxW + padv * 2, boxH + padv * 2, 26 + padv);
ctx.stroke();
}
ctx.restore();
var cornerX = [-1, 1, 1, -1], cornerY = [-1, -1, 1, 1];
for (var si = 0; si < 4; si++) {
var sph = ((glowPh + si * 0.25) % 1);
var sp = 0.5 - 0.5 * Math.cos(sph * Math.PI * 2);
if (sp < 0.14) continue;
ctx.save();
ctx.globalAlpha = 0.30 + 0.65 * sp;
drawStar(bx + cornerX[si] * (boxW / 2 + 10), byc + cornerY[si] * (boxH / 2 + 10),
2.5 + 4 * sp, true, 1);
ctx.restore();
}
}
var pop = G.easeOutBack(Math.min(1, Math.max(0, (state.resT - 140) / 460)));
drawSolved(lv, bx, byc, W.shapeMax, 0.84 + 0.16 * pop);
for (var i = 0; i < 3; i++) {
var on = state.result && i < state.result.stars;
var shown = state.starShown > i;
var sc = 1;
if (shown) {
var st = Math.min(1, (state.resT - i * C.ANIM.starStep) / 160);
sc = 0.6 + 0.55 * G.easeOutBack(st);
if (st >= 1) sc = 1;
}
drawStar(C.DESIGN.w / 2 - W.starGap + i * W.starGap, W.starY + dy, W.starR, on && shown, on ? sc : 1);
}
var sec = Math.floor(state.result ? state.result.time : 0);
var mm = Math.floor(sec / 60), ss = sec % 60;
text('用时', C.DESIGN.w / 2 - 120, W.statLabelY + dy, 22, COL.textSub, 'center');
text((mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss,
C.DESIGN.w / 2 - 120, W.statValueY + dy, 30, COL.text, 'center', '600');
text('步数', C.DESIGN.w / 2 + 120, W.statLabelY + dy, 22, COL.textSub, 'center');
text(String(state.result ? state.result.steps : 0),
C.DESIGN.w / 2 + 120, W.statValueY + dy, 30, COL.text, 'center', '600');
var rw = W.rewardW, rh = W.rewardH, ry = W.rewardY + dy;
var res = state.result || { first: false, gain: 0, adUsed: false };
var mul = C.ECON.coinWinAdMul || 5;
var adLeft = adLvLeft();
var hasGain = (res.gain || 0) > 0;
ctx.save();
rr(C.DESIGN.w / 2 - rw / 2, ry - rh / 2, rw, rh, rh / 2);
ctx.fillStyle = hasGain ? 'rgba(255,185,61,0.14)' : 'rgba(120,130,146,0.10)';
ctx.fill();
ctx.lineWidth = 1.5;
ctx.strokeStyle = hasGain ? 'rgba(255,159,28,0.55)' : 'rgba(120,130,146,0.20)';
ctx.stroke();
ctx.restore();
var gainTxt, gainCol;
if (!hasGain) {
gainTxt = '已通过 · 星级未提升，无奖励';
gainCol = COL.textSub;
} else if (res.adUsed) {
gainTxt = (res.first ? '首通奖励 +' : ('升到 ' + starTag(res) + ' · +'))
+ (res.gain * mul) + ' 巧币 · 已翻 ' + mul + ' 倍';
gainCol = COL.goldDeep;
} else {
gainTxt = (res.first ? '首通奖励 +' : ('升到 ' + starTag(res) + ' · +'))
+ res.gain + ' 巧币';
gainCol = COL.text;
}
text(gainTxt, C.DESIGN.w / 2, ry + 1, 23, gainCol, 'center', '600');
var showMul = hasGain && !res.adUsed;
var canAd = showMul && adLeft > 0;
var nextW = W.primaryW, nextX = C.DESIGN.w / 2, adX = 0;
if (showMul) {
var rowW = W.adMulW + W.btnGap + W.primaryW;
var rowX0 = C.DESIGN.w / 2 - rowW / 2;
adX = rowX0 + W.adMulW / 2;
nextX = rowX0 + W.adMulW + W.btnGap + W.primaryW / 2;
nextW = W.primaryW;
}
if (showMul) {
var bMul = { id: 'win_ad5', x: adX, y: W.primaryY + dy, w: W.adMulW, h: W.primaryH,
label: canAd ? (mul + '倍奖励') : '本关已看完',
variant: 'danger', size: canAd ? 25 : 20, disabled: !!state.adSim || !canAd,
icon: 'video', iconInline: true, iconScale: 1.05 };
if (canAd && !state.adSim) addHit(bMul.x, bMul.y, bMul.w, bMul.h, 'win_ad5');
drawButton(bMul);
}
var b1 = { id: last ? 'to_list' : 'next', x: nextX, y: W.primaryY + dy,
w: nextW, h: W.primaryH, label: last ? '返回' : '下一关', variant: 'primary', size: 30 };
addHit(b1.x, b1.y, b1.w, b1.h, b1.id);
drawButton(b1);
var b2 = { id: 'share_pattern', x: C.DESIGN.w / 2 - 118, y: W.row2Y + dy,
w: 216, h: W.row2H, label: '分享图案', variant: 'secondary', size: 24, icon: 'share' };
addHit(b2.x, b2.y, b2.w, b2.h, 'share_pattern');
drawButton(b2);
var b3 = { id: 'open_rank', x: C.DESIGN.w / 2 + 118, y: W.row2Y + dy,
w: 216, h: W.row2H, label: '排行榜', variant: 'secondary', size: 24, icon: 'rank' };
addHit(b3.x, b3.y, b3.w, b3.h, 'open_rank');
drawButton(b3);
var b4 = { id: 'replay', x: last ? C.DESIGN.w / 2 : C.DESIGN.w / 2 - 108,
y: W.row3Y + dy, w: 200, h: W.row3H, label: '重玩', variant: 'ghost', size: 22 };
addHit(b4.x, b4.y, b4.w, b4.h, 'replay');
drawButton(b4);
if (!last) {
var b5 = { id: 'to_list', x: C.DESIGN.w / 2 + 108, y: W.row3Y + dy,
w: 200, h: W.row3H, label: '返回', variant: 'ghost', size: 22 };
addHit(b5.x, b5.y, b5.w, b5.h, 'to_list');
drawButton(b5);
}
ctx.restore();
adLayer();
if (state.adSim || state.adWait) hits = [];
}
var RANK_COLORS = ['#FF8A5B', '#4FA8E0', '#63C88B', '#A87BE8', '#D96A9B', '#FFC53D', '#3FB8B0'];
function num(v) {
if (typeof v === 'number' && isFinite(v)) return v;
var n = parseInt(v, 10);
return isFinite(n) ? n : 0;
}
function myRankPair(tab) {
var st = myStats();
if (tab === 2) {
var wk = weekStats();
return { v: Math.max(wk.stars, state.rankMeta.weekStars || 0), v2: st.streak };
}
return { v: st.stars, v2: st.cleared };
}
function rankSubText(tab, item) {
if (tab === 2) return '连胜 ' + (item.v2 || 0) + ' · 本周 ' + (item.v3 || 0) + ' 关';
return '通关 ' + (item.v2 || 0) + ' 关';
}
function rankData() {
var tab = state.rankTab, raw = [], i;
if (C.RANK.useMock) raw = (C.RANK.mock[tab] || []).slice();
else if (tab !== 1 && state.rankList && state.rankList.list) raw = state.rankList.list;
var list = [];
for (i = 0; i < raw.length; i++) {
var r = raw[i];
list.push({
n: r.n || r.nick || '玩家',
v: num(r.v !== undefined ? r.v : r.value),
v2: num(r.v2), v3: num(r.v3),
c: r.c || r.color || RANK_COLORS[i % RANK_COLORS.length],
a: r.a || r.avatar || '',
me: !!r.me
});
}
var rows = C.RANK.list.rows || 7;
var top = list.slice(0, rows);
var mine = null, rank = 0;
for (i = 0; i < list.length; i++) if (list[i].me) { mine = list[i]; rank = i + 1; }
var mc = (tab !== 1 && state.rankList) ? state.rankList.me : null;
var fi = state.friendRankInfo;
if (!mine && tab === 1 && fi) {
var fv = myRankPair(1);
mine = { n: meNick(), v: num(fi.myStars != null ? fi.myStars : fv.v),
v2: fv.v2, v3: 0, c: COL.gold, a: meAvatarUrl(), me: true };
rank = fi.myRank || ((fi.total || 0) + 1);
} else if (!mine) {
var pv = myRankPair(tab);
mine = {
n: (mc && mc.nick) || meNick(),
v: (mc && mc.v !== undefined) ? num(mc.v) : pv.v,
v2: (mc && mc.v2 !== undefined) ? num(mc.v2) : pv.v2,
v3: (mc && mc.v3 !== undefined) ? num(mc.v3) : (tab === 2 ? weekStats().cleared : 0),
c: COL.gold, a: meAvatarUrl(), me: true
};
rank = (mc && mc.rank) || (list.length + 1);
}
var inTop = false;
for (i = 0; i < top.length; i++) if (top[i].me) inTop = true;
var need = 0;
if (!inTop && top.length >= rows) need = Math.max(1, top[rows - 1].v - mine.v + 1);
return { top: top, mine: mine, rank: rank, inTop: inTop,
empty: list.length === 0, need: need, rows: rows };
}
function rankRow(item, y, idx, highlight) {
var L = C.RANK.list, x0 = L.x, w = L.w, h = L.rowH, tab = state.rankTab;
var rowBg = highlight ? COL.surfaceHi : COL.surface;
var rowInk = inkOnSurface(highlight, false);
var rowSub = inkOnSurface(false, true);
var valInk = highlight ? bestInk(rowBg, COL.card, [COL.accentText, COL.textOnSurfaceHi, rowInk]) : rowInk;
ctx.save();
rr(x0, y - h / 2, w, h, 16);
ctx.fillStyle = rowBg;
ctx.fill();
if (highlight) {
ctx.lineWidth = 2;
ctx.strokeStyle = hexA(COL.gold || '#FFB93D', 0.55);
ctx.stroke();
}
ctx.restore();
if (idx < 3 && !highlight) {
var medal = ['#F5B73D', '#C9D3DD', '#E0A276'][idx];
ctx.beginPath(); ctx.arc(x0 + 42, y, 21, 0, Math.PI * 2);
ctx.fillStyle = medal; ctx.fill();
text(String(idx + 1), x0 + 42, y + 1, 22, '#3A2A12', 'center', '700');
} else {
var rk = idx + 1;
text(String(rk > 99 ? '99+' : rk), x0 + 42, y + 1, rk > 99 ? 18 : 22,
highlight ? valInk : rowSub, 'center', '700');
}
drawAvatar(x0 + 92, y, 22, item.n, item.a, item.c || COL.gold);
textFit(item.n, x0 + 128, y - 11, 22, rowInk, 'left', highlight ? '700' : '500',
x0 + w - 120 - (x0 + 128));
text(rankSubText(tab, item), x0 + 128, y + 15, 18, rowSub, 'left');
text('★' + item.v, x0 + w - 24, y - 8, 24, valInk, 'right', '700');
}
function renderFriendRank(d, ry) {
var L = C.RANK.list, img = null;
if (friendOn() && state.friendT) {
try { img = env.friend.image(); } catch (e) { img = null; }
}
if (img) {
ctx.drawImage(img, L.x, ry - L.rowH / 2, L.w, L.h);
return;
}
if (C.RANK.useMock) {
for (var i = 0; i < d.top.length; i++) {
rankRow(d.top[i], ry + i * L.step, i, !!d.top[i].me);
}
return;
}
text('好友榜要在微信小游戏里看', C.DESIGN.w / 2, ry + 100, 26, COL.text, 'center', '600');
text('浏览器预览拿不到微信好友关系链', C.DESIGN.w / 2, ry + 144, 19, COL.textSub, 'center');
text('真机上会自动读取已授权好友的通关星数', C.DESIGN.w / 2, ry + 176, 19, COL.textSub, 'center');
}
function rankCountdown(nextAt) {
if (!nextAt) return '';
var left = nextAt - Date.now();
if (left <= 0) return '即将重置';
var min = Math.floor(left / 60000);
if (min < 1) return '即将重置';
var dd = Math.floor(min / 1440), hh = Math.floor((min % 1440) / 60), mm = min % 60;
if (dd >= 1) return '距重置 ' + dd + '天 ' + hh + '小时';
if (hh >= 1) return '距重置 ' + hh + '小时 ' + mm + '分';
var ss = Math.floor(left / 1000) % 60;
return '距重置 ' + mm + '分 ' + ss + '秒';
}
function rankInfoText() {
var tab = state.rankTab;
if (tab === 1) return '好友榜 · 数据来自微信关系链';
if (tab === 2) {
var cd = rankCountdown(state.rankMeta.nextResetAt);
return '本周新增星数 · ' + (cd || '每周一 00:00 重置');
}
return '全服累计 · 星星越多排名越高 · 永不重置';
}
function renderMyRankCard(d) {
var M = C.RANK.mine, x0 = M.x, w = M.w, h = M.h, cy = M.y, tab = state.rankTab;
var bg = COL.surfaceHi;
var ink = inkOnSurface(true, false);
var sub = inkOnSurface(true, true);
var valInk = bestInk(bg, COL.card, [COL.accentText, ink]);
rr(x0, cy - h / 2, w, h, 20);
ctx.fillStyle = bg; ctx.fill();
ctx.lineWidth = 1.5; ctx.strokeStyle = hexA(COL.gold || '#FFB93D', 0.35); ctx.stroke();
var rk = d.rank || 0;
ctx.beginPath(); ctx.arc(x0 + 42, cy - 20, 24, 0, Math.PI * 2);
ctx.fillStyle = COL.gold; ctx.fill();
text(rk > 99 ? '99+' : String(rk || '—'), x0 + 42, cy - 19, rk > 99 ? 16 : 22,
COL.btnText, 'center', '700');
drawAvatar(x0 + 100, cy - 20, 30, d.mine.n, d.mine.a, COL.gold);
textFit(d.mine.n, x0 + 144, cy - 20, 24, ink, 'left', '700', w - 144 - 180);
var val = tab === 2 ? ('★' + d.mine.v + ' · 连胜 ' + (d.mine.v2 || 0))
: ('★' + d.mine.v + ' · ' + (d.mine.v2 || 0) + ' 关');
text(val, x0 + w - 24, cy - 20, 22, valInk, 'right', '700');
text(rankCardHint(d, tab), x0 + 24, cy + 30, 18, sub, 'left');
}
function rankCardHint(d, tab) {
if (tab === 1 && !C.RANK.useMock) {
if (!friendOn()) return '邀请微信好友一起拼 · 真机上才能读关系链';
if (!state.friendRankInfo) return '好友排名读取中…';
if (!state.friendRankInfo.total) return '邀请微信好友一起拼';
if (d.inTop) return '已在榜上 · 好友里第 ' + d.rank + ' 名';
return '再得 ' + (d.need || 1) + ' 星进入好友前 7';
}
if (d.empty) return '通关一关即可上榜';
if (d.inTop) return '已在榜上 · 第 ' + d.rank + ' 名';
if (d.need) return '再得 ' + d.need + ' 星进入前 7';
return '我的名次 · 第 ' + d.rank + ' 名';
}
function renderRank() {
var R = C.RANK;
var W = R.card.w, H = R.card.h, cy = R.card.cy;
ctx.fillStyle = COL.mask;
ctx.fillRect(0, 0, C.DESIGN.w, DH());
var dy = 0;
drawCard(C.DESIGN.w / 2, cy + dy, W, H, 34);
text('排行榜', C.DESIGN.w / 2, R.title.y + dy, R.title.size, COL.text, 'center', '700');
var tw = 176, gap = 10, tx0 = C.DESIGN.w / 2 - (tw * 3 + gap * 2) / 2;
for (var i = 0; i < 3; i++) {
var tx = tx0 + i * (tw + gap) + tw / 2, ty = R.tabsY + dy;
var tabOn = state.rankTab === i;
var tabBg = tabOn ? COL.gold : COL.chipOff;
rr(tx - tw / 2, ty - 27, tw, 54, 27);
ctx.fillStyle = tabBg;
ctx.fill();
var tabInk = tabOn
? bestInk(tabBg, COL.card, [COL.btnText, '#2A1D00', COL.inkOnLight || '#202A36'])
: bestInk(tabBg, COL.card, [COL.textOnChip, COL.textSub, COL.inkOnLight || '#202A36']);
text(R.tabs[i], tx, ty + 1, 24, tabInk, 'center', '700');
addHit(tx, ty, tw + 12, 80, 'rank_t' + i);
}
var I = R.info;
rr(I.x, I.y + dy - I.h / 2, I.w, I.h, I.h / 2);
ctx.fillStyle = COL.chipOff; ctx.fill();
text(rankInfoText(), C.DESIGN.w / 2, I.y + dy + 1, I.size,
COL.textOnChip || COL.textSub, 'center', '500');
var L = R.list;
var d = rankData();
var ry = L.top + dy, step = L.step;
if (state.rankTab === 1) {
renderFriendRank(d, ry);
} else if (state.rankLoading && !d.top.length) {
text('正在加载榜单…', C.DESIGN.w / 2, ry + 120, 24, COL.textSub, 'center');
} else if (state.rankErr && !d.top.length) {
text('榜单加载失败', C.DESIGN.w / 2, ry + 96, 26, COL.text, 'center', '600');
text(state.rankErr, C.DESIGN.w / 2, ry + 140, 19, COL.textSub, 'center');
var bR = { id: 'rank_retry', x: C.DESIGN.w / 2, y: ry + 224, w: 260, h: 76,
label: '重新加载', variant: 'primary', size: 26 };
addHit(bR.x, bR.y, bR.w, bR.h, 'rank_retry');
drawButton(bR);
} else if (!cloudOn() && !C.RANK.useMock && !state.rankList) {
text('未开启云同步', C.DESIGN.w / 2, ry + 96, 26, COL.text, 'center', '600');
text('当前进度只保存在这台手机上', C.DESIGN.w / 2, ry + 140, 19, COL.textSub, 'center');
text('开启后可跨设备同步并与全服玩家比进度', C.DESIGN.w / 2, ry + 172, 19, COL.textSub, 'center');
} else if (d.empty) {
text('还没有人上榜', C.DESIGN.w / 2, ry + 96, 26, COL.text, 'center', '600');
text('拼完一关就会出现在这里', C.DESIGN.w / 2, ry + 140, 19, COL.textSub, 'center');
} else {
for (var j = 0; j < d.top.length; j++) {
rankRow(d.top[j], ry + j * step, j, !!d.top[j].me);
}
}
renderMyRankCard(d);
text(C.RANK.useMock ? '示例榜单 · 仅供本地调试'
: (state.rankTab === 1) ? (friendOn() ? '好友榜 · 数据来自微信关系链'
: '浏览器预览 · 看不到微信好友')
: (state.rankErr) ? (d.top.length ? '网络不稳定 · 显示的是上次的榜单' : '加载失败 · 可点上面按钮重试')
: (state.rankTab === 2) ? '本周一 00:00 重置 · 只统计本周新增星数'
: ((cloudOn() || state.rankList) ? '全服实时榜 · 数据来自云开发' : '本地预览 · 未连接云端'),
C.DESIGN.w / 2, C.RANK.foot.y + dy, C.RANK.foot.size, COL.textSub, 'center');
var cby = C.RANK.close.y;
ctx.beginPath(); ctx.arc(C.DESIGN.w / 2, cby, C.RANK.close.r, 0, Math.PI * 2);
ctx.fillStyle = COL.disc; ctx.fill();
drawIcon('close', C.DESIGN.w / 2, cby, COL.text, 1.0);
addHit(C.DESIGN.w / 2, cby, 100, 100, 'close_rank');
ctx.restore();
}
function openRank(from) {
state.rankBack = from || null;
state.overlay = 'rank';
state.rankT = 0;
state.rankTickAt = Date.now();
state.rankPaintSig = '';
selectRankTab(state.rankTab);
}
function sharePattern() {
var lv = LEVELS[state.levelIdx];
var name = lv.name || ('第 ' + (state.levelIdx + 1) + ' 关');
var stars = state.result ? state.result.stars : 0;
var starTxt = stars ? ' ' + new Array(stars + 1).join('★') : '';
var title = '我在方寸巧拼拼出了「' + name + '」' + starTxt + '，来挑战一下？';
if (env.share) {
try { env.share({ title: title, text: title, capture: true }); } catch (err) { }
}
toast('已唤起分享');
}
function renderSettings() {
var P = C.PLAYER;
ctx.fillStyle = COL.mask;
ctx.fillRect(0, 0, C.DESIGN.w, DH());
drawCard(C.DESIGN.w / 2, DH() / 2, 588, 812, 32);
var cy = DH() / 2;
text('设置', C.DESIGN.w / 2, cy - 352, 44, COL.text, 'center', '600');
var cw = P.card.w, ch = P.card.h, ccy = cy + P.card.dy;
rr(C.DESIGN.w / 2 - cw / 2, ccy - ch / 2, cw, ch, 24);
ctx.fillStyle = COL.surface; ctx.fill();
var ax = C.DESIGN.w / 2 - cw / 2 + 34 + P.card.avatarR;
drawAvatar(ax, ccy, P.card.avatarR, meNick(), meAvatarUrl(), COL.gold);
var nx = ax + P.card.avatarR + P.card.gap;
var authable = profileCanAuth() && !state.me.auth;
var ebx = C.DESIGN.w / 2 + cw / 2 - 74;
var nickMaxW = authable ? (ebx - nx - 16) : (C.DESIGN.w / 2 + cw / 2 - 24 - nx);
var cardInk = inkOnSurface(false, false);
var cardSub = inkOnSurface(false, true);
textFit(meNick(), nx, ccy - 26, 30, cardInk, 'left', '700', nickMaxW);
if (authable) {
text(P.editLabel, ebx, ccy - 26, 20,
bestInk(COL.surface, COL.card, [COL.goldDeep, COL.inkOnLight || '#202A36']), 'center', '600');
addHit(ebx, ccy - 26, 120, 56, 'profile_rename');
}
textFit(profileStateText(), nx, ccy + 22, 18,
state.me.err ? bestInk(COL.surface, COL.card, [COL.dangerText, cardInk])
: cardSub, 'left', null, C.DESIGN.w / 2 + cw / 2 - 24 - nx);
var b1 = { id: authable ? 'profile_auth' : 'profile_rename',
x: C.DESIGN.w / 2, y: cy + P.authBtn.dy,
w: P.authBtn.w, h: P.authBtn.h,
label: authable ? P.authLabel : (state.me.auth ? '改昵称' : P.editLabel),
variant: 'secondary', size: 26 };
addHit(b1.x, b1.y, b1.w, b1.h, b1.id);
drawButton(b1);
syncProfileButton();
var r2 = { id: 'close_settings', x: C.DESIGN.w / 2, y: cy + 246, w: 340, h: 92, label: '关闭', variant: 'primary', size: 32 };
addHit(r2.x, r2.y, r2.w, r2.h, 'close_settings');
drawButton(r2);
text('云端存档：' + netText(), C.DESIGN.w / 2, cy - 38, 19,
state.net.err ? (COL.dangerText || '#E5484D') : COL.textSub, 'center');
var rows = [
{ label: '音效', id: 'toggle_sfx', on: state.settingsFx },
{ label: '音乐', id: 'toggle_bgm', on: state.settingsBgm }
];
for (var i = 0; i < rows.length; i++) {
var y = cy + 40 + i * 110;
text(rows[i].label, 190, y, 32, COL.text, 'left');
var sw = 108, sh = 56, sx = 480;
rr(sx, y - sh / 2, sw, sh, sh / 2);
ctx.fillStyle = rows[i].on ? COL.progressA : COL.lineDeep;
ctx.fill();
ctx.beginPath();
ctx.arc(rows[i].on ? sx + sw - sh / 2 : sx + sh / 2, y, sh / 2 - 5, 0, Math.PI * 2);
ctx.fillStyle = '#FFFFFF'; ctx.fill();
addHit(sx + sw / 2, y, sw + 40, 88, rows[i].id);
}
}
function sheetBg(w, h) {
ctx.fillStyle = COL.mask;
ctx.fillRect(0, 0, C.DESIGN.w, DH());
var cy = DH() / 2;
drawCard(C.DESIGN.w / 2, cy, w, h, 32);
return cy;
}
function sheetTitle(txt, cy, cardH) {
var tw = 220, th = 84, ty = cy - cardH / 2;
ctx.save();
shadow(10, 3, COL.shadow);
rr(C.DESIGN.w / 2 - tw / 2, ty - th / 2, tw, th, th / 2);
ctx.fillStyle = COL.card; ctx.fill();
noShadow(); ctx.restore();
text(txt, C.DESIGN.w / 2, ty, 40, COL.text, 'center', '700');
}
function sheetClose(vy, id) {
ctx.save();
ctx.beginPath(); ctx.arc(C.DESIGN.w / 2, vy, 40, 0, Math.PI * 2);
ctx.fillStyle = COL.card; ctx.fill();
ctx.restore();
drawIcon('close', C.DESIGN.w / 2, vy, COL.textSub, 1.15);
addHit(C.DESIGN.w / 2, vy, 100, 100, id || 'close_sheet');
}
function adLayer() {
if (!state.adSim) return;
var p = Math.min(1, state.adSim.t / C.ECON.adSimMs);
ctx.fillStyle = 'rgba(20,24,36,0.55)';
ctx.fillRect(0, 0, C.DESIGN.w, DH());
var cy = DH() / 2;
drawCard(C.DESIGN.w / 2, cy, 460, 240, 26);
text('广告播放中…', C.DESIGN.w / 2, cy - 46, 32, COL.text, 'center', '600');
ctx.save();
rr(C.DESIGN.w / 2 - 170, cy + 10, 340, 20, 10);
ctx.fillStyle = COL.track; ctx.fill();
rr(C.DESIGN.w / 2 - 170, cy + 10, 340 * p, 20, 10);
ctx.fillStyle = COL.gold; ctx.fill();
ctx.restore();
text(Math.round(p * 100) + '%', C.DESIGN.w / 2, cy + 70, 26, COL.textSub, 'center');
hits = [];
}
function renderHint() {
var H = C.HINT, s = state.save;
var busy = !!state.adSim || !!state.adWait;
var items = s.hintItems || 0;
var hasItem = items > 0 && !busy;
var ch = hasItem ? 720 : 616;
var cy = sheetBg(640, ch);
sheetTitle('提示', cy, ch);
var top = cy - ch / 2;
var y = top + 330;
text('帮你看下一步', C.DESIGN.w / 2, top + 168, 38, COL.text, 'center', '700');
text('圈起来的那块，放到金色虚线处 · 放对前一直亮着', C.DESIGN.w / 2, top + 224, 24, COL.textSub, 'center');
if (hasItem) {
var bItem = { id: 'hint_item', x: C.DESIGN.w / 2, y: y, w: 480, h: 92,
label: '用' + H.itemName + ' · 剩 ' + items, variant: 'primary', size: 28 };
addHit(bItem.x, bItem.y, bItem.w, bItem.h, 'hint_item');
drawButton(bItem);
y += 104;
}
var canCoin = (s.coin || 0) >= H.coinCost && !busy;
var bCoin = { id: 'hint_coin', x: C.DESIGN.w / 2, y: y, w: 480, h: 92,
label: (s.coin || 0) >= H.coinCost ? (H.coinCost + ' · 买 1 次') : ('巧币不足 ' + (s.coin || 0) + '/' + H.coinCost),
variant: (!hasItem && canCoin) ? 'primary' : 'secondary', size: 28, disabled: !canCoin,
icon: 'coin', iconInline: true, iconScale: 1.06 };
if (canCoin) addHit(bCoin.x, bCoin.y, bCoin.w, bCoin.h, 'hint_coin');
drawButton(bCoin);
y += 104;
var adLvOk = adLvLeft() > 0;
var bAd = { id: 'hint_ad', x: C.DESIGN.w / 2, y: y, w: 480, h: 92,
label: adLvOk ? '免费一次' : '本关看视频次数已用完',
variant: 'danger', size: adLvOk ? 28 : 24, icon: 'video', iconInline: true, iconScale: 1.05,
disabled: busy || !adLvOk };
if (!busy && adLvOk) addHit(bAd.x, bAd.y, bAd.w, bAd.h, 'hint_ad');
drawButton(bAd);
if (adLvOk) {
text('本关还可看 ' + adLvLeft() + '/' + adLvLimit() + ' 次',
C.DESIGN.w / 2, y + 74, 20, COL.textSub, 'center');
sheetClose(y + 130, 'close_hint');
} else {
sheetClose(y + 104, 'close_hint');
}
adLayer();
}
function renderFail() {
var t = state.failT || 0, A = C.FAIL_ANIM || {};
var flashMs = A.flashMs || 360, enterMs = A.enterMs || 440;
var heartMs = A.heartMs || 700, bannerMs = A.bannerMs || 1700;
var cardDelay = A.cardDelay || 460, shardMs = A.shardMs || 900;
var anim = !state.reduceMotion;
var enter = anim ? Math.max(0, Math.min(1, (t - cardDelay) / enterMs)) : 1;
var e = G.easeOutCubic(enter);
var cardOn = !anim || enter > 0;
var hitOK = !anim || enter >= 1;
var contentA = anim ? Math.max(0, Math.min(1, (enter - 0.55) / 0.35)) : 1;
var cy = DH() / 2, top = cy - 410;
var cx = C.DESIGN.w / 2;
ctx.fillStyle = COL.mask;
ctx.fillRect(0, 0, C.DESIGN.w, DH());
if (anim && t < flashMs) {
var fa = 1 - t / flashMs;
if (ctx.createRadialGradient) {
var vg = ctx.createRadialGradient(cx, cy, DH() * 0.04, cx, cy, DH() * 0.72);
vg.addColorStop(0, 'rgba(229,72,77,' + (0.05 * fa).toFixed(3) + ')');
vg.addColorStop(0.52, 'rgba(190,30,40,' + (0.18 * fa).toFixed(3) + ')');
vg.addColorStop(1, 'rgba(96,10,18,' + (0.58 * fa).toFixed(3) + ')');
ctx.fillStyle = vg;
ctx.fillRect(0, 0, C.DESIGN.w, DH());
}
ctx.fillStyle = 'rgba(229,72,77,' + (0.34 * fa).toFixed(3) + ')';
ctx.fillRect(0, 0, C.DESIGN.w, DH());
}
if (anim && t < shardMs) {
var sp = Math.max(0, Math.min(1, t / shardMs));
var sr = 44 + 190 * G.easeOutCubic(sp);
for (var si = 0; si < 14; si++) {
var sa = -Math.PI / 2 + si * 2 * Math.PI / 14 + si * 0.11;
var ss = 9 + (si % 4) * 4;
ctx.save();
ctx.globalAlpha = (1 - sp) * 0.88;
ctx.translate(cx + Math.cos(sa) * sr, cy + Math.sin(sa) * sr);
ctx.rotate(sa + sp * 1.6);
ctx.beginPath();
ctx.moveTo(0, -ss);
ctx.lineTo(ss * 0.82, ss * 0.72);
ctx.lineTo(-ss * 0.62, ss * 0.42);
ctx.closePath();
ctx.fillStyle = si % 3 === 0 ? '#FFD7A6' : (si % 3 === 1 ? '#E5484D' : '#FF8A78');
ctx.fill();
ctx.restore();
}
}
var shake = anim && t < 300 ? Math.sin(t / 22) * 7 * (1 - t / 300) : 0;
if (anim && t < bannerMs) {
var bp = Math.min(1, t / 420);
var byy = (cy - 520) - (1 - G.easeOutBack(bp)) * 90 + shake;
var ba = t > 580 ? Math.max(0, 1 - (t - 580) / (bannerMs - 580)) : 1;
ctx.save();
ctx.globalAlpha = ba;
ctx.translate(cx + shake, byy);
ctx.rotate(-0.05 * (1 - bp));
rr(-165, -34, 330, 68, 34);
ctx.fillStyle = 'rgba(214,58,62,0.96)'; ctx.fill();
text('时间到！', 0, 1, 38, '#FFFFFF', 'center', '700');
ctx.restore();
}
if (anim && t < cardDelay) {
var iy = cy + 150;
ctx.save();
ctx.globalAlpha = Math.max(0, 1 - t / cardDelay);
rr(cx - 118, iy - 36, 236, 72, 36);
ctx.fillStyle = 'rgba(74,14,18,0.55)'; ctx.fill();
text('挑战失败', cx, iy, 34, '#FFE3E3', 'center', '700');
ctx.restore();
}
if (cardOn) {
ctx.save();
if (anim && enter < 1) {
ctx.translate(cx, cy);
ctx.scale(0.94 + 0.06 * e, 0.94 + 0.06 * e);
ctx.translate(-cx, -cy + (1 - e) * 48 + shake * 0.5);
}
ctx.globalAlpha = 1;
var solid = overRgb(rgbOf(COL.card || '#FFFFFF'), rgbOf(COL.bg || '#000000'));
if (solid) {
ctx.fillStyle = 'rgb(' + Math.round(solid.r) + ',' + Math.round(solid.g) + ',' + Math.round(solid.b) + ')';
rr(cx - 300, cy - 410, 600, 820, 32);
ctx.fill();
}
drawCard(cx, cy, 600, 820, 32);
sheetTitle('游戏失败', cy, 820);
var s = state.save;
text('倒计时归零 · 复活可继续本关', cx, top + 66, 20, COL.textSub, 'center');
if (contentA > 0) {
ctx.save();
ctx.globalAlpha *= contentA;
var showStreak = Math.max(s.streak || 0, state.streakBeforeFail || 0);
text(showStreak > 0 ? ('已经连胜 ' + showStreak + ' 关了') : '本轮挑战结束',
cx, top + 305, 32, COL.text, 'center', '600');
text(showStreak > 0 ? '复活可以保持连胜' : '下次再来，连胜从 1 重新算',
cx, top + 355, 26, COL.textSub, 'center');
var adLvOk = adLvLeft() > 0;
var canAd = !state.adSim && adLvOk;
var bAd = { id: 'ad_revive', x: cx, y: top + 465, w: 480, h: 96,
label: adLvOk ? '看视频复活' : '本关看视频次数已用完',
variant: 'danger', size: adLvOk ? 32 : 25, disabled: !adLvOk,
icon: 'video', iconInline: true, iconScale: 1.05 };
if (canAd && hitOK) addHit(bAd.x, bAd.y, bAd.w, bAd.h, 'ad_revive');
drawButton(bAd);
text(adLvOk ? ('+1 心 · 继续本关 · 还可看 ' + adLvLeft() + ' 次')
: '+1 心 · 继续本关',
cx, top + 533, 24, COL.textSub, 'center', '600');
var canCoin = (s.coin || 0) >= C.ECON.coinRevive && !state.adSim;
var bCoin = { id: 'coin_revive', x: cx, y: top + 612, w: 480, h: 96,
label: canCoin ? (C.ECON.coinRevive + ' · 复活')
: ('巧币不足 ' + (s.coin || 0) + '/' + C.ECON.coinRevive),
variant: 'secondary', size: 30, disabled: !canCoin,
icon: 'coin', iconInline: true, iconScale: 1.06, pill: true };
if (canCoin && hitOK) addHit(bCoin.x, bCoin.y, bCoin.w, bCoin.h, 'coin_revive');
drawButton(bCoin);
var gy = top + 740;
text('忍痛放弃', cx, gy, 30, COL.textSub, 'center', '500');
if (hitOK) addHit(cx, gy, 240, 86, 'give_up');
ctx.restore();
}
ctx.restore();
}
var hp = anim ? (0.72 + 0.28 * G.easeOutBack(Math.min(1, t / heartMs))) : 1;
var beat = anim ? 1 + 0.055 * Math.sin(t / 90) * Math.max(0, 1 - t / 760) : 1;
var heartY = anim ? (cy + (top + 175 - cy) * e) : (top + 175);
var hs = (anim ? (3.55 - 0.35 * e) : 3.2) * hp * beat;
drawIcon('heart', cx, heartY, COL.dangerText || '#FF5A5A', hs);
if (anim && t > 280 && t < 1150) {
var ca = Math.min(1, (t - 280) / 180) * Math.max(0, 1 - (t - 700) / 450);
var k = hs / 3.2;
ctx.save();
ctx.globalAlpha = ca * 0.60;
ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3 * k;
ctx.beginPath();
ctx.moveTo(cx - 16 * k, heartY - 27 * k);
ctx.lineTo(cx - 2 * k, heartY + 3 * k);
ctx.lineTo(cx - 14 * k, heartY + 23 * k);
ctx.moveTo(cx + 14 * k, heartY - 23 * k);
ctx.lineTo(cx + 3 * k, heartY + 3 * k);
ctx.lineTo(cx + 16 * k, heartY + 21 * k);
ctx.stroke();
ctx.restore();
}
playHud(hudAnchorY());
adLayer();
}
function renderEnergy() {
var cy = sheetBg(600, 660);
sheetTitle('免费体力', cy, 660);
var top = cy - 660 / 2;
var per = C.ECON.freeEnergyShare * C.ECON.freeEnergyAdMul;
drawIcon('energy', C.DESIGN.w / 2 - 62, top + 200, '#3DBEF0', 3.2);
text('+' + per, C.DESIGN.w / 2 + 56, top + 200, 40, COL.text, 'center', '700');
var used = freeEnergyUsedToday(), total = C.ECON.freeEnergyPerDay;
var leftN = Math.max(0, total - used);
var can = leftN > 0 && !state.adSim;
var bAd = { id: 'free_ad', x: C.DESIGN.w / 2, y: top + 400, w: 460, h: 96,
label: C.ECON.freeEnergyAdMul + ' 倍获得', variant: 'danger', size: 30, disabled: !can,
icon: 'video', iconInline: true, iconScale: 1.05 };
addHit(bAd.x, bAd.y, bAd.w, bAd.h, 'free_ad');
drawButton(bAd);
text('单次 ' + C.ECON.freeEnergyShare + ' 点 × ' + C.ECON.freeEnergyAdMul + ' 倍 · 每日 ' + total + ' 次',
C.DESIGN.w / 2, top + 470, 21, COL.textSub, 'center');
text('使用次数 ' + used + '/' + total, C.DESIGN.w / 2, top + 510, 24, COL.textSub, 'center');
sheetClose(top + 700, 'close_energy');
adLayer();
}
function renderOnline() {
var cy = sheetBg(680, 1180), top = cy - 1180 / 2;
sheetTitle('在线奖励', cy, 1180);
var sec = onlineSecNow(), arr = onlineTierList();
var i;
text('今日累计在线 · 四巧 / 七巧共用', C.DESIGN.w / 2, top + 112, 22, COL.textSub, 'center');
text(onlineClock(sec), C.DESIGN.w / 2, top + 158, 54, COL.goldDeep, 'center', '700');
var next = null;
for (i = 0; i < arr.length; i++) { if (!arr[i].got) { next = arr[i]; break; } }
var p = next ? Math.min(1, sec / next.at) : 1;
var bx = C.DESIGN.w / 2 - 260, bw = 520, by = top + 204;
ctx.save();
rr(bx, by, bw, 12, 6); ctx.fillStyle = COL.track; ctx.fill();
if (p > 0) { rr(bx, by, Math.max(12, bw * p), 12, 6); ctx.fillStyle = COL.gold; ctx.fill(); }
ctx.restore();
var readyN = onlineClaimCount();
var note = readyN > 0 ? ('有 ' + readyN + ' 档奖励可领')
: (!next ? '今天的奖励已全部领完'
: ('距「' + next.label + '」还差 ' + onlineClock(next.left)));
text(note + ' · 每日 0 点重新统计', C.DESIGN.w / 2, top + 240, 20, COL.textSub, 'center');
for (i = 0; i < arr.length; i++) {
var t = arr[i], y = top + 318 + i * 122;
ctx.save();
rr(55, y - 56, 640, 112, 20);
ctx.fillStyle = t.ready ? 'rgba(255,185,61,0.13)' : 'rgba(74,51,39,0.05)';
ctx.fill();
if (t.ready) { ctx.lineWidth = 2; ctx.strokeStyle = COL.gold; ctx.stroke(); }
ctx.restore();
text('在线 ' + t.label, 86, y - 18, 27, COL.text, 'left', '600');
var rw = [];
if (t.energy) rw.push({ icon: 'energy', n: t.energy });
if (t.coin) rw.push({ icon: 'coin', n: t.coin });
if (t.hint) rw.push({ icon: 'hint', n: t.hint });
drawRewardRow(rw, 86, y + 22, !!t.got);
var label = t.got ? '已领取' : (t.ready ? '领取' : ('差 ' + onlineClock(t.left)));
var b = {
id: 'online_' + t.id, x: 596, y: y, w: 150, h: 70,
label: label, variant: t.ready ? 'primary' : 'secondary',
size: t.ready || t.got ? 24 : 20,
disabled: t.got || !t.ready
};
addHit(b.x, b.y, b.w, b.h, b.id);
drawButton(b);
}
var ht = '×' + (state.save.hintItems || 0) + ' · 关卡「提示」面板可直接使用';
ctx.font = font(21);
var hw = ctx.measureText ? meas(ht) : 300;
var hx0 = C.DESIGN.w / 2 - (hw + 30) / 2;
drawIcon('hint', hx0 + 13, top + 1030, COL.textSub, 0.62);
text(ht, hx0 + 30, top + 1030, 21, COL.textSub, 'left');
sheetClose(top + 1112, 'close_sheet');
adLayer();
}
function drawRewardRow(items, x, y, dim) {
var cx = x;
for (var i = 0; i < items.length; i++) {
var it = items[i];
drawIcon(it.icon, cx + 13, y, COL.goldDeep, 0.78);
var txt = '+' + it.n;
ctx.font = font(22, '600');
var tw = ctx.measureText ? meas(txt) : 26;
text(txt, cx + 30, y + 1, 22, dim ? COL.textSub : COL.goldDeep, 'left', '600');
cx += 30 + tw + 26;
}
}
var INV_ROW_H = 118, INV_HEAD_H = 32, INV_PITCH = 130;
function tierRewards(t) {
var out = [];
if (t.coin) out.push({ kind: 'coin', n: t.coin });
if (t.energy) out.push({ kind: 'energy', n: t.energy });
if (t.hint) out.push({ kind: 'hint', n: t.hint });
if (t.pstyle) out.push({ kind: 'pstyle', key: t.pstyle, n: 1 });
if (t.bgfx) out.push({ kind: 'bgfx', key: t.bgfx, n: 1 });
return out;
}
var PS_ICON_COL = {
classic: '#4FA8E0', candy: '#F5A623', wood: '#C08850', neon: '#8A6BF0',
pastel: '#F5A0B8', crystal: '#3E9BD6', metal: '#98A6B4', jade: '#3FAF7C', glow: '#57D48C'
};
function drawRewardIcon(kind, key, x, y, box) {
if (kind === 'coin' || kind === 'energy' || kind === 'hint') {
drawIcon(kind, x, y, COL.text, box / 44);
return;
}
var r = box / 2;
ctx.save();
ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
ctx.fillStyle = state.darkUi ? 'rgba(255,255,255,0.10)' : 'rgba(44,58,75,0.05)';
ctx.fill();
ctx.lineWidth = 1.6; ctx.strokeStyle = hexA(COL.gold, 0.55); ctx.stroke();
ctx.clip();
if (kind === 'pstyle') {
drawPreviewPiece(x, y + r * 0.06, r * 0.80, PS_ICON_COL[key] || '#4FA8E0', key);
} else {
drawBgSwatch(key, x, y, r);
}
ctx.restore();
}
function drawBgSwatch(key, x, y, r) {
var fx = C.BG_FX[key] || {}, mode = fx.mode || 'glow', i;
var bgCol = fx.dark ? '#1B2547'
: (state.darkUi ? 'rgba(255,255,255,0.12)'
: (mode === 'aurora' ? '#E8E2F7' : mode === 'snow' ? '#DCEBF5'
: mode === 'bubbles' ? '#E4F2FB' : '#FFF6E2'));
ctx.fillStyle = bgCol;
ctx.fillRect(x - r, y - r, r * 2, r * 2);
if (mode === 'bubbles') {
var bc = ['#78C4F0', '#F7A8C0', '#F7C873'];
for (i = 0; i < 4; i++) {
var bx = x - 7 + (i % 2) * 12, by = y - 7 + Math.floor(i / 2) * 13;
var br = i % 3 === 0 ? 5 : 3.8;
ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2);
ctx.fillStyle = hexA(bc[i % 3], 0.30); ctx.fill();
ctx.lineWidth = 1.3; ctx.strokeStyle = bc[i % 3]; ctx.stroke();
}
} else if (mode === 'petals') {
var pc = ['#F7A0BE', '#EF7F9E', '#FFC0CE'];
for (i = 0; i < 4; i++) {
var px2 = x - 6 + (i % 2) * 12, py2 = y - 7 + Math.floor(i / 2) * 13;
ctx.save(); ctx.translate(px2, py2); ctx.rotate(-0.6 + i * 0.45);
ctx.beginPath(); ctx.ellipse(0, 0, 5, 2.5, 0, 0, Math.PI * 2);
ctx.fillStyle = pc[i % 3]; ctx.fill();
ctx.restore();
}
} else {
var dots = mode === 'snow' ? '#FFFFFF'
: mode === 'rain' ? '#8FC4E8'
: mode === 'stars' ? '#FFF4C8'
: mode === 'firefly' ? '#F7E27A'
: mode === 'nebula' ? '#C9A8F5'
: (fx.dark ? '#FFE6A8' : '#F5B93D');
for (i = 0; i < 6; i++) {
var dx = x - 10 + (i % 3) * 10, dy = y - 8 + Math.floor(i / 3) * 13;
ctx.beginPath(); ctx.arc(dx, dy, i % 2 ? 2.2 : 1.5, 0, Math.PI * 2);
ctx.fillStyle = dots; ctx.fill();
}
}
}
function addListHit(x, y, w, h, id, L) {
var y0 = Math.max(y - h / 2, L.y), y1 = Math.min(y + h / 2, L.y + L.h);
if (y1 - y0 < 24) return;
hits.push({ x: x - w / 2, y: y0, w: w, h: y1 - y0, id: id, kind: 'btn' });
}
function drawInviteRow(t, rx, ry, w, cnt, got) {
var done = got.indexOf(t.n) >= 0;
var can = cnt >= t.n;
ctx.save();
rr(rx, ry, w, INV_ROW_H, 16);
ctx.fillStyle = done ? hexA(COL.gold, state.darkUi ? 0.13 : 0.10) : COL.card;
ctx.fill();
ctx.lineWidth = 1.4;
ctx.strokeStyle = done ? hexA(COL.gold, 0.5) : COL.line;
ctx.stroke();
ctx.restore();
var dk = !!state.darkUi;
ctx.save();
rr(rx + 1, ry + 1, w - 2, INV_HEAD_H, 14);
var hg = ctx.createLinearGradient(0, ry, 0, ry + INV_HEAD_H);
if (dk) {
hg.addColorStop(0, hexA(COL.gold, 0.34)); hg.addColorStop(1, hexA(COL.gold, 0.20));
} else {
hg.addColorStop(0, shadeHex(COL.gold, 0.20)); hg.addColorStop(1, COL.gold);
}
ctx.fillStyle = hg; ctx.fill();
ctx.fillRect(rx + 1, ry + INV_HEAD_H - 10, w - 2, 10);
ctx.restore();
text('累计邀请 ' + t.n + ' 人进入游戏', rx + w / 2, ry + INV_HEAD_H / 2 + 1,
20, dk ? COL.gold : COL.btnText, 'center', '700');
var cy = ry + INV_HEAD_H + (INV_ROW_H - INV_HEAD_H) / 2;
var rw = tierRewards(t);
for (var i = 0; i < rw.length; i++) {
var ix = rx + 56 + i * 78;
drawRewardIcon(rw[i].kind, rw[i].key, ix, cy - 7, 42);
text('×' + rw[i].n, ix, cy + 27, 17, done ? COL.goldDeep : COL.textSub, 'center', '700');
}
var barX = rx + 190, barW = 190, barH = 30;
var pr = t.n > 0 ? Math.min(1, cnt / t.n) : 0;
ctx.save();
rr(barX, cy - barH / 2, barW, barH, barH / 2);
ctx.fillStyle = COL.track; ctx.fill();
if (pr > 0) {
rr(barX, cy - barH / 2, Math.max(barH, barW * pr), barH, barH / 2);
var pg = ctx.createLinearGradient(0, cy - barH / 2, 0, cy + barH / 2);
pg.addColorStop(0, shadeHex(COL.gold, 0.16)); pg.addColorStop(1, COL.gold);
ctx.fillStyle = pg; ctx.fill();
}
ctx.restore();
var barInk = pr >= 0.55 ? COL.btnText
: bestInk(COL.track, COL.card, [COL.textOnChip, COL.textSub, COL.inkOnLight || '#202A36']);
text(Math.min(cnt, t.n) + '/' + t.n, barX + barW / 2, cy + 1, 18, barInk, 'center', '700');
var bw = 148, bh = 60, bx = rx + w - 16 - bw / 2;
if (done) {
ctx.save();
rr(bx - bw / 2, cy - bh / 2, bw, bh, bh / 2);
ctx.fillStyle = state.darkUi ? 'rgba(255,255,255,0.07)' : 'rgba(120,130,146,0.11)';
ctx.fill();
ctx.restore();
text('已领取', bx, cy + 1, 22, COL.textSub, 'center', '600');
return null;
}
if (can) {
ctx.save(); shadow(8, 3, COL.shadow);
rr(bx - bw / 2, cy - bh / 2, bw, bh, bh / 2);
var cg = ctx.createLinearGradient(0, cy - bh / 2, 0, cy + bh / 2);
cg.addColorStop(0, COL.gold); cg.addColorStop(1, COL.goldDeep);
ctx.fillStyle = cg; ctx.fill(); noShadow(); ctx.restore();
text('领取', bx, cy + 1, 24, COL.btnText, 'center', '700');
return 'invite_claim_' + t.n;
}
ctx.save(); shadow(8, 3, 'rgba(30,120,160,0.26)');
rr(bx - bw / 2, cy - bh / 2, bw, bh, bh / 2);
var ig = ctx.createLinearGradient(0, cy - bh / 2, 0, cy + bh / 2);
ig.addColorStop(0, '#5AD0F0'); ig.addColorStop(1, '#27A9D8');
ctx.fillStyle = ig; ctx.fill(); noShadow(); ctx.restore();
drawIcon('share', bx - 38, cy, '#FFFFFF', 0.72);
text('邀请', bx + 16, cy + 1, 23, '#FFFFFF', 'center', '700');
return 'invite_share';
}
function renderInvite() {
var V = C.INVITE, T = V.tiers, s = state.save;
var CH = Math.max(860, Math.min(1180, DH() - 140));
var cy = sheetBg(660, CH);
sheetTitle('邀请有礼', cy, CH);
var top = cy - CH / 2, cx = C.DESIGN.w / 2;
var cnt = s.inviteCount || 0;
var got = s.inviteGot || [];
var pendN = (s.invitePend || []).length;
text('邀请的好友需完成任意 ' + V.needCleared + ' 关才计入',
cx, top + 96, 20, COL.textSub, 'center');
var sum = '已邀请 ' + cnt + ' 人 · 已完成 ' + got.length + '/' + T.length + ' 档';
if (pendN) sum += ' · ' + pendN + ' 位在闯关中';
text(sum, cx, top + 130, 22, COL.goldDeep, 'center', '700');
var L = { x: cx - 290, y: top + 162, w: 580, h: CH - 162 - 128 };
state.inviteList = L;
var contentH = T.length * INV_PITCH - (INV_PITCH - INV_ROW_H);
state.inviteScrollMax = Math.max(0, contentH - L.h);
if (state.inviteScroll > state.inviteScrollMax) state.inviteScroll = state.inviteScrollMax;
if (!(state.inviteScroll > 0)) state.inviteScroll = 0;
var sc = state.inviteScroll;
ctx.save();
rr(L.x, L.y, L.w, L.h, 16);
ctx.clip();
var rowX = L.x + 10, rowW = L.w - 20;
for (var i = 0; i < T.length; i++) {
var ry = L.y + i * INV_PITCH - sc;
if (ry + INV_ROW_H < L.y - 2 || ry > L.y + L.h + 2) continue;
var rid = drawInviteRow(T[i], rowX, ry, rowW, cnt, got);
if (rid) addListHit(rowX + rowW - 16 - 74, ry + INV_HEAD_H + (INV_ROW_H - INV_HEAD_H) / 2,
148, 60, rid, L);
}
ctx.restore();
if (state.inviteScrollMax > 0) {
var trH = L.h - 16, thH = Math.max(64, trH * (L.h / contentH));
var thY = L.y + 8 + (trH - thH) * (sc / state.inviteScrollMax);
ctx.save();
rr(L.x + L.w - 7, L.y + 8, 5, trH, 3);
ctx.fillStyle = hexA(COL.textSub, 0.14); ctx.fill();
rr(L.x + L.w - 7, thY, 5, thH, 3);
ctx.fillStyle = hexA(COL.gold, 0.75); ctx.fill();
ctx.restore();
}
sheetClose(top + CH - 56, 'close_sheet');
adLayer();
}
function renderSkin() {
var tab0 = state.skinTab || 0;
var cnt0 = tab0 === 0 ? Object.keys(C.SKINS).length
: tab0 === 1 ? Object.keys(C.BG_FX).length
: tab0 === 2 ? Object.keys(C.PIECE_STYLES).length
: Object.keys(C.SFX_STYLES).length;
var rows0 = Math.ceil(cnt0 / 3);
var CH = rows0 <= 2 ? 720 : (rows0 === 3 ? 860 : 1000);
var cy = sheetBg(660, CH);
sheetTitle('皮肤', cy, CH);
var top = cy - CH / 2;
var tab = tab0;
var TABS = [
{ k: 'theme', label: '配色' },
{ k: 'bg', label: '背景' },
{ k: 'piece', label: '板件' },
{ k: 'sfx', label: '音效' }
];
var tabW = 140, tabGap = 12, tabY = top + 96;
var totalW = TABS.length * tabW + (TABS.length - 1) * tabGap;
var tabX0 = C.DESIGN.w / 2 - totalW / 2;
for (var ti = 0; ti < TABS.length; ti++) {
var tx = tabX0 + ti * (tabW + tabGap);
var active = ti === tab;
ctx.save();
rr(tx, tabY - 34, tabW, 68, 20);
ctx.fillStyle = active ? COL.gold : COL.disabledBg;
if (active) shadow(8, 3, hexA(COL.goldDeep || '#FF9F1C', 0.35));
ctx.fill(); noShadow(); ctx.restore();
text(TABS[ti].label, tx + tabW / 2, tabY + 1, 27,
active ? COL.btnText : COL.textSub, 'center', active ? '700' : '500');
addHit(tx + tabW / 2, tabY, tabW, 68, 'skin_tab_' + ti);
}
var gridTop = top + 190;
if (tab === 0) {
var cur = state.save.skin || 'warm';
var keys = Object.keys(C.SKINS);
var cols = 3, cw = 178, ch = 176, gx = 14, gy = 18;
var rowN = Math.ceil(keys.length / cols);
var startX = C.DESIGN.w / 2 - (cols * cw + (cols - 1) * gx) / 2 + cw / 2;
for (var i = 0; i < keys.length; i++) {
var k = keys[i], sk = C.SKINS[k];
var col = i % cols, row = Math.floor(i / cols);
var x = startX + col * (cw + gx);
var y = gridTop + row * (ch + gy) + ch / 2;
skinOptionBox(x, y, cw - 8, ch - 8, cur === k);
rr(x - 52, y - 44, 104, 74, 12); ctx.fillStyle = sk.bg; ctx.fill();
ctx.lineWidth = 1; ctx.strokeStyle = sk.line || COL.line; ctx.stroke();
ctx.beginPath(); ctx.arc(x - 22, y - 18, 12, 0, Math.PI * 2); ctx.fillStyle = sk.gold; ctx.fill();
ctx.beginPath(); ctx.arc(x + 16, y - 18, 12, 0, Math.PI * 2); ctx.fillStyle = sk.text; ctx.fill();
ctx.fillStyle = sk.goldDeep; rr(x - 40, y + 14, 80, 8, 4); ctx.fill();
if (cur === k) skinCheck(x, y, 170, 160);
text(sk.name, x, y + ch / 2 - 18, 23, COL.text, 'center', '600');
addHit(x, y, cw, ch, 'skin_' + k);
}
text('只换配色，不影响关卡与判定', C.DESIGN.w / 2, top + CH - 92, 21, COL.textSub, 'center');
} else if (tab === 1) {
var curFx = state.save.bgFx || 'classic';
var fxKeys = Object.keys(C.BG_FX);
drawSkinGrid(fxKeys, gridTop, curFx, function (k, x, y, sel) {
var mode = C.BG_FX[k].mode;
rr(x - 54, y - 44, 108, 78, 12);
ctx.fillStyle = C.BG_FX[k].dark ? '#141C36'
: (mode === 'aurora' ? '#E8E2F7' : mode === 'snow' ? '#DCEBF5'
: mode === 'bubbles' ? '#E4F2FB' : COL.card);
ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = COL.line; ctx.stroke();
ctx.save(); rr(x - 54, y - 44, 108, 78, 12); ctx.clip();
drawFxPreview(mode, x, y);
ctx.restore();
if (sel) skinCheck(x, y, 170, 160);
text(C.BG_FX[k].name, x, y + 46, 22, COL.text, 'center', '600');
text(C.BG_FX[k].desc, x, y + 68, 17, COL.textSub, 'center');
}, 'bgfx_');
} else if (tab === 2) {
var curPs = state.save.pieceStyle || 'classic';
var psKeys = Object.keys(C.PIECE_STYLES);
drawSkinGrid(psKeys, gridTop, curPs, function (k, x, y, sel) {
rr(x - 54, y - 44, 108, 78, 12); ctx.fillStyle = COL.card; ctx.fill();
ctx.lineWidth = 1; ctx.strokeStyle = COL.line; ctx.stroke();
var demo = ['#4FA8E0', '#63C88B', '#FF8A5B'];
for (var pi = 0; pi < 3; pi++) {
var vx = x - 34 + pi * 34;
drawPreviewPiece(vx, y - 5, 26, demo[pi], k);
}
if (sel) skinCheck(x, y, 170, 160);
text(C.PIECE_STYLES[k].name, x, y + 46, 22, COL.text, 'center', '600');
text(C.PIECE_STYLES[k].desc, x, y + 68, 17, COL.textSub, 'center');
}, 'pstyle_');
text('带价签的板件需花巧币解锁 · 买一次四巧 / 七巧都能用',
C.DESIGN.w / 2, top + CH - 92, 21, COL.textSub, 'center');
} else {
var curSf = state.save.sfxStyle || 'wood';
var sfKeys = Object.keys(C.SFX_STYLES);
drawSkinGrid(sfKeys, gridTop, curSf, function (k, x, y, sel) {
rr(x - 54, y - 40, 108, 70, 12); ctx.fillStyle = COL.card; ctx.fill();
ctx.lineWidth = 1; ctx.strokeStyle = COL.line; ctx.stroke();
ctx.save();
ctx.fillStyle = COL.goldDeep;
ctx.beginPath(); ctx.ellipse(x - 8, y + 4, 6, 4.2, -0.4, 0, Math.PI * 2); ctx.fill();
ctx.strokeStyle = COL.goldDeep; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
ctx.beginPath(); ctx.moveTo(x - 3, y + 3); ctx.lineTo(x - 3, y - 14); ctx.stroke();
ctx.beginPath(); ctx.moveTo(x - 3, y - 14); ctx.quadraticCurveTo(x + 8, y - 15, x + 8, y - 7); ctx.stroke();
ctx.restore();
var wave = C.SFX_STYLES[k].wave;
var bars = wave === 'square' ? [8, 8, 18, 8, 18, 8] : (wave === 'triangle' ? [6, 12, 18, 12, 8, 5] : [4, 10, 20, 12, 7, 4]);
for (var bi = 0; bi < bars.length; bi++) {
ctx.fillStyle = hexA(COL.goldDeep || '#FF9F1C', 0.7);
ctx.fillRect(x - 40 + bi * 14, y + 14 - bars[bi] / 2, 8, bars[bi]);
}
if (sel) skinCheck(x, y, 170, 160);
text(C.SFX_STYLES[k].name, x, y + 46, 22, COL.text, 'center', '600');
text(C.SFX_STYLES[k].desc, x, y + 68, 17, COL.textSub, 'center');
}, 'sfx_');
text('点选即刻试听，可随时切换', C.DESIGN.w / 2, top + CH - 92, 21, COL.textSub, 'center');
}
sheetClose(top + CH - 34, 'close_sheet');
}
function renderBuy() {
var it = state.buyItem;
if (!it) { state.overlay = 'skin'; return; }
var CH = 600, cy = sheetBg(600, CH);
sheetTitle('解锁皮肤', cy, CH);
var top = cy - CH / 2, s = state.save;
var cx = C.DESIGN.w / 2;
var px = cx, py = top + 170;
if (it.kind === 'bgfx') {
var mode = (C.BG_FX[it.key] || {}).mode || 'glow';
rr(px - 90, py - 60, 180, 120, 16);
ctx.fillStyle = C.BG_FX[it.key] && C.BG_FX[it.key].dark ? '#141C36'
: (mode === 'aurora' ? '#E8E2F7' : mode === 'snow' ? '#DCEBF5' : COL.card);
ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = COL.line; ctx.stroke();
ctx.save(); rr(px - 90, py - 60, 180, 120, 16); ctx.clip();
drawFxPreview(mode, px, py);
ctx.restore();
} else {
rr(px - 90, py - 60, 180, 120, 16);
ctx.fillStyle = COL.card; ctx.fill();
ctx.lineWidth = 1.5; ctx.strokeStyle = COL.line; ctx.stroke();
var demo = ['#4FA8E0', '#63C88B', '#FF8A5B'];
for (var pi = 0; pi < 3; pi++) drawPreviewPiece(px - 44 + pi * 44, py + 4, 34, demo[pi], it.key);
}
text(it.name, cx, top + 276, 36, COL.text, 'center', '700');
text(it.desc || '', cx, top + 312, 22, COL.textSub, 'center');
text('买一次 · 四巧 / 七巧都能用', cx, top + 350, 19, COL.textSub, 'center');
var priceTxt = it.price + ' 巧币';
ctx.font = font(34, '700');
var pw = (ctx.measureText ? meas(priceTxt) : 120);
var gx0 = cx - (pw + 34) / 2;
drawIcon('coin', gx0 + 14, top + 400, COL.gold, 0.85);
text(priceTxt, gx0 + 34, top + 400, 34, COL.goldDeep, 'left', '700');
var poor = (s.coin || 0) < it.price;
text(poor ? ('巧币不足 · 当前 ' + (s.coin || 0)) : ('当前巧币 ' + (s.coin || 0)),
cx, top + 442, 22, poor ? '#E4654F' : COL.textSub, 'center');
var bw = 224;
drawButton({ id: 'buy_cancel', x: cx - 126, y: top + 518, w: bw, h: 92,
label: '再想想', variant: 'secondary', size: 30 });
addHit(cx - 126, top + 518, bw, 92, 'buy_cancel');
drawButton({ id: 'buy_confirm', x: cx + 126, y: top + 518, w: bw, h: 92,
label: poor ? '巧币不足' : '立即解锁', variant: 'primary', size: 30, disabled: poor });
addHit(cx + 126, top + 518, bw, 92, 'buy_confirm');
}
function drawSkinGrid(keys, gridTop, curKey, drawCell, idPrefix) {
var kind = idPrefix === 'bgfx_' ? 'bgfx' : (idPrefix === 'pstyle_' ? 'pstyle' : null);
var cols = 3, cw = 178, ch = 168, gx = 14, gy = 14;
var startX = C.DESIGN.w / 2 - (cols * cw + (cols - 1) * gx) / 2 + cw / 2;
for (var i = 0; i < keys.length; i++) {
var k = keys[i];
var col = i % cols, row = Math.floor(i / cols);
var x = startX + col * (cw + gx);
var y = gridTop + row * (ch + gy) + ch / 2;
skinOptionBox(x, y, cw - 8, ch - 8, curKey === k);
drawCell(k, x, y, curKey === k);
if (kind) {
var pr = itemPrice(kind, k);
if (pr > 0 && !ownsItem(kind, k)) drawPriceTag(x, y, pr);
}
addHit(x, y, cw, ch, idPrefix + k);
}
}
function drawPriceTag(x, y, price) {
var w = 76, h = 32;
var px = x + 85 - 10 - w, py = y - 80 + 4;
ctx.save();
rr(px, py, w, h, h / 2);
ctx.fillStyle = COL.gold; ctx.fill();
ctx.lineWidth = 1.5; ctx.strokeStyle = hexA(COL.goldEdge || '#E08A00', 0.75); ctx.stroke();
ctx.restore();
drawIcon('coin', px + 19, py + h / 2, COL.btnText, 0.5);
text(String(price), px + 34, py + h / 2 + 1, 21, COL.btnText, 'left', '700');
}
function skinOptionBox(x, y, w, h, sel) {
ctx.save();
rr(x - w / 2, y - h / 2, w, h, 18);
ctx.fillStyle = COL.card; ctx.fill();
ctx.lineWidth = sel ? 5 : 1.5;
ctx.strokeStyle = sel ? COL.goldEdge : COL.line;
if (sel) shadow(8, 3, hexA(COL.goldDeep || '#FF9F1C', 0.3));
ctx.stroke(); noShadow();
ctx.restore();
}
function skinCheck(x, y, boxW, boxH) {
var cx = x + (boxW || 170) / 2 - 22;
var cy = y - (boxH || 168) / 2 + 20;
ctx.save();
shadow(4, 2, 'rgba(44,58,75,0.25)');
ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2);
ctx.fillStyle = COL.gold; ctx.fill();
noShadow();
ctx.restore();
drawIcon('check', cx, cy, COL.btnText, 0.7);
}
function drawFxPreview(mode, x, y) {
if (mode === 'glow') {
var g = ctx.createRadialGradient(x, y, 4, x, y, 62);
g.addColorStop(0, 'rgba(255,224,160,0.95)'); g.addColorStop(1, 'rgba(255,224,160,0)');
ctx.fillStyle = g; ctx.fillRect(x - 60, y - 55, 120, 110);
} else if (mode === 'aurora') {
var cols2 = ['#FFB38A', '#8EC9F5', '#9BE3C4'];
for (var a = 0; a < 3; a++) {
var g2 = ctx.createRadialGradient(x - 30 + a * 30, y, 4, x - 30 + a * 30, y, 34);
g2.addColorStop(0, hexA(cols2[a], 0.65)); g2.addColorStop(1, hexA(cols2[a], 0));
ctx.fillStyle = g2; ctx.fillRect(x - 60, y - 55, 120, 110);
}
} else if (mode === 'stars') {
for (var s = 0; s < 12; s++) {
var sx = x - 48 + fxRnd(s * 3 + 1) * 96, sy = y - 42 + fxRnd(s * 3 + 2) * 84;
ctx.fillStyle = s % 3 ? '#FFFFFF' : '#FFF4C8';
ctx.beginPath(); ctx.arc(sx, sy, s % 4 === 0 ? 2.6 : 1.4, 0, Math.PI * 2); ctx.fill();
}
} else if (mode === 'bubbles') {
var bTone = ['rgba(96,175,240,', 'rgba(255,150,180,', 'rgba(250,196,105,'];
for (var b = 0; b < 6; b++) {
var bx = x - 42 + fxRnd(b * 5) * 84, by = y - 38 + fxRnd(b * 5 + 2) * 74;
var br = 5 + fxRnd(b * 5 + 3) * 9, bt = bTone[b % 3];
ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2);
ctx.fillStyle = bt + '0.18)'; ctx.fill();
ctx.strokeStyle = bt + '0.85)'; ctx.lineWidth = 1.3; ctx.stroke();
ctx.beginPath(); ctx.arc(bx - br * 0.34, by - br * 0.34, br * 0.2, 0, Math.PI * 2);
ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fill();
}
} else if (mode === 'petals') {
for (var p = 0; p < 5; p++) {
ctx.save(); ctx.translate(x - 38 + fxRnd(p * 7) * 76, y - 34 + fxRnd(p * 7 + 1) * 68);
ctx.rotate(fxRnd(p * 7 + 2) * 6); ctx.fillStyle = hexA('#FF9BB0', 0.85);
petalPath(ctx, 7); ctx.fill(); ctx.restore();
}
} else if (mode === 'geometric') {
var pc = ['#4FA8E0', '#FF8A5B', '#63C88B', '#A87BE8'];
for (var gi = 0; gi < 4; gi++) {
ctx.save(); ctx.translate(x - 36 + fxRnd(gi * 9) * 72, y - 32 + fxRnd(gi * 9 + 1) * 64);
ctx.rotate(fxRnd(gi * 9 + 2) * 6); ctx.fillStyle = hexA(pc[gi], 0.7);
ctx.beginPath(); ctx.moveTo(-11, 7); ctx.lineTo(11, 7); ctx.lineTo(0, -11); ctx.closePath(); ctx.fill();
ctx.restore();
}
} else if (mode === 'snow') {
for (var si = 0; si < 12; si++) {
var sxx = x - 48 + fxRnd(si * 5 + 1) * 96, syy = y - 42 + fxRnd(si * 5 + 2) * 84;
ctx.globalAlpha = 0.55 + fxRnd(si * 5 + 3) * 0.45; ctx.fillStyle = '#FFFFFF';
ctx.beginPath(); ctx.arc(sxx, syy, 1.6 + fxRnd(si * 5 + 4) * 2.6, 0, Math.PI * 2); ctx.fill();
}
ctx.globalAlpha = 1;
} else if (mode === 'rain') {
ctx.strokeStyle = 'rgba(150,190,235,0.75)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
for (var ri = 0; ri < 12; ri++) {
var rxx = x - 48 + fxRnd(ri * 4 + 1) * 96, ryy = y - 42 + fxRnd(ri * 4 + 2) * 84;
ctx.beginPath(); ctx.moveTo(rxx, ryy); ctx.lineTo(rxx - 5, ryy + 16 + fxRnd(ri * 4 + 3) * 10); ctx.stroke();
}
} else if (mode === 'firefly') {
for (var fi = 0; fi < 11; fi++) {
var fxx = x - 46 + fxRnd(fi * 6 + 1) * 92, fyy = y - 40 + fxRnd(fi * 6 + 2) * 80;
ctx.fillStyle = fi % 2 ? '#C8FF7A' : '#FFE98A';
ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = qShadow(9);
ctx.beginPath(); ctx.arc(fxx, fyy, 2 + fxRnd(fi * 6 + 3) * 2, 0, Math.PI * 2); ctx.fill();
}
ctx.shadowBlur = qShadow(0);
} else if (mode === 'nebula') {
var nc = ['#7B5CE8', '#3E7FE0', '#C451D6', '#4BC6E8'];
for (var ni = 0; ni < 4; ni++) {
var nx = x - 28 + ni * 19, ny = y + Math.sin(ni * 2) * 16;
var ng = ctx.createRadialGradient(nx, ny, 2, nx, ny, 32);
ng.addColorStop(0, hexA(nc[ni], 0.7)); ng.addColorStop(1, hexA(nc[ni], 0));
ctx.fillStyle = ng; ctx.fillRect(nx - 32, ny - 32, 64, 64);
}
}
}
function drawPreviewPiece(x, y, r, color, style) {
ctx.save();
ctx.translate(x, y);
ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r, r * 0.8); ctx.lineTo(-r, r * 0.8); ctx.closePath();
if (style === 'neon') {
ctx.shadowColor = color; ctx.shadowBlur = qShadow(10); ctx.fillStyle = shadeHex(color, -0.5);
} else if (style === 'glow') {
ctx.shadowColor = color; ctx.shadowBlur = qShadow(9); ctx.fillStyle = color;
} else ctx.fillStyle = color;
ctx.fill(); ctx.shadowBlur = qShadow(0);
ctx.save(); ctx.clip();
if (style === 'candy' || style === 'pastel') {
var g = ctx.createLinearGradient(-r, -r, r, r);
g.addColorStop(0, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0.18)');
ctx.fillStyle = g; ctx.fillRect(-r, -r, r * 2, r * 2);
} else if (style === 'wood') {
ctx.strokeStyle = 'rgba(90,52,20,0.18)'; ctx.lineWidth = 1;
for (var yy = -r; yy < r; yy += 5) { ctx.beginPath(); ctx.moveTo(-r, yy); ctx.lineTo(r, yy); ctx.stroke(); }
} else if (style === 'crystal') {
var cg = ctx.createLinearGradient(-r, -r, r, r);
cg.addColorStop(0, 'rgba(255,255,255,0.7)'); cg.addColorStop(0.5, 'rgba(255,255,255,0.05)');
cg.addColorStop(1, 'rgba(0,40,90,0.2)'); ctx.fillStyle = cg; ctx.fillRect(-r, -r, r * 2, r * 2);
ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.4;
ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(0, -r); ctx.lineTo(r, 0);
ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.stroke();
} else if (style === 'metal') {
var mg = ctx.createLinearGradient(0, -r, 0, r);
mg.addColorStop(0, 'rgba(255,255,255,0.6)'); mg.addColorStop(0.4, 'rgba(0,0,0,0.22)');
mg.addColorStop(1, 'rgba(255,255,255,0.4)'); ctx.fillStyle = mg; ctx.fillRect(-r, -r, r * 2, r * 2);
} else if (style === 'jade') {
var jg = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r * 2);
jg.addColorStop(0, 'rgba(255,255,255,0.45)'); jg.addColorStop(1, 'rgba(10,70,50,0.24)');
ctx.fillStyle = jg; ctx.fillRect(-r, -r, r * 2, r * 2);
ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.6;
ctx.beginPath(); ctx.moveTo(-r, 0); ctx.bezierCurveTo(-r * 0.3, -8, r * 0.3, 8, r, 0); ctx.stroke();
}
ctx.restore();
ctx.lineWidth = 1.5;
ctx.strokeStyle = (style === 'neon' || style === 'glow') ? color
: style === 'crystal' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.25)';
ctx.stroke(); ctx.restore();
}
function renderToast() {
if (!state.toast) return;
var a = Math.min(1, state.toast.t / 120);
if (state.toast.t > 1300) a = Math.max(0, 1 - (state.toast.t - 1300) / 300);
ctx.save();
ctx.globalAlpha = a;
var tw = Math.min(560, 40 + state.toast.text.length * 26);
rr(C.DESIGN.w / 2 - tw / 2, DH() - 300, tw, 68, 34);
ctx.fillStyle = 'rgba(44,58,75,0.90)'; ctx.fill();
text(state.toast.text, C.DESIGN.w / 2, DH() - 266, 26, '#FFFFFF', 'center', '600');
ctx.restore();
}
function render() {
var w = view.w, h = view.h, dpr = view.dpr || 1;
ctx.save();
hits = [];
if (state.page === 'home') renderHome();
else if (state.page === 'levels') renderLevels();
else if (state.page === 'play') renderPlay();
if (state.overlay) hits = [];
if (state.overlay === 'result') renderResult();
else if (state.overlay === 'rank') renderRank();
else if (state.overlay === 'settings') renderSettings();
else if (state.overlay === 'fail') renderFail();
else if (state.overlay === 'hint') renderHint();
else if (state.overlay === 'energy') renderEnergy();
else if (state.overlay === 'online') renderOnline();
else if (state.overlay === 'invite') renderInvite();
else if (state.overlay === 'skin') renderSkin();
else if (state.overlay === 'buy') renderBuy();
if (state.win && state.overlay === 'result' && !state.reduceMotion) {
drawWinStream(state.win.t, !!state.lowFps);
}
if (state.winFx) drawWinFx();
renderToast();
if (state.fade < 1) {
ctx.save();
ctx.globalAlpha = 1 - state.fade;
ctx.fillStyle = COL.bg;
ctx.fillRect(0, 0, C.DESIGN.w, DH());
ctx.restore();
}
ctx.restore();
}
function DH() { return view.dh || C.DESIGN.h; }
function hudStackH() {
var M = LAY.HUD_MIN;
return (M.topPad || 0) + M.rowGap + M.pillH;
}
function hudAnchorY() {
var M = LAY.HUD_MIN;
return view.safeTop + (M.topPad || 0) + M.pillH / 2 + M.rowGap / 2;
}
function resize() {
var s = env.size();
var dpr = env.dpr ? env.dpr() : 1;
view.w = s.w; view.h = s.h; view.dpr = dpr;
view.scale = Math.min(s.w / C.DESIGN.w, s.h / C.DESIGN.h);
view.dh = Math.max(C.DESIGN.h, s.h / view.scale);
view.ox = (s.w - C.DESIGN.w * view.scale) / 2;
view.oy = 0;
var si = env.safeInsets ? env.safeInsets() : { top: 0, bottom: 0 };
view.safeTop = Math.max(C.SAFE.top, (si.top || 0) / view.scale);
view.safeBottom = Math.max(C.SAFE.bottom, (si.bottom || 0) / view.scale);
var needTop = view.safeTop + hudStackH() + (LAY.HUD_MIN.gapToCard || 0);
var nudge = Math.max(0, Math.min(BOARD_MAX_NUDGE, needTop - BASE_BOARD_Y));
LAY.BOARD.y = BASE_BOARD_Y + nudge;
LAY.BOARD.h = BASE_BOARD_H - nudge;
view.boardNudge = nudge;
if (state.overlay === 'settings') syncProfileButton();
clearGrads();
clearTextW();
var cv = ctx.canvas;
if (cv) {
cv.width = Math.round(s.w * dpr);
cv.height = Math.round(s.h * dpr);
if (cv.style) { cv.style.width = s.w + 'px'; cv.style.height = s.h + 'px'; }
}
}
var lastT = 0;
var fpsAvg = 0;
var lastPaint = 0, lastScene = '';
var rafFn = (typeof requestAnimationFrame !== 'undefined' && requestAnimationFrame) ||
(root.requestAnimationFrame && root.requestAnimationFrame.bind(root)) ||
function (cb) { return setTimeout(function () { cb(nowMs()); }, 16); };
function frame(ts) {
if (!lastT) lastT = ts;
var dt = ts - lastT;
if (!(dt > 0)) dt = 0;
if (dt > 64) dt = 64;
lastT = ts;
fpsAvg = fpsAvg ? fpsAvg * 0.9 + dt * 0.1 : dt;
state.lowFps = fpsAvg > 25;
update(dt);
var dpr = view.dpr || 1;
var sceneKey = state.page + '/' + (state.overlay || '');
var staticScene = !!(state.overlay && STATIC_OVERLAY[state.overlay]);
var need = true;
if (staticScene && sceneKey === lastScene && !state.dirty && !state.toast &&
!state.winFx && state.fade >= 1 && dt < 64 && (ts - lastPaint) < 1000) {
need = false;
}
if (need) {
lastScene = sceneKey;
lastPaint = ts;
state.dirty = false;
var cv0 = ctx.canvas;
if (cv0 && cv0.width && cv0.height) {
ctx.setTransform(1, 0, 0, 1, 0, 0);
ctx.fillStyle = COL.bgDeep || COL.bg || '#0B1020';
ctx.fillRect(0, 0, cv0.width, cv0.height);
}
ctx.setTransform(dpr * view.scale, 0, 0, dpr * view.scale, dpr * view.ox, dpr * view.oy);
render();
}
rafFn(frame);
}
function toDesign(cssX, cssY) {
return [(cssX - view.ox) / view.scale, (cssY - view.oy) / view.scale];
}
function init() {
state.save = loadSave();
state.settingsFx = state.save.settings.sfx !== false;
state.settingsBgm = state.save.settings.bgm !== false;
initSkin();
initQuality();
saveVisual();
applyAudio();
if (state.save.profile) applyProfile(state.save.profile, false);
if (profileOn() && PROFILE.restore) {
try { PROFILE.restore(state.save.profile || null); } catch (e) {}
}
if (profileOn() && PROFILE.onChange) {
PROFILE.onChange(function (p) { applyProfile(p); syncProfileButton(); });
}
if (profileOn() && PROFILE.onImg) {
try { PROFILE.onImg(function () { state.dirty = true; }); } catch (e) {}
}
if (env.friend && env.friend.onRank) {
try { env.friend.onRank(function (info) { applyFriendRankInfo(info); }); } catch (e) {}
}
if (profileOn() && PROFILE.boot) { try { PROFILE.boot(); } catch (e) {} }
resize();
env.bindInput(function (type, cssX, cssY) {
state.dirty = true;
var d = toDesign(cssX, cssY);
if (type === 'down') onDown(d[0], d[1]);
else if (type === 'move') onMove(d[0], d[1]);
else if (type === 'up') onUp(d[0], d[1]);
else { state.activePointer = false; state.drag = null; state.press = null; state.lastTap = null; }
});
if (cloudOn()) {
state.net.on = true;
CLOUD.init(function (err, info) {
if (err) {
state.net.err = (err && err.msg) || String(err);
state.net.ready = false;
return;
}
state.net.nick = (info && info.nick) || '';
state.net.ready = true;
if (info && (info.nick || info.avatar)) {
var remote = {
nick: info.nick || '', avatar: info.avatar || '',
src: info.src || 'auto', auth: !!info.auth
};
var keepLocal = (state.me.src === 'custom' || state.me.src === 'wx') && remote.src === 'auto';
if (!keepLocal) applyProfile(remote, 'local');
}
if (C.CLOUD.pullOnBoot) cloudPull();
});
}
if (env.onHide) env.onHide(function () {
saveResume();
state.running = false;
onlineSync();
state.onlineMark = 0;
state.onlineSaveT = 0;
writeLocal(true);
});
if (env.onShow) env.onShow(function () {
if (state.page === 'play' && !state.win && !state.overlay) state.running = true;
state.onlineMark = Date.now();
lastT = 0;
});
onlineRoll();
writeLocal(true);
publishFriend();
state.onlineMark = Date.now();
lastT = 0;
frame(nowMs());
}
return {
init: init,
resize: resize,
state: state,
trimMemory: trimMemory,
_debug: { judgeNow: judgeNow, setupLevel: setupLevel, useSet: useSet, win: win,
onDown: onDown, onMove: onMove, onUp: onUp,
w2d: w2d, h2d: h2d, runJudge: runJudge,
pickHint: pickHintPiece, slotCovered: slotCovered, useHint: useHint,
handleAt: handleDesign,
fireBtn: fireBtn, syncEnergy: syncEnergy, onlineClaim: onlineClaim,
applySkin: applySkin, grantFreeEnergy: grantFreeEnergy,
doRevive: doRevive,
adLvLeft: adLvLeft, adLvLimit: adLvLimit, adStart: adStart, adFinish: adFinish,
applyBgFx: applyBgFx, applyPieceStyle: applyPieceStyle, applySfxStyle: applySfxStyle,
initQuality: initQuality, qualityTiers: QUALITY,
doInviteShare: doInviteShare, inviteVerify: inviteVerify, inviteGrant: inviteGrant,
inviteHasNews: inviteHasNews, inviteNextTier: inviteNextTier,
inviteConfirmed: inviteConfirmed, inviteTiers: C.INVITE.tiers,
setInviteScroll: setInviteScroll,
onDown: onDown, onMove: onMove, onUp: onUp,
snapPiece: snapPiece, piecePoly: piecePoly,
tierRewards: tierRewards,
pickSkinItem: pickSkinItem, buySkinItem: buySkinItem,
itemPrice: itemPrice, ownsItem: ownsItem, itemLocked: itemLocked,
grantItem: grantItem, loadShop: loadShop, seedShop: seedShop, shopKey: SHOP_KEY,
onlineSecNow: onlineSecNow, onlineTierList: onlineTierList,
onlineClaimCount: onlineClaimCount, onlineClock: onlineClock,
onlineSync: onlineSync, useHintItem: useHintItem, onlineTick: onlineTick,
onlineKey: ONLINE_KEY, loadOnline: loadOnline, writeOnline: writeOnline,
applyOnlineTo: applyOnlineTo,
timeLimitOf: timeLimitOf, heartsOf: heartsOf, totalStars: totalStars,
homeLayout: homeLayout, designH: DH,
cloudPush: cloudPush, cloudPull: cloudPull, cloudRank: cloudRank,
openRank: openRank, netText: netText, go: go,
selectRankTab: selectRankTab, rankData: rankData, myStats: myStats,
weekStats: weekStats, recordWeekWin: recordWeekWin, rankCacheKey: rankCacheKey,
applyFriendRankInfo: applyFriendRankInfo, rankCountdown: rankCountdown,
friendStats: friendStats, publishFriend: publishFriend, friendOn: friendOn,
openFriendRank: openFriendRank, failLevel: failLevel,
giveUp: giveUp,
hitList: function () { return hits.slice(); },
tutStep: tutStep, tutSkip: tutSkip,
saveResume: saveResume, takeResume: takeResume, clearResume: clearResume,
openLevel: openLevel, isTutLevel: isTutLevel,
runJudge: runJudge,
mergeSave: mergeSave, collectCloud: collectCloud,
meNick: meNick, applyProfile: applyProfile, profileStateText: profileStateText,
requestProfile: requestProfile, renameProfile: renameProfile,
syncProfileButton: syncProfileButton, hideProfileButton: hideProfileButton,
profileCanAuth: profileCanAuth, drawAvatar: drawAvatar,
get LEVELS() { return LEVELS; }, get slots() { return SLOT_POS; },
get dataset() { return DS; }, get setKey() { return state.setKey; },
get COLORS() { return COL; },
rgbOf: rgbOf, relLum: relLum, contrastOf: contrastOf, bestInk: bestInk,
inkOnSurface: inkOnSurface,
get saveKey() { return SAVE_KEY; }, buildSet: buildSet,
get BRAND() { return C.BRAND; },
flowerStream: function () { return flowerStreamParticles(state.setKey, state.levelIdx); },
drawWinStreamAt: function (t) { drawWinStream(t, false); } }
};
};
});
