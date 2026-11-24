# 把「照片提取轮廓」与「求解出的可拼轮廓」叠一张图，人工核对用
import json, os, sys
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
poly = json.load(open(os.path.join(OUT, 'poly.json'), encoding='utf-8'))
fit = json.load(open(os.path.join(OUT, 'fitTri.json'), encoding='utf-8'))

S = 70  # px per u
W = H = 700
def mk():
    return Image.new('RGB', (W, H), (250, 250, 250))

for tag in sorted(poly):
    f = fit.get(tag) or {}
    A = poly[tag]['poly']
    B = f.get('outline')
    pts = A + (B or [])
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    cx = (min(xs) + max(xs)) / 2; cy = (min(ys) + max(ys)) / 2
    T = lambda p: (W/2 + (p[0]-cx)*S, H/2 - (p[1]-cy)*S)
    im = mk(); d = ImageDraw.Draw(im)
    d.polygon([T(p) for p in A], fill=(205, 205, 205), outline=(20, 20, 20))
    if B:
        d.line([T(p) for p in B] + [T(B[0])], fill=(220, 30, 60), width=4)
        for p in B:
            x, y = T(p); d.ellipse([x-5, y-5, x+5, y+5], fill=(220, 30, 60))
    for p in A:
        x, y = T(p); d.ellipse([x-3, y-3, x+3, y+3], outline=(0, 90, 200), width=2)
    d.text((10, 10), '%s  形距=%.3f  覆盖=%s' % (tag, f.get('hd', -1), f.get('cover', '-')),
           fill=(0, 0, 0))
    im.save(os.path.join(OUT, 'cmp_%s.png' % tag))
    print('cmp_%s.png' % tag)
