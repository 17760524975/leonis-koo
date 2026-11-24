# -*- coding: utf-8 -*-
"""把「已验证的七巧板解」转换成游戏关卡数据（LEVELS7 格式）。

输入：out/solutions.json（final.py 产出，坐标以 u 为单位、包围盒左下为原点）
输出：
  out/levels_new.json   新关卡数组
  js/levels.js          替换 var LEVELS7 = [...]; 与章节元数据

关卡字段与既有引擎一致：
  id / chapter / name / tip / outline(单环点列) / solution[{id,x,y,angle,flipped}]
  / splitLines(内部拼缝) / hintTier / parTime / parSteps / needFlip
"""
import json
import math
import os
import sys

import numpy as np
from shapely.geometry import Polygon
from shapely.ops import unary_union

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)

UNIT = 107.0                      # 与 DATA7.unitScale 一致：1u = 107 设计像素
CENTER = (500.0, 500.0)           # 剪影中心 = 棋盘中心（world 500 ↔ 设计像素 375/653）
SHAPES = {                        # 与 DATA7.pieces[*].base 一致
    'T1': [[0, 0], [4, 0], [2, 2]],
    'T2': [[0, 0], [4, 0], [2, 2]],
    'T3': [[0, 0], [2, 0], [0, 2]],
    'S': [[1, 0], [2, 1], [1, 2], [0, 1]],
    'T4': [[0, 0], [2, 0], [1, 1]],
    'T5': [[0, 0], [2, 0], [1, 1]],
    'P': [[1, 0], [3, 0], [2, 1], [0, 1]],
}
SLOTS = ['T1', 'T2', 'T3', 'S', 'T4', 'T5', 'P']
ALIAS = {'T2': 'T1', 'T5': 'T4'}


def centroid(poly):
    p = Polygon(poly)
    c = p.centroid
    return np.array([c.x, c.y])


def local_of(shape):
    base = np.array(SHAPES[shape], float)
    return base - base.mean(0) if False else base - centroid(SHAPES[shape])


def to_world(local, x, y, angle, flipped):
    a = math.radians(angle)
    ca, sa = math.cos(a), math.sin(a)
    fx = -1.0 if flipped else 1.0
    out = []
    for px, py in local:
        px *= fx
        out.append([px * ca - py * sa + x, px * sa + py * ca + y])
    return np.array(out)


def match_state(shape, poly, tol=2e-3):
    """已知板型，求 (angle, flipped, x, y) 使其精确复原 poly"""
    c = centroid(poly)
    loc = local_of(shape)
    P = np.array(poly, float)
    best = None
    for flipped in (False, True):
        for angle in range(0, 360, 45):
            q = to_world(loc, c[0], c[1], angle, flipped)
            d = vertex_dist(P, q)
            if best is None or d < best[0]:
                best = (d, angle, flipped)
    d, angle, flipped = best
    if d > tol:
        raise ValueError('板型 %s 无法复原（残差 %.4f）' % (shape, d))
    return dict(id=shape, x=round(float(c[0]), 2), y=round(float(c[1]), 2),
                angle=int(angle) % 360, flipped=bool(flipped), _err=d)


def vertex_dist(P, Q):
    """两组顶点的最小匹配距离（点数相同、顺序可能不同）"""
    P = np.asarray(P, float)
    Q = np.asarray(Q, float)
    if len(P) != len(Q):
        # 形状相同但顶点数不同：用 Hausdorff 距离
        d1 = max(_pt_poly(p, Q) for p in P)
        d2 = max(_pt_poly(p, P) for p in Q)
        return max(d1, d2)
    used = [False] * len(Q)
    tot = 0.0
    for p in P:
        best, bi = 1e9, -1
        for j, q in enumerate(Q):
            if used[j]:
                continue
            d = math.hypot(p[0] - q[0], p[1] - q[1])
            if d < best:
                best, bi = d, j
        used[bi] = True
        tot = max(tot, best)
    return tot


def _pt_poly(p, Q):
    d = [math.hypot(p[0] - q[0], p[1] - q[1]) for q in Q]
    return min(d)


def split_lines(polys):
    """相邻板之间的共用边 -> splitLines（去重、只保留有长度的段）"""
    out = []
    seen = set()
    for i in range(len(polys)):
        for j in range(i + 1, len(polys)):
            a, b = Polygon(polys[i]), Polygon(polys[j])
            inter = a.boundary.intersection(b.boundary)
            geoms = [inter] if inter.geom_type in ('LineString', 'MultiLineString') else list(getattr(inter, 'geoms', []))
            for g in geoms:
                if g.geom_type != 'LineString' or g.length < 0.5:
                    continue
                c = list(g.coords)
                for p, q in zip(c, c[1:]):
                    seg = tuple(sorted([(round(p[0], 1), round(p[1], 1)), (round(q[0], 1), round(q[1], 1))]))
                    if seg in seen or math.hypot(seg[0][0] - seg[1][0], seg[0][1] - seg[1][1]) < 0.5:
                        continue
                    seen.add(seg)
                    out.append([[seg[0][0], seg[0][1]], [seg[1][0], seg[1][1]]])
    return out


def outline_from_pieces(pieces):
    """从 7 块板的实际多边形求并集，作为剪影（外环 + 内孔）。

    不直接沿用 solutions.json 里的 outline：那里的环是按并集分量输出的，
    板与板仅在顶点相接时会被误当成多个「孔」。
    """
    pgs = [Polygon([tuple(map(float, q)) for q in p['pts']]).buffer(1e-9) for p in pieces]
    U = unary_union(pgs).buffer(1e-9).buffer(-1e-9)
    if U.geom_type == 'MultiPolygon':
        raise ValueError('剪影不连通（分成了 %d 块）' % len(U.geoms))
    rings = [np.array(U.exterior.coords)[:-1]]
    rings += [np.array(h.coords)[:-1] for h in U.interiors if Polygon(h).area > 0.02]
    return [r.tolist() for r in rings]


def build_level(name, chapter, tip, pieces, outline_rings, par_time=120, par_steps=24):
    """pieces: [{shape, pts}]（u 为单位）；outline_rings: [外环, *孔]，传 None 则自动求并集"""
    # 1) u -> 设计像素（等比，1u = 107px），并把整体包围盒中心对到 CENTER
    if outline_rings is None:
        outline_rings = outline_from_pieces(pieces)
    allv = np.vstack([np.array(p['pts'], float) for p in pieces])
    bb0, bb1 = allv.min(0), allv.max(0)
    scale = UNIT
    span = (bb1 - bb0) * scale
    org = CENTER - np.array([span[0] / 2.0, span[1] / 2.0])
    org = np.round(org, 2)

    def mp(pts):
        return [[round(float(x) * scale + org[0], 2), round(float(y) * scale + org[1], 2)]
                for x, y in pts]

    polys = [mp(p['pts']) for p in pieces]
    rings = [mp(r) for r in outline_rings]

    # 2) 求每块板的 state（在 u 单位下匹配，再换算成设计像素）
    sol = []
    for pc, poly in zip(pieces, polys):
        poly_u = [[(q[0] - org[0]) / scale, (q[1] - org[1]) / scale] for q in poly]
        st = match_state(pc['shape'], poly_u)
        st.pop('_err', None)
        st['x'] = round(st['x'] * scale + org[0], 2)
        st['y'] = round(st['y'] * scale + org[1], 2)
        sol.append(st)

    # 3) 拼缝
    sl = split_lines(polys)

    # 4) 比例校准：棋盘上 1u 必须正好 107px，校验面积
    total = sum(abs(Polygon(p).area) for p in polys)
    expect = 16 * UNIT * UNIT
    if abs(total - expect) > expect * 1e-3:
        raise ValueError('%s 面积不符：%.0f vs %.0f' % (name, total, expect))

    return dict(id=0, chapter=chapter, name=name, tip=tip,
                outline=[[round(v, 2) for v in pt] for pt in rings[0]],
                holes=[[[round(v, 2) for v in pt] for pt in r] for r in rings[1:]],
                solution=sol, splitLines=sl,
                hintTier=1 if chapter <= 2 else 2,
                parTime=par_time, parSteps=par_steps,
                needFlip=any(s['flipped'] for s in sol))


def load_solutions(names):
    sols = json.load(open(os.path.join(HERE, 'out', 'solutions.json'), encoding='utf-8'))
    out = []
    for nm in names:
        if nm not in sols:
            print('  ! 缺解：%s' % nm)
            continue
        L = sols[nm]
        # 带内孔的字母（拼合缝隙围成的空洞）照样可以出关：引擎已支持 holes

        pieces = []
        for p in L['pieces']:
            pts = [list(q) for q in p['pts']]
            if len(pts) > 1 and pts[0] == pts[-1]:
                pts = pts[:-1]
            pieces.append(dict(shape=p['shape'], pts=pts))
        # 形状编号对齐：S/T3/T4 等，其余按面积分配两块大/小三角的槽位
        pieces = assign_slots(pieces)
        out.append(build_level(nm, 2, '字母·七巧 · 七块板拼出字母', pieces,
                               None, par_time=90, par_steps=18))
    return out


def assign_slots(pieces):
    """把解里的 T1/T2 归到不同槽位（同一形状两块板用 T1/T2、T4/T5 区分）"""
    big = small = 0
    for p in pieces:
        if p['shape'] == 'T1':
            p['shape'] = 'T1' if big == 0 else 'T2'
            big += 1
        elif p['shape'] == 'T4':
            p['shape'] = 'T4' if small == 0 else 'T5'
            small += 1
    return pieces


def main():
    names = list('EFNPV')  # 只保留「读得出 + 整幅落在 702px 棋盘内」的字母（A 的右腿有缺口，弃用）
    new = load_solutions(names)
    print('生成字母关卡 %d 个' % len(new))
    base = json.load(open(os.path.join(HERE, 'out', 'levels85.json'), encoding='utf-8'))
    keep = [l for l in base if l['id'] <= 10]

    all_levels = []
    for l in keep:
        l = dict(l)
        l['chapter'] = 1
        all_levels.append(l)
    for i, l in enumerate(new):
        l = dict(l)
        l['id'] = 11 + i
        all_levels.append(l)
    print('总关卡 %d（几何 %d + 字母 %d）' % (len(all_levels), len(keep), len(new)))

    json.dump(all_levels, open(os.path.join(HERE, 'out', 'levels_new.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)
    print('已写 out/levels_new.json')


if __name__ == '__main__':
    main()
