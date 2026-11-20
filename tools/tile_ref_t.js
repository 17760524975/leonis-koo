/* 检验：给定四块板，能否铺满参考图那个 T（横杠 3×1 + 竖梁 1×3，bbox 3×4，面积 6.0）。
 * 方法：0.25 条带上的精确区间覆盖（所有顶点都在 0.25 格点上，条带内截面是线性的），
 * 逐条带比对「四块板截面区间的并」是否恰好等于 T 的截面区间，且无重叠。
 * 支持 4 旋转 × 镜像，平移步长 0.25。
 */
const SETS = {
  cur: {
    A: [[3, 0], [0, 0], [1, 1], [3, 1]],
    B: [[0, 1], [0, 0], [1, 1]],
    C: [[0, 0], [1.5, 0], [0.5, 1], [0, 1]],
    D: [[1, 1], [1.5, 1], [1.5, 2], [0, 2], [0, 0]],
  },
  // 参考图反推：D 是带 45° 尖角的凹五边形（长边 2.828）
  classic: {
    A: [[3, 0], [0, 0], [1, 1], [3, 1]],
    B: [[0, 1], [0, 0], [1, 1]],
    C: [[0, 0], [1.5, 0], [0.5, 1], [0, 1]],
    D: [[0, 0], [0, 1], [-0.5, 1], [0.5, 2], [2, 2]],
  },
};

/* 参考图的经典 T；也用第 120 关现在的 3×3 T 作对照 */
const TARGETS = {
  ref: [[0, 3], [0, 4], [3, 4], [3, 3], [2, 3], [2, 0], [1, 0], [1, 3]],
  now: [[0, 0], [3, 0], [3, 1.5], [2, 1.5], [2, 3], [1, 3], [1, 1.5], [0, 1.5]],
};

const EPS = 1e-9;

function area(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const q = poly[(i + 1) % poly.length];
    a += poly[i][0] * q[1] - q[0] * poly[i][1];
  }
  return a / 2;
}

function norm(poly) {
  return area(poly) < 0 ? poly.slice().reverse() : poly;
}

function bbox(poly) {
  const xs = poly.map(p => p[0]), ys = poly.map(p => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

/* 变换：旋转 90°*k + 可选镜像，再平移到质心无关的位置（返回相对原点） */
function transform(poly, k, mirror) {
  let p = poly.map(v => mirror ? [-v[0], v[1]] : [v[0], v[1]]);
  for (let i = 0; i < k; i++) p = p.map(v => [-v[1], v[0]]);
  return norm(p);
}

function canon(poly) {
  const bb = bbox(poly);
  return poly.map(v => [(v[0] - bb[0]).toFixed(6), (v[1] - bb[1]).toFixed(6)].join(',')).sort().join('|');
}

function variants(poly) {
  const seen = new Set(), out = [];
  for (let k = 0; k < 4; k++) for (const m of [false, true]) {
    const t = transform(poly, k, m);
    const key = canon(t);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

/* 水平线 y 与多边形的交点区间（偶奇规则，paired） */
function intervalsAt(poly, y) {
  const xs = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    if (a[1] === b[1]) continue;
    const y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]);
    if (y <= y0 + EPS || y >= y1 - EPS) continue;
    const t = (y - a[1]) / (b[1] - a[1]);
    xs.push(a[0] + t * (b[0] - a[0]));
  }
  xs.sort((p, q) => p - q);
  const out = [];
  for (let i = 0; i + 1 < xs.length; i += 2) out.push([xs[i], xs[i + 1]]);
  return out;
}

function mergeWidth(iv) {
  let w = 0;
  for (const [a, b] of iv) w += b - a;
  return w;
}

/* 把一组区间合并，返回「总长」与「合并后总长」，用来判断重叠 */
function coverageCheck(all, target) {
  const srt = all.slice().sort((p, q) => p[0] - q[0]);
  const merged = [];
  for (const iv of srt) {
    const last = merged[merged.length - 1];
    if (last && iv[0] <= last[1] + 1e-7) last[1] = Math.max(last[1], iv[1]);
    else merged.push([iv[0], iv[1]]);
  }
  const tw = mergeWidth(target), mw = mergeWidth(merged), aw = mergeWidth(all);
  if (Math.abs(aw - mw) > 1e-6) return false;         // 有重叠
  if (Math.abs(mw - tw) > 1e-6) return false;         // 没铺满
  for (let i = 0; i < Math.min(merged.length, target.length); i++) {
    if (Math.abs(merged[i][0] - target[i][0]) > 1e-6 || Math.abs(merged[i][1] - target[i][1]) > 1e-6) return false;
  }
  return merged.length === target.length;
}

const STEP = 0.25;
function solve(targetPoly, pieces, opts) {
  const tb = bbox(targetPoly);
  const ys = [];
  for (let y = tb[1] + STEP / 2; y < tb[3]; y += STEP) ys.push(+y.toFixed(6));
  const targetIv = ys.map(y => intervalsAt(targetPoly, y));
  const ids = Object.keys(pieces);
  const variantsMap = {};
  ids.forEach(id => { variantsMap[id] = variants(pieces[id]); });

  const placed = [];
  const used = new Set();
  let solution = null;
  let nodes = 0;

  function stateOk() {
    for (let i = 0; i < ys.length; i++) {
      const all = [];
      for (const pl of placed) all.push(...intervalsAt(pl.poly, ys[i]));
      if (all.length === 0) continue;
      const srt = all.slice().sort((p, q) => p[0] - q[0]);
      const merged = [];
      for (const iv of srt) {
        const last = merged[merged.length - 1];
        if (last && iv[0] <= last[1] + 1e-7) last[1] = Math.max(last[1], iv[1]);
        else merged.push([iv[0], iv[1]]);
      }
      if (mergeWidth(all) - mergeWidth(merged) > 1e-6) return false;   // 重叠
      for (const m of merged) {                                        // 越界
        if (!targetIv[i].some(t => m[0] >= t[0] - 1e-6 && m[1] <= t[1] + 1e-6)) return false;
      }
    }
    return true;
  }

  function dfs() {
    nodes++;
    if (nodes > opts.maxNodes) return false;
    if (placed.length === ids.length) {
      for (let i = 0; i < ys.length; i++) {
        const all = [];
        for (const pl of placed) all.push(...intervalsAt(pl.poly, ys[i]));
        if (!coverageCheck(all, targetIv[i])) return false;
      }
      solution = placed.map(p => ({ id: p.id, poly: p.poly }));
      return true;
    }
    // 找最左下的未覆盖点
    let px = null, py = null;
    for (let i = 0; i < ys.length && px === null; i++) {
      const all = [];
      for (const pl of placed) all.push(...intervalsAt(pl.poly, ys[i]));
      const t = targetIv[i];
      for (const [ta, tb2] of t) {
        let cur = ta;
        const srt = all.filter(iv => iv[1] > ta && iv[0] < tb2).sort((p, q) => p[0] - q[0]);
        for (const iv of srt) {
          if (iv[0] > cur + 1e-9) { px = cur + 1e-4; py = ys[i]; break; }
          cur = Math.max(cur, iv[1]);
        }
        if (px === null && cur < tb2 - 1e-9) { px = cur + 1e-4; py = ys[i]; }
        if (px !== null) break;
      }
    }
    if (px === null) return false;

    for (const id of ids) {
      if (used.has(id)) continue;
      for (const v of variantsMap[id]) {
        const b = bbox(v);
        for (let dx = tb[0] - b[0]; dx <= tb[2] - b[2] + 1e-9; dx += STEP) {
          for (let dy = tb[1] - b[1]; dy <= tb[3] - b[3] + 1e-9; dy += STEP) {
            const poly = v.map(p => [+(p[0] + dx).toFixed(6), +(p[1] + dy).toFixed(6)]);
            // 关键剪枝：必须盖住那个未覆盖点
            if (!intervalsAt(poly, py).some(iv => px > iv[0] + 1e-9 && px < iv[1] - 1e-9)) continue;
            placed.push({ id, poly });
            used.add(id);
            if (stateOk() && dfs()) return true;
            placed.pop();
            used.delete(id);
          }
        }
      }
    }
    return false;
  }

  const ok = dfs();
  return { ok, solution, nodes };
}

for (const [sname, pieces] of Object.entries(SETS)) {
  for (const [tname, target] of Object.entries(TARGETS)) {
    const ta = Math.abs(area(target));
    let sum = 0;
    for (const id in pieces) sum += Math.abs(area(pieces[id]));
    console.log(`\n===== 板件 ${sname} × 目标 ${tname}: 面积 ${ta} / 合计 ${sum} =====`);
    if (Math.abs(ta - sum) > 1e-9) { console.log('面积不匹配，跳过'); continue; }
    const r = solve(norm(target), pieces, { maxNodes: 2000000 });
    console.log('结果', r.ok ? '找到解' : '无解', '搜节点', r.nodes);
    if (r.ok) r.solution.forEach(s => console.log('  ', s.id, JSON.stringify(s.poly)));
  }
}
