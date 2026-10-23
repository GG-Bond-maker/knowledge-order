# -*- coding: utf-8 -*-
"""
dbt Analytics Engineering - Chapter 2: Kimball Dimensional Modeling & Data Warehouse Standards
"""

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_2():
    c2_lessons = [
        lesson(
            "dbt-l2-1",
            "维度建模核心哲学：为分析查询性能与人类直觉理解而设计",
            """### 一、数仓界的世纪争论：Kimball 维度建模 vs Inmon 规范化
在数据仓库领域，存在两大历史学派：
1. **比尔·恩门 (Bill Inmon) 的企业信息工厂 (CIF)**：
   - 核心思想：自顶向下 (Top-down)。以**第三范式 (3NF)** 构建中央企业级数据仓库 (EDW)，极度强调消除数据冗余；
   - 痛点：为了查一个销售分析报表，业务分析师需要同时进行 15 张高度规范化小表的深层 JOIN！查询极其复杂缓慢，非资深技术人员根本无法理解表结构。
2. **拉尔夫·金博尔 (Ralph Kimball) 的维度建模 (Dimensional Modeling)**：
   - 核心思想：自底向上 (Bottom-up)。**以商业过程和业务部门需求为中心**，将数据明确解构为两大核心角色：
     - **事实 (Facts)**：业务过程中发生的、通常可度量计量的数字事件（如订单金额、点击次数、退款件数）；
     - **维度 (Dimensions)**：描述业务事件发生时的上下文环境（**谁在什么时间、什么地点、通过什么渠道、购买了什么商品**，即 Who, When, Where, What, Why, How）。
   - **两大最高宗旨**：
     - **极速分析性能**：减少 JOIN 层级，迎合现代 OLAP 引擎；
     - **人类直觉理解**：业务人员无需懂复杂关联，直接看字段名就能自助拖拽分析。

### 二、现代数据栈 (MDS) 对 Kimball 模型的坚守与升华
尽管现代云数仓拥有惊人的海量算力，有人曾宣称“有了 Snowflake 就不需要维度建模了，直接查大单表即可”；但在实践中，这已经被证明是极其昂贵的错误观点：
- 缺乏维度建模的数仓，指标口径混乱不堪，相同的“活跃用户”在十个宽表里有十种计算逻辑；
- **Kimball 的“总线矩阵 (Bus Matrix)”与“一致性维度 (Conformed Dimensions)”理念，依然是当今 dbt 分析工程不可动摇的黄金灵魂**！""",
            difficulty=1,
            tips=[
                tip("维度与事实的辨析口诀", "能放进 `SUM()`, `AVG()` 等聚合函数里的通常是**事实度量 (Metrics)**；用来放进 `GROUP BY` 或 `WHERE` 过滤条件里的通常是**维度属性 (Attributes)**。")
            ],
            demos=[
                demo("Kimball 模型核心切片", "度量(事实): 销售额 599 元 | 维度上下文: 时间=2026-10-23, 用户=张三, 店铺=朝阳旗舰店, 品类=电子数码")
            ]
        ),
        lesson(
            "dbt-l2-2",
            "事实表 (Fact Table) 深度解构：度量类型与三大经典形态",
            """### 一、事实表的解剖结构
事实表是维度模型的核心骨架，记录了特定商业过程的微观度量。
典型事实表由两部分字段组成：
1. **外键字段 (Foreign Keys)**：指向各个关联维度的代理键（如 `customer_key`, `date_key`, `product_key`, `store_key`）；
2. **数值度量字段 (Numeric Measures)**：如 `quantity_sold`, `gross_revenue`, `discount_amount`, `tax_amount`。

### 二、度量值的三大可加性分类
- **完全可加度量 (Additive)**：跨越所有维度均可求和（如销售额、订单件数；按时间、地区、店铺相加均具备明确经济含义）；
- **半可加度量 (Semi-additive)**：只能跨越某些维度求和，但在**时间维度上不可相加**（如银行账户余额、仓库库存件数；不能把 30 天的每日结余相加，时间维度上只能取月末数或均值）；
- **不可加度量 (Non-additive)**：跨越任何维度都不能直接相加（如毛利率、单价、转化率；必须由基础分子和分母求和后再相除）。

### 三、事实表的三大经典形态
1. **事务事实表 (Transaction Fact Table)**：
   - 记录最底层的单次离散事件（如：一笔刷卡支付、一次用户点击、一次退款申请）；
   - 产生时间：实时或近实时；行级数据一旦写入，永久不可更改 (Append-only)；数据量最大、粒度最细。
2. **周期快照事实表 (Periodic Snapshot Fact Table)**：
   - 按照固定的时间周期（如每日、每月）定期对业务状态进行拍照切片（如每日银行账户结余快照表、每日商品在库库存表）；
   - 即使当天没有发生交易，也会记录一条包含当前期末结余状态的快照行。
3. **累积快照事实表 (Accumulating Snapshot Fact Table)**：
   - 用于跟踪具有明确起止节点、经历多个阶段状态流转的长周期业务流程（如电商履约流程：下单 -> 支付 -> 拣货出库 -> 快递揽收 -> 签收评价）；
   - 一行对应一个完整实体生命周期，包含多个关键里程碑的时间戳字段；每当订单流转到下一个里程碑时，更新该行对应的时间戳。""",
            difficulty=2,
            tips=[
                tip("不要在事实表存百分比", "永远不要在事实表存储不可加的百分比（如毛利率 25%）。必须在事实表分别存储可加的【毛利金额】与【销售收入】，在最上层 BI 或 dbt 语义层通过 `SUM(毛利)/SUM(收入)` 动态求得。")
            ]
        ),
        lesson(
            "dbt-l2-3",
            "维度表 (Dimension Table) 深度解构：代理键、自然键与退化维度",
            """### 一、维度表的作用：为数据赋予丰富的商业上下文
如果说事实表代表了“动词（发生了什么商业事件）”，那么维度表就代表了“名词（围绕事件的相关主体）”。
维度表通常包含大量宽阔的、低基数的文本属性（如用户的性别、年龄段、会员等级、所在省市、信用评分）。

### 二、代理键 (Surrogate Key) vs 自然键 (Natural Key)
这是数仓建模中极为关键的工程规范：
1. **自然键 (Natural Key / Business Key)**：
   - 源业务系统生成的原始主键（如 MySQL 用户表中的自增 `user_id = 10086`，或身份证号）；
   - **痛点**：跨业务系统融合时容易冲突（CRM 系统的 10086 和电商系统的 10086 指的不是同一个人）；业务库可能存在合并不慎或重置 ID 的风险。
2. **代理键 (Surrogate Key, SK)**：
   - **数据仓库内部自行生成、无任何业务含义的人造唯一主键**（如自增整数，或由自然键和生效时间哈希生成的 MD5/SHA256 哈希值）；
   - **核心价值**：
     - 解耦源系统主键变动风险；
     - 支撑缓慢变化维 (SCD Type 2)，使同一自然键在不同历史时期可以对应不同的代理键！
     - 统一跨源异构数据（用统一的哈希代理键将多系统客户关联在一处）。

### 三、退化维度 (Degenerate Dimension, DD)
在实际业务中，有些重要的维度编码（如**订单号 order_number**、发票流水号 invoice_no、运单号 tracking_no）：
- 它们具有高唯一性基数，但除了编号本身之外，没有任何额外的描述性文本属性；
- **设计实践**：无需大费周章单独建一张空洞的维度表，而是**直接将其保留在事实表中**。这种寄生在事实表中的标识符被称为**退化维度**，在钻取排查底层具体单据时极其实用。""",
            difficulty=2,
            tips=[
                tip("dbt 生成代理键的利器", "在 dbt 中，推荐使用 `dbt_utils.generate_surrogate_key(['source_system', 'user_id'])` 宏直接生成基于多字段哈希的标准化代理键。")
            ]
        ),
        lesson(
            "dbt-l2-4",
            "星型模型 (Star Schema) vs 雪花模型 (Snowflake Schema)",
            """### 一、星型模型 (Star Schema)：分析领域的王者架构
- **物理形态**：以一张巨大的事实表居于中心，四周直接辐射连接若干张反规范化 (Denormalized) 的维度表，形状如同璀璨的星芒；
- **核心特征**：
  - 维度表是**高度反规范化**的（允许存在字段适度冗余）；例如在 `dim_products` 维度表中，直接包含 `category_name`, `category_code`, `department_name`，而不是将品类和部门单独拆分建表；
  - **最大优势**：任何多维分析查询，只需要事实表与各个维度表进行**单层一级 JOIN**（一次 JOIN 即可拉取所有属性），查询路径极短，OLAP 执行计划极其高效！

### 二、雪花模型 (Snowflake Schema)：学术范式与过度规范化
- **物理形态**：将星型模型的维度表进一步按照第三范式 (3NF) 深度规范化分解，形成层层嵌套的外挂附表（如 `dim_products` -> `dim_subcategories` -> `dim_categories` -> `dim_departments`），拓扑结构形如雪花的分叉结晶；
- **优点**：彻底消除了维度表内部的文本冗余，节约了微量磁盘存储空间；
- **巨大缺陷**：为了查一个简单的部门销售总额，查询引擎必须进行多达 4~6 层深度的连环嵌套 JOIN！这在海量数据分析场景下极易导致执行计划爆炸，且极度反直觉，业务人员编写 SQL 时极度痛苦。

| 对比维度 | 星型模型 (Star Schema) | 雪花模型 (Snowflake Schema) |
| :--- | :--- | :--- |
| **范式化程度** | 反规范化 (Denormalized) | 高度规范化 (3NF Normalized) |
| **JOIN 复杂度** | 极低（1 层一级关联） | 极高（多层级联关联） |
| **查询性能** | **极快（OLAP 首选，最贴合现代数仓）** | 较慢（多表关联消耗算力） |
| **人类易用性** | **直观简单，小白分析师也能轻松看懂** | 复杂抽象，必须熟悉复杂 ER 关系 |
| **存储开销** | 略多（但现代列存压缩已将其抹平） | 极少（传统昂贵存储时代的妥协产物） |

### 三、现代数仓的终极准则：拥抱星型模型
在现代云数仓算力和存储成本环境下，**绝对优先选择星型模型**！不要为了省几兆字节存储空间而去搞雪花模型，开发效率和查询时延的收益远高于微乎其微的冗余成本。""",
            difficulty=2,
            tips=[
                tip("大宽表 (OBT, One Big Table)", "在某些超高性能即席查询场景下，甚至可以把星型模型的事实表和维度表完全预计算打平为一张'大宽表 (OBT)'。但星型模型依然是兼顾存储、灵活性与维护成本的最佳平衡中枢。")
            ]
        ),
        lesson(
            "dbt-l2-5",
            "事实表粒度 (Grain) 原则：数仓建模的第一戒律",
            """### 一、什么是事实表的粒度 (Grain)？
Kimball 强调：“在确定任何事实表的字段之前，必须用一段极其严谨的自然语言，准确定义该事实表**单行记录 (One Row) 到底代表什么真实物理事件**。”
这就是事实表的**粒度 (Grain)**！

### 二、典型电商粒度案例辨析
假设我们在设计一张电商订单事实表，以下三种粒度存在天壤之别：
1. **粒度 A：每个订单一行 (One row per order)**：
   - 字段包含：`order_id, user_id, order_time, total_amount, shipping_fee`；
   - 无法回答的问题：用户在这一单里分别买了哪些具体商品？每个商品的购买数量和单价是多少？
2. **粒度 B：每个订单明细行一行 (One row per order line item)**：
   - 字段包含：`order_id, line_number, product_id, quantity, unit_price, line_total_amount`；
   - 能够完美回答：任何具体商品的购买细节，同时通过 `SUM(line_total_amount)` 向上卷折求和可还原整单金额。
3. **粒度 C：每个订单每件商品每天在仓履约变动一行**：
   - 属于物流累积履约过程的细粒度追踪。

### 三、粒度设计的三大铁律
1. **永远优先从最原子化细粒度 (Atomic Grain) 开始构建**：
   - 原子粒度数据具备最大的灵活性和抗风险能力。原子数据可以向任何粗粒度自由卷折汇总，但如果底模只设计了粗粒度，永远无法下钻到细粒度细节；
2. **绝对严禁在同一张事实表中混杂不同粒度的度量！**
   - 常见灾难案例：在订单明细行事实表（粒度B）中，每一行都填上整单的运费（如整单运费 10 元，该单有 3 个商品，每一行都填 10 元）；
   - 后果：当分析师统计 `SUM(shipping_fee)` 时，运费被重复累加了 3 次，算出 30 元虚假运费！
   - 规范做法：运费作为整单度量，要么只分摊到各行（按金额比例），要么保留在订单头级别事实表中。""",
            difficulty=3,
            tips=[
                tip("粒度陈述必须写在模型文档中", "在 dbt 的 `models/.../fct_orders.yml` 中，描述的第一句话必须是：'Grain: One record per order line item.'，让全团队任何阅读代码的人一目了然。")
            ]
        ),
        lesson(
            "dbt-l2-6",
            "缓慢变化维 (SCD, Slowly Changing Dimensions) 深度演进",
            """### 一、现实世界的挑战：维度属性随时间改变
在源业务数据库中，现实实体是动态变化的：
- 用户“张三”在 2025 年的收货地址是“北京市朝阳区”，2026 年工作变动搬家到了“上海市浦东新区”；
- 业务库 MySQL 执行了：`UPDATE users SET city = '上海市' WHERE id = 101;`
- **严峻问题**：当我们要复盘统计“2025 年北京市朝阳区的总购买力”时，张三在 2025 年购买的 5 万元订单，到底该算在北京还是算在上海？
这就是经典的数据仓库**缓慢变化维 (SCD, Slowly Changing Dimensions)** 课题！

### 二、四大经典 SCD 策略全景
1. **SCD Type 0（保留原始状态，永不更新）**：
   - 典型场景：用户的出生日期、原始注册渠道；历史永远不随现实变更。
2. **SCD Type 1（直接覆盖重写，不保留历史）**：
   - 做法：新值直接覆盖旧值，如直接把城市改为上海；
   - 优缺点：实现极其简单、存储最省；**但历史真相彻底灰飞烟灭**，历史报表发生不可逆漂移（张三 2025 年的历史订单在今日重跑报表时被错误归入上海）。
3. **SCD Type 2（保留完整历史版本，行业标杆）**：
   - 做法：当维度发生变更时，**不修改旧记录，而是新增一行记录**，并引入版本控制元数据字段：
     - `dbt_valid_from`（当前版本生效起始时间戳）；
     - `dbt_valid_to`（当前版本失效时间戳；当前最新版本为 `NULL`）；
     - `is_current`（是否为当前最新版本：TRUE/FALSE）；
     - 为每个版本生成不同的独立**代理键 (Surrogate Key)**！
   - 事实表通过当时的时间戳关联到张三对应生效的历史代理键，2025年的单据归属北京，2026年之后的单据归属上海，**历史与现状两全其美！**
4. **SCD Type 3（新增字段保留前值）**：
   - 在同单行中增加 `previous_city` 字段，只能保留最近一次历史，无法应对多次变迁，工业界较少使用。""",
            difficulty=3,
            tips=[
                tip("dbt 对 SCD Type 2 的降维打击", "在传统数仓中编写 SCD Type 2 的 SQL 合并脚本极其痛苦冗长；而 dbt 提供了原生的 `dbt snapshot`（快照）命令，只需声明主键和跟踪字段，dbt 自动在底层为你维护 Type 2 全生命周期！")
            ]
        ),
        lesson(
            "dbt-l2-7",
            "算例拆解与电商订单流星型维度建模自查清单",
            """### 一、经典电商全流程星型维度建模完整算例
**【业务场景】**：
某母婴跨境电商，用户下单购买商品，存在优惠券抵扣、退换货以及用户地址变迁。
我们需要为其设计规范的分析级星型数仓模型。

**【第一步：业务过程与粒度声明】**：
- 商业过程：用户在线下单并支付；
- 事实表声明：`fct_order_items`（订单商品明细事实表）；
- **粒度定义：每个订单中的每一个商品行项记为一行 (One row per line item per order)**。

**【第二步：维度识别与设计】**：
1. `dim_customers`（用户维度表，采用 SCD Type 2）：
   - 代理键：`customer_sk` (如 `MD5(customer_id || valid_from)`)；
   - 自然键：`customer_id`；
   - 属性：`customer_name`, `gender`, `province`, `city`, `lifecycle_segment`, `valid_from`, `valid_to`, `is_current`；
2. `dim_products`（商品维度表）：
   - 代理键：`product_sk`；自然键：`product_id`；
   - 属性：`product_name`, `brand_name`, `category_l1`, `category_l2`, `unit_cost_price`；
3. `dim_dates`（日期时间维度表）：
   - 代理键：`date_day` (如 2026-10-23)；
   - 属性：`day_of_week`, `is_weekend`, `month_name`, `quarter_name`, `is_holiday`；
4. `dim_promotions`（促销活动维度表）：
   - 代理键：`promotion_sk`；属性：`campaign_name`, `discount_type`。

**【第三步：事实表度量设计 (`fct_order_items`)】**：
- **外键区**：`customer_sk`, `product_sk`, `order_date_day`, `promotion_sk`；
- **退化维度区**：`order_id`, `order_line_number`；
- **完全可加数值度量区**：
  - `quantity`（购买件数）；
  - `gross_amount`（商品总原价 = 数量 × 单价）；
  - `discount_amount`（优惠抵扣分摊金额）；
  - `net_amount`（实付净额 = 原价 - 优惠）；
  - `cost_amount`（商品成本总额 = 数量 × 进价成本）；
  - `margin_amount`（毛利额 = 实付净额 - 成本总额）。

---
### 二、Kimball 维度建模合规性自查清单
1. [ ] **粒度纯正**：事实表是否拥有明确一致的一句话粒度定义，杜绝混淆整单与明细行？
2. [ ] **键分离**：维度表是否为业务提供了专属代理键，避免直接暴露源系统业务键？
3. [ ] **可加性检查**：事实表中是否仅存储可加金额/数量，将所有百分比比率推迟至语义层计算？
4. [ ] **历史追溯**：对于需要追溯历史地域变动的核心实体，是否规划了 SCD Type 2 方案？""",
            difficulty=3,
            tips=[
                tip("总线矩阵的威力", "当商品维度表 `dim_products` 既能连接订单事实表 `fct_order_items`，又能连接库存事实表 `fct_inventory_snapshots` 时，它就成为了'一致性维度 (Conformed Dimension)'，能够支撑跨业务部门的联合指标计算！")
            ]
        )
    ]

    c2_exercises = [
        single_choice(
            "dbt-c2-e1",
            "在 Ralph Kimball 的经典维度建模理论中，事实表 (Fact Table) 与维度表 (Dimension Table) 的核心分工原则是：",
            [
                {"label": "事实表记录特定商业过程发生的可度量数值事件（动词），维度表提供描述该事件发生时的丰富上下文属性（名词环境：何时、何地、何人、何物）", "value": "A"},
                {"label": "事实表只用来存放公司员工的花名册与生日，维度表用来存放数据库管理员的登录密码", "value": "B"},
                {"label": "事实表只包含纯文本字符串，维度表只包含纯浮点数", "value": "C"},
                {"label": "事实表必须满足第三范式彻底消除冗余，维度表禁止进行任何索引构建", "value": "D"},
            ],
            "A",
            "事实表存储业务度量数据（如销售额、订单量），通过外键连接各个维度表；维度表存储丰富的切片过滤上下文（如用户、商品、门店、时间）。",
            difficulty=1,
            related_lesson_id="dbt-l2-1",
            tags=["Kimball", "维度事实分工", "数仓核心概念"],
        ),
        single_choice(
            "dbt-c2-e2",
            "在设计数仓度量指标时，下列哪一项度量属于典型的‘半可加度量 (Semi-additive Measure)’？",
            [
                {"label": "银行账户每日结算余额（或仓库每日库存量）—— 可以跨越用户、支行、品类维度相加，但绝对不能在时间维度上跨日期求和", "value": "A"},
                {"label": "电商订单的商品实付销售金额", "value": "B"},
                {"label": "超市收银台刷卡销售的商品件数", "value": "C"},
                {"label": "全店商品的平均毛利率百分比", "value": "D"},
            ],
            "A",
            "银行账户余额或库存量属于典型的半可加度量：在时间维度上相加毫无经济意义（不能把连续30天的每日余额加总当成月收入），但在地域、支行等其他维度可正常求和。B、C 是完全可加，D 是不可加。",
            difficulty=2,
            related_lesson_id="dbt-l2-2",
            tags=["度量分类", "半可加度量", "可加性分析"],
        ),
        single_choice(
            "dbt-c2-e3",
            "在现代云数仓架构中，相比于雪花模型 (Snowflake Schema)，星型模型 (Star Schema) 被业界几乎一致奉为优先推荐架构的最主要技术原因是：",
            [
                {"label": "星型模型在维度表内部进行了适度反规范化，使分析查询只需通过单层一级 JOIN 即可获取全部上下文，查询路径极短且完全贴合现代列存引擎的高效并发处理", "value": "A"},
                {"label": "雪花模型已经被国际 SQL 标准委员会彻底禁止在关系型数据库中使用", "value": "B"},
                {"label": "星型模型能够使磁盘存储占用减少 99%", "value": "C"},
                {"label": "雪花模型只能支持最多 1000 行记录的小型数据集", "value": "D"},
            ],
            "A",
            "雪花模型为了消除微量存储冗余进行了过度规范化，导致分析查询需要进行多层深度的嵌套级联 JOIN，算力开销巨大且易错。星型模型一层 JOIN 即可满足分析，极为高效简单。",
            difficulty=2,
            related_lesson_id="dbt-l2-4",
            tags=["星型模型", "雪花模型", "架构对比"],
        ),
        single_choice(
            "dbt-c2-e4",
            "在电商订单事实表中，‘订单编号 (order_number)’通常具备唯一的单号标识，但除单号本身外并无其他复杂的描述性属性。在维度建模中，这种直接寄生并保存在事实表中的标识符被称为：",
            [
                {"label": "退化维度 (Degenerate Dimension)", "value": "A"},
                {"label": "缓慢变化维 Type 4", "value": "B"},
                {"label": "代理键 (Surrogate Key)", "value": "C"},
                {"label": "一致性事实", "value": "D"},
            ],
            "A",
            "退化维度（如订单号、发票号、提单号）不单独建立专门的维度表，而是直接存放在事实表中，常用于向更细粒度钻取对账与穿透排查。",
            difficulty=1,
            related_lesson_id="dbt-l2-3",
            tags=["退化维度", "DegenerateDimension", "建模术语"],
        ),
        single_choice(
            "dbt-c2-e5",
            "某用户在 2025 年居住在北京市朝阳区并产生了数笔大额消费，2026 年该用户工作变动搬家到上海市。数仓团队希望在复盘 2025 年历史报表时该用户消费仍记在北京市，同时 2026 年新订单记在上海市。该数仓对于该用户维表必须采用的缓慢变化维策略是：",
            [
                {"label": "SCD Type 2（新增历史版本行，记录生效与失效时间戳以及不同版本的代理键）", "value": "A"},
                {"label": "SCD Type 1（直接用新地址覆盖重写旧地址）", "value": "B"},
                {"label": "SCD Type 0（禁止更新，强行保留永久不变）", "value": "C"},
                {"label": "直接将该用户的所有历史订单全部物理删除", "value": "D"},
            ],
            "A",
            "SCD Type 2 是追溯历史变更的工业级标准：当用户属性变动时，插入新行并维护生效时间区间，事实表根据订单发生时刻关联对应的历史版本代理键，历史与现状完全保真。",
            difficulty=2,
            related_lesson_id="dbt-l2-6",
            tags=["SCDType2", "缓慢变化维", "历史追溯"],
        ),
        single_choice(
            "dbt-c2-e6",
            "在维度建模工程实践中，关于事实表的‘粒度 (Grain)’，下列哪项做法是必须严格杜绝的严重反模式 (Anti-pattern)？",
            [
                {"label": "在同一张事实表中混合不同粒度的度量（例如在商品明细行级别事实表中，每一行都填入整笔订单的运费金额，导致求和时运费被严重重复计算）", "value": "A"},
                {"label": "在正式建表之前用自然语言严格定义一行数据代表什么物理事件", "value": "B"},
                {"label": "优先从原子级最细粒度（如订单明细项）构建基础事实表", "value": "C"},
                {"label": "为事实表定义清晰的外键关联集合与退化维度", "value": "D"},
            ],
            "A",
            "同一事实表必须拥有绝对一致的单一粒度。混杂不同粒度的度量（如明细行混入整单运费）会导致在对粗粒度度量做 SUM 聚合时发生灾难性的多次重复累加计算。",
            difficulty=2,
            related_lesson_id="dbt-l2-5",
            tags=["粒度原则", "反模式", "Grain"],
        ),
        multiple_choice(
            "dbt-c2-e7",
            "在维度模型中，为什么推荐在维度表中使用人工生成的‘代理键 (Surrogate Key)’替代源系统的‘自然键 (Natural Key / 业务主键)’？（多选）",
            [
                {"label": "解耦对上游生产业务库主键策略变更（如业务库重置自增 ID 或格式变动）的脆弱依赖", "value": "A"},
                {"label": "能够优雅支持 SCD Type 2 缓慢变化维，为同一实体的不同历史版本分配独立的唯一代理键", "value": "B"},
                {"label": "便于整合来自多个不同业务系统（如融合 CRM 库与电商交易库）的异构主体，防止主键冲突", "value": "C"},
                {"label": "统一使用标准哈希值或整型代理键，能够提升数仓底层 JOIN 关联效率与存储紧凑度", "value": "D"},
                {"label": "代理键可以用来存储用户的银行卡支付密码并自动扣款", "value": "E"},
            ],
            ["A", "B", "C", "D"],
            "代理键的核心价值在于：业务解耦、支持 SCD Type 2 多版本、跨系统异构主键归一化、以及统一的高效关联。E 属于离谱错误项。",
            difficulty=2,
            related_lesson_id="dbt-l2-3",
            tags=["代理键", "SurrogateKey", "维度表设计"],
        ),
        multiple_choice(
            "dbt-c2-e8",
            "根据 Kimball 维度建模理论，按照商业过程的时间特征与数据刷新方式，事实表可以划分为哪三大核心经典形态？（多选）",
            [
                {"label": "事务事实表 (Transaction Fact Table)", "value": "A"},
                {"label": "周期快照事实表 (Periodic Snapshot Fact Table)", "value": "B"},
                {"label": "累积快照事实表 (Accumulating Snapshot Fact Table)", "value": "C"},
                {"label": "随机抽样事实表 (Random Sampling Fact Table)", "value": "D"},
                {"label": "非关系型文档事实表 (NoSQL Document Fact Table)", "value": "E"},
            ],
            ["A", "B", "C"],
            "Kimball 事实表的三大经典支柱正是：事务事实表（单次离散事件）、周期快照事实表（定期状态切片）与累积快照事实表（跨生命周期多里程碑推进）。",
            difficulty=2,
            related_lesson_id="dbt-l2-2",
            tags=["事实表形态", "事务事实", "周期快照", "累积快照"],
        ),
        judge(
            "dbt-c2-e9",
            "在事实表设计中，为了方便后续报表直接查询，分析工程师应当直接在事实表中计算并持久化存储诸如‘毛利率 = (收入 - 成本) / 收入’之类的百分比指标列。",
            "错误",
            "错误！绝对严禁在事实表中持久化存储不可加的百分比（如毛利率、点击率、转化率）！必须分别存储可加的分子（毛利额/点击量）与分母（销售额/曝光量），在消费端或语义层动态做 SUM(分子)/SUM(分母) 聚合运算，否则向上汇总时百分比直接平均将产生严重数学错误。",
            difficulty=1,
            related_lesson_id="dbt-l2-2",
            tags=["不可加度量", "建模禁忌", "毛利率聚合"],
        ),
        judge(
            "dbt-c2-e10",
            "在跨业务部门的数仓体系中，如果一张‘商品维度表 (dim_products)’能够同时被‘销售订单事实表’与‘仓库库存快照事实表’作为共同的维度进行无缝关联分析，那么这张维度表在 Kimball 理论中被称为‘一致性维度 (Conformed Dimension)’。",
            "正确",
            "正确。一致性维度是 Kimball 维度建模的核心灵魂，跨业务过程共享统一的维度属性与代理键，是打破企业数据孤岛、实现跨业务联合分析的总线基础。",
            difficulty=1,
            related_lesson_id="dbt-l2-7",
            tags=["一致性维度", "ConformedDimension", "总线矩阵"],
        ),
        fill(
            "dbt-c2-e11",
            "在数仓维度建模中，以事实表为中心、直接向外辐射关联反规范化维度表的经典拓扑模型称为 [blank1] 模型；而若将维度表进一步按照第三范式层层展开拆解的模型则称为 [blank2] 模型。",
            [["星型", "星型模型", "Star Schema"], ["雪花", "雪花模型", "Snowflake Schema"]],
            "以事实表为中心一级关联的是星型模型 (Star Schema)；维度层层规范化展开的是雪花模型 (Snowflake Schema)。",
            difficulty=1,
            related_lesson_id="dbt-l2-4",
            tags=["星型与雪花", "拓扑模型", "填空题"],
        ),
        fill(
            "dbt-c2-e12",
            "在缓慢变化维 (SCD) 理论中，若用户手机号变更后直接用新号码覆盖抹去旧号码、不保留任何历史版本的策略属于 SCD Type [blank1]；而通过插入新行、使用有效时间戳标记历史版本生命周期的策略属于 SCD Type [blank2]。",
            [["1", "Type 1", "一"], ["2", "Type 2", "二"]],
            "直接覆盖不留历史的是 SCD Type 1；插入新行保留多版本历史的是 SCD Type 2。",
            difficulty=1,
            related_lesson_id="dbt-l2-6",
            tags=["SCDType", "缓慢变化维", "填空题"],
        ),
        open_ex(
            "dbt-c2-e13",
            "【Kimball 经典星型数仓建模大作业】新能源汽车充电网络交易与电池健康度数仓架构设计",
            """你作为某全球领先的新能源汽车超充网络科技公司的 Lead Data Architect（首席数据架构师），正在牵头搭建全公司核心充电业务的现代星型数据仓库。
业务背景：
- 用户驾驶电动车插枪充电，产生充电桩交易；
- 每次充电过程包含：启动时间、结束时间、充入电量 (kWh)、充电时长 (分钟)、应收电费 (元)、服务费 (元)、优惠券抵扣金额 (元)、实收金额 (元)；
- 每次充电同时采集当前车辆动力电池的初始荷电状态 (SOC_start, %)、结束荷电状态 (SOC_end, %)、电池最高温度 (°C)；
- 充电桩分布在全国各城市的充电站内，充电站拥有不同的运营商属性与电力配电容量；
- 车辆拥有车辆型号、电池包品牌、出厂年份等静态属性，但车辆的归属车主和所在城市可能会随时间发生二手转让变动 (SCD Type 2)。

**【任务要求】**：
(1) 明确定义核心事实表的名称及其物理**粒度 (Grain)**，并判断该事实表属于事务、周期快照还是累积快照事实表；
(2) 列出该业务场景下应构建的至少 3 张核心**维度表 (Dimension Tables)** 及其建议包含的关键维度属性，并明确指出哪些属于一致性维度；
(3) 针对核心事实表，清晰列出其**外键字段 (Foreign Keys)**、**退化维度 (Degenerate Dimensions)** 以及所有的**可加/不可加数值度量 (Numeric Measures)**；
(4) 针对车主与车辆城市变更的场景，详细说明在维度表中如何设计字段以实现 SCD Type 2 历史追溯？并解释为什么该方案能保证'历史充电账单归属历史城市，未来充电账单归属新城市'？""",
            """【标准数仓建模架构设计方案】

(1) 核心事实表与粒度定义：
1. **事实表命名**：`fct_charging_sessions`（单次充电会话事务事实表）；
2. **物理粒度 (Grain) 声明**：
   - 严格定义为：**每一次插枪启动至拔枪结算的完整充电会话记为一行 (One row per charging session)**；
3. **事实表形态归属**：
   - 属于标准的**事务事实表 (Transaction Fact Table)**。记录单次离散的充电物理事件，发生后不可更改，支持按时间追加写入。

(2) 核心维度表设计（全部作为可跨域复用的一致性维度）：
1. **车辆与电池维度表 (`dim_vehicles`，采用 SCD Type 2)**：
   - `vehicle_sk`（代理键）, `vin`（车辆车架号自然键）, `plate_number`, `model_name`, `battery_brand`, `battery_capacity_kwh`, `manufacturing_year`, `owner_user_id`, `current_city`；
2. **充电桩与场站维度表 (`dim_chargers`)**：
   - `charger_sk`（代理键）, `charger_id`（桩编号自然键）, `station_name`, `station_address`, `city`, `province`, `operator_name`, `max_power_kw`（最大输出功率）, `grid_capacity_kva`；
3. **日期时间维度表 (`dim_dates` / `dim_time_of_day`)**：
   - `date_day`, `day_of_week`, `is_weekend`, `is_holiday`, `peak_flat_valley_type`（分时电价尖峰平谷时段分类）。

(3) 事实表字段全景解剖 (`fct_charging_sessions`)：
1. **外键区 (Foreign Keys)**：
   - `vehicle_sk`（指向车辆维表代理键）、`charger_sk`（指向充电桩维表代理键）、`start_date_day`（指向启动日期）、`end_date_day`（指向结束日期）；
2. **退化维度区 (Degenerate Dimensions)**：
   - `session_id`（充电会话全局唯一单号）、`payment_order_no`（第三方支付订单流水号）；
3. **数值度量区 (Measures)**：
   - **完全可加度量**：
     - `energy_kwh`（充入总电量，度）；
     - `duration_minutes`（充电总时长，分钟）；
     - `electricity_fee_amount`（基础电费应收金额）；
     - `service_fee_amount`（服务费应收金额）；
     - `discount_amount`（优惠抵扣金额）；
     - `net_paid_amount`（实付总金额 = 电费 + 服务费 - 优惠）；
   - **半可加/不可加及状态度量**：
     - `soc_start_pct`（初始电量百分比）、`soc_end_pct`（结束电量百分比）、`max_battery_temp_celsius`（最高电池温度，跨记录只能求平均或取最大值，不可直接加总）。

(4) SCD Type 2 方案落地与跨期结算机理：
1. **维表字段设计**：
   在 `dim_vehicles` 维表中增加四个版本控制元数据字段：
   - `dbt_valid_from`（当前车辆所有权及城市状态生效起始时间戳）；
   - `dbt_valid_to`（当前版本失效时间戳；最新生效版本置为 NULL）；
   - `is_current`（布尔标记：TRUE 代表当前最新持有者与城市）；
   - 每次过户或迁入新城市，生成新的 `vehicle_sk`（代理键），原有记录的 `valid_to` 封死为过户时刻。
2. **历史与现状精准隔离机理**：
   - 当生成历史充电事实表时，会话发生时间落在 `valid_from` 与 `valid_to` 之间，事实表精准关联当时的 `vehicle_sk_v1`（对应北京与原车主）；
   - 迁入新城市后的新充电会话，事实表自动关联 `vehicle_sk_v2`（对应上海与新车主）；
   - 彻底解决了历史报表被新城市回溯篡改的重大隐患，保证了财务与审计的严格保真。""",
            [
                {"point": "明确定义充电事实表名称、单次充电会话的原子粒度，并准确定性为事务事实表", "score": 1},
                {"point": "规范设计车辆、充电桩场站、日期时间三大核心维度表及其关键属性，体现一致性维度理念", "score": 1},
                {"point": "完整规划事实表的外键、退化维度（会话号）及完全可加与不可加度量（电量、实收、SOC等）", "score": 1},
                {"point": "深入设计 SCD Type 2 维表时间戳元数据与代理键机制", "score": 1},
                {"point": "清晰阐释 SCD Type 2 保证历史订单归属历史城市、未来订单归属新城市的关联机理", "score": 1},
            ],
            exemplar="""【新能源充电星型数仓架构蓝图】
一、事实表与粒度：
- 事实表：fct_charging_sessions（事务事实表）
- 粒度：一次完整的充电插枪到结算会话一行。

二、一致性维度体系：
1. dim_vehicles (SCD2): vehicle_sk, vin, battery_brand, owner_id, city, valid_from, valid_to, is_current.
2. dim_chargers: charger_sk, charger_id, station_name, city, operator, max_power_kw.
3. dim_dates: date_day, is_holiday, peak_type.

三、事实表字段设计：
- 外键：vehicle_sk, charger_sk, start_date_day.
- 退化维度：session_id, order_no.
- 度量：energy_kwh, duration_min, electricity_fee, service_fee, discount, net_paid (均为完全可加)；soc_start, max_temp (非完全可加).

四、SCD Type 2 历史保真机制：
通过 dbt snapshot 监听车辆表，当车辆转让或城市变动时，旧记录写入 valid_to 并保留旧 vehicle_sk；新记录生成新 vehicle_sk 并生效。历史订单按发生时刻自然锚定旧代理键（归属北京），新订单锚定新代理键（归属上海），彻底避免财务指标历史漂移。""",
            difficulty=5,
            related_lesson_id="dbt-l2-7",
            tags=["Kimball大作业", "星型建模", "SCD2实战", "数仓架构设计"],
        ),
    ]

    ch2 = chapter(
        "dbt-c2",
        "dbt-analytics-engineering",
        2,
        "Kimball 维度建模理论与数仓规范",
        "掌握分析工程核心基石：Kimball 维度建模哲学、事实表三大经典形态（事务/周期快照/累积快照）、度量可加性分类、代理键与退化维度、星型模型与雪花模型权衡、粒度第一戒律以及 SCD Type 2 缓慢变化维历史追溯演进。",
        c2_lessons,
        c2_exercises,
    )
    return ch2

if __name__ == "__main__":
    ch = get_chapter_2()
    print(f"Chapter 2 validated: {len(ch['lessons'])} lessons, {len(ch['exercises'])} exercises.")
