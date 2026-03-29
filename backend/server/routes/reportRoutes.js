const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect, allowRoles } = require('../middleware/authMiddleware');

router.use(protect);

router.get(
  '/analytics',
  allowRoles(['captain', 'vice_captain', 'surveillance_head', 'engineer', 'analyst']),
  reportController.getReportsAnalytics
);

router.post(
  '/dispatch',
  allowRoles(['captain', 'vice_captain', 'surveillance_head', 'engineer', 'analyst']),
  reportController.dispatchReport
);

module.exports = router;
