# 从参考图取每个字母的「剪影」多边形（外轮廓 + 内孔）
#
# 为什么不逐块取：同色的两块板相邻时白缝会被同色吃掉，量出来的「一块」其实是两块，
# 形状还可能是凹的（字母 A 右侧那块品红就是这样）。而关卡只需要剪影 + 一个严格解，
# 直接取剪影再让精确覆盖求解器去找严格解，比反解每块稳得多。
#
# 步骤：
#   1) 彩色像素掩码（饱和度和亮度都够）→ 3x3 闭运算把 1~2px 白缝缝上（不改变外边界）
#   2) 按行/列聚类分出 26 个字母格
#   3) 裂纹跟踪（crack following）取外轮廓与内孔 → RDP 化简成真实角点
# 输出 tools/letters7/outline.json
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


# 闭运算：先膨胀后腐蚀 → 白缝缝上、外边界不变
mask = erode(dilate(mask))
print('掩码像素', int(mask.sum()))

# ---------- 分格 ----------
ys, xs = np.where(mask)
pts = np.stack([xs, ys], axis=1)
# 简易连通域（8 邻接）
lab = np.zeros((H, W), np.int32)
comps = []
cur = 0
for (x0, y0) in pts:
    if lab[y0, x0]:
        continue
    cur += 1
    stack = [(x0, y0)]; lab[y0, x0] = cur; acc = []
    while stack:
        x, y = stack.pop(); acc.append((x, y))
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                nx, ny = x + dx, y + dy
                if 0 <= nx < W and 0 <= ny < H and mask[ny, nx] and not lab[ny, nx]:
                    lab[ny, nx] = cur; stack.append((nx, ny))
    ax = np.array(acc)
    comps.append({'n': len(acc), 'box': [int(ax[:, 0].min()), int(ax[:, 1].min()),
                                         int(ax[:, 0].max()), int(ax[:, 1].max())]})

comps = [c for c in comps if c['n'] > 800]
comps.sort(key=lambda c: ((c['box'][1] + c['box'][3]) / 2 // 60, c['box'][0]))
# 按行分组
rows = []
for c in comps:
    cy = (c['box'][1] + c['box'][3]) / 2
    for r in rows:
        if abs(r['cy'] - cy) < 60:
            r['cs'].append(c); break
    else:
        rows.append({'cy': cy, 'cs': [c]})
rows.sort(key=lambda r: r['cy'])
LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
cells = []
for r in rows:
    r['cs'].sort(key=lambda c: c['box'][0])
    print('行', len(r['cs']), [(c['box'][0], c['box'][2]) for c in r['cs']])
    for c in r['cs']:
        cells.append(c)
print('格数', len(cells))


def rdp(pts, tol):
    if len(pts) < 3:
        return pts
    a, b = pts[0], pts[-1]
    dx, dy = b[0] - a[0], b[1] - a[1]
    L = (dx * dx + dy * dy) ** 0.5
    idx, best = -1, -1
    for i in range(1, len(pts) - 1):
        p = pts[i]
        d = (abs((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) / L) if L > 1e-9 else \
            ((p[0] - a[0]) ** 2 + (p[1] - a[1]) ** 2) ** 0.5
        if d > best:
            best, idx = d, i
    if best <= tol:
        return [a, b]
    l = rdp(pts[:idx + 1], tol)
    r = rdp(pts[idx:], tol)
    return l[:-1] + r


def simplify_closed(poly, tol):
    n = len(poly)
    fi, fd = 1, -1
    for i in range(1, n):
        d = ((poly[i][0] - poly[0][0]) ** 2 + (poly[i][1] - poly[0][1]) ** 2) ** 0.5
        if d > fd:
            fd, fi = d, i
    r1 = rdp(poly[:fi + 1], tol)
    r2 = rdp(poly[fi:] + [poly[0]], tol)
    return r1[:-1] + r2[:-1]


def loops_of(m):
    """裂纹跟踪：返回若干闭合环（点用像素坐标，图像坐标 y 向下）"""
    h, w = m.shape
    starts = {}
    def add(p, q):
        starts.setdefault(p, []).append(q)
    for y in range(h):
        row = m[y]
        for x in range(w):
            if not row[x]:
                continue
            if y == 0 or not m[y - 1, x]:
                add((x, y), (x + 1, y))          # 上边
            if x == w - 1 or not m[y, x + 1]:
                add((x + 1, y), (x + 1, y + 1))  # 右边
            if y == h - 1 or not m[y + 1, x]:
                add((x + 1, y + 1), (x, y + 1))  # 下边
            if x == 0 or not m[y, x - 1]:
                add((x, y + 1), (x, y))          # 左边
    loops = []
    while starts:
        p0 = next(iter(starts))
        loop = [p0]
        p = p0
        while True:
            nxts = starts.get(p)
            if not nxts:
                break
            q = nxts.pop()
            if not nxts:
                del starts[p]
            loop.append(q)
            p = q
            if q == p0:
                break
        if len(loop) >= 4:
            loops.append(loop[:-1])
    return loops


def signed_area(poly):
    s = 0.0
    for i in range(len(poly)):
        x1, y1 = poly[i]; x2, y2 = poly[(i + 1) % len(poly)]
        s += x1 * y2 - x2 * y1
    return s / 2


out = []
for i, c in enumerate(cells):
    x0, y0, x1, y1 = c['box']
    pad = 2
    sub = mask[max(0, y0 - pad):y1 + pad + 1, max(0, x0 - pad):x1 + pad + 1]
    lp = loops_of(sub)
    rings = []
    for l in lp:
        poly = simplify_closed(l, 1.6)
        poly = [(round(px + x0 - pad, 2), round(py + y0 - pad, 2)) for px, py in poly]
        rings.append({'poly': poly, 'area': round(signed_area(poly), 1)})
    rings.sort(key=lambda r: -abs(r['area']))
    ch = LETTERS[i] if i < 26 else '?'
    out.append({'ch': ch, 'box': c['box'], 'rings': rings})
    print(ch, 'box', c['box'], '环', [(len(r['poly']), r['area']) for r in rings])

with open(os.path.join(HERE, 'outline.json'), 'w', encoding='utf8') as f:
    json.dump(out, f, ensure_ascii=False)
print('写入 outline.json')
