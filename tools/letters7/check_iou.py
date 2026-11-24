# 客观核对：解出来的七巧板并集 vs 参考图彩色掩码，逐字母算 IoU
import json, os
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
# 饱和彩色 = 参考图的七巧板块；白底与灰色水印都被排除
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


SS = 4  # 超采样倍数
rows = []
canvas = Image.new('L', (W * SS, H * SS), 0)
for ch in sorted(SOL):
    rec = SOL[ch]
    if not rec.get('ok'):
        continue
    pj = PJ[ch]
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

    m = Image.new('L', (W * SS, H * SS), 0)
    d = ImageDraw.Draw(m)
    for p in rec['pieces']:
        pts = [((v[0] - cl[0]) * P + cp[0]) * SS for v in p['poly']], \
              [((v[1] - cl[1]) * P + cp[1]) * SS for v in p['poly']]
        d.polygon(list(zip(pts[0], pts[1])), fill=255)
    sol = np.asarray(m).reshape(H, SS, W, SS).mean(axis=(1, 3)) > 127

    x0, y0, x1, y1 = [int(v) for v in BOX[ch]]
    x0 = max(0, x0 - 6); y0 = max(0, y0 - 6); x1 = min(W, x1 + 6); y1 = min(H, y1 + 6)
    ref = sat[y0:y1, x0:x1]
    my = sol[y0:y1, x0:x1]
    inter = int((ref & my).sum()); uni = int((ref | my).sum())
    iou = inter / uni if uni else 0.0
    rows.append((ch, iou, int(ref.sum()), int(my.sum())))

rows.sort(key=lambda r: -r[1])
print('字母   IoU    参考px   解px')
for ch, iou, nr, ns in rows:
    flag = '' if iou >= 0.9 else ('  <<< 偏低' if iou >= 0.8 else '  <<<<< 差')
    print('  %s   %.3f   %5d  %5d%s' % (ch, iou, nr, ns, flag))
v = [r[1] for r in rows]
print('平均 %.4f  最低 %.4f  低于0.9的有 %d 个' % (sum(v) / len(v), min(v), sum(1 for x in v if x < 0.9)))
