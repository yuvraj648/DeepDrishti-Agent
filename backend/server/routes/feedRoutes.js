const express = require('express');
const router = express.Router();
const feedController = require('../controllers/feedController');
const surveillanceController = require('../controllers/surveillanceController');
const { protect } = require('../middleware/authMiddleware');
const {
  authorize,
  authorizeAllRegistered,
  blockAnalystWrites,
} = require('../middleware/authorize');

router.use(protect);
router.use(blockAnalystWrites);

// GET /api/v1/feeds — all authenticated roles
router.get('/', authorizeAllRegistered(), feedController.getAllFeeds);

router.get('/active', authorizeAllRegistered(), feedController.getActiveFeeds);

const operators = authorize(
  'captain',
  'vice_captain',
  'surveillance_head',
  'engineer'
);

// Surveillance UI (same handlers as /api/v1/surveillance/* — mounted here so one URL space with feeds)
router.get(
  '/:feedId/surveillance/ai-analysis',
  authorizeAllRegistered(),
  surveillanceController.getAiAnalysis
);
router.post(
  '/:feedId/surveillance/stream',
  operators,
  surveillanceController.postStreamControl
);
router.post(
  '/:feedId/surveillance/capture',
  operators,
  surveillanceController.postCaptureFrame
);
router.post(
  '/:feedId/surveillance/enhance-frame',
  operators,
  surveillanceController.postEnhanceFrame
);
router.post(
  '/:feedId/surveillance/mark-area',
  operators,
  surveillanceController.postMarkArea
);

router.get(
  '/stats',
  authorizeAllRegistered(),
  feedController.getFeedStats
);

router.get('/sector/:sector', authorizeAllRegistered(), feedController.getFeedsBySector);

// POST — captain, engineer (per RBAC spec)
router.post('/', authorize('captain', 'engineer'), feedController.createFeed);

router.get('/:id', authorizeAllRegistered(), feedController.getFeedById);

router.put(
  '/:id',
  authorize('captain', 'vice_captain', 'engineer'),
  feedController.updateFeed
);

router.delete(
  '/:id',
  authorize('captain', 'vice_captain', 'engineer'),
  feedController.deleteFeed
);

router.put(
  '/:id/status',
  authorize('captain', 'vice_captain', 'engineer'),
  feedController.toggleFeedStatus
);

router.post(
  '/:id/detect',
  authorize('captain', 'engineer'),
  feedController.triggerDetection
);

module.exports = router;
