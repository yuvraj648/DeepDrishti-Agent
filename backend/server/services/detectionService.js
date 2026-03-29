const axios = require('axios');
const Feed = require('../models/Feed');
const Alert = require('../models/Alert');
const Detection = require('../models/Detection');
const SystemLog = require('../models/SystemLog');
const StationSettings = require('../models/StationSettings');

const DETECTION_CAMERAS = [
  'CAM_ALPHA_01',
  'CAM_ALPHA_02',
  'CAM_ALPHA_03',
  'CAM_ALPHA_04',
];
const DETECTION_OBJECT_ENUM = [
  'Unidentified Submersible',
  'Bio-Acoustic Anomaly',
  'Unknown Marine Movement',
  'Draft Variance',
];

function cameraForFeed(feed) {
  const n = parseInt(String(feed._id).slice(-2), 16) || 0;
  return DETECTION_CAMERAS[n % DETECTION_CAMERAS.length];
}

function mapToDetectionObjectLabel(detectedObject, threatType) {
  const s = String(detectedObject || '').toLowerCase();
  if (s.includes('sub') || threatType === 'object') {
    return 'Unidentified Submersible';
  }
  if (s.includes('bio') || s.includes('acoustic')) {
    return 'Bio-Acoustic Anomaly';
  }
  if (s.includes('debris') || s.includes('equipment') || s.includes('marine')) {
    return 'Draft Variance';
  }
  return 'Unknown Marine Movement';
}

function generateDetectionId() {
  return (
    'DET-' +
    Date.now() +
    '-' +
    Math.random().toString(36).substr(2, 9).toUpperCase()
  );
}

function isExcludedByStationList(rawDetected, exclusionList) {
  if (!rawDetected || !Array.isArray(exclusionList) || exclusionList.length === 0) {
    return false;
  }
  const lower = String(rawDetected).toLowerCase();
  return exclusionList.some((ex) => {
    const e = String(ex).toLowerCase().trim();
    return e && lower.includes(e);
  });
}

class DetectionService {
  constructor() {
    this.flaskApiUrl = process.env.FLASK_API_URL || 'http://localhost:5001';
    this.detectionIntervals = new Map(); // Store interval references
    this.isRunning = false;
  }

  // Start detection service for all active feeds
  async startDetectionService() {
    if (this.isRunning) {
      console.log('Detection service is already running');
      return;
    }

    console.log('Starting marine detection service...');
    this.isRunning = true;

    try {
      // Get all active feeds
      const activeFeeds = await Feed.findActive();
      
      // Start detection for each active feed
      for (const feed of activeFeeds) {
        if (feed.detectionEnabled) {
          this.startFeedDetection(feed);
        }
      }

      console.log(`Started detection for ${activeFeeds.length} active feeds`);
    } catch (error) {
      console.error('Error starting detection service:', error);
      this.isRunning = false;
    }
  }

  // Start detection for a specific feed
  startFeedDetection(feed) {
    const feedId = feed._id.toString();
    
    // Clear existing interval if any
    if (this.detectionIntervals.has(feedId)) {
      clearInterval(this.detectionIntervals.get(feedId));
    }

    // Set up periodic detection
    const interval = setInterval(async () => {
      await this.processFeedDetection(feed);
    }, feed.detectionInterval || 10000); // Default 10 seconds

    this.detectionIntervals.set(feedId, interval);
    console.log(`Started detection for feed: ${feed.title} (${feed.location})`);
  }

  // Stop detection for a specific feed
  stopFeedDetection(feedId) {
    if (this.detectionIntervals.has(feedId)) {
      clearInterval(this.detectionIntervals.get(feedId));
      this.detectionIntervals.delete(feedId);
      console.log(`Stopped detection for feed: ${feedId}`);
    }
  }

  // Process detection for a single feed
  async processFeedDetection(feed) {
    try {
      // Simulate frame capture (in real implementation, this would capture from video stream)
      const frameData = await this.simulateFrameCapture(feed);
      
      // Send frame to Flask detection API
      const detectionResult = await this.sendToFlaskAPI(frameData);
      
      // Process detection result and create alerts if necessary
      await this.processDetectionResult(feed, detectionResult);
      
      // Update feed with detection info
      await Feed.updateDetectionStats(feed._id, {
        timestamp: new Date(),
        threat: detectionResult.threat,
        confidence: detectionResult.confidence,
        type: detectionResult.type
      });

      console.log(`Detection processed for ${feed.title}: ${detectionResult.threat ? 'THREAT' : 'CLEAR'} (${detectionResult.confidence})`);
      
    } catch (error) {
      console.error(`Error processing detection for feed ${feed.title}:`, error);
    }
  }

  // Simulate frame capture (placeholder implementation)
  async simulateFrameCapture(feed) {
    // In a real implementation, this would:
    // 1. Capture frame from video stream
    // 2. Preprocess the frame
    // 3. Return frame data for API call
    
    return {
      feedId: feed._id,
      timestamp: new Date(),
      frameUrl: feed.url, // In real case, this would be actual frame data
      metadata: {
        location: feed.location,
        sector: feed.sector,
        resolution: '480p', // Sample resolution
        format: 'jpeg'
      }
    };
  }

  // Send frame data to Flask detection API
  async sendToFlaskAPI(frameData) {
    try {
      const response = await axios.post(`${this.flaskApiUrl}/detect`, frameData, {
        timeout: 10000, // 10 second timeout
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      // If Flask API is not available, simulate detection
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        console.warn('Flask API unavailable, simulating detection...');
        return this.simulateDetection(frameData);
      }
      throw error;
    }
  }

  // Simulate detection result (fallback when Flask API is unavailable)
  simulateDetection(frameData) {
    // Generate random detection results for simulation
    const isThreat = Math.random() > 0.85; // 15% chance of threat
    const confidence = isThreat ? 0.7 + Math.random() * 0.3 : Math.random() * 0.5;
    
    const threatTypes = ['intrusion', 'anomaly', 'object', 'threat'];
    const detectedType = isThreat ? threatTypes[Math.floor(Math.random() * threatTypes.length)] : 'normal';
    
    return {
      threat: isThreat,
      confidence: confidence,
      type: detectedType,
      detectedObject: isThreat ? this.generateRandomObject() : null,
      boundingBox: isThreat ? this.generateRandomBoundingBox() : null,
      processingTime: 1.2 + Math.random() * 2.0
    };
  }

  // Generate random detected object for simulation
  generateRandomObject() {
    const objects = ['diver', 'submarine', 'debris', 'marine_life', 'equipment', 'unknown'];
    return objects[Math.floor(Math.random() * objects.length)];
  }

  // Generate random bounding box for simulation
  generateRandomBoundingBox() {
    return {
      x: Math.floor(Math.random() * 200),
      y: Math.floor(Math.random() * 200),
      width: 50 + Math.floor(Math.random() * 100),
      height: 50 + Math.floor(Math.random() * 100)
    };
  }

  // Process detection result and create alerts if necessary
  async processDetectionResult(feed, detectionResult) {
    try {
      let settings;
      try {
        settings = await StationSettings.getSingleton();
      } catch {
        settings = null;
      }
      const threshold =
        settings && typeof settings.confidenceThreshold === 'number'
          ? settings.confidenceThreshold
          : 0.7;

      const objectLabel = mapToDetectionObjectLabel(
        detectionResult.detectedObject,
        detectionResult.type
      );

      if (
        settings?.exclusionList?.length &&
        isExcludedByStationList(detectionResult.detectedObject, settings.exclusionList)
      ) {
        await SystemLog.create({
          severity: 'INFO',
          module: 'AI-DETECTOR',
          message: `Skipped alert (station exclusion list) for raw detection "${detectionResult.detectedObject}" on "${feed.title}"`,
          meta: { feedId: String(feed._id) },
        });
        return;
      }

      // Only create alert if threat detected and confidence is above station threshold
      if (detectionResult.threat && detectionResult.confidence > threshold) {
        const sev =
          detectionResult.confidence >= 0.92
            ? 'critical'
            : detectionResult.confidence >= 0.82
              ? 'high'
              : detectionResult.confidence >= 0.72
                ? 'medium'
                : 'low';

        const alertData = {
          feedId: feed._id,
          type: ['intrusion', 'anomaly', 'object', 'threat'].includes(
            detectionResult.type
          )
            ? detectionResult.type
            : 'threat',
          confidence: detectionResult.confidence,
          severity: sev,
          detectionData: {
            threat: detectionResult.threat,
            detectedObject: detectionResult.detectedObject || objectLabel,
            boundingBox: detectionResult.boundingBox,
            frameTimestamp: new Date(),
            processingTime: detectionResult.processingTime,
          },
          title: this.generateAlertTitle(detectionResult),
          description: this.generateAlertDescription(feed, detectionResult),
        };

        const alert = new Alert(alertData);
        await alert.save();

        await Feed.findByIdAndUpdate(feed._id, { $inc: { activeAlerts: 1 } });

        try {
          await Detection.create({
            id: generateDetectionId(),
            cameraSource: cameraForFeed(feed),
            objectDetected: objectLabel,
            confidence: Math.min(
              100,
              Math.max(0, Math.round(detectionResult.confidence * 100))
            ),
            timestamp: new Date(),
            status: 'investigating',
            aiModel: settings?.aiModel || 'UNet-UW-Detector V1.0',
          });
        } catch (detErr) {
          console.warn('Detection record not saved:', detErr.message);
        }

        await SystemLog.create({
          severity: sev === 'critical' || sev === 'high' ? 'WARN' : 'INFO',
          module: 'AI-DETECTOR',
          message: `Alert raised: ${alert.title} | ${feed.title} | conf ${(detectionResult.confidence * 100).toFixed(1)}%`,
          meta: {
            alertId: String(alert._id),
            feedId: String(feed._id),
            type: alertData.type,
          },
        });

        console.log(`Alert created for feed ${feed.title}: ${alert.title}`);
      }
    } catch (error) {
      console.error('Error processing detection result:', error);
    }
  }

  // Generate alert title based on detection
  generateAlertTitle(detectionResult) {
    const titles = {
      intrusion: 'Security Intrusion Detected',
      anomaly: 'Anomalous Activity Detected',
      object: 'Suspicious Object Detected',
      threat: 'Potential Threat Identified'
    };
    
    return titles[detectionResult.type] || 'Detection Alert';
  }

  // Generate alert description
  generateAlertDescription(feed, detectionResult) {
    let description = `Detection in ${feed.location} sector (${feed.sector}). `;
    description += `Confidence: ${(detectionResult.confidence * 100).toFixed(1)}%. `;
    
    if (detectionResult.detectedObject) {
      description += `Detected: ${detectionResult.detectedObject}. `;
    }
    
    if (detectionResult.boundingBox) {
      description += `Location in frame: (${detectionResult.boundingBox.x}, ${detectionResult.boundingBox.y}).`;
    }
    
    return description;
  }

  // Stop all detection services
  stopDetectionService() {
    console.log('Stopping marine detection service...');
    
    // Clear all intervals
    for (const [feedId, interval] of this.detectionIntervals) {
      clearInterval(interval);
    }
    
    this.detectionIntervals.clear();
    this.isRunning = false;
    
    console.log('Detection service stopped');
  }

  // Restart detection service
  async restartDetectionService() {
    this.stopDetectionService();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    await this.startDetectionService();
  }

  // Get service status
  getServiceStatus() {
    return {
      isRunning: this.isRunning,
      activeFeeds: this.detectionIntervals.size,
      flaskApiUrl: this.flaskApiUrl
    };
  }

  // Add new feed to detection service
  async addFeedToDetection(feedId) {
    try {
      const feed = await Feed.findById(feedId);
      if (feed && feed.status === 'active' && feed.detectionEnabled) {
        this.startFeedDetection(feed);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error adding feed to detection:', error);
      return false;
    }
  }

  // Remove feed from detection service
  removeFeedFromDetection(feedId) {
    this.stopFeedDetection(feedId);
  }
}

// Create singleton instance
const detectionService = new DetectionService();

module.exports = detectionService;
