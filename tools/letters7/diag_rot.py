# 诊断：解的并集 vs 参考掩码，搜索全局旋转(0/45/90/135) + 平移，看 IoU 峰值
import json, os, math
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


def prep(ch):
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
    return lat, cp


def raster(lat, cp, deg, dx, dy):
    th = math.radians(deg); c, s = math.cos(th), math.sin(th)
    m = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(m)
    for poly in lat:
        pts = [((x * c - y * s) * P + cp[0] + dx, (x * s + y * c) * P + cp[1] + dy) for x, y in poly]
        d.polygon(pts, fill=255)
    return np.asarray(m) > 127


print('字母   0°    45°   90°   135°')
for ch in sorted(SOL):
    if not SOL[ch].get('ok'):
        continue
    lat, cp = prep(ch)
    x0, y0, x1, y1 = [int(v) for v in BOX[ch]]
    x0 = max(0, x0 - 8); y0 = max(0, y0 - 8); x1 = min(W, x1 + 8); y1 = min(H, y1 + 8)
    ref = sat[y0:y1, x0:x1]
    best = []
    for deg in (0, 45, 90, 135):
        b = 0.0
        rng = range(-3, 4) if deg % 90 == 0 else range(-10, 11, 2)
        for dx in rng:
            for dy in rng:
                my = raster(lat, cp, deg, dx, dy)[y0:y1, x0:x1]
                u = (ref | my).sum()
                if u:
                    v = (ref & my).sum() / u
                    if v > b:
                        b = v
        best.append(b)
    print('  %s   %.3f  %.3f  %.3f  %.3f' % (ch, *best))
