import type { Chapter } from '../../../types';
import { makeExercises, makeLesson } from './authoring';

const chapterId = 'web-crawling-c09';
const lesson1 = `${chapterId}-l01`;
const lesson2 = `${chapterId}-l02`;
const lesson3 = `${chapterId}-l03`;

const contractLesson = makeLesson({
  id: lesson1,
  title: 'Schema、字段校验与数据契约',
  difficulty: 2,
  goals: [
    '用字段名、类型、可空性、单位、时区与默认值定义可执行数据契约。',
    '区分缺失、空字符串、零值和未知，避免用同一个值表达不同语义。',
    '用 dataclass 与纯函数校验解析结果，并理解 JSON Schema 的适用边界。',
    '把“解析成功”与“数据有效”拆成两个独立结论。',
  ],
  prerequisites: [
    '能从 HTML 或 JSON 中抽取字段。',
    '会使用 Python 字典、类型注解与简单异常。',
    '理解项目 1 中缺失价格与零价格的区别。',
  ],
  problem:
    '抽取器不报错，并不代表记录可用。价格可能是空字符串、None 或未找到；库存可能写“未知”，而不是有货或缺货；时间可能没有时区；SKU 可能只差一个空格。若下游把空字符串当字符串、把 None 当 0，统计和合并都会失真。数据契约的作用，是把“这个字段允许什么”写成可读、可测试、可版本化的规则。',
  intuition:
    '字段契约像寄快递前的面单：收件人、电话、地址、重量、单位都必须明确；空白面单不是“收件人为空字符串”，而是尚未填写。解析器只负责从页面取原料，校验器负责判断原料是否符合面单；两者混在一起，出错时就无法知道是页面变了，还是数据本身不符合业务规则。',
  concepts: `
### 1. 字段契约矩阵

| 字段 | 类型 | 可空 | 单位/格式 | 缺失含义 | 失败动作 |
| --- | --- | --- | --- | --- | --- |
| sku | string | 否 | 大写字母+数字 | 无法识别实体 | 拒绝记录 |
| title | string | 否 | 去首尾空白 | 未抽取到标题 | partial |
| price_cents | integer | 是 | 整数分，非负 | 价格未知 | 保留 None |
| available | boolean | 是 | true/false | 库存未知 | 保留 None |
| fetched_at | string | 否 | ISO 8601 + UTC | 无采集时间 | 拒绝记录 |
| source_url | string | 否 | http/https URL | 无来源 | 拒绝记录 |

契约必须说明缺失时是拒绝、partial 还是默认值。默认值尤其危险：把未知价格填成 0，会让排序、均价和告警全部错误。

### 2. 缺失、空字符串与零

- 缺失：字段不存在或无法得到，通常用 None；
- 空字符串：抽取到了空内容，可能是页面结构变化；
- 零：明确的数值事实，例如免费或零库存；
- 未知：业务上暂时不知道，和缺失接近但不完全等同。

四者应在 schema 和报告中分开。若业务确实只需要一个“未知”状态，也要在文档中写明映射，不能靠下游猜测。

### 3. dataclass 与校验

dataclass 适合表达固定记录形状，类型注解帮助阅读，但不会自动在运行时验证。校验函数仍要检查类型、范围、格式和跨字段关系。比如 price_cents 必须是非负整数，available 只允许 True、False 或 None，source_url 必须带主机名。校验错误要包含字段名、原值和原因，不能只抛一个通用 Exception。

### 4. JSON Schema 的边界

JSON Schema 适合跨语言描述 JSON 结构、必填字段和部分格式约束，也便于生成文档和测试样例。它不天然知道业务单位、中文语义、HTML 解析上下文或授权范围。复杂规则应在应用层补充；schema 通过不等于数据适合使用。

### 5. 版本与兼容

抽取器版本变化时，字段为空率可能上升。应把 extractor_version 与记录一起保存，比较不同版本的质量；新增可选字段通常兼容，删除或改变单位则是破坏性变更。迁移时保留旧字段的解释，不要让历史记录和新记录共享一个含义已经变化的列名。
`,
  derivation: `
设 100 条候选记录：

- 6 条缺 SKU：无法识别实体，直接 invalid；
- 其余 94 条进入字段校验；
- 价格缺失 11 条，其中 3 条同时缺标题；
- 标题缺失 5 条，库存未知 7 条；
- 价格为零且库存有货 2 条，这是合法事实，不应算缺失。

若“完整记录”定义为 SKU、标题、价格、库存都存在，则有 94 - (5 + 11 - 3) = 81 条完整记录；13 条 partial；6 条 invalid。完整率按全部候选算是 81/100=81%，按可识别实体算是 81/94≈86.17%。两个分母回答不同问题，报告必须标明。

若把空字符串价格也当作 0，会额外制造 11 个错误价格，完整率不变但金额统计严重偏差。若把价格缺失的记录直接删除，分母会从 100 变成 83，看起来质量更高，实际掩盖了抽取失败。质量指标必须和失败分类一起报告，不能用“删掉坏数据”提升分数。
`,
  diagram:
    '| 阶段 | 输入 | 输出 | 失败分类 |\n| --- | --- | --- | --- |\n| 抽取 | HTML/JSON | 原始字典 | not_found、parse_error |\n| 类型校验 | 原始字典 | 类型安全字典 | wrong_type |\n| 业务校验 | 类型安全字典 | 规范记录 | invalid、partial |\n| 版本标记 | 规范记录 | 可追溯记录 | missing_version |\n\n<Diagram type="crawl-pipeline" name="overview" />',
  diagramNote:
    '契约流程把抽取、类型校验、业务校验和版本标记分开；每一层都能给出不同错误，而不是把全部失败压成一个空值。',
  caseStudy:
    '项目 1 的 B004 缺价格，B006 缺标题。参考实现保留 price_cents=None 与 title=None，并在报告中分别计数；如果把它们写成空字符串，CSV 读取者会误以为存在一个空标题；如果写成 0，后续均价会被拉低。字段契约矩阵让每种缺失都有明确动作，expected 文件也能逐字段比较。',
  codePractice:
    'Demo 用 dataclass 与纯校验函数处理价格、库存和 URL；站内练习只使用内嵌字典，不访问网络。JSON Schema 作为概念与跨语言工具介绍，不把第三方库加入判分环境。',
  mistakes: [
    '把 None、空字符串、0 和“未知”混成同一种值。',
    '只检查键是否存在，不检查类型、单位和范围。',
    '用默认值掩盖抽取失败，导致零值或空标题污染统计。',
    '认为 JSON Schema 通过就等于业务有效或采集授权成立。',
  ],
  relations:
    '本节承接第 3–4 章抽取，是第 7 章持久化记录的字段层约束；第 10 章版本比较需要稳定字段，第 12 章隐私最小化则先决定哪些字段根本不该进入契约。',
  summary:
    '数据契约把字段的类型、可空性、单位、时区和失败动作说清楚。解析成功只代表能读出内容，校验通过才代表内容符合业务定义；缺失与未知必须保留语义。',
  references: [
    'Python dataclasses：<https://docs.python.org/3/library/dataclasses.html>',
    'JSON Schema 入门：<https://json-schema.org/learn/getting-started-step-by-step>',
    'W3C 日期与时间格式：<https://www.w3.org/TR/NOTE-datetime>',
  ],
  lab: [
    '为 price、available、fetched_at 各写一行字段契约。',
    '构造缺失、空字符串、零和未知四个价格样例并分类。',
    '为校验器增加一条范围规则和一条 URL 规则。',
    '说明一次 schema 通过但业务无效的例子。',
  ],
  selfExplanations: [
    '**自我解释一**：为什么“空字符串”和“未知”不能共用一个表示？',
    '**自我解释二**：JSON Schema 无法替代哪类业务校验？',
  ],
  predictionPrompt:
    '若价格字段缺失时默认填 0，完整率看起来不变，但金额统计会出现什么偏差？先写出两个受影响指标再运行 Demo。',
  tips: [
    {
      kind: 'pitfall',
      text: '默认值会掩盖抽取失败；未知价格保持 None，并在报告中单独计数。',
    },
    {
      kind: 'note',
      text: '类型注解不是运行时验证；dataclass 仍需显式校验函数或构造后检查。',
    },
    {
      kind: 'interview',
      text: '先说字段契约和失败动作，再说用了哪个库；这比背 JSON Schema 关键字更能体现数据工程能力。',
    },
  ],
  demo: {
    title: '用 dataclass 表达字段契约',
    lang: 'python',
    code: `from dataclasses import dataclass
from urllib.parse import urlsplit

@dataclass(frozen=True)
class Book:
    sku: str
    title: str | None
    price_cents: int | None
    available: bool | None
    source_url: str

def validate(row):
    sku = row.get("sku")
    if not isinstance(sku, str) or not sku.strip():
        raise ValueError("sku: required non-empty string")
    price = row.get("price_cents")
    if price is not None and (not isinstance(price, int) or isinstance(price, bool) or price < 0):
        raise ValueError("price_cents: non-negative integer or None")
    parts = urlsplit(row.get("source_url", ""))
    if parts.scheme not in {"http", "https"} or not parts.hostname:
        raise ValueError("source_url: http(s) URL required")
    return Book(
        sku=sku.strip(),
        title=(row.get("title") or "").strip() or None,
        price_cents=price,
        available=row.get("available"),
        source_url=row["source_url"],
    )

print(validate({"sku":"B001","title":"合成书","price_cents":None,"available":None,"source_url":"https://local.test/b1"}))`,
  },
});

const storageLesson = makeLesson({
  id: lesson2,
  title: '存储格式、去重与数据血缘',
  difficulty: 2,
  goals: [
    '根据查询、追加、事务和分发需求选择 JSONL、CSV 或 SQLite。',
    '用固定字段顺序、UTF-8、换行规则和原子替换写出可复现文件。',
    '区分精确重复、业务主键重复与近似重复，并选择不同处理策略。',
    '为每条记录保留 source_url、fetched_at、content_hash 与 extractor_version 等溯源信息。',
  ],
  prerequisites: [
    '会写 JSONL/CSV 文件并理解 UTF-8 编码。',
    '知道主键、唯一约束和基本 SQL 查询。',
    '已完成项目 1 或 2，见过稳定排序与幂等写入。',
  ],
  problem:
    '同一个商品可能被两个 URL 指向、同一业务键在不同页面重复、同一内容只改了一个空格。若只按行追加，输出会越来越臃肿；若只按 URL 去重，换了地址的同一实体仍会重复；若 CSV 没有固定字段顺序和引号规则，两次写出就难以比较。存储不是“把字典倒进文件”，而是决定数据如何被查询、追责和更新。',
  intuition:
    '把存储格式想成不同的容器：JSONL 像一排独立信封，适合追加和逐条读取；CSV 像表格，适合交换但容易丢类型；SQLite 像带索引的档案柜，适合查询、唯一约束和事务。血缘字段则是每封信的来源标签，告诉你它从哪里来、何时到、由哪个版本的解释器产生。',
  concepts: `
### 1. 三种格式

| 格式 | 适合 | 优点 | 主要风险 |
| --- | --- | --- | --- |
| JSONL | 事件流、逐条追加、跨语言交换 | 一行一记录、易流式读取 | 文件级事务弱，需自己管理完整写入 |
| CSV | 表格查看、电子表格交换 | 体积小、人可读 | 类型丢失、嵌套结构难表达、引号与换行复杂 |
| SQLite | 查询、唯一约束、事务、版本 | 原子提交、索引、UPSERT | schema 迁移与并发写入需设计 |

选择不应只看“文件小”。若下游需要按 host 查询、按 SKU 更新、按版本去重，SQLite 通常更合适；若只是把一次运行的事件交给另一个系统，JSONL 更简单。

### 2. 稳定写出

JSONL 每条记录一行，建议 sort_keys=True、固定 separators、UTF-8、末尾换行。CSV 要明确 newline、quoting 和字段顺序；值里的逗号、引号和换行必须交给 csv 模块。原子写入可先写同目录临时文件，再替换目标文件，避免进程中断留下半个 JSON 文档。

### 3. 三种重复

- 精确重复：同一来源、同一内容指纹，通常是重跑或镜像；
- 业务主键重复：SKU、ISBN 或 URL 规范化后相同，实体可能更新；
- 近似重复：标题、正文或商品描述高度相似，但内容不完全相同。

精确重复适合 content_hash 去重；业务重复适合唯一键 + UPSERT；近似重复需要相似度阈值和人工复核，不能直接把不同实体合并。

### 4. 数据血缘

至少考虑 source_url、fetched_at、http_status、content_hash、extractor_version 与 run_id。它们回答：这条记录来自哪里、什么时候抓到、原始内容是否变化、用哪个规则抽取、属于哪次运行。只保存最终字段，出现争议时无法复查。

### 5. 隐私与保留

血缘字段也可能泄露信息。URL 查询参数里可能有 token，日志中可能有 Cookie；写入前要脱敏。保留期限应按用途设定，过期数据删除或聚合，而不是永久保存“以后可能有用”的全部原文。
`,
  derivation: `
假设一次运行产生 100 条原始行：

- 5 条是同一页面重复抓取，content_hash 相同；
- 94 条是唯一内容；
- 其中 6 条业务 SKU 与更早版本重复，需要更新；
- 剩余 88 条是新 SKU；
- 另有 1 条坏记录，无法解析业务键。

按精确重复去重后 95 条内容；按 SKU 唯一约束后，数据库新增 88 条、更新 6 条、无效 1 条。最终唯一实体 94 条，但“写入次数”可能是 94，不能把更新误算成新增。重复率若以原始行为分母：5/100=5%；若只算可解析行：5/95≈5.26%。报告必须说明口径。

若 URL 里的跟踪参数不同但内容完全一样，URL 唯一键会保留多行，content_hash 去重才会收敛；反之，标题轻微变化会改变 hash，但业务 SKU 仍应合并。三种键分别服务不同问题，不能只选一个。
`,
  diagram:
    '| 血缘字段 | 回答的问题 | 示例 | 是否敏感 |\n| --- | --- | --- | --- |\n| source_url | 从哪里来 | https://local.test/b1 | 可能含 token |\n| fetched_at | 何时拿到 | 2026-11-05T08:00:00Z | 低 |\n| content_hash | 原始内容是否相同 | sha256:... | 低 |\n| extractor_version | 哪个规则抽取 | books-v3 | 低 |\n| run_id | 属于哪次运行 | run-20261105-01 | 低 |',
  diagramNote:
    '血缘表把来源、时间、内容指纹、抽取版本和运行身份分开；字段各自回答不同问题，不能用单一 URL 替代全部证据。',
  caseStudy:
    '同一商品第一次从 /books/B001 抓取，第二次从带跟踪参数的 /books/B001?utm_source=test 抓取。URL 不同，SKU 与 content_hash 相同。系统按 SKU UPSERT 为一行，保留最新 source_url，并把旧 URL 写入变更证据；报告记录 1 个业务重复但没有新增行。若按 URL 去重，会错误地留下两行。',
  codePractice:
    'Demo 写稳定的 JSONL，并保留 content_hash 与 extractor_version。站内代码题用临时目录验证行序、编码和重复键；不调用外部存储服务。',
  mistakes: [
    '直接拼接 CSV 字符串，不处理逗号、引号和换行。',
    '按自增 id 去重，重跑会新增重复实体。',
    '只看 URL 不看业务键和 content_hash，无法区分换链与更新。',
    '把 token、Cookie 或完整查询参数原样写入血缘字段。',
    '用非原子写入生成大数据文件，中断后留下半行。',
  ],
  relations:
    '本节承接项目 2 的 SQLite 幂等写入，是第 9 章质量指标的存储基础；第 10 章会用 content_hash 与版本表检测变化，第 12 章会用血缘字段做审计与删除。',
  summary:
    'JSONL、CSV、SQLite 各有适用边界；稳定写出依赖编码、字段顺序、引号与原子替换。精确、业务和近似重复要分开处理，血缘字段让记录可追责、可复查、可删除。',
  references: [
    'Python json 模块：<https://docs.python.org/3/library/json.html>',
    'Python csv 模块：<https://docs.python.org/3/library/csv.html>',
    'SQLite 数据类型：<https://www.sqlite.org/datatype3.html>',
  ],
  lab: [
    '把 3 条记录分别写成 JSONL、CSV 与 SQLite，比较查询方式。',
    '构造含逗号、引号和换行的标题，验证 CSV 往返。',
    '为一条记录添加 source_url、fetched_at、content_hash、extractor_version。',
    '说明一次“URL 不同但 SKU 相同”的合并动作。',
  ],
  selfExplanations: [
    '**自我解释一**：为什么唯一键与 content_hash 不能互相替代？',
    '**自我解释二**：JSONL 的追加便利与文件级事务风险如何权衡？',
  ],
  predictionPrompt:
    '同一 SKU 换了一个带跟踪参数的 URL，content_hash 与版本号都不变。你预测按 URL、SKU、hash 三种去重各得到几行？先写预测。',
  tips: [
    {
      kind: 'pitfall',
      text: 'CSV 手写字符串最容易在引号和换行处损坏；使用 csv 模块和 newline=""。',
    },
    {
      kind: 'note',
      text: '数据血缘不是装饰字段；没有来源与版本，就无法解释记录为何变化。',
    },
    {
      kind: 'leak',
      text: 'URL 查询参数和日志可能含 token；写入前脱敏，保留最小必要证据。',
    },
  ],
  demo: {
    title: '稳定写出带血缘的 JSONL',
    lang: 'python',
    code: `import hashlib
import json
from pathlib import Path

def content_hash(value):
    return hashlib.sha256(value.encode("utf-8")).hexdigest()

def write_jsonl(rows, path):
    path = Path(path)
    ordered = sorted(rows, key=lambda row: row["sku"])
    lines = []
    for row in ordered:
        enriched = dict(row)
        enriched["content_hash"] = content_hash(row["title"])
        enriched["extractor_version"] = "books-v1"
        lines.append(json.dumps(enriched, ensure_ascii=False, sort_keys=True))
    path.write_text("\\n".join(lines) + "\\n", encoding="utf-8")

write_jsonl([{"sku":"B2","title":"二"},{"sku":"B1","title":"一"}], "books.jsonl")
print(Path("books.jsonl").read_text(encoding="utf-8"))`,
  },
});

const qualityLesson = makeLesson({
  id: lesson3,
  title: '数据质量检查与隐私最小化',
  difficulty: 3,
  goals: [
    '用完整性、有效性、唯一性、及时性、一致性和可追溯性评估采集结果。',
    '用 100 条样本计算完整率、有效率、重复率与陈旧率，并解释分母。',
    '识别直接标识符、准标识符和敏感属性，执行最小化、脱敏与保留期限。',
    '把质量与隐私检查写成运行报告和可自动化的断言。',
  ],
  prerequisites: [
    '理解字段契约与存储血缘。',
    '会计算比例并区分分子、分母。',
    '知道公开可见数据仍可能含有个人或敏感信息。',
  ],
  problem:
    '采集任务完成了 100 条记录，看起来“成功”，但其中 8 条缺价格、5 条 SKU 重复、3 条时间来自一天前、2 条标题是空字符串，另有若干自由文本含个人联系方式。若只用“总行数”汇报，团队会误以为数据可用。质量检查要把不同缺陷分开，隐私检查则要判断哪些字段本来就不该被保留。',
  intuition:
    '把数据质量想成体检：完整性是器官是否齐全，有效性是数值是否在合理范围，唯一性是身份是否重复，及时性是数据是否过期，一致性是同一字段在不同系统中是否说同一件事，可追溯性是能否解释来源。隐私最小化则是只带必要行李，不把“以后可能用得上”的身份证和联系方式一起搬走。',
  concepts: `
### 1. 六个质量维度

| 维度 | 问题 | 示例指标 |
| --- | --- | --- |
| 完整性 | 必填字段是否存在 | 必填字段完整率 |
| 有效性 | 类型、范围、格式是否合法 | 价格有效率、URL 有效率 |
| 唯一性 | 实体是否重复 | 业务键重复率 |
| 及时性 | 数据是否足够新 | 超过 SLA 的陈旧率 |
| 一致性 | 跨字段/跨来源是否冲突 | 价格与库存矛盾率 |
| 可追溯性 | 来源、时间、版本是否齐全 | 血缘字段覆盖率 |

### 2. 公式

设总记录数为 N：

- 完整率 = 所有必填字段均存在的记录数 / N；
- 有效率 = 通过类型、范围和格式校验的记录数 / N；
- 重复率 = 业务键重复的记录数 / N；
- 陈旧率 = fetched_at 早于阈值的记录数 / N；
- 血缘覆盖率 = 同时含 source_url、fetched_at、content_hash、extractor_version 的记录数 / N。

分子分母必须写清。只统计能解析的记录会让坏页面消失；只统计已存储记录会让重复写入影响重复率。报告至少同时给出原始候选数、可解析数和最终唯一数。

### 3. 100 条样本

假设 100 条候选：

- 92 条可解析，8 条结构失败；
- 可解析中 86 条必填字段完整；
- 84 条通过全部格式校验；
- 90 个唯一 SKU，因此 2 条业务重复（以 92 条可解析为分母约 2.17%）；
- 7 条抓取时间超过 24 小时；
- 88 条含全部血缘字段。

则按 100 条候选计：完整率 86%、有效率 84%、陈旧率 7%、血缘覆盖率 88%。重复率若写成 2/100=2% 与 2/92≈2.17% 都有意义，但必须注明分母。把 8 条结构失败排除后再算 100%，会掩盖抽取器问题。

### 4. 隐私最小化

个人数据可分为直接标识符（姓名、邮箱、电话、身份证号）、准标识符（邮编、出生日期、设备标识）与敏感属性（健康、财务、精确位置）。采集前先问：用途是否需要该字段？能否只保留聚合值？能否立即脱敏？谁能访问？保留多久？删除请求如何执行？

公开网页不等于可无限复制个人资料。即使目标公开，也应遵循目的限定、最小化和保留期限；不采集登录后或受访问控制保护的数据，不把联系方式批量汇入可公开下载的文件。

### 5. 质量门禁

建议把质量指标变成发布门禁：完整率低于阈值阻止发布，重复率异常触发人工复核，血缘覆盖率下降阻止入库，PII 扫描命中阻止公开导出。阈值不是永恒真理，应随用途、样本量和误判成本调整，并记录在运行报告中。
`,
  derivation: `
用 100 条样本做分步计算：

1. 原始候选 N=100；
2. 结构失败 8，得到可解析 92；
3. 必填完整 86，完整率 86/100=86%；
4. 格式有效 84，有效率 84/100=84%；
5. 唯一 SKU 90，重复 92-90=2，按可解析行重复率 2/92≈2.174%；
6. 陈旧 7，陈旧率 7/100=7%；
7. 血缘齐全 88，覆盖率 88/100=88%；
8. 若用完整率门禁 85%，该批次通过；若有效率门禁 90%，则不通过。

门禁组合能区分“字段齐全但格式坏”和“格式正确但来源缺失”。若只设总行数 100，所有问题都会被掩盖。报告应同时展示分母、分子和阈值，允许复核者重算。

隐私样本：100 条自由文本中 12 条含邮箱。若用途只是统计提到邮箱的记录比例，应保存布尔值或哈希，而不是明文邮箱；若用途必须联系本人，也要有合法依据、访问控制和保留期限，而不是默认写入公开 JSONL。
`,
  diagram:
    '| 指标 | 分子 | 分母 | 样本值 | 比率 |\n| --- | ---: | ---: | ---: | ---: |\n| 完整率 | 86 | 100 | 86 | 86% |\n| 有效率 | 84 | 100 | 84 | 84% |\n| 重复率（可解析） | 2 | 92 | 2 | 2.17% |\n| 陈旧率 | 7 | 100 | 7 | 7% |\n| 血缘覆盖率 | 88 | 100 | 88 | 88% |',
  diagramNote:
    '质量仪表板把分子、分母、样本值和比率并列，避免只展示一个看起来漂亮的百分比而无法复算。',
  caseStudy:
    '一次职位采集得到 100 条记录，其中 8 条页面结构变化导致解析失败。自由文本中有 12 条邮箱、3 条手机号。团队不把联系方式写入公开数据集，只保留 has_contact 布尔值；原始文本进入受限临时区，7 天后删除。质量报告保留完整率、有效率、重复率与血缘覆盖率，并把 8 条失败按选择器错误与编码错误分类。',
  codePractice:
    'Demo 计算质量指标并对联系方式做脱敏；练习只使用合成文本，不包含真实个人资料。站内代码不实现访问控制绕过，也不把真实 PII 写入测试。',
  mistakes: [
    '只报告总行数，不报告完整、有效、重复、陈旧和血缘。',
    '通过删除坏记录提高比率，却不保留失败计数。',
    '把公开可见当作可以无限保存和再分发个人资料。',
    '在日志、测试夹具或公开数据集中保存邮箱、电话、token。',
    '设定质量门禁却不记录阈值和分母，导致结果无法复核。',
  ],
  relations:
    '本节把第 9 章前两节的 schema 与存储变成可量化质量，也为第 10 章变更指标、第 11 章监控和第 12 章隐私审计提供统一口径。项目 5 的报告将直接复用这些字段。',
  summary:
    '质量不是一个百分比，而是完整、有效、唯一、及时、一致和可追溯六个问题的组合。隐私最小化要求先决定是否必要，再决定如何保存；公开可见不等于可以无限收集个人数据。',
  references: [
    'NIST 隐私框架：<https://www.nist.gov/privacy-framework>',
    'OWASP 日志记录备忘单：<https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html>',
    'Python hashlib：<https://docs.python.org/3/library/hashlib.html>',
  ],
  lab: [
    '用 100 条样本计算完整率、有效率、重复率、陈旧率和血缘覆盖率。',
    '构造一条缺失、空字符串、零和未知并排的样本。',
    '写一个质量门禁，低于阈值时拒绝发布。',
    '把含邮箱的合成文本脱敏，并说明保留期限。',
  ],
  selfExplanations: [
    '**自我解释一**：为什么重复率必须写清分母是可解析行还是全部候选？',
    '**自我解释二**：公开网页中的联系方式为什么仍需最小化和访问控制？',
  ],
  predictionPrompt:
    '100 条中 8 条结构失败、2 条业务重复。若只按成功入库的 90 条算重复率，你预测它会比按全部候选算高还是低？先计算再回答。',
  tips: [
    {
      kind: 'note',
      text: '每个质量百分比都要带分子、分母和样本量；否则读者无法复算。',
    },
    {
      kind: 'leak',
      text: 'PII 最小化先问用途，再问字段；能用布尔值或哈希时不要保存明文。',
    },
    {
      kind: 'interview',
      text: '解释质量时先列出六个维度和失败分类，再给出单一指标，能避免把“行数”当成“质量”。',
    },
  ],
  demo: {
    title: '质量指标与联系方式脱敏',
    lang: 'python',
    code: `import re

def quality_report(total, complete, valid, unique, stale, lineage):
    return {
        "completeness": complete / total if total else 0.0,
        "validity": valid / total if total else 0.0,
        "duplicate_rate": (valid - unique) / valid if valid else 0.0,
        "staleness": stale / total if total else 0.0,
        "lineage_coverage": lineage / total if total else 0.0,
    }

def redact_contact(text):
    text = re.sub(r"[\\w.+-]+@[\\w.-]+\\.[A-Za-z]{2,}", "[email]", text)
    return re.sub(r"(?<!\\d)1\\d{10}(?!\\d)", "[phone]", text)

print(quality_report(100, 86, 84, 90, 7, 88))
print(redact_contact("联系 demo@example.test 或 13800138000"))`,
  },
});

const contractExercises = makeExercises(chapterId, lesson1, 2, [
  {
    type: 'single',
    question: '价格字段缺失时，最安全的数据表示通常是？',
    options: [
      ['A', '0'],
      ['B', '空字符串'],
      ['C', 'None，并在报告中单独计数'],
      ['D', '随机价格'],
    ],
    answer: 'C',
    explanation: 'None 保留“未知”语义；0 是明确的零价格事实，空字符串会造成类型混淆。',
    tags: ['缺失语义'],
  },
  {
    type: 'multiple',
    question: '字段契约至少应说明哪些内容？',
    options: [
      ['A', '类型与可空性'],
      ['B', '单位、时区或格式'],
      ['C', '缺失时的失败动作'],
      ['D', '网页背景颜色'],
    ],
    answer: ['A', 'B', 'C'],
    explanation: '类型、单位和缺失动作共同定义字段；视觉样式不属于数据契约。',
    tags: ['契约要素'],
  },
  {
    type: 'judge',
    question: '只要 JSON 能解析成功，记录就一定符合业务数据契约。',
    answer: false,
    explanation: 'JSON 语法合法不代表字段类型、范围、单位或缺失语义正确。',
    tags: ['解析与校验'],
  },
  {
    type: 'fill',
    question:
      '数据质量流程应先区分缺失、空字符串、___ 和未知，再做类型与 ___ 校验。',
    blanks: [['零', '0', '零值'], ['业务', '范围', '格式']],
    explanation: '不同缺失语义不能被同一个默认值吞掉；类型之后还需要业务范围和格式规则。',
    tags: ['字段语义'],
  },
  {
    type: 'code',
    question:
      '实现 `validate_book(row)`：返回规范化字典；sku 与 source_url 必填，price_cents 若存在必须是非负整数，available 只允许 bool 或 None；不合法抛出 ValueError。',
    starterCode: `def validate_book(row):
    pass
`,
    expectedOutput: '规范化字典',
    tests: `r=validate_book({"sku":" B1 ","price_cents":None,"available":None,"source_url":"https://local.test/b1"})
assert r["sku"]=="B1" and r["price_cents"] is None and r["available"] is None
for bad in ({"sku":"","source_url":"https://local.test"},{"sku":"B1","price_cents":-1,"source_url":"https://local.test"},{"sku":"B1","price_cents":1,"available":"yes","source_url":"https://local.test"}):
    try:
        validate_book(bad)
    except ValueError:
        pass
    else:
        raise AssertionError("应拒绝")
`,
    answer: `def validate_book(row):
    sku = row.get("sku")
    if not isinstance(sku, str) or not sku.strip():
        raise ValueError("sku")
    url = row.get("source_url")
    if not isinstance(url, str) or not url.startswith(("http://", "https://")):
        raise ValueError("source_url")
    price = row.get("price_cents")
    if price is not None and (isinstance(price, bool) or not isinstance(price, int) or price < 0):
        raise ValueError("price_cents")
    available = row.get("available")
    if available is not None and not isinstance(available, bool):
        raise ValueError("available")
    return {
        "sku": sku.strip(),
        "title": (row.get("title") or "").strip() or None,
        "price_cents": price,
        "available": available,
        "source_url": url,
    }
`,
    explanation: '校验器同时保留 None 并拒绝错误类型，避免 bool 被当成整数。',
    tags: ['字段校验'],
  },
  {
    type: 'code',
    question:
      '实现 `parse_price_cents(text)`：支持「￥1,299.00」「5」「0.50」；空值返回 None；负数、非数字或超过两位小数返回 None。',
    starterCode: `def parse_price_cents(text):
    pass
`,
    expectedOutput: '整数分或 None',
    tests: `assert parse_price_cents("￥1,299.00")==129900
assert parse_price_cents("5")==500
assert parse_price_cents("0.50")==50
assert parse_price_cents(None) is None
assert parse_price_cents("-1") is None
assert parse_price_cents("1.234") is None
`,
    answer: `import re

def parse_price_cents(text):
    if text is None:
        return None
    value = re.sub(r"\\s+", "", str(text)).replace("￥", "").replace("¥", "").replace(",", "")
    if not re.fullmatch(r"\\d+(?:\\.\\d{1,2})?", value):
        return None
    whole, _, fraction = value.partition(".")
    return int(whole) * 100 + int((fraction + "00")[:2])
`,
    explanation: '价格转分必须保持空值为 None，并显式拒绝负数和三位以上小数。',
    tags: ['单位转换'],
  },
  {
    type: 'open',
    question:
      '一个字段契约只写「price: number, optional」。请指出至少四个缺失信息，并说明它们会导致什么下游错误。',
    referenceAnswer:
      '缺少单位（元/分）、可空与缺失区分、范围（负数/零）、格式与舍入、默认动作。下游可能把元当分、把未知当零、接受负价格或在不同语言中产生浮点舍入差异。',
    rubric: [
      { point: '指出单位与范围', score: 2 },
      { point: '指出缺失语义', score: 2 },
      { point: '指出格式与舍入', score: 2 },
      { point: '连接下游后果', score: 2 },
    ],
    explanation: '契约要能让实现者与消费者做出相同判断，而不只是给出一个宽泛类型名。',
    tags: ['契约审查', '开放题'],
    keywords: ['单位', '缺失', '范围', '舍入'],
  },
  {
    type: 'single',
    question: '以下哪项最适合用 JSON Schema 表达？',
    options: [
      ['A', '某个数据只允许用于已获授权的市场研究'],
      ['B', '对象必须有字符串 url 字段且必填'],
      ['C', '这个中文标题是否具有新闻价值'],
      ['D', '页面是否允许采集'],
    ],
    answer: 'B',
    explanation: 'JSON Schema 擅长结构与部分格式约束；授权、价值和人工语义需要应用层判断。',
    tags: ['JSON Schema 边界'],
  },
]);

const storageExercises = makeExercises(chapterId, lesson2, 2, [
  {
    type: 'single',
    question: '需要按 SKU 唯一约束并支持事务更新时，最合适的本地格式是？',
    options: [
      ['A', 'JSONL'],
      ['B', 'CSV'],
      ['C', 'SQLite'],
      ['D', '纯文本日志'],
    ],
    answer: 'C',
    explanation: 'SQLite 提供主键、唯一约束、索引与事务，适合更新和查询。',
    tags: ['存储选择'],
  },
  {
    type: 'multiple',
    question: '稳定写出 JSONL 的实践包括？',
    options: [
      ['A', 'UTF-8 编码'],
      ['B', '一行一记录并保留末尾换行'],
      ['C', '固定排序和键顺序'],
      ['D', '每次追加随机时间戳以制造差异'],
    ],
    answer: ['A', 'B', 'C'],
    explanation: '编码、行边界和排序让输出可比较；随机变化会破坏可复现性。',
    tags: ['JSONL'],
  },
  {
    type: 'judge',
    question: '只要 URL 不同，两条记录就一定是不同业务实体。',
    answer: false,
    explanation: '跟踪参数、镜像和跳转可能让不同 URL 指向同一实体；需结合规范化、SKU 和内容指纹。',
    tags: ['重复类型'],
  },
  {
    type: 'fill',
    question:
      '精确重复通常用 content___ 识别，业务重复用唯一___ 合并，近似重复需要相似度___。',
    blanks: [['hash', '指纹', '哈希'], ['键', '主键', '约束'], ['阈值', '判断', '分数']],
    explanation: '三种重复问题对应不同证据，不能只靠一种键解决。',
    tags: ['去重策略'],
  },
  {
    type: 'code',
    question:
      '实现 `write_jsonl(rows, path)`：按 sku 排序，每条用 json.dumps(ensure_ascii=False, sort_keys=True) 写一行，UTF-8 且末尾有换行。',
    starterCode: `def write_jsonl(rows, path):
    pass
`,
    expectedOutput: '无返回值，文件内容稳定',
    tests: `import json, tempfile
from pathlib import Path
d=tempfile.mkdtemp()
p=Path(d)/"r.jsonl"
write_jsonl([{"sku":"B2","title":"二"},{"sku":"B1","title":"一"}],p)
lines=p.read_text(encoding="utf-8").splitlines()
assert [json.loads(x)["sku"] for x in lines]==["B1","B2"]
assert p.read_text(encoding="utf-8").endswith("\\n")
`,
    answer: `import json
from pathlib import Path

def write_jsonl(rows, path):
    ordered = sorted(rows, key=lambda row: row["sku"])
    text = "".join(
        json.dumps(row, ensure_ascii=False, sort_keys=True) + "\\n"
        for row in ordered
    )
    Path(path).write_text(text, encoding="utf-8")
`,
    explanation: '排序、UTF-8 和末尾换行让两次写出可比较；不要手工拼接逗号或 JSON 分隔符。',
    tags: ['JSONL 写入'],
  },
  {
    type: 'code',
    question:
      '实现 `dedupe_by(rows, key)`：按给定业务键保留最后出现的整行，跳过键缺失或空白的行，结果按键排序返回新列表。',
    starterCode: `def dedupe_by(rows, key):
    pass
`,
    expectedOutput: '按业务键去重后的记录',
    tests: `rows=[{"sku":"B2","v":1},{"sku":"B1","v":2},{"sku":"B2","v":3},{"sku":"","v":4}]
assert dedupe_by(rows,"sku")==[{"sku":"B1","v":2},{"sku":"B2","v":3}]
`,
    answer: `def dedupe_by(rows, key):
    merged = {}
    for row in rows:
        value = row.get(key)
        if not isinstance(value, str) or not value.strip():
            continue
        merged[value] = dict(row)
    return [merged[value] for value in sorted(merged)]
`,
    explanation: '业务键去重是“实体”层操作，保留最后版本并稳定排序，便于与版本表比较。',
    tags: ['业务去重'],
  },
  {
    type: 'open',
    question:
      '同一 SKU 的 URL 从 /books/B1 变为 /books/B1?utm_source=x，内容和版本相同。请说明按 URL、SKU、content_hash 三种去重的结果差异。',
    referenceAnswer:
      '按 URL 会产生两行，因为查询参数不同；按 SKU 会收敛为一行，并保留最新来源；按 content_hash 也会收敛为一行，但不能替代业务实体识别。应记录 URL 变化作为来源证据，而不是新增实体。',
    rubric: [
      { point: 'URL 去重结果', score: 2 },
      { point: 'SKU 去重结果', score: 2 },
      { point: 'hash 去重结果', score: 2 },
      { point: '来源证据与实体区分', score: 2 },
    ],
    explanation: '不同键回答不同问题；业务键与内容指纹要组合使用。',
    tags: ['去重比较', '开放题'],
    keywords: ['URL', 'SKU', 'content_hash', '来源'],
  },
  {
    type: 'judge',
    question: '数据血缘字段只要保存 source_url，就能解释记录何时、由哪个规则产生。',
    answer: false,
    explanation: 'URL 只说明来源；时间、内容指纹、抽取器版本和 run_id 回答其他问题。',
    tags: ['数据血缘'],
  },
]);

const qualityExercises = makeExercises(chapterId, lesson3, 3, [
  {
    type: 'single',
    question: '100 条候选中 8 条结构失败、86 条必填完整。完整率按全部候选计是？',
    options: [
      ['A', '86%'],
      ['B', '92%'],
      ['C', '100%'],
      ['D', '78%'],
    ],
    answer: 'A',
    explanation: '完整率=86/100=86%；不能把结构失败从分母中删掉。',
    tags: ['完整率'],
  },
  {
    type: 'multiple',
    question: '隐私最小化通常包括哪些动作？',
    options: [
      ['A', '按用途判断是否真的需要字段'],
      ['B', '能用布尔值或哈希就不保存明文'],
      ['C', '限制访问并设置删除期限'],
      ['D', '把所有联系方式放入公开 JSONL'],
    ],
    answer: ['A', 'B', 'C'],
    explanation: '目的限定、字段最小化、访问控制和保留期限共同降低风险。',
    tags: ['隐私最小化'],
  },
  {
    type: 'judge',
    question: '公开页面中的邮箱可以无条件保存并再分发，因为用户已经公开了它。',
    answer: false,
    explanation: '公开可见不等于允许无限收集、合并和再分发；仍需目的限定、最小化和法律评估。',
    tags: ['合规边界'],
  },
  {
    type: 'fill',
    question:
      '有 92 条可解析记录、90 个唯一 SKU，则业务重复 2 条，按可解析行的重复率为 ___%；若按 100 条候选计则为 ___%。',
    blanks: [['2.17', '2.2', '2.174'], ['2']],
    explanation: '同一分子换不同分母会得到不同但都可能有意义的比率，必须注明口径。',
    tags: ['重复率'],
  },
  {
    type: 'code',
    question:
      '实现 `quality_report(total, complete, valid, unique, stale, lineage)`：返回 completeness、validity、duplicate_rate、staleness、lineage_coverage 五个比例；总数为 0 时返回全 0；重复率分母为 valid。',
    starterCode: `def quality_report(total, complete, valid, unique, stale, lineage):
    pass
`,
    expectedOutput: '质量指标字典',
    tests: `r=quality_report(100,86,92,90,7,88)
assert round(r["completeness"],2)==0.86
assert round(r["validity"],2)==0.92
assert round(r["duplicate_rate"],4)==round(2/92,4)
assert quality_report(0,0,0,0,0,0)["validity"]==0.0
`,
    answer: `def quality_report(total, complete, valid, unique, stale, lineage):
    if total <= 0:
        return {
            "completeness": 0.0,
            "validity": 0.0,
            "duplicate_rate": 0.0,
            "staleness": 0.0,
            "lineage_coverage": 0.0,
        }
    return {
        "completeness": complete / total,
        "validity": valid / total,
        "duplicate_rate": (valid - unique) / valid if valid else 0.0,
        "staleness": stale / total,
        "lineage_coverage": lineage / total,
    }
`,
    explanation: '每个比例显式使用自己的分母；空样本返回 0，避免除零和虚假 100%。',
    tags: ['质量公式'],
  },
  {
    type: 'code',
    question:
      '实现 `redact_contact(text)`：把合成邮箱替换为 [email]，把 11 位大陆手机号替换为 [phone]；不修改其他文本。',
    starterCode: `def redact_contact(text):
    pass
`,
    expectedOutput: '脱敏文本',
    tests: `assert redact_contact("a demo@example.test b")=="a [email] b"
assert redact_contact("电话 13800138000 结束")=="电话 [phone] 结束"
assert redact_contact("普通文本")=="普通文本"
`,
    answer: `import re

def redact_contact(text):
    text = re.sub(r"[\\w.+-]+@[\\w.-]+\\.[A-Za-z]{2,}", "[email]", text)
    return re.sub(r"(?<!\\d)1\\d{10}(?!\\d)", "[phone]", text)
`,
    explanation: '脱敏是发布前的额外防线，但不能替代“是否必要收集”的判断。',
    tags: ['PII 脱敏'],
  },
  {
    type: 'open',
    question:
      '100 条记录中 8 条结构失败、7 条陈旧、12 条含邮箱。请给出至少四个质量/隐私指标，并说明一个发布门禁。',
    referenceAnswer:
      '可报告结构成功率 92%、陈旧率 7%、PII 命中 12%（或脱敏后公开导出 0）、血缘覆盖率、完整率与重复率。门禁例如：结构成功率低于 90% 阻止发布，或公开导出前 PII 扫描必须为 0。阈值需记录在报告中。',
    rubric: [
      { point: '四个指标含分母', score: 2 },
      { point: '隐私指标与动作', score: 2 },
      { point: '门禁可执行', score: 2 },
      { point: '说明阈值与版本', score: 2 },
    ],
    explanation: '质量报告要能触发行动，而不只是展示数字。',
    tags: ['质量门禁', '开放题'],
    keywords: ['92%', '陈旧率', 'PII', '阈值'],
  },
  {
    type: 'single',
    question: '以下哪个指标最能发现“字段存在但格式普遍错误”？',
    options: [
      ['A', '总文件大小'],
      ['B', '有效率'],
      ['C', 'URL 数量'],
      ['D', '浏览器版本'],
    ],
    answer: 'B',
    explanation: '有效率统计通过类型、范围和格式校验的记录比例，能揭示格式错误。',
    tags: ['有效性'],
  },
  {
    type: 'judge',
    question: '为了提升完整率，可以删除所有不完整记录并不再报告它们。',
    answer: false,
    explanation: '删除失败样本会操纵指标并掩盖采集问题；应保留失败计数和分类。',
    tags: ['指标诚信'],
  },
  {
    type: 'open',
    question:
      '团队要发布一个公开职位数据集，原始页面含公司邮箱。请写一个最小化方案，覆盖用途、字段、访问、保留与删除。',
    referenceAnswer:
      '先确认收集与发布目的和授权；若只需统计招聘活跃度，不保存邮箱，只保留 has_contact 或聚合值；若确需联系，放受限区域、加密与最小权限，设置短期保留和删除流程。公开导出前做 PII 扫描，日志不记录明文邮箱。',
    rubric: [
      { point: '目的限定', score: 2 },
      { point: '字段最小化', score: 2 },
      { point: '访问与保留', score: 2 },
      { point: '删除与审计', score: 2 },
    ],
    explanation: '隐私方案必须从“是否需要”开始，而不是先收集再想脱敏。',
    tags: ['PII 案例', '开放题'],
    keywords: ['目的', '最小化', '访问', '保留', '删除'],
  },
]);

export const webCrawlingChapters09: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: chapterId,
    title: '数据质量、存储与模式',
    goal: '用数据契约、质量指标、可追溯存储和隐私最小化，让采集结果能够被信任和复用。',
    lessons: [contractLesson, storageLesson, qualityLesson],
    exercises: [...contractExercises, ...storageExercises, ...qualityExercises],
  },
];
