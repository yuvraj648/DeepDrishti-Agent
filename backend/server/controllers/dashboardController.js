const Feed = require('../models/Feed');
const Alert = require('../models/Alert');

// Get dashboard summary statistics
exports.getDashboardSummary = async (req, res) => {
  try {
    // Get feed statistics
    const totalFeeds = await Feed.countDocuments();
    const activeFeeds = await Feed.countDocuments({ status: 'active' });
    const inactiveFeeds = await Feed.countDocuments({ status: 'inactive' });
    const maintenanceFeeds = await Feed.countDocuments({ status: 'maintenance' });
    
    // Get alert statistics
    const totalAlerts = await Alert.countDocuments();
    const activeAlerts = await Alert.countDocuments({ status: 'active' });
    const resolvedAlerts = await Alert.countDocuments({ status: 'resolved' });
    const investigatingAlerts = await Alert.countDocuments({ status: 'investigating' });
    
    // Get recent alerts (last 24 hours)
    const recentAlerts = await Alert.findRecent(24);
    const criticalAlerts = recentAlerts.filter(alert => alert.severity === 'critical');
    const highAlerts = recentAlerts.filter(alert => alert.severity === 'high');
    
    // Get feed status by sector
    const sectorStats = await Feed.aggregate([
      {
        $group: {
          _id: '$sector',
          totalFeeds: { $sum: 1 },
          activeFeeds: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          totalDetections: { $sum: '$totalDetections' },
          activeAlerts: { $sum: '$activeAlerts' }
        }
      },
      { $sort: { totalFeeds: -1 } }
    ]);
    
    // Get alert trends for last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const alertTrends = await Alert.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          alerts: {
            $push: {
              status: '$_id.status',
              count: '$count'
            }
          },
          total: { $sum: '$count' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Get severity distribution
    const severityStats = await Alert.getSeverityStats();
    
    // Get top 5 feeds with most alerts
    const topFeeds = await Feed.aggregate([
      {
        $lookup: {
          from: 'alerts',
          localField: '_id',
          foreignField: 'feedId',
          as: 'alerts'
        }
      },
      {
        $project: {
          title: 1,
          location: 1,
          sector: 1,
          totalDetections: 1,
          activeAlerts: 1,
          alertCount: { $size: '$alerts' }
        }
      },
      { $sort: { alertCount: -1 } },
      { $limit: 5 }
    ]);
    
    // System health indicators
    const systemHealth = {
      overall: activeFeeds > 0 ? 'operational' : 'warning',
      feeds: {
        status: activeFeeds >= totalFeeds * 0.8 ? 'healthy' : 'warning',
        percentage: totalFeeds > 0 ? Math.round((activeFeeds / totalFeeds) * 100) : 0
      },
      alerts: {
        status: criticalAlerts.length === 0 ? 'healthy' : 'critical',
        activeCount: activeAlerts,
        criticalCount: criticalAlerts.length
      },
      detection: {
        status: 'operational', // Could be enhanced with actual detection service health
        lastDetection: await getLastDetectionTime()
      }
    };
    
    res.json({
      success: true,
      data: {
        feeds: {
          total: totalFeeds,
          active: activeFeeds,
          inactive: inactiveFeeds,
          maintenance: maintenanceFeeds,
          sectorStats
        },
        alerts: {
          total: totalAlerts,
          active: activeAlerts,
          resolved: resolvedAlerts,
          investigating: investigatingAlerts,
          recent: {
            last24h: recentAlerts.length,
            critical: criticalAlerts.length,
            high: highAlerts.length
          },
          severityStats
        },
        trends: alertTrends,
        topFeeds,
        systemHealth
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard summary',
      error: error.message
    });
  }
};

// Get real-time system status
exports.getSystemStatus = async (req, res) => {
  try {
    const now = new Date();
    const fiveMinutesAgo = new Date(now - 5 * 60 * 1000);
    
    // Check if detection service is running (based on recent detections)
    const recentDetections = await Feed.countDocuments({
      'lastDetection.timestamp': { $gte: fiveMinutesAgo }
    });
    
    const activeFeeds = await Feed.find({ status: 'active' });
    const activeAlerts = await Alert.findActive();
    
    const systemStatus = {
      timestamp: now,
      status: recentDetections > 0 ? 'operational' : 'warning',
      services: {
        detection: {
          status: recentDetections > 0 ? 'operational' : 'warning',
          lastActivity: await getLastDetectionTime(),
          activeFeeds: activeFeeds.length
        },
        database: {
          status: 'operational', // Could be enhanced with actual DB health check
          connection: 'stable'
        },
        alerts: {
          status: activeAlerts.length > 0 ? 'active' : 'quiet',
          activeCount: activeAlerts.length,
          criticalCount: activeAlerts.filter(a => a.severity === 'critical').length
        }
      },
      performance: {
        avgDetectionTime: await getAvgDetectionTime(),
        totalDetectionsToday: await getTodayDetections()
      }
    };
    
    res.json({
      success: true,
      data: systemStatus
    });
  } catch (error) {
    console.error('Error fetching system status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system status',
      error: error.message
    });
  }
};

// Get surveillance mode data for a specific feed
exports.getSurveillanceMode = async (req, res) => {
  try {
    const { feedId } = req.params;
    
    // Get feed details
    const feed = await Feed.findById(feedId);
    if (!feed) {
      return res.status(404).json({
        success: false,
        message: 'Feed not found'
      });
    }
    
    // Get recent alerts for this feed
    const recentAlerts = await Alert.findByFeed(feedId, 20);
    
    // Get detection history for last 24 hours
    const detectionHistory = await Alert.aggregate([
      {
        $match: {
          feedId: feed._id,
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            hour: { $hour: '$createdAt' },
            type: '$type'
          },
          count: { $sum: 1 },
          avgConfidence: { $avg: '$confidence' }
        }
      },
      {
        $group: {
          _id: '$_id.hour',
          detections: {
            $push: {
              type: '$_id.type',
              count: '$count',
              avgConfidence: '$avgConfidence'
            }
          },
          totalDetections: { $sum: '$count' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.json({
      success: true,
      data: {
        feed,
        recentAlerts,
        detectionHistory,
        surveillanceActive: feed.status === 'active' && feed.detectionEnabled
      }
    });
  } catch (error) {
    console.error('Error fetching surveillance mode data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch surveillance mode data',
      error: error.message
    });
  }
};

// Get detailed analytics
exports.getAnalytics = async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    // Calculate date range
    let daysAgo = 7;
    if (period === '24h') daysAgo = 1;
    else if (period === '7d') daysAgo = 7;
    else if (period === '30d') daysAgo = 30;
    
    const startDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    
    // Detection trends
    const detectionTrends = await Alert.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            type: '$type'
          },
          count: { $sum: 1 },
          avgConfidence: { $avg: '$confidence' }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          detections: {
            $push: {
              type: '$_id.type',
              count: '$count',
              avgConfidence: '$avgConfidence'
            }
          },
          totalDetections: { $sum: '$count' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Feed performance metrics
    const feedMetrics = await Feed.aggregate([
      {
        $lookup: {
          from: 'alerts',
          localField: '_id',
          foreignField: 'feedId',
          as: 'alerts'
        }
      },
      {
        $project: {
          title: 1,
          location: 1,
          sector: 1,
          status: 1,
          totalDetections: 1,
          alertCount: { $size: '$alerts' },
          avgConfidence: { $avg: '$alerts.confidence' },
          criticalAlerts: {
            $size: {
              $filter: {
                input: '$alerts',
                cond: { $eq: ['$$this.severity', 'critical'] }
              }
            }
          }
        }
      },
      { $sort: { alertCount: -1 } }
    ]);
    
    // Alert resolution times
    const resolutionMetrics = await Alert.aggregate([
      {
        $match: {
          status: 'resolved',
          resolvedAt: { $exists: true },
          createdAt: { $gte: startDate }
        }
      },
      {
        $project: {
          resolutionTime: {
            $divide: [
              { $subtract: ['$resolvedAt', '$createdAt'] },
              1000 * 60 // Convert to minutes
            ]
          },
          severity: 1,
          type: 1
        }
      },
      {
        $group: {
          _id: '$severity',
          avgResolutionTime: { $avg: '$resolutionTime' },
          maxResolutionTime: { $max: '$resolutionTime' },
          minResolutionTime: { $min: '$resolutionTime' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        period,
        detectionTrends,
        feedMetrics,
        resolutionMetrics
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message
    });
  }
};

// Helper functions
async function getLastDetectionTime() {
  try {
    const lastDetection = await Feed.findOne(
      { 'lastDetection.timestamp': { $exists: true } },
      { 'lastDetection.timestamp': 1 }
    ).sort({ 'lastDetection.timestamp': -1 });
    
    return lastDetection ? lastDetection.lastDetection.timestamp : null;
  } catch (error) {
    return null;
  }
}

async function getAvgDetectionTime() {
  try {
    // This would need to be implemented based on actual detection timing data
    // For now, return a placeholder
    return 2.5; // seconds
  } catch (error) {
    return null;
  }
}

async function getTodayDetections() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return await Feed.countDocuments({
      'lastDetection.timestamp': { $gte: today }
    });
  } catch (error) {
    return 0;
  }
}
