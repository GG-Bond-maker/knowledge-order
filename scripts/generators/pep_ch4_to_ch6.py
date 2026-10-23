# -*- coding: utf-8 -*-
"""
Python 工程实践 - 第 4 章至第 6 章数据定义
涵盖：
4. 自动化测试驱动开发 (TDD, pytest, 断言与 Fixture 夹具)
5. 面向对象进阶与经典设计模式实战 (SOLID 原则, 工厂模式, 策略模式, 单例模式)
6. 异常架构体系、资源管理与工业级日志 (自定义异常, 上下文管理器, logging 与 loguru)
"""

CHAPTER_4 = {
    "id": "pep-c4",
    "courseId": "python-engineering-practices",
    "order": 4,
    "title": "自动化测试驱动开发 (TDD 与 pytest)",
    "goal": "告别手动人工点测，掌握测试驱动开发 (TDD) 哲学与 pytest 现代测试框架，精通原生断言重写、参数化测试矩阵、Fixture 夹具依赖注入与 Mock 测试替身隔离。",
    "lessons": [
        {
            "id": "pep-l4-1",
            "title": "测试架构与断言艺术：为什么全面拥抱 pytest 与参数化测试",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：理解自动化测试在企业软件交付中的“安全网”价值，搞清为什么整个 Python 社区已全面放弃标准库 `unittest` 拥抱 `pytest`，掌握原生 `assert` 表达式的高阶调试信息提取，熟练运用 `@pytest.mark.parametrize` 编写多用例测试矩阵。
- **先修要求**：熟练掌握函数、异常与断言基本语法。

---

### 二、核心概念与术语解释

#### 1. 为什么“手动运行看看输出”不是真正的测试？
在业余开发中，很多人测试代码是在文件末尾加几行 `print(func(1, 2))`，然后肉眼看一眼。
**工业级软件缺陷**：
- **无法回归自动化**：代码修改了底层核心算法后，你无法确保 6 个月前编写的 200 个边界 case 是否依然全部正常；
- **肉眼不可靠**：面对复杂的 JSON 返回值或浮点数计算，肉眼很难一眼看出缺少了某个键或精度偏移；
- **持续集成（CI）无法拦截**：自动化流水线只认进程退出码（Exit Code 0 为通过，非 0 为熔断拦截）。

#### 2. 为什么抛弃 unittest 拥抱 pytest？
- **样板代码大降维**：`unittest` 强制继承 `unittest.TestCase`，所有测试必须是类方法，且断言必须写 `self.assertEqual(a, b)`、`self.assertRaises(ValueError)`，极其啰嗦；
- **原生 assert 的魔法重写（AST Rewrite）**：
  在 `pytest` 中，**测试只需要是一个以 `test_` 开头的普通函数，断言直接使用 Python 原生 `assert a == b`**！
  当断言失败时，pytest 会在底层利用抽象语法树（AST）重写技术，极其智能地打印出表达式中每一个变量当时的具体值与差异比对（Diff），排查效率提升 10 倍！

#### 3. 参数化测试矩阵：`@pytest.mark.parametrize`
在业务测试中，同一个计算函数通常需要验证几十种不同的输入与预期输出（正常值、边界零值、负数、极大值）。
传统写法需要写几十个重复的测试函数；
而在 pytest 中，只需一行装饰器即可将测试用例数据与测试逻辑解耦：
```python
import pytest

@pytest.mark.parametrize("input_val, expected", [
    (100.0, 90.0),
    (200.0, 180.0),
    (0.0, 0.0),
    (-10.0, 0.0)
])
def test_discount_matrix(input_val, expected):
    assert calculate_discount(input_val) == expected
```

#### 4. 异常断言：`pytest.raises`
验证代码在遇到非法输入时是否会如期抛出指定异常：
```python
with pytest.raises(ValueError, match="除数不能为零"):
    safe_divide(10, 0)
```

---

### 三、逐步代码演练与执行分析

```python
# 演示参数化驱动的核心思想与基于 assert 的测试执行器
def calculate_shipping_fee(order_amount: float, is_vip: bool) -> float:
    \"\"\"计算运费：满 99 包邮，VIP 无论多少一律包邮，否则运费 10 元\"\"\"
    if is_vip or order_amount >= 99.0:
        return 0.0
    return 10.0

# 模拟 pytest.mark.parametrize 的测试用例矩阵数据驱动执行
test_cases = [
    # (订单金额, 是否VIP, 期望运费, 用例描述)
    (120.0, False, 0.0, "普通用户满 99 免运费"),
    (50.0, False, 10.0, "普通用户不满 99 收 10 元运费"),
    (20.0, True, 0.0, "VIP 会员不满 99 仍免运费"),
    (99.0, False, 0.0, "临界边界值 99.0 免运费")
]

def run_test_suite():
    passed = 0
    for amt, vip, expected, case_desc in test_cases:
        actual = calculate_shipping_fee(amt, vip)
        assert actual == expected, f"用例失败 [{case_desc}]: 输入=({amt}, {vip}), 预期={expected}, 实际={actual}"
        passed += 1
        print(f"✓ 用例通过: {case_desc}")
    print(f"\\n全部 {passed} 个自动化参数化测试用例 100% 验收通过！")

run_test_suite()
```

---

### 四、常见易错陷阱与排查技巧
1. **测试用例之间相互依赖（状态污染）**：
   - 严禁测试函数 A 的执行依赖测试函数 B 的全局状态改变（如“测试A向真实数据库写入了记录，测试B去读取该记录”）。**每个单元测试必须是完全独立、无序、隔离且幂等的**。
2. **测试文件命名不符合规范**：
   - pytest 默认按规则自动扫描文件：测试文件必须以 `test_*.py` 或 `*_test.py` 命名，测试函数必须以 `test_*()` 开头。若命名为 `my_test.py`，pytest 会直接跳过找不到任何测试！

---

### 五、本节小结
- 自动化测试是工程迭代的底气，pytest 是现代事实标准。
- 极简的普通函数 + 原生 `assert` 拥有最强大的 AST 差分报错。
- 参数化 `@pytest.mark.parametrize` 高效覆盖复杂边界矩阵。
- 测试用例必须相互独立，严禁状态耦合。
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "测试文件和函数必须以 test_ 开头（如 test_order.py），否则 pytest 默认的测试发现机制（Test Discovery）将直接忽略它们。"
                },
                {
                    "kind": "performance",
                    "text": "在本地测试大型工程时，可以使用 pytest -n auto 启用 pytest-xdist 插件，利用多核 CPU 并行加速数千个用例的运行。"
                }
            ],
            "demos": [
                {
                    "title": "异常断言与测试驱动重构演示",
                    "lang": "python",
                    "code": "# 模拟异常断言驱动的业务契约测试\ndef validate_user_age(age: int) -> bool:\n    if not isinstance(age, int):\n        raise TypeError(f\"年龄必须是整数，收到: {type(age).__name__}\")\n    if age < 0 or age > 150:\n        raise ValueError(f\"年龄数值超出合法物理范围: {age}\")\n    return age >= 18\n\n# 验证合法情况\nassert validate_user_age(20) is True\nassert validate_user_age(15) is False\n\n# 验证异常防御契约\ntry:\n    validate_user_age(-1)\n    assert False, \"未如期拦截负数年龄\"\nexcept ValueError as e:\n    print(f\"✓ 成功拦截业务异常: {e}\")\n\ntry:\n    validate_user_age(\"20\")\n    assert False, \"未如期拦截字符串年龄\"\nexcept TypeError as e:\n    print(f\"✓ 成功拦截类型异常: {e}\")\n"
                }
            ]
        },
        {
            "id": "pep-l4-2",
            "title": "夹具架构与测试替身：pytest Fixture 依赖注入与 Mock 隔离",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：掌握 pytest 皇冠上的明珠——**Fixture（测试夹具）依赖注入机制**，理解夹具的生命周期作用域（`scope=\"function\"|\"module\"|\"session\"`），掌握 `unittest.mock`（Mock / Patch）对网络请求、数据库与外部不可靠 API 的解耦与隔离。
- **先修要求**：熟练掌握函数闭包与测试基本概念。

---

### 二、核心概念与术语解释

#### 1. 为什么需要 Fixture（测试夹具）？
在传统测试中，如果每个测试都需要一个干净的临时数据库连接或模拟数据表，传统写法是在每个函数里都写一遍初始化与销毁代码，或者写丑陋的 `setUp()` / `tearDown()`。
**pytest Fixture 的革命性创新：依赖注入（Dependency Injection）**：
- 你只需用 `@pytest.fixture` 装饰一个普通函数提供数据；
- **任何测试函数只需在参数列表中写上该夹具的名字，pytest 会在执行时自动把夹具的返回值注入进去**！
- **生命周期清晰**：支持通过 `yield` 分割“准备阶段”与“拆卸清理阶段（Teardown）”。

```python
import pytest

@pytest.fixture
def sample_customer_db():
    # Setup: 准备干净数据
    db = {"U101": {"name": "张三", "balance": 500.0}}
    yield db  # 测试函数在此处运行
    # Teardown: 清理连接与释放资源
    db.clear()
```

#### 2. Fixture 的生命周期作用域（Scope）
- **`scope=\"function\"`（默认）**：每个独立的测试函数执行前后，都会重新创建和销毁一次（最安全、互不干扰）；
- **`scope=\"module\"`**：整个测试文件所有测试函数共享同一个夹具实例；
- **`scope=\"session\"`**：整次测试运行期间只初始化一次（常用于昂贵的大型基建准备，如启动 Docker 测试数据库）。

#### 3. 测试替身：`unittest.mock` 解决真实依赖痛点
如果你编写的代码包含发送短信、扣款或调用第三方天气 API：
- 真实调用外部网络极慢，网络抖动会导致测试随机失败；
- 扣款测试会产生真实的财务账单；
- **解决方案：使用 Mock 模拟外部依赖的行为与返回值，实现纯粹的单元隔离测试**。

---

### 三、逐步代码演练与执行分析

```python
# 演示 Mock 替身隔离外部支付网关实操
from unittest.mock import Mock

class PaymentGateway:
    \"\"\"外部真实支付系统（生产环境需要走网络银行接口）\"\"\"
    def charge_credit_card(self, card_number: str, amount: float) -> bool:
        raise ConnectionError("生产环境网关未连接！测试环境严禁真实扣款！")

class OrderService:
    def __init__(self, gateway: PaymentGateway) -> None:
        self.gateway = gateway

    def checkout_order(self, order_id: str, card_no: str, amount: float) -> dict:
        if amount <= 0:
            return {"status": "REJECTED", "reason": "金额必须为正"}
        
        # 调用网关扣款
        success = self.gateway.charge_credit_card(card_no, amount)
        if success:
            return {"status": "SUCCESS", "order_id": order_id, "amount": amount}
        return {"status": "FAILED", "reason": "扣款失败"}

# 编写单元测试：注入 Mock 替身
def test_order_checkout_success():
    # 1. 创建 Mock 替身对象
    mock_gateway = Mock(spec=PaymentGateway)
    # 模拟扣款成功返回 True
    mock_gateway.charge_credit_card.return_value = True

    # 2. 注入被测服务
    service = OrderService(mock_gateway)
    res = service.checkout_order("ORD-999", "6222020200001234", 199.0)

    # 3. 验证业务结果与调用行为
    assert res["status"] == "SUCCESS"
    assert res["amount"] == 199.0
    
    # 验证 mock 方法确实被以正确的参数精确调用了 1 次！
    mock_gateway.charge_credit_card.assert_called_once_with("6222020200001234", 199.0)
    print("✓ Mock 隔离测试验证通过，未产生任何外部真实网络 I/O！")

test_order_checkout_success()
```

---

### 四、常见易错陷阱与排查技巧
1. **Mock 滥用导致“测了个寂寞”**：
   - 单元测试应该 Mock 外部不可控的 I/O（第三方网络、系统时钟、邮件发送）；但绝不能把内部核心业务算法也 Mock 掉，否则测试只是在自欺欺人。
2. **Patch 目标路径错误**：
   - 使用 `unittest.mock.patch` 时，黄金法则是：**“Patch 在哪里被使用，就 Mock 哪里（Mock where it is used, not where it is defined）”**。

---

### 五、本节小结
- Fixture 依赖注入极大提升了测试数据复用度与隔离性。
- 通过 yield 语法轻松实现优雅的 Setup 与 Teardown 资源回收。
- 合理使用 Mock 隔离不可控外部系统，确保测试高速、稳定、确定性运行。
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "牢记 Mock 的作用边界：Mock 外部网络、数据库与第三方 API；绝不要 Mock 你正在编写的核心业务计算逻辑。"
                }
            ],
            "demos": [
                {
                    "title": "模拟 Fixture 依赖注入与生命周期回收",
                    "lang": "python",
                    "code": "# 演示 Fixture 的生命周期 yield 流转原理\ndef fake_db_fixture():\n    print(\"\\n[Fixture Setup]: 初始化临时测试数据库连接池...\")\n    db_session = {\"status\": \"CONNECTED\", \"records\": []}\n    try:\n        yield db_session\n    finally:\n        print(\"[Fixture Teardown]: 清理事务回滚并关闭连接池！\")\n        db_session[\"status\"] = \"CLOSED\"\n\n# 模拟测试函数消费夹具\ngen = fake_db_fixture()\nsession = next(gen)  # 执行 Setup\n\n# 执行测试逻辑\nsession[\"records\"].append(\"ROW_1\")\nassert session[\"status\"] == \"CONNECTED\"\nprint(f\"测试函数执行中，当前记录数: {len(session['records'])}\")\n\n# 测试结束，执行 Teardown\ntry:\n    next(gen)\nexcept StopIteration:\n    pass\nassert session[\"status\"] == \"CLOSED\"\n"
                }
            ]
        }
    ],
    "exercises": [
        {
            "id": "pep-ex-4-1",
            "type": "single",
            "difficulty": 1,
            "question": "在 pytest 测试框架中，编写测试函数与执行断言的标准姿势是？",
            "options": [
                {"value": "A", "label": "定义以 test_ 开头的普通函数，直接使用 Python 原生 assert 语句"},
                {"value": "B", "label": "必须继承 unittest.TestCase，并使用 self.assertEqual() 方法"},
                {"value": "C", "label": "必须在所有函数前加 @test_decorator 且只能用 try-except"},
                {"value": "D", "label": "函数内部必须返回布尔值 True 或 False"}
            ],
            "answer": "A",
            "explanation": "pytest 的核心设计就是无侵入性：普通函数以 test_ 开头命名，直接使用原生 assert 表达式，pytest 通过 AST 重写提供精准的差分排查信息。",
            "tags": ["pytest", "断言"]
        },
        {
            "id": "pep-ex-4-2",
            "type": "single",
            "difficulty": 2,
            "question": "在 pytest 中，若要使用同一个测试函数对包含 5 组不同输入与预期输出的边界数据进行参数化批量测试，应使用哪个装饰器？",
            "options": [
                {"value": "A", "label": "@pytest.mark.parametrize"},
                {"value": "B", "label": "@pytest.fixture"},
                {"value": "C", "label": "@pytest.batch_test"},
                {"value": "D", "label": "@pytest.loop"}
            ],
            "answer": "A",
            "explanation": "@pytest.mark.parametrize 是 pytest 官方提供的数据驱动参数化装饰器，能够将数据矩阵与测试逻辑解耦。",
            "tags": ["parametrize", "数据驱动"]
        },
        {
            "id": "pep-ex-4-3",
            "type": "judge",
            "difficulty": 2,
            "question": "在单元测试中，为了保证测试的确定性与执行速度，对于调用第三方支付网关、发送网络请求或查询外部微服务的代码，应当使用 Mock（测试替身）进行隔离解耦。",
            "answer": True,
            "explanation": "正确！单元测试必须快速、自包含且不受外部网络抖动影响，对不稳定的外部依赖使用 Mock 是标准工程实践。",
            "tags": ["Mock", "单元测试"]
        },
        {
            "id": "pep-ex-4-4",
            "type": "fill",
            "difficulty": 2,
            "question": "在 pytest 的 Fixture 夹具定义中，若要实现类似传统 tearDown 的资源清理逻辑，应使用关键字 `_____` 将准备阶段代码与收尾清理代码隔开。",
            "blanks": [["yield"]],
            "explanation": "在 fixture 函数中，yield 之前的代码在测试前执行（Setup），yield 返回注入值；yield 之后的代码在测试完成后执行（Teardown）。",
            "tags": ["fixture", "yield"]
        },
        {
            "id": "pep-ex-4-5",
            "type": "single",
            "difficulty": 3,
            "question": "在 `@pytest.fixture` 声明中，如果将参数 `scope` 设置为 `\"session\"`，该夹具的物理生命周期是？",
            "options": [
                {"value": "A", "label": "在整个测试会话（所有测试文件运行期间）中只初始化和销毁一次，全局共享"},
                {"value": "B", "label": "每个测试函数执行前后各初始化一次"},
                {"value": "C", "label": "每个测试类执行前后各初始化一次"},
                {"value": "D", "label": "每次遇到 assert 语句都会重新执行一次"}
            ],
            "answer": "A",
            "explanation": "scope='session' 代表最高级别的会话作用域，整次 pytest 执行期间仅初始化一次，常用于全局昂贵基建准备；函数级为默认的 'function'。",
            "tags": ["fixture", "scope"]
        },
        {
            "id": "pep-ex-4-6",
            "type": "multiple",
            "difficulty": 3,
            "question": "关于编写高质量自动化单元测试的最佳实践，下列说法正确的有？",
            "options": [
                {"value": "A", "label": "测试用例之间必须完全独立，不得依赖其他测试用例执行所产生的残留副作用或顺序"},
                {"value": "B", "label": "测试应该覆盖正常路径（Happy Path）、边界值极限（Edge Cases）以及异常拦截（Error Cases）"},
                {"value": "C", "label": "测试应当具备幂等性与可重复性，任何时间任何机器重复运行结果应严格一致"},
                {"value": "D", "label": "测试代码随便写写能跑就行，完全不需要遵循代码规范与重构原则"}
            ],
            "answer": ["A", "B", "C"],
            "explanation": "A、B、C 构成专业软件工程测试金律；测试代码同样是项目的生产资产，其可读性与可维护性同样重要，D 属于错误认知。",
            "tags": ["测试原则", "工程规范"]
        },
        {
            "id": "pep-ex-4-7",
            "type": "single",
            "difficulty": 4,
            "question": "在 pytest 中验证一段代码在执行时必须抛出指定异常（如 `ValueError`），且该异常的消息文本必须包含关键字 `\"非法\"`，最规范的写法是？",
            "options": [
                {"value": "A", "label": "with pytest.raises(ValueError, match=\"非法\"): ..."},
                {"value": "B", "label": "assert pytest.expect_error(ValueError, \"非法\")"},
                {"value": "C", "label": "try: ... except ValueError: pass"},
                {"value": "D", "label": "@pytest.mark.catch_error(ValueError)"}
            ],
            "answer": "A",
            "explanation": "pytest.raises 上下文管理器配合 match 参数（支持正则匹配异常信息）是测试异常拦截的标准写法。",
            "tags": ["pytest.raises", "异常测试"]
        },
        {
            "id": "pep-ex-4-8",
            "type": "code",
            "difficulty": 4,
            "question": "【动手编程】请实现一个带缓存的汇率查询服务 `ExchangeService`：\n- 构造函数接收一个外部查询器 `fetcher`（具备方法 `fetcher.get_rate(from_curr: str, to_curr: str) -> float`）；\n- 实现方法 `get_exchange_rate(self, from_curr: str, to_curr: str) -> float`：\n  - 首先检查内部缓存 `self._cache`（Key 为 `(from_curr, to_curr)`）；若命中缓存，直接返回缓存数值，**绝不调用外部 fetcher**；\n  - 若未命中缓存，调用 `fetcher.get_rate(...)` 获取汇率，写入内部缓存后返回汇率数值；\n- 确保通过 Mock 对象的调用计数测试。",
            "starterCode": "class ExchangeService:\n    def __init__(self, fetcher):\n        self.fetcher = fetcher\n        self._cache = {}\n\n    def get_exchange_rate(self, from_curr: str, to_curr: str) -> float:\n        # 请在此处实现缓存查询逻辑\n        pass\n",
            "expectedOutput": "7.2",
            "answer": "class ExchangeService:\n    def __init__(self, fetcher):\n        self.fetcher = fetcher\n        self._cache = {}\n\n    def get_exchange_rate(self, from_curr: str, to_curr: str) -> float:\n        pair = (from_curr, to_curr)\n        if pair in self._cache:\n            return self._cache[pair]\n        rate = self.fetcher.get_rate(from_curr, to_curr)\n        self._cache[pair] = rate\n        return rate",
            "tests": "from unittest.mock import Mock\nmock_fetcher = Mock()\nmock_fetcher.get_rate.return_value = 7.20\nservice = ExchangeService(mock_fetcher)\n# 第 1 次调用：未命中缓存，应调用 fetcher 1 次\nr1 = service.get_exchange_rate('USD', 'CNY')\nassert r1 == 7.20\nassert mock_fetcher.get_rate.call_count == 1\n# 第 2 次调用相同货币对：应直接命中缓存，fetcher 计数不应增加\nr2 = service.get_exchange_rate('USD', 'CNY')\nassert r2 == 7.20\nassert mock_fetcher.get_rate.call_count == 1\n",
            "explanation": "在内部维护一个 (from_curr, to_curr) 字典缓存。未命中时委托给外部 fetcher 并记录缓存，命中时直接返回缓存，测试通过 Mock 验证调用次数严格为 1。",
            "tags": ["编程实操", "Mock", "缓存设计"]
        }
    ]
}

CHAPTER_5 = {
    "id": "pep-c5",
    "courseId": "python-engineering-practices",
    "order": 5,
    "title": "面向对象进阶与设计模式实战 (SOLID 原则)",
    "goal": "深刻领会软件设计基石 SOLID 五大原则在 Pythonic 风格下的落地实践，精通工厂模式、策略模式、单例模式等常用工业级设计模式，学会解耦复杂业务逻辑。",
    "lessons": [
        {
            "id": "pep-l5-1",
            "title": "软件架构基石：SOLID 五大设计原则与 Pythonic 实践",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：深入掌握面向对象设计的黄金法则——**SOLID 原则**，在 Python 灵活动态特性的背景下正确理解单一职责（SRP）、开闭原则（OCP）、里氏替换（LSP）、接口隔离（ISP）与依赖倒置（DIP），识别常见的架构反模式。
- **先修要求**：熟练掌握类、继承、多态与协议概念。

---

### 二、核心概念与术语解释

#### 1. SOLID 五大设计原则全景
SOLID 是由著名软件工程大师 Robert C. Martin（Uncle Bob）提出的面向对象设计五大基石：
1. **S - 单一职责原则 (Single Responsibility Principle, SRP)**：
   - “一个类或模块应该有且仅有一个引起它变更的原因”；
   - 反模式：一个被称为 `UserManager` 的“上帝类（God Class）”，既管用户鉴权、又管密码加盐、还管发邮件、还负责在数据库里执行 SQL！
2. **O - 开闭原则 (Open-Closed Principle, OCP)**：
   - “对扩展开放（Open for extension），对修改关闭（Closed for modification）”；
   - 增加新业务功能时，应该通过“增加新类/策略实现”来完成，而不是在原有的庞大函数里不断加 `if-elif-else`！
3. **L - 里氏替换原则 (Liskov Substitution Principle, LSP)**：
   - “子类必须能够无缝替换掉其父类，而程序的行为不产生异常”；
   - 规则：子类重写父类方法时，前置条件不能更严，后置条件不能更宽，不能抛出父类未约定的新异常。
4. **I - 接口隔离原则 (Interface Segregation Principle, ISP)**：
   - “客户端不应该被强迫依赖它不需要的接口”；
   - 在 Python 中，通过细粒度的 `Protocol` 或小型抽象基类组合，避免定义包含 30 个抽象方法的“臃肿大接口”。
5. **D - 依赖倒置原则 (Dependency Inversion Principle, DIP)**：
   - “高层模块不应该依赖低层模块，二者都应该依赖于抽象；抽象不应该依赖细节，细节应该依赖抽象”；
   - 这是控制反转（IoC）与依赖注入（DI）的理论核心。

---

### 三、逐步代码演练与执行分析

```python
# 演示开闭原则（OCP）与依赖倒置（DIP）的经典重构实战
from abc import ABC, abstractmethod
from typing import List

# 1. 抽象折扣策略接口
class DiscountStrategy(ABC):
    @abstractmethod
    def calculate_discount(self, original_price: float) -> float:
        \"\"\"返回实际折扣掉的金额\"\"\"
        pass

# 2. 具体扩展实现（对扩展开放）
class NoDiscount(DiscountStrategy):
    def calculate_discount(self, original_price: float) -> float:
        return 0.0

class VipPercentageDiscount(DiscountStrategy):
    def __init__(self, rate: float = 0.15) -> None:
        self.rate = rate

    def calculate_discount(self, original_price: float) -> float:
        return original_price * self.rate

class SeasonalFlatDiscount(DiscountStrategy):
    def __init__(self, threshold: float = 200.0, rebate: float = 30.0) -> None:
        self.threshold = threshold
        self.rebate = rebate

    def calculate_discount(self, original_price: float) -> float:
        return self.rebate if original_price >= self.threshold else 0.0

# 3. 高层订单服务（依赖抽象接口，对修改关闭）
class OrderCheckoutContext:
    def __init__(self, discount_strategy: DiscountStrategy) -> None:
        # 依赖注入：高层不依赖任何具体折扣类
        self.strategy = discount_strategy

    def checkout(self, price: float) -> float:
        discount = self.strategy.calculate_discount(price)
        final_pay = max(0.0, price - discount)
        return round(final_pay, 2)

# 当明天业务提出“新用户优惠”时，完全不需要修改 OrderCheckoutContext 的代码，只需新增一个子类！
ctx_vip = OrderCheckoutContext(VipPercentageDiscount(0.2))
print("VIP 八折结算实付: ¥", ctx_vip.checkout(300.0))  # 240.0

ctx_seasonal = OrderCheckoutContext(SeasonalFlatDiscount(threshold=200.0, rebate=50.0))
print("满减季结算实付: ¥", ctx_seasonal.checkout(300.0))  # 250.0
```

---

### 四、常见易错陷阱与排查技巧
1. **过度设计的“架构狂热症”**：
   - SOLID 是指导原则而非教条。如果一个只有 20 行的小工具脚本，硬生生拆出 8 个抽象基类、5 个工厂，反而会大幅劣化代码可读性。在重构阶段当代码产生变更痛点时再践行 SOLID。

---

### 五、本节小结
- 单一职责化解臃肿上帝类。
- 开闭原则通过多态与抽象拥抱变化，拒绝死板的成百上千行 `if-elif`。
- 依赖倒置实现高内聚低耦合，为单元测试提供天然支点。
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "警惕 if-elif 地狱：当发现自己在给订单状态或打折规则不断加 elif 时，就是该用开闭原则重构为策略模式的信号。"
                }
            ],
            "demos": [
                {
                    "title": "依赖倒置与数据持久化解耦演示",
                    "lang": "python",
                    "code": "# 演示依赖倒置：业务服务不直接绑定特定数据库\nfrom abc import ABC, abstractmethod\n\nclass UserRepository(ABC):\n    @abstractmethod\n    def get_user_name(self, uid: str) -> str:\n        pass\n\nclass MemoryUserRepo(UserRepository):\n    def get_user_name(self, uid: str) -> str:\n        return {\"U1\": \"张三\", \"U2\": \"李四\"}.get(uid, \"未知用户\")\n\nclass UserService:\n    def __init__(self, repo: UserRepository):\n        self.repo = repo  # 依赖抽象接口\n\n    def format_greeting(self, uid: str) -> str:\n        name = self.repo.get_user_name(uid)\n        return f\"尊敬的客户 [{name}]，欢迎回来！\"\n\nservice = UserService(MemoryUserRepo())\nprint(service.format_greeting(\"U1\"))\n"
                }
            ]
        },
        {
            "id": "pep-l5-2",
            "title": "工业级设计模式实战：工厂模式、策略模式与线程安全单例",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：掌握 Pythonic 风格下的三大高频工业设计模式：**工厂模式（Factory Pattern）**实现对象创建解耦、**策略模式（Strategy Pattern）**消除深层条件分支、**线程安全单例模式（Singleton Pattern）**管理全局共享资源（如数据库连接池或全局配置）。
- **先修要求**：已熟练掌握类、多态与多线程基本认知。

---

### 二、核心概念与术语解释

#### 1. 工厂模式 (Factory Pattern)
当对象的创建逻辑比较复杂（例如根据不同的配置文件类型分别创建 `JsonDataLoader`、`CsvDataLoader`、`ParquetDataLoader`），直接在业务层 `new` 会导致强耦合。
工厂模式将“决定创建哪个具体类”的职责集中到一个工厂中，业务调用方只需传参告知需求类型。

#### 2. 策略模式 (Strategy Pattern)
定义一系列算法家族，把它们一个个封装起来，并且使它们可以相互替换。策略模式让算法的变化独立于使用算法的客户。
在 Python 中，因为**函数本身就是一等公民（First-class Object）**，甚至不需要像 Java 那样为每个策略写一个类，**直接传递普通函数即可作为超轻量的策略模式**！

#### 3. 线程安全单例模式 (Thread-safe Singleton)
确保某一个类在整个进程中**有且仅有一个实例**，并提供一个全局访问点。
**经典陷阱**：在单线程下写单例很容易，但在并发多线程环境下，多个线程同时进入初始化检查会导致创建出两个不同对象！
**解决方案**：使用互斥锁（`threading.Lock`）实现**双重检查锁定（Double-Checked Locking）**。

---

### 三、逐步代码演练与执行分析

```python
import threading
from typing import Dict, Type

# 1. 线程安全单例模式（配置管理器）
class GlobalAppConfig:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        # 第一次检查（避免已存在实例时不必要的加锁性能开销）
        if cls._instance is None:
            with cls._lock:
                # 第二次检查（防止多线程并发穿透）
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self, env: str = "production") -> None:
        if getattr(self, "_initialized", False):
            return
        self.env = env
        self.settings: Dict[str, str] = {"timeout": "30", "debug": "false"}
        self._initialized = True

cfg1 = GlobalAppConfig("test")
cfg2 = GlobalAppConfig("staging")
print("cfg1 is cfg2?", cfg1 is cfg2)  # True! 严格为同一个物理实例
print("全局环境:", cfg1.env)  # test (以首个初始化为准)

# 2. 注册制工厂模式实战
class ReportExporter:
    def export(self, data: list) -> str:
        raise NotImplementedError

class JsonReportExporter(ReportExporter):
    def export(self, data: list) -> str:
        return f"[JSON 格式数据: {len(data)} 条]"

class CsvReportExporter(ReportExporter):
    def export(self, data: list) -> str:
        return f"[CSV 纯文本数据: {len(data)} 条]"

class ExporterFactory:
    \"\"\"工厂类：基于字典映射实现易于动态扩展的导出器注册表\"\"\"
    _registry: Dict[str, Type[ReportExporter]] = {
        "json": JsonReportExporter,
        "csv": CsvReportExporter
    }

    @classmethod
    def register_format(cls, format_type: str, exporter_cls: Type[ReportExporter]) -> None:
        cls._registry[format_type.lower()] = exporter_cls

    @classmethod
    def create_exporter(cls, format_type: str) -> ReportExporter:
        creator = cls._registry.get(format_type.lower())
        if not creator:
            raise ValueError(f"不支持的报表导出格式: {format_type}")
        return creator()

exp = ExporterFactory.create_exporter("json")
print("工厂生产导出器:", exp.export([1, 2, 3]))
```

---

### 四、常见易错陷阱与排查技巧
1. **模块级单例（Pythonic 最佳选择）**：
   - 很多 Java 程序员转 Python 后习惯性手写复杂的 Singleton 类。实际上，**在 Python 中，最地道、最天然、且天然线程安全的单例就是“Python 模块（Module）本身”**！因为 Python 在首次 `import` 某个模块后会自动缓存到 `sys.modules`，后续任何文件 import 拿到的都是完全相同的单例模块。

---

### 五、本节小结
- 策略模式消灭分支，利用 Python 函数一等公民特性更简洁。
- 工厂模式集中创建逻辑，注册表机制实现优雅解耦。
- 单例模式需防范多线程并发竞态，优先考虑 Python 模块级天然单例。
""",
            "tips": [
                {
                    "kind": "interview",
                    "text": "面试杀手锏：当被问到 Python 中如何实现单例时，指出'模块导入是天然的线程安全单例'是最地道、体现高级认知的回答。"
                }
            ],
            "demos": [
                {
                    "title": "函数式策略模式极简优雅实现",
                    "lang": "python",
                    "code": "# 演示 Python 特色：直接将函数作为策略传递\ndef tax_us(amount: float) -> float:\n    return amount * 0.08\n\ndef tax_eu(amount: float) -> float:\n    return amount * 0.20\n\ndef calculate_invoice(subtotal: float, tax_strategy) -> float:\n    return round(subtotal + tax_strategy(subtotal), 2)\n\nprint(\"美国税率发票:\", calculate_invoice(100.0, tax_us))\nprint(\"欧洲税率发票:\", calculate_invoice(100.0, tax_eu))\n"
                }
            ]
        }
    ],
    "exercises": [
        {
            "id": "pep-ex-5-1",
            "type": "single",
            "difficulty": 1,
            "question": "在面向对象软件工程中，单一职责原则（Single Responsibility Principle, SRP）的核心定义是？",
            "options": [
                {"value": "A", "label": "一个类或模块应该有且仅有一个引起它变更的原因（专注于做好一件事）"},
                {"value": "B", "label": "一个工程中只能定义一个全局类"},
                {"value": "C", "label": "每个函数内部只能包含单行代码"},
                {"value": "D", "label": "所有的接口都必须只有一个参数"}
            ],
            "answer": "A",
            "explanation": "SRP 原则要求高内聚，一个类只负责一项核心职责，降低因某一业务需求变更对其他不相干业务逻辑造成意外波及的风险。",
            "tags": ["SOLID", "SRP"]
        },
        {
            "id": "pep-ex-5-2",
            "type": "single",
            "difficulty": 2,
            "question": "开闭原则（Open-Closed Principle, OCP）强调的“对扩展开放，对修改关闭”在日常业务开发中的典型体现是？",
            "options": [
                {"value": "A", "label": "当增加新业务策略（如新增一种会员折扣类型）时，通过新增实现类扩展，而无需修改原有业务上下文的核心代码"},
                {"value": "B", "label": "直接把源码文件设置为操作系统级别的只读只可执行权限"},
                {"value": "C", "label": "禁止团队对代码进行任何修改，所有 bug 都留给下一任维护者"},
                {"value": "D", "label": "所有类在编译后自动关闭其构造函数"}
            ],
            "answer": "A",
            "explanation": "OCP 的核心精髓是利用多态或策略接口将多变的行为外置，新增业务变体无需改动经过严密测试的高层执行主体。",
            "tags": ["SOLID", "OCP"]
        },
        {
            "id": "pep-ex-5-3",
            "type": "judge",
            "difficulty": 2,
            "question": "在 Python 语言生态中，最天然、地道且原生具备线程安全特性的单例模式（Singleton）实现方式就是使用 Python 模块（Module）本身导入机制。",
            "answer": True,
            "explanation": "正确！Python 在首次 import 模块时会在 sys.modules 进行全局缓存，后续所有地方的 import 都共享同一份单例对象，且模块初始化受 GIL 锁保护天然线程安全。",
            "tags": ["单例模式", "Pythonic"]
        },
        {
            "id": "pep-ex-5-4",
            "type": "fill",
            "difficulty": 2,
            "question": "在面向对象设计模式中，将一组具有相同行为特性的算法分别封装并使它们可以相互无缝替换的经典模式被称为 _____ 模式（Strategy Pattern）。",
            "blanks": [["策略"]],
            "explanation": "策略模式（Strategy Pattern）将不同算法解耦封装，让算法的变化独立于其使用方。",
            "tags": ["设计模式", "策略模式"]
        },
        {
            "id": "pep-ex-5-5",
            "type": "single",
            "difficulty": 3,
            "question": "依赖倒置原则（Dependency Inversion Principle, DIP）指导我们编写高层业务模块时，应该遵循哪条准则？",
            "options": [
                {"value": "A", "label": "高层模块不应依赖具体低层实现（如具体 MySQL 数据库连接），而应共同依赖于抽象接口"},
                {"value": "B", "label": "高层业务代码必须直接 import 底层驱动库并在内部 hardcode 创建连接"},
                {"value": "C", "label": "底层细节应该控制上层业务的跳转逻辑"},
                {"value": "D", "label": "尽量不使用任何类和函数"}
            ],
            "answer": "A",
            "explanation": "DIP 强调高层业务架构与底层基础设施细节解耦，通过面向接口/协议编程，极大提升了软件系统的可插拔性与可测试性。",
            "tags": ["SOLID", "DIP"]
        },
        {
            "id": "pep-ex-5-6",
            "type": "multiple",
            "difficulty": 3,
            "question": "使用工厂模式（Factory Pattern）管理复杂对象的创建，相比于在各处业务代码里散落 `MyClass()` 构造调用，有哪些收益？",
            "options": [
                {"value": "A", "label": "集中管理复杂的对象实例化逻辑与参数前置拼装，避免业务代码分散重复"},
                {"value": "B", "label": "降低调用方与具体派生子类之间的硬编码耦合，调用方只需传入类型标识"},
                {"value": "C", "label": "便于在不修改调用方代码的前提下动态注册和引入全新的格式解析器或连接器"},
                {"value": "D", "label": "能够自动提升 Python 解释器的运行主频"}
            ],
            "answer": ["A", "B", "C"],
            "explanation": "A（集中复杂创建）、B（解耦具体子类）、C（支持开闭动态注册扩展）是工厂模式的核心价值；D 属于荒诞选项。",
            "tags": ["工厂模式", "解耦"]
        },
        {
            "id": "pep-ex-5-7",
            "type": "single",
            "difficulty": 4,
            "question": "在多线程高并发环境下编写单例类时，采用“双重检查锁定（Double-Checked Locking）”中，第一次在加锁前执行 `if cls._instance is None:` 的核心目的是？",
            "options": [
                {"value": "A", "label": "避免在单例实例已经创建成功后的常规读取中频繁执行昂贵的线程加锁操作，大幅提升高频读取性能"},
                {"value": "B", "label": "清空操作系统内部的虚拟内存"},
                {"value": "C", "label": "使实例能够被垃圾回收器提前销毁"},
                {"value": "D", "label": "检测当前 CPU 是否过热"}
            ],
            "answer": "A",
            "explanation": "一旦实例创建完成，后续所有访问都是只读读取。第一次判断无需加锁即可直接返回单例，避免了每次读取都进行互斥锁竞态的高昂性能损耗。",
            "tags": ["单例模式", "并发安全"]
        },
        {
            "id": "pep-ex-5-8",
            "type": "code",
            "difficulty": 4,
            "question": "【动手编程】请实现一个可扩展的序列化器工厂 `SerializerFactory`：\n- 预先支持内置格式 `'json'`（使用 `json.dumps` 导出）与 `'text'`（使用 `str` 导出）；\n- 提供静态/类方法 `register(format_name: str, serializer_func)` 允许动态注册新的序列化函数；\n- 提供静态/类方法 `serialize(format_name: str, data: Any) -> str`：\n  - 根据 `format_name`（忽略大小写）调用对应序列化器并返回字符串；\n  - 若请求未注册的未知格式，抛出 `ValueError`。",
            "starterCode": "import json\nfrom typing import Any\n\nclass SerializerFactory:\n    # 请在此处维护注册表并实现 register 与 serialize 方法\n    pass\n",
            "expectedOutput": "{\"a\": 1}",
            "answer": "import json\nfrom typing import Any\n\nclass SerializerFactory:\n    _registry = {\n        'json': lambda d: json.dumps(d),\n        'text': lambda d: str(d)\n    }\n\n    @classmethod\n    def register(cls, format_name: str, serializer_func):\n        cls._registry[format_name.lower()] = serializer_func\n\n    @classmethod\n    def serialize(cls, format_name: str, data: Any) -> str:\n        fmt = format_name.lower()\n        if fmt not in cls._registry:\n            raise ValueError(f'未知序列化格式: {format_name}')\n        return cls._registry[fmt](data)",
            "tests": "res_json = SerializerFactory.serialize('JSON', {'a': 1})\nassert '\"a\": 1' in res_json\nres_text = SerializerFactory.serialize('text', [1, 2])\nassert res_text == '[1, 2]'\n# 测试动态注册新格式\nSerializerFactory.register('upper_str', lambda d: str(d).upper())\nassert SerializerFactory.serialize('upper_str', 'hello') == 'HELLO'\ntry:\n    SerializerFactory.serialize('xml', {})\n    assert False, '未拦截未注册格式'\nexcept ValueError:\n    pass\n",
            "explanation": "使用类字典 _registry 集中维护格式到函数的映射，通过 format_name.lower() 实现不区分大小写的查找与动态扩展，未找到时抛出 ValueError。",
            "tags": ["编程实操", "工厂模式", "开闭原则"]
        }
    ]
}

CHAPTER_6 = {
    "id": "pep-c6",
    "courseId": "python-engineering-practices",
    "order": 6,
    "title": "异常架构体系、资源管理与工业级日志",
    "goal": "设计企业级自定义异常继承树与异常链上下文保持，掌握进阶上下文管理器协议（__enter__/__exit__ 与 contextlib），熟练运用标准库 logging 与现代 loguru 构建结构化生产日志系统。",
    "lessons": [
        {
            "id": "pep-l6-1",
            "title": "企业级异常架构设计：自定义异常继承树与异常链保持",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：掌握在复杂企业级系统中如何规划高内聚的**自定义异常继承树（Custom Exception Hierarchy）**，理解底层异常向上抛出时的“抽象断层”问题，熟练使用 PEP 3134 异常链语法 `raise ... from err` 完美保留根本原因（Root Cause）回溯。
- **先修要求**：熟练掌握 try-except 与面向对象继承。

---

### 二、核心概念与术语解释

#### 1. 为什么大中型工程必须定义自己的基础异常？
在生产代码中，直接随意抛出通用的 `Exception` 或标准库的 `ValueError` 会导致上层调用方极其痛苦：
- 调用方无法通过精准的 `except MyProjectBaseError:` 统一捕获属于当前业务库的所有错误；
- 通用异常无法承载关键的业务元数据（如错误码 `error_code`、受影响的用户 ID、重试建议）。

#### 2. 自定义异常继承树黄金架构
企业级项目应该在顶层定义一个唯一的项目基础异常，然后再按业务领域逐层派生细分：
```
                 [Exception] (Python 根异常)
                      │
            [BaseProjectError] (项目顶层基类，携带统一日志和错误码)
            ┌─────────┴─────────┐
    [DataValidationError]   [ExternalServiceError]
          │                      │
   [InvalidOrderAmount]   [PaymentGatewayTimeout]
```
**核心价值**：
- 如果调用方只想粗粒度防御，可以写 `except BaseProjectError:`；
- 如果调用方需要对支付超时做重试、对金额错误给用户弹窗，可以精准捕获细分子类！

#### 3. 异常链与上下文保持：`raise ... from original_error`
在多层架构中，当底层的数据库驱动抛出 `psycopg2.OperationalError` 时，数据访问层往往需要将其包装为业务友好的 `DataRepositoryError` 抛给服务层。
**传统做法的缺陷**：直接 `raise DataRepositoryError(...)` 会导致原始数据库驱动的底层错误信息丢失，运维人员无法定位到底是网络超时还是密码错误！
**PEP 3134 显式异常链**：
```python
try:
    connect_to_low_level_db()
except DatabaseDriverError as err:
    # 显式将新业务异常链接到底层错误对象上！
    raise DataRepositoryError("订单仓储初始化失败，服务暂时降级") from err
```
在 Traceback 中，Python 会极其清晰地输出：
`The above exception was the direct cause of the following exception:`，上层业务语义与底层根本原因两者兼得！

---

### 三、逐步代码演练与执行分析

```python
# 构建企业级自定义异常体系与上下文保持
class BaseAppError(Exception):
    \"\"\"当前系统所有业务异常的顶级基类\"\"\"
    def __init__(self, message: str, error_code: str = "ERR_INTERNAL") -> None:
        super().__init__(message)
        self.message = message
        self.error_code = error_code

    def to_dict(self) -> dict:
        return {"code": self.error_code, "error": self.message}

class PaymentServiceError(BaseAppError):
    \"\"\"支付结算业务域异常\"\"\"
    def __init__(self, message: str, tx_id: str) -> None:
        super().__init__(message, error_code="ERR_PAYMENT_FAILURE")
        self.tx_id = tx_id

def low_level_network_call():
    # 模拟底层网络库暴毙
    raise ConnectionResetError("Remote server closed connection unexpectedly")

def process_checkout(tx_id: str):
    try:
        low_level_network_call()
    except ConnectionResetError as raw_err:
        # 建立显式异常链关联！
        raise PaymentServiceError(f"交易 [{tx_id}] 扣款通道超时", tx_id=tx_id) from raw_err

try:
    process_checkout("TX-9988")
except PaymentServiceError as app_err:
    print(f"捕获业务异常: {app_err.to_dict()}, 事务ID={app_err.tx_id}")
    print(f"探查到底层根因异常 (Cause): {repr(app_err.__cause__)}")
```

---

### 四、常见易错陷阱与排查技巧
1. **直接继承自 `BaseException`**：
   - 自定义异常**必须继承自 `Exception`，绝不可继承自 `BaseException`**！因为 `BaseException` 是 `KeyboardInterrupt` 和 `SystemExit` 的父类。如果你的业务异常继承了它，一般的 `except Exception:` 将无法捕获它，引发逃逸。

---

### 五、本节小结
- 严禁随意到处抛裸 `Exception`，建立项目分层异常继承树。
- 业务异常必须继承自标准 `Exception`。
- 封装底层异常时使用 `raise ... from err` 完整保留根本原因上下文。
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "切记：自定义业务异常只能继承 Exception，绝不能继承 BaseException！否则会破坏常规的 except Exception 捕获机制。"
                }
            ],
            "demos": [
                {
                    "title": "异常树多层捕获与元数据提取演示",
                    "lang": "python",
                    "code": "# 演示异常树的分层多态捕获\nclass SystemError(Exception): pass\nclass ConfigError(SystemError): pass\nclass MissingKeyError(ConfigError): pass\n\ndef load_setting(key):\n    if key != \"HOST\":\n        raise MissingKeyError(f\"配置缺失关键键: {key}\")\n    return \"127.0.0.1\"\n\ntry:\n    load_setting(\"PORT\")\nexcept ConfigError as e:\n    print(f\"多态成功：通过中层基类 ConfigError 成功拦截深层 MissingKeyError: {e}\")\n"
                }
            ]
        },
        {
            "id": "pep-l6-2",
            "title": "上下文管理器进阶与工业级结构化日志 (Logging & Loguru)",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：掌握面向对象上下文管理器协议（`__enter__` 与 `__exit__`）及 `contextlib.contextmanager` 生成器语法糖，深刻理解如何使用它实现事务回滚、性能打点与临时环境切换；熟练掌握 Python 标准库 `logging` 的层级架构（Logger, Handler, Formatter）与现代结构化日志库 `loguru`。
- **先修要求**：熟练掌握类、生成器 yield 与基本 I/O 操作。

---

### 二、核心概念与术语解释

#### 1. 上下文管理器底层双生协议
任何支持 `with obj as target:` 的对象，其底层必须实现两个魔法方法：
- **`__enter__(self)`**：在进入 `with` 块前执行，其返回值会被赋值给 `as target`；
- **`__exit__(self, exc_type, exc_val, exc_tb)`**：在离开 `with` 块时强制执行！
  - 若块内发生异常，异常类型、值与 Traceback 会传入该方法；
  - **如果 `__exit__` 返回 `True`，当前异常会被“静默吞掉”，不再向外蔓延**；若返回 `False` 或 `None`，异常继续正常向外抛出。

#### 2. 超轻量实现：`@contextlib.contextmanager`
不需要每次都写一个完整的类，通过生成器装饰器即可快速实现：
```python
from contextlib import contextmanager

@contextmanager
def temporary_flag():
    print("进入环境：开启调试标记")
    try:
        yield  # 业务代码在此执行
    finally:
        print("离开环境：恢复原始标记")
```

#### 3. 为什么告别 print 拥抱生产级 Logging？
在生产服务中，`print` 没有任何日志级别、没有时间戳、没有模块行号、无法写入滚动日志文件，且不可按需开关。
**日志四大家族**：
- **Logger**：对外暴露的日志记录入口；
- **Handler**：决定日志输出到哪里（控制台 `StreamHandler`、轮转文件 `RotatingFileHandler`）；
- **Formatter**：决定日志文本的排版格式；
- **Filter**：决定哪些日志允许通过。
**日志级别**：`DEBUG < INFO < WARNING < ERROR < CRITICAL`。

#### 4. 现代极简利器：`loguru`
开箱即用的现代日志库，无需配置复杂的 Handler 和 Formatter，原生支持彩色高亮、异常深层堆栈追踪与自动化 JSON 结构化输出。

---

### 三、逐步代码演练与执行分析

```python
import time
from contextlib import contextmanager
import logging
import io

# 1. 自定义高精度性能计时与审计上下文管理器
class PerformanceTimer:
    def __enter__(self):
        self.start_time = time.perf_counter()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.elapsed_ms = (time.perf_counter() - self.start_time) * 1000
        # 返回 False，若内部有异常依然正常冒泡
        return False

# 2. 规范的 logging 日志系统配置与格式化输出
log_stream = io.StringIO()
logger = logging.getLogger("DataETL")
logger.setLevel(logging.DEBUG)

handler = logging.StreamHandler(log_stream)
formatter = logging.Formatter(
    fmt="[%(asctime)s] [%(levelname)s] [%(name)s:%(funcName)s:%(lineno)d] - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
handler.setFormatter(formatter)
logger.addHandler(handler)

# 结合使用上下文管理器与结构化日志
def run_batch_job():
    logger.info("批处理任务启动...")
    with PerformanceTimer() as timer:
        # 模拟数据处理耗时
        total = sum(i ** 2 for i in range(10000))
    logger.info(f"批处理计算完成 (结果={total})，耗时: {timer.elapsed_ms:.3f} ms")

run_batch_job()
print("=== 捕获的标准格式生产级日志流 ===")
print(log_stream.getvalue().strip())
```

---

### 四、常见易错陷阱与排查技巧
1. **在 `__exit__` 中盲目返回 `True`**：
   - 如果 `__exit__` 始终返回 `True`，即使代码内部发生 `NameError` 或除零错误，也会被无条件静默吞没，外部完全感知不到失败！只有明确要吞掉特定预期异常时才返回 True。

---

### 五、本节小结
- 上下文管理器通过 `__enter__` 与 `__exit__` 保证成对资源的确定性释放。
- `@contextlib.contextmanager` 极大简化临时环境与计时的编写。
- 生产环境统一使用标准 logging 格式化输出，杜绝裸写 print。
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "切忌在自定义 __exit__ 中无脑写 return True，这会吞掉所有语法与逻辑异常，导致代码执行错误却永远不报错。"
                }
            ],
            "demos": [
                {
                    "title": "contextmanager 模拟事务回滚流转",
                    "lang": "python",
                    "code": "# 演示通过 contextmanager 实现数据更新事务失败自动回滚\nfrom contextlib import contextmanager\n\nstate_store = {\"balance\": 1000.0}\n\n@contextmanager\ndef account_transaction(store):\n    snapshot = store[\"balance\"]\n    print(f\"[事务开始] 备份原始余额快照: {snapshot}\")\n    try:\n        yield store\n        print(\"[事务提交] 操作全部成功！\")\n    except Exception as e:\n        print(f\"[事务回滚] 发生异常: {e}，正在还原余额...\")\n        store[\"balance\"] = snapshot\n        raise  # 重新抛出\n\ntry:\n    with account_transaction(state_store) as s:\n        s[\"balance\"] -= 200.0\n        raise RuntimeError(\"网络中断，扣款未确认！\")\nexcept RuntimeError:\n    pass\n\nprint(\"最终账户余额 (已被安全还原):\", state_store[\"balance\"])\n"
                }
            ]
        }
    ],
    "exercises": [
        {
            "id": "pep-ex-6-1",
            "type": "single",
            "difficulty": 1,
            "question": "在 Python 中自定义业务异常体系时，所有自定义业务异常类应该直接或间接继承自哪个基类？",
            "options": [
                {"value": "A", "label": "Exception"},
                {"value": "B", "label": "BaseException"},
                {"value": "C", "label": "SystemExit"},
                {"value": "D", "label": "KeyboardInterrupt"}
            ],
            "answer": "A",
            "explanation": "自定义异常必须继承自 Exception。BaseException 是整个异常体系的顶级抽象（包含系统退出等底层信号），若业务异常继承它会导致常规 except Exception 无法拦截处理。",
            "tags": ["自定义异常", "继承体系"]
        },
        {
            "id": "pep-ex-6-2",
            "type": "single",
            "difficulty": 2,
            "question": "在将低层异常（如驱动异常）包装为上层领域业务异常向上抛出时，为了在 Traceback 中完整保留原始异常链根因信息，PEP 3134 推荐的官方语法是？",
            "options": [
                {"value": "A", "label": "raise AppError(\"操作失败\") from original_err"},
                {"value": "B", "label": "raise AppError(\"操作失败\") with original_err"},
                {"value": "C", "label": "raise AppError(\"操作失败\").link(original_err)"},
                {"value": "D", "label": "raise AppError(original_err.to_string())"}
            ],
            "answer": "A",
            "explanation": "PEP 3134 语法使用 raise NewException(...) from original_err，解释器会自动设置 __cause__ 属性并在报错回溯中清晰串联打印两层调用现场。",
            "tags": ["异常链", "from语法"]
        },
        {
            "id": "pep-ex-6-3",
            "type": "judge",
            "difficulty": 2,
            "question": "在自定义类的 `__exit__(self, exc_type, exc_val, exc_tb)` 方法中，如果明确返回了布尔值 `True`，那么在 `with` 块内部发生的所有异常都会被压制静默，不再向外层抛出。",
            "answer": True,
            "explanation": "正确！__exit__ 返回 True 表示该异常已被上下文管理器成功捕获并妥善处理，解释器会压制该异常不再向外冒泡中断程序。",
            "tags": ["上下文管理器", "__exit__"]
        },
        {
            "id": "pep-ex-6-4",
            "type": "fill",
            "difficulty": 2,
            "question": "Python 标准库 `contextlib` 模块提供了一个极其便捷的装饰器 `@_____.contextmanager`，允许使用带 yield 的生成器函数快速实现上下文管理器。",
            "blanks": [["contextlib"]],
            "explanation": "contextlib.contextmanager 是将普通生成器转换为上下文管理器的标准装饰器。",
            "tags": ["contextlib", "生成器"]
        },
        {
            "id": "pep-ex-6-5",
            "type": "single",
            "difficulty": 3,
            "question": "在 Python 标准库 `logging` 的五大默认日志级别中，按严重程度由低到高的正确排序是？",
            "options": [
                {"value": "A", "label": "DEBUG < INFO < WARNING < ERROR < CRITICAL"},
                {"value": "B", "label": "INFO < DEBUG < WARNING < ERROR < CRITICAL"},
                {"value": "C", "label": "WARNING < INFO < DEBUG < ERROR < CRITICAL"},
                {"value": "D", "label": "DEBUG < INFO < ERROR < WARNING < CRITICAL"}
            ],
            "answer": "A",
            "explanation": "标准库日志级别由低到高为：DEBUG (10) < INFO (20) < WARNING (30) < ERROR (40) < CRITICAL (50)。",
            "tags": ["logging", "日志级别"]
        },
        {
            "id": "pep-ex-6-6",
            "type": "multiple",
            "difficulty": 3,
            "question": "在生产级服务端软件开发中，为什么强烈建议使用统一的日志框架（如 logging / loguru）全面取代使用 `print()` 打印调试信息？",
            "options": [
                {"value": "A", "label": "日志系统支持等级过滤（如生产环境只打印 INFO 以上，调试时开启 DEBUG），无需频繁删改源码"},
                {"value": "B", "label": "支持统一附加元数据（时间戳、进程线程 ID、模块名称、代码行号）"},
                {"value": "C", "label": "支持将日志按日期或大小自动归档切割（Log Rotation）并流向集中式日志分析平台"},
                {"value": "D", "label": "因为 print() 在商业服务器上执行会被操作系统强制征收授权费"}
            ],
            "answer": ["A", "B", "C"],
            "explanation": "A（级别控制）、B（结构化上下文元数据）、C（文件轮转与收集）是生产日志框架的必要特性；D 属于荒诞选项。",
            "tags": ["日志系统", "生产实践"]
        },
        {
            "id": "pep-ex-6-7",
            "type": "single",
            "difficulty": 4,
            "question": "观察以下基于 `contextmanager` 实现的上下文管理器代码：\n```python\nfrom contextlib import contextmanager\n\n@contextmanager\ndef demo():\n    print(\"1\")\n    try:\n        yield\n    finally:\n        print(\"2\")\n\nwith demo():\n    print(\"3\")\n```\n控制台最终打印的数字序列是：",
            "options": [
                {"value": "A", "label": "1 -> 3 -> 2"},
                {"value": "B", "label": "1 -> 2 -> 3"},
                {"value": "C", "label": "3 -> 1 -> 2"},
                {"value": "D", "label": "2 -> 1 -> 3"}
            ],
            "answer": "A",
            "explanation": "进入 with 时执行 yield 前的代码（打印 1）；接着执行 with 内部的代码块（打印 3）；离开 with 时执行 finally 块的代码（打印 2）。顺序为 1 -> 3 -> 2。",
            "tags": ["contextmanager", "代码阅读"]
        },
        {
            "id": "pep-ex-6-8",
            "type": "code",
            "difficulty": 4,
            "question": "【动手编程】请使用 `@contextlib.contextmanager` 编写一个字典环境临时变更上下文管理器 `temporary_env_override(env_dict: dict, key: str, temp_value: str)`：\n- 进入 `with` 块时，记录 `env_dict[key]` 的原始值（若原本不存在该 key 则标记为未设置），并将 `env_dict[key]` 更新为 `temp_value`；\n- `yield` 将控制权交给 `with` 内部；\n- 无论 `with` 内部正常结束还是发生异常，在 `finally` 块中强制恢复 `env_dict[key]` 到进入前的原始状态（若原先不存在该 key，则从字典中删除它）。",
            "starterCode": "from contextlib import contextmanager\n\n@contextmanager\ndef temporary_env_override(env_dict: dict, key: str, temp_value: str):\n    # 请在此处记录原始值、修改并在 finally 恢复\n    pass\n",
            "expectedOutput": "{\"MODE\": \"prod\"}",
            "answer": "from contextlib import contextmanager\n\n@contextmanager\ndef temporary_env_override(env_dict: dict, key: str, temp_value: str):\n    has_key = key in env_dict\n    old_val = env_dict.get(key)\n    env_dict[key] = temp_value\n    try:\n        yield\n    finally:\n        if has_key:\n            env_dict[key] = old_val\n        else:\n            env_dict.pop(key, None)",
            "tests": "env = {'MODE': 'prod'}\nwith temporary_env_override(env, 'MODE', 'test'):\n    assert env['MODE'] == 'test'\nassert env['MODE'] == 'prod'\n\n# 验证原本不存在的 key 在退出后被删除\nwith temporary_env_override(env, 'DEBUG', '1'):\n    assert env['DEBUG'] == '1'\nassert 'DEBUG' not in env\n\n# 验证异常时依然安全恢复\ntry:\n    with temporary_env_override(env, 'MODE', 'crash'):\n        raise RuntimeError('Oops')\nexcept RuntimeError:\n    pass\nassert env['MODE'] == 'prod'\n",
            "explanation": "在进入时记录是否有该键和原值并更新，在 finally 块中判断：若之前存在则恢复旧值，若之前不存在则使用 pop 删除，保障环境状态无残留污染。",
            "tags": ["编程实操", "contextmanager", "环境隔离"]
        }
    ]
}
