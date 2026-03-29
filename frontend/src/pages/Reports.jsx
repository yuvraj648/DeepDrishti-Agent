import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import ReportCard from '../components/ReportCard';
import AnalyticsChart from '../components/AnalyticsChart';
import { downloadAnalyticsReportPdf } from '../utils/exportReportsPdf';

const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  'http://localhost:5003/api/v1';

const TIMEFRAME_LABEL = {
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
};

const PLACEHOLDER_IMG =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" fill="%230f172a"><rect width="100%" height="100%"/><text x="50%" y="50%" fill="%2364748b" font-size="13" font-family="system-ui,sans-serif" text-anchor="middle" dy=".35em">No snapshot</text></svg>'
  );

const Reports = () => {
  const navigate = useNavigate();
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h');
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [dispatchMsg, setDispatchMsg] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      const base = API_BASE.replace(/\/$/, '');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const params = { timeframe: selectedTimeframe };
      const urls = [`${base}/reports/analytics`, `${base}/dashboard/reports-analytics`];
      let res = null;
      let lastErr = null;
      for (const url of urls) {
        try {
          res = await axios.get(url, { params, headers });
          break;
        } catch (e) {
          lastErr = e;
          if (e.response?.status !== 404) throw e;
        }
      }
      if (!res) throw lastErr || new Error('No analytics route available');
      setPayload(res.data?.data ?? null);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Could not load reports analytics');
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [selectedTimeframe]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const summary = payload?.summary;
  const charts = payload?.charts;
  const recentIncidents = payload?.recentIncidents ?? [];
  const cameraActivity = payload?.cameraActivity ?? [];

  const analyticsBundle = useCallback(
    () => ({
      timeframe: selectedTimeframe,
      summary,
      charts,
      recentIncidents,
      cameraActivity,
      generatedAt: payload?.generatedAt,
    }),
    [selectedTimeframe, summary, charts, recentIncidents, cameraActivity, payload?.generatedAt]
  );

  const handleEvidenceClick = (incident) => {
    navigate('/reports/detail', {
      state: {
        incidentData: incident,
        analyticsData: analyticsBundle(),
        cameraActivity,
      },
    });
  };

  const handleExportPdf = () => {
    if (!payload) return;
    downloadAnalyticsReportPdf(payload);
  };

  const handleExportJson = () => {
    if (!payload) return;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deep-drishti-reports-${selectedTimeframe}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendCommand = async () => {
    if (!payload) return;
    setDispatchMsg(null);
    try {
      setExportBusy(true);
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      const base = API_BASE.replace(/\/$/, '');
      const body = {
        kind: 'analytics_bundle',
        timeframe: selectedTimeframe,
        recordCount: summary?.totalDetections ?? 0,
      };
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      let res;
      try {
        res = await axios.post(`${base}/reports/dispatch`, body, { headers });
      } catch (e) {
        if (e.response?.status === 404) {
          res = await axios.post(`${base}/dashboard/reports-dispatch`, body, { headers });
        } else {
          throw e;
        }
      }
      const api = res.data;
      const saved = api?.data;
      setDispatchMsg({
        type: 'ok',
        text:
          saved?.commandDispatchId && saved?.systemLogId
            ? `${api?.message || 'Saved.'} Log #${String(saved.systemLogId).slice(-6)} · Command #${String(saved.commandDispatchId).slice(-6)}`
            : api?.message || 'Queued for command channel.',
      });
    } catch (err) {
      console.error(err);
      setDispatchMsg({
        type: 'err',
        text: err.response?.data?.message || 'Dispatch request failed',
      });
    } finally {
      setExportBusy(false);
    }
  };

  const tfSubtitle = TIMEFRAME_LABEL[selectedTimeframe] || selectedTimeframe;

  return (
    <AppShell>
      <main className="flex-1 grid grid-cols-12 overflow-hidden bg-background-dark/30 min-h-0">
        <section className="col-span-3 border-r border-border-muted bg-panel-dark/50 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Recent Incidents</h2>
            {loading && (
              <span className="material-symbols-outlined animate-spin text-primary text-sm">progress_activity</span>
            )}
          </div>
          {error && (
            <div className="mb-3 rounded border border-red-500/40 bg-red-900/20 px-2 py-1.5 text-[10px] text-red-300">
              {error}
              <button
                type="button"
                onClick={fetchAnalytics}
                className="ml-2 underline"
              >
                Retry
              </button>
            </div>
          )}
          <div className="space-y-3">
            {!loading && recentIncidents.length === 0 ? (
              <p className="text-[10px] leading-relaxed text-slate-500">
                No detections in this window. Data will appear as records are logged.
              </p>
            ) : (
              recentIncidents.map((incident, index) => (
                <div
                  key={incident.id || index}
                  className={`cursor-pointer rounded border p-3 transition-colors hover:bg-slate-800/50 ${
                    incident.severity === 'critical'
                      ? 'border-l-4 border-l-red-500'
                      : incident.severity === 'warning'
                        ? 'border-l-4 border-l-orange-500'
                        : 'border-l-4 border-l-primary'
                  }`}
                  onClick={() => handleEvidenceClick(incident)}
                  onKeyDown={(e) => e.key === 'Enter' && handleEvidenceClick(incident)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="mb-2 flex items-start justify-between">
                    <span className="font-mono text-[10px] text-slate-400">{incident.id}</span>
                    <span
                      className={`rounded px-1 text-[10px] font-bold uppercase ${
                        incident.severity === 'critical'
                          ? 'border border-red-400/40 bg-red-500/20 text-red-400'
                          : incident.severity === 'warning'
                            ? 'border border-orange-400/40 bg-orange-500/20 text-orange-400'
                            : 'border border-primary/40 bg-primary/20 text-primary'
                      }`}
                    >
                      {incident.severity}
                    </span>
                  </div>
                  <div className="mb-1 text-sm font-bold text-slate-100">{incident.title}</div>
                  <div className="space-y-1 text-[10px] text-slate-500">
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">videocam</span>
                      {incident.camera}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">schedule</span>
                      {incident.time}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="col-span-6 overflow-y-auto p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold uppercase tracking-wider text-primary">
                Detection Analytics
              </h2>
              <div className="flex gap-2">
                {['24h', '7d', '30d'].map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => setSelectedTimeframe(period)}
                    className={`rounded px-3 py-1 text-[10px] font-bold uppercase transition-colors ${
                      selectedTimeframe === period
                        ? 'bg-primary text-background-dark'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <ReportCard
                title="Total Detections"
                value={
                  summary?.totalDetections != null
                    ? summary.totalDetections.toLocaleString()
                    : '—'
                }
                subtitle={tfSubtitle}
                icon="analytics"
                trend={null}
                color="primary"
              />
              <ReportCard
                title="Critical Alerts"
                value={summary?.criticalAlerts != null ? String(summary.criticalAlerts) : '—'}
                subtitle={tfSubtitle}
                icon="warning"
                trend={null}
                color="danger"
              />
              <ReportCard
                title="Active Cameras"
                value={summary?.activeCameras != null ? String(summary.activeCameras) : '—'}
                subtitle="Feeds marked active"
                icon="videocam"
                trend={null}
                color="success"
              />
              <ReportCard
                title="Avg Confidence"
                value={
                  summary?.avgConfidence != null ? `${summary.avgConfidence}%` : '—'
                }
                subtitle={tfSubtitle}
                icon="trending_up"
                trend={null}
                color="warning"
              />
            </div>

            <AnalyticsChart
              title="Detection Trend Over Time"
              type="line"
              data={charts?.trend?.data ?? []}
              labels={charts?.trend?.labels ?? []}
              color="primary"
              height="h-64"
            />

            <AnalyticsChart
              title="Threat Distribution"
              type="bar"
              data={charts?.threatDistribution?.data ?? []}
              labels={charts?.threatDistribution?.labels ?? []}
              color="danger"
              height="h-48"
            />
          </div>
        </section>

        <section className="col-span-3 overflow-y-auto border-l border-border-muted bg-panel-dark/50 p-4">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Evidence &amp; Activity
          </h2>

          <div className="mb-6 space-y-4">
            <h3 className="text-xs font-bold uppercase text-slate-500">Recent Evidence</h3>
            {!loading && recentIncidents.length === 0 ? (
              <p className="text-[10px] text-slate-500">No evidence thumbnails for this range.</p>
            ) : (
              recentIncidents.map((incident, index) => (
                <div
                  key={`ev-${incident.id || index}`}
                  className="group cursor-pointer"
                  onClick={() => handleEvidenceClick(incident)}
                  onKeyDown={(e) => e.key === 'Enter' && handleEvidenceClick(incident)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="relative overflow-hidden rounded border border-border-muted transition-colors hover:border-primary">
                    <img
                      src={incident.image || PLACEHOLDER_IMG}
                      alt=""
                      className="h-24 w-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="material-symbols-outlined text-2xl text-primary">zoom_in</span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="truncate text-xs font-bold text-slate-100">{incident.title}</p>
                    <p className="text-[10px] text-slate-500">{incident.id}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase text-slate-500">Camera Activity</h3>
            {cameraActivity.length === 0 ? (
              <p className="text-[10px] leading-relaxed text-slate-500">
                No per-camera totals for this window yet. Relative load will appear when detections are
                associated with camera sources.
              </p>
            ) : (
              cameraActivity.map((camera, index) => (
                <div key={camera.name || index} className="rounded bg-slate-800/50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm font-bold text-slate-100">{camera.name}</div>
                    <div
                      className={`h-2 w-2 rounded-full ${
                        camera.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'
                      }`}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-500">Relative load</span>
                      <span className="font-bold text-primary">{camera.activity}%</span>
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-slate-700">
                      <div className="h-full bg-primary" style={{ width: `${camera.activity}%` }} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-8 space-y-3">
            <h3 className="text-xs font-bold uppercase text-slate-500">Export Reports</h3>
            <p className="text-[9px] leading-relaxed text-slate-600">
              Exports use live analytics for the selected timeframe ({tfSubtitle}).
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={!payload || loading}
                title="PDF: summary, trends, threat mix, incidents, camera load (when available)."
                className="flex w-full items-center justify-center gap-2 rounded bg-slate-800 px-3 py-2 text-[10px] font-bold uppercase text-slate-300 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                Generate PDF Report
              </button>
              <button
                type="button"
                onClick={handleExportJson}
                disabled={!payload || loading}
                className="flex w-full items-center justify-center gap-2 rounded bg-slate-800 px-3 py-2 text-[10px] font-bold uppercase text-slate-300 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">code</span>
                Export JSON Data
              </button>
              <button
                type="button"
                onClick={handleSendCommand}
                disabled={!payload || loading || exportBusy}
                className="flex w-full items-center justify-center gap-2 rounded bg-primary px-3 py-2 text-[10px] font-bold uppercase text-background-dark transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">send</span>
                {exportBusy ? 'Sending…' : 'Send to Command'}
              </button>
              {dispatchMsg && (
                <p
                  className={`text-[9px] ${
                    dispatchMsg.type === 'ok' ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {dispatchMsg.text}
                </p>
              )}
            </div>
          </div>
        </section>
      </main>
    </AppShell>
  );
};

export default Reports;
