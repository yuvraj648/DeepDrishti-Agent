const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const Enhancement = require('../models/Enhancement');
const Detection = require('../models/Detection');
const { buildEnhancementLabMetrics } = require('../utils/enhancementLabMetrics');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'temp-uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'), false);
    }
  }
});

// Flask server configuration
const FLASK_SERVER_URL = 'http://localhost:5001';

// @desc    AI Enhancement via Flask API
// @route   POST /api/v1/ai-enhance
// @access  Public
const aiEnhanceMedia = async (req, res, next) => {
  try {
    console.log('🤖 AI Enhancement request received');
    console.log('📁 File received:', req.file);
    console.log('📝 Body received:', req.body);

    // Check if file was uploaded
    if (!req.file) {
      console.log('❌ No file uploaded');
      return res.status(400).json({
        status: 'error',
        message: 'No media file uploaded',
        timestamp: new Date().toISOString()
      });
    }

    const startTime = Date.now();
    const isVideo = req.file.mimetype.startsWith('video/');

    // Create FormData for Flask API
    const formData = new FormData();
    
    // Read the uploaded file and append to FormData
    const fileStream = fs.createReadStream(req.file.path);
    
    // If it's a video, Flask expects it in a certain field or handles it differently
    // Based on app.py, it uses 'image' or 'file' field for both.
    formData.append('file', fileStream, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });

    console.log(`🔄 Sending ${isVideo ? 'video' : 'image'} to Flask AI server...`);
    console.log("➡ Sending request to Flask...");

    // Send request to Flask AI enhancement server
    // We use /pipeline which handles both images and videos (by extracting a frame)
    const flaskResponse = await axios.post('http://localhost:5001/pipeline', formData, {
      headers: formData.getHeaders(),
      timeout: 60000 // Increase timeout for videos
    });

    console.log("⬅ Response from Flask:", flaskResponse.data);
    console.log('✅ Flask AI response received');
    console.log('📊 Processing time:', flaskResponse.data.data.processing_time_ms, 'ms');

    const processingTime = Date.now() - startTime;
    const uploadedSizeBytes = req.file.size;
    const originalName = req.file.originalname;

    // Save enhancement metadata to MongoDB
    console.log('💾 Saving enhancement metadata to MongoDB...');
    try {
      const enhancementRecord = new Enhancement({
        originalImage: `temp-uploads/${req.file.filename}`,
        enhancedImage: flaskResponse.data.data.enhanced_image_path,
        processingTime: flaskResponse.data.data.processing_time_ms,
        enhancementType: 'ai_unet_v2.4',
        originalFilename: req.file.originalname,
        enhancedFilename: flaskResponse.data.data.output_filename,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        detectionId: req.body.detectionId || null
      });

      const savedEnhancement = await enhancementRecord.save();
      console.log('📊 MONGODB IMAGE SAVE WORKING');
    } catch (dbError) {
      console.log('⚠️ Database save failed:', dbError.message);
      // Continue with response even if DB save fails
    }

    // Clean up temporary file
    try {
      fs.unlinkSync(req.file.path);
      console.log('🗑️ Temporary file cleaned up');
    } catch (cleanupError) {
      console.warn('⚠️ Warning: Could not clean up temp file:', cleanupError.message);
    }

    const flaskData = flaskResponse.data.data;
    const flaskDetections = Array.isArray(flaskData.detections) ? flaskData.detections : [];
    const labMetrics = buildEnhancementLabMetrics(
      flaskData.processing_time_ms,
      uploadedSizeBytes,
      {
        ...flaskData.lab,
        ...flaskData.quality,
        psnr: flaskData.metrics?.psnr,
        ssim: flaskData.metrics?.ssim,
        uiqm: flaskData.metrics?.uiqm,
        detections: flaskData.detections
      }
    );

    try {
      if (flaskDetections.length) {
        const toThreatStatus = (d) => {
          const s = String(d?.status || '').toUpperCase();
          if (s === 'DANGER') return 'DANGER';
          if (s === 'SAFE') return 'SAFE';
          if (s === 'CLEAR') return 'CLEAR';
          return 'NEUTRAL';
        };

        await Detection.insertMany(
          flaskDetections.map((d) => ({
            id: `DET-LAB-${Date.now()}-${Math.random().toString(36).slice(2, 9).toUpperCase()}`,
            cameraSource: 'LAB_UPLOAD',
            objectDetected: d.class || d.raw_class || 'unknown',
            confidence: Math.min(100, Math.max(0, Math.round((d.confidence ?? 0) * 100))),
            timestamp: new Date(),
            status: 'investigating',
            threatStatus: toThreatStatus(d),
            distance_m: typeof d.distance_m === 'number' ? d.distance_m : null,
            modelsUsed: Array.isArray(d.models_used) ? d.models_used : null,
            boundingBox: d.bbox || null,
            snapshotPath: flaskData.enhanced_image_path || null,
            enhancedImage: flaskData.enhanced_image_path || null,
            processingTime: flaskData.processing_time_ms || 0,
            aiModel: 'FUNIE-GAN + YOLOv8 + MiDaS',
          })),
          { ordered: false }
        );
      }
    } catch (detPersistErr) {
      console.warn('⚠️ Could not persist detection records for Enhancement Lab:', detPersistErr.message);
    }

    // Return response (includes scientific metrics for Enhancement Lab UI)
    res.status(200).json({
      status: 'success',
      data: {
        enhancedImage: flaskData.enhanced_image_path,
        processingTime: flaskData.processing_time_ms,
        originalFilename: originalName,
        enhancedFilename: flaskData.output_filename,
        modelDevice: flaskData.model_device,
        detections: flaskDetections,
        imageWidth: typeof flaskData.image_width === 'number' ? flaskData.image_width : null,
        imageHeight: typeof flaskData.image_height === 'number' ? flaskData.image_height : null,
        totalRequestTime: processingTime,
        flaskProcessingTime: flaskData.processing_time_ms,
        nodeProcessingTime: processingTime - flaskData.processing_time_ms,
        qualityMetrics: labMetrics.qualityMetrics,
        improvements: labMetrics.improvements,
        detectionResults: labMetrics.detectionResults,
      },
      message: 'Image enhanced successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.log('❌ AI Enhancement failed:', error.message);
    
    // Clean up temporary file if it exists
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('🗑️ Temporary file cleaned up after error');
      } catch (cleanupError) {
        console.warn('⚠️ Warning: Could not clean up temp file:', cleanupError.message);
      }
    }

    // Handle different error types
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        status: 'error',
        message: 'Flask AI server is not available',
        data: {
          aiServerStatus: 'unavailable',
          error: error.message
        },
        timestamp: new Date().toISOString()
      });
    }

    if (error.code === 'ETIMEDOUT') {
      return res.status(408).json({
        status: 'error',
        message: 'AI enhancement request timed out',
        data: {
          aiServerStatus: 'timeout',
          error: error.message
        },
        timestamp: new Date().toISOString()
      });
    }

    if (error.response) {
      return res.status(error.response.status).json({
        status: 'error',
        message: 'Flask AI server error',
        data: {
          flaskStatus: error.response.status,
          flaskError: error.response.data
        },
        timestamp: new Date().toISOString()
      });
    }

    return res.status(500).json({
      status: 'error',
      message: 'AI enhancement failed',
      data: {
        error: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
};

// @desc    Get AI enhancement history
// @route   GET /api/v1/ai-enhance/history
// @access  Public
const getAIEnhancementHistory = async (req, res, next) => {
  try {
    console.log('📋 Retrieving AI enhancement history...');
    
    const { page = 1, limit = 20, enhancementType } = req.query;
    
    // Build query
    const query = {};
    if (enhancementType) {
      query.enhancementType = enhancementType;
    }
    
    // Get enhancements from MongoDB
    const enhancements = await Enhancement.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
    
    const total = await Enhancement.countDocuments(query);
    
    res.status(200).json({
      status: 'success',
      data: {
        enhancements,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalRecords: total,
          limit
        }
      },
      message: 'AI enhancement history retrieved successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Failed to retrieve AI enhancement history:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve enhancement history',
      timestamp: new Date().toISOString()
    });
  }
};

// @desc    Check Flask AI server health
// @route   GET /api/v1/ai-enhance/health
// @access  Public
const checkAIHealth = async (req, res, next) => {
  try {
    console.log('🏥 Checking AI server health...');
    
    const response = await axios.get('http://localhost:5001/health', {
      timeout: 5000
    });

    res.status(200).json({
      status: 'success',
      data: {
        aiServerStatus: response.data.status,
        models: response.data.models || null,
        device: response.data.device,
        nodeServerTimestamp: new Date().toISOString()
      },
      message: 'AI server is healthy',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.log('❌ AI server health check failed:', error.message);
    
    res.status(200).json({ // Changed to 200 to allow frontend to handle "unavailable" gracefully
      status: 'error',
      message: 'AI server is not available',
      data: {
        aiServerStatus: 'unavailable',
        error: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
};

// Routes
router.post(
  '/',
  upload.single('file'), // Changed from 'image' to 'file' to be more generic
  aiEnhanceMedia
);
router.get('/health', checkAIHealth);
router.get(
  '/history',
  getAIEnhancementHistory
);

module.exports = router;
