"""精确修复模板字符串内的裸反引号。

规则：
- 只在 content / referenceAnswer / explanation 模板内
- 跳过 Markdown 代码围栏内的行
- 跳过字段声明行本身
"""
import re
import sys

path = sys.argv[1]
with open(path, encoding='utf-8') as f:
    lines = f.read().split('\n')

FIELD_ANY = re.compile(
    r'^\s*(content|question|explanation|text|referenceAnswer|starterCode|tests|answer|code|setupCode|note|goal|title|subtitle|description)\s*:\s*`'
)
END = re.compile(r'^`\s*,?\s*$')

in_tpl = False
field = None
in_code = False
fixed = 0

for i, line in enumerate(lines):
    trimmed = line.strip()

    m = FIELD_ANY.match(line)
    if m:
        ticks = len(re.findall(r'(?<!\\)`', line))
        if ticks == 1:
            in_tpl = True
            field = m.group(1)
            in_code = False
        else:
            in_tpl = False
            field = None
            in_code = False
        continue

    if not in_tpl:
        continue

    if END.match(trimmed):
        in_tpl = False
        field = None
        in_code = False
        continue

    if trimmed.startswith('```') or trimmed.startswith('~~~'):
        in_code = not in_code
        continue

    if in_code:
        continue

    if field not in ('content', 'referenceAnswer', 'explanation'):
        continue

    new = re.sub(r'(?<!\\)`', r'\\`', line)
    if new != line:
        lines[i] = new
        fixed += 1
        print('  line', i + 1)

with open(path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print('fixed', fixed, 'lines')
