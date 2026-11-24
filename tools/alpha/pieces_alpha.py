# -*- coding: utf-8 -*-
"""从字母参考图里按颜色分离 7 块板，并用标准板型模板拟合出每块的位姿。

流程：
  1) 裁出单个字母，取饱和度足够的像素做掩码
  2) 用「颜色众数」找出该字母的 7 个真实纯色（不掺抗锯齿混色）
  3) 每个纯色 -> 一个连通区域 -> 一块板
  4) 按面积判定板型，再枚举 45°x8 旋转（+P 的镜像）与平移做 IoU 拟合
"""
import cv2
import numpy as np
import math
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) + '/..')
from tanref3.shapes import SHAPES, AREA, SLOTS  # noqa: E402

SRC = 'C:/Users/MicGu/Desktop/v2-cac270d3887f93a539ed2a408225a659_1440w.webp'
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
os.makedirs(OUT, exist_ok=True)


def crop_letter(nm):
    cells = json.load(open(os.path.join(HERE, 'cells26.json')))
    x, y, w, h = cells[nm][:4]
    img = cv2.imread(SRC)
    pad = 3
    return img[max(0, y - pad):y + h + pad, max(0, x - pad):x + w + pad].copy()


def letter_mask(sub):
    hsv = cv2.cvtColor(sub, cv2.COLOR_BGR2HSV)
    m = ((hsv[:, :, 1] > 70) & (hsv[:, :, 2] > 45)).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
    if n <= 1:
        return m
    big = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
    keep = np.zeros_like(m)
    keep[lab == big] = 1
    # 把被围住的孔洞也算作字母内部（孔洞在下一步按颜色被排除）
    return keep


def palette_of(sub, mask, k=8, min_d=32):
    """找该字母的真实纯色：先量化统计众数，再挑互相远离的 k 个峰"""
    q = (sub // 12) * 12
    px = q[mask > 0]
    if len(px) == 0:
        return []
    keys = px[:, 0].astype(np.int32) * 65536 + px[:, 1].astype(np.int32) * 256 + px[:, 2].astype(np.int32)
    uniq, cnt = np.unique(keys, return_counts=True)
    order = np.argsort(-cnt)
    cand = []
    for i in order:
        if cnt[i] < mask.sum() * 0.006:
            break
        B = int(uniq[i] // 65536)
        G = int((uniq[i] % 65536) // 256)
        R = int(uniq[i] % 256)
        if all((B - b) ** 2 + (G - g) ** 2 + (R - r) ** 2 > min_d ** 2 for b, g, r, _ in cand):
            cand.append((B, G, R, int(cnt[i])))
        if len(cand) >= k:
            break
    return cand


def region_masks(sub, mask, pal, tol=60):
    """每个纯色一个区域；返回 [(color, mask, area)]"""
    h, w = mask.shape
    flat = sub.reshape(-1, 3).astype(np.int32)
    best = np.full(len(flat), -1, np.int32)
    bestd = np.full(len(flat), 10 ** 9, np.float64)
    for i, (B, G, R, _) in enumerate(pal):
        d = (flat[:, 0] - B) ** 2 + (flat[:, 1] - G) ** 2 + (flat[:, 2] - R) ** 2
        sel = d < bestd
        bestd[sel] = d[sel]
        best[sel] = i
    best[bestd > tol * tol] = -1
    best[(mask.reshape(-1) == 0)] = -1
    lab = best.reshape(h, w)
    res = []
    for i, (B, G, R, _) in enumerate(pal):
        m = (lab == i).astype(np.uint8)
        n, cc, st, _ = cv2.connectedComponentsWithStats(m, 8)
        if n <= 1:
            continue
        j = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
        mm = np.zeros_like(m)
        mm[cc == j] = 1
        # 填补该区域内的小孔（抗锯齿造成的黑缝）
        cnts, _ = cv2.findContours(mm, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        filled = np.zeros_like(mm)
        cv2.drawContours(filled, cnts, -1, 1, -1)
        res.append(((B, G, R), filled, int(filled.sum())))
    return res


def poly_of(shape, deg, mirror, offset, u, n_sub=1):
    """板型多边形的像素坐标（deg 为逆时针角度，mirror 只对 P 有意义）"""
    pts = np.array(SHAPES[shape], np.float64)
    if mirror:
        pts = pts * np.array([-1.0, 1.0])
    a = math.radians(deg)
    ca, sa = math.cos(a), math.sin(a)
    # 图像 y 轴向下：用 (x*ca - y*sa, x*sa + y*ca) 表示顺时针旋转 deg
    px = pts[:, 0] * ca - pts[:, 1] * sa
    py = pts[:, 0] * sa + pts[:, 1] * ca
    return np.stack([px * u + offset[0], py * u + offset[1]], 1)


def fit_region(rmask, u, shapes, search=4):
    """在 rmask 上找最佳 (shape, deg, mirror, offset)；score = IoU"""
    H, W = rmask.shape
    ys, xs = np.nonzero(rmask)
    if len(xs) == 0:
        return None
    cx, cy = xs.mean(), ys.mean()
    tgt_n = float(rmask.sum())
    best = None
    for shape in shapes:
        for mir in ((False, True) if shape == 'P' else (False,)):
            for deg in range(0, 360, 45):
                # 用质心对齐做初值，再局部搜索平移
                pts = poly_of(shape, deg, mir, (0, 0), u)
                mc = pts.mean(0)
                o0 = (cx - mc[0], cy - mc[1])
                for dx in range(-search, search + 1):
                    for dy in range(-search, search + 1):
                        o = (o0[0] + dx, o0[1] + dy)
                        m = np.zeros((H, W), np.uint8)
                        cv2.fillPoly(m, [np.round(poly_of(shape, deg, mir, o, u)).astype(np.int32)], 1)
                        inter = int((m & rmask).sum())
                        if inter == 0:
                            continue
                        uni = int(m.sum()) + int(tgt_n) - inter
                        iou = inter / float(uni) if uni else 0.0
                        if best is None or iou > best['iou']:
                            best = dict(shape=shape, deg=deg, mirror=mir, offset=o, iou=iou,
                                        area=int(m.sum()))
    return best


def analyze(nm, verbose=True):
    sub = crop_letter(nm)
    m = letter_mask(sub)
    pal = palette_of(sub, m)
    regs = region_masks(sub, m, pal)
    tot = float(sum(r[2] for r in regs))
    u = math.sqrt(tot / 16.0)
    if verbose:
        print('== %s  region=%d  total=%.0fpx  u=%.2f' % (nm, len(regs), tot, u))
        for (col, rm, ar) in sorted(regs, key=lambda r: -r[2]):
            print('   color #%02X%02X%02X  area %5d px = %5.2f u2' % (col[2], col[1], col[0], ar, ar / u / u))
    out = []
    for (col, rm, ar) in sorted(regs, key=lambda r: -r[2]):
        a = ar / u / u
        cands = [s for s in ['T1', 'T3', 'S', 'T4', 'P'] if abs(AREA[s] - a) / AREA[s] < 0.38]
        if not cands:
            cands = sorted(['T1', 'T3', 'S', 'T4', 'P'], key=lambda s: abs(AREA[s] - a))[:2]
        r = fit_region(rm, u, cands)
        if r is None:
            continue
        r['color'] = '#%02X%02X%02X' % (col[2], col[1], col[0])
        r['area_u2'] = a
        r['off_u'] = ((r['offset'][0] - m.shape[1] / 2) / u, (r['offset'][1] - m.shape[0] / 2) / u)
        out.append(r)
        if verbose:
            print('   %-2s deg %3d mir %d  IoU %.3f  off_u (%6.2f,%6.2f)  %s'
                  % (r['shape'], r['deg'], r['mirror'], r['iou'], r['off_u'][0], r['off_u'][1], r['color']))
    return dict(name=nm, u=u, mask=m, sub=sub, pieces=out)


if __name__ == '__main__':
    nm = sys.argv[1] if len(sys.argv) > 1 else 'E'
    r = analyze(nm)
    vis = r['sub'].copy()
    for p in r['pieces']:
        pts = np.round(poly_of(p['shape'], p['deg'], p['mirror'], p['offset'], r['u'])).astype(np.int32)
        cv2.polylines(vis, [pts], True, (0, 0, 0), 1)
    big = cv2.resize(vis, None, fx=7, fy=7, interpolation=cv2.INTER_NEAREST)
    cv2.imwrite(os.path.join(OUT, 'fit_%s.png' % nm), big)
    print('saved', os.path.join(OUT, 'fit_%s.png' % nm))
