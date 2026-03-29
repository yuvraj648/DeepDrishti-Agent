import React from 'react';

const ReportCard = ({ title, value, subtitle, icon, trend, color = "primary" }) => {
  const colorClasses = {
    primary: "bg-primary/20 border-primary/40 text-primary",
    danger: "bg-red-500/20 border-red-500/40 text-red-400",
    success: "bg-green-500/20 border-green-500/40 text-green-400",
    warning: "bg-yellow-500/20 border-yellow-500/40 text-yellow-400"
  };

  return (
    <div className={`p-4 border ${colorClasses[color]} rounded-lg`}>
      <div className="flex items-center justify-between mb-2">
        <span className="material-symbols-outlined text-2xl opacity-70">{icon}</span>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-bold ${
            trend.isPositive ? 'text-green-400' : 'text-red-400'
          }`}>
            <span className="material-symbols-outlined text-sm">
              {trend.isPositive ? 'trending_up' : 'trending_down'}
            </span>
            {trend.value}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-xs text-slate-400">{subtitle}</div>
    </div>
  );
};

export default ReportCard;
