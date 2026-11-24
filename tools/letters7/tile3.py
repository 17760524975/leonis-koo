# a 格精确覆盖（v3）：两族网格都试
#
# 七巧板只有两族朝向：
#   A 族（直角边横平竖直）：小三角直角边 = a，正方形边 = a，网格间距 a
#   U 族（斜边横平竖直）：小三角斜边 = 2u，网格间距 u = a/√2
# 参考图里每个字母各自用其中一族（有的字母方块是正的→A 族，有的是斜的→U 族）。
# 两族各跑一次「小三角纯度」优化，取纯度高的；纯度≈0 说明该族就是它的真网格。
#
# 输出 tools/letters7/tiled.json：每字母 族 + 7 块板的整数顶点（该族单位）
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

FAM = {
    # A 族：直角边横平竖直
    'A': {'area': 8, 'shape': {
        'L': (2, [(0, 0), (2, 0), (0, 2)]),
        'M': (1, [(0, 0), (2, 0), (1, 1)]),
        'Q': (1, [(0, 0), (1, 0), (1, 1), (0, 1)]),
        'S': (0.5, [(0, 0), (1, 0), (0, 1)]),
        'R': (1, [(0, 0), (1, 0), (2, 1), (1, 1)]),
    }},
    # U 族：斜边横平竖直（基型就是游戏里的 DATA7.pieces）
    'U': {'area': 16, 'shape': {
        'L': (4, [(0, 0), (4, 0), (2, 2)]),
        'M': (2, [(0, 0), (2, 0), (0, 2)]),
        'Q': (2, [(1, 0), (2, 1), (1, 2), (0, 1)]),
        'S': (1, [(0, 0), (2, 0), (1, 1)]),
        'R': (2, [(1, 0), (3, 0), (2, 1), (0, 1)]),
    }}
}

# 单位格 4 个小三角（格子的四角 TL TR BR BL + 中心）
TRI_V = {
    0: [(0, 0), (1, 0), (0.5, 0.5)],
    1: [(1, 0), (1, 1), (0.5, 0.5)],
    2: [(1, 1), (0, 1), (0.5, 0.5)],
    3: [(0, 1), (0, 0), (0.5, 0.5)],
}
BARY = np.array([(p / 6.0, q / 6.0) for p in range(1, 6) for q in range(1, 6)
                 if p / 6.0 + q / 6.0 < 1.0])


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


def tri_points(i, j, q, P, ox, oy):
    v = TRI_V[q]
    return [(ox + (i + v[0][0] + a1 * (v[1][0] - v[0][0]) + a2 * (v[2][0] - v[0][0])) * P,
             oy + (j + v[0][1] + a1 * (v[1][1] - v[0][1]) + a2 * (v[2][1] - v[0][1])) * P)
            for a1, a2 in BARY]


def tri_range(box, P, ox, oy):
    x0, y0, x1, y1 = box
    return (int(np.floor((x0 - 2 - ox) / P)), int(np.ceil((x1 + 2 - ox) / P)),
            int(np.floor((y0 - 2 - oy) / P)), int(np.ceil((y1 + 2 - oy) / P)))


def coverage(P, ox, oy, i0, i1, j0, j1):
    res = {}
    for j in range(j0, j1):
        for i in range(i0, i1):
            for q in range(4):
                s = 0
                for px, py in tri_points(i, j, q, P, ox, oy):
                    xi, yi = int(round(px)), int(round(py))
                    if 0 <= xi < W and 0 <= yi < H and mask[yi, xi]:
                        s += 1
                res[(i, j, q)] = s / len(BARY)
    return res


def cost_of(cov, ntri):
    return sum(min(f, 1 - f) for f in cov.values()) + 1.5 * abs(sum(cov.values()) - ntri)


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


def placements(key, fam, i0, i1, j0, j1):
    area, base = FAM[fam]['shape'][key]
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


def solve(target, fam):
    keys = ['L', 'L', 'M', 'Q', 'R', 'S', 'S']
    i0 = min(t[0] for t in target); i1 = max(t[0] for t in target)
    j0 = min(t[1] for t in target); j1 = max(t[1] for t in target)
    cand = [[p for p in placements(k, fam, i0, i1, j0, j1) if p['tris'] <= target] for k in keys]
    used = [False] * len(keys)
    sol = []
    node = [0]

    def rec(covered):
        node[0] += 1
        if node[0] > 400000:
            return False
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
U0 = A0 / np.sqrt(2)
for cell in GRID['cells']:
    box = cell['box']
    bestAll = None
    for fam, p0 in (('A', A0), ('U', U0)):
        ntri = FAM[fam]['area'] * 4
        best = None
        for dp in (-0.30, -0.18, -0.09, 0, 0.09, 0.18, 0.30):
            P = p0 + dp
            for dx in (-2.0, -1.2, -0.6, 0, 0.6, 1.2, 2.0):
                for dy in (-2.0, -1.2, -0.6, 0, 0.6, 1.2, 2.0):
                    ox = (cell['ox'] + dx) % P
                    oy = (cell['oy'] + dy) % P
                    i0, i1, j0, j1 = tri_range(box, P, ox, oy)
                    cov = coverage(P, ox, oy, i0, i1, j0, j1)
                    c = cost_of(cov, ntri)
                    if best is None or c < best[0]:
                        best = (c, P, ox, oy, cov)
        c, P, ox, oy, cov = best
        for dp in (-0.05, -0.025, 0, 0.025, 0.05):
            for dx in (-0.3, -0.15, 0, 0.15, 0.3):
                for dy in (-0.3, -0.15, 0, 0.15, 0.3):
                    P2 = P + dp; ox2 = (ox + dx) % P2; oy2 = (oy + dy) % P2
                    i0, i1, j0, j1 = tri_range(box, P2, ox2, oy2)
                    cov2 = coverage(P2, ox2, oy2, i0, i1, j0, j1)
                    c2 = cost_of(cov2, ntri)
                    if c2 < c:
                        c, P, ox, oy, cov = c2, P2, ox2, oy2, cov2
        if bestAll is None or c < bestAll['cost']:
            bestAll = {'fam': fam, 'cost': c, 'P': P, 'ox': ox, 'oy': oy, 'cov': cov, 'ntri': ntri}

    target = set(k for k, f in bestAll['cov'].items() if f > 0.5)
    sol = solve(target, bestAll['fam']) if len(target) == bestAll['ntri'] else None
    tag = 'OK' if sol else '✗'
    print(cell['ch'], tag, bestAll['fam'], 'P=%.3f' % bestAll['P'], 'cost=%.2f' % bestAll['cost'],
          '三角', len(target), '/', bestAll['ntri'])
    if not sol:
        out.append({'ch': cell['ch'], 'ok': False})
        continue
    pieces = []
    for s in sol:
        p = s['p']
        cx = sum(v[0] for v in p['poly']) / len(p['poly'])
        cy = sum(v[1] for v in p['poly']) / len(p['poly'])
        pieces.append({'key': p['key'], 'flip': p['flip'], 'k': p['k'],
                       'poly': p['poly'], 'cx': round(cx, 3), 'cy': round(cy, 3)})
    out.append({'ch': cell['ch'], 'ok': True, 'fam': bestAll['fam'], 'P': bestAll['P'],
                'ox': bestAll['ox'], 'oy': bestAll['oy'], 'pieces': pieces})

json.dump(out, open(os.path.join(HERE, 'tiled.json'), 'w', encoding='utf8'), ensure_ascii=False)
print('成功', sum(1 for r in out if r['ok']), '/', len(out))
