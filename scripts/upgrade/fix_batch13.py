# -*- coding: utf-8 -*-
"""批次13 修正：元标签模拟、泄漏演示（1NN 连续块对照）、CPCV 统计——全部按实测校准。"""
import io

F = r"D:\Python_Project\knowledge-order\src\content\chapters\quant\quant-ml.ts"


def to_ts(md):
    return md.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")


def replace_section(lid, sec_start, sec_end, new_body):
    s = io.open(F, encoding="utf-8").read()
    i = s.index("id: '%s'" % lid)
    a = s.index(sec_start, i) + len(sec_start)
    b = s.index(sec_end, a)
    s = s[:a] + "\n\n" + to_ts(new_body) + "\n\n" + s[b:]
    io.open(F, "w", encoding="utf-8", newline=chr(10)).write(s)
    print("done:", lid, sec_start)


# c1-l3 元标签代码段
replace_section("quant-ml-c1-l3", "## 代码实践", "## 常见误区", """```python
import numpy as np
rng = np.random.default_rng(3)
n = 2000
# 一级信号的基础胜率由"市场状态"决定：好状态 70%，坏状态 45%
good = rng.random(n) < 0.4
y = (rng.random(n) < np.where(good, 0.70, 0.45)).astype(int)   # 信号真实结局
f2 = (rng.random(n) < np.where(good, 0.7, 0.3)).astype(int)    # 二级模型捕捉状态

print(f"全下注:   胜率 {y.mean():.1%}, 笔数 {n}")
sel = f2 == 1
tp, fp = int((sel & (y == 1)).sum()), int((sel & (y == 0)).sum())
print(f"二级过滤: 胜率 {tp/(tp+fp):.1%}, 笔数 {tp+fp}")
```

预期输出（seed=3 实测）：全下注胜率 54.2%（2000 笔）；二级过滤后胜率 58.1%（926 笔）——理论值 60.2%（贝叶斯展开可自算）。**方向不变、笔数减半、质量提升**——这就是元标签的全部生意。把好坏状态的基础胜率差距调小重跑，过滤收益随之消失：**二级模型赚的是"状态可辨别"的钱**。**常见错误**：二级标签泄漏（用了入场后才能知道的特征）；二级与一级用同一批特征（退化为重训一级）；置信阈值不做样本外验证（又是窥探）。""")

# c2-l1 泄漏代码段
replace_section("quant-ml-c2-l1", "## 核心概念：泄漏的定量演示", "## 原理详解", """## 核心概念：泄漏的定量演示

```python
import numpy as np
rng = np.random.default_rng(0)
x = rng.normal(0, 1, 1000)
X = np.convolve(x, np.ones(5)/5, mode="valid")[:-1]        # 特征: 5日滚动均值（相邻样本高度重叠）
y = np.convolve(x, np.ones(5)/5, mode="valid")[1:] + rng.normal(0, 0.15, 995)   # 标签: 明日滚动值

def knn_r2(folds):                                          # 1 近邻回归：最会"抄近邻"的模型
    ss = []
    for te in folds:
        tr = np.setdiff1d(np.arange(len(y)), te)
        preds = np.array([y[tr[np.argmin(np.abs(X[tr] - X[i]))]] for i in te])
        ss.append(1 - ((y[te] - preds) ** 2).sum() / ((y[te] - y[te].mean()) ** 2).sum())
    return np.mean(ss)

n = len(y)
shuffled_folds = [rng.permutation(n)[k::5] for k in range(5)]      # 随机打乱
contig_folds = [np.arange(n)[i*n//5:(i+1)*n//5] for i in range(5)] # 连续时间块
print(f"随机打乱 K 折 R^2: {knn_r2(shuffled_folds):.3f}")
print(f"连续时间块 R^2:     {knn_r2(contig_folds):.3f}")
```

预期输出（seed=0 实测）：打乱 R² ≈ 0.15，连续块 R² ≈ 0.07——**同一数据同一模型，仅切分方式不同，验证分虚高一倍以上**。机理：打乱后测试样本的时间近邻（特征几乎相同、标签几乎相同）坐在训练集里，1NN 直接"抄作业"；连续块下近邻不在场，模型只能靠真实的泛化。换用线性模型时差距缩小但不消失（重叠样本仍拉高拟合）——**模型越灵活，泄漏越严重**。""")

# c2-l3 CPCV 统计行
s = io.open(F, encoding="utf-8").read()
old = "均值 6.7%，标准差 2.1% → 95% 区间约 [2.5%, 10.9%]"
new = "均值 6.7%，标准差 2.2% → 95% 区间约 [2.4%, 11.0%]"
print("cpcv line:", s.count(old))
s = s.replace(old, new)
old2 = "print(f\"均值 {paths.mean():.1f}%, 标准差 {paths.std(ddof=1):.1f}%, \"\n      f\"95%区间 [{paths.mean()-2*paths.std(ddof=1):.1f}, {paths.mean()+2*paths.std(ddof=1):.1f}]\")"
new2 = old2  # 代码不变，输出值由文字行承载
old3 = "预期输出：均值 6.7%、标准差 2.1%、区间 [2.5, 10.9]、最差 2.7%。"
new3 = "预期输出（实测）：均值 6.7%、标准差 2.2%、区间 [2.4, 11.0]、最差 2.7%。"
print("cpcv out:", s.count(old3))
s = s.replace(old3, new3)
io.open(F, "w", encoding="utf-8", newline=chr(10)).write(s)
