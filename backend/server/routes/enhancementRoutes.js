const express = require('express');
const multer = require('multer');
const {
  enhanceImage,
  getEnhancementHistory,
  deleteEnhancement
} = require('../controllers/enhancementController');
const { protect } = require('../middleware/authMiddleware');
const {
  authorize,
  authorizeAllRegistered,
  blockAnalystWrites,
} = require('../middleware/authorize');

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// POST — captain, engineer
router.post(
  '/',
  protect,
  blockAnalystWrites,
  authorize('captain', 'engineer'),
  upload.single('image'),
  (req, res, next) => {
    console.log('📤 Enhancement route hit - POST /api/v1/enhance');
    console.log('📁 File:', req.file ? 'YES' : 'NO');
    console.log('📝 Body:', req.body);
    next();
  },
  enhanceImage
);

router.get(
  '/history',
  protect,
  authorizeAllRegistered(),
  getEnhancementHistory
);

router.delete(
  '/:id',
  protect,
  blockAnalystWrites,
  authorize('captain', 'engineer'),
  deleteEnhancement
);

module.exports = router;
