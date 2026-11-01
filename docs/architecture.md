# FluxFeed 架构说明

## 运行边界

- Options 和 Popup 使用 React、TypeScript、Zustand 与 WXT。
- Chrome MV3 Service Worker 与 Firefox 后台运行时负责 Feed 请求、数据库写入、浏览器 API 和外部 AI 请求。
- IndexedDB 通过 Dexie 保存订阅、文章、目录、普通设置和今日简报。
- `browser.storage.local` 只保存不应随普通设置返回页面的 AI API Key。

## 设置读写与确认

- `lib/settings/settings-values.ts` 补齐旧设置的默认字段，并按 `SettingsPatch` 合并顶层和嵌套 AI 字段。AI 表单只发送变化字段，不发送从旧 props 展开的整份配置；完整旧消息仍可作为完整 patch 处理。
- 普通设置读取不写数据库；缺失字段只在返回视图中补齐。初始化仅在 settings 写事务内创建不存在的 global 记录，已存在记录保持原样，无 schema 迁移。
- `saveSettings` 在 settings 写事务内读取最新值、合并 patch、规范化合并后的 AI 偏好并持久化，避免同连接或不同连接的部分更新相互覆盖。`SETTINGS_UPDATE` 成功响应在 data.settings 中返回实际保存值，不包含专用凭据。
- 每个入口的 settings Store 按调用顺序串行执行加载、保存和界面偏好应用，避免响应乱序或异步语言切换覆盖较新请求。只有成功确认后才更新共享设置状态；旧的无数据成功回执兼容为对最新确认状态合并 patch。加载失败保留确认值，保存失败不应用失败 patch，后续操作可继续并清除旧错误。
- AI 文本框在编辑过程中保留本地草稿，避免保存回执的 trim 或延迟覆盖正在输入的字符、空格；失焦后展示当前确认值，供应商切换重置对应草稿。该草稿不是持久设置，也不包含 API Key。

## 后台 Feed 自动发现

`fetchFeed` 收到 HTML 时，使用 `discoverFeedLinks` 提取候选 Feed，并继续请求第一个有效候选。发现逻辑使用随扩展打包的 `htmlparser2` 标签事件，不依赖 DOMParser、window 或 document，不构建浏览器 DOM、不执行页面脚本或加载 HTML 中的资源，因此可直接在 Chrome MV3 Service Worker 和 Firefox 后台运行，无需离屏页面或新增权限。

候选按文档顺序保留 RSS、Atom、JSON Feed 的 HTTP(S) 链接；解析属性实体和相对地址，跳过无效地址及非 HTTP(S) 协议，忽略注释、脚本、样式和 template 内的伪链接。单个无效候选不阻止后续发现。内容脚本对当前已打开网页的检测继续使用现有页面 DOM。抓取及整条 HTML 发现链共用 30 秒期限和 AbortSignal；请求挂起或正文不结束时均稳定返回失败。每次响应最多读取 20 MiB 解压后的字节，同时检查 Content-Length 和实际流量，超限立即停止读取。最多跟随 5 次发现链接（含初始页面最多 6 次 fetch），去除片段后的请求 URL 和重定向最终 URL 都纳入环路检查；相对链接以最终响应 URL 为基准。HTTP 重定向继续使用浏览器 fetch 的内置策略及重定向上限。

所有退出路径释放未消费的响应体，不等待底层取消 Promise；外层期限也约束不响应 AbortSignal 的适配器，晚返回的响应只清理、不继续发现或入库。错误通过稳定代码跨 Runtime 边界，在 Options/Popup 中映射为中英日提示，保留手动重试入口，不自动重试。同步解析受响应体积约束，JavaScript 期限检查无法抢占已经执行中的同步解析。

## 正文格式解析

JSON Feed 将 HTML、纯文本和摘要按优先级映射到内部 HTML 正文；纯文本转义 HTML 特殊字符并将换行转换为 br，禁止将原文中的标签或实体当成标记。纯文本回退标题使用原文而非已转义 HTML。

Atom 单次使用 fast-xml-parser 的 preserveOrder 模式解析，不依赖 DOMParser。标量元数据读取纯文本；text 正文转义、html 解码后的正文直接保留、xhtml 按有序节点重新序列化，文字和属性重新转义，保留行内标签前后的文字顺序及代码空白。只在 XHTML 序列化时去除元素前缀，Atom 字段仍保留 namespace 区别，避免 media:content 被当作 content。未声明类型的历史 CDATA HTML 保留兼容行为。上述转换不是安全清洗：所有正文仍在阅读器现有清洗边界处理，后台不引入 DOM 或高亮依赖。数据库结构和已有条目不迁移，不回填旧缓存正文。

## 文章列表虚拟窗口

ArticlePanel 为 TanStack Virtual 提供固定的初始矩形估计；ResizeObserver 的真实测量随后接管。虚拟行暂时为空（未测量或隐藏）时只生成至多 12 行，绝不退回 articles.map 全量渲染；空列表不生成行。实际滚动区域仍保留完整估计高度和测量能力，焦点跟随继续使用 scrollToIndex 与行挂载后的恢复逻辑。数据查询范围不因此截断，搜索和键盘导航仍使用完整列表。

## 文章查询与刷新查重

- `lib/db/article-query.ts` 统一文章列表查询。订阅和目录查询先通过元数据索引确定订阅范围，再使用 `feedId` 索引读取对应正文，不加载无关订阅的文章。
- 全局列表使用 `publishedAt` 索引，日期窗口为起点包含、终点不包含；过滤后在集合上执行正向 offset/limit，再获取结果。未指定 limit 时仍返回完整匹配集合，保留全文搜索和文章导航语义。
- 来源索引不能同时提供跨订阅日期排序，因此来源查询在限定范围内筛选、排序和分页；相同发布时间保持文章主键降序，与原全局日期索引反向遍历一致。不承诺来源分页只读取一页正文。
- 网络请求位于写事务外；`commitFeedRefresh` 在包含 feeds/articles 的写事务内确认订阅存在，通过既有 `[feedId+guid]` 索引只读取该订阅的 GUID 键，过滤已存及本批重复 GUID 后插入文章，并一并更新刷新元数据。首次订阅也使用同一提交入口。
- 事务串行化查重与插入，包括不同数据库连接的并发提交；不合并 HTTP 请求，返回实际插入数量。重复条目保留首次出现的内容，已存文章的 ID、阅读、收藏和 AI 缓存不被覆盖。不同订阅可保存相同 GUID，查重不读取已有正文。
- 已删除订阅的迟到结果丢弃并返回新增数 0，任何写入失败回滚整个提交。消息结构、数据库版本和刷新并发上限不变；不增加唯一索引或迁移，已有重复历史数据保留，避免自动删除破坏状态及文章引用。

## 阅读器手动刷新

`ReaderLayout.refreshReader` 协调 Feed 抓取、订阅元数据更新，以及当前文章列表和未读数重读。Feed 页面使用点击时的 feedId，其余视图刷新全部；收尾后的文章查询不传旧筛选快照，使用 Store 当前来源和搜索条件。文章 Store 仅由最新查询发布结果，保留结果内的选中 ID、清除已失效选择；未读查询也使用请求序号，防止初始迟到计数覆盖刷新结果。

后台刷新返回 `FeedRefreshResult { count, failedCount }`。HTTP/解析失败增加失败数；批量刷新捕获单个存储异常并继续其余任务，等所有 worker 结束才返回。Runtime 保留既有 data.count，新增 data.failedCount；失败数大于 0 时返回 success=false 和稳定的 FEED_REFRESH_FAILED，而非把失败当成新增 0 篇的成功。Alarm 同样接收统计，但不展示页面错误。数据库和权限不变。

Feed Store 无论成功或部分失败都重读元数据，再保留刷新错误；阅读器继续重读文章和未读数以展示成功提交的部分。错误通过既有列表提示显示（稳定刷新错误使用中英日文案），文章/计数查询失败也在列表显示。按钮加载覆盖整个协调流程，通过 ref 防止重复触发；异常或正常失败后均恢复重试入口，不自动重试。

## 文章清理的提交边界

过期与超额清理先在事务外选取候选，最终通过 `lib/db/article-pruning.ts` 在 articles 写事务内重读候选，确认仍为已读且未收藏后删除。过期清理还重新检查 fetchedAt 截止时间。候选选取后已提交的收藏、取消已读或更新抓取时间不会被旧快照覆盖；事务序列化最终检查与删除，避免检查后再次发生写入交错。已失效候选跳过，本轮不扩大删除名单，后续清理重新计算；未读和收藏保护优先于数量上限。

## AI 数据流

1. Options 阅读页按 HTML 内容缓存当前文章的安全正文；需要 AI 时懒提取保留段落的纯文本、Unicode 字符数和分块计划，面板与自动摘要复用同一结果，再按既有边界截断消息。
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

今日简报的并发 mapper 在首个终止性失败后停止领取后续批次，等待所有已开始的请求收尾才向调用方抛出首个错误，避免页面重试时遗留付费任务仍在运行。每个 worker 都处理自身拒绝；完整成功时仍按输入顺序返回，并发上限 2 不变。单批超时或无效输出继续由编排层降级，不作为终止性失败；不增加重试或改变 SDK 超时策略。

重构保留现有数据库结构和消息操作。AI module 的行为测试通过公开 seam 运行；另以真实 IndexedDB 和真实 SDK 配合本地响应验证缓存读写、失败保留和凭据隔离。

## 原生供应商与凭据

- `AiPreferences.provider` 使用 `openai-compatible`、`google` 或 `anthropic`；缺失字段保留旧兼容语义。供应商默认地址与规范化规则集中在 `provider-settings.ts`，UI 不导入 SDK。
- Native adapter 由 SDK 构造 Gemini `generateContent` 或 Claude Messages 路径及鉴权头，继续经过同一个受限 HTTP implementation。Chrome 扩展后台调用 Claude 时明确设置直接浏览器访问头。
- Key 仍仅存于 `browser.storage.local`。兼容模式沿用原 key，Gemini/Claude 使用独立 namespace。凭据消息携带供应商作用域，只返回 presence flag；生成任务按本次配置读取对应 Key。
- 页面切换供应商会重置地址、模型和未保存的 Key 输入。Key 控件以供应商作为 React key，异步凭据状态不会串到另一个供应商。
- 单篇与简报缓存指纹均包含供应商。单篇分段、费用约束和简报降级规则继续由相同 AI module 执行。

## 文章排版

`lib/reader/article-styles.ts` 定义可用的正文样式与旧数据回退规则。`Settings.articleStyle` 通过现有后台设置消息保存；无新增索引，无数据库版本迁移。

`ReadingPane` 通过 `prepareArticleContent` 按 HTML 值 memoize 当前文章，只清洗一次；`ArticleContent` 接收该安全正文并缓存代码高亮，再为正文根节点设置规范化的 `data-article-style`。`entrypoints/article-styles.css` 的规则全部限制在正文容器内；原始样式不启用新增规则。样式选择器仅放在外观设置中，阅读页应用同一份持久化偏好。切换排版只改变 CSS，不触发内容请求或 AI 调用。

AI 输入在面板隐藏或 AI 未配置时不提取；首次需要时从已清洗 HTML 提取纯文本，缓存字符数和分块计划。缓存只属于当前正文对象，没有跨文章的全局 Map，不长期保留已离开的长文章或 DOM。收藏、已读、摘要状态和排版偏好变化不会重新清洗、提取或分块；正文变化重建对象，隐藏后再显示可复用已计算的 AI 输入。阅读时间单独按正文和语言缓存。Unicode 计数逐码点遍历，不创建完整字符数组。后台仍独立校验消息和输入，页面缓存不替代安全校验。

代码高亮只在文章展示模块运行。`highlight-code.ts` 对清洗后的代码纯文本调用 Highlight.js，再次清洗生成标记；通用 HTML 清洗与后台文本提取不依赖高亮库。语言语法在扩展内按需打包，识别工作量有字符与块数上限。
