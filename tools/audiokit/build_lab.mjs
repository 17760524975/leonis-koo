/* 把 audio-lab/samples 里的 WAV 样片转成小游戏可用的 48kbps 单声道 MP3。
 * 与旧 build.mjs 的区别：直接读 16bit PCM WAV，不需要 mpg123 解码，也不依赖 ffmpeg。
 * 用法： cd tools/audiokit && node build_lab.mjs
 * 输出： miniprogram/assets/audio/ 与 preview/assets/audio/ 各一份。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Mp3Encoder } from '@breezystack/lamejs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const SRC = path.join(ROOT, 'audio-lab', 'samples');
const OUTS = [
  path.join(ROOT, 'miniprogram', 'assets', 'audio'),
  path.join(ROOT, 'preview', 'assets', 'audio')
];
const KBPS = 48;

const MAP = [
  ['bgm_dawn.wav', 'bgm_dawn.mp3'],
  ['bgm_starlit.wav', 'bgm_starlit.mp3'],
  ['bgm_flow.wav', 'bgm_flow.mp3'],
  ['stem_flow_pad.wav', 'stem_flow_pad.mp3'],
  ['stem_flow_arp.wav', 'stem_flow_arp.mp3'],
  ['stem_flow_bass.wav', 'stem_flow_bass.mp3'],
  ['stem_flow_perc.wav', 'stem_flow_perc.mp3'],
  ['stem_flow_lead.wav', 'stem_flow_lead.mp3'],
  ['layer_tension.wav', 'layer_tension.mp3'],
  ['sfx_win_fanfare.wav', 'sfx_win_fanfare.mp3']
];
/* 短音效保留 WAV：MP3 固定 25ms 编码延迟会毁掉"点下去立刻响"的手感。 */
const COPY = ['sfx_fail.wav'];
/* 新方案不再使用的旧 BGM / 旧胜利音，留在包里只会白占体积。 */
const REMOVE = ['bgm_lv1.mp3', 'bgm_lv2.mp3', 'bgm_lv3.mp3', 'bgm_lv4.mp3', 'sfx_win.mp3'];

function readWav(file) {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('不是 WAV: ' + file);
  }
  let pos = 12, fmt = null, data = null;
  while (pos + 8 <= b.length) {
    const id = b.toString('ascii', pos, pos + 4);
    const len = b.readUInt32LE(pos + 4);
    const body = pos + 8;
    if (id === 'fmt ') {
      fmt = {
        format: b.readUInt16LE(body),
        channels: b.readUInt16LE(body + 2),
        rate: b.readUInt32LE(body + 4),
        bits: b.readUInt16LE(body + 14)
      };
    } else if (id === 'data') {
      data = { offset: body, length: len };
    }
    pos = body + len + (len % 2);
  }
  if (!fmt || !data || fmt.format !== 1 || fmt.bits !== 16) {
    throw new Error('只支持 16bit PCM WAV: ' + file);
  }
  const frames = Math.floor(data.length / (fmt.channels * 2));
  const pcm = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    let v = 0;
    for (let c = 0; c < fmt.channels; c++) {
      v += b.readInt16LE(data.offset + (i * fmt.channels + c) * 2) / 32768;
    }
    pcm[i] = v / fmt.channels;
  }
  return { pcm, rate: fmt.rate };
}

function encode(pcm, rate) {
  const enc = new Mp3Encoder(1, rate, KBPS);
  const out = [];
  for (let i = 0; i < pcm.length; i += 1152) {
    const slice = pcm.subarray(i, Math.min(i + 1152, pcm.length));
    const i16 = new Int16Array(slice.length);
    for (let j = 0; j < slice.length; j++) {
      const v = Math.max(-1, Math.min(1, slice[j]));
      i16[j] = v < 0 ? v * 0x8000 : v * 0x7fff;
    }
    const buf = enc.encodeBuffer(i16);
    if (buf.length) out.push(Buffer.from(buf));
  }
  const tail = enc.flush();
  if (tail.length) out.push(Buffer.from(tail));
  return Buffer.concat(out);
}

for (const d of OUTS) fs.mkdirSync(d, { recursive: true });

let total = 0;
for (const [from, to] of MAP) {
  const p = path.join(SRC, from);
  if (!fs.existsSync(p)) { console.log('缺文件，跳过：' + from); continue; }
  const { pcm, rate } = readWav(p);
  /* 循环接缝：样片自带 12ms 淡变，这里再补 20ms，确保 MP3 帧边界也不爆。 */
  const fade = Math.min(Math.floor(0.02 * rate), Math.floor(pcm.length / 8));
  for (let i = 0; i < fade; i++) {
    const k = i / fade;
    pcm[i] *= k;
    pcm[pcm.length - 1 - i] *= k;
  }
  const mp3 = encode(pcm, rate);
  for (const d of OUTS) fs.writeFileSync(path.join(d, to), mp3);
  total += mp3.length;
  console.log(`${to}  ${(mp3.length / 1024).toFixed(0)}KB  ${(pcm.length / rate).toFixed(1)}s/${rate}Hz`);
}
for (const name of COPY) {
  const p = path.join(SRC, name);
  if (!fs.existsSync(p)) continue;
  const b = fs.readFileSync(p);
  for (const d of OUTS) fs.writeFileSync(path.join(d, name), b);
  total += b.length;
  console.log(`${name}  ${(b.length / 1024).toFixed(0)}KB（WAV 直拷）`);
}
for (const name of REMOVE) {
  for (const d of OUTS) {
    const p = path.join(d, name);
    if (fs.existsSync(p)) { fs.unlinkSync(p); console.log('移除旧音频：' + name); }
  }
}
console.log(`合计新增 ${(total / 1024 / 1024).toFixed(2)}MB（48kbps 单声道）`);
