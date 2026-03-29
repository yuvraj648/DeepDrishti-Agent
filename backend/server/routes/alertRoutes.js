const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const { protect } = require('../middleware/authMiddleware');
const { authorize, blockAnalystWrites } = require('../middleware/authorize');

router.use(protect);
router.use(blockAnalystWrites);

const alertReaders = authorize(
  'captain',
  'vice_captain',
  'surveillance_head',
  'analyst'
);

// GET /api/v1/alerts — spec: captain, vice_captain, surveillance_head, analyst
router.get('/', alertReaders, alertController.getAllAlerts);

router.get('/active', alertReaders, alertController.getActiveAlerts);

router.get('/recent', alertReaders, alertController.getRecentAlerts);

router.get(
  '/stats',
  authorize(
    'captain',
    'vice_captain',
    'surveillance_head',
    'engineer',
    'analyst'
  ),
  alertController.getAlertStats
);

router.get('/feed/:feedId', alertReaders, alertController.getAlertsByFeed);

router.post(
  '/',
  authorize(
    'captain',
    'vice_captain',
    'surveillance_head',
    'engineer'
  ),
  alertController.createAlert
);

router.put(
  '/bulk-resolve',
  authorize('captain', 'vice_captain', 'surveillance_head'),
  alertController.bulkResolveAlerts
);

router.get('/:id', alertReaders, alertController.getAlertById);

router.put(
  '/:id/resolve',
  authorize('captain', 'vice_captain', 'surveillance_head'),
  alertController.resolveAlert
);

router.put(
  '/:id/assign',
  authorize('captain', 'vice_captain', 'surveillance_head'),
  alertController.assignAlert
);

router.delete(
  '/:id',
  authorize('captain', 'vice_captain'),
  alertController.deleteAlert
);

module.exports = router;
