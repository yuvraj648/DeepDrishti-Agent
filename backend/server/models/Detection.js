const mongoose = require('mongoose');

const detectionSchema = new mongoose.Schema({
  // Basic Information
  id: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  cameraSource: {
    type: String,
    required: false,
    trim: true
  },
  objectDetected: {
    type: String,
    required:false,
    trim: true
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  status: {
    type: String,
    required: true,
    enum: ['investigating', 'confirmed', 'false_positive'],
    default: 'investigating'
  },

  threatStatus: {
    type: String,
    enum: ['DANGER', 'NEUTRAL', 'SAFE', 'CLEAR'],
    default: 'NEUTRAL'
  },

  distance_m: Number,
  modelsUsed: [String],
  boundingBox: mongoose.Schema.Types.Mixed,

  feedId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Feed',
    required: false
  },
  sector: {
    type: String,
    required: false,
    trim: true
  },
  locationText: {
    type: String,
    required: false,
    trim: true
  },
  snapshotPath: {
    type: String,
    required: false
  },

  // Image Data
  snapshot: {
    type: String,
    required:false
  },
  enhancedImage: {
    type: String
  },

  // Additional Metadata
  location: {
    latitude: Number,
    longitude: Number,
    depth: Number
  },
  
  // AI Processing Information
  aiModel: {
    type: String,
    default: 'UNet-UW-Detector V1.0'
  },
  processingTime: {
    type: Number,
    default: 0
  },
  server: {
    type: String,
    default: 'NODE_01_PRIMARY'
  },

  // Human Review
  reviewedBy: {
    type: String
  },
  reviewNotes: {
    type: String
  },
  reviewedAt: {
    type: Date
  },

  // System Fields
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'detections'
});

// Indexes for better query performance (removed duplicate id index)
detectionSchema.index({ cameraSource: 1 });
detectionSchema.index({ objectDetected: 1 });
detectionSchema.index({ status: 1 });
detectionSchema.index({ threatStatus: 1 });
detectionSchema.index({ timestamp: -1 });
detectionSchema.index({ confidence: 1 });

// Pre-save middleware to update timestamp
detectionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static methods
detectionSchema.statics.findByCamera = function(cameraId) {
  return this.find({ cameraSource: cameraId });
};

detectionSchema.statics.findByStatus = function(status) {
  return this.find({ status: status });
};

detectionSchema.statics.findByDateRange = function(startDate, endDate) {
  return this.find({
    timestamp: {
      $gte: startDate,
      $lte: endDate
    }
  });
};

// Instance methods
detectionSchema.methods.confirm = function(reviewedBy, notes) {
  this.status = 'confirmed';
  this.reviewedBy = reviewedBy;
  this.reviewNotes = notes;
  this.reviewedAt = new Date();
  return this.save();
};

detectionSchema.methods.markFalsePositive = function(reviewedBy, notes) {
  this.status = 'false_positive';
  this.reviewedBy = reviewedBy;
  this.reviewNotes = notes;
  this.reviewedAt = new Date();
  return this.save();
};

// Virtual for formatted confidence
detectionSchema.virtual('confidenceFormatted').get(function() {
  return this.confidence.toFixed(1) + '%';
});

// Virtual for formatted timestamp
detectionSchema.virtual('timestampFormatted').get(function() {
  return this.timestamp.toISOString().replace('T', ' ').substring(0, 19);
});

// Ensure virtuals are included in JSON output
detectionSchema.set('toJSON', { virtuals: true });
detectionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Detection', detectionSchema);
