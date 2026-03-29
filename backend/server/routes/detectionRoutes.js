const express = require('express');
const {
  getAllDetections,
  getDetectionById,
  createDetection,
  autoCreateDetection,
  updateDetection,
  deleteDetection,
  confirmDetection,
  markFalsePositive,
  getDetectionStats
} = require('../controllers/detectionController');
const { protect } = require('../middleware/authMiddleware');
const {
  authorize,
  authorizeAllRegistered,
  blockAnalystWrites,
} = require('../middleware/authorize');

const router = express.Router();

router.use(protect);
router.use(blockAnalystWrites);

router.get('/', authorizeAllRegistered(), getAllDetections);

router.get('/stats', authorizeAllRegistered(), getDetectionStats);

router.get('/:id', authorizeAllRegistered(), getDetectionById);

// Mutations — captain & engineer (AI / detection pipeline operators)
router.post('/', authorize('captain', 'engineer'), createDetection);

router.post('/auto', authorize('captain', 'engineer'), autoCreateDetection);

router.put('/:id', authorize('captain', 'engineer'), updateDetection);

router.delete('/:id', authorize('captain', 'engineer'), deleteDetection);

router.patch(
  '/:id/confirm',
  authorize('captain', 'vice_captain', 'surveillance_head', 'engineer'),
  confirmDetection
);

router.patch(
  '/:id/false-positive',
  authorize('captain', 'vice_captain', 'surveillance_head', 'engineer'),
  markFalsePositive
);

module.exports = router;
