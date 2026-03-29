const Detection = require('../models/Detection');
const Feed = require('../models/Feed');
const Alert = require('../models/Alert');
const SystemLog = require('../models/SystemLog');
const CommandDispatch = require('../models/CommandDispatch');

function timeframeToMs(tf) {
  if (tf === '7d') return 7 * 24 * 60 * 60 * 1000;
  if (tf === '30d') return 30 * 24 * 60 * 60 * 1000;
  return 24 * 60 * 60 * 1000;
}

const THREAT_LABELS = ['Sub', 'Bio', 'Marine', 'Sensor'];
const OBJECT_TO_THREAT_INDEX = {
  'Unidentified Submersible': 0,
  'Bio-Acoustic Anomaly': 1,
  'Unknown Marine Movement': 2,
  'Draft Variance': 3,
};

exports.getReportsAnalytics = async (req, res) => {
  try {
    const timeframe = ['24h', '7d', '30d'].includes(req.query.timeframe)
      ? req.query.timeframe
      : '24h';
    const start = new Date(Date.now() - timeframeToMs(timeframe));

    const totalDetections = await Detection.countDocuments({ timestamp: { $gte: start } });
    const activeCameras = await Feed.countDocuments({ status: 'active' });
    const criticalAlerts = await Alert.countDocuments({
      createdAt: { $gte: start },
      severity: 'critical',
      status: { $in: ['active', 'investigating'] },
    });

    const avgAgg = await Detection.aggregate([
      { $match: { timestamp: { $gte: start } } },
      { $group: { _id: null, avg: { $avg: '$confidence' } } },
    ]);
    const avgConfidence =
      avgAgg[0]?.avg != null ? Number(avgAgg[0].avg.toFixed(1)) : null;

    let trendLabels;
    let trendData;
    if (timeframe === '24h') {
      trendLabels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'];
      trendData = [0, 0, 0, 0, 0, 0, 0];
      const hours = await Detection.aggregate([
        { $match: { timestamp: { $gte: start } } },
        { $group: { _id: { $hour: '$timestamp' }, count: { $sum: 1 } } },
      ]);
      hours.forEach((h) => {
        const hour = h._id;
        const b = Math.min(6, Math.floor(hour / 4));
        trendData[b] += h.count;
      });
    } else {
      const days = timeframe === '7d' ? 7 : 10;
      const dayMs = 24 * 60 * 60 * 1000;
      trendLabels = Array.from({ length: days }, (_, i) =>
        timeframe === '7d' ? `Day ${i + 1}` : `Period ${i + 1}`
      );
      trendData = Array(days).fill(0);
      const detTimes = await Detection.find({ timestamp: { $gte: start } })
        .select('timestamp')
        .lean();
      detTimes.forEach((d) => {
        const idx = Math.floor((new Date(d.timestamp) - start) / dayMs);
        if (idx >= 0 && idx < days) trendData[idx] += 1;
      });
    }

    const threatAgg = await Detection.aggregate([
      { $match: { timestamp: { $gte: start } } },
      { $group: { _id: '$objectDetected', count: { $sum: 1 } } },
    ]);
    const threatCounts = [0, 0, 0, 0];
    threatAgg.forEach((t) => {
      const idx = t._id != null ? OBJECT_TO_THREAT_INDEX[t._id] : undefined;
      if (idx !== undefined) threatCounts[idx] = t.count;
    });

    const recentDets = await Detection.find({ timestamp: { $gte: start } })
      .sort({ timestamp: -1 })
      .limit(12)
      .lean();

    const recentIncidents = recentDets.map((d) => ({
      id: d.id,
      title: d.objectDetected || 'Detection',
      severity:
        d.confidence >= 90 ? 'critical' : d.confidence >= 75 ? 'warning' : 'routine',
      camera: d.cameraSource || '—',
      time: new Date(d.timestamp).toLocaleString(undefined, { hour12: false }),
      image: d.snapshot || null,
    }));

    const camAgg = await Detection.aggregate([
      {
        $match: {
          timestamp: { $gte: start },
          cameraSource: { $exists: true, $nin: [null, ''] },
        },
      },
      { $group: { _id: '$cameraSource', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]);
    const maxCam = camAgg.length ? Math.max(...camAgg.map((c) => c.count)) : 1;
    const cameraActivity = camAgg.map((c) => ({
      name: c._id,
      activity: Math.min(100, Math.round((c.count / maxCam) * 100)),
      status: 'active',
    }));

    res.json({
      success: true,
      data: {
        timeframe,
        summary: {
          totalDetections,
          criticalAlerts,
          activeCameras,
          avgConfidence,
        },
        charts: {
          trend: { labels: trendLabels, data: trendData },
          threatDistribution: { labels: THREAT_LABELS, data: threatCounts },
        },
        recentIncidents,
        cameraActivity,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Report analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to build reports analytics',
      error: error.message,
    });
  }
};

/** Persists “send to command” to MongoDB: SystemLog (visible in System Logs UI) + CommandDispatch (audit collection). */
exports.dispatchReport = async (req, res) => {
  try {
    const { kind, timeframe, recordCount } = req.body || {};
    const email = req.user?.email || '?';
    const summaryMessage = `Report dispatch queued: ${kind || 'bundle'} | ${timeframe || '—'} | records ~${recordCount ?? '—'} | by ${email}`;
    console.log('[reports/dispatch]', { kind, timeframe, recordCount, user: email });

    const log = await SystemLog.create({
      severity: 'INFO',
      module: 'COMM-RELAY',
      message: summaryMessage,
      meta: { kind, timeframe, recordCount, source: 'reports_dispatch' },
    });

    const dispatch = await CommandDispatch.create({
      kind: kind || 'analytics_bundle',
      timeframe: timeframe || null,
      recordCount: typeof recordCount === 'number' ? recordCount : null,
      requestedByEmail: req.user?.email || null,
      summaryMessage,
      systemLogId: log._id,
      status: 'queued',
    });

    res.json({
      success: true,
      message: 'Report dispatch recorded in database (system log + command queue).',
      receivedAt: new Date().toISOString(),
      data: {
        systemLogId: log._id,
        commandDispatchId: dispatch._id,
        timestamp: log.timestamp || dispatch.createdAt,
      },
    });
  } catch (error) {
    console.error('dispatchReport', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to persist dispatch',
    });
  }
};
