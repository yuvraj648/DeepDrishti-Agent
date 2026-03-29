import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { path: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { path: '/surveillance', icon: 'videocam', label: 'Surveillance' },
    { path: '/enhancement-lab', icon: 'science', label: 'Enhancement Lab' },
    { path: '/detection-records', icon: 'warning', label: 'Detections' },
    { path: '/reports', icon: 'description', label: 'Reports' },
    { path: '/system-logs', icon: 'terminal', label: 'System Logs' },
    { path: '/settings', icon: 'tune', label: 'Settings' },
  ];

  return (
    <aside className={`${isCollapsed ? 'w-16' : 'w-64'} border-r border-primary/10 flex flex-col bg-background-dark/40 backdrop-blur-sm relative transition-all duration-300`}>
      <nav className="flex-1 py-6 px-3 space-y-1">
        {menuItems.map((item) => {
          const active =
            item.path === '/dashboard'
              ? location.pathname === '/dashboard'
              : location.pathname === item.path ||
                location.pathname.startsWith(`${item.path}/`);
          return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center ${isCollapsed ? 'justify-center' : ''} gap-3 px-4 py-3 transition-colors ${
              active
                ? 'bg-primary text-background-dark font-bold rounded-sm'
                : 'text-slate-400 hover:text-primary hover:bg-primary/5'
            }`}
            title={isCollapsed ? item.label : ''}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            {!isCollapsed && (
              <>
                <span className="uppercase text-xs tracking-wider">{item.label}</span>
                {item.badge && (
                  <span className="ml-auto bg-primary/20 text-primary text-[10px] px-1.5 py-0.5 font-bold">
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </Link>
        );
        })}
      </nav>
      
      {!isCollapsed && (
        <div className="p-4 border-t border-primary/10">
          <div className="p-3 bg-primary/5 border border-primary/20">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] uppercase text-primary/60">System Health</span>
              <span className="text-[10px] font-bold text-primary">STABLE</span>
            </div>
            <div className="h-1 w-full bg-slate-800">
              <div className="h-full bg-primary w-4/5"></div>
            </div>
          </div>
        </div>
      )}
      
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`absolute ${isCollapsed ? '-right-3' : '-right-3'} top-1/2 transform -translate-y-1/2 w-6 h-12 bg-background-dark border border-primary/20 hover:bg-primary/10 flex items-center justify-center rounded-r-md cursor-pointer z-20 group transition-all duration-300`}
      >
        <span className="material-symbols-outlined text-primary text-sm group-hover:scale-110 transition-transform">
          {isCollapsed ? 'chevron_left' : 'chevron_right'}
        </span>
      </button>
    </aside>
  );
};

export default Sidebar;
