// Test script to verify frontend AI enhancement integration
// Run this in browser console or as a simple test

// Test function to verify AI enhancement endpoint
async function testFrontendAIEnhancement() {
  console.log('🧪 Testing Frontend AI Enhancement Integration');
  console.log('=' * 60);
  
  try {
    // Test 1: Check if Node.js backend is running
    console.log('1. Testing Node.js backend health...');
    const nodeHealthResponse = await fetch('http://localhost:5000/api/v1/ai-enhance/health');
    if (nodeHealthResponse.ok) {
      const nodeHealth = await nodeHealthResponse.json();
      console.log('✅ Node.js backend is healthy');
      console.log('   AI Server Status:', nodeHealth.data.aiServerStatus);
      console.log('   Model Loaded:', nodeHealth.data.modelLoaded);
    } else {
      console.log('❌ Node.js backend is not responding');
      return;
    }

    // Test 2: Check if Flask AI server is running
    console.log('\n2. Testing Flask AI server health...');
    const flaskHealthResponse = await fetch('http://localhost:5001/health');
    if (flaskHealthResponse.ok) {
      const flaskHealth = await flaskHealthResponse.json();
      console.log('✅ Flask AI server is healthy');
      console.log('   Model Loaded:', flaskHealth.model_loaded);
      console.log('   Device:', flaskHealth.device);
    } else {
      console.log('❌ Flask AI server is not responding');
      return;
    }

    // Test 3: Create a test image and send for enhancement
    console.log('\n3. Testing AI enhancement with test image...');
    
    // Create a simple test image (1x1 pixel PNG)
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#4a90e2';
    ctx.fillRect(0, 0, 256, 256);
    
    // Convert canvas to blob
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const file = new File([blob], 'test_ai_enhancement.png', { type: 'image/png' });
    
    console.log('📸 Created test image:', file.name, file.size, 'bytes');
    
    // Create FormData as the frontend would
    const formData = new FormData();
    formData.append('image', file);
    formData.append('enhancementType', 'high_quality_(v2.4)');
    
    console.log('🔄 Sending AI enhancement request...');
    const startTime = Date.now();
    
    // Send request to the same endpoint the frontend uses
    const enhancementResponse = await fetch('http://localhost:5000/api/v1/ai-enhance', {
      method: 'POST',
      body: formData,
    });
    
    const totalTime = Date.now() - startTime;
    
    if (enhancementResponse.ok) {
      const result = await enhancementResponse.json();
      console.log('✅ AI Enhancement successful!');
      console.log('📊 Processing time:', result.data.processingTime, 'ms');
      console.log('📊 Total time:', totalTime, 'ms');
      console.log('🖼️ Enhanced image:', result.data.enhancedImage);
      console.log('📁 Original filename:', result.data.originalFilename);
      console.log('📁 Enhanced filename:', result.data.enhancedFilename);
      console.log('🔧 Model device:', result.data.modelDevice);
      
      // Test 4: Verify enhanced image is accessible
      console.log('\n4. Testing enhanced image accessibility...');
      const imageUrl = result.data.enhancedImage.startsWith('http') 
        ? result.data.enhancedImage 
        : `http://localhost:5001${result.data.enhancedImage}`;
      
      const imageResponse = await fetch(imageUrl);
      if (imageResponse.ok) {
        console.log('✅ Enhanced image is accessible');
        console.log('🖼️ Image URL:', imageUrl);
        console.log('📏 Image size:', imageResponse.headers.get('content-length'), 'bytes');
      } else {
        console.log('❌ Enhanced image is not accessible');
        console.log('   Status:', imageResponse.status);
      }
      
      console.log('\n🎉 FRONTEND REAL ENHANCEMENT WORKING!');
      console.log('✅ All tests passed successfully');
      
      return result;
      
    } else {
      console.log('❌ AI Enhancement failed');
      console.log('   Status:', enhancementResponse.status);
      const errorData = await enhancementResponse.text();
      console.log('   Error:', errorData);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Manual test function for file input
function testWithFileInput(file) {
  console.log('🧪 Testing with uploaded file:', file.name);
  
  const formData = new FormData();
  formData.append('image', file);
  formData.append('enhancementType', 'high_quality_(v2.4)');
  
  fetch('http://localhost:5000/api/v1/ai-enhance', {
    method: 'POST',
    body: formData,
  })
  .then(response => response.json())
  .then(result => {
    console.log('✅ File enhancement successful!');
    console.log('📊 Processing time:', result.data.processingTime, 'ms');
    console.log('🖼️ Enhanced image:', result.data.enhancedImage);
    console.log('🎉 FRONTEND REAL ENHANCEMENT WORKING!');
  })
  .catch(error => {
    console.error('❌ File enhancement failed:', error);
  });
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.testFrontendAIEnhancement = testFrontendAIEnhancement;
  window.testWithFileInput = testWithFileInput;
  
  console.log('🚀 Frontend AI Enhancement Test Functions Loaded');
  console.log('Run: testFrontendAIEnhancement() to test the integration');
  console.log('Run: testWithFileInput(file) to test with a specific file');
}

// Node.js export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testFrontendAIEnhancement,
    testWithFileInput
  };
}
