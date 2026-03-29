const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5003'],
  credentials: true
}));
app.use(express.json());

// In-memory sample data
const sampleFeeds = [
  {
    _id: '1',
    title: 'Coral Reef Monitoring Camera',
    url: 'https://www.youtube.com/embed/6zrn4-FfbXw',
    status: 'active',
    location: 'Great Barrier Reef',
    sector: 'Sector Alpha',
    detectionEnabled: true,
    totalDetections: 42,
    activeAlerts: 2,
    lastDetection: { timestamp: new Date(), threat: true, confidence: 0.85 },
    createdAt: new Date()
  },
  {
    _id: '2',
    title: 'Deep Sea Exploration Feed',
    url: 'https://www.youtube.com/embed/1Vd2b8sN0Dc',
    status: 'active',
    location: 'Mariana Trench Region',
    sector: 'Sector Beta',
    detectionEnabled: true,
    totalDetections: 38,
    activeAlerts: 1,
    lastDetection: { timestamp: new Date(), threat: false, confidence: 0.45 },
    createdAt: new Date()
  },
  {
    _id: '3',
    title: 'Coastal Security Camera',
    url: 'https://www.youtube.com/embed/mx6gK6z0x0g',
    status: 'active',
    location: 'Naval Base Entrance',
    sector: 'Sector Gamma',
    detectionEnabled: true,
    totalDetections: 56,
    activeAlerts: 3,
    lastDetection: { timestamp: new Date(), threat: true, confidence: 0.92 },
    createdAt: new Date()
  },
  {
    _id: '4',
    title: 'Underwater Pipeline Monitor',
    url: 'https://www.youtube.com/embed/2OEL4P1Rz04',
    status: 'active',
    location: 'Subsea Pipeline Route',
    sector: 'Sector Delta',
    detectionEnabled: true,
    totalDetections: 29,
    activeAlerts: 0,
    lastDetection: { timestamp: new Date(), threat: false, confidence: 0.23 },
    createdAt: new Date()
  }
];

const sampleAlerts = [
  {
    _id: '1',
    feedId: '1',
    type: 'anomaly',
    confidence: 0.85,
    status: 'active',
    severity: 'high',
    title: 'Anomalous Activity Detected',
    description: 'Detection in Great Barrier Reef sector (Sector Alpha). Confidence: 85.0%. Detected: marine_life.',
    createdAt: new Date(),
    location: 'Great Barrier Reef',
    sector: 'Sector Alpha'
  },
  {
    _id: '2',
    feedId: '3',
    type: 'intrusion',
    confidence: 0.92,
    status: 'active',
    severity: 'critical',
    title: 'Security Intrusion Detected',
    description: 'Detection in Naval Base Entrance sector (Sector Gamma). Confidence: 92.0%. Detected: diver.',
    createdAt: new Date(),
    location: 'Naval Base Entrance',
    sector: 'Sector Gamma'
  }
];

// Routes
app.get('/api/v1/health', (req, res) => {
  res.json({
    success: true,
    message: 'AquaScope API is running on port 5005',
    timestamp: new Date().toISOString()
  });
});

// Feed routes
app.get('/api/v1/feeds/active', (req, res) => {
  res.json({
    success: true,
    data: sampleFeeds
  });
});

app.get('/api/v1/feeds/:id', (req, res) => {
  const feed = sampleFeeds.find(f => f._id === req.params.id);
  if (!feed) {
    return res.status(404).json({
      success: false,
      message: 'Feed not found'
    });
  }
  
  const feedAlerts = sampleAlerts.filter(a => a.feedId === req.params.id);
  res.json({
    success: true,
    data: {
      ...feed,
      recentAlerts: feedAlerts
    }
  });
});

// Alert routes
app.get('/api/v1/alerts/active', (req, res) => {
  res.json({
    success: true,
    data: sampleAlerts
  });
});

// Dashboard routes
app.get('/api/v1/dashboard/summary', (req, res) => {
  res.json({
    success: true,
    data: {
      feeds: {
        total: sampleFeeds.length,
        active: sampleFeeds.filter(f => f.status === 'active').length,
        inactive: 0,
        maintenance: 0
      },
      alerts: {
        total: sampleAlerts.length,
        active: sampleAlerts.filter(a => a.status === 'active').length,
        resolved: 0,
        investigating: 0,
        recent: {
          last24h: sampleAlerts.length,
          critical: sampleAlerts.filter(a => a.severity === 'critical').length,
          high: sampleAlerts.filter(a => a.severity === 'high').length
        }
      },
      systemHealth: {
        overall: 'operational',
        feeds: { status: 'healthy', percentage: 100 },
        alerts: { status: 'active', activeCount: sampleAlerts.filter(a => a.status === 'active').length }
      }
    }
  });
});

// Start server
const PORT = 5005;
app.listen(PORT, () => {
  console.log(`🚀 AquaScope Test API Server running on port ${PORT}`);
  console.log(`📹 Test feeds available at: http://localhost:${PORT}/api/v1/feeds/active`);
  console.log(`🚨 Test alerts available at: http://localhost:${PORT}/api/v1/alerts/active`);
  console.log(`📊 Test dashboard at: http://localhost:${PORT}/api/v1/dashboard/summary`);
});
