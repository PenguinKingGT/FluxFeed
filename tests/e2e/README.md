# 浏览器扩展测试

## 运行

首次运行或业务代码变更后，使用 `pnpm test:e2e` 构建 Chrome 扩展并运行全套测试。已有最新构建时，可以直接运行 Playwright：

```sh
pnpm exec playwright test
pnpm exec playwright test --grep 'configures Claude and generates'
pnpm exec playwright test --fully-parallel --workers=3 --repeat-each=2 --retries=1
```

每个用例必须能够单独运行；全套测试不能依赖声明顺序。重复运行用于发现状态泄漏，并行运行用于检查端口、截图、缓存和计数是否隔离。重试不是通过验收的替代品，应检查报告中的 flaky 项。

## 隔离边界

- `fixtures.ts` 使用 Playwright 的测试级 fixture，为每个测试、重复运行和重试创建全新的持久化浏览器上下文；IndexedDB、扩展凭据和界面偏好不与其他用例共享。
- `fixture-server.ts` 为每个用例启动独立的本地 HTTP 服务，分配独立端口；AI 请求计数、失败开关和原生供应商请求记录属于这个服务实例。
- 上下文在 finally 中关闭，随后关闭本地服务；用例失败也必须释放资源。不要将浏览器或可变服务状态提升到 beforeAll 或模块全局。
- 前置订阅通过 `extension.addFeed()` 使用既有 FEED_ADD 消息创建，前置偏好通过 `extension.configureSettings()` 使用既有 SETTINGS_UPDATE 消息保存。具体用例必须显式声明所需的语言、AI 配置、未读筛选和文章数据。
- 准备消息由扩展来源的专用页面发送。该页面阻止应用脚本加载，避免挂载阅读器产生异步读写；不增加生产环境测试接口，不直接操作数据库。只轮询后台就绪的读取消息，不能自动重试添加订阅等写入操作。
- 创建、修改、持久化等属于用例验证目标的步骤仍通过真实界面执行，不要用准备函数代替被测交互。

## 等待与产物

- 用可观察状态、Playwright 自动等待和 expect.poll 等待完成，不用固定 sleep 隐藏竞态。
- 截图使用 `extension.outputPath(filename)`，由 Playwright 按用例、重复次数和重试分配目录；不要写共享的 `/tmp` 固定路径。
- `test-results/` 和 `playwright-report/` 是本地产物，包含截图及运行结果，不提交到版本库。需要保留检查材料时，从对应测试输出目录收集。
