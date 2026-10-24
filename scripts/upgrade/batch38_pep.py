# -*- coding: utf-8 -*-
"""batch38: python-engineering-practices 扩充补丁（4 节 <2600）。
所有代码与输出均在 Python 3.11.15 实测。
"""
import json, io, re, time

P = r"D:\Python_Project\knowledge-order\content-data\courses\python-engineering-practices.json"
REF_RE = re.compile(r"\n#{2,4} [^\n]*(参考资料|延伸阅读|Reference)[^\n]*\n")

def merge(content, add):
    ms = list(REF_RE.finditer(content))
    if ms and ms[-1].start() > len(content) * 0.6:
        i = ms[-1].start()
        return content[:i].rstrip() + "\n\n" + add.strip() + "\n" + content[i:]
    return content.rstrip() + "\n\n" + add.strip() + "\n"

ADD = {}

ADD["pep-l7-1"] = '''
### 问题背景与直觉理解（补充）

生成器解决的不是"写法优雅"，而是**内存模型**问题：清单式处理（先 list 再循环）要求全部数据同时驻留内存，10GB 日志直接 OOM；生成器把"生产一个、消费一个"变成常态，内存占用恒定。直觉模型：list 是"整箱矿泉水搬上楼"，生成器是"接水管"——拧一下出一滴，水厂（数据源）有多大都不占你家地方。yield 的魔法在于"冻结现场"：函数执行到 yield 暂停，局部变量、指令指针全部封存，下次 next 从断点继续——这是比线程更轻的"暂停/恢复"。

### 手算推导（逐步演算）

1. 内存账：`numbers(1_000_000)` 的生成器对象固定 208 字节（只存当前状态指针），等价列表 8250 KB——3.9 万倍的差距，且差距随 n 线性扩大；
2. 执行序推演：`next(pipe)` 第一次 → numbers 产 0 → squared 产 0；第二次 next → numbers 产 1 → squared 产 1；`list(pipe)` 消费剩余 8 个 → [4, 9, ..., 81]——每次 next 数据"滴"过整条管道，同一时刻只有 1 个元素在流动；
3. 耗尽语义：list() 消费完后再次 next 抛 StopIteration——生成器是一次性消耗品，复用须重建。

### 完整案例（补充）：惰性管道与内存实测

```python
import sys

def numbers(n):                    # 生成器：惰性产出
    for i in range(n):
        yield i

def squared(seq):                  # 管道第二级
    for x in seq:
        yield x * x

pipe = squared(numbers(10))
print(next(pipe), next(pipe))      # 只按需产出一个
print(list(pipe))                  # 消费剩余
try:
    next(pipe)                     # 已耗尽
except StopIteration:
    print("StopIteration: 生成器是一次性消耗品")

def big_list():
    return [x * x for x in range(1_000_000)]
g = numbers(1_000_000)
print("生成器对象本身:", sys.getsizeof(g), "字节（与 n 无关）")
print("等价列表:", sys.getsizeof(big_list()) // 1024, "KB")
```

预期输出（实测）：

```
0 1
[4, 9, 16, 25, 36, 49, 64, 81]
StopIteration: 生成器是一次性消耗品
生成器对象本身: 208 字节（与 n 无关）
等价列表: 8250 KB
```

### 生成器管道数据流图解（文字示意图）

```
数据源(10GB 日志) ─▶ read_lines() ─▶ filter_errors() ─▶ parse() ─▶ 聚合
                     yield 行          yield 错误行       yield 字段
                     │                 │                 │
     next() 每触发一次：整条管道"滴"过一行，内存恒定 O(1)
对比：列表式 list(read(f)) 先把 10GB 全部装进内存 → OOM
```

### 参考资料（补充）

- **Python 官方 HOWTO：Functional Programming（生成器章节）**
  - 链接：https://docs.python.org/zh-cn/3/howto/functional.html#generators
- **PEP 255：Simple Generators**——yield 的立项规范
  - 链接：https://peps.python.org/pep-0255/

### 知识关联

- 承接 pyf-l5-3：生成器表达式 `(x*2 for x in ...)` 是 yield 函数的语法糖；
- 呼应 pyf-l8-1：`for line in f` 的流式读取就是文件对象内置的生成器行为；
- l8-2 的 asyncio 本质是"生成器暂停恢复"思想的调度器化。

### 本节总结（要点回顾）

1. yield 冻结/恢复函数状态，带来 O(1) 内存的流式处理能力；
2. 生成器一次性消费，复用须重建；`next()` 逐滴推动，`list()` 一次抽干；
3. ETL 管道的标准姿势：多级生成器串联，让数据"流"过而非"搬"进来。
'''

ADD["pep-l8-1"] = '''
### 问题背景与直觉理解（补充）

GIL 的迷思来自一句半对半错的话："Python 多线程没用"。精确的说法是：**同一进程内，任一时刻只有一个线程在执行 Python 字节码**——所以 CPU 密集任务多线程无加速（甚至更慢，有线程切换开销）；但当线程进入 I/O 等待（网络、磁盘）时会**主动释放 GIL**，别的线程得以运行，所以 I/O 密集任务多线程依然有效。直觉模型：GIL 是一间单人厨房，多个厨师（线程）轮流进去做菜——纯做菜（CPU）一个人在厨房怎么排班都做不快；但腌肉等入味的时间（I/O）可以出来帮别人备菜。

### 手算推导（逐步演算）

1. 实测推演：同一个 cpu_task 跑 2 遍，串行 0.04s；拆给 2 线程 0.05s——**不降反升**（0.01s 是线程创建与 GIL 争用的纯开销），这就是"多线程跑 CPU 任务反而更慢"的实锤；
2. 账本推理：若真并行，2 线程应 ≈0.02s；实测 0.05s = 串行时长 + 切换开销，证明字节码执行被 GIL 串行化；
3. 出路推演：把 2 个任务分给 **2 个进程**——每个进程独立解释器、独立 GIL，才能真正吃满 2 核（多进程代码在本课配套环境以 `multiprocessing.Pool` 实现，Windows 下必须包在 `if __name__ == "__main__":` 守护里）。

### 完整案例（补充）：GIL 取证实验

```python
import time
from threading import Thread

def cpu_task(n):
    return sum(i * i for i in range(n))

N = 400_000
t0 = time.perf_counter()
single = [cpu_task(N) for _ in range(2)]
t1 = time.perf_counter()

results = []
threads = [Thread(target=lambda: results.append(cpu_task(N))) for _ in range(2)]
for t in threads: t.start()
for t in threads: t.join()
t2 = time.perf_counter()

print("串行:", round(t1 - t0, 2), "s | 双线程:", round(t2 - t1, 2), "s")
print("结果一致:", single == results)
print("双线程没有更快 —— GIL 让同一进程内的线程轮流执行字节码")
```

预期输出（实测，时间数据机器相关、量级稳定）：

```
串行: 0.04 s | 双线程: 0.05 s
结果一致: True
双线程没有更快 —— GIL 让同一进程内的线程轮流执行字节码
```

### 任务类型决策图解（文字示意图）

```
你的任务在等什么？
 ├─ 等 CPU（数值计算/循环）──▶ 多进程 multiprocessing（独立 GIL 各占一核）
 │        └─ 或下沉 NumPy（C 层释放 GIL）/ Cython / Rust 扩展
 └─ 等 I/O（网络/磁盘/数据库）─▶ 多线程或 asyncio（等待期释放 GIL）
反模式：CPU 密集开 8 线程 —— 8 人抢 1 间厨房，越抢越慢
```

### 参考资料（补充）

- **Python 官方文档：GIL（Global Interpreter Lock）**
  - 链接：https://docs.python.org/zh-cn/3/library/threading.html#gil
- **PEP 703：Making the Global Interpreter Lock Optional**——free-threading 路线图（3.13+ 实验性）
  - 链接：https://peps.python.org/pep-0703/

### 知识关联

- 承接 pyf-l10-1：NumPy 大计算能绕开 GIL 的原因——重活下沉 C 层并释放 GIL；
- 呼应 l8-2：线程池（I/O 密集）与进程池（CPU 密集）的现代统一接口；
- pyf-l1-1 的字节码模型是理解"GIL 锁什么"的前提：锁的是字节码执行权。

### 本节总结（要点回顾）

1. GIL = 单进程内字节码执行权的互斥锁，CPU 密集多线程无解、I/O 等待会放锁；
2. 判据一句话：等 CPU 用多进程，等 I/O 用线程/协程；
3. 3.13+ 的 free-threading 实验构建正在松动这一约束，但生产选型仍按现行规则。
'''

ADD["pep-l8-2"] = '''
### 问题背景与直觉理解（补充）

concurrent.futures 与 asyncio 是并发世界的"自动挡"与"电摩"：ThreadPoolExecutor 用一行 `pool.map` 把线程管理全部托管（自动挡，谁都能开）；asyncio 用单线程事件循环支撑上万并发连接（电摩，省资源但要求全程非阻塞）。直觉模型：线程池是"雇 3 个快递员"，协程是"一个外卖调度员+App"——等电梯的时间（await）先去送别单，一个人干出一个团队的吞吐。

### 手算推导（逐步演算）

1. 串行基线：3 个 0.3s 的 I/O 任务串行 = 0.9s；
2. 线程池推演：3 线程各自 time.sleep(0.3)（释放 GIL）→ 总耗时 ≈ 0.303s（多出的 3ms 是池调度开销）；
3. 协程推演：3 个协程在 await asyncio.sleep(0.3) 处挂起，事件循环统一等待 → ≈ 0.32s；**单线程**完成与 3 线程同样的吞吐——协程的优势不在 3 个任务的快慢，而在 3 万个连接时线程池撑不住、事件循环轻松应对；
4. 反例推演：若协程里误写 `time.sleep(0.3)`（同步阻塞），事件循环被卡死，3 个任务退化为串行 0.9s——"async 世界里一行同步 I/O 毁掉全部并发"。

### 完整案例（补充）：线程池与协程同台实测

```python
import asyncio, time
from concurrent.futures import ThreadPoolExecutor

def io_task(i):
    time.sleep(0.3)               # 模拟网络/磁盘阻塞
    return f"task{i} 完成"

async def aio_task(i):
    await asyncio.sleep(0.3)      # 非阻塞挂起
    return f"task{i} 完成"

t0 = time.perf_counter()
with ThreadPoolExecutor(3) as pool:
    th = list(pool.map(io_task, range(3)))
t1 = time.perf_counter()

async def main():
    return await asyncio.gather(*(aio_task(i) for i in range(3)))

aio = asyncio.run(main())
t2 = time.perf_counter()
print("3 个 0.3s I/O 任务：")
print("线程池:", round((t1 - t0) * 1000), "ms |", th[0], "| 协程:", round((t2 - t1) * 1000), "ms |", aio[0])
print("串行需 900ms，两者都 ≈300ms —— 并发的价值在 I/O 等待期做别的事")
```

预期输出（实测，时间数据机器相关）：

```
3 个 0.3s I/O 任务：
线程池: 303 ms | task0 完成 | 协程: 320 ms | task0 完成
串行需 900ms，两者都 ≈300ms —— 并发的价值在 I/O 等待期做别的事
```

### 并发选型决策图解（文字示意图）

```
并发规模与任务类型？
 ├─ 几十~几百 I/O 任务、要简单 ─▶ ThreadPoolExecutor（pool.map 一行搞定）
 ├─ 上千连接/长轮询/WebSocket ─▶ asyncio（单线程事件循环，内存极省）
 ├─ CPU 密集 ─────────────────▶ ProcessPoolExecutor / multiprocessing
 └─ 混合 ────────────────────▶ 分而治之：I/O 层 asyncio + 计算层 run_in_executor
铁律：async 函数里只许 await 异步库（aiohttp/httpx/asyncio.sleep）
```

### 参考资料（补充）

- **Python 官方文档：concurrent.futures**
  - 链接：https://docs.python.org/zh-cn/3/library/concurrent.futures.html
- **Python 官方文档：asyncio 协程与任务**
  - 链接：https://docs.python.org/zh-cn/3/library/asyncio-task.html

### 知识关联

- 承接 l8-1：线程池能加速 I/O 的原理正是"等待期释放 GIL"；
- 呼应 pep-l7-1：asyncio 事件循环的挂起/恢复与生成器 yield 同源；
- pep-l9-1 的配置加载在 Web 服务启动时常与 asyncio 生命周期钩子结合。

### 本节总结（要点回顾）

1. 线程池=自动挡：`with ThreadPoolExecutor(n) as pool: pool.map(fn, items)` 两行起步；
2. asyncio=单线程调度：`async def` + `await` + `asyncio.gather`，规模上限高一个数量级；
3. 最大的坑：async 里混入同步阻塞调用，全部协程被一颗老鼠屎卡死。
'''

ADD["pep-l9-1"] = '''
### 问题背景与直觉理解（补充）

十二要素应用宣言（12-Factor）第三条说：**配置 = 环境 + 代码分离**。同一份代码，开发连本地库、生产连集群库——差别只在环境变量。直觉模型：环境变量是"点菜单"，代码是"厨艺"——同一道菜的做法，咸淡随客人口味（环境）调整，而不是改菜谱。Python 的坑在于 `os.getenv` 返回**永远是字符串**：`bool("false")` 是 True！必须写显式解析函数；frozen dataclass 则把"配置对象"变成不可变的单一事实来源，启动时一次装配、全程只读。

### 手算推导（逐步演算）

1. 布尔陷阱推演：环境变量 `APP_DEBUG="false"` → `bool(os.environ["APP_DEBUG"])` = `bool("false")` = **True**（非空字符串恒真）——debug 本该关却被打开，生产日志瞬间爆炸；正确写法 `val.lower() in ("true", "1", "yes")` → False；
2. 快速失败推演：`os.environ["APP_DB_URL"]` 用方括号而非 `.get`——缺配置在**启动瞬间** KeyError 崩溃，好过运行到半夜连接数据库时才炸；
3. frozen 推演：`dataclass(frozen=True)` 的实例一旦创建，`cfg.timeout = 5` 直接抛 FrozenInstanceError——配置在进程生命周期内不可被偷偷篡改。

### 完整案例（补充）：类型化配置装配与快速失败

```python
import os
from dataclasses import dataclass

os.environ["APP_ENV"] = "prod"
os.environ["APP_DEBUG"] = "false"
os.environ["APP_DB_URL"] = "postgres://u:p@db:5432/app"
os.environ["APP_TIMEOUT"] = "30"

def env_bool(key, default=False):
    return os.getenv(key, str(default)).lower() in ("true", "1", "yes")

@dataclass(frozen=True)
class Config:
    env: str
    debug: bool
    db_url: str
    timeout: float

    @classmethod
    def from_env(cls):
        return cls(
            env=os.getenv("APP_ENV", "dev"),
            debug=env_bool("APP_DEBUG"),
            db_url=os.environ["APP_DB_URL"],          # 缺失直接 KeyError 启动失败
            timeout=float(os.getenv("APP_TIMEOUT", "10")),
        )

cfg = Config.from_env()
print(cfg.env, "| debug =", cfg.debug, "| timeout =", cfg.timeout)
print("bool('false') =", bool(os.environ["APP_DEBUG"]), "<- 朴素转换的坑")
try:
    del os.environ["APP_DB_URL"]
    Config.from_env()
except KeyError as e:
    print("缺配置快速失败:", e)
```

预期输出（实测）：

```
prod | debug = False | timeout = 30.0
bool('false') = True <- 朴素转换的坑
缺配置快速失败: 'APP_DB_URL'
```

### 配置装配流水线图解（文字示意图）

```
环境注入（deploy.yaml / shell / 容器 env）
        ▼
os.environ（进程内字符串字典）
        ▼
显式解析：env_bool / float / int —— 禁用裸 bool()！
        ▼
Config frozen dataclass（单一事实来源，只读）
        ├─ 缺必填 ──▶ 启动即 KeyError（快速失败）
        └─ 全部就绪 ──▶ 注入业务模块（禁止模块内直接 os.getenv）
```

### 参考资料（补充）

- **The Twelve-Factor App: Config**
  - 链接：https://12factor.net/zh_cn/config
- **Python 官方文档：dataclasses（frozen 参数）**
  - 链接：https://docs.python.org/zh-cn/3/library/dataclasses.html

### 知识关联

- 承接 l6-3：全局可变状态的反面教材——frozen Config 是"用不可变对象替代全局变量"的正解；
- 呼应 llma-l2-2：Pydantic Settings 用同一思想提供带校验的配置容器；
- l8-2 的 asyncio 服务启动时先装配 Config 再进事件循环，是标准初始化顺序。

### 本节总结（要点回顾）

1. 配置与代码分离：同一镜像跑多环境，差别只在环境变量；
2. `os.getenv` 恒返字符串：布尔必须显式解析，数值必须 float/int 包裹；
3. frozen dataclass 做单一事实来源；必填缺失启动即炸（快速失败优于深夜崩溃）。
'''

def main():
    c = json.load(io.open(P, encoding="utf-8"))
    n = 0
    for ch in c["chapters"]:
        for l in ch["lessons"]:
            if l["id"] in ADD and len(l.get("content", "")) < 2600:
                l["content"] = merge(l["content"], ADD[l["id"]])
                n += 1
                print(l["id"], "->", len(l["content"]))
    c["updatedAt"] = int(time.time() * 1000)
    json.dump(c, io.open(P, "w", encoding="utf-8", newline="\n"), ensure_ascii=False, indent=2)
    print("expanded", n)

if __name__ == "__main__":
    main()
