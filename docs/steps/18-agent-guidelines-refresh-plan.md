# Agent 开发规范更新计划

## 背景

现有 `AGENTS.md` 创建于测试体系、AI 总结、多主题、双字体、响应式布局和三语 README 落地之前，包含不存在的文档路径，并错误描述项目尚未配置测试运行器。

## 目标

让后续开发代理基于当前真实架构、命令、测试体系和安全边界工作，避免错误路径、遗漏测试、破坏 AI 凭据隔离或只更新单一语言。

## 实施内容

1. 用当前目录结构替换过期的项目结构说明。
2. 删除 `docs/PLAN.md`、`docs/DESIGN.md` 和 `docs/ui/` 等不存在的引用。
3. 补充 Vitest、Playwright、Chrome/Firefox 构建和分层验证命令。
4. 记录语义主题 Token、阅读/界面字体角色和响应式布局约束。
5. 记录 Runtime、IndexedDB、AI API Key 和外部 AI 请求的安全边界。
6. 要求英文、简体中文和日文资源同步维护。
7. 要求重要用户能力、安装、权限与隐私变化同步更新三份 README。
8. 修正 Git 历史不可用和测试目录仍属未来计划等错误描述。
9. 同步更新架构文档中的 Chrome 与 Firefox 后台运行边界。

## 验收标准

- `AGENTS.md` 中引用的本地路径全部存在。
- 命令与 `package.json` scripts 一致。
- 测试说明与当前 `tests/unit/`、`tests/e2e/` 一致。
- AI 安全边界与 `docs/architecture.md` 一致。
- README 三语同步要求与 `docs/features/open-source-documentation.md` 一致。
- 文件使用 UTF-8 without BOM。
- `git diff --check` 通过。
