# 26 个七巧板字母 → 逐块提取（按色相分块 + 凸包）
# 输出 tools/letters7/pieces.json：
#   [{ ch:'A', box:[x0,y0,x1,y1], u:.., pieces:[{cls, area, hull:[[x,y],..]}] }, ...]
import json, os
from collections import deque
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, 'ref.webp')

im = Image.open(REF).convert('RGB')
W, H = im.size
rgb = np.asarray(im).astype(np.float32) / 255.0
R, G, B = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
mx = rgb.max(axis=2); mn = rgb.min(axis=2)
V = mx
S = np.where(mx > 1e-6, (mx - mn) / np.maximum(mx, 1e-6), 0)
d = np.maximum(mx - mn, 1e-6)
Hh = np.zeros_like(mx)
m = (mx == R); Hh[m] = ((G - B) / d)[m] % 6
m = (mx == G) & (mx != R); Hh[m] = ((B - R) / d + 2)[m]
m = (mx == B) & (mx != R) & (mx != G); Hh[m] = ((R - G) / d + 4)[m]
Hh = Hh * 60.0
colored = (S > 0.30) & (V > 0.25)

BINS = [('red', 345, 20), ('orange', 20, 45), ('yellow', 45, 70), ('green', 70, 160),
        ('cyan', 160, 200), ('blue', 200, 250), ('purple', 250, 290), ('magenta', 290, 345)]
cls = np.full((H, W), -1, dtype=np.int32)
for i, (nm, lo, hi) in enumerate(BINS):
    sel = colored & ((Hh >= lo) & (Hh < hi) if lo < hi else ((Hh >= lo) | (Hh < hi)))
    cls[sel] = i


def comps(cls_id, min_area=120):
    out, seen = [], np.zeros((H, W), bool)
    ys, xs = np.where(cls == cls_id)
    for y0, x0 in zip(ys, xs):
        if seen[y0, x0]:
            continue
        q = deque([(y0, x0)]); seen[y0, x0] = True; pts = []
        while q:
            y, x = q.popleft(); pts.append((x, y))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < H and 0 <= nx < W and not seen[ny, nx] and cls[ny, nx] == cls_id:
                        seen[ny, nx] = True; q.append((ny, nx))
        if len(pts) >= min_area:
            out.append(pts)
    return out


def hull(pts):
    ps = sorted(set(pts))
    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo = []
    for p in ps:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], p) <= 0:
            lo.pop()
        lo.append(p)
    up = []
    for p in reversed(ps):
        while len(up) >= 2 and cross(up[-2], up[-1], p) <= 0:
            up.pop()
        up.append(p)
    return lo[:-1] + up[:-1]


def area(poly):
    s = 0.0
    for i in range(len(poly)):
        x1, y1 = poly[i]; x2, y2 = poly[(i + 1) % len(poly)]
        s += x1 * y2 - x2 * y1
    return abs(s) / 2.0


pieces = []
for i, (nm, lo, hi) in enumerate(BINS):
    for pts in comps(i):
        hp = hull(pts)
        if len(hp) < 3:
            continue
        # 去掉共线点
        keep = []
        n = len(hp)
        for k in range(n):
            a, b, c = hp[(k - 1) % n], hp[k], hp[(k + 1) % n]
            cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])
            if abs(cr) > 0.6:
                keep.append(b)
        hp = keep if len(keep) >= 3 else hp
        pieces.append({'cls': nm, 'n': len(pts), 'hull': hp, 'area': area(hp),
                       'bbox': [min(p[0] for p in pts), min(p[1] for p in pts),
                                max(p[0] for p in pts), max(p[1] for p in pts)]})

# ---- 分行 ----
pieces.sort(key=lambda p: (p['bbox'][1] + p['bbox'][3]) / 2)
rows = []
for p in pieces:
    cy = (p['bbox'][1] + p['bbox'][3]) / 2
    for r in rows:
        if abs(r['cy'] - cy) < 60:
            r['ps'].append(p)
            r['cy'] = sum((q['bbox'][1] + q['bbox'][3]) / 2 for q in r['ps']) / len(r['ps'])
            break
    else:
        rows.append({'cy': cy, 'ps': [p]})

LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
labels = []
for r in rows:
    r['ps'].sort(key=lambda p: p['bbox'][0])
    # 用「块数」判断：>=12 块认为是两个字母黏在一起，按内部最大空隙切开
    groups, cur = [], [r['ps'][0]]
    for p in r['ps'][1:]:
        gap = p['bbox'][0] - max(q['bbox'][2] for q in cur)
        if gap > 14:
            groups.append(cur); cur = [p]
        else:
            cur.append(p)
    groups.append(cur)
    split = []
    for g in groups:
        if len(g) >= 11:
            # 找内部最大 x 间隙
            g = sorted(g, key=lambda p: p['bbox'][0])
            best_k, best_gap = 1, -1
            for k in range(1, len(g)):
                gap = g[k]['bbox'][0] - max(q['bbox'][2] for q in g[:k])
                if gap > best_gap:
                    best_gap, best_k = gap, k
            split += [g[:best_k], g[best_k:]]
        else:
            split.append(g)
    for g in split:
        g = sorted(g, key=lambda p: p['bbox'][0])
        if len(g) != 7:
            print('WARN 块数 != 7:', len(g), [round(p['n']) for p in g])
        labels.append(g)

print('字母数', len(labels))
out = []
for i, g in enumerate(labels):
    ch = LETTERS[i]
    tot = sum(p['n'] for p in g)
    box = [min(p['bbox'][0] for p in g), min(p['bbox'][1] for p in g),
           max(p['bbox'][2] for p in g), max(p['bbox'][3] for p in g)]
    # 面积比校验：像素数 应 ≈ [1,1,2,2,2,4,4] * (u^2)
    ns = sorted(p['n'] for p in g)
    u = (tot / 16.0) ** 0.5
    out.append({'ch': ch, 'box': [int(v) for v in box], 'u': round(u, 4), 'tot': int(tot),
                'pieces': [{'cls': p['cls'], 'n': int(p['n']), 'area': round(p['area'], 2),
                            'hull': [[round(float(v[0]), 2), round(float(v[1]), 2)] for v in p['hull']]}
                           for p in g]})
    print(ch, 'box', [int(v) for v in box], 'u=%.2f' % u, '块数', len(g), '面积', [p['n'] for p in g])

with open(os.path.join(HERE, 'pieces.json'), 'w', encoding='utf8') as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
print('写入 pieces.json')
