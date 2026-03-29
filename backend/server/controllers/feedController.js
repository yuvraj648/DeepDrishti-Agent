const Feed = require('../models/Feed');
const Alert = require('../models/Alert');
const detectionService = require('../services/detectionService');

// Get all feeds
exports.getAllFeeds = async (req, res) => {
  try {
    const { status, sector, limit = 20, page = 1 } = req.query;
    
    // Build query
    const query = {};
    if (status) query.status = status;
    if (sector) query.sector = sector;
    
    const feeds = await Feed.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Feed.countDocuments(query);
    
    res.json({
      success: true,
      data: feeds,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching feeds:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feeds',
      error: error.message
    });
  }
};

// Get active feeds (for dashboard)
exports.getActiveFeeds = async (req, res) => {
  try {
    const feeds = await Feed.findActive();
    
    res.json({
      success: true,
      data: feeds
    });
  } catch (error) {
    console.error('Error fetching active feeds:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active feeds',
      error: error.message
    });
  }
};

// Get single feed by ID
exports.getFeedById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const feed = await Feed.findById(id);
    if (!feed) {
      return res.status(404).json({
        success: false,
        message: 'Feed not found'
      });
    }
    
    // Get recent alerts for this feed
    const recentAlerts = await Alert.findByFeed(id, 10);
    
    res.json({
      success: true,
      data: {
        ...feed.toJSON(),
        recentAlerts
      }
    });
  } catch (error) {
    console.error('Error fetching feed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feed',
      error: error.message
    });
  }
};

// Create new feed
exports.createFeed = async (req, res) => {
  try {
    const feedData = req.body;
    
    // Validate required fields
    const requiredFields = ['title', 'url', 'location', 'sector'];
    const missingFields = requiredFields.filter(field => !feedData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }
    
    const feed = new Feed(feedData);
    await feed.save();
    
    res.status(201).json({
      success: true,
      message: 'Feed created successfully',
      data: feed
    });
  } catch (error) {
    console.error('Error creating feed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create feed',
      error: error.message
    });
  }
};

// Update feed
exports.updateFeed = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const feed = await Feed.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!feed) {
      return res.status(404).json({
        success: false,
        message: 'Feed not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Feed updated successfully',
      data: feed
    });
  } catch (error) {
    console.error('Error updating feed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update feed',
      error: error.message
    });
  }
};

// Delete feed
exports.deleteFeed = async (req, res) => {
  try {
    const { id } = req.params;
    
    const feed = await Feed.findByIdAndDelete(id);
    if (!feed) {
      return res.status(404).json({
        success: false,
        message: 'Feed not found'
      });
    }
    
    // Also delete associated alerts
    await Alert.deleteMany({ feedId: id });
    
    res.json({
      success: true,
      message: 'Feed and associated alerts deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting feed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete feed',
      error: error.message
    });
  }
};

// Toggle feed status (active/inactive)
exports.toggleFeedStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['active', 'inactive', 'maintenance'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be active, inactive, or maintenance'
      });
    }
    
    const feed = await Feed.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    
    if (!feed) {
      return res.status(404).json({
        success: false,
        message: 'Feed not found'
      });
    }
    
    res.json({
      success: true,
      message: `Feed status updated to ${status}`,
      data: feed
    });
  } catch (error) {
    console.error('Error toggling feed status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update feed status',
      error: error.message
    });
  }
};

// Manually trigger detection for a feed
exports.triggerDetection = async (req, res) => {
  try {
    const { id } = req.params;
    
    const feed = await Feed.findById(id);
    if (!feed) {
      return res.status(404).json({
        success: false,
        message: 'Feed not found'
      });
    }
    
    if (feed.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Feed must be active to trigger detection'
      });
    }
    
    // Trigger detection
    const detectionResult = await detectionService.processFeedDetection(feed);
    
    res.json({
      success: true,
      message: 'Detection triggered successfully',
      data: detectionResult
    });
  } catch (error) {
    console.error('Error triggering detection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger detection',
      error: error.message
    });
  }
};

// Get feed statistics
exports.getFeedStats = async (req, res) => {
  try {
    const stats = await Feed.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgDetections: { $avg: '$totalDetections' }
        }
      }
    ]);
    
    const sectorStats = await Feed.aggregate([
      {
        $group: {
          _id: '$sector',
          count: { $sum: 1 },
          activeCount: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        statusStats: stats,
        sectorStats
      }
    });
  } catch (error) {
    console.error('Error fetching feed stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feed statistics',
      error: error.message
    });
  }
};

// Get feeds by sector
exports.getFeedsBySector = async (req, res) => {
  try {
    const { sector } = req.params;
    
    const feeds = await Feed.findBySector(sector);
    
    res.json({
      success: true,
      data: feeds
    });
  } catch (error) {
    console.error('Error fetching feeds by sector:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feeds by sector',
      error: error.message
    });
  }
};
