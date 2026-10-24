# -*- coding: utf-8 -*-
"""批次37：处理特殊格式文件的 JSON→TS 移植。
viz.ts：content 为双引号字符串（JS 转义）；pandas/ch2+：content 为字符串数组。
通用做法：解析 JS 值 → 还原纯文本 → 与升级 JSON 的原文段比对 → 回写为模板字符串。
"""
import sys, os, json, io
sys.path.insert(0, os.path.dirname(__file__))
from _batch34_lib import to_ts

ROOT = r"D:\Python_Project\knowledge-order"
BT = chr(96)


def js_unescape_str(s):
    """JS 字符串字面量的转义还原（不含首尾引号）。"""
    out = []
    i = 0
    while i < len(s):
        ch = s[i]
        if ch == "\\" and i + 1 < len(s):
            nxt = s[i + 1]
            simple = {"n": "\n", "t": "\t", "r": "\r", '"': '"', "'": "'", "`": "`",
                      "\\": "\\", "0": "\0", "b": "\b", "f": "\f", "v": "\v", "/": "/"}
            if nxt in simple:
                out.append(simple[nxt]); i += 2; continue
            if nxt == "u":
                if i + 2 < len(s) and s[i + 2] == "{":
                    end_b = s.find("}", i + 3)
                    if end_b != -1:
                        try:
                            out.append(chr(int(s[i + 3:end_b], 16)))
                            i = end_b + 1
                            continue
                        except ValueError:
                            pass
                hexs = s[i + 2:i + 6]
                try:
                    out.append(chr(int(hexs, 16))); i += 6; continue
                except ValueError:
                    out.append(nxt); i += 2; continue
            if nxt == "x":
                try:
                    out.append(chr(int(s[i+2:i+4], 16))); i += 4; continue
                except ValueError:
                    out.append(nxt); i += 2; continue
            out.append(nxt); i += 2; continue
        out.append(ch); i += 1
    return "".join(out)


def parse_js_string(src, i):
    """src[i] 为引号（" 或 '），返回 (还原文本, 结束位置)。"""
    q = src[i]
    j = i + 1
    while j < len(src):
        ch = src[j]
        if ch == "\\":
            j += 2; continue
        if ch == q:
            return js_unescape_str(src[i+1:j]), j + 1
        j += 1
    raise ValueError("unterminated string")


def parse_js_value(src, i):
    """解析 content 的值：字符串或字符串数组。返回 (还原文本, 结束位置, kind)。"""
    while src[i] in " \t\r\n":
        i += 1
    if src[i] in "\"'":
        text, end = parse_js_string(src, i)
        return text, end, "string"
    if src[i] == BT:
        j = i + 1
        while j < len(src):
            ch = src[j]
            if ch == "\\":
                j += 2; continue
            if ch == BT:
                return js_unescape_str(src[i+1:j]), j + 1, "template"
            j += 1
        raise ValueError("unterminated template")
    if src[i] == "[":
        j = i + 1
        parts = []
        while True:
            while src[j] in " \t\r\n":
                j += 1
            if src[j] == "]":
                return "\n".join(parts), j + 1, "array"
            if src[j] == ",":
                j += 1; continue
            text, j = parse_js_string(src, j)
            parts.append(text)
    raise ValueError("unsupported content value at " + str(i))


def find_lesson_value(src, lid):
    """定位 lesson 的 content 值。id 可能用单引号或双引号；id 与 content 间需在 600 字符内。"""
    for q in ("'", '"'):
        key = "id: %s%s%s" % (q, lid, q)
        start = 0
        while True:
            try:
                i = src.index(key, start)
            except ValueError:
                break
            head = src[i:i + 600]
            cpos = head.find("content:")
            if cpos != -1:
                vi = i + cpos + len("content:")
                text, end, kind = parse_js_value(src, vi)
                return text, end, kind
            start = i + 1
    raise KeyError("lesson 未找到: " + lid)


def original_from_wrapped(content):
    i = content.index("### 核心概念与原理详解") + len("### 核心概念与原理详解")
    j = content.index("### 完整案例（含手算）", i)
    return content[i:j].strip("\n")


def migrate(course_id, ts_files):
    jp = os.path.join(ROOT, "content-data", "courses", course_id + ".json")
    course = json.load(io.open(jp, encoding="utf-8"))
    lessons = {l["id"]: l for ch in course["chapters"] for l in ch["lessons"]}
    ts_cache = {f: io.open(os.path.join(ROOT, f), encoding="utf-8").read() for f in ts_files}
    ok = miss = mismatch = 0
    norm = lambda t: " ".join(t.split())
    for lid, l in lessons.items():
        wrapped = l["content"].strip()
        if "学习目标" not in wrapped:
            continue
        orig_json = original_from_wrapped(wrapped)
        target = None
        for f in ts_files:
            if ("id: '%s'" % lid) in ts_cache[f] or ('id: "%s"' % lid) in ts_cache[f]:
                target = f
                break
        if target is None:
            miss += 1; print("MISS-TS:", lid); continue
        s = ts_cache[target]
        try:
            ts_text, end, kind = find_lesson_value(s, lid)
        except (KeyError, ValueError) as e:
            miss += 1; print("PARSE-FAIL:", lid, str(e)[:60]); continue
        if "学习目标" in ts_text:
            print("SKIP(TS已升级):", lid); continue
        if norm(ts_text) != norm(orig_json):
            mismatch += 1
            print("MISMATCH:", lid, "| ts", len(ts_text), "vs json", len(orig_json))
            continue
        new_s = s[:end - len(ts_text) - 0]  # 占位：下面整体重建
        # 找 content: 键起点，整段替换为模板字符串
        ckey = s.rfind("content:", 0, end)
        new_s = s[:ckey] + "content: " + BT + "\n" + to_ts(wrapped) + "\n" + BT + s[end:]
        io.open(os.path.join(ROOT, target), "w", encoding="utf-8", newline="\n").write(new_s)
        ts_cache[target] = new_s
        ok += 1
    print(f"[{course_id}] 成功 {ok} | 缺失 {miss} | 不一致 {mismatch}")
    return ok


if __name__ == "__main__":
    total = 0
    total += migrate("viz", ["src/content/chapters/viz.ts", "src/content/chapters/viz-extra.ts"])
    total += migrate("pandas", ["src/content/chapters/pandas.ts",
                                "src/content/chapters/pandas/ch1.ts", "src/content/chapters/pandas/ch2.ts",
                                "src/content/chapters/pandas/ch3.ts", "src/content/chapters/pandas/ch4.ts",
                                "src/content/chapters/pandas/ch5.ts"])
    print("合计:", total)
