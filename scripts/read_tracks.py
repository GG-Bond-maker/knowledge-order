import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('src/pages/LearningMapPage.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx in range(75, 140):
    print(f"{idx+1}: {lines[idx]}", end='')
