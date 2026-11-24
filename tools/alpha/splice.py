# -*- coding: utf-8 -*-
"""把 out/levels_new.json 写回 js/levels.js（只改 LEVELS7 与章节元数据）。"""
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))


def main():
    levels = json.load(open(os.path.join(HERE, 'out', 'levels_new.json'), encoding='utf-8'))
    # 章节：1 几何，2 字母；按 chapPer=10 排布
    for l in levels:
        l['chapter'] = 1 if l['id'] <= 10 else 2
        if not l.get('holes'):
            l.pop('holes', None)

    txt = open(os.path.join(ROOT, 'js', 'levels.js'), encoding='utf-8').read()

    i = txt.index('var LEVELS7 = ')
    j = txt.index('\n];', i) + 3
    body = json.dumps(levels, ensure_ascii=False, indent=2)
    # 与原文件风格一致：数组第一层缩进 2 空格
    body = re.sub(r'\[\n', '[\n', body)
    new = 'var LEVELS7 = ' + body + ';'
    txt = txt[:i] + new + txt[j:]

    # 章节名 / 胶囊短名 / 结算文案
    txt = txt.replace(
        'chapNames: ["几何·入门","动物·飞禽","动物·走兽","水族·爬行","人物·动作","交通·挑战","百态·生灵","百态·飞羽","百态·器物"], chapTitles: ["几何","飞禽","走兽","水族","人物","交通","生灵","飞羽","器物"],',
        'chapNames: ["几何·入门","字母·七巧"], chapTitles: ["几何","字母"],')
    txt = re.sub(r"completeSub: '全部 \d+ 关已通关'",
                 "completeSub: '全部 %d 关已通关'" % len(levels), txt)

    for dst in ('js/levels.js', 'preview/js/levels.js', 'miniprogram/js/levels.js'):
        p = os.path.join(ROOT, dst)
        open(p, 'w', encoding='utf-8').write(txt)
        print('写入', dst, len(txt), '字节')


if __name__ == '__main__':
    main()
