const Alert = require('../models/Alert');
const Feed = require('../models/Feed');
const SystemLog = require('../models/SystemLog');

// Get all alerts with filtering
exports.getAllAlerts = async (req, res) => {
  try {
    const {
      status,
      type,
      severity,
      feedId,
      location,
      sector,
      limit = 50,
      page = 1,
      startDate,
      endDate
    } = req.query;
    
    // Build query
    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (severity) query.severity = severity;
    if (feedId) query.feedId = feedId;
    if (location) query.location = location;
    if (sector) query.sector = sector;
    
    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    const alerts = await Alert.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('feedId', 'title url location sector')
      .populate('resolvedBy', 'name email')
      .populate('assignedTo', 'name email');
    
    const total = await Alert.countDocuments(query);
    
    res.json({
      success: true,
      data: alerts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alerts',
      error: error.message
    });
  }
};

// Get active alerts
exports.getActiveAlerts = async (req, res) => {
  try {
    const alerts = await Alert.findActive()
      .populate('feedId', 'title url location sector')
      .populate('assignedTo', 'name email');
    
    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    console.error('Error fetching active alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active alerts',
      error: error.message
    });
  }
};

// Get single alert by ID
exports.getAlertById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const alert = await Alert.findById(id)
      .populate('feedId', 'title url location sector')
      .populate('resolvedBy', 'name email')
      .populate('assignedTo', 'name email');
    
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }
    
    res.json({
      success: true,
      data: alert
    });
  } catch (error) {
    console.error('Error fetching alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alert',
      error: error.message
    });
  }
};

// Create new alert (usually called by detection service)
exports.createAlert = async (req, res) => {
  try {
    const alertData = req.body;
    
    // Validate required fields
    const requiredFields = ['feedId', 'type', 'confidence', 'detectionData'];
    const missingFields = requiredFields.filter(field => !alertData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }
    
    // Get feed information for location and sector
    const feed = await Feed.findById(alertData.feedId);
    if (!feed) {
      return res.status(404).json({
        success: false,
        message: 'Feed not found'
      });
    }
    
    // Add location and sector from feed
    alertData.location = feed.location;
    alertData.sector = feed.sector;
    
    // Generate alert title based on type
    const typeTitles = {
      intrusion: 'Security Intrusion Detected',
      anomaly: 'Anomalous Activity Detected',
      object: 'Suspicious Object Detected',
      threat: 'Potential Threat Identified'
    };
    
    alertData.title = alertData.title || typeTitles[alertData.type] || 'Detection Alert';
    
    const alert = new Alert(alertData);
    await alert.save();
    
    // Update feed's active alerts count
    await Feed.findByIdAndUpdate(
      alertData.feedId,
      { $inc: { activeAlerts: 1 } }
    );

    try {
      await SystemLog.create({
        severity: 'WARN',
        module: 'SURVEILLANCE-UI',
        message: `Alert created via API: "${alert.title}" | ${feed.title} | by ${req.user?.email || 'system'}`,
        meta: {
          alertId: String(alert._id),
          feedId: String(feed._id),
        },
      });
    } catch (logErr) {
      console.warn('createAlert system log:', logErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Alert created successfully',
      data: alert
    });
  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create alert',
      error: error.message
    });
  }
};

// Resolve alert
exports.resolveAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolutionNotes } = req.body;
    const userId = req.user.id; // Assuming JWT auth provides user info
    
    const alert = await Alert.findById(id);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }
    
    if (alert.status === 'resolved') {
      return res.status(400).json({
        success: false,
        message: 'Alert is already resolved'
      });
    }
    
    await alert.resolve(userId, resolutionNotes);
    
    // Update feed's active alerts count
    await Feed.findByIdAndUpdate(
      alert.feedId,
      { $inc: { activeAlerts: -1 } }
    );
    
    res.json({
      success: true,
      message: 'Alert resolved successfully',
      data: alert
    });
  } catch (error) {
    console.error('Error resolving alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve alert',
      error: error.message
    });
  }
};

// Assign alert to user
exports.assignAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;
    
    const alert = await Alert.findById(id);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }
    
    await alert.assignTo(assignedTo);
    
    res.json({
      success: true,
      message: 'Alert assigned successfully',
      data: alert
    });
  } catch (error) {
    console.error('Error assigning alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign alert',
      error: error.message
    });
  }
};

// Get alerts by feed ID
exports.getAlertsByFeed = async (req, res) => {
  try {
    const { feedId } = req.params;
    const { limit = 50 } = req.query;
    
    const alerts = await Alert.findByFeed(feedId, limit);
    
    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    console.error('Error fetching alerts by feed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alerts by feed',
      error: error.message
    });
  }
};

// Get recent alerts (last 24 hours by default)
exports.getRecentAlerts = async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    
    const alerts = await Alert.findRecent(parseInt(hours));
    
    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    console.error('Error fetching recent alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent alerts',
      error: error.message
    });
  }
};

// Get alert statistics
exports.getAlertStats = async (req, res) => {
  try {
    const statusStats = await Alert.getStats();
    const severityStats = await Alert.getSeverityStats();
    
    // Get recent trends
    const last24h = await Alert.findRecent(24);
    const last7d = await Alert.findRecent(24 * 7);
    
    const trends = {
      last24h: {
        total: last24h.length,
        active: last24h.filter(a => a.status === 'active').length,
        resolved: last24h.filter(a => a.status === 'resolved').length
      },
      last7d: {
        total: last7d.length,
        active: last7d.filter(a => a.status === 'active').length,
        resolved: last7d.filter(a => a.status === 'resolved').length
      }
    };
    
    res.json({
      success: true,
      data: {
        statusStats,
        severityStats,
        trends
      }
    });
  } catch (error) {
    console.error('Error fetching alert stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alert statistics',
      error: error.message
    });
  }
};

// Delete alert (admin only)
exports.deleteAlert = async (req, res) => {
  try {
    const { id } = req.params;
    
    const alert = await Alert.findByIdAndDelete(id);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }
    
    // Update feed's active alerts count if alert was active
    if (alert.status === 'active') {
      await Feed.findByIdAndUpdate(
        alert.feedId,
        { $inc: { activeAlerts: -1 } }
      );
    }
    
    res.json({
      success: true,
      message: 'Alert deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete alert',
      error: error.message
    });
  }
};

// Bulk resolve alerts
exports.bulkResolveAlerts = async (req, res) => {
  try {
    const { alertIds, resolutionNotes } = req.body;
    const userId = req.user.id;
    
    if (!Array.isArray(alertIds) || alertIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid alert IDs provided'
      });
    }
    
    const alerts = await Alert.find({ _id: { $in: alertIds } });
    const feedUpdates = {};
    
    for (const alert of alerts) {
      if (alert.status === 'active') {
        await alert.resolve(userId, resolutionNotes);
        
        // Track feed updates
        const feedId = alert.feedId.toString();
        feedUpdates[feedId] = (feedUpdates[feedId] || 0) + 1;
      }
    }
    
    // Update feed active alerts counts
    for (const [feedId, count] of Object.entries(feedUpdates)) {
      await Feed.findByIdAndUpdate(
        feedId,
        { $inc: { activeAlerts: -count } }
      );
    }
    
    res.json({
      success: true,
      message: `${alerts.length} alerts resolved successfully`
    });
  } catch (error) {
    console.error('Error bulk resolving alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve alerts',
      error: error.message
    });
  }
};
