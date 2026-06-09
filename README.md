# MinuteDock

MinuteDockは、Zoomなどのオンライン会議向けに作られた、ローカルファーストの議事録アプリケーションです。

ブラウザからマイク音声や共有画面の音声を文字起こしし、スクリーンショット、画面録画、手動メモ、AI生成の議事録を会議ごとのフォルダーへ保存します。

Next.js App Router、React、TypeScript、Tailwind CSSを使用しています。

パッケージ管理とスクリプト実行にはpnpmを使用します。

## systemctlとの関係

Realtime文字起こしは、既存の`systemctl`の以下の実装を基にしています。

- `systemctl/meeting/app.py`の`make_ws_transcribe_handler`
- `systemctl/meeting/static/meeting.js`の音声取得・PCM変換・WebSocket送信処理

MinuteDockの対応する実装は以下です。

- `lib/transcription/systemctlAdapter.ts`
- `components/RecorderPanel.tsx`

元の挙動と比較しやすいように、以下を維持しています。

- マイクは`getUserMedia`、内部音声は`getDisplayMedia`で取得
- AudioContextで24kHz音声を取得
- Float32音声をPCM16へ変換
- PCM16をBase64化してWebSocketで送信
- OpenAI Realtime transcription APIを使用
- `server_vad`、しきい値`0.5`、前置き`300ms`、無音`5000ms`
- デフォルトモデルは`gpt-4o-mini-transcribe`
- マイクは会議室・ノートPC向けの`far_field`ノイズ除去を使用
- `gpt-realtime-whisper`使用時は、クライアントで無音を検出して発話バッファをcommit

文字起こし品質を新しく再設計したものではなく、`systemctl`の動作をNext.js用の薄いアダプターとして移植しています。

## 主な機能

- 新しい会議の作成と過去の会議一覧
- マイク音声のリアルタイム文字起こし
- 共有画面の内部音声のリアルタイム文字起こし
- 文字起こしの`transcript.json`保存
- 手動メモの保存
- 共有画面のスクリーンショット保存
- 共有画面のWebM録画
- 画面録画時に、共有画面の内部音声と外部マイク音声をミックス
- 画面録画の音声を「内部音声のみ」「外部マイクのみ」「両方」から選択
- `ffmpeg`が利用可能な場合、QuickTime Player対応のH.264/AAC MP4を自動生成
- マイク音声のWebM録音
- 文字起こしと手動メモからMarkdown議事録を生成
- Vercelで公開できる、保存なし・30秒限定のマイク文字起こしデモ

## セットアップ

Node.js 20以降とpnpm 9を使用してください。

```bash
pnpm install
cp .env.example .env.local
```

`.env.local`を編集します。

```dotenv
OPENAI_API_KEY=
MINUTEDOCK_DATA_DIR=
OPENAI_SUMMARY_MODEL=gpt-4o-mini
MEETING_REALTIME_MODEL=gpt-4o-mini-transcribe
MEETING_NOISE_REDUCTION=far_field
DEMO_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe
```

`OPENAI_API_KEY`が未設定でも、会議作成、手動メモ、スクリーンショット、録画は利用できます。文字起こしと議事録生成にはAPIキーが必要です。

## 開発サーバー

```bash
pnpm dev
```

ブラウザで[http://127.0.0.1:3000](http://127.0.0.1:3000)を開きます。

Realtime文字起こし用WebSocketを扱うため、`pnpm dev`はNext.jsのカスタムサーバー`server.ts`を起動します。

## 公開デモとVercel

`/demo`には、外部の人がブラウザから試せる30秒限定のマイク文字起こしデモがあります。

- 30秒経過時に自動停止
- 録音終了後、`POST /api/demo/transcribe`からOpenAI Audio Transcriptions APIへ送信
- 音声と文字起こし結果をMinuteDockのローカル会議フォルダーへ保存しない
- スクリーンショット、画面録画、音声録音、議事録生成は説明モーダルのみ表示

Vercelでは、プロジェクトのEnvironment Variablesへ`OPENAI_API_KEY`を設定してください。必要に応じて`DEMO_TRANSCRIPTION_MODEL`も変更できます。通常のNext.jsプロジェクトとしてVercelへ接続すれば、LPと`/demo`はデプロイできます。

ローカル本体のRealtime文字起こしは、`systemctl`由来のカスタムWebSocketサーバーを使用するため、Vercel上の公開デモでは使用しません。公開デモだけはVercelのサーバーレス実行に合わせ、録音終了後に音声ファイルを一度送信する独立した経路です。

公開URLを広く配布する場合は、API利用料金の不正消費を防ぐため、Vercel側でレート制限やアクセス制限も設定してください。

## ローカルデータ

デフォルトでは、会議データを以下へ保存します。

```txt
~/MinuteDock/data/
  meetings/
    {meetingId}/
      audio/
        meeting_audio_{timestamp}.webm
      video/
        screen_recording_{timestamp}.webm
      screenshots/
        {timestamp}.png
      transcript.json
      manual_notes.json
      summary.md
      metadata.json
```

保存先は`MINUTEDOCK_DATA_DIR`で変更できます。ディレクトリは自動的に作成されます。

## API

- `POST /api/meetings`
- `GET /api/meetings`
- `GET /api/meetings/[id]`
- `POST /api/meetings/[id]/transcript`
- `POST /api/meetings/[id]/manual-note`
- `POST /api/meetings/[id]/summary`
- `POST /api/meetings/[id]/screenshot`
- `POST /api/meetings/[id]/recording`
- `POST /api/demo/transcribe`
- `GET /api/health`
- `WS /api/realtime-transcription?meetingId=...&source=mic|system`

会議IDはファイルパスへ使用する前に検証され、パストラバーサルを防止します。

## 検証コマンド

```bash
pnpm lint
pnpm typecheck
pnpm build
```

## プライバシーと同意

会議の文字起こし、録音、録画、スクリーンショットには機密情報が含まれる可能性があります。

- 録音、録画、文字起こしを始める前に、参加者から必要な同意を得てください。
- ローカル会議データをGitHubや公開ストレージへアップロードしないでください。
- スクリーンショットはOpenAIへ送信しません。
- OpenAIへ送信するのは、Realtime文字起こし対象の音声と、議事録生成時の文字起こし・手動メモです。
- APIキーをクライアント側コードへ公開しないでください。

## 既知の制限事項

- ZoomやTeamsのデスクトップアプリ音声をブラウザだけで必ず取得できるわけではありません。
- WebM原本はQuickTime Playerで開けない場合があります。`ffmpeg`が利用可能な環境では、同じフォルダーへQuickTime対応MP4を自動生成します。
- 内部音声はブラウザと共有対象に依存します。Chromeタブを共有し、「タブの音声を共有」を有効にする方法が最も安定します。
- 画面録画へ内部音声を含めるには、共有ダイアログで音声共有を有効にする必要があります。外部音声を含めるには、ブラウザのマイク利用を許可してください。
- ブラウザの許可ダイアログを自動操作することはできません。
- 完全な話者ダイアライゼーションには対応していません。
- 文字起こしと議事録生成にはOpenAI APIの利用料金がかかります。
- `/demo`の30秒制限はブラウザUIとAPIリクエスト検証によるもので、公開運用時の強固な不正利用対策ではありません。
- ローカル本体の本番デプロイ、認証、複数ユーザー共同作業はMVP対象外です。

## 今後のロードマップ

- 文字起こし検索と修正
- 会議終了時刻、参加者、タグの編集
- 保存済みメディアのプレビューとダウンロード
- 文字起こし品質の評価と、`systemctl`側の改善との同期
- 議事録テンプレートの選択
