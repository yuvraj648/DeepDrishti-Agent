const Detection = require('../models/Detection');
const Enhancement = require('../models/Enhancement');
const { buildEnhancementLabMetrics } = require('../utils/enhancementLabMetrics');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

// @desc    Enhance image using AI
// @route   POST /api/v1/enhance
// @access  Public
const enhanceImage = async (req, res, next) => {
  try {
    console.log(' Enhancement controller hit');
    console.log(' File received:', req.file);
    console.log(' Body received:', req.body);

    // Check if file was uploaded
    if (!req.file) {
      console.log(' No file uploaded');
      return res.status(400).json({
        status: 'error',
        message: 'No image file uploaded',
        timestamp: new Date().toISOString()
      });
    }

    const { detectionId, enhancementType } = req.body;
    console.log(' Detection ID:', detectionId);
    console.log(' Enhancement Type:', enhancementType);

    // Find the detection if detectionId is provided (optional)
    let detection = null;
    if (detectionId) {
      detection = await Detection.findOne({ id: detectionId });
      console.log(' Found detection:', detection ? 'YES' : 'NO');
      
      if (!detection) {
        console.log(' Detection not found');
        return res.status(404).json({
          status: 'error',
          message: 'Detection not found',
          timestamp: new Date().toISOString()
        });
      }
    } else {
      console.log(' No detection ID provided - processing standalone image');
    }
    console.log("✅ Enhance route hit - sending to Flask AI server");

    // Send image to Flask AI enhancement server
    const FLASK_SERVER_URL = 'http://localhost:5001';
    let enhancedImageUrl;
    let processingTime;
    let flaskPayloadExtras = {};

    try {
      // Create FormData for Flask API
      const formData = new FormData();
      
      // Read the uploaded file and append to FormData
      const fileStream = fs.createReadStream(req.file.path);
      formData.append('file', fileStream, {
        filename: req.file.originalname,
        contentType: req.file.mimetype
      });
      
      console.log('📤 Sending request to Flask AI server...');
      
      // Send request to Flask AI enhancement server
      const flaskResponse = await axios.post(`${FLASK_SERVER_URL}/pipeline`, formData, {
        headers: {
          ...formData.getHeaders(),
          'Accept': 'application/json'
        },
        timeout: 60000, // 60 second timeout for AI processing
        maxContentLength: 50 * 1024 * 1024, // 50MB max response
        maxBodyLength: 50 * 1024 * 1024 // 50MB max request
      });
      
      console.log('✅ Response received from Flask');
      console.log('📊 Flask response status:', flaskResponse.status);
      
      if (!flaskResponse.data || !flaskResponse.data.data) {
        throw new Error('Invalid response from Flask server');
      }
      
      const dataBlock = flaskResponse.data.data;
      flaskPayloadExtras = dataBlock.lab || dataBlock.quality || {};
      const enhancedImagePath = dataBlock.enhanced_image_path;
      processingTime = dataBlock.processing_time_ms;
      
      // Construct full URL for enhanced image
      enhancedImageUrl = enhancedImagePath.startsWith('http') 
        ? enhancedImagePath 
        : `${FLASK_SERVER_URL}${enhancedImagePath}`;
      
      console.log('🖼️ Enhanced image URL:', enhancedImageUrl);
      console.log('⏱️ Processing time:', processingTime, 'ms');
      
      // Clean up temporary file after successful processing
      try {
        fs.unlinkSync(req.file.path);
        console.log('🗑️ Temporary file cleaned up after successful enhancement');
      } catch (cleanupError) {
        console.warn('⚠️ Warning: Could not clean up temp file:', cleanupError.message);
      }
      
    } catch (flaskError) {
      console.error('❌ Flask AI server error:', flaskError.message);
      
      // Clean up temporary file
      try {
        fs.unlinkSync(req.file.path);
        console.log('🗑️ Temporary file cleaned up');
      } catch (cleanupError) {
        console.warn('⚠️ Warning: Could not clean up temp file:', cleanupError.message);
      }
      
      return res.status(500).json({
        status: 'error',
        message: 'Failed to enhance image with AI server',
        details: flaskError.message,
        timestamp: new Date().toISOString()
      });
    }
    
    // Create enhancement record in MongoDB
    const enhancementData = {
      originalImage: `/uploads/${req.file.filename}`,
      enhancedImage: enhancedImageUrl,
      processingTime: processingTime,
      enhancementType: enhancementType || 'standard',
      originalFilename: req.file.originalname,
      enhancedFilename: req.file.filename,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      detectionId: detectionId || null
    };

    console.log('📝 Saving enhancement to DB:', enhancementData);
    const savedEnhancement = await Enhancement.create(enhancementData);
    console.log('✅ Enhancement saved to DB:', savedEnhancement._id);
    
    // Update detection with enhanced image if detection exists
    if (detection) {
      detection.enhancedImage = enhancedImageUrl;
      detection.processingTime = processingTime;
      await detection.save();
      console.log('✅ Detection updated with enhanced image');
    }

    console.log(' Enhancement completed successfully');

    const savedObj = savedEnhancement.toObject ? savedEnhancement.toObject() : savedEnhancement;
    const labMetrics = buildEnhancementLabMetrics(
      processingTime,
      req.file.size,
      {
        ...flaskPayloadExtras,
        psnr: dataBlock.metrics?.psnr,
        ssim: dataBlock.metrics?.ssim,
        uiqm: dataBlock.metrics?.uiqm,
        detections: dataBlock.detections
      }
    );

    res.status(200).json({
      status: 'success',
      data: {
        ...savedObj,
        qualityMetrics: labMetrics.qualityMetrics,
        improvements: labMetrics.improvements,
        detectionResults: labMetrics.detectionResults,
      },
      message: 'Image enhanced successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(' Enhancement error:', error);
    next(error);
  }
};

// @desc    Get enhancement history
// @route   GET /api/v1/enhance/history
// @access  Public
const getEnhancementHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, enhancementType } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter
    const filter = {};
    if (enhancementType) {
      filter.enhancementType = enhancementType;
    }

    // Find enhancements from MongoDB
    const enhancements = await Enhancement.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    const total = await Enhancement.countDocuments(filter);

    console.log(`📊 Retrieved ${enhancements.length} enhancements (total: ${total})`);

    res.status(200).json({
      status: 'success',
      data: enhancements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error fetching enhancement history:', error);
    next(error);
  }
};

// @desc    Delete enhancement
// @route   DELETE /api/v1/enhance/:id
// @access  Public
const deleteEnhancement = async (req, res, next) => {
  try {
    const enhancement = await Enhancement.findById(req.params.id);

    if (!enhancement) {
      return res.status(404).json({
        status: 'error',
        message: 'Enhancement not found',
        timestamp: new Date().toISOString()
      });
    }

    console.log('🗑️ Deleting enhancement:', enhancement._id);

    // If enhancement is linked to a detection, remove the enhanced image from detection
    if (enhancement.detectionId) {
      const detection = await Detection.findOne({ id: enhancement.detectionId });
      if (detection) {
        detection.enhancedImage = undefined;
        detection.processingTime = undefined;
        await detection.save();
        console.log('✅ Detection updated - enhanced image removed');
      }
    }

    // Delete the enhancement record
    await Enhancement.findByIdAndDelete(req.params.id);
    console.log('✅ Enhancement deleted from DB');

    res.status(200).json({
      status: 'success',
      message: 'Enhancement deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error deleting enhancement:', error);
    next(error);
  }
};

module.exports = {
  enhanceImage,
  getEnhancementHistory,
  deleteEnhancement
};