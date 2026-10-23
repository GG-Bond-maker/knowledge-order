import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('src/content/chapters/llm-a4.ts', 'r', encoding='utf-8') as f:
    text = f.read()

print("=== llm-a4.ts ===")
print("Length:", len(text))
for line in text.split('\n')[:40]:
    print(line)
