<div align="center">
  <img src="./assets/flux-feed.svg" width="88" height="88" alt="FluxFeed ロゴ">
  <h1>FluxFeed</h1>
  <p>静かでローカルファーストなブラウザ用フィードリーダー。任意で自分の AI サービスを使った要約にも対応します。</p>

  <p>
    <a href="./README.md">English</a> · <a href="./README.zh-CN.md">简体中文</a> · 日本語
  </p>
</div>

> [!NOTE]
> FluxFeed は現在プレリリース段階です。ソースからインストールして使用してください。データモデルや画面は今後も変更される可能性があります。

## FluxFeed を選ぶ理由

FluxFeed は RSS、Atom、JSON Feed を読むための集中しやすいワークスペースをブラウザ内に提供します。購読、記事、フォルダー、設定、キャッシュ済みの要約はブラウザ内に保存されます。FluxFeed アカウントや公式のクラウド同期サービスはありません。

AI は完全に任意です。有効にすると、FluxFeed はユーザーが設定した OpenAI 互換サービスへ直接接続します。エンドポイント、モデル、API キー、要約を実行するタイミングはすべてユーザーが管理できます。

## 主な機能

- **フィード購読：** URL を直接追加するか、現在のページで検出されたフィードを購読できます。
- **ローカルライブラリ：** 多階層フォルダーで購読を整理し、OPML でインポート・エクスポートできます。
- **集中できる読書画面：** 記事全文の検索、既読、スター、バックグラウンドでの原文表示に対応します。
- **レスポンシブレイアウト：** 大画面では 3 カラム、ノート PC ではコンパクトナビゲーション、狭い画面では 1 ペイン表示になります。
- **フォーカスモード：** ナビゲーションと記事一覧を隠し、本文だけに集中できます。
- **任意の AI 要約：** 記事ごとに手動で要約するか、設定した本文文字数以上の記事を自動要約できます。
- **今日のブリーフィング：** 当日の記事を分割して整理し、トピック別に確認して元の記事へ移動できます。
- **外観設定：** 3 種類の配色、システム/ライト/ダークモード、本文サイズ、読書用と UI 用の個別フォント設定を備えています。
- **多言語 UI：** 英語、簡体字中国語、日本語に対応します。
- **Chrome と Firefox：** 同じ WXT コードベースから両ブラウザ向けにビルドできます。

## ソースからインストール

### 必要な環境

- Git
- 現行の Node.js LTS
- [pnpm](https://pnpm.io/)

```bash
git clone https://github.com/PenguinKingGT/FluxFeed.git
cd FluxFeed
pnpm install
```

### Chrome および Chromium 系ブラウザ

```bash
pnpm build
```

1. `chrome://extensions` を開きます。
2. **デベロッパーモード**を有効にします。
3. **パッケージ化されていない拡張機能を読み込む**を選びます。
4. `.output/chrome-mv3` を指定します。

### Firefox

```bash
pnpm build:firefox
```

1. `about:debugging#/runtime/this-firefox` を開きます。
2. **一時的なアドオンを読み込む**を選びます。
3. `.output/firefox-mv2/manifest.json` を指定します。

Firefox の一時拡張機能は、Firefox を終了すると削除されます。

## 開発コマンド

| コマンド | 用途 |
| --- | --- |
| `pnpm dev` | Chrome 向け WXT 開発モードを開始 |
| `pnpm dev:firefox` | Firefox 向け WXT 開発モードを開始 |
| `pnpm build` | Chrome MV3 拡張機能をビルド |
| `pnpm build:firefox` | Firefox 拡張機能をビルド |
| `pnpm zip` | Chrome ビルドをパッケージ化 |
| `pnpm zip:firefox` | Firefox ビルドをパッケージ化 |
| `pnpm compile` | TypeScript の型チェックを実行 |
| `pnpm lint` | Oxlint を実行 |
| `pnpm test --run` | Vitest を 1 回実行 |
| `pnpm test:e2e` | Chrome をビルドして Playwright の拡張機能テストを実行 |

## AI 要約の設定

互換サービスを設定するまで AI 機能は無効です。

1. **設定 → AI 要約**を開きます。
2. `/v1` で終わる OpenAI 互換のベース URL、または完全な Chat Completions エンドポイントを入力します。
3. サービスが受け付けるモデル名を入力します。
4. 必要に応じて API キーを保存し、**接続テスト**を実行します。
5. 要約言語、長さ、ブリーフィングの記事上限、自動要約の有無を設定します。

現在対応しているのは OpenAI 互換 Chat Completions プロトコルです。Anthropic/Gemini のネイティブ API、カスタムリクエストヘッダー、ストリーミング、チャット形式の追加質問には対応していません。

### リクエストのルール

- フィード更新によって AI リクエストが発生することはありません。
- 今日のブリーフィングは、ユーザーが**生成**または**更新**を選んだときだけ実行されます。
- 記事の自動要約は初期状態で無効です。
- ブリーフィングには分割数、同時実行数、入力・出力サイズ、タイムアウトの制限があります。
- 完成した要約はローカルにキャッシュされます。

## プライバシーと権限

- フィード、記事、フォルダー、設定、生成された要約は IndexedDB にローカル保存されます。
- 任意の AI API キーは `browser.storage.local` に分離して保存され、OPML やページの状態には含まれません。
- AI リクエストは拡張機能のバックグラウンドプロセスから、設定したエンドポイントだけに送信されます。
- 記事の抜粋がブラウザ外へ送られるのは、手動で要約を依頼した場合、または自動要約を有効にした場合だけです。
- FluxFeed にはアクセス解析や公式のホスト型アカウントサービスは含まれていません。

RSS リーダーは任意のサイトからフィードを検出・取得する必要があるため、FluxFeed はウェブページへのアクセス権限を要求します。現在の Manifest では、ブラウザストレージ、タブ、Alarm、スクリプト、コンテキストメニューの権限も宣言されています。正確な境界は [wxt.config.ts](./wxt.config.ts) と[アーキテクチャ](./docs/architecture.md)を確認してください。

## キーボードショートカット

リーダーにフォーカスがあり、フォームへ入力していないときに使用できます。

| キー | 操作 |
| --- | --- |
| `J` / `K` | 次の記事 / 前の記事 |
| `M` | 現在の記事を既読にする |
| `S` | 現在の記事にスターを付ける / 外す |
| `V` | 原文をバックグラウンドで開く |
| `F` | フォーカスモードを開始 / 終了 |

## プロジェクト構成

```text
entrypoints/          WXT のバックグラウンド、コンテンツ、Popup、Options エントリーポイント
components/           リーダー、設定、ブリーフィング、Popup、UI コンポーネント
hooks/                再利用可能な React Hooks
lib/                  フィード解析、ストレージ、AI、OPML、検索、共通型
store/                Zustand Store と Runtime メッセージクライアント
public/               拡張機能アイコン、ロケール、ライセンス、静的アセット
assets/               元のデザインアセット
tests/unit/           Vitest のユニットテストとコンポーネントテスト
tests/e2e/            実際の Chrome 拡張機能を使う Playwright テスト
docs/                 アーキテクチャ、機能仕様、実装計画
```

FluxFeed は WXT、React、TypeScript、Tailwind CSS、Radix 互換 UI、Zustand、Dexie、Vitest、Playwright を使用しています。

## コントリビューション

Issue と Pull Request を歓迎します。

1. 大きな変更を始める前に、既存の [Issues](https://github.com/PenguinKingGT/FluxFeed/issues) を確認してください。
2. [AGENTS.md](./AGENTS.md)、[アーキテクチャ](./docs/architecture.md)、[`docs/features`](./docs/features/) 内の関連ドキュメントを読んでください。
3. 目的を絞ったブランチを作成し、機能ドキュメントと実装を一致させてください。
4. 下記の検証コマンドを実行してください。
5. ユーザー向けの変更内容を説明した Pull Request を作成し、UI の変更にはスクリーンショットを添付してください。

コミットメッセージには、`feat: add feed filters` や `fix: recover from an invalid feed response` のような明確な Conventional Commit 形式を推奨します。

## 検証

```bash
pnpm test --run
pnpm compile
pnpm lint
pnpm build
pnpm build:firefox
pnpm test:e2e
```

## 関連ドキュメント

- [アーキテクチャ](./docs/architecture.md)
- [基本機能の完成](./docs/features/basic-function-completion.md)
- [AI 記事要約と今日のブリーフィング](./docs/features/ai-article-summary.md)
- [UI / UX デザイン方針](./docs/features/ui-ux-redesign.md)

## ライセンス

現在、このリポジトリにはプロジェクトのライセンスファイルがありません。ソースコードが公開されているだけでは、再配布や派生物の作成は許可されません。最初の公開リリース前にライセンスを選択し、リポジトリへ追加する必要があります。
