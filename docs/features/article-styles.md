# 文章样式

## 使用方式

在“设置 → 外观 → 文章样式”选择排版。切换即时生效并保存到本地；刷新或打开其他文章后沿用此选择。

提供九套样式：

- 原始：沿用现有的正文样式，为默认选择。
- Vue 风格：绿色链接与列表标记、浅色引用块、细分隔线和轻量代码块，参考 [Typora Vue 主题](https://github.com/blinkfox/typora-vue-theme) 的文档阅读风格，自行实现适用于 RSS HTML 的样式。
- GitHub：蓝色链接、带分隔线的标题、灰色代码背景和带边框表格。
- 书刊：居中的二级标题、更宽松的段落节奏、酒红色细节和书刊式引用。
- Lightmind：替换原“简约”，适配 [Typora Lightmind](https://theme.typora.io/theme/Lightmind/) 的森林绿标题与链接、雾绿引用、绿色表头和深海军蓝代码块；深色版使用加亮绿色。正文画布沿用阅读器背景。

- Drake：适配 [Drake](https://theme.typora.io/theme/Drake/) 默认浅色与 Drake Dark，珊瑚红 / 蓝色强调、居中主标题、平直深灰代码块和浅色引用。
- Purple：适配 [Purple](https://theme.typora.io/theme/Purple/)，紫色标题边线、青绿链接、浅紫行内代码和轻量引用；补充 FluxFeed 深色版本，保留相同层级。
- Ursine：适配 [Ursine](https://theme.typora.io/theme/Ursine/) 的 Polar / Umbra，浅色红色链接、深色青蓝链接、紧凑正文和内缩引用栏。
- Lapis：适配 [Lapis](https://theme.typora.io/theme/Lapis/) 的浅 / 深色版本，蓝色标签式二级标题、宽松列表和冷色引用及表格。

每套样式覆盖标题、段落、链接、嵌套有序 / 无序列表、引用、行内代码、代码块、表格、图片与图注。分隔线使用安全的 `hr` 标签。

## 边界

- 文章主题不再添加最外层背景或 padding，正文与标题共用阅读栏的宽度及边距；画布背景由界面配色控制。引用、代码块、表格等内容元素保留自己的底色和内边距。
- 文章样式与界面配色、明暗模式、阅读字体和正文字号独立。只修改 `.reader-prose` 内的排版，不改变文章列表、文章大标题、工具栏和 AI 摘要。
- 所有样式支持浅色、深色与跟随系统；浅色与深色分别提供可读的链接和代码配色。
- 长代码和宽表格在自身容器内横向滚动，避免撑宽阅读栏；切换样式不修改源 HTML，也不重新请求 Feed 或 AI。
- Lightmind 保留 `minimal` 持久化值，旧“简约”选择直接应用新效果，不新增设置项或迁移；只在设置中显示 Lightmind 名称。
- 设置字段 `articleStyle` 接受 `default`、`vue`、`github`、`editorial`、`minimal`、`drake`、`purple`、`ursine`、`lapis`。旧设置缺失该字段或出现未知值时使用 `default`，不需要数据库结构迁移。
- Lightmind 按 [SunMoonTrain/LightMindTheme](https://github.com/SunMoonTrain/LightMindTheme) 的 MIT 许可适配，许可随扩展打包于 `public/licenses/Lightmind-MIT.txt`。只移植文章 HTML 可用的排版，不引入 Typora 编辑器、告警、公式或 Mermaid 运行时；阅读字体与字号继续由用户设置控制，代码字体优先使用本机 JetBrains Mono 并回退现有等宽字体。
- 样式均内置于扩展，不加载外部 CSS、脚本或字体。Feed HTML 继续经过同一清洗模块，样式名经白名单规范化后才进入页面。

## 验证

单元测试覆盖旧设置与无效值回退、独立保存、保存失败保持原值、HTML 清洗和样式切换保留原文。浏览器测试覆盖九套样式的浅色 / 深色显示、正文内元素、设置选择与正文显示同步、刷新持久化及窄屏代码 / 表格滚动。Lightmind 与新增四种主题还验证浅色 / 深色 / 390px 窄屏下根容器 padding 为 0、背景透明，正文实际宽度与阅读栏可用宽度一致。

## 代码高亮

- 正文在清洗后使用 Highlight.js core 与按需注册的语法，为代码块生成着色标记。支持 JavaScript、TypeScript、CSS、HTML / XML、JSON、Python、Shell、SQL、YAML、Java、C++、C#、Go、Rust。
- Feed 中 `language-*`、`lang-*` 或 `brush: *` 的代码语言标记先转为独立提示，再移除全部源 CSS 类；无标记的代码在限定语言集合内自动识别。
- 原始样式的深色代码背景使用浅色语法颜色；Lightmind 的代码块在两种模式下均采用对应的深海军蓝底和 One Dark 配色，其余文章样式随明暗模式匹配。高亮不改变代码块布局、缩进、换行和横向滚动，也不处理行内代码。
- 单块最多高亮 20,000 字符，每篇最多 20 块且总计不超过 100,000 字符；超出范围、未知语言、显式纯文本及语法处理失败时保留可读原文。
- 只把代码的纯文本交给高亮库，生成结果再次限制为 span 与 class；代码内容不会作为脚本执行，不加载远程语法或资源。

## Typora 适配来源

正文样式按扩展支持的安全 HTML 元素适配，不加载 Typora 界面 CSS、编辑器、远程字体或脚本。保留用户字体与字号；必要时略微加深浅色链接以提高对比度。Purple 的深色配色为本项目补充适配，不宣称是上游提供的版本。

| 样式 | 上游 | 随扩展打包的许可 |
| --- | --- | --- |
| Drake | [liangjingkanji/DrakeTyporaTheme](https://github.com/liangjingkanji/DrakeTyporaTheme) | `public/licenses/Drake-MIT.txt` |
| Purple | [hliu202/typora-purple-theme](https://github.com/hliu202/typora-purple-theme) | `public/licenses/Purple-MIT.txt` |
| Ursine | [noatpad/typora-theme-ursine](https://github.com/noatpad/typora-theme-ursine) | `public/licenses/Ursine-MIT.txt` |
| Lapis | [YiNNx/typora-theme-lapis](https://github.com/YiNNx/typora-theme-lapis) | `public/licenses/Lapis-MIT.txt` |

新增四种样式集中在 `entrypoints/typora-article-styles.css`；设置值经同一白名单读取、保存，现有五种选择及 `minimal` 的 Lightmind 兼容不变。无需迁移数据库或新增浏览器权限。
