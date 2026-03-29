import React from 'react';

const ImagePanel = ({ title, image, status, overlay, children }) => {
  return (
    <div className="relative bg-slate-900 border border-border-muted rounded-lg overflow-hidden">
      {/* Header */}
      <div className="absolute top-4 left-4 z-10 bg-background-dark/80 px-2 py-1 rounded border border-border-muted">
        <span className="text-[10px] font-mono uppercase text-slate-400">{title}</span>
      </div>
      
      {/* Status Badge */}
      {status && (
        <div className={`absolute top-4 right-4 z-10 px-2 py-1 rounded border backdrop-blur-sm ${
          status === 'enhanced' 
            ? 'bg-primary/20 border-primary/40' 
            : status === 'grayscale'
            ? 'bg-slate-700/80 border-slate-600'
            : 'bg-background-dark/80 border-border-muted'
        }`}>
          <span className={`text-[10px] font-mono uppercase ${
            status === 'enhanced' 
              ? 'text-primary' 
              : status === 'grayscale'
              ? 'text-slate-400'
              : 'text-slate-400'
          }`}>
            {status === 'enhanced' ? 'Enhanced Frame (AI V2.4)' : 'Original Frame'}
          </span>
        </div>
      )}

      {/* Image Container */}
      <div className="relative w-full h-96 bg-cover bg-center" style={{ backgroundImage: `url(${image})` }}>
        {/* Overlay for grayscale effect */}
        {status === 'grayscale' && (
          <div className="absolute inset-0 grayscale opacity-50" />
        )}
        
        {/* Detection Overlay */}
        {overlay && (
          <div className="absolute top-1/3 left-1/3 border-2 border-primary/60 w-32 h-32">
            <span className="absolute -top-5 left-0 bg-primary px-1.5 py-0.5 text-[8px] font-bold text-background-dark">
              STRUCT_PIPE [98.4%]
            </span>
          </div>
        )}
      </div>
      
      {/* Children */}
      {children}
    </div>
  );
};

export default ImagePanel;
