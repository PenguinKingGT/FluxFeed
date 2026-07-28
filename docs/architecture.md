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
