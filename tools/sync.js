/* 把 js/ 下的共享模块同步进两个交付包（单一源，避免两端逻辑漂移）
 *
 * v0.62：同步时顺带做**运行时代码瘦身**（tools/lib/pack.js）——
 *   删注释、去行首缩进、折叠空格、删空行；不动标识符、不合并行（ASI 安全）。
 *   js/ 永远是可读源码，preview/js 与 miniprogram/js 写打包产物，
 *   这样「浏览器里验收的那份」和「真机上跑的那份」逐字节相同。
 *   三端一致性断言改成语义比对（normalize 后相等），见 semHash()。
 *
 * 用法：
 *   node tools/sync.js            正常同步（打印瘦身账）
 *   node tools/sync.js --check    只校验「打包产物 == strip(源码)」，不写盘
 */
const fs = require('fs'), path = require('path');
const P = require('./lib/pack.js');
const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'js');
const FILES = ['config.js', 'geom.js', 'judge.js', 'levels.js', 'core.js'];
const DEST = [path.join(ROOT, 'preview', 'js'), path.join(ROOT, 'miniprogram', 'js')];
const CHECK = process.argv.indexOf('--check') >= 0;

for (const d of DEST) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

let before = 0, after = 0, n = 0, bad = 0;
for (const f of FILES) {
  const raw = fs.readFileSync(path.join(SRC, f), 'utf8');
  const out = P.strip(raw);
  before += Buffer.byteLength(raw);
  after += Buffer.byteLength(out);
  for (const d of DEST) {
    const dst = path.join(d, f);
    if (CHECK) {
      const cur = fs.existsSync(dst) ? fs.readFileSync(dst, 'utf8') : '';
      /* 比对前各自 normalize：Windows 上 git 可能把产物 checkout 成 CRLF */
      if (P.strip(cur) !== P.strip(out)) { bad++; console.log(`[XX] ${path.relative(ROOT, dst)} 与 strip(源码) 不一致`); }
    } else {
      fs.writeFileSync(dst, out);
    }
    n++;
  }
}

if (CHECK) {
  if (bad) { console.log(`✗ ${bad} 份产物与源码语义不一致，重跑 node tools/sync.js`); process.exit(1); }
  console.log(`✓ ${n} 份产物语义一致（${(before / 1024).toFixed(1)} → ${(after / 1024).toFixed(1)} KB）`);
} else {
  console.log(`同步 ${FILES.length} 个模块 × ${DEST.length} 个包 = ${n} 份`);
  console.log(`瘦身 ${(before / 1024).toFixed(1)} KB → ${(after / 1024).toFixed(1)} KB（省 ${((before - after) / 1024).toFixed(1)} KB，${(100 - after / before * 100).toFixed(0)}%）`);
}
