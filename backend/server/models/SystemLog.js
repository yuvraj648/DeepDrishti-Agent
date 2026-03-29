const mongoose = require('mongoose');

const systemLogSchema = new mongoose.Schema(
  {
    timestamp: { type: Date, default: Date.now, index: true },
    severity: {
      type: String,
      required: true,
      enum: ['INFO', 'WARN', 'CRIT', 'DEBUG'],
      default: 'INFO',
      index: true,
    },
    module: { type: String, required: true, trim: true },
    message: { type: String, required: true, maxlength: 2000 },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: false }
);

systemLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('SystemLog', systemLogSchema);
