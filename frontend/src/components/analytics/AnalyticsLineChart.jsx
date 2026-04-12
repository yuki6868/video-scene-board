import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function formatNumber(value) {
  if (value == null) return "-";
  return new Intl.NumberFormat("ja-JP").format(value);
}

export default function AnalyticsLineChart({ analytics }) {
  if (!analytics.length) {
    return null;
  }

  const chartData = analytics.map((row) => ({
    date: row.metric_date,
    views: row.views,
    ctrPercent: Number((row.impression_click_through_rate * 100).toFixed(2)),
  }));

  return (
    <div className="analytics-chart-grid">
      <section className="analytics-chart-card">
        <div className="analytics-chart-header">
          <h4>再生数推移</h4>
          <p>日ごとの再生数の変化です。</p>
        </div>

        <div className="analytics-chart-box">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={formatNumber} />
              <Tooltip formatter={(value) => formatNumber(value)} />
              <Line
                type="monotone"
                dataKey="views"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="analytics-chart-card">
        <div className="analytics-chart-header">
          <h4>CTR推移</h4>
          <p>インプレッションのクリック率です。</p>
        </div>

        <div className="analytics-chart-box">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(value) => `${value}%`} />
              <Tooltip formatter={(value) => `${value}%`} />
              <Line
                type="monotone"
                dataKey="ctrPercent"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}