# 用「边界直方图折叠」定出 a 格（单位长 a + 相位 ox,oy）
#
# 字母的边只有横、竖、45° 三种，所以：
#   · 竖边的 x 坐标全在 x = ox + i*a 上  → 每列统计「竖向边界像素数」得到直方图
#   · 横边的 y 坐标全在 y = oy + j*a 上  → 每行统计「横向边界像素数」
# 把直方图按 a 折叠（对 a 取模），真 a 会让所有峰叠在同一个相位上；a 错了峰就散开。
# 26 个字母是同一字号，所以 a 是全局唯一的，逐字母只求自己的相位。
import json, os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, 'ref.webp')
im = Image.open(REF).convert('RGB')
W, H = im.size
rgb = np.asarray(im).astype(np.float32) / 255.0
mx = rgb.max(axis=2); mn = rgb.min(axis=2)
sat = np.where(mx > 1e-6, (mx - mn) / np.maximum(mx, 1e-6), 0)
mask = (sat > 0.28) & (mx > 0.25)


def shift(m, dy, dx, fill=0):
    out = np.full_like(m, fill)
    ys0, ys1 = max(0, dy), min(m.shape[0], m.shape[0] + dy)
    xs0, xs1 = max(0, dx), min(m.shape[1], m.shape[1] + dx)
    out[ys0:ys1, xs0:xs1] = m[ys0 - dy:ys1 - dy, xs0 - dx:xs1 - dx]
    return out


def dilate(m):
    out = m.copy()
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            out |= shift(m, dy, dx)
    return out


def erode(m):
    out = m.copy()
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            out &= shift(m, dy, dx, fill=1)
    return out


mask = erode(dilate(mask))

# ---------- 26 个格（用之前的框） ----------
cells = json.load(open(os.path.join(HERE, 'outline.json'), encoding='utf8'))
for i, c in enumerate(cells):
    c['ch'] = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[i]


def edge_hist(box):
    """返回 (列直方图, 行直方图)，桶位置 = 边界线的像素坐标"""
    x0, y0, x1, y1 = box
    x0 -= 2; y0 -= 2; x1 += 3; y1 += 3
    sub = mask[y0:y1, x0:x1]
    h, w = sub.shape
    # 竖向边界：sub[y,x] != sub[y,x+1] → 竖线在 x+0.5
    vx = (sub[:, :-1] != sub[:, 1:]).sum(axis=0).astype(float)
    # 横向边界
    hy = (sub[:-1, :] != sub[1:, :]).sum(axis=1).astype(float)
    return vx, hy, x0, y0


def fold_score(pos, wgt, a):
    """按 a 折叠，返回 (最佳相位, 集中度 0~1)"""
    if wgt.sum() <= 0:
        return 0.0, 0.0
    phase = np.mod(pos, a)
    bins = np.zeros(int(round(a / 0.25)) + 1)
    idx = np.minimum((phase / 0.25).astype(int), len(bins) - 1)
    np.add.at(bins, idx, wgt)
    # 3 桶（±0.5px）滑动求和
    k = 3
    ext = np.concatenate([bins[-k:], bins, bins[:k]])
    sm = np.convolve(ext, np.ones(k), 'same')[k:len(bins) + k]
    j = int(np.argmax(sm))
    return j * 0.25, sm[j] / wgt.sum()


def best_a(hists, a_lo, a_hi, step):
    """对每个候选 a 求「所有格集中度之和」，返回最优 a"""
    best = None
    a = a_lo
    while a <= a_hi:
        tot = 0.0
        for pos, wgt in hists:
            tot += fold_score(pos, wgt, a)[1]
        if best is None or tot > best[1]:
            best = (a, tot)
        a += step
    return best


# 先粗后细，全局求 a（只保留有长直边的桶：权重 >= 4）
H_all = []
for c in cells:
    vx, hy, x0, y0 = edge_hist(c['box'])
    px = np.arange(len(vx)) + x0 + 0.5
    py = np.arange(len(hy)) + y0 + 0.5
    keep = vx >= 4
    H_all.append((px[keep], vx[keep]))
    keep = hy >= 4
    H_all.append((py[keep], hy[keep]))

a1 = best_a(H_all, 20.0, 24.5, 0.05)
a2 = best_a(H_all, a1[0] - 0.08, a1[0] + 0.08, 0.005)
a3 = best_a(H_all, a2[0] - 0.01, a2[0] + 0.01, 0.0005)
print('全局 a：粗 %.3f(集中度 %.2f) → 中 %.3f → 细 %.3f (集中度 %.3f)'
      % (a1[0], a1[1], a2[0], a3[0], a3[1]))
A = a3[0]

out = []
for i, c in enumerate(cells):
    vx, hy, x0, y0 = edge_hist(c['box'])
    px = np.arange(len(vx)) + x0 + 0.5
    py = np.arange(len(hy)) + y0 + 0.5
    kx, ky = vx >= 3, hy >= 3
    ox, sx = fold_score(px[kx], vx[kx], A)
    oy, sy = fold_score(py[ky], hy[ky], A)
    # 用落在峰附近的边做最小二乘精调 (位置 ≈ ox + k*A)
    def refine(pos, wgt, ph):
        kk = np.round((pos - ph) / A)
        resid = pos - (ph + kk * A)
        sel = np.abs(resid) <= 0.9
        if sel.sum() < 3:
            return ph, A
        # 最小二乘： pos = ph + k*A
        k = kk[sel]; p = pos[sel]; w = wgt[sel]
        Sw = w.sum(); Sk = (w * k).sum(); Sp = (w * p).sum()
        Skk = (w * k * k).sum(); Skp = (w * k * p).sum()
        den = Sw * Skk - Sk * Sk
        if abs(den) < 1e-9:
            return ph, A
        a2_ = (Sw * Skp - Sk * Sp) / den
        ph2 = (Sp - a2_ * Sk) / Sw
        return ph2 - np.floor(ph2 / A) * A, a2_

    ox2, ax = refine(px[kx], vx[kx], ox)
    oy2, ay = refine(py[ky], hy[ky], oy)
    out.append({'ch': c['ch'], 'box': c['box'], 'a': round(float((ax + ay) / 2), 4),
                'ox': round(float(ox2 % A), 4), 'oy': round(float(oy2 % A), 4),
                'sharp': [round(float(sx), 3), round(float(sy), 3)]})
    print(c['ch'], 'a=%.4f ox=%.2f oy=%.2f 尖锐度 %.2f/%.2f'
          % (out[-1]['a'], out[-1]['ox'], out[-1]['oy'], sx, sy))

json.dump({'A': A, 'cells': out}, open(os.path.join(HERE, 'grid.json'), 'w', encoding='utf8'),
          ensure_ascii=False, indent=1)
print('写入 grid.json，A=%.4f' % A)
