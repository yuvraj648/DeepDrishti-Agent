const express = require('express');
const router = express.Router();
const surveillanceController = require('../controllers/surveillanceController');
const { protect } = require('../middleware/authMiddleware');
const {
  authorize,
  authorizeAllRegistered,
  blockAnalystWrites,
} = require('../middleware/authorize');

router.use(protect);

const operators = authorize(
  'captain',
  'vice_captain',
  'surveillance_head',
  'engineer'
);

router.get(
  '/feeds/:feedId/ai-analysis',
  authorizeAllRegistered(),
  surveillanceController.getAiAnalysis
);

router.post(
  '/feeds/:feedId/stream',
  blockAnalystWrites,
  operators,
  surveillanceController.postStreamControl
);

router.post(
  '/feeds/:feedId/capture',
  blockAnalystWrites,
  operators,
  surveillanceController.postCaptureFrame
);

router.post(
  '/feeds/:feedId/enhance-frame',
  blockAnalystWrites,
  operators,
  surveillanceController.postEnhanceFrame
);

router.post(
  '/feeds/:feedId/mark-area',
  blockAnalystWrites,
  operators,
  surveillanceController.postMarkArea
);

module.exports = router;
