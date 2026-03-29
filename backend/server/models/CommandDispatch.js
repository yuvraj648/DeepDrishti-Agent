const mongoose = require('mongoose');

/**
 * Persistent audit of “Send to command” actions from Reports (and similar).
 * Linked to SystemLog so the same event appears in the system log UI and in a queryable dispatch collection.
 */
const commandDispatchSchema = new mongoose.Schema(
  {
    kind: { type: String, default: 'analytics_bundle' },
    timeframe: { type: String },
    recordCount: { type: Number },
    requestedByEmail: { type: String, trim: true },
    summaryMessage: { type: String, required: true, maxlength: 2000 },
    systemLogId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SystemLog',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['queued', 'delivered', 'failed'],
      default: 'queued',
    },
  },
  { timestamps: true, collection: 'command_dispatches' }
);

commandDispatchSchema.index({ createdAt: -1 });

module.exports = mongoose.model('CommandDispatch', commandDispatchSchema);
