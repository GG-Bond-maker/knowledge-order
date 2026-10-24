# -*- coding: utf-8 -*-
import statistics as st

print("== l13-5 ==")
ctrl = [28.1, 30.5, 27.9, 31.2, 29.8]
trt = [32.4, 33.1, 291040.0, 31.8, 32.9]
m_c, m_t = st.mean(ctrl), st.mean(trt)
med_c, med_t = st.median(ctrl), st.median(trt)
print(f"均值: 对照 {m_c:.1f} vs 实验 {m_t:.1f}")
print(f"中位数: 对照 {med_c:.1f} vs 实验 {med_t:.1f}")
pool = sorted(ctrl + trt)
rank_trt = [pool.index(v) + 1 for v in trt]
print("实验组秩次:", rank_trt, "-> 秩和 =", sum(rank_trt))

print("== l13-6 ==")
from itertools import combinations
from math import comb
ctrl = [2.9, 3.0, 3.1, 3.3]
trt = [3.4, 3.5, 3.6, 3.8]
n, m = len(ctrl), len(trt)
R_t = sum(sorted(ctrl + trt).index(v) + 1 for v in trt)
U_t = R_t - m * (m + 1) / 2
print(f"R={R_t}, U={U_t:.0f}, n*m={n*m}")
pool = list(range(1, 9))
dist = {}
for idx in combinations(pool, m):
    u = sum(idx) - m * (m + 1) / 2
    dist[u] = dist.get(u, 0) + 1
total = comb(n + m, n)
p_one = sum(v for k, v in dist.items() if k <= U_t) / total
print(f"P(U<=0)={dist[0.0]/total:.4f}, 单侧 p={p_one:.4f}")

print("== l13-7 ==")
from math import erfc, sqrt
O = [[20, 80], [40, 60]]
n = sum(map(sum, O))
R = [sum(r) for r in O]; C = [sum(c) for c in zip(*O)]
chi2 = sum((O[i][j] - R[i]*C[j]/n)**2 / (R[i]*C[j]/n) for i in range(2) for j in range(2))
p = erfc(sqrt(chi2 / 2))
V = sqrt(chi2 / n)
print(f"chi2={chi2:.3f}, df=1, p={p:.4f}, V={V:.3f}")
print(f"点击率: 图文 {O[0][0]/R[0]:.0%} vs 视频 {O[1][0]/R[1]:.0%}")

print("== l14-1 ==")
x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
y = [2, 4, 9, 16, 26, 42, 70, 115, 180, 300]
def pearson(a, b):
    ma, mb = sum(a)/len(a), sum(b)/len(b)
    sxy = sum((u-ma)*(v-mb) for u, v in zip(a, b))
    sxx = sum((u-ma)**2 for u in a); syy = sum((v-mb)**2 for v in b)
    return sxy / sqrt(sxx*syy)
def rank(a):
    s = sorted(range(len(a)), key=lambda i: a[i])
    r = [0.0]*len(a); r[s[0]] = 1
    for k in range(1, len(a)):
        r[s[k]] = r[s[k-1]] + (1 if a[s[k]] != a[s[k-1]] else 0)
    return r
rx, ry = rank(x), rank(y)
d2 = sum((a-b)**2 for a, b in zip(rx, ry))
print(f"Pearson r = {pearson(x,y):.4f}")
print(f"Spearman rs = {1 - 6*d2/(len(x)*(len(x)**2-1)):.4f}")

print("== l14-2 ==")
data = {
  "理学院(竞争小)": [(100, 50), (20, 12)],
  "文社学院(竞争大)": [(20, 4), (100, 30)],
}
m_a = m_r = f_a = f_r = 0
for dept, (m, f) in data.items():
    print(f"{dept}: 男 {m[1]}/{m[0]}={m[1]/m[0]:.0%} vs 女 {f[1]}/{f[0]}={f[1]/f[0]:.0%}")
    m_a += m[0]; m_r += m[1]; f_a += f[0]; f_r += f[1]
print(f"总体: 男 {m_r}/{m_a}={m_r/m_a:.0%} vs 女 {f_r}/{f_a}={f_r/f_a:.0%}")

print("== l14-3 ==")
import random
random.seed(7)
b0, b1, n = 2.0, 0.5, 200
xs = [random.uniform(0, 10) for _ in range(n)]
es = [random.gauss(0, 1) for _ in range(n)]
ys = [b0 + b1*x + e for x, e in zip(xs, es)]
mx, my = sum(xs)/n, sum(ys)/n
b1h = sum((x-mx)*(y-my) for x, y in zip(xs, ys)) / sum((x-mx)**2 for x in xs)
b0h = my - b1h*mx
res = [y - (b0h + b1h*x) for x, y in zip(xs, ys)]
print(f"真实 b0=2.0, b1=0.5 -> OLS 估计 b0={b0h:.3f}, b1={b1h:.3f}")
print(f"残差均值 = {sum(res)/n:+.4f}")
cov = sum(r*(x-mx) for r, x in zip(res, xs)) / n
sd_r = (sum(r**2 for r in res)/n)**0.5
sd_x = (sum((x-mx)**2 for x in xs)/n)**0.5
print(f"Corr(e, x) = {cov/sd_r/sd_x:+.4f}")
