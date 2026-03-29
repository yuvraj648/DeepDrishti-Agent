import React from 'react';

const LogRow = ({ 
  timestamp, 
  severity, 
  module, 
  description, 
  isActive = false 
}) => {
  const getSeverityColor = (severity) => {
    switch (severity.toLowerCase()) {
      case 'info':
        return 'text-primary border-primary';
      case 'warn':
        return 'text-severity-warning border-severity-warning';
      case 'crit':
        return 'text-severity-critical border-severity-critical bg-severity-critical/5';
      default:
        return 'text-slate-400 border-slate-400';
    }
  };

  const getSeverityBg = (severity) => {
    switch (severity.toLowerCase()) {
      case 'crit':
        return 'bg-severity-critical/5';
      default:
        return '';
    }
  };

  return (
    <div 
      className={`flex gap-4 hover:bg-white/5 px-2 transition-colors border-l-2 border-transparent hover:border-primary ${
        isActive ? 'border-primary' : ''
      } ${getSeverityBg(severity)}`}
    >
      <span className="text-slate-600 whitespace-nowrap font-mono text-xs">
        {timestamp}
      </span>
      <span className={`font-bold uppercase w-16 text-xs ${getSeverityColor(severity)}`}>
        [{severity}]
      </span>
      <span className="text-slate-400 font-bold w-32 text-xs">
        {module}
      </span>
      <span className="flex-1 text-xs">
        {description}
      </span>
    </div>
  );
};

export default LogRow;
