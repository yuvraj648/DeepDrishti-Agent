const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { promisify } = require('util');
const { authorize: authorizeRoles } = require('./authorize');

// JWT token verification middleware
const protect = async (req, res, next) => {
  try {
    // 1) Getting token and check if it's there
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'You are not logged in! Please log in to get access.',
        code: 'NO_TOKEN'
      });
    }

    // 2) Verification token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        status: 'error',
        message: 'The user belonging to this token no longer exists.',
        code: 'USER_NOT_FOUND'
      });
    }

    // 4) Check if user is active
    if (!currentUser.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'Your account has been deactivated. Please contact administrator.',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    // 5) Check if user changed password after the token was issued
    if (currentUser.passwordChangedAt) {
      const changedTimestamp = parseInt(
        currentUser.passwordChangedAt.getTime() / 1000,
        10
      );

      if (decoded.iat < changedTimestamp) {
        return res.status(401).json({
          status: 'error',
          message: 'User recently changed password! Please log in again.',
          code: 'PASSWORD_CHANGED'
        });
      }
    }

    // 6) Grant access to protected route
    req.user = currentUser;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token. Please log in again.',
        code: 'INVALID_TOKEN'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Your token has expired! Please log in again.',
        code: 'TOKEN_EXPIRED'
      });
    } else {
      return res.status(500).json({
        status: 'error',
        message: 'Something went wrong with token verification.',
        code: 'TOKEN_ERROR'
      });
    }
  }
};

// Role-based access control — delegated to middleware/authorize.js (RBAC logging)
const allowRoles = (...roles) => authorizeRoles(...roles.flat());

// Role hierarchy check (higher roles can access lower role permissions)
const checkRoleHierarchy = (requiredRole) => {
  const roleHierarchy = {
    'captain': 5,
    'vice_captain': 4,
    'surveillance_head': 3,
    'engineer': 2,
    'analyst': 1
  };

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userRoleLevel = roleHierarchy[req.user.role] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

    if (userRoleLevel < requiredRoleLevel) {
      return res.status(403).json({
        status: 'error',
        message: `You need ${requiredRole} role or higher to perform this action`,
        code: 'INSUFFICIENT_ROLE_LEVEL',
        currentRole: req.user.role,
        requiredRole: requiredRole
      });
    }

    next();
  };
};

// Check if user is the owner of the resource or has admin privileges
const checkOwnershipOrAdmin = (resourceField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Admin can access everything
    if (req.user.role === 'captain' || req.user.role === 'vice_captain') {
      return next();
    }

    // Check ownership
    const resourceUserId = req.params[resourceField] || req.body[resourceField];
    if (req.user._id.toString() !== resourceUserId.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only access your own resources',
        code: 'ACCESS_DENIED'
      });
    }

    next();
  };
};

// Rate limiting middleware (improved implementation)
const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();

  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old requests
    if (requests.has(key)) {
      const userRequests = requests.get(key).filter(time => time > windowStart);
      requests.set(key, userRequests);
    } else {
      requests.set(key, []);
    }

    // Check rate limit
    const userRequests = requests.get(key);
    if (userRequests.length >= maxRequests) {
      const oldestRequest = Math.min(...userRequests);
      const retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000);
      
      return res.status(429).json({
        status: 'error',
        message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: retryAfter,
        currentRequests: userRequests.length,
        maxRequests: maxRequests,
        windowMinutes: Math.ceil(windowMs / 60000)
      });
    }

    // Add current request
    userRequests.push(now);
    next();
  };
};

module.exports = {
  protect,
  allowRoles,
  checkRoleHierarchy,
  checkOwnershipOrAdmin,
  rateLimit
};
