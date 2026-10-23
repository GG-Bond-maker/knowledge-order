# -*- coding: utf-8 -*-
"""
Python 基础与数据处理 - 第 5 章至第 8 章数据定义
涵盖：
5. 核心数据结构与推导式 (list, tuple, dict, set, comprehensions)
6. 函数设计、参数体系与作用域 (def, *args, **kwargs, LEGB, return)
7. 异常处理、错误定位与调试排错 (try/except/else/finally, raise, traceback, assert)
8. 文件路径、文本读写与 CSV/JSON 交互 (open, with, encoding, csv, json)
"""

CHAPTER_5 = {
    "id": "pyf-c5",
    "courseId": "python-foundations-data",
    "order": 5,
    "title": "核心数据结构与推导式",
    "goal": "深入掌握列表与元组的切片与可变性，理解字典与集合的哈希底层与常数级 O(1) 检索，熟练编写优雅高效的列表/字典推导式。",
    "lessons": [
        {
            "id": "pyf-l5-1",
            "title": "序列双雄：列表 (list) 与元组 (tuple) 的切片与可变性剖析",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：掌握列表（动态可变数组）与元组（不可变序列）的底层物理差异，熟练运用高级切片语法 `[start:stop:step]` 与常用内置增删改查方法，理解深浅拷贝。
- **先修要求**：已熟练掌握基本数据类型与循环遍历。

---

### 二、核心概念与术语解释

#### 1. 列表 (list)：可变动态数组
- 底层实现：C 语言连续内存指针数组，支持末尾快速摊销常数级追加（$O(1)$）；
- **高级切片语法 `seq[start:stop:step]`**：
  - 永远是**左闭右开**：包含 `start`，不包含 `stop`；
  - 省略 `start` 默认为 0，省略 `stop` 默认为序列末尾；
  - 负索引：`-1` 代表最后一个元素；
  - 逆序复制：`seq[::-1]` 可以瞬间将序列反转；
- 原地修改方法 vs 返回新列表：
  - `lst.append(x)`：末尾追加单个元素（原地修改，返回 None）；
  - `lst.extend(iterable)`：批量展开追加多个元素；
  - `lst.sort()`：原地升序排序；`sorted(lst)`：返回全新的已排序列表，原列表不变。

#### 2. 元组 (tuple)：不可变序列
- 用圆括号 `(1, 2, 3)` 定义（注意单个元素的元组必须带逗号 `(42,)`）；
- 一旦创建，**元组内部的元素指针引用绝不可更改、不可增加、不可删除**；
- 优势：比列表占用更少内存，创建速度更快，且因为不可变而**可以作为字典的 Key 或集合的元素**。

#### 3. 浅拷贝 (Shallow Copy) vs 深拷贝 (Deep Copy)
- `b = a.copy()` 或 `b = a[:]` 只是浅拷贝：只复制外层列表，如果列表里嵌套了子列表，子列表依然共享同一个内存对象！
- 需要彻底独立深层复制时，必须使用标准库 `copy.deepcopy(a)`。

---

### 三、逐步代码演练与执行分析

```python
# 切片高级操作演练
numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

print("取前 3 个:", numbers[:3])         # [0, 1, 2]
print("取后 3 个:", numbers[-3:])        # [7, 8, 9]
print("步长为 2 隔项取:", numbers[::2])  # [0, 2, 4, 6, 8]
print("整列翻转:", numbers[::-1])        # [9, 8, 7, ..., 0]

# 列表原地修改 vs 返回新列表
scores = [85, 92, 78, 90]
scores.append(88)
print("追加后:", scores)

sorted_scores = sorted(scores, reverse=True)
print("全新降序排序列表:", sorted_scores)
print("原列表未被破坏:", scores)
```

---

### 四、常见易错陷阱与排查技巧
1. **单元素元组漏写逗号**：
   - `t = (42)` 会被 Python 解析为带有括号的普通整型数值 42！必须写成 `t = (42,)` 才是包含一个元素的元组。
2. **列表的 append 返回 None**：
   - 初学者常写 `lst = lst.append(5)`，这会导致 `lst` 直接变成 `None`！因为 `append` 是原地操作，返回值是 None。

---

### 五、本节小结
- 列表可变，元组不可变；不可变意味着线程安全且可哈希。
- 切片 `[start:stop:step]` 左闭右开，`[::-1]` 可快捷逆序。
- 区分原地操作（如 `sort()`）与产生新对象（如 `sorted()`）。
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "切勿写 my_list = my_list.sort() 或 my_list = my_list.append(x)，这些方法是原地修改并返回 None，重新赋值会导致变量变成 None！"
                },
                {
                    "kind": "performance",
                    "text": "在列表头部频繁插入或删除元素（如 lst.insert(0, x)）的时间复杂度是 O(n)，如果有高频双端操作需求，应使用 collections.deque。"
                }
            ],
            "demos": [
                {
                    "title": "列表切片与数据窗口提取实战",
                    "lang": "python",
                    "code": "# 模拟从股票日收盘价序列中提取移动观察窗口\nprices = [10.2, 10.5, 10.8, 10.4, 11.0, 11.3, 11.1, 11.5, 12.0]\n\n# 提取最近 5 天的收盘价\nrecent_5_days = prices[-5:]\nprint(f\"最近 5 天收盘价: {recent_5_days}\")\n\n# 计算最近 5 天最高、最低与均价\nhighest = max(recent_5_days)\nlowest = min(recent_5_days)\navg = sum(recent_5_days) / len(recent_5_days)\nprint(f\"最高: {highest}, 最低: {lowest}, 5日均价: {avg:.2f}\")\n"
                }
            ]
        },
        {
            "id": "pyf-l5-2",
            "title": "映射与集合：字典 (dict) 与集合 (set) 的哈希原理与高效查找",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：理解哈希表（Hash Table）底层原理与 $O(1)$ 常数时间查询优势，掌握字典与集合的增删改查方法，熟练运用集合运算进行数据去重与交集比对。
- **先修要求**：了解可变与不可变类型概念。

---

### 二、核心概念与术语解释

#### 1. 字典 (dict)：键值映射 (Key-Value)
- 字典是 Python 中最核心、最强大的数据结构，底层基于经过高度优化的哈希表实现；
- **查找性能**：在包含 1000 万条记录的字典中通过 key 查找对应的值，仅需一次哈希计算即可直接定位内存槽位，时间复杂度为 $O(1)$！而如果在列表中用 `x in list` 查找，需要逐项对比，时间复杂度是极其缓慢的 $O(n)$；
- **键（Key）的约束**：**字典的 Key 必须是不可变且可哈希（Hashable）的对象**（如 int, float, str, tuple）；**绝对不能用列表或字典作为 Key**！
- 常用方法：
  - `d.get(key, default)`：安全获取值，key 不存在时返回 default（不会报 KeyError）；
  - `d.keys()`, `d.values()`, `d.items()`：分别返回键、值、键值对视图；
  - `d.setdefault(key, default)`：若 key 不存在则插入并返回默认值。

#### 2. 集合 (set)：无序互异集
- 集合只存储唯一的键，不允许任何重复元素；
- 同样基于哈希表，`item in my_set` 的查找效率同样是 $O(1)$；
- 集合代数运算：
  - **并集 (`A | B`)**：合并两集合所有元素；
  - **交集 (`A & B`)**：取两集合共有的重合元素；
  - **差集 (`A - B`)**：属于 A 但不属于 B 的元素；
  - **对称差 (`A ^ B`)**：属于 A 或 B 但不同时属于两者的元素。

---

### 三、逐步代码演练与执行分析

```python
# 1. 字典安全查找与频次统计
user_scores = {"张伟": 88, "王芳": 95, "李强": 91}

# 安全获取
print("王芳成绩:", user_scores.get("王芳"))
print("赵六成绩:", user_scores.get("赵六", "缺考"))  # 不会崩溃报错

# 2. 集合去重与交集运算（在电商用户分析中极其常用）
bought_electronics = {"U101", "U102", "U103", "U105"}
bought_books = {"U102", "U105", "U106", "U108"}

# 既买了数码又买了图书的高价值交叉购买用户（交集）
cross_buyers = bought_electronics & bought_books
print(f"交叉购买用户群: {cross_buyers}")

# 仅买了数码未买图书的用户（差集）
elec_only = bought_electronics - bought_books
print(f"纯数码用户群: {elec_only}")
```

---

### 四、常见易错陷阱与排查技巧
1. **直接用中括号取不存在的 key 导致 KeyError 崩溃**：
   - 执行 `user_scores["未知用户"]` 会直接报 `KeyError` 导致整个脚本停止！在无法确保 key 必存在的数据清洗流程中，一律使用 `.get(key, default)`。
2. **用可变列表作为字典的 key**：
   - 执行 `d = {[1, 2]: "val"}` 会直接报 `TypeError: unhashable type: 'list'`。如果一定要用复合键，应使用元组 `d = {(1, 2): "val"}`。

---

### 五、本节小结
- 字典和集合基于哈希表，查找与包含判断为 $O(1)$ 级别。
- 字典键和集合元素必须可哈希（不可变）。
- 安全取值使用 `.get()`，多维度客户画像比对善用集合代数运算（交 `&`、并 `|`、差 `-`）。
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "千万不要使用空花括号 {} 去创建空集合！在 Python 中 {} 默认创建的是空字典，创建空集合必须显式写 set()。"
                },
                {
                    "kind": "performance",
                    "text": "在大数据集判断元素是否存在时（if x in collection），务必将列表转换为集合 set，将 O(n) 的遍历复杂度直接降维为 O(1)。"
                }
            ],
            "demos": [
                {
                    "title": "两渠道注册用户留存与交集分析",
                    "lang": "python",
                    "code": "# 模拟两批营销渠道带来的用户 ID 留存比对\nchannel_a = {\"user_1\", \"user_2\", \"user_3\", \"user_4\", \"user_5\"}\nchannel_b = {\"user_3\", \"user_4\", \"user_6\", \"user_7\"}\n\nall_unique_users = channel_a | channel_b\noverlap_users = channel_a & channel_b\nonly_a_users = channel_a - channel_b\n\nprint(f\"全渠道总去重独立用户数: {len(all_unique_users)}\")\nprint(f\"双渠道重叠触达用户: {overlap_users}\")\nprint(f\"仅在 A 渠道触达用户: {only_a_users}\")\n"
                }
            ]
        },
        {
            "id": "pyf-l5-3",
            "title": "优雅简洁：列表推导式、字典推导式与条件筛选",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：掌握 Pythonic 的核心标志——推导式（Comprehensions），熟练编写带条件过滤的列表推导式与字典推导式，理解推导式相比传统 append 的速度优势与可读性边界。
- **先修要求**：熟练掌握 for 循环、列表与字典的基本操作。

---

### 二、核心概念与术语解释

#### 1. 列表推导式 (List Comprehension)
传统写法需要先创建一个空列表，然后用 3~4 行 for 循环加 append 逐一填充；
推导式将“创建列表、遍历数据、条件筛选、数据转换”压缩为一行极其清晰的表达式：
```python
[目标转换表达式 for 迭代变量 in 可迭代对象 if 筛选条件]
```
- **执行逻辑**：
  1. 遍历 `可迭代对象`；
  2. 遇到 `if 筛选条件` 时进行真值测试，为真才保留；
  3. 计算 `目标转换表达式` 并存入新生成的列表中。

#### 2. 字典推导式 (Dict Comprehension)
语法类似，使用花括号与冒号生成映射结构：
```python
{键表达式: 值表达式 for 迭代变量 in 可迭代对象 if 筛选条件}
```
典型应用场景：
- **键值对快速反转**：`{v: k for k, v in original_dict.items()}`
- **对字段批量清洗或单位换算**：`{k: round(v * 1.1, 2) for k, v in prices.items()}`

#### 3. 推导式的性能与可读性底线
- **性能更优**：推导式在 CPython 底层调用优化过的 `LIST_APPEND` 专用字节码，比在 Python 循环中频繁调用 `.append()` 方法查找要快 20%~30%；
- **可读性底线**：严禁编写超过两层嵌套的推导式！如果一个推导式长度超过 80 字符或嵌套了三层逻辑，必须重构为传统的分段循环或辅助函数。

---

### 三、逐步代码演练与执行分析

```python
# 1. 传统循环 vs 列表推导式：过滤出大于 50 的数值并求其平方
raw_numbers = [12, 55, 34, 78, 90, 45, 60]

# 列表推导式写法（一行搞定）
high_squares = [x ** 2 for x in raw_numbers if x > 50]
print(f"大于 50 的数平方列表: {high_squares}")

# 2. 字典推导式：提取合格学员名单并格式化分数
exam_scores = {"张三": 58, "李四": 88, "王五": 95, "赵六": 45}
passed_students = {name: f"{score}分" for name, score in exam_scores.items() if score >= 60}
print(f"及格学员名单: {passed_students}")
```

---

### 四、常见易错陷阱与排查技巧
1. **混淆 `if` 过滤与 `if-else` 赋值的位置**：
   - 纯过滤：`[x for x in data if x > 0]`（if 写在最右侧，没有 else）；
   - 三元转换：`[x if x > 0 else 0 for x in data]`（if-else 作为求值表达式写在 for 的左侧！）。
   - 初学者经常写出 `[x for x in data if x > 0 else 0]`，这会直接报 `SyntaxError: invalid syntax`！

---

### 五、本节小结
- 列表推导式是 Python 标志性的语法糖，更快更紧凑。
- 纯过滤 if 写在 for 右侧；三元赋值 if-else 写在 for 左侧。
- 字典推导式是做字段映射、数据清洗的利器。
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "语法位置记忆法则：只过滤不转换的 if 写在 for 之后；带有 else 的三元值转换表达式必须写在 for 之前。"
                },
                {
                    "kind": "performance",
                    "text": "列表推导式不仅语法简练，其 C 语言底层的专有字节码优化使其执行效率显著高于原生 for + append。"
                }
            ],
            "demos": [
                {
                    "title": "推导式在订单清洗与聚合提取中的实战",
                    "lang": "python",
                    "code": "# 模拟从一批混合格式的商品价格字典中提取有效人民币报价\nproduct_prices = {\n    \"鼠标\": \"¥59.9\",\n    \"键盘\": \"¥299.0\",\n    \"耳机\": \"已下架\",\n    \"手柄\": \"¥158.0\",\n    \"数据线\": \"赠品\"\n}\n\n# 使用字典推导式完成清洗：提取有效报价并去除货币符号转为 float\ncleaned_prices = {\n    k: float(v.replace(\"¥\", \"\"))\n    for k, v in product_prices.items()\n    if v.startswith(\"¥\")\n}\n\nprint(\"清洗后的商品价格字典:\", cleaned_prices)\nprint(\"高价值商品(>=100)列表:\", [name for name, price in cleaned_prices.items() if price >= 100])\n"
                }
            ]
        }
    ],
    "exercises": [
        {
            "id": "pyf-ex-5-1",
            "type": "single",
            "difficulty": 1,
            "question": "如果试图将一个列表（如 `[1, 2, 3]`）作为 Python 字典的键（Key），程序会抛出什么异常？",
            "options": [
                {"value": "A", "label": "TypeError: unhashable type: 'list'"},
                {"value": "B", "label": "KeyError: invalid key"},
                {"value": "C", "label": "ValueError: list cannot be key"},
                {"value": "D", "label": "没有任何异常，列表可以完美作为字典的键"}
            ],
            "answer": "A",
            "explanation": "字典基于哈希表实现，要求键必须具有确定的哈希值（Hashable）且不可变。列表属于可变对象，没有确定的哈希值，因此会抛出 TypeError: unhashable type: 'list'。",
            "tags": ["哈希表", "字典约束"]
        },
        {
            "id": "pyf-ex-5-2",
            "type": "single",
            "difficulty": 1,
            "question": "若有列表 `nums = [10, 20, 30, 40, 50, 60, 70]`，切片操作 `nums[1:6:2]` 截取出的子列表是？",
            "options": [
                {"value": "A", "label": "[20, 40, 60]"},
                {"value": "B", "label": "[10, 30, 50]"},
                {"value": "C", "label": "[20, 30, 40, 50, 60]"},
                {"value": "D", "label": "[20, 40]"}
            ],
            "answer": "A",
            "explanation": "切片从索引 1（值 20）开始，到索引 6（值 70，但不包含索引 6）结束，步长为 2：依次截取索引 1（20）、索引 3（40）、索引 5（60）。因此结果为 [20, 40, 60]。",
            "tags": ["切片", "列表"]
        },
        {
            "id": "pyf-ex-5-3",
            "type": "judge",
            "difficulty": 2,
            "question": "在 Python 中，字典的 `d.get(key, default)` 方法在访问不存在的键时不会抛出 KeyError，而是平稳返回指定的默认值。",
            "answer": True,
            "explanation": "正确！这是字典防御性编程的核心方法。相比直接用 d[key] 可能引发 KeyError 崩溃，d.get(key, default) 能够平稳返回设定的默认值（若不传 default 则返回 None）。",
            "tags": ["字典", "防御性编程"]
        },
        {
            "id": "pyf-ex-5-4",
            "type": "fill",
            "difficulty": 2,
            "question": "在 Python 中，创建一个不包含任何元素的空集合，正确的代码是 `empty_set = _____()`（注意不能使用空花括号 `{}`，因为那是字典）。",
            "blanks": [["set"]],
            "explanation": "空花括号 {} 在 Python 中默认是创建空字典 dict，创建空集合必须调用 set() 构造函数。",
            "tags": ["集合", "语法陷阱"]
        },
        {
            "id": "pyf-ex-5-5",
            "type": "single",
            "difficulty": 2,
            "question": "执行列表推导式 `[x * 2 for x in [1, 2, 3, 4, 5] if x % 2 == 1]`，得到的最终结果是：",
            "options": [
                {"value": "A", "label": "[2, 6, 10]"},
                {"value": "B", "label": "[4, 8]"},
                {"value": "C", "label": "[2, 4, 6, 8, 10]"},
                {"value": "D", "label": "[1, 3, 5]"}
            ],
            "answer": "A",
            "explanation": "筛选条件 x % 2 == 1 保留奇数：1, 3, 5；然后将保留的奇数分别乘以 2，得到 [2, 6, 10]。",
            "tags": ["列表推导式", "代码阅读"]
        },
        {
            "id": "pyf-ex-5-6",
            "type": "multiple",
            "difficulty": 3,
            "question": "关于 Python 中的集合（set）数据结构，下列说法正确的有？",
            "options": [
                {"value": "A", "label": "集合中的元素具有唯一性，向集合中多次添加相同元素不会产生重复"},
                {"value": "B", "label": "判断某个元素是否存在于集合中（x in my_set）的平均时间复杂度为 O(1)"},
                {"value": "C", "label": "集合保留元素的插入顺序，并支持使用整数索引访问（如 s[0]）"},
                {"value": "D", "label": "可以通过减号运算符（A - B）方便地计算两个集合的差集"}
            ],
            "answer": ["A", "B", "D"],
            "explanation": "集合是基于哈希表的无序互异容器，不支持下标切片访问（s[0] 会报 TypeError）；A（唯一性）、B（常数级查找）、D（差集运算）均正确。",
            "tags": ["集合特性", "时间复杂度"]
        },
        {
            "id": "pyf-ex-5-7",
            "type": "single",
            "difficulty": 3,
            "question": "执行以下列表操作：\n```python\na = [1, 2, 3]\nb = a\nb.append(4)\n```\n此时 `a` 和 `b` 的内容分别是：",
            "options": [
                {"value": "A", "label": "a 为 [1, 2, 3, 4]，b 为 [1, 2, 3, 4]"},
                {"value": "B", "label": "a 为 [1, 2, 3]，b 为 [1, 2, 3, 4]"},
                {"value": "C", "label": "a 为 [1, 2, 3]，b 为 None"},
                {"value": "D", "label": "抛出 AttributeError 异常"}
            ],
            "answer": "A",
            "explanation": "b = a 传递的是对象引用，a 和 b 指向内存中同一个可变列表对象。通过 b 修改列表，a 观察到的也是修改后的列表内容。",
            "tags": ["引用传递", "可变对象"]
        },
        {
            "id": "pyf-ex-5-8",
            "type": "code",
            "difficulty": 4,
            "question": "【动手编程】请编写一个单词词频统计函数 `count_word_frequency(words: list) -> dict`：\n输入一个由单词字符串构成的列表，返回一个字典，Key 为单词名称，Value 为该单词在列表中出现的总次数。",
            "starterCode": "def count_word_frequency(words: list) -> dict:\n    # 请在此处使用字典统计频次\n    pass\n",
            "expectedOutput": "{'apple': 2, 'banana': 1}",
            "answer": "def count_word_frequency(words: list) -> dict:\n    freq = {}\n    for w in words:\n        freq[w] = freq.get(w, 0) + 1\n    return freq",
            "tests": "res = count_word_frequency(['apple', 'banana', 'apple'])\nassert res == {'apple': 2, 'banana': 1}\nres2 = count_word_frequency([])\nassert res2 == {}\nres3 = count_word_frequency(['a', 'b', 'c', 'a', 'a'])\nassert res3 == {'a': 3, 'b': 1, 'c': 1}\n",
            "explanation": "利用 freq.get(w, 0) + 1 优雅地对每个单词进行频次递增，若单词首次出现则以 0 为初始值并加 1。",
            "tags": ["编程实操", "词频统计"]
        }
    ]
}

CHAPTER_6 = {
    "id": "pyf-c6",
    "courseId": "python-foundations-data",
    "order": 6,
    "title": "函数设计、参数体系与作用域",
    "goal": "掌握函数的模块化封装与 DRY 原则，精通默认参数、关键字参数与 *args/**kwargs 动态解包，理解 LEGB 作用域查找规则与可变对象默认参数经典陷阱。",
    "lessons": [
        {
            "id": "pyf-l6-1",
            "title": "模块化之美：函数定义、文档字符串与返回值机制",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：理解软件工程核心的 DRY（Don't Repeat Yourself）复用原则，掌握 `def` 关键字、规范的文档字符串（Docstring）与类型提示，理解 Python 函数的多值返回与 `None` 机制。
- **先修要求**：熟练掌握基本数据结构与控制流。

---

### 二、核心概念与术语解释

#### 1. 为什么需要函数？
- **代码复用与防重复（DRY 原则）**：避免同样的数据清洗逻辑在代码里复制粘贴 10 遍；
- **抽象与黑盒测试**：把复杂逻辑封装在一个具名函数后，调用者只需关心“输入什么、输出什么”，而无需关心内部繁琐实现；
- **关注点分离（Separation of Concerns）**：一个好函数应该遵循**单一职责原则（Single Responsibility Principle）**，只做好一件事。

#### 2. 函数结构定义
```python
def 函数名(形参1: 类型, 形参2: 类型 = 默认值) -> 返回类型:
    \"\"\"函数功能一句话说明。

    Args:
        形参1: 参数说明
        形参2: 参数说明

    Returns:
        返回值说明
    \"\"\"
    # 函数内部逻辑
    return 结果
```

#### 3. 返回值机制（return）
- **显式 return**：`return` 语句会立即终止函数执行，并将结果交回给调用方；
- **返回多个值**：在 Python 中写 `return min_val, max_val, avg_val`，实际上是**自动打包成一个元组（tuple）返回**！调用方可以使用多变量解包接收：`mn, mx, av = calculate_stats(data)`；
- **默认无返回值**：如果一个函数内部执行到结尾都没有遇到 `return`，或者仅仅写了裸的 `return`，则该函数**隐式默认返回单例对象 `None`**。

---

### 三、逐步代码演练与执行分析

```python
def compute_sales_metrics(amounts: list) -> tuple:
    \"\"\"计算销售额汇总、平均客单价与最大单笔订单\"\"\"
    if not amounts:
        return 0.0, 0.0, 0.0
    
    total = sum(amounts)
    avg = total / len(amounts)
    max_order = max(amounts)
    return round(total, 2), round(avg, 2), round(max_order, 2)

# 解包接收多返回值
total_rev, avg_ticket, peak_order = compute_sales_metrics([199.0, 850.5, 420.0, 99.0])
print(f"总收入: ¥{total_rev} | 平均客单: ¥{avg_ticket} | 最高单笔: ¥{peak_order}")
```

---

### 四、常见易错陷阱与排查技巧
1. **忘记 return 导致接收到 None**：
   - 在函数中计算了完美的结果但最后一行忘记写 `return result`，外部调用 `val = my_func()` 会拿到 `None`，后续再拿去计算便会触发 `TypeError: unsupported operand type for NoneType`。
2. **函数定义与调用的先后顺序**：
   - Python 是脚本解释型执行，必须**先定义函数（让解释器在当前作用域登记该名字），后调用函数**。在函数定义之前尝试调用该函数会直接报 `NameError`。

---

### 五、本节小结
- 函数是结构化编程的最小基石，严格遵循单一职责原则。
- 文档字符串 Docstring 能够被 `help()` 函数或 IDE 智能提示读取。
- Python 支持看似返回多值，底层本质是优雅的元组解包。
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "牢记：任何没有显式 return 的函数在执行完毕后都会悄悄返回 None。如果在外部把函数调用结果赋值给变量，务必检查是否遗漏了 return。"
                },
                {
                    "kind": "interview",
                    "text": "面试考点：Python 函数返回多值的底层机制是自动将逗号分隔的多个对象封装为一个 tuple（元组）。"
                }
            ],
            "demos": [
                {
                    "title": "单一职责函数设计与元组解包实战",
                    "lang": "python",
                    "code": "# 演示良好结构化的数据转换函数\ndef clean_and_split_name(full_name: str) -> tuple:\n    \"\"\"清洗全角空格并拆分中英文姓与名\"\"\"\n    stripped = full_name.strip().replace(\"　\", \" \")\n    parts = stripped.split()\n    if len(parts) >= 2:\n        return parts[0], \" \".join(parts[1:])\n    return full_name, \"\"\n\nfirst, last = clean_and_split_name(\"  Guido  van Rossum \")\nprint(f\"姓: {last} | 名: {first}\")\n"
                }
            ]
        },
        {
            "id": "pyf-l6-2",
            "title": "参数传递全景图：位置、默认值与 *args/**kwargs 动态解包",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：掌握 Python 强大的参数体系（位置参数、关键字参数、默认参数），深刻领悟 Python 史诗级经典面试坑——**“可变默认参数陷阱”**，熟练使用 `*args` 收集不定长位置参数与 `**kwargs` 收集不定长关键字参数。
- **先修要求**：已掌握函数基础定义与返回值。

---

### 二、核心概念与术语解释

#### 1. 参数种类与传递方式
- **位置参数（Positional Arguments）**：按照定义时的顺序一一对应传递；
- **关键字参数（Keyword Arguments）**：调用时明确指定形参名称传递，如 `func(age=25, name="Alice")`，顺序可任意调整；
- **默认参数（Default Arguments）**：给形参预设初始值，调用方不传时使用该默认值。**语法强制要求：默认参数必须位于所有非默认参数的后面**！

#### 2. 史诗级陷阱：切勿使用可变对象作为默认参数！
这是几乎所有初学者都会踩的深坑：
```python
# 致命错误写法：使用列表 [] 作为默认参数！
def add_item(item, target_list=[]):
    target_list.append(item)
    return target_list

print(add_item("A"))  # 输出 ['A']
print(add_item("B"))  # 输出 ['A', 'B']！为什么 B 后面还有 A？！
```
**底层原理解密**：
Python 中的默认参数是在**函数定义阶段（模块首次载入编译时）计算并创建的单例对象**，而不是在每次调用函数时重新创建！
因此，同一个 `target_list` 在所有函数调用间被一直共享！

> [!IMPORTANT] 最佳工程实践（防御性写法）
> 任何默认参数如果需要是列表、字典等可变容器，**一律将默认值设为 `None`**，并在函数体内部动态新建！
> ```python
> def add_item_safe(item, target_list=None):
>     if target_list is None:
>         target_list = []  # 每次调用独立创建新列表
>     target_list.append(item)
>     return target_list
> ```

#### 3. 不定长参数：`*args` 与 `**kwargs`
- **`*args`（Arguments）**：用于接收任意数量的多余位置参数，在函数内部被打包为一个**元组 (tuple)**；
- **`**kwargs`（Keyword Arguments）**：用于接收任意数量的多余键值对参数，在函数内部被打包为一个**字典 (dict)**。

---

### 三、逐步代码演练与执行分析

```python
# 编写一个万能数据格式化流水线函数
def build_report_card(title, *scores, **metadata):
    print(f"=== 报表标题: {title} ===")
    print(f"位置分值汇总: {scores} (类型: {type(scores).__name__})")
    print(f"元数据标签集: {metadata} (类型: {type(metadata).__name__})")
    
    if scores:
        print(f"平均分: {sum(scores) / len(scores):.1f}")
    for k, v in metadata.items():
        print(f"  [{k}]: {v}")

build_report_card("第一季度质检", 95, 88, 92, auditor="张工", department="质控部")
```

---

### 四、常见易错陷阱与排查技巧
1. **参数排列顺序颠倒**：
   - 函数定义时的形参顺序必须严格为：`位置参数 -> 默认参数 -> *args -> 命名关键字参数 -> **kwargs`。如果违背该顺序，Python 会直接报 `SyntaxError: non-default argument follows default argument`。

---

### 五、本节小结
- 默认参数必须置于无默认参数之后。
- 绝不要用可变对象（`[]`, `{}`）作为默认值，一律以 `None` 占位并动态初始化。
- `*args` 收集多余位置参数为 tuple，`**kwargs` 收集多余关键字参数为 dict。
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "切记：def fn(a, b=[]) 是重大反模式！请永远写 def fn(a, b=None): if b is None: b = []。"
                },
                {
                    "kind": "interview",
                    "text": "面试高频题：* 在实参调用时是解包（unpacking），例如 func(*[1, 2]) 将列表打散为两个位置参数传入。"
                }
            ],
            "demos": [
                {
                    "title": "通用日志包装器：*args 与 **kwargs 动态转发",
                    "lang": "python",
                    "code": "# 模拟通用 API 调用日志记录与参数动态透传\ndef api_request(endpoint, *params, **headers):\n    print(f\"[HTTP 请求] 地址: {endpoint}\")\n    if params:\n        print(f\"  查询参数 (args): {params}\")\n    if headers:\n        print(f\"  请求头 (kwargs): {headers}\")\n    return {\"status\": 200, \"msg\": \"Success\"}\n\n# 动态传递各种各样的请求\nres = api_request(\"/api/v1/orders\", \"page=1\", \"size=20\", Authorization=\"Bearer token_abc\", Timeout=30)\nprint(\"调用响应:\", res)\n"
                }
            ]
        },
        {
            "id": "pyf-l6-3",
            "title": "变量作用域与生命周期：LEGB 查找规则与纯函数",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：掌握 Python 的 LEGB 变量作用域查找链，搞清全局变量与局部变量的隔离原则，理解 `global` 关键字与纯函数（Pure Functions）的设计哲学。
- **先修要求**：熟练掌握函数定义与调用。

---

### 二、核心概念与术语解释

#### 1. 作用域查找链：LEGB 规则
当在函数内部使用一个变量名时，Python 解释器会按照严格固定的优先级**从内到外**查找变量，简称 **LEGB** 规则：
1. **L - Local（局部作用域）**：当前函数体内部定义的变量和形参；
2. **E - Enclosing（闭包嵌套作用域）**：外层嵌套函数的局部作用域；
3. **G - Global（全局作用域）**：当前模块（`.py` 文件）的最顶层变量；
4. **B - Built-in（内建作用域）**：Python 自带的内建函数和常量（如 `len`, `range`, `print`, `None`）。
如果沿着这四层依然找不到该名字，才会抛出终极错误：`NameError: name 'xxx' is not defined`。

```
┌──────────────────────────────────────────────┐
│ Built-in (内建: len, print, sum)             │
│   ┌────────────────────────────────────────┐ │
│   │ Global (当前脚本顶层变量)              │ │
│   │   ┌──────────────────────────────────┐ │ │
│   │   │ Enclosing (外层嵌套函数)         │ │ │
│   │   │   ┌────────────────────────────┐ │ │ │
│   │   │   │ Local (当前函数局部变量)   │ │ │ │
│   │   │   └────────────────────────────┘ │ │ │
│   │   └──────────────────────────────────┘ │ │
│   └────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

#### 2. 读取全局变量 vs 修改全局变量（`global` 关键字）
- **读取**：在函数内可以直接读取全局变量；
- **修改重新绑定**：如果在函数内试图给全局变量赋值，**Python 默认会将其视为在当前局部作用域新建了一个同名局部变量**，绝不会直接修改全局变量！
- 如果确实需要修改外部全局变量，必须显式声明 `global var_name`（注意：在商业生产代码中滥用 global 属于反模式，会导致代码难以测试与追踪副作用）。

#### 3. 纯函数（Pure Functions）的工业价值
- **定义**：相同的输入永远产生相同的输出，且执行过程中**没有任何副作用（不修改全局变量、不破坏外部传入的可变参数）**。
- **价值**：数据分析管道中，纯函数极其容易进行自动化单元测试，且支持无缝并行化处理。

---

### 三、逐步代码演练与执行分析

```python
counter = 100  # 全局变量

def test_shadowing():
    counter = 10  # 这是一个局部变量！名字遮蔽（Shadowing）了全局 counter
    print("函数内部局部 counter:", counter)

test_shadowing()
print("全局 counter 依然是:", counter)  # 100，完全未受影响

def modify_global():
    global counter
    counter += 50  # 显式声明后修改全局变量

modify_global()
print("显式 global 修改后的 counter:", counter)  # 150
```

---

### 四、常见易错陷阱与排查技巧
1. **UnboundLocalError: local variable referenced before assignment**：
   - 初学者常见代码：
     ```python
     total = 0
     def add():
         total = total + 1  # 报错！
     ```
   - 原理解析：因为等号左侧有赋值，Python 在编译该函数时将 `total` 标记为局部变量；但执行到等号右侧计算 `total + 1` 时，局部 `total` 尚未被初始化赋予初始值，从而抛出致命的 `UnboundLocalError`！

---

### 五、本节小结
- 变量查找遵循 LEGB 原则，自内向外层层冒泡。
- 函数内部赋值默认创建局部变量，修改全局必须声明 `global`。
- 优先编写无副作用的纯函数，这是高质量数据处理代码的核心准则。
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "遇到 UnboundLocalError，通常是因为在函数内部给某个与全局同名的变量赋值，但在赋值前又读取了它。要么传参，要么显式 global。"
                },
                {
                    "kind": "interview",
                    "text": "LEGB 作用域顺序是 Python 核心常考题：Local -> Enclosing -> Global -> Built-in。"
                }
            ],
            "demos": [
                {
                    "title": "纯函数重构：消除可变参数的原地污染副作用",
                    "lang": "python",
                    "code": "# 演示如何编写无副作用的纯函数处理数据\nraw_tags = [\"python\", \"sql\", \"pandas\"]\n\n# 糟糕的非纯函数：就地修改了外部传入的列表\ndef bad_add_tag(tags, new_tag):\n    tags.append(new_tag)  # 破坏了调用方原有的列表！\n    return tags\n\n# 优秀的纯函数：基于浅拷贝或列表拼接，不破坏外部原数据\ndef pure_add_tag(tags, new_tag):\n    return tags + [new_tag]  # 返回全新列表\n\nnew_list = pure_add_tag(raw_tags, \"machine_learning\")\nprint(\"原始标签列表（未被污染）:\", raw_tags)\nprint(\"函数返回新标签列表:\", new_list)\n"
                }
            ]
        }
    ],
    "exercises": [
        {
            "id": "pyf-ex-6-1",
            "type": "single",
            "difficulty": 1,
            "question": "如果一个 Python 函数内部执行完毕后没有任何 `return` 语句，调用该函数的外部变量将接收到什么返回值？",
            "options": [
                {"value": "A", "label": "单例对象 None"},
                {"value": "B", "label": "数值 0"},
                {"value": "C", "label": "空字符串 \"\""},
                {"value": "D", "label": "抛出 NoReturnException 异常"}
            ],
            "answer": "A",
            "explanation": "在 Python 中，函数若没有显式 return，默认返回内建单例对象 None。",
            "tags": ["函数基础", "None"]
        },
        {
            "id": "pyf-ex-6-2",
            "type": "single",
            "difficulty": 2,
            "question": "分析以下代码的执行结果：\n```python\ndef append_val(val, lst=[]):\n    lst.append(val)\n    return lst\n\nprint(append_val(1))\nprint(append_val(2))\n```\n第二次打印输出的结果是？",
            "options": [
                {"value": "A", "label": "[1, 2]"},
                {"value": "B", "label": "[2]"},
                {"value": "C", "label": "[1]"},
                {"value": "D", "label": "抛出 RuntimeError"}
            ],
            "answer": "A",
            "explanation": "这是 Python 经典的“可变默认参数陷阱”。默认参数 lst=[] 在函数定义时仅初始化一次并持续驻留内存，多次调用若未传参，会一直共享并累加修改该列表，因此输出 [1, 2]。",
            "tags": ["可变默认参数", "陷阱"]
        },
        {
            "id": "pyf-ex-6-3",
            "type": "judge",
            "difficulty": 2,
            "question": "在 Python 函数中，可以定义任意数量的位置参数与默认参数，但语法规范要求：所有带有默认值的参数必须声明在没有默认值的参数之后。",
            "answer": True,
            "explanation": "正确！如果把带默认值的参数写在非默认参数之前（如 def f(a=1, b):），Python 会直接报 SyntaxError: non-default argument follows default argument。",
            "tags": ["参数规范", "语法"]
        },
        {
            "id": "pyf-ex-6-4",
            "type": "fill",
            "difficulty": 2,
            "question": "在 Python 函数定义中，使用符号 `_____` 可以收集任意数量的不定长关键字参数并将其打包为字典存储（填符号如 * 或 **）。",
            "blanks": [["**"]],
            "explanation": "** 用于收集任意数量的关键字参数（打包为 dict），单个 * 用于收集位置参数（打包为 tuple）。",
            "tags": ["kwargs", "参数解包"]
        },
        {
            "id": "pyf-ex-6-5",
            "type": "single",
            "difficulty": 3,
            "question": "Python 中查找变量时遵循著名的 LEGB 规则，这四个字母分别代表的检索范围由近到远依次是？",
            "options": [
                {"value": "A", "label": "Local（局部）-> Enclosing（闭包）-> Global（全局）-> Built-in（内建）"},
                {"value": "B", "label": "Local -> Global -> Enclosing -> Built-in"},
                {"value": "C", "label": "Global -> Local -> Built-in -> Enclosing"},
                {"value": "D", "label": "Built-in -> Global -> Enclosing -> Local"}
            ],
            "answer": "A",
            "explanation": "LEGB 代表 Local -> Enclosing -> Global -> Built-in，查找时从最内层局部向最外层内建逐层冒泡查找。",
            "tags": ["LEGB", "作用域"]
        },
        {
            "id": "pyf-ex-6-6",
            "type": "multiple",
            "difficulty": 3,
            "question": "关于编写高质量、工程级 Python 函数的原则，下列哪些说法符合行业最佳实践？",
            "options": [
                {"value": "A", "label": "尽量编写无副作用的纯函数，避免随意就地破坏外部传入的可变参数"},
                {"value": "B", "label": "若默认参数需要是列表或字典，推荐设为 None 并在函数体内动态初始化"},
                {"value": "C", "label": "为关键函数书写清晰的文档字符串（Docstring）与类型提示（Type Hints）"},
                {"value": "D", "label": "尽可能在所有函数内部滥用 global 变量来替代参数传递"}
            ],
            "answer": ["A", "B", "C"],
            "explanation": "滥用 global 属于反模式，会破坏函数的封装性与并发安全性；A、B、C 均为推荐的高质量工程实践。",
            "tags": ["函数设计", "工程规范"]
        },
        {
            "id": "pyf-ex-6-7",
            "type": "single",
            "difficulty": 4,
            "question": "观察以下代码：\n```python\nx = 10\ndef foo():\n    print(x)\n    x = 20\nfoo()\n```\n运行这段代码会发生什么情况？",
            "options": [
                {"value": "A", "label": "抛出 UnboundLocalError: local variable 'x' referenced before assignment"},
                {"value": "B", "label": "先打印 10，然后将 x 修改为 20"},
                {"value": "C", "label": "打印 20"},
                {"value": "D", "label": "抛出 NameError"}
            ],
            "answer": "A",
            "explanation": "因为函数体内部有 x = 20 赋值语句，Python 在编译该作用域时把 x 视为局部变量；而在执行 print(x) 时局部变量尚未赋值，因此会抛出 UnboundLocalError。",
            "tags": ["UnboundLocalError", "易错难点"]
        },
        {
            "id": "pyf-ex-6-8",
            "type": "code",
            "difficulty": 4,
            "question": "【动手编程】请编写一个带权平均数计算函数 `weighted_average(scores: list, weights: list = None) -> float`：\n- `scores` 为分数列表；`weights` 为权重列表（默认值为 None）；\n- 若 `weights` 为 None，计算各分数的算术平均值；\n- 若传入 `weights`，计算公式为 $\\frac{\\sum(\\text{score}_i \\times \\text{weight}_i)}{\\sum(\\text{weight}_i)}$；\n- 结果四舍五入保留 2 位小数返回；若 `scores` 为空，返回 0.0。",
            "starterCode": "def weighted_average(scores: list, weights: list = None) -> float:\n    # 请在此处编写计算逻辑\n    pass\n",
            "expectedOutput": "86.67",
            "answer": "def weighted_average(scores: list, weights: list = None) -> float:\n    if not scores:\n        return 0.0\n    if weights is None:\n        return round(sum(scores) / len(scores), 2)\n    total_w = sum(weights)\n    weighted_sum = sum(s * w for s, w in zip(scores, weights))\n    return round(weighted_sum / total_w, 2)",
            "tests": "assert weighted_average([]) == 0.0\nassert weighted_average([80, 90, 100]) == 90.0\n# 80*0.2 + 90*0.3 + 100*0.5 = 16 + 27 + 50 = 93.0\nassert weighted_average([80, 90, 100], [0.2, 0.3, 0.5]) == 93.0\nassert weighted_average([80, 90], [1, 2]) == 86.67\n",
            "explanation": "处理默认参数 weights=None，使用 zip() 迭代并分别计算加权和与权重和，返回保留 2 位小数的加权均值。",
            "tags": ["编程实操", "加权平均"]
        }
    ]
}

CHAPTER_7 = {
    "id": "pyf-c7",
    "courseId": "python-foundations-data",
    "order": 7,
    "title": "异常处理、错误定位与调试排错",
    "goal": "掌握语法错误与运行时异常的本质差异，熟练运用 try-except-else-finally 打造防御性代码，学会看懂 Traceback 调用栈与运用 assert 契约调试排错。",
    "lessons": [
        {
            "id": "pyf-l7-1",
            "title": "认识错误：语法错误 (SyntaxError) vs 运行时异常 (Exceptions)",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：搞清编译期语法错误与运行时异常的核心区别，熟悉数据分析中最常见的 6 大异常类型及其成因。
- **先修要求**：已具备基本编程与函数使用经验。

---

### 二、核心概念与术语解释

#### 1. 语法错误 (SyntaxError)：代码根本无法启动
在 Python 启动执行之前，编译器必须先对源代码进行词法与语法分析。如果有任何一行违反了 Python 的语法规则（如少写冒号、括号不配对、拼错关键字），**程序甚至一行都不会执行，直接被编译器拒绝！**

#### 2. 运行时异常 (Runtime Exception)：跑着跑着崩溃了
代码语法完全正确，但在运行过程中遭遇了不符合逻辑的操作或无法预料的外部异常数据，导致当前执行流被迫中断。如果不加捕获处理，程序会立即崩溃并向终端喷出红色报错。

#### 3. 数据分析与清洗最常见 6 大异常族谱
| 异常类型 | 常见触发场景 | 现实案例 |
| :--- | :--- | :--- |
| `ZeroDivisionError` | 数学除以零 | 计算转化率时分母点击数为 0 |
| `IndexError` | 序列索引越界 | 试图访问 `lst[10]`，但列表只有 3 个元素 |
| `KeyError` | 字典中不存在该键 | 访问 `row["customer_phone"]`，但该行没有手机号 |
| `TypeError` | 错误的对象类型操作 | 把字符串和整数直接用加号相加 `"10" + 5` |
| `ValueError` | 类型虽对但值无法解析 | `int("abc")` 或 `float("N/A")` 转换脏数据失败 |
| `FileNotFoundError` | 文件路径不存在 | 试图读取磁盘上不存在的 `sales_2024.csv` |

---

### 三、逐步代码演练与执行分析

```python
# 观察不同异常的触发
def trigger_exceptions():
    try:
        val = int("N/A")  # 触发 ValueError
    except ValueError as e:
        print(f"捕获到脏数据转换异常: {e}")

    try:
        res = 100 / 0     # 触发 ZeroDivisionError
    except ZeroDivisionError as e:
        print(f"捕获到除以零异常: {e}")

trigger_exceptions()
```

---

### 四、常见易错陷阱与排查技巧
1. **混淆 TypeError 与 ValueError**：
   - 传了根本不支持该操作的对象类型（如对列表求绝对值 `abs([1, 2])`）是 `TypeError`；
   - 类型参数接受该类对象，但对象内部的具体值格式不对（如 `int("xyz")`，`int()` 接受字符串，但 `xyz` 不是合法的数字格式）是 `ValueError`。

---

### 五、本节小结
- 语法错误程序完全不启动；运行时异常在运行时遇到非法操作时爆发。
- 熟记 KeyError, IndexError, ValueError, TypeError 的触发特征，是精准调试的前提。
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "很多初学者看到红色报错就心慌。其实 Traceback 是排查问题最好的朋友，直接看最底下一行就是具体的异常类型和错误描述。"
                }
            ],
            "demos": [
                {
                    "title": "探测数据清洗中的常见异常类型",
                    "lang": "python",
                    "code": "# 模拟不同脏数据输入引发的不同标准异常\nsamples = [\"100\", \"0\", \"N/A\", None]\n\nfor s in samples:\n    try:\n        num = int(s)\n        rate = 1000 / num\n        print(f\"输入 {repr(s)}: 计算成功 -> {rate:.2f}\")\n    except ValueError:\n        print(f\"输入 {repr(s)}: [ValueError] 字符串无法转为有效整数！\")\n    except ZeroDivisionError:\n        print(f\"输入 {repr(s)}: [ZeroDivisionError] 分母为 0 无法计算！\")\n    except TypeError:\n        print(f\"输入 {repr(s)}: [TypeError] 空对象 None 无法传入 int()！\")\n"
                }
            ]
        },
        {
            "id": "pyf-l7-2",
            "title": "防御性编程：try-except-else-finally 与主动抛错 raise",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：掌握完整的 `try-except-else-finally` 四段式异常处理架构，学会捕获具体异常并提取错误详情，掌握如何使用 `raise` 主动抛出合乎业务逻辑的异常。
- **先修要求**：了解核心异常类型。

---

### 二、核心概念与术语解释

#### 1. 四段式异常完整架构
```python
try:
    # 可能会发生异常的危险代码块
    f = open("data.csv")
    data = f.read()
except FileNotFoundError as err:
    # 发生了特定异常时执行的救火/降级逻辑
    print(f"日志：文件未找到，启用备用数据。原因: {err}")
else:
    # 当且仅当 try 块中完全没有发生任何异常时，才会执行！
    print("数据读取成功，开始进一步解析。")
finally:
    # 无论是否发生异常、无论是否在 except 里执行了 return，必定会执行！
    # 常用于关闭文件句柄、释放数据库连接、清理临时资源
    print("清理流程：释放 I/O 资源。")
```

#### 2. 反模式警示：绝不要写裸 `except:` 或 `except Exception:`！
初学者为了“不让程序报错”，经常写：
```python
try:
    process_data()
except:  # 灾难级反模式！
    pass
```
**为什么是灾难？**
- 裸的 `except:` 不仅捕获普通错误，还会**捕获 `KeyboardInterrupt`（用户按 Ctrl+C 想强行停止程序都停不下来）和 `SystemExit`**！
- 它悄悄把真正的 bug（如打错变量名拼写的 NameError）也生吞活剥了，导致程序逻辑错误后继续带着脏数据疯狂跑下去，灾难在下游不可挽回地爆发！
- **原则：永远显式捕获你预料之中的具体异常（如 `except (ValueError, KeyError):`）**。

#### 3. 主动抛错：`raise`
当检测到外部传入的业务参数严重违规时，应当主动使用 `raise` 阻止破坏性操作继续：
```python
def set_age(age):
    if not isinstance(age, int) or age < 0 or age > 150:
        raise ValueError(f"年龄数值非法: {age}")
```

---

### 三、逐步代码演练与执行分析

```python
# 健壮的数据解析函数
def parse_percentage(text: str) -> float:
    \"\"\"将诸如 '85.5%' 的字符串解析为 0.855 浮点数\"\"\"
    if not isinstance(text, str):
        raise TypeError(f"输入必须为字符串，收到: {type(text).__name__}")
    
    clean_text = text.strip()
    if not clean_text.endswith("%"):
        raise ValueError(f"格式错误，缺少百分号: '{text}'")
        
    number_part = clean_text[:-1]
    return float(number_part) / 100.0

print("解析成功:", parse_percentage(" 92.5% "))
try:
    parse_percentage("abc")
except ValueError as e:
    print("被安全拦截:", e)
```

---

### 四、常见易错陷阱与排查技巧
1. **try 块圈得过大**：
   - 不要把整整 50 行代码全部塞进一个 try 块里！应该只用 try 精确包裹真正可能发生 I/O 或转换错误的那两三行代码，否则难以定位具体是哪一行爆出的异常。

---

### 五、本节小结
- 熟练掌握 try-except-else-finally 各部分执行时机。
- 严禁裸写 `except:` 吞掉所有错误，必须捕获精准异常。
- 主动使用 `raise` 拦截非法业务入参。
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "切勿裸写 except: pass！这被称为'错误黑洞'，会掩盖真正的代码拼写 bug，导致排错极其痛苦。"
                },
                {
                    "kind": "performance",
                    "text": "不要用 try-except 来实现普通的条件判断逻辑（EAFP 虽好，但在高频循环里频繁触发真实异常是有开销的）。"
                }
            ],
            "demos": [
                {
                    "title": "try-except-else-finally 完整流转演示",
                    "lang": "python",
                    "code": "# 演示四段式在数据转换与资源管理中的清晰职责\ndef safe_divide(a, b):\n    print(f\"\\n--- 开始计算 {a} / {b} ---\")\n    result = None\n    try:\n        result = a / b\n    except ZeroDivisionError:\n        print(\"[except 块]: 捕获除以零，将结果置为 0.0\")\n        result = 0.0\n    else:\n        print(\"[else 块]: 计算极其顺利，无任何异常！\")\n    finally:\n        print(\"[finally 块]: 无论发生什么，此处必须收尾记录审计日志！\")\n    return result\n\nsafe_divide(10, 2)\nsafe_divide(10, 0)\n"
                }
            ]
        },
        {
            "id": "pyf-l7-3",
            "title": "读懂 Traceback、断言 (assert) 与调试排错思维",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：掌握从下往上阅读 Traceback 调用栈的黄金排查法，熟练运用 `assert` 契约断言做防御性自检，掌握科学的调试排错策略。
- **先修要求**：已了解 Python 函数调用与异常捕获。

---

### 二、核心概念与术语解释

#### 1. 黄金法则：Traceback（回溯调用栈）必须“从下往上看”！
当 Python 发生未捕获异常崩溃时，控制台输出的一长串日志称为 **Traceback**。
很多新手从第一行看起，看了半天全是系统底层库的代码，不知所云。
**高效排查法**：
1. **第一眼看最底下一行**：直接看是什么错误类型和错误提示信息（如 `ValueError: could not convert string to float: 'N/A'`）；
2. **第二眼从下往上找属于你自己的代码文件**：跳过 Python 系统库代码，找到最后一个出现在你写的 `.py` 脚本里的文件名与行号；
3. **第三眼点击行号直达现场**：查看发生异常的那一行表达式所涉及的变量当时的实际值是什么。

```
Traceback (most recent call last):
  File "data_pipeline.py", line 45, in <module>
    run_daily_etl()
  File "data_pipeline.py", line 28, in run_daily_etl
    clean_sales_record(row)
  File "data_pipeline.py", line 12, in clean_sales_record
    amount = float(raw_price)  <--- 现场！第 12 行！
ValueError: could not convert string to float: '未知'  <--- 第一眼看这里！
```

#### 2. 断言调试：`assert` 契约编程
用于在代码关键节点声明“程序员认为此时此刻必须为真的条件”：
```python
assert len(user_ids) == len(user_names), "用户 ID 与姓名数量必须严格一致！"
```
如果条件为 False，解释器会立即抛出 `AssertionError`，并附带你写的提示信息，直接在问题发生的源头阻断蔓延！

#### 3. 科学排错四步法
1. **复现（Reproduce）**：找到能 100% 稳定触发该报错的最小数据输入；
2. **隔离（Isolate）**：将出问题的函数单独拿出来，用单元代码测试，剥离无关业务背景；
3. **审查变量（Inspect）**：使用 `print(f"{var=}")` 或断点查看变量类型与实际内容；
4. **修复与验证（Fix & Verify）**：修复代码并传入正常数据与极端边界数据交叉验证。

---

### 三、逐步代码演练与执行分析

```python
def calculate_conversion_rate(visitors: int, buyers: int) -> float:
    # 使用 assert 进行内部防御契约校验
    assert visitors >= 0, f"访客数不能为负: {visitors}"
    assert buyers >= 0, f"购买人数不能为负: {buyers}"
    assert buyers <= visitors, f"购买人数 ({buyers}) 不能大于访客总数 ({visitors})"
    
    if visitors == 0:
        return 0.0
    return round(buyers / visitors, 4)

print("转化率正常:", calculate_conversion_rate(1000, 85))
try:
    calculate_conversion_rate(100, 150)
except AssertionError as err:
    print("契约断言拦截非法业务数据:", err)
```

---

### 四、常见易错陷阱与排查技巧
1. **不要用 assert 处理正常的外部用户输入验证**：
   - Python 运行时如果加了优化参数 `-O`（如 `python -O script.py`），解释器会直接**跳过并忽略所有的 assert 语句**！
   - 因此，面向真实外部用户的参数检验必须使用 `if not ...: raise ValueError(...)`，而 `assert` 只用于内部逻辑自检与测试用例中。

---

### 五、本节小结
- 看 Traceback 从最底行看起，直击错误类型与自身代码行号。
- `assert` 是代码契约的自检利器，但业务验证应使用 `raise`。
- 遵循“复现-隔离-审查-修复”的科学排错思维。
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "切勿将 assert 用于关键生产业务权限校验，因为在生产环境以 python -O 运行时，所有 assert 会被解释器直接忽略！"
                }
            ],
            "demos": [
                {
                    "title": "断言与错误回溯模拟排查",
                    "lang": "python",
                    "code": "# 模拟调用链发生异常并提取 Traceback 信息\nimport traceback\n\ndef level_3_clean(val):\n    return float(val.replace(\"$\", \"\"))\n\ndef level_2_process(item):\n    return level_3_clean(item['price'])\n\ndef level_1_main():\n    bad_item = {'id': 101, 'price': 'FREE'}  # 非法数据\n    try:\n        level_2_process(bad_item)\n    except ValueError as e:\n        print(\"\\n=== 捕获到深层调用异常，模拟打印回溯栈 ===\")\n        traceback.print_exc(limit=3)\n\nlevel_1_main()\n"
                }
            ]
        }
    ],
    "exercises": [
        {
            "id": "pyf-ex-7-1",
            "type": "single",
            "difficulty": 1,
            "question": "当尝试访问一个列表中并不存在的下标索引（例如列表长度为 3，却执行 `lst[10]`）时，Python 会抛出哪种运行时异常？",
            "options": [
                {"value": "A", "label": "IndexError"},
                {"value": "B", "label": "KeyError"},
                {"value": "C", "label": "ValueError"},
                {"value": "D", "label": "TypeError"}
            ],
            "answer": "A",
            "explanation": "访问序列（列表、元组、字符串）越界的索引时抛出 IndexError；访问字典不存在的键抛出 KeyError。",
            "tags": ["异常类型", "IndexError"]
        },
        {
            "id": "pyf-ex-7-2",
            "type": "single",
            "difficulty": 2,
            "question": "在 `try...except...else...finally` 四段式异常处理结构中，关于 `finally` 块的执行时机，以下说法正确的是？",
            "options": [
                {"value": "A", "label": "无论是否发生异常，甚至在 try 或 except 包含 return 语句时，finally 块都必定会被执行"},
                {"value": "B", "label": "只有在没有发生任何异常时才会执行"},
                {"value": "C", "label": "只有在发生异常且未被捕获时才会执行"},
                {"value": "D", "label": "只要 try 块里执行了 return，finally 块就会被直接跳过"}
            ],
            "answer": "A",
            "explanation": "finally 块专门用于保证关键资源回收（如关闭文件、关闭连接），无论 try/except 成功、失败甚至包含 return 提前退出，finally 均会被强制执行。",
            "tags": ["finally", "异常架构"]
        },
        {
            "id": "pyf-ex-7-3",
            "type": "judge",
            "difficulty": 2,
            "question": "在 Python 生产级代码编写中，直接裸写 `except:` 捕获并忽略所有异常是一种推荐的消除报错的优雅做法。",
            "answer": False,
            "explanation": "错误！这是一种严重的反模式（称为错误黑洞），它会吞掉语法拼写错误、NameError 甚至阻断用户用 Ctrl+C 终止程序的 KeyboardInterrupt 信号，使代码难以排查维护。",
            "tags": ["代码规范", "反模式"]
        },
        {
            "id": "pyf-ex-7-4",
            "type": "fill",
            "difficulty": 2,
            "question": "在 Python 中，当检测到业务参数不合法时，若要主动抛出一个数值异常，使用的关键字是 `_____ ValueError(\"参数错误\")`。",
            "blanks": [["raise"]],
            "explanation": "Python 使用 raise 关键字主动引发并抛出异常（类似于 Java 中的 throw）。",
            "tags": ["raise", "主动抛错"]
        },
        {
            "id": "pyf-ex-7-5",
            "type": "single",
            "difficulty": 3,
            "question": "分析以下代码的执行输出：\n```python\ndef test():\n    try:\n        return 1\n    finally:\n        return 2\nprint(test())\n```\n最终打印的结果是：",
            "options": [
                {"value": "A", "label": "2"},
                {"value": "B", "label": "1"},
                {"value": "C", "label": "1 和 2"},
                {"value": "D", "label": "抛出 SyntaxError"}
            ],
            "answer": "A",
            "explanation": "当 finally 块中包含显式的 return 时，它会覆盖掉之前 try 块中准备返回的值 1，最终函数返回 2（注意：在 finally 中写 return 属于易引起困惑的不良实践）。",
            "tags": ["finally", "代码阅读"]
        },
        {
            "id": "pyf-ex-7-6",
            "type": "multiple",
            "difficulty": 3,
            "question": "在控制台排查 Python 程序报错时，关于阅读 Traceback（回溯调用栈）的高效方法包括？",
            "options": [
                {"value": "A", "label": "第一眼直接看 Traceback 的最底下一行，迅速明确具体的异常名称与详细错误描述"},
                {"value": "B", "label": "从最底层往上回溯，找到最后一个属于自己项目编写的 .py 代码文件和行号"},
                {"value": "C", "label": "必须从第一行开始逐行阅读所有 Python 系统标准库与第三方库内部源码"},
                {"value": "D", "label": "结合代码行号定位案发现场，核查当时参与计算的关键变量的类型和取值"}
            ],
            "answer": ["A", "B", "D"],
            "explanation": "C 选项是低效的做法，因为大部分报错是由自己业务代码传入不合法参数引起的，应优先聚焦自身脚本的调用现场；A、B、D 构成了黄金排错法。",
            "tags": ["Traceback", "排错技巧"]
        },
        {
            "id": "pyf-ex-7-7",
            "type": "single",
            "difficulty": 3,
            "question": "在 Python 3 中，表达式 `assert 10 > 20, \"数值错误\"` 执行时会抛出何种异常？",
            "options": [
                {"value": "A", "label": "AssertionError: 数值错误"},
                {"value": "B", "label": "ValueError: 数值错误"},
                {"value": "C", "label": "SyntaxError: invalid assertion"},
                {"value": "D", "label": "不会报错，直接返回 False"}
            ],
            "answer": "A",
            "explanation": "assert 后跟的表达式若求值为假，Python 会直接抛出 AssertionError，并将逗号后面的说明字符串作为异常信息打印。",
            "tags": ["assert", "断言"]
        },
        {
            "id": "pyf-ex-7-8",
            "type": "code",
            "difficulty": 4,
            "question": "【动手编程】请编写一个安全整型转换计算器 `safe_parse_and_sum(str_list: list) -> int`：\n- 传入一个可能包含非法文本的字符串列表（如 `['10', 'abc', '20', None]`）；\n- 遍历列表，尝试将每个元素转为整数并累加；\n- 若遇到无法转为整数的值（捕获 `(ValueError, TypeError)`），跳过该项，不要使程序崩溃；\n- 返回累加的总和（若没有有效整数返回 0）。",
            "starterCode": "def safe_parse_and_sum(str_list: list) -> int:\n    # 请在循环中运用 try-except 容错\n    pass\n",
            "expectedOutput": "30",
            "answer": "def safe_parse_and_sum(str_list: list) -> int:\n    total = 0\n    for item in str_list:\n        try:\n            total += int(item)\n        except (ValueError, TypeError):\n            continue\n    return total",
            "tests": "assert safe_parse_and_sum(['10', 'abc', '20', None]) == 30\nassert safe_parse_and_sum([]) == 0\nassert safe_parse_and_sum(['x', 'y', 'z']) == 0\nassert safe_parse_and_sum(['-5', '15']) == 10\n",
            "explanation": "在 for 循环内部用 try-except 包裹 int(item)，捕获 ValueError 和 TypeError 后执行 continue 跳过，平稳完成脏数据清洗累加。",
            "tags": ["编程实操", "异常容错"]
        }
    ]
}

CHAPTER_8 = {
    "id": "pyf-c8",
    "courseId": "python-foundations-data",
    "order": 8,
    "title": "文件路径、文本读写与 CSV/JSON 交互",
    "goal": "掌握 with open 上下文管理器与 UTF-8 编码防乱码机制，熟练使用内置 csv 模块与 json 模块处理结构化与半结构化表格数据。",
    "lessons": [
        {
            "id": "pyf-l8-1",
            "title": "文件 I/O 基石：with open() 上下文管理器与 UTF-8 编码防乱码",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：理解操作系统的文件句柄与缓冲区机制，熟练使用 `with open()` 避免资源泄漏，深刻理解字符编码（ASCII, GBK, UTF-8）原理，彻底消灭 `UnicodeDecodeError` 乱码。
- **先修要求**：熟练掌握字符串与基本异常处理。

---

### 二、核心概念与术语解释

#### 1. 为什么必须用 `with open()` 上下文管理器？
传统文件读写写法：
```python
f = open("data.txt", "r")
content = f.read()
f.close()  # 必须手动关闭
```
**严重隐患**：如果 `f.read()` 中途发生异常或内存溢出，代码直接跳转中断，`f.close()` 永远无法被执行！操作系统底层的文件描述符（File Descriptor）将一直被占用泄漏。
**现代标准写法：上下文管理器（`with` 语句）**：
```python
with open("data.txt", "r", encoding="utf-8") as f:
    content = f.read()
# 一旦缩进代码块结束（无论正常结束还是发生异常崩溃），Python 底层会自动且强制调用 close()！
```

#### 2. 打开模式（Mode）对比
| 模式 | 含义 | 说明 |
| :--- | :--- | :--- |
| `'r'` | **只读（默认）** | 文件不存在时抛出 `FileNotFoundError` |
| `'w'` | **写入（覆盖模式）** | **危险！文件若已存在，内容直接被清空抹除！**文件不存在则新建 |
| `'a'` | **追加模式（Append）** | 在文件末尾继续追加内容，不破坏已有内容 |
| `'rb'` / `'wb'` | **二进制读写** | 读写图片、音频、PDF、pickle 序列化等非纯文本文件 |

#### 3. 彻底告别中文乱码：字符编码的本质
- **Unicode（如 UTF-8）**：全球统一编码字符集，能表示全世界所有语言文字；
- **Windows 的历史遗留坑**：在中文版 Windows 上，如果不显式指定 `encoding`，Python 默认会使用系统默认编码 `gbk`！如果读取由 Mac/Linux/现代系统保存的 UTF-8 文件，会直接爆炸抛出：
  `UnicodeDecodeError: 'gbk' codec can't decode byte ... in position ...`
- **铁律：只要打开文本文件，永远显式写明 `encoding="utf-8"`**！

---

### 三、逐步代码演练与执行分析

```python
# 演示文本文件的写入与流式按行读取
import io

# 模拟文件写入操作
log_data = ["2024-05-01 10:00:00 [INFO] 系统启动", "2024-05-01 10:05:00 [WARN] 内存占用偏高", "2024-05-01 10:10:00 [INFO] 任务完成"]

# 在内存中使用 StringIO 模拟安全读写
virtual_file = io.StringIO()
for line in log_data:
    virtual_file.write(line + "\\n")

# 重置指针到文件开头
virtual_file.seek(0)

# 内存友好地按行遍历（面对 10GB 大文件绝不爆内存！）
for idx, line in enumerate(virtual_file, start=1):
    print(f"日志第 {idx} 行: {line.strip()}")
```

---

### 四、常见易错陷阱与排查技巧
1. **大文件千万不要直接 `f.read()` 或 `f.readlines()`**：
   - `f.read()` 会把整个文件的所有字节一次性强行载入内存；如果遇到 5GB 的日志文件，机器内存会瞬间被撑爆直接 OOM 崩溃！
   - **正确做法**：直接把文件句柄 `f` 当作迭代器使用：`for line in f:`，Python 底层每次只从磁盘预读一行，内存开销恒定只有几 KB！

---

### 五、本节小结
- 读写文件一律使用 `with open(..., encoding='utf-8')`。
- `'w'` 模式会清空原文件，`'a'` 模式为安全追加。
- 逐行处理大文件使用 `for line in f:`，坚决避免一次性 `read()`。
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "切记：在 Windows 上 open() 必须显式指定 encoding='utf-8'，否则会默认使用 GBK 编码导致解码中文抛错。"
                },
                {
                    "kind": "performance",
                    "text": "读取几十 GB 的超大日志文件时，直接用 for line in f: 迭代逐行处理，内存占用极低且速度飞快。"
                }
            ],
            "demos": [
                {
                    "title": "流式逐行写入与大文件行迭代",
                    "lang": "python",
                    "code": "# 模拟生成与按行过滤大型订单日志\nimport io\n\nlog_stream = io.StringIO()\n# 模拟批量追加写入\nlog_stream.write(\"ORDER_101,SUCCESS,199.0\\n\")\nlog_stream.write(\"ORDER_102,FAILED,0.0\\n\")\nlog_stream.write(\"ORDER_103,SUCCESS,850.5\\n\")\n\nlog_stream.seek(0)\nprint(\"=== 成功订单过滤输出 ===\")\nfor row in log_stream:\n    row = row.strip()\n    if \",SUCCESS,\" in row:\n        order_id, status, amount = row.split(\",\")\n        print(f\"订单号: {order_id} | 实付: ¥{float(amount):.2f}\")\n"
                }
            ]
        },
        {
            "id": "pyf-l8-2",
            "title": "结构化表格处理：内置 csv 模块与 DictReader 高级实战",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：掌握 CSV（逗号分隔值）表格格式规范，熟练使用内置 `csv.reader` 与 `csv.DictReader` 解析文本表格，掌握 `csv.writer` 与 `csv.DictWriter` 导出清洗后数据。
- **先修要求**：熟练掌握文件上下文管理器与字典、列表操作。

---

### 二、核心概念与术语解释

#### 1. 为什么不用简单的 `str.split(\",\")` 解析 CSV？
很多初学者以为 CSV 只是逗号拼接，直接写 `line.split(\",\")`。
**致命缺陷**：
真实商业数据中，很多字段内容自身就包含英文逗号或换行符！例如收货地址 `"北京市海淀区, 中关村南大街, 1号院"`。
CSV 标准规范（RFC 4180）要求在字段本身含逗号时用双引号包裹。如果用简单的 `split`，整行数据会被切得粉碎！
**结论：必须使用专门的 `csv` 模块处理**。

#### 2. `csv.reader` vs `csv.DictReader`
- **`csv.reader(f)`**：把每一行解析为一个**字符串列表** `['U101', '张三', '199.0']`。如果需要跳过第一行表头，使用 `header = next(reader)`；
- **`csv.DictReader(f)`（强烈推荐！）**：自动将 CSV 文件的第一行作为表头键，后续每一行数据自动包装为**字典（`dict`）**：
  `{'user_id': 'U101', 'name': '张三', 'price': '199.0'}`。
  **优势**：通过列名访问字段（`row['price']`），即便后续原文件调换了列的先后顺序，代码也不会崩溃！

#### 3. CSV 导出注意事项：`newline=\"\"`
在 Windows 平台使用 `csv.writer` 打开文件时，如果不指定 `newline=\"\"`，每次写入一行会自动多产生一个空行（Windows CRLF 回车换行机制冲突导致）！
**标准写入规范**：
```python
with open("output.csv", "w", encoding="utf-8", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=["id", "name", "score"])
    writer.writeheader()  # 写入表头
    writer.writerows(data_list)
```

---

### 三、逐步代码演练与执行分析

```python
import csv
import io

csv_content = \"\"\"order_id,customer,amount,status
ORD-001,Alice,150.00,PAID
ORD-002,Bob,89.50,REFUNDED
ORD-003,Charlie,320.00,PAID
\"\"\"

# 使用 DictReader 优雅解析表格数据
f = io.StringIO(csv_content.strip())
reader = csv.DictReader(f)

total_revenue = 0.0
paid_orders = []

for row in reader:
    if row["status"] == "PAID":
        total_revenue += float(row["amount"])
        paid_orders.append(row["order_id"])

print(f"已支付订单列表: {paid_orders}")
print(f"有效销售总额: ¥{total_revenue:,.2f}")
```

---

### 四、常见易错陷阱与排查技巧
1. **CSV 读取出的所有字段全都是字符串类型**：
   - 无论数字 `150.00` 看起来多像数字，在从 CSV 读出来时它依然是 `str`！直接做大小比较 `'100' < '20'` 会按字符串字典序得出 `True` 的荒谬结果！参与计算前必须手动 `float()` 或 `int()` 转换。

---

### 五、本节小结
- 拒绝手写 `split(",")`，拥抱标准 `csv` 模块。
- `csv.DictReader` 按列名存取，代码稳健性远胜数字下标。
- 写入 CSV 务必配置 `newline=""` 和 `encoding="utf-8"`。
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "牢记：CSV 读出的字段全是 str 类型！如果不做 float(row['amount']) 转换直接求和，会发生字符串拼接灾难。"
                }
            ],
            "demos": [
                {
                    "title": "DictReader 与 DictWriter 表格数据清洗管道",
                    "lang": "python",
                    "code": "# 模拟读取脏订单 CSV，转换金额为美元并导出干净 CSV\nimport csv\nimport io\n\nraw_csv = '''id,item,price_cny\n101,机械键盘,299.00\n102,降噪耳机,599.00\n103,无线鼠标,89.00\n'''\n\nin_stream = io.StringIO(raw_csv.strip())\nout_stream = io.StringIO()\n\nreader = csv.DictReader(in_stream)\nfieldnames = ['id', 'item', 'price_cny', 'price_usd']\nwriter = csv.DictWriter(out_stream, fieldnames=fieldnames, lineterminator='\\n')\nwriter.writeheader()\n\nfor row in reader:\n    cny = float(row['price_cny'])\n    row['price_usd'] = round(cny / 7.2, 2)\n    writer.writerow(row)\n\nprint(\"=== 清洗并追加汇率列后的 CSV 内容 ===\")\nprint(out_stream.getvalue())\n"
                }
            ]
        },
        {
            "id": "pyf-l8-3",
            "title": "半结构化互联网标准：json 模块编解码与数据映射",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：掌握 JSON（JavaScript Object Notation）数据交换格式与 Python 类型的精准映射关系，熟练运用 `json.loads`, `json.dumps`, `json.load`, `json.dump`，掌握中文字符保真与格式化缩进。
- **先修要求**：熟练掌握字典、列表与文件 I/O。

---

### 二、核心概念与术语解释

#### 1. JSON 与 Python 类型映射对照表
JSON 是现代 API 接口、网络爬虫、配置文件的事实标准。
| JSON 类型 | Python 类型 |
| :--- | :--- |
| `object` (`{}`) | `dict` |
| `array` (`[]`) | `list` |
| `string` (`\"\"`) | `str` |
| `number` (`123` / `3.14`) | `int` / `float` |
| `true` / `false` | `True` / `False` |
| `null` | `None` |

#### 2. 四大核心函数区别
- **带 `s` 的处理内存字符串（String）**：
  - `json.loads(json_str)`：把 **JSON 字符串** 反序列化为 **Python 对象**（Load String）；
  - `json.dumps(obj)`：把 **Python 对象** 序列化为 **JSON 字符串**（Dump to String）；
- **不带 `s` 的直接对接磁盘文件（File-like Stream）**：
  - `json.load(file_handle)`：直接从打开的文件句柄读取并解析；
  - `json.dump(obj, file_handle)`：直接把对象序列化并写入文件句柄。

#### 3. 序列化两大必用参数
默认情况下，`json.dumps` 会把非 ASCII 字符（如所有中文汉字）转义为 `\\u4e2d\\u6587` 形式，且默认挤在一行没有换行：
- **`ensure_ascii=False`**：禁止 ASCII 转义，直接输出看得懂的人类可读中文汉字！
- **`indent=2`**：指定按 2 个空格缩进美化排版，输出赏心悦目的树状 JSON。

---

### 三、逐步代码演练与执行分析

```python
import json

# 1. 模拟从 Web API 接收到的 JSON 响应字符串
response_json_text = '''
{
  "code": 200,
  "data": {
    "user_id": "U9527",
    "name": "知序学员",
    "is_active": true,
    "cart": [
      {"item": "Python 编程从零到一", "price": 68.0},
      {"item": "数据分析实战讲义", "price": 88.5}
    ]
  }
}
'''

# 反序列化
payload = json.loads(response_json_text)
user_name = payload["data"]["name"]
cart_items = payload["data"]["cart"]
cart_total = sum(item["price"] for item in cart_items)

print(f"用户: {user_name} | 购物车商品数: {len(cart_items)} | 购物车总价: ¥{cart_total:.2f}")

# 2. 序列化为美化的中文 JSON 文本
summary_report = {
    "report_title": "月度消费看板",
    "total_spent": cart_total,
    "status": "已结算"
}
pretty_json = json.dumps(summary_report, ensure_ascii=False, indent=2)
print("美化输出 JSON:")
print(pretty_json)
```

---

### 四、常见易错陷阱与排查技巧
1. **JSON 的双引号规范**：
   - JSON 语法极其严苛：**所有的字符串和对象 key 必须使用双引号 `\"`，绝对不能使用单引号 `'`**！如果用 `json.loads(\"{'name': 'Alice'}\")`，会直接引发 `json.decoder.JSONDecodeError`！

---

### 五、本节小结
- JSON 是 API 与半结构化数据交互标准，严格对应 Python 容器。
- 内存转换用 `loads/dumps`，文件读写用 `load/dump`。
- 中文输出切记带上 `ensure_ascii=False`。
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "JSON 规范中字符串和 key 必须是双引号！在 Python 中把带单引号的字典字符串传给 json.loads() 会直接报 JSONDecodeError。"
                }
            ],
            "demos": [
                {
                    "title": "API 嵌套 JSON 解析与指标提炼实战",
                    "lang": "python",
                    "code": "# 模拟解析微服务返回的用户资产嵌套 JSON\nimport json\n\napi_payload = '''\n{\n    \"user\": \"张伟\",\n    \"wallets\": [\n        {\"currency\": \"CNY\", \"balance\": 12500.50},\n        {\"currency\": \"USD\", \"balance\": 2100.00}\n    ],\n    \"verified\": true\n}\n'''\n\ndata = json.loads(api_payload)\nprint(f\"用户名称: {data['user']}\")\nprint(f\"实名认证状态: {'已认证' if data['verified'] else '未认证'}\")\n\ntotal_cny_equivalent = 0.0\nfor w in data['wallets']:\n    if w['currency'] == 'CNY':\n        total_cny_equivalent += w['balance']\n    elif w['currency'] == 'USD':\n        total_cny_equivalent += w['balance'] * 7.2\n\nprint(f\"账户折合人民币总资产: ¥{total_cny_equivalent:,.2f}\")\n"
                }
            ]
        }
    ],
    "exercises": [
        {
            "id": "pyf-ex-8-1",
            "type": "single",
            "difficulty": 1,
            "question": "使用 Python 的内置 `open(file, mode)` 函数，如果以 `'w'` 模式打开一个已经存在且包含重要内容的文件，会发生什么？",
            "options": [
                {"value": "A", "label": "原文件内容会被立即清空抹除，从头开始写入新内容"},
                {"value": "B", "label": "会在原文件末尾安全追加新内容，不破坏旧数据"},
                {"value": "C", "label": "抛出 FileExistsError 异常"},
                {"value": "D", "label": "自动在同目录下创建带时间戳的备份文件"}
            ],
            "answer": "A",
            "explanation": "'w' 模式是截断覆盖写入模式（truncate and write），若文件已存在，会立即清空其原有全部内容；安全追加应使用 'a' 模式。",
            "tags": ["文件I/O", "打开模式"]
        },
        {
            "id": "pyf-ex-8-2",
            "type": "single",
            "difficulty": 2,
            "question": "在 Python 的标准库 `json` 中，函数 `json.loads()` 与 `json.load()` 的核心区别是？",
            "options": [
                {"value": "A", "label": "json.loads() 解析内存中的 JSON 字符串；json.load() 直接读取并解析磁盘文件流句柄"},
                {"value": "B", "label": "json.loads() 支持中文；json.load() 不支持中文"},
                {"value": "C", "label": "两者没有任何区别，纯粹是别名"},
                {"value": "D", "label": "json.loads() 只能解析数字，不能解析字典"}
            ],
            "answer": "A",
            "explanation": "带 s（String）的 json.loads() 接收 Python str 文本并解析；不带 s 的 json.load() 接收已打开的文件对象并读取解析。",
            "tags": ["json", "内置库"]
        },
        {
            "id": "pyf-ex-8-3",
            "type": "judge",
            "difficulty": 2,
            "question": "使用内置模块 `csv.DictReader` 读取 CSV 数据时，会自动将文件第一行识别为列名字段，并将后续每一行包装为一个字典。",
            "answer": True,
            "explanation": "正确！csv.DictReader 自动将第一行读取为字段名表头，并在迭代每一行时生成以表头为 Key、当前行数据为 Value 的字典。",
            "tags": ["csv", "DictReader"]
        },
        {
            "id": "pyf-ex-8-4",
            "type": "fill",
            "difficulty": 2,
            "question": "使用 `json.dumps()` 导出含有中文的字典时，为了防止中文汉字被转义为 `\\uXXXX` 格式，必须将参数 _____ 设置为 False。",
            "blanks": [["ensure_ascii"]],
            "explanation": "参数 ensure_ascii 默认为 True，设为 False 后将允许直接输出 Unicode 中文字符。",
            "tags": ["json", "参数配置"]
        },
        {
            "id": "pyf-ex-8-5",
            "type": "single",
            "difficulty": 3,
            "question": "在 Windows 操作系统中读取由 Linux 系统生成的 UTF-8 编码文本文件时，如果使用 `with open('file.txt', 'r') as f:` 而不传 `encoding` 参数，最可能抛出何种异常？",
            "options": [
                {"value": "A", "label": "UnicodeDecodeError: 'gbk' codec can't decode byte ..."},
                {"value": "B", "label": "FileNotFoundError"},
                {"value": "C", "label": "PermissionError"},
                {"value": "D", "label": "BufferError"}
            ],
            "answer": "A",
            "explanation": "中文 Windows 系统默认的 ANSI 编码是 GBK。如果不显式传递 encoding='utf-8'，Python 会尝试用 GBK 规则去解码 UTF-8 字节流，遇到无法匹配的字节就会抛出 UnicodeDecodeError。",
            "tags": ["编码", "Windows特性"]
        },
        {
            "id": "pyf-ex-8-6",
            "type": "multiple",
            "difficulty": 3,
            "question": "在 Python 中使用 `with open(...)` 语句操作文件，相比于手写 `open(...)` 和 `close()` 的核心优势包括？",
            "options": [
                {"value": "A", "label": "无论代码正常走完还是在中途发生致命异常崩溃，都会强制自动释放文件句柄"},
                {"value": "B", "label": "使代码缩进结构更加层次分明，明确标示出文件的有效生命周期范围"},
                {"value": "C", "label": "彻底消灭因为人为遗忘 close() 导致的文件句柄泄漏"},
                {"value": "D", "label": "能够使普通的机械硬盘读写速度自动提升 100 倍"}
            ],
            "answer": ["A", "B", "C"],
            "explanation": "with 语句通过上下文管理协议（__enter__ / __exit__）保障资源安全关闭，消灭句柄泄漏；D 属于夸张虚假选项。",
            "tags": ["上下文管理器", "with"]
        },
        {
            "id": "pyf-ex-8-7",
            "type": "single",
            "difficulty": 4,
            "question": "分析以下通过 JSON 解析数据的代码：\n```python\nimport json\nraw_data = \"{'status': 'success', 'code': 200}\"\nres = json.loads(raw_data)\n```\n运行该代码会发生什么？",
            "options": [
                {"value": "A", "label": "抛出 json.decoder.JSONDecodeError 异常"},
                {"value": "B", "label": "成功解析为包含两个键值对的 Python 字典"},
                {"value": "C", "label": "自动将单引号替换为双引号并返回字典"},
                {"value": "D", "label": "返回 None"}
            ],
            "answer": "A",
            "explanation": "JSON 官方规范严格规定：所有的键和字符串值必须使用双引号包裹！使用单引号是非法的 JSON 文本，json.loads() 会直接报 JSONDecodeError。",
            "tags": ["JSON规范", "易错点"]
        },
        {
            "id": "pyf-ex-8-8",
            "type": "code",
            "difficulty": 4,
            "question": "【动手编程】请编写一个 CSV 订单聚合函数 `sum_csv_paid_orders(csv_text: str) -> float`：\n- 输入包含表头的 CSV 文本（列名为 `order_id,amount,status`）；\n- 使用 `csv.DictReader` 解析该文本；\n- 过滤出 `status` 等于 `'PAID'` 的行，累加其 `amount` 金额（需转为 float）；\n- 返回有效支付的总金额，保留 2 位小数。",
            "starterCode": "import csv\nimport io\n\ndef sum_csv_paid_orders(csv_text: str) -> float:\n    # 请使用 csv.DictReader 进行数据读取与过滤计算\n    pass\n",
            "expectedOutput": "470.0",
            "answer": "import csv\nimport io\n\ndef sum_csv_paid_orders(csv_text: str) -> float:\n    if not csv_text.strip():\n        return 0.0\n    stream = io.StringIO(csv_text.strip())\n    reader = csv.DictReader(stream)\n    total = 0.0\n    for row in reader:\n        if row.get('status') == 'PAID':\n            total += float(row.get('amount', 0))\n    return round(total, 2)",
            "tests": "raw = '''order_id,amount,status\\n101,150.0,PAID\\n102,80.0,REFUND\\n103,320.0,PAID\\n'''\nassert sum_csv_paid_orders(raw) == 470.0\nassert sum_csv_paid_orders('') == 0.0\nassert sum_csv_paid_orders('order_id,amount,status\\n1,10.0,PENDING\\n') == 0.0\n",
            "explanation": "使用 io.StringIO 将文本转换为流，配合 csv.DictReader 按字典逐行读取并过滤出 status=='PAID' 的行进行累加计算。",
            "tags": ["编程实操", "CSV处理"]
        }
    ]
}
