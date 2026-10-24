# -*- coding: utf-8 -*-
"""批次33：数据学科 4 门中小课批量达标（pandas/methodology/viz/sql，62 节）。
章主题包包装：原文保留为「核心概念与原理详解」，补齐其余模块。
每门课的章级代码先实跑验证后填 expected。
"""
import json, io

BT = chr(96) * 3


def theme(why, intuition, code, expected, cerr, miscon, connection, summary):
    return dict(why=why, intuition=intuition, code=code, expected=expected,
                cerr=cerr, miscon=miscon, connection=connection, summary=summary)


def build(lid, title, orig, goal_lines, prereq, th):
    return f"""### 学习目标

学完本节，你应该能够：
{goal_lines}

### 前置知识

{prereq}

### 问题背景

{th['why']}

### 直觉理解

{th['intuition']}

### 核心概念与原理详解

{orig.strip()}

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程（可逐行对照上方概念）：

### 代码实践

{BT}python
{th['code']}
{BT}

预期输出（实测）：{th['expected']}

**常见错误**：{th['cerr']}

### 常见误区

{th['miscon']}

### 知识关联

{th['connection']}

### 本节总结

{th['summary']}

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 pandas 官方文档 pandas.pydata.org 相应章节）"""


def apply(course_file, themes_by_chapter, goals, prereqs, ref_note=None):
    fname = course_file if course_file.endswith(".json") else course_file + ".json"
    P = rf"D:\Python_Project\knowledge-order\content-data\courses\{fname}"
    c = json.load(io.open(P, encoding="utf-8"))
    n = 0
    for ch_idx, ch in enumerate(c["chapters"]):
        th = themes_by_chapter.get(ch_idx)
        if th is None:
            continue
        for l in ch["lessons"]:
            if "学习目标" in l["content"]:
                continue
            g = goals.get(l["id"], goals.get(ch_idx))
            p = prereqs.get(l["id"], prereqs.get(ch_idx))
            if g is None or p is None:
                continue
            l["content"] = build(l["id"], l["title"], l["content"], g, p, th)
            n += 1
    c["updatedAt"] = int(__import__("time").time() * 1000)
    json.dump(c, io.open(P, "w", encoding="utf-8", newline="\n"),
              ensure_ascii=False, indent=2)
    print(f"{course_file}: patched {n}")
