# -*- coding: utf-8 -*-
"""求解 + 渲染 + 与参考图比对（掩码 IoU）"""
import cv2
import numpy as np
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import pieces_alpha as PA
import exact as EX
from tanref3.shapes import SHAPES, AREA
from shapely.geometry import Polygon
from shapely.ops import unary_union

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
os.makedirs(OUT, exist_ok=True)

GAME_COLORS = {
    'T1': '#FF8A5B', 'T2': '#4FA8E0', 'T3': '#63C88B',
    'S': '#F47FA8', 'T4': '#C08BE8', 'T5': '#E8C24F', 'P': '#4FC9C0',
}


def hex2bgr(h):
    h = h.lstrip('#')
    return np.array([int(h[4:6], 16), int(h[2:4], 16), int(h[0:2], 16)], np.uint8)


def s_to_px(shape, deg, mirror, t, u, center, fam):
    """S 帧（整数格）-> 像素坐标"""
    d2 = deg - 45 if fam == 'B' else deg
    base = EX.base_pts(shape, d2, mirror) + np.array(t, float)
    th = EX.frame_rot(fam)
    # p_img = c + u * R(-th) * p_S ；R(-th) 即把 S 帧转回图像帧
    M = EX.rot(-th)
    p = (M @ base.T).T * u + np.array(center)
    return p


def render_solution(r, fname, scale=8):
    sub = r['sub']
    u = r['u']
    center = r['center']
    fam = r['fam']
    H, W = sub.shape[:2]
    pieces = r['best']['chosen']

    def draw(canvas, filled):
        for pc in pieces:
            p = s_to_px(pc['f']['shape'], pc['f']['deg'], pc['f']['mirror'], pc['t'], u, center, fam)
            pts = np.round(p).astype(np.int32)
            if filled:
                col = hex2bgr(GAME_COLORS.get(pc['f']['shape'], '#888888'))
                cv2.fillPoly(canvas, [pts], col.tolist())
            cv2.polylines(canvas, [pts], True, (40, 40, 40), 1, cv2.LINE_AA)

    # 左：参考原图 + 黑色轮廓；右：按游戏配色填充；中：纯剪影
    left = sub.copy()
    for pc in pieces:
        p = s_to_px(pc['f']['shape'], pc['f']['deg'], pc['f']['mirror'], pc['t'], u, center, fam)
        cv2.polylines(left, [np.round(p).astype(np.int32)], True, (0, 0, 0), 1)
    mid = np.full_like(sub, 255)
    sil = np.full((H, W), 255, np.uint8)
    for pc in pieces:
        p = s_to_px(pc['f']['shape'], pc['f']['deg'], pc['f']['mirror'], pc['t'], u, center, fam)
        cv2.fillPoly(sil, [np.round(p).astype(np.int32)], 40)
    mid = cv2.cvtColor(sil, cv2.COLOR_GRAY2BGR)
    right = np.full_like(sub, 255)
    draw(right, True)

    row = np.hstack([left, mid, right])
    big = cv2.resize(row, None, fx=scale, fy=scale, interpolation=cv2.INTER_NEAREST)
    cv2.imwrite(os.path.join(OUT, fname), big)
    return big


def mask_iou(r):
    """严格解铺出的剪影 vs 参考图掩码"""
    sub = r['sub']
    u = r['u']
    H, W = sub.shape[:2]
    m = PA.letter_mask(sub)
    got = np.zeros((H, W), np.uint8)
    for pc in r['best']['chosen']:
        p = s_to_px(pc['f']['shape'], pc['f']['deg'], pc['f']['mirror'], pc['t'], r['u'], r['center'], r['fam'])
        cv2.fillPoly(got, [np.round(p).astype(np.int32)], 1)
    md = cv2.dilate(m, np.ones((3, 3), np.uint8))
    inter = int((got & md).sum())
    uni = int(((got > 0) | (m > 0)).sum())
    return inter / float(uni), int(got.sum()), int(m.sum())


if __name__ == '__main__':
    names = sys.argv[1:] or ['E']
    for nm in names:
        r = EX.solve_letter(nm, verbose=(len(names) == 1))
        if not r['ok']:
            print('%-2s FAIL %s' % (nm, r['why']))
            continue
        iou, a1, a2 = mask_iou(r)
        print('%-2s 解数 %d  剪影IoU %.3f  面积(解/掩码) %d/%d' % (nm, len(r['sols']), iou, a1, a2))
        render_solution(r, 'sol_%s.png' % nm, scale=6)
