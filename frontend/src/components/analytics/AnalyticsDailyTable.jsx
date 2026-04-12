function formatNumber(value) {
  if (value == null) return "-";
  return new Intl.NumberFormat("ja-JP").format(value);
}

function formatPercent(value) {
  if (value == null) return "-";
  return `${(value * 100).toFixed(2)}%`;
}

export default function AnalyticsDailyTable({ analytics }) {
  if (!analytics.length) {
    return (
      <p className="empty-text">
        まだ分析データがありません。同期ボタンで取得してください。
      </p>
    );
  }

  return (
    <div className="analytics-table-wrapper">
      <table className="analytics-table">
        <thead>
          <tr>
            <th>日付</th>
            <th>再生数</th>
            <th>高評価</th>
            <th>コメント</th>
            <th>平均視聴秒数</th>
            <th>総視聴時間(分)</th>
            <th>表示回数</th>
            <th>CTR</th>
            <th>登録者増</th>
            <th>取得元</th>
          </tr>
        </thead>
        <tbody>
          {analytics.map((row) => (
            <tr key={row.id}>
              <td>{row.metric_date}</td>
              <td>{formatNumber(row.views)}</td>
              <td>{formatNumber(row.likes)}</td>
              <td>{formatNumber(row.comments)}</td>
              <td>{formatNumber(row.average_view_duration_seconds)}</td>
              <td>{formatNumber(row.watch_time_minutes)}</td>
              <td>{formatNumber(row.impressions)}</td>
              <td>{formatPercent(row.impression_click_through_rate)}</td>
              <td>{formatNumber(row.subscribers_gained)}</td>
              <td>{row.data_source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}