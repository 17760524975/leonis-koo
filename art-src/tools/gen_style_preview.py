#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
《四巧·七巧》v0.1 — 界面风格效果图（零积分）
=============================================

用途：把三张主图 + SVG 图标 + 板件视觉规格拼成真实界面，
      ① 供自己验收「素材放进界面是否成立」
      ② 供程序当视觉参照（每个数值都能在风格稿说明里查到）
      ③ 供策划一眼判断风格是否到位

产出：art-src/风格效果图.png
布局：2x2 —— 主界面 / 对局页 / 结算面板 / 板件与控件规范

注意：本图是**风格与尺寸参照**，不是关卡设计。
      对局页里的房子轮廓与板件摆位仅作示意（第 5 关主题），
      真实几何由程序按 data/levels.js 绘制。
"""

import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
IMG = os.path.join(ROOT, "assets", "img")
ICONS = os.path.join(HERE, "..", "icons")

import gen_icons                      # 复用图标的几何真源与光栅器

# ------------------------------------------------------------------ 调色板
C = {
    "wood":     (0xF6, 0xE9, 0xD4),
    "white":    (0xFF, 0xFF, 0xFF),
    "ink":      (0x2C, 0x3A, 0x4B),   # 主文字
    "ink2":     (0x7A, 0x8A, 0x9C),   # 次要文字
    "amber":    (0xFF, 0xB9, 0x3D),   # 强调 / 星级 / 主按钮
    "amber_d":  (0xFF, 0x9F, 0x1C),
    "amber_e":  (0xE0, 0x8A, 0x00),   # 主按钮底部厚边
    "amber_ink":(0x7A, 0x4A, 0x00),   # 主按钮文字（深棕，3.9:1；白字仅 1.9:1 已废弃）
    "line":     (0xE3, 0xE9, 0xF2),   # 边线
    "outline":  (0xE8, 0xEE, 0xF7),   # 目标轮廓填充
    "outline_d":(0x9F, 0xB6, 0xD0),   # 目标轮廓虚线（2.08:1，原 #B9CBE0 仅 1.66:1 已废弃）
    "mask":     (0x3C, 0x2D, 0x23),   # 弹窗遮罩暖棕底（覆盖 alpha .24）
    "track":    (0xE8, 0xEE, 0xF7),   # 进度条轨道
    "green":    (0x63, 0xC8, 0x8B),
    "green_d":  (0x4F, 0xB8, 0x7A),
    "disabled": (0xF4, 0xF6, 0xF9),
    "icon_off": (0xC3, 0xCD, 0xD9),
}

# 板件（7.1：填充 + 同色系加深 20% 描边，禁止黑描边）
PIECES = {
    "A": dict(fill=(0xFF, 0x8A, 0x5B), stroke=(0xD9, 0x6A, 0x3D),
              poly=[(3, 0), (0, 0), (1, 1), (3, 1)]),
    "B": dict(fill=(0x4F, 0xA8, 0xE0), stroke=(0x35, 0x85, 0xBC),
              poly=[(0, 1), (0, 0), (1, 1)]),
    "C": dict(fill=(0x63, 0xC8, 0x8B), stroke=(0x46, 0xA6, 0x6D),
              poly=[(3, 0), (4.5, 0), (3.5, 1), (3, 1)]),
    "D": dict(fill=(0xA8, 0x7B, 0xE8), stroke=(0x84, 0x55, 0xCC),
              poly=[(6.5, 1), (3.5, 1), (4.5, 0), (6, 0), (5.75, 0.25)]),
}

FONT_B = "C:/Windows/Fonts/msyhbd.ttc"
FONT_R = "C:/Windows/Fonts/msyh.ttc"


def font(size, bold=False):
    return ImageFont.truetype(FONT_B if bold else FONT_R, size)


def text_center(dr, box, s, size, color, bold=False):
    f = font(size, bold)
    w = dr.textlength(s, font=f)
    x = box[0] + (box[2] - box[0] - w) / 2
    y = box[1] + (box[3] - box[1] - size) / 2 - size * 0.10
    dr.text((x, y), s, font=f, fill=color)


def text_left(dr, xy, s, size, color, bold=False):
    dr.text(xy, s, font=font(size, bold), fill=color)


# ------------------------------------------------------------------ 绘制工具
def vgrad(w, h, top, bottom):
    """竖直线性渐变（顶部 → 底部）。"""
    g = Image.new("RGB", (1, h))
    px = g.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        px[0, y] = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
    return g.resize((w, h), Image.BILINEAR)


def rounded_mask(size, radius):
    m = Image.new("L", (size[0] * 4, size[1] * 4), 0)
    ImageDraw.Draw(m).rounded_rectangle(
        [0, 0, size[0] * 4 - 1, size[1] * 4 - 1], radius=radius * 4, fill=255)
    return m.resize(size, Image.LANCZOS)


def paste_rounded(base, im, xy, radius):
    m = rounded_mask(im.size, radius)
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    layer.paste(im.convert("RGB"), (0, 0))
    layer.putalpha(m)
    base.alpha_composite(layer, xy)


def drop_shadow(base, xy, size, radius, blur=16, dy=4, color=(44, 58, 75, 26)):
    m = rounded_mask(size, radius)
    sh = Image.new("RGBA", size, color[:3] + (255,))
    sh.putalpha(m.point(lambda v: int(v * color[3] / 255)))
    pad = blur * 3
    canvas = Image.new("RGBA", (size[0] + pad * 2, size[1] + pad * 2), (0, 0, 0, 0))
    canvas.alpha_composite(sh, (pad, pad))
    canvas = canvas.filter(ImageFilter.GaussianBlur(blur))
    base.alpha_composite(canvas, (xy[0] - pad, xy[1] - pad + dy))


def icon(name, size, color):
    spec = gen_icons.build_icons()[name]
    return gen_icons.render_icon(spec, size, color="#%02X%02X%02X" % color)


def poly_pts(poly, u, ox, oy):
    return [(ox + x * u, oy + y * u) for x, y in poly]


def piece_size(key, u):
    """板件在给定 u 下的实际像素尺寸（按其自身包围盒）。"""
    p = PIECES[key]["poly"]
    xs = [q[0] for q in p]
    ys = [q[1] for q in p]
    return (max(xs) - min(xs)) * u, (max(ys) - min(ys)) * u


def fit_u(key, max_w, max_h):
    """求一个让板件塞进 max_w x max_h 的 u。"""
    p = PIECES[key]["poly"]
    xs = [q[0] for q in p]
    ys = [q[1] for q in p]
    return min(max_w / (max(xs) - min(xs)), max_h / (max(ys) - min(ys)))


def draw_poly_piece(base, poly, u, ox, oy, fill, stroke, mark=False):
    """按 7.1 规格画一块板：柔投影 + 纯色 + 2px 同色系描边 + 顶部 1.5px 白色 25% 内高光。"""
    pts = poly_pts(poly, u, ox, oy)
    W, H = base.size

    # 柔投影 0 2px 6px rgba(44,58,75,.14)
    sh = Image.new("L", (W, H), 0)
    ImageDraw.Draw(sh).polygon([(x, y + 2) for x, y in pts], fill=255)
    sh = sh.filter(ImageFilter.GaussianBlur(3.5))
    lay = Image.new("RGBA", (W, H), (44, 58, 75, 0))
    lay.putalpha(sh.point(lambda v: int(v * 0.14 * 2.4)))
    base.alpha_composite(lay)

    body = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(body)
    d.polygon(pts, fill=fill + (255,))
    d.line(pts + [pts[0]], fill=stroke + (255,), width=2, joint="curve")

    # 顶部 1.5px 内高光：本体遮罩 减去 上移 1.5px 的遮罩 → 只剩顶边一条
    m1 = Image.new("L", (W, H), 0)
    ImageDraw.Draw(m1).polygon(pts, fill=255)
    m2 = Image.new("L", (W, H), 0)
    ImageDraw.Draw(m2).polygon([(x, y - 1.5) for x, y in pts], fill=255)
    from PIL import ImageChops
    top = ImageChops.subtract(m1, m2)
    top = top.filter(ImageFilter.GaussianBlur(0.4))
    hl = Image.new("RGBA", (W, H), (255, 255, 255, 0))
    hl.putalpha(top.point(lambda v: int(v * 0.25)))
    body.alpha_composite(hl)

    if mark:
        # D 板凹口内侧 45° 短虚线（长 14 / 宽 2 / 白 80%）
        x1, y1 = ox + 4.55 * u, oy + 0.86 * u
        for i in range(4):
            t0, t1 = i / 4.0, i / 4.0 + 0.11
            d.line([(x1 + 14 * t0 * 0.707, y1 - 14 * t0 * 0.707),
                    (x1 + 14 * t1 * 0.707, y1 - 14 * t1 * 0.707)],
                   fill=(255, 255, 255, 204), width=2)
    base.alpha_composite(body)


def draw_piece(base, key, u, tx, ty, mark=None):
    """按包围盒左上角 (tx,ty) 放置一块板（poly 是共享坐标系，必须先归一到自身包围盒）。"""
    p = PIECES[key]
    xs = [q[0] for q in p["poly"]]
    ys = [q[1] for q in p["poly"]]
    if mark is None:
        mark = (key == "D")
    draw_poly_piece(base, p["poly"], u, tx - min(xs) * u, ty - min(ys) * u,
                    p["fill"], p["stroke"], mark)


def capsule_button(base, xy, size, label, kind="primary", radius=None):
    w, h = size
    r = radius if radius is not None else min(w, h) // 2
    if kind == "primary":
        body = vgrad(w, h, C["amber"], C["amber_d"]).convert("RGBA")
        d = ImageDraw.Draw(body)
        # 底部厚边 4px
        d.rounded_rectangle([0, h - 10, w - 1, h - 1], radius=r,
                            fill=C["amber_e"] + (255,))
        m = rounded_mask((w, h), r)
        body.putalpha(m)
        base.alpha_composite(body, xy)
        # 文字用深棕 #7A4A00（3.9:1）而非白色（1.9:1）—— 橙底白字在浅色主题下会糊
        text_center(ImageDraw.Draw(base), (xy[0], xy[1], xy[0] + w, xy[1] + h - 6),
                    label, 32, C["amber_ink"], bold=True)
    else:
        drop_shadow(base, xy, (w, h), r, blur=8, dy=3, color=(44, 58, 75, 16))
        body = Image.new("RGBA", (w, h), C["white"] + (255,))
        d = ImageDraw.Draw(body)
        d.rounded_rectangle([0, h - 4, w - 1, h - 1], radius=r,
                            fill=C["line"] + (255,))
        m = rounded_mask((w, h), r)
        body.putalpha(m)
        d = ImageDraw.Draw(body)
        d.rounded_rectangle([1, 1, w - 2, h - 2], radius=r - 1,
                            outline=C["line"] + (255,), width=1)
        base.alpha_composite(body, xy)
        text_center(ImageDraw.Draw(base), (xy[0], xy[1], xy[0] + w, xy[1] + h - 4),
                    label, 32, C["ink"], bold=False)


def tool_button(base, xy, name, disabled=False, size=(120, 100), icon_size=44):
    w, h = size
    r = min(24, min(w, h) // 4)
    drop_shadow(base, xy, (w, h), r, blur=8, dy=3, color=(44, 58, 75, 16))
    body = Image.new("RGBA", (w, h), (C["disabled"] if disabled else C["white"]) + (255,))
    m = rounded_mask((w, h), r)
    body.putalpha(m)
    d = ImageDraw.Draw(body)
    d.rounded_rectangle([1, 1, w - 2, h - 2], radius=r - 1,
                        outline=C["line"] + (255,), width=1)
    base.alpha_composite(body, xy)
    col = C["icon_off"] if disabled else C["ink"]
    ic = icon(name, icon_size, col)
    base.alpha_composite(ic, (xy[0] + (w - icon_size) // 2,
                             xy[1] + (h - icon_size) // 2))


def paste_nine_slice(base, src, xy, size, sl=64):
    """真·九宫格贴图：把 panel_card.png 按 slice 拉伸贴到 size。

    走这条路径而不是"代码画圆角"，所以效果图里看到的就是程序实际渲染结果，
    顺便验证 slice=64 这组数值是否够用（中间区必须纯白，不能掺到边线/渐变）。
    """
    w, h = size
    W, H = src.size
    xs_dst = [(0, sl), (sl, w - sl), (w - sl, w)]
    ys_dst = [(0, sl), (sl, h - sl), (h - sl, h)]
    xs_src = [(0, sl), (sl, W - sl), (W - sl, W)]
    ys_src = [(0, sl), (sl, H - sl), (H - sl, H)]
    for iy in range(3):
        for ix in range(3):
            sx0, sx1 = xs_src[ix]
            sy0, sy1 = ys_src[iy]
            dx0, dx1 = xs_dst[ix]
            dy0, dy1 = ys_dst[iy]
            dw, dh = dx1 - dx0, dy1 - dy0
            if dw <= 0 or dh <= 0:
                continue
            piece = src.crop((sx0, sy0, sx1, sy1))
            if piece.size != (dw, dh):
                piece = piece.resize((dw, dh), Image.LANCZOS)
            base.alpha_composite(piece, (xy[0] + dx0, xy[1] + dy0))


_CARD_CACHE = {}


def draw_card(base, xy, size, radius=32):
    """白圆角卡片 —— 九宫格贴 assets/img/panel_card.png（slice 64）。

    主理人 2026-11-18 二次决定：恢复用图。理由：程序两端（浏览器 + 微信）
    共用同一套 Canvas 渲染，九宫格绘一张图比手写圆角+渐变裁剪更统一。
    图内含：r32 圆角 / 1px #E3E9F2 边 / 顶部 64px #FFFBF2→#FFF 暖光 / 透明背景。
    图内**不含投影**，投影 0 4px 16px rgba(44,58,75,.10) 由外层加（见下方 drop_shadow）。
    """
    if "card" not in _CARD_CACHE:
        _CARD_CACHE["card"] = Image.open(
            os.path.join(IMG, "panel_card.png")).convert("RGBA")
    drop_shadow(base, xy, size, radius, blur=16, dy=4, color=(44, 58, 75, 26))
    paste_nine_slice(base, _CARD_CACHE["card"], xy, size, 64)


def star(base, xy, size, on=True):
    ic = icon("star-on" if on else "star-off", size,
              C["amber"] if on else C["line"])
    base.alpha_composite(ic, xy)


def deco_house(base, cx, top, u=54, alpha=0.55):
    """主界面装饰：四块板缩小、半透明拼成的小房子（主理人 2026-11-18 定的方案）。

    零成本、呼应玩法、填补标题上方的空白。**纯装饰**：
      · 不参与任何判定，程序一套 Canvas 变换即可（4 个 fillPath + 1 次 globalAlpha）
      · 不显示描边文字、不带交互、点击穿透
      · 正式关卡里不许出现这种"非解"的摆法做提示，只出现在主界面
    摆法只是示意，程序可自由重排——只要 4 块都在、都半透明、都读得出是房子。
    """
    w = 3 * u                                    # A 与 D 都是 3 单位宽
    ox = cx - w / 2.0
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw_piece(layer, "D", u, ox, top)           # 顶：屋顶（D 的五边形自带斜屋顶）
    draw_piece(layer, "A", u, ox, top + u)       # 身：整条横板
    # 基座：C(1.5) + B(1) = 2.5u，居中在 3u 之下 → 两侧各留 0.25u 松动感
    draw_piece(layer, "C", u, ox + 0.25 * u, top + 2 * u)
    draw_piece(layer, "B", u, ox + 1.75 * u, top + 2 * u)
    r, g, b, a = layer.split()
    a = a.point(lambda v: int(v * alpha))
    base.alpha_composite(Image.merge("RGBA", (r, g, b, a)))


# ------------------------------------------------------------------ 屏幕 1 主界面
def screen_home(W=750, H=1624):
    bg = Image.open(os.path.join(IMG, "home_bg_desk.png")).convert("RGB")
    bg = bg.resize((W, H), Image.LANCZOS).convert("RGBA")
    dr = ImageDraw.Draw(bg)

    # 右上设置
    ic = icon("gear", 48, C["ink"])
    bg.alpha_composite(ic, (W - 48 - 44, 108))

    # 装饰性拼板小房子（主理人 2026-11-18 定稿：放**标题下方、主按钮上方**居中）
    # 摆放刻意保持松散、不排紧 —— 严丝合缝会被玩家当成"标准答案"去临摹，
    # 四巧板是多解的，露出缺口才传达"这几块能拼出形状"而不是"照这个拼"。
    deco_house(bg, W // 2, 730, u=54, alpha=0.55)

    # 标题区（6.4 字号层级：主标题 64）
    text_center(dr, (0, 466, W, 566), "四巧 · 七巧", 64, C["ink"], bold=True)
    text_center(dr, (0, 572, W, 612), "午后三点，桌上那盒彩色拼板", 24, C["ink2"])

    # 主按钮
    bw, bh = 400, 104
    capsule_button(bg, ((W - bw) // 2, 1010), (bw, bh), "开始  第 1 关")
    # 次按钮
    capsule_button(bg, ((W - 220) // 2, 1150), (220, 88), "选关", kind="secondary")

    # 底部版本信息（辅助 24）
    text_center(dr, (0, H - 170, W, H - 130), "v0.1 四巧板启蒙", 24, C["ink2"])
    return bg


# ------------------------------------------------------------------ 屏幕 2 对局页
def screen_play(W=750, H=1624):
    bg = Image.open(os.path.join(IMG, "home_bg_desk.png")).convert("RGB")
    bg = bg.resize((W, H), Image.LANCZOS).convert("RGBA")
    dr = ImageDraw.Draw(bg)

    # ---- 顶栏：总高 120（含 88 顶部安全区）→ 可用内容带只有 88–120 = 32px。
    #      所以图标视觉 30（热区仍给 88×88 透明块），标题 30，计时 24。
    ic = icon("back", 30, C["ink"])
    bg.alpha_composite(ic, (44, 89))
    text_center(dr, (0, 86, W, 124), "第 5 关 · 房子", 30, C["ink"], bold=True)
    text_center(dr, (W - 190, 86, W - 44, 124), "00:38", 24, C["ink2"])

    # ---- 拼图区：**702×702 正方形**（策划 6.3 定稿），圆角 28，投影 0 4px 16px rgba(44,58,75,.10)
    #      1000×1000 归一化坐标必须等比映射进正方形，否则 45° 角会被拉歪
    px, py, pw, ph = 24, 120, 702, 702
    drop_shadow(bg, (px, py), (pw, ph), 28, blur=16, dy=4, color=(44, 58, 75, 26))
    paper = Image.open(os.path.join(IMG, "board_paper.png")).convert("RGB")
    paper = paper.resize((pw, ph), Image.LANCZOS)
    paste_rounded(bg, paper, (px, py), 28)

    # ---- 目标轮廓（第 5 关：房子剪影）填充 #E8EEF7 / 虚线 #9FB6D0 8-6
    cx = px + pw / 2
    house = [(cx - 196, py + 250), (cx, py + 96), (cx + 196, py + 250),
             (cx + 196, py + 560), (cx - 196, py + 560)]
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(ov).polygon(house, fill=C["outline"] + (255,))

    # 8-6 虚线：沿多边形周长按弧长打点
    per = []
    for i in range(len(house)):
        a, b = house[i], house[(i + 1) % len(house)]
        per.append((a, b))
    for a, b in per:
        L = ((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2) ** 0.5
        t = 0.0
        while t < L:
            t2 = min(t + 8, L)
            x1 = a[0] + (b[0] - a[0]) * t / L
            y1 = a[1] + (b[1] - a[1]) * t / L
            x2 = a[0] + (b[0] - a[0]) * t2 / L
            y2 = a[1] + (b[1] - a[1]) * t2 / L
            ImageDraw.Draw(ov).line([(x1, y1), (x2, y2)],
                                    fill=C["outline_d"] + (255,), width=3)
            t += 14
    bg.alpha_composite(ov)

    # ---- 已放置 3 块板（示意装配，非关卡解；真实几何由程序按关卡数据绘制）
    U = 100
    draw_piece(bg, "A", U, 179, py + 460)      # 300x100，底边与房子底边齐
    draw_piece(bg, "B", U, 179, py + 360)      # 100x100，紧贴 A 上沿
    draw_piece(bg, "C", U, 279, py + 360)      # 150x100

    # ---- 覆盖率进度条（带 y 822–880，h=14，圆角 999）—— 标签在左，条在右（策划 6.3 示意）
    by = 843
    text_left(dr, (24, 831), "覆盖 66%", 30, C["ink"])
    bx, bwid = 190, W - 24 - 190
    dr.rounded_rectangle([bx, by, bx + bwid, by + 14], radius=7, fill=C["track"])
    pct = 0.66
    fillw = int(bwid * pct)
    gd = vgrad(fillw, 14, C["green"], C["green_d"]).resize((fillw, 14))
    m = rounded_mask((fillw, 14), 7)
    gd = gd.convert("RGBA")
    gd.putalpha(m)
    bg.alpha_composite(gd, (bx, by))

    # ---- 托盘：y 880–1380（h=500）；槽位 168，间距 10（4×168+3×10=702，正好满宽）
    #      四个槽位一律先画虚线框，留在托盘里的板画在框上面 —— 这样"已取走"与"待取"一眼可分
    ty = 880 + (500 - 168) // 2
    slot = 168
    gap = 10
    for i in range(4):
        sx = px + i * (slot + gap)
        sl = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ds = ImageDraw.Draw(sl)
        x0, y0 = sx, ty
        corners = [(x0, y0), (x0 + slot, y0), (x0 + slot, y0 + slot),
                   (x0, y0 + slot)]
        for e in range(4):
            a, b = corners[e], corners[(e + 1) % 4]
            L = ((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2) ** 0.5
            t = 0.0
            while t < L:
                t2 = min(t + 7, L)
                ds.line([(a[0] + (b[0] - a[0]) * t / L,
                          a[1] + (b[1] - a[1]) * t / L),
                         (a[0] + (b[0] - a[0]) * t2 / L,
                          a[1] + (b[1] - a[1]) * t2 / L)],
                        fill=(0xD4, 0xDD, 0xE9, 255), width=2)
                t += 12
        bg.alpha_composite(sl)

    # D 仍留在托盘里（待用）：等比缩放进 168×168 槽位并居中（7.1）
    ud = fit_u("D", slot - 24, slot - 24)
    dw, dh = piece_size("D", ud)
    draw_piece(bg, "D", ud, px + 3 * (slot + gap) + (slot - dw) / 2,
               ty + (slot - dh) / 2)

    # ---- 工具栏：y 1420–1624（含底部安全区），按钮 120×100 间距 16（策划 6.4）
    names = ["rotate-left", "rotate-right", "flip", "hint", "reset"]
    total = 5 * 120 + 4 * 16
    tx = (W - total) // 2
    for i, n in enumerate(names):
        tool_button(bg, (tx + i * 136, 1424), n)
    return bg


# ------------------------------------------------------------------ 屏幕 3 结算面板
def screen_result(W=750, H=1624):
    bg = Image.open(os.path.join(IMG, "home_bg_desk.png")).convert("RGB")
    bg = bg.resize((W, H), Image.LANCZOS).convert("RGBA")
    dr = ImageDraw.Draw(bg)

    # 轻遮罩 rgba(60,45,35,.24) —— 暖棕底，与木桌同色系不发灰绿。
    # 原 rgba(44,58,75,.28) 是冷墨蓝，盖在暖木底上会发灰绿（主理人 2026-11-18 定案）
    ov = Image.new("RGBA", (W, H), C["mask"] + (61,))
    bg.alpha_composite(ov)

    pw, ph = 590, 700
    px, py = (W - pw) // 2, (H - ph) // 2 - 40
    draw_card(bg, (px, py), (pw, ph), radius=32)
    dr = ImageDraw.Draw(bg)

    text_center(dr, (px, py + 52, px + pw, py + 126), "拼好了", 44, C["ink"], bold=True)
    text_center(dr, (px, py + 130, px + pw, py + 170), "第 5 关 · 房子", 24, C["ink2"])

    # 三颗星（逐颗点亮，此处满星）
    for i in range(3):
        star(bg, (px + pw // 2 - 84 + i * 58, py + 196), 56, True)

    # 用时 / 步数
    text_center(dr, (px + 40, py + 292, px + pw // 2, py + 336), "00:52", 30, C["ink"], True)
    text_center(dr, (px + pw // 2, py + 292, px + pw - 40, py + 336), "9 步", 30, C["ink"], True)
    text_center(dr, (px + 40, py + 336, px + pw // 2, py + 372), "用时", 24, C["ink2"])
    text_center(dr, (px + pw // 2, py + 336, px + pw - 40, py + 372), "步数", 24, C["ink2"])

    capsule_button(bg, (px + 45, py + 418), (pw - 90, 96), "下一关")
    capsule_button(bg, (px + 45, py + 536), ((pw - 110) // 2, 84), "重玩", kind="secondary")
    capsule_button(bg, (px + 45 + (pw - 110) // 2 + 20, py + 536),
                   ((pw - 110) // 2, 84), "回列表", kind="secondary")
    return bg


# ------------------------------------------------------------------ 屏幕 4 规范图
def screen_spec(W=750, H=1624):
    bg = Image.new("RGBA", (W, H), (0xFB, 0xF7, 0xF0, 255))
    dr = ImageDraw.Draw(bg)

    def dash(p0, p1, col=(0xB9, 0xC2, 0xCE, 255), seg=6.0, gap=5.0, w=2):
        L = ((p1[0] - p0[0]) ** 2 + (p1[1] - p0[1]) ** 2) ** 0.5
        t = 0.0
        while t < L:
            t2 = min(t + seg, L)
            dr.line([(p0[0] + (p1[0] - p0[0]) * t / L,
                      p0[1] + (p1[1] - p0[1]) * t / L),
                     (p0[0] + (p1[0] - p0[0]) * t2 / L,
                      p0[1] + (p1[1] - p0[1]) * t2 / L)], fill=col, width=w)
            t += seg + gap

    # ---- 板件
    text_left(dr, (44, 36), "板件视觉规格（纯色 / 同色系加深描边 / 顶部内高光）", 28,
              C["ink"], True)
    cell_w, cell_h = 330, 140
    for i, key in enumerate("ABCD"):
        cx0 = 44 + (i % 2) * cell_w
        cy0 = 84 + (i // 2) * cell_h
        u = fit_u(key, 250, 96)
        pw_, ph_ = piece_size(key, u)
        draw_piece(bg, key, u, cx0 + (250 - pw_) / 2, cy0 + 4 + (96 - ph_) / 2)
        text_left(dr, (cx0, cy0 + 106), "%s  %s" % (
            key, {"A": "珊瑚橙 #FF8A5B", "B": "天空蓝 #4FA8E0",
                  "C": "嫩芽绿 #63C88B", "D": "葡萄紫 #A87BE8"}[key]),
                  18, C["ink2"])

    # ---- 按钮三级
    y = 376
    text_left(dr, (44, y), "按钮三级（主按钮文字 #7A4A00 深棕，不用白字）", 28,
              C["ink"], True)
    y += 46
    capsule_button(bg, (44, y), (300, 96), "主按钮")
    capsule_button(bg, (370, y + 6), (200, 84), "次按钮", kind="secondary")
    y += 112
    names = ["rotate-left", "rotate-right", "flip", "hint", "reset"]
    total = 5 * 120 + 4 * 16
    tx = (W - total) // 2
    for i, n in enumerate(names):
        tool_button(bg, (tx + i * 136, y), n)
    y += 108
    text_left(dr, (44, y), "工具栏按钮 120×100 / 间距 16 —— 已用满 702 宽度，无放大空间", 18,
              C["ink2"])
    y += 24
    text_left(dr, (44, y), "（原文 148×130 系笔误：5×148=740，750 宽也放不下）", 18,
              C["ink2"])
    y += 34

    # ---- 图标
    text_left(dr, (44, y), "图标集（40×40 · stroke 2.5 · currentColor · 必须内联）", 26,
              C["ink"], True)
    y += 38
    allic = names + ["back", "gear", "star-on", "star-off"]
    for i, n in enumerate(allic):
        bg.alpha_composite(icon(n, 40, C["ink"]), (50 + i * 74, y))
    y += 56

    # ---- 进度条
    text_left(dr, (44, y), "覆盖率进度条（轨道 #E8EEF7 / 填充 #63C88B→#4FB87A）", 20,
              C["ink"], True)
    y += 30
    dr.rounded_rectangle([44, y, W - 44, y + 14], radius=7, fill=C["track"])
    fw = int((W - 88) * 0.66)
    gd = vgrad(fw, 14, C["green"], C["green_d"]).convert("RGBA")
    gd.putalpha(rounded_mask((fw, 14), 7))
    bg.alpha_composite(gd, (44, y))
    y += 34

    # ---- 卡片九宫格（左） + 字号层级（右）
    text_left(dr, (44, y), "九宫格切片 64", 26, C["ink"], True)
    text_left(dr, (330, y), "字号层级", 26, C["ink"], True)
    y += 38
    cw, chh, sl = 220, 280, 64
    draw_card(bg, (44, y), (cw, chh))
    for xx in (44 + sl, 44 + cw - sl):
        dash((xx, y), (xx, y + chh))
    for yy in (y + sl, y + chh - sl):
        dash((44, yy), (44 + cw, yy))
    text_left(dr, (46, y + sl - 22), "64", 17, (0x7A, 0x8A, 0x9C))
    text_left(dr, (46, y + chh - sl - 22), "64", 17, (0x7A, 0x8A, 0x9C))

    ty = y
    text_left(dr, (330, ty), "四巧 · 七巧", 64, C["ink"], True)
    ty += 84
    text_left(dr, (330, ty), "拼好了", 44, C["ink"], True)
    ty += 60
    text_left(dr, (330, ty), "按钮 32 / 正文 30 / 辅助 24", 20, C["ink2"])
    ty += 28
    text_left(dr, (330, ty), "原 48 / 40 只差 8 会糊，", 18, C["ink2"])
    ty += 24
    text_left(dr, (330, ty), "改 64 / 44 把层级拉开。", 18, C["ink2"])
    ty += 30
    text_left(dr, (330, ty), "源图 600×800 ≥ 任何尺寸，", 18, C["ink2"])
    ty += 24
    text_left(dr, (330, ty), "中间 472×672 纯白可拉伸。", 18, C["ink2"])
    y += chh + 22

    # ---- 色板
    text_left(dr, (44, y), "色板", 26, C["ink"], True)
    y += 40
    swatches = [("浅木", C["wood"]), ("白卡", C["white"]), ("主文字", C["ink"]),
                ("次文字", C["ink2"]), ("暖黄", C["amber"]),
                ("主按钮字", C["amber_ink"]), ("边线", C["line"]),
                ("轮廓线", C["outline_d"]), ("嫩芽绿", C["green"])]
    for i, (nm, col) in enumerate(swatches):
        x = 44 + i * 78
        dr.rounded_rectangle([x, y, x + 68, y + 44], radius=10,
                             fill=col, outline=(0xD8, 0xDE, 0xE8), width=1)
        text_left(dr, (x, y + 48), nm, 16, C["ink2"])
    y += 84

    # ---- 交互规格摘要
    text_left(dr, (44, y), "交互规格（策划 6.4 / 6.3 定稿）", 26, C["ink"], True)
    y += 38
    for s in ["拼图区 702×702 正方形（等比映射，非正方形会拉歪 45° 角）",
              "托盘 500 高 · 槽位 168 · 间距 10（4×168+3×10=702 满宽）",
              "最小热区 88×88；B 板视觉仅 ~30px，靠外接框外扩 14px 命中",
              "遮罩 rgba(60,45,35,.24) 暖棕；卡片投影 0 4px 16px rgba(44,58,75,.10)"]:
        text_left(dr, (44, y), s, 18, C["ink2"])
        y += 26
    return bg


# ------------------------------------------------------------------ 拼版
def main():
    W, H = 750, 1624
    frames = [("主界面 P1", screen_home()),
              ("对局页 P3", screen_play()),
              ("结算面板 P4", screen_result()),
              ("板件与控件规范", screen_spec())]

    pad, gap, label_h = 60, 70, 46
    cols, rows = 2, 2
    CW = cols * W + (cols - 1) * gap + pad * 2
    CH = rows * (H + label_h) + gap + pad * 2
    canvas = Image.new("RGB", (CW, CH), (0x2A, 0x2E, 0x36))
    dr = ImageDraw.Draw(canvas)

    for i, (name, im) in enumerate(frames):
        cx = pad + (i % cols) * (W + gap)
        cy = pad + (i // cols) * (H + label_h + gap)
        text_left(dr, (cx + 4, cy), name, 30, (0xF0, 0xF3, 0xF8), True)
        canvas.paste(im.convert("RGB"), (cx, cy + label_h))
        dr.rectangle([cx, cy + label_h, cx + W - 1, cy + label_h + H - 1],
                     outline=(0x50, 0x56, 0x60), width=2)

    out = os.path.join(HERE, "..", "风格效果图.png")
    canvas.save(out, "PNG", optimize=True)
    print("风格效果图 ->", os.path.abspath(out),
          "%.0f KB" % (os.path.getsize(out) / 1024.0))


if __name__ == "__main__":
    main()
