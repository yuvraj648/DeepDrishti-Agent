import React from 'react';

const AnalyticsChart = ({ title, type = "line", data, labels, color = "primary", height = "h-64" }) => {
  const colorClasses = {
    primary: "#00d4ff",
    danger: "#ff4d4d",
    success: "#10b981",
    warning: "#fbbf24"
  };

  const chartColor = colorClasses[color];

  // Simple SVG chart implementation
  const renderLineChart = () => {
    const series = Array.isArray(data) && data.length ? data : [0];
    const max = Math.max(...series, 1);
    const min = Math.min(...series);
    const range = max - min || 1;
    const last = Math.max(1, series.length - 1);

    const points = series.map((value, index) => {
      const x = (index / last) * 100;
      const y = 100 - ((value - min) / range) * 80 - 10; // 80% height, 10% padding
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((y) => (
          <line
            key={y}
            x1="0" y1={y} x2="100" y2={y}
            stroke="#1e293b" strokeWidth="0.5"
          />
        ))}
        {/* Data line */}
        <polyline
          points={points}
          fill="none"
          stroke={chartColor}
          strokeWidth="2"
        />
        {/* Data points */}
        {data.map((value, index) => {
          const x = (index / (data.length - 1)) * 100;
          const y = 100 - ((value - min) / range) * 80 - 10;
          return (
            <circle
              key={index}
              cx={x} cy={y}
              r="2"
              fill={chartColor}
            />
          );
        })}
      </svg>
    );
  };

  const renderBarChart = () => {
    const series = Array.isArray(data) && data.length ? data : [0];
    const maxBar = Math.max(...series, 1);
    const barWidth = (100 / series.length) * 0.6;
    const gap = (100 / series.length) * 0.4;

    return (
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((y) => (
          <line
            key={y}
            x1="0" y1={y} x2="100" y2={y}
            stroke="#1e293b" strokeWidth="0.5"
          />
        ))}
        {/* Bars */}
        {series.map((value, index) => {
          const height = (value / maxBar) * 80; // 80% height
          const x = index * (barWidth + gap) + gap / 2;
          const y = 90 - height; // 90% position, subtract height
          
          return (
            <rect
              key={index}
              x={x} y={y}
              width={barWidth}
              height={height}
              fill={chartColor}
              opacity="0.8"
            />
          );
        })}
      </svg>
    );
  };

  return (
    <div className={`p-4 border border-border-muted bg-panel-dark/50 rounded-lg ${height}`}>
      <h3 className="text-sm font-bold text-slate-100 mb-4">{title}</h3>
      <div className="h-32">
        {type === "line" ? renderLineChart() : renderBarChart()}
      </div>
      {labels && (
        <div className="flex justify-between mt-2 text-xs text-slate-500">
          {labels.map((label, index) => (
            <span key={index} className="truncate">{label}</span>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnalyticsChart;
