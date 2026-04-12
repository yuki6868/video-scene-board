import { useEffect, useRef, useState } from "react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";

function AudienceGenderChart({ genderRatio }) {
  const wrapRef = useRef(null);
  const [chartWidth, setChartWidth] = useState(0);

  const chartData = [
    { name: "男性", value: genderRatio?.male ?? 0, color: "#60a5fa" },
    { name: "女性", value: genderRatio?.female ?? 0, color: "#f472b6" },
    { name: "その他", value: genderRatio?.other ?? 0, color: "#a78bfa" },
  ];

  const hasData = chartData.some((item) => item.value > 0);

  useEffect(() => {
    const element = wrapRef.current;
    if (!element) return;

    const updateWidth = () => {
      const nextWidth = Math.floor(element.getBoundingClientRect().width);
      setChartWidth(nextWidth > 0 ? nextWidth : 0);
    };

    updateWidth();

    const observer = new ResizeObserver(() => {
      updateWidth();
    });

    observer.observe(element);
    window.addEventListener("resize", updateWidth);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateWidth);
    };
  }, []);

  if (!hasData) {
    return <div className="audience-chart-empty">性別データがありません</div>;
  }

  return (
    <div className="audience-chart-card">
      <div className="audience-chart-title">性別比率</div>

      <div ref={wrapRef} className="audience-chart-wrap">
        {chartWidth > 0 ? (
          <PieChart width={chartWidth} height={220}>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              isAnimationActive={false}
            >
              {chartData.map((item) => (
                <Cell key={item.name} fill={item.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `${value}%`} />
          </PieChart>
        ) : null}
      </div>

      <div className="audience-chart-legend">
        {chartData.map((item) => (
          <div key={item.name} className="audience-chart-legend-item">
            <span
              className="audience-chart-legend-color"
              style={{ backgroundColor: item.color }}
            />
            <span className="audience-chart-legend-label">{item.name}</span>
            <span className="audience-chart-legend-value">{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AudienceGenderChart;