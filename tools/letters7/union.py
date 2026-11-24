# 解析求 7 块板的并集外边界（轮廓 + 字怀内孔）
#
# 为什么不能用栅格描边：校验器要求「轮廓面积 vs 7 块板总面积」误差 < 0.1%，
# 而栅格 + RDP 的误差在 0.3% 量级。板都是凸多边形、边只会两两相交，
# 所以可以精确做：把所有边按交点打碎 → 丢掉落在别的板内部或贴着别的板边的碎段
# （内部接缝两侧各有一段、方向相反，全部丢掉正好）→ 剩下的首尾相接成环。

EPS = 1e-9
import math


def _pt(p):
    return (float(p[0]), float(p[1]))


def _ccw(poly):
    s = 0.0
    n = len(poly)
    for i in range(n):
        x1, y1 = poly[i]; x2, y2 = poly[(i + 1) % n]
        s += x1 * y2 - x2 * y1
    return list(poly) if s > 0 else list(poly)[::-1]


def _seg_param(p, q, r):
    """点 r 在段 pq 上的参数 t（假设共线）"""
    dx, dy = q[0] - p[0], q[1] - p[1]
    L2 = dx * dx + dy * dy
    if L2 < EPS:
        return 0.0
    return ((r[0] - p[0]) * dx + (r[1] - p[1]) * dy) / L2


def _inter(a, b, c, d):
    """线段 ab 与 cd 的交点参数 (t1, t2)；无交点返回 None"""
    r = (b[0] - a[0], b[1] - a[1])
    s = (d[0] - c[0], d[1] - c[1])
    den = r[0] * s[1] - r[1] * s[0]
    if abs(den) < 1e-12:
        return None
    qp = (c[0] - a[0], c[1] - a[1])
    t1 = (qp[0] * s[1] - qp[1] * s[0]) / den
    t2 = (qp[0] * r[1] - qp[1] * r[0]) / den
    if -1e-9 <= t1 <= 1 + 1e-9 and -1e-9 <= t2 <= 1 + 1e-9:
        return (min(1.0, max(0.0, t1)), min(1.0, max(0.0, t2)))
    return None


def _in_poly(pt, poly):
    x, y = pt
    ins = False
    n = len(poly)
    for i in range(n):
        x1, y1 = poly[i]; x2, y2 = poly[(i + 1) % n]
        if (y1 > y) != (y2 > y):
            if x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
                ins = not ins
    return ins


def _dist_poly_boundary(pt, poly):
    best = 1e18
    for i in range(len(poly)):
        a = poly[i]; b = poly[(i + 1) % len(poly)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        L2 = dx * dx + dy * dy
        if L2 < EPS:
            continue
        t = max(0.0, min(1.0, ((pt[0] - a[0]) * dx + (pt[1] - a[1]) * dy) / L2))
        qx, qy = a[0] + dx * t, a[1] + dy * t
        d = math.hypot(pt[0] - qx, pt[1] - qy)
        if d < best:
            best = d
    return best


def union_boundary(polys, tol=0.45):
    n = len(polys)
    P = [_ccw([_pt(v) for v in p]) for p in polys]

    # 1) 每条边按与其他板边的交点打碎
    subs = []
    for i in range(n):
        poly = P[i]
        for k in range(len(poly)):
            a, b = poly[k], poly[(k + 1) % len(poly)]
            ts = [0.0, 1.0]
            for j in range(n):
                if j == i:
                    continue
                Q = P[j]
                for m in range(len(Q)):
                    r = _inter(a, b, Q[m], Q[(m + 1) % len(Q)])
                    if r:
                        ts.append(r[0])
            ts = sorted(set(round(t, 9) for t in ts))
            for u, v in zip(ts, ts[1:]):
                if v - u < 1e-7:
                    continue
                p = (a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u)
                q = (a[0] + (b[0] - a[0]) * v, a[1] + (b[1] - a[1]) * v)
                subs.append((i, p, q))

    # 2) 丢掉落在别的板内部、或贴着别的板边的碎段
    keep = []
    for (i, p, q) in subs:
        mid = ((p[0] + q[0]) / 2, (p[1] + q[1]) / 2)
        covered = False
        for j in range(n):
            if j == i:
                continue
            Q = P[j]
            if _in_poly(mid, Q) or _dist_poly_boundary(mid, Q) < tol:
                covered = True
                break
        if not covered:
            keep.append((p, q))

    # 3) 首尾相接成环
    def key(pt):
        return (round(pt[0], 4), round(pt[1], 4))

    from collections import defaultdict
    starts = defaultdict(list)
    for idx, (p, q) in enumerate(keep):
        starts[key(p)].append(idx)
    used = [False] * len(keep)
    loops = []
    for idx in range(len(keep)):
        if used[idx]:
            continue
        loop = []
        cur = idx
        while True:
            used[cur] = True
            p, q = keep[cur]
            loop.append(p)
            nxt = None
            for cand in starts.get(key(q), []):
                if not used[cand]:
                    nxt = cand
                    break
            if nxt is None:
                break
            cur = nxt
        if len(loop) >= 3:
            loops.append(loop)
    return loops
