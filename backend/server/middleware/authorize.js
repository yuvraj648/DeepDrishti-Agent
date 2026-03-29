/**
 * Role-Based Access Control (RBAC)
 * Use after JWT `protect` so `req.user` is set.
 */

const ALL_ROLES = [
  'captain',
  'vice_captain',
  'surveillance_head',
  'engineer',
  'analyst',
];

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function logRbacDecision(req, allowed, extra = '') {
  const role = req.user?.role ?? 'none';
  const route = `${req.method} ${req.originalUrl || req.url}`;
  const access = allowed ? 'ALLOWED' : 'DENIED';
  console.log(`RBAC ROLE: ${role} ROUTE: ${route} ACCESS: ${access}${extra ? ` ${extra}` : ''}`);
}

/**
 * Allow request only if req.user.role is one of the given roles.
 * @param {...string} roles
 */
function authorize(...roles) {
  const allowed = roles.flat();
  return (req, res, next) => {
    if (!req.user) {
      logRbacDecision(req, false, '(no user)');
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    if (!allowed.includes(req.user.role)) {
      logRbacDecision(req, false, `(need one of: ${allowed.join(', ')})`);
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to perform this action',
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: allowed,
        currentRole: req.user.role,
      });
    }

    logRbacDecision(req, true);
    next();
  };
}

/** Analyst (and similar read-only policy) — block mutating HTTP methods */
function blockAnalystWrites(req, res, next) {
  if (!req.user) {
    return next();
  }
  if (req.user.role === 'analyst' && MUTATING_METHODS.has(req.method)) {
    logRbacDecision(req, false, '(analyst read-only)');
    return res.status(403).json({
      status: 'error',
      message: 'Read-only role cannot modify resources',
      code: 'READ_ONLY_ROLE',
      currentRole: req.user.role,
    });
  }
  next();
}

function authorizeAllRegistered() {
  return authorize(...ALL_ROLES);
}

module.exports = {
  authorize,
  authorizeAllRegistered,
  blockAnalystWrites,
  ALL_ROLES,
};
