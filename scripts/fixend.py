"""修复被误转义的模板结束行：把「\.`,` 或「\` 还原为「`,」或「`」。"""
import re
import sys

path = sys.argv[1]
with open(path, encoding='utf-8') as f:
    lines = f.read().split('\n')

fixed = 0
for i, line in enumerate(lines):
    s = line.strip()
    # 形如：内容。\`,  或  \`  或  \`,
    if re.fullmatch(r'\\`\s*,?\s*', s):
        lines[i] = line.replace('\\`', '`')
        fixed += 1
        print('  end-line fixed:', i + 1)
    elif re.search(r'\\`\s*,\s*$', line) and not s.startswith('//'):
        # 行尾是 \`,  —— 说明结束反引号被转义
        lines[i] = re.sub(r'\\`(\s*,)?\s*$', lambda m: '`' + (m.group(1) or ''), line)
        fixed += 1
        print('  tail fixed:', i + 1)

with open(path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print('fixed', fixed)
