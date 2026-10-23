import os

for fname in os.listdir('src/content/chapters'):
    if fname.startswith('paper-'):
        p = os.path.join('src/content/chapters', fname)
        with open(p, 'r', encoding='utf-8') as f:
            c = f.read()
        code_cnt = c.count("type: 'code'")
        demo_cnt = c.count("lang: 'python'")
        print(f"{fname:30s} -> code exercises: {code_cnt:2d}, python demos: {demo_cnt:2d}")
