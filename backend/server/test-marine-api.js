// Test script for Marine Surveillance Dashboard API
// This script tests the API endpoints without requiring MongoDB

const express = require('express');
const cors = require('cors');

// Create a minimal test server to verify our API structure
const app = express();

app.use(cors());
app.use(express.json());

// Mock data for testing
const mockFeeds = [
  {
    _id: '1',
    title: 'Coral Reef Monitoring Camera',
    url: 'https://www.youtube.com/embed/6zrn4-FfbXw',
    status: 'active',
    location: 'Great Barrier Reef',
    sector: 'Sector Alpha',
    detectionEnabled: true,
    detectionInterval: 10000,
    totalDetections: 156,
    activeAlerts: 2,
    createdAt: new Date(),
    lastDetection: {
      timestamp: new Date(),
      threat: false,
      confidence: 0.3,
      type: 'normal'
    }
  },
  {
    _id: '2',
    title: 'Deep Sea Exploration Feed',
    url: 'https://www.youtube.com/embed/1Vd2b8sN0Dc',
    status: 'active',
    location: 'Mariana Trench Region',
    sector: 'Sector Beta',
    detectionEnabled: true,
    detectionInterval: 15000,
    totalDetections: 89,
    activeAlerts: 1,
    createdAt: new Date(),
    lastDetection: {
      timestamp: new Date(Date.now() - 300000),
      threat: true,
      confidence: 0.87,
      type: 'anomaly'
    }
  },
  {
    _id: '3',
    title: 'Coastal Security Camera',
    url: 'https://www.youtube.com/embed/mx6gK6z0x0g',
    status: 'active',
    location: 'Naval Base Entrance',
    sector: 'Sector Gamma',
    detectionEnabled: true,
    detectionInterval: 8000,
    totalDetections: 234,
    activeAlerts: 0,
    createdAt: new Date(),
    lastDetection: {
      timestamp: new Date(Date.now() - 120000),
      threat: false,
      confidence: 0.15,
      type: 'normal'
    }
  },
  {
    _id: '4',
    title: 'Underwater Pipeline Monitor',
    url: 'https://www.youtube.com/embed/2OEL4P1Rz04',
    status: 'maintenance',
    location: 'Subsea Pipeline Route',
    sector: 'Sector Delta',
    detectionEnabled: false,
    detectionInterval: 12000,
    totalDetections: 67,
    activeAlerts: 0,
    createdAt: new Date(),
    lastDetection: {
      timestamp: new Date(Date.now() - 3600000),
      threat: false,
      confidence: 0.22,
      type: 'normal'
    }
  }
];

const mockAlerts = [
  {
    _id: '1',
    feedId: '2',
    type: 'anomaly',
    confidence: 0.87,
    status: 'active',
    severity: 'high',
    title: 'Anomalous Activity Detected',
    description: 'Detection in Mariana Trench Region sector (Sector Beta). Confidence: 87.0%. Detected: unknown_object.',
    location: 'Mariana Trench Region',
    sector: 'Sector Beta',
    createdAt: new Date(Date.now() - 300000),
    detectionData: {
      threat: true,
      detectedObject: 'unknown_object',
      boundingBox: { x: 120, y: 80, width: 75, height: 60 },
      frameTimestamp: new Date(Date.now() - 300000),
      processingTime: 1.8
    }
  },
  {
    _id: '2',
    feedId: '1',
    type: 'object',
    confidence: 0.92,
    status: 'active',
    severity: 'critical',
    title: 'Suspicious Object Detected',
    description: 'Detection in Great Barrier Reef sector (Sector Alpha). Confidence: 92.0%. Detected: diver.',
    location: 'Great Barrier Reef',
    sector: 'Sector Alpha',
    createdAt: new Date(Date.now() - 600000),
    detectionData: {
      threat: true,
      detectedObject: 'diver',
      boundingBox: { x: 200, y: 150, width: 45, height: 80 },
      frameTimestamp: new Date(Date.now() - 600000),
      processingTime: 2.1
    }
  }
];

// Mock API endpoints

// GET /api/v1/feeds
app.get('/api/v1/feeds', (req, res) => {
  res.json({
    success: true,
    data: mockFeeds,
    pagination: {
      page: 1,
      limit: 20,
      total: mockFeeds.length,
      pages: 1
    }
  });
});

// GET /api/v1/feeds/active
app.get('/api/v1/feeds/active', (req, res) => {
  const activeFeeds = mockFeeds.filter(feed => feed.status === 'active');
  res.json({
    success: true,
    data: activeFeeds
  });
});

// GET /api/v1/feeds/:id
app.get('/api/v1/feeds/:id', (req, res) => {
  const feed = mockFeeds.find(f => f._id === req.params.id);
  if (!feed) {
    return res.status(404).json({
      success: false,
      message: 'Feed not found'
    });
  }
  
  const feedAlerts = mockAlerts.filter(alert => alert.feedId === req.params.id);
  
  res.json({
    success: true,
    data: {
      ...feed,
      recentAlerts: feedAlerts
    }
  });
});

// GET /api/v1/alerts
app.get('/api/v1/alerts', (req, res) => {
  res.json({
    success: true,
    data: mockAlerts,
    pagination: {
      page: 1,
      limit: 50,
      total: mockAlerts.length,
      pages: 1
    }
  });
});

// GET /api/v1/alerts/active
app.get('/api/v1/alerts/active', (req, res) => {
  const activeAlerts = mockAlerts.filter(alert => alert.status === 'active');
  res.json({
    success: true,
    data: activeAlerts
  });
});

// GET /api/v1/alerts/:id
app.get('/api/v1/alerts/:id', (req, res) => {
  const alert = mockAlerts.find(a => a._id === req.params.id);
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
});

// GET /api/v1/dashboard/summary
app.get('/api/v1/dashboard/summary', (req, res) => {
  const summary = {
    feeds: {
      total: mockFeeds.length,
      active: mockFeeds.filter(f => f.status === 'active').length,
      inactive: mockFeeds.filter(f => f.status === 'inactive').length,
      maintenance: mockFeeds.filter(f => f.status === 'maintenance').length,
      sectorStats: [
        { _id: 'Sector Alpha', totalFeeds: 1, activeFeeds: 1, totalDetections: 156, activeAlerts: 2 },
        { _id: 'Sector Beta', totalFeeds: 1, activeFeeds: 1, totalDetections: 89, activeAlerts: 1 },
        { _id: 'Sector Gamma', totalFeeds: 1, activeFeeds: 1, totalDetections: 234, activeAlerts: 0 },
        { _id: 'Sector Delta', totalFeeds: 1, activeFeeds: 0, totalDetections: 67, activeAlerts: 0 }
      ]
    },
    alerts: {
      total: mockAlerts.length,
      active: mockAlerts.filter(a => a.status === 'active').length,
      resolved: mockAlerts.filter(a => a.status === 'resolved').length,
      investigating: mockAlerts.filter(a => a.status === 'investigating').length,
      recent: {
        last24h: mockAlerts.length,
        critical: mockAlerts.filter(a => a.severity === 'critical').length,
        high: mockAlerts.filter(a => a.severity === 'high').length
      },
      severityStats: [
        { _id: 'critical', count: 1 },
        { _id: 'high', count: 1 },
        { _id: 'medium', count: 0 },
        { _id: 'low', count: 0 }
      ]
    },
    trends: [],
    topFeeds: mockFeeds.sort((a, b) => b.totalDetections - a.totalDetections).slice(0, 5),
    systemHealth: {
      overall: 'operational',
      feeds: { status: 'healthy', percentage: 75 },
      alerts: { status: 'critical', activeCount: 2, criticalCount: 1 },
      detection: { status: 'operational', lastDetection: new Date() }
    }
  };
  
  res.json({
    success: true,
    data: summary
  });
});

// GET /api/v1/dashboard/system-status
app.get('/api/v1/dashboard/system-status', (req, res) => {
  res.json({
    success: true,
    data: {
      timestamp: new Date(),
      status: 'operational',
      services: {
        detection: {
          status: 'operational',
          lastActivity: new Date(),
          activeFeeds: 3
        },
        database: {
          status: 'operational',
          connection: 'stable'
        },
        alerts: {
          status: 'active',
          activeCount: 2,
          criticalCount: 1
        }
      },
      performance: {
        avgDetectionTime: 2.1,
        totalDetectionsToday: 546
      }
    }
  });
});

// GET /api/v1/dashboard/surveillance/:feedId
app.get('/api/v1/dashboard/surveillance/:feedId', (req, res) => {
  const feed = mockFeeds.find(f => f._id === req.params.feedId);
  if (!feed) {
    return res.status(404).json({
      success: false,
      message: 'Feed not found'
    });
  }
  
  const feedAlerts = mockAlerts.filter(alert => alert.feedId === req.params.feedId);
  
  res.json({
    success: true,
    data: {
      feed,
      recentAlerts: feedAlerts,
      detectionHistory: [],
      surveillanceActive: feed.status === 'active' && feed.detectionEnabled
    }
  });
});

// Health check
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'AquaScope Marine Surveillance API is running (TEST MODE)',
    timestamp: new Date().toISOString(),
    environment: 'test',
    version: '1.0.0'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

const PORT = 5004;
const server = app.listen(PORT, () => {
  console.log(`🧪 Marine Surveillance API Test Server running on port ${PORT}`);
  console.log(`\n📋 Available Test Endpoints:`);
  console.log(`   GET  http://localhost:${PORT}/api/v1/health`);
  console.log(`   GET  http://localhost:${PORT}/api/v1/feeds`);
  console.log(`   GET  http://localhost:${PORT}/api/v1/feeds/active`);
  console.log(`   GET  http://localhost:${PORT}/api/v1/feeds/:id`);
  console.log(`   GET  http://localhost:${PORT}/api/v1/alerts`);
  console.log(`   GET  http://localhost:${PORT}/api/v1/alerts/active`);
  console.log(`   GET  http://localhost:${PORT}/api/v1/alerts/:id`);
  console.log(`   GET  http://localhost:${PORT}/api/v1/dashboard/summary`);
  console.log(`   GET  http://localhost:${PORT}/api/v1/dashboard/system-status`);
  console.log(`   GET  http://localhost:${PORT}/api/v1/dashboard/surveillance/:feedId`);
  console.log(`\n🔗 Test with: curl http://localhost:${PORT}/api/v1/feeds`);
  console.log(`\n⚠️  This is a TEST server with mock data only!`);
});

module.exports = app;
