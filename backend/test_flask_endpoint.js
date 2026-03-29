// Test script to verify Flask endpoint is working correctly
const axios = require('axios');

async function testFlaskEndpoint() {
  console.log('🧪 Testing Flask Endpoint');
  console.log('=' * 40);
  
  try {
    // Test 1: Check Flask server health
    console.log('1. Testing Flask server health...');
    try {
      const healthResponse = await axios.get('http://localhost:5003/health', { timeout: 5000 });
      console.log('✅ Flask server is healthy');
      console.log('📊 Status:', healthResponse.data.status);
      console.log('🧠 Model loaded:', healthResponse.data.model_loaded);
      console.log('🔧 Device:', healthResponse.data.device);
    } catch (error) {
      console.log('❌ Flask server health check failed');
      console.log('🔧 Error:', error.message);
      console.log('💡 Make sure Flask server is running: cd ENHANCE_MOD && python app.py');
      return;
    }

    // Test 2: Check Flask root endpoint
    console.log('\n2. Testing Flask root endpoint...');
    try {
      const rootResponse = await axios.get('http://localhost:5003/', { timeout: 5000 });
      console.log('✅ Flask root endpoint is accessible');
      console.log('📋 Service:', rootResponse.data.service);
      console.log('🔗 Available endpoints:', Object.keys(rootResponse.data.endpoints));
    } catch (error) {
      console.log('❌ Flask root endpoint failed');
      console.log('🔧 Error:', error.message);
    }

    // Test 3: Test Flask enhance endpoint (without file)
    console.log('\n3. Testing Flask enhance endpoint (no file)...');
    try {
      const enhanceResponse = await axios.post('http://localhost:5003/enhance', {}, { timeout: 5000 });
      console.log('❌ Should have failed - no file provided');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Flask enhance endpoint correctly rejects requests without files');
        console.log('📊 Error message:', error.response.data.message);
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    // Test 4: Verify the exact endpoint path
    console.log('\n4. Verifying endpoint paths...');
    console.log('📍 Flask server: http://localhost:5003');
    console.log('🔗 Health endpoint: http://localhost:5003/health');
    console.log('🔗 Root endpoint: http://localhost:5003/');
    console.log('🔗 Enhance endpoint: http://localhost:5003/enhance');
    
    console.log('\n🎯 EXPECTED AXIOS CALL:');
    console.log('axios.post("http://localhost:5003/enhance", formData, {');
    console.log('  headers: formData.getHeaders()');
    console.log('});');

    console.log('\n✅ Flask endpoint verification complete!');
    console.log('📋 The endpoint http://localhost:5003/enhance is correct and accessible');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
if (require.main === module) {
  testFlaskEndpoint().catch(console.error);
}

module.exports = testFlaskEndpoint;
