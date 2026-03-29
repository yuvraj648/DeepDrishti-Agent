import React from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

/**
 * Shared chrome after login: Deep-Drishti navbar + dashboard sidebar + page content.
 */
const AppShell = ({ children }) => {
  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen flex flex-col overflow-hidden relative font-display">
      <div
        className="absolute inset-0 pointer-events-none opacity-20 z-0"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(0, 212, 255, 0.1) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <Navbar />

      <div className="flex flex-1 overflow-hidden relative z-10 min-h-0">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AppShell;
