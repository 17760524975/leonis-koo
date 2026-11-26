(function (root, factory) {
var C = factory();
root.TANGRAM_CONFIG = C;
if (typeof module !== 'undefined' && module.exports) module.exports = C;
})(typeof window !== 'undefined' ? window : globalThis, function () {
'use strict';
return {
version: 'v0.64',
BRAND: {
name: '方寸巧拼',
slogan: '四巧 · 七巧，拼出你的形状',
shareText: '方寸巧拼 · 一起来拼图！'
},
HOME_DECO: {
cy: 682,
cxOff: 14,
pieces: [
{ c: '#4FA8E0', pts: [[0, -167], [0, 82], [-143, 82]] },
{ c: '#63C88B', pts: [[22, -88], [22, 82], [151, 82]] },
{ c: '#FF8A5B', pts: [[-179, 102], [179, 102], [128, 175], [-128, 175]] },
{ c: '#A87BE8', pts: [[0, -167], [46, -150], [0, -133]] }
]
},
DESIGN: { w: 750, h: 1624 },
SAFE: { top: 88, bottom: 100 },
LAYOUT: {
topBarH: 112,
BOARD: { x: 8, y: 216, size: 734, h: 802, bottom: 1018 },
PROGRESS: { x: 60, y: 954, w: 630, h: 16 },
PILE: {
cell: 8,
step: 12,
pad: 10,
jitter: 16,
minVisible: 0.58,
spanW: 470,
spanH: 286
},
TRAY: {
top: 1034, bottom: 1348,
pad: 10
},
TRAY_OVERRIDE: {
tangram7: { top: 1034, bottom: 1348 }
},
TOOLBAR: { y: 1372, w: 120, h: 100, gap: 16 },
BTN_EDGE: 2,
MIN_HIT: 88,
HOME: {
entryX: 104, entryW: 88, entryY0: 430, entryGap: 142,
labelDy: 68, labelSize: 20,
startY: 1274, set4Y: 1030, set7Y: 1148,
setW: 408, setH: 100,
startGap: 126, setGap: 118
},
HUD: {
iconX: 96,
y0: 20,
rowGap: 66,
pillH: 56, pillDx: 6,
padL: 34, padR: 26,
fontSize: 30, fontWeight: '700',
textColor: '#FFFFFF',
pillFill: 'rgba(30,40,52,0.72)',
pillFillDark: 'rgba(10,14,22,0.58)',
pillStroke: 'rgba(255,255,255,0.62)',
border: 2.5,
plusR: 24, plusInset: 6, plusHit: 76, plusFill: '#46C46B', plusPad: 34,
pillMinW: 172,
coinScale: 1.45, energyScale: 1.32,
rightAnchor: false
},
HUD_MIN: {
left: 32,
pillH: 42, rowGap: 50,
topPad: 2,
gapToCard: 20,
iconInset: 23, border: 2,
padL: 45, padR: 19,
fontSize: 27, subFontSize: 19,
minFontSize: 20,
fontWeight: '700',
maxW: 146,
textColor: '#FFFFFF',
pillFill: 'rgba(30,40,52,0.72)',
pillFillDark: 'rgba(10,14,22,0.58)',
pillStroke: 'rgba(255,255,255,0.62)',
coinScale: 0.90, energyScale: 0.82,
topShift: 0, rightAnchor: false
}
},
COLORS: {
bg: '#F6E9D4',
bgDeep: '#EFDFC6',
woodLine: 'rgba(199,164,120,0.18)',
card: '#FFFFFF',
cardEdge: '#E3E9F2',
board: '#FFFFFF',
text: '#2C3A4B',
textSub: '#7A8A9C',
textOn: '#FFFFFF',
btnText: '#7A4A00',
gold: '#FFB93D',
goldDeep: '#FF9F1C',
goldEdge: '#E08A00',
line: '#E3E9F2',
lineDeep: '#C3CDD9',
slotBg: 'rgba(74,51,39,0.045)',
disabledBg: '#F4F6F9',
disabledIcon: '#C3CDD9',
targetFill: '#E8EEF7',
targetEdge: '#9FB6D0',
targetSilhouette: '#DCE5F1',
splitLine: 'rgba(84,110,140,0.55)',
track: '#E8EEF7',
progressA: '#63C88B',
progressB: '#4FB87A',
starOn: '#FFB93D',
starOff: '#E3E9F2',
mask: 'rgba(60,45,35,0.24)',
snapRing: 'rgba(255,255,255,0.95)',
overlapFlash: '#FF6B6B',
shadow: 'rgba(44,58,75,0.10)',
shadowPiece: 'rgba(44,58,75,0.14)',
surface: 'rgba(247,243,236,0.95)',
surfaceHi: '#FDE7DF',
chipOff: 'rgba(240,235,226,0.95)',
disc: 'rgba(255,255,255,0.92)',
accentText: '#E2624A',
dangerText: '#E5484D',
textOnSurface: '#2C3A4B',
textOnSurfaceHi: '#8F3A26',
textOnChip: '#4E5E72',
inkOnLight: '#202A36',
pillBg: 'rgba(255,255,255,0.86)',
pillInk: '#7A4A00'
},
CARD: {
radius: 32,
edgeW: 1,
edge: '#E3E9F2',
topGlow: 'rgba(255,185,61,0.06)',
topGlowH: 0.30,
shadowBlur: 16,
shadowDy: 4,
shadow: 'rgba(44,58,75,0.10)'
},
PIECE: {
strokeW: 2,
seamBleed: 1.2,
highlightH: 1.5,
highlight: 'rgba(255,255,255,0.25)',
shadowBlur: 6,
shadowDy: 2
},
SNAP: {
vertex: 60,
grid: 65,
gridMax: 14,
switchHyst: 2,
breatheMs: 600,
pulseMs: 140,
ringMs: 180,
ringOffset: 4,
ringW: 4,
ringWEnd: 3,
ringAlpha: 0.95,
ringGlowAlpha: 0.42,
ringGlowBlur: 2.6,
vibrateMs: 8,
edge: 30,
edgeAngle: 6,
edgeMinOverlap: 0.3,
solDist: 120,
solAngle: 14
},
GESTURE: {
doubleTapMs: 300,
doubleTapMove: 10,
ringStep: 15,
ringSnap: 45,
handleVisual: 68,
handleRadius: 44,
handleOut: 22,
handleTapMove: 10
},
JUDGE: {
passCoverage: 0.99,
passOverflow: 0.01,
pairTol: 0.005,
lowCoverHint: 0.90,
missHintBelow: 0.99,
fitTol: 3.0,
minCoverage: 0.94,
pairOverlapTol: 0.004
},
STAR: { twoStarTimeFactor: 1.6, threeStarTimeFactor: 0.8 },
WIN: {
cardW: 620, cardH: 840, cy: 755,
streakY: 402, streakH: 54, streakX0: 96, streakX1: 654,
titleY: 462, titleSize: 29,
nameY: 492, nameSize: 19,
shapeY: 608, shapeBox: 196, shapeMax: 178,
starY: 738, starR: 21, starGap: 72,
statLabelY: 792, statValueY: 822,
rewardY: 868, rewardH: 52, rewardW: 500,
primaryY: 944, primaryH: 74, primaryW: 265, adMulW: 265, btnGap: 22,
row2Y: 1031, row2H: 64,
row3Y: 1102, row3H: 50
},
STREAK: { step: 5, coin: 60 },
RANK: {
tabs: ['主线榜', '连胜榜', '好友榜'],
useMock: false,
topN: 20,
unit: ['关', '连胜', '关'],
list: { x: 92, w: 566, top: 566, step: 84, rowH: 74, rows: 7, h: 588 },
friendNote: '好友榜只显示已授权微信好友 · 数据来自微信关系链',
mock: {
0: [
{ n: '废的柴', v: 18153, c: '#FF8A5B' },
{ n: '泡泡', v: 14410, c: '#4FA8E0' },
{ n: '刘晓飞二大爷', v: 13903, c: '#63C88B' },
{ n: '尼西ヾ゛26G', v: 10470, c: '#A87BE8' },
{ n: 'wayne wong', v: 9338, c: '#D96A9B' },
{ n: '彩云之川', v: 9249, c: '#FFC53D' },
{ n: '木木不吃鱼', v: 8032, c: '#3FB8B0' }
],
1: [
{ n: '连击王阿哲', v: 126, c: '#FF8A5B' },
{ n: '泡泡', v: 98, c: '#4FA8E0' },
{ n: '废的柴', v: 87, c: '#63C88B' },
{ n: '小满', v: 66, c: '#A87BE8' },
{ n: 'wayne wong', v: 51, c: '#D96A9B' },
{ n: '彩云之川', v: 40, c: '#FFC53D' },
{ n: '木木不吃鱼', v: 33, c: '#3FB8B0' }
],
2: [
{ n: '泡泡', v: 120, c: '#4FA8E0' },
{ n: '刘晓飞二大爷', v: 96, c: '#63C88B' },
{ n: '尼西ヾ゛26G', v: 74, c: '#A87BE8' },
{ n: '小满', v: 52, c: '#D96A9B' },
{ n: 'wayne wong', v: 41, c: '#FFC53D' },
{ n: '木木不吃鱼', v: 28, c: '#3FB8B0' },
{ n: '阿树', v: 19, c: '#FF8A5B' }
]
}
},
CLOUD: {
enabled: true,
envId: 'cloud1-d4g6rm6duad5ba0aa',
fn: 'player',
pushDebounceMs: 3500,
pullOnBoot: true
},
PLAYER: {
nickMax: 12,
defaultName: '巧手',
authLabel: '使用微信昵称头像',
editLabel: '改昵称',
card: { w: 496, h: 168, dy: -246, avatarR: 46, gap: 20 },
authBtn: { w: 340, h: 76, dy: -104 },
rankAvatarR: 26
},
ADS: {
rewarded: {
unitId: '',
reviveOffer: 1
},
interstitial: {
unitId: '',
everyLevels: 3
}
},
ANIM: {
pressDown: 80,
pressUp: 120,
rotate: 120,
flip: 180,
grab: 100,
progressTween: 300,
panelFade: 200,
starStep: 120,
winShrink: 260,
winDelay: 640,
pageFade: 200,
hintShow: 3000
},
FLOWER: {
total: 1500,
budEnd: 90, bloomEnd: 400, settleEnd: 700,
overlayAt: 900, fadeEnd: 1500,
peakScale: 1.12,
main: { x: 375, y: 470, petals: 7, L: 88 },
satDelay: 45, satStart: 120, satDur: 240, satDist: 190, satYFactor: 0.82,
colors: ['#FF8A5B', '#4FA8E0', '#63C88B', '#A87BE8', '#D96A9B', '#FFC53D', '#3FB8B0'],
satellites: [
{ ang: -90, color: 1, size: 0.72, delay: 120 },
{ ang: -30, color: 5, size: 0.64, delay: 165 },
{ ang: 30, color: 2, size: 0.74, delay: 210 },
{ ang: 90, color: 4, size: 0.66, delay: 255 },
{ ang: 150, color: 3, size: 0.72, delay: 300 },
{ ang: 210, color: 6, size: 0.64, delay: 345 },
{ ang: -150, color: 3, size: 0.56, delay: 385 },
{ ang: 120, color: 0, size: 0.52, delay: 425 },
{ ang: 60, color: 2, size: 0.58, delay: 465 }
],
stream: {
from: 700,
gap0: 110,
gapMax: 520,
decay: 2600,
cycleEnd: 9000,
life: 1600,
minSize: 22, maxSize: 36,
petals: 5,
maxAlive: 16,
bandTop: 329,
bandTopMin: 150,
bandBottom: 1237,
bandBottomMax: 1360
}
},
WIN_FX: {
life: 8600,
fadeStart: 6.0,
fadeDur: 1.8,
drag: 1.35,
terminal: 300,
waves: [
{ at: 0, n: 14, sp: 290 },
{ at: 380, n: 30, sp: 340 },
{ at: 820, n: 48, sp: 390 },
{ at: 1340, n: 64, sp: 440 }
],
petalTotal: 3000,
petalColors: ['#C81D3A', '#E2405A', '#F26B80', '#FA9FB0', '#D22B45', '#F7CFD6'],
butterfly: [
{ w1: '#F49A16', w2: '#FFC24A', e: '#5A2A06', s: '#FFF3D6' },
{ w1: '#3E6FD8', w2: '#7CA6F2', e: '#12244D', s: '#DCE9FF' },
{ w1: '#F3E3F7', w2: '#FFF8FF', e: '#7A5C8E', s: '#CBA9DF' },
{ w1: '#EFC24E', w2: '#FADF8E', e: '#6C4B0A', s: '#FFF6D8' }
]
},
ECON: {
coinInit: 50,
starReward: [2, 3, 5],
coinWinAdMul: 10,
coinRevive: 80,
energyMax: 16,
energyInit: 16,
energyRecoverSec: 300,
energyCostLevel: 2,
freeEnergyPerDay: 3,
freeEnergyShare: 2,
freeEnergyAdMul: 5,
adSimMs: 1200,
adPerLevel: 3,
coinHint: 30
},
INVITE: {
needCleared: 4,
verifySec: 60,
maxPend: 12,
shareCdMs: 1200,
tiers: [
{ n: 1, coin: 30, hint: 1, label: '30 巧币 + 1 查找道具' },
{ n: 2, energy: 20, pstyle: 'neon', label: '20 体力 + 霓虹板件' },
{ n: 3, pstyle: 'crystal', bgfx: 'bubbles', label: '水晶板件 + 泡泡漂浮背景' },
{ n: 4, hint: 1, energy: 10, label: '1 查找道具 + 10 体力' },
{ n: 5, pstyle: 'pastel', energy: 10, label: '马卡龙板件 + 10 体力' },
{ n: 6, hint: 1, coin: 50, label: '1 查找道具 + 50 巧币' },
{ n: 7, hint: 1, bgfx: 'petals', label: '1 查找道具 + 花瓣飘落背景' },
{ n: 8, pstyle: 'glow', hint: 1, label: '荧光板件 + 1 查找道具' }
]
},
ONLINE: {
persistSec: 15,
maxSec: 6 * 3600,
tiers: [
{ id: 'o1', at: 60, label: '1 分钟', energy: 6, coin: 5, hint: 0 },
{ id: 'o2', at: 300, label: '5 分钟', energy: 0, coin: 5, hint: 0 },
{ id: 'o3', at: 600, label: '10 分钟', energy: 6, coin: 5, hint: 0 },
{ id: 'o4', at: 1200, label: '20 分钟', energy: 0, coin: 10, hint: 0 },
{ id: 'o5', at: 2400, label: '40 分钟', energy: 6, coin: 0, hint: 1 },
{ id: 'o6', at: 3600, label: '60 分钟', energy: 20, coin: 10, hint: 1 }
]
},
HINT: {
coinCost: 30,
itemName: '查找道具',
labels: { place: '放这里', move: '移到此处', use: '用这块' }
},
TUTORIAL: {
on: true,
levels: 1,
freezeTimer: true,
ghostAlpha: 0.34,
textY: 74,
textSize: 26,
iconR: 30,
skipW: 116,
skipText: '跳过教学'
},
TIMER: {
fixedSec: 150,
minSec: 90,
maxSec: 150,
parFactor: 2.5,
hearts: 3,
warnSec: 20
},
FAIL_ANIM: {
flashMs: 360,
cardDelay: 460,
enterMs: 440,
heartMs: 700,
shardMs: 900,
bannerMs: 820
},
SKINS: {
warm: {
name: '暖木',
bg: '#F6E9D4', bgDeep: '#EFDFC6', text: '#2C3A4B', textSub: '#7A8A9C',
gold: '#FFB93D', goldDeep: '#FF9F1C', goldEdge: '#E08A00',
card: '#FFFFFF', line: '#E3E9F2', lineDeep: '#C3CDD9',
tint: null
},
mint: {
name: '薄荷',
bg: '#E9F7F1', bgDeep: '#D6EEE4', text: '#22463B', textSub: '#6B8C81',
gold: '#5ACBA4', goldDeep: '#3FBA90', goldEdge: '#2C9E78',
card: '#FFFFFF', line: '#DCEBE4', lineDeep: '#BFD9CE',
tint: 'rgba(58,178,138,0.20)'
},
night: {
name: '夜空',
bg: '#E2E8FA', bgDeep: '#CFD8F0', text: '#26304A', textSub: '#68728E',
gold: '#8E7CEB', goldDeep: '#7A66DF', goldEdge: '#6350C4',
card: '#FFFFFF', line: '#DEE4F7', lineDeep: '#C2CBEA',
tint: 'rgba(112,98,205,0.24)'
},
dusk: {
name: '夜间护眼',
dark: true,
bg: '#1E2530', bgDeep: '#171D26', bgTop: '#28313F',
text: '#E8EDF4', textSub: '#A9B4C4', textOn: '#FFFFFF',
gold: '#E9B16A', goldDeep: '#D99A4E', goldEdge: '#BE7F35',
btnText: '#2A1D00',
card: 'rgba(42,50,63,0.96)', cardEdge: 'rgba(140,152,170,0.30)',
board: 'rgba(34,42,55,0.94)',
line: 'rgba(150,164,184,0.26)', lineDeep: 'rgba(150,164,184,0.45)',
slotBg: 'rgba(255,255,255,0.05)',
disabledBg: 'rgba(255,255,255,0.07)', disabledIcon: 'rgba(190,200,215,0.35)',
targetFill: 'rgba(190,205,230,0.16)', targetEdge: '#BFCDE4',
targetSilhouette: 'rgba(190,205,230,0.28)',
splitLine: 'rgba(200,212,232,0.60)', track: 'rgba(150,164,184,0.22)',
starOff: 'rgba(150,164,184,0.30)',
mask: 'rgba(8,12,20,0.68)', snapRing: 'rgba(255,255,255,0.95)',
shadow: 'rgba(0,0,0,0.30)', shadowPiece: 'rgba(0,0,0,0.38)',
tint: 'rgba(20,26,36,0.18)',
surface: 'rgba(255,250,242,0.07)', surfaceHi: 'rgba(233,177,106,0.22)',
chipOff: 'rgba(255,250,242,0.11)', disc: 'rgba(255,250,242,0.15)',
accentText: '#FFCB9A', dangerText: '#FF9A9A',
textOnSurface: '#F2F5FF', textOnSurfaceHi: '#FFD7A6',
textOnChip: '#E8EDF4', inkOnLight: '#202A36',
pillBg: 'rgba(16,21,30,0.66)', pillInk: '#E8EDF4'
}
},
BG_FX: {
classic: { name: '暖木微光', desc: '原版柔光', mode: 'glow' },
aurora: { name: '流光溢彩', desc: '极光缓缓流动', mode: 'aurora' },
stars: { name: '星夜流萤', desc: '深蓝夜空 + 流萤', mode: 'stars', dark: true, price: 150 },
bubbles: { name: '泡泡漂浮', desc: '彩色气泡上浮', mode: 'bubbles', price: 100 },
petals: { name: '花瓣飘落', desc: '花瓣随风飘落', mode: 'petals', price: 150 },
geometric: { name: '几何轻舞', desc: '碎片漂浮旋转', mode: 'geometric' },
snow: { name: '初雪纷飞', desc: '白雪缓缓飘落', mode: 'snow', price: 150 },
rain: { name: '烟雨绵绵', desc: '雨丝斜落带涟漪', mode: 'rain' },
firefly: { name: '萤火之森', desc: '夜色 + 点点萤火', mode: 'firefly', dark: true, price: 100 },
nebula: { name: '星云流转', desc: '深紫星云缓缓旋转', mode: 'nebula', dark: true }
},
BG_FX_PARTS: {
aurora: { bands: 5, speed: 0.085 },
stars: { count: 92, shootGap: 3200 },
bubbles: { count: 32 },
petals: { count: 28 },
geometric: { count: 22 },
snow: { count: 62 },
rain: { count: 60 },
firefly: { count: 40 },
nebula: { clouds: 6 }
},
PIECE_STYLES: {
classic: { name: '经典', desc: '纯色白边' },
candy: { name: '糖果', desc: '糖果渐变' },
wood: { name: '原木', desc: '木质纹理' },
neon: { name: '霓虹', desc: '暗底发光', price: 100 },
pastel: { name: '马卡龙', desc: '柔和粉彩', price: 100 },
crystal: { name: '水晶', desc: '通透高光棱面', price: 100 },
metal: { name: '金属', desc: '拉丝银灰光泽', price: 100 },
jade: { name: '玉石', desc: '温润云纹玉质', price: 100 },
glow: { name: '荧光', desc: '亮色柔光描边', price: 100 }
},
SFX_STYLES: {
wood: { name: '木质', desc: '梆子·笃', wave: 'sine', pitch: 1.00, decay: 1.00, bell: false },
bell: { name: '铃铛', desc: '铜钟余音', wave: 'triangle', pitch: 1.62, decay: 1.30, bell: true },
water: { name: '水滴', desc: '水滴清响', wave: 'sine', pitch: 1.34, decay: 0.72, bell: true },
retro: { name: '复古', desc: '8bit 街机', wave: 'square', pitch: 0.94, decay: 0.58, bell: false },
chime: { name: '风铃', desc: '铝管风铃', wave: 'sine', pitch: 1.90, decay: 1.85, bell: true },
marimba:{ name: '木琴', desc: '马林巴琴', wave: 'triangle', pitch: 1.15, decay: 0.62, bell: false },
bubble: { name: '泡泡', desc: '气泡啵啵', wave: 'sine', pitch: 1.55, decay: 0.42, bell: true },
synth: { name: '合成器', desc: '滤波锯齿', wave: 'sawtooth', pitch: 0.86, decay: 0.92, bell: false }
},
DARK_PAL: {
bg: '#101733', bgDeep: '#080D20', bgTop: '#1B2450',
text: '#F2F5FF', textSub: '#B9C6E6', textOn: '#FFFFFF', btnText: '#241700',
card: 'rgba(28,36,62,0.94)', cardEdge: 'rgba(170,190,235,0.28)', board: 'rgba(24,32,56,0.92)',
line: 'rgba(180,196,236,0.26)', lineDeep: 'rgba(180,196,236,0.45)',
gold: '#FFD166', goldDeep: '#FFB93D', goldEdge: '#E89B22',
disabledBg: 'rgba(255,255,255,0.08)', disabledIcon: 'rgba(200,212,240,0.35)',
targetFill: 'rgba(130,155,215,0.18)', targetEdge: '#A8BEF0', targetSilhouette: 'rgba(150,175,225,0.30)',
splitLine: 'rgba(190,208,245,0.65)', track: 'rgba(180,196,236,0.22)',
starOff: 'rgba(180,196,236,0.30)', slotBg: 'rgba(255,255,255,0.05)',
mask: 'rgba(6,10,24,0.68)', snapRing: 'rgba(255,255,255,0.98)',
shadow: 'rgba(0,0,0,0.32)', shadowPiece: 'rgba(0,0,0,0.40)',
surface: 'rgba(255,255,255,0.075)', surfaceHi: 'rgba(255,209,102,0.20)',
chipOff: 'rgba(255,255,255,0.10)', disc: 'rgba(255,255,255,0.16)',
accentText: '#FFC98A', dangerText: '#FF8B8B',
textOnSurface: '#F2F5FF', textOnSurfaceHi: '#FFD7A6',
textOnChip: '#E8EDF4', inkOnLight: '#202A36',
pillBg: 'rgba(10,15,24,0.62)', pillInk: '#F2F5FF'
},
HOME_VFX: {
titleGlow: true, titleStroke: 9,
ringPulseMs: 2600,
btnShineMs: 3200,
decoHalo: true, decoSparkN: 10,
titleFontFamily: '"STCaiyun","华文彩云","STKaiti","KaiTi",serif',
titleFill: '#FFFFFF', titleStrokeColor: '#141821', titleGlowColor: 'rgba(255,255,255,0.55)'
},
BGM: {
home: { name: '主页·暖阳' },
lv1: { name: '关卡 1 · Monkeys Spinning Monkeys' },
lv2: { name: '关卡 2 · Carefree' },
lv3: { name: '关卡 3 · we never（千年之后）' },
lv4: { name: '关卡 4 · Cheery Monday' },
scenes: ['lv1', 'lv2', 'lv3', 'lv4'],
levelsPerTrack: 5,
fadeMs: 320
},
SAVE_KEY: 'tangram_save_v1',
ART: {
enabled: true,
base: './assets/img/',
files: {
home_bg_desk: 'home_bg_desk.png',
board_paper: 'board_paper.png'
}
},
AUDIO: {
enabled: true,
base: './assets/audio/',
bgmPkg: 'audio-pkg/assets/audio/',
subpackage: 'audio',
files: {
sfx_pick: 'sfx_pick.wav',
sfx_snap: 'sfx_snap.wav',
sfx_win: 'sfx_win.mp3',
sfx_tap: 'sfx_tap.wav',
sfx_fail: 'sfx_fail.wav'
},
bgm: {
home: '',
lv: ['bgm_lv1.mp3', 'bgm_lv2.mp3', 'bgm_lv3.mp3', 'bgm_lv4.mp3']
},
home: {
bpm: 100,
prog: [
{ b: 48, ch: [60, 64, 67] },
{ b: 55, ch: [59, 62, 67] },
{ b: 57, ch: [57, 60, 64] },
{ b: 53, ch: [57, 60, 65] },
{ b: 48, ch: [60, 64, 67] },
{ b: 55, ch: [59, 62, 67] },
{ b: 53, ch: [57, 60, 65] },
{ b: 55, ch: [59, 62, 67] }
],
arp: [0, 1, 2, 3, 2, 1, 0, 1],
melody: [
[0, 0, 76, 1], [0, 1, 79, 1], [0, 2, 81, 1.5],
[1, 0, 74, 1], [1, 1, 76, 0.5], [1, 1.5, 74, 0.5], [1, 2, 71, 1.5],
[2, 0, 72, 1], [2, 1, 76, 1], [2, 2, 81, 1], [2, 3, 79, 1],
[3, 0, 81, 1], [3, 1, 79, 1], [3, 2, 77, 0.5], [3, 2.5, 76, 1.5],
[4, 0, 79, 0.5], [4, 0.5, 81, 0.5], [4, 1, 84, 1], [4, 2, 81, 1], [4, 3, 79, 1],
[5, 0, 76, 1], [5, 1, 74, 0.5], [5, 1.5, 76, 0.5], [5, 2, 79, 1], [5, 3, 74, 1],
[6, 0, 81, 1], [6, 1, 79, 1], [6, 2, 76, 0.5], [6, 2.5, 74, 1.5],
[7, 0, 74, 1.5], [7, 1.5, 76, 0.5], [7, 2, 74, 2]
],
gain: { bass: 0.34, chord: 0.10, arp: 0.19, lead: 0.28 },
echo: { delay: 0.32, feedback: 0.24, wet: 0.22 }
},
bgmVolume: 0.55,
bgmDuckVolume: 0.20,
trim: { home: 1.70, bgm_lv1: 1.53, bgm_lv2: 1.66, bgm_lv3: 0.65, bgm_lv4: 0.52 },
sfxVolume: 1.0,
sfxGain: { sfx_snap: 1.00, sfx_win: 0.95, sfx_pick: 0.85, sfx_tap: 0.70, sfx_fail: 0.55,
sfx_timeup: 0.95 },
fadeMs: 220,
tapGuardMs: 40,
snapVoices: 2
}
};
});
