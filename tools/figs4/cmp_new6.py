# 把「照片里的剪影」与「游戏里实际用的关卡轮廓」摆在一起，人工核对（v0.45）
# 用法：node tools/figs4/export_new6.js 之后 python tools/figs4/cmp_new6.py
import json, os, math
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')

poly = json.load(open(os.path.join(OUT, 'poly.json'), encoding='utf-8'))
new6 = json.load(open(os.path.join(OUT, 'new6.json'), encoding='utf-8'))

W, H = 1200, 460      # 三栏：照片 / 叠加 / 游戏
PW, PH = 360, 360
S = 300.0             # 每个形状归一化到 300px

def place(pts, ox, oy, sx=1.0, sy=1.0):
    """把形状按 bbox 归一化后居中放到 (ox,oy) 的 PW×PH 画框里"""
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    w = max(xs) - min(xs); h = max(ys) - min(ys)
    sc = min(PW * 0.86 / w, PH * 0.86 / h)
    cx = (min(xs) + max(xs)) / 2.0; cy = (min(ys) + max(ys)) / 2.0
    return [(ox + PW / 2 + sx * (p[0] - cx) * sc,
             oy + PH / 2 - sy * (p[1] - cy) * sc) for p in pts]

def frame(d, ox, oy, title):
    d.rectangle([ox, oy, ox + PW, oy + PH], outline=(200, 200, 200))
    d.text((ox + 6, oy + 6), title, fill=(30, 30, 30))

for k, lv in enumerate(new6):
    tag = 'f%d' % (k + 1)
    A = poly[tag]['poly']                      # 照片剪影（已归一到 6u²）
    B = lv['outline']                          # 游戏关卡轮廓（世界坐标）
    im = Image.new('RGB', (W, H), (252, 250, 246))
    d = ImageDraw.Draw(im)

    # 1) 照片剪影
    frame(d, 20, 60, '%s  照片剪影' % tag)
    d.polygon(place(A, 20, 60), fill=(196, 196, 196), outline=(25, 25, 25))
    for p in place(A, 20, 60):
        x, y = p; d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=(25, 25, 25))

    # 2) 叠加：灰底 + 红线（8 个 45° 朝向里取形距最小的那个，和 finalize.js 同口径）
    frame(d, 420, 60, '%s  照片(灰) vs 关卡(红)' % tag)
    AP = place(A, 420, 60)
    d.polygon(AP, fill=(214, 214, 214), outline=None)
    best = None
    for r in range(8):
        th = math.radians(45 * r)
        rot = [(p[0] * math.cos(th) - p[1] * math.sin(th),
                p[0] * math.sin(th) + p[1] * math.cos(th)) for p in B]
        # 归一化后比较（形距用面积对称差近似）
        BP = place(rot, 420, 60)
        sa = abs(sum(AP[i][0] * AP[(i + 1) % len(AP)][1] - AP[(i + 1) % len(AP)][0] * AP[i][1]
                     for i in range(len(AP)))) / 2
        # 采样点法：在 B 内部打点，落在 A 内的比例 + 反向
        def inside(pt, P):
            x, y = pt; c = False
            for i in range(len(P)):
                x1, y1 = P[i]; x2, y2 = P[(i + 1) % len(P)]
                if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1 + 1e-12) + x1:
                    c = not c
            return c
        xs = [p[0] for p in BP]; ys = [p[1] for p in BP]
        pts = []
        n = 46
        for i in range(n + 1):
            for j in range(n + 1):
                pts.append((min(xs) + (max(xs) - min(xs)) * i / n,
                            min(ys) + (max(ys) - min(ys)) * j / n))
        inter = sum(1 for p in pts if inside(p, BP) and inside(p, AP))
        uni = sum(1 for p in pts if inside(p, BP) or inside(p, AP))
        hd = 1 - inter / max(uni, 1)
        if best is None or hd < best[0]:
            best = (hd, r, BP)
    hd, r, BP = best
    d.line(BP + [BP[0]], fill=(214, 30, 60), width=3)
    d.text((430, 430), 'rot=%d  IoU形距=%.3f' % (45 * r, hd), fill=(160, 20, 40))

    # 3) 游戏轮廓单独一张
    frame(d, 820, 60, '第 %d 关  关卡轮廓' % lv['id'])
    GP = place(B, 820, 60)
    d.polygon(GP, fill=(255, 226, 168), outline=(200, 120, 20))
    d.line(GP + [GP[0]], fill=(200, 120, 20), width=2)

    im.save(os.path.join(OUT, 'cmp45_%s.png' % tag))
    print('cmp45_%s.png  第%d关  rot=%d  IoU形距=%.3f' % (tag, lv['id'], 45 * r, hd))
