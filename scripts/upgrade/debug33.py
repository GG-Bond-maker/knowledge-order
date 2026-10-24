# -*- coding: utf-8 -*-
import sys
sys.path.insert(0, r"D:\Python_Project\knowledge-order\scripts\upgrade")
src = open(r"D:\Python_Project\knowledge-order\scripts\upgrade\batch33_methodology.py", encoding="utf-8").read()
src = src.split('apply("methodology"')[0]
ns = {"__file__": r"D:\Python_Project\knowledge-order\scripts\upgrade\batch33_methodology.py"}
exec(src, ns)
mt = ns["M_THEMES"]
for k, v in mt.items():
    if isinstance(v, dict):
        print(k, "dict ok, keys:", list(v.keys()))
    else:
        print(k, "NOT DICT:", type(v).__name__, v if isinstance(v, tuple) else "")
