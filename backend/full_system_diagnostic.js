// Full System Diagnostic Script for AquaScope
// Tests: Frontend → Node.js → Flask → MongoDB → Response Flow

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configuration
const SERVICES = {
  FRONTEND: 'http://localhost:5173',
  NODE_API: 'http://localhost:5000',
  FLASK_AI: 'http://localhost:5001',
  MONGODB: process.env.MONGODB_URI || 'mongodb://localhost:27017/aquascope'
};

class SystemDiagnostic {
  constructor() {
    this.results = {
      frontend: { status: 'pending', details: null },
      nodeApi: { status: 'pending', details: null },
      flaskAi: { status: 'pending', details: null },
      mongodb: { status: 'pending', details: null },
      integration: { status: 'pending', details: null }
    };
  }

  async runFullDiagnostic() {
    console.log('🔍 === AQUASCOPE FULL SYSTEM DIAGNOSTIC ===');
    console.log('⏰ Started at:', new Date().toISOString());
    console.log('');

    try {
      // Test 1: Frontend Accessibility
      await this.testFrontend();
      
      // Test 2: Node.js API Health
      await this.testNodeApi();
      
      // Test 3: Flask AI Server Health
      await this.testFlaskAi();
      
      // Test 4: MongoDB Connection
      await this.testMongoDB();
      
      // Test 5: Full Integration Test
      await this.testFullIntegration();
      
      // Generate Report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Diagnostic failed:', error.message);
      this.generateReport();
    }
  }

  async testFrontend() {
    console.log('🌐 TEST 1: Frontend Accessibility');
    console.log('📍 Target:', SERVICES.FRONTEND);
    
    try {
      const response = await axios.get(SERVICES.FRONTEND, {
        timeout: 10000,
        validateStatus: (status) => status < 500
      });
      
      this.results.frontend.status = 'healthy';
      this.results.frontend.details = {
        status: response.status,
        accessible: true,
        contentType: response.headers['content-type'],
        timestamp: new Date().toISOString()
      };
      
      console.log('✅ Frontend is accessible');
      console.log('📊 Status:', response.status);
      
    } catch (error) {
      this.results.frontend.status = 'unhealthy';
      this.results.frontend.details = {
        accessible: false,
        error: error.message,
        suggestion: 'Make sure React dev server is running on port 5173'
      };
      
      console.log('❌ Frontend is not accessible');
      console.log('🔧 Error:', error.message);
      console.log('💡 Suggestion: Start frontend with npm run dev');
    }
    
    console.log('');
  }

  async testNodeApi() {
    console.log('🔧 TEST 2: Node.js API Health');
    console.log('📍 Target:', SERVICES.NODE_API);
    
    try {
      // Test basic health
      const healthResponse = await axios.get(`${SERVICES.NODE_API}/api/v1/health`, {
        timeout: 10000
      });
      
      // Test test-health endpoint
      const testHealthResponse = await axios.get(`${SERVICES.NODE_API}/api/v1/test-health`, {
        timeout: 10000
      });
      
      this.results.nodeApi.status = 'healthy';
      this.results.nodeApi.details = {
        basicHealth: healthResponse.data,
        testHealth: testHealthResponse.data,
        accessible: true,
        timestamp: new Date().toISOString()
      };
      
      console.log('✅ Node.js API is healthy');
      console.log('📊 Services status:');
      Object.entries(testHealthResponse.data.services).forEach(([name, service]) => {
        console.log(`   ${service.status === 'healthy' ? '✅' : '❌'} ${name}: ${service.status}`);
      });
      
    } catch (error) {
      this.results.nodeApi.status = 'unhealthy';
      this.results.nodeApi.details = {
        accessible: false,
        error: error.message,
        suggestion: 'Make sure Node.js server is running on port 5000'
      };
      
      console.log('❌ Node.js API is not accessible');
      console.log('🔧 Error:', error.message);
      console.log('💡 Suggestion: Start backend with npm run dev');
    }
    
    console.log('');
  }

  async testFlaskAi() {
    console.log('🤖 TEST 3: Flask AI Server Health');
    console.log('📍 Target:', SERVICES.FLASK_AI);
    
    try {
      const response = await axios.get(`${SERVICES.FLASK_AI}/health`, {
        timeout: 10000
      });
      
      this.results.flaskAi.status = 'healthy';
      this.results.flaskAi.details = {
        status: response.data.status,
        modelLoaded: response.data.model_loaded,
        device: response.data.device,
        accessible: true,
        timestamp: new Date().toISOString()
      };
      
      console.log('✅ Flask AI server is healthy');
      console.log('📊 Status:', response.data.status);
      console.log('🧠 Model loaded:', response.data.model_loaded);
      console.log('🔧 Device:', response.data.device);
      
    } catch (error) {
      this.results.flaskAi.status = 'unhealthy';
      this.results.flaskAi.details = {
        accessible: false,
        error: error.message,
        suggestion: 'Make sure Flask AI server is running on port 5001'
      };
      
      console.log('❌ Flask AI server is not accessible');
      console.log('🔧 Error:', error.message);
      console.log('💡 Suggestion: Start Flask server with python app.py');
    }
    
    console.log('');
  }

  async testMongoDB() {
    console.log('🗄️ TEST 4: MongoDB Connection');
    console.log('📍 Target:', SERVICES.MONGODB);
    
    try {
      const mongoose = require('mongoose');
      
      // Connect if not already connected
      if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(SERVICES.MONGODB);
      }
      
      // Test database operations
      const Enhancement = require('./server/models/Enhancement');
      const count = await Enhancement.countDocuments();
      const latest = await Enhancement.findOne().sort({ createdAt: -1 });
      
      this.results.mongodb.status = 'healthy';
      this.results.mongodb.details = {
        connected: true,
        readyState: mongoose.connection.readyState,
        database: mongoose.connection.name,
        host: mongoose.connection.host,
        recordCount: count,
        latestRecord: latest ? {
          id: latest._id,
          filename: latest.originalFilename,
          type: latest.enhancementType,
          createdAt: latest.createdAt
        } : null,
        timestamp: new Date().toISOString()
      };
      
      console.log('✅ MongoDB connection is healthy');
      console.log('📊 Database:', mongoose.connection.name);
      console.log('📝 Enhancement records:', count);
      if (latest) {
        console.log('📅 Latest record:', latest.originalFilename, 'at', latest.createdAt);
      }
      
    } catch (error) {
      this.results.mongodb.status = 'unhealthy';
      this.results.mongodb.details = {
        connected: false,
        error: error.message,
        suggestion: 'Check MongoDB connection string and ensure MongoDB is running'
      };
      
      console.log('❌ MongoDB connection failed');
      console.log('🔧 Error:', error.message);
      console.log('💡 Suggestion: Check MongoDB connection and ensure it\'s running');
    }
    
    console.log('');
  }

  async testFullIntegration() {
    console.log('🔄 TEST 5: Full Integration Test');
    console.log('📋 Testing complete flow: File Upload → Node → Flask → Response');
    
    try {
      // Create test image if it doesn't exist
      const testImagePath = 'diagnostic_test_image.png';
      
      if (!fs.existsSync(testImagePath)) {
        console.log('📸 Creating test image...');
        await this.createTestImage(testImagePath);
      }
      
      // Perform integration test
      console.log('🚀 Sending integration test request...');
      
      const formData = new FormData();
      formData.append('file', fs.createReadStream(testImagePath), {
        filename: 'diagnostic_test_image.png',
        contentType: 'image/png'
      });
      
      const startTime = Date.now();
      
      const response = await axios.post(`${SERVICES.NODE_API}/api/v1/test-enhancement`, formData, {
        headers: {
          ...formData.getHeaders(),
          'Accept': 'application/json'
        },
        timeout: 120000, // 2 minute timeout
        maxContentLength: 50 * 1024 * 1024
      });
      
      const totalTime = Date.now() - startTime;
      
      if (response.data.success) {
        this.results.integration.status = 'healthy';
        this.results.integration.details = {
          success: true,
          enhancedImage: response.data.data.enhancedImage,
          processingTime: response.data.data.processingTime,
          totalRequestTime: response.data.data.totalRequestTime,
          originalFilename: response.data.data.originalFilename,
          modelDevice: response.data.data.modelDevice,
          diagnostics: response.data.diagnostics,
          timestamp: new Date().toISOString()
        };
        
        console.log('✅ Full integration test PASSED');
        console.log('⏱️ Total time:', totalTime, 'ms');
        console.log('🖼️ Enhanced image:', response.data.data.enhancedImage);
        console.log('⚡ Processing time:', response.data.data.processingTime, 'ms');
        console.log('🎯 Model device:', response.data.data.modelDevice);
        
        // Verify enhanced image accessibility
        try {
          const imageResponse = await axios.head(response.data.data.enhancedImage, {
            timeout: 10000
          });
          console.log('✅ Enhanced image is accessible');
          console.log('📏 Image size:', imageResponse.headers['content-length'], 'bytes');
        } catch (imageError) {
          console.log('⚠️ Warning: Enhanced image not accessible:', imageError.message);
        }
        
      } else {
        throw new Error(response.data.error || 'Integration test failed');
      }
      
      // Clean up test image
      try {
        fs.unlinkSync(testImagePath);
        console.log('🗑️ Test image cleaned up');
      } catch (cleanupError) {
        console.warn('⚠️ Warning: Could not clean up test image:', cleanupError.message);
      }
      
    } catch (error) {
      this.results.integration.status = 'unhealthy';
      this.results.integration.details = {
        success: false,
        error: error.message,
        suggestion: 'Check all services are running and CORS is properly configured'
      };
      
      console.log('❌ Full integration test FAILED');
      console.log('🔧 Error:', error.message);
      
      if (error.response) {
        console.log('📊 Response status:', error.response.status);
        console.log('📋 Response data:', error.response.data);
      }
    }
    
    console.log('');
  }

  async createTestImage(filePath) {
    // Create a simple 256x256 PNG test image
    try {
      const sharp = require('sharp');
      
      await sharp({
        create: {
          width: 256,
          height: 256,
          channels: 3,
          background: { r: 74, g: 144, b: 226 } // AquaScope blue
        }
      })
      .png()
      .toFile(filePath);
      
      console.log('✅ Test image created:', filePath);
      
    } catch (sharpError) {
      // Fallback: create a minimal test file
      const buffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64'
      );
      fs.writeFileSync(filePath, buffer);
      console.log('✅ Minimal test image created:', filePath);
    }
  }

  generateReport() {
    console.log('📊 === DIAGNOSTIC REPORT ===');
    console.log('⏰ Completed at:', new Date().toISOString());
    console.log('');

    const overallStatus = Object.values(this.results).every(r => r.status === 'healthy') 
      ? 'HEALTHY' 
      : Object.values(this.results).some(r => r.status === 'healthy') 
        ? 'PARTIAL' 
        : 'UNHEALTHY';

    console.log('🎯 OVERALL STATUS:', overallStatus);
    console.log('');

    Object.entries(this.results).forEach(([service, result]) => {
      const icon = result.status === 'healthy' ? '✅' : result.status === 'unhealthy' ? '❌' : '⏳';
      console.log(`${icon} ${service.toUpperCase()}: ${result.status.toUpperCase()}`);
      
      if (result.status === 'unhealthy' && result.details?.suggestion) {
        console.log(`   💡 ${result.details.suggestion}`);
      }
    });

    console.log('');

    if (overallStatus === 'HEALTHY') {
      console.log('🎉 ALL SYSTEMS ARE GO! AquaScope is fully operational.');
      console.log('📋 You can now use the application normally.');
    } else if (overallStatus === 'PARTIAL') {
      console.log('⚠️ SOME SYSTEMS NEED ATTENTION. Check the failed components above.');
    } else {
      console.log('🚨 CRITICAL ISSUES FOUND. Multiple systems need attention.');
    }

    console.log('');
    console.log('🔗 Quick Test Commands:');
    console.log('📱 Frontend: curl -I http://localhost:5173');
    console.log('🔧 Node API: curl http://localhost:5000/api/v1/health');
    console.log('🤖 Flask AI: curl http://localhost:5001/health');
    console.log('🧪 Full Test: POST http://localhost:5000/api/v1/test-enhance (with file)');
    
    console.log('');
    console.log('📋 Postman Test Instructions:');
    console.log('1. Method: POST');
    console.log('2. URL: http://localhost:5000/api/v1/test-enhancement');
    console.log('3. Body → form-data → key: file → value: [upload image]');
    console.log('4. Expected: {"success": true, "enhancedImage": "...", "processingTime": ...}');
  }
}

// Run diagnostic if called directly
if (require.main === module) {
  const diagnostic = new SystemDiagnostic();
  diagnostic.runFullDiagnostic().catch(console.error);
}

module.exports = SystemDiagnostic;
