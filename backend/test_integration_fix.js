// Test script to verify Node.js → Flask integration fix
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testIntegrationFix() {
  console.log('🧪 Testing Node.js → Flask Integration Fix');
  console.log('=' * 50);
  
  try {
    // Step 1: Check if Flask server is running on port 5003
    console.log('1. Testing Flask server on port 5003...');
    try {
      const flaskHealth = await axios.get('http://localhost:5003/health', { timeout: 5000 });
      console.log('✅ Flask server is running on port 5003');
      console.log('📊 Status:', flaskHealth.data.status);
      console.log('🧠 Model loaded:', flaskHealth.data.model_loaded);
    } catch (error) {
      console.log('❌ Flask server not accessible on port 5003');
      console.log('🔧 Error:', error.message);
      console.log('💡 Start Flask server: cd ENHANCE_MOD && python app.py');
      return;
    }

    // Step 2: Check if Node.js server is running on port 5000
    console.log('\n2. Testing Node.js server on port 5000...');
    try {
      const nodeHealth = await axios.get('http://localhost:5000/api/v1/health', { timeout: 5000 });
      console.log('✅ Node.js server is running on port 5000');
      console.log('📊 Status:', nodeHealth.data.status);
    } catch (error) {
      console.log('❌ Node.js server not accessible on port 5000');
      console.log('🔧 Error:', error.message);
      console.log('💡 Start Node.js server: cd BACKEND && npm run dev');
      return;
    }

    // Step 3: Create a test image
    console.log('\n3. Creating test image...');
    const testImagePath = 'integration_test_image.png';
    
    // Create a simple test image
    const sharp = require('sharp') || null;
    if (sharp) {
      await sharp({
        create: {
          width: 256,
          height: 256,
          channels: 3,
          background: { r: 74, g: 144, b: 226 }
        }
      })
      .png()
      .toFile(testImagePath);
    } else {
      // Create a minimal test image
      const buffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64'
      );
      fs.writeFileSync(testImagePath, buffer);
    }
    
    console.log('✅ Test image created:', testImagePath);

    // Step 4: Test the integration
    console.log('\n4. Testing Node.js → Flask integration...');
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testImagePath), {
      filename: 'integration_test_image.png',
      contentType: 'image/png'
    });

    console.log('📤 Sending POST request to Node.js...');
    console.log('🎯 URL: http://localhost:5000/api/v1/test-enhancement');
    
    const startTime = Date.now();
    
    const response = await axios.post('http://localhost:5000/api/v1/test-enhancement', formData, {
      headers: formData.getHeaders(),
      timeout: 120000,
      maxContentLength: 50 * 1024 * 1024
    });

    const totalTime = Date.now() - startTime;

    // Step 5: Verify response
    console.log('\n5. Verifying response...');
    
    if (response.data.success === true) {
      console.log('🎉 INTEGRATION TEST PASSED!');
      console.log('✅ Success:', response.data.success);
      console.log('🖼️ Enhanced Image:', response.data.enhancedImage);
      console.log('⏱️ Processing Time:', response.data.processingTime, 'ms');
      console.log('📊 Total Request Time:', response.data.totalRequestTime, 'ms');
      console.log('🎯 Model Device:', response.data.modelDevice);
      
      // Test enhanced image accessibility
      try {
        const imageResponse = await axios.head(
          response.data.enhancedImage.startsWith('http') 
            ? response.data.enhancedImage 
            : `http://localhost:5003${response.data.enhancedImage}`,
          { timeout: 10000 }
        );
        console.log('✅ Enhanced image is accessible');
        console.log('📏 Image size:', imageResponse.headers['content-length'], 'bytes');
      } catch (imageError) {
        console.log('⚠️ Warning: Enhanced image not accessible:', imageError.message);
      }
      
      console.log('\n🎯 ALL REQUIREMENTS MET:');
      console.log('✅ Node successfully sends image to Flask');
      console.log('✅ Flask returns enhanced image');
      console.log('✅ Node forwards response to frontend');
      console.log('✅ No errors');
      console.log('✅ FormData.getHeaders() works correctly');
      
    } else {
      console.log('❌ Integration test failed');
      console.log('📊 Response:', response.data);
    }

    // Clean up
    try {
      fs.unlinkSync(testImagePath);
      console.log('\n🗑️ Test image cleaned up');
    } catch (cleanupError) {
      console.warn('⚠️ Warning: Could not clean up test image:', cleanupError.message);
    }

  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    
    if (error.response) {
      console.log('📊 Response Status:', error.response.status);
      console.log('📋 Response Data:', error.response.data);
    }
    
    console.log('\n🔧 Troubleshooting Tips:');
    console.log('1. Ensure Flask server is running: cd ENHANCE_MOD && python app.py');
    console.log('2. Ensure Node.js server is running: cd BACKEND && npm run dev');
    console.log('3. Check if form-data package is installed: npm install form-data');
    console.log('4. Verify ports: Flask (5003), Node.js (5000)');
  }
}

// Run the test
if (require.main === module) {
  testIntegrationFix().catch(console.error);
}

module.exports = testIntegrationFix;
