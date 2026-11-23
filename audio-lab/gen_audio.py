# -*- coding: utf-8 -*-
"""
方寸巧拼 · 候选音频样片生成器（纯标准库，零依赖）
生成：
  1) 三首候选 BGM 全曲 WAV（可循环）
  2) 主推曲目「巧思时刻」的分层 stem（pad/arp/bass/perc/lead），供动态混音演示
  3) 紧张层 tension + 新版胜利音 fanfare
全部 22050Hz / 16bit / 单声道，仅作试听样片，不进小程序包。
"""
import math, wave, struct, os, random

SR = 22050
SIN_N = 4096
SIN = [math.sin(2 * math.pi * i / SIN_N) for i in range(SIN_N)]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'samples')
os.makedirs(OUT, exist_ok=True)
random.seed(20261123)


def mtof(m):
    return 440.0 * (2.0 ** ((m - 69) / 12.0))


def isin(ph):
    return SIN[int((ph % 1.0) * SIN_N) & (SIN_N - 1)]


def wave_val(w, ph):
    p = ph % 1.0
    if w == 'sine':
        return isin(p)
    if w == 'tri':
        return 2.0 * abs(2.0 * p - 1.0) - 1.0
    if w == 'saw':
        return 2.0 * p - 1.0
    if w == 'bell':
        return 0.60 * isin(p) + 0.25 * isin(2 * p) + 0.15 * isin(3.01 * p)
    if w == 'marimba':
        return 0.70 * isin(p) + 0.30 * isin(4 * p)
    if w == 'softpad':
        return 0.62 * isin(p) + 0.26 * isin(2 * p) + 0.12 * isin(0.5 * p)
    if w == 'pluck':
        return 0.75 * isin(p) + 0.20 * isin(2 * p) + 0.05 * isin(3 * p)
    return isin(p)


def add_note(buf, start, dur, freq, amp, w='sine', attack=0.008, release=0.12, perc=False):
    i0 = int(start * SR)
    n = int(dur * SR)
    step = freq / SR
    ph = 0.0
    k = 6.0 / dur if perc else 0.0
    for j in range(n):
        idx = i0 + j
        if idx >= len(buf):
            break
        t = j / SR
        if perc:
            a = min(1.0, t / attack) if attack > 0 else 1.0
            e = a * math.exp(-t * k)
        else:
            if t < attack:
                e = t / attack
            elif t > dur - release:
                e = max(0.0, (dur - t) / release)
            else:
                e = 1.0
        if e > 0:
            buf[idx] += amp * e * wave_val(w, ph)
        ph += step


def add_noise(buf, start, dur, amp, decay=18.0):
    i0 = int(start * SR); n = int(dur * SR)
    for j in range(n):
        idx = i0 + j
        if idx >= len(buf):
            break
        t = j / SR
        buf[idx] += amp * math.exp(-t * decay) * (random.random() * 2 - 1)


def add_kick(buf, start, amp=0.22):
    i0 = int(start * SR); n = int(0.28 * SR)
    ph = 0.0
    for j in range(n):
        idx = i0 + j
        if idx >= len(buf):
            break
        t = j / SR
        f = 120.0 * math.exp(-t * 26.0) + 46.0
        ph += f / SR
        buf[idx] += amp * math.exp(-t * 13.0) * isin(ph)


def reverb(buf, delay=0.17, mix=0.20):
    out = list(buf)
    d1 = int(delay * SR); d2 = int(delay * 1.63 * SR); d3 = int(delay * 2.41 * SR)
    for tap, g in ((d1, 0.55), (d2, 0.32), (d3, 0.18)):
        for i in range(tap, len(buf)):
            out[i] += buf[i - tap] * g * mix
    for i in range(d1, len(out)):
        out[i] += out[i - d1] * 0.11 * mix
    return out


def finish(buf, peak=0.88, fade_ms=12):
    buf = reverb(buf)
    m = max(abs(x) for x in buf) or 1.0
    g = peak / m
    n = len(buf); fn = int(fade_ms / 1000.0 * SR)
    for i in range(n):
        v = buf[i] * g
        if i < fn:
            v *= i / fn
        elif i > n - fn:
            v *= (n - i) / fn
        buf[i] = v
    return buf


def write_wav(name, buf):
    path = os.path.join(OUT, name)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(b''.join(struct.pack('<h', int(max(-1, min(1, x)) * 32767)) for x in buf))
    print('  ->', name, '%.1fs' % (len(buf) / SR))
    return path


def chord(buf, start, dur, midis, amp, w='softpad', attack=0.22, release=0.35, perc=False):
    for m in midis:
        add_note(buf, start, dur, mtof(m), amp, w, attack, release, perc)


def arp(buf, start, step, count, midis, amp, w='bell', perc=True):
    for i in range(count):
        add_note(buf, start + i * step, step * 1.6, mtof(midis[i % len(midis)]),
                 amp, w, 0.006, 0.10, perc)


# =====================================================================
# 曲目 A：晨光微语 Dawn Whisper —— 主页暖色候选（明亮温润，木琴+铃+柔垫）
# =====================================================================
def build_dawn():
    bpm = 88; beat = 60.0 / bpm; bar = beat * 4; bars = 8; total = bar * bars
    buf = [0.0] * int(total * SR)
    prog = [
        ([60, 64, 67], 48), ([59, 62, 67], 43), ([57, 60, 64], 45), ([53, 57, 60], 41),
        ([60, 64, 67], 48), ([59, 62, 67], 43), ([53, 57, 60], 41), ([55, 59, 62], 43),
    ]
    lead = [
        (0, 76, 1.5), (1.5, 79, 0.5), (2, 81, 1), (3, 79, 1),
        (4, 76, 1), (5, 72, 1), (6, 74, 2),
        (8, 79, 1), (9, 76, 0.5), (9.5, 74, 0.5), (10, 72, 1), (11, 69, 1),
        (12, 72, 1), (13, 76, 1), (14, 79, 2),
        (16, 81, 1.5), (17.5, 79, 0.5), (18, 76, 1), (19, 79, 1),
        (20, 77, 1), (21, 76, 1), (22, 72, 1.5), (23.5, 74, 0.5),
        (24, 79, 1), (25, 81, 1), (26, 84, 1.5), (27.5, 81, 0.5),
        (28, 79, 1), (29, 76, 1), (30, 74, 2),
    ]
    for bi, (ch, root) in enumerate(prog):
        t = bi * bar
        chord(buf, t, bar * 0.98, [x + 12 for x in ch], 0.055, 'softpad', 0.30, 0.45)
        add_note(buf, t, 0.85, mtof(root - 12), 0.17, 'tri', 0.01, 0.30, True)
        add_note(buf, t + beat * 2.5, 0.6, mtof(root - 12), 0.11, 'sine', 0.01, 0.20, True)
        arp(buf, t, beat / 2, 8, [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[0] + 24], 0.050)
        for k in range(4):
            add_noise(buf, t + k * beat + beat * 0.5, 0.05, 0.014, 26)
    for pos, midi, d in lead:
        add_note(buf, pos * beat, d * beat, mtof(midi), 0.115, 'marimba', 0.006, 0.18, True)
    return finish(buf)


# =====================================================================
# 曲目 B：星海漫游 Starlit Drift —— 深色/星空背景候选（空灵、宽混响）
# =====================================================================
def build_starlit():
    bpm = 72; beat = 60.0 / bpm; bar = beat * 4; bars = 8; total = bar * bars
    buf = [0.0] * int(total * SR)
    prog = [
        ([57, 60, 64], 45), ([53, 57, 60], 41), ([60, 64, 67], 48), ([55, 59, 62], 43),
        ([57, 60, 64], 45), ([50, 53, 57], 38), ([53, 57, 60], 41), ([52, 56, 59], 40),
    ]
    for bi, (ch, root) in enumerate(prog):
        t = bi * bar
        chord(buf, t, bar * 1.02, [x + 12 for x in ch], 0.048, 'softpad', 0.55, 0.70)
        add_note(buf, t, bar * 0.9, mtof(root - 12), 0.13, 'sine', 0.30, 0.5)
        arp(buf, t, beat / 2, 8,
            [ch[0] + 24, ch[2] + 24, ch[1] + 24, ch[2] + 36], 0.040, 'bell', True)
    twinkles = [(1.3, 88), (3.7, 91), (5.2, 86), (7.8, 93), (9.4, 88), (11.6, 95),
                (13.1, 91), (15.7, 86), (17.3, 93), (19.8, 88), (21.5, 95), (23.9, 91),
                (25.2, 88), (27.6, 93), (29.8, 96), (31.4, 91)]
    for tt, mm in twinkles:
        if tt * beat < total:
            add_note(buf, tt * beat, 1.6, mtof(mm), 0.045, 'bell', 0.01, 0.9, True)
    return finish(buf, peak=0.86)


# =====================================================================
# 曲目 C：巧思时刻 Puzzle Flow —— 对局候选（轻律动，马林巴+软鼓）
# =====================================================================
def flow_layers():
    bpm = 104; beat = 60.0 / bpm; bar = beat * 4; bars = 8; total = bar * bars
    L = {k: [0.0] * int(total * SR) for k in ('pad', 'bass', 'arp', 'perc', 'lead')}
    prog = [
        ([55, 59, 62], 43), ([50, 54, 57], 38), ([52, 55, 59], 40), ([48, 52, 55], 36),
        ([55, 59, 62], 43), ([50, 54, 57], 38), ([48, 52, 55], 36), ([50, 54, 57], 38),
    ]
    for bi, (ch, root) in enumerate(prog):
        t = bi * bar
        chord(L['pad'], t, bar * 0.98, [x + 12 for x in ch], 0.042, 'softpad', 0.25, 0.40)
        for k in range(8):
            nf = root - 12 if k % 4 in (0, 3) else (root if k % 4 == 2 else root - 5)
            add_note(L['bass'], t + k * beat / 2, beat * 0.45, mtof(nf), 0.13,
                     'tri', 0.008, 0.14, True)
        arp(L['arp'], t, beat / 2, 8,
            [ch[0] + 24, ch[1] + 24, ch[2] + 24, ch[1] + 24], 0.045, 'marimba', True)
        add_kick(L['perc'], t, 0.20)
        add_kick(L['perc'], t + beat * 2, 0.16)
        for k in range(8):
            add_noise(L['perc'], t + k * beat / 2, 0.035, 0.011, 30)
    lead = [
        (0, 79, 1), (1, 78, 0.5), (1.5, 76, 0.5), (2, 74, 1.5), (3.5, 76, 0.5),
        (4, 74, 1), (5, 71, 1), (6, 74, 1.5), (7.5, 76, 0.5),
        (8, 76, 1), (9, 79, 1), (10, 81, 1.5), (11.5, 79, 0.5),
        (12, 78, 1), (13, 76, 1), (14, 74, 2),
        (16, 79, 1), (17, 81, 1), (18, 83, 1.5), (19.5, 81, 0.5),
        (20, 79, 1), (21, 76, 1), (22, 78, 1.5), (23.5, 76, 0.5),
        (24, 74, 1), (25, 76, 1), (26, 79, 2),
        (28, 81, 1), (29, 79, 1), (30, 78, 1.5), (31.5, 79, 0.5),
    ]
    for pos, mm, d in lead:
        add_note(L['lead'], pos * beat, d * beat, mtof(mm), 0.10, 'marimba', 0.006, 0.16, True)
    return L


def mix_layers(L, names):
    n = len(L['pad']); buf = [0.0] * n
    for k in names:
        src = L[k]
        for i in range(n):
            buf[i] += src[i]
    return buf


# =====================================================================
# 动态混音层：紧张脉冲（倒计时 <20% 时淡入）
# =====================================================================
def build_tension():
    dur = 8.0
    buf = [0.0] * int(dur * SR)
    for j in range(len(buf)):
        t = j / SR
        trem = 0.55 + 0.45 * math.sin(2 * math.pi * 3.2 * t)
        buf[j] += 0.18 * trem * (isin(55.0 * t) + 0.5 * isin(82.41 * t))
    for bar_i in range(8):
        t = bar_i * 1.0
        add_noise(buf, t, 0.06, 0.020, 40)
        add_note(buf, t, 0.5, mtof(45), 0.10, 'sine', 0.02, 0.3, True)
    return finish(buf, peak=0.62)


# =====================================================================
# 新版胜利音 fanfare（比现有 0.82s 更饱满的 1.8s 小号角）
# =====================================================================
def build_fanfare():
    dur = 2.4
    buf = [0.0] * int(dur * SR)
    seq = [(0.00, 72, 0.18), (0.13, 76, 0.18), (0.26, 79, 0.20), (0.42, 84, 0.55)]
    for st, mm, d in seq:
        add_note(buf, st, d, mtof(mm), 0.15, 'bell', 0.006, 0.28, True)
    chord(buf, 0.42, 1.9, [72, 76, 79, 84], 0.052, 'softpad', 0.02, 0.9)
    for st, mm in ((0.62, 88), (0.85, 91), (1.05, 96)):
        add_note(buf, st, 1.1, mtof(mm), 0.045, 'bell', 0.006, 0.7, True)
    return finish(buf, peak=0.90, fade_ms=8)


def main():
    print('Generating candidates...')
    write_wav('bgm_dawn.wav', build_dawn())
    write_wav('bgm_starlit.wav', build_starlit())
    L = flow_layers()
    write_wav('bgm_flow.wav', finish(mix_layers(L, ('pad', 'bass', 'arp', 'perc', 'lead'))))
    print('  stems for dynamic mixing:')
    for k in ('pad', 'arp', 'bass', 'perc', 'lead'):
        write_wav('stem_flow_%s.wav' % k, finish(list(L[k]), peak=0.80))
    write_wav('layer_tension.wav', build_tension())
    write_wav('sfx_win_fanfare.wav', build_fanfare())
    print('DONE ->', OUT)


if __name__ == '__main__':
    main()
