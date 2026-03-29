import React, { useState, useEffect, useCallback } from 'react';
import AppShell from '../components/AppShell';
import LogRow from '../components/LogRow';
import ToggleSwitch from '../components/ToggleSwitch';
import api from '../services/authService';

function formatLogTime(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    const ms = String(d.getMilliseconds()).padStart(3, '0');
    return `${d.toLocaleTimeString('en-US', { hour12: false })}.${ms}`;
  } catch {
    return String(iso);
  }
}

const SystemLogs = () => {
  const [autoScroll, setAutoScroll] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [logType, setLogType] = useState('ALL SYSTEMS');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(() =>
    new Date().toLocaleTimeString('en-US', { hour12: false })
  );

  const fetchLogs = useCallback(async () => {
    try {
      setError(null);
      const params = {
        limit: 400,
        ...(searchQuery.trim() ? { q: searchQuery.trim() } : {}),
        ...(severityFilter !== 'all' ? { severity: severityFilter.toUpperCase() } : {}),
        ...(logType !== 'ALL SYSTEMS' ? { module: logType } : {}),
      };
      const res = await api.get('/system-logs', { params });
      const list = res?.data ?? [];
      setLogs(
        list.map((l) => ({
          id: l._id,
          timestamp: formatLogTime(l.timestamp),
          severity: l.severity,
          module: l.module,
          description: l.message,
        }))
      );
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Could not load system logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, severityFilter, logType]);

  useEffect(() => {
    setLoading(true);
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    const id = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const poll = setInterval(fetchLogs, 8000);
    return () => clearInterval(poll);
  }, [fetchLogs]);

  useEffect(() => {
    if (autoScroll) {
      const logContainer = document.getElementById('log-container');
      if (logContainer) {
        logContainer.scrollTop = logContainer.scrollHeight;
      }
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs;

  const systemTelemetry = {
    uptime: '—',
    gpuLoad: null,
    inferenceSpeed: null,
    activeCams: '—',
    dbStatus: 'Live',
  };

  const activeAssets = [];

  return (
    <AppShell>
      <div className="flex min-h-0 flex-1 flex-row overflow-hidden">
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <section className="grid grid-cols-12 gap-4 border-b border-border-muted bg-panel-dark p-4">
            <div className="col-span-3">
              <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">
                Log source
              </label>
              <select
                value={logType}
                onChange={(e) => setLogType(e.target.value)}
                className="w-full appearance-none rounded border border-border-muted bg-background-dark px-3 py-2 font-mono text-xs text-slate-100 focus:border-primary focus:ring-0"
              >
                <option>ALL SYSTEMS</option>
                <option>AI-DETECTOR</option>
                <option>SURVEILLANCE-UI</option>
                <option>SYS-KERNEL</option>
                <option>COMM-RELAY</option>
                <option>USER-AUDIT</option>
              </select>
            </div>

            <div className="col-span-3">
              <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">
                Severity
              </label>
              <div className="flex gap-1">
                {['all', 'info', 'warn', 'crit'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSeverityFilter(s)}
                    className={`flex-1 border border-border-muted bg-background-dark py-2 text-[10px] uppercase hover:bg-primary/5 ${
                      severityFilter === s ? 'border-primary text-primary' : 'text-slate-400'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="col-span-4">
              <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">
                Keyword search
              </label>
              <div className="flex gap-1">
                <input
                  type="text"
                  placeholder="Filter message or module…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 rounded border border-border-muted bg-background-dark px-3 py-2 font-mono text-xs text-slate-100 focus:border-primary focus:ring-0"
                />
                <button
                  type="button"
                  onClick={fetchLogs}
                  className="bg-primary px-3 text-background-dark hover:bg-primary/90"
                  aria-label="Refresh logs"
                >
                  <span className="material-symbols-outlined text-sm font-bold">search</span>
                </button>
              </div>
            </div>

            <div className="col-span-2 flex flex-col justify-end">
              <div className="mb-1 flex items-center justify-end gap-2">
                <span className="text-[10px] font-bold uppercase text-slate-500">Auto-scroll</span>
                <ToggleSwitch
                  checked={autoScroll}
                  onChange={setAutoScroll}
                  size="small"
                  aria-label="Auto-scroll log view"
                />
              </div>
              {loading && (
                <span className="text-right text-[10px] text-slate-500">Loading…</span>
              )}
            </div>
          </section>

          {error && (
            <div className="border-b border-red-500/40 bg-red-900/20 px-4 py-2 text-[10px] text-red-300">
              {error}{' '}
              <button type="button" className="underline" onClick={fetchLogs}>
                Retry
              </button>
            </div>
          )}

          <section className="relative flex flex-1 flex-col overflow-hidden bg-background-dark">
            <div className="pointer-events-none absolute top-0 z-10 h-20 w-full bg-gradient-to-b from-primary/5 to-transparent" />

            <div className="flex items-center justify-between border-b border-border-muted bg-slate-900/50 px-4 py-2">
              <div className="flex gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
              </div>
              <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-slate-500">
                system-logs /api/v1/system-logs
              </span>
              <button
                type="button"
                className="text-slate-600 hover:text-primary"
                onClick={fetchLogs}
                aria-label="Refresh"
              >
                <span className="material-symbols-outlined cursor-pointer text-sm">refresh</span>
              </button>
            </div>

            <div
              id="log-container"
              className="flex-1 overflow-y-auto p-4 font-mono text-sm leading-relaxed"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#00d4ff #0b1220',
              }}
            >
              {filteredLogs.map((log) => (
                <LogRow
                  key={log.id || log.timestamp + log.description}
                  timestamp={log.timestamp}
                  severity={log.severity}
                  module={log.module}
                  description={log.description}
                />
              ))}
              <div className="mt-4 flex items-center gap-4 px-2">
                <span className="animate-pulse font-bold text-primary">_</span>
              </div>
            </div>
          </section>
        </main>

        <aside className="flex w-64 flex-col border-l border-border-muted bg-panel-dark">
          <div className="border-b border-border-muted p-4">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-primary">
              System telemetry
            </h3>
            <p className="text-[10px] leading-relaxed text-slate-500">
              Live GPU and camera telemetry will appear here when wired to monitoring endpoints.
            </p>
            <div className="mt-4 space-y-2 text-[10px] text-slate-400">
              <div className="flex justify-between">
                <span className="uppercase">DB link</span>
                <span className="font-mono text-primary">{systemTelemetry.dbStatus}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 p-4">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
              Active assets
            </h3>
            {activeAssets.length === 0 ? (
              <p className="text-[10px] text-slate-500">No asset list from API yet.</p>
            ) : (
              activeAssets.map((asset, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between border-b border-border-muted/50 pb-2 text-[10px]"
                >
                  <span>{asset.name}</span>
                  <span>{asset.status}</span>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>

      <footer className="flex h-8 shrink-0 items-center justify-between border-t border-border-muted bg-background-dark px-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            <span className="text-[9px] font-bold uppercase tracking-tighter text-slate-500">
              Log bus connected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold uppercase tracking-tighter text-slate-500">
              UTC {currentTime}
            </span>
          </div>
        </div>
        <div className="text-[9px] font-mono uppercase tracking-tighter text-slate-600">
          Deep-Drishti system logs
        </div>
      </footer>
    </AppShell>
  );
};

export default SystemLogs;
