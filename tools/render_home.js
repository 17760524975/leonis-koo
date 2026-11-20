/* 把主页轻音乐（config.AUDIO.home 的谱）离线渲染成 wav，用来"先听一遍再进游戏"。
 *
 * 为什么要单独渲染：合成音乐在真机上好不好听，光看代码判断不了；
 * 有一个 wav 就能直接听、也能看峰值/密度是否合理（爆音、太密、太空）。
 * 音符包络、泛音、回声都按 game.js 的实现对齐，改游戏里的参数要同步这里。
 *
 * 用法：node tools/render_home.js [--loops=2] [--out=tools/out/home_bgm.wav]
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const C = require(path.join(ROOT, 'js/config.js'));
const H = C.AUDIO.home;

const args = {};
process.argv.slice(2).forEach(a => {
  const m = /^--([\w-]+)=?(.*)$/.exec(a);
  if (m) args[m[1]] = m[2] === '' ? true : m[2];
});
const LOOPS = Math.max(1, parseInt(args.loops || '2', 10));
const OUT = path.resolve(ROOT, args.out || 'tools/out/home_bgm.wav');
const SR = 44100;

const beat = 60 / (H.bpm || 100);
const bar = beat * 4;
const total = bar * (H.prog.length * LOOPS) + 1.2;
const N = Math.ceil(total * SR);
const buf = new Float32Array(N);
const lead = new Float32Array(N);      // 主旋律单独一路，用于回声

const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

/* 与 game.js 的 homePartial 对齐：线性起音 + 指数衰减到 1e-4 */
function partial(arr, freq, at, dur, peak, type, attack) {
  const a = Math.max(0.003, attack || 0.006);
  const d = Math.max(dur, a + 0.03);
  const s0 = Math.max(0, Math.round(at * SR));
  const s1 = Math.min(N, Math.round((at + d) * SR));
  const holdEnd = a;
  for (let i = s0; i < s1; i++) {
    const t = i / SR - at;
    let env;
    if (t < holdEnd) env = (peak) * (t / holdEnd);
    else env = peak * Math.pow(0.0001 / peak, (t - holdEnd) / Math.max(0.001, d - holdEnd));
    const ph = 2 * Math.PI * freq * t;
    let s;
    if (type === 'triangle') s = (2 / Math.PI) * Math.asin(Math.sin(ph));
    else s = Math.sin(ph);
    arr[i] += s * env;
  }
}
function mallet(arr, freq, at, dur, peak) {
  partial(arr, freq, at, dur, peak, 'sine', 0.006);
  partial(arr, freq * 4.02, at, dur * 0.26, peak * 0.14, 'sine', 0.004);
}
function hJit(i) { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); }

/* 按声部排一个八小节（bar 从 0 起无限递增，和游戏一致地取模） */
function renderBar(barIdx) {
  const P = H.prog, ch = P[barIdx % P.length], g = H.gain || {};
  const t0 = barIdx * bar;
  partial(buf, mtof(ch.b), t0, beat * 1.7, g.bass || 0.17, 'triangle', 0.012);
  partial(buf, mtof(ch.b), t0 + beat * 2, beat * 1.5, (g.bass || 0.17) * 0.82, 'triangle', 0.012);
  for (let c = 0; c < ch.ch.length; c++) {
    partial(buf, mtof(ch.ch[c]), t0 + c * 0.02, beat * 1.6, g.chord || 0.05, 'triangle', 0.02);
  }
  const arp = H.arp || [0, 1, 2, 1];
  for (let k = 0; k < 8; k++) {
    const idx = arp[k % arp.length];
    const m = idx === 3 ? ch.ch[0] + 12 : ch.ch[idx];
    const v = (g.arp || 0.085) * (0.85 + 0.3 * hJit(barIdx * 8 + k));
    mallet(buf, mtof(m), t0 + k * beat / 2 + hJit(barIdx * 8 + k + 99) * 0.006, beat * 0.55, v);
  }
  const mel = H.melody || [], mb = barIdx % P.length;
  for (const n of mel) {
    if (n[0] !== mb) continue;
    mallet(lead, mtof(n[2]), t0 + n[1] * beat, n[3] * beat * 1.15, g.lead || 0.125);
  }
}

for (let b = 0; b < H.prog.length * LOOPS; b++) renderBar(b);

/* 回声：0.32s / 24% 反馈 / 22% 湿声，和 homeInit 里的 DelayNode 一致。
 * 反馈回路收敛很快（0.24 的平方已经很小），叠 3 级足够听出空间感又不会自激。 */
const E = H.echo || { delay: 0.32, feedback: 0.24, wet: 0.22 };
for (let k = 1; k <= 3; k++) {
  const dk = Math.round(E.delay * SR * k);
  const gk = (E.wet || 0.22) * Math.pow(E.feedback || 0.24, k - 1);
  for (let i = dk; i < N; i++) buf[i] += lead[i - dk] * gk;
}

/* 统计 */
let peak = 0, sum = 0, over = 0;
for (let i = 0; i < N; i++) {
  const v = buf[i];
  if (Math.abs(v) > peak) peak = Math.abs(v);
  if (Math.abs(v) > 1) over++;
  sum += v * v;
}
const rms = Math.sqrt(sum / N);
const db = x => (x <= 0 ? -Infinity : 20 * Math.log10(x));

/* 写 wav（16bit 单声道；不归一化，保留真实电平，方便判断会不会爆） */
const data = Buffer.alloc(44 + N * 2);
data.write('RIFF', 0);
data.writeUInt32LE(36 + N * 2, 4);
data.write('WAVEfmt ', 8);
data.writeUInt32LE(16, 16);
data.writeUInt16LE(1, 20);          // PCM
data.writeUInt16LE(1, 22);          // mono
data.writeUInt32LE(SR, 24);
data.writeUInt32LE(SR * 2, 28);
data.writeUInt16LE(2, 32);
data.writeUInt16LE(16, 34);
data.write('data', 36);
data.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) {
  let v = Math.max(-1, Math.min(1, buf[i]));
  data.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, data);

console.log('主页轻音乐渲染完成');
console.log('  bpm=' + H.bpm + '  小节=' + H.prog.length + '  循环=' + LOOPS + '  时长=' + total.toFixed(1) + 's');
console.log('  峰值=' + peak.toFixed(3) + ' (' + db(peak).toFixed(1) + ' dBFS)  RMS=' + rms.toFixed(3) +
  ' (' + db(rms).toFixed(1) + ' dBFS)  削波样本=' + over);
console.log('  按 bgmVolume=' + C.AUDIO.bgmVolume + ' 播放时峰值≈' + (peak * C.AUDIO.bgmVolume).toFixed(3) +
  '，余量 ' + db(1 / Math.max(0.001, peak * C.AUDIO.bgmVolume)).toFixed(1) + ' dB');
console.log('  输出：' + path.relative(ROOT, OUT));
