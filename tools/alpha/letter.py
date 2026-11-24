# -*- coding: utf-8 -*-
"""字母 -> 严格七巧板拼法（轮廓当容器，7 块板做整数精确覆盖）。

输出：
  · 剪影多边形（S 帧整数坐标）= 7 块板的并集，面积严格 16
  · 每块板的 (shape, 旋转, 平移)，可换算成游戏需要的 x/y/angle/flipped
  · 对照图（参考图 | 剪影 | 配色拼块）
"""
import cv2
import numpy as np
import math
import os
import sys
import json

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.dirname(os.path.dirname(HERE)))
import pieces_alpha as PA
import cover as CV
import sil as SIL
from tanref3.shapes import SHAPES
from shapely.geometry import Polygon
from shapely.ops import unary_union

OUT = os.path.join(HERE, 'out')
os.makedirs(OUT, exist_ok=True)

GAME_COLORS = {
    'T1': '#FF8A5B', 'T2': '#4FA8E0', 'T3': '#63C88B', 'S': '#F47FA8',
    'T4': '#C08BE8', 'T5': '#E8C24F', 'P': '#4FC9C0',
}
SLOT_OF = {'T1': 'T1', 'T2': 'T2', 'T3': 'T3', 'S': 'S', 'T4': 'T4', 'T5': 'T5', 'P': 'P'}


def hex2bgr(h):
    h = h.lstrip('#')
    return (int(h[4:6], 16), int(h[2:4], 16), int(h[0:2], 16))


def s_to_px(P, u, center=None):
    """S 帧 -> 像素（反向旋转 +45°）。S 帧是绝对坐标（只除以了 u），不再加中心。"""
    a = math.radians(45.0)
    ca, sa = math.cos(a), math.sin(a)
    M = np.array([[ca, -sa], [sa, ca]])
    return (M @ np.asarray(P, float).T).T * u


def letter_rings(nm):
    """取出参考字母的外轮廓与孔洞（外轮廓在前），并在 S 帧做面积归一到 16"""
    sub = PA.crop_letter(nm)
    m = PA.letter_mask(sub)
    cnts, hier = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    hier = hier[0]
    outers = [i for i in range(len(cnts)) if hier[i][3] == -1]
    ci = max(outers, key=lambda i: cv2.contourArea(cnts[i]))
    c = cnts[ci]
    area = cv2.contourArea(c)
    u = math.sqrt(area / 16.0)
    eps = 0.006 * cv2.arcLength(c, True)
    ap = cv2.approxPolyDP(c, eps, True).reshape(-1, 2).astype(float)
    holes = []
    child = hier[ci][2]
    while child != -1:
        if cv2.contourArea(cnts[child]) > area * 0.02:
            h = cv2.approxPolyDP(cnts[child], eps, True).reshape(-1, 2).astype(float)
            holes.append(h)
        child = hier[child][0]
    return sub, m, u, ap, holes


def poly_area(P):
    return 0.5 * abs(np.dot(P[:, 0], np.roll(P[:, 1], -1)) - np.dot(P[:, 1], np.roll(P[:, 0], -1)))


def letter_container(nm, verbose=False):
    sub, m, u, ap, hole_aps = letter_rings(nm)
    S = SIL.to_s_frame(ap, u)
    Sh = [SIL.to_s_frame(h, u) for h in hole_aps]
    # 本体面积 = 外轮廓 - 孔洞；归一到 16
    A0 = poly_area(S) - sum(poly_area(h) for h in Sh)
    k0 = math.sqrt(16.0 / A0)
    # 绕字母中心缩放（绕原点缩放会把整个字母挪走）
    C = S.mean(0)
    best = None
    for i in range(-16, 17):
        k = k0 * (1.0 + i * 0.004)
        Ss = np.round((S - C) * k + C)
        hs = [np.round((h - C) * k + C) for h in Sh]
        ring = [Ss] + hs
        body = Polygon(Ss, list(hs)) if hs else Polygon(Ss)
        if not body.is_valid or body.area < 1:
            continue
        poly, cells, ox, oy, nx, ny, ctr = CV.container_from_polygon_rings(ring)
        n = bin(cells).count('1')
        score = (abs(n - 64), abs(k - k0))
        if best is None or score < best[0]:
            best = (score, dict(name=nm, sub=sub, mask=m, u=u, S=Ss, holes=hs,
                                poly=poly, cells=cells, ox=ox, oy=oy, nx=nx, ny=ny, ctr=ctr,
                                tris=n, k=k))
    if best is None:
        Ss = np.round((S - C) * k0 + C)
        hs = [np.round((h - C) * k0 + C) for h in Sh]
        poly, cells, ox, oy, nx, ny, ctr = CV.container_from_polygon_rings([Ss] + hs)
        best = ((abs(bin(cells).count('1') - 64), 0), dict(name=nm, sub=sub, mask=m, u=u, S=Ss,
                holes=hs, poly=poly, cells=cells, ox=ox, oy=oy, nx=nx, ny=ny, ctr=ctr,
                tris=bin(cells).count('1'), k=k0))
    r = best[1]
    if verbose:
        print('  %-2s 顶点%2d 孔洞%d 面积 %.2f -> %d 个小三角 (缩放 %.3f)'
              % (nm, len(r['S']), len(r['holes']), r['poly'].area, r['tris'], r['k']))
    return r


def diag_edges(U):
    """并集边界上 45°/135° 边的数量（越少越「横平竖直」）"""
    rings = []
    if U.geom_type == 'Polygon':
        rings = [U.exterior] + list(U.interiors)
    else:
        for g in getattr(U, 'geoms', []):
            rings += [g.exterior] + list(g.interiors)
    n = 0
    for r in rings:
        c = list(r.coords)
        for a, b in zip(c, c[1:]):
            dx, dy = b[0] - a[0], b[1] - a[1]
            if abs(abs(dx) - abs(dy)) < 1e-6 and abs(dx) > 1e-6:
                n += 1
    return n


def solve_letter(nm, max_sol=6, verbose=True):
    L = letter_container(nm, verbose=verbose)
    # 可放区 = 参考轮廓本身；每块板允许极轻微越界（越界数计入评分）
    tgt = L['cells']
    sols, nodes, pls = CV.solve(tgt, tgt, L['ox'], L['oy'], L['nx'], L['ny'],
                               max_sol=max_sol, node_limit=600000, out_budget=2)
    if verbose:
        print('  %s: 候选摆放 %d, 解 %d, 节点 %d' % (nm, len(pls), len(sols), nodes))
    if not sols:
        return dict(L, ok=False, why='容器内无精确覆盖')
    # 评分：未覆盖的容器小三角越少越好；并集面数越少越好
    scored = []
    for s in sols:
        cov = 0
        out = 0
        for c in s:
            cov |= c['mask']
        left = bin(L['cells'] & ~cov).count('1')
        out = bin(cov & ~L['cells']).count('1')
        U = unary_union([c['poly'] for c in s])
        holes = len(getattr(U, 'interiors', [])) if U.geom_type == 'Polygon' else 99
        mult = 0 if U.geom_type == 'Polygon' else 1
        dg = diag_edges(U)
        dev = (0 if not mult else 30) + left + out      # 与参考轮廓的偏差
        # 该有内孔的字母（A/B/D/O/P/Q/R）不罚孔；其余字母出现孔洞视为拼合缺陷
        hole_pen = 0 if (holes == 0 or nm in 'ABDOPQR') else 200 * holes
        # 紧凑度：v0.34 单位缩放 107→96，1u 从 77.7px 缩到 69.7px，
        # 726px 卡纸能容下 9u 左右的剪影（旧版 6.2u 是 702px 棋盘留下的口径）。
        # 放宽到 8.6u/8.0u：同样的参考轮廓不再被强行压扁，字母能保持原本的宽高比。
        bb = U.bounds
        maxdim = max(bb[2] - bb[0], bb[3] - bb[1]) / L['u']
        size_pen = 30 * max(0.0, maxdim - 8.6) + 2 * max(0.0, maxdim - 8.0)
        score = dev + 2 * dg + hole_pen + size_pen        # 排序用
        scored.append((score, dev, left, out, s, U, holes, mult, dg))
    scored.sort(key=lambda z: z[0])
    score, dev, left, out, best, U, holes, mult, dg = scored[0]
    if verbose:
        print('  最优：缺口 %d + 越界 %d = %d 个小三角，孔洞 %d，并集面积 %.3f'
              % (left, out, left + out, holes, U.area))
    return dict(L, ok=True, sols=sols, best=best, union=U, left=left, out=out,
                dev=dev, score=score, holes=holes, nodes=nodes, diag=dg, mult=mult)


def render(r, fname, scale=6):
    sub = r['sub']
    u = r['u']
    H, W = sub.shape[:2]
    center = np.array([W / 2.0, H / 2.0])
    pieces = r['best']

    def pts_px(c):
        p = s_to_px(np.array(c['poly'].exterior.coords)[:-1], u, center)
        return np.round(p).astype(np.int32)

    left = sub.copy()
    for c in pieces:
        cv2.polylines(left, [pts_px(c)], True, (30, 30, 30), 1, cv2.LINE_AA)
    sil = np.full((H, W), 255, np.uint8)
    for c in pieces:
        cv2.fillPoly(sil, [pts_px(c)], 30)
    mid = cv2.cvtColor(sil, cv2.COLOR_GRAY2BGR)
    right = np.full_like(sub, 255)
    for c in pieces:
        cv2.fillPoly(right, [pts_px(c)], hex2bgr(GAME_COLORS[c['shape']]))
        cv2.polylines(right, [pts_px(c)], True, (40, 40, 40), 1, cv2.LINE_AA)
    row = np.hstack([left, mid, right])
    big = cv2.resize(row, None, fx=scale, fy=scale, interpolation=cv2.INTER_NEAREST)
    cv2.imwrite(os.path.join(OUT, fname), big)
    return big


def to_level(r):
    """导出成游戏关卡需要的形状（1000 坐标系，交给 build 脚本再缩放）"""
    u = r['u']
    center = np.array([r['sub'].shape[1] / 2.0, r['sub'].shape[0] / 2.0])
    rings = [np.array(r['union'].exterior.coords)[:-1]]
    rings += [np.array(h.coords)[:-1] for h in getattr(r['union'], 'interiors', [])]
    out = []
    for ring in rings:
        out.append([list(map(float, q)) for q in s_to_px(ring, u, center) / u])  # u 单位
    pieces = []
    for c in r['best']:
        pieces.append(dict(shape=c['shape'], k=c['k'], mirror=bool(c['mirror']), t=list(c['t'])))
    return dict(name=r['name'], outline=out, pieces=pieces)


if __name__ == '__main__':
    names = sys.argv[1:] or ['E']
    sheet = []
    for nm in names:
        r = solve_letter(nm)
        if not r['ok']:
            print('%-2s FAIL %s' % (nm, r['why']))
            continue
        big = render(r, 'let_%s.png' % nm)
        sheet.append(big)
        print('%-2s OK 剩余%d 面积%.2f' % (nm, r['left'], r['union'].area))
    if len(sheet) > 1:
        h = max(s.shape[0] for s in sheet)
        pad = [np.pad(s, ((0, h - s.shape[0]), (0, 0), (0, 0)), constant_values=255) for s in sheet]
        cv2.imwrite(os.path.join(OUT, 'letters_sheet.png'), np.hstack(pad))
        print('sheet ->', os.path.join(OUT, 'letters_sheet.png'))
