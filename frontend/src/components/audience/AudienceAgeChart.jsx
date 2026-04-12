import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function AudienceAgeChart({ ageDistribution }) {
  const chartData = [
    { label: "13-17", value: ageDistribution?.["13-17"] ?? 0 },
    { label: "18-24", value: ageDistribution?.["18-24"] ?? 0 },
    { label: "25-34", value: ageDistribution?.["25-34"] ?? 0 },
    { label: "35-44", value: ageDistribution?.["35-44"] ?? 0 },
    { label: "45-54", value: ageDistribution?.["45-54"] ?? 0 },
    { label: "55-64", value: ageDistribution?.["55-64"] ?? 0 },
    { label: "65+", value: ageDistribution?.["65+"] ?? 0 },
  ];

  const hasData = chartData.some((item) => item.value > 0);
  const mainAge = hasData
    ? chartData.reduce((max, current) => (current.value > max.value ? current : max))
    : null;

  if (!hasData) {
    return <div className="audience-chart-empty">年齢層データがありません</div>;
  }

  return (
    <div className="audience-chart-card">
      <div className="audience-chart-title">年齢層</div>

      <div className="audience-age-summary">
        主視聴層: <strong>{mainAge?.label ?? "-"}</strong>
      </div>

      <div className="audience-age-chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 8, right: 12, left: 8, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" unit="%" />
            <YAxis type="category" dataKey="label" width={48} />
            <Tooltip formatter={(value) => `${value}%`} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default AudienceAgeChart;