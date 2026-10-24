# -*- coding: utf-8 -*-
"""批次33c：viz 12 节 + sql 23 节。"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from wave4_lib import apply, theme

# ============ viz（3 章）============
V_THEMES = {
    0: theme(
        "可视化的目的不是“好看”，而是把认知负担降到最低——图表类型选错，再精致也是误导。Matplotlib 的三层结构（Figure/Axes/Artist）是所有定制的入口。",
        "Figure 是画布、Axes 是坐标系、Artist 是每个笔画——理解三层后，“调标题、改颜色、加注释”都不再是背参数，而是知道改哪一层。",
        """# Matplotlib 思想的纯 Python 模拟: 图表选型决策器
def pick_chart(goal, n_vars, n_points=100):
    if goal == "趋势" and n_vars == 1: return "折线图"
    if goal == "比较" and n_vars <= 5: return "柱状图"
    if goal == "构成" and n_vars <= 5: return "饼图/堆叠柱"
    if goal == "关系" and n_vars == 2: return "散点图"
    if goal == "分布" and n_points > 30: return "直方图/箱线图"
    return "需要进一步拆解需求"
for g, nv in [("趋势",1), ("比较",4), ("构成",4), ("关系",2), ("分布",1)]:
    print(g, "->", pick_chart(g, nv))""",
        "趋势→折线图、比较→柱状图、构成→饼图/堆叠柱、关系→散点图、分布→直方图/箱线图",
        "饼图超过 5 类还在用（人眼难比角度）；双 y 轴硬凑相关（误导）；3D 图遮数据。",
        "1. 图越花越专业——Data-Ink 比率原则：去无意义装饰；\n2. 颜色只为美观——颜色承载语义（分类/连续/发散）；\n3. 双 y 轴好用——两轴刻度操纵极易误导。",
        "- **向前**：数据分析课的 EDA 是图表需求来源；\n- **向后**：l-2-1 折线/柱状等具体图型；\n- **平行**：论文图表的规范与商业 dashboard。",
        "| 结论 | 内容 |\n| --- | --- |\n| 选型 | 按 goal（趋势/比较/构成/关系/分布） |\n| 三层结构 | Figure→Axes→Artist |\n| 原则 | Data-Ink 优先，颜色有语义 |"),
    1: theme(
        "折线/柱状/直方/散点四大家族覆盖 80% 分析需求——每种图回答一个固定问题，选型即明确“要回答什么”。",
        "折线看趋势（x 有序）、柱状比大小（类别离散）、直方看分布（连续分箱）、散点看关系（两连续变量）——别拿柱状图画时间趋势（缺中间点）。",
        """import random
rng = random.Random(3)
data = [rng.gauss(50, 15) for _ in range(500)]
# 直方图纯 python 版: 分箱统计
bins = list(range(5, 96, 10))
hist = [0]*(len(bins)-1)
for v in data:
    for i in range(len(bins)-1):
        if bins[i] <= v < bins[i+1]:
            hist[i] += 1
            break
for i, cnt in enumerate(hist):
    print(f"{bins[i]:3d}-{bins[i+1]:3d}: {'#'*int(cnt/3)} {cnt}")""",
        "各箱 ASCII 直方条，峰值在 45–65 区间（正态 N(50,15) 的预期形态）",
        "直方图 bin 数随手设（太多噪声/太少糊死，Sturges/FD 规则起步）；柱状图 y 轴不从 0（柱高误导）；折线图 x 轴等距但时间不等距。",
        "1. 饼图适合多类比较——超过 3 类换条形图；\n2. 双 y 轴省空间——误导风险大于收益；\n3. 3D 炫酷——遮挡与透视失真。",
        "- **向前**：l-1-1 的选型决策器已定图型；\n- **向后**：l-3 Seaborn 把“统计图+拟合”打包；\n- **平行**：论文图表规范（ Nature/期刊风格）。",
        "| 结论 | 内容 |\n| --- | --- |\n| 折线 | 有序 x 的趋势 |\n| 柱状 | 类别比较，y 从 0 起 |\n| 直方 | 连续分布，bin 数有讲究 |"),
    2: theme(
        "单图讲单变量，业务问题常是多变量：颜色编码第三维、分面（facet）拆群体、热力图表达矩阵——Seaborn 的价值是把“统计图+统计变换”打包。",
        "分面像把一张大图按群体复印多份小图（同轴可比）；热力图像给表格上色——颜色深浅即数值大小。",
        """# 热力图思想: 相关矩阵的纯 python 表达
import random
rng = random.Random(1)
a = [rng.gauss(0,1) for _ in range(200)]
b = [0.6*v + rng.gauss(0,0.8) for v in a]
c = [rng.gauss(0,1) for _ in range(200)]
def pearson(x, y):
    mx, my = sum(x)/len(x), sum(y)/len(y)
    num = sum((p-mx)*(q-my) for p, q in zip(x, y))
    den = (sum((p-mx)**2 for p in x)*sum((q-my)**2 for q in y))**0.5
    return num/den
r_ab, r_ac, r_bc = pearson(a,b), pearson(a,c), pearson(b,c)
for pair, r in [("a-b", r_ab), ("a-c", r_ac), ("b-c", r_bc)]:
    bar = "#"*int(abs(r)*10)
    print(f"{pair}: r={r:+.2f} {bar}")
print("矩阵读法: 颜色越深/条越长=相关越强")""",
        "a-b r≈+0.55（构造的真相关）、a-c/b-c r≈±0.1（噪声）——条形长短即热力图深浅",
        "相关矩阵只画线性相关（非线性关系会漏）；分面共享 y 轴与否不声明；配色用彩虹色板（感知失真，用 virialis 类）。",
        "1. 图形重叠越多信息越大——过绘（overplotting）需透明度/抽样；\n2. 热力图=表格美化——聚类排序后才显结构；\n3. 分面是花活——多群体比较的分面是最诚实工具。",
        "- **向前**：l-2 家族图型的多变量扩展；\n- **向后**：仪表盘与商业图表；\n- **平行**：量化课的相关矩阵热力图。",
        "| 结论 | 内容 |\n| --- | --- |\n| 多变量 | 颜色/大小/分面编码第三四维 |\n| 热力图 | 矩阵上色，聚类后更有信息 |\n| 纪律 | 色板感知均匀，防过绘 |"),
}
V_GOALS = {
    "viz-l-1-1": "1. 按 goal 为数据选对图表类型；\n2. 说出三类常见误导图；\n3. 用 Data-Ink 原则审查一张图。",
    "viz-l-1-2": "1. 区分 Figure/Axes/Artist 三层；\n2. 在正确层级上改标题与轴；\n3. 解释“plt.plot 隐式 Axes”的行为。",
    "viz-l-1-3": "1. 用 subplots 组织多子图并共享轴；\n2. 用样式参数统一风格；\n3. 建立“探索→精修→导出”的绘图工作流。",
    "viz-l-1-4": "1. 复述三层结构与常用设置入口；\n2. 区分 rcParams 全局与局部参数；\n3. 用保存参数保证导出清晰度。",
    "viz-l-2-1": "1. 为时间序列选折线并处理多序列；\n2. 为类别比较选柱状/条形并从 0 起轴；\n3. 避免“折线画类别”的错配。",
    "viz-l-2-2": "1. 用直方图看分布并选 bin 数；\n2. 用箱线图读中位数/四分位/离群；\n3. 对比小提琴图与箱线的信息增量。",
    "viz-l-2-3": "1. 用散点图读相关与离群；\n2. 用气泡图编码第三维（面积语义）；\n3. 说出饼图的适用上限与替代。",
    "viz-l-2-4": "1. 对比直方/箱线/密度的适用场景；\n2. 处理多组分布对比（并排箱线/山脊）；\n3. 识别分布图的坐标陷阱。",
    "viz-l-3-1": "1. 说出 Seaborn 的“统计变换打包”思想；\n2. 用类别图对比分组分布；\n3. 选对 distribution/relational/categorical 三族。",
    "viz-l-3-2": "1. 用热力图呈现相关矩阵；\n2. 用回归图叠加拟合与置信带；\n3. 防止把拟合线当因果证据。",
    "viz-l-3-3": "1. 用颜色/大小编码第三四维；\n2. 用分面网格拆群体比较；\n3. 控制过绘（透明度/抽样）。",
    "viz-l-3-4": "1. 组合多编码通道并保持可读；\n2. 用分面完成“同轴可比”的多群体对比；\n3. 按受众精简最终版图表。",
}
V_PREREQ = {0: "- 无前置；数据分析课 EDA 直觉加分。", 1: "- Matplotlib 三层结构（l-1-2）。", 2: "- 基础图型（l-2 家族）；相关系数（stats l6-6）。"}
apply("viz", V_THEMES, V_GOALS, V_PREREQ)
print("viz done")

# ============ sql（6 章，23 节，sqlite3 真执行）============
S_THEMES = {
    0: theme(
        "SQL 是声明式语言：你说“要什么”，数据库决定“怎么拿”——理解关系模型（表/行/列/键）与 NULL 的特殊行为，是一切查询的地基。",
        "表像 Excel 但更严格：每列有类型、每行靠主键唯一、表与表用键连接——NULL 是“未知”而非 0 或空串。",
        """import sqlite3
con = sqlite3.connect(":memory:")
con.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, city TEXT)")
con.executemany("INSERT INTO users VALUES (?,?,?)",
                [(1, "甲", "BJ"), (2, "乙", None), (3, "丙", "SH")])
print(con.execute("SELECT * FROM users WHERE city IS NULL").fetchall())
print(con.execute("SELECT COUNT(*), COUNT(city) FROM users").fetchone())
con.close()""",
        "city IS NULL 查出乙；COUNT(*)=3 而 COUNT(city)=2（NULL 不计入）",
        "用 = NULL 判空（永远 UNKNOWN）；NULL 参与算术传播；把 NULL 排序位置当理所当然（各库不同）。",
        "1. NULL=空字符串——语义完全不同；\n2. NOT IN 子查询含 NULL 会全空——三值逻辑陷阱；\n3. 主键=业务编号——主键是不可变的行身份。",
        "- **向前**：无前置；\n- **向后**：l-2-2 的 IS NULL 过滤实战；\n- **平行**：Pandas 的 NaN 处理（l-3-1）。",
        "| 结论 | 内容 |\n| --- | --- |\n| 关系模型 | 表/行/列/主键/外键 |\n| NULL | 未知，用 IS NULL 判，不计 COUNT(col) |\n| 声明式 | 说 what，不管 how |"),
    1: theme(
        "WHERE 是从“全表”到“目标子集”的漏斗入口：比较、逻辑、IN/BETWEEN/LIKE 的组合覆盖 90% 的筛选需求。",
        "WHERE 像海关安检：每条记录过一道闸（条件），全过才放行——AND 是串联闸、OR 是并联闸。",
        """import sqlite3
con = sqlite3.connect(":memory:")
con.executemany("INSERT INTO t VALUES (?,?,?)",
                [(1,"A",90),(2,"B",70),(3,"A",55),(4,"C",88)])
con.execute("CREATE TABLE t (id INT, grp TEXT, score INT)")
rows = con.execute("SELECT id, grp, score FROM t WHERE grp IN ('A','C') AND score > 60 ORDER BY score DESC").fetchall()
print(rows)
con.close()""",
        "[(1, 'A', 90), (4, 'C', 88)]（IN+AND+ORDER BY 组合）",
        "WHERE 里用聚合函数（要用 HAVING）；LIKE 忘转义 % _；OR 与 AND 优先级不加括号。",
        "1. WHERE 与 HAVING 等价可换——执行顺序与语义不同；\n2. NULL 参与 WHERE 比较按 False 处理——是 UNKNOWN，需 IS NULL 补；\n3. ORDER BY 决定显示顺序保证结果稳定——无序表分页会抖。",
        "- **向前**：l1-5 的三值逻辑是 WHERE 的语义底；\n- **向后**：l3-1 聚合前必先筛对子集；\n- **平行**：Pandas 布尔筛选。",
        "| 结论 | 内容 |\n| --- | --- |\n| WHERE | 行级过滤，先于聚合 |\n| 运算 | IN/BETWEEN/LIKE+转义 |\n| 顺序 | AND 优先于 OR，括号显式化 |"),
    2: theme(
        "聚合把明细压缩成指标：COUNT/DISTINCT/SUM 的三种写法差异与 GROUP BY 分组规则，是“从明细到指标”的最后一公里。",
        "GROUP BY 像“按部门装订”：装订后每个部门只剩一本册子（一行），册子里只能放“全部门的汇总数”（聚合值），不能放个人成绩（非聚合列）。",
        """import sqlite3
con = sqlite3.connect(":memory:")
con.execute("CREATE TABLE orders (uid INT, amt INT)")
con.executemany("INSERT INTO orders VALUES (?,?)",
                [(1,100),(1,200),(2,50),(3,300)])
print(con.execute(
    "SELECT uid, COUNT(*) n, SUM(amt) s FROM orders GROUP BY uid ORDER BY s DESC"
).fetchall())
print(con.execute("SELECT COUNT(DISTINCT uid) FROM orders").fetchone())
con.close()""",
        "按 uid 分组：1→(2,300)、2→(1,50)、3→(1,300)；COUNT(DISTINCT uid)=3",
        "SELECT 非聚合列不在 GROUP BY 里（SQLite 宽松但语义错）；COUNT(*) 与 COUNT(col) 混用；HAVING 里写索引列条件（应放 WHERE）。",
        "1. GROUP BY 后可以随便 SELECT——只能选分组键与聚合值；\n2. HAVING=WHERE——前者过滤分组后者过滤行；\n3. DISTINCT 便宜——大表上 DISTINCT 是排序/哈希开销。",
        "- **向前**：l-2 的 WHERE 决定进入聚合的行；\n- **向后**：l-4 连接后聚合是指标常态；\n- **平行**：Pandas groupby（l-5-1）。",
        "| 结论 | 内容 |\n| --- | --- |\n| 聚合 | COUNT(*) vs COUNT(col) vs COUNT(DISTINCT) |\n| 分组 | SELECT 只准分组键+聚合值 |\n| 过滤 | 行用 WHERE，组用 HAVING |"),
    3: theme(
        "JOIN 把两表按键缝合——行数会不会放大、条件写 ON 还是 WHERE，是 JOIN 的两大生死题。",
        "INNER JOIN 是交集、LEFT JOIN 保左表——想象左手名单去右手找搭档：LEFT 保住没搭档的左手（NULL），INNER 直接丢弃。",
        """import sqlite3
con = sqlite3.connect(":memory:")
con.executemany("INSERT INTO u VALUES (?,?)", [(1,"甲"),(2,"乙"),(3,"丙")])
con.execute("CREATE TABLE u (id INT, name TEXT)")
con.executemany("INSERT INTO o VALUES (?,?)", [(1,100),(1,80),(2,50)])
con.execute("CREATE TABLE o (uid INT, amt INT)")
print(con.execute("SELECT u.name, SUM(o.amt) FROM u LEFT JOIN o ON u.id=o.uid GROUP BY u.id").fetchall())
con.close()""",
        "甲 180、乙 50、丙 NULL（LEFT 保住无订单的丙）",
        "LEFT JOIN 后用 WHERE 右表条件（等于变 INNER）；连接键重复导致行数放大；把过滤条件写错位置（ON vs WHERE 语义在 LEFT 下不同）。",
        "1. JOIN 就该 1:1——键重复时笛卡尔放大，先查唯一性；\n2. 反连接要 NOT EXISTS 或 LEFT JOIN+IS NULL；\n3. 多表 JOIN 顺序无所谓——优化器会重排，但写清晰仍有价值。",
        "- **向前**：l-3 聚合在连接后的宽表上进行；\n- **向后**：l-5 CTE 把多步 JOIN 组织成可读管道；\n- **平行**：Pandas merge 的 how 四种。",
        "| 结论 | 内容 |\n| --- | --- |\n| INNER | 交集，匹配才留 |\n| LEFT | 保左表，右表 NULL 填充 |\n| 陷阱 | 键重复放大 + ON/WHERE 位置 |"),
    4: theme(
        "子查询/CTE/窗口函数是 SQL 的“进阶三件套”：CTE 让逻辑分步可读，窗口函数在不折叠行的前提下做排名/累计/环比——SQL 表达力的跃迁。",
        "窗口函数像给每行配一个“本地计算器”：GROUP BY 把行折叠成组，窗口函数保留每行、只在旁边附加组内计算结果（排名/移动平均）。",
        """import sqlite3
con = sqlite3.connect(":memory:")
con.executemany("INSERT INTO s VALUES (?,?)", [("A",80),("A",95),("B",70),("B",88)])
con.execute("CREATE TABLE s (grp TEXT, score INT)")
print(con.execute(
    "SELECT grp, score, RANK() OVER (PARTITION BY grp ORDER BY score DESC) rk "
    "FROM s").fetchall())
con.close()""",
        "A 组内 95→rk1、80→rk2；B 组内 88→rk1、70→rk2（分组排名不折叠行）",
        "窗口函数用在 WHERE 里（窗口在 WHERE 后执行，需子查询/CTE 再过滤）；PARTITION BY 忘写全表排名；ROW_NUMBER 与 RANK 混用（并列处理不同）。",
        "1. 窗口函数=GROUP BY——前者保行、后者折叠；\n2. ROW_NUMBER 与 RANK 可互换——并列名次行为不同；\n3. CTE 只是别名——递归 CTE 能做循环才做的遍历。",
        "- **向前**：l-3 聚合是窗口的“折叠版”对照；\n- **向后**：l-6 复杂查询的组织；\n- **平行**：Pandas 的 groupby+transform。",
        "| 结论 | 内容 |\n| --- | --- |\n| 窗口 | OVER(PARTITION BY ... ORDER BY ...) |\n| CTE | WITH 命名分步，可递归 |\n| 用途 | 排名/环比/累计/组内 TopN |"),
    5: theme(
        "查询优化从“读执行计划”开始：索引让查找从全表扫描变树查找；写法层面（列裁剪、过滤下推、分页方式）同样数量级影响。",
        "索引像书的目录：按目录找章节是 O(log n)，翻全书是 O(n)——但目录太多会拖慢写入（每写一行更新所有目录）。",
        """import sqlite3, time
con = sqlite3.connect(":memory:")
con.execute("CREATE TABLE t (id INT, v INT)")
con.executemany("INSERT INTO t VALUES (?,?)", [(i, i%100) for i in range(200000)])
con.execute("CREATE INDEX idx_v ON t(v)")
import math
plan = con.execute("EXPLAIN QUERY PLAN SELECT * FROM t WHERE v=99").fetchall()
print(plan)
print("Indexed lookup:", con.execute("SELECT COUNT(*) FROM t WHERE v=99").fetchone())
con.close()""",
        "plan 显示 SEARCH t USING COVERING INDEX idx_v（非 SCAN）；Indexed lookup 返回 2000 行",
        "给低基数列建单列索引（性别只有两值，索引选择性差）；SELECT *（列裁剪丢失覆盖索引机会）；大偏移 LIMIT 分页（用 keyset/游标分页）。",
        "1. 索引越多越好——写放大与存储代价；\n2. 优化器永远最优——统计信息过期会选错计划；\n3. 子查询一定慢——现代优化器常可改写。",
        "- **向前**：l-5 的复杂查询是优化对象；\n- **向后**：大数据引擎的分区/裁剪思想同源；\n- **平行**：量化回测的“先过滤再计算”下推思想。",
        "| 结论 | 内容 |\n| --- | --- |\n| 索引 | 目录 O(log n)，写入有代价 |\n| EXPLAIN | 读计划：SEARCH vs SCAN |\n| 写法 | 列裁剪 + 过滤下推 + keyset 分页 |"),
}
S_GOALS = {
    "sql-l-1-1": "1. 说出关系模型四要素与主键作用；\n2. 用外键描述两表关系；\n3. 区分业务编号与主键。",
    "sql-l-1-2": "1. 区分 DDL/DML/DCL；\n2. 说出常见类型的适用场景；\n3. 理解类型对存储与比较的影响。",
    "sql-l-1-3": "1. 用 SELECT 取列与别名；\n2. 正确使用注释；\n3. 解释 NULL 在查询中的行为。",
    "sql-l-1-4": "1. 写出 SQL 逻辑执行顺序；\n2. 解释为什么 WHERE 不能用别名；\n3. 按执行顺序排查常见报错。",
    "sql-l-1-5": "1. 写出 AND/OR/NOT 的三值真值表；\n2. 解释 NOT IN 含 NULL 全空的机理；\n3. 用 IS NULL / COALESCE 处理空值。",
    "sql-l-2-1": "1. 组合比较与逻辑运算完成筛选；\n2. 用括号显式化优先级；\n3. 避免 NULL 参与比较的三值陷阱。",
    "sql-l-2-2": "1. 用 IN/BETWEEN 替代冗长 OR；\n2. 用 LIKE 配通配符与转义；\n3. 用 IS NULL 精确处理缺失。",
    "sql-l-2-3": "1. 用 DISTINCT 去重并理解其代价；\n2. 用 ORDER BY+LIMIT 分页；\n3. 用 CASE WHEN 实现行内分支。",
    "sql-l-3-1": "1. 区分 COUNT 三种写法；\n2. 解释聚合对 NULL 的跳过规则；\n3. 在含 NULL 数据上验证计数结果。",
    "sql-l-3-2": "1. 用 GROUP BY 分组并写 HAVING 过滤；\n2. 遵守“SELECT 只含分组键+聚合值”；\n3. 排查分组后行数异常。",
    "sql-l-3-3": "1. 把业务指标写成聚合查询；\n2. 处理时间窗与去重口径；\n3. 用口径表对齐跨团队数字。",
    "sql-l-3-4": "1. 预判 SUM/AVG/COUNT 的 NULL 行为；\n2. 用 COALESCE 固化默认值；\n3. 验证聚合结果的 NULL 完整性。",
    "sql-l-4-1": "1. 写出 INNER/LEFT/RIGHT/FULL 四种连接并预测行数；\n2. 解释 LEFT JOIN 的 NULL 填充；\n3. 用 LEFT JOIN 完成反连接。",
    "sql-l-4-2": "1. 诊断键重复导致的行数放大；\n2. 用 NOT EXISTS 做安全反连接；\n3. 用 UNION/INTERSECT 组合结果集。",
    "sql-l-4-6": "1. 区分条件写 ON 与 WHERE 的语义差异；\n2. 排查“LEFT JOIN 变 INNER”的事故；\n3. 用行数守恒检查连接正确性。",
    "sql-l-5-1": "1. 写标量/相关/派生表三种子查询；\n2. 判断相关子查询的执行代价；\n3. 把复杂子查询改写为 JOIN。",
    "sql-l-5-2": "1. 用 WITH 拆解多步逻辑；\n2. 复用 CTE 减少重复代码；\n3. 说明 CTE 的可读性与优化权衡。",
    "sql-l-5-3": "1. 用 RANK/ROW_NUMBER/DENSE_RANK 排名；\n2. 用 SUM OVER 做累计；\n3. 用 LAG 做环比。",
    "sql-l-5-4": "1. 用窗口函数取每组 TopN；\n2. 计算组内同环比；\n3. 区分 ROW_NUMBER 与 RANK 的并列行为。",
    "sql-l-6-1": "1. 读 EXPLAIN QUERY PLAN 的输出；\n2. 区分 SEARCH（索引）与 SCAN（全表）；\n3. 为高频查询列建合适索引。",
    "sql-l-6-2": "1. 用列裁剪减少 IO；\n2. 把过滤条件下推到子查询；\n3. 用 keyset 分页替代大 OFFSET。",
    "sql-l-6-3": "1. 用一条 SQL 组合多表出报表；\n2. 校验报表口径与明细一致；\n3. 为报表查询补索引。",
    "sql-l-6-4": "1. 系统性完成索引与计划复查；\n2. 量化优化前后的耗时对比；\n3. 沉淀查询优化 checklist。",
}
S_PREREQ = {
    0: "- 无前置；Excel 表格直觉即可。", 1: "- 关系模型与 NULL（l1-1/1-5）。", 2: "- WHERE 筛选（l2-1）。",
    3: "- 聚合（l3-1/3-2）与主键唯一性。", 4: "- JOIN（l4-1）与聚合（l3）。", 5: "- 全部前置章（l1–l5）。",
}
apply("sql", S_THEMES, S_GOALS, S_PREREQ)
print("sql done")
