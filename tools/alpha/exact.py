# -*- coding: utf-8 -*-
"""把颜色拟合的结果落格成严格七巧板解（v2：朝向候选 + 全局一致性）。

关键事实：
  · 每块板只可能落在两族朝向上：A 族 deg ≡ 0 (mod 90)（斜边水平/垂直），
    B 族 deg ≡ 45 (mod 90)（直角边水平/垂直）。两族格点不可通约，所以一个
    字母里 7 块板必然同族 —— 这正好用来纠正个别小三角的朝向误判。
  · B 族把整幅图旋转 -45° 后，板型顶点与平移都变成整数；A 族本身就是整数格。
  · 于是「平移四舍五入 + ±1 格枚举 + 精确校验（面积 16 / 两两不重叠）」就能
    得到严格解，无需任何启发式搜索。
"""
import cv2
import numpy as np
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import pieces_alpha as PA
from tanref3.shapes import SHAPES, AREA
from shapely.geometry import Polygon
from shapely.ops import unary_union

FAMILIES = {'A': [0, 90, 180, 270], 'B': [45, 135, 225, 315]}


def rot(deg):
    a = math.radians(deg)
    ca, sa = math.cos(a), math.sin(a)
    return np.array([[ca, -sa], [sa, ca]])


def base_pts(shape, deg, mirror):
    p = np.array(SHAPES[shape], float)
    if mirror:
        p = p * np.array([-1.0, 1.0])
    return (rot(deg) @ p.T).T


def frame_rot(fam):
    """把图像坐标转到整数格所需的整体旋转"""
    return -45.0 if fam == 'B' else 0.0


def fit_region_all(rmask, u, shapes, search=3):
    """返回该区域内所有 (shape, deg, mirror, offset, iou) 候选，按 IoU 降序"""
    H, W = rmask.shape
    ys, xs = np.nonzero(rmask)
    if len(xs) == 0:
        return []
    cx, cy = xs.mean(), ys.mean()
    tgt_n = float(rmask.sum())
    res = []
    for shape in shapes:
        for mir in ((False, True) if shape == 'P' else (False,)):
            for deg in range(0, 360, 45):
                pts = PA.poly_of(shape, deg, mir, (0, 0), u)
                o0 = (cx - pts.mean(0)[0], cy - pts.mean(0)[1])
                best = None
                for dx in range(-search, search + 1):
                    for dy in range(-search, search + 1):
                        o = (o0[0] + dx, o0[1] + dy)
                        m = np.zeros((H, W), np.uint8)
                        cv2.fillPoly(m, [np.round(PA.poly_of(shape, deg, mir, o, u)).astype(np.int32)], 1)
                        inter = int((m & rmask).sum())
                        if inter == 0:
                            continue
                        uni = int(m.sum()) + int(tgt_n) - inter
                        iou = inter / float(uni) if uni else 0.0
                        if best is None or iou > best[0]:
                            best = (iou, o)
                if best:
                    res.append(dict(shape=shape, deg=deg, mirror=mir, offset=best[1], iou=best[0]))
    res.sort(key=lambda z: -z['iou'])
    return res


def exactify(cands, u, center, fam, regions=None, tol=1, node_limit=120000, max_sol=40, k_per_piece=2):
    """cands: 每块板一个候选列表（已按 IoU 降序、已按族过滤）；regions: 对应的颜色区域掩码"""
    R = rot(frame_rot(fam))
    opts_all = []
    for cl in cands:
        opts = []
        for f in cl[:k_per_piece]:
            d2 = f['deg'] + frame_rot(fam) * 1.0  # 图像角 + 帧旋转（旋转 -45 即 deg-45）
            d2 = f['deg'] - 45 if fam == 'B' else f['deg']
            base = np.round(base_pts(f['shape'], d2, f['mirror'])).astype(int)
            T = R @ (np.array(f['offset'], float) - np.array(center)) / u
            opts.append(dict(f=f, base=base, T=T))
        opts_all.append(opts)
    order = sorted(range(len(opts_all)), key=lambda i: -AREA[opts_all[i][0]['f']['shape']])
    sols = []
    nodes = [0]

    def dfs(k, polys, chosen):
        nodes[0] += 1
        if len(sols) >= max_sol or nodes[0] > node_limit:
            return
        if k == len(order):
            U = unary_union(polys)
            if abs(U.area - 16) > 1e-6:
                return
            # 必须整体连通（点接触会得到 MultiPolygon，物理上不是一块儿）
            if U.geom_type != 'Polygon':
                return
            # 用「落地平移」下的真实 IoU 打分：每块板是否盖住了自己那块颜色
            ious = []
            for i, c in zip(order, chosen):
                f = c['f']
                rm = None if regions is None else regions[i]
                if rm is None:
                    ious.append(f['iou'])
                else:
                    ious.append(iou_at(f['shape'], f['deg'], f['mirror'], c['t'], u, center, fam, rm))
            sols.append(dict(union=U, score=float(np.mean(ious)), ious=ious, chosen=list(chosen)))
            return
        i = order[k]
        for o in opts_all[i]:
            t0 = np.round(o['T']).astype(int)
            cand_pos = []
            for dx in range(-tol, tol + 1):
                for dy in range(-tol, tol + 1):
                    t = (int(t0[0]) + dx, int(t0[1]) + dy)
                    pts = o['base'] + np.array(t)
                    pg = Polygon([tuple(map(float, q)) for q in pts])
                    if any(pg.intersection(q).area > 1e-9 for q in polys):
                        continue
                    d = (t[0] - o['T'][0]) ** 2 + (t[1] - o['T'][1]) ** 2
                    cand_pos.append((d, t, pg))
            cand_pos.sort(key=lambda z: z[0])
            for d, t, pg in cand_pos:
                dfs(k + 1, polys + [pg], chosen + [dict(o, t=t, poly=pg)])
                if len(sols) >= max_sol or nodes[0] > node_limit:
                    return

    dfs(0, [], [])
    return sols, nodes[0]


def iou_at(shape, deg, mirror, t, u, center, fam, rmask):
    d2 = deg - 45 if fam == 'B' else deg
    base = base_pts(shape, d2, mirror) + np.array(t, float)
    M = rot(-frame_rot(fam))
    p = (M @ base.T).T * u + np.array(center)
    H, W = rmask.shape
    m = np.zeros((H, W), np.uint8)
    cv2.fillPoly(m, [np.round(p).astype(np.int32)], 1)
    inter = int((m & rmask).sum())
    uni = int((m > 0).sum()) + int(rmask.sum()) - inter
    return inter / float(uni) if uni else 0.0


def solve_letter(nm, u=None, verbose=True, k_per_piece=2):
    sub = PA.crop_letter(nm)
    m = PA.letter_mask(sub)
    pal = PA.palette_of(sub, m)
    regs = [r for r in PA.region_masks(sub, m, pal) if r[2] > 60]
    if u is None:
        # 用外轮廓面积估 u：板缝像素虽然不在任何颜色区域里，但属于字母本体
        cnts, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        a_outer = max(cv2.contourArea(c) for c in cnts)
        u = math.sqrt(a_outer / 16.0)
    H, W = m.shape
    center = np.array([W / 2.0, H / 2.0])
    per_region = []
    for (col, rm, ar) in regs:
        a = ar / u / u
        shapes = [s for s in ['T1', 'T3', 'S', 'T4', 'P'] if abs(AREA[s] - a) / AREA[s] < 0.42]
        if not shapes:
            continue
        cand = fit_region_all(rm, u, shapes)
        if not cand:
            continue
        per_region.append(dict(color=col, mask=rm, area_px=ar, cand=cand))
    if len(per_region) != 7:
        return dict(name=nm, ok=False, why='板块数 %d != 7' % len(per_region), u=u, per_region=per_region)
    # 用「每块板最优朝向」的多数票决定族
    votes = {'A': 0, 'B': 0}
    for r in per_region:
        votes['A' if r['cand'][0]['deg'] % 90 == 0 else 'B'] += 1
    fam = 'B' if votes['B'] >= votes['A'] else 'A'
    # 每块板在该族里的候选
    cands = []
    for r in per_region:
        same = [c for c in r['cand'] if c['deg'] in FAMILIES[fam]]
        if not same:
            return dict(name=nm, ok=False, why='有板件不在 %s 族' % fam, u=u)
        cands.append(same)
    sols, nodes = exactify(cands, u, center, fam, regions=[r['mask'] for r in per_region],
                           k_per_piece=k_per_piece)
    if verbose:
        print('== %s u=%.2f 族=%s 解=%d 节点=%d' % (nm, u, fam, len(sols), nodes))
        for r in per_region:
            c = [x for x in r['cand'] if x['deg'] in FAMILIES[fam]][0]
            print('   %-2s deg%3d mir%d iou %.3f' % (c['shape'], c['deg'], c['mirror'], c['iou']))
    if not sols:
        return dict(name=nm, ok=False, why='无严格解', u=u, fam=fam, per_region=per_region)
    best = max(sols, key=lambda s: s['score'])
    return dict(name=nm, ok=True, u=u, fam=fam, sols=sols, best=best, sub=sub, center=center,
                per_region=per_region)


if __name__ == '__main__':
    nm = sys.argv[1] if len(sys.argv) > 1 else 'E'
    r = solve_letter(nm)
    if r['ok']:
        U = r['best']['union']
        print('   最优评分 %.3f  并集面积 %.4f  内环 %d' % (r['best']['score'], U.area, len(U.interiors)))
        for c in r['best']['chosen']:
            f = c['f']
            print('   %-2s deg%3d mir%d t=%s iou %.3f' % (f['shape'], f['deg'], f['mirror'], c['t'], f['iou']))
    else:
        print('FAIL:', r['why'])
