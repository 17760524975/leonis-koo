#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
《四巧·七巧》v0.1 — SVG 图标集生成器
=====================================

单一真源：每枚图标用「段列表(segment list)」描述一次几何，
本脚本同时负责：
  1) 输出洁净的 SVG 文件（art-src/icons/*.svg）
  2) 用 Pillow 自己光栅化一份预览图（art-src/icons/_preview_icons.png）
     —— 环境里没有 cairo / resvg，为了让「所见即所交」，
        这里实现一个最小光栅器（只支持本图标集用到的 M/L/H/V/Q/A/Z/Circle）。

设计约束（对齐策划文档 6.5.1 与任务书）：
  - viewBox 40x40，不写死 width/height（自适应）
  - 单色，currentColor
  - stroke-width 2.5，linecap round，linejoin round
  - 线性、克制，不用填色块插画风（star-on 是唯一实心图，按规格必须实心）

用法：
  PYTHONPATH=<venv site-packages> python gen_icons.py
"""

import math
import os

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ICON_DIR = os.path.abspath(os.path.join(HERE, "..", "icons"))

BOX = 40.0          # viewBox 边长
STROKE = 2.5        # 统一线宽
SS = 6              # 预览超采样倍数

ICON_COLOR = "#2C3A4B"   # 主文字深墨蓝（6.5.1）


# --------------------------------------------------------------------------
# 段列表构造助手
# --------------------------------------------------------------------------
def M(x, y):
    return ("M", round(x, 2), round(y, 2))


def L(x, y):
    return ("L", round(x, 2), round(y, 2))


def H(x):
    return ("H", round(x, 2))


def V(y):
    return ("V", round(y, 2))


def Q(cx, cy, x, y):
    return ("Q", round(cx, 2), round(cy, 2), round(x, 2), round(y, 2))


def A(rx, ry, large, sweep, x, y):
    return ("A", rx, ry, 0, large, sweep, round(x, 2), round(y, 2))


def Z():
    return ("Z",)


def C(cx, cy, r, fill=None):
    """整圆（作为独立 <circle> 元素输出，光栅器单独处理）。"""
    return ("CIRCLE", round(cx, 2), round(cy, 2), r, fill)


# --------------------------------------------------------------------------
# 几何计算助手
# --------------------------------------------------------------------------
def polar(cx, cy, r, deg):
    a = math.radians(deg)
    return cx + r * math.cos(a), cy + r * math.sin(a)


def arrowhead(tip, direction, length=4.2, half=3.2):
    """在 tip 处、沿 direction 方向生成一个 V 形箭头（返回 M/L/L 三段）。

    direction 为「前进方向」，箭头的两条倒刺会向后折回（沿切线反向），
    这样箭头贴着圆弧走，不会顶出圆心径向。
    """
    dx, dy = direction
    n = math.hypot(dx, dy)
    dx, dy = dx / n, dy / n
    px, py = -dy, dx                      # 垂直方向
    bx, by = tip[0] - dx * length, tip[1] - dy * length   # 倒刺基点
    b1 = (bx + px * half, by + py * half)
    b2 = (bx - px * half, by - py * half)
    return [M(b1[0], b1[1]), L(tip[0], tip[1]), L(b2[0], b2[1])]


def arc_tangent(cx, cy, r, deg):
    """圆周上 deg 处、θ 递增（屏幕上顺时针）方向的单位切线。"""
    a = math.radians(deg)
    return -math.sin(a), math.cos(a)


# --------------------------------------------------------------------------
# 九枚图标
# --------------------------------------------------------------------------
def build_gear(cx=20.0, cy=20.0, r_out=11.0, r_in=8.0, teeth=8,
               tooth_half=10.0):
    """齿轮轮廓：梯形齿 + 齿间圆弧，闭合单路径。

    齿心角从 -90° 起（保证正上方有一枚齿，视觉对称）。
    每齿占 2*tooth_half，齿间占 45-2*tooth_half。
    所有圆弧都沿 θ 递增（屏幕顺时针），跨度均 <180°，故 large-arc=0。
    """
    step = 360.0 / teeth
    gap_half = step / 2.0 - tooth_half
    segs = []
    first = polar(cx, cy, r_out, -90 - tooth_half)
    segs.append(M(first[0], first[1]))
    for k in range(teeth):
        c = -90 + k * step
        a = polar(cx, cy, r_out, c + tooth_half)
        segs.append(A(r_out, r_out, 0, 1, a[0], a[1]))          # 齿顶
        b = polar(cx, cy, r_in, c + tooth_half)
        segs.append(L(b[0], b[1]))                               # 齿侧
        d = polar(cx, cy, r_in, c + tooth_half + 2 * gap_half)
        segs.append(A(r_in, r_in, 0, 1, d[0], d[1]))             # 齿间
        e = polar(cx, cy, r_out, c + tooth_half + 2 * gap_half)
        segs.append(L(e[0], e[1]))                               # 齿侧
    segs.append(Z())
    return segs


def build_icons():
    icons = {}

    # 1. back —— 返回箭头（左侧 V + 横线）
    icons["back"] = dict(
        segs=[[M(23, 9.5), L(12.6, 20), L(23, 30.5)],
              [M(12.6, 20), H(30.4)]],
    )

    # 2. rotate-left —— ↺ 逆时针圆弧 + 顶部向左箭头
    #   圆心(20,20) r=10.5，从左侧(9.5,20) 逆时针 270° 到顶部(20,9.5)。
    #   注意：arc_tangent 返回的是 θ 递增（顺时针）方向的切线，
    #        逆时针箭头的朝向必须取反，否则会和 rotate-right 的箭头一模一样。
    tip = polar(20, 20, 10.5, 270)          # (20, 9.5)
    tx, ty = arc_tangent(20, 20, 10.5, 270)
    icons["rotate-left"] = dict(
        segs=[[M(9.5, 20), A(10.5, 10.5, 1, 0, tip[0], tip[1])],
              arrowhead(tip, (-tx, -ty))],
    )

    # 3. rotate-right —— ↻ 顺时针圆弧 + 顶部向右箭头
    icons["rotate-right"] = dict(
        segs=[[M(30.5, 20), A(10.5, 10.5, 1, 1, tip[0], tip[1])],
              arrowhead(tip, arc_tangent(20, 20, 10.5, 270))],
    )

    # 4. flip —— ⇄ 上下反向双箭头（水平镜像语义）
    icons["flip"] = dict(
        segs=[[M(10, 14), H(29.4)],
              arrowhead((29.4, 14), (1, 0), length=4.8, half=3.6),
              [M(30, 26), H(10.6)],
              arrowhead((10.6, 26), (-1, 0), length=4.8, half=3.6)],
    )

    # 5. hint —— 灯泡：球泡 + 收颈 + 灯头两道
    icons["hint"] = dict(
        segs=[[M(12.96, 19.6),
               A(8.2, 8.2, 1, 1, 27.04, 19.6),
               Q(27.1, 23.6, 24.3, 26.0),
               H(15.7),
               Q(12.9, 23.6, 12.96, 19.6),
               Z()],
              [M(16.9, 29.0), H(23.1)],
              [M(18.4, 32.0), H(21.6)]],
    )

    # 6. reset —— 重来：几乎闭合的整圈（与 rotate 系列的「大开口圆弧」形成对比）
    #   圆心(20,20) r=10.6，从 θ=62° 顺时针 332° 到 θ=30°，头部在右下指向下方
    st = polar(20, 20, 10.6, 62)
    en = polar(20, 20, 10.6, 30)
    icons["reset"] = dict(
        segs=[[M(st[0], st[1]), A(10.6, 10.6, 1, 1, en[0], en[1])],
              arrowhead(en, arc_tangent(20, 20, 10.6, 30), length=4.0, half=3.0)],
    )

    # 7. gear —— 齿轮：8 枚梯形齿 + 中心孔（统一逆向生成，保证数值精确）
    icons["gear"] = dict(segs=[build_gear(), [C(20, 20, 3.5)]])

    # 8/9. star —— 五角星（外 R13.6 / 内 r6.3，圆角靠 linejoin=round）
    cx, cy, R, r = 20.0, 21.2, 13.6, 6.3
    pts = []
    for k in range(5):
        pts.append(polar(cx, cy, R, -90 + k * 72))
        pts.append(polar(cx, cy, r, -54 + k * 72))
    star = [M(pts[0][0], pts[0][1])] + [L(p[0], p[1]) for p in pts[1:]] + [Z()]
    icons["star-on"] = dict(segs=[star], fill=True)
    icons["star-off"] = dict(segs=[star], fill=False)

    return icons


# --------------------------------------------------------------------------
# 输出 SVG
# --------------------------------------------------------------------------
def fmt(v):
    """数字去尾零，输出紧凑。"""
    if isinstance(v, float) or isinstance(v, int):
        s = ("%.2f" % float(v)).rstrip("0").rstrip(".")
        return s if s not in ("", "-0") else "0"
    return str(v)


def seg_to_d(seg):
    op = seg[0]
    if op == "CIRCLE":
        return None
    if op == "Z":
        return "Z"
    if op == "A":
        _, rx, ry, rot, large, sweep, x, y = seg
        return "A%s %s %s %d %d %s %s" % (
            fmt(rx), fmt(ry), fmt(rot), large, sweep, fmt(x), fmt(y))
    if op == "Q":
        _, cx, cy, x, y = seg
        return "Q%s %s %s %s" % (fmt(cx), fmt(cy), fmt(x), fmt(y))
    if op in ("H", "V"):
        return "%s%s" % (op, fmt(seg[1]))
    return "%s%s %s" % (op, fmt(seg[1]), fmt(seg[2]))


def write_svg(name, spec):
    parts = []
    fill_path = spec.get("fill", False)
    for group in spec["segs"]:
        if group and group[0][0] == "CIRCLE":
            for seg in group:
                _, cx, cy, r, f = seg
                extra = ' fill="%s"' % f if f else ""
                parts.append('<circle cx="%s" cy="%s" r="%s"%s/>' % (
                    fmt(cx), fmt(cy), fmt(r), extra))
            continue
        d = " ".join(filter(None, (seg_to_d(s) for s in group)))
        extra = ' fill="currentColor"' if fill_path else ""
        parts.append('<path d="%s"%s/>' % (d, extra))

    body = "".join(parts)
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" '
        'fill="none" stroke="currentColor" stroke-width="2.5" '
        'stroke-linecap="round" stroke-linejoin="round" '
        'aria-hidden="true">%s</svg>\n' % body
    )
    path = os.path.join(ICON_DIR, name + ".svg")
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(svg)
    return path, len(svg)


# --------------------------------------------------------------------------
# 最小光栅器（预览用）
# --------------------------------------------------------------------------
def flatten(segs, steps_arc=64, steps_q=24):
    """把段列表展开成若干折线（每条折线是点列表）。"""
    lines, cur = [], []
    x = y = 0.0
    start = None
    for seg in segs:
        op = seg[0]
        if op == "M":
            if len(cur) > 1:
                lines.append(cur)
            x, y = seg[1], seg[2]
            start = (x, y)
            cur = [(x, y)]
        elif op == "L":
            x, y = seg[1], seg[2]
            cur.append((x, y))
        elif op == "H":
            x = seg[1]
            cur.append((x, y))
        elif op == "V":
            y = seg[1]
            cur.append((x, y))
        elif op == "Q":
            cx, cy, ex, ey = seg[1:]
            for i in range(1, steps_q + 1):
                t = i / steps_q
                bx = (1 - t) ** 2 * x + 2 * (1 - t) * t * cx + t ** 2 * ex
                by = (1 - t) ** 2 * y + 2 * (1 - t) * t * cy + t ** 2 * ey
                cur.append((bx, by))
            x, y = ex, ey
        elif op == "A":
            rx, ry, rot, large, sweep, ex, ey = seg[1:]
            cur.extend(_flatten_arc(x, y, ex, ey, rx, ry, large, sweep, steps_arc))
            x, y = ex, ey
        elif op == "Z":
            if start:
                cur.append(start)
            if len(cur) > 1:
                lines.append(cur)
            cur = []
    if len(cur) > 1:
        lines.append(cur)
    return lines


def _flatten_arc(x1, y1, x2, y2, rx, ry, large, sweep, steps):
    """SVG 端点参数化圆弧 → 折线（只处理 rot=0、rx==ry 的圆，够本图标集用）。"""
    # 圆心（rx==ry==r）
    mx, my = (x1 + x2) / 2.0, (y1 + y2) / 2.0
    dx, dy = x2 - x1, y2 - y1
    d = math.hypot(dx, dy)
    r = rx
    if d == 0 or d > 2 * r:
        return [(x2, y2)]
    h = math.sqrt(max(r * r - (d / 2.0) ** 2, 0.0))
    ux, uy = -dy / d, dx / d                      # 垂直单位向量
    sign = 1 if (large != sweep) else -1
    cx, cy = mx + ux * h * sign, my + uy * h * sign
    a1 = math.atan2(y1 - cy, x1 - cx)
    a2 = math.atan2(y2 - cy, x2 - cx)
    if sweep:
        while a2 < a1:
            a2 += 2 * math.pi
    else:
        while a2 > a1:
            a2 -= 2 * math.pi
    out = []
    for i in range(1, steps + 1):
        a = a1 + (a2 - a1) * i / steps
        out.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return out


def render_icon(spec, size, color=ICON_COLOR, bg=None):
    S = size * SS
    scale = S / BOX
    img = Image.new("RGBA", (S, S), bg if bg else (0, 0, 0, 0))
    dr = ImageDraw.Draw(img)
    col = color
    w = max(1, int(round(STROKE * scale)))
    half = STROKE * scale / 2.0

    def P(p):
        return (p[0] * scale, p[1] * scale)

    fill_path = spec.get("fill", False)
    for group in spec["segs"]:
        if group and group[0][0] == "CIRCLE":
            for seg in group:
                _, cx, cy, r, f = seg
                box = [(cx - r) * scale, (cy - r) * scale,
                       (cx + r) * scale, (cy + r) * scale]
                dr.ellipse(box, outline=col, width=w)
            continue
        lines = flatten(group)
        if fill_path and lines:
            poly = [P(p) for p in lines[0]]
            dr.polygon(poly, fill=col)
        for line in lines:
            pts = [P(p) for p in line]
            if len(pts) > 1:
                dr.line(pts, fill=col, width=w, joint="curve")
            # round caps / round joins
            for p in (pts[0], pts[-1]):
                dr.ellipse([p[0] - half, p[1] - half, p[0] + half, p[1] + half],
                           fill=col)
    return img.resize((size, size), Image.LANCZOS)


def build_preview(icons, order):
    pad, gap = 28, 18
    cell = 132
    big_w = pad * 2 + cell * 3 + gap * 2

    rows_h = [pad + cell for _ in range(3)]
    strip_h1 = 40 + 46     # 40px 实尺寸
    strip_h2 = 24 + 46     # 24px 极限
    H_total = sum(rows_h) + gap * 2 + pad * 2 + strip_h1 + strip_h2 + 40

    W = max(big_w, pad * 2 + len(order) * 76)
    img = Image.new("RGB", (W, H_total), "#F6E9D4")
    dr = ImageDraw.Draw(img)

    # 3x3 放大网格（白卡片底色，模拟实际承载环境）
    for i, name in enumerate(order):
        cx = pad + (i % 3) * (cell + gap)
        cy = pad + (i // 3) * (cell + gap + 12)
        dr.rounded_rectangle([cx, cy, cx + cell, cy + cell], radius=26,
                             fill="#FFFFFF", outline="#E3E9F2", width=2)
        icon = render_icon(icons[name], cell - 40)
        img.paste(icon, (cx + 20, cy + 20), icon)

    # 实尺寸 40 一行（白底）+ 24 一行（浅木底）
    y = pad + 3 * (cell + gap + 12) + 6
    dr.rounded_rectangle([pad, y, W - pad, y + 74], radius=16, fill="#FFFFFF",
                         outline="#E3E9F2", width=2)
    for i, name in enumerate(order):
        icon = render_icon(icons[name], 40)
        img.paste(icon, (pad + 24 + i * 76, y + 17), icon)

    y2 = y + 74 + 14
    for i, name in enumerate(order):
        icon = render_icon(icons[name], 24)
        img.paste(icon, (pad + 24 + i * 76, y2 + 10), icon)

    out = os.path.join(ICON_DIR, "_preview_icons.png")
    img.save(out)
    return out


if __name__ == "__main__":
    os.makedirs(ICON_DIR, exist_ok=True)
    icons = build_icons()
    order = ["back", "rotate-left", "rotate-right", "flip", "hint",
             "reset", "gear", "star-on", "star-off"]
    total = 0
    for n in order:
        p, size = write_svg(n, icons[n])
        total += size
        print("%-14s %5d bytes  %s" % (n + ".svg", size, p))
    print("SVG 合计 %d bytes (%.1f KB)" % (total, total / 1024.0))
    print("preview:", build_preview(icons, order))
