# 基础功能闭环

## 目标

本轮在不引入云端服务和新权限的前提下，让 FluxFeed 已有的订阅、阅读、搜索、设置和数据迁移能力形成可靠闭环。重点解决数据保留语义错误、设置项不生效、多 Feed 页面无法正确选择、OPML 丢失目录以及失败状态被界面忽略的问题。

## 功能要求

### 数据保留

- `retentionDays = 0` 明确表示永久保留，不执行按时间清理。
- `maxArticlesPerFeed` 对每个订阅源生效。
- 超出数量上限时优先保留未读和收藏文章，仅清理最旧的已读且未收藏文章。

### 阅读与搜索

- `showUnreadOnly` 控制 Inbox 默认是否只展示未读文章。
- `markReadOnOpen` 的界面文案与实际行为一致：打开文章时自动标记为已读。
- 搜索覆盖标题、摘要、正文、作者和标签，并忽略大小写与 HTML 标签。
- Feed 页面刷新只刷新当前 Feed；其他视图刷新全部订阅。

### Feed 发现与后台刷新

- 页面发现多个 Feed 时，用户可以选择具体 Feed。
- 每个候选 Feed 独立判断是否已经订阅。
- 批量刷新最多同时处理 5 个 Feed。
- 后台请求失败时 Store 不得伪造成功状态。

### OPML

- 导入时识别一级和二级目录，并将订阅放入对应目录。
- 导出时保留现有目录层级。
- 导入结果展示成功、跳过和失败数量。
- 继续保留仅返回 URL 列表的兼容 API。

### 质量保障

- 单元测试覆盖永久保留、数量上限、全文搜索、并发刷新、多 Feed 选择和 OPML 层级。
- Playwright 启动真实 Chromium 扩展，验证 Options 根页面和 Settings Hash 路由均能渲染。
- Playwright 使用本地 RSS 夹具验证添加订阅、文章入库、阅读操作、搜索、持久化和删除订阅的完整闭环。
- Runtime 消息拒绝统一转换为失败响应，Store 不得因为 Service Worker 重载而永久停留在加载状态。

## 不在本轮范围

- WebDAV、Dropbox 或账号同步。
- 系统通知。
- 自定义浏览器 Commands。
- 复杂关键词过滤规则。
- Chrome Web Store 发布流程。

## 验收命令

- `pnpm test --run`
- `pnpm compile`
- `pnpm lint`
- `pnpm build`
- `pnpm build:firefox`
- `pnpm test:e2e`
