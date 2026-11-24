# 目视核对 v2：把解按「格距 P + 质心对齐」精确投影回参考图像素，
# 左右两侧用同一个取景窗口，直接看轮廓是否重合。
# 输出 tools/letters7/out/check_letters.png
import json, os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
os.makedirs(OUT, exist_ok=True)

im = Image.open(os.path.join(HERE, 'ref.webp')).convert('RGB')
GS = json.load(open(os.path.join(HERE, 'grid.json'), encoding='utf8'))
P = GS['A']
BOX = {c['ch']: c['box'] for c in GS['cells']}
PJ = {r['ch']: r for r in json.load(open(os.path.join(HERE, 'pieces.json'), encoding='utf8'))}
SOL = {r['ch']: r for r in json.load(open(os.path.join(HERE, 'tiled3.json'), encoding='utf8'))}

COLOR = {'L': (41, 178, 235), 'L2': (226, 66, 205), 'M': (120, 205, 30),
         'Q': (250, 190, 20), 'R': (240, 90, 50), 'S': (140, 90, 230), 'S2': (10, 175, 130)}


def poly_area(p):
    a = 0.0
    for i in range(len(p)):
        x1, y1 = p[i]; x2, y2 = p[(i + 1) % len(p)]
        a += x1 * y2 - x2 * y1
    return abs(a) / 2


def poly_centroid(p):
    Q = list(p) if poly_area(p) > 0 else p
    a = cx = cy = 0.0
    n = len(Q)
    for i in range(n):
        x1, y1 = Q[i]; x2, y2 = Q[(i + 1) % n]
        cr = x1 * y2 - x2 * y1
        a += cr; cx += (x1 + x2) * cr; cy += (y1 + y2) * cr
    a /= 2
    return (cx / (6 * a), cy / (6 * a))


CELL = 210
PAD = 6
letters = sorted([ch for ch, r in SOL.items() if r.get('ok')])
cols, rows = 7, 4
canvas = Image.new('RGB', (cols * CELL * 2 + 30, rows * (CELL + 24)), (250, 250, 252))
dr = ImageDraw.Draw(canvas)

for idx, ch in enumerate(letters):
    rec = SOL[ch]
    pj = PJ[ch]
    hulls = sorted(pj['pieces'], key=lambda p: -p['n'])[:7]

    # 解的格点质心（多边形面积加权）
    tot_a = 0.0; cl = [0.0, 0.0]
    for p in rec['pieces']:
        a = poly_area([tuple(v) for v in p['poly']])
        c = poly_centroid([tuple(v) for v in p['poly']])
        tot_a += a; cl[0] += c[0] * a; cl[1] += c[1] * a
    cl = (cl[0] / tot_a, cl[1] / tot_a)

    # 参考图的像素质心（按像素块面积加权，质心不受白缝影响）
    tw = 0.0; cp = [0.0, 0.0]
    for h in hulls:
        cen = poly_centroid([tuple(v) for v in h['hull']])
        tw += h['n']; cp[0] += cen[0] * h['n']; cp[1] += cen[1] * h['n']
    cp = (cp[0] / tw, cp[1] / tw)

    # 映射：lattice -> pixel
    def to_px(v):
        return ((v[0] - cl[0]) * P + cp[0], (v[1] - cl[1]) * P + cp[1])

    allp = [to_px(v) for p in rec['pieces'] for v in p['poly']]
    x0 = min(v[0] for v in allp) - PAD; x1 = max(v[0] for v in allp) + PAD
    y0 = min(v[1] for v in allp) - PAD; y1 = max(v[1] for v in allp) + PAD
    w = x1 - x0; h = y1 - y0
    sc = min(CELL / w, CELL / h)

    px0 = 10 + (idx % cols) * CELL * 2
    py0 = 8 + (idx // cols) * (CELL + 24)

    # 左：参考图同窗口
    crop = im.crop((int(x0), int(y0), int(x1) + 1, int(y1) + 1))
    crop = crop.resize((max(1, int(crop.width * sc)), max(1, int(crop.height * sc))), Image.LANCZOS)
    canvas.paste(crop, (px0 + (CELL - crop.width) // 2, py0 + (CELL - crop.height) // 2))

    # 右：解，同窗口同缩放
    panel = Image.new('RGB', (CELL, CELL), (255, 255, 255))
    pd = ImageDraw.Draw(panel)
    ox = (CELL - w * sc) / 2; oy = (CELL - h * sc) / 2
    used = {'L': 0, 'S': 0}
    order = sorted(rec['pieces'], key=lambda z: -{'L': 2, 'M': 1, 'Q': 1, 'S': 0.5, 'R': 1}[z['key']])
    for p in order:
        k = p['key']
        if k in used:
            used[k] += 1
            col = COLOR['L2' if (k == 'L' and used[k] == 2) else ('S2' if k == 'S' and used[k] == 2 else k)]
        else:
            col = COLOR[k]
        pts = [(to_px(v)[0] - x0, to_px(v)[1] - y0) for v in p['poly']]
        pts = [(v[0] * sc + ox, v[1] * sc + oy) for v in pts]
        pd.polygon(pts, fill=col, outline=(255, 255, 255), width=1)
    canvas.paste(panel, (px0 + CELL, py0))

    dr.text((px0 + CELL // 2 - 4, py0 + CELL + 5), ch, fill=(30, 30, 30))
    dr.text((px0 + CELL + CELL // 2 - 4, py0 + CELL + 5), ch, fill=(30, 30, 30))

canvas.save(os.path.join(OUT, 'check_letters.png'))
print('saved', canvas.size)
