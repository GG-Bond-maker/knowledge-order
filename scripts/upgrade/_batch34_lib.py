# -*- coding: utf-8 -*-
"""batch34 共用库：TS 模板字符串解析级提取/回写 + batch31 式章主题包包装。

用法（各 batch34_*.py）：
    from _batch34_lib import Lib, build_md
    lib = Lib(RCOURSE_JSON, {"文件路径": [lesson ids...]})
    # 先 verify 跑章代码；expected 填好后再 patch
"""
import io, json, re, sys, time

BT = chr(96)
ROOT = r"D:\Python_Project\knowledge-order"

SIMPLE = {"n": "\n", "t": "\t", "r": "\r", "b": "\b", "f": "\f", "v": "\v",
          "0": "\0", "`": "`", "$": "$", "\\": "\\", "'": "'", '"': '"'}


def js_unescape(s):
    """把 TS 模板字符串源码片段反转义为运行时值（含 \\| -> | 等恒等转义）。"""
    out = []
    i, n = 0, len(s)
    while i < n:
        ch = s[i]
        if ch != "\\":
            out.append(ch); i += 1; continue
        nxt = s[i + 1]
        if nxt in SIMPLE:
            out.append(SIMPLE[nxt]); i += 2
        elif nxt == "x" and i + 3 < n:
            out.append(chr(int(s[i + 2:i + 4], 16))); i += 4
        elif nxt == "u" and i + 2 < n:
            if s[i + 2] == "{":
                k = s.index("}", i)
                out.append(chr(int(s[i + 3:k], 16))); i = k + 1
            else:
                out.append(chr(int(s[i + 2:i + 6], 16))); i += 6
        else:
            out.append(nxt); i += 2
    return "".join(out)


def to_ts(md):
    """运行时 markdown -> TS 模板字符串安全源码。"""
    return md.replace("\\", "\\\\").replace(BT, "\\`").replace("${", "\\${")


def find_content_block(src, lid):
    """返回 (j, k)：j=开引号后一位，k=闭引号位置。id 可能出现在 lessonIds 数组，
    要求 key 后 300 字符内紧跟 content: `。"""
    key = "id: '%s'" % lid
    start = 0
    while True:
        i = src.index(key, start)
        head = src[i:i + 300]
        cpos = head.find("content: " + BT)
        if cpos != -1:
            j = i + cpos + len("content: " + BT)
            break
        start = i + 1
    p = j
    while p < len(src):
        ch = src[p]
        if ch == "\\":
            p += 2; continue
        if ch == BT:
            return j, p
        p += 1
    raise ValueError("no close: " + lid)


class Lib:
    def __init__(self, course_id, ts_files):
        """ts_files: 有序文件路径列表（相对 ROOT）。"""
        self.course_id = course_id
        self.json_path = ROOT + "/content-data/courses/%s.json" % course_id
        self.ts_files = [ROOT + "/" + f for f in ts_files]
        self.course = json.load(io.open(self.json_path, encoding="utf-8"))
        self.pending = [l for ch in self.course["chapters"] for l in ch["lessons"]
                        if "学习目标" not in l["content"]]
        self.by_id = {l["id"]: l for l in self.pending}

    def orig_content(self, lid):
        l = self.by_id.get(lid)
        if l is None:
            raise KeyError("lesson 无原文或已升级: " + lid)
        return l["content"].strip()

    def patch_lesson(self, lid, md):
        """把 md 写入该 lesson 所在 TS 文件的 content 块。"""
        target = None
        for f in self.ts_files:
            s = io.open(f, encoding="utf-8").read()
            if "id: '%s'" % lid in s:
                target = (f, s)
                break
        if target is None:
            raise KeyError("TS 文件中找不到 " + lid)
        f, s = target
        j, k = find_content_block(s, lid)
        orig = js_unescape(s[j:k])
        jl = self.by_id[lid]["content"]
        if not (orig == jl or orig.strip() == jl.strip()):
            raise AssertionError("原文与 JSON 不一致，拒绝打补丁: " + lid)
        new = s[:j] + "\n" + to_ts(md) + "\n" + s[k:]
        io.open(f, "w", encoding="utf-8", newline="\n").write(new)
        print("patched", lid, "->", f.rsplit("/", 1)[-1])

    def verify_codes(self, themes, goals):
        """themes[cid]['code'] 逐一执行并打印输出，用于填写 expected。"""
        for cid, t in themes.items():
            print("=" * 20, cid, t.get("name", ""))
            g = dict(globals())
            exec(compile(t["code"], cid, "exec"), g)
        print("VERIFY-ONLY（expected 未填，未写盘）")


def build_md(orig, goals, prereq, why, intuition, code, expected, cerr, miscon,
             connection, summary, ref):
    """batch31 式模板（### 三级标题，原文全文保留）。"""
    return (
        "### 学习目标\n\n学完本节，你应该能够：\n%s\n\n"
        "### 前置知识\n\n%s\n\n"
        "### 问题背景\n\n%s\n\n### 直觉理解\n\n%s\n\n"
        "### 核心概念与原理详解\n\n%s\n\n"
        "### 完整案例（含手算）\n\n以下代码完整演算本章主题的核心流程：\n\n"
        "### 代码实践\n\n%spython\n%s%s\n\n预期输出（实测）：%s\n\n**常见错误**：%s\n\n"
        "### 常见误区\n\n%s\n\n### 知识关联\n\n%s\n\n"
        "### 本节总结\n\n%s\n\n"
        "### 参考资料\n\n> **来源类型：参考资料**\n> - %s"
    ) % (goals, prereq, why, intuition, orig,
         BT * 3, code.rstrip("\n"), BT * 3, expected, cerr, miscon, connection, summary, ref)


def finish(lib):
    """所有 pending 节处理完的收尾提示。"""
    rest = [l["id"] for l in lib.pending]
    print("pending remaining:", len(rest), rest[:5])
