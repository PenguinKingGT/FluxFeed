# FluxFeed 架构说明

## 运行边界

- Options 和 Popup 使用 React、TypeScript、Zustand 与 WXT。
- Chrome MV3 Service Worker 与 Firefox 后台运行时负责 Feed 请求、数据库写入、浏览器 API 和外部 AI 请求。
- IndexedDB 通过 Dexie 保存订阅、文章、目录、普通设置和今日简报。
- `browser.storage.local` 只保存不应随普通设置返回页面的 AI API Key。

## AI 数据流

1. Options 页面从已加载文章中提取并截断纯文本。
2. 页面只把文章 ID 和受限文本发送给后台。
3. 后台重新读取本地文章与 AI 设置，校验范围和长度。
4. 后台从专用存储读取可选 API Key，并调用用户配置的 HTTP(S) 服务。
5. 输出经过结构校验和长度限制后写入 Dexie。
6. 页面只接收清洗后的结构化摘要，不接收 API Key。

AI 输出按不可信纯文本处理。任何文章 ID 导航都必须与本地输入集合核对。

## AI module 与 seam

- `lib/ai/ai-module.ts` 是后台 AI module 的公开 seam：`execute({ action, payload })` 接收不可信输入，返回稳定的成功结果或产品错误码。
- 后台入口在初始化时注入持久化、专用凭据存储、completion adapter 和时钟。通用消息处理器只转交 AI 操作，不再承担分段、缓存、日期校验或凭据读取。
- AI module 内部统一校验输入、读取当前配置、执行自动总结与部分处理规则、判断缓存，并在生成完成后持久化。任意 SDK、存储异常都在这个 seam 转为安全错误，不返回原始异常或服务响应。
- `lib/ai/completion.ts` 是内部 seam。生产 adapter 使用 Vercel AI SDK 的 `generateText`，按供应商选择 `@ai-sdk/openai-compatible`、`@ai-sdk/google` 或 `@ai-sdk/anthropic`；测试 adapter 提供确定性的模型结果。
- `lib/ai/ai-client.ts` 保留应用的 HTTP 安全策略：120 秒总超时、拒绝重定向、流式读取时限制响应为 1 MiB；请求序列化和协议解析交给 SDK。
- SDK 使用显式 provider，直接请求用户保存的地址，不使用 Vercel AI Gateway；关闭 SDK 自动重试与 telemetry。一次 completion 对应一次 HTTP 尝试，避免分段请求预算被隐式重试放大。
- 完整 endpoint 及查询参数保持兼容；以 `/v1` 结尾的基础地址追加 `/chat/completions`。空 Key 不发送 Authorization。
- 单篇与简报的编排分别保留在 `article-summary.ts` 和 `daily-digest.ts`；共享输出偏好放在 `summary-instructions.ts`，缓存摘要算法放在 `fingerprint.ts`。SDK 类型不进入页面状态和消息结果。

重构保留现有数据库结构和消息操作。AI module 的行为测试通过公开 seam 运行；另以真实 IndexedDB 和真实 SDK 配合本地响应验证缓存读写、失败保留和凭据隔离。

## 原生供应商与凭据

- `AiPreferences.provider` 使用 `openai-compatible`、`google` 或 `anthropic`；缺失字段保留旧兼容语义。供应商默认地址与规范化规则集中在 `provider-settings.ts`，UI 不导入 SDK。
- Native adapter 由 SDK 构造 Gemini `generateContent` 或 Claude Messages 路径及鉴权头，继续经过同一个受限 HTTP implementation。Chrome 扩展后台调用 Claude 时明确设置直接浏览器访问头。
- Key 仍仅存于 `browser.storage.local`。兼容模式沿用原 key，Gemini/Claude 使用独立 namespace。凭据消息携带供应商作用域，只返回 presence flag；生成任务按本次配置读取对应 Key。
- 页面切换供应商会重置地址、模型和未保存的 Key 输入。Key 控件以供应商作为 React key，异步凭据状态不会串到另一个供应商。
- 单篇与简报缓存指纹均包含供应商。单篇分段、费用约束和简报降级规则继续由相同 AI module 执行。

## 文章排版

`lib/reader/article-styles.ts` 定义可用的正文样式与旧数据回退规则。`Settings.articleStyle` 通过现有后台设置消息保存；无新增索引，无数据库版本迁移。

`ArticleContent` 先清洗 Feed HTML，再为正文根节点设置规范化的 `data-article-style`。`entrypoints/article-styles.css` 的规则全部限制在正文容器内；原始样式不启用新增规则。样式选择器仅放在外观设置中，阅读页应用同一份持久化偏好。切换排版只改变 CSS，不触发内容请求或 AI 调用。

代码高亮只在文章展示模块运行。`highlight-code.ts` 对清洗后的代码纯文本调用 Highlight.js，再次清洗生成标记；通用 HTML 清洗与后台文本提取不依赖高亮库。语言语法在扩展内按需打包，识别工作量有字符与块数上限。
