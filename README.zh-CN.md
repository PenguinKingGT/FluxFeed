<div align="center">
  <img src="./assets/flux-feed.svg" width="88" height="88" alt="FluxFeed 标志">
  <h1>FluxFeed</h1>
  <p>安静、本地优先的浏览器 RSS 阅读器，并可选择接入自己的 AI 服务进行总结。</p>

  <p>
    <a href="./README.md">English</a> · 简体中文 · <a href="./README.ja.md">日本語</a>
  </p>
</div>

> [!NOTE]
> FluxFeed 目前仍处于发布前阶段。请从源码安装，数据模型和界面仍可能继续调整。

## 为什么选择 FluxFeed？

FluxFeed 把 RSS、Atom 和 JSON Feed 阅读整理成一个专注的浏览器工作区。订阅、文章、目录、偏好设置和已缓存的摘要都保存在浏览器本地，不需要 FluxFeed 账号，也没有官方托管的同步服务。

AI 完全可选。启用后，FluxFeed 会直接连接你配置的 OpenAI-compatible 服务、Gemini 或 Claude。API 地址、模型、API Key 以及何时总结内容都由你控制。

## 功能

- **侧栏收起：** 桌面端可平滑收起或展开最左侧导航，并在本地记住选择。
- **订阅管理：** 直接添加 Feed 地址、输入网站地址自动发现 Feed，或订阅当前网页检测到的 Feed。侧栏目录“＋”可就近添加订阅或目录，底部“添加订阅”直接打开 Feed 表单。
- **本地资料库：** 使用多级目录整理订阅，并通过 OPML 导入或导出数据。
- **专注阅读：** 搜索文章全文、标记已读、收藏文章，并在新标签页打开原文后直接切换过去。收件箱默认仅显示未读，全部文章包含已读内容。
- **响应式布局：** 大屏显示完整三栏，笔记本使用紧凑导航，窄窗口切换为单栏阅读。
- **专注模式：** 阅读时隐藏导航和文章列表，获得更完整的正文空间。
- **可选 AI 摘要：** 手动总结单篇文章，或按照可配置的正文长度自动总结。
- **今日简报：** 分批整理当天文章、浏览主题分组，并从简报返回本地文章。
- **代码高亮：** 常见语言的代码块支持语法着色、无语言标记时自动识别，并适配明暗模式。
- **文章样式：** 在外观设置中选择原始、Vue 风格、GitHub、书刊、简约五套排版，覆盖链接、列表、引用、代码与表格，支持明暗模式并保留独立字体、字号设置。
- **外观设置：** 七套配色（默认暖纸，新增晴空、薄荷、蜜桃）、跟随系统/浅色/深色模式、正文字号，以及独立的阅读字体和界面字体。
- **多语言界面：** 英文、简体中文和日文。
- **Chrome 与 Firefox：** 同一套 WXT 代码生成两个浏览器版本。

## 从源码安装

### 环境要求

- Git
- 当前 Node.js LTS 版本
- [pnpm](https://pnpm.io/)

```bash
git clone https://github.com/PenguinKingGT/FluxFeed.git
cd FluxFeed
pnpm install
```

### Chrome 及 Chromium 浏览器

```bash
pnpm build
```

1. 打开 `chrome://extensions`。
2. 开启右上角的**开发者模式**。
3. 点击**加载已解压的扩展程序**。
4. 选择 `.output/chrome-mv3`。

### Firefox

```bash
pnpm build:firefox
```

1. 打开 `about:debugging#/runtime/this-firefox`。
2. 点击**临时载入附加组件**。
3. 选择 `.output/firefox-mv2/manifest.json`。

Firefox 临时扩展会在浏览器关闭后被移除。

## 开发命令

| 命令 | 用途 |
| --- | --- |
| `pnpm dev` | 启动 Chrome 的 WXT 开发模式 |
| `pnpm dev:firefox` | 启动 Firefox 的 WXT 开发模式 |
| `pnpm build` | 构建 Chrome MV3 扩展 |
| `pnpm build:firefox` | 构建 Firefox 扩展 |
| `pnpm zip` | 打包 Chrome 版本 |
| `pnpm zip:firefox` | 打包 Firefox 版本 |
| `pnpm compile` | 执行 TypeScript 检查 |
| `pnpm lint` | 执行 Oxlint |
| `pnpm test --run` | 单次运行 Vitest 测试 |
| `pnpm test:e2e` | 构建 Chrome 并运行 Playwright 扩展测试 |

## 配置 AI 摘要

使用 AI 功能前，请先配置供应商：

1. 打开**设置 → AI 总结**。
2. 选择 **OpenAI-compatible**、**Gemini** 或 **Claude**。兼容服务可填写 `/v1` 基础地址或完整 Chat Completions 地址；Gemini 和 Claude 使用原生协议，提供官方默认基础地址，也可填写代理基础地址。
3. 输入该服务接受的模型名称。
4. 保存对应供应商的 API Key，并点击**测试连接**。兼容本地服务可不填写 Key，原生 Gemini 和 Claude 必须填写。
5. 选择摘要语言、摘要长度、简报文章上限，以及是否自动总结长文章。

FluxFeed 支持 OpenAI-compatible Chat Completions、原生 Gemini 和原生 Claude Messages，暂不支持自定义请求头、流式输出和对话追问。切换供应商会重置地址和模型；API Key 按供应商独立保存，旧兼容配置和 Key 继续可用。

FluxFeed 在扩展后台通过 Vercel AI SDK 直接请求所选供应商，不需要 Vercel 账号或 AI Gateway。SDK 自动重试和 telemetry 均已关闭。

### 请求规则

- 刷新订阅不会触发 AI 请求。
- 今日简报只会在你点击**生成**或**更新**时运行。
- 单篇文章自动总结默认关闭。
- 长文章分段总结，每段最多 30,000 个 UTF-16 代码单元，最多 5 段，并发最多 2 个请求；最终合并后每篇最多 6 次请求。超限时手动确认仅总结开头部分，自动总结跳过；失败保留旧摘要。
- 简报生成设置了分批、并发、输入长度、输出长度和超时限制。
- 已完成的摘要会缓存在本地。
- 可在 AI 设置中隐藏文章摘要，同时暂停单篇自动总结，已有摘要保留。

## 隐私与权限

- 订阅、文章、目录、设置和生成的摘要保存在本地 IndexedDB。
- AI API Key 按供应商独立保存在 `browser.storage.local`，不会写入 OPML，也不会返回页面状态。
- AI 请求只由扩展后台进程发送到你配置的服务。
- 只有在你手动请求总结或开启自动总结后，文章摘录才会离开浏览器。
- FluxFeed 不包含数据分析服务，也没有官方托管账号。

FluxFeed 需要访问网页，是因为 RSS 阅读器必须从任意站点发现并抓取 Feed。当前 Manifest 还声明了浏览器存储、标签页、Alarm、脚本和右键菜单权限。具体权限和运行边界请查看 [wxt.config.ts](./wxt.config.ts) 与[架构说明](./docs/architecture.md)。

## 键盘快捷键

当阅读器处于焦点状态且你没有在表单中输入时，可以使用：

| 按键 | 操作 |
| --- | --- |
| `←` / `→` | 上一篇 / 下一篇 |
| `M` | 将当前文章标记为已读 |
| `S` | 收藏 / 取消收藏当前文章 |
| `Enter` | 打开原文并切换到新标签页 |
| `F` | 进入 / 退出专注模式 |

## 项目结构

```text
entrypoints/          WXT 后台、内容脚本、Popup 和 Options 入口
components/           阅读器、设置、简报、Popup 和基础 UI 组件
hooks/                可复用 React Hooks
lib/                  Feed 解析、存储、AI、OPML、搜索和共享类型
store/                Zustand Store 与 Runtime 消息客户端
public/               扩展图标、语言文件、许可证和静态资源
assets/               源设计资源
tests/unit/           Vitest 单元测试和组件测试
tests/e2e/            在真实 Chrome 扩展中运行的 Playwright 测试
docs/                 架构、功能说明与实施计划
```

FluxFeed 使用 WXT、React、TypeScript、Tailwind CSS、Radix-compatible UI、Zustand、Dexie、Vitest 和 Playwright。

## 参与贡献

欢迎提交 Issue 和 Pull Request。

1. 开始较大改动前，请先检查现有 [Issues](https://github.com/PenguinKingGT/FluxFeed/issues)。
2. 阅读 [AGENTS.md](./AGENTS.md)、[架构说明](./docs/architecture.md)以及 [`docs/features`](./docs/features/) 下对应的功能文档。
3. 创建范围明确的分支，并确保功能文档与实现保持一致。
4. 运行下方验证命令。
5. 提交 Pull Request，说明面向用户的变化；界面改动请附上截图。

请使用清晰的 Conventional Commit 风格，例如 `feat: add feed filters` 或 `fix: recover from an invalid feed response`。

## 验证

```bash
pnpm test --run
pnpm compile
pnpm lint
pnpm build
pnpm build:firefox
pnpm test:e2e
```

## 相关文档

- [架构说明](./docs/architecture.md)
- [基础功能闭环](./docs/features/basic-function-completion.md)
- [AI 文章总结与今日简报](./docs/features/ai-article-summary.md)
- [UI / UX 设计方向](./docs/features/ui-ux-redesign.md)

## 许可证

FluxFeed 基于 [MIT 许可证](./LICENSE)发布。
