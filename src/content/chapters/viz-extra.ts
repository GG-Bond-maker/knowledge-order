import type { Exercise, Lesson } from '../../types';

/* ============================================================
 *  数据可视化课程扩展包：补充知识点与分级练习
 *
 *  环境限制：浏览器 Pyodide 只提供 numpy / pandas / matplotlib（无 seaborn）。
 *  编程题必须能在其中运行；tests 通过断言 fig/axes 属性或变量 out 判分。
 *  难度：第 1 章 1~2 为主；第 2 章 2~3；第 3 章 3~4。
 * ============================================================ */

export const vizExtra: {
  chapterId: string;
  lessons?: Lesson[];
  exercises: Exercise[];
}[] = [
  /* ============================================================
   *  第 1 章：可视化原则与 Matplotlib 基础（扩展 16 题）
   * ============================================================ */
  {
    chapterId: 'viz-1-1',
    lessons: [
      {
        id: 'viz-l-1-4',
        title: 'Matplotlib 的三层结构与常用设置',
        content: `
### 学习目标

学完本节，你应该能够：
1. 复述三层结构与常用设置入口；
2. 区分 rcParams 全局与局部参数；
3. 用保存参数保证导出清晰度。

### 前置知识

- 无前置；数据分析课 EDA 直觉加分。

### 问题背景

可视化的目的不是“好看”，而是把认知负担降到最低——图表类型选错，再精致也是误导。Matplotlib 的三层结构（Figure/Axes/Artist）是所有定制的入口。

### 直觉理解

Figure 是画布、Axes 是坐标系、Artist 是每个笔画——理解三层后，“调标题、改颜色、加注释”都不再是背参数，而是知道改哪一层。

### 核心概念与原理详解

## 三层结构：Figure / Axes / Artist

理解这三层是使用 Matplotlib 的关键：

| 层级 | 含义 | 类比 |
| --- | --- | --- |
| **Figure** | 整张画布（可以包含多个图） | 一张纸 |
| **Axes** | 一个具体的绘图区域（含坐标轴、刻度、标题） | 纸上的一个坐标系 |
| **Artist** | 画在 Axes 上的所有元素（线、点、文字、图例） | 坐标系里的内容 |

\`\`\`python
import matplotlib.pyplot as plt

fig, ax = plt.subplots(figsize=(8, 4))   # 一张画布 + 一个坐标系
ax.plot(x, y)                             # 在坐标系上画线
ax.set_title("销售额趋势")                 # 设置标题
fig.savefig("chart.png", dpi=150)         # 保存整张画布
\`\`\`

## 两种绘图风格

**pyplot 风格**（快速、简单）：

\`\`\`python
plt.plot(x, y)
plt.title("标题")
plt.show()
\`\`\`

**面向对象风格**（推荐，可复用）：

\`\`\`python
fig, ax = plt.subplots()
ax.plot(x, y)
ax.set_title("标题")
\`\`\`

> **建议**：简单探索用 pyplot；需要多子图、精细控制、封装成函数时用面向对象风格。

## 常用设置速查

| 目的 | 写法 |
| --- | --- |
| 画布尺寸 | \`plt.subplots(figsize=(8, 4))\` |
| 标题（含字号） | \`ax.set_title("标题", fontsize=14)\` |
| 轴标签 | \`ax.set_xlabel("月份")\` / \`ax.set_ylabel("金额")\` |
| 轴范围 | \`ax.set_xlim(0, 12)\` / \`ax.set_ylim(0, 100)\` |
| 网格 | \`ax.grid(True, alpha=0.3)\` |
| 图例 | \`ax.legend(loc="upper right")\` |
| 刻度旋转 | \`ax.tick_params(axis="x", rotation=45)\` |
| 去掉上右边框 | \`ax.spines["top"].set_visible(False)\` |
| 保存 | \`fig.savefig("a.png", dpi=150, bbox_inches="tight")\` |

## 多子图的两种写法

\`\`\`python
# 规则网格
fig, axes = plt.subplots(2, 2, figsize=(10, 6))
axes[0, 0].plot(x, y)

# 不规则布局
fig = plt.figure(figsize=(10, 6))
ax1 = fig.add_subplot(2, 1, 1)
ax2 = fig.add_subplot(2, 2, 3)
ax3 = fig.add_subplot(2, 2, 4)
\`\`\`

注意：\`plt.subplots(1, 2)\` 且只有一行时，\`axes\` 是一维数组；
\`plt.subplots(2, 1)\` 也是；\`plt.subplots(2, 2)\` 才是二维。

## 中文字体问题

Matplotlib 默认字体不含中文，会显示成方块。解决方案：

\`\`\`python
plt.rcParams["font.sans-serif"] = ["SimHei", "Microsoft YaHei", "DejaVu Sans"]
plt.rcParams["axes.unicode_minus"] = False   # 修复负号显示
\`\`\`

> **在浏览器 Pyodide 环境中**通常没有中文字体，中文会显示为方块。
> 这是环境限制而非代码错误；实用做法是用英文标签，或接受方块显示。

<ChartTypeDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程（可逐行对照上方概念）：

### 代码实践

\`\`\`python
# Matplotlib 思想的纯 Python 模拟: 图表选型决策器
def pick_chart(goal, n_vars, n_points=100):
    if goal == "趋势" and n_vars == 1: return "折线图"
    if goal == "比较" and n_vars <= 5: return "柱状图"
    if goal == "构成" and n_vars <= 5: return "饼图/堆叠柱"
    if goal == "关系" and n_vars == 2: return "散点图"
    if goal == "分布" and n_points > 30: return "直方图/箱线图"
    return "需要进一步拆解需求"
for g, nv in [("趋势",1), ("比较",4), ("构成",4), ("关系",2), ("分布",1)]:
    print(g, "->", pick_chart(g, nv))
\`\`\`

预期输出（实测）：趋势→折线图、比较→柱状图、构成→饼图/堆叠柱、关系→散点图、分布→直方图/箱线图

**常见错误**：饼图超过 5 类还在用（人眼难比角度）；双 y 轴硬凑相关（误导）；3D 图遮数据。

### 常见误区

1. 图越花越专业——Data-Ink 比率原则：去无意义装饰；
2. 颜色只为美观——颜色承载语义（分类/连续/发散）；
3. 双 y 轴好用——两轴刻度操纵极易误导。

### 知识关联

- **向前**：数据分析课的 EDA 是图表需求来源；
- **向后**：l-2-1 折线/柱状等具体图型；
- **平行**：论文图表的规范与商业 dashboard。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 选型 | 按 goal（趋势/比较/构成/关系/分布） |
| 三层结构 | Figure→Axes→Artist |
| 原则 | Data-Ink 优先，颜色有语义 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 pandas 官方文档 pandas.pydata.org 相应章节）
`,
        tips: [
          {
            kind: 'pitfall',
            text: '`plt.subplots(1, 2)` 返回的 `axes` 是一维数组，用 `axes[0]`；而 `plt.subplots(2, 2)` 返回二维数组，要用 `axes[0, 0]`。混用会报 `IndexError`。',
          },
          {
            kind: 'leak',
            text: '养成 `fig, ax = plt.subplots()` 的写法，比全局 `plt.plot()` 更容易封装成函数、更适合多子图。',
          },
          {
            kind: 'note',
            text: '`bbox_inches="tight"` 会裁掉多余留白，`dpi=150` 让导出图片更清晰（用于报告/PPT）。',
          },
        ],
        demos: [
          {
            title: '面向对象风格的完整图表',
            lang: 'python',
            code: `import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
sales = [120, 150, 130, 180, 210, 195]

fig, ax = plt.subplots(figsize=(8, 4))
ax.plot(months, sales, marker="o", linewidth=2, color="#2f6bff", label="Sales")
ax.set_title("Monthly Sales Trend", fontsize=14)
ax.set_xlabel("Month")
ax.set_ylabel("Sales (k)")
ax.grid(True, alpha=0.3, linestyle="--")
ax.legend(loc="upper left")
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)
plt.show()
print("图表已生成")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'viz-1-x1',
        type: 'single',
        difficulty: 1,
        question: '在 Matplotlib 的三层结构中，`Axes` 指的是？',
        options: [
          { value: 'A', text: '整张画布' },
          { value: 'B', text: '一个具体的绘图区域（含坐标轴、标题）' },
          { value: 'C', text: '画布上的线条对象' },
          { value: 'D', text: '图例' },
        ],
        answer: 'B',
        explanation:
          'Figure 是画布，Axes 是画布上的一个坐标系（一个 Figure 可以有多个 Axes），Artist 是画上去的元素（线、点、文字、图例）。',
        tags: ['结构'],
      },
      {
        id: 'viz-1-x2',
        type: 'judge',
        difficulty: 1,
        question: '一个 Figure 只能包含一个 Axes。',
        answer: false,
        explanation:
          '一个 Figure 可以包含多个 Axes（这就是多子图）。`plt.subplots(2, 2)` 创建了含 4 个 Axes 的 Figure。',
        tags: ['结构'],
      },
      {
        id: 'viz-1-x3',
        type: 'multiple',
        difficulty: 2,
        question: '下列哪些设置可以让图表更易读、更专业？（多选）',
        options: [
          { value: 'A', text: '去掉顶部和右侧的边框线（spines）' },
          { value: 'B', text: '添加淡色虚线网格辅助读数' },
          { value: 'C', text: '在每根柱子上都标注数值标签（即使有 200 根柱子）' },
          { value: 'D', text: '标题写结论而不是变量名' },
        ],
        answer: ['A', 'B', 'D'],
        explanation:
          '数据标签在类别数少时有用，但 200 根柱子全标数字会变成"数据墨水"噪音，降低可读性。C 过犹不及。',
        tags: ['可读性'],
      },
      {
        id: 'viz-1-x4',
        type: 'fill',
        difficulty: 2,
        question: '创建一个 1 行 2 列的子图布局，补全代码：\n\nfig, axes = plt.___(1, 2, figsize=(8, 3))',
        blanks: [['subplots', 'subplot_mosaic']],
        explanation: '`plt.subplots(行数, 列数)` 一次创建画布与多个坐标系，返回 (fig, axes)。',
        tags: ['子图'],
      },
      {
        id: 'viz-1-x5',
        type: 'single',
        difficulty: 2,
        question: '`plt.subplots(1, 2)` 返回的 `axes` 是什么结构？',
        options: [
          { value: 'A', text: '单个 Axes 对象' },
          { value: 'B', text: '一维数组，用 `axes[0]`、`axes[1]` 访问' },
          { value: 'C', text: '二维数组，用 `axes[0, 0]` 访问' },
          { value: 'D', text: '字典' },
        ],
        answer: 'B',
        explanation:
          '只有一行或一列时返回一维数组；行列都大于 1 时返回二维数组。这是初学者最容易混淆的地方。',
        tags: ['子图'],
      },
      {
        id: 'viz-1-x6',
        type: 'code',
        difficulty: 2,
        question:
          '创建一张标题为 `Sales` 的简单折线图：给定 `months` 与 `sales`，绘制折线并将标题设为 `Sales`，最后以 `ax.get_title()` 作为表达式返回。',
        starterCode: `import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

months = ["Jan", "Feb", "Mar", "Apr"]
sales = [120, 150, 130, 180]

fig, ax = plt.subplots(figsize=(6, 3))
# 在这里绘图并设置标题
___`,
        setupCode: '',
        expectedOutput: 'Sales',
        tests: `assert fig is not None, "fig 不应为 None"
assert len(fig.axes) == 1, "应有且只有 1 个子图"
assert out == "Sales", f"标题应为 Sales，当前为 {out}"
assert len(ax.lines) == 1, "应有一条折线"
`,
        answer: `ax.plot(months, sales, marker="o")\nax.set_title("Sales")\nax.get_title()`,
        explanation:
          '`ax.plot()` 画线，`ax.set_title()` 设标题，`ax.get_title()` 读取标题。用面向对象风格便于后续扩展成多子图。',
        tags: ['折线图', '标题'],
      },
      {
        id: 'viz-1-x7',
        type: 'code',
        difficulty: 2,
        question:
          '给图表添加坐标轴标签：给定 `x`、`y`，在 `ax` 上绘图，设置 x 轴标签为 `Month`、y 轴标签为 `Sales`，最后返回 y 轴标签 `ax.get_ylabel()`。',
        starterCode: `import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

x = [1, 2, 3, 4]
y = [10, 20, 15, 25]

fig, ax = plt.subplots(figsize=(6, 3))
___`,
        setupCode: '',
        expectedOutput: 'Sales',
        tests: `assert out == "Sales", f"y 轴标签应为 Sales，当前为 {out}"
assert ax.get_xlabel() == "Month", f"x 轴标签应为 Month，当前为 {ax.get_xlabel()}"
assert len(ax.lines) == 1, "应有一条折线"
`,
        answer: `ax.plot(x, y)\nax.set_xlabel("Month")\nax.set_ylabel("Sales")\nax.get_ylabel()`,
        explanation: '`set_xlabel` / `set_ylabel` 设置标签，`get_xlabel` / `get_ylabel` 读取。轴标签是图表可读性的基本要求。',
        tags: ['标签'],
      },
      {
        id: 'viz-1-x8',
        type: 'judge',
        difficulty: 2,
        question: '`figsize=(8, 4)` 中的单位是像素。',
        answer: false,
        explanation:
          '`figsize` 的单位是**英寸**（inch）。实际像素 = figsize × dpi。例如 `figsize=(8,4)` 且 `dpi=100` 时，图片为 800×400 像素。',
        tags: ['figsize'],
      },
      {
        id: 'viz-1-x9',
        type: 'fill',
        difficulty: 2,
        question: '保存图片时指定分辨率以提高清晰度，补全参数：\n\nfig.___("chart.png", dpi=150, bbox_inches="tight")',
        blanks: [['savefig']],
        explanation: '`fig.savefig()` 是面向对象风格的保存方式；`plt.savefig()` 也能用，但要注意必须在 `plt.show()` 之前调用。',
        tags: ['保存'],
      },
      {
        id: 'viz-1-x10',
        type: 'single',
        difficulty: 3,
        question: '为什么 `plt.savefig()` 必须在 `plt.show()` 之前调用？',
        options: [
          { value: 'A', text: '没有原因，顺序随意' },
          { value: 'B', text: '`show()` 之后图形可能被清空，保存出来是空白图' },
          { value: 'C', text: '`savefig` 会自动调用 show' },
          { value: 'D', text: '`savefig` 只能保存最后一张图' },
        ],
        answer: 'B',
        explanation:
          '在某些后端（尤其是交互式后端）中，`show()` 关闭后 Figure 会被释放，之后 `savefig` 得到空白图片。养成"先保存再显示"的习惯。',
        tags: ['保存'],
      },
      {
        id: 'viz-1-x11',
        type: 'multiple',
        difficulty: 2,
        question: '关于 `pyplot` 风格与面向对象风格，下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: '`plt.plot()` 会作用于"当前 Axes"' },
          { value: 'B', text: '面向对象风格更适合封装成函数复用' },
          { value: 'C', text: '多子图场景下，面向对象风格更清晰' },
          { value: 'D', text: '两者不能混用' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          '两者可以混用（例如 `plt.figure()` 之后用 `ax.plot()`），但混用容易造成"画到了错误的坐标系"这类问题（D 错误）。',
        tags: ['风格'],
      },
      {
        id: 'viz-1-x12',
        type: 'code',
        difficulty: 3,
        question:
          '创建 2 行 1 列的子图：上图用 `plot` 画 `y1`，下图用 `bar` 画 `y2`，并以下图柱子的数量 `len(axes[1].patches)` 作为表达式返回（应为 4）。',
        starterCode: `import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

labels = ["A", "B", "C", "D"]
y1 = [10, 20, 15, 25]
y2 = [5, 8, 3, 6]

fig, axes = plt.subplots(2, 1, figsize=(6, 5))
___`,
        setupCode: '',
        expectedOutput: '4',
        tests: `assert len(fig.axes) == 2, "应有 2 个子图"
assert out == 4, f"应有 4 根柱子，当前为 {out}"
assert len(axes[0].lines) == 1, "上图应有一条折线"
assert len(axes[1].patches) == 4, "下图应有 4 个矩形柱子"
`,
        answer: `axes[0].plot(labels, y1)\naxes[1].bar(labels, y2)\nlen(axes[1].patches)`,
        explanation:
          '两步：`axes[0]` 画折线、`axes[1]` 画柱状图。`patches` 保存了柱状图的矩形对象，数量等于柱子数——这是断言柱状图的常用方式。',
        tags: ['子图', '柱状图'],
      },
      {
        id: 'viz-1-x13',
        type: 'open',
        difficulty: 3,
        question: '有一张图表，标题写的是"月度销售额"，图中有 8 条颜色相近的折线、没有图例、y 轴从 120 开始。请指出它的问题并说明改进方向。',
        referenceAnswer: `**存在的问题**：

1. **标题只描述变量、不含结论**：读者看不出"想表达什么"。应改成结论型标题，
   如"华东区 4 月销售额环比下滑 12%"。
2. **8 条折线难以区分**：颜色相近 + 太多系列 = 蜘蛛网。
   改进：拆成多个小图（分面），或只高亮重点 2~3 条、其余灰化，
   或改用"瀑布图/热力图"表达多维度。
3. **没有图例**：读者无法对应颜色与系列。
4. **y 轴不从 0 开始且未标注**：折线图 y 轴不一定从 0 起，
   但若想表达"绝对量"应从 0 开始；若想突出变化，需在标题或注释中说明"截断坐标轴"，
   否则造成夸大差异的误导。
5. **缺少单位与数据来源**：y 轴未标单位（万元？件？），无数据来源与时间范围。

**改进方向**：

- 标题写结论，副标题写口径与时间范围；
- 系列 ≤ 4 条，超出则分面或高亮；
- 加图例、标单位、注明坐标轴是否截断；
- 用配色区分且保证色盲友好（避免红/绿同时出现）；
- 关键点加注释（如"大促"、"系统故障"）。`,
        rubric: [
          { point: '指出标题应写成结论而非变量名', score: 2 },
          { point: '指出系列过多/颜色相近应分面或高亮', score: 2 },
          { point: '指出缺少图例、单位、数据来源', score: 1 },
          { point: '说明截断 y 轴需注明以免误导', score: 1 },
        ],
        keywords: ['标题', '结论', '图例', '分面', '截断', '单位', '误导'],
        explanation:
          '这是"图表评审"类问题。回答时按"信息传达是否清晰、是否可能误导"两个维度展开即可。',
        tags: ['图表评审'],
      },
      {
        id: 'viz-1-x14',
        type: 'single',
        difficulty: 2,
        question: 'Matplotlib 中 `ax.set_xlim(0, 10)` 的作用是？',
        options: [
          { value: 'A', text: '设置 x 轴标题' },
          { value: 'B', text: '设置 x 轴的显示范围' },
          { value: 'C', text: '旋转 x 轴标签' },
          { value: 'D', text: '设置 x 轴刻度间隔' },
        ],
        answer: 'B',
        explanation: '`set_xlim` 设定坐标轴范围；刻度间隔要用 `set_xticks` 或 `MultipleLocator`。',
        tags: ['坐标轴'],
      },
      {
        id: 'viz-1-x15',
        type: 'judge',
        difficulty: 3,
        question: '柱状图的 y 轴必须从 0 开始，否则会夸大差异。',
        answer: true,
        explanation:
          '柱子通过**长度**表达数值，截断会导致长度比例失真（例如从 100 到 60 的微小差异被画成巨大落差）。折线图表达趋势，截断相对可接受，但也应标注说明。',
        tags: ['误导'],
      },
      {
        id: 'viz-1-x16',
        type: 'code',
        difficulty: 3,
        question:
          '**图表美化**：给定 `ax`（已画好一条线），请完成三件事：① 设置网格（`grid`）；② 隐藏顶部与右侧边框；③ 返回顶部边框是否可见（应为 False）。',
        starterCode: `import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

fig, ax = plt.subplots(figsize=(6, 3))
ax.plot([1, 2, 3], [2, 4, 3])

# 1) 打开网格
# 2) 隐藏上/右 spines
# 3) 返回上边框可见性
___`,
        setupCode: '',
        expectedOutput: 'False',
        tests: `assert out == False, f"顶部边框应不可见，当前返回 {out}"
assert ax.spines["top"].get_visible() is False, "顶部边框应为不可见"
assert ax.spines["right"].get_visible() is False, "右侧边框应为不可见"
`,
        answer: `ax.grid(True, alpha=0.3)\nax.spines["top"].set_visible(False)\nax.spines["right"].set_visible(False)\nax.spines["top"].get_visible()`,
        explanation:
          '去掉上右边框是现代图表规范做法（减少"数据墨水"）。`ax.spines["top"]` 返回 Spine 对象，`set_visible(False)` 隐藏它。',
        tags: ['美化'],
      },
    ],
  },

  /* ============================================================
   *  第 2 章：常用基础图表（扩展 16 题）
   * ============================================================ */
  {
    chapterId: 'viz-2-1',
    lessons: [
      {
        id: 'viz-l-2-4',
        title: '分布类图表：直方图、箱线图与密度图',
        content: `
### 学习目标

学完本节，你应该能够：
1. 对比直方/箱线/密度的适用场景；
2. 处理多组分布对比（并排箱线/山脊）；
3. 识别分布图的坐标陷阱。

### 前置知识

- Matplotlib 三层结构（l-1-2）。

### 问题背景

折线/柱状/直方/散点四大家族覆盖 80% 分析需求——每种图回答一个固定问题，选型即明确“要回答什么”。

### 直觉理解

折线看趋势（x 有序）、柱状比大小（类别离散）、直方看分布（连续分箱）、散点看关系（两连续变量）——别拿柱状图画时间趋势（缺中间点）。

### 核心概念与原理详解

## 分布图回答什么问题

"这个指标长什么样？"——分布图是 EDA 的第一站。

| 图 | 回答的问题 | 关键参数 |
| --- | --- | --- |
| 直方图 | 数据集中在哪个区间？是否双峰？ | \`bins\`（分箱数） |
| 箱线图 | 中位数、四分位、离群点在哪？ | \`whis\`（异常值范围） |
| 密度图 | 分布形状是否对称/偏态？ | 带宽（平滑程度） |

## 直方图的 bins 陷阱

\`\`\`python
ax.hist(data, bins=20)      # 20 个等宽区间
\`\`\`

**bins 的选择会显著改变图形外观**：

- bins 太小（如 3~5）：看不出形状，信息被抹平；
- bins 太大（如 200）：噪声被放大，看起来"到处都是峰"；
- 经验：样本量的平方根，或 20~50 之间尝试。

**重要**：直方图的柱子**必须等宽且相邻**（这才能反映连续分布）。
不等宽的柱子应使用条形图并显式说明。

## 箱线图怎么读

\`\`\`
    |----[  |  ]----|        o
    ↑     ↑  ↑   ↑          ↑
   最小值  Q1 中位数 Q3      离群点
\`\`\`

- 箱体 = Q1 到 Q3（占 50% 数据）；
- 中间线 = 中位数（不是平均值！）；
- 须 = 到 1.5 × IQR 范围内的最远点；
- 圆点 = 超出范围的**离群点**。

**箱线图的价值**：一眼看出"中位数、离散程度、偏态、离群点"四件事。

## 直方图 + 中位数标注的正确姿势

\`\`\`python
ax.hist(data, bins=30, edgecolor="white")
med = np.median(data)
ax.axvline(med, color="red", linestyle="--", label=f"median={med:.1f}")
ax.legend()
\`\`\`

## 为什么"平均值的柱状图"会骗人

假设两个城市的平均客单价都是 100 元：

- A 市：所有人都买 100 元左右（集中）；
- B 市：一半人买 20 元、一半人买 180 元（双峰）。

平均值相同，但业务策略完全不同。**分布图能暴露这种差异**，柱状图不能。

这就是"只看平均数不看分布"的经典陷阱。

<FatTailDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程（可逐行对照上方概念）：

### 代码实践

\`\`\`python
import random
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
    print(f"{bins[i]:3d}-{bins[i+1]:3d}: {'#'*int(cnt/3)} {cnt}")
\`\`\`

预期输出（实测）：各箱 ASCII 直方条，峰值在 45–65 区间（正态 N(50,15) 的预期形态）

**常见错误**：直方图 bin 数随手设（太多噪声/太少糊死，Sturges/FD 规则起步）；柱状图 y 轴不从 0（柱高误导）；折线图 x 轴等距但时间不等距。

### 常见误区

1. 饼图适合多类比较——超过 3 类换条形图；
2. 双 y 轴省空间——误导风险大于收益；
3. 3D 炫酷——遮挡与透视失真。

### 知识关联

- **向前**：l-1-1 的选型决策器已定图型；
- **向后**：l-3 Seaborn 把“统计图+拟合”打包；
- **平行**：论文图表规范（ Nature/期刊风格）。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 折线 | 有序 x 的趋势 |
| 柱状 | 类别比较，y 从 0 起 |
| 直方 | 连续分布，bin 数有讲究 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 pandas 官方文档 pandas.pydata.org 相应章节）
`,
        tips: [
          {
            kind: 'pitfall',
            text: '直方图的 `bins` 参数会显著改变结论：bins 过少看不出分布形状，过多则噪声掩盖规律。建议试几组 bins 对比。',
          },
          {
            kind: 'pitfall',
            text: '箱线图中间的线是**中位数**不是平均值。描述偏态数据时中位数比平均值更有代表性。',
          },
          {
            kind: 'leak',
            text: '汇报"平均值"时，同时给一张分布图（直方图或箱线图），能让平均数陷阱无所遁形。',
          },
        ],
        demos: [
          {
            title: '直方图 + 中位数 + 均值标注',
            lang: 'python',
            code: `import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

rng = np.random.default_rng(42)
data = np.concatenate([rng.normal(100, 15, 800), rng.normal(180, 10, 200)])

fig, ax = plt.subplots(figsize=(7, 3.5))
ax.hist(data, bins=40, color="#4facfe", edgecolor="white", alpha=0.85)
ax.axvline(np.median(data), color="red", linestyle="--", linewidth=2, label=f"Median {np.median(data):.1f}")
ax.axvline(np.mean(data), color="orange", linestyle=":", linewidth=2, label=f"Mean {np.mean(data):.1f}")
ax.set_title("Distribution with Mean vs Median")
ax.set_xlabel("Order Amount")
ax.set_ylabel("Count")
ax.legend()
plt.show()

print(f"中位数 {np.median(data):.1f}，均值 {np.mean(data):.1f}")
print("分布右偏时，均值被长尾拉高，中位数更稳健")`,
        },
        ],
      },
    ],
    exercises: [
      {
        id: 'viz-2-x1',
        type: 'single',
        difficulty: 1,
        question: '展示"订单金额的分布情况"，最合适的图表是？',
        options: [
          { value: 'A', text: '折线图' },
          { value: 'B', text: '直方图' },
          { value: 'C', text: '饼图' },
          { value: 'D', text: '散点图' },
        ],
        answer: 'B',
        explanation: '直方图专门用于展示连续数值的分布形态（集中趋势、偏态、多峰）。折线适合趋势、饼图适合构成、散点适合两变量关系。',
        tags: ['图表选择'],
      },
      {
        id: 'viz-2-x2',
        type: 'judge',
        difficulty: 2,
        question: '箱线图中间的那条线代表数据的平均值。',
        answer: false,
        explanation:
          '是**中位数**（Q2）。箱体上下边是 Q3 和 Q1，须延伸到 1.5×IQR 范围内的最远点，之外的点是离群点。',
        tags: ['箱线图'],
      },
      {
        id: 'viz-2-x3',
        type: 'multiple',
        difficulty: 2,
        question: '关于直方图的 `bins` 参数，下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: 'bins 越小，柱子越少、越平滑' },
          { value: 'B', text: 'bins 过大会把随机噪声放大成"峰"' },
          { value: 'C', text: 'bins 的选择不影响对分布的判断' },
          { value: 'D', text: '可以多试几组 bins 对比效果' },
        ],
        answer: ['A', 'B', 'D'],
        explanation:
          'bins 会显著影响图形外观与结论（C 错误）。A、B、D 正确——bins 过少丢失信息，过多放大噪声。',
        tags: ['直方图'],
      },
      {
        id: 'viz-2-x4',
        type: 'fill',
        difficulty: 2,
        question: '在直方图上标注中位数位置（一条垂直虚线），补全代码：\n\nax.___(np.median(data), color="red", linestyle="--")',
        blanks: [['axvline']],
        explanation: '`axvline` 画竖直线（标注纵轴方向的值）；`axhline` 画水平线。常用于标注阈值、均值、中位数。',
        tags: ['直方图', '标注'],
      },
      {
        id: 'viz-2-x5',
        type: 'code',
        difficulty: 2,
        question:
          '绘制直方图：给定 `data`，在 `ax` 上画 20 个分箱的直方图，返回柱子的数量 `len(ax.patches)`（应为 20）。',
        starterCode: `import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

rng = np.random.default_rng(0)
data = rng.normal(50, 10, 500)

fig, ax = plt.subplots(figsize=(6, 3))
___`,
        setupCode: '',
        expectedOutput: '20',
        tests: `assert out == 20, f"应有 20 个柱子，当前为 {out}"
assert len(ax.patches) == 20, "hist 的刻度数应等于 bins 数"
`,
        answer: `ax.hist(data, bins=20)\nlen(ax.patches)`,
        explanation: '`ax.hist(data, bins=20)` 绘制直方图，每个分箱生成一个矩形 Patch，因此 `len(ax.patches) == 20`。',
        tags: ['直方图'],
      },
      {
        id: 'viz-2-x6',
        type: 'single',
        difficulty: 2,
        question: '比较"不同品类销售额"的大小，最合适的图表是？',
        options: [
          { value: 'A', text: '柱状图 / 条形图' },
          { value: 'B', text: '饼图' },
          { value: 'C', text: '散点图' },
          { value: 'D', text: '直方图' },
        ],
        answer: 'A',
        explanation:
          '类别比较用柱状图/条形图。类别名较长或数量多时用横向条形图（排序后），更易阅读。',
        tags: ['图表选择'],
      },
      {
        id: 'viz-2-x7',
        type: 'judge',
        difficulty: 2,
        question: '饼图适合展示 20 个类别的构成占比。',
        answer: false,
        explanation:
          '饼图在类别数 > 5 时极难比较扇区角度，且不宜展示趋势。类别多时应用排序条形图或堆叠条形图。饼图只适合"少数类别、差异明显"的构成展示。',
        tags: ['饼图'],
      },
      {
        id: 'viz-2-x8',
        type: 'code',
        difficulty: 2,
        question:
          '绘制柱状图：给定 `categories` 与 `values`，用 `ax.bar()` 绘制，并返回柱子的数量（应为 4）。',
        starterCode: `import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

categories = ["Digital", "Clothing", "Home", "Food"]
values = [1200, 800, 600, 400]

fig, ax = plt.subplots(figsize=(6, 3))
___`,
        setupCode: '',
        expectedOutput: '4',
        tests: `assert out == 4, f"应有 4 根柱子，当前为 {out}"
assert len(ax.patches) == 4, "bar 应生成 4 个矩形"
`,
        answer: `ax.bar(categories, values)\nlen(ax.patches)`,
        explanation: '`ax.bar(x, height)` 画竖直柱状图；`ax.barh` 画水平条形图（类别名长时更好读）。',
        tags: ['柱状图'],
      },
      {
        id: 'viz-2-x9',
        type: 'single',
        difficulty: 3,
        question: '两个城市平均客单价相同，但一个集中、一个双峰。想暴露这种差异，应该看？',
        options: [
          { value: 'A', text: '平均值柱状图' },
          { value: 'B', text: '分布图（直方图或箱线图）' },
          { value: 'C', text: '饼图' },
          { value: 'D', text: '折线图' },
        ],
        answer: 'B',
        explanation:
          '平均值会掩盖分布差异。直方图或箱线图能一眼看出集中/双峰/离群点，这是"只看平均数"陷阱的解药。',
        tags: ['分布', '陷阱'],
      },
      {
        id: 'viz-2-x10',
        type: 'fill',
        difficulty: 3,
        question: '绘制箱线图，补全方法名：\n\nax.___(data, vert=True)',
        blanks: [['boxplot', 'bxp']],
        explanation: '`ax.boxplot(data)` 绘制箱线图；新版更推荐 `ax.bxp`（需要先算统计量）或 pandas 的 `df.boxplot()`。',
        tags: ['箱线图'],
      },
      {
        id: 'viz-2-x11',
        type: 'code',
        difficulty: 3,
        question:
          '绘制箱线图并统计离群点：给定 `data`（含离群点），用 `ax.boxplot(data)` 绘制，返回离群点数量（通过 `ax.boxplot` 返回的字典中 `fliers` 的长度获取）。',
        starterCode: `import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

rng = np.random.default_rng(1)
data = np.concatenate([rng.normal(100, 10, 200), [200, 210, 220]])

fig, ax = plt.subplots(figsize=(5, 3.5))
# 1) 画箱线图，把返回的字典保存到 bp
# 2) 返回离群点数量
___`,
        setupCode: '',
        expectedOutput: '3',
        tests: `assert out >= 3, f"应至少有 3 个离群点，当前为 {out}"
assert len(ax.lines) > 0 or len(ax.patches) > 0, "箱线图应绘制出图形元素"
`,
        answer: `bp = ax.boxplot(data)\nlen(bp["fliers"][0].get_ydata())`,
        explanation:
          '`ax.boxplot()` 返回字典，`bp["fliers"]` 是离群点的 Line2D 列表，`get_ydata()` 取出它们的值。这是断言箱线图离群点的标准方法。',
        tags: ['箱线图'],
      },
      {
        id: 'viz-2-x12',
        type: 'multiple',
        difficulty: 3,
        question: '下列哪些是"只展示平均值"可能造成的误导？（多选）',
        options: [
          { value: 'A', text: '掩盖了双峰分布' },
          { value: 'B', text: '掩盖了极少数超级大客户的影响' },
          { value: 'C', text: '让不同规模的分组看起来一样' },
          { value: 'D', text: '使图表颜色不好看' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 与数据表达无关。A、B、C 都是"只看均值"的经典陷阱，解决方法是同时给出分布、分位数或箱线图。',
        tags: ['陷阱'],
      },
      {
        id: 'viz-2-x13',
        type: 'open',
        difficulty: 3,
        question: '请为以下三个业务问题各选一种图表，并说明理由：① 近 12 个月销售额趋势；② 各品类销售额占比；③ 客单价与复购次数的关系。',
        referenceAnswer: `**① 近 12 个月销售额趋势 → 折线图**

理由：时间序列强调"连续变化"，折线图的 x 轴是连续时间，能直观表达趋势、拐点与季节性。
注意：12 个月（类别较少）也可用柱状图，但折线更能体现"连续性"。

**② 各品类销售额占比 → 堆叠条形图（或排序条形图 + 百分比标签）**

理由：饼图只适合 3~5 个类别、差异明显的场景；品类往往有 5~10 个，
排序后的水平条形图更容易比较，且能同时展示绝对额。
若只有 4 个品类且差异明显，饼图也可接受，但要标注百分比。

**③ 客单价与复购次数的关系 → 散点图**

理由：散点图用于展示两个连续变量的关系（是否正相关、是否有离群点、是否非线性）。
可以叠加趋势线；若点数过多，可用透明度（alpha）或密度图（hexbin）避免过度重叠。

**通用原则**：
- 比较大小用条形/柱状；
- 看时间趋势用折线；
- 看分布用直方图/箱线图；
- 看两变量关系用散点图；
- 看构成用堆叠条形（慎用饼图）。`,
        rubric: [
          { point: '趋势题选折线图并说明"连续时间"的理由', score: 2 },
          { point: '占比题选堆叠条形/排序条形，并说明饼图的局限', score: 2 },
          { point: '关系题选散点图并说明可叠加趋势线或处理重叠', score: 2 },
        ],
        keywords: ['折线', '条形', '散点', '饼图', '趋势', '占比', '关系'],
        explanation:
          '"图表选择"是可视化最基础也最常考的能力。答题时"图 + 理由"缺一不可。',
        tags: ['图表选择'],
      },
      {
        id: 'viz-2-x14',
        type: 'judge',
        difficulty: 3,
        question: '堆叠柱状图适合比较各类别的绝对大小，也适合精确比较每个分项。',
        answer: false,
        explanation:
          '堆叠柱状图中除最底层外的分项**基线不平**（起点不统一），很难精确比较。精确比较分项应改用分组柱状图或分面图。',
        tags: ['堆叠'],
      },
      {
        id: 'viz-2-x15',
        type: 'code',
        difficulty: 3,
        question:
          '**多系列折线图**：给定两条时间序列 `y1`、`y2`，在同一坐标系画两条线并添加图例，返回折线条数（应为 2）。',
        starterCode: `import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

months = ["Jan", "Feb", "Mar", "Apr", "May"]
y1 = [100, 120, 110, 150, 170]
y2 = [80, 85, 95, 90, 105]

fig, ax = plt.subplots(figsize=(7, 3.5))
___`,
        setupCode: '',
        expectedOutput: '2',
        tests: `assert out == 2, f"应有 2 条折线，当前为 {out}"
assert len(ax.lines) == 2, "应绘制 2 条线"
assert len(ax.get_legend().get_texts()) == 2, "图例应有 2 项"
`,
        answer: `ax.plot(months, y1, marker="o", label="2023")\nax.plot(months, y2, marker="s", label="2024")\nax.legend()\nlen(ax.lines)`,
        explanation:
          '每次 `ax.plot()` 都会新增一条 Line2D。传 `label=` 后再调用 `ax.legend()` 才会显示图例；也可以用 `ax.legend(["2023","2024"])` 手动指定。',
        tags: ['折线图', '图例'],
      },
      {
        id: 'viz-2-x16',
        type: 'single',
        difficulty: 2,
        question: '类别名称很长（如"华东区域-上海市-浦东新区"）且有 10 个类别，最适合的图表是？',
        options: [
          { value: 'A', text: '竖向柱状图' },
          { value: 'B', text: '横向条形图（按数值排序）' },
          { value: 'C', text: '饼图' },
          { value: 'D', text: '散点图' },
        ],
        answer: 'B',
        explanation:
          '横向条形图让长类别名水平排列，不用旋转文字；排序后还能一眼看出高低次序。',
        tags: ['条形图'],
      },
    ],
  },

  /* ============================================================
   *  第 3 章：统计图形与多变量（扩展 14 题）
   * ============================================================ */
  {
    chapterId: 'viz-3-1',
    lessons: [
      {
        id: 'viz-l-3-4',
        title: '多变量可视化：颜色、大小与分面',
        content: `
### 学习目标

学完本节，你应该能够：
1. 组合多编码通道并保持可读；
2. 用分面完成“同轴可比”的多群体对比；
3. 按受众精简最终版图表。

### 前置知识

- 基础图型（l-2 家族）；相关系数（stats l6-6）。

### 问题背景

单图讲单变量，业务问题常是多变量：颜色编码第三维、分面（facet）拆群体、热力图表达矩阵——Seaborn 的价值是把“统计图+统计变换”打包。

### 直觉理解

分面像把一张大图按群体复印多份小图（同轴可比）；热力图像给表格上色——颜色深浅即数值大小。

### 核心概念与原理详解

## 超过两个变量的可视化策略

二维图只能直接表达 x、y 两个变量。要表达更多维度，有四种编码方式：

| 编码 | 适用 | 限制 |
| --- | --- | --- |
| **颜色（色相）** | 离散类别（≤6~8 类） | 类别多时难以区分 |
| **大小** | 连续数值（如销售额） | 面积感知不精确 |
| **形状/标记** | 离散类别（≤4 类） | 形状差异难记忆 |
| **分面（小多图）** | 类别数多 | 占用空间大 |

## 颜色编码的三条原则

1. **离散类别用定性色板**（如 tab10），不同类别用明显不同的色相；
2. **连续数值用顺序色板**（浅→深），不要用彩虹色；
3. **有正负/中心时用发散色板**（红-白-蓝）。

**色盲友好**：避免红绿对比（红绿色盲很常见），改用蓝橙组合。

\`\`\`python
scatter = ax.scatter(x, y, c=values, s=sizes, cmap="viridis", alpha=0.7)
fig.colorbar(scatter, ax=ax, label="Sales")
\`\`\`

## 气泡图：用大小编码第三个变量

\`\`\`python
ax.scatter(x, y, s=z * 10, alpha=0.6)   # s 是面积，不是半径
\`\`\`

**注意**：\`s\` 是**面积**参数。若想让"视觉直径"与数值成正比，需要对 s 取平方根缩放，
否则观众会严重高估大数值的差距。

## 热力图：相关矩阵的标准画法

\`\`\`python
import numpy as np
corr = df.corr()
im = ax.imshow(corr, cmap="RdBu_r", vmin=-1, vmax=1)
ax.set_xticks(range(len(corr))); ax.set_xticklabels(corr.columns, rotation=45)
ax.set_yticks(range(len(corr))); ax.set_yticklabels(corr.columns)
fig.colorbar(im, ax=ax)
\`\`\`

要点：
- \`vmin=-1, vmax=1\` 让颜色与相关系数一一对应；
- 发散色板 \`RdBu_r\` 让正相关偏红、负相关偏蓝；
- 单元格中标注数值（\`ax.text\`）能提高可读性。

## 分面（small multiples）

类别多时，与其把所有类别塞进一张图，不如拆成多个小图并共享坐标轴：

\`\`\`python
fig, axes = plt.subplots(1, 3, sharey=True, figsize=(12, 3.5))
for ax, cat in zip(axes, ["A", "B", "C"]):
    sub = df[df.category == cat]
    ax.scatter(sub.x, sub.y)
    ax.set_title(cat)
\`\`\`

\`sharey=True\` 让各子图 y 轴刻度一致，方便横向对比——这是分面图的关键。

<ChartTypeDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程（可逐行对照上方概念）：

### 代码实践

\`\`\`python
# 热力图思想: 相关矩阵的纯 python 表达
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
print("矩阵读法: 颜色越深/条越长=相关越强")
\`\`\`

预期输出（实测）：a-b r≈+0.55（构造的真相关）、a-c/b-c r≈±0.1（噪声）——条形长短即热力图深浅

**常见错误**：相关矩阵只画线性相关（非线性关系会漏）；分面共享 y 轴与否不声明；配色用彩虹色板（感知失真，用 virialis 类）。

### 常见误区

1. 图形重叠越多信息越大——过绘（overplotting）需透明度/抽样；
2. 热力图=表格美化——聚类排序后才显结构；
3. 分面是花活——多群体比较的分面是最诚实工具。

### 知识关联

- **向前**：l-2 家族图型的多变量扩展；
- **向后**：仪表盘与商业图表；
- **平行**：量化课的相关矩阵热力图。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 多变量 | 颜色/大小/分面编码第三四维 |
| 热力图 | 矩阵上色，聚类后更有信息 |
| 纪律 | 色板感知均匀，防过绘 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 pandas 官方文档 pandas.pydata.org 相应章节）
`,
        tips: [
          {
            kind: 'pitfall',
            text: '气泡图的 `s` 参数是面积而不是半径。若想让视觉大小与数值成正比，需要按平方根缩放，否则会夸大差距。',
          },
          {
            kind: 'pitfall',
            text: '热力图一定要固定 `vmin`/`vmax`，否则不同图之间的颜色无法比较，颜色会"说谎"。',
          },
          {
            kind: 'leak',
            text: '类别超过 8 个时不要靠颜色区分，改用分面小图或直接标注，可读性会好得多。',
          },
        ],
        demos: [
          {
            title: '气泡图 + 颜色编码',
            lang: 'python',
            code: `import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

rng = np.random.default_rng(3)
n = 40
price = rng.uniform(50, 500, n)
qty = rng.uniform(10, 200, n)
sales = price * qty / 100
ad_spend = rng.uniform(1, 20, n)

fig, ax = plt.subplots(figsize=(6, 4))
sc = ax.scatter(price, qty, s=ad_spend * 30, c=sales, cmap="viridis", alpha=0.75, edgecolors="white", linewidths=0.6)
fig.colorbar(sc, ax=ax, label="Sales")
ax.set_xlabel("Price")
ax.set_ylabel("Quantity")
ax.set_title("Bubble Chart: Price vs Quantity (size=Ad Spend, color=Sales)")
plt.show()
print("气泡图已生成：横轴价格、纵轴销量、大小代表广告费、颜色代表销售额")`,
        },
        ],
      },
    ],
    exercises: [
      {
        id: 'viz-3-x1',
        type: 'single',
        difficulty: 1,
        question: '展示"两个连续变量之间的关系"，最合适的图表是？',
        options: [
          { value: 'A', text: '散点图' },
          { value: 'B', text: '饼图' },
          { value: 'C', text: '直方图' },
          { value: 'D', text: '折线图' },
        ],
        answer: 'A',
        explanation: '散点图专门表达两变量关系（相关性、离群点、非线性）。可叠加趋势线或按类别着色。',
        tags: ['散点图'],
      },
      {
        id: 'viz-3-x2',
        type: 'judge',
        difficulty: 2,
        question: '气泡图中 `s` 参数控制的是点的半径。',
        answer: false,
        explanation:
          '`s` 是**面积**（点大小的单位为 points²）。若希望视觉半径与数值成正比，需要对数值开平方再传给 s。',
        tags: ['气泡图'],
      },
      {
        id: 'viz-3-x3',
        type: 'multiple',
        difficulty: 2,
        question: '画热力图展示相关系数矩阵时，哪些做法是合理的？（多选）',
        options: [
          { value: 'A', text: '设置 `vmin=-1, vmax=1` 让颜色与相关系数对应' },
          { value: 'B', text: '使用发散色板（如 RdBu_r）' },
          { value: 'C', text: '用彩虹色板展示正负相关' },
          { value: 'D', text: '在单元格内标注数值' },
        ],
        answer: ['A', 'B', 'D'],
        explanation:
          '彩虹色板（jet）没有"正负中心"的语义，且色盲不友好，不适合相关系数。A、B、D 都是标准做法。',
        tags: ['热力图'],
      },
      {
        id: 'viz-3-x4',
        type: 'fill',
        difficulty: 2,
        question: '给散点图按第三个变量着色，补全代码：\n\nax.scatter(x, y, c=values, ___="viridis")',
        blanks: [['cmap']],
        explanation: '`cmap` 指定颜色映射；配合 `fig.colorbar()` 显示颜色图例，规范做法。',
        tags: ['散点图'],
      },
      {
        id: 'viz-3-x5',
        type: 'code',
        difficulty: 2,
        question:
          '绘制散点图：给定 `x`、`y`，用 `ax.scatter()` 绘制，返回点的数量（通过 `len(ax.collections[0].get_offsets())` 获取，应为 6）。',
        starterCode: `import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

x = [1, 2, 3, 4, 5, 6]
y = [2, 5, 3, 6, 4, 7]

fig, ax = plt.subplots(figsize=(5, 4))
___`,
        setupCode: '',
        expectedOutput: '6',
        tests: `assert out == 6, f"应有 6 个点，当前为 {out}"
assert len(ax.collections) == 1, "应有 1 个散点集合"
`,
        answer: `ax.scatter(x, y)\nlen(ax.collections[0].get_offsets())`,
        explanation:
          '散点图在 Matplotlib 中是 PathCollection 对象，保存在 `ax.collections`，点的坐标通过 `get_offsets()` 获取。',
        tags: ['散点图'],
      },
      {
        id: 'viz-3-x6',
        type: 'single',
        difficulty: 3,
        question: '类别数超过 8 个时，最合适的可视化策略是？',
        options: [
          { value: 'A', text: '继续用 8 种以上的颜色区分' },
          { value: 'B', text: '改用分面小图（small multiples）' },
          { value: 'C', text: '把所有类别合并成一个' },
          { value: 'D', text: '改用饼图' },
        ],
        answer: 'B',
        explanation:
          '人类能可靠区分的颜色大约 6~8 种。类别多时用分面小图（每个类别一张、共享坐标轴）或直接标注，可读性显著提升。',
        tags: ['多变量'],
      },
      {
        id: 'viz-3-x7',
        type: 'judge',
        difficulty: 3,
        question: '相关系数矩阵热力图使用彩虹色板（jet）是最佳选择。',
        answer: false,
        explanation:
          '彩虹色板缺乏感知均匀性、色盲不友好、且没有"中心"语义。相关系数应使用发散色板（如 RdBu_r）并固定 vmin=-1、vmax=1。',
        tags: ['配色'],
      },
      {
        id: 'viz-3-x8',
        type: 'code',
        difficulty: 3,
        question:
          '绘制相关系数热力图：给定 `df`（3 个数值列），计算相关系数矩阵并用 `ax.imshow()` 绘制（固定 vmin=-1、vmax=1），返回矩阵的形状元组。',
        starterCode: `import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

df = pd.DataFrame({
    "price": [10, 20, 30, 40, 50],
    "qty": [50, 40, 35, 20, 10],
    "sales": [100, 300, 500, 800, 1000],
})

fig, ax = plt.subplots(figsize=(5, 4))
# 1) 计算相关系数矩阵 corr
# 2) 用 imshow 绘制，固定 vmin/vmax
# 3) 返回 corr.shape
___`,
        setupCode: '',
        expectedOutput: '(3, 3)',
        tests: `assert out == (3, 3), f"相关矩阵形状应为 (3,3)，当前为 {out}"
assert len(ax.images) == 1, "应有一张图像"
assert ax.images[0].get_clim()[0] == -1 and ax.images[0].get_clim()[1] == 1, "色阶范围应为 [-1, 1]"
`,
        answer: `corr = df.corr()\nim = ax.imshow(corr, cmap="RdBu_r", vmin=-1, vmax=1)\ncorr.shape`,
        explanation:
          '`df.corr()` 得到 3×3 相关矩阵；`imshow` 将其渲染为图像；`vmin/vmax` 固定为 -1/1 保证颜色与相关系数一一对应。',
        tags: ['热力图'],
      },
      {
        id: 'viz-3-x9',
        type: 'single',
        difficulty: 3,
        question: '分面图（small multiples）中设置 `sharey=True` 的作用是？',
        options: [
          { value: 'A', text: '让所有子图共享 x 轴标签' },
          { value: 'B', text: '让各子图 y 轴刻度一致，便于横向比较' },
          { value: 'C', text: '隐藏 y 轴' },
          { value: 'D', text: '自动调整子图数量' },
        ],
        answer: 'B',
        explanation:
          '共享坐标轴刻度是分面图的核心价值：不同子图的可视高度可直接比较。若各子图自动缩放，视觉大小会误导。',
        tags: ['分面'],
      },
      {
        id: 'viz-3-x10',
        type: 'fill',
        difficulty: 3,
        question: '为散点图的颜色添加颜色条（colorbar），补全代码：\n\nfig.___(sc, ax=ax, label="Sales")',
        blanks: [['colorbar']],
        explanation: '`colorbar` 把颜色映射关系可视化，是展示"颜色代表什么"的标准做法，必须配合 `cmap` 使用。',
        tags: ['配色'],
      },
      {
        id: 'viz-3-x11',
        type: 'code',
        difficulty: 3,
        question:
          '**分面图**：给定 `df`（含 `group` 列，取值 A/B/C 与 x、y 列），为每个 group 画一张散点图（1 行 3 列、共享 y 轴），并返回子图数量（应为 3）。',
        starterCode: `import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd

df = pd.DataFrame({
    "group": ["A", "A", "B", "B", "C", "C"],
    "x": [1, 2, 1, 3, 2, 4],
    "y": [2, 3, 1, 4, 3, 5],
})

fig, axes = plt.subplots(1, 3, sharey=True, figsize=(10, 3))
# 循环为每个 group 画散点
___`,
        setupCode: '',
        expectedOutput: '3',
        tests: `assert out == 3, f"应有 3 个子图，当前为 {out}"
assert len(fig.axes) == 3, "Figure 应有 3 个 Axes"
assert all(len(a.collections) == 1 for a in axes), "每个子图应有一组散点"
assert fig.axes[0].get_shared_y_axes().joined(fig.axes[1], fig.axes[2]), "y 轴应共享"
`,
        answer: `for ax, g in zip(axes, ["A", "B", "C"]):\n    sub = df[df["group"] == g]\n    ax.scatter(sub["x"], sub["y"])\n    ax.set_title(g)\nlen(fig.axes)`,
        explanation:
          '`zip(axes, groups)` 把子图与类别配对；`sharey=True` 让对比更直观。这是"类别多时优于多色散点"的推荐做法。',
        tags: ['分面', '散点图'],
      },
      {
        id: 'viz-3-x12',
        type: 'multiple',
        difficulty: 3,
        question: '关于配色，下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: '离散类别用定性色板，连续数值用顺序色板' },
          { value: 'B', text: '应避免红绿对比，考虑色盲用户' },
          { value: 'C', text: '颜色数量越多，信息传达越充分' },
          { value: 'D', text: '有正负中心时用发散色板' },
        ],
        answer: ['A', 'B', 'D'],
        explanation:
          '颜色过多会增加认知负担，且人眼最多可靠区分 6~8 种色相（C 错误）。A、B、D 都是配色基本原则。',
        tags: ['配色'],
      },
      {
        id: 'viz-3-x13',
        type: 'judge',
        difficulty: 3,
        question: '散点图点很多时，重叠会掩盖密度信息，可以用透明度（alpha）缓解。',
        answer: true,
        explanation:
          '大量重叠点会让"很密"和"中等密"看起来一样。`alpha` 半透明后叠加区域颜色更深，能反映密度；更严谨可用 `hexbin` 或二维密度图。',
        tags: ['散点图'],
      },
      {
        id: 'viz-3-x14',
        type: 'open',
        difficulty: 4,
        question: '某分析师用气泡图展示"各品类的价格、销量与广告费"三者的关系，得出结论"广告费越高销量越高"。请指出这种可视化可能存在的误导，以及如何验证。',
        referenceAnswer: `**可视化层面的潜在误导**：

1. **面积感知失真**：\`s\` 是面积，若直接把广告费线性映射到面积，
   观众会系统性高估大数值（人眼对面积判断不精确）。
   若用半径实际控制尺寸，差距会被平方放大。
2. **颜色与大小双编码混淆**：如果颜色也代表某个指标，
   读者可能把颜色差异误读为数值差异。
3. **价格与销量本身负相关**：价格高的品类销量天然低，
   气泡大小（广告费）可能只是"高客单价品类"的代理变量。

**统计层面的问题**：

1. **相关不等于因果**：广告费与销量可能是"共同原因"导致
   （如品类热度高 → 既投广告又多卖）。
2. **未控制混杂变量**：价格、品类、季节都没控制。
3. **样本点少**：气泡图每点一个品类，样本量小，结论脆弱。

**如何验证**：

1. 计算相关系数并给出置信区间；
2. 分品类内部看"广告费 vs 销量"，排除"品类差异"这个共同原因；
3. 做 AB 测试或倾向得分匹配，验证因果；
4. 改用分面散点图 + 趋势线，而不是气泡图，减少面积感知误差；
5. 汇报时明确写出"相关而非因果"的措辞。`,
        rubric: [
          { point: '指出气泡图面积感知失真', score: 1 },
          { point: '指出价格与销量的混入关系（代理变量）', score: 2 },
          { point: '指出相关不等于因果、缺控制变量', score: 2 },
          { point: '给出验证办法（分品类、相关系数、AB 测试）', score: 2 },
        ],
        keywords: ['面积', '感知', '混杂', '因果', '相关', '分品类', 'AB'],
        explanation:
          '这道题把"可视化误差"与"统计推断"结合起来，是数据分析面试中区分度很高的一类问题。',
        tags: ['误导', '因果'],
      },
    ],
  },
];
