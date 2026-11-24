# -*- coding: utf-8 -*-
"""容器内精确覆盖（整数格 + 四分之一三角形离散）。

离散化：每个单位方格用两条对角线切成 N/E/S/W 四个小三角形。
七巧板所有板件的边只会落在「网格线」或「方格对角线」上（顶点都是整数、
边只有 0°/45°/90°/135°），所以这个小三角形集合是**无损**表示：
  · 每块板的面积精确等于它占的小三角形个数 × 1/4
  · 两块板要么完全不共三角形，要么真的重叠 —— 不存在采样误差
于是「面积恰好 64 个小三角形」⇔「面积恰好 16」。
"""
import numpy as np
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from tanref3.shapes import SHAPES, AREA
from shapely.geometry import Polygon
from shapely.ops import unary_union
from shapely import contains_xy

SUB = 4                      # 每格 4 个小三角形
AREA_ALL = {'T1': 4, 'T2': 4, 'T3': 2, 'S': 2, 'T4': 1, 'T5': 1, 'P': 2}
ALIAS = {'T2': 'T1', 'T5': 'T4'}

# 四个小三角形的重心（相对单位方格左下角）
TRI_CENTROID = [(0.5, 5.0 / 6), (5.0 / 6, 0.5), (0.5, 1.0 / 6), (1.0 / 6, 0.5)]


def tri_centers(ox, oy, nx, ny):
    """所有小三角形重心坐标，索引顺序与掩码位一致：cell*4 + q"""
    pts = np.zeros((nx * ny * 4, 2), np.float64)
    for j in range(ny):
        for i in range(nx):
            base = (j * nx + i) * 4
            for q, (cx, cy) in enumerate(TRI_CENTROID):
                pts[base + q] = (ox + i + cx, oy + j + cy)
    return pts


def poly_tris(poly, centers):
    inside = contains_xy(poly, centers[:, 0], centers[:, 1])
    bits = np.packbits(inside, bitorder='little')
    return int.from_bytes(bits.tobytes(), 'little')


def build_placements(ox, oy, nx, ny, container, centers, only=None, out_budget=0):
    out = []
    shapes = only or ['T1', 'T3', 'S', 'T4', 'P']
    for shape in shapes:
        base = np.array(SHAPES[shape], float)
        for mir in ((False, True) if shape == 'P' else (False,)):
            bb = base * (np.array([-1.0, 1.0]) if mir else 1.0)
            for k in range(4):
                a = math.radians(90 * k)
                ca, sa = math.cos(a), math.sin(a)
                pts = (np.array([[ca, -sa], [sa, ca]]) @ bb.T).T
                pmin, pmax = pts.min(0), pts.max(0)
                for tx in range(int(math.floor(ox - pmin[0])), int(math.ceil(ox + nx - pmax[0])) + 1):
                    for ty in range(int(math.floor(oy - pmin[1])), int(math.ceil(oy + ny - pmax[1])) + 1):
                        p = pts + np.array([tx, ty])
                        pg = Polygon([tuple(q) for q in p])
                        m = poly_tris(pg, centers)
                        nout = bin(m & ~container).count('1')
                        if nout > out_budget or not (m & container):
                            continue
                        n = bin(m).count('1')
                        if abs(n / 4.0 - AREA_ALL[shape]) > 1e-9:
                            continue
                        out.append(dict(shape=shape, mirror=mir, k=k, t=(tx, ty),
                                        poly=pg, mask=m, area=AREA_ALL[shape], ntri=n, out=nout))
    return out


def solve(space, target, ox, oy, nx, ny, max_sol=300, node_limit=600000,
          out_budget=1, only=None):
    """在 space（可放区，通常比目标外扩一点）里摆 7 块板，尽量贴合 target。

    space  : 允许摆放的区域（硬约束：整块板必须落在里面）
    target : 参考轮廓（软目标：越贴合越好，用来打分）
    """
    centers = tri_centers(ox, oy, nx, ny)
    pls = build_placements(ox, oy, nx, ny, space, centers, only=only, out_budget=out_budget)
    by_shape = {}
    for p in pls:
        by_shape.setdefault(p['shape'], []).append(p)
    rem0 = ['T1', 'T2', 'T3', 'S', 'T4', 'T5', 'P']
    sols = []
    nodes = [0]
    AL = ALIAS

    def dfs(rem, covered, skipped, chosen):
        nodes[0] += 1
        if len(sols) >= max_sol or nodes[0] > node_limit:
            return
        if not rem:
            if sum(c['ntri'] for c in chosen) == 64:
                sols.append(list(chosen))
            return
        uncovered = target & ~covered & ~skipped
        if not uncovered:
            # 参考轮廓已铺满，剩余板只能往外铺：直接收尾
            for shape in rem:
                pass
            dfs([], covered, skipped, chosen)
            return
        t = (uncovered & -uncovered).bit_length() - 1
        moved = False
        for shape in sorted(set(rem), key=lambda s: -AREA_ALL[s]):
            key = AL.get(shape, shape)
            for p in by_shape.get(key, []):
                if not ((p['mask'] >> t) & 1):
                    continue
                if p['mask'] & covered:
                    continue
                r2 = list(rem)
                r2.remove(shape)
                moved = True
                dfs(r2, covered | p['mask'], skipped, chosen + [p])
                if len(sols) >= max_sol or nodes[0] > node_limit:
                    return
        if not moved:
            dfs(rem, covered, skipped | (1 << t), chosen)

    dfs(rem0, 0, 0, [])
    return sols, nodes[0], pls


def container_from_polygon_rings(rings, pad=1):
    outer = [tuple(map(float, p)) for p in rings[0]]
    holes = [[tuple(map(float, p)) for p in h] for h in rings[1:]]
    poly = Polygon(outer, holes)
    if not poly.is_valid:
        poly = poly.buffer(0)
    minx, miny, maxx, maxy = poly.bounds
    ox, oy = int(math.floor(minx)), int(math.floor(miny))
    nx = int(math.ceil(maxx)) - ox + pad
    ny = int(math.ceil(maxy)) - oy + pad
    centers = tri_centers(ox, oy, nx, ny)
    cells = poly_tris(poly, centers)
    return poly, cells, ox, oy, nx, ny, centers


def container_from_polygon(P, pad=1):
    poly = Polygon([tuple(map(float, p)) for p in P])
    if not poly.is_valid:
        poly = poly.buffer(0)
    minx, miny, maxx, maxy = poly.bounds
    ox, oy = int(math.floor(minx)), int(math.floor(miny))
    nx = int(math.ceil(maxx)) - ox + pad
    ny = int(math.ceil(maxy)) - oy + pad
    centers = tri_centers(ox, oy, nx, ny)
    cells = poly_tris(poly, centers)
    return poly, cells, ox, oy, nx, ny, centers
