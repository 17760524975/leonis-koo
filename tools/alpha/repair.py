# -*- coding: utf-8 -*-
"""轮廓修复：在参考轮廓附近找「能精确铺满 16、且外轮廓横平竖直」的版本。

做法：
  1) 以吸附后的整数轮廓为起点
  2) 逐个顶点做 ±1 格微调，面积必须仍是 64 个小三角
  3) 每个候选都用精确覆盖求解；要求 dev=0（严丝合缝）
  4) 用「与参考剪影的 IoU」+「斜边数」排序，取最好的
"""
import cv2
import numpy as np
import math
import os
import sys
import json
import itertools

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.dirname(os.path.dirname(HERE)))
import letter as LT
import cover as CV
from shapely.geometry import Polygon
from shapely.ops import unary_union

OUT = os.path.join(HERE, 'out')
os.makedirs(OUT, exist_ok=True)


def area_u(P):
    return 0.5 * abs(np.dot(P[:, 0], np.roll(P[:, 1], -1)) - np.dot(P[:, 1], np.roll(P[:, 0], -1)))


def try_poly(ring, holes=(), budget_sol=6):
    poly, cells, ox, oy, nx, ny, ctr = CV.container_from_polygon_rings([ring] + list(holes))
    n = bin(cells).count('1')
    if n != 64:
        return None
    sols, nodes, pls = CV.solve(cells, cells, ox, oy, nx, ny, max_sol=budget_sol,
                               node_limit=120000, out_budget=0)
    if not sols:
        return None
    s = sols[0]
    U = unary_union([c['poly'] for c in s])
    if abs(U.area - 16) > 1e-6:
        return None
    return dict(poly=poly, cells=cells, ox=ox, oy=oy, nx=nx, ny=ny, sol=s, U=U, nodes=nodes)


def mask_iou(U, u, mask):
    H, W = mask.shape
    img = np.zeros((H, W), np.uint8)
    for poly in (U.geoms if U.geom_type != 'Polygon' else [U]):
        p = np.round(LT.s_to_px(np.array(poly.exterior.coords), u)).astype(np.int32)
        cv2.fillPoly(img, [p], 1)
        for h in poly.interiors:
            q = np.round(LT.s_to_px(np.array(h.coords), u)).astype(np.int32)
            cv2.fillPoly(img, [q], 0)
    inter = int((img & (mask > 0)).sum())
    uni = int(((img > 0) | (mask > 0)).sum())
    return inter / float(uni) if uni else 0.0


def repair(nm, max_variants=140, verbose=True):
    L = LT.letter_container(nm)
    base = L['S'].copy()
    u = L['u']
    mask = L['mask']
    holes = L['holes']
    if holes:
        return None  # 带孔洞的先不修（孔洞位置也要跟着动）
    A0 = area_u(base)
    cands = []

    def add(ring, tag):
        if abs(area_u(ring) - 16) > 0.6:
            return
        r = try_poly(ring)
        if r is None:
            return
        iou = mask_iou(r['U'], u, mask)
        dg = LT.diag_edges(r['U'])
        cands.append(dict(ring=ring, iou=iou, diag=dg, res=r, tag=tag))

    add(base, 'base')
    n = len(base)
    for i in range(n):
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            r2 = base.copy()
            r2[i] = r2[i] + np.array([dx, dy])
            add(r2, 'v%d%+d%+d' % (i, dx, dy))
        if len(cands) >= max_variants:
            break
    if not cands:
        return None
    # 先按「无斜边 + IoU 高」排序
    cands.sort(key=lambda z: (z['diag'], -z['iou']))
    best = cands[0]
    if verbose:
        print('%-2s 候选 %d 个；最优 diag=%d IoU=%.3f (%s)'
              % (nm, len(cands), best['diag'], best['iou'], best['tag']))
    return dict(name=nm, sub=L['sub'], mask=mask, u=u, ring=best['ring'], holes=[],
                res=best['res'], iou=best['iou'], diag=best['diag'],
                cands=len(cands))


if __name__ == '__main__':
    names = sys.argv[1:] or list('EFHILTU')
    ok = []
    for nm in names:
        r = repair(nm)
        if r:
            ok.append(nm)
    print('修复成功:', ' '.join(ok) if ok else '(无)')
