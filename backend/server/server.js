const path = require('path');
// Prefer repo BACKEND/.env regardless of current working directory
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Import routes
const detectionRoutes = require('./routes/detectionRoutes');
const userRoutes = require('./routes/userRoutes');
const enhancementRoutes = require('./routes/enhancementRoutes');
const aiEnhancementRoutes = require('./routes/aiEnhancementRoutes');
const testRoutes = require('./routes/testRoutes');
const authRoutes = require('./routes/authRoutes');
const feedRoutes = require('./routes/feedRoutes');
const alertRoutes = require('./routes/alertRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const reportRoutes = require('./routes/reportRoutes');
const systemLogRoutes = require('./routes/systemLogRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const surveillanceRoutes = require('./routes/surveillanceRoutes');
const testMarineRoutes = require('./routes/testMarineRoutes');
const { ensureSampleLogs } = require('./controllers/systemLogController');

// Import detection service
const detectionService = require('./services/detectionService');

// Initialize Express app
const app = express();

// Middleware
app.use(helmet());

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://yourdomain.com']
    : [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5174',
        'http://localhost:5003',
        'http://127.0.0.1:5003',
      ],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// ✅ DATABASE CONNECTION (resilient: do not crash dev server on initial failure)
let detectionServiceStarted = false;

const connectToMongoWithRetry = async (attempt = 1) => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ Missing MONGODB_URI in BACKEND/.env. API will run but DB-backed routes will fail.');
    return;
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected successfully');

    await ensureSampleLogs();

    if (!detectionServiceStarted) {
      // Start marine detection service ONLY after DB is ready
      console.log('🔍 Starting Marine Detection Service...');
      try {
        await detectionService.startDetectionService();
        detectionServiceStarted = true;
        console.log('✅ Marine Detection Service started successfully');
      } catch (error) {
        console.error('❌ Failed to start Marine Detection Service:', error);
      }
    }
  } catch (error) {
    const delayMs = Math.min(30000, 1000 * 2 ** Math.min(attempt, 5));
    console.error('❌ MongoDB connection error:', error.message);
    console.error(
      `🔁 Retrying MongoDB connection in ${Math.round(delayMs / 1000)}s (attempt ${attempt}). ` +
      'If using Atlas, ensure your current IP is whitelisted in Network Access.'
    );
    setTimeout(() => connectToMongoWithRetry(attempt + 1), delayMs);
  }
};

mongoose.connection.on('disconnected', () => {
  console.error('⚠️ MongoDB disconnected. Some API features may stop working until reconnection succeeds.');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

connectToMongoWithRetry();

// ✅ ROUTES REGISTERED (specific mounted before /api/v1 catch-all test routes)
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'AquaScope API Server is running',
    version: process.env.API_VERSION || '1.0.0',
    endpoints: {
      health: '/api/v1/health',
      auth: '/api/v1/auth',
      feeds: '/api/v1/feeds',
      ai: '/api/v1/ai-enhance'
    },
    timestamp: new Date().toISOString()
  });
});

app.use('/api/v1/detections', detectionRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/enhance', enhancementRoutes);
app.use('/api/v1/ai-enhance', aiEnhancementRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/feeds', feedRoutes);
app.use('/api/v1/alerts', alertRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/system-logs', systemLogRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/surveillance', surveillanceRoutes);
app.use('/api/v1/test', testMarineRoutes);
app.use('/api/v1', testRoutes);

console.log('🔗 Routes registered: /api/v1/detections');
console.log('👥 Routes registered: /api/v1/users');
console.log('🔗 Routes registered: /api/v1/enhance');
console.log('🤖 Routes registered: /api/v1/ai-enhance');
console.log('🧪 Routes registered: /api/v1/test-*');
console.log('🔐 Routes registered: /api/v1/auth');
console.log('📹 Routes registered: /api/v1/feeds');
console.log('🚨 Routes registered: /api/v1/alerts');
console.log('📊 Routes registered: /api/v1/dashboard');
console.log('📄 Routes registered: /api/v1/reports');
console.log('🖥️ Routes registered: /api/v1/system-logs');
console.log('⚙️ Routes registered: /api/v1/settings');
console.log('📡 Routes registered: /api/v1/surveillance');
console.log('🧪 Test routes registered: /api/v1/test/*');
console.log('🧪 Dev test routes: /api/v1/test-health, POST /api/v1/test-enhancement');

// Health check
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'AquaScope API is running on port 5003',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.API_VERSION
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

// Global error handler
app.use((error, req, res, next) => {
  console.error('❌ Global Error:', error);

  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      status: 'error',
      message: 'Validation Error',
      errors: errors,
      timestamp: new Date().toISOString()
    });
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(400).json({
      status: 'error',
      message: `${field} already exists`,
      timestamp: new Date().toISOString()
    });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid ID format',
      timestamp: new Date().toISOString()
    });
  }

  res.status(error.statusCode || 500).json({
    status: 'error',
    message: error.message || 'Internal Server Error',
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Start server
const PORT = process.env.PORT || 5003;
const server = app.listen(PORT, () => {
  console.log(`🚀 AquaScope API Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🌐 API Base URL: http://localhost:${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', error);
  // Stop detection service before exiting
  detectionService.stopDetectionService();
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Stop detection service before exiting
  detectionService.stopDetectionService();
  server.close(() => process.exit(1));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully...');
  detectionService.stopDetectionService();
  server.close(() => {
    console.log('✅ Server closed gracefully');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received, shutting down gracefully...');
  detectionService.stopDetectionService();
  server.close(() => {
    console.log('✅ Server closed gracefully');
    process.exit(0);
  });
});

module.exports = app;