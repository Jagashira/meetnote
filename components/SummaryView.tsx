export function SummaryView({ summary }: { summary: string }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">SUMMARY</p>
          <h2>議事録</h2>
        </div>
      </div>
      {summary ? <pre className="summary-markdown">{summary}</pre> : <div className="empty-state compact">まだ議事録は生成されていません。</div>}
    </section>
  );
}
