const mongoose = require('mongoose');

const accessRequestSchema = new mongoose.Schema({
  // Requester Information
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  
  // Request Details
  requestedRole: {
    type: String,
    required: true,
    enum: ['captain', 'vice_captain', 'surveillance_head', 'engineer', 'analyst'],
    trim: true
  },
  
  // Request Status
  status: {
    type: String,
    required: true,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  
  // Additional Information
  reason: {
    type: String,
    trim: true,
    maxlength: 500
  },
  
  // Review Information
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  reviewNotes: {
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
  }
}, {
  timestamps: true,
  collection: 'access_requests'
});

// Indexes for better performance
accessRequestSchema.index({ email: 1 });
accessRequestSchema.index({ status: 1 });
accessRequestSchema.index({ createdAt: -1 });

// Pre-save middleware to update timestamp
accessRequestSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static methods
accessRequestSchema.statics.findPending = function() {
  return this.find({ status: 'pending' }).sort({ createdAt: -1 });
};

accessRequestSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Virtual for formatted creation date
accessRequestSchema.virtual('createdAtFormatted').get(function() {
  return this.createdAt.toISOString().replace('T', ' ').substring(0, 19);
});

// Ensure virtuals are included in JSON output
accessRequestSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    return ret;
  }
});

module.exports = mongoose.model('AccessRequest', accessRequestSchema);
