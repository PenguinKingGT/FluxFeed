<div align="center">
  <img src="./assets/flux-feed.svg" width="88" height="88" alt="FluxFeed ロゴ">
  <h1>FluxFeed</h1>
  <p>静かでローカルファーストなブラウザ用 RSS リーダー。任意で自分の AI サービスを使った要約にも対応します。</p>

  <p>
    <a href="./README.md">English</a> · <a href="./README.zh-CN.md">简体中文</a> · 日本語
  </p>
</div>

> [!NOTE]
> FluxFeed は現在プレリリース段階です。ソースからインストールして使用してください。データモデルや画面は今後も変更される可能性があります。

## FluxFeed を選ぶ理由

FluxFeed は RSS、Atom、JSON Feed を読むための集中しやすいワークスペースをブラウザ内に提供します。購読、記事、フォルダー、設定、キャッシュ済みの要約はブラウザ内に保存されます。FluxFeed アカウントや公式のクラウド同期サービスはありません。

AI は完全に任意です。有効にすると、FluxFeed は設定した OpenAI 互換サービス、Gemini または Claude へ直接接続します。エンドポイント、モデル、API キー、要約を実行するタイミングはすべてユーザーが管理できます。

## 主な機能

- **サイドバーの開閉：** デスクトップの左ナビゲーションを滑らかに開閉し、選択をローカルに保存します。
- **フィード購読：** フィード URL の直接追加、ウェブサイト URL からのフィード自動検出、現在のページで検出されたフィードの購読に対応します。サイドバーの「＋」で購読やフォルダーを追加でき、下部の購読追加ボタンはフィードのフォームを直接開きます。 フィード取得と自動検出全体の制限時間は 30 秒、応答は 20 MiB まで、検出リンクは最大 5 回です。購読に失敗した場合は再試行できます。 JSON Feed のプレーンテキスト本文と Atom の text・HTML・XHTML 本文の構造を保持します。
- **ローカルライブラリ：** 多階層フォルダーで購読を整理し、OPML でインポート・エクスポートできます。
- **集中できる読書画面：** 記事全文の検索、既読、スター、新しいタブで原文を開いて切り替える操作に対応します。受信トレイは初期設定で未読のみ、すべての記事では既読も表示します。 更新後は記事一覧と未読数が反映され、現在の絞り込みは維持されます。失敗時はエラーを表示し、再試行できます。
- **レスポンシブレイアウト：** 大画面では 3 カラム、ノート PC ではコンパクトナビゲーション、狭い画面では 1 ペイン表示になります。
- **フォーカスモード：** ナビゲーションと記事一覧を隠し、本文だけに集中できます。
- **任意の AI 要約：** 記事ごとに手動で要約するか、設定した本文文字数以上の記事を自動要約できます。
- **今日のブリーフィング：** 当日の記事を分割して整理し、トピック別に確認して元の記事へ移動できます。
- **コードハイライト：** 主な言語の構文を色分けし、言語指定のないコードも自動判定。ライト / ダーク表示に対応します。
- **記事スタイル：** 外観設定でオリジナル、Vue、GitHub、書籍、ミニマルの5種類を選択。リンク、リスト、引用、コード、表に対応し、ライト / ダーク表示と個別のフォント・文字サイズ設定を利用できます。
- **外観設定：** 7 種類の配色（初期設定はペーパー、スカイ・ミント・ピーチを追加）、システム/ライト/ダークモード、本文サイズ、読書用と UI 用の個別フォント設定を備えています。
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

AI 機能を使う前にプロバイダーを設定してください。

1. **設定 → AI 要約**を開きます。
2. **OpenAI-compatible**、**Gemini**、**Claude** から選択します。互換サービスは `/v1` ベース URL または完全な Chat Completions URL を指定できます。Gemini と Claude はネイティブ接続で、公式のベース URL またはプロキシを使用します。
3. サービスが受け付けるモデル名を入力します。
4. 選択したプロバイダーの API キーを保存し、**接続テスト**を実行します。互換ローカルサービスでは省略できますが、ネイティブ Gemini と Claude では必須です。
5. 要約言語、長さ、ブリーフィングの記事上限、自動要約の有無を設定します。

OpenAI 互換 Chat Completions、ネイティブ Gemini、Claude Messages に対応しています。カスタムヘッダー、ストリーミング、追加質問には未対応です。切り替え時に接続先とモデルはリセットされ、API キーはプロバイダー別に保存されます。以前の互換設定とキーも引き続き利用できます。

FluxFeed は拡張機能のバックグラウンドで Vercel AI SDK を使い、選択したプロバイダーへ直接接続します。Vercel アカウントや AI Gateway は不要です。SDK の自動リトライと telemetry は無効です。

### リクエストのルール

- フィード更新によって AI リクエストが発生することはありません。
- 今日のブリーフィングは、ユーザーが**生成**または**更新**を選んだときだけ実行されます。
- 記事の自動要約は初期状態で無効です。
- 長い記事は各30,000 UTF-16コード単位、最大5分割で要約します。同時リクエストは最大2件、統合を含めて最大6回です。上限を超える場合は冒頭部分のみの処理を確認し、自動要約はスキップします。失敗しても以前の要約を保持します。
- ブリーフィングには分割数、同時実行数、入力・出力サイズ、タイムアウトの制限があります。
- ブリーフィングで継続不能なエラーが発生すると、新しいバッチを停止し、開始済みのリクエストが終了してから失敗を通知します。タイムアウトや形式不正時のフォールバックは維持されます。
- 完成した要約はローカルにキャッシュされます。
- AI 設定で記事の要約を非表示にすると、自動要約を停止し、保存済みの要約は保持します。

## プライバシーと権限

- フィード、記事、フォルダー、設定、生成された要約は IndexedDB にローカル保存されます。
- AI API キーは `browser.storage.local` にプロバイダー別で保存され、OPML やページの状態には含まれません。
- AI リクエストは拡張機能のバックグラウンドプロセスから、設定したエンドポイントだけに送信されます。
- 記事の抜粋がブラウザ外へ送られるのは、手動で要約を依頼した場合、または自動要約を有効にした場合だけです。
- FluxFeed にはアクセス解析や公式のホスト型アカウントサービスは含まれていません。

RSS リーダーは任意のサイトからフィードを検出・取得する必要があるため、FluxFeed はウェブページへのアクセス権限を要求します。現在の Manifest では、ブラウザストレージ、タブ、Alarm、スクリプト、コンテキストメニューの権限も宣言されています。正確な境界は [wxt.config.ts](./wxt.config.ts) と[アーキテクチャ](./docs/architecture.md)を確認してください。

## キーボードショートカット

リーダーにフォーカスがあり、フォームへ入力していないときに使用できます。

| キー | 操作 |
| --- | --- |
| `←` / `→` | 前の記事 / 次の記事 |
| `M` | 現在の記事を既読にする |
| `S` | 現在の記事にスターを付ける / 外す |
| `Enter` | 原文を新しいタブで開いて切り替える |
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

FluxFeed は [MIT ライセンス](./LICENSE)の下で公開されています。
