# 严格核对：8 个 45° 朝向 × 面积归一 × 质心对齐，找与照片剪影最贴合的朝向
# 用法：node tools/figs4/export_new6.js 之后 python tools/figs4/pick_rot.py
import json, os, math
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')

poly = json.load(open(os.path.join(OUT, 'poly.json'), encoding='utf-8'))
new6 = json.load(open(os.path.join(OUT, 'new6.json'), encoding='utf-8'))

N = 200      # 采样网格


def area(P):
    s = 0.0
    for i in range(len(P)):
        x1, y1 = P[i]; x2, y2 = P[(i + 1) % len(P)]
        s += x1 * y2 - x2 * y1
    return abs(s) / 2.0


def centroid(P):
    a = 0.0; cx = 0.0; cy = 0.0
    for i in range(len(P)):
        x1, y1 = P[i]; x2, y2 = P[(i + 1) % len(P)]
        cr = x1 * y2 - x2 * y1
        a += cr; cx += (x1 + x2) * cr; cy += (y1 + y2) * cr
    a /= 2.0
    if abs(a) < 1e-12:
        return (0.0, 0.0)
    return (cx / (6 * a), cy / (6 * a))


def prep(P, scale):
    """平移到质心原点 + 按 sqrt(面积) 归一（尺度不变，与 bbox 无关）"""
    c = centroid(P)
    return [((p[0] - c[0]) * scale, (p[1] - c[1]) * scale) for p in P]


def inside(x, y, P):
    c = False
    for i in range(len(P)):
        x1, y1 = P[i]; x2, y2 = P[(i + 1) % len(P)]
        if (y1 > y) != (y2 > y):
            xi = (x2 - x1) * (y - y1) / (y2 - y1) + x1
            if x < xi:
                c = not c
    return c


def iou(A, B, R=120):
    xs = [p[0] for p in A + B]; ys = [p[1] for p in A + B]
    r = max(max(xs) - min(xs), max(ys) - min(ys)) * 0.6
    ia = ua = 0
    for i in range(-R, R + 1):
        for j in range(-R, R + 1):
            x = r * i / R; y = r * j / R
            a = inside(x, y, A); b = inside(x, y, B)
            if a and b: ia += 1
            if a or b: ua += 1
    return ia / max(ua, 1)


print('%-4s %-6s %-8s %s' % ('tag', 'lv', 'best', '8 个朝向的 IoU'))
for k, lv in enumerate(new6):
    tag = 'f%d' % (k + 1)
    A0 = poly[tag]['poly']
    B0 = lv['outline']
    # 两者都按 sqrt(面积) 归一到同一尺度
    sA = 100.0 / math.sqrt(area(A0))
    sB = 100.0 / math.sqrt(area(B0))
    A = prep(A0, sA)
    res = []
    for rot in range(8):
        th = math.radians(45 * rot)
        R = [(p[0] * math.cos(th) - p[1] * math.sin(th),
              p[0] * math.sin(th) + p[1] * math.cos(th)) for p in B0]
        B = prep(R, sB)
        res.append((iou(A, B), 45 * rot))
    best = max(res)
    print('%-4s %-6s %-8s %s' % (tag, lv['id'], '%d°' % best[1],
          '  '.join('%d°:%.3f' % (rot, v) for v, rot in res)))
