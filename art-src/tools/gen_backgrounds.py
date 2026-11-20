#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
《四巧·七巧》v0.1 — 三张主图程序化生成器（零图像生成积分）
=========================================================

风格依据：策划文档 6.5「晴日玩具台」+ 6.5.1 + 7.1 + 7.2 + 7.4
产出：
  assets/img/home_bg_desk.png   750x1624  浅枫木桌面（阳光光斑 + 极轻压暗）
  assets/img/board_paper.png    800x800   纯白卡纸（纤维≤4%，四角极轻阴影）
  assets/img/panel_card.png     600x800   白圆角卡片（r32 / 1px 边线 / 顶部暖光）

为什么程序化而不是 AI 出图：
  1) 三张图的性质是「受控低对比纹理 + 精确几何」，不是手绘质感，
     程序化在保真度上不输，且在「对比度必须 ≤5%/≤4%」「中间必须绝对干净」
     「圆角必须正好 32」「九宫格切片必须像素精确」这四条硬指标上是唯一可靠手段。
  2) 本版图像生成额度已在旧深色方案上用完（30/30 分），零成本是唯一可行路径。

运行：
  PYTHONPATH=<venv site-packages> python gen_backgrounds.py
"""

import os
import math
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(os.path.join(HERE, "..", "..", "assets", "img"))

# ---------------------------------------------------------------- 调色板（6.5）
BASE_WOOD = (0xF6, 0xE9, 0xD4)   # 浅木背景 #F6E9D4
WHITE     = (0xFF, 0xFF, 0xFF)   # 卡片纯白
BORDER    = (0xE3, 0xE9, 0xF2)   # 边线 #E3E9F2
WARM_TOP  = (0xFF, 0xFB, 0xF2)   # 卡片顶部受光（极淡暖白）

# 可调参数（体积/质感权衡，见文件末尾 sweep 说明）
FIBER_A = 1.2      # 极淡噪点幅度（级）
BLUR_BG = 0.0      # 桌面柔化半径（构建降采样已足够软，0=不做模糊）
BLUR_PP = 0.65     # 纸面柔化半径（px）
WARP_CELLS = 12    # 木纹弯曲的纵向采样数（越小越"长纹"，PNG 也越好压）
PHASE_CELLS = 6    # 木纹相位的纵向采样数
GRAIN_PERIOD = 132.0  # 平行纹理主周期（px）— 长周期才有"暗示性"，不成为条纹图案
GRAIN_AMP = 2.0    # 平行纹理峰谷 ±（级）— 刻意压得很低
TONE_AMP = 2.5     # 大尺度各向异性色差峰谷 ±（级）— 木纹的抽象形态
SUN_AMP = (8.0, 12.5, 12.0)   # 阳光光斑在 R/G/B 上的抬升（级）
                            # R 已接近 255 无余量，故主要抬 G/B：
                            # 光斑核心 R 被软膝收住，视觉上是"阳光把颜色晒白一点"
VIG_START = 0.60   # 压暗从归一化半径 0.55 处开始（只压最外圈）
VIG_AMP = (12.0, 11.2, 9.8)  # 压暗最大幅度（级）
BUILD_SCALE = 2    # 纹理构建降采样倍数（构建于 1/N 分辨率再上采样：
                   #   ① 木纹更柔和，符合"对比度≤5%、不抢拼图区"
                   #   ② 熵大幅下降，PNG 体积可降到 1/2 以下）

np.random.seed(20261118)


# ---------------------------------------------------------------- 噪声工具
def smooth_noise(h, w, cy, cx, seed=0, mode=Image.BICUBIC):
    """低分辨率随机场 → 双三次上采样，得到平滑连续噪声，范围约 [0,1]。"""
    rng = np.random.default_rng(seed)
    small = rng.random((max(2, cy), max(2, cx))).astype(np.float32)
    im = Image.fromarray(small, mode="F").resize((w, h), mode)
    a = np.asarray(im, dtype=np.float32)
    return (a - a.min()) / max(a.max() - a.min(), 1e-6)


def noise_1d(n, cells, seed=0):
    """一维平滑噪声，返回 shape (n,)。用于随行/随列缓慢变化的参数。"""
    rng = np.random.default_rng(seed)
    small = rng.random((max(2, cells), 1)).astype(np.float32)
    im = Image.fromarray(small, mode="F").resize((1, n), Image.BICUBIC)
    a = np.asarray(im, dtype=np.float32).ravel()
    return (a - a.min()) / max(a.max() - a.min(), 1e-6)


def fbm(h, w, octaves, base_cy, base_cx, seed=0, gain=0.5):
    """多倍频叠加（fractional brownian motion），返回 [0,1]。"""
    out = np.zeros((h, w), dtype=np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        cy = base_cy * (2 ** o)
        cx = base_cx * (2 ** o)
        out += amp * smooth_noise(h, w, cy, cx, seed + o * 977)
        tot += amp
        amp *= gain
    out /= tot
    a = out - out.min()
    return a / max(a.max(), 1e-6)


def soft_knee(v, knee=240.0, top=252.0):
    """软膝压缩：knee 以下线性不动，knee 以上平滑渐进逼近 top，永不硬截断。

    C1 连续（knee 处导数为 1），所以高光区的渐变不会出现"色阶断口"。
    """
    span = top - knee
    over = np.maximum(v - knee, 0.0)
    v2 = knee + span * (1.0 - np.exp(-over / span))
    return np.where(v > knee, v2, v)


def upscale(arr, W, H):
    """把 (h,w) 或 (h,w,C) 的 float 数组双三次上采样到 (H,W)。"""
    if arr.ndim == 3:
        chans = []
        for c in range(arr.shape[2]):
            im = Image.fromarray(arr[:, :, c].astype(np.float32), mode="F")
            chans.append(np.asarray(im.resize((W, H), Image.BICUBIC),
                                    dtype=np.float32))
        return np.stack(chans, axis=2)
    im = Image.fromarray(arr.astype(np.float32), mode="F")
    return np.asarray(im.resize((W, H), Image.BICUBIC), dtype=np.float32)


def resolve(off, base, blur=0.55, knee=251.0, top=255.0):
    """把「零均值光照偏移场」落成 8bit RGB。

    步骤：
      1) 偏移场去均值  —— 光照只做明暗再分配，整体色值锁定为 base
                         （若不去均值，高光区会把通道顶到 255 被硬截断，
                           均值就永远校不回 base——这是第一版的 bug）
      2) 软膝压缩      —— 高光区平滑收敛，不做硬裁切，保住渐变层次
      3) 柔化 0.75px   —— 去掉逐像素抖动，PNG 体积可降到 1/3
      4) 复校均值      —— 抵消压缩与 8bit 取整误差，确保平均值精确等于 base
    """
    base = np.array(base, dtype=np.float64)
    img = base + off.astype(np.float64)

    def recenter(a):
        """float64 求均值后校正（float32 在大图上累积误差可达 1.5 级）。"""
        for _ in range(3):
            a += base - a.mean(axis=(0, 1), keepdims=True)
        return a

    img = recenter(img)
    img = soft_knee(img, knee=knee, top=top)

    im = Image.fromarray(np.clip(np.round(img), 0, 255).astype(np.uint8),
                         mode="RGB")
    if blur >= 0.6:                       # PIL 对 radius<1 近似 no-op，直接跳过
        im = im.filter(ImageFilter.GaussianBlur(blur))
    img = np.asarray(im, dtype=np.float64)

    img = recenter(img)
    img = soft_knee(img, knee=252.5, top=255.0)        # 复校后的保护膝

    out = np.clip(np.round(img), 0, 255).astype(np.uint8)
    # 末级整数微调：把软膝与 8bit 取整带来的残余补回去，
    # 保证交付资产的实测平均值 == 策划规定的色值（程序可直接校验）
    resid = np.round(base - out.astype(np.float64).mean(axis=(0, 1)))
    if np.any(resid != 0):
        out = np.clip(out.astype(np.int16) + resid.astype(np.int16),
                      0, 255).astype(np.uint8)
    return out


def stats(name, arr3):
    """打印均值/极值，用于核对「对比度」硬指标（float64 求均值，避免累积误差）。"""
    a = arr3.astype(np.float64)
    mean = a.mean(axis=(0, 1))
    lum = a.mean(axis=2)
    print("    %-12s mean=#%02X%02X%02X  min=%.0f max=%.0f  "
          "range=%.1f (%.2f%% of mean)"
          % (name, int(round(mean[0])), int(round(mean[1])),
             int(round(mean[2])),
             lum.min(), lum.max(), lum.max() - lum.min(),
             (lum.max() - lum.min()) / lum.mean() * 100))


# ================================================================ 1. 主界面背景
def make_home_bg(W=750, H=1624):
    """浅枫木桌面。

    分层（全部叠加在 #F6E9D4 基色上）：
      L1 木纹 (grain)      —— 纵向纹理，峰谷幅度 ±5 级（≈4.1% 对比度，硬指标 ≤5%）
      L2 细纤维 (fiber)    —— ±1.5 级高频噪点，让平面不"塑料"
      L3 阳光光斑 (sun)    —— 左上，暖白，边缘羽化，峰值 +11/+7/+2（暖色偏移）
      L4 方向性亮部        —— 左上到右下的极缓梯度，厚度感
      L5 压暗 (vignette)   —— 四周极轻，最边缘 -12 级
    """
    # ---- 纹理在 1/BUILD_SCALE 分辨率上构建，再双三次上采样到设计尺寸。
    # 好处：① 木纹更柔和（符合"≤5% 对比度、不抢拼图区"）
    #       ② 熵大幅下降，PNG 体积降到 1/2 以下
    SC = max(1, int(BUILD_SCALE))
    Hs, Ws = max(16, H // SC), max(16, W // SC)
    ys = np.arange(Hs, dtype=np.float32)[:, None]
    xs = np.arange(Ws, dtype=np.float32)[None, :]

    # ---------- L1 大尺度色差（木材的"块面感"，不是"纹理"）
    # 抽象优先原则：只给大块明暗起伏。不试图做节疤/年轮/导管孔——
    # 在 ≤5% 对比度下那些细节做不出来，硬做只会变成"塑料贴皮"。
    # 各向异性：纵向采样密、横向采样疏 → 得到"竖条状色块"，
    # 这正是木纹在低对比度下的抽象形态（不是画线，是大色块被拉长）。
    tone = (fbm(Hs, Ws, 3, 14, 2, seed=201) - 0.5) * 2.0          # [-1,1]
    tone *= TONE_AMP

    # ---------- L2 极淡平行纹理（"暗示性"纹理：能感觉到走向，但数不出条纹）
    # 周期故意放长：750 宽只有 5~6 条；幅度只有 ±2 级。
    # 关键是「疏密调制」——大部分区域纹理接近 0，只有局部淡淡透出几道，
    # 这样才像木头，而不是像印满条纹的贴纸。
    warp = ((noise_1d(Hs, 5, seed=11) - 0.5) * 60.0 / SC)[:, None]
    u = xs + warp
    phase = ((noise_1d(Hs, 4, seed=23) - 0.5) * 3.2)[:, None]
    period = GRAIN_PERIOD / SC                                    # 主周期（构建系 px）

    g = np.sin(2 * np.pi * u / period + phase)
    dens = smooth_noise(Hs, Ws, 4, 3, seed=37)
    dens = 0.35 + 0.65 * dens                                     # 处处都在，但强弱不一
    grain = g * dens
    grain = grain / max(np.abs(grain).max(), 1e-6) * GRAIN_AMP

    print("    纹理层: 大尺度色差 %+.1f~%+.1f 级 / 平行纹理 %+.1f~%+.1f 级"
          % (tone.min(), tone.max(), grain.min(), grain.max()))
    print("    纹理合计峰谷 = %.1f 级 (%.2f%% of base, 硬指标 ≤5%%)"
          % ((tone + grain).max() - (tone + grain).min(),
             ((tone + grain).max() - (tone + grain).min()) / 230.0 * 100))

    # ---------- L3 极淡噪点（只为了让平面不"塑料"，不承载任何造型）
    fiber = (smooth_noise(Hs, Ws, Hs // 3, Ws // 3, seed=51) - 0.5) * FIBER_A
    fiber += (smooth_noise(Hs, Ws, Hs // 6, Ws // 6, seed=53) - 0.5) * (FIBER_A * 0.5)

    # ---------- 组装光照偏移场（零均值：光照只做明暗再分配，不抬高整体亮度）
    off = np.zeros((Hs, Ws, 3), dtype=np.float32)
    off += (tone + grain + fiber)[:, :, None]

    # L4 阳光光斑 —— 这张图的灵魂。
    # 中心刻意放在画面**外侧**（左上角外面），只让衰减曲线落在画面内，
    # 这样永远不会看到"一个明显的光圈"，只有一整片从左上渗进来的暖光。
    sx, sy = Ws * 0.08, Hs * 0.07
    rx, ry = Ws * 0.78, Hs * 0.62
    d2 = ((xs - sx) / rx) ** 2 + ((ys - sy) / ry) ** 2
    sun = np.exp(-(d2 ** 0.85))       # 指数 <1 → 衰减更缓、边缘更软
    off += sun[:, :, None] * SUN_AMP

    # L5 四周极轻压暗（只作用在最外圈，避免吃掉整体明度预算）
    nx = (xs - Ws / 2) / (Ws / 2)
    ny = (ys - Hs / 2) / (Hs / 2)
    r = np.sqrt((nx * 0.92) ** 2 + (ny * 0.72) ** 2) / 1.18
    vig = np.clip((r - VIG_START) / (1.0 - VIG_START), 0, 1) ** 1.6
    off -= vig[:, :, None] * VIG_AMP

    img = resolve(upscale(off, W, H), BASE_WOOD, blur=BLUR_BG)
    return img


# ================================================================ 2. 白卡纸
def make_board_paper(W=800, H=800):
    """纯白卡纸。

      L1 纸纤维   —— 极细，峰谷 ±2.2 级（1.7%）
      L2 长纤维   —— 极淡，只在局部出现
      L3 四角阴影 —— 让纸"浮"起来，角上最深 -7 级（凑总对比度仍 ≤4%）
      中间区域不出任何斑点/污渍（代码保证）
    """
    y = np.arange(H, dtype=np.float32)[:, None]
    x = np.arange(W, dtype=np.float32)[None, :]

    # L1 细纤维（~3px 尺度：逐像素噪声会毁掉 PNG 压缩）
    fib = (smooth_noise(H, W, H // 3, W // 3, seed=101) - 0.5) * 3.6
    fib += (smooth_noise(H, W, H // 7, W // 7, seed=103) - 0.5) * 2.2

    # L2 长纤维：极低频的横向细纹，幅度更小
    laid = (smooth_noise(H, W, 6, 90, seed=107) - 0.5) * 1.5

    lum = fib + laid

    img = np.full((H, W, 3), 255.0, dtype=np.float32)
    img += lum[:, :, None]

    # L3 四角阴影（径向，羽化半径 150px，最深 7 级）
    rad = 150.0
    for cx, cy in ((0, 0), (W, 0), (0, H), (W, H)):
        d = np.sqrt((x - cx) ** 2 + (y - cy) ** 2) / rad
        sh = np.exp(-(d ** 1.9))
        # 阴影略偏冷（纸张抬起的投影），但整体仍近中性
        img[:, :, 0] -= 7.0 * sh
        img[:, :, 1] -= 6.6 * sh
        img[:, :, 2] -= 5.8 * sh

    # 中央 60% 区域强制拉平（保证目标轮廓不受纸纹干扰）
    m = int(W * 0.20)
    cy0, cy1 = int(H * 0.20), int(H * 0.80)
    cx0, cx1 = m, W - m
    center = img[cy0:cy1, cx0:cx1]
    mean_c = center.mean(axis=(0, 1))
    img[cy0:cy1, cx0:cx1] = mean_c + (center - mean_c) * 0.55

    im = Image.fromarray(np.clip(np.round(img), 0, 255).astype(np.uint8),
                         mode="RGB")
    im = im.filter(ImageFilter.GaussianBlur(BLUR_PP))
    out = np.asarray(im, dtype=np.uint8)
    return out


# ================================================================ 3. 白卡片
def make_panel_card(W=600, H=800, radius=32, border=1):
    """白圆角卡片，透明背景，图内不带投影（投影由 CSS 加）。

    - 圆角 32（600 宽下，= 策划 6.5.1）
    - 边缘 1px #E3E9F2（内侧描边，随圆角走）
    - 顶部 64px 内一道极淡暖色渐变（顶部受光）
    - 九宫格：四角装饰全部落在 64px 半径内 → slice = 64
    """
    SS = 4                                                            # 超采样
    w, h = W * SS, H * SS
    r = radius * SS
    bw = border * SS

    # --- 圆角矩形蒙版（超采样 + 高质量缩放 = 抗锯齿）
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, w - 1, h - 1],
                                           radius=r, fill=255)
    mask = mask.resize((W, H), Image.LANCZOS)
    alpha = np.asarray(mask, dtype=np.float32) / 255.0

    # --- 底色：白 + 顶部暖光渐变（仅前 64px，正好落在九宫格上切片内）
    G = 64
    img = np.full((H, W, 3), 0.0, dtype=np.float32)
    img[:, :, :] = WHITE
    for yy in range(min(G, H)):
        t = 1.0 - yy / float(G)                                       # 顶部 1 → 64px 处 0
        t = t ** 1.35                                                 # 更快收住，避免"黄带"
        for c in range(3):
            img[yy, :, c] = WARM_TOP[c] * t + WHITE[c] * (1 - t)

    # --- 1px 边线：沿圆角矩形内侧描一圈
    ring = Image.new("L", (w, h), 0)
    dr = ImageDraw.Draw(ring)
    dr.rounded_rectangle([0, 0, w - 1, h - 1], radius=r, outline=255,
                         width=bw)
    ring = ring.resize((W, H), Image.LANCZOS)
    ra = (np.asarray(ring, dtype=np.float32) / 255.0)[..., None]
    img = img * (1 - ra) + np.array(BORDER, dtype=np.float32) * ra

    # --- 打包 RGBA
    out = np.zeros((H, W, 4), dtype=np.uint8)
    out[:, :, :3] = np.clip(img, 0, 255).astype(np.uint8)
    out[:, :, 3] = np.clip(alpha * 255.0 + 0.5, 0, 255).astype(np.uint8)
    return out


# ================================================================ 输出
def save_png(arr, name, description):
    path = os.path.join(OUT, name)
    im = Image.fromarray(arr, mode="RGBA" if arr.shape[2] == 4 else "RGB")
    im.save(path, "PNG", optimize=True)
    kb = os.path.getsize(path) / 1024.0
    print("  %-18s %4dx%-4d %7.1f KB   %s"
          % (name, arr.shape[1], arr.shape[0], kb, description))
    return path


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    print("输出目录:", OUT)

    print("\n[1/3] home_bg_desk.png — 浅枫木桌面")
    bg = make_home_bg()
    stats("desk", bg)
    save_png(bg, "home_bg_desk.png", "P1 主界面背景")

    print("\n[2/3] board_paper.png — 白卡纸")
    pp = make_board_paper()
    stats("paper", pp)
    save_png(pp, "board_paper.png", "对局页拼图区衬底")

    # [3/3] panel_card.png —— 恢复使用（主理人 2026-11-18 二次决定）
    # 原因：程序两端（浏览器 + 微信）共用同一套 Canvas 渲染，九宫格绘一张图
    #      比手写"圆角 + 渐变裁剪"更统一、更不容易出错；5.6KB 忽略不计。
    # 九宫格 slice = 64（四角装饰全部落在 64px 内，中间区纯白可直接拉伸）。
    print("\n[3/3] panel_card.png — 白圆角卡片")
    pc = make_panel_card()
    stats("card(RGB)", pc[:, :, :3])
    save_png(pc, "panel_card.png", "结算/设置/关卡格底衬（slice 64）")

    print("\n完成（本版交付 3 张图）。")
