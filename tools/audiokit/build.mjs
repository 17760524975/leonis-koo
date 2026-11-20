/* 把 audio/ 下的原始 mp3 转成小游戏可用的 BGM：
 *   1) 截取前 loopSec 秒（长曲只留一段可循环的片段）
 *   2) 单声道 + 48kbps（lamejs 纯 JS 编码，无需 ffmpeg）
 *   3) 首尾各加淡入淡出，避免循环接缝"啪"一声
 *
 * 用法： node tools/audio_build.mjs [--sec=90] [--kbps=48]
 * 输出： miniprogram/assets/audio/ 与 preview/assets/audio/ 各一份（内容相同）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MPEGDecoder } from 'mpg123-decoder';
import { Mp3Encoder } from '@breezystack/lamejs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const SRC = path.join(ROOT, 'audio');
const OUTS = [
  path.join(ROOT, 'miniprogram', 'assets', 'audio'),
  path.join(ROOT, 'preview', 'assets', 'audio')
];

const arg = (k, d) => {
  const hit = process.argv.find(a => a.startsWith('--' + k + '='));
  return hit ? Number(hit.split('=')[1]) : d;
};
const SEC = arg('sec', 90);
const KBPS = arg('kbps', 48);

/* 源文件 → 目标名。数字前缀决定关卡里的播放顺序（1→2→3→4）。 */
const MAP = [
  { src: '主页音乐.mp3', out: 'bgm_home.mp3' },
  { src: '1_Monkeys Spinning Monkeys.mp3', out: 'bgm_lv1.mp3' },
  { src: '2_Kevin_MacLeod_-_Carefree.mp3', out: 'bgm_lv2.mp3' },
  { src: '3_EMO - we never.mp3', out: 'bgm_lv3.mp3' },
  { src: '4_Kevin MacLeod - Cheery Monday.mp3', out: 'bgm_lv4.mp3' }
];

const FADE = 1.2;   // 首尾淡入淡出（秒）

function mono(channelData, frames) {
  const L = channelData[0];
  const R = channelData[1] || channelData[0];
  const out = new Float32Array(frames);
  for (let i = 0; i < frames; i++) out[i] = (L[i] + R[i]) * 0.5;
  return out;
}

function fade(pcm, rate) {
  const n = Math.min(Math.floor(FADE * rate), Math.floor(pcm.length / 4));
  for (let i = 0; i < n; i++) {
    const k = i / n;
    pcm[i] *= k;
    pcm[pcm.length - 1 - i] *= k;
  }
  return pcm;
}

function encode(pcm, rate) {
  const enc = new Mp3Encoder(1, rate, KBPS);
  const block = 1152;
  const chunks = [];
  for (let i = 0; i < pcm.length; i += block) {
    const slice = pcm.subarray(i, Math.min(i + block, pcm.length));
    const buf = enc.encodeBuffer(new Int16Array(slice.buffer, slice.byteOffset, slice.length));
    if (buf.length) chunks.push(Buffer.from(buf));
  }
  const tail = enc.flush();
  if (tail.length) chunks.push(Buffer.from(tail));
  return Buffer.concat(chunks);
}

const decoder = new MPEGDecoder();
await decoder.ready;

fs.mkdirSync(OUTS[0], { recursive: true });
fs.mkdirSync(OUTS[1], { recursive: true });

let total = 0;
for (const m of MAP) {
  const p = path.join(SRC, m.src);
  if (!fs.existsSync(p)) { console.log('缺文件，跳过：' + m.src); continue; }
  const t0 = Date.now();
  const u8 = new Uint8Array(fs.readFileSync(p));
  const { channelData, samplesDecoded, sampleRate } = decoder.decode(u8);
  const want = Math.min(samplesDecoded, Math.floor(SEC * sampleRate));
  let pcm = mono(channelData, want);
  fade(pcm, sampleRate);
  const i16 = new Int16Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) {
    const v = Math.max(-1, Math.min(1, pcm[i]));
    i16[i] = v < 0 ? v * 0x8000 : v * 0x7FFF;
  }
  const mp3 = encode(i16, sampleRate);
  for (const dir of OUTS) fs.writeFileSync(path.join(dir, m.out), mp3);
  total += mp3.length;
  console.log(
    `${m.out}  ${(mp3.length / 1024).toFixed(0)}KB  ` +
    `${(want / sampleRate).toFixed(1)}s/${(samplesDecoded / sampleRate).toFixed(0)}s  ` +
    `${sampleRate}Hz  ${((Date.now() - t0) / 1000).toFixed(1)}s`
  );
}
console.log(`合计 ${(total / 1024 / 1024).toFixed(2)}MB（${SEC}s / ${KBPS}kbps 单声道）`);
