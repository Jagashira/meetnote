import Link from "next/link";
import { AppIcon } from "@/components/AppIcon";

const features = [
  {
    icon: "mic" as const,
    label: "REALTIME TRANSCRIPT",
    title: "会話を、その場で文字に。",
    description: "マイク音声と共有画面の内部音声を、会議中にリアルタイムで文字起こしします。",
  },
  {
    icon: "video" as const,
    label: "SCREEN CAPTURE",
    title: "大事な画面も記録に残す。",
    description: "スクリーンショットと画面録画を、会議データと同じフォルダーへ保存できます。",
  },
  {
    icon: "sparkles" as const,
    label: "MEETING SUMMARY",
    title: "記録から議事録を生成。",
    description: "文字起こしと手動メモを整理し、決定事項やToDoを含むMarkdown議事録を生成します。",
  },
];

export default function HomePage() {
  return (
    <div className="landing-page">
      <header className="landing-nav">
        <Link className="landing-brand" href="/">
          <span className="brand-mark">M</span>
          <strong>Minute<span>Dock</span></strong>
        </Link>
        <nav>
          <a href="#features">機能</a>
          <a href="#privacy">ローカル保存</a>
          <Link className="landing-nav-cta" href="/demo">30秒デモを試す</Link>
        </nav>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <span className="landing-kicker"><span className="status-dot" />LOCAL-FIRST MEETING WORKSPACE</span>
            <h1>会議のすべてを<br /><span>手元に残す。</span></h1>
            <p>
              リアルタイム文字起こし、画面記録、メモ、議事録生成。
              MinuteDockは、会議データをあなたのコンピューター内でまとめるローカルファーストな会議ワークスペースです。
            </p>
            <div className="landing-hero-actions">
              <Link className="landing-primary-cta" href="/demo">
                30秒デモを試す
                <AppIcon name="arrow-right" size={18} />
              </Link>
              <a className="landing-secondary-cta" href="#features">機能を見る</a>
            </div>
            <div className="landing-trust-row">
              <span><AppIcon name="file" size={16} />会議データはローカル保存</span>
              <span><AppIcon name="record" size={14} />録音・録画・文字起こし</span>
            </div>
          </div>

          <div className="landing-product-stage" aria-label="MinuteDock会議画面のプレビュー">
            <div className="landing-glow landing-glow-one" />
            <div className="landing-glow landing-glow-two" />
            <div className="product-preview">
              <aside className="preview-sidebar">
                <span className="preview-logo">M</span>
                <span className="preview-nav-item active"><AppIcon name="list" size={15} /></span>
                <span className="preview-nav-item"><AppIcon name="settings" size={15} /></span>
              </aside>
              <div className="preview-content">
                <div className="preview-header">
                  <div>
                    <small>MEETING WORKSPACE</small>
                    <strong>プロジェクト定例ミーティング</strong>
                  </div>
                  <span><span className="status-dot" />準備完了</span>
                </div>
                <div className="preview-top-grid">
                  <div className="preview-card">
                    <small>REALTIME</small>
                    <div className="preview-feature-title">
                      <span className="preview-orb blue"><AppIcon name="mic" size={18} /></span>
                      <strong>文字起こし</strong>
                    </div>
                    <span className="preview-action blue-action">マイク文字起こしを開始</span>
                  </div>
                  <div className="preview-card">
                    <small>CAPTURE</small>
                    <div className="preview-feature-title">
                      <span className="preview-orb red"><AppIcon name="record" size={17} /></span>
                      <strong>記録</strong>
                    </div>
                    <div className="preview-options"><i className="selected" /><i /><i /></div>
                  </div>
                </div>
                <div className="preview-bottom-grid">
                  <div className="preview-card"><small>MANUAL NOTE</small><span className="preview-lines" /></div>
                  <div className="preview-card"><small>TRANSCRIPT</small><AppIcon name="transcript" size={29} /></div>
                  <div className="preview-card"><small>SUMMARY</small><AppIcon name="file" size={29} /></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-proof">
          <p>MEETING DATA, ORGANIZED LOCALLY</p>
          <div>
            <span>文字起こし</span>
            <span>スクリーンショット</span>
            <span>画面録画</span>
            <span>手動メモ</span>
            <span>Markdown議事録</span>
          </div>
        </section>

        <section className="landing-features" id="features">
          <div className="landing-section-heading">
            <p className="eyebrow">ONE WORKSPACE</p>
            <h2>会議中の記録を、<br />ひとつの場所へ。</h2>
            <p>ツールを行き来せず、会議の開始から議事録の生成までをMinuteDockで完結できます。</p>
          </div>
          <div className="landing-feature-grid">
            {features.map((feature) => (
              <article className="landing-feature-card" key={feature.title}>
                <span className="landing-feature-icon"><AppIcon name={feature.icon} size={24} /></span>
                <small>{feature.label}</small>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-privacy" id="privacy">
          <div className="privacy-visual">
            <div className="privacy-folder">
              <span><AppIcon name="file" size={28} /></span>
              <div><strong>~/MinuteDock/data/</strong><small>このコンピューター内に保存</small></div>
            </div>
            <div className="privacy-files">
              <span>transcript.json</span>
              <span>summary.md</span>
              <span>screen_recording.webm</span>
            </div>
          </div>
          <div className="privacy-copy">
            <p className="eyebrow">LOCAL-FIRST</p>
            <h2>会議データの置き場所を、<br />自分で管理できる。</h2>
            <p>
              文字起こし、メモ、録音、録画、スクリーンショットは会議ごとのローカルフォルダーへ保存されます。
              複雑なデータベースやクラウドストレージを前提にしません。
            </p>
            <ul>
              <li><span className="status-dot" />保存先は環境変数で変更可能</li>
              <li><span className="status-dot" />会議ごとにファイルを整理</li>
              <li><span className="status-dot" />ローカルサーバーとして動作</li>
            </ul>
          </div>
        </section>

        <section className="landing-final-cta">
          <div>
            <p className="eyebrow">START A MEETING</p>
            <h2>次の会議から、記録をひとつに。</h2>
          </div>
          <Link className="landing-primary-cta" href="/demo">
            30秒デモを試す
            <AppIcon name="arrow-right" size={18} />
          </Link>
        </section>
      </main>

      <footer className="landing-footer">
        <Link className="landing-brand" href="/">
          <span className="brand-mark">M</span>
          <strong>Minute<span>Dock</span></strong>
        </Link>
        <p>Local-first meeting workspace.</p>
      </footer>
    </div>
  );
}
