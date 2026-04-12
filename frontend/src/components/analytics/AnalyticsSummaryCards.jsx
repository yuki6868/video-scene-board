function formatNumber(value) {
  if (value == null) return "-";
  return new Intl.NumberFormat("ja-JP").format(value);
}

function formatPercent(value) {
  if (value == null) return "-";
  return `${(value * 100).toFixed(2)}%`;
}

function formatDiff(value) {
  if (value > 0) return `+${value}`;
  return value;
}

export default function AnalyticsSummaryCards({ summary }) {
  if (!summary) {
    return <p className="empty-text">サマリーデータがありません</p>;
  }

  return (
    <div className="analytics-summary-grid">
      <article className="analytics-card">
        <span className="analytics-card-label">再生数</span>
        <strong>{formatNumber(summary.latest_views)}</strong>
        <small>前日比: {formatDiff(summary.views_diff_vs_previous_day)}</small>
      </article>

      <article className="analytics-card">
        <span className="analytics-card-label">高評価</span>
        <strong>{formatNumber(summary.latest_likes)}</strong>
      </article>

      <article className="analytics-card">
        <span className="analytics-card-label">コメント</span>
        <strong>{formatNumber(summary.latest_comments)}</strong>
      </article>

      <article className="analytics-card">
        <span className="analytics-card-label">CTR</span>
        <strong>
          {formatPercent(summary.latest_impression_click_through_rate)}
        </strong>
        <small>
          前日比: {formatPercent(summary.ctr_diff_vs_previous_day)}
        </small>
      </article>

      <article className="analytics-card">
        <span className="analytics-card-label">7日再生数</span>
        <strong>{formatNumber(summary.views_last_7_days)}</strong>
      </article>

      <article className="analytics-card">
        <span className="analytics-card-label">7日視聴時間</span>
        <strong>{formatNumber(summary.watch_time_minutes_last_7_days)}</strong>
      </article>

      <article className="analytics-card">
        <span className="analytics-card-label">登録者増(7日)</span>
        <strong>{formatNumber(summary.subscribers_gained_last_7_days)}</strong>
      </article>
    </div>
  );
}