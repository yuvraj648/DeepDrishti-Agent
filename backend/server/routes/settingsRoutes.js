const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { protect, allowRoles } = require('../middleware/authMiddleware');

router.use(protect);

router.get(
  '/',
  allowRoles(['captain', 'vice_captain', 'surveillance_head', 'engineer', 'analyst']),
  settingsController.getSettings
);

router.put(
  '/',
  allowRoles(['captain', 'vice_captain', 'surveillance_head', 'engineer']),
  settingsController.updateSettings
);

module.exports = router;
