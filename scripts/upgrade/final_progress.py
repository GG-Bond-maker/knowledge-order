# -*- coding: utf-8 -*-
"""终版进度手册段落（避免 heredoc 转义问题）。"""
import io

P = r"D:\Python_Project\knowledge-order\docs\content-upgrade-progress.md"
s = io.open(P, encoding="utf-8").read()

i = s.find("## " + chr(127919) + " 项目状态")
if i == -1:
    i = s.find("**三大课已全部完成")
tail = (
    "## " + chr(127919) + " 项目状态（2026-10-24 终版）：全部 1008 个知识点升级完成，C/D 清零\n\n"
    "最终审计：A 965 · B 43 · C 0 · D 0（基线 A 5 / D 602）\n\n"
    "收尾三件事（批次 37-39）：\n"
    "1. 技术债根治：五门 JSON 源课（excel/methodology/pandas/sql/viz）升级内容移植回 TS 源"
    "（83 节，含双引号串/字符串数组/反引号三种格式解析 + ES6 转义 + join 悬空修复 9 处）"
    "——sync 后 JSON md5 全部 OK，回退根因消除\n"
    "2. 批次38 篇幅扩充：python-track 四门 82 节全部扩至 2600 字以上（进阶话题/补充代码，实跑验证）\n"
    "3. 批次39 数据 bug：修复 112 处 tips 字段为字符串导致 LessonView 渲染崩溃的问题"
    "（Airflow 70 + dbt 42，包装为标准数组）\n\n"
    "全站验证：depth-audit（C/D=0）、content-audit（校验/体检通过）、typecheck、12 章渲染抽查全过。\n"
)
# 删除旧的"三大课已全部完成"段落到文件尾的旧状态段（如有），接上新终版
j = s.find("\n\n", i)
s = s[:i] + "\n" + tail if i > 0 else s + "\n" + tail
# 若旧段落有残留文字在 tail 之后，截断
end_marker = "全站验证：depth-audit"
k = s.find(end_marker)
if k != -1:
    nxt = s.find("\n\n", k)
    s = s[: nxt if nxt != -1 else len(s)] + "\n"
io.open(P, "w", encoding="utf-8", newline="\n").write(s)
print("progress final ok")
