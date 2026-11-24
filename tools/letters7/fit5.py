# 剪影驱动精确覆盖 v2（fit5）
#
# 相比 fit4：
#  1) 格点相位不再只取最优点，而是按相位代价排前 N 个候选逐个试 —— 个别字母横竖边少、拟合会偏
#  2) 目标三角集统一取「覆盖率最高的 32 个」，不再要求刚好 32 个（插画描边会让边界三角的
#     覆盖率在 0.4~0.6 之间抖，硬卡 0.5 会数出 30/31/33/34 这种数）
#  3) 精确覆盖多解时，挑「各块板质心最接近实测质心」的那个 —— 尽量还原参考图的摆法
#
# 输入 tools/letters7/outline.json + pieces.json + grid.json
# 输出 tools/letters7/fit5.json
import json, os, math
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
GS = json.load(open(os.path.join(HERE, 'grid.json'), encoding='utf8'))
OUTL = {r['ch']: r for r in json.load(open(os.path.join(HERE, 'outline.json'), encoding='utf8'))}
PJ = {r['ch']: r for r in json.load(open(os.path.join(HERE, 'pieces.json'), encoding='utf8'))}
CELL = {c['ch']: c for c in GS['cells']}
REF = Image.open(os.path.join(HERE, 'ref.webp')).convert('RGB')
IW, IH = REF.size

SHAPE = {
    'L': (2.0, [(0, 0), (2, 0), (0, 2)]),
    'M': (1.0, [(0, 0), (2, 0), (1, 1)]),
    'Q': (1.0, [(0, 0), (1, 0), (1, 1), (0, 1)]),
    'S': (0.5, [(0, 0), (1, 0), (0, 1)]),
    'R': (1.0, [(0, 0), (1, 0), (2, 1), (1, 1)]),
}
NEED = {'L': 2, 'S': 2, 'M': 1, 'Q': 1, 'R': 1}
ORDER = ('L', 'M', 'Q', 'S', 'R')
TRI_V = {0: [(0, 0), (1, 0), (0.5, 0.5)], 1: [(1, 0), (1, 1), (0.5, 0.5)],
         2: [(1, 1), (0, 1), (0.5, 0.5)], 3: [(0, 1), (0, 0), (0.5, 0.5)]}
# 每个小三角内的采样点（重心坐标）
SAMP = {}
for q, v in TRI_V.items():
    cx = (v[0][0] + v[1][0] + v[2][0]) / 3.0
    cy = (v[0][1] + v[1][1] + v[2][1]) / 3.0
    pts = [(cx, cy)]
    for f in (0.5, 0.85):
        for m in range(3):
            pts.append((cx + (v[m][0] - cx) * f, cy + (v[m][1] - cy) * f))
    SAMP[q] = pts
NODE_CAP = 200000
MAX_SOL = 40


def rot90(p, k):
    c, s = [(1, 0), (0, 1), (-1, 0), (0, -1)][k]
    return [(c * x - s * y, s * x + c * y) for x, y in p]


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


def poly_centroid(p):
    s = cx = cy = 0.0
    n = len(p)
    for i in range(n):
        x1, y1 = p[i]; x2, y2 = p[(i + 1) % n]
        cr = x1 * y2 - x2 * y1
        s += cr; cx += (x1 + x2) * cr; cy += (y1 + y2) * cr
    s /= 2
    return (cx / (6 * s), cy / (6 * s))


def make_mask(rings):
    m = Image.new('L', (IW, IH), 0)
    d = ImageDraw.Draw(m)
    for r in rings:
        if r['area'] > 0:
            d.polygon([tuple(v) for v in r['poly']], fill=255)
    for r in rings:
        if r['area'] < 0:
            d.polygon([tuple(v) for v in r['poly']], fill=0)
    return np.asarray(m) > 127


# ---------- 格点相位候选 ----------
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
                segs.append(('v', (x1 + x2) / 2.0, L))
            elif abs(dy) < 0.28 * L:
                segs.append(('h', (y1 + y2) / 2.0, L))
    return segs


def dist_lat(t, o, a):
    k = round((t - o) / a)
    return abs(t - (o + k * a))


def scan1(lst, a):
    def cost(o):
        return sum(L * dist_lat(t, o, a) ** 2 for _, t, L in lst)
    bo, bc = 0.0, 1e18
    for k in range(60):
        o = k * a / 60.0
        c = cost(o)
        if c < bc:
            bc, bo = c, o
    for k in range(-15, 16):
        o = bo + k * a / 900.0
        c = cost(o)
        if c < bc:
            bc, bo = c, o
    return bo % a, bc


def lattice_candidates(ch, rings, keep=24):
    segs = hv_edges(rings)
    vs = [s for s in segs if s[0] == 'v']
    hs = [s for s in segs if s[0] == 'h']
    a0 = CELL[ch]['a']
    cands = []
    for ai in range(-12, 13):
        a = a0 + ai * 0.05
        ox, cx_ = scan1(vs, a) if vs else (0.0, 0.0)
        oy, cy_ = scan1(hs, a) if hs else (0.0, 0.0)
        cands.append((cx_ + cy_, a, ox, oy))
    cands.sort(key=lambda z: z[0])
    # 相位相近的去掉，保证候选多样
    out = []
    for c in cands:
        if all(abs(c[1] - o[1]) > 0.03 or math.hypot(c[2] - o[2], c[3] - o[3]) > 0.9 for o in out):
            out.append(c)
        if len(out) >= keep:
            break
    return out


# ---------- 精确覆盖 ----------
def tris_in_poly(poly):
    xs = [v[0] for v in poly]; ys = [v[1] for v in poly]
    res = []
    for j in range(int(math.floor(min(ys))), int(math.ceil(max(ys))) + 1):
        for i in range(int(math.floor(min(xs))), int(math.ceil(max(xs))) + 1):
            for q in range(4):
                v = TRI_V[q]
                cx = (v[0][0] + v[1][0] + v[2][0]) / 3.0 + i
                cy = (v[0][1] + v[1][1] + v[2][1]) / 3.0 + j
                if in_ring((cx, cy), poly):
                    res.append((i, j, q))
    return res


def build_placements(S, bbox):
    i0, j0, i1, j1 = bbox
    out = {}
    for key, (ar, base) in SHAPE.items():
        need = int(round(ar * 4))
        lst = []
        seen = set()
        for flip in ([False, True] if key == 'R' else [False]):
            b = [(-x, y) for x, y in base] if flip else base
            for k in range(4):
                sh = rot90(b, k)
                xs = [v[0] for v in sh]; ys = [v[1] for v in sh]
                for tx in range(i0, i1 + 2):
                    for ty in range(j0, j1 + 2):
                        poly = [(x + tx, y + ty) for x, y in sh]
                        tr = frozenset(tris_in_poly(poly))
                        if len(tr) != need or not tr <= S:
                            continue
                        if tr in seen:
                            continue
                        seen.add(tr)
                        lst.append((tr, poly))
        out[key] = lst
    return out


def cover_all(S, pls, limit=MAX_SOL):
    sols = []
    counts = dict(NEED)
    nodes = [0]

    def dfs(remaining, chosen):
        nodes[0] += 1
        if nodes[0] > NODE_CAP or len(sols) >= limit:
            return
        if not remaining:
            if not any(counts.values()):
                sols.append(chosen[:])
            return
        t = min(remaining)
        for key in ORDER:
            if counts[key] <= 0:
                continue
            for tr, poly in pls[key]:
                if t not in tr or not tr <= remaining:
                    continue
                counts[key] -= 1
                chosen.append((key, poly))
                dfs(remaining - tr, chosen)
                chosen.pop()
                counts[key] += 1

    dfs(frozenset(S), [])
    return sols, nodes[0]


def solve_letter(ch):
    rec = OUTL[ch]
    rings = rec['rings']
    mask = make_mask(rings)
    box = rec['box']
    # 实测质心（格点单位，随相位变化）
    meas = []
    for h in sorted(PJ[ch]['pieces'], key=lambda z: -z['n'])[:7]:
        c = poly_centroid([tuple(v) for v in h['hull']])
        meas.append(c)

    for cost, a, ox, oy in lattice_candidates(ch, rings):
        i0 = int(math.floor((box[0] - ox) / a)) - 1
        i1 = int(math.ceil((box[2] - ox) / a)) + 1
        j0 = int(math.floor((box[1] - oy) / a)) - 1
        j1 = int(math.ceil((box[3] - oy) / a)) + 1

        fs = []
        for j in range(j0, j1):
            for i in range(i0, i1):
                for q in range(4):
                    hit = 0
                    pts = SAMP[q]
                    for px, py in pts:
                        X = int(round((px + i) * a + ox))
                        Y = int(round((py + j) * a + oy))
                        if 0 <= X < IW and 0 <= Y < IH and mask[Y, X]:
                            hit += 1
                    if hit >= 5:            # 覆盖率 >= 5/7
                        fs.append((hit / len(pts), (i, j, q)))
        if len(fs) < 32:
            continue
        fs.sort(key=lambda z: -z[0])
        S = frozenset(t for _, t in fs[:32])
        bbox = (i0, j0, i1, j1)
        pls = build_placements(S, bbox)
        if any(not pls[k] for k in NEED):
            continue
        sols, nodes = cover_all(S, pls)
        if not sols:
            continue

        # 多解：挑各块板质心最接近实测质心的
        best, bs = None, 1e18
        for sol in sols:
            sc = 0.0
            used = set()
            for key, poly in sol:
                c = poly_centroid([tuple(v) for v in poly])
                # 单位换算回像素后与实测质心比
                px = (c[0] * a + ox, c[1] * a + oy)
                d = min(math.hypot(px[0] - m[0], px[1] - m[1]) for m in meas if id(m) not in used)
                sc += d
            if sc < bs:
                bs, best = sc, sol
        return {'ok': True, 'a': round(a, 4), 'ox': round(ox, 3), 'oy': round(oy, 3),
                'phaseCost': round(cost, 1), 'nodes': nodes, 'nsol': len(sols),
                'fitErr': round(bs, 2),
                'pieces': [{'key': k, 'poly': [[int(x), int(y)] for x, y in poly]}
                           for k, poly in best]}, None
    return None, '所有格点候选都无解'


res = []
for ch in sorted(OUTL):
    r, err = solve_letter(ch)
    if r is None:
        print(ch, '✗', err)
        res.append({'ch': ch, 'ok': False, 'err': err})
    else:
        print('%s OK  a=%.2f ox=%.1f oy=%.1f 代价=%.0f 解数=%d 拟合误差=%.1fpx' %
              (ch, r['a'], r['ox'], r['oy'], r['phaseCost'], r['nsol'], r['fitErr']))
        res.append({'ch': ch, **r})

json.dump(res, open(os.path.join(HERE, 'fit5.json'), 'w', encoding='utf8'), ensure_ascii=False)
print('成功', sum(1 for r in res if r.get('ok')), '/', len(res))
