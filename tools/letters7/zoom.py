# 单字母放大对照：参考 | 解 | 叠加（红=只有参考，蓝=只有解，深色=重合）
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
im = Image.open(os.path.join(HERE, 'ref.webp')).convert('RGB')
W, H = im.size
GS = json.load(open(os.path.join(HERE, 'grid.json'), encoding='utf8'))
P = GS['A']
BOX = {c['ch']: c['box'] for c in GS['cells']}
PJ = {r['ch']: r for r in json.load(open(os.path.join(HERE, 'pieces.json'), encoding='utf8'))}
SOL = {r['ch']: r for r in json.load(open(os.path.join(HERE, 'tiled3.json'), encoding='utf8'))}
a = np.asarray(im).astype(np.int16)
mx = a.max(axis=2); mn = a.min(axis=2)
sat = (mx - mn > 60) & (mx > 110)


def poly_area(p):
    s = 0.0
    for i in range(len(p)):
        x1, y1 = p[i]; x2, y2 = p[(i + 1) % len(p)]
        s += x1 * y2 - x2 * y1
    return abs(s) / 2


def poly_centroid(p):
    s = cx = cy = 0.0
    n = len(p)
    for i in range(n):
        x1, y1 = p[i]; x2, y2 = p[(i + 1) % n]
        cr = x1 * y2 - x2 * y1
        s += cr; cx += (x1 + x2) * cr; cy += (y1 + y2) * cr
    s /= 2
    return (cx / (6 * s), cy / (6 * s))


def resolve(ch, dx=0, dy=0):
    """返回 (lat, cp)：lattice 顶点（已减去质心）与像素质心"""
    rec = SOL[ch]; pj = PJ[ch]
    hulls = sorted(pj['pieces'], key=lambda p: -p['n'])[:7]
    tot = 0.0; cl = [0.0, 0.0]
    for p in rec['pieces']:
        pa = poly_area([tuple(v) for v in p['poly']])
        pc = poly_centroid([tuple(v) for v in p['poly']])
        tot += pa; cl[0] += pc[0] * pa; cl[1] += pc[1] * pa
    cl = (cl[0] / tot, cl[1] / tot)
    tw = 0.0; cp = [0.0, 0.0]
    for h in hulls:
        cen = poly_centroid([tuple(v) for v in h['hull']])
        tw += h['n']; cp[0] += cen[0] * h['n']; cp[1] += cen[1] * h['n']
    cp = (cp[0] / tw, cp[1] / tw)
    lat = [[(v[0] - cl[0], v[1] - cl[1]) for v in p['poly']] for p in rec['pieces']]
    return lat, (cp[0] + dx, cp[1] + dy)


def best_shift(ch, rng=4):
    lat, cp = resolve(ch)
    x0, y0, x1, y1 = [int(v) for v in BOX[ch]]
    x0 = max(0, x0 - 10); y0 = max(0, y0 - 10); x1 = min(W, x1 + 10); y1 = min(H, y1 + 10)
    ref = sat[y0:y1, x0:x1]
    bb = (1.0, 0, 0)
    for dx in range(-rng, rng + 1):
        for dy in range(-rng, rng + 1):
            m = Image.new('L', (W, H), 0); d = ImageDraw.Draw(m)
            for poly in lat:
                d.polygon([(x * P + cp[0] + dx, y * P + cp[1] + dy) for x, y in poly], fill=255)
            my = (np.asarray(m) > 127)[y0:y1, x0:x1]
            u = (ref | my).sum()
            v = (ref & my).sum() / u if u else 0.0
            if v > bb[0]:
                bb = (v, dx, dy)
    return bb


chars = sys.argv[1] if len(sys.argv) > 1 else 'LX'
K = 5  # 放大倍数
for ch in chars:
    iou, dx, dy = best_shift(ch)
    lat, cp = resolve(ch, dx, dy)
    x0, y0, x1, y1 = [int(v) for v in BOX[ch]]
    x0 = max(0, x0 - 10); y0 = max(0, y0 - 10); x1 = min(W, x1 + 10); y1 = min(H, y1 + 10)
    w = (x1 - x0) * K; h = (y1 - y0) * K
    ref = sat[y0:y1, x0:x1]

    m = Image.new('L', (W, H), 0); d = ImageDraw.Draw(m)
    for poly in lat:
        d.polygon([(x * P + cp[0], y * P + cp[1]) for x, y in poly], fill=255)
    my = (np.asarray(m) > 127)[y0:y1, x0:x1]

    canvas = Image.new('RGB', (w * 3 + 20, h), (255, 255, 255))
    # 参考
    r = Image.fromarray((ref * 255).astype(np.uint8)).resize((w, h), Image.NEAREST)
    canvas.paste(Image.merge('RGB', (r, r, r)), (0, 0))
    # 解
    s = Image.fromarray((my * 255).astype(np.uint8)).resize((w, h), Image.NEAREST)
    canvas.paste(Image.merge('RGB', (s, s, s)), (w + 10, 0))
    # 叠加
    ov = np.zeros((ref.shape[0], ref.shape[1], 3), np.uint8)
    ov[ref & ~my] = (230, 60, 60)      # 只有参考 = 红
    ov[my & ~ref] = (60, 90, 230)      # 只有解 = 蓝
    ov[ref & my] = (60, 60, 60)        # 重合 = 深灰
    ov[~ref & ~my] = (255, 255, 255)
    canvas.paste(Image.fromarray(ov).resize((w, h), Image.NEAREST), (w * 2 + 20, 0))
    p = os.path.join(HERE, 'out', 'zoom_%s.png' % ch)
    canvas.save(p)
    print(ch, 'IoU=%.3f shift=(%d,%d)' % (iou, dx, dy), '->', p, canvas.size)
