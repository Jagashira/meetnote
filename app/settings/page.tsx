import { dataRoot } from "@/lib/storage/paths";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <section className="settings-card">
      <p className="eyebrow">SETTINGS</p>
      <h1>ローカル設定</h1>
      <dl>
        <div><dt>データ保存先</dt><dd><code>{dataRoot()}</code></dd></div>
        <div><dt>OpenAI APIキー</dt><dd>{process.env.OPENAI_API_KEY ? "設定済み" : "未設定"}</dd></div>
        <div><dt>文字起こしモデル</dt><dd><code>{process.env.MEETING_REALTIME_MODEL || "gpt-4o-mini-transcribe"}</code></dd></div>
        <div><dt>要約モデル</dt><dd><code>{process.env.OPENAI_SUMMARY_MODEL || "gpt-4o-mini"}</code></dd></div>
      </dl>
      {!process.env.OPENAI_API_KEY && (
        <p className="warning">文字起こしと議事録生成を使うには、`.env.local`に`OPENAI_API_KEY`を設定してください。</p>
      )}
    </section>
  );
}
