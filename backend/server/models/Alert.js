const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  // Feed Reference
  feedId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Feed',
    required: true
  },
  
  // Alert Type
  type: {
    type: String,
    required: true,
    enum: ['intrusion', 'anomaly', 'object', 'threat'],
    default: 'anomaly'
  },
  
  // Detection Confidence
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  
  // Alert Status
  status: {
    type: String,
    required: true,
    enum: ['active', 'resolved', 'investigating'],
    default: 'active'
  },
  
  // Severity Level
  severity: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  
  // Alert Details
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  
  // Detection Metadata
  detectionData: {
    threat: {
      type: Boolean,
      required: true
    },
    detectedObject: {
      type: String,
      trim: true
    },
    boundingBox: mongoose.Schema.Types.Mixed,
    distance_m: Number,
    modelsUsed: [String],
    snapshotPath: String,
    frameTimestamp: Date,
    processingTime: Number
  },
  
  // Location Info (inherited from feed)
  location: {
    type: String,
    required: true,
    trim: true
  },
  
  sector: {
    type: String,
    required: true,
    trim: true
  },
  
  // Resolution Information
  resolvedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolutionNotes: {
    type: String,
    trim: true,
    maxlength: 500
  },
  
  // Assigned Personnel
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Timestamps
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
  collection: 'alerts'
});

// Indexes for performance
alertSchema.index({ feedId: 1, createdAt: -1 });
alertSchema.index({ status: 1, createdAt: -1 });
alertSchema.index({ type: 1, createdAt: -1 });
alertSchema.index({ severity: 1, status: 1 });
alertSchema.index({ createdAt: -1 });
alertSchema.index({ location: 1 });
alertSchema.index({ sector: 1 });

// Pre-save middleware
alertSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Auto-set severity based on confidence and type
  if (this.confidence > 0.9) {
    this.severity = 'critical';
  } else if (this.confidence > 0.8) {
    this.severity = 'high';
  } else if (this.confidence > 0.7) {
    this.severity = 'medium';
  } else {
    this.severity = 'low';
  }
  
  next();
});

// Virtual for formatted creation date
alertSchema.virtual('createdAtFormatted').get(function() {
  return this.createdAt.toISOString().replace('T', ' ').substring(0, 19);
});

// Virtual for time elapsed
alertSchema.virtual('timeElapsed').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ago`;
  }
  return `${minutes}m ago`;
});

// Static methods
alertSchema.statics.findActive = function() {
  return this.find({ status: 'active' }).sort({ createdAt: -1 });
};

alertSchema.statics.findByFeed = function(feedId, limit = 50) {
  return this.find({ feedId: feedId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('feedId', 'title url location');
};

alertSchema.statics.findByType = function(type, status = null) {
  const query = { type: type };
  if (status) query.status = status;
  return this.find(query).sort({ createdAt: -1 });
};

alertSchema.statics.findRecent = function(hours = 24) {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.find({ createdAt: { $gte: cutoff } })
    .sort({ createdAt: -1 })
    .populate('feedId', 'title url location');
};

alertSchema.statics.getStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgConfidence: { $avg: '$confidence' }
      }
    }
  ]);
};

alertSchema.statics.getSeverityStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$severity',
        count: { $sum: 1 }
      }
    }
  ]);
};

// Instance method to resolve alert
alertSchema.methods.resolve = function(resolvedBy, notes = '') {
  this.status = 'resolved';
  this.resolvedAt = new Date();
  this.resolvedBy = resolvedBy;
  this.resolutionNotes = notes;
  return this.save();
};

// Instance method to assign to user
alertSchema.methods.assignTo = function(userId) {
  this.assignedTo = userId;
  return this.save();
};

// Ensure virtuals are included in JSON output
alertSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Alert', alertSchema);
