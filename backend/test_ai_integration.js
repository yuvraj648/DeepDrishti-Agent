const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

// Test configuration
const NODE_SERVER_URL = 'http://localhost:5000';
const FLASK_SERVER_URL = 'http://localhost:5001';

async function testAIIntegration() {
  console.log('🧪 Testing Node.js to Flask AI Integration');
  console.log('=' * 60);
  
  try {
    // Test 1: Check Flask server health
    console.log('1. Testing Flask server health...');
    try {
      const flaskHealth = await axios.get(`${FLASK_SERVER_URL}/health`);
      console.log('✅ Flask server is healthy');
      console.log('   Model loaded:', flaskHealth.data.model_loaded);
      console.log('   Device:', flaskHealth.data.device);
    } catch (error) {
      console.log('❌ Flask server is not running');
      console.log('   Please start Flask server on port 5001');
      return;
    }

    // Test 2: Check Node server health
    console.log('\n2. Testing Node server health...');
    try {
      const nodeHealth = await axios.get(`${NODE_SERVER_URL}/api/v1/ai-enhance/health`);
      console.log('✅ Node AI integration is healthy');
      console.log('   AI Server Status:', nodeHealth.data.data.aiServerStatus);
      console.log('   Model Loaded:', nodeHealth.data.data.modelLoaded);
    } catch (error) {
      console.log('❌ Node server is not running');
      console.log('   Please start Node server on port 5000');
      return;
    }

    // Test 3: Test AI enhancement
    console.log('\n3. Testing AI enhancement...');
    
    // Check if test image exists
    const testImagePath = 'test_image.jpg';
    if (!fs.existsSync(testImagePath)) {
      console.log('⚠️  Test image not found');
      console.log('   Please place a test image named "test_image.jpg" in the backend directory');
      console.log('   Creating a simple test image...');
      
      // Create a simple test image (1x1 pixel)
      const sharp = require('sharp');
      try {
        await sharp({
          create: {
            width: 256,
            height: 256,
            channels: 3,
            background: { r: 100, g: 150, b: 200 }
          }
        })
        .png()
        .toFile(testImagePath);
        console.log('✅ Test image created');
      } catch (sharpError) {
        console.log('❌ Could not create test image (install sharp for image creation)');
        return;
      }
    }

    // Perform AI enhancement
    const formData = new FormData();
    formData.append('image', fs.createReadStream(testImagePath), {
      filename: 'test_image.jpg',
      contentType: 'image/jpeg'
    });

    console.log('   Sending enhancement request...');
    const startTime = Date.now();

    const response = await axios.post(`${NODE_SERVER_URL}/api/v1/ai-enhance`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Accept': 'application/json'
      },
      timeout: 60000 // 60 second timeout
    });

    const totalTime = Date.now() - startTime;

    if (response.data.status === 'success') {
      console.log('✅ AI Enhancement successful!');
      console.log('   Processing time:', response.data.data.processingTime, 'ms');
      console.log('   Total time:', totalTime, 'ms');
      console.log('   Enhanced image:', response.data.data.enhancedImage);
      console.log('   Model device:', response.data.data.modelDevice);
      console.log('   Original filename:', response.data.data.originalFilename);
      console.log('   Enhanced filename:', response.data.data.enhancedFilename);
    } else {
      console.log('❌ AI Enhancement failed');
      console.log('   Error:', response.data.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Data:', error.response.data);
    }
  }
}

// Usage instructions
console.log('🚀 AI Integration Test Script');
console.log('Make sure both servers are running:');
console.log('1. Flask AI Server: python app.py (port 5001)');
console.log('2. Node API Server: npm run dev (port 5000)');
console.log('');

testAIIntegration();
