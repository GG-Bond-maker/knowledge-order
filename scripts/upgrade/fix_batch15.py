# -*- coding: utf-8 -*-
"""批次15 修正：容量丢弃与负反馈模拟的预期输出按实测校准。"""
import io

F = r"D:\Python_Project\knowledge-order\src\content\chapters\llm-a4.ts"

B = chr(92)
BT = chr(96)


def to_ts(md):
    return md.replace(B, B + B).replace(BT, B + BT).replace("${", B + "${")


def replace_after(lid, anchor, new_tail):
    """替换 anchor 之后的整段（到本节下一个 ## 或模板结束），用于重写预期输出段。"""
    s = io.open(F, encoding="utf-8").read()
    i = s.index("id: '%s'" % lid)
    a = s.index(anchor, i)
    # 找 anchor 所在行的行尾之后到下一个 "\n## " 或 "\n`," 的区间
    nl = s.index("\n", a)
    nxt = s.find("\n## ", nl)
    if nxt == -1 or nxt > s.index("\n`,", nl):
        nxt = s.index("\n`,", nl)
    s = s[: nl + 1] + to_ts(new_tail) + s[nxt:]
    io.open(F, "w", encoding="utf-8", newline=chr(10)).write(s)
    print("done:", lid)


replace_after("llm-a4-c2-l1", "预期输出（形态）：均衡路由（skew=1）三档丢弃率都≈0；偏斜加大后 CF=1.0 丢弃率先升（5–15%），CF=2.0 几乎免丢但容量翻倍——**CF 是用算力买丢弃率保险**。",
              "预期输出（实测）：均衡路由（skew=1）下 CF=1.25/2.0 丢弃率 0%，CF=1.0 也仅 2% 上下；偏斜加大后 CF=1.0 丢弃率升到 13–26%，CF=2.0 仍几乎免丢但容量翻倍——**CF 是用算力买丢弃率保险，甜点在 1.0–1.25**。**常见错误**：容量按序列长度而非 batch 总 token 算；丢弃 token 忘了走残差（直接丢信息）；推理期仍丢 token（推理常把 CF 调大或用 capacity-free 路由保证不丢）。")

replace_after("llm-a4-c5-l1", "预期输出（形态）：初偏好最强的专家偏置被逐步压低、弱者抬高；几十步后偏置稳定，**稳态 Top-k 已被再平衡**。真实训练中 g 本身也在变（路由器学习），控制器与学习器互相追逐——但负反馈的方向始终把负载拉回均值。",
              "预期输出（实测）：偏置整体缓慢抬升（升多降少的记账偏差），但**专家间的相对差异收敛为小幅补偿图案（±0.2 量级）**；初始偏好最强的专家被挤出 Top-k、初始较弱者进入——**选择已被再平衡**。真实训练中 g 本身也在变（路由器学习），控制器与学习器互相追逐——负反馈始终把负载拉回均值。**常见错误**：偏置参与加权（应只影响选择）；步长 γ 过大（路由震荡）；只降不升（长期全员偏置塌缩）。")
