# -*- coding: utf-8 -*-
"""
Runnable Python Demos and Programming Exercises for dbt Analytics Engineering.
All code is self-contained and verified in standard Python / NumPy / Pandas.
"""

DBT_CHAPTER_CODE = {
    # ── Chapter 1: MDS 与分析工程全景 ──
    "dbt-c1": {
        "demos": {
            "dbt-l1-1": {
                "title": "现代 ELT 范式演进：数仓内聚合计算演示",
                "lang": "python",
                "code": """# 现代 ELT：原始数据直接入库，利用列式计算引擎就地转换
import pandas as pd
import numpy as np

# 1. 模拟源端原汁原味入库的 Raw 订单数据 (含各种字段类型与脏数据)
raw_orders = pd.DataFrame({
    'id': [101, 102, 103, 104, 105],
    'cust_id': ['C1', 'C2', 'C1', 'C3', 'C2'],
    'order_amt_cents': [15000, 24000, 8500, 9900, 31000],
    'status_code': ['1', '1', '0', '1', '2'], # 1: 已完成, 0: 退款, 2: 待支付
    'order_ts': ['2024-03-01 10:20:00', '2024-03-01 11:45:00', '2024-03-02 09:10:00', '2024-03-02 14:00:00', '2024-03-03 16:30:00']
})

print("=== [Staging 层转换] 格式清洗与类型标准化 ===")
stg_orders = raw_orders.copy()
stg_orders['order_id'] = stg_orders['id']
stg_orders['customer_id'] = stg_orders['cust_id']
stg_orders['amount_usd'] = stg_orders['order_amt_cents'] / 100.0
stg_orders['is_completed'] = stg_orders['status_code'] == '1'
stg_orders['ordered_at'] = pd.to_datetime(stg_orders['order_ts'])
stg_orders = stg_orders[['order_id', 'customer_id', 'amount_usd', 'is_completed', 'ordered_at']]
print(stg_orders)

print("\\n=== [Marts 层聚合] 客户商业指标计算 ===")
fct_customer_orders = stg_orders[stg_orders['is_completed']].groupby('customer_id').agg(
    total_orders=('order_id', 'count'),
    total_spend_usd=('amount_usd', 'sum'),
    avg_order_value=('amount_usd', 'mean')
).reset_index()

print(fct_customer_orders.round(2))
print("\\n✓ ELT 核心优势：原始数据完整保留在数仓，业务口径修改只需重跑模型，无需重新联系业务库抽取！")
"""
            },
            "dbt-l1-3": {
                "title": "dbt 声明式建模生命周期：SQL 编译与包装模拟",
                "lang": "python",
                "code": """# 模拟 dbt compile 将声明式 SELECT 查询包装为数据库 DDL
def dbt_compile_sql(model_name: str, select_sql: str, materialization: str = 'view') -> str:
    \"\"\"模拟 dbt 底层将用户的纯 SELECT 编译为特定物化方式的执行 SQL\"\"\"
    clean_sql = select_sql.strip().rstrip(';')
    if materialization == 'view':
        return f"-- [dbt compile: {model_name} (VIEW)]\\nCREATE OR REPLACE VIEW marts.{model_name} AS\\n{clean_sql};"
    elif materialization == 'table':
        return f"-- [dbt compile: {model_name} (TABLE)]\\nCREATE OR REPLACE TABLE marts.{model_name} AS\\n{clean_sql};"
    elif materialization == 'incremental':
        return f"-- [dbt compile: {model_name} (INCREMENTAL)]\\nMERGE INTO marts.{model_name} AS target\\nUSING ({clean_sql}) AS source\\nON target.id = source.id\\nWHEN MATCHED THEN UPDATE SET ...\\nWHEN NOT MATCHED THEN INSERT ...;"
    return clean_sql

user_sql = \"\"\"
SELECT 
    customer_id,
    COUNT(order_id) AS total_orders,
    SUM(amount) AS total_amount
FROM analytics.stg_orders
GROUP BY customer_id
\"\"\"

print(dbt_compile_sql('dim_customer_summary', user_sql, materialization='table'))
"""
            }
        },
        "exercises": [
            {
                "id": "dbt-c1-code-1",
                "type": "code",
                "difficulty": 2,
                "question": "【编程实战】实现 dbt 编译期 DDL 包装器：编写函数 `compile_dbt_model(model_name, select_sql, materialization)`。\n\n要求：\n1. 若 `materialization == 'view'`，返回格式：`CREATE OR REPLACE VIEW target_schema.{model_name} AS\\n{select_sql};`\n2. 若 `materialization == 'table'`，返回格式：`CREATE OR REPLACE TABLE target_schema.{model_name} AS\\n{select_sql};`\n3. 请确保清理末尾多余的分号与空白。",
                "starterCode": """def compile_dbt_model(model_name: str, select_sql: str, materialization: str = 'view') -> str:
    \"\"\"将 SELECT 转换为对应物化的 CREATE DDL\"\"\"
    clean_sql = select_sql.strip().rstrip(';')
    ___
""",
                "setupCode": "",
                "expectedOutput": "返回正确的 CREATE VIEW 或 CREATE TABLE DDL 语句",
                "answer": """def compile_dbt_model(model_name: str, select_sql: str, materialization: str = 'view') -> str:
    clean_sql = select_sql.strip().rstrip(';')
    if materialization == 'view':
        return f"CREATE OR REPLACE VIEW target_schema.{model_name} AS\\n{clean_sql};"
    elif materialization == 'table':
        return f"CREATE OR REPLACE TABLE target_schema.{model_name} AS\\n{clean_sql};"
    return clean_sql
""",
                "tests": """out_view = compile_dbt_model('stg_orders', 'SELECT * FROM raw_orders;', materialization='view')
assert 'CREATE OR REPLACE VIEW target_schema.stg_orders AS' in out_view, "View 语句包装有误"
assert out_view.endswith('SELECT * FROM raw_orders;'), "未包含正确的 SELECT 语句"

out_tbl = compile_dbt_model('dim_users', 'SELECT id, name FROM users', materialization='table')
assert 'CREATE OR REPLACE TABLE target_schema.dim_users AS' in out_tbl, "Table 语句包装有误"
""",
                "explanation": "dbt 的核心哲学就是让分析师只需编写纯粹声明式的 SELECT 查询，由 dbt 自动负责适配目标数仓的 DDL/DML 包装与管理。",
                "tags": ["dbt compile", "声明式建模", "DDL"]
            },
            {
                "id": "dbt-c1-code-2",
                "type": "code",
                "difficulty": 3,
                "question": "【编程实战】多环境 Schema 路由生成器：编写函数 `generate_schema_name(custom_schema, target_name, dev_prefix)`。\n\n规则：\n- 若 `target_name == 'prod'`：若提供了 `custom_schema`，则直接使用 `custom_schema`；若无则使用 `'analytics'`。\n- 若 `target_name != 'prod'`（如 dev/ci）：返回 `{dev_prefix}_{custom_schema}`（若无 custom_schema 则为 `{dev_prefix}_analytics`）。保证开发人员之间物理隔离！",
                "starterCode": """def generate_schema_name(custom_schema: str = None, target_name: str = 'dev', dev_prefix: str = 'dbt_alice') -> str:
    \"\"\"根据当前环境 target 动态计算最终的目标 Schema\"\"\"
    base = custom_schema.strip() if custom_schema else 'analytics'
    ___
""",
                "setupCode": "",
                "expectedOutput": "返回计算后的隔离 Schema 名称",
                "answer": """def generate_schema_name(custom_schema: str = None, target_name: str = 'dev', dev_prefix: str = 'dbt_alice') -> str:
    base = custom_schema.strip() if custom_schema else 'analytics'
    if target_name == 'prod':
        return base
    return f"{dev_prefix}_{base}"
""",
                "tests": """assert generate_schema_name('finance', target_name='prod') == 'finance', "生产指定 schema 应直接使用"
assert generate_schema_name(None, target_name='prod') == 'analytics', "生产未指定 schema 应为 analytics"
assert generate_schema_name('finance', target_name='dev', dev_prefix='dbt_bob') == 'dbt_bob_finance', "开发环境应带前缀隔离"
assert generate_schema_name(None, target_name='dev', dev_prefix='dbt_alice') == 'dbt_alice_analytics', "开发环境未指定应带前缀"
""",
                "explanation": "dbt 生产环境与个人开发环境物理隔离的关键就是 `generate_schema_name` 宏，它确保个人测试不会污染生产核心数据集市。",
                "tags": ["profiles.yml", "环境隔离", "宏"]
            }
        ]
    },

    # ── Chapter 2: Kimball 维度建模理论与三层数仓分层实战 ──
    "dbt-c2": {
        "demos": {
            "dbt-l2-3": {
                "title": "Kimball 代理键 (Surrogate Key) 生成算法模拟",
                "lang": "python",
                "code": """import hashlib

def generate_surrogate_key(values: list) -> str:
    \"\"\"模拟 dbt_utils.generate_surrogate_key 宏的底层 MD5 哈希实现\"\"\"
    # 统一将 None 处理为空白标记，避免 None 导致报错或误匹配
    clean_parts = ['_dbt_utils_surrogate_key_null_' if v is None else str(v).strip() for v in values]
    joined_str = "-".join(clean_parts)
    return hashlib.md5(joined_str.encode('utf-8')).hexdigest()

# 示例：业务主键可能来自多列，并且可能包含 NULL
key1 = generate_surrogate_key(['store_101', 'cust_8801', '2024-03-01'])
key2 = generate_surrogate_key(['store_101', 'cust_8801', '2024-03-02'])
key3 = generate_surrogate_key(['store_101', None, '2024-03-01'])

print("代理键 1:", key1)
print("代理键 2:", key2)
print("代理键 3 (含NULL安全):", key3)
print(f"长度固定: {len(key1)} 字符 16 进制哈希，屏蔽源系统自然键变更风险！")
"""
            }
        },
        "exercises": [
            {
                "id": "dbt-c2-code-1",
                "type": "code",
                "difficulty": 2,
                "question": "【编程实战】实现代理键生成函数：编写 `make_surrogate_key(*cols)`。\n\n要求：\n1. 接收任意数量的入参。\n2. 将所有入参转为字符串（若为 `None` 则转为 `'_dbt_null_'`），用 `|` 符号连接。\n3. 对连接后的字符串进行 MD5 哈希计算并返回 32 位十六进制字符串。",
                "starterCode": """import hashlib

def make_surrogate_key(*cols) -> str:
    \"\"\"多列哈希代理键生成函数\"\"\"
    ___
""",
                "setupCode": "",
                "expectedOutput": "返回 32 字符的 MD5 哈希字符串",
                "answer": """import hashlib

def make_surrogate_key(*cols) -> str:
    parts = ['_dbt_null_' if c is None else str(c) for c in cols]
    joined = "|".join(parts)
    return hashlib.md5(joined.encode('utf-8')).hexdigest()
""",
                "tests": """import hashlib
k1 = make_surrogate_key('order_1', 'user_2')
assert len(k1) == 32, "哈希长度应为 32 位"
k2 = make_surrogate_key('order_1', 'user_2')
assert k1 == k2, "相同入参应生成相同代理键"
k3 = make_surrogate_key('order_1', None)
assert k3 != k1, "不同入参代理键不同"
""",
                "explanation": "代理键（Surrogate Key）解耦了源系统的物理主键变动，保证数仓内部关联关系的永久稳定性。",
                "tags": ["Kimball", "代理键", "MD5"]
            },
            {
                "id": "dbt-c2-code-2",
                "type": "code",
                "difficulty": 2,
                "question": "【编程实战】数仓三层模型命名规范检测器：编写函数 `validate_dbt_model_name(layer, filename)`。\n\n规则：\n- 若 `layer == 'staging'`，文件名必须以 `stg_` 开头且包含双下划线 `__`（如 `stg_stripe__payments.sql`）。\n- 若 `layer == 'intermediate'`，文件名必须以 `int_` 开头。\n- 若 `layer == 'marts'`，文件名必须以 `dim_` 或 `fct_` 开头。\n符合规范返回 True，否则返回 False。",
                "starterCode": """def validate_dbt_model_name(layer: str, filename: str) -> bool:
    \"\"\"校验 dbt 推荐命名规范\"\"\"
    ___
""",
                "setupCode": "",
                "expectedOutput": "返回布尔值验证结果",
                "answer": """def validate_dbt_model_name(layer: str, filename: str) -> bool:
    if not filename.endswith('.sql'):
        return False
    name = filename[:-4]
    if layer == 'staging':
        return name.startswith('stg_') and '__' in name
    elif layer == 'intermediate':
        return name.startswith('int_')
    elif layer == 'marts':
        return name.startswith('dim_') or name.startswith('fct_')
    return False
""",
                "tests": """assert validate_dbt_model_name('staging', 'stg_stripe__charges.sql') == True
assert validate_dbt_model_name('staging', 'stg_charges.sql') == False, "staging 应包含 source__table 双下划线"
assert validate_dbt_model_name('intermediate', 'int_orders_aggregated.sql') == True
assert validate_dbt_model_name('marts', 'fct_orders.sql') == True
assert validate_dbt_model_name('marts', 'dim_customers.sql') == True
assert validate_dbt_model_name('marts', 'orders.sql') == False, "marts 必须以 dim_ 或 fct_ 命名"
""",
                "explanation": "严苛统一的命名规范是现代分析工程团队多人协作防混乱的生命线。",
                "tags": ["工程规范", "分层架构", "命名规范"]
            }
        ]
    },

    # ── Chapter 3: dbt 核心开发与项目组织工程化规范 ──
    "dbt-c3": {
        "demos": {
            "dbt-l3-3": {
                "title": "ref() 函数依赖解析与拓扑排序模拟",
                "lang": "python",
                "code": """import re
from collections import defaultdict, deque

# 模拟 dbt 解析 SQL 文件中的 {{ ref('...') }} 提取依赖树
models = {
    'stg_orders': 'SELECT * FROM {{ source(\"raw\", \"orders\") }}',
    'stg_payments': 'SELECT * FROM {{ source(\"raw\", \"payments\") }}',
    'int_order_payments': 'SELECT * FROM {{ ref(\"stg_orders\") }} JOIN {{ ref(\"stg_payments\") }}',
    'fct_orders': 'SELECT * FROM {{ ref(\"int_order_payments\") }}',
    'dim_customers': 'SELECT * FROM {{ ref(\"stg_orders\") }}'
}

def extract_refs(sql: str) -> list:
    return re.findall(r'ref\\([\"\\']([a-zA-Z0-9_]+)[\"\\']\\)', sql)

# 构建有向无环图 (DAG)
dag = defaultdict(list)
in_degree = {m: 0 for m in models}

for model, sql in models.items():
    refs = extract_refs(sql)
    for r in refs:
        dag[r].append(model)
        in_degree[model] += 1

# 拓扑排序计算编译顺序
queue = deque([m for m, deg in in_degree.items() if deg == 0])
execution_order = []

while queue:
    curr = queue.popleft()
    execution_order.append(curr)
    for downstream in dag[curr]:
        in_degree[downstream] -= 1
        if in_degree[downstream] == 0:
            queue.append(downstream)

print("提取的依赖关系:")
for m, sql in models.items():
    print(f"  {m} 依赖 -> {extract_refs(sql)}")

print("\\n✓ dbt 自动计算的拓扑执行顺序:")
print(" ➔ ".join(execution_order))
"""
            }
        },
        "exercises": [
            {
                "id": "dbt-c3-code-1",
                "type": "code",
                "difficulty": 3,
                "question": "【编程实战】解析 SQL 中的 `ref()` 引用：编写函数 `parse_dbt_refs(sql_content)`。\n\n要求：\n使用正则表达式精准捕获 SQL 中所有形如 `{{ ref('model_name') }}` 或 `{{ ref(\"model_name\") }}` 的被引用模型名称，返回去重后的列表（保持出现先后顺序）。",
                "starterCode": """import re

def parse_dbt_refs(sql_content: str) -> list:
    \"\"\"从 SQL 中提取所有 ref 引用模型名\"\"\"
    ___
""",
                "setupCode": "",
                "expectedOutput": "返回引用的模型名称列表",
                "answer": """import re

def parse_dbt_refs(sql_content: str) -> list:
    pattern = r"ref\\(\\s*['\\\"]([a-zA-Z0-9_]+)['\\\"]\\s*\\)"
    matches = re.findall(pattern, sql_content)
    seen = set()
    result = []
    for m in matches:
        if m not in seen:
            seen.add(m)
            result.append(m)
    return result
""",
                "tests": """sql = \"\"\"
SELECT o.id, p.amount 
FROM {{ ref('stg_orders') }} o
JOIN {{ ref("stg_payments") }} p ON o.id = p.order_id
WHERE o.id IN (SELECT id FROM {{ ref('stg_orders') }})
\"\"\"
refs = parse_dbt_refs(sql)
assert refs == ['stg_orders', 'stg_payments'], f"解析结果有误: {refs}"
""",
                "explanation": "dbt 正是通过对模型 SQL 文本进行静态词法解析提取 ref() 宏参数，从而在执行前构建出全图依赖关系。",
                "tags": ["ref", "DAG", "正则表达式"]
            },
            {
                "id": "dbt-c3-code-2",
                "type": "code",
                "difficulty": 2,
                "question": "【编程实战】source freshness 新鲜度告警检测：编写函数 `check_freshness(current_time, loaded_at, warn_hours=12, error_hours=24)`。\n\n规则：\n- 延迟时间 = (current_time - loaded_at) 的小时数。\n- 若延迟时间 <= warn_hours，返回 `'PASS'`。\n- 若 warn_hours < 延迟时间 <= error_hours，返回 `'WARN'`。\n- 若延迟时间 > error_hours，返回 `'ERROR'`。",
                "starterCode": """from datetime import datetime

def check_freshness(current_time: datetime, loaded_at: datetime, warn_hours: float = 12.0, error_hours: float = 24.0) -> str:
    \"\"\"评估源表数据新鲜度状态\"\"\"
    ___
""",
                "setupCode": "",
                "expectedOutput": "返回 PASS / WARN / ERROR",
                "answer": """from datetime import datetime

def check_freshness(current_time: datetime, loaded_at: datetime, warn_hours: float = 12.0, error_hours: float = 24.0) -> str:
    diff_seconds = (current_time - loaded_at).total_seconds()
    diff_hours = diff_seconds / 3600.0
    if diff_hours <= warn_hours:
        return 'PASS'
    elif diff_hours <= error_hours:
        return 'WARN'
    else:
        return 'ERROR'
""",
                "tests": """from datetime import datetime, timedelta
now = datetime(2024, 3, 2, 12, 0, 0)
t_pass = now - timedelta(hours=6)
t_warn = now - timedelta(hours=18)
t_err = now - timedelta(hours=30)

assert check_freshness(now, t_pass) == 'PASS'
assert check_freshness(now, t_warn) == 'WARN'
assert check_freshness(now, t_err) == 'ERROR'
""",
                "explanation": "source freshness 检测帮助数据团队在下游报表产出前第一时间感知源端抽取出错或延迟。",
                "tags": ["source freshness", "数据质量", "告警"]
            }
        ]
    },

    # ── Chapter 4: dbt 四大核心物化机制深度剖析与选型 ──
    "dbt-c4": {
        "demos": {
            "dbt-l4-4": {
                "title": "Ephemeral 物化：内联 CTE 字符串注入模拟",
                "lang": "python",
                "code": """# 模拟 dbt 编译时将 ephemeral 模型转换为 CTE 并内联注入到下游模型中
ephemeral_models = {
    'int_active_users': 'SELECT id, username FROM users WHERE is_active = true',
    'int_vip_orders': 'SELECT order_id, user_id, amount FROM orders WHERE amount > 500'
}

downstream_sql = \"\"\"
SELECT 
    u.username,
    COUNT(o.order_id) AS vip_order_count
FROM {{ ref('int_active_users') }} u
JOIN {{ ref('int_vip_orders') }} o ON u.id = o.user_id
GROUP BY 1;
\"\"\"

def compile_ephemeral(sql: str, ephemerals: dict) -> str:
    cte_blocks = []
    compiled = sql
    for name, cte_sql in ephemerals.items():
        placeholder = f"{{{{ ref('{name}') }}}}"
        if placeholder in compiled:
            cte_name = f"__dbt__cte__{name}"
            cte_blocks.append(f"{cte_name} AS (\\n  {cte_sql}\\n)")
            compiled = compiled.replace(placeholder, cte_name)
    
    prefix = "WITH " + ",\\n".join(cte_blocks) + "\\n"
    return prefix + compiled.strip()

print(compile_ephemeral(downstream_sql, ephemeral_models))
print("\\n✓ Ephemeral 物化在数仓中零物理建表开销，代码纯净内联展开！")
"""
            }
        },
        "exercises": [
            {
                "id": "dbt-c4-code-1",
                "type": "code",
                "difficulty": 2,
                "question": "【编程实战】物化方式智能决策树：编写函数 `choose_materialization(daily_rows, query_sla_seconds, is_time_series)`。\n\n规则：\n1. 若 `daily_rows < 100000`（10万以下小数据量）：若 `query_sla_seconds <= 2`，返回 `'table'`；否则返回 `'view'`（轻量优先）。\n2. 若 `daily_rows >= 100000`（大数据量）：\n   - 若 `is_time_series == True`（时间序列且数据量大），返回 `'incremental'`；\n   - 否则返回 `'table'`。",
                "starterCode": """def choose_materialization(daily_rows: int, query_sla_seconds: float, is_time_series: bool) -> str:
    \"\"\"根据数据规模与性能要求推荐物化方式\"\"\"
    ___
""",
                "setupCode": "",
                "expectedOutput": "返回 view / table / incremental",
                "answer": """def choose_materialization(daily_rows: int, query_sla_seconds: float, is_time_series: bool) -> str:
    if daily_rows < 100000:
        if query_sla_seconds <= 2:
            return 'table'
        return 'view'
    else:
        if is_time_series:
            return 'incremental'
        return 'table'
""",
                "tests": """assert choose_materialization(5000, 10.0, False) == 'view'
assert choose_materialization(5000, 1.0, False) == 'table'
assert choose_materialization(5000000, 5.0, True) == 'incremental'
assert choose_materialization(5000000, 5.0, False) == 'table'
""",
                "explanation": "物化选型是在存储成本、算力消耗与查询延迟三者之间的工程平衡。",
                "tags": ["物化选型", "成本优化", "性能调优"]
            }
        ]
    },

    # ── Chapter 5: 增量模型 (Incremental Models) 高级实操 ──
    "dbt-c5": {
        "demos": {
            "dbt-l5-1": {
                "title": "增量模型 MERGE 策略模拟：唯一键 UPSERT 更新",
                "lang": "python",
                "code": """import pandas as pd

# 目标表初始已有数据
target_table = pd.DataFrame([
    {'order_id': 101, 'status': 'pending', 'amount': 100.0, 'updated_at': '2024-03-01'},
    {'order_id': 102, 'status': 'completed', 'amount': 250.0, 'updated_at': '2024-03-01'}
])

# 今日新到达的增量数据 (包含 101 的状态更新，以及 103 的新订单)
incoming_batch = pd.DataFrame([
    {'order_id': 101, 'status': 'completed', 'amount': 100.0, 'updated_at': '2024-03-02'},
    {'order_id': 103, 'status': 'pending', 'amount': 80.0, 'updated_at': '2024-03-02'}
])

print("=== 目标表旧数据 ===")
print(target_table)

# 模拟 MERGE INTO ... ON target.order_id = source.order_id
# 1. 过滤掉目标表中将被更新的旧行
merged = target_table[~target_table['order_id'].isin(incoming_batch['order_id'])].copy()
# 2. 追加来自增量批次的新行和更新行
merged = pd.concat([merged, incoming_batch], ignore_index=True)

print("\\n=== MERGE 执行后目标表最新状态 ===")
print(merged)
print("\\n✓ 101 订单状态成功由 pending 变更为 completed，新订单 103 成功插入！")
"""
            }
        },
        "exercises": [
            {
                "id": "dbt-c5-code-1",
                "type": "code",
                "difficulty": 3,
                "question": "【编程实战】增量模型 Upsert 逻辑模拟：编写函数 `merge_incremental_data(target_records, incoming_records, unique_key)`。\n\n要求：\n1. `target_records` 与 `incoming_records` 均为由字典组成的列表。\n2. 若 `incoming_records` 中的记录在 `target_records` 中已存在相同 `unique_key`，则以 `incoming_records` 的新值覆盖旧值；\n3. 若不存在，则插入新记录；\n4. 返回更新后的记录列表（按 unique_key 升序排序）。",
                "starterCode": """def merge_incremental_data(target_records: list, incoming_records: list, unique_key: str) -> list:
    \"\"\"模拟增量 MERGE 操作\"\"\"
    ___
""",
                "setupCode": "",
                "expectedOutput": "返回更新合并后的列表",
                "answer": """def merge_incremental_data(target_records: list, incoming_records: list, unique_key: str) -> list:
    data_map = {r[unique_key]: dict(r) for r in target_records}
    for r in incoming_records:
        data_map[r[unique_key]] = dict(r)
    return sorted(data_map.values(), key=lambda x: x[unique_key])
""",
                "tests": """old = [{'id': 1, 'val': 'a'}, {'id': 2, 'val': 'b'}]
new = [{'id': 2, 'val': 'b_v2'}, {'id': 3, 'val': 'c'}]
res = merge_incremental_data(old, new, 'id')
assert len(res) == 3, "合并后行数应为 3"
assert res[1]['val'] == 'b_v2', "存在主键应被更新"
assert res[2]['id'] == 3, "新主键应被插入"
""",
                "explanation": "在 dbt 中，增量模型的 merge 策略依靠 unique_key 判定存在更新还是缺失插入，避免全量重算的昂贵开销。",
                "tags": ["incremental", "merge", "upsert"]
            }
        ]
    },

    # ── Chapter 6: Jinja 模板引擎、通用宏 (Macros) 与跨平台包 ──
    "dbt-c6": {
        "demos": {
            "dbt-l6-6": {
                "title": "动态数据透视 (Pivot) 宏生成器",
                "lang": "python",
                "code": """# 模拟 dbt 宏动态根据列值生成多行 SUM(CASE WHEN ...) 数据透视 SQL
def macro_pivot(column: str, values: list, agg: str = 'sum', value_col: str = 'amount') -> str:
    lines = []
    for val in values:
        lines.append(f"  {agg.upper()}(CASE WHEN {column} = '{val}' THEN {value_col} ELSE 0 END) AS {val}_{value_col}")
    return ",\\n".join(lines)

channels = ['alipay', 'wechat_pay', 'apple_pay', 'credit_card']
pivot_sql = macro_pivot(column='payment_method', values=channels, agg='sum', value_col='amount_usd')

full_query = f\"\"\"
SELECT 
  store_id,
{pivot_sql}
FROM marts.fct_orders
GROUP BY store_id;
\"\"\"

print("=== dbt 宏编译展开后的透视 SQL ===")
print(full_query.strip())
"""
            }
        },
        "exercises": [
            {
                "id": "dbt-c6-code-1",
                "type": "code",
                "difficulty": 2,
                "question": "【编程实战】实现通用数据透视 (Pivot) 宏：编写函数 `generate_pivot_sql(category_col, categories, measure_col)`。\n\n要求：\n返回由逗号分隔的 CASE WHEN 字符串列表。每个分类的格式为：\n`SUM(CASE WHEN {category_col} = '{cat}' THEN {measure_col} ELSE 0 END) AS {cat}_total`",
                "starterCode": """def generate_pivot_sql(category_col: str, categories: list, measure_col: str) -> str:
    \"\"\"生成动态透视 SQL 字符串\"\"\"
    ___
""",
                "setupCode": "",
                "expectedOutput": "返回逗号分隔的透视表达式",
                "answer": """def generate_pivot_sql(category_col: str, categories: list, measure_col: str) -> str:
    cases = [
        f"SUM(CASE WHEN {category_col} = '{cat}' THEN {measure_col} ELSE 0 END) AS {cat}_total"
        for cat in categories
    ]
    return ",\\n".join(cases)
""",
                "tests": """sql = generate_pivot_sql('status', ['paid', 'refunded'], 'amount')
assert "status = 'paid' THEN amount" in sql
assert "AS paid_total" in sql
assert "AS refunded_total" in sql
""",
                "explanation": "Jinja 宏的核心价值是消灭一切重复劳动，将 20 行容易写错的手工 CASE WHEN 缩减为一行优雅的宏调用。",
                "tags": ["Jinja", "Macro", "Pivot"]
            }
        ]
    },

    # ── Chapter 7: 测试与数据契约体系 ──
    "dbt-c7": {
        "demos": {
            "dbt-l7-1": {
                "title": "dbt 测试断言与违规数据检索引擎",
                "lang": "python",
                "code": """import pandas as pd

# 模拟目标模型数据
df = pd.DataFrame([
    {'order_id': 101, 'customer_id': 'C1', 'amount': 100},
    {'order_id': 102, 'customer_id': None, 'amount': 250}, # 违背 not_null
    {'order_id': 103, 'customer_id': 'C3', 'amount': -50}, # 违背金额大于0业务断言
    {'order_id': 101, 'customer_id': 'C4', 'amount': 80},  # 违背 unique(order_id)
])

print("=== 1. unique(order_id) 测试断言 ===")
dups = df[df.duplicated(subset=['order_id'], keep=False)]
print(f"检测结果: {'FAIL (发现重复行)' if len(dups) > 0 else 'PASS'}")
print(dups[['order_id', 'customer_id']])

print("\\n=== 2. not_null(customer_id) 测试断言 ===")
nulls = df[df['customer_id'].isnull()]
print(f"检测结果: {'FAIL (发现 NULL)' if len(nulls) > 0 else 'PASS'}")
print(nulls)

print("\\n✓ dbt test 底层黄金法则：查出 0 行为 PASS，查出大于 0 行为 FAIL！")
"""
            }
        },
        "exercises": [
            {
                "id": "dbt-c7-code-1",
                "type": "code",
                "difficulty": 2,
                "question": "【编程实战】relationships 引用完整性断言：编写函数 `test_relationships(child_records, parent_records, child_key, parent_key)`。\n\n要求：\n返回所有子表中无法在父表中找到对应主键的“孤儿记录”（违规脏数据列表）。若全部满足外键引用，返回空列表 `[]`。",
                "starterCode": """def test_relationships(child_records: list, parent_records: list, child_key: str, parent_key: str) -> list:
    \"\"\"检测外键孤儿记录\"\"\"
    ___
""",
                "setupCode": "",
                "expectedOutput": "返回孤儿违规记录列表",
                "answer": """def test_relationships(child_records: list, parent_records: list, child_key: str, parent_key: str) -> list:
    parent_keys = {p[parent_key] for p in parent_records if parent_key in p}
    orphans = [c for c in child_records if c.get(child_key) not in parent_keys]
    return orphans
""",
                "tests": """parents = [{'id': 1}, {'id': 2}]
children = [{'order_id': 101, 'user_id': 1}, {'order_id': 102, 'user_id': 3}]
orphans = test_relationships(children, parents, 'user_id', 'id')
assert len(orphans) == 1, "应发现 1 条孤儿记录"
assert orphans[0]['order_id'] == 102
""",
                "explanation": "relationships 测试保证了事实表中的所有外键必在维度表中存在，防止数据分析漏斗断裂。",
                "tags": ["relationships", "外键", "数据契约"]
            }
        ]
    },

    # ── Chapter 8: 快照 (Snapshots) 与缓慢变化维 (SCD Type 2) 工业级落地 ──
    "dbt-c8": {
        "demos": {
            "dbt-l8-1": {
                "title": "SCD Type 2 缓慢变化维版本演进模拟",
                "lang": "python",
                "code": """# 模拟 dbt snapshot 针对同一客户地址变迁的版本更新过程
history = [
    {'customer_id': 'C1001', 'city': '北京', 'dbt_valid_from': '2023-01-01', 'dbt_valid_to': '2024-06-15', 'dbt_is_current': False},
    {'customer_id': 'C1001', 'city': '上海', 'dbt_valid_from': '2024-06-15', 'dbt_valid_to': None, 'dbt_is_current': True}
]

def query_customer_at_date(customer_id: str, date_str: str) -> str:
    for h in history:
        if h['customer_id'] == customer_id:
            from_ok = h['dbt_valid_from'] <= date_str
            to_ok = h['dbt_valid_to'] is None or date_str < h['dbt_valid_to']
            if from_ok and to_ok:
                return h['city']
    return "未找到"

print("2023-05-20 时客户居住城市:", query_customer_at_date('C1001', '2023-05-20'))
print("2024-08-10 时客户居住城市:", query_customer_at_date('C1001', '2024-08-10'))
print("✓ SCD Type 2 完美还原历史任何时点的真实业务状态！")
"""
            }
        },
        "exercises": [
            {
                "id": "dbt-c8-code-1",
                "type": "code",
                "difficulty": 3,
                "question": "【编程实战】时态查询 (Point-in-Time Lookup)：编写函数 `lookup_scd_record(scd_records, entity_id, query_date)`。\n\n规则：\n找到满足 `r['id'] == entity_id` 且 `r['dbt_valid_from'] <= query_date` 且 (`r['dbt_valid_to'] is None` 或 `query_date < r['dbt_valid_to']`) 的那条记录并返回字典；若无匹配返回 `None`。",
                "starterCode": """def lookup_scd_record(scd_records: list, entity_id: str, query_date: str):
    \"\"\"点对点时态查询\"\"\"
    ___
""",
                "setupCode": "",
                "expectedOutput": "返回匹配的历史快照记录字典",
                "answer": """def lookup_scd_record(scd_records: list, entity_id: str, query_date: str):
    for r in scd_records:
        if r['id'] == entity_id:
            f = r['dbt_valid_from'] <= query_date
            t = r['dbt_valid_to'] is None or query_date < r['dbt_valid_to']
            if f and t:
                return r
    return None
""",
                "tests": """records = [
    {'id': 'u1', 'tier': 'standard', 'dbt_valid_from': '2023-01-01', 'dbt_valid_to': '2023-07-01'},
    {'id': 'u1', 'tier': 'vip', 'dbt_valid_from': '2023-07-01', 'dbt_valid_to': None}
]
assert lookup_scd_record(records, 'u1', '2023-03-01')['tier'] == 'standard'
assert lookup_scd_record(records, 'u1', '2023-08-01')['tier'] == 'vip'
assert lookup_scd_record(records, 'u1', '2022-01-01') is None
""",
                "explanation": "Point-in-Time 查询是基于 SCD Type 2 准确还原任何历史交易发生时属性的核心方法。",
                "tags": ["SCD Type 2", "Snapshot", "时态查询"]
            }
        ]
    },

    # ── Chapter 9: 指标语义层 (Semantic Layer) 与反向 ETL 闭环 ──
    "dbt-c9": {
        "demos": {
            "dbt-l9-5": {
                "title": "防扇出 (Fan-out) 安全聚合计算演示",
                "lang": "python",
                "code": """import pandas as pd

# 主订单表 (1 笔订单 1000 元)
orders = pd.DataFrame([{'order_id': 1, 'order_amount': 1000.0}])
# 子商品表 (该订单包含 3 个子项)
items = pd.DataFrame([
    {'item_id': 101, 'order_id': 1, 'item_name': '键盘'},
    {'item_id': 102, 'order_id': 1, 'item_name': '鼠标'},
    {'item_id': 103, 'order_id': 1, 'item_name': '耳机'},
])

# 错误做法：直接大宽表 JOIN 导致订单行膨胀
bad_joined = orders.merge(items, on='order_id')
print("❌ 错误 JOIN 导致订单行复制为 3 行:")
print(bad_joined[['order_id', 'item_id', 'order_amount']])
print("此时直接 SUM(order_amount):", bad_joined['order_amount'].sum(), "(虚增了 300%!)")

# 语义层做法：先在各自粒度独立预聚合，再安全关联
orders_metric = orders['order_amount'].sum()
items_count = len(items)
print("\\n✅ MetricFlow 语义层先聚合后对齐:")
print(f"总营收: ¥{orders_metric}, 商品项总数: {items_count}")
"""
            }
        },
        "exercises": [
            {
                "id": "dbt-c9-code-1",
                "type": "code",
                "difficulty": 2,
                "question": "【编程实战】避免扇出虚增的安全度量聚合：编写函数 `safe_metric_calc(orders_list, items_list)`。\n\n数据结构：\n- `orders_list`: `[{'order_id': 1, 'revenue': 1000}, ...]`\n- `items_list`: `[{'item_id': 101, 'order_id': 1}, ...]`\n\n要求：\n返回字典 `{'total_revenue': ..., 'total_items': ...}`，确保即便 orders 和 items 存在 1:N 关系，`total_revenue` 也绝不发生重复相加膨胀！",
                "starterCode": """def safe_metric_calc(orders_list: list, items_list: list) -> dict:
    \"\"\"在正确粒度上独立计算指标并汇聚\"\"\"
    ___
""",
                "setupCode": "",
                "expectedOutput": "返回准确无虚增的度量字典",
                "answer": """def safe_metric_calc(orders_list: list, items_list: list) -> dict:
    # 保证在 orders 粒度上去重或直接求和
    unique_orders = {o['order_id']: o['revenue'] for o in orders_list}
    tot_rev = sum(unique_orders.values())
    tot_items = len(items_list)
    return {'total_revenue': tot_rev, 'total_items': tot_items}
""",
                "tests": """orders = [{'order_id': 1, 'revenue': 1000}]
items = [{'item_id': 101, 'order_id': 1}, {'item_id': 102, 'order_id': 1}, {'item_id': 103, 'order_id': 1}]
res = safe_metric_calc(orders, items)
assert res['total_revenue'] == 1000, "订单金额绝不能膨胀为 3000"
assert res['total_items'] == 3
""",
                "explanation": "指标语义层（如 MetricFlow）最大的技术护城河就是通过先聚合后关联的查询下推，从根源上杜绝多对多关联引发的指标虚增。",
                "tags": ["语义层", "扇出陷阱", "指标治理"]
            }
        ]
    },

    # ── Chapter 10: 生产级 CI/CD 自动化部署、环境隔离与 Slim CI 提速 ──
    "dbt-c10": {
        "demos": {
            "dbt-l10-3": {
                "title": "Slim CI 状态比较算法 (state:modified+) 模拟",
                "lang": "python",
                "code": """from collections import defaultdict, deque

# 生产环境模型血缘与哈希 (上周构建)
prod_models = {
    'stg_users': {'hash': 'a1b2', 'deps': []},
    'stg_orders': {'hash': 'c3d4', 'deps': []},
    'int_order_items': {'hash': 'e5f6', 'deps': ['stg_orders']},
    'fct_orders': {'hash': 'g7h8', 'deps': ['int_order_items', 'stg_users']},
    'dim_users': {'hash': 'i9j0', 'deps': ['stg_users']}
}

# 当前 PR 修改了 int_order_items (哈希发生变更)
pr_models = dict(prod_models)
pr_models['int_order_items'] = {'hash': 'CHANGED_9999', 'deps': ['stg_orders']}

# 1. 找出直接变更模型
modified = [m for m in pr_models if pr_models[m]['hash'] != prod_models[m]['hash']]

# 2. 递归查找下游依赖 (state:modified+)
downstream_graph = defaultdict(list)
for m, info in pr_models.items():
    for parent in info['deps']:
        downstream_graph[parent].append(m)

to_run = set(modified)
queue = deque(modified)
while queue:
    curr = queue.popleft()
    for child in downstream_graph[curr]:
        if child not in to_run:
            to_run.add(child)
            queue.append(child)

print("全仓模型数:", len(prod_models))
print("PR 修改模型:", modified)
print("Slim CI 最终仅需构建 (state:modified+):", list(to_run))
print("✓ 节省构建模型数:", len(prod_models) - len(to_run), "提速 60% 以上！")
"""
            }
        },
        "exercises": [
            {
                "id": "dbt-c10-code-1",
                "type": "code",
                "difficulty": 3,
                "question": "【编程实战】实现 Slim CI 依赖影响分析器：编写函数 `get_slim_ci_models(manifest_prod, manifest_pr)`。\n\n入参格式：\n字典 `{'model_name': {'hash': '...', 'deps': ['parent_a', ...]}}`\n\n要求：\n1. 找出在 PR 中 hash 与生产不一致的模型作为直接修改模型；\n2. 遍历其全部直接与间接下游模型（即 `state:modified+`）；\n3. 返回去重后的需构建模型列表集合。",
                "starterCode": """from collections import defaultdict, deque

def get_slim_ci_models(manifest_prod: dict, manifest_pr: dict) -> set:
    \"\"\"计算 state:modified+ 集合\"\"\"
    ___
""",
                "setupCode": "",
                "expectedOutput": "返回需构建的模型集合",
                "answer": """from collections import defaultdict, deque

def get_slim_ci_models(manifest_prod: dict, manifest_pr: dict) -> set:
    modified = [m for m in manifest_pr if manifest_pr[m].get('hash') != manifest_prod.get(m, {}).get('hash')]
    downstream = defaultdict(list)
    for m, info in manifest_pr.items():
        for p in info.get('deps', []):
            downstream[p].append(m)
    
    result = set(modified)
    queue = deque(modified)
    while queue:
        curr = queue.popleft()
        for child in downstream[curr]:
            if child not in result:
                result.add(child)
                queue.append(child)
    return result
""",
                "tests": """prod = {
    'm1': {'hash': 'h1', 'deps': []},
    'm2': {'hash': 'h2', 'deps': ['m1']},
    'm3': {'hash': 'h3', 'deps': []}
}
pr = {
    'm1': {'hash': 'h1_changed', 'deps': []},
    'm2': {'hash': 'h2', 'deps': ['m1']},
    'm3': {'hash': 'h3', 'deps': []}
}
res = get_slim_ci_models(prod, pr)
assert res == {'m1', 'm2'}, f"需构建集合有误: {res}"
""",
                "explanation": "Slim CI 仅对当前 PR 涉及改动及其下游构建测试，将数仓构建成本与时间缩减高达 95% 以上。",
                "tags": ["Slim CI", "state:modified+", "CI/CD"]
            }
        ]
    }
}
