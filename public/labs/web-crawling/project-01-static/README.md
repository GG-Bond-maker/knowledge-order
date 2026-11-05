# 项目 1：本地静态目录采集器

从合成书店列表页发现 6 个详情页，抽取字段、规范化价格与库存、按 SKU 稳定排序，输出 JSONL、CSV 和漏斗报告。

## 无网络边界

所有页面均来自 `fixtures/`。`https://local.test/` 只是合成来源标识，不会发起请求。

## 运行

从仓库根目录执行：

```powershell
$env:CRAWL_TARGET='solution'
python -m unittest discover -s public/labs/web-crawling/project-01-static/tests -v
Remove-Item Env:CRAWL_TARGET
```

运行 starter 观察预期失败：

```powershell
$env:CRAWL_TARGET='starter'
python -m unittest discover -s public/labs/web-crawling/project-01-static/tests -v
Remove-Item Env:CRAWL_TARGET
```

## 输入与预期

- 8 张列表卡；
- 7 个合法链接（含 1 个重复），6 个唯一 URL；
- 1 个 `javascript:` 链接被跳过；
- 4 条完整记录、2 条部分记录；
- 1 条缺价格、1 条缺标题；
- 重复卡片 1 张。

预期记录在 `expected/records.jsonl`，预期报告在 `expected/report.json`。

## 四个里程碑

1. 用 `extract_links` 完成 `<base>`、相对 URL 与 scheme 过滤。
2. 用 `parse_detail` 从 6 个详情文件抽取原始字段。
3. 用 `normalize_record` 把价格转整数分、库存转可空布尔，缺失保持 `None`。
4. 用 `collect` 与 `write_outputs` 生成稳定排序的记录与漏斗报告。

## Definition of Done

- 6 个详情都经过抽取；4 完整、2 部分的分类有断言。
- 重复、非法链接、缺价格与缺标题各自有测试证据。
- JSONL/CSV 排序确定，连续两次写出字节一致。
- 报告能从输入复算，不把 None 写成 0。
- starter 以清晰 `NotImplementedError` 失败；solution 全部通过。

## rubric

| 维度 | 分值 | 通过证据 |
| --- | ---: | --- |
| URL 发现与过滤 | 2 | `<base>`、相对路径、非法 scheme 测试 |
| 字段抽取与规范化 | 3 | 价格分、库存三态、缺失保持 None |
| 合并与稳定输出 | 2 | SKU 排序、双跑一致 |
| 报告与失败分类 | 2 | 漏斗计数和 expected 文件一致 |
| 项目边界与文档 | 1 | 离线运行、命令可复现 |

## 故障排查

| 现象 | 检查 |
| --- | --- |
| 链接变成相对路径 | 是否读取 `<base>` 并用 `urljoin` |
| 缺价格输出为 0 | 规范化把缺失与零值混淆 |
| 合法价格被判非法 | 是否处理千位逗号、货币符号与空白 |
| 第二次 CSV 行序不同 | 是否在写出前按 SKU 排序 |
| starter 报错 | 预期行为；完成 TODO 后切回 solution 验证 |
