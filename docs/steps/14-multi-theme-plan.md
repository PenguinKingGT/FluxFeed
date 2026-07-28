# 多配色主题实施计划

## 背景

当前 `Settings.theme` 只表示跟随系统、浅色或深色，本质上是明暗模式。项目只有 Quiet Signal 一套配色，并通过 `:root` 与 `.dark` 两组语义颜色变量切换。

多主题需求应拆成两个独立维度：

1. 配色主题决定背景、表面、文字、边框、强调色和侧栏色彩。
2. 明暗模式继续决定跟随系统、浅色或深色。

这样既能保留当前默认体验和旧设置，也允许每套配色同时拥有完整的浅色与深色版本。

## 设计目标

1. 当前 Quiet Signal 配色保持完全不变，并作为默认主题。
2. 第一版提供三套差异明确、适合长时间阅读的主题，不把主题列表做成难以维护的颜色集合。
3. 每套主题同时支持浅色和深色，主题内只使用一个主要强调色。
4. Popup、Reader、Settings、弹窗和浮层统一使用语义颜色变量，不允许组件各自判断主题。
5. 切换后立即生效并持久保存，重新打开扩展后保持选择。
6. 正文排版、字体偏好、布局和业务状态语义不受主题切换影响。
7. 正文与弱化文字达到 WCAG AA，对正文尽量达到 AAA。

## 第一版主题

### 安静信号 `quiet-signal`

当前默认主题。暖纸张背景、深墨文字与琥珀强调色，强调编辑阅读感。浅色和深色 token 沿用现有值，不做视觉回归。

### 石墨 `graphite`

中性冷灰背景、石墨文字与克制蓝色强调色。信息边界更清晰，适合偏好现代工具感和较高对比度的用户。

| 模式 | 背景 | 正文 | 卡片 | 弱化文字 | 强调色 | 强调色文字 | 边框 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 浅色 | `#F3F5F7` | `#1B2229` | `#FAFBFC` | `#5D6873` | `#3F6FA5` | `#F7FAFF` | `#CDD5DC` |
| 深色 | `#12171C` | `#E8EDF2` | `#181E24` | `#A9B4BE` | `#76A3D2` | `#10253B` | `#303A43` |

### 林间 `forest`

柔和浅绿背景、墨绿色文字与森林绿强调色。整体低刺激，适合较长时间的中文阅读。

| 模式 | 背景 | 正文 | 卡片 | 弱化文字 | 强调色 | 强调色文字 | 边框 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 浅色 | `#F2F5EF` | `#19231C` | `#FAFBF7` | `#5C6A5F` | `#4F7758` | `#F7FBF6` | `#CDD6CD` |
| 深色 | `#101713` | `#E5EDE4` | `#171F19` | `#A7B4A8` | `#82AB88` | `#102318` | `#303B32` |

以上核心文字组合的对比度均达到 WCAG AA。实现时需为每组补齐 `popover`、`primary`、`muted`、`accent`、`destructive`、`input`、`ring`、`sidebar`、`chart` 和代码块 token。

## 数据模型与兼容策略

保留现有字段：

```ts
theme: 'system' | 'light' | 'dark'
```

新增字段：

```ts
colorTheme: 'quiet-signal' | 'graphite' | 'forest'
```

- `theme` 在界面中改称“明暗模式”，不做字段迁移，避免破坏现有消息与测试。
- `colorTheme` 默认值为 `quiet-signal`。
- 旧设置缺少 `colorTheme` 时由 `DEFAULT_SETTINGS` 自动补齐。
- 增加 `normalizeColorTheme`，未知值回退到 `quiet-signal`，防止未来删除或重命名主题后出现无样式状态。
- 不修改现有数据库表结构，仅扩展全局设置对象。

## 主题应用架构

1. 在根元素上同时维护两个状态：

   ```html
   <html data-color-theme="quiet-signal" data-theme="light">
   ```

2. `.dark` 继续作为 Tailwind `dark:` 变体入口，`data-theme` 保存解析后的实际明暗状态。
3. `data-color-theme` 只负责选择配色，不参与系统明暗监听。
4. 将 `applyTheme` 扩展为同时接收明暗模式与配色主题，或新增语义更明确的 `applyThemePreferences`。
5. 系统主题变化时只切换 `.dark` 和 `data-theme`，不得覆盖 `data-color-theme`。
6. Store 加载或更新设置后一次性应用两个维度，避免出现配色和模式短暂不同步。
7. CSS 使用语义 token，不在组件里增加 `if (colorTheme === ...)` 分支。

## CSS Token 组织

在 `entrypoints/shared.css` 中分离结构变量、字体变量和颜色变量：

```css
:root,
html[data-color-theme='quiet-signal'] {
  /* Quiet Signal Light */
}

html[data-color-theme='quiet-signal'].dark {
  /* Quiet Signal Dark */
}

html[data-color-theme='graphite'] {
  /* Graphite Light */
}

html[data-color-theme='graphite'].dark {
  /* Graphite Dark */
}

html[data-color-theme='forest'] {
  /* Forest Light */
}

html[data-color-theme='forest'].dark {
  /* Forest Dark */
}
```

- 字体、圆角和布局变量不跟随配色变化。
- 将代码块的固定背景色提升为 `--code-background` 与 `--code-foreground`。
- 审计现有硬编码颜色。主题预览色、遮罩透明黑和必要的中性控件色可以保留专用值，其余界面颜色统一改为语义 token。
- 切换时仅对颜色和边框做 160-200ms 过渡，并遵循 `prefers-reduced-motion`。
- 每个页面同一时刻只能使用一套主题，不允许局部区域自行切换配色。

## 设置页交互

外观区拆成两个连续设置：

1. **配色主题**
   - 使用三张可访问的单选卡片。
   - 每张卡片展示真实的背景、侧栏、正文、卡片和强调色缩略预览。
   - 卡片名称为“安静信号”“石墨”“林间”，安静信号标注“默认”。
   - 选中状态同时使用边框、单选标记和文本，不只依赖颜色。

2. **明暗模式**
   - 使用紧凑的“跟随系统 / 浅色 / 深色”三段式控件。
   - 不再把明暗模式伪装成三套颜色主题。

主题和模式切换都即时保存。字体设置与阅读预览保留现有位置和行为。

## 实施步骤

1. 更新 `docs/features/ui-ux-redesign.md`，记录配色主题与明暗模式的产品语义和第一版主题范围。
2. 在 `lib/types/settings.ts` 与 `lib/db/defaults.ts` 增加 `ColorTheme` 和默认值。
3. 新增主题注册表，集中维护主题 ID、可用顺序、默认主题和归一化逻辑。
4. 重构 `lib/theme/theme-controller.ts`，同时应用 `data-color-theme`、解析后的 `data-theme` 和 `.dark`，保持系统监听器只有一个。
5. 更新 `store/settingsStore.ts`，在加载和成功保存后统一应用主题偏好，并兼容缺少新字段的旧设置。
6. 重组 `entrypoints/shared.css` 的语义颜色变量，保留 Quiet Signal 原值，补齐石墨和林间的浅色、深色 token。
7. 清理会绕过主题 token 的界面硬编码颜色，代码块改用主题语义变量。
8. 重构 `AppearanceSection`，增加配色主题卡片，将现有主题选择器改为明暗模式控件。
9. 补充中、英、日文案，使用面向用户的主题名称和简短场景描述。
10. 更新单元测试和 E2E 测试，验证即时切换、系统模式、旧设置回退、刷新持久化和真实计算样式。
11. 执行完整测试、类型检查、Lint、Chrome 与 Firefox 构建，并手动检查 Popup、Reader、Settings、弹窗、长文章和代码块。

## 测试计划

### 单元测试

- `quiet-signal` 是默认配色。
- 旧设置没有 `colorTheme` 时自动回退到默认主题。
- 非法主题 ID 被归一化为默认主题。
- 更新配色后根节点 `data-color-theme` 立即变化。
- 切换系统明暗不会改变 `data-color-theme`。
- 重复应用系统模式不会注册重复监听器。
- 设置页两个 radiogroup 分别只更新 `colorTheme` 和 `theme`。
- 保存失败时继续显示最后一次确认成功的主题。

### E2E 与视觉检查

- 依次选择三套主题，验证根节点属性和背景、正文、侧栏、强调色的计算样式发生变化。
- 每套主题分别检查浅色与深色，共六种组合。
- 刷新 Options 与重新打开 Popup 后保持选择。
- 检查文章正文、选中行、未读状态、按钮、输入框、下拉菜单、弹窗、代码块和焦点环。
- 在 400px Popup、窄屏 Reader、普通笔记本和大屏布局中检查主题预览与设置控件。
- 对正文、弱化文字、按钮文字、错误状态和焦点状态执行对比度检查。

## 验收标准

- 默认安装和旧版本升级后的视觉与当前 Quiet Signal 一致。
- 配色主题与明暗模式可独立组合，共支持六种明确状态。
- 所有扩展页面同步使用同一主题，切换无需刷新。
- 系统模式可跟随操作系统实时切换，且不丢失所选配色。
- 主题切换不改变字体、字号、布局、文章状态或数据。
- 所有主题的正文、控件、边框、焦点和错误状态清晰可辨。
- 不新增运行时网络请求或图片资源。
- `pnpm test`、`pnpm compile`、`pnpm lint`、`pnpm build` 和 `pnpm build:firefox` 全部通过。

## 第一版不包含

- 用户自定义颜色或取色器。
- 从网页自动提取主题。
- 按 Feed、目录或文章单独设置主题。
- 定时自动切换配色。
- 主题市场、远程下载或同步服务。
