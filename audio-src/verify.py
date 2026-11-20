# -*- coding: utf-8 -*-
"""
《四巧·七巧》v0.1 音频客观验收
==============================
不是"看一眼觉得还行"，而是把每条硬指标量化出来。

验收项
------
BGM
  1. 响度是否 -18 LUFS（ITU-R BS.1770）
  2. 循环点是否有咔哒（样本级跳变 vs 全曲相邻样本差分位）
  3. 真实循环：把解码后的文件首尾相接，接缝能量是否连续
  4. 体积是否 ≤800KB
SFX
  5. attack 位置（拖起/吸附必须"即时"，>10ms 就有手感延迟）
  6. decay 是否在标称时长内收完
  7. **音高强度**（归一化自相关峰）—— snap/pick/tap 必须接近噪声水平
  8. 谱平坦度与峰/邻域比
  9. 峰值电平与体积
混音
 10. 音效按建议 gain 折算后，峰值是否高出 BGM 底噪 ≥10dB

用法: python verify.py
"""
import os
import wave
import numpy as np

SR = 44100
OUT = os.path.dirname(os.path.abspath(__file__))

BGM_GAIN = 0.30
GAINS = {'sfx_snap': 1.00, 'sfx_win': 1.00, 'sfx_pick': 0.90, 'sfx_tap': 0.80}


def db(v):
    return 20 * np.log10(max(float(v), 1e-12))


def read(path):
    if path.endswith('.wav'):
        with wave.open(path, 'rb') as w:
            n = w.getnframes()
            d = np.frombuffer(w.readframes(n), dtype='<i2').astype(np.float64) / 32768.0
            return d, w.getframerate()
    import soundfile as sf
    y, sr = sf.read(path, dtype='float64')
    if y.ndim > 1:
        y = y.mean(axis=1)
    return y, sr


def pitch_strength(x, sr, fmin=80.0, fmax=2200.0, win_ms=40.0):
    """归一化自相关峰 = 音高显著度。
    1.0 = 完美的周期波（会被听成明确的音）；噪声约 0.1–0.3。
    """
    w = min(len(x), int(win_ms / 1000 * sr))
    seg = x[:w] - np.mean(x[:w])
    if np.max(np.abs(seg)) < 1e-9:
        return 0.0
    ac = np.correlate(seg, seg, 'full')[len(seg) - 1:]
    ac = ac / ac[0]
    lo = int(sr / fmax)
    hi = min(int(sr / fmin), len(ac) - 1)
    if hi <= lo:
        return 0.0
    return float(np.max(ac[lo:hi]))


def spectral_stats(x, sr):
    n = len(x)
    N = 1 << 14
    S = np.abs(np.fft.rfft(x * np.hanning(n), N)) ** 2
    fr = np.fft.rfftfreq(N, 1 / sr)
    m = (fr > 200) & (fr < 8000)
    S2, f2 = S[m], fr[m]
    k = int(np.argmax(S2))
    lo, hi = max(0, k - 40), min(len(S2), k + 41)
    nb = np.delete(S2[lo:hi], k - lo)
    peak_ratio = 10 * np.log10(S2[k]) - 10 * np.log10(np.median(nb) + 1e-20)
    flat = np.exp(np.mean(np.log(S2 + 1e-20))) / np.mean(S2)
    return f2[k], peak_ratio, flat


def octave_profile(x, sr):
    """倍频程能量分布。用来检查"音色重心"对不对：
    全部压在 1k 以上 → 听成"嘶"，连续触发会疲劳；
    全部压在 250 以下 → 手机扬声器发不出来，变成没声音。
    """
    N = 1 << 14
    S = np.abs(np.fft.rfft(x * np.hanning(len(x)), N)) ** 2
    fr = np.fft.rfftfreq(N, 1 / sr)
    bands = [(60, 120), (120, 250), (250, 500), (500, 1000),
             (1000, 2000), (2000, 4000), (4000, 8000), (8000, 16000)]
    vals = [10 * np.log10(np.sum(S[(fr >= a) & (fr < b)]) + 1e-20) for a, b in bands]
    return bands, np.array(vals)


def print_octaves(x, sr, label):
    bands, v = octave_profile(x, sr)
    mx = v.max()
    print(f'  {label}倍频程能量（相对最强档）:')
    for (a, b), e in zip(bands, v):
        print('    %5d-%5dHz %6.1f dB %s' % (a, b, e, '#' * int((e - mx + 30) / 1.2)))


def lufs(x):
    """ITU-R BS.1770-4 整合响度（频域施加 K 加权）"""
    n = len(x)
    nfft = 1 << int(np.ceil(np.log2(n)))
    X = np.fft.rfft(x, nfft)
    fr = np.fft.rfftfreq(nfft, 1 / SR)
    w = 2 * np.pi * fr / SR
    z1, z2 = np.exp(-1j * w), np.exp(-2j * w)
    f0, G, Q = 1681.974450955533, 3.999843853973347, 0.7071752369554196
    K = np.tan(np.pi * f0 / SR)
    Vh = 10 ** (G / 20); Vb = Vh ** 0.4996667741545416
    a0 = 1 + K / Q + K * K
    b = [(Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0]
    a = [1.0, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0]
    H1 = (b[0] + b[1] * z1 + b[2] * z2) / (a[0] + a[1] * z1 + a[2] * z2)
    f0, Q = 38.13547087602444, 0.5003270373238773
    K = np.tan(np.pi * f0 / SR)
    a0 = 1 + K / Q + K * K
    b = [1.0, -2.0, 1.0]
    a = [1.0, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0]
    H2 = (b[0] + b[1] * z1 + b[2] * z2) / (a[0] + a[1] * z1 + a[2] * z2)
    y = np.fft.irfft(X * np.abs(H1 * H2), nfft)[:n]
    blk, hop = int(0.4 * SR), int(0.1 * SR)
    e = np.array([np.mean(y[i:i + blk] ** 2) for i in range(0, n - blk + 1, hop)])
    l = -0.691 + 10 * np.log10(np.maximum(e, 1e-20))
    keep = l > -70
    rel = -0.691 + 10 * np.log10(np.mean(e[keep])) - 10
    keep &= (l > rel)
    return -0.691 + 10 * np.log10(np.mean(e[keep]))


def main():
    ok = []
    print('=' * 76)
    print('《四巧·七巧》v0.1 音频验收')
    print('=' * 76)

    # ---------------- BGM ----------------
    print('\n【BGM】bgm_main.mp3')
    p = os.path.join(OUT, 'bgm_main.mp3')
    b, sr = read(p)
    sz = os.path.getsize(p)
    print(f'  时长 {len(b)/sr:.3f} s  |  体积 {sz/1024:.1f} KB  (限 800KB)')
    ok.append(('BGM 体积 ≤800KB', sz <= 800 * 1024, f'{sz/1024:.1f} KB'))
    L_ = lufs(b)
    print(f'  整合响度 {L_:.2f} LUFS  (目标 -18 ±0.5)')
    ok.append(('BGM -18 LUFS', abs(L_ + 18) <= 0.5, f'{L_:.2f}'))
    pk = db(np.max(np.abs(b)))
    print(f'  峰值 {pk:.2f} dBFS  (留 ≥3dB 余量，防解码溢出)')
    ok.append(('BGM 峰值余量', pk <= -3.0, f'{pk:.2f} dBFS'))

    # 真实循环模拟：首尾相接
    two = np.concatenate([b, b])
    J = len(b)
    dd = np.abs(np.diff(b))
    jump = abs(two[J] - two[J - 1])
    print(f'  接缝样本跳变 {jump:.7f}  |  全曲相邻样本差 中位 {np.median(dd):.6f} / '
          f'99.99 分位 {np.percentile(dd, 99.99):.6f}')
    ok.append(('BGM 接缝无咔哒', jump < np.percentile(dd, 99.99) * 0.1,
               f'{jump:.7f} vs {np.percentile(dd,99.99):.6f}'))

    w50 = int(0.05 * sr)
    before = db(np.sqrt(np.mean(two[J - w50:J] ** 2)))
    after = db(np.sqrt(np.mean(two[J:J + w50] ** 2)))
    print(f'  接缝前 50ms {before:.1f} dBFS  →  接缝后 50ms {after:.1f} dBFS '
          f'(前后都在留白里，26ms 编码空隙不可闻)')
    ok.append(('BGM 接缝在留白处', before < -30.0, f'{before:.1f} dBFS'))

    w = int(0.05 * sr)
    rv = np.array([db(np.sqrt(np.mean(b[i:i + w] ** 2))) for i in range(0, len(b) - w, w)])
    bed = np.median(rv) + db(BGM_GAIN)
    bgm_pk = pk + db(BGM_GAIN)
    print(f'  @建议 gain {BGM_GAIN}: 底噪 {bed:.1f} dBFS, 峰值 {bgm_pk:.1f} dBFS')

    # ---------------- SFX ----------------
    spec = [('sfx_snap.wav', 90.0, '无音高（噪声承载能量）', True),
            ('sfx_pick.wav', 80.0, '无音高（噪声承载能量）', True),
            ('sfx_tap.wav', 50.0, '无音高（噪声承载能量）', True),
            ('sfx_win.mp3', 1200.0, '允许有音高（上行乐句）', False)]

    for fn, nominal, note, no_pitch in spec:
        p = os.path.join(OUT, fn)
        x, sr = read(p)
        sz = os.path.getsize(p)
        print(f'\n【SFX】{fn}  —— {note}')
        print(f'  时长 {len(x)/sr*1000:.1f} ms (标称 {nominal:.0f})  |  '
              f'体积 {sz/1024:.2f} KB (限 40KB)')
        ok.append((f'{fn} 体积 ≤40KB', sz <= 40 * 1024, f'{sz/1024:.2f} KB'))

        a = np.abs(x)
        pk_i = int(np.argmax(a))
        # 起振点：首次达到峰值 10% 的位置
        on = int(np.argmax(a > a[pk_i] * 0.1))
        # mp3 音效会带 25ms 编码延迟（WAV 没有）。起播延迟容差按格式区分：
        # 吸附/拖起走 WAV 必须 ≤10ms；win 走 MP3，25ms 对"成局乐句"无影响。
        lim = 60.0 if fn.endswith('.mp3') else 10.0
        print(f'  attack: 起振 {on/sr*1000:.2f} ms, 到峰 {pk_i/sr*1000:.2f} ms '
              f'(容差 {lim:.0f}ms{", 含MP3编码延迟" if fn.endswith(".mp3") else ""})')
        ok.append((f'{fn} attack ≤{lim:.0f}ms', on / sr * 1000 <= lim,
                   f'{on/sr*1000:.2f} ms'))

        # 衰减：最后 10% 是否已收干净
        tail = db(np.sqrt(np.mean(x[-int(0.10 * len(x)):] ** 2)))
        print(f'  最后 10% 窗 RMS {tail:.1f} dBFS  (相对峰值 {tail-db(np.max(a)):.1f} dB)')
        ok.append((f'{fn} 尾音收干净', tail - db(np.max(a)) < -40.0,
                   f'{tail-db(np.max(a)):.1f} dB'))

        ps = pitch_strength(x, sr)
        print(f'  音高显著度 {ps:.3f}  (噪声≈0.1–0.3；>0.55 就有"音"了)')
        if no_pitch:
            ok.append((f'{fn} 无明显音高', ps < 0.45, f'{ps:.3f}'))
        else:
            # win 是唯一应该有音高的音效：反过来要求它必须能被听成明确的音
            ok.append((f'{fn} 有明确音高(预期)', ps > 0.55, f'{ps:.3f}'))

        f0, pr, flat = spectral_stats(x, sr)
        print(f'  主谱峰 {f0:.0f} Hz  峰/邻域 {pr:.1f} dB  谱平坦度 {flat:.3f}')
        # 谱平坦度只作辅助参考：它会被"带限"拉低（限带噪声本来就不平），
        # 所以门槛放得很松，真正的音高判据是上面的自相关音高显著度。
        if no_pitch:
            ok.append((f'{fn} 谱平坦度 >0.015', flat > 0.015, f'{flat:.3f}'))

        bands, ov = octave_profile(x, sr)
        peak_band = int(np.argmax(ov))
        hf = ov[6:].max()          # 4k–16k
        lf = ov[1:3].max()         # 120–500
        print(f'  音色重心 {bands[peak_band][0]}-{bands[peak_band][1]}Hz  |  '
              f'高频(4-16k) 比峰值低 {ov.max()-hf:.1f} dB  |  '
              f'低中频(120-500) 比峰值低 {ov.max()-lf:.1f} dB')
        # 高频不能和峰值一样响（会变成"嘶"，且连续听疲劳）
        ok.append((f'{fn} 高频不刺耳(≥6dB滚降)', ov.max() - hf >= 6.0,
                   f'{ov.max()-hf:.1f} dB'))
        # 低频不能太弱（手机扬声器 200Hz 以下几乎发不出，太低就白做了）。
        # 只对"撞击类"音效要求；win 是 C5 起的马林巴乐句，本来就没有低频。
        if no_pitch:
            ok.append((f'{fn} 低中频有重量(≤16dB)', ov.max() - lf <= 16.0,
                       f'{ov.max()-lf:.1f} dB'))

        g = GAINS[fn.replace('.wav', '').replace('.mp3', '')]
        pkg = db(np.max(a)) + db(g)
        print(f'  峰值 {db(np.max(a)):.2f} dBFS  @gain {g} → {pkg:.1f} dBFS, '
              f'高出 BGM 底噪 {pkg-bed:+.1f} dB')
        ok.append((f'{fn} 压得住 BGM (≥10dB)', pkg - bed >= 10.0,
                   f'{pkg-bed:+.1f} dB'))

    # ---------------- 汇总 ----------------
    print('\n' + '=' * 76)
    print('验收汇总')
    print('=' * 76)
    bad = [k for k, v, _ in ok if not v]
    for k, v, detail in ok:
        print(f'  [{"PASS" if v else "FAIL"}] {k:32s} {detail}')
    print(f'\n  {len(ok)-len(bad)}/{len(ok)} 通过'
          + ('' if not bad else f'  未通过: {", ".join(bad)}'))
    return 0 if not bad else 1


if __name__ == '__main__':
    raise SystemExit(main())
