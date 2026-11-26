/* tools/lib/pack.js —— 运行时代码瘦身（v0.62）
 *
 * 只做两件**语义安全**的事：
 *   1) 删注释（// 与 /* * /，块注释若夹在两个 token 之间则补一个空格，
 *      避免 a/*x* /b 变成 ab）；
 *   2) 去行首缩进、折叠连续空格、删空行、去行尾空白。
 *
 * **故意不做**：改标识符、合并行、把数字改写成短形式。
 * 原因：本工程大量构建脚本用 indexOf / 花括号配对定位源码，改名会让它们失配；
 * 合并行会踩 ASI（`return\nx` 与 `return x` 语义不同）。
 *
 * 字符串（单/双引号、模板）、正则字面量里的内容一律原样拷贝 ——
 * 正则的判定用「前一个有效字符」启发式，且进入正则态后整段复制，
 * 即使误判也只是少删几条注释，不会把代码吃掉。
 */
'use strict';

function isWordChar(c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
    (c >= '0' && c <= '9') || c === '_' || c === '$';
}

/* 前一个 token 允许后面跟正则字面量吗？（`/` 是除法还是正则开头） */
var REGEX_AFTER_CHAR = '(,=:[!&|?{};+-*%<>~^';
var REGEX_AFTER_WORD = {
  return: 1, typeof: 1, instanceof: 1, 'in': 1, 'of': 1, 'new': 1,
  'delete': 1, 'void': 1, 'throw': 1, 'case': 1, 'do': 1, 'else': 1
};

function pass(src) {
  var out = [];
  var i = 0, n = src.length;
  var atLineStart = true;
  var prevSig = '';       // 上一个写出的非空白字符
  var prevWord = '';      // 上一个写出的标识符（用于 return / typeof 判定）

  while (i < n) {
    var c = src[i];

    /* 行首：吃掉缩进（只吃空格 / 制表，不动换行） */
    if (atLineStart) {
      while (i < n && (src[i] === ' ' || src[i] === '\t')) i++;
      atLineStart = false;
      if (i >= n) break;
      c = src[i];
    }

    if (c === '\n') { out.push('\n'); i++; atLineStart = true; prevSig = ''; prevWord = ''; continue; }
    if (c === '\r') { i++; continue; }

    /* 行注释 */
    if (c === '/' && src[i + 1] === '/') {
      i += 2;
      while (i < n && src[i] !== '\n') i++;
      continue;                                   // 换行交给下一轮
    }

    /* 块注释 */
    if (c === '/' && src[i + 1] === '*') {
      var end = src.indexOf('*/', i + 2);
      if (end < 0) end = n;                       // 未闭合：吃到文件尾
      var before = out.length ? out[out.length - 1] : '';
      i = end + 2 > n ? n : end + 2;
      var after = i < n ? src[i] : '';
      /* 只有「两侧都紧贴 token」时才补空格，否则 a/*x* / b 会多出空格 */
      if (before && !/\s/.test(before) && after && !/\s/.test(after)) out.push(' ');
      continue;
    }

    /* 字符串 / 模板：原样拷贝（模板里的 ${} 也照抄，里面就算有注释也不动） */
    if (c === '"' || c === "'" || c === '`') {
      var q = c;
      out.push(c); i++;
      while (i < n) {
        var d = src[i];
        if (d === '\\') {
          out.push(d);
          if (i + 1 < n) out.push(src[i + 1]);
          i += 2;
          continue;
        }
        out.push(d); i++;
        if (d === q) break;
      }
      prevSig = q; prevWord = '';
      continue;
    }

    /* 正则字面量：按前一个 token 判定；进入后整段原样复制到未转义的 / */
    if (c === '/') {
      var allow = !prevSig || REGEX_AFTER_CHAR.indexOf(prevSig) >= 0 ||
        (prevWord && REGEX_AFTER_WORD[prevWord]);
      if (allow) {
        out.push('/'); i++;
        var inClass = false;
        while (i < n) {
          var r = src[i];
          if (r === '\\') {
            out.push(r);
            if (i + 1 < n) out.push(src[i + 1]);
            i += 2;
            continue;
          }
          out.push(r); i++;
          if (r === '[') inClass = true;
          else if (r === ']') inClass = false;
          else if (r === '/' && !inClass) break;
          else if (r === '\n') break;             // 非法正则：止于行尾，别吃代码
        }
        prevSig = '/'; prevWord = '';
        continue;
      }
      out.push(c); i++; prevSig = c; prevWord = '';
      continue;
    }

    /* 空白：折叠成一个空格（不改行） */
    if (c === ' ' || c === '\t') {
      out.push(' ');
      i++;
      while (i < n && (src[i] === ' ' || src[i] === '\t')) i++;
      continue;
    }

    out.push(c);
    if (isWordChar(c)) prevWord += c; else prevWord = '';
    prevSig = c;
    i++;
  }

  /* 收尾：去行尾空白 + 删空行（注意先 split 再 join，保证换行数不会误合并语句） */
  var lines = out.join('').split('\n');
  var keep = [];
  for (var k = 0; k < lines.length; k++) {
    var line = lines[k].replace(/[ \t]+$/, '');
    if (line.trim()) keep.push(line);
  }
  return keep.join('\n') + '\n';
}

/* 迭代到不动点：删掉块注释后会留下「两侧各一个空格」这种情况（`{ + 块注释 + }` 会留下两个空格），
 * 再跑一遍才会折叠成 `{ }`。做成语义哈希时「源码 strip 一次」与「产物 strip 一次」
 * 必须相等，所以这里保证输出本身就是 pass 的不动点（幂等）。 */
function strip(src) {
  var cur = String(src), prev = null, i = 0;
  while (cur !== prev && i < 5) { prev = cur; cur = pass(cur); i++; }
  return cur;
}

/* 写文件用：固定换行，避免 CRLF 在不同机器上产生不同体积 */
function packFile(srcPath, dstPath, fs) {
  var raw = fs.readFileSync(srcPath, 'utf8');
  var out = strip(raw);
  fs.writeFileSync(dstPath, out);
  return { before: Buffer.byteLength(raw), after: Buffer.byteLength(out) };
}

module.exports = { strip: strip, packFile: packFile };
