import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import marineService from '../services/marineService';
import FeedVideoPlayer from '../components/FeedVideoPlayer';
import AppShell from '../components/AppShell';

function formatAgeMs(ms) {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)} s`;
  return `${Math.round(ms / 60000)} m`;
}

function mapPanelSeverityToAlert(panelSeverity) {
  const u = String(panelSeverity || '').toUpperCase();
  if (u === 'CRITICAL') return 'critical';
  if (u === 'HIGH') return 'high';
  if (u === 'MEDIUM') return 'medium';
  return 'low';
}

const Surveillance = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [feeds, setFeeds] = useState([]);
  const [selectedFeed, setSelectedFeed] = useState(null);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [actionStatus, setActionStatus] = useState(null);
  const [markingRoi, setMarkingRoi] = useState(false);
  const [markCorner, setMarkCorner] = useState(null);
  const [raiseBusy, setRaiseBusy] = useState(false);

  const videoRef = useRef(null);
  const viewportRef = useRef(null);

  // Constants for coordinate mapping
  const W_REF = 1280;
  const H_REF = 720;

  const selectedFeedId = searchParams.get('feed');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        let feedsData;
        try {
          feedsData = await marineService.getActiveFeeds();
        } catch (err) {
          console.log('Using test feeds data');
          feedsData = await marineService.getTestActiveFeeds();
        }
        const feedsList = feedsData.data || [];
        setFeeds(feedsList);
        const paramId = new URLSearchParams(window.location.search).get('feed');
        if (!paramId && feedsList.length > 0) {
          setSearchParams({ feed: String(feedsList[0]._id) }, { replace: true });
        }
      } catch (err) {
        console.error('Failed to fetch feeds:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [setSearchParams]);

  useEffect(() => {
    if (!selectedFeedId) {
      setSelectedFeed(null);
      setRecentAlerts([]);
      return;
    }
    const idForApi = String(selectedFeedId);
    const fetchFeedDetails = async () => {
      try {
        setSelectedFeed(null);
        let feedDetails;
        try {
          feedDetails = await marineService.getSurveillanceMode(idForApi);
        } catch (err) {
          console.log('Using test surveillance data');
          feedDetails = await marineService.getTestSurveillanceMode(idForApi);
        }
        setSelectedFeed(feedDetails.data?.feed || null);
        setRecentAlerts(feedDetails.data?.recentAlerts || []);
      } catch (err) {
        console.error('Failed to fetch feed details:', err);
        setSelectedFeed(null);
        setRecentAlerts([]);
      }
    };
    fetchFeedDetails();
  }, [selectedFeedId]);

  useEffect(() => {
    if (!selectedFeed) return;
    const paused = selectedFeed.surveillance?.streamPaused;
    if (typeof paused === 'boolean') {
      setIsPaused(paused);
    }
  }, [selectedFeed]);

  const refreshAiAnalysis = useCallback(async () => {
    if (!selectedFeedId) return;
    try {
      setAnalysisLoading(true);
      setAnalysisError(null);
      const res = await marineService.getSurveillanceAiAnalysis(String(selectedFeedId));
      setAiAnalysis(res.data || null);
      if (res.data && typeof res.data.streamPaused === 'boolean') {
        setIsPaused(res.data.streamPaused);
      }
    } catch (e) {
      console.error(e);
      setAnalysisError(e.message || 'Could not load AI analysis');
      setAiAnalysis(null);
    } finally {
      setAnalysisLoading(false);
    }
  }, [selectedFeedId]);

  useEffect(() => {
    refreshAiAnalysis();
    const t = setInterval(refreshAiAnalysis, 5000); // Increased frequency for real-time feel
    return () => clearInterval(t);
  }, [refreshAiAnalysis]);

  const setStatus = (msg, isErr = false) => {
    setActionStatus({ msg, isErr });
    setTimeout(() => setActionStatus(null), 5000);
  };

  const handleCameraSelect = (feedId) => {
    setSearchParams({ feed: String(feedId) });
  };

  const handleReturnToGrid = () => {
    navigate('/dashboard');
  };

  const handleRaiseAlert = async () => {
    if (!selectedFeedId || !selectedFeed) return;
    const threatInfo = aiAnalysis?.threatAssessment;
    try {
      setRaiseBusy(true);
      const sev = mapPanelSeverityToAlert(threatInfo?.severity);
      const confBySev = { critical: 0.95, high: 0.88, medium: 0.78, low: 0.68 };
      const confidence = confBySev[sev] ?? 0.85;
      await marineService.createAlert({
        feedId: String(selectedFeedId),
        type: 'threat',
        confidence,
        severity: sev,
        title: `Operator alert — ${selectedFeed.title || 'Feed'}`,
        description: `Manual raise from surveillance. Context: ${threatInfo?.summary || 'n/a'}`,
        detectionData: {
          threat: true,
          detectedObject: 'operator_manual_raise',
          frameTimestamp: new Date().toISOString(),
        },
      });
      setStatus('Alert created; check system logs and dashboard.');
      refreshAiAnalysis();
    } catch (e) {
      setStatus(e.message || 'Could not create alert', true);
    } finally {
      setRaiseBusy(false);
    }
  };

  const handleResumePause = async () => {
    const next = !isPaused;
    setIsPaused(next);
    try {
      const res = await marineService.postSurveillanceStream(
        String(selectedFeedId),
        next ? 'pause' : 'resume'
      );
      if (typeof res.data?.streamPaused === 'boolean') {
        setIsPaused(res.data.streamPaused);
      }
      setStatus(
        next
          ? 'Stream paused for this camera (saved on server).'
          : 'Stream resumed for this camera (saved on server).'
      );
      refreshAiAnalysis();
    } catch (e) {
      setIsPaused(!next);
      setStatus(e.message || 'Stream action failed', true);
    }
  };

  const handleCaptureFrame = async () => {
    try {
      let snapshotHint = false;
      const cap = videoRef.current?.captureDataUrl?.();
      if (cap) snapshotHint = true;
      await marineService.postSurveillanceCapture(String(selectedFeedId), {
        snapshotHint,
      });
      setStatus(
        snapshotHint
          ? 'Capture recorded (snapshot taken from local video).'
          : 'Capture event logged (embed streams cannot grab frames in-browser).'
      );
      refreshAiAnalysis();
    } catch (e) {
      setStatus(e.message || 'Capture failed', true);
    }
  };

  const handleEnhanceFrame = async () => {
    try {
      const res = await marineService.postSurveillanceEnhanceFrame(String(selectedFeedId));
      const hint = res.data?.enhancementLabPath || '/enhancement-lab';
      setStatus(`${res.message || 'OK'} Open ${hint} to run the model on an image.`);
    } catch (e) {
      setStatus(e.message || 'Enhance request failed', true);
    }
  };

  const toggleMarkArea = () => {
    setMarkingRoi((m) => !m);
    setMarkCorner(null);
    setStatus(
      !markingRoi
        ? 'Click twice on the video to set opposite corners of the ROI.'
        : 'ROI marking cancelled.'
    );
  };

  const onViewportClick = async (e) => {
    if (!markingRoi || !viewportRef.current || !selectedFeedId) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const nx = clamp01((e.clientX - rect.left) / rect.width);
    const ny = clamp01((e.clientY - rect.top) / rect.height);
    if (!markCorner) {
      setMarkCorner({ x: nx, y: ny });
    } else {
      const x = Math.min(markCorner.x, nx);
      const y = Math.min(markCorner.y, ny);
      const w = Math.abs(nx - markCorner.x);
      const h = Math.abs(ny - markCorner.y);
      try {
        await marineService.postSurveillanceMarkArea(String(selectedFeedId), { x, y, w, h });
        setStatus('Marked region saved.');
        refreshAiAnalysis();
      } catch (err) {
        setStatus(err.message || 'Failed to save ROI', true);
      }
      setMarkingRoi(false);
      setMarkCorner(null);
    }
  };

  const env = aiAnalysis?.environmentQuality;
  const threat = aiAnalysis?.threatAssessment;
  const modelAct = aiAnalysis?.modelActivity;
  const detectedList = aiAnalysis?.detectedObjects || [];

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-0 flex-1 items-center justify-center bg-background-dark text-slate-100">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
            <p className="text-primary">Loading Surveillance Mode...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!selectedFeed) {
    return (
      <AppShell>
        <div className="flex min-h-0 flex-1 items-center justify-center bg-background-dark text-slate-100">
          <div className="text-center">
            <div className="mb-4 text-6xl text-red-500">⚠️</div>
            <p className="mb-4 text-xl">Feed not found</p>
            <button
              type="button"
              onClick={handleReturnToGrid}
              className="rounded bg-primary px-6 py-2 text-background-dark transition-colors hover:bg-primary/80"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background-dark font-display text-slate-100">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-primary/30 bg-background-dark px-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-xl text-primary">videocam</span>
              <h1 className="text-lg font-bold uppercase tracking-wider">
                Camera: {selectedFeed.title || 'Loading...'}
              </h1>
            </div>
            <div className="h-4 w-px bg-primary/30"></div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary"></span>
              <span className="text-sm font-bold tracking-widest text-primary">LIVE STREAM</span>
            </div>
          </div>
          {actionStatus && (
            <div
              className={`max-w-md truncate text-[10px] ${actionStatus.isErr ? 'text-red-400' : 'text-primary'}`}
            >
              {actionStatus.msg}
            </div>
          )}
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <aside className="flex w-20 shrink-0 flex-col items-center gap-4 border-r border-primary/20 bg-background-dark/50 py-4">
            {feeds.map((feed) => (
              <button
                type="button"
                key={feed._id}
                onClick={() => handleCameraSelect(feed._id)}
                className={`group relative flex h-12 w-12 cursor-pointer items-center justify-center border hover:border-primary/40 ${
                  String(selectedFeedId) === String(feed._id)
                    ? 'border-primary bg-primary/10'
                    : 'border-primary/10'
                }`}
                aria-label={`Select camera ${feed.title}`}
              >
                <span
                  className={`material-symbols-outlined text-lg ${
                    String(selectedFeedId) === String(feed._id) ? 'text-primary' : 'text-slate-500'
                  }`}
                >
                  videocam
                </span>
                {feed.activeAlerts > 0 && (
                  <span className="absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full bg-red-500"></span>
                )}
              </button>
            ))}
          </aside>

          <main className="relative flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center overflow-hidden bg-black p-4">
            <div
              ref={viewportRef}
              className={`relative aspect-video w-full max-h-full overflow-hidden border border-primary/40 bg-[#080c14] ${
                markingRoi ? 'ring-2 ring-primary/50' : ''
              }`}
            >
              {selectedFeed.url ? (
                <FeedVideoPlayer
                  ref={videoRef}
                  key={selectedFeedId}
                  url={selectedFeed.url}
                  title={selectedFeed.title || 'Surveillance'}
                  className="pointer-events-auto h-full w-full object-cover"
                  iframeSandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                  paused={isPaused}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-900">
                  <p className="text-xl">No video feed available</p>
                </div>
              )}

              {markingRoi && (
                <button
                  type="button"
                  className="absolute inset-0 z-20 cursor-crosshair bg-transparent"
                  aria-label="Click twice to define region corners"
                  onClick={onViewportClick}
                />
              )}

              {markCorner && markingRoi && (
                <div
                  className="pointer-events-none absolute z-30 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-primary/80"
                  style={{
                    left: `${markCorner.x * 100}%`,
                    top: `${markCorner.y * 100}%`,
                  }}
                />
              )}

              <div className="pointer-events-none absolute left-6 top-6 flex items-center gap-4">
                <div className="flex items-center gap-2 border border-primary/30 bg-black/60 px-3 py-1">
                  <span className="h-2 w-2 bg-primary"></span>
                  <span className="text-xs font-bold tracking-[0.2em] text-primary">REC</span>
                </div>
              </div>

              {recentAlerts.map((alert) => {
                if (!alert.detectionData?.boundingBox) return null;
                const bbox = alert.detectionData.boundingBox;
                // Normalize bbox if it's in pixel coordinates (YOLO usually returns pixels)
                // If it's already normalized [0-1], use as is.
                // Assuming [x1, y1, x2, y2] from YOLO
                const x1 = bbox[0] / W_REF || 0;
                const y1 = bbox[1] / H_REF || 0;
                const x2 = bbox[2] / W_REF || 1;
                const y2 = bbox[3] / H_REF || 1;
                
                return (
                  <div
                    key={alert._id}
                    className={`pointer-events-none absolute border-2 group transition-all duration-500 ${
                      alert.severity === 'critical'
                        ? 'border-red-500 bg-red-500/10'
                        : alert.severity === 'high'
                          ? 'border-yellow-500 bg-yellow-500/10'
                          : 'border-primary/50 bg-primary/5'
                    }`}
                    style={{
                      top: `${(bbox[1] / 720) * 100}%`,
                      left: `${(bbox[0] / 1280) * 100}%`,
                      width: `${((bbox[2] - bbox[0]) / 1280) * 100}%`,
                      height: `${((bbox[3] - bbox[1]) / 720) * 100}%`,
                    }}
                  >
                    <div
                      className={`absolute -top-6 left-0 px-1.5 py-0.5 whitespace-nowrap ${
                        alert.severity === 'critical'
                          ? 'bg-red-500'
                          : alert.severity === 'high'
                            ? 'bg-yellow-500'
                            : 'bg-primary'
                      }`}
                    >
                      <span className="text-[10px] font-bold text-background-dark uppercase">
                        {alert.detectionData?.detectedObject || 'OBJECT'}
                      </span>
                      <span className="ml-2 text-[10px] font-mono text-background-dark">
                        {alert.confidence ? `${(alert.confidence * 100).toFixed(0)}%` : ''}
                      </span>
                      {alert.detectionData?.distance_m && (
                        <span className="ml-2 border-l border-background-dark/30 pl-2 text-[10px] font-bold text-background-dark">
                          {alert.detectionData.distance_m}m
                        </span>
                      )}
                      <span className="ml-2 border-l border-background-dark/30 pl-2 text-[10px] font-mono text-background-dark">
                        {alert.detectionData?.frameTimestamp ? new Date(alert.detectionData.frameTimestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}) : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </main>

          <aside className="flex w-80 shrink-0 flex-col overflow-hidden border-l border-primary/20 bg-background-dark">
            <div className="border-b border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-widest text-primary">
                  AI Analysis
                </h2>
                <button
                  type="button"
                  onClick={refreshAiAnalysis}
                  className="text-[10px] uppercase text-slate-400 hover:text-primary"
                >
                  Refresh
                </button>
              </div>
              {analysisLoading && (
                <p className="mt-1 text-[10px] text-slate-500">Updating…</p>
              )}
              {analysisError && (
                <p className="mt-1 text-[10px] text-amber-400">{analysisError}</p>
              )}
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-4">
              <section>
                <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-dim">
                  Environment Quality
                </h3>
                {!env ? (
                  <p className="text-xs text-slate-500">No data</p>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <div className="mb-1 flex justify-between text-xs">
                        <span>Visibility</span>
                        <span className="text-primary">{env.visibility}%</span>
                      </div>
                      <div className="h-1 w-full bg-primary/10">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${env.visibility}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="border border-primary/20 p-2">
                        <p className="text-[9px] uppercase text-dim">Turbidity</p>
                        <p className="text-xs font-bold text-primary">{env.turbidity}</p>
                      </div>
                      <div className="border border-primary/20 p-2">
                        <p className="text-[9px] uppercase text-dim">Light pen.</p>
                        <p className="text-xs font-bold text-primary">{env.lightPenetration}</p>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              <section>
                <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-dim">
                  Detected objects
                </h3>
                {detectedList.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-500">No alert-linked objects</p>
                ) : (
                  <div className="space-y-2">
                    {detectedList.map((obj) => (
                      <div
                        key={obj.id}
                        className="flex flex-col border border-primary/10 p-2 hover:bg-primary/5 gap-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${obj.name.includes('MINE') ? 'text-red-500' : 'text-slate-100'}`}>
                            {obj.name}
                          </span>
                          <span className="font-mono text-xs text-primary">{obj.confidencePct}%</span>
                        </div>
                        <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono">
                          <span>Dist: {obj.distance_m || '—'}m</span>
                          <span>Time: {obj.timestamp ? new Date(obj.timestamp).toLocaleTimeString() : '—'}</span>
                        </div>
                        {obj.models && (
                          <div className="text-[8px] text-slate-600 uppercase tracking-tighter mt-1 border-t border-primary/5 pt-1">
                            Analyzed by: {obj.models.join(' + ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-dim">
                  Threat assessment
                </h3>
                <div className="border border-primary/30 bg-primary/5 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="border border-primary/40 bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                      {threat?.severity || '—'}
                    </span>
                    <span className="text-[10px] font-bold uppercase">Severity</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    {threat?.summary || 'Analysis loading from server…'}
                  </p>
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-dim">
                  Model activity
                </h3>
                <div className="space-y-2 font-mono text-[10px]">
                  <div className="flex items-center justify-between py-1">
                    <span className="uppercase text-dim">Enhancement</span>
                    <span className="font-bold text-primary">{modelAct?.enhancement || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="uppercase text-dim">Detection</span>
                    <span className="font-bold text-primary">{modelAct?.detection || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="uppercase text-dim">Last detection Δ</span>
                    <span className="text-primary">
                      {formatAgeMs(modelAct?.lastDetectionAgeMs)}
                    </span>
                  </div>
                </div>
              </section>
            </div>
          </aside>
        </div>

        <footer className="flex h-16 shrink-0 items-center justify-between border-t border-primary/30 bg-background-dark/80 px-4">
          <div
            role="toolbar"
            aria-label="Stream controls"
            className="flex flex-wrap items-center gap-2"
          >
            <button
              type="button"
              onClick={handleResumePause}
              aria-label={isPaused ? 'Resume stream' : 'Pause stream'}
              className="flex h-10 items-center gap-2 border border-primary/30 px-4 text-xs font-bold uppercase hover:bg-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="material-symbols-outlined text-sm">
                {isPaused ? 'play_arrow' : 'pause'}
              </span>
              {isPaused ? 'Resume stream' : 'Pause stream'}
            </button>
            <button
              type="button"
              onClick={handleCaptureFrame}
              aria-label="Capture frame from stream"
              className="flex h-10 items-center gap-2 border border-primary/30 px-4 text-xs font-bold uppercase hover:bg-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="material-symbols-outlined text-sm">photo_camera</span>
              Capture frame
            </button>
            <button
              type="button"
              onClick={handleEnhanceFrame}
              aria-label="Request frame enhancement"
              className="flex h-10 items-center gap-2 border border-primary/30 px-4 text-xs font-bold uppercase hover:bg-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="material-symbols-outlined text-sm">hdr_strong</span>
              Enhance frame
            </button>
            <button
              type="button"
              onClick={toggleMarkArea}
              aria-pressed={markingRoi}
              aria-label={
                markingRoi ? 'Cancel marking region on video' : 'Mark region of interest on video'
              }
              className={`flex h-10 items-center gap-2 border px-4 text-xs font-bold uppercase focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                markingRoi
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-primary/30 hover:bg-primary/10'
              }`}
            >
              <span className="material-symbols-outlined text-sm">edit_square</span>
              Mark area
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRaiseAlert}
              disabled={raiseBusy}
              aria-busy={raiseBusy}
              className="flex h-10 items-center gap-2 bg-primary px-6 text-xs font-black uppercase text-background-dark disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">warning</span>
              {raiseBusy ? 'Sending…' : 'Raise alert'}
            </button>
            <button
              type="button"
              onClick={handleReturnToGrid}
              className="flex h-10 items-center border border-primary/30 px-4 text-xs font-bold uppercase hover:bg-primary/10"
            >
              Return to grid
            </button>
          </div>
        </footer>
      </div>
    </AppShell>
  );
};

function clamp01(n) {
  return Math.min(1, Math.max(0, n));
}

export default Surveillance;
