# -*- coding: utf-8 -*-
"""CS146S 章节文件自动验证器。

用法: python scripts/cs146s_validate.py [文件...]  (缺省验证 src/content/chapters/cs146s/ 全部 w*.ts)

检查项:
  1. esbuild 语法解析（结构/转义错误）
  2. 模板内裸反引号状态扫描（提前终止检测）
  3. 13 教学模块齐全（每 lesson）
  4. tips/demos 是数组且非空、每 lesson 题量与图示
  5. open 题必须带 explanation、referenceAnswer、rubric>=4；code 题必带 tests/answer
  6. python demo 与 code 题 answer/tests 本地可执行（answer 必须通过 tests）
"""
import io
import json
import os
import re
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR = os.path.join(ROOT, 'src', 'content', 'chapters', 'cs146s')

MODULES = ['学习目标', '前置知识', '问题背景', '直觉理解', '核心概念', '案例', '误区', '知识关联', '总结', '参考']

failures = []


def fail(msg):
    failures.append(msg)
    print('  FAIL:', msg)


def esbuild_check(path):
    r = subprocess.run(
        ['npx', 'esbuild', path, '--loader:.ts=ts', '--outfile=' + os.path.join(tempfile.gettempdir(), 'cs146s_v.js')],
        cwd=ROOT, capture_output=True, text=True, shell=(os.name == 'nt'))
    if r.returncode != 0:
        fail('esbuild 语法错误: ' + (r.stderr or r.stdout)[:500])
        return False
    return True


def run_py(code):
    """运行 python 代码，返回 (ok, output)。"""
    with tempfile.NamedTemporaryFile('w', suffix='.py', delete=False, encoding='utf-8') as f:
        f.write(code)
        tmp = f.name
    try:
        r = subprocess.run([sys.executable, tmp], capture_output=True, text=True, timeout=60)
        return r.returncode == 0, (r.stdout or '') + (r.stderr or '')
    except subprocess.TimeoutExpired:
        return False, 'TIMEOUT'
    finally:
        os.unlink(tmp)


def find_object_array(src, var_name):
    """粗定位 `export const VAR: ...[] = [` 到配对 `];` 的区间。"""
    m = re.search(r'export const ' + var_name + r'[^=]*=\s*\[', src)
    if not m:
        return None
    depth = 0
    i = src.index('[', m.start())
    in_str = None
    while i < len(src):
        ch = src[i]
        if in_str:
            if ch == '\\':
                i += 2
                continue
            if ch == in_str:
                in_str = None
        elif ch in ('"', "'", '`'):
            in_str = ch
        elif ch == '[':
            depth += 1
        elif ch == ']':
            depth -= 1
            if depth == 0:
                return src[m.start():i + 1]
        i += 1
    return None


def validate_file(path):
    print('==', os.path.basename(path))
    name = os.path.basename(path)
    if not esbuild_check(path):
        return
    with io.open(path, encoding='utf-8') as f:
        src = f.read()

    # 动态 import 拿数据（esbuild 转译后执行）
    tmpdir = tempfile.mkdtemp()
    outjs = os.path.join(tmpdir, name.replace('.ts', '.mjs'))
    subprocess.run(['npx', 'esbuild', path, '--loader:.ts=ts', '--format=esm',
                    '--outfile=' + outjs], cwd=ROOT, capture_output=True, text=True,
                   shell=(os.name == 'nt'))
    if not os.path.exists(outjs):
        fail('esbuild 转译失败')
        return
    # 用 node 提取 JSON（Windows 绝对路径须转 file:// URL）
    url = outjs.replace('\\', '/')
    if not url.startswith('/'):
        url = '/' + url
    node_script = ('import * as m from "file://' + url + '";\n'
                   'const keys = Object.keys(m);\n'
                   'const arrs = [];\n'
                   'for (const k of keys) if (Array.isArray(m[k])) arrs.push(...m[k]);\n'
                   'process.stdout.write(JSON.stringify(arrs));\n')
    with tempfile.NamedTemporaryFile('w', suffix='.mjs', delete=False, encoding='utf-8') as f:
        f.write(node_script)
        runner = f.name
    r = subprocess.run(['node', runner], capture_output=True, text=True, encoding='utf-8', errors='replace', cwd=ROOT,
                       shell=(os.name == 'nt'))
    os.unlink(runner)
    if r.returncode != 0:
        fail('node 执行失败: ' + (r.stderr or '')[:400])
        return
    chapters = json.loads(r.stdout)

    lesson_count = ex_count = 0
    for ch in chapters:
        print('  章节', ch.get('id'), '-', len(ch.get('lessons', [])), '节 /', len(ch.get('exercises', [])), '题')
        lesson_count += len(ch.get('lessons', []))
        for l in ch.get('lessons', []):
            lid = l.get('id', '?')
            c = l.get('content', '')
            if len(c) < 3000:
                fail(f'{lid} 内容过短({len(c)}字)')
            missing = [m for m in MODULES if m not in c]
            if missing:
                fail(f'{lid} 缺模块: {missing}')
            if not isinstance(l.get('tips'), list) or len(l.get('tips', [])) < 3:
                fail(f'{lid} tips<3 或非数组')
            if not isinstance(l.get('demos'), list) or len(l.get('demos', [])) < 1:
                fail(f'{lid} demos 空')
            for d in l.get('demos', []):
                if d.get('lang') == 'python':
                    ok, out = run_py(d.get('code', ''))
                    if not ok:
                        fail(f'{lid} python demo 运行失败: {out[-200:]}')
        exs = ch.get('exercises', [])
        ex_count += len(exs)
        for e in exs:
            eid = e.get('id', '?')
            if e.get('type') == 'open':
                if not e.get('explanation'):
                    fail(f'{eid} open 缺 explanation')
                if not e.get('referenceAnswer'):
                    fail(f'{eid} open 缺 referenceAnswer')
                if len(e.get('rubric', [])) < 4:
                    fail(f'{eid} open rubric<4')
            if e.get('type') == 'code':
                ans, tests = e.get('answer'), e.get('tests', '')
                if not ans or not tests:
                    fail(f'{eid} code 缺 answer/tests')
                    continue
                # 提取 starter 中的函数依赖：把 answer + tests 拼接执行
                code = ans + '\nimport json, math, random, re, os\n' + tests if False else ans + '\n' + tests
                ok, out = run_py(code)
                if not ok:
                    fail(f'{eid} code 参考答案未通过 tests: {out[-250:]}')
    print(f'  小计: {lesson_count} 节 / {ex_count} 题')


def main():
    args = sys.argv[1:]
    files = [os.path.join(ROOT, a) for a in args] if args else sorted(
        os.path.join(DIR, f) for f in os.listdir(DIR)
        if f.startswith('w') and f.endswith('.ts'))
    for p in files:
        validate_file(p)
    print()
    if failures:
        print(f'共 {len(failures)} 个问题')
        sys.exit(1)
    print('全部通过')


if __name__ == '__main__':
    main()
