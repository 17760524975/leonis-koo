# 剪影驱动的精确覆盖：这是正路
#
# 之前的教训：逐块吸附是从「实测质心」出发，而质心误差 ±0.2 格、取整方向各自不同，
# 误差叠加就把字母拆散了（L 解出来是一堆散块）。而且 DFS 只要求「不重叠 + 占满 32 个小三角」，
# 没要求「连成字母」，所以能解出合法但不成字的摆法。
#
# 本脚本改为：
#   1) 用剪影外轮廓里的横/竖边拟合该字母的格点相位 (a, ox, oy)
#      —— 网格线必然压在这些边上，这是个一维最小二乘，很准
#   2) 按该格点算出剪影覆盖哪些「小三角」（每格切 4 个）
#   3) 用七巧板的 2L+2S+1Q+1M+1R 去精确覆盖这 32 个小三角
#      —— 覆盖成立，则拼出来的形状就等于剪影，必然是那个字母
#
# 输入 tools/letters7/outline.json + grid.json
# 输出 tools/letters7/fit4.json
import json, os, math

HERE = os.path.dirname(os.path.abspath(__file__))
GS = json.load(open(os.path.join(HERE, 'grid.json'), encoding='utf8'))
OUTL = {r['ch']: r for r in json.load(open(os.path.join(HERE, 'outline.json'), encoding='utf8'))}
CELL = {c['ch']: c for c in GS['cells']}

SHAPE = {
    'L': (2.0, [(0, 0), (2, 0), (0, 2)]),
    'M': (1.0, [(0, 0), (2, 0), (1, 1)]),
    'Q': (1.0, [(0, 0), (1, 0), (1, 1), (0, 1)]),
    'S': (0.5, [(0, 0), (1, 0), (0, 1)]),
    'R': (1.0, [(0, 0), (1, 0), (2, 1), (1, 1)]),
}
NEED = {'L': 2, 'S': 2, 'M': 1, 'Q': 1, 'R': 1}
TRI_V = {0: [(0, 0), (1, 0), (0.5, 0.5)], 1: [(1, 0), (1, 1), (0.5, 0.5)],
         2: [(1, 1), (0, 1), (0.5, 0.5)], 3: [(0, 1), (0, 0), (0.5, 0.5)]}
NODE_CAP = 400000


def rot90(p, k):
    c, s = [(1, 0), (0, 1), (-1, 0), (0, -1)][k]
    return [(c * x - s * y, s * x + c * y) for x, y in p]


# ---------- 剪影：点在内？ ----------
def in_ring(pt, poly):
    x, y = pt
    ins = False
    n = len(poly)
    for i in range(n):
        x1, y1 = poly[i]; x2, y2 = poly[(i + 1) % n]
        if (y1 > y) != (y2 > y):
            if x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
                ins = not ins
    return ins


def inside_sil(pt, rings):
    if not any(in_ring(pt, r['poly']) for r in rings if r['area'] > 0):
        return False
    for r in rings:
        if r['area'] < 0 and in_ring(pt, r['poly']):
            return False
    return True


def tri_sample(i, j, q, n=11):
    """小三角内的采样点（格点坐标，单位 a）"""
    v = TRI_V[q]
    cx = (v[0][0] + v[1][0] + v[2][0]) / 3
    cy = (v[0][1] + v[1][1] + v[2][1]) / 3
    pts = []
    for f in (0.0, 0.45, 0.8):
        for m in range(3 if f > 0 else 1):
            px = cx + (v[m][0] - cx) * f
            py = cy + (v[m][1] - cy) * f
            pts.append((px + i, py + j))
    return pts


# ---------- 拟合格点相位 ----------
def hv_edges(rings):
    segs = []
    for r in rings:
        p = r['poly']
        n = len(p)
        for i in range(n):
            x1, y1 = p[i]; x2, y2 = p[(i + 1) % n]
            dx = x2 - x1; dy = y2 - y1
            L = math.hypot(dx, dy)
            if L < 2.5:
                continue
            if abs(dx) < 0.28 * L:
                segs.append(('v', (x1 + x2) / 2, L))
            elif abs(dy) < 0.28 * L:
                segs.append(('h', (y1 + y2) / 2, L))
    return segs


def dist_lat(t, o, a):
    k = round((t - o) / a)
    return abs(t - (o + k * a))


def phase_cost(segs, a, ox, oy):
    # 注意：x 与 y 完全可分离，所以可以分别一维搜索，快两个数量级
    c = 0.0
    for kind, t, L in segs:
        d = dist_lat(t, ox if kind == 'v' else oy, a)
        c += L * d * d
    return c


def fit_frame(ch, rings):
    segs = hv_edges(rings)
    vs = [s for s in segs if s[0] == 'v']
    hs = [s for s in segs if s[0] == 'h']
    a0 = CELL[ch]['a']

    def scan1(lst, a):
        def cost(o):
            return sum(L * dist_lat(t, o, a) ** 2 for _, t, L in lst)
        bo, bc = 0.0, 1e18
        for k in range(40):                       # 粗扫
            o = k * a / 40.0
            c = cost(o)
            if c < bc:
                bc, bo = c, o
        for k in range(-20, 21):                  # 细扫
            o = bo + k * a / 400.0
            c = cost(o)
            if c < bc:
                bc, bo = c, o
        return bo, bc

    best = (1e18, None)
    for ai in range(-6, 7):
        a = a0 + ai * 0.1
        ox, cx_ = scan1(vs, a) if vs else (0.0, 0.0)
        oy, cy_ = scan1(hs, a) if hs else (0.0, 0.0)
        c = cx_ + cy_
        if c < best[0]:
            best = (c, (a, ox % a, oy % a))
    return best[1], best[0], len(segs)


# ---------- 精确覆盖 ----------
def build_placements(S, bbox):
    """所有落在 S 里的摆放（每个板型 × 朝向 × 手性 × 平移）"""
    i0, j0, i1, j1 = bbox
    out = {}
    for key, (ar, base) in SHAPE.items():
        need = int(round(ar * 4))
        lst = []
        for flip in ([False, True] if key == 'R' else [False]):
            b = [(-x, y) for x, y in base] if flip else base
            for k in range(4):
                sh = rot90(b, k)
                xs = [v[0] for v in sh]; ys = [v[1] for v in sh]
                for tx in range(i0 - int(min(xs)), i1 - int(max(xs)) + 2):
                    for ty in range(j0 - int(min(ys)), j1 - int(max(ys)) + 2):
                        poly = [(x + tx, y + ty) for x, y in sh]
                        tr = frozenset(tris_in_poly(poly))
                        if len(tr) != need or not tr <= S:
                            continue
                        lst.append((tr, poly))
        # 去重（正方形 4 个旋转等价）
        seen = set(); uniq = []
        for tr, poly in lst:
            if tr in seen:
                continue
            seen.add(tr); uniq.append((tr, poly))
        out[key] = uniq
    return out


def tris_in_poly(poly):
    xs = [v[0] for v in poly]; ys = [v[1] for v in poly]
    res = []
    for j in range(int(min(ys)), int(max(ys)) + 1):
        for i in range(int(min(xs)), int(max(xs)) + 1):
            for q in range(4):
                v = TRI_V[q]
                cx = (v[0][0] + v[1][0] + v[2][0]) / 3 + i
                cy = (v[0][1] + v[1][1] + v[2][1]) / 3 + j
                if in_ring((cx, cy), poly):
                    res.append((i, j, q))
    return res


def exact_cover(S, pls):
    counts = dict(NEED)
    nodes = [0]

    def dfs(remaining, chosen):
        nodes[0] += 1
        if nodes[0] > NODE_CAP:
            return None
        if not remaining:
            # 只有 7 块全部用掉才算成功；返回 chosen（非空）作为成功信号，
            # 千万别返回 []，那在 if got: 里是假值
            return chosen if not any(counts.values()) else None
        t = min(remaining)
        for key in ('L', 'M', 'Q', 'S', 'R'):
            if counts[key] <= 0:
                continue
            for tr, poly in pls[key]:
                if t not in tr or not tr <= remaining:
                    continue
                counts[key] -= 1
                r = dfs(remaining - tr, chosen + [(key, poly)])
                counts[key] += 1
                if r is not None:
                    return r
        return None

    return dfs(frozenset(S), []), nodes[0]


def solve_letter(ch):
    rec = OUTL[ch]
    rings = rec['rings']
    (a, ox, oy), cost, nseg = fit_frame(ch, rings)

    # 覆盖候选小三角：按 7 个采样点里在剪影内的比例
    box = rec['box']
    i0 = int(math.floor((box[0] - ox) / a)) - 1
    i1 = int(math.ceil((box[2] - ox) / a)) + 1
    j0 = int(math.floor((box[1] - oy) / a)) - 1
    j1 = int(math.ceil((box[3] - oy) / a)) + 1

    tr_f = {}
    for j in range(j0, j1):
        for i in range(i0, i1):
            for q in range(4):
                pts = tri_sample(i, j, q)
                hit = 0
                for px, py in pts:
                    if inside_sil((px * a + ox, py * a + oy), rings):
                        hit += 1
                f = hit / len(pts)
                if f >= 0.35:
                    tr_f[(i, j, q)] = f

    full = {t for t, f in tr_f.items() if f >= 0.5}
    bbox = (i0, j0, i1, j1)

    # 恰好 32 个：直接精确覆盖
    tries = []
    if len(full) == 32:
        tries.append(full)
    elif len(full) > 32:
        # 从覆盖率最低的边界三角里剔掉多余的（最多 3 个）
        low = sorted(full, key=lambda t: tr_f[t])
        extra = len(full) - 32
        if extra <= 3:
            import itertools
            for combo in itertools.combinations(low[:min(6, len(low))], extra):
                tries.append(full - set(combo))
    if not tries:
        return None, '三角数 %d（覆盖率>=0.5），无法凑 32' % len(full)

    for S in tries:
        pls = build_placements(frozenset(S), bbox)
        if any(not pls[k] for k in NEED):
            continue
        got, nodes = exact_cover(frozenset(S), pls)
        if got:
            return {'ok': True, 'a': round(a, 4), 'ox': round(ox, 3), 'oy': round(oy, 3),
                    'cost': round(cost, 1), 'nseg': nseg, 'nodes': nodes,
                    'pieces': [{'key': k, 'poly': [[int(x), int(y)] for x, y in poly]}
                               for k, poly in got]}, None
    return None, '精确覆盖无解（满 %d 个三角）' % len(full)


res = []
for ch in sorted(OUTL):
    r, err = solve_letter(ch)
    if r is None:
        print(ch, '✗', err)
        res.append({'ch': ch, 'ok': False, 'err': err})
    else:
        print(ch, 'OK  a=%.2f ox=%.1f oy=%.1f cost=%.0f 节点=%d' % (r['a'], r['ox'], r['oy'], r['cost'], r['nodes']))
        res.append({'ch': ch, **r})

json.dump(res, open(os.path.join(HERE, 'fit4.json'), 'w', encoding='utf8'), ensure_ascii=False)
print('成功', sum(1 for r in res if r.get('ok')), '/', len(res))
