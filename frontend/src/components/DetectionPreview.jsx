import React from 'react';

const DetectionPreview = ({ detection }) => {
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
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border-muted p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold">Detection: {detection.id}</h3>
          <span className={`px-2 py-1 text-[10px] font-bold uppercase border rounded ${getStatusColor(detection.status)}`}>
            {detection.status}
          </span>
        </div>
        <p className="text-[10px] text-slate-500">
          Detected at {detection.timestamp}
        </p>
      </div>

      {/* Camera Snapshot */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold uppercase text-slate-500">Camera Snapshot</h4>
          <div className="relative rounded border border-border-muted bg-slate-900 overflow-hidden aspect-video">
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url('${detection.snapshot}')` }}
            />
            <div className="absolute bottom-2 left-2 bg-background-dark/80 px-2 py-1 rounded border border-border-muted">
              <span className="text-[9px] font-mono uppercase text-slate-400">{detection.cameraSource}</span>
            </div>
            {/* Detection Overlay */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-2 border-primary/60 w-32 h-32">
              <span className="absolute -top-5 left-0 bg-primary px-1.5 py-0.5">
                <span className="text-[8px] font-bold text-background-dark">{detection.objectDetected} [{detection.confidence.toFixed(1)}%]</span>
              </span>
            </div>
          </div>
        </div>

        {/* Detection Details */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold uppercase text-slate-500">Detection Details</h4>
          <div className="bg-background-dark/40 border border-border-muted p-3 rounded space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-500">Object Name:</span>
              <span className="text-xs font-bold text-slate-300">{detection.objectDetected}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-500">Confidence:</span>
              <span className={`text-xs font-bold font-mono ${getConfidenceColor(detection.confidence)}`}>
                {detection.confidence.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-500">Time Detected:</span>
              <span className="text-xs font-mono text-slate-300">{detection.timestamp}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-500">Camera Source:</span>
              <span className="text-xs font-mono text-slate-300">{detection.cameraSource}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold uppercase text-slate-500">Actions</h4>
          <div className="flex gap-2">
            <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] font-bold uppercase rounded hover:bg-red-500/30">
              <span className="material-symbols-outlined text-sm">close</span>
              False Positive
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary/20 border border-primary/40 text-primary text-[10px] font-bold uppercase rounded hover:bg-primary/30">
              <span className="material-symbols-outlined text-sm">check</span>
              Confirm
            </button>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="border-t border-border-muted p-4">
        <div className="flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-border-muted text-[10px] font-bold uppercase rounded hover:bg-slate-800">
            <span className="material-symbols-outlined text-sm">comment</span>
            Add Note
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary text-background-dark text-[10px] font-bold uppercase rounded hover:brightness-110">
            <span className="material-symbols-outlined text-sm">description</span>
            Generate Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetectionPreview;
