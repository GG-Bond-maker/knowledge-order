import sys

sys.stdout.reconfigure(encoding='utf-8')

# Let's read src/content/courses.ts to see all LLM courses
with open('src/content/courses.ts', 'r', encoding='utf-8') as f:
    text = f.read()

import re
courses = re.findall(r'id:\s*[\'\"]([^\'\"]+)[\'\"].*?title:\s*[\'\"]([^\'\"]+)[\'\"]', text)
for cid, title in courses:
    print(f"Course: {cid:<16} | {title}")
