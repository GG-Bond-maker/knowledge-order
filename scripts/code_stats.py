# -*- coding: utf-8 -*-
"""
Runnable Python Demos and Programming Exercises for Probability & Statistics (stats-foundations).
"""

STATS_CODE = {
    "demos": {
        "stats-foundations-l1-1": {
            "title": "大数定律与蒙特卡洛投点模拟",
            "lang": "python",
            "code": """import numpy as np

# 蒙特卡洛模拟：抛硬币大数定律收敛过程
np.random.seed(42)
n_flips = 10000
# 1 为正面，0 为反面 (真实概率 p = 0.5)
flips = np.random.binomial(n=1, p=0.5, size=n_flips)
cumulative_means = np.cumsum(flips) / np.arange(1, n_flips + 1)

print("=== 大数定律 (Law of Large Numbers) 模拟 ===")
for step in [10, 50, 100, 500, 1000, 5000, 10000]:
    print(f"投掷 {step:5d} 次 ➔ 样本均值: {cumulative_means[step-1]:.4f} (误差: {abs(cumulative_means[step-1] - 0.5):.4f})")

print("\\n✓ 随样本量 N 增大，样本均值依概率收敛于总体期望 0.5000！")
"""
        },
        "stats-foundations-l3-1": {
            "title": "贝叶斯定理：罕见病检测后验概率计算",
            "lang": "python",
            "code": """# 贝叶斯后验推断模拟：直觉陷阱与真实概率
def bayes_disease_test(prior=0.001, sensitivity=0.99, false_positive=0.05):
    # P(患病) = 0.1% (罕见病)
    # P(阳性|患病) = 99% (灵敏度)
    # P(阳性|健康) = 5% (假阳性率)
    p_pos_given_disease = sensitivity
    p_pos_given_healthy = false_positive
    p_healthy = 1.0 - prior
    
    # 全概率公式：测试呈阳性的总概率
    p_pos = (p_pos_given_disease * prior) + (p_pos_given_healthy * p_healthy)
    # 贝叶斯定理：阳性情况下，真正患病的后验概率
    p_disease_given_pos = (p_pos_given_disease * prior) / p_pos
    return p_disease_given_pos, p_pos

posterior, total_pos = bayes_disease_test()
print(f"基础患病率 (Prior): 0.1%")
print(f"检测试剂灵敏度: 99.0%, 假阳性率: 5.0%")
print(f"\\n检测结果为阳性时，实际真正患病的概率 (Posterior): {posterior * 100:.2f}%")
print("💡 结论：绝大多数人直觉以为阳性患病率接近 99%，但真实仅约 1.94%！因为健康人群基数巨大，假阳性人数远超真正患者。")
"""
        },
        "stats-foundations-l10-1": {
            "title": "双样本 t 检验与 p-value 假设检验实战",
            "lang": "python",
            "code": """import numpy as np

# A/B 测试：A 组为对照组，B 组为试验新策略组
np.random.seed(42)
group_a = np.random.normal(loc=10.0, scale=2.0, size=100)
group_b = np.random.normal(loc=10.8, scale=2.0, size=100)

mean_a, mean_b = np.mean(group_a), np.mean(group_b)
var_a, var_b = np.var(group_a, ddof=1), np.var(group_b, ddof=1)
n_a, n_b = len(group_a), len(group_b)

# 独立双样本 t 统计量计算 (Welch's t-test)
se_diff = np.sqrt(var_a / n_a + var_b / n_b)
t_stat = (mean_b - mean_a) / se_diff

print(f"A 组样本均值: {mean_a:.2f}, B 组样本均值: {mean_b:.2f}")
print(f"均值差值: {mean_b - mean_a:.2f}, 标准误: {se_diff:.3f}")
print(f"t 统计量: {t_stat:.3f}")
if abs(t_stat) > 1.96:
    print("✓ 在 95% 置信水平下 (p < 0.05)，两组均值存在统计学显著差异，拒绝零假设 H0！")
"""
        }
    },
    "exercises": [
        {
            "id": "stats-c1-code-1",
            "chapter_id": "stats-foundations-c1",
            "type": "code",
            "difficulty": 2,
            "question": "【编程实战】贝叶斯后验概率计算：编写函数 `calc_bayes_posterior(prior, sensitivity, false_positive_rate)`。\n\n根据贝叶斯公式计算并返回 `P(Disease | Positive)`：\n$$P(D|+) = \\frac{P(+|D) P(D)}{P(+|D) P(D) + P(+|\\neg D) P(\\neg D)}$$",
            "starterCode": """def calc_bayes_posterior(prior: float, sensitivity: float, false_positive_rate: float) -> float:
    \"\"\"计算检测阳性条件下的患病后验概率\"\"\"
    ___
""",
            "setupCode": "",
            "expectedOutput": "返回后验概率浮点数 (保留 4 位有效精度)",
            "answer": """def calc_bayes_posterior(prior: float, sensitivity: float, false_positive_rate: float) -> float:
    p_healthy = 1.0 - prior
    numerator = sensitivity * prior
    denominator = numerator + (false_positive_rate * p_healthy)
    return numerator / denominator
""",
            "tests": """res = calc_bayes_posterior(0.001, 0.99, 0.05)
assert round(res, 4) == 0.0194, f"计算有误: {res}"
res2 = calc_bayes_posterior(0.5, 0.9, 0.1)
assert round(res2, 4) == 0.9, f"先验 50% 时后验应为 90%: {res2}"
""",
            "explanation": "贝叶斯推断是统计学从频率学派走向主观概率与数据更新的核心桥梁。",
            "tags": ["贝叶斯定理", "后验概率", "全概率公式"]
        },
        {
            "id": "stats-c10-code-1",
            "chapter_id": "stats-foundations-c10",
            "type": "code",
            "difficulty": 2,
            "question": "【编程实战】双样本均值差异 t 统计量计算：编写函数 `calc_two_sample_t(sample_a, sample_b)`。\n\n计算 Welch's t 统计量：\n$$t = \\frac{\\bar{X}_1 - \\bar{X}_2}{\\sqrt{\\frac{s_1^2}{n_1} + \\frac{s_2^2}{n_2}}}$$",
            "starterCode": """import numpy as np

def calc_two_sample_t(sample_a: list, sample_b: list) -> float:
    \"\"\"计算双样本 t 统计量\"\"\"
    ___
""",
            "setupCode": "",
            "expectedOutput": "返回 t 统计量浮点数",
            "answer": """import numpy as np

def calc_two_sample_t(sample_a: list, sample_b: list) -> float:
    a = np.array(sample_a, dtype=float)
    b = np.array(sample_b, dtype=float)
    m1, m2 = np.mean(a), np.mean(b)
    v1, v2 = np.var(a, ddof=1), np.var(b, ddof=1)
    se = np.sqrt(v1 / len(a) + v2 / len(b))
    return float((m1 - m2) / se)
""",
            "tests": """import numpy as np
a = [10.0, 11.0, 12.0, 10.5, 11.5]
b = [14.0, 15.0, 13.5, 14.5, 15.5]
t = calc_two_sample_t(a, b)
assert t < -4.0, f"A 均值明显低于 B，t 统计量应为显著负值: {t}"
""",
            "explanation": "t 统计量反映了两组均值差异相当于多少个标准误，是 A/B 测试效果评估的基石算法。",
            "tags": ["t检验", "假设检验", "A/B测试"]
        }
    ]
}
