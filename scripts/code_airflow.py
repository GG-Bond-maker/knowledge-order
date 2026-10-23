# -*- coding: utf-8 -*-
"""
Runnable Python Demos and Programming Exercises for Apache Airflow Data Engineering.
All code is self-contained and verified in standard Python / NumPy / Pandas.
"""

AIRFLOW_CHAPTER_CODE = {
    # ── Chapter 1: Airflow 生产架构与现代编排底座 ──
    "airflow-c1": {
        "demos": {
            "airflow-l1-4": {  # Note: mapped to lesson in airflow_ch1
                "title": "Airflow 任务实例 (TaskInstance) 状态机流转模拟器",
                "lang": "python",
                "code": """# Python 模拟 Airflow TaskInstance 状态机流转与重试机制
class TaskInstanceMock:
    def __init__(self, task_id: str, max_retries: int = 2):
        self.task_id = task_id
        self.state = 'none'
        self.max_retries = max_retries
        self.try_number = 0
        self.history = []

    def set_state(self, new_state: str):
        self.state = new_state
        self.history.append(new_state)
        print(f"[{self.task_id}] 状态迁移 ➔ {new_state}")

    def execute_simulation(self, succeed_on_attempt: int = 1):
        \"\"\"模拟调度器与 Worker 协同执行\"\"\"
        self.set_state('scheduled')
        self.set_state('queued')
        
        while self.state in ['queued', 'up_for_retry']:
            self.try_number += 1
            self.set_state('running')
            print(f"  --> 正在执行第 {self.try_number} 次尝试...")
            
            if self.try_number >= succeed_on_attempt:
                self.set_state('success')
                print(f"  ✓ 任务执行成功！")
                break
            else:
                if self.try_number <= self.max_retries:
                    self.set_state('up_for_retry')
                    print(f"  ⚠️ 捕获网络异常，进入指数退避等待重试...")
                else:
                    self.set_state('failed')
                    print(f"  ❌ 重试机会耗尽，标记最终失败并触发告警！")
                    break

ti = TaskInstanceMock("sync_orders_api", max_retries=2)
# 模拟第 2 次重试才成功的场景
ti.execute_simulation(succeed_on_attempt=2)
print("\\n完整生命周期流转轨迹:", " ➔ ".join(ti.history))
"""
            }
        },
        "exercises": [
            {
                "id": "airflow-c1-code-1",
                "type": "code",
                "difficulty": 2,
                "question": "【编程实战】实现 DAG 无环性检测：编写函数 `is_dag_acyclic(tasks, edges)`。\n\n入参格式：\n- `tasks`: 任务名称列表，如 `['A', 'B', 'C']`\n- `edges`: 有向依赖元组列表，`(from_task, to_task)` 表示 `from_task >> to_task`\n\n要求：\n使用拓扑排序（Kahn 算法）检测该图是否存在死锁环路。若是合法有向无环图返回 True，若存在环路返回 False。",
                "starterCode": """from collections import defaultdict, deque

def is_dag_acyclic(tasks: list, edges: list) -> bool:
    \"\"\"检测工作流是否为合法有向无环图 (DAG)\"\"\"
    ___
""",
                "setupCode": "",
                "expectedOutput": "返回布尔值",
                "answer": """from collections import defaultdict, deque

def is_dag_acyclic(tasks: list, edges: list) -> bool:
    adj = defaultdict(list)
    in_degree = {t: 0 for t in tasks}
    for u, v in edges:
        adj[u].append(v)
        in_degree[v] += 1
    
    q = deque([t for t in tasks if in_degree[t] == 0])
    visited_count = 0
    while q:
        curr = q.popleft()
        visited_count += 1
        for nxt in adj[curr]:
            in_degree[nxt] -= 1
            if in_degree[nxt] == 0:
                q.append(nxt)
    
    return visited_count == len(tasks)
""",
                "tests": """assert is_dag_acyclic(['A', 'B', 'C'], [('A', 'B'), ('B', 'C')]) == True, "线性依赖应合法"
assert is_dag_acyclic(['A', 'B', 'C'], [('A', 'B'), ('B', 'C'), ('C', 'A')]) == False, "循环依赖应判定非法"
assert is_dag_acyclic(['A', 'B', 'C', 'D'], [('A', 'B'), ('A', 'C'), ('B', 'D'), ('C', 'D')]) == True, "菱形依赖应合法"
""",
                "explanation": "Airflow 在解析 DAG 时，会通过拓扑排序算法静态检测是否存在死锁循环依赖，避免调度器陷入死循环。",
                "tags": ["DAG", "拓扑排序", "环路检测"]
            }
        ]
    },

    # ── Chapter 2: DAG 核心规范与定义范式 ──
    "airflow-c2": {
        "demos": {
            "airflow-l2-3": {
                "title": "任务依赖操作符 >> 与 << 的 Python 重载实现",
                "lang": "python",
                "code": """# 演示 Airflow 如何通过重载 __rshift__ 和 __lshift__ 实现优雅的任务依赖连线
class DummyOperator:
    def __init__(self, task_id: str):
        self.task_id = task_id
        self.downstream_list = set()
        self.upstream_list = set()

    def set_downstream(self, other):
        if isinstance(other, list):
            for item in other:
                self.set_downstream(item)
        else:
            self.downstream_list.add(other.task_id)
            other.upstream_list.add(self.task_id)

    def __rshift__(self, other):
        \"\"\"重载 >> 操作符\"\"\"
        self.set_downstream(other)
        return other

    def __repr__(self):
        return f"Task({self.task_id})"

# 创建 4 个任务
t1 = DummyOperator("extract_api")
t2 = DummyOperator("clean_users")
t3 = DummyOperator("clean_orders")
t4 = DummyOperator("load_marts")

# 像 Airflow 一样优雅使用 >> 连线
t1 >> [t2, t3]
t2 >> t4
t3 >> t4

print("t1 的下游:", t1.downstream_list)
print("t4 的上游:", t4.upstream_list)
print("✓ Python 运算符重载赋予了 Airflow 极具表现力的工作流声明语法！")
"""
            }
        },
        "exercises": [
            {
                "id": "airflow-c2-code-1",
                "type": "code",
                "difficulty": 2,
                "question": "【编程实战】default_args 级联继承解析器：编写函数 `resolve_task_parameters(dag_defaults, task_override)`。\n\n规则：\n1. 任务优先继承 `dag_defaults` 中的所有配置；\n2. 若 `task_override` 中存在同名键，则覆盖默认值；\n3. 返回最终合并后的参数字典（不修改原始入参字典）。",
                "starterCode": """def resolve_task_parameters(dag_defaults: dict, task_override: dict) -> dict:
    \"\"\"实现 DAG 默认参数向下级联继承与局部覆盖\"\"\"
    ___
""",
                "setupCode": "",
                "expectedOutput": "返回合并后的参数字典",
                "answer": """def resolve_task_parameters(dag_defaults: dict, task_override: dict) -> dict:
    final = dict(dag_defaults)
    final.update(task_override)
    return final
""",
                "tests": """defaults = {'retries': 3, 'owner': 'de_team', 'timeout': 3600}
override = {'retries': 0, 'priority_weight': 10}
res = resolve_task_parameters(defaults, override)
assert res['retries'] == 0, "任务重写参数优先级应最高"
assert res['owner'] == 'de_team', "应继承 DAG 默认参数"
assert res['priority_weight'] == 10, "任务特有参数应保留"
""",
                "explanation": "在生产 DAG 中，通过 default_args 统一定义告警与重试策略，各任务按需局部覆盖，极大降低代码重复率。",
                "tags": ["default_args", "参数继承", "配置管理"]
            }
        ]
    },

    # ── Chapter 3: 核心算子深度实战与生态集成 ──
    "airflow-c3": {
        "demos": {
            "airflow-l3-5": {
                "title": "传感器 reschedule 模式工作槽位释放模拟",
                "lang": "python",
                "code": """# 模拟 Sensor 在 poke 模式与 reschedule 模式下的槽位占用对比
class SensorMock:
    def __init__(self, mode='poke'):
        self.mode = mode

    def probe(self, is_file_ready: bool):
        if is_file_ready:
            return 'SUCCESS: 数据已就绪，立即放行'
        else:
            if self.mode == 'poke':
                return 'POKE 模式: 在 Worker 线程中 sleep(60)，持续霸占 Worker 槽位不释放！'
            else:
                return 'RESCHEDULE 模式: 状态置为 up_for_reschedule，立即释放 Worker 槽位，等待下次调度！'

print("=== 1. Poke 模式模拟 ===")
s_poke = SensorMock(mode='poke')
print(s_poke.probe(is_file_ready=False))

print("\\n=== 2. Reschedule 模式模拟 (生产推荐) ===")
s_resched = SensorMock(mode='reschedule')
print(s_resched.probe(is_file_ready=False))
print("\\n✓ 采用 reschedule 模式能避免因成百上千个等待文件的 Sensor 耗死集群并发槽位！")
"""
            }
        },
        "exercises": [
            {
                "id": "airflow-c3-code-1",
                "type": "code",
                "difficulty": 2,
                "question": "【编程实战】带超时判定的自定义 Sensor：编写函数 `simulate_sensor_run(probe_results_sequence, poke_interval=10, timeout=50)`。\n\n规则：\n- `probe_results_sequence`: 布尔值列表，按序代表每次 probe() 的探测结果（True 为文件就绪，False 为未就绪）。\n- 每次探测若为 False，耗时累加 `poke_interval`。\n- 若在总耗时超过 `timeout` 前探测到 True，返回字典 `{'status': 'SUCCESS', 'attempts': 次数, 'elapsed_seconds': 耗时}`；\n- 若总耗时超过 `timeout` 仍为 False，返回字典 `{'status': 'TIMEOUT_ERROR', 'attempts': 次数, 'elapsed_seconds': 耗时}`。",
                "starterCode": """def simulate_sensor_run(probe_results_sequence: list, poke_interval: int = 10, timeout: int = 50) -> dict:
    \"\"\"模拟传感器轮询探测与超时控制\"\"\"
    ___
""",
                "setupCode": "",
                "expectedOutput": "返回包含 status / attempts / elapsed_seconds 的字典",
                "answer": """def simulate_sensor_run(probe_results_sequence: list, poke_interval: int = 10, timeout: int = 50) -> dict:
    elapsed = 0
    attempts = 0
    for ready in probe_results_sequence:
        attempts += 1
        if ready:
            return {'status': 'SUCCESS', 'attempts': attempts, 'elapsed_seconds': elapsed}
        elapsed += poke_interval
        if elapsed > timeout:
            return {'status': 'TIMEOUT_ERROR', 'attempts': attempts, 'elapsed_seconds': elapsed}
    return {'status': 'TIMEOUT_ERROR', 'attempts': attempts, 'elapsed_seconds': elapsed}
""",
                "tests": """res1 = simulate_sensor_run([False, False, True], poke_interval=10, timeout=50)
assert res1['status'] == 'SUCCESS'
assert res1['attempts'] == 3
assert res1['elapsed_seconds'] == 20

res2 = simulate_sensor_run([False, False, False, False, False, False], poke_interval=10, timeout=30)
assert res2['status'] == 'TIMEOUT_ERROR'
""",
                "explanation": "传感器算子必须设置明确的 timeout 超时熔断保护，防止上游数据缺失导致任务无限期挂起占用集群资源。",
                "tags": ["Sensors", "超时控制", "reschedule"]
            }
        ]
    },

    # ── Chapter 4: Task 内部通信与数据交换哲学 ──
    "airflow-c4": {
        "demos": {
            "airflow-l4-1": {
                "title": "XCom 引用传递 (Pass-by-Reference) 与 S3 URI 模拟",
                "lang": "python",
                "code": """# 演示生产级 XCom 传递最佳实践：Pass-by-Reference (传递引用而非载荷)
import sys

# 模拟一个 500 万行的数据字典 (体积约 50MB)
heavy_data = [{'user_id': i, 'balance': i * 1.5} for i in range(10000)]
data_size = sys.getsizeof(heavy_data)

print(f"大对象体积: {data_size / 1024:.2f} KB")

# ❌ 反模式：直接推入 XCom 元数据库
print("❌ 传统反模式：xcom_push(key='data', value=heavy_data) 导致 PostgreSQL 负载剧增！")

# ✅ 工业级规范：引用传递
def mock_s3_upload(data, key):
    # 模拟写入对象存储
    s3_uri = f"s3://my-prod-datalake/{key}.parquet"
    return s3_uri

xcom_pointer = mock_s3_upload(heavy_data, "daily_balances_20240301")
print(f"✅ 现代规范 XCom 指针: '{xcom_pointer}'")
print(f"XCom 存储体积缩减至: {sys.getsizeof(xcom_pointer)} 字节 (微秒级存储与读取！)")
"""
            }
        },
        "exercises": [
            {
                "id": "airflow-c4-code-1",
                "type": "code",
                "difficulty": 2,
                "question": "【编程实战】智能 XCom 序列化拦截器：编写类 `SmartXComBackend` 的静态方法 `serialize(value, size_limit_kb=10.0)`。\n\n规则：\n- 估算对象字符串长度占用的 KB 数（`len(str(value)) / 1024.0`）。\n- 若体积 <= size_limit_kb，直接返回 `value`；\n- 若体积 > size_limit_kb，模拟将大对象转存并返回指针字符串：`'s3_ref://storage/xcom_payload_hash'`。",
                "starterCode": """class SmartXComBackend:
    @staticmethod
    def serialize(value, size_limit_kb: float = 10.0):
        \"\"\"自动拦截大对象，防止挤爆元数据库\"\"\"
        ___
""",
                "setupCode": "",
                "expectedOutput": "按体积阈值智能返回原始值或 S3 指针",
                "answer": """class SmartXComBackend:
    @staticmethod
    def serialize(value, size_limit_kb: float = 10.0):
        val_str = str(value)
        size_kb = len(val_str) / 1024.0
        if size_kb > size_limit_kb:
            return 's3_ref://storage/xcom_payload_hash'
        return value
""",
                "tests": """assert SmartXComBackend.serialize("short_string") == "short_string"
assert SmartXComBackend.serialize({'status': 'ok'}) == {'status': 'ok'}
big_obj = "A" * 20000 # 20KB
assert SmartXComBackend.serialize(big_obj, size_limit_kb=10.0) == 's3_ref://storage/xcom_payload_hash'
""",
                "explanation": "自定义 XCom 后端（Custom XCom Backend）可从底层透明拦截大数据对象并转存至 S3/GCS，彻底消灭 Worker 内存溢出隐患。",
                "tags": ["XCom", "引用传递", "架构治理"]
            }
        ]
    },

    # ── Chapter 5: 调度机制深度解构 ──
    "airflow-c5": {
        "demos": {
            "airflow-l5-1": {
                "title": "Data Interval [start, end) 与次日零点调度时序模拟",
                "lang": "python",
                "code": """from datetime import datetime, timedelta

def get_daily_schedule_timeline(run_date_str: str):
    \"\"\"计算指定日期的 Data Interval 与实际调度触发时间\"\"\"
    start = datetime.strptime(run_date_str, "%Y-%m-%d")
    end = start + timedelta(days=1)
    trigger_time = end # 次日零点整触发调度
    
    print(f"=== 业务日期: {run_date_str} 调度推演 ===")
    print(f"1. 数据区间起点 (data_interval_start): {start.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"2. 数据区间终点 (data_interval_end):   {end.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"3. 实际调度启动时间 (trigger_time):    {trigger_time.strftime('%Y-%m-%d %H:%M:%S')} (次日凌晨)")
    print(f"\\n💡 核心认知：3月1日整天的交易数据必须等 3月1日 最后一秒过去后，在 3月2日零点触发处理！")

get_daily_schedule_timeline("2024-03-01")
"""
            }
        },
        "exercises": [
            {
                "id": "airflow-c5-code-1",
                "type": "code",
                "difficulty": 2,
                "question": "【编程实战】计算每日批处理的 Data Interval 时间区间：编写函数 `calc_daily_interval(logical_date_str)`。\n\n入参：形如 `'2024-03-01'` 的日期字符串。\n\n要求：\n返回三元组 `(data_interval_start, data_interval_end, trigger_time)`，格式均为 `'%Y-%m-%d %H:%M:%S'` 字符串。\n例如输入 `'2024-03-01'`，返回 `('2024-03-01 00:00:00', '2024-03-02 00:00:00', '2024-03-02 00:00:00')`。",
                "starterCode": """from datetime import datetime, timedelta

def calc_daily_interval(logical_date_str: str) -> tuple:
    \"\"\"计算每日批处理的数据区间与触发时间\"\"\"
    ___
""",
                "setupCode": "",
                "expectedOutput": "返回 3 个标准时间格式字符串的元组",
                "answer": """from datetime import datetime, timedelta

def calc_daily_interval(logical_date_str: str) -> tuple:
    dt = datetime.strptime(logical_date_str, "%Y-%m-%d")
    nxt = dt + timedelta(days=1)
    fmt = "%Y-%m-%d %H:%M:%S"
    return (dt.strftime(fmt), nxt.strftime(fmt), nxt.strftime(fmt))
""",
                "tests": """start, end, trig = calc_daily_interval('2024-03-01')
assert start == '2024-03-01 00:00:00'
assert end == '2024-03-02 00:00:00'
assert trig == '2024-03-02 00:00:00'
""",
                "explanation": "理解 Data Interval 的闭开区间 [start, end) 是掌握 Airflow 现代调度语义的最核心基石。",
                "tags": ["Data Interval", "调度周期", "logical_date"]
            }
        ]
    },

    # ── Chapter 6: 管道容错、SLA 告警与高级触发规则 ──
    "airflow-c6": {
        "demos": {
            "airflow-l6-4": {
                "title": "Trigger Rules (触发规则) 状态机实时求值引擎",
                "lang": "python",
                "code": """def evaluate_trigger_rule(rule: str, upstream_states: list) -> bool:
    \"\"\"模拟 Airflow 调度器根据上游任务状态判定当前任务是否允许运行\"\"\"
    successes = upstream_states.count('success')
    failures = upstream_states.count('failed')
    skipped = upstream_states.count('skipped')
    total = len(upstream_states)

    if rule == 'all_success':
        return successes == total
    elif rule == 'none_failed_min_one_success':
        return failures == 0 and successes >= 1
    elif rule == 'all_done':
        return total > 0 # 所有上游只要都有终态即可执行
    elif rule == 'one_success':
        return successes >= 1
    return False

print("all_success (上游全成功):", evaluate_trigger_rule('all_success', ['success', 'success']))
print("all_success (上游含跳过):", evaluate_trigger_rule('all_success', ['success', 'skipped']))
print("none_failed_min_one_success (上游含跳过无失败):", evaluate_trigger_rule('none_failed_min_one_success', ['success', 'skipped']))
print("all_done (无论成功失败全收拢):", evaluate_trigger_rule('all_done', ['success', 'failed']))
"""
            }
        },
        "exercises": [
            {
                "id": "airflow-c6-code-1",
                "type": "code",
                "difficulty": 2,
                "question": "【编程实战】实现 Trigger Rule 判定器：编写函数 `can_task_run(rule_name, parent_task_states)`。\n\n规则：\n- `parent_task_states`: 字符串列表，状态包含 `'success'`, `'failed'`, `'skipped'`, `'upstream_failed'`。\n- 支持 `rule_name`：\n  1. `'all_success'`: 必须全为 `'success'` 才返回 True。\n  2. `'all_failed'`: 必须全部是失败状态（`'failed'` 或 `'upstream_failed'`）才返回 True。\n  3. `'none_failed'`: 没有任务失败，且至少一个成功或跳过才返回 True。\n  4. `'all_done'`: 只要列表非空就返回 True。\n其余情况返回 False。",
                "starterCode": """def can_task_run(rule_name: str, parent_task_states: list) -> bool:
    \"\"\"评估任务触发规则\"\"\"
    ___
""",
                "setupCode": "",
                "expectedOutput": "返回是否放行运行的布尔值",
                "answer": """def can_task_run(rule_name: str, parent_task_states: list) -> bool:
    if not parent_task_states:
        return False
    succ = parent_task_states.count('success')
    fail = sum(1 for s in parent_task_states if s in ['failed', 'upstream_failed'])
    skip = parent_task_states.count('skipped')
    tot = len(parent_task_states)

    if rule_name == 'all_success':
        return succ == tot
    elif rule_name == 'all_failed':
        return fail == tot
    elif rule_name == 'none_failed':
        return fail == 0 and (succ > 0 or skip > 0)
    elif rule_name == 'all_done':
        return True
    return False
""",
                "tests": """assert can_task_run('all_success', ['success', 'success']) == True
assert can_task_run('all_success', ['success', 'failed']) == False
assert can_task_run('none_failed', ['success', 'skipped']) == True
assert can_task_run('all_done', ['failed', 'success', 'skipped']) == True
""",
                "explanation": "灵活组合 Trigger Rules 能让 Airflow 从容应对条件分支汇总、异常清理与容灾收敛场景。",
                "tags": ["Trigger Rules", "all_success", "none_failed"]
            }
        ]
    },

    # ── Chapter 7: 动态任务编排与高级拓扑结构 ──
    "airflow-c7": {
        "demos": {
            "airflow-l7-1": {
                "title": "动态任务映射 (.expand()) 运行时展开模拟",
                "lang": "python",
                "code": """# 模拟 Airflow 2.3+ 的核心创新：Dynamic Task Mapping
def simulate_task_expand(func, static_kwargs: dict, dynamic_arg_name: str, dynamic_arg_values: list):
    print(f"动态映射生成 {len(dynamic_arg_values)} 个独立的 TaskInstance:")
    results = []
    for i, val in enumerate(dynamic_arg_values):
        kwargs = dict(static_kwargs)
        kwargs[dynamic_arg_name] = val
        res = func(**kwargs)
        print(f"  • TaskInstance[{i}] 执行完成 -> 输出: {res}")
        results.append(res)
    return results

def process_file(prefix: str, file_name: str):
    return f"{prefix}://processed_{file_name}"

files = ['orders_part1.csv', 'orders_part2.csv', 'orders_part3.csv']
output = simulate_task_expand(process_file, {'prefix': 's3'}, 'file_name', files)

print("\\n下游任务收集到的全部产物列表:", output)
"""
            }
        },
        "exercises": [
            {
                "id": "airflow-c7-code-1",
                "type": "code",
                "difficulty": 2,
                "question": "【编程实战】动态任务映射展开模拟：编写函数 `map_reduce_tasks(items, map_fn, reduce_fn)`。\n\n要求：\n1. 对 `items` 列表中的每个元素，分别调用 `map_fn(item)`，得到映射输出列表。\n2. 将映射输出列表传递给 `reduce_fn(mapped_outputs)` 执行聚合汇总。\n3. 返回聚合汇总后的最终结果。",
                "starterCode": """def map_reduce_tasks(items: list, map_fn, reduce_fn):
    \"\"\"模拟动态任务映射与汇聚流程\"\"\"
    ___
""",
                "setupCode": "",
                "expectedOutput": "返回 reduce 计算的最终结果",
                "answer": """def map_reduce_tasks(items: list, map_fn, reduce_fn):
    mapped = [map_fn(x) for x in items]
    return reduce_fn(mapped)
""",
                "tests": """# 测试：每个分片统计单词数，最后求和
data = ["hello world", "airflow dynamic mapping", "python"]
total = map_reduce_tasks(data, lambda s: len(s.split()), sum)
assert total == 6, f"单词总数计算有误: {total}"
""",
                "explanation": "动态任务映射（Dynamic Task Mapping）将静态拓扑提升为运行时自适应扩缩的高性能分布式编排。",
                "tags": ["Dynamic Task Mapping", "expand", "MapReduce"]
            }
        ]
    },

    # ── Chapter 8: 生产环境部署、执行器选型与高可用 ──
    "airflow-c8": {
        "demos": {
            "airflow-l8-1": {
                "title": "Celery 消息队列推拉调度模拟器",
                "lang": "python",
                "code": """from collections import deque

class CeleryQueueMock:
    def __init__(self, num_workers=2):
        self.queue = deque()
        self.workers = {f"worker_{i+1}": 0 for i in range(num_workers)}

    def push_task(self, task_id: str):
        self.queue.append(task_id)
        print(f"调度器将任务 [{task_id}] 推入 Redis 消息队列 (当前堆积: {len(self.queue)})")

    def worker_consume(self):
        print("\\nWorker 并发拉取并执行任务:")
        while self.queue:
            task = self.queue.popleft()
            # 找到当前最空闲的 worker
            chosen = min(self.workers, key=self.workers.get)
            self.workers[chosen] += 1
            print(f"  ➔ [{chosen}] 领取并执行任务 [{task}]")

cq = CeleryQueueMock(num_workers=3)
cq.push_task("task_orders")
cq.push_task("task_users")
cq.push_task("task_payments")
cq.push_task("task_inventory")
cq.worker_consume()
print("✓ Celery 分布式执行器实现任务在多 Worker 节点的水平扩展与负载均衡！")
"""
            }
        },
        "exercises": [
            {
                "id": "airflow-c8-code-1",
                "type": "code",
                "difficulty": 2,
                "question": "【编程实战】僵死任务 (Zombie Task) 心跳探针检测：编写函数 `detect_zombie_tasks(task_instances, current_timestamp, heartbeat_timeout_seconds=300)`。\n\n入参：\n- `task_instances`: 列表形如 `[{'task_id': 't1', 'state': 'running', 'last_heartbeat': 1000}, ...]`\n- `current_timestamp`: 当前系统时间戳秒数。\n\n规则：\n返回所有处于 `'running'` 状态但 `current_timestamp - last_heartbeat > heartbeat_timeout_seconds` 的僵死任务 `task_id` 列表。",
                "starterCode": """def detect_zombie_tasks(task_instances: list, current_timestamp: int, heartbeat_timeout_seconds: int = 300) -> list:
    \"\"\"检测心跳丢失的僵死任务\"\"\"
    ___
""",
                "setupCode": "",
                "expectedOutput": "返回僵死任务的 task_id 列表",
                "answer": """def detect_zombie_tasks(task_instances: list, current_timestamp: int, heartbeat_timeout_seconds: int = 300) -> list:
    zombies = []
    for ti in task_instances:
        if ti.get('state') == 'running':
            diff = current_timestamp - ti.get('last_heartbeat', 0)
            if diff > heartbeat_timeout_seconds:
                zombies.append(ti['task_id'])
    return zombies
""",
                "tests": """tis = [
    {'task_id': 't1', 'state': 'running', 'last_heartbeat': 700}, # 差 300，正常
    {'task_id': 't2', 'state': 'running', 'last_heartbeat': 650}, # 差 350，超时僵死
    {'task_id': 't3', 'state': 'success', 'last_heartbeat': 100}, # 已完成，不检查
]
res = detect_zombie_tasks(tis, current_timestamp=1000, heartbeat_timeout_seconds=300)
assert res == ['t2'], f"检测僵死任务有误: {res}"
""",
                "explanation": "Airflow 调度器定期执行心跳探针扫描，自动发现由于 OOM 或主机断电而死锁的僵死任务，将其置为 failed 并触发自愈重试。",
                "tags": ["Zombie Task", "调度器高可用", "心跳检测"]
            }
        ]
    },

    # ── Chapter 9: 现代端到端联合编排实战 (Airflow + dbt Cosmos) ──
    "airflow-c9": {
        "demos": {
            "airflow-l9-1": {
                "title": "Airflow + dbt Cosmos 细粒度任务映射模拟",
                "lang": "python",
                "code": """# 模拟 Cosmos 解析 dbt manifest.json 生成细粒度 Airflow 原生任务树
dbt_manifest = {
    'model.stg_orders': {'depends_on': []},
    'model.stg_payments': {'depends_on': []},
    'model.fct_orders': {'depends_on': ['model.stg_orders', 'model.stg_payments']},
    'test.fct_orders_unique': {'depends_on': ['model.fct_orders']}
}

print("=== Cosmos 编译生成的 Airflow Task 树 ===")
for node, info in dbt_manifest.items():
    node_type, name = node.split('.')
    upstream = [p.split('.')[1] for p in info['depends_on']]
    if upstream:
        print(f"Airflow Task [{name}] (类型: {node_type}) ── 依赖上游 ──> {upstream}")
    else:
        print(f"Airflow Task [{name}] (类型: {node_type}) ── 源头模型")

print("\\n✓ 打破单块黑盒：任何单一模型报错，仅该节点变红，支持在 Web UI 单独重跑！")
"""
            }
        },
        "exercises": [
            {
                "id": "airflow-c9-code-1",
                "type": "code",
                "difficulty": 2,
                "question": "【编程实战】测试门禁拦截判定：编写函数 `should_proceed_to_bi(dbt_test_results)`。\n\n入参：\n- `dbt_test_results`: 字典形如 `{'test_unique_id': {'status': 'pass', 'failures': 0}, ...}`\n\n规则：\n- 若所有测试的 `status == 'pass'` 且 `failures == 0`，返回 True（允许触发下游 BI 报表刷新）；\n- 若存在任何一个测试失败（status != 'pass' 或 failures > 0），返回 False（阻断下游）。",
                "starterCode": """def should_proceed_to_bi(dbt_test_results: dict) -> bool:
    \"\"\"依据 dbt 测试结果决定是否放行下游报表\"\"\"
    ___
""",
                "setupCode": "",
                "expectedOutput": "返回布尔值",
                "answer": """def should_proceed_to_bi(dbt_test_results: dict) -> bool:
    for test_name, res in dbt_test_results.items():
        if res.get('status') != 'pass' or res.get('failures', 0) > 0:
            return False
    return True
""",
                "tests": """t_pass = {'t1': {'status': 'pass', 'failures': 0}, 't2': {'status': 'pass', 'failures': 0}}
assert should_proceed_to_bi(t_pass) == True
t_fail = {'t1': {'status': 'pass', 'failures': 0}, 't2': {'status': 'fail', 'failures': 3}}
assert should_proceed_to_bi(t_fail) == False
""",
                "explanation": "在端到端联合编排中，测试失败时熔断阻断下游 BI 看板刷新，是保证企业级数据资产严肃可信的核心关卡。",
                "tags": ["Cosmos", "数据质量门禁", "联合编排"]
            }
        ]
    },

    # ── Chapter 10: 管道排障、性能调优与可观测性生产治理 ──
    "airflow-c10": {
        "demos": {
            "airflow-l10-7": {
                "title": "生产就绪度 CheckList 静态自动化审计",
                "lang": "python",
                "code": """# 静态代码审查：自动审计 DAG 脚本是否符合生产规范
def audit_dag_script(code_content: str) -> list:
    issues = []
    if "catchup=True" in code_content:
        issues.append("❌ 违规：检测到 catchup=True，可能引发历史回填风暴！")
    if "retries" not in code_content:
        issues.append("⚠️ 警告：未显式配置任务重试参数 retries！")
    if "mode='poke'" in code_content:
        issues.append("⚠️ 警告：Sensor 采用了 poke 阻塞模式，建议改为 reschedule！")
    if "SELECT *" in code_content and "open(" in code_content:
        issues.append("❌ 严重：检测到在 DAG 顶层范围执行文件/数据库 I/O 阻塞调用！")
    
    if not issues:
        issues.append("✅ 完美！DAG 脚本符合生产上线黄金标准。")
    return issues

sample_bad_code = \"\"\"
from airflow import DAG
import requests
resp = requests.get("https://api.internal/token") # 顶层 I/O 违规！
dag = DAG('bad_dag', catchup=True)
\"\"\"

print("=== 静态审计报告 ===")
for issue in audit_dag_script(sample_bad_code):
    print(issue)
"""
            }
        },
        "exercises": [
            {
                "id": "airflow-c10-code-1",
                "type": "code",
                "difficulty": 2,
                "question": "【编程实战】计算数据管道端到端 SLA 履约率：编写函数 `calculate_sla_compliance(run_durations_minutes, sla_limit_minutes=60.0)`。\n\n入参：\n- `run_durations_minutes`: 历史批次执行耗时（分钟）列表，如 `[45.0, 58.0, 72.0, 40.0]`\n- `sla_limit_minutes`: SLA 允许的最大执行耗时限制（默认 60.0 分钟）。\n\n要求：\n返回履约率百分比浮点数（保留一位小数，范围 0.0 ~ 100.0）。若列表为空返回 0.0。",
                "starterCode": """def calculate_sla_compliance(run_durations_minutes: list, sla_limit_minutes: float = 60.0) -> float:
    \"\"\"计算 SLA 履约达标率百分比\"\"\"
    ___
""",
                "setupCode": "",
                "expectedOutput": "返回百分比浮点数",
                "answer": """def calculate_sla_compliance(run_durations_minutes: list, sla_limit_minutes: float = 60.0) -> float:
    if not run_durations_minutes:
        return 0.0
    passed = sum(1 for d in run_durations_minutes if d <= sla_limit_minutes)
    rate = (passed / len(run_durations_minutes)) * 100.0
    return round(rate, 1)
""",
                "tests": """assert calculate_sla_compliance([30.0, 45.0, 59.0], 60.0) == 100.0
assert calculate_sla_compliance([30.0, 90.0], 60.0) == 50.0
assert calculate_sla_compliance([], 60.0) == 0.0
""",
                "explanation": "SLA 履约率是度量数据平台稳定性和交付可靠性的核心 KPI 指标。",
                "tags": ["SLA", "可观测性", "生产治理"]
            }
        ]
    }
}
