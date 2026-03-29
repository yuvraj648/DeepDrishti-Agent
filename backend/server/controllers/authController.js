const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AccessRequest = require('../models/AccessRequest');
const { promisify } = require('util');

// Generate JWT token
const signToken = (id, expiresIn = '1d') => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: expiresIn
  });
};

// Create and send token
const createSendToken = (user, statusCode, res, message, expiresIn = '1d') => {
  const token = signToken(user._id, expiresIn);
  
  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    message,
    data: {
      token,
      user
    },
    timestamp: new Date().toISOString()
  });
};

// @desc    User login
// @route   POST /api/v1/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password, rememberMe } = req.body;

    // 1) Check if email and password exist
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide email and password',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // 2) Check if user exists && password is correct
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        status: 'error',
        message: 'Incorrect email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // 3) Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'Your account has been deactivated. Please contact administrator.',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    // 4) Update last login
    await user.updateLastLogin();

    // 5) If everything ok, send token to client
    const tokenExpiry = rememberMe ? '7d' : '1d';
    createSendToken(user, 200, res, 'Login successful', tokenExpiry);

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during login',
      code: 'LOGIN_ERROR'
    });
  }
};

// @desc    Request access for new user
// @route   POST /api/v1/auth/request-access
// @access  Public
const requestAccess = async (req, res, next) => {
  try {
    const { name, email, requestedRole, reason } = req.body;

    // 1) Validate required fields
    if (!name || !email || !requestedRole) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide name, email, and requested role',
        code: 'MISSING_FIELDS'
      });
    }

    // 2) Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'An account with this email already exists',
        code: 'USER_EXISTS'
      });
    }

    // 3) Check if there's already a pending request
    const existingRequest = await AccessRequest.findByEmail(email);
    if (existingRequest && existingRequest.status === 'pending') {
      return res.status(400).json({
        status: 'error',
        message: 'You already have a pending access request',
        code: 'PENDING_REQUEST_EXISTS'
      });
    }

    // 4) Create access request
    const accessRequest = await AccessRequest.create({
      name,
      email: email.toLowerCase(),
      requestedRole,
      reason
    });

    res.status(201).json({
      status: 'success',
      message: 'Access request submitted successfully. Please wait for approval.',
      data: {
        requestId: accessRequest._id,
        name: accessRequest.name,
        email: accessRequest.email,
        requestedRole: accessRequest.requestedRole,
        status: accessRequest.status
      }
    });

  } catch (error) {
    console.error('Request access error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while submitting access request',
      code: 'REQUEST_ERROR'
    });
  }
};

// @desc    Approve access request (Captain/Vice Captain only)
// @route   POST /api/v1/auth/approve-request/:id
// @access  Private (Captain/Vice Captain)
const approveRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { temporaryPassword } = req.body;

    // 1) Find the access request
    const accessRequest = await AccessRequest.findById(id);
    if (!accessRequest) {
      return res.status(404).json({
        status: 'error',
        message: 'Access request not found',
        code: 'REQUEST_NOT_FOUND'
      });
    }

    // 2) Check if request is still pending
    if (accessRequest.status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        message: 'This request has already been processed',
        code: 'REQUEST_PROCESSED'
      });
    }

    // Role escalation: only captain can approve captain role
    if (accessRequest.requestedRole === 'captain' && req.user.role !== 'captain') {
      return res.status(403).json({
        status: 'error',
        message: 'Only captain can approve requests for captain role',
        code: 'CAPTAIN_ROLE_APPROVAL_REQUIRED',
      });
    }

    // 3) Create user account
    const defaultPassword = temporaryPassword || 'ChangeMe123!';
    const newUser = await User.create({
      name: accessRequest.name,
      email: accessRequest.email,
      password: defaultPassword,
      role: accessRequest.requestedRole,
      isActive: true
    });

    // 4) Update access request
    accessRequest.status = 'approved';
    accessRequest.reviewedBy = req.user._id;
    accessRequest.reviewedAt = new Date();
    accessRequest.reviewNotes = req.body.reviewNotes || 'Access approved';
    await accessRequest.save();

    res.status(200).json({
      status: 'success',
      message: 'Access request approved and user account created',
      data: {
        requestId: accessRequest._id,
        userId: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        temporaryPassword: defaultPassword
      }
    });

  } catch (error) {
    console.error('Approve request error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while approving request',
      code: 'APPROVE_ERROR'
    });
  }
};

// @desc    Reject access request (Captain/Vice Captain only)
// @route   POST /api/v1/auth/reject-request/:id
// @access  Private (Captain/Vice Captain)
const rejectRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reviewNotes } = req.body;

    // 1) Find the access request
    const accessRequest = await AccessRequest.findById(id);
    if (!accessRequest) {
      return res.status(404).json({
        status: 'error',
        message: 'Access request not found',
        code: 'REQUEST_NOT_FOUND'
      });
    }

    // 2) Check if request is still pending
    if (accessRequest.status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        message: 'This request has already been processed',
        code: 'REQUEST_PROCESSED'
      });
    }

    // 3) Update access request
    accessRequest.status = 'rejected';
    accessRequest.reviewedBy = req.user._id;
    accessRequest.reviewedAt = new Date();
    accessRequest.reviewNotes = reviewNotes || 'Access rejected';
    await accessRequest.save();

    res.status(200).json({
      status: 'success',
      message: 'Access request rejected',
      data: {
        requestId: accessRequest._id,
        email: accessRequest.email,
        status: accessRequest.status
      }
    });

  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while rejecting request',
      code: 'REJECT_ERROR'
    });
  }
};

// @desc    Forgot password
// @route   POST /api/v1/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    // 1) Get user based on POSTed email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(200).json({
        status: 'success',
        message: 'If an account with that email exists, a reset token has been sent.',
        code: 'EMAIL_SENT'
      });
    }

    // 2) Generate random reset token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // 3) Hash token and save to database
    user.passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save({ validateBeforeSave: false });

    // 4) Send it to user's email (simulated - in production, use email service)
    console.log('Password reset token:', resetToken);
    console.log('Reset URL:', `${process.env.FRONTEND_URL}/reset-password/${resetToken}`);

    res.status(200).json({
      status: 'success',
      message: 'Password reset token sent to email',
      code: 'EMAIL_SENT'
      // In production, don't send the token in response
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while processing forgot password',
      code: 'FORGOT_PASSWORD_ERROR'
    });
  }
};

// @desc    Reset password
// @route   POST /api/v1/auth/reset-password
// @access  Public
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    // 1) Get user based on the token
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: 'Token is invalid or has expired',
        code: 'INVALID_TOKEN'
      });
    }

    // 2) Update password
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // 3) Log user in
    createSendToken(user, 200, res, 'Password reset successful');

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while resetting password',
      code: 'RESET_PASSWORD_ERROR'
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/v1/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    
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
};

// @desc    Get all access requests (for admins)
// @route   GET /api/v1/auth/access-requests
// @access  Private (Captain/Vice Captain)
const getAccessRequests = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    // Build query
    const query = {};
    if (status) {
      query.status = status;
    }

    const requests = await AccessRequest.find(query)
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await AccessRequest.countDocuments(query);

    res.status(200).json({
      status: 'success',
      results: requests.length,
      data: {
        requests,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalRecords: total,
          limit
        }
      }
    });

  } catch (error) {
    console.error('Get access requests error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching access requests',
      code: 'REQUESTS_ERROR'
    });
  }
};

module.exports = {
  login,
  requestAccess,
  approveRequest,
  rejectRequest,
  forgotPassword,
  resetPassword,
  getMe,
  getAccessRequests
};
