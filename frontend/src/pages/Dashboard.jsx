import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import marineService from '../services/marineService';
import FeedVideoPlayer from '../components/FeedVideoPlayer';
import AppShell from '../components/AppShell';

const asList = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
};

const asSummary = (payload) => {
  if (!payload) return null;
  if (
    payload.data &&
    typeof payload.data === 'object' &&
    !Array.isArray(payload.data)
  ) {
    return payload.data;
  }
  return payload;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [feeds, setFeeds] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Try to get real data first, fallback to test data
        let feedsRaw, alertsRaw, statsRaw;
        
        try {
          feedsRaw = await marineService.getActiveFeeds();
        } catch (err) {
          console.warn('Feeds API failed, using test data:', err?.message || err);
          feedsRaw = await marineService.getTestActiveFeeds();
        }

        try {
          alertsRaw = await marineService.getActiveAlerts();
        } catch (err) {
          console.warn('Alerts API failed, using test data:', err?.message || err);
          alertsRaw = await marineService.getTestActiveAlerts();
        }

        try {
          statsRaw = await marineService.getDashboardSummary();
        } catch (err) {
          console.warn('Dashboard summary failed, using test data:', err?.message || err);
          statsRaw = await marineService.getTestDashboardSummary();
        }

        setFeeds(asList(feedsRaw));
        setAlerts(asList(alertsRaw));
        setDashboardStats(asSummary(statsRaw));
        setError(null);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        const hint =
          import.meta.env?.VITE_API_URL || 'http://localhost:5003/api/v1';
        setError(
          `Failed to load dashboard data. Confirm the API is running and matches ${hint}.`
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Set up polling for real-time updates
    const interval = setInterval(fetchData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleFeedClick = (feedId) => {
    navigate(`/surveillance?feed=${encodeURIComponent(String(feedId))}`);
  };

  const handleAlertAction = async (alertId, action) => {
    try {
      if (action === 'resolve') {
        await marineService.resolveAlert(alertId, 'Resolved from dashboard');
        // Refresh alerts
        const updatedAlerts = await marineService.getActiveAlerts();
        setAlerts(asList(updatedAlerts));
      }
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  };

  if (loading) {
    return (
      <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-primary">Loading Marine Surveillance System...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <p className="text-xl mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-primary text-background-dark px-6 py-2 rounded hover:bg-primary/80 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Transform feeds data for display
  const cameraFeeds = feeds.map(feed => ({
    id: feed.title || `Feed-${feed._id}`,
    feedId: feed._id,
    location: feed.location || 'Unknown Location',
    status: feed.status === 'active' ? 'Online' : 'Offline',
    url: feed.url, // YouTube embed URL
    time: feed.lastDetectionFormatted || new Date().toLocaleTimeString(),
    isPulsing: feed.activeAlerts > 0,
    sector: feed.sector
  }));

  // Transform alerts data for display
  const transformedAlerts = alerts.slice(0, 8).map(alert => ({
    id: alert._id,
    type: alert.severity === 'critical' ? 'critical' : 
          alert.severity === 'high' ? 'warning' : 'info',
    title: alert.title,
    subtitle: alert.description,
    confidence: alert.confidence ? `${(alert.confidence * 100).toFixed(1)}%` : '',
    time: alert.createdAt
      ? new Date(alert.createdAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '',
    color: alert.severity === 'critical' ? 'red' : 
           alert.severity === 'high' ? 'yellow' : 'primary',
    dismissed: alert.status !== 'active'
  }));

  // Stats from dashboard data or fallback
  const stats = dashboardStats ? [
    { 
      label: 'Active Feeds', 
      value: dashboardStats.feeds?.active?.toString() || '4', 
      unit: `/ ${dashboardStats.feeds?.total?.toString() || '4'}`, 
      percentage: (dashboardStats.feeds?.active / dashboardStats.feeds?.total * 100) || 100 
    },
    { 
      label: 'Active Alerts', 
      value: dashboardStats.alerts?.active?.toString() || '2', 
      unit: '', 
      percentage: Math.min((dashboardStats.alerts?.active / 10 * 100) || 20, 100) 
    },
    { 
      label: 'System Health', 
      value: dashboardStats.systemHealth?.overall === 'operational' ? '100' : '75', 
      unit: '%', 
      percentage: dashboardStats.systemHealth?.overall === 'operational' ? 100 : 75 
    },
    { 
      label: 'Detection Rate', 
      value: dashboardStats.alerts?.recent?.critical ? '99.2' : '95.8', 
      unit: '%', 
      percentage: 95 
    }
  ] : [
    { label: 'GPU Usage', value: '84', unit: '%', percentage: 84 },
    { label: 'Processing Latency', value: '12.4', unit: 'ms', percentage: 12 },
    { label: 'Active Cameras', value: '24', unit: '/ 24', percentage: 100 },
    { label: 'Detection Rate', value: '99.2', unit: '%', percentage: 99 }
  ];

  return (
    <AppShell>
      <div className="flex flex-1 min-h-0 overflow-hidden flex-row bg-slate-900">
        <main className="flex-1 flex flex-col overflow-hidden relative min-w-0">
          <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto relative z-10">
            <div className="grid grid-cols-2 gap-4">
              {cameraFeeds.map((feed, index) => (
                <div key={feed.feedId} className="border border-primary/30 relative overflow-hidden group aspect-video bg-background-dark/50">
                  {/* Video iframe for YouTube embed */}
                  {feed.url ? (
                    <FeedVideoPlayer
                      url={feed.url}
                      title={feed.id}
                      className="w-full h-full object-cover brightness-75 group-hover:brightness-100 transition-all"
                    />
                  ) : (
                    <img 
                      className="w-full h-full object-cover brightness-75 group-hover:brightness-100 transition-all" 
                      alt={feed.id}
                      src={`https://picsum.photos/seed/${feed.feedId}/800/600.jpg`}
                    />
                  )}
                  
                  <div className="absolute top-0 left-0 w-full p-3 flex justify-between items-start">
                    <div>
                      <h3 className="text-white text-xs font-bold tracking-widest uppercase bg-background-dark/80 px-2 py-1 border-l-2 border-primary">
                        {feed.id}
                      </h3>
                      {feed.location && (
                        <div className="mt-1 flex gap-2">
                          <span className="text-[9px] text-primary bg-background-dark/80 px-1 py-0.5">
                            {feed.location}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 bg-background-dark/80 px-2 py-1">
                      <span className={`w-1.5 h-1.5 rounded-full bg-primary ${feed.isPulsing ? 'animate-pulse' : ''}`}></span>
                      <span className="text-[10px] text-white font-bold uppercase tracking-tighter">{feed.status}</span>
                    </div>
                  </div>
                  
                  <div className="absolute bottom-3 left-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleFeedClick(feed.feedId)}
                      className="bg-primary/80 hover:bg-primary text-background-dark text-[10px] font-bold px-3 py-1.5 uppercase tracking-wider transition-colors"
                    >
                      Open Feed
                    </button>
                  </div>
                  
                  <div className="absolute bottom-3 right-3 text-[10px] font-mono text-white bg-background-dark/80 px-2 py-1 tracking-tighter">
                    {feed.time}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-4 gap-4 h-24">
              {stats.map((stat, index) => (
                <div key={index} className="bg-primary/5 border border-primary/20 p-4 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{stat.label}</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-light text-white leading-none">{stat.value}</span>
                    <span className="text-xs font-medium text-slate-500">{stat.unit}</span>
                  </div>
                  <div className="w-full h-0.5 bg-slate-800">
                    <div 
                      className="h-full bg-primary shadow-[0_0_8px_#00d4ff]" 
                      style={{ width: `${stat.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
        
        <aside className="w-80 border-l border-primary/10 flex flex-col bg-background-dark/40 backdrop-blur-sm overflow-hidden">
          <div className="p-4 border-b border-primary/10 flex items-center justify-between">
            <h2 className="text-xs font-bold tracking-[0.2em] text-white uppercase">Active Alerts</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-red-500/20 text-red-500 border border-red-500/40 uppercase">Critical</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {transformedAlerts.map((alert) => (
              <div key={alert.id} className={`border border-${alert.color}-500/40 bg-${alert.color}-500/5 overflow-hidden group ${alert.dismissed ? 'opacity-60' : ''}`}>
                <div className={`h-1 w-full bg-${alert.color}-500 ${alert.color === 'red' ? 'shadow-[0_0_8px_#ef4444]' : ''}`}></div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-${alert.color}-500 text-[10px] font-bold uppercase tracking-widest`}>
                      {alert.title}
                    </span>
                    <span className="text-slate-500 font-mono text-[9px]">{alert.time}</span>
                  </div>
                  <h4 className={`text-white text-sm font-bold uppercase mb-1 ${alert.dismissed ? 'opacity-60' : ''}`}>
                    {alert.subtitle}
                  </h4>
                  {alert.confidence && (
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-[10px] text-slate-400 uppercase tracking-tighter">Confidence:</span>
                      <span className="text-[10px] text-white font-bold">{alert.confidence}</span>
                    </div>
                  )}
                  <button 
                    className={`w-full py-2 ${
                      alert.color === 'red' 
                        ? 'bg-red-500 hover:bg-red-600 text-white' 
                        : alert.color === 'yellow'
                        ? 'border border-yellow-500/40 hover:bg-yellow-500/20 text-yellow-500'
                        : 'border border-primary/10 text-primary/40'
                    } text-[10px] font-bold uppercase tracking-widest transition-colors`}
                  >
                    {alert.dismissed ? 'Dismissed' : 'Investigate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-4 bg-background-dark border-t border-primary/10">
            <button className="w-full flex items-center justify-center gap-2 text-[10px] text-primary font-bold uppercase tracking-widest py-2 border border-primary/20 hover:bg-primary/5 transition-colors">
              <span className="material-symbols-outlined text-sm">history</span>
              View Alert History
            </button>
          </div>
        </aside>
      </div>

      <footer className="h-6 shrink-0 bg-primary text-background-dark px-4 flex items-center justify-between text-[10px] font-bold uppercase tracking-tighter">
        <div className="flex gap-4">
          <span>Server: ATL-01-SECURE</span>
          <span>Uptime: 242d 12h 04m</span>
        </div>
        <div className="flex gap-4">
          <span>Encryption: AES-256-GCM</span>
          <span>Signal: EXCELLENT (-42 dBm)</span>
        </div>
      </footer>
    </AppShell>
  );
};

export default Dashboard;
