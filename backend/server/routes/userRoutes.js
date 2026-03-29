const express = require('express');
const router = express.Router();

// Import models
const User = require('../models/User');

// Import middleware
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/authorize');

// @desc    Get all users (Captain only)
// @route   GET /api/v1/users
// @access  Private (Captain only)
router.get('/', protect, authorize('captain'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, isActive } = req.query;
    
    // Build query
    const query = {};
    if (role) {
      query.role = role;
    }
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const users = await User.find(query)
      .select('-password -passwordResetToken -passwordResetExpires')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.status(200).json({
      status: 'success',
      results: users.length,
      data: {
        users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalRecords: total,
          limit
        }
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching users',
      code: 'USERS_ERROR'
    });
  }
});

// @desc    Get current user profile
// @route   GET /api/v1/users/me
// @access  Private
router.get('/me', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -passwordResetToken -passwordResetExpires');

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });

  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching user profile',
      code: 'PROFILE_ERROR'
    });
  }
});

module.exports = router;
