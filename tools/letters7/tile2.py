# a 格精确覆盖（v2）：相位/步长用「小三角纯度」直接优化
#
# v1 的失败点：相位差 1~2px 就会让小三角采样在边界上来回跳，三角数变成 31/33，
# 目标就不可拼了。改成：每个小三角取 25 个内点，算覆盖率 f；好的格点下所有 f 都应
# 逼近 0 或 1，于是目标函数 cost = Σ min(f, 1-f)（越小越纯）可以直接优化 a / ox / oy。
# 纯度到位后 f>0.5 二值化，就是精确可拼的目标。
import json, os
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

SHAPE = {
    'L': (2, [(0, 0), (2, 0), (0, 2)]),
    'M': (1, [(0, 0), (2, 0), (1, 1)]),
    'Q': (1, [(0, 0), (1, 0), (1, 1), (0, 1)]),
    'S': (0.5, [(0, 0), (1, 0), (0, 1)]),
    'R': (1, [(0, 0), (1, 0), (2, 1), (1, 1)]),
}

# 单位格 4 个小三角（图像坐标 y 向下）：把格子的四个角记作
# TL(i,j) TR(i+1,j) BR(i+1,j+1) BL(i,j+1)
#  N = TL,TR,center ; E = TR,BR,center ; S = BR,BL,center ; W = BL,TL,center
TRI_V = {
    0: [(0, 0), (1, 0), (0.5, 0.5)],
    1: [(1, 0), (1, 1), (0.5, 0.5)],
    2: [(1, 1), (0, 1), (0.5, 0.5)],
    3: [(0, 1), (0, 0), (0.5, 0.5)],
}
# 三角内 5x5 重心坐标采样（严格内部）
BARY = []
for p in range(1, 6):
    for q in range(1, 6):
        a1 = p / 6.0; a2 = q / 6.0
        if a1 + a2 < 1.0:
            BARY.append((a1, a2))
BARY = np.array(BARY)                      # 15 个内点


def tri_points(i, j, q, A, ox, oy):
    v = TRI_V[q]
    out = []
    for a1, a2 in BARY:
        x = v[0][0] + a1 * (v[1][0] - v[0][0]) + a2 * (v[2][0] - v[0][0])
        y = v[0][1] + a1 * (v[1][1] - v[0][1]) + a2 * (v[2][1] - v[0][1])
        out.append((ox + (i + x) * A, oy + (j + y) * A))
    return out


def coverage_grid(A, ox, oy, i0, i1, j0, j1):
    """返回 {(i,j,q): 覆盖率}"""
    res = {}
    for j in range(j0, j1):
        for i in range(i0, i1):
            for q in range(4):
                pts = tri_points(i, j, q, A, ox, oy)
                s = 0
                for px, py in pts:
                    xi, yi = int(round(px)), int(round(py))
                    if 0 <= xi < W and 0 <= yi < H and mask[yi, xi]:
                        s += 1
                res[(i, j, q)] = s / len(pts)
    return res


def cost_of(cov):
    c = sum(min(f, 1 - f) for f in cov.values())
    total = sum(cov.values())
    return c + 1.5 * abs(total - 32)       # 总面积必须 = 8a² = 32 个小三角


def tri_range(box, A, ox, oy):
    x0, y0, x1, y1 = box
    i0 = int(np.floor((x0 - 2 - ox) / A)); i1 = int(np.ceil((x1 + 2 - ox) / A))
    j0 = int(np.floor((y0 - 2 - oy) / A)); j1 = int(np.ceil((y1 + 2 - oy) / A))
    return i0, i1, j0, j1


def rot90(p, k):
    c, s = [(1, 0), (0, 1), (-1, 0), (0, -1)][k]
    return [(c * x - s * y, s * x + c * y) for x, y in p]


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


def tris_of_poly(poly):
    xs = [v[0] for v in poly]; ys = [v[1] for v in poly]
    out = set()
    for j in range(int(np.floor(min(ys))), int(np.ceil(max(ys)))):
        for i in range(int(np.floor(min(xs))), int(np.ceil(max(xs)))):
            for q in range(4):
                v = TRI_V[q]
                cx = (v[0][0] + v[1][0] + v[2][0]) / 3 + i
                cy = (v[0][1] + v[1][1] + v[2][1]) / 3 + j
                if in_poly((cx, cy), poly):
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
    cand = [[p for p in placements(k, i0, i1, j0, j1) if p['tris'] <= target] for k in keys]
    used = [False] * len(keys)
    sol = []

    def rec(covered):
        if covered == target:
            return True
        if len(sol) == len(keys):
            return False
        rest = target - covered
        best = None
        for t in sorted(rest)[:40]:
            cnt = 0
            for idx in range(len(keys)):
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
        for idx in range(len(keys)):
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
A0 = GRID['A']
for cell in GRID['cells']:
    box = cell['box']
    best = None
    for da in (-0.35, -0.2, -0.1, 0, 0.1, 0.2, 0.35):
        A = A0 + da
        for dx in (-2.0, -1.2, -0.6, 0, 0.6, 1.2, 2.0):
            for dy in (-2.0, -1.2, -0.6, 0, 0.6, 1.2, 2.0):
                ox = (cell['ox'] + dx) % A
                oy = (cell['oy'] + dy) % A
                i0, i1, j0, j1 = tri_range(box, A, ox, oy)
                cov = coverage_grid(A, ox, oy, i0, i1, j0, j1)
                c = cost_of(cov)
                if best is None or c < best[0]:
                    best = (c, A, ox, oy, cov)
    # 再在最优附近细扫
    c0, A, ox, oy, cov = best
    for da in (-0.06, -0.03, 0, 0.03, 0.06):
        for dx in (-0.3, -0.15, 0, 0.15, 0.3):
            for dy in (-0.3, -0.15, 0, 0.15, 0.3):
                A2 = A + da; ox2 = (ox + dx) % A2; oy2 = (oy + dy) % A2
                i0, i1, j0, j1 = tri_range(box, A2, ox2, oy2)
                cov2 = coverage_grid(A2, ox2, oy2, i0, i1, j0, j1)
                c2 = cost_of(cov2)
                if c2 < c:
                    c, A, ox, oy, cov = c2, A2, ox2, oy2, cov2

    target = set(k for k, f in cov.items() if f > 0.5)
    sol = solve(target) if len(target) == 32 else None
    print(cell['ch'], 'cost=%.2f' % c, 'a=%.3f' % A, 'ox=%.2f oy=%.2f' % (ox, oy),
          '三角', len(target), '解', '有' if sol else '无')
    if not sol:
        out.append({'ch': cell['ch'], 'ok': False, 'tris': len(target), 'cost': round(c, 2)})
        continue
    pieces = []
    for s in sol:
        p = s['p']
        poly = p['poly']
        pieces.append({'key': p['key'], 'flip': p['flip'], 'k': p['k'], 'poly': poly})
    out.append({'ch': cell['ch'], 'ok': True, 'a': A, 'ox': ox, 'oy': oy,
                'pieces': pieces, 'tris': len(target)})

json.dump(out, open(os.path.join(HERE, 'tiled.json'), 'w', encoding='utf8'), ensure_ascii=False)
print('成功', sum(1 for r in out if r['ok']), '/', len(out))
