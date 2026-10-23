# -*- coding: utf-8 -*-
"""
Python 工程实践 - 第 7 章至第 9 章数据定义
涵盖：
7. 迭代器、生成器与高阶函数式编程 (Generators, yield, Decorators, functools.wraps)
8. 高性能并发与多任务编程 (GIL, threading, multiprocessing, concurrent.futures, asyncio)
9. 端到端综合实战：构建模块化、高健壮的生产级数据处理引擎 (CLI, 配置管理, 分层架构与集成测试)
"""

CHAPTER_7 = {
    "id": "pep-c7",
    "courseId": "python-engineering-practices",
    "order": 7,
    "title": "迭代器、生成器与高阶函数式编程",
    "goal": "掌握迭代器协议与生成器 yield 惰性流式计算（实现 GB 级大数据零内存膨胀），精通装饰器闭包底层机制、元数据保留 (functools.wraps) 与通用切面编程 (AOP)。",
    "lessons": [
        {
            "id": "pep-l7-1",
            "title": "内存友好的流式计算：迭代器协议与生成器 yield 惰性求值",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：掌握 Python 的可迭代对象（Iterable）与迭代器（Iterator）双重协议，理解生成器（Generator）与 `yield` 关键字的惰性求值（Lazy Evaluation）本质，熟练编写流式处理海量日志与流式数据管道。
- **先修要求**：熟练掌握 for 循环、列表与函数。

---

### 二、核心概念与术语解释

#### 1. 可迭代对象 (Iterable) vs 迭代器 (Iterator)
- **可迭代对象（Iterable）**：实现了 `__iter__()` 方法，返回一个迭代器（如 `list`, `dict`, `set`, `str`）；
- **迭代器（Iterator）**：同时实现了 `__iter__()` 和 `__next__()` 方法；
  - 每次调用 `next(it)`，迭代器返回序列中的下一个元素；
  - 当所有元素被消费殆尽时，强制抛出 `StopIteration` 异常终止循环；
  - **核心特征：单向一次性消费**。迭代器一旦走完就“干涸”了，无法像列表那样倒退或重头再来。

#### 2. 生成器函数：`yield` 的暂停与恢复魔法
任何包含 `yield` 关键字的函数都不再是普通函数，而是一个**生成器函数（Generator Function）**！
- 普通函数调用 `func()` 立即执行所有代码并由 `return` 返回结果；
- 生成器函数调用 `gen()` **不会立即执行函数体代码**，而是返回一个生成器对象；
- 当外部调用 `next(gen)` 时，函数才开始执行，直到遇到 `yield` 表达式：**它将值吐给调用方，并把自身的全部执行上下文（局部变量、当前行指针）完全冻结挂起**！
- 下次再调用 `next(gen)`，函数在刚刚暂停的地方直接苏醒，继续往下跑！

#### 3. 为什么海量数据处理必须使用生成器？
假设服务器磁盘上有一份 20GB 的交易日志：
- 如果写 `lines = file.readlines()` 或用列表存储，Python 会试图一次性在内存中申请 20GB 内存，服务器瞬间 OOM 崩溃！
- 如果写生成器 `def read_large_file(): while ...: yield line`，**内存开销永远只有几 KB（永远只存当前正在处理的那单行数据）**！

---

### 三、逐步代码演练与执行分析

```python
# 演示生成器管道：对海量日志实现无限流式过滤与统计
from typing import Iterator

def stream_log_records() -> Iterator[str]:
    \"\"\"模拟从磁盘流式持续产出日志行\"\"\"
    logs = [
        "2024-05-01 10:00:01 [INFO] User U101 login",
        "2024-05-01 10:00:02 [ERROR] Database timeout on shard 3",
        "2024-05-01 10:00:03 [INFO] User U102 pay success",
        "2024-05-01 10:00:04 [ERROR] File not found: /tmp/invoice.pdf",
        "2024-05-01 10:00:05 [WARN] Memory high: 88%"
    ]
    for line in logs:
        yield line  # 每次仅产出一行，惰性求值

# 管道流水线构建（像搭积木一样串联多个生成器）
def filter_errors(log_stream: Iterator[str]) -> Iterator[str]:
    for line in log_stream:
        if "[ERROR]" in line:
            yield line

def extract_error_messages(error_stream: Iterator[str]) -> Iterator[str]:
    for line in error_stream:
        msg = line.split("[ERROR]")[1].strip()
        yield msg.upper()

# 串联执行：此时没有任何真实计算发生，仅构建了惰性流水线！
raw_logs = stream_log_records()
only_errors = filter_errors(raw_logs)
clean_msgs = extract_error_messages(only_errors)

# 仅在被消费迭代时，数据才一滴一滴流动
print("=== 流式提取出的错误警报清单 ===")
for alert in clean_msgs:
    print(f"警报触发: {alert}")
```

---

### 四、常见易错陷阱与排查技巧
1. **生成器是一次性消耗品**：
   - 试图对同一个生成器对象遍历两次：第一次能正常打印数据，第二次直接变为空！如果需要多次复用，要么重新调用生成器函数创建新实例，要么将其固化为列表 `list(gen)`（需评估内存）。

---

### 五、本节小结
- 迭代器由 `__iter__` 与 `__next__` 驱动，单向消费。
- `yield` 冻结函数执行状态，提供恒定内存消耗的流式处理能力。
- 采用生成器管道模式处理大规模 ETL，优雅高效。
""",
            "tips": [
                {
                    "kind": "performance",
                    "text": "将大型数据处理拆分为多个由 yield 驱动的生成器函数串联，可以实现完全流式（Streaming）计算，内存占用保持常数级 O(1)。"
                }
            ],
            "demos": [
                {
                    "title": "生成器无限序列与分批滑动窗口",
                    "lang": "python",
                    "code": "# 演示分批批次生成器（Batching Generator）\ndef batch_generator(iterable, batch_size=3):\n    batch = []\n    for item in iterable:\n        batch.append(item)\n        if len(batch) == batch_size:\n            yield batch\n            batch = []\n    if batch:\n        yield batch\n\ndata = [1, 2, 3, 4, 5, 6, 7, 8]\nfor b in batch_generator(data, batch_size=3):\n    print(\"产出批次:\", b)\n"
                }
            ]
        },
        {
            "id": "pep-l7-2",
            "title": "面向切面编程 (AOP)：装饰器闭包原理与 functools.wraps 工业级实战",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：掌握 Python 高阶特性——**装饰器（Decorators）**的闭包底层物理本质，搞清 `@syntax` 语法糖的等价展开，熟练掌握使用 `functools.wraps` 保留原始函数元数据，能够编写通用的重试、性能打点与权限校验切面。
- **先修要求**：熟练掌握函数作为一等公民、可变参数 `*args, **kwargs`。

---

### 二、核心概念与术语解释

#### 1. 什么是装饰器？
装饰器是**面向切面编程（Aspect-Oriented Programming, AOP）**的标志性利器。
它允许你在不修改目标函数源代码、不改变其调用方式的前提下，**为函数动态注入通用横切逻辑**（如记录调用日志、统计耗时、权限鉴权、异常自动重试、参数缓存）。

#### 2. 闭包与语法糖的本质展开
语法：
```python
@my_decorator
def greet():
    print("Hello")
```
在 Python 解释器底层的真实物理动作仅仅是一行等价展开赋值：
```python
greet = my_decorator(greet)
```
- 装饰器本身是一个接收原函数作为参数的外部函数；
- 内部定义一个包装函数（Wrapper），闭包捕获原函数引用；
- 最终返回这个包装函数替代原函数。

#### 3. 史诗级陷阱：为什么必须用 `@functools.wraps`？
如果裸写装饰器，被修饰的函数其名字 `func.__name__` 和文档 `func.__doc__` 会被悄然替换为内部包装函数的名字（如 `'wrapper'`）！
**严重后果**：
- 自动化文档工具（Sphinx）生成的 API 文档名字全变成了 wrapper；
- 调试报错时，Traceback 堆栈里所有的函数名都叫 wrapper，根本无法确定具体是哪个函数出了错！
- **标准工程规范：在包装函数上方必须添加 `@functools.wraps(func)`，自动将原函数的全部元数据深拷贝复制回来**！

---

### 三、逐步代码演练与执行分析

```python
import functools
import time
from typing import Callable, Any

def retry_on_exception(max_retries: int = 3, delay_sec: float = 0.1):
    \"\"\"带参装饰器：当目标函数发生指定异常时，自动按最大重试次数重试\"\"\"
    def decorator(func: Callable) -> Callable:
        # 必须使用 @functools.wraps 保留原函数的 __name__ 与 __doc__
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            attempts = 0
            while attempts < max_retries:
                try:
                    return func(*args, **kwargs)
                except Exception as err:
                    attempts += 1
                    print(f"[重试日志] 函数 {func.__name__} 执行失败 (第 {attempts}/{max_retries} 次): {err}")
                    if attempts >= max_retries:
                        print(f"[重试日志] 达到最大重试次数，向外抛出异常！")
                        raise
                    time.sleep(delay_sec)
        return wrapper
    return decorator

# 模拟一个前两次调用失败、第三次才成功的易失败网络接口
call_counter = 0

@retry_on_exception(max_retries=3, delay_sec=0.05)
def unstable_network_query(query_id: str) -> dict:
    \"\"\"远程查询敏感客户资产\"\"\"
    global call_counter
    call_counter += 1
    if call_counter < 3:
        raise ConnectionResetError("网络临时丢包")
    return {"query_id": query_id, "data": "ASSET_APPROVED"}

# 验证调用与元数据保留
print("原函数真实名字:", unstable_network_query.__name__)  # 严格为 unstable_network_query
print("原函数文档说明:", unstable_network_query.__doc__)

result = unstable_network_query("QUERY-8801")
print("最终成功获取结果:", result)
```

---

### 四、常见易错陷阱与排查技巧
1. **忘记在包装函数里 return 原函数的返回值**：
   - 如果 wrapper 函数内部写了 `func(*args, **kwargs)` 但最前头漏写了 `return`，调用修饰后的函数永远拿到的都是 `None`！

---

### 五、本节小结
- 装饰器实现业务与系统横切逻辑（日志/重试/耗时）的彻底解耦。
- 原理是高阶函数与闭包，`@decor` 等价于 `f = decor(f)`。
- 永远在包装层加上 `@functools.wraps(func)` 保持元数据纯洁。
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "切记：编写任何装饰器时，在 wrapper 上方必须添加 @functools.wraps(func)，否则被装饰函数的 __name__、__doc__ 会全部丢失变成 wrapper。"
                }
            ],
            "demos": [
                {
                    "title": "耗时监控切面装饰器实战",
                    "lang": "python",
                    "code": "# 演示工业级通用执行耗时打点装饰器\nimport functools\nimport time\n\ndef time_audit(threshold_ms: float = 5.0):\n    def decorator(fn):\n        @functools.wraps(fn)\n        def wrapper(*args, **kwargs):\n            t0 = time.perf_counter()\n            res = fn(*args, **kwargs)\n            cost_ms = (time.perf_counter() - t0) * 1000\n            if cost_ms >= threshold_ms:\n                print(f\"[性能告警] 函数 {fn.__name__} 耗时偏高: {cost_ms:.2f} ms >= 阈值 {threshold_ms} ms\")\n            return res\n        return wrapper\n    return decorator\n\n@time_audit(threshold_ms=1.0)\ndef heavy_task():\n    return sum(i for i in range(200000))\n\nprint(\"任务结果:\", heavy_task())\n"
                }
            ]
        }
    ],
    "exercises": [
        {
            "id": "pep-ex-7-1",
            "type": "single",
            "difficulty": 1,
            "question": "在 Python 中，编写生成器（Generator）函数时，使用的用于将当前值产出并暂停自身执行状态的关键字是？",
            "options": [
                {"value": "A", "label": "yield"},
                {"value": "B", "label": "return"},
                {"value": "C", "label": "pause"},
                {"value": "D", "label": "defer"}
            ],
            "answer": "A",
            "explanation": "yield 关键字是 Python 生成器的核心标记，它挂起当前函数并保留所有局部变量，下次调用 next() 时从该处恢复执行。",
            "tags": ["生成器", "yield"]
        },
        {
            "id": "pep-ex-7-2",
            "type": "single",
            "difficulty": 2,
            "question": "在编写自定义函数装饰器时，为什么强烈建议在包装函数 `wrapper` 上添加 `@functools.wraps(func)` 装饰器？",
            "options": [
                {"value": "A", "label": "自动将原函数的函数名（__name__）、文档字符串（__doc__）等元数据复制到包装函数上，避免元数据丢失"},
                {"value": "B", "label": "使被装饰函数的执行速度提升 100 倍"},
                {"value": "C", "label": "防止被装饰函数抛出任何异常"},
                {"value": "D", "label": "只有加上它，装饰器才能被 Python 解释器识别"}
            ],
            "answer": "A",
            "explanation": "若不加 @functools.wraps，修饰后的函数名会变成内部的 'wrapper'，导致调试排错和 API 文档生成工具严重失真。",
            "tags": ["装饰器", "functools.wraps"]
        },
        {
            "id": "pep-ex-7-3",
            "type": "judge",
            "difficulty": 2,
            "question": "生成器对象在经过一次完整迭代（即所有数据被读取完毕抛出 StopIteration 后），若再次对其使用 for 循环遍历，会自动重新从头开始产出数据。",
            "answer": False,
            "explanation": "错误！生成器是一次性单向消费品，一旦耗尽便不可复原，再次迭代不会产出任何内容。若需重新迭代必须重新调用生成器函数创建新实例。",
            "tags": ["生成器特性", "一次性消费"]
        },
        {
            "id": "pep-ex-7-4",
            "type": "fill",
            "difficulty": 2,
            "question": "Python 迭代器协议要求对象必须实现两个核心魔法方法：`__iter__()` 以及用于获取下一项的 `_____()`。",
            "blanks": [["__next__"]],
            "explanation": "迭代器必须实现 __next__() 方法，并在元素迭代耗尽时抛出 StopIteration 异常。",
            "tags": ["迭代器协议", "__next__"]
        },
        {
            "id": "pep-ex-7-5",
            "type": "single",
            "difficulty": 3,
            "question": "观察以下代码：\n```python\ndef gen():\n    yield 1\n    yield 2\n\ng = gen()\nprint(next(g))\nprint(next(g))\n```\n如果在最后一行之后再次执行 `print(next(g))`，会抛出哪个异常？",
            "options": [
                {"value": "A", "label": "StopIteration"},
                {"value": "B", "label": "IndexError"},
                {"value": "C", "label": "GeneratorExit"},
                {"value": "D", "label": "ValueError"}
            ],
            "answer": "A",
            "explanation": "当迭代器没有更多元素可产出时，按照 Python 官方迭代器协议标准，继续调用 next() 会强制抛出 StopIteration 异常。",
            "tags": ["StopIteration", "迭代协议"]
        },
        {
            "id": "pep-ex-7-6",
            "type": "multiple",
            "difficulty": 3,
            "question": "使用生成器（Generator）进行大规模数据流式处理，相比一次性将数据全部读取为列表，具有哪些核心工程优势？",
            "options": [
                {"value": "A", "label": "惰性按需求值，内存开销恒定（O(1) 空间复杂度），能轻松处理超出物理内存上限的大数据流"},
                {"value": "B", "label": "首批数据产出延迟极低，无需等待全量数据在内存中加载完毕即可立即开始下游消费"},
                {"value": "C", "label": "多个生成器可以像管道流水线一样优雅串联解耦（Filter -> Transform -> Export）"},
                {"value": "D", "label": "生成器支持直接使用负数下标切片访问（如 g[-1]）"}
            ],
            "answer": ["A", "B", "C"],
            "explanation": "A（内存常数级）、B（低延迟响应）、C（管道式组合）是生成器的三大王牌优势；生成器是单向不可切片的，不支持 g[-1] 下标访问，D 错误。",
            "tags": ["生成器优势", "流式计算"]
        },
        {
            "id": "pep-ex-7-7",
            "type": "single",
            "difficulty": 4,
            "question": "在 Python 解释器中，形如：\n```python\n@logger\n@auth\ndef pay():\n    pass\n```\n的多层装饰器堆叠嵌套，其实际展开的真实执行包裹顺序是？",
            "options": [
                {"value": "A", "label": "pay = logger(auth(pay))（由内向外包裹，执行时先经过 logger 再经过 auth）"},
                {"value": "B", "label": "pay = auth(logger(pay))"},
                {"value": "C", "label": "两者随机并发执行"},
                {"value": "D", "label": "语法错误，Python 不允许同时添加两个装饰器"}
            ],
            "answer": "A",
            "explanation": "多层装饰器是自下而上包裹的：离函数最近的 auth 先包裹 pay，生成的包装对象再被 logger 包裹，等价于 pay = logger(auth(pay))。",
            "tags": ["装饰器顺序", "执行原理"]
        },
        {
            "id": "pep-ex-7-8",
            "type": "code",
            "difficulty": 4,
            "question": "【动手编程】请编写一个通用的调用次数限额装饰器 `limit_calls(max_calls: int)`：\n- 传入参数 `max_calls` 声明该函数允许被调用的最大总次数；\n- 内部维护一个调用计数器；每次函数被成功调用时计数器加 1；\n- 若调用次数超过 `max_calls`，不再执行原函数，而是抛出 `RuntimeError('超出最大调用次数限制')`；\n- 必须使用 `@functools.wraps` 保留原函数元数据。",
            "starterCode": "import functools\nfrom typing import Callable\n\ndef limit_calls(max_calls: int):\n    # 请在此处实现限额装饰器逻辑\n    pass\n",
            "expectedOutput": "100",
            "answer": "import functools\nfrom typing import Callable\n\ndef limit_calls(max_calls: int):\n    def decorator(func: Callable) -> Callable:\n        calls = 0\n        @functools.wraps(func)\n        def wrapper(*args, **kwargs):\n            nonlocal calls\n            if calls >= max_calls:\n                raise RuntimeError('超出最大调用次数限制')\n            calls += 1\n            return func(*args, **kwargs)\n        return wrapper\n    return decorator",
            "tests": "@limit_calls(max_calls=2)\ndef ping():\n    return 'pong'\n\nassert ping.__name__ == 'ping'\nassert ping() == 'pong'\nassert ping() == 'pong'\ntry:\n    ping()\n    assert False, '未如期拦截超额调用'\nexcept RuntimeError as e:\n    assert '超出最大调用次数限制' in str(e)\n",
            "explanation": "使用带参装饰器与 nonlocal calls 闭包计数器，达到阈值时阻断执行抛出 RuntimeError，且使用 @functools.wraps 保护函数名与文档属性。",
            "tags": ["编程实操", "装饰器", "闭包"]
        }
    ]
}

CHAPTER_8 = {
    "id": "pep-c8",
    "courseId": "python-engineering-practices",
    "order": 8,
    "title": "高性能并发与多任务编程 (GIL、多进程与协程)",
    "goal": "破解 GIL 物理本质与性能迷思，明确 CPU 密集型与 I/O 密集型任务选型，熟练运用 concurrent.futures 线程池/进程池与 asyncio 异步非阻塞事件循环。",
    "lessons": [
        {
            "id": "pep-l8-1",
            "title": "破解 GIL 迷思：全局解释器锁本质与 CPU vs I/O 密集任务选型",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：掌握 CPython 核心设计——**全局解释器锁（Global Interpreter Lock, GIL）**的历史由来与物理工作机制，搞清为什么 Python 多线程无法利用多核 CPU 算力，深刻理解 **CPU 密集型（CPU-bound）** 与 **I/O 密集型（I/O-bound）** 任务的本质差异与架构选型。
- **先修要求**：了解操作系统进程与线程基本概念。

---

### 二、核心概念与术语解释

#### 1. 什么是 GIL？为什么它存在？
- 在 CPython（官方实现）中，内存垃圾回收依赖引用计数（Reference Counting）。
- 为了防止多个操作系统线程同时修改同一个对象的引用计数导致严重的内存破坏或死锁，设计者在解释器层面加了一把极其粗粒度的互斥全局大锁——**GIL**；
- **物理结果**：**在任何一个微观时刻，同一个 Python 解释器进程内，只能有且仅有 1 个线程在 CPU 上执行 Python 字节码！** 即使你的电脑有 64 核 CPU，多线程 Python 脚本也只能跑满 1 个核！

#### 2. CPU 密集型 vs I/O 密集型：冰与火之歌
| 任务类型 | 特征 | 现实案例 | 最佳并发技术选型 |
| :--- | :--- | :--- | :--- |
| **CPU 密集型 (CPU-bound)** | 绝大部分时间在进行繁重数学矩阵计算、图像编解码、哈希加密 | 图像缩放、深度学习模型推理、亿级数据洗牌 | **多进程（`multiprocessing`）**<br>彻底绕过 GIL，每个进程独立拥有独立的 Python 解释器与独立内存空间！ |
| **I/O 密集型 (I/O-bound)** | 绝大部分时间在等待网络响应、数据库返回、磁盘文件读写（CPU 处于空闲等待状态） | 爬虫抓取 1000 个网页、微服务 API 聚合、文件上传下载 | **多线程（`threading`）或 异步协程（`asyncio`）**<br>当一个线程发生 I/O 等待时，CPython 会主动释放 GIL，让其他线程并发工作！ |

#### 3. 为什么多线程跑 CPU 密集任务反而更慢？
如果你用 4 个线程去计算大整数乘法，运行时间往往比单线程还要慢 30%~50%！
因为操作系统在多个线程之间频繁进行无意义的上下文切换（Context Switch）与争夺 GIL 锁竞态，产生昂贵的切换内耗。

---

### 三、逐步代码演练与执行分析

```python
import time
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor

# 1. 模拟一个纯 CPU 密集的数学计算任务
def cpu_heavy_task(n: int) -> int:
    total = 0
    for i in range(n):
        total += i * i
    return total

def run_performance_showdown():
    work_load = [2000000, 2000000, 2000000, 2000000]

    # 单线程顺序执行基准
    t0 = time.perf_counter()
    res_seq = [cpu_heavy_task(x) for x in work_load]
    t_seq = time.perf_counter() - t0
    print(f"1. 单线程顺序执行耗时: {t_seq:.3f} 秒")

    # 多线程执行 CPU 密集任务（受限于 GIL 锁，无法多核加速）
    t0 = time.perf_counter()
    with ThreadPoolExecutor(max_workers=4) as pool:
        res_thread = list(pool.map(cpu_heavy_task, work_load))
    t_thread = time.perf_counter() - t0
    print(f"2. 多线程执行耗时:     {t_thread:.3f} 秒 (受 GIL 限制，没有本质提速)")

    print("\\n架构结论：CPU 密集计算必须使用 ProcessPoolExecutor 多进程跨越 GIL！")

run_performance_showdown()
```

---

### 四、常见易错陷阱与排查技巧
1. **Windows 下多进程忘记 `if __name__ == '__main__':` 保护**：
   - 在 Windows 上，多进程是通过重新导入当前主模块启动子进程的。如果不加 `if __name__ == '__main__':` 守护，子进程导入时会再次递归创建子进程，导致无限递归暴增并瞬间瘫痪系统！

---

### 五、本节小结
- GIL 保证线程安全但限制单进程内单核执行字节码。
- CPU 密集型任务一律使用多进程（multiprocessing）利用多核。
- I/O 密集型任务使用多线程或异步协程，I/O 阻塞时 GIL 会主动释放。
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "Windows 平台使用多进程必须在 if __name__ == '__main__': 保护块内启动，否则子进程派生时会引发无限递归崩溃。"
                }
            ],
            "demos": [
                {
                    "title": "I/O 阻塞释放 GIL 并发模拟实战",
                    "lang": "python",
                    "code": "# 演示 I/O 密集任务在多线程下享受真并发加速\nimport time\nfrom concurrent.futures import ThreadPoolExecutor\n\ndef simulate_network_io(url_id):\n    # 模拟网络延迟（I/O 阻塞期间，GIL 被主动释放给其他线程）\n    time.sleep(0.05)\n    return f\"响应_{url_id}\"\n\nt0 = time.perf_counter()\nwith ThreadPoolExecutor(max_workers=5) as pool:\n    results = list(pool.map(simulate_network_io, range(5)))\nt1 = time.perf_counter()\n\nprint(f\"5 个模拟网络请求并发完成，耗时: {t1 - t0:.3f} 秒 (远小于顺序执行的 0.25 秒！)\")\n"
                }
            ]
        },
        {
            "id": "pep-l8-2",
            "title": "现代并发工程实践：concurrent.futures 线程池与 asyncio 异步非阻塞",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：掌握现代 Python 首选的高层并发抽象库 `concurrent.futures`（线程池与进程池统一接口），掌握 Python 3.5+ 异步编程基石 `asyncio`、事件循环（Event Loop）与 `async/await` 语法，理解单线程异步非阻塞的高并发威力。
- **先修要求**：已熟练掌握生成器与 GIL 概念。

---

### 二、核心概念与术语解释

#### 1. 现代化统一池化接口：`concurrent.futures`
标准库 `concurrent.futures` 统一了线程池与进程池的操作方式：
- `ThreadPoolExecutor(max_workers=N)`：用于 I/O 密集型；
- `ProcessPoolExecutor(max_workers=N)`：用于 CPU 密集型；
- **核心方法**：
  - `pool.submit(fn, *args)`：提交单个任务，返回一个 `Future` 期约对象；
  - `pool.map(fn, iterable)`：类似内置 map，保持输入输出顺序映射；
  - `as_completed(futures)`：哪个任务先完成就先产出哪个，大幅降低整体等待时延！

#### 2. 异步协程：`asyncio` 为什么是现代高并发网络之王？
线程虽然好，但操作系统线程是重量级内核资源：
- 每个操作系统线程默认占用 8MB 栈内存；
- 单机承载 10000 个并发线程会导致内存耗尽与上下文切换停滞；
- **协程（Coroutine）**：**用户态的微线程**！由程序员和事件循环在单线程内部自主调度，内存开销只有几百字节，轻松实现**单机数十万并发（C10K / C100K 问题）**！

#### 3. `async` 与 `await` 的工作心法
- **`async def`**：声明一个协程函数；
- **`await coroutine`**：**让出 CPU 控制权！**“我这里要去等网络返回了，事件循环你先去跑别的协程吧，等数据来了再回来唤醒我”。

---

### 三、逐步代码演练与执行分析

```python
import asyncio
import time

# 1. 编写异步非阻塞协程
async def fetch_api_mock(api_name: str, delay: float) -> dict:
    # 必须使用 asyncio.sleep 而绝不能使用 time.sleep！
    # time.sleep 是同步阻塞，会把整个事件循环完全冻结！
    await asyncio.sleep(delay)
    return {"api": api_name, "status": "200 OK", "cost": delay}

async def run_async_aggregator():
    print(">>> 启动 asyncio 异步并发任务...")
    t0 = time.perf_counter()

    # 使用 asyncio.gather 同时并发调度多个异步协程
    results = await asyncio.gather(
        fetch_api_mock("天气服务", 0.08),
        fetch_api_mock("汇率接口", 0.05),
        fetch_api_mock("库存服务", 0.06)
    )

    t_total = time.perf_counter() - t0
    print(f"聚合全部 3 个网络服务完成，总耗时仅: {t_total:.3f} 秒 (以最长的一个服务为准)！")
    for r in results:
        print(f"  - 响应: {r['api']} -> {r['status']}")

# 运行异步事件循环
asyncio.run(run_async_aggregator())
```

---

### 四、常见易错陷阱与排查技巧
1. **在 async 协程内部调用同步阻塞代码（如 `time.sleep` 或 `requests.get`）**：
   - 这是异步编程新手最致命的错误！事件循环是单线程运行的，如果其中任何一个协程调用了 `time.sleep(5)`，**整个进程内的所有其他成千上万个协程全部被同时卡死！**
   - **解决之道**：异步代码中必须使用异步生态库（如 `asyncio.sleep`、`httpx`、`aiohttp`）。

---

### 五、本节小结
- `concurrent.futures` 抹平了线程池与进程池的使用成本。
- `asyncio` 通过单线程非阻塞事件循环解决高并发 I/O 难题。
- 绝不在异步事件循环中调用阻塞式同步 I/O。
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "切记：在 async def 内部严禁调用阻塞式 time.sleep() 或 requests.get()，这会直接冻结整条异步事件循环！"
                }
            ],
            "demos": [
                {
                    "title": "ThreadPoolExecutor 任务结果 as_completed 消费",
                    "lang": "python",
                    "code": "# 演示通过 as_completed 实现先完成的任务先处理\nfrom concurrent.futures import ThreadPoolExecutor, as_completed\nimport time\n\ndef worker(task_id, delay):\n    time.sleep(delay)\n    return f\"任务 {task_id} (耗时 {delay}s)\"\n\nwith ThreadPoolExecutor(max_workers=3) as pool:\n    # 提交三个不同耗时的任务\n    future_to_id = {\n        pool.submit(worker, 1, 0.06): 1,\n        pool.submit(worker, 2, 0.01): 2,  # 耗时最短\n        pool.submit(worker, 3, 0.04): 3\n    }\n    \n    print(\"开始按完成先后顺序接收结果:\")\n    for future in as_completed(future_to_id):\n        result = future.result()\n        print(\"  -> 收到完成信号:\", result)\n"
                }
            ]
        }
    ],
    "exercises": [
        {
            "id": "pep-ex-8-1",
            "type": "single",
            "difficulty": 1,
            "question": "在 Python 官方 CPython 解释器中，全局解释器锁（GIL）造成的物理结果是？",
            "options": [
                {"value": "A", "label": "在任何单一微观时刻，同一个 Python 进程内部只能有且仅有 1 个操作系统线程在执行 Python 字节码"},
                {"value": "B", "label": "完全禁止使用多线程技术"},
                {"value": "C", "label": "只能在单核 CPU 电脑上安装 Python"},
                {"value": "D", "label": "多进程间无法传递任何变量"}
            ],
            "answer": "A",
            "explanation": "GIL 是 CPython 保护对象引用计数内存安全的互斥锁，保证同一时刻单进程内仅有单个线程运行字节码，因此多线程无法利用多核加速纯 CPU 计算。",
            "tags": ["GIL", "底层机制"]
        },
        {
            "id": "pep-ex-8-2",
            "type": "single",
            "difficulty": 2,
            "question": "面对大规模数学矩阵乘法或高分辨率图像转码等纯 CPU 密集型（CPU-bound）任务，在 Python 中应选用的最高效并发架构是？",
            "options": [
                {"value": "A", "label": "多进程（multiprocessing / ProcessPoolExecutor），拥有独立解释器绕过 GIL 充分利用多核"},
                {"value": "B", "label": "多线程（threading / ThreadPoolExecutor）"},
                {"value": "C", "label": "asyncio 异步单线程事件循环"},
                {"value": "D", "label": "使用更长的变量名"}
            ],
            "answer": "A",
            "explanation": "CPU 密集任务需要真正的多核物理并行，多进程架构为每个核心分配独立的 Python 进程与独立 GIL，从而实现线性算力扩展。",
            "tags": ["并发选型", "多进程"]
        },
        {
            "id": "pep-ex-8-3",
            "type": "judge",
            "difficulty": 2,
            "question": "在基于 `asyncio` 编写的异步协程函数内部，可以直接调用传统的同步阻塞函数（如 `time.sleep(5)` 或 `requests.get()`），不会对其他并发协程造成任何卡顿阻塞影响。",
            "answer": False,
            "explanation": "错误！asyncio 底层是单线程事件循环驱动的。一旦在某个协程中调用了同步阻塞的 time.sleep()，整个线程会被彻底挂起，导致其他所有并发协程全部被完全卡死！",
            "tags": ["asyncio", "反模式"]
        },
        {
            "id": "pep-ex-8-4",
            "type": "fill",
            "difficulty": 2,
            "question": "在 Python 3.5+ 异步编程中，定义一个异步协程函数使用的关键字是 `_____ def func_name():`。",
            "blanks": [["async"]],
            "explanation": "async def 用于声明一个异步协程函数，内部支持使用 await 关键字让出执行权。",
            "tags": ["asyncio", "关键字"]
        },
        {
            "id": "pep-ex-8-5",
            "type": "single",
            "difficulty": 3,
            "question": "使用 `concurrent.futures.as_completed(futures)` 遍历任务期约集合时，它的遍历产出特点是？",
            "options": [
                {"value": "A", "label": "哪个后台任务先计算完成，就先产出哪个任务的 Future 对象，无需等待慢速任务"},
                {"value": "B", "label": "严格按照任务提交给线程池的先后顺序产出"},
                {"value": "C", "label": "必须等所有任务全部执行完成才一次性列表返回"},
                {"value": "D", "label": "随机抽取一个任务返回并杀死其他任务"}
            ],
            "answer": "A",
            "explanation": "as_completed 是流式消费并发结果的利器，谁先完成谁先处理，避免了排在前面的慢任务阻塞后续已经完成的任务。",
            "tags": ["concurrent.futures", "as_completed"]
        },
        {
            "id": "pep-ex-8-6",
            "type": "multiple",
            "difficulty": 3,
            "question": "关于 Python 并发多任务编程的工程决策，下列说法正确的有？",
            "options": [
                {"value": "A", "label": "面对爬取上万个 HTTP 接口这类大量时间在等待网络的 I/O 密集任务，使用 asyncio 协程能极大节省内存并支持超高并发"},
                {"value": "B", "label": "面对数据分析中百万行特征工程计算，应当使用 ProcessPoolExecutor 调度多核 CPU"},
                {"value": "C", "label": "当一个多线程程序发生网络 I/O 阻塞或调用底层 C 扩展运算时，CPython 会主动释放 GIL"},
                {"value": "D", "label": "多进程间不需要任何进程间通信机制即可直接共享内存中的同一个 Python 字典对象"}
            ],
            "answer": ["A", "B", "C"],
            "explanation": "A、B、C 均为正确客观规律；多进程拥有各自隔离独立的物理虚拟内存地址空间，无法直接隐式共享同一个普通 Python 对象，D 错误。",
            "tags": ["并发架构", "综合决策"]
        },
        {
            "id": "pep-ex-8-7",
            "type": "single",
            "difficulty": 4,
            "question": "在 Windows 操作系统中运行 Python 多进程（`multiprocessing`）程序时，如果不将进程启动代码放在 `if __name__ == '__main__':` 守护块内，会发生什么严重灾难？",
            "options": [
                {"value": "A", "label": "子进程启动时会重新导入主文件，递归导致无限生成新子进程，引发系统资源瞬间枯竭崩溃"},
                {"value": "B", "label": "程序会自动转换为单线程执行"},
                {"value": "C", "label": "操作系统会自动弹出警告并关机"},
                {"value": "D", "label": "代码无法保存到磁盘"}
            ],
            "answer": "A",
            "explanation": "Windows 缺少 Unix 的 fork 机制，通过 spawn 模式重新导入入口模块来构造子进程环境；若无 main 保护，子进程导入时又会再次执行启动子进程逻辑，引发递归爆炸。",
            "tags": ["多进程", "Windows特性"]
        },
        {
            "id": "pep-ex-8-8",
            "type": "code",
            "difficulty": 4,
            "question": "【动手编程】请使用 `concurrent.futures.ThreadPoolExecutor` 编写一个并发批量处理函数 `parallel_map_tasks(items: list, task_fn, max_workers: int = 3) -> list`：\n- 传入一个待处理数据列表 `items`，一个转换函数 `task_fn`，以及最大工作线程数 `max_workers`；\n- 使用线程池的 `pool.map()` 并发执行转换，并保持与输入 `items` 严格一一对应的结果顺序；\n- 返回转换后的结果列表（若 `items` 为空，返回空列表）。",
            "starterCode": "from concurrent.futures import ThreadPoolExecutor\n\ndef parallel_map_tasks(items: list, task_fn, max_workers: int = 3) -> list:\n    # 请在此处使用线程池完成并发映射并保持顺序返回\n    pass\n",
            "expectedOutput": "[2, 4, 6]",
            "answer": "from concurrent.futures import ThreadPoolExecutor\n\ndef parallel_map_tasks(items: list, task_fn, max_workers: int = 3) -> list:\n    if not items:\n        return []\n    with ThreadPoolExecutor(max_workers=max_workers) as pool:\n        results = list(pool.map(task_fn, items))\n    return results",
            "tests": "res = parallel_map_tasks([1, 2, 3], lambda x: x * 2)\nassert res == [2, 4, 6]\nassert parallel_map_tasks([], lambda x: x) == []\nassert parallel_map_tasks(['a', 'b'], lambda s: s.upper()) == ['A', 'B']\n",
            "explanation": "使用 with ThreadPoolExecutor 确保线程池资源安全关闭，通过 pool.map 自动按输入原始顺序产出并发执行结果。",
            "tags": ["编程实操", "线程池", "ThreadPoolExecutor"]
        }
    ]
}

CHAPTER_9 = {
    "id": "pep-c9",
    "courseId": "python-engineering-practices",
    "order": 9,
    "title": "端到端工程综合实战：构建生产级数据清洗引擎",
    "goal": "将规范、类型、依赖、数据建模、异常治理、日志与自动化测试融会贯通，完整构建一个分层解耦、配置驱动、带 CLI 交互与全面测试的工业级 ETL 核心应用。",
    "lessons": [
        {
            "id": "pep-l9-1",
            "title": "工程化配置管理：环境变量与解耦设计",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：掌握现代云原生软件开发的《The Twelve-Factor App》（十二要素宣言）配置管理准则，深刻理解为什么“严禁将密码、Token 与环境配置硬编码在代码里”，掌握使用环境变量与分层配置类解耦配置与业务代码。
- **先修要求**：熟练掌握类定义与标准库 os 操作。

---

### 二、核心概念与术语解释

#### 1. 十二要素之“配置”原则 (The Twelve-Factor App: Config)
在业余脚本中，人们经常写：
```python
DB_PASSWORD = "my_super_secret_password_123"  # 致命安全隐患！
API_BASE_URL = "http://localhost:8000"
```
**严重隐患**：
- 代码一旦推送到 GitHub 或开源仓库，凭证瞬间泄露引发公司数据资产失窃；
- 当同一份代码要部署在“本地开发环境”、“测试联调环境”与“生产集群环境”时，必须频繁手动修改代码，极易误将测试配置发布到生产！
- **现代工程黄金法则是：严格将配置从代码中解耦剥离，一律通过操作系统环境变量（Environment Variables）注入！**

#### 2. 分层类型化配置模型
不要直接在业务代码深处散落 `os.getenv('TIMEOUT')`，而应在项目启动入口建立强类型的配置对象：
```python
from dataclasses import dataclass
import os

@dataclass(frozen=True)
class AppSettings:
    app_env: str
    db_timeout_sec: int
    log_level: str

    @classmethod
    def load_from_env(cls) -> "AppSettings":
        return cls(
            app_env=os.getenv("APP_ENV", "development"),
            db_timeout_sec=int(os.getenv("DB_TIMEOUT", "30")),
            log_level=os.getenv("LOG_LEVEL", "INFO")
        )
```

---

### 三、逐步代码演练与执行分析

```python
import os
from dataclasses import dataclass

@dataclass(frozen=True)
class EngineConfig:
    batch_size: int
    enable_audit: bool
    output_dir: str

    @classmethod
    def build_from_env(cls) -> "EngineConfig":
        return cls(
            batch_size=int(os.getenv("ETL_BATCH_SIZE", "500")),
            enable_audit=os.getenv("ETL_ENABLE_AUDIT", "true").lower() == "true",
            output_dir=os.getenv("ETL_OUTPUT_DIR", "/data/output")
        )

# 模拟环境变量注入与加载
os.environ["ETL_BATCH_SIZE"] = "1000"
os.environ["ETL_ENABLE_AUDIT"] = "true"

cfg = EngineConfig.build_from_env()
print("配置加载成功，类型安全且只读:")
print(f"  批次大小 (int): {cfg.batch_size}")
print(f"  开启审计 (bool): {cfg.enable_audit}")
print(f"  输出目录: {cfg.output_dir}")
```

---

### 四、常见易错陷阱与排查技巧
1. **环境变量类型全为字符串**：
   - 从 `os.getenv()` 读出来的**永远是字符串**！例如 `os.environ['FLAG'] = 'False'`，如果直接 `bool(os.getenv('FLAG'))`，其结果是 **True**（因为非空字符串布尔值为真）！必须显式判断 `val.lower() == 'true'`。

---

### 五、本节小结
- 严禁硬编码敏感凭据与环境配置。
- 遵循 12-Factor 原则通过环境变量注入。
- 建立统一强类型配置类解析与校验。
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "切记：os.getenv('IS_DEBUG', 'False') 读出的 'False' 是字符串！直接 bool('False') 是 True！必须做 .lower() == 'true' 转换。"
                }
            ],
            "demos": [
                {
                    "title": "环境变量强类型解析与边界校验",
                    "lang": "python",
                    "code": "# 模拟配置加载与类型安全防护\nimport os\n\ndef parse_int_env(key: str, default: int) -> int:\n    raw = os.getenv(key)\n    if raw is None:\n        return default\n    try:\n        return int(raw)\n    except ValueError:\n        print(f\"[配置告警] 环境变量 {key}={raw} 非法，回退默认值: {default}\")\n        return default\n\nos.environ[\"MAX_WORKERS\"] = \"invalid_num\"\nworkers = parse_int_env(\"MAX_WORKERS\", 4)\nprint(\"最终解析的工作线程数:\", workers)\n"
                }
            ]
        },
        {
            "id": "pep-l9-2",
            "title": "贯穿式工业级项目：从零构建配置驱动、高内聚解耦的生产级 ETL 转换引擎",
            "difficulty": 1,
            "content": """### 一、项目背景与能力目标
本结课项目带领学员把前面 8 个模块的核心工程实践融会贯通，**构建一个符合大厂工业级规范的模块化、可测试、可观测的生产级数据管道清洗引擎**。

#### 核心工程能力验收目标
1. **配置驱动 (Config-driven)**：通过环境变量与不可变数据类解耦系统运行参数；
2. **面向对象与领域建模**：使用 `@dataclass(frozen=True)` 定义不可变领域模型；
3. **分层解耦架构**：按“解析层 -> 校验层 -> 转换层 -> 聚合层”职责分离；
4. **防御性异常体系**：自定义项目业务异常，保留上下文；
5. **可观测性**：基于规范 logging 输出结构化日志，杜绝任何裸写 print；
6. **自动化回归测试**：全链路编写断言与异常拦截用例。

---

### 二、工业级系统架构全景图

```
┌────────────────────────────────────────────────────────┐
│                   CLI / 调度触发入口                   │
└───────────────────────────┬────────────────────────────┘
                            │ 依赖注入
                            ▼
┌────────────────────────────────────────────────────────┐
│      EngineConfig (不可变配置：批次、阈值、环境)       │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│      DataPipelineService (高层调度核心服务)            │
│  ├── 步骤 1: 格式清洗与协议解析 (Parser)               │
│  ├── 步骤 2: 领域模型构建与契约校验 (Domain Model)     │
│  ├── 步骤 3: 业务规则计算与异常隔离 (Transformer)      │
│  └── 步骤 4: 结果报表生成与审计汇总 (Aggregator)       │
└───────────────────────────┬────────────────────────────┘
                            │ 记录可观测性
                            ▼
┌────────────────────────────────────────────────────────┐
│     Structured Logger (标准日志、耗时审计与异常链)     │
└────────────────────────────────────────────────────────┘
```

---

### 三、全套工程代码实现

```python
import io
import logging
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

# 1. 结构化日志系统配置
log_buffer = io.StringIO()
logger = logging.getLogger("ProdETL")
logger.setLevel(logging.INFO)
handler = logging.StreamHandler(log_buffer)
handler.setFormatter(logging.Formatter("[%(levelname)s] [%(name)s] %(message)s"))
logger.addHandler(handler)

# 2. 自定义工程异常
class EngineBaseError(Exception):
    pass

class DataRecordValidationError(EngineBaseError):
    pass

# 3. 领域模型：不可变交易记录
@dataclass(frozen=True)
class NormalizedTransaction:
    tx_id: str
    user_id: str
    raw_amount: float
    discount_rate: float = 0.0

    def __post_init__(self) -> None:
        if self.raw_amount < 0:
            raise DataRecordValidationError(f"交易金额非法: {self.raw_amount}")
        if not (0.0 <= self.discount_rate <= 1.0):
            raise DataRecordValidationError(f"折扣率非法: {self.discount_rate}")

    @property
    def net_amount(self) -> float:
        return round(self.raw_amount * (1.0 - self.discount_rate), 2)

# 4. 配置类
@dataclass(frozen=True)
class PipelineConfig:
    min_order_threshold: float = 10.0
    high_value_line: float = 500.0

# 5. 核心处理引擎服务
class ProductionDataPipeline:
    def __init__(self, config: PipelineConfig) -> None:
        self.config = config
        self.logger = logger

    def process_raw_stream(self, raw_items: List[Dict[str, Any]]) -> Dict[str, Any]:
        self.logger.info(f"开始处理原始数据批次，总条数: {len(raw_items)}")
        valid_models: List[NormalizedTransaction] = []
        skipped_count = 0

        for idx, item in enumerate(raw_items):
            try:
                # 字段清洗与转换
                tx_id = str(item["id"]).strip()
                user_id = str(item["user"]).strip()
                amt = float(item["amount"])
                disc = float(item.get("discount", 0.0))

                # 构建不可变领域对象并触发 __post_init__ 校验
                model = NormalizedTransaction(tx_id, user_id, amt, disc)
                
                # 业务阈值过滤
                if model.net_amount < self.config.min_order_threshold:
                    skipped_count += 1
                    continue
                valid_models.append(model)
            except (KeyError, ValueError, DataRecordValidationError) as err:
                skipped_count += 1
                self.logger.warning(f"跳过脏记录 (序号={idx}): {err}")

        # 商业指标聚合
        total_gmv = sum(m.net_amount for m in valid_models)
        high_value_orders = [m for m in valid_models if m.net_amount >= self.config.high_value_line]

        summary = {
            "processed_valid": len(valid_models),
            "skipped_records": skipped_count,
            "total_gmv": round(total_gmv, 2),
            "high_value_count": len(high_value_orders),
            "avg_order_value": round(total_gmv / len(valid_models), 2) if valid_models else 0.0
        }
        self.logger.info(f"批处理完成: 产出 GMV={summary['total_gmv']}, 脏数据跳过={skipped_count}")
        return summary

# 6. 执行全链路
raw_feed = [
    {"id": "T1", "user": "U1", "amount": "200.0", "discount": "0.1"},
    {"id": "T2", "user": "U2", "amount": "600.0", "discount": "0.0"},
    {"id": "T3", "user": "U3", "amount": "-50.0"},  # 负数异常，将被安全拦截
    {"id": "T4", "user": "U4", "amount": "5.0"},    # 低于 10 元阈值，将被跳过
    {"id": "T5", "user": "U5", "amount": "invalid"} # 类型错误，将被安全拦截
]

cfg = PipelineConfig(min_order_threshold=10.0, high_value_line=500.0)
pipeline = ProductionDataPipeline(cfg)
report = pipeline.process_raw_stream(raw_feed)

print("=== 最终交付的生产级 ETL 聚合报表 ===")
for k, v in report.items():
    print(f"  {k}: {v}")
```

---

### 四、执行分析与成果验收
- **输入**：包含缺字段、负金额、类型错误等复合脏数据的原始流；
- **鲁棒性**：未发生任何未捕获崩溃，日志系统清晰记录每一条脏数据的拦截原因；
- **架构解耦**：模型、配置、服务清晰分层，支持 100% 自动化测试覆盖与并发扩展！

---

### 五、权威参考资料与全课程结语
- **《Architecture Patterns with Python》(Cosmic Python)**:
  - 作者：Harry Percival & Bob Gregory (O'Reilly)
  - 链接：https://www.cosmicpython.com/book/preface.html
  - 授权：CC BY-NC-ND 4.0 (免费公开阅读)
- **The Twelve-Factor App (十二要素应用宣言)**:
  - 作者：Adam Wiggins (Heroku 联合创始人)
  - 链接：https://12factor.net/
  - 说明：现代云原生与微服务架构的黄金标准指南。
""",
            "tips": [
                {
                    "kind": "note",
                    "text": "恭喜完成《Python 工程实践》全部 9 个核心模块！你已经掌握了从脚本开发者进阶为合格工业级软件工程师的完整技术素养。"
                }
            ],
            "demos": [
                {
                    "title": "生产级分层管道端到端调度演示",
                    "lang": "python",
                    "code": "# 演示轻量化分层流水线调用\ndef mini_pipeline(items):\n    # 1. 过滤\n    valid = [x for x in items if isinstance(x, (int, float)) and x > 0]\n    # 2. 转换\n    doubled = [round(x * 1.08, 2) for x in valid]\n    # 3. 统计\n    return {\"count\": len(doubled), \"sum\": sum(doubled)}\n\nprint(\"管道处理结果:\", mini_pipeline([100, -20, \"N/A\", 250]))\n"
                }
            ]
        }
    ],
    "exercises": [
        {
            "id": "pep-ex-9-1",
            "type": "single",
            "difficulty": 2,
            "question": "根据现代云原生软件工程《The Twelve-Factor App》（十二要素宣言）的原则，应用程序的配置（如数据库凭据、API Token）应当如何管理？",
            "options": [
                {"value": "A", "label": "严格与代码分离，通过操作系统环境变量（Environment Variables）注入"},
                {"value": "B", "label": "硬编码写死在 Python 源文件的最顶部常量中"},
                {"value": "C", "label": "直接上传到公共 GitHub 仓库的 README 中"},
                {"value": "D", "label": "每次启动时由程序员在控制台手动打字输入"}
            ],
            "answer": "A",
            "explanation": "十二要素宣言规定：配置必须严格从代码中剥离，通过环境变量注入，确保同一份代码无缝运行在开发、测试、生产多个环境中且无安全凭据泄露风险。",
            "tags": ["12-Factor", "配置管理"]
        },
        {
            "id": "pep-ex-9-2",
            "type": "single",
            "difficulty": 2,
            "question": "在 Python 中读取环境变量 `os.getenv(\"ENABLE_DEBUG\", \"False\")` 时，如果外部设置了 `ENABLE_DEBUG=\"False\"`，为了得到正确的布尔值，应该如何处理？",
            "options": [
                {"value": "A", "label": "val.lower() == \"true\"（显式比对字符串，因为环境变量永远返回 str，非空字符串直接 bool() 永远是 True）"},
                {"value": "B", "label": "bool(val)"},
                {"value": "C", "label": "val == True"},
                {"value": "D", "label": "int(val)"}
            ],
            "answer": "A",
            "explanation": "所有环境变量读取结果都是 str。在 Python 中 bool(\"False\") 是 True（非空字符串判定为真），必须显式与字符串 'true' 进行比对。",
            "tags": ["环境变量", "陷阱"]
        },
        {
            "id": "pep-ex-9-3",
            "type": "judge",
            "difficulty": 2,
            "question": "在工业级分层架构中，业务领域模型（Domain Model）应当尽可能保持纯洁，不直接耦合底层具体的外部网络请求代码或特定的 SQL 数据库驱动。",
            "answer": True,
            "explanation": "正确！领域模型代表核心业务逻辑不变性，保持其与技术实现细节解耦（符合整洁架构与 DDD 原则）是保障系统易维护、可测试的关键。",
            "tags": ["架构设计", "DDD"]
        },
        {
            "id": "pep-ex-9-4",
            "type": "fill",
            "difficulty": 3,
            "question": "在设计生产级流水线时，如果一个系统无论执行多少次，相同的输入都会产生相同的业务状态与数据结果，该特性被称为 _____ 性（Idempotency）。",
            "blanks": [["幂等"]],
            "explanation": "幂等性（Idempotency）是分布式与生产数据管道的核心质量指标，确保重跑、补数或网络重试不产生脏数据膨胀。",
            "tags": ["生产架构", "幂等性"]
        },
        {
            "id": "pep-ex-9-5",
            "type": "single",
            "difficulty": 3,
            "question": "在复杂管道中处理多批次数据时，如果某一条输入记录字段缺失，最佳的防御性工程行为是？",
            "options": [
                {"value": "A", "label": "记录 Warning 日志说明跳过原因并计入审计指标，跳过该脏记录继续处理后续数据"},
                {"value": "B", "label": "直接让整个程序抛出致命异常并退出崩溃，丢弃所有后续正常数据"},
                {"value": "C", "label": "用 except: pass 彻底静默吞掉，不打印任何日志"},
                {"value": "D", "label": "给缺失字段随机填入一个虚假数值"}
            ],
            "answer": "A",
            "explanation": "高可用管道需具备容错与审计可观测性：隔离脏数据、记录明细日志并继续正常批次处理，既不崩溃也不暗度陈仓。",
            "tags": ["容错设计", "生产工程"]
        },
        {
            "id": "pep-ex-9-6",
            "type": "multiple",
            "difficulty": 4,
            "question": "一个具备大厂工业级规范的 Python 工程，在交付上线前通常应具备哪些质量防线？",
            "options": [
                {"value": "A", "label": "代码严格通过 Ruff / Flake8 代码风格检查，无未使用的废弃导入与明显代码坏味道"},
                {"value": "B", "label": "关键函数具备类型注解并通过 mypy 静态类型检查"},
                {"value": "C", "label": "具备自动化单元测试套件（pytest），覆盖关键业务分支与边界情况"},
                {"value": "D", "label": "项目根目录包含标准 pyproject.toml 声明依赖与确定性的锁文件"},
                {"value": "E", "label": "敏感配置完全通过环境变量注入，代码仓库无硬编码密码"}
            ],
            "answer": ["A", "B", "C", "D", "E"],
            "explanation": "以上全部五项共同构成了现代专业 Python 工程项目的基石标准体系。",
            "tags": ["工程质量", "全景防线"]
        },
        {
            "id": "pep-ex-9-7",
            "type": "single",
            "difficulty": 4,
            "question": "在面向领域驱动设计（DDD）的持久化设计中，仓库模式（Repository Pattern）充当的核心职责是？",
            "options": [
                {"value": "A", "label": "在业务领域对象与底层数据库存储细节之间建立隔离层，让上层业务代码像操作内存集合一样操作数据"},
                {"value": "B", "label": "直接把 SQL 语句字符串硬编码拼接到 UI 前端按钮事件中"},
                {"value": "C", "label": "将所有业务对象序列化为二进制保存到注册表中"},
                {"value": "D", "label": "负责管理远程 Git 仓库的提交记录"}
            ],
            "answer": "A",
            "explanation": "仓库模式（Repository）封装了数据访问细节，使领域层无需关心底层究竟是 MySQL、PostgreSQL 还是内存 Mock，极大增强了系统的可测试性。",
            "tags": ["仓库模式", "DDD"]
        },
        {
            "id": "pep-ex-9-8",
            "type": "code",
            "difficulty": 5,
            "question": "【结课大作业】请编写一个结构化数据转换与统计管道函数 `run_pipeline(records: list[dict], threshold: float) -> dict`：\n- 输入记录字典列表，每项包含：`'id'`, `'amount'`, `'status'`；\n- 步骤 1：过滤出 `status == 'SUCCESS'` 的记录；\n- 步骤 2：对 `amount` 进行数值转换（转为 float）；若遇到无法转换为正数值的脏数据（<= 0 或抛出异常），安全跳过；\n- 步骤 3：统计保留记录中：有效笔数 `valid_count`、总金额 `total_sum`（保留 2 位小数）、以及金额严格大于 `threshold` 的大单笔数 `high_count`；\n- 返回格式：`{'valid_count': int, 'total_sum': float, 'high_count': int}`。",
            "starterCode": "def run_pipeline(records: list[dict], threshold: float) -> dict:\n    # 请在此处构建端到端过滤、转换与聚合统计流水线\n    pass\n",
            "expectedOutput": "{'valid_count': 2, 'total_sum': 350.5, 'high_count': 1}",
            "answer": "def run_pipeline(records: list[dict], threshold: float) -> dict:\n    valid_count = 0\n    total_sum = 0.0\n    high_count = 0\n    for r in records:\n        try:\n            if r.get('status') != 'SUCCESS':\n                continue\n            amt = float(r.get('amount', 0))\n            if amt <= 0:\n                continue\n            valid_count += 1\n            total_sum += amt\n            if amt > threshold:\n                high_count += 1\n        except (ValueError, TypeError):\n            continue\n    return {\n        'valid_count': valid_count,\n        'total_sum': round(total_sum, 2),\n        'high_count': high_count\n    }",
            "tests": "feed = [\n    {'id': '1', 'amount': '150.5', 'status': 'SUCCESS'},\n    {'id': '2', 'amount': 200.0, 'status': 'SUCCESS'},\n    {'id': '3', 'amount': 'bad', 'status': 'SUCCESS'},    # 非法数字跳过\n    {'id': '4', 'amount': '-50.0', 'status': 'SUCCESS'},  # 负数跳过\n    {'id': '5', 'amount': '300.0', 'status': 'PENDING'}   # 状态不符跳过\n]\nres = run_pipeline(feed, threshold=180.0)\nassert res == {'valid_count': 2, 'total_sum': 350.5, 'high_count': 1}\nassert run_pipeline([], 100.0) == {'valid_count': 0, 'total_sum': 0.0, 'high_count': 0}\n",
            "explanation": "建立稳健的过滤流：逐条提取 status 并核验，利用 try-except 容错数值转换，剔除非法和负值，完成聚合累加与大额阈值统计，返回结构化字典。",
            "tags": ["编程实操", "结课大作业", "ETL管道"]
        }
    ]
}
