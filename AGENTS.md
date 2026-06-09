# AGENTS.md

## プロジェクト概要

MeetNoteは、Zoomなどのオンライン会議向けに設計された、ローカルファーストの議事録アプリケーションです。

このアプリは、ユーザーのコンピューター上でローカルサーバーとして動作します。ユーザーはブラウザでアプリを開き、会議音声の録音または受信、スクリーンショットや画面録画の取得、会議データのローカル保存、AIによる構造化された議事録の生成を行います。

このプロジェクトは、`systemctl`という既存プログラムに関連しています。文字起こし機能はすでに`systemctl`で実装されており、MeetNoteでは、その文字起こしアルゴリズムを可能な限りそのまま再利用する必要があります。

明示的に依頼されない限り、文字起こしアルゴリズムをゼロから再設計しないでください。

## 主な目標

以下の機能を備えた、動作するMVPを構築します。

- 新しい会議を開始できる。
- ローカルマシン上に会議フォルダーを作成できる。
- `systemctl`の既存の文字起こしアルゴリズムを再利用できる。
- 会議画面に文字起こしログを表示できる。
- 共有画面のスクリーンショットを取得できる。
- 共有画面をWebMファイルとして録画できる。
- 文字起こしをJSONとして保存できる。
- Markdown形式の会議要約を生成できる。
- ローカルストレージから過去の会議を一覧表示できる。
- `pnpm dev`でローカル実行できる。

## 重要な既存依存関係：systemctlの文字起こし

既存の`systemctl`プログラムには、すでに文字起こし機能が含まれています。

MeetNoteの文字起こし機能を実装するときは、以下のルールに従ってください。

- 最初に、既存の`systemctl`の文字起こし実装を確認する。
- 同じ文字起こしフロー、データ処理、チャンク分割ロジック、API呼び出しロジック、エラー処理を可能な限り再利用する。
- ユーザーが明示的に再設計を依頼しない限り、既存のアルゴリズムを新しく設計したものに置き換えない。
- リファクタリングが必要な場合は、元の動作を維持する。
- 元のコードを直接インポートできない場合は、同じロジックを囲むラッパーまたはアダプターを作成する。
- 再利用した文字起こしロジックの出典を文書化する。
- 文字起こしモジュールを、元の`systemctl`実装と比較しやすい状態に保つ。

推奨する進め方：

1. `systemctl`の文字起こしコードを特定する。
2. 音声取得、チャンク分割、リクエスト、レスポンス解析、文字起こし蓄積のロジックを確認する。
3. 再利用可能なロジックを`lib/transcription/`または`lib/audio/`へ移動またはコピーする。
4. そのロジックを囲む薄いMeetNoteアダプターを作成する。
5. UIおよびストレージ連携を、文字起こしのコアロジックから分離する。

文字起こし品質の改善を理由に、MVPの開発を止めないでください。優先事項は、すでに動作している`systemctl`の挙動をMeetNote内で維持することです。

## MVPの対象外

明示的に依頼されない限り、以下は実装しないでください。

- Zoom API連携。
- Google MeetまたはMicrosoft Teams連携。
- NASストレージ。
- クラウドストレージ。
- Notion連携。
- Googleカレンダー連携。
- 完全な話者ダイアライゼーション。
- ユーザー認証。
- 複数ユーザーによる共同作業。
- 本番環境へのデプロイ。
- 複雑なデータベース構築。
- 完全に新しい文字起こしアルゴリズム。

## 技術スタック

既存プロジェクトが明確に別の技術を使用していない限り、以下のスタックを使用してください。

- Next.js
- React
- TypeScript
- Tailwind CSS
- pnpm
- Next.js API Routes
- ローカルファイルストレージ
- 既存の`systemctl`文字起こしアルゴリズム
- 必要に応じて、要約生成にOpenAI APIを使用

Next.js App Routerを優先してください。

パッケージ管理とスクリプト実行にはpnpmを使用してください。npmまたはYarnのロックファイルを追加せず、`pnpm-lock.yaml`を維持してください。

## リポジトリ構成

以下のような、分かりやすい構成を使用してください。

```txt
app/
  page.tsx
  meetings/
    page.tsx
    [id]/
      page.tsx
      summary/
        page.tsx
  settings/
    page.tsx
  api/
    meetings/
      route.ts
      [id]/
        route.ts
        transcript/
          route.ts
        manual-note/
          route.ts
        summary/
          route.ts
        screenshot/
          route.ts
        recording/
          route.ts

components/
  MeetingList.tsx
  RecorderPanel.tsx
  TranscriptView.tsx
  SummaryView.tsx
  ScreenshotPanel.tsx
  RecordingPanel.tsx

lib/
  storage/
    paths.ts
    meetingStore.ts
  audio/
    recorder.ts
  transcription/
    systemctlAdapter.ts
    transcribe.ts
  screen/
    capture.ts
    recorder.ts
  openai/
    summarize.ts
  utils/
    slug.ts
    time.ts

types/
  meeting.ts
```

必要に応じてこの構成を調整できますが、責務は分離した状態に保ってください。

## ローカルストレージのルール

すべての会議データはローカルに保存する必要があります。

デフォルトの保存先：

```txt
~/MeetNote/data/
```

以下の環境変数で保存先を上書きできるようにしてください。

```txt
MEETNOTE_DATA_DIR
```

会議ファイルは、以下のように保存してください。

```txt
~/MeetNote/data/
  meetings/
    {meetingId}/
      audio/
        meeting_audio.webm
      video/
        screen_recording.webm
      screenshots/
        {timestamp}.png
      transcript.json
      manual_notes.json
      summary.md
      metadata.json
```

不足しているディレクトリは自動的に作成してください。

ローカルの会議データは絶対にコミットしないでください。

## 環境変数

シークレットおよびローカル設定には`.env.local`を使用してください。

想定する環境変数：

```txt
OPENAI_API_KEY=
MEETNOTE_DATA_DIR=
OPENAI_SUMMARY_MODEL=
```

再利用する`systemctl`の文字起こしロジックで追加の環境変数が必要な場合は、可能な限り元の変数名を維持し、`README.md`に記載してください。

APIキーをハードコードしないでください。

APIキーをログに出力しないでください。

## Gitの除外設定

`.gitignore`に以下が含まれていることを確認してください。

```txt
.env.local
data/
*.webm
*.mp4
*.wav
*.m4a
*.png
.DS_Store
node_modules/
.next/
```

## コードスタイル

- TypeScriptを使用する。
- 共有データ構造には明示的な型を優先する。
- コンポーネントを小さく保つ。
- ファイルシステムのロジックは`lib/storage`に配置する。
- 文字起こしロジックは`lib/transcription`または`lib/audio`に配置する。
- 再利用した`systemctl`のロジックを識別可能な状態に保つ。
- OpenAIによる要約の呼び出しは`lib/openai`に配置する。
- ブラウザの録画ロジックと、サーバーのファイル書き込みロジックを分離する。
- 不要な依存関係を避ける。
- 大規模な本番用依存関係を追加する前に確認を取る。
- 巧妙な抽象化より、読みやすい名前を使用する。
- 複雑なアーキテクチャより、シンプルなMVPコードを優先する。

## UIスタイル

研究会議、インタビュー、業務会議に適した、シンプルで落ち着いたUIを使用してください。

- 白、黒、グレーを基本色として使用する。
- 録音ボタンと画面取得ボタンを分かりやすくする。
- 待機中、録音中、一時停止中、停止済みなどの録音状態を明確に表示する。
- 文字起こしの状態を明確に表示する。
- エラーをページ上に表示する。
- 必須の環境変数が不足している場合は警告を表示する。
- 見た目を美しくする前に、UIを使用可能な状態にする。

## APIに関する要件

以下のルートを実装または維持してください。

- `POST /api/meetings`
- `GET /api/meetings`
- `GET /api/meetings/[id]`
- `POST /api/meetings/[id]/transcript`
- `POST /api/meetings/[id]/manual-note`
- `POST /api/meetings/[id]/summary`
- `POST /api/meetings/[id]/screenshot`
- `POST /api/meetings/[id]/recording`

明確なエラーメッセージを含むJSONレスポンスを使用してください。

会議IDをファイルパスに使用する前に検証してください。

パストラバーサルを防止してください。

## データ型

共有型は`types/meeting.ts`に配置してください。

以下の基本型を使用してください。

```ts
export type MeetingMetadata = {
  id: string
  title: string
  startedAt: string
  endedAt?: string
  participants?: string[]
  tags?: string[]
}

export type TranscriptItem = {
  id: string
  timestamp: string
  speaker?: string
  text: string
  source: 'mic' | 'system' | 'mixed' | 'manual'
  confidence?: number
}

export type MeetingSummary = {
  overview: string
  discussionPoints: string[]
  decisions: string[]
  todos: TodoItem[]
  questions: QAItem[]
  nextActions: string[]
}

export type TodoItem = {
  task: string
  owner?: string
  dueDate?: string
}

export type QAItem = {
  question: string
  answer?: string
  speaker?: string
}
```

これらの型は、必要な場合にのみ拡張してください。

## 文字起こしのルール

文字起こし機能は、既存の`systemctl`実装を基盤にする必要があります。

必要でない限り、新しい文字起こし設計を作成しないでください。

想定する動作：

- 可能な場合は、`systemctl`と同じ音声入力方式を使用する。
- 可能な場合は、`systemctl`と同じチャンク分割またはストリーミングアルゴリズムを使用する。
- 可能な場合は、`systemctl`と同じ文字起こしAPIフローを使用する。
- 可能な場合は、`systemctl`と同じレスポンス解析ロジックを使用する。
- 認識したテキストを`TranscriptItem[]`として`transcript.json`に保存する。
- 認識したテキストを、会議画面にリアルタイムまたはほぼリアルタイムで表示する。

`systemctl`がブラウザAPIを使用している場合は、ブラウザ側のフローを維持してください。

`systemctl`がサーバー側プロセスを使用している場合は、サーバー側のフローを維持し、MeetNoteのルートまたはサービスでラップしてください。

直接再利用できない場合は、最終報告で理由を説明し、互換性を保つ最小限のアダプターを実装してください。

## スクリーンショットのルール

Screen Capture APIを使用してください。

推奨する進め方：

1. ディスプレイメディアストリームを取得する。
2. 非表示または表示中のvideo要素にストリームを接続する。
3. 現在のビデオフレームをcanvasへ描画する。
4. canvasをPNGへ変換する。
5. スクリーンショット用APIルートへ送信する。
6. 会議の`screenshots/`ディレクトリ配下に保存する。

## 画面録画のルール

`getDisplayMedia`と`MediaRecorder`を使用してください。

MVPでは、以下を実装してください。

- ブラウザから画面録画を開始する。
- 録画中はブラウザ内にチャンクを保存する。
- 停止時に、最終的なBlobをサーバーへ送信する。
- ファイルをWebM形式で、会議の`video/`ディレクトリ配下に保存する。

## 要約生成のルール

`transcript.json`と手動メモから`summary.md`を生成してください。

要約には、以下のMarkdown構造を使用してください。

```md
# 議事録

## 会議概要

## 主な議論

## 決定事項

## ToDo

## 質疑応答

## 未決事項

## 次回確認事項
```

日付、数値、名前、決定事項を創作しないでください。

不明確な内容には`不明`と記載してください。

決定事項と意見を分けてください。

## プライバシーとセキュリティのルール

会議データには機密情報が含まれる可能性があります。

必ず以下のルールに従ってください。

- ローカルの会議データをGitHubへアップロードしない。
- 録音、スクリーンショット、文字起こし、要約をコミットしない。
- シークレットをハードコードしない。
- クライアント側コードでAPIキーを公開しない。
- 明示的に実装および文書化されていない限り、スクリーンショットをOpenAIへ送信しない。
- 会議の録音または文字起こしを行う前に、ユーザーが同意を得る必要があることを`README.md`で警告する。
- 文字起こし、音声、動画、スクリーンショットのファイルを、ユーザーの非公開データとして扱う。

## テストと検証

タスクを完了する前に、可能な場合は関連するチェックを実行してください。

```bash
pnpm lint
pnpm typecheck
pnpm build
```

スクリプトが存在しない場合は、妥当であれば追加するか、存在しないことを説明してください。

最低限、以下を確認してください。

- `pnpm dev`でアプリが起動する。
- ホームページが表示される。
- 会議を作成できる。
- 会議フォルダーが作成される。
- `metadata.json`が書き込まれる。
- 文字起こしの追記が動作する。
- 再利用した`systemctl`の文字起こしフローが接続されているか、アダプターによるスタブであることが明確になっている。
- APIキーがない場合に、要約生成ルートが適切に処理する。
- ローカルファイルパスが安全である。
- TypeScriptエラーが可能な限り解消されている。

## READMEに関する要件

`README.md`を、人間の開発者にとって役立つ状態に保ってください。

以下の内容を含めてください。

- MeetNoteとは何か。
- 既存の`systemctl`文字起こし実装との関係。
- 主な機能。
- セットアップコマンド。
- `.env.local`の例。
- 開発サーバーの起動方法。
- ローカルデータの保存場所。
- プライバシーおよび同意に関する注意事項。
- 既知の制限事項。
- 今後のロードマップ。

## コミュニケーションに関する要件

このリポジトリで作業するときは、以下に従ってください。

- 変更を加える前に、この`AGENTS.md`を読む。
- 大きな変更を加える前に、実装計画を説明する。
- 小さく動作する単位で進める。
- 実装した内容を報告する。
- 実装しなかった内容を報告する。
- 実行したコマンドを報告する。
- 既知の制限事項を報告する。
- 検証されていない限り、Zoomの音声取得が完璧であると主張しない。
- `systemctl`の文字起こしを再利用した場合、それを再設計したと主張しない。

## 完了条件

以下を満たした場合にのみ、タスクは完了したものとします。

- 依頼された機能が実装されている、またはMVPと互換性のある明確な代替手段が実装されている。
- 既存の`systemctl`文字起こしアルゴリズムが再利用されている、または再利用できなかった場合は明確な理由が示されている。
- 関連ファイルが作成または更新されている。
- ローカルストレージの動作が文書化されている。
- 型エラーが可能な限り解消されている。
- アプリを引き続きローカルで実行できる。
- 残っている制限事項が明確に記載されている。
