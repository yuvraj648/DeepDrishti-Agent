const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const router = express.Router();

// ==============================
// MULTER CONFIG
// ==============================
const upload = multer({
  dest: 'test-uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files allowed'), false);
    }
  }
});

// ==============================
// TEST ENHANCEMENT ROUTE
// ==============================
router.post('/test-enhancement', upload.single('file'), async (req, res) => {
  try {
    console.log("🚀 TEST ROUTE STARTED");

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded (use key = file)"
      });
    }

    console.log("✅ File received:", req.file.originalname);

    const FLASK_URL = "http://localhost:5001";

    // Check Flask
    try {
      const health = await axios.get(`${FLASK_URL}/health`);
      console.log("✅ Flask OK:", health.data);
    } catch (err) {
      return res.status(503).json({
        success: false,
        error: "Flask not running",
        suggestion: "Run python app.py"
      });
    }

    // Send file
    const formData = new FormData();
    formData.append(
      "image",
      fs.createReadStream(req.file.path),
      req.file.originalname
    );

    console.log("📤 Sending to Flask...");

    const flaskResponse = await axios.post(
      `${FLASK_URL}/enhance`,
      formData,
      {
        headers: formData.getHeaders(),
        timeout: 60000
      }
    );

    console.log("🔥 FULL FLASK RESPONSE:", flaskResponse.data);

    // ✅ FIXED RESPONSE HANDLING
    if (!flaskResponse.data || !flaskResponse.data.enhancedImage) {
      throw new Error("Invalid Flask response structure");
    }

    // Cleanup
    try { fs.unlinkSync(req.file.path); } catch {}

    return res.status(200).json({
      success: true,
      enhancedImage: `http://localhost:5001${flaskResponse.data.enhancedImage}`,
      processingTime: flaskResponse.data.processingTime,
      message: "Integration working perfectly 🚀"
    });

  } catch (error) {
    console.log("❌ ERROR:", error.message);

    if (req.file && req.file.path) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }

    return res.status(500).json({
      success: false,
      error: "Integration failed",
      details: error.message
    });
  }
});

// ==============================
// HEALTH CHECK
// ==============================
router.get('/test-health', async (req, res) => {
  try {
    const FLASK_URL = "http://localhost:5001";

    let flaskStatus = "DOWN";

    try {
      await axios.get(`${FLASK_URL}/health`);
      flaskStatus = "UP";
    } catch {}

    return res.json({
      node: "UP",
      flask: flaskStatus
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
});

module.exports = router;