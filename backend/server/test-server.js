require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Import test routes
const testMarineRoutes = require('./routes/testMarineRoutes');

// Initialize Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://yourdomain.com']
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5003', 'http://localhost:5005'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Register test routes
app.use('/api/v1/test', testMarineRoutes);

console.log('🧪 Marine Surveillance Test API Routes registered: /api/v1/test/*');

// Health check
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'AquaScope Marine Surveillance API (TEST MODE) is running',
    timestamp: new Date().toISOString(),
    environment: 'test',
    version: '1.0.0',
    port: process.env.PORT || 5006
  });
});

// API documentation endpoint
app.get('/api/v1', (req, res) => {
  res.json({
    success: true,
    message: 'AquaScope Marine Surveillance API - Test Mode',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/v1/health',
      feeds: {
        all: 'GET /api/v1/test/feeds',
        active: 'GET /api/v1/test/feeds/active',
        byId: 'GET /api/v1/test/feeds/:id'
      },
      alerts: {
        all: 'GET /api/v1/test/alerts',
        active: 'GET /api/v1/test/alerts/active',
        byId: 'GET /api/v1/test/alerts/:id'
      },
      dashboard: {
        summary: 'GET /api/v1/test/dashboard/summary',
        systemStatus: 'GET /api/v1/test/dashboard/system-status',
        surveillance: 'GET /api/v1/test/dashboard/surveillance/:feedId'
      }
    },
    note: 'This is a test server with mock data. No database connection required.',
    sampleFeeds: 4,
    sampleAlerts: 2
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'GET /api/v1/health',
      'GET /api/v1',
      'GET /api/v1/test/feeds',
      'GET /api/v1/test/alerts',
      'GET /api/v1/test/dashboard/summary'
    ]
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('❌ Global Error:', error);
  res.status(error.statusCode || 500).json({
    status: 'error',
    message: error.message || 'Internal Server Error',
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Start server
const PORT = process.env.PORT || 5007;

const server = app.listen(PORT, () => {
  console.log(`🧪 AquaScope Marine Surveillance Test API running on port ${PORT}`);
  console.log(`\n📋 Available Test Endpoints:`);
  console.log(`   GET  http://localhost:${PORT}/api/v1/health`);
  console.log(`   GET  http://localhost:${PORT}/api/v1`);
  console.log(`   GET  http://localhost:${PORT}/api/v1/test/feeds`);
  console.log(`   GET  http://localhost:${PORT}/api/v1/test/feeds/active`);
  console.log(`   GET  http://localhost:${PORT}/api/v1/test/feeds/:id`);
  console.log(`   GET  http://localhost:${PORT}/api/v1/test/alerts`);
  console.log(`   GET  http://localhost:${PORT}/api/v1/test/alerts/active`);
  console.log(`   GET  http://localhost:${PORT}/api/v1/test/alerts/:id`);
  console.log(`   GET  http://localhost:${PORT}/api/v1/test/dashboard/summary`);
  console.log(`   GET  http://localhost:${PORT}/api/v1/test/dashboard/system-status`);
  console.log(`   GET  http://localhost:${PORT}/api/v1/test/dashboard/surveillance/:feedId`);
  console.log(`\n🔗 Test in browser: http://localhost:${PORT}/api/v1`);
  console.log(`\n⚠️  This is a TEST server with mock data only!`);
  console.log(`📹 4 Sample underwater video feeds included`);
  console.log(`🚨 2 Sample alerts included`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Test server closed gracefully');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Test server closed gracefully');
    process.exit(0);
  });
});

module.exports = app;
