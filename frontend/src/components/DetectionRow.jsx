import React from 'react';

const DetectionRow = ({ detection, onSelect, isSelected }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'Investigating':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
      case 'Confirmed':
        return 'bg-green-500/20 text-green-400 border-green-500/40';
      case 'False Positive':
        return 'bg-red-500/20 text-red-400 border-red-500/40';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/40';
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 90) return 'text-green-400';
    if (confidence >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div 
      className={`grid grid-cols-6 gap-3 px-4 py-3 border-b border-border-muted hover:bg-slate-800/50 cursor-pointer transition-colors ${
        isSelected ? 'bg-primary/5 border-primary/50' : ''
      }`}
      onClick={onSelect}
    >
      <div className="text-xs text-slate-400 font-mono">
        {detection.id}
      </div>
      <div className="text-xs text-slate-300">
        {detection.cameraSource}
      </div>
      <div className="text-xs text-slate-300">
        {detection.objectDetected}
      </div>
      <div className={`text-xs font-mono font-bold ${getConfidenceColor(detection.confidence)}`}>
        {detection.confidence.toFixed(1)}%
      </div>
      <div className="text-xs text-slate-400 font-mono">
        {detection.timestamp}
      </div>
      <div className="flex items-center justify-center">
        <span className={`px-2 py-1 text-[10px] font-bold uppercase border rounded ${getStatusColor(detection.status)}`}>
          {detection.status}
        </span>
      </div>
    </div>
  );
};

export default DetectionRow;
