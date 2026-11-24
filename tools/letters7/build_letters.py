# 26 个字母 → 七巧板关卡数据
#
# 口径（由现有 ch1 关卡反推确认）：
#   · 七块板总面积恒为 16u² × 96² = 147456（世界单位²）
#   · outline 面积必须等于它，且 7 块板要严丝合缝铺满 outline
#   · solution 每项 {id, x, y, angle, flipped}，x/y 是质心的世界坐标，angle 是 45° 倍数
#
# 做法：
#   1) 每块板的板型与朝向从实测色块量（面积定档：2/2/1/1/1/0.5/0.5；朝向往 45° 倍数上靠）
#   2) 按实测质心摆放，做松弛把板间白缝收掉（过近的拉近、重叠的推开）
#   3) outline 取 7 块板的并集，所以关卡必然可解（铺满 outline 的解就是这 7 块板）
#
# 输入 tools/letters7/{pieces.json, outline.json, grid.json}
# 输出 tools/letters7/letters_levels.json
import json, os, math, sys
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')

PJ = {r['ch']: r for r in json.load(open(os.path.join(HERE, 'pieces.json'), encoding='utf8'))}
OUTL = {r['ch']: r for r in json.load(open(os.path.join(HERE, 'outline.json'), encoding='utf8'))}

UNIT = 96.0            # 世界像素 / u
WORLD_AREA = 16 * UNIT * UNIT      # 147456
CENTER = (500.0, 500.0)

# 板型（单位 a，a = √2 u）：面积 a² 数 & 顶点
SH = {
    'L': (2.0,  [(0, 0), (2, 0), (0, 2)]),          # 大三角
    'M': (1.0,  [(0, 0), (2, 0), (1, 1)]),          # 中三角
    'Q': (1.0,  [(0, 0), (1, 0), (1, 1), (0, 1)]),  # 正方形
    'S': (0.5,  [(0, 0), (1, 0), (0, 1)]),          # 小三角
    'R': (1.0,  [(0, 0), (1, 0), (2, 1), (1, 1)]),  # 平行四边形
}
NEED = {'L': 2, 'S': 2, 'M': 1, 'Q': 1, 'R': 1}

# 游戏里的板型 base（单位 u），用于反解 id/angle/flipped
GAME = {
    'T1': [(0, 0), (4, 0), (2, 2)],
    'T2': [(0, 0), (4, 0), (2, 2)],
    'T3': [(0, 0), (2, 0), (0, 2)],
    'S':  [(1, 0), (2, 1), (1, 2), (0, 1)],
    'T4': [(0, 0), (2, 0), (1, 1)],
    'T5': [(0, 0), (2, 0), (1, 1)],
    'P':  [(1, 0), (3, 0), (2, 1), (0, 1)],
}
KEY2ID = {'L': ['T1', 'T2'], 'M': ['T3'], 'Q': ['S'], 'S': ['T4', 'T5'], 'R': ['P']}


# ---------- 基础几何 ----------
def area(p):
    s = 0.0
    for i in range(len(p)):
        x1, y1 = p[i]; x2, y2 = p[(i + 1) % len(p)]
        s += x1 * y2 - x2 * y1
    return s / 2.0


def cent(p):
    Q = [tuple(v) for v in (p if area(p) > 0 else p[::-1])]
    a = cx = cy = 0.0
    for i in range(len(Q)):
        q = Q[(i + 1) % len(Q)]
        cr = Q[i][0] * q[1] - q[0] * Q[i][1]
        a += cr; cx += (Q[i][0] + q[0]) * cr; cy += (Q[i][1] + q[1]) * cr
    a /= 2
    return (cx / (6 * a), cy / (6 * a))


def rot(p, deg):
    th = math.radians(deg); c, s = math.cos(th), math.sin(th)
    return [(c * x - s * y, s * x + c * y) for x, y in p]


def ccw(p):
    return p if area(p) > 0 else p[::-1]


def clip(a, b):
    out = [tuple(v) for v in ccw([tuple(v) for v in a])]
    B = [tuple(v) for v in ccw([tuple(v) for v in b])]
    for i in range(len(B)):
        p1, p2 = B[i], B[(i + 1) % len(B)]

        def sd(v, p1=p1, p2=p2):
            return (p2[0] - p1[0]) * (v[1] - p1[1]) - (p2[1] - p1[1]) * (v[0] - p1[0])

        inp, out = out, []
        for j in range(len(inp)):
            cur, nxt = inp[j], inp[(j + 1) % len(inp)]
            sc, sn = sd(cur), sd(nxt)
            if sc >= -1e-12:
                out.append(cur)
            if (sc > 1e-12 and sn < -1e-12) or (sc < -1e-12 and sn > 1e-12):
                t = sc / (sc - sn)
                out.append((cur[0] + (nxt[0] - cur[0]) * t, cur[1] + (nxt[1] - cur[1]) * t))
        if not out:
            break
    return out


def iou(A, B):
    c = clip(A, B)
    it = abs(area(c)) if len(c) >= 3 else 0.0
    un = abs(area(A)) + abs(area(B)) - it
    return it / un if un > 0 else 0.0


# ---------- 板型 + 朝向 ----------
def place(key, ang, flip, cx, cy, a):
    _, base = SH[key]
    b = [(-x, y) for x, y in base] if flip else base
    sh = rot(b, ang)
    c = cent(sh)
    return [((v[0] - c[0]) * a + cx, (v[1] - c[1]) * a + cy) for v in sh]


def options(hull, a2, a):
    """a2 = 像素面积 / a²。返回 [(iou, key, ang, flip, cx, cy)]
    质心由凸包量得，会被白缝/相邻同色块带偏，所以每个候选再做一次平移局部搜索。"""
    Hh = [tuple(v) for v in hull]
    cH = cent(Hh)
    res = []
    for key, (ar, _) in SH.items():
        if abs(a2 / ar - 1.0) > 0.26:
            continue
        for flip in ([False, True] if key == 'R' else [False]):
            for ang in range(0, 360, 45):
                pl = place(key, ang, flip, cH[0], cH[1], a)
                q = iou(pl, Hh)
                bx, by = cH
                for step, rng in ((1.15, 1), (0.4, 1)):
                    for dx in range(-rng, rng + 1):
                        for dy in range(-rng, rng + 1):
                            if dx == 0 and dy == 0:
                                continue
                            ccx, ccy = bx + dx * step, by + dy * step
                            qq = iou(place(key, ang, flip, ccx, ccy, a), Hh)
                            if qq > q:
                                q, bx, by = qq, ccx, ccy
                res.append((q, key, ang, flip, bx, by))
    res.sort(key=lambda z: -z[0])
    return res


def assign_all(ps, a, limit=6):
    """返回按 IoU 总和排序的前 limit 种板型分配"""
    opts = []
    for p in ps:
        o = options(p['hull'], p['n'] / (a * a), a)
        if not o:
            return []
        m = {}
        for (q, key, ang, flip, cx, cy) in o:
            if key not in m or q > m[key][0]:
                m[key] = (q, key, ang, flip, cx, cy)
        opts.append(sorted(m.values(), key=lambda z: -z[0])[:6])

    out = []

    def walk(i, cnt, acc, sc):
        if i == 7:
            if all(cnt.get(k, 0) == NEED[k] for k in NEED):
                out.append((sc, acc[:]))
            return
        for (q, key, ang, flip, cx, cy) in opts[i]:
            if cnt.get(key, 0) >= NEED[key]:
                continue
            cnt[key] = cnt.get(key, 0) + 1
            acc.append((q, key, ang, flip, cx, cy))
            walk(i + 1, cnt, acc, sc + q)
            acc.pop()
            cnt[key] -= 1

    walk(0, {}, [], 0.0)
    out.sort(key=lambda z: -z[0])
    return out[:limit]


HOLEY = set('ABDOPQR')      # 这些字母本身就有封闭的「字怀」，其余不该出现洞


# ---------- 剪影掩码（参考图像素）----------
SILMASK = {}


def sil_mask(ch):
    if ch in SILMASK:
        return SILMASK[ch]
    rings = OUTL[ch]['rings']
    xs = [v[0] for r in rings for v in r['poly']]
    ys = [v[1] for r in rings for v in r['poly']]
    x0, y0, x1, y1 = min(xs) - 5, min(ys) - 5, max(xs) + 5, max(ys) + 5
    SS = 2
    W = int((x1 - x0) * SS) + 1; H = int((y1 - y0) * SS) + 1
    img = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(img)
    for r in rings:
        if r['area'] > 0:
            d.polygon([((v[0] - x0) * SS, (v[1] - y0) * SS) for v in r['poly']], fill=255)
    for r in rings:
        if r['area'] < 0:
            d.polygon([((v[0] - x0) * SS, (v[1] - y0) * SS) for v in r['poly']], fill=0)
    SILMASK[ch] = (np.asarray(img) > 127, x0, y0, SS, W, H)
    return SILMASK[ch]


def mask_iou(ch, polys):
    m, x0, y0, SS, W, H = sil_mask(ch)
    img = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(img)
    for p in polys:
        d.polygon([((v[0] - x0) * SS, (v[1] - y0) * SS) for v in p], fill=255)
    q = np.asarray(img) > 127
    it = int((m & q).sum()); un = int((m | q).sum())
    return it / un if un else 0.0


# ---------- 松弛：收白缝 ----------
def split_axis(poly, nx, ny):
    pr = [v[0] * nx + v[1] * ny for v in poly]
    return min(pr), max(pr)


def overlap_mtv(A, B):
    """若 A、B 重叠，返回把 A 推离 B 的最小位移；不重叠返回 None"""
    best = None
    for poly in (A, B):
        n = len(poly)
        for i in range(n):
            x1, y1 = poly[i]; x2, y2 = poly[(i + 1) % n]
            nx, ny = -(y2 - y1), (x2 - x1)
            L = math.hypot(nx, ny)
            if L < 1e-9:
                continue
            nx /= L; ny /= L
            a1, a2_ = split_axis(A, nx, ny)
            b1, b2 = split_axis(B, nx, ny)
            if a2_ <= b1 + 1e-9 or b2 <= a1 + 1e-9:
                return None
            o = min(a2_ - b1, b2 - a1)
            if best is None or o < best[0]:
                s = 1.0 if (a1 + a2_) * 0.5 > (b1 + b2) * 0.5 else -1.0
                best = (o, nx * s, ny * s)
    return best


def pt_seg(p, a_, b_):
    px, py = p; ax, ay = a_; bx, by = b_
    dx, dy = bx - ax, by - ay
    L2 = dx * dx + dy * dy
    if L2 < 1e-12:
        return (px - ax, py - ay)
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / L2))
    qx, qy = ax + dx * t, ay + dy * t
    return (px - qx, py - qy)


def min_dist(A, B):
    """两凸多边形最近距离，返回 (距离, 向量)。向量统一「由 A 指向 B」。"""
    best, bv = 1e18, (0.0, 0.0)
    for v in B:                                   # B 的顶点 → A 的边：v - q 就是 A→B
        for i in range(len(A)):
            d = pt_seg(v, A[i], A[(i + 1) % len(A)])
            L = math.hypot(d[0], d[1])
            if L < best:
                best, bv = L, (d[0], d[1])
    for v in A:                                   # A 的顶点 → B 的边：v - q 是 B→A，要取反
        for i in range(len(B)):
            d = pt_seg(v, B[i], B[(i + 1) % len(B)])
            L = math.hypot(d[0], d[1])
            if L < best:
                best, bv = L, (-d[0], -d[1])
    return best, bv


def is_connected(polys, tol):
    n = len(polys)
    seen = {0}; st = [0]
    while st:
        i = st.pop()
        for j in range(n):
            if j in seen:
                continue
            d, _ = min_dist(polys[i], polys[j])
            if d < tol:
                seen.add(j); st.append(j)
    return len(seen) == n


def relax(polys, a, iters=200):
    """把板间白缝收掉：近的拉近、重叠的推开；必要时逐轮放宽「算近」的门槛"""
    n = len(polys)
    total_it = 0
    for rnd in range(6):
        pull = (0.10 + 0.05 * rnd) * a
        for it in range(iters):
            total_it += 1
            moved = False
            for i in range(n):
                for j in range(i + 1, n):
                    A, B = polys[i], polys[j]
                    mtv = overlap_mtv(A, B)
                    if mtv:
                        o, mx, my = mtv
                        polys[i] = [(x + mx * o * 0.5, y + my * o * 0.5) for x, y in A]
                        polys[j] = [(x - mx * o * 0.5, y - my * o * 0.5) for x, y in B]
                        moved = True
                        continue
                    d, v = min_dist(A, B)          # v 由 A 指向 B
                    if 1e-4 < d < pull:
                        polys[i] = [(x + v[0] * 0.5, y + v[1] * 0.5) for x, y in A]
                        polys[j] = [(x - v[0] * 0.5, y - v[1] * 0.5) for x, y in B]
                        moved = True
            if not moved:
                break
        if is_connected(polys, 0.05 * a):
            break
    return polys, total_it


# ---------- 板型 → 游戏 id / angle / flipped ----------
def norm_shape(p, s=1.0):
    c = cent(p)
    return [(round((v[0] - c[0]) * s, 4), round((v[1] - c[1]) * s, 4)) for v in p]


def match_game(key, ang, flip):
    """找出使 游戏base 旋转后与「本脚本的板型」重合的 (id, 角度, flipped)"""
    mine = norm_shape(rot(([(-x, y) for x, y in SH[key][1]] if flip else SH[key][1]), ang))
    mine_s = sorted(mine)
    for gid in KEY2ID[key]:
        base = GAME[gid]
        for gflip in ([False, True] if gid == 'P' else [False]):
            bb = [(-x, y) for x, y in base] if gflip else base
            for gang in range(0, 360, 45):
                g = norm_shape([(v[0] / math.sqrt(2), v[1] / math.sqrt(2)) for v in rot(bb, gang)])
                g_s = sorted(g)
                if len(g_s) != len(mine_s):
                    continue
                if all(abs(p[0] - q[0]) < 1e-3 and abs(p[1] - q[1]) < 1e-3 for p, q in zip(mine_s, g_s)):
                    return gid, gang, gflip
    return None


# ---------- 并集掩码 → 轮廓 ----------
def rdp(pts, tol):
    if len(pts) < 3:
        return pts
    a_, b_ = pts[0], pts[-1]
    dx, dy = b_[0] - a_[0], b_[1] - a_[1]
    L = math.hypot(dx, dy)
    idx, best = -1, -1
    for i in range(1, len(pts) - 1):
        p = pts[i]
        d = (abs((p[0] - a_[0]) * dy - (p[1] - a_[1]) * dx) / L) if L > 1e-9 else \
            math.hypot(p[0] - a_[0], p[1] - a_[1])
        if d > best:
            best, idx = d, i
    if best <= tol:
        return [a_, b_]
    return rdp(pts[:idx + 1], tol)[:-1] + rdp(pts[idx:], tol)


def simplify_closed(poly, tol):
    n = len(poly)
    fi, fd = 1, -1
    for i in range(1, n):
        d = math.hypot(poly[i][0] - poly[0][0], poly[i][1] - poly[0][1])
        if d > fd:
            fd, fi = d, i
    r1 = rdp(poly[:fi + 1], tol)
    r2 = rdp(poly[fi:] + [poly[0]], tol)
    return r1[:-1] + r2[:-1]


def loops_of(m):
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
                add((x, y), (x + 1, y))
            if x == w - 1 or not m[y, x + 1]:
                add((x + 1, y), (x + 1, y + 1))
            if y == h - 1 or not m[y + 1, x]:
                add((x + 1, y + 1), (x, y + 1))
            if x == 0 or not m[y, x - 1]:
                add((x, y + 1), (x, y))
    loops = []
    while starts:
        p0 = next(iter(starts))
        loop = [p0]; p = p0
        while True:
            nxts = starts.get(p)
            if not nxts:
                break
            q = nxts.pop()
            if not nxts:
                del starts[p]
            loop.append(q); p = q
            if q == p0:
                break
        if len(loop) >= 4:
            loops.append(loop[:-1])
    return loops


def union_rings(polys, pad=6, SS=3, tol=0.9, target_area=None):
    xs = [v[0] for p in polys for v in p]
    ys = [v[1] for p in polys for v in p]
    x0 = min(xs) - pad; y0 = min(ys) - pad
    x1 = max(xs) + pad; y1 = max(ys) + pad
    W = int((x1 - x0) * SS) + 2; H = int((y1 - y0) * SS) + 2
    img = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(img)
    for p in polys:
        d.polygon([((v[0] - x0) * SS, (v[1] - y0) * SS) for v in p], fill=255)
    m = np.asarray(img) > 127
    rings = []
    for l in loops_of(m):
        poly = simplify_closed([(px / SS, py / SS) for px, py in l], tol)
        poly = [(round(px + x0, 2), round(py + y0, 2)) for px, py in poly]
        rings.append({'poly': poly, 'area': round(area(poly), 1)})
    rings.sort(key=lambda r: -abs(r['area']))

    if target_area and rings:
        # 栅格 + RDP 会把面积抬大约 0.3%，这里按几何比例校正到精确值
        net = abs(area(rings[0]['poly'])) - sum(abs(area(r['poly'])) for r in rings[1:])
        if net > 0:
            s = math.sqrt(target_area / net)
            cx, cy = cent(rings[0]['poly'])
            for r in rings:
                r['poly'] = [(round((v[0] - cx) * s + cx, 2), round((v[1] - cy) * s + cy, 2)) for v in r['poly']]
                r['area'] = round(area(r['poly']), 1)
    return rings


# ---------- 主流程 ----------
def point_in(pt, poly):
    x, y = pt
    ins = False
    n = len(poly)
    for i in range(n):
        x1, y1 = poly[i]; x2, y2 = poly[(i + 1) % n]
        if (y1 > y) != (y2 > y):
            if x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
                ins = not ins
    return ins


res = []
stats = []
for ch in sorted(PJ):
    net = sum(r['area'] for r in OUTL[ch]['rings'])
    a = math.sqrt(net / 8.0)
    ps = sorted(PJ[ch]['pieces'], key=lambda z: -z['n'])[:7]

    cands = assign_all(ps, a, limit=6)
    if not cands:
        print(ch, '✗ 板型分配失败')
        res.append({'ch': ch, 'ok': False})
        continue

    # 多种分配各跑一遍松弛，用「剪影 IoU + 洞数是否合理」择优
    want_hole = 2 if ch == 'B' else (1 if ch in HOLEY else 0)
    bestC = None
    for score, asg in cands:
        p0 = []
        m0 = []
        for (q, key, ang, flip, cx, cy), p in zip(asg, ps):
            p0.append(place(key, ang, flip, cx, cy, a))
            m0.append({'key': key, 'ang': ang, 'flip': flip, 'iou': round(q, 3)})
        pN, nit = relax(list(p0), a)
        mi = mask_iou(ch, pN)
        nh = len(union_rings(pN, SS=2)) - 1
        key_ = (-abs(nh - want_hole), round(mi, 4))
        if bestC is None or key_ > bestC[0]:
            bestC = (key_, score, m0, pN, nit, nh, mi)
    _, score, meta, polys, nit, nh, mi = bestC
    print('   %s 择优: 剪影IoU=%.4f 洞=%d(期望%d) 分配分=%.2f' % (ch, mi, nh, want_hole, score))

    # 缩放到世界坐标：总面积必须等于 147456
    tot = sum(abs(area(p)) for p in polys)
    k = math.sqrt(WORLD_AREA / tot)
    polys = [[(v[0] * k, v[1] * k) for v in p] for p in polys]
    xs = [v[0] for p in polys for v in p]
    ys = [v[1] for p in polys for v in p]
    dx = CENTER[0] - (min(xs) + max(xs)) / 2
    dy = CENTER[1] - (min(ys) + max(ys)) / 2
    polys = [[(v[0] + dx, v[1] + dy) for v in p] for p in polys]

    # 反解 id / angle / flipped
    sol = []
    used = {}
    ok = True
    for m, p in zip(meta, polys):
        g = match_game(m['key'], m['ang'], m['flip'])
        if not g:
            ok = False
            break
        gid, gang, gflip = g
        if gid in ('T1', 'T2', 'T4', 'T5'):
            # 同面积同形的两块任选，按出现次序分配
            used[gid] = used.get(gid, 0) + 1
            if used[gid] == 2:
                gid = 'T2' if gid == 'T1' else 'T5'
        c = cent(p)
        sol.append({'id': gid, 'x': round(c[0], 2), 'y': round(c[1], 2),
                    'angle': gang, 'flipped': bool(gflip)})
    if not ok:
        print(ch, '✗ 无法映射到游戏板型')
        res.append({'ch': ch, 'ok': False})
        continue

    rings = union_rings(polys, target_area=WORLD_AREA)
    outline = rings[0]['poly']
    holes = [r['poly'] for r in rings[1:] if abs(area(r['poly'])) > 600]
    oarea = abs(area(outline)) - sum(abs(area(h)) for h in holes)
    tot_area = sum(abs(area(p)) for p in polys)
    ratio = tot_area / oarea

    # 内部接缝 → splitLines（校验器要求每关 ≥3 条）
    splitLines = []
    for p in polys:
        for i in range(len(p)):
            a_, b_ = p[i], p[(i + 1) % len(p)]
            mid = ((a_[0] + b_[0]) / 2, (a_[1] + b_[1]) / 2)
            if not point_in(mid, outline):
                continue
            db = min(math.hypot(*pt_seg(mid, outline[k], outline[(k + 1) % len(outline)]))
                     for k in range(len(outline)))
            if db > 1.5:
                splitLines.append([[round(a_[0], 2), round(a_[1], 2)], [round(b_[0], 2), round(b_[1], 2)]])
    # 去重（顶点顺序归一）
    seenS = set(); SL = []
    for s in splitLines:
        k1 = (tuple(s[0]), tuple(s[1])); k2 = (tuple(s[1]), tuple(s[0]))
        if k1 in seenS or k2 in seenS:
            continue
        seenS.add(k1); SL.append(s)
    splitLines = SL

    # 重叠体检（粗采样）
    ovl = 0; good = 0
    step = 3.0
    for y in np.arange(min(v[1] for p in polys for v in p) + step / 2, max(v[1] for p in polys for v in p), step):
        for x in np.arange(min(v[0] for p in polys for v in p) + step / 2, max(v[0] for p in polys for v in p), step):
            cnt = 0
            for p in polys:
                if point_in((x, y), p):
                    cnt += 1
            if cnt == 0:
                continue
            good += 1 if cnt == 1 else 0
            ovl += 1 if cnt >= 2 else 0
    ovl_pct = 100.0 * ovl / max(1, good + ovl)

    needFlip = any(s['flipped'] for s in sol)
    print('%s ok  IoU均=%.3f  松弛%d轮  面积比=%.5f  重叠=%.2f%%  outline=%d点 孔=%d  分割线=%d  needFlip=%s'
          % (ch, score / 7, nit, ratio, ovl_pct, len(outline), len(holes), len(splitLines), needFlip))

    res.append({'ch': ch, 'ok': True, 'outline': outline, 'holes': holes, 'solution': sol,
                'splitLines': splitLines, 'needFlip': needFlip,
                'areaRatio': round(ratio, 6), 'overlapPct': round(ovl_pct, 2)})


json.dump(res, open(os.path.join(HERE, 'letters_levels.json'), 'w', encoding='utf8'), ensure_ascii=False)
print('成功', sum(1 for r in res if r.get('ok')), '/', len(res))
