# 渲染 letters_levels.json 的 26 个字母关，检查形状与拼块
import json, os, math
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
LV = json.load(open(os.path.join(HERE, 'letters_levels.json'), encoding='utf8'))
UNIT = 96.0
GAME = {
    'T1': [(0, 0), (4, 0), (2, 2)], 'T2': [(0, 0), (4, 0), (2, 2)],
    'T3': [(0, 0), (2, 0), (0, 2)], 'S': [(1, 0), (2, 1), (1, 2), (0, 1)],
    'T4': [(0, 0), (2, 0), (1, 1)], 'T5': [(0, 0), (2, 0), (1, 1)],
    'P': [(1, 0), (3, 0), (2, 1), (0, 1)],
}
COL = {'T1': (255, 138, 91), 'T2': (79, 168, 224), 'T3': (99, 200, 139),
       'S': (244, 127, 168), 'T4': (168, 123, 232), 'T5': (255, 201, 77),
       'P': (79, 201, 192)}


def area(p):
    s = 0.0
    for i in range(len(p)):
        x1, y1 = p[i]; x2, y2 = p[(i + 1) % len(p)]
        s += x1 * y2 - x2 * y1
    return s / 2


def cent(p):
    Q = [tuple(v) for v in (p if area(p) > 0 else p[::-1])]
    a = cx = cy = 0.0
    for i in range(len(Q)):
        q = Q[(i + 1) % len(Q)]
        cr = Q[i][0] * q[1] - q[0] * Q[i][1]
        a += cr; cx += (Q[i][0] + q[0]) * cr; cy += (Q[i][1] + q[1]) * cr
    a /= 2
    return (cx / (6 * a), cy / (6 * a))


def world(id_, st):
    base = GAME[id_]
    c = cent(base)
    loc = [((v[0] - c[0]) * UNIT, (v[1] - c[1]) * UNIT) for v in base]
    th = math.radians(st['angle']); co, si = math.cos(th), math.sin(th)
    out = []
    for x, y in loc:
        if st.get('flipped'):
            x = -x
        out.append((co * x - si * y + st['x'], si * x + co * y + st['y']))
    return out


CELL = 150
cols = 7
rows = (len(LV) + cols - 1) // cols
canvas = Image.new('RGB', (cols * CELL * 2 + 20, rows * (CELL + 20)), (250, 250, 252))
dr = ImageDraw.Draw(canvas)

for idx, lv in enumerate(LV):
    ch = lv['ch']
    px = 10 + (idx % cols) * CELL * 2
    py = 8 + (idx // cols) * (CELL + 20)
    xs = [v[0] for v in lv['outline']]
    ys = [v[1] for v in lv['outline']]
    x0, y0, x1, y1 = min(xs), min(ys), max(xs), max(ys)
    sc = (CELL - 12) / max(x1 - x0, y1 - y0)

    def T(p):
        return ((p[0] - x0) * sc + 6, (p[1] - y0) * sc + 6)

    # 左：剪影（含孔）
    pan = Image.new('RGB', (CELL, CELL), (255, 255, 255))
    pd = ImageDraw.Draw(pan)
    pd.polygon([T(v) for v in lv['outline']], fill=(70, 90, 120))
    for h in lv.get('holes', []):
        pd.polygon([T(v) for v in h], fill=(255, 255, 255))
    canvas.paste(pan, (px, py))

    # 右：7 块板
    pan2 = Image.new('RGB', (CELL, CELL), (255, 255, 255))
    pd2 = ImageDraw.Draw(pan2)
    for st in lv['solution']:
        pd2.polygon([T(v) for v in world(st['id'], st)], fill=COL[st['id']], outline=(255, 255, 255))
    canvas.paste(pan2, (px + CELL, py))

    holeA = sum(abs(area(h)) for h in lv.get('holes', []))
    dr.text((px + 4, py + CELL + 3), '%s 孔面积%.0f' % (ch, holeA), fill=(40, 40, 40))
    dr.text((px + CELL + 4, py + CELL + 3), ch, fill=(40, 40, 40))

canvas.save(os.path.join(HERE, 'out', 'letters_result.png'))
print('saved', canvas.size)
