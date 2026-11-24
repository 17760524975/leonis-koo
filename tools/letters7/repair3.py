# 逐块修复 v3：面积定「板型档位」→ 形状分配 → 格点吸附 → 有界 DFS 拼满 32 个小三角
#
# v2 的教训：options() 里用 s=sqrt(aH/ar) 把候选缩放到与凸包同面积再算 IoU，
# 于是大三角 L 和小三角 S（都是等腰直角三角形）缩完完全重合，IoU 一模一样，
# 「L 还是 S」这个信息被自己抹掉了 —— H 就是因为这个凑不齐形状。
# v3 改成：候选按格点实际尺寸摆放（不缩放），面积差自然体现在 IoU 上；
# 再用「像素面积 / P²」给每块板预筛板型档位（L=2, M/Q/R=1, S=0.5），
# 既快又不会被相邻同色块带偏。
#
# 输入 tools/letters7/pieces.json + grid.json
# 输出 tools/letters7/tiled3.json
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
GRID = json.load(open(os.path.join(HERE, 'grid.json'), encoding='utf8'))
P = GRID['A']                      # 格点间距 a（像素），全图统一 22.487

# 板型，坐标单位 = a（格点），面积 = ar * a²
SHAPE = {
    'L': (2,   [(0, 0), (2, 0), (0, 2)]),        # 大三角
    'M': (1,   [(0, 0), (2, 0), (1, 1)]),        # 中三角
    'Q': (1,   [(0, 0), (1, 0), (1, 1), (0, 1)]),  # 正方形
    'S': (0.5, [(0, 0), (1, 0), (0, 1)]),        # 小三角
    'R': (1,   [(0, 0), (1, 0), (2, 1), (1, 1)]),  # 平行四边形
}
NEED = {'L': 2, 'S': 2, 'M': 1, 'Q': 1, 'R': 1}
# 每个格点切成 4 个小三角（N/E/S/W），板边只落在这些边上，所以「占多少小三角」= 4*面积
TRI_V = {0: [(0, 0), (1, 0), (0.5, 0.5)], 1: [(1, 0), (1, 1), (0.5, 0.5)],
         2: [(1, 1), (0, 1), (0.5, 0.5)], 3: [(0, 1), (0, 0), (0.5, 0.5)]}

MAX_ASSIGN = 8        # 每个字母最多尝试几种形状分配
NODE_CAP = 300000     # 单次 DFS 节点上限


# ---------- 几何工具 ----------
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


def ccw(p):
    return p if poly_area(p) > 0 else p[::-1]


def clip_convex(a, b):
    out = [tuple(v) for v in ccw([tuple(v) for v in a])]
    B = [tuple(v) for v in ccw([tuple(v) for v in b])]
    for i in range(len(B)):
        p1, p2 = B[i], B[(i + 1) % len(B)]

        def side(v, p1=p1, p2=p2):
            return (p2[0] - p1[0]) * (v[1] - p1[1]) - (p2[1] - p1[1]) * (v[0] - p1[0])

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


def tris_of(poly, nx0=None, nx1=None, ny0=None, ny1=None):
    xs = [v[0] for v in poly]; ys = [v[1] for v in poly]
    if nx0 is None:
        nx0, nx1 = int(min(xs)) - 1, int(max(xs)) + 2
        ny0, ny1 = int(min(ys)) - 1, int(max(ys)) + 2
    out = set()
    for j in range(ny0, ny1):
        for i in range(nx0, nx1):
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


# ---------- 每块板的候选板型（按面积定档，按 IoU 定向） ----------
def options(hull, area_a2):
    """返回 [(iou, key, k, flip, cH)]，按 IoU 降序。候选按格点尺寸摆放，不缩放。"""
    Hh = [tuple(v) for v in hull]
    cH = centroid(Hh)
    res = []
    for key, (ar, base) in SHAPE.items():
        # 面积档位预筛：像素面积允许偏小 25%（板间白缝会吃掉边界像素）
        if abs(area_a2 / ar - 1.0) > 0.28:
            continue
        for flip in ([False, True] if key == 'R' else [False]):
            b = [(-x, y) for x, y in base] if flip else base
            for k in range(4):
                sh = rot90(b, k)
                cS = centroid(sh)
                placed = [(cH[0] + (v[0] - cS[0]) * P, cH[1] + (v[1] - cS[1]) * P) for v in sh]
                res.append((iou(placed, Hh), key, k, flip, cH, cS))
    res.sort(key=lambda z: -z[0])
    return res


def solve_letter(ch, pieces):
    ps = sorted(pieces, key=lambda p: -p['n'])[:7]
    opts = [options(p['hull'], p['n'] / (P * P)) for p in ps]
    for i, o in enumerate(opts):
        if not o:
            print('  ', ch, '块%d 无候选板型' % i)
            return None

    # 每个板型只保留最优的那个旋转：正方形 4 个旋转几何上完全等价，
    # 若按 (key,k,flip) 去重会白占掉 4 个名额，把 M/R 挤出候选名单。
    shapeBest = []
    for o in opts:
        m = {}
        for (q, key, k, flip, cH, cS) in o:
            if key not in m or q > m[key][0]:
                m[key] = (q, key, k, flip, cH, cS)
        shapeBest.append(sorted(m.values(), key=lambda z: -z[0])[:6])

    # --- 枚举形状分配：每块挑一个板型，总共必须凑够 2L+2S+1M+1Q+1R ---
    assigns = []

    def walk(i, cnt, acc, score):
        if len(assigns) > 400:
            return
        if i == 7:
            if all(cnt.get(k, 0) == NEED[k] for k in NEED):
                assigns.append((score, acc[:]))
            return
        seen = set()
        for (q, key, k, flip, cH, cS) in shapeBest[i]:
            if cnt.get(key, 0) >= NEED[key]:
                continue
            sig = (key, k, flip)
            if sig in seen:
                continue
            seen.add(sig)
            cnt[key] = cnt.get(key, 0) + 1
            acc.append((q, key, k, flip, cH, cS))
            walk(i + 1, cnt, acc, score + q)
            acc.pop()
            cnt[key] -= 1

    walk(0, {}, [], 0.0)
    assigns.sort(key=lambda z: -z[0])
    if not assigns:
        print('  ', ch, '✗ 形状凑不齐')
        return None

    # --- 逐个分配试 DFS ---
    for ai, (score, asg) in enumerate(assigns[:MAX_ASSIGN]):
        got = try_assign(asg)
        if got:
            got['assignIdx'] = ai
            got['assignScore'] = round(score, 3)
            return got
    print('  ', ch, '✗ %d 种分配全部 DFS 无解' % min(len(assigns), MAX_ASSIGN))
    return None


def try_assign(asg):
    cands = []
    for (q, key, k0, flip0, cH, cS0) in asg:
        ar = SHAPE[key][0]
        need_t = int(round(ar * 4))
        cc = []
        for dk in range(4):
            for dfl in ([0, 1] if key == 'R' else [0]):
                fl = flip0 ^ bool(dfl)
                sh = rot90([(-x, y) for x, y in SHAPE[key][1]] if fl else SHAPE[key][1], (k0 + dk) % 4)
                cS = centroid(sh)      # 每次旋转都要重算质心，否则平移量全错
                tx = int(round(cH[0] / P - cS[0]))
                ty = int(round(cH[1] / P - cS[1]))
                for dx in (0, -1, 1):
                    for dy in (0, -1, 1):
                        poly = [(x + tx + dx, y + ty + dy) for x, y in sh]
                        t = tris_of(poly)
                        if len(t) != need_t:
                            continue
                        cc.append({'key': key, 'k': (k0 + dk) % 4, 'flip': fl,
                                   'poly': poly, 'tris': frozenset(t),
                                   'off': abs(dx) + abs(dy) + dk + dfl})
        uniq = {}
        for c in cc:
            sig = (c['key'], c['flip'], c['tris'])
            if sig not in uniq or c['off'] < uniq[sig]['off']:
                uniq[sig] = c
        lst = sorted(uniq.values(), key=lambda c: c['off'])[:10]
        if not lst:
            return None
        cands.append(lst)

    # 先摆难摆的（候选少的、面积大的），剪枝更狠
    order = sorted(range(7), key=lambda x: (len(cands[x]), -SHAPE[asg[x][1]][0]))
    nodes = [0]
    best = [None, 10 ** 9]

    def dfs(idx, covered, chosen, off):
        nodes[0] += 1
        if nodes[0] > NODE_CAP or off >= best[1]:
            return
        if idx == 7:
            if len(covered) == 32:
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
        return None
    return {'ok': True, 'P': P, 'off': best[1], 'nodes': nodes[0],
            'pieces': [{'key': c['key'], 'k': c['k'], 'flip': c['flip'], 'poly': c['poly']}
                       for c in best[0]]}


data = json.load(open(os.path.join(HERE, 'pieces.json'), encoding='utf8'))
out = []
for rec in data:
    r = solve_letter(rec['ch'], rec['pieces'])
    if r is None:
        out.append({'ch': rec['ch'], 'ok': False})
        continue
    print(rec['ch'], 'OK 偏移', r['off'], '节点', r['nodes'], '分配#%d' % r['assignIdx'],
          ' '.join(c['key'] + '@' + str(c['k'] * 90) + ('F' if c['flip'] else '') for c in r['pieces']))
    out.append({'ch': rec['ch'], **r})

json.dump(out, open(os.path.join(HERE, 'tiled3.json'), 'w', encoding='utf8'), ensure_ascii=False)
okn = sum(1 for r in out if r.get('ok'))
print('成功', okn, '/', len(out))
