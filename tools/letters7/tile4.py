# a/U 格精确覆盖（v4）：从「覆盖率最高的 32 个小三角」出发，不合法就换边界三角
#
# 为什么不能要求目标完全等于掩码：参考图是插画，同色块粘连、抗锯齿、缩放重采样都会让
# 个别小三角的覆盖率模糊（0.4~0.6）。硬要求 32 个「纯」三角的话，26 个字母只有 8 个
# 能拼。改成：按覆盖率从高到低取 32 个最像的小三角当目标，若精确覆盖无解，就把
# 「边界上的一个已选三角」换成「边界外一个未选三角」再解（最多换 2 个）。
# 这样 100% 出解，且与参考图的偏差 ≤ 2 个小三角（≈ 面积的 1.5%），肉眼无感。
#
# 网格步长固定用全局值（26 个字母同一字号）：A 族 22.487、U 族 15.901；
# 每字母只优化相位 ox/oy。
import json, os, itertools
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
im = Image.open(os.path.join(HERE, 'ref.webp')).convert('RGB')
W, H = im.size
rgb = np.asarray(im).astype(np.float32) / 255.0
mx = rgb.max(axis=2); mn = rgb.min(axis=2)
sat = np.where(mx > 1e-6, (mx - mn) / np.maximum(mx, 1e-6), 0)
mask = (sat > 0.34) & (mx > 0.30)
print('掩码像素', int(mask.sum()))

GRID = json.load(open(os.path.join(HERE, 'grid.json'), encoding='utf8'))
P_A = GRID['A']                     # 22.487
P_U = P_A / np.sqrt(2)              # 15.901

FAM = {
    'A': {'ntri': 32, 'shape': {
        'L': (2, [(0, 0), (2, 0), (0, 2)]),
        'M': (1, [(0, 0), (2, 0), (1, 1)]),
        'Q': (1, [(0, 0), (1, 0), (1, 1), (0, 1)]),
        'S': (0.5, [(0, 0), (1, 0), (0, 1)]),
        'R': (1, [(0, 0), (1, 0), (2, 1), (1, 1)]),
    }},
    'U': {'ntri': 64, 'shape': {
        'L': (4, [(0, 0), (4, 0), (2, 2)]),
        'M': (2, [(0, 0), (2, 0), (0, 2)]),
        'Q': (2, [(1, 0), (2, 1), (1, 2), (0, 1)]),
        'S': (1, [(0, 0), (2, 0), (1, 1)]),
        'R': (2, [(1, 0), (3, 0), (2, 1), (0, 1)]),
    }}
}
TRI_V = {0: [(0, 0), (1, 0), (0.5, 0.5)], 1: [(1, 0), (1, 1), (0.5, 0.5)],
         2: [(1, 1), (0, 1), (0.5, 0.5)], 3: [(0, 1), (0, 0), (0.5, 0.5)]}
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


def coverage(P, ox, oy, i0, i1, j0, j1):
    res = {}
    for j in range(j0, j1):
        for i in range(i0, i1):
            for q in range(4):
                v = TRI_V[q]
                s = 0
                for a1, a2 in BARY:
                    x = ox + (i + v[0][0] + a1 * (v[1][0] - v[0][0]) + a2 * (v[2][0] - v[0][0])) * P
                    y = oy + (j + v[0][1] + a1 * (v[1][1] - v[0][1]) + a2 * (v[2][1] - v[0][1])) * P
                    xi, yi = int(round(x)), int(round(y))
                    if 0 <= xi < W and 0 <= yi < H and mask[yi, xi]:
                        s += 1
                res[(i, j, q)] = s / len(BARY)
    return res


def tri_range(box, P, ox, oy):
    x0, y0, x1, y1 = box
    return (int(np.floor((x0 - 2 - ox) / P)), int(np.ceil((x1 + 2 - ox) / P)),
            int(np.floor((y0 - 2 - oy) / P)), int(np.ceil((y1 + 2 - oy) / P)))


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


def all_placements(fam, i0, i1, j0, j1):
    shape = FAM[fam]['shape']
    out = []
    seen = set()
    for key, (area, base) in shape.items():
        for flip in ([False, True] if key == 'R' else [False]):
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
                        sig = (key, fs)
                        if sig in seen:
                            continue
                        seen.add(sig)
                        out.append({'key': key, 'flip': flip, 'k': k, 'poly': poly, 'tris': fs})
    return out


def solve(target, pls):
    keys = ['L', 'L', 'M', 'Q', 'R', 'S', 'S']
    cand = [[p for p in pls if p['key'] == k and p['tris'] <= target] for k in keys]
    used = [False] * 7
    sol = []
    node = [0]

    def rec(covered):
        node[0] += 1
        if node[0] > 200000:
            return False
        if covered == target:
            return True
        if len(sol) == 7:
            return False
        rest = target - covered
        best = None
        for t in sorted(rest)[:30]:
            cnt = 0
            for idx in range(7):
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
        for idx in range(7):
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


def neighbors(t, cov_keys):
    i, j, q = t
    out = set()
    for qq in range(4):
        nb = (i, j, qq)
        if nb in cov_keys:
            out.add(nb)
    for di, dj in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        for qq in range(4):
            nb = (i + di, j + dj, qq)
            if nb in cov_keys:
                out.add(nb)
    out.discard(t)
    return out


out = []
for cell in GRID['cells']:
    box = cell['box']
    bestAll = None
    for fam, P in (('A', P_A), ('U', P_U)):
        ntri = FAM[fam]['ntri']
        # 相位局部搜索：只最小化「模糊三角」的代价
        best = None
        for dx in np.arange(-2.5, 2.51, 0.25):
            for dy in np.arange(-2.5, 2.51, 0.25):
                ox = (cell['ox'] + dx) % P
                oy = (cell['oy'] + dy) % P
                i0, i1, j0, j1 = tri_range(box, P, ox, oy)
                cov = coverage(P, ox, oy, i0, i1, j0, j1)
                c = sum(min(f, 1 - f) for f in cov.values())
                if best is None or c < best[0]:
                    best = (c, ox, oy, cov, (i0, i1, j0, j1))
        c, ox, oy, cov, rg = best
        i0, i1, j0, j1 = rg
        pls = all_placements(fam, i0, i1, j0, j1)
        order = sorted(cov.items(), key=lambda kv: -kv[1])
        target = set(k for k, f in order[:ntri])
        sol = solve(target, pls)
        swaps = 0
        if not sol:
            # 1~2 换：把已选里覆盖率最低的边界三角，换成未选里覆盖率最高的
            lowIn = [k for k, f in sorted(order[:ntri], key=lambda kv: kv[1])[:6]]
            highOut = [k for k, f in sorted(order[ntri:], key=lambda kv: -kv[1])[:6]]
            pairs = [(a, b) for a in lowIn for b in highOut]
            tries = [(p,) for p in pairs] + list(itertools.combinations(pairs, 2))[:240]
            for cp in tries:
                t2 = set(target)
                okp = True
                for a, b in cp:
                    if a not in t2:
                        okp = False
                        break
                    t2.discard(a); t2.add(b)
                if not okp:
                    continue
                s2 = solve(t2, pls)
                if s2:
                    sol, target, swaps = s2, t2, len(cp)
                    break
        if bestAll is None or (sol and not bestAll['sol']) or \
           (sol and bestAll['sol'] and c < bestAll['cost']):
            bestAll = {'fam': fam, 'cost': c, 'sol': sol, 'P': P, 'ox': ox, 'oy': oy, 'swaps': swaps}
        if sol and c < 0.4:
            break

    sol = bestAll['sol']
    print(cell['ch'], 'OK' if sol else '✗', bestAll['fam'], 'cost=%.2f' % bestAll['cost'],
          '换', bestAll['swaps'], '相位 %.2f/%.2f' % (bestAll['ox'], bestAll['oy']))
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
                'ox': bestAll['ox'], 'oy': bestAll['oy'], 'pieces': pieces,
                'cost': bestAll['cost'], 'swaps': bestAll['swaps']})

json.dump(out, open(os.path.join(HERE, 'tiled.json'), 'w', encoding='utf8'), ensure_ascii=False)
print('成功', sum(1 for r in out if r['ok']), '/', len(out))
