import type { Exercise, Lesson } from '../../types';

/* ============================================================
 *  Excel 课程扩展包：补充知识点与分级练习
 *
 *  约定：正文行内公式/函数名一律用转义反引号 \`代码\`；
 *        公式与操作步骤放在普通字符串里，不出现反引号。
 *  难度：第 1~2 章 1~3 为主；第 3~5 章 2~4 为主，含少量 5。
 * ============================================================ */

export const excelExtra: {
  chapterId: string;
  lessons?: Lesson[];
  exercises: Exercise[];
}[] = [
  /* ============================================================
   *  第 1 章：基础操作（扩展 18 题）
   * ============================================================ */
  {
    chapterId: 'excel-1',
    lessons: [
      {
        id: 'excel-l-1-4',
        title: 'Excel 的数据类型与格式陷阱',
        content: `
## Excel 只有几种真实类型

表面上 Excel 有很多"格式"，但底层只有少数几种数据类型：

| 类型 | 说明 | 常见问题 |
| --- | --- | --- |
| 数字 | 可以进行算术运算 | 文本型数字无法求和 |
| 文本 | 一切字符 | 显示成数字却不是数字 |
| 日期 | 本质是**序列号** | 1900/1904 系统、显示成 45xxx |
| 逻辑值 | TRUE / FALSE | 参与运算时按 1 / 0 |
| 错误值 | #N/A、#VALUE! 等 | 会被 SUM 忽略或传染 |

**最重要的一条**：**日期在 Excel 里是数字**。
1900 日期系统中 2024-01-01 的序列号是 45292。
把单元格格式改成"常规"，日期就会显示成一串数字——这解释了为什么
"日期相减得到天数"能直接工作。

## 文本型数字：求和为 0 的头号元凶

常见来源：从系统导出、复制粘贴、前面有空格或单引号。

**诊断方法**：

1. 选中数据，看状态栏：如果显示"计数"而非"求和"，说明是文本；
2. 用 \`=ISNUMBER(A2)\` 判断，返回 FALSE 即为文本；
3. 数字默认**右对齐**，文本默认**左对齐**——这是最快的肉眼诊断。

**三种转换方法**：

| 方法 | 操作 | 适用 |
| --- | --- | --- |
| 分列 | 数据 → 分列 → 直接点完成 | 批量、最可靠 |
| 选择性粘贴 | 复制空白单元格 → 选择性粘贴"加" | 少量数据 |
| 公式 | \`=VALUE(A2)\` 或 \`=A2*1\` | 需要保留原列 |

## 日期被识别成文本

从系统导出的 \`2024/1/5\`、\`20240105\`、\`2024.1.5\` 经常被当作文本。
用 \`=DATEVALUE(A2)\` 或"分列 → 日期"可以转换。

**验证**：转换成功后单元格应右对齐，且 \`=ISNUMBER(A2)\` 返回 TRUE。

## 数字格式 vs 实际值

格式只是"显示方式"，不改值：

- \`0.256\` 设置为百分比格式后显示 \`26%\`，但实际值仍是 0.256；
- 用"减少小数位数"按钮只是改显示，**不四舍五入**；
- 真正取整要用 \`ROUND\`、\`INT\`、\`TRUNC\`。

> **结论**：做数据分析时，先在 Excel 里确认"值是数字还是文本"，
> 能避免后面一大半的异常。

## 科学计数法与长数字

订单号、身份证号超过 11 位会被显示为 \`1.23E+15\`，甚至**后几位直接变 0（不可逆丢失）**。
正确做法是导入时把该列设为"文本"，或先输入单引号 \`'\`。
`,
        tips: [
          {
            kind: 'pitfall',
            text: '文本型数字求和结果为 0 或只对部分生效。最快的判断方法是看对齐方式：数字右对齐、文本左对齐；或看状态栏显示"计数"还是"求和"。',
          },
          {
            kind: 'pitfall',
            text: '超过 11 位的编号（订单号、身份证）在 Excel 中可能被转成科学计数法并丢失精度，且无法恢复。导入前必须设为文本格式。',
          },
          {
            kind: 'leak',
            text: '处理系统导出的数据，第一步永远是"分列"一遍关键列，把文本型数字/日期统一转成正确类型。',
          },
        ],
        demos: [
          {
            title: '诊断数据类型的三步操作',
            lang: 'text',
            code: `步骤 1：选中金额列 → 看底部状态栏
  显示"求和：12345" → 是数字，正常
  只显示"计数：10"   → 全是文本，需要转换

步骤 2：在空白单元格输入 =ISNUMBER(B2)
  返回 TRUE  → 数字
  返回 FALSE → 文本

步骤 3：转换（任选一种）
  方式 A：选中整列 → 数据 → 分列 → 下一步 → 下一步 → 完成
  方式 B：在空白单元格输入 =VALUE(B2)，下拉，再复制 → 选择性粘贴为值

验证：转换后数字应右对齐，=ISNUMBER 返回 TRUE`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'excel-1-x1',
        type: 'single',
        difficulty: 1,
        question: '在 Excel 中，字符串 `"2024"` 与数字 `2024` 的主要区别是？',
        options: [
          { value: 'A', text: '没有区别' },
          { value: 'B', text: '字符串不能直接参与算术运算，且默认左对齐' },
          { value: 'C', text: '数字不能显示为文本' },
          { value: 'D', text: '字符串不能出现在公式中' },
        ],
        answer: 'B',
        explanation:
          '文本型数字默认左对齐、不能直接求和（`SUM` 会忽略或返回 0），但可以出现在公式的其它位置（如 `LEN("2024")`）。这是"求和为 0"最常见的原因。',
        tags: ['数据类型'],
      },
      {
        id: 'excel-1-x2',
        type: 'judge',
        difficulty: 1,
        question: '在 Excel 中，"数据格式全选为文本"和"关于数值类型的判断"是两回事。',
        answer: true,
        explanation:
          '单元格格式只是"显示与录入规则"的提示，不是强类型约束。即使设成文本格式，粘贴进去的数字仍可能被识别为数字；反之设成"常规"，文本也不会自动转成数字。',
        tags: ['格式'],
      },
      {
        id: 'excel-1-x3',
        type: 'multiple',
        difficulty: 2,
        question: '下列哪些操作可以把"文本型数字"转换为真正的数字？（多选）',
        options: [
          { value: 'A', text: '数据 → 分列 → 直接点完成' },
          { value: 'B', text: '在空白单元格输入 0 → 复制 → 选择性粘贴"加"' },
          { value: 'C', text: '用 `=VALUE(A2)` 转换后粘贴为值' },
          { value: 'D', text: '把单元格格式设置为"数值"' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 只改显示格式，不改值——文本仍然是文本。A、B、C 都能真正改变数据类型。',
        tags: ['类型转换'],
      },
      {
        id: 'excel-1-x4',
        type: 'fill',
        difficulty: 2,
        question: '判断单元格 A2 是否为数字，返回 TRUE 或 FALSE。补全函数名：\n\n=___(A2)',
        blanks: [['ISNUMBER', 'isnumber']],
        explanation: '`ISNUMBER(A2)` 返回 TRUE 表示是数字。同类函数还有 `ISTEXT`、`ISBLANK`、`ISERROR`、`ISNA`。',
        tags: ['函数'],
      },
      {
        id: 'excel-1-x5',
        type: 'single',
        difficulty: 2,
        question: '在 Excel 1900 日期系统中，日期 2024-01-01 的底层存储值是什么？',
        options: [
          { value: 'A', text: '字符串 "2024-01-01"' },
          { value: 'B', text: '数字 45292' },
          { value: 'C', text: '数字 20240101' },
          { value: 'D', text: '二进制日期对象' },
        ],
        answer: 'B',
        explanation:
          'Excel 把日期存为"从 1900-01-01 起的天数序列号"，2024-01-01 是 45292。这也是为什么"日期相减得天数"可以直接计算。',
        tags: ['日期'],
      },
      {
        id: 'excel-1-x6',
        type: 'judge',
        difficulty: 2,
        question: '在 Excel 中，日期相减（如 `=B2-A2`）可以直接得到两个日期相差的天数。',
        answer: true,
        explanation:
          '因为日期本质是序列号，相减即天数差。注意结果单元格的格式要设为"常规"或"数值"，否则可能显示成日期。',
        tags: ['日期'],
      },
      {
        id: 'excel-1-x7',
        type: 'multiple',
        difficulty: 2,
        question: '快速判断一列数据是否为"文本型数字"，可以用哪些方法？（多选）',
        options: [
          { value: 'A', text: '观察对齐方式：左对齐通常是文本' },
          { value: 'B', text: '选中后看状态栏：只显示"计数"不显示"求和"' },
          { value: 'C', text: '用 `=ISNUMBER()` 判断' },
          { value: 'D', text: '查看单元格的字体颜色' },
        ],
        answer: ['A', 'B', 'C'],
        explanation: 'D 与数据类型无关。A（对齐）、B（状态栏）、C（函数）都是诊断文本型数字的有效手段。',
        tags: ['诊断'],
      },
      {
        id: 'excel-1-x8',
        type: 'fill',
        difficulty: 3,
        question: '从系统导出的日期文本 `"2024/1/5"` 需要转成真正的日期值，可使用函数：\n\n=___(A2)',
        blanks: [['DATEVALUE', 'datevalue']],
        explanation: '`DATEVALUE` 把日期字符串转成序列号；\`TEXT\` 则是反向操作（把日期转成指定格式的文本）。另外"数据→分列→日期"也能批量转换。',
        tags: ['日期转换'],
      },
      {
        id: 'excel-1-x9',
        type: 'single',
        difficulty: 3,
        question: '单元格格式设为"百分比"、内容为 0.256 时，下列说法正确的是？',
        options: [
          { value: 'A', text: '单元格的值变成了 25.6' },
          { value: 'B', text: '显示为 26%，但实际值仍是 0.256' },
          { value: 'C', text: '值变成了 26%' },
          { value: 'D', text: '无法再参与计算' },
        ],
        answer: 'B',
        explanation:
          '格式只影响显示，不影响值与计算。用 `ROUND(0.256*100,0)` 才是真正把值改成 26。做对账时要注意"显示四舍五入"与"实际值"的区别。',
        tags: ['格式'],
      },
      {
        id: 'excel-1-x10',
        type: 'judge',
        difficulty: 2,
        question: '在 Excel 中，输入 `=1+1` 时，单元格会显示文本 `=1+1`。',
        answer: false,
        explanation:
          '以 `=` 开头的内容会被当作公式计算并显示结果 2。若要强制显示公式文本，需要先在单元格格式里设为"文本"，或输入前加单引号。',
        tags: ['公式'],
      },
      {
        id: 'excel-1-x11',
        type: 'multiple',
        difficulty: 3,
        question: '关于 Excel 的错误值，下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: '`#DIV/0!` 表示除数为 0' },
          { value: 'B', text: '`#N/A` 通常表示查找函数找不到匹配值' },
          { value: 'C', text: '`#VALUE!` 表示参数类型不正确' },
          { value: 'D', text: '`SUM` 函数遇到错误值会忽略并正常求和' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          '`SUM` 引用区域内若含错误值，会直接返回该错误（不会忽略），D 错误。要忽略错误，可用 \`AGGREGATE\` 或 \`IFERROR\`。',
        tags: ['错误值'],
      },
      {
        id: 'excel-1-x12',
        type: 'fill',
        difficulty: 2,
        question: '把公式的错误结果替换为自定义的提示，使用函数：\n\n=___(公式, "无数据")',
        blanks: [['IFERROR', 'iferror']],
        explanation: '`IFERROR(值, 值如果出错)` 在 Excel 2007+ 可用，`IFNA` 则只针对 `#N/A`。',
        tags: ['函数'],
      },
      {
        id: 'excel-1-x13',
        type: 'single',
        difficulty: 2,
        question: '在 Excel 中输入身份证号（18 位）时，最稳妥的做法是？',
        options: [
          { value: 'A', text: '直接输入' },
          { value: 'B', text: '先将单元格格式设为"文本"，再输入' },
          { value: 'C', text: '输入后把格式改成文本' },
          { value: 'D', text: '用科学计数法输入' },
        ],
        answer: 'B',
        explanation:
          '超过 11 位的数字会被转成科学计数法，第 15 位之后的数字直接变成 0 且不可恢复。必须先设文本格式（或输入单引号）再录入。',
        tags: ['数据录入'],
      },
      {
        id: 'excel-1-x14',
        type: 'judge',
        difficulty: 3,
        question: 'Excel 中的"减少小数位数"按钮是在对数值进行四舍五入并永久修改其值。',
        answer: false,
        explanation:
          '该按钮只改变显示格式，单元格的实际值不变。真正取整要用 `ROUND`、`ROUNDDOWN`、`INT` 等函数。',
        tags: ['格式'],
      },
      {
        id: 'excel-1-x15',
        type: 'open',
        difficulty: 3,
        question: '你拿到一份系统导出的销售表：日期列显示成 `45123` 之类的数字，金额列的求和结果为 0。请写出你的排查与处理步骤。',
        referenceAnswer: `**问题 1：日期显示成数字**

原因：单元格格式是"常规"，而日期实际存储为序列号。
处理：

1. 选中该列 → 右键"设置单元格格式" → 选"日期"；
2. 如果格式设了还是显示数字，说明内容其实是文本（如 "45123" 字符串），
   需要先"分列"或 \`=TEXT(A2,"yyyy-mm-dd")*1\` 转成数值再设日期格式；
3. 验证：转换后应右对齐且 \`=ISNUMBER(A2)\` 为 TRUE。

**问题 2：金额求和为 0**

原因：金额是文本型数字。
排查：

1. 选中金额列，看状态栏——若只有"计数"没有"求和"，确认是文本；
2. \`=ISNUMBER(B2)\` 返回 FALSE 即可证实。

处理（任选）：

- 选中整列 → 数据 → 分列 → 下一步 → 下一步 → 完成（最快最可靠）；
- 空白单元格输入 0 → 复制 → 选中金额列 → 选择性粘贴 → "加"；
- 加辅助列 \`=VALUE(B2)\` 或 \`=TRIM(B2)*1\`，复制后"选择性粘贴为值"。

**最后**：处理完建议用 \`SUM\` 与业务口径对账一次，确认金额总数合理。`,
        rubric: [
          { point: '指出日期是序列号，需改单元格格式为日期', score: 2 },
          { point: '指出金额是文本型数字，并给出至少一种转换方法', score: 2 },
          { point: '给出诊断方法（状态栏/ISNUMBER/对齐方式）', score: 1 },
          { point: '强调转换后要验证与对账', score: 1 },
        ],
        keywords: ['序列号', '格式', '文本型数字', '分列', 'ISNUMBER', '对账'],
        explanation:
          '这是真实工作中最高频的两个 Excel 数据问题。答题时把"诊断 → 转换 → 验证"讲清楚即可拿到高分。',
        tags: ['数据清理'],
      },
      {
        id: 'excel-1-x16',
        type: 'multiple',
        difficulty: 2,
        question: '建立一份"便于后续分析"的 Excel 数据表，应遵循哪些原则？（多选）',
        options: [
          { value: 'A', text: '第一行为表头，且表头唯一、不含合并单元格' },
          { value: 'B', text: '每列只放一种数据类型' },
          { value: 'C', text: '不使用合并单元格存储数据' },
          { value: 'D', text: '在数据中间插入小计行以便阅读' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          '小计行会破坏"一维表"结构，导致排序、筛选、透视表、公式全部出错（D 错误）。数据区应保持纯粹，小计放在独立的工作表或透视表中生成。',
        tags: ['数据规范'],
      },
      {
        id: 'excel-1-x17',
        type: 'fill',
        difficulty: 1,
        question: '想要冻结表头以便向下滚动时始终可见，操作路径为：视图 → 冻结窗格 → ___\n\n（选填最常用的选项名称）',
        blanks: [['冻结首行', '冻结拆分窗格']],
        explanation:
          '光标放在"表头下一行"再选"冻结窗格"，可以同时冻结表头与前几列（配合冻结首列）。"冻结首行"是最快捷的选项。',
        tags: ['视图'],
      },
      {
        id: 'excel-1-x18',
        type: 'single',
        difficulty: 1,
        question: '在 Excel 中，`$A$1` 这种引用方式称为？',
        options: [
          { value: 'A', text: '相对引用' },
          { value: 'B', text: '绝对引用' },
          { value: 'C', text: '混合引用' },
          { value: 'D', text: '外部引用' },
        ],
        answer: 'B',
        explanation:
          '行列都加 `$` 是绝对引用，复制公式时不会改变；`A1` 是相对引用；`$A1` 或 `A$1` 是混合引用（只锁定一个方向）。',
        tags: ['引用'],
      },
    ],
  },

  /* ============================================================
   *  第 2 章：查找引用与逻辑判断（扩展 18 题）
   * ============================================================ */
  {
    chapterId: 'excel-2',
    lessons: [
      {
        id: 'excel-l-2-5',
        title: '条件统计与数组公式：SUMIFS / SUMPRODUCT 进阶',
        content: `
## 多条件统计三件套

| 函数 | 用途 |
| --- | --- |
| \`SUMIFS\` | 多条件求和 |
| \`COUNTIFS\` | 多条件计数 |
| \`AVERAGEIFS\` | 多条件平均 |

语法（注意 SUMIFS 的顺序与 SUMIF 不同）：

\`\`\`
=SUMIFS(求和区域, 条件区域1, 条件1, 条件区域2, 条件2, ...)
=SUMIF(range, criteria, sum_range)          ← SUMIF 的顺序不一样！
\`\`\`

**这是最容易记错的地方**：\`SUMIF\` 是"条件在前、求和区在后"，
而 \`SUMIFS\` 是"求和区在前、条件在后"。写混会导致结果完全错误。

## 条件的写法

| 需求 | 写法 |
| --- | --- |
| 等于某值 | \`"北京"\` |
| 大于某值 | \`">100"\` |
| 介于区间 | 两个条件：\`">=100"\`、\`"<=200"\` |
| 不等于 | \`"<>北京"\` |
| 包含某文本 | \`"*关键字*"\` |
| 引用单元格 | \`">="&F2\`（注意用 & 拼接） |
| 日期区间 | \`">="&DATE(2024,1,1)\` |

**\`&\` 拼接是重点**：条件里要引用单元格时，必须写成 \`">="&F2\`，
不能写 \`">=F2"\`（那会被当成字符串）。

## SUMPRODUCT：一次遍历完成多条件计算

\`\`\`
=SUMPRODUCT((A2:A100="北京")*(B2:B100="数码")*C2:C100)
\`\`\`

原理：两个条件分别生成 TRUE/FALSE 数组，相乘后变成 1/0，
再与数值列相乘求和——**这就是"加权求和"**。

SUMPRODUCT 的优势：

1. **不需要 Ctrl+Shift+Enter**（老版本数组公式需要，新版动态数组也不需要）；
2. 可以做"非求和区域"的加权计算，例如加权平均：
   \`=SUMPRODUCT(价格, 数量) / SUM(数量)\`；
3. 逻辑组合更灵活（\`+\` 表示"或"，\`*\` 表示"与"）。

## 加权平均 vs 简单平均

这是数据分析中非常重要的区别：

\`\`\`
简单平均：  =AVERAGE(C2:C100)                  ← 每个观测权重相同
加权平均：  =SUMPRODUCT(C2:C100, D2:D100)/SUM(D2:D100)
\`\`\`

例如"平均客单价"：
- 简单平均（每单权重相同）→ 反映"典型订单"；
- 加权平均（按金额加权）→ 反映"钱主要花在哪些订单上"。

业务上说的"平均价格"通常指加权平均（\`总额 / 总量\`）。

## COUNTIF 的常见用法

\`\`\`
=COUNTIF(A:A, A2)          ← 统计与 A2 相同的个数（>1 说明重复）
=COUNTIF(A:A, "北京")       ← 统计北京的个数
=COUNTIF(A:A, "*张*")       ← 包含"张"的个数
\`\`\`

**用 \`=COUNTIF(A:A,A2)>1\` 做条件格式，可以一键高亮所有重复值**。
`,
      },
      {
        id: 'excel-l-2-6',
        title: '查找引用的四大坑',
        content: `
## 坑 1：VLOOKUP 的近似匹配

\`\`\`
=VLOOKUP(A2, 区域, 2, TRUE)     ← 近似匹配
=VLOOKUP(A2, 区域, 2, FALSE)    ← 精确匹配（99% 的场景）
=VLOOKUP(A2, 区域, 2, 0)        ← 0 等价于 FALSE
\`\`\`

省略第四个参数时**默认为 TRUE（近似匹配）**，会返回"小于等于查找值中最大的那个"，
经常得到看似合理但完全错误的数字。

**规则**：查"编码/名称/ID"这类键时，永远写 \`FALSE\` 或 \`0\`；
只有做"数值区间查表"（如税率表、评级表）时才用 TRUE，且此时**第一列必须升序**。

## 坑 2：被查找值必须在第一列

\`VLOOKUP\` 只能向右查找：它从查找区域的**第一列**找键，
返回**右侧第 n 列**。

如果目标列在左侧，VLOOKUP 无能为力，应改用：

\`\`\`
=INDEX(返回列, MATCH(查找值, 查找列, 0))
\`\`\`

\`INDEX + MATCH\` 的优势：
- 可以向左查找；
- 插入/删除列时不会错位；
- 大数据量下通常更快。

## 坑 3：文本与数字不一致导致 #N/A

\`"1001"\` 与 \`1001\` 不相等。常见原因：

- 一侧来自系统导出（文本），另一侧是手输（数字）；
- 尾部有空格（\`"北京 "\` vs \`"北京"\`）。

排查：

\`\`\`
=LEN(A2)                          ← 看长度是否异常
=ISNUMBER(A2)                     ← 判断类型
=TRIM(A2)                         ← 去首尾空格
=A2*1                             ← 文本数字转数值
\`\`\`

## 坑 4：#N/A 与 #REF!

| 错误 | 含义 | 处理 |
| --- | --- | --- |
| \`#N/A\` | 找不到匹配值 | 检查键的类型/空格，或用 \`IFERROR\` 兜底 |
| \`#REF!\` | 引用的单元格被删了 | 检查区域是否被整列删除 |
| \`#VALUE!\` | 参数类型不对 | 常见于把文本传进需要数字的参数 |

**不要用 \`IFERROR\` 掩盖问题**：\`=IFERROR(VLOOKUP(...),"")\` 很常见，
但把"匹配失败"变成空值，会让后续的 \`SUM\` 少算而无人知晓。
更稳妥的做法是：先修正数据源，再对失败结果单独统计数量（\`=COUNTIF(结果列,"#N/A")\`）。

## XLOOKUP：新版本的统一方案

Excel 365/2021 提供 \`XLOOKUP\`：

\`\`\`
=XLOOKUP(查找值, 查找列, 返回列, "未找到", 0, 1)
\`\`\`

优点：
- 不必限制返回列在右侧；
- 默认精确匹配；
- 可指定"找不到时返回什么"；
- 支持从后往前查找（第 6 参数 -1）。

**注意**：旧版 Excel / WPS 部分版本不支持，分发文件时要考虑兼容性。
`,
      },
    ],
    exercises: [
      {
        id: 'excel-2-x1',
        type: 'single',
        difficulty: 1,
        question: '`VLOOKUP` 省略第四个参数时，默认使用哪种匹配方式？',
        options: [
          { value: 'A', text: '精确匹配' },
          { value: 'B', text: '近似匹配（TRUE）' },
          { value: 'C', text: '随机匹配' },
          { value: 'D', text: '报错' },
        ],
        answer: 'B',
        explanation:
          '默认是 TRUE 近似匹配，且要求第一列升序。查编码、名称这类键时必须显式写 FALSE 或 0，否则会得到错误结果。',
        tags: ['VLOOKUP'],
      },
      {
        id: 'excel-2-x2',
        type: 'judge',
        difficulty: 1,
        question: '`SUMIFS` 的第一个参数是求和区域，而 `SUMIF` 的第一个参数是条件区域。',
        answer: true,
        explanation:
          '这是两个函数最易混淆的地方：`SUMIF(条件区, 条件, 求和区)`，`SUMIFS(求和区, 条件区1, 条件1, ...)`。写反了结果会完全错误。',
        tags: ['SUMIFS'],
      },
      {
        id: 'excel-2-x3',
        type: 'multiple',
        difficulty: 2,
        question: '`INDEX + MATCH` 相比 `VLOOKUP` 有哪些优势？（多选）',
        options: [
          { value: 'A', text: '可以向左查找' },
          { value: 'B', text: '插入或删除列时不会错位' },
          { value: 'C', text: '可以完全替代所有 IF 判断' },
          { value: 'D', text: '不需要固定返回列号' },
        ],
        answer: ['A', 'B', 'D'],
        explanation:
          'C 与函数功能无关。`INDEX(返回列, MATCH(...))` 直接指定返回列，天然支持向左查找，且不受列插入影响。',
        tags: ['INDEX', 'MATCH'],
      },
      {
        id: 'excel-2-x4',
        type: 'fill',
        difficulty: 2,
        question: '统计 A 列中等于"北京"的个数，补全公式：\n\n=___(A:A, "北京")',
        blanks: [['COUNTIF', 'countif']],
        explanation: '`COUNTIF` 是单条件计数；多条件用 `COUNTIFS`。支持通配符 `*` 与 `?`。',
        tags: ['COUNTIF'],
      },
      {
        id: 'excel-2-x5',
        type: 'single',
        difficulty: 3,
        question: '`VLOOKUP` 返回 `#N/A`，下列哪个原因**最不可能**？',
        options: [
          { value: 'A', text: '查找值与源数据的类型不一致（文本 vs 数字）' },
          { value: 'B', text: '源数据中有多余空格' },
          { value: 'C', text: '源数据被删除，引用了损坏的单元格区域' },
          { value: 'D', text: '查找区域的第一列不是被查找的键' },
        ],
        answer: 'C',
        explanation:
          '源数据区域被删会显示 `#REF!` 而不是 `#N/A`。A、B、D 都是导致 `#N/A` 的常见原因。',
        tags: ['VLOOKUP', '错误'],
      },
      {
        id: 'excel-2-x6',
        type: 'judge',
        difficulty: 2,
        question: '`VLOOKUP` 的查找值必须出现在查找区域的最后一列。',
        answer: false,
        explanation:
          '恰恰相反：查找值必须在查找区域的**第一列**，返回值在其右侧。若目标在左侧，需要用 `INDEX + MATCH` 或 `XLOOKUP`。',
        tags: ['VLOOKUP'],
      },
      {
        id: 'excel-2-x7',
        type: 'fill',
        difficulty: 3,
        question: '统计金额介于 100 到 200 之间的订单数，补全第二个条件的写法（引用单元格 G2 作为上限）：\n\n=COUNTIFS(金额列, ">=100", 金额列, ___&G2)',
        blanks: [['"<="', '"<=', '<= ']],
        explanation: '条件里引用单元格必须用 `&` 拼接：`"<="&G2`。直接写 `"<=G2"` 会被当成字符串字面量。',
        tags: ['COUNTIFS', '条件'],
      },
      {
        id: 'excel-2-x8',
        type: 'multiple',
        difficulty: 3,
        question: '关于 `IFERROR`，下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: '可以捕获多种错误值并返回指定内容' },
          { value: 'B', text: '能精确定位出错的根本原因' },
          { value: 'C', text: '滥用可能把真实错误掩盖成空值' },
          { value: 'D', text: '`IFNA` 只捕获 `#N/A`' },
        ],
        answer: ['A', 'C', 'D'],
        explanation:
          '`IFERROR` 只是把错误替换掉，**不提供任何诊断信息**（B 错误）。大量使用会让"数据没匹配上"变成静默的空值。',
        tags: ['IFERROR'],
      },
      {
        id: 'excel-2-x9',
        type: 'single',
        difficulty: 3,
        question: '计算"加权平均价格"，下列公式正确的是？',
        options: [
          { value: 'A', text: '`=AVERAGE(价格列)`' },
          { value: 'B', text: '`=SUMPRODUCT(价格列, 数量列) / SUM(数量列)`' },
          { value: 'C', text: '`=SUM(价格列) / SUM(数量列)`' },
          { value: 'D', text: '`=MEDIAN(价格列, 数量列)`' },
        ],
        answer: 'B',
        explanation:
          '加权平均 = Σ(值 × 权重) / Σ(权重)。B 正确。A 是简单平均；C 的量纲不对（价格之和 ÷ 数量之和）；D 无意义。',
        tags: ['加权平均'],
      },
      {
        id: 'excel-2-x10',
        type: 'code',
        difficulty: 3,
        question:
          '(Excel 公式填空) 多条件求和：统计北京地区、品类为"数码"的销售额合计，销售额在 D 列、城市在 A 列、品类在 B 列（数据区 A2:D100）。\n\n请补全公式中的函数名：\n\n=___(D2:D100, A2:A100, "北京", B2:B100, "数码")',
        starterCode: '# 本题是 Excel 公式题，请在下方写出完整公式作为答案\n# 参考：=SUMIFS(D2:D100, A2:A100, "北京", B2:B100, "数码")\nformula = ""',
        setupCode: '',
        expectedOutput: '=SUMIFS(D2:D100, A2:A100, "北京", B2:B100, "数码")',
        tests: `assert isinstance(formula, str) and "SUMIFS" in formula.upper(), "应使用 SUMIFS 函数"
assert "北京" in formula and "数码" in formula, "应包含两个条件"
assert formula.replace(" ", "").upper().startswith("=SUMIFS("), "公式应以 =SUMIFS( 开头"
`,
        explanation:
          '`SUMIFS(求和区域, 条件区域1, 条件1, 条件区域2, 条件2)`。注意求和区域写在**第一个参数**，这与 `SUMIF` 相反。',
        tags: ['SUMIFS'],
      },
      {
        id: 'excel-2-x11',
        type: 'judge',
        difficulty: 3,
        question: '`VLOOKUP` 使用近似匹配（TRUE）时，查找区域的第一列必须按升序排列。',
        answer: true,
        explanation:
          '近似匹配依赖"二分查找"逻辑，要求第一列升序。未排序时可能返回看似有值但错误的结果，这比报错更危险。',
        tags: ['VLOOKUP'],
      },
      {
        id: 'excel-2-x12',
        type: 'multiple',
        difficulty: 2,
        question: '下列哪些写法可以判断 A 列中的重复值？（多选）',
        options: [
          { value: 'A', text: '`=COUNTIF(A:A, A2)>1`' },
          { value: 'B', text: '条件格式 → 突出显示单元格规则 → 重复值' },
          { value: 'C', text: '`=A2=A1`' },
          { value: 'D', text: '`=SUMPRODUCT((A:A=A2)*1)>1`' },
        ],
        answer: ['A', 'B', 'D'],
        explanation:
          'C 只能判断与上一行是否相同，无法识别"不相邻的重复"。A、B、D 都能判断整列范围内的重复。',
        tags: ['查重'],
      },
      {
        id: 'excel-2-x13',
        type: 'single',
        difficulty: 2,
        question: '`=IF(AND(A2>90, B2="优秀"), "通过", "不通过")` 中，A2=95、B2="良好"，结果是？',
        options: [
          { value: 'A', text: '`通过`' },
          { value: 'B', text: '`不通过`' },
          { value: 'C', text: '`TRUE`' },
          { value: 'D', text: '`#VALUE!`' },
        ],
        answer: 'B',
        explanation: '`AND` 要求所有条件都为 TRUE。B2 是"良好"不是"优秀"，因此 AND 返回 FALSE，输出"不通过"。',
        tags: ['IF', 'AND'],
      },
      {
        id: 'excel-2-x14',
        type: 'fill',
        difficulty: 2,
        question: '判断多个条件中**至少一个**成立，应使用函数：\n\n=IF(___(A2>90, B2>90), "有优秀科目", "无")',
        blanks: [['OR', 'or']],
        explanation: '`OR` 是"或"逻辑，任一条件成立即返回 TRUE；`AND` 是"与"逻辑，需全部成立。',
        tags: ['OR'],
      },
      {
        id: 'excel-2-x15',
        type: 'open',
        difficulty: 4,
        question: '请说明在数据量很大（10 万行）的工作簿中，`VLOOKUP` 与其他查找方式相比有什么性能问题，并给出至少三种优化思路。',
        referenceAnswer: `**性能问题**：

1. \`VLOOKUP\` 每行都要在查找区域中做一次匹配（线性或二分查找），
   10 万行 × 10 万行查找区域 会导致极慢；
2. 若查找区域用整列引用（如 \`A:D\`），计算范围被放大到 100 万行；
3. 近似匹配未排序时会退化为更慢的扫描；
4. 公式列会随每次编辑全量重算。

**优化思路**：

1. **限定查找区域**：用具体范围 \`$A$2:$D$10000\` 代替整列，必要时用命名区域；
2. **改用 INDEX + MATCH**：MATCH 只需定位一次，
   且可配合 \`MATCH(...,0)\` 精确匹配，通常比 VLOOKUP 快；
3. **排序后二分查找**：若数据按查找键升序，可用近似匹配或 \`XLOOKUP\` 的二分模式；
4. **用 Power Query 做合并**：一次性合并查询，结果缓存为表格，避免逐行公式计算；
5. **把公式结果转为值**：计算完成后"选择性粘贴为值"，消除重算成本；
6. **减少易失性函数**：\`INDIRECT\`、\`OFFSET\`、\`TODAY\`、\`RAND\` 等易失性函数会强制整本重算；
7. **升级到 Power Pivot / 数据模型**：用关系模型与 DAX 度量值处理百万行；
8. **考虑迁移到 Python/Pandas 或数据库**：当数据量超过 Excel 的舒适区（约 100 万行）时，
   Excel 不是合适工具。`,
        rubric: [
          { point: '指出 VLOOKUP 逐行查找与整列引用的性能问题', score: 2 },
          { point: '提出限定查找区域 / 改用 INDEX+MATCH / 排序二分', score: 2 },
          { point: '提出 Power Query / 转值 / 数据模型等方案', score: 1 },
          { point: '认识到数据量超限时应换工具', score: 1 },
        ],
        keywords: ['VLOOKUP', 'INDEX', 'MATCH', '区域', 'Power Query', '易失性', '数据量'],
        explanation:
          'Excel 的性能问题往往不是"函数不够快"，而是"用错了范围与工具"。答题时体现分层优化的思路即可。',
        tags: ['性能'],
      },
      {
        id: 'excel-2-x16',
        type: 'single',
        difficulty: 2,
        question: '下列哪个函数可以返回"查找值在区域中的位置（行号）"？',
        options: [
          { value: 'A', text: '`VLOOKUP`' },
          { value: 'B', text: '`MATCH`' },
          { value: 'C', text: '`INDEX`' },
          { value: 'D', text: '`LOOKUP`' },
        ],
        answer: 'B',
        explanation:
          '`MATCH(查找值, 区域, 0)` 返回位置；`INDEX(区域, 行号)` 按位置取值。两者组合即 `INDEX + MATCH`。',
        tags: ['MATCH'],
      },
      {
        id: 'excel-2-x17',
        type: 'judge',
        difficulty: 2,
        question: '`XLOOKUP` 在找不到匹配值时会默认返回 `#N/A`，也可以指定返回的内容。',
        answer: true,
        explanation:
          '`XLOOKUP(查找值, 查找列, 返回列, [找不到时返回], [匹配模式], [搜索方向])`，第 4 个参数就是"未找到时的返回值"。',
        tags: ['XLOOKUP'],
      },
      {
        id: 'excel-2-x18',
        type: 'multiple',
        difficulty: 3,
        question: '关于 `SUMPRODUCT`，下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: '可以把多个条件相乘实现"与"逻辑' },
          { value: 'B', text: '可以实现加权平均与加权求和' },
          { value: 'C', text: '在旧版 Excel 中通常不需要按 Ctrl+Shift+Enter' },
          { value: 'D', text: '只能用于两列数据的乘法求和' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          '`SUMPRODUCT` 可以接收任意多组数组，做任意维度的组合运算，D 错误。它是旧版 Excel 中实现"多条件数组计算"的利器。',
        tags: ['SUMPRODUCT'],
      },
    ],
  },
];
