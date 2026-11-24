# 在 a 格上做精确覆盖：把每个单位格切成 4 个小三角，板的边正好落在这些边上，
# 所以「板占了多少个小三角」精确等于 4×面积。目标 = 掩码覆盖到的小三角集合。
#
# 输入：ref.webp 的掩码 + grid.json（全局 a 与每格相位）
# 输出：tools/letters7/tiled.json（每字母 7 块板的 a 格整数顶点）
import json, os, itertools
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
im = Image.open(os.path.join(HERE, 'ref.webp')).convert('RGB')
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
GRID = json.load(open(os.path.join(HERE, 'grid.json'), encoding='utf8'))

# 4 个小三角的重心（相对单位格左下/左上角，图像坐标 y 向下）
TQ = [(0.5, 5 / 6), (5 / 6, 0.5), (0.5, 1 / 6), (1 / 6, 0.5)]

SHAPE = {
    'L': (2, [(0, 0), (2, 0), (0, 2)]),
    'M': (1, [(0, 0), (2, 0), (1, 1)]),
    'Q': (1, [(0, 0), (1, 0), (1, 1), (0, 1)]),
    'S': (0.5, [(0, 0), (1, 0), (0, 1)]),
    'R': (1, [(0, 0), (1, 0), (2, 1), (1, 1)]),
}


def rot90(p, k):
    c, s = [(1, 0), (0, 1), (-1, 0), (0, -1)][k]
    return [(c * x - s * y, s * x + c * y) for x, y in p]


def poly_area(p):
    a = 0.0
    for i in range(len(p)):
        x1, y1 = p[i]; x2, y2 = p[(i + 1) % len(p)]
        a += x1 * y2 - x2 * y1
    return a / 2


def in_poly(pt, poly):
    x, y = pt
    ins = False
    n = len(poly)
    for i in range(n):
        x1, y1 = poly[i]; x2, y2 = poly[(i + 1) % n]
        if (y1 > y) != (y2 > y):
            if x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
                ins = not ins
    return ins


def sample_target(cell, A):
    """采样：返回 (目标小三角集合, 格原点(ix0,iy0), 尺寸)"""
    ox, oy = cell['ox'], cell['oy']
    x0, y0, x1, y1 = cell['box']
    ix0 = int(np.floor((x0 - 2 - ox) / A)); ix1 = int(np.ceil((x1 + 2 - ox) / A))
    iy0 = int(np.floor((y0 - 2 - oy) / A)); iy1 = int(np.ceil((y1 + 2 - oy) / A))
    tris = set()
    for j in range(iy0, iy1):
        for i in range(ix0, ix1):
            for q, (dx, dy) in enumerate(TQ):
                px = ox + (i + dx) * A
                py = oy + (j + dy) * A
                xi, yi = int(round(px)), int(round(py))
                if 0 <= xi < W and 0 <= yi < H and mask[yi, xi]:
                    tris.add((i, j, q))
    return tris, (ix0, iy0, ix1, iy1)


def tris_of_poly(poly):
    """整数格多边形覆盖的小三角（重心在内部即可）"""
    xs = [v[0] for v in poly]; ys = [v[1] for v in poly]
    out = set()
    for j in range(int(np.floor(min(ys))), int(np.ceil(max(ys)))):
        for i in range(int(np.floor(min(xs))), int(np.ceil(max(xs)))):
            for q, (dx, dy) in enumerate(TQ):
                if in_poly((i + dx, j + dy), poly):
                    out.add((i, j, q))
    return out


def placements(key, i0, i1, j0, j1):
    area, base = SHAPE[key]
    out, seen = [], set()
    flips = [False, True] if key == 'R' else [False]
    for flip in flips:
        b = [(-x, y) for x, y in base] if flip else base
        for k in range(4):
            sh = rot90(b, k)
            xs = [v[0] for v in sh]; ys = [v[1] for v in sh]
            for ty in range(j0 - 1 - int(min(ys)), j1 + 1 - int(max(ys)) + 1):
                for tx in range(i0 - 1 - int(min(xs)), i1 + 1 - int(max(xs)) + 1):
                    poly = [(x + tx, y + ty) for x, y in sh]
                    t = tris_of_poly(poly)
                    if len(t) != int(area * 4):
                        continue
                    fs = frozenset(t)
                    if fs in seen:
                        continue
                    seen.add(fs)
                    out.append({'key': key, 'flip': flip, 'k': k, 'poly': poly, 'tris': fs})
    return out





def solve(target):
    keys = ['L', 'L', 'M', 'Q', 'R', 'S', 'S']
    i0 = min(t[0] for t in target); i1 = max(t[0] for t in target)
    j0 = min(t[1] for t in target); j1 = max(t[1] for t in target)
    cand = []
    for k in keys:
        cand.append([p for p in placements(k, i0, i1, j0, j1) if p['tris'] <= target])
    used = [False] * len(keys)
    sol = []

    def rec(covered):
        if covered == target:
            return True
        if len(sol) == len(keys):
            return False
        rest = target - covered
        # 选一个「剩余小三角」里候选最少的
        best = None
        for t in sorted(rest)[:40]:
            cnt = 0
            for idx, k in enumerate(keys):
                if used[idx]:
                    continue
                for p in cand[idx]:
                    if t in p['tris'] and p['tris'] <= rest:
                        cnt += 1
                        if cnt > 1:
                            break
                if cnt > 1:
                    break
            if best is None or cnt < best[1]:
                best = (t, cnt)
            if cnt == 0:
                return False
        if best is None:
            return False
        t = best[0]
        for idx, k in enumerate(keys):
            if used[idx]:
                continue
            for p in cand[idx]:
                if t not in p['tris'] or not (p['tris'] <= rest):
                    continue
                used[idx] = True
                sol.append({'i': idx, 'p': p})
                if rec(covered | p['tris']):
                    return True
                sol.pop()
                used[idx] = False
        return False

    return sol if rec(set()) else None


out = []
A = GRID['A']
for cell in GRID['cells']:
    target, (ix0, iy0, ix1, iy1) = sample_target(cell, A)
    sol = solve(target)
    ok = sol is not None and len(target) == 32
    print(cell['ch'], '小三角', len(target), '解', '有' if sol else '无')
    if not sol:
        out.append({'ch': cell['ch'], 'ok': False, 'tris': len(target)})
        continue
    pieces = []
    for s in sol:
        p = s['p']
        poly = p['poly']
        # 面积质心
        cx = sum(v[0] for v in poly) / len(poly)
        cy = sum(v[1] for v in poly) / len(poly)
        pieces.append({'key': p['key'], 'flip': p['flip'], 'k': p['k'], 'poly': poly,
                       'cx': round(cx, 3), 'cy': round(cy, 3)})
    out.append({'ch': cell['ch'], 'ok': True, 'a': A, 'origin': [ix0, iy0], 'cell': cell,
                'pieces': pieces, 'tris': len(target)})

json.dump(out, open(os.path.join(HERE, 'tiled.json'), 'w', encoding='utf8'), ensure_ascii=False)
print('成功', sum(1 for r in out if r['ok']), '/', len(out))
