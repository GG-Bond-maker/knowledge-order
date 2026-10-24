# -*- coding: utf-8 -*-
"""第三波主会话直做：三大课剩余小节的达标改造器。
策略（与子代理同标准，模块齐全+代码实践+实测输出）：
- 原文实质内容（公式/推导/案例）保留并置于 核心概念与原理详解+完整案例；
- 为每节补写：学习目标/前置/背景/直觉/误区/关联/总结/参考 与一个实跑代码块。
参数表按课程分文件，本文件是公共引擎。
"""
import json, io

BT = chr(96) * 3


def build(orig, goal, prereq, why, intuition, case_note, code, expected, cerr,
          miscon, connection, summary):
    return f"""### 学习目标

{goal}

### 前置知识

{prereq}

### 问题背景

{why}

### 直觉理解

{intuition}

### 核心概念与原理详解

{orig.strip()}

### 完整案例（含手算）

{case_note}

### 代码实践

{BT}python
{code.strip()}
{BT}

预期输出（实测）：{expected}

**常见错误**：{cerr}

### 常见误区

{miscon}

### 知识关联

{connection}

### 本节总结

{summary}

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 OpenIntro Statistics / Blitzstein & Hwang《Introduction to Probability》相应章节）"""


def apply(course_file, NEW, refs_note=None):
    P = rf"D:\Python_Project\knowledge-order\content-data\courses\{course_file}.json"
    c = json.load(io.open(P, encoding="utf-8"))
    n = 0
    for ch in c["chapters"]:
        for l in ch["lessons"]:
            if l["id"] in NEW:
                l["content"] = NEW[l["id"]].strip("\n")
                n += 1
    c["updatedAt"] = int(__import__("time").time() * 1000)
    json.dump(c, io.open(P, "w", encoding="utf-8", newline="\n"),
              ensure_ascii=False, indent=2)
    print(f"{course_file}: patched {n} of {len(NEW)}")
