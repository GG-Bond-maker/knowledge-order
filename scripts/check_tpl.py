import re

p = 'src/content/chapters/quant/quant-math.ts'
s = open(p, encoding='utf-8').read()
lines = s.split('\n')

BACKSLASH = chr(92)
BACKTICK = chr(96)

boundary = re.compile(
    r'^\s*(content|code|starterCode|tests|answer|referenceAnswer|question|explanation'
    r'|prefix|suffix|starterSql|referenceSql):\s*' + BACKTICK + r'|^\s*' + BACKTICK + r',?\s*$'
)

bad = []
for i, l in enumerate(lines, 1):
    j = 0
    while j < len(l):
        if l[j] == BACKSLASH and j + 1 < len(l):
            j += 2
            continue
        if l[j] == BACKTICK:
            if not boundary.match(l):
                bad.append((i, l.strip()[:120]))
            break
        j += 1

for i, t in bad:
    print(i, '|', t)
print('total bad lines:', len(bad))
