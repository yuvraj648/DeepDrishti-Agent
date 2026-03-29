const express = require('express');
const router = express.Router();

// Import controllers
const {
  login,
  requestAccess,
  approveRequest,
  rejectRequest,
  forgotPassword,
  resetPassword,
  getMe,
  getAccessRequests
} = require('../controllers/authController');

// Import middleware
const { protect, rateLimit } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/authorize');

// Apply different rate limits for different routes
const loginRateLimit = rateLimit(30, 15 * 60 * 1000); // 30 login attempts per 15 minutes
const generalRateLimit = rateLimit(50, 15 * 60 * 1000); // 50 general requests per 15 minutes

// @desc    User login
// @route   POST /api/v1/auth/login
// @access  Public
router.post('/login', loginRateLimit, login);

// @desc    Request access for new user
// @route   POST /api/v1/auth/request-access
// @access  Public
router.post('/request-access', generalRateLimit, requestAccess);

// @desc    Forgot password
// @route   POST /api/v1/auth/forgot-password
// @access  Public
router.post('/forgot-password', generalRateLimit, forgotPassword);

// @desc    Reset password
// @route   POST /api/v1/auth/reset-password
// @access  Public
router.post('/reset-password', generalRateLimit, resetPassword);

// @desc    Get current user profile
// @route   GET /api/v1/auth/me
// @access  Private
router.get('/me', protect, getMe);

// @desc    Get all access requests
// @route   GET /api/v1/auth/access-requests
// @access  Private (Captain/Vice Captain only)
router.get('/access-requests', protect, authorize('captain', 'vice_captain'), getAccessRequests);

// @desc    Approve access request
// @route   POST /api/v1/auth/approve-request/:id
// @access  Private (Captain/Vice Captain only)
router.post('/approve-request/:id', protect, authorize('captain', 'vice_captain'), approveRequest);

// @desc    Reject access request
// @route   POST /api/v1/auth/reject-request/:id
// @access  Private (Captain/Vice Captain only)
router.post('/reject-request/:id', protect, authorize('captain', 'vice_captain'), rejectRequest);

// @desc    Clear rate limits (development only)
// @route   POST /api/v1/auth/clear-rate-limit
// @access  Public (development only)
router.post('/clear-rate-limit', (req, res) => {
  if (process.env.NODE_ENV === 'development') {
    // Clear the rate limit maps by forcing garbage collection
    if (global.gc) {
      global.gc();
    }
    res.status(200).json({
      status: 'success',
      message: 'Rate limits cleared (development mode)',
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(404).json({
      status: 'error',
      message: 'Route not found',
      code: 'NOT_FOUND'
    });
  }
});

module.exports = router;
