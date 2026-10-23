import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('src/content/courses.ts', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = re.findall(r'id:\s*[\'\"](llm-[^\'\"]+)[\'\"].*?title:\s*[\'\"]([^\'\"]+)[\'\"].*?prerequisites:\s*(\[[^\]]*\])', text, re.DOTALL)
for cid, title, prereq in matches:
    print(f"{cid:<10} | {title:<20} | prereq: {prereq}")
