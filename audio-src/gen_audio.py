# -*- coding: utf-8 -*-
"""
《四巧·七巧》 v0.1 音频合成脚本
================================
风格：晴日玩具台 —— 明亮、木质、轻快（马林巴/木琴 + 轻拨弦 + 薄低频垫）
禁止：鼓点 / 强节拍循环 / 小调

设计要点
--------
1) 无缝循环：把整首 BGM 当作长度 L 的循环缓冲来合成
   - 所有振荡器频率量化到 FFT 栅格 k*SR/L，保证每个正弦在 L 内走完整数个周期
   - 混响用「循环卷积」(circular convolution) 做，尾音自然绕过循环点接回开头
   - 事件超出 L 的部分自动绕回开头（add_circ 处理），不会在循环点被硬切
2) -18 LUFS：按 ITU-R BS.1770 实测（K 加权 + 400ms 块 + 双门限），闭环归一
3) sfx_snap 刻意无音高：非谐波比例的重阻尼木质共振 + 宽带瞬态，不做基频延音

用法: python gen_audio.py
"""

import os
import numpy as np
import lameenc

SR = 44100
OUT = os.path.dirname(os.path.abspath(__file__))
rng = np.random.default_rng(20261118)

# ============================================================
# 0. 基础工具
# ============================================================

# ---- BGM 循环长度：84BPM / 4-4 / 24 小节 + 半个小节留白 ----
# 末尾多留 2 拍（1.4286 s）作为乐句留白：MP3 编码在循环点会插入约 26 ms 静音
#（lameenc 不写 Xing/LAME gapless 头），把循环点放在留白里，这 26 ms 就落在
# 最安静的地方，任何解码器（含微信 InnerAudioContext）都听不出接缝。
BPM = 84.0
SPB = 2646000.0 / BPM          # 每拍采样数 = 31500
BAR = 4 * SPB                  # 每小节 = 126000
N_BARS = 24
TAIL_BEATS = 2                 # 循环末尾留白
L = int(round(N_BARS * BAR + TAIL_BEATS * SPB))   # 3087000 = 70.000 s 整
assert L == 3087000, L
EIGHTH = SPB / 2               # 八分音符 = 15750
TAIL_L = L - N_BARS * BAR      # 留白采样数 = 63000 (1.4286 s)


def qf(f, length=L):
    """把频率量化到 FFT 栅格 k*SR/L —— 保证在循环长度内整数周期，循环点零相位跳变。
    量化误差 < SR/(2L) = 0.0073 Hz，音乐上完全不可闻。"""
    k = max(1, round(f * length / SR))
    return k * SR / length


def add_circ(buf, sig, pos, gain=1.0):
    """把 sig 叠加进循环缓冲 buf（pos 为采样位置，超出末尾自动绕回开头）。
    这样超长尾音不会被硬切，循环点保持连续。"""
    n = len(sig)
    pos = int(pos) % len(buf)
    if n <= len(buf):
        end = pos + n
        if end <= len(buf):
            buf[pos:end] += sig * gain
        else:
            head = len(buf) - pos
            buf[pos:] += sig[:head] * gain
            buf[:n - head] += sig[head:] * gain
    else:  # 极长信号（pad）逐段绕回
        i = 0
        while i < n:
            seg = sig[i:i + len(buf)]
            add_circ(buf, seg, pos + i, gain)
            i += len(seg)


def env_attack(sig, ms=3.0, power=1.0):
    n = max(2, int(ms * SR / 1000))
    if n < len(sig):
        sig[:n] *= (np.linspace(0, 1, n) ** power)
    return sig


def env_tail(sig, frac=0.20):
    """尾部升起余弦收尾，保证信号末端严格归零（防爆音）"""
    n = int(len(sig) * frac)
    if n >= 2:
        w = np.linspace(0, 1, n)
        sig[-n:] *= (0.5 + 0.5 * np.cos(np.pi * w))
    return sig


def band_noise(n, lo, hi, tau_ms, order=1.4):
    """带限噪声爆发。**不加时间窗**（早先版本给噪声乘了汉宁窗，把瞬态抹成 23ms
    才起峰，直接毁掉"干脆"）——用循环 FFT 做平滑频带掩蔽，起振在 0 采样。"""
    x = rng.standard_normal(n)
    X = np.fft.rfft(x)
    fr = np.fft.rfftfreq(n, 1 / SR)
    m = np.ones_like(fr)
    if lo > 0:                      # 高通：0.4*lo 处开始抬升，lo 处全通
        m *= np.sin(np.clip((fr - 0.4 * lo) / (0.6 * lo), 0, 1) * np.pi / 2) ** order
    if hi is not None and hi < SR / 2:   # 低通：hi 处全通，2*hi 处截止
        m *= np.sin(np.clip(1.0 - (fr - hi) / hi, 0, 1) * np.pi / 2) ** order
    y = np.fft.irfft(X * m, n)
    return y * np.exp(-np.arange(n) / (tau_ms / 1000.0 * SR))


def shaped_noise(n, tau_ms, formants, lowpass=None, order=3.0):
    """带"宽共振峰"的噪声爆发 —— 这是"有木质、无音高"的核心手段。

    思路：能量由**噪声**承担（噪声的周期自相关接近 0，大脑提取不出音高），
    "木质"则通过频谱上的**宽峰**（0.6–1.0 倍频程宽）给出。

    为什么不用窄峰正弦：任何能振铃 20ms 以上的窄谐振都会被听成音符。
    实测窄峰版本 619Hz 的峰/邻域高达 32.8 dB、谱平坦度 0.002，
    自相关音高显著度逼近周期波 —— 连听几十次一定会腻。
    宽峰版本音高显著度只有 0.09（纯噪声水平），听感是"一块木头"不是"一个音"。

    lowpass=(截止 Hz, 阶数)：**必须给**。白噪声每个倍频程能量相同，
    不加陡峭低通时 4–16kHz 的能量会和 1–4kHz 一样多，听感变成"嘶"，
    而且连续触发几十次会造成高频听疲劳（实测踩过这个坑）。

    formants = [(中心频率, 增益 dB, 半宽 倍频程), ...]
    """
    x = rng.standard_normal(n)
    X = np.fft.rfft(x)
    fr = np.fft.rfftfreq(n, 1 / SR)
    lf = np.log2(np.maximum(fr, 1.0))
    env = np.ones_like(fr)
    for f0, gdb, bw in formants:
        env *= 10 ** (gdb / 20.0 * np.exp(-0.5 * ((lf - np.log2(f0)) / bw) ** 2))
    if lowpass:
        fc, order = lowpass
        env /= np.sqrt(1.0 + (fr / fc) ** (2 * order))   # Butterworth 型幅度响应
    y = np.fft.irfft(X * env, n)
    return y * np.exp(-np.arange(n) / (tau_ms / 1000.0 * SR))


def mode_bank(n, modes):
    """少量窄谐振，**只用来点材质**，电平刻意压得很低（≤0.12）并且衰减很短。
    主能量交给 shaped_noise；这里只是给"木头"补一点边缘感。"""
    t = np.arange(n) / SR
    out = np.zeros(n)
    for f, tau_ms, lvl in modes:
        if f >= SR * 0.46:
            continue
        tau_s = tau_ms / 1000.0
        out += lvl * np.exp(-t / tau_s) * np.sin(2 * np.pi * f * t + (f * 0.011) % 6.283)
    return out


# ============================================================
# 1. 音色
# ============================================================

def voice_marimba(f, dur, amp=1.0, bright=1.0, ring=1.0):
    """马林巴/木琴：基频 + 3.93 倍泛音 + 9.7 倍泛音（马林巴的实际模态比例），
    各自不同衰减速度 —— 高次泛音衰减快，正是"木头"的来源。"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = qf(f)
    base_tau = (0.78 * (420.0 / (f + 260.0)) ** 0.80) * ring   # 低音延音更长
    out = np.zeros(n)
    for ratio, lvl, dsc in ((1.0, 1.0, 1.0), (3.93, 0.26 * bright, 0.52),
                            (9.70, 0.055 * bright, 0.26)):
        ff = f * ratio
        if ff > SR * 0.46:
            continue
        tau = max(base_tau * dsc, dur / 7.0)
        out += lvl * np.exp(-t / tau) * np.sin(2 * np.pi * ff * t + ratio * 1.9)
    # 槌头击打瞬态：1.6ms 高频噪声，极轻，给"木头"的颗粒感（不是鼓点）
    click_n = int(0.0018 * SR)
    click = band_noise(click_n, 2600, None, 0.45, order=1.2)
    out[:click_n] += click * (0.30 * bright / (np.max(np.abs(click)) + 1e-12)) * np.max(np.abs(out))
    out = env_attack(out, 2.2, 1.2)
    out = env_tail(out, 0.22)
    return out / (np.max(np.abs(out)) + 1e-12) * amp


def voice_pluck(f, dur, amp=1.0, bright=1.0):
    """轻拨弦：加法合成的拨弦（高次泛音更快衰减 + 轻微非谐性）"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = qf(f)
    out = np.zeros(n)
    for k in range(1, 13):
        fk = f * k * (1 + 0.00022 * k * k)      # 弦的非谐性
        if fk > SR * 0.46:
            break
        tau = max(0.55 / (k ** 0.72), dur / 6.5)
        lvl = (1.0 / k ** 1.25) * (bright if k > 3 else 1.0)
        out += lvl * np.exp(-t / tau) * np.sin(2 * np.pi * fk * t + k * 0.7)
    out = env_attack(out, 4.0, 1.4)
    out = env_tail(out, 0.25)
    return out / (np.max(np.abs(out)) + 1e-12) * amp


def voice_pad(f, dur, amp=1.0, atk=None, rel=None):
    """薄的低频垫：只有基频 + 一个很弱的八度，慢起慢收，绝不做成厚重低音墙。
    手机扬声器 200Hz 以下基本听不见，所以基频选在 130-200Hz 区间。
    atk / rel 用秒显式给，避免用"缓冲区比例"造成段与段不可控的叠合。"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = qf(f)
    out = np.sin(2 * np.pi * f * t) + 0.22 * np.sin(2 * np.pi * qf(f * 2) * t + 1.1)
    a = int((atk if atk is not None else 0.85) * SR)
    r = int((rel if rel is not None else 1.10) * SR)
    a = min(a, n // 2)
    r = min(r, n - a)
    if a > 1:
        out[:a] *= np.sin(np.linspace(0, np.pi / 2, a)) ** 1.5
    if r > 1:
        out[-r:] *= np.cos(np.linspace(0, np.pi / 2, r)) ** 1.5
    return out / (np.max(np.abs(out)) + 1e-12) * amp


# ============================================================
# 2. 循环混响（circular convolution）
# ============================================================

def make_ir(seconds=1.55, predelay_ms=17.0):
    """分频段衰减的噪声脉冲响应：低频拖尾长、高频先死 —— 自然房间感"""
    n = int(seconds * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    spec = np.fft.rfft(noise)
    fr = np.fft.rfftfreq(n, 1 / SR)
    ir = np.zeros(n)
    for lo, hi, tau in ((0, 600, 0.72), (600, 2400, 0.46), (2400, SR / 2, 0.20)):
        m = ((fr >= lo) & (fr < hi)).astype(float)
        band = np.fft.irfft(spec * m, n)
        ir += band * np.exp(-t / tau)
    d = int(predelay_ms * SR / 1000)
    ir = np.concatenate([np.zeros(d), ir])[:n]
    ir *= np.exp(-t / (seconds * 0.42))
    ir[:int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))
    return ir / np.sqrt(np.sum(ir ** 2))


def circular_reverb(dry, ir, wet):
    """循环卷积混响：长度严格等于循环长度 L，尾音绕过循环点接回开头 —— 完全无缝"""
    N = len(dry)
    H = np.fft.rfft(np.concatenate([ir, np.zeros(N - len(ir))]))
    X = np.fft.rfft(dry)
    y = np.fft.irfft(X * H, N)
    y *= wet / (np.max(np.abs(y)) + 1e-12)
    return dry + y * np.max(np.abs(dry))


# ============================================================
# 3. 响度 / 电平测量（ITU-R BS.1770-4）
# ============================================================

def k_weight(x, nfft):
    """K 加权：用解析频响作用在幅度谱上（能量等价，避免时域 IIR 递归）"""
    fr = np.fft.rfftfreq(nfft, 1 / SR)
    w = 2 * np.pi * fr / SR
    z1 = np.exp(-1j * w)
    z2 = z1 * z1
    # 阶段 1：高架
    f0, G, Q = 1681.974450955533, 3.999843853973347, 0.7071752369554196
    K = np.tan(np.pi * f0 / SR)
    Vh = 10 ** (G / 20)
    Vb = Vh ** 0.4996667741545416
    a0 = 1 + K / Q + K * K
    b = np.array([(Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0,
                  (Vh - Vb * K / Q + K * K) / a0])
    a = np.array([1.0, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0])
    H1 = (b[0] + b[1] * z1 + b[2] * z2) / (a[0] + a[1] * z1 + a[2] * z2)
    # 阶段 2：RLB 高通
    f0, Q = 38.13547087602444, 0.5003270373238773
    K = np.tan(np.pi * f0 / SR)
    a0 = 1 + K / Q + K * K
    b = np.array([1.0, -2.0, 1.0])
    a = np.array([1.0, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0])
    H2 = (b[0] + b[1] * z1 + b[2] * z2) / (a[0] + a[1] * z1 + a[2] * z2)
    return np.abs(H1 * H2)


def lufs(x):
    """整合响度 LUFS（400ms 块 / 100ms 跳 / 绝对 -70 门限 / 相对 -10 门限）"""
    n = len(x)
    nfft = 1 << int(np.ceil(np.log2(n)))
    X = np.fft.rfft(x, nfft)
    mag = k_weight(x, nfft)
    y = np.fft.irfft(X * mag, nfft)[:n]

    blk = int(0.4 * SR)
    hop = int(0.1 * SR)
    idx = range(0, n - blk + 1, hop)
    e = np.array([np.mean(y[i:i + blk] ** 2) for i in idx])
    with np.errstate(divide='ignore'):
        l = -0.691 + 10 * np.log10(np.maximum(e, 1e-20))
    keep = l > -70.0
    if not keep.any():
        return -np.inf
    rel = -0.691 + 10 * np.log10(np.mean(e[keep])) - 10.0
    keep &= (l > rel)
    return -0.691 + 10 * np.log10(np.mean(e[keep]))


def soft_limit(x, ceiling):
    """只在峰顶做软膝压缩，不改变整体音色（稀疏素材上完全不可闻）"""
    knee = 0.58 * ceiling
    y = x.copy()
    m = np.abs(x) > knee
    a = np.abs(x[m])
    s = np.sign(x[m])
    y[m] = s * (knee + (ceiling - knee) * np.tanh((a - knee) / (ceiling - knee)))
    return y


def db(v):
    return 20 * np.log10(max(v, 1e-12))


# ============================================================
# 4. BGM
# ============================================================

NOTE = {}
for name, semi in (('C', 0), ('D', 2), ('E', 4), ('G', 7), ('A', 9)):
    for octv in range(2, 7):
        NOTE[f'{name}{octv}'] = 440.0 * 2 ** ((semi - 9 + (octv - 4) * 12) / 12)

# 动机：明亮、跳跃的五声音阶小句（上跳 → 回落，像"好奇地探头"）
# 每个元素 (八分音符槽位 0-7, 音名, 力度)
MOTIF = [(0, 'G5', .62), (1, 'A5', .40), (3, 'C6', .58), (5, 'A5', .38)]
ANS_DOWN = [(0, 'G5', .52), (2, 'E5', .44), (3, 'D5', .34)]
ANS_HOME = [(0, 'A5', .48), (2, 'G5', .46), (4, 'E5', .40), (6, 'C5', .34)]

# 24 小节 = 6 段 × 4 小节。vel_scale 控制整段强弱，形成"呼吸"
# 最后一小节加一个极轻的上行"接气音"（A5），把乐句衔回开头的动机，
# 且它距循环点有 3 个八分音符 ≈ 1.07s，衰减到 ~7% —— MP3 编码在循环点插入的
# 约 26ms 空隙完全落在它的衰减尾巴之后，听不出断点。
ANS_DOWN_PICKUP = [(0, 'G5', .52), (2, 'E5', .44), (3, 'D5', .34), (5, 'A5', .22)]

SECTIONS = [
    # (起始小节, 小节内容, 段力度, 是否拨弦根音, 是否铺 pad)
    (0,  [MOTIF, ANS_DOWN, MOTIF, ANS_HOME], 0.92, False, True),
    (4,  [MOTIF, ANS_HOME, MOTIF, ANS_DOWN], 1.00, True,  True),
    (8,  [MOTIF, ANS_HOME, MOTIF, ANS_DOWN], 1.00, True,  True),
    (12, [MOTIF, ANS_DOWN, MOTIF, ANS_HOME], 0.88, True,  True),
    (16, [MOTIF, ANS_HOME, MOTIF, ANS_DOWN], 0.78, False, True),   # 留白段：更疏、更轻
    (20, [MOTIF, ANS_HOME, MOTIF, ANS_DOWN_PICKUP], 0.98, True, True),
]

# 拨弦低音进行（每 2 小节一个根音）：C  G  A  F  → 但用五声避免 F 的紧张感
BASS_PLAN = {0: 'C3', 2: 'G2', 4: 'C3', 6: 'A2', 8: 'G2', 10: 'C3',
             12: 'C3', 14: 'G2', 16: 'A2', 18: 'C3', 20: 'C3', 22: 'G2'}
PAD_PLAN = {0: 'C3', 4: 'G2', 8: 'A2', 12: 'C3', 16: 'G2', 20: 'C3'}


def build_bgm():
    dry = np.zeros(L)

    # --- 主旋律：马林巴 ---
    for bar0, bars, sec_vel, _, _ in SECTIONS:
        for bi, phrase in enumerate(bars):
            bar = bar0 + bi
            for slot, nname, vel in phrase:
                pos = int(round(bar * BAR + slot * EIGHTH))
                v = vel * sec_vel * 0.62
                dur = 1.75
                sig = voice_marimba(NOTE[nname], dur, amp=v, bright=1.0, ring=1.0)
                add_circ(dry, sig, pos)

    # --- 轻拨弦：只在有拨弦的段落，落在小节头与小节第三拍，稀疏不构成节拍 ---
    for bar0, _, sec_vel, use_bass, _ in SECTIONS:
        if not use_bass:
            continue
        for bi in range(4):
            bar = bar0 + bi
            if bar % 2 != 0:
                continue
            nname = BASS_PLAN.get(bar % 24, 'C3')
            v = 0.30 * sec_vel
            sig = voice_pluck(NOTE[nname], 2.4, amp=v, bright=0.85)
            add_circ(dry, sig, int(round(bar * BAR)))

    # --- 薄低频垫：每段一条，段尾先收、下段头再起，形成自然呼吸 ---
    # 最后一段（第 20 小节）的 pad 必须在循环点之前收干净，
    # 让留白区只剩混响尾巴 —— 这是 26ms 编码空隙 "落进安静里" 的关键。
    for si, (bar0, _, sec_vel, _, use_pad) in enumerate(SECTIONS):
        if not use_pad:
            continue
        nname = PAD_PLAN.get(bar0 % 24, 'C3')
        if si == len(SECTIONS) - 1:
            # 收到 69.85 s（循环点前 0.15 s）
            target_end = L - int(0.15 * SR)
            dur = (target_end - int(round(bar0 * BAR))) / SR
            sig = voice_pad(NOTE[nname], dur, amp=0.150 * sec_vel,
                            atk=0.60, rel=0.75)
        else:
            dur = 4 * BAR / SR + 1.9
            sig = voice_pad(NOTE[nname], dur, amp=0.150 * sec_vel,
                            atk=0.85, rel=1.10)
        add_circ(dry, sig, int(round(bar0 * BAR)))

    # --- 混响（循环卷积，尾音绕过循环点） ---
    ir = make_ir()
    mix = circular_reverb(dry, ir, wet=0.34)

    # --- 电平：软限峰 → 闭环归一到 -18 LUFS ---
    # 峰值刻意压到 -4 dBFS 附近：BGM 只要"垫着"，绝不能盖住 -12 dBFS 的音效。
    mix = mix - np.mean(mix)
    mix = soft_limit(mix, 0.62)
    for _ in range(8):
        cur = lufs(mix)
        mix *= 10 ** ((-18.0 - cur) / 20.0)
        mix = soft_limit(np.clip(mix, -0.63, 0.63), 0.63)
        if abs(lufs(mix) + 18.0) < 0.03:
            break

    # --- 循环点绝对归零：首尾各 2 ms 升余弦收敛到 0 ---
    # 这一步让 seam 在数学上不可能有咔哒声，无论解码器怎么处理 MP3 首尾填充。
    # 该区间本身已在 -40 dBFS 以下的留白里，2 ms 的收敛完全不可闻。
    nf = int(0.002 * SR)
    mix[:nf] *= 0.5 - 0.5 * np.cos(np.pi * np.arange(nf) / nf)
    mix[-nf:] *= 0.5 + 0.5 * np.cos(np.pi * np.arange(nf) / nf)
    return mix


# ============================================================
# 5. 音效
# ============================================================

def sfx_snap():
    """90ms 木块落位"咔" —— 全游戏最重要的音效。

    为什么玩家听几十次不会烦（设计依据）：
    1) **能量全由噪声承担 → 没有音高**。噪声的周期自相关接近 0，
       大脑无法从它身上提取旋律，也就不会累积"又是这个音"的疲劳。
       "木质"是靠频谱上 0.7–1.0 倍频程宽的**宽共振峰**（约 420/1150/2500Hz）
       给出的 —— 宽峰让人听出"木头"，窄峰才会让人听出"音符"。
    2) **瞬态在 1.2ms 内到峰**。快 attack 让它读作"事件"而非"乐音"，
       并能穿透安静环境下任何 BGM 与手机扬声器的窄带。
    3) **能量集中在 600–4000Hz 的"话语频段"** —— 听觉最灵敏、
       但最不易产生听疲劳的区间（8k 以上才刺耳，本音效已做高频滚降）。
    4) **全长 90ms，无混响**。连续触发不会糊成一片。
    5) **低频"实感"由带限噪声给出，不用正弦**（正弦低频才会形成音高感）。
    """
    n = int(0.090 * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)

    # 1) 宽带撞击瞬态 2.5ms —— "咔"的锐利来源，起振在 0 采样。
    #    带宽收在 1.4 个倍频程并做 6kHz 滚降：全带瞬态会把能量灌到 8k 以上，
    #    听感变成"嘶"而不是"咔"，且连续触发容易疲劳。
    out += shaped_noise(n, 2.5, [(1400.0, +2.0, 1.20)],
                        lowpass=(5200.0, 3)) * 0.88

    # 2) 主体：噪声 + 宽共振峰，26ms 衰减 —— 负重量的部分，无音高。
    #    共振峰铺在 220–4200Hz，重心压在 1kHz 附近：这是"木头"的听感区，
    #    也是手机扬声器能有效辐射的区间（200Hz 以下手机几乎发不出来）。
    out += shaped_noise(n, 26.0, [
        (220.0, +5.0, 0.70),      # 木块的"沉"
        (520.0, +4.0, 0.70),      # 厚度
        (1100.0, +5.0, 0.70),     # 主体共鸣（宽峰，不是音）
        (2200.0, +3.0, 0.75),     # 敲击的"脆"
        (4200.0, -2.0, 0.90),     # 空气感，已开始滚降
    ], lowpass=(3600.0, 3)) * 0.95

    # 3) 极轻的窄谐振点缀：只补材质边缘，电平压到 0.10 以下，不承载能量
    out += mode_bank(n, [
        (618.0, 9.0, 0.09), (902.0, 7.0, 0.08),
        (1341.0, 5.5, 0.06), (1972.0, 4.0, 0.04),
    ])

    # 4) 低频实感：60–330Hz 带限噪声，26ms —— 有重量、无音高
    out += band_noise(n, 60, 330, 26.0) * 0.58

    # 5) 木头落定的余韵 30–75ms：极轻噪声，让"咔"有"放稳了"的收束
    out += shaped_noise(n, 18.0, [(1600.0, 0.0, 1.0)],
                        lowpass=(3200.0, 3)) * \
        (np.clip((t - 0.028) / 0.010, 0, 1) * np.exp(-np.maximum(t - 0.028, 0) / 0.016)) * 0.14

    out = env_attack(out, 1.2, 1.8)      # 极快 attack
    out = env_tail(out, 0.22)            # decay 在 90ms 内收完
    return out / np.max(np.abs(out))


def sfx_pick():
    """80ms 木头轻拿起：比 snap 钝、比 snap 轻，是"手指抬起一块板"而不是"板砸下去"。
    同样用宽峰噪声承载能量（无音高），但共振峰整体更低、更闷、衰减更长一点点。
    """
    n = int(0.080 * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)

    # 1) 起势：中低频摩擦噪声（"蹭"）—— 拿起来的动作比放下慢
    out += shaped_noise(n, 5.0, [(900.0, 0.0, 1.3)], lowpass=(2800.0, 4)) * 0.75

    # 2) 主体：偏闷的宽峰，28ms
    out += shaped_noise(n, 28.0, [
        (330.0, +2.5, 0.80),
        (700.0, +4.0, 0.75),
        (1500.0, +1.0, 0.90),
        (2400.0, -2.0, 0.95),
    ], lowpass=(2600.0, 4)) * 0.90

    # 3) 极轻窄谐振点缀
    out += mode_bank(n, [
        (452.0, 11.0, 0.09), (668.0, 9.0, 0.08), (1012.0, 7.0, 0.06),
    ])

    # 4) 低频厚度：带限噪声（不是正弦，所以没有音高）
    out += band_noise(n, 90, 420, 30.0) * 0.30

    out = env_attack(out, 3.5, 1.5)      # 比 snap 软，无攻击性
    out = env_tail(out, 0.32)
    return out / np.max(np.abs(out))


def sfx_win():
    """1.2s 上行三音（明亮跳跃，木琴感）
    C5 → E5 → G5：五声音阶内的大三和弦上行。三音间隔只有 120ms，
    跳跃感来自节奏的紧密而不是音量。不做低音倍频、不做镲片、不做长混响轰鸣。
    最后一音加一层两个八度的极弱泛音，给木琴的"亮点"，但仍只是"轻轻点头"。
    这里是唯一**允许有明确音高**的音效 —— 它就是要被听成一个上扬的乐句。
    """
    dur = 1.2
    n = int(dur * SR)
    out = np.zeros(n)

    seq = [(0.000, 'C5', 0.60, 1.02), (0.120, 'E5', 0.70, 1.12),
           (0.240, 'G5', 0.84, 1.55)]
    for pos, nname, amp, ring in seq:
        sig = voice_marimba(NOTE[nname], min(dur - pos, 1.9), amp=amp,
                            bright=1.55, ring=ring)
        p = int(pos * SR)
        m = min(len(sig), n - p)
        out[p:p + m] += sig[:m]

    # 木琴亮点：最后一音多一个两个八度的弱泛音（只在最后音，不构成新旋律）
    p = int(0.240 * SR)
    m = n - p
    tt = np.arange(m) / SR
    g6 = NOTE['G5'] * 4
    spark = 0.13 * np.exp(-tt / 0.34) * np.sin(2 * np.pi * g6 * tt + 2.2)
    spark[:int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))
    out[p:] += spark

    # 一点点空间感（1.0s 短混响），不轰鸣
    ir = make_ir(seconds=1.0, predelay_ms=12.0)
    N = 1 << int(np.ceil(np.log2(n + len(ir))))
    wet = np.fft.irfft(np.fft.rfft(out, N) * np.fft.rfft(ir, N), N)[:n]
    out = out + wet * (0.16 * np.max(np.abs(out)) / (np.max(np.abs(wet)) + 1e-12))

    out = env_tail(out, 0.16)
    out[-int(0.002 * SR):] *= np.linspace(1, 0, int(0.002 * SR))
    return out / np.max(np.abs(out))


def sfx_tap():
    """50ms 极轻木质点击：宽带噪声 + 宽峰，不碰 8k 以上的刺耳区。
    必须不刺耳 —— 玩家会连续点它。峰值刻意是所有音效里最低的。"""
    n = int(0.050 * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    out += shaped_noise(n, 1.5, [(2200.0, 0.0, 1.3)], lowpass=(4800.0, 3)) * 0.70
    out += shaped_noise(n, 16.0, [
        (1200.0, +3.0, 0.85),
        (2600.0, +2.0, 0.80),
        (3400.0, -3.0, 0.90),
    ], lowpass=(4000.0, 4)) * 0.72
    out += mode_bank(n, [(1438.0, 7.0, 0.07), (2122.0, 5.5, 0.05)])
    out += band_noise(n, 80, 380, 12.0) * 0.18
    out = env_attack(out, 1.0, 1.8)
    out = env_tail(out, 0.35)
    return out / np.max(np.abs(out))


# ============================================================
# 6. 编码 & 落盘
# ============================================================

def encode_mp3(path, x, bitrate, mono=True):
    x = np.clip(x, -1.0, 1.0)
    pcm = (x * 32767.0).astype(np.int16)
    enc = lameenc.Encoder()
    enc.set_bit_rate(bitrate)
    enc.set_in_sample_rate(SR)
    enc.set_channels(1 if mono else 2)
    enc.set_quality(1)          # LAME -q1，最高质量档
    data = enc.encode(pcm.tobytes())
    data += enc.flush()
    with open(path, 'wb') as f:
        f.write(bytes(data))
    return len(data)


def write_wav(path, x):
    """16bit PCM WAV。零编码延迟、零解码开销 —— 短音效用它比 MP3 更合适：
    实测 lameenc 编解码会引入固定 25.06ms(1105 采样) 延迟，
    对"拖起/吸附"这种需要手感同步的音效是可感知的；而 90ms 的 WAV 才 8KB。"""
    import wave
    d = (np.clip(x, -1.0, 1.0) * 32767.0).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(d.tobytes())
    return os.path.getsize(path)


def normalize_peak(x, target_dbfs):
    return x / (np.max(np.abs(x)) + 1e-12) * 10 ** (target_dbfs / 20.0)


def report(name, path, x_ref, win_ms=90.0):
    sz = os.path.getsize(path)
    # 短音效不适合用 400ms 门限 LUFS，改报"主能量窗 RMS"
    w = min(len(x_ref), int(win_ms * SR / 1000))
    rms = np.sqrt(np.mean(x_ref[:w] ** 2))
    crest = db(np.max(np.abs(x_ref))) - db(rms)
    print(f'  {name:16s} {len(x_ref)/SR*1000:7.1f} ms  {sz/1024:7.1f} KB  '
          f'peak {db(np.max(np.abs(x_ref))):6.2f} dBFS  '
          f'RMS({win_ms:.0f}ms) {db(rms):6.2f} dBFS  crest {crest:5.1f} dB')


def window_rms(x, start_ms, end_ms):
    a = int(start_ms * SR / 1000) % len(x)
    b = int(end_ms * SR / 1000) % len(x)
    seg = x[a:b] if b > a else np.concatenate([x[a:], x[:b]])
    return db(np.sqrt(np.mean(seg ** 2)))


def main():
    print('=' * 78)
    print('《四巧·七巧》v0.1 音频合成')
    print('=' * 78)

    fb = os.path.join(OUT, 'mp3-fallback')
    os.makedirs(fb, exist_ok=True)

    # ---------- BGM ----------
    print('\n[1/5] BGM 合成中 ... (循环长度 %d 采样 = %.3f s, %d 小节 @ %g BPM + %d 拍留白)'
          % (L, L / SR, N_BARS, BPM, TAIL_BEATS))
    bgm = build_bgm()
    p = os.path.join(OUT, 'bgm_main.mp3')
    sz = encode_mp3(p, bgm, 80)
    pk = db(np.max(np.abs(bgm)))
    rms = db(np.sqrt(np.mean(bgm ** 2)))
    print(f'      bgm_main.mp3  {sz/1024:.1f} KB  (80 kbps mono)')
    print(f'      目标 -18.00 LUFS / 实测 {lufs(bgm):.2f} LUFS / '
          f'peak {pk:.2f} dBFS / 整体 RMS {rms:.2f} dBFS / crest {pk-rms:.1f} dB')

    # 循环点连续性检查（源信号）
    seam = abs(bgm[0] - bgm[-1])
    d = np.abs(np.diff(bgm))
    print(f'      循环点样本差 {seam:.6f}  |  循环内相邻样本差 中位数 '
          f'{np.median(d):.6f} / 99.99 分位 {np.percentile(d, 99.99):.6f}')
    print(f'      循环点前 50ms RMS {window_rms(bgm, L/SR*1000-50, L/SR*1000):7.2f} dBFS  |  '
          f'后 50ms RMS {window_rms(bgm, 0, 50):7.2f} dBFS  '
          f'(全曲 RMS {rms:.2f})')

    # ---------- SFX：短音效走 WAV（零延迟），win 走 MP3（体积） ----------
    print('\n[2/5] sfx_snap  <-- 全游戏最重要（WAV，零编码延迟）')
    snap = normalize_peak(sfx_snap(), -8.0)
    p = os.path.join(OUT, 'sfx_snap.wav')
    write_wav(p, snap)
    encode_mp3(os.path.join(fb, 'sfx_snap.mp3'), snap, 128)
    report('sfx_snap.wav', p, snap)

    print('[3/5] sfx_pick（WAV）')
    pick = normalize_peak(sfx_pick(), -11.0)
    p = os.path.join(OUT, 'sfx_pick.wav')
    write_wav(p, pick)
    encode_mp3(os.path.join(fb, 'sfx_pick.mp3'), pick, 128)
    report('sfx_pick.wav', p, pick)

    print('[4/5] sfx_win（MP3：1.2s 转 WAV 会到 106KB，超 40KB 上限）')
    win = normalize_peak(sfx_win(), -9.0)
    p = os.path.join(OUT, 'sfx_win.mp3')
    encode_mp3(p, win, 96)
    report('sfx_win.mp3', p, win)

    print('[5/5] sfx_tap（WAV）')
    tap = normalize_peak(sfx_tap(), -12.0)
    p = os.path.join(OUT, 'sfx_tap.wav')
    write_wav(p, tap)
    encode_mp3(os.path.join(fb, 'sfx_tap.mp3'), tap, 128)
    report('sfx_tap.wav', p, tap)

    # ---------- 解码回验 ----------
    print('\n' + '-' * 78)
    print('解码回验（真实落盘文件读回来是什么样）')
    print('-' * 78)
    try:
        import soundfile as sf
        for fn in ('bgm_main.mp3', 'sfx_snap.wav', 'sfx_pick.wav',
                   'sfx_win.mp3', 'sfx_tap.wav'):
            fp = os.path.join(OUT, fn)
            y, sr = sf.read(fp, dtype='float64')
            if y.ndim > 1:
                y = y.mean(axis=1)
            a = np.abs(y)
            pk_i = int(np.argmax(a))
            print(f'  {fn:15s} {len(y)/sr*1000:8.1f} ms {os.path.getsize(fp)/1024:7.1f} KB  '
                  f'peak {db(a[pk_i]):6.2f} dBFS  峰@ {pk_i/sr*1000:7.2f} ms  '
                  f'首样 {y[0]:+.5f}  末样 {y[-1]:+.5f}')
        # BGM 循环点实测：把解码后的文件首尾对接，看接缝处是否比周围更"空"
        y, sr = sf.read(os.path.join(OUT, 'bgm_main.mp3'), dtype='float64')
        print('\n  BGM 解码后 %.2f s（音乐 %.3f s + MP3 首尾填充 %.1f ms）'
              % (len(y) / sr, L / sr, (len(y) - L) / sr * 1000))
    except Exception as e:
        print('  跳过（%s）' % e)

    # ---------- 掩蔽检查：音效必须压得住 BGM ----------
    # 判据用行业通行的"峰值高出底噪 10dB"（瞬态的感知由峰值主导，
    # 长音效另看 50ms 能量）。低于 10dB 就是听不清，要回去改音效本体而不是硬拉音量。
    print('\n' + '-' * 78)
    print('掩蔽检查（按建议 gain 折算；峰值需高于 BGM 底噪 ≥10 dB）')
    print('-' * 78)
    BGM_GAIN = 0.30
    w = int(0.05 * SR)
    rv = np.array([db(np.sqrt(np.mean(bgm[i:i + w] ** 2)))
                   for i in range(0, L - w, w)])
    bed = np.median(rv) + db(BGM_GAIN)
    bgm_pk = db(np.max(np.abs(bgm))) + db(BGM_GAIN)
    print(f'  BGM @gain {BGM_GAIN}: 底噪(50ms中位) {bed:.1f} dBFS, 峰值 {bgm_pk:.1f} dBFS')
    for nm, sig, g in (('sfx_snap', snap, 1.00), ('sfx_win', win, 1.00),
                       ('sfx_pick', pick, 0.90), ('sfx_tap', tap, 0.80)):
        pk = db(np.max(np.abs(sig))) + db(g)
        e = db(np.sqrt(np.mean(sig[:w] ** 2))) + db(g)
        print(f'  {nm:9s} @gain {g:.2f} → 峰值 {pk:6.1f} dBFS '
              f'(高出底噪 {pk-bed:+5.1f} dB, 高出 BGM 峰值 {pk-bgm_pk:+5.1f} dB)   '
              f'前50ms {e:6.1f} dBFS')

    print('\n完成。')


if __name__ == '__main__':
    main()
