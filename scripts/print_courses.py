import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('src/content/courses.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(185, 370):
    print(lines[i], end='')
