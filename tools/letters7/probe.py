# 第二轮：按色相分类 + 连通域，量出每个字母的 7 块板（凸包 + 面积）
import json, os, colorsys
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

# 彩色像素：饱和度和亮度都够（灰字水印 S 很低，白底 V 高 S 低）
colored = (S > 0.30) & (V > 0.25)

BINS = [
    ('red', 345, 20), ('orange', 20, 45), ('yellow', 45, 70), ('green', 70, 160),
    ('cyan', 160, 200), ('blue', 200, 250), ('purple', 250, 290), ('magenta', 290, 345),
]
cls = np.full((H, W), -1, dtype=np.int32)
for i, (nm, lo, hi) in enumerate(BINS):
    if lo < hi:
        sel = colored & (Hh >= lo) & (Hh < hi)
    else:
        sel = colored & ((Hh >= lo) | (Hh < hi))
    cls[sel] = i

print('colored px', int(colored.sum()))


def comps(cls_id, min_area=40):
    """同一色相类里的 8 连通域（只吃该类像素）"""
    out = []
    seen = np.zeros((H, W), bool)
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
    if len(ps) <= 2:
        return ps
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


def poly_area(poly):
    s = 0.0
    for i in range(len(poly)):
        x1, y1 = poly[i]; x2, y2 = poly[(i + 1) % len(poly)]
        s += x1 * y2 - x2 * y1
    return abs(s) / 2.0


all_pieces = []
for i, (nm, lo, hi) in enumerate(BINS):
    for pts in comps(i):
        hp = hull(pts)
        all_pieces.append({'cls': nm, 'n': len(pts), 'hull': hp, 'area': poly_area(hp),
                           'bbox': [min(p[0] for p in pts), min(p[1] for p in pts),
                                    max(p[0] for p in pts), max(p[1] for p in pts)]})

print('pieces found', len(all_pieces))
# 按行聚类（y 中心）→ 行内按 x 聚类 → 字母
all_pieces.sort(key=lambda p: (p['bbox'][1]))
rows = []
for p in all_pieces:
    cy = (p['bbox'][1] + p['bbox'][3]) / 2
    for r in rows:
        if abs(r['cy'] - cy) < 70:
            r['ps'].append(p); r['cy'] = sum((q['bbox'][1] + q['bbox'][3]) / 2 for q in r['ps']) / len(r['ps'])
            break
    else:
        rows.append({'cy': cy, 'ps': [p]})
print('rows', len(rows), [len(r['ps']) for r in rows])
for r in rows:
    r['ps'].sort(key=lambda p: p['bbox'][0])
    # 行内按水平间距分组
    cells, cur = [], [r['ps'][0]]
    for p in r['ps'][1:]:
        if p['bbox'][0] - max(q['bbox'][2] for q in cur) > 26:
            cells.append(cur); cur = [p]
        else:
            cur.append(p)
    cells.append(cur)
    print('  行 cell 数', len(cells), '每格块数', [len(c) for c in cells])
    for c in cells:
        areas = sorted(p['n'] for p in c)
        x0 = min(p['bbox'][0] for p in c); x1 = max(p['bbox'][2] for p in c)
        y0 = min(p['bbox'][1] for p in c); y1 = max(p['bbox'][3] for p in c)
        tot = sum(p['n'] for p in c)
        print('    box', x0, y0, x1, y1, 'n=', len(c), 'areas', areas,
              '总/最大', round(tot / max(areas), 2))
