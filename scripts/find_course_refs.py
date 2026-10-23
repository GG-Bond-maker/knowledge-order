import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

matches = []
for root, dirs, files in os.walk('src'):
    for f in files:
        if f.endswith(('.ts', '.tsx', '.json', '.vue')):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8', errors='ignore') as fp:
                c = fp.read()
                if 'llm-a1' in c or 'deep-learning' in c:
                    matches.append(path)

for m in sorted(set(matches)):
    print(m)
