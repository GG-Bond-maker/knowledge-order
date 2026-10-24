# CS146S 课程建设进度与测试报告（2026-10-25 收官）

> 课程：CS146S Fall 2026 — The Modern Software Developer（现代软件开发者：AI 原生软件工程与编程智能体）
> 规格来源：[docs/cs146s-design.md](cs146s-design.md)；资料来源：[docs/cs146s-sources.md](cs146s-sources.md)

## 一、交付物总览

| 项 | 数量 | 说明 |
| --- | --- | --- |
| 学科域 | 1 | `ai-native`「AI 原生软件工程」（contentStore + domains.json 双注册） |
| 课程 | 1 | `cs146s`（22 个章节对象，映射官方 10 周 + 毕业项目） |
| 知识点小节 | 58 | 全部含 13 教学模块（学习目标/前置/背景/直觉/概念/图解/案例/代码/误区/知识关联/总结/参考/实验） |
| 习题 | 492 | 题型全覆盖（single/multiple/judge/fill/code/open），KUD 三型标注，难度 1-5 分布合理 |
| 交互图 | 8 个原创组件 | agentloop/contextwindow/mcphandshake/specflow/autonomyladder/permmodes/reviewpipe/factoryloop（Cs146sDiagrams.tsx，1066 行） |
| 可运行 Python 演示 | ~60 | 全部本地实跑验证 |
| 代码编程题 | 38 | 参考答案全部通过其 assert 测试（本地逐题验证） |
| 实践项目 | 5（A-E） | A 简化版 Agent（w4b）、B 规格驱动改造（w3b）、C MCP+权限（w2b）、D 安全流水线（w6b+w7b）、E Software Factory（finalb）——每个含需求/设计/步骤/测试用例/故障表/DoD/拓展 |

## 二、章节清单与官方映射

| 章 | 官方周 | 节/题 | 生产方式 |
| --- | --- | --- | --- |
| cs146s-w1/w1b | W1 LLM 基础 | 5/44 | 自写（质量基准） |
| cs146s-w2/w2b | W2 Agent 解剖+MCP | 6/54 | 子代理 |
| cs146s-w3/w3b | W3 上下文工程 | 6/54 | 子代理 |
| cs146s-w4/w4b | W4 Agent 协作 | 6/56 | 子代理 |
| cs146s-w5/w5b | W5 现代终端 | 5/40 | 子代理 |
| cs146s-w6/w6b | W6 测试与安全 | 6/52 | 自写 |
| cs146s-w7/w7b | W7 审查与调试 | 5/38 | 自写 |
| cs146s-w8/w8b | W8 自动应用构建 | 5/40 | 子代理 |
| cs146s-w9/w9b | W9 运维可观测 | 5/40 | 子代理 |
| cs146s-w10/w10b | W10 未来 | 4/28 | 子代理 |
| cs146s-final/finalb | Final Project | 5/46 | 子代理 |

## 三、验证记录（全部通过）

| 验证项 | 命令 | 结果 |
| --- | --- | --- |
| 类型检查 | `pnpm run typecheck` | ✅ 零错误 |
| 内容审计 | `pnpm run audit` | ✅ id 唯一、必填齐全、题目体检通过 |
| 深度审计 | `node scripts/depth-audit.mjs` | ✅ 全站 A 1022 / B 43 / C 1 / D 0（C 为存量 quant 项）；**cs146s 58 节全部 A 级** |
| 章节验证器 | `python scripts/cs146s_validate.py` | ✅ 22 个章节文件全部通过（语法/13模块/tips/demos数组/open完整性/python demo 实跑/code 题答案过 tests） |
| 渲染抽查 | `node scripts/e2e-cs146s.mjs` | ✅ 22 章全部打开、图示渲染、**48/48 检查通过、无 JS 错误** |
| 判分引擎回归 | `pnpm run verify:sql` | ✅ 154/154（存量 SQL 题，无新增失败） |
| 难度报告 | `pnpm run difficulty` | ✅ 难度分布合理（均值 2.4-2.7/章） |
| 同步 | `pnpm run sync` | ✅ content-data/courses/cs146s.json = 22章/58知识点/492习题 |

## 四、生产管线（可复现）

1. 子代理提示词（规格+风格基准+硬门槛验证）→ 产出 `w*.ts`；
2. `python scripts/cs146s_validate.py <files>`（机械把关：esbuild 语法、模块完整性、Python 实跑、习题完整性）；
3. 人工接线 `src/content/chapters/cs146s/index.ts`（按官方周序）；
4. `pnpm run typecheck && sync && audit && depth-audit`；
5. `node scripts/e2e-cs146s.mjs`（渲染抽查）；
6. git commit（每批一次，共 14 个提交）。

**教训沉淀（已写入记忆）**：TS 模板内裸反引号、单引号字符串含正则引号、`\\`+反引号组合、open 题必带 explanation、"知识关联：承上启下"标题锚点——均已成为子代理提示词的固定红线。

## 五、后续完善清单

1. **官方 2026 讲义/视频跟踪**：Fall 2026 讲义 PDF 与录像尚未完整公开；公开后对照各章"官方作业锚点"小节，补录官方作业细节（当前只用了主题锚点）；
2. **链接例行核验**：`docs/cs146s-sources.md` 的外部链接建议每季度跑一次链接检查（本次核验日期 2026-10-24）；
3. **项目 A-E 实仓库落地**：五个项目的参考实现可建独立仓库模板（`mini-agent/`、`mcp-server/` 等），课程页挂 GitHub 链接；
4. **学习路线图接线**：cs146s 已有 seriesId，可把它加入 `learning-map` 的地铁图展示（检查 `/learning-map/ai-native` 路由）；
5. **交互图增强**：contextwindow/specflow 可增加更多可切换场景（多轮对话/跨仓库改造）；
6. **`check_tpl.py` 存量告警**：18 行 bad lines 属 quant 既有状态，可顺带清理；
7. **平台存量测试**：`pnpm run test:platform` 有两处存量失败（plan 持久化断言、note-head 定位），与本次改动无关，待另行修复；
8. **e2e 端口**：`scripts/e2e-cs146s.mjs` 默认 5173（dev-all），端口变化时通过第二个参数传入。
