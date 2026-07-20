const mongoose = require('mongoose');

const feedSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  
  // Video URL (YouTube embed or stream URL)
  url: {
    type: String,
    required: true,
    trim: true
  },
  
  // Feed Status
  status: {
    type: String,
    required: true,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  },
  
  // Location Information
  location: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  
  // Sector Information
  sector: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  
  // Feed Configuration
  detectionEnabled: {
    type: Boolean,
    default: true
  },
  
  detectionInterval: {
    type: Number,
    default: 10000, // 10 seconds in milliseconds
    min: 5000, // 5 seconds minimum
    max: 60000 // 60 seconds maximum
  },
  
  // Last Detection Info
  lastDetection: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  
  // Statistics
  totalDetections: {
    type: Number,
    default: 0
  },
  
  activeAlerts: {
    type: Number,
    default: 0
  },
  
  // Metadata
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },

  // Operator ROI / session hints (surveillance UI)
  surveillance: {
    markedRegion: {
      x: { type: Number },
      y: { type: Number },
      w: { type: Number },
      h: { type: Number },
    },
    markedRegionUpdatedAt: { type: Date },
    lastCaptureAt: { type: Date },
    lastEnhanceRequestAt: { type: Date },
    /** Surveillance UI: paused HTML5 / logical hold per feed (each camera has its own feed doc). */
    streamPaused: { type: Boolean, default: false },
    streamPausedUpdatedAt: { type: Date },
  },
}, {
  timestamps: true,
  collection: 'feeds'
});

// Indexes for better performance
feedSchema.index({ status: 1 });
feedSchema.index({ sector: 1 });
feedSchema.index({ location: 1 });
feedSchema.index({ createdAt: -1 });

// Pre-save middleware to update timestamp
feedSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for formatted creation date
feedSchema.virtual('createdAtFormatted').get(function() {
  return (this.createdAt && typeof this.createdAt.toISOString === 'function') 
    ? this.createdAt.toISOString().replace('T', ' ').substring(0, 19)
    : 'N/A';
});

// Virtual for formatted last detection
feedSchema.virtual('lastDetectionFormatted').get(function() {
  if (!this.lastDetection || !this.lastDetection.timestamp || typeof this.lastDetection.timestamp.toISOString !== 'function') {
    return 'No detections';
  }
  return this.lastDetection.timestamp.toISOString().replace('T', ' ').substring(0, 19);
});

// Static methods
feedSchema.statics.findActive = function() {
  return this.find({ status: 'active' }).sort({ createdAt: 1 });
};

feedSchema.statics.findBySector = function(sector) {
  return this.find({ sector: sector }).sort({ createdAt: -1 });
};

feedSchema.statics.updateDetectionStats = function(feedId, detectionData) {
  return this.findByIdAndUpdate(
    feedId,
    {
      $inc: { totalDetections: 1 },
      $set: { 
        lastDetection: detectionData,
        updatedAt: new Date()
      }
    },
    { new: true }
  );
};

// Ensure virtuals are included in JSON output
feedSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    return ret;
  }
});

module.exports = mongoose.model('Feed', feedSchema);
