# -*- coding: utf-8 -*-
"""批量：26 个字母 -> 严格七巧板拼法 + 对比图 + 汇总表"""
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
import pieces_alpha as PA

OUT = os.path.join(HERE, 'out')
os.makedirs(OUT, exist_ok=True)


def assembly_pts(r, c):
    return np.round(LT.s_to_px(np.array(c['poly'].exterior.coords), r['u'])).astype(np.int32)


def aligned_render(r, nm, scale=6, cols=3):
    """左：参考图；中：剪影；右：游戏配色。按包围盒对齐，避免吸附造成的整体平移。"""
    sub = r['sub']
    H, W = sub.shape[:2]
    m = r['mask']
    ys, xs = np.nonzero(m)
    bx0, by0, bx1, by1 = xs.min(), ys.min(), xs.max(), ys.max()
    polys = [assembly_pts(r, c) for c in r['best']]
    allp = np.vstack(polys)
    ax0, ay0 = allp.min(0)
    dx, dy = bx0 - ax0, by0 - ay0
    polys = [p + np.array([dx, dy]) for p in polys]

    left = sub.copy()
    for p in polys:
        cv2.polylines(left, [p], True, (20, 20, 20), 1, cv2.LINE_AA)
    sil = np.full((H, W), 255, np.uint8)
    for p in polys:
        cv2.fillPoly(sil, [p], 45)
    mid = cv2.cvtColor(sil, cv2.COLOR_GRAY2BGR)
    right = np.full_like(sub, 255)
    for c, p in zip(r['best'], polys):
        cv2.fillPoly(right, [p], LT.hex2bgr(LT.GAME_COLORS[c['shape']]))
        cv2.polylines(right, [p], True, (40, 40, 40), 1, cv2.LINE_AA)
    row = np.hstack([left, mid, right])
    big = cv2.resize(row, None, fx=scale, fy=scale, interpolation=cv2.INTER_NEAREST)
    # 顶部留白写字母
    pad = np.full((44, big.shape[1], 3), 255, np.uint8)
    cv2.putText(pad, nm, (8, 34), cv2.FONT_HERSHEY_SIMPLEX, 1.1, (30, 30, 30), 2, cv2.LINE_AA)
    return np.vstack([pad, big])


def main(names=None, max_sol=800):
    names = names or list('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
    rows = []
    tiles = []
    for nm in names:
        try:
            r = LT.solve_letter(nm, max_sol=max_sol, verbose=False)
        except Exception as e:
            print('%-2s ERR %s' % (nm, e))
            rows.append((nm, 'ERR', 0, 0, 0))
            continue
        if not r['ok']:
            print('%-2s FAIL %s (容器 %d 三角)' % (nm, r['why'], r.get('tris', -1)))
            rows.append((nm, 'FAIL', r.get('tris', -1), 0, 0))
            continue
        img = aligned_render(r, nm)
        cv2.imwrite(os.path.join(OUT, 'final_%s.png' % nm), img)
        tiles.append(img)
        print('%-2s OK  dev=%2d  缺口%d 越界%d 孔%d 三角%d'
              % (nm, r['dev'], r['left'], r['out'], r['holes'], r['tris']))
        rows.append((nm, 'OK', r['dev'], r['holes'], r['tris']))
    if tiles:
        h = max(t.shape[0] for t in tiles)
        w = max(t.shape[1] for t in tiles)
        tiles = [np.pad(t, ((0, h - t.shape[0]), (0, w - t.shape[1]), (0, 0)), constant_values=255) for t in tiles]
        cols = 3
        while len(tiles) % cols:
            tiles.append(np.full((h, w, 3), 255, np.uint8))
        lines = [np.hstack(tiles[i:i + cols]) for i in range(0, len(tiles), cols)]
        cv2.imwrite(os.path.join(OUT, 'letters_all.png'), np.vstack(lines))
        print('拼版 ->', os.path.join(OUT, 'letters_all.png'))
    json.dump(rows, open(os.path.join(OUT, 'report.json'), 'w'), indent=1)
    return rows


if __name__ == '__main__':
    args = sys.argv[1:]
    main(args if args else None)
