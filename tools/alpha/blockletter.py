# -*- coding: utf-8 -*-
"""块状字母：直接设计「面积恰好 16u² 的方格字形」，再让精确覆盖求解器铺 7 块板。

为什么不用参考图：参考图是插画，笔画宽 √2u、逐块面积偏差 ±12%，严格七巧板
根本铺不出来；按它归一化后，I/K/S/W 这些字母会被迫变形成团块。
这里反过来做 —— 先设计一个**形状上读得出、面积刚好 16** 的字形（单位方格拼），
再问求解器「能不能铺满」。能铺满的剪影天然等于 7 块板的并集，判定必然精确。

用法：python tools/alpha/blockletter.py
输出：out/block_<NAME>.png（三栏：字形 | 剪影 | 配色拼块）、out/block_solutions.json
"""
import json
import math
import os
import sys

import cv2
import numpy as np
from shapely.geometry import Polygon, box
from shapely.ops import unary_union

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import cover as CV

OUT = os.path.join(HERE, 'out')
os.makedirs(OUT, exist_ok=True)
COLORS = {'T1': '#FF8A5B', 'T2': '#4FA8E0', 'T3': '#63C88B', 'S': '#F47FA8',
          'T4': '#A87BE8', 'T5': '#FFC94D', 'P': '#4FC9C0'}
SCALE = 70          # 1u = 70px，仅用于出图


def from_rows(rows):
    """用字符画定义字形：'#' = 填一格，'.' = 空。返回 [(i,j)]（j 从下往上）"""
    cells = []
    h = len(rows)
    for r, line in enumerate(rows):
        y = h - 1 - r                       # 第一行在最上面
        for x, ch in enumerate(line):
            if ch == '#':
                cells.append((x, y))
    return cells


def cells_poly(cells):
    return unary_union([box(i, j, i + 1, j + 1) for i, j in cells])


def solve_cells(cells, name, max_sol=400):
    poly = cells_poly(cells)
    if poly.geom_type != 'Polygon' or poly.area != len(cells):
        return dict(ok=False, why='字形不连通或有重叠 (area=%s)' % poly.area, name=name)
    rings = [np.array(poly.exterior.coords)[:-1]] + [np.array(h.coords)[:-1] for h in poly.interiors]
    P, cells_mask, ox, oy, nx, ny, centers = CV.container_from_polygon_rings(rings)
    tris = bin(cells_mask).count('1')
    if tris != 64:
        return dict(ok=False, why='面积 %d 个小三角（需要 64 = 16u²）' % tris, name=name)
    sols, nodes, pls = CV.solve(cells_mask, cells_mask, ox, oy, nx, ny,
                                max_sol=max_sol, node_limit=800000, out_budget=0)
    if not sols:
        return dict(ok=False, why='无精确覆盖（节点 %d / 摆放 %d）' % (nodes, len(pls)), name=name)
    best = None
    for s in sols:
        U = unary_union([c['poly'] for c in s])
        if U.geom_type != 'Polygon':
            continue
        # 综合分：孔洞越少越好、内部拼缝越少越好
        holes = len(U.interiors)
        score = holes * 100 + len(s)
        if best is None or score < best[0]:
            best = (score, s, U)
    if best is None:
        return dict(ok=False, why='并集不连通', name=name)
    _, s, U = best
    return dict(ok=True, name=name, pieces=s, union=U, cells=cells, rings=rings,
                holes=len(U.interiors), nodes=nodes)


def render(r, size=None):
    cells = r['cells']
    xs = [c[0] for c in cells] + [c[0] + 1 for c in cells]
    ys = [c[1] for c in cells] + [c[1] + 1 for c in cells]
    x0, y0, x1, y1 = min(xs), min(ys), max(xs), max(ys)
    pad = 1
    W = int((x1 - x0 + pad * 2) * SCALE)
    H = int((y1 - y0 + pad * 2) * SCALE)

    def px(p):
        return [int((p[0] - x0 + pad) * SCALE), int((y1 + pad - p[1]) * SCALE)]

    # 左：目标字形
    left = np.full((H, W, 3), 255, np.uint8)
    for i, j in cells:
        cv2.rectangle(left, px((i, j + 1)), px((i + 1, j)), (60, 60, 60), -1)
    # 中：剪影
    mid = np.full((H, W, 3), 255, np.uint8)
    for g in [r['union']]:
        cv2.fillPoly(mid, [np.array([px(q) for q in g.exterior.coords[:-1]], np.int32)], (60, 60, 60))
        for h in g.interiors:
            cv2.fillPoly(mid, [np.array([px(q) for q in h.coords[:-1]], np.int32)], (255, 255, 255))
    # 右：配色拼块
    right = np.full((H, W, 3), 255, np.uint8)
    for c in r['pieces']:
        q = np.array([px(p) for p in list(c['poly'].exterior.coords)[:-1]], np.int32)
        cv2.fillPoly(right, [q], tuple(int(COLORS[c['shape']].lstrip('#')[i:i + 2], 16) for i in (4, 2, 0)))
        cv2.polylines(right, [q], True, (45, 45, 45), 1, cv2.LINE_AA)
    sheet = np.hstack([left, mid, right])
    cv2.putText(sheet, r['name'], (8, 26), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (20, 20, 20), 2, cv2.LINE_AA)
    path = os.path.join(OUT, 'block_%s.png' % r['name'])
    cv2.imwrite(path, sheet)
    return path


# ---------------- 字形设计（每格 1u，总数必须 16） ----------------
DESIGNS = {
    # T：6×2 横杠 + 2×2 立柱
    'T': ["######",
          "######",
          "..##..",
          "..##.."],
    # U：4×3，两臂粗 2、底厚 1
    'U': ["##..##",
          "##..##",
          "######"],
    # I：2×8 竖条（单位缩小后 8u 也放得下）
    'I': ["##", "##", "##", "##", "##", "##", "##", "##"],
    # H：3 高，两臂 2×3、横杠 2×2
    'H': ["##..##",
          "######",
          "##..##"],
    # O：5×5 外框、3×3 内孔（1u 薄环，测试能否铺）
    'O': ["#####",
          "#...#",
          "#...#",
          "#...#",
          "#####"],
    # C：4×5 开口环
    'C': ["####",
          "#...",
          "#...",
          "#...",
          "####"],
    # Z：上 4 格、下一格、再下一格、下 4 格
    'Z': ["####",
          "..##",
          "##..",
          "####"],
    # S：Z 的镜像
    'S': ["..##",
          ".##.",
          ".##.",
          "##.."],
}


def main(names=None):
    rows, sols = [], {}
    for nm in (names or DESIGNS):
        cells = from_rows(DESIGNS[nm])
        r = solve_cells(cells, nm)
        if not r['ok']:
            print('%-2s FAIL %s  面积=%d' % (nm, r['why'], len(cells)))
            continue
        r['u'] = 1.0
        p = render(r)
        sols[nm] = dict(name=nm, holes=r['holes'],
                        pieces=[dict(shape=c['shape'], pts=[[round(float(q[0]), 4), round(float(q[1]), 4)]
                                                            for q in list(c['poly'].exterior.coords)[:-1]])
                                for c in r['pieces']])
        print('%-2s OK 孔洞 %d 节点 %d -> %s' % (nm, r['holes'], r['nodes'], os.path.basename(p)))
        rows.append(nm)
    json.dump(sols, open(os.path.join(OUT, 'block_solutions.json'), 'w'), ensure_ascii=False)
    print('解出 %d / %d：%s' % (len(sols), len(names or DESIGNS), ', '.join(rows)))


if __name__ == '__main__':
    main(sys.argv[1:] or None)
