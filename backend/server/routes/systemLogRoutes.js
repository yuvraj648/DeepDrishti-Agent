const express = require('express');
const router = express.Router();
const systemLogController = require('../controllers/systemLogController');
const { protect, allowRoles } = require('../middleware/authMiddleware');

router.use(protect);

router.get(
  '/',
  allowRoles(['captain', 'vice_captain', 'surveillance_head', 'engineer', 'analyst']),
  systemLogController.listLogs
);

router.post(
  '/',
  allowRoles(['captain', 'vice_captain', 'surveillance_head', 'engineer']),
  systemLogController.appendLog
);

module.exports = router;
