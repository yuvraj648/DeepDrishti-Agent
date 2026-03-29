const Detection = require('../models/Detection');

// Helper function to generate unique detection ID
const generateDetectionId = () => {
  return 'DET-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
};

// Helper function to generate random detection data
const generateDetectionData = () => {
  const objects = ['Unidentified Submersible', 'Bio-Acoustic Anomaly', 'Unknown Marine Movement', 'Draft Variance'];
  const cameras = ['CAM_ALPHA_01', 'CAM_ALPHA_02', 'CAM_ALPHA_03', 'CAM_ALPHA_04'];
  
  return {
    id: generateDetectionId(),
    objectDetected: objects[Math.floor(Math.random() * objects.length)],
    confidence: Math.floor(Math.random() * 30) + 70, // 70-99% confidence
    cameraSource: cameras[Math.floor(Math.random() * cameras.length)],
    status: 'investigating',
    timestamp: new Date()
  };
};

// @desc    Auto-generate and save detection
// @route   POST /api/v1/detections/auto
// @access  Public
const autoCreateDetection = async (req, res, next) => {
  try {
    console.log('🎯 Auto-creating detection...');
    
    // Generate detection data automatically
    const detectionData = generateDetectionData();
    
    // Add optional snapshot if provided
    if (req.body.snapshot) {
      detectionData.snapshot = req.body.snapshot;
    }
    
    console.log('📝 Generated detection data:', detectionData);
    
    // Save to MongoDB
    const savedDetection = await Detection.create(detectionData);
    
    console.log('✅ Detection saved:', savedDetection._id);
    console.log('🔍 Detection details:', {
      id: savedDetection.id,
      object: savedDetection.objectDetected,
      confidence: savedDetection.confidence + '%',
      camera: savedDetection.cameraSource,
      status: savedDetection.status
    });
    
    res.status(201).json({
      status: 'success',
      data: savedDetection,
      message: 'Detection auto-generated successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error auto-creating detection:', error);
    next(error);
  }
};

// @desc    Get all detections
// @route   GET /api/v1/detections
// @access  Public
const getAllDetections = async (req, res, next) => {
  try {
    // Extract query parameters for filtering
    const {
      page = 1,
      limit = 20,
      cameraSource,
      objectDetected,
      status,
      confidence,
      startDate,
      endDate,
      sortBy = 'timestamp',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (cameraSource) filter.cameraSource = cameraSource;
    if (objectDetected) filter.objectDetected = objectDetected;
    if (status) filter.status = status;
    
    // Confidence filtering
    if (confidence) {
      const confRange = confidence.split('-');
      if (confRange.length === 2) {
        filter.confidence = { $gte: parseFloat(confRange[0]), $lte: parseFloat(confRange[1]) };
      } else if (confidence.startsWith('>')) {
        filter.confidence = { $gt: parseFloat(confidence.substring(1)) };
      } else if (confidence.startsWith('<')) {
        filter.confidence = { $lt: parseFloat(confidence.substring(1)) };
      }
    }
    
    // Date range filtering
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Sorting
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const detections = await Detection.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Detection.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      data: detections,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single detection
// @route   GET /api/v1/detections/:id
// @access  Public
const getDetectionById = async (req, res, next) => {
  try {
    const detection = await Detection.findOne({ id: req.params.id });

    if (!detection) {
      return res.status(404).json({
        status: 'error',
        message: 'Detection not found',
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      status: 'success',
      data: detection,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new detection
// @route   POST /api/v1/detections
// @access  Public
const createDetection = async (req, res, next) => {
  try {
    const detectionData = req.body;
    
    // Generate unique ID if not provided
    if (!detectionData.id) {
      detectionData.id = 'DET-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    }

    const detection = await Detection.create(detectionData);

    res.status(201).json({
      status: 'success',
      data: detection,
      message: 'Detection created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update detection
// @route   PUT /api/v1/detections/:id
// @access  Public
const updateDetection = async (req, res, next) => {
  try {
    const detection = await Detection.findOne({ id: req.params.id });

    if (!detection) {
      return res.status(404).json({
        status: 'error',
        message: 'Detection not found',
        timestamp: new Date().toISOString()
      });
    }

    const updatedDetection = await Detection.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      data: updatedDetection,
      message: 'Detection updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete detection
// @route   DELETE /api/v1/detections/:id
// @access  Public
const deleteDetection = async (req, res, next) => {
  try {
    const detection = await Detection.findOne({ id: req.params.id });

    if (!detection) {
      return res.status(404).json({
        status: 'error',
        message: 'Detection not found',
        timestamp: new Date().toISOString()
      });
    }

    await Detection.findOneAndDelete({ id: req.params.id });

    res.status(200).json({
      status: 'success',
      message: 'Detection deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Confirm detection
// @route   PATCH /api/v1/detections/:id/confirm
// @access  Public
const confirmDetection = async (req, res, next) => {
  try {
    const { reviewedBy, notes } = req.body;

    const detection = await Detection.findOne({ id: req.params.id });

    if (!detection) {
      return res.status(404).json({
        status: 'error',
        message: 'Detection not found',
        timestamp: new Date().toISOString()
      });
    }

    await detection.confirm(reviewedBy, notes);

    res.status(200).json({
      status: 'success',
      data: detection,
      message: 'Detection confirmed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark detection as false positive
// @route   PATCH /api/v1/detections/:id/false-positive
// @access  Public
const markFalsePositive = async (req, res, next) => {
  try {
    const { reviewedBy, notes } = req.body;

    const detection = await Detection.findOne({ id: req.params.id });

    if (!detection) {
      return res.status(404).json({
        status: 'error',
        message: 'Detection not found',
        timestamp: new Date().toISOString()
      });
    }

    await detection.markFalsePositive(reviewedBy, notes);

    res.status(200).json({
      status: 'success',
      data: detection,
      message: 'Detection marked as false positive',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detection statistics
// @route   GET /api/v1/detections/stats
// @access  Public
const getDetectionStats = async (req, res, next) => {
  try {
    const stats = await Detection.aggregate([
      {
        $group: {
          _id: null,
          totalDetections: { $sum: 1 },
          confirmedDetections: {
            $sum: { $cond: [{ $eq: ['$status', 'Confirmed'] }, 1, 0] }
          },
          investigatingDetections: {
            $sum: { $cond: [{ $eq: ['$status', 'Investigating'] }, 1, 0] }
          },
          falsePositiveDetections: {
            $sum: { $cond: [{ $eq: ['$status', 'False Positive'] }, 1, 0] }
          },
          avgConfidence: { $avg: '$confidence' },
          maxConfidence: { $max: '$confidence' },
          minConfidence: { $min: '$confidence' }
        }
      }
    ]);

    const objectStats = await Detection.aggregate([
      {
        $group: {
          _id: '$objectDetected',
          count: { $sum: 1 },
          avgConfidence: { $avg: '$confidence' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const cameraStats = await Detection.aggregate([
      {
        $group: {
          _id: '$cameraSource',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        overview: stats[0] || {
          totalDetections: 0,
          confirmedDetections: 0,
          investigatingDetections: 0,
          falsePositiveDetections: 0,
          avgConfidence: 0,
          maxConfidence: 0,
          minConfidence: 0
        },
        objectTypes: objectStats,
        cameraSources: cameraStats
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllDetections,
  getDetectionById,
  createDetection,
  autoCreateDetection,
  updateDetection,
  deleteDetection,
  confirmDetection,
  markFalsePositive,
  getDetectionStats
};
