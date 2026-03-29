const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const reportController = require('../controllers/reportController');
const { protect: authenticate, allowRoles: authorize } = require('../middleware/authMiddleware');

// Apply authentication to all routes
router.use(authenticate);

// GET /api/v1/dashboard/summary - Get dashboard summary statistics
router.get('/summary', authorize(['captain', 'vice_captain', 'surveillance_head', 'engineer', 'analyst']), dashboardController.getDashboardSummary);

// GET /api/v1/dashboard/system-status - Get real-time system status
router.get('/system-status', authorize(['captain', 'vice_captain', 'surveillance_head', 'engineer']), dashboardController.getSystemStatus);

// GET /api/v1/dashboard/surveillance/:feedId - Get surveillance mode data for specific feed
router.get('/surveillance/:feedId', authorize(['captain', 'vice_captain', 'surveillance_head', 'engineer', 'analyst']), dashboardController.getSurveillanceMode);

// GET /api/v1/dashboard/analytics - Get detailed analytics
router.get('/analytics', authorize(['captain', 'vice_captain', 'surveillance_head', 'engineer', 'analyst']), dashboardController.getAnalytics);

// Mirrors for reports (same handlers as /api/v1/reports/*) — use if primary mount order differs on older deployments
router.get(
  '/reports-analytics',
  authorize(['captain', 'vice_captain', 'surveillance_head', 'engineer', 'analyst']),
  reportController.getReportsAnalytics
);
router.post(
  '/reports-dispatch',
  authorize(['captain', 'vice_captain', 'surveillance_head', 'engineer', 'analyst']),
  reportController.dispatchReport
);

module.exports = router;
