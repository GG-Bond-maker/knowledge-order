# methodology-4 A/B 实验与统计基础（纯 Python 模拟两比例检验、置信区间与 AA 测试）
import math, random

random.seed(42)                                   # 固定随机种子，结果可复现

def simulate(n, p):                               # 模拟一组用户的转化结果
    return [1 if random.random() < p else 0 for _ in range(n)]

n_a, n_b = 5000, 5000                             # 对照组/实验组样本量
p_a, p_b = 0.100, 0.108                           # 真实转化率（实验组提升 8%）
conv_a, conv_b = sum(simulate(n_a, p_a)), sum(simulate(n_b, p_b))
r_a, r_b = conv_a / n_a, conv_b / n_b
print(f"对照组：{conv_a}/{n_a} = {r_a:.4f}；实验组：{conv_b}/{n_b} = {r_b:.4f}")
print(f"绝对提升 = {r_b - r_a:+.4f}，相对提升 = {r_b / r_a - 1:+.2%}")

se = math.sqrt(r_a * (1 - r_a) / n_a + r_b * (1 - r_b) / n_b)   # 两比例之差的标准误
z = (r_b - r_a) / se
p_value = math.erfc(abs(z) / math.sqrt(2))                       # 双侧 P 值
ci = (r_b - r_a - 1.96 * se, r_b - r_a + 1.96 * se)             # 95% 置信区间
print(f"z = {z:.2f}，P 值 = {p_value:.4f}，95% CI = [{ci[0]:+.4f}, {ci[1]:+.4f}]")
print("结论：", "差异显著（P<0.05），且置信区间不含 0" if p_value < 0.05 else "不显著")
print("注意：P 值不是“实验组更好的概率”，而是在“两组无差别”假设下观察到当前差异的概率")

# ---- AA 测试：同一总体反复对比，5% 的次数会“假显著” ----
fp = sum(1 for _ in range(1000)
         if (lambda ra, rb: math.erfc(abs(rb - ra) / math.sqrt(
             ra * (1 - ra) / n_a + rb * (1 - rb) / n_b) / math.sqrt(2)) < 0.05)(
             sum(simulate(n_a, p_a)) / n_a, sum(simulate(n_a, p_a)) / n_a))
print(f"\nAA 测试 1000 次中“假显著”次数 = {fp}（约 5%，显著水平 α 本身就是容错率）")

# ---- 样本量：效应越小，需要的样本越大 ----
z_alpha, z_beta = 1.96, 0.84                      # α=0.05 双侧，检验力 80%
for rel in (0.10, 0.05, 0.02):
    p2 = p_a * (1 + rel)
    n_req = (z_alpha * math.sqrt(2 * p_a * (1 - p_a)) + z_beta * math.sqrt(
        p_a * (1 - p_a) + p2 * (1 - p2))) ** 2 / (p2 - p_a) ** 2
    print(f"要检出 {rel:.0%} 相对提升，每组约需 {int(n_req) + 1:,} 人")
