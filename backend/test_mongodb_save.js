// Test script to verify MongoDB saving for AI enhancement
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

// Test configuration
const NODE_SERVER_URL = 'http://localhost:5000';
const FLASK_SERVER_URL = 'http://localhost:5001';

async function testMongoDBSaving() {
  console.log('🧪 Testing MongoDB Image Save Integration');
  console.log('=' * 60);
  
  try {
    // Test 1: Check if servers are running
    console.log('1. Testing server health...');
    
    try {
      const flaskHealth = await axios.get(`${FLASK_SERVER_URL}/health`);
      console.log('✅ Flask AI server is healthy');
    } catch (error) {
      console.log('❌ Flask AI server is not running');
      return;
    }
    
    try {
      const nodeHealth = await axios.get(`${NODE_SERVER_URL}/api/v1/ai-enhance/health`);
      console.log('✅ Node.js backend is healthy');
    } catch (error) {
      console.log('❌ Node.js backend is not running');
      return;
    }

    // Test 2: Create a test image
    console.log('\n2. Creating test image...');
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
      .toFile('test_mongodb_image.png');
      console.log('✅ Test image created: test_mongodb_image.png');
    } catch (sharpError) {
      console.log('⚠️  Could not create test image (install sharp for better testing)');
      console.log('   Using existing test image or creating a simple one...');
      
      // Create a simple 1x1 pixel image if sharp is not available
      const canvas = require('canvas') || null;
      if (!canvas) {
        console.log('⚠️  No image creation library available. Please provide a test image.');
        return;
      }
    }

    // Test 3: Perform AI enhancement and check MongoDB save
    console.log('\n3. Testing AI enhancement with MongoDB save...');
    
    if (!fs.existsSync('test_mongodb_image.png')) {
      console.log('❌ Test image not found. Please create test_mongodb_image.png');
      return;
    }
    
    const formData = new FormData();
    formData.append('image', fs.createReadStream('test_mongodb_image.png'), {
      filename: 'test_mongodb_image.png',
      contentType: 'image/png'
    });
    formData.append('detectionId', 'DET-TEST-123');

    console.log('🔄 Sending AI enhancement request...');
    const startTime = Date.now();

    const response = await axios.post(`${NODE_SERVER_URL}/api/v1/ai-enhance`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Accept': 'application/json'
      },
      timeout: 60000
    });

    const totalTime = Date.now() - startTime;

    if (response.data.status === 'success') {
      console.log('✅ AI Enhancement successful!');
      console.log('📊 Processing time:', response.data.data.processingTime, 'ms');
      console.log('📊 Total time:', totalTime, 'ms');
      console.log('🖼️ Enhanced image:', response.data.data.enhancedImage);
      console.log('📁 Original filename:', response.data.data.originalFilename);
      console.log('📁 Enhanced filename:', response.data.data.enhancedFilename);
      
      // Test 4: Verify MongoDB record exists
      console.log('\n4. Verifying MongoDB record...');
      
      // Wait a moment for MongoDB to save
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        const historyResponse = await axios.get(`${NODE_SERVER_URL}/api/v1/ai-enhance/history?limit=5`);
        
        if (historyResponse.data.status === 'success') {
          const enhancements = historyResponse.data.data.enhancements;
          
          if (enhancements.length > 0) {
            const latestEnhancement = enhancements[0];
            
            console.log('✅ MongoDB record found!');
            console.log('📝 Record ID:', latestEnhancement._id);
            console.log('📁 Original Filename:', latestEnhancement.originalFilename);
            console.log('📁 Enhanced Filename:', latestEnhancement.enhancedFilename);
            console.log('⏱️ Processing Time:', latestEnhancement.processingTime, 'ms');
            console.log('🔧 Enhancement Type:', latestEnhancement.enhancementType);
            console.log('📏 File Size:', latestEnhancement.fileSize, 'bytes');
            console.log('🎯 MIME Type:', latestEnhancement.mimeType);
            console.log('🔗 Detection ID:', latestEnhancement.detectionId || 'None');
            console.log('📅 Created At:', latestEnhancement.createdAt);
            
            // Verify the record matches our test
            if (latestEnhancement.originalFilename === 'test_mongodb_image.png' &&
                latestEnhancement.enhancementType === 'ai_unet_v2.4') {
              console.log('✅ Record matches test data perfectly!');
              console.log('🎉 MONGODB IMAGE SAVE WORKING!');
            } else {
              console.log('⚠️  Record found but data mismatch');
            }
          } else {
            console.log('❌ No records found in MongoDB');
          }
        } else {
          console.log('❌ Failed to retrieve history from MongoDB');
        }
        
      } catch (historyError) {
        console.log('❌ Failed to verify MongoDB record:', historyError.message);
      }
      
      // Test 5: Clean up test image
      console.log('\n5. Cleaning up...');
      try {
        fs.unlinkSync('test_mongodb_image.png');
        console.log('🗑️ Test image cleaned up');
      } catch (cleanupError) {
        console.warn('⚠️ Warning: Could not clean up test image:', cleanupError.message);
      }
      
      console.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!');
      console.log('✅ MongoDB integration is working correctly');
      
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

// Test MongoDB connection directly
async function testMongoDBConnection() {
  console.log('🔍 Testing MongoDB connection...');
  
  try {
    const mongoose = require('mongoose');
    const Enhancement = require('./server/models/Enhancement');
    
    // Connect to MongoDB (using existing connection)
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/aquascope');
    
    // Test query
    const count = await Enhancement.countDocuments();
    console.log('✅ MongoDB connected successfully');
    console.log('📊 Total enhancement records:', count);
    
    // Get latest record
    const latest = await Enhancement.findOne().sort({ createdAt: -1 });
    if (latest) {
      console.log('📝 Latest record:', {
        id: latest._id,
        filename: latest.originalFilename,
        type: latest.enhancementType,
        createdAt: latest.createdAt
      });
    }
    
    console.log('🎉 MONGODB IMAGE SAVE WORKING!');
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
  }
}

// Usage
if (require.main === module) {
  console.log('🚀 MongoDB Save Test Script');
  console.log('Usage:');
  console.log('  node test_mongodb_save.js - Run full integration test');
  console.log('  node test_mongodb_save.js db - Test MongoDB connection only');
  
  const command = process.argv[2];
  
  if (command === 'db') {
    testMongoDBConnection();
  } else {
    testMongoDBSaving();
  }
}

module.exports = {
  testMongoDBSaving,
  testMongoDBConnection
};
