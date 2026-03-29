import React from 'react';

const SettingCard = ({ 
  title, 
  icon, 
  children,
  className = '',
  isFullWidth = false
}) => {
  return (
    <section className={`border border-border-muted bg-panel-dark/20 p-5 ${isFullWidth ? 'col-span-full' : ''} ${className}`}>
      <div className="flex items-center gap-2 mb-6">
        <span className="material-symbols-outlined text-primary text-lg">{icon}</span>
        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-300">{title}</h3>
      </div>
      <div className="space-y-6">
        {children}
      </div>
    </section>
  );
};

export default SettingCard;
