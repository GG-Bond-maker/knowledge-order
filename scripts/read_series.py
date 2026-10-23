import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('src/content/series.ts', 'r', encoding='utf-8') as f:
    print(f.read())
