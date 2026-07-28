<div align="center">
  <img src="./assets/flux-feed.svg" width="88" height="88" alt="FluxFeed 标志">
  <h1>FluxFeed</h1>
  <p>安静、本地优先的浏览器订阅阅读器，并可选择接入自己的 AI 服务进行总结。</p>

  <p>
    <a href="./README.md">English</a> · 简体中文 · <a href="./README.ja.md">日本語</a>
  </p>
</div>

> [!NOTE]
> FluxFeed 目前仍处于发布前阶段。请从源码安装，数据模型和界面仍可能继续调整。

## 为什么选择 FluxFeed？

FluxFeed 把 RSS、Atom 和 JSON Feed 阅读整理成一个专注的浏览器工作区。订阅、文章、目录、偏好设置和已缓存的摘要都保存在浏览器本地，不需要 FluxFeed 账号，也没有官方托管的同步服务。

AI 完全可选。启用后，FluxFeed 会直接连接你配置的 OpenAI-compatible 服务。API 地址、模型、API Key 以及何时总结内容都由你控制。

## 功能

- **订阅管理：** 直接添加 Feed 地址，或订阅当前网页检测到的 Feed。
- **本地资料库：** 使用多级目录整理订阅，并通过 OPML 导入或导出数据。
- **专注阅读：** 搜索文章全文、标记已读、收藏文章，并在后台打开原文。
- **响应式布局：** 大屏显示完整三栏，笔记本使用紧凑导航，窄窗口切换为单栏阅读。
- **专注模式：** 阅读时隐藏导航和文章列表，获得更完整的正文空间。
- **可选 AI 摘要：** 手动总结单篇文章，或按照可配置的正文长度自动总结。
- **今日简报：** 分批整理当天文章、浏览主题分组，并从简报返回本地文章。
- **外观设置：** 三套配色、跟随系统/浅色/深色模式、正文字号，以及独立的阅读字体和界面字体。
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

在提供兼容服务前，AI 功能不会启用：

1. 打开**设置 → AI 总结**。
2. 输入以 `/v1` 结尾的 OpenAI-compatible 基础地址，或完整的 Chat Completions 地址。
3. 输入该服务接受的模型名称。
4. 根据需要保存 API Key，并点击**测试连接**。
5. 选择摘要语言、摘要长度、简报文章上限，以及是否自动总结长文章。

FluxFeed 当前只支持 OpenAI-compatible Chat Completions 协议，暂不支持 Anthropic 或 Gemini 原生协议、自定义请求头、流式输出和对话追问。

### 请求规则

- 刷新订阅不会触发 AI 请求。
- 今日简报只会在你点击**生成**或**更新**时运行。
- 单篇文章自动总结默认关闭。
- 简报生成设置了分批、并发、输入长度、输出长度和超时限制。
- 已完成的摘要会缓存在本地。

## 隐私与权限

- 订阅、文章、目录、设置和生成的摘要保存在本地 IndexedDB。
- 可选的 AI API Key 单独保存在 `browser.storage.local`，不会写入 OPML，也不会返回页面状态。
- AI 请求只由扩展后台进程发送到你配置的服务。
- 只有在你手动请求总结或开启自动总结后，文章摘录才会离开浏览器。
- FluxFeed 不包含数据分析服务，也没有官方托管账号。

FluxFeed 需要访问网页，是因为 RSS 阅读器必须从任意站点发现并抓取 Feed。当前 Manifest 还声明了浏览器存储、标签页、Alarm、脚本和右键菜单权限。具体权限和运行边界请查看 [wxt.config.ts](./wxt.config.ts) 与[架构说明](./docs/architecture.md)。

## 键盘快捷键

当阅读器处于焦点状态且你没有在表单中输入时，可以使用：

| 按键 | 操作 |
| --- | --- |
| `J` / `K` | 下一篇 / 上一篇 |
| `M` | 将当前文章标记为已读 |
| `S` | 收藏 / 取消收藏当前文章 |
| `V` | 在后台打开原文 |
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
