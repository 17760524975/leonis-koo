# -*- coding: utf-8 -*-
"""把参考图里每个字母的外轮廓取出来，旋转 -45° 落到整数格上（S 帧）。

为什么是 -45°：参考图里 7 块板都是「直角边水平/垂直」的朝向（B 族），
整幅图转 -45° 后板型顶点和轮廓顶点都变成整数，之后就能用整数精确覆盖求解。
"""
import cv2
import numpy as np
import math
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.dirname(os.path.dirname(HERE)))
import pieces_alpha as PA


def silhouette(nm, eps_ratio=0.008):
    sub = PA.crop_letter(nm)
    m = PA.letter_mask(sub)
    cnts, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    c = max(cnts, key=cv2.contourArea)
    area = cv2.contourArea(c)
    u = math.sqrt(area / 16.0)
    ap = cv2.approxPolyDP(c, eps_ratio * cv2.arcLength(c, True), True).reshape(-1, 2).astype(float)
    return ap, area, u, sub, m


def to_s_frame(P, u):
    """像素 -> S 帧（转 -45°，除以 u）；返回浮点坐标"""
    a = math.radians(-45.0)
    ca, sa = math.cos(a), math.sin(a)
    out = np.zeros_like(P)
    out[:, 0] = (P[:, 0] * ca - P[:, 1] * sa) / u
    out[:, 1] = (P[:, 0] * sa + P[:, 1] * ca) / u
    return out


def snap(P, q=1.0):
    return np.round(P / q) * q


def report(nm, verbose=True):
    ap, area, u, sub, m = silhouette(nm)
    S = to_s_frame(ap, u)
    Ss = snap(S)
    d = np.hypot(*(S - Ss).T)
    # 面积（S 帧，应为 ±16）
    def poly_area(P):
        x, y = P[:, 0], P[:, 1]
        return 0.5 * abs(np.dot(x, np.roll(y, -1)) - np.dot(y, np.roll(x, -1)))
    a_s = poly_area(Ss)
    if verbose:
        print('%-2s 顶点%2d  原始面积%.0fpx u=%.2f  S帧面积 %6.2f  吸附误差 mean %.2f max %.2f'
              % (nm, len(ap), area, u, a_s, d.mean(), d.max()))
        print('   S帧顶点(吸附后):', ' '.join('(%g,%g)' % tuple(v) for v in Ss))
    return dict(name=nm, ap=ap, u=u, S=S, Ss=Ss, area_s=a_s, err=d, sub=sub, mask=m)


if __name__ == '__main__':
    names = sys.argv[1:] or list('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
    rows = []
    for nm in names:
        r = report(nm, verbose=(len(names) <= 6))
        rows.append((nm, r['area_s'], r['err'].mean(), r['err'].max(), len(r['ap'])))
    print('\n汇总：字母 S帧面积 到达16? 吸附误差')
    for nm, a, me, mx, nv in rows:
        print('  %-2s %6.2f  %s   mean %.2f max %.2f  nv=%d'
              % (nm, a, 'OK ' if abs(a - 16) < 1.2 else '** ', me, mx, nv))
