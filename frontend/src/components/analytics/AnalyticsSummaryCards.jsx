function formatNumber(value) {
  if (value == null) return "-";
  return new Intl.NumberFormat("ja-JP").format(value);
}

function formatPercent(value) {
  if (value == null) return "-";
  return `${(value * 100).toFixed(2)}%`;
}

export default function AnalyticsSummaryCards({ latestAnalytics }) {
  return (
    <div className="analytics-summary-grid">
      <article className="analytics-card">
        <span className="analytics-card-label">再生数</span>
        <strong>{formatNumber(latestAnalytics?.views)}</strong>
      </article>

      <article className="analytics-card">
        <span className="analytics-card-label">高評価</span>
        <strong>{formatNumber(latestAnalytics?.likes)}</strong>
      </article>

      <article className="analytics-card">
        <span className="analytics-card-label">コメント</span>
        <strong>{formatNumber(latestAnalytics?.comments)}</strong>
      </article>

      <article className="analytics-card">
        <span className="analytics-card-label">CTR</span>
        <strong>
          {latestAnalytics
            ? formatPercent(latestAnalytics.impression_click_through_rate)
            : "-"}
        </strong>
      </article>
    </div>
  );
}