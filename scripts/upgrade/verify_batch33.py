# -*- coding: utf-8 -*-
"""校验 batch33 系列脚本：执行每个 THEME 的章级代码，比对实测输出与 expected 是否一致。"""
import io, sys, contextlib, glob, os, re

ROOT = os.path.dirname(os.path.abspath(__file__))
ok = bad = 0
for path in sorted(glob.glob(os.path.join(ROOT, "batch33_*.py"))):
    src = io.open(path, encoding="utf-8").read()
    head = src.split("\npatched = 0")[0]
    ns = {}
    exec(compile(head, path, "exec"), ns)
    themes = ns.get("THEMES", {})
    for ch_id, th in themes.items():
        buf = io.StringIO()
        try:
            with contextlib.redirect_stdout(buf):
                exec(compile(th["code"], f"{os.path.basename(path)}:{ch_id}", "exec"), {})
            got = buf.getvalue().strip()
            want = th["expected"].strip()
            if got == want:
                ok += 1
                print(f"PASS {os.path.basename(path)} [{ch_id}]")
            else:
                bad += 1
                print(f"FAIL {os.path.basename(path)} [{ch_id}]")
                for g, w in zip(got.splitlines(), want.splitlines()):
                    if g != w:
                        print(f"   got : {g!r}")
                        print(f"   want: {w!r}")
                gn, wn = got.splitlines(), want.splitlines()
                if len(gn) != len(wn):
                    print(f"   行数 got={len(gn)} want={len(wn)}")
        except Exception as e:
            bad += 1
            print(f"ERROR {os.path.basename(path)} [{ch_id}]: {type(e).__name__}: {e}")
print(f"\n合计：PASS {ok} / FAIL {bad}")
sys.exit(1 if bad else 0)
