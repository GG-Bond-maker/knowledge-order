import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

for f in sorted(os.listdir('src/content/chapters')):
    if f.startswith('llm-') or f.startswith('deep-'):
        size = os.path.getsize(os.path.join('src/content/chapters', f))
        print(f"{f:<25} | {size:>8} bytes")
