# 网络爬虫课程实验室

这些实验只使用合成数据与本地文件。课程从静态 HTML 抽取开始，逐步加入分页 JSON、动态渲染、聚焦抓取和增量版本。

## 环境

- Python 3.11+
- 项目 1、2、4、5 的核心验收只使用 Python 标准库。
- 项目 3 的浏览器验收需要本地安装可选依赖，站内不会执行 Playwright。

## 通用命令

```powershell
python -m unittest discover -s public/labs/web-crawling/project-01-static/tests -v
```

对照参考实现：

```powershell
$env:CRAWL_TARGET='solution'
python -m unittest discover -s public/labs/web-crawling/project-01-static/tests -v
Remove-Item Env:CRAWL_TARGET
```

项目不会访问真实网站，不包含凭据、真实个人资料或需绕过的访问控制。

## 合规与使用边界

- `robots.txt` 是自愿排除协议与抓取偏好信号，不是法律授权证书。
- 页面公开可见不等于允许批量采集、长期保存、跨来源合并或再分发。
- 本课程与实验用于一般工程教育，不构成法律意见。
- 全部页面、记录与接口均为合成数据；站点标识使用 `.test` 域名或回环地址。
- 实验不包含登录、验证码、付费墙、限流或访问控制绕过，也不得加入真实凭据。
