# -*- coding: utf-8 -*-
"""批次33(第三波·主会话直做): stats c13-18 剩余 43 节——通用达标改造。
策略：为每节保留原有实质内容（概念/公式/案例），补齐缺失模块（学习目标/前置/背景/直觉/误区/关联/总结/参考+代码实践）。
数值均经 numpy 实算。分 6 个 part 执行。
"""
import json, io

P = r"D:\Python_Project\knowledge-order\content-data\courses\stats-foundations.json"
c = json.load(io.open(P, encoding="utf-8"))

B3 = chr(96) * 3


def wrap(orig, goal, prereq, why, intuition, misconception, connection, summary, refs,
         code=None, expected=None, cerr=None):
    """把原有正文包进标准模板：保留原文主体作为 核心概念/原理详解/案例 部分。"""
    parts = [f"### 学习目标\n\n{goal}",
             f"### 前置知识\n\n{prereq}",
             f"### 问题背景\n\n{why}",
             f"### 直觉理解\n\n{intuition}",
             f"### 核心概念与原理详解\n\n{orig.strip()}"]
    if code:
        parts.append(f"### 代码实践\n\n{B3}python\n{code.strip()}\n{B3}\n\n预期输出（实测）：{expected}\n\n**常见错误**：{cerr}")
    parts.append(f"### 常见误区\n\n{misconception}")
    parts.append(f"### 知识关联\n\n{connection}")
    parts.append(f"### 本节总结\n\n{summary}")
    parts.append(f"### 参考资料\n\n> **来源类型：参考资料**\n> - 本课程整理（可参见 OpenIntro Statistics / Blitzstein & Hwang《Introduction to Probability》相应章节）")
    return "\n\n".join(parts)


NEW = {}
