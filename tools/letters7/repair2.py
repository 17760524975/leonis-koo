# 逐块修复 v2：形状分配 + 吸附 + 有界 DFS
#
# 参考图是插画，个别字母有「同色相邻 / 画得不严」的问题（A 的品红大三角被橙色压了一点），
# 所以「按剪影严格可拼」这条路走不通。但每块板本身量得很准：
#   面积严格是 2,2,1,1,1,0.5,0.5（a²），朝向由 IoU 拟合，质心由对称性准确。
# 于是：形状分配（必须凑够 2L+2S+1M+1Q+1R）→ 吸附到格点 → 有界 DFS 修掉重叠/缝隙。
#
# 输出 tools/letters7/tiled2.json
import json, os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
im = Image.open(os.path.join(HERE, 'ref.webp')).convert('RGB')
W, H = im.size
GRID = json.load(open(os.path.join(HERE, 'grid.json'), encoding='utf8'))
P = GRID['A']

SHAPE = {
    'L': (2, [(0, 0), (2, 0), (0, 2)]),
    'M': (1, [(0, 0), (2, 0), (1, 1)]),
    'Q': (1, [(0, 0), (1, 0), (1, 1), (0, 1)]),
    'S': (0.5, [(0, 0), (1, 0), (0, 1)]),
    'R': (1, [(0, 0), (1, 0), (2, 1), (1, 1)]),
}
NEED = {'L': 2, 'S': 2, 'M': 1, 'Q': 1, 'R': 1}
TRI_V = {0: [(0, 0), (1, 0), (0.5, 0.5)], 1: [(1, 0), (1, 1), (0.5, 0.5)],
         2: [(1, 1), (0, 1), (0.5, 0.5)], 3: [(0, 1), (0, 0), (0.5, 0.5)]}


def rot90(p, k):
    c, s = [(1, 0), (0, 1), (-1, 0), (0, -1)][k]
    return [(c * x - s * y, s * x + c * y) for x, y in p]


def poly_area(p):
    a = 0.0
    for i in range(len(p)):
        x1, y1 = p[i]; x2, y2 = p[(i + 1) % len(p)]
        a += x1 * y2 - x2 * y1
    return a / 2


def centroid(p):
    Q = [tuple(v) for v in (p if poly_area(p) > 0 else p[::-1])]
    a = 0.0; cx = 0.0; cy = 0.0
    for i in range(len(Q)):
        q = Q[(i + 1) % len(Q)]
        cr = Q[i][0] * q[1] - q[0] * Q[i][1]
        a += cr; cx += (Q[i][0] + q[0]) * cr; cy += (Q[i][1] + q[1]) * cr
    a /= 2
    return (cx / (6 * a), cy / (6 * a))


def clip_convex(a, b):
    def ccw(p):
        return p if poly_area(p) > 0 else p[::-1]
    out = [tuple(v) for v in ccw([tuple(v) for v in a])]
    B = [tuple(v) for v in ccw([tuple(v) for v in b])]
    for i in range(len(B)):
        p1, p2 = B[i], B[(i + 1) % len(B)]
        side = lambda v: (p2[0] - p1[0]) * (v[1] - p1[1]) - (p2[1] - p1[1]) * (v[0] - p1[0])
        inp, out = out, []
        for j in range(len(inp)):
            cur, nxt = inp[j], inp[(j + 1) % len(inp)]
            sc, sn = side(cur), side(nxt)
            if sc >= -1e-12:
                out.append(cur)
            if (sc > 1e-12 and sn < -1e-12) or (sc < -1e-12 and sn > 1e-12):
                t = sc / (sc - sn)
                out.append((cur[0] + (nxt[0] - cur[0]) * t, cur[1] + (nxt[1] - cur[1]) * t))
        if not out:
            break
    return out


def iou(A, B):
    c = clip_convex(A, B)
    inter = abs(poly_area(c)) if len(c) >= 3 else 0.0
    uni = abs(poly_area(A)) + abs(poly_area(B)) - inter
    return inter / uni if uni > 0 else 0.0


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


def tris_of(poly):
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


def shape_poly(key, k, flip, tx, ty):
    _, base = SHAPE[key]
    b = [(-x, y) for x, y in base] if flip else base
    return [(x + tx, y + ty) for x, y in rot90(b, k)]


def options(hull):
    H_ = [tuple(v) for v in hull]
    cH = centroid(H_); aH = abs(poly_area(H_))
    res = []
    for key, (ar, base) in SHAPE.items():
        for flip in ([False, True] if key == 'R' else [False]):
            b = [(-x, y) for x, y in base] if flip else base
            for k in range(4):
                sh = rot90(b, k)
                cS = centroid(sh)
                s = np.sqrt(aH / ar)
                placed = [(cH[0] + (v[0] - cS[0]) * s, cH[1] + (v[1] - cS[1]) * s) for v in sh]
                res.append((iou(placed, H_), key, k, flip, cH, cS))
    res.sort(key=lambda z: -z[0])
    return res


data = json.load(open(os.path.join(HERE, 'pieces.json'), encoding='utf8'))
out = []
for rec in data:
    ps = sorted(rec['pieces'], key=lambda p: -p['n'])[:7]
    opts = [options(p['hull']) for p in ps]

    allAssign = []

    def assign(i, cnt, acc, score):
        if i == 7:
            if all(cnt.get(k, 0) == NEED[k] for k in NEED):
                allAssign.append((score, acc[:]))
            return
        seen = set()
        for (q, key, k, flip, cH, cS) in opts[i][:5]:
            if cnt.get(key, 0) >= NEED[key]:
                continue
            sig = (key, k, flip)
            if sig in seen:
                continue
            seen.add(sig)
            cnt[key] = cnt.get(key, 0) + 1
            acc.append((q, key, k, flip, cH, cS))
            assign(i + 1, cnt, acc, score + q)
            acc.pop()
            cnt[key] -= 1

    assign(0, {}, [], 0.0)
    allAssign.sort(key=lambda z: -z[0])
    if not allAssign:
        print(rec['ch'], '✗ 形状凑不齐')
        out.append({'ch': rec['ch'], 'ok': False})
        continue

    def try_assign(asg):
      basePl = []
      for (q, key, k, flip, cH, cS) in asg:
        tx = int(round(cH[0] / P - cS[0])); ty = int(round(cH[1] / P - cS[1]))
        basePl.append({'key': key, 'k': k, 'flip': flip, 'tx': tx, 'ty': ty})

    cands = []
    for b in basePl:
        cc = []
        for dk in (0, 1, 2, 3):
            for dx in (0, -1, 1):
                for dy in (0, -1, 1):
                    poly = shape_poly(b['key'], (b['k'] + dk) % 4, b['flip'], b['tx'] + dx, b['ty'] + dy)
                    t = tris_of(poly)
                    if len(t) != int(SHAPE[b['key']][0] * 4):
                        continue
                    cc.append({'key': b['key'], 'flip': b['flip'], 'k': (b['k'] + dk) % 4,
                               'poly': poly, 'tris': frozenset(t),
                               'off': abs(dx) + abs(dy) + (0 if dk == 0 else 1)})
        uniq = {}
        for c in cc:
            sig = (c['key'], c['tris'])
            if sig not in uniq or c['off'] < uniq[sig]['off']:
                uniq[sig] = c
        cands.append(sorted(uniq.values(), key=lambda c: c['off'])[:10])

    order = sorted(range(7), key=lambda x: (len(cands[x]), -SHAPE[basePl[x]['key']][0]))
    nodes = [0]
    best = [None, 1e9]

    def dfs(idx, covered, chosen, off):
        nodes[0] += 1
        if nodes[0] > 400000 or off >= best[1]:
            return
        if idx == 7:
            if len(covered) == 32 and off < best[1]:
                best[0] = chosen[:]; best[1] = off
            return
        i = order[idx]
        for c in cands[i]:
            if c['tris'] & covered:
                continue
            chosen.append(c)
            dfs(idx + 1, covered | c['tris'], chosen, off + c['off'])
            chosen.pop()

    dfs(0, frozenset(), [], 0)
    if not best[0]:
        print(rec['ch'], '✗ DFS 无解', '节点', nodes[0])
        out.append({'ch': rec['ch'], 'ok': False})
        continue
    chosen = best[0]
    print(rec['ch'], 'OK 偏移', best[1], '节点', nodes[0],
          ' '.join(c['key'] + '@' + str(c['k'] * 90) + ('F' if c['flip'] else '') for c in chosen))
    out.append({'ch': rec['ch'], 'ok': True, 'P': P,
                'pieces': [{'key': c['key'], 'k': c['k'], 'flip': c['flip'], 'poly': c['poly']}
                           for c in chosen]})

json.dump(out, open(os.path.join(HERE, 'tiled2.json'), 'w', encoding='utf8'), ensure_ascii=False)
print('成功', sum(1 for r in out if r['ok']), '/', len(out))
