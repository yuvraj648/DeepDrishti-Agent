import React from 'react';

const SurveillanceFeed = ({ 
  cameraName, 
  status = 'Online', 
  timestamp, 
  imageUrl, 
  isActive = false,
  showControls = false,
  onClick 
}) => {
  return (
    <div 
      className={`relative overflow-hidden group cursor-pointer ${
        isActive ? 'border border-primary' : 'border border-primary/30'
      } bg-[#080c14] aspect-video`}
      onClick={onClick}
    >
      {/* Video/Image Background */}
      <div 
        className="absolute inset-0 opacity-40 mix-blend-screen"
        style={{
          backgroundImage: `url('${imageUrl}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      
      {/* Scanline effect */}
      <div 
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, transparent 50%, rgba(0, 212, 255, 0.02) 50%)',
          backgroundSize: '100% 4px'
        }}
      />
      
      {/* Top Left: Camera Info */}
      <div className="absolute top-3 left-3 flex items-start justify-between w-full">
        <div className="flex items-center gap-2">
          <h3 className="text-white text-xs font-bold tracking-widest uppercase bg-background-dark/80 px-2 py-1 border-l-2 border-primary">
            {cameraName}
          </h3>
        </div>
        <div className="flex items-center gap-2 bg-background-dark/80 px-2 py-1">
          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-primary animate-pulse' : 'bg-primary'}`}></span>
          <span className="text-[10px] text-white font-bold uppercase tracking-tighter">{status}</span>
        </div>
      </div>
      
      {/* Bottom Right: Timestamp */}
      {timestamp && (
        <div className="absolute bottom-3 right-3 text-[10px] font-mono text-white bg-background-dark/80 px-2 py-1 tracking-tighter">
          {timestamp}
        </div>
      )}
      
      {/* Hover overlay */}
      {showControls && (
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button className="bg-primary/80 hover:bg-primary text-background-dark text-[10px] font-bold px-4 py-2 uppercase tracking-wider transition-colors">
            Open Feed
          </button>
        </div>
      )}
    </div>
  );
};

export default SurveillanceFeed;
