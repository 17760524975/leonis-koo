# a/U 格精确覆盖（v5）：目标 = 「最接近参考图、且确实能拼」的 32/64 个小三角集合
#
# 参考图是插画，个别字母会多/少 1 个小三角（实测 N 是 33 个），那条缝里的面积对不上
# 七巧板的 8a²。于是：
#   核心集 core = 覆盖率 > 0.5 的小三角；若 |core| 与 ntri 差 k 个，就枚举
#   「去掉 k 个核心里的」/「补上 k 个核心外的」组合，逐个交给精确覆盖求解，
#   取「能拼且与参考图差最小」的那个。差的距离用
#       dist = Σ_{选中}(1-f) + Σ_{未选} f
#   度量（等价于对称差面积的期望值）。
#
# 输出 tools/letters7/tiled.json
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

GRID = json.load(open(os.path.join(HERE, 'grid.json'), encoding='utf8'))
P_A = GRID['A']
P_U = P_A / np.sqrt(2)

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
    out, seen = [], set()
    for key, (area, base) in shape.items():
        for flip in ([False, True] if key == 'R' else [False]):
            b = [(-x, y) for x, y in base] if flip else base
            for k in range(4):
                sh = rot90(b, k)
                xs = [v[0] for v in sh]; ys = [v[1] for v in sh]
                for ty in range(j0 - 1 - int(min(ys)), j1 + 2 - int(max(ys))):
                    for tx in range(i0 - 1 - int(min(xs)), i1 + 2 - int(max(xs))):
                        poly = [(x + tx, y + ty) for x, y in sh]
                        t = tris_of_poly(poly)
                        if len(t) != int(area * 4):
                            continue
                        fs = frozenset(t)
                        if (key, fs) in seen:
                            continue
                        seen.add((key, fs))
                        out.append({'key': key, 'flip': flip, 'k': k, 'poly': poly, 'tris': fs})
    return out


def solve(target, pls, budget=120000):
    keys = ['L', 'L', 'M', 'Q', 'R', 'S', 'S']
    cand = [[p for p in pls if p['key'] == k and p['tris'] <= target] for k in keys]
    used = [False] * 7
    sol = []
    node = [0]

    def rec(covered):
        node[0] += 1
        if node[0] > budget:
            return False
        if covered == target:
            return True
        if len(sol) == 7:
            return False
        rest = target - covered
        best = None
        for t in sorted(rest)[:26]:
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


def distance(tgt, cov):
    return sum(1 - cov[t] for t in tgt) + sum(f for t, f in cov.items() if t not in tgt)


out = []
for cell in GRID['cells']:
    box = cell['box']
    bestAll = None
    for fam, P in (('A', P_A), ('U', P_U)):
        ntri = FAM[fam]['ntri']
        # 相位：粗扫取前 4 个
        cands = []
        for dx in np.arange(-2.5, 2.51, 0.5):
            for dy in np.arange(-2.5, 2.51, 0.5):
                ox = (cell['ox'] + dx) % P
                oy = (cell['oy'] + dy) % P
                i0, i1, j0, j1 = tri_range(box, P, ox, oy)
                cov = coverage(P, ox, oy, i0, i1, j0, j1)
                c = sum(min(f, 1 - f) for f in cov.values())
                cands.append((c, ox, oy, cov, (i0, i1, j0, j1)))
        cands.sort(key=lambda z: z[0])
        for c, ox, oy, cov, rg in cands[:4]:
            i0, i1, j0, j1 = rg
            pls = all_placements(fam, i0, i1, j0, j1)
            core = set(t for t, f in cov.items() if f > 0.5)
            diff = len(core) - ntri
            targets = []
            if diff == 0:
                targets = [core]
            elif diff > 0:
                if diff <= 2:
                    for rm in itertools.combinations(sorted(core, key=lambda t: cov[t])[:6], diff):
                        targets.append(core - set(rm))
            else:
                extra = sorted([t for t in cov if t not in core], key=lambda t: -cov[t])[:8]
                if -diff <= 2:
                    for ad in itertools.combinations(extra, -diff):
                        targets.append(core | set(ad))
            # 再补一批「换一个」的目标
            lowIn = sorted(core, key=lambda t: cov[t])[:5]
            highOut = sorted([t for t in cov if t not in core], key=lambda t: -cov[t])[:5]
            for a in lowIn:
                for b in highOut:
                    targets.append((core - {a}) | {b})

            for tgt in targets[:60]:
                if len(tgt) != ntri:
                    continue
                sol = solve(tgt, pls)
                if not sol:
                    continue
                d = distance(tgt, cov)
                if bestAll is None or d < bestAll['dist']:
                    bestAll = {'fam': fam, 'cost': c, 'sol': sol, 'P': P, 'ox': ox, 'oy': oy,
                               'dist': d, 'target': tgt}
            if bestAll:
                break
        if bestAll and bestAll['dist'] <= 0.5:
            break

    if not bestAll:
        print(cell['ch'], '✗ 完全拼不出')
        out.append({'ch': cell['ch'], 'ok': False})
        continue
    pieces = []
    for s in bestAll['sol']:
        p = s['p']
        pieces.append({'key': p['key'], 'flip': p['flip'], 'k': p['k'], 'poly': p['poly']})
    print(cell['ch'], 'OK', bestAll['fam'], 'cost=%.2f' % bestAll['cost'],
          'dist=%.2f' % bestAll['dist'], '相位 %.2f/%.2f' % (bestAll['ox'], bestAll['oy']))
    out.append({'ch': cell['ch'], 'ok': True, 'fam': bestAll['fam'], 'P': bestAll['P'],
                'ox': bestAll['ox'], 'oy': bestAll['oy'], 'pieces': pieces,
                'dist': bestAll['dist'], 'cost': bestAll['cost']})

json.dump(out, open(os.path.join(HERE, 'tiled.json'), 'w', encoding='utf8'), ensure_ascii=False)
print('成功', sum(1 for r in out if r['ok']), '/', len(out))
