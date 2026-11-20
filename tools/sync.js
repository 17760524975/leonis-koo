/* 把 js/ 下的共享模块同步进两个交付包（单一源，避免两端逻辑漂移） */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'js');
const FILES = ['config.js', 'geom.js', 'judge.js', 'levels.js', 'core.js'];
const DEST = [path.join(ROOT, 'preview', 'js'), path.join(ROOT, 'miniprogram', 'js')];
for (const d of DEST) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }
let n = 0;
for (const f of FILES) {
  const s = fs.readFileSync(path.join(SRC, f), 'utf8');
  for (const d of DEST) { fs.writeFileSync(path.join(d, f), s); n++; }
}
console.log(`同步 ${FILES.length} 个模块 × ${DEST.length} 个包 = ${n} 份`);
