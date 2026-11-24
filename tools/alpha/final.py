# -*- coding: utf-8 -*-
"""最终样板：只输出通过校验的字母，生成对比图与可直接接入的关卡数据。"""
import cv2
import numpy as np
import math
import os
import sys
import json

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.dirname(os.path.dirname(HERE)))
import letter as LT

OUT = os.path.join(HERE, 'out')
os.makedirs(OUT, exist_ok=True)

GOOD_MAX_DEV = 26


def assemble(r):
    """把 7 块板在像素坐标下排好，并按参考图包围盒对齐"""
    m = r['mask']
    ys, xs = np.nonzero(m)
    # 保留浮点：几何必须是精确的七巧板尺寸，取整会引入 1% 形变
    polys = [np.array(LT.s_to_px(np.array(c['poly'].exterior.coords), r['u']), float)
             for c in r['best']]
    allp = np.vstack(polys)
    dx, dy = xs.min() - allp[:, 0].min(), ys.min() - allp[:, 1].min()
    return [p + np.array([dx, dy]) for p in polys]


def panels(r, nm, scale=6, label=True):
    sub = r['sub']
    H, W = sub.shape[:2]
    polys = assemble(r)
    left = sub.copy()
    for p in polys:
        cv2.polylines(left, [np.round(p).astype(np.int32)], True, (25, 25, 25), 1, cv2.LINE_AA)
    sil = np.full((H, W), 255, np.uint8)
    for p in polys:
        cv2.fillPoly(sil, [np.round(p).astype(np.int32)], 45)
    mid = cv2.cvtColor(sil, cv2.COLOR_GRAY2BGR)
    right = np.full_like(sub, 255)
    for c, p in zip(r['best'], polys):
        q = np.round(p).astype(np.int32)
        cv2.fillPoly(right, [q], LT.hex2bgr(LT.GAME_COLORS[c['shape']]))
        cv2.polylines(right, [q], True, (45, 45, 45), 1, cv2.LINE_AA)
    row = np.hstack([left, mid, right])
    big = cv2.resize(row, None, fx=scale, fy=scale, interpolation=cv2.INTER_NEAREST)
    if label:
        pad = np.full((40, big.shape[1], 3), 255, np.uint8)
        cv2.putText(pad, '%s   dev=%d' % (nm, r['dev']), (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.9, (35, 35, 35), 2, cv2.LINE_AA)
        big = np.vstack([pad, big])
    return big


def level_data(r):
    """导出：全部用「像素多边形的并集」为基准，再除以 u 归一 -> 以 u 为单位、包围盒从 0 起"""
    from shapely.geometry import Polygon
    from shapely.ops import unary_union
    polys = assemble(r)
    pgs = [Polygon([tuple(map(float, q)) for q in p]) for p in polys]
    U = unary_union(pgs)
    geoms = [U] if U.geom_type == 'Polygon' else list(U.geoms)
    allp = np.vstack([np.array(g.exterior.coords)[:-1] for g in geoms])
    org = allp.min(0)
    u = r['u']
    rings = []
    for g in geoms:
        rings.append([[(q[0] - org[0]) / u, (q[1] - org[1]) / u] for q in list(g.exterior.coords)[:-1]])
        for h in g.interiors:
            rings.append([[(q[0] - org[0]) / u, (q[1] - org[1]) / u] for q in list(h.coords)[:-1]])
    pieces = []
    for c, p in zip(r['best'], polys):
        pieces.append(dict(shape=c['shape'], mirror=bool(c['mirror']), k=int(c['k']),
                           pts=[[round((q[0] - org[0]) / u, 4), round((q[1] - org[1]) / u, 4)] for q in p]))
    return dict(name=r['name'], outline=rings, pieces=pieces, dev=r['dev'])


def main(names, max_sol=900):
    tiles, rows, sols = [], [], {}
    for nm in names:
        r = LT.solve_letter(nm, max_sol=max_sol, verbose=False)
        if not r['ok']:
            print('%-2s FAIL %s' % (nm, r['why']))
            rows.append((nm, None))
            continue
        if r['dev'] > GOOD_MAX_DEV:
            print('%-2s 质量不足 dev=%d，跳过' % (nm, r['dev']))
            rows.append((nm, r['dev']))
            continue
        img = panels(r, nm)
        cv2.imwrite(os.path.join(OUT, 'final_%s.png' % nm), img)
        tiles.append(img)
        sols[nm] = level_data(r)
        rows.append((nm, r['dev']))
        print('%-2s OK dev=%2d 缺口%d 越界%d 斜边%d 孔%d' % (nm, r['dev'], r['left'], r['out'], r['diag'], r['holes']))
    if tiles:
        h = max(t.shape[0] for t in tiles)
        w = max(t.shape[1] for t in tiles)
        tiles = [np.pad(t, ((0, h - t.shape[0]), (0, w - t.shape[1]), (0, 0)), constant_values=255) for t in tiles]
        cols = 3
        while len(tiles) % cols:
            tiles.append(np.full((h, w, 3), 255, np.uint8))
        cv2.imwrite(os.path.join(OUT, 'sample_sheet.png'),
                    np.vstack([np.hstack(tiles[i:i + cols]) for i in range(0, len(tiles), cols)]))
        print('样板拼版 ->', os.path.join(OUT, 'sample_sheet.png'))
    json.dump(sols, open(os.path.join(OUT, 'solutions.json'), 'w'), ensure_ascii=False)
    print('关卡数据 ->', os.path.join(OUT, 'solutions.json'), '共', len(sols), '个')
    return rows


if __name__ == '__main__':
    main(sys.argv[1:] or list('AEFHIKLMNOPRSTUVWXYZ'))
