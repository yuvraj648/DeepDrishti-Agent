const mongoose = require('mongoose');

const enhancementSchema = new mongoose.Schema({
  // Image Information
  originalImage: {
    type: String,
    required: true,
    trim: true
  },
  enhancedImage: {
    type: String,
    required: true,
    trim: true
  },
  
  // Processing Information
  processingTime: {
    type: Number,
    required: true,
    min: 0
  },
  enhancementType: {
    type: String,
    required: true,
    enum: ['high_quality_v2.4', 'fast_inference', 'low_light_recovery', 'turbidity_filter', 'standard'],
    default: 'standard'
  },
  
  // File Information
  originalFilename: {
    type: String,
    required: true,
    trim: true
  },
  enhancedFilename: {
    type: String,
    required: true,
    trim: true
  },
  fileSize: {
    type: Number,
    required: true,
    min: 0
  },
  mimeType: {
    type: String,
    required: true,
    trim: true
  },
  
  // Optional Detection Link
  detectionId: {
    type: String,
    trim: true
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
  collection: 'enhancements'
});

// Indexes for better query performance
enhancementSchema.index({ createdAt: -1 });
enhancementSchema.index({ enhancementType: 1 });
enhancementSchema.index({ detectionId: 1 });
enhancementSchema.index({ originalFilename: 1 });

// Pre-save middleware to update timestamp
enhancementSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static methods
enhancementSchema.statics.findByType = function(enhancementType) {
  return this.find({ enhancementType: enhancementType }).sort({ createdAt: -1 });
};

enhancementSchema.statics.findByDetection = function(detectionId) {
  return this.find({ detectionId: detectionId }).sort({ createdAt: -1 });
};

enhancementSchema.statics.findRecent = function(limit = 10) {
  return this.find().sort({ createdAt: -1 }).limit(limit);
};

// Virtual for formatted processing time
enhancementSchema.virtual('processingTimeFormatted').get(function() {
  return `${this.processingTime.toFixed(2)}ms`;
});

// Virtual for formatted file size
enhancementSchema.virtual('fileSizeFormatted').get(function() {
  if (this.fileSize < 1024 * 1024) {
    return `${(this.fileSize / 1024).toFixed(2)}KB`;
  }
  return `${(this.fileSize / 1024 / 1024).toFixed(2)}MB`;
});

// Ensure virtuals are included in JSON output
enhancementSchema.set('toJSON', { virtuals: true });
enhancementSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Enhancement', enhancementSchema);
