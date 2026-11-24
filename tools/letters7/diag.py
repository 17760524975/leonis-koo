# 诊断单个字母：两族 × 细相位扫描，报告「纯度 + 可拼性 + 与参考图的 IoU」
import json, os, sys, itertools
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
im = Image.open(os.path.join(HERE, 'ref.webp')).convert('RGB')
W, H = im.size
rgb = np.asarray(im).astype(np.float32) / 255.0
mx = rgb.max(axis=2); mn = rgb.min(axis=2)
sat = np.where(mx > 1e-6, (mx - mn) / np.maximum(mx, 1e-6), 0)
mask = (sat > 0.34) & (mx > 0.30)

import importlib.util
spec = importlib.util.spec_from_file_location('t4', os.path.join(HERE, 'tile4.py'))

# 直接复用 tile4 里的函数（不执行主流程：手动截断）
src = open(os.path.join(HERE, 'tile4.py'), encoding='utf8').read()
cut = src.index('for cell in GRID[\'cells\']:')
ns = {'__name__': 't4', '__file__': os.path.join(HERE, 'tile4.py')}
exec(compile(src[:cut], 'tile4', 'exec'), ns)
coverage = ns['coverage']; tri_range = ns['tri_range']
all_placements = ns['all_placements']; solve = ns['solve']
P_A = ns['P_A']; P_U = ns['P_U']; FAM = ns['FAM']; TRI_V = ns['TRI_V']
GRID = ns['GRID']

ch = sys.argv[1] if len(sys.argv) > 1 else 'N'
cell = [c for c in GRID['cells'] if c['ch'] == ch][0]
box = cell['box']

for fam, P in (('A', P_A), ('U', P_U)):
    ntri = FAM[fam]['ntri']
    best = None
    for dx in np.arange(-3.0, 3.01, 0.15):
        for dy in np.arange(-3.0, 3.01, 0.15):
            ox = (cell['ox'] + dx) % P
            oy = (cell['oy'] + dy) % P
            i0, i1, j0, j1 = tri_range(box, P, ox, oy)
            cov = coverage(P, ox, oy, i0, i1, j0, j1)
            c = sum(min(f, 1 - f) for f in cov.values())
            if best is None or c < best[0]:
                best = (c, ox, oy, cov, (i0, i1, j0, j1))
    c, ox, oy, cov, rg = best
    i0, i1, j0, j1 = rg
    pls = all_placements(fam, i0, i1, j0, j1)
    order = sorted(cov.items(), key=lambda kv: -kv[1])
    tgt = set(k for k, f in order[:ntri])
    sol = solve(tgt, pls)
    print(fam, 'P=%.3f' % P, 'cost=%.2f' % c, '三角', sum(1 for k, f in cov.items() if f > 0.5),
          '相位 %.2f/%.2f' % (ox, oy), '直接解', '有' if sol else '无')
    if not sol:
        lowIn = [k for k, f in sorted(order[:ntri], key=lambda kv: kv[1])[:8]]
        highOut = [k for k, f in sorted(order[ntri:], key=lambda kv: -kv[1])[:8]]
        pairs = [(a, b) for a in lowIn for b in highOut]
        found = None
        for n in (1, 2):
            for cp in ([(p,) for p in pairs] if n == 1 else list(itertools.combinations(pairs, 2))[:400]):
                t2 = set(tgt); ok = True
                for a, b in cp:
                    if a not in t2:
                        ok = False; break
                    t2.discard(a); t2.add(b)
                if not ok:
                    continue
                s2 = solve(t2, pls)
                if s2:
                    found = (s2, t2, n); break
            if found:
                break
        print('   换三角', '成功' if found else '失败', found[2] if found else '')
