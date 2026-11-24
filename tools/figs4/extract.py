# -*- coding: utf-8 -*-
"""从照片里提取四巧板剪影多边形。

思路（不依赖填充色，对灰斜纹/黄/蓝通用）：
  1. 取黑色轮廓线（v<70）的连通域；
  2. 布局里有「面板边框」这种同样闭合的干扰环，用「环内面积」区分：取环内面积最小的那个；
  3. 在轮廓的裁剪框内，从框边洪泛「非黑」像素 → 框外区域；取反即图形（含轮廓线与内部）；
  4. Moore 邻域追踪外轮廓 → Douglas-Peucker 简化 → 面积归一到 6u²。

输出 tools/figs4/out/poly.json
"""
import json
import math
import os
from collections import deque

import numpy as np
from PIL import Image, ImageDraw
from PIL import ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, 'ref')
OUT = os.path.join(HERE, 'out')
os.makedirs(OUT, exist_ok=True)

TARGET_AREA = 6.0            # 四巧板总面积（u²）
TAGS = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6']


# ---------------- 洪泛 / 连通域 ----------------
def flood(free, seeds):
    """span-based 洪泛：free 为可通行掩膜，seeds 为种子点列表。返回可达掩膜。"""
    h, w = free.shape
    reached = np.zeros((h, w), bool)
    stack = list(seeds)
    while stack:
        y, x = stack.pop()
        if not free[y, x] or reached[y, x]:
            continue
        xl = x
        while xl > 0 and free[y, xl - 1] and not reached[y, xl - 1]:
            xl -= 1
        xr = x
        while xr < w - 1 and free[y, xr + 1] and not reached[y, xr + 1]:
            xr += 1
        reached[y, xl:xr + 1] = True
        for ny in (y - 1, y + 1):
            if ny < 0 or ny >= h:
                continue
            seg_free = free[ny, xl:xr + 1]
            seg_ok = ~reached[ny, xl:xr + 1]
            idx = np.nonzero(seg_free & seg_ok)[0]
            prev = -2
            for i in idx:
                if i != prev + 1:
                    stack.append((ny, xl + int(i)))
                prev = int(i)
    return reached


def label_components(mask):
    """四连通标号。返回 (labels, [ (n, x0,y0,x1,y1) ])。"""
    h, w = mask.shape
    lab = np.zeros((h, w), np.int32)
    ys, xs = np.nonzero(mask)
    info = []
    cid = 0
    for y0, x0 in zip(ys.tolist(), xs.tolist()):
        if lab[y0, x0]:
            continue
        cid += 1
        lab[y0, x0] = cid
        q = deque([(y0, x0)])
        n = 0
        bx0 = bx1 = x0
        by0 = by1 = y0
        while q:
            y, x = q.popleft()
            n += 1
            if x < bx0: bx0 = x
            if x > bx1: bx1 = x
            if y < by0: by0 = y
            if y > by1: by1 = y
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not lab[ny, nx]:
                    lab[ny, nx] = cid
                    q.append((ny, nx))
        info.append((n, bx0, by0, bx1, by1))
    return lab, info


def pick_outline_component(rgb):
    """挑出「图形轮廓」所在连通域。"""
    v = rgb.max(2)
    dark = v < 70
    lab, info = label_components(dark)
    H, W = dark.shape
    cands = []
    for cid, (n, x0, y0, x1, y1) in enumerate(info, 1):
        bw, bh = x1 - x0 + 1, y1 - y0 + 1
        if bw > 0.92 * W and bh > 0.92 * H:
            continue                                  # 整幅/面板级，跳过
        if bw < 200 or bh < 200:
            continue                                  # 数字、碎屑
        # 环内面积：组件自身 + 被它围住的空腔
        box = lab[y0:y1 + 1, x0:x1 + 1] == cid
        free = ~box
        seeds = [(0, x) for x in range(free.shape[1])] + \
                [(free.shape[0] - 1, x) for x in range(free.shape[1])] + \
                [(y, 0) for y in range(free.shape[0])] + \
                [(y, free.shape[1] - 1) for y in range(free.shape[0])]
        outside = flood(free, seeds)
        inside_area = int((~outside).sum())
        ratio = inside_area / max(1, n)
        cands.append((inside_area, ratio, cid, x0, y0, x1, y1, bw, bh))
    rings = [c for c in cands if c[1] > 2.0 and c[0] > 20000]
    if not rings:
        raise RuntimeError('没找到闭合轮廓环，候选=' + repr(cands))
    rings.sort(key=lambda c: c[0])          # 环内面积最小的 = 图形本身
    inside_area, ratio, cid, x0, y0, x1, y1, bw, bh = rings[0]
    print(f'  轮廓组件 #{cid}  框内面积={inside_area} 环比={ratio:.2f}  bbox=({x0},{y0})-({x1},{y1})')
    return cid, (x0, y0, x1, y1)


def shape_mask(rgb):
    """整幅图上的图形掩膜（= 轮廓线 + 内部）。"""
    cid, (x0, y0, x1, y1) = pick_outline_component(rgb)
    v = rgb.max(2)
    M = 24
    H, W = v.shape
    cx0, cy0 = max(0, x0 - M), max(0, y0 - M)
    cx1, cy1 = min(W - 1, x1 + M), min(H - 1, y1 + M)
    sub_dark = v[cy0:cy1 + 1, cx0:cx1 + 1] < 70
    free = ~sub_dark
    hh, ww = free.shape
    seeds = [(0, x) for x in range(ww)] + [(hh - 1, x) for x in range(ww)] + \
            [(y, 0) for y in range(hh)] + [(y, ww - 1) for y in range(hh)]
    outside = flood(free, seeds)
    sub = ~outside
    full = np.zeros_like(v, bool)
    full[cy0:cy1 + 1, cx0:cx1 + 1] = sub
    # 只保留与轮廓同标签的连通域（去掉小碎块）
    lab, _ = label_components(full)
    keep = lab[full]
    if len(keep):
        vals, cnts = np.unique(keep, return_counts=True)
        full = lab == vals[np.argmax(cnts)]
    full = fill_holes(full)
    return full


def fill_holes(mask):
    """补内部空腔（洞）。"""
    h, w = mask.shape
    free = ~mask
    seeds = [(0, x) for x in range(w)] + [(h - 1, x) for x in range(w)] + \
            [(y, 0) for y in range(h)] + [(y, w - 1) for y in range(h)]
    outside = flood(free, seeds)
    return ~outside | mask


# ---------------- 轮廓追踪 ----------------
NB = [(-1, 0), (-1, 1), (0, 1), (1, 1), (1, 0), (1, -1), (0, -1), (-1, -1)]   # 顺时针，从 N


def trace_contour(mask):
    ys, xs = np.nonzero(mask)
    y0 = int(ys.min())
    x0 = int(xs[ys == y0].min())
    start = (y0, x0)
    back = (y0, x0 - 1)
    cur, b = start, back
    contour = [start]
    h, w = mask.shape
    for _ in range(2000000):
        k0 = NB.index((b[0] - cur[0], b[1] - cur[1]))
        nxt = None
        for k in range(1, 9):
            d = NB[(k0 + k) % 8]
            cy, cx = cur[0] + d[0], cur[1] + d[1]
            if 0 <= cy < h and 0 <= cx < w and mask[cy, cx]:
                nxt = (cy, cx)
                pb = NB[(k0 + k - 1) % 8]
                b = (cur[0] + pb[0], cur[1] + pb[1])
                break
        if nxt is None:
            break
        cur = nxt
        if cur == start:
            break
        contour.append(cur)
    return [(p[1], p[0]) for p in contour]


def dp_idx(points, tol):
    """Douglas-Peucker，返回保留下来的下标。"""
    n = len(points)
    if n < 3:
        return list(range(n))
    keep = [False] * n
    keep[0] = keep[-1] = True
    stack = [(0, n - 1)]
    while stack:
        i, j = stack.pop()
        if j <= i + 1:
            continue
        ax, ay = points[i]
        bx, by = points[j]
        dx, dy = bx - ax, by - ay
        L = math.hypot(dx, dy) or 1.0
        best, bi = -1.0, -1
        for k in range(i + 1, j):
            px, py = points[k]
            d = abs((px - ax) * dy - (py - ay) * dx) / L
            if d > best:
                best, bi = d, k
        if best > tol:
            keep[bi] = True
            stack.append((i, bi))
            stack.append((bi, j))
    return [k for k in range(n) if keep[k]]


def dp(points, tol):
    idx = dp_idx(points, tol)
    return [points[k] for k in idx]


def dp_closed(ct2, n, tol):
    """闭合折线的 DP：ct2 长度为 n+1，末点与首点重合。
    在「离首点最远」的锚点处切成两段分别简化，避免首尾弦长为 0 导致整圈被当成一条直线。"""
    e = max(range(1, n), key=lambda i: (ct2[i][0] - ct2[0][0]) ** 2 + (ct2[i][1] - ct2[0][1]) ** 2)
    i1 = dp_idx(ct2[:e + 1], tol)
    i2 = dp_idx(ct2[e:n + 1], tol)
    idx = set(i1)
    for k in i2:
        a = e + k
        if a < n:
            idx.add(a)
    return sorted(idx)


def fit_edges(contour, idx, snap_deg=True):
    """对每条边做「方向受约束」的最小二乘直线拟合，再用相邻直线求交得顶点。

    contour: 轮廓点（首尾相接，末点≈首点）
    idx:     DP 保留下来的下标（角点）
    方向约束：吸附到最近的 45° 倍数（真实图案的边只有这 8 个方向）
    返回顶点列表（浮点）。
    """
    n = len(idx)
    lines = []          # (法向单位向量, 偏移)
    for i in range(n):
        a = idx[i]
        b = idx[(i + 1) % n]
        # 取这条边上的原始轮廓点
        if b > a:
            seg = contour[a:b + 1]
        else:
            seg = contour[a:] + contour[:b + 1]
        if len(seg) < 3:
            seg = [contour[a], contour[b]]
        # 弦方向 → 吸附
        c0 = contour[a]
        c1 = contour[b]
        ang = math.atan2(c1[1] - c0[1], c1[0] - c0[0])
        if snap_deg:
            ang = round(ang / (math.pi / 4)) * (math.pi / 4)
        nx, ny = -math.sin(ang), math.cos(ang)          # 法向
        ds = [p[0] * nx + p[1] * ny for p in seg]
        ds.sort()
        # 去掉两端角点附近的点（角上会被相邻边污染），取中位数
        if len(ds) > 8:
            ds = ds[2:-2]
        d = sum(ds) / len(ds)
        lines.append((nx, ny, d))

    verts = []
    for i in range(n):
        n1 = lines[(i - 1) % n]
        n2 = lines[i]
        den = n1[0] * n2[1] - n1[1] * n2[0]
        if abs(den) < 1e-9:
            verts.append(contour[idx[i]])
            continue
        # 解 n1·p = d1, n2·p = d2
        x = (n1[2] * n2[1] - n2[2] * n1[1]) / den
        y = (n1[0] * n2[2] - n2[0] * n1[2]) / den
        verts.append((x, y))
    return verts


def shoelace(poly):
    s = 0.0
    for i in range(len(poly)):
        x1, y1 = poly[i]
        x2, y2 = poly[(i + 1) % len(poly)]
        s += x1 * y2 - x2 * y1
    return s / 2


def main():
    result = {}
    for tag in TAGS:
        p = os.path.join(REF, tag + '.jpg')
        rgb = np.asarray(Image.open(p).convert('RGB')).astype(np.int16)
        print(f'[{tag}] {rgb.shape[1]}x{rgb.shape[0]}')
        m = shape_mask(rgb)
        px = int(m.sum())
        Image.fromarray((m.astype(np.uint8) * 255)).save(os.path.join(OUT, f'{tag}_mask.png'))
        ct = trace_contour(m)
        print(f'  轮廓点={len(ct)}')
        # 闭合轮廓：把起点定在离质心最远的点（必定是凸角），再补一份首点收尾
        mx = sum(q[0] for q in ct) / len(ct)
        my = sum(q[1] for q in ct) / len(ct)
        s = max(range(len(ct)), key=lambda i: (ct[i][0] - mx) ** 2 + (ct[i][1] - my) ** 2)
        ct2 = ct[s:] + ct[:s] + [ct[s]]
        idx = None
        for tol in (7.0, 6.0, 5.0, 4.0, 3.0, 2.5, 2.0):
            idx = dp_closed(ct2, len(ct), tol)
            if len(idx) <= 16:
                break
        raw_corners = [ct2[k] for k in idx]
        best = fit_edges(ct2, idx, snap_deg=True)
        a_px = abs(shoelace(best))
        print(f'  掩膜={px}  角点={len(idx)}  拟合后顶点={len(best)}  多边形面积={a_px:.0f} ({a_px/px:.3f}×像素)')
        s = math.sqrt(TARGET_AREA / a_px)
        cx = sum(q[0] for q in best) / len(best)
        cy = sum(q[1] for q in best) / len(best)
        poly = [((q[0] - cx) * s, (q[1] - cy) * s) for q in best]
        if shoelace(poly) < 0:
            poly = poly[::-1]
        # 叠图核对
        ov = Image.open(p).convert('RGB')
        d = ImageDraw.Draw(ov)
        d.line([tuple(q) for q in best] + [tuple(best[0])], fill=(255, 0, 255), width=5)
        for q in best:
            d.ellipse([q[0] - 7, q[1] - 7, q[0] + 7, q[1] + 7], outline=(0, 200, 255), width=3)
        ov.save(os.path.join(OUT, f'{tag}_overlay.png'))
        result[tag] = {
            'poly': [[round(x, 5), round(y, 5)] for x, y in poly],
            # 仅用 DP 角点重建的另一版（不做直线拟合），给求解器多一种吸附起点
            'raw': [[round((q[0] - cx) * s, 5), round((q[1] - cy) * s, 5)] for q in raw_corners],
            'px': [[int(round(x)), int(round(y))] for x, y in best],
            'area': TARGET_AREA,
        }
        # 边长（u）便于人工判定
        Ls = [math.hypot(poly[(i + 1) % len(poly)][0] - poly[i][0], poly[(i + 1) % len(poly)][1] - poly[i][1])
              for i in range(len(poly))]
        ang = [round(math.degrees(math.atan2(poly[(i + 1) % len(poly)][1] - poly[i][1],
                                             poly[(i + 1) % len(poly)][0] - poly[i][0])) % 180, 1) for i in range(len(poly))]
        print('  边长u:', [round(v, 3) for v in Ls])
        print('  方向°:', ang)
    with open(os.path.join(OUT, 'poly.json'), 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=1)
    print('\n已写 out/poly.json')


if __name__ == '__main__':
    main()
