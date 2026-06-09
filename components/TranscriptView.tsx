import type { TranscriptItem } from "@/types/meeting";

export function TranscriptView({
  transcript,
  partials,
}: {
  transcript: TranscriptItem[];
  partials: Record<string, string>;
}) {
  return (
    <section className="panel transcript-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">TRANSCRIPT</p>
          <h2>文字起こしログ</h2>
        </div>
        <span className="count-badge">{transcript.length}件</span>
      </div>
      <div className="transcript-list">
        {transcript.length === 0 && Object.keys(partials).length === 0 && (
          <div className="empty-state compact">文字起こしを開始すると、ここに認識結果が表示されます。</div>
        )}
        {transcript.map((item) => (
          <article className={`transcript-item source-${item.source}`} key={item.id}>
            <div className="transcript-meta">
              <strong>{item.speaker || item.source}</strong>
              <time>{new Date(item.timestamp).toLocaleTimeString("ja-JP")}</time>
            </div>
            <p>{item.text}</p>
          </article>
        ))}
        {Object.entries(partials).map(([source, text]) => (
          <article className="transcript-item partial" key={source}>
            <div className="transcript-meta">
              <strong>{source === "mic" ? "外部マイク" : "内部音声"} / 認識中</strong>
            </div>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
