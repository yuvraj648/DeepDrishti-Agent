const mongoose = require('mongoose');
const Feed = require('../models/Feed');
const Alert = require('../models/Alert');
const SystemLog = require('../models/SystemLog');

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

function severityRank(s) {
  const map = { low: 1, medium: 2, high: 3, critical: 4 };
  return map[String(s || '').toLowerCase()] || 0;
}

function severityLabelFromRank(r) {
  if (r >= 4) return 'CRITICAL';
  if (r >= 3) return 'HIGH';
  if (r >= 2) return 'MEDIUM';
  return 'LOW';
}

exports.getAiAnalysis = async (req, res) => {
  try {
    const { feedId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(feedId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid feed id',
        code: 'INVALID_FEED_ID',
      });
    }

    const feed = await Feed.findById(feedId).lean();
    if (!feed) {
      return res.status(404).json({
        status: 'error',
        message: 'Feed not found',
        code: 'FEED_NOT_FOUND',
      });
    }

    const feedObjectId = new mongoose.Types.ObjectId(feedId);
    const recentAlerts = await Alert.find({ feedId: feedObjectId })
      .sort({ createdAt: -1 })
      .limit(25)
      .lean();

    let maxSev = 0;
    let sumConf = 0;
    let confCount = 0;
    const objects = [];

    recentAlerts.forEach((a) => {
      maxSev = Math.max(maxSev, severityRank(a.severity));
      if (typeof a.confidence === 'number' && !Number.isNaN(a.confidence)) {
        sumConf += a.confidence;
        confCount += 1;
      }
      const name =
        a.detectionData?.detectedObject || a.title || a.type || 'Alert';
      objects.push({
        id: String(a._id),
        name,
        confidencePct: Math.round((a.confidence ?? 0) * 100),
        severity: a.severity,
        distance_m:
          typeof a.detectionData?.distance_m === 'number'
            ? a.detectionData.distance_m
            : null,
        timestamp: a.detectionData?.frameTimestamp || a.createdAt || null,
        models: Array.isArray(a.detectionData?.modelsUsed)
          ? a.detectionData.modelsUsed
          : null,
        snapshotPath: a.detectionData?.snapshotPath || null,
      });
    });

    const activeAlerts = recentAlerts.filter((a) => a.status === 'active').length;
    const avgConf = confCount ? sumConf / confCount : 0;
    const visibility = clamp(Math.round(45 + avgConf * 55), 8, 98);
    const turbidity =
      activeAlerts >= 4 ? 'HIGH' : activeAlerts >= 2 ? 'MEDIUM' : 'LOW';
    const lightPen =
      avgConf >= 0.65 ? 'OPTIMAL' : avgConf >= 0.35 ? 'MODERATE' : 'LOW';

    const threatSeverity = severityLabelFromRank(maxSev);

    let summary =
      'No active alert-derived risk narrative for this window. Continue routine monitoring.';
    if (recentAlerts.length > 0) {
      if (maxSev >= 4) {
        summary =
          'Critical-grade alerts present on this feed. Escalate per station doctrine and verify contacts.';
      } else if (maxSev >= 3) {
        summary =
          'Elevated observations logged. Validate tracks against exclusion lists and notify watch lead.';
      } else if (activeAlerts > 0) {
        summary =
          'Active alerts with moderate confidence. Maintain sensor focus and cross-check the surface picture.';
      } else {
        summary =
          'Recent activity is historic or cleared. Metrics reflect trailing inference confidence.';
      }
    }

    const detectionActive = feed.detectionEnabled && feed.status === 'active';
    const lastInf =
      feed.lastDetection?.timestamp != null
        ? Math.max(
            0,
            Math.round(
              Date.now() - new Date(feed.lastDetection.timestamp).getTime()
            )
          )
        : null;

    res.json({
      status: 'success',
      data: {
        feedId: String(feed._id),
        generatedAt: new Date().toISOString(),
        environmentQuality: {
          visibility,
          turbidity,
          lightPenetration: lightPen,
        },
        detectedObjects: objects.slice(0, 12),
        threatAssessment: {
          severity: threatSeverity,
          summary,
          activeAlertCount: activeAlerts,
        },
        modelActivity: {
          enhancement: detectionActive ? 'STANDBY' : 'OFF',
          detection: detectionActive ? 'ACTIVE' : 'IDLE',
          lastDetectionAgeMs: lastInf,
        },
        markedRegion: feed.surveillance?.markedRegion || null,
        streamPaused: Boolean(feed.surveillance?.streamPaused),
      },
    });
  } catch (error) {
    console.error('getAiAnalysis', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'AI analysis failed',
      code: 'AI_ANALYSIS_ERROR',
    });
  }
};

exports.postStreamControl = async (req, res) => {
  try {
    const { feedId } = req.params;
    const action = String(req.body?.action || '').toLowerCase();
    if (!['pause', 'resume'].includes(action)) {
      return res.status(400).json({
        status: 'error',
        message: 'action must be pause or resume',
        code: 'INVALID_ACTION',
      });
    }
    const feed = await Feed.findById(feedId);
    if (!feed) {
      return res.status(404).json({
        status: 'error',
        message: 'Feed not found',
        code: 'FEED_NOT_FOUND',
      });
    }

    feed.surveillance = feed.surveillance || {};
    feed.surveillance.streamPaused = action === 'pause';
    feed.surveillance.streamPausedUpdatedAt = new Date();
    await feed.save();

    await SystemLog.create({
      severity: 'INFO',
      module: 'SURVEILLANCE-UI',
      message: `Stream ${action} for feed "${feed.title}" (${feedId}) by ${req.user.email}`,
    });

    res.json({
      status: 'success',
      message: `Stream ${action} recorded for this camera`,
      data: {
        feedId,
        action,
        streamPaused: feed.surveillance.streamPaused,
        at: feed.surveillance.streamPausedUpdatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('postStreamControl', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.postCaptureFrame = async (req, res) => {
  try {
    const { feedId } = req.params;
    const feed = await Feed.findById(feedId);
    if (!feed) {
      return res.status(404).json({
        status: 'error',
        message: 'Feed not found',
        code: 'FEED_NOT_FOUND',
      });
    }

    feed.surveillance = feed.surveillance || {};
    feed.surveillance.lastCaptureAt = new Date();
    await feed.save();

    await SystemLog.create({
      severity: 'INFO',
      module: 'SURVEILLANCE-UI',
      message: `Frame capture event for feed "${feed.title}" (${feedId}) by ${req.user.email}`,
    });

    res.json({
      status: 'success',
      message: 'Capture recorded',
      data: {
        feedId,
        capturedAt: feed.surveillance.lastCaptureAt.toISOString(),
        hadSnapshot: Boolean(req.body?.snapshotHint),
      },
    });
  } catch (error) {
    console.error('postCaptureFrame', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.postEnhanceFrame = async (req, res) => {
  try {
    const { feedId } = req.params;
    const feed = await Feed.findById(feedId);
    if (!feed) {
      return res.status(404).json({
        status: 'error',
        message: 'Feed not found',
        code: 'FEED_NOT_FOUND',
      });
    }

    feed.surveillance = feed.surveillance || {};
    feed.surveillance.lastEnhanceRequestAt = new Date();
    await feed.save();

    await SystemLog.create({
      severity: 'INFO',
      module: 'SURVEILLANCE-UI',
      message: `Enhance frame requested for "${feed.title}" (${feedId}) — use POST /api/v1/ai-enhance with image for full pipeline`,
    });

    res.json({
      status: 'success',
      message:
        'Enhance request logged. Upload the captured frame to /api/v1/ai-enhance from the Enhancement Lab or your client.',
      data: {
        feedId,
        enhancementLabPath: '/enhancement-lab',
        aiEnhanceEndpoint: '/api/v1/ai-enhance',
        requestedAt: feed.surveillance.lastEnhanceRequestAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('postEnhanceFrame', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.postMarkArea = async (req, res) => {
  try {
    const { feedId } = req.params;
    const { x, y, w, h } = req.body || {};
    if (![x, y, w, h].every((n) => typeof n === 'number' && Number.isFinite(n))) {
      return res.status(400).json({
        status: 'error',
        message: 'Body must include numeric x, y, w, h (normalized 0–1 recommended)',
        code: 'INVALID_ROI',
      });
    }

    const feed = await Feed.findById(feedId);
    if (!feed) {
      return res.status(404).json({
        status: 'error',
        message: 'Feed not found',
        code: 'FEED_NOT_FOUND',
      });
    }

    feed.surveillance = feed.surveillance || {};
    feed.surveillance.markedRegion = {
      x: clamp(x, 0, 1),
      y: clamp(y, 0, 1),
      w: clamp(w, 0, 1),
      h: clamp(h, 0, 1),
    };
    feed.surveillance.markedRegionUpdatedAt = new Date();
    await feed.save();

    await SystemLog.create({
      severity: 'INFO',
      module: 'SURVEILLANCE-UI',
      message: `ROI updated for "${feed.title}" (${feedId}): ${JSON.stringify(feed.surveillance.markedRegion)}`,
    });

    res.json({
      status: 'success',
      message: 'Marked region saved on feed',
      data: {
        feedId,
        markedRegion: feed.surveillance.markedRegion,
        updatedAt: feed.surveillance.markedRegionUpdatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('postMarkArea', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};
