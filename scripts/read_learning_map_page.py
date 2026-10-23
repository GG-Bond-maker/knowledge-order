import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('src/pages/LearningMapPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

print("Length:", len(text))
pos = text.find('deep-learning')
print("deep-learning at:", pos)
if pos != -1:
    print(text[pos-100:pos+300])
else:
    print("deep-learning NOT in LearningMapPage.tsx!")
    # Let's see what stations / nodes are in LearningMapPage.tsx
    lines = text.split('\n')
    for l in lines[:60]:
        print(l)
