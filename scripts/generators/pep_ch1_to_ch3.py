# -*- coding: utf-8 -*-
"""
Python 工程实践 - 第 1 章至第 3 章数据定义
涵盖：
1. 现代 Python 工程规范与代码质量 (PEP 8, PEP 257, Type Hints 与 mypy 静态分析)
2. 依赖管理、环境隔离与现代打包规范 (venv, Poetry, uv 与 pyproject.toml)
3. 面向对象设计、数据模型与现代数据建模 (Dunder Methods, Protocol, dataclasses 与不可变模型)
"""

CHAPTER_1 = {
    "id": "pep-c1",
    "courseId": "python-engineering-practices",
    "order": 1,
    "title": "现代 Python 工程规范与类型系统",
    "goal": "建立工业级 Python 开发规范意识，掌握 PEP 8/257 代码风格与现代静态分析工具链（Ruff/Black），精通 PEP 484 类型注解体系与 mypy 静态类型检查。",
    "lessons": [
        {
            "id": "pep-l1-1",
            "title": "工业级代码风格与静态工具链：PEP 8、PEP 257 与 Ruff / Black",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：掌握 Python 官方代码风格指南 PEP 8 与文档规范 PEP 257，搞清为什么大型工程团队需要绝对统一的代码风格；掌握现代极速代码分析工具（Ruff、Flake8）与“无妥协格式化器”（Black）的工作原理与自动化集成。
- **先修要求**：熟练掌握 Python 基础语法、函数与模块基本概念。

---

### 二、核心概念与术语解释

#### 1. 为什么工业级工程必须统一风格？
“代码被阅读的次数远多于被编写的次数”（Guido van Rossum）。
在个人业余脚本中，变量叫 `a`、`temp1`，缩进 2 空格或 4 空格可能影响不大；但在多人协作的中大型生产项目中，不一致的风格会导致：
- Git 代码评审（Code Review）充满无意义的空格、缩进排版争议（Bikeshedding）；
- 隐藏的代码坏味道（Code Smells）与作用域遮蔽难以被发现；
- 维护成本急剧攀升。

#### 2. PEP 8 核心规范要点速览
- **缩进与行宽**：严格使用 **4 个空格**缩进（严禁 Tab）；传统 PEP 8 推荐每行不超过 79 字符，现代主流工程实践（如 Black / Ruff 默认）通常放宽至 **88 或 100 字符**。
- **空行规范**：顶级函数与类定义之间空 **2 行**；类内部各方法之间空 **1 行**；函数内部逻辑小节空 **1 行**。
- **命名规范（Naming Conventions）**：
  - **包与模块名**：全小写短单词，下划线尽量少用（如 `data_loader.py`）；
  - **类名**：PascalCase（大驼峰，如 `OrderProcessor`、`UserAccount`）；
  - **函数与变量**：snake_case（全小写加下划线，如 `calculate_tax_rate`）；
  - **常量**：UPPER_CASE（全大写加下划线，如 `MAX_RETRY_COUNT`）；
  - **保护属性/私有属性**：单下划线前缀 `_internal_cache`（内部约定），双下划线 `__mangle`（名称重整，慎用）。
- **导入规范（Imports）**：
  - 导入始终置于文件最顶部，在模块文档字符串和全局变量之前；
  - **三段式导入顺序（每组用一个空行隔开）**：
    1. 标准库导入（如 `import sys`, `import os`）；
    2. 第三方库导入（如 `import numpy as np`, `import pandas as pd`）；
    3. 本地应用/项目自定义模块导入（如 `from myproject.services import OrderService`）。
  - **严禁使用通配符导入（`from module import *`）**：这会污染命名空间，导致工具和人类均无法追踪变量来源。

#### 3. 现代代码质量工具链：Ruff 与 Black
- **Black**：被称为“The Uncompromising Code Formatter”。它几乎不提供风格配置选项，以绝对一致、自动重排的方式一键格式化所有代码，彻底消灭团队风格争论。
- **Ruff**：由 Astral 开发的使用 Rust 编写的超高性能 Python Linter & 格式化工具。它比传统的 Flake8、isort、Black 快 **10~100 倍**，可以在毫秒内检查数万行工程代码的未使用导入、语法陷阱与安全隐患。

---

### 三、逐步代码演练与执行分析

```python
\"\"\"订单服务模块（遵循 PEP 257 Google 风格文档字符串规范）。

该模块提供多渠道电商订单金额的计算与审计校验逻辑。
\"\"\"

# 1. 严格的三段式导入（标准库 -> 第三方库 -> 本地模块）
import math
from typing import Dict, List, Optional

# 全局常量定义
DEFAULT_CURRENCY = "CNY"
MAX_BATCH_SIZE = 500


class OrderCalculator:
    \"\"\"订单计算与业务规则执行引擎。

    Attributes:
        tax_rate: 适用增值税税率（0.0 ~ 1.0 之间）。
        discount_threshold: 享受批量折扣的金额门槛。
    \"\"\"

    def __init__(self, tax_rate: float = 0.06, discount_threshold: float = 1000.0) -> None:
        self.tax_rate = tax_rate
        self.discount_threshold = discount_threshold

    def calculate_total(self, items: List[Dict[str, float]]) -> float:
        \"\"\"计算订单总价（包含单价*数量，按满额打折并计算税费）。

        Args:
            items: 包含商品明细的字典列表，每个字典需包含 'price' 和 'quantity'。

        Returns:
            计算完成的应付总金额（四舍五入保留 2 位小数）。

        Raises:
            ValueError: 当商品价格为负或数量为负时抛出。
        \"\"\"
        subtotal = 0.0
        for item in items:
            price = item.get("price", 0.0)
            qty = item.get("quantity", 0.0)
            if price < 0 or qty < 0:
                raise ValueError(f"非法商品参数: price={price}, qty={qty}")
            subtotal += price * qty

        # 超过门槛享受 95 折
        if subtotal >= self.discount_threshold:
            subtotal *= 0.95

        final_total = subtotal * (1.0 + self.tax_rate)
        return round(final_total, 2)


calc = OrderCalculator(tax_rate=0.06, discount_threshold=500.0)
sample_items = [
    {"name": "Python 架构实战", "price": 89.0, "quantity": 4},
    {"name": "机械键盘", "price": 299.0, "quantity": 1}
]
print(f"规范化计算订单实付: ¥{calc.calculate_total(sample_items):.2f}")
```

---

### 四、常见易错陷阱与排查技巧
1. **滥用通配符 `from module import *`**：
   - 如果两个模块都定义了 `load_data()`，通配符导入后前者会被后者悄无声息地覆盖，引发灾难性偶发 bug。工程中必须显式导入或使用模块命名空间。
2. **在局部作用域随意修改下划线私有变量**：
   - 以单下划线开头的变量（如 `_cache`）是作者向外界声明的“私有内部实现细节”，直接在外部访问或修改会破坏类的封装不变性，当作者升级重构内部逻辑时外部代码立即崩溃。

---

### 五、本节小结
- PEP 8 规范是 Python 工程师的通用语言，核心在于蛇形命名、4空格缩进与三段式导入。
- 文档采用标准 PEP 257 格式，清晰标注文档头、Args、Returns 与 Raises。
- 引入 Ruff 与 Black 等现代工具链，实现团队规范的自动化、CI/CD 机械化拦截。

---

### 六、权威参考资料与延伸阅读
- **PEP 8 – Style Guide for Python Code**:
  - 作者：Guido van Rossum, Barry Warsaw, Nick Coghlan
  - 链接：https://peps.python.org/pep-0008/
  - 授权：Public Domain (公开免费)
- **PEP 257 – Docstring Conventions**:
  - 作者：David Goodger, Guido van Rossum
  - 链接：https://peps.python.org/pep-0257/
  - 授权：Public Domain
- **Ruff 官方文档**:
  - 机构：Astral Software
  - 链接：https://docs.astral.sh/ruff/
  - 授权：MIT License / Apache 2.0
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "绝对不要在大型工程中书写 from module import *！它会彻底击溃 IDE 智能感知与 Ruff 静态检测，使重命名重构变得极不可信。"
                },
                {
                    "kind": "performance",
                    "text": "推荐在项目 Git 提交阶段配置 pre-commit 钩子，由 ruff check --fix 与 ruff format 在本地秒级拦截并修复格式问题。"
                }
            ],
            "demos": [
                {
                    "title": "三段式导入与规范命名类结构演示",
                    "lang": "python",
                    "code": "# 演示生产级模块的规范化结构设计\nimport sys\nfrom typing import Dict, List\n\n# 模块常量\nVERSION = \"1.2.0\"\nMAX_RETRIES = 3\n\nclass AuditLogService:\n    \"\"\"审计日志服务，负责记录敏感操作的上下文元数据。\"\"\"\n    def __init__(self, service_name: str) -> None:\n        self.service_name = service_name\n        self._audit_records: List[Dict[str, str]] = []\n\n    def record_action(self, user_id: str, action: str) -> None:\n        entry = {\"service\": self.service_name, \"user\": user_id, \"action\": action}\n        self._audit_records.append(entry)\n\n    def get_log_count(self) -> int:\n        return len(self._audit_records)\n\nservice = AuditLogService(\"OrderPayment\")\nservice.record_action(\"U1001\", \"EXECUTE_PAYMENT\")\nprint(f\"服务名称: {service.service_name}, 记录日志数: {service.get_log_count()}\")\n"
                }
            ]
        },
        {
            "id": "pep-l1-2",
            "title": "现代类型注解体系 (Type Hints)：typing 模块、泛型与 mypy 静态分析",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：掌握 PEP 484 类型提示（Type Hints）体系，理解 Python“渐进类型系统（Gradual Typing）”的物理本质，熟练使用基础泛型、联合类型（`Union` / `|`）、可选类型（`Optional`）、`Callable` 以及结构子类型协议（`Protocol`），掌握 `mypy` 静态类型检查器。
- **先修要求**：熟练掌握函数签名与面向对象基本概念。

---

### 二、核心概念与术语解释

#### 1. 为什么 Python 越来越重视类型提示？
Python 是动态类型语言，类型是在运行时由解释器推断绑定的。
这一特性的好处是初期编写极快；但在超过 10 万行的大型企业系统中，动态类型的劣势暴露无遗：
- 面对别人的函数 `def process(data): ...`，如果不把函数内部翻个底朝天，你根本不知道 `data` 到底应该传 DataFrame、列表、字典还是文件句柄；
- 重构字段名时，IDE 无法安全地一键全局重命名，极易漏改引发运行时的 `AttributeError`；
- **类型提示不是强转，它在运行时完全不减慢代码速度，而是把潜在的类型错误扼杀在编写期与 CI 阶段！**

#### 2. 现代类型语法核心矩阵 (Python 3.10+)
- **内置容器泛型 (PEP 585)**：直接使用 `list[int]`, `dict[str, float]`, `tuple[str, int]`，不再需要从 `typing` 显式导入大写 `List`, `Dict`；
- **联合类型与可选类型 (PEP 604)**：
  - 使用竖线管道符：`int | float` 替代旧版的 `Union[int, float]`；
  - 可空对象：`str | None` 替代旧版的 `Optional[str]`；
- **通配与万能类型：`Any`**：声明允许任何类型（相当于关闭该变量的类型检查，应尽量克制使用）；
- **函数类型：`Callable[[参数类型列表], 返回值类型]`**：如 `Callable[[int, int], bool]` 表示接受两个整数返回布尔值的函数对象；
- **字面量类型：`Literal`**：限定变量取值只能是特定几个字面常量：
  `Literal["read", "write", "append"]`。

#### 3. 泛型 (Generics) 与 TypeVar
当函数处理的类型未知、但必须保持输入与输出类型一致时，使用类型变量：
```python
from typing import TypeVar, Sequence

T = TypeVar("T")

def first_element(seq: Sequence[T]) -> T | None:
    return seq[0] if seq else None
```

#### 4. 结构子类型协议：`Protocol` (PEP 544)
Python 的传统是“鸭子类型（Duck Typing）”——“如果走起来像鸭子，叫起来像鸭子，它就是鸭子”。
`Protocol` 是鸭子类型的现代化静态表达：**无需显式继承父类，只要拥有指定的属性或方法，就自动被静态检查器视为该类型**！

---

### 三、逐步代码演练与执行分析

```python
from typing import Protocol, TypeVar, List, runtime_checkable

# 1. 定义一个协议（任何实现了 calculate_subtotal 方法的对象均被认可）
@runtime_checkable
class BillableItem(Protocol):
    def calculate_subtotal(self) -> float:
        ...

# 2. 泛型类型变量
TItem = TypeVar("TItem", bound=BillableItem)

class CourseProduct:
    def __init__(self, title: str, price: float, hours: int) -> None:
        self.title = title
        self.price = price
        self.hours = hours

    def calculate_subtotal(self) -> float:
        return self.price

class PhysicalBook:
    def __init__(self, name: str, unit_price: float, quantity: int) -> None:
        self.name = name
        self.unit_price = unit_price
        self.quantity = quantity

    def calculate_subtotal(self) -> float:
        return self.unit_price * self.quantity

# 3. 编写类型安全、高内聚的结算函数
def compute_invoice_total(items: List[TItem], tax_rate: float = 0.08) -> float:
    \"\"\"计算所有符合 BillableItem 协议对象的发票总金额\"\"\"
    raw_sum = sum(item.calculate_subtotal() for item in items)
    return round(raw_sum * (1.0 + tax_rate), 2)

# 测试调用：两个完全没有共同父类的对象，均通过 Protocol 协议检查
cart: List[BillableItem] = [
    CourseProduct("Python 工程实践", 199.0, 40),
    PhysicalBook("Fluent Python 2nd", 120.0, 2)
]

total_invoice = compute_invoice_total(cart)
print(f"基于 Protocol 协议结算总发票额: ¥{total_invoice:.2f}")
```

---

### 四、常见易错陷阱与排查技巧
1. **类型提示并不会在运行时自动强制转换类型！**
   - 很多初学者误以为定义了 `def add(a: int, b: int) -> int:` 之后，传入字符串 `"1"` 会自动变成整数 1。Python 解释器在运行时完全忽略类型提示！类型安全必须配合 `mypy` 或运行时验证库（如 Pydantic）保障。
2. **在默认参数赋值 None 时忘记标注 Optional**：
   - 写出 `def fetch(timeout: int = None):` 在 mypy 严格模式下会直接报错，因为 `None` 不是 `int`！应规范写为 `def fetch(timeout: int | None = None):`。

---

### 五、本节小结
- 类型提示提升了可读性与自动化重构安全性，完全零运行时性能损耗。
- Python 3.10+ 全面拥抱 `|` 联合类型与内置内置小写泛型 `list[T]`。
- `Protocol` 是静态类型系统与 Pythonic 鸭子类型的最佳融合。
- 在持续集成（CI）流水线中配置 `mypy --strict` 是顶级大厂工程规范。

---

### 六、权威参考资料与延伸阅读
- **PEP 484 – Type Hints**:
  - 作者：Guido van Rossum, Jukka Lehtosalo, Łukasz Langa
  - 链接：https://peps.python.org/pep-0484/
  - 授权：Public Domain
- **PEP 544 – Protocols: Structural subtyping (static duck typing)**:
  - 作者：Ivan Levkivskyi, Jukka Lehtosalo, Łukasz Langa
  - 链接：https://peps.python.org/pep-0544/
- **mypy 官方文档与最佳实践**:
  - 机构：mypy 官方开发团队
  - 链接：https://mypy.readthedocs.io/en/stable/
  - 授权：MIT License
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "切记：类型提示是静态文档与分析工具，它绝不会在运行时拦截非法类型！如果需要运行时的严格校验，请使用 Pydantic。"
                },
                {
                    "kind": "interview",
                    "text": "面试高频考点：Protocol 与 ABC 抽象基类的区别在于，Protocol 属于结构子类型（只要有对应方法即可，无需显式 inherit），真正实现了静态鸭子类型。"
                }
            ],
            "demos": [
                {
                    "title": "泛型约束与 Callable 类型标注实战",
                    "lang": "python",
                    "code": "# 演示带有类型变量 T 与 Callable 规则函数的通用流水线\nfrom typing import Callable, List, TypeVar\n\nT = TypeVar(\"T\")\nR = TypeVar(\"R\")\n\ndef transform_and_filter(items: List[T], transform_fn: Callable[[T], R], predicate: Callable[[R], bool]) -> List[R]:\n    \"\"\"泛型函数：转换元素并根据断言条件过滤\"\"\"\n    result: List[R] = []\n    for item in items:\n        transformed = transform_fn(item)\n        if predicate(transformed):\n            result.append(transformed)\n    return result\n\nraw_data = [\"apple\", \"banana\", \"kiwi\", \"strawberry\"]\n# 转换：求长度；过滤：长度大于 5\nlong_lengths = transform_and_filter(raw_data, transform_fn=lambda s: len(s), predicate=lambda n: n > 5)\nprint(f\"长度大于 5 的单词长度列表: {long_lengths}\")\n"
                }
            ]
        }
    ],
    "exercises": [
        {
            "id": "pep-ex-1-1",
            "type": "single",
            "difficulty": 1,
            "question": "根据官方 PEP 8 命名规范，关于 Python 各类标识符的推荐命名风格，下列选项完全正确的是？",
            "options": [
                {"value": "A", "label": "普通变量与函数名使用 snake_case；类名使用 PascalCase；全局常量使用 UPPER_CASE"},
                {"value": "B", "label": "普通变量与函数名使用 camelCase；类名使用 snake_case；全局常量使用 PascalCase"},
                {"value": "C", "label": "所有标识符一律使用全小写下划线命名法（snake_case）"},
                {"value": "D", "label": "类名必须以大写 C 开头，如 COrderService"}
            ],
            "answer": "A",
            "explanation": "PEP 8 明确规范：函数与普通变量使用小写加下划线（snake_case）；类名使用大驼峰（PascalCase）；常量全大写（UPPER_CASE）。",
            "tags": ["PEP 8", "命名规范"]
        },
        {
            "id": "pep-ex-1-2",
            "type": "single",
            "difficulty": 1,
            "question": "在 Python 代码文件的顶部组织 import 语句时，PEP 8 推荐的“三段式导入顺序”自上而下依次是？",
            "options": [
                {"value": "A", "label": "标准库导入 -> 相关的第三方库导入 -> 本地应用/项目专有模块导入"},
                {"value": "B", "label": "第三方库导入 -> 标准库导入 -> 本地应用导入"},
                {"value": "C", "label": "本地应用导入 -> 第三方库导入 -> 标准库导入"},
                {"value": "D", "label": "按照文件大小升序排列导入"}
            ],
            "answer": "A",
            "explanation": "PEP 8 规定 import 顺序应为：1. 标准库（如 sys, os）；2. 第三方库（如 numpy, requests）；3. 本地专有模块（如 myapp.models），且各段之间以一个空行隔开。",
            "tags": ["PEP 8", "导入规范"]
        },
        {
            "id": "pep-ex-1-3",
            "type": "judge",
            "difficulty": 2,
            "question": "在 Python 运行时，如果为一个标注为 `age: int` 的变量赋予字符串 `\"25\"`，Python 解释器在没有外接静态工具时会自动抛出 TypeError 阻断执行。",
            "answer": False,
            "explanation": "错误！Python 的类型注解（Type Hints）属于纯静态提示，在 CPython 运行时完全不进行类型强制校验，也不会改变执行逻辑；类型校验需要借助 mypy、pyright 等静态检查工具或 Pydantic 等库完成。",
            "tags": ["Type Hints", "运行时机制"]
        },
        {
            "id": "pep-ex-1-4",
            "type": "fill",
            "difficulty": 2,
            "question": "在 Python 3.10+ 中，若声明一个参数既可以是整数也可以是 None，推荐使用竖线语法简洁标注为 `val: int _____ None`。",
            "blanks": [["|"]],
            "explanation": "Python 3.10 引入了 PEP 604，使用联合运算符 | 替代传统的 Union[int, None] 或 Optional[int]。",
            "tags": ["PEP 604", "类型注解"]
        },
        {
            "id": "pep-ex-1-5",
            "type": "single",
            "difficulty": 2,
            "question": "关于 Python 3.8+ 引入的结构子类型 `typing.Protocol`，下列哪项描述最为准确？",
            "options": [
                {"value": "A", "label": "实现了“静态鸭子类型”：一个类不需要显式继承该 Protocol，只要实现了对应的方法与属性签名，即可通过类型检查"},
                {"value": "B", "label": "必须通过 class MyClass(ProtocolClass): 显式硬编码继承才能生效"},
                {"value": "C", "label": "只能用于修饰抽象数据类型，不能被 mypy 读取"},
                {"value": "D", "label": "Protocol 在编译时会自动将代码转译为 C++ 虚函数表"}
            ],
            "answer": "A",
            "explanation": "Protocol（PEP 544）提供了结构子类型化支持，遵循“若具备鸭子的行为则视为鸭子”，无需显式继承父类即可在静态检查中获得类型认可。",
            "tags": ["Protocol", "结构子类型"]
        },
        {
            "id": "pep-ex-1-6",
            "type": "multiple",
            "difficulty": 3,
            "question": "在工业级 Python 代码仓库中，为什么团队普遍严禁书写 `from module import *`？",
            "options": [
                {"value": "A", "label": "通配符导入会将目标模块的所有内部变量与私有函数无差别灌入当前命名空间，造成命名污染"},
                {"value": "B", "label": "如果多个模块定义了同名函数，后导入的模块会悄然覆盖前者，产生极其隐蔽的逻辑 bug"},
                {"value": "C", "label": "静态代码分析工具（如 Ruff / mypy）与 IDE 将无法准确追踪代码中符号的真实出处与定义"},
                {"value": "D", "label": "Python 解释器在遇到通配符导入时会强制降低 CPU 主频"}
            ],
            "answer": ["A", "B", "C"],
            "explanation": "通配符导入导致命名空间污染、意外符号覆盖以及破坏静态工具链的依赖索引；D 纯属荒谬编造。",
            "tags": ["代码反模式", "工程规范"]
        },
        {
            "id": "pep-ex-1-7",
            "type": "single",
            "difficulty": 3,
            "question": "观察以下函数签名：\n```python\ndef get_db_connection(timeout: int = None) -> Connection:\n    pass\n```\n在开启 mypy `--strict` 严格模式下，上述代码会报告何种类型隐患？",
            "options": [
                {"value": "A", "label": "timeout 形参默认值为 None，但其类型被声明为纯 int，必须声明为 int | None 或 Optional[int]"},
                {"value": "B", "label": "函数名不能以下划线开头"},
                {"value": "C", "label": "Connection 必须写成小写 connection"},
                {"value": "D", "label": "mypy 会直接拒绝编译并删除源文件"}
            ],
            "answer": "A",
            "explanation": "在现代 mypy 严格模式下，禁止隐式 Optional。默认值为 None 的参数必须显式在类型标注中包含 None（如 int | None）。",
            "tags": ["mypy", "严格模式"]
        },
        {
            "id": "pep-ex-1-8",
            "type": "code",
            "difficulty": 4,
            "question": "【动手编程】请实现一个类型安全的数据批量过滤函数 `batch_filter_entities`：\n- 接收一个实体字典列表 `items: list[dict]` 与一个规则断言函数 `rule_fn`；\n- 遍历列表，当某条记录满足 `rule_fn(item)` 为真时保留；\n- 返回过滤后的新列表；\n- 若某条记录在传入 `rule_fn` 时抛出异常（如 KeyError），安全跳过该条记录，不要使程序崩溃。",
            "starterCode": "from typing import Callable, Any\n\ndef batch_filter_entities(items: list[dict[str, Any]], rule_fn: Callable[[dict[str, Any]], bool]) -> list[dict[str, Any]]:\n    # 请在此处编写安全过滤逻辑\n    pass\n",
            "expectedOutput": "[{'id': 1, 'active': True}]",
            "answer": "from typing import Callable, Any\n\ndef batch_filter_entities(items: list[dict[str, Any]], rule_fn: Callable[[dict[str, Any]], bool]) -> list[dict[str, Any]]:\n    results = []\n    for item in items:\n        try:\n            if rule_fn(item):\n                results.append(item)\n        except Exception:\n            continue\n    return results",
            "tests": "data = [\n    {'id': 1, 'active': True, 'score': 85},\n    {'id': 2, 'active': False, 'score': 90},\n    {'id': 3}  # 缺少 active 字段\n]\nres = batch_filter_entities(data, lambda x: x['active'] and x['score'] >= 80)\nassert len(res) == 1\nassert res[0]['id'] == 1\nassert batch_filter_entities([], lambda x: True) == []\n",
            "explanation": "使用 try-except 包裹 rule_fn(item) 的评估过程，当缺失字段或类型不匹配引发异常时平稳跳过，返回所有满足条件的字典列表。",
            "tags": ["编程实操", "类型安全", "容错"]
        }
    ]
}

CHAPTER_2 = {
    "id": "pep-c2",
    "courseId": "python-engineering-practices",
    "order": 2,
    "title": "依赖管理、环境隔离与现代打包规范",
    "goal": "告别全局 pip 污染，掌握 venv/Poetry/uv 的虚拟环境生命周期管理与确定性锁文件机制，熟练使用 PEP 621 pyproject.toml 声明依赖与元数据。",
    "lessons": [
        {
            "id": "pep-l2-1",
            "title": "摆脱环境地狱：venv、Poetry 与 uv 现代虚拟环境与锁机制",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：掌握虚拟环境的物理工作机制（`pyvenv.cfg` 与 PATH 切换），理解直接在全局环境中 `pip install` 的严重风险，掌握传统 `requirements.txt` 与现代 `poetry.lock` / `uv.lock` 的本质差异，建立确定性可重现构建（Reproducible Builds）的工程习惯。
- **先修要求**：了解命令行终端基础与 Python 包导入。

---

### 二、核心概念与术语解释

#### 1. 为什么“全局安装”是工程灾难？
当你刚开始学 Python 时，往往直接在终端运行 `pip install pandas`。
这样做的物理结果是：第三方包被全部堆在系统全局的 `site-packages` 目录下。
**灾难场景**：
- 项目 A 是 2 年前开发的老系统，强依赖 `pandas==1.1.5`；
- 项目 B 是上周启动的新应用，依赖 `pandas==2.2.0`（API 发生了重大破坏性更新）；
- 当你在全局环境升级了 pandas，项目 A 会在半夜由于 API 废弃直接崩溃！
**工程铁律：任何一个严肃的 Python 工程，必须拥有独立、沙箱隔离的虚拟环境！**

#### 2. 虚拟环境底层工作原理
虚拟环境并不是一个重型的 Docker 容器或虚拟机，它极其轻量：
- 当运行 `python -m venv .venv` 时，Python 只是在当前项目目录下创建了一个 `.venv` 文件夹；
- 内部包含一个 `pyvenv.cfg` 配置文件和一个软链接/拷贝的 `python` 可执行文件；
- 当你在终端执行 `source .venv/bin/activate`（或 Windows 下 `.venv\\Scripts\\activate`）时，**它的本质动作仅仅是在当前 shell 进程的环境变量 `PATH` 最前端插入了 `.venv/bin`**！
- 这样，系统寻找 `python` 和 `pip` 时会优先找到沙箱内部的解释器，安装的第三方包也会安全地落在 `.venv/lib/site-packages` 内部。

```
操作系统环境 PATH 变更原理：
激活前:  PATH=/usr/bin:/usr/local/bin (调用全局 Python)
激活后:  PATH=/my_project/.venv/bin:/usr/bin:/usr/local/bin (优先命中沙箱 Python!)
```

#### 3. 为什么传统 `requirements.txt` 不足以支撑生产级发布？
- **间接依赖未锁定（Transitive Dependencies Blindspot）**：
  在 `requirements.txt` 中往往只写了顶级依赖 `requests==2.28.0`；但 `requests` 底层依赖的 `urllib3`、`certifi` 在今天安装是 1.26 版，下周在新服务器上安装却变成了 2.0 版，导致隐蔽故障；
- **缺乏环境哈希校验**：无法防止包被恶意篡改；
- **开发与生产依赖混为一谈**：测试工具 `pytest`、格式化工具 `black` 不应被安装到最终生产服务器镜像中。

#### 4. 现代工具对比：Poetry vs uv
- **Poetry**：集成化依赖解析、虚拟环境管理与包打包发布工具。自动解析所有依赖树的冲突，并生成确定性的 `poetry.lock` 锁定文件。
- **uv**：由 Astral 使用 Rust 编写的下一代超快包管理工具，完全兼容 pip 与 PEP 规范，依赖解析与安装速度比传统 pip **快 10~100 倍**，冷缓存安装仅需数百毫秒。

---

### 三、逐步代码演练与执行分析

```python
# 演示语义化版本（SemVer）与依赖版本约束匹配逻辑
import re

def is_semver_compatible(installed_version: str, constraint: str) -> bool:
    \"\"\"模拟现代包管理器（如 Poetry 的 ^ 约束）判断版本是否兼容。

    Poetry 规则中:
      ^1.2.3 允许: >=1.2.3 且 <2.0.0 (主版本不变，允许向上更新次版本与补丁)
    \"\"\"
    v_pattern = r"^(\\d+)\\.(\\d+)\\.(\\d+)$"
    m_inst = re.match(v_pattern, installed_version)
    if not m_inst:
        raise ValueError(f"非法版本格式: {installed_version}")
        
    inst_major, inst_minor, inst_patch = map(int, m_inst.groups())

    if constraint.startswith("^"):
        target_v = constraint[1:]
        m_target = re.match(v_pattern, target_v)
        if not m_target:
            raise ValueError(f"非法约束格式: {constraint}")
        req_major, req_minor, req_patch = map(int, m_target.groups())

        # 主版本必须完全一致
        if inst_major != req_major:
            return False
        # 实际版本不得低于目标基础版本
        if (inst_minor, inst_patch) < (req_minor, req_patch):
            return False
        return True

    return installed_version == constraint

print("版本 ^1.2.0 测试:")
print("  安装 1.2.5 兼容吗?", is_semver_compatible("1.2.5", "^1.2.0"))  # True
print("  安装 1.8.0 兼容吗?", is_semver_compatible("1.8.0", "^1.2.0"))  # True
print("  安装 2.0.0 兼容吗?", is_semver_compatible("2.0.0", "^1.2.0"))  # False (主版本跨越)
print("  安装 1.1.9 兼容吗?", is_semver_compatible("1.1.9", "^1.2.0"))  # False (低于起始基线)
```

---

### 四、常见易错陷阱与排查技巧
1. **将 `.venv` 虚拟环境提交到了 Git**：
   - 绝不可将 `.venv` 上传至 Git 仓库！虚拟环境内全是特定操作系统的平台二进制和硬编码绝对路径，传到他人电脑或 Linux 服务器上 100% 无法运行。必须在 `.gitignore` 中显式添加 `.venv/`。
2. **只提交 `pyproject.toml` 却漏掉了 `poetry.lock` / `uv.lock`**：
   - 依赖声明文件由人类编写，而锁文件（lockfile）记录了机器解析后每个依赖的精确版本与 SHA256 哈希。**团队协作必须将 lockfile 提交入库**，确保所有成员安装结果 100% 一致。

---

### 五、本节小结
- 虚拟环境基于 PATH 重定向轻量隔离不同项目的依赖。
- 淘汰 `requirements.txt`，拥抱 Poetry / uv 与 lockfile 机制。
- 绝不提交 `.venv/` 到 Git，必须提交 `poetry.lock` / `uv.lock`。
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "切记：在 .gitignore 中必须加入 .venv/！虚拟环境包含特定系统的平台编译产物，绝不可纳入版本控制。"
                },
                {
                    "kind": "performance",
                    "text": "在本地开发或 CI/CD 构建中，推荐使用 uv pip install 代替标准 pip，享受 10~100 倍的 Rust 极速安装提速。"
                }
            ],
            "demos": [
                {
                    "title": "依赖冲突排查与树形结构诊断演示",
                    "lang": "python",
                    "code": "# 模拟包管理器的依赖树解析与冲突检测\nproject_deps = {\n    \"pandas\": {\"version\": \"2.1.0\", \"requires\": {\"numpy\": \">=1.24.0\"}},\n    \"tensorflow\": {\"version\": \"2.12.0\", \"requires\": {\"numpy\": \"<1.24.0\"}}\n}\n\ndef audit_conflicts(deps):\n    print(\"正在审计项目依赖树...\")\n    numpy_constraints = []\n    for pkg, info in deps.items():\n        if \"numpy\" in info[\"requires\"]:\n            numpy_constraints.append(f\"{pkg} 要求 numpy {info['requires']['numpy']}\")\n    \n    print(\"检测到底层依赖冲突:\")\n    for c in numpy_constraints:\n        print(f\"  - {c}\")\n    print(\"结论: pandas 与 tensorflow 约束互斥，传统 pip 将产生冲突，现代包管理器将熔断报错！\")\n\naudit_conflicts(project_deps)\n"
                }
            ]
        },
        {
            "id": "pep-l2-2",
            "title": "现代项目配置与打包：从 setup.py 演进至 PEP 621 pyproject.toml",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：理解 Python 打包标准从历史散乱配置到统一大一统标准 PEP 517/518/621 的演进历程，掌握 `pyproject.toml` 标准结构，能够配置项目元数据、构建后端（Build Backends）与依赖分组。
- **先修要求**：了解 Python 包安装与模块结构。

---

### 二、核心概念与术语解释

#### 1. 历史的痛：散落各处的配置文件
在过去，一个规范的 Python 工程根目录下往往塞满了五花八门的文件：
- `setup.py`（打包脚本，存在执行任意不可信 Python 代码的安全隐患）；
- `setup.cfg`（声明式配置）；
- `requirements.txt` 与 `requirements-dev.txt`（依赖声明）；
- `pytest.ini`（测试配置）；
- `.flake8`（代码风格）；
- `tox.ini`（多环境测试矩阵）。
配置文件过多、格式不一（有的类似 INI，有的必须是可执行 Python 脚本），维护体验极度割裂。

#### 2. 大一统标准：PEP 621 与 `pyproject.toml`
现代 Python 体系彻底废弃了命令式执行的 `setup.py`，全面转向声明式的 **`pyproject.toml`**（基于 TOML 格式）。
它由两大核心板块构成：
1. **`[build-system]` (PEP 518)**：声明构建该项目所需的工具和后端（如 `poetry-core`, `hatchling`, `flit-core`）；
2. **`[project]` (PEP 621)**：统一声明项目元数据，所有打包工具（Poetry、Hatch、Flit、pip）全部支持该标准！

#### 3. 生产级 `pyproject.toml` 黄金标准结构解析
```toml
[build-system]
requires = ["poetry-core>=1.0.0"]
build-backend = "poetry.core.masonry.api"

[project]
name = "enterprise-etl-engine"
version = "1.0.0"
description = "企业级高性能多渠道数据清洗与转换引擎"
readme = "README.md"
requires-python = ">=3.10"
license = { text = "MIT" }
authors = [
    { name = "ZX-Academy", email = "dev@knowledge-order.com" }
]
dependencies = [
    "pandas>=2.1.0,<3.0.0",
    "pydantic>=2.5.0",
    "requests>=2.31.0"
]

[project.optional-dependencies]
# 可选依赖组（如用户需要导出 Excel 时才需安装）
excel = ["openpyxl>=3.1.0"]

[tool.poetry.group.dev.dependencies]
# 仅在本地开发测试时安装，不随生产环境分发
pytest = "^8.0.0"
ruff = "^0.3.0"
mypy = "^1.8.0"

[tool.ruff]
line-length = 88
target-version = "py310"

[tool.pytest.ini_options]
minversion = "7.0"
testpaths = ["tests"]
```

#### 4. 语义化版本控制 (Semantic Versioning 2.0.0)
版本格式遵循 `MAJOR.MINOR.PATCH`（如 `2.1.4`）：
- **MAJOR（主版本号）**：包含不兼容的 API 破坏性变更；
- **MINOR（次版本号）**：向下兼容的功能性新增；
- **PATCH（修订版本号）**：向下兼容的 bug 修复与安全修补。

---

### 三、逐步代码演练与执行分析

```python
# 演示 TOML 结构化配置的解析与依赖合规性校验
import json

sample_pyproject_json = {
    "project": {
        "name": "data-pipeline-core",
        "version": "1.4.2",
        "requires_python": ">=3.10",
        "dependencies": [
            "pandas>=2.0.0",
            "pydantic>=2.0.0",
            "loguru>=0.7.0"
        ]
    },
    "tool": {
        "ruff": {"line_length": 88},
        "pytest": {"testpaths": ["tests"]}
    }
}

def validate_project_config(config: dict) -> dict:
    proj = config.get("project", {})
    name = proj.get("name")
    version = proj.get("version")
    deps = proj.get("dependencies", [])

    assert name, "缺少项目 name 声明！"
    assert version, "缺少版本号声明！"
    
    print(f"项目名称: {name}")
    print(f"当前版本: {version}")
    print(f"生产依赖数量: {len(deps)} 项")
    for d in deps:
        print(f"  - 依赖约束: {d}")
        
    return {"status": "VALID", "total_deps": len(deps)}

res = validate_project_config(sample_pyproject_json)
print("校验通过状态:", res)
```

---

### 四、常见易错陷阱与排查技巧
1. **在生产构建中安装了开发依赖**：
   - 部署生产 Docker 镜像时，如果执行了无限制的 `poetry install`，会导致 `pytest`、`ruff` 等无用的大型开发依赖被打包进镜像，使镜像体积膨胀数百 MB！
   - **正确命令**：`poetry install --only main --no-root`。

---

### 五、本节小结
- PEP 621 将 Python 项目配置统一至 `pyproject.toml`。
- 区分生产依赖（`dependencies`）与开发测试依赖（`dev.dependencies`）。
- 严格遵循 SemVer 语义化版本演进规范。
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "构建生产镜像时务必使用 --only main 排除 dev 依赖组，保持容器镜像轻量和纯净。"
                }
            ],
            "demos": [
                {
                    "title": "pyproject 依赖组与构建配置解析",
                    "lang": "python",
                    "code": "# 模拟包管理引擎解析 pyproject.toml 中的分组依赖\nproject_schema = {\n    \"name\": \"fast-service\",\n    \"version\": \"2.0.1\",\n    \"production_deps\": [\"fastapi>=0.100.0\", \"uvicorn>=0.23.0\"],\n    \"dev_deps\": [\"pytest>=7.4.0\", \"httpx>=0.24.0\", \"mypy>=1.5.0\"]\n}\n\ndef build_docker_layer(spec, env_mode=\"production\"):\n    print(f\"=== 开始为 [{env_mode}] 环境生成安装清单 ===\")\n    to_install = list(spec[\"production_deps\"])\n    if env_mode == \"development\":\n        to_install.extend(spec[\"dev_deps\"])\n    for pkg in to_install:\n        print(f\"  -> pip install {pkg}\")\n    print(f\"安装包总计: {len(to_install)} 个\\n\")\n\nbuild_docker_layer(project_schema, env_mode=\"production\")\nbuild_docker_layer(project_schema, env_mode=\"development\")\n"
                }
            ]
        }
    ],
    "exercises": [
        {
            "id": "pep-ex-2-1",
            "type": "single",
            "difficulty": 1,
            "question": "在 Python 中使用内置命令 `python -m venv .venv` 创建虚拟环境后，激活虚拟环境（如在 Linux/Mac 下执行 `source .venv/bin/activate`）的物理核心机制是？",
            "options": [
                {"value": "A", "label": "在当前 shell 进程的环境变量 PATH 最前端添加 .venv/bin 路径，优先命中沙箱解释器"},
                {"value": "B", "label": "启动了一个后台 Docker 虚拟机"},
                {"value": "C", "label": "修改了计算机主板 BIOS 的引导扇区"},
                {"value": "D", "label": "将电脑硬盘上的所有其他 Python 版本直接删除"}
            ],
            "answer": "A",
            "explanation": "虚拟环境通过调整当前终端会话的 PATH 环境变量，使得输入 python 和 pip 时优先执行 .venv/bin 下的隔离可执行文件。",
            "tags": ["虚拟环境", "底层原理"]
        },
        {
            "id": "pep-ex-2-2",
            "type": "single",
            "difficulty": 2,
            "question": "在现代包管理器（如 Poetry / uv）中，关于 `pyproject.toml` 与 `poetry.lock` 文件的职责分工，下列描述正确的是？",
            "options": [
                {"value": "A", "label": "pyproject.toml 由开发者声明顶级依赖与版本区间；poetry.lock 记录精确锁定的每个直接与间接子依赖版本及哈希"},
                {"value": "B", "label": "poetry.lock 是临时缓存，绝不能提交到 Git 仓库中"},
                {"value": "C", "label": "pyproject.toml 只用于配置单元测试，不管理依赖"},
                {"value": "D", "label": "两者内容完全一样，只是格式不同"}
            ],
            "answer": "A",
            "explanation": "pyproject.toml 声明依赖规则（如 pandas>=2.0.0）；lock 文件记录经过确定性解析后的所有包具体版本（如 2.1.3）与 SHA256 哈希，必须提交到 Git 以确保全团队环境一致。",
            "tags": ["Poetry", "lockfile"]
        },
        {
            "id": "pep-ex-2-3",
            "type": "judge",
            "difficulty": 2,
            "question": "为了保证同事或者生产服务器下载代码后能立即运行，应该将包含几万个第三方依赖文件的 `.venv` 虚拟环境目录一并提交推送到 Git 远程仓库。",
            "answer": False,
            "explanation": "错误！严禁将 .venv 提交至 Git！虚拟环境包含特定操作系统的原生二进制和绝对路径软链接，在其他机器上无法运行且会导致代码库极其臃肿，必须将其放入 .gitignore。",
            "tags": ["Git规范", "虚拟环境"]
        },
        {
            "id": "pep-ex-2-4",
            "type": "fill",
            "difficulty": 2,
            "question": "根据 PEP 621 官方规范，用于替代历史繁杂配置文件的统一现代项目配置文件名是 `_____.toml`。",
            "blanks": [["pyproject"]],
            "explanation": "现代 Python 打包标准统一使用 pyproject.toml 声明元数据、依赖与构建工具链配置。",
            "tags": ["PEP 621", "pyproject.toml"]
        },
        {
            "id": "pep-ex-2-5",
            "type": "single",
            "difficulty": 3,
            "question": "根据语义化版本规范（Semantic Versioning 2.0.0，形如 `X.Y.Z`），当团队对某个开源基础库进行了重大重构并删除了部分过时的 API（产生破坏性向后不兼容变更）时，应该递增哪个版本号？",
            "options": [
                {"value": "A", "label": "MAJOR（主版本号 X）"},
                {"value": "B", "label": "MINOR（次版本号 Y）"},
                {"value": "C", "label": "PATCH（修订版本号 Z）"},
                {"value": "D", "label": "不需要更改版本号"}
            ],
            "answer": "A",
            "explanation": "SemVer 规范：主版本号（MAJOR）发生不兼容的破坏性 API 修改；次版本号（MINOR）向下兼容的功能新增；修订号（PATCH）向下兼容的 bug 修复。",
            "tags": ["SemVer", "版本管理"]
        },
        {
            "id": "pep-ex-2-6",
            "type": "multiple",
            "difficulty": 3,
            "question": "使用现代包管理工具 Poetry 或 uv 相比传统的单文件 `requirements.txt`，带来的核心工程优势包括？",
            "options": [
                {"value": "A", "label": "拥有确定性依赖锁定（lockfile），消除不同时间不同机器因子依赖静默升级导致的灵异故障"},
                {"value": "B", "label": "支持将依赖清晰分组（例如将 pytest、ruff 置于开发组，生产镜像只安装核心组）"},
                {"value": "C", "label": "进行全局依赖图谱解析（Dependency Resolution），能够提前检测并拦截互斥冲突依赖"},
                {"value": "D", "label": "能够使普通的机械键盘打字延迟降低 50%"}
            ],
            "answer": ["A", "B", "C"],
            "explanation": "A（可重现构建）、B（依赖分群隔离）、C（依赖图谱冲突检测）是现代依赖管理工具的核心价值；D 为无关干扰项。",
            "tags": ["包管理", "工程优势"]
        },
        {
            "id": "pep-ex-2-7",
            "type": "single",
            "difficulty": 4,
            "question": "在 Poetry 的版本约束语法中，`^1.2.3` 允许安装的最高上限版本范围是？",
            "options": [
                {"value": "A", "label": ">=1.2.3 且 <2.0.0"},
                {"value": "B", "label": ">=1.2.3 且 <=1.2.3（只能安装 1.2.3）"},
                {"value": "C", "label": ">=1.2.3 且 <1.3.0"},
                {"value": "D", "label": "无任何限制，甚至可以安装 99.0.0"}
            ],
            "answer": "A",
            "explanation": "插入符 ^ 表示允许在不改变最左侧非零主版本的前提下更新，即 ^1.2.3 允许所有 1.x.x 版本（>=1.2.3 且 <2.0.0）。",
            "tags": ["Poetry", "版本约束"]
        },
        {
            "id": "pep-ex-2-8",
            "type": "code",
            "difficulty": 4,
            "question": "【动手编程】请编写一个依赖版本校验器 `audit_installed_packages(installed_map: dict[str, str], required_map: dict[str, str]) -> list[str]`：\n- `installed_map` 为当前环境已安装的包及版本，如 `{'requests': '2.28.0', 'numpy': '1.20.0'}`；\n- `required_map` 为项目最低依赖要求，如 `{'requests': '2.25.0', 'pandas': '2.0.0'}`；\n- 检查所有项目必需的依赖包；若某包未安装，记录 `'MISSING: <pkg>'`；若已安装但实际版本**严格低于**要求的最低版本（按单点分割的数字逐位比较），记录 `'OUTDATED: <pkg> (<installed> < <required>)'`；\n- 返回所有违规项列表（若完全合规返回空列表 `[]`）。",
            "starterCode": "def audit_installed_packages(installed_map: dict[str, str], required_map: dict[str, str]) -> list[str]:\n    # 请在此处比较版本并返回审计问题列表\n    pass\n",
            "expectedOutput": "['OUTDATED: numpy (1.20.0 < 1.24.0)', 'MISSING: pandas']",
            "answer": "def audit_installed_packages(installed_map: dict[str, str], required_map: dict[str, str]) -> list[str]:\n    issues = []\n    for pkg, min_ver in required_map.items():\n        if pkg not in installed_map:\n            issues.append(f'MISSING: {pkg}')\n        else:\n            cur_ver = installed_map[pkg]\n            cur_tuple = tuple(map(int, cur_ver.split('.')))\n            req_tuple = tuple(map(int, min_ver.split('.')))\n            if cur_tuple < req_tuple:\n                issues.append(f'OUTDATED: {pkg} ({cur_ver} < {min_ver})')\n    return issues",
            "tests": "inst = {'requests': '2.28.0', 'numpy': '1.20.0'}\nreq = {'requests': '2.25.0', 'numpy': '1.24.0', 'pandas': '2.0.0'}\nres = audit_installed_packages(inst, req)\nassert 'OUTDATED: numpy (1.20.0 < 1.24.0)' in res\nassert 'MISSING: pandas' in res\nassert len(res) == 2\nassert audit_installed_packages({'a': '1.0.0'}, {'a': '1.0.0'}) == []\n",
            "explanation": "将版本字符串用 split('.') 切片并转为整数元组（如 (1, 20, 0) < (1, 24, 0)）进行数值比较，精准定位缺失包与落后包并输出标准审计清单。",
            "tags": ["编程实操", "依赖审计", "版本比较"]
        }
    ]
}

CHAPTER_3 = {
    "id": "pep-c3",
    "courseId": "python-engineering-practices",
    "order": 3,
    "title": "面向对象设计、数据模型与数据建模",
    "goal": "精通 Python 数据模型与 Dunder 魔法方法体系，理解协议导向编程与运算符重载，熟练运用标准库 dataclasses 构建不可变领域模型 (Domain Model)。",
    "lessons": [
        {
            "id": "pep-l3-1",
            "title": "Python 数据模型协议：魔法方法 (Dunder Methods) 与协议导向编程",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：深入掌握 Python 灵魂所在——“Python 数据模型（Python Data Model）”，掌握各类双下划线魔法方法（Dunder Methods）的触发时机与实现规范，学会让自定义类自然融入 Python 内建函数生态（如 `len()`, `str()`, `repr()`, 切片与迭代）。
- **先修要求**：熟练掌握面向对象类的基本定义（class, __init__）。

---

### 二、核心概念与术语解释

#### 1. 什么是 Python 数据模型（Data Model）？
在很多面向对象语言（如 Java）中，如果你想获取一个对象的长度，通常调用它的方法 `obj.length()` 或 `obj.size()`；
但在 Python 中，你永远写的是 `len(obj)`。
**为什么？**
因为 Python 是**协议导向编程（Protocol-driven Programming）**：解释器内部遇到 `len(x)` 时，会自动调用底层对象实现的 `x.__len__()` 方法！
Python 官方通过定义一系列**双下划线（Double Underscore，简称 Dunder）特殊方法**，构成了整个语言核心的行为宪章。只要你的类实现了特定 Dunder，它就能像内建类型一样享受所有语法糖！

#### 2. 最核心 Dunder 矩阵分类
| 分类 | 核心方法 | 对应 Python 语法 / 内置函数 |
| :--- | :--- | :--- |
| **字符串表现** | `__repr__` | 开发者/控制台交互调试输出（无歧义，供程序员阅读） |
|  | `__str__` | 面向终端用户的可读文本输出（`print()`, `str()`） |
| **序列/容器协议** | `__len__` | `len(obj)` 求长度 |
|  | `__getitem__` | `obj[key]` 支持通过下标索引和切片 `obj[1:3]` 访问！ |
|  | `__contains__` | `item in obj` 运算符支持！ |
| **比较与哈希** | `__eq__` | `obj1 == obj2` 等值判断 |
|  | `__lt__` | `obj1 < obj2` 小于比较（自动赋予 `sorted(list_of_objs)` 排序能力！） |
|  | `__hash__` | 获取哈希值，使对象能够作为字典的 Key 或集合元素 |

#### 3. `__repr__` vs `__str__` 黄金法则
- **`__repr__` 是基石**：如果一个类只实现了 `__repr__` 而没有写 `__str__`，Python 会在需要字符串时自动回退调用 `__repr__`；
- 好的 `__repr__` 输出应该像 Python 代码一样直观准确（例如 `f"User(id={self.id!r}, name={self.name!r})"`）。

---

### 三、逐步代码演练与执行分析

```python
# 构建一个具有完整序列行为的业务订单批次容器
class OrderBatch:
    \"\"\"订单批次集合，通过实现数据模型协议无缝支持 len、切片和迭代\"\"\"

    def __init__(self, batch_id: str, orders: list) -> None:
        self.batch_id = batch_id
        self._orders = list(orders)

    def __len__(self) -> int:
        return len(self._orders)

    def __getitem__(self, index):
        # 委托给内部列表，自动同时获得下标索引与高级切片能力！
        if isinstance(index, slice):
            return OrderBatch(self.batch_id, self._orders[index])
        return self._orders[index]

    def __contains__(self, order_id: str) -> bool:
        # 支持 'ORD-001' in batch 快速包含测试
        return any(o.get("id") == order_id for o in self._orders)

    def __repr__(self) -> str:
        return f"OrderBatch(batch_id={self.batch_id!r}, size={len(self._orders)})"

# 实例化并展示原生语法糖
batch = OrderBatch("BATCH-2024-A", [
    {"id": "ORD-1", "amount": 120.0},
    {"id": "ORD-2", "amount": 350.0},
    {"id": "ORD-3", "amount": 80.0},
    {"id": "ORD-4", "amount": 500.0}
])

print("批次表现形式:", repr(batch))
print("订单数量 len(batch):", len(batch))
print("首个订单 batch[0]:", batch[0])

# 支持切片！
sub_batch = batch[1:3]
print("切片后子批次:", sub_batch)

# 支持 in 判断！
print("ORD-2 在批次中吗?", "ORD-2" in batch)
print("ORD-999 在批次中吗?", "ORD-999" in batch)
```

---

### 四、常见易错陷阱与排查技巧
1. **重写了 `__eq__` 却遗漏了 `__hash__`**：
   - 当你在自定义类中重写了 `__eq__`，Python 会默认把该类的 `__hash__` 设为 `None`，使其瞬间变为不可哈希（Unhashable）！如果你把其实例放进 set 或作为 dict 的 key，会直接报 `TypeError: unhashable type`。
   - **规则**：若对象是逻辑不可变的，必须显式定义 `__hash__` 计算；若对象是可变的，切勿设为可哈希。

---

### 五、本节小结
- Python 是协议导向语言，内建函数通过 Dunder 方法调度自定义类。
- 优先实现 `__repr__` 保证调试可读性。
- 通过实现 `__len__` 和 `__getitem__`，普通类即可获得切片与迭代等全部原生魔法。
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "只写一个字符串方法时，请选择 __repr__！因为当 __str__ 缺失时 Python 会自动调用 __repr__ 作为保底替代。"
                },
                {
                    "kind": "performance",
                    "text": "实现 __getitem__ 时直接委托给底层 list 或 tuple 切片，能以零代码成本瞬间获得极速的切片与负索引能力。"
                }
            ],
            "demos": [
                {
                    "title": "富比较方法 __lt__ 与自然排序支持",
                    "lang": "python",
                    "code": "# 演示通过实现 __eq__ 与 __lt__ 赋予对象直接 sorted() 的能力\nclass PriorityTask:\n    def __init__(self, name: str, priority: int) -> None:\n        self.name = name\n        self.priority = priority\n\n    def __repr__(self) -> str:\n        return f\"{self.name}(P{self.priority})\"\n\n    def __eq__(self, other) -> bool:\n        if not isinstance(other, PriorityTask):\n            return False\n        return self.priority == other.priority\n\n    def __lt__(self, other) -> bool:\n        if not isinstance(other, PriorityTask):\n            return NotImplemented\n        # 优先级数字越小越优先\n        return self.priority < other.priority\n\ntasks = [PriorityTask(\"发送邮件\", 3), PriorityTask(\"数据库备份\", 1), PriorityTask(\"安全审计\", 2)]\nprint(\"原始任务列表:\", tasks)\n# 原生 sorted 会自动利用 __lt__ 进行快速排序！\nprint(\"排序后队列:\", sorted(tasks))\n"
                }
            ]
        },
        {
            "id": "pep-l3-2",
            "title": "现代轻量化数据建模：dataclasses 与不可变领域模型",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：掌握 Python 3.7+ 官方标准库 `@dataclass` 装饰器，彻底消灭繁琐的样板代码（Boilerplate），掌握 `field(default_factory=...)` 避免默认值陷阱，熟练使用 `frozen=True` 构建线程安全、不可变的值对象（Value Object），理解领域模型设计。
- **先修要求**：熟练掌握类与对象基本概念。

---

### 二、核心概念与术语解释

#### 1. 传统手写类的痛点
在领域驱动设计（DDD）中，我们经常需要创建纯粹用于承载数据的模型类（如 `Customer`、`Money`、`GeoLocation`）。
传统写法需要手动书写：
- 冗长的 `__init__` 参数赋值；
- 啰嗦的 `__repr__` 属性格式化；
- 繁琐的 `__eq__` 字段逐个比对。
如果数据类有 10 个字段，就要写 40 多行重复枯燥的样板代码！

#### 2. 标准库 `@dataclass` 装饰器
通过给类加上 `@dataclass`，Python 会根据类型标注在类创建时**自动在后台生成 `__init__`、`__repr__`、`__eq__` 等完整方法**！
```python
from dataclasses import dataclass

@dataclass
class UserProfile:
    user_id: str
    email: str
    is_vip: bool = False
```

#### 3. 核心高级特性
- **`field(default_factory=...)`（防范可变默认值陷阱）**：
  在 dataclass 中，严禁直接给列表赋默认值 `tags: list = []`（会抛出 ValueError）！必须使用工厂函数：
  `tags: list[str] = field(default_factory=list)`。
- **不可变值对象（`frozen=True`）**：
  设置 `@dataclass(frozen=True)` 后，对象的属性在初始化完成后**变为只读，任何尝试修改 `obj.name = "new"` 都会立即抛出 `FrozenInstanceError`**！并且该对象**自动生成 `__hash__`，可安全用作字典 Key**。
- **数据校验与衍生字段：`__post_init__`**：
  在自动生成的 `__init__` 执行完毕后自动触发，常用于参数范围校验或衍生指标预计算。

---

### 三、逐步代码演练与执行分析

```python
from dataclasses import dataclass, field
from datetime import datetime

@dataclass(frozen=True)
class Money:
    \"\"\"经典不可变值对象：金额与币种\"\"\"
    amount: float
    currency: str = "CNY"

    def __post_init__(self) -> None:
        if self.amount < 0:
            raise ValueError(f"金额不能为负: {self.amount}")

    def __add__(self, other: "Money") -> "Money":
        if self.currency != other.currency:
            raise ValueError(f"不同币种无法直接相加: {self.currency} vs {other.currency}")
        return Money(round(self.amount + other.amount, 2), self.currency)

@dataclass
class TransactionRecord:
    \"\"\"交易明细模型\"\"\"
    tx_id: str
    money: Money
    tags: list[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)

# 1. 验证不可变值对象 Money
m1 = Money(150.50, "CNY")
m2 = Money(89.50, "CNY")
m3 = m1 + m2
print(f"不可变金额累加: {m3.amount} {m3.currency}")

# 2. 验证 dataclass 自动生成的 repr 与相等性判断
tx1 = TransactionRecord("TX-1001", m1, tags=["在线支付", "图书"])
tx2 = TransactionRecord("TX-1001", m1, tags=["在线支付", "图书"], created_at=tx1.created_at)

print("自动格式化的对象表现 repr:", tx1)
print("内容相等性比较 (tx1 == tx2):", tx1 == tx2)  # True! 自动按属性比对
```

---

### 四、常见易错陷阱与排查技巧
1. **直接给属性赋可变默认值**：
   - 尝试写 `items: list = []`，Python 会在类加载时直接报错 `ValueError: mutable default <class 'list'> for field items is not allowed: use default_factory`。请永远规范使用 `field(default_factory=list)`。

---

### 五、本节小结
- `@dataclass` 自动生成 `__init__`、`__repr__`、`__eq__`，消灭样板代码。
- 可变默认值一律使用 `field(default_factory=list)`。
- 业务值对象设置 `frozen=True` 确保线程安全与不可变性。
- 利用 `__post_init__` 实现严密的数据契约校验。
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "切记：在 dataclass 中使用列表或字典默认值，必须写 field(default_factory=list)，直接赋值 [] 会被 Python 抛错拦截。"
                },
                {
                    "kind": "interview",
                    "text": "不可变领域模型 (frozen=True) 的核心优势在于消除隐藏的并发状态污染，并使对象天然可哈希。"
                }
            ],
            "demos": [
                {
                    "title": "frozen dataclass 与 post_init 校验实战",
                    "lang": "python",
                    "code": "# 演示不可变用户实体与后初始化断言\nfrom dataclasses import dataclass\n\n@dataclass(frozen=True)\nclass ApiCredential:\n    api_key: str\n    secret: str\n    environment: str = \"production\"\n\n    def __post_init__(self):\n        if len(self.api_key) < 8:\n            raise ValueError(\"API Key 长度不可少于 8 位！\")\n\ncred = ApiCredential(\"sk-prod-99887766\", \"sec_xyz123\")\nprint(\"认证凭据对象:\", cred)\n\ntry:\n    # 尝试非法修改属性\n    cred.environment = \"test\"\nexcept Exception as e:\n    print(f\"拦截属性篡改: {type(e).__name__} -> 不可变对象属性受保护！\")\n"
                }
            ]
        }
    ],
    "exercises": [
        {
            "id": "pep-ex-3-1",
            "type": "single",
            "difficulty": 1,
            "question": "在 Python 自定义类中，`__repr__` 与 `__str__` 的核心定位差异是？",
            "options": [
                {"value": "A", "label": "__repr__ 旨在提供准确无歧义的开发者调试信息；__str__ 旨在提供面向最终用户的可读文本"},
                {"value": "B", "label": "__repr__ 只能用于整数；__str__ 只能用于文本"},
                {"value": "C", "label": "两者没有任何区别，纯粹是历史别名"},
                {"value": "D", "label": "Python 只会识别 __str__，__repr__ 已被官方弃用"}
            ],
            "answer": "A",
            "explanation": "__repr__ 面向开发者，输出无歧义且尽量可复现为代码；__str__ 面向普通用户可读。当没有 __str__ 时，系统自动回退调用 __repr__。",
            "tags": ["Dunder Methods", "__repr__"]
        },
        {
            "id": "pep-ex-3-2",
            "type": "single",
            "difficulty": 2,
            "question": "在标准库 `@dataclass` 中声明一个默认值为空列表的字段时，正确的写法是？",
            "options": [
                {"value": "A", "label": "tags: list = field(default_factory=list)"},
                {"value": "B", "label": "tags: list = []"},
                {"value": "C", "label": "tags = list()"},
                {"value": "D", "label": "tags: list = None"}
            ],
            "answer": "A",
            "explanation": "dataclass 强制防范可变默认值陷阱。如果直接写 tags: list = [] 会直接抛出 ValueError。必须使用 field(default_factory=list)。",
            "tags": ["dataclass", "default_factory"]
        },
        {
            "id": "pep-ex-3-3",
            "type": "judge",
            "difficulty": 2,
            "question": "为 `@dataclass` 设置参数 `frozen=True` 后，该类的实例属性在创建后变为只读，任何尝试重新赋值修改属性的操作均会引发 `FrozenInstanceError` 异常。",
            "answer": True,
            "explanation": "正确！frozen=True 强制把数据类定义为不可变对象，不仅能防止运行时属性被意外串改，还会自动生成 __hash__ 使其实例可用作字典键或集合元素。",
            "tags": ["dataclass", "不可变模型"]
        },
        {
            "id": "pep-ex-3-4",
            "type": "fill",
            "difficulty": 2,
            "question": "在 Python 自定义类中，若想支持使用中括号下标索引或切片访问（如 `obj[0]` 或 `obj[1:3]`），必须实现的魔法方法是 `def _____(self, index):`。",
            "blanks": [["__getitem__"]],
            "explanation": "Python 的下标索引与切片访问操作符 [] 由 __getitem__ 魔法方法驱动。",
            "tags": ["Dunder Methods", "__getitem__"]
        },
        {
            "id": "pep-ex-3-5",
            "type": "single",
            "difficulty": 3,
            "question": "在自定义类中实现了 `__eq__` 方法后，如果不显式声明 `__hash__`，该类对象作为字典的 Key 时会发生什么？",
            "options": [
                {"value": "A", "label": "抛出 TypeError: unhashable type，因为重写 __eq__ 会导致 Python 默认把 __hash__ 置为 None"},
                {"value": "B", "label": "自动使用对象的物理内存地址作为哈希值"},
                {"value": "C", "label": "自动计算所有属性的 MD5 摘要"},
                {"value": "D", "label": "字典会自动退化为线性查找列表"}
            ],
            "answer": "A",
            "explanation": "Python 规定：如果类重写了 __eq__，该类的 __hash__ 会被隐式设置为 None，防止可变对象被作为字典 Key。如果该对象是不可变的，必须显式定义 __hash__。",
            "tags": ["哈希协议", "易错点"]
        },
        {
            "id": "pep-ex-3-6",
            "type": "multiple",
            "difficulty": 3,
            "question": "关于 Python 标准库 `@dataclass` 的核心优势，下列说法正确的有？",
            "options": [
                {"value": "A", "label": "自动生成基于类型注解的 __init__、__repr__ 与 __eq__ 等模板代码"},
                {"value": "B", "label": "支持通过 __post_init__ 方法在对象初始化完成后自动进行业务契约检查与参数清洗"},
                {"value": "C", "label": "可以通过 frozen=True 极其轻量地实现领域驱动设计（DDD）中的不可变值对象"},
                {"value": "D", "label": "能够将 Python 字节码自动编译为 FPGA 硬件电路"}
            ],
            "answer": ["A", "B", "C"],
            "explanation": "A、B、C 均为标准库 dataclasses 的核心收益；D 纯属无稽之谈。",
            "tags": ["dataclass", "架构优势"]
        },
        {
            "id": "pep-ex-3-7",
            "type": "single",
            "difficulty": 4,
            "question": "若想让自定义类的实例列表能够直接使用内置函数 `sorted(instances)` 自动按某一指标进行升序排序，该类至少需要实现哪个魔法方法？",
            "options": [
                {"value": "A", "label": "__lt__（定义小于运算）"},
                {"value": "B", "label": "__sort__"},
                {"value": "C", "label": "__order__"},
                {"value": "D", "label": "__rank__"}
            ],
            "answer": "A",
            "explanation": "Python 内置的排序算法（Timsort）主要依赖富比较方法中的 __lt__（Less Than）来进行对象间的相对大小排序。",
            "tags": ["__lt__", "排序协议"]
        },
        {
            "id": "pep-ex-3-8",
            "type": "code",
            "difficulty": 4,
            "question": "【动手编程】请使用 `@dataclass(frozen=True)` 定义一个不可变账单项 `InvoiceItem`：\n- 包含字段：`name: str`（商品名）、`unit_price: float`（单价）、`quantity: int = 1`（数量，默认为 1）；\n- 在 `__post_init__` 中校验：若 `unit_price <= 0` 或 `quantity <= 0`，抛出 `ValueError`；\n- 提供一个计算属性/方法 `subtotal(self) -> float`，返回 `round(self.unit_price * self.quantity, 2)`。",
            "starterCode": "from dataclasses import dataclass\n\n@dataclass(frozen=True)\nclass InvoiceItem:\n    # 请在此处定义字段、后初始化校验与 subtotal 方法\n    pass\n",
            "expectedOutput": "299.0",
            "answer": "from dataclasses import dataclass\n\n@dataclass(frozen=True)\nclass InvoiceItem:\n    name: str\n    unit_price: float\n    quantity: int = 1\n\n    def __post_init__(self):\n        if self.unit_price <= 0:\n            raise ValueError('单价必须大于 0')\n        if self.quantity <= 0:\n            raise ValueError('数量必须大于 0')\n\n    def subtotal(self) -> float:\n        return round(self.unit_price * self.quantity, 2)",
            "tests": "item = InvoiceItem('机械键盘', 149.5, 2)\nassert item.subtotal() == 299.0\ntry:\n    InvoiceItem('无效商品', -10.0, 1)\n    assert False, '未拦截负单价'\nexcept ValueError:\n    pass\ntry:\n    item.quantity = 5\n    assert False, '未阻止篡改不可变对象'\nexcept Exception:\n    pass\n",
            "explanation": "使用 @dataclass(frozen=True) 确保属性不可变，并在 __post_init__ 中断言单价与数量为正数，提供 subtotal 方法计算总价。",
            "tags": ["编程实操", "dataclass", "不可变模型"]
        }
    ]
}
