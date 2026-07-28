<div align="center">
  <img src="./assets/flux-feed.svg" width="88" height="88" alt="FluxFeed logo">
  <h1>FluxFeed</h1>
  <p>A calm, local-first feed reader for the browser, with optional bring-your-own AI summaries.</p>

  <p>
    English · <a href="./README.zh-CN.md">简体中文</a> · <a href="./README.ja.md">日本語</a>
  </p>
</div>

> [!NOTE]
> FluxFeed is currently pre-release software. Install it from source and expect the data model and interface to continue evolving.

## Why FluxFeed?

FluxFeed brings RSS, Atom, and JSON Feed reading into a focused browser workspace. Subscriptions, articles, folders, preferences, and cached summaries stay in your browser. There is no FluxFeed account or hosted synchronization service.

AI is optional. If you enable it, FluxFeed connects directly to an OpenAI-compatible service that you configure. You keep control of the endpoint, model, API key, and when content is summarized.

## Features

- **Feed subscriptions:** add feed URLs directly or subscribe to feeds discovered on the current page.
- **Local library:** organize subscriptions in nested folders and move data with OPML import/export.
- **Focused reading:** search full article content, mark items read, star stories, and open originals in the background.
- **Responsive layout:** full three-column reading on wide screens, compact navigation on laptops, and single-pane reading on narrow windows.
- **Focus mode:** hide navigation and the article list when you want an uninterrupted reading surface.
- **Optional AI summaries:** generate a summary for one article manually or automatically above a configurable length.
- **Today's Briefing:** summarize today's articles in batches, browse topic groups, and jump back to the local story.
- **Appearance controls:** three color themes, system/light/dark modes, adjustable body text, and separate reading/interface fonts.
- **Multilingual UI:** English, Simplified Chinese, and Japanese.
- **Chrome and Firefox builds:** produced from the same WXT codebase.

## Install from source

### Requirements

- Git
- A current Node.js LTS release
- [pnpm](https://pnpm.io/)

```bash
git clone https://github.com/PenguinKingGT/FluxFeed.git
cd FluxFeed
pnpm install
```

### Chrome and Chromium browsers

```bash
pnpm build
```

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select `.output/chrome-mv3`.

### Firefox

```bash
pnpm build:firefox
```

1. Open `about:debugging#/runtime/this-firefox`.
2. Choose **Load Temporary Add-on**.
3. Select `.output/firefox-mv2/manifest.json`.

Temporary Firefox extensions are removed when Firefox closes.

## Development

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start WXT development mode for Chrome |
| `pnpm dev:firefox` | Start WXT development mode for Firefox |
| `pnpm build` | Build the Chrome MV3 extension |
| `pnpm build:firefox` | Build the Firefox extension |
| `pnpm zip` | Package the Chrome build |
| `pnpm zip:firefox` | Package the Firefox build |
| `pnpm compile` | Run TypeScript checks |
| `pnpm lint` | Run Oxlint |
| `pnpm test --run` | Run the Vitest suite once |
| `pnpm test:e2e` | Build Chrome and run Playwright extension tests |

## Configure AI summaries

AI features are disabled until you provide a compatible service:

1. Open **Settings → AI Summaries**.
2. Enter an OpenAI-compatible base URL ending in `/v1`, or the full Chat Completions endpoint.
3. Enter the model name accepted by that service.
4. Optionally save an API key and run **Test connection**.
5. Choose summary language, length, digest limit, and whether long articles should be summarized automatically.

FluxFeed currently supports the OpenAI-compatible Chat Completions protocol. Native Anthropic or Gemini APIs, custom request headers, streaming, and chat follow-ups are not supported.

### Request behavior

- Refreshing feeds never triggers AI requests.
- Today's Briefing only runs when you choose **Generate** or **Update**.
- Automatic article summaries are off by default.
- Digest work is chunked and has concurrency, input-size, output-size, and timeout limits.
- Completed summaries are cached locally.

## Privacy and permissions

- Feeds, articles, folders, settings, and generated summaries are stored locally in IndexedDB.
- The optional AI API key is stored separately in `browser.storage.local` and is not included in OPML exports or returned to the page state.
- AI requests are sent only from the extension background process to the endpoint you configure.
- Article excerpts leave the browser only when you manually request a summary or enable automatic summarization.
- FluxFeed does not include analytics or a hosted account service.

FluxFeed requests access to web pages because an RSS reader must discover and fetch feeds from arbitrary sites. The current manifest also declares storage, tabs, alarms, scripting, and context-menu permissions. Review [wxt.config.ts](./wxt.config.ts) and [the architecture notes](./docs/architecture.md) for the exact boundary.

## Keyboard shortcuts

Shortcuts work while the reader is focused and you are not typing in a form field.

| Key | Action |
| --- | --- |
| `J` / `K` | Next / previous article |
| `M` | Mark the current article as read |
| `S` | Star / unstar the current article |
| `V` | Open the original article in the background |
| `F` | Enter / exit focus mode |

## Project structure

```text
entrypoints/          WXT background, content, popup, and options entrypoints
components/           Reader, settings, digest, popup, and UI components
hooks/                Reusable React hooks
lib/                  Feed parsing, storage, AI, OPML, search, and shared types
store/                Zustand stores and runtime message client
public/               Extension icons, locales, licenses, and static assets
assets/               Source artwork
tests/unit/           Vitest unit and component tests
tests/e2e/            Playwright tests running the real Chrome extension
docs/                 Architecture, feature specifications, and implementation plans
```

FluxFeed uses WXT, React, TypeScript, Tailwind CSS, Radix-compatible UI primitives, Zustand, Dexie, Vitest, and Playwright.

## Contributing

Issues and pull requests are welcome.

1. Check the existing [issues](https://github.com/PenguinKingGT/FluxFeed/issues) before starting larger work.
2. Read [AGENTS.md](./AGENTS.md), [the architecture](./docs/architecture.md), and the relevant file under [`docs/features`](./docs/features/).
3. Create a focused branch and keep feature documentation aligned with the implementation.
4. Run the verification commands below.
5. Open a pull request describing the user-facing change and include screenshots for UI work.

Use clear Conventional Commit-style messages, such as `feat: add feed filters` or `fix: recover from an invalid feed response`.

## Verification

```bash
pnpm test --run
pnpm compile
pnpm lint
pnpm build
pnpm build:firefox
pnpm test:e2e
```

## Documentation

- [Architecture](./docs/architecture.md)
- [Core feature completion](./docs/features/basic-function-completion.md)
- [AI article summaries and Today's Briefing](./docs/features/ai-article-summary.md)
- [UI and UX design direction](./docs/features/ui-ux-redesign.md)

## License

FluxFeed is released under the [MIT License](./LICENSE).
