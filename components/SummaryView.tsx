import { AppIcon } from "./AppIcon";

export function SummaryView({
  summary,
  summarizing = false,
  onCreate,
}: {
  summary: string;
  summarizing?: boolean;
  onCreate?: () => void;
}) {
  return (
    <section className="panel workspace-lower-panel summary-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">SUMMARY</p>
          <h2>議事録</h2>
        </div>
      </div>
      {summary ? (
        <pre className="summary-markdown">{summary}</pre>
      ) : (
        <div className="empty-state tall">
          <AppIcon name="file" size={54} strokeWidth={1.5} />
          <span>まだ議事録は生成されていません。</span>
        </div>
      )}
      {onCreate && (
        <button className="summary-generate" disabled={summarizing} onClick={onCreate} type="button">
          <AppIcon name="sparkles" size={18} />
          {summarizing ? "議事録を生成中..." : "文字起こしとメモから議事録を生成"}
        </button>
      )}
    </section>
  );
}
