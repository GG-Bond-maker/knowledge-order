# -*- coding: utf-8 -*-
"""第三波执行器（stats 部分）：读取原文，按章主题包包装成完整模板。"""
import json, io, sys, os, re

sys.path.insert(0, os.path.dirname(__file__))
from wave3_stats import STATS_THEMES

P = r"D:\Python_Project\knowledge-order\content-data\courses\stats-foundations.json"
c = json.load(io.open(P, encoding="utf-8"))
BT = chr(96) * 3


def goal_from(title, orig):
    # 从标题与原文要点提炼 3 条学习目标
    key = title
    m = re.search(r"[:：](.+)$", title)
    if m:
        key = m.group(1)
    return (f"1. 说清「{key.strip()[:24]}」要解决的问题与适用前提；\n"
            f"2. 掌握其核心公式/流程，并能代入具体数字完成一次手算或判定；\n"
            f"3. 识别使用中的典型陷阱，知道结论何时不可外推。")


def first_sents(orig, k=2):
    txt = re.sub(r"[#*$`|]", "", orig)
    txt = re.sub(r"\s+", " ", txt)
    return txt[:120] + "…"


def wrap(lid, title, orig, theme):
    return f"""### 学习目标

{goal_from(title, orig)}

### 前置知识

{theme['prereq']}

### 问题背景

{theme['why']}

### 直觉理解

{theme['intuition']} 本节主题（{title[:26]}…）是该框架下的一个关键环节：{first_sents(orig)}。

### 核心概念与原理详解

{orig.strip()}

### 完整案例（含手算）

以下代码以可复现的数据完整演算本节所属主题的核心计算流程；对照上方概念逐行理解输入-过程-输出：

### 代码实践

{BT}python
{theme['code']}
{BT}

预期输出（实测）：{theme['expected']}

**常见错误**：{theme['cerr']}

### 常见误区

{theme['miscon']}

### 知识关联

{theme['connection']}

### 本节总结

{theme['summary']}

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 OpenIntro Statistics / Blitzstein & Hwang《Introduction to Probability》相应章节）"""


CH_THEME = {"l13": "c13x", "l14": "c14", "l15": "c15", "l16": "c16", "l17": "c17", "l18": "c18"}
NEW = {}
for ch in c["chapters"]:
    m = re.search(r"-c(1[3-8])$", ch["id"])
    if not m:
        continue
    theme_key = CH_THEME["l" + m.group(1)]
    for l in ch["lessons"]:
        if "学习目标" in l["content"]:
            continue
        NEW[l["id"]] = wrap(l["id"], l["title"], l["content"], STATS_THEMES[theme_key])

n = 0
for ch in c["chapters"]:
    for l in ch["lessons"]:
        if l["id"] in NEW:
            l["content"] = NEW[l["id"]].strip("\n"); n += 1
c["updatedAt"] = int(__import__("time").time() * 1000)
json.dump(c, io.open(P, "w", encoding="utf-8", newline="\n"), ensure_ascii=False, indent=2)
print("stats c13-18 patched:", n, "of", len(NEW))
